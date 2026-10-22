# GuruCorp — Editor layout isolation fix

## Problem
A recent CSS regression gave the Skills keyword editor `align-self: start` inside a grid. This made the grid child shrink-to-fit, leaving it extremely narrow, so skill labels broke into vertical single-character columns. The Word/PDF Justify setting must not be used for website form controls.

## Changes
- Restrict the correction to `.editor-panel` and the Skills category editor.
- Make the keyword editor fill its assigned grid track using `justify-self: stretch`, `align-self: stretch`, and `width: 100%`.
- Keep chips compact and unbroken (`white-space: nowrap`, `overflow-wrap: normal`) with a safe ellipsis for unusually long keywords; the full skill is available as a title tooltip.
- Keep rows content-height instead of growing to fill available vertical space.
- Use a container query to place keywords on the next row when the editor panel gets narrow.
- Keep handles and category borders neutral gray, with no gold-highlighted borders.
- Keep the Justify defaults in `frontend/lib/styles.ts` and the DOCX/PDF backend unchanged. Body text remains justified **in the resume**; the editor UI stays left-aligned.

## Installation
Copy `frontend/app/globals.css` and `frontend/app/page.tsx` into the corresponding locations in your current project, preserving your other project files. Restart Next.js, and force-reload the browser once with Ctrl+Shift+R.

## Validation
- Verified with Chromium layout inspection at 627 px and 357 px category row widths.
- Skill chips stayed normal widths (e.g., `JavaScript` 103 px) and were left-aligned with `white-space: nowrap`.
- Tested with the existing CSS and actual skill-editor class structure. A full Next.js build was not completed because npm package installation timed out in this environment.
