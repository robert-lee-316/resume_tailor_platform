"use client";

import { ArrowRight, FileUp, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import Field from "@/components/common/Field";
import SectionIntro from "@/components/common/SectionIntro";

export default function PersonalSection() {
  const { resume, template, saved, exporting, previousResumeRef, importingPrevious, importPreviousError, updateField, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content">
                  <div className="import-old-resume">
                    <div><strong><FileUp size={16} /> Already have a resume?</strong><p>Upload an existing Word or PDF resume to fill in your details. Review the extracted information before applying it. Your selected Word template will not be changed.</p></div>
                    <button className="button outlined-button" disabled={importingPrevious} onClick={() => previousResumeRef.current?.click()}>
                      {importingPrevious ? <LoaderCircle size={16} className="spin" /> : <FileUp size={16} />} {importingPrevious ? "Reading resume…" : "Import previous resume"}
                    </button>
                    {importPreviousError && <p className="inline-import-error" role="alert">{importPreviousError}</p>}
                  </div>
                  <SectionIntro number="01" eyebrow="THE BASICS" title="Personal details" subtitle="Start with the essentials. Make it easy for people to reach you." icon={<UserRound size={21} />} />
                  <div className="field-grid">
                    <Field label="Full name" placeholder="e.g. Alex Morgan" value={resume.full_name} onChange={value => updateField("full_name", value)} />
                    <Field label="Professional title" placeholder="e.g. Software Engineer" value={resume.job_title} onChange={value => updateField("job_title", value)} />
                    <Field label="Email address" type="email" value={resume.email} placeholder="alex@example.com" onChange={value => updateField("email", value)} />
                    <Field label="Phone number" type="tel" value={resume.phone} placeholder="+1 (555) 123-4567" onChange={value => updateField("phone", value)} />
                    <div className="full-span"><Field label="Location" value={resume.location} placeholder="Austin, TX" onChange={value => updateField("location", value)} /></div>
                    <div className="full-span"><Field label="LinkedIn profile" type="url" value={resume.linkedin} placeholder="https://www.linkedin.com/in/your-profile" onChange={value => updateField("linkedin", value)} help="Add your LinkedIn profile link (optional)." /></div>
                  </div>
                  <div className="tip-panel"><ShieldCheck size={18} /><p><strong>Privacy first.</strong> Resume information and your selected template are saved in this browser. Uploaded documents are processed by your local backend when importing or exporting. Importing never replaces your chosen template.</p></div>
                  <div className="form-footer"><span>Step 1 of 5</span><button className="button primary-button" onClick={() => switchSection("summary")}>Continue <ArrowRight size={17} /></button></div>
                </div>
  );
}
