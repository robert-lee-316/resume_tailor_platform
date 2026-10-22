import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const source = fs.readFileSync(new URL('./lib/styles.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={module:{exports:{}},exports:{}};context.exports=context.module.exports;
vm.runInNewContext(js,context);
const {DEFAULT_STYLES,JUSTIFIED_BODY_KEYS,parseResumeStyles,cssTextStyle}=context.module.exports;
const body=['summary','skills','experience','experienceDescription','experienceBullets','education','body'];
for (const key of body) {
  assert.equal(DEFAULT_STYLES[key].align,'justify',`Default ${key} justified`);
  assert.equal(DEFAULT_STYLES[key].enabled,true);
  assert.ok(DEFAULT_STYLES[key].changed.includes('align'));
  assert.equal(cssTextStyle(DEFAULT_STYLES[key]).textAlign,'justify');
  assert.ok(JUSTIFIED_BODY_KEYS.includes(key));
}
for(const key of ['name','role','personal','skillsHeading','experienceHeading','educationHeading']) {
  assert.equal(DEFAULT_STYLES[key].align,'center',`${key} not justified`);
}
const migrated=parseResumeStyles({summary:{align:'left',enabled:false,changed:[]},skills:{align:'left',enabled:false,changed:[]}});
for(const key of body) {
  assert.equal(migrated[key].align,'justify',`${key} migrated`);
  assert.ok(migrated[key].changed.includes('align'));
}
const manual=parseResumeStyles({summary:{align:'left',enabled:true,changed:['align']},skills:{align:'right',enabled:true,changed:['align']}});
assert.equal(manual.summary.align,'left');assert.equal(manual.skills.align,'right');
console.log('Default justify & legacy migration checks passed');
