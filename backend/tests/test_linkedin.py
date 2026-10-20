import json
from pathlib import Path
from docx import Document
from app.engine import render_docx, inspect_docx
from app.importer import ResumeLine, parse_lines

EXAMPLES = Path(__file__).resolve().parents[2] / "examples"

def test_linkedin_detected_and_rendered(tmp_path):
    template = EXAMPLES / "sample_template.docx"
    info = inspect_docx(template)
    assert "linkedin" in info["fields"]
    context = json.loads((EXAMPLES / "sample_resume.json").read_text())
    out = tmp_path / "resume.docx"
    render_docx(template, out, context)
    text = " ".join(p.text for p in Document(out).paragraphs)
    assert "linkedin.com/in/alexmorgan" in text
    assert "{{ linkedin }}" not in text

def test_import_linkedin_from_contact_line():
    data = parse_lines([
        ResumeLine("Jane Doe"),
        ResumeLine("Software Engineer"),
        ResumeLine("Austin, TX | jane@example.com | linkedin.com/in/jane-doe"),
        ResumeLine("SUMMARY"),
        ResumeLine("Engineer with Python experience."),
    ])
    assert data["resume"]["linkedin"] == "linkedin.com/in/jane-doe"
