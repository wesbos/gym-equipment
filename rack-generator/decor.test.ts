/** Room decor family (#201): every entry builds valid solids across its params, stays inside its footprint (floor) or
 * face (wall), keeps the published or estimated key dimensions, and validates its params strictly. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { PARTS as FLOOR } from './floor-parts/decor.ts';
import { PARTS as WALL, inch, SONOS_FIVE, bayLayout } from './wall-parts/decor.ts';
import { definitions as floorDefs } from './parts/decor.ts';
import { definitions as wallDefs } from './parts/decor-wall.ts';
import { resolveBy, validateFloorParams, coerceFloorParams, floorOptions, type FloorPart } from './floor-part.ts';
import { wallFace, type WallPart } from './wall-part.ts';
import { wallOpenings } from './wall-items.ts';
import { resolveMaterial } from './appearance.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import { textWidth, FONT_CHARS } from './parts/decor-kit.ts';
import type { NumericParams, SolidPart } from './types.ts';

const api = await Module();
api.setup();
const defs = new Map([...floorDefs, ...wallDefs].map(d => [d.id, d]));
type Box = { min: number[]; max: number[] };
function build(id: string, params: NumericParams) {
  const t = performance.now(), parts = defs.get(id)!.build(api, params), ms = performance.now() - t;
  try {
    const box: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    let tris = 0;
    for (const p of parts) {
      assert.equal(p.solid.status(), 'NoError', `${id} ${p.name}`);
      assert.ok(!p.solid.isEmpty() && p.solid.volume() > 0, `${id} ${p.name}: positive volume`);
      const b = p.solid.boundingBox();
      for (let i = 0; i < 3; i++) { box.min[i] = Math.min(box.min[i], b.min[i]); box.max[i] = Math.max(box.max[i], b.max[i]); }
      tris += p.solid.numTri();
    }
    return { box, tris, ms, names: parts.map(p => p.name), parts: parts.map(({ name, role, color, emissive }) => ({ name, role, color, emissive }) as Partial<SolidPart>) };
  } finally { parts.forEach(p => p.solid.delete()); }
}
/** Defaults plus first, middle and last option of every param (the others at defaults), skipping combos validate rejects. */
function variants(part: FloorPart | WallPart) {
  const out: NumericParams[] = [part.defaults];
  for (const param of part.params) {
    const options = floorOptions(param, part.defaults);
    for (const v of new Set([options[0], options[Math.floor(options.length / 2)], options.at(-1)!])) {
      const p = { ...part.defaults, [param.key]: v };
      try { part.validate?.(p); out.push(p); } catch { /* rejected combination */ }
    }
  }
  return out;
}
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a.toFixed(1)} vs ${b.toFixed(1)} (±${tol})`);

for (const part of FLOOR)
  test(`${part.id}: valid solids inside the footprint for its param range`, () => {
    for (const params of variants(part)) {
      const { box, tris, ms } = build(part.id, params), fp = resolveBy(part.footprint, params);
      if (part.id === 'big-ass-fans-i6') {
        // A fan's footprint is its swept disc: the first blade reaches the tip radius along +X, and nothing leaves the disc.
        near(box.max[0], fp.width / 2, 3, 'fan tip radius');
        for (let i = 0; i < 2; i++) assert.ok(box.min[i] >= -fp.width / 2 - .01 && box.max[i] <= fp.width / 2 + .01, 'fan inside its disc');
      } else {
        near(box.max[0] - box.min[0], fp.width, 3, `${part.id} ${JSON.stringify(params)} width`);
        near(box.max[1] - box.min[1], fp.depth, 3, `${part.id} ${JSON.stringify(params)} depth`);
        near((box.max[0] + box.min[0]) / 2, 0, 3, `${part.id} centred on X`);
        near((box.max[1] + box.min[1]) / 2, 0, 3, `${part.id} centred on Y`);
      }
      assert.ok(box.min[2] >= -.01, `${part.id} stays above the floor`);
      if ('ceiling' in params) near(box.max[2], params.ceiling, 1, `${part.id} reaches the ceiling`);
      assert.ok(tris < 80000, `${part.id}: ${tris} triangles`);
      assert.ok(ms < BUILD_BUDGET_MS, `${part.id}: ${ms.toFixed(0)} ms`);
    }
  });
for (const part of WALL)
  test(`${part.id}: valid solids on the face for its param range`, () => {
    for (const params of variants(part)) {
      const { box, tris, ms } = build(part.id, params), face = wallFace(part, params);
      // The bay's walls wrap outward past its mouth, behind the wall plane.
      if (part.id === 'decor-bay-window') assert.ok(box.max[0] - box.min[0] >= face.width && box.max[0] - box.min[0] <= face.width + 400 && box.min[1] > -20, 'bay behind its mouth');
      else near(box.max[0] - box.min[0], face.width, 3, `${part.id} ${JSON.stringify(params)} width`);
      near(box.max[2] - box.min[2], face.height, 3, `${part.id} ${JSON.stringify(params)} height`);
      near((box.max[2] + box.min[2]) / 2, 0, 3, `${part.id} centred on the face`);
      if (part.id !== 'decor-bay-window' && !params.standoff) assert.ok(box.min[1] < -1, `${part.id} stands proud of the wall`);
      if (params.standoff) assert.ok(box.max[1] <= -params.standoff + .01, `${part.id} sits wholly in front of its standoff`);
      assert.ok(tris < 80000, `${part.id}: ${tris} triangles`);
      assert.ok(ms < BUILD_BUDGET_MS, `${part.id}: ${ms.toFixed(0)} ms`);
    }
  });

test('params validate strictly and coerce to allowed options', () => {
  for (const part of [...FLOOR, ...WALL]) {
    assert.deepEqual(validateFloorParams(part, part.defaults), part.defaults);
    assert.throws(() => validateFloorParams(part, { ...part.defaults, bogus: 1 }));
    for (const param of part.params) assert.throws(() => validateFloorParams(part, { ...part.defaults, [param.key]: -12345 }), `${part.id} ${param.key}`);
    const coerced = coerceFloorParams(part, Object.fromEntries(part.params.map(p => [p.key, part.defaults[p.key] + .4])));
    assert.doesNotThrow(() => validateFloorParams(part, coerced));
    assert.ok(part.vendor?.reconstruction && part.vendor.trademark && /^https:\/\//.test(part.vendor.url), `${part.id} attribution`);
  }
});

test('published and estimated key dimensions', () => {
  // Sonos Five: 203 × 364 × 154 mm on a 26 mm bracket.
  const five = build('sonos-five-wall-mount', { orientation: 0, color: 0 }).box;
  near(five.max[0] - five.min[0], SONOS_FIVE.w, 1, 'Five width'); near(five.max[2] - five.min[2], SONOS_FIVE.h, 1, 'Five height'); near(-five.min[1], SONOS_FIVE.d + SONOS_FIVE.bracket, 1, 'Five depth');
  // A 60″ i6 spans 1524 mm; the 3-1/2″ lally column is 88.9 mm round on 6″ plates.
  const fan = build('big-ass-fans-i6', { diameter: 0, blades: 1, downrod: 0, ceiling: 2750 }).box;
  near(fan.max[0] - fan.min[0], inch(60), 3, 'i6 span');
  // An 8 ft Levrack is 8′6″ long; its workstation top stands at 36″.
  const lev = build('levrack-mobile-storage', { length: 1, depth: 0, height: 0 }).box;
  near(lev.max[0] - lev.min[0], inch(102), 1, '8 ft Levrack length'); near(lev.max[2], inch(84), 1, '7 ft Levrack height');
  const bench = build('levrack-workstation', { length: 0, drawers: 2, slatwall: 0 }).box;
  near(bench.max[2], inch(36), 1, 'Workstation top height');
  // Doors are 80″ slabs; windows keep their nominal rough opening inside the casing.
  const door = build('decor-interior-door', { width: 32, open: 0, standoff: 0 }).box;
  near(door.max[2] - door.min[2], inch(80) + 64, 1, 'Door height with head casing');
  const bay = bayLayout({ width: 4200, depth: 1100 });
  assert.ok(bay.backWindow > inch(60) && bay.sideWindow > inch(30), 'Coop’s bay: a big picture window flanked by two windows');
});

test('openings cut the wall finish for recessed windows, doors and the bay, never on a standoff', () => {
  const room = { back: 1500, left: 3000, right: 3000, front: 3000, height: 2750 };
  const doc = { room, wallItems: [
    { id: 'wall-1', part: 'decor-window', wall: 'back', position: [0, 2000], params: { style: 0, width: 36, height: 16, standoff: 0 } },
    { id: 'wall-2', part: 'decor-window', wall: 'back', position: [1500, 2000], params: { style: 0, width: 36, height: 16, standoff: 1200 } },
    { id: 'wall-3', part: 'decor-interior-door', wall: 'left', position: [0, 1048], params: { width: 32, open: 1, standoff: 0 } },
    { id: 'wall-4', part: 'decor-bay-window', wall: 'right', position: [0, 1325], params: { width: 4200, depth: 1100, mouth: 2650, sill: 800, head: 2250 } },
  ] } as Parameters<typeof wallOpenings>[0];
  const openings = wallOpenings(doc);
  assert.deepEqual(openings.map(o => o.id), ['wall-1', 'wall-3', 'wall-4']);
  near(openings[0].max[0] - openings[0].min[0], inch(36), .01, 'window rough opening');
  near(openings[2].max[0] - openings[2].min[0], 4200, .01, 'bay mouth');
});

test('lights, glass and screens are self-lit; the font covers the banner and header words', () => {
  const led = build('he-williams-linear-led', { sections: 2, ceiling: 2750 }).parts.find(p => p.emissive);
  assert.ok(led, 'LED lens glows');
  assert.equal(resolveMaterial(led as SolidPart).emissiveIntensity, led!.emissive);
  assert.ok(build('decor-window', { style: 1, width: 48, height: 24, standoff: 0 }).parts.some(p => p.emissive), 'window glass glows');
  assert.equal(resolveMaterial({ role: 'source', color: '#123456' }).emissive, undefined, 'ordinary parts are unchanged');
  for (const word of ['AMERICAN MADE', 'STAY', 'WEIRD', 'LEVRACK']) assert.ok([...word].every(c => FONT_CHARS.includes(c)) && textWidth(word) > 0, word);
});
