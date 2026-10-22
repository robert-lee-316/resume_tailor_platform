// Run without additional npm dependencies: node template-library.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const code = ts.transpileModule(readFileSync(new URL('./lib/template-store.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const database = new Map();
const db = {
  close() {},
  transaction() {
    const tx = {
      error: null,
      oncomplete: null,
      onabort: null,
      onerror: null,
      objectStore() {
        return {
          get(key) {
            const request = { result: database.get(key), onsuccess: null, onerror: null };
            queueMicrotask(() => request.onsuccess?.());
            return request;
          },
          put(value, key) {
            database.set(key, value);
            queueMicrotask(() => tx.oncomplete?.());
          }
        };
      }
    };
    return tx;
  }
};
const indexedDB = { open() {
  const request = { result: db, onsuccess: null, onerror: null };
  queueMicrotask(() => request.onsuccess?.());
  return request;
}};
const exports = {};
vm.runInNewContext(code, { exports, indexedDB, crypto: globalThis.crypto, File, Date, Math, Promise });
const { loadTemplateLibrary, addTemplateToLibrary, selectLibraryTemplate, removeLibraryTemplate } = exports;
const first = new File(['one'], 'original.docx');
const second = new File(['two'], 'second.docx');

database.set('current-template', first);
let library = await loadTemplateLibrary();
assert.equal(library.items.length, 1, 'migrates existing single saved template');
assert.equal(library.items[0].name, first.name);
assert.equal(library.items[0].id, library.selectedId);

library = await addTemplateToLibrary(second);
assert.equal(library.items.length, 2);
assert.equal(library.items.find(x => x.id === library.selectedId).name, second.name);
assert.equal((await loadTemplateLibrary()).items.length, 2, 'persists entire library');

const originalId = library.items[0].id;
library = await selectLibraryTemplate(originalId);
assert.equal(library.selectedId, originalId);
assert.equal((await loadTemplateLibrary()).selectedId, originalId, 'persists selection');

library = await removeLibraryTemplate(originalId);
assert.equal(library.items.length, 1);
assert.equal(library.items[0].name, 'second.docx');
assert.equal(library.selectedId, library.items[0].id, 'fallback after removing active');

library = await removeLibraryTemplate(library.selectedId);
assert.equal(library.items.length, 0);
assert.equal(library.selectedId, null);
console.log('6 template-library checks passed');
