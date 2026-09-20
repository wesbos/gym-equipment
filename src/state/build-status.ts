import type { BuilderSnapshot } from './builder-store.ts';

/** The scene has finished building the current document (it may have failed: see `error` / export checks). */
export const isBuilt = (snapshot: Pick<BuilderSnapshot, 'doc' | 'builtDoc'>) => snapshot.builtDoc === snapshot.doc;

/** Resolves once the scene has finished building the store's current document; rejects after `timeout` ms. */
export function whenBuilt(store: { getSnapshot(): Pick<BuilderSnapshot, 'doc' | 'builtDoc'>; subscribe(listener: () => void): () => void }, timeout = 45000) {
  return new Promise<void>((resolve, reject) => {
    if (isBuilt(store.getSnapshot())) { resolve(); return; }
    const done = (error?: Error) => { clearTimeout(timer); unsubscribe(); if (error) reject(error); else resolve(); };
    const unsubscribe = store.subscribe(() => { if (isBuilt(store.getSnapshot())) done(); });
    const timer = setTimeout(() => done(Error('CAD build timed out')), timeout);
  });
}
