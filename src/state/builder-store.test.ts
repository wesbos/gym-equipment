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
  assert.equal(store.getSnapshot().selected, 'jhooks-front:left');
  assert.equal(store.getSnapshot().error, true);
  assert.equal(store.getSnapshot().canUndo, false);
  assert.equal(store.getSnapshot().canRedo, true);
  store.history('redo');
  assert.equal(store.getSnapshot().doc.rack.width, 725);
});

test('commits detach inputs and replace redo; only explicit save persists durable documents', async () => {
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
  await store.save('Training rack');
  const reopened = new BuilderStore(storage);
  await reopened.ready;
  const saved = reopened.getSnapshot();
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

test('selection preserves physical side IDs and structural composite IDs', () => {
  const store = new BuilderStore();
  store.startPlacement('spotter-arm');
  store.select('jhooks-front:right');
  assert.equal(store.getSnapshot().selected, 'jhooks-front:right');
  assert.equal(store.ownerOf(store.getSnapshot().selected), 'jhooks-front');
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

test('unavailable or corrupt storage has a recoverable error without losing committed work', async () => {
  const storage = new MemoryStorage(); storage.values.set(storageKey, '{broken');
  const recovered = new BuilderStore(storage);
  await recovered.ready;
  assert.equal(recovered.getSnapshot().error, true);
  assert.deepEqual(recovered.getSnapshot().doc, createAssembly());
  const unavailable: StorageLike = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  const store = new BuilderStore(unavailable);
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  assert.equal(store.getSnapshot().doc.rack.width, 425);
  assert.equal(store.getSnapshot().canUndo, true);
  await store.flushStorage();
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


test('named save/load, duplicate, rename, delete and draft recovery keep working copies separate', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  await store.ready;
  await store.save('Original');
  const original = store.getSnapshot().activeId!;
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  await store.flushStorage();
  const reopened = new BuilderStore(storage);
  await reopened.ready;
  assert.equal(reopened.getSnapshot().doc.rack.width, 1075);
  assert.equal(reopened.getSnapshot().draftAvailable, true);
  reopened.recoverDraft();
  assert.equal(reopened.getSnapshot().doc.rack.width, 425);
  await reopened.save('Wide', true);
  const wide = reopened.getSnapshot().activeId!;
  assert.notEqual(wide, original);
  await reopened.rename(wide, 'Wide rack');
  assert.equal(reopened.getSnapshot().configs.find(c => c.id === wide)!.name, 'Wide rack');
  await reopened.load(original);
  assert.equal(reopened.getSnapshot().doc.rack.width, 1075);
  assert.equal(reopened.getSnapshot().canUndo, false);
  await reopened.deleteConfig(wide);
  const final = new BuilderStore(storage); await final.ready;
  assert.equal(final.getSnapshot().configs.length, 1);
  assert.equal(final.getSnapshot().configs[0]!.name, 'Original');
});

test('legacy single-slot doc migrates once and transient import never overwrites it', async () => {
  const storage = new MemoryStorage();
  storage.setItem(storageKey, JSON.stringify(createAssembly({ width: 1300 })));
  const store = new BuilderStore(storage); await store.ready;
  assert.equal(store.getSnapshot().doc.rack.width, 1300);
  assert.equal(store.getSnapshot().configs[0]!.name, 'Imported rack');
  store.importJSON(JSON.stringify(createAssembly({ width: 1500 })));
  await store.flushStorage();
  const reopened = new BuilderStore(storage); await reopened.ready;
  assert.equal(reopened.getSnapshot().doc.rack.width, 1300);
  assert.equal(reopened.getSnapshot().draftAvailable, true);
  await reopened.deleteConfig('legacy');
  const empty = new BuilderStore(storage); await empty.ready;
  assert.equal(empty.getSnapshot().configs.length, 0);
});

test('a gesture contributes one undo entry, while subsequent edits remain independent', () => {
  const store = new BuilderStore();
  store.beginGesture();
  for (let width = 425; width <= 725; width += 10) store.commit(resizeAssembly(store.getSnapshot().doc, { width }));
  store.endGesture();
  store.history('undo');
  assert.equal(store.getSnapshot().doc.rack.width, 1075);
  assert.equal(store.getSnapshot().canUndo, false);
  store.history('redo');
  assert.equal(store.getSnapshot().doc.rack.width, 725);
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  store.history('undo');
  assert.equal(store.getSnapshot().doc.rack.width, 725);
});

test('failed saves leave named snapshots untouched and the working copy exportable', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  await store.ready; await store.save('Original');
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(store.save('Changed'), /quota/);
  assert.equal(store.getSnapshot().configs[0]!.name, 'Original');
  assert.equal(store.getSnapshot().configs[0]!.doc.rack.width, 1075);
  assert.equal(store.getSnapshot().doc.rack.width, 425);
  assert.equal(store.getSnapshot().dirty, true);
});

test('new rack saves separately and unsaved new racks reopen the last named configuration', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage);
  await store.ready;
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  await store.save('First');
  const first = store.getSnapshot().activeId;
  store.newRack();
  await store.flushStorage();
  assert.equal(store.getSnapshot().activeId, null);
  const reopened = new BuilderStore(storage); await reopened.ready;
  assert.equal(reopened.getSnapshot().doc.rack.width, 425);
  await store.save('Second');
  assert.notEqual(store.getSnapshot().activeId, first);
  assert.equal(store.getSnapshot().configs.length, 2);
});

test('corrupt configuration collections are not overwritten by draft autosave', async () => {
  const storage = new MemoryStorage();
  const key = 'bos-strength-configurations-v1';
  storage.setItem(key, '{broken');
  const store = new BuilderStore(storage); await store.ready;
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  await store.flushStorage();
  assert.equal(storage.getItem(key), '{broken');
  await assert.rejects(store.save('Recovery'), /could not be read/);
  assert.equal(store.getSnapshot().doc.rack.width, 425);
});

test('slow async storage preserves save-time doc and coalesces later working edits', async () => {
  let persisted: import('./config-storage.ts').ConfigCollection = { configs: [], activeId: null, draft: null };
  let release!: () => void, started!: () => void, count = 0;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const writing = new Promise<void>(resolve => { started = resolve; });
  const store = new BuilderStore({
    async read() { return structuredClone(persisted); },
    async write(value) {
      if (++count === 2) { started(); await blocked; }
      persisted = structuredClone(value);
    },
  });
  await store.ready; await store.save('Original');
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 725 }));
  await writing;
  const saving = store.save('Original');
  for (let width = 724; width >= 425; width--) store.commit(resizeAssembly(store.getSnapshot().doc, { width }));
  release(); await saving; await store.flushStorage();
  assert.equal(persisted.configs[0]!.doc.rack.width, 725);
  assert.equal(persisted.draft!.rack.width, 425);
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(count, 4);
});

test('a full browser can still open and export its legacy single-slot design', async () => {
  const storage: StorageLike = {
    getItem(key) { return key === storageKey ? JSON.stringify(createAssembly({ width: 1350 })) : null; },
    setItem() { throw new Error('quota'); },
  };
  const store = new BuilderStore(storage); await store.ready;
  assert.equal(store.getSnapshot().doc.rack.width, 1350);
  await assert.rejects(store.save('Migrated'), /quota/);
  assert.equal(store.getSnapshot().doc.rack.width, 1350);
  assert.match(store.getSnapshot().storageError!, /JSON/);
});


test('structural selection resolves its owner for replacement', () => {
  const store = new BuilderStore();
  store.commit(replaceStructurePart(store.getSnapshot().doc, 'rear-crossmember', 'branded-crossmember'));
  const piece = store.getSnapshot().resolved.find(r => r.ownerId === 'rear-crossmember')!;
  assert.ok(piece);
  store.select(piece.id);
  assert.equal(store.getSnapshot().selected, piece.id);
  assert.equal(store.ownerOf(piece.id), 'rear-crossmember');
  const edited = replaceStructurePart(store.getSnapshot().doc, store.ownerOf(piece.id)!, 'nameplate');
  store.commit(edited);
  assert.equal(store.getSnapshot().doc.structure['rear-crossmember']?.part, 'nameplate');
});

test('real v1 saved rack migrates paint and physical IDs while graph edits remain drafts until saved', async () => {
  const storage = new MemoryStorage();
  storage.setItem(storageKey, JSON.stringify({
    version: 1, rack: createAssembly().rack, removed: [], structure: {}, nextId: 1,
    accessories: [{ id: 'legacy-hooks', part: 'j-hook-standard', target: { uprightId: 'front-left', face: 'front', hole: 24 }, paired: true, params: {} }],
    appearance: { frameColor: '#aa2222', hardwareFinish: 'gold', overrides: { 'legacy-hooks:right': '#2244aa' } },
  }));
  const store = new BuilderStore(storage); await store.ready;
  const original = store.getSnapshot().doc;
  assert.equal(original.version, 2);
  assert.equal(original.rack.height, 2032);
  store.select('legacy-hooks:right');
  assert.equal(store.getSnapshot().selected, 'legacy-hooks:right');
  assert.equal(store.ownerOf('legacy-hooks:right'), 'legacy-hooks');
  const { extendUpright } = await import('../../rack-generator/graph-edits.ts');
  store.commit(extendUpright(original, 'front-left', 'left', 425));
  await store.flushStorage();
  assert.equal(Object.keys(store.getSnapshot().configs[0]!.doc.uprights).length, 4);
  assert.equal(Object.keys(store.getSnapshot().doc.uprights).length, 5);
  store.history('undo'); assert.equal(Object.keys(store.getSnapshot().doc.uprights).length, 4);
  store.history('redo');
  await store.save('Imported rack');
  const reopened = new BuilderStore(storage); await reopened.ready;
  assert.equal(Object.keys(reopened.getSnapshot().doc.uprights).length, 5);
  assert.deepEqual(reopened.getSnapshot().doc.appearance, original.appearance);
});
