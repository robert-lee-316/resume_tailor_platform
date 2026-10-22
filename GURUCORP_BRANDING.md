# GuruCorp branding update

This update changes the visible product name from **Folio** to **GuruCorp** in the header and browser tab, and adds `start-gurucorp.bat`. No resume content, backend engine, or existing Word template is changed.

## Apply to an existing installation

Copy `frontend/app/page.tsx`, `frontend/app/layout.tsx`, and `start-gurucorp.bat` into your project, preserving relative paths. Restart the Next.js dev server.

For one-command startup on Windows, double-click `start-gurucorp.bat` or run `cmd.exe /c start-gurucorp.bat` in Git Bash from the project root.

**Data migration:** The application intentionally retains the existing `folio-*` localStorage keys and IndexedDB database name to preserve resumes and templates already saved in your browser. Those internal identifiers are not visible branding. Do not delete browser storage.
