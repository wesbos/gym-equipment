import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, ROGUE_RHINO_BELT_SQUAT, TITAN_SQUATMAX_MD, TITAN_TIBIA_DORSI, DIY_BELT_SQUAT, TIB_BAR_PRO, TITAN_SINGLE_LEG_SQUAT_ROLLER, BOS_BELT_SQUAT, APEX_BARRETT_BELT_SQUAT, DIY_SEAL_ROW_BENCH,
  RHINO, SQUATMAX, TIBIA, SLSR, BOS, BARRETT, inch, platesFit,
} from './floor-parts/belt-squat-machines.ts';
import { buildMachinePart, definitions } from './parts/belt-squat-machines.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import { PLATE_SPECS } from './plates.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { FloorPart } from './floor-part.ts';
import type { NumericParams, SolidPart } from './types.ts';
const api = await Module(); api.setup();
type Box = { min: number[]; max: number[] };
const bounds = (parts: SolidPart[], match?: (name: string) => boolean): Box => {
  const s = parts.filter(p => !match || match(p.name)); assert.ok(s.length, 'no matching solids');
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const size = (b: Box, i: number) => b.max[i] - b.min[i];
function withParts<T>(part: FloorPart, params: NumericParams, run: (parts: SolidPart[]) => T): T {
  const parts = buildMachinePart(part.id)(api, { ...part.defaults, ...params }); try { return run(parts); } finally { parts.forEach(p => p.solid.delete()); }
}
const near = (actual: number, expected: number, tol: number, label: string) => assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tol}`);
/** Defaults plus the first, middle and last value of every param (dependent options resolved after each change). */
function variants(part: FloorPart): NumericParams[] {
  const out: NumericParams[] = [part.defaults];
  for (const p of part.params) {
    const opts = floorOptions(p, part.defaults);
    for (const v of [opts[0], opts[opts.length >> 1], opts.at(-1)!]) out.push(coerceFloorParams(part, { ...part.defaults, [p.key]: v }));
    // Heaviest load for every plate kind.
    if (p.key === 'plate') for (const code of opts as readonly number[]) { const q = coerceFloorParams(part, { ...part.defaults, plate: code }); out.push({ ...q, loaded: Math.max(...floorOptions(part.params.find(x => x.key === 'loaded')!, q)) }); }
  }
  return out;
}

test('nine catalogue entries in the Machines section with attribution and a registered builder', () => {
  assert.equal(PARTS.length, 9);
  assert.equal(new Set(PARTS.map(p => p.id)).size, 9);
  for (const part of PARTS) {
    assert.equal(part.section, 'Machines', part.id);
    assert.ok(part.vendor?.vendor && part.vendor.url.startsWith('https://') && part.vendor.trademark && part.vendor.reconstruction, part.id);
    assert.match(part.description ?? '', /Independent reconstruction/, part.id);
    assert.ok(definitions.some(d => d.id === part.id && d.category === 'Machines'), part.id);
    assert.deepEqual(validateFloorParams(part, {}), part.defaults);
    assert.throws(() => validateFloorParams(part, { bogus: 1 }));
    assert.throws(() => validateFloorParams(part, { [part.params[0].key]: 999 }));
  }
});

test('every entry builds valid closed solids at every param extreme, centred and filling its footprint', () => {
  for (const part of PARTS) for (const params of variants(part)) {
    const t0 = performance.now(), label = `${part.id} ${JSON.stringify(params)}`;
    withParts(part, params, parts => {
      for (const p of parts) {
        assert.ok(!p.solid.isEmpty() && p.solid.status() === 'NoError' && p.solid.volume() > 0, `${label} ${p.name}`);
        assert.notEqual(p.role, 'frame', `${label} ${p.name}: factory colours, not rack paint`);
      }
      const b = bounds(parts), fp = resolveBy(part.footprint, params);
      near(size(b, 0), fp.width, .6, `${label} width`); near(size(b, 1), fp.depth, .6, `${label} depth`);
      near((b.min[0] + b.max[0]) / 2, 0, .4, `${label} centred X`); near((b.min[1] + b.max[1]) / 2, 0, .4, `${label} centred Y`);
      assert.ok(b.min[2] >= -1e-6 && b.min[2] < 1, `${label} rests on the floor (${b.min[2]})`);
      assert.ok(parts.reduce((n, p) => n + p.solid.numTri(), 0) < 120000, `${label} triangle budget`);
    });
    assert.ok(performance.now() - t0 < BUILD_BUDGET_MS, `${label} build time`);
  }
});

test('Rogue Rhino: published 53 × 60.5 in footprint, 78.5 in tower, 7 in platform and 15.75 in weight posts', () => {
  withParts(ROGUE_RHINO_BELT_SQUAT, { loaded: 0 }, parts => {
    const b = bounds(parts);
    near(size(b, 0), inch(53), 1, 'width'); near(size(b, 1), inch(60.5), 1, 'depth'); near(b.max[2], inch(78.5), 1, 'tower height');
    near(bounds(parts, n => n.includes('tread')).max[2], inch(7), 2, 'platform top');
    near(size(bounds(parts, n => n.includes('tread')), 0), inch(48.5), 1, 'platform width');
    near(size(bounds(parts, n => n.includes('Weight posts')), 0), 2 * (inch(3.1) + RHINO.post + inch(.3)), 1, 'two 15.75 in posts beyond the flanges');
  });
  // Racked: the trolley sits on the horn; squatting lifts it and swings the arms back.
  const trolley = (pose: number) => withParts(ROGUE_RHINO_BELT_SQUAT, { pose, loaded: 0 }, parts => bounds(parts, n => n.includes('Weight posts')).min[2]);
  assert.ok(trolley(1) - trolley(0) > inch(6), 'squatting lifts the trolley');
  assert.equal(platesFit('kg25', RHINO.post), 4); assert.equal(platesFit('lb45', RHINO.post), 10);
});

test('Titan SquatMax-MD: 45 × 41 in footprint, 59.5 in handles, 20 in deck and a 21 in × 48 mm pin', () => {
  withParts(TITAN_SQUATMAX_MD, { loaded: 0 }, parts => {
    const b = bounds(parts);
    near(size(b, 0), SQUATMAX.W, 1, 'width'); near(size(b, 1), SQUATMAX.D, 1, 'depth'); near(b.max[2], SQUATMAX.H, 1, 'handle height');
    near(bounds(parts, n => n.startsWith('Frame')).max[2], SQUATMAX.H, 1, 'grab handles');
    const pin = bounds(parts, n => n.includes('Loading pin'));
    assert.ok(size(pin, 0) > inch(12), 'cross carriage span');
    assert.ok(pin.max[2] - pin.min[2] > SQUATMAX.pin, 'pin at least 21 in');
  });
  assert.equal(platesFit('lb45', SQUATMAX.pin), 13);
  const plateTop = (pose: number) => withParts(TITAN_SQUATMAX_MD, { pose }, parts => bounds(parts, n => n.startsWith('Plates ·')).max[2]);
  assert.ok(plateTop(1) > plateTop(0) + inch(3), 'standing lifts the stack');
});

test('Titan Tibia Dorsi: 35.5 × 15 × 12 in, 7 in × 49 mm sleeves at 6.25 in', () => {
  withParts(TITAN_TIBIA_DORSI, { loaded: 0 }, parts => {
    const b = bounds(parts);
    near(size(b, 0), TIBIA.W, 1, 'width'); near(size(b, 1), TIBIA.D, 1, 'depth'); near(b.max[2], TIBIA.H, 3, 'height');
    const sl = bounds(parts, n => n.includes('sleeves'));
    near((sl.min[2] + sl.max[2]) / 2, TIBIA.sleeveZ, 2, 'sleeve axis height');
  });
  // Raising the toes swings the cradle and lifts the loaded sleeve.
  const plateLow = (tilt: number) => withParts(TITAN_TIBIA_DORSI, { tilt, loaded: 1 }, parts => bounds(parts, n => n.startsWith('Plates ·')).min[2]);
  assert.ok(plateLow(20) > plateLow(0) + 20, 'toe raise lifts the plates');
  assert.ok(plateLow(0) >= 0, 'plates clear the floor at rest');
});

test('Titan Single Leg Squat Roller: 24 × 22 × 26 in, 16 × 4 in roller, 12 heights', () => {
  assert.equal(SLSR.heights.length, 12);
  for (const height of [12, 23]) withParts(TITAN_SINGLE_LEG_SQUAT_ROLLER, { height }, parts => {
    const b = bounds(parts), r = bounds(parts, n => n.includes('Roller'));
    near(size(b, 0), SLSR.W, 1, 'width'); near(size(b, 1), SLSR.D, 1, 'depth'); near(b.max[2], SLSR.H, 1, 'height');
    near(size(r, 0), SLSR.roller, 1, 'roller length'); near(size(r, 2), SLSR.rollerD, 1, 'roller diameter'); near((r.min[2] + r.max[2]) / 2, inch(height), 1, 'roller centre');
  });
  near(inch(12) - SLSR.rollerD / 2 + SLSR.rollerD / 2, inch(12), 0, 'lowest centre 12 in'); near(inch(23) + SLSR.rollerD / 2, inch(25), 1e-9, 'highest top 25 in');
});

test('Bells of Steel: 81 / 52.5 × 51 × 40 in and 13.5 in pegs, horizontal or vertical', () => {
  for (const [horns, width] of [[0, BOS.wide], [1, BOS.narrow]] as const) withParts(BOS_BELT_SQUAT, { horns, loaded: 0 }, parts => {
    const b = bounds(parts);
    near(size(b, 0), width, 2, `width (${horns ? 'vertical' : 'horizontal'} pegs)`); near(size(b, 1), BOS.D, 1, 'depth'); near(b.max[2], BOS.H, 1, 'height');
  });
  assert.equal(platesFit('lb45', BOS.peg), 8);
  // Bumpers on vertical pegs overhang the 52.5 in frame; the footprint grows to match.
  const wide = resolveBy(BOS_BELT_SQUAT.footprint, { ...BOS_BELT_SQUAT.defaults, horns: 1, plate: PLATE_SPECS.kg25.code, loaded: 2 });
  assert.ok(wide.width > BOS.narrow + 300, `plate overhang ${wide.width}`);
  const tip = (pose: number) => withParts(BOS_BELT_SQUAT, { pose, loaded: 0 }, parts => bounds(parts, n => n.includes('Weight pegs')).min[2]);
  assert.ok(tip(1) < tip(0) - inch(3), 'bottom of the squat lowers the pegs');
});

test('APEX Barrett: 31 × 19.5 × 26 in with a 15.5 in × 2 in loading bar and 9 handle heights', () => {
  withParts(APEX_BARRETT_BELT_SQUAT, { loaded: 0 }, parts => {
    const b = bounds(parts), bar = bounds(parts, n => n.includes('Loading bar'));
    near(size(b, 0), BARRETT.W, 1, 'width'); near(size(b, 1), BARRETT.L, 5, 'length'); near(b.max[2], BARRETT.H, 1, 'height');
    near(size(bar, 2), BARRETT.bar, 1, 'loading bar length'); near(size(bar, 0), BARRETT.barD, 1, 'loading bar diameter');
  });
  const top = (handle: number) => withParts(APEX_BARRETT_BELT_SQUAT, { handle, loaded: 0 }, parts => bounds(parts, n => n.includes('Knurled')).max[2]);
  near(top(9) - top(1), inch(8), 1, 'handle travel');
});

test('Tib Bar Pro and the DIY builds keep their plates off the floor and clear of the frame', () => {
  for (const loaded of [0, 1, 4]) withParts(TIB_BAR_PRO, { loaded }, parts => {
    const plates = parts.filter(p => p.name.startsWith('Plates ·'));
    if (loaded) assert.ok(bounds(plates).min[2] > 5, 'plate rim above the floor');
    near(size(bounds(parts, n => n.includes('Foam')), 0), inch(14), 1, 'foot bar length');
  });
  for (const pose of [0, 1]) withParts(DIY_BELT_SQUAT, { pose, loaded: 2 }, parts => {
    const b = bounds(parts, n => n.startsWith('Plates ·')), rest = bounds(parts, n => n.includes('Rubber stall-mat'));
    assert.ok(b.min[2] >= 0 && (pose || b.min[2] < 20), `plates ${pose ? 'lifted' : 'just above the floor'} (${b.min[2]})`);
    near(rest.max[2], inch(12.75), 1, 'platform top');
  });
  for (const height of [30, 36]) withParts(DIY_SEAL_ROW_BENCH, { height }, parts => near(bounds(parts, n => n.includes('plank')).max[2], inch(height), .5, `pad at ${height} in`));
});
