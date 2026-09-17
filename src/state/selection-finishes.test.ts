import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';
import { createAssembly, unpairAccessory } from '../../rack-generator/assembly.ts';
import { resolveMaterial } from '../../rack-generator/appearance.ts';

const ids = ['front-left', 'front-right'];
const appearance = (store: BuilderStore) => store.getSnapshot().doc.appearance!;

test('bulk steel finish and paint target physical IDs with one undo and independent resets', () => {
  const store = new BuilderStore();
  store.commit({ ...store.getSnapshot().doc, appearance: { frameFinish: 'stainless', hardwareFinish: 'gold',
    overrides: { 'front-left': '#123456', 'front-right': '#abcdef', 'rear-left': '#654321' },
    finishOverrides: { 'front-left': 'stainless', 'front-right': 'clear-grind', 'rear-left': 'clear-grind' } } });
  store.selectMany(ids); const original = store.getSnapshot().doc;
  store.finishSelection('clear-grind');
  assert.ok(ids.every(id => appearance(store).finishOverrides?.[id] === 'clear-grind'));
  assert.deepEqual(appearance(store).overrides, original.appearance!.overrides);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, original);
  store.history('redo'); store.paintSelection('#ff0000');
  for (const id of ids) {
    assert.equal(appearance(store).finishOverrides?.[id], 'paint');
    assert.equal(resolveMaterial({ role: 'frame' }, appearance(store), id).color, '#ff0000');
  }
  store.finishSelection('stainless'); const steel = store.getSnapshot().doc;
  store.paintSelection(); // color reset must not switch steel to paint
  for (const id of ids) { assert.equal(appearance(store).overrides?.[id], undefined); assert.equal(appearance(store).finishOverrides?.[id], 'stainless'); }
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, steel);
  store.finishSelection(); // finish reset keeps the remembered color while restoring rack steel
  for (const id of ids) { assert.equal(appearance(store).finishOverrides?.[id], 'stainless'); assert.equal(appearance(store).overrides?.[id], '#ff0000'); }
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, steel);
  store.resetSelectionAppearance();
  for (const id of ids) {
    assert.equal(appearance(store).overrides?.[id], undefined);
    assert.equal(appearance(store).finishOverrides?.[id], undefined);
    assert.equal(resolveMaterial({ role: 'frame' }, appearance(store), id).finish, 'stainless');
  }
  assert.equal(appearance(store).finishOverrides?.['rear-left'], 'clear-grind');
  assert.equal(appearance(store).overrides?.['rear-left'], '#654321');
  assert.equal(resolveMaterial({ role: 'fastener' }, appearance(store)).color, '#d6ad52');
  assert.equal(resolveMaterial({ role: 'rod', color: '#aabbcc' }, appearance(store)).color, '#aabbcc');
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, steel);
});

test('copy and unpair preserve color and finish maps for same-side, reversed and arbitrary upright pairs', () => {
  for (const [first, second] of [['front-left', 'rear-left'], ['front-right', 'front-left'], ['alpha', 'beta']]) {
    const store = new BuilderStore(), doc = createAssembly({ emptyAccessories: true });
    doc.uprights.alpha = { ...doc.uprights['front-left'], x: -1500 };
    doc.uprights.beta = { ...doc.uprights['rear-right'], x: 1500 };
    doc.accessories.push({ id: 'pair', part: 'j-hook-standard', paired: true, pairTo: second,
      target: { uprightId: first, face: 'front', hole: 12 }, params: {} });
    store.commit(doc);
    const pair = store.getSnapshot().resolved.filter(r => r.ownerId === 'pair');
    store.select(pair[0].id); store.paintSelection('#123456'); store.finishSelection('stainless');
    store.select(pair[1].id); store.finishSelection('clear-grind'); // finish-only override must also copy
    store.selectMany(pair.map(r => r.id)); const before = store.getSnapshot().doc;
    store.duplicateSelected(); const copies = store.getSnapshot().resolved.filter(r => store.getSnapshot().selection.includes(r.id));
    assert.equal(copies.length, 2);
    for (let i = 0; i < 2; i++) {
      assert.equal(copies[i].mount!.uprightId, pair[i].mount!.uprightId);
      assert.equal(appearance(store).overrides?.[copies[i].id], before.appearance!.overrides?.[pair[i].id]);
      assert.equal(appearance(store).finishOverrides?.[copies[i].id], before.appearance!.finishOverrides?.[pair[i].id]);
    }
    const copied = store.getSnapshot().doc;
    const split = unpairAccessory(copied, copies[0].ownerId);
    const splitCopies = split.accessories.filter(a => a.id !== 'pair');
    assert.deepEqual(splitCopies.map(a => resolveMaterial({ role: 'frame' }, split.appearance, a.id).finish), ['stainless', 'clear-grind']);
    store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
    store.history('redo'); assert.deepEqual(store.getSnapshot().doc, copied);
  }
});

test('bulk finishes serialize on explicit Save and selection stays transient', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const store = new BuilderStore(storage); await store.ready; await store.save('Steel');
  store.selectMany(ids); store.finishSelection('clear-grind'); await store.flushStorage();
  const unsaved = new BuilderStore(storage); await unsaved.ready;
  assert.equal(unsaved.getSnapshot().doc.appearance, undefined);
  await store.save('Steel'); const saved = new BuilderStore(storage); await saved.ready;
  assert.deepEqual(saved.getSnapshot().selection, []);
  for (const id of ids) assert.equal(resolveMaterial({ role: 'frame' }, appearance(saved), id).color, '#aaa59a');
  assert.deepEqual(appearance(saved), appearance(store));
});


test('color-only legacy overrides preserve paint on color reset and inherit rack steel on finish reset', () => {
  const store = new BuilderStore();
  store.commit({ ...store.getSnapshot().doc, appearance: { frameFinish: 'clear-grind',
    overrides: { 'front-left': '#123456', 'front-right': '#abcdef' } } });
  store.selectMany(ids); const before = store.getSnapshot().doc;
  store.paintSelection();
  for (const id of ids) {
    assert.equal(appearance(store).overrides?.[id], undefined);
    assert.equal(appearance(store).finishOverrides?.[id], 'paint');
    assert.equal(resolveMaterial({ role: 'frame' }, appearance(store), id).finish, undefined);
  }
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
  store.finishSelection();
  for (const id of ids) {
    assert.equal(appearance(store).overrides?.[id], before.appearance!.overrides?.[id]);
    assert.equal(resolveMaterial({ role: 'frame' }, appearance(store), id).finish, 'clear-grind');
  }
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
});
