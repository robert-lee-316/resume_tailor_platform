# GuruCorp — Auto-save generated Word resumes

## What changes

- After you stop editing a resume for ~1.8 seconds, GuruCorp requests an updated `.docx` from the existing FastAPI document renderer.
- The latest generated Word document is saved in the **browser's IndexedDB**. It survives normal page reloads on that computer/browser (but not necessarily browser data clearing or private mode).
- On the **Export** page, click **Choose auto-save folder** to authorize a folder on your Windows PC. On Chrome/Edge running on `http://localhost:3000` or HTTPS, the application will then update `<Full-Name>-resume.docx` in that folder after each batch of edits.
- A folder can lose permission on reload or browser restart. If the export panel says to reconnect, click **Reconnect: <folder>** to re-authorize it. The browser's local Word copy continues to work without permission.
- You can click **Download saved DOCX** to recover the most recently generated document, even if the backend is temporarily unavailable.
- Word download buttons reuse the generated DOCX if it matches the latest resume content.
- The original uploaded `.docx` file is **never rewritten**: it must retain its `{{ placeholders }}` for future renders.

## Install

Extract the `gurucorp-word-autosave-patch.zip` files into the root of the current GuruCorp project, preserving the `frontend/...` paths. Restart `npm run dev`. No Python backend modifications or new npm dependencies are necessary.

The browser must be able to reach the existing FastAPI backend at `/api/render`. If your backend is offline, form data still autosaves locally, but DOCX generation will show an error until it comes online.

## Technical details

- Source: `frontend/lib/docx-autosave.ts` (IndexedDB generated drafts and File System Access API folder option).
- UI: `frontend/app/page.tsx` (auto-save lifecycle, folder picker, recovery download, export cache).
- Styles: `frontend/app/globals.css`.
- Generated draft and `outputFolder` handle are persisted in **a separate IndexedDB database**, not in the IndexedDB store holding the original uploaded template.
- `gurucorp-word-autosave-v1` in localStorage controls the default-enabled auto-save toggle.
- Does not continuously start LibreOffice/PDF conversion; `.docx` generation is a separate, lighter request.
- Because auto-save is scheduled after typing pauses, a browser crash during the last 1–2 seconds can still lose the newest generated DOCX, while form content is usually already saved in localStorage.
- Disk-save is available on supported Chromium browsers; for unsupported browsers, the last generated file is available through the Download saved DOCX button.

## Verification

- Python backend suite: `38 passed`.
- Frontend modified TSX/TS code: TypeScript syntax transpilation succeeded.
- Full Next.js build/browser integration: not verified here; npm registry access timed out.
