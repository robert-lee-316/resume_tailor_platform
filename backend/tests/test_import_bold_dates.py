from io import BytesIO
from pathlib import Path
from docx import Document
from fastapi.testclient import TestClient
from app.main import app
from app.engine import render_docx, inspect_docx
from app.importer import parse_lines, ResumeLine, import_resume

client = TestClient(app)


def test_bold_markup_preserves_prefix_and_run_style(tmp_path):
    template = tmp_path / 'template.docx'
    output = tmp_path / 'output.docx'
    doc = Document()
    p = doc.add_paragraph()
    p.add_run('• {{ summary }}')
    doc.save(template)
    assert inspect_docx(template)['valid']
    render_docx(template, output, {'summary': 'Built **secure APIs** with **Python** and AWS.'})
    p = Document(output).paragraphs[0]
    assert p.text == '• Built secure APIs with Python and AWS.'
    assert 'secure APIs' in ''.join(r.text for r in p.runs if r.bold)
    assert 'Python' in ''.join(r.text for r in p.runs if r.bold)
    assert not any('**' in r.text for r in p.runs)
    assert not p.runs[0].bold


def test_import_resume_word_api(tmp_path):
    doc = Document()
    for txt in ['Jane Smith', 'Senior Backend Engineer', 'Denver, CO | jane@example.com | +1 303 555 0101',
                'SUMMARY', 'Experienced software engineer developing APIs.', 'TECHNICAL SKILLS', 'Python, FastAPI',
                'WORK EXPERIENCE', 'Senior Engineer   Jun 2022 – Present', 'Acme Corp | Remote']:
        doc.add_paragraph(txt)
    doc.add_paragraph('Built resilient APIs.', style='List Bullet')
    for txt in ['EDUCATION', 'State University – Bachelor of Science', 'Denver, CO   Aug 2012 – May 2016']:
        doc.add_paragraph(txt)
    target = tmp_path / 'previous.docx'
    doc.save(target)
    with target.open('rb') as stream:
        response = client.post('/api/import-resume', files={'file': ('previous.docx', stream, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')})
    assert response.status_code == 200, response.text
    result = response.json()['resume']
    assert result['full_name'] == 'Jane Smith'
    assert result['email'] == 'jane@example.com'
    assert result['experiences'][0]['start_date'] == '2022-06'
    assert result['experiences'][0]['is_current']
    assert result['experiences'][0]['bullets'][0]['text'] == 'Built resilient APIs.'
    assert result['education'][0]['institution'] == 'State University'
    assert result['education'][0]['start_date'] == '2012-08'


def test_import_pdf_selectable_text(tmp_path):
    from reportlab.pdfgen import canvas
    target = tmp_path / 'previous.pdf'
    pdf = canvas.Canvas(str(target))
    for y, line in enumerate(['Jane Smith', 'Senior Engineer', 'SUMMARY', 'Built APIs in Python.',
                              'SKILLS', 'Python, AWS', 'WORK EXPERIENCE', 'Senior Engineer Jun 2022 – Present',
                              'Acme Corp', 'EDUCATION', 'State University – Bachelor of Science',
                              'Aug 2010 – May 2014']):
        # reportlab default Helvetica cannot encode en dash, but file is still a text PDF.
        pdf.drawString(55, 760 - y * 27, line.replace('–', '-'))
    pdf.save()
    result = import_resume(target)
    assert result['resume']['full_name'] == 'Jane Smith'
    assert result['resume']['skills_text'] == 'Python, AWS'


def test_import_rejects_nonresume():
    response = client.post('/api/import-resume', files={'file': ('bad.txt', b'hello', 'text/plain')})
    assert response.status_code == 400


def test_date_import_year_only_not_assumed_to_be_january():
    result = parse_lines([ResumeLine(v) for v in ['Test Person', 'Engineer', 'EDUCATION',
                                                   'State University – Bachelor of Science', '2015 - 2019']])
    edu = result['resume']['education'][0]
    assert edu['dates'] == '2015 - 2019'
    assert edu['start_date'] == '' and edu['end_date'] == ''
