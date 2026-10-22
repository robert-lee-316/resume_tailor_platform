# Folio — Style settings and fast live preview

## Changes

- New **Style** tab (also accessible from the left rail) to adjust eight separate areas: Name, Role, Personal information, Summary, Skills, Experience, Education, and Body / achievement bullets.
- Per-area font family, size (7–36 pt), bold, text color, and alignment including justified skills.
- Styling persists in browser localStorage and is included in JSON backup (`_styles`) and Word/PDF rendering requests.
- **Instant** preview is the default: React updates only changed text and styles in an HTML document draft, without invoking LibreOffice after every keystroke.
- **Exact PDF** preview is still available with the original uploaded Word template and LibreOffice; it renders after an 1.8-second quiet period and cannot be patched word-by-word because PDF is a fixed-layout document.
- Downloaded `.docx` and `.pdf` include style changes. Existing templates with supported placeholders still work unchanged.

## How to install the patch on Windows/Git Bash

1. Back up the existing project directory.
2. Extract the patch ZIP into the project root, allowing the files inside `frontend/` and `backend/` to replace corresponding files.
3. Keep your `.venv`, installed Python packages, uploaded templates and local browser data.
4. Restart both servers:

Backend (Git Bash):

```bash
cd backend
source .venv/Scripts/activate
python -m uvicorn app.main:app --reload --port 8000
```

Frontend (second terminal):

```bash
cd frontend
npm run dev
```

No new npm or Python dependencies are required by this update.

## Notes on preview fidelity

Instant preview is a **structured HTML approximation** of the resume (name, role, contact, summary, skills, experience, education) and honors the styling controls. It does not reproduce arbitrary uploaded Word table layouts, margins, or pagination. Switch to **Exact PDF** to validate original template layout before downloading. The exact PDF still needs a full conversion after a change; incremental updates to a PDF iframe are not supported.

Installed fonts on the device/server influence appearance. For reproducible PDFs, install the same fonts in Windows and in the LibreOffice environment.

## Test status

- 21 backend tests passed, including independent Word formatting overrides and inline `**bold**` preservation.
- TS/TSX syntactic transpilation succeeded.
- Sample DOCX generated and rendered to a one-page PDF using LibreOffice, visually reviewed.
- Complete Next.js build/browser test unavailable in this environment because the npm registry could not be reached (`EAI_AGAIN`). Run `npm install && npm run build` locally.
