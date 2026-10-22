# GuruCorp — Word Template Resume Builder

Full-stack resume builder (Next.js frontend + FastAPI document engine). Users edit their resume in the browser, upload their own **`.docx` template with supported placeholders**, view the *actual generated PDF*, and download both **Word** and **PDF** versions.

![Example output from the included template](examples/qa/page-1.png)

## Quick start

Requirements:
- **Node.js 20.9+** and npm
- **Python 3.11+**
- **LibreOffice** (automatically detected on Windows in the default Program Files installation, or via PATH on Linux/macOS; used for PDF preview/export)

### Terminal 1: FastAPI backend

```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On **Windows PowerShell**, if you do not wish to activate the virtual environment (or the execution policy blocks activation), run:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If you installed Python 3.13 instead of 3.12, use `py -3.13` in that command. Run the commands from the extracted project's root directory; `cd backend` is relative to that root. Install LibreOffice normally (e.g., `C:\Program Files\LibreOffice`) and restart the backend after installation. The backend detects `soffice.com`/`soffice.exe` on Windows automatically.

Backend Swagger API: **http://localhost:8000/docs**

Check **http://localhost:8000/api/health** and confirm `"libreoffice": true`. If false, install LibreOffice and restart the backend.

### Terminal 2: Next.js frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The included sample template and sample resume are loaded automatically so you can see a generated preview without uploading your own file first.

For an API on a non-default port, copy `frontend/.env.example` to `frontend/.env.local` and update `BACKEND_URL`. Restart Next.js after changing the environment file. The browser communicates with local Next.js `/api/` endpoints; Next.js proxies calls to FastAPI, so no backend CORS changes are required.

> Note: This workspace has working Python document dependencies but does not have access to the npm registry. The frontend TypeScript/JSX was syntax-checked, but an actual Next.js development/build run must be completed on a computer with npm package access. Python backend endpoint tests passed.

## Features

- **Polished responsive editor**: personal details, professional summary, repeating work experience, repeating education, skills.
- **DOCX upload**: drag and drop or browse; maximum 5 MB.
- **Template inspection**: server validates archive, supported fields, loops, and placeholder structure; returns detected fields.
- **Debounced PDF preview**: automatically refreshes about 1.2 seconds after editing; cancels stale requests. Uses the browser's built-in PDF viewer, not an HTML approximation.
- **Export**: downloads a fresh DOCX or PDF created from current form values.
- **Local persistence**: resume fields saved in `localStorage`; selected Word template saved in IndexedDB. No accounts/database in this MVP.
- **Backup**: export/import resume JSON (for moving work across browsers).
- **Try it instantly**: bundled sample Word template and initial example data.

## Work Experience editor update

The Work Experience form now has:

- **From** and **To** month/year pickers (native browser controls).
- **I currently work here** checkbox, which disables To and exports the date range ending in `Present`.
- **Achievements** with an **Add bullet (+)** button, one text input per bullet, and a remove button for each bullet.
- Press **Enter** inside a bullet input to add a new bullet.
- Empty achievements are excluded from generated DOCX/PDF files.
- Existing resumes saved in localStorage and older JSON backups still load. For year-only legacy date ranges, the original value is preserved until you select new months (no month is guessed).

The DOCX template syntax is **unchanged**: continue using `{{ exp.dates }}` and the `exp.bullets` loop.

### Windows Git Bash

For an existing checkout, replace `frontend/app/page.tsx`, `frontend/app/globals.css`, and `frontend/lib/resume.ts` with the updated files, then restart the Next.js dev server:

```bash
cd frontend
npm install
npm run dev
```

If your backend is already running, it does not need to be reinstalled for this UI-only change.

## Data and placeholders

The backend is a **restricted, custom python-docx template engine**, **not full Jinja/docxtpl**. Only the documented syntax works. To ensure a consistent experience, create placeholders in regular Word body paragraphs. **Type each entire `{{ placeholder }}` as one uninterrupted formatting run**; avoid changing font or boldness in the middle of it.

Supported scalar fields:

| Fields | Notes |
| --- | --- |
| `{{ full_name }}`, `{{ job_title }}`, `{{ email }}`, `{{ phone }}`, `{{ location }}` | Personal details |
| `{{ summary }}` | Professional summary |
| `{{ skills_text }}` | Comma-separated skills text |
| `{{ exp.job_title }}`, `{{ exp.company }}`, `{{ exp.dates }}` | Use within `experiences` loop |
| `{{ bullet.text }}` | Use within `exp.bullets` loop |
| `{{ ed.degree }}`, `{{ ed.institution }}`, `{{ ed.dates }}` | Use within `education` loop |

Example Word paragraphs (each line corresponds to a distinct paragraph in Microsoft Word):

```text
{{ full_name }}
{{ job_title }}
{{ email }} • {{ phone }} • {{ location }}

PROFESSIONAL SUMMARY
{{ summary }}

WORK EXPERIENCE
{%p for exp in experiences %}
{{ exp.job_title }} — {{ exp.company }}
{{ exp.dates }}
{%p for bullet in exp.bullets %}
{{ bullet.text }}
{%p endfor %}
{%p endfor %}

EDUCATION
{%p for ed in education %}
{{ ed.degree }} — {{ ed.institution }}
{{ ed.dates }}
{%p endfor %}

SKILLS
{{ skills_text }}
```

Control tags like `{%p for exp in experiences %}` and `{%p endfor %}` must occupy **separate standalone Word paragraphs**. Their paragraphs are removed during rendering and the enclosed paragraphs are repeated. Style content paragraphs in Word; the original paragraph/run formatting is carried through to the output.

Download/edit [examples/sample_template.docx](examples/sample_template.docx) to create a different look. The same sample template is shipped at `frontend/public/templates/sample_template.docx` and used by the editor's **Use sample template** button.

### Current DOCX limitations

- `.docx` only; `.doc` files are unsupported.
- Loop blocks only in the document body; not in table rows, headers, footers or floating text boxes.
- Placeholders are not supported in headers or footers.
- A placeholder cannot be split across Word formatting runs.
- Only supported, well-formed placeholders are accepted; arbitrary Jinja expressions, `if` blocks and filters are not supported.
- PDF pagination depends on the Word template, font availability and the length of entered text. The system does **not** promise a fixed number of pages.
- Font appearance can vary between Word and LibreOffice; install any special fonts on the document-processing server.

## Project structure

```text
resume-builder-starter/
├── backend/
│   ├── app/
│   │   ├── main.py              # Render & template inspection FastAPI endpoints
│   │   └── engine.py            # Restricted placeholder and repeat-section renderer
│   ├── tests/                   # Python unit + API tests
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts
│   │   │   ├── inspect-template/route.ts
│   │   │   └── render/route.ts  # Next.js-to-FastAPI proxy
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx             # Full resume editor and preview
│   ├── lib/
│   │   ├── resume.ts           # Data model and validation
│   │   └── template-store.ts  # IndexedDB file persistence
│   └── public/
│       ├── images/
│       └── templates/
└── examples/
    ├── sample_template.docx
    ├── sample_resume.json
    ├── sample_output.docx
    └── sample_output.pdf
```

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health and PDF support |
| `POST` | `/api/inspect-template` | Upload `template` `.docx` to inspect placeholders |
| `POST` | `/api/render` | Multipart form: `template` (file), `resume_json` (JSON string), `format` (`pdf` or `docx`); responds with document bytes |

Run backend tests:

```bash
cd backend
python -m pytest -q
```

Frontend checks once dependencies are installed:

```bash
cd frontend
npm run typecheck
npm run build
```

## Security & production considerations

This is a **local MVP**, not yet a publicly deployable multi-user service. Uploaded Word files are not authenticated, generation runs synchronously, and data persists only in the local browser. For production, add user accounts and authorization, private object storage, server-side durable data storage, virus/malware scanning, quotas, isolated document workers with CPU/memory/time constraints, an async task queue, and safe temporary-file policies. Expose Next.js/worker services through HTTPS.

The Next.js API proxy limits upload sizes and keeps backend host details server-side. FastAPI performs additional DOCX ZIP safety checks. These protections alone are **not** a replacement for isolating processing of untrusted Office documents.

## Work Experience calendar update

The **From** and **To** fields use native calendar pickers with day/month/year selection. The completed resume shows month/year dates (e.g., `Apr 2022 – Oct 2026`), preserving the existing DOCX template payload shape and layout. Dates previously saved in month-only format remain compatible and show day 1 in the calendar until changed.

For existing local installations, copy `frontend/app/page.tsx`, `frontend/app/globals.css`, and `frontend/lib/resume.ts` from the patch ZIP into the matching project folders. Restart `npm run dev`. No additional dependencies or backend changes are required.

---

## October 2026 update: import previous resume, bold keywords, education dates

See [FEATURE_UPDATE_NOTES.md](FEATURE_UPDATE_NOTES.md) for usage, compatibility details, validation and Windows installation instructions. New backend dependency: `pypdf>=5,<7`.

## Skills & Expertise categories (latest update)

The Skills section contains separate **category rows** with one input for the category name and individual skill boxes. Each row has a **+ Add skill** button, an **x** on each skill, and a category-delete button. A separate **+ Add category** button creates another row. Press **Enter** in a skill input to append a skill.

The editor autosaves categorized skills and migrates older flat comma-separated skills from existing local saves, JSON backups, or imported resumes. Existing Word templates using `{{ skills_text }}` continue to work: generated output shows one category per line (`Languages: Python, TypeScript`). For custom Word templates that need each category as a separate paragraph, use the optional `skill_categories` loop documented in `SKILLS_CATEGORIES_UPDATE.md`.

**This update changes both the frontend and the Python document renderer.** Replace the files in the patch, then restart **both** frontend and backend servers. No new pip or npm packages are needed.
