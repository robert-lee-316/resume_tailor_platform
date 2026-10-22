"use client";

import { Bold, ArrowLeft, ArrowRight, BriefcaseBusiness, GripVertical, Plus, Trash2 } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import Field from "@/components/common/Field";
import TextArea from "@/components/common/TextArea";
import SectionIntro from "@/components/common/SectionIntro";
import BoldPreview from "@/components/common/BoldPreview";
import AchievementRichInput from "@/app/achievement-rich-input";
import { toDatePickerValue } from "@/lib/resume";

export default function ExperienceSection() {
  const { resume, setResume, achievementDropTarget, template, saved, achievementRefs, updateExperience, addExperience, updateExperienceDate, toggleAchievementBold, updateAchievement, addAchievement, removeAchievement, handleAchievementDragStart, handleAchievementDragOver, handleAchievementDrop, handleAchievementDragEnd, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content">
                  <SectionIntro number="03" eyebrow="YOUR JOURNEY" title="Work experience" subtitle="Show employers what you’ve done and the difference you made." icon={<BriefcaseBusiness size={21} />} />
                  <div className="repeat-list">
                    {resume.experiences.map((exp, index) => <div key={exp.id} className="repeat-card">
                      <div className="repeat-top"><div className="repeat-num">{String(index + 1).padStart(2, "0")}</div><div><strong>{exp.job_title || "New position"}</strong><small>{exp.company || "Add company details"}</small></div><button aria-label={`Remove experience ${index + 1}`} title="Remove experience" className="icon-button remove" onClick={() => setResume(current => ({ ...current, experiences: current.experiences.filter(item => item.id !== exp.id) }))}><Trash2 size={17} /></button></div>
                      <div className="repeat-body">
                        <Field label="Job title" value={exp.job_title} onChange={value => updateExperience(exp.id, { job_title: value })} placeholder="Senior Software Engineer" />
                        <Field label="Company" value={exp.company} onChange={value => updateExperience(exp.id, { company: value })} placeholder="Company name" />
                        <div className="experience-dates">
                          <div className="date-field-grid">
                            <Field label="From" type="date" value={toDatePickerValue(exp.start_date)}
                              onChange={value => updateExperienceDate(exp.id, "start_date", value)} />
                            <Field label="To" type="date" value={exp.is_current ? "" : toDatePickerValue(exp.end_date)}
                              min={toDatePickerValue(exp.start_date) || undefined} disabled={exp.is_current}
                              onChange={value => updateExperienceDate(exp.id, "end_date", value)} />
                          </div>
                          <label className="current-job-checkbox">
                            <input type="checkbox" checked={exp.is_current}
                              onChange={event => updateExperienceDate(exp.id, "is_current", event.target.checked)} />
                            <span>I currently work here</span>
                          </label>
                          <p className="date-picker-tip">Choose a date using the calendar icon. Word and PDF resumes display only the month and year.</p>
                          {(exp.start_date.length === 7 || exp.end_date.length === 7) && <p className="legacy-dates-note">
                            This entry was saved with month/year dates. The picker shows day 1 until you select an exact date; your saved dates will not change automatically.
                          </p>}
                          {exp.dates && !exp.start_date && !exp.end_date && <p className="legacy-dates-note">
                            Previous dates: {exp.dates}. Choose From and To dates using the calendars to replace this range.
                          </p>}
                        </div>
                        <TextArea label="Company description" value={exp.description} rows={3}
                          placeholder="Briefly describe what the company does or the product you worked on (no bullet)."
                          onChange={value => updateExperience(exp.id, { description: value })}
                          help="Appears as a normal paragraph after the company name and before achievement bullets. The Word template must include {{ exp.description }}." />
                        <div className="achievement-editor">
                          <p className="field-help">Paste from ChatGPT to keep <strong>bold keywords directly in the input</strong>. Ctrl+B formats a selection; Ctrl+Z undoes it.</p>
                          <div className="achievement-heading">
                            <span className="field-label">Achievements</span>
                            <button type="button" className="achievement-add" disabled={exp.bullets.length >= 100}
                              onClick={() => addAchievement(exp.id)}><Plus size={15} /> Add bullet</button>
                          </div>
                          <div className="achievement-list">
                            {exp.bullets.map((bullet, bulletIndex) => <div
                              className={`achievement-row${achievementDropTarget?.experienceId === exp.id && achievementDropTarget.index === bulletIndex ? " drop-target" : ""}`}
                              key={bulletIndex}
                              onDragOver={event => handleAchievementDragOver(event, exp.id, bulletIndex)}
                              onDrop={event => handleAchievementDrop(event, exp.id, bulletIndex)}
                            >
                              <button type="button" className="achievement-drag-handle"
                                draggable
                                aria-label={`Drag to reorder achievement ${bulletIndex + 1} for position ${index + 1}`}
                                title="Drag to reorder"
                                onDragStart={event => handleAchievementDragStart(event, exp.id, bulletIndex)}
                                onDragEnd={handleAchievementDragEnd}
                              ><GripVertical size={17} /></button>
                              
                              <AchievementRichInput value={bullet.text}
                                inputRef={node => { achievementRefs.current[`${exp.id}:${bulletIndex}`] = node; }}
                                label={`Achievement ${bulletIndex + 1} for position ${index + 1}`}
                                placeholder={bulletIndex === 0 ? "e.g. Reduced API response time by 35%" : "Enter another achievement"}
                                onChange={value => updateAchievement(exp.id, bulletIndex, value)}
                                onEnter={() => addAchievement(exp.id)} />
                              <button type="button" className="achievement-bold-button" aria-label={`Bold selected words in achievement ${bulletIndex + 1}`}
                                title="Bold highlighted keywords (Ctrl+B)" onMouseDown={event => event.preventDefault()}
                                onClick={() => toggleAchievementBold(exp.id, bulletIndex)}><Bold size={15} /></button>
                              <button type="button" className="icon-button remove" title="Remove achievement"
                                aria-label={`Remove achievement ${bulletIndex + 1} from position ${index + 1}`}
                                onClick={() => removeAchievement(exp.id, bulletIndex)}><Trash2 size={16} /></button>
                              {bullet.text.includes("**") && <div className="achievement-formatted-preview"><BoldPreview value={bullet.text} /></div>}
                            </div>)}
                            {exp.bullets.length === 0 && <p className="achievement-empty">No achievements added yet. Click “Add bullet” to begin.</p>}
                          </div>
                          <span className="field-help">Highlight important words and click B (or Ctrl+B) to bold them in Word/PDF. Drag the grip handle to reorder bullets. Press Enter to add a bullet.</span>
                        </div>
                      </div>
                    </div>)}
                  </div>
                  <button className="add-card" onClick={addExperience}><Plus size={18} /> Add another position</button>
                  <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("summary")}><ArrowLeft size={16} /> Back</button><button className="button primary-button" onClick={() => switchSection("education")}>Continue <ArrowRight size={17} /></button></div>
                </div>
  );
}
