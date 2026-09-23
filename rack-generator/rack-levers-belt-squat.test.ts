/** #135 lever arms, belt squat attachments, band pegs & grip: published dimensions come out of the builds, poses move
 * the levers about their pivots, and the parts fit (or refuse) the racks their makers sell them for. The registry
 * contract (every option, extents, bodies, placement, pairing) is swept by rack-registry.test.ts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { definitions } from './catalog.ts';
import { createAssembly, resolveAssembly, validateAssembly, addAccessory } from './assembly.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { applyPreset } from './presets.ts';
import { rackBuildParams, validateRackParams, coerceRackParams, type RackPart } from './rack-registry.ts';
import { PARTS } from './rack-parts/rack-levers-belt-squat.ts';
import { JD_WRIST_ROLLER, OAK_CLUB_IRON_3, REP_BAND_PEGS_2, ROGUE_MONSTER_LITE_BAND_PEG, ROGUE_MONSTER_PLATE_STORAGE_PIN, ROGUE_SP3358_PLATE_STORAGE } from './rack-parts/rack-levers-belt-squat-pegs.ts';
import { BOS_SHOULDER_BOULDER, FRINGE_MAMMOTH_BELT_SQUAT, ROGUE_MONSTER_LITE_LEVER_ARMS, VENDETTA_180_LEVER_ARM_ADAPTERS, VENDETTA_POSITIONS } from './rack-parts/rack-levers-belt-squat-levers.ts';
import { GETRXD_RX3_CENTER_POST, ROGUE_VELOCIDOR } from './rack-parts/rack-levers-belt-squat-mounts.ts';
import { ROGUE_RHINO_BELT_SQUAT_DROP_IN } from './rack-parts/rack-levers-belt-squat-rhino.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { NumericParams, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
type Box = { min: number[]; max: number[] };
function measure(part: RackPart, params: NumericParams = {}) {
  const def = definitions.find(d => d.id === part.id)!, started = performance.now(), parts: SolidPart[] = def.build(api, rackBuildParams(part, params));
  const ms = performance.now() - started;
  try {
    const boxes = new Map<string, Box>(), all: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const p of parts) {
      assert.equal(p.solid.status(), 'NoError', `${part.id} ${p.name}`); assert.ok(p.solid.volume() > 0, `${part.id} ${p.name}`);
      const b = p.solid.boundingBox(), prev = boxes.get(p.name);
      boxes.set(p.name, prev ? { min: prev.min.map((v, i) => Math.min(v, b.min[i])), max: prev.max.map((v, i) => Math.max(v, b.max[i])) } : { min: [...b.min], max: [...b.max] });
      for (let i = 0; i < 3; i++) { all.min[i] = Math.min(all.min[i], b.min[i]); all.max[i] = Math.max(all.max[i], b.max[i]); }
    }
    return { all, boxes, ms, names: parts.map(p => p.name), colors: new Map(parts.map(p => [p.name, p.color])) };
  } finally { parts.forEach(p => p.solid.delete()); }
}
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tolerance}`);
const get = (m: ReturnType<typeof measure>, name: string) => { const b = m.boxes.get(name); assert.ok(b, `missing solid ${name}`); return b!; };

test('family registers 14 products, each builds its defaults within budget, and params validate', () => {
  assert.equal(PARTS.length, 14);
  for (const part of PARTS) {
    const m = measure(part);
    assert.ok(m.ms < BUILD_BUDGET_MS, `${part.id}: ${m.ms.toFixed(0)} ms`);
    assert.deepEqual(validateRackParams(part, {}), part.defaults);
    assert.throws(() => validateRackParams(part, { bogus: 1 }), new RegExp(part.noun));
    assert.deepEqual(coerceRackParams(part, { ...part.defaults, upright: 76.2 }), part.defaults);
  }
});

test('band pegs: Monster Lite 10 in x 5/8 in hex-head, REP 2.0 8.5 in with the washer 3-3/8 in from the end and 4.5 in usable', () => {
  const ml = measure(ROGUE_MONSTER_LITE_BAND_PEG, { upright: inch(3) }), rod = get(ml, 'Band peg 5/8 in rod');
  near(size(rod, 1), inch(10), .5, 'Monster Lite peg length under the head'); near(size(rod, 0), inch(.625), .2, 'rod diameter');
  near(get(ml, 'Hex head (stamped R, USA)').max[1], -inch(3) / 2, .01, 'head on the far face');
  assert.equal(measure(ROGUE_MONSTER_LITE_BAND_PEG, { finish: 1 }).colors.get('Band peg 5/8 in rod'), '#1d1e20', 'black finish');
  for (const [series, rodDia] of [[0, inch(1)], [1, inch(.625)]] as const) {
    const m = measure(REP_BAND_PEGS_2, { series, upright: inch(3) }), peg = get(m, 'Chrome solid steel peg'), washer = get(m, 'Welded stop washer'), head = get(m, 'Flat head disc');
    near(head.max[1] - peg.min[1], inch(8.5), .6, 'end to end'); near(washer.min[1] - peg.min[1], inch(3.375), .3, 'washer from the bottom end');
    near(head.min[1] - washer.max[1], inch(4.5), .3, 'usable length'); near(size(peg, 0), rodDia, .2, 'rod diameter');
    assert.ok(get(m, 'Hairpin cotter pin').max[1] < -inch(3) / 2, 'cotter pin behind the far face');
  }
});

test('storage pins: Monster 1.9 in sheath 12.75/6.75 in loadable; SP3358 family bolts 6 in on centre with published post lengths', () => {
  for (const [length, loadable] of [[0, inch(12.75)], [1, inch(6.75)]] as const) {
    const m = measure(ROGUE_MONSTER_PLATE_STORAGE_PIN, { length }), sheath = get(m, 'Machined Acetal sheath');
    near(size(sheath, 1), loadable, .5, 'loadable length'); near(size(sheath, 0), inch(1.9), .3, 'sheath diameter');
    assert.ok(get(m, 'Machined nut').max[1] < -75 / 2, 'nut behind the far face');
  }
  const knob = measure(ROGUE_MONSTER_PLATE_STORAGE_PIN, { rear: 1 });
  near(size(get(knob, 'Monster Knurled Knob'), 0), inch(2.125), .3, 'Knurled Knob diameter');
  const loaded = measure(ROGUE_MONSTER_PLATE_STORAGE_PIN, { load: 5 });
  assert.equal(loaded.names.filter(n => /Stored plate-\d+ 25 kg$/.test(n)).length, 3, 'three 25 kg bumpers fit 12.75 in');
  for (const [version, loadable] of [[0, inch(12.5)], [1, inch(11.75)], [2, inch(12.25)]] as const) {
    const m = measure(ROGUE_SP3358_PLATE_STORAGE, { version, mountSpacing: 50.8 }), post = get(m, 'Storage post'), bolts = get(m, 'Through bolt');
    near(size(post, 1) - .5, loadable, .6, `post loadable length v${version}`);
    near(size(bolts, 2) - (version === 1 ? inch(1) : inch(.625)), inch(6), .5, 'bolts 6 in on centre');
    near((post.max[2] + post.min[2]) / 2, -inch(3), .5, 'post centred between the bolts');
  }
});

test('JD wrist roller: 2 in x 16 in stainless grip, cord spool and carabiner, crank grips 1.25/1.5 in', () => {
  const m = measure(JD_WRIST_ROLLER), grip = get(m, 'Knurled stainless grip');
  near(size(grip, 0), inch(2), .3, 'grip diameter'); near(size(grip, 1), inch(16), 1, 'grip length (including the spool)');
  assert.ok(get(m, 'Stainless carabiner').min[2] < -inch(2), 'carabiner hangs below the roller');
  for (const [crank, d] of [[1, inch(1.25)], [2, inch(1.5)]] as const) near(size(get(measure(JD_WRIST_ROLLER, { crank }), 'Crank grip'), 0), d, .3, 'crank grip');
});

test('Oak Club Iron 3: 16.75 x 10.75 in backboard in front of the face, 9 in rim, three colourways', () => {
  const m = measure(OAK_CLUB_IRON_3), board = get(m, 'Laser-cut steel backboard'), rim = get(m, '9 in mini rim');
  near(size(board, 0), inch(16.75), .5, 'board width'); near(size(board, 2), inch(10.75), .5, 'board height');
  assert.ok(board.min[1] > 75 / 2, 'board stands off the mounting face');
  near(size(rim, 0) - inch(1), inch(9), 1, 'rim inside diameter');
  assert.equal(measure(OAK_CLUB_IRON_3, { colour: 1 }).colors.get('Laser-cut steel backboard'), '#b3161d');
});

test('Mammoth belt squat: 39–48.75 in pivot to tip, 30 in 2x3 tube, 14 in horn, rests on the floor and swings about the pin', () => {
  for (const [length, L] of [[0, inch(39)], [3, inch(48.75)]] as const) {
    const m = measure(FRINGE_MAMMOTH_BELT_SQUAT, { length, pose: 1 }), tube = get(m, '2x3 11 ga main tube');
    near(-tube.min[0], L, 1, 'pivot to tip (level)'); near(size(tube, 0), inch(30), 5, 'main tube length'); near(size(tube, 1), inch(3), .5, 'tube width'); near(size(tube, 2), inch(2), .5, 'tube height');
    near(size(get(m, '14 in loading horn'), 2), inch(14), .5, 'horn length');
  }
  const rest = measure(FRINGE_MAMMOTH_BELT_SQUAT, { pose: 0 }), top = measure(FRINGE_MAMMOTH_BELT_SQUAT, { pose: 2 });
  assert.ok(get(rest, 'Rubber tip foot').min[2] < -400, 'tip drops toward the floor at rest');
  assert.ok(get(top, 'Lifting eye bolt').min[2] > 300, 'tip rises at the top of the squat');
  const left = measure(FRINGE_MAMMOTH_BELT_SQUAT, { side: 1, pose: 1 });
  assert.ok(get(left, '2x3 11 ga main tube').min[0] > 0, 'direction param points the arm to +X');
  const loaded = measure(FRINGE_MAMMOTH_BELT_SQUAT, { pose: 1, load: 3 });
  assert.equal(loaded.names.filter(n => /Horn plate-\d+ 45 lb$/.test(n)).length, 2, 'plates stacked on the horn');
  // Default placement: low on the outer face with the tip reaching the floor.
  const doc = suggestPlacement(createAssembly(), FRINGE_MAMMOTH_BELT_SQUAT.id as never).proposal!.doc, [unit] = resolveAssembly(doc).filter(e => e.part === FRINGE_MAMMOTH_BELT_SQUAT.id);
  near(unit.mount!.center[2] - get(rest, 'Rubber tip foot').min[2] * -1, 0, 40, 'rest pose tip at the floor');
});

test('Monster Lite lever arms: 38.75 in arms, handles 10 in apart, 11-5/8 in posts, mirrored pair, swing about the hinge', () => {
  const m = measure(ROGUE_MONSTER_LITE_LEVER_ARMS), arm = get(m, '3x3 11 ga lever arm'), handle = get(m, 'Bent 1 in pipe handle'), post = get(m, 'Weight post');
  near(size(arm, 2), inch(38.75), .5, 'arm length'); near(size(arm, 0), inch(3), .3, 'arm tube');
  near(size(handle, 2) - inch(1.315), inch(10), 1, 'grips 10 in apart'); near(size(post, 0), inch(11.625), .5, 'post loadable length');
  assert.ok(handle.max[0] < 0 && post.min[0] > 0, 'handle inboard (-X), post outboard (+X)');
  const mirrored = measure(ROGUE_MONSTER_LITE_LEVER_ARMS, { mirror: 1 });
  assert.ok(get(mirrored, 'Bent 1 in pipe handle').min[0] > 0, 'second arm of the pair is mirrored');
  const swung = measure(ROGUE_MONSTER_LITE_LEVER_ARMS, { swing: 3 }), a90 = get(swung, '3x3 11 ga lever arm');
  near(size(a90, 1), inch(38.75), 1, 'arm horizontal at 90°');
  assert.ok(get(measure(ROGUE_MONSTER_LITE_LEVER_ARMS, { handle: 1 }), 'Neutral grip bar'));
  const doc = suggestPlacement(createAssembly(), ROGUE_MONSTER_LITE_LEVER_ARMS.id as never).proposal!.doc, a = doc.accessories.at(-1)!;
  assert.equal(a.paired, true); assert.deepEqual(resolveAssembly(doc).filter(e => e.ownerId === a.id).map(u => u.params.mirror), [undefined, 1]);
});

test('Vendetta 180°: 13 rest positions in 15° steps, the arm swings about the index disc, 3x3 only', () => {
  assert.deepEqual(VENDETTA_POSITIONS, [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]);
  const down = get(measure(VENDETTA_180_LEVER_ARM_ADAPTERS, { position: 0 }), '3x3 lever arm'), level = get(measure(VENDETTA_180_LEVER_ARM_ADAPTERS, { position: 6 }), '3x3 lever arm'), up = get(measure(VENDETTA_180_LEVER_ARM_ADAPTERS, { position: 12 }), '3x3 lever arm');
  assert.ok(down.min[2] < -900 && size(down, 1) < 100, 'hanging'); assert.ok(size(level, 1) > 900 && size(level, 2) < 100, 'horizontal at 90°'); assert.ok(up.max[2] > 900, 'straight up at 180°');
  assert.ok(measure(VENDETTA_180_LEVER_ARM_ADAPTERS, { position: 3 }).boxes.has('5/8 in hitch pin'));
  assert.throws(() => addAccessory(applyPreset('rogue-r3-four-2295.525-762'), VENDETTA_180_LEVER_ARM_ADAPTERS.id, { hole: 20 }, true, { hardware: 1 }), /3x3/);
});

test('Shoulder Boulder: 524 mm wide, 307.5 mm cranks to 50 x 172 mm horns, 686 mm across the horns, 785 mm tall, raises symmetrically', () => {
  const m = measure(BOS_SHOULDER_BOULDER), horn = get(m, '50 mm weight horn');
  near(size(get(m, 'Chrome index disc'), 0), 524, 20, 'width across the index discs');
  near(size(horn, 0), 686, 15, 'horn span hanging'); near(size(horn, 1), 172, 2, 'horn length'); near(size(horn, 2), 50, 2, 'horn diameter');
  near(m.all.max[2] - m.all.min[2], 785, 40, 'overall height'); near(size(m.all, 1), 465, 30, 'overall depth');
  const up = measure(BOS_SHOULDER_BOULDER, { swing: 3 }), hornUp = get(up, '50 mm weight horn');
  near(hornUp.max[0], -hornUp.min[0], .5, 'both sides swing symmetrically'); assert.ok(hornUp.max[2] > horn.max[2] + 200, 'cranks rise with the swing');
});

test('Velocidor: 25-3/16 in wide, 12 in tall, 1.9 in x 16 in handles in three socket widths and four clocks', () => {
  const m = measure(ROGUE_VELOCIDOR), bar = get(m, '3x3 7 ga chevron crossbar');
  near(size(bar, 0) + 12, inch(25.1875), 3, 'crossbar width with caps'); near(m.all.max[2] - m.all.min[2], inch(12), inch(1), 'height');
  near(size(get(m, 'ROGUE handle end cap'), 2) - 1, inch(1.9), 1, 'handle diameter');
  for (const [spacing, root] of [[0, inch(13.5)], [1, inch(17.25)], [2, inch(21)]] as const) {
    const c = get(measure(ROGUE_VELOCIDOR, { spacing, angle: 1 }), 'Handle collar');
    near(size(c, 0) - inch(2.25), root, 1.5, `socket spacing ${spacing}`);
  }
  const std = get(m, 'ROGUE handle end cap'), par = get(measure(ROGUE_VELOCIDOR, { angle: 1 }), 'ROGUE handle end cap');
  assert.ok(size(std, 0) > size(par, 0) + 80, 'standard clock splays the handles 7° outward');
  assert.ok(get(measure(ROGUE_VELOCIDOR, { angle: 3 }), 'ROGUE handle end cap').max[2] > std.max[2] + 40, 'up clock raises the tips');
});

test('RX3 Center Post: 576 mm out from the face, 390 mm tall, 230 mm mount plate, two 1 in pins', () => {
  const m = measure(GETRXD_RX3_CENTER_POST), post = get(m, '3x3 11 ga center post'), plate = get(m, 'Mount plate');
  near(post.max[1] - 75 / 2, 576, 2, 'width from the mounting face'); near(size(post, 2), 390, 2, 'height'); near(size(plate, 2), 230, 1, 'plate height');
  near(size(get(m, '1 in chrome pin'), 0), inch(1), .8, 'pin diameter');
  const doc = suggestPlacement(applyPreset('rogue-rm-monster-2-four-2295.525-1092.2'), GETRXD_RX3_CENTER_POST.id as never).proposal!.doc;
  assert.deepEqual(resolveAssembly(doc).filter(e => e.part === GETRXD_RX3_CENTER_POST.id)[0].mounts.map(x => x.hole).reduce((a, b) => a - b), 2, 'pins two stations apart');
});

test('Rhino drop-in: 49 in wide, 48.5 in deep, 78.5 in tall, 21.5 in past the uprights, 7 in platform; fits 43 in Monster bays only', () => {
  const m = measure(ROGUE_RHINO_BELT_SQUAT_DROP_IN, { upright: inch(3) }), f = inch(3) / 2;
  near(m.all.max[2] + inch(2.5), inch(78.5), 3, 'height from the floor'); near(m.all.min[2], -inch(2.5), .5, 'floor');
  near(get(m, 'Tower foot plate').max[1] - f, inch(21.5), 5, 'extension past the uprights');
  near(m.all.max[1] - get(m, 'Diamond tread plate').min[1], inch(48.5), inch(1.2), 'overall depth');
  near(get(m, 'Diamond tread plate').max[2] + inch(2.5), inch(7), .5, 'platform height');
  near(size(get(m, 'Diamond tread plate'), 0), inch(48.5), 2, 'platform width');
  near(size(get(m, 'Stainless weight post'), 0) / 2 - inch(1.5) - 34, inch(15.75), 1, 'weight post length');
  const released = get(measure(ROGUE_RHINO_BELT_SQUAT_DROP_IN, { pose: 1 }), 'UHMW Rhino horn'), engaged = get(m, 'UHMW Rhino horn');
  assert.ok(released.max[1] < engaged.max[1] - 50, 'releasing swings the horn out from under the trolley');
  const rm4 = applyPreset('rogue-rm-monster-2-four-2295.525-1092.2'), fits = suggestPlacement(rm4, ROGUE_RHINO_BELT_SQUAT_DROP_IN.id as never);
  assert.ok(fits.proposal, fits.reason); assert.equal(fits.proposal!.doc.accessories.at(-1)!.target.hole, 0, 'hinge on the lowest hole');
  assert.throws(() => validateAssembly({ ...createAssembly({ emptyAccessories: true }), accessories: [{ id: 'x', part: ROGUE_RHINO_BELT_SQUAT_DROP_IN.id as never, target: { uprightId: 'front-left', face: 'front', hole: 0 }, paired: false, params: {} }], rack: { ...createAssembly().rack, width: 900 } }), /43 in/);
});

test('bore classes: Monster 1 in parts refuse 5/8 in racks; autoFit picks Monster Lite hardware on RML-390 and Monster on RM-4', () => {
  const rml = applyPreset('rogue-rml-3-four-2295.525-762'), rm4 = applyPreset('rogue-rm-monster-2-four-2295.525-1092.2');
  for (const part of [ROGUE_MONSTER_PLATE_STORAGE_PIN, GETRXD_RX3_CENTER_POST]) assert.match(suggestPlacement(rml, part.id as never).reason, /exceeds the rack bore/);
  const fit = (doc: typeof rml, part: RackPart) => suggestPlacement(doc, part.id as never).proposal!.doc.accessories.at(-1)!.params;
  assert.equal(fit(rml, ROGUE_VELOCIDOR).series, 0); assert.equal(fit(rm4, ROGUE_VELOCIDOR).series, 1);
  assert.equal(fit(rml, ROGUE_SP3358_PLATE_STORAGE).version, 0); assert.equal(fit(rm4, ROGUE_SP3358_PLATE_STORAGE).version, 1);
  assert.equal(fit(rml, ROGUE_MONSTER_LITE_LEVER_ARMS).series, 0); assert.equal(fit(rm4, ROGUE_MONSTER_LITE_LEVER_ARMS).series, 1);
  assert.equal(fit(rml, FRINGE_MAMMOTH_BELT_SQUAT).hardware, 1); assert.equal(fit(rm4, FRINGE_MAMMOTH_BELT_SQUAT).hardware, 0);
  assert.equal(fit(rml, JD_WRIST_ROLLER).hardware, 2); assert.equal(fit(rml, REP_BAND_PEGS_2).series, 1);
  assert.ok(suggestPlacement(rml, ROGUE_MONSTER_LITE_BAND_PEG.id as never).proposal, 'Monster Lite pegs fit Monster Lite');
});
