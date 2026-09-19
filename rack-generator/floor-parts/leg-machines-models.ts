/** Leg machine product descriptions (pure; see leg-machines-kit.ts). Design axes before centring: X across the machine
 * (+X is the user's left), the user faces −Y, Z up, floor at z = 0. Published dimensions and every estimate are in
 * research/leg-machines.md; constants here cite the spec they come from. */
import type { NumericParams } from '../types.ts';
import { CHROME, GRIP, PLASTIC, RUBBER, VINYL, ZINC, add, dot, f, inch, lb45, lerp, rotX, rotZ, scale, sub, swing, swingAbout, translation, type Finish, type Kit, type Rigid, type V3 } from './leg-machines-kit.ts';
const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
// ---------------------------------------------------------------- shared sub-assemblies
/** Rail end cap: moulded plastic foot slipped over a tube end, a little larger than the tube, with a rubber sole. */
export function footCap(k: Kit, g: string, sole: string, end: V3, dir: V3, w: number, h: number, len = 90) {
  const lift = (p: V3): V3 => [p[0], p[1], 4 + (h + 6) / 2], back = lift(sub(end, scale(dir, len - 12))), tip = lift(add(end, scale(dir, 12)));
  k.beam(g, back, tip, w + 10, h + 6, Z);
  k.beam(g, lift(sub(end, scale(dir, len - 22))), lift(add(end, scale(dir, 4))), w + 14, h + 2, Z);
  const s0 = sub(end, scale(dir, len - 18)), half = (w + 10) / 2;
  k.box(sole, [Math.min(s0[0], tip[0]) - (dir[1] ? half : 0), Math.min(s0[1], tip[1]) - (dir[0] ? half : 0), 0],
    [Math.max(s0[0], tip[0]) + (dir[1] ? half : 0), Math.max(s0[1], tip[1]) + (dir[0] ? half : 0), 4]);
}
/** Foam roller on an axle: vinyl/foam sleeve from a to b, gathered end discs and a pop-knob on the free end. */
export function roller(k: Kit, a: V3, b: V3, d: number, opts: { foam?: string; cap?: string; knob?: string; knobColor?: Finish } = {}) {
  const foam = opts.foam ?? 'Foam roller pads', cap = opts.cap ?? 'Roller end caps', dir = sub(b, a), len = Math.hypot(...dir), u = scale(dir, 1 / len);
  k.rod(foam, add(a, scale(u, 4)), sub(b, scale(u, 4)), d, 48);
  // Gathered ends: slightly smaller discs, then a flat plastic retainer.
  for (const [end, s] of [[a, 1], [b, -1]] as [V3, number][]) {
    k.rod(foam, end, add(end, scale(u, s * 6)), d - 14, 40);
    k.rod(cap, sub(end, scale(u, s * 3)), add(end, scale(u, s * 1)), d * .62, 32);
  }
  if (opts.knob) { k.finish(opts.knob, opts.knobColor ?? PLASTIC); k.rod(opts.knob, sub(b, scale(u, 1)), add(b, scale(u, 22)), 16, 16); k.rod(opts.knob, add(b, scale(u, 14)), add(b, scale(u, 34)), 36, 24); }
}
/** Pop-pin / pull-pin knob: shaft through a boss along `dir`, round knob at the end. */
export function knob(k: Kit, g: string, at: V3, dir: V3, d = 34, reach = 40) {
  k.rod(g, at, add(at, scale(dir, reach)), 12, 16);
  k.rod(g, add(at, scale(dir, reach - 4)), add(at, scale(dir, reach + 18)), d, 24);
}
/** Bent round tube through points (straight runs with round knuckles at the bends). */
export function bent(k: Kit, g: string, pts: V3[], d: number, seg = 24) {
  for (let i = 1; i < pts.length; i++) k.rod(g, pts[i - 1], pts[i], d, seg);
  for (let i = 1; i < pts.length - 1; i++) k.rod(g, sub(pts[i], [0, 0, d / 2 - .5]), add(pts[i], [0, 0, d / 2 - .5]), d * .999, seg);
}
/** Points on a circular arc from a to b bulging by `sag` toward `toward` (unit). */
export function arc(a: V3, b: V3, toward: V3, sag: number, n = 6): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n; out.push(add(add(a, scale(sub(b, a), t)), scale(toward, sag * 4 * t * (1 - t)))); }
  return out;
}
/** Steel plate with a ring of holes (range-of-motion dial), axis along X at `c`. */
export function dial(k: Kit, g: string, c: V3, d: number, t: number, holes: number, holeR: number, holeD: number, from = 0, to = 360) {
  k.rod(g, c, add(c, [t, 0, 0]), d, 64);
  for (let i = 0; i < holes; i++) {
    const a = (from + (to - from) * (to - from >= 360 ? i / holes : i / Math.max(1, holes - 1))) * Math.PI / 180;
    const p: V3 = [c[0] - 1, c[1] + holeR * Math.sin(a), c[2] + holeR * Math.cos(a)];
    k.hole(g, p, add(p, [t + 2, 0, 0]), holeD, 16);
  }
}
/** Laser-cut arc plate (sector of a ring from `from`° to `to`°, 0° = up, −90° = front) with `holes` stops, axis X. */
export function arcPlate(k: Kit, g: string, c: V3, r0: number, r1: number, t: number, from: number, to: number, holes: number, holeD: number) {
  const n = Math.max(3, Math.ceil(Math.abs(to - from) / 10)), at = (a: number, r: number): V3 => [c[0], c[1] + r * Math.sin(a * Math.PI / 180), c[2] + r * Math.cos(a * Math.PI / 180)];
  for (let i = 0; i < n; i++) {
    const a0 = from + (to - from) * i / n, a1 = from + (to - from) * (i + 1) / n, m = (a0 + a1) / 2, half = Math.abs(a1 - a0) / 2 * Math.PI / 180;
    k.beam(g, add(at(m, r0), [t / 2, 0, 0]), add(at(m, r1), [t / 2, 0, 0]), 2 * r1 * Math.tan(half) + 2, t, X);
  }
  for (let i = 0; i < holes; i++) { const q = at(from + (to - from) * (i + .5) / holes, (r0 + r1) / 2); k.hole(g, sub(q, [1, 0, 0]), add(q, [t + 1, 0, 0]), holeD, 16); }
}
/** Selectorized weight stack: chrome guide rods, `n` plates, headplate with selector stem, magnetic pin in plate
 * `engaged` (counted from the top), label strips on the `face` side. Engaged plates and the headplate ride `lift` mm up. */
export interface StackSpec {
  c: V3; /** plate size along Y (face width) and X (depth), thickness */ w: number; d: number; t: number; n: number; head: number;
  rodGap: number; rodD: number; rodTop: number; engaged: number; lift: number; face: 1 | -1; label: (i: number) => readonly [string, string]; pinColor?: Finish;
}
export function weightStack(k: Kit, s: StackSpec) {
  k.finish('Weight stack plates', f('source', '#1b1c1e', .35, .55)); k.finish('Chrome guide rods', CHROME); k.finish('Stack bumpers', RUBBER);
  k.finish('Selector pin', s.pinColor ?? f('source', '#c3202a', .3, .4)); k.finish('Weight labels', f('source', '#ecebe6', 0, .6));
  const [x, y, z0] = s.c, bump = 26, top = z0 + bump + s.n * s.t;
  for (const sy of [-1, 1]) {
    k.rod('Chrome guide rods', [x, y + sy * s.rodGap / 2, z0], [x, y + sy * s.rodGap / 2, s.rodTop], s.rodD, 24);
    k.rod('Stack bumpers', [x, y + sy * s.rodGap / 2, z0], [x, y + sy * s.rodGap / 2, z0 + bump], s.rodD + 34, 24);
  }
  for (let i = 0; i < s.n; i++) {
    const fromTop = s.n - i, up = fromTop <= s.engaged ? s.lift : 0, zb = z0 + bump + i * s.t + up, fx = x + s.face * s.d / 2;
    k.box('Weight stack plates', [x - s.d / 2, y - s.w / 2, zb + .6], [x + s.d / 2, y + s.w / 2, zb + s.t - .6]);
    const [name, hex] = s.label(fromTop), labelG = `Weight label strips · ${name}`;
    k.finish(labelG, f('source', hex, 0, .5));
    const lx = s.face > 0 ? [fx, fx + .8] : [fx - .8, fx];
    k.box(labelG, [lx[0], y - s.w / 2 + 18, zb + s.t * .3], [lx[1], y - s.w / 2 + 26, zb + s.t * .72]);
    k.box('Weight labels', [lx[0], y - s.w / 2 + 30, zb + s.t * .3], [lx[1], y - s.w / 2 + 88, zb + s.t * .72]);
    k.hole('Weight stack plates', [fx - s.face * 40, y + 40, zb + s.t / 2], [fx + s.face * 2, y + 40, zb + s.t / 2], 13, 12);
  }
  const lift = s.lift, hz = top + lift;
  k.box('Weight stack plates', [x - s.d / 2, y - s.w / 2 - 8, hz + .6], [x + s.d / 2, y + s.w / 2 + 8, hz + s.head]);
  k.rod('Chrome guide rods', [x, y, hz + s.head], [x, y, hz + s.head + 60], 30, 20);
  const stemBottom = z0 + bump + (s.n - Math.max(1, s.engaged)) * s.t + lift;
  k.rod('Chrome guide rods', [x, y, stemBottom + 4], [x, y, hz + 2], 20, 16);
  if (s.engaged) {
    const pz = z0 + bump + (s.n - s.engaged) * s.t + s.t / 2 + lift, fx = x + s.face * s.d / 2;
    k.rod('Selector pin', [fx - s.face * 45, y + 40, pz], [fx + s.face * 30, y + 40, pz], 12, 16);
    k.rod('Selector pin', [fx + s.face * 22, y + 40, pz], [fx + s.face * 50, y + 40, pz], 30, 24);
  }
  return { top, headTop: hz + s.head };
}
/** Rubber-gripped handle stub: bare steel run then a grip with a chrome end ring. */
export function gripHandle(k: Kit, steel: string, grip: string, a: V3, b: V3, d: number, gripLen: number) {
  const dir = sub(b, a), len = Math.hypot(...dir), u = scale(dir, 1 / len), g0 = sub(b, scale(u, gripLen));
  k.rod(steel, a, g0, d, 24); k.rod(grip, g0, b, d + 6, 24);
}
/** Olympic plate horn: stop collar and sleeve along `dir` from `root`; loads `n` 45 lb plates from the collar. */
export function horn(k: Kit, g: string, name: string, root: V3, dir: V3, len: number, d: number, n: number, collar = 90) {
  k.rod(g, sub(root, scale(dir, 1)), add(root, scale(dir, 8)), collar, 40);
  k.rod(g, add(root, scale(dir, 8)), add(root, scale(dir, len)), d, 40);
  if (n) k.plates(name, lb45(n), add(root, scale(dir, 8.5)), dir);
}
export const range = (n: number, from = 1) => Array.from({ length: n }, (_, i) => i + from);
/** Mirror across the YZ plane: machines whose lever and load sit on the user's right. */
export const MIRROR_X: Rigid = { r: [-1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
/** Square tube with a row of round through-holes along its length (Westside-style perforated frames). */
export function perforated(k: Kit, g: string, a: V3, b: V3, w: number, h: number, pitch: number, holeD: number, up: V3 = Z, through: V3 = up, edge = pitch / 2) {
  k.beam(g, a, b, w, h, up);
  const len = Math.hypot(...sub(b, a)), u = scale(sub(b, a), 1 / len), t = scale(through, (Math.abs(dot(through, up)) > .5 ? h : w) / 2 + 2);
  for (let s = edge; s <= len - edge + 1e-6; s += pitch) { const c = add(a, scale(u, s)); k.hole(g, sub(c, t), add(c, t), holeD, 16); }
}
/** Solves a four-bar link: pivot `h` of an output lever of length `r` (in the YZ plane) whose point at `r` must sit `len`
 * from `tip`; returns the lever swing angle nearest `guess`. */
export function solveLever(h: V3, r: number, tip: V3, len: number, guess: number) {
  let best = guess, err = Infinity;
  for (let a = guess - 90; a <= guess + 90; a += .25) { const q = add(h, scale(swing(a), r)), e = Math.abs(Math.hypot(q[1] - tip[1], q[2] - tip[2]) - len); if (e < err) { err = e; best = a; } }
  return best;
}
/** Vertical pulley (sheave) with side cheeks: axis along `axis` at `c`. */
export function pulley(k: Kit, sheave: string, cheek: string | undefined, c: V3, axis: V3, d: number, t = 24) {
  const u = scale(axis, 1 / Math.hypot(...axis));
  k.rod(sheave, sub(c, scale(u, t / 2)), add(c, scale(u, t / 2)), d, 40);
  k.rod(sheave, sub(c, scale(u, t / 2 + 2)), add(c, scale(u, t / 2 + 2)), d * .3, 20);
  if (cheek) for (const s of [-1, 1]) k.rod(cheek, add(c, scale(u, s * (t / 2 + 1))), add(c, scale(u, s * (t / 2 + 5))), d * .72, 32);
}
// ---------------------------------------------------------------- Titan Leg Extension & Hamstring Curl (401556, V2)
/** Published: 39" H × 42" W × 36" D; seat 22"×17"×2", back pad 15"×10"×2", rollers 17"×5"; 10" × 49 mm weight post;
 * 7 seat-depth and 7 knee-pad positions; seat angle 7/10.5/14°; 11-gauge 2"×3" and 2"×2" tube. */
export const TITAN_LEC = {
  seat: { w: inch(22), l: inch(17), t: inch(2) }, back: { w: inch(10), h: inch(15), t: inch(2) }, roller: { l: inch(17), d: inch(5) },
  hornLen: inch(10), hornD: 49, seatTop: 622, pivot: { z: 716 }, lever: 432, hornArm: 440, thighArm: 215,
  rep: { extension: [14, 55, 96], curl: [94, 42, -14] }, hornOffset: { extension: 8, curl: -114 }, thigh: [-116, -124, -132, -140, -148, -156, -164],
};
export const TITAN_LEC_REPS = ['Start', 'Mid-rep', 'Peak contraction'] as const;
export function describeTitanLec(k: Kit, p: NumericParams) {
  const T = TITAN_LEC, frame = 'Powder-coated 11-ga frame', pads = 'HeftyGrip vinyl pads', hw = 'Zinc hardware', caps = 'Plastic foot caps', sole = 'Rubber foot soles';
  k.finish(frame, f('source', '#1c1d1f', .2, .58)); k.finish(pads, VINYL); k.finish(hw, ZINC); k.finish(caps, PLASTIC); k.finish(sole, RUBBER);
  k.finish('Foam roller pads', f('liner', '#141516', 0, .86)); k.finish('Roller end caps', PLASTIC); k.finish('Weight post sleeve', f('source', '#18191b', .35, .45));
  k.finish('Brass pivot bushings', f('source', '#b48a45', .9, .35)); k.finish('Rubber grips', GRIP); k.finish('Titan badge', f('source', '#a9adb1', .8, .35));
  k.finish('Knobs', f('source', '#1a1b1d', .1, .5)); k.finish('Plate cushion', RUBBER);
  const seatW = T.seat.w, sf = 0; // seat front edge at y = 0
  const px = seatW / 2 + 20, ux: [number, number] = [px, px + 50]; // upright 2"×3" beside the seat, on the user's left
  const pivot: V3 = [ux[1] + 4, sf - 44, T.pivot.z], uy = pivot[1] + 52; // pivot boss ahead of the upright
  const railZ = 50, frontY = uy, rearY = sf + 640, left = -seatW / 2 - 52;
  // Base: lateral front rail under the upright, main rail along the seat centre line, lateral rear foot with storage post.
  k.beam(frame, [left + 60, frontY, railZ / 2], [ux[1] + 90, frontY, railZ / 2], 75, railZ, Z);
  footCap(k, caps, sole, [left, frontY, railZ / 2], [-1, 0, 0], 75, railZ);
  footCap(k, caps, sole, [ux[1] + 150, frontY, railZ / 2], X, 75, railZ);
  k.beam(frame, [0, frontY + 37.5, railZ / 2], [0, rearY - 37.5, railZ / 2], 75, railZ, Z);
  k.beam(frame, [left + 60, rearY, railZ / 2], [seatW / 2 - 40, rearY, railZ / 2], 75, railZ, Z);
  footCap(k, caps, sole, [left, rearY, railZ / 2], [-1, 0, 0], 75, railZ);
  footCap(k, caps, sole, [seatW / 2 + 20, rearY, railZ / 2], X, 75, railZ);
  k.rod(frame, [0, rearY, railZ], [0, rearY, railZ + 260], 50, 32);
  k.rod('Plate cushion', [0, rearY, railZ], [0, rearY, railZ + 8], 110, 40);
  k.rod('Knobs', [0, rearY, railZ + 260], [0, rearY, railZ + 266], 50, 32);
  k.box('Titan badge', [-70, frontY - 38.5, 14], [70, frontY - 37.5, 38]);
  for (const x of [-120, 120]) k.rod(hw, [x, frontY - 38.5, railZ / 2], [x, frontY - 43, railZ / 2], 18, 12);
  // Upright with its top bracket; diagonal seat strut; curved connect tube from the seat frame to the upright.
  k.beam(frame, [(ux[0] + ux[1]) / 2, uy, railZ], [(ux[0] + ux[1]) / 2, uy, T.pivot.z + 150], 50, 75, Y);
  k.box(frame, [ux[1], pivot[1] - 30, T.pivot.z - 70], [ux[1] + 4, uy + 37.5, T.pivot.z + 150]);
  const seatZ = T.seatTop - T.seat.t - 38;
  k.beam(frame, [0, sf + 330, railZ], [0, sf + 90, seatZ], 50, 50, X);
  bent(k, frame, arc([40, sf + 170, seatZ - 20], [ux[0], uy + 20, seatZ - 70], [1, 1, 0].map(v => v / Math.SQRT2) as V3, 70, 5), 50);
  // Seat: 2"×2" seat frame, steel pan, tilted pad (7/10.5/14° published).
  const tilt = p.seatAngle, rear: V3 = [0, sf + T.seat.l - 20, seatZ + 20];
  k.beam(frame, [0, sf + 40, seatZ + 20], [0, sf + T.seat.l + 10, seatZ + 20], 50, 40, Z);
  k.push(rotX(-tilt, rear));
  k.box(frame, [-seatW / 2 + 30, sf + 10, seatZ + 40], [seatW / 2 - 30, sf + T.seat.l - 10, seatZ + 44]);
  k.pad(pads, [0, sf + T.seat.l / 2, seatZ + 44], X, Y, seatW, T.seat.l, T.seat.t + 6, 28, 16);
  k.rod(pads, [-seatW / 2 + 20, sf + 26, seatZ + 44 + 26], [seatW / 2 - 20, sf + 26, seatZ + 44 + 26], 60, 40); // rolled front lip
  k.pop();
  // Back pad: curved 1.5" support from the seat rear, sleeve, square depth slider with 7 holes (1" pitch), pad.
  const back = sf + T.seat.l - 34 + (p.backPad - 4) * 25.4, backZ = T.seatTop - 12;
  bent(k, frame, arc([0, sf + T.seat.l - 40, seatZ + 20], [0, sf + T.seat.l + 70, backZ + 150], [0, 1, -1].map(v => v / Math.SQRT2) as V3, 45, 5), 38);
  k.beam(frame, [0, sf + T.seat.l + 70, backZ + 150], [0, sf + T.seat.l + 200, backZ + 150], 50, 50, Z);
  k.beam(frame, [0, back + T.back.t, backZ + 150], [0, back + T.back.t + 210, backZ + 150], 40, 40, Z);
  for (let i = 0; i < 3; i++) k.hole(frame, [-30, back + T.back.t + 150 + i * 22, backZ + 150], [30, back + T.back.t + 150 + i * 22, backZ + 150], 8);
  knob(k, 'Knobs', [-25, sf + T.seat.l + 150, backZ + 150], [-1, 0, 0], 38, 30);
  k.box(frame, [-60, back + T.back.t, backZ + 60], [60, back + T.back.t + 4, backZ + 250]);
  k.pad(pads, [0, back + T.back.t, backZ + T.back.h / 2], X, [0, 0, 1], T.back.w, T.back.h, T.back.t, 26, 14);
  // Seat handles: steel stubs out both sides behind the knees' reach, rubber grips.
  for (const s of [-1, 1]) gripHandle(k, frame, 'Rubber grips', [s * (seatW / 2 - 60), sf + 150, seatZ + 10], [s * (seatW / 2 + 50), sf + 150, seatZ + 34], 32, 110);
  // Lever: 36-hole dial and leg swing arm (lower roller), weight arm with the horn, thigh hold-down on a 7-hole arc.
  const mode = p.mode ? 'curl' : 'extension', legA = T.rep[mode][p.rep], hornA = legA + T.hornOffset[mode], thighA = T.thigh[p.thighPad - 1];
  k.rod('Brass pivot bushings', [ux[1] + 4, pivot[1], pivot[2]], [ux[1] + 8, pivot[1], pivot[2]], 44, 32);
  k.push(swingAbout(legA, pivot));
  dial(k, frame, [ux[1] + 9, pivot[1], pivot[2]], 280, 6, 36, 118, 14);
  k.beam(frame, [ux[1] + 40, pivot[1], pivot[2] + 30], [ux[1] + 40, pivot[1], pivot[2] - T.lever - 30], 50, 50, Y);
  k.rod(frame, [ux[1] + 15, pivot[1], pivot[2] - T.lever], [ux[1] - 20, pivot[1], pivot[2] - T.lever], 38, 24);
  roller(k, [ux[1] - 20, pivot[1], pivot[2] - T.lever], [ux[1] - 20 - T.roller.l, pivot[1], pivot[2] - T.lever], T.roller.d, { knob: 'Knobs' });
  k.rod(hw, [ux[1] + 64, pivot[1], pivot[2]], [ux[1] + 72, pivot[1], pivot[2]], 30, 6);
  k.pop();
  k.push(swingAbout(hornA, pivot));
  k.beam(frame, [ux[1] + 95, pivot[1], pivot[2] + 25], [ux[1] + 95, pivot[1], pivot[2] - T.hornArm - 25], 50, 50, Y);
  k.rod('Brass pivot bushings', [ux[1] + 120, pivot[1], pivot[2]], [ux[1] + 125, pivot[1], pivot[2]], 44, 32);
  knob(k, 'Knobs', [ux[1] + 70, pivot[1], pivot[2] - 118], [1, 0, 0], 28, 62);
  horn(k, 'Weight post sleeve', 'Loaded plate', [ux[1] + 120, pivot[1], pivot[2] - T.hornArm], X, T.hornLen, T.hornD, p.plates);
  k.pop();
  // Knee-pad arc bracket on the upright top, then the thigh arm and upper roller.
  const arcC: V3 = [ux[0] - 5, pivot[1], pivot[2]];
  k.push(swingAbout(0, arcC));
  for (let i = 0; i < 7; i++) { const a = swing(T.thigh[i]); const q = add(arcC, scale(a, 150)); k.hole(frame, [ux[0] - 12, q[1], q[2]], [ux[0] + 2, q[1], q[2]], 11); }
  k.pop();
  k.box(frame, [ux[0] - 8, pivot[1] - 40, pivot[2] + 40], [ux[0] - 2, pivot[1] + 180, pivot[2] + 190]);
  k.push(swingAbout(thighA, pivot));
  k.beam(frame, [ux[0] - 30, pivot[1], pivot[2] + 20], [ux[0] - 30, pivot[1], pivot[2] - T.thighArm - 20], 50, 50, Y);
  roller(k, [ux[0] - 55, pivot[1], pivot[2] - T.thighArm], [ux[0] - 55 - T.roller.l, pivot[1], pivot[2] - T.thighArm], T.roller.d, { knob: 'Knobs' });
  k.rod(frame, [ux[0] - 5, pivot[1], pivot[2] - T.thighArm], [ux[0] - 55, pivot[1], pivot[2] - T.thighArm], 38, 24);
  k.pop();
  const pin = add(arcC, scale(swing(thighA), 150));
  knob(k, 'Knobs', [ux[0] - 2, pin[1], pin[2]], [1, 0, 0], 30, 30);
}
// ---------------------------------------------------------------- GMWD LE08 2.0 Leg Extension & Prone Leg Curl
/** Published: 54.6" L × 55.4" W × 38.8" H (62.6" W as a prone curl); 21.7" shin roller; 10.6" load horn; 10" storage
 * posts; 2.4" pads; 7 back-pad positions; 8 lever-arm + 9 tibia-pad settings; 1.1/1.2 load ratio; 12-gauge perforated
 * 3" × 3" frame; red, black, white or blue movement arms. */
export const GMWD_LE08 = {
  seat: { w: 300, l: 440, t: inch(2.4), top: 576 }, back: { w: inch(10.3), h: 410, t: inch(2.4) }, roller: { l: inch(21.7), d: 140 },
  hornLen: inch(10.6), post: inch(10), pivot: [338, -30, 640] as V3, lever: 392, crank: 180, hornPivot: [424, 150, 292] as V3, hornArm: 520, link: 330,
  rep: { extension: [8, 52, 94], curl: [100, 150, 196] },
  colors: [['Red', '#b1141d'], ['Black', '#1d1e20'], ['White', '#e8e8e4'], ['Blue', '#1f4f9c']] as const,
};
export function describeGmwdLe08(k: Kit, p: NumericParams) {
  const G = GMWD_LE08, frame = 'Perforated 3" × 3" frame', arm = 'Movement arms', pads = 'Textured PU pads', grey = 'Laser-cut dial plates', chrome = 'Chrome sleeves and caps', black = 'Black crank and link';
  k.finish(frame, f('source', '#18191b', .25, .5)); k.finish(arm, f('source', G.colors[p.color]?.[1] ?? '#b1141d', .35, .32)); k.finish(pads, f('liner', '#1b1c1e', 0, .82));
  k.finish(grey, f('source', '#9ba0a4', .85, .3)); k.finish(chrome, CHROME); k.finish('Foam roller pads', f('liner', '#141516', 0, .8)); k.finish('Roller end caps', f('source', '#c3c7ca', .95, .22));
  k.finish('Rubber grips', GRIP); k.finish(black, f('source', '#1c1d1f', .3, .45)); k.finish('Rubber foot pads', RUBBER); k.finish('Warning labels', f('source', '#d9531e', 0, .6));
  k.finish('GMWD logo', f('source', '#f2f2ef', 0, .5));
  const S = G.seat, P = G.pivot, t = 76, prone = p.mode === 1;
  const holes = (a: V3, b: V3, up: V3 = Z) => perforated(k, frame, a, b, t, t, 50, 24, up, Math.abs(up[2]) > .5 ? X : Z);
  const near = 300, far = -450, front = -150, rearY = 930;
  // Base: perforated rectangle with a centre spine; rubber pads under the corners.
  holes([far - 38, front, t / 2], [near + 150, front, t / 2]); holes([far - 38, rearY, t / 2], [near + 38, rearY, t / 2]);
  for (const x of [near, far, 0]) holes([x, front + 38, t / 2], [x, rearY - 38, t / 2]);
  for (const x of [far - 10, near + 110]) for (const y of [front, rearY]) k.box('Rubber foot pads', [x - 40, y - 40, 0], [x + 40, y + 40, 1]);
  k.box('Warning labels', [near + 60, front - 38.6, 30], [near + 110, front - 37.8, 50]);
  // Lever tower: perforated upright, gusset plate and cap; seat posts on the spine.
  const towerY = P[1] + 45;
  holes([near, towerY, t], [near, towerY, P[2] + 70], Y);
  k.box(frame, [near - 38, towerY - 38, P[2] + 70], [near + 38, towerY + 38, P[2] + 76]);
  k.box(frame, [near + 38, towerY - 120, t], [near + 44, towerY + 38, 330]);
  for (const y of [110, 470]) { holes([0, y, t], [0, y, S.top - S.t - 70], Y); k.box(frame, [-40, y - 38, S.top - S.t - 70], [40, y + 38, S.top - S.t - 64]); }
  k.box(frame, [-S.w / 2 + 20, 30, S.top - S.t - 64], [S.w / 2 - 20, S.l - 30, S.top - S.t - 20]);
  // Storage posts: chrome 10" posts angled outward from each side rail.
  for (const [x, s] of [[near, 1], [far, -1]] as [number, number][]) {
    const b: V3 = [x + s * 38, 640, 60]; k.rod(chrome, b, add(b, scale([s * .55, .35, .76], G.post)), 50, 32); k.rod(frame, sub(b, [s * 6, 0, 0]), add(b, [s * 4, 0, 0]), 70, 32);
  }
  // Seat, and a back pad that stands on a 7-hole ladder or folds flat into the prone bench.
  k.pad(pads, [0, S.l / 2, S.top - S.t], X, Y, S.w, S.l, S.t, 30, 14);
  const face = S.l - 10 + (p.backPad - 4) * 30, hinge: V3 = [0, face, prone ? S.top : S.top + 5];
  holes([0, S.l - 20, S.top - S.t - 50], [0, S.l + 300, S.top - S.t - 50]);
  k.box(frame, [-45, face + 40, S.top - S.t - 90], [45, face + 84, S.top - S.t - 10]);
  k.push(rotX(prone ? -90 : -8, hinge));
  k.box(frame, [-50, face + G.back.t, hinge[2] + 20], [50, face + G.back.t + 12, hinge[2] + 400]);
  k.beam(frame, [0, face + G.back.t + 30, hinge[2] - 40], [0, face + G.back.t + 30, hinge[2] + 300], 50, 50, Y);
  k.pad(pads, [0, face + G.back.t, hinge[2] + G.back.h / 2], X, Z, G.back.w, G.back.h, G.back.t, 32, 14);
  k.box('GMWD logo', [-62, face - 1, hinge[2] + 300], [62, face, hinge[2] + 332]);
  k.pop();
  // Handles: extension grips below the seat sides, prone grips behind the back pad.
  for (const s of [-1, 1]) {
    bent(k, frame, [[s * 60, 200, S.top - S.t - 60], [s * (S.w / 2 + 40), 200, S.top - S.t - 60], [s * (S.w / 2 + 70), 330, S.top - S.t - 110]], 32);
    gripHandle(k, frame, 'Rubber grips', [s * (S.w / 2 + 70), 330, S.top - S.t - 110], [s * (S.w / 2 + 100), 330 + 185, S.top - S.t - 150], 32, inch(7.3));
    bent(k, frame, [[s * 30, S.l + 260, S.top - S.t - 50], [s * 230, S.l + 330, S.top - S.t - 50]], 32);
    gripHandle(k, frame, 'Rubber grips', [s * 230, S.l + 330, S.top - S.t - 50], [s * 330, S.l + 400, S.top - S.t - 110], 32, inch(7.3));
  }
  // Movement arm: red lever with the shin roller below the knee pivot and the round tibia pad above; dial ring.
  const legA = G.rep[prone ? 'curl' : 'extension'][p.rep], ax = near + 38 + 36;
  k.rod(chrome, [near + 38, P[1], P[2]], [ax + 40, P[1], P[2]], 58, 32);
  k.push(swingAbout(legA, P));
  k.beam(arm, [ax + 8, P[1], P[2] + 230], [ax + 8, P[1], P[2] - G.lever - 40], 60, 60, Y);
  for (const z of [-80, -160, -240, 80, 150]) k.hole(arm, [ax - 30, P[1], P[2] + z], [ax + 46, P[1], P[2] + z], 26);
  k.rod(arm, [ax - 22, P[1], P[2] - G.lever], [ax - 30, P[1], P[2] - G.lever], 70, 32);
  roller(k, [ax - 30, P[1], P[2] - G.lever], [ax - 30 - G.roller.l, P[1], P[2] - G.lever], G.roller.d);
  k.rod(pads, [ax - 24, P[1], P[2] + 200], [ax - 114, P[1], P[2] + 200], 190, 48);
  k.rod(arm, [ax - 20, P[1], P[2] + 200], [ax - 24, P[1], P[2] + 200], 120, 32);
  for (const z of [0, -G.lever, 200]) k.rod(chrome, [ax + 38, P[1], P[2] + z], [ax + 44, P[1], P[2] + z], 44, 32);
  k.pop();
  arcPlate(k, grey, [ax + 44, P[1], P[2]], 96, 152, 6, -160, -20, 8, 22);
  // Black crank on the pivot shaft, link rod to the red load lever, 10.6" horn on the ratio block.
  const crankA = legA + 82, tip = add(P, scale(swing(crankA), G.crank)), rest = add(P, scale(swing(G.rep.extension[0] + 82), G.crank));
  const H = G.hornPivot, rest0 = add(H, scale(swing(90), G.link)), len = Math.hypot(rest[1] - rest0[1], rest[2] - rest0[2]);
  const hornA = solveLever(H, G.link, tip, len, 90), cx = ax + 58, q = add(H, scale(swing(hornA), G.link));
  k.beam(black, [cx, P[1], P[2]], [cx, tip[1], tip[2]], 18, 50, X);
  k.rod(black, [cx, P[1], P[2]], [cx + 12, P[1], P[2]], 60, 24);
  k.rod(chrome, [cx, tip[1], tip[2]], [cx, q[1], q[2]], 14, 16);
  for (const e of [tip, q]) k.rod(black, [cx - 12, e[1], e[2]], [cx + 12, e[1], e[2]], 24, 20);
  k.box(frame, [near + 38, H[1] - 45, H[2] - 45], [near + 70, H[1] + 45, H[2] + 45]);
  k.push(swingAbout(hornA - 90, H));
  k.beam(arm, [H[0], H[1] + 20, H[2]], [H[0], H[1] - G.hornArm - 30, H[2]], 60, 60, Z);
  k.box(arm, [H[0] + 30, H[1] - G.hornArm - 40, H[2] - 36], [H[0] + 62, H[1] - G.hornArm + 120, H[2] + 36]);
  k.box(black, [H[0] - 34, H[1] - G.hornArm + 20, H[2] - 50], [H[0] + 34, H[1] - G.hornArm + 180, H[2] - 30]);
  knob(k, chrome, [H[0], H[1] - G.hornArm + 110, H[2] - 50], [0, 0, -1], 42, 24);
  horn(k, chrome, 'Loaded plate', [H[0] + 62, H[1] - G.hornArm, H[2]], X, G.hornLen, 50, p.plates, 80);
  k.pop();
}
/** Cable-lifted load lever: the pivot-mounted drum (radius `drum`) winds cable over an idler at `idler` and down to a
 * point `r` along a lever hinged at `h`; returns the lever angle for a leg-arm swing `turn` (degrees past rest). */
function cableLever(h: V3, r: number, idler: V3, restAngle: number, drum: number, turn: number) {
  const q0 = add(h, scale(swing(restAngle), r)), free0 = Math.hypot(q0[1] - idler[1], q0[2] - idler[2]);
  return solveLever(h, r, idler, Math.max(40, free0 - drum * turn * Math.PI / 180), restAngle);
}
// ---------------------------------------------------------------- Lionscool Leg Extension & Curl V4.0
/** Published: 40.8" L × 33" W × 38.3" H; backrest 12.4" × 21.6"; seat 16" × 16.7"; 19.7" leg roller, 16" thigh roller;
 * dual 7.1" weight horns; aluminium pulleys, 1:1 cable; 2.2" EPE/PU pads; 400 lb plates. Lever and load on the user's right. */
export const LIONSCOOL_V4 = {
  seat: { w: inch(16), l: inch(16.7), t: inch(2.2), top: 462 }, back: { w: inch(12.4), h: inch(21.6), t: inch(2.2) }, roller: { l: inch(19.7), d: 125 }, thigh: { l: inch(16), d: 110 },
  horn: inch(7.1), pivot: [262, -46, 560] as V3, lever: 392, thighArm: 170, drum: 88, idler: [262, 70, 745] as V3, hornPivot: [300, 150, 230] as V3, hornArm: 470,
  rep: { extension: [10, 52, 92], curl: [98, 150, 192] },
};
export function describeLionscoolV4(k: Kit, p: NumericParams) {
  k.push(MIRROR_X);
  const L = LIONSCOOL_V4, frame = 'Powder-coated steel frame', pads = 'Textured PU pads', chrome = 'Stainless weight horns', hw = 'Zinc hardware';
  k.finish(frame, f('source', '#1d1e20', .2, .55)); k.finish(pads, f('liner', '#1a1b1c', 0, .85)); k.finish(chrome, CHROME); k.finish(hw, ZINC);
  k.finish('Foam roller pads', f('liner', '#151617', 0, .82)); k.finish('Roller end caps', f('source', '#1b1c1e', .1, .6)); k.finish('Aluminium pulleys', f('source', '#c9ccd0', .95, .25));
  k.finish('Steel cable', f('source', '#2a2b2d', .6, .4)); k.finish('Rubber grips', GRIP); k.finish('Plastic foot caps', PLASTIC); k.finish('Lion logo', f('source', '#efefec', 0, .5));
  const S = L.seat, P = L.pivot, prone = p.mode === 1, t = 50, front = -300, rearY = 505;
  // Base: front and rear lateral feet with capped ends, twin rails under the seat, a cross tie under the A-frame.
  for (const y of [front, rearY]) { k.beam(frame, [-285, y, 25], [340, y, 25], 60, 50, Z); footCap(k, 'Plastic foot caps', 'Plastic foot caps', [-285, y, 25], [-1, 0, 0], 60, 50, 70); footCap(k, 'Plastic foot caps', 'Plastic foot caps', [340, y, 25], X, 60, 50, 70); }
  for (const x of [-110, 110]) k.beam(frame, [x, front + 30, 25], [x, rearY - 30, 25], 50, 50, Z);
  k.beam(frame, [262, front + 30, 25], [262, 200, 25], 50, 50, Z);
  // A-frame upright on the load side: two raked legs meeting at the pivot hub, with a short idler post above.
  k.beam(frame, [262, front + 40, 50], [262, P[1] - 20, P[2] - 40], t, t, X);
  k.beam(frame, [262, 190, 50], [262, P[1] + 30, P[2] - 40], t, t, X);
  k.beam(frame, [262, P[1] - 60, P[2] - 70], [262, P[1] + 70, P[2] - 70], t, t, Z);
  k.beam(frame, [262, P[1] + 40, P[2] - 60], [262, L.idler[1], L.idler[2] - 40], 40, 40, X);
  k.box(frame, [242, L.idler[1] - 40, L.idler[2] - 50], [282, L.idler[1] + 40, L.idler[2] + 40]);
  pulley(k, 'Aluminium pulleys', undefined, [303, L.idler[1], L.idler[2]], X, 90, 22);
  k.box(frame, [286, L.idler[1] - 46, L.idler[2] - 46], [318, L.idler[1] + 46, L.idler[2] + 50].map((v, i) => i === 0 ? 290 : v) as V3);
  // Seat on a centre post, 2.2" pads, back pad on a sliding tube (5 stops) that folds flat for prone curls.
  k.beam(frame, [0, 180, 50], [0, 180, S.top - S.t - 30], 60, 60, Y);
  k.beam(frame, [0, -10, S.top - S.t - 25], [0, S.l + 160, S.top - S.t - 25], 60, 50, Z);
  k.pad(pads, [0, S.l / 2, S.top - S.t], X, Y, S.w, S.l, S.t, 40, 16);
  k.box('Lion logo', [-20, 90, S.top + .5], [20, 130, S.top + 1].map((v, i) => i === 2 ? S.top + 1 : v) as V3);
  const face = S.l + (p.backPad - 3) * 30, hinge: V3 = [0, face, prone ? S.top : S.top + 6];
  k.beam(frame, [0, S.l + 60, S.top - S.t - 40], [0, face + 110, S.top - S.t - 40], 50, 50, Z);
  knob(k, 'Rubber grips', [25, S.l + 110, S.top - S.t - 40], X, 44, 24);
  k.push(rotX(prone ? -86 : -18, hinge));
  k.beam(frame, [0, face + S.t + 25, hinge[2] - 60], [0, face + S.t + 25, hinge[2] + 380], 50, 40, Y);
  k.pad(pads, [0, face + L.back.t, hinge[2] + L.back.h / 2], X, Z, L.back.w, L.back.h, L.back.t, 44, 16);
  k.box('Lion logo', [-32, face - .6, hinge[2] + 380], [32, face, hinge[2] + 450]);
  k.pop();
  // Handles: seat side grips and the low prone U-bar behind.
  for (const s of [-1, 1]) {
    bent(k, frame, [[s * 60, 120, S.top - S.t - 40], [s * (S.w / 2 + 30), 120, S.top - S.t - 40], [s * (S.w / 2 + 30), 330, S.top - S.t - 80]], 28);
    gripHandle(k, frame, 'Rubber grips', [s * (S.w / 2 + 30), 330, S.top - S.t - 80], [s * (S.w / 2 + 50), 470, S.top - S.t - 80], 28, 120);
  }
  bent(k, frame, [[-150, rearY + 40, 170], [-150, rearY - 60, 90], [150, rearY - 60, 90], [150, rearY + 40, 170]], 28);
  for (const s of [-1, 1]) gripHandle(k, frame, 'Rubber grips', [s * 150, rearY + 40, 170], [s * 150, rearY + 190, 190], 28, 130);
  // Pivot hub: drum (cam) and 24-hole dial; leg arm with the 19.7" roller; thigh roller arm; cable to the load lever.
  const legA = L.rep[prone ? 'curl' : 'extension'][p.rep], turn = legA - L.rep.extension[0], hx = 290;
  k.rod(frame, [238, P[1], P[2]], [hx + 70, P[1], P[2]], 40, 24);
  k.push(swingAbout(legA, P));
  dial(k, frame, [hx, P[1], P[2]], 250, 8, 24, 104, 13, 0, 360);
  k.rod('Aluminium pulleys', [hx + 8, P[1], P[2]], [hx + 34, P[1], P[2]], 2 * L.drum, 48);
  k.rod(frame, [hx + 34, P[1], P[2]], [hx + 38, P[1], P[2]], 2 * L.drum + 20, 48);
  k.beam(frame, [hx + 64, P[1], P[2] + 20], [hx + 64, P[1], P[2] - L.lever - 30], t, t, Y);
  k.beam(frame, [hx + 64, P[1] - 30, P[2] - 250], [hx + 64, P[1] - 110, P[2] - 250], 36, 36, Z);
  k.rod(frame, [hx + 40, P[1], P[2] - L.lever], [248, P[1], P[2] - L.lever], 32, 24);
  roller(k, [248, P[1], P[2] - L.lever], [248 - L.roller.l, P[1], P[2] - L.lever], L.roller.d);
  k.pop();
  k.push(swingAbout(-128 + (p.thighPad - 3) * 8, P));
  k.beam(frame, [228, P[1], P[2]], [228, P[1], P[2] - L.thighArm], 44, 44, Y);
  roller(k, [206, P[1], P[2] - L.thighArm], [206 - L.thigh.l, P[1], P[2] - L.thighArm], L.thigh.d);
  k.pop();
  const H = L.hornPivot, hornA = cableLever(H, L.hornArm, L.idler, 86, L.drum, turn), q = add(H, scale(swing(hornA), L.hornArm - 40));
  const drumTop: V3 = [hx + 21, P[1] + L.drum * .5, P[2] + L.drum * .86], idlerIn: V3 = [hx + 21, L.idler[1] + 40, L.idler[2] + 30], idlerOut: V3 = [hx + 21, L.idler[1] - 36, L.idler[2] + 24];
  k.cable('Steel cable', [drumTop, idlerIn, idlerOut, [hx + 21, q[1], q[2] + 30]], 5);
  k.rod(hw, [hx + 21, q[1], q[2] + 30], [hx + 21, q[1], q[2] + 70], 12, 12);
  k.beam(frame, [230, H[1], H[2] - 40], [230, H[1], H[2] + 40], 50, 50, Y);
  k.rod(frame, [230, H[1], H[2]], [hx + 60, H[1], H[2]], 36, 24);
  k.push(swingAbout(hornA - 86, H));
  // V-shaped load arm running forward outside the A-frame to the dual-horn bar.
  const bend: V3 = [hx + 30, H[1] - 300, H[2] - 70], end: V3 = [hx + 30, H[1] - L.hornArm, H[2] + 90];
  k.beam(frame, [hx + 30, H[1] + 20, H[2]], bend, t, t, X); k.beam(frame, bend, end, t, t, X);
  k.rod(frame, sub(end, [60, 0, 0]), add(end, [60, 0, 0]), 60, 32);
  for (const s of [-1, 1]) horn(k, chrome, s > 0 ? 'Loaded plate · outer horn' : 'Loaded plate · inner horn', add(end, [s * 60, 0, 0]), [s, 0, 0], L.horn, 50, p.plates, 70);
  k.pop();
  k.pop();
}
// ---------------------------------------------------------------- Titan Selectorized Leg Extension and Curl Machine (401926)
/** Published: 63" H × 36" W × 60" D; 250 lb stack in 10 lb steps (10 lb start, 24 plates + top); 1:1 spiral cam; 5 mm
 * nylon cable; red anodised aluminium pulleys; magnetised pin; backrest and thigh pad each 7 positions. Tower and lever
 * sit on the user's right. */
export const TITAN_SELECTOR = {
  seat: { w: 340, l: 400, t: 64, top: 560 }, back: { w: 330, h: 700, t: 70 }, roller: { l: 440, d: 150 }, thigh: { l: 420, d: 150 },
  pivot: [236, -40, 612] as V3, lever: 450, thighArm: 215, sheave: 290, tower: { x: [250, 640], y: [180, 330], h: inch(63) },
  stack: { n: 24, t: 27, w: 280, d: 130, head: 60, rodGap: 190 }, rep: { extension: [8, 50, 92], curl: [92, 44, -6] }, camR: 200,
  thigh8: [-150, -144, -138, -132, -126, -120, -114],
};
export const titanSelectorWeights = () => range(25).map(i => i * 10); // 10 … 250 lb
/** Headplate-only start weight and the step each pinned plate adds. */
export const TITAN_SELECTOR_START = 10;
export function describeTitanSelector(k: Kit, p: NumericParams) {
  k.push(MIRROR_X);
  const T = TITAN_SELECTOR, frame = 'Powder-coated steel frame', pads = 'HeftyGrip vinyl pads', red = 'Red anodised pulleys and knobs', hw = 'Zinc hardware';
  k.finish(frame, f('source', '#1d1e20', .2, .55)); k.finish(pads, VINYL); k.finish(red, f('source', '#c3202a', .6, .35)); k.finish(hw, ZINC);
  k.finish('Foam roller pads', f('liner', '#151617', 0, .84)); k.finish('Roller end caps', PLASTIC); k.finish('Nylon-coated cable', f('source', '#18191a', .2, .5));
  k.finish('Chrome trim', CHROME); k.finish('Rubber grips', GRIP); k.finish('Titan header plate', f('source', '#e9e9e5', 0, .5)); k.finish('Rubber foot pads', RUBBER);
  k.finish('Spiral cam', f('source', '#232427', .3, .5));
  const S = T.seat, P = T.pivot, [tx0, tx1] = T.tower.x, [ty0, ty1] = T.tower.y, H = T.tower.h, up = 80, cx = (tx0 + tx1) / 2, cy = (ty0 + ty1) / 2, ox = 300;
  // Stack tower beside the seat, broad face forward: two 3" × 3" uprights, header box with the Titan plate and
  // quartered-circle cutouts, base plate, lower side shields.
  for (const x of [tx0 + up / 2, tx1 - up / 2]) { k.beam(frame, [x, cy, 0], [x, cy, H - 150], up, ty1 - ty0, Y); k.box('Rubber foot pads', [x - 60, ty0 - 10, 0], [x + 60, ty1 + 10, 4]); }
  k.box(frame, [tx0, ty0, H - 150], [tx1, ty1, H]);
  k.box(frame, [tx0 + up, ty0, 0], [tx1 - up, ty1, 36]);
  k.box('Titan header plate', [cx + 10, ty0 - .8, H - 95], [cx + 130, ty0, H - 60]);
  for (const c of [cx - 60, tx0 + 40]) for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) { const r = c === tx0 + 40 ? 14 : 22; k.hole(frame, [c + dx * r, ty0 - 2, H - 75 + dz * r], [c + dx * r, ty0 + 8, H - 75 + dz * r], c === tx0 + 40 ? 20 : 34, 20); }
  for (const x of [tx0 - 4, tx1]) k.box(frame, [x, ty0 + 10, 36], [x + 4, ty1 - 10, 760]);
  // Weight stack: 24 × 10 lb plates on chrome rods, green/yellow/red label strips on the front, red magnetised pin.
  const mode = p.mode ? 'curl' : 'extension', legA = T.rep[mode][p.rep], engaged = Math.round((p.pin - TITAN_SELECTOR_START) / 10);
  const lift = Math.min(330, T.camR * Math.abs(legA - T.rep[mode][0]) * Math.PI / 180);
  const tone = (i: number) => i <= 10 ? ['green', '#2fbf4a'] as const : i <= 20 ? ['yellow', '#d9c21c'] as const : ['red', '#d12a2a'] as const;
  k.push(rotZ(90, [cx, cy, 0]));
  const st = weightStack(k, { c: [cx, cy, 36], w: T.stack.w, d: T.stack.d, t: T.stack.t, n: T.stack.n, head: T.stack.head, rodGap: T.stack.rodGap, rodD: 25, rodTop: H - 150,
    engaged, lift, face: -1, label: i => tone(i), pinColor: f('source', '#c3202a', .6, .35) });
  k.pop();
  // Cable: headplate → header pulley → front header pulley → down the tower front → floor pulley → sheave arm on the cam.
  const A: V3 = [cx, cy, H - 190], B: V3 = [cx, ty0 - 50, H - 190], C: V3 = [cx, ty0 - 50, 90];
  for (const q of [A, B]) pulley(k, red, frame, q, X, 115, 26);
  pulley(k, red, frame, C, X, 95, 24);
  k.box(frame, [cx - 30, ty0 - 110, H - 250], [cx + 30, ty0, H - 150]);
  k.box(frame, [cx - 30, ty0 - 100, 36], [cx + 30, ty0, 150]);
  const sheaveA = legA + 70, D = add(P, add(scale(swing(sheaveA), T.sheave), [ox - P[0] - 94, 0, 0]));
  k.cable('Nylon-coated cable', [[cx, cy, st.headTop + 60], [cx, cy, A[2] + 57], [cx, B[1] + 20, B[2] + 57], [cx, B[1] - 57, B[2]], [cx, C[1] - 47, C[2]], [cx, C[1] - 20, C[2] - 45], [D[0], D[1], D[2] - 47]], 5);
  // Seat frame: base rails, two posts, seat pan; back pad on a chrome slider (7 stops) with a red knob.
  const rearFoot = 1110, frontFoot = -300;
  k.beam(frame, [0, frontFoot, 30], [0, rearFoot + 40, 30], 76, 60, Z);
  k.beam(frame, [-230, rearFoot, 30], [230, rearFoot, 30], 76, 60, Z); k.beam(frame, [-230, frontFoot, 30], [tx0, frontFoot, 30], 76, 60, Z);
  k.beam(frame, [0, 230, 30], [tx0, 230, 30], 76, 60, Z);
  for (const [x, y] of [[-230, frontFoot], [tx0, frontFoot], [-230, rearFoot], [230, rearFoot]]) k.box('Rubber foot pads', [x - 45, y - 45, 0], [x + 45, y + 45, 4]);
  k.beam(frame, [0, 90, 60], [0, 90, S.top - S.t - 60], 76, 76, Y); k.beam(frame, [0, 560, 60], [0, 360, S.top - S.t - 60], 76, 76, X);
  k.beam(frame, [0, -20, S.top - S.t - 40], [0, 700, S.top - S.t - 40], 76, 50, Z);
  k.pad(pads, [0, S.l / 2, S.top - S.t], X, Y, S.w, S.l, S.t, 30, 16);
  const face = S.l + 20 + (p.backPad - 4) * 28, hinge: V3 = [0, face, S.top + 10];
  k.beam('Chrome trim', [0, S.l + 60, S.top - S.t - 80], [0, face + 260, S.top - S.t - 80], 50, 50, Z);
  for (let i = 0; i < 4; i++) k.hole('Chrome trim', [-30, face + 120 + i * 32, S.top - S.t - 80], [30, face + 120 + i * 32, S.top - S.t - 80], 16);
  knob(k, red, [0, face + 60, S.top - S.t - 105], [0, 0, -1], 44, 20);
  k.push(rotX(-18, hinge));
  k.beam(frame, [0, face + T.back.t + 25, hinge[2] - 120], [0, face + T.back.t + 25, hinge[2] + 520], 60, 50, Y);
  k.pad(pads, [0, face + T.back.t, hinge[2] + T.back.h / 2], X, Z, T.back.w, T.back.h, T.back.t, 34, 16);
  k.pop();
  for (const s of [-1, 1]) {
    bent(k, frame, [[s * 40, 330, S.top - S.t - 40], [s * (S.w / 2 + 20), 360, S.top - S.t - 40], [s * (S.w / 2 + 50), 520, S.top - S.t - 10]], 32);
    k.rod('Chrome trim', [s * (S.w / 2 + 50), 520, S.top - S.t - 10], [s * (S.w / 2 + 50), 560, S.top - S.t], 38, 24);
  }
  // Lever: spiral cam disc and sheave arm, leg arm with the lower roller, knee-pad arm on a 7-hole arc; red knobs.
  k.rod(frame, [P[0] - 30, P[1], P[2]], [ox + 40, P[1], P[2]], 60, 32);
  k.box(frame, [ox - 10, P[1] - 60, P[2] - 120], [ox, ty0 + 20, P[2] + 90]);
  k.push(swingAbout(legA, P));
  k.rod('Spiral cam', [ox - 50, P[1], P[2]], [ox - 34, P[1], P[2]], 2 * T.camR, 64);
  k.hole('Spiral cam', [ox - 52, P[1], P[2]], [ox - 32, P[1], P[2]], 2 * T.camR - 120, 48);
  k.rod('Spiral cam', [ox - 50, P[1], P[2]], [ox - 34, P[1], P[2]], 130, 40);
  for (let i = 0; i < 6; i++) { const a = i * 60 * Math.PI / 180; k.beam('Spiral cam', [ox - 42, P[1], P[2]], [ox - 42, P[1] + (T.camR - 50) * Math.sin(a), P[2] + (T.camR - 50) * Math.cos(a)], 30, 16, X); }
  k.beam(frame, [P[0] + 12, P[1], P[2] + 60], [P[0] + 12, P[1], P[2] - T.lever - 40], 70, 70, Y);
  k.rod(frame, [P[0] - 24, P[1], P[2] + 60], [P[0] + 48, P[1], P[2] + 60], 110, 40);
  k.rod(frame, [P[0] - 24, P[1], P[2] - T.lever], [P[0] - 40, P[1], P[2] - T.lever], 50, 24);
  roller(k, [P[0] - 40, P[1], P[2] - T.lever], [P[0] - 40 - T.roller.l, P[1], P[2] - T.lever], T.roller.d, { knob: red, knobColor: f('source', '#c3202a', .6, .35) });
  k.pop();
  k.push(swingAbout(sheaveA, P));
  k.beam(frame, [ox - 64, P[1], P[2]], [ox - 64, P[1], P[2] - T.sheave], 50, 30, Y);
  pulley(k, red, frame, [ox - 64 - 30, P[1], P[2] - T.sheave], X, 95, 24);
  k.pop();
  const thighA = T.thigh8[p.thighPad - 1];
  arcPlate(k, 'Chrome trim', [P[0] - 40, P[1], P[2]], 110, 150, 5, -165, -110, 7, 12);
  k.push(swingAbout(thighA, P));
  k.beam(frame, [P[0] - 50, P[1], P[2] + 30], [P[0] - 50, P[1], P[2] - T.thighArm - 30], 60, 60, Y);
  roller(k, [P[0] - 80, P[1], P[2] - T.thighArm], [P[0] - 80 - T.thigh.l, P[1], P[2] - T.thighArm], T.thigh.d, { knob: red, knobColor: f('source', '#c3202a', .6, .35) });
  k.pop();
  k.pop();
}
// ---------------------------------------------------------------- Temple of Gainz Selectorized Leg Extension + Seated Leg Curl V3
/** Published: 61" H; 38.8" overall / 29.8" frame width; 46.5" long at rest, 64.9" with the arm extended, 28.3" frame
 * footprint; 120 kg (264 lb) stack at 1:1; 9 movement-arm and 5 roller positions; 8 thigh-pad positions; recessed front
 * crossmember (V3). Tower and lever sit on the user's right. */
export const TOG_V3 = {
  seat: { w: 360, l: 430, t: 70, top: 540 }, back: { w: 330, h: 760, t: 76 }, roller: { l: 470, d: 190 }, knee: { l: 480, d: 150 },
  pivot: [228, -20, 600] as V3, lever: [360, 390, 420, 450, 480], cam: 170, tower: { x: [300, 540], y: [0, 560], h: inch(61) },
  stack: { n: 24, t: 26, w: 300, d: 130, head: 64, rodGap: 200 }, rep: { extension: [6, 50, 92], curl: [92, 46, -8] }, liftR: 180,
  thigh: [-60, -52, -44, -36, -28, -20, -12, -4], thighBar: 960,
};
export const togV3Weights = () => range(24).map(i => i * 5);
export function describeTogV3(k: Kit, p: NumericParams) {
  k.push(MIRROR_X);
  const T = TOG_V3, frame = 'Satin black frame', pads = 'Black vinyl pads', shroud = 'Laser-cut steel shroud', hw = 'Zinc hardware', steel = 'Laser-engraved steel plates';
  k.finish(frame, f('source', '#161719', .25, .5)); k.finish(pads, f('liner', '#131415', 0, .88)); k.finish(shroud, f('source', '#1a1b1d', .25, .55)); k.finish(hw, ZINC);
  k.finish(steel, f('source', '#b7bbbf', .9, .28)); k.finish('Foam roller pads', f('liner', '#121314', 0, .85)); k.finish('Roller end caps', f('source', '#1c1d1f', .2, .5));
  k.finish('Black pulleys', f('source', '#1e1f21', .3, .45)); k.finish('Steel cable', f('source', '#2a2b2d', .6, .4)); k.finish('Rubber grips', GRIP); k.finish('Chrome trim', CHROME);
  k.finish('Instruction placard', f('source', '#101112', 0, .6)); k.finish('Placard print', f('source', '#e9e9e4', 0, .6)); k.finish('Nameplate', f('source', '#c9ccd0', .8, .3)); k.finish('Rubber foot pads', RUBBER);
  const S = T.seat, P = T.pivot, [tx0, tx1] = T.tower.x, [ty0, ty1] = T.tower.y, H = T.tower.h, up = 76, cx = (tx0 + tx1) / 2, cy = (ty0 + ty1) / 2, arch = 150;
  // Tower: front and rear uprights, header with a radiused rear corner, base plate, outer shroud with the logo window.
  k.beam(frame, [cx, ty0 + up / 2, 0], [cx, ty0 + up / 2, H], tx1 - tx0, up, Y);
  k.beam(frame, [cx, ty1 - up / 2, 0], [cx, ty1 - up / 2, H - arch], tx1 - tx0, up, Y);
  k.box(frame, [tx0, ty0 + up, H - 260], [tx1, ty1 - arch, H]);
  k.box(frame, [tx0, ty1 - arch - 1, H - 260], [tx1, ty1, H - arch]);
  k.rod(frame, [tx0, ty1 - arch, H - arch], [tx1, ty1 - arch, H - arch], 2 * arch, 48);
  for (const y of [ty0 + up / 2, ty1 - up / 2]) k.box('Rubber foot pads', [tx0 - 20, y - 70, 0], [tx1 + 20, y + 70, 4]);
  k.box(frame, [tx0, ty0 + up, 0], [tx1, ty1 - up, 30]);
  k.box(shroud, [tx1, ty0 + up, 30], [tx1 + 4, ty1 - up, 1000]);
  k.hole(shroud, [tx1 - 2, cy, 700], [tx1 + 6, cy, 700], 190, 40);
  k.box('Instruction placard', [tx0 - 2, ty0 + up + 10, H - 250], [tx0, ty1 - arch - 20, H - 70]);
  for (let i = 0; i < 5; i++) k.box('Placard print', [tx0 - 2.6, ty0 + up + 40 + i * 70, H - 200], [tx0 - 2, ty0 + up + 90 + i * 70, H - 110]);
  k.box('Nameplate', [tx0 - 2.6, cy - 60, H - 40], [tx0, cy + 60, H - 12]);
  // Stack: 24 × 5 kg plates, pin in the selected plate.
  const mode = p.mode ? 'curl' : 'extension', legA = T.rep[mode][p.rep], engaged = Math.round(p.pin / 5);
  const lift = Math.min(330, T.liftR * Math.abs(legA - T.rep[mode][0]) * Math.PI / 180);
  const st = weightStack(k, { c: [cx, cy, 30], w: T.stack.w, d: T.stack.d, t: T.stack.t, n: T.stack.n, head: T.stack.head, rodGap: T.stack.rodGap, rodD: 25, rodTop: H - 260,
    engaged, lift, face: -1, label: i => i <= 8 ? ['white', '#e8e8e3'] : i <= 16 ? ['grey', '#a9acb0'] : ['red', '#c02828'], pinColor: f('source', '#1a1b1d', .3, .4) });
  // Cable: headplate → top front pulley → down the tower front → twin pulleys → cam.
  const A: V3 = [cx, cy, H - 300], B: V3 = [cx, ty0 - 60, H - 300], C: V3 = [cx, ty0 - 60, P[2] + 230];
  pulley(k, 'Black pulleys', frame, A, X, 110, 26); pulley(k, 'Black pulleys', frame, B, X, 110, 26); pulley(k, 'Black pulleys', frame, C, X, 110, 26);
  k.box(frame, [tx0, ty0 - 110, H - 360], [tx1, ty0, H - 240]);
  k.box(frame, [tx0 + 40, ty0 - 110, C[2] - 60], [tx0 + 80, ty0, C[2] + 60]);
  k.cable('Steel cable', [[cx, cy, st.headTop + 60], [cx, cy, A[2] + 55], [cx, B[1] + 20, B[2] + 55], [cx, B[1] - 55, B[2]], [cx, C[1] - 55, C[2]], [cx, P[1] - T.cam * .4, P[2] + T.cam * .9]], 5);
  // Base: a recessed front crossmember, spine to the rear foot, seat post; seat with the knee roller across its front.
  const rearY = 790, frontF = -300;
  k.beam(frame, [-350, frontF, 30], [tx0, frontF, 30], 76, 60, Z); k.beam(frame, [-350, rearY, 30], [tx0, rearY, 30], 76, 60, Z);
  for (const x of [-350, 0]) k.beam(frame, [x, frontF, 30], [x, rearY, 30], 76, 60, Z);
  k.beam(frame, [0, ty1 - up, 30], [tx0, ty1 - up, 30], 76, 60, Z);
  for (const [x, y] of [[-350, frontF], [-350, rearY]]) k.box('Rubber foot pads', [x - 50, y - 50, 0], [x + 50, y + 50, 4]);
  k.beam(frame, [0, 180, 60], [0, 180, S.top - S.t - 50], 90, 90, Y);
  k.beam(frame, [0, -20, S.top - S.t - 30], [0, 620, S.top - S.t - 30], 90, 40, Z);
  k.pad(pads, [0, S.l / 2 + 30, S.top - S.t], X, Y, S.w, S.l, S.t, 30, 18);
  roller(k, [-S.w / 2, 0, S.top - S.t / 2], [S.w / 2, 0, S.top - S.t / 2], T.knee.d);
  // Back pad on a chrome slider with stops; handles curving under the seat.
  const face = S.l + 40 + (p.backPad - 4) * 30, hinge: V3 = [0, face, S.top + 20];
  k.beam('Chrome trim', [0, S.l + 40, S.top - S.t - 70], [0, face + 330, S.top - S.t - 70], 50, 50, Z);
  for (let i = 0; i < 5; i++) k.hole('Chrome trim', [-30, face + 170 + i * 30, S.top - S.t - 70], [30, face + 170 + i * 30, S.top - S.t - 70], 14);
  knob(k, 'Rubber grips', [0, face + 110, S.top - S.t - 95], [0, 0, -1], 44, 20);
  k.push(rotX(-16, hinge));
  k.beam(frame, [0, face + T.back.t + 25, hinge[2] - 130], [0, face + T.back.t + 25, hinge[2] + 560], 70, 50, Y);
  k.pad(pads, [0, face + T.back.t, hinge[2] + T.back.h / 2 - 20], X, Z, T.back.w, T.back.h, T.back.t, 36, 18);
  k.pop();
  for (const s of [-1, 1]) {
    bent(k, frame, [[s * 40, 380, S.top - S.t - 30], [s * (S.w / 2 + 30), 420, S.top - S.t - 60], [s * (S.w / 2 + 60), 560, S.top - S.t - 130]], 32);
    gripHandle(k, frame, 'Rubber grips', [s * (S.w / 2 + 60), 560, S.top - S.t - 130], [s * (S.w / 2 + 70), 700, S.top - S.t - 110], 32, 120);
    k.rod('Chrome trim', [s * (S.w / 2 + 70), 700, S.top - S.t - 110], [s * (S.w / 2 + 71), 712, S.top - S.t - 108], 40, 24);
  }
  // Movement arm: cam, engraved start dial, arm with the 5-position roller; thigh pad on a lateral bar with an 8-stop arc.
  const L = T.lever[p.roller - 1];
  k.rod(frame, [P[0] - 20, P[1], P[2]], [tx0, P[1], P[2]], 60, 32);
  k.push(swingAbout(legA, P));
  k.rod(frame, [P[0] + 26, P[1], P[2]], [P[0] + 46, P[1], P[2]], 2 * T.cam, 64);
  for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; k.rod('Chrome trim', [P[0] + 45, P[1] + 90 * Math.sin(a), P[2] + 90 * Math.cos(a)], [P[0] + 50, P[1] + 90 * Math.sin(a), P[2] + 90 * Math.cos(a)], 22, 16); }
  k.rod(steel, [P[0] - 6, P[1], P[2]], [P[0], P[1], P[2]], 170, 48);
  k.beam(frame, [P[0] - 40, P[1], P[2] + 150], [P[0] - 40, P[1], P[2] - L - 60], 80, 80, Y);
  k.box(frame, [P[0] - 80, P[1] - 70, P[2] + 100], [P[0], P[1] + 70, P[2] + 190]);
  k.box(steel, [P[0] - 1, P[1] - 12, P[2] - 500], [P[0], P[1] + 12, P[2] - 340]);
  k.rod(frame, [P[0] - 80, P[1], P[2] - L], [P[0] - 100, P[1], P[2] - L], 70, 32);
  roller(k, [P[0] - 100, P[1], P[2] - L], [P[0] - 100 - T.roller.l, P[1], P[2] - L], T.roller.d);
  k.pop();
  const bar = T.thighBar, tA = T.thigh[p.thighPad - 1];
  k.beam(frame, [tx0 - 10, P[1] + 60, bar], [-S.w / 2 - 20, P[1] + 60, bar], 70, 70, Z);
  arcPlate(k, steel, [-60, P[1] + 60, bar], 70, 130, 6, -170, -100, 8, 12);
  k.push(swingAbout(tA, [0, P[1] + 60, bar]));
  k.beam(frame, [-40, P[1] + 60, bar], [-40, P[1] + 60 + 0, bar - 170], 50, 50, Y);
  k.pad(pads, [0, P[1] + 60, bar - 170 - 60], X, Y, S.w + 40, 220, 60, 30, 14);
  for (const s of [-1, 1]) gripHandle(k, frame, 'Rubber grips', [s * (S.w / 2 - 20), P[1] + 60, bar - 170], [s * (S.w / 2 - 10), P[1] + 70, bar - 20], 30, 110);
  k.pop();
  k.pop();
}
// ---------------------------------------------------------------- Force USA Compact Leg Press & Hack Squat (F-CLP-V4, 2027)
/** Published: 52" W × 65" D × 57" H; 30° sled on twin chrome guide rods; 35" × 29.5" footplate on a 4-notch bracket;
 * 38 lb sled; 700 lb plates + 320 lb user; lockout safety holes in the centre frame; J handles on the plate sleeves. */
export const FORCE_CLP = {
  angle: 30, rodGap: 380, rodD: 50, rodBottom: [-300, 250] as const, rodLen: 1210, sledLen: 620, rest: 220, travel: [0, 90, 180, 270, 360],
  seat: { w: 420, l: 380, t: 76 }, back: { w: 340, h: 580, t: 76 }, foot: { w: inch(35), h: inch(29.5), hinge: [-330, 330] as const, angles: [42, 48, 54, 60] },
  sleeve: 350, sleeveAt: 250,
};
export function describeForceClp(k: Kit, p: NumericParams) {
  const F = FORCE_CLP, frame = 'Matte black frame', pads = 'High-density pads', chrome = 'Chrome guide rods and sleeves', black = 'Knurled J handles', hw = 'Zinc hardware';
  k.finish(frame, f('source', '#161718', .2, .6)); k.finish(pads, f('liner', '#16171a', 0, .85)); k.finish(chrome, CHROME); k.finish(black, f('handle', '#131415', .4, .5)); k.finish(hw, ZINC);
  k.finish('Grit-coated footplate', f('source', '#1d1e20', .1, .95)); k.finish('Force logos', f('source', '#2c2d30', .1, .7)); k.finish('V-groove wheels', f('source', '#101112', .1, .6));
  k.finish('Rubber end caps', PLASTIC); k.finish('Magnetic plug pin', f('source', '#d7dadd', .95, .2)); k.finish('Pad stitching', f('liner', '#3a3b3e', 0, .8));
  const a = F.angle * Math.PI / 180, u: V3 = [0, Math.cos(a), Math.sin(a)], n: V3 = [0, -Math.sin(a), Math.cos(a)], hack = p.mode === 1;
  const axis = (s: number, x = 0, b = 0): V3 => add(add([x, F.rodBottom[0], F.rodBottom[1]], scale(u, s)), scale(n, b));
  const rearY = 760, frontY = -680, t = 76;
  // Base: rear and front lateral feet with F-badged caps, a perforated linking frame, the rear support column.
  for (const y of [rearY, frontY]) {
    k.beam(frame, [-420, y, t / 2], [420, y, t / 2], t, t, Z);
    for (const s of [-1, 1]) { k.box('Rubber end caps', [s > 0 ? 420 : -432, y - 40, 0], [s > 0 ? 432 : -420, y + 40, t + 4]); k.box('Force logos', [s > 0 ? 432 : -432.6, y - 16, 22], [s > 0 ? 432.6 : -432, y + 16, 56]); }
  }
  perforated(k, frame, [0, frontY + 38, t / 2], [0, rearY - 38, t / 2], t, t, 70, 22, Z, X);
  const top = axis(F.rodLen), bottom = axis(0), support = axis(F.rodLen - 250);
  k.beam(frame, [0, support[1], t], [0, support[1], support[2] - 40], 76, 102, Y);
  k.beam(frame, [0, support[1] + 30, t], [0, rearY - 38, t], 60, 60, Z);
  // Inclined centre frame with lockout holes, twin guide rods, top locking frame and the front angled supports.
  perforated(k, frame, axis(-40, 0, -60), axis(F.rodLen + 20, 0, -60), 76, 76, 60, 26, n, X, 120);
  for (const s of [-1, 1]) k.rod(chrome, axis(-20, s * F.rodGap / 2), axis(F.rodLen, s * F.rodGap / 2), F.rodD, 32);
  k.beam(frame, axis(F.rodLen + 10, 0, -10), axis(F.rodLen + 70, 0, -10), F.rodGap + 110, 120, n);
  k.beam(frame, axis(-60, 0, -10), axis(10, 0, -10), F.rodGap + 110, 120, n);
  for (const s of [-1, 1]) k.beam(frame, [s * 150, frontY + 40, t], add(axis(-20, s * 150, -60), [0, 0, 0]), 60, 60, X);
  k.beam(frame, [0, frontY + 60, t], axis(-40, 0, -60), 76, 76, X);
  // Plate storage: chrome pegs angled off the rear foot.
  for (const s of [-1, 1]) { const b: V3 = [s * 300, rearY - 38, t]; k.rod(chrome, b, add(b, scale([s * .3, .5, .81], 260)), 50, 32); k.rod(frame, b, add(b, [0, 0, 8]), 90, 32); }
  // Footplate: 35" × 29.5" grit plate hinged on the front bracket, set by the 4-notch plate; Force embossing.
  const fa = F.foot.angles[p.footplate - 1], hinge: V3 = [0, F.foot.hinge[0], F.foot.hinge[1]];
  for (const s of [-1, 1]) {
    k.box(frame, [s * 150 - 8, frontY - 20, t], [s * 150 + 8, hinge[1] + 20, hinge[2] + 40]);
    for (let i = 0; i < 4; i++) k.hole(frame, [s * 150 - 10, frontY + 30 + i * 45, 200 + i * 40], [s * 150 + 10, frontY + 30 + i * 45, 200 + i * 40], 22);
  }
  k.rod(frame, add(hinge, [-200, 0, 0]), add(hinge, [200, 0, 0]), 44, 24);
  k.push(rotX(90 - fa, hinge));
  k.beam(frame, add(hinge, [0, -40, 20]), add(hinge, [0, -40, F.foot.h - 80]), 60, 40, Y);
  k.pad('Grit-coated footplate', add(hinge, [0, 0, F.foot.h / 2 - 40]), X, Z, F.foot.w, F.foot.h, 10, 60);
  k.box('Force logos', add(hinge, [-160, -1, F.foot.h - 180]), add(hinge, [160, 0, F.foot.h - 130]));
  k.pop();
  const lockS = F.rest - 40;
  k.rod('Magnetic plug pin', axis(lockS, -60, -20), axis(lockS, 60, -20), 22, 16);
  k.rod('Magnetic plug pin', axis(lockS, 60, -20), axis(lockS, 90, -20), 40, 20);
  // Sled: carriage on four V-groove wheels, seat and back pad (upright for the press, reclined along the rods for the
  // hack squat with its shoulder pads), 400 mm chrome sleeves with J handles, plates.
  const s0 = F.rest + F.travel[p.sled];
  k.push(translation(scale(u, s0)));
  for (const s of [-1, 1]) {
    k.beam(frame, axis(0, s * (F.rodGap / 2 + 60), 50), axis(F.sledLen, s * (F.rodGap / 2 + 60), 50), 40, 110, n);
    for (const at of [40, F.sledLen - 40]) { k.rod('V-groove wheels', axis(at, s * F.rodGap / 2 - 22, F.rodD / 2 + 36), axis(at, s * F.rodGap / 2 + 22, F.rodD / 2 + 36), 72, 32); k.rod(hw, axis(at, s * (F.rodGap / 2 + 40), F.rodD / 2 + 36), axis(at, s * (F.rodGap / 2 + 80), F.rodD / 2 + 36), 20, 12); }
  }
  for (const at of [70, F.sledLen - 70]) k.beam(frame, axis(at, -F.rodGap / 2 - 80, 90), axis(at, F.rodGap / 2 + 80, 90), 60, 60, n);
  const sleeveRoot = axis(F.sleeveAt, 0, 150);
  k.beam(frame, [-F.rodGap / 2 - 90, sleeveRoot[1], sleeveRoot[2]], [F.rodGap / 2 + 90, sleeveRoot[1], sleeveRoot[2]], 70, 70, n);
  for (const s of [-1, 1]) {
    const root: V3 = [s * (F.rodGap / 2 + 90), sleeveRoot[1], sleeveRoot[2]];
    k.rod(frame, root, add(root, [s * 30, 0, 0]), 120, 40);
    for (let i = 0; i < 4; i++) { const q = add(add(root, [s * 31, 0, 0]), scale(frameRing(i), 40)); k.rod(hw, q, add(q, [s * 6, 0, 0]), 14, 12); }
    horn(k, chrome, s > 0 ? 'Loaded plate · left sleeve' : 'Loaded plate · right sleeve', add(root, [s * 30, 0, 0]), [s, 0, 0], F.sleeve, 50, p.plates, 70);
    const j0 = add(root, [s * 45, 0, 40]);
    bent(k, black, [j0, add(j0, [0, -20, 200]), add(j0, [s * 40, -30, 250])], 34);
    k.rod(black, add(j0, [s * 40, -30, 250]), add(j0, [s * 200, -30, 250]), 38, 24);
    k.rod(black, add(j0, [s * 200, -30, 250]), add(j0, [s * 215, -30, 250]), 48, 24);
  }
  const seatC = axis(260, 0, 290), hingeB: V3 = add(seatC, [0, F.seat.l / 2, F.seat.t]);
  k.beam(frame, axis(200, 0, 90), [0, seatC[1], seatC[2] - 10], 70, 70, X);
  k.beam(frame, axis(420, 0, 90), [0, hingeB[1] - 20, seatC[2] - 10], 70, 70, X);
  k.push(rotX(hack ? F.angle : 0, hingeB));
  k.pad(pads, seatC, X, Y, F.seat.w, F.seat.l, F.seat.t, 40, 18);
  k.box(frame, add(seatC, [-150, -150, -10]), add(seatC, [150, 150, 0]));
  k.pop();
  k.push(rotX(hack ? -(90 - F.angle) : -12, hingeB));
  k.beam(frame, add(hingeB, [0, 30, -60]), add(hingeB, [0, 30, F.back.h - 40]), 70, 50, Y);
  k.pad(pads, add(hingeB, [0, 0, F.back.h / 2 + 10]), X, Z, F.back.w, F.back.h, F.back.t, 38, 18);
  k.box('Force logos', add(hingeB, [-110, -1, F.back.h - 110]), add(hingeB, [110, 0, F.back.h - 70]));
  if (hack) for (const s of [-1, 1]) {
    const sp = add(hingeB, [s * 110, -F.back.t - 30, F.back.h - 60]);
    k.beam(frame, add(hingeB, [s * 110, 30, F.back.h - 60]), sp, 50, 50, Z);
    k.pad(pads, add(sp, [0, -45, 0]), X, [0, -1, 0], 120, 170, 110, 40, 16);
    gripHandle(k, black, black, add(sp, [s * 60, 0, 0]), add(sp, [s * 60, -10, 180]), 34, 120);
  }
  k.pop();
  k.pop();
}
const frameRing = (i: number): V3 => { const t = (i * 90 + 45) * Math.PI / 180; return [0, Math.cos(t), Math.sin(t)]; };
/** Diamond tread plate: a flat plate with a field of raised lozenges (u, v in-plane, n = u × v up). */
export function treadPlate(k: Kit, g: string, c: V3, u: V3, v: V3, w: number, l: number, t: number, pitch = 70) {
  k.pad(g, c, u, v, w, l, t, 8);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] as V3;
  for (let i = -Math.floor(w / pitch / 2) + .5; i < w / pitch / 2 - .4; i++) for (let j = -Math.floor(l / pitch / 2) + .5; j < l / pitch / 2 - .4; j++) {
    const q = add(add(c, add(scale(u, i * pitch), scale(v, j * pitch))), scale(n, t)), d = (Math.round(i + j) % 2 ? u : v);
    k.beam(g, sub(q, scale(d, 16)), add(q, scale(d, 16)), 6, 2.4, n);
  }
}
// ---------------------------------------------------------------- Titan Leg Press Hack Squat Machine (401486)
/** Published: 84" L × 40" W × 53" H; 45° carriage (80 lb) on steel alloy rails; LP footplate 21" × 15", LP back pad
 * 10.5" × 31"; HS footplate 26" × 22" (4 positions), HS back pad 20" × 15", shoulder pads 4.5" × 8" spread 7.5";
 * 11.25" weight sleeves, 11.75" storage posts, 49 mm; three lockout positions on the side handles; 1,000 lb. */
export const TITAN_LPHS = {
  angle: 45, rail: { gap: 400, w: 76, h: 100, bottom: [-480, 210] as const, len: 1500 }, carriage: 720, rest: 170, travel: [0, 120, 240, 360, 480],
  lpFoot: { w: inch(21), h: inch(15) }, lpBack: { w: inch(10.5), l: inch(31), t: 70 }, hsFoot: { w: inch(26), h: inch(22), angles: [14, 18, 22, 26] },
  hsBack: { w: inch(20), h: inch(15), t: 70 }, shoulder: { w: inch(4.5), l: inch(8), spread: inch(7.5), t: 90 }, sleeve: inch(11.25), post: inch(11.75),
};
export function describeTitanLphs(k: Kit, p: NumericParams) {
  const T = TITAN_LPHS, frame = 'Powder-coated steel frame', pads = 'HeftyGrip vinyl pads', post = 'Weight post sleeves', hw = 'Zinc hardware', tread = 'Diamond-plate footplates';
  k.finish(frame, f('source', '#1b1c1e', .2, .58)); k.finish(pads, VINYL); k.finish(post, f('source', '#18191b', .35, .45)); k.finish(hw, ZINC); k.finish(tread, f('source', '#26272a', .45, .5));
  k.finish('Rubber grips', GRIP); k.finish('Rubber feet', RUBBER); k.finish('Brass bushings', f('source', '#b48a45', .9, .35)); k.finish('Bearings', f('source', '#9da2a6', .9, .3));
  const a = T.angle * Math.PI / 180, u: V3 = [0, Math.cos(a), Math.sin(a)], n: V3 = [0, -Math.sin(a), Math.cos(a)], hack = p.mode === 1;
  const R = T.rail, rail = (s: number, x = 0, b = 0): V3 => add(add([x, R.bottom[0], R.bottom[1]], scale(u, s)), scale(n, b));
  const rearY = 980, frontY = -1000, t = 76, top = rail(R.len);
  // Base: rear foot with two vertical storage posts, spine, front cross foot; rear A-upright; top cross frame.
  k.beam(frame, [-440, rearY, t / 2], [440, rearY, t / 2], t, t, Z);
  for (const s of [-1, 1]) { k.box('Rubber feet', [s * 440 - 40, rearY - 45, 0], [s * 440 + 40, rearY + 45, 5]); k.rod(post, [s * 330, rearY, t], [s * 330, rearY, t + T.post], 49, 32); k.rod(frame, [s * 330, rearY, t], [s * 330, rearY, t + 8], 90, 32); }
  k.beam(frame, [0, frontY + 40, t / 2], [0, rearY - 38, t / 2], t, t, Z);
  k.beam(frame, [-300, -560, t / 2], [300, -560, t / 2], t, t, Z);
  for (const s of [-1, 1]) k.box('Rubber feet', [s * 300 - 40, -600, 0], [s * 300 + 40, -520, 5]);
  const upY = top[1] - 60;
  for (const s of [-1, 1]) { k.beam(frame, [s * 180, rearY - 38, t], [s * (R.gap / 2), upY, top[2] - 40], 76, 76, X); k.beam(frame, [s * 150, 380, t], [s * (R.gap / 2), upY - 40, top[2] - 120], 76, 76, X); }
  k.beam(frame, [-R.gap / 2 - 40, upY, top[2] - 60], [R.gap / 2 + 40, upY, top[2] - 60], 90, 90, Z);
  for (const s of [-1, 1]) horn(k, post, s > 0 ? 'Stored plate · left holder' : 'Stored plate · right holder', [s * (R.gap / 2 + 40), 520, 560], [s, 0, 0], inch(9), 49, 0, 80);
  // Rails, the front lower frame, side handle frames with three lockout pegs and grips.
  for (const s of [-1, 1]) k.beam(frame, rail(-20, s * R.gap / 2), rail(R.len, s * R.gap / 2), R.w, R.h, n);
  k.beam(frame, [0, R.bottom[0] - 60, t], rail(0, 0, -40), 90, 90, X);
  k.beam(frame, rail(-20, 0, -30), rail(60, 0, -30), R.gap + R.w, 90, n);
  for (const s of [-1, 1]) {
    const x = s * (R.gap / 2 + R.w / 2 + 40);
    bent(k, frame, [rail(40, x, -20), rail(80, x, 60), rail(760, x, 60), rail(820, x, 20)], 32);
    for (const at of [300, 420, 540]) k.rod(frame, rail(at, x, 60), rail(at, x - s * 70, 60), 36, 20);
    k.rod('Rubber grips', rail(84, x, 58), rail(330, x, 60), 38, 24);
  }
  // Front flip unit: HS footplate one face, LP back pad the other; hinged at the rail foot, propped by a pinned post.
  const fh: V3 = [0, R.bottom[0] - 90, 330], ua = hack ? T.hsFoot.angles[p.footplate - 1] : 52;
  k.beam(frame, [0, fh[1] - 20, t], fh, 70, 70, Y);
  k.beam(frame, [0, -900, t], [0, -900, 420], 60, 60, Y);
  k.push(rotX(-ua, fh));
  const dir: V3 = [0, -1, 0];
  k.beam(frame, add(fh, [0, -20, 0]), add(fh, [0, -840, 0]), 300, 60, Z);
  if (hack) {
    treadPlate(k, tread, add(fh, [0, -30 - T.hsFoot.h / 2, 30]), X, dir.map(v => -v) as V3, T.hsFoot.w, T.hsFoot.h, 6);
    k.pad(pads, add(fh, [0, -40 - T.lpBack.l / 2, -30]), X, Y, T.lpBack.w, T.lpBack.l, T.lpBack.t, 30, 14);
  } else {
    k.pad(pads, add(fh, [0, -40 - T.lpBack.l / 2, 30]), X, [0, -1, 0].map(v => -v) as V3, T.lpBack.w, T.lpBack.l, T.lpBack.t, 30, 14);
    k.box(tread, add(fh, [-T.hsFoot.w / 2, -30 - T.hsFoot.h, -36]), add(fh, [T.hsFoot.w / 2, -30, -30]));
  }
  k.pop();
  if (!hack) k.pad(pads, [0, R.bottom[0] - 230, 330], X, Y, 330, 300, 70, 40, 16);
  // Carriage: frame riding the rails on bearings, HS back and shoulder pads, the LP footplate that folds down over them,
  // the 11.25" weight sleeves on the top crossbar.
  const s0 = T.rest + T.travel[p.sled], L = T.carriage;
  k.push(translation(scale(u, s0)));
  for (const s of [-1, 1]) {
    k.beam(frame, rail(0, s * (R.gap / 2 - 70), R.h / 2 + 40), rail(L, s * (R.gap / 2 - 70), R.h / 2 + 40), 50, 80, n);
    for (const at of [60, L - 60]) k.rod('Bearings', rail(at, s * (R.gap / 2 - 30)), rail(at, s * (R.gap / 2 - 50)), 64, 24);
  }
  for (const at of [30, L / 2, L - 30]) k.beam(frame, rail(at, -R.gap / 2 + 40, R.h / 2 + 40), rail(at, R.gap / 2 - 40, R.h / 2 + 40), 60, 60, n);
  const face = R.h / 2 + 90;
  k.pad(pads, rail(L * .52, 0, face), X, u, T.hsBack.w, T.hsBack.h, T.hsBack.t, 36, 16);
  k.pad(pads, rail(L - 90, 0, face), X, u, 300, 110, 60, 30, 14);
  for (const s of [-1, 1]) {
    const sx = s * (T.shoulder.spread / 2 + T.shoulder.w / 2);
    k.beam(frame, rail(L - 50, sx, face - 30), rail(L - 50, sx, face + T.shoulder.l), 60, 40, u);
    k.pad(pads, rail(L - 40, sx, face + T.shoulder.l / 2 + 10), X, n, T.shoulder.w, T.shoulder.l, T.shoulder.t, 30, 14);
    gripHandle(k, frame, 'Rubber grips', rail(L - 40, s * (T.shoulder.spread / 2 + T.shoulder.w + 40), face + 60), rail(L - 40, s * (T.shoulder.spread / 2 + T.shoulder.w + 40), face + 260), 32, 120);
  }
  k.beam(frame, rail(L * .5 - 190, 0, face + 90), rail(L * .5 + 60, 0, face + 90), 40, 30, X);
  // LP footplate: hinged at the carriage foot, raised square to the rails for the press (folded flat against the rails
  // for the hack squat), with its lifting handle.
  const hingeF = rail(30, 0, R.h / 2 + 60);
  k.rod(frame, add(hingeF, [-T.lpFoot.w / 2, 0, 0]), add(hingeF, [T.lpFoot.w / 2, 0, 0]), 30, 20);
  if (!hack) {
    treadPlate(k, tread, add(hingeF, scale(n, T.lpFoot.h / 2 + 10)), X, n, T.lpFoot.w, T.lpFoot.h, 8);
    for (const s of [-1, 1]) k.beam(frame, add(hingeF, [s * 200, 0, 0]), add(add(hingeF, scale(n, T.lpFoot.h - 20)), [s * 200, 0, 0]), 40, 40, u);
    bent(k, frame, [add(add(hingeF, scale(n, T.lpFoot.h + 10)), [-120, 0, 0]), add(add(hingeF, scale(n, T.lpFoot.h + 70)), [-100, 0, 0]), add(add(hingeF, scale(n, T.lpFoot.h + 70)), [100, 0, 0]), add(add(hingeF, scale(n, T.lpFoot.h + 10)), [120, 0, 0])], 26);
  }
  const bar = rail(L - 150, 0, face + 160);
  k.beam(frame, rail(L - 150, 0, R.h / 2 + 60), bar, 80, 60, X);
  k.rod(frame, add(bar, [-R.gap / 2 - 30, 0, 0]), add(bar, [R.gap / 2 + 30, 0, 0]), 60, 32);
  for (const s of [-1, 1]) horn(k, post, s > 0 ? 'Loaded plate · left sleeve' : 'Loaded plate · right sleeve', add(bar, [s * (R.gap / 2 + 30), 0, 0]), [s, 0, 0], T.sleeve, 49, p.plates, 86);
  k.pop();
}
// ---------------------------------------------------------------- Temple of Gainz THE QUADSEND 37.5° Leg Press + Hack Squat
/** Published: 99.3" L × 56.2" H; 32.5" frame, 42.3" disengagement handles, 57.3" storage horns, 66.2" standard or
 * 50.2" "Shorty" weight horn, 50.8" band pegs; LP footplate 30.5" × 22" (notched), HS footplate 36" × 24"; 37.5° sled. */
export const TOG_QUADSEND = {
  angle: 37.5, rail: { gap: 560, w: 90, h: 90, bottom: [-560, 190] as const, len: 1780 }, sled: 760, rest: 140, travel: [0, 150, 300, 450, 600],
  lpFoot: { w: inch(30.5), h: inch(22) }, hsFoot: { w: inch(36), h: inch(24) }, horn: [inch(66.2), inch(50.2)], storage: inch(57.3), handles: inch(42.3), pegs: inch(50.8), frame: inch(32.5),
};
export function describeTogQuadsend(k: Kit, p: NumericParams) {
  const Q = TOG_QUADSEND, frame = 'Satin black frame', panel = 'Laser-cut side panels', pads = 'Black vinyl pads', chrome = 'Chrome horns and handles', hw = 'Zinc hardware', grit = 'Grip-tape footplates';
  k.finish(frame, f('source', '#161719', .25, .5)); k.finish(panel, f('source', '#1b1c1e', .25, .55)); k.finish(pads, f('liner', '#131415', 0, .88)); k.finish(chrome, CHROME); k.finish(hw, ZINC);
  k.finish(grit, f('source', '#1f2022', .05, .95)); k.finish('Logo inlay', f('source', '#d9dbdd', .6, .35)); k.finish('Knurled aluminium grips', f('handle', '#b8bcc0', .85, .4)); k.finish('Rubber feet', RUBBER);
  k.finish('Exercise placard', f('source', '#e6e6e1', 0, .6)); k.finish('Linear bearings', f('source', '#a4a8ac', .9, .3));
  const a = Q.angle * Math.PI / 180, u: V3 = [0, Math.cos(a), Math.sin(a)], n: V3 = [0, -Math.sin(a), Math.cos(a)], hack = p.mode === 1;
  const R = Q.rail, rail = (s: number, x = 0, b = 0): V3 => add(add([x, R.bottom[0], R.bottom[1]], scale(u, s)), scale(n, b)), top = rail(R.len);
  const half = Q.frame / 2, rearY = top[1] + 120, frontY = -1215, t = 76;
  // Base rails (frame footprint 32.5"), front and rear feet, triangular side panels with the logo, rails and top frame.
  for (const s of [-1, 1]) {
    perforated(k, frame, [s * (half - t / 2), frontY, t / 2], [s * (half - t / 2), rearY, t / 2], t, t, 120, 18, Z, X, 60);
    k.box('Rubber feet', [s * (half - t / 2) - 60, frontY - 20, 0], [s * (half - t / 2) + 60, frontY + 100, 4]);
    k.box('Rubber feet', [s * (half - t / 2) - 60, rearY - 100, 0], [s * (half - t / 2) + 60, rearY + 20, 4]);
    const x = s * (R.gap / 2 + R.w / 2 + 3), lo = rail(420, 0, -R.h / 2), hi = rail(R.len - 40, 0, -R.h / 2);
    k.polygon(panel, [x - 3, 0, 0], Y, Z, [[lo[1], t], [rearY - 70, t], [rearY - 70, hi[2] - 40], [hi[1], hi[2]], [lo[1], lo[2]]], 6);
    k.polygon('Logo inlay', [s > 0 ? x + 3 : x - 3.6, 0, 0], Y, Z, [[top[1] - 720, 560], [top[1] - 520, 900], [top[1] - 320, 560]], .6);
    k.beam(frame, [x, rearY - 60, t], [x, top[1] - 20, top[2] - 60], 80, 80, Y);
  }
  for (const y of [frontY + 50, -300, rearY - 50]) k.beam(frame, [-half + 1, y, t / 2], [half - 1, y, t / 2], t - 2, t, Z);
  for (const s of [-1, 1]) k.beam(frame, rail(-30, s * R.gap / 2), rail(R.len, s * R.gap / 2), R.w, R.h, n);
  k.beam(frame, rail(R.len - 20, 0, 0), rail(R.len + 60, 0, 0), R.gap + R.w, 110, n);
  k.box('Exercise placard', rail(R.len - 60, -150, 56), add(rail(R.len - 60, 150, 56), [0, 12, 110]));
  // Storage horns (five a side on the panels), band pegs, disengagement handles along the rails.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) { const q: V3 = [s * (R.gap / 2 + R.w + 6), top[1] - 120 - i * 70, 380 + i * 190]; k.rod(chrome, q, add(q, [s * (Q.storage / 2 - R.gap / 2 - R.w - 6), 0, 0]), 50, 32); }
    for (let i = 0; i < 3; i++) { const q: V3 = [s * half, 200 + i * 90, 110]; k.rod(frame, q, add(q, [s * (Q.pegs / 2 - half), 0, 0]), 22, 16); }
    const hx = s * (Q.handles / 2 - 20);
    bent(k, chrome, [rail(80, s * (R.gap / 2 + R.w / 2), 20), rail(80, hx, 40), rail(900, hx, 40), rail(900, s * (R.gap / 2 + R.w / 2), 20)], 30);
    k.rod('Knurled aluminium grips', rail(100, hx, 40), rail(320, hx, 40), 36, 24);
  }
  // Front: reclining leg-press seat and back pad with handles; the hack-squat footplate frame swings down over it.
  const seatH: V3 = [0, -850, 470];
  k.beam(frame, [0, frontY + 60, t], [0, -700, 420], 90, 90, X);
  k.beam(frame, [0, -560, t], [0, -560, 380], 80, 80, Y);
  k.pad(pads, [0, -740, 420], X, Y, 400, 340, 80, 40, 18);
  k.push(rotX(90 - 38, seatH));
  k.beam(frame, add(seatH, [0, -120, 0]), add(seatH, [0, -120, 780]), 70, 60, Y);
  k.pad(pads, add(seatH, [0, -10, 410]), X, Z, 420, 820, 90, 44, 18);
  for (const s of [-1, 1]) gripHandle(k, frame, 'Knurled aluminium grips', add(seatH, [s * 60, -120, 120]), add(seatH, [s * 330, -140, 160]), 34, 110);
  k.pop();
  if (hack) {
    const fh: V3 = [0, -470, 330];
    k.push(rotX(90 - 50, fh));
    k.beam(frame, add(fh, [0, -40, 0]), add(fh, [0, -40, Q.hsFoot.h]), Q.hsFoot.w + 60, 50, Y);
    k.pad(grit, add(fh, [0, -10, Q.hsFoot.h / 2]), X, Z, Q.hsFoot.w, Q.hsFoot.h, 8, 14);
    k.pop();
  }
  // Sled on linear bearings: LP footplate (leg press) or back pad + shoulder pads (hack squat); U-bracket weight horn.
  const s0 = Q.rest + Q.travel[p.sled], L = Q.sled, face = R.h / 2 + 60;
  k.push(translation(scale(u, s0)));
  for (const s of [-1, 1]) { k.beam(frame, rail(0, s * (R.gap / 2 - 60), R.h / 2 + 20), rail(L, s * (R.gap / 2 - 60), R.h / 2 + 20), 60, 60, n); for (const at of [80, L - 80]) k.beam('Linear bearings', rail(at - 60, s * R.gap / 2, R.h / 2 + 10), rail(at + 60, s * R.gap / 2, R.h / 2 + 10), R.w + 20, 26, n); }
  for (const at of [40, L - 40]) k.beam(frame, rail(at, -R.gap / 2 + 30, R.h / 2 + 20), rail(at, R.gap / 2 - 30, R.h / 2 + 20), 60, 60, n);
  if (hack) {
    k.pad(pads, rail(L * .45, 0, face), X, u, 440, 560, 80, 40, 18);
    for (const s of [-1, 1]) { k.beam(frame, rail(L - 40, s * 130, face - 20), rail(L - 40, s * 130, face + 220), 60, 40, u); k.pad(pads, rail(L - 30, s * 130, face + 120), X, n, 130, 220, 110, 36, 16); }
  } else {
    k.polygon(grit, rail(40, 0, face), X, n, [[-Q.lpFoot.w / 2, 0], [-60, 0], [-60, 90], [60, 90], [60, 0], [Q.lpFoot.w / 2, 0], [Q.lpFoot.w / 2, Q.lpFoot.h], [-Q.lpFoot.w / 2, Q.lpFoot.h]], 12);
    for (const s of [-1, 1]) k.beam(frame, rail(60, s * 200, face), rail(60, s * 200, face + Q.lpFoot.h - 40), 60, 50, u);
    k.beam(frame, rail(L * .45, 0, face - 10), rail(80, 0, face + Q.lpFoot.h - 60), 60, 60, X);
  }
  const hb = rail(L - 30, 0, face + 330), hornLen = Q.horn[p.horn] ?? Q.horn[0];
  for (const s of [-1, 1]) k.beam(frame, rail(L - 30, s * 150, R.h / 2 + 40), add(hb, [s * 150, 0, 0]), 70, 70, X);
  k.rod(frame, add(hb, [-190, 0, 0]), add(hb, [190, 0, 0]), 70, 32);
  for (const s of [-1, 1]) horn(k, chrome, s > 0 ? 'Loaded plate · left horn' : 'Loaded plate · right horn', add(hb, [s * 190, 0, 0]), [s, 0, 0], hornLen / 2 - 190, 50, p.plates, 90);
  k.pop();
}
// ---------------------------------------------------------------- RitFit PLC01 Leg Extension Curl Machine
/** Published: 50.9" L × 43.5" W × 42.7" H; 13.01" weight holder; 16.54" leg stop; 4 backrest angles and 12 range
 * positions; 3:2 cable ratio; rear 2" plate storage post; 375 lb plates. Lever, dial and load on the user's right. */
export const RITFIT_PLC01 = {
  seat: { w: 330, l: 420, t: 64, top: 548 }, back: { w: 290, h: 600, t: 64 }, roller: { l: inch(16.54), d: 110 }, holder: inch(13.01),
  pivot: [258, -52, 690] as V3, lever: 440, drum: 70, idler: [258, 50, 800] as V3, loadPivot: [214, -70, 175] as V3, loadArm: 560,
  backAngles: [80, 70, 60, 0], loadRest: -112, rep: { extension: [8, 50, 92], curl: [96, 150, 196] },
  colors: [['Black', '#161719'], ['Pink', '#e2477e']] as const,
};
export function describeRitfitPlc01(k: Kit, p: NumericParams) {
  k.push(MIRROR_X);
  const R = RITFIT_PLC01, frame = 'Matte black steel frame', pads = 'Upholstered pads', chrome = 'Chrome weight holder', hw = 'Zinc hardware';
  const upholstery = R.colors[p.color]?.[1] ?? '#161719';
  k.finish(frame, f('source', '#18191b', .15, .62)); k.finish(pads, f('liner', upholstery, 0, .82)); k.finish('Foam roller pads', f('liner', upholstery, 0, .78)); k.finish(chrome, CHROME); k.finish(hw, ZINC);
  k.finish('Roller end caps', f('source', '#141516', .1, .6)); k.finish('Steel dial', f('source', '#b9bdc1', .95, .22)); k.finish('Pulley', f('source', '#c5c8cc', .9, .3)); k.finish('Steel cable', f('source', '#2a2b2d', .6, .4));
  k.finish('Rubber grips', GRIP); k.finish('Plastic foot caps', PLASTIC); k.finish('RitFit logo', f('source', '#f4f4f2', 0, .5)); k.finish('RitFit badge', f('source', '#c8202b', 0, .5));
  const S = R.seat, P = R.pivot, front = -250, mid = 380, rearY = 950, rail = 50, xs = [-250, 220] as const;
  // Base: two long rails, three lateral feet with tapered end caps; front tower on the load-side rail.
  for (const x of xs) k.beam(frame, [x, front + 40, rail / 2], [x, rearY - 40, rail / 2], 50, rail, Z);
  for (const y of [front, mid, rearY]) {
    const [a, b] = y === mid ? [-250, 220] : [-528, 528];
    k.beam(frame, [a, y, rail / 2], [b, y, rail / 2], 70, rail, Z);
    if (y !== mid) { footCap(k, 'Plastic foot caps', 'Plastic foot caps', [a, y, rail / 2], [-1, 0, 0], 70, rail, 80); footCap(k, 'Plastic foot caps', 'Plastic foot caps', [b, y, rail / 2], X, 70, rail, 80); }
  }
  k.box('RitFit badge', [-60, rearY - 35.6, 12], [60, rearY - 35, 38].map((v, i) => i === 1 ? rearY - 35 : v) as V3);
  k.beam(frame, [xs[1], P[1] + 60, rail], [xs[1], P[1] + 60, P[2] + 40], 60, 80, Y);
  k.beam(frame, [xs[1], P[1] + 60, 420], [0, 150, 420], 50, 50, Z);
  // Plate storage post at the rear, seat posts, seat, and the knee bolster roller across the seat front.
  k.rod(frame, [0, rearY - 60, rail], [0, rearY - 60, rail + 290], 48, 32); k.rod(frame, [0, rearY - 60, rail], [0, rearY - 60, rail + 6], 100, 32);
  for (const y of [120, 640]) k.beam(frame, [0, y, rail], [0, y, S.top - S.t - 40], 70, 70, Y);
  k.beam(frame, [0, 60, S.top - S.t - 20], [0, 700, S.top - S.t - 20], 70, 40, Z);
  k.pad(pads, [0, S.l / 2 + 20, S.top - S.t], X, Y, S.w, S.l, S.t, 26, 14);
  roller(k, [-S.w / 2 - 20, 30, S.top + 38], [S.w / 2 + 20, 30, S.top + 38], 100, { foam: 'Foam roller pads' });
  // Back pad: bench-style hinge at the seat rear with a 4-hole angle ladder (the last setting lies flat for prone curls).
  const back = p.mode === 1 ? 0 : R.backAngles[p.back - 1], ladder = back === 0 ? 0 : 1, hinge: V3 = [0, S.l + 50 + (ladder ? 0 : R.back.t), ladder ? S.top - S.t : S.top];
  k.push(rotX(-(90 - back), hinge));
  k.beam(frame, [0, hinge[1] + 20, hinge[2] - 10], [0, hinge[1] + 20, hinge[2] + R.back.h - 60], 50, 40, Y);
  k.pad(pads, [0, hinge[1] + 44 - 44, hinge[2] + 20 + R.back.h / 2 - 20], X, Z, R.back.w, R.back.h, R.back.t, 28, 14);
  k.box('RitFit logo', [-70, hinge[1] - 64 - .6, hinge[2] + R.back.h - 250], [70, hinge[1] - 64, hinge[2] + R.back.h - 110]);
  k.pop();
  if (ladder) k.beam(frame, [0, 680, S.top - S.t - 30], add(hinge, scale([0, Math.cos(back * Math.PI / 180), Math.sin(back * Math.PI / 180)], 260)), 40, 30, X);
  // Handles: bent front grips beside the seat and rear grips hanging behind for prone curls.
  for (const s of [-1, 1]) {
    bent(k, frame, [[s * 30, 90, S.top - S.t - 40], [s * (S.w / 2 + 30), 90, S.top - S.t - 40], [s * (S.w / 2 + 50), 300, S.top - S.t + 20]], 32);
    gripHandle(k, frame, 'Rubber grips', [s * (S.w / 2 + 50), 300, S.top - S.t + 20], [s * (S.w / 2 + 50), 420, S.top - S.t + 40], 32, 100);
    bent(k, frame, [[s * 30, 690, S.top - S.t - 30], [s * 180, 780, S.top - S.t - 30], [s * 200, 780, S.top - S.t - 130]], 32);
    gripHandle(k, frame, 'Rubber grips', [s * 200, 780, S.top - S.t - 130], [s * 200, 790, S.top - S.t - 300], 32, 140);
  }
  // Knee pivot: 12-hole steel dial, drum, leg arm and the 16.54" roller; pulley bracket on the tower top; cable to the
  // plate lever, whose chrome 13.01" holder sits under the seat (3:2 ratio from the drum/lever lengths).
  const legA = R.rep[p.mode === 1 ? 'curl' : 'extension'][p.rep], turn = legA - R.rep.extension[0], dx = xs[1] + 44;
  k.rod(frame, [xs[1] + 30, P[1], P[2]], [dx + 90, P[1], P[2]], 36, 24);
  k.push(swingAbout(legA, P));
  dial(k, 'Steel dial', [dx, P[1], P[2]], 280, 5, 12, 112, 16, -200, -20);
  k.rod('Pulley', [dx + 5, P[1], P[2]], [dx + 30, P[1], P[2]], 2 * R.drum, 40);
  k.beam(frame, [dx + 58, P[1], P[2] + 20], [dx + 58, P[1], P[2] - R.lever - 30], 50, 50, Y);
  k.rod(frame, [dx + 33, P[1], P[2] - R.lever], [xs[1] + 4, P[1], P[2] - R.lever], 32, 24);
  roller(k, [xs[1] + 4, P[1], P[2] - R.lever], [xs[1] + 4 - R.roller.l, P[1], P[2] - R.lever], R.roller.d);
  knob(k, hw, [dx + 58, P[1], P[2] - 112], X, 22, 30);
  k.pop();
  k.box(frame, [xs[1] - 30, R.idler[1] - 70, P[2] + 40], [dx + 60, R.idler[1] + 50, P[2] + 48]);
  k.box(frame, [dx + 4, R.idler[1] - 45, P[2] + 48], [dx + 8, R.idler[1] + 45, R.idler[2] + 45]);
  k.box(frame, [dx + 34, R.idler[1] - 45, P[2] + 48], [dx + 38, R.idler[1] + 45, R.idler[2] + 45]);
  pulley(k, 'Pulley', undefined, [dx + 21, R.idler[1], R.idler[2]], X, 90, 22);
  const H = R.loadPivot, loadA = cableLever(H, R.loadArm, R.idler, R.loadRest, R.drum * 1.5, turn), q = add(H, scale(swing(loadA), R.loadArm - 90));
  k.cable('Steel cable', [[dx + 17, P[1] + R.drum * .6, P[2] + R.drum * .8], [dx + 17, R.idler[1] - 30, R.idler[2] + 36], [dx + 17, R.idler[1] + 44, R.idler[2] - 8], [dx + 17, q[1], q[2] + 40]], 5);
  k.rod(hw, [dx + 17, q[1], q[2] + 40], [dx + 17, q[1], q[2] + 80], 14, 12);
  k.push(swingAbout(loadA - R.loadRest, H));
  const end: V3 = add(H, scale(swing(R.loadRest), R.loadArm));
  k.beam(frame, [H[0], H[1] - 30, H[2]], end, 50, 50, X);
  k.beam(frame, [H[0] + 20, lerp(H, end, .8)[1], lerp(H, end, .8)[2]], [dx + 17, lerp(H, end, .8)[1], lerp(H, end, .8)[2]], 30, 30, Z);
  k.rod(frame, [H[0] + 25, end[1], end[2]], [H[0] - 25, end[1], end[2]], 70, 32);
  horn(k, chrome, 'Loaded plate', [H[0] - 25, end[1], end[2]], [-1, 0, 0], R.holder, 50, p.plates, 70);
  k.pop();
  k.rod(frame, [H[0] - 30, H[1], H[2]], [xs[1] + 30, H[1], H[2]], 40, 24);
  k.pop();
}
