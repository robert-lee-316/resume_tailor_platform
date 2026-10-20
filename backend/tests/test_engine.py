import json
from pathlib import Path
import pytest
from docx import Document
from app.engine import render_docx, TemplateError

EXAMPLES = Path(__file__).resolve().parents[2] / 'examples'

def test_sample_render(tmp_path):
    context = json.loads((EXAMPLES / 'sample_resume.json').read_text())
    out = tmp_path / 'resume.docx'
    render_docx(EXAMPLES / 'sample_template.docx', out, context)
    text = '\n'.join(p.text for p in Document(out).paragraphs)
    assert 'Alex Morgan' in text
    assert 'Reduced response time by 35%' in text
    assert 'State University' in text
    assert '{%' not in text and '{{' not in text

def test_missing_value_is_rejected(tmp_path):
    with pytest.raises(TemplateError, match='Missing field'):
        render_docx(EXAMPLES / 'sample_template.docx', tmp_path / 'bad.docx', {'full_name': 'A'})
