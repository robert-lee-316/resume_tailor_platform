import type { ResumeData } from "@/lib/resume";
import type { ResumeStyles } from "@/lib/styles";
import { cssTextStyle } from "@/lib/styles";
import { formatEducationDates, formatExperienceDates } from "@/lib/resume";
import BoldPreview from "@/components/common/BoldPreview";

export default function InstantResumePreview({ resume, styles, omarLayout = false }: { resume: ResumeData; styles: ResumeStyles; omarLayout?: boolean }) {
  // A fast HTML approximation of the selected Omar-style Word template.
  // Only PDF rendering reproduces actual DOCX pagination and Word metrics.
  return <article className={`instant-resume${omarLayout ? " instant-omar" : ""}`} aria-label="Instant resume draft">
    <header className="instant-resume-header">
      <h1 style={cssTextStyle(styles.name)}>{resume.full_name || "Your name"}</h1>
      <div style={cssTextStyle(styles.role)}>{resume.job_title || "Professional title"}</div>
      <p style={cssTextStyle(styles.personal)}>{[resume.phone, resume.email, resume.location, resume.linkedin].filter(Boolean).join(omarLayout ? "  /  " : "  |  ")}</p>
    </header>
    <section className="instant-resume-section instant-summary">
      {!omarLayout && <h2 style={{...cssTextStyle(styles.summary), textAlign: "left"}}>SUMMARY</h2>}
      <div style={{...cssTextStyle(styles.summary), fontWeight: 400}} className="instant-text"><BoldPreview value={resume.summary} /></div>
    </section>
    <section className="instant-resume-section instant-skills-section">
      <h2 style={cssTextStyle(styles.skillsHeading)}> {omarLayout ? "SKILLS" : "TECHNICAL SKILLS"}</h2>
      {omarLayout ? <div className="instant-skills-plain" style={cssTextStyle(styles.skills)}>
        {resume.skill_categories.filter(cat => cat.skills.some(s => s.trim())).map(cat =>
          <p key={cat.id} style={cssTextStyle(styles.skills)}><strong>{cat.name ? `${cat.name}: ` : ""}</strong>{cat.skills.filter(Boolean).join(", ")}</p>)}
      </div> : <ul className="instant-skills" style={cssTextStyle(styles.skills)}>
        {resume.skill_categories.filter(cat => cat.skills.some(s => s.trim())).map(cat =>
          <li key={cat.id} style={{textAlign: styles.skills.align}}><strong>{cat.name ? `${cat.name}: ` : ""}</strong>{cat.skills.filter(Boolean).join(", ")}</li>)}
      </ul>}
    </section>
    <section className="instant-resume-section instant-experience-section"><h2 style={cssTextStyle(styles.experienceHeading)}>WORK EXPERIENCE</h2>
      {resume.experiences.map(exp => <div key={exp.id} className="instant-experience" style={cssTextStyle(styles.experience)}>
        {omarLayout ? <>
          <div><strong>{exp.job_title}</strong></div>
          <div className="instant-jobline"><strong>{exp.company}</strong><span>{formatExperienceDates(exp)}</span></div>
        </> : <><div className="instant-jobline"><strong>{exp.job_title}</strong><span>{formatExperienceDates(exp)}</span></div><div>{exp.company}</div></>}
        {exp.description.trim() && <p className="instant-company-description" style={cssTextStyle(styles.experienceDescription)}><BoldPreview value={exp.description} /></p>}
        <ul style={cssTextStyle(styles.experienceBullets)}>{exp.bullets.filter(b => b.text.trim()).map((bullet,index) => <li key={index} style={{textAlign: styles.experienceBullets.align}}><BoldPreview value={bullet.text} /></li>)}</ul>
      </div>)}
    </section>
    <section className="instant-resume-section instant-education-section"><h2 style={cssTextStyle(styles.educationHeading)}>EDUCATION</h2>
      {resume.education.map(edu => <div key={edu.id} className="instant-education" style={cssTextStyle(styles.education)}>
        {omarLayout ? <><div><strong>{edu.degree}</strong></div><div className="instant-jobline"><strong>{edu.institution}{edu.location.trim() ? `, ${edu.location}` : ""}</strong><span>{formatEducationDates(edu)}</span></div></>
        : <><div className="instant-jobline"><div><strong>{edu.institution}</strong> — {edu.degree}</div><span>{formatEducationDates(edu)}</span></div>{edu.location.trim() && <div>{edu.location}</div>}</>}
      </div>)}
    </section>
  </article>;
}
