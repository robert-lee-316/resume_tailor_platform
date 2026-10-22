# GuruCorp — Import Previous Resume (Data Only)

When a user selects **Import previous resume**, the frontend now:

1. Uploads the selected .docx or text-based .pdf file to `/api/import-resume` for data extraction.
2. Displays a review dialog with extracted personal info, experience and education.
3. Updates resume editor fields **only after the user confirms**.
4. Keeps the currently selected Word template unchanged.

The import process NO LONGER calls the template-generation endpoint, generates a new template, saves a template to IndexedDB, or downloads a DOCX.

The Template tab continues to accept manually uploaded .docx placeholder templates. DOCX/PDF resume export and the independent completed-resume Word autosave feature remain unchanged. To disable completed-resume autosaving, use the existing **Export → Auto-save Word document** toggle.

## Install patch

Replace `frontend/app/page.tsx` in your local project with the copy in this archive, then restart Next.js (`npm run dev`). Backend changes are not required.

## Verification
- TSX syntax parsed with TypeScript 5.8.3 (no diagnostics).
- Static flow checks verified import uses `/api/import-resume`, does not call template generation or downloading, does not replace template, and keeps review-before-import.
- Full browser / Next.js runtime build not performed in this environment.
