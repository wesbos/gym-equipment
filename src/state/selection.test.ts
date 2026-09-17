import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';
import { resolveMaterial } from '../../rack-generator/appearance.ts';
import { sharedFields, selectionOwners } from './selection.ts';
import { LocalConfigStorage } from './config-storage.ts';

test('physical selection toggles, replaces, ranges, and yields to placement; Escape clears', () => {
  const store = new BuilderStore();
  const ids = store.getSnapshot().resolved.filter(r => r.part === 'upright').map(r => r.id);
  ids.forEach(id => store.select(id, { metaKey: true }));
  assert.deepEqual(store.getSnapshot().selection, ids);
  store.select(ids[1], { ctrlKey: true });
  assert.equal(store.getSnapshot().selection.length, 3);
  store.select(ids[0]); store.select(ids[3], { shiftKey: true }, ids);
  assert.deepEqual(store.getSnapshot().selection, ids);
  store.select(ids[1]); assert.deepEqual(store.getSnapshot().selection, [ids[1]]);
  store.startPlacement('j-hook-standard'); store.select(ids[0], {}); store.selectMany(ids);
  assert.deepEqual(store.getSnapshot().selection, []);
  assert.ok(store.getSnapshot().placing);
  store.escape(); assert.deepEqual(store.getSnapshot().selection, []); assert.equal(store.getSnapshot().placing, null);
  assert.equal(store.getSnapshot().proposal, null);
});

test('four upright paint is one undo step, persists only on explicit Save, exports through material resolver', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const store = new BuilderStore(storage); await store.ready; await store.save('Original');
  const before = store.getSnapshot().doc;
  const ids = store.getSnapshot().resolved.filter(r => r.part === 'upright').map(r => r.id);
  store.selectMany(ids); store.paintSelection('#ff0000'); await store.flushStorage();
  assert.equal((await new LocalConfigStorage(storage).read()).configs[0].doc.appearance, undefined);
  for (const id of ids) assert.equal(resolveMaterial({ role: 'frame' }, store.getSnapshot().doc.appearance, id).color, '#ff0000');
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
  store.history('redo'); await store.save('Original');
  const reloaded = new BuilderStore(storage); await reloaded.ready;
  assert.deepEqual(reloaded.getSnapshot().selection, []);
  assert.deepEqual(reloaded.getSnapshot().doc.appearance, store.getSnapshot().doc.appearance);
  assert.equal('selection' in reloaded.getSnapshot().doc, false);
});

test('pair sides paint independently; bulk params, duplication and owner removal are atomic', () => {
  const store = new BuilderStore();
  const pair = store.getSnapshot().resolved.filter(r => r.ownerId === 'jhooks-front');
  assert.equal(pair.length, 2);
  store.select(pair[0].id); store.paintSelection('#ff0000');
  store.select(pair[1].id); store.paintSelection('#0000ff');
  const before = store.getSnapshot().doc;
  assert.equal(before.appearance?.overrides?.[pair[0].id], '#ff0000');
  store.selectMany(pair.map(r => r.id));
  assert.deepEqual(selectionOwners(store.getSnapshot().resolved, store.getSnapshot().selection), ['jhooks-front']);
  store.duplicateSelected();
  assert.equal(store.getSnapshot().doc.accessories.length, before.accessories.length + 1);
  const copies = store.getSnapshot().selection;
  assert.equal(copies.length, 2);
  assert.deepEqual(copies.map(id => store.getSnapshot().doc.appearance?.overrides?.[id]).sort(), ['#0000ff', '#ff0000']);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
  store.selectMany(pair.map(r => r.id)); store.removeSelected();
  assert.equal(store.getSnapshot().doc.accessories.length, before.accessories.length - 1);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
});

test('shared fields intersect every part; bulk dimensions validate and undo together', () => {
  const store = new BuilderStore();
  const bars = store.getSnapshot().resolved.filter(r => r.part.startsWith('pullup'));
  store.selectMany(bars.map(r => r.id));
  const before = store.getSnapshot().doc;
  assert.ok(sharedFields(before, bars).some(f => f.key === 'diameter'));
  store.editSelectionParam('diameter', 35);
  for (const r of bars) assert.equal(store.getSnapshot().doc.accessories.find(a => a.id === r.ownerId)?.params.diameter, 35);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
  store.select('front-left', { ctrlKey: true });
  assert.deepEqual(sharedFields(before, store.getSnapshot().resolved.filter(r => store.getSnapshot().selection.includes(r.id))), []);
  assert.throws(() => store.editSelectionParam('diameter', 35), /Unsupported/);
});

test('bulk field reset uses domain defaults per owner, preserves paint, and undoes once', () => {
  const store = new BuilderStore();
  store.select('pullup-front'); store.duplicateSelected();
  const bars = store.getSnapshot().resolved.filter(r => r.part.startsWith('pullup'));
  store.selectMany(bars.map(r => r.id)); store.paintSelection('#ff0000');
  store.editSelectionParam('diameter', 35);
  const before = store.getSnapshot().doc;
  store.resetSelectionParam('diameter');
  const after = store.getSnapshot();
  for (const r of bars) {
    assert.notEqual(after.doc.accessories.find(a => a.id === r.ownerId)?.params.diameter, 35);
    assert.equal(after.doc.appearance?.overrides?.[r.id], '#ff0000');
  }
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
  store.select('front-left', { ctrlKey: true });
  assert.throws(() => store.resetSelectionParam('diameter'), /Unsupported/);
});

test('live bulk edits coalesce one gesture and reset stays independent', () => {
  const store = new BuilderStore();
  store.select('pullup-front'); store.duplicateSelected();
  store.selectMany(store.getSnapshot().resolved.filter(r => r.part.startsWith('pullup')).map(r => r.id));
  const before = store.getSnapshot().doc;
  store.beginGesture(); store.editSelectionParam('diameter', 35); store.editSelectionParam('diameter', 40); store.endGesture();
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
  store.history('redo'); const edited = store.getSnapshot().doc;
  store.resetSelectionParam('diameter'); store.history('undo'); assert.deepEqual(store.getSnapshot().doc, edited);
});
