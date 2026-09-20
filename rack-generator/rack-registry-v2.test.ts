/** Rack-part registry v2 (#178): opt-in rack context, the floor rule, crossmember-under and hosted (spotter-arm /
 * pull-up-bar) targets, and the products they unblock — Rogue Monster Mini Feet, Rogue Multi-Use Rack Roller, REP
 * Utility Seat, Darko Thresher Pad, and the Darko QuickMount / Beyond Power bar mounts on their new targets. The generic
 * contract sweeps (every option, extents, bodies, placement, pairs, round trips) run in rack-registry.test.ts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { catalog, definitions } from './catalog.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
import { printableMesh } from '../src/exports/print-mesh.ts';
import { floorOptions } from './floor-part.ts';
import { addAccessory, createAssembly, getMounts, moveAccessory, removeInstance, resolveAssembly, unpairAccessory, validateAssembly } from './assembly.ts';
import { detectCollisions } from './assembly-collisions.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { applyPreset } from './presets.ts';
import { rackBuildParams, rackPart, validateRackParams, coerceRackParams, type RackPart } from './rack-registry.ts';
import { eulerBasis, applyBasis } from './rack-targets.ts';
import { ROGUE_MONSTER_MINI_FEET, MINI_FEET } from './rack-parts/rack-jcups-safeties-feet.ts';
import { REGISTRY_V2_PARTS as ROLLERS_V2 } from './rack-parts/rack-rollers-pads.ts';
import { REGISTRY_V2_PARTS as JCUPS_V2 } from './rack-parts/rack-jcups-safeties.ts';
import { ROGUE_MULTI_USE_RACK_ROLLER, RACK_ROLLER, REP_UTILITY_SEAT, UTILITY_SEAT, DARKO_THRESHER_PAD, THRESHER } from './rack-parts/rack-rollers-pads-v2.ts';
import { DARKO_QUICKMOUNT, BEYOND_POWER_ADAPTIVE_BAR_MOUNT, BEYOND_POWER_FIXED_BAR_MOUNT } from './rack-parts/rack-digital-cable.ts';
import type { Accessory, HostedTarget, NumericParams, PartId, RackDoc, SolidPart, Vec3 } from './types.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
type Box = { min: number[]; max: number[] };
const NEW: RackPart[] = [...ROLLERS_V2, ...JCUPS_V2];
function measure(part: RackPart, params: NumericParams = {}) {
  const def = definitions.find(d => d.id === part.id)!, solids: SolidPart[] = def.build(api, rackBuildParams(part, params));
  try {
    const boxes = new Map<string, Box>(), all: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const s of solids) {
      assert.equal(s.solid.status(), 'NoError', `${part.id} ${s.name}`); assert.ok(!s.solid.isEmpty() && s.solid.volume() > 0, `${part.id} ${s.name}`);
      const b = s.solid.boundingBox(), o = boxes.get(s.name);
      boxes.set(s.name, o ? { min: o.min.map((v, i) => Math.min(v, b.min[i])), max: o.max.map((v, i) => Math.max(v, b.max[i])) } : { min: [...b.min], max: [...b.max] });
      for (let i = 0; i < 3; i++) { all.min[i] = Math.min(all.min[i], b.min[i]); all.max[i] = Math.max(all.max[i], b.max[i]); }
    }
    return { all, names: solids.map(s => s.name), get: (name: string) => { const b = boxes.get(name); assert.ok(b, `${part.id}: missing ${name}`); return b!; } };
  } finally { solids.forEach(s => s.solid.delete()); }
}
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tolerance}`);
const placed = (doc: RackDoc, part: string, params: NumericParams = {}) => {
  const r = suggestPlacement(doc, part as PartId); assert.ok(r.proposal, `${part}: ${r.reason}`);
  const next = r.proposal!.doc, a = next.accessories.at(-1)!; a.params = { ...a.params, ...params };
  const doc2 = validateAssembly(next); return { doc: doc2, a: doc2.accessories.at(-1)!, units: resolveAssembly(doc2).filter(e => e.ownerId === a.id) };
};
const preset = (id: string) => applyPreset(id);
const RM4 = 'rogue-rm-monster-2-four-2295.525-1092.2', RML = 'rogue-rml-3-four-2295.525-762', PR5000 = 'rep-pr-5000-four-2362.2-762';
/** World point of a local point of a resolved instance. */
const world = (u: { position: Vec3; rotation: Vec3 }, p: Vec3): Vec3 => applyBasis(eulerBasis(u.rotation), p).map((v, i) => v + u.position[i]) as Vec3;

test('every new entry builds printable closed solids for every option and validates its params', () => {
  assert.deepEqual(NEW.map(p => p.id).sort(), ['darko-thresher-pad', 'rep-utility-seat', 'rogue-monster-mini-feet', 'rogue-multi-use-rack-roller']);
  for (const part of NEW) {
    assert.equal(rackPart(part.id), part);
    let combos: NumericParams[] = [{ ...part.defaults }];
    for (const param of part.params) combos = combos.flatMap(p => floorOptions(param, p).map(v => ({ ...p, [param.key]: v })));
    const def = definitions.find(d => d.id === part.id)!;
    for (const params of combos) {
      const solids = def.build(api, rackBuildParams(part, params));
      try { for (const s of solids) printableMesh(s.solid, `${part.id} ${JSON.stringify(params)} ${s.name}`); } finally { solids.forEach(s => s.solid.delete()); }
    }
    assert.deepEqual(validateRackParams(part, {}), part.defaults);
    assert.throws(() => validateRackParams(part, { bogus: 1 }), new RegExp(part.noun));
    assert.deepEqual(validateRackParams(part, { holeHeight: 65, hostSpan: 1, acrossOut: 1 }), part.defaults, 'worker requests may carry the v2 context');
    assert.throws(() => validateAssembly({ ...createAssembly(), accessories: [{ id: 'x', part: part.id as PartId, target: { uprightId: 'front-left', face: 'front', hole: 0 }, paired: false, params: { holeHeight: 65 } }] }), /parameters/, 'context keys never persist');
    assert.deepEqual(coerceRackParams(part, { ...part.defaults, holeHeight: 65 }), part.defaults);
  }
});

test('rack context v2 is opt-in: only entries that list a key receive it, host sections always reach hosted parts', () => {
  const stock = createAssembly();
  const feet = placed(stock, ROGUE_MONSTER_MINI_FEET.id).units[0], roller = placed(stock, ROGUE_MULTI_USE_RACK_ROLLER.id).units[0];
  assert.equal(feet.params.holeHeight, 65, 'the feet receive the lower bolt height'); assert.equal(feet.params.acrossOut, undefined);
  assert.equal(roller.params.acrossOut, 1, 'front-left inner face: local +X points out of the rack (forward)'); assert.equal(roller.params.holeHeight, undefined);
  const jcup = placed(stock, 'ghost-strong-ghost-roller-j-cup').units[0];
  for (const key of ['holeHeight', 'rackWidth', 'rackDepth', 'rackHeight', 'acrossOut', 'hostWidth']) assert.equal(jcup.params[key], undefined, `${key} is not passed to entries that do not ask`);
  const thresher = placed(stock, DARKO_THRESHER_PAD.id).units[0];
  assert.deepEqual([thresher.params.hostWidth, thresher.params.hostHeight, thresher.params.hostHole, thresher.params.hostPitch], [75, 75, 25, 50], 'box-safety section and hole pattern');
  // acrossOut flips on the right post's inner face (its local +X points into the rack).
  const right = addAccessory(createAssembly({ emptyAccessories: true }), ROGUE_MULTI_USE_RACK_ROLLER.id, { uprightId: 'front-right', face: 'left', hole: 9 }, false);
  assert.equal(resolveAssembly(right).find(e => e.part === ROGUE_MULTI_USE_RACK_ROLLER.id)!.params.acrossOut, -1);
});

test('Monster Mini Feet: floor rule, 13 in from the face, 6.75 in tube top, leg to the real floor, 1 in bolts 6 in apart', () => {
  const m = measure(ROGUE_MONSTER_MINI_FEET, { upright: inch(3), mountSpacing: inch(2) }), f = MINI_FEET, face = inch(3) / 2;
  const steel = m.get('MG Black foot plate, 3x3 in 11-gauge tube and floor tab');
  near(steel.max[1] - face, inch(13), 1, 'reach from the mounting face'); near(size(steel, 0), inch(3), .5, 'width');
  near(steel.min[2], -f.lowerBolt, .01, 'floor contact at the nominal lower-bolt height'); near(steel.max[2] + f.lowerBolt, f.plate.above + f.boltSpan + f.lowerBolt, .5, 'plate top');
  const tubeTop = f.boltSpan / 2 + f.tube / 2; near(tubeTop + f.lowerBolt, inch(6.75), .01, 'floor to the top of the foot tube (published)');
  // The leg follows the actual first-hole height to the floor.
  for (const h of [40, 65, 100]) near(measure(ROGUE_MONSTER_MINI_FEET, { holeHeight: h }).all.min[2], -h, .01, `floor at ${h} mm`);
  const doc = createAssembly({ emptyAccessories: true });
  const units = resolveAssembly(addAccessory(doc, ROGUE_MONSTER_MINI_FEET.id, { uprightId: 'front-left', face: 'front', hole: 0 }, true)).filter(e => e.part === ROGUE_MONSTER_MINI_FEET.id);
  assert.equal(units.length, 2, 'sold and placed as a pair'); assert.deepEqual(units[0].mounts.map(mm => mm.hole), [0, 3], 'holes #1 and #4 (6 in on a 2 in lattice)');
  assert.throws(() => addAccessory(doc, ROGUE_MONSTER_MINI_FEET.id, { uprightId: 'front-left', face: 'front', hole: 2 }, false), /stands on the floor from a hole 40–100 mm up|fits hole numbers 1–1/);
  // Monster only: 1 in bolts refuse 5/8 in Monster Lite racks; RM-4 takes them at its first hole.
  assert.match(suggestPlacement(preset(RML), ROGUE_MONSTER_MINI_FEET.id as PartId).reason, /bore/);
  const rm4 = placed(preset(RM4), ROGUE_MONSTER_MINI_FEET.id);
  assert.equal(rm4.a.target.hole, 0); near(rm4.units[0].params.holeHeight, inch(2.5), .01, 'RM-4 first hole');
});

test('Multi-Use Rack Roller: 41 x 6 in pad across the front posts, 6.4 in ahead of their front face, pinned side to side', () => {
  const m = measure(ROGUE_MULTI_USE_RACK_ROLLER, { upright: inch(3), mountSpacing: inch(2), uprightSpan: inch(46) });
  const pad = m.get('41 x 6 in black vinyl roller pad');
  near(size(pad, 1), RACK_ROLLER.pad - 8, 1, 'pad length on a 43 in gap (41 in less the gathered ends)'); near(size(pad, 2), inch(6), .5, 'pad diameter');
  near((pad.min[0] + pad.max[0]) / 2 - inch(1.5), inch(6.4), .5, 'roller axis ahead of the front face');
  near(m.all.max[1] - m.all.min[1], inch(46) + inch(3) / 2 * 2 + 24, 30, 'overall bracket to bracket incl. pegs (published 50.5 in)');
  const stock = placed(createAssembly(), ROGUE_MULTI_USE_RACK_ROLLER.id), u = stock.units[0];
  assert.equal(stock.units.length, 1, 'one part spans both posts'); assert.equal(stock.a.target.face, 'right', 'front-left inner face');
  const axis = world(u, [inch(37.5 / 25.4) + inch(6.4), 500, RACK_ROLLER.axisZ]);
  assert.ok(axis[1] < stock.doc.uprights['front-left'].y - 75 / 2, 'the roller sits in front of the front uprights');
  assert.deepEqual(u.mounts.map(mm => mm.hole - stock.a.target.hole), [0, -2], 'welded peg and detent pin two stations apart');
  assert.ok(Math.abs(u.mounts[0].pinAxis![0]) > .99, 'pins run side to side through the upright');
  // Fixed length: refused on the 44.9 in PR-5000; the Monster Lite series (5/8 in) on Monster Lite.
  assert.equal(suggestPlacement(preset(PR5000), ROGUE_MULTI_USE_RACK_ROLLER.id as PartId).proposal, null);
  assert.throws(() => addAccessory(preset(PR5000), ROGUE_MULTI_USE_RACK_ROLLER.id, { uprightId: 'front-left', face: 'right', hole: 9 }, false), /43 in inside-width/);
  assert.throws(() => addAccessory(createAssembly(), ROGUE_MULTI_USE_RACK_ROLLER.id, { uprightId: 'front-left', face: 'left', hole: 9 }, false), /inner side face/);
  assert.equal(placed(preset(RML), ROGUE_MULTI_USE_RACK_ROLLER.id).a.params.series, 1);
});

test('Darko QuickMount hangs under an upper crossmember: Magpin through the rail side hole, VOLTRA below, shares the station', () => {
  const doc = createAssembly({ emptyAccessories: true });
  const under = getMounts(doc, DARKO_QUICKMOUNT.id).filter(m => m.kind === 'crossmember-under');
  assert.ok(under.length > 20, 'every upper-rail station on both sides');
  const t = { kind: 'crossmember-under' as const, connectionId: 'left-upper-crossmember', station: 5, side: 1 as const, uprightId: 'front-left', face: 'front' as const, hole: 0 };
  const a = addAccessory(doc, DARKO_QUICKMOUNT.id, t, false), [u] = resolveAssembly(a).filter(e => e.part === DARKO_QUICKMOUNT.id);
  const down = applyBasis(eulerBasis(u.rotation), [0, 1, 0]); near(down[2], -1, 1e-9, 'local +Y points straight down');
  near(Math.abs(u.mount!.pinAxis![0]), 1, 1e-9, 'the Magpin runs through the rail side (across a front-to-back rail)');
  const m = measure(DARKO_QUICKMOUNT), dock = world(u, [0, (m.get('VOLTRA rounded housing').min[1] + m.get('VOLTRA rounded housing').max[1]) / 2, 0]);
  assert.ok(dock[2] < u.position[2] - 75 / 2 - 80, 'the VOLTRA hangs below the rail');
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(a))), a, 'saved document round-trips');
  assert.equal(removeInstance(a, 'left-upper-crossmember').accessories.length, 0, 'removed with its rail');
  const withAnchor = addAccessory(a, 'darko-anchor', { ...t, kind: 'crossmember-top' }, false);
  assert.ok(detectCollisions(resolveAssembly(withAnchor)).some(w => /share mounting station 6/.test(w.message)), 'top and underside share the rail bolt');
  // Existing upright placements are unchanged, and the upright stays the default.
  assert.notEqual(suggestPlacement(createAssembly(), DARKO_QUICKMOUNT.id as PartId).proposal!.doc.accessories.at(-1)!.target.kind, 'crossmember-under');
});

test('Beyond Power bar mounts clamp the rack pull-up bar, follow it, pair across it and leave with it; the peg still works', () => {
  const stock = createAssembly(), r = placed(stock, BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id), t = r.a.target as HostedTarget;
  assert.equal(t.kind, 'pull-up-bar'); assert.equal(t.host, 'pullup-front');
  const u = r.units[0]; assert.equal(u.params.hostWidth, 32, 'clamps the 32 mm stock bar');
  const bar = resolveAssembly(stock).find(e => e.id === 'pullup-front')!, barZ = bar.position[2] + 175;
  near(u.position[2], barZ, 1e-6, 'clamp centred on the bar axis'); near(u.position[1], bar.position[1], 1e-6, 'on the bar line');
  const onBar = measure(BEYOND_POWER_ADAPTIVE_BAR_MOUNT, { hostWidth: 32 });
  assert.ok(!onBar.names.includes('1 in rack peg (sold separately)'), 'no peg on a real bar');
  assert.ok(onBar.get('VOLTRA rounded housing').max[2] < -16, 'VOLTRA hangs under the bar');
  // A fat bar rides higher in the Adaptive jaw window; Fixed mount spacer shells fill the 2 in bore down to the bar.
  assert.ok(measure(BEYOND_POWER_ADAPTIVE_BAR_MOUNT, { hostWidth: 50.8 }).all.max[2] < onBar.all.max[2]);
  assert.ok(measure(BEYOND_POWER_FIXED_BAR_MOUNT, { hostWidth: 31.75 }).names.includes('Bar spacer shells'));
  assert.ok(!measure(BEYOND_POWER_FIXED_BAR_MOUNT, { hostWidth: 50.8 }).names.includes('Bar spacer shells'));
  // Follows the bar when it moves, leaves with it.
  const moved = moveAccessory(r.doc, 'pullup-front', { hole: 30 });
  near(resolveAssembly(moved).find(e => e.ownerId === r.a.id)!.position[2], resolveAssembly(moved).find(e => e.id === 'pullup-front')!.position[2] + 175, 1e-6, 'follows the bar');
  assert.equal(removeInstance(r.doc, 'pullup-front').accessories.some(a => a.id === r.a.id), false, 'removed with its bar');
  // Two VOLTRAs: the pair unit takes the mirrored station on the same bar.
  const pair = moveAccessory(r.doc, r.a.id, {}, true), units = resolveAssembly(pair).filter(e => e.ownerId === r.a.id);
  assert.equal(units.length, 2); near(units[0].position[0], -units[1].position[0], 13, 'mirrored about the bar centre');
  assert.equal(unpairAccessory(pair, r.a.id).accessories.filter(a => a.part === BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id).length, 2);
  // Bar range: the Fixed mount refuses a bar under 1 in.
  assert.throws(() => BEYOND_POWER_FIXED_BAR_MOUNT.mount.validate!(stock.rack, { ...BEYOND_POWER_FIXED_BAR_MOUNT.defaults, hostWidth: 20 }), /1–2 in/);
  // Registry pull-up bars host it too (the REP 1.25 in bar and both Rogue fat/skinny bars).
  let pr = placed(preset(PR5000), 'rep-pull-up-bar').doc;
  const fixed = placed(pr, BEYOND_POWER_FIXED_BAR_MOUNT.id); near(fixed.units[0].params.hostWidth, inch(1.25), 1e-6, 'REP 1.25 in bar');
  pr = placed(createAssembly({ emptyAccessories: true }), 'rogue-fat-skinny-pull-up-bar').doc;
  const frames = new Set(getMounts(pr, BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id).filter(m => m.kind === 'pull-up-bar').map(m => (m as HostedTarget).frame));
  assert.deepEqual([...frames].sort(), [0, 1], 'skinny and fat bars');
  // Saved peg documents keep loading and resolving unchanged.
  const peg = addAccessory(createAssembly({ emptyAccessories: true }), BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id, { uprightId: 'front-left', face: 'front', hole: 30 }, false);
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(peg))), peg); assert.equal(resolveAssembly(peg).find(e => e.part === BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id)!.params.hostWidth, undefined);
});

test('Darko Thresher Pad pins through a spotter arm or box safety: two Magpins two holes apart, five angles, arm fit rules', () => {
  const t = THRESHER, flat = measure(DARKO_THRESHER_PAD, { angle: 0 }), pad = flat.get('Grippy seat pad');
  near(size(pad, 0), inch(8.5), .5, 'pad width'); near(size(pad, 1), inch(13), .5, 'pad length'); near(pad.max[2] - flat.get('Steel pad substrate').min[2], inch(3), .5, 'pad incl. substrate');
  const pins = flat.get('0.98 in Magpins (sold separately)'); near(size(pins, 2), inch(.98), .3, 'Magpin diameter'); near(size(pins, 1), inch(4) + inch(.98), 1, 'pivot to lock pin (two 2 in holes)');
  const steep = measure(DARKO_THRESHER_PAD, { angle: 4 }).get('Grippy seat pad');
  assert.ok(steep.max[2] > pad.max[2] + 100 && steep.min[1] > pad.min[1] + 150, '60°: the rack-side (-Y) end rises about the pivot');
  assert.equal(t.angles.length, 5);
  // On Rogue Monster spotter arms (1 in holes on 2 in centres).
  let rm4 = placed(preset(RM4), 'rogue-monster-spotter-arms-2').doc;
  const on = placed(rm4, DARKO_THRESHER_PAD.id, { angle: 2 }), ht = on.a.target as HostedTarget, arm = resolveAssembly(on.doc).filter(e => e.ownerId === ht.host)[ht.unit];
  assert.equal(ht.kind, 'spotter-arm'); near(on.units[0].params.hostPitch, 50.8, 1e-9, 'arm hole pitch'); near(on.units[0].params.hostWidth, inch(3), 1e-9, 'arm width');
  assert.ok(Math.abs(on.units[0].mount!.pinAxis!.reduce((s, v, i) => s + v * applyBasis(eulerBasis(arm.rotation), [1, 0, 0])[i], 0)) > .999, 'Magpins parallel to the arm holes');
  assert.equal(detectCollisions(resolveAssembly(on.doc)).filter(w => w.ids.includes(on.a.id)).length, 0, 'straddling its own arm is not a collision');
  rm4 = removeInstance(on.doc, ht.host); assert.equal(rm4.accessories.some(a => a.id === on.a.id), false, 'removed with its arm');
  // The host arm unpairs: a Thresher on its second unit follows to the new accessory.
  const second = moveAccessory(on.doc, on.a.id, { ...ht, unit: 1 } as Partial<HostedTarget>);
  const split = unpairAccessory(second, ht.host), moved = split.accessories.find(a => a.id === on.a.id)!.target as HostedTarget;
  assert.notEqual(moved.host, ht.host); assert.equal(moved.unit, 0);
  // Stations near the clasp (the lock pin would miss the arm's flat) and 5/8 in-hole arms are refused.
  assert.throws(() => moveAccessory(on.doc, on.a.id, { ...ht, station: 0 } as Partial<HostedTarget>), /does not fit at station 1/);
  const saml = placed(preset(RML), 'rogue-saml-24-spotter-arms').doc;
  assert.equal(getMounts(saml, DARKO_THRESHER_PAD.id).length, 0, 'SAML-24 arms have 1/2 in holes: no host stations');
  // Without any host the part explains itself.
  assert.match(suggestPlacement(createAssembly({ emptyAccessories: true }), DARKO_THRESHER_PAD.id as PartId).reason, /spotter arm/);
});

test('REP Utility Seat spans a matching pair of safeties or spotter arms: 32.75 x 11.6 in mat, end plates on the members, pins through them', () => {
  const m = measure(REP_UTILITY_SEAT), mat = m.get('Non-slip rubber mat');
  near(size(mat, 0), UTILITY_SEAT.top[0], .5, 'usable length'); near(size(mat, 1), UTILITY_SEAT.top[1], .5, 'usable width');
  near(size(m.get('Metallic black 11-gauge seat frame'), 0), inch(41) + inch(3) * 2 + 2 * 0, 20, '41 in between members plus the 3 in end plates');
  const stock = placed(createAssembly(), REP_UTILITY_SEAT.id), u = stock.units[0], ht = stock.a.target as HostedTarget;
  assert.equal(ht.host, 'safeties'); near(u.params.hostSpan!, 1150, 1e-6, 'box safety centres across the stock rack'); assert.equal(stock.a.params.liners, 1, '49 in-rack liners on a 42.3 in gap');
  const deck = world(u, [u.params.hostSpan! / 2, 0, 0]); near(deck[0], 0, 1e-6, 'centred across the rack');
  assert.equal(detectCollisions(resolveAssembly(stock.doc)).filter(w => w.ids.includes(stock.a.id)).length, 0, 'resting on both safeties is not a collision');
  assert.ok(measure(REP_UTILITY_SEAT, { pad: 1 }).names.includes('Utility Seat Pad, CleanGrip vinyl'));
  // Spans REP spotter arms on the PR-5000 too; a single (unpaired) arm is refused.
  const pr = placed(placed(preset(PR5000), 'rep-spotter-arms').doc, REP_UTILITY_SEAT.id);
  assert.ok(Math.abs(pr.units[0].params.hostSpan!) > 1100);
  const arms = pr.doc.accessories.find(a => a.part === 'rep-spotter-arms')!;
  const single = unpairAccessory(pr.doc, arms.id);
  assert.equal(single.accessories.some(a => a.part === REP_UTILITY_SEAT.id), false, 'unpairing the arms drops the seat that spanned them');
  assert.throws(() => rackPart(REP_UTILITY_SEAT.id)!.mount.validate!(pr.doc.rack, { ...REP_UTILITY_SEAT.defaults, hostWidth: 50.8 }), /add the pair/);
});

test('3MF export prints the new parts, hosted and under-rail ones included, with their vendor credits', () => {
  let doc = createAssembly();
  for (const id of [ROGUE_MONSTER_MINI_FEET.id, ROGUE_MULTI_USE_RACK_ROLLER.id, REP_UTILITY_SEAT.id, DARKO_THRESHER_PAD.id, BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id]) doc = placed(doc, id).doc;
  doc = addAccessory(doc, DARKO_QUICKMOUNT.id, { kind: 'crossmember-under', connectionId: 'right-upper-crossmember', station: 4, side: 1, uprightId: 'front-right', face: 'front', hole: 0 } as Accessory['target'], false);
  const ours = new Set<string>([...NEW.map(p => p.id), DARKO_QUICKMOUNT.id, BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id]);
  const builders = catalog.definitions.map(def => ours.has(def.id) ? def : { ...def, build: () => [{ name: 'Frame fixture', solid: api.Manifold.cube([1, 1, 1]), role: 'frame' as const }] });
  const result = exportPrint3MF(api, doc, builders, { layout: 'assembled' }, undefined, catalog.attribution);
  const credited = new Set((JSON.parse(strFromU8(unzipSync(result.bytes)['Metadata/print-report.json'])).vendorCredits as { part: string }[]).map(c => c.part));
  assert.deepEqual([...ours].filter(id => !credited.has(id)), []);
});
