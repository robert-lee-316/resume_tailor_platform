// Run: node component-architecture.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const root = process.cwd();
const entry = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
assert.match(entry, /ResumeBuilderProvider/);
assert.match(entry, /<ResumeStudio\s*\/>/);
assert.ok(entry.split('\n').length < 25, 'App entry should stay minimal');
const expected = [
  'components/ResumeStudio.tsx', 'components/editor/ResumeEditor.tsx',
  'components/layout/Sidebar.tsx', 'components/layout/TopBar.tsx',
  'components/preview/DocumentPreview.tsx', 'components/preview/InstantResumePreview.tsx',
  'components/sections/PersonalSection.tsx', 'components/sections/SummarySection.tsx',
  'components/sections/ExperienceSection.tsx', 'components/sections/EducationSection.tsx',
  'components/sections/SkillsSection.tsx', 'components/sections/StylesSection.tsx',
  'components/sections/TemplateSection.tsx', 'components/sections/ExportSection.tsx',
  'components/dialogs/ResumeImportDialog.tsx', 'components/feedback/Toast.tsx',
  'context/ResumeBuilderContext.tsx', 'hooks/useResumeBuilderController.ts',
];
for (const rel of expected) assert.ok(fs.existsSync(path.join(root, rel)), `${rel} missing`);
let checked = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) { if (name !== 'node_modules' && name !== '.next') walk(file); continue; }
    if (!/\.tsx?$/.test(name)) continue;
    const code = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, name.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.equal(sf.parseDiagnostics.length, 0, `${file}: ${sf.parseDiagnostics.map(x => x.messageText).join('; ')}`);
    for (const match of code.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
      const target = path.join(root, match[1].slice(2));
      assert.ok([target + '.ts', target + '.tsx', path.join(target, 'index.ts'), path.join(target, 'index.tsx')].some(fs.existsSync), `${file}: ${match[1]} unresolved`);
    }
    checked++;
  }
}
walk(root);
assert.match(fs.readFileSync(path.join(root, 'components/sections/SkillsSection.tsx'), 'utf8'), /SkillKeywordEditor/);
assert.match(fs.readFileSync(path.join(root, 'components/preview/DocumentPreview.tsx'), 'utf8'), /Generated PDF resume preview/);
assert.match(fs.readFileSync(path.join(root, 'components/sections/ExperienceSection.tsx'), 'utf8'), /AchievementRichInput/);
console.log(`Component architecture checks passed (${checked} TypeScript source files)`);
