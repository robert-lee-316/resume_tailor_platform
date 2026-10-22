"use client";

import { ArrowLeft, ArrowRight, Check, CircleAlert, CircleCheck, Copy, FileText, Layers3, LoaderCircle, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import SectionIntro from "@/components/common/SectionIntro";
import FieldTag from "@/components/common/FieldTag";
import { sections } from "@/lib/resume";
import { PLACEHOLDER_GROUPS, sampleFile } from "@/hooks/useResumeBuilderController";

export default function TemplateSection() {
  const { resume, section, template, templateLibrary, selectedTemplateId, templateLibraryBusy, inspection, inspectionLoading, templateError, dragging, setDragging, saved, copied, uploadRef, notify, applyTemplate, chooseTemplate, deleteTemplate, onDropTemplate, copyFields, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content">
                  <SectionIntro number="02" eyebrow="MAKE IT YOURS" title="Template library" subtitle="Upload multiple .docx templates, and select the design to use for this resume." icon={<Layers3 size={21} />} />
                  <div className={`dropzone ${dragging ? "dragging" : ""}`} role="button" tabIndex={0} onClick={() => uploadRef.current?.click()} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") uploadRef.current?.click(); }} onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { event.preventDefault(); setDragging(false); }} onDragOver={event => event.preventDefault()} onDrop={onDropTemplate}>
                    <div className="upload-icon"><UploadCloud size={26} /></div>
                    <strong>Drop your Word template here</strong>
                    <p>or <span>browse files</span> from your computer</p>
                    <small>DOCX format · Up to 5 MB</small>
                  </div>
                  {templateError && <div className="inline-error" role="alert"><CircleAlert size={18} /><span>{templateError}</span></div>}
                  <div className="template-library-section">
                    <div className="template-library-heading">
                      <div><strong>My template library</strong><p>Choose a saved template for this resume. Your information stays the same when you switch designs.</p></div>
                      <span className="template-library-count">{templateLibrary.length} saved</span>
                    </div>
                    {templateLibraryBusy && <p className="template-library-status"><LoaderCircle className="spin" size={14} /> Updating library…</p>}
                    <div className="template-library-list" role="radiogroup" aria-label="Select resume template">
                      {templateLibrary.map(item => {
                        const active = item.id === selectedTemplateId;
                        return <div key={item.id} className={`template-library-item ${active ? "active" : ""}`}>
                          <button type="button" role="radio" aria-checked={active} className="template-library-select" disabled={templateLibraryBusy}
                            onClick={() => void chooseTemplate(item.id)}>
                            <span className="template-library-file-icon"><FileText size={20} /></span>
                            <span className="template-library-file-details"><strong title={item.name}>{item.name}</strong><small>{(item.file.size / 1024).toFixed(1)} KB · Added {new Date(item.addedAt).toLocaleDateString()}</small></span>
                            <span className={`template-library-indicator ${active ? "active" : ""}`}>{active ? <><CircleCheck size={16} /> Selected</> : "Use template"}</span>
                          </button>
                          <button type="button" className="template-library-remove" disabled={templateLibraryBusy} title={`Remove ${item.name}`} aria-label={`Remove ${item.name}`} onClick={() => void deleteTemplate(item.id)}><Trash2 size={17}/></button>
                        </div>;
                      })}
                      {!templateLibrary.length && <p className="template-library-empty">No saved templates. Upload a DOCX file to add your first design.</p>}
                    </div>
                    {template && <p className="template-library-current"><Check size={14} /> Active: <strong>{template.name}</strong> · {inspectionLoading ? "Validating…" : inspection ? "Valid template" : "Validation pending"}</p>}
                  </div>
                  <button className="sample-template-link" onClick={() => { void sampleFile().then(applyTemplate).catch(() => notify("Could not load the sample template.")); }}><RefreshCw size={15} /> Use the included sample template</button>
                  <div className="template-instructions"><div className="instructions-head"><div><strong>Supported placeholders</strong><p>Add these fields directly inside your Word template.</p></div><button className="icon-button" title="Copy supported fields" aria-label="Copy supported fields" onClick={() => void copyFields()}>{copied ? <Check size={17} /> : <Copy size={17} />}</button></div>
                    {PLACEHOLDER_GROUPS.map(group => <div className="placeholder-group" key={group.name}><strong>{group.name}</strong><div className="placeholder-tags">{group.values.map(value => <FieldTag key={value} value={value} detected={Boolean(inspection?.fields.includes(value))} />)}</div></div>)}
                    <div className="loop-note">Repeating sections use <code>{"{%p for exp in experiences %}"}</code> and <code>{"{%p endfor %}"}</code>. Use <code>ed</code> for education, <code>bullet</code> for achievements, and optional <code>category</code> for <code>skill_categories</code>. Each control tag must be in its own Word paragraph.</div>
                  </div>
                  <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("skills")}><ArrowLeft size={16} /> Back</button><button className="button primary-button" onClick={() => switchSection("export")}>Next: export <ArrowRight size={17} /></button></div>
                </div>
  );
}
