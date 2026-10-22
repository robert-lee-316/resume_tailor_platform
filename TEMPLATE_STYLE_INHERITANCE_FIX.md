# GuruCorp — Word template heading formatting fix

## Problem
Previous versions sent **default** Style Settings values to the Word document renderer even when you never edited them. The backend overwrote the uploaded Word template's font size, bold formatting, and paragraph alignment. Headings originally centered and bold at 15 pt were rendered as small, left-aligned text.

## New behavior
- **Word template formatting is the default.** Skills, Work Experience, and Education headings keep their Word font size, bold status, alignment, and color in Exact PDF and downloads.
- Each Style Settings subsection has a **Keep formatting from the uploaded Word template** checkbox, enabled by default.
- Editing a style property makes it an explicit override. **Only the changed property** is applied in Word/PDF; other template formatting remains intact.
- Turn the checkbox back on for a section to discard its custom overrides.
- Older saved styling is migrated: unchanged historical defaults are treated as inherited, while genuinely customized values remain overrides.
- The `Reset styles` button resets all settings to template-inherited mode.

## Apply update
Replace these files in your existing project:

```
frontend/app/page.tsx
frontend/lib/styles.ts
backend/app/engine.py
```

Restart **both** Next.js and FastAPI. Navigate to **Style Settings → Skills → Skills · heading**. Make sure **Keep formatting from the uploaded Word template** is checked. Repeat for **Experience · heading** and **Education · heading**. Open Exact PDF and refresh.

## Expected headings
If your DOCX contains centered, bold, 15 pt headings, Exact PDF will preserve these properties. **Note:** Word uses points (pt), not CSS pixels (px). 15px is approximately 11.25pt.

## Compatibility
The updated backend still supports old payloads that supply a style without `enabled` or `changed` metadata. No Word template changes or new packages required.

## Testing
49 backend tests passed, including new tests verifying untouched template styles, size-only overrides, and explicit heading overrides. A sample Word document with centered 15 pt headings was converted to PDF and visually inspected. Frontend TypeScript/JSX syntax parsing passed; full Next.js installation/build was not run here.
