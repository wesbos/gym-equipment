import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCESSORY_PARTS, createAssembly, getMounts, validateAssembly, resolveAssembly } from './assembly.ts';
import { getAttachmentAnchor } from './attachment-mounts.ts';
import { applyPreset } from './presets.ts';
import { proposalAt, proposalCollision, suggestPlacement, PROPOSAL_LIMIT } from './placement-proposals.ts';
import type { PartId } from './types.ts';

test('default catalog sweep: collision-free proposal or actual explicit no-fit, bounded', () => {
  const doc = createAssembly();
  const parts = ['upright','crossmember-425','crossmember-725','crossmember-1075','angled-crossmember','offset-crossmember','branded-crossmember','branded-crossmember-lite','nameplate',...ACCESSORY_PARTS] as PartId[];
  for (const part of parts) {
    const r = suggestPlacement(doc, part);
    assert.ok(r.evaluated <= PROPOSAL_LIMIT, part);
    if (r.proposal) {
      assert.deepEqual(validateAssembly(r.proposal.doc),r.proposal.doc);
      assert.equal(proposalCollision(resolveAssembly(doc),r.proposal),undefined,part);
      assert.ok(r.proposal.entries.length,part);
    } else {
      assert.ok(r.reason.length > 10,part);
      assert.ok(['upright','pullup-sphere'].includes(part),`${part}: ${r.reason}`);
    }
  }
});
test('landmine measured studs and low outside paired proposal remain aligned', () => {
  const doc = createAssembly(), r = suggestPlacement(doc,'landmine');
  const p = r.proposal!;
  assert.ok(getMounts(doc,'landmine').length > 0);
  assert.deepEqual(getAttachmentAnchor('landmine').boltStations.map(s => s.zOffset),[0,150]);
  assert.equal(p.target?.uprightId,'front-left');
  assert.equal(p.target?.face,'left');
  assert.equal(p.target?.hole,2);
  assert.equal(p.entries.length,2);
  for (const entry of p.entries) assert.deepEqual(entry.mounts.map(m=>m.center[2]),[165,315]);
});
test('six-post storage prefers graph rear row with opaque IDs and valid pair', () => {
  const doc = applyPreset('generic-six'), p = suggestPlacement(doc,'storage-pin-long').proposal!;
  assert.equal(p.entries.length,2);
  assert.match(p.label,/^rear left/);
  assert.equal(doc.uprights[p.target!.uprightId].y,Math.max(...Object.values(doc.uprights).map(p=>p.y)));
  assert.equal(proposalCollision(resolveAssembly(doc),p),undefined);
});
test('occupied working bodies move suggestion even when mounts validate', () => {
  const doc = createAssembly(), first = suggestPlacement(doc,'landmine').proposal!;
  const repeated = proposalAt(first.doc,'landmine',first.target!,true);
  assert.ok(proposalCollision(resolveAssembly(first.doc),repeated));
  const next = suggestPlacement(first.doc,'landmine').proposal!;
  assert.ok(next);
  assert.notEqual(next.label,first.label);
  assert.equal(proposalCollision(resolveAssembly(first.doc),next),undefined);
});
test('source spacing and shaft failures retain actual adapter reason', () => {
  const rep = applyPreset('rep-pr-4000-four-2032-406.4');
  const r = suggestPlacement(rep,'landmine');
  assert.equal(r.proposal,null);
  assert.match(r.reason,/50 mm upright hole spacing/);
});
test('pair rejects removed peer; single placement remains possible', () => {
  const doc = createAssembly({emptyAccessories:true});
  doc.removed.push('front-right','rear-right');
  assert.equal(suggestPlacement(doc,'landmine',true).proposal,null);
  assert.ok(suggestPlacement(doc,'landmine',false).proposal);
});
