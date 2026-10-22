"""The four resume body sections all default to Justify, regardless of UI row layout."""
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from app.engine import render_docx


def test_justified_skills_and_soft_break_wrapping(tmp_path):
    src, out = tmp_path/'template.docx', tmp_path/'out.docx'
    d=Document()
    d.add_paragraph('TECHNICAL SKILLS').alignment=WD_ALIGN_PARAGRAPH.CENTER
    d.add_paragraph('{%p for category in skill_categories %}')
    d.add_paragraph('{{ category.name }}: {{ category.skills_text }}')
    d.add_paragraph('{%p endfor %}')
    d.save(src)
    render_docx(src, out, {'skill_categories': [
        {'name':'Backend', 'skills_text':'Python, Node.js,\n FastAPI, PostgreSQL'}],
        '_styles':{'skills': {'enabled':True, 'changed':['align'], 'align':'justify'}}})
    items=Document(out).paragraphs
    assert items[0].alignment == WD_ALIGN_PARAGRAPH.CENTER
    category=next(p for p in items if p.text.startswith('Backend:'))
    assert category.alignment == WD_ALIGN_PARAGRAPH.JUSTIFY
    assert category.text == 'Backend: Python, Node.js, FastAPI, PostgreSQL'
    assert not list(category._p.iter(qn('w:br')))


def test_summary_skills_work_and_education_are_justified(tmp_path):
    src, out=tmp_path/'template.docx',tmp_path/'out.docx'
    d=Document()
    for text in ('{{ summary }}','{{ skills_text }}','{%p for exp in experiences %}',
                 '{{ exp.description }}','{%p for bullet in exp.bullets %}',
                 '{{ bullet.text }}','{%p endfor %}','{%p endfor %}',
                 '{%p for ed in education %}','{{ ed.institution }} — {{ ed.degree }}','{%p endfor %}'):
        d.add_paragraph(text)
    d.save(src)
    keys=('summary','skills','experienceDescription','experienceBullets','education')
    render_docx(src,out,{'summary':'Text for the summary.', 'skills_text':'Backend: Python, FastAPI',
         'experiences':[{'description':'Long company description.', 'bullets':[{'text':'Developed systems.'}]}],
         'education':[{'institution':'State College','degree':'B.S.'}],
         '_styles':{k:{'enabled':True,'changed':['align'],'align':'justify'} for k in keys}})
    doc=Document(out)
    for txt in ('Text for the summary.','Backend: Python, FastAPI', 'Long company description.',
                'Developed systems.','State College — B.S.'):
        p=next(p for p in doc.paragraphs if p.text==txt)
        assert p.alignment == WD_ALIGN_PARAGRAPH.JUSTIFY, txt
