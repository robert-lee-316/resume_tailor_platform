import type { CSSProperties } from "react";

export const STYLE_KEYS = ["name", "role", "personal", "summary", "skills", "experience", "education", "body"] as const;
export type StyleKey = typeof STYLE_KEYS[number];
export type TextStyle = { font: string; size: number; bold: boolean; color: string; align: "left" | "center" | "right" | "justify" };
export type ResumeStyles = Record<StyleKey, TextStyle>;
export const STYLE_LABELS: Record<StyleKey, string> = {
  name: "Name", role: "Role / title", personal: "Personal information", summary: "Summary",
  skills: "Skills", experience: "Experience", education: "Education", body: "Content / bullets"
};
export const FONT_CHOICES = ["Times New Roman", "Arial", "Calibri", "Aptos", "Georgia", "Verdana"];
const basic = (size: number, bold = false, align: TextStyle["align"] = "left"): TextStyle => ({
  font: "Times New Roman", size, bold, color: "#161616", align
});
export const DEFAULT_STYLES: ResumeStyles = {
  name: basic(18, true, "center"), role: basic(12, false, "center"), personal: basic(10, false, "center"),
  summary: basic(11), skills: basic(10, false, "justify"), experience: basic(10), education: basic(10), body: basic(10)
};
export function parseResumeStyles(value: unknown): ResumeStyles {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(STYLE_KEYS.map(key => {
    const raw = candidate[key] && typeof candidate[key] === "object" ? candidate[key] as Record<string, unknown> : {};
    const baseline = DEFAULT_STYLES[key];
    const font = FONT_CHOICES.includes(String(raw.font)) ? String(raw.font) : baseline.font;
    const size = typeof raw.size === "number" && Number.isFinite(raw.size) ? Math.max(7, Math.min(36, raw.size)) : baseline.size;
    const bold = typeof raw.bold === "boolean" ? raw.bold : baseline.bold;
    const color = typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : baseline.color;
    const align = ["left","center","right","justify"].includes(String(raw.align)) ? raw.align as TextStyle["align"] : baseline.align;
    return [key, {font,size,bold,color,align}];
  })) as ResumeStyles;
}
export function cssTextStyle(s: TextStyle): CSSProperties {
  return {fontFamily: `"${s.font}", serif`, fontSize: `${s.size}pt`, fontWeight: s.bold ? 700 : 400,
    color: s.color, textAlign: s.align};
}
