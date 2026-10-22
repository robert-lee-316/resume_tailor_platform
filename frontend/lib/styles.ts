import type { CSSProperties } from "react";

// Older keys remain valid for saved styles and previously exported resumes.
// Separate heading/body/detail keys allow independent section formatting.
export const STYLE_KEYS = [
  "name", "role", "personal", "summary", "body",
  "skillsHeading", "skills", "experienceHeading", "experience", "experienceDescription", "experienceBullets",
  "educationHeading", "education",
] as const;
export type StyleKey = typeof STYLE_KEYS[number];
export type TextStyle = {
  font: string; size: number; bold: boolean; color: string;
  align: "left" | "center" | "right" | "justify";
  lineSpacing?: number; spaceAfter?: number; leftIndent?: number;
  enabled?: boolean; changed?: string[];
};
export type ResumeStyles = Record<StyleKey, TextStyle>;
export const STYLE_LABELS: Record<StyleKey, string> = {
  name: "Name", role: "Role / title", personal: "Personal information", summary: "Summary",
  body: "Other content",
  skillsHeading: "Skills · heading", skills: "Skills · categories",
  experienceHeading: "Experience · heading", experience: "Experience · job / company / dates",
  experienceDescription: "Experience · company description", experienceBullets: "Experience · achievements",
  educationHeading: "Education · heading", education: "Education · college / degree / dates",
};
export const STYLE_GROUPS: { label: string; keys: readonly StyleKey[] }[] = [
  {label: "Profile", keys: ["name", "role", "personal", "summary"]},
  {label: "Skills", keys: ["skills"]},
  {label: "Work experience", keys: ["experience", "experienceDescription", "experienceBullets"]},
  {label: "Education", keys: ["education"]},
  {label: "Other", keys: ["body"]},
];
export const FONT_CHOICES = ["Times New Roman", "Arial", "Calibri", "Aptos", "Georgia", "Verdana"];
const basic = (size: number, bold = false, align: TextStyle["align"] = "left"): TextStyle => ({
  // Empty font means inherit the uploaded Word template font. Do not
  // present a hard-coded Times New Roman choice as a user override.
  font: "", size, bold, color: "#161616", align, enabled: false, changed: []
});
// By default, resume paragraphs use full justification. These are genuine
// Word/PDF alignment defaults (not merely values shown in the form).
// Name, role, contact details, and section headings remain independently styled.
export const JUSTIFIED_BODY_KEYS: readonly StyleKey[] = [
  "summary", "body", "skills", "experience", "experienceDescription",
  "experienceBullets", "education",
];
const justifiedBody = (size: number): TextStyle => ({
  ...basic(size, false, "justify"), enabled: true, changed: ["align"],
});
export const DEFAULT_STYLES: ResumeStyles = {
  name: basic(18, true, "center"), role: basic(12, false, "center"), personal: basic(10, false, "center"),
  summary: justifiedBody(11), body: justifiedBody(10),
  skillsHeading: basic(11.25, true, "center"), skills: justifiedBody(10),
  experienceHeading: basic(11.25, true, "center"), experience: justifiedBody(10),
  experienceDescription: justifiedBody(10), experienceBullets: justifiedBody(10),
  educationHeading: basic(11.25, true, "center"), education: justifiedBody(10),
};

const MIGRATION_SOURCE: Partial<Record<StyleKey, StyleKey>> = {
  skillsHeading: "skills", experienceHeading: "experience", educationHeading: "education",
  experienceDescription: "body", experienceBullets: "body",
};

export function parseResumeStyles(value: unknown): ResumeStyles {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const parsed = Object.fromEntries(STYLE_KEYS.map(key => {
    const legacy = MIGRATION_SOURCE[key];
    const incoming = candidate[key] ?? (legacy ? candidate[legacy] : undefined);
    const raw = incoming && typeof incoming === "object" ? incoming as Record<string, unknown> : {};
    const baseline = DEFAULT_STYLES[key];
    // Normalize legacy unmodified defaults: older builds saved Times New
    // Roman even though the user never actively selected a font.
    const explicitlySelectedFont = Array.isArray(raw.changed) && raw.changed.includes("font");
    const font = FONT_CHOICES.includes(String(raw.font)) && (explicitlySelectedFont || (raw.enabled === true && !Array.isArray(raw.changed)))
      ? String(raw.font) : baseline.font;
    const size = typeof raw.size === "number" && Number.isFinite(raw.size) ? Math.max(7, Math.min(36, raw.size)) : baseline.size;
    const bold = typeof raw.bold === "boolean" ? raw.bold : baseline.bold;
    const color = typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : baseline.color;
    const incomingAlign = ["left","center","right","justify"].includes(String(raw.align)) ? raw.align as TextStyle["align"] : baseline.align;
    // Migrate browser data from older builds, which persisted left-aligned
    // defaults even though the user never selected Left. Preserve actual
    // edits and explicit legacy overrides.
    const bodyDefault = JUSTIFIED_BODY_KEYS.includes(key);
    const explicitAlign = (Array.isArray(raw.changed) && raw.changed.includes("align"))
      || (raw.enabled === true && !Array.isArray(raw.changed) && raw.align !== undefined);
    const align = bodyDefault && !explicitAlign ? "justify" : incomingAlign;
    const lineSpacing = typeof raw.lineSpacing === "number" && Number.isFinite(raw.lineSpacing) && raw.lineSpacing >= 1 && raw.lineSpacing <= 2.5 ? raw.lineSpacing : undefined;
    const spaceAfter = typeof raw.spaceAfter === "number" && Number.isFinite(raw.spaceAfter) && raw.spaceAfter >= 0 && raw.spaceAfter <= 36 ? raw.spaceAfter : undefined;
    const leftIndent = typeof raw.leftIndent === "number" && Number.isFinite(raw.leftIndent) && raw.leftIndent >= 0 && raw.leftIndent <= 72 ? raw.leftIndent : undefined;
    // Styles saved by older GuruCorp versions were automatically sent to the
    // renderer, even when the user had never customized them. Treat the old
    // default values as template-inherited; keep genuine changes enabled.
    const oldHeading = key === "skillsHeading" || key === "experienceHeading" || key === "educationHeading";
    const oldDefault = oldHeading ? { ...baseline, size: 11, align: "left" as const } : baseline;
    const changed = [
      ...(["font", "size", "bold", "color", "align"] as const).filter(prop =>
        ({ font, size, bold, color, align })[prop] !== oldDefault[prop]),
      ...(lineSpacing !== undefined ? ["lineSpacing"] : []),
      ...(spaceAfter !== undefined ? ["spaceAfter"] : []),
      ...(leftIndent !== undefined ? ["leftIndent"] : []),
    ];
    const fields = ["font", "size", "bold", "color", "align", "lineSpacing", "spaceAfter", "leftIndent"];
    const savedChanged = Array.isArray(raw.changed)
      ? raw.changed.filter((value): value is string => typeof value === "string" && fields.includes(value))
      : (incoming ? changed : []);
    // A migrated, untouched paragraph should now send its Justify alignment
    // to the Word renderer. Do not silently override a user's explicit Left,
    // Center or Right alignment.
    const migrateBodyDefault = bodyDefault && !explicitAlign;
    const finalChanged = migrateBodyDefault ? [...new Set([...savedChanged, "align"])] : savedChanged;
    const enabled = migrateBodyDefault ? true : (typeof raw.enabled === "boolean" ? raw.enabled : savedChanged.length > 0);
    return [key, {font,size,bold,color,align,enabled, changed: finalChanged,
      ...(lineSpacing !== undefined ? {lineSpacing} : {}),
      ...(spaceAfter !== undefined ? {spaceAfter} : {}),
      ...(leftIndent !== undefined ? {leftIndent} : {})}];
  })) as ResumeStyles;
  // Migrate stale browser styles: summary bold is controlled by **keyword**
  // markup, not a paragraph-wide style override. Prevent historical defaults
  // from silently turning an entire summary bold on Exact PDF export.
  parsed.summary = {
    ...parsed.summary,
    bold: false,
    changed: (parsed.summary.changed ?? []).filter(key => key !== "bold"),
  };
  if (!parsed.summary.changed.length) parsed.summary.enabled = false;
  return synchronizeHeadingStyles(parsed);
}
// One shared heading style controls all three sections, while the existing
// three keys are retained in the payload for Word / Exact PDF compatibility.
export const SECTION_HEADING_KEYS = ["skillsHeading", "experienceHeading", "educationHeading"] as const;
export type HeadingStyleKey = typeof SECTION_HEADING_KEYS[number];

export function synchronizeHeadingStyles(styles: ResumeStyles): ResumeStyles {
  // For older saved resumes with different heading settings, use the first
  // explicit customization and apply it uniformly to the three headings.
  const customized = SECTION_HEADING_KEYS.map(key => styles[key])
    .find(style => style.enabled && (style.changed?.length ?? 0) > 0);
  if (!customized) {
    return { ...styles, ...Object.fromEntries(SECTION_HEADING_KEYS.map(key =>
      [key, { ...DEFAULT_STYLES[key], enabled: false, changed: [] }])) } as ResumeStyles;
  }
  return { ...styles, ...Object.fromEntries(SECTION_HEADING_KEYS.map(key =>
    [key, { ...customized, changed: [...(customized.changed ?? [])] }])) } as ResumeStyles;
}

export function updateSharedHeadingStyle(
  styles: ResumeStyles, property: keyof TextStyle, value: string | number | boolean
): ResumeStyles {
  const source = styles.skillsHeading;
  const changed = [...new Set([...(source.changed ?? []), property])];
  return { ...styles, ...Object.fromEntries(SECTION_HEADING_KEYS.map(key =>
    [key, { ...styles[key], [property]: value, enabled: true, changed: [...changed] }])) } as ResumeStyles;
}

export function restoreSharedHeadingStyle(styles: ResumeStyles): ResumeStyles {
  return { ...styles, ...Object.fromEntries(SECTION_HEADING_KEYS.map(key =>
    [key, { ...DEFAULT_STYLES[key], enabled: false, changed: [] }])) } as ResumeStyles;
}

export function cssTextStyle(s: TextStyle): CSSProperties {
  return { ...(s.font ? {fontFamily: `"${s.font}", serif`} : {}), fontSize: `${s.size}pt`, fontWeight: s.bold ? 700 : 400,
    color: s.color, textAlign: s.align, textAlignLast: s.align === "justify" ? "auto" : undefined,
    overflowWrap: "break-word",
    ...(s.lineSpacing !== undefined ? {lineHeight: s.lineSpacing} : {}),
    ...(s.spaceAfter !== undefined ? {marginBottom: `${s.spaceAfter}pt`} : {}),
    ...(s.leftIndent !== undefined ? {paddingLeft: `${s.leftIndent}pt`} : {}),
  };
}
