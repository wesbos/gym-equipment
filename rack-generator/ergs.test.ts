import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { AIR_BIKES, BIKEERG, C2_ROWER, ECHO_ROWER, PARTS, SKI_ERGS, skiMount } from './floor-parts/ergs.ts';
import { definitions } from './parts/ergs.ts';
import { c2Layout } from './parts/ergs-rowers.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import { addFloorItem, floorWarnings, validateFloorItems } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import type { NumericParams, SolidPart } from './types.ts';

const api = await Module(); api.setup();
const part = (id: string) => PARTS.find(p => p.id === id)!;
const build = (id: string, params: NumericParams = {}) => definitions.find(d => d.id === id)!.build(api, { ...part(id).defaults, ...params });
const bounds = (parts: SolidPart[], filter: (p: SolidPart) => boolean = () => true) => {
  const s = parts.filter(filter); if (!s.length) return undefined;
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const size = (b: { min: number[]; max: number[] }) => b.max.map((v, i) => v - b.min[i]);
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
/** First, middle and last option of every param (dependent options resolved in order). */
function variants(id: string): NumericParams[] {
  let out: NumericParams[] = [{ ...part(id).defaults }];
  for (const p of part(id).params) out = out.flatMap(v => { const o = floorOptions(p, v); return [...new Set([o[0], o[o.length >> 1], o[o.length - 1]])].map(x => ({ ...v, [p.key]: x })); });
  return [part(id).defaults, ...out];
}
const within = (actual: number, expected: number, tol: number, what: string) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual.toFixed(1)} vs ${expected} ±${tol}`);

test('the ergs family registers every product with vendor attribution in the Cardio section', () => {
  assert.deepEqual(PARTS.map(p => p.id).sort(), ['assault-airbike-classic', 'bos-blitz-air-bike', 'concept2-bikeerg', 'concept2-model-c', 'concept2-model-d', 'concept2-rowerg', 'concept2-skierg',
    'rep-strive-air-bike', 'rogue-echo-bike', 'rogue-echo-rower', 'rogue-echo-ski', 'schwinn-airdyne-ad6', 'schwinn-airdyne-ad7']);
  for (const p of PARTS) {
    assert.equal(p.section, 'Cardio', p.id);
    assert.ok(p.vendor?.vendor && p.vendor.url.startsWith('https://') && p.vendor.trademark && p.vendor.reconstruction, p.id);
    assert.match(p.description ?? '', /Independent reconstruction .*trademarks belong to/, p.id);
    assert.ok(definitions.some(d => d.id === p.id), p.id);
  }
});

test('every product and param extreme builds closed solids that fill its footprint exactly', () => {
  for (const p of PARTS) for (const v of variants(p.id)) {
    const parts = build(p.id, v), label = `${p.id} ${JSON.stringify(v)}`;
    for (const s of parts) {
      assert.ok(!s.solid.isEmpty() && s.solid.status() === 'NoError' && s.solid.volume() > 0, `${label} ${s.name}`);
      assert.notEqual(s.role, 'frame', `${label} ${s.name}: factory colours, not rack paint`);
    }
    const b = bounds(parts)!, fp = resolveBy(p.footprint, v);
    assert.ok(b.min[2] >= -1e-6 && b.min[2] < 1, `${label} rests on the floor`);
    within(b.max[0] - b.min[0], fp.width, 1, `${label} width`);
    within(b.max[1] - b.min[1], fp.depth, 1, `${label} depth`);
    within((b.max[0] + b.min[0]) / 2, 0, 1e-6, `${label} centred X`); within((b.max[1] + b.min[1]) / 2, 0, 1e-6, `${label} centred Y`);
    assert.ok(parts.reduce((n, s) => n + s.solid.numTri(), 0) < 80000, `${label} triangle budget`);
    free(parts);
  }
});

test('Concept2 rowers match the published RowErg envelope, seat heights and monorail', () => {
  for (const [legs, seat] of [[0, 14], [1, 20]]) {
    const parts = build('concept2-rowerg', { legs }), b = size(bounds(parts)!);
    within(b[0], C2_ROWER.width, 1, 'width 24 in'); within(b[1], C2_ROWER.length, 1, 'length 96 in');
    within(bounds(parts, s => s.name === 'Seat')!.max[2], seat * 25.4, 8, `seat height ${seat} in`);
    within(size(bounds(parts, s => s.name === 'Monorail')!)[1], 1372 - 10, 2, 'monorail 54 in (less the end cap)');
    free(parts);
  }
  const L = c2Layout({ model: 'rowerg', tall: false, colour: 0, monitor: 'pm5', storage: false });
  within(L.railFront - L.rearY, 1372, 1e-9, 'monorail 54 in');
  assert.deepEqual(resolveBy(part('concept2-rowerg').clearance!, { legs: 0, pose: 0 }), { width: 1220, depth: 2740 }, '9 × 4 ft use area');
  // Model D and C share the envelope; every colour / monitor combination stays inside it.
  for (const id of ['concept2-model-d', 'concept2-model-c']) { const parts = build(id), b = size(bounds(parts)!); within(b[0], 610, 1, id); within(b[1], 2440, 1, id); free(parts); }
});

test('the separated storage pose stands 54 in tall in two pieces close to the published storage box', () => {
  for (const [id, params, published] of [['concept2-rowerg', { legs: 0, pose: 1 }, C2_ROWER.storage.standard], ['concept2-rowerg', { legs: 1, pose: 1 }, C2_ROWER.storage.tall],
    ['concept2-model-d', { pose: 1 }, C2_ROWER.storage.standard], ['concept2-model-c', { pose: 1 }, C2_ROWER.storage.standard]] as const) {
    const parts = build(id, params), b = size(bounds(parts)!), rail = bounds(parts, s => s.name.startsWith('Monorail · '))!, front = bounds(parts, s => !s.name.startsWith('Monorail · '))!;
    within(b[2], C2_ROWER.storage.height, 1, `${id} stored height = 54 in monorail on end`);
    within(size(rail)[2], C2_ROWER.storage.height, 1, 'monorail stands on its rear end');
    assert.ok(rail.min[2] < 1 && front.min[2] < 1, 'both pieces rest on the floor');
    assert.ok(Math.abs(b[0] - published.width) / published.width < .07, `${id} stored width within 7% of published`);
    assert.ok(Math.abs(b[1] - published.depth) / published.depth < .15, `${id} stored depth within 15% of published`);
    // Caster wheels and the housing rim both carry the tipped front section.
    within(bounds(parts, s => s.name === 'Caster wheels')!.min[2], 0, 1, 'casters on the floor');
    within(bounds(parts, s => s.name === 'Flywheel housing')!.min[2], 0, 3, 'housing rim on the floor');
    free(parts);
  }
});

test('Rogue Echo Rower matches its published length, width, seat height and folds up on its hinge', () => {
  let parts = build('rogue-echo-rower'), b = size(bounds(parts)!);
  within(b[0], ECHO_ROWER.width, 1, '26 in'); within(b[1], ECHO_ROWER.length, 1, '99 in');
  within(bounds(parts, s => s.name === 'Seat')!.max[2], 16 * 25.4, 2, '16 in seat');
  free(parts);
  parts = build('rogue-echo-rower', { pose: 1 }); b = size(bounds(parts)!);
  within(b[0], ECHO_ROWER.folded.width, 1, 'folded width 26 in');
  assert.ok(Math.abs(b[1] - ECHO_ROWER.folded.depth) / ECHO_ROWER.folded.depth < .06, 'folded depth within 6% of 38 in');
  const rail = bounds(parts, s => s.name.startsWith('Monorail · '))!;
  assert.ok(size(rail)[2] > 1300 && size(rail)[1] < 450, 'monorail stands vertical (depth = rear leg to seat top)');
  within(bounds(parts, s => s.name === 'Turf tyres')!.min[2], 0, 1, 'front tyres on the floor'); within(bounds(parts, s => s.name === 'Flywheel housing')!.min[2], 0, 1, 'housing on the floor');
  free(parts);
});

test('BikeErg matches its footprint, use area and published seat-to-pedal range', () => {
  for (const seat of BIKEERG.seat) {
    // Saddle top to the pedal at the bottom of its stroke (170 mm crank round the drive centre).
    const parts = build('concept2-bikeerg', { seat }), drive = bounds(parts, s => s.name === 'Drive cover')!, pedalLow = (drive.min[2] + drive.max[2]) / 2 - 170 - 12;
    within(pedalLow, BIKEERG.pedalLow, 1, 'lowest pedal');
    within(bounds(parts, s => s.name === 'Saddle')!.max[2] - pedalLow, seat * 25.4, 1, `${seat} in seat to pedal`);
    free(parts);
  }
  const low = build('concept2-bikeerg', { bars: 0 }), high = build('concept2-bikeerg', { bars: 10 });
  within(bounds(high, s => s.name === 'Handlebars')!.max[2] - bounds(low, s => s.name === 'Handlebars')!.max[2], 254, 1, '10 in handlebar travel');
  free(low); free(high);
  assert.deepEqual(resolveBy(part('concept2-bikeerg').clearance!, part('concept2-bikeerg').defaults), { width: 1219, depth: 1524 }, '60 × 48 in clearance for use');
});

test('ski ergs match the published height and every mount envelope', () => {
  for (const brand of ['c2', 'echo'] as const) SKI_ERGS[brand].mounts.forEach((m, mount) => {
    const id = brand === 'c2' ? 'concept2-skierg' : 'rogue-echo-ski', parts = build(id, { mount }), b = size(bounds(parts)!);
    within(b[2], SKI_ERGS[brand].height, 1, `${id} height`); within(b[0], m.box.width, 1, `${id} ${m.label} width`); within(b[1], m.box.depth, 1, `${id} ${m.label} depth`);
    assert.equal(parts.some(s => s.name === 'Platform plywood'), 'stand' in m, `${m.label} platform`);
    const c = skiMount(brand, { mount }).clearance; assert.ok(c.width > m.box.width && c.depth > m.box.depth, 'use area surrounds the machine');
    free(parts);
  });
  assert.equal(inchRound(SKI_ERGS.c2.height), 85);
});
const inchRound = (mm: number) => Math.round(mm / 25.4);

test('air bikes hit their published length, width and height', () => {
  const ids = { echo: 'rogue-echo-bike', assault: 'assault-airbike-classic', blitz: 'bos-blitz-air-bike', strive: 'rep-strive-air-bike', ad7: 'schwinn-airdyne-ad7', ad6: 'schwinn-airdyne-ad6' } as const;
  for (const [key, id] of Object.entries(ids)) {
    const spec = AIR_BIKES[key as keyof typeof AIR_BIKES], parts = build(id), b = size(bounds(parts)!);
    within(b[0], spec.width, 1, `${id} width`); within(b[1], spec.length, 1, `${id} length`); within(b[2], spec.height, 1, `${id} height`);
    assert.ok(parts.some(s => s.name === 'Fan blades') && parts.some(s => s.role === 'handle'), `${id} fan and grips`);
    free(parts);
  }
  // Echo: 27 in fan (blades) inside the steel-wire guard.
  const echo = build('rogue-echo-bike'); within(size(bounds(echo, s => s.name === 'Fan blades')!)[1], 686, 30, '27 in fan'); free(echo);
});

test('params validate strictly, coerce for UI edits, and persist on floor items', () => {
  for (const p of PARTS) assert.deepEqual(validateFloorParams(p, {}), p.defaults, p.id);
  for (const [id, bad] of [['concept2-rowerg', { legs: 2 }], ['concept2-rowerg', { pose: 3 }], ['concept2-model-d', { monitor: 3 }], ['concept2-model-c', { colour: 1 }], ['concept2-skierg', { mount: 3 }],
    ['rogue-echo-ski', { mount: 2 }], ['concept2-bikeerg', { seat: 32 }], ['concept2-bikeerg', { bars: 11 }], ['rogue-echo-bike', { fan: 1 }], ['rogue-echo-rower', { pose: 2 }]] as const)
    assert.throws(() => validateFloorParams(part(id), bad), new RegExp(part(id).noun), `${id} ${JSON.stringify(bad)}`);
  assert.deepEqual(coerceFloorParams(part('concept2-bikeerg'), { seat: 36, bars: 9 }), { seat: 35, bars: 10 });
  assert.deepEqual(coerceFloorParams(part('concept2-skierg'), { mount: 7 }), { mount: 2 });
  const doc = addFloorItem(createAssembly(), 'concept2-rowerg'), [item] = doc.floorItems!;
  assert.deepEqual(floorWarnings(doc), [], 'suggested placement clears the rack and its use area');
  const stored = [{ ...item, params: { legs: 1, pose: 1 } }];
  assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(stored))), stored);
});
