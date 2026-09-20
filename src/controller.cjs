'use strict';
const { parseCommand } = require('./router.cjs');
const { analyzePage, validateProfile, flatten } = require('./page.cjs');
const ACTIONS = new Set(['next_video', 'previous_video', 'ensure_liked', 'ensure_favorited']);
const validId = x => typeof x === 'string' && /^[\w:.-]{1,128}$/.test(x);
const reject = (code) => ({ status: 'rejected', code, verified: false });
function createController(host) {
  const read = key => { const value = host.get(key); return value === null ? null : JSON.parse(value); };
  const write = (key, value) => host.set(key, JSON.stringify(value));
  function stop() { write('session', null); return { status: 'success', verified: true, message: '控制会话已停止；录音由 Operit 宿主管理，请同时关闭宿主监听。' }; }
  function configure(profile) {
    const validated = validateProfile(profile);
    const release = host.acquire();
    if (!release) return reject('BUSY');
    try { stop(); write('profile', validated); return { status: 'success', verified: true }; }
    finally { release(); }
  }
  function start(options = {}) {
    if (!read('profile')) return reject('PROFILE_REQUIRED');
    if (!host.isInteractive()) return reject('DEVICE_LOCKED');
    const wakeWord = options.wakeWord ?? '小刷';
    if (typeof wakeWord !== 'string' || wakeWord.length > 16 || /[\s，,。！？]/u.test(wakeWord)) return reject('INVALID_ARGUMENT');
    const release = host.acquire(); if (!release) return reject('BUSY');
    try {
      const now = host.now();
      const session = { session_id: host.id(), process_id: host.processId(), wakeWord, expires_at_ms: now + 1800000 };
      write('seen', []); write('session', session);
      return { status: 'success', verified: true, session_id: session.session_id, now_ms: now, expires_at_ms: session.expires_at_ms };
    } finally { release(); }
  }
  function guard(session, issued, expires) {
    const current = read('session');
    if (!current || current.session_id !== session.session_id || current.process_id !== host.processId()) return 'SESSION_STOPPED';
    const now = host.now();
    if (now >= current.expires_at_ms) { stop(); return 'SESSION_STOPPED'; }
    if (!host.isInteractive()) { stop(); return 'DEVICE_LOCKED'; }
    if (issued > now || now >= expires) return 'EXPIRED';
    return null;
  }
  async function execute(action, params = {}) {
    const begun = host.now();
    let submitted = false, commandId = params.command_id;
    const finish = result => ({ command_id: commandId, action, ...result, duration_ms: Math.max(0, host.now() - begun) });
    if (!ACTIONS.has(action) || !validId(commandId)) return finish(reject('INVALID_ARGUMENT'));
    if (!validId(params.session_id)) return finish(reject('SESSION_REQUIRED'));
    const session = read('session');
    if (!session) return finish(reject('SESSION_STOPPED'));
    if (params.session_id !== session.session_id) return finish(reject('SESSION_STOPPED'));
    const issued = params.issued_at_ms ?? begun, expires = params.expires_at_ms ?? issued + 1500;
    if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued < 0 || expires <= issued || expires - issued > 1500) return finish(reject('INVALID_ARGUMENT'));
    if (params.expected_video_key !== undefined && (typeof params.expected_video_key !== 'string' || params.expected_video_key.length > 128)) return finish(reject('INVALID_ARGUMENT'));
    let code = guard(session, issued, expires); if (code) return finish(reject(code));
    const release = host.acquire(); if (!release) return finish(reject('BUSY'));
    try {
      code = guard(session, issued, expires); if (code) return finish(reject(code));
      const profile = read('profile'); if (!profile) return finish(reject('PROFILE_REQUIRED'));
      const seen = read('seen') ?? [];
      if (seen.includes(commandId)) return finish(reject('DUPLICATE'));
      // Never evict IDs within a live session: replay of an old ASR event must stay inert.
      if (seen.length >= 2000) { stop(); return finish(reject('SESSION_CAPACITY')); }
      write('seen', [...seen, commandId]);
      const initial = analyzePage(await host.readPage(), profile);
      code = guard(session, issued, expires); if (code) return finish(reject(code));
      if (!initial.ok) return finish(reject(initial.code));
      if (params.expected_video_key && params.expected_video_key !== initial.video_key) return finish(reject('VIDEO_CHANGED'));
      const latest = analyzePage(await host.readPage(), profile);
      code = guard(session, issued, expires); if (code) return finish(reject(code));
      if (!latest.ok) return finish(reject(latest.code));
      if (latest.video_key !== initial.video_key) return finish(reject('VIDEO_CHANGED'));
      const target = action === 'ensure_liked' ? 'like' : action === 'ensure_favorited' ? 'favorite' : null;
      if (target) {
        if (latest[target].state === 'on') return finish({ status: 'already_done', verified: true });
        if (latest[target].state !== 'off') return finish(reject('STATE_UNKNOWN'));
        submitted = true;
        await host.click(latest[target].bounds);
      } else {
        const { width, height } = profile.viewport, g = profile.gesture;
        const x = Math.round(width * g.x), top = Math.round(height * g.top), bottom = Math.round(height * g.bottom);
        submitted = true;
        await host.swipe(x, action === 'next_video' ? bottom : top, x, action === 'next_video' ? top : bottom, g.durationMs);
      }
      // Expiry gates submission, not verification. Never submit a second touch as a retry.
      for (const delay of [150, 250, 350]) {
        code = guard(session, begun, Infinity);
        if (code) return finish({ status: 'unverified', code, verified: false });
        await host.sleep(delay);
        code = guard(session, begun, Infinity);
        if (code) return finish({ status: 'unverified', code, verified: false });
        const after = analyzePage(await host.readPage(), profile);
        code = guard(session, begun, Infinity);
        if (code) return finish({ status: 'unverified', code, verified: false });
        if (!after.ok) return finish({ status: 'unverified', code: after.code, verified: false });
        if (target && after.video_key !== latest.video_key) return finish({ status: 'unverified', code: 'VIDEO_CHANGED', verified: false });
        if ((target && after[target].state === 'on') || (!target && after.video_key !== latest.video_key)) return finish({ status: 'success', verified: true });
      }
      return finish({ status: 'unverified', code: 'STATE_UNKNOWN', verified: false });
    } catch {
      // Tool failures may contain screen content: do not echo their raw messages to the model/log.
      return finish({ status: submitted ? 'unverified' : 'failed', code: 'HOST_ERROR', verified: false });
    } finally { release(); }
  }
  async function ingest(event) {
    if (!event || event.final !== true) return { status: 'ignored', verified: false };
    const session = read('session');
    if (!session || event.session_id !== session.session_id) return reject('SESSION_STOPPED');
    if (!validId(event.utterance_id) || !Number.isFinite(event.issued_at_ms)) return reject('INVALID_ARGUMENT');
    const action = parseCommand(event.text, session.wakeWord);
    if (!action) return { status: 'ignored', verified: false };
    // A stale stop is safe; stop bypasses the action lock and expiry.
    if (action === 'stop_control') return stop();
    return execute(action, { command_id: event.utterance_id, session_id: event.session_id, issued_at_ms: event.issued_at_ms, expected_video_key: event.expected_video_key });
  }
  async function inspect(includeNodes = false) {
    const page = await host.readPage(), profile = read('profile');
    const analysis = profile ? analyzePage(page, profile) : { ok: false, code: 'PROFILE_REQUIRED' };
    return { status: 'success', verified: false, package_name: page.packageName, activity_name: page.activityName,
      now_ms: host.now(), session_id: read('session')?.session_id ?? null,
      analysis, ...(includeNodes ? { nodes: flatten(page.uiElements).map(n => ({ resourceId: n.resourceId, text: n.text, contentDesc: n.contentDesc, bounds: n.bounds, className: n.className, isClickable: n.isClickable })) } : {}) };
  }
  return { configure, start, stop, execute, ingest, inspect };
}
module.exports = { createController };
