import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { addAccessory, createAssembly, getPartPlacementInfo, replaceStructurePart, resolveAssembly, validateAssembly } from './assembly.ts';
import { applyPreset } from './presets.ts';
import { definitions } from './parts/structure.ts';
import { structureCandidates } from './structure-candidates.ts';
import { swapCandidate } from './swap.ts';
import { detectCollisions } from './assembly-collisions.ts';
import type { RackDoc } from './types.ts';

const api = await Module(); api.setup();
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < .01, `${a} ≈ ${b}`);
const rail = (doc: RackDoc, id = 'left-upper-crossmember') => resolveAssembly(doc).find(r => r.id === id)!;

test('flush crossmembers can be chosen on any rack and swapped back, including on Rogue Monster', () => {
  for (const doc of [createAssembly({ emptyAccessories: true }), applyPreset('rogue-rml-3-four-2295.525-762'), applyPreset('rogue-rm-monster-2-four-2295.525-1092.2')]) {
    assert.ok(getPartPlacementInfo('crossmember-flush', doc)?.slots?.includes('left-upper-crossmember'));
    const flush = replaceStructurePart(doc, 'left-upper-crossmember', 'crossmember-flush');
    const member = rail(flush);
    assert.equal(member.part, 'crossmember-flush');
    near(member.position[2] + member.params.beamCenter + member.params.width / 2, doc.rack.height);
    assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(flush))), flush, 'part choice survives saving');
    const standard = swapCandidate(flush, member.id, 'crossmember-725');
    assert.ok(standard.valid);
    const restored = rail(standard.doc);
    assert.equal(restored.params.beamCenter, undefined, 'an explicit standard member stays standard on Monster racks too');
    assert.ok(restored.position[2] + restored.params.plateHeight / 2 + restored.params.width / 2 < doc.rack.height);
  }
});

test('flush crossmembers can add new connections, use lower positions, and carry existing rail attachments', () => {
  const original = createAssembly({ emptyAccessories: true });
  const candidates = structureCandidates(original, 'crossmember-flush');
  assert.ok(candidates.length > 0);
  for (const candidate of candidates) assert.ok(candidate.entries.some(r => r.part === 'crossmember-flush'));
  const lower = rail(replaceStructurePart(original, 'left-lower-crossmember', 'crossmember-flush'), 'left-lower-crossmember');
  near(lower.params.beamCenter + lower.params.width / 2, lower.params.plateHeight);
  const target = { kind: 'crossmember-top' as const, connectionId: 'left-upper-crossmember', station: 4, side: 1 as const, uprightId: 'front-left', face: 'left' as const, hole: 0 };
  const mounted = addAccessory(original, 'darko-anchor', target, false);
  const flush = replaceStructurePart(mounted, target.connectionId, 'crossmember-flush');
  const anchor = resolveAssembly(flush).find(r => r.part === 'darko-anchor')!;
  near(anchor.mount!.center[2], flush.rack.height - flush.rack.tube / 2);
  assert.deepEqual(flush.accessories, mounted.accessories, 'swapping the rail preserves the attachment target');
});

test('flush nameplate members are explicit, swappable parts on profiles with a nameplate', () => {
  const monster = applyPreset('rogue-rm-monster-2-four-2295.525-1092.2');
  assert.equal(monster.structure['rear-crossmember'].part, 'profile-nameplate-flush');
  const ordinary = replaceStructurePart(monster, 'rear-crossmember', 'profile-nameplate');
  assert.equal(rail(ordinary, 'rear-crossmember').params.beamCenter, undefined);
  const rep = applyPreset('rep-pr-4000-four-2362.2-762');
  assert.equal(rep.structure['rear-crossmember'].part, 'profile-nameplate');
  const flush = replaceStructurePart(rep, 'rear-crossmember', 'profile-nameplate-flush');
  const member = rail(flush, 'rear-crossmember');
  near(member.position[2] + member.params.beamCenter + member.params.width / 2, rep.rack.height);
  assert.throws(() => replaceStructurePart(createAssembly(), 'rear-crossmember', 'profile-nameplate-flush'), /no manufacturer nameplate/);
});

test('standalone flush parts build the same top-aligned silhouette as placed parts', () => {
  for (const id of ['crossmember-flush', 'profile-nameplate-flush']) {
    const definition = definitions.find(d => d.id === id)!;
    const parts = definition.build(api, definition.defaults);
    try {
      for (const part of parts) { assert.equal(part.solid.status(), 'NoError'); assert.ok(part.solid.volume() > 0); }
      near(parts[0].solid.boundingBox().max[2], definition.defaults.plateHeight);
      for (const part of parts.filter(p => p.name.endsWith('mounting flange'))) near(part.solid.boundingBox().max[2], definition.defaults.plateHeight);
    } finally { parts.forEach(p => p.solid.delete()); }
  }
});

test('collision checks follow the raised flush beam instead of its old centre', () => {
  const member = rail(replaceStructurePart(createAssembly({ emptyAccessories: true }), 'left-upper-crossmember', 'crossmember-flush'));
  const obstacle = (z: number) => ({ id: 'obstacle', part: 'darko-dock', kind: 'accessory' as const, position: [member.position[0], member.position[1], z] as [number, number, number], collisionBoxes: [{ min: [-5, -5, -5] as [number, number, number], max: [5, 5, 5] as [number, number, number] }] });
  assert.equal(detectCollisions([member, obstacle(member.position[2] + member.params.beamCenter)]).length, 1);
  assert.equal(detectCollisions([member, obstacle(member.position[2] + member.params.plateHeight / 2 - member.params.width / 2)]).length, 0);
});
