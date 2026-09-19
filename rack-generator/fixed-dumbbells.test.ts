import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, CAP_RUBBER_HEX, CAP_CAST_HEX, REP_HEX_DB, ROGUE_RUBBER_HEX, ROGUE_URETHANE, REP_URETHANE, ROGUE_FATBELL, ROGUE_DB15, TITAN_LOADABLE, STRENGTH_CO_LOADABLE,
  CAP_OLYMPIC_HANDLE, AMAZON_NEOPRENE, YORK_LEGACY, YORK_BUNS_GLOBES, TROY_PRO_STYLE, IVANKO_FIXED, BODY_SOLID_HEX, AMAZON_RUBBER_HEX, YORK_ROUNDHEAD,
  dumbbellEnvelope, dumbbellShape, loadablePlates, loadableLoads, type LoadableShape, type ProShape,
} from './floor-parts/fixed-dumbbells.ts';
import { buildDumbbellPart, definitions } from './parts/fixed-dumbbells.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import { addFloorItem } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import type { FloorPart } from './floor-part.ts';
import type { NumericParams, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
type Box = { min: number[]; max: number[] };
const bounds = (parts: SolidPart[], match?: (name: string) => boolean): Box | undefined => {
  const s = parts.filter(p => !match || match(p.name)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const size = (b: Box, i: number) => b.max[i] - b.min[i];
function build(part: FloorPart, params: NumericParams) { return buildDumbbellPart(part.id)(api, { ...part.defaults, ...params }); }
function withParts<T>(part: FloorPart, params: NumericParams, run: (parts: SolidPart[]) => T): T {
  const parts = build(part, params); try { return run(parts); } finally { parts.forEach(p => p.solid.delete()); }
}
const near = (actual: number, expected: number, tol: number, label: string) => assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tol}`);
/** First, middle and last value of every param (dependent options resolved against the defaults). */
function variants(part: FloorPart): NumericParams[] {
  const out: NumericParams[] = [part.defaults];
  for (const p of part.params) {
    const opts = floorOptions(p, part.defaults);
    for (const v of [opts[0], opts[opts.length >> 1], opts.at(-1)!]) out.push(coerceFloorParams(part, { ...part.defaults, [p.key]: v }));
  }
  return out;
}
test('nineteen catalogue entries, all in the Dumbbells section with attribution and a registered builder', () => {
  assert.equal(PARTS.length, 19);
  assert.equal(new Set(PARTS.map(p => p.id)).size, 19);
  for (const part of PARTS) {
    assert.equal(part.section, 'Dumbbells', part.id);
    assert.ok(part.vendor?.vendor && part.vendor.url.startsWith('https://') && part.vendor.trademark && part.vendor.reconstruction, part.id);
    assert.match(part.description ?? '', /Independent reconstruction.*trademarks belong to/, part.id);
    assert.ok(definitions.some(d => d.id === part.id && d.category === 'Dumbbells'), part.id);
    assert.deepEqual(part.pair, { gap: 60 });
  }
});
test('every entry builds valid closed solids at the first, middle and last value of each param, filling its footprint', () => {
  for (const part of PARTS) for (const params of variants(part)) {
    const t0 = performance.now();
    withParts(part, params, parts => {
      const label = `${part.id} ${JSON.stringify(params)}`;
      assert.ok(parts.length >= 1, label);
      for (const p of parts) {
        assert.ok(!p.solid.isEmpty() && p.solid.status() === 'NoError' && p.solid.volume() > 0, `${label} ${p.name}`);
        assert.notEqual(p.role, 'frame', `${label} ${p.name}: factory colours, not rack paint`);
      }
      const b = bounds(parts)!, fp = resolveBy(part.footprint, params);
      near(size(b, 0), fp.width, .05, `${label} width`); near(size(b, 1), fp.depth, .05, `${label} depth`);
      near(b.min[2], 0, .05, `${label} rests on the floor`);
      near((b.min[0] + b.max[0]) / 2, 0, .05, `${label} centred X`); near((b.min[1] + b.max[1]) / 2, 0, .05, `${label} centred Y`);
      assert.ok(parts.reduce((n, p) => n + p.solid.numTri(), 0) < 80000, `${label} triangle budget`);
    });
    assert.ok(performance.now() - t0 < 4000, `${part.id} build time`);
  }
});
test('hex heads match the published per-weight length, corners and flats', () => {
  // CAP rubber hex: Walmart L × corners × flats; CAP 15 lb end-view graphic 3.94" flats × 4.53" corners, 11.34" long.
  for (const [lb, L, corners, flats] of [[15, 11.34, 4.53, 3.94], [40, 13.62, 6.38, 5.51], [80, 16.10, 8.20, 7.10]] as const) withParts(CAP_RUBBER_HEX, { weight: lb }, parts => {
    const b = bounds(parts)!; near(size(b, 1), inch(L), 2, `CAP ${lb} length`); near(size(b, 0), inch(corners), 3, `CAP ${lb} corners`); near(size(b, 2), inch(flats), 2, `CAP ${lb} flats`);
  });
  // CAP cast iron hex dimension graphics: 5 lb 8.58" × 2.64", 120 lb 16.14" × 8.43".
  for (const [lb, L, corners] of [[5, 8.58, 2.64], [120, 16.14, 8.43]] as const) withParts(CAP_CAST_HEX, { weight: lb }, parts => {
    const b = bounds(parts, n => !n.includes('numerals'))!; near(size(b, 1), inch(L), 2, `CAP iron ${lb} length`); near(size(b, 0), inch(corners), 3, `CAP iron ${lb} corners`);
  });
  // REP: 5.2" grip on every weight, 28 mm handle to 15 lb and 34 mm above.
  for (const [lb, d] of [[15, 28], [20, 34], [125, 34]] as const) {
    const s = dumbbellShape(REP_HEX_DB.id, { weight: lb }); assert.equal(s.kind, 'hex');
    if (s.kind === 'hex') { near(s.grip, inch(5.2), 1, 'REP grip'); assert.equal(s.handle.d, d); }
    withParts(REP_HEX_DB, { weight: lb }, parts => near(size(bounds(parts, n => n.includes('knurl'))!, 2), d + .7, .3, `REP ${lb} handle`));
  }
  // Rogue: 25 mm handle to 10 lb, 35 mm from 12.5 lb; Body-Solid heads 2" (3 lb) … 8" (100 lb) across corners; Amazon 10 lb 27.5 × 10.5 × 8.9 cm.
  for (const [lb, d] of [[10, 25], [12.5, 35]] as const) { const s = dumbbellShape(ROGUE_RUBBER_HEX.id, { weight: lb }); assert.ok(s.kind === 'hex' && s.handle.d === d); }
  for (const [lb, corners] of [[3, 2], [40, 5.75], [100, 8]] as const) near(dumbbellEnvelope(dumbbellShape(BODY_SOLID_HEX.id, { weight: lb })).width, inch(corners), 3, `Body-Solid ${lb}`);
  const ab = dumbbellEnvelope(dumbbellShape(AMAZON_RUBBER_HEX.id, { weight: 10 })); near(ab.depth, 275, 4, 'Amazon 10 lb length'); near(ab.width, inch(4), 3, 'Amazon 10 lb corners'); near(ab.height, 89, 1, 'Amazon 10 lb flats');
});
test('heads grow with weight on every fixed dumbbell', () => {
  for (const part of PARTS.filter(p => p.params.some(q => q.key === 'weight'))) {
    const weights = floorOptions(part.params.find(q => q.key === 'weight')!, part.defaults), env = (lb: number) => dumbbellEnvelope(dumbbellShape(part.id, { ...part.defaults, weight: lb }));
    const first = env(weights[0]), last = env(weights.at(-1)!);
    assert.ok(last.width > first.width * 1.3 && last.depth > first.depth, `${part.id} grows from ${weights[0]} to ${weights.at(-1)} lb`);
  }
  // Pro-style heads add plates as the weight climbs.
  const plates = (lb: number) => (dumbbellShape(TROY_PRO_STYLE.id, { ...TROY_PRO_STYLE.defaults, weight: lb }) as ProShape).plates;
  assert.ok(plates(10) === 1 && plates(50) >= 2 && plates(150) > plates(85));
});
test('round heads follow the published diameters', () => {
  for (const [lb, D, d] of [[5, 127, 31], [30, 153, 31], [45, 173, 31], [50, 193, 34], [150, 204, 34]] as const) withParts(ROGUE_URETHANE, { weight: lb }, parts => {
    const b = bounds(parts)!; near(size(b, 2), D, .6, `Rogue urethane ${lb} Ø`); near(size(bounds(parts, n => n.includes('knurl'))!, 2), d + .7, .3, `Rogue urethane ${lb} handle`);
  });
  near(dumbbellEnvelope(dumbbellShape(REP_URETHANE.id, { weight: 50 })).width, 193, .5, 'REP urethane 50 lb');
  for (const [lb, D] of [[9, 161], [53, 221], [150, 286]] as const) withParts(ROGUE_FATBELL, { weight: lb }, parts => {
    const b = bounds(parts)!; near(size(b, 0), D, .5, `Fatbell ${lb} width`); near(size(b, 1), D, .5, `Fatbell ${lb} depth`);
    assert.ok(parts.some(p => p.name === 'Colour-coded weight stripe'));
    near(size(bounds(parts, n => n.startsWith('Ergo handle'))!, 2), lb <= 18 ? 32 : lb <= 88 ? 37 : 40, .3, `Fatbell ${lb} handle`);
  });
  withParts(YORK_LEGACY, { weight: 25 }, parts => near(size(bounds(parts, n => n.includes('knurl'))!, 2), 33.7, .3, 'York Legacy 33 mm handle'));
  for (const [handle, d] of [[0, 27], [1, 32]] as const) assert.equal((dumbbellShape(TROY_PRO_STYLE.id, { ...TROY_PRO_STYLE.defaults, handle }) as ProShape).handle.d, d);
  assert.equal((dumbbellShape(IVANKO_FIXED.id, IVANKO_FIXED.defaults) as ProShape).handle.d, 30);
});
test('York vintage sets switch head style with the documented weight runs', () => {
  const style = (lb: number) => { const s = dumbbellShape(YORK_BUNS_GLOBES.id, { weight: lb }); return s.kind === 'cast' ? `${s.style}/${s.handle.style}` : ''; };
  assert.equal(style(1), 'bun/cast'); assert.equal(style(12), 'bun/cast'); assert.equal(style(15), 'bun/straight'); assert.equal(style(45), 'bun/straight'); assert.equal(style(50), 'globe/straight'); assert.equal(style(100), 'globe/straight');
  assert.deepEqual(floorOptions(YORK_BUNS_GLOBES.params[0], YORK_BUNS_GLOBES.defaults).slice(0, 12), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]);
  const bar = dumbbellShape(YORK_BUNS_GLOBES.id, { weight: 60 }); assert.ok(bar.kind === 'cast' && bar.handle.d === 25.4 && Math.abs(bar.grip - 127) < 1, '1" smooth bar, ≈5" handle');
  assert.equal(floorOptions(YORK_ROUNDHEAD.params[0], YORK_ROUNDHEAD.defaults).at(-1), 100);
});
test('loadable handles match their published lengths and carry plates that fit the sleeve', () => {
  const sleeves = (parts: SolidPart[]) => bounds(parts, n => n.endsWith('· sleeves'))!;
  withParts(ROGUE_DB15, { load: 0 }, parts => { near(size(bounds(parts)!, 1), inch(20.5), .5, 'DB-15 length'); near(bounds(parts)!.max[1] - sleeves(parts).max[1], 0, .01, 'DB-15 sleeve runs to the end'); });
  withParts(ROGUE_DB15, { model: 1, load: 0 }, parts => near(size(bounds(parts)!, 1), inch(14.25), .5, 'DB-10 length'));
  for (const [part, length, sleeve] of [[ROGUE_DB15, 20.5, 6.75], [TITAN_LOADABLE, 20, 6.5], [STRENGTH_CO_LOADABLE, 18.75, 5.75], [CAP_OLYMPIC_HANDLE, 20, 6.5]] as const) {
    const s = dumbbellShape(part.id, { ...part.defaults, load: 0 }) as LoadableShape;
    near(s.length, inch(length), .1, `${part.id} length`); near(s.sleeve, inch(sleeve), .1, `${part.id} sleeve`);
    near(s.length - 2 * s.sleeve - 2 * (s.flange.w + (s.flange.step?.w ?? 0)), s.grip, .01, `${part.id} grip`);
  }
  near((dumbbellShape(TITAN_LOADABLE.id, { load: 0 }) as LoadableShape).grip, inch(5.75), .1, 'Titan 5.75" grip');
  near((dumbbellShape(STRENGTH_CO_LOADABLE.id, { load: 0 }) as LoadableShape).grip, inch(6), .1, 'Strength Co 6" between sleeves');
  assert.deepEqual(loadablePlates(37.5).map(p => p.lb), [25, 10, 2.5]);
  assert.deepEqual(loadablePlates(0), []);
  for (const part of [ROGUE_DB15, TITAN_LOADABLE, STRENGTH_CO_LOADABLE, CAP_OLYMPIC_HANDLE]) {
    const loads = floorOptions(part.params.find(p => p.key === 'load')!, part.defaults);
    assert.equal(loads[0], 0); assert.ok(loads.at(-1)! >= 60, part.id);
    withParts(part, { load: loads.at(-1)! }, parts => {
      const plates = bounds(parts, n => n === 'Iron Olympic plates')!, s = sleeves(parts);
      assert.ok(plates.max[1] <= s.max[1] + 1e-6 && plates.min[1] >= s.min[1] - 1e-6, `${part.id} plates stay on the sleeves`);
      near(size(plates, 2), 300, .5, `${part.id} 25 lb plates are 300 mm`);
    });
  }
  // Collars take sleeve space: fewer loads fit with OSO collars fitted.
  assert.ok(loadableLoads(inch(6.75), 42).length < loadableLoads(inch(6.75)).length);
  assert.deepEqual(coerceFloorParams(ROGUE_DB15, { model: 1, load: 100 }).load, floorOptions(ROGUE_DB15.params[3], { ...ROGUE_DB15.defaults, model: 1 }).at(-1), 'switching to DB-10 snaps the load onto its short sleeves');
});
test('neoprene hand weights follow Amazon sizes and colours per weight', () => {
  const e = dumbbellEnvelope(dumbbellShape(AMAZON_NEOPRENE.id, { weight: 10 }));
  near(e.depth, inch(8.6), .5, 'neoprene 10 lb length');
  near(dumbbellEnvelope(dumbbellShape(AMAZON_NEOPRENE.id, { weight: 20 })).depth, inch(10), .5, 'neoprene 20 lb length');
  const colour = (lb: number) => withParts(AMAZON_NEOPRENE, { weight: lb }, parts => parts.find(p => p.name.includes('neoprene-coated'))!.color);
  assert.notEqual(colour(3), colour(5)); assert.equal(colour(10), '#2c4c9e');
});
test('params validate strictly, coerce in order, and dumbbells add as a pair side by side', () => {
  for (const part of PARTS) assert.deepEqual(validateFloorParams(part, {}), part.defaults, part.id);
  assert.deepEqual(validateFloorParams(REP_HEX_DB, { weight: 2.5 }), { weight: 2.5 });
  for (const bad of [{ weight: 7 }, { weight: 130 }, { colour: 1 }]) assert.throws(() => validateFloorParams(REP_HEX_DB, bad), /dumbbell/);
  assert.throws(() => validateFloorParams(ROGUE_FATBELL, { weight: 50 }), /fatbell/);
  assert.throws(() => validateFloorParams(TROY_PRO_STYLE, { finish: 3 }), /dumbbell/);
  assert.deepEqual(coerceFloorParams(REP_URETHANE, { weight: 52 }), { weight: 50 });
  const doc = addFloorItem(createAssembly(), 'rep-hex-dumbbell', undefined, true), [a, b] = doc.floorItems!;
  const { width } = resolveBy(REP_HEX_DB.footprint, REP_HEX_DB.defaults);
  near(b.position[0] - a.position[0], width + 60, 1e-9, 'pair gap'); near(b.position[1] - a.position[1], 0, 1e-9, 'pair aligned');
});
