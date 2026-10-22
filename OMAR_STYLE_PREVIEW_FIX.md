# GuruCorp Omar-Style Layout Alignment Fix

This update improves the Omar-style DOCX achievement bullets and makes the Instant HTML draft resemble the Omar Word template more closely.

## Install
1. Copy `frontend/app/page.tsx` and `frontend/app/globals.css` into the existing GuruCorp project, replacing those files.
2. In GuruCorp Template Library, upload `templates/GuruCorp_Omar_Resume_Template_Aligned_Bullets.docx` and SELECT it. Previously saved templates do not update automatically.
3. Restart Next.js with `npm run dev` and refresh the page.
4. Refresh Exact PDF once to regenerate it from the new template.

## What changed
- DOCX bullets use `•` + a tab stop and a fixed hanging indent, with left alignment, so wrapped lines align under the first word instead of shifting or expanding spaces.
- Instant Preview detects an Omar-named selected DOCX and uses a closer layout: underlined name, slash-separated contact details, no SUMMARY heading, centered SKILLS/WORK EXPERIENCE/EDUCATION headings, category skill lines without bullet symbols, and job/date placement matching the template.
- Other template types continue to use the default Instant Preview.
- The preview is still HTML. The Word document converted to PDF remains the source of truth for exact fonts, wrapping, page breaks, and pagination. Different uploaded Word templates can have arbitrary designs; the HTML preview cannot exactly reproduce them all.
- The font/alignment selected in the Style Settings 'Content / bullets' overrides default bullet paragraph alignment in the Exact PDF. For ordinary left-aligned achievement bullets, set that area to Left.

No backend code or extra packages are required.

QA: Backend tests 44 passed, frontend TSX syntax check passed, and generated two-page Omar DOCX/PDF visually inspected. Full frontend Next.js build not run because npm modules aren't installed in this environment.
