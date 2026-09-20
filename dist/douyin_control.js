/*
METADATA
{
  "name": "douyin_control",
  "description": {
    "zh": "校准后的抖音普通视频页控制。开始前 configure_profile、start_control。仅用户明确要求时调用。点赞/收藏先 inspect_page 获取 expected_video_key；不要根据猜测补参数。unverified 不得重试点击或声称成功。停止不关闭宿主麦克风。",
    "en": "Calibrated Douyin controls. Configure and start first. Act only on explicit user requests. Inspect before like/favorite; never invent video tokens. Never retry an unverified touch or claim success. Stop does not close the host microphone."
  },
  "category": "Automation",
  "tools": [
    {
      "name": "inspect_page",
      "description": {
        "zh": "只读检查前台页面并获取当前 video_key。include_nodes 默认 false；用户明确同意校准采样时才设 true，屏幕文字将作为工具结果传给模型。",
        "en": "Read current page and video token. Node export requires explicit calibration consent and may transmit screen text to the model."
      },
      "parameters": [
        {
          "name": "include_nodes",
          "type": "boolean",
          "required": false,
          "description": "显式导出屏幕节点用于校准，默认 false / Export screen nodes, default false"
        }
      ]
    },
    {
      "name": "configure_profile",
      "description": {
        "zh": "安装用户核对过的本机页面校准 JSON。不得编造选择器、包名或屏幕尺寸。配置会停止当前会话。",
        "en": "Install a user-verified device profile. Never invent selectors, package names or viewport dimensions. Stops the session."
      },
      "parameters": [
        {
          "name": "profile_json",
          "type": "string",
          "required": true,
          "description": "符合 profiles/example.json 结构的真实设备配置 JSON 字符串 / Device profile JSON string"
        }
      ]
    },
    {
      "name": "start_control",
      "description": {
        "zh": "用户明确要求开始时开启最长 30 分钟控制会话，不启动录音。请先完成页面校准。",
        "en": "Start a 30-minute control session on explicit request after calibration. Does not start microphone recording."
      },
      "parameters": [
        {
          "name": "wake_word",
          "type": "string",
          "required": false,
          "description": "严格文本入口唤醒词，默认小刷；空串仅供用户指定的无唤醒词测试 / Wake word, default 小刷"
        }
      ]
    },
    {
      "name": "stop_control",
      "description": {
        "zh": "立即禁用本插件会话，不等待动作锁；已提交触摸不能撤销。宿主语音监听需另行关闭。",
        "en": "Disable session immediately without waiting for action lock. Submitted touches cannot be recalled; stop host voice separately."
      },
      "parameters": []
    },
    {
      "name": "next_video",
      "description": {
        "zh": "普通视频页单次上滑。用户每个独立请求使用独立 command_id，重试同一请求复用 ID。结果无法确认时不得自动重试。",
        "en": "Swipe up once. Use a unique ID per user request and reuse it for retries. Never retry an unverified action."
      },
      "parameters": [
        {
          "name": "command_id",
          "type": "string",
          "required": true,
          "description": "本会话请求唯一 ID，字母数字短横线等 / Unique request ID"
        },
        {
          "name": "expected_video_key",
          "type": "string",
          "required": false,
          "description": "inspect_page 返回的视频比较 token / Observed video token"
        },
        {
          "name": "session_id",
          "type": "string",
          "required": true,
          "description": "start_control 返回的会话 ID / Session ID"
        }
      ]
    },
    {
      "name": "previous_video",
      "description": {
        "zh": "普通视频页单次下滑，不能保证抖音仍保留上一视频。无法确认时不得自动重试。",
        "en": "Swipe down once. Previous video availability depends on Douyin. Never retry an unverified action."
      },
      "parameters": [
        {
          "name": "command_id",
          "type": "string",
          "required": true,
          "description": "本会话请求唯一 ID / Unique request ID"
        },
        {
          "name": "expected_video_key",
          "type": "string",
          "required": false,
          "description": "inspect_page 返回的视频 token / Observed video token"
        },
        {
          "name": "session_id",
          "type": "string",
          "required": true,
          "description": "会话 ID / Session ID"
        }
      ]
    },
    {
      "name": "ensure_liked",
      "description": {
        "zh": "确保当前视频已点赞，不取消已有点赞。必须先 inspect_page 获取 video_key；状态不明时拒绝，不盲点。",
        "en": "Ensure liked without toggling off. Inspect first for video_key. Unknown state is rejected."
      },
      "parameters": [
        {
          "name": "command_id",
          "type": "string",
          "required": true,
          "description": "本会话请求唯一 ID / Unique request ID"
        },
        {
          "name": "expected_video_key",
          "type": "string",
          "required": true,
          "description": "inspect_page.analysis.video_key，禁止编造 / Observed token, never invent"
        },
        {
          "name": "session_id",
          "type": "string",
          "required": true,
          "description": "会话 ID / Session ID"
        }
      ]
    },
    {
      "name": "ensure_favorited",
      "description": {
        "zh": "确保当前视频已收藏，不取消已有收藏。必须先 inspect_page 获取 video_key；出现未知收藏面板则无法确认，不自动处理。",
        "en": "Ensure favorited without toggling off. Inspect first. Unknown collection dialogs are not operated."
      },
      "parameters": [
        {
          "name": "command_id",
          "type": "string",
          "required": true,
          "description": "本会话请求唯一 ID / Unique request ID"
        },
        {
          "name": "expected_video_key",
          "type": "string",
          "required": true,
          "description": "inspect_page.analysis.video_key，禁止编造 / Observed token, never invent"
        },
        {
          "name": "session_id",
          "type": "string",
          "required": true,
          "description": "会话 ID / Session ID"
        }
      ]
    },
    {
      "name": "ingest_transcript",
      "description": {
        "zh": "供 ASR/工作流适配器直接提交完整转写，严格匹配，不需要 LLM。普通聊天请调用具体动作。时间必须是 Android elapsedRealtime 同基准，不可用 Unix 时间。",
        "en": "Direct strict ASR/workflow entry; no LLM needed. Use Android elapsedRealtime milliseconds, never Unix timestamps. Chat should use action tools."
      },
      "parameters": [
        {
          "name": "session_id",
          "type": "string",
          "required": true,
          "description": "start_control 返回的会话 ID / Session ID"
        },
        {
          "name": "utterance_id",
          "type": "string",
          "required": true,
          "description": "独立语句 ID，重复回调复用 / Stable utterance ID"
        },
        {
          "name": "text",
          "type": "string",
          "required": true,
          "description": "完整识别文本 / Complete transcript"
        },
        {
          "name": "final",
          "type": "boolean",
          "required": true,
          "description": "是否为最终结果 / Final result flag"
        },
        {
          "name": "issued_at_ms",
          "type": "number",
          "required": true,
          "description": "捕获最终结果时的 Android 单调时钟毫秒 / elapsedRealtime at final result"
        },
        {
          "name": "expected_video_key",
          "type": "string",
          "required": false,
          "description": "捕获命令时的视频 token / Video token at command capture"
        }
      ]
    }
  ]
}
*/
(function () {
const modules = {
"./router.cjs": function(module, exports, require) {
'use strict';
const COMMANDS = new Map([
  ['下一条', 'next_video'], ['下一个', 'next_video'], ['换一个', 'next_video'],
  ['上一条', 'previous_video'], ['上一个', 'previous_video'], ['返回上一个', 'previous_video'],
  ['点赞', 'ensure_liked'], ['点个赞', 'ensure_liked'],
  ['收藏', 'ensure_favorited'], ['收藏一下', 'ensure_favorited'],
  ['停止控制', 'stop_control'], ['退出语音控制', 'stop_control']
]);
function parseCommand(text, wakeWord = '小刷') {
  if (typeof text !== 'string' || text.length > 100) return null;
  let phrase = text.trim().replace(/[。！？.!?]+$/u, '').trim();
  if (COMMANDS.get(phrase) === 'stop_control') return 'stop_control';
  if (wakeWord) {
    if (!phrase.startsWith(wakeWord)) return null;
    phrase = phrase.slice(wakeWord.length).replace(/^[，,\s]+/u, '');
  }
  return COMMANDS.get(phrase) ?? null;
}
module.exports = { parseCommand };

},
"./page.cjs": function(module, exports, require) {
'use strict';
const FIELDS = ['resourceId', 'text', 'contentDesc', 'className'];
function selectorValid(s) {
  return s && typeof s === 'object' && !Array.isArray(s) && Object.keys(s).length > 0 &&
    Object.keys(s).every(k => FIELDS.includes(k) && typeof s[k] === 'string' && s[k].length > 0 && s[k].length <= 300) &&
    Object.keys(s).some(k => k !== 'className');
}
function validateProfile(p) {
  const bad = () => { throw new Error('INVALID_PROFILE'); };
  if (!p || typeof p !== 'object' || typeof p.packageName !== 'string' || !/^[\w]+(\.[\w]+)+$/.test(p.packageName) ||
      typeof p.activityName !== 'string' || !p.activityName || p.activityName.length > 250) bad();
  for (const [key, min] of [['markers', 2], ['blockers', 1], ['identity', 2]]) {
    if (!Array.isArray(p[key]) || p[key].length < min || p[key].length > 30 || !p[key].every(selectorValid)) bad();
    const canonical = p[key].map(s => JSON.stringify(FIELDS.map(f => s[f] ?? null)));
    if (new Set(canonical).size !== canonical.length) bad();
  }
  for (const key of ['like', 'favorite']) {
    if (!p[key] || !selectorValid(p[key].on) || !selectorValid(p[key].off)) bad();
    // Both selectors must disagree on at least one shared field, not merely be different objects.
    if (!FIELDS.some(f => p[key].on[f] && p[key].off[f] && p[key].on[f] !== p[key].off[f])) bad();
  }
  const v = p.viewport, g = p.gesture;
  if (!v || !Number.isInteger(v.width) || !Number.isInteger(v.height) || v.width < 200 || v.height <= v.width || v.height > 10000) bad();
  if (!g || ![g.x, g.top, g.bottom, g.durationMs].every(Number.isFinite) ||
      g.x < 0.2 || g.x > 0.6 || g.top < 0.15 || g.bottom > 0.85 || g.bottom - g.top < 0.25 ||
      g.durationMs < 100 || g.durationMs > 1000) bad();
  return JSON.parse(JSON.stringify(p));
}
function flatten(root) {
  if (!root || typeof root !== 'object') return [];
  const result = [], pending = [root];
  while (pending.length && result.length < 5000) {
    const node = pending.pop();
    if (!node || typeof node !== 'object' || !Array.isArray(node.children)) throw new Error('INVALID_PAGE');
    result.push(node); pending.push(...node.children);
  }
  if (pending.length) throw new Error('PAGE_TOO_LARGE');
  return result;
}
const matches = (n, s) => Object.keys(s).every(k => n[k] === s[k]);
function boundsOf(value) {
  if (typeof value !== 'string') return null;
  const m = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(value);
  if (!m) return null;
  const [x1, y1, x2, y2] = m.slice(1).map(Number);
  return x2 > x1 && y2 > y1 ? { x1, y1, x2, y2 } : null;
}
// An opaque comparison token, not an authentication token or a globally unique video ID.
function fingerprint(text) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
function analyzePage(page, profile) {
  const reject = code => ({ ok: false, code });
  if (!page || page.packageName !== profile.packageName) return reject('NOT_IN_DOUYIN');
  if (page.activityName !== profile.activityName) return reject('UNSUPPORTED_PAGE');
  let nodes;
  try { nodes = flatten(page.uiElements); } catch { return reject('UNSUPPORTED_PAGE'); }
  const root = boundsOf(page.uiElements?.bounds);
  if (!root || root.x2 > profile.viewport.width || root.y2 > profile.viewport.height ||
      root.x2 - root.x1 < profile.viewport.width * 0.9 || root.y2 - root.y1 < profile.viewport.height * 0.7) return reject('VIEWPORT_CHANGED');
  const gx = Math.round(profile.viewport.width * profile.gesture.x);
  const gy1 = Math.round(profile.viewport.height * profile.gesture.top), gy2 = Math.round(profile.viewport.height * profile.gesture.bottom);
  if (gx <= root.x1 || gx >= root.x2 || gy1 <= root.y1 || gy2 >= root.y2) return reject('VIEWPORT_CHANGED');
  if (profile.blockers.some(s => nodes.some(n => matches(n, s))) ||
      profile.markers.some(s => nodes.filter(n => matches(n, s)).length !== 1)) return reject('UNSUPPORTED_PAGE');
  const identity = [], identityNodes = new Set();
  for (const s of profile.identity) {
    const found = nodes.filter(n => matches(n, s));
    if (found.length !== 1 || !(found[0].text || found[0].contentDesc)) return reject('STATE_UNKNOWN');
    if (identityNodes.has(found[0])) return reject('STATE_UNKNOWN');
    identityNodes.add(found[0]);
    identity.push([found[0].text ?? '', found[0].contentDesc ?? '']);
  }
  const states = {};
  for (const key of ['like', 'favorite']) {
    const on = nodes.filter(n => matches(n, profile[key].on));
    const off = nodes.filter(n => matches(n, profile[key].off));
    let state = 'unknown', bounds = null;
    if (on.length === 1 && off.length === 0) state = 'on';
    if (off.length === 1 && on.length === 0) {
      const n = off[0], rect = boundsOf(n.bounds);
      if (n.isClickable === true && rect && rect.x1 >= root.x1 && rect.y1 >= root.y1 && rect.x2 <= root.x2 && rect.y2 <= root.y2) { state = 'off'; bounds = n.bounds; }
    }
    states[key] = { state, bounds };
  }
  return { ok: true, video_key: fingerprint(JSON.stringify(identity)), ...states };
}
module.exports = { analyzePage, validateProfile, flatten, boundsOf };

},
"./controller.cjs": function(module, exports, require) {
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

},
"./operit.cjs": function(module, exports, require) {
'use strict';
// Public Java bridge only. No private Operit class names or shell/root dependency.
function createOperitHost({ Java, Tools }) {
  if (!Java || !Tools?.UI) throw new Error('HOST_UNSUPPORTED');
  const context = Java.getApplicationContext();
  const prefs = context.getSharedPreferences('byteplus_douyin_control_v1', 0);
  const clock = Java.type('android.os.SystemClock');
  const process = Java.type('android.os.Process');
  const uuid = Java.type('java.util.UUID');
  const power = context.getSystemService('power');
  const keyguard = context.getSystemService('keyguard');
  const lockPath = context.getFilesDir().getAbsolutePath() + '/douyin-control.lock';
  return {
    now: () => Number(clock.elapsedRealtime()),
    processId: () => process.myPid() + ':' + process.getStartElapsedRealtime(),
    id: () => uuid.randomUUID().toString(),
    get: key => prefs.getString(key, null),
    set(key, value) { if (prefs.edit().putString(key, value).commit() !== true) throw new Error('STORAGE_FAILED'); },
    isInteractive: () => power.isInteractive() === true && keyguard.isKeyguardLocked() === false,
    acquire() {
      const file = Java.type('java.io.RandomAccessFile').newInstance(lockPath, 'rw');
      const channel = file.getChannel();
      let lock;
      try { lock = channel.tryLock(); }
      catch (error) {
        channel.close(); file.close();
        if (String(error).includes('OverlappingFileLockException')) return null;
        throw error;
      }
      if (lock === null) { channel.close(); file.close(); return null; }
      // No timeout-based lock stealing: a timed-out UI promise may still submit a touch.
      return () => { try { lock.release(); } finally { try { channel.close(); } finally { file.close(); } } };
    },
    readPage: () => Tools.UI.getPageInfo(),
    click: bounds => Tools.UI.clickElement({ bounds }),
    swipe: (...args) => Tools.UI.swipe(...args),
    sleep: ms => Tools.System.sleep(ms)
  };
}
module.exports = { createOperitHost };

},
"./entry.cjs": function(module, exports, require) {
'use strict';
const { createController } = require('./controller.cjs');
function normalize(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('INVALID_ARGUMENT');
  const p = { ...params };
  for (const key of ['issued_at_ms', 'expires_at_ms']) {
    if (typeof p[key] === 'string' && /^\d+(\.\d+)?$/.test(p[key])) p[key] = Number(p[key]);
  }
  for (const key of ['include_nodes', 'final']) {
    if (p[key] === 'true') p[key] = true;
    if (p[key] === 'false') p[key] = false;
    if (p[key] !== undefined && typeof p[key] !== 'boolean') throw new Error('INVALID_ARGUMENT');
  }
  return p;
}
function createExports(hostFactory) {
  function wrap(fn) {
    return async (params = {}) => {
      try { return await fn(createController(hostFactory()), normalize(params)); }
      catch (error) {
        const known = ['INVALID_PROFILE', 'INVALID_ARGUMENT', 'HOST_UNSUPPORTED', 'STORAGE_FAILED'];
        return { status: 'failed', verified: false, code: known.includes(error.message) ? error.message : 'HOST_ERROR' };
      }
    };
  }
  const api = {
    configure_profile: wrap((c, p) => {
      if (typeof p.profile_json !== 'string' || p.profile_json.length > 30000) throw new Error('INVALID_PROFILE');
      let profile; try { profile = JSON.parse(p.profile_json); } catch { throw new Error('INVALID_PROFILE'); }
      return c.configure(profile);
    }),
    inspect_page: wrap((c, p) => c.inspect(p.include_nodes === true)),
    start_control: wrap((c, p) => c.start({ wakeWord: p.wake_word })),
    stop_control: wrap(c => c.stop()),
    ingest_transcript: wrap((c, p) => c.ingest(p))
  };
  for (const action of ['next_video', 'previous_video', 'ensure_liked', 'ensure_favorited']) {
    api[action] = wrap((c, p) => {
      if (action.startsWith('ensure_') && !p.expected_video_key) return { status: 'rejected', verified: false, code: 'EXPECTED_VIDEO_REQUIRED' };
      return c.execute(action, p);
    });
  }
  return api;
}
module.exports = { createExports };

}
};
const cache = {};
function load(id) { if (!cache[id]) { const m = { exports: {} }; cache[id] = m; modules[id](m, m.exports, load); } return cache[id].exports; }
const api = load("./entry.cjs").createExports(() => load("./operit.cjs").createOperitHost({ Java, Tools }));
for (const name of Object.keys(api)) exports[name] = async function(params) { const result = await api[name](params); complete(result); };
})();
