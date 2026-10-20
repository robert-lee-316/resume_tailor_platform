"""Create a reusable, validated placeholder DOCX from a previous resume.

For an already-valid GuruCorp template the original bytes are returned unchanged.
For a completed resume (DOCX or selectable-text PDF), generate a clean Word
layout with the same fields/loops understood by our strict renderer. This is a
best-effort template reconstruction, not a pixel-perfect source-document clone.
"""
from __future__ import annotations

import re
from pathlib import Path
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.shared import Inches, Pt, RGBColor

from .engine import inspect_docx, TemplateError, FIELD
from .importer import import_resume


def _font_from_source(source: Path) -> str:
    if source.suffix.lower() != '.docx':
        return 'Times New Roman'
    try:
        doc = Document(str(source))
        for paragraph in doc.paragraphs:
            if paragraph.text.strip() and paragraph.runs:
                for run in paragraph.runs:
                    if run.font.name:
                        return run.font.name
    except Exception:
        pass
    return 'Times New Roman'


def _paragraph(doc: Document, text: str = '', *, font: str, size: float = 10,
               bold: bool = False, alignment=None, space_after: float = 2,
               bullet: bool = False):
    p = doc.add_paragraph(style='List Bullet' if bullet else None)
    p.paragraph_format.space_after = Pt(space_after)
    if alignment is not None:
        p.alignment = alignment
    run = p.add_run(text)
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    return p


def _section(doc: Document, heading: str, *, font: str):
    paragraph = _paragraph(doc, heading, font=font, bold=True, size=10.5, space_after=4)
    paragraph.paragraph_format.space_before = Pt(7)
    # Real Word bottom rule, so this works in DOCX and in PDF conversion.
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    ppr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    for name, value in [('val', 'single'), ('sz', '9'), ('color', '15233E'), ('space', '2')]:
        bottom.set(qn('w:' + name), value)
    borders.append(bottom)
    ppr.append(borders)


def _right_tab(p):
    # A single right-aligned tab stop is reliable across Word/LibreOffice.
    p.paragraph_format.tab_stops.add_tab_stop(Inches(6.9), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.SPACES)


def _repair_split_fields(source: Path, target: Path) -> bool:
    """Join split placeholders within Word runs without replacing the layout.

    Google Docs exports often split a token like {{ linkedin }} across runs.
    Reattach it to the first XML text node; leave other text/runs untouched.
    """
    from docx.oxml.ns import qn
    doc = Document(str(source))
    changed = False
    for paragraph in doc.paragraphs:
        nodes = list(paragraph._p.iter(qn('w:t')))
        if len(nodes) < 2:
            continue
        full = ''.join(node.text or '' for node in nodes)
        if '{{' not in full:
            continue
        # Right-to-left offsets remain stable for previous tokens.
        for match in reversed(list(FIELD.finditer(full))):
            start, end = match.span()
            locations = []
            offset = 0
            for index, node in enumerate(nodes):
                length = len(node.text or '')
                locations.append((offset, offset + length, index))
                offset += length
            first = next((idx for a, b, idx in locations if a <= start < b), None)
            last = next((idx for a, b, idx in locations if a < end <= b), None)
            if first is None or last is None or first == last:
                continue
            first_start = locations[first][0]
            last_start = locations[last][0]
            nodes[first].text = (nodes[first].text or '')[:start - first_start] + match.group(0)
            for i in range(first + 1, last):
                nodes[i].text = ''
            nodes[last].text = (nodes[last].text or '')[end - last_start:]
            changed = True
    if changed:
        doc.save(str(target))
    return changed


def generate_template_from_resume(source: Path, target: Path) -> str:
    """Return mode 'existing' or 'generated'. Target is always validated DOCX."""
    if source.suffix.lower() == '.docx':
        try:
            inspect_docx(source)
        except TemplateError as exc:
            # Google Docs may split otherwise-valid placeholders across runs.
            # Repair the XML in-place in a *new* output, keeping Word design.
            try:
                repaired = _repair_split_fields(source, target)
                if repaired:
                    inspect_docx(target)
                    return 'repaired'
            except TemplateError:
                pass
            # A document with placeholders is *not* a filled previous resume.
            # Don't replace an invalid template with a fabricated layout.
            doc = Document(str(source))
            source_text = '\n'.join(p.text for p in doc.paragraphs)
            if '{{' in source_text or '{%p' in source_text:
                raise TemplateError('This file appears to be a placeholder template, but it is invalid: ' + str(exc)) from exc
        else:
            target.write_bytes(source.read_bytes())
            return 'existing'

    # Verify that this is a meaningful text-based resume before generating.
    parsed = import_resume(source)
    resume = parsed['resume']
    font = _font_from_source(source)
    doc = Document()
    if source.suffix.lower() == '.docx':
        try:
            src_section = Document(str(source)).sections[0]
            dst_section = doc.sections[0]
            for name in ('page_width', 'page_height', 'top_margin', 'bottom_margin', 'left_margin', 'right_margin'):
                setattr(dst_section, name, getattr(src_section, name))
        except Exception:
            pass
    else:
        doc.sections[0].left_margin = Inches(.75)
        doc.sections[0].right_margin = Inches(.75)
        doc.sections[0].top_margin = Inches(.7)
        doc.sections[0].bottom_margin = Inches(.7)

    _paragraph(doc, '{{ full_name }}', font=font, size=17, bold=True,
               alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
    _paragraph(doc, '{{ job_title }}', font=font, size=11, bold=True,
               alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)
    _paragraph(doc, '{{ location }} | {{ email }} | {{ phone }} | {{ linkedin }}',
               font=font, size=9, alignment=WD_ALIGN_PARAGRAPH.CENTER, space_after=9)

    _section(doc, 'SUMMARY', font=font)
    _paragraph(doc, '{{ summary }}', font=font, space_after=5)

    _section(doc, 'TECHNICAL SKILLS', font=font)
    _paragraph(doc, '{%p for category in skill_categories %}', font=font, space_after=0)
    skill = doc.add_paragraph(style='List Bullet')
    skill.paragraph_format.space_after = Pt(0)
    run = skill.add_run('{{ category.name }}:')
    run.bold = True
    run.font.name = font
    run.font.size = Pt(10)
    run = skill.add_run(' {{ category.skills_text }}')
    run.font.name = font
    run.font.size = Pt(10)
    _paragraph(doc, '{%p endfor %}', font=font, space_after=0)

    _section(doc, 'WORK EXPERIENCE', font=font)
    _paragraph(doc, '{%p for exp in experiences %}', font=font, space_after=0)
    exp = _paragraph(doc, '{{ exp.job_title }}\t{{ exp.dates }}', font=font, bold=True, size=10.25, space_after=0)
    _right_tab(exp)
    _paragraph(doc, '{{ exp.company }}', font=font, bold=True, space_after=1)
    _paragraph(doc, '{{ exp.description }}', font=font, space_after=1)
    _paragraph(doc, '{%p for bullet in exp.bullets %}', font=font, space_after=0)
    _paragraph(doc, '{{ bullet.text }}', font=font, bullet=True, space_after=1)
    _paragraph(doc, '{%p endfor %}', font=font, space_after=0)
    _paragraph(doc, '{%p endfor %}', font=font, space_after=0)

    _section(doc, 'EDUCATION', font=font)
    _paragraph(doc, '{%p for ed in education %}', font=font, space_after=0)
    ed = _paragraph(doc, '{{ ed.institution }} — {{ ed.degree }}\t{{ ed.dates }}',
                    font=font, size=10, bold=True, space_after=0)
    _right_tab(ed)
    _paragraph(doc, '{{ ed.location }}', font=font, size=9.5, space_after=1)
    _paragraph(doc, '{%p endfor %}', font=font, space_after=0)

    doc.save(str(target))
    inspection = inspect_docx(target)
    if not inspection['valid']:
        raise TemplateError('Generated template did not pass validation')
    return 'generated'
