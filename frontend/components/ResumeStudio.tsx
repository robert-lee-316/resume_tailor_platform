"use client";

import { FileText, PenLine } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import ResumeEditor from "@/components/editor/ResumeEditor";
import DocumentPreview from "@/components/preview/DocumentPreview";
import ResumeImportDialog from "@/components/dialogs/ResumeImportDialog";
import Toast from "@/components/feedback/Toast";

export default function ResumeStudio() {
  const { resume, mobilePanel, setMobilePanel, uploadRef, jsonRef, previousResumeRef, onPreviousResumeSelected, onTemplateSelected, importJson } = useResumeBuilder();
  return (
    <div className="shell">
        <input ref={uploadRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={onTemplateSelected} />
        <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={event => void importJson(event)} />
        <input ref={previousResumeRef} type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={event => void onPreviousResumeSelected(event)} />

        <Sidebar />

        <div className="main-frame">
          <TopBar />

          <div className="mobile-switch"><button className={mobilePanel === "edit" ? "selected" : ""} onClick={() => setMobilePanel("edit")}><PenLine size={15} /> Edit resume</button><button className={mobilePanel === "preview" ? "selected" : ""} onClick={() => setMobilePanel("preview")}><FileText size={15} /> Preview</button></div>

          <div className="workspace">
    <ResumeEditor />

            <DocumentPreview />
          </div>
        </div>
        <ResumeImportDialog />
        <Toast />
      </div>
  );
}
