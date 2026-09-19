/** Shared Manifold toolkit for the ergs family (rowers, ski ergs, air bikes).
 * Every intermediate solid is tracked and deleted in `dispose()`; only the grouped solids returned by `done()` survive.
 * Build axes: X across the machine (+X = the user's right), Y along it (+Y = the fan / flywheel end), Z up, millimetres. */
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
export interface Finish { role: SolidPart['role']; color: string; metalness?: number; roughness?: number; authored?: boolean }
export type Axis = 'x' | 'y' | 'z';
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
/** Points on an arc in a 2D plane, degrees, inclusive. */
export const arc = (c: Vec2, r: number, a0: number, a1: number, n: number): Vec2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; });
export const inch = (v: number) => v * 25.4;
/** Counter-clockwise copy of a simple polygon (CrossSection drops clockwise contours). */
const ccw = (pts: Vec2[]): Vec2[] => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) < 0 ? [...pts].reverse() : pts;

export function createKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api;
  const owned: (Manifold | CrossSection)[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const groups = new Map<string, { finish: Finish; solids: Manifold[] }>();
  const out: SolidPart[] = [];
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  /** Maps a solid built along +Z at the origin onto the segment a→b; its local X follows `side` (default world X). */
  const frame = (s: Manifold, a: Vec3, b: Vec3, side: Vec3 = [1, 0, 0]) => {
    const d = norm(sub(b, a));
    let x = sub(side, d.map(v => v * (side[0] * d[0] + side[1] * d[1] + side[2] * d[2])) as Vec3);
    if (Math.hypot(...x) < 1e-6) x = Math.abs(d[1]) < .9 ? [0, 1, 0] : [0, 0, 1];
    x = norm(x); const y = cross(d, x);
    return k(s.transform([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, d[0], d[1], d[2], 0, a[0], a[1], a[2], 1]));
  };
  const len = (a: Vec3, b: Vec3) => Math.hypot(...sub(b, a));
  /** Re-aim a Z-axis solid (centred on the origin) along an axis and move it to `at`. */
  const orient = (s: Manifold, axis: Axis, at: Vec3) => move(axis === 'z' ? s : k(s.rotate(axis === 'x' ? [0, 90, 0] : [-90, 0, 0])), at);
  const kit = {
    api, M, C, k, move,
    rotate: (s: Manifold, r: Vec3) => k(s.rotate(r)),
    scale: (s: Manifold, v: Vec3) => k(s.scale(v)),
    mirror: (s: Manifold, n: Vec3 = [1, 0, 0]) => k(s.mirror(n)),
    union: (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s)),
    cut: (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s,
    inter: (a: Manifold, b: Manifold) => k(M.intersection([a, b])),
    hull: (s: (Manifold | Vec3)[]) => k(M.hull(s)),
    /** Axis-aligned box by centre and size. */
    box: (size: Vec3, at: Vec3) => move(k(M.cube(size, true)), at),
    /** Axis-aligned box between two corners. */
    span: (a: Vec3, b: Vec3) => move(k(M.cube([Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])], true)), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]),
    sphere: (at: Vec3, d: number, seg = 16) => move(k(M.sphere(d / 2, seg)), at),
    /** Round rod from a to b. */
    rod: (a: Vec3, b: Vec3, d: number, seg = 20) => frame(k(M.cylinder(len(a, b), d / 2, d / 2, seg)), a, b),
    /** Tapered rod (cone frustum) from a (da) to b (db). */
    cone: (a: Vec3, b: Vec3, da: number, db: number, seg = 24) => frame(k(M.cylinder(len(a, b), da / 2, db / 2, seg)), a, b),
    /** Rectangular bar from a to b: `w` along `side` (default X), `h` across it. Optional corner radius. */
    bar: (a: Vec3, b: Vec3, w: number, h: number, r = 0, side: Vec3 = [1, 0, 0]) => {
      const l = len(a, b), rr = Math.min(r, w / 2 - .1, h / 2 - .1);
      const s = rr > 0 ? k(k(k(C.square([w - 2 * rr, h - 2 * rr], true)).offset(rr, 'Round', 2, 12)).extrude(l)) : move(k(M.cube([w, h, l], true)), [0, 0, l / 2]);
      return frame(s, a, b, side);
    },
    /** Bent tube through a polyline, with spheres at the joints. */
    pipe: (pts: Vec3[], d: number, seg = 18) => {
      const parts: Manifold[] = [];
      for (let i = 0; i < pts.length - 1; i++) parts.push(frame(k(M.cylinder(len(pts[i], pts[i + 1]), d / 2, d / 2, seg)), pts[i], pts[i + 1]));
      for (let i = 1; i < pts.length - 1; i++) parts.push(move(k(M.sphere(d / 2, seg)), pts[i]));
      return parts.length === 1 ? parts[0] : k(M.union(parts));
    },
    /** Cylinder of thickness t centred on `at`, axis along x/y/z. */
    disc: (at: Vec3, axis: Axis, d: number, t: number, seg = 48) => orient(k(M.cylinder(t, d / 2, d / 2, seg, true)), axis, at),
    ring: (at: Vec3, axis: Axis, dOut: number, dIn: number, t: number, seg = 48) =>
      orient(k(M.difference([k(M.cylinder(t, dOut / 2, dOut / 2, seg, true)), k(M.cylinder(t + 2, dIn / 2, dIn / 2, seg, true))])), axis, at),
    /** Round wire hoop (torus) of centreline diameter D. */
    hoop: (at: Vec3, axis: Axis, D: number, wire: number, seg = 48, wseg = 8) =>
      orient(k(k(k(C.circle(wire / 2, wseg)).translate([D / 2, 0])).revolve(seg)), axis, at),
    /** Solid of revolution from an [r, h] outline (h along the axis, centred on `at`). */
    lathe: (outline: Vec2[], at: Vec3, axis: Axis, seg = 48) => orient(k(k(new C([ccw(outline)])).revolve(seg)), axis, at),
    /** Polygon in the YZ plane ([y, z] points) extruded along X from x0 by thickness t; optional rounding. */
    plate: (pts: Vec2[], x0: number, t: number, round = 0) => {
      let cs = k(new C([ccw(pts)]));
      if (round > 0) cs = k(k(cs.offset(-round, 'Round', 2, 12)).offset(round, 'Round', 2, 12));
      return k(k(cs.extrude(t)).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1]));
    },
    /** Polygon in the XY plane extruded along Z from z0 by t (floor plates, platforms). */
    slab: (pts: Vec2[], z0: number, t: number, round = 0) => {
      let cs = k(new C([ccw(pts)]));
      if (round > 0) cs = k(k(cs.offset(-round, 'Round', 2, 12)).offset(round, 'Round', 2, 12));
      return move(k(cs.extrude(t)), [0, 0, z0]);
    },
    /** Rounded rectangle slab: w (X) × l (Y) × h (Z) resting on z0, centred at [x, y]. */
    pad: (w: number, l: number, h: number, r: number, at: Vec3) => {
      const rr = Math.min(r, w / 2 - .5, l / 2 - .5);
      return move(k(k(k(C.square([w - 2 * rr, l - 2 * rr], true)).offset(rr, 'Round', 2, 16)).extrude(h)), at);
    },
    /** Rubber tyre + hub wheel on an X axle. */
    wheel: (at: Vec3, d: number, w: number, hub = .55, seg = 32) => ({
      tyre: orient(k(M.difference([k(M.cylinder(w, d / 2, d / 2, seg, true)), k(M.cylinder(w + 2, d * hub / 2, d * hub / 2, seg, true))])), 'x', at),
      hub: orient(k(M.cylinder(w * .9, d * hub / 2, d * hub / 2, seg, true)), 'x', at),
    }),
    /** Add solids to a named material group. */
    add(name: string, finish: Finish, ...solids: Manifold[]) {
      const g = groups.get(name) ?? { finish, solids: [] }; g.solids.push(...solids); groups.set(name, g);
    },
    /** Apply a transform to every solid added so far to the given groups (used for poses). */
    transformGroups(names: string[], fn: (s: Manifold) => Manifold) {
      for (const n of names) { const g = groups.get(n); if (g) g.solids = g.solids.map(fn); }
    },
    groupNames: () => [...groups.keys()],
    /** Union each group, centre the whole build on its XY bounding box with its lowest point on the floor. */
    done(label: string): SolidPart[] {
      const merged = [...groups].map(([name, g]) => ({ name, finish: g.finish, solid: g.solids.length === 1 ? g.solids[0] : k(M.union(g.solids)) }));
      let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (const m of merged) { const b = m.solid.boundingBox(); min = min.map((v, i) => Math.min(v, b.min[i])); max = max.map((v, i) => Math.max(v, b.max[i])); }
      const shift: Vec3 = [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]];
      for (const m of merged) {
        const solid = k(m.solid.translate(shift));
        if (solid.isEmpty() || solid.status() !== 'NoError') throw Error(`Invalid ${label} ${m.name}`);
        out.push({ name: m.name, solid, role: m.finish.role, color: m.finish.color, metalness: m.finish.metalness ?? 0, roughness: m.finish.roughness ?? .55, ...(m.finish.authored ? { authoredFastenerFinish: true } : {}) });
      }
      return out;
    },
    /** Free every tracked solid; the returned parts survive only after a successful build. */
    dispose(success: boolean) { const keep = new Set(success ? out.map(p => p.solid) : []); for (const s of owned.reverse()) if (!keep.has(s as Manifold)) s.delete(); },
  };
  return kit;
}
export type Kit = ReturnType<typeof createKit>;
/** Standard builder wrapper: every intermediate is freed, even when a build throws. */
export function withKit(api: ManifoldAPI, label: string, body: (K: Kit) => void): SolidPart[] {
  const K = createKit(api);
  let success = false;
  try { body(K); const parts = K.done(label); success = true; return parts; }
  finally { K.dispose(success); }
}
