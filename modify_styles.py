from pathlib import Path
p=Path('/mnt/data/gurucorp-heading-fix/frontend/lib/styles.ts')
s=p.read_text()
s=s.replace('  lineSpacing?: number; spaceAfter?: number; leftIndent?: number;','  lineSpacing?: number; spaceAfter?: number; leftIndent?: number;\n  enabled?: boolean; changed?: string[];')
s=s.replace('  font: "Times New Roman", size, bold, color: "#161616", align','  font: "Times New Roman", size, bold, color: "#161616", align, enabled: false, changed: []')
s=s.replace('  skillsHeading: basic(11, true), skills: basic(10, false, "left"),','  skillsHeading: basic(11.25, true, "center"), skills: basic(10, false, "left"),')
s=s.replace('  experienceHeading: basic(11, true), experience: basic(10),','  experienceHeading: basic(11.25, true, "center"), experience: basic(10),')
s=s.replace('  educationHeading: basic(11, true), education: basic(10),','  educationHeading: basic(11.25, true, "center"), education: basic(10),')
s=s.replace('    return [key, {font,size,bold,color,align, ...(lineSpacing !== undefined ? {lineSpacing} : {}), ...(spaceAfter !== undefined ? {spaceAfter} : {}), ...(leftIndent !== undefined ? {leftIndent} : {})}];', '''    // Styles saved by older GuruCorp versions were automatically sent to the
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
      : changed;
    const enabled = typeof raw.enabled === "boolean" ? raw.enabled : savedChanged.length > 0;
    return [key, {font,size,bold,color,align,enabled, changed: savedChanged,
      ...(lineSpacing !== undefined ? {lineSpacing} : {}),
      ...(spaceAfter !== undefined ? {spaceAfter} : {}),
      ...(leftIndent !== undefined ? {leftIndent} : {})}];''')
p.write_text(s)
p=Path('/mnt/data/gurucorp-heading-fix/frontend/app/page.tsx')
s=p.read_text()
s=s.replace('setStyles(current => ({ ...current, [key]: { ...current[key], [property]: value } }));','setStyles(current => ({ ...current, [key]: { ...current[key], [property]: value, enabled: true, changed: [...new Set([...(current[key].changed ?? []), property])] } }));')
s=s.replace('      return { ...current, [key]: next };','      next.enabled = true;\n      next.changed = [...new Set([...(next.changed ?? []), property])];\n      return { ...current, [key]: next };')
old='<div className="style-property-title"><strong>{STYLE_LABELS[selectedStyle]}</strong><span>Formatting for this part only</span></div>'
new='''<div className="style-property-title"><strong>{STYLE_LABELS[selectedStyle]}</strong><span>Formatting for this part only</span></div>
                <label className="style-checkbox" style={{marginBottom: 14}}>
                  <input type="checkbox" checked={!styles[selectedStyle].enabled} onChange={e => setStyles(current => ({
                    ...current, [selectedStyle]: { ...current[selectedStyle], enabled: !e.target.checked,
                      changed: e.target.checked ? [] : ["font", "size", "bold", "color", "align"] }
                  }))} />
                  Keep formatting from the uploaded Word template
                </label>
                <p className="field-help" style={{marginTop: 0, marginBottom: 12}}>
                  {styles[selectedStyle].enabled
                    ? "Custom formatting is applied to Word and Exact PDF. Edit a field to override only that property."
                    : "Template formatting is preserved in Exact PDF. Editing any field below enables a custom override for that property."}
                </p>'''
assert old in s
s=s.replace(old,new)
s=s.replace('The instant preview is a fast HTML layout approximation. Select Exact PDF to verify your uploaded Word template\'s actual pagination and spacing.', 'Exact PDF preserves uploaded Word heading styles unless you explicitly override them here. Instant Preview remains an HTML approximation of the document.')
p.write_text(s)
p=Path('/mnt/data/gurucorp-heading-fix/backend/app/engine.py')
s=p.read_text()
old='''    if not isinstance(style, dict):
        return
    font = style.get('font')'''
new='''    if not isinstance(style, dict):
        return
    # A user-uploaded Word template is the formatting authority by default.
    # The frontend marks its built-in visual defaults as disabled. Previously
    # those defaults silently replaced centered/bold headings with 11pt left.
    if style.get('enabled') is False:
        return
    # For newly edited styles, apply only the properties the user changed;
    # leave other formatting (including center alignment and bold) intact.
    changed = style.get('changed')
    if isinstance(changed, list) and changed:
        allowed = {'font', 'size', 'color', 'align', 'bold', 'lineSpacing', 'spaceAfter', 'leftIndent'}
        selected = set(changed).intersection(allowed)
        style = {k: v for k, v in style.items() if k in selected}
    font = style.get('font')'''
assert old in s
s=s.replace(old,new)
p.write_text(s)
