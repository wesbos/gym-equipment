import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore, type StorageLike } from './builder-store.ts';
import { createAssembly, resizeAssembly, removeInstance, replaceStructurePart } from '../../rack-generator/assembly.ts';
import type { Target } from '../../rack-generator/types.ts';

const storageKey = 'bos-strength-assembly-v1';
class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  writes: string[] = [];
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); this.writes.push(value); }
}
const target: Target = { uprightId: 'rear-left', face: 'back', hole: 20 };

test('snapshots remain stable between updates and subscriptions can unsubscribe', () => {
  const store = new BuilderStore(), original = store.getSnapshot();
  assert.equal(store.getSnapshot(), original);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications++; });
  store.status('Ready');
  assert.equal(notifications, 1);
  const next = store.getSnapshot();
  assert.notEqual(next, original);
  assert.equal(next.doc, original.doc);
  assert.equal(next.resolved, original.resolved);
  assert.equal(original.status, 'Preparing your workspace…');
  unsubscribe(); unsubscribe();
  store.select('front-left');
  assert.equal(notifications, 1);
});

test('invalid edits and imports preserve document, selection, persistence and history', () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 725 }));
  store.history('undo');
  store.select('jhooks-front:left');
  const before = store.getSnapshot(), writes = storage.writes.length;
  assert.throws(() => store.commit({ ...before.doc, rack: { ...before.doc.rack, height: NaN } }), /Height/);
  assert.throws(() => store.importJSON('{broken'), SyntaxError);
  assert.throws(() => store.importJSON(JSON.stringify({ ...before.doc, version: 99 })), /Unsupported/);
  assert.equal(store.getSnapshot(), before);
  assert.equal(storage.writes.length, writes);
  store.act(() => store.importJSON('{}'));
  assert.equal(store.getSnapshot().doc, before.doc);
  assert.equal(store.getSnapshot().selected, 'jhooks-front');
  assert.equal(store.getSnapshot().error, true);
  assert.equal(store.getSnapshot().canUndo, false);
  assert.equal(store.getSnapshot().canRedo, true);
  store.history('redo');
  assert.equal(store.getSnapshot().doc.rack.width, 725);
});

test('commits detach inputs, persist documents and replace the redo branch after an edit', () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  const changed = resizeAssembly(store.getSnapshot().doc, { width: 725 });
  store.commit(changed); changed.rack.width = 1500;
  assert.equal(store.getSnapshot().doc.rack.width, 725);
  store.commit(resizeAssembly(store.getSnapshot().doc, { depth: 425 }));
  store.history('undo');
  assert.deepEqual([store.getSnapshot().doc.rack.width, store.getSnapshot().doc.rack.depth], [725, 725]);
  store.history('redo');
  assert.equal(store.getSnapshot().doc.rack.depth, 425);
  store.history('undo');
  store.commit(resizeAssembly(store.getSnapshot().doc, { height: 2300 }));
  assert.equal(store.getSnapshot().canRedo, false);
  store.history('redo');
  const saved = new BuilderStore(storage).getSnapshot();
  assert.deepEqual(saved.doc, store.getSnapshot().doc);
  assert.equal(saved.canUndo, false);
  assert.equal(saved.canRedo, false);
  assert.equal(saved.doc.rack.height, 2282);
});

test('JSON import is undoable and clears selection and transient placement', () => {
  const store = new BuilderStore();
  store.select('jhooks-front:right');
  store.startPlacement('storage-pin-short');
  const imported = createAssembly({ width: 1400, emptyAccessories: true });
  store.importJSON(JSON.stringify(imported));
  assert.deepEqual(store.getSnapshot().doc, imported);
  assert.equal(store.getSnapshot().selected, null);
  assert.equal(store.getSnapshot().placing, null);
  store.history('undo');
  assert.equal(store.getSnapshot().doc.rack.width, 1075);
  assert.equal(store.getSnapshot().doc.accessories.length, 3);
});

test('selection resolves paired mesh IDs and structural composites to their owning group', () => {
  const store = new BuilderStore();
  store.startPlacement('spotter-arm');
  store.select('jhooks-front:right');
  assert.equal(store.getSnapshot().selected, 'jhooks-front');
  assert.equal(store.getSnapshot().placing, null);
  store.startPlacement('nameplate');
  assert.equal(store.getSnapshot().structureChoice, 'nameplate');
  assert.equal(store.getSnapshot().selected, null);
  assert.equal(store.getSnapshot().placing, null);
  store.cancelPlacement();
  assert.equal(store.getSnapshot().structureChoice, null);
  store.commit(replaceStructurePart(store.getSnapshot().doc, 'rear-crossmember', 'nameplate'));
  const panel = store.getSnapshot().resolved.find(r => r.part === 'nameplate')!;
  store.select(panel.id);
  assert.equal(store.getSnapshot().selected, 'rear-crossmember');
});

test('placement previews are pure and moving adopts the existing group pairing', () => {
  const store = new BuilderStore(), initial = store.getSnapshot().doc;
  assert.throws(() => store.placementDoc(target), /Select a part/);
  store.patch({ paired: false });
  store.startPlacement('j-hook-standard', 'jhooks-front');
  assert.equal(store.getSnapshot().paired, true);
  const preview = store.placementDoc(target);
  assert.equal(store.getSnapshot().doc, initial);
  assert.equal(store.getSnapshot().canUndo, false);
  assert.equal(preview.accessories.length, initial.accessories.length);
  assert.deepEqual(preview.accessories.find(a => a.id === 'jhooks-front')!.target, target);
  store.patch({ paired: false });
  store.commit(store.placementDoc(target));
  assert.equal(store.getSnapshot().placing, null);
  assert.equal(store.getSnapshot().doc.accessories.find(a => a.id === 'jhooks-front')!.paired, false);
  assert.equal(store.getSnapshot().resolved.filter(r => r.ownerId === 'jhooks-front').length, 1);
});

test('new placement respects pair preference and complete attachments cannot become pairs', () => {
  const store = new BuilderStore();
  store.patch({ paired: false }); store.startPlacement('storage-pin-long');
  assert.equal(store.placementDoc(target).accessories.at(-1)!.paired, false);
  store.patch({ paired: true });
  assert.equal(store.placementDoc(target).accessories.at(-1)!.paired, true);
  store.startPlacement('dip-horn');
  assert.equal(store.placementDoc(target).accessories.at(-1)!.paired, false);
  const removed = removeInstance(store.getSnapshot().doc, 'rear-left');
  store.commit(removed); store.startPlacement('storage-pin-long');
  const beforeInvalidPlacement = store.getSnapshot();
  assert.throws(() => store.placementDoc(target), /removed/);
  assert.equal(store.getSnapshot(), beforeInvalidPlacement);
  assert.equal(store.getSnapshot().canUndo, true);
});

test('unavailable or corrupt storage has a recoverable error without losing committed work', () => {
  const storage = new MemoryStorage(); storage.values.set(storageKey, '{broken');
  const recovered = new BuilderStore(storage);
  assert.equal(recovered.getSnapshot().error, true);
  assert.deepEqual(recovered.getSnapshot().doc, createAssembly());
  const unavailable: StorageLike = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  const store = new BuilderStore(unavailable);
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  assert.equal(store.getSnapshot().doc.rack.width, 425);
  assert.equal(store.getSnapshot().canUndo, true);
  assert.match(store.getSnapshot().status, /Save your design as JSON/);
  store.history('undo');
  assert.equal(store.getSnapshot().doc.rack.width, 1075);
});

test('history retains the newest one hundred edits without an unbounded document stack', () => {
  const store = new BuilderStore();
  for (let i = 1; i <= 102; i++) store.commit({ ...store.getSnapshot().doc, nextId: i + 1 });
  for (let i = 0; i < 100; i++) store.history('undo');
  assert.equal(store.getSnapshot().doc.nextId, 3);
  assert.equal(store.getSnapshot().canUndo, false);
  const exhausted = store.getSnapshot(); store.history('undo');
  assert.equal(store.getSnapshot(), exhausted);
  for (let i = 0; i < 100; i++) store.history('redo');
  assert.equal(store.getSnapshot().doc.nextId, 103);
  assert.equal(store.getSnapshot().canRedo, false);
});
