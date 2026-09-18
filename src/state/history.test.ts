import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, addAccessory, removeInstance, resizeAssembly } from '../../rack-generator/assembly.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { DocumentHistory, applyOps, diffDocuments, parseSession } from './history.ts';
import { BuilderStore, type StorageLike } from './builder-store.ts';
class MemoryStorage implements StorageLike {
  values = new Map<string,string>(); writes = 0;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key,value); this.writes++; }
}
test('compact reversible owner operations preserve unrelated edits and array order', () => {
  const original = createAssembly();
  const added = addAccessory(original, 'storage-pin-short', { uprightId: 'rear-left', face: 'back', hole: 20 });
  const ops = diffDocuments(original, added);
  assert.deepEqual(applyOps(original, ops), added);
  assert.deepEqual(applyOps(added, ops, true), original);
  const removed = removeInstance(added, original.accessories[0].id);
  const deletion = diffDocuments(added, removed);
  assert.deepEqual(applyOps(removed, deletion, true), added);
  const empty = { ...added, accessories: [] };
  assert.deepEqual(applyOps(empty, diffDocuments(added, empty), true), added);
  const changed = structuredClone(original); changed.accessories[1].target.hole = 23;
  const latest = resizeAssembly(added, { width: 725 });
  const result = applyOps(latest, diffDocuments(original, changed));
  assert.equal(result.accessories.length, added.accessories.length);
  assert.equal(result.rack.width, 725);
});
test('long history seeks every step from periodic keyframes without snapshot stacks', () => {
  const original = createAssembly(), history = new DocumentHistory(original);
  for (let step = 1; step <= 257; step++) history.append({ ...original, nextId: step + 1 });
  assert.equal(history.data.events.length, 257);
  assert.equal(history.data.keyframes.length, 8);
  assert.ok(history.data.events.every(event => event.ops.length === 1 && event.ops[0].path.join('.') === 'nextId'));
  for (let step = 257; step >= 0; step--) assert.equal(history.seek(step).nextId, step + 1);
  for (let step = 0; step <= 257; step += 7) assert.equal(history.seek(step).nextId, step + 1);
  const serialized = JSON.stringify(history.data);
  assert.ok(serialized.length < JSON.stringify(original).length * 257 / 3);
});
test('old-view appearance edit retains later dimensions and added accessory', async () => {
  const store = new BuilderStore(new MemoryStorage()); await store.ready;
  store.edit(doc => ({ ...doc, appearance: { frameColor: '#aa2222' } }));
  store.edit(doc => addAccessory(doc, 'storage-pin-short', { uprightId: 'rear-left', face: 'back', hole: 20 }));
  store.edit(doc => resizeAssembly(doc, { width: 725 }));
  const applied = store.getAppliedDoc(); store.seekHistory(1);
  const oldView = store.getSnapshot().doc;
  store.act(() => store.commit({ ...oldView, appearance: { ...oldView.appearance, frameColor: '#2244aa' } }));
  assert.equal(store.getSnapshot().doc.rack.width, 725);
  assert.deepEqual(store.getSnapshot().doc.accessories, applied.accessories);
  assert.equal(store.getSnapshot().doc.appearance?.frameColor, '#2244aa');
  assert.equal(store.getSnapshot().timeline.viewing, false);
  store.history('undo'); assert.deepEqual(store.getAppliedDoc(), applied);
});
test('old-view edit to owner removed later is rejected atomically', async () => {
  const store = new BuilderStore(new MemoryStorage()); await store.ready;
  const id = store.getSnapshot().doc.accessories[0].id;
  store.edit(doc => removeInstance(doc, id)); store.seekHistory(0);
  const old = structuredClone(store.getSnapshot().doc); old.accessories[0].target.hole--;
  const before = store.getSnapshot();
  assert.throws(() => store.commit(old), /no longer exists/);
  assert.equal(store.getSnapshot(), before);
  assert.equal(store.getAppliedDoc().accessories.some(a => a.id === id), false);
});
test('seeking is read-only for live doc, dirty state, durable save and recovery draft', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage); await store.ready;
  store.edit(doc => resizeAssembly(doc, { width: 725 })); await store.save('Rack');
  store.edit(doc => resizeAssembly(doc, { depth: 425 })); await store.flushStorage();
  const live = store.getAppliedDoc(), writes = storage.writes, dirty = store.getSnapshot().dirty;
  store.seekHistory(0); store.seekHistory(1);
  await store.flushStorage(); assert.equal(storage.writes, writes); assert.equal(store.getSnapshot().dirty, dirty);
  assert.deepEqual(parseSession(JSON.parse(store.exportJSON())).doc, live);
  await store.save('Rack');
  const reopened = new BuilderStore(storage); await reopened.ready;
  assert.deepEqual(reopened.getAppliedDoc(), live); assert.equal(reopened.getSnapshot().timeline.latest, 2);
  reopened.seekHistory(0); assert.equal(reopened.getSnapshot().doc.rack.width, 1075);
});
test('restore is one undoable marker and abandoned redo events remain seekable', async () => {
  const store = new BuilderStore(new MemoryStorage()); await store.ready;
  store.edit(doc => resizeAssembly(doc, { width: 725 }));
  store.edit(doc => resizeAssembly(doc, { depth: 425 }));
  const latest = store.getAppliedDoc(); store.seekHistory(0); store.restoreHistory();
  assert.equal(store.getSnapshot().timeline.entries.at(-1)?.category, 'restore');
  assert.equal(store.getSnapshot().timeline.latest, 3);
  store.history('undo'); assert.deepEqual(store.getAppliedDoc(), latest);
  store.history('undo'); store.edit(doc => ({ ...doc, nextId: 40 }));
  assert.equal(store.getSnapshot().canRedo, false); assert.equal(store.getSnapshot().timeline.latest, 4);
  store.seekHistory(2); assert.deepEqual(store.getSnapshot().doc, latest);
  store.latestHistory(); assert.equal(store.getAppliedDoc().nextId, 40);
  store.history('undo'); assert.equal(store.getSnapshot().timeline.applied, 1);
});
test('session roundtrip retains undo/redo head, preset marker, all steps and clear privacy', async () => {
  const store = new BuilderStore(new MemoryStorage()); await store.ready;
  store.edit(doc => resizeAssembly(doc, { width: 725 }));
  store.commit(applyPreset('generic-half'), { category: 'preset', label: 'Half rack', replacement: true });
  store.history('undo');
  const exported = store.exportJSON(), imported = new BuilderStore(new MemoryStorage()); await imported.ready;
  imported.importJSON(exported); assert.equal(imported.getSnapshot().canRedo, true);
  assert.equal(imported.getSnapshot().timeline.entries[1].category, 'preset');
  imported.history('redo'); assert.deepEqual(imported.getAppliedDoc(), applyPreset('generic-half'));
  imported.clearHistory();
  const data = JSON.parse(imported.exportJSON());
  assert.equal(data.timeline.events.length, 0); assert.equal(data.timeline.keyframes.length, 0);
  assert.equal(imported.getSnapshot().canUndo, false); assert.equal(imported.getSnapshot().timeline.viewing, false);
  assert.deepEqual(data.timeline.base, imported.getAppliedDoc());
});
test('gesture previews group once; cancellation restores redo and persisted recovery history', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage); await store.ready;
  store.edit(doc => resizeAssembly(doc, { width: 725 })); store.history('undo');
  const before = store.exportJSON();
  store.beginGesture();
  for (const width of [425, 450, 475]) store.edit(doc => resizeAssembly(doc, { width }));
  assert.equal(store.getSnapshot().timeline.latest, 2);
  store.cancelGesture(); assert.equal(store.exportJSON(), before); assert.equal(store.getSnapshot().canRedo, true);
  await store.flushStorage();
  const reopened = new BuilderStore(storage); await reopened.ready; reopened.recoverDraft();
  assert.deepEqual(JSON.parse(reopened.exportJSON()), JSON.parse(before));
  store.beginGesture(); store.edit(doc => resizeAssembly(doc, { width: 725 })); store.endGesture();
  assert.equal(store.getSnapshot().timeline.latest, 2); store.history('undo');
  assert.equal(store.getAppliedDoc().rack.width, 1075);
});
test('malformed timeline input fails atomically; legacy embedded history never reaches geometry', async () => {
  const store = new BuilderStore(new MemoryStorage()); await store.ready;
  for (let nextId = 2; nextId <= 34; nextId++) store.edit(doc => ({ ...doc, nextId }));
  const valid = JSON.parse(store.exportJSON()), before = store.getSnapshot();
  const mutations = [
    (v: any) => v.timeline.applied = 99,
    (v: any) => v.timeline.events[0].parent = 1,
    (v: any) => v.timeline.events[0].ops[0].before = 999,
    (v: any) => v.timeline.events[0].ops[0].path = ['__proto__', 'polluted'],
    (v: any) => v.timeline.events[0].ops[0].path = ['rack', '__proto__'],
    (v: any) => v.timeline.events[0].category = 'fake',
    (v: any) => v.timeline.keyframes[0].json = JSON.stringify(createAssembly()),
    (v: any) => v.doc.nextId = 999,
    (v: any) => v.timeline.redo = [999],
  ];
  for (const mutate of mutations) { const value = structuredClone(valid); mutate(value); assert.throws(() => store.importJSON(JSON.stringify(value))); assert.equal(store.getSnapshot(), before); }
  store.importJSON(JSON.stringify({ ...createAssembly(), timeline: valid.timeline, history: valid }));
  assert.equal('timeline' in store.getSnapshot().doc, false);
  assert.equal('history' in store.getSnapshot().doc, false);
  assert.ok(!JSON.stringify(JSON.parse(store.exportJSON()).timeline.events).includes('bos-strength-session'));
});
