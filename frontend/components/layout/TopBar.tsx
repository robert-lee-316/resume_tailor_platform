"use client";

import { ArrowDownToLine, CheckCheck, CircleAlert, Download, FileText, LoaderCircle, Menu, RotateCcw } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";

export default function TopBar() {
  const { template, saved, exporting, setSidebarOpen, downloadResume, resetResume } = useResumeBuilder();
  return (
    <header className="topbar">
            <div className="topbar-left">
              <button className="mobile-menu icon-button" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(value => !value)}><Menu size={21} /></button>
              <div className="brand-wordmark"><img src="/brand/gurucorp-primary.png" alt="GuruCorp — Bright Ideas" width="688" height="184" /></div>
              <span className="breadcrumb-slash">/</span>
              <span className="topbar-location">Resume studio</span>
              <span className="topbar-badge">Workspace</span>
            </div>
            <div className="topbar-actions">
              <span className={`autosave ${saved ? "" : "unsaved"}`}>{saved ? <CheckCheck size={16} /> : <CircleAlert size={16} />}{saved ? "Saved on this device" : "Not saved"}</span>
              <span className="topbar-divider" />
              <button className="button subtle-button desktop-button" onClick={resetResume}><RotateCcw size={15} /> Reset demo</button>
              <button className="button outlined-button desktop-button" disabled={!template || Boolean(exporting)} onClick={() => void downloadResume("docx")}>
                {exporting === "docx" ? <LoaderCircle size={16} className="spin" /> : <FileText size={16} />} Word
              </button>
              <button className="button primary-button" disabled={!template || Boolean(exporting)} onClick={() => void downloadResume("pdf")}>
                {exporting === "pdf" ? <LoaderCircle size={16} className="spin" /> : <ArrowDownToLine size={16} />} <span>Download PDF</span>
              </button>
            </div>
          </header>
  );
}
