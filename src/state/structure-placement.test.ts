import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';
import { structureCandidates } from '../../rack-generator/structure-candidates.ts';

test('structural proposal is transient; commit, undo and redo are single complete graph operations', async () => {
  const store = new BuilderStore({ getItem: () => null, setItem: () => {} });
  await store.ready;
  const before = store.getSnapshot().doc;
  store.startPlacement('upright');
  assert.equal(store.getSnapshot().structureMode, 'add');
  const proposal = structureCandidates(before, 'upright')[0];
  assert.equal(store.getSnapshot().doc, before);
  store.cancelPlacement();
  assert.equal(store.getSnapshot().canUndo, false);
  store.startPlacement('upright');
  store.commit(proposal.doc);
  assert.equal(Object.keys(store.getSnapshot().doc.uprights).length, 5);
  store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, before);
  assert.equal(store.getSnapshot().canUndo, false);
  store.history('redo');
  assert.deepEqual(store.getSnapshot().doc, proposal.doc);
  const beam = structureCandidates(store.getSnapshot().doc, 'crossmember-725')[0];
  store.commit(beam.doc);
  store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, proposal.doc);
});
