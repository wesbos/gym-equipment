/** Reusable cable-machine components for the stand-alone cable tower family: selector stacks, pulley carriages,
 * swivel pulleys, handles and lat bars. All take the family kit (parts/cable-towers-kit.ts) and add named material groups. */
import type { Vec3 } from '../types.ts';
import { MAT, mat, type Mat, type TowerKit } from './cable-towers-kit.ts';
/** Weight-label stripe colours used by most stack makers (light → heavy). */
export const STRIPE = { green: '#2f9a4a', yellow: '#e2c12a', red: '#c8302c', teal: '#2aa39b', blue: '#2f6fd0', white: '#e9e8e3', orange: '#e0701e' } as const;
export interface StackSpec {
  /** Stack centre in plan and bottom of the lowest plate. */
  x: number; y: number; z0: number;
  /** Plate size across X, along Y, and thickness (plus visual gap). */
  w: number; d: number; t: number; gap?: number;
  /** Plates below the top (head) plate. */
  n: number;
  /** Head (top) plate height; it carries the selector stem and cable bolt. */
  head: number;
  /** Face that carries the weight labels and takes the pin. */
  face: '-x' | '+x' | '-y' | '+y';
  /** Guide rods: spacing along the plate's long side, diameter, top z. */
  rodSep: number; rodD: number; rodTop: number; rodAxis?: 'x' | 'y';
  /** Pin setting: 0 = head plate only, i = pin under plate i (1-based from the top). */
  pin: number;
  /** Stripe colour per plate (1-based from the top). */
  stripe: (i: number) => string;
  plate?: Mat; pinKnob?: string;
  /** Rubber bumpers under the stack, height. */
  bumper?: number;
  /** Width of the printed weight-label strip, centred on the pin (default 38% of the face, at most 110 mm). */
  labelW?: number;
}
/** Selectorized stack at rest on its bumpers: plates, label strips, guide rods, selector stem and the magnetic pin at `pin`.
 * Returns z of the head plate top (cable / top-pulley attachment). */
export function weightStack(t: TowerKit, s: StackSpec) {
  const gap = s.gap ?? 1.2, pitch = s.t + gap, plateMat = s.plate ?? MAT.stack, along = s.rodAxis ?? (s.d >= s.w ? 'y' : 'x');
  const bump = s.bumper ?? 0, z0 = s.z0 + bump;
  const top = z0 + s.n * pitch + s.head;
  // Plates from the bottom (i = n) up; plate i (1-based from the top) sits at zi.
  const zOf = (i: number) => z0 + (s.n - i) * pitch;
  for (let i = 1; i <= s.n; i++) t.add(plateMat, t.rbox([s.x, s.y], s.w, s.d, zOf(i), zOf(i) + s.t, 4));
  t.add(plateMat, t.rbox([s.x, s.y], s.w, s.d, z0 + s.n * pitch, top, 6));
  // Label strips and stripe chips on the pin face.
  const [ax, sign] = [s.face[1] as 'x' | 'y', s.face[0] === '-' ? -1 : 1];
  const faceAt = ax === 'x' ? s.x + sign * s.w / 2 : s.y + sign * s.d / 2, span = ax === 'x' ? s.d : s.w;
  const chip = (i: number, u0: number, u1: number, z: number, h: number, depth: number, m: Mat) => {
    const a = faceAt, b = faceAt + sign * depth;
    t.add(m, ax === 'x' ? t.box([Math.min(a, b), (ax === 'x' ? s.y : s.x) + u0, z], [Math.max(a, b), (ax === 'x' ? s.y : s.x) + u1, z + h])
      : t.box([s.x + u0, Math.min(a, b), z], [s.x + u1, Math.max(a, b), z + h]));
  };
  for (let i = 1; i <= s.n; i++) {
    const z = zOf(i) + s.t * .22, h = s.t * .56;
    const lw = s.labelW ?? Math.min(110, span * .38);
    chip(i, -lw / 2, lw / 2, z, h, .6, MAT.label);
    chip(i, -lw / 2 - 9, -lw / 2 - 3, z, h, .8, mat(`Stack stripe · ${s.stripe(i)}`, s.stripe(i), 0, .55));
  }
  // Guide rods and base bumpers.
  for (const e of [-1, 1]) {
    const c: Vec3 = along === 'y' ? [s.x, s.y + e * s.rodSep / 2, 0] : [s.x + e * s.rodSep / 2, s.y, 0];
    t.add(MAT.chrome, t.cyl('z', s.z0, s.rodTop, s.rodD, c, 20));
    if (bump) t.add(MAT.rubber, t.cyl('z', s.z0, s.z0 + bump, s.rodD + 22, c, 20));
  }
  // Selector stem down the centre (exposed above the head plate) and the pin.
  const pinZ = s.pin > 0 ? zOf(s.pin) + s.t / 2 : top - s.head / 2;
  t.add(MAT.chrome, t.cyl('z', pinZ - 20, top + 55, 16, [s.x, s.y, 0], 16));
  const out = sign * (ax === 'x' ? s.w : s.d) / 2, pinLen = 70;
  const p0: Vec3 = ax === 'x' ? [s.x, s.y, pinZ] : [s.x, s.y, pinZ], p1: Vec3 = ax === 'x' ? [s.x + out + sign * pinLen, s.y, pinZ] : [s.x, s.y + out + sign * pinLen, pinZ];
  t.add(MAT.stainless, t.rod(p0, p1, 9, 12));
  const k0: Vec3 = ax === 'x' ? [p1[0] - sign * 4, s.y, pinZ] : [s.x, p1[1] - sign * 4, pinZ], k1: Vec3 = ax === 'x' ? [p1[0] + sign * 22, s.y, pinZ] : [s.x, p1[1] + sign * 22, pinZ];
  t.add(mat('Selector pin knob', s.pinKnob ?? '#1b1c1e', .1, .5), t.rod(k0, k1, 26, 20));
  return top;
}
/** Swivel pulley at a cable exit: a yoke on a vertical swivel, sheave facing `dir` (unit, horizontal), carabiner ring below.
 * `at` is the swivel axis top. Returns the carabiner eye position. */
export function swivelPulley(t: TowerKit, at: Vec3, dir: Vec3, dia = 90, frame: Mat = mat('Black pulley housings', '#1d1e20', .2, .5), sheaveMat: Mat = MAT.nylon) {
  const [x, y, z] = at, R = dia / 2, off = R * .55, c: Vec3 = [x + dir[0] * off, y + dir[1] * off, z - R - 14];
  t.add(MAT.zinc, t.cyl('z', z - 18, z, 16, at, 14));
  // Side plates of the yoke (perpendicular to the sheave axis, which runs across `dir`).
  const axis: Vec3 = [-dir[1], dir[0], 0];
  for (const e of [-1, 1]) {
    const o: Vec3 = [c[0] + axis[0] * e * 15, c[1] + axis[1] * e * 15, c[2]];
    t.add(frame, t.hull([t.rod([o[0] - axis[0] * 2, o[1] - axis[1] * 2, o[2]], [o[0] + axis[0] * 2, o[1] + axis[1] * 2, o[2]], dia + 14, 28), t.cbox([x + axis[0] * e * 15, y + axis[1] * e * 15, z - 16], [6, 6, 6])]));
  }
  t.add(sheaveMat, t.sheave(c, axis, dia, 22));
  t.add(MAT.zinc, t.rod([c[0] - axis[0] * 22, c[1] - axis[1] * 22, c[2]], [c[0] + axis[0] * 22, c[1] + axis[1] * 22, c[2]], 12, 12));
  const exit: Vec3 = [c[0] + dir[0] * (R + 4), c[1] + dir[1] * (R + 4), c[2] - 6];
  return exit;
}
/** Cable end: stop ball, swivel eye and carabiner hanging from `at`; returns the carabiner bottom. */
export function cableEnd(t: TowerKit, at: Vec3, drop = 70) {
  const [x, y, z] = at;
  t.add(mat('Rubber cable stop balls', '#18191a', 0, .8), t.cyl('z', z - 34, z, 34, at, 20));
  t.add(MAT.zinc, t.cyl('z', z - 60, z - 34, 10, at, 12));
  const cz = z - 60;
  t.add(MAT.stainless, t.hull([t.cyl('y', y - 3, y + 3, 16, [x, 0, cz - 8], 12), t.cyl('y', y - 3, y + 3, 16, [x, 0, cz - drop + 8], 12)]));
  return [x, y, cz - drop] as Vec3;
}
/** Nylon strap D-handle hanging from `at`: strap loop, steel triangle and a foam-covered grip along X. */
export function dHandle(t: TowerKit, at: Vec3, strap = 300, grip = 120, gripMat: Mat = MAT.foam) {
  const [x, y, z] = at, gz = z - strap, apex = Math.min(z, gz + 60);
  if (z - gz > 24) t.add(MAT.strap, t.box([x - 14, y - 2, gz + 20], [x + 14, y + 2, z]));
  t.add(MAT.stainless, t.rod([x, y, apex], [x - grip / 2 - 8, y, gz], 8, 10), t.rod([x, y, apex], [x + grip / 2 + 8, y, gz], 8, 10));
  t.add(gripMat, t.cyl('x', x - grip / 2, x + grip / 2, 32, [0, y, gz], 20));
  return gz - 16;
}
/** Lat bar hanging below `at` (cable swivel): straight centre with ends bent down `drop` over `bend`; its X extent is exactly `L`. */
export function latBar(t: TowerKit, at: Vec3, L: number, bend = 180, drop = 80, d = 28, m: Mat = MAT.chrome, gripMat: Mat = MAT.foam) {
  const [x, y, z] = at, zc = z - 40, gd = d + 5, a = Math.atan2(drop, bend), half = L / 2 - gd / 2 * Math.sin(a);
  t.add(MAT.zinc, t.cyl('z', zc, z, 12, at, 12));
  t.add(m, t.cyl('x', x - half + bend, x + half - bend, d, [0, y, zc], 24));
  for (const e of [-1, 1]) {
    const a0: Vec3 = [x + e * (half - bend), y, zc], b: Vec3 = [x + e * half, y, zc - drop];
    t.add(m, t.rod(a0, b, d, 24));
    const g0: Vec3 = [a0[0] + (b[0] - a0[0]) * .25, y, a0[2] + (b[2] - a0[2]) * .25];
    t.add(gripMat, t.rod(g0, b, gd, 24));
  }
  return zc - drop;
}
