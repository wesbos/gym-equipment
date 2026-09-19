import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
  PARTS, CURL_SPECS, OPEN_TRAP_SPECS, MULTI_GRIP_SPECS, TB2, TITAN_AXLES, FRINGE_AXLE, FRINGE_STUBBY, axleSleeve, curlSleeve, openTrapLayout, openTrapSleeve,
  multiGripLength, multiGripSleeve, barAxisZ, type CurlId, type MultiGripId, type OpenTrapId,
} from './floor-parts/trap-curl-axle-bars.ts';
import { definitions } from './parts/trap-curl-axle-bars.ts';
import { coerceFloorParams, floorOptions, floorPart, resolveBy, validateFloorParams } from './floor-registry.ts';
import { addFloorItem } from './floor-items.ts';
import { createAssembly } from './assembly.ts';
import type { NumericParams, SolidPart } from './types.ts';
import { barSpec, parkedPose } from './barbell-cradles.ts';
import {BUILD_BUDGET_MS} from './test-budget.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
const build = (id: string, p: NumericParams) => definitions.find(d => d.id === id)!.build(api, p);
const bounds = (parts: SolidPart[], name?: string) => {
  const s = parts.filter(p => !name || p.name === name); assert.ok(s.length, `${name} present`);
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
/** Defaults plus the first, middle and last option of every param, with dependent params coerced. */
function variants(id: string): NumericParams[] {
  const part = floorPart(id)!, out: NumericParams[] = [part.defaults];
  for (const param of part.params) {
    const options = floorOptions(param, part.defaults);
    for (const v of new Set([options[0], options[options.length >> 1], options.at(-1)!])) out.push(coerceFloorParams(part, { ...part.defaults, [param.key]: v }));
  }
  return out;
}

test('eighteen #109 bars register with Barbells section, vendor credit and honest reconstruction notes', () => {
  assert.equal(PARTS.length, 18);
  assert.equal(new Set(PARTS.map(p => p.id)).size, 18);
  for (const part of PARTS) {
    assert.equal(part.section, 'Barbells', part.id);
    assert.ok(part.vendor?.vendor && part.vendor.url.startsWith('https://') && part.vendor.trademark && /estimated/i.test(part.vendor.reconstruction), part.id);
    assert.match(part.description ?? '', /Independent reconstruction; .+ trademarks belong to .+\.$/, part.id);
    assert.ok(definitions.some(d => d.id === part.id), `${part.id} builder`);
  }
  // Rackable bars park in cradles; trap bars and short curl bars live on the floor.
  const parks = PARTS.filter(p => p.parks).map(p => p.id).sort();
  assert.deepEqual(parks, ['bos-arch-nemesis-swiss-bar', 'fringe-sport-20kg-axle-bar', 'fringe-sport-stubby-axle-bar', 'kabuki-kadillac-bar', 'rep-cambered-swiss-bar', 'rep-rackable-curl-bar',
    'rogue-mg-4cn-multi-grip-camber-bar', 'rogue-rackable-curl-bar', 'titan-axle-barbell', 'titan-multi-grip-barbell']);
});

test('every bar builds closed solids for every param extreme, bounded by its footprint on the floor', () => {
  for (const part of PARTS) for (const p of variants(part.id)) {
    const t0 = performance.now(), parts = build(part.id, p), ms = performance.now() - t0;
    let tris = 0;
    for (const s of parts) {
      assert.ok(!s.solid.isEmpty() && s.solid.status() === 'NoError' && s.solid.volume() > 0, `${part.id} ${JSON.stringify(p)} ${s.name}`);
      assert.notEqual(s.role, 'frame', `${part.id}: factory colours, not rack paint`);
      tris += s.solid.numTri();
    }
    const b = bounds(parts), fp = resolveBy(part.footprint, p);
    assert.ok(Math.abs(b.max[0] - b.min[0] - fp.width) < .05 && Math.abs(b.max[1] - b.min[1] - fp.depth) < .05, `${part.id} ${JSON.stringify(p)} footprint ${fp.width}×${fp.depth} vs ${(b.max[0] - b.min[0]).toFixed(2)}×${(b.max[1] - b.min[1]).toFixed(2)}`);
    assert.ok(Math.abs(b.min[0] + b.max[0]) < 1e-6 && Math.abs(b.min[1] + b.max[1]) < 1e-6 && Math.abs(b.min[2]) < 1e-6, `${part.id} centred on the floor`);
    assert.ok(tris < 80000, `${part.id} ${tris} triangles`);
    if (p === part.defaults) assert.ok(ms < BUILD_BUDGET_MS, `${part.id} built in ${ms.toFixed(0)} ms`);
    // The sleeve axis sits where barAxisZ says (the end caps are centred on it).
    const caps = parts.find(s => /end caps|tube ends|pipe ends|end badges/.test(s.name))!, cb = caps.solid.boundingBox();
    assert.ok(Math.abs((cb.min[2] + cb.max[2]) / 2 - barAxisZ(part.id, p)) < .05, `${part.id} axis at ${((cb.min[2] + cb.max[2]) / 2).toFixed(2)}`);
    free(parts);
  }
});

test('published lengths, sleeves and shaft diameters come out of the builds', () => {
  const tol = (a: number, b: number, t: number, msg: string) => assert.ok(Math.abs(a - b) <= t, `${msg}: ${a.toFixed(1)} vs ${b.toFixed(1)}`);
  // Axles: 2" tubes, published grip and sleeve lengths.
  tol(axleSleeve(TITAN_AXLES[0]), inch(15.5), 1, 'Titan 84" sleeve'); tol(axleSleeve(TITAN_AXLES[1]), inch(8), 1, 'Titan 60" sleeve');
  tol(axleSleeve(FRINGE_AXLE), inch(15.5), .1, 'Fringe sleeve'); tol(axleSleeve(FRINGE_STUBBY), inch(9), .1, 'Stubby sleeve');
  for (const [id, len, dia] of [['titan-axle-barbell', inch(84), 50.3], ['fringe-sport-20kg-axle-bar', inch(84), 50.8], ['fringe-sport-stubby-axle-bar', inch(70.75), 50.8]] as const) {
    const parts = build(id, {}), grip = bounds(parts, '2" axle grip (unknurled)'), all = bounds(parts);
    tol(all.max[0] - all.min[0], len, .1, `${id} length`); tol(grip.max[1] - grip.min[1], dia, .01, `${id} grip diameter`); free(parts);
  }
  // Curl bars: overall length, collar spacing, sleeves, shaft.
  const curl: [CurlId, number, number, number][] = [['rogue-curl-bar', inch(54.5), inch(31.5), inch(10.5)], ['rogue-rackable-curl-bar', inch(74.75), inch(51.8125), inch(10.5)],
    ['rep-rackable-curl-bar', inch(74), inch(51), inch(10)], ['cap-olympic-ez-curl-bar', 1200, inch(32), inch(7.5)], ['bos-ez-curl-bar-45', 1143, 752, inch(7)]];
  for (const [id, len, between, sleeve] of curl) {
    const s = CURL_SPECS[id], parts = build(id, {}), all = bounds(parts), collars = bounds(parts, 'Sleeve collars');
    tol(all.max[0] - all.min[0], len, .1, `${id} length`); tol(collars.max[0] - collars.min[0] - 2 * s.collarWidth, between, .1, `${id} between sleeves`);
    tol(curlSleeve(s), sleeve, 6, `${id} loadable sleeve`);
    const knurl = bounds(parts, 'Knurled cambered grips');
    assert.ok(knurl.max[1] - knurl.min[1] > s.shaftDia + 40, `${id} knurl rides the bends`);
    free(parts);
  }
  // Trap bars.
  const rep = OPEN_TRAP_SPECS['rep-open-trap-bar'];
  tol(openTrapSleeve(rep), inch(16.5), 3, 'REP sleeve'); tol(openTrapSleeve(OPEN_TRAP_SPECS['kabuki-trap-bar-hd']), 431.8, .1, 'Kabuki 17" sleeve');
  tol(openTrapSleeve(OPEN_TRAP_SPECS['bos-open-trap-bar']), 247, .1, 'BoS sleeve');
  tol(openTrapSleeve(OPEN_TRAP_SPECS['giant-northland-open-trap-hex-bar'], { sleeves: 1 }), inch(10), .1, 'Giant short sleeve');
  for (const [id, len, inner, low, high] of [['rep-open-trap-bar', inch(84.3), inch(25), inch(8.3), inch(11.3)], ['kabuki-trap-bar-hd', 1955.8, 635, 247.7, 323.9]] as [OpenTrapId, number, number, number, number][]) {
    const flat = build(id, { ...floorPart(id)!.defaults, pose: 1 }), all = bounds(flat), l = openTrapLayout(OPEN_TRAP_SPECS[id], {});
    tol(all.max[0] - all.min[0], len, .1, `${id} length`); tol(l.inner, inner, .01, `${id} handle spacing`);
    // With 450 mm plates on, the in-line and high handles sit at the published loaded heights.
    const axis = barAxisZ(id, { pose: 1 }), grips = bounds(flat, 'Knurled handles');
    tol(grips.min[2] + OPEN_TRAP_SPECS[id].handles.dia / 2 - axis + 225, low, .5, `${id} low handle`);
    tol(grips.max[2] - OPEN_TRAP_SPECS[id].handles.dia / 2 - axis + 225, high, .5, `${id} high handle`);
    free(flat);
  }
  const jack = build('rep-open-trap-bar', {}), j = bounds(jack); tol(j.max[1] - j.min[1] < 200 ? j.max[2] : 0, 240 + 430 + 22.5, 1, 'REP jack pose height'); free(jack);
  const bos = build('bos-open-trap-bar', {}), bb = bounds(bos); tol(bb.max[0] - bb.min[0], 1500, .1, 'BoS length'); free(bos);
  // TB-2: 88.5 × 28.5 × 9", raised grips 8.25" off the floor.
  const tb = build('rogue-tb-2-trap-bar', {}), tbb = bounds(tb), knurl = bounds(tb, 'Knurled handles');
  tol(tbb.max[0] - tbb.min[0], inch(88.5), .1, 'TB-2 length'); tol(tbb.max[1] - tbb.min[1], inch(28.5), 2, 'TB-2 width'); tol(tbb.max[2], inch(9), 3, 'TB-2 height');
  tol(knurl.max[2] - TB2.handleDia / 2 - .25, inch(8.25), 3, 'TB-2 raised grip height'); free(tb);
  // Multi-grip bars.
  const mg: [MultiGripId, NumericParams, number][] = [['kabuki-kadillac-bar', {}, 2209.8], ['rep-cambered-swiss-bar', {}, inch(80.7)], ['rogue-mg-4cn-multi-grip-camber-bar', {}, inch(83.8)],
    ['rogue-mg-4cn-multi-grip-camber-bar', { sleeves: 1 }, inch(70.8)], ['bos-arch-nemesis-swiss-bar', {}, inch(78.1)], ['titan-multi-grip-barbell', {}, inch(82)]];
  for (const [id, p, len] of mg) {
    const s = MULTI_GRIP_SPECS[id], parts = build(id, { ...floorPart(id)!.defaults, ...p }), all = bounds(parts);
    tol(all.max[0] - all.min[0], len, 10, `${id} length`); tol(multiGripLength(s, p), all.max[0] - all.min[0], .1, `${id} analytic length`);
    const frame = bounds(parts, parts.find(q => /frame/.test(q.name))!.name);
    tol(frame.max[1] - frame.min[1], s.width, .7, `${id} frame width`); // end blocks stand 0.3 mm proud of the rails
    free(parts);
  }
  tol(multiGripSleeve(MULTI_GRIP_SPECS['rogue-mg-4cn-multi-grip-camber-bar'], {}), inch(15.5), .01, 'MG-4CN sleeve');
  // Camber: the frame rises above the sleeves by the published depth (REP 2.5", MG-4CN 3.5", Arch Nemesis 5.5" deep).
  for (const [id, camber, half] of [['rep-cambered-swiss-bar', inch(2.5), 19], ['rogue-mg-4cn-multi-grip-camber-bar', inch(3.5), 25.4], ['bos-arch-nemesis-swiss-bar', inch(5.5) - 50, 25]] as [MultiGripId, number, number][]) {
    const parts = build(id, floorPart(id)!.defaults), frame = bounds(parts, parts.find(q => /frame/.test(q.name))!.name);
    tol(frame.max[2] - half - barAxisZ(id, {}), camber, id === 'rep-cambered-swiss-bar' ? .5 : 12, `${id} camber`); free(parts);
  }
});

test('params validate strictly and coerce; bars add to the floor in front of the rack', () => {
  for (const part of PARTS) {
    assert.deepEqual(validateFloorParams(part, {}), part.defaults);
    assert.throws(() => validateFloorParams(part, { bogus: 1 }), /Invalid bar parameters/);
    for (const param of part.params) assert.throws(() => validateFloorParams(part, { [param.key]: 99.5 }), /Unsupported bar/);
  }
  const mg4 = floorPart('rogue-mg-4cn-multi-grip-camber-bar')!;
  assert.deepEqual(validateFloorParams(mg4, { narrow: 6, wide: 26, sleeves: 1, finish: 1 }), { narrow: 6, wide: 26, sleeves: 1, finish: 1 });
  assert.equal(coerceFloorParams(mg4, { narrow: 17 }).narrow, 16);
  assert.equal(coerceFloorParams(floorPart('titan-axle-barbell')!, { length: 3 }).length, 1);
  assert.throws(() => build('rogue-curl-bar', { finish: 9 }), /finish/);
  const doc = addFloorItem(createAssembly(), 'rep-open-trap-bar');
  assert.equal(doc.floorItems!.at(-1)!.part, 'rep-open-trap-bar');
  assert.ok(doc.floorItems!.at(-1)!.position[1] > 0, 'suggested in front of the rack');
});

test('rackable bars carry their own cradle geometry: rest diameter, collar span, sleeves and floor axis (#139)', () => {
  for (const part of PARTS.filter(p => p.parks)) for (const p of variants(part.id)) {
    const spec = barSpec(part.id, p), parts = build(part.id, p), all = bounds(parts), len = all.max[0] - all.min[0];
    assert.ok(Math.abs(spec.axisZ - barAxisZ(part.id, p)) < 1e-9, `${part.id} floor axis`);
    assert.ok(Math.abs(spec.sleeveStart + spec.sleeveLength - len / 2) < 1e-6, `${part.id} sleeve ends at the bar end`);
    assert.ok(spec.shaftHalf > 450 && spec.shaftHalf < spec.sleeveStart, `${part.id} rackable collar span ${spec.shaftHalf}`);
    // Whatever rests in the cradle (shaft or sleeve stub) is a solid of exactly spec.shaft diameter at the collar.
    const rest = parts.find(s => /grip \(unknurled\)|Cambered shaft|Sleeve stubs/.test(s.name))!, rb = rest.solid.boundingBox();
    assert.ok(Math.abs(rb.max[2] - rb.min[2] - spec.shaft) < .01 || /Cambered/.test(rest.name), `${part.id} rest diameter ${rb.max[2] - rb.min[2]}`);
    // Parked on a 28.5 mm bar's cradle axis, the resting diameter sits on the same cradle floor.
    const pose = parkedPose({ center: [0, 0, 1000], yaw: 0 } as never, spec);
    assert.ok(Math.abs(pose.position[2] + spec.axisZ - spec.shaft / 2 - (1000 - 28.5 / 2)) < 1e-9, part.id);
    free(parts);
  }
});
