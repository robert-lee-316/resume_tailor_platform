"""Best-effort, local document text extractor for user-uploaded previous resumes.

No AI or external services. This importer intentionally does not claim to understand
arbitrary designs: return parsed fields + warnings so the user can review them.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from docx import Document

EMAIL = re.compile(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}")
LINKEDIN = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_%\-]+/?", re.I)
PHONE = re.compile(r"(?<!\w)(?:\+?\d[\d().\s-]{7,}\d)(?!\w)")
US_PHONE = re.compile(r"(?<!\w)(?:\+1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}(?!\w)")
MONTH = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
DATE_PART = rf"(?:{MONTH}\.?\s+\d{{4}}|\d{{4}})"
DATE_RANGE = re.compile(rf"({DATE_PART}\s*[-–—]\s*(?:{DATE_PART}|Present|Current|Now))\s*$", re.I)
DATE_MONTH = re.compile(rf"^({MONTH})\.?\s+(\d{{4}})$", re.I)
HEADINGS = {
    "SUMMARY": "summary", "PROFESSIONAL SUMMARY": "summary", "PROFILE": "summary",
    "ABOUT ME": "summary", "OBJECTIVE": "summary",
    "SKILLS": "skills", "TECHNICAL SKILLS": "skills", "CORE COMPETENCIES": "skills",
    "WORK EXPERIENCE": "experience", "PROFESSIONAL EXPERIENCE": "experience",
    "EXPERIENCE": "experience", "EMPLOYMENT HISTORY": "experience", "WORK HISTORY": "experience",
    "EDUCATION": "education", "EDUCATION & CERTIFICATIONS": "education",
    "PROJECTS": "other", "CERTIFICATIONS": "other", "REFERENCES": "other", "AWARDS": "other",
}
BULLET_PREFIX = re.compile(r"^\s*[-•●▪◦‣]\s*")


@dataclass
class ResumeLine:
    text: str
    bullet: bool = False


def clean(text: str) -> str:
    return re.sub(r"[ \t\xa0]+", " ", text).strip()


def date_to_iso(value: str) -> str:
    value = value.strip()
    m = DATE_MONTH.fullmatch(value)
    if m:
        month = m.group(1)[:3].lower()
        all_months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        return f"{m.group(2)}-{all_months.index(month) + 1:02d}"
    # Years without months are kept as original date text: don't invent January.
    return ""


def split_dates(text: str) -> tuple[str, str, bool]:
    parts = re.split(r"\s*[-–—]\s*", text, maxsplit=1)
    if len(parts) != 2:
        return "", "", bool(re.search(r"\b(?:present|current|now)\b", text, re.I))
    current = bool(re.fullmatch(r"present|current|now", parts[1].strip(), re.I))
    return date_to_iso(parts[0]), "" if current else date_to_iso(parts[1]), current


def from_docx(path: Path) -> list[ResumeLine]:
    document = Document(str(path))
    result: list[ResumeLine] = []
    for paragraph in document.paragraphs:
        txt = clean(paragraph.text)
        if not txt:
            continue
        is_bullet = paragraph.style.name.lower().startswith("list") or paragraph._p.pPr is not None and paragraph._p.pPr.numPr is not None
        # Preserve inline bold emphasis in imported achievements when Word runs make it explicit.
        # Heading detection continues using the plain text separately.
        if is_bullet and paragraph.runs:
            rich = "".join(f"**{run.text}**" if run.bold and run.text.strip() else run.text for run in paragraph.runs)
            rich = clean(rich)
            if rich:
                txt = rich
        result.append(ResumeLine(txt, is_bullet))
    # Word templates frequently use cells for education/skill content.
    if not result:
        for table in document.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        if clean(paragraph.text): result.append(ResumeLine(clean(paragraph.text)))
    return result


def from_pdf(path: Path) -> list[ResumeLine]:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported. Export an unlocked PDF or Word file.")
    if len(reader.pages) > 15:
        raise ValueError("Previous resume must contain 15 pages or fewer.")
    lines: list[ResumeLine] = []
    for page in reader.pages:
        for row in (page.extract_text() or "").splitlines():
            txt = clean(row)
            if txt:
                lines.append(ResumeLine(txt, bool(BULLET_PREFIX.match(txt))))
    return lines


def parse_lines(lines: list[ResumeLine]) -> dict:
    data: dict = {
        "full_name": "", "job_title": "", "email": "", "phone": "", "location": "", "linkedin": "",
        "summary": "", "skills_text": "", "experiences": [], "education": [],
    }
    warnings: list[str] = []
    first_heading = next((i for i, item in enumerate(lines) if item.text.strip().upper().rstrip(':') in HEADINGS), len(lines))
    head = [item.text for item in lines[:first_heading] if item.text.strip()]
    if head:
        data["full_name"] = head[0].strip()
    if len(head) > 1 and not EMAIL.search(head[1]) and not PHONE.search(head[1]):
        data["job_title"] = head[1].strip()
    contact = " | ".join(head[1:])
    email = EMAIL.search(contact)
    if email: data["email"] = email.group(0)
    # Prefer complete US numbers, including the opening parenthesis, before fallback.
    phone = US_PHONE.search(contact) or PHONE.search(contact)
    if phone: data["phone"] = clean(phone.group(0))
    linkedin = LINKEDIN.search(contact)
    if linkedin: data["linkedin"] = linkedin.group(0)
    for line in head[1:]:
        # Resume PDFs often separate contacts with a standalone slash instead of |.
        # Split only surrounded separators, not the /in/ path in LinkedIn URLs.
        parts = [clean(x) for x in re.split(r'\s+(?:/|\|)\s+', line) if clean(x)]
        for part in parts:
            if EMAIL.search(part) or PHONE.search(part) or LINKEDIN.search(part): continue
            if part == data["job_title"]: continue
            if ',' in part and len(part) < 90:
                data["location"] = part
                break
        if data["location"]: break

    # In many resumes the summary is directly below the contact line, with no
    # SUMMARY heading. Recover only meaningful text *after* the contact line.
    inferred_summary: list[str] = []
    if first_heading < len(lines) and HEADINGS.get(lines[first_heading].text.upper().rstrip(':')) in ("skills", "experience", "education"):
        contact_pos = next((i for i, line in enumerate(head) if EMAIL.search(line) or US_PHONE.search(line)), -1)
        if contact_pos >= 0:
            inferred_summary = [line for line in head[contact_pos + 1:]
                                if len(line.split()) >= 5 and not EMAIL.search(line)]

    section = ""
    summary: list[str] = inferred_summary[:]
    skills: list[str] = []
    exp: dict | None = None
    edu: dict | None = None
    extra_education: list[str] = []
    pending_experience_title = ""

    def flush_experience() -> None:
        nonlocal exp
        if exp and (exp["job_title"] or exp["company"]):
            exp["id"] = f"import-exp-{len(data['experiences']) + 1}"
            data["experiences"].append(exp)
        exp = None

    def flush_education() -> None:
        nonlocal edu, extra_education
        if edu and (edu["degree"] or edu["institution"]):
            edu["id"] = f"import-edu-{len(data['education']) + 1}"
            data["education"].append(edu)
        edu = None
        extra_education = []

    for item in lines[first_heading:]:
        text = clean(item.text)
        heading = HEADINGS.get(text.upper().rstrip(':'))
        if heading:
            if section == "experience": flush_experience()
            if section == "education": flush_education()
            section = heading
            continue
        if not text: continue
        if section == "summary":
            summary.append(text)
        elif section == "skills":
            skills.append(text)
        elif section == "experience":
            m = DATE_RANGE.search(text)
            if m and not item.bullet:
                heading_prefix = clean(text[:m.start()].strip(' -–|,'))
                if heading_prefix:
                    flush_experience()
                    # Many PDFs split "Role" and "Company, City, ST, Dates"
                    # onto two separate lines. Do not interpret the company
                    # as a job title or the first achievement as company.
                    company_with_place = re.fullmatch(
                        r"(.+?),\s*([^,]+),\s*([A-Za-z]{2}),?", heading_prefix)
                    if pending_experience_title and company_with_place:
                        title = pending_experience_title
                        company = clean(company_with_place.group(1))
                    elif pending_experience_title and "," in heading_prefix:
                        title = pending_experience_title
                        company = heading_prefix
                    else:
                        title = heading_prefix
                        company = ""
                    start, end, current = split_dates(m.group(1))
                    exp = {"job_title": title, "company": company,
                           "dates": m.group(1), "start_date": start, "end_date": end,
                           "is_current": current, "description": "", "bullets": []}
                    pending_experience_title = ""
                    continue
            if exp is None:
                if not item.bullet:
                    pending_experience_title = text
                continue
            if not exp["company"] and not item.bullet:
                exp["company"] = clean(text.split('|')[0])
            elif item.bullet or BULLET_PREFIX.match(text):
                exp["bullets"].append({"text": BULLET_PREFIX.sub('', text).strip()})
            elif exp["bullets"] and not re.search(r"[.!?]$", exp["bullets"][-1]["text"]):
                # Join wrapped PDF bullet lines, including long continuations.
                exp["bullets"][-1]["text"] += " " + text
            elif not item.bullet and not exp["bullets"]:
                exp["description"] = (exp["description"] + " " + text).strip()
            else:
                # A non-bullet after a completed bullet may be the next role.
                pending_experience_title = text
        elif section == "education":
            date_match = DATE_RANGE.search(text)
            if date_match:
                if edu is None:
                    edu = {"institution": "", "degree": "", "location": "", "dates": "", "start_date": "", "end_date": "", "is_current": False}
                edu["dates"] = date_match.group(1)
                edu["start_date"], edu["end_date"], edu["is_current"] = split_dates(edu["dates"])
                rem = clean(text[:date_match.start()].strip(' -–|'))
                if rem:
                    # School and city/state may share the same dated line.
                    school_loc = re.fullmatch(r"(.+?),\s*([^,]+),\s*([A-Za-z]{2}),?", rem)
                    if school_loc:
                        if not edu["institution"]: edu["institution"] = clean(school_loc.group(1))
                        edu["location"] = f"{clean(school_loc.group(2))}, {school_loc.group(3)}"
                    elif not edu["institution"]:
                        edu["institution"] = rem
                continue
            # University — Degree, or Degree at University
            if edu and (edu["institution"] or edu["degree"]) and edu["dates"]:
                if re.fullmatch(r"(?:[A-Za-z][A-Za-z .'-]+),\s*[A-Za-z]{2}(?:\s+\d{5})?", text):
                    edu["location"] = text
                    continue
                flush_education()
            if edu is None:
                edu = {"institution": "", "degree": "", "location": "", "dates": "", "start_date": "", "end_date": "", "is_current": False}
            degree_words = r"bachelor|master|phd|ph\.d|associate|b\.?s\.?|m\.?s\.?|degree|diploma|university|college"
            if re.search(r"\s[–—]\s", text):
                part1, part2 = re.split(r"\s[–—]\s", text, maxsplit=1)
                if re.search(r"bachelor|master|phd|associate|b\.?s\.?|m\.?s\.?|degree|diploma", part1, re.I):
                    edu["degree"], edu["institution"] = part1, part2
                else:
                    edu["institution"], edu["degree"] = part1, part2
            elif not edu["institution"]:
                if re.search(r"bachelor|master|phd|associate|b\.?s\.?|m\.?s\.?|degree|diploma", text, re.I):
                    edu["degree"] = text
                else:
                    edu["institution"] = text
            elif not edu["degree"] and re.search(degree_words, text, re.I):
                edu["degree"] = text
            else:
                extra_education.append(text)
    if section == "experience": flush_experience()
    if section == "education": flush_education()
    data["summary"] = " ".join(summary)
    # Join wrapped category entries to avoid creating accidental "General"
    # skill categories in the React editor when PDF lines wrap.
    joined_skills: list[str] = []
    for skill_line in skills:
        if re.match(r"^[^:]{1,65}:\s", skill_line) or not joined_skills:
            joined_skills.append(skill_line)
        else:
            joined_skills[-1] += " " + skill_line
    data["skills_text"] = "\n".join(joined_skills)

    if not data["full_name"]: warnings.append("Could not detect the candidate name.")
    if not data["experiences"]: warnings.append("No work experience entries were recognized; add them manually.")
    if not data["education"]: warnings.append("No education entries were recognized; add them manually.")
    if not data["skills_text"]: warnings.append("Skills were not recognized; enter them manually.")
    warnings.append("Please review imported dates, companies, and achievements; automatic extraction may miss complex layouts.")
    found = sum(bool(data[k]) for k in ("full_name", "job_title", "email", "summary", "skills_text"))
    if found < 2 and not data["experiences"] and not data["education"]:
        raise ValueError("Could not recognize resume fields in this document. Try a text-based DOCX or PDF, or import a saved JSON backup.")
    return {"resume": data, "warnings": warnings, "counts": {"experiences": len(data["experiences"]), "education": len(data["education"])}}


def import_resume(path: Path) -> dict:
    if path.suffix.lower() == ".docx":
        lines = from_docx(path)
    elif path.suffix.lower() == ".pdf":
        lines = from_pdf(path)
    else:
        raise ValueError("Only DOCX and text-based PDF resumes are supported.")
    if not lines:
        raise ValueError("Could not extract text from this document. Scanned/image-only PDFs are not supported.")
    return parse_lines(lines)
