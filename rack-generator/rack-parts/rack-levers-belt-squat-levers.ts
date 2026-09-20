/** Lever arms and the lever belt squat (#135): Fringe Sport Mammoth Belt Squat, Rogue Monster Lite Lever Arms,
 * Vendetta 180° lever arm trolley and the Bells of Steel Shoulder Boulder. Metadata only (main bundle): never import
 * Manifold builders here. Research: research/rack-levers-belt-squat.md. Builders: parts/rack-levers-belt-squat-levers.ts.
 * Every lever has a pose param; the pose geometry (pivots, swing, extents, bodies) lives here so metadata and builders agree. */
import { defineRackPart, PIN_1IN, PIN_5_8IN } from '../rack-part.ts';
import { PLATE_SPECS, plateStackLength, type PlateId } from '../plates.ts';
import type { LocalBox, NumericParams, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const pitch = (p: NumericParams) => p.mountSpacing ?? 50;
const rad = (deg: number) => deg * Math.PI / 180;
/** Axis-aligned box around points, padded by `pad` on every axis. */
export function hull(points: Vec3[], pad = 0): LocalBox {
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const q of points) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], q[i] - pad); max[i] = Math.max(max[i], q[i] + pad); }
  return { min, max };
}
const zExtent = (boxes: LocalBox[]) => ({ below: Math.max(0, ...boxes.map(b => -b.min[2])) + 1, above: Math.max(0, ...boxes.map(b => b.max[2])) + 1 });

/** Loads for loading horns and lever sleeves, root outward. Offered only when they fit the loadable length. */
export const HORN_LOADS: readonly { label: string; plates: readonly PlateId[] }[] = [
  { label: 'Empty', plates: [] },
  { label: '25 lb iron', plates: ['lb25'] },
  { label: '45 lb iron', plates: ['lb45'] },
  { label: '2 × 45 lb iron', plates: ['lb45', 'lb45'] },
  { label: '4 × 45 lb iron', plates: ['lb45', 'lb45', 'lb45', 'lb45'] },
  { label: '25 kg bumper', plates: ['kg25'] },
  { label: '2 × 25 kg bumpers', plates: ['kg25', 'kg25'] },
  { label: '3 × 25 kg bumpers', plates: ['kg25', 'kg25', 'kg25'] },
];
export const hornLoad = (i: number) => { const l = HORN_LOADS[i]; if (!l) throw Error('Unsupported plate load.'); return l; };
const hornLoadOptions = (loadable: number) => HORN_LOADS.flatMap((l, i) => plateStackLength(l.plates) <= loadable ? [i] : []);
export const hornLoadRadius = (i: number) => Math.max(0, ...hornLoad(i).plates.map(p => PLATE_SPECS[p].diameter / 2));
export const hornLoadLength = (i: number) => plateStackLength(hornLoad(i).plates);
const loadParam = (label: string, loadable: number | ((p: NumericParams) => number)) =>
  ({ key: 'load', label, default: 0, options: (p: NumericParams) => hornLoadOptions(typeof loadable === 'number' ? loadable : loadable(p)), format: (v: number) => HORN_LOADS[v]?.label ?? String(v) });
const PIN_NAMES = ['1 in pin', '5/8 in pin'] as const;
const pinParam = { key: 'hardware', label: 'Rack pin', default: 0, options: [0, 1], format: (v: number) => PIN_NAMES[v] ?? String(v) };
const pinFit = (rack: { holeDiameter: number }) => ({ hardware: rack.holeDiameter < 20 ? 1 : 0 });

// ================================================================ Fringe Sport Mammoth Belt Squat
/** Published: 39–48.75" pivot-to-tip, 30" 2x3 11 ga main tube laid flat, 14" loading horn, M16 adjustment bolts,
 * keyhole pivot (1" over 5/8"), UHMW on the fork, 32 lb, black powder coat, black zinc hardware, eye bolt at the tip.
 * Fork plate length and profile, horn position (13.5" from the tip) and diameter are measured off the GGR side elevation. */
export const MAMMOTH = {
  lengths: [inch(39), inch(42.25), inch(45.5), inch(48.75)], tube: inch(30), tubeWidth: inch(3), tubeHeight: inch(2), wall: 3.05,
  fork: inch(25.8), forkThick: inch(0.375), forkTop: inch(1), forkBottom: inch(1.6), forkNose: inch(1.5), joggle: inch(10.5), uhmw: 3,
  horn: inch(14), hornDiameter: inch(1.95), hornFromTip: inch(13.5), collar: inch(3.5), collarThick: inch(0.25),
  eyeFromTip: inch(1), foot: inch(1.2), footHeight: inch(0.9), bolts: [inch(14.7), inch(22.1), inch(24.7)], spacer: inch(4.5),
} as const;
export const MAMMOTH_LENGTHS = ['39 in', '42.25 in', '45.5 in', '48.75 in'] as const;
export const MAMMOTH_POSES = [{ name: 'Resting on the floor', deg: -22 }, { name: 'Level', deg: 0 }, { name: 'Top of the squat', deg: 20 }] as const;
export const MAMMOTH_SIDES = ['Right of the post', 'Left of the post'] as const;
export const mammothLength = (p: NumericParams) => { const l = MAMMOTH.lengths[p.length ?? 2]; if (l === undefined) throw Error('Unsupported Mammoth length.'); return l; };
export const mammothPose = (p: NumericParams) => { const s = MAMMOTH_POSES[p.pose ?? 0]; if (!s) throw Error('Unsupported Mammoth pose.'); return s.deg; };
/** Arm-frame point (u along the arm from the pivot, w up off its centreline, y across) to the part frame. side 0 extends to local -X. */
export function mammothPoint(p: NumericParams, u: number, w: number, y = 0): Vec3 {
  const t = rad(mammothPose(p)), s = p.side ? 1 : -1;
  return [s * (u * Math.cos(t) - w * Math.sin(t)), y, u * Math.sin(t) + w * Math.cos(t)];
}
/** Key stations along the arm for this length. */
export function mammothLayout(p: NumericParams) {
  const L = mammothLength(p), M = MAMMOTH, h = M.tubeHeight / 2;
  return { L, tube0: L - M.tube, horn: L - M.hornFromTip, hornBase: h + M.collarThick, eye: L - M.eyeFromTip, h };
}
function mammothBodies(p: NumericParams): LocalBox[] {
  const { L, tube0, horn, hornBase, h } = mammothLayout(p), M = MAMMOTH, wy = M.tubeWidth / 2 + M.forkThick, u0 = face(p) + 42;
  const seg = (a: number, b: number, w0: number, w1: number, y: number) => hull([a, b].flatMap(u => [w0, w1].flatMap(w => [mammothPoint(p, u, w, -y), mammothPoint(p, u, w, y)])));
  const cuts = [u0, u0 + (L - u0) / 3, u0 + 2 * (L - u0) / 3, L];
  const boxes = [0, 1, 2].map(i => seg(cuts[i], cuts[i + 1], i === 2 ? -h - M.footHeight : -h - (cuts[i + 1] < M.fork ? M.forkBottom - h : 0), h, cuts[i] < Math.max(tube0, M.fork) ? wy : M.tubeWidth / 2));
  const r = M.hornDiameter / 2;
  boxes.push(seg(horn - r, horn + r, hornBase, hornBase + M.horn, r));
  const load = hornLoad(p.load ?? 0).plates;
  if (load.length) { const R = hornLoadRadius(p.load ?? 0); boxes.push(seg(horn - R, horn + R, hornBase, hornBase + hornLoadLength(p.load ?? 0), R)); }
  return boxes;
}
export const FRINGE_MAMMOTH_BELT_SQUAT = defineRackPart({
  id: 'fringe-sport-mammoth-belt-squat', name: 'Fringe Sport Mammoth Belt Squat', title: 'Fringe Sport Mammoth Belt Squat', noun: 'belt squat lever', section: 'Levers & belt squat',
  description: 'Rack-pinned lever belt squat: a fork straddles one upright, a 30 in 2x3 arm adjusts 39–48.75 in to the tip, a 14 in loading horn and an eye bolt for the belt chain. Independent reconstruction; Fringe Sport trademarks belong to Fringe Sport.',
  params: [
    { key: 'length', label: 'Arm length (pivot to tip)', default: 2, options: [0, 1, 2, 3], format: v => MAMMOTH_LENGTHS[v] ?? String(v) },
    { key: 'pose', label: 'Arm position', default: 0, options: [0, 1, 2], format: v => MAMMOTH_POSES[v]?.name ?? String(v) },
    { key: 'side', label: 'Arm direction', default: 0, options: [0, 1], format: v => MAMMOTH_SIDES[v] ?? String(v) },
    loadParam('Plates on the horn', MAMMOTH.horn - 10),
    pinParam,
  ],
  vendor: {
    vendor: 'Fringe Sport', url: 'https://www.fringesport.com/products/mammoth-belt-squat',
    credit: 'Fringe Sport — Mammoth Belt Squat', trademark: 'Fringe Sport and Mammoth Belt Squat are trademarks of Fringe Sport.',
    reconstruction: 'Published 39–48.75 in arm length, 30 in 2x3 11 ga tube, 14 in horn, keyhole pivot for 1 in or 5/8 in pins, M16 adjustment bolts and finishes. Fork plate profile, horn position and diameter, eye bolt and tip foot measured off product photos; the rest pose assumes a pivot about 18 in off the floor. Physical fit unverified.',
  },
  mount: {
    pin: p => p.hardware ? PIN_5_8IN : PIN_1IN,
    extent: p => zExtent([...mammothBodies(p), hull([mammothPoint(p, 0, 0)], MAMMOTH.forkNose + 2), hull([mammothPoint(p, mammothLayout(p).eye, mammothLayout(p).h + 45)], 20)]),
    validate: rack => { if (rack.tube > 80) throw Error('Mammoth belt squat fork fits 2x2, 2x3 and 3x3 uprights.'); },
  },
  bodies: mammothBodies,
  pair: { default: false },
  // Low on the outer side face, the arm running forward away from the rack with its tip on the floor.
  placement: { height: 465, face: 'outside' },
  autoFit: pinFit,
});

// ================================================================ Rogue Monster Lite Lever Arms (RF0716) / Monster (RF0710)
/** Published: 3x3 11 ga arms 38.75" long, 3/8" laser-cut bent bracket with pin-and-bushing hinge, 1" Sch 40 bent handles
 * (1.31" OD) with grips 10" apart, standard or neutral handle, 11-5/8" loadable weight post, sold as a mirror-image pair.
 * Bracket plate size, bolt spacing, pivot offset and handle/post positions estimated from the flat-lay and install photos. */
export const ML_LEVER = {
  arm: inch(38.75), tube: inch(3), stub: inch(1.5), plate: inch(0.375), bracketDown: inch(1.2), bracketUp: inch(1.6), reach: inch(4.25), pivotAhead: inch(2),
  handleOD: inch(1.315), grips: inch(10), handleReach: inch(11.5), handleFromEnd: inch(1.7), post: inch(11.625), postDiameter: inch(1.95), collar: inch(0.75), collarDiameter: inch(2.4),
  mountPlate: [inch(3.5), inch(12.5)] as const, bumper: [inch(2.5), inch(1), inch(5)] as const,
} as const;
export const ML_LEVER_SERIES = [{ name: 'Monster Lite (RF0716) · 5/8 in', pin: PIN_5_8IN, bolt: inch(0.625) }, { name: 'Monster (RF0710) · 1 in', pin: PIN_1IN, bolt: inch(1) }] as const;
export const ML_LEVER_HANDLES = ['Standard grip handle', 'Neutral grip handle'] as const;
export const ML_LEVER_SWINGS = [0, 30, 60, 90] as const;
export const mlLeverSeries = (p: NumericParams) => { const s = ML_LEVER_SERIES[p.series ?? 0]; if (!s) throw Error('Unsupported lever arm series.'); return s; };
export const mlLeverSwing = (p: NumericParams) => { const s = ML_LEVER_SWINGS[p.swing ?? 0]; if (s === undefined) throw Error('Unsupported lever arm swing.'); return s; };
/** Pivot in the part frame; the arm hangs along -Z at swing 0 and swings forward (+Y) about X. */
export const mlLeverPivot = (p: NumericParams): Vec3 => [0, face(p) + ML_LEVER.pivotAhead + ML_LEVER.tube / 2, -pitch(p)];
/** Arm-frame point (x across, a down the arm from the pivot, n toward +Y off the arm centreline) to the part frame. */
export function mlLeverPoint(p: NumericParams, x: number, a: number, n = 0): Vec3 {
  const [, py, pz] = mlLeverPivot(p), t = rad(mlLeverSwing(p)), hand = p.mirror === 1 ? -1 : 1;
  return [hand * x, py + a * Math.sin(t) + n * Math.cos(t), pz - a * Math.cos(t) + n * Math.sin(t)];
}
/** Down-the-arm stations: free end, grips, post. Handles point to local -X (inside the rack from a left upright), the post to +X. */
export function mlLeverLayout() {
  const L = ML_LEVER, end = L.arm - L.stub, gLow = end - L.handleFromEnd, gHigh = gLow - L.grips;
  return { end, gLow, gHigh, post: (gLow + gHigh) / 2 };
}
function mlLeverBodies(p: NumericParams): LocalBox[] {
  const L = ML_LEVER, { end, gLow, gHigh, post } = mlLeverLayout(), h = L.tube / 2, a0 = 30;
  const box = (x0: number, x1: number, a1: number, a2: number, n0: number, n1: number) => hull([x0, x1].flatMap(x => [a1, a2].flatMap(a => [n0, n1].map(n => mlLeverPoint(p, x, a, n)))));
  const boxes = [box(-h, h, a0, end, -h, h), box(-h - L.handleReach, -h, gHigh - L.handleOD / 2, gLow + L.handleOD / 2, -L.handleOD / 2, L.handleOD / 2), box(h, h + L.collar + L.post, post - L.postDiameter / 2, post + L.postDiameter / 2, -L.postDiameter / 2, L.postDiameter / 2)];
  const load = hornLoad(p.load ?? 0).plates;
  if (load.length) { const R = hornLoadRadius(p.load ?? 0), x0 = h + L.collar + 2; boxes.push(box(x0, x0 + hornLoadLength(p.load ?? 0), post - R, post + R, -R, R)); }
  return boxes;
}
export const ROGUE_MONSTER_LITE_LEVER_ARMS = defineRackPart({
  id: 'rogue-monster-lite-lever-arms', name: 'Rogue Monster Lite Lever Arm', title: 'Rogue Monster Lite Lever Arms (Jammer Arms)', noun: 'lever arm', section: 'Levers & belt squat',
  description: 'Bolt-on 3x3 jammer arms on a pin-and-bushing hinge bracket · 38.75 in arms · bent 1.31 in handles with grips 10 in apart · 11-5/8 in weight post · mirror-image pair. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => ML_LEVER_SERIES[v]?.name ?? String(v) },
    { key: 'handle', label: 'Handle', default: 0, options: [0, 1], format: v => ML_LEVER_HANDLES[v] ?? String(v) },
    { key: 'swing', label: 'Arm swing', default: 0, options: [0, 1, 2, 3], format: v => ML_LEVER_SWINGS[v] === 0 ? 'Hanging (0°)' : `${ML_LEVER_SWINGS[v]}° forward` },
    loadParam('Plates on each post', ML_LEVER.post - 5),
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://web.archive.org/web/20170701064256/http://www.roguefitness.com/monster-lite-lever-arms',
    credit: 'Rogue Fitness — Monster Lite Lever Arms (RF0716) / Monster Lever Arms (RF0710) · Made in USA', trademark: 'Rogue, Monster and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Discontinued; published figures from the archived product pages: 3x3 11 ga arms 38.75 in long, 3/8 in bracket, 1.31 in bent handles 10 in apart, 11-5/8 in loadable post. Bracket plate outline, two-bolt spacing, pivot offset, bumper and handle/post positions estimated from the flat-lay and install photos; physical fit unverified.',
  },
  mount: {
    pin: p => mlLeverSeries(p).pin, pinAxis: 'across', holes: [0, -2], mainStations: true,
    extent: p => zExtent([...mlLeverBodies(p), { min: [0, 0, -2 * pitch(p) - ML_LEVER.bracketDown], max: [0, 0, ML_LEVER.bracketUp] }, hull([mlLeverPoint(p, 0, -ML_LEVER.stub, 0)], ML_LEVER.tube * .75)]),
    faces: ['front', 'back'],
  },
  bodies: mlLeverBodies,
  pair: { default: true },
  handed: true,
  // High on the front uprights, the arms hanging in front of the posts for presses and jammer throws.
  placement: { height: 1765, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 0 : 1 }),
});

// ================================================================ Vendetta 180° lever arm trolley (Titan 3x3 kit)
/** Published: 1/4" plate trolley, 8 rollers per trolley on 1/2" zinc bolts, rear spring pin, 5/8" or 1" racks, 15°
 * increments over 180° via a user hitch pin, 250 lb per arm static. Disc diameter, plate outline, slot ring and the
 * 3x3 arm length are estimated from the renders and before/after photos (3" arm as scale). */
export const VENDETTA = {
  plate: inch(0.25), disc: inch(9.5), rect: [inch(5.4), inch(8.2)] as const, pivotAhead: inch(3.4), gap: 4, slotRadius: inch(3.9), slot: [inch(0.7), inch(1.1)] as const,
  roller: inch(1.6), rollerLength: inch(2.6), arm: inch(42), tube: inch(3), hitch: inch(0.625),
} as const;
/** Arm rest positions: 0° = hanging straight down, 180° = straight up, in 15° steps. */
export const VENDETTA_POSITIONS = Array.from({ length: 13 }, (_, i) => i * 15);
export const vendettaAngle = (p: NumericParams) => { const a = VENDETTA_POSITIONS[p.position ?? 0]; if (a === undefined) throw Error('Unsupported arm position.'); return a; };
export const vendettaPivot = (p: NumericParams): Vec3 => [0, face(p) + VENDETTA.pivotAhead, 0];
export function vendettaPoint(p: NumericParams, x: number, a: number, n = 0): Vec3 {
  const [, py, pz] = vendettaPivot(p), t = rad(vendettaAngle(p));
  return [x, py + a * Math.sin(t) + n * Math.cos(t), pz - a * Math.cos(t) + n * Math.sin(t)];
}
function vendettaBodies(p: NumericParams): LocalBox[] {
  const h = VENDETTA.tube / 2, a0 = VENDETTA.disc / 2 + 10;
  return [hull([-h, h].flatMap(x => [a0, VENDETTA.arm - inch(3)].flatMap(a => [-h, h].map(n => vendettaPoint(p, x, a, n)))))];
}
export const VENDETTA_180_LEVER_ARM_ADAPTERS = defineRackPart({
  id: 'vendetta-180-lever-arm-adapters', name: 'Vendetta 180° Lever Arm', title: 'Vendetta 180° Lever Arm Adapters', noun: 'lever arm', section: 'Levers & belt squat',
  description: 'Roller trolley with 180° index discs that set a 3x3 lever arm’s rest angle in 15° steps with a 5/8 in hitch pin · 1/4 in plate · 8 rollers · spring pin. Independent reconstruction; Vendetta Strength & Athletics trademarks belong to Vendetta Strength & Athletics.',
  params: [
    { key: 'position', label: 'Arm rest angle', default: 3, options: VENDETTA_POSITIONS.map((_, i) => i), format: v => VENDETTA_POSITIONS[v] === 0 ? 'Hanging (0°)' : `${VENDETTA_POSITIONS[v]}° from hanging` },
    pinParam,
  ],
  vendor: {
    vendor: 'Vendetta Strength & Athletics', url: 'https://vendettastrengthandathletics.com/products/adjustable-lever-arm-titan-adapter-mounts-pair',
    credit: 'Vendetta Strength & Athletics — 180° Lever Arm Adapter Mounts (Titan 3x3)', trademark: 'Vendetta Strength & Athletics and Vendetta 180 are trademarks of Vendetta Strength & Athletics.',
    reconstruction: 'Published 1/4 in plate, 8 rollers per trolley, rear spring pin, 15° increments over 180°, 5/8 in hitch pin, fits 3x3 racks with 5/8 or 1 in holes. Disc diameter, plate outline, slot ring and the 42 in 3x3 arm it carries are estimated from renders and photos; physical fit unverified.',
  },
  mount: {
    pin: p => p.hardware ? PIN_5_8IN : PIN_1IN,
    extent: p => zExtent([...vendettaBodies(p), { min: [0, 0, -VENDETTA.rect[1] / 2 - 2], max: [0, 0, VENDETTA.disc / 2 + 2] }]),
    faces: ['front', 'back'],
    validate: rack => { if (rack.tube < 74 || rack.tube > 78) throw Error('Vendetta 180° trolley fits 3x3 uprights.'); },
  },
  bodies: vendettaBodies,
  pair: { default: true },
  placement: { height: 1215, face: 'front' },
  autoFit: pinFit,
});

// ================================================================ Bells of Steel Shoulder Boulder / Chest Fly
/** Published (spec sheet): 524 mm across the top, 307.5 mm pivot to horn, 686 mm across the horns hanging, 50 x 172 mm
 * horns, 785 mm tall, 465 mm deep, sleeve 97 mm inside x 129 mm tall (3x3). Pivot spacing, tube sizes, handle arm and
 * handle bend estimated from the spec sheet and manual. */
export const BOULDER = {
  pivotX: 205, pivotZ: -62, crossbar: [50, 60] as const, sleeve: 97, sleeveHeight: 129, sleeveTop: 30, wall: 6, uhmw: 5,
  housing: 30, crank: 307.5, crankTube: 50, horn: 50, hornLength: 172, crankRest: 21.6, crankAbove: 36,
  disc: 130, discThick: 6, handleArm: 330, handleTube: 40, handleAbove: 70, handleIn: 20, handle: [100, 300] as const, handleOD: 25.4, handleBend: 30, knob: 44,
} as const;
export const BOULDER_SWINGS = [0, 30, 60, 90] as const;
export const boulderSwing = (p: NumericParams) => { const s = BOULDER_SWINGS[p.swing ?? 0]; if (s === undefined) throw Error('Unsupported swing.'); return s; };
/** Y stations from the mounting face outward: crossbar, housing, crank (behind), disc and handle arm (in front). */
export function boulderLayout(p: NumericParams) {
  const f = face(p), B = BOULDER, bar0 = f + B.uhmw, bar1 = bar0 + B.crossbar[1];
  const crank1 = bar0 - 20, crank0 = crank1 - B.crankTube, disc0 = bar1 + 2, arm0 = disc0 + B.discThick + 3;
  return { f, bar0, bar1, crank0, crank1, disc0, arm0, arm1: arm0 + B.handleTube, horn1: crank0 - B.hornLength };
}
/** Point swung about side `s` (±1) pivot: (dx outward, dz down) in the swing plane at depth y. */
export function boulderPoint(p: NumericParams, s: number, out: number, down: number, y: number): Vec3 {
  const t = rad(boulderSwing(p)), c = Math.cos(t), sn = Math.sin(t);
  // Swinging raises each side outward: the hanging direction (0, -1) turns toward (+out, 0).
  const x = out * c + down * sn, z = -down * c + out * sn;
  return [s * (BOULDER.pivotX + x), y, BOULDER.pivotZ + z];
}
function boulderBodies(p: NumericParams): LocalBox[] {
  const B = BOULDER, L = boulderLayout(p), boxes: LocalBox[] = [{ min: [-B.pivotX - B.housing, L.bar0, B.pivotZ - B.crossbar[0] / 2], max: [B.pivotX + B.housing, L.bar1, B.pivotZ + B.crossbar[0] / 2] }];
  const ct = rad(B.crankRest), ht = rad(B.handleIn), load = hornLoad(p.load ?? 0).plates, R = hornLoadRadius(p.load ?? 0);
  for (const s of [-1, 1]) {
    const hornOut = B.crank * Math.sin(ct), hornDown = B.crank * Math.cos(ct), r = B.horn / 2;
    boxes.push(hull([[0, -B.crankAbove], [hornOut, hornDown]].flatMap(([o, d]) => [L.crank0, L.crank1].map(y => boulderPoint(p, s, o, d, y))), B.crankTube / 2));
    boxes.push(hull([L.horn1, L.crank0].map(y => boulderPoint(p, s, hornOut, hornDown, y)), r));
    if (load.length) boxes.push(hull([L.crank0 - 2, L.crank0 - 2 - hornLoadLength(p.load ?? 0)].map(y => boulderPoint(p, s, hornOut, hornDown, y)), R));
    const clevisOut = -B.handleArm * Math.sin(ht), clevisDown = B.handleArm * Math.cos(ht);
    boxes.push(hull([[0, -B.handleAbove], [clevisOut, clevisDown]].flatMap(([o, d]) => [L.arm0, L.arm1].map(y => boulderPoint(p, s, o, d, y))), B.handleTube / 2));
    const hEnd = boulderHandle(p);
    boxes.push(hull([boulderPoint(p, s, clevisOut, clevisDown, L.arm1), ...hEnd.map(([o, d, y]) => boulderPoint(p, s, o, d, y))], B.handleOD / 2 + 4));
  }
  return boxes;
}
/** Handle centreline after the clevis, as (out, down, y) triples: in line with the handle arm, then bent toward the user (+Y). */
export function boulderHandle(p: NumericParams): [number, number, number][] {
  const B = BOULDER, L = boulderLayout(p), ht = rad(B.handleIn), [a, b] = B.handle, bend = rad(B.handleBend), y = (L.arm0 + L.arm1) / 2;
  const c0: [number, number] = [-B.handleArm * Math.sin(ht), B.handleArm * Math.cos(ht)];
  const c1: [number, number] = [c0[0] - a * Math.sin(ht), c0[1] + a * Math.cos(ht)];
  return [[c0[0], c0[1], y], [c1[0], c1[1], y], [c1[0] - b * Math.cos(bend) * Math.sin(ht) * .6, c1[1] + b * Math.cos(bend), y + b * Math.sin(bend)]];
}
export const BOS_SHOULDER_BOULDER = defineRackPart({
  id: 'bells-of-steel-shoulder-boulder', name: 'Bells of Steel Shoulder Boulder', title: 'Bells of Steel Shoulder Boulder / Chest Fly', noun: 'shoulder boulder', section: 'Levers & belt squat',
  description: 'Sleeve-mounted lateral raise and chest fly lever: two plate-loaded cranks with 50 mm horns and indexed handle arms that swing parallel to the upright face · 524 mm wide · 785 mm tall. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [
    { key: 'swing', label: 'Arm swing', default: 0, options: [0, 1, 2, 3], format: v => BOULDER_SWINGS[v] === 0 ? 'Hanging (rest)' : `Raised ${BOULDER_SWINGS[v]}°` },
    loadParam('Plates on each horn', BOULDER.hornLength - 12),
  ],
  vendor: {
    vendor: 'Bells of Steel', url: 'https://bellsofsteel.us/products/shoulder-boulder-chest-fly-attachment',
    credit: 'Bells of Steel — Shoulder Boulder / Chest Fly Attachment (SHBLD-RA-HDR)', trademark: 'Bells of Steel and Shoulder Boulder are trademarks of Bells of Steel.',
    reconstruction: 'Published spec sheet: 524 mm width, 307.5 mm crank, 686 mm hanging horn span, 50 x 172 mm horns, 785 mm height, 465 mm depth, 97 x 129 mm sleeve. Pivot spacing, tube sizes, index disc, handle arm length and bend estimated from the spec sheet, manual exploded view and photos; physical fit unverified.',
  },
  mount: {
    pin: PIN_5_8IN, pinAxis: 'across',
    extent: p => zExtent([...boulderBodies(p), { min: [0, 0, BOULDER.sleeveTop - BOULDER.sleeveHeight], max: [0, 0, BOULDER.sleeveTop] }, hull([boulderPoint(p, 1, 0, -BOULDER.handleAbove, 0)], BOULDER.knob / 2 + 2)]),
    validate: rack => { if (rack.tube > BOULDER.sleeve - 2 * BOULDER.uhmw || rack.tube < 60) throw Error('Shoulder Boulder 3x3 sleeve fits 3x3 (75 mm) uprights.'); },
  },
  bodies: boulderBodies,
  pair: { default: false },
  placement: { height: 1515, face: 'front' },
});
