from pathlib import Path
import json
from fastapi.testclient import TestClient
from app.main import app

ROOT = Path(__file__).resolve().parents[2]
client = TestClient(app)


def test_template_inspection_api():
    with (ROOT / 'examples' / 'sample_template.docx').open('rb') as source:
        response = client.post('/api/inspect-template', files={
            'template': ('sample_template.docx', source, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        })
    assert response.status_code == 200, response.text
    assert response.json()['valid'] is True
    assert 'exp.bullets' in response.json()['loops']


def test_generate_docx_via_api():
    data = (ROOT / 'examples' / 'sample_resume.json').read_text()
    with (ROOT / 'examples' / 'sample_template.docx').open('rb') as source:
        response = client.post('/api/render', data={'resume_json': data, 'format': 'docx'}, files={
            'template': ('sample_template.docx', source, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        })
    assert response.status_code == 200, response.text
    assert response.content.startswith(b'PK')
    from io import BytesIO
    from docx import Document
    doc = Document(BytesIO(response.content))
    body = '\n'.join(p.text for p in doc.paragraphs)
    assert 'Alex Morgan' in body
    assert 'Acme Technologies' in body
    assert '{{' not in body


def test_generate_pdf_via_api():
    data = (ROOT / 'examples' / 'sample_resume.json').read_text()
    with (ROOT / 'examples' / 'sample_template.docx').open('rb') as source:
        response = client.post('/api/render', data={'resume_json': data, 'format': 'pdf'}, files={
            'template': ('sample_template.docx', source, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        })
    assert response.status_code == 200, response.text
    assert response.content.startswith(b'%PDF')


def test_reject_bad_template_via_api():
    response = client.post('/api/inspect-template', files={'template': ('bad.docx', b'bad!', 'application/octet-stream')})
    assert response.status_code == 400
