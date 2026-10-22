"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import type { SkillCategory } from "@/lib/resume";

export default function SkillKeywordEditor({ category, categoryIndex, onAdd, onRemove }: {
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
        <span className="skill-keyword-label" title={value}>{value}</span>
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
