# Company Description update

Each Work Experience position now includes a **Company description** text area after the From/To date pickers and before Achievements. Its content appears as a normal paragraph rather than a bullet in both Instant Preview and exported Word/PDF files.

The updated Word templates contain `{{ exp.description }}` between `{{ exp.company }}` and the achievements loop. **Upload the updated template again** in the Template tab; a previously uploaded/locally saved template does not automatically change when project files are replaced. You can alternatively insert `{{ exp.description }}` as its own normal Word paragraph in a custom template.

Existing saved resumes/JSON backups are supported: missing `description` becomes an empty string. Descriptions are optional; blank ones do not leave an extra paragraph in the generated Word document.

Update the files in the patch zip, restart frontend/backend, and upload the new Word template. No new dependencies are required.
