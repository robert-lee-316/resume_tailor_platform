# GuruCorp — Style / Bullet Layout / Rich Text Update

## This patch is based on
`GuruCorp_Unified_Heading_Style_Full.zip` from the preceding GuruCorp release.

## Fixes

- Achievement inputs are real inline rich text editors, not plain `<input>` controls. Paste text copied from ChatGPT with bold spans and see bold text inside the editor immediately.
- Copying ChatGPT's Markdown text containing `**bold keywords**` works too.
- Ctrl+B formats selected text in the input. Ctrl+Z is left to the browser's editing history.
- Resume JSON continues storing only `**bold**` lightweight formatting markers, so the existing Word renderer can produce real bold font runs.
- Style Settings indicate which properties are actually overridden in Word/PDF. Checking the template-style checkbox and then switching back to custom explicitly applies the chosen font/size/alignment/color/bold properties.
- Long achievement paragraphs in Word are given a small right-side safety inset, and inherited justification is normalized to left alignment to reduce stretched words and crowding. An explicitly selected Justify alignment remains respected.

## Install patch on Windows

1. Back up your existing project or commit current changes.
2. Extract the PATCH zip at the project root, preserving directories.
3. Restart the backend and frontend (`start-gurucorp.bat` or separate development terminals).
4. Go to Style Settings → Experience → Achievements and choose a visibly different font (e.g., Arial) and size, then refresh Exact PDF.
5. In Work Experience → Achievements, paste a ChatGPT sentence with bold keywords. You should see bold *inside* the field.
6. If Exact PDF still looks unchanged, confirm backend restarted and open the PDF again. You may need to select a font actually installed on your PC.

## Files changed
- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/app/achievement-rich-input.tsx` (new)
- `frontend/lib/rich-text.ts` (new)
- `backend/app/engine.py`
- `backend/tests/test_bullet_wrap_and_styles.py` (new)

## Testing
- 53 backend tests passed.
- TypeScript/TSX syntax transpilation passed; the complete `next build` cannot run here because the npm package registry is not available.
- Browser-side Markdown/HTML conversion was tested in headless Chromium.
- Generated DOCX was converted to PDF with LibreOffice. Different heading, content and bullet font sizes were confirmed, as was bold keyword preservation; no text exceeded the page-right inset in the tested example.

## Limitations
- GuruCorp's **Instant** preview is still HTML, whereas **Exact PDF** is converted from the uploaded Word template. Page breaks will not be pixel-identical for complex templates.
- Pasted bold is preserved from HTML `<b>`, `<strong>` and standard `font-weight` styling or from Markdown `**text**`. Other copied font colors, lists, and links are intentionally discarded for a consistent resume style.
- Some uploaded templates may have unusual tables or fixed-position text boxes that require template-specific layout adjustments.
