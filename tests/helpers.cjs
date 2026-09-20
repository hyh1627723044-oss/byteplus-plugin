const profile = {
  packageName: 'com.ss.android.ugc.aweme',
  activityName: 'test.VideoActivity',
  viewport: { width: 1080, height: 2400 },
  markers: [{ resourceId: 'test:id/feed' }, { text: '推荐' }],
  blockers: [{ text: '评论面板' }, { text: '直播间' }, { text: '图文' }],
  identity: [{ resourceId: 'test:id/author' }, { resourceId: 'test:id/title' }],
  like: { on: { contentDesc: '已点赞' }, off: { contentDesc: '未点赞' } },
  favorite: { on: { contentDesc: '已收藏' }, off: { contentDesc: '未收藏' } },
  gesture: { x: 0.45, top: 0.3, bottom: 0.7, durationMs: 300 }
};
function page({ video = 'one', liked = false, favorited = false, blocked = false } = {}) {
  const node = (props) => ({ className: 'android.view.View', isClickable: false, children: [], ...props });
  return { packageName: profile.packageName, activityName: profile.activityName, uiElements: node({ bounds: '[0,0][1080,2400]', children: [
    node({ resourceId: 'test:id/feed' }), node({ text: '推荐' }),
    node({ resourceId: 'test:id/author', text: '@author' }), node({ resourceId: 'test:id/title', text: video }),
    node({ contentDesc: liked ? '已点赞' : '未点赞', bounds: '[900,800][1000,900]', isClickable: true }),
    node({ contentDesc: favorited ? '已收藏' : '未收藏', bounds: '[900,1000][1000,1100]', isClickable: true }),
    ...(blocked ? [node({ text: '评论面板' })] : [])
  ] }) };
}
function host() {
  const store = new Map();
  let locked = false;
  return {
    t: 1000, interactive: true, current: page(), calls: [],
    now() { return this.t; }, processId() { return 'test-process'; }, id() { return 'session-test'; },
    get(key) { return store.get(key) ?? null; }, set(key, value) { store.set(key, value); },
    acquire() { if (locked) return null; locked = true; return () => { locked = false; }; },
    isInteractive() { return this.interactive; },
    async readPage() { return structuredClone(this.current); },
    async click(bounds) { this.calls.push(['click', bounds]); this.current = page({ liked: bounds.includes('800'), favorited: bounds.includes('1000,1100') }); },
    async swipe(...args) { this.calls.push(['swipe', ...args]); this.current = page({ video: 'two' }); },
    async sleep(ms) { this.t += ms; }
  };
}
module.exports = { profile, page, host };
