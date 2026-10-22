"use client";

import { ArrowRight, CircleAlert, FileCheck2, X } from "lucide-react";
import { useResumeBuilder } from "@/context/ResumeBuilderContext";

export default function ResumeImportDialog() {
  const { resume, template, importCandidate, setImportCandidate, confirmPreviousResumeImport } = useResumeBuilder();
  return (
    <>{importCandidate && <div className="resume-import-overlay" role="presentation">
          <div className="resume-import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title">
            <div className="resume-import-heading"><div className="import-dialog-icon"><FileCheck2 size={22} /></div>
              <div><span className="eyebrow">IMPORT REVIEW</span><h2 id="import-dialog-title">Previous resume found</h2><p>{importCandidate.fileName}</p></div>
              <button type="button" className="icon-button" aria-label="Close import review" onClick={() => setImportCandidate(null)}><X size={18} /></button>
            </div>
            <p className="import-dialog-note">Review the information extracted from this resume. Confirming will update only the fields in your editor; your selected Word template stays unchanged. No template is created or downloaded.</p>
            <div className="import-summary-fields"><div><span>Candidate</span><strong>{importCandidate.resume.full_name || "Not detected"}</strong></div><div><span>Professional title</span><strong>{importCandidate.resume.job_title || "Not detected"}</strong></div><div><span>Experience</span><strong>{importCandidate.counts.experiences} positions</strong></div><div><span>Education</span><strong>{importCandidate.counts.education} entries</strong></div></div>
            {importCandidate.warnings.length > 0 && <div className="import-warnings"><CircleAlert size={17} /><div>{importCandidate.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div></div>}
            <div className="import-dialog-buttons"><button className="button outlined-button" onClick={() => setImportCandidate(null)}>Keep current resume</button><button className="button primary-button" onClick={confirmPreviousResumeImport}>Replace with imported data <ArrowRight size={16} /></button></div>
          </div>
        </div>}</>
  );
}
