from __future__ import annotations
import asyncio
import json
import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from .engine import render_docx, inspect_docx, TemplateError
from .importer import import_resume
from .template_generator import generate_template_from_resume

app = FastAPI(title="Resume Builder Starter", version="0.1.0")
MAX_UPLOAD = 5 * 1024 * 1024
MAX_JSON = 150 * 1024
# Keep LibreOffice conversions from saturating a workstation when multiple
# browser tabs request previews at once. Work runs outside FastAPI's event loop.
PDF_CONVERSION_LIMIT = asyncio.Semaphore(1)


def find_libreoffice() -> str | None:
    """Locate LibreOffice on Linux, macOS, or Windows.

    Windows normally installs soffice.com/exe instead of a `libreoffice`
    executable, and its program directory is often absent from PATH.
    """
    for executable in ('libreoffice', 'soffice.com', 'soffice.exe', 'soffice'):
        located = shutil.which(executable)
        if located:
            return located
    if os.name == 'nt':
        for base in (os.environ.get('PROGRAMFILES'), os.environ.get('PROGRAMFILES(X86)')):
            if not base:
                continue
            for binary in ('soffice.com', 'soffice.exe'):
                candidate = Path(base) / 'LibreOffice' / 'program' / binary
                if candidate.is_file():
                    return str(candidate)
    if os.name == 'posix':
        mac_binary = Path('/Applications/LibreOffice.app/Contents/MacOS/soffice')
        if mac_binary.is_file():
            return str(mac_binary)
    return None

@app.get('/api/health')
def health():
    return {'status': 'ok', 'libreoffice': bool(find_libreoffice())}

def validate_docx_archive(source: Path) -> None:
    if not zipfile.is_zipfile(source):
        raise HTTPException(400, 'Invalid DOCX archive')
    with zipfile.ZipFile(source) as z:
        names = z.namelist()
        if len(names) > 3000 or sum(i.file_size for i in z.infolist()) > 50 * 1024 * 1024:
            raise HTTPException(400, 'DOCX archive exceeds safety limits')
        if 'word/document.xml' not in names:
            raise HTTPException(400, 'Missing Word document content')
        if any('vbaProject' in name or name.lower().endswith('.bin') for name in names):
            raise HTTPException(400, 'Embedded binary objects are not supported')

@app.post('/api/inspect-template')
async def inspect_template(template: UploadFile = File(...)):
    if not (template.filename or '').lower().endswith('.docx'):
        raise HTTPException(400, 'Only .docx templates are supported')
    raw = await template.read(MAX_UPLOAD + 1)
    if len(raw) > MAX_UPLOAD:
        raise HTTPException(413, 'Template exceeds 5MB')
    with tempfile.TemporaryDirectory(prefix='resume-inspect-') as workspace:
        source = Path(workspace) / 'template.docx'
        source.write_bytes(raw)
        validate_docx_archive(source)
        try:
            return inspect_docx(source)
        except TemplateError as exc:
            raise HTTPException(422, str(exc))
        except (ValueError, zipfile.BadZipFile) as exc:
            raise HTTPException(400, f'Invalid Word document: {exc}')

@app.post('/api/import-resume')
async def import_previous_resume(file: UploadFile = File(...)):
    suffix = Path(file.filename or '').suffix.lower()
    if suffix not in ('.docx', '.pdf'):
        raise HTTPException(400, 'Upload a .docx or text-based .pdf resume')
    raw = await file.read(MAX_UPLOAD + 1)
    if not raw or len(raw) > MAX_UPLOAD:
        raise HTTPException(413, 'Resume file must be between 1 byte and 5 MB')
    with tempfile.TemporaryDirectory(prefix='resume-import-') as workspace:
        source = Path(workspace) / ('previous' + suffix)
        source.write_bytes(raw)
        if suffix == '.docx':
            validate_docx_archive(source)
        elif not raw.startswith(b'%PDF-'):
            raise HTTPException(400, 'Invalid PDF file')
        try:
            return import_resume(source)
        except (ValueError, zipfile.BadZipFile) as exc:
            raise HTTPException(422, str(exc))
        except Exception as exc:
            # Do not expose server filesystem or stack trace details.
            raise HTTPException(422, 'Could not read resume document. Try another DOCX or a selectable-text PDF.') from exc

@app.post('/api/generate-template-from-resume')
async def create_template_from_previous_resume(file: UploadFile = File(...)):
    """Convert a filled previous resume to a reusable placeholder template.

    Already-valid DOCX templates are returned unchanged. Original uploads are
    never stored server-side; generated files are removed after delivery.
    """
    suffix = Path(file.filename or '').suffix.lower()
    if suffix not in ('.docx', '.pdf'):
        raise HTTPException(400, 'Upload a DOCX or selectable-text PDF resume')
    raw = await file.read(MAX_UPLOAD + 1)
    if not raw or len(raw) > MAX_UPLOAD:
        raise HTTPException(413, 'Resume file must be between 1 byte and 5 MB')
    workspace = Path(tempfile.mkdtemp(prefix='resume-template-'))
    try:
        source = workspace / ('source' + suffix)
        source.write_bytes(raw)
        if suffix == '.docx':
            validate_docx_archive(source)
        elif not raw.startswith(b'%PDF-'):
            raise HTTPException(400, 'Invalid PDF file')
        output = workspace / 'generated-template.docx'
        try:
            mode = await run_in_threadpool(generate_template_from_resume, source, output)
        except (TemplateError, ValueError, zipfile.BadZipFile) as exc:
            raise HTTPException(422, str(exc)) from exc
        base = Path(file.filename or 'resume').stem
        import re
        safe_base = re.sub(r'[^A-Za-z0-9_-]+', '-', base).strip('-')[:65] or 'resume'
        return FileResponse(output, filename=safe_base + '-GuruCorp-Template.docx',
                            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            headers={'X-GuruCorp-Template-Mode': mode,
                                     'Access-Control-Expose-Headers': 'X-GuruCorp-Template-Mode'},
                            background=BackgroundTask(shutil.rmtree, workspace, ignore_errors=True))
    finally:
        import sys
        if sys.exc_info()[0] is not None:
            shutil.rmtree(workspace, ignore_errors=True)


@app.post('/api/render')
async def render(
    template: UploadFile = File(...),
    resume_json: str = Form(...),
    format: str = Form('pdf'),
):
    if format not in ('pdf', 'docx'):
        raise HTTPException(400, 'format must be pdf or docx')
    if not (template.filename or '').lower().endswith('.docx'):
        raise HTTPException(400, 'Only .docx templates are supported')
    if len(resume_json.encode()) > MAX_JSON:
        raise HTTPException(413, 'Resume JSON is too large')
    try:
        data = json.loads(resume_json)
        if not isinstance(data, dict): raise ValueError('Expected a JSON object')
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(400, 'Invalid resume JSON object')
    workspace = Path(tempfile.mkdtemp(prefix='resume-job-'))
    try:
        raw = await template.read(MAX_UPLOAD + 1)
        if len(raw) > MAX_UPLOAD: raise HTTPException(413, 'Template exceeds 5MB')
        source = workspace / 'template.docx'
        source.write_bytes(raw)
        validate_docx_archive(source)
        try:
            inspect_docx(source)
        except TemplateError as exc:
            raise HTTPException(422, str(exc))
        docx_path = workspace / 'resume.docx'
        await run_in_threadpool(render_docx, source, docx_path, data)
        if format == 'docx':
            return FileResponse(docx_path, filename='resume.docx',
                media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                background=BackgroundTask(shutil.rmtree, workspace, ignore_errors=True))
        libreoffice_command = find_libreoffice()
        if not libreoffice_command:
            raise HTTPException(503, 'LibreOffice is not installed on the server')
        profile = (workspace / 'lo-profile').as_uri()
        async with PDF_CONVERSION_LIMIT:
            result = await run_in_threadpool(subprocess.run, [
                libreoffice_command, f'-env:UserInstallation={profile}', '--headless',
                '--convert-to', 'pdf', '--outdir', str(workspace), str(docx_path)
            ], capture_output=True, text=True, timeout=35)
        pdf_path = workspace / 'resume.pdf'
        if result.returncode or not pdf_path.exists():
            raise HTTPException(500, 'PDF conversion failed: ' + result.stderr[:300])
        return FileResponse(pdf_path, filename='resume.pdf', media_type='application/pdf',
            background=BackgroundTask(shutil.rmtree, workspace, ignore_errors=True))
    except TemplateError as exc:
        raise HTTPException(422, str(exc))
    except subprocess.TimeoutExpired:
        raise HTTPException(504, 'PDF conversion timed out')
    finally:
        # Response streaming requires the output to remain until after transfer.
        # Error cases should not leak working directories.
        import sys
        if sys.exc_info()[0] is not None:
            shutil.rmtree(workspace, ignore_errors=True)
