/**
 * Generated Word drafts are separate from the user's placeholder template.
 * IndexedDB provides persistent local autosave without triggering downloads;
 * saving to a user-selected folder is an opt-in enhancement for Chromium.
 */
const DB_NAME = "gurucorp-generated-resumes";
const STORE_NAME = "autosave";
const DRAFT_KEY = "latest-generated-docx";
const FOLDER_KEY = "chosen-output-folder";

export type WordDraft = {
  blob: Blob;
  filename: string;
  savedAt: number;
  signature: string;
};

export type WordOutputFolder = {
  readonly name: string;
  queryPermission(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  getFileHandle(name: string, options: { create: true }): Promise<{
    createWritable(): Promise<{ write(blob: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
};

function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readKey<T>(key: string): Promise<T | null> {
  const db = await connect();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function writeKey(key: string, value: unknown): Promise<void> {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export const loadWordDraft = () => readKey<WordDraft>(DRAFT_KEY);
export const saveWordDraft = (draft: WordDraft) => writeKey(DRAFT_KEY, draft);
export const loadOutputFolder = () => readKey<WordOutputFolder>(FOLDER_KEY);
export const saveOutputFolder = (folder: WordOutputFolder) => writeKey(FOLDER_KEY, folder);

/** Must be called synchronously from a real user click (browser permission). */
export function chooseOutputFolder(): Promise<WordOutputFolder> {
  const picker = (window as Window & {
    showDirectoryPicker?: (options?: { mode: "readwrite" }) => Promise<WordOutputFolder>;
  }).showDirectoryPicker;
  if (!picker) throw new Error("Choose folder requires Chrome or Edge on localhost or HTTPS.");
  return picker.call(window, { mode: "readwrite" });
}

export async function hasWritePermission(folder: WordOutputFolder): Promise<boolean> {
  return (await folder.queryPermission({ mode: "readwrite" })) === "granted";
}

export async function requestWritePermission(folder: WordOutputFolder): Promise<boolean> {
  return (await folder.requestPermission({ mode: "readwrite" })) === "granted";
}

export async function writeWordToFolder(folder: WordOutputFolder, filename: string, docx: Blob): Promise<void> {
  // Intentionally overwrite only the generated filename, never the uploaded template.
  const file = await folder.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(docx);
  } finally {
    await writable.close();
  }
}
