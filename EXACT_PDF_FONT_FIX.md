# Exact PDF font settings fix

## Root cause

The DOCX generator previously appended `w:rPr` (run properties) after `w:t` (text) on cloned Word runs that did not already have run properties. This creates an invalid order in WordprocessingML. LibreOffice could ignore font family/size/color overrides during PDF conversion even though python-docx could read the overridden properties.

## Fix

`backend/app/engine.py`: `set_child` now inserts `w:rPr` and `w:pPr` before content, and normalizes existing misplaced properties. No changes to resume data or templates are required.

## Apply to existing installation (Windows Git Bash)

1. Extract the patch archive at the root of your project, replacing `backend/app/engine.py` (and optionally adding the regression test).
2. Stop your FastAPI server using Ctrl+C; restart it:

   ```bash
   cd backend
   source .venv/Scripts/activate
   python -m uvicorn app.main:app --reload --port 8000
   ```

3. The frontend does not need code changes. Return to the browser; switch to Exact PDF and select Refresh to force regeneration.
4. Change a style (e.g. Skills: Arial, 14 pt) and wait for the rendered PDF. Download a fresh PDF to validate. 

**Fonts:** The machine doing PDF conversion needs the selected fonts installed. On Windows, common fonts like Arial, Georgia, and Times New Roman are generally available. On a Linux server, fallback fonts may be substituted unless installed.

## Verification

- 38 backend tests pass, including a test asserting Word run properties occur *before* run text.
- Converted the bundled Diego-style DOCX with Arial styling; the PDF embeds `LiberationSans` (the local substitute for Arial) instead of keeping the template's original font.
- Example PDF: `examples/Exact_PDF_Font_Fix_Example.pdf`.
