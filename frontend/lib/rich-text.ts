/**
 * Format used by existing GuruCorp documents: **important words**.
 * Editor HTML is never stored, because a reusable DOCX should only get text.
 * All pasted HTML is reduced to plain text plus <strong> tags.
 */
export function escapeRichText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function markdownToSafeHtml(text: string): string {
  const escaped = escapeRichText(text);
  // The generated markup uses only a hard-coded strong element.
  return escaped.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
}

export function flattenOneBullet(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Preserve bold spans but discard links, scripts, images and all pasted styles. */
export function clipboardHtmlToMarkdown(html: string): string {
  const dom = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node, inheritedBold: boolean): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as Element;
    if (["SCRIPT", "STYLE", "SVG", "IMG", "IFRAME"].includes(el.tagName)) return "";
    const weight = (el.getAttribute("style") ?? "").match(/font-weight\s*:\s*(bold|[6-9]00)/i);
    const bold = inheritedBold || ["STRONG", "B"].includes(el.tagName) || !!weight;
    const children = Array.from(el.childNodes).map(child => walk(child, bold)).join("");
    const rendered = bold && !inheritedBold && children.trim() ? `**${children}**` : children;
    return rendered + (["P", "DIV", "LI", "BR"].includes(el.tagName) ? " " : "");
  };
  const serialized = Array.from(dom.body.childNodes).map(n => walk(n, false)).join("");
  // Close adjacent bold sections into one, then remove visual line wrapping.
  return flattenOneBullet(serialized.replace(/\*\*\*\*/g, ""));
}

/** Read a contentEditable editor, returning markdown for Word/PDF generation. */
export function editorToMarkdown(root: HTMLElement): string {
  const walk = (node: Node, bold: boolean): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as Element;
    const isBold = bold || ["STRONG", "B"].includes(element.tagName) ||
      /font-weight\s*:\s*(bold|[6-9]00)/i.test(element.getAttribute("style") ?? "");
    const body = Array.from(element.childNodes).map(child => walk(child, isBold)).join("");
    const rendered = isBold && !bold && body.trim() ? `**${body}**` : body;
    return rendered + (["DIV", "P", "BR"].includes(element.tagName) ? " " : "");
  };
  return flattenOneBullet(Array.from(root.childNodes).map(node => walk(node, false)).join("").replace(/\*\*\*\*/g, ""));
}
