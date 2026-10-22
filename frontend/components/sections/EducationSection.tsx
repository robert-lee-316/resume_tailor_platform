"use client";

import { ArrowLeft, ArrowRight, GraduationCap, Plus, Trash2 } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import Field from "@/components/common/Field";
import SectionIntro from "@/components/common/SectionIntro";
import { toDatePickerValue } from "@/lib/resume";

export default function EducationSection() {
  const { resume, setResume, updateEducation, addEducation, updateEducationDate, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content">
                  <SectionIntro number="04" eyebrow="YOUR FOUNDATION" title="Education" subtitle="Add degrees, school locations, and study dates." icon={<GraduationCap size={21} />} />
                  <div className="repeat-list">
                    {resume.education.map((edu, index) => <div key={edu.id} className="repeat-card">
                      <div className="repeat-top"><div className="repeat-num">{String(index + 1).padStart(2, "0")}</div><div><strong>{edu.degree || "New qualification"}</strong><small>{edu.institution || "Add your institution"}</small></div><button className="icon-button remove" title="Remove education" aria-label={`Remove education ${index + 1}`} onClick={() => setResume(current => ({ ...current, education: current.education.filter(item => item.id !== edu.id) }))}><Trash2 size={17} /></button></div>
                      <div className="repeat-body">
                        <Field label="Degree / qualification" value={edu.degree} placeholder="B.S. Computer Science" onChange={value => updateEducation(edu.id, { degree: value })} />
                        <Field label="School / institution" value={edu.institution} placeholder="State University" onChange={value => updateEducation(edu.id, { institution: value })} />
                        <Field label="College / University Location" value={edu.location} placeholder="Albany, NY" onChange={value => updateEducation(edu.id, { location: value })} />
                        <div className="experience-dates">
                          <div className="date-field-grid">
                            <Field label="From" type="date" value={toDatePickerValue(edu.start_date)} onChange={value => updateEducationDate(edu.id, "start_date", value)} />
                            <Field label="To" type="date" value={edu.is_current ? "" : toDatePickerValue(edu.end_date)}
                              min={toDatePickerValue(edu.start_date) || undefined} disabled={edu.is_current}
                              onChange={value => updateEducationDate(edu.id, "end_date", value)} />
                          </div>
                          <label className="current-job-checkbox"><input type="checkbox" checked={edu.is_current}
                            onChange={event => updateEducationDate(edu.id, "is_current", event.target.checked)} /><span>I currently study here</span></label>
                          <p className="date-picker-tip">Select calendar dates; the generated resume displays month and year.</p>
                          {edu.dates && !edu.start_date && !edu.end_date && <p className="legacy-dates-note">Previous dates: {edu.dates}. Choose dates above to replace this value.</p>}
                          {(edu.start_date.length === 7 || edu.end_date.length === 7) && <p className="legacy-dates-note">Older month/year dates display day 1 until you choose an exact date.</p>}
                        </div>
                      </div>
                    </div>)}
                  </div>
                  <button className="add-card" onClick={addEducation}><Plus size={18} /> Add another education</button>
                  <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("experience")}><ArrowLeft size={16} /> Back</button><button className="button primary-button" onClick={() => switchSection("skills")}>Continue <ArrowRight size={17} /></button></div>
                </div>
  );
}
