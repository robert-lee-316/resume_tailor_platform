import type { KeyboardEvent, SyntheticEvent } from "react";

export default function TextArea({ label, value, placeholder, onChange, onKeyDown, onSelect, rows = 5, help, inputRef }: {
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
