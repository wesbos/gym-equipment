/** Shared Manifold helpers for the benches family (parts/benches-*.ts). Every intermediate solid is owned by the kit
 * and deleted in `buildBench`'s finally block; only the grouped output solids survive.
 * Axes: X across the bench, +Y toward the head end, Z up, millimetres. */
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
import type { AttachmentGeom, Pt } from '../floor-parts/benches-specs.ts';
export type Role = SolidPart['role'];
export interface Finish { color: string; role: Role; metalness?: number; roughness?: number }
export const VINYL = (color = '#161718'): Finish => ({ color, role: 'liner', metalness: 0, roughness: .9 });
export const RUBBER: Finish = { color: '#151617', role: 'liner', metalness: 0, roughness: .92 };
export const STEEL = (color: string, roughness = .55, metalness = .25): Finish => ({ color, role: 'source', metalness, roughness });
export const STAINLESS: Finish = { color: '#b9bcbf', role: 'source', metalness: .85, roughness: .32 };
export const ZINC: Finish = { color: '#2f3134', role: 'fastener', metalness: .8, roughness: .3 };
export const CHROME: Finish = { color: '#d7dadd', role: 'source', metalness: .95, roughness: .18 };
export type Kit = ReturnType<typeof makeKit>;
/** Rotate a (y, z) point about `pivot` by `deg` degrees (positive lifts +Y toward +Z). */
export function makeKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api;
  const owned: (Manifold | CrossSection)[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const groups = new Map<string, { finish: Finish; solids: Manifold[] }>();
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const rot = (s: Manifold, v: Vec3) => k(s.rotate(v));
  const union = (s: Manifold[]) => k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  /** Axis-aligned box from its size and centre. */
  const box = (size: Vec3, at: Vec3) => move(k(M.cube(size, true)), at);
  /** Axis-aligned box between two corners. */
  const span = (a: Vec3, b: Vec3) => box([Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
  /** Orient a solid built along +Z (from the origin) onto segment a→b. */
  const orient = (s: Manifold, a: Vec3, b: Vec3) => {
    const v = b.map((x, i) => x - a[i]) as Vec3, len = Math.hypot(...v);
    return move(rot(s, [0, Math.acos(Math.max(-1, Math.min(1, v[2] / len))) * 180 / Math.PI, Math.atan2(v[1], v[0]) * 180 / Math.PI]), a);
  };
  const len = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  /** Rectangular tube a→b with rounded corners. `h` lies in the vertical plane through the tube (along X when the tube is
   * vertical), `w` is the horizontal width across it. Solid section with a flush end face (steel caps). */
  const tube = (a: Vec3, b: Vec3, h: number, w: number, r = Math.min(5, h / 4, w / 4)) => {
    const sec = k(k(C.square([h - 2 * r, w - 2 * r], true)).offset(r, 'Round', 2, 16));
    return orient(k(sec.extrude(len(a, b))), a, b);
  };
  /** Round bar a→b. */
  const cyl = (a: Vec3, b: Vec3, d: number, seg = 32) => orient(k(M.cylinder(len(a, b), d / 2, d / 2, seg)), a, b);
  /** Tube in the YZ plane at fixed x from (y,z) points. */
  const tubeYZ = (x: number, p: Pt, q: Pt, h: number, w: number) => tube([x, p[0], p[1]], [x, q[0], q[1]], h, w);
  /** Flat plate in the YZ plane (outline in (y,z)), `t` thick centred on x. */
  const plateYZ = (x: number, pts: Pt[], t: number, holes: Pt[][] = []) => {
    const cs = k(new C([pts.map(([y, z]) => [y, z] as [number, number]), ...holes.map(h => h.map(([y, z]) => [y, z] as [number, number]))], 'EvenOdd'));
    // Extrude along +Z, then map (u, v, w) → (y, z, x): Rx(90) then Rz(90).
    return move(rot(k(cs.extrude(t)), [90, 0, 90]), [x - t / 2, 0, 0]);
  };
  /** Plan outline (x,y) extruded up from z0 by h. */
  const planSlab = (pts: Pt[], z0: number, h: number, round = 0) => {
    let cs = k(new C([pts.map(p => [p[0], p[1]] as [number, number])], 'EvenOdd'));
    if (round > 0) cs = k(k(cs.offset(-round, 'Round', 2, 24)).offset(round, 'Round', 2, 24));
    return move(k(cs.extrude(h)), [0, 0, z0]);
  };
  /** Upholstered pad: convex plan outline (x,y), rounded plan corners `r`, top edges rounded by `e`. Bottom at z0. */
  const pad = (pts: Pt[], t: number, r: number, e: number, z0 = 0) => {
    const base = k(k(k(new C([pts.map(p => [p[0], p[1]] as [number, number])], 'EvenOdd')).offset(-r, 'Round', 2, 24)).offset(r, 'Round', 2, 24));
    const layers: Manifold[] = [move(k(base.extrude(Math.max(.5, t - e))), [0, 0, z0])];
    for (let i = 1; i <= 4; i++) {
      const a = i / 4 * Math.PI / 2, inset = e * (1 - Math.cos(a)), z = t - e + e * Math.sin(a);
      layers.push(move(k(k(base.offset(-inset, 'Round', 2, 24)).extrude(.4)), [0, 0, z0 + z - .4]));
    }
    return k(M.hull(layers));
  };
  /** Block pad rounded on every edge (radius e), bottom at z0: for attachment pads whose extent must be exact when tilted. */
  const padRound = (pts: Pt[], t: number, r: number, e: number, z0 = 0) => {
    const base = k(k(k(new C([pts.map(p => [p[0], p[1]] as [number, number])], 'EvenOdd')).offset(-r, 'Round', 2, 24)).offset(r, 'Round', 2, 24));
    const layers: Manifold[] = [];
    for (let i = 0; i <= 4; i++) {
      const a = i / 4 * Math.PI / 2, inset = e * (1 - Math.cos(a)), ring = k(base.offset(-inset, 'Round', 2, 24));
      layers.push(move(k(ring.extrude(.4)), [0, 0, z0 + e - e * Math.sin(a)]), move(k(ring.extrude(.4)), [0, 0, z0 + t - e + e * Math.sin(a) - .4]));
    }
    return k(M.hull(layers));
  };
  /** Round bar along a polyline with ball joints (so its extent is exactly every vertex ± d/2). */
  const capsules = (pts: Vec3[], d: number, seg = 24) => {
    const parts: Manifold[] = pts.map(p => move(k(M.sphere(d / 2, seg)), p));
    for (let i = 1; i < pts.length; i++) parts.push(cyl(pts[i - 1], pts[i], d, seg));
    return union(parts);
  };
  /** Rounded rectangle pad centred at (cx, cy) in plan. */
  const rectPts = (w: number, l: number, cx = 0, cy = 0): Pt[] => [[cx - w / 2, cy - l / 2], [cx + w / 2, cy - l / 2], [cx + w / 2, cy + l / 2], [cx - w / 2, cy + l / 2]];
  /** Tapered plan outline along Y: width w0 at y0, w1 at y1. */
  const taperPts = (y0: number, y1: number, w0: number, w1: number): Pt[] => [[-w0 / 2, y0], [w0 / 2, y0], [w1 / 2, y1], [-w1 / 2, y1]];
  /** Wheel with tyre and hub on an axle along X at (y, z). */
  const wheel = (x: number, y: number, z: number, d: number, w: number, tyre: Manifold[], hub: Manifold[]) => {
    tyre.push(cut(cyl([x - w / 2, y, z], [x + w / 2, y, z], d, 40), [cyl([x - w, y, z], [x + w, y, z], d * .55, 24)]));
    hub.push(cyl([x - w / 2 + 1, y, z], [x + w / 2 - 1, y, z], d * .56, 24), cyl([x - w / 2 - 3, y, z], [x + w / 2 + 3, y, z], Math.max(10, d * .2), 12));
  };
  /** Hex bolt head facing ±X at (x,y,z). */
  const boltX = (x: number, y: number, z: number, dir: 1 | -1, d = 18, h = 7) => orient(k(M.cylinder(h, d / 2, d / 2, 6)), [x, y, z], [x + dir * h, y, z]);
  const add = (name: string, finish: Finish, ...solids: Manifold[]) => {
    const g = groups.get(name) ?? { finish, solids: [] };
    g.solids.push(...solids.filter(s => !s.isEmpty())); groups.set(name, g);
  };
  /** Transform helper: rotate a solid about the X axis through (y,z) pivot by deg. */
  const hinge = (s: Manifold, pivot: Pt, deg: number) => move(rot(move(s, [0, -pivot[0], -pivot[1]]), [deg, 0, 0]), [0, pivot[0], pivot[1]]);
  const collect = (shift: Vec3 = [0, 0, 0]): SolidPart[] => {
    const out: SolidPart[] = [];
    for (const [name, g] of groups) {
      if (!g.solids.length) continue;
      // Floor-standing scenery: nothing may dip below z = 0 (raked tube ends are trimmed flush with the floor).
      const solid = move(k(union(g.solids).trimByPlane([0, 0, 1], 0)), shift);
      if (solid.isEmpty() || solid.status() !== 'NoError') throw Error(`Invalid bench solid ${name}`);
      const part: SolidPart = { name, solid, role: g.finish.role, color: g.finish.color, metalness: g.finish.metalness ?? 0, roughness: g.finish.roughness ?? .55 };
      if (g.finish.role === 'fastener') part.authoredFastenerFinish = true;
      out.push(part);
    }
    return out;
  };
  const self = { api, M, C, k, owned, move, rot, union, cut, box, span, orient, tube, cyl, tubeYZ, plateYZ, planSlab, pad, padRound, capsules, rectPts, taperPts, wheel, boltX, add, hinge, collect };
  return self;
}
/** Solids for pad-attached geometry (tubes, roller pairs, block pads), before the pad rotation is applied. */
export function geomSolids(kit: Kit, g: AttachmentGeom) {
  const out = { frame: [] as Manifold[], chrome: [] as Manifold[], grip: [] as Manifold[], rollers: [] as Manifold[], shafts: [] as Manifold[], pads: [] as Manifold[] };
  for (const t of g.tubes) out[t.finish].push(kit.capsules(t.pts, t.d));
  for (const r of g.rollers) {
    const x1 = r.gap + r.len;
    out.shafts.push(kit.cyl([-(x1 + 12), r.y, r.z], [x1 + 12, r.y, r.z], 25, 16));
    for (const x of [-1, 1]) {
      out.rollers.push(kit.cyl([x * r.gap, r.y, r.z], [x * x1, r.y, r.z], r.d, 36));
      out.shafts.push(kit.cyl([x * x1, r.y, r.z], [x * (x1 + 8), r.y, r.z], r.d * .42, 20));
    }
  }
  for (const b of g.pads) {
    const block = kit.padRound(kit.taperPts(-b.len / 2, b.len / 2, b.w, b.wEnd ?? b.w), b.t, 20, b.e, -b.t / 2);
    out.pads.push(kit.move(kit.rot(block, [b.tilt, 0, 0]), [0, b.c[0], b.c[1]]));
  }
  return out;
}
/** Build with a fresh kit; every intermediate solid is freed, output solids survive. */
export function buildBench(api: ManifoldAPI, fn: (kit: Kit) => SolidPart[]): SolidPart[] {
  const kit = makeKit(api); let out: SolidPart[] = [];
  try { out = fn(kit); return out; }
  finally { const keep = new Set(out.map(p => p.solid)); for (const s of kit.owned.reverse()) if (!keep.has(s as Manifold)) s.delete(); }
}
