# GuruCorp — Summary bold & Skill Chips Fix

## Fixed
1. **Professional Summary:** Historical browser style settings containing `bold: true` no longer turn the entire summary bold in generated Word/Exact PDF. Individual `**keyword**` markers still render as true bold runs. Other summary styles such as font, size and alignment continue to work.
2. **Instant Preview:** Summary body is regular by default, with bold only for selected keywords.
3. **Style Settings:** The Summary no longer exposes a misleading whole-paragraph Bold checkbox; use Ctrl+B or the Bold selection button in the Summary editor.
4. **Skills & Expertise:** Existing skills are compact, wrapped, read-only keyword chips with small delete (×) buttons. A single add-keywords field is provided per category; Enter and comma delimiters work, including pasted comma-separated lists. Existing category reordering and document export order remain intact.
5. **Saved data:** Existing resume data, templates, and other style settings are preserved. Stale summary bold overrides are sanitized on load.

## Install patch (Windows)
Copy patch files to the **root of your existing GuruCorp project**, maintaining paths:
- `backend/app/engine.py`
- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/lib/styles.ts`

The patch also includes backend regression tests in `backend/tests/`. No Word template change and no new package are required. Restart the backend and frontend with your existing launcher, then refresh Exact PDF (the old converted PDF may remain cached until a refresh).

## Test
- Type a Summary containing no `**` markup. Confirm it is regular in the generated Word/PDF document.
- Mark a selected phrase with Ctrl+B or `**bold phrase**`. Only that phrase should appear bold.
- In Skills & Expertise, remove a tag using its small `×`; add keywords with Enter or a comma-separated paste.
- Confirm that the selected category order is preserved in the exported Word/PDF.

## Verification in development environment
- 11 focused Python tests passed, including summary-with-legacy-bold-overrides and skills-category export tests.
- TypeScript/TSX source parsed successfully using the TypeScript compiler's transpilation diagnostics.
- Browser runtime and full Next.js build are not verified (frontend npm packages were not available).
