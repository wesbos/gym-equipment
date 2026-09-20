import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';
import { barActions, selectionActions, selectionKind, variantOptions, applyVariant, duplicateSelection } from './selection-actions.ts';
import { createAssembly } from '../../rack-generator/assembly.ts';
import { addFloorItem } from '../../rack-generator/floor-items.ts';
import { addWallItem } from '../../rack-generator/wall-items.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { HANG_PART_IDS } from '../../rack-generator/hang-registry.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { withSystem } from '../../rack-generator/systems.ts';

/** Default rack plus a bench (floor-1), a pegboard (wall-2) and one hung attachment on it. */
function gym() {
  let doc = addFloorItem(createAssembly(), 'rep-nighthawk');
  doc = addWallItem(doc, 'pegboard-panel');
  const hang = HANG_PART_IDS.find(p => freeSlots(doc, p).length)!;
  doc = placeHang(doc, hang, freeSlots(doc, hang)[0]);
  const store = new BuilderStore();
  store.commit(doc);
  const s = store.getSnapshot();
  return { store, floor: s.doc.floorItems![0].id, wall: s.doc.wallItems![0].id, hang: s.doc.hangItems![0].id };
}
const actions = (store: BuilderStore) => selectionActions(store.getSnapshot());

test('nothing selected and the room offer no actions', () => {
  const { store } = gym();
  assert.equal(actions(store).kind, 'none');
  assert.equal(actions(store).remove, false);
  store.openRoom();
  assert.deepEqual({ ...actions(store) }, { ...actions(store), kind: 'room', remove: false, move: false, focus: false, duplicate: false });
});

test('a mounted rack pair: move, swap, unpair, duplicate, delete, focus; no rotation for fixed mounts', () => {
  const { store } = gym();
  const piece = store.getSnapshot().resolved.find(r => r.ownerId === 'jhooks-front')!;
  store.select(piece.id);
  const a = actions(store);
  assert.equal(a.kind, 'rack');
  assert.equal(a.move, true);
  assert.equal(a.swap, true);
  assert.equal(a.pair, 'unpair');
  assert.equal(a.duplicate, true);
  assert.equal(a.remove, true);
  assert.equal(a.focus, true);
  assert.equal(a.rotate, 0, 'J-hooks on an upright have a fixed orientation');
  assert.ok(variantOptions(store.getSnapshot().doc, store.getSnapshot().resolved, piece.id).includes('j-hook-roller'));
});

test('frame members: uprights move in plan and cannot swap or duplicate; crossmembers swap', () => {
  const { store } = gym();
  store.select('front-left');
  const upright = actions(store);
  assert.equal(upright.kind, 'structure');
  assert.equal(upright.move, true);
  assert.equal(upright.swap, false);
  assert.equal(upright.duplicate, false);
  assert.equal(upright.pair, null);
  const crossmember = store.getSnapshot().resolved.find(r => r.kind === 'structure' && r.part.startsWith('crossmember'))!;
  store.select(crossmember.id);
  assert.equal(actions(store).swap, true);
});

test('floor, wall and hung items: move and duplicate; only floor items rotate, by 15°', () => {
  const { store, floor, wall, hang } = gym();
  store.select(floor);
  assert.deepEqual([actions(store).kind, actions(store).rotate, actions(store).move, actions(store).duplicate, actions(store).swap, actions(store).pair], ['floor', 15, true, true, false, null]);
  store.select(wall);
  assert.deepEqual([actions(store).kind, actions(store).rotate, actions(store).move, actions(store).duplicate], ['wall', 0, true, true]);
  store.select(hang);
  assert.deepEqual([actions(store).kind, actions(store).rotate, actions(store).move], ['hang', 0, true]);
});

test('systems only delete and focus; multi-select duplicates only copyable mixes', () => {
  const store = new BuilderStore();
  store.commit(withSystem(applyPreset('rep-pr-5000-six-2032-1041.4'), 'cable-ares2'));
  const system = store.getSnapshot().resolved.find(r => r.part === 'cable-ares2')!;
  store.select(system.id);
  const a = actions(store);
  assert.equal(selectionKind(store.getSnapshot()), 'system');
  assert.deepEqual([a.move, a.rotate, a.duplicate, a.swap, a.pair, a.remove, a.focus], [false, 0, false, false, null, true, true]);

  const { store: g, floor, wall } = gym();
  g.selectMany([floor, wall]);
  assert.deepEqual([actions(g).kind, actions(g).count, actions(g).duplicate, actions(g).move, actions(g).remove], ['multi', 2, true, false, true]);
  g.selectMany([floor, 'front-left']);
  assert.equal(actions(g).duplicate, false, 'uprights cannot be duplicated');
});

test('the bar steps aside while placing', () => {
  const { store, floor } = gym();
  store.select(floor);
  assert.equal(barActions(store.getSnapshot()).kind, 'floor');
  store.pickup(floor);
  assert.ok(store.getSnapshot().placing);
  assert.equal(barActions(store.getSnapshot()).kind, 'none');
});

test('rotateSelection: floor items turn 15° per step, one undo each; fixed mounts refuse', () => {
  const { store, floor } = gym();
  store.select(floor);
  const before = store.getSnapshot().doc;
  assert.equal(store.rotateSelection(1), true);
  assert.ok(Math.abs(store.getSnapshot().doc.floorItems![0].rotation - Math.PI / 12) < 1e-9);
  assert.equal(store.rotateSelection(-1), true);
  assert.ok(Math.abs(store.getSnapshot().doc.floorItems![0].rotation) < 1e-9);
  store.history('undo'); store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, before);
  store.select(store.getSnapshot().resolved.find(r => r.ownerId === 'jhooks-front')!.id);
  const unrotated = store.getSnapshot().doc;
  assert.equal(store.rotateSelection(1), false);
  assert.equal(store.getSnapshot().doc, unrotated, 'no commit');
});

test('swap, pair toggle and duplication are single undoable edits', () => {
  const { store, floor, wall, hang } = gym();
  const piece = store.getSnapshot().resolved.find(r => r.ownerId === 'jhooks-front')!;
  const before = store.getSnapshot().doc;
  store.select(piece.id);
  store.swapSelectedVariant('j-hook-roller');
  assert.equal(store.getSnapshot().doc.accessories.find(a => a.id === 'jhooks-front')!.part, 'j-hook-roller');
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);

  store.select(piece.id);
  store.togglePairSelected();
  assert.equal(store.getSnapshot().doc.accessories.find(a => a.id === 'jhooks-front')!.paired, false);
  assert.equal(store.getSnapshot().doc.accessories.length, before.accessories.length + 1);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);

  // Duplicating one side of a pair copies the whole pair.
  store.select(piece.id);
  assert.equal(store.duplicateSelected(), true);
  assert.equal(store.getSnapshot().doc.accessories.length, before.accessories.length + 1);
  assert.equal(store.getSnapshot().selection.length, 2);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);

  store.selectMany([floor, wall, hang]);
  assert.equal(store.duplicateSelected(), true);
  const after = store.getSnapshot().doc;
  assert.equal(after.floorItems!.length, 2);
  assert.equal(after.wallItems!.length, 2);
  assert.equal(after.hangItems!.length, 2);
  assert.deepEqual(after.floorItems![1].params, after.floorItems![0].params);
  assert.equal(store.getSnapshot().selection.length, 3);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
});

test('pure helpers refuse what the bar hides', () => {
  const { store } = gym();
  const { doc, resolved } = store.getSnapshot();
  assert.equal(duplicateSelection(doc, resolved, ['front-left']), null);
  assert.deepEqual(variantOptions(doc, resolved, 'front-left'), []);
  assert.equal(applyVariant(doc, resolved, 'jhooks-front', 'j-hook-standard'), doc);
});
