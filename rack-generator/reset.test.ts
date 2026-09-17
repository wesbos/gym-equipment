import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, replaceStructurePart, resolveAssembly } from './assembly.ts';
import { dimensionDefaults, partDefaults, resetDimensions, resetPart } from './reset.ts';
import { applyPreset } from './presets.ts';
import { BuilderStore } from '../src/state/builder-store.ts';

test('dimension defaults snap to manufacturer profile and keep bore, pitch, graph and appearance', () => {
  const doc = applyPreset('rep-pr-4000-six-2362.2-1041.4');
  doc.appearance = { frameColor: '#ffffff' };
  const next = resetDimensions(doc);
  assert.equal(next.rack.height, 2032);
  assert.equal(next.rack.depth, 762);
  assert.equal(next.rack.width, 1140.32);
  assert.equal(next.rack.pitch, 50.8);
  assert.equal(next.rack.holeDiameter, 15.875);
  assert.deepEqual(Object.keys(next.uprights), Object.keys(doc.uprights));
  assert.deepEqual(next.appearance, doc.appearance);
  assert.equal(dimensionDefaults(createAssembly()).depth, 725);
});
test('parameter defaults reset composite owner and pair without changing placement or paint', () => {
  let doc = replaceStructurePart(createAssembly(), 'rear-crossmember', 'offset-crossmember', { offset: 250 });
  const piece = resolveAssembly(doc).find(r => r.ownerId === 'rear-crossmember')!;
  doc.appearance = { overrides: { [piece.id]: '#ffffff' } };
  const next = resetPart(doc, piece.id, 'offset');
  assert.equal(next.structure['rear-crossmember'].params.offset, 193.5);
  assert.deepEqual(next.appearance, doc.appearance);
  doc.accessories[0].params.diameter = 40;
  const reset = resetPart(doc, 'pullup-front', 'diameter');
  assert.equal(reset.accessories[0].params.diameter, 32);
  assert.deepEqual(reset.accessories[0].target, doc.accessories[0].target);
});
test('manufacturer parameter defaults respect pitch and mounting shaft clearance', () => {
  const doc = applyPreset('rep-pr-4000-four-2032-762');
  assert.equal(partDefaults(doc, 'angled-crossmember').rise, 203.2);
  assert.ok(partDefaults(doc, 'safety-pin-pipe').pinDiameter < doc.rack.holeDiameter);
});
test('reset is a regular undoable edit, including entire rack', async () => {
  const store = new BuilderStore({ getItem: () => null, setItem: () => {} });
  await store.ready;
  const doc = applyPreset('rep-pr-5000-six-2362.2-1041.4');
  store.commit(doc);
  store.commit(resetDimensions(doc));
  store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, doc);
  store.commit(createAssembly());
  store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, doc);
});
