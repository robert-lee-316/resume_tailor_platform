"use client";

import { Bold, ArrowLeft, ArrowRight, FilePenLine, Undo2, Redo2, WandSparkles } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import TextArea from "@/components/common/TextArea";
import SectionIntro from "@/components/common/SectionIntro";
import BoldPreview from "@/components/common/BoldPreview";

export default function SummarySection() {
  const { resume, summaryRef, summaryHistory, summarySelection, updateSummaryText, toggleSummaryBold, undoSummary, redoSummary, switchSection } = useResumeBuilder();
  return (
    <div className="editor-content">
                  <SectionIntro number="02" eyebrow="YOUR ELEVATOR PITCH" title="Professional summary" subtitle="A few strong sentences about the impact you make." icon={<FilePenLine size={21} />} />
                  <div className="rich-text-header"><span className="field-label">Format selected keywords</span>
                    <div className="summary-format-tools">
                      <button type="button" className="rich-bold-button" title="Bold selected summary text (Ctrl+B / Cmd+B)" aria-label="Bold selected summary text" onMouseDown={event => event.preventDefault()} onClick={toggleSummaryBold}><Bold size={15} /> Bold selection <span aria-hidden="true">(Ctrl+B)</span></button>
                      <button type="button" className="rich-bold-button" title="Remove all bold markup from summary" onClick={() => {
                        const plain = resume.summary.replace(/\*\*(.*?)\*\*/gs, "$1");
                        if (plain !== resume.summary) updateSummaryText(plain);
                      }}><Bold size={15} /> Remove all bold</button>
                      <button type="button" className="rich-bold-button" title="Undo (Ctrl+Z)" aria-label="Undo summary edit" disabled={!summaryHistory.current.past.length} onMouseDown={event => event.preventDefault()} onClick={undoSummary}><Undo2 size={15} /> Undo</button>
                      <button type="button" className="rich-bold-button" title="Redo (Ctrl+Y)" aria-label="Redo summary edit" disabled={!summaryHistory.current.future.length} onMouseDown={event => event.preventDefault()} onClick={redoSummary}><Redo2 size={15} /> Redo</button>
                    </div></div>
                  <TextArea label="About you" rows={9} inputRef={node => { summaryRef.current = node; }} value={resume.summary} placeholder="Describe your experience, expertise and accomplishments…" onChange={updateSummaryText}
                    onSelect={event => { summarySelection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
                    onKeyDown={event => {
                      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "b") {
                        event.preventDefault();
                        toggleSummaryBold();
                      } else if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "z") {
                        event.preventDefault();
                        if (event.shiftKey) redoSummary();
                        else undoSummary();
                      } else if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "y") {
                        event.preventDefault();
                        redoSummary();
                      }
                    }}
                    help="Select text for Ctrl+B / Bold. Ctrl+Z undoes formatting or typing; Ctrl+Y / Ctrl+Shift+Z redoes. **marked text** exports as bold." />
                  {resume.summary.includes("**") && <div className="formatted-preview"><span>Formatted summary</span><p><BoldPreview value={resume.summary} /></p></div>}
                  <div className="count-line">{resume.summary.trim().split(/\s+/).filter(Boolean).length} words</div>
                  <div className="tip-panel"><WandSparkles size={18} /><p><strong>Writing tip.</strong> Highlight your strengths and measurable achievements, rather than repeating your job title.</p></div>
                  <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("personal")}><ArrowLeft size={16} /> Back</button><button className="button primary-button" onClick={() => switchSection("experience")}>Continue <ArrowRight size={17} /></button></div>
                </div>
  );
}
