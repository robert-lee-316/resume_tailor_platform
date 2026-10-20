export type Bullet = { text: string };

/** Categories and individual skills are stored separately so users can add/edit/remove either. */
export type SkillCategory = { id: string; name: string; skills: string[] };

const MAX_SKILL_CATEGORIES = 30;
const MAX_SKILLS_PER_CATEGORY = 40;

/** Convert an older flat skills field (including imported 'Category: ...' lines). */
export function parseLegacySkills(text: string): SkillCategory[] {
  const lines = text.split(/\r?\n/).map(line => line.replace(/^[•●▪◦‣\-]\s*/, "").trim()).filter(Boolean);
  if (!lines.length) return [];
  const categories: SkillCategory[] = [];
  for (const line of lines.slice(0, MAX_SKILL_CATEGORIES)) {
    // Restrict matching to a reasonably short label: a sentence containing a colon
    // isn't necessarily a skill category.
    const named = /^([^:]{1,65}):\s*(.*)$/.exec(line);
    const name = named ? named[1].trim() : "General";
    const raw = named ? named[2] : line;
    const skills = raw.split(/[,;•]/).map(item => item.trim()).filter(Boolean).slice(0, MAX_SKILLS_PER_CATEGORY);
    if (!skills.length) continue;
    const previous = categories[categories.length - 1];
    if (previous?.name === "General" && name === "General") previous.skills.push(...skills);
    else categories.push({ id: `skill-import-${categories.length + 1}`, name, skills });
  }
  return categories;
}

/** The legacy {{ skills_text }} placeholder still works with categorized skills. */
export function formatSkillCategories(categories: SkillCategory[]): string {
  return categories.map(category => {
    const skills = category.skills.map(s => s.trim()).filter(Boolean);
    if (!skills.length) return "";
    return `• ${category.name.trim() ? `${category.name.trim()}: ` : ""}${skills.join(", ")}`;
  }).filter(Boolean).join("\n");
}

export function normalizeSkillCategories(categories: SkillCategory[]): SkillCategory[] {
  return categories.slice(0, MAX_SKILL_CATEGORIES).map(category => ({
    id: category.id,
    name: category.name,
    skills: category.skills.slice(0, MAX_SKILLS_PER_CATEGORY),
  }));
}


/** Move one achievement while preserving its text and every other bullet's order. */
export function reorderBullets(bullets: Bullet[], from: number, to: number): Bullet[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) ||
      from < 0 || from >= bullets.length || to < 0 || to >= bullets.length || from === to) {
    return bullets;
  }
  const reordered = [...bullets];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}
export type Experience = {
  id: string;
  job_title: string;
  company: string;
  /** Plain paragraph below the company name, separate from achievement bullets. */
  description: string;
  /** YYYY-MM-DD calendar dates; old YYYY-MM values remain readable. */
  start_date: string;
  end_date: string;
  is_current: boolean;
  /** Kept for compatibility with existing Word templates and older JSON backups. */
  dates: string;
  bullets: Bullet[];
};
export type Education = {
  id: string;
  degree: string;
  institution: string;
  /** City and state/country of the school (e.g. Albany, NY). */
  location: string;
  /** Calendar values YYYY-MM-DD, or older YYYY-MM values. */
  start_date: string;
  end_date: string;
  is_current: boolean;
  /** Legacy field and field required by existing Word templates. */
  dates: string;
};
export type ResumeData = {
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  skills_text: string;
  skill_categories: SkillCategory[];
  experiences: Experience[];
  education: Education[];
};

export type Section = "personal" | "summary" | "experience" | "education" | "skills" | "template" | "export";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The editor uses native day/month/year calendar controls. Older stored resumes
// may contain only YYYY-MM. Both formats export as "Jan 2021", which is the
// conventional date display for a resume (without timezone conversions).
export function formatResumeMonth(value: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.exec(value);
  if (!match) return "";
  if (match[3]) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return "";
  }
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

// Native <input type="date"> needs YYYY-MM-DD. Previous month-only values
// display the first of their month WITHOUT changing the saved data. Once a
// user chooses a date, the exact selected date is stored.
export function toDatePickerValue(value: string): string {
  if (!formatResumeMonth(value)) return "";
  return value.length === 7 ? `${value}-01` : value;
}

export function formatExperienceDates(exp: Pick<Experience, "start_date" | "end_date" | "is_current" | "dates">): string {
  const start = formatResumeMonth(exp.start_date);
  const end = exp.is_current ? "Present" : formatResumeMonth(exp.end_date);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end && exp.end_date) return end;
  return exp.dates || "";
}

// Accept older resumes already saved in localStorage / JSON backups.
// A year-only value has no known month, so never invent January for it.
function restoreLegacyDates(dates: string): Pick<Experience, "start_date" | "end_date" | "is_current"> {
  const range = /^\s*(.*?)\s*[-–—]\s*(.*?)\s*$/.exec(dates);
  if (!range) return { start_date: "", end_date: "", is_current: /present|current/i.test(dates) };
  const toMonthInput = (value: string): string => {
    const match = /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{4})$/i.exec(value.trim());
    if (!match) return "";
    const monthIndex = MONTH_NAMES.findIndex(name => match[1].slice(0, 3).toLowerCase() === name.toLowerCase());
    return monthIndex === -1 ? "" : `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
  };
  const is_current = /^present$|^current$/i.test(range[2].trim());
  return { start_date: toMonthInput(range[1]), end_date: is_current ? "" : toMonthInput(range[2]), is_current };
}

export function formatEducationDates(edu: Pick<Education, "start_date" | "end_date" | "is_current" | "dates">): string {
  const from = formatResumeMonth(edu.start_date);
  const to = edu.is_current ? "Present" : formatResumeMonth(edu.end_date);
  if (from && to) return `${from} – ${to}`;
  if (from) return from;
  if (to && edu.end_date) return to;
  return edu.dates || "";
}

/** Mark selected achievement or summary words bold using lightweight **text** markup. */
export function boldSelectedText(text: string, start: number, end: number): { text: string; start: number; end: number } | null {
  if (start < 0 || end <= start || end > text.length) return null;
  if (text.slice(start - 2, start) === "**" && text.slice(end, end + 2) === "**") {
    return { text: text.slice(0, start - 2) + text.slice(start, end) + text.slice(end + 2), start: start - 2, end: end - 2 };
  }
  return { text: text.slice(0, start) + "**" + text.slice(start, end) + "**" + text.slice(end), start: start + 2, end: end + 2 };
}

export const initialResume: ResumeData = {
  full_name: "Alex Morgan",
  job_title: "Senior Software Engineer",
  email: "alex@example.com",
  phone: "+1 555-0100",
  location: "Austin, TX",
  linkedin: "linkedin.com/in/alexmorgan",
  summary: "Backend-focused software engineer building secure, scalable web applications.",
  skills_text: "• Languages: Python, TypeScript\n• Frameworks: FastAPI, React\n• Cloud & Data: AWS, PostgreSQL",
  skill_categories: [
    { id: "skill-1", name: "Languages", skills: ["Python", "TypeScript"] },
    { id: "skill-2", name: "Frameworks", skills: ["FastAPI", "React"] },
    { id: "skill-3", name: "Cloud & Data", skills: ["AWS", "PostgreSQL"] },
  ],
  experiences: [
    {
      id: "exp-1", job_title: "Senior Software Engineer", company: "Acme Technologies",
      description: "Builds SaaS platforms and backend services for enterprise customers.",
      start_date: "2021-01", end_date: "", is_current: true, dates: "Jan 2021 – Present",
      bullets: [
        { text: "Developed reliable REST APIs and background workers." },
        { text: "Reduced response time by 35%." }
      ]
    },
    {
      id: "exp-2", job_title: "Software Engineer", company: "Example Systems",
      description: "Developed products for cloud-first businesses.",
      start_date: "2018-01", end_date: "2020-12", is_current: false, dates: "Jan 2018 – Dec 2020",
      bullets: [{ text: "Built cloud-based services in Python and TypeScript." }]
    }
  ],
  education: [{ id: "edu-1", degree: "B.S. Computer Science", institution: "State University", location: "Albany, NY", start_date: "", end_date: "", is_current: false, dates: "2014–2018" }]
};

export const sections: { id: Section; label: string; number: string }[] = [
  { id: "personal", label: "Personal details", number: "01" },
  { id: "summary", label: "Professional summary", number: "02" },
  { id: "experience", label: "Work experience", number: "03" },
  { id: "education", label: "Education", number: "04" },
  { id: "skills", label: "Skills & expertise", number: "05" },
];

export function toRenderPayload(data: ResumeData) {
  // The existing backend and uploaded Word templates still receive exp.dates
  // plus exp.bullets: [{ text }]. No template change is necessary.
  return {
    full_name: data.full_name,
    job_title: data.job_title,
    email: data.email,
    phone: data.phone,
    location: data.location,
    linkedin: data.linkedin,
    summary: data.summary,
    skills_text: formatSkillCategories(data.skill_categories),
    // Advanced Word templates may loop over {%p for category in skill_categories %}.
    skill_categories: data.skill_categories
      .filter(category => category.skills.some(skill => skill.trim()))
      .map(category => ({ name: category.name.trim(), skills_text: category.skills.map(skill => skill.trim()).filter(Boolean).join(", ") })),
    experiences: data.experiences.map(exp => ({
      job_title: exp.job_title,
      company: exp.company,
      description: exp.description,
      dates: formatExperienceDates(exp),
      bullets: exp.bullets
        .map(bullet => ({ text: bullet.text.trim() }))
        .filter(bullet => bullet.text.length > 0),
    })),
    education: data.education.map(edu => ({ degree: edu.degree, institution: edu.institution, location: edu.location, dates: formatEducationDates(edu) })),
  };
}

export function parseResumeData(value: unknown): ResumeData | null {
  if (typeof value !== "object" || value === null) return null;
  const data = value as Record<string, unknown>;
  for (const key of ["full_name", "job_title", "email", "phone", "location", "summary", "skills_text"]) {
    if (typeof data[key] !== "string") return null;
  }
  if (!Array.isArray(data.experiences) || !Array.isArray(data.education)) return null;
  if (data.experiences.length > 50 || data.education.length > 50) return null;
  const experiences = data.experiences.map((item: unknown, index: number): Experience | null => {
    if (typeof item !== "object" || item === null) return null;
    const exp = item as Record<string, unknown>;
    if (!["job_title", "company"].every((k) => typeof exp[k] === "string") || !Array.isArray(exp.bullets)) return null;
    if (exp.dates !== undefined && typeof exp.dates !== "string") return null;
    if (exp.description !== undefined && typeof exp.description !== "string") return null;
    if (exp.bullets.length > 100 || exp.bullets.some((b: unknown) => typeof b !== "object" || b === null || typeof (b as Record<string, unknown>).text !== "string")) return null;
    const dates = typeof exp.dates === "string" ? exp.dates : "";
    const legacy = restoreLegacyDates(dates);
    const start_date = typeof exp.start_date === "string" ? exp.start_date : legacy.start_date;
    const end_date = typeof exp.end_date === "string" ? exp.end_date : legacy.end_date;
    if ((start_date && !formatResumeMonth(start_date)) || (end_date && !formatResumeMonth(end_date))) return null;
    const is_current = typeof exp.is_current === "boolean" ? exp.is_current : legacy.is_current;
    return {
      id: typeof exp.id === "string" ? exp.id : `exp-import-${index}`,
      job_title: exp.job_title as string,
      company: exp.company as string,
      description: typeof exp.description === "string" ? exp.description : "",
      dates,
      start_date,
      end_date,
      is_current,
      bullets: (exp.bullets as Bullet[]).map(bullet => ({ text: bullet.text })),
    };
  });
  const education = data.education.map((item: unknown, index: number): Education | null => {
    if (typeof item !== "object" || item === null) return null;
    const edu = item as Record<string, unknown>;
    if (!["degree", "institution", "dates"].every((k) => typeof edu[k] === "string")) return null;
    if (edu.location !== undefined && typeof edu.location !== "string") return null;
    const dates = edu.dates as string;
    const legacy = restoreLegacyDates(dates);
    const start_date = typeof edu.start_date === "string" ? edu.start_date : legacy.start_date;
    const end_date = typeof edu.end_date === "string" ? edu.end_date : legacy.end_date;
    if ((start_date && !formatResumeMonth(start_date)) || (end_date && !formatResumeMonth(end_date))) return null;
    return {
      id: typeof edu.id === "string" ? edu.id : `edu-import-${index}`,
      degree: edu.degree as string,
      institution: edu.institution as string,
      location: typeof edu.location === "string" ? edu.location : "",
      dates,
      start_date,
      end_date,
      is_current: typeof edu.is_current === "boolean" ? edu.is_current : legacy.is_current,
    };
  });
  if (experiences.some((x) => x === null) || education.some((x) => x === null)) return null;
  // Previous localStorage data and exported JSON backups only have skills_text.
  // The earlier Word/PDF resume importer also sends skills_text.
  let skill_categories: SkillCategory[];
  if (data.skill_categories === undefined) {
    skill_categories = parseLegacySkills(data.skills_text as string);
  } else {
    if (!Array.isArray(data.skill_categories) || data.skill_categories.length > MAX_SKILL_CATEGORIES) return null;
    const normalized: SkillCategory[] = [];
    for (let index = 0; index < data.skill_categories.length; index++) {
      const entry = data.skill_categories[index];
      if (!entry || typeof entry !== "object") return null;
      const category = entry as Record<string, unknown>;
      if (typeof category.name !== "string" || category.name.length > 120 ||
          !Array.isArray(category.skills) || category.skills.length > MAX_SKILLS_PER_CATEGORY ||
          category.skills.some((item: unknown) => typeof item !== "string" || item.length > 250)) return null;
      normalized.push({
        id: typeof category.id === "string" && category.id ? category.id : `skill-import-${index + 1}`,
        name: category.name,
        skills: category.skills as string[],
      });
    }
    skill_categories = normalized;
  }
  return {
    full_name: data.full_name as string,
    job_title: data.job_title as string,
    email: data.email as string,
    phone: data.phone as string,
    location: data.location as string,
    linkedin: typeof data.linkedin === "string" ? data.linkedin : "",
    summary: data.summary as string,
    skills_text: formatSkillCategories(skill_categories),
    skill_categories,
    experiences: experiences as Experience[],
    education: education as Education[],
  };
}

export function safeFilename(name: string): string {
  return (name.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "my-resume").slice(0, 90).toLowerCase();
}
