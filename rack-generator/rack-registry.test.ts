/** Rack-part registry contract (#131). Every entry in RACK_PARTS runs through these checks automatically; a new rack
 * attachment passes them before its own family tests. The dummy entries at the bottom exercise the mount options. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { RACK_PARTS, RACK_PART_IDS, defineRackPart, registerRackPart, rackPart, isRackPart, validateRackParams, coerceRackParams, rackHoles, rackTargets, resolveBy, PIN_1IN, PIN_5_8IN, type RackPart } from './rack-registry.ts';
import { floorOptions } from './floor-part.ts';
import { RACK_SECTIONS, DEFAULT_RACK_SECTION, sectionGroups } from './catalog-sections.ts';
import { definitions } from './catalog.ts';
import { vendorAttribution } from './vendor-metadata.ts';
import { partAttribution } from './attribution.ts';
import { ACCESSORY_PARTS, addAccessory, createAssembly, getMounts, getPartPlacementInfo, moveAccessory, removeInstance, resolveAssembly, unpairAccessory, validateAssembly } from './assembly.ts';
import { suggestPlacement, proposalCollision } from './placement-proposals.ts';
import { barCradles } from './barbell-cradles.ts';
import { detectCollisions } from './assembly-collisions.ts';
import { gridProfile } from './profiles.ts';
import type { NumericParams, PartId, RackDoc } from './types.ts';
import {BUILD_BUDGET_MS} from './test-budget.ts';
const api = await Module(); api.setup();
/** Every param combination (dependent options included), capped so large families stay fast. */
function combos(part: RackPart, limit = 48): NumericParams[] {
  let out: NumericParams[] = [{ ...part.defaults }];
  for (const param of part.params) out = out.flatMap(p => floorOptions(param, p).map(v => ({ ...p, [param.key]: v })));
  if (out.length <= limit) return out;
  const step = (out.length - 1) / (limit - 1);
  return [...new Set([0, ...Array.from({ length: limit - 1 }, (_, i) => Math.round((i + 1) * step))])].map(i => out[i]);
}
const context = (tube: number, params: NumericParams, mirror = false): NumericParams => ({ upright: tube, mountSpacing: 50, holeDiameter: 25, ...params, ...(mirror ? { mirror: 1 } : {}) });
function build(part: RackPart, params: NumericParams) {
  const def = definitions.find(d => d.id === part.id)!, started = performance.now(), solids = def.build(api, { ...def.defaults, ...params });
  const ms = performance.now() - started, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  try {
    assert.ok(solids.length > 0, part.id);
    for (const s of solids) {
      assert.equal(s.solid.status(), 'NoError', `${part.id} ${s.name}`); assert.ok(!s.solid.isEmpty() && s.solid.volume() > 0, `${part.id} ${s.name}`);
      assert.ok(s.name && s.color, `${part.id}: every solid is named and coloured`);
      const b = s.solid.boundingBox(); tris += s.solid.numTri();
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], b.min[i]); max[i] = Math.max(max[i], b.max[i]); }
    }
  } finally { solids.forEach(s => s.solid.delete()); }
  return { min, max, tris, ms };
}
test('every rack part is registered in the catalog with complete metadata, attribution and a sidebar section', () => {
  assert.deepEqual(definitions.filter(d => [...RACK_SECTIONS, DEFAULT_RACK_SECTION].includes(d.category as never)).map(d => d.id).sort(), [...RACK_PART_IDS].sort(), 'register in rack-parts/<family>.ts and parts/<family>.ts');
  assert.equal(new Set(definitions.map(d => d.id)).size, definitions.length, 'ids are unique across the catalog');
  for (const part of RACK_PARTS) {
    const def = definitions.find(d => d.id === part.id)!;
    assert.equal(def.name, part.title); assert.deepEqual(def.defaults, part.defaults); assert.equal(def.category, part.section ?? DEFAULT_RACK_SECTION);
    assert.ok(isRackPart(part.id) && ACCESSORY_PARTS.includes(part.id), part.id);
    assert.match(part.id, /^[a-z0-9]+(-[a-z0-9]+)+$/); assert.match(part.noun, /^[a-z][a-z -]*$/, part.id);
    assert.ok(part.params.length === Object.keys(part.defaults).length, part.id);
    assert.deepEqual(validateRackParams(part, {}), part.defaults);
    for (const key of Object.keys(part.defaults)) assert.ok(!['upright', 'mountSpacing', 'holeDiameter', 'mirror'].includes(key), `${part.id}: ${key} is a reserved rack context key`);
    const v = part.vendor;
    assert.ok(v.vendor && /^https:\/\//.test(v.url) && v.credit && v.trademark && v.reconstruction, `${part.id}: vendor attribution`);
    assert.deepEqual(vendorAttribution(part.id), v); assert.deepEqual(partAttribution(part.id), v);
    assert.match(part.description ?? '', /Independent reconstruction.*trademarks belong to/, `${part.id}: description credits the brand`);
    assert.equal(getPartPlacementInfo(part.id)!.paired, !!part.pair);
  }
  assert.deepEqual(sectionGroups(RACK_PARTS, RACK_SECTIONS, DEFAULT_RACK_SECTION).flatMap(([, ids]) => ids).sort(), [...RACK_PART_IDS].sort());
  assert.equal(rackPart('upright'), undefined); assert.equal(isRackPart('j-hook-standard'), false);
});
test('every rack part builds valid solids for every option, within its extent, budget and bodies', () => {
  for (const part of RACK_PARTS) for (const params of combos(part)) for (const mirror of part.handed ? [false, true] : [false]) for (const tube of [75, 76.2]) {
    const p = context(tube, params, mirror), label = `${part.id} ${JSON.stringify(p)}`, b = build(part, p);
    assert.ok(b.tris < 80000, `${label}: ${b.tris} triangles`); assert.ok(b.ms < BUILD_BUDGET_MS, `${label}: ${b.ms.toFixed(0)} ms`);
    // The declared vertical extent drives the hole limits: the solids must stay inside it.
    const { below, above } = resolveBy(part.mount.extent, p);
    assert.ok(b.min[2] >= -below - 1 && b.max[2] <= above + 1, `${label}: Z ${b.min[2].toFixed(1)}..${b.max[2].toFixed(1)} outside extent -${below}..${above}`);
    // Collision bodies describe the real solids: inside the build bounds and not degenerate.
    const bodies = resolveBy(part.bodies, p);
    assert.ok(bodies.length, `${label}: needs collision bodies`);
    for (const box of bodies) {
      assert.ok(box.min.every((v, i) => v < box.max[i]), `${label}: degenerate body`);
      assert.ok(box.min.every((v, i) => v >= b.min[i] - 2) && box.max.every((v, i) => v <= b.max[i] + 2), `${label}: body ${JSON.stringify(box)} outside the build`);
    }
    // Upright mounts: bodies stay clear of the tube itself (the pin or collar in the hole is not a body).
    const h = tube / 2 - .5;
    if (rackTargets(part).includes('upright')) for (const box of bodies) assert.ok(!(box.min[0] < h && box.max[0] > -h && box.min[1] < h && box.max[1] > -h), `${label}: body ${JSON.stringify(box)} inside the upright`);
  }
});
test('every rack part places on the stock rack, pairs, moves, unpairs, round-trips and follows its upright', () => {
  const stock = createAssembly();
  for (const part of RACK_PARTS) {
    const r = suggestPlacement(stock, part.id);
    assert.ok(r.proposal, `${part.id}: ${r.reason}`);
    const doc = r.proposal!.doc, a = doc.accessories.at(-1)!;
    assert.equal(proposalCollision(resolveAssembly(stock), r.proposal!), undefined, part.id);
    assert.equal(a.paired, !!part.pair?.default, `${part.id}: pair default`);
    const params = { ...part.defaults, ...a.params }, holes = rackHoles(part, { ...params, upright: stock.rack.tube, mountSpacing: stock.rack.pitch });
    const units = resolveAssembly(doc).filter(e => e.ownerId === a.id);
    assert.equal(units.length, a.paired ? 2 : 1);
    for (const u of units) {
      assert.equal(u.name, part.name); assert.equal(u.mounts.length, holes.length); assert.ok(u.collisionBoxes?.length);
      assert.deepEqual(u.mounts.map(m => m.hole - a.target.hole), holes);
    }
    assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(doc))), doc, `${part.id}: saved document round-trips`);
    assert.ok(getMounts(stock, part.id).length > 0);
    if (part.pair) {
      const paired = moveAccessory(doc, a.id, {}, true), split = unpairAccessory(paired, a.id);
      assert.equal(resolveAssembly(paired).filter(e => e.ownerId === a.id).length, 2);
      assert.equal(split.accessories.length, doc.accessories.length + 1);
    }
    // Faces: every allowed face with some fitting hole accepts it; disallowed faces refuse.
    for (const face of ['front', 'back', 'left', 'right'] as const) {
      const fits = getMounts(createAssembly({ emptyAccessories: true }), part.id).some(m => m.face === face);
      assert.equal(fits, (part.mount.faces ?? ['front', 'back', 'left', 'right']).includes(face), `${part.id} ${face}`);
    }
    if (a.target.kind !== 'crossmember-top') assert.equal(removeInstance(doc, a.target.uprightId).accessories.some(x => x.id === a.id), false, `${part.id}: removed with its upright`);
    assert.throws(() => validateAssembly({ ...doc, accessories: [...doc.accessories.slice(0, -1), { ...a, params: { bogus: 1 } }] }), /parameters/);
    assert.throws(() => validateAssembly({ ...doc, accessories: [...doc.accessories.slice(0, -1), { ...a, params: { upright: 75 } }] }), /parameters/, `${part.id}: context keys never persist`);
  }
});
test('every rack part fits or explains why on the REP and Bells of Steel profiles', () => {
  for (const profileId of ['rep-pr-4000', 'rep-pr-5000', 'bos-hydra']) {
    const profile = gridProfile(profileId), doc = { ...createAssembly({ emptyAccessories: true }), profileId, rack: { ...createAssembly().rack, tube: profile.tube ?? 75, pitch: profile.pitch, holeDiameter: profile.holeDiameter } } as RackDoc;
    for (const part of RACK_PARTS) {
      let valid: RackDoc; try { valid = validateAssembly(doc); } catch { continue; }
      const r = suggestPlacement(valid, part.id);
      if (r.proposal) assert.deepEqual(validateAssembly(r.proposal.doc), r.proposal.doc); else assert.match(r.reason, /bore|station|hole|fit|face|mount/i, `${profileId}/${part.id}: ${r.reason}`);
    }
  }
});
test('the worker param guard and UI coercion accept rack context and snap dependent options', () => {
  for (const part of RACK_PARTS) {
    assert.deepEqual(validateRackParams(part, { upright: 76.2, mountSpacing: 50.8, holeDiameter: 25.4, mirror: 1 }), part.defaults);
    for (const bad of [{ nope: 1 }, [], null, 'x']) assert.throws(() => validateRackParams(part, bad), new RegExp(part.noun));
    assert.deepEqual(coerceRackParams(part, { ...part.defaults, upright: 75 }), part.defaults);
  }
});

// Dummy entries exercise every mount option the contract offers.
const box = { min: [-20, 40, -20], max: [20, 200, 20] } as { min: [number, number, number]; max: [number, number, number] };
const vendor = { vendor: 'Test', url: 'https://example.com', credit: 'Test credit', trademark: 'Test ™', reconstruction: 'Test only.' };
const TWO_BOLT = defineRackPart({
  id: 'test-two-bolt-cup', name: 'Test cup', title: 'Test cups', noun: 'test cup', vendor, params: [{ key: 'size', label: 'Size', default: 0, options: [0, 1] }],
  mount: { pin: p => p.size ? PIN_1IN : PIN_5_8IN, holes: [0, -2], extent: { below: 120, above: 20 }, faces: ['front', 'back'] },
  bodies: [box], pair: { default: true }, handed: true, placement: { height: 1215, face: 'front' },
  cradles: { kind: 'working', label: 'Test cups', slots: p => [{ point: [10 * (p.mirror === 1 ? -1 : 1), 80, 30], axis: [1, 0, 0] }] },
  autoFit: rack => ({ size: rack.holeDiameter >= 24.8 ? 1 : 0 }),
});
const TOP = defineRackPart({
  id: 'test-top-bracket', name: 'Test top bracket', title: 'Test top brackets', noun: 'top bracket', vendor, params: [],
  mount: { targets: ['crossmember-top'], pin: PIN_5_8IN, extent: { below: 0, above: 0 } }, bodies: [{ min: [-30, 45, -60], max: [30, 60, 0] }], pair: { default: false },
});
registerRackPart(TWO_BOLT); registerRackPart(TOP);
test('mount options: bolt patterns, main stations, faces, bore, handed pairs, cradles and autoFit', () => {
  const doc = createAssembly({ emptyAccessories: true });
  const a = addAccessory(doc, TWO_BOLT.id, { uprightId: 'front-left', face: 'front', hole: 24 }, true, { size: 1 });
  const [left, right] = resolveAssembly(a).filter(e => (e.part as string) === TWO_BOLT.id);
  assert.deepEqual(left.mounts.map(m => m.hole), [24, 22], 'holes are station offsets from the target');
  assert.deepEqual(left.mounts[1].center[2] - left.mounts[0].center[2], -100);
  assert.equal(left.params.mirror, undefined); assert.equal(right.params.mirror, 1, 'handed pair mirrors its second unit');
  assert.deepEqual([left.params.upright, left.params.mountSpacing, left.params.holeDiameter], [75, 50, 25]);
  assert.deepEqual(left.rotation, [0, 0, Math.PI]); assert.deepEqual(left.mount!.pinAxis, [0, -1, 0]);
  assert.equal(barCradles(resolveAssembly(a)).filter(c => c.label.startsWith('Test cups')).length, 1, 'registry cradles park bars');
  assert.throws(() => addAccessory(doc, TWO_BOLT.id, { uprightId: 'front-left', face: 'left', hole: 24 }, false), /face/);
  assert.throws(() => addAccessory(doc, TWO_BOLT.id, { uprightId: 'front-left', face: 'front', hole: 1 }, false), /fits hole numbers|real hole/);
  const pr4000 = { ...doc, profileId: 'rep-pr-4000', rack: { ...doc.rack, pitch: 50.8, holeDiameter: 15.875 } };
  assert.throws(() => addAccessory(pr4000, TWO_BOLT.id, { hole: 20 }, false, { size: 1 }), /exceeds the rack bore/);
  const fitted = suggestPlacement(validateAssembly(pr4000), TWO_BOLT.id as PartId).proposal!;
  assert.equal(fitted.doc.accessories[0].params.size, 0, 'autoFit picks the 5/8-inch variant');
  assert.equal(getPartPlacementInfo(TWO_BOLT.id)!.family, 'rack:Rack attachments');
  const overlap = addAccessory(a, TWO_BOLT.id, { uprightId: 'front-left', face: 'front', hole: 22 }, false);
  assert.ok(detectCollisions(resolveAssembly(overlap)).some(w => /share mounting hole 23/.test(w.message)), 'every used hole is a shared-slot check');
});
test('mount options: crossmember-top targets reuse the rail stations and flip sides', () => {
  const doc = createAssembly({ emptyAccessories: true }), target = { kind: 'crossmember-top' as const, connectionId: 'left-upper-crossmember', station: 3, side: 1 as const, uprightId: 'front-left', face: 'front' as const, hole: 0 };
  const placed = addAccessory(doc, TOP.id, target, false), [unit] = resolveAssembly(placed).filter(e => (e.part as string) === TOP.id);
  assert.equal(unit.mount!.kind, 'crossmember-top'); assert.deepEqual(unit.connectedTo, ['left-upper-crossmember', 'front-left', 'rear-left']);
  assert.ok(getMounts(doc, TOP.id).length > 0 && getMounts(doc, TOP.id).every(m => m.kind === 'crossmember-top'));
  assert.throws(() => addAccessory(doc, TOP.id, { uprightId: 'front-left', face: 'front', hole: 10 }, false), /crossmember-top/);
  assert.throws(() => addAccessory(doc, TWO_BOLT.id, target, false), /upright/);
  assert.equal(removeInstance(placed, 'left-upper-crossmember').accessories.length, 0);
  assert.ok(suggestPlacement(doc, TOP.id as PartId).proposal);
});
