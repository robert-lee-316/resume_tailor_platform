"use client";

import { CircleCheck, RefreshCw, Sparkles } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import { sections } from "@/lib/resume";
import PersonalSection from "@/components/sections/PersonalSection";
import SummarySection from "@/components/sections/SummarySection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import EducationSection from "@/components/sections/EducationSection";
import SkillsSection from "@/components/sections/SkillsSection";
import StylesSection from "@/components/sections/StylesSection";
import TemplateSection from "@/components/sections/TemplateSection";
import ExportSection from "@/components/sections/ExportSection";

export default function ResumeEditor() {
  const { resume, section, styles, template, backendHealth, mobilePanel, checkHealth, generatePreview, switchSection, completedSections, filled } = useResumeBuilder();
  return (
            <main className={`editor-panel ${mobilePanel === "preview" ? "mobile-hidden" : ""}`}>
              <div className="editor-scroll">
                <div className="editor-topline"><span className="eyebrow">YOUR RESUME WORKSPACE</span><span className="small-step">{section === "export" ? "EXPORT" : section === "template" ? "TEMPLATE" : section === "styles" ? "STYLE" : "CONTENT"}</span></div>
                <div className="editor-title-line">
                  <h1>{section === "template" ? "Choose your template." : section === "export" ? "Ready to share?" : section === "styles" ? "Style your resume." : "Make your next move."}</h1>
                  <p>{section === "template" ? "Upload and save multiple Word designs, then choose the template for your current resume." : section === "export" ? "Your finished resume is just one click away." : section === "styles" ? "Adjust fonts and alignment for every part of your resume." : "Tell your story. We’ll take care of the formatting."}</p>
                </div>

                <div className="section-nav" aria-label="Resume editor sections">
                  <button className={`section-nav-tab ${section !== "template" && section !== "export" && section !== "styles" ? "tab-active" : ""}`} onClick={() => switchSection("personal")}>01 <span>Content</span></button>
                  <button className={`section-nav-tab ${section === "template" ? "tab-active" : ""}`} onClick={() => switchSection("template")}>02 <span>Template</span></button>
                  <button className={`section-nav-tab ${section === "styles" ? "tab-active" : ""}`} onClick={() => switchSection("styles")}>03 <span>Style</span></button>
                  <button className={`section-nav-tab ${section === "export" ? "tab-active" : ""}`} onClick={() => switchSection("export")}>04 <span>Export</span></button>
                </div>

                {section !== "template" && section !== "export" && section !== "styles" && <div className="progress-card">
                  <div className="progress-header"><div className="progress-label"><span className="progress-star"><Sparkles size={16} /></span><span><strong>Looking good!</strong><small>Build your best first impression.</small></span></div><span className="progress-count">{filled}/5 sections</span></div>
                  <div className="progress-track"><div style={{ width: `${filled / 5 * 100}%` }} /></div>
                </div>}

                {section !== "template" && section !== "export" && section !== "styles" && <nav className="content-section-tabs" aria-label="Edit section">
                  {sections.map((item, index) => <button key={item.id} className={section === item.id ? "selected" : ""} onClick={() => switchSection(item.id)}>
                    <span>{item.label}</span>{completedSections[index] ? <CircleCheck size={14} className="done-icon" /> : <span className="unfilled-dot" />}
                  </button>)}
                </nav>}

                {section === "personal" && <PersonalSection />}

                {section === "summary" && <SummarySection />}

                {section === "experience" && <ExperienceSection />}

                {section === "education" && <EducationSection />}

                {section === "skills" && <SkillsSection />}

                {section === "styles" && <StylesSection />}

                {section === "template" && <TemplateSection />}

                {section === "export" && <ExportSection />}
              </div>
              <div className="editor-bottom"><span><span className={`status-dot ${backendHealth === "online" ? "green" : backendHealth === "offline" ? "red" : "amber"}`} /> {backendHealth === "online" ? "Document engine connected" : backendHealth === "offline" ? "Document engine offline" : "Checking connection"}</span><button onClick={() => { void checkHealth(); void generatePreview(true); }}><RefreshCw size={14} /> Recheck</button></div>
            </main>
  );
}
