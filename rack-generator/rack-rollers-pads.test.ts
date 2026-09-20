/** Rack rollers, seats & pads (#132): every entry builds valid solids across its options, the published dimensions
 * come out of the builds, and each part mounts on the racks its maker sells it for (and explains why not elsewhere).
 * The registry contract (extents, bodies, budgets, pairing, round trips) is swept by rack-registry.test.ts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { definitions } from './catalog.ts';
import { rackBuildParams, validateRackParams, coerceRackParams } from './rack-registry.ts';
import { floorOptions } from './floor-part.ts';
import { applyPreset } from './presets.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { createAssembly, resolveAssembly } from './assembly.ts';
import {
  PARTS, inch, REP_PEGASUS, PEGASUS, REP_LEG_ROLLER_2, REP_LR2, ROGUE_MONSTER_SINGLE_LEG_ROLLER_2, ROGUE_SLR2, ROGUE_MONSTER_LITE_LEG_ROLLER, ROGUE_ML_ROLLER,
  BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER, BOS_ROLLER, ROGUE_MONSTER_PRITCHETT_PAD, PRITCHETT, BELLS_OF_STEEL_SEAL_ROW_PAD, SEAL_ROW, PRIME_PRODIGY_STABILITY_PAD, PRODIGY,
} from './rack-parts/rack-rollers-pads.ts';
import type { NumericParams, RackDoc, SolidPart } from './types.ts';
import type { RackPart } from './rack-part.ts';
const api = await Module(); api.setup();
type Box = { min: number[]; max: number[] };
const T3 = inch(3), FACE = T3 / 2;
/** Build on a true 3 in tube with 2 in pitch (the racks these products are sold for). */
function measure(part: RackPart, params: NumericParams = {}, tube = T3) {
  const def = definitions.find(d => d.id === part.id)!, solids: SolidPart[] = def.build(api, rackBuildParams(part, { upright: tube, mountSpacing: inch(2), holeDiameter: inch(1 + 1 / 16), ...params }));
  try {
    const boxes = new Map<string, Box>(), all: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const s of solids) {
      assert.equal(s.solid.status(), 'NoError', `${part.id} ${s.name}`); assert.ok(!s.solid.isEmpty() && s.solid.volume() > 0, `${part.id} ${s.name}`);
      const b = s.solid.boundingBox(); boxes.set(s.name, { min: [...b.min], max: [...b.max] });
      for (let i = 0; i < 3; i++) { all.min[i] = Math.min(all.min[i], b.min[i]); all.max[i] = Math.max(all.max[i], b.max[i]); }
    }
    return { all, boxes, get: (name: string) => { const b = boxes.get(name); assert.ok(b, `${part.id}: missing ${name}`); return b!; } };
  } finally { solids.forEach(s => s.solid.delete()); }
}
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tolerance}`);

test('every entry builds valid closed solids for defaults and the first, middle and last value of every param', () => {
  for (const part of PARTS) {
    const sets: NumericParams[] = [{}];
    for (const param of part.params) {
      const options = floorOptions(param, part.defaults);
      for (const v of new Set([options[0], options[Math.floor(options.length / 2)], options.at(-1)!])) sets.push({ [param.key]: v });
    }
    for (const p of sets) for (const tube of [75, T3]) measure(part, p, tube);
    assert.deepEqual(validateRackParams(part, {}), part.defaults);
    assert.throws(() => validateRackParams(part, { junk: 1 }), new RegExp(part.noun));
    assert.deepEqual(coerceRackParams(part, { ...part.defaults }), part.defaults);
  }
});

test('REP Leg Roller 2.0: 21.74 in un-installed, 18.04 in from the upright, 15.08 x 5.65 in pad, knob behind the far face', () => {
  const m = measure(REP_LEG_ROLLER_2), pad = m.get('Molded CleanGrip roller pad'), knob = m.get('Knurled securing knob');
  near(size(m.all, 1), REP_LR2.total, 2, 'overall length on a 3 in tube'); near(m.all.max[1] - FACE, REP_LR2.extension, 1, 'extension from the upright');
  near(size(pad, 1), inch(15.08), 1, 'pad length'); near(size(pad, 0), inch(5.65), 1, 'pad diameter');
  assert.ok(knob.max[1] <= -FACE + .01, 'the securing knob clamps on the far face');
});

test('Rogue Monster Single Leg Roller 2.0: 22 in total, 16 x 4.25 in pad, 1 in rod, knurled nut behind the upright', () => {
  const m = measure(ROGUE_MONSTER_SINGLE_LEG_ROLLER_2), pad = m.get('27 oz vinyl EPDM foam pad'), rod = m.get('1 in threaded steel rod');
  near(size(m.all, 1), ROGUE_SLR2.total, 8, 'total length on a 3 in tube'); near(size(pad, 1), inch(16), 1, 'pad length'); near(size(pad, 0), inch(4.25), 1, 'pad diameter');
  near(size(rod, 0), inch(1), .3, 'rod diameter'); assert.ok(m.get('Knurled screw-on nut').max[1] <= -FACE + .01);
});

test('Rogue Monster Lite leg roller: 17.75 in overall, 13 x 5 in pad, 0.625 in detent pin across a side hole', () => {
  const m = measure(ROGUE_MONSTER_LITE_LEG_ROLLER), pad = m.get('Vinyl-upholstered foot pad'), detent = m.get('0.625 in detent pin');
  near(m.all.max[1] - FACE, ROGUE_ML_ROLLER.overall, 1, 'overall from the face'); near(size(pad, 1), inch(13), 1, 'pad length'); near(size(pad, 2), inch(5), 1, 'pad diameter');
  near(size(detent, 2), inch(.625), 1, 'detent pin diameter'); assert.ok(size(detent, 0) > T3, 'detent pin crosses the upright');
  near((detent.min[2] + detent.max[2]) / 2, -3 * inch(2), .5, 'detent pin three 2 in stations below the hanger pin');
});

test('Bells of Steel split squat roller: 22-3/4 in total, 16 x 4 in pad, star knob on the far face, Hydra or Manticore pin', () => {
  for (const hardware of [0, 1]) {
    const m = measure(BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER, { hardware }), pad = m.get('Vinyl high-density foam pad'), pin = m.get('Threaded mounting pin');
    near(size(m.all, 1), BOS_ROLLER.total, 8, 'total length'); near(size(pad, 1), inch(16), 1, 'pad length'); near(size(pad, 0), inch(4), 1, 'pad diameter');
    near(size(pin, 0), hardware ? 24.6 : 15.6, .3, 'threaded pin');
    assert.ok(m.get('Chrome star knob').max[1] <= -FACE + .01);
  }
});

test('Rogue Monster Pritchett Pad: 33 in from the upright, 12 in pad tapering 11 in to 8 in, 3x3 in arm, 1 in or 5/8 in pin', () => {
  for (const series of [0, 1]) {
    const m = measure(ROGUE_MONSTER_PRITCHETT_PAD, { series }), pad = m.get('Self-skinned polyurethane pad'), arm = m.get('3x3 in 11-gauge arm');
    near(m.all.max[1] - FACE, PRITCHETT.extension, 3, 'pad extends 33 in from the face'); near(size(pad, 0), inch(11), 1, 'pad bottom width');
    near(size(arm, 0), inch(3), .1, '3x3 in arm');
    const pin = m.get(series ? '5/8 in hitch pin' : 'Welded 1 in mounting pin');
    near(size(pin, 2), series ? 15.6 : 24.4, .4, 'mounting pin');
    if (series) assert.ok(m.get('Hitch pin clip').max[1] < -FACE, 'Monster Lite hitch clip behind the upright');
  }
  // The pad faces up and back toward the rack: its high end is the outer (8 in) end.
  const pad = measure(ROGUE_MONSTER_PRITCHETT_PAD).get('Self-skinned polyurethane pad');
  assert.ok(size(pad, 2) > inch(2.25) + 40, 'pad is inclined');
});

test('Bells of Steel seal row pad: 16 x 12 x 2.25 in pad, 11.5 in bracket, 7.1 in selector wheel, 7 angles', () => {
  const m = measure(BELLS_OF_STEEL_SEAL_ROW_PAD), pad = m.get('Vinyl chest pad'), bracket = m.get('Wrap-around bracket'), wheel = m.get('Selector wheel plates');
  near(size(pad, 0), inch(12), 1, 'pad width'); near(size(pad, 1), inch(16), 1, 'pad length (flat)'); near(size(pad, 2), inch(2.25), .5, 'pad thickness');
  near(size(bracket, 2), inch(11.5), 1, 'bracket length'); near(wheel.max[1] - FACE, inch(7.1), 1, 'selector wheel depth');
  assert.equal(SEAL_ROW.angles.length, 7);
  const steep = measure(BELLS_OF_STEEL_SEAL_ROW_PAD, { angle: 6 }).get('Vinyl chest pad');
  assert.ok(size(steep, 2) > inch(12), 'the 75° position stands the pad up');
});

test('REP Pegasus: 27.8 x 24.6 in, 24.8 in from the rack, 16.3 in tall, 13.6 in seat, 5.8 in rollers 3-8 in above the seat', () => {
  const low = measure(REP_PEGASUS, { roller: 0 }), seat = low.get('CleanGrip seat pad'), rollers = low.get('CleanGrip leg rollers');
  near(size(low.all, 1), inch(27.8), 8, 'total length'); near(size(low.all, 0), inch(24.6), 3, 'width across the rollers'); near(low.all.max[1] - FACE, inch(24.8), 2, 'extension from the rack');
  near(size(low.all, 2), inch(16.3), 10, 'total height with the rollers lowest');
  near(size(seat, 1), inch(13.6), 1, 'seat pad length'); near(size(seat, 0), inch(11), 1, 'seat pad width'); near(size(seat, 2), inch(2.5), .5, 'seat pad thickness');
  near(size(rollers, 2), inch(5.8), 1, 'roller diameter');
  for (const [i, rise] of PEGASUS.rollerHeights.entries()) {
    const m = measure(REP_PEGASUS, { roller: i });
    near(m.get('CleanGrip leg rollers').min[2] - m.get('CleanGrip seat pad').max[2], inch(rise), 1, `rollers ${rise} in above the seat`);
  }
  for (const [series, h] of [[0, 8.9], [1, 9.8]] as const) near(size(measure(REP_PEGASUS, { series }).get('Sleeve'), 2), inch(h), 1, 'height on the upright');
  // Seat at 90° stands up as a chest pad facing out of the rack.
  const upright = measure(REP_PEGASUS, { seat: 6 }).get('CleanGrip seat pad');
  near(size(upright, 2), inch(13.6), 2, 'vertical seat'); assert.ok(size(upright, 1) < inch(3), 'vertical seat is thin along Y');
});

test('Prime Prodigy stability pad: 38-49 in long in 12 steps, 13-3/4 in half-moon pad, vertical or horizontal', () => {
  for (const [i, L] of [[0, 38], [11, 49]] as const) {
    const m = measure(PRIME_PRODIGY_STABILITY_PAD, { length: i });
    near(m.get('Vinyl half-moon pad').max[1] - FACE, inch(L), 6, `${L} in length`);
    near(size(m.get('Vinyl half-moon pad'), 2), inch(13.75), 1, 'pad height (vertical)');
  }
  near(size(measure(PRIME_PRODIGY_STABILITY_PAD, { orientation: 1 }).get('Vinyl half-moon pad'), 0), inch(13.75), 1, 'pad runs across when horizontal');
  assert.equal(PRODIGY.lengths.length, 12); assert.equal(PRODIGY.swings.length, 11); assert.equal(PRODIGY.padAngles.length, 9);
  const swung = measure(PRIME_PRODIGY_STABILITY_PAD, { swing: 10 }).get('Vinyl half-moon pad');
  assert.ok(swung.min[0] > 600, 'the 75° swing position carries the pad out to the side');
});

/** Suggested placement on a starter rack, or the refusal reason. */
function place(preset: string, part: RackPart) {
  const doc: RackDoc = applyPreset(preset), r = suggestPlacement(doc, part.id as Parameters<typeof suggestPlacement>[1]);
  if (!r.proposal) return { reason: r.reason };
  const a = r.proposal.doc.accessories.at(-1)!;
  return { params: { ...part.defaults, ...a.params }, units: resolveAssembly(r.proposal.doc).filter(e => e.ownerId === a.id) };
}
const RM4 = 'rogue-rm-monster-2-four-2295.525-1092.2', RML390 = 'rogue-rml-3-four-2295.525-762', R3 = 'rogue-r3-four-2295.525-762', T2 = 'titan-t2-four-1803.4-660.4';
const PR5000 = 'rep-pr-5000-four-2362.2-762', PR4000 = 'rep-pr-4000-four-2362.2-762', HYDRA = 'bos-hydra-four-2286-762', MANTICORE = 'bos-manticore-four-2286-762';

test('each part mounts on the racks its maker sells it for and explains the rest', () => {
  // Rogue Monster (3x3, 1 in hardware): the 1 in roller and the Monster Pritchett Pad.
  for (const part of [ROGUE_MONSTER_SINGLE_LEG_ROLLER_2, ROGUE_MONSTER_PRITCHETT_PAD]) assert.ok(place(RM4, part).units?.length, `${part.id} on the RM-4`);
  assert.equal(place(RM4, ROGUE_MONSTER_PRITCHETT_PAD).params?.series, 0);
  // Monster Lite (3x3, 5/8 in): the hanger roller and the Monster Lite Pritchett Pad; the 1 in parts are refused by the bore.
  assert.ok(place(RML390, ROGUE_MONSTER_LITE_LEG_ROLLER).units?.length); assert.equal(place(RML390, ROGUE_MONSTER_PRITCHETT_PAD).params?.series, 1);
  assert.match(place(RML390, ROGUE_MONSTER_SINGLE_LEG_ROLLER_2).reason ?? '', /bore/);
  // 2x3 and 2x2 posts are refused with a fit message.
  for (const preset of [R3, T2]) for (const part of PARTS) assert.match(place(preset, part).reason ?? '', /fit|bore|station|hole|face|mount/i, `${part.id} on ${preset}`);
  // REP: Leg Roller 2.0 is PR-5000 only; Pegasus picks its series from the bore.
  assert.ok(place(PR5000, REP_LEG_ROLLER_2).units?.length); assert.match(place(PR4000, REP_LEG_ROLLER_2).reason ?? '', /bore/);
  assert.equal(place(PR5000, REP_PEGASUS).params?.series, 0); assert.equal(place(PR4000, REP_PEGASUS).params?.series, 1);
  // Bells of Steel: Hydra 5/8 in and Manticore 1 in variants.
  for (const part of [BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER, BELLS_OF_STEEL_SEAL_ROW_PAD]) {
    assert.equal(place(HYDRA, part).params?.hardware, 0, `${part.id} on Hydra`); assert.equal(place(MANTICORE, part).params?.hardware, 1, `${part.id} on Manticore`);
  }
  // Prime Prodigy needs 1 in holes on 2 in centres.
  assert.ok(place(MANTICORE, PRIME_PRODIGY_STABILITY_PAD).units?.length); assert.match(place(PR4000, PRIME_PRODIGY_STABILITY_PAD).reason ?? '', /bore/);
});

test('the Pegasus sleeve pins across the side holes and the seal row pad clamps two stations down', () => {
  const peg = place(PR5000, REP_PEGASUS).units![0], mount = peg.mounts[0];
  assert.ok(Math.abs(mount.pinAxis![2]) < 1e-9 && Math.abs(mount.pinAxis![0] * [0, -1, 0][0] + mount.pinAxis![1] * [0, -1, 0][1]) < 1e-9, 'Pegasus pin runs across the mounting face');
  const seal = place(MANTICORE, BELLS_OF_STEEL_SEAL_ROW_PAD).units![0];
  assert.deepEqual(seal.mounts.map(m => m.hole - seal.mounts[0].hole), [0, -SEAL_ROW.clampStations]);
  // The stock BOS rack still takes every part (75 mm stand-in for 3 in tubes).
  for (const part of PARTS) assert.ok(suggestPlacement(createAssembly(), part.id).proposal, part.id);
});
