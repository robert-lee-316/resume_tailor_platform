# GuruCorp — Skill Tags, Summary Bold & Default Font Fix

## Install
Copy these files into your existing GuruCorp project (preserve directories):

- `frontend/app/page.tsx`
- `frontend/lib/styles.ts`
- `backend/app/engine.py`

Optional regression tests: `backend/tests/test_summary_inheritance_and_font.py`.

Restart **both** Next.js and FastAPI. Don't clear browser storage; your resume data and templates are preserved.

## Changes

1. Skills & Expertise already uses removable keyword chips. This patch carries the latest implementation. Only the **Add keyword** control is a text input; individual skills are labels with `×` delete actions. Pasting comma/semicolon/newline-separated skills now adds multiple tags, with duplicate prevention.
2. Summary body paragraphs default to normal weight in rendered Word and Exact PDF, even if the uploaded DOCX's summary placeholder run is bold. Explicit `**selected words**` remain bold. An explicit all-bold style setting still takes priority.
3. Adds a **Remove all bold** control to Professional Summary, useful if an imported or pasted summary was completely marked bold. Ctrl+Z is supported by the existing summary undo history.
4. Unmodified font settings now display **Use Word template font** rather than suggesting Times New Roman is a required default. Explicit user-selected fonts still override DOCX formatting.

## Verification
- 56 backend tests passed (`PYTHONPATH=backend python -m pytest backend/tests -q`).
- Frontend TSX and TS passed TypeScript syntax parsing.
- Complete Next.js build not verified here because the npm registry was unavailable.

## Notes
- Instant Preview is a browser approximation. Exact PDF uses the uploaded Word document and its installed fonts.
- If your summary is still all bold, open **Professional Summary**, click **Remove all bold**, then in Style Settings make sure **Summary → Bold text** is unchecked. For a Word template with a bold placeholder, the backend fix ensures unmarked content renders normal.
