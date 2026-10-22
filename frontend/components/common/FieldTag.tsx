import { Check } from "lucide-react";

export default function FieldTag({ value, detected }: { value: string; detected: boolean }) {
  return <span className={`tag ${detected ? "tag-detected" : ""}`}>{`{{ ${value} }}`}{detected && <Check size={12} />}</span>;
}
