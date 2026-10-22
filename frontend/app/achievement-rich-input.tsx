"use client";

import { useEffect, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { clipboardHtmlToMarkdown, editorToMarkdown, markdownToSafeHtml, flattenOneBullet } from "@/lib/rich-text";

/** A genuine inline rich-text editor; saved data stays compatible with **bold** DOCX placeholders. */
export default function AchievementRichInput({
  value, onChange, onEnter, inputRef, label, placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  inputRef?: (node: HTMLDivElement | null) => void;
  label: string;
  placeholder: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const latestEdited = useRef(value);
  useEffect(() => {
    if (ref.current && latestEdited.current !== value) {
      ref.current.innerHTML = markdownToSafeHtml(value);
      latestEdited.current = value;
    }
  }, [value]);

  const sync = () => {
    if (!ref.current) return;
    const next = editorToMarkdown(ref.current);
    latestEdited.current = next;
    onChange(next);
  };

  const insertFormatted = (value: string) => {
    const html = markdownToSafeHtml(value);
    ref.current?.focus();
    // insertHTML keeps browser undo/redo history for paste and formatting.
    if (!document.execCommand("insertHTML", false, html)) {
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const container = document.createElement("span");
        container.innerHTML = html; // safe: markdownToSafeHtml escapes user data
        const fragment = document.createDocumentFragment();
        while (container.firstChild) fragment.appendChild(container.firstChild);
        range.insertNode(fragment);
        range.collapse(false);
      }
    }
    sync();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const plain = event.clipboardData.getData("text/plain");
    // Prefer rich HTML (ChatGPT's Copy normally includes it). Plain Markdown
    // copied via a code block also works.
    insertFormatted(html ? clipboardHtmlToMarkdown(html) : flattenOneBullet(plain));
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") { event.preventDefault(); onEnter(); return; }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      document.execCommand("bold");
      sync();
    }
    // Leave Ctrl+Z / Ctrl+Y to the browser's native contentEditable history.
  };

  return <div ref={node => {
      ref.current = node;
      inputRef?.(node);
      if (node && !node.hasChildNodes()) node.innerHTML = markdownToSafeHtml(value);
    }}
    className="achievement-rich-input" role="textbox" aria-label={label}
    aria-multiline="false" contentEditable suppressContentEditableWarning
    data-placeholder={placeholder} onInput={sync} onPaste={handlePaste}
    onKeyDown={handleKey} spellCheck="true" />;
}
