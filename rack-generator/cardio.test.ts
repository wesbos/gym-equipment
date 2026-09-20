import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, TREADMILL_SPECS, treadFoldAngle, treadFolded, treadFootprint, inch,
  PELOTON_BIKE, PELOTON_BIKE_PLUS, SCHWINN_IC4, SUNNY_B1002, ASSAULTRUNNER_PRO, ASSAULTRUNNER_ELITE, MAX_TRAINER_M6, WATERROWER, STAIRMASTER_8GX, SOLE_E35,
} from './floor-parts/cardio.ts';
import { buildCardioPart, definitions } from './parts/cardio.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import { addFloorItem, floorWarnings, validateFloorItems } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { NumericParams, SolidPart } from './types.ts';

const api = await Module(); api.setup();
const part = (id: string) => { const p = PARTS.find(q => q.id === id); assert.ok(p, id); return p; };
const build = (id: string, params: NumericParams = {}) => buildCardioPart(id)(api, { ...part(id).defaults, ...params });
type Box = { min: number[]; max: number[] };
const bounds = (parts: SolidPart[], match: (name: string) => boolean = () => true): Box | undefined => {
  const s = parts.filter(p => match(p.name)); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tol: number, what: string) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual.toFixed(1)} vs ${expected.toFixed(1)} ±${tol}`);
function withParts<T>(id: string, params: NumericParams, run: (parts: SolidPart[]) => T): T { const parts = build(id, params); try { return run(parts); } finally { parts.forEach(p => p.solid.delete()); } }
/** Defaults plus the first, middle and last option of every param. */
function variants(id: string): NumericParams[] {
  const p0 = part(id), out: NumericParams[] = [p0.defaults];
  for (const q of p0.params) { const o = floorOptions(q, p0.defaults); for (const v of new Set([o[0], o[o.length >> 1], o.at(-1)!])) out.push(coerceFloorParams(p0, { ...p0.defaults, [q.key]: v })); }
  return out;
}

test('eighteen cardio products registered in the Cardio section with attribution and builders', () => {
  assert.equal(PARTS.length, 18);
  assert.equal(new Set(PARTS.map(p => p.id)).size, 18);
  for (const p of PARTS) {
    assert.equal(p.section, 'Cardio', p.id);
    assert.ok(p.vendor?.vendor && p.vendor.url.startsWith('https://') && p.vendor.credit && p.vendor.trademark && p.vendor.reconstruction, p.id);
    assert.match(p.description ?? '', /Independent reconstruction .*trademarks belong to/, p.id);
    assert.ok(definitions.some(d => d.id === p.id && d.category === 'Cardio' && d.name === p.title), p.id);
    assert.ok(p.clearance, `${p.id} has a manufacturer use area`);
  }
});

test('every product and param extreme builds valid closed solids that fill its footprint', () => {
  for (const p of PARTS) for (const v of variants(p.id)) {
    const t0 = performance.now(), label = `${p.id} ${JSON.stringify(v)}`;
    withParts(p.id, v, parts => {
      assert.ok(parts.length > 3, label);
      for (const s of parts) {
        assert.ok(!s.solid.isEmpty() && s.solid.status() === 'NoError' && s.solid.volume() > 0, `${label} ${s.name}`);
        assert.notEqual(s.role, 'frame', `${label} ${s.name}: factory colours, not rack paint`);
      }
      const b = bounds(parts)!, fp = resolveBy(p.footprint, v);
      near(size(b, 0), fp.width, 1, `${label} width`); near(size(b, 1), fp.depth, 1, `${label} depth`);
      near(b.min[2], 0, 1e-6, `${label} rests on the floor`);
      near((b.min[0] + b.max[0]) / 2, 0, 1e-6, `${label} centred X`); near((b.min[1] + b.max[1]) / 2, 0, 1e-6, `${label} centred Y`);
      assert.ok(parts.reduce((n, s) => n + s.solid.numTri(), 0) < 80000, `${label} triangle budget`);
    });
    assert.ok(performance.now() - t0 < BUILD_BUDGET_MS, `${label} build time`);
  }
});

test('bikes match their published envelopes, crank length and screen sizes', () => {
  for (const [id, env, tol] of [['peloton-bike-plus', PELOTON_BIKE_PLUS, 2], ['schwinn-ic4', SCHWINN_IC4, 2], ['sunny-sf-b1002', SUNNY_B1002, 2]] as const)
    withParts(id, {}, parts => near(size(bounds(parts)!, 2), env.H, tol, `${id} height`));
  // Peloton Bike: 53 in is the handlebar height; the 21.5 in screen on its post rises above it.
  withParts('peloton-bike', {}, parts => {
    const bars = bounds(parts, n => n === 'Handlebar grips')!, glass = bounds(parts, n => n === 'Glossy display glass')!;
    near(bars.max[2], PELOTON_BIKE.H, 15, 'Peloton Bike handlebar height');
    near(Math.hypot(size(glass, 0), Math.hypot(size(glass, 1), size(glass, 2))), inch(21.5), 25, '21.5 in diagonal');
    assert.ok(glass.max[2] > PELOTON_BIKE.H + 150);
  });
  withParts('peloton-bike-plus', {}, parts => { const g = bounds(parts, n => n === 'Glossy display glass')!; near(Math.hypot(size(g, 0), Math.hypot(size(g, 1), size(g, 2))), inch(23.8), 25, '23.8 in diagonal'); });
  // 170 mm cranks: pedal spindles sweep a 340 mm circle; the flywheel sits ahead of the crank on every bike.
  for (const id of ['peloton-bike', 'schwinn-ic4', 'sunny-sf-b1002']) withParts(id, {}, parts => {
    const cranks = bounds(parts, n => n === 'Cranks and axle')!, fly = bounds(parts, n => /Flywheel/.test(n))!;
    assert.ok(size(cranks, 2) > 250 && size(cranks, 2) < 360, `${id} crank sweep`);
    assert.ok((fly.min[1] + fly.max[1]) / 2 < (cranks.min[1] + cranks.max[1]) / 2, `${id} front flywheel`);
  });
});

test('treadmills match published height, step-up, belt width and folded size', () => {
  for (const [id, t] of Object.entries(TREADMILL_SPECS)) {
    withParts(id, {}, parts => {
      const all = bounds(parts)!, belt = bounds(parts, n => n === 'Running belt')!;
      near(size(all, 2), t.H, 3, `${id} height`);
      near(belt.max[2], t.stepUp, 1, `${id} step-up`);
      near(size(belt, 0), t.belt[0], 1, `${id} belt width`);
      assert.ok(size(belt, 1) > t.belt[1] * .95, `${id} belt length`);
    });
    if (!t.fold) { assert.equal(part(id).params.length, 0, `${id} does not fold`); continue; }
    const fp = treadFootprint(t, true);
    near(fp.depth, t.fold.L, 1, `${id} folded length`);
    near(Math.max(...treadFolded(t).map(p => p[1])), t.fold.H, 80, `${id} folded height`);
    assert.ok(treadFoldAngle(t) > 60 && treadFoldAngle(t) <= 88, `${id} fold angle`);
    withParts(id, { pose: 1 }, parts => {
      const deck = bounds(parts, n => n === 'Running belt')!;
      assert.ok(size(deck, 2) > t.belt[1] * .8, `${id} belt stands up when folded`);
      near(size(bounds(parts)!, 2), Math.max(t.H, Math.max(...treadFolded(t).map(p => p[1]))), 3, `${id} folded envelope height`);
    });
  }
  // NordicTrack official drawings: 10 in (Commercial) and 8.3 in (T Series 10) step-up; 22 × 60 in vs 20 × 60 in belts.
  assert.equal(TREADMILL_SPECS['nordictrack-commercial-1750'].stepUp, 254);
  near(TREADMILL_SPECS['nordictrack-t-series-10'].belt[0], inch(20), .1, 'T Series belt');
  near(TREADMILL_SPECS['nordictrack-commercial-1250'].belt[0], inch(22), .1, 'Commercial belt');
});

test('curved runners, climber, trainer, rower and elliptical match their published dimensions', () => {
  for (const [id, env] of [['assaultrunner-pro', ASSAULTRUNNER_PRO], ['assaultrunner-elite', ASSAULTRUNNER_ELITE]] as const) withParts(id, {}, parts => {
    near(size(bounds(parts)!, 2), env.H, 3, `${id} height`);
    const slats = bounds(parts, n => n === 'Running slats')!;
    near(size(slats, 0), env.belt[0], 1, `${id} 17 in running surface`);
    assert.ok(size(slats, 1) > env.belt[1] * .85 && size(slats, 1) < env.L, `${id} running length`);
    assert.ok(slats.max[2] - slats.min[2] > 100, `${id} surface is curved`);
  });
  withParts('bowflex-max-trainer-m6', {}, parts => {
    near(size(bounds(parts)!, 2), MAX_TRAINER_M6.H, 3, 'Max Trainer height');
    near(bounds(parts, n => n === 'Pedal treads')!.min[2], inch(8.5), 40, 'low pedal ≈ 8.5 in');
  });
  withParts('stairmaster-8gx', {}, parts => {
    near(size(bounds(parts)!, 2), STAIRMASTER_8GX.H, 3, '8Gx height');
    const steps = bounds(parts, n => n === 'Step treads')!;
    near(size(steps, 2), 3 * STAIRMASTER_8GX.step + 4, 1, 'four steps at 9 in rise');
  });
  withParts('sole-e35', {}, parts => near(size(bounds(parts)!, 2), SOLE_E35.H, 3, 'E35 height'));
  withParts('waterrower-oak-s4', {}, parts => {
    near(size(bounds(parts)!, 2), WATERROWER.H, 1, 'WaterRower height');
    near(bounds(parts, n => n === 'Seat cushion')!.max[2], WATERROWER.seat, 25, 'seat height');
    near(size(bounds(parts, n => n === 'Water tank')!, 0), 544, 2, 'tank diameter');
  });
  withParts('waterrower-oak-s4', { pose: 1 }, parts => near(size(bounds(parts)!, 2), WATERROWER.L, 1, 'stands on end at its full length'));
  const colours = [0, 1, 2, 3].map(wood => withParts('waterrower-oak-s4', { wood }, parts => parts.find(p => p.name === 'Solid wood frame')!.color));
  assert.equal(new Set(colours).size, 4, 'each wood has its own colour');
});

test('params validate strictly, use areas sit behind the user, and machines place clear of the rack', () => {
  for (const p of PARTS) assert.deepEqual(validateFloorParams(p, {}), p.defaults, p.id);
  assert.deepEqual(validateFloorParams(part('sole-f63'), { pose: 1 }), { pose: 1 });
  for (const bad of [{ pose: 2 }, { speed: 1 }]) assert.throws(() => validateFloorParams(part('sole-f63'), bad), /treadmill/);
  assert.throws(() => validateFloorParams(part('waterrower-oak-s4'), { wood: 9 }), /rower/);
  assert.throws(() => validateFloorParams(part('peloton-bike'), { pose: 1 }), /bike/);
  assert.deepEqual(coerceFloorParams(part('stairmaster-8gx'), { console: 3 }), { console: 1 });
  // Treadmill use area: 2 m behind the belt (build +Y = floor -Z), none in front; folded, just the footprint.
  const inUse = resolveBy(part('sole-f63').clearance!, { pose: 0 }), fp = resolveBy(part('sole-f63').footprint, { pose: 0 });
  assert.equal(inUse.depth, fp.depth + 2000); assert.equal(inUse.offset![1], -1000); assert.equal(inUse.width, fp.width + 1220);
  assert.deepEqual(resolveBy(part('sole-f63').clearance!, { pose: 1 }), resolveBy(part('sole-f63').footprint, { pose: 1 }));
  for (const id of ['peloton-bike', 'sole-f63', 'nordictrack-commercial-1750', 'waterrower-oak-s4']) {
    const doc = addFloorItem(createAssembly(), id);
    assert.ok(!floorWarnings(doc).some(w => /overlaps the rack footprint/.test(w.message)), `${id} placed clear of the rack`);
    const items = [{ ...doc.floorItems![0], params: { ...doc.floorItems![0].params } }];
    assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(items))), items);
  }
});
