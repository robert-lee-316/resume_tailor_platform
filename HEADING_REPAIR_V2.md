# GuruCorp — Heading repair v2

The uploaded Omar Word template already has centered, bold, 15 pt headings. Previous fixes could still fail if browser-stored style settings explicitly applied old alignment or if a style was enabled with an empty `changed` list.

## What changed

* **Center + bold + 15 pt**: In Style Settings, explicitly applies these properties to SKILLS, WORK EXPERIENCE, and EDUCATION. This works even when the actual uploaded DOCX has conflicting heading formatting.
* **Restore Word template headings**: Removes stored overrides for those headings only, without affecting other customized text or resume data.
* Backend ignores `enabled: true` entries with `changed: []`, preventing stale defaults from overwriting Word typography.

## Install

Copy `frontend/app/page.tsx`, `frontend/app/globals.css`, `frontend/lib/styles.ts`, and `backend/app/engine.py` from the patch into the same paths in your project. Restart both servers. Open **Style Settings → Section heading fixes** and choose **Center + bold + 15 pt**. Switch to **Exact PDF**, click Refresh, wait for generation, and download PDF to verify.

The instant HTML preview cannot reproduce all DOCX layout properties, but Exact PDF and exports use the same Word generation engine.

Important: If nothing changes, check the backend FastAPI terminal for a request to `POST /api/render` and verify that the server is actually using the updated `backend/app/engine.py`.
