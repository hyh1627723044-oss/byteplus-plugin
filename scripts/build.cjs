'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function build() {
  const metadata = require('../metadata.json');
  const modules = ['router', 'page', 'controller', 'operit', 'entry'];
  const body = modules.map(name => {
    const source = fs.readFileSync(path.join(root, 'src', name + '.cjs'), 'utf8');
    new vm.Script(source, { filename: name });
    return JSON.stringify('./' + name + '.cjs') + ': function(module, exports, require) {\n' + source + '\n}';
  }).join(',\n');
  const output = '/*\nMETADATA\n' + JSON.stringify(metadata, null, 2) + '\n*/\n' +
    '(function () {\nconst modules = {\n' + body + '\n};\nconst cache = {};\n' +
    'function load(id) { if (!cache[id]) { const m = { exports: {} }; cache[id] = m; modules[id](m, m.exports, load); } return cache[id].exports; }\n' +
    'const api = load("./entry.cjs").createExports(() => load("./operit.cjs").createOperitHost({ Java, Tools }));\n' +
    'for (const name of Object.keys(api)) exports[name] = async function(params) { const result = await api[name](params); complete(result); };\n})();\n';
  new vm.Script(output);
  const staging = path.join(root, 'dist', 'staging');
  fs.mkdirSync(path.join(staging, 'packages'), { recursive: true });
  fs.writeFileSync(path.join(staging, 'packages', 'douyin_control.js'), output);
  fs.writeFileSync(path.join(root, 'dist', 'douyin_control.js'), output);
  fs.copyFileSync(path.join(root, 'manifest.json'), path.join(staging, 'manifest.json'));
  fs.writeFileSync(path.join(staging, 'main.js'), 'function registerToolPkg() { return true; }\nexports.registerToolPkg = registerToolPkg;\n');
  execFileSync(process.env.PYTHON || 'python', [path.join(root, 'scripts', 'archive.py'), staging, path.join(root, 'dist', 'douyin-control-0.1.0.toolpkg')], { stdio: 'inherit' });
  return output;
}
if (require.main === module) { build(); console.log('Built dist/douyin-control-0.1.0.toolpkg and dist/douyin_control.js'); }
module.exports = { build };
