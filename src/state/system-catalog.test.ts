import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';
import { applyPreset, RACK_PRESETS } from '../../rack-generator/presets.ts';
import { SYSTEM_PARTS } from '../../rack-generator/system-types.ts';
import { GRID_PROFILES, gridProfile } from '../../rack-generator/profiles.ts';

for (const part of SYSTEM_PARTS) test(`catalog ${part}: preview, cancel, apply and single undo`, () => {
  const store = new BuilderStore();
  store.commit(applyPreset(part === 'cable-kraken' ? 'bos-hydra-four-2133.6-762' : 'rep-pr-5000-six-2032-1041.4'));
  const before = store.getSnapshot();
  store.startPlacement(part);
  const preview = store.getSnapshot();
  assert.equal(preview.doc, before.doc);
  assert.equal(preview.systemChoice, part);
  assert.ok(preview.proposal, preview.placementText);
  assert.ok(preview.proposal.entries.length);
  assert.ok(preview.proposal.doc.systems?.at(-1)?.bay?.length);
  store.cancelPlacement();
  assert.equal(store.getSnapshot().proposal, null);
  assert.equal(store.getSnapshot().systemChoice, null);
  assert.equal(store.getSnapshot().doc, before.doc);
  store.startPlacement(part); store.escape();
  assert.equal(store.getSnapshot().doc, before.doc);
  assert.equal(store.getSnapshot().systemChoice, null);
  store.startPlacement(part); store.acceptProposal();
  assert.equal(store.getSnapshot().doc.systems?.length, 1);
  assert.equal(store.getSnapshot().systemChoice, null);
  store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, before.doc);
  store.history('redo');
  assert.equal(store.getSnapshot().doc.systems?.[0].part, part);
});

test('failed bay never mutates working document, history or selection through apply/cancel', () => {
  const store = new BuilderStore();
  const doc = applyPreset('rep-pr-5000-six-2032-1041.4');
  doc.removed.push(doc.connections.find(c => c.level === 'lower')!.id);
  store.commit(doc);
  const before = store.getSnapshot();
  store.startPlacement('cable-ares2');
  assert.equal(store.getSnapshot().proposal, null);
  assert.match(store.getSnapshot().placementText, /Doesn't fit:.*crossmember/);
  store.acceptProposal(); store.cancelPlacement();
  assert.equal(store.getSnapshot().doc, before.doc);
  assert.equal(store.getSnapshot().canUndo, before.canUndo);
  store.history('undo');
  assert.notDeepEqual(store.getSnapshot().doc, before.doc);
});

test('switching from system preview to an accessory retains its proposal', () => {
  const store = new BuilderStore();
  store.commit(applyPreset('rep-pr-5000-six-2032-1041.4'));
  store.startPlacement('cable-ares2'); store.startPlacement('j-hook-standard');
  assert.equal(store.getSnapshot().systemChoice, null);
  assert.ok(store.getSnapshot().proposal);
  assert.equal(store.getSnapshot().proposal!.doc.systems?.length ?? 0, 0);
});

test('featured starters use supported profile dimensions and retain full preset IDs', () => {
  const featured = RACK_PRESETS.filter(p => p.featured);
  // Eight enumerated BoS/REP starters plus one featured starter per brand profile (#130).
  assert.equal(featured.filter(p => !gridProfile(p.profileId).starters).length, 8);
  assert.equal(new Set(RACK_PRESETS.map(p => p.id)).size, RACK_PRESETS.length);
  const starters = GRID_PROFILES.reduce((sum, profile) => sum + (profile.starters?.length ?? 0), 0);
  assert.equal(RACK_PRESETS.length, 3 + starters + [ 'bos-hydra', 'bos-manticore', 'rep-pr-5000', 'rep-pr-4000' ].reduce((sum,id) => sum + gridProfile(id).heights!.length * gridProfile(id).depths.length * 2, 0));
  for (const p of featured) {
    const profile = gridProfile(p.profileId);
    assert.ok(profile.heights!.includes(p.height));
    assert.ok(profile.depths.includes(p.depth));
    assert.ok(applyPreset(p.id).rack.tube >= 50);
  }
});

test('four-post ARES requires explicit staged anchoring; options cancel without mutation', () => {
  const store = new BuilderStore();
  store.commit(applyPreset('rep-pr-5000-four-2032-406.4'));
  const before = store.getSnapshot().doc;
  store.startPlacement('cable-ares2');
  assert.equal(store.getSnapshot().proposal, null);
  assert.match(store.getSnapshot().placementText, /floor anchoring/);
  store.previewSystem({ anchored: 1 });
  assert.ok(store.getSnapshot().proposal, store.getSnapshot().placementText);
  assert.equal(store.getSnapshot().doc, before);
  store.cancelPlacement();
  assert.equal(store.getSnapshot().doc, before);
  store.startPlacement('cable-ares2');
  assert.equal(store.getSnapshot().systemParams.anchored, 0);
  store.previewSystem({ anchored: 1 }); store.acceptProposal();
  assert.equal(store.getSnapshot().doc.systems![0].params.anchored, 1);
  store.history('undo');
  assert.deepEqual(store.getSnapshot().doc, before);
});
