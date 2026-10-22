"use client";

import {
  Activity, Bold, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, BookOpen, BriefcaseBusiness, Check,
  CheckCheck, ChevronDown, CircleAlert, CircleCheck, CloudOff, Copy, Download,
  FileCheck2, FileJson, FilePenLine, FileText, FileUp, GripVertical, GraduationCap, Layers3,
  LayoutDashboard, LoaderCircle, Mail, MapPin, Menu, MoreHorizontal, PenLine,
  Plus, RefreshCw, RotateCcw, Settings2, ShieldCheck, Sparkles, Trash2,
  UploadCloud, Undo2, Redo2, UserRound, WandSparkles, X,
} from "lucide-react";
import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode, SyntheticEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { boldSelectedText, formatEducationDates, formatExperienceDates, initialResume, formatSkillCategories, parseResumeData, reorderBullets, reorderSkillCategories, safeFilename, sections, toDatePickerValue, toRenderPayload } from "@/lib/resume";
import type { Education, Experience, ResumeData, Section, SkillCategory } from "@/lib/resume";
import { addTemplateToLibrary, loadTemplateLibrary, removeLibraryTemplate, selectLibraryTemplate } from "@/lib/template-store";
import type { SavedTemplate, TemplateLibrary } from "@/lib/template-store";
import { chooseOutputFolder, hasWritePermission, loadOutputFolder, loadWordDraft, requestWritePermission, saveOutputFolder, saveWordDraft, writeWordToFolder } from "@/lib/docx-autosave";
import type { WordDraft, WordOutputFolder } from "@/lib/docx-autosave";
import { makeSummaryHistory, recordSummaryEdit, undoSummaryEdit, redoSummaryEdit } from "@/lib/summary-history";
import type { SummarySnapshot } from "@/lib/summary-history";
import { cssTextStyle, DEFAULT_STYLES, FONT_CHOICES, parseResumeStyles, STYLE_GROUPS, STYLE_LABELS, SECTION_HEADING_KEYS, updateSharedHeadingStyle, restoreSharedHeadingStyle } from "@/lib/styles";
import type { ResumeStyles, StyleKey, TextStyle } from "@/lib/styles";
import AchievementRichInput from "./achievement-rich-input";

const RESUME_STORAGE = "folio-resume-v1";
const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;
const PLACEHOLDER_GROUPS = [
  { name: "Personal", values: ["full_name", "job_title", "email", "phone", "location", "linkedin", "summary", "skills_text"] },
  { name: "Experience (inside loop)", values: ["exp.job_title", "exp.company", "exp.dates", "exp.description", "bullet.text"] },
  { name: "Education (inside loop)", values: ["ed.degree", "ed.institution", "ed.location", "ed.dates"] },
  { name: "Skills (optional category loop)", values: ["category.name", "category.skills_text"] },
];

type TemplateInspection = { fields: string[]; loops: string[]; valid: boolean };
type BusyExport = "pdf" | "docx" | null;
type RenderState = "idle" | "generating" | "ready" | "error";
type PreviousResumeImport = { resume: ResumeData; warnings: string[]; counts: { experiences: number; education: number }; fileName: string };

function BoldPreview({ value }: { value: string }) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return <span>{parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>)}</span>;
}


function Field({ label, value, placeholder, onChange, type = "text", help, disabled = false, min }: {
  label: string; value: string; placeholder?: string; onChange: (value: string) => void;
  type?: string; help?: string; disabled?: boolean; min?: string;
}) {
  return <label className="field">
    <span className="field-label">{label}</span>
    <input type={type} value={value} placeholder={placeholder} disabled={disabled} min={min}
      onChange={event => onChange(event.target.value)} />
    {help && <span className="field-help">{help}</span>}
  </label>;
}

function TextArea({ label, value, placeholder, onChange, onKeyDown, onSelect, rows = 5, help, inputRef }: {
  label: string; value: string; placeholder?: string; onChange: (value: string) => void; rows?: number; help?: string;
  inputRef?: (node: HTMLTextAreaElement | null) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelect?: (event: SyntheticEvent<HTMLTextAreaElement>) => void;
}) {
  return <label className="field">
    <span className="field-label">{label}</span>
    <textarea ref={inputRef} value={value} placeholder={placeholder} rows={rows}
      onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} onSelect={onSelect} />
    {help && <span className="field-help">{help}</span>}
  </label>;
}

/** Display stored skills as removable tags. Only the add field is editable. */
function SkillKeywordEditor({ category, categoryIndex, onAdd, onRemove }: {
  category: SkillCategory;
  categoryIndex: number;
  onAdd: (values: string[]) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const displayed = category.skills.map((value, index) => ({ value: value.trim(), index })).filter(item => item.value);
  const remaining = Math.max(0, 40 - displayed.length);

  const commit = (raw: string) => {
    const candidates = raw.split(/[,;\n\r]+/).map(value => value.trim()).filter(Boolean);
    if (!candidates.length) return;
    onAdd(candidates);
    setDraft("");
    inputRef.current?.focus();
  };

  return <div className="skill-category-skills skill-keyword-editor" aria-label={`Skills in ${category.name || `category ${categoryIndex + 1}`}`}>
    <div className="skill-keyword-list" role="list" aria-label="Skill keywords">
      {displayed.map(({ value, index }) => <span className="skill-keyword-tag" role="listitem" key={`${category.id}-${index}`}>
        <span className="skill-keyword-label">{value}</span>
        <button type="button" className="skill-keyword-delete" onClick={() => onRemove(index)}
          title={`Remove ${value}`} aria-label={`Remove ${value} from ${category.name || `category ${categoryIndex + 1}`}`}>
          <X size={12} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </span>)}
      {!displayed.length && <span className="skill-keyword-empty">No keywords yet</span>}
    </div>
    <div className="skill-keyword-add">
      <input ref={inputRef} value={draft} maxLength={250} disabled={remaining === 0}
        placeholder={remaining === 0 ? "Skill limit reached" : "Add keywords (e.g. React, Node.js)"}
        aria-label={`New skill keyword in ${category.name || `category ${categoryIndex + 1}`}`}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit(draft);
          } else if (event.key === "Backspace" && !draft && displayed.length) {
            event.preventDefault();
            onRemove(displayed[displayed.length - 1].index);
          }
        }}
        onPaste={event => {
          const pasted = event.clipboardData.getData("text");
          if (/[,;\n\r]/.test(pasted)) {
            event.preventDefault();
            commit(draft + pasted);
          }
        }} />
      <button type="button" className="skill-keyword-add-button" disabled={!draft.trim() || remaining === 0}
        onClick={() => commit(draft)} title="Add keyword" aria-label="Add skill keyword"><Plus size={16} /></button>
    </div>
  </div>;
}

function SectionIntro({ number, eyebrow, title, subtitle, icon }: {
  number: string; eyebrow: string; title: string; subtitle: string; icon: ReactNode;
}) {
  return <div className="section-intro">
    <div className="section-numberline"><span className="section-num">{number}</span><span>{eyebrow}</span></div>
    <div className="section-intro-heading"><span className="section-icon">{icon}</span><h2>{title}</h2></div>
    <p>{subtitle}</p>
  </div>;
}

function readError(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "detail" in parsed) {
      const value = (parsed as { detail: unknown }).detail;
      if (typeof value === "string") return value;
    }
  } catch { /* upstream may return plain text */ }
  return raw.slice(0, 280) || "Unable to generate the document. Please retry.";
}

async function sampleFile(): Promise<File> {
  const response = await fetch("/templates/sample_template.docx");
  if (!response.ok) throw new Error("Could not load the sample template.");
  return new File([await response.blob()], "sample_template.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function FieldTag({ value, detected }: { value: string; detected: boolean }) {
  return <span className={`tag ${detected ? "tag-detected" : ""}`}>{`{{ ${value} }}`}{detected && <Check size={12} />}</span>;
}

function InstantResumePreview({ resume, styles, omarLayout = false }: { resume: ResumeData; styles: ResumeStyles; omarLayout?: boolean }) {
  // A fast HTML approximation of the selected Omar-style Word template.
  // Only PDF rendering reproduces actual DOCX pagination and Word metrics.
  return <article className={`instant-resume${omarLayout ? " instant-omar" : ""}`} aria-label="Instant resume draft">
    <header className="instant-resume-header">
      <h1 style={cssTextStyle(styles.name)}>{resume.full_name || "Your name"}</h1>
      <div style={cssTextStyle(styles.role)}>{resume.job_title || "Professional title"}</div>
      <p style={cssTextStyle(styles.personal)}>{[resume.phone, resume.email, resume.location, resume.linkedin].filter(Boolean).join(omarLayout ? "  /  " : "  |  ")}</p>
    </header>
    <section className="instant-resume-section instant-summary">
      {!omarLayout && <h2 style={cssTextStyle(styles.summary)}>SUMMARY</h2>}
      <div style={{...cssTextStyle(styles.summary), fontWeight: 400}} className="instant-text"><BoldPreview value={resume.summary} /></div>
    </section>
    <section className="instant-resume-section instant-skills-section">
      <h2 style={cssTextStyle(styles.skillsHeading)}> {omarLayout ? "SKILLS" : "TECHNICAL SKILLS"}</h2>
      {omarLayout ? <div className="instant-skills-plain" style={cssTextStyle(styles.skills)}>
        {resume.skill_categories.filter(cat => cat.skills.some(s => s.trim())).map(cat =>
          <p key={cat.id} style={cssTextStyle(styles.skills)}><strong>{cat.name ? `${cat.name}: ` : ""}</strong>{cat.skills.filter(Boolean).join(", ")}</p>)}
      </div> : <ul className="instant-skills" style={cssTextStyle(styles.skills)}>
        {resume.skill_categories.filter(cat => cat.skills.some(s => s.trim())).map(cat =>
          <li key={cat.id} style={{textAlign: styles.skills.align}}><strong>{cat.name ? `${cat.name}: ` : ""}</strong>{cat.skills.filter(Boolean).join(", ")}</li>)}
      </ul>}
    </section>
    <section className="instant-resume-section instant-experience-section"><h2 style={cssTextStyle(styles.experienceHeading)}>WORK EXPERIENCE</h2>
      {resume.experiences.map(exp => <div key={exp.id} className="instant-experience" style={cssTextStyle(styles.experience)}>
        {omarLayout ? <>
          <div><strong>{exp.job_title}</strong></div>
          <div className="instant-jobline"><strong>{exp.company}</strong><span>{formatExperienceDates(exp)}</span></div>
        </> : <><div className="instant-jobline"><strong>{exp.job_title}</strong><span>{formatExperienceDates(exp)}</span></div><div>{exp.company}</div></>}
        {exp.description.trim() && <p className="instant-company-description" style={cssTextStyle(styles.experienceDescription)}><BoldPreview value={exp.description} /></p>}
        <ul style={cssTextStyle(styles.experienceBullets)}>{exp.bullets.filter(b => b.text.trim()).map((bullet,index) => <li key={index} style={{textAlign: styles.experienceBullets.align}}><BoldPreview value={bullet.text} /></li>)}</ul>
      </div>)}
    </section>
    <section className="instant-resume-section instant-education-section"><h2 style={cssTextStyle(styles.educationHeading)}>EDUCATION</h2>
      {resume.education.map(edu => <div key={edu.id} className="instant-education" style={cssTextStyle(styles.education)}>
        {omarLayout ? <><div><strong>{edu.degree}</strong></div><div className="instant-jobline"><strong>{edu.institution}{edu.location.trim() ? `, ${edu.location}` : ""}</strong><span>{formatEducationDates(edu)}</span></div></>
        : <><div className="instant-jobline"><div><strong>{edu.institution}</strong> — {edu.degree}</div><span>{formatEducationDates(edu)}</span></div>{edu.location.trim() && <div>{edu.location}</div>}</>}
      </div>)}
    </section>
  </article>;
}

export default function HomePage() {
  const [resume, setResume] = useState<ResumeData>(initialResume);
  // Source and destination for native drag/drop; up/down buttons also work with a keyboard.
  const draggedAchievement = useRef<{ experienceId: string; index: number } | null>(null);
  const [achievementDropTarget, setAchievementDropTarget] = useState<{ experienceId: string; index: number } | null>(null);
  // Drag by the handle only, so users can still select and edit category/skill text.
  const draggedSkillCategory = useRef<string | null>(null);
  const [skillCategoryDropTarget, setSkillCategoryDropTarget] = useState<string | null>(null);

  const [section, setSection] = useState<Section | "styles">("personal");
  const [styles, setStyles] = useState<ResumeStyles>(DEFAULT_STYLES);
  const [selectedStyle, setSelectedStyle] = useState<StyleKey>("name");
  const [previewMode, setPreviewMode] = useState<"instant" | "pdf">("instant");
  const [template, setTemplate] = useState<File | null>(null);
  const [templateLibrary, setTemplateLibrary] = useState<SavedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateLibraryBusy, setTemplateLibraryBusy] = useState(false);
  const [inspection, setInspection] = useState<TemplateInspection | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saved, setSaved] = useState(true);
  const [wordAutosaveEnabled, setWordAutosaveEnabled] = useState(true);
  const [wordSaveStatus, setWordSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [wordSaveNote, setWordSaveNote] = useState("Not generated yet");
  const [wordSaveDate, setWordSaveDate] = useState<number | null>(null);
  const [outputFolderName, setOutputFolderName] = useState<string | null>(null);
  const outputFolder = useRef<WordOutputFolder | null>(null);
  const generatedDocx = useRef<{ template: File; json: string; draft: WordDraft } | null>(null);
  const generatingDocx = useRef(false);
  const generateDocxAgain = useRef(false);
  const runWordAutosaveRef = useRef<() => Promise<void>>(async () => {});
  const wordAutosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [previewError, setPreviewError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [exporting, setExporting] = useState<BusyExport>(null);
  const [backendHealth, setBackendHealth] = useState<"checking" | "online" | "offline">("checking");
  const [mobilePanel, setMobilePanel] = useState<"edit" | "preview">("edit");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState("");
  const [copied, setCopied] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const previousResumeRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement | null>(null);
  const summaryHistory = useRef(makeSummaryHistory(initialResume.summary));
  const summarySelection = useRef({ start: 0, end: 0 });
  const achievementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [importingPrevious, setImportingPrevious] = useState(false);
  const [importPreviousError, setImportPreviousError] = useState("");
  const [importCandidate, setImportCandidate] = useState<PreviousResumeImport | null>(null);
  const activePreview = useRef<AbortController | null>(null);
  const previewObjectUrl = useRef<string | null>(null);
  const latestJobId = useRef(0);
  // A single in-flight conversion avoids piling up expensive LibreOffice jobs.
  const previewInFlight = useRef(false);
  const previewQueued = useRef(false);
  const previewForceQueued = useRef(false);
  const latestPreviewInput = useRef({ template, resume, styles, initialized });
  latestPreviewInput.current = { template, resume, styles, initialized };
  const previewCache = useRef<{ template: File; json: string; pdf: Blob } | null>(null);
  const displayedPreview = useRef<{ template: File; json: string } | null>(null);
  const requestPreviewRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const [previewPending, setPreviewPending] = useState(false);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string) => {
    setNotification(message);
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setNotification(""), 3800);
  }, []);

  // The MVP is intentionally local-first: fields persist in localStorage and
  // the selected template persists in IndexedDB, without an account/database.
  useEffect(() => {
    let disposed = false;
    async function initialize() {
      setWordAutosaveEnabled(localStorage.getItem("gurucorp-word-autosave-v1") !== "false");
      void loadWordDraft().then(draft => {
        if (!disposed && draft) { setWordSaveDate(draft.savedAt); setWordSaveNote("Last Word copy saved in this browser"); }
      }).catch(() => {});
      void loadOutputFolder().then(async folder => {
        if (disposed || !folder) return;
        outputFolder.current = folder;
        setOutputFolderName(folder.name);
      }).catch(() => {});
      const rawStyles = localStorage.getItem("folio-resume-styles-v1");
      if (rawStyles && !disposed) { try { setStyles(parseResumeStyles(JSON.parse(rawStyles))); } catch {} }
      const raw = localStorage.getItem(RESUME_STORAGE);
      if (raw) {
        try {
          const restored = parseResumeData(JSON.parse(raw));
          if (restored && !disposed) {
            setResume(restored);
            summaryHistory.current = makeSummaryHistory(restored.summary);
          }
        } catch { /* Ignore malformed local data and load the sample. */ }
      }
      try {
        let library = await loadTemplateLibrary();
        // A new workspace starts with the built-in template available in its library.
        if (!library.items.length) library = await addTemplateToLibrary(await sampleFile());
        if (!disposed) {
          setTemplateLibrary(library.items);
          setSelectedTemplateId(library.selectedId);
          setTemplate(library.items.find(item => item.id === library.selectedId)?.file ?? null);
        }
      } catch {
        if (!disposed) setTemplateError("Could not load saved templates. Check browser storage and retry.");
      }
      if (!disposed) setInitialized(true);
    }
    void initialize();
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    setSaved(false);
    try {
      localStorage.setItem(RESUME_STORAGE, JSON.stringify(resume));
      setSaved(true);
    } catch { setSaved(false); }
  }, [resume, initialized]);

  useEffect(() => {
    if (!initialized) return;
    try { localStorage.setItem("folio-resume-styles-v1", JSON.stringify(styles)); } catch {}
  }, [styles, initialized]);
  const updateStyle = (key: StyleKey, property: keyof TextStyle, value: string | number | boolean) => {
    // Summary bold belongs to selected keywords only, never a whole-paragraph
    // override. Historical saved summary bold defaults are migrated on load.
    if (key === "summary" && property === "bold") return;
    setStyles(current => SECTION_HEADING_KEYS.some(heading => heading === key)
      ? updateSharedHeadingStyle(current, property, value)
      : { ...current, [key]: { ...current[key], [property]: value, enabled: true, changed: [...new Set([...(current[key].changed ?? []), property])] } });
  };
  const updateOptionalStyle = (key: StyleKey, property: "lineSpacing" | "spaceAfter" | "leftIndent", raw: string, min: number, max: number) => {
    setStyles(current => {
      const next = { ...current[key] };
      const parsed = Number(raw);
      if (!raw.trim() || !Number.isFinite(parsed)) delete next[property];
      else next[property] = Math.min(max, Math.max(min, parsed));
      next.enabled = true;
      next.changed = [...new Set([...(next.changed ?? []), property])];
      return { ...current, [key]: next };
    });
  };
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const result = await response.json();
      setBackendHealth(response.ok && result.libreoffice ? "online" : "offline");
    } catch { setBackendHealth("offline"); }
  }, []);
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  const inspectFile = useCallback(async (file: File): Promise<TemplateInspection | null> => {
    setInspectionLoading(true);
    try {
      const form = new FormData();
      form.set("template", file);
      const response = await fetch("/api/inspect-template", { method: "POST", body: form });
      const result: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 503) return null; // Backend offline; upload allowed but unverified.
        const detail = typeof result === "object" && result && "detail" in result ? String((result as { detail: unknown }).detail) : "Invalid Word template";
        throw new Error(detail);
      }
      return result as TemplateInspection;
    } finally { setInspectionLoading(false); }
  }, []);

  useEffect(() => {
    if (!template || !initialized) return;
    let disposed = false;
    setInspection(null);
    void inspectFile(template)
      .then(value => { if (!disposed) setInspection(value); })
      .catch(error => { if (!disposed) setTemplateError(error instanceof Error ? error.message : "Template validation failed."); });
    return () => { disposed = true; };
  }, [template, initialized, inspectFile]);

  const updateField = <K extends keyof ResumeData>(name: K, value: ResumeData[K]) => {
    setResume(current => ({ ...current, [name]: value }));
  };

  // Store editable categories and keep the older skills_text field in sync for
  // existing saved resumes, imported files, and {{ skills_text }} Word templates.
  const setSkillCategories = (update: (current: SkillCategory[]) => SkillCategory[]) => {
    setResume(current => {
      const skill_categories = update(current.skill_categories);
      return { ...current, skill_categories, skills_text: formatSkillCategories(skill_categories) };
    });
  };

  const addSkillCategory = () => setSkillCategories(current => current.length >= 30 ? current : [
    ...current, { id: crypto.randomUUID(), name: "", skills: [] },
  ]);
  const updateSkillCategory = (id: string, name: string) => setSkillCategories(current => current.map(category =>
    category.id === id ? { ...category, name } : category,
  ));
  const removeSkillCategory = (id: string) => setSkillCategories(current => current.filter(category => category.id !== id));
  const moveSkillCategory = (id: string, targetIndex: number) => setSkillCategories(current => {
    const fromIndex = current.findIndex(category => category.id === id);
    return reorderSkillCategories(current, fromIndex, targetIndex);
  });
  const handleSkillCategoryDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    draggedSkillCategory.current = id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };
  const handleSkillCategoryDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!draggedSkillCategory.current || draggedSkillCategory.current === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setSkillCategoryDropTarget(id);
  };
  const handleSkillCategoryDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    const sourceId = draggedSkillCategory.current;
    if (!sourceId) return;
    event.preventDefault();
    if (sourceId !== targetId) {
      setSkillCategories(current => reorderSkillCategories(
        current,
        current.findIndex(category => category.id === sourceId),
        current.findIndex(category => category.id === targetId),
      ));
    }
    draggedSkillCategory.current = null;
    setSkillCategoryDropTarget(null);
  };
  const handleSkillCategoryDragEnd = () => {
    draggedSkillCategory.current = null;
    setSkillCategoryDropTarget(null);
  };
  const addSkillKeywords = (id: string, candidates: string[]) => setSkillCategories(current => current.map(category => {
    if (category.id !== id) return category;
    // Imported/older resumes may contain blank skill slots. Hide and discard them
    // when adding tags, while preserving the existing order and export format.
    const skills = category.skills.map(skill => skill.trim()).filter(Boolean);
    const seen = new Set(skills.map(skill => skill.toLocaleLowerCase()));
    for (const raw of candidates) {
      const skill = raw.trim().slice(0, 250);
      if (!skill || skills.length >= 40 || seen.has(skill.toLocaleLowerCase())) continue;
      skills.push(skill);
      seen.add(skill.toLocaleLowerCase());
    }
    return { ...category, skills };
  }));
  const removeSkill = (id: string, index: number) => setSkillCategories(current => current.map(category =>
    category.id === id ? { ...category, skills: category.skills.filter((_, skillIndex) => skillIndex !== index) } : category,
  ));

  const updateExperience = (id: string, patch: Partial<Experience>) => {
    setResume(current => ({ ...current, experiences: current.experiences.map(exp => exp.id === id ? { ...exp, ...patch } : exp) }));
  };

  const addExperience = () => {
    setResume(current => ({ ...current, experiences: [
      ...current.experiences,
      { id: crypto.randomUUID(), job_title: "", company: "", description: "", dates: "", start_date: "", end_date: "", is_current: false, bullets: [{ text: "" }] },
    ] }));
  };

  const updateExperienceDate = (id: string, field: "start_date" | "end_date" | "is_current", value: string | boolean) => {
    setResume(current => ({ ...current, experiences: current.experiences.map(exp => {
      if (exp.id !== id) return exp;
      const updated: Experience = {
        ...exp,
        ...(field === "is_current" ? { is_current: value as boolean } : { [field]: value as string }),
      };
      if (updated.start_date && updated.end_date && updated.end_date < updated.start_date) updated.end_date = "";
      // The existing DOCX renderer still expects one formatted exp.dates string.
      updated.dates = updated.start_date || updated.end_date ? formatExperienceDates({ ...updated, dates: "" }) : "";
      return updated;
    }) }));
  };

  const toggleAchievementBold = (id: string, index: number) => {
    const editor = achievementRefs.current[`${id}:${index}`];
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editor.contains(selection.anchorNode)) {
      notify("Select words in the achievement field, then click Bold or press Ctrl+B.");
      return;
    }
    // Use the browser editing command so the selection stays visually bold
    // and Ctrl+Z can undo it in the editable field.
    document.execCommand("bold");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const restoreSummarySelection = (snapshot: SummarySnapshot) => {
    requestAnimationFrame(() => {
      const input = summaryRef.current;
      if (!input?.isConnected) return;
      input.focus();
      input.setSelectionRange(snapshot.start, snapshot.end);
      summarySelection.current = { start: snapshot.start, end: snapshot.end };
    });
  };

  const updateSummaryText = (text: string) => {
    const input = summaryRef.current;
    const previous = { value: resume.summary, ...summarySelection.current };
    recordSummaryEdit(summaryHistory.current, previous, text, "typing");
    // React onChange runs after browser text input: remember the new caret.
    if (input) summarySelection.current = { start: input.selectionStart, end: input.selectionEnd };
    updateField("summary", text);
  };

  const toggleSummaryBold = () => {
    const input = summaryRef.current;
    if (!input) return;
    const before = { value: resume.summary, start: input.selectionStart, end: input.selectionEnd };
    const wrapped = boldSelectedText(before.value, before.start, before.end);
    if (!wrapped) { notify("Highlight words in your summary, then press Ctrl+B or click Bold."); input.focus(); return; }
    recordSummaryEdit(summaryHistory.current, before, wrapped.text, "format");
    updateField("summary", wrapped.text);
    restoreSummarySelection({ value: wrapped.text, start: wrapped.start, end: wrapped.end });
  };

  const undoSummary = () => {
    const input = summaryRef.current;
    if (!input) return;
    const next = undoSummaryEdit(summaryHistory.current, {
      value: resume.summary, start: input.selectionStart, end: input.selectionEnd,
    });
    if (!next) return;
    updateField("summary", next.value);
    restoreSummarySelection(next);
  };

  const redoSummary = () => {
    const input = summaryRef.current;
    if (!input) return;
    const next = redoSummaryEdit(summaryHistory.current, {
      value: resume.summary, start: input.selectionStart, end: input.selectionEnd,
    });
    if (!next) return;
    updateField("summary", next.value);
    restoreSummarySelection(next);
  };

  const updateAchievement = (id: string, index: number, text: string) => {
    setResume(current => ({ ...current, experiences: current.experiences.map(exp =>
      exp.id === id ? { ...exp, bullets: exp.bullets.map((bullet, i) => i === index ? { text } : bullet) } : exp,
    ) }));
  };

  const addAchievement = (id: string) => {
    setResume(current => ({ ...current, experiences: current.experiences.map(exp =>
      exp.id === id && exp.bullets.length < 100 ? { ...exp, bullets: [...exp.bullets, { text: "" }] } : exp,
    ) }));
  };

  const removeAchievement = (id: string, index: number) => {
    setResume(current => ({ ...current, experiences: current.experiences.map(exp =>
      exp.id === id ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== index) } : exp,
    ) }));
  };

  const moveAchievement = (id: string, from: number, to: number) => {
    setResume(current => ({
      ...current,
      experiences: current.experiences.map(exp =>
        exp.id === id ? { ...exp, bullets: reorderBullets(exp.bullets, from, to) } : exp,
      ),
    }));
  };

  const handleAchievementDragStart = (event: DragEvent<HTMLButtonElement>, experienceId: string, index: number) => {
    draggedAchievement.current = { experienceId, index };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleAchievementDragOver = (event: DragEvent<HTMLDivElement>, experienceId: string, index: number) => {
    const source = draggedAchievement.current;
    if (!source || source.experienceId !== experienceId || source.index === index) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setAchievementDropTarget(previous =>
      previous?.experienceId === experienceId && previous.index === index
        ? previous
        : { experienceId, index },
    );
  };

  const handleAchievementDrop = (event: DragEvent<HTMLDivElement>, experienceId: string, index: number) => {
    const source = draggedAchievement.current;
    if (!source || source.experienceId !== experienceId) return;
    event.preventDefault();
    if (source.index !== index) moveAchievement(experienceId, source.index, index);
    draggedAchievement.current = null;
    setAchievementDropTarget(null);
  };

  const handleAchievementDragEnd = () => {
    draggedAchievement.current = null;
    setAchievementDropTarget(null);
  };

  const updateEducation = (id: string, patch: Partial<Education>) => {
    setResume(current => ({ ...current, education: current.education.map(edu => edu.id === id ? { ...edu, ...patch } : edu) }));
  };

  const addEducation = () => {
    setResume(current => ({ ...current, education: [
      ...current.education, { id: crypto.randomUUID(), degree: "", institution: "", location: "", start_date: "", end_date: "", is_current: false, dates: "" },
    ] }));
  };

  const updateEducationDate = (id: string, field: "start_date" | "end_date" | "is_current", value: string | boolean) => {
    setResume(current => ({ ...current, education: current.education.map(edu => {
      if (edu.id !== id) return edu;
      const updated: Education = { ...edu, ...(field === "is_current" ? { is_current: value as boolean } : { [field]: value as string }) };
      if (updated.start_date && updated.end_date && updated.end_date < updated.start_date) updated.end_date = "";
      updated.dates = updated.start_date || updated.end_date ? formatEducationDates({ ...updated, dates: "" }) : "";
      return updated;
    }) }));
  };

  // Previous-resume import only extracts data for the editor. It must never
  // generate, replace, persist, or automatically download a Word template.
  const onPreviousResumeSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportPreviousError("");
    setImportCandidate(null);
    if (!/\.(docx|pdf)$/i.test(file.name) || !file.size || file.size > MAX_TEMPLATE_BYTES) {
      setImportPreviousError("Choose a DOCX or selectable-text PDF resume smaller than 5 MB.");
      return;
    }
    setImportingPrevious(true);
    try {
      const form = new FormData();
      form.set("file", file, file.name);
      const response = await fetch("/api/import-resume", { method: "POST", body: form });
      if (!response.ok) throw new Error(readError(await response.text()));
      const json: unknown = await response.json();
      if (!json || typeof json !== "object" || !("resume" in json)) throw new Error("Invalid server response.");
      const result = json as { resume: unknown; warnings?: unknown };
      const parsed = parseResumeData(result.resume);
      if (!parsed) throw new Error("Could not validate the extracted resume data.");
      setImportCandidate({
        resume: parsed,
        warnings: Array.isArray(result.warnings)
          ? result.warnings.filter((w): w is string => typeof w === "string")
          : [],
        counts: { experiences: parsed.experiences.length, education: parsed.education.length },
        fileName: file.name,
      });
    } catch (error) {
      setImportPreviousError(error instanceof Error ? error.message : "Could not import resume information.");
    } finally {
      setImportingPrevious(false);
    }
  };

  const confirmPreviousResumeImport = () => {
    if (!importCandidate) return;
    setResume(importCandidate.resume);
    summaryHistory.current = makeSummaryHistory(importCandidate.resume.summary);
    setSection("personal");
    setImportCandidate(null);
    notify("Resume details imported. Your Word template was not changed or downloaded.");
  };

  const setActiveLibrary = (library: TemplateLibrary) => {
    setTemplateLibrary(library.items);
    setSelectedTemplateId(library.selectedId);
    const active = library.items.find(item => item.id === library.selectedId);
    setTemplate(active?.file ?? null);
    setInspection(null);
    setTemplateError("");
  };

  const applyTemplate = useCallback(async (file: File) => {
    setTemplateError("");
    if (!file.name.toLowerCase().endsWith(".docx")) { setTemplateError("Only .docx Word templates are supported."); setSection("template"); return; }
    if (!file.size || file.size > MAX_TEMPLATE_BYTES) { setTemplateError("The Word file must be between 1 byte and 5 MB."); setSection("template"); return; }
    setTemplateLibraryBusy(true);
    try {
      // Validate before adding a file to the reusable library.
      const result = await inspectFile(file);
      const library = await addTemplateToLibrary(file);
      setActiveLibrary(library);
      setInspection(result);
      setSection("template");
      notify(`${file.name} added to your template library and selected.`);
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : "Could not add the Word template.");
      setSection("template");
    } finally { setTemplateLibraryBusy(false); }
  }, [inspectFile, notify]);

  const chooseTemplate = async (id: string) => {
    if (id === selectedTemplateId || templateLibraryBusy) return;
    setTemplateLibraryBusy(true);
    try {
      const library = await selectLibraryTemplate(id);
      setActiveLibrary(library);
      notify("Template selected. Your resume information has been preserved.");
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : "Could not select template.");
    } finally { setTemplateLibraryBusy(false); }
  };

  const deleteTemplate = async (id: string) => {
    const chosen = templateLibrary.find(item => item.id === id);
    if (!chosen || !window.confirm(`Remove \"${chosen.name}\" from your template library? Your resume information will not be deleted.`)) return;
    setTemplateLibraryBusy(true);
    try {
      const library = await removeLibraryTemplate(id);
      setActiveLibrary(library);
      notify("Template removed. Your resume information is unchanged.");
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : "Could not remove template.");
    } finally { setTemplateLibraryBusy(false); }
  };

  const onTemplateSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void applyTemplate(file);
  };

  const onDropTemplate = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void applyTemplate(file);
  };

  const generateForm = useCallback((format: "pdf" | "docx", selectedTemplate: File, data: ResumeData, currentStyles: ResumeStyles) => {
    const form = new FormData();
    form.set("template", selectedTemplate, selectedTemplate.name);
    form.set("resume_json", JSON.stringify({ ...toRenderPayload(data), _styles: currentStyles }));
    form.set("format", format);
    return form;
  }, []);

  const generatePreview = useCallback(async (force = false) => {
    const { template: selected, resume: data, styles: currentStyles, initialized: ready } = latestPreviewInput.current;
    if (!selected || !ready) return;
    const json = JSON.stringify({ ...toRenderPayload(data), _styles: currentStyles });
    const previous = previewCache.current;
    if (!force && previous?.template === selected && previous.json === json) {
      if (displayedPreview.current?.template !== selected || displayedPreview.current.json !== json) {
        const url = URL.createObjectURL(previous.pdf);
        const oldUrl = previewObjectUrl.current;
        previewObjectUrl.current = url;
        displayedPreview.current = { template: selected, json };
        setPreviewUrl(url);
        if (oldUrl) setTimeout(() => URL.revokeObjectURL(oldUrl), 2500);
        setPreviewRevision(latestJobId.current);
      }
      setPreviewPending(false);
      setRenderState("ready");
      return; // No changes since last successful render.
    }
    if (previewInFlight.current) {
      previewQueued.current = true;
      previewForceQueued.current ||= force;
      return; // Important: do not start another LibreOffice process.
    }
    previewInFlight.current = true;
    const id = ++latestJobId.current;
    const controller = new AbortController();
    activePreview.current = controller;
    setPreviewPending(true);
    setRenderState("generating");
    setPreviewError("");
    try {
      const response = await fetch("/api/render", {
        method: "POST", body: generateForm("pdf", selected, data, currentStyles), signal: controller.signal,
      });
      if (!response.ok) throw new Error(readError(await response.text()));
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (blob.type && !blob.type.includes("pdf")) throw new Error("The server did not return a PDF document.");
      previewCache.current = { template: selected, json, pdf: blob };
      const latest = latestPreviewInput.current;
      const isCurrent = selected === latest.template && json === JSON.stringify({ ...toRenderPayload(latest.resume), _styles: latest.styles });
      // Keep the last good preview visible while edits are queued; never flash
      // an out-of-date document as though it were the final result.
      if (isCurrent) {
        const url = URL.createObjectURL(blob);
        const oldUrl = previewObjectUrl.current;
        previewObjectUrl.current = url;
        displayedPreview.current = { template: selected, json };
        setPreviewUrl(url);
        if (oldUrl) setTimeout(() => URL.revokeObjectURL(oldUrl), 2500);
        setPreviewRevision(id);
        setPreviewPending(false);
        setRenderState("ready");
      }
      setBackendHealth("online");
    } catch (error) {
      if (controller.signal.aborted) return;
      const latest = latestPreviewInput.current;
      const isCurrent = selected === latest.template && json === JSON.stringify({ ...toRenderPayload(latest.resume), _styles: latest.styles });
      if (isCurrent) {
        setPreviewError(error instanceof Error ? error.message : "Preview generation failed.");
        setPreviewPending(false);
        setRenderState("error");
      }
    } finally {
      previewInFlight.current = false;
      if (activePreview.current === controller) activePreview.current = null;
      if (previewQueued.current) {
        const retryForce = previewForceQueued.current;
        previewQueued.current = false;
        previewForceQueued.current = false;
        // Pick up the *latest* resume after the current conversion finishes.
        queueMicrotask(() => void requestPreviewRef.current(retryForce));
      }
    }
  }, [generateForm]);
  requestPreviewRef.current = generatePreview;

  useEffect(() => {
    if (!initialized || !template) return;
    setPreviewPending(true);
    // Most edits should be grouped into one render. The previous PDF stays
    // visible, so the user can continue editing without a blank preview panel.
    if (previewMode !== "pdf") return;
    const timer = setTimeout(() => void generatePreview(), 900);
    return () => clearTimeout(timer);
  }, [initialized, template, resume, styles, previewMode, generatePreview]);

  useEffect(() => () => {
    if (wordAutosaveTimer.current) clearTimeout(wordAutosaveTimer.current);
    activePreview.current?.abort();
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
  }, []);

  // A Word draft is generated only after typing has paused. This is a separate
  // output from the original uploaded template (which always keeps its tokens).
  const runWordAutosave = useCallback(async () => {
    if (!wordAutosaveEnabled) return;
    const latest = latestPreviewInput.current;
    if (!latest.initialized || !latest.template) return;
    const selected = latest.template;
    const json = JSON.stringify({ ...toRenderPayload(latest.resume), _styles: latest.styles });
    const cached = generatedDocx.current;
    if (cached?.template === selected && cached.json === json) return;
    if (generatingDocx.current) { generateDocxAgain.current = true; return; }
    generatingDocx.current = true;
    setWordSaveStatus("saving");
    setWordSaveNote("Generating Word document…");
    try {
      const response = await fetch("/api/render", {
        method: "POST", body: generateForm("docx", selected, latest.resume, latest.styles),
      });
      if (!response.ok) throw new Error(readError(await response.text()));
      const blob = await response.blob();
      const now = latestPreviewInput.current;
      const nowJson = JSON.stringify({ ...toRenderPayload(now.resume), _styles: now.styles });
      if (now.template !== selected || nowJson !== json) {
        generateDocxAgain.current = true;
        return; // Never save stale content as the latest draft.
      }
      const filename = `${safeFilename(latest.resume.full_name)}-resume.docx`;
      const draft: WordDraft = { blob, filename, savedAt: Date.now(), signature: json };
      await saveWordDraft(draft);
      generatedDocx.current = { template: selected, json, draft };
      setWordSaveDate(draft.savedAt);
      const folder = outputFolder.current;
      if (folder && await hasWritePermission(folder)) {
        await writeWordToFolder(folder, filename, blob);
        setWordSaveNote(`Saved to ${folder.name}/${filename}`);
      } else if (folder) {
        setWordSaveNote("Saved in browser; reconnect folder to write to your PC");
      } else {
        setWordSaveNote("Saved in this browser; choose a folder to save on your PC");
      }
      setWordSaveStatus("saved");
    } catch (error) {
      setWordSaveStatus("error");
      setWordSaveNote(error instanceof Error ? error.message : "Could not autosave the Word document");
    } finally {
      generatingDocx.current = false;
      if (generateDocxAgain.current) {
        generateDocxAgain.current = false;
        if (wordAutosaveTimer.current) clearTimeout(wordAutosaveTimer.current);
        wordAutosaveTimer.current = setTimeout(() => void runWordAutosaveRef.current(), 750);
      }
    }
  }, [wordAutosaveEnabled, generateForm]);
  runWordAutosaveRef.current = runWordAutosave;

  useEffect(() => {
    if (!initialized || !template || !wordAutosaveEnabled) return;
    setWordSaveStatus("idle");
    setWordSaveNote("Changes detected · waiting to generate DOCX");
    const timer = setTimeout(() => void runWordAutosaveRef.current(), 1800);
    return () => clearTimeout(timer);
  }, [initialized, template, resume, styles, wordAutosaveEnabled]);

  const setWordAutosave = (enabled: boolean) => {
    setWordAutosaveEnabled(enabled);
    try { localStorage.setItem("gurucorp-word-autosave-v1", String(enabled)); } catch {}
    if (!enabled) { setWordSaveStatus("idle"); setWordSaveNote("Automatic DOCX generation is off"); }
  };

  const connectOutputFolder = async () => {
    try {
      // File-system permission prompts must originate from a user interaction.
      // Reuse the existing folder if it only needs renewed permission.
      let folder = outputFolder.current;
      if (folder) {
        const allowed = await requestWritePermission(folder);
        if (!allowed) { notify("Folder permission was not granted."); return; }
      } else {
        folder = await chooseOutputFolder();
        const allowed = await requestWritePermission(folder);
        if (!allowed) { notify("Folder permission was not granted."); return; }
        await saveOutputFolder(folder);
      }
      outputFolder.current = folder;
      setOutputFolderName(folder.name);
      setWordAutosave(true);
      // Save the latest already generated document immediately when possible.
      const existing = generatedDocx.current;
      const latest = latestPreviewInput.current;
      const json = JSON.stringify({ ...toRenderPayload(latest.resume), _styles: latest.styles });
      if (existing && existing.template === latest.template && existing.json === json) {
        await writeWordToFolder(folder, existing.draft.filename, existing.draft.blob);
        setWordSaveStatus("saved");
        setWordSaveNote(`Saved to ${folder.name}/${existing.draft.filename}`);
      } else {
        void runWordAutosaveRef.current();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      notify(error instanceof Error ? error.message : "Could not access the selected folder.");
    }
  };

  const downloadLastWordDraft = async () => {
    try {
      const draft = await loadWordDraft();
      if (!draft) { notify("No saved Word document yet."); return; }
      const url = URL.createObjectURL(draft.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = draft.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { notify("Could not retrieve the saved Word document."); }
  };

  const downloadResume = useCallback(async (format: "pdf" | "docx") => {
    if (!template || exporting) return;
    setExporting(format);
    try {
      const cached = previewCache.current;
      const currentJson = JSON.stringify({ ...toRenderPayload(resume), _styles: styles });
      let blob: Blob;
      if (format === "pdf" && cached?.template === template && cached.json === currentJson) {
        blob = cached.pdf; // Download the exact preview without another conversion.
      } else if (format === "docx" && generatedDocx.current?.template === template && generatedDocx.current.json === currentJson) {
        blob = generatedDocx.current.draft.blob; // Reuse the latest autosaved Word document.
      } else {
        const response = await fetch("/api/render", { method: "POST", body: generateForm(format, template, resume, styles) });
        if (!response.ok) throw new Error(readError(await response.text()));
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFilename(resume.full_name)}-resume.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify(`${format.toUpperCase()} download is ready.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Download failed.");
    } finally { setExporting(null); }
  }, [template, resume, styles, exporting, generateForm, notify]);

  const downloadJson = () => {
    const json = new Blob([JSON.stringify({ ...resume, _styles: styles }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(json);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename(resume.full_name)}-resume-data.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notify("Resume data backup saved.");
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 150 * 1024) { notify("JSON file must be smaller than 150 KB."); return; }
    try {
      const rawData = JSON.parse(await file.text());
      const parsed = parseResumeData(rawData);
      if (!parsed) throw new Error("The file does not match the resume data format.");
      if (rawData && typeof rawData === "object" && "_styles" in rawData) setStyles(parseResumeStyles(rawData._styles));
      setResume(parsed);
      summaryHistory.current = makeSummaryHistory(parsed.summary);
      setSection("personal");
      notify("Resume data imported successfully.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not import JSON file."); }
  };

  const resetResume = () => {
    if (!window.confirm("Replace the current resume with the sample data? Your existing changes will be lost.")) return;
    setResume(structuredClone(initialResume));
    summaryHistory.current = makeSummaryHistory(initialResume.summary);
    setSection("personal");
    notify("Sample resume restored.");
  };

  const copyFields = async () => {
    await navigator.clipboard.writeText(PLACEHOLDER_GROUPS.flatMap(group => group.values.map(value => `{{ ${value} }}`)).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchSection = (next: Section | "styles") => {
    setSection(next);
    setSidebarOpen(false);
    setMobilePanel("edit");
  };

  const completedSections = [
    Boolean(resume.full_name.trim() && resume.email.trim()),
    Boolean(resume.summary.trim()),
    resume.experiences.some(exp => Boolean(exp.job_title.trim() && exp.company.trim())),
    resume.education.some(edu => Boolean(edu.degree.trim() && edu.institution.trim())),
    Boolean(resume.skills_text.trim()),
  ];
  const filled = completedSections.filter(Boolean).length;
  // The PDF iframe is a static snapshot. While the Word/PDF worker is catching
  // up, show the CURRENT editable draft rather than leaving an old PDF on screen.
  // Compare data AND typography so a font change is visible immediately.
  const exactPreviewIsStale = previewMode === "pdf" && Boolean(template) && (
    displayedPreview.current?.template !== template ||
    displayedPreview.current?.json !== JSON.stringify({ ...toRenderPayload(resume), _styles: styles })
  );
  const showInstantDraft = previewMode === "instant" || exactPreviewIsStale;

  return <div className="shell">
    <input ref={uploadRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={onTemplateSelected} />
    <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={event => void importJson(event)} />
    <input ref={previousResumeRef} type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={event => void onPreviousResumeSelected(event)} />

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

    <div className="main-frame">
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

      <div className="mobile-switch"><button className={mobilePanel === "edit" ? "selected" : ""} onClick={() => setMobilePanel("edit")}><PenLine size={15} /> Edit resume</button><button className={mobilePanel === "preview" ? "selected" : ""} onClick={() => setMobilePanel("preview")}><FileText size={15} /> Preview</button></div>

      <div className="workspace">
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

            {section === "personal" && <div className="editor-content">
              <div className="import-old-resume">
                <div><strong><FileUp size={16} /> Already have a resume?</strong><p>Upload an existing Word or PDF resume to fill in your details. Review the extracted information before applying it. Your selected Word template will not be changed.</p></div>
                <button className="button outlined-button" disabled={importingPrevious} onClick={() => previousResumeRef.current?.click()}>
                  {importingPrevious ? <LoaderCircle size={16} className="spin" /> : <FileUp size={16} />} {importingPrevious ? "Reading resume…" : "Import previous resume"}
                </button>
                {importPreviousError && <p className="inline-import-error" role="alert">{importPreviousError}</p>}
              </div>
              <SectionIntro number="01" eyebrow="THE BASICS" title="Personal details" subtitle="Start with the essentials. Make it easy for people to reach you." icon={<UserRound size={21} />} />
              <div className="field-grid">
                <Field label="Full name" placeholder="e.g. Alex Morgan" value={resume.full_name} onChange={value => updateField("full_name", value)} />
                <Field label="Professional title" placeholder="e.g. Software Engineer" value={resume.job_title} onChange={value => updateField("job_title", value)} />
                <Field label="Email address" type="email" value={resume.email} placeholder="alex@example.com" onChange={value => updateField("email", value)} />
                <Field label="Phone number" type="tel" value={resume.phone} placeholder="+1 (555) 123-4567" onChange={value => updateField("phone", value)} />
                <div className="full-span"><Field label="Location" value={resume.location} placeholder="Austin, TX" onChange={value => updateField("location", value)} /></div>
                <div className="full-span"><Field label="LinkedIn profile" type="url" value={resume.linkedin} placeholder="https://www.linkedin.com/in/your-profile" onChange={value => updateField("linkedin", value)} help="Add your LinkedIn profile link (optional)." /></div>
              </div>
              <div className="tip-panel"><ShieldCheck size={18} /><p><strong>Privacy first.</strong> Resume information and your selected template are saved in this browser. Uploaded documents are processed by your local backend when importing or exporting. Importing never replaces your chosen template.</p></div>
              <div className="form-footer"><span>Step 1 of 5</span><button className="button primary-button" onClick={() => switchSection("summary")}>Continue <ArrowRight size={17} /></button></div>
            </div>}

            {section === "summary" && <div className="editor-content">
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
            </div>}

            {section === "experience" && <div className="editor-content">
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
                          <span className="achievement-dot" aria-hidden="true">•</span>
                          <AchievementRichInput value={bullet.text}
                            inputRef={node => { achievementRefs.current[`${exp.id}:${bulletIndex}`] = node; }}
                            label={`Achievement ${bulletIndex + 1} for position ${index + 1}`}
                            placeholder={bulletIndex === 0 ? "e.g. Reduced API response time by 35%" : "Enter another achievement"}
                            onChange={value => updateAchievement(exp.id, bulletIndex, value)}
                            onEnter={() => addAchievement(exp.id)} />
                          <button type="button" className="achievement-bold-button" aria-label={`Bold selected words in achievement ${bulletIndex + 1}`}
                            title="Bold highlighted keywords (Ctrl+B)" onMouseDown={event => event.preventDefault()}
                            onClick={() => toggleAchievementBold(exp.id, bulletIndex)}><Bold size={15} /></button>
                          <div className="achievement-order-controls">
                            <button type="button" className="achievement-order-button"
                              disabled={bulletIndex === 0} title="Move bullet up"
                              aria-label={`Move achievement ${bulletIndex + 1} up for position ${index + 1}`}
                              onClick={() => moveAchievement(exp.id, bulletIndex, bulletIndex - 1)}
                            ><ArrowUp size={15} /></button>
                            <button type="button" className="achievement-order-button"
                              disabled={bulletIndex === exp.bullets.length - 1} title="Move bullet down"
                              aria-label={`Move achievement ${bulletIndex + 1} down for position ${index + 1}`}
                              onClick={() => moveAchievement(exp.id, bulletIndex, bulletIndex + 1)}
                            ><ArrowDown size={15} /></button>
                          </div>
                          <button type="button" className="icon-button remove" title="Remove achievement"
                            aria-label={`Remove achievement ${bulletIndex + 1} from position ${index + 1}`}
                            onClick={() => removeAchievement(exp.id, bulletIndex)}><Trash2 size={16} /></button>
                          {bullet.text.includes("**") && <div className="achievement-formatted-preview"><BoldPreview value={bullet.text} /></div>}
                        </div>)}
                        {exp.bullets.length === 0 && <p className="achievement-empty">No achievements added yet. Click “Add bullet” to begin.</p>}
                      </div>
                      <span className="field-help">Highlight important words and click B (or Ctrl+B) to bold them in Word/PDF. Drag to reorder or use ↑ / ↓. Press Enter to add a bullet.</span>
                    </div>
                  </div>
                </div>)}
              </div>
              <button className="add-card" onClick={addExperience}><Plus size={18} /> Add another position</button>
              <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("summary")}><ArrowLeft size={16} /> Back</button><button className="button primary-button" onClick={() => switchSection("education")}>Continue <ArrowRight size={17} /></button></div>
            </div>}

            {section === "education" && <div className="editor-content">
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
            </div>}

            {section === "skills" && <div className="editor-content">
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
                    <button type="button" className="skill-category-move" disabled={categoryIndex === 0}
                      aria-label={`Move ${category.name || `category ${categoryIndex + 1}`} up`}
                      title="Move category up"
                      onClick={() => moveSkillCategory(category.id, categoryIndex - 1)}><ArrowUp size={15} /></button>
                    <button type="button" className="skill-category-move" disabled={categoryIndex === resume.skill_categories.length - 1}
                      aria-label={`Move ${category.name || `category ${categoryIndex + 1}`} down`}
                      title="Move category down"
                      onClick={() => moveSkillCategory(category.id, categoryIndex + 1)}><ArrowDown size={15} /></button>
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
            </div>}

            {section === "styles" && <div className="editor-content style-settings-panel">
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
                <div className="style-field-grid">
                  <label className="field"><span className="field-label">Font family</span><select value={styles[selectedStyle].font} onChange={e => updateStyle(selectedStyle, "font", e.target.value)}><option value="">Use Word template font</option>{FONT_CHOICES.map(font => <option key={font} value={font}>{font}</option>)}</select></label>
                  <label className="field"><span className="field-label">Size (pt)</span><input type="number" min={7} max={36} step={0.5} value={styles[selectedStyle].size} onChange={e => updateStyle(selectedStyle, "size", Number(e.target.value))} /></label>
                  <label className="field"><span className="field-label">Text alignment</span><select value={styles[selectedStyle].align} onChange={e => updateStyle(selectedStyle, "align", e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label>
                  <label className="field"><span className="field-label">Text color</span><input type="color" value={styles[selectedStyle].color} onChange={e => updateStyle(selectedStyle, "color", e.target.value)} /></label>
                </div>
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
                  <div className="heading-style-controls">
                    <label className="field"><span className="field-label">Font family</span><select aria-label="Section heading font family" value={styles.skillsHeading.font} onChange={e => updateStyle("skillsHeading", "font", e.target.value)}><option value="">Use Word template font</option>{FONT_CHOICES.map(font => <option key={font} value={font}>{font}</option>)}</select></label>
                    <label className="field"><span className="field-label">Size (pt)</span><input aria-label="Section heading font size" type="number" min={7} max={36} step={0.5} value={styles.skillsHeading.size} onChange={e => { const size = Number(e.target.value); if (Number.isFinite(size) && size >= 7 && size <= 36) updateStyle("skillsHeading", "size", size); }} /></label>
                    <label className="field"><span className="field-label">Alignment</span><select aria-label="Section heading alignment" value={styles.skillsHeading.align} onChange={e => updateStyle("skillsHeading", "align", e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label>
                    <label className="field"><span className="field-label">Text color</span><input aria-label="Section heading text color" type="color" value={styles.skillsHeading.color} onChange={e => updateStyle("skillsHeading", "color", e.target.value)} /></label>
                  </div>
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
            </div>}

            {section === "template" && <div className="editor-content">
              <SectionIntro number="02" eyebrow="MAKE IT YOURS" title="Template library" subtitle="Upload multiple .docx templates, and select the design to use for this resume." icon={<Layers3 size={21} />} />
              <div className={`dropzone ${dragging ? "dragging" : ""}`} role="button" tabIndex={0} onClick={() => uploadRef.current?.click()} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") uploadRef.current?.click(); }} onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { event.preventDefault(); setDragging(false); }} onDragOver={event => event.preventDefault()} onDrop={onDropTemplate}>
                <div className="upload-icon"><UploadCloud size={26} /></div>
                <strong>Drop your Word template here</strong>
                <p>or <span>browse files</span> from your computer</p>
                <small>DOCX format · Up to 5 MB</small>
              </div>
              {templateError && <div className="inline-error" role="alert"><CircleAlert size={18} /><span>{templateError}</span></div>}
              <div className="template-library-section">
                <div className="template-library-heading">
                  <div><strong>My template library</strong><p>Choose a saved template for this resume. Your information stays the same when you switch designs.</p></div>
                  <span className="template-library-count">{templateLibrary.length} saved</span>
                </div>
                {templateLibraryBusy && <p className="template-library-status"><LoaderCircle className="spin" size={14} /> Updating library…</p>}
                <div className="template-library-list" role="radiogroup" aria-label="Select resume template">
                  {templateLibrary.map(item => {
                    const active = item.id === selectedTemplateId;
                    return <div key={item.id} className={`template-library-item ${active ? "active" : ""}`}>
                      <button type="button" role="radio" aria-checked={active} className="template-library-select" disabled={templateLibraryBusy}
                        onClick={() => void chooseTemplate(item.id)}>
                        <span className="template-library-file-icon"><FileText size={20} /></span>
                        <span className="template-library-file-details"><strong title={item.name}>{item.name}</strong><small>{(item.file.size / 1024).toFixed(1)} KB · Added {new Date(item.addedAt).toLocaleDateString()}</small></span>
                        <span className={`template-library-indicator ${active ? "active" : ""}`}>{active ? <><CircleCheck size={16} /> Selected</> : "Use template"}</span>
                      </button>
                      <button type="button" className="template-library-remove" disabled={templateLibraryBusy} title={`Remove ${item.name}`} aria-label={`Remove ${item.name}`} onClick={() => void deleteTemplate(item.id)}><Trash2 size={17}/></button>
                    </div>;
                  })}
                  {!templateLibrary.length && <p className="template-library-empty">No saved templates. Upload a DOCX file to add your first design.</p>}
                </div>
                {template && <p className="template-library-current"><Check size={14} /> Active: <strong>{template.name}</strong> · {inspectionLoading ? "Validating…" : inspection ? "Valid template" : "Validation pending"}</p>}
              </div>
              <button className="sample-template-link" onClick={() => { void sampleFile().then(applyTemplate).catch(() => notify("Could not load the sample template.")); }}><RefreshCw size={15} /> Use the included sample template</button>
              <div className="template-instructions"><div className="instructions-head"><div><strong>Supported placeholders</strong><p>Add these fields directly inside your Word template.</p></div><button className="icon-button" title="Copy supported fields" aria-label="Copy supported fields" onClick={() => void copyFields()}>{copied ? <Check size={17} /> : <Copy size={17} />}</button></div>
                {PLACEHOLDER_GROUPS.map(group => <div className="placeholder-group" key={group.name}><strong>{group.name}</strong><div className="placeholder-tags">{group.values.map(value => <FieldTag key={value} value={value} detected={Boolean(inspection?.fields.includes(value))} />)}</div></div>)}
                <div className="loop-note">Repeating sections use <code>{"{%p for exp in experiences %}"}</code> and <code>{"{%p endfor %}"}</code>. Use <code>ed</code> for education, <code>bullet</code> for achievements, and optional <code>category</code> for <code>skill_categories</code>. Each control tag must be in its own Word paragraph.</div>
              </div>
              <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("skills")}><ArrowLeft size={16} /> Back</button><button className="button primary-button" onClick={() => switchSection("export")}>Next: export <ArrowRight size={17} /></button></div>
            </div>}

            {section === "export" && <div className="editor-content">
              <SectionIntro number="03" eyebrow="READY TO GO" title="Download your resume" subtitle="Your resume is created from your own Word template." icon={<FileCheck2 size={21} />} />
              <div className="export-cards">
                <button disabled={!template || Boolean(exporting)} className="export-choice" onClick={() => void downloadResume("pdf")}><div className="export-icon pdf"><FileText size={25} /></div><div><strong>PDF document</strong><small>Best for job applications and sharing</small></div>{exporting === "pdf" ? <LoaderCircle size={19} className="spin" /> : <ArrowDownToLine size={19} />}</button>
                <button disabled={!template || Boolean(exporting)} className="export-choice" onClick={() => void downloadResume("docx")}><div className="export-icon doc"><FileText size={25} /></div><div><strong>Word document</strong><small>Fully editable Microsoft Word file</small></div>{exporting === "docx" ? <LoaderCircle size={19} className="spin" /> : <ArrowDownToLine size={19} />}</button>
              </div>
              <div className="word-autosave-panel">
                <div className="word-autosave-header"><div><strong><FileCheck2 size={18} /> Auto-save Word document</strong><p>Generate an updated .docx after you stop typing. Your uploaded placeholder template stays unchanged.</p></div>
                  <label className="word-autosave-toggle"><input aria-label="Auto-save generated Word document" type="checkbox" checked={wordAutosaveEnabled} onChange={event => setWordAutosave(event.target.checked)} /> On</label>
                </div>
                <p className={`word-autosave-message ${wordSaveStatus}`} role="status">
                  {wordSaveStatus === "saving" ? <LoaderCircle className="spin" size={15} /> : wordSaveStatus === "saved" ? <CheckCheck size={15} /> : <FileText size={15} />}
                  {wordSaveNote}{wordSaveDate ? ` · ${new Date(wordSaveDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
                </p>
                <div className="word-autosave-actions">
                  <button className="button outlined-button" type="button" onClick={() => void connectOutputFolder()}><UploadCloud size={16} /> {outputFolderName ? `Reconnect: ${outputFolderName}` : "Choose auto-save folder"}</button>
                  <button className="button subtle-button" type="button" onClick={() => void downloadLastWordDraft()}><Download size={16} /> Download saved DOCX</button>
                </div>
                <p className="word-autosave-help">Automatic disk saving needs a folder you explicitly authorize in Chrome or Edge. Otherwise the latest generated Word file is kept privately in this browser.</p>
              </div>
              <div className="export-separator">DATA & BACKUP</div>
              <div className="backup-actions"><button className="button outlined-button" onClick={downloadJson}><FileJson size={17} /> Save resume data</button><button className="button outlined-button" onClick={() => jsonRef.current?.click()}><FileUp size={17} /> Import JSON backup</button></div>
              <button className="button outlined-button resume-import-export" onClick={() => previousResumeRef.current?.click()} disabled={importingPrevious}><FileUp size={17} /> {importingPrevious ? "Reading document…" : "Import previous Word / PDF resume"}</button>
              {importPreviousError && <p className="inline-import-error" role="alert">{importPreviousError}</p>}
              <div className="tip-panel"><ShieldCheck size={18} /><p><strong>Built around your template.</strong> Word is generated first, then converted into the PDF you see on the right.</p></div>
              <div className="form-footer"><button className="button subtle-button" onClick={() => switchSection("template")}><ArrowLeft size={16} /> Back to template</button></div>
            </div>}
          </div>
          <div className="editor-bottom"><span><span className={`status-dot ${backendHealth === "online" ? "green" : backendHealth === "offline" ? "red" : "amber"}`} /> {backendHealth === "online" ? "Document engine connected" : backendHealth === "offline" ? "Document engine offline" : "Checking connection"}</span><button onClick={() => { void checkHealth(); void generatePreview(true); }}><RefreshCw size={14} /> Recheck</button></div>
        </main>

        <section className={`preview-panel ${mobilePanel === "edit" ? "mobile-hidden" : ""}`} aria-label="Resume preview">
          <div className="preview-toolbar"><div className="preview-toolbar-left"><span className="preview-eyebrow">LIVE DOCUMENT PREVIEW</span><span className="preview-tag"><span className="live-dot" /> {previewMode === "instant" ? "Instant draft" : "Exact Word layout"}</span></div><div className="preview-toolbar-right"><label className="quick-template-choice"><span className="sr-only">Active Word template</span><Layers3 size={14} /><select aria-label="Active Word template" value={selectedTemplateId ?? ""} disabled={templateLibraryBusy || !templateLibrary.length} onChange={event => void chooseTemplate(event.target.value)}>{!templateLibrary.length && <option value="">No template</option>}{templateLibrary.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="preview-mode-switch" role="group" aria-label="Preview mode"><button className={previewMode === "instant" ? "selected" : ""} onClick={() => setPreviewMode("instant")}>Instant</button><button className={previewMode === "pdf" ? "selected" : ""} onClick={() => setPreviewMode("pdf")}>Exact PDF</button></div><button className="preview-refresh" title="Refresh exact PDF" aria-label="Refresh exact PDF" disabled={!template || renderState === "generating"} onClick={() => { setPreviewMode("pdf"); void generatePreview(true); }}><RefreshCw size={17} className={renderState === "generating" ? "spin" : ""} /></button></div></div>
          <div className="preview-stage">
            {showInstantDraft ? <div className="instant-paper-wrap"><InstantResumePreview resume={resume} styles={styles} omarLayout={/omar/i.test(template?.name ?? "")} /></div> : previewUrl ? <div className="paper-wrap"><iframe title="Generated PDF resume preview" src={`${previewUrl}#toolbar=0&navpanes=0&zoom=page-width`} className="pdf-frame" /></div> : <div className="empty-preview"><div className="empty-paper"><img alt="Example one-page resume output" src="/images/sample-resume.png" /></div><div className="empty-overlay"><div className="empty-state-icon">{renderState === "generating" ? <LoaderCircle className="spin" size={26} /> : <FileText size={26} />}</div><strong>{renderState === "generating" ? "Building your preview" : renderState === "error" ? "Preview unavailable" : "Your resume preview"}</strong><p>{renderState === "generating" ? "Formatting your Word template into a PDF…" : renderState === "error" ? previewError : "Your generated PDF will appear here once the document engine is running."}</p>{renderState !== "generating" && <button className="button primary-button" onClick={() => { void checkHealth(); void generatePreview(); }}><RefreshCw size={16} /> Try again</button>}</div></div>}
            {previewMode === "pdf" && exactPreviewIsStale && <div className="preview-loading"><LoaderCircle size={16} className="spin" /> Live draft shown · Updating exact PDF…</div>}
            {previewMode === "pdf" && previewUrl && renderState === "error" && <div className="preview-failure"><CircleAlert size={17} /><span>{previewError}</span><button onClick={() => void generatePreview()}>Retry</button></div>}
          </div>
          <div className="preview-status"><span>{previewMode === "instant" ? <><CircleCheck size={14} /> Instant editing · no conversion delay</> : renderState === "ready" && !previewPending && !exactPreviewIsStale ? <><CircleCheck size={14} /> Preview updated · Revision {previewRevision}</> : (renderState === "generating" || previewPending || exactPreviewIsStale) ? <><LoaderCircle className="spin" size={14} /> Rendering latest changes</> : <><Activity size={14} /> {renderState === "error" ? "Generation needs attention" : "Waiting for preview"}</>}</span><span>{previewMode === "instant" ? "Draft approximation" : "Generated from DOCX"} <CheckCheck size={14} /></span></div>
        </section>
      </div>
    </div>
    {importCandidate && <div className="resume-import-overlay" role="presentation">
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
    </div>}
    {notification && <div className="toast" role="status"><span className="toast-icon"><Activity size={17} /></span>{notification}<button aria-label="Dismiss notification" onClick={() => setNotification("")}><X size={15} /></button></div>}
  </div>;
}
