# GuruCorp Brand Integration

This update uses the supplied GuruCorp brand sheet as the source for cropped raster logos. It does not recreate or redraw the logo.

## Application assets
- `frontend/public/brand/gurucorp-primary.png` — website header logo and Bright Ideas tagline
- `frontend/public/brand/gurucorp-mark.png` — gold G emblem in the side navigation
- `frontend/public/brand/gurucorp-document.png` — square/stacked document logo, available for future branded reports and letterheads
- `frontend/app/icon.png` — browser favicon

## Theme
- Navy: `#0B1934`
- Deep navy: `#0A1732`
- Main gold: `#B77A20`
- Gold highlight: `#D7A044`
- Warm tint: `#FCF6EB`

## Scope
The patch replaces the old purple brand accents with gold/navy. The source Word templates, generated resumes, backend, user resume values, and localStorage keys remain untouched. A logo is **not** automatically added to applicant resumes; the document logo is an optional future branding asset.

## Install the patch
Copy the `frontend` directory from the patch over your existing project's `frontend` directory, preserving folder structure. Then restart Next.js with `npm run dev`. You should see the new top logo, sidebar monogram, gold buttons, and favicon.

The image is raster-based and cropped from a multi-panel branding mockup. A higher-resolution isolated SVG/PNG master logo is preferable for production.
