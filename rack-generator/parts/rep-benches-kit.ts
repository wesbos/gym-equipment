/** Shared Manifold toolkit for the REP bench family (rep-benches*.ts builders). Z up, mm. Bench axes: X across,
 * +Y toward the back-pad head end, origin on the floor at the footprint centre. */
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
export type Role = SolidPart['role'];
export type Pt = [number, number];
/** [display name, role, colour, metalness, roughness] */
export type Material = readonly [string, Role, string, number, number];
export const MAT = {
  frame: ['Powder-coated 11-gauge steel frame', 'frame', '#353739', 0, .55],
  vinyl: ['CleanGrip™ vinyl pads', 'liner', '#17181a', 0, .92],
  piping: ['Pad piping seams', 'liner', '#0d0e0f', 0, .7],
  board: ['Pad backing boards', 'source', '#1c1d1f', .2, .6],
  rubber: ['Grooved rubber feet and end caps', 'liner', '#151617', 0, .88],
  wheels: ['Transport wheels', 'liner', '#111213', 0, .6],
  hubs: ['Wheel hubs', 'source', '#8f9396', .7, .35],
  hardware: ['Black zinc hardware', 'fastener', '#2c2e30', .8, .32],
  stainless: ['Brushed stainless trim', 'source', '#b9bdc0', .9, .3],
  knurl: ['Knurled stainless handle', 'handle', '#aeb2b5', .9, .36],
  grip: ['Rubber handle grips', 'handle', '#18191a', 0, .8],
  logo: ['REP logo plates', 'source', '#e9e9e6', .1, .55],
  uhmw: ['Storage stand liner', 'liner', '#101112', 0, .9],
  foam: ['Foam roller pads', 'liner', '#161718', 0, .9],
} as const satisfies Record<string, Material>;
/** Same 0.1 mm rounding as the metadata so builds match published footprints exactly. */
export const inch = (v: number) => Math.round(v * 25.4 * 10) / 10;
/** Rotate a Y/Z point about `pivot` by `deg` (positive raises +Y). */
export const rotYZ = ([y, z]: Pt, [py, pz]: Pt, deg: number): Pt => {
  const a = deg * Math.PI / 180, dy = y - py, dz = z - pz;
  return [py + dy * Math.cos(a) - dz * Math.sin(a), pz + dy * Math.sin(a) + dz * Math.cos(a)];
};
/** Point on the line `a + t·dir` at distance `len` from `c`, taking the far (+t) root: where a fixed-length support
 * link from an articulated pad bracket meets a ladder or spine. */
export function stationOnLine(c: Pt, len: number, a: Pt, dir: Pt, near?: Pt): Pt {
  const n = Math.hypot(...dir), u: Pt = [dir[0] / n, dir[1] / n], d: Pt = [a[0] - c[0], a[1] - c[1]];
  const b = u[0] * d[0] + u[1] * d[1], disc = b * b - (d[0] ** 2 + d[1] ** 2 - len * len);
  if (disc < 0) throw Error('Support link cannot reach its ladder.');
  const roots = [-b + Math.sqrt(disc), -b - Math.sqrt(disc)].map(t => [a[0] + t * u[0], a[1] + t * u[1]] as Pt);
  // Default: the far (+t) root; with `near`, the root closest to that reference (e.g. the flat station).
  return near ? roots.reduce((m, r) => Math.hypot(r[0] - near[0], r[1] - near[1]) < Math.hypot(m[0] - near[0], m[1] - near[1]) ? r : m) : roots[0];
}
export function benchKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [], groups = new Map<Material, Manifold[]>();
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const rot = (s: Manifold, v: Vec3) => k(s.rotate(v));
  const box = (size: Vec3, at: Vec3) => move(k(M.cube(size, true)), at);
  const span = (min: Vec3, max: Vec3) => box([max[0] - min[0], max[1] - min[1], max[2] - min[2]], [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]);
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const hull = (s: Manifold[]) => k(M.hull(s));
  /** Trim a solid to z ≥ zMin (e.g. a raked tube landing on a foot plate). */
  const above = (s: Manifold, zMin: number) => k(M.intersection([s, span([-5000, -5000, zMin], [5000, 5000, 5000])]));
  /** Cylinder between two points. */
  const cyl = (a: Vec3, b: Vec3, d: number, n = 28) => {
    const v = b.map((x, i) => x - a[i]) as Vec3, len = Math.hypot(...v);
    return move(rot(k(M.cylinder(len, d / 2, d / 2, n)), [0, Math.acos(v[2] / len) * 180 / Math.PI, Math.atan2(v[1], v[0]) * 180 / Math.PI]), a);
  };
  const cylX = (x0: number, x1: number, y: number, z: number, d: number, n = 28) => cyl([x0, y, z], [x1, y, z], d, n);
  /** Rectangular steel tube between two Y/Z points at `x`: `w` across X, `h` in the bench plane, `wall` shell (0 = solid). */
  const member = (x: number, a: Pt, b: Pt, w: number, h: number, wall = 3) => {
    const dy = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dy, dz);
    let s = box([w, h, len], [0, 0, len / 2]);
    if (wall > 0) s = cut(s, [box([w - 2 * wall, h - 2 * wall, len + 2], [0, 0, len / 2])]);
    return move(rot(s, [Math.atan2(-dy, dz) * 180 / Math.PI, 0, 0]), [x, a[0], a[1]]);
  };
  /** Straight tube along X at (y, z): `h` along Y, `v` along Z. */
  const crossTube = (x0: number, x1: number, y: number, z: number, h: number, v: number, wall = 3) => {
    let s = span([x0, y - h / 2, z - v / 2], [x1, y + h / 2, z + v / 2]);
    if (wall > 0) s = cut(s, [span([x0 - 1, y - h / 2 + wall, z - v / 2 + wall], [x1 + 1, y + h / 2 - wall, z + v / 2 - wall])]);
    return s;
  };
  const roundRect = (w: number, l: number, r: number) => k(k(C.square([w - 2 * r, l - 2 * r], true)).offset(r, 'Round', 2, 16));
  /** Rounded plan outline extruded from z0. */
  const slab = (w: number, l: number, h: number, r: number, at: Vec3) => move(k(roundRect(w, l, r).extrude(h)), at);
  /** Convex outline (X/Y points) with rounded corners. */
  const outline = (pts: Pt[], r: number) => k(k(k(new C([pts], 'NonZero')).offset(-r, 'Round', 2, 16)).offset(r, 'Round', 2, 16));
  /** Plate from a Y/Z polygon, `thick` along +X from x0 (local a,b,c → world c,a,b). */
  const prismYZ = (pts: Pt[], x0: number, thick: number) => move(rot(k(k(new C([pts], 'NonZero')).extrude(thick)), [90, 0, 90]), [x0, 0, 0]);
  /** Annular sector in the Y/Z plane about c, angles in degrees from +Y toward +Z. */
  const sector = (c: Pt, r0: number, r1: number, a0: number, a1: number, x0: number, thick: number) => {
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 5)), pts: Pt[] = [];
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([c[0] + r1 * Math.cos(a), c[1] + r1 * Math.sin(a)]); }
    for (let i = n; i >= 0; i--) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([c[0] + r0 * Math.cos(a), c[1] + r0 * Math.sin(a)]); }
    return prismYZ(pts, x0, thick);
  };
  /** Upholstered pad: rounded plan, pillowed top edge (3-layer hull), piping seam near the base, dark backing board. */
  const pad = (cs: CrossSection, z0: number, h: number, edge = 14, board = 10) => {
    const layer = (inset: number, top: number, bottom = z0 + board) => move(k((inset ? k(cs.offset(-inset, 'Round', 2, 16)) : cs).extrude(top - bottom)), [0, 0, bottom]);
    const top = z0 + h;
    // Piping sits on the outline itself so the pad plan stays exactly the published size.
    const vinyl = hull([layer(1.6, top - edge), layer(1.6 + edge * .3, top - edge * .3), layer(edge + 1.6, top)]);
    const piping = move(k(cs.extrude(4)), [0, 0, z0 + board + 5]);
    const backing = move(k(k(cs.offset(-6, 'Round', 2, 16)).extrude(board)), [0, 0, z0]);
    return { vinyl, piping, backing };
  };
  /** Circular arc of round bar (torus segment) in the X/Y plane about the origin, from 0 to `deg`. */
  const arc = (R: number, d: number, deg: number, n = 32) => k(M.revolve(k(k(C.circle(d / 2, 16)).translate([R, 0])), n, deg));
  /** Rotates about the X axis through a Y/Z pivot. */
  const articulate = (s: Manifold, [py, pz]: Pt, deg: number) => deg ? move(rot(move(s, [0, -py, -pz]), [deg, 0, 0]), [0, py, pz]) : s;
  /** Wheel on an X axle: tyre, recessed hub and axle bolt. */
  const wheel = (x: number, y: number, z: number, d: number, w: number) => {
    add(MAT.wheels, cut(cylX(x - w / 2, x + w / 2, y, z, d, 32), [cylX(x - w / 2 - 1, x - w / 2 + 3, y, z, d * .62, 24), cylX(x + w / 2 - 3, x + w / 2 + 1, y, z, d * .62, 24)]));
    add(MAT.hubs, cylX(x - w / 2 + 2, x + w / 2 - 2, y, z, d * .5, 20));
    add(MAT.hardware, cylX(x - w / 2 - 6, x + w / 2 + 6, y, z, 14, 12));
  };
  /** Grooved rubber end cap over a tube end: block with shallow horizontal grooves on its outer face. */
  const endCap = (x0: number, x1: number, y: number, z0: number, depth: number, height: number) => {
    const out = x1 > x0 ? 1 : -1, xs = [Math.min(x0, x1), Math.max(x0, x1)];
    const grooves: Manifold[] = [];
    for (let z = z0 + 10; z < z0 + height - 6; z += 8) grooves.push(span([out > 0 ? xs[1] - 2 : xs[0] - 1, y - depth / 2 - 1, z], [out > 0 ? xs[1] + 1 : xs[0] + 2, y + depth / 2 + 1, z + 2.5]));
    const body = hull([span([xs[0], y - depth / 2, z0], [xs[1], y + depth / 2, z0 + height - 6]), span([xs[0] + (out > 0 ? 0 : 4), y - depth / 2 + 4, z0], [xs[1] - (out > 0 ? 4 : 0), y + depth / 2 - 4, z0 + height])]);
    add(MAT.rubber, cut(body, grooves));
  };
  /** Knurled handle along X: bar plus raised rings. */
  const knurledBar = (x0: number, x1: number, y: number, z: number, d: number, mat: Material = MAT.knurl) => {
    const s = [cylX(x0, x1, y, z, d, 24)];
    for (let x = x0 + 12; x <= x1 - 12; x += 6) s.push(cylX(x, x + 1.2, y, z, d + 1.2, 24));
    add(mat, union(s));
  };
  /** Socket-head bolt head pointing along ±X. */
  const boltX = (x: number, y: number, z: number, out: 1 | -1, d = 18) => add(MAT.hardware, cut(cylX(x, x + out * 7, y, z, d, 16), [cylX(x + out * 3, x + out * 8, y, z, d * .4, 6)]));
  const add = (mat: Material, ...s: Manifold[]) => { const list = groups.get(mat) ?? []; list.push(...s); groups.set(mat, list); };
  /** Move every group so far (used to tilt a whole bench onto an attachment). */
  const transformAll = (f: (s: Manifold) => Manifold) => { for (const [mat, list] of groups) groups.set(mat, list.map(f)); };
  /** Bounding box of everything added so far. */
  const bounds = () => union([...groups.values()].flat()).boundingBox();
  const finish = (label: string, run: () => void): SolidPart[] => {
    const out: SolidPart[] = []; let success = false;
    try {
      run();
      for (const [[name, role, color, metalness, roughness], solids] of groups) out.push({ name, solid: union(solids), role, color, metalness, roughness });
      const hardware = out.find(p => p.role === 'fastener'); if (hardware) hardware.authoredFastenerFinish = true;
      for (const part of out) if (part.solid.isEmpty() || part.solid.status() !== 'NoError') throw Error(`Invalid ${label} ${part.name}`);
      success = true; return out;
    } finally { const keep = new Set(success ? out.map(p => p.solid) : []); for (const s of owned.reverse()) if (!keep.has(s as Manifold)) s.delete(); }
  };
  return { api, M, C, k, move, rot, box, span, union, cut, hull, above, cyl, cylX, member, crossTube, roundRect, slab, outline, prismYZ, sector, pad, arc, articulate, wheel, endCap, knurledBar, boltX, add, transformAll, bounds, finish };
}
export type BenchKit = ReturnType<typeof benchKit>;
