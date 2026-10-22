# Live font changes in Exact PDF mode

## What was happening
Exact PDF is a static generated file. The application used to keep the old PDF visible for 1.8 seconds plus document conversion time after a style change. This made the dropdown appear broken.

## Fix
- When form data or style settings differ from the currently rendered PDF, show the latest HTML draft immediately while Exact PDF is rebuilt.
- Clearly label the temporary draft as an approximation.
- Automatically switch back to the updated PDF once the render finishes.
- Shorten debounce from 1800 ms to 900 ms.
- No backend or Word-template changes are needed.

## Test
1. Select **Exact PDF** and wait for it to finish.
2. In Style settings choose **Skills**. Select **Georgia** or **Verdana** (the screenshot already had Times New Roman, so choosing that again will not cause a visible change).
3. The draft updates immediately and a progress chip says the Exact PDF is updating.
4. After rendering, the new PDF appears with the chosen font.
5. Change another style (for example size 14 pt); repeat.

Note: Exact PDF must still perform a full server-side document conversion; it cannot change one word inside an already-rendered PDF iframe. The interim HTML layout is only an approximation. If the font does not appear in the final PDF, verify it is installed on the machine running LibreOffice.
