import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore, type StorageLike } from '../state/builder-store.ts';
import { CONFIG_KEY, type ConfigCollection } from '../state/config-storage.ts';
import { createAssembly, resizeAssembly } from '../../rack-generator/assembly.ts';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const stored = (storage: MemoryStorage) => JSON.parse(storage.getItem(CONFIG_KEY)!) as ConfigCollection;
const gymDoc = () => resizeAssembly(createAssembly(), { width: 725, height: 2286 });

test('opening a gym keeps unsaved work as a saved configuration and opens the gym as the new draft', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  await store.ready;
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  const kept = await store.openDesign(gymDoc(), 'Cable Compound');
  await store.flushStorage();
  assert.equal(kept, 'Unsaved draft (before Cable Compound)');
  const state = store.getSnapshot();
  assert.equal(state.doc.rack.width, 725);
  assert.equal(state.activeId, null, 'the gym is a new, unsaved design');
  assert.equal(state.dirty, true);
  assert.equal(state.canUndo, false, 'the gym starts a fresh history');
  const collection = stored(storage);
  assert.equal(collection.configs.length, 1);
  assert.equal(collection.configs[0].name, kept);
  assert.equal(collection.configs[0].doc.rack.width, 425, 'the user\'s edit is recoverable');
  assert.equal(collection.draft?.rack.width, 725, 'the gym autosaves as the draft');

  // Reopening restores neither over the other: the kept work loads by name, the gym is the draft.
  const reopened = new BuilderStore(storage);
  await reopened.ready;
  assert.equal(reopened.getSnapshot().draftAvailable, true);
  await reopened.load(collection.configs[0].id);
  assert.equal(reopened.getSnapshot().doc.rack.width, 425);
});

test('opening a gym over a draft left from an earlier visit keeps that draft too', async () => {
  const storage = new MemoryStorage(), first = new BuilderStore(storage);
  await first.ready;
  await first.save('Mine');
  first.commit(resizeAssembly(first.getSnapshot().doc, { width: 425 }));
  await first.flushStorage();
  // The builder unmounted (e.g. navigating to /gyms); a new page opens the gym.
  const next = new BuilderStore(storage);
  await next.openDesign(gymDoc(), 'B3');
  await next.flushStorage();
  const collection = stored(storage);
  assert.deepEqual(collection.configs.map(c => c.name), ['Mine', 'Unsaved draft (before B3)']);
  assert.equal(collection.configs[1].doc.rack.width, 425);
  assert.equal(collection.draft?.rack.width, 725);
  assert.equal(collection.activeId, null);
});

test('opening a gym with no unsaved work saves nothing extra', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  await store.save('Mine');
  assert.equal(await store.openDesign(gymDoc(), 'FE Strength Lab'), null);
  await store.flushStorage();
  assert.deepEqual(stored(storage).configs.map(c => c.name), ['Mine']);
  assert.equal(store.getSnapshot().doc.rack.width, 725);
});

test('reopening the same unedited gym (a reload of its link, #220) keeps nothing extra', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  await store.save('Mine');
  assert.equal(await store.openDesign(gymDoc(), 'Cable Compound'), null);
  await store.flushStorage();
  // A reload: a fresh page opens the same gym over its own untouched draft.
  const reloaded = new BuilderStore(storage);
  assert.equal(await reloaded.openDesign(gymDoc(), 'Cable Compound'), null);
  await reloaded.flushStorage();
  assert.deepEqual(stored(storage).configs.map(c => c.name), ['Mine']);
  // Once edited, the draft is the user's work again and a later open keeps it.
  reloaded.commit(resizeAssembly(reloaded.getSnapshot().doc, { width: 425 }));
  assert.equal(await reloaded.openDesign(gymDoc(), 'Cable Compound'), 'Unsaved draft (before Cable Compound)');
});
