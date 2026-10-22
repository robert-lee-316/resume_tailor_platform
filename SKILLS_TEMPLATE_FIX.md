# Skill category bullet fix

The old `{{ skills_text }}` produced one Word list item containing all categories, often with an extra bullet character.

## Updated Word template

Each tag is a **separate Word paragraph**:

```
TECHNICAL SKILLS
{%p for category in skill_categories %}
{{ category.name }}: {{ category.skills_text }}
{%p endfor %}
```

Apply Word's list/bullet formatting to ONLY the content paragraph (`{{ category.name }}: {{ category.skills_text }}`), and make just `{{ category.name }}` bold. The loop control paragraphs must NOT use bullets.

The frontend stores `skill_categories: [{id, name, skills: [...]}, ...]` and sends each category as `{name, skills_text: 'Python, JavaScript'}` to the Word renderer.

## How to apply

- Replace `frontend/lib/resume.ts`.
- For a new resume, upload `examples/Diego_Style_Category_Bullets_Template.docx`, or use the updated `frontend/public/templates/sample_template.docx`.
- **Re-upload** the template in your browser: previously uploaded Word templates are stored in the browser and won't change automatically.
- Restart `npm run dev`. The backend is unchanged.

This version produces a separate Word bullet per category, with no duplicated bullet symbols. Legacy custom templates using `{{ skills_text }}` still render as before until converted.
