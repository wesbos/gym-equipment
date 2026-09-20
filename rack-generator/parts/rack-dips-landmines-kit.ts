/** Shared solid helpers for the dips & landmines builders (#134). Everything allocates through the vendorSolid scope
 * (`keep`), so intermediates are released with the scope. Source frame (rack-part.ts): origin on the upright centreline
 * at the hole axis, +Y out of the mounting face, Z up, X across the face. */
import type { CrossSection, Manifold, Vec2, Vec3 } from '../types.ts';
import type { vendorSolid } from './vendor-solid.ts';
import { revolveProfile } from './rogue-band-pegs.ts';
export type Scope = Parameters<Parameters<typeof vendorSolid>[1]>[0];
export function kit(s: Scope) {
  const { M, C, keep: k } = s;
  /** Revolved cylinder along +Y from y0 to y1 at (x, z), chamfered c0/c1 at its ends. */
  const alongY = (x: number, z: number, y0: number, y1: number, r: number, c0 = 0, c1 = 0, n = 48) =>
    k(k(k(M.revolve([revolveProfile(r, y1 - y0, c0, c1)], n)).rotate([-90, 0, 0])).translate([x, y0, z]));
  /** Same along +X at (y, z). */
  const alongX = (y: number, z: number, x0: number, x1: number, r: number, c0 = 0, c1 = 0, n = 48) =>
    k(k(k(M.revolve([revolveProfile(r, x1 - x0, c0, c1)], n)).rotate([0, 90, 0])).translate([x0, y, z]));
  /** Same along +Z at (x, y). */
  const alongZ = (x: number, y: number, z0: number, z1: number, r: number, c0 = 0, c1 = 0, n = 48) =>
    k(k(M.revolve([revolveProfile(r, z1 - z0, c0, c1)], n)).translate([x, y, z0]));
  /** Hollow tube (outer r, inner ri) along X, Y or Z between a0 and a1; `at` is the axis offset in the other two axes. */
  const tube = (axis: 'x' | 'y' | 'z', at: [number, number], a0: number, a1: number, r: number, ri: number, n = 48) => {
    const ring = k(k(C.circle(r, n)).subtract(k(C.circle(ri, n))));
    const solid = k(ring.extrude(a1 - a0));
    if (axis === 'z') return k(solid.translate([at[0], at[1], a0]));
    if (axis === 'x') return k(k(solid.rotate([0, 90, 0])).translate([a0, at[0], at[1]]));
    return k(k(solid.rotate([-90, 0, 0])).translate([at[0], a0, at[1]]));
  };
  /** 2D section in the XZ plane (x, z) extruded along +Y from y0 to y1. */
  const plateXZ = (cs: CrossSection, y0: number, y1: number) => k(k(k(cs.extrude(y1 - y0)).rotate([90, 0, 0])).translate([0, y1, 0]));
  /** 2D section in the XY plane extruded along +Z from z0 to z1. */
  const plateXY = (cs: CrossSection, z0: number, z1: number) => k(k(cs.extrude(z1 - z0)).translate([0, 0, z0]));
  /** 2D section in the YZ plane (y, z) extruded along +X from x0 to x1. */
  const plateYZ = (cs: CrossSection, x0: number, x1: number) => k(k(k(cs.extrude(x1 - x0)).rotate([90, 0, 90])).translate([x0, 0, 0]));
  const rect = (x0: number, y0: number, x1: number, y1: number) => k(k(C.square([x1 - x0, y1 - y0])).translate([x0, y0]));
  const circle = (x: number, y: number, r: number, n = 40) => k(k(C.circle(r, n)).translate([x, y]));
  const union2 = (parts: CrossSection[]) => k(C.union(parts));
  /** Convex hull of 2D pieces: blends a round end into a straight tab without the tangent slivers a union leaves. */
  const hull2 = (parts: CrossSection[]) => k(C.hull(parts));
  /** Rounded tongue: a circle of radius r at (cx, cy) blended into a rectangle reaching `to` along +x. */
  const tongue = (cx: number, cy: number, r: number, to: number) => hull2([circle(cx, cy, r), rect(cx, cy - r, to, cy + r)]);
  /** Rounded rectangle (corner radius r) from an inset square offset back out, so no tangent seams. */
  const roundRect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 32) => k(rect(x0 + r, y0 + r, x1 - r, y1 - r).offset(r, 'Round', 2, n));
  /** Hex prism (across flats `af`) along an axis: rotated so a flat faces up. */
  const hex = (af: number, h: number) => k(M.cylinder(h, af / Math.sqrt(3), af / Math.sqrt(3), 6));
  const hexY = (x: number, z: number, y0: number, y1: number, af: number) => k(k(k(hex(af, y1 - y0).rotate([0, 0, 30])).rotate([-90, 0, 0])).translate([x, y0, z]));
  const hexZ = (x: number, y: number, z0: number, z1: number, af: number) => k(hex(af, z1 - z0).translate([x, y, z0]));
  /** Lobed star knob (acetal hand nut / star knob) in a plane, `lobes` scallops cut from the rim. */
  const star = (r: number, lobes = 5) => {
    const cuts = Array.from({ length: lobes }, (_, i) => circle(Math.cos((i + .5) * 2 * Math.PI / lobes) * r * 1.08, Math.sin((i + .5) * 2 * Math.PI / lobes) * r * 1.08, r * .36, 24));
    return k(k(C.circle(r, 48)).subtract(union2(cuts)));
  };
  const starY = (x: number, z: number, y0: number, y1: number, r: number, lobes = 5) => k(k(k(star(r, lobes).extrude(y1 - y0)).rotate([-90, 0, 0])).translate([x, y0, z]));
  const starZ = (x: number, y: number, z0: number, z1: number, r: number, lobes = 5) => k(k(star(r, lobes).extrude(z1 - z0)).translate([x, y, z0]));
  /** Round bar through a polyline of points (hulled spheres at the joints), diameter d. */
  const sphere = (at: Vec3, d: number, n = 24) => k(k(M.sphere(d / 2, n)).translate(at));
  const bent = (points: Vec3[], d: number, n = 24) => k(M.union(points.slice(1).map((p, i) => k(M.hull([sphere(points[i], d, n), sphere(p, d, n)])))));
  /** Straight round bar between two points (cylinder, flat ends). */
  const rod = (a: Vec3, b: Vec3, d: number, n = 32) => {
    const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...v);
    const pitch = Math.acos(Math.max(-1, Math.min(1, v[2] / L))) * 180 / Math.PI, yaw = Math.atan2(v[1], v[0]) * 180 / Math.PI;
    return k(k(k(M.cylinder(L, d / 2, d / 2, n)).rotate([0, pitch, yaw])).translate(a));
  };
  /** Square/rect tube between two points (hull of two thin boxes), outer w x h, oriented with `h` along world Z for
   * horizontal runs. Good enough for straight welded arms. */
  const bar = (a: Vec3, b: Vec3, w: number, h: number) => {
    const end = (p: Vec3) => k(k(M.cube([w, w, h], true)).translate(p));
    return k(M.hull([end(a), end(b)]));
  };
  /** Polygon from points in either winding (normalised counter-clockwise). */
  const poly = (points: Vec2[]) => { const area = points.reduce((a, [x, y], i) => { const [u, v] = points[(i + 1) % points.length]; return a + x * v - u * y; }, 0); return k(new C([area < 0 ? [...points].reverse() : points])); };
  return { alongX, alongY, alongZ, tube, plateXZ, plateXY, plateYZ, rect, circle, union2, hull2, roundRect, tongue, hexY, hexZ, star, starY, starZ, sphere, bent, rod, bar, poly };
}
/** Re-pose every solid added after `from` (a joint group); `move` must return a solid it already kept. */
export function pose(s: Scope, from: number, move: (m: Manifold) => Manifold) {
  for (const part of s.parts.slice(from)) part.solid = move(part.solid);
}
