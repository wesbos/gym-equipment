import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { definitions } from './catalog.ts';
import { BARBELL, barSleeves } from './floor-parts/barbell.ts';
import { FLOOR_PARTS, floorPart } from './floor-registry.ts';
import { addFloorItem, floorBounds, floorWarnings, resolveFloorItems } from './floor-items.ts';
import { createAssembly, resolveAssembly, validateAssembly } from './assembly.ts';
import { barCradles, barSpec, parkedParams } from './barbell-cradles.ts';
import { barLift, barLoadFromParams, barStacks, floorBuildParams, loadsPlates, setBarLoad, sleeveFits, sleeveSpec, validateBarLoad } from './bar-loads.ts';
import { plateStackLength, plateStackRadius, type PlateId } from './plates.ts';
import { inch } from './floor-parts/specialty-bars-geometry.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { BarLoad, FloorItem, RackDoc, ResolvedInstance, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)} (±${tol})`);
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
const def = (id: string) => definitions.find(d => d.id === id)!;
/** The catalog build (what the scene and GLB mesh) of a resolved instance. */
const build = (e: ResolvedInstance) => def(e.part).build(api, { ...def(e.part).defaults, ...e.params });
/** World bounds of the named solids of an instance (yaw about Z, then its position), like the scene transform. */
function worldBox(e: ResolvedInstance, parts: SolidPart[], name?: RegExp) {
  const s = parts.filter(p => !name || name.test(p.name));
  assert.ok(s.length, `no part ${name}`);
  const u = api.Manifold.union(s.map(p => p.solid)), r = u.rotate([0, 0, e.rotation[2] * 180 / Math.PI]), w = r.translate(e.position), b = w.boundingBox();
  [u, r, w].forEach(m => m.delete());
  return b;
}
const centre = (b: { min: number[]; max: number[] }) => b.min.map((v, i) => (v + b.max[i]) / 2);
/** The issue's check: 2 × 20 kg bumpers plus change plates, per sleeve. */
const BUMPERS: PlateId[] = ['kg20', 'kg20', 'rogue-calibrated-kg:2.5', 'rogue-calibrated-kg:1.25'];
const LOAD: PlateId[] = ['kg20', 'kg20', 'lb10'];
/** A fresh assembly with one bar of `part` loaded with `plates` (parked in the default J-cups unless `floor`). */
function loaded(part: string, plates: BarLoad | undefined, { floor = false, params = {}, yaw = 0 }: { floor?: boolean; params?: FloorItem['params']; yaw?: number } = {}) {
  const doc = addFloorItem(createAssembly(), part), item = doc.floorItems!.at(-1)!;
  item.params = { ...item.params, ...params };
  if (floor) item.rotation = yaw; else item.cradle = barCradles(resolveAssembly(createAssembly()))[0].key;
  const next = plates ? setBarLoad(doc, item.id, plates) : doc, valid = validateAssembly(next);
  return { doc: valid, entry: resolveAssembly(valid).find(e => e.id === item.id)! };
}

test('every bar with a `bar` spec loads plates, trap bars included; other floor parts refuse them', () => {
  const bars = FLOOR_PARTS.filter(p => p.bar).map(p => p.id);
  for (const id of ['olympic-barbell', 'rogue-ohio-power-bar', 'rogue-cb-1-camber-bar', 'titan-safety-squat-bar', 'rep-open-trap-bar', 'rogue-tb-2-trap-bar', 'kabuki-trap-bar-hd', 'bos-open-trap-bar', 'giant-northland-open-trap-hex-bar', 'rogue-curl-bar', 'titan-axle-barbell'])
    assert.ok(bars.includes(id as never) && loadsPlates(id), `${id} loads plates`);
  assert.deepEqual(barSpec('olympic-barbell'), sleeveSpec(floorPart('olympic-barbell')!), 'the Olympic bar declares the default spec');
  assert.ok(!loadsPlates('rep-nighthawk'));
  const bench = addFloorItem(createAssembly(), 'rep-nighthawk');
  assert.throws(() => setBarLoad(bench, 'floor-1', { both: ['kg20'] }), /loadable sleeves/);
  assert.throws(() => validateAssembly({ ...bench, floorItems: [{ ...bench.floorItems![0], plates: { both: ['kg20'] } }] } as RackDoc), /Only bars with loadable sleeves/);
});

test('saved documents validate strictly; old documents load unchanged', () => {
  const doc = addFloorItem(createAssembly(), BARBELL.id), item = doc.floorItems![0];
  // Old document: no `plates` field, same resolved params and pose as before (#160 adds nothing).
  const old = validateAssembly(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(old.floorItems, doc.floorItems);
  assert.ok(!('plates' in old.floorItems![0]));
  const [plain] = resolveFloorItems(old.floorItems);
  assert.deepEqual(plain.params, item.params); assert.equal(plain.position[2], 0);
  const withPlates = (plates: unknown) => ({ ...doc, floorItems: [{ ...item, plates }] });
  for (const good of [{ both: LOAD }, { right: LOAD, left: ['kg20'] }, { right: [], left: ['kg10'] }] as BarLoad[]) {
    const loadedDoc = validateAssembly(JSON.parse(JSON.stringify(withPlates(good))));
    assert.deepEqual(loadedDoc.floorItems![0].plates, good, 'round-trips through JSON');
  }
  assert.equal(validateAssembly(withPlates({ both: [] })).floorItems![0].plates, undefined, 'empty loads are omitted');
  assert.equal(validateAssembly(withPlates({ right: [], left: [] })).floorItems![0].plates, undefined);
  for (const [bad, message] of [
    [['kg20'], /Invalid barbell plates/], [{ both: ['kg20'], right: [] }, /Invalid barbell plates/], [{ right: ['kg20'] }, /Invalid barbell plates/],
    [{ both: 'kg20' }, /at most/], [{ both: ['kg99'] }, /Unknown weight plate/], [{ both: Array(17).fill('lb10') }, /at most 16/], [{ both: ['kg20'], extra: 1 }, /Invalid/], [null, /Invalid/],
  ] as const) assert.throws(() => validateAssembly(withPlates(bad)), message, JSON.stringify(bad));
});

test('stacks cannot overflow the loadable sleeve, per bar and per param', () => {
  const doc = addFloorItem(createAssembly(), BARBELL.id), five = Array<PlateId>(5).fill('kg25');
  assert.ok(plateStackLength(five) > 415);
  assert.throws(() => setBarLoad(doc, 'floor-1', { both: five }), /Over capacity: these plates need 446.5 mm but the sleeve holds 415 mm/);
  assert.throws(() => setBarLoad(doc, 'floor-1', { right: ['kg25'], left: five }), /left sleeve holds 415 mm/);
  assert.throws(() => validateAssembly({ ...doc, floorItems: [{ ...doc.floorItems![0], plates: { both: five } }] }), /Over capacity/);
  assert.ok(setBarLoad(doc, 'floor-1', { both: five.slice(1) }));
  assert.equal(sleeveFits(barSpec(BARBELL.id), ['kg25', 'kg25', 'kg25'], 'kg25'), 1);
  assert.equal(sleeveFits(barSpec(BARBELL.id), ['kg25', 'kg25', 'kg25', 'kg25'], 'kg25'), 0);
  // The MG-4CN's 9" sleeves hold less than its 15.5" ones: switching sleeves with a full stack is refused.
  const mg = addFloorItem(createAssembly(), 'rogue-mg-4cn-multi-grip-camber-bar'), full = setBarLoad(mg, 'floor-1', { both: ['kg25', 'kg25', 'kg25', 'kg10'] });
  assert.throws(() => validateAssembly({ ...full, floorItems: [{ ...full.floorItems![0], params: { ...full.floorItems![0].params, sleeves: 1 } }] }), /Over capacity: .* holds 228.6 mm/);
});

test('symmetric loads mirror onto both sleeves; uneven loads keep each side', () => {
  const sym = loaded(BARBELL.id, { both: LOAD }, { floor: true }).entry, uneven = loaded(BARBELL.id, { right: LOAD, left: ['kg10'] }, { floor: true }).entry;
  assert.deepEqual(barLoadFromParams(sym.params), [LOAD, LOAD]);
  assert.deepEqual(barLoadFromParams(uneven.params), [LOAD, ['kg10']]);
  assert.deepEqual(barStacks({ both: LOAD }), [LOAD, LOAD]);
  const oneSide = loaded(BARBELL.id, { right: [], left: ['kg10'] }, { floor: true }).entry;
  for (const [e, right, left] of [[sym, LOAD, LOAD], [uneven, LOAD, ['kg10']], [oneSide, [], ['kg10']]] as const) {
    const parts = build(e);
    try {
      const sleeves = barSleeves(e, barSpec(e.part));
      for (const [i, stack, tag] of [[0, right, 'R'], [1, left, 'L']] as const) {
        const mine = parts.filter(p => p.name.startsWith(`plate-${tag}-`));
        assert.equal(new Set(mine.map(p => p.name.split(' ')[0])).size, stack.length, `${tag} sleeve plate count`);
        if (!stack.length) continue;
        const b = worldBox(e, mine), c = centre(b), s = sleeves[i];
        near(c[1], s.origin[1], .2, `${tag} plates on the sleeve axis (y)`); near(c[2], s.origin[2], .2, `${tag} plates on the sleeve axis (z)`);
        const inner = i === 0 ? b.min[0] : -b.max[0], outer = i === 0 ? b.max[0] : -b.min[0];
        near(inner, 685, .2, `${tag} stack starts at the inner collar face`); near(outer - inner, plateStackLength(stack), .3, `${tag} stack length`);
      }
    } finally { free(parts); }
  }
});

test('a parked bar carries its plates on the true sleeve axis, cambered and dropped sleeves included', () => {
  for (const id of [BARBELL.id, 'rogue-ohio-power-bar', 'rogue-cb-1-camber-bar', 'titan-safety-squat-bar', 'kabuki-transformer-bar', 'rogue-cb-4-camber-bar', 'rep-cambered-swiss-bar']) {
    const { entry } = loaded(id, { right: LOAD, left: ['kg20', 'kg10'] });
    assert.ok(entry.position[2] > 1000, `${id} parked on the J-cups`);
    const spec = barSpec(id, entry.params), sleeves = barSleeves(entry, spec), parts = build(entry);
    try {
      // Built sleeves in world space: plates centred on them, and on barSleeves' axis.
      const sleeve = worldBox(entry, parts, /sleeve/i);
      for (const [i, tag] of (['R', 'L'] as const).entries()) {
        const plates = worldBox(entry, parts, new RegExp(`^plate-${tag}-`)), c = centre(plates);
        near(c[1], sleeves[i].origin[1], .5, `${id} ${tag} plates y on the sleeve axis`); near(c[2], sleeves[i].origin[2], .5, `${id} ${tag} plates z on the sleeve axis`);
        const radius = plateStackRadius(i ? ['kg20', 'kg10'] : LOAD);
        assert.ok(plates.min[2] > sleeve.min[2] - radius - 1 && plates.max[2] < sleeve.max[2] + radius + 1, `${id} ${tag} plates hug the built sleeve`);
      }
    } finally { free(parts); }
  }
});

test('the racked CB-1 hangs legs-down; on the floor it keeps its legs-forward roll', () => {
  const racked = loaded('rogue-cb-1-camber-bar', undefined).entry, lying = loaded('rogue-cb-1-camber-bar', undefined, { floor: true }).entry;
  assert.equal(racked.params.racked, 1); assert.ok(!('racked' in lying.params));
  assert.deepEqual(parkedParams(BARBELL.id, { finish: 0 }), { finish: 0 }, 'other bars keep their floor roll');
  const hang = build(racked), flat = build(lying);
  try {
    const shaft = barCradles(resolveAssembly(createAssembly()))[0].center[2] + (inch(1.5) - 28.5) / 2;
    const legs = worldBox(racked, hang, /Drop legs/), sleeves = worldBox(racked, hang, /Loadable sleeves/), spec = barSpec('rogue-cb-1-camber-bar', racked.params);
    near(spec.sleeveOffset!.y, 0, .5, 'racked sleeves straight below the shaft'); near(spec.sleeveOffset!.z, -inch(16.5), 1, 'CB-1 drop');
    near(centre(sleeves)[2], shaft - inch(16.5), 1.5, 'sleeves hang 16.5" below the racked top bar');
    assert.ok(legs.max[2] <= shaft + inch(1.5) && legs.min[2] < shaft - inch(15), 'legs run down from the top bar');
    assert.ok(legs.max[1] - legs.min[1] < inch(3), `legs hang in the vertical plane (${(legs.max[1] - legs.min[1]).toFixed(1)} mm deep)`);
    const flatLegs = worldBox(lying, flat, /Drop legs/);
    assert.ok(flatLegs.max[1] - flatLegs.min[1] > inch(15) && flatLegs.max[2] - flatLegs.min[2] < inch(3), 'on the floor the legs lie flat');
    const floorSpec = barSpec('rogue-cb-1-camber-bar', lying.params);
    near(Math.abs(floorSpec.sleeveOffset!.y), inch(16.5), 1, 'floor sleeves forward of the shaft');
  } finally { free(hang); free(flat); }
});

test('a bar lying on the floor with plates sits on the plates, not its collars', () => {
  const cases: [string, BarLoad, Record<string, number>, number][] = [
    [BARBELL.id, { both: ['kg20', 'kg20', 'lb10'] }, {}, 225], [BARBELL.id, { right: ['lb10'], left: ['kg20'] }, {}, 225], [BARBELL.id, { both: ['lb10'] }, {}, 114],
    ['rogue-cb-1-camber-bar', { both: ['kg20'] }, {}, 225], ['titan-safety-squat-bar', { both: ['kg20'] }, {}, 225],
    ['rep-open-trap-bar', { both: ['kg20'] }, { pose: 1 }, 225], ['rogue-tb-2-trap-bar', { both: ['lb45'] }, {}, 224],
  ];
  for (const [id, plates, params, radius] of cases) {
    for (const yaw of id === BARBELL.id || id === 'rogue-cb-1-camber-bar' ? [0, .8] : [.3]) {
      const { entry } = loaded(id, plates, { floor: true, params, yaw }), label = `${id} ${JSON.stringify(plates)} yaw ${yaw}`, parts = build(entry);
      try {
        const all = worldBox(entry, parts), plate = worldBox(entry, parts, /^plate-/), spec = barSpec(id, entry.params);
        near(plate.min[2], 0, .3, `${label} biggest plate on the floor`); near(all.min[2], 0, .3, `${label} nothing below the floor`);
        near(barSleeves(entry, spec)[0].origin[2], radius, .6, `${label} sleeve axis at the plate radius`);
        near(entry.position[2], barLift(spec, plates), 1e-9, `${label} lift`);
      } finally { free(parts); }
    }
  }
  // A trap bar standing on its jack holds 450 mm plates clear of the floor: no lift.
  const { entry } = loaded('rep-open-trap-bar', { both: ['kg20'] }, { floor: true });
  assert.equal(entry.position[2], 0);
  const parts = build(entry);
  try { assert.ok(worldBox(entry, parts, /^plate-/).min[2] > 5, 'plates off the floor on the jack'); } finally { free(parts); }
});

test('trap bars load on their own sleeves in both poses', () => {
  for (const id of ['rep-open-trap-bar', 'kabuki-trap-bar-hd', 'giant-northland-open-trap-hex-bar', 'bos-open-trap-bar', 'rogue-tb-2-trap-bar', 'rogue-curl-bar', 'cap-olympic-ez-curl-bar'])
    for (const pose of floorPart(id)!.params.some(p => p.key === 'pose') ? [0, 1] : [undefined]) {
      const { entry } = loaded(id, { both: ['kg10'] }, { floor: true, params: pose === undefined ? {} : { pose } }), spec = barSpec(id, entry.params), parts = build(entry);
      try {
        const sleeves = worldBox(entry, parts, /sleeve/i), plates = barSleeves(entry, spec);
        for (const [i, tag] of (['R', 'L'] as const).entries()) {
          const b = worldBox(entry, parts, new RegExp(`^plate-${tag}-`)), c = centre(b);
          near(c[1], plates[i].origin[1], .3, `${id} pose ${pose} ${tag} y`); near(c[2], plates[i].origin[2], .3, `${id} pose ${pose} ${tag} z`);
          assert.ok(Math.abs(c[0]) + 22.3 <= sleeves.max[0] + .5, `${id} pose ${pose} ${tag} plates on the sleeve length`);
        }
        const sleeveParts = parts.filter(p => /Loadable|SCH 80|Rotating|sleeves/.test(p.name) && !p.name.startsWith('plate-'));
        const u = worldBox(entry, sleeveParts);
        near(centre(u)[2], plates[0].origin[2], 1, `${id} pose ${pose} built sleeves on the axis`);
        near(centre(u)[1], plates[0].origin[1], 1, `${id} pose ${pose} built sleeves y`);
      } finally { free(parts); }
    }
});

test('floor bounds grow to cover the plates, and warn when loaded bars crowd each other', () => {
  const doc = addFloorItem(createAssembly(), BARBELL.id), bare = floorBounds(doc.floorItems![0]);
  const full = setBarLoad(doc, 'floor-1', { both: ['kg20'] }), b = floorBounds(full.floorItems![0]);
  near(b.max[1] - b.min[1], 450, .01, 'plate diameter depth'); near(b.max[0] - b.min[0], bare.max[0] - bare.min[0], .01, 'width unchanged');
  near((b.max[1] + b.min[1]) / 2, (bare.max[1] + bare.min[1]) / 2, .01, 'centred on the bar');
  const two = addFloorItem(doc, BARBELL.id);
  two.floorItems![1].position = [two.floorItems![0].position[0], two.floorItems![0].position[1] + 400];
  const overlap = (d: RackDoc) => floorWarnings(d).some(w => w.message === 'Floor items overlap.');
  assert.ok(!overlap(two), 'bare bars 400 mm apart clear each other');
  const both = two.floorItems!.reduce((d, i) => setBarLoad(d, i.id, { both: ['kg20'] }), two);
  assert.ok(overlap(both), '450 mm plates on bars 400 mm apart overlap');
});

test('the worker guard accepts exactly the params resolveAssembly emits', () => {
  const part = (id: string) => floorPart(id)!;
  const { entry } = loaded('rogue-cb-1-camber-bar', { right: ['kg20'], left: ['rogue-hg2-kg:10'] });
  assert.deepEqual(floorBuildParams(part('rogue-cb-1-camber-bar'), entry.params), {});
  const bar = loaded(BARBELL.id, { both: LOAD }).entry;
  assert.deepEqual(floorBuildParams(part(BARBELL.id), bar.params), { finish: 0 });
  assert.throws(() => floorBuildParams(part(BARBELL.id), { finish: 0, racked: 1 }), /Invalid/);
  assert.throws(() => floorBuildParams(part('rogue-cb-1-camber-bar'), { racked: 2 }), /Invalid/);
  assert.throws(() => floorBuildParams(part(BARBELL.id), { finish: 0, plateR2: 2 }), /Invalid/);
  assert.throws(() => floorBuildParams(part(BARBELL.id), { finish: 0, plateR1: 999 }), /Unknown plate code/);
  assert.throws(() => floorBuildParams(part(BARBELL.id), { finish: 0, ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`plateL${i + 1}`, 1])) }), /Over capacity/);
  assert.throws(() => floorBuildParams(part('rep-nighthawk'), { plateR1: 1 }), /Invalid/);
});

test('GLB builds include the plates; 3MF prints still exclude the loaded bar', () => {
  const { doc, entry } = loaded(BARBELL.id, { both: BUMPERS });
  const t0 = performance.now(), parts = build(entry), ms = performance.now() - t0;
  try {
    assert.ok(ms < BUILD_BUDGET_MS, `loaded bar builds in ${ms.toFixed(0)} ms`);
    const plates = parts.filter(p => p.name.startsWith('plate-'));
    assert.ok(plates.length >= 2 * BUMPERS.length, 'every plate is a mesh in the scene/GLB build');
    assert.ok(plates.every(p => p.role === 'source' && p.solid.status() === 'NoError' && p.solid.volume() > 0));
    const tris = parts.reduce((n, p) => n + p.solid.numTri(), 0);
    assert.ok(tris < 400_000, `loaded bar triangles ${tris}`);
  } finally { free(parts); }
  const stub = [...new Set(resolveAssembly(doc).map(e => e.part))].map(id => ({ id, name: id, category: 'test', defaults: {}, build: () => {
    if (id === BARBELL.id) throw Error('Loaded barbell must not build for printing');
    return [{ name: id, role: 'frame' as const, solid: api.Manifold.cube([10, 10, 10]) }];
  } }));
  const { bytes, report } = exportPrint3MF(api, doc, stub, { layout: 'laid-out', scale: 10 });
  assert.deepEqual(report.excludedInstances, [entry.id]);
  for (const [name, data] of Object.entries(unzipSync(bytes))) if (name.endsWith('.model')) assert.ok(!/olympic-barbell|plate-R|kg20/.test(strFromU8(data)));
});

test('undoable edits: set, change and unload a bar through setBarLoad', () => {
  const doc: RackDoc = addFloorItem(createAssembly(), BARBELL.id);
  const a = setBarLoad(doc, 'floor-1', { both: ['kg20', 'kg20'] }), b = setBarLoad(a, 'floor-1', { right: ['kg20', 'kg20'], left: ['kg20'] }), c = setBarLoad(b, 'floor-1', undefined);
  assert.deepEqual(a.floorItems![0].plates, { both: ['kg20', 'kg20'] }); assert.deepEqual(b.floorItems![0].plates, { right: ['kg20', 'kg20'], left: ['kg20'] });
  assert.ok(!('plates' in c.floorItems![0])); assert.deepEqual(c, doc);
  assert.deepEqual(validateBarLoad(BARBELL.id, {}, { both: [] }), undefined);
});
