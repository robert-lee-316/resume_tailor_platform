from pathlib import Path
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from app.engine import render_docx

TEMPLATE = Path(__file__).parents[2] / 'examples' / 'sample_template.docx'


def test_long_bullet_kept_within_right_margin(tmp_path):
    context = {
        'full_name': 'Test Resume', 'job_title':'Engineer', 'summary':'Summary',
        'location': '', 'email': '', 'phone': '', 'linkedin':'',
        'skills_text':'', 'skill_categories':[], 'education': [],
        'experiences': [{'job_title':'Engineer','company':'Test','dates':'2022-present',
                         'description':'','bullets':[{'text':'Designed **reliable services** and storage services for long-running high-volume operations.'}]}],
        '_styles': {'experienceBullets': {'enabled':True, 'changed':['font','size','align'],
                                         'font':'Arial', 'size':13, 'align':'left'}}
    }
    target=tmp_path/'output.docx'
    render_docx(TEMPLATE,target,context)
    paragraphs=Document(target).paragraphs
    bullet=next(p for p in paragraphs if 'Designed' in p.text)
    assert bullet.paragraph_format.right_indent.pt >= 8
    assert bullet.alignment==WD_ALIGN_PARAGRAPH.LEFT
    assert all(run.font.size.pt==13 for run in bullet.runs if run.text)
    assert any(run.bold and 'reliable services' in run.text for run in bullet.runs)
