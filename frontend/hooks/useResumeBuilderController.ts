"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { boldSelectedText, formatEducationDates, formatExperienceDates, initialResume, formatSkillCategories, parseResumeData, reorderBullets, reorderSkillCategories, safeFilename, toRenderPayload } from "@/lib/resume";
import type { Education, Experience, ResumeData, Section, SkillCategory } from "@/lib/resume";
import { addTemplateToLibrary, loadTemplateLibrary, removeLibraryTemplate, selectLibraryTemplate } from "@/lib/template-store";
import type { SavedTemplate, TemplateLibrary } from "@/lib/template-store";
import { chooseOutputFolder, hasWritePermission, loadOutputFolder, loadWordDraft, requestWritePermission, saveOutputFolder, saveWordDraft, writeWordToFolder } from "@/lib/docx-autosave";
import type { WordDraft, WordOutputFolder } from "@/lib/docx-autosave";
import { makeSummaryHistory, recordSummaryEdit, undoSummaryEdit, redoSummaryEdit } from "@/lib/summary-history";
import type { SummarySnapshot } from "@/lib/summary-history";
import { DEFAULT_STYLES, parseResumeStyles, SECTION_HEADING_KEYS, updateSharedHeadingStyle } from "@/lib/styles";
import type { ResumeStyles, StyleKey, TextStyle } from "@/lib/styles";

const RESUME_STORAGE = "folio-resume-v1";
const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;
export const PLACEHOLDER_GROUPS = [
  { name: "Personal", values: ["full_name", "job_title", "email", "phone", "location", "linkedin", "summary", "skills_text"] },
  { name: "Experience (inside loop)", values: ["exp.job_title", "exp.company", "exp.dates", "exp.description", "bullet.text"] },
  { name: "Education (inside loop)", values: ["ed.degree", "ed.institution", "ed.location", "ed.dates"] },
  { name: "Skills (optional category loop)", values: ["category.name", "category.skills_text"] },
];

type TemplateInspection = { fields: string[]; loops: string[]; valid: boolean };
type BusyExport = "pdf" | "docx" | null;
type RenderState = "idle" | "generating" | "ready" | "error";
type PreviousResumeImport = { resume: ResumeData; warnings: string[]; counts: { experiences: number; education: number }; fileName: string };

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

export async function sampleFile(): Promise<File> {
  const response = await fetch("/templates/sample_template.docx");
  if (!response.ok) throw new Error("Could not load the sample template.");
  return new File([await response.blob()], "sample_template.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export function useResumeBuilderController() {
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
  return {
    resume,
    setResume,
    achievementDropTarget,
    skillCategoryDropTarget,
    section,
    styles,
    setStyles,
    selectedStyle,
    setSelectedStyle,
    previewMode,
    setPreviewMode,
    template,
    templateLibrary,
    selectedTemplateId,
    templateLibraryBusy,
    inspection,
    inspectionLoading,
    templateError,
    dragging,
    setDragging,
    saved,
    wordAutosaveEnabled,
    wordSaveStatus,
    wordSaveNote,
    wordSaveDate,
    outputFolderName,
    renderState,
    previewError,
    previewUrl,
    previewRevision,
    exporting,
    backendHealth,
    mobilePanel,
    setMobilePanel,
    sidebarOpen,
    setSidebarOpen,
    notification,
    setNotification,
    copied,
    uploadRef,
    jsonRef,
    previousResumeRef,
    summaryRef,
    summaryHistory,
    summarySelection,
    achievementRefs,
    importingPrevious,
    importPreviousError,
    importCandidate,
    setImportCandidate,
    previewPending,
    notify,
    updateStyle,
    updateOptionalStyle,
    checkHealth,
    updateField,
    addSkillCategory,
    updateSkillCategory,
    removeSkillCategory,
    handleSkillCategoryDragStart,
    handleSkillCategoryDragOver,
    handleSkillCategoryDrop,
    handleSkillCategoryDragEnd,
    addSkillKeywords,
    removeSkill,
    updateExperience,
    addExperience,
    updateExperienceDate,
    toggleAchievementBold,
    updateSummaryText,
    toggleSummaryBold,
    undoSummary,
    redoSummary,
    updateAchievement,
    addAchievement,
    removeAchievement,
    handleAchievementDragStart,
    handleAchievementDragOver,
    handleAchievementDrop,
    handleAchievementDragEnd,
    updateEducation,
    addEducation,
    updateEducationDate,
    onPreviousResumeSelected,
    confirmPreviousResumeImport,
    applyTemplate,
    chooseTemplate,
    deleteTemplate,
    onTemplateSelected,
    onDropTemplate,
    generatePreview,
    setWordAutosave,
    connectOutputFolder,
    downloadLastWordDraft,
    downloadResume,
    downloadJson,
    importJson,
    resetResume,
    copyFields,
    switchSection,
    completedSections,
    filled,
    exactPreviewIsStale,
    showInstantDraft
  };
}

export type ResumeBuilderController = ReturnType<typeof useResumeBuilderController>;
