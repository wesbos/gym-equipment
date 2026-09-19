/** Safety squat, cambered and specialty squat bars. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 *
 * Each product is described once as ideal prims (specialty-bars-geometry.ts) in the worn frame; the floor pose (the
 * stable roll on the floor), footprint and shaft-axis height all derive from those prims, and the builder meshes
 * the same prims. Dimensions and estimates: rack-generator/research/specialty-bars.md. */
import { defineFloorPart, type FloorBox, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import type { MaterialRole } from '../appearance.ts';
import {
  FOAM, RUBBER, STEEL, add, box, cross, hull, inch, mul, norm, restPose, rod, rrect, slab, tube, xblock, xrod,
  type Prim, type RestPose, type V2, type V3,
} from './specialty-bars-geometry.ts';

export interface Finish { color: string; metalness: number; roughness: number; role: MaterialRole }
export type Palette = Record<string, Finish>;
const f = (color: string, metalness: number, roughness: number, role: MaterialRole = 'source'): Finish => ({ color, metalness, roughness, role });
const CHROME = f('#dde2e6', 1, .15, 'sleeve'), VINYL = f('#151617', 0, .72), WHITE = f('#eceae4', 0, .6);

// ---------------------------------------------------------------- safety squat bars (yoke pad, arms, handles, S-camber)
export interface SsbSpec {
  length: number; shaft: number; /** Straight rackable shaft between the camber bends */ between: number;
  /** Camber: vertical drop, forward tilt of the camber plane (deg), bend radius */ drop: number; tilt: number; bendR: number;
  collar: { len: number; d: number }; bearing?: { len: number; d: number }; sleeve: { d: number; len: number }; cap: { len: number; d: number };
  pad: { len: number; h: number; d: number; round: number; y: number; z: number };
  arms: { x: number; w: number; t: number; len: number; tilt: number; round: number };
  logos: { at: 'front' | 'top' | 'arm'; w: number; h: number; mat: string; dx?: number; dz?: number }[];
}
const FWD = (tilt: number): V3 => [0, -Math.sin(tilt), -Math.cos(tilt)]; // arm/handle direction: down, tilted forward
const PERP = (tilt: number): V3 => [0, -Math.cos(tilt), Math.sin(tilt)]; // forward, perpendicular to FWD in YZ
const rad = (deg: number) => deg * Math.PI / 180;

/** S-camber: straight shaft → arc → straight at α → arc → straight, from x = c to c + run, offset by `o` (YZ).
 * Returns the dense centreline for one side (sx = ±1) with short straight leads into the shaft and the collar. */
export function camberPath(c: number, run: number, o: V3, R: number, sx: number): V3[] {
  const Q = Math.hypot(o[1], o[2]), q = norm(o), P = run;
  const g = (a: number) => 2 * R * (1 - Math.cos(a)) + (P - 2 * R * Math.sin(a)) * Math.tan(a) - Q;
  let lo = 1e-6, hi = Math.min(Math.PI / 2 - 1e-6, P > 2 * R ? Math.PI / 2 - 1e-6 : Math.asin(P / (2 * R)));
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (g(m) > 0) hi = m; else lo = m; }
  const a = (lo + hi) / 2, straight = (P - 2 * R * Math.sin(a)) / Math.cos(a);
  if (!(straight >= 0)) throw Error('Camber bend radius too large for its run.');
  const pts: V2[] = [[-12, 0], [0, 0]];
  for (let i = 1; i <= 16; i++) { const t = a * i / 16; pts.push([R * Math.sin(t), R * (1 - Math.cos(t))]); }
  const e = pts.at(-1)!; for (let i = 1; i <= 8; i++) pts.push([e[0] + Math.cos(a) * straight * i / 8, e[1] + Math.sin(a) * straight * i / 8]);
  for (let i = 15; i >= 0; i--) { const t = a * i / 16; pts.push([P - R * Math.sin(t), Q - R * (1 - Math.cos(t))]); }
  pts.push([P + 6, Q]);
  return pts.map(([p, s]) => add([sx * (c + p), 0, 0], mul(q, s)));
}
/** Sleeve assembly on the axis through `at` (YZ), from x0 outward to the bar end. */
function sleeves(out: Prim[], x0: number, end: number, at: V2, s: Pick<SsbSpec, 'collar' | 'bearing' | 'sleeve' | 'cap'>, mats = { collar: 'collar', sleeve: 'sleeve', cap: 'cap' }) {
  for (const sx of [-1, 1]) {
    const X = (v: number) => sx * v, [y, z] = at;
    out.push(xrod('Sleeve collars', mats.collar, X(x0 - 2), X(x0 + s.collar.len), s.collar.d / 2, y, z));
    let x = x0 + s.collar.len;
    if (s.bearing) { out.push(xrod('Bearing seal rings', 'bearing', X(x), X(x + s.bearing.len), s.bearing.d / 2, y, z)); x += s.bearing.len; }
    out.push(xrod('Loadable sleeves', mats.sleeve, X(x - 1), X(end - s.cap.len), s.sleeve.d / 2, y, z));
    out.push(xrod('Sleeve end caps', mats.cap, X(end - s.cap.len - .5), X(end), s.cap.d / 2, y, z));
  }
}
/** Top pad block, twin arm pads and logo plates. */
function yokePad(out: Prim[], s: SsbSpec) {
  const { pad, arms } = s;
  out.push(xblock('Yoke pad', 'pad', -pad.len / 2, pad.len / 2, rrect(pad.d, pad.h, pad.round, [pad.y, pad.z]), FOAM, 8));
  const a = FWD(rad(arms.tilt));
  for (const sx of [-1, 1]) out.push(slab('Yoke pad', 'pad', [sx * arms.x, pad.y * .3, pad.z * .3], add([sx * arms.x, 0, 0], mul(a, arms.len)), rrect(arms.t, arms.w, arms.round), FOAM, 7));
  for (const l of s.logos) {
    const dx = l.dx ?? 0, dz = l.dz ?? 0;
    if (l.at === 'front') out.push(xblock('Pad logos', l.mat, dx - l.w / 2, dx + l.w / 2, rrect(1.4, l.h, .3, [pad.y - pad.d / 2 - .4, pad.z + dz]), FOAM));
    if (l.at === 'top') out.push(xblock('Pad logos', l.mat, dx - l.w / 2, dx + l.w / 2, rrect(l.h, 1.4, .3, [pad.y + dz, pad.z + pad.h / 2 + .4]), FOAM));
    if (l.at === 'arm') for (const sx of [-1, 1]) {
      const root: V3 = [sx * arms.x, 0, 0], front = mul(PERP(rad(arms.tilt)), arms.t / 2 + .4), mid = arms.len * .55 + dz;
      out.push(slab('Pad logos', l.mat, add(add(root, front), mul(a, mid - l.w / 2)), add(add(root, front), mul(a, mid + l.w / 2)), rrect(1.4, l.h, .3), FOAM));
    }
  }
}
/** Straight shaft + S-cambers + sleeves + pad: everything but the handles. */
function ssbFrame(s: SsbSpec, mats = { shaft: 'shaft' }): Prim[] {
  const out: Prim[] = [], c = s.between / 2, r = s.shaft / 2, end = s.length / 2;
  const run = end - c - s.collar.len - (s.bearing?.len ?? 0) - s.sleeve.len - s.cap.len;
  const o: V3 = [0, -s.drop * Math.tan(rad(s.tilt)), -s.drop];
  out.push(xrod('Bar shaft', mats.shaft, -c - 1, c + 1, r));
  for (const sx of [-1, 1]) out.push(tube('Cambered ends', mats.shaft, camberPath(c, run, o, s.bendR, sx), cross([1, 0, 0], norm(o)), r));
  sleeves(out, c + run, end, [o[1], o[2]], s);
  yokePad(out, s);
  return out;
}
/** Handle centreline for each arm: from inside the arm pad outward. Styles bend forward in the arm's YZ plane. */
type HandleStyle = { kind: 'straight'; post: number; postD: number; grip: number; gripD: number; cap: number; ribs?: number }
  | { kind: 'bent'; post: number; postD: number; bendAt: number; bend: number; bendR: number; grip: number; gripD: number; cap: number }
  | { kind: 'chain'; post: number; postD: number; links: number; wire: number; grip: number; gripD: number; cap: number };
function handles(out: Prim[], s: SsbSpec, h: HandleStyle, mats = { post: 'handlePost', grip: 'grip', cap: 'handleCap' }) {
  const tilt = rad(s.arms.tilt), a = FWD(tilt), fw = PERP(tilt);
  for (const sx of [-1, 1]) {
    const E: V3 = add([sx * s.arms.x, 0, 0], mul(a, s.arms.len)), at = (u: number, v = 0) => add(add(E, mul(a, u)), mul(fw, v));
    if (h.kind === 'straight') {
      out.push(rod('Handle posts', mats.post, at(-20), at(h.post), h.postD / 2, STEEL, 32));
      out.push(rod('Handle grips', mats.grip, at(h.post), at(h.post + h.grip), h.gripD / 2, RUBBER, 32));
      for (let i = 0; i < (h.ribs ?? 0); i++) { const u = h.post + h.grip * (i + .5) / h.ribs!; out.push(rod('Handle grip ribs', mats.cap, at(u - 3), at(u + 3), h.gripD / 2 + 1.5, RUBBER, 32)); }
      out.push(rod('Handle end caps', mats.cap, at(h.post + h.grip - .5), at(h.post + h.grip + h.cap), h.gripD / 2 + .5, STEEL, 32));
    } else if (h.kind === 'bent') {
      // Centreline in (u along the arm, v forward): straight to bendAt, arc of radius bendR through `bend`, then the grip.
      const pts: V2[] = [[-20, 0], [h.bendAt, 0]], b = rad(h.bend);
      for (let i = 1; i <= 12; i++) { const t = b * i / 12; pts.push([h.bendAt + h.bendR * Math.sin(t), h.bendR * (1 - Math.cos(t))]); }
      const e = pts.at(-1)!, dir: V2 = [Math.cos(b), Math.sin(b)], L = h.post - h.bendAt - h.bendR * b;
      const P = (k: number): V3 => at(e[0] + dir[0] * k, e[1] + dir[1] * k);
      if (L > 0) pts.push([e[0] + dir[0] * L, e[1] + dir[1] * L]);
      out.push(tube('Handle posts', mats.post, pts.map(([u, v]) => at(u, v)), [1, 0, 0], h.postD / 2, STEEL, 6, 32));
      const g0 = Math.max(0, L);
      out.push(rod('Handle grips', mats.grip, P(g0), P(g0 + h.grip), h.gripD / 2, RUBBER, 32));
      out.push(rod('Handle end caps', mats.cap, P(g0 + h.grip - .5), P(g0 + h.grip + h.cap), h.gripD / 2 + .5, STEEL, 32));
    } else {
      out.push(rod('Handle posts', mats.post, at(-20), at(h.post), h.postD / 2, STEEL, 32));
      // Stadium chain links hanging along the arm axis in alternating planes; each link is two overlapping U halves.
      const pitch = 34, lw = 22, rr = lw / 2 - h.wire, e = pitch / 2 - h.wire - rr, B1: V3 = [1, 0, 0];
      for (let i = 0; i < h.links; i++) {
        const c0 = h.post + i * (pitch - h.wire * 2) + pitch / 2, across = i % 2 ? fw : B1, B = i % 2 ? B1 : fw;
        const P = (along: number, side: number) => add(add(E, mul(a, c0 + along)), mul(across, side));
        for (const half of [1, -1]) {
          const pts: V3[] = [P(-half * 2, -rr)];
          for (let k = 0; k <= 12; k++) { const t = -Math.PI / 2 + Math.PI * k / 12; pts.push(P(half * (e + rr * Math.cos(t)), rr * Math.sin(t))); }
          pts.push(P(-half * 2, rr));
          out.push(tube('Handle chains', mats.post, pts, B, h.wire, STEEL, 2.5, 12));
        }
      }
      const g0 = h.post + h.links * (pitch - h.wire * 2) + h.wire * 2;
      out.push(rod('Handle grips', mats.grip, at(g0), at(g0 + h.grip), h.gripD / 2, RUBBER, 32));
      out.push(rod('Handle end caps', mats.cap, at(g0 + h.grip - .5), at(g0 + h.grip + h.cap), h.gripD / 2 + .5, STEEL, 32));
    }
  }
}

const TITAN: SsbSpec = {
  length: inch(90.5), shaft: 38, between: inch(50), drop: inch(5), tilt: 20, bendR: 30,
  collar: { len: 22, d: 60 }, sleeve: { d: 50, len: inch(14.75) }, cap: { len: 6, d: 46 },
  pad: { len: inch(18), h: 135, d: 140, round: 30, y: 6, z: 8 },
  arms: { x: inch(12.75) / 2, w: 127, t: 118, len: 282, tilt: 8, round: 38 },
  logos: [{ at: 'front', w: 42, h: 44, mat: 'logoRed', dx: -92, dz: 14 }, { at: 'front', w: 180, h: 24, mat: 'logo', dx: 32, dz: 24 }, { at: 'front', w: 100, h: 11, mat: 'logoRed', dx: 68, dz: 6 }],
};
const ELITE_YOKE: SsbSpec = {
  length: inch(92), shaft: 38, between: inch(49.5), drop: inch(6), tilt: 30, bendR: 40,
  collar: { len: 16, d: 66 }, sleeve: { d: 49.5, len: inch(14.5) }, cap: { len: 3, d: 44 },
  pad: { len: inch(18), h: 150, d: 170, round: 45, y: 20, z: 28 },
  arms: { x: inch(9) / 2 + 55, w: 110, t: 110, len: 310, tilt: 20, round: 54 },
  logos: [{ at: 'top', w: 190, h: 34, mat: 'logo', dz: -8 }, { at: 'arm', w: 130, h: 22, mat: 'logo' }],
};
const REP: SsbSpec = {
  length: inch(92.5), shaft: 32, between: inch(49.1), drop: inch(5.5), tilt: 25, bendR: 36,
  collar: { len: 20, d: 58 }, sleeve: { d: 50, len: 390 }, cap: { len: 6, d: 44 },
  pad: { len: 432, h: 125, d: 132, round: 26, y: 8, z: 10 },
  arms: { x: inch(13) / 2, w: inch(13) - inch(8.3), t: 108, len: 330, tilt: 5, round: 36 },
  logos: [{ at: 'front', w: 150, h: 38, mat: 'logo', dz: -6 }],
};
const SS4: SsbSpec = {
  length: 2200, shaft: 32, between: 1219, drop: inch(3.5), tilt: 22, bendR: 34,
  collar: { len: 22, d: 62 }, bearing: { len: 3, d: 54 }, sleeve: { d: 50, len: 300 }, cap: { len: 8, d: 48 },
  pad: { len: 406, h: 127, d: 127, round: 48, y: 0, z: 4 },
  arms: { x: inch(9) / 2 + 56, w: 112, t: 112, len: 265, tilt: 5, round: 36 },
  logos: [{ at: 'top', w: 30, h: 30, mat: 'logo', dx: -58 }, { at: 'top', w: 76, h: 30, mat: 'logo', dx: 8 }],
};
export const SS4_HANDLES = ['Straight handles', 'Spider handles', 'Seal row handles', 'Chain handles'] as const;
const SS4_HANDLE_STYLES: HandleStyle[] = [
  { kind: 'straight', post: 14, postD: 26, grip: inch(7.25), gripD: 32, cap: 5 },
  { kind: 'bent', post: 330, postD: 30, bendAt: 60, bend: 28, bendR: 40, grip: 150, gripD: 32, cap: 5 },
  { kind: 'bent', post: 70, postD: 30, bendAt: 30, bend: 90, bendR: 30, grip: 125, gripD: 32, cap: 5 },
  { kind: 'chain', post: 14, postD: 26, links: 5, wire: 4, grip: 110, gripD: 32, cap: 5 },
];

// ---------------------------------------------------------------- Kabuki Transformer: yoke on a straight bar + indexed brackets
export const TRANSFORMER_ANGLES = [-60, -30, 0, 30, 60, 90] as const;
export const TRANSFORMER_SLOTS = [100, 130, 160, 190] as const;
export const TRANSFORMER_HANDLES = ['Standard handles', 'Short handles'] as const;
const TRANSFORMER = {
  length: inch(91.25), shaft: 38, brackets: inch(54), hub: { d: 140, len: 12 }, plate: { t: 16, r0: 62, r1: 48, reach: 190 },
  block: { len: 70, size: 56 }, collar: { len: 26, d: 64 }, sleeve: { d: 50, len: inch(15.75) }, cap: { len: 6, d: 46 },
};
const TRANSFORMER_PAD: SsbSpec = { ...REP, pad: { len: 483, h: 105, d: 125, round: 40, y: 8, z: 6 }, arms: { x: inch(12) / 2, w: 108, t: 100, len: 210, tilt: 28, round: 40 }, logos: [] };
function transformerPrims(p: NumericParams): Prim[] {
  const T = TRANSFORMER, out: Prim[] = [], c = T.brackets / 2, end = T.length / 2, phi = rad(TRANSFORMER_ANGLES[p.camber]), slot = TRANSFORMER_SLOTS[p.slot];
  const dir: V3 = [0, -Math.sin(phi), -Math.cos(phi)], at: V3 = mul(dir, slot);
  out.push(xrod('Bar shaft', 'shaft', -c, c, T.shaft / 2));
  yokePad(out, TRANSFORMER_PAD);
  handles(out, TRANSFORMER_PAD, p.handles ? { kind: 'bent', post: 150, postD: 29, bendAt: 30, bend: 60, bendR: 35, grip: 90, gripD: 29.2, cap: 4 }
    : { kind: 'straight', post: 20, postD: 29, grip: 300, gripD: 29.2, cap: 4 }, { post: 'handlePost', grip: 'grip', cap: 'handleCap' });
  const x1 = c + T.hub.len, x2 = x1 + T.plate.t, disc = (cx: number, cy: number, cz: number, r: number, n = 28) =>
    Array.from({ length: n }, (_, i) => [cx, cy + r * Math.cos(2 * Math.PI * i / n), cz + r * Math.sin(2 * Math.PI * i / n)] as V3);
  for (const sx of [-1, 1]) {
    const X = (v: number) => sx * v, s = T.block.size;
    out.push(xblock('Hub housings', 'bracket', X(c - T.block.len), X(c), rrect(s, s, 5)));
    out.push(xrod('Indexing hubs', 'hub', X(c - 1), X(x1), T.hub.d / 2, 0, 0, STEEL, 48));
    // Bracket plate: stadium from the hub (r0) to past the hardest sleeve slot (r1), pointing along the camber angle.
    const far = mul(dir, T.plate.reach);
    out.push(hull('Camber brackets', 'bracket', [X(x1), X(x2)].flatMap(x => [...disc(x, 0, 0, T.plate.r0), ...disc(x, far[1], far[2], T.plate.r1)])));
    for (const [i, d] of TRANSFORMER_SLOTS.entries()) if (i !== p.slot) out.push(xrod('Open sleeve slots', 'slot', X(x2 - .5), X(x2 + .6), 11, dir[1] * d, dir[2] * d, STEEL, 24));
    out.push(xrod('Hub badges and pop pins', 'hub', X(x2 - .5), X(x2 + 1.5), 30, 0, 0, STEEL, 40));
    const pin = mul(norm(cross([1, 0, 0], dir)), 46);
    out.push(xrod('Hub badges and pop pins', 'hub', X(x2 - .5), X(x2 + 16), 8, pin[1], pin[2], STEEL, 24));
    out.push(xrod('Hub badges and pop pins', 'hub', X(x2 + 10), X(x2 + 18), 13, pin[1], pin[2], STEEL, 24));
    for (let g = 0; g < 4; g++) { const gx = x2 + T.collar.len + 60 + g * 90; out.push(xrod('Sleeve grooves', 'groove', X(gx), X(gx + 3), T.sleeve.d / 2 + .25, at[1], at[2], STEEL, 40)); }
  }
  sleeves(out, x2, end, [at[1], at[2]], { collar: T.collar, sleeve: { d: T.sleeve.d, len: end - x2 - T.collar.len - T.cap.len }, cap: T.cap });
  return out;
}

// ---------------------------------------------------------------- bowed (buffalo) bars
/** `profile`: 'cosine' is one gradual bend (CB-4); 'multi' = drop·(1 − u²)² is tighter by the collars and flatter
 * through the middle (Duffalo's multiple-radius bend). Both leave the collars with zero slope. */
interface BowSpec { length: number; shaft: number; halfWidth: number; drop: number; profile: 'cosine' | 'multi'; collar: { len: number; d: number }; sleeve: { d: number; len: number }; cap: { len: number; d: number }; knurl: [number, number][] }
const bowZ = (s: BowSpec, x: number) => { const u = x / s.halfWidth; return Math.abs(u) >= 1 ? 0 : s.profile === 'multi' ? s.drop * (1 - u * u) ** 2 : s.drop * (1 + Math.cos(Math.PI * u)) / 2; };
function bowPrims(s: BowSpec, capBadge?: { d: number; mat: string; inner?: { d: number; mat: string } }): Prim[] {
  const out: Prim[] = [], end = s.length / 2, xc = end - s.cap.len - s.sleeve.len - s.collar.len, curve = (a: number, b: number) =>
    Array.from({ length: Math.ceil((b - a) / 4) + 1 }, (_, i) => { const x = a + (b - a) * i / Math.ceil((b - a) / 4); return [x, 0, bowZ(s, x)] as V3; });
  out.push(tube('Cambered shaft', 'shaft', curve(-xc - 2, xc + 2), [0, 1, 0], s.shaft / 2, STEEL, 8));
  for (const [a, b] of s.knurl) for (const [lo, hi] of a === -b ? [[a, b]] : [[a, b], [-b, -a]]) out.push(tube('Knurling', 'knurl', curve(lo, hi), [0, 1, 0], s.shaft / 2 + .25, STEEL, 8));
  // Badge discs sit in the end-cap face, flush with the bar end.
  sleeves(out, xc, capBadge ? end - .6 : end, [0, 0], { ...s, cap: { ...s.cap, len: s.cap.len - (capBadge ? .6 : 0) } });
  // A ring badge is a disc with a darker centre disc standing proud of it by 0.4 mm.
  if (capBadge) for (const sx of [-1, 1]) {
    out.push(xrod('End cap badges', capBadge.mat, sx * (end - 1.2), sx * (end - (capBadge.inner ? .4 : 0)), capBadge.d / 2));
    if (capBadge.inner) out.push(xrod('End cap badge centres', capBadge.inner.mat, sx * (end - 1.2), sx * end, capBadge.inner.d / 2));
  }
  return out;
}
const CB4: BowSpec = {
  length: inch(95), shaft: 38, halfWidth: inch(55) / 2, drop: inch(4.4), profile: 'cosine', collar: { len: 25, d: 60 }, sleeve: { d: 50, len: inch(16) }, cap: { len: 6, d: 46 },
  knurl: [[-80, 80], [110, 560]],
};
const DUFFALO: BowSpec = {
  length: inch(95), shaft: 31.75, halfWidth: 700, drop: inch(3.25), profile: 'multi', collar: { len: 25, d: 62 }, sleeve: { d: 50, len: inch(17.25) }, cap: { len: 6, d: 46 },
  knurl: [[-40, 40], ...Array.from({ length: 7 }, (_, i) => [52 + i * 92, 132 + i * 92] as [number, number])],
};
export const DUFFALO_FINISHES = ['Zinc', 'Black oxide', 'Electroless nickel'] as const;

// ---------------------------------------------------------------- Rogue CB-1: straight top shaft, welded drop legs
const CB1 = { length: inch(92), top: inch(66), shaft: 38, legTop: 447, legBottom: 480, drop: inch(16.5), collarAt: 700, collar: { len: 20, d: 60 }, sleeve: { d: 50, len: 0 }, cap: { len: 6, d: 46 } };
function cb1Prims(): Prim[] {
  const s = CB1, out: Prim[] = [], r = s.shaft / 2, end = s.length / 2;
  out.push(xrod('Top shaft', 'shaft', -s.top / 2, s.top / 2, r));
  out.push(xblock('Logo decal', 'logo', 60, 150, rrect(9, 1.2, .3, [0, r + .2]), FOAM));
  for (const sx of [-1, 1]) {
    out.push(rod('Drop legs', 'shaft', [sx * s.legTop, 0, 0], [sx * s.legBottom, 0, -s.drop], r));
    out.push(xrod('Lower arms', 'shaft', sx * (s.legBottom - 18), sx * (s.collarAt + 1), r, 0, -s.drop));
  }
  sleeves(out, s.collarAt, end, [0, -s.drop], { ...s, sleeve: { d: s.sleeve.d, len: end - s.collarAt - s.collar.len - s.cap.len } });
  return out;
}

// ---------------------------------------------------------------- EliteFTS American Cambered Grip Bar: cambered multi-grip frame
const ACG = { length: inch(80), frame: inch(39.5), depth: 215, chamfer: 22, rail: { w: 25, h: 38 }, flat: 150, slope: 200, drop: inch(2), shaft: 32, collarAt: inch(50.5) / 2,
  collar: { len: 20, d: 58 }, sleeve: { d: 50, len: 0 }, cap: { len: 6, d: 46 }, grips: [inch(7.5), inch(15), inch(21.5), inch(28)].map(v => v / 2), gripD: 32, slant: 14 };
const acgZ = (x: number) => { const a = Math.abs(x); return a <= ACG.flat ? -ACG.drop : a >= ACG.slope ? 0 : -ACG.drop * (ACG.slope - a) / (ACG.slope - ACG.flat); };
function acgPrims(): Prim[] {
  const s = ACG, out: Prim[] = [], L = s.frame / 2, { w, h } = s.rail, yo = s.depth / 2 - w / 2, end = s.length / 2;
  // Rails: vertical-cut rectangular tube segments at the camber breaks (hulls of their end sections).
  const breaks = [-(L - s.chamfer), -s.slope, -s.flat, s.flat, s.slope, L - s.chamfer];
  for (const y of [-yo, yo]) for (let i = 0; i < breaks.length - 1; i++) {
    const [x0, x1] = [breaks[i], breaks[i + 1]], section = (x: number) => [-1, 1].flatMap(dy => [-1, 1].map(dz => [x, y + dy * w / 2, acgZ(x) + dz * h / 2] as V3));
    out.push(hull('Cambered frame', 'frame', [...section(x0 - (i === 0 ? 0 : .01)), ...section(x1 + (i === breaks.length - 2 ? 0 : .01))]));
  }
  // End rails with 45° chamfered corners (the frame reads as a long hexagon from above).
  const D = s.depth / 2, c = s.chamfer;
  for (const sx of [-1, 1]) out.push(hull('Cambered frame', 'frame', [-h / 2, h / 2].flatMap(z => [[L, D - c], [L - c, D], [L - c - w * .4, D]].flatMap(([x, y]) => [[sx * x, y, z], [sx * x, -y, z]] as V3[]))));
  // Angled grips between the rails, mirrored about the centre.
  const inner = yo - w / 2 + 2, dx = inner * Math.tan(rad(s.slant));
  for (const sx of [-1, 1]) for (const g of s.grips) {
    const x = sx * g, z = acgZ(x);
    out.push(rod('Angled grips', 'grip', [x - sx * dx, -inner, z], [x + sx * dx, inner, z], s.gripD / 2, STEEL, 32));
  }
  out.push(box('Logo', 'logo', [-70, yo - 9, acgZ(0) + h / 2], [70, yo + 9, acgZ(0) + h / 2 + .8], FOAM));
  for (const sx of [-1, 1]) out.push(xrod('Bar shaft', 'shaft', sx * (L - 5), sx * (s.collarAt + 1), s.shaft / 2));
  sleeves(out, s.collarAt, end, [0, 0], { ...s, sleeve: { d: s.sleeve.d, len: end - s.collarAt - s.collar.len - s.cap.len } });
  return out;
}

// ---------------------------------------------------------------- catalog entries
/** `rest`: preferred floor roll (radians); the stable rest nearest it is used (camber/handles towards the front, logos up). */
interface Model { prims: (p: NumericParams) => Prim[]; palette: (p: NumericParams) => Palette; rest: number }
const FRONT = -Math.PI / 2, BOW_FRONT = Math.PI / 2;
const SSB_PALETTE = (shaft: Finish, extra: Palette = {}): Palette => ({
  shaft, collar: CHROME, sleeve: CHROME, cap: f('#56595d', .8, .35), pad: VINYL, logo: WHITE, logoRed: f('#d8412b', 0, .55),
  handlePost: CHROME, grip: f('#141516', 0, .85, 'handle'), handleCap: f('#141516', 0, .7), bearing: f('#a8813f', 1, .3, 'fastener'), ...extra,
});
const MODELS: Record<string, Model> = {
  'titan-safety-squat-bar': {
    rest: FRONT,
    prims: () => { const out = ssbFrame(TITAN); handles(out, TITAN, { kind: 'straight', post: 24, postD: 30, grip: 135, gripD: 35, cap: 7 }); return out; },
    palette: () => SSB_PALETTE(f('#d9dee2', 1, .16, 'rod'), { cap: f('#b3262d', .3, .45) }),
  },
  'elitefts-ss-yoke-bar': {
    rest: FRONT,
    prims: () => { const out = ssbFrame(ELITE_YOKE); handles(out, ELITE_YOKE, { kind: 'straight', post: 28, postD: 25, grip: 150, gripD: 36, cap: 4, ribs: 4 }); return out; },
    palette: p => {
      const steel = p.finish ? f('#8e9296', .9, .38, 'rod') : f('#1c1d1f', .35, .6, 'rod');
      return SSB_PALETTE(steel, { collar: steel, sleeve: { ...steel, role: 'sleeve' }, cap: steel, handlePost: steel, grip: f('#1a1b1d', .5, .7, 'handle'), handleCap: f('#1a1b1d', .4, .6) });
    },
  },
  'rep-safety-squat-bar': {
    rest: FRONT,
    prims: () => { const out = ssbFrame(REP); handles(out, REP, { kind: 'straight', post: 30, postD: 34, grip: 148, gripD: 38, cap: 4 }); return out; },
    palette: () => SSB_PALETTE(f('#2c2d30', .55, .38, 'rod'), { handlePost: f('#e6e9ec', 1, .12), grip: f('#c9cdd1', 1, .42, 'handle'), handleCap: f('#e6e9ec', 1, .12), cap: CHROME }),
  },
  'bells-of-steel-ss4-safety-squat-bar': {
    rest: FRONT,
    prims: p => { const out = ssbFrame(SS4); handles(out, SS4, SS4_HANDLE_STYLES[p.handles]); return out; },
    palette: () => { const ti = f('#34363a', .85, .3, 'rod'); return SSB_PALETTE(ti, { collar: ti, sleeve: { ...ti, role: 'sleeve' }, cap: f('#2a2b2e', .8, .35), handlePost: f('#2a2b2e', .8, .35), grip: f('#232426', .7, .6, 'handle'), handleCap: f('#2a2b2e', .8, .35) }); },
  },
  'kabuki-transformer-bar': {
    rest: FRONT,
    prims: transformerPrims,
    palette: () => ({
      shaft: f('#1b1c1e', .2, .5, 'rod'), pad: VINYL, bracket: f('#202124', .35, .5), hub: f('#c6c9cc', 1, .3, 'fastener'), slot: f('#0c0c0d', 0, .8),
      collar: f('#26272a', .6, .45, 'sleeve'), sleeve: f('#2a2b2e', .6, .45, 'sleeve'), groove: f('#151618', .5, .6, 'sleeve'), cap: f('#1f2022', .5, .5),
      handlePost: f('#1f2022', .5, .5), grip: f('#1d1e20', .5, .7, 'handle'), handleCap: f('#1f2022', .5, .5),
    }),
  },
  'kabuki-duffalo-bar': {
    rest: BOW_FRONT,
    prims: () => bowPrims(DUFFALO, { d: 36, mat: 'badge' }),
    palette: p => {
      const [shaft, knurl] = p.finish === 1 ? [f('#2a2b2d', .7, .42, 'rod'), f('#1e1f21', .7, .7, 'handle')] : p.finish === 2 ? [f('#b4b0a6', 1, .3, 'rod'), f('#98958c', 1, .55, 'handle')] : [f('#c3c9ce', 1, .24, 'rod'), f('#a3a9ae', 1, .55, 'handle')];
      return { shaft, knurl, collar: { ...shaft, role: 'sleeve' }, sleeve: { ...shaft, role: 'sleeve' }, cap: f('#cfd3d6', 1, .25), badge: f('#9ea3a7', 1, .4) };
    },
  },
  'elitefts-american-cambered-grip-bar': {
    rest: 0,
    prims: acgPrims,
    palette: () => ({ frame: f('#1c1d1f', .2, .62), grip: f('#1c1d1f', .2, .62, 'handle'), shaft: f('#1c1d1f', .2, .62, 'rod'), logo: WHITE, collar: f('#232426', .4, .55, 'sleeve'), sleeve: f('#262729', .5, .5, 'sleeve'), cap: f('#1a1b1d', .4, .6) }),
  },
  'rogue-cb-4-camber-bar': {
    rest: BOW_FRONT,
    prims: () => bowPrims(CB4, { d: 34, mat: 'badge', inner: { d: 25, mat: 'cap' } }),
    palette: () => ({ shaft: f('#202124', .2, .55, 'rod'), knurl: f('#161719', .3, .82, 'handle'), collar: f('#2a2b2e', .5, .45, 'sleeve'), sleeve: f('#2a2b2e', .5, .45, 'sleeve'), cap: f('#1b1c1e', .4, .5), badge: f('#d9d9d6', 0, .5) }),
  },
  'rogue-cb-1-camber-bar': {
    rest: FRONT,
    prims: cb1Prims,
    palette: () => ({ shaft: f('#1d1e20', .35, .55, 'rod'), logo: WHITE, collar: f('#232427', .5, .5, 'sleeve'), sleeve: f('#2b2c2f', .55, .45, 'sleeve'), cap: f('#1b1c1e', .4, .5) }),
  },
};
export const specialtyBarModel = (id: string) => { const m = MODELS[id]; if (!m) throw Error(`Unknown specialty bar ${id}.`); return m; };
const poses = new Map<string, RestPose>();
/** Stable floor pose for an entry + params (cached): roll, shaft-axis height and posed bounds. */
export function specialtyBarPose(id: string, params: NumericParams): RestPose {
  const key = `${id}:${JSON.stringify(Object.entries(params).sort())}`;
  let pose = poses.get(key); if (!pose) { const m = specialtyBarModel(id); pose = restPose(m.prims(params), m.rest); poses.set(key, pose); }
  return pose;
}
/** Floor footprint = posed X/Y bounds; the origin stays on the floor under the shaft axis (local Y = 0). */
function footprint(id: string, params: NumericParams): FloorBox {
  const { min, max } = specialtyBarPose(id, params);
  return { width: max[0] - min[0], depth: max[1] - min[1], offset: [(max[0] + min[0]) / 2, -(max[1] + min[1]) / 2] };
}
const vendor = (vendorName: string, url: string, credit: string, trademark: string, reconstruction: string) => ({ vendor: vendorName, url, credit, trademark, reconstruction });
const base = { noun: 'bar', section: 'Barbells', placement: { side: 'front', gap: 300 }, parks: true } as const;
const indep = (brand: string) => `Independent reconstruction from published dimensions and product photos; ${brand} trademarks belong to ${brand}.`;

export const TITAN_SSB = defineFloorPart({
  ...base, id: 'titan-safety-squat-bar', name: 'Titan Safety Squat Bar', title: 'Titan Safety Squat Bar',
  description: `Chrome safety squat bar: 90.5" long, 38 mm shaft with 5" cambered drop, 50" rackable, 14.75" loadable sleeves, HeftyGrip yoke pad and 35 mm rubber handles 12.75" apart. ${indep('Titan Fitness')}`,
  params: [], footprint: p => footprint('titan-safety-squat-bar', p),
  vendor: vendor('Titan Fitness', 'https://titan.fitness/products/safety-squat-olympic-bar', 'Titan Fitness — Safety Squat Bar (430410)', 'Titan Fitness and HeftyGrip are trademarks of Titan Fitness.', 'Independent Manifold reconstruction from the published dimension drawing (90.5" length, 50" rackable, 14.75" sleeves, 38 mm shaft, 50 mm sleeves, 35 mm handles 12.75" apart, 5" drop, 20° camber) and product photos. Pad block and arm sizes, bend radius and camber tilt estimated; logo is a flat plate. Scenery only.'),
});
export const ELITEFTS_SS_YOKE = defineFloorPart({
  ...base, id: 'elitefts-ss-yoke-bar', name: 'EliteFTS SS Yoke Bar', title: 'EliteFTS SS Yoke Bar',
  description: `Dave Tate's SS Yoke Bar: 92" long, 49.5" between cambers, 6" drop with a long 30° camber, dense neck pad with thick shoulder pads ~9" apart, 7" knurled screw-in handles, non-rotating sleeves. ${indep('EliteFTS')}`,
  params: [{ key: 'finish', label: 'Finish', default: 0, options: [0, 1], format: v => ['Black', 'Clear'][v] }],
  footprint: p => footprint('elitefts-ss-yoke-bar', p),
  vendor: vendor('EliteFTS', 'https://elitefts.com/products/ss-yoke-bar', 'EliteFTS — SS Yoke Bar', 'EliteFTS and SS Yoke Bar are trademarks of Elite Fitness Systems.', 'Independent Manifold reconstruction from published specs (92" length, 49.5" between cambers, ~9" between pads, 7" handles; 6" drop and 30° camber from reviews) and product photos. Pad block size, sleeve diameter and length, bend radius estimated; logos are flat plates. Scenery only.'),
});
export const REP_SSB = defineFloorPart({
  ...base, id: 'rep-safety-squat-bar', name: 'REP Safety Squat Bar', title: 'REP Safety Squat Bar',
  description: `Metallic black SSB: 92.5" long, 49.1" between cambers, 5.5" camber drop, hard-chrome 2" sleeves, bright-chrome knurled 1.5" handles 13" apart, vinyl pad with pads 8.3" apart. ${indep('REP Fitness')}`,
  params: [], footprint: p => footprint('rep-safety-squat-bar', p),
  vendor: vendor('REP Fitness', 'https://repfitness.com/products/safety-squat-bar', 'REP Fitness — Safety Squat Bar (BB-4600)', 'REP Fitness is a trademark of REP Fitness.', 'Independent Manifold reconstruction from REP technical specifications (92.5" length, 15.6" sleeves, 2" sleeve diameter, 7" × 1.5" handles 13" apart, 49.1" between cambers, 5.5" drop, pads 8.3" apart) and product photos. Shaft diameter, pad block size, camber tilt and bend radius estimated. Scenery only.'),
});
export const BOS_SS4 = defineFloorPart({
  ...base, id: 'bells-of-steel-ss4-safety-squat-bar', name: 'Bells of Steel SS4 Safety Squat Bar', title: 'Bells of Steel SS4 Safety Squat Bar',
  description: `Black-titanium SS4: 2200 mm long, 32 mm shaft, 22° camber, needle-bearing sleeves with 11 13/16" loadable, 5" round pad with shoulder pads 9" apart, and swappable straight, spider, seal-row or chain handles. ${indep('Bells of Steel')}`,
  params: [{ key: 'handles', label: 'Handles', default: 0, options: [0, 1, 2, 3], format: v => SS4_HANDLES[v] }],
  footprint: p => footprint('bells-of-steel-ss4-safety-squat-bar', p),
  vendor: vendor('Bells of Steel', 'https://bellsofsteel.us/products/safety-squat-bar-ss4', 'Bells of Steel — Safety Squat Bar SS4', 'Bells of Steel and SS4 are trademarks of Bells of Steel.', 'Independent Manifold reconstruction from the published spec graphic (86 5/8" length, 11 13/16" sleeves, 1 1/4" shaft, 21" pad-to-handle depth) and review measurements (5" pad, 9" between pads, 7.25" handles) with product photos. Camber drop, between-camber length (48", photo-scaled), bend radius and handle-accessory shapes estimated. Scenery only.'),
});
export const KABUKI_TRANSFORMER = defineFloorPart({
  ...base, id: 'kabuki-transformer-bar', name: 'Kabuki Transformer Bar', title: 'Kabuki Strength Transformer Bar',
  description: `Adjustable safety squat bar: 91.25" long, yoke on a black 54" centre bar, indexed brackets with six camber angles 30° apart and four sleeve slots (easy 1 to hard 4), 15.75" matte black sleeves, 1.15" knurled handles 12" apart. ${indep('Kabuki Strength')}`,
  params: [
    { key: 'camber', label: 'Camber angle', default: 2, options: [0, 1, 2, 3, 4, 5], format: v => `${TRANSFORMER_ANGLES[v] > 0 ? '+' : ''}${TRANSFORMER_ANGLES[v]}° (position ${v + 1})` },
    { key: 'slot', label: 'Sleeve slot', default: 3, options: [0, 1, 2, 3], format: v => ['Easy 1', '2', '3', 'Hard 4'][v] },
    { key: 'handles', label: 'Handles', default: 0, options: [0, 1], format: v => TRANSFORMER_HANDLES[v] },
  ],
  footprint: p => footprint('kabuki-transformer-bar', p),
  vendor: vendor('Kabuki Strength', 'https://www.roguefitness.com/rogue-kabuki-transformer-bar', 'Kabuki Strength — Transformer Bar (made by Rogue Fitness)', 'Kabuki Strength and Transformer Bar are trademarks of Kabuki Strength; Rogue is a trademark of Rogue Fitness.', 'Independent Manifold reconstruction from published specs (91.25" length, 54" between brackets, 15.75" loadable sleeves, 1.15" handles 12" apart, 6 camber positions 30° apart, 4 sleeve slots) and product photos. Absolute camber angles, slot radii, bracket and hub sizes, pad and arm sizes estimated. Scenery only.'),
});
export const KABUKI_DUFFALO = defineFloorPart({
  ...base, id: 'kabuki-duffalo-bar', name: 'Kabuki Duffalo Bar', title: 'Kabuki Strength Duffalo Bar',
  description: `Chris Duffin's cambered squat and press bar: 95" long, 31.75 mm shaft bent through a gradual multi-radius camber, segmented sharp knurl, bronze-bushing sleeves with 17.25" loadable, stamped stainless end caps. ${indep('Kabuki Strength')}`,
  params: [{ key: 'finish', label: 'Finish', default: 0, options: [0, 1, 2], format: v => DUFFALO_FINISHES[v] }],
  footprint: p => footprint('kabuki-duffalo-bar', p),
  vendor: vendor('Kabuki Strength', 'https://kabukistrength.com/products/duffalo-performance-squat-bar', 'Kabuki Strength — Duffalo Bar (archived product page)', 'Kabuki Strength and Duffalo Bar are trademarks of Kabuki Strength.', 'Independent Manifold reconstruction from the archived Kabuki technical specs (95" length, 31.75 mm diameter, 17.25" loadable sleeves, zinc/black oxide/nickel finishes) and owner photos. Camber depth (3.25") and bend width, knurl segment layout and collar sizes estimated from photos. Scenery only.'),
});
export const ELITEFTS_ACG = defineFloorPart({
  ...base, id: 'elitefts-american-cambered-grip-bar', name: 'EliteFTS American Cambered Grip Bar', title: 'EliteFTS American Cambered Grip Bar',
  description: `Cambered multi-grip press bar: 38 lb matte black frame with a 2" dropped centre, four angled grips per side at 7.5", 15", 21.5" and 28" on centre, rackable from 39.5" to 50.5". ${indep('EliteFTS')}`,
  params: [], footprint: p => footprint('elitefts-american-cambered-grip-bar', p),
  vendor: vendor('EliteFTS', 'https://elitefts.com/products/american-cambered-grip-bar', 'EliteFTS — American Cambered Grip Bar', 'EliteFTS is a trademark of Elite Fitness Systems.', 'Independent Manifold reconstruction from published specs (grip spacing 7.5/15/21.5/28" on centre, rackable 39.5–50.5") and product photos. Overall length, frame depth, rail tube size, camber depth (2") and grip slant estimated from photos. Scenery only.'),
});
export const ROGUE_CB4 = defineFloorPart({
  ...base, id: 'rogue-cb-4-camber-bar', name: 'Rogue CB-4 Camber Bar', title: 'Rogue CB-4 38MM Camber Bar (Buffalo bar)',
  description: `Westside "Buffalo" camber bar: 95" long, 38 mm black Cerakote shaft with a 4.4" drop over a 55" wide bend, power and centre knurl, matte black 16" loadable sleeves. ${indep('Rogue Fitness')}`,
  params: [], footprint: p => footprint('rogue-cb-4-camber-bar', p),
  vendor: vendor('Rogue Fitness', 'https://www.roguefitness.com/rogue-cb-4-38mm-camber-bar', 'Rogue Fitness — CB-4 38MM Camber Bar', 'Rogue and CB-4 are trademarks of Rogue Fitness.', 'Independent Manifold reconstruction from published specs (95" length, 38 mm diameter, 16" loadable sleeves, 4.4" drop, 55" wide bend, centre + power knurl, black Cerakote shaft, matte black sleeves) and product photos. Bend profile, knurl zone ends and collar sizes estimated. Scenery only.'),
});
export const ROGUE_CB1 = defineFloorPart({
  ...base, id: 'rogue-cb-1-camber-bar', name: 'Rogue CB-1 Camber Bar', title: 'Rogue CB-1 Camber Bar (cambered squat bar)',
  description: `Fully welded cambered squat bar: 85 lb, 1.5" solid shaft racked on its straight top bar, welded legs dropping the machined Olympic sleeves about 16.5" below it. ${indep('Rogue Fitness')}`,
  params: [], footprint: p => footprint('rogue-cb-1-camber-bar', p),
  vendor: vendor('Rogue Fitness', 'https://www.roguefitness.com/cb-1-rogue-camber-bar', 'Rogue Fitness — CB-1 Camber Bar', 'Rogue and CB-1 are trademarks of Rogue Fitness.', 'Independent Manifold reconstruction from published specs (85 lb, 1.5" formed solid shaft, machined Olympic sleeves, fully welded) and product photos. Overall length, top-bar length, leg spacing and drop are photo-scaled estimates. Scenery only.'),
});
/** Highest-owned first (Gym Radar, Sep 2026). */
export const PARTS = [TITAN_SSB, ELITEFTS_SS_YOKE, REP_SSB, KABUKI_TRANSFORMER, BOS_SS4, KABUKI_DUFFALO, ELITEFTS_ACG, ROGUE_CB4, ROGUE_CB1] as const satisfies readonly FloorPart[];
