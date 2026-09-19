import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, BOS, BOS_ADJUSTABLE_KETTLEBELL, BOWFLEX_840, FREAK, FREAK_KETTLEBELL, IRONMASTER, IRONMASTER_KETTLEBELL, KBK_COMPETITION_KETTLEBELL, ONNIT_ANIMALS,
  ONNIT_PRIMAL_KETTLEBELL, REP_ADJUSTABLE_KETTLEBELL, REP_KETTLEBELL, ROGUE_CHART, ROGUE_KETTLEBELL, ROGUE_USA_KETTLEBELL, TITAN_CAST_KETTLEBELL, TITAN_COMPETITION_KETTLEBELL,
  TITAN_LB_CHART, YES4ALL_CHART, YES4ALL_KETTLEBELL, bellLayout, bosWeights, freakPinZ, ironmasterStack, ironmasterWeights, kbkBell, repAdjSpares, rogueBell, titanCastBell, titanCompBell, yes4allBell,
} from './floor-parts/kettlebells.ts';
import { definitions } from './parts/kettlebells.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams, type FloorPart } from './floor-registry.ts';
import { addFloorItem, floorWarnings } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import type { NumericParams, SolidPart } from './types.ts';

const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
const build = (part: FloorPart, params: NumericParams) => definitions.find(d => d.id === part.id)!.build(api as never, params);
const box = (parts: SolidPart[], name?: string) => {
  const s = parts.filter(p => !name || p.name.includes(name)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
/** Defaults plus first, middle and last option of every param (dependent options resolved against the defaults). */
function variants(part: FloorPart) {
  const out: NumericParams[] = [part.defaults];
  for (const param of part.params) {
    const base = { ...part.defaults }, opts = floorOptions(param, base);
    for (const v of [opts[0], opts[opts.length >> 1], opts[opts.length - 1]]) out.push(coerceFloorParams(part, { ...base, [param.key]: v }));
  }
  return out;
}

test('every kettlebell builds closed solids inside its footprint for defaults and param extremes', () => {
  assert.equal(PARTS.length, 16);
  for (const part of PARTS) for (const params of variants(part)) {
    const parts = build(part, params), label = `${part.id} ${JSON.stringify(params)}`;
    for (const p of parts) { assert.ok(!p.solid.isEmpty() && p.solid.status() === 'NoError' && p.solid.volume() > 0, `${label} ${p.name}`); assert.notEqual(p.role, 'frame', 'factory colours'); }
    const b = box(parts)!, fp = resolveBy(part.footprint, params), [ox, oy] = fp.offset ?? [0, 0];
    // Sphere and handle extremes are exact vertices; the SDF-sculpted Onnit heads are meshed to ~3 mm.
    const tol = part === ONNIT_PRIMAL_KETTLEBELL ? 3.5 : 1.2;
    assert.ok(b.min[2] >= -1e-6, `${label} on the floor`);
    assert.ok(Math.abs(b.max[0] - b.min[0] - fp.width) < tol && Math.abs(b.max[1] - b.min[1] - fp.depth) < tol, `${label} footprint ${(b.max[0] - b.min[0]).toFixed(1)}×${(b.max[1] - b.min[1]).toFixed(1)} vs ${fp.width.toFixed(1)}×${fp.depth.toFixed(1)}`);
    assert.ok(Math.abs((b.max[0] + b.min[0]) / 2 - ox) < tol && Math.abs((b.max[1] + b.min[1]) / 2 - oy) < tol, `${label} footprint centre`);
    free(parts);
  }
});

test('cast bells grow with weight and hit the published size charts', () => {
  // Rogue: published handle width, grip and base per weight; height grows monotonically.
  let last = 0;
  for (const [kg, , , grip, width, base] of ROGUE_CHART) {
    const l = rogueBell(kg).layout;
    assert.ok(Math.abs(l.width - inch(width)) < 1e-6 && Math.abs(l.grip - inch(grip)) < 1e-6 && Math.abs(l.base - inch(base)) < 1e-6, `Rogue ${kg} kg`);
    assert.ok(l.height > last, `Rogue ${kg} kg taller than the previous size`); last = l.height;
  }
  const r16 = build(ROGUE_KETTLEBELL, { weight: 16 }), b16 = box(r16)!;
  assert.ok(Math.abs(b16.max[0] - b16.min[0] - inch(7.8)) < 1, 'Rogue 16 kg handle width 7.8"');
  assert.ok(Math.abs(b16.max[2] - rogueBell(16).layout.height) < .5 && b16.max[2] > 230 && b16.max[2] < 270, 'Rogue 16 kg height');
  assert.ok(r16.some(p => p.name === 'Colour-coded handle band' && p.color === '#f0c419'), '16 kg yellow stripe');
  free(r16);
  const usa = build(ROGUE_USA_KETTLEBELL, { finish: 0, weight: 16 });
  assert.ok(!usa.some(p => p.name.includes('band')), 'USA E-coat bells have no stripes'); free(usa);
  // Titan LB: published height, body width and grip.
  for (const [lb, h, , grip, body] of TITAN_LB_CHART) {
    const l = titanCastBell(lb).layout;
    assert.ok(Math.abs(l.height - inch(h)) < 1e-6 && Math.abs(l.body - inch(body)) < 1e-6 && l.grip === grip, `Titan ${lb} lb`);
  }
  // Yes4All: published height, outer width and grip.
  for (const [kg, w, h, g] of YES4ALL_CHART) { const l = yes4allBell(kg).layout; assert.ok(Math.abs(l.height - inch(h)) < 1e-6 && Math.abs(l.width - inch(w)) < 1e-6 && Math.abs(l.grip - inch(g)) < 1e-6, `Yes4All ${kg} kg`); }
  const y = build(YES4ALL_KETTLEBELL, { weight: 32 }), yb = box(y)!;
  assert.ok(Math.abs(yb.max[2] - inch(11.4)) < .5 && Math.abs(yb.max[0] - yb.min[0] - inch(9.1)) < 1, 'Yes4All 32 kg 11.4" × 9.1"'); free(y);
  // The handle window stays open above the body for every cast bell.
  for (const kg of [4, 16, 40, 92]) { const l = rogueBell(kg).layout; assert.ok(l.zt - l.grip / 2 - (l.zc + l.R) > 40, `Rogue ${kg} kg window`); }
});

test('competition bells keep one size across weights with colour by weight', () => {
  const a = kbkBell(8).layout, b = kbkBell(48).layout;
  assert.deepEqual([a.height, a.body, a.grip, a.width], [280, 210, 35, 185]);
  assert.deepEqual([b.height, b.body, b.grip], [a.height, a.body, a.grip]);
  assert.equal(kbkBell(16).color, '#f1c21c'); assert.equal(kbkBell(24).color, '#1f6d45');
  assert.ok(kbkBell(10).stripe && !kbkBell(12).stripe, 'odd sizes carry the black stripe');
  const t = titanCompBell(32).layout; assert.deepEqual([t.height, t.body, t.grip, t.width], [290, 210, 35, 190]);
  for (const [part, w, h] of [[KBK_COMPETITION_KETTLEBELL, 10, 280], [TITAN_COMPETITION_KETTLEBELL, 32, 290]] as const) {
    const parts = build(part, { weight: w }), bb = box(parts)!;
    assert.ok(Math.abs(bb.max[2] - h) < .5 && Math.abs(bb.max[0] - bb.min[0] - 210) < 1, `${part.id} ${h} × 210`);
    assert.ok(parts.some(p => p.name === 'Bare steel handle' && p.role === 'handle'));
    if (part === KBK_COMPETITION_KETTLEBELL) assert.ok(parts.some(p => p.name === 'Odd-weight black stripe'));
    free(parts);
  }
});

test('adjustable bells: plates, pins and dials follow the selected weight', () => {
  // Ironmaster: 22.5 lb handle is 7.75" tall empty, 11.5" at 57.5 lb and 13.75" at 80 lb (published).
  assert.deepEqual(ironmasterWeights(1).slice(0, 3), [22.5, 25, 27.5]); assert.equal(ironmasterWeights(1).at(-1), 80); assert.equal(ironmasterWeights(0).at(-1), 70);
  for (const [w, h] of [[22.5, 7.75], [57.5, 11.5], [80, 13.75]] as const) {
    const parts = build(IRONMASTER_KETTLEBELL, { handle: 1, weight: w }), bb = box(parts)!;
    assert.ok(Math.abs(bb.max[2] - inch(h)) < 2, `Ironmaster ${w} lb height ${bb.max[2].toFixed(1)}`);
    assert.equal(parts.some(p => p.name === 'Quick-Lock weight plates'), w > 25);
    free(parts);
  }
  assert.deepEqual(ironmasterStack(1, 57.5), { plates5: 6, plates25: 1, screw: true, addOn: false, stack: inch(.5) * 7 + inch(.25) });
  assert.equal(ironmasterStack(0, 70).addOn, true);
  // Freak Athlete: published 302.5 mm tall; the pin drops 13 mm per 2 kg plate.
  const fa = (w: number) => { const parts = build(FREAK_KETTLEBELL, { weight: w }), pin = box(parts, 'pin')!, all = box(parts)!; free(parts); return { pin, all }; };
  const lo = fa(12), hi = fa(32);
  assert.ok(Math.abs(lo.all.max[2] - FREAK.height) < .5 && Math.abs(lo.all.max[1] - lo.all.min[1] - FREAK.depth) < 1);
  assert.ok(Math.abs((lo.pin.min[2] + lo.pin.max[2]) / 2 - freakPinZ(12)) < .5 && hi.pin.max[2] < lo.pin.min[2], 'pin station moves with the weight');
  // REP: removed plates stack beside the bell; none at full weight.
  assert.equal(repAdjSpares(0, 16), 0); assert.equal(repAdjSpares(0, 8), 4);
  const rep = build(REP_ADJUSTABLE_KETTLEBELL, { model: 0, weight: 8 }), full = build(REP_ADJUSTABLE_KETTLEBELL, { model: 0, weight: 16 });
  assert.ok(rep.some(p => p.name === 'Removed weight plates') && !full.some(p => p.name === 'Removed weight plates'));
  assert.ok(Math.abs(box(full)!.max[2] - 280) < .5); free(rep); free(full);
  // Bells of Steel: 0.5 kg steps, 41 settings on the 12–32 kg bell.
  assert.equal(bosWeights(1).length, 41); assert.equal(bosWeights(0).at(-1), 20.5);
  const bos = build(BOS_ADJUSTABLE_KETTLEBELL, { model: 1, color: 3, weight: 32 });
  assert.ok(bos.some(p => p.color === '#f2c81c') && Math.abs(box(bos)!.max[2] - BOS.height) < .5); free(bos);
  // Bowflex 840: published 8.8" × 7" × 12.5".
  const bf = build({ ...PARTS.find(p => p.id === 'bowflex-selecttech-840-kettlebell')! } as FloorPart, { weight: 40 }), bb = box(bf)!;
  assert.ok(Math.abs(bb.max[0] - bb.min[0] - BOWFLEX_840.length) < 1 && Math.abs(bb.max[1] - bb.min[1] - BOWFLEX_840.depth) < 1 && Math.abs(bb.max[2] - BOWFLEX_840.height) < .5); free(bf);
  void IRONMASTER;
});

test('Onnit Primal bells: one sculpted head per weight', () => {
  assert.deepEqual(ONNIT_ANIMALS.map(a => a.lb), [18, 36, 54, 72, 90]);
  const g = build(ONNIT_PRIMAL_KETTLEBELL, { animal: 3 }), gb = box(g)!;
  assert.ok(Math.abs(gb.max[2] - inch(14.5)) < .5, 'Gorilla 14.5" tall');
  free(g);
});

test('params validate strictly, coerce dependent options and add as a pair', () => {
  assert.deepEqual(validateFloorParams(REP_KETTLEBELL, { unit: 1, weight: 35 }), { unit: 1, weight: 35 });
  for (const bad of [{ weight: 17 }, { unit: 2 }, { unit: 1, weight: 16 }, { color: 1 }]) assert.throws(() => validateFloorParams(REP_KETTLEBELL, bad), /kettlebell/);
  assert.deepEqual(coerceFloorParams(REP_KETTLEBELL, { unit: 1, weight: 48 }), { unit: 1, weight: 50 });
  assert.throws(() => validateFloorParams(ROGUE_USA_KETTLEBELL, { finish: 1, weight: 4 }), /kettlebell/, 'powder coat starts at 13 lb');
  assert.deepEqual(coerceFloorParams(IRONMASTER_KETTLEBELL, { handle: 0, weight: 80 }), { handle: 0, weight: 70 });
  assert.throws(() => validateFloorParams(TITAN_CAST_KETTLEBELL, { weight: 85 }), /kettlebell/);
  for (const part of PARTS) assert.deepEqual(validateFloorParams(part, {}), part.defaults);
  const doc = addFloorItem(createAssembly(), 'rogue-kettlebell', undefined, true), [a, b] = doc.floorItems!;
  assert.ok(b.position[0] - a.position[0] > resolveBy(ROGUE_KETTLEBELL.footprint, ROGUE_KETTLEBELL.defaults).width);
  assert.deepEqual(floorWarnings(doc), []);
  void bellLayout;
});
