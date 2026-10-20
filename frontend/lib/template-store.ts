const DATABASE = "folio-resume-builder";
const STORE = "assets";
const TEMPLATE_KEY = "current-template";

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

export async function saveTemplate(file: File): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(file, TEMPLATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function loadTemplate(): Promise<File | null> {
  const db = await openDb();
  try {
    return await new Promise<File | null>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(TEMPLATE_KEY);
      request.onsuccess = () => {
        const value: unknown = request.result;
        resolve(value instanceof File ? value : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
