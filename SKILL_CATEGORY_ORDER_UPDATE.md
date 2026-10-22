# GuruCorp — Reorder Skills & Expertise categories

## What changed

In **Skills & Expertise**, use the six-dot grip on the left side of a category to drag it to another position. Alternatively, use the Up/Down arrow buttons next to that category (keyboard and touch friendly). You are moving **the category and all its skills together**, not individual skills.

The visual list, local auto-saved resume JSON, Instant Preview, Exact PDF, and exported DOCX all use the same `skill_categories` array order. The legacy `{{ skills_text }}` template field is rebuilt in the chosen order as well. No changes to your existing templates or backend are required.

## Apply update-only ZIP

Copy these files into your current GuruCorp project, preserving paths:

- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/lib/resume.ts`

Restart the frontend using `npm run dev`, then hard-refresh the browser if necessary. The FastAPI backend can remain running.

## Manual verification

1. Open Skills & Expertise.
2. Move `Cloud & DevOps` above `Languages` using the handle, then move it down with the arrow button.
3. Confirm each category retains its own skills, and the output-order preview changes.
4. Check Instant Preview, then generate a fresh Exact PDF and DOCX. Both should have the same order.
5. Refresh the webpage; the chosen order should persist.

## Testing in this deliverable

- All 53 pre-existing backend tests passed.
- 6 targeted assertions passed for reorder, invalid moves, skill preservation, export ordering, and persisted category ordering.
- TypeScript and TSX syntax passed transpilation checks.
- A complete Next.js production build was **not** verified because npm dependencies were unavailable in this environment.
