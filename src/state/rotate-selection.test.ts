import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';

test('rotateSelection turns the floor ghost, then the placed item, one undo step each', () => {
  const store = new BuilderStore();
  assert.equal(store.rotationSubject(), null);
  assert.equal(store.rotateSelection(1), false);
  store.startPlacement('rep-nighthawk');
  assert.equal(store.rotationSubject(), 'placement');
  const before = store.getSnapshot().proposal!.doc.floorItems!.at(-1)!.rotation;
  assert.equal(store.rotateSelection(1), true);
  const staged = store.getSnapshot().proposal!.doc.floorItems!.at(-1)!;
  assert.ok(Math.abs(staged.rotation - before - Math.PI / 12) < 1e-9);
  assert.equal(store.getSnapshot().doc.floorItems?.length ?? 0, 0, 'the ghost does not edit the document');
  store.acceptProposal();
  const placed = store.getSnapshot().doc.floorItems![0];
  assert.equal(store.getSnapshot().selected, placed.id);
  assert.equal(store.rotationSubject(), 'floor');
  store.rotateSelection(-1); store.rotateSelection(-1);
  assert.ok(Math.abs(store.getSnapshot().doc.floorItems![0].rotation - (placed.rotation - Math.PI / 6)) < 1e-9);
  store.history('undo');
  assert.ok(Math.abs(store.getSnapshot().doc.floorItems![0].rotation - (placed.rotation - Math.PI / 12)) < 1e-9);
});

test('repositionSelected picks the selected part up like a double-click', () => {
  const store = new BuilderStore();
  assert.equal(store.repositionSelected(), false);
  store.select('jhooks-front:left');
  assert.equal(store.repositionSelected(), true);
  assert.equal(store.getSnapshot().placing?.movingId, 'jhooks-front');
  assert.equal(store.repositionSelected(), false, 'already placing');
});
