import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';
import { getMounts } from '../../rack-generator/assembly.ts';

for (const side of ['left', 'right']) test(`pickup ${side}: pair opt-out preserves other piece, finish, cancellation and one undo`, () => {
  const store = new BuilderStore();
  const doc = structuredClone(store.getSnapshot().doc);
  doc.appearance = { overrides: { 'jhooks-front:left': '#ff0000', 'jhooks-front:right': '#0000ff' }, finishOverrides: { 'jhooks-front:left': 'stainless', 'jhooks-front:right': 'paint' } };
  store.commit(doc);
  const before = store.getSnapshot().doc;
  const pieces = store.getSnapshot().resolved.filter(r => r.ownerId === 'jhooks-front');
  store.pickup(`jhooks-front:${side}`);
  assert.equal(store.getSnapshot().paired, true);
  store.patch({ paired: false });
  assert.deepEqual(store.getSnapshot().doc, before);
  const target = getMounts(before, 'j-hook-standard').find(m => m.uprightId === 'rear-left' && m.face === 'back' && m.hole === 20)!;
  store.previewMount(target);
  assert.ok(store.getSnapshot().proposal, store.getSnapshot().placementText);
  store.cancelPlacement();
  assert.deepEqual(store.getSnapshot().doc, before);
  store.pickup(`jhooks-front:${side}`); store.patch({ paired: false }); store.previewMount(target); store.acceptProposal();
  const after = store.getSnapshot();
  const stationary = pieces.find(p => p.id !== `jhooks-front:${side}`)!;
  const preserved = after.resolved.find(p => p.part === 'j-hook-standard' && JSON.stringify(p.position) === JSON.stringify(stationary.position))!;
  assert.ok(preserved);
  assert.deepEqual(preserved.rotation, stationary.rotation);
  assert.equal(after.doc.appearance!.overrides![preserved.id], before.appearance!.overrides![stationary.id]);
  assert.equal(after.doc.appearance!.finishOverrides![preserved.id], before.appearance!.finishOverrides![stationary.id]);
  assert.equal(after.resolved.filter(p => p.part === 'j-hook-standard').length, 2);
  assert.equal(after.doc.appearance!.overrides![after.selected!], before.appearance!.overrides![`jhooks-front:${side}`]);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
});

test('pair pickup remains a pair and floor pickup stages transform until one commit', () => {
  const store = new BuilderStore(), before = store.getSnapshot().doc;
  store.pickup('jhooks-front:right');
  store.previewMount(getMounts(before, 'j-hook-standard').find(m => m.uprightId === 'rear-left' && m.face === 'back' && m.hole === 20)!);
  store.acceptProposal();
  assert.equal(store.getSnapshot().doc.accessories.find(a => a.id === 'jhooks-front')!.paired, true);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, before);
  store.startPlacement('rep-nighthawk'); store.acceptProposal();
  const floorBefore = store.getSnapshot().doc, id = floorBefore.floorItems![0].id;
  store.pickup(id); store.previewFloor([1600, 800], Math.PI / 12);
  assert.deepEqual(store.getSnapshot().doc, floorBefore);
  store.escape(); assert.deepEqual(store.getSnapshot().doc, floorBefore);
  store.pickup(id); store.previewFloor([1600, 800], Math.PI / 12); store.acceptProposal();
  assert.deepEqual(store.getSnapshot().doc.floorItems![0].position, [1600, 800]);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, floorBefore);
});

test('structure pickup selects move controls without adding or swapping structure', () => {
  const store = new BuilderStore(), before = store.getSnapshot().doc;
  for (const id of ['front-left', before.connections[0].id]) {
    store.pickup(id);
    assert.equal(store.getSnapshot().structureMoveId, id);
    assert.equal(store.getSnapshot().placing, null);
    assert.equal(store.getSnapshot().structureChoice, null);
    assert.deepEqual(store.getSnapshot().doc, before);
  }
});

test('mounted rotation is staged, cancels and commits as one edit; relocation retains staged angle', async () => {
  const { addAccessory } = await import('../../rack-generator/assembly.ts');
  const store = new BuilderStore();
  store.commit(addAccessory(store.getSnapshot().doc, 'storage-pin-short', { uprightId: 'rear-left', face: 'left', hole: 10 }, false));
  const original = store.getSnapshot().doc, id = original.accessories.at(-1)!.id;
  store.rotateMounted(id); store.rotateMounted(id);
  assert.equal(store.getSnapshot().placing!.rotationOnly, true);
  assert.deepEqual(store.getSnapshot().doc, original);
  assert.ok(Math.abs(store.getSnapshot().proposal!.doc.accessories.at(-1)!.rotation! - Math.PI / 6) < 1e-9);
  store.escape(); assert.deepEqual(store.getSnapshot().doc, original);
  store.pickup(id); store.rotateMounted(id);
  store.previewMount(getMounts(original, 'storage-pin-short').find(m => m.uprightId === 'rear-left' && m.face === 'left' && m.hole === 15)!);
  assert.ok(store.getSnapshot().proposal, store.getSnapshot().placementText);
  store.acceptProposal();
  assert.ok(Math.abs(store.getSnapshot().doc.accessories.at(-1)!.rotation! - Math.PI / 12) < 1e-9);
  store.history('undo'); assert.deepEqual(store.getSnapshot().doc, original);
});

test('picking up an already flipped Darko preserves its actual side and rotation', async () => {
  const { addAccessory, rotateAccessory } = await import('../../rack-generator/assembly.ts');
  const store = new BuilderStore();
  const added = addAccessory(store.getSnapshot().doc, 'darko-anchor', {kind:'crossmember-top',connectionId:'left-upper-crossmember',station:4,side:1,uprightId:'front-left',face:'front',hole:0}, false);
  const id = added.accessories.at(-1)!.id;
  store.commit(rotateAccessory(added, id, 180));
  const original = store.getSnapshot();
  store.pickup(id);
  assert.deepEqual(store.getSnapshot().proposal!.entries, original.resolved.filter(r => r.ownerId === id));
  store.acceptProposal(); assert.deepEqual(store.getSnapshot().doc, original.doc);
});
