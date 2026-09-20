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
