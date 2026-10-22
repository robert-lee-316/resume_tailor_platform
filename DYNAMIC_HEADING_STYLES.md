# GuruCorp — Dynamic Section Heading Styles

This update removes the fixed "Center + bold + 15 pt" preset. Each of the three section headings now has its own editable typography controls:

- SKILLS
- WORK EXPERIENCE
- EDUCATION

For each heading you can independently change font family, font size (points), alignment (left/center/right/justify), color, and bold. The UI enables the override only for properties that you edit. You may use different formatting for all three headings.

**Use Word template style** clears only that section's overrides and restores the heading formatting defined by your uploaded DOCX. Reset styles resets all style settings. Existing localStorage saves continue to work because style keys were not renamed.

Custom changes appear immediately in Instant Preview. Exact PDF and Word downloads receive the same updated style payload; the exact conversion may take longer because LibreOffice regenerates the DOCX/PDF. Browser HTML Instant Preview is an approximation of the Word template; it cannot automatically detect every original font/heading property from the uploaded DOCX.

## Apply update-only patch

Extract the patch at the project root, overwriting:

```
frontend/app/page.tsx
frontend/app/globals.css
frontend/lib/styles.ts
```

Restart the frontend (`npm run dev`). No new dependencies or backend change are needed if you already installed the previous Heading Repair V2 update. In the application, select **Style settings → Section heading formatting**, edit the controls for any heading, then refresh **Exact PDF**. You don't need to reupload your Word template.

## Verification

- The project's 52 backend tests passed, including an additional test with three independently configured heading styles.
- `page.tsx` and `styles.ts` passed TypeScript JSX transpilation syntax validation.
- Full `npm run build` was not run because npm registry access was unavailable in the build environment. Please run it locally.
