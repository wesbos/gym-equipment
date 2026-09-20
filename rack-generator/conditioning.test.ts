import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, TORQUE_TANK_M1, ROGUE_SLICE_SLED, ROGUE_ECHO_DOG_SLED, TITAN_PRO_SLED, ROGUE_DOG_SLED, AMAZON_BASICS_BATTLE_ROPE, REP_SLEEVE_BATTLE_ROPE,
  TITAN_BATTLE_ROPE, REP_SOFT_PLYO_BOX, TITAN_SOFT_PLYO_BOX, ROGUE_GAMES_BOX, ROGUE_PRO_JUMP_ROPE, REP_PLYO_SIZES, SLED_LOADS, TITAN_SLED,
  amazonRope, repRope, titanRope, inch, sledLoadOptions,
} from './floor-parts/conditioning.ts';
import { PRO_HANDLE, jumpRopeLayout, ropeLayout, tankLayout } from './floor-parts/conditioning-layouts.ts';
import { definitions } from './parts/conditioning.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import { addFloorItem, validateFloorItems } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import { plateStackLength } from './plates.ts';
import type { FloorPart } from './floor-part.ts';
import type { NumericParams, SolidPart } from './types.ts';
const api = await Module(); api.setup();
type Box = { min: number[]; max: number[] };
const bounds = (parts: SolidPart[], match?: (name: string) => boolean): Box | undefined => {
  const s = parts.filter(p => !match || match(p.name)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tol: number, label: string) => assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tol}`);
function withParts<T>(part: FloorPart, params: NumericParams, run: (parts: SolidPart[]) => T): T {
  const def = definitions.find(d => d.id === part.id)!, parts = def.build(api, { ...part.defaults, ...params });
  try { return run(parts); } finally { parts.forEach(p => p.solid.delete()); }
}
/** Defaults plus the first, middle and last value of every param (dependent options resolved against the defaults). */
function variants(part: FloorPart): NumericParams[] {
  const out: NumericParams[] = [part.defaults];
  for (const p of part.params) { const o = floorOptions(p, part.defaults); for (const v of [o[0], o[o.length >> 1], o.at(-1)!]) out.push(coerceFloorParams(part, { ...part.defaults, [p.key]: v })); }
  return out;
}
test('twelve Cardio entries with attribution, a registered builder and honest descriptions', () => {
  assert.equal(PARTS.length, 12); assert.equal(new Set(PARTS.map(p => p.id)).size, 12);
  for (const part of PARTS) {
    assert.equal(part.section, 'Cardio', part.id);
    assert.ok(part.vendor?.vendor && part.vendor.url.startsWith('https://') && part.vendor.trademark && /Independent Manifold reconstruction/.test(part.vendor.reconstruction), part.id);
    assert.match(part.description ?? '', /Independent reconstruction.*trademarks belong to/, part.id);
    assert.ok(definitions.some(d => d.id === part.id && d.category === 'Cardio'), part.id);
  }
});
test('every entry builds valid closed solids at the first, middle and last value of each param, filling its footprint', () => {
  for (const part of PARTS) for (const params of variants(part)) withParts(part, params, parts => {
    const label = `${part.id} ${JSON.stringify(params)}`;
    let tris = 0;
    for (const p of parts) {
      assert.ok(!p.solid.isEmpty() && p.solid.status() === 'NoError' && p.solid.volume() > 0, `${label} ${p.name}`);
      assert.notEqual(p.role, 'frame', `${label} ${p.name}: factory colours, not rack paint`);
      tris += p.solid.numTri();
    }
    assert.ok(tris < 80000, `${label}: ${tris} triangles`);
    const b = bounds(parts)!, fp = resolveBy(part.footprint, params);
    near(size(b, 0), fp.width, .05, `${label} width`); near(size(b, 1), fp.depth, .05, `${label} depth`);
    near((b.min[0] + b.max[0]) / 2, 0, .05, `${label} centred x`); near((b.min[1] + b.max[1]) / 2, 0, .05, `${label} centred y`);
    near(b.min[2], 0, .05, `${label} rests on the floor`);
  });
});
test('sleds match their published envelopes', () => {
  const env = (part: FloorPart, params: NumericParams = {}) => withParts(part, params, parts => bounds(parts)!);
  // TANK M1: 45.1" catalogue length with the bar raised, 1370 × 808 × 957 mm guide drawing with the bar forward.
  const high = env(TORQUE_TANK_M1, { bar: 0 }), low = env(TORQUE_TANK_M1, { bar: 1 });
  near(size(high, 0), 808, 1, 'TANK width'); near(size(high, 2), 957, 2, 'TANK height'); near(size(high, 1), inch(45.1), 12, 'TANK length, bar raised');
  near(size(low, 1), 1370, 5, 'TANK length, bar forward');
  const slice = env(ROGUE_SLICE_SLED); near(size(slice, 0), inch(22.75), .1, 'Slice width'); near(size(slice, 1), inch(27.5), .1, 'Slice length'); near(size(slice, 2), inch(37.25), .5, 'Slice height');
  const echo = env(ROGUE_ECHO_DOG_SLED); near(size(echo, 0), inch(25), .1, 'Echo width'); near(size(echo, 1), inch(36.5), .1, 'Echo length'); near(size(echo, 2), inch(37.5), .5, 'Echo height');
  const titan = env(TITAN_PRO_SLED); near(size(titan, 0), inch(24), .1, 'Titan width'); near(size(titan, 1), inch(40), .1, 'Titan length'); near(size(titan, 2), inch(39), .5, 'Titan height');
  const dog = env(ROGUE_DOG_SLED); near(size(dog, 0), inch(24), .1, 'Dog width'); near(size(dog, 1), inch(40), .1, 'Dog length'); near(size(dog, 2), inch(39.5), .5, 'Dog height');
  // Titan horn: 48 mm, 17" loadable above the divider disc.
  withParts(TITAN_PRO_SLED, { load: 0 }, parts => {
    const steel = parts.find(p => p.name === 'Black powder coat')!, disc = bounds(parts, n => n === 'Rubber divider disc')!;
    const cut = api.Manifold.intersection([steel.solid, api.Manifold.cube([200, 200, 2000], true).translate([0, 0, disc.max[2] + 1100])]), hb = cut.boundingBox(); cut.delete();
    near(size(hb, 0), TITAN_SLED.horn.d, .5, 'Titan horn Ø'); near(hb.max[2] - disc.max[2], inch(17) + 10, 1, 'Titan horn loadable + cap seat');
  });
});
test('plates stack on the horn, filtered to what each post holds', () => {
  const counts = (part: FloorPart, params: NumericParams) => withParts(part, params, parts => ({ plates: parts.filter(p => /^plate-\d+ /.test(p.name) && !/hub$/.test(p.name)).length, b: bounds(parts, n => n.startsWith('plate-')) }));
  assert.equal(counts(ROGUE_DOG_SLED, { load: 0 }).plates, 0);
  const three = counts(ROGUE_DOG_SLED, { load: 3 }); assert.equal(three.plates, 3);
  near(size(three.b!, 2), plateStackLength(SLED_LOADS[3].plates), .01, 'three 45s stack height');
  near(size(three.b!, 0), 448, .01, '45 lb plate Ø');
  assert.equal(counts(TITAN_PRO_SLED, { load: 10 }).plates, 3, '20/15/10 kg bumpers');
  // TANK's 164 mm horn takes four iron 45s or one bumper, not two bumpers; folding the Slice post empties it.
  assert.deepEqual(floorOptions(TORQUE_TANK_M1.params[1], TORQUE_TANK_M1.defaults), sledLoadOptions(164));
  assert.ok(floorOptions(TORQUE_TANK_M1.params[1], TORQUE_TANK_M1.defaults).includes(4) && !floorOptions(TORQUE_TANK_M1.params[1], TORQUE_TANK_M1.defaults).includes(8));
  assert.deepEqual(coerceFloorParams(ROGUE_SLICE_SLED, { post: 1, load: 3 }), { post: 1, load: 0 });
  assert.equal(counts(ROGUE_SLICE_SLED, { post: 1, load: 0 }).plates, 0);
  assert.throws(() => validateFloorParams(ROGUE_SLICE_SLED, { post: 1, load: 2 }), /sled plates on the horn/);
});
test('battle ropes keep their published length and diameter in every pose', () => {
  for (const [part, spec] of [[AMAZON_BASICS_BATTLE_ROPE, amazonRope], [REP_SLEEVE_BATTLE_ROPE, repRope], [TITAN_BATTLE_ROPE, titanRope]] as const) {
    for (const params of variants(part)) {
      const s = spec(params), lay = ropeLayout(s, params.pose);
      near(lay.length, s.L, s.L * .004, `${part.id} ${JSON.stringify(params)} length`);
      if (params.pose !== 0) near(size(lay.bounds, 2), s.handleD, .5, `${part.id} lies flat at grip height`);
    }
  }
  // Titan 50 ft × 2" is 15.24 m of 50.8 mm rope; laid out it reaches about half its length from the anchor.
  const long = titanRope({ length: 2, diameter: 1, pose: 2 }), lay = ropeLayout(long, 2);
  assert.equal(long.D, 50.8); assert.equal(long.L, 15240);
  near(size(lay.bounds, 1), long.L / 2, 400, 'laid-out reach');
  // Stacked coil: height ≈ 1.2 × width.
  const coil = ropeLayout(amazonRope({ size: 0, pose: 0 }), 0).coil!;
  assert.ok(coil.height / coil.od > 1 && coil.height / coil.od < 1.3, `coil proportions ${coil.height}/${coil.od}`);
  // REP colours map to their sleeve material.
  withParts(REP_SLEEVE_BATTLE_ROPE, { color: 1, pose: 1 }, parts => assert.ok(parts.some(p => p.name === 'Blue nylon sleeve')));
  withParts(AMAZON_BASICS_BATTLE_ROPE, { pose: 1 }, parts => assert.ok(parts.some(p => p.name === 'Yellow tracer yarn')));
});
test('3-in-1 plyo boxes stand on any face at the published sizes', () => {
  const cases: [FloorPart, readonly number[], NumericParams][] = [
    ...REP_PLYO_SIZES.map((s, size) => [REP_SOFT_PLYO_BOX, s.dims, { size }] as [FloorPart, readonly number[], NumericParams]),
    [TITAN_SOFT_PLYO_BOX, [20, 24, 30], {}], [ROGUE_GAMES_BOX, [20, 24, 30], {}],
  ];
  for (const [part, dims, base] of cases) for (const height of dims) withParts(part, { ...base, height }, parts => {
    const b = bounds(parts)!, rest = dims.filter(d => d !== height).sort((a, c) => c - a);
    near(size(b, 2), inch(height), .05, `${part.id} ${height}" height`); near(size(b, 0), inch(rest[0]), .05, `${part.id} width`); near(size(b, 1), inch(rest[1]), .05, `${part.id} depth`);
  });
  assert.deepEqual(coerceFloorParams(REP_SOFT_PLYO_BOX, { size: 0, height: 30 }), { size: 0, height: 20 }, 'switching size snaps the height');
  assert.throws(() => validateFloorParams(REP_SOFT_PLYO_BOX, { size: 0, height: 24 }), /plyo box standing height/);
});
test('Rogue PRO jump rope: 25 mm × 5.95" handles and the chosen cable length', () => {
  near(PRO_HANDLE.length, inch(5.95), .2, 'handle length'); assert.equal(PRO_HANDLE.d, 25);
  for (const length of [95, 110, 115]) for (const pose of [0, 1]) { const lay = jumpRopeLayout(length, pose); near(lay.length, inch(length), inch(length) * .03, `${length}" pose ${pose}`); }
  withParts(ROGUE_PRO_JUMP_ROPE, {}, parts => { const knurl = bounds(parts, n => n === 'Fine knurl')!; near(size(knurl, 2), 25.6, .1, 'knurl Ø'); });
});
test('TANK layout extents come from the same meshes the builder uses', () => {
  for (const bar of [0, 1]) withParts(TORQUE_TANK_M1, { bar }, parts => {
    const b = bounds(parts)!, l = tankLayout(bar).bounds;
    for (let i = 0; i < 3; i++) { near(b.min[i], l.min[i], .05, `min ${i}`); near(b.max[i], l.max[i], .05, `max ${i}`); }
  });
});
test('params validate strictly, coerce for UI edits and persist on floor items', () => {
  for (const part of PARTS) {
    assert.deepEqual(validateFloorParams(part, {}), part.defaults, part.id);
    for (const bad of [{ nope: 1 }, [], null]) assert.throws(() => validateFloorParams(part, bad), new RegExp(part.noun), part.id);
    const key = part.params[0].key; assert.throws(() => validateFloorParams(part, { [key]: 999 }), new RegExp(part.noun), part.id);
  }
  const doc = addFloorItem(createAssembly(), 'rogue-games-box'), items = [{ ...doc.floorItems![0], params: { height: 30 } }];
  assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(items))), items);
});
