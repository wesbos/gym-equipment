import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore, AUTOSAVE_DELAY_MS, type StorageLike } from './builder-store.ts';
import { DocumentHistory, parseSession } from './history.ts';
import { addFloorItem, floorWarnings } from '../../rack-generator/floor-items.ts';
import { resizeAssembly } from '../../rack-generator/assembly.ts';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>(); writes = 0;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); this.writes++; }
}
/** Count calls to `object[name]` while `run` executes. */
function counting<T extends object>(object: T, name: keyof T & string, run: () => void) {
  const original = object[name] as (...args: unknown[]) => unknown;
  let calls = 0;
  (object as Record<string, unknown>)[name] = function (this: unknown, ...args: unknown[]) { calls++; return original.apply(this, args); };
  try { run(); } finally { (object as Record<string, unknown>)[name] = original; }
  return calls;
}
async function withFloorItem() {
  const storage = new MemoryStorage(), store = new BuilderStore(storage); await store.ready;
  store.commit(addFloorItem(store.getSnapshot().doc, 'rogue-kettlebell'));
  const id = store.getSnapshot().doc.floorItems!.at(-1)!.id;
  await store.flushStorage();
  return { storage, store, id };
}

test('a floor drag previews every move but appends one entry and writes storage once, at gesture end', async () => {
  const { storage, store, id } = await withFloorItem();
  const before = store.getSnapshot().timeline.latest, writes = storage.writes, start = store.getSnapshot().doc.floorItems!.at(-1)!.position;
  store.beginGesture();
  const appends = counting(DocumentHistory.prototype, 'append', () => {
    for (let i = 1; i <= 60; i++) store.updateFloor(id, { position: [i * 10, i * 5] });
  });
  assert.equal(appends, 0, 'no journal append per move');
  assert.deepEqual(store.getSnapshot().doc.floorItems!.at(-1)!.position, [600, 300], 'the preview follows the pointer');
  assert.equal(store.getSnapshot().timeline.latest, before + 1, 'the timeline shows the drag as one live entry');
  assert.equal(store.getSnapshot().canUndo, true);
  await new Promise(resolve => setTimeout(resolve, AUTOSAVE_DELAY_MS + 50));
  assert.equal(storage.writes, writes, 'no storage write during the gesture, even after the autosave delay');
  assert.equal(counting(DocumentHistory.prototype, 'append', () => store.endGesture()), 1);
  assert.equal(store.getSnapshot().timeline.latest, before + 1);
  await store.flushStorage();
  assert.equal(storage.writes, writes + 1, 'one draft write for the whole drag');
  store.history('undo');
  assert.deepEqual(store.getSnapshot().doc.floorItems!.at(-1)!.position, start, 'one undo reverts the whole drag');
  store.history('redo');
  assert.deepEqual(store.getSnapshot().doc.floorItems!.at(-1)!.position, [600, 300]);
});

test('commit cost stays flat with a 300-entry history: no whole-document JSON, clone count independent of length', async () => {
  const { store } = await withFloorItem();
  // The same edit (425 -> 725 wide) at both history lengths.
  const measure = () => {
    if (store.getSnapshot().doc.rack.width !== 425) store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
    const doc = resizeAssembly(store.getSnapshot().doc, { width: 725 }), full = JSON.stringify(doc).length;
    let whole = 0, stringify = 0, clones = 0;
    const original = JSON.stringify;
    JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => { const text = original(...args); if (text && text.length > full / 2) whole++; return text; }) as typeof JSON.stringify;
    try { stringify = counting(JSON, 'stringify', () => { clones = counting(globalThis, 'structuredClone', () => store.commit(doc)); }); }
    finally { JSON.stringify = original; }
    return { whole, stringify, clones };
  };
  const widths = (i: number) => [425, 725, 1075][i % 3];
  const early = measure();
  // Grow to 300+ entries; measure at a step that is not a keyframe (every 32nd).
  for (let i = 2; store.getSnapshot().timeline.latest < 301; i++) store.commit(resizeAssembly(store.getSnapshot().doc, { width: widths(i) }));
  while (store.getSnapshot().timeline.latest % 32 >= 30) store.commit(resizeAssembly(store.getSnapshot().doc, { width: widths(store.getSnapshot().timeline.latest) }));
  const late = measure();
  assert.ok(store.getSnapshot().timeline.latest > 300);
  assert.equal(early.whole, 0, 'no whole-document JSON on the commit path');
  assert.equal(late.whole, 0, 'no whole-document JSON on the commit path with long history');
  assert.equal(late.stringify, early.stringify, 'serialisation work does not grow with history');
  assert.equal(late.clones, early.clones, 'no timeline-sized cloning or replay as history grows');
});

test('the recovery draft is debounced, and flushes on flushStorage, the timer and page lifecycle events', async () => {
  const storage = new MemoryStorage(), store = new BuilderStore(storage); await store.ready;
  for (const width of [425, 1075, 725]) store.commit(resizeAssembly(store.getSnapshot().doc, { width }));
  assert.equal(storage.writes, 0, 'edits do not write synchronously');
  await store.flushStorage();
  assert.equal(storage.writes, 1, 'a burst of edits writes once');
  const copy = new MemoryStorage(); copy.values = new Map(storage.values);
  const reopened = new BuilderStore(copy); await reopened.ready; reopened.recoverDraft();
  assert.equal(reopened.getSnapshot().doc.rack.width, 725);
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 1075 }));
  await new Promise(resolve => setTimeout(resolve, AUTOSAVE_DELAY_MS + 100));
  assert.equal(storage.writes, 2, 'the trailing timer writes without an explicit flush');

  const events = new EventTarget(), doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const globals = globalThis as { window?: unknown; document?: unknown };
  const saved = { window: globals.window, document: globals.document };
  globals.window = events; globals.document = doc;
  try {
    const lifecycleStorage = new MemoryStorage(), live = new BuilderStore(lifecycleStorage); await live.ready;
    live.commit(resizeAssembly(live.getSnapshot().doc, { width: 425 }));
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    await live.flushStorage();
    assert.equal(lifecycleStorage.writes, 1);
    // A drag in progress when the page is hidden is saved as a consistent, recoverable step.
    live.beginGesture(); live.commit(resizeAssembly(live.getSnapshot().doc, { width: 725 }));
    events.dispatchEvent(new Event('pagehide'));
    await live.flushStorage();
    assert.equal(lifecycleStorage.writes, 2);
    const recovered = new BuilderStore(lifecycleStorage); await recovered.ready; recovered.recoverDraft();
    assert.equal(recovered.getSnapshot().doc.rack.width, 725);
    assert.equal(recovered.getSnapshot().timeline.latest, 2);
    // The gesture continues after the flush and still lands as one entry.
    live.commit(resizeAssembly(live.getSnapshot().doc, { width: 1075 })); live.endGesture();
    assert.equal(live.getSnapshot().timeline.latest, 2);
    live.history('undo'); assert.equal(live.getSnapshot().doc.rack.width, 425);
  } finally { globals.window = saved.window; globals.document = saved.document; }
});

test('seeking or exporting mid-gesture sees the live entry, and cancelling afterwards restores the journal', async () => {
  const store = new BuilderStore(new MemoryStorage()); await store.ready;
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 725 })); store.history('undo');
  const before = store.exportJSON();
  store.beginGesture(); store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  assert.equal(JSON.parse(store.exportJSON()).timeline.events.length, 2);
  store.commit(resizeAssembly(store.getSnapshot().doc, { width: 725 }));
  const exported = parseSession(JSON.parse(store.exportJSON())); // validates that the timeline ends at the doc
  assert.equal(exported.doc.rack.width, 725); assert.equal(exported.timeline!.applied, 2);
  store.cancelGesture();
  assert.equal(store.exportJSON(), before);
  assert.equal(store.getSnapshot().canRedo, true);
  store.beginGesture(); store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 }));
  assert.throws(() => store.seekHistory(9), /Invalid history step/);
  store.seekHistory(2); assert.equal(store.getSnapshot().doc.rack.width, 425);
  store.history('undo'); assert.equal(store.getSnapshot().doc.rack.width, 1075);
});

test('floor warnings filtered to the moving ids match filtering the full list', () => {
  let doc = new BuilderStore().getSnapshot().doc;
  for (const part of ['rep-nighthawk', 'rogue-kettlebell', 'tractor-supply-horse-stall-mat', 'rogue-echo-bike', 'rogue-kettlebell', 'concept2-rowerg']) doc = addFloorItem(doc, part);
  // Pile everything near the rack so overlap, clearance and underlay rules all fire.
  doc = { ...doc, floorItems: doc.floorItems!.map((item, i) => ({ ...item, position: [i * 150 - 300, 200] as [number, number] })) };
  const all = floorWarnings(doc);
  assert.ok(all.length > 3);
  for (const item of doc.floorItems!) for (const ids of [[item.id], [item.id, doc.floorItems![0].id]])
    assert.deepEqual(floorWarnings(doc, ids), all.filter(w => w.ids.some(id => ids.includes(id))));
  assert.deepEqual(floorWarnings(doc, []), []);
});
