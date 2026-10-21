import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const source = fs.readFileSync(new URL('./lib/styles.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const context = { module: { exports: {} }, exports: {} };
context.exports = context.module.exports;
vm.runInNewContext(js, context);
const { DEFAULT_STYLES, STYLE_GROUPS, SECTION_HEADING_KEYS, parseResumeStyles, updateSharedHeadingStyle, restoreSharedHeadingStyle } = context.module.exports;
const headings = [...SECTION_HEADING_KEYS];
assert.equal(headings.length,3);
assert.ok(!STYLE_GROUPS.some(g => g.keys.some(k => headings.includes(k))), 'No individual heading selectors in style groups');
let updated = updateSharedHeadingStyle(DEFAULT_STYLES,'font','Georgia');
updated = updateSharedHeadingStyle(updated,'size',15);
updated = updateSharedHeadingStyle(updated,'align','center');
updated = updateSharedHeadingStyle(updated,'bold',true);
updated = updateSharedHeadingStyle(updated,'color','#ab1260');
for (const k of headings) {
  assert.equal(updated[k].font,'Georgia');
  assert.equal(updated[k].size,15);
  assert.equal(updated[k].align,'center');
  assert.equal(updated[k].color,'#ab1260');
  assert.equal(updated[k].bold,true);
  assert.equal(updated[k].enabled,true);
  assert.equal([...updated[k].changed].sort().join(','),'align,bold,color,font,size');
}
const roundTrip = parseResumeStyles(JSON.parse(JSON.stringify(updated)));
for (const k of headings) assert.equal(roundTrip[k].font,'Georgia');
const legacy = parseResumeStyles({
  skillsHeading: { font:'Arial',size:16,align:'right',enabled:true,changed:['font','size','align'] },
  experienceHeading: { font:'Verdana',size:22,enabled:true,changed:['font','size'] }
});
for (const k of headings) assert.equal(legacy[k].font,'Arial','Saved separate headings migrate to one shared style');
const reset=restoreSharedHeadingStyle(updated);
for (const k of headings) {
  assert.equal(reset[k].enabled,false);
  assert.equal(reset[k].changed.length,0);
}
assert.equal(reset.summary.font,DEFAULT_STYLES.summary.font, 'Other styles unaffected');
console.log('Shared heading styles: 6 test groups passed');
