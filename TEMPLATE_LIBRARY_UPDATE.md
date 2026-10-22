# GuruCorp — Saved Template Library

## New behavior

- The Template tab displays all saved `.docx` templates with name, size, and date added.
- Click **Use template** (or the item itself) to make it active for the current resume.
- The **Active Word template** dropdown in the preview toolbar lets you switch while editing any section.
- Uploading a valid `.docx` adds it to the library rather than replacing other templates.
- Selected template and uploaded documents are stored in browser IndexedDB and retained across page reloads.
- Existing one-template data is migrated automatically. New workspaces include the bundled sample.
- Remove individual templates using the trash control; this does not delete resume data.
- DOCX and Exact PDF are generated from the chosen template; the resume fields and styles are unchanged when switching.
- Import Previous Resume still **only imports data**. It does not generate, download or select a template.

## Install

In your existing GuruCorp project, replace these three files with those from the patch:

- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/lib/template-store.ts`

Restart the frontend (`npm run dev`). The backend and sample DOCX do not need changes.

## Important

Templates are saved **in this browser on this PC**, not to a cloud account or the server. Clearing site storage can remove them. Keep copies of your DOCX templates. Browser storage quota limits apply. Exact PDF conversion may take a few seconds after switching.

## Verification

- 6 template-library persistence tests passed.
- 43 existing backend tests passed.
- TS/TSX syntax transpilation passed.
- Full Next.js browser build was not verified because npm dependency installation timed out in this environment.
