/** Dips & landmines family (#134): published dimensions come out of the builds, poses and hardware follow the params,
 * and every part mounts (or explains why not) on the racks its maker sells it for. The registry sweep in
 * rack-registry.test.ts already builds every option, checks extents, bodies, budgets and placement. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { definitions } from './catalog.ts';
import { validateRackParams, coerceRackParams, rackBuildParams, rackHoles, floorOptions, type RackPart } from './rack-registry.ts';
import { PARTS } from './rack-parts/rack-dips-landmines.ts';
import { BOS_LANDMINE, KLEVA_ADROIT_2, REP_KLEVA_ADROIT, REP_LANDMINE, ROGUE_LANDMINE, ROGUE_MONSTER_LANDMINE, ADROIT } from './rack-parts/rack-dips-landmines-landmines.ts';
import { BOS_Y_DIP, FRINGE_SWAN_NECK, MATADOR, MUTANT_HANDLES, MUTANT_UDA, REP_DIP_STATION, REP_DROP_IN_DIP, ROGUE_MATADOR, UDA, udaLayout, matadorLayout } from './rack-parts/rack-dips-landmines-dips.ts';
import { applyPreset } from './presets.ts';
import { createAssembly, resolveAssembly } from './assembly.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { NumericParams, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
type Box = { min: number[]; max: number[] };
function measure(part: RackPart, params: NumericParams = {}) {
  const def = definitions.find(d => d.id === part.id)!, started = performance.now();
  const parts: SolidPart[] = def.build(api, rackBuildParams(part, params)), ms = performance.now() - started;
  try {
    const boxes = new Map<string, Box>(), all: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const p of parts) {
      assert.equal(p.solid.status(), 'NoError', `${part.id} ${p.name}`); assert.ok(p.solid.volume() > 0, `${part.id} ${p.name}`);
      const b = p.solid.boundingBox(); boxes.set(p.name, { min: [...b.min], max: [...b.max] });
      for (let i = 0; i < 3; i++) { all.min[i] = Math.min(all.min[i], b.min[i]); all.max[i] = Math.max(all.max[i], b.max[i]); }
    }
    return { all, boxes, ms, colors: new Map(parts.map(p => [p.name, p.color])) };
  } finally { parts.forEach(p => p.solid.delete()); }
}
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tolerance}`);
const F = 75 / 2;
test('every entry builds closed solids at its defaults and at the first, middle and last value of every param', () => {
  assert.equal(PARTS.length, 13);
  for (const part of PARTS) {
    const sets: NumericParams[] = [{}];
    for (const param of part.params) {
      const options = floorOptions(param, part.defaults);
      for (const v of [options[0], options[Math.floor(options.length / 2)], options.at(-1)!]) sets.push({ [param.key]: v });
    }
    for (const params of sets) {
      const clean = coerceRackParams(part, { ...part.defaults, ...params }), m = measure(part, clean);
      assert.ok(m.ms < BUILD_BUDGET_MS, `${part.id}: ${m.ms.toFixed(0)} ms`);
      assert.ok(m.all.min[1] > -F - 60 && m.all.max[1] > F, `${part.id}: sits on and in front of the mounting face`);
    }
    assert.deepEqual(validateRackParams(part, {}), part.defaults);
    assert.throws(() => validateRackParams(part, { bogus: 1 }), /parameter/i);
    assert.throws(() => validateRackParams(part, { [part.params[0].key]: 99 }));
  }
});
test('UDA: 21.25 in bat-wing frame, 6.75 in cup, 1-3/8 in x 18 in handles at 30°, 24.5 in reach, grip ranges', () => {
  const m = measure(MUTANT_UDA), wings = ['Right wing', 'Left wing'].map(n => m.boxes.get(n)!);
  near(Math.max(...wings.map(b => b.max[0])) - Math.min(...wings.map(b => b.min[0])), inch(21.25), 12, 'frame width');
  const plate = m.boxes.get('Pin side plate')!;
  near(size(plate, 2), inch(6.75), .5, 'cup height'); near(size(plate, 0), UDA.plate, .1, '3/8 in plate');
  near(m.all.max[1] - F, inch(24.5), 25, 'reach from the upright face');
  const g = udaLayout(rackBuildParams(MUTANT_UDA));
  near(2 * Math.atan2(g.normal[0], g.normal[1]) * 180 / Math.PI, 30, .01, 'handles at 30° to each other');
  near(g.handle(1).grip1 - g.handle(1).grip0, inch(18), .01, '18 in grip');
  near(size(m.boxes.get('Knurled grip')!, 2), inch(1.375), .3, '1-3/8 in handle');
  // Inner width at the handle roots follows the three published ranges (11.5 / 15 / 19 in).
  for (const [position, inner] of [[0, 11.5], [1, 15], [2, 19]]) near(2 * udaLayout({ ...rackBuildParams(MUTANT_UDA), position }).hole(UDA.holes[position]!)[0] - inch(1.375), inch(inner), inch(1.5), `position ${position} inner width`);
  assert.ok(measure(MUTANT_UDA, { hardware: 1 }).boxes.get('Orange pull loop'), '5/8 in version has the detent pin');
  near(size(measure(MUTANT_UDA, { gripSize: 1 }).boxes.get('Knurled grip')!, 2), 45, .3, '45 mm upgrade');
  assert.deepEqual(coerceRackParams(MUTANT_UDA, { handles: 1, gripSize: 1 }), { ...MUTANT_UDA.defaults, handles: 1, gripSize: 0 }, 'black handles are 35 mm only');
  assert.equal(measure(MUTANT_UDA, { color: 1 }).colors.get('Spine'), '#9c1a1f');
});
test('Mutant Metals Handles: 1 in pin through the upright, 1-3/8 in x 18 in grip, knob on the far face, as a pair', () => {
  const m = measure(MUTANT_HANDLES), grip = m.boxes.get('Knurled grip')!, pin = m.boxes.get('Threaded 1 in pin')!;
  near(size(grip, 1), inch(18), .1, 'grip length'); near(size(grip, 2), inch(1.375), .3, 'grip diameter'); near(size(pin, 0), inch(1), .3, 'pin diameter');
  assert.ok(pin.min[1] < -F && m.boxes.get('Knurled knob')!.max[1] <= -F + .01, 'the pin crosses the post and the knob bears on the far face');
  near(grip.max[1] - m.boxes.get('Handle shoulder')!.min[1] + inch(4) - 10, inch(22), inch(1), 'about 22 in overall');
  const r = suggestPlacement(createAssembly(), MUTANT_HANDLES.id).proposal!, a = r.doc.accessories.at(-1)!;
  assert.equal(a.paired, true); assert.equal(resolveAssembly(r.doc).filter(e => e.ownerId === a.id).length, 2);
  assert.match(suggestPlacement(applyPreset('rep-pr-4000-four-2362.2-762'), MUTANT_HANDLES.id).reason, /bore/);
});
test('Matador: 24 x 27 x 10 in, 1-7/8 in handles 17.75 in apart at the crossbar and 24.75 in at the tips', () => {
  const m = measure(ROGUE_MATADOR);
  near(m.all.max[1] - F, inch(24), 12, 'length from the upright'); near(size(m.all, 0), inch(27), 12, 'width');
  near(size(m.boxes.get('Channel flanges')!, 2), inch(10), .5, 'channel height');
  near(size(m.boxes.get('1-7/8 in handle')!, 2), inch(1.875), .3, 'handle diameter');
  const g = matadorLayout(rackBuildParams(ROGUE_MATADOR)), h = g.handle(1);
  near(2 * MATADOR.rootX, inch(17.75), .01, 'centres at the crossbar'); near(2 * (h.b[0]), inch(24.75), 3, 'centres at the tips');
  assert.ok(measure(ROGUE_MATADOR, { pin: 1 }).boxes.get('Steel pull ring'), 'Monster version: 1 in Matador pin');
});
test('REP Dip Station: 32.1 x 27 x 11.3 in, peg plus lock pin four stations down on a 2 in pitch', () => {
  const m = measure(REP_DIP_STATION);
  near(m.all.max[1] - F, inch(32.1), 15, 'length'); near(size(m.all, 0), inch(27), 15, 'max width');
  near(size(m.boxes.get('C-cup flanges')!, 2), inch(11.3), .5, 'height');
  assert.deepEqual(rackHoles(REP_DIP_STATION, { ...REP_DIP_STATION.defaults, mountSpacing: 50.8 }), [0, -4]);
});
test('REP Drop-In: 12.2 in tall, 15.7 in wide, 16.5 in deep, 44 mm handles, mirrored pair', () => {
  const m = measure(REP_DROP_IN_DIP), plate = m.boxes.get('Main plate')!;
  near(size(plate, 2), inch(12.2), .5, 'height'); near(size(plate, 0), inch(15.7), 1, 'width per side');
  near(m.all.max[1] - F, inch(16.5), 6, 'depth added'); near(size(m.boxes.get('44 mm handle')!, 2), 44, .3, 'handle diameter');
  assert.ok(plate.max[0] > F && plate.min[0] < -F, 'the plate crosses the post and reaches toward the rack centre');
  const mirrored = measure(REP_DROP_IN_DIP, { mirror: 1 });
  near(mirrored.all.min[0], -m.all.max[0], .01, 'second unit mirrors local X');
  const doc = suggestPlacement(createAssembly(), REP_DROP_IN_DIP.id).proposal!.doc, a = doc.accessories.at(-1)!;
  const units = resolveAssembly(doc).filter(e => e.ownerId === a.id);
  assert.equal(units.length, 2, 'placed as a left/right pair');
  assert.deepEqual(units.map(u => u.params.mirror ?? 0).sort(), [0, 1]);
});
test('BOS Y Dip: 25 x 27 in, 1.9 in handles, and each version needs its own post', () => {
  for (const variant of [0, 1, 2]) {
    const m = measure(BOS_Y_DIP, { variant });
    near(m.all.max[1] - F, inch(25), 15, `v${variant} length`); near(size(m.all, 0), inch(27), 12, `v${variant} width`);
    near(size(m.boxes.get('1.9 in handle')!, 2), inch(1.9), .3, 'handle diameter');
  }
  const validate = BOS_Y_DIP.mount.validate!, rack = createAssembly().rack;
  assert.throws(() => validate(rack, { variant: 0 }), /2\.3 in/); validate(rack, { variant: 2 });
  assert.throws(() => validate({ ...rack, tube: 50.8 }, { variant: 1 }), /3x3/);
  assert.equal(BOS_Y_DIP.autoFit!({ ...rack, holeDiameter: 15.875 }).variant, 1);
});
test('Swan Neck: 380 mm tall, 280 mm reach, four-station M24 bracket; refuses 5/8 in racks', () => {
  const m = measure(FRINGE_SWAN_NECK), plate = m.boxes.get('Wall plate')!;
  near(m.boxes.get('Post')!.max[1] - F, 280, .5, 'box and post reach');
  near(m.boxes.get('Slotted hook tab')!.max[2] - m.boxes.get('Hinge leaves')!.min[2], 380, .5, 'height');
  near(size(plate, 2) - 76, 200, .5, 'bolt span: four 50 mm stations');
  assert.ok(measure(FRINGE_SWAN_NECK, { magpin: 1 }).boxes.get('Fringe magpin knob'));
  const pr4000 = applyPreset('rep-pr-4000-four-2362.2-762');
  assert.match(suggestPlacement(pr4000, FRINGE_SWAN_NECK.id).reason, /bore/);
});
test('landmine sleeves: published lengths and 2 in bores; angle and side pose the sleeve in the face plane', () => {
  for (const [part, name, length] of [[ROGUE_LANDMINE, '7-gauge steel landmine sleeve', inch(10)], [ROGUE_MONSTER_LANDMINE, 'DOM pivot sleeve', inch(10)], [BOS_LANDMINE, 'Landmine sleeve', inch(11)], [REP_LANDMINE, 'Landmine sleeve', inch(11)], [REP_KLEVA_ADROIT, 'Slotted sleeve', inch(6.9)]] as const) {
    const flat = measure(part, { angle: 0 }), sleeve = flat.boxes.get(name) ?? flat.boxes.get(name === 'DOM pivot sleeve' ? 'DOM steel pivot sleeve' : name)!;
    const axis = part === REP_LANDMINE ? 1 : 0;
    near(size(sleeve, axis), length, .5, `${part.id} sleeve length`);
    assert.ok(size(sleeve, 2) > inch(2) + 5, `${part.id} takes a 2 in sleeve`);
    const up = measure(part, { angle: 30 }).boxes.get(name) ?? measure(part, { angle: 30 }).boxes.get('DOM steel pivot sleeve')!;
    assert.ok(up.max[2] > sleeve.max[2] + 100, `${part.id}: the 30° sleeve rises`);
  }
  const right = measure(ROGUE_MONSTER_LANDMINE, { side: 0 }), left = measure(ROGUE_MONSTER_LANDMINE, { side: 1 });
  assert.ok(right.all.min[0] < -300 && left.all.max[0] > 300, 'side 0 points toward local -X, side 1 toward +X');
  near(left.all.max[0], -right.all.min[0], .01, 'mirror image');
});
test('Adroit: 11.75 in stowed height and 3.5 in extension, magnet puck on its own hole, 1 in adapter', () => {
  const stowed = measure(REP_KLEVA_ADROIT, { angle: 90 }), sleeve = stowed.boxes.get('Slotted sleeve')!;
  near(sleeve.max[2] - stowed.boxes.get('Pivot boss')!.min[2], ADROIT.height, 20, 'attachment height');
  near(sleeve.max[1] - F, ADROIT.extension, 8, 'extension from the upright');
  const puck = stowed.boxes.get('Magnet mount puck')!;
  assert.ok(stowed.boxes.get('Magnet face')!.max[1] >= sleeve.min[1] - .5 && puck.min[2] < sleeve.max[2] && puck.max[2] > sleeve.min[2], 'stowed sleeve rests on the magnet');
  assert.deepEqual(rackHoles(REP_KLEVA_ADROIT, { ...REP_KLEVA_ADROIT.defaults, mountSpacing: 50 }), [0, 4]);
  assert.deepEqual(rackHoles(KLEVA_ADROIT_2, { ...KLEVA_ADROIT_2.defaults, magnet: 0 }), [0]);
  assert.ok(!measure(KLEVA_ADROIT_2, { magnet: 0 }).boxes.get('Magnet mount puck'));
  assert.ok(measure(REP_KLEVA_ADROIT, { hardware: 1 }).boxes.get('1 in adapter sleeve'));
  assert.ok(measure(REP_KLEVA_ADROIT).boxes.get('Clevis star knob') && measure(KLEVA_ADROIT_2).boxes.get('Clevis bolt head'), 'REP star knob vs Kleva hex bolt');
});
test('brand parts fit the racks they are sold for: bore, post size and hardware autoFit', () => {
  const monster = applyPreset('rogue-rm-monster-2-four-2295.525-1092.2'), lite = applyPreset('rogue-rml-3-four-2295.525-762'), r3 = applyPreset('rogue-r3-four-2295.525-762');
  const pr4000 = applyPreset('rep-pr-4000-four-2362.2-762'), manticore = applyPreset('bos-manticore-six-2286-1092.2'), hydra = applyPreset('bos-hydra-four-2133.6-762');
  const place = (doc: typeof monster, id: string) => suggestPlacement(doc, id as Parameters<typeof suggestPlacement>[1]);
  const params = (doc: typeof monster, id: string) => { const r = place(doc, id); assert.ok(r.proposal, `${id}: ${r.reason}`); return r.proposal!.doc.accessories.at(-1)!.params; };
  // Rogue: Monster parts on 1 in holes, Monster Lite parts on 5/8 in holes.
  params(monster, ROGUE_MONSTER_LANDMINE.id); params(monster, MUTANT_UDA.id);
  assert.match(place(lite, ROGUE_MONSTER_LANDMINE.id).reason, /bore/);
  assert.equal(params(lite, MUTANT_UDA.id).hardware, 1, 'UDA picks the 5/8 in detent pin on Monster Lite');
  assert.equal(params(lite, ROGUE_MATADOR.id).pin ?? 0, 0); assert.equal(params(monster, ROGUE_MATADOR.id).pin, 1);
  assert.equal(params(lite, ROGUE_LANDMINE.id).hardware, 1, 'band peg and collar on 3x3 Monster Lite');
  assert.equal(params(r3, ROGUE_LANDMINE.id).hardware, 0, '6 in bolt on 2x3 posts');
  assert.match(place(r3, MUTANT_UDA.id).reason, /3x3/);
  // REP and BOS series follow the bore.
  assert.equal(params(pr4000, REP_LANDMINE.id).series, 0); assert.equal(params(pr4000, REP_DIP_STATION.id).series, 0);
  assert.equal(params(pr4000, REP_KLEVA_ADROIT.id).hardware, 0, 'Adroit drops its 1 in adapter on 5/8 in holes');
  assert.equal(params(manticore, BOS_LANDMINE.id).variant, 1); assert.equal(params(hydra, BOS_LANDMINE.id).variant ?? 0, 0);
  assert.equal(params(manticore, BOS_Y_DIP.id).variant ?? 2, 2); assert.equal(params(hydra, BOS_Y_DIP.id).variant, 1);
});
