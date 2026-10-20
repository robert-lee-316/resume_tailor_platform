import json
from pathlib import Path
from docx import Document
from app.engine import render_docx, inspect_docx

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / 'examples' / 'Diego_Style_College_Location_Template.docx'

def test_uploaded_template_is_valid_and_supports_college_location():
    inspection = inspect_docx(TEMPLATE)
    assert 'ed.location' in inspection['fields']
    assert 'education' in inspection['loops']

def test_college_location_renders_and_is_not_a_bullet(tmp_path):
    context = json.loads((ROOT / 'examples' / 'sample_resume.json').read_text())
    output = tmp_path / 'education.docx'
    render_docx(TEMPLATE, output, context)
    doc = Document(output)
    assert any(p.text.strip() == 'Albany, NY' for p in doc.paragraphs)
    location = next(p for p in doc.paragraphs if p.text.strip() == 'Albany, NY')
    assert location._p.pPr is None or location._p.pPr.numPr is None
    assert not any('{{' in p.text or '{%p' in p.text for p in doc.paragraphs)

def test_missing_school_location_does_not_leave_blank_line(tmp_path):
    context = json.loads((ROOT / 'examples' / 'sample_resume.json').read_text())
    for edu in context['education']:
        edu.pop('location', None)
    output = tmp_path / 'no-location.docx'
    render_docx(TEMPLATE, output, context)
    assert not any(p.text.strip() == '{{ ed.location }}' for p in Document(output).paragraphs)
