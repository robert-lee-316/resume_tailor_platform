# GuruCorp — Default Justify Alignment Update

## Behavior

Default **Justify** for paragraphs in Professional Summary, Skill Categories, Work Experience details, Company Description, Achievement Bullets, Education, and other body text.

The name, professional role, personal contact information, and all section headings retain their independent alignment and are **not justified automatically**. Uploaded Word templates continue to supply font, bold, and spacing unless individually customized.

The **Text alignment** control remains editable, so you can deliberately choose Left, Center, or Right for any paragraph area.

## Changes

- `frontend/lib/styles.ts` — Default paragraph text alignment is Justify; the default is an actual Word/PDF override, not just a form value. Previously saved untouched left-alignment settings are migrated to Justify; deliberate alignment edits are kept.
- `frontend/app/page.tsx` — Summary heading stays separate from Summary paragraph justification in Instant Preview.
- `backend/app/engine.py` — Summary heading and other section headings no longer accidentally inherit Skills/Summary body alignment.
- `frontend/default-justify.test.mjs` and `backend/tests/test_default_justification.py` — Regression tests.

## Install

Extract the patch into your existing GuruCorp project, replacing files with the same relative paths. Restart frontend and backend using `start-gurucorp.bat`. Open Style Settings to confirm the body fields now show `Justify`, and generate a new Exact PDF.

No new dependencies and no Word template reupload are needed.

## Notes

- Long bullet paragraphs with full justification may exhibit larger gaps between words, particularly with narrow Word margins. Use Style Settings > Experience > Achievements > Text alignment = Left to override that behavior for a particular resume.
- The user's explicit alignment choices take priority over defaults.
