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
