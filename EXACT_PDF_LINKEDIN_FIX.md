# Exact PDF: LinkedIn compatibility fix

## Problem
A resume exported using a browser-saved Word template from before the LinkedIn feature was added can omit LinkedIn, even though the instant preview displays it.

## Solution
The backend document renderer detects the absence of `{{ linkedin }}` and, when the resume contains a nonempty LinkedIn value, adds it to the Word contact line containing `{{ email }}`, `{{ phone }}`, or `{{ location }}`. The Word file is then converted to the Exact PDF as usual.

- Existing `{{ linkedin }}` placeholders are respected; no duplication.
- Empty LinkedIn values add no separator.
- Existing Word formatting is retained.
- Works with the original stored Word template; re-uploading is not required.
- An explicitly hard-coded LinkedIn URL is never duplicated.

## Apply patch on Windows
Copy `backend/app/engine.py` from the patch into your installed project, replacing its existing file. Then restart FastAPI:

```bash
cd backend
source .venv/Scripts/activate
python -m uvicorn app.main:app --reload --port 8000
```

Open the app, check that **Personal Information → LinkedIn profile** has a value, choose **Exact PDF**, then use the circular **Refresh** button to force a new PDF instead of reusing an existing preview.

Note: This fallback only applies when the template has a supported contact line with at least one of the email, phone or location placeholders. If a custom template has no recognizable contact placeholder, add `{{ linkedin }}` explicitly in the template.

## Verification
All 34 backend tests passed, including a real `/api/render` PDF export with a legacy template. The result was rendered and visually inspected.
