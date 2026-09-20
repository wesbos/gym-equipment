import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { PARTS, TRANSFORMER_ANGLES, TRANSFORMER_SLOTS, specialtyBarModel, specialtyBarPose } from './floor-parts/specialty-bars.ts';
import { massProperties, rotX, support, inch } from './floor-parts/specialty-bars-geometry.ts';
import { buildSpecialtyBar } from './parts/specialty-bars.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import { addFloorItem, floorWarnings } from './floor-items.ts';
import { createAssembly, resolveAssembly, validateAssembly } from './assembly.ts';
import { barCradles, barSpec, freeCradles, parkedPose, suggestCradle } from './barbell-cradles.ts';
import { BAR, barSleeves } from './floor-parts/barbell.ts';
import { buildPlateStack } from './parts/plates.ts';
import type { NumericParams, SolidPart } from './types.ts';
import {BUILD_BUDGET_MS} from './test-budget.ts';
const api = await Module(); api.setup();
const box = (parts: SolidPart[], name?: string | RegExp) => {
  const s = parts.filter(p => !name || (typeof name === 'string' ? p.name === name : name.test(p.name)));
  assert.ok(s.length, `no part ${name}`);
  const all = api.Manifold.union(s.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const build = (id: string, p: NumericParams) => buildSpecialtyBar(api, id, p);
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)} (±${tol})`);
/** Defaults plus the first, middle and last option of every param (all combinations for small param sets). */
function variants(part: (typeof PARTS)[number]): NumericParams[] {
  let out: NumericParams[] = [{ ...part.defaults }];
  for (const param of part.params) out = out.flatMap(p => { const o = floorOptions(param, p) as readonly number[]; return [...new Set([o[0], o[o.length >> 1], o.at(-1)!, p[param.key]])].map(v => ({ ...p, [param.key]: v })); });
  return [...new Map(out.map(p => [JSON.stringify(p), p])).values()];
}

test('every specialty bar builds valid closed solids resting on the floor inside its footprint', () => {
  for (const part of PARTS) for (const p of variants(part)) {
    const parts = build(part.id, p), label = `${part.id} ${JSON.stringify(p)}`;
    for (const s of parts) {
      assert.ok(!s.solid.isEmpty() && s.solid.status() === 'NoError' && s.solid.volume() > 0, `${label} ${s.name}`);
      assert.notEqual(s.role, 'frame', 'fixed factory finishes, not rack paint');
    }
    const b = box(parts), fp = resolveBy(part.footprint, p), [ox, oz] = fp.offset ?? [0, 0];
    assert.ok(b.min[2] >= -1e-6 && b.min[2] < .5, `${label} rests on the floor (min z ${b.min[2]})`);
    near(b.max[0] - b.min[0], fp.width, .5, `${label} width`); near(b.max[1] - b.min[1], fp.depth, .6, `${label} depth`);
    near((b.max[0] + b.min[0]) / 2, ox, .5, `${label} centre x`); near(-(b.max[1] + b.min[1]) / 2, oz, .5, `${label} centre floor z`);
    free(parts);
  }
});

test('floor rest is a stable roll, and the shaft axis the cradles hold stays on local Y = 0 at the pose height', () => {
  for (const part of PARTS) {
    const p = part.defaults, prims = specialtyBarModel(part.id).prims(p), pose = specialtyBarPose(part.id, p), { center } = massProperties(prims);
    const h = (t: number) => rotX(t, center)[2] + Math.max(...prims.map(q => support(q, [0, -Math.sin(t), -Math.cos(t)])));
    for (const d of [-.02, .02]) assert.ok(h(pose.theta + d) >= h(pose.theta) - 1e-6, `${part.id} rest is a local minimum`);
    assert.ok(part.parks && part.section === 'Barbells');
    // Straight rackable section: shaft for SSBs/ACG/CB-1 (top bar), sleeves for the bowed bars.
    const parts = build(part.id, p), axisPart = parts.some(s => s.name === 'Bar shaft') ? 'Bar shaft' : parts.some(s => s.name === 'Top shaft') ? 'Top shaft' : 'Loadable sleeves', b = box(parts, axisPart);
    near((b.min[1] + b.max[1]) / 2, 0, .5, `${part.id} axis y`); near((b.min[2] + b.max[2]) / 2, pose.axisZ, .5, `${part.id} axis height`);
    assert.ok(pose.axisZ >= 15 && pose.axisZ < 120, `${part.id} axis height ${pose.axisZ}`);
    free(parts);
  }
});

test('bars park on the J-cups at their true shaft height, with sleeves from the built geometry', () => {
  const doc = createAssembly(), [jcups] = barCradles(resolveAssembly(doc));
  for (const part of PARTS) {
    const spec = barSpec(part.id), pose = specialtyBarPose(part.id, part.defaults);
    assert.equal(spec.axisZ, pose.axisZ);
    const next = addFloorItem(doc, part.id), item = next.floorItems!.at(-1)!, cradle = suggestCradle(freeCradles(resolveAssembly(doc), next.floorItems, item.id))!;
    assert.equal(cradle?.key, jcups.key, `${part.id} fits the default J-cup span`); item.cradle = cradle.key;
    const parked = resolveAssembly(validateAssembly(next)).find(e => e.part === part.id)!;
    // The shaft bottom sits where the 28.5 mm reference shaft's does, so a thicker shaft rides higher by the radius difference.
    near(parked.position[2] + spec.axisZ - spec.shaft / 2, jcups.center[2] - BAR.shaft / 2, 1e-6, `${part.id} shaft rests on the cup floor`);
    assert.deepEqual(parked.position, parkedPose(jcups, spec).position);
    // Sleeves: the loadable length measured in the build, from the collar/bearing face to the end cap.
    const parts = build(part.id, part.defaults), sleeve = box(parts, 'Loadable sleeves'), cap = box(parts, 'Sleeve end caps');
    near(spec.sleeveStart + spec.sleeveLength, sleeve.max[0], .5, `${part.id} sleeve end`); near(spec.sleeveDiameter, Math.min(sleeve.max[2] - sleeve.min[2], 60), .6, `${part.id} sleeve diameter`); assert.ok(spec.sleeveStart + spec.sleeveLength <= cap.max[0]);
    free(parts);
  }
});

test('plates load on the real sleeve axis: dropped CB-1 and Transformer sleeves, parked or yawed on the floor', () => {
  const doc = createAssembly(), [jcups] = barCradles(resolveAssembly(doc));
  /** The bar at `p` either parked on the J-cups or lying on the floor turned by `yaw`; returns its resolved instance. */
  const place = (id: string, p: NumericParams, yaw?: number) => {
    const next = addFloorItem(doc, id), item = next.floorItems!.at(-1)!; item.params = p;
    if (yaw === undefined) item.cradle = jcups.key; else item.rotation = yaw;
    return resolveAssembly(validateAssembly(next)).find(e => e.id === item.id)!;
  };
  const cases: [string, NumericParams, number?][] = [
    ['rogue-cb-1-camber-bar', {}], ['rogue-cb-1-camber-bar', {}, .7],
    ...TRANSFORMER_ANGLES.map((_, camber) => ['kabuki-transformer-bar', { camber, slot: 3, handles: 0 }] as [string, NumericParams]),
    ['kabuki-transformer-bar', { camber: 0, slot: 0, handles: 0 }], ['kabuki-transformer-bar', { camber: 4, slot: 2, handles: 1 }, -2.1],
    ['titan-safety-squat-bar', {}], ['bells-of-steel-ss4-safety-squat-bar', { handles: 2 }, 1.2],
  ];
  for (const [id, params, yaw] of cases) {
    const p = { ...PARTS.find(q => q.id === id)!.defaults, ...params }, label = `${id} ${JSON.stringify(p)}${yaw === undefined ? ' parked' : ` yaw ${yaw}`}`;
    // bar.params: a parked CB-1 builds racked (legs down, #160); the others keep their floor roll.
    const bar = place(id, p, yaw), spec = barSpec(id, bar.params), sleeves = barSleeves(bar, spec), a = bar.rotation[2], c = Math.cos(a), s = Math.sin(a);
    assert.ok(spec.sleeveOffset && Math.hypot(spec.sleeveOffset.y, spec.sleeveOffset.z) > 90, `${label} declares its dropped sleeves`);
    // Built sleeves (local frame) → world: yaw about Z, then the instance position.
    const parts = build(id, bar.params), local = box(parts, 'Loadable sleeves'), [ly, lz] = [(local.min[1] + local.max[1]) / 2, (local.min[2] + local.max[2]) / 2];
    for (const [i, side] of [1, -1].entries()) {
      const lx = side * spec.sleeveStart, want = [bar.position[0] + lx * c - ly * s, bar.position[1] + lx * s + ly * c, bar.position[2] + lz];
      for (const k of [0, 1, 2]) near(sleeves[i].origin[k], want[k], .01, `${label} sleeve ${side} origin[${k}]`);
      // A plate stack from that origin runs out along the sleeve, its bore round the built sleeve axis.
      const plates = buildPlateStack(api, ['kg20', 'kg20', 'kg10'], { origin: sleeves[i].origin, axis: sleeves[i].axis, segments: 32 });
      // Back into the bar's local frame: the stack's YZ centre is the built sleeve's, and it stays on the loadable length.
      const u = api.Manifold.union(plates.map(q => q.solid)).translate([-bar.position[0], -bar.position[1], -bar.position[2]]).rotate([0, 0, -a * 180 / Math.PI]), pb = u.boundingBox(); u.delete();
      near((pb.min[1] + pb.max[1]) / 2, ly, .5, `${label} plates centred on the sleeve (y)`); near((pb.min[2] + pb.max[2]) / 2, lz, .5, `${label} plates centred on the sleeve (z)`);
      const [x0, x1] = side > 0 ? [pb.min[0], pb.max[0]] : [-pb.max[0], -pb.min[0]];
      assert.ok(x0 >= spec.sleeveStart - .5 && x1 <= spec.sleeveStart + spec.sleeveLength + .5, `${label} plates stay on the loadable sleeve`);
      free(plates);
    }
    free(parts);
  }
  // Bowed bars rack on their sleeve axis: no offset, and barSleeves is the coaxial path.
  for (const id of ['rogue-cb-4-camber-bar', 'kabuki-duffalo-bar']) {
    const spec = barSpec(id); assert.ok(!('sleeveOffset' in spec), `${id} sleeves are the rackable axis`);
    const pose = { position: [120, -40, 900] as [number, number, number], rotation: [0, 0, .4] as [number, number, number] };
    assert.deepEqual(barSleeves(pose, spec).map(q => q.origin[2]), [900 + spec.axisZ, 900 + spec.axisZ]);
  }
});

test('published dimensions come out of the builds', () => {
  const spec: Record<string, { length: number; shaft: number; sleeve?: number; cap?: number; between?: number; handles?: number; grip?: number }> = {
    'titan-safety-squat-bar': { length: inch(90.5), shaft: 38, sleeve: inch(14.75), cap: 6, between: inch(50), handles: inch(12.75), grip: 35 },
    'elitefts-ss-yoke-bar': { length: inch(92), shaft: 38, between: inch(49.5) },
    'rep-safety-squat-bar': { length: inch(92.5), shaft: 32, between: inch(49.1), handles: inch(13), grip: inch(1.5) },
    'kabuki-transformer-bar': { length: inch(91.25), shaft: 38, handles: inch(12), grip: inch(1.15) },
    'bells-of-steel-ss4-safety-squat-bar': { length: 2200, shaft: inch(1.25), sleeve: 300, cap: 8 },
    'kabuki-duffalo-bar': { length: inch(95), shaft: 31.75, sleeve: inch(17.25), cap: 6 },
    'elitefts-american-cambered-grip-bar': { length: inch(80), shaft: 32 },
    'rogue-cb-4-camber-bar': { length: inch(95), shaft: 38, sleeve: inch(16), cap: 6 },
    'rogue-cb-1-camber-bar': { length: inch(92), shaft: inch(1.5) },
  };
  for (const part of PARTS) {
    const s = spec[part.id], parts = build(part.id, part.defaults), all = box(parts);
    near(all.max[0] - all.min[0], s.length, 1, `${part.id} overall length`);
    const shaft = box(parts, /^(Bar shaft|Top shaft|Cambered shaft)$/);
    if (part.id.includes('cb-4') || part.id.includes('duffalo')) near(box(parts, 'Loadable sleeves').max[1] - box(parts, 'Loadable sleeves').min[1], 50, .5, `${part.id} sleeve diameter`);
    else near(Math.min(shaft.max[1] - shaft.min[1], shaft.max[2] - shaft.min[2]), s.shaft, .6, `${part.id} shaft diameter`);
    if (s.between) near(box(parts, 'Bar shaft').max[0] - box(parts, 'Bar shaft').min[0], s.between + 2, 1, `${part.id} rackable length between cambers`);
    if (s.sleeve) {
      // Loadable length per side: from the collar (or bearing ring) face to the end cap.
      const ring = parts.some(q => q.name === 'Bearing seal rings') ? box(parts, 'Bearing seal rings') : box(parts, 'Sleeve collars');
      near(all.max[0] - ring.max[0] - s.cap!, s.sleeve, 1, `${part.id} loadable sleeve length`);
    }
    if (s.handles) { const g = box(parts, 'Handle grips'); near(g.max[0] - g.min[0] - s.grip!, s.handles, 1, `${part.id} handle spacing`); }
    free(parts);
  }
});

test('camber geometry: drops, bows and the Transformer brackets', () => {
  const sleeveOffset = (id: string, p: NumericParams) => {
    const parts = build(id, p), s = box(parts, 'Loadable sleeves'), pose = specialtyBarPose(id, p);
    const d = Math.hypot((s.min[1] + s.max[1]) / 2, (s.min[2] + s.max[2]) / 2 - pose.axisZ); free(parts); return d;
  };
  near(sleeveOffset('titan-safety-squat-bar', {}), inch(5) / Math.cos(20 * Math.PI / 180), 1, 'Titan 5" drop on a 20° camber plane');
  near(sleeveOffset('rep-safety-squat-bar', {}), inch(5.5) / Math.cos(25 * Math.PI / 180), 1, 'REP 5.5" drop');
  near(sleeveOffset('elitefts-ss-yoke-bar', { finish: 0 }), inch(6) / Math.cos(30 * Math.PI / 180), 1, 'SS Yoke 6" drop, 30° camber');
  near(sleeveOffset('rogue-cb-1-camber-bar', {}), inch(16.5), 1, 'CB-1 drop legs');
  for (const [id, drop] of [['rogue-cb-4-camber-bar', inch(4.4)], ['kabuki-duffalo-bar', inch(3.25)]] as const) {
    const shaft = specialtyBarModel(id).prims(PARTS.find(p => p.id === id)!.defaults).find(p => p.name === 'Cambered shaft')!;
    assert.equal(shaft.kind, 'sweep');
    if (shaft.kind === 'sweep') near(Math.max(...shaft.path.map(q => q[2])) - Math.min(...shaft.path.map(q => q[2])), drop, .5, `${id} bow drop`);
  }
  const cb4 = specialtyBarModel('rogue-cb-4-camber-bar').prims({}).find(p => p.name === 'Cambered shaft');
  if (cb4?.kind === 'sweep') { const bent = cb4.path.filter(q => q[2] > 1e-9).map(q => q[0]); near(Math.max(...bent) - Math.min(...bent), inch(55), 16, 'CB-4 55" wide bend (to the last 8 mm sample)'); }
  // Transformer: every camber position swings the sleeves around the centre bar; the slot sets the radius.
  const seen = new Set<string>();
  for (const [camber, angle] of TRANSFORMER_ANGLES.entries()) for (const [slot, radius] of TRANSFORMER_SLOTS.entries()) {
    const p = { camber, slot, handles: 0 }; near(sleeveOffset('kabuki-transformer-bar', p), radius, 1, `Transformer ${angle}° slot ${slot + 1}`);
    const prims = specialtyBarModel('kabuki-transformer-bar').prims(p), sleeve = prims.find(q => q.name === 'Loadable sleeves');
    if (sleeve?.kind === 'sweep') { const [, y, z] = sleeve.path[0]; near(Math.atan2(-y, -z) * 180 / Math.PI, angle, .01, 'bracket angle from straight down'); seen.add(`${y.toFixed(1)},${z.toFixed(1)}`); }
  }
  assert.equal(seen.size, 24, '24 distinct sleeve positions');
});

test('handle options and finishes change the build', () => {
  const names = (id: string, p: NumericParams) => { const parts = build(id, p), n = parts.map(s => s.name); free(parts); return n; };
  assert.ok(names('bells-of-steel-ss4-safety-squat-bar', { handles: 3 }).includes('Handle chains'));
  assert.ok(!names('bells-of-steel-ss4-safety-squat-bar', { handles: 0 }).includes('Handle chains'));
  const reach = (h: number) => { const parts = build('bells-of-steel-ss4-safety-squat-bar', { handles: h }), b = box(parts, 'Handle grips'); free(parts); return b; };
  assert.notDeepEqual(reach(1).min, reach(0).min, 'spider handles reach further than straight ones');
  const colour = (id: string, p: NumericParams, name: string) => { const parts = build(id, p), c = parts.find(s => s.name === name)!.color; free(parts); return c; };
  assert.notEqual(colour('kabuki-duffalo-bar', { finish: 0 }, 'Cambered shaft'), colour('kabuki-duffalo-bar', { finish: 1 }, 'Cambered shaft'));
  assert.notEqual(colour('elitefts-ss-yoke-bar', { finish: 0 }, 'Bar shaft'), colour('elitefts-ss-yoke-bar', { finish: 1 }, 'Bar shaft'));
});

test('params validate strictly, coerce for the UI, and bars add in front of the rack without warnings', () => {
  for (const part of PARTS) {
    assert.deepEqual(validateFloorParams(part, {}), part.defaults);
    assert.throws(() => validateFloorParams(part, { bogus: 1 }), /bar/);
    for (const param of part.params) assert.throws(() => validateFloorParams(part, { [param.key]: 99 }), /bar/);
    assert.deepEqual(coerceFloorParams(part, part.defaults), part.defaults);
    const doc = addFloorItem(createAssembly(), part.id);
    assert.deepEqual(floorWarnings(doc), [], part.id);
  }
  const t = PARTS.find(p => p.id === 'kabuki-transformer-bar')!;
  assert.deepEqual(coerceFloorParams(t, { camber: 7, slot: -3, handles: 0 }), { camber: 5, slot: 0, handles: 0 });
});

test('builds stay inside the triangle and time budget', () => {
  for (const part of PARTS) {
    const t0 = performance.now(), parts = build(part.id, part.defaults), ms = performance.now() - t0, tri = parts.reduce((n, s) => n + s.solid.numTri(), 0);
    assert.ok(tri < 80000, `${part.id} ${tri} triangles`); assert.ok(ms < BUILD_BUDGET_MS, `${part.id} ${ms.toFixed(0)} ms`);
    free(parts);
  }
});
