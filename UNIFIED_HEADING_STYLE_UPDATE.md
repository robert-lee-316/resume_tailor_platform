# GuruCorp — One Custom Heading Style

The Skills, Work Experience, and Education section headings now use one shared "Custom heading style" editor. It controls:

- Font family
- Size in points
- Alignment
- Text color
- Bold

There are no separate heading cards or individual heading tabs. Other settings for Skills content, Experience details, and Education content are unaffected.

## Internals

The frontend writes the same style to `skillsHeading`, `experienceHeading`, and `educationHeading`. These three keys are intentionally retained because the existing Word/PDF backend expects them. No backend code changes are needed. Existing saved heading settings are migrated: the first explicitly customized heading style is used as the shared style. If no heading was customized, the uploaded Word template's individual heading formatting remains in effect until the user edits the shared controls.

"Use Word template style" clears all three heading overrides together; "Reset styles" resets all style settings.

## Installation

Extract the patch into your GuruCorp project root, replacing:

```
frontend/app/page.tsx
frontend/app/globals.css
frontend/lib/styles.ts
```

Restart your Next.js frontend (`npm run dev` or the project launcher). You do not need to reupload existing Word templates or change the FastAPI backend.

## Verification

- Shared heading style synchronization, saved-state migration and collective reset tests passed (6 test groups).
- `page.tsx` and `styles.ts` passed TypeScript/TSX syntax compilation.
- The full Next.js build has **not** been run here because project npm dependencies are absent from the environment. Run `npm install` then `npm run build` on your PC to verify.
