/** Local-only template library. The stored File bytes are never uploaded until preview/export. */
const DATABASE = "folio-resume-builder"; // Preserve existing users' IndexedDB data.
const STORE = "assets";
const LEGACY_KEY = "current-template";
const LIBRARY_KEY = "template-library-v1";
const SELECTED_KEY = "selected-template-id-v1";

export type SavedTemplate = {
  id: string;
  name: string;
  file: File;
  addedAt: number;
};

export type TemplateLibrary = { items: SavedTemplate[]; selectedId: string | null };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readKey<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function writeKeys(db: IDBDatabase, writes: Array<[string, unknown]>): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    for (const [key, value] of writes) transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Reads saved entries and migrates the former single-template storage once. */
export async function loadTemplateLibrary(): Promise<TemplateLibrary> {
  const db = await openDb();
  try {
    const items = await readKey<SavedTemplate[]>(db, LIBRARY_KEY);
    const savedId = await readKey<string>(db, SELECTED_KEY);
    if (items !== undefined) {
      const selectedId = items.some(item => item.id === savedId) ? savedId! : (items[0]?.id ?? null);
      if (selectedId !== savedId) await writeKeys(db, [[SELECTED_KEY, selectedId]]);
      return { items, selectedId };
    }
    const legacy = await readKey<File>(db, LEGACY_KEY);
    const migrated = legacy instanceof File
      ? [{ id: createId(), name: legacy.name, file: legacy, addedAt: Date.now() }]
      : [];
    const selectedId = migrated[0]?.id ?? null;
    await writeKeys(db, [[LIBRARY_KEY, migrated], [SELECTED_KEY, selectedId]]);
    return { items: migrated, selectedId };
  } finally { db.close(); }
}

/** Adds to the library and selects it. Existing templates are not replaced. */
export async function addTemplateToLibrary(file: File): Promise<TemplateLibrary> {
  const db = await openDb();
  try {
    const items = (await readKey<SavedTemplate[]>(db, LIBRARY_KEY)) ?? [];
    const item: SavedTemplate = { id: createId(), name: file.name, file, addedAt: Date.now() };
    const updated = [...items, item];
    await writeKeys(db, [[LIBRARY_KEY, updated], [SELECTED_KEY, item.id], [LEGACY_KEY, file]]);
    return { items: updated, selectedId: item.id };
  } finally { db.close(); }
}

export async function selectLibraryTemplate(id: string): Promise<TemplateLibrary> {
  const db = await openDb();
  try {
    const items = (await readKey<SavedTemplate[]>(db, LIBRARY_KEY)) ?? [];
    const selected = items.find(item => item.id === id);
    if (!selected) throw new Error("This template is no longer available.");
    await writeKeys(db, [[SELECTED_KEY, id], [LEGACY_KEY, selected.file]]);
    return { items, selectedId: id };
  } finally { db.close(); }
}

/** Deletes an entry, selecting another one if needed. */
export async function removeLibraryTemplate(id: string): Promise<TemplateLibrary> {
  const db = await openDb();
  try {
    const items = (await readKey<SavedTemplate[]>(db, LIBRARY_KEY)) ?? [];
    const remaining = items.filter(item => item.id !== id);
    if (remaining.length === items.length) throw new Error("Template not found.");
    const selected = await readKey<string>(db, SELECTED_KEY);
    const selectedId = selected === id ? (remaining[0]?.id ?? null) : (selected ?? null);
    const nextFile = remaining.find(item => item.id === selectedId)?.file ?? null;
    await writeKeys(db, [[LIBRARY_KEY, remaining], [SELECTED_KEY, selectedId], [LEGACY_KEY, nextFile]]);
    return { items: remaining, selectedId };
  } finally { db.close(); }
}

// Backward compatible helpers for any older components.
export async function saveTemplate(file: File): Promise<void> {
  await addTemplateToLibrary(file);
}
export async function loadTemplate(): Promise<File | null> {
  const library = await loadTemplateLibrary();
  return library.items.find(item => item.id === library.selectedId)?.file ?? null;
}
