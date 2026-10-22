# Exact PDF: company description compatibility fix

## What changed

The backend Word renderer automatically inserts an ordinary `{{ exp.description }}` paragraph immediately after `{{ exp.company }}` **inside** a recognized `{%p for exp in experiences %}` block when:

- the uploaded template does not already contain `{{ exp.description }}` anywhere, and
- the resume includes at least one nonempty company description.

Updated templates containing `{{ exp.description }}` are left unchanged. Empty descriptions do not create blank paragraphs. The inserted paragraph inherits the surrounding company paragraph formatting, but any direct bold and bullet numbering are removed.

No frontend source changes, dependencies, or Word-template reupload are needed.

## Install only the fix

1. Extract `folio-exact-pdf-company-description-patch.zip`.
2. Copy `backend/app/engine.py` into the corresponding folder in your existing project, replacing the original.
3. Restart the backend server in Git Bash:

   ```bash
   cd backend
   source .venv/Scripts/activate
   python -m uvicorn app.main:app --reload --port 8000
   ```

4. In the browser choose **Exact PDF** and click the refresh (circular-arrow) button to bypass the old cached preview.

If the description still does not appear, verify the company description field actually contains text, and upload a currently used template for inspection. A custom Word template lacking an experience loop or company placeholder cannot be automatically upgraded.

## Verification

- All 28 backend tests passed, including legacy-template Word and PDF regression tests.
- Rendered a legacy Word template without `exp.description` and visually verified the converted PDF includes the description as a normal paragraph.
