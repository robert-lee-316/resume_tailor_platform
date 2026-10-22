# LinkedIn field update

This patch adds a **LinkedIn profile** input in Personal details. The field is saved to browser local storage and JSON exports, appears in Instant Preview, and is sent to the backend as `linkedin`. Existing resume data without the field still loads (as an empty string).

The Word renderer now recognizes `{{ linkedin }}`. Updated bundled Word templates display it in the contact line. **Re-upload the updated Word template** to see LinkedIn in Exact PDF; old templates lacking the placeholder will not display it.

If customizing another template, add `{{ linkedin }}` to the same Word paragraph as `{{ email }}` and `{{ phone }}`. Keep the placeholder in one formatting run.

Optional: the prior-resume importer recognizes standard `linkedin.com/in/...` URLs if present in header contact details.

Restart both frontend and backend after applying the patch.
