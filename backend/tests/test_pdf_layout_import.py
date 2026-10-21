"""Regression tests for resumes with unlabeled summaries and split role/company lines."""
from app.importer import ResumeLine, parse_lines


def test_split_company_dates_and_unlabeled_summary():
    lines = [
        'SAM PARKER', 'SENIOR SOFTWARE ENGINEER',
        '(415) 409-9232 / sam@example.com / El Paso, TX / linkedin.com/in/samparker',
        'Engineer with 12 years of experience building distributed systems across SaaS, healthcare, and fintech.',
        'SKILLS',
        'Languages: Python, JavaScript, C#',
        'Cloud: AWS, Azure, Kubernetes,',
        'Docker, Terraform',
        'WORK EXPERIENCE',
        'Senior Full Stack Engineer',
        'Example Corp, Raleigh, NC, Jun 2023 - Aug 2026',
        '\uf0b7 Built reliable data pipelines for clients across multiple clouds,',
        'reducing processing failures across critical services.',
        '\uf0b7 Mentored junior developers.',
        'Full Stack Engineer',
        'Second Corp, Cupertino, CA, Oct 2021 - May 2023',
        '\uf0b7 Shipped internal tools.',
        'EDUCATION',
        "Bachelor's degree in Computer Science",
        'The University of Texas at El Paso, El Paso, TX, 2005 - 2009',
    ]
    data = parse_lines([ResumeLine(line, line.startswith('\uf0b7')) for line in lines])['resume']
    assert data['phone'] == '(415) 409-9232'
    assert data['location'] == 'El Paso, TX'
    assert data['summary'].startswith('Engineer with 12 years')
    assert data['skills_text'].splitlines()[-1] == 'Cloud: AWS, Azure, Kubernetes, Docker, Terraform'
    assert [(e['job_title'], e['company']) for e in data['experiences']] == [
        ('Senior Full Stack Engineer', 'Example Corp'),
        ('Full Stack Engineer', 'Second Corp'),
    ]
    assert len(data['experiences'][0]['bullets']) == 2
    assert data['experiences'][0]['bullets'][0]['text'].endswith('critical services.')
    assert data['education'][0]['institution'] == 'The University of Texas at El Paso'
    assert data['education'][0]['location'] == 'El Paso, TX'
