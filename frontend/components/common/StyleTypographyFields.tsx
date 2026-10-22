"use client";

import { FONT_CHOICES, type TextStyle } from "@/lib/styles";

/**
 * Shared presentation for resume typography controls.
 * Using the same component for the active section and shared headings avoids
 * native, browser-dependent styling differences and overlapping grid columns.
 */
export default function StyleTypographyFields({
  value,
  onChange,
  idPrefix,
}: {
  value: TextStyle;
  onChange: (field: "font" | "size" | "align" | "color", next: string | number) => void;
  idPrefix: string;
}) {
  return (
    <div className="style-field-grid style-typography-grid">
      <label className="field" htmlFor={`${idPrefix}-font`}>
        <span className="field-label">Font family</span>
        <select id={`${idPrefix}-font`} value={value.font} onChange={e => onChange("font", e.target.value)}>
          <option value="">Use Word template font</option>
          {FONT_CHOICES.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
      </label>
      <label className="field" htmlFor={`${idPrefix}-size`}>
        <span className="field-label">Size (pt)</span>
        <input id={`${idPrefix}-size`} type="number" min={7} max={36} step={0.5}
          value={value.size} onChange={e => {
            const size = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(size) && size >= 7 && size <= 36) onChange("size", size);
          }} />
      </label>
      <label className="field" htmlFor={`${idPrefix}-align`}>
        <span className="field-label">Text alignment</span>
        <select id={`${idPrefix}-align`} value={value.align} onChange={e => onChange("align", e.target.value)}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </label>
      <label className="field" htmlFor={`${idPrefix}-color`}>
        <span className="field-label">Text color</span>
        <input id={`${idPrefix}-color`} type="color" value={value.color} onChange={e => onChange("color", e.target.value)} />
      </label>
    </div>
  );
}
