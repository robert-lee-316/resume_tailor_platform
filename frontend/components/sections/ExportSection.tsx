"use client";

import { ArrowDownToLine, ArrowLeft, CheckCheck, Download, FileCheck2, FileJson, FileText, FileUp, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import SectionIntro from "@/components/common/SectionIntro";

export default function ExportSection() {
  const { resume, template, saved, wordAutosaveEnabled, wordSaveStatus, wordSaveNote, wordSaveDate, outputFolderName, exporting, jsonRef, previousResumeRef, importingPrevious, importPreviousError, setWordAutosave, connectOutputFolder, downloadLastWordDraft, downloadResume, downloadJson, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content">
                  <SectionIntro number="03" eyebrow="READY TO GO" title="Download your resume" subtitle="Your resume is created from your own Word template." icon={<FileCheck2 size={21} />} />
                  <div className="export-cards">
                    <button disabled={!template || Boolean(exporting)} className="export-choice" onClick={() => void downloadResume("pdf")}><div className="export-icon pdf"><FileText size={25} /></div><div><strong>PDF document</strong><small>Best for job applications and sharing</small></div>{exporting === "pdf" ? <LoaderCircle size={19} className="spin" /> : <ArrowDownToLine size={19} />}</button>
                    <button disabled={!template || Boolean(exporting)} className="export-choice" onClick={() => void downloadResume("docx")}><div className="export-icon doc"><FileText size={25} /></div><div><strong>Word document</strong><small>Fully editable Microsoft Word file</small></div>{exporting === "docx" ? <LoaderCircle size={19} className="spin" /> : <ArrowDownToLine size={19} />}</button>
                  </div>
                  <div className="word-autosave-panel">
                    <div className="word-autosave-header"><div><strong><FileCheck2 size={18} /> Auto-save Word document</strong><p>Generate an updated .docx after you stop typing. Your uploaded placeholder template stays unchanged.</p></div>
                      <label className="word-autosave-toggle"><input aria-label="Auto-save generated Word document" type="checkbox" checked={wordAutosaveEnabled} onChange={event => setWordAutosave(event.target.checked)} /> On</label>
                    </div>
                    <p className={`word-autosave-message ${wordSaveStatus}`} role="status">
                      {wordSaveStatus === "saving" ? <LoaderCircle className="spin" size={15} /> : wordSaveStatus === "saved" ? <CheckCheck size={15} /> : <FileText size={15} />}
                      {wordSaveNote}{wordSaveDate ? ` · ${new Date(wordSaveDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
                    </p>
                    <div className="word-autosave-actions">
                      <button className="button outlined-button" type="button" onClick={() => void connectOutputFolder()}><UploadCloud size={16} /> {outputFolderName ? `Reconnect: ${outputFolderName}` : "Choose auto-save folder"}</button>
                      <button className="button subtle-button" type="button" onClick={() => void downloadLastWordDraft()}><Download size={16} /> Download saved DOCX</button>
                    </div>
                    <p className="word-autosave-help">Automatic disk saving needs a folder you explicitly authorize in Chrome or Edge. Otherwise the latest generated Word file is kept privately in this browser.</p>
                  </div>
                  <div className="export-separator">DATA & BACKUP</div>
                  <div className="backup-actions"><button className="button outlined-button" onClick={downloadJson}><FileJson size={17} /> Save resume data</button><button className="button outlined-button" onClick={() => jsonRef.current?.click()}><FileUp size={17} /> Import JSON backup</button></div>
                  <button className="button outlined-button resume-import-export" onClick={() => previousResumeRef.current?.click()} disabled={importingPrevious}><FileUp size={17} /> {importingPrevious ? "Reading document…" : "Import previous Word / PDF resume"}</button>
                  {importPreviousError && <p className="inline-import-error" role="alert">{importPreviousError}</p>}
                  <div className="tip-panel"><ShieldCheck size={18} /><p><strong>Built around your template.</strong> Word is generated first, then converted into the PDF you see on the right.</p></div>
                  <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("template")}><ArrowLeft size={16} /> Back to template</button></div>
                </div>
  );
}
