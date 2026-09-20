/** Geometry helpers shared by the #135 lever, belt squat, peg and grip builders. Every intermediate goes through the
 * vendorSolid scope's `keep`, so it is released when the build finishes (or throws). */
import type { Manifold, ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { Mat4 } from 'manifold-3d';
import type { MaterialRole } from '../appearance.ts';
import { vendorSolid } from './vendor-solid.ts';
import { revolveProfile } from './rogue-band-pegs.ts';
type Scope = Parameters<Parameters<typeof vendorSolid>[1]>[0];
export interface Finish { color: string; metalness: number; roughness: number; role?: MaterialRole }
export const POWDER_BLACK: Finish = { color: '#1c1d1f', metalness: .3, roughness: .72 };
export const GLOSS_BLACK: Finish = { color: '#18191b', metalness: .35, roughness: .45 };
export const CHROME: Finish = { color: '#d8dcdf', metalness: .95, roughness: .12 };
export const ZINC: Finish = { color: '#c7cbce', metalness: .88, roughness: .28 };
export const BLACK_ZINC: Finish = { color: '#2a2b2e', metalness: .7, roughness: .35 };
export const STAINLESS: Finish = { color: '#c9ccce', metalness: .92, roughness: .22 };
export const UHMW: Finish = { color: '#1a1a1a', metalness: 0, roughness: .6, role: 'liner' };
export const RUBBER: Finish = { color: '#202020', metalness: 0, roughness: .85, role: 'liner' };
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const norm = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
/** Column-major rigid transform taking local +Z to `axis` (local +Y towards `up` projected), then translating to `at`. */
export function frameMatrix(axis: Vec3, at: Vec3, up?: Vec3): Mat4 {
  const a = norm(axis), seed: Vec3 = up ?? (Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0]);
  const v = norm(cross(a, cross(seed, a))), u = cross(v, a);
  return [...u, 0, ...v, 0, ...a, 0, ...at, 1] as Mat4;
}
/** Rotate point `p` about the axis through `pivot` along +Y by `deg` (right hand), as Manifold.rotate([0, deg, 0]) does. */
export function rotY(p: Vec3, pivot: Vec3, deg: number): Vec3 {
  const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), x = p[0] - pivot[0], z = p[2] - pivot[2];
  return [pivot[0] + c * x + s * z, p[1], pivot[2] - s * x + c * z];
}
/** Same about an X axis (Manifold.rotate([deg, 0, 0])). */
export function rotX(p: Vec3, pivot: Vec3, deg: number): Vec3 {
  const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), y = p[1] - pivot[1], z = p[2] - pivot[2];
  return [p[0], pivot[1] + c * y - s * z, pivot[2] + s * y + c * z];
}
export function kit(v: Scope) {
  const { M, C, keep: k } = v;
  const add = (name: string, solid: Manifold, f: Finish) => v.add(name, solid, f.role ?? 'source', f.color, f.metalness, f.roughness);
  const move = (s: Manifold, at: Vec3) => k(s.translate(at));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (a: Manifold, b: Manifold[]) => b.length ? k(a.subtract(union(b))) : a;
  const box = (min: Vec3, max: Vec3) => k(k(M.cube(sub(max, min), false)).translate(min));
  /** Solid of revolution (chamfered cylinder) from a to b, radius r. */
  const rod = (a: Vec3, b: Vec3, r: number, c0 = 0, c1 = 0, n = 32) => {
    const len = Math.hypot(...sub(b, a));
    return k(k(M.revolve([revolveProfile(r, len, c0, c1)], n)).transform(frameMatrix(sub(b, a), a)));
  };
  /** Revolve an arbitrary (radius, axial) profile along a→axis. */
  const revolve = (profile: Vec2[], a: Vec3, axis: Vec3, n = 48) => k(k(M.revolve([profile], n)).transform(frameMatrix(axis, a)));
  /** Regular prism (hex nut, hex head) from a along axis, circumradius r. */
  const prism = (a: Vec3, axis: Vec3, length: number, r: number, sides = 6, up?: Vec3) => k(k(M.cylinder(length, r, r, sides)).transform(frameMatrix(axis, a, up)));
  /** Torus-like ring (circle of radius R, tube radius r) in the plane normal to `axis`. */
  const ring = (centre: Vec3, axis: Vec3, R: number, r: number, n = 48, sweep = 360) =>
    k(k(k(k(C.circle(r, 16)).translate([R, 0])).revolve(n, sweep)).transform(frameMatrix(axis, centre)));
  /** Rectangular hollow tube along +X from x0 to x1 (cross-section w across Y, h across Z, wall t), centred on (y, z). */
  const tubeX = (x0: number, x1: number, y: number, z: number, w: number, h: number, t: number, capped = true) => {
    const outer = box([x0, y - w / 2, z - h / 2], [x1, y + w / 2, z + h / 2]);
    return capped ? outer : cut(outer, [box([x0 - 1, y - w / 2 + t, z - h / 2 + t], [x1 + 1, y + w / 2 - t, z + h / 2 - t])]);
  };
  /** Flat polygon (in X/Z) extruded along +Y from y0 by t. */
  const plateXZ = (pts: Vec2[], y0: number, t: number) => k(k(k(new C([pts])).extrude(t)).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, y0 + t, 0, 1] as Mat4));
  /** Flat polygon (in Y/Z) extruded along +X from x0 by t. */
  const plateYZ = (pts: Vec2[], x0: number, t: number) => k(k(k(new C([pts])).extrude(t)).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1] as Mat4));
  /** Rounded rectangle outline points (for plates), centred at (cx, cy). */
  const roundRect = (w: number, h: number, r: number, cx = 0, cy = 0, n = 6): Vec2[] => {
    const pts: Vec2[] = [], q = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    q.forEach(([sx, sy], i) => { for (let j = 0; j <= n; j++) { const a = (i * 90 + j * 90 / n) * Math.PI / 180; pts.push([cx + sx * (w / 2 - r) + r * Math.cos(a), cy + sy * (h / 2 - r) + r * Math.sin(a)]); } });
    return pts;
  };
  const rotate = (s: Manifold, deg: Vec3, pivot: Vec3 = [0, 0, 0]) => k(k(k(s.translate([-pivot[0], -pivot[1], -pivot[2]])).rotate(deg)).translate(pivot));
  return { M, C, k, add, move, union, cut, box, rod, revolve, prism, ring, tubeX, plateXZ, plateYZ, roundRect, rotate, parts: v.parts };
}
export type Kit = ReturnType<typeof kit>;
/** Run a builder with the kit inside a vendorSolid ownership scope. */
export const buildKit = (api: ManifoldAPI, body: (g: Kit) => void): SolidPart[] => vendorSolid(api, v => body(kit(v)));
