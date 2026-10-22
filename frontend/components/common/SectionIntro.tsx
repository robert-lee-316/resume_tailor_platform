import type { ReactNode } from "react";

export default function SectionIntro({ number, eyebrow, title, subtitle, icon }: {
  number: string; eyebrow: string; title: string; subtitle: string; icon: ReactNode;
}) {
  return <div className="section-intro">
    <div className="section-numberline"><span className="section-num">{number}</span><span>{eyebrow}</span></div>
    <div className="section-intro-heading"><span className="section-icon">{icon}</span><h2>{title}</h2></div>
    <p>{subtitle}</p>
  </div>;
}
