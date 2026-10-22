# GuruCorp: automatic reusable Word-template generation

## What changes

1. Open **Personal details → Import previous resume** or **Template → Auto-create template from a resume**.
2. Choose a previously completed `.docx` resume or selectable-text `.pdf` (up to 5 MB).
3. GuruCorp calls `POST /api/generate-template-from-resume`, validates the generated `.docx` placeholder template, saves it in IndexedDB as the active template, and triggers a browser download of `OriginalName-GuruCorp-Template.docx`.
4. For **completed** resumes it separately extracts resume data and opens an import-review dialog. Choose **Replace with imported data** to update the editor; the Word template is saved even if you decline to replace form fields.
5. If the uploaded file is an **existing valid placeholder template**, it is preserved, activated and downloaded without attempting to parse placeholder names as resume content.
6. If a Google Docs-exported template splits a placeholder across Word runs, the backend attempts a safe repair while retaining the document's layout. Invalid or unsupported placeholders still produce validation errors.

## Important limits

- Template conversion from a *completed resume* produces a clean, reusable Word design. It uses the source's page dimensions, margins, and first explicit font when possible, but **does not guarantee pixel-perfect recreation** of the original's tables, columns, images, or typography. For exact original designs, start from a user-prepared placeholder DOCX.
- PDF resume import requires selectable text. OCR and scanned PDFs are not supported.
- Files saved in IndexedDB remain in the browser until its site data is cleared. The browser also downloads the generated `.docx` to its configured Downloads folder; check the browser's download prompts. A website cannot silently write to arbitrary Windows paths without permission.
- The generated `.docx` is a **placeholder template**, distinct from the completed Word resume produced by Export and the existing Word autosave feature.
- The current renderer supports the fields/loops documented on the Template page. Other sections such as Publications/Projects are not automatically generated as new fields.

## Windows installation

Extract the patch ZIP into the GuruCorp project root (merge the frontend/backend directories). Restart both servers. No additional Python packages beyond existing requirements.

Backend Git Bash:

```bash
cd backend
source .venv/Scripts/activate
python -m uvicorn app.main:app --reload --port 8000
```

Frontend Git Bash (separate terminal):

```bash
cd frontend
npm run dev
```

Open http://localhost:3000. Test using a completed resume DOCX, then test uploading your existing Diego Word template through Import previous resume.

## Verification

- Python test suite: 43 passed.
- Generated template and repaired Diego template were rendered to page PNGs and visually reviewed.
- TypeScript/TSX syntax parsed successfully. Full Next.js build was not possible here because npm dependencies could not be installed from the registry in this environment.
