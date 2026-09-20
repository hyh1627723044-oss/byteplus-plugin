const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOperitHost } = require('../src/operit.cjs');
const { createExports } = require('../src/entry.cjs');
const { host, profile } = require('./helpers.cjs');
test('entry normalizes string tool parameters and rejects malformed input', async () => {
  const h = host(); const api = createExports(() => h);
  assert.equal((await api.configure_profile({ profile_json: JSON.stringify(profile) })).status, 'success');
  const s = await api.start_control({});
  assert.equal((await api.ingest_transcript({ session_id: s.session_id, utterance_id: 'u1', text: '小刷下一条', final: 'true', issued_at_ms: '1000' })).status, 'success');
  assert.equal((await api.ingest_transcript({ final: 'false' })).status, 'ignored');
  assert.equal((await api.inspect_page({ include_nodes: 'false' })).nodes, undefined);
  assert.ok((await api.inspect_page({ include_nodes: 'true' })).nodes.length > 0);
  assert.equal((await api.configure_profile({ profile_json: '{}' })).code, 'INVALID_PROFILE');
  assert.equal((await api.ensure_liked({ command_id: 'x' })).code, 'EXPECTED_VIDEO_REQUIRED');
});
test('Android host maps UI methods and releases OS lock without requiring a success field', async () => {
  const calls = [], saved = new Map();
  const editor = { putString(k, v) { saved.set(k, v); return editor; }, commit() { return true; } };
  const prefs = { getString(k, fallback) { return saved.get(k) ?? fallback; }, edit() { return editor; } };
  const lock = { release() { calls.push('release'); } };
  const channel = { tryLock() { return lock; }, close() { calls.push('channel-close'); } };
  const file = { getChannel() { return channel; }, close() { calls.push('file-close'); } };
  const classes = {
    'android.os.SystemClock': { elapsedRealtime: () => 1234 },
    'android.os.Process': { myPid: () => 7, getStartElapsedRealtime: () => 10 },
    'java.util.UUID': { randomUUID: () => ({ toString: () => 'uuid' }) },
    'java.io.RandomAccessFile': { newInstance: (path, mode) => { assert.equal(path, '/private/douyin-control.lock'); assert.equal(mode, 'rw'); return file; } }
  };
  const Java = { type: name => { assert.ok(classes[name], name); return classes[name]; }, getApplicationContext: () => ({
    getSharedPreferences: () => prefs, getFilesDir: () => ({ getAbsolutePath: () => '/private' }),
    getSystemService: name => name === 'power' ? { isInteractive: () => true } : { isKeyguardLocked: () => false }
  }) };
  const Tools = { UI: { getPageInfo: async () => ({ packageName: 'test' }), clickElement: async arg => { calls.push(arg); return { actionType: 'click' }; }, swipe: async (...args) => { calls.push(args); return { actionType: 'swipe' }; } }, System: { sleep: async ms => calls.push(ms) } };
  const h = createOperitHost({ Java, Tools });
  assert.equal(h.now(), 1234); assert.equal(h.processId(), '7:10'); assert.equal(h.isInteractive(), true);
  h.set('session', 'value'); assert.equal(h.get('session'), 'value');
  const release = h.acquire(); await h.click('[1,2][3,4]'); await h.swipe(1,2,3,4,300); release();
  assert.deepEqual(calls, [{ bounds: '[1,2][3,4]' }, [1,2,3,4,300], 'release', 'channel-close', 'file-close']);
});
