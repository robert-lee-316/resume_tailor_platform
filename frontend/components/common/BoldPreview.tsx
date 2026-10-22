
export default function BoldPreview({ value }: { value: string }) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return <span>{parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>)}</span>;
}
