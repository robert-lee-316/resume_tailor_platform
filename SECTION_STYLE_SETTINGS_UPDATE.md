# GuruCorp — Independent Resume Section Styles

## New controls

In **Style Settings**, independent editing panels are grouped by:

- **Skills:** heading, category/body text
- **Work experience:** heading, job/company/dates, company description, achievement bullets
- **Education:** heading, degree/school/location/dates
- **Profile:** name, title, contact details, summary
- **Other content:** fallback for unclassified static paragraphs

Each panel has font family, point size, alignment, color, bold toggle, optional line spacing and optional space after the paragraph. Skills category and achievement bullet styles additionally expose optional left indent.

Choose **Template default** (empty numeric input) to avoid overriding the uploaded Word template's spacing or indent. Styles apply to **Instant Preview** immediately; Exact PDF is regenerated with the same settings by the Python backend.

## Migration and compatibility

Older saved resume style objects keep working. The new heading styles fall back to the corresponding old section styles, and the new description/bullet styles fall back to the old `body` style when those newer keys do not exist.

No template placeholder changes are needed. Uploaded templates remain selected and unchanged. Templates that contain both job/company information and dates in the same Word paragraph get one shared style for that paragraph.

## Install

Copy the patch files over the matching relative paths in your existing GuruCorp project and restart **both** Next.js and FastAPI. Browser saved resumes and templates are not intentionally reset.

## Tested

- 46 backend tests pass, including targeted independent style and legacy style tests.
- Frontend TSX and TS syntax checks pass; style parser/migration checks pass.
- Generated DOCX was converted to PDF with LibreOffice and visually inspected using the Omar template.
- A complete Next.js build could not run because npm registry access was unavailable in this environment. Run `npm install && npm run build` on your PC to verify.

Note: Instant Preview is an HTML approximation; Exact PDF remains authoritative for final pagination and Word template details.
