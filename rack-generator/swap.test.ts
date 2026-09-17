import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, replaceStructurePart, resolveAssembly, removeInstance } from './assembly.ts';
import { extendUpright, spanAccessory } from './graph-edits.ts';
import { swapCandidate, swapCandidates } from './swap.ts';
import { applyPreset } from './presets.ts';
import { BuilderStore } from '../src/state/builder-store.ts';

test('nameplate swaps both composite pieces through their physical owner', () => {
  const doc = replaceStructurePart(createAssembly(), 'rear-crossmember', 'nameplate');
  const result = swapCandidate(doc, 'rear-crossmember:beam', 'offset-crossmember');
  assert.ok(result.valid);
  assert.equal(result.ownerId, 'rear-crossmember');
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].part, 'offset-crossmember');
  const panel = swapCandidate(result.doc, 'rear-crossmember', 'nameplate');
  assert.ok(panel.valid);
  assert.equal(panel.entries.length, 2);
  assert.equal(doc.structure['rear-crossmember'].part, 'nameplate');
});
test('paired accessory swaps preserve physical paint identities and reject unrelated families', () => {
  const doc = createAssembly();
  doc.appearance = { overrides: { 'jhooks-front:left': '#ffffff', 'jhooks-front:right': '#ff0000' } };
  const candidate = swapCandidate(doc, 'jhooks-front:right', 'j-hook-roller');
  assert.ok(candidate.valid);
  assert.equal(candidate.doc.accessories.length, doc.accessories.length);
  assert.equal(candidate.doc.nextId, doc.nextId);
  assert.equal(candidate.entries.length, 2);
  assert.deepEqual(candidate.entries.map(r => r.id), ['jhooks-front:left', 'jhooks-front:right']);
  assert.deepEqual(candidate.doc.appearance, doc.appearance);
  assert.equal(swapCandidate(doc, 'jhooks-front:left', 'landmine').valid, false);
});
test('dynamic graph slots, restored posts and explicit accessory endpoints remain intact', () => {
  let doc = extendUpright(createAssembly({ emptyAccessories: true }), 'rear-left', 'rear', 425);
  const post = Object.keys(doc.uprights).find(id => !['front-left','front-right','rear-left','rear-right'].includes(id))!;
  const edge = doc.connections.find(e => e.to === post || e.from === post)!;
  const beam = swapCandidate(doc, edge.id, 'crossmember-425');
  assert.ok(beam.valid);
  assert.deepEqual(beam.doc.connections, doc.connections);
  doc = spanAccessory(doc, 'rear-left', post, 'safety-box', 12);
  const a = doc.accessories[0];
  const swap = swapCandidate(doc, a.id, 'safety-webbing');
  assert.ok(swap.valid);
  assert.equal(swap.doc.accessories[0].spanTo, post);
  assert.equal(swap.doc.accessories[0].target.uprightId, 'rear-left');
  const removed = removeInstance(doc, post);
  const restore = swapCandidate(removed, post, 'upright');
  assert.ok(restore.valid);
  assert.ok(restore.entries.some(r => r.id === post));
});
test('incompatible frame locations and manufacturer interfaces report reasons', () => {
  const doc = createAssembly();
  const bad = swapCandidate(doc, 'front-left', 'nameplate');
  assert.equal(bad.valid, false);
  if (!bad.valid) assert.match(bad.reason, /does not fit/);
  assert.ok(swapCandidates(doc, 'angled-crossmember').some(c => c.valid));
  const rep = applyPreset('rep-pr-4000-four-2032-762');
  assert.equal(swapCandidate(rep, 'rear-crossmember', 'branded-crossmember').valid, false);
});
test('swap commits one undoable document and cancellation leaves it untouched', async () => {
  const store = new BuilderStore({ getItem: () => null, setItem: () => {} }); await store.ready;
  const original = store.getSnapshot().doc;
  store.startPlacement('nameplate'); store.cancelPlacement();
  assert.equal(store.getSnapshot().doc, original);
  const candidate = swapCandidate(original, 'rear-crossmember', 'nameplate'); assert.ok(candidate.valid);
  store.commit(candidate.doc); store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, original);
  assert.deepEqual(resolveAssembly(store.getSnapshot().doc), resolveAssembly(original));
});
