"use client";

import { BookOpen, Download, Layers3, LayoutDashboard, Settings2 } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";

export default function Sidebar() {
  const { section, styles, template, sidebarOpen, switchSection } = useResumeBuilder();
  return (
    <aside className={`side-rail ${sidebarOpen ? "rail-open" : ""}`}>
          <div className="brand-mark" aria-label="GuruCorp"><img src="/brand/gurucorp-mark.png" alt="" width="42" height="42" /></div>
          <div className="rail-separator" />
          <button title="Resume editor" aria-label="Resume editor" className={`rail-button ${section !== "template" && section !== "export" && section !== "styles" ? "active" : ""}`} onClick={() => switchSection("personal")}><LayoutDashboard size={21} /></button>
          <button title="Templates" aria-label="Templates" className={`rail-button ${section === "template" ? "active" : ""}`} onClick={() => switchSection("template")}><Layers3 size={21} /></button>
          <button title="Style settings" aria-label="Style settings" className={`rail-button ${section === "styles" ? "active" : ""}`} onClick={() => switchSection("styles")}><Settings2 size={21} /></button>
          <button title="Export" aria-label="Export" className={`rail-button ${section === "export" ? "active" : ""}`} onClick={() => switchSection("export")}><Download size={21} /></button>
          <div className="rail-spacer" />
          <button title="Documentation" aria-label="Template guide" className="rail-button" onClick={() => switchSection("template")}><BookOpen size={21} /></button>
          <div className="rail-avatar">AM</div>
        </aside>
  );
}
