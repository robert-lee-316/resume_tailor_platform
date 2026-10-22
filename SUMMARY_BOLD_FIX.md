# Professional Summary — Ctrl+B fix

The Summary textarea previously did not pass a keyboard handler, although the Work Experience achievement inputs did.

Changes in `frontend/app/page.tsx`:

- Add an optional `onKeyDown` to the `TextArea` component.
- Wire Ctrl+B (Windows/Linux) and Cmd+B (Mac) on the Summary textarea to the existing bold-selection function.
- Prevent the browser's default Ctrl+B behavior and keep the selected words highlighted after applying/removing `**` markup.
- Keep the toolbar Bold button available with its keyboard shortcut shown.

No backend, Word template, library, or dependency changes are required.

## Apply to an existing project
Copy `frontend/app/page.tsx` from the patch ZIP over the same file in your Folio project. Restart your Next.js dev server with `npm run dev`.

## How to use
Open Professional Summary, highlight words in the textarea, and press Ctrl+B or click **Bold selection**. The selected words get wrapped in `**` within the textarea, while the formatted preview and the generated DOCX/PDF display the text in bold. Press Ctrl+B again while the same words are selected to remove bold.
