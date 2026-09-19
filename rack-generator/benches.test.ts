import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { ADJUSTABLE_LOOKS, PARTS } from './floor-parts/benches.ts';
import {
  IRONMASTER_ANGLES, IRONMASTER_ATTACHMENTS, IRONMASTER_PRO, IRONMASTER_SB, LEG_PRO_ANGLE, ROGUE_PADS, adjustableLayout, inch, ironmasterAttachment, rotYZ,
} from './floor-parts/benches-specs.ts';
import { definitions } from './parts/benches.ts';
import { coerceFloorParams, floorOptions, resolveBy, validateFloorParams } from './floor-registry.ts';
import type { NumericParams, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const byId = (id: string) => definitions.find(d => d.id === id)!;
const bounds = (parts: SolidPart[], filter: (p: SolidPart) => boolean = () => true) => {
  const pick = parts.filter(filter); assert.ok(pick.length, 'no matching solids');
  const all = api.Manifold.union(pick.map(p => p.solid)), b = all.boundingBox(); all.delete(); return b;
};
const build = (id: string, p: NumericParams) => byId(id).build(api, p);
const free = (parts: SolidPart[]) => { for (const p of parts) p.solid.delete(); };
/** Defaults plus the first, middle and last option of every param (dependent options resolved in order). */
function settings(part: (typeof PARTS)[number]) {
  const out: NumericParams[] = [{ ...part.defaults }];
  for (const prm of part.params) {
    const opts = floorOptions(prm, part.defaults);
    for (const v of new Set([opts[0], opts[opts.length >> 1], opts[opts.length - 1]])) out.push(coerceFloorParams(part, { ...part.defaults, [prm.key]: v }));
  }
  return out;
}
test('every bench builds closed, valid solids whose bounds match the footprint', () => {
  for (const part of PARTS) for (const p of settings(part)) {
    const parts = build(part.id, p);
    for (const s of parts) {
      assert.ok(!s.solid.isEmpty() && s.solid.status() === 'NoError' && s.solid.volume() > 0, `${part.id} ${JSON.stringify(p)} ${s.name}`);
      assert.notEqual(s.role, 'frame', 'factory colourways, not rack paint');
    }
    const b = bounds(parts), fp = resolveBy(part.footprint, p), [ox, oz] = fp.offset ?? [0, 0];
    const tag = `${part.id} ${JSON.stringify(p)}`;
    assert.ok(b.min[2] >= -1e-6, `${tag} sits on the floor`);
    assert.ok(Math.abs(b.max[0] - b.min[0] - fp.width) < .5 && Math.abs((b.max[0] + b.min[0]) / 2 - ox) < .5, `${tag} width ${b.max[0] - b.min[0]} vs ${fp.width}`);
    // Floor Z is local −Y.
    assert.ok(Math.abs(b.max[1] - b.min[1] - fp.depth) < .5 && Math.abs(-(b.max[1] + b.min[1]) / 2 - oz) < .5, `${tag} depth ${b.max[1] - b.min[1]} vs ${fp.depth}`);
    free(parts);
  }
});
test('published envelopes and flat pad heights come out of the build', () => {
  const pads = (s: SolidPart) => /pad/i.test(s.name) && !/rail|plate|substrate|print|knob|roller/i.test(s.name);
  const cases: [string, NumericParams, number, number, number][] = [
    // id, params, footprint width, depth, flat pad top (all mm, published → converted)
    ['rogue-adjustable-bench-3', {}, inch(24.75), inch(56.5), inch(17.5)],
    ['rogue-adjustable-bench-2', {}, inch(24.5), inch(56), inch(17.5)],
    ['rogue-manta-ray', {}, inch(24.75), inch(57), inch(17.5)],
    ['freak-athlete-abx', {}, inch(25.2), inch(51.4), inch(17)],
    ['apex-adjustable-bench', {}, inch(27.25), inch(55), inch(17)],
    ['prime-shorty-adjustable-bench', {}, inch(27), inch(51), inch(18)],
    ['major-fitness-plt01', {}, inch(29.2), inch(47.8), inch(17.7)],
    ['titan-elite-adjustable-fid-bench', {}, inch(25.25), inch(56.75), inch(18.25)],
    ['ironmaster-super-bench-pro-v2', {}, inch(21), inch(47), inch(17.2)],
    ['ironmaster-super-bench', {}, inch(18.75), inch(44), inch(20)],
    ['rogue-flat-utility-bench-2', {}, inch(14), inch(47), inch(18)],
    ['rogue-monster-utility-bench-2', {}, inch(26.25), inch(47.375), inch(17)],
    ['rogue-monster-utility-bench-2', { height: 1 }, inch(26.25), inch(47.375), inch(15)],
    ['rogue-monster-utility-bench-2', { pad: 2 }, inch(26.25), inch(50), inch(19.25)],
    ['rogue-thompson-fat-pad', { base: 1 }, inch(26.25), inch(50), inch(17.25)],
    ['titan-series-single-post-flat-bench', {}, inch(26), inch(50), inch(17)],
    ['titan-seated-stationary-bench', {}, inch(30), inch(43), inch(37)],
  ];
  for (const [id, p, w, d, top] of cases) {
    const part = PARTS.find(q => q.id === id)!, params = validateFloorParams(part, p), parts = build(id, params), b = bounds(parts), pb = bounds(parts, pads);
    assert.ok(Math.abs(b.max[0] - b.min[0] - w) < 1 && Math.abs(b.max[1] - b.min[1] - d) < 1, `${id} envelope ${(b.max[0] - b.min[0]).toFixed(1)} × ${(b.max[1] - b.min[1]).toFixed(1)}`);
    assert.ok(Math.abs(pb.max[2] - top) < 6, `${id} pad top ${pb.max[2].toFixed(1)} vs ${top.toFixed(1)}`);
    free(parts);
  }
  // Thompson Fat Pad: 50 × 14.5 × 4.5 in, the widest Rogue pad.
  const fat = build('rogue-thompson-fat-pad', { base: 0 }), fb = bounds(fat, s => s.name === 'Pad · grabber vinyl');
  assert.ok(Math.abs(fb.max[0] - fb.min[0] - inch(14.5)) < .5 && Math.abs(fb.max[1] - fb.min[1] - inch(50)) < .5 && Math.abs(fb.max[2] - fb.min[2] - inch(4.5)) < .5);
  assert.deepEqual(ROGUE_PADS.map(p => +(p.w / 25.4).toFixed(2)), [12, 12.5, 14.5]);
  free(fat);
});
test('ladder linkages land on a real station for every published angle', () => {
  for (const [id, look] of Object.entries(ADJUSTABLE_LOOKS)) {
    const s = look.spec, l = adjustableLayout(s);
    const stations = s.backAngles.map(l.backStation);
    for (const [i, a] of s.backAngles.entries()) {
      const pin = l.backPin(a), top = l.backTop(a);
      assert.ok(Math.abs(Math.hypot(pin[0] - top[0], pin[1] - top[1]) - l.backLen) < 1e-6, `${id} ${a}° link length`);
      assert.ok(stations[i] >= l.ladder.from && stations[i] <= l.ladder.to && l.ladder.to < l.spineLen, `${id} ${a}° on the ladder`);
      if (i) assert.ok(stations[i] < stations[i - 1], `${id} steeper angles step toward the pivot`);
    }
    if (look.seatAdjust === 'link') for (const a of s.seatAngles) {
      const st = l.seatStation(a), pin = l.seatPin(a), top = l.seatTop(a);
      assert.ok(st > 0 && st < l.legLen && Math.abs(Math.hypot(pin[0] - top[0], pin[1] - top[1]) - l.seatLen) < 1e-6, `${id} seat ${a}°`);
    }
    // Back pad head end rises with the angle; flat pads sit at the published top.
    const head = (a: number) => rotYZ([l.backEnd, s.top], a, l.pivot)[1];
    assert.ok(Math.abs(head(0) - s.top) < 1e-9 && head(Math.max(...s.backAngles)) > s.top + .8 * s.back.len, id);
  }
  // Published angle lists (degrees).
  assert.deepEqual(ADJUSTABLE_LOOKS['rogue-adjustable-bench-3'].spec.backAngles, [0, 15, 30, 37.5, 45, 52.5, 60, 67.5, 75, 85]);
  assert.deepEqual(ADJUSTABLE_LOOKS['rogue-manta-ray'].spec.seatAngles, [-20, 0, 10, 20, 30]);
  assert.equal(ADJUSTABLE_LOOKS['apex-adjustable-bench'].spec.backAngles.length, 17);
  assert.equal(ADJUSTABLE_LOOKS['apex-adjustable-bench'].spec.seatAngles.length, 10);
  assert.deepEqual(ADJUSTABLE_LOOKS['freak-athlete-abx'].spec.backAngles, [0, 15, 22, 30, 37, 45, 52, 60, 67, 75, 85]);
});
test('Ironmaster pad pivots through the 11 lock-out angles and attachments sit where the manuals put them', () => {
  assert.deepEqual([...IRONMASTER_ANGLES], [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 85]);
  const part = PARTS.find(p => p.id === 'ironmaster-super-bench-pro-v2')!;
  // Leg Attachment PRO only at 10°, with its support foot on the floor.
  const leg = IRONMASTER_ATTACHMENTS.indexOf('Leg Attachment PRO');
  assert.deepEqual(floorOptions(part.params[1], { attachment: leg }), [LEG_PRO_ANGLE]);
  assert.throws(() => validateFloorParams(part, { attachment: leg, backrestAngle: 40 }), /bench angle/);
  assert.deepEqual(coerceFloorParams(part, { attachment: leg, backrestAngle: 60, inclineSeat: 0 }), { attachment: leg, backrestAngle: 10, inclineSeat: 0 });
  const withLeg = build(part.id, { attachment: leg, backrestAngle: 10, inclineSeat: 0 });
  assert.ok(Math.abs(bounds(withLeg, s => s.name === 'Attachment grips').min[2]) < 1, 'support foot touches the floor');
  free(withLeg);
  // Bar Dip Handle grips 50–52.5 in off the floor with the bench vertical (85°).
  const dip = IRONMASTER_ATTACHMENTS.indexOf('Bar Dip Handle'), g = ironmasterAttachment(IRONMASTER_PRO, dip);
  const crossbar = rotYZ([g.tubes[1].pts[1][1], g.tubes[1].pts[1][2]], 85, IRONMASTER_PRO.pivot);
  assert.ok(crossbar[1] > inch(49) && crossbar[1] < inch(53.5), `dip handle ${(crossbar[1] / 25.4).toFixed(1)} in`);
  // Seated Press Pad: 18 in tall pad, top 21 in above the bench pad, 10 in in from the head end.
  const press = ironmasterAttachment(IRONMASTER_PRO, IRONMASTER_ATTACHMENTS.indexOf('Seated Press Pad')).pads[0];
  assert.ok(Math.abs(press.c[1] + press.len / 2 - IRONMASTER_PRO.top - inch(21)) < 3 && Math.abs(IRONMASTER_PRO.padEnd - (press.c[0] - press.t / 2) - inch(10)) < 1);
  // Pad sweeps: flat at 17.2 in (PRO) / 20 in (original); at 85° the seat end stays above the spine.
  for (const [id, spec] of [['ironmaster-super-bench-pro-v2', IRONMASTER_PRO], ['ironmaster-super-bench', IRONMASTER_SB]] as const) {
    const up = build(id, { attachment: 0, backrestAngle: 85, inclineSeat: 3 }), pb = bounds(up, s => s.name === 'Bench pad · vinyl');
    assert.ok(pb.max[2] > spec.top + 700 && pb.min[2] > 60, `${id} 85° pad ${pb.min[2].toFixed(0)}..${pb.max[2].toFixed(0)}`);
    free(up);
  }
  // Original Super Bench does not take the PRO leg attachment.
  const sb = PARTS.find(p => p.id === 'ironmaster-super-bench')!;
  assert.throws(() => validateFloorParams(sb, { attachment: leg }), /attachment/);
});
test('params validate strictly and coerce dependent options', () => {
  for (const part of PARTS) {
    assert.deepEqual(validateFloorParams(part, {}), part.defaults);
    for (const bad of [{ nope: 1 }, [], null]) assert.throws(() => validateFloorParams(part, bad), /bench/);
    for (const prm of part.params) assert.throws(() => validateFloorParams(part, { [prm.key]: 9999 }), /bench/, `${part.id} ${prm.key}`);
  }
  const abx = PARTS.find(p => p.id === 'freak-athlete-abx')!;
  assert.deepEqual(coerceFloorParams(abx, { backAngle: 33, seatAngle: 12 }), { ...abx.defaults, backAngle: 30, seatAngle: 10 });
  assert.throws(() => build('rogue-adjustable-bench-3', { backAngle: 33, seatAngle: 0, color: 0, plates: 0 }), /angle/);
});
