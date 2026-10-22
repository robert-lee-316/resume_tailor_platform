# GuruCorp — Consistent Style Settings Controls

## Problem
The ordinary style settings used `.style-field-grid` and its custom input/select CSS, while the unified section heading card used `.heading-style-controls` without the corresponding CSS. This resulted in different browser-native controls, heights, padding, label positioning, and color swatches in the same screen.

## Implementation
- Added `frontend/components/common/StyleTypographyFields.tsx` as the single form UI for font family, size (pt), text alignment, and text color.
- Updated `frontend/components/sections/StylesSection.tsx` to reuse this component for both the active resume area and the shared Skills / Work Experience / Education heading settings.
- Applied one CSS rule set scoped to `.editor-panel .style-typography-grid` to avoid altering the resume document's typography or justification.
- Both sections keep their existing style state, callbacks, per-field overrides, and template inheritance controls. The shared heading style still updates all three headings.
- Native date, template, and resume-export styling remains unaffected.

## Installation
Copy all three paths from the patch archive into the existing project, keeping their subdirectories:

- `frontend/components/common/StyleTypographyFields.tsx` (new)
- `frontend/components/sections/StylesSection.tsx` (updated)
- `frontend/app/globals.css` (updated)

Restart the Next.js frontend and hard refresh Chrome or Edge with Ctrl+Shift+R. No backend or Word template updates needed.

## Verification
Run `cd frontend && node component-architecture.test.mjs && node heading-style-shared.test.mjs && node default-justify.test.mjs`.

A complete Next.js build needs package installation (`npm install`) on a machine with npm registry access.
