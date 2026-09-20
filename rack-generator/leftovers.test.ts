import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, inch, TITAN_VIKING_HANDLE, ROGUE_PARALLEL_HANDLE, TITAN_STRAIGHT_HANDLES, ROGUE_POST_LANDMINE, TSS_COMBO_RACK, THERABAND_FLEXBAR, FREAK_NORDIC_MINI_PRO,
  VIKING, PARALLEL, STRAIGHT, POST_LANDMINE, TSS, FLEXBAR_LEVELS, NORDIC, tssUpright,
} from './floor-parts/leftovers.ts';
import { PARTS as WALL_PARTS, ROGUE_MONSTER_STRIP, ROGUE_3X3_STRIP_2, STRIP, stripStations } from './wall-parts/leftovers.ts';
import { definitions } from './parts/leftovers.ts';
import { definitions as wallDefinitions } from './parts/leftovers-wall.ts';
import { definitions as catalog } from './catalog.ts';
import { coerceFloorParams, floorOptions, floorPart, resolveBy, validateFloorParams, FLOOR_PART_IDS, type FloorPart } from './floor-registry.ts';
import { wallFace, wallPart, WALL_PART_IDS } from './wall-registry.ts';
import { vendorAttribution } from './vendor-metadata.ts';
import { addFloorItem, floorWarnings } from './floor-items.ts';
import { addWallItem, validateWallItems } from './wall-items.ts';
import { createAssembly } from './assembly.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { NumericParams, SolidPart } from './types.ts';

const api = await Module(); api.setup();
type Part = { id: string; defaults: NumericParams; params: FloorPart['params']; noun: string };
const buildOf = (id: string, params: NumericParams) => [...definitions, ...wallDefinitions].find(d => d.id === id)!.build(api as never, params);
const box = (parts: SolidPart[], name?: RegExp) => {
  const s = parts.filter(p => !name || name.test(p.name)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)}`);
/** Defaults, the first/middle/last option of every param, and every param at its last option. */
function variants(part: Part) {
  const out: NumericParams[] = [part.defaults];
  for (const param of part.params) {
    const opts = floorOptions(param, part.defaults);
    for (const v of [opts[0], opts[opts.length >> 1], opts[opts.length - 1]]) out.push(coerceFloorParams(part as never, { ...part.defaults, [param.key]: v }));
  }
  const max = { ...part.defaults }; for (const param of part.params) max[param.key] = floorOptions(param, max).at(-1)!; out.push(max);
  return out;
}
const valid = (parts: SolidPart[], tag: string) => {
  for (const p of parts) { assert.ok(!p.solid.isEmpty() && p.solid.status() === 'NoError' && p.solid.volume() > 0, `${tag} ${p.name}`); assert.notEqual(p.role, 'frame', `${tag}: factory colours`); }
  const tris = parts.reduce((s, p) => s + p.solid.numTri(), 0); assert.ok(tris < 80000, `${tag}: ${tris} triangles`);
};

test('leftovers are registered in the floor and wall registries and the catalog, with sections and vendor credit', () => {
  assert.equal(PARTS.length, 7); assert.equal(WALL_PARTS.length, 2);
  for (const part of PARTS) {
    assert.ok(FLOOR_PART_IDS.includes(part.id as never) && floorPart(part.id) === part, part.id);
    assert.ok(['Accessories', 'Machines'].includes(part.section!), part.id);
  }
  for (const part of WALL_PARTS) { assert.ok(WALL_PART_IDS.includes(part.id as never) && wallPart(part.id) === part, part.id); assert.equal(part.section, 'Wall storage'); }
  for (const part of [...PARTS, ...WALL_PARTS]) {
    const def = catalog.find(d => d.id === part.id)!; assert.ok(def, `${part.id} in catalog.ts`); assert.equal(def.name, part.title); assert.equal(def.category, part.section);
    const v = part.vendor!; assert.ok(v.vendor && /^https:\/\//.test(v.url) && v.credit && v.trademark && v.reconstruction, part.id);
    assert.deepEqual(vendorAttribution(part.id), v);
    assert.match(part.description!, /Independent reconstruction .*trademarks belong to/);
  }
  assert.deepEqual(PARTS.filter(p => p.section === 'Machines').map(p => p.id), ['tss-combo-rack', 'freak-athlete-nordic-mini-pro']);
  assert.equal(new Set([...PARTS, ...WALL_PARTS].map(p => p.id)).size, 9);
});

test('every floor leftover builds closed solids that fill its footprint, on the floor, for defaults and param extremes', () => {
  for (const part of PARTS) for (const params of variants(part)) {
    const t0 = performance.now(), parts = buildOf(part.id, params), ms = performance.now() - t0, tag = `${part.id} ${JSON.stringify(params)}`;
    assert.ok(ms < BUILD_BUDGET_MS, `${tag} built in ${ms.toFixed(0)} ms`);
    valid(parts, tag);
    const b = box(parts)!, fp = resolveBy(part.footprint, params), [ox, oy] = fp.offset ?? [0, 0];
    assert.ok(b.min[2] >= -1e-6, `${tag} on the floor`);
    near(b.max[0] - b.min[0], fp.width, 1, `${tag} footprint width`); near(b.max[1] - b.min[1], fp.depth, 1, `${tag} footprint depth`);
    near((b.max[0] + b.min[0]) / 2, ox, 1, `${tag} footprint centre x`); near((b.max[1] + b.min[1]) / 2, oy, 1, `${tag} footprint centre y`);
    free(parts);
  }
});

test('landmine handles hit their published sizes, and the loaded pose threads a 20 kg bar through the sleeve', () => {
  // Titan Viking: 26.5" × 16" frame of 50 mm tubes, 9.5" grips 7.5" apart.
  let parts = buildOf(TITAN_VIKING_HANDLE.id, { loaded: 0 }), b = box(parts, /steel/)!;
  near(b.max[1] - b.min[1], inch(26.5), .5, 'Viking 26.5" length'); near(b.max[0] - b.min[0], inch(16), .5, 'Viking 16" height');
  near(b.max[2] - b.min[2], VIKING.sleeveOD, .5, 'the 60 mm sleeve is the thickest tube'); near(box(parts, /knob/)!.max[2], b.max[2] + VIKING.knob.stud + VIKING.knob.h, .5, 'stop knob on top'); free(parts);
  parts = buildOf(TITAN_VIKING_HANDLE.id, { loaded: 1 });
  const bar = box(parts, /bar sleeve/i)!, sleeve = box(parts, /steel/)!;
  near(bar.max[0], -VIKING.tube / 2 - 4, 1, 'bar end stops short of the crossbar'); near((bar.max[2] + bar.min[2]) / 2, VIKING.sleeveOD / 2, .5, 'bar on the sleeve axis');
  assert.ok(bar.max[0] > sleeve.min[0] + VIKING.sleeve - 10, 'bar fills the 5" sleeve'); free(parts);
  // Rogue Parallel: published width × height per grip, 9.25" depth, handles 10" above the bar and 10" on centre.
  for (const [grip, g] of PARALLEL.grips.entries()) {
    parts = buildOf(ROGUE_PARALLEL_HANDLE.id, { grip, loaded: 0 }); b = box(parts)!;
    near(b.max[1] - b.min[1], g.width, .5, `${g.name} width`); near(b.max[2], g.height, .5, `${g.name} height`); near(b.max[0] - b.min[0], PARALLEL.depth, .5, `${g.name} depth`);
    const h = box(parts, /handles/)!; near(h.max[2] - h.min[2], g.d, .2, `${g.name} diameter`);
    near(h.max[1] - h.min[1] - g.d, PARALLEL.spacing, .2, 'handles 10" on centre'); near(h.max[0] - h.min[0], PARALLEL.handle, .2, '8.75" handles');
    free(parts);
    parts = buildOf(ROGUE_PARALLEL_HANDLE.id, { grip, loaded: 1 });
    const hz = box(parts, /handles/)!, bz = box(parts, /bar sleeve/i)!;
    near((hz.max[2] + hz.min[2]) / 2 - (bz.max[2] + bz.min[2]) / 2, PARALLEL.rise, .5, 'bar centre to handle centre 10"'); free(parts);
  }
  // Titan Straight: 30" tip to tip, 29 mm grips, 3.5" sleeve.
  parts = buildOf(TITAN_STRAIGHT_HANDLES.id, { loaded: 0 });
  b = box(parts)!; near(b.max[1] - b.min[1], inch(30), .5, '30" overall'); near(b.max[0] - b.min[0], STRAIGHT.sleeve, .5, '3.5" sleeve');
  const g = box(parts, /grips/)!; near(g.max[2] - g.min[2], STRAIGHT.gripD, .2, '29 mm grips'); free(parts);
});

test('Rogue Post Landmine: 7.25" post through two plates, 10" sleeve at the chosen angle', () => {
  for (const angle of [15, 30, 45]) {
    const parts = buildOf(ROGUE_POST_LANDMINE.id, { base: 0, angle }), plates = parts.filter(p => /Base plate/.test(p.name));
    assert.ok(plates.length >= 2, 'two stacked bumper plates');
    const pb = box(parts, /Base plate/)!; near(pb.max[0] - pb.min[0], 450, 1, '450 mm bumpers'); near(pb.max[2], 2 * inch(3.25) + .5, .5, 'two HG 2.0 45 lb bumpers');
    const b = box(parts)!, top = (POST_LANDMINE.sleeve - POST_LANDMINE.pivotIn) * Math.sin(angle * Math.PI / 180);
    assert.ok(b.max[2] > POST_LANDMINE.post + top, `${angle}° sleeve rises above the post`);
    free(parts);
  }
  const echo = buildOf(ROGUE_POST_LANDMINE.id, { base: 1, angle: 30 }); near(box(echo, /Base plate/)!.max[2], 2 * inch(2.4) + .5, .5, 'two Echo 45s'); free(echo);
});

test('TSS Combo Rack: published 83" × 39" / 64" footprint, 49" frame and hooks on 1" holes from 30" to 69"', () => {
  let parts = buildOf(TSS_COMBO_RACK.id, { ...TSS_COMBO_RACK.defaults, bench: 0 }), b = box(parts)!;
  near(b.max[0] - b.min[0], TSS.width, 1, '83" wide'); near(b.max[1] - b.min[1], TSS.rackDepth, 5, '39" rack only'); free(parts);
  parts = buildOf(TSS_COMBO_RACK.id, TSS_COMBO_RACK.defaults); b = box(parts)!;
  near(b.max[1] - b.min[1], TSS.benchDepth, 1, '64" with the bench');
  const pad = box(parts, /pad/)!; near(pad.max[2], inch(17), .5, 'pad at 17"'); near(pad.max[1] - pad.min[1], inch(48), .5, '48" pad'); free(parts);
  const hooks = floorOptions(TSS_COMBO_RACK.params[0], TSS_COMBO_RACK.defaults);
  assert.deepEqual([hooks[0], hooks.at(-1), hooks.length], [30, 69, 40], '1" hook settings');
  for (const hooksIn of [30, 48, 69]) {
    parts = buildOf(TSS_COMBO_RACK.id, { ...TSS_COMBO_RACK.defaults, hooks: hooksIn });
    const roller = box(parts, /rollers/)!; near(roller.max[2], inch(hooksIn), .5, `bar rests at ${hooksIn}"`);
    const frame = box(parts, /7 ga frame/)!; assert.ok(frame.max[2] <= TSS.frameHeight + 1, 'black uprights top out at 49"');
    free(parts);
  }
  near(tssUpright({ hooks: 69 }).top, TSS.frameHeight, 1e-9, 'squat stage raises the uprights to 49"');
  const colours = buildOf(TSS_COMBO_RACK.id, { ...TSS_COMBO_RACK.defaults, color: 1, accent: 2 });
  assert.ok(colours.some(p => p.color === '#b3202a' && /frame/.test(p.name)) && colours.some(p => p.color === '#e8e8e4' && /bench frame/.test(p.name))); free(colours);
});

test('Theraband FlexBar: 12" long in four colour-coded diameters', () => {
  for (const [level, lv] of FLEXBAR_LEVELS.entries()) {
    const parts = buildOf(THERABAND_FLEXBAR.id, { level }), b = box(parts, /rubber/)!;
    near(b.max[0] - b.min[0], inch(12), .2, 'length'); near(b.max[1] - b.min[1], lv.d, .2, `${lv.name} diameter`); near(b.max[2], lv.d, .2, 'lying on the floor');
    assert.ok(parts.some(p => p.color === lv.color)); free(parts);
  }
});

test('Freak Athlete Nordic Mini Pro: 21" × 18" pad, adjustable rollers and an upright storage pose', () => {
  let parts = buildOf(FREAK_NORDIC_MINI_PRO.id, FREAK_NORDIC_MINI_PRO.defaults);
  const pad = box(parts, /knee pad/)!; near(pad.max[0] - pad.min[0], inch(18), .5, '18" wide'); near(pad.max[1] - pad.min[1], inch(21), .5, '21" long');
  const flat = box(parts)!; free(parts);
  let last = 0;
  for (const ankle of [0, 2, 4]) { parts = buildOf(FREAK_NORDIC_MINI_PRO.id, { ankle, pose: 0 }); const r = box(parts, /rollers/)!; assert.ok(r.max[2] > last, 'upper rollers rise'); last = r.max[2]; free(parts); }
  parts = buildOf(FREAK_NORDIC_MINI_PRO.id, { ...FREAK_NORDIC_MINI_PRO.defaults, pose: 1 });
  const stored = box(parts)!; near(stored.max[2], flat.max[1] - flat.min[1], .5, 'stands on its end plate'); near(stored.max[1] - stored.min[1], flat.max[2], .5, 'pad depth becomes the footprint');
  free(parts);
  void NORDIC;
});

test('floor params validate strictly and the landmine handles add as pairs of floor items', () => {
  for (const part of PARTS) assert.deepEqual(validateFloorParams(part, {}), part.defaults);
  for (const [part, bad] of [[TITAN_VIKING_HANDLE, { loaded: 2 }], [ROGUE_PARALLEL_HANDLE, { grip: 3 }], [ROGUE_POST_LANDMINE, { angle: 20 }], [TSS_COMBO_RACK, { hooks: 70 }], [TSS_COMBO_RACK, { accent: 7 }], [THERABAND_FLEXBAR, { level: 4 }], [FREAK_NORDIC_MINI_PRO, { ankle: 9 }], [THERABAND_FLEXBAR, { weight: 1 }]] as const)
    assert.throws(() => validateFloorParams(part, bad), new RegExp(part.noun), `${part.id} ${JSON.stringify(bad)}`);
  assert.deepEqual(coerceFloorParams(TSS_COMBO_RACK, { ...TSS_COMBO_RACK.defaults, hooks: 80 }).hooks, 69);
  const doc = addFloorItem(createAssembly(), THERABAND_FLEXBAR.id, undefined, true);
  assert.equal(doc.floorItems!.length, 2); assert.deepEqual(floorWarnings(doc), []);
  const rack = addFloorItem(createAssembly(), TSS_COMBO_RACK.id); assert.equal(rack.floorItems!.length, 1);
});

test('Rogue strips: 3×3" tubes 36" or 16" long, staggered 2" holes, lag-access holes and the detent pin', () => {
  for (const part of WALL_PARTS) for (const params of variants(part)) {
    const parts = buildOf(part.id, params), tag = `${part.id} ${JSON.stringify(params)}`, b = box(parts)!, { width, height } = wallFace(part, params);
    valid(parts, tag);
    assert.ok(b.min[0] >= -width / 2 - .5 && b.max[0] <= width / 2 + .5 && b.min[2] >= -height / 2 - .5 && b.max[2] <= height / 2 + .5, `${tag} inside its face`);
    assert.ok(Math.abs(b.max[1]) < 1e-6 && b.min[1] >= -part.depth - 1, `${tag} on the wall within its standoff`);
    const tube = box(parts, /11 ga tube/)!;
    near(tube.max[2] - tube.min[2], STRIP.lengths[params.length], .1, `${tag} length`); near(tube.max[0] - tube.min[0], inch(3), .1, '3" wide'); near(-tube.min[1], inch(3), .1, '3" deep');
    assert.equal(parts.some(p => /detent pin/.test(p.name)), params.pin === 1);
    free(parts);
  }
  const long = stripStations({ length: 0 }), half = stripStations({ length: 1 });
  assert.deepEqual(long.lags.map(v => v / 25.4), [2, 10, 26, 34], 'lags 8" / 16" / 8" on centre'); assert.deepEqual(half.lags.map(v => v / 25.4), [2, 14], 'Half-Strip lags 12" on centre');
  assert.equal(long.side.length, 18); assert.ok(long.side.every((d, i) => !i || Math.abs(d - long.side[i - 1] - inch(2)) < 1e-9), 'side holes 2" on centre');
  assert.ok(long.front.every(d => !long.side.includes(d)), 'front and side rows are staggered');
  assert.ok(ROGUE_MONSTER_STRIP.spec.hole > inch(1) && ROGUE_3X3_STRIP_2.spec.hole < inch(.75), '1" Monster vs 5/8" Monster Lite hardware');
  for (const part of WALL_PARTS) { assert.deepEqual(validateFloorParams(part, {}), part.defaults); assert.throws(() => validateFloorParams(part, { length: 2 }), /strip/); }
  const doc = addWallItem(createAssembly(), ROGUE_MONSTER_STRIP.id, { wall: 'back', position: [0, 1500] });
  assert.deepEqual(validateWallItems(JSON.parse(JSON.stringify(doc.wallItems))), doc.wallItems);
});
