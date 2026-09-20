const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../scripts/build.cjs');
test('standalone artifact exports every declared tool and reports unsupported host honestly', async () => {
  const script = build(), returned = [];
  const context = { exports: {}, complete: result => returned.push(result), Java: null, Tools: null };
  vm.runInNewContext(script, context);
  const metadata = JSON.parse(/METADATA\s*([\s\S]*?)\*\//.exec(script)[1]);
  assert.deepEqual(Object.keys(context.exports).sort(), metadata.tools.map(t => t.name).sort());
  await context.exports.start_control({});
  assert.equal(returned[0].code, 'HOST_UNSUPPORTED');
  assert.equal(returned[0].verified, false);
});
test('toolpkg builds reproducibly and hash tracks the archive', () => {
  const file = path.join(__dirname, '../dist/douyin-control-0.1.0.toolpkg');
  const first = fs.readFileSync(file); build();
  assert.deepEqual(fs.readFileSync(file), first);
  const digest = require('node:crypto').createHash('sha256').update(first).digest('hex');
  assert.ok(fs.readFileSync(file.replace('.toolpkg', '.sha256'), 'utf8').startsWith(digest));
});
