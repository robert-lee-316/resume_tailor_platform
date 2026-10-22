"use client";

import { Activity, ArrowLeft, ArrowRight, GripVertical, Plus, Trash2 } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import SectionIntro from "@/components/common/SectionIntro";
import SkillKeywordEditor from "@/components/common/SkillKeywordEditor";

export default function SkillsSection() {
  const { resume, skillCategoryDropTarget, template, saved, addSkillCategory, updateSkillCategory, removeSkillCategory, handleSkillCategoryDragStart, handleSkillCategoryDragOver, handleSkillCategoryDrop, handleSkillCategoryDragEnd, addSkillKeywords, removeSkill, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content">
                  <SectionIntro number="05" eyebrow="YOUR TOOLKIT" title="Skills & expertise" subtitle="Organize skills as removable keyword tags. Press Enter to add, paste comma-separated keywords, and drag categories into your preferred order." icon={<Activity size={21} />} />
                  <div className="skill-category-list">
                    {resume.skill_categories.map((category, categoryIndex) => <div
                      className={`skill-category-row${skillCategoryDropTarget === category.id ? " skill-category-drop-target" : ""}`}
                      key={category.id}
                      onDragOver={event => handleSkillCategoryDragOver(event, category.id)}
                      onDrop={event => handleSkillCategoryDrop(event, category.id)}
                    >
                      <div className="skill-category-reorder">
                        <button type="button" className="skill-category-drag-handle" draggable
                          aria-label={`Drag to reorder category ${category.name || categoryIndex + 1}`}
                          title="Drag to change category order"
                          onDragStart={event => handleSkillCategoryDragStart(event, category.id)}
                          onDragEnd={handleSkillCategoryDragEnd}>
                          <GripVertical size={18} />
                        </button>
                      </div>
                      <div className="skill-category-fields">
                        
                        <label className="skill-category-name">
                          <span className="sr-only">Category {categoryIndex + 1}</span>
                          <input value={category.name} placeholder="Category (e.g. Backend)" maxLength={120}
                            aria-label={`Skill category ${categoryIndex + 1}`}
                            onChange={event => updateSkillCategory(category.id, event.target.value)} />
                        </label>
                        <span className="skill-category-colon" aria-hidden="true">:</span>
                        <SkillKeywordEditor category={category} categoryIndex={categoryIndex}
                          onAdd={values => addSkillKeywords(category.id, values)}
                          onRemove={index => removeSkill(category.id, index)} />
                      </div>
                      <button type="button" className="skill-category-delete" title="Remove category"
                        aria-label={`Remove skill category ${categoryIndex + 1}`}
                        onClick={() => removeSkillCategory(category.id)}><Trash2 size={16} /></button>
                    </div>)}
                    {resume.skill_categories.length === 0 && <p className="skill-category-empty">No skill categories yet. Click Add category to get started.</p>}
                  </div>
                  <button type="button" className="add-card skill-category-add" disabled={resume.skill_categories.length >= 30}
                    onClick={addSkillCategory}><Plus size={18} /> Add category</button>
                  <div className="skill-preview">
                    <span className="field-label">RESUME OUTPUT PREVIEW — CATEGORY ORDER</span>
                    {resume.skill_categories.filter(category => category.skills.some(skill => skill.trim())).map(category => <div className="skill-preview-category" key={category.id}>
                      <span className="skill-preview-bullet" aria-hidden="true">•</span>
                      <strong>{category.name.trim() || "Skills"}:</strong>
                      <span>{category.skills.filter(skill => skill.trim()).join(", ")}</span>
                    </div>)}
                    <p className="field-help">Category order is saved automatically and appears in Instant Preview, Exact PDF, and Word downloads. Supports both {'{{ skills_text }}'} and skill-category loops.</p>
                  </div>
                  <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("education")}><ArrowLeft size={16} /> Back</button><button className="button primary-button" onClick={() => switchSection("template")}>Choose template <ArrowRight size={17} /></button></div>
                </div>
  );
}
