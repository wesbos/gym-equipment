import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, ABMAT, ABMAT_MODELS, ABMAT_BARBELL_PILLOWS, AMAZON_BASICS_ROLLER, BENCH_BLOKZ, BENCH_BLOKZ_ENTRY, CALF_CURVE, DIY_LIFTING_PLATFORM, DYNAMAX_MEDICINE_BALL, GENESIS_JACK,
  GRID, HIP_THRUST_PAD, ABMAT_HIP_THRUST_PAD, MASSENOMICS_GRIPPER, REP_CORK_SQUAT_WEDGE, REP_GENESIS_JACK, REP_WEDGE, RITFIT_DEADLIFT_JACK, RITFIT_JACK, ROGUE_ECHO_SLAM_BALL,
  ROGUE_MEDICINE_BALL, ROGUE_OLY_PLATFORM, ROGUE_PLATFORM, STALL_MAT, TITAN_SQUAT_WEDGE, TITAN_WEDGE, TRIGGERPOINT_GRID, TSC_STALL_MAT, U4C_CALF_CURVE, inch, repWedgePeak,
} from './floor-parts/floor-accessories.ts';
import { definitions } from './parts/floor-accessories.ts';
import { GENESIS_PROFILE } from './parts/floor-accessories-jacks.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams, type FloorPart } from './floor-registry.ts';
import { addFloorItem, floorBounds, floorWarnings } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { NumericParams, SolidPart } from './types.ts';

const api = await Module(); api.setup();
const build = (part: FloorPart, params: NumericParams = part.defaults) => definitions.find(d => d.id === part.id)!.build(api as never, params);
const box = (parts: SolidPart[], name?: string) => {
  const s = parts.filter(p => !name || p.name.includes(name)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const size = (b: { min: number[]; max: number[] }) => [0, 1, 2].map(i => b.max[i] - b.min[i]);
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
const near = (a: number, b: number, tol: number, label: string) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a.toFixed(2)} vs ${b.toFixed(2)} (±${tol})`);
/** Defaults plus first, middle and last option of every param (dependent options resolved against the defaults). */
function variants(part: FloorPart) {
  const out: NumericParams[] = [part.defaults];
  for (const param of part.params) {
    const base = { ...part.defaults }, opts = floorOptions(param, base);
    for (const v of [opts[0], opts[opts.length >> 1], opts[opts.length - 1]]) out.push(coerceFloorParams(part, { ...base, [param.key]: v }));
  }
  return out;
}

test('every floor accessory builds closed solids inside its footprint for defaults and param extremes', () => {
  assert.equal(PARTS.length, 18);
  assert.equal(definitions.length, PARTS.length);
  for (const part of PARTS) {
    assert.equal(part.section, 'Accessories', part.id);
    assert.ok(part.vendor?.url && part.vendor.reconstruction && part.description?.includes('Independent reconstruction') !== undefined, part.id);
    for (const params of variants(part)) {
      const t0 = performance.now(), parts = build(part, params), label = `${part.id} ${JSON.stringify(params)}`;
      assert.ok(performance.now() - t0 < BUILD_BUDGET_MS, `${label} build time`);
      for (const p of parts) { assert.ok(!p.solid.isEmpty() && p.solid.status() === 'NoError' && p.solid.volume() > 0, `${label} ${p.name}`); assert.notEqual(p.role, 'frame', 'factory colours'); }
      const tris = parts.reduce((n, p) => n + p.solid.numTri(), 0);
      assert.ok(tris < 80000, `${label} ${tris} triangles`);
      const b = box(parts)!, fp = resolveBy(part.footprint, params), [ox, oy] = fp.offset ?? [0, 0], [w, d] = size(b);
      assert.ok(b.min[2] >= -1e-6, `${label} on the floor`);
      near(w, fp.width, .6, `${label} footprint width`); near(d, fp.depth, .6, `${label} footprint depth`);
      near((b.max[0] + b.min[0]) / 2, ox, .6, `${label} centre x`); near((b.max[1] + b.min[1]) / 2, oy, .6, `${label} centre y`);
      free(parts);
    }
  }
});

test('stall mats and platforms match their published sizes and tile with hairline seams', () => {
  const one = build(TSC_STALL_MAT), [w, d, h] = size(box(one)!);
  near(w, inch(48), .05, 'mat 48"'); near(d, inch(72), .05, 'mat 72"'); near(h, inch(.75), .05, 'mat 3/4"'); free(one);
  const grid = build(TSC_STALL_MAT, { across: 3, deep: 2, side: 0 });
  near(size(box(grid)!)[0], 3 * inch(48) + 2 * STALL_MAT.seam, .05, "three mats across = 12' + seams"); free(grid);
  assert.deepEqual(floorOptions(TSC_STALL_MAT.params[2], { across: 2, deep: 1 }), [0], 'only a single mat flips');
  assert.throws(() => validateFloorParams(TSC_STALL_MAT, { across: 2, side: 1 }), /stall mat/);
  const flipped = build(TSC_STALL_MAT, { across: 1, deep: 1, side: 1 }), flat = build(TSC_STALL_MAT);
  assert.ok(flipped[0].solid.numTri() > 50 * flat[0].solid.numTri(), 'studded underside modelled'); near(size(box(flipped)!)[2], inch(.75), .05, 'flipped mat height'); free(flipped); free(flat);
  const diy = build(DIY_LIFTING_PLATFORM), [dw, dd] = size(box(diy)!);
  near(dw, inch(96), .05, 'DIY 8\''); near(dd, inch(96), .05, 'DIY 8\'');
  near(size(box(diy, 'Plywood centre')!)[0], inch(48), .05, "4' wood centre"); near(box(diy, 'Stall-mat strips')!.max[2], inch(2.25), .05, '2.25" platform');
  near(size(box(diy, 'Stall-mat strips')!)[0], inch(96), .05, 'strips reach the edges'); free(diy);
  const rogue = build(ROGUE_OLY_PLATFORM), frame = box(rogue, 'steel frame')!;
  near(size(frame)[0], inch(100), .05, "8'4\" outside"); near(frame.max[2], inch(2), .05, '2" tube');
  near(size(box(rogue, 'tiles')!)[0], inch(96) - 1, .05, "8' tile bay"); near(box(rogue, 'tiles')!.max[2], inch(1.5), .05, '1.5" tiles'); free(rogue);
  const wood = build(ROGUE_OLY_PLATFORM, { floor: 2 });
  near(size(box(wood, 'Plywood centre')!)[0], inch(48) - 1, .05, "4'×8' wood centre"); assert.ok(size(box(wood, 'tiles')!)[0] > inch(95)); free(wood);
  assert.equal(ROGUE_PLATFORM.bolt, 6);
});

test('mats and platforms are underlays: no overlap warnings and nothing steps around them', () => {
  const rack = createAssembly();
  for (const part of [TSC_STALL_MAT, DIY_LIFTING_PLATFORM, ROGUE_OLY_PLATFORM]) {
    assert.equal(part.underlay, true);
    let doc = addFloorItem(rack, part.id, [0, 0]);
    assert.deepEqual(floorWarnings(doc), [], `${part.id} under the rack`);
    doc = addFloorItem(addFloorItem(doc, part.id, [5000, 0]), REP_GENESIS_JACK.id, [5000, 0]);
    doc = addFloorItem(doc, ROGUE_MEDICINE_BALL.id);
    assert.deepEqual(floorWarnings(doc), [], `${part.id} with a jack standing on it`);
    // A regular item added beside the rack is not pushed around by the mat under it.
    const ball = doc.floorItems!.at(-1)!, alone = addFloorItem(rack, ROGUE_MEDICINE_BALL.id).floorItems![0];
    assert.deepEqual(ball.position, alone.position);
  }
  // Regular items still warn when they overlap each other.
  let doc = addFloorItem(rack, ROGUE_MEDICINE_BALL.id, [3000, 0]); doc = addFloorItem(doc, DYNAMAX_MEDICINE_BALL.id, [3050, 0]);
  assert.equal(floorWarnings(doc).length, 1);
  const mat = addFloorItem(rack, TSC_STALL_MAT.id).floorItems![0];
  assert.ok(floorBounds(mat).max[0] - floorBounds(mat).min[0] > 1200);
});

test('jacks, blocks, wedges and the calf block hit their published dimensions', () => {
  const gj = build(REP_GENESIS_JACK), [gw, gd, gh] = size(box(gj)!);
  near(gh, GENESIS_JACK.height, 1, 'Genesis 18.25" tall'); near(gw, inch(7.5), .05, 'Genesis 7.5" foot'); near(gd, inch(2.25), .05, 'Genesis 2.25" foot');
  // The hook's liner bore fits a 30 mm bar: nothing solid within 15 mm of the hook centre.
  const { cx, cz, rLiner } = GENESIS_PROFILE.hook, bar = api.Manifold.cylinder(80, inch(rLiner) - .3, inch(rLiner) - .3, 24, true), turned = bar.rotate([90, 0, 0]), hookC = turned.translate([inch(cx), 0, inch(cz)]), all = api.Manifold.union(gj.map(p => p.solid)), hit = api.Manifold.intersection([all, hookC]);
  assert.ok(hit.isEmpty() || hit.volume() < 1, 'bar fits the hook'); assert.ok(2 * inch(rLiner) >= GENESIS_JACK.bar, 'liner bore takes a 30 mm bar'); for (const m of [bar, turned, hookC, all, hit]) m.delete(); free(gj);
  const rf = build(RITFIT_DEADLIFT_JACK), [rw, rd, rh] = size(box(rf)!);
  near(rh, RITFIT_JACK.height, 1, 'RitFit 16.93"'); near(rw, inch(7.87), .05, 'RitFit 7.87" base'); near(rd, inch(4.13), .05, 'RitFit 4.13" base');
  near(size(box(rf, 'handle scales')!)[2], inch(4.7), 3, 'RitFit 4.7" handle'); free(rf);
  const bb = build(BENCH_BLOKZ_ENTRY), [bw, bd, bh] = size(box(bb)!);
  near(bw, BENCH_BLOKZ.width, .05, 'Blok width'); near(bd, BENCH_BLOKZ.height, .05, 'Blok length'); near(bh, BENCH_BLOKZ.thick, .5, 'Blok thickness'); free(bb);
  // Bar in each position: face length minus slot depth gives the published 7.5" / 6" / 4.5" board heights, the cross channel 3".
  near((BENCH_BLOKZ.height - BENCH_BLOKZ.bottomSlot) / 25.4, 7.5, .05, '5-board'); near((BENCH_BLOKZ.height - BENCH_BLOKZ.topSlot) / 25.4, 6, .05, '4-board');
  near((BENCH_BLOKZ.width - BENCH_BLOKZ.sideSlot) / 25.4, 4.5, .05, '3-board'); near((BENCH_BLOKZ.thick - BENCH_BLOKZ.channel) / 25.4, 3, .05, '2-board');
  const rw2 = build(REP_CORK_SQUAT_WEDGE), [ww, wd, wh] = size(box(rw2)!);
  near(ww, REP_WEDGE.width, .05, 'REP wedge 5.3"'); near(wd, REP_WEDGE.length, .05, 'REP wedge 8.8"'); near(wh, repWedgePeak().z, 2, 'REP wedge height (peak eased)'); assert.ok(wh > inch(3.1) && wh < inch(3.5)); free(rw2);
  for (const [i, angle] of TITAN_WEDGE.angles.entries()) for (const style of [0, 1]) {
    const tw = build(TITAN_SQUAT_WEDGE, { angle, style }), [tw0, , th] = size(box(tw)!), steel = box(tw, 'steel')!;
    near(tw0, TITAN_WEDGE.widths[style], .05, `Titan ${angle}° width`); near(steel.max[2], TITAN_WEDGE.heights[i], .6, `Titan ${angle}° height`); assert.ok(th < TITAN_WEDGE.heights[i] + 2);
    near(size(box(tw, 'grip tape')!)[1], (TITAN_WEDGE.ramp - 16) * Math.cos(angle * Math.PI / 180), 2, `Titan ${angle}° taped ramp`); free(tw);
  }
  const cc = build(U4C_CALF_CURVE), [cl, cw, ch] = size(box(cc)!);
  near(cl, inch(24), .05, 'Calf Curve 24"'); near(cw, inch(7), .05, 'Calf Curve 7"'); near(ch, CALF_CURVE.height, 1, 'Calf Curve 4.5"'); free(cc);
});

test('pads, balls and rollers hit their published sizes', () => {
  for (const [model, m] of ABMAT_MODELS.entries()) { const a = build(ABMAT, { model }), [w, d, h] = size(box(a)!); near(w, m.width, .05, `${m.name} width`); near(d, m.length, .05, `${m.name} length`); near(h, m.height, .8, `${m.name} height`); free(a); }
  const htp = build(ABMAT_HIP_THRUST_PAD), [hl, hw, hh] = size(box(htp)!);
  near(hl, HIP_THRUST_PAD.length, .05, 'HTP 18"'); near(hw, HIP_THRUST_PAD.width, .05, 'HTP 9"'); near(hh, HIP_THRUST_PAD.thick, .6, 'HTP 1.75"'); free(htp);
  const pillows = build(ABMAT_BARBELL_PILLOWS, { pack: 10 }), pil = pillows[0].solid.decompose();
  assert.equal(pil.length, 10, '10 pack'); for (const m of pil) m.delete(); free(pillows);
  const mb = build(ROGUE_MEDICINE_BALL, { weight: 20 }), [mw, , mh] = size(box(mb)!);
  near(mw, inch(14), .05, 'Rogue med ball 14"'); assert.ok(mh > inch(13.4) && mh < inch(14), 'resting ball squats a little'); free(mb);
  for (const [weight, d] of [[10, 9], [30, 9], [35, 10], [50, 10]]) { const sb = build(ROGUE_ECHO_SLAM_BALL, { weight }); near(size(box(sb)!)[0], inch(d), .05, `Echo ${weight} lb ${d}"`); free(sb); }
  const dx = build(DYNAMAX_MEDICINE_BALL, { weight: 10, color: 1 });
  near(size(box(dx)!)[0], inch(14), .05, 'Dynamax 14"'); assert.equal(dx.find(p => p.name === 'Ball panels')!.color, '#b3232a'); free(dx);
  const grid = build(TRIGGERPOINT_GRID), [gl, gd, gh] = size(box(grid)!);
  near(gl, GRID.length, .05, 'GRID 13"'); near(gd, GRID.diameter, .05, 'GRID 5.5"'); near(gh, GRID.diameter, .05, 'GRID 5.5" tall');
  const core = box(grid, 'Hollow core')!; near(size(core)[1], GRID.core, .5, 'core tube'); free(grid);
  for (const length of [12, 36]) { const r = build(AMAZON_BASICS_ROLLER, { length, color: 1 }), [l, d] = size(box(r)!); near(l, inch(length), .05, `${length}" roller`); near(d, inch(6), .05, '6" roller'); assert.ok(r.some(p => p.name.includes('flecks'))); free(r); }
});

test('params validate and coerce', () => {
  for (const part of PARTS) assert.deepEqual(validateFloorParams(part, part.defaults), part.defaults, part.id);
  for (const [part, bad] of [[TSC_STALL_MAT, { across: 7 }], [ABMAT, { model: 2 }], [ROGUE_MEDICINE_BALL, { weight: 22 }], [ROGUE_ECHO_SLAM_BALL, { weight: 5 }], [TITAN_SQUAT_WEDGE, { angle: 20 }],
    [AMAZON_BASICS_ROLLER, { length: 30 }], [DYNAMAX_MEDICINE_BALL, { color: 8 }], [REP_GENESIS_JACK, { color: 9 }], [ROGUE_OLY_PLATFORM, { floor: 3 }], [MASSENOMICS_GRIPPER, { size: 1 }]] as const)
    assert.throws(() => validateFloorParams(part, bad), new RegExp(part.noun), part.id);
  assert.deepEqual(coerceFloorParams(TSC_STALL_MAT, { across: 3, deep: 1, side: 1 }), { across: 3, deep: 1, side: 0 }, 'tiled mats snap to top-up');
  assert.deepEqual(coerceFloorParams(ROGUE_ECHO_SLAM_BALL, { weight: 33 }), { weight: 35 });
  assert.deepEqual(coerceFloorParams(TITAN_SQUAT_WEDGE, { angle: 25, style: 1 }), { angle: 22.5, style: 1 });
  assert.equal(resolveBy(BENCH_BLOKZ_ENTRY.footprint, { model: 1 }).width, BENCH_BLOKZ.width);
  assert.ok(REP_CORK_SQUAT_WEDGE.pair && TITAN_SQUAT_WEDGE.pair, 'wedges add as pairs');
});
