# GuruCorp — Skill keywords as removable tags

## What changed
- Each existing skill is displayed as a compact keyword chip with its own **×** remove button; there are no individual text fields for saved skills.
- Each skill category has one **+ Add keyword** field. Type a skill and press **Enter** or click **+** to add it.
- Paste comma-, semicolon-, or newline-separated skills to add multiple tags at once. Duplicate keywords within a category are ignored case-insensitively.
- Backspace in an empty add field removes the last skill tag.
- Existing category drag/drop and arrow reordering is preserved.
- Saved resume JSON, imported resume data, Instant Preview, Exact PDF, Word export, and both Word placeholder styles (`skills_text` and `skill_categories`) continue to use the same `string[]` skills data structure.

## Install patch
Copy these files into the same locations in your existing project:

```
frontend/app/page.tsx
frontend/app/globals.css
```

Restart your frontend using `npm run dev` or the existing GuruCorp launcher. No backend changes or new dependencies are required.

## Verification
- TSX transpilation/syntax check passed.
- 53 backend tests passed with the unchanged backend.
- Full Next.js build/browser runtime was **not** verified because npm dependencies could not be installed in this environment.
