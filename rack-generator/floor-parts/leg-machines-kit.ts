/** Leg machines: a tiny solid-description language shared by the footprint (pure math, main bundle) and the Manifold
 * builder (parts/leg-machines.ts). Each product describes itself once against `Kit`; `BoundsKit` folds the same calls
 * into an exact bounding box of the ideal shapes, so a posed or plate-loaded machine's floor footprint always matches
 * what the builder makes (to within the polygon sag of its cylinders, well under 1 mm). No Manifold imports here. */
import type { MaterialRole } from '../appearance.ts';
import type { FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { PLATE_GAP, PLATE_SPECS, type PlateId } from '../plates.ts';
export type V3 = [number, number, number];
/** Rigid transform: 3×3 rotation (row-major) and translation. */
export interface Rigid { r: readonly number[]; t: V3 }
export interface Finish { role: MaterialRole; color: string; metalness: number; roughness: number }
export const inch = (v: number) => v * 25.4;
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => { const l = Math.hypot(...a); if (!(l > 0)) throw Error('Zero-length direction.'); return scale(a, 1 / l); };
export const lerp = (a: V3, b: V3, k: number): V3 => add(a, scale(sub(b, a), k));
const rad = (deg: number) => deg * Math.PI / 180;
export const IDENTITY: Rigid = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
export const apply = (m: Rigid, p: V3): V3 => [m.r[0] * p[0] + m.r[1] * p[1] + m.r[2] * p[2] + m.t[0], m.r[3] * p[0] + m.r[4] * p[1] + m.r[5] * p[2] + m.t[1], m.r[6] * p[0] + m.r[7] * p[1] + m.r[8] * p[2] + m.t[2]];
export const rotateVec = (m: Rigid, p: V3): V3 => [m.r[0] * p[0] + m.r[1] * p[1] + m.r[2] * p[2], m.r[3] * p[0] + m.r[4] * p[1] + m.r[5] * p[2], m.r[6] * p[0] + m.r[7] * p[1] + m.r[8] * p[2]];
/** a ∘ b: apply b first, then a. */
export function compose(a: Rigid, b: Rigid): Rigid {
  const r: number[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r.push(a.r[i * 3] * b.r[j] + a.r[i * 3 + 1] * b.r[3 + j] + a.r[i * 3 + 2] * b.r[6 + j]);
  return { r, t: apply(a, b.t) };
}
export const translation = (t: V3): Rigid => ({ r: IDENTITY.r, t });
/** Rotation about a line through `pivot` parallel to X by `deg` (right-hand: +deg turns +Y toward +Z). */
export function rotX(deg: number, pivot: V3 = [0, 0, 0]): Rigid {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)), r = [1, 0, 0, 0, c, -s, 0, s, c];
  return { r, t: sub(pivot, apply({ r, t: [0, 0, 0] }, pivot)) };
}
export function rotZ(deg: number, pivot: V3 = [0, 0, 0]): Rigid {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)), r = [c, -s, 0, s, c, 0, 0, 0, 1];
  return { r, t: sub(pivot, apply({ r, t: [0, 0, 0] }, pivot)) };
}
/** Unit vector in the YZ plane at `deg` from straight down, turning toward -Y (the user's front) — how lever arms swing. */
export const swing = (deg: number): V3 => [0, -Math.sin(rad(deg)), -Math.cos(rad(deg))];
/** Orthonormal frame (u, v, w) with w along `dir`; `up` picks v (projected off w). */
export function frameFor(dir: V3, up?: V3): { u: V3; v: V3; w: V3 } {
  const w = norm(dir), seed = up && Math.abs(dot(norm(up), w)) < .999 ? norm(up) : Math.abs(w[2]) < .9 ? [0, 0, 1] as V3 : [0, 1, 0] as V3;
  const v = norm(sub(seed, scale(w, dot(seed, w)))), u = cross(v, w);
  return { u, v, w };
}
/** The description language. Coordinates are in the current (pushed) frame; `g` names a material group. */
export interface Kit {
  finish(g: string, f: Finish): void;
  push(m: Rigid): void; pop(): void;
  /** Axis-aligned box in the current frame. */
  box(g: string, min: V3, max: V3): void;
  /** Rectangular bar from a to b (centre line), `w` across and `h` along the `up` hint. */
  beam(g: string, a: V3, b: V3, w: number, h: number, up?: V3): void;
  /** Round bar from a to b. */
  rod(g: string, a: V3, b: V3, d: number, segments?: number): void;
  /** Upholstered pad: rounded w×l outline in the (u, v) plane centred on `c`, rising `t` along u×v; `soft` rounds the top edge. */
  pad(g: string, c: V3, u: V3, v: V3, w: number, l: number, t: number, r: number, soft?: number): void;
  /** Olympic plates stacked from `origin` along `axis` (buildPlateStack). */
  plates(name: string, plates: readonly PlateId[], origin: V3, axis: V3): void;
  /** Steel cable (swept circle) through points. */
  cable(g: string, points: V3[], d: number): void;
  /** Cylinder subtracted from group `g` (holes, dial perforations); never changes bounds. */
  hole(g: string, a: V3, b: V3, d: number, segments?: number): void;
  /** Flat plate: polygon `pts` in (u, v) coordinates about `o`, extruded `t` along u × v (gussets, side panels). */
  polygon(g: string, o: V3, u: V3, v: V3, pts: readonly (readonly [number, number])[], t: number): void;
}
/** Shared push/pop bookkeeping. */
export abstract class FrameKit {
  protected stack: Rigid[] = [IDENTITY];
  get m() { return this.stack[this.stack.length - 1]; }
  push(m: Rigid) { this.stack.push(compose(this.m, m)); }
  pop() { if (this.stack.length < 2) throw Error('Unbalanced pop.'); this.stack.pop(); }
}
export function beamCorners(a: V3, b: V3, w: number, h: number, up?: V3): V3[] {
  const { u, v } = frameFor(sub(b, a), up), out: V3[] = [];
  for (const e of [a, b]) for (const su of [-1, 1]) for (const sv of [-1, 1]) out.push(add(e, add(scale(u, su * w / 2), scale(v, sv * h / 2))));
  return out;
}
/** Folds every description call into world-space bounds of the ideal shapes. */
export class BoundsKit extends FrameKit implements Kit {
  min: V3 = [Infinity, Infinity, Infinity]; max: V3 = [-Infinity, -Infinity, -Infinity];
  private point(p: V3, pad: V3 = [0, 0, 0]) { for (let i = 0; i < 3; i++) { this.min[i] = Math.min(this.min[i], p[i] - pad[i]); this.max[i] = Math.max(this.max[i], p[i] + pad[i]); } }
  finish() {}
  box(_g: string, min: V3, max: V3) { for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) this.point(apply(this.m, [x, y, z])); }
  beam(_g: string, a: V3, b: V3, w: number, h: number, up?: V3) { for (const c of beamCorners(a, b, w, h, up)) this.point(apply(this.m, c)); }
  rod(_g: string, a: V3, b: V3, d: number) { this.disc(apply(this.m, a), apply(this.m, b), d / 2); }
  private disc(a: V3, b: V3, r: number) {
    const w = norm(sub(b, a)), pad = w.map(x => r * Math.sqrt(Math.max(0, 1 - x * x))) as V3;
    this.point(a, pad); this.point(b, pad);
  }
  pad(_g: string, c: V3, u: V3, v: V3, w: number, l: number, t: number, r: number, soft = 0) {
    // Same outline as ManifoldKit.pad: corner radius rr, the top face inset by the soft edge e.
    const n = cross(u, v), U = rotateVec(this.m, u), V = rotateVec(this.m, v), rr = Math.min(r, w / 2 - .5, l / 2 - .5), e = Math.max(0, Math.min(soft, t / 3, rr - .5));
    for (const [z, rad] of [[0, rr], [t - e, rr], [t, rr - e]] as const) {
      const ext = [0, 1, 2].map(i => rad * Math.hypot(U[i], V[i])) as V3;
      for (const su of [-1, 1]) for (const sv of [-1, 1]) this.point(apply(this.m, add(c, add(add(scale(u, su * (w / 2 - rr)), scale(v, sv * (l / 2 - rr))), scale(n, z)))), ext);
    }
  }
  plates(_name: string, plates: readonly PlateId[], origin: V3, axis: V3) {
    const o = apply(this.m, origin), a = norm(rotateVec(this.m, axis));
    let offset = 0;
    for (const id of plates) { const s = PLATE_SPECS[id]; this.disc(add(o, scale(a, offset)), add(o, scale(a, offset + s.width)), s.diameter / 2); offset += s.width + PLATE_GAP; }
  }
  cable(_g: string, points: V3[], d: number) { for (const p of points) this.point(apply(this.m, p), [d / 2, d / 2, d / 2]); }
  hole() {}
  polygon(_g: string, o: V3, u: V3, v: V3, pts: readonly (readonly [number, number])[], t: number) {
    const n = cross(u, v);
    for (const [x, y] of pts) for (const z of [0, t]) this.point(apply(this.m, add(o, add(add(scale(u, x), scale(v, y)), scale(n, z)))));
  }
}
export type Describe = (kit: Kit, params: NumericParams) => void;
/** World bounds of a description. */
export function describeBounds(describe: Describe, params: NumericParams) { const k = new BoundsKit(); describe(k, params); return { min: k.min, max: k.max }; }
/** Wraps a description so its default-pose bounds are centred on the origin, footprint-style (floor at z = 0). */
export function centred(describe: Describe, defaults: NumericParams): Describe {
  let shift: V3 | undefined;
  return (kit, p) => {
    if (!shift) { const b = describeBounds(describe, defaults); shift = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, 0]; }
    kit.push(translation(shift)); describe(kit, p); kit.pop();
  };
}
/** Floor box of a described part: width along X, depth along Y, offset in floor coordinates (source Y = −floor Z). */
export function footprintOf(describe: Describe, params: NumericParams): FloorBox {
  const b = describeBounds(describe, params), cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, r = (v: number) => Math.round(v * 1000) / 1000;
  return { width: r(b.max[0] - b.min[0]), depth: r(b.max[1] - b.min[1]), offset: [r(cx) || 0, r(-cy) || 0] };
}
// ---- Shared finishes (colours from the product photos) ----
export const f = (role: MaterialRole, color: string, metalness = 0, roughness = .55): Finish => ({ role, color, metalness, roughness });
export const MATTE_BLACK = f('source', '#1c1d1f', .15, .62), SATIN_BLACK = f('source', '#232427', .25, .5);
export const VINYL = f('liner', '#141516', 0, .9), RUBBER = f('liner', '#121314', 0, .92), PLASTIC = f('liner', '#18191b', 0, .7);
export const CHROME = f('source', '#dfe3e6', 1, .14), ZINC = f('fastener', '#c9ccce', .9, .3), STEEL = f('source', '#9ea3a8', .9, .32);
export const GRIP = f('handle', '#18191a', 0, .88);
export const lb45 = (n: number): PlateId[] => Array<PlateId>(n).fill('lb45');
/** Swing a lever described hanging straight down by `deg` toward the user's front (see `swing`). */
export const swingAbout = (deg: number, pivot: V3) => rotX(-deg, pivot);
