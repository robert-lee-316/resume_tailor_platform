
export default function Field({ label, value, placeholder, onChange, type = "text", help, disabled = false, min }: {
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
