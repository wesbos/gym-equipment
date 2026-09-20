import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { PARTS } from './floor-parts/strongman.ts';
import { definitions } from './parts/strongman.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams, type FloorPart } from './floor-registry.ts';
import type { NumericParams, SolidPart } from './types.ts';
import {BUILD_BUDGET_MS} from './test-budget.ts';

const api = await Module(); api.setup();
const def = (id: string) => definitions.find(d => d.id === id)!;
const bounds = (parts: SolidPart[], filter?: (p: SolidPart) => boolean) => {
  const s = parts.filter(p => !filter || filter(p)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
export const build = (id: string, params: NumericParams = {}) => {
  const part = PARTS.find(p => p.id === id)! as FloorPart, p = validateFloorParams(part, params);
  return { parts: def(id).build(api, p), p, part };
};
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
/** Defaults plus first, middle and last option of every param (dependent options resolved in order). */
function combos(part: FloorPart): NumericParams[] {
  const out: NumericParams[] = [{ ...part.defaults }];
  for (const param of part.params) for (const pickAt of ['first', 'mid', 'last'] as const) {
    const p = { ...part.defaults }, opts = floorOptions(param, p), v = pickAt === 'first' ? opts[0] : pickAt === 'mid' ? opts[opts.length >> 1] : opts.at(-1)!;
    p[param.key] = v; out.push(coerceFloorParams(part, p));
  }
  return out;
}
test('every strongman entry builds closed, bounded solids for defaults and first/middle/last params', () => {
  assert.equal(new Set(PARTS.map(p => p.id)).size, PARTS.length);
  for (const part of PARTS as readonly FloorPart[]) {
    assert.equal(part.section, 'Strongman', part.id);
    assert.match(part.description ?? '', /Independent reconstruction .*(trademarks belong to .*|no brand)\.$/, part.id);
    assert.ok(part.vendor?.url.startsWith('https://') && part.vendor.reconstruction, part.id);
    for (const p of combos(part)) {
      const t0 = performance.now(), parts = def(part.id).build(api, p), ms = performance.now() - t0, label = `${part.id} ${JSON.stringify(p)}`;
      let tris = 0;
      for (const s of parts) {
        assert.ok(!s.solid.isEmpty() && s.solid.status() === 'NoError' && s.solid.volume() > 0, `${label} ${s.name}`);
        assert.notEqual(s.role, 'frame', `${label}: fixed factory colours`);
        tris += s.solid.numTri();
      }
      const b = bounds(parts)!, box = resolveBy(part.footprint, p);
      assert.ok(Math.abs(b.max[0] - b.min[0] - box.width) < .5 && Math.abs(b.max[1] - b.min[1] - box.depth) < .5, `${label} footprint ${(b.max[0] - b.min[0]).toFixed(1)} x ${(b.max[1] - b.min[1]).toFixed(1)} vs ${box.width.toFixed(1)} x ${box.depth.toFixed(1)}`);
      assert.ok(Math.abs(b.min[2]) < 1e-6 && Math.abs(b.max[0] + b.min[0]) < .5 && Math.abs(b.max[1] + b.min[1]) < .5, `${label} sits on the floor, centred`);
      assert.ok(tris < 90000, `${label} ${tris} triangles`);
      assert.ok(ms < BUILD_BUDGET_MS, `${label} ${ms.toFixed(0)} ms`);
      if (process.env.STRONGMAN_STATS) console.log(`${label}: ${tris} tris, ${ms.toFixed(0)} ms, h ${b.max[2].toFixed(0)}`);
      free(parts);
    }
  }
});
test('params validate strictly and coerce dependent options', () => {
  for (const part of PARTS as readonly FloorPart[]) {
    assert.deepEqual(validateFloorParams(part, {}), part.defaults);
    assert.throws(() => validateFloorParams(part, { bogus: 1 }), new RegExp(part.noun));
    for (const param of part.params) assert.throws(() => validateFloorParams(part, { [param.key]: 9999 }), new RegExp(part.noun), `${part.id} ${param.key}`);
  }
  assert.throws(() => validateFloorParams(PARTS.find(p => p.id === 'rep-sandbag')!, { color: 2, size: 3 }), /sandbag size/, 'blue ships small/medium only');
  assert.throws(() => validateFloorParams(PARTS.find(p => p.id === 'freedom-strength-strongman-sandbag')!, { color: 1, size: 14 }), /sandbag size/, 'white run is 50-200 lb');
  assert.throws(() => validateFloorParams(PARTS.find(p => p.id === 'titan-circus-dumbbell')!, { bell: 0, handle: 3 }), /circus dumbbell handle/, '3" handle is 12" bells only');
  assert.deepEqual(coerceFloorParams(PARTS.find(p => p.id === 'titan-circus-dumbbell')! as FloorPart, { bell: 0, handle: 3 }).handle, 2.5);
  assert.deepEqual(coerceFloorParams(PARTS.find(p => p.id === 'titan-t3-series-yoke')! as FloorPart, { height: 72, bar: 84 }).bar, 64, 'short yoke tops out at 64"');
});
const inch = (v: number) => v * 25.4;
/** Build, measure (optionally only groups whose name matches), free. */
function measure(id: string, params: NumericParams = {}, name?: RegExp) {
  const { parts } = build(id, params), b = bounds(parts, name ? p => name.test(p.name) : undefined)!, names = parts.map(p => p.name);
  const vol = parts.reduce((s, p) => s + p.solid.volume(), 0);
  free(parts);
  return { size: [0, 1, 2].map(i => b.max[i] - b.min[i]), min: b.min, max: b.max, names, vol };
}
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(1)} vs ${b.toFixed(1)} (±${tol})`);
test('sandbags keep their published heights and diameters', () => {
  // Cerberus Dual-Ply 45 kg 21.5 cm ... 180 kg 85 cm; Rogue 400 lb 36" x 16", 25 lb 4.5" x 11.5"; Cyclone 250 lb 24.5" with an 18" top.
  near(measure('cerberus-dual-ply-sandbag', { size: 0 }).size[2], 215, 12, 'Cerberus 45 kg height');
  near(measure('cerberus-dual-ply-sandbag', { size: 7 }).size[2], 850, 20, 'Cerberus 180 kg height');
  const r400 = measure('rogue-strongman-sandbag', { size: 7 }), r25 = measure('rogue-echo-strongman-sandbag', { size: 0 });
  near(r400.size[2], inch(36), 25, 'Rogue 400 lb height'); near(r400.size[0], inch(16), 1, 'Rogue 400 lb diameter');
  near(r25.size[2], inch(4.5), 12, 'Echo 25 lb height'); near(r25.size[0], inch(11.5), 1, 'Echo 25 lb diameter');
  const cyc = measure('rogue-cyclone-strongman-sandbag', { size: 3 }), foot = measure('rogue-cyclone-strongman-sandbag', { size: 3 }, /Bag body/);
  near(cyc.size[2], inch(24.5), 20, 'Cyclone height'); assert.ok(foot.size[0] > inch(17), 'Cyclone flares to its 18" top');
  // REP: 20" small to 36" XL (plus end handles).
  near(measure('rep-sandbag', { size: 0 }).size[1], inch(20) + 30, 1, 'REP small length'); near(measure('rep-sandbag', { size: 3 }).size[1], inch(36) + 30, 1, 'REP XL length');
  // Cerberus throwing bag handle: 10.5" x 1.5" silicone.
  const handle = measure('cerberus-throwing-sandbag', { size: 2 }, /Silicone handle/);
  near(handle.size[0], inch(10.5), 14, 'throwing handle length (soft fit)'); near(handle.size[1], inch(1.5), 3, 'throwing handle diameter');
  assert.ok(measure('freedom-strength-strongman-sandbag').names.includes('Top panel'), 'red top panel');
  assert.ok(measure('bells-of-steel-fitness-sandbag').names.includes('Webbing handles'), 'three webbing handles');
});
test('stones, kegs and tyres match their published sizes', () => {
  for (const d of [10, 16, 24]) { const s = measure('diy-atlas-stone', { diameter: d }); near(s.size[2], inch(d), inch(d) * .016, `${d}" stone height (less the pour flat)`); near(s.size[0], inch(d), 1, `${d}" stone width`); }
  near(measure('diy-atlas-stone', { diameter: 16 }).vol / 1e9 * 2403 / .45359237, 180, 12, '16" stone at 150 lb/ft³');
  for (const lb of [50, 150, 400]) near(measure('diy-natural-stone', { weight: lb }).vol / 1e9 * 2650 / .45359237, lb, lb * .18, `${lb} lb granite stone`);
  const keg = measure('diy-strongman-keg', { size: 0 }); near(keg.size[2], inch(23.3), 2, 'half-barrel height'); near(keg.size[0], inch(16.1), 1, 'half-barrel diameter');
  near(measure('diy-strongman-keg', { size: 3 }).size[2], inch(13.9), 2, 'stubby height'); near(measure('diy-strongman-keg', { size: 2 }).size[0], inch(9.25), 1, 'sixtel diameter');
  const tire = measure('diy-strongman-tire', { size: 2 }); near(tire.size[0], inch(72.8), 2, '20.8-38 OD'); near(tire.size[2], inch(20.8), 15, '20.8-38 section width');
  near(measure('diy-strongman-tire', { size: 2, pose: 1 }).size[2], inch(72.8), 2, 'standing tire height');
  const hus = measure('titan-husafell-stone-carry'); near(hus.size[2], inch(30), 1, 'Husafell height'); near(hus.size[0], inch(28.5), 1, 'Husafell width'); near(hus.size[1], inch(6), 1, 'Husafell thickness');
  const plates = measure('titan-husafell-stone-carry', { load: 2 }, /plate/); assert.ok(plates.min[2] > 0 && plates.max[2] < inch(30) && plates.size[1] < inch(6), '45s nest inside the shell');
  near(measure('mike-bartos-stone-of-steel', { size: 0 }).size[2], inch(20), 2, 'Stone of Steel 20"'); near(measure('mike-bartos-stone-of-steel', { size: 1 }).size[0], inch(17), 1, 'Stone of Steel 17"');
  near(measure('diy-atlas-stone-platform', { height: 52 }).size[2], inch(52), 1, 'platform load height');
});
test('steel implements match their published drawings', () => {
  // Titan Upright Farmers: 50" x 9" x 18"; 31 mm handle at 8"/16"; Link Connector platform 32" wide (38" over the 9" feet).
  const up = measure('titan-upright-farmers-walk-handles'); near(up.size[1], inch(50), 1, 'upright length'); near(up.size[0], inch(9), 1, 'upright feet'); near(up.size[2], inch(18), 15, 'upright height');
  for (const h of [8, 16]) { const k = measure('titan-upright-farmers-walk-handles', { handle: h }, /Knurled handle/); near((k.min[2] + k.max[2]) / 2, inch(h), 1, `${h}" handle`); near(k.size[0], 31, .5, 'handle diameter'); }
  near(measure('titan-upright-farmers-walk-handles', { mode: 1 }).size[0], inch(32) + inch(6), 1, 'platform over feet');
  const link = measure('titan-upright-farmers-walk-handles', { mode: 1 }, /Link connectors/); assert.ok(link.size[0] > inch(26) && link.size[0] < inch(33), 'connectors bridge the handles');
  const posts = measure('titan-upright-farmers-walk-handles', { load: 3 }, /plate/); near(posts.min[2], inch(18) - inch(11), 1, 'plates start at the 11" sleeve');
  // Straight farmer's handles: 60" long; loaded plates lift the shaft to the plate radius.
  for (const id of ['titan-farmers-walk-handles', 'rogue-farmers-walk']) { near(measure(id).size[1], inch(60), .5, `${id} length`); near(measure(id, { load: 2 }).size[2], 448, 1, `${id} rests on its 45s`); }
  near(measure('rogue-farmers-walk', {}, /^Steel shaft$/).size[2], 48.26 + 22, .5, 'Rogue 1.5" Sch 80 shaft + collars');
  // Yokes: Titan 52" x 53", 72"/92"; Rogue 50" x 48", Y-1 72", Y-2 92".
  const t3 = measure('titan-t3-series-yoke'); near(t3.size[0], inch(52), 1, 'T-3 width'); near(t3.size[1], inch(53), 1, 'T-3 depth'); near(t3.size[2], inch(72), 6, 'T-3 short height');
  near(measure('titan-t3-series-yoke', { height: 92, bar: 80 }).size[2], inch(92), 6, 'T-3 tall height');
  const bar = measure('titan-t3-series-yoke', { bar: 60 }, /^Crossbar$/); assert.ok(bar.min[2] < inch(60) && bar.max[2] > inch(60), 'crossbar at 60"');
  const y1 = measure('rogue-y1-yoke'), y2 = measure('rogue-y2-yoke');
  near(y1.size[0], inch(50), 1, 'Y-1 width'); near(y1.size[1], inch(48), 1, 'Y-1 depth'); near(y1.size[2], inch(72), 6, 'Y-1 height'); near(y2.size[2], inch(92), 6, 'Y-2 height');
  assert.ok(y1.names.includes('J-cups') && !t3.names.includes('J-cups'), 'Rogue ships J-cups');
  assert.ok(measure('titan-t3-series-yoke', { load: 3 }).size[0] > inch(52), 'plates overhang the bases');
  // Titan logs: 71.25" / 74.4" / 80.3" overall, 7.75" / 10" / 11.3" barrels, 42 mm handles 26" apart on the 12".
  for (const [size, len, d] of [[0, 71.25, 7.75], [1, 74.4, 10], [2, 80.3, 11.3]]) { const l = measure('titan-rackable-strongman-log', { size }); near(l.size[0], inch(len), 1, `log ${size} length`); near(l.size[2], inch(d), 1, `log ${size} diameter`); }
  near(measure('titan-rackable-strongman-log', {}, /Neutral handles/).size[0], inch(26) + 42, 1, '12" log handle spacing');
  // Pitbull 12" log: 82" overall, 60" body, 12" tube, 1.3" handles on 25.5" centres, 11" pins of 1 7/8" pipe (hollow on the Classic).
  const pb = measure('pitbull-12-strongman-log'); near(pb.size[0], inch(82), 1, 'Pitbull overall'); near(pb.size[2], inch(12), .5, 'Pitbull 12" tube');
  near(measure('pitbull-12-strongman-log', {}, /^Painted 12" steel tube$/).size[0], inch(60), .5, 'Pitbull 5 ft body');
  near(measure('pitbull-12-strongman-log', {}, /Smooth neutral handles/).size[0], inch(25.5) + inch(1.3), 1, 'Pitbull handle spacing');
  near(measure('pitbull-12-strongman-log', {}, /Loading pins/).size[2], inch(1.875), .5, 'Pitbull 1 7/8" pins');
  for (const model of [0, 1]) {
    const { parts } = build('pitbull-12-strongman-log', { model }), pins = parts.find(p => p.name === 'Loading pins')!, full = inch(1.875) ** 2 * Math.PI / 4 * inch(22);
    assert.ok(model ? pins.solid.volume() > full * .97 : pins.solid.volume() < full * .5, `model ${model} pins ${model ? 'solid' : 'hollow'}`);
    free(parts);
  }
  const pbLoaded = measure('pitbull-12-strongman-log', { load: 2 }); near(pbLoaded.size[2], 448, 1, 'Pitbull rests on its 45s');
  // Circus dumbbells: Titan 10" -> 10.7" x 30.2", 12" -> 12.8" x 28.25"; Bartos 2.375" handle.
  const c10 = measure('titan-circus-dumbbell', { bell: 0, handle: 2 }), c12 = measure('titan-circus-dumbbell', { bell: 1, handle: 3 });
  near(c10.size[1], inch(30.2), 1, '10" circus length'); near(c10.size[2], inch(10.7), 1, '10" bells'); near(c12.size[1], inch(28.25), 1, '12" circus length'); near(c12.size[2], inch(12.8), 1, '12" bells');
  near(measure('titan-circus-dumbbell', { bell: 1, handle: 3 }, /^Handle$/).size[0], inch(3), .5, '3" handle');
  near(measure('mike-bartos-training-circus-dumbbell', { pose: 0 }, /^Handle$/).size[0], inch(2.375), .5, 'Bartos 2.375" handle');
  // Rogue Dinnie rings 7" x 6.5" from 5/8" stock; Cerberus big ring pick-up 20.5"; AbMat 43 x 20 x 12.
  const rings = measure('rogue-dinnie-ring-set'); near(rings.size[2], inch(5 / 8), 2, '5/8" stock'); near(rings.size[1], inch(6.5), 4, 'large ring');
  near(measure('cerberus-replica-dinnie-stone-handles', {}, /Replica rings/).max[2], inch(20.5), 3, 'large ring pick-up height');
  const ab = measure('abmat-log-crash-cushions', { gap: 24 }); near(ab.size[1], inch(43), 1, 'AbMat length'); near(ab.size[2], inch(12), 4, 'AbMat height (plus strap)'); near(ab.size[0], inch(64), 1, 'pair with 24" gap');
});
