# Skills & Expertise categories update

The Skills editor now matches the provided sketch: each category has a name, a colon separator, editable skill input boxes, a + Add skill button, and a delete-category button. Use the + Add category button underneath to create more rows. Enter within an individual skill field adds another skill.

## Backwards compatibility

- Existing localStorage resume data, JSON backup files, and imported DOCX/PDF resumes are migrated from `skills_text` to category rows. For example, `Languages: Python, TypeScript` becomes a Languages category with two editable skills. Unlabeled skills become a General category.
- The old `{{ skills_text }}` Word placeholder still works. It now receives one line per category, with proper Word line breaks. Existing templates do not need to be changed.
- Optional advanced templates can repeat categories using these dedicated Word paragraphs:

```
{%p for category in skill_categories %}
{{ category.name }}: {{ category.skills_text }}
{%p endfor %}
```

The rendering engine does not support loops inside Word tables. Do not add category loops to text boxes or headers.

## Installation

Unzip the patch over your existing project, preserving folder structure, then restart backend and frontend. Because the Word rendering engine was updated to preserve category line breaks, both backend and frontend changes are needed. No new dependencies.
