"use client";

import { Bold, ArrowRight, RotateCcw, Settings2 } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import SectionIntro from "@/components/common/SectionIntro";
import StyleTypographyFields from "@/components/common/StyleTypographyFields";
import { sections } from "@/lib/resume";
import { DEFAULT_STYLES } from "@/lib/styles";
import { STYLE_GROUPS } from "@/lib/styles";
import { STYLE_LABELS } from "@/lib/styles";
import { cssTextStyle } from "@/lib/styles";
import { restoreSharedHeadingStyle } from "@/lib/styles";

export default function StylesSection() {
  const { resume, section, styles, setStyles, selectedStyle, setSelectedStyle, template, updateStyle, updateOptionalStyle, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content style-settings-panel">
                  <SectionIntro number="03" eyebrow="TYPOGRAPHY" title="Style settings" subtitle="Choose fonts, sizes, colors and alignment independently for each resume area. Changes appear instantly in the draft preview and are included in Word/PDF exports." icon={<Settings2 size={21} />} />
                  <div className="style-group-collection">
                    {STYLE_GROUPS.map(group => <section key={group.label} className="style-group" aria-label={`${group.label} styles`}>
                      <h3 className="style-group-label">{group.label}</h3>
                      <div className="style-category-grid">
                        {group.keys.map(key => <button key={key} type="button" className={`style-category-tab ${selectedStyle === key ? "active" : ""}`} aria-pressed={selectedStyle === key} onClick={() => setSelectedStyle(key)}>{STYLE_LABELS[key]}</button>)}
                      </div>
                    </section>)}
                  </div>
                  <div className="style-property-box">
                    <div className="style-property-title"><strong>{STYLE_LABELS[selectedStyle]}</strong><span>Formatting for this part only</span></div>
                    <label className="style-checkbox" style={{marginBottom: 14}}>
                      <input type="checkbox" checked={!styles[selectedStyle].enabled} onChange={e => setStyles(current => ({
                        ...current, [selectedStyle]: { ...current[selectedStyle], enabled: !e.target.checked,
                          changed: e.target.checked ? [] : ((current[selectedStyle].changed?.length ?? 0) > 0 ? current[selectedStyle].changed : ["font", "size", "align", "color", "bold"]) }
                      }))} />
                      Keep formatting from the uploaded Word template
                    </label>
                    <p className="field-help" style={{marginTop: 0, marginBottom: 12}}>
                      {styles[selectedStyle].enabled
                        ? "Custom formatting is sent to Word and Exact PDF. Allow a few seconds for PDF regeneration; the original template may use the same font."
                        : "Template formatting is preserved in Exact PDF. Editing any field below enables a custom override for that property."}
                    </p>
                    <p className="field-help" role="status" style={{marginTop: 0, marginBottom: 12}}>
                      {styles[selectedStyle].enabled
                        ? (styles[selectedStyle].changed?.length ?? 0) > 0
                          ? `Word/PDF override active: ${styles[selectedStyle].changed?.join(", ")}.`
                          : "No properties have been applied to the Word document yet. Edit a value below."
                        : "The Word template determines this section's formatting. Change any value below to override it."}
                    </p>
                    <StyleTypographyFields
                      idPrefix={`resume-style-${selectedStyle}`}
                      value={styles[selectedStyle]}
                      onChange={(field, next) => updateStyle(selectedStyle, field, next)}
                    />
                    <div className="style-field-grid style-paragraph-controls">
                      <label className="field"><span className="field-label">Line spacing</span><input type="number" min={1} max={2.5} step={0.05} placeholder="Template default" value={styles[selectedStyle].lineSpacing ?? ""} onChange={e => updateOptionalStyle(selectedStyle, "lineSpacing", e.target.value, 1, 2.5)} /></label>
                      <label className="field"><span className="field-label">Space after (pt)</span><input type="number" min={0} max={36} step={1} placeholder="Template default" value={styles[selectedStyle].spaceAfter ?? ""} onChange={e => updateOptionalStyle(selectedStyle, "spaceAfter", e.target.value, 0, 36)} /></label>
                      {(["skills", "experienceBullets"].includes(selectedStyle)) && <label className="field"><span className="field-label">Left indent (pt)</span><input type="number" min={0} max={72} step={1} placeholder="Template default" value={styles[selectedStyle].leftIndent ?? ""} onChange={e => updateOptionalStyle(selectedStyle, "leftIndent", e.target.value, 0, 72)} /></label>}
                    </div>
                    {selectedStyle === "summary" ? (
                      <p className="field-help" role="note">Summary text is regular by default. To bold specific words, select them in Professional Summary and press Ctrl+B (or use Bold selection).</p>
                    ) : (
                      <label className="style-checkbox"><input type="checkbox" checked={styles[selectedStyle].bold} onChange={e => updateStyle(selectedStyle, "bold", e.target.checked)} /><Bold size={17} /> Bold text</label>
                    )}
                    <div className="style-sample" style={cssTextStyle(styles[selectedStyle])}>{selectedStyle === "skillsHeading" ? "SKILLS" : selectedStyle === "skills" ? "Languages: Python, React, TypeScript" : selectedStyle === "experienceHeading" ? "WORK EXPERIENCE" : selectedStyle === "experience" ? "Senior Engineer — Acme Technologies, 2022–Present" : selectedStyle === "experienceDescription" ? "Built scalable platforms for enterprise customers." : selectedStyle === "experienceBullets" ? "• Improved application performance by 35%." : selectedStyle === "educationHeading" ? "EDUCATION" : selectedStyle === "education" ? "State University — B.S. Computer Science, 2018–2022" : "The quick brown fox jumps over the lazy dog."}</div>
                  </div>
                  <div className="heading-style-editor" aria-label="Shared section heading style">
                    <div className="heading-style-editor-title">
                      <strong>Custom heading style</strong>
                      <p>One style for Skills, Work Experience, and Education. Changing a setting updates all three headings in the preview and Word / PDF exports.</p>
                    </div>
                    <div className="heading-style-card">
                      <div className="heading-style-card-top">
                        <strong>All section headings</strong>
                        <button type="button" className="heading-restore-button" onClick={() => setStyles(restoreSharedHeadingStyle)}>Use Word template style</button>
                      </div>
                      <div className="heading-style-state" aria-live="polite">
                        {styles.skillsHeading.enabled && (styles.skillsHeading.changed?.length ?? 0) > 0
                          ? "Using one custom heading style for all sections"
                          : "Using uploaded Word template heading formatting"}
                      </div>
                      <StyleTypographyFields
                        idPrefix="resume-style-shared-heading"
                        value={styles.skillsHeading}
                        onChange={(field, next) => updateStyle("skillsHeading", field, next)}
                      />
                      <label className="style-checkbox"><input type="checkbox" checked={styles.skillsHeading.bold} onChange={e => updateStyle("skillsHeading", "bold", e.target.checked)} /> <Bold size={16}/> Bold</label>
                      <div className="heading-style-sample" aria-label="Shared heading preview">
                        {(["SKILLS", "WORK EXPERIENCE", "EDUCATION"] as const).map(label =>
                          <div key={label} className="heading-style-sample-line" style={cssTextStyle(styles.skillsHeading)}>{label}</div>)}
                      </div>
                      {!styles.skillsHeading.enabled && <p className="heading-style-hint">The values above are editable starting values, not measured from your Word template. Edit any setting to apply one custom style to all three headings.</p>}
                    </div>
                  </div>
                  <div className="style-panel-footer"><button className="button outlined-button" onClick={() => setStyles(DEFAULT_STYLES)}><RotateCcw size={15} /> Reset styles</button><button className="button primary-button" onClick={() => switchSection("export")}>Continue to export <ArrowRight size={16} /></button></div>
                  <p className="style-note">A single custom heading style affects Skills, Work Experience, and Education together. Exact PDF uses the updated Word document; Instant Preview is an HTML approximation.</p>
                </div>
  );
}
