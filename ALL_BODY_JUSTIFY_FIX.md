# GuruCorp: justify all four body sections

The default alignment for **Summary, Skills, Work Experience (job content, description, bullets), and Education** is **Justify**. This is a default, not a locked setting: a user's explicitly customized alignment remains possible. Name, role, contact details and section headings retain their separate formatting.

## Additional fixes

- Exact DOCX/PDF generation collapses hard line breaks embedded in a skill category's text to normal spaces. This prevents LibreOffice from stretching Shift+Enter lines in justified paragraphs.
- Instant Preview normalizes the same soft line breaks and uses normal paragraph wrapping. In justified paragraphs, the final line is not stretched.
- Skills & Expertise category rows use content-sized layout, so the keyword editor does not expand into a huge empty area. Drag handles have neutral gray styling, **without colored borders**.
- Date rows continue using Word right-aligned tabs rather than spacing text across the page. That's a layout mechanism, not a change to the Work Experience/Education body-text default.

## Install

Copy the patch folders into your existing GuruCorp project, overwriting the same paths:

- `frontend/lib/styles.ts`
- `frontend/app/globals.css`
- `backend/app/engine.py`
- `backend/tests/test_all_body_justify_request.py` (optional test)

Restart `start-gurucorp.bat`. Refresh Exact PDF, which needs a new Word-to-PDF conversion. Existing uploaded templates and resume data remain unchanged.

## Verification

`cd backend && python -m pytest -q tests/test_all_body_justify_request.py tests/test_default_justification.py tests/test_justify_page_safety.py` → 5 passed.

`cd frontend && node default-justify.test.mjs && node heading-style-shared.test.mjs` → passed.

The complete Next.js build/browser run was not verified here.
