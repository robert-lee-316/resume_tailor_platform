# Resume Builder: Previous Resume Import, Bold Keywords, Education Dates

Updated from the previous *bullet reordering + work experience date picker* version. All previous features remain.

## New features

1. **Bold keywords**: In each achievement, select text in its input and click the **B** button (or use Ctrl+B / Cmd+B). You can also bold words in the Professional summary. The editor stores selected emphasis as `**text**` and displays a formatted preview below the field. Actual `.docx` and `.pdf` exports produce real bold runs while preserving the uploaded Word template's default font and styles. Clicking B on selected text that is already enclosed in a pair of markers removes that emphasis.
2. **Education date calendars**: Education now has From and To date pickers and an "I currently study here" checkbox. Both date inputs store precise calendar dates and display month/year in the generated resume. Older JSON backups with only `dates` still work; unknown months are **not** guessed. Choose dates in the form to convert them.
3. **Import an older resume**: On **Personal details**, click **Import previous resume**. Choose a `.docx` or text-based `.pdf` (up to 5 MB). The backend extracts likely name, job title, contact details, summary, skills, work experience and education, then shows a **review dialog**. Confirm to replace current resume data while keeping the current template. Adjust extracted values before downloading. JSON backup import is still available on Export.

## Apply the patch to your existing Windows project

Extract the **patch-only ZIP** in a temporary folder and copy its contents over your existing `folio-resume-builder-windows-ready` project. Preserve subfolder names, e.g. `frontend/app/page.tsx`, `backend/app/main.py`. It contains only changed/new files. Make a backup of your edits first.

In your **Git Bash** backend terminal:

```bash
cd backend
source .venv/Scripts/activate
python -m pip install --index-url https://pypi.org/simple "pypdf>=5,<7"
python -m uvicorn app.main:app --reload --port 8000
```

For a fresh setup, install all dependencies with `python -m pip install -r requirements.txt`. The `pypdf` library is **new** and enables text-based PDF imports. The Python Word renderer still uses `python-docx`. LibreOffice remains required for PDF preview/export, **not** for importing a Word resume.

In a second terminal:

```bash
cd frontend
npm install  # only if not already installed
npm run dev
```

Go to `http://localhost:3000` and choose **Personal details → Import previous resume**.

## Import behavior and limitations

- Extraction is rule-based; it is not an AI parser. DOCX is generally more reliable than PDF, and some layouts (especially multi-column resumes) may be detected incorrectly.
- Text-based PDF files are supported; scanned/image-only PDFs require OCR, which is not included.
- The review dialog summarizes the recognized positions, education and warnings before you replace current form data.
- This MVP uses browser localStorage for saved resume content. Uploaded previous resume documents are processed temporarily by your local FastAPI server and not persisted. Avoid deploying public uploads without worker isolation, rate limits and stronger input sanitation.
- Existing Word templates and their placeholders do **not** need updating. The `.docx` template receives the existing `{{ bullet.text }}`, `{{ summary }}`, and `{{ ed.dates }}` fields.

## Verified

- 14 backend tests passed, including DOCX and text-PDF imports and real Word bold runs.
- Rendered a 2-page document from the previous Diego-style Word template with bold keywords, then inspected both page images.
- TypeScript and TSX files passed syntax/transpilation checks using TypeScript 5.8.3; the actual Next.js build/browser runtime is not verified in this environment because npm registry installation was unavailable.
