import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, BOS_CABLE_TOWER, BOS_TOWER_DIMS, TOG_MULTI_FLIGHT, TOG_FLIGHT_DIMS, togFlightWeights, TITAN_PLATE_LAT, TITAN_PLATE_LAT_DIMS, TITAN_LAT_TOWER, TITAN_LAT_DIMS,
  REP_ARCADIA, REP_ARCADIA_DIMS, TITAN_PULLEY_TOWER, INSPIRE_FTX, INSPIRE_FTX_DIMS, BOS_LAT_PULLDOWN, BOS_LAT_DIMS, bosTowerWeights, inch,
  REP_ADONIS, REP_ADONIS_DIMS, FORCE_FTR, FORCE_FTR_DIMS, FORCE_FTR_ARM_REACH, MAJOR_B52, MAJOR_B52_DIMS,
} from './floor-parts/cable-towers.ts';
import { definitions } from './parts/cable-towers.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import { addFloorItem, floorWarnings } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import type { FloorPart } from './floor-part.ts';
import type { NumericParams, SolidPart } from './types.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
const api = await Module(); api.setup();
type Box = { min: number[]; max: number[] };
const bounds = (parts: SolidPart[], match?: (name: string) => boolean): Box | undefined => {
  const s = parts.filter(p => !match || match(p.name)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tol: number, label: string) => assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tol}`);
const builder = (part: FloorPart) => definitions.find(d => d.id === part.id)!.build;
function withParts<T>(part: FloorPart, params: NumericParams, run: (parts: SolidPart[]) => T): T {
  const parts = builder(part)(api, coerceFloorParams(part, { ...part.defaults, ...params }));
  try { return run(parts); } finally { parts.forEach(p => p.solid.delete()); }
}
/** Defaults plus the first, middle and last value of every param (dependent options resolved after each change). */
function variants(part: FloorPart): NumericParams[] {
  const out: NumericParams[] = [part.defaults];
  for (const p of part.params) {
    const opts = floorOptions(p, part.defaults);
    const picks = [...new Set([opts[0], opts[opts.length >> 1], opts.at(-1)!])];
    for (const v of picks) out.push(coerceFloorParams(part, { ...part.defaults, [p.key]: v }));
    // Dependent params (pin, loaded): also exercise their last option under the picked values of the other params.
    for (const v of picks) for (const q of part.params) if (q !== p && typeof q.options === 'function') {
      const base = coerceFloorParams(part, { ...part.defaults, [p.key]: v }), qo = floorOptions(q, base);
      out.push(coerceFloorParams(part, { ...base, [q.key]: qo.at(-1)! }));
    }
  }
  return out;
}
test('catalogue entries in the Machines section with attribution and a registered builder', () => {
  assert.equal(PARTS.length, 11);
  assert.equal(new Set(PARTS.map(p => p.id)).size, PARTS.length);
  for (const part of PARTS) {
    assert.equal(part.section, 'Machines', part.id);
    assert.ok(part.vendor?.vendor && part.vendor.url.startsWith('https://') && part.vendor.trademark && part.vendor.reconstruction, part.id);
    assert.match(part.description ?? '', /Independent reconstruction.*trademarks belong to/, part.id);
    assert.ok(definitions.some(d => d.id === part.id && d.category === 'Machines'), part.id);
  }
});
test('every entry builds valid closed solids across its params, filling its footprint on the floor', () => {
  for (const part of PARTS) for (const params of variants(part)) {
    const t0 = performance.now();
    withParts(part, params, parts => {
      const label = `${part.id} ${JSON.stringify(params)}`;
      for (const p of parts) {
        assert.ok(!p.solid.isEmpty() && p.solid.status() === 'NoError' && p.solid.volume() > 0, `${label} ${p.name}`);
        assert.notEqual(p.role, 'frame', `${label} ${p.name}: factory colours, not rack paint`);
      }
      const b = bounds(parts)!, fp = resolveBy(part.footprint, params), [ox, oz] = fp.offset ?? [0, 0];
      near(size(b, 0), fp.width, .5, `${label} width`); near(size(b, 1), fp.depth, .5, `${label} depth`);
      // Floor Z is build -Y: the footprint centre sits at build (ox, -oz).
      near((b.min[0] + b.max[0]) / 2, ox, .5, `${label} centre X`); near((b.min[1] + b.max[1]) / 2, -oz, .5, `${label} centre Y`);
      assert.ok(b.min[2] >= -1e-3, `${label} rests on the floor`);
      assert.ok(parts.reduce((n, p) => n + p.solid.numTri(), 0) < 80000, `${label} triangle budget`);
    });
    assert.ok(performance.now() - t0 < BUILD_BUDGET_MS, `${part.id} build time`);
  }
});
test('published heights and envelopes come out of the builds', () => {
  const height = (part: FloorPart, params: NumericParams = {}) => withParts(part, params, parts => size(bounds(parts)!, 2));
  near(height(BOS_CABLE_TOWER), BOS_TOWER_DIMS.height, 1, 'BoS Cable Tower 2051 mm');
  near(height(TOG_MULTI_FLIGHT), TOG_FLIGHT_DIMS.height, 1, 'Multi-Flight 76.4"');
  near(height(TITAN_PLATE_LAT), TITAN_PLATE_LAT_DIMS.height, 1, 'Titan plate-loaded lat 85"');
  near(height(TITAN_LAT_TOWER), TITAN_LAT_DIMS.height, 1, 'Titan lat tower 87"');
  near(height(BOS_LAT_PULLDOWN), BOS_LAT_DIMS.height, 1, 'BoS lat 87"');
  near(height(TITAN_PULLEY_TOWER, { height: 0 }), inch(80.5), 1, 'Titan pulley tower short 80.5"');
  near(height(TITAN_PULLEY_TOWER, { height: 1 }), inch(84.5), 1, 'Titan pulley tower tall 84.5"');
  near(height(REP_ARCADIA, { bar: 0 }), REP_ARCADIA_DIMS.height, 1, 'Arcadia 80.8"');
  near(height(REP_ARCADIA, { bar: 1 }), REP_ARCADIA_DIMS.invertedHeight, 1, 'Arcadia inverted bar 78"');
  near(height(INSPIRE_FTX), INSPIRE_FTX_DIMS.height, 1, 'FTX 82"');
  near(height(REP_ADONIS), REP_ADONIS_DIMS.height, 1, 'Adonis 92.1"');
  near(height(FORCE_FTR), FORCE_FTR_DIMS.height, 1, 'FTR 87"');
  near(height(MAJOR_B52), MAJOR_B52_DIMS.height, 1, 'B52 82.6"');
  // Footprints: published width × depth where the model spans them (lat towers add the 48" bar across).
  for (const [part, w, d] of [[TOG_MULTI_FLIGHT, inch(44.7), 690], [TITAN_LAT_TOWER, inch(48), inch(57)], [BOS_LAT_PULLDOWN, inch(48), inch(70)], [TITAN_PULLEY_TOWER, inch(25), inch(27.5)],
    [REP_ARCADIA, inch(55.3), inch(35.8)], [INSPIRE_FTX, inch(54), inch(40)], [TITAN_PLATE_LAT, 1100, inch(57)], [REP_ADONIS, inch(45.9), inch(54.9)],
    [FORCE_FTR, inch(49) + 2 * FORCE_FTR_ARM_REACH, inch(43)], [MAJOR_B52, inch(78.7), inch(66.9)]] as const) {
    const fp = resolveBy(part.footprint, { ...part.defaults, loaded: 0 });
    near(fp.width, w, inch(54) * .002, `${part.id} width`); near(fp.depth, d, inch(40) * .002, `${part.id} depth`);
  }
  // Adonis base rails and the FTR frame span their published widths; the FTR freestyle arms reach past it.
  withParts(REP_ADONIS, { base: 1 }, parts => near(size(bounds(parts)!, 0), REP_ADONIS_DIMS.baseWidth, .5, 'Adonis base 45.9"'));
  near(resolveBy(REP_ADONIS.footprint, { ...REP_ADONIS.defaults, base: 0 }).width, REP_ADONIS_DIMS.latBar, .01, 'Adonis without base: lat bar is widest');
  withParts(FORCE_FTR, {}, parts => near(size(bounds(parts, n => n === 'Matte black electrostatic paint')!, 1), inch(43), .5, 'FTR 43" deep'));
  // BoS Cable Tower: 737 mm feet, 724 mm base spine+feet run, 787 mm header incl. the top pulley cheeks.
  withParts(BOS_CABLE_TOWER, {}, parts => {
    const frame = bounds(parts, n => n === 'Black powder-coated steel')!;
    near(size(frame, 0), BOS_TOWER_DIMS.feet, .5, 'BoS feet 737 mm');
  });
});
test('selector pins, carriages and thigh pads move with their params', () => {
  const box = (part: FloorPart, params: NumericParams, match: (n: string) => boolean) => withParts(part, params, parts => bounds(parts, match));
  // Pin at the head plate sits above the pin under the bottom plate.
  for (const [part, lo, hi, extra] of [[BOS_CABLE_TOWER, 10, 210, {}], [TOG_MULTI_FLIGHT, 11, 220, {}], [TITAN_LAT_TOWER, 10, 300, {}], [BOS_LAT_PULLDOWN, 10, 310, {}], [INSPIRE_FTX, 15, 165, {}],
    [REP_ARCADIA, 20, 170, {}], [REP_ADONIS, 10, 210, { loading: 1 }], [FORCE_FTR, 10, 200, {}], [MAJOR_B52, 10, 170, { model: 1 }]] as const) {
    const a = box(part, { ...extra, pin: lo }, n => n === 'Selector pin knob')!, b = box(part, { ...extra, pin: hi }, n => n === 'Selector pin knob')!;
    assert.ok(a.min[2] > b.min[2] + 100, `${part.id} pin travels down the stack`);
  }
  assert.equal(bosTowerWeights({ loading: 0 }).length, 21); assert.equal(bosTowerWeights({ loading: 1 }).at(-1), 110);
  assert.equal(togFlightWeights.length, 20, '11 lb head + 19 plates to 220 lb');
  // Carriage heights: BoS 2" pitch (32 steps between holes 1 and 33), Titan pulley 18 positions, Multi-Flight 1" steps.
  const uhmw = (p: NumericParams) => box(BOS_CABLE_TOWER, p, n => n === 'Black UHMW liners')!.min[2];
  near(uhmw({ carriage: 33 }) - uhmw({ carriage: 1 }), 32 * inch(2), .5, 'BoS carriage travel');
  const knob = (p: NumericParams) => box(TITAN_PULLEY_TOWER, p, n => n === 'Black knob')!.min[2];
  assert.ok(knob({ carriage: 18 }) - knob({ carriage: 1 }) > 1200, 'Titan pulley tower trolley travel');
  const dial = (p: NumericParams) => box(TOG_MULTI_FLIGHT, p, n => n === 'White dial rings')!.max[2];
  assert.ok(dial({ carriage: 1 }) - dial({ carriage: 30 }) > inch(28), 'Multi-Flight slides down 29" from position 1 to 30');
  const roller = (part: FloorPart, p: NumericParams) => box(part, p, n => n === 'Black vinyl upholstery')!.max[2];
  assert.ok(roller(TITAN_LAT_TOWER, { thigh: 6 }) > roller(TITAN_LAT_TOWER, { thigh: 1 }) + 150, 'Titan thigh pad adjusts');
  // Arcadia trolleys follow the published 13"–68" range.
  const trolley = (p: NumericParams) => box(REP_ARCADIA, p, n => n === 'Knurled grips')!;
  assert.ok(trolley({ left: 32, right: 32 }).min[2] - trolley({ left: 1, right: 1 }).min[2] > inch(68 - 13) - 5, 'Arcadia trolley range');
});
test('plate-loaded carriages carry the selected 45 lb plates', () => {
  const plates = (part: FloorPart, params: NumericParams) => withParts(part, params, parts => parts.filter(p => p.name === 'Loaded plates · 45 lb').map(p => bounds([p])!));
  assert.equal(plates(BOS_CABLE_TOWER, { loading: 2, loaded: 0 }).length, 0);
  const bos = plates(BOS_CABLE_TOWER, { loading: 2, loaded: 5 })[0];
  near(size(bos, 2), 448, 1, 'BoS horn plates are Ø448 45s');
  assert.deepEqual(validateFloorParams(BOS_CABLE_TOWER, { loading: 2, pin: 0, loaded: 5 }), { ...BOS_CABLE_TOWER.defaults, loading: 2, pin: 0, loaded: 5 });
  assert.throws(() => validateFloorParams(BOS_CABLE_TOWER, { loading: 0, loaded: 3 }), /cable tower/, 'stack towers carry no plates');
  // Titan plate-loaded: one 13" sleeve, the footprint grows backwards once the Ø448 plates overhang the rear tube.
  const titan = plates(TITAN_PLATE_LAT, { loaded: 8 })[0];
  assert.ok(size(titan, 0) <= TITAN_PLATE_LAT_DIMS.sleeve + 1, 'eight 45s fit the 13" sleeve');
  const fp0 = resolveBy(TITAN_PLATE_LAT.footprint, { ...TITAN_PLATE_LAT.defaults, loaded: 0 }), fp8 = resolveBy(TITAN_PLATE_LAT.footprint, { ...TITAN_PLATE_LAT.defaults, loaded: 8 });
  assert.ok(fp8.depth > fp0.depth && fp8.offset![1] < 0);
  assert.equal(plates(TITAN_PULLEY_TOWER, { loaded: 7 }).length, 1);
  assert.equal(plates(BOS_LAT_PULLDOWN, { loading: 1, pin: 0, loaded: 6 }).length, 1);
  assert.equal(plates(REP_ADONIS, { loaded: 8 }).length, 1);
  assert.equal(plates(MAJOR_B52, { model: 0, loaded: 6 }).length, 1);
  assert.equal(plates(MAJOR_B52, { model: 1, pin: 100 }).length, 0, 'Pro runs on its stacks');
  // Adonis horns: 6.3" loadable each side, four 45s (1.5") per horn.
  withParts(REP_ADONIS, { loaded: 8 }, parts => {
    const horns = bounds(parts, n => n === 'Stainless loading horns')!;
    near(size(horns, 0), 2 * (REP_ADONIS_DIMS.horn + inch(1.5) + 6 + 12), 1, 'Adonis horn span: 6.3" loadable outside each shroud');
  });
});
test('lat bars and rails match the published lengths', () => {
  withParts(MAJOR_B52, {}, parts => near(size(bounds(parts, n => n === 'Stainless steel')!, 0), MAJOR_B52_DIMS.width, .5, 'B52 Smith bar sleeves set the 78.7" width'));
  for (const [part, L] of [[TITAN_LAT_TOWER, inch(48)], [BOS_LAT_PULLDOWN, inch(48)], [TITAN_PLATE_LAT, inch(37.5)]] as const) withParts(part, {}, parts => {
    const bar = bounds(parts, n => n === 'Stainless steel' || n === 'Knurled grips' || n === 'Black foam grips')!;
    near(size(bar, 0), L, 2, `${part.id} lat bar`);
  });
});
test('params validate strictly and coerce for UI edits; parts add to a document without warnings', () => {
  for (const part of PARTS) {
    assert.deepEqual(validateFloorParams(part, {}), part.defaults, part.id);
    assert.throws(() => validateFloorParams(part, { nope: 1 }), new RegExp(part.noun), part.id);
    for (const p of part.params) assert.throws(() => validateFloorParams(part, { [p.key]: 12345.5 }), new RegExp(part.noun), `${part.id} ${p.key}`);
    const doc = addFloorItem(createAssembly(), part.id);
    assert.deepEqual(floorWarnings(doc), [], part.id);
  }
  assert.deepEqual(coerceFloorParams(BOS_CABLE_TOWER, { loading: 1, pin: 200 }).pin, 110, 'switching to the mini stack snaps the pin');
  assert.deepEqual(coerceFloorParams(BOS_LAT_PULLDOWN, { loading: 1, pin: 100 }).pin, 0);
  assert.deepEqual(coerceFloorParams(REP_ARCADIA, { stack: 0, pin: 220 }).pin, 170);
});
