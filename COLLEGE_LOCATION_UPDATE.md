# College / University Location update

## What changed
- Education editor now has a separate **College / University Location** field (e.g., `Albany, NY`).
- Each education item stores `location` in the browser's saved data and JSON import/export.
- Older saved JSON resumes without `education[].location` still load (default empty string).
- Instant Preview displays the location after the institution and degree, above the date.
- Exact PDF / Word output receives `education[].location` from `toRenderPayload()` and renders it through `{{ ed.location }}`.
- If the location is empty, its dedicated Word paragraph is omitted rather than printing a blank line.
- The uploaded Diego template was cleaned to keep every supported placeholder in a single Word run. **This fixes split placeholder validation errors.**
- The bundled sample template is now the corrected Diego-style version.

## Install as a patch
Copy the contents of the patch ZIP into your existing project. The patch includes:
- `frontend/app/page.tsx`
- `frontend/lib/resume.ts`
- `frontend/public/templates/sample_template.docx`
- `backend/app/engine.py`
- `backend/app/importer.py`
- `backend/tests/test_college_location.py`
- `examples/Diego_Style_College_Location_Template.docx`

Restart frontend and backend after copying. In the app, upload the corrected Word template because previously uploaded templates are not replaced automatically.

## Template syntax
Inside the education loop:

```text
{%p for ed in education %}
{{ ed.institution }} — {{ ed.degree }}       {{ ed.dates }}
{{ ed.location }}
{%p endfor %}
```

The `{{ ed.location }}` paragraph contains **no list/bullet formatting**.
