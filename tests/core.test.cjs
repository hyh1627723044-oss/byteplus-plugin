const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCommand } = require('../src/router.cjs');
const { analyzePage, validateProfile } = require('../src/page.cjs');
const { createController } = require('../src/controller.cjs');
const { profile, page, host } = require('./helpers.cjs');

test('strict complete commands, wake phrase, negatives and composites', () => {
  const cases = [['小刷，下一条。', 'next_video'], ['小刷 上一个', 'previous_video'], ['小刷点赞', 'ensure_liked'], ['小刷收藏一下', 'ensure_favorited'], ['停止控制', 'stop_control'], ['下一条', null], ['小刷不要点赞', null], ['小刷取消收藏', null], ['视频说小刷点赞', null], ['小刷点赞然后下一条', null], ['小刷点个赞吧', null]];
  for (const [input, expected] of cases) assert.equal(parseCommand(input, '小刷'), expected, input);
  assert.equal(parseCommand('下一条', ''), 'next_video');
});

test('profile rejects broad, ambiguous and unsafe calibration', () => {
  assert.deepEqual(validateProfile(profile), profile);
  for (const change of [{ markers: [{}] }, { identity: [{ text: '作者' }] }, { like: { on: { text: '赞' }, off: { text: '赞' } } }, { gesture: { x: 1, top: 0.7, bottom: 0.3, durationMs: 300 } }]) {
    assert.throws(() => validateProfile({ ...profile, ...change }));
  }
});

test('page validation requires foreground, markers, viewport, unique identity and no blockers', () => {
  assert.equal(analyzePage(page(), profile).ok, true);
  for (const p of [page({ blocked: true }), { ...page(), packageName: 'other' }, { ...page(), activityName: 'other' }]) assert.equal(analyzePage(p, profile).ok, false);
  const p = page(); p.uiElements.children.push(p.uiElements.children[2]);
  assert.equal(analyzePage(p, profile).ok, false);
  assert.equal(analyzePage({}, profile).ok, false);
});

function setup() {
  const h = host(); const c = createController(h);
  c.configure(profile); const session = c.start({ wakeWord: '小刷' });
  return { h, c, session };
}
const req = (id = 'cmd-1') => ({ command_id: id, session_id: 'session-test' });

test('confirmed like clicks once and repeated independent commands never unlike', async () => {
  const { h, c } = setup();
  assert.equal((await c.execute('ensure_liked', req())).status, 'success');
  assert.equal((await c.execute('ensure_liked', req('cmd-2'))).status, 'already_done');
  assert.equal(h.calls.length, 1);
});
test('favorite is idempotent and unknown state never clicks', async () => {
  const { h, c } = setup();
  assert.equal((await c.execute('ensure_favorited', req())).status, 'success');
  assert.equal((await c.execute('ensure_favorited', req('2'))).status, 'already_done');
  h.current.uiElements.children[5].contentDesc = '收藏';
  assert.equal((await c.execute('ensure_favorited', req('3'))).code, 'STATE_UNKNOWN');
  assert.equal(h.calls.length, 1);
});
test('partial ASR ignored, duplicate final deduped, next independent utterance executes', async () => {
  const { c, h, session } = setup();
  const event = { session_id: session.session_id, utterance_id: 'u1', text: '小刷下一条', final: false, issued_at_ms: h.t };
  assert.equal((await c.ingest(event)).status, 'ignored');
  assert.equal((await c.ingest({ ...event, final: true })).status, 'success');
  assert.equal((await c.ingest({ ...event, final: true })).code, 'DUPLICATE');
  h.current = page({ video: 'three' });
  await c.ingest({ ...event, final: true, utterance_id: 'u2', issued_at_ms: h.t });
  assert.equal(h.calls.length, 2);
});
test('two controllers share dedup and session storage', async () => {
  const { c, h } = setup();
  await c.execute('next_video', req());
  const other = createController(h);
  assert.equal((await other.execute('next_video', req())).code, 'DUPLICATE');
  other.stop();
  assert.equal((await c.execute('next_video', req('new'))).code, 'SESSION_STOPPED');
});
test('stale, future and mismatched sessions rejected', async () => {
  const { c, h } = setup();
  for (const request of [{ issued_at_ms: -1000 }, { issued_at_ms: 50000 }, { session_id: 'old' }]) {
    assert.equal((await c.execute('next_video', { ...req(), ...request })).status, 'rejected');
  }
  assert.equal(h.calls.length, 0);
});
test('video changes before execution invalidate like', async () => {
  const { c, h } = setup(); let reads = 0;
  h.readPage = async () => page({ video: ++reads === 1 ? 'one' : 'two' });
  assert.equal((await c.execute('ensure_liked', req())).code, 'VIDEO_CHANGED');
  assert.equal(h.calls.length, 0);
});
test('expected video token prevents delayed LLM call on another video', async () => {
  const { c, h } = setup();
  assert.equal((await c.execute('ensure_liked', { ...req(), expected_video_key: 'old' })).code, 'VIDEO_CHANGED');
  assert.equal(h.calls.length, 0);
});
test('stop during page read cancels before submission; new concurrent action is busy', async () => {
  const { c, h } = setup(); let unblock;
  h.readPage = () => new Promise(resolve => { unblock = () => resolve(page()); });
  const running = c.execute('next_video', req());
  assert.equal((await c.execute('next_video', req('2'))).code, 'BUSY');
  c.stop(); unblock();
  assert.equal((await running).code, 'SESSION_STOPPED');
  assert.equal(h.calls.length, 0);
});
test('expiration during page acquisition prevents side effect', async () => {
  const { c, h } = setup(); h.readPage = async () => { h.t += 2000; return page(); };
  assert.equal((await c.execute('next_video', req())).code, 'EXPIRED');
  assert.equal(h.calls.length, 0);
});
test('submitted swipe with unchanged page returns unverified without retry', async () => {
  const { c, h } = setup(); h.swipe = async (...args) => { h.calls.push(args); };
  assert.equal((await c.execute('next_video', req())).status, 'unverified');
  assert.equal(h.calls.length, 1);
});
test('unknown target after click returns unverified and does not retry', async () => {
  const { c, h } = setup(); h.click = async () => { h.calls.push('click'); h.current = page({ blocked: true }); };
  assert.equal((await c.execute('ensure_liked', req())).status, 'unverified');
  assert.equal(h.calls.length, 1);
});
test('lock detection stops session, unlocking does not resume', async () => {
  const { c, h } = setup(); h.interactive = false;
  assert.equal((await c.execute('next_video', req())).code, 'DEVICE_LOCKED');
  h.interactive = true;
  assert.equal((await c.execute('next_video', req('2'))).code, 'SESSION_STOPPED');
});
test('no configuration means no start; invalid action has no effects', async () => {
  const h = host(); const c = createController(h);
  assert.equal(c.start({}).code, 'PROFILE_REQUIRED');
  assert.equal((await c.execute('delete', req())).code, 'INVALID_ARGUMENT');
});

test('two identity fields cannot resolve to the same node', () => {
  assert.throws(() => validateProfile({ ...profile, identity: [profile.identity[0], profile.identity[0]] }));
  const p = page();
  p.uiElements.children[2].contentDesc = 'author marker';
  const config = { ...profile, identity: [{ resourceId: 'test:id/author' }, { contentDesc: 'author marker' }] };
  assert.equal(analyzePage(p, config).ok, false);
});
test('gesture endpoints must lie inside current root bounds', () => {
  const p = page(); p.uiElements.bounds = '[0,500][1080,2400]';
  const config = { ...profile, gesture: { ...profile.gesture, top: 0.15 } };
  assert.equal(analyzePage(p, config).code, 'VIEWPORT_CHANGED');
});
test('process restart invalidates stored session', async () => {
  const { c, h } = setup(); h.processId = () => 'new-process';
  assert.equal((await c.execute('next_video', req())).code, 'SESSION_STOPPED');
  assert.equal(h.calls.length, 0);
});
test('gesture directions are opposite and use calibrated safe region', async () => {
  const { c, h } = setup();
  await c.execute('next_video', req('n'));
  await c.execute('previous_video', req('p'));
  assert.deepEqual(h.calls, [['swipe', 486, 1680, 486, 720, 300], ['swipe', 486, 720, 486, 1680, 300]]);
});
test('host exceptions after submission stay unverified and do not repeat the touch', async () => {
  const { c, h } = setup(); h.click = async () => { h.calls.push('click'); throw new Error('private screen text'); };
  const result = await c.execute('ensure_liked', req());
  assert.equal(result.status, 'unverified'); assert.equal(result.code, 'HOST_ERROR');
  assert.equal(JSON.stringify(result).includes('private'), false); assert.equal(h.calls.length, 1);
});
test('delayed calls without the issuing session cannot act in a newly started session', async () => {
  const { c, h } = setup(); c.stop(); h.id = () => 'new-session'; c.start({});
  assert.equal((await c.execute('next_video', { command_id: 'late' })).code, 'SESSION_REQUIRED');
  assert.equal((await c.execute('next_video', req('old'))).code, 'SESSION_STOPPED');
  assert.equal(h.calls.length, 0);
});
