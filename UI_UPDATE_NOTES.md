# UI update — Reorder Work Experience achievements

This update builds on the previous calendar date picker release.

## Changes
- Each achievement has a drag handle (six-dot grip) for drag-and-drop sorting on desktop.
- Each achievement also has **Move up** and **Move down** buttons. These work with keyboard, touch, and mouse.
- The first bullet's **Move up** button and the last bullet's **Move down** button are disabled.
- All entered bullet text is preserved while reordering.
- The resume JSON and Word/PDF exports use the new bullet order immediately.
- No change to Word placeholders, backend, or project dependencies.
- Existing **From** and **To** calendar pickers and **Add bullet** behavior remain intact.

## Apply to an existing Windows project
Use the *patch* ZIP if you already have Folio Resume Builder installed. Copy these files into your project, preserving the relative paths:

- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/lib/resume.ts`

Then restart the frontend (Git Bash):

```bash
cd ~/Documents/work/folio-resume-builder-windows-ready/frontend
npm run dev
```

You do not need to reinstall Node or Python packages for this update.

## Quick check
1. Open Work Experience and add at least three achievements.
2. Click the **up arrow** on the third bullet; it should become second.
3. Click the **down arrow** on the first bullet; it should become second.
4. Drag the grip icon of a bullet over another bullet and release.
5. Preview and export. The generated document should follow the visible order.

## Verification
TypeScript/JSX syntax and a direct unit test of reordering plus export-payload order have passed.
A full Next.js production build was not performed in this environment.
