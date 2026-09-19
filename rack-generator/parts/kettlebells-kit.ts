/** Kettlebell family: shared Manifold toolkit (owned-solid bookkeeping, swept handle tubes, stroke-font markings
 * projected onto spherical bodies, material groups). Used by ./kettlebells.ts and ./kettlebells-adjustable.ts. */
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
import type { HandlePoint } from '../floor-parts/kettlebells.ts';

type Pt = { x: number; z: number };
/** Plain stroke font on a 4 × 6 grid (weight numerals and unit letters only; no brand artwork). */
const GLYPHS: Record<string, number[][]> = {
  '0': [[0, 0, 4, 0], [4, 0, 4, 6], [4, 6, 0, 6], [0, 6, 0, 0]], '1': [[2, 0, 2, 6], [2, 6, .8, 4.8], [.8, 0, 3.2, 0]],
  '2': [[0, 6, 4, 6], [4, 6, 4, 3], [4, 3, 0, 3], [0, 3, 0, 0], [0, 0, 4, 0]], '3': [[0, 6, 4, 6], [4, 6, 4, 0], [4, 0, 0, 0], [1, 3, 4, 3]],
  '4': [[0, 6, 0, 3], [0, 3, 4, 3], [3.2, 6, 3.2, 0]], '5': [[4, 6, 0, 6], [0, 6, 0, 3], [0, 3, 4, 3], [4, 3, 4, 0], [4, 0, 0, 0]],
  '6': [[4, 6, 0, 6], [0, 6, 0, 0], [0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3]], '7': [[0, 6, 4, 6], [4, 6, 1.6, 0]],
  '8': [[0, 0, 4, 0], [4, 0, 4, 6], [4, 6, 0, 6], [0, 6, 0, 0], [0, 3, 4, 3]], '9': [[4, 3, 0, 3], [0, 3, 0, 6], [0, 6, 4, 6], [4, 6, 4, 0], [4, 0, 0, 0]],
  K: [[0, 0, 0, 6], [0, 3, 4, 6], [1.2, 3.9, 4, 0]], G: [[4, 6, 0, 6], [0, 6, 0, 0], [0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 2, 3]],
  L: [[0, 6, 0, 0], [0, 0, 4, 0]], B: [[0, 0, 0, 6], [0, 6, 3, 6], [3, 6, 4, 5], [4, 5, 4, 4], [4, 4, 3, 3], [0, 3, 3, 3], [3, 3, 4, 2], [4, 2, 4, 1], [4, 1, 3, 0], [3, 0, 0, 0]],
  E: [[4, 6, 0, 6], [0, 6, 0, 0], [0, 0, 4, 0], [0, 3, 3, 3]], S: [[4, 6, 0, 6], [0, 6, 0, 3], [0, 3, 4, 3], [4, 3, 4, 0], [4, 0, 0, 0]],
  T: [[0, 6, 4, 6], [2, 6, 2, 0]], '.': [[2, 0, 2, .2]], '/': [[0, 0, 4, 6]], ' ': [],
};

/** Darken (f < 1) or lighten (f > 1) a #rrggbb colour. */
export const shade = (hex: string, f: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)))).map(v => v.toString(16).padStart(2, '0')).join('');
export function kettlebellKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const meet = (a: Manifold, b: Manifold) => k(M.intersection([a, b]));
  const box = (min: Vec3, max: Vec3) => move(k(M.cube(max.map((v, i) => v - min[i]) as Vec3)), min);
  const sphere = (c: Vec3, r: number, seg = 24) => move(k(M.sphere(r, seg)), c);
  /** Cylinder between two points. */
  const rod = (a: Vec3, b: Vec3, r: number, seg = 24, r2 = r) => {
    const d = b.map((v, i) => v - a[i]) as Vec3, len = Math.hypot(...d);
    const c = k(M.cylinder(len, r, r2, seg)), pitch = Math.acos(Math.max(-1, Math.min(1, d[2] / len))) * 180 / Math.PI, yaw = Math.atan2(d[1], d[0]) * 180 / Math.PI;
    return move(k(c.rotate([0, pitch, yaw])), a);
  };
  const cylY = (y0: number, y1: number, r: number, x = 0, z = 0, seg = 48) => move(k(k(M.cylinder(y1 - y0, r, r, seg)).rotate([-90, 0, 0])), [x, y0, z]);
  const roundRect = (w: number, h: number, r: number) => { const rr = Math.max(.1, Math.min(r, w / 2 - .05, h / 2 - .05)); return k(k(C.square([w - 2 * rr, h - 2 * rr], true)).offset(rr, 'Round', 2, 24)); };
  /** Tube along a handle centreline (x,z in the loop plane), mirrored to both horns; hull of spheres per segment. */
  const tube = (path: HandlePoint[], mirror = true, seg = 28, grow = 0) => {
    const pieces: Manifold[] = [];
    for (const sx of mirror ? [1, -1] : [1]) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      pieces.push(k(M.hull([sphere([sx * a.x, 0, a.z], a.r + grow, seg), sphere([sx * b.x, 0, b.z], b.r + grow, seg)])));
    }
    return union(pieces);
  };
  /** Point and tangent at arc length s along a path. */
  const along = (path: HandlePoint[], s: number) => {
    for (let i = 1; i < path.length; i++) if (path[i].s >= s) {
      const a = path[i - 1], b = path[i], t = (s - a.s) / Math.max(1e-9, b.s - a.s), len = Math.hypot(b.x - a.x, b.z - a.z);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, r: a.r + (b.r - a.r) * t, tx: (b.x - a.x) / len, tz: (b.z - a.z) / len };
    }
    const b = path[path.length - 1]; return { x: b.x, z: b.z, r: b.r, tx: -1, tz: 0 };
  };
  /** The stretch of a path between arc lengths s0 and s1 (end points interpolated). */
  const subPath = (path: HandlePoint[], s0: number, s1: number): HandlePoint[] => {
    const at = (s: number): HandlePoint => { const p = along(path, s); return { x: p.x, z: p.z, r: p.r, s }; };
    return [at(s0), ...path.filter(p => p.s > s0 && p.s < s1), at(s1)];
  };
  /** A painted band around both horns between arc lengths s0 and s1, following the horn taper. */
  const band = (path: HandlePoint[], s0: number, s1: number, lift = .7) => {
    const sp = subPath(path, s0, s1), r = Math.max(...sp.map(p => p.r)) + lift, out: Manifold[] = [];
    for (const sx of [1, -1]) for (let i = 1; i < sp.length; i++) out.push(rod([sx * sp[i - 1].x, 0, sp[i - 1].z], [sx * sp[i].x, 0, sp[i].z], r, 40));
    return union(out);
  };
  /** Split a path at height z: the part below and the part above (shared point inserted). */
  const splitAtZ = (path: HandlePoint[], z: number): [HandlePoint[], HandlePoint[]] => {
    const i = path.findIndex(p => p.z >= z); if (i <= 0) return i === 0 ? [[], path] : [path, []];
    const a = path[i - 1], b = path[i], t = (z - a.z) / (b.z - a.z), m = { x: a.x + (b.x - a.x) * t, z, r: a.r + (b.r - a.r) * t, s: a.s + (b.s - a.s) * t };
    return [[...path.slice(0, i), m], [m, ...path.slice(i)]];
  };
  /** Stroke text centred at (0,0) in the (u, v) plane; `h` is the cap height. */
  const text = (s: string, h: number, stroke = h * .16) => {
    const g = h / 6, adv = 5.2 * g, width = s.length * adv - 1.2 * g, parts: CrossSection[] = [];
    [...s.toUpperCase()].forEach((ch, i) => {
      const x0 = -width / 2 + i * adv, strokes = GLYPHS[ch] ?? [];
      for (const [x1, y1, x2, y2] of strokes) parts.push(k(C.hull([k(k(C.circle(stroke / 2, 10)).translate([x0 + x1 * g, y1 * g - h / 2])), k(k(C.circle(stroke / 2, 10)).translate([x0 + x2 * g, y2 * g - h / 2]))])));
    });
    return parts.length ? k(C.union(parts)) : undefined;
  };
  const textBlock = (lines: string[], h: number, gap = h * .45) => {
    const parts: CrossSection[] = [], total = lines.length * h + (lines.length - 1) * gap;
    lines.forEach((l, i) => { const t = text(l, h); if (t) parts.push(k(t.translate([0, total / 2 - h / 2 - i * (h + gap)]))); });
    return parts.length ? k(C.union(parts)) : undefined;
  };
  /** Extrude a (u, v) section along Y through a face: side -1 = front (-Y), +1 = back; spans y from inner to outer radius. */
  const faceSolid = (cs: CrossSection, side: -1 | 1, inner: number, outer: number, zc: number) => {
    if (!(cs.area() > 0)) throw Error('Empty kettlebell marking section.');
    const e = k(cs.extrude(outer - inner));
    // Extrusion is along +Z; rotate so it points toward the face (u stays X, v becomes Z).
    const f = k(e.rotate([90, 0, 0])), r = side < 0 ? f : k(f.rotate([0, 0, 180]));
    return move(r, [0, side * inner, zc]);
  };
  /** Competition-style body: two half-ellipsoids meeting at the widest circle (z = eq), flat base of diameter `base`, crown at `top`. */
  const compBody = (D: number, base: number, eq: number, top: number, seg = 96) => {
    const R = D / 2, low = eq / Math.sqrt(1 - (base / 2 / R) ** 2), up = top - eq;
    const half = (rz: number, z0: number, z1: number) => meet(move(k(k(M.sphere(1, seg)).scale([R, R, rz])), [0, 0, eq]), box([-R - 1, -R - 1, z0], [R + 1, R + 1, z1]));
    return union([half(low, 0, eq), half(up, eq, top + 1)]);
  };
  /** Radius of that body at height z (for placing skins and markings). */
  const compRadius = (D: number, base: number, eq: number, top: number, z: number) => {
    const R = D / 2, low = eq / Math.sqrt(1 - (base / 2 / R) ** 2), rz = z < eq ? low : top - eq;
    return R * Math.sqrt(Math.max(0, 1 - ((z - eq) / rz) ** 2));
  };
  const groups = new Map<string, { solids: Manifold[]; role: SolidPart['role']; color: string; metalness: number; roughness: number }>();
  const add = (name: string, solid: Manifold | undefined, role: SolidPart['role'], color: string, metalness = 0, roughness = .55) => {
    if (!solid || solid.isEmpty()) return;
    const g = groups.get(name) ?? { solids: [], role, color, metalness, roughness }; g.solids.push(solid); groups.set(name, g);
  };
  /** Collect groups into SolidParts, then free every other intermediate. */
  const finish = (label: string) => {
    const out: SolidPart[] = [];
    let ok = false;
    try {
      for (const [name, g] of groups) {
        const solid = union(g.solids);
        if (solid.isEmpty() || solid.status() !== 'NoError') throw Error(`Invalid ${label} ${name}`);
        out.push({ name, solid, role: g.role, color: g.color, metalness: g.metalness, roughness: g.roughness });
      }
      ok = true; return out;
    } finally { release(ok ? out.map(p => p.solid) : []); }
  };
  const release = (keep: Manifold[] = []) => { const s = new Set(keep); for (const o of owned.reverse()) if (!s.has(o as Manifold)) o.delete(); owned.length = 0; };
  return { M, C, k, move, union, cut, meet, box, sphere, compBody, compRadius, rod, cylY, roundRect, tube, along, subPath, band, splitAtZ, text, textBlock, faceSolid, add, finish, release };
}
export type KettlebellKit = ReturnType<typeof kettlebellKit>;
export type { Pt };
