import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore, type StorageLike } from './builder-store.ts';
import { isBuilt, whenBuilt } from './build-status.ts';

const memory = (): StorageLike => { const saved = new Map<string, string>(); return { getItem: key => saved.get(key) ?? null, setItem: (key, value) => { saved.set(key, value); } }; };

test('builtDoc tracks the document the scene finished building, independent of the loading flag', async () => {
  const store = new BuilderStore(memory()); await store.ready;
  assert.equal(store.getSnapshot().builtDoc, null);
  assert.equal(isBuilt(store.getSnapshot()), false, 'nothing is built before the scene reports a build');
  // The scene reports a completed build of the current doc (one patch at the end of a rebuild).
  store.patch({ builtDoc: store.getSnapshot().doc, loading: false });
  assert.equal(isBuilt(store.getSnapshot()), true);
  await whenBuilt(store, 50);
  // A doc change (e.g. a drag move rebuilt from cached geometry, which never sets `loading`) is unsettled until reported.
  const first = store.getSnapshot().doc;
  store.commit({ ...first, rack: { ...first.rack, height: first.rack.height + 50 } });
  assert.equal(store.getSnapshot().loading, false);
  assert.equal(isBuilt(store.getSnapshot()), false, 'loading=false alone is not settled');
  const settled = whenBuilt(store, 1000);
  let resolved = false; void settled.then(() => { resolved = true; });
  store.status('Preparing GLB…'); await Promise.resolve();
  assert.equal(resolved, false, 'unrelated store updates do not settle it');
  store.patch({ builtDoc: first });
  await Promise.resolve();
  assert.equal(resolved, false, 'a report for an older doc does not settle it');
  queueMicrotask(() => store.patch({ builtDoc: store.getSnapshot().doc, loading: false, error: true, status: 'build failed' }));
  await settled;
  assert.equal(isBuilt(store.getSnapshot()), true, 'failed builds settle too; export checks success separately');
});

test('whenBuilt times out and unsubscribes when no build is reported', async () => {
  let listeners = 0;
  const snapshot = { doc: {} as never, builtDoc: null };
  const store = { getSnapshot: () => snapshot, subscribe: () => { listeners++; return () => { listeners--; }; } };
  await assert.rejects(whenBuilt(store, 10), /timed out/);
  assert.equal(listeners, 0);
});
