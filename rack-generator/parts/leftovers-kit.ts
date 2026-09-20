/** Shared Manifold helpers for the leftovers family (#176). Builds on the wall-storage Kit (material-grouped solids with
 * owned-memory cleanup) and adds the extrusions and beams the floor and wall leftovers need. */
import type { CrossSection, Manifold, Mat4 } from 'manifold-3d';
import type { SolidPart, Vec2, Vec3 } from '../types.ts';
import { Kit, finish, type Finish } from './wall-storage-kit.ts';
export { Kit, kit, frame, finish, olympicBar, ZINC, type Finish } from './wall-storage-kit.ts';

/** Profile (a, b) extruded along +X from x0: occupies x ∈ [x0, x0 + t], y = a, z = b (scaled by `scaleEnd` at the +X end). */
export function alongX(k: Kit, c: CrossSection, t: number, x0 = 0, scaleEnd = 1) {
  const m: Mat4 = [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1];
  return k.k(k.k(scaleEnd === 1 ? c.extrude(t) : c.extrude(t, 1, 0, [scaleEnd, scaleEnd])).transform(m));
}
/** Profile (a, b) extruded along +Z from z0: occupies z ∈ [z0, z0 + t], x = a, y = b. */
export const alongZ = (k: Kit, c: CrossSection, t: number, z0 = 0) => k.k(k.k(c.extrude(t)).translate([0, 0, z0]));
/** Rounded rectangle section centred at `c`. */
export const roundRect = (k: Kit, c: Vec2, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2 - .01, h / 2 - .01);
  return k.offset(k.rect([c[0] - w / 2 + rr, c[1] - h / 2 + rr], [c[0] + w / 2 - rr, c[1] + h / 2 - rr]), rr);
};
/** Rectangular beam of section w (across) × h from `a` to `b`. Horizontal beams keep h vertical. */
export function beam(k: Kit, a: Vec3, b: Vec3, w: number, h: number) {
  const d = b.map((v, i) => v - a[i]) as Vec3, len = Math.hypot(...d);
  const box = k.k(k.k(k.api.Manifold.cube([w, h, len], true)).translate([0, 0, len / 2]));
  return k.place(box, d, a);
}
/** Torus around local Z (ring radius R, tube radius r). */
export const torus = (k: Kit, R: number, r: number, n = 40, m = 16) => k.k(k.k(k.k(k.api.CrossSection.circle(r, m)).translate([R, 0])).revolve(n));
export const hull2 = (k: Kit, parts: CrossSection[]) => k.k(k.api.CrossSection.hull(parts));
export const intersect = (k: Kit, a: Manifold, b: Manifold) => k.k(a.intersect(b));
/** Applies a rigid transform to finished parts (new solids; the originals are deleted). */
export function transformParts(parts: SolidPart[], m: Mat4): SolidPart[] {
  return parts.map(p => { const solid = p.solid.transform(m); p.solid.delete(); return { ...p, solid }; });
}
/** Common finishes. */
export const powder = (name: string, color = '#1c1d1f', roughness = .7, metalness = .3): Finish => finish(name, 'source', color, metalness, roughness);
export const BADGE = finish('Laser-cut logo badge', 'source', '#6d7074', .3, .55);
