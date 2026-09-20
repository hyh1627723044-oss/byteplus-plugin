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
