/** The summary editor uses controlled React state. Formatting through setState does
 * not participate in the browser's native textarea undo stack, so keep a bounded
 * editor history for both normal typing and toolbar formatting.
 */
export type SummarySnapshot = { value: string; start: number; end: number };
export type SummaryEditKind = "typing" | "format";
export type SummaryHistory = {
  value: string;
  past: SummarySnapshot[];
  future: SummarySnapshot[];
  lastEditKind: SummaryEditKind | null;
  lastEditAt: number;
};

const MAX_STEPS = 100;
const TYPING_GROUP_MS = 750;

export function makeSummaryHistory(initial: string): SummaryHistory {
  return { value: initial, past: [], future: [], lastEditKind: null, lastEditAt: 0 };
}

export function recordSummaryEdit(
  history: SummaryHistory,
  before: SummarySnapshot,
  nextValue: string,
  kind: SummaryEditKind,
  now = Date.now(),
): void {
  if (history.value !== before.value) {
    // The resume was replaced by JSON import / previous-resume import / reset.
    Object.assign(history, makeSummaryHistory(before.value));
  }
  if (before.value === nextValue) return;
  const groupTyping = kind === "typing" && history.lastEditKind === "typing" &&
    now - history.lastEditAt <= TYPING_GROUP_MS && history.past.length > 0;
  if (!groupTyping) {
    history.past.push(before);
    if (history.past.length > MAX_STEPS) history.past.shift();
  }
  history.value = nextValue;
  history.future = [];
  history.lastEditKind = kind;
  history.lastEditAt = now;
}

export function undoSummaryEdit(history: SummaryHistory, current: SummarySnapshot): SummarySnapshot | null {
  if (history.value !== current.value) Object.assign(history, makeSummaryHistory(current.value));
  const previous = history.past.pop();
  if (!previous) return null;
  history.future.push(current);
  history.value = previous.value;
  history.lastEditKind = null;
  return previous;
}

export function redoSummaryEdit(history: SummaryHistory, current: SummarySnapshot): SummarySnapshot | null {
  if (history.value !== current.value) Object.assign(history, makeSummaryHistory(current.value));
  const next = history.future.pop();
  if (!next) return null;
  history.past.push(current);
  history.value = next.value;
  history.lastEditKind = null;
  return next;
}
