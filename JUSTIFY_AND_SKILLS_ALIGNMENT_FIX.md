# GuruCorp — Justification and Skills Alignment Fix

## Fixed
- Exact PDF/DOCX: full justification remains the default for normal body text. Imported hard newlines in summary, achievements and company descriptions now wrap normally instead of stretching or pushing words toward the right margin.
- Exact PDF/DOCX: a small safe right inset keeps long skills and achievement lines inside the document's printable area.
- Experience and education date rows: paragraphs with right-aligned date tabs remain left aligned so dates stay in their designated right-edge position. Out-of-range right tab stops are clamped to the uploaded Word template's actual printable width.
- Legacy `{{ skills_text }}` documents: category lines become separate Word paragraphs rather than soft line breaks that can stretch under Justify.
- Skills & Expertise editor: drag grip, category name, colon and first keyword row share a consistent 36px top line. Keyword rows wrap naturally and the Add Keywords control remains beneath them.

## Apply patch
Copy `backend/app/engine.py` and `frontend/app/globals.css` from this ZIP into matching locations in your existing GuruCorp project. No new packages or Word template changes are needed.

Restart the FastAPI backend and Next.js frontend (or `start-gurucorp.bat`). Open a resume, refresh Exact PDF to generate a NEW PDF instead of seeing the cached document.

## Notes
- This fixes the document data and paragraph formatting. Exact PDF still runs via LibreOffice; Instant Preview is an HTML approximation.
- Body paragraphs remain Justify, but title/date lines containing right-aligned tabs must not be justified because they are layout rows rather than prose.
- If the PDF still looks unchanged, ensure your backend process has restarted and click Refresh on Exact PDF.

## Verification
- Regression checks: 4 targeted paragraph-layout tests passed.
- A Diego-style template was generated and converted to PDF. Text-right bounding box was inside the right-page safe zone (max ~571.7pt on a 612pt wide page).
- The full Next.js browser build and live interactive drag/drop workflow were not executed here.
