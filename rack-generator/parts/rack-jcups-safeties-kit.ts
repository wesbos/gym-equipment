/** Shared Manifold helpers for the brand J-cups, safeties, spotter arms and pull-up bars (#133).
 * Source frame (rack-part.ts): origin on the upright centreline at the target hole axis, +Y out of the mounting face
 * (mating face y = upright / 2), X across the face, Z up. Every intermediate is owned by the vendorSolid scope. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { MaterialRole } from '../appearance.ts';
import { vendorSolid } from './vendor-solid.ts';

export interface Finish { color: string; metalness: number; roughness: number }
export const FINISH = {
  black: { color: '#1d1e20', metalness: .35, roughness: .62 },
  texBlack: { color: '#222325', metalness: .2, roughness: .85 },
  gloss: { color: '#141517', metalness: .55, roughness: .3 },
  uhmw: { color: '#2c2d30', metalness: 0, roughness: .7 },
  zinc: { color: '#c4c8cb', metalness: .85, roughness: .28 },
  stainless: { color: '#cfd2d4', metalness: .9, roughness: .22 },
  blackZinc: { color: '#2a2b2e', metalness: .7, roughness: .35 },
} as const satisfies Record<string, Finish>;

export type Kit = ReturnType<typeof kit>;
/** Runs `build` inside a vendorSolid ownership scope with the J-cup/safety geometry helpers. */
export function buildWith(api: ManifoldAPI, build: (k: Kit) => void): SolidPart[] {
  return vendorSolid(api, s => build(kit(s)));
}
type Scope = Parameters<Parameters<typeof vendorSolid>[1]>[0];
function kit(s: Scope) {
  const { M, C, keep: k, add } = s;
  /** Axis-aligned box from its min and max corners. */
  const box = (min: Vec3, max: Vec3) => k(k(M.cube([max[0] - min[0], max[1] - min[1], max[2] - min[2]])).translate(min));
  /** Rounded-corner box (corners rounded about `axis`). */
  const rbox = (min: Vec3, max: Vec3, r: number, axis: 'x' | 'y' | 'z' = 'x') => {
    const [a, b] = axis === 'x' ? [1, 2] : axis === 'y' ? [0, 2] : [0, 1], c = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const w = max[a] - min[a], h = max[b] - min[b], rr = Math.max(.01, Math.min(r, w / 2 - .01, h / 2 - .01));
    const pts: Vec2[] = [[min[a], min[b]], [max[a], min[b]], [max[a], max[b]], [min[a], max[b]]];
    return prism(pts, min[c], max[c], axis, rr);
  };
  /** Polygon in a plane, extruded along `axis` from t0 to t1. For axis 'x' points are (y, z); 'y' → (x, z); 'z' → (x, y).
   * `round` rounds every corner by that radius. */
  const prism = (points: Vec2[], t0: number, t1: number, axis: 'x' | 'y' | 'z' = 'x', round = 0) => {
    let area = 0;
    points.forEach((p, i) => { const q = points[(i + 1) % points.length]; area += p[0] * q[1] - q[0] * p[1]; });
    let cs = k(new C([area < 0 ? [...points].reverse() : points]));
    if (round > 0) cs = k(k(cs.offset(-round, 'Round', 24)).offset(round, 'Round', 24));
    const ex = k(cs.extrude(t1 - t0));
    // Proper rotations only (determinant +1): 'x' maps (x', y', z') → (z', x', y'); 'y' maps it to (x', t1 - z', y').
    if (axis === 'x') return k(ex.transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, t0, 0, 0, 1]));
    if (axis === 'y') return k(ex.transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, t1, 0, 1]));
    return k(ex.translate([0, 0, t0]));
  };
  /** Cylinder between two points (any direction). */
  const rod = (a: Vec3, b: Vec3, r: number, segments = 32) => {
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...v);
    const c = k(M.cylinder(l, r, r, segments));
    return k(k(c.rotate([0, Math.acos(v[2] / l) * 180 / Math.PI, Math.atan2(v[1], v[0]) * 180 / Math.PI])).translate(a));
  };
  /** Tube (hollow cylinder) between two points. */
  const pipe = (a: Vec3, b: Vec3, r: number, wall: number, segments = 40) => k(rod(a, b, r, segments).subtract(rod(a, b, r - wall, segments)));
  /** Solid of revolution about the local axis from a (radius, t) half profile, placed from point `a` along unit axis `dir`. */
  const revolve = (profile: Vec2[], a: Vec3, dir: 'x' | 'y' | 'z', segments = 40) => {
    const pts = profile.map(([r, t]) => [Math.max(r, 0), t] as Vec2);
    const sol = k(M.revolve([pts], segments));
    const turned = dir === 'z' ? sol : dir === 'y' ? k(sol.rotate([-90, 0, 0])) : k(sol.rotate([0, 90, 0]));
    return k(turned.translate(a));
  };
  /** Swept circular path through points with ball joints (bent tube). */
  const path = (points: Vec3[], r: number, segments = 32) => {
    const parts: Manifold[] = [];
    for (let i = 1; i < points.length; i++) parts.push(rod(points[i - 1], points[i], r, segments));
    for (let i = 1; i < points.length - 1; i++) parts.push(k(k(M.sphere(r, segments)).translate(points[i])));
    return k(M.union(parts));
  };
  const union = (parts: Manifold[]) => parts.length === 1 ? parts[0] : k(M.union(parts));
  const minus = (a: Manifold, ...b: Manifold[]) => b.length ? k(M.difference([a, ...b])) : a;
  const put = (name: string, solid: Manifold, f: Finish, role: MaterialRole = 'source') => add(name, solid, role, f.color, f.metalness, f.roughness);
  /** Hex bolt head (+ washer) whose axis points along `dir` from `at` (head sits on the plane through `at`). */
  const hexHead = (at: Vec3, dir: 'x' | 'y' | 'z' | '-x' | '-y' | '-z', across: number, height: number) => {
    const circ = across / Math.sqrt(3);
    const h = k(M.cylinder(height, circ, circ, 6)), w = k(k(M.cylinder(1.5, across * .62 + 2, across * .62 + 2, 24)).translate([0, 0, -1.5]));
    let s = k(M.union([h, w]));
    const rot: Record<string, Vec3> = { z: [0, 0, 0], '-z': [180, 0, 0], y: [-90, 0, 0], '-y': [90, 0, 0], x: [0, 90, 0], '-x': [0, -90, 0] };
    s = k(s.rotate(rot[dir]));
    return k(s.translate(at));
  };
  return { ...s, box, rbox, prism, rod, pipe, revolve, path, union, minus, put, hexHead, k };
}
export const inch = (v: number) => v * 25.4;
/** Mounting-face plane of the builder frame. */
export const faceOf = (p: NumericParams) => (p.upright ?? 75) / 2;
/** Face width along local X (differs from `upright` on the narrow/wide faces of 2x3 posts). */
export const widthOf = (p: NumericParams) => p.uprightWidth ?? p.upright ?? 75;
