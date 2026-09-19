/** Shared Manifold kit for the fixed & loadable dumbbell family (parts/fixed-dumbbells.ts).
 * Build frame: X across the dumbbell, Y along the handle (floor depth), Z up, origin on the floor at the footprint centre.
 * Every intermediate Manifold/CrossSection is tracked and released in `finish`; only the returned solids survive. */
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import type { Mat4 } from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
export type Role = SolidPart['role'];
/** Material: display name, appearance role, colour, metalness, roughness. */
export type Mat = readonly [name: string, role: Role, color: string, metalness: number, roughness: number];
let font: Font | undefined;
/** Bundled Helvetiker Bold, used for moulded/printed weight numbers and typeset brand names (no logo artwork). */
const typeface = () => font ??= new FontLoader().parse(helvetiker as never);
export function dumbbellKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [];
  const groups = new Map<string, { mat: Mat; solids: Manifold[] }>();
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const meet = (a: Manifold, b: Manifold) => k(M.intersection([a, b]));
  const hull = (s: Manifold[]) => k(M.hull(s));
  const box = (min: Vec3, max: Vec3) => move(k(M.cube(max.map((v, i) => v - min[i]) as Vec3)), min);
  /** Z-axis solid (as built by extrude/revolve/cylinder) laid along +Y, then moved so local z=0 sits at y0. */
  const alongY = (s: Manifold, y0: number, x = 0, z = 0) => move(k(s.rotate([-90, 0, 0])), [x, y0, z]);
  /** Cylinder along Y from y0 to y1 at (x, z). */
  const cylY = (y0: number, y1: number, d: number, z: number, x = 0, seg = 40) => alongY(k(M.cylinder(y1 - y0, d / 2, d / 2, seg)), y0, x, z);
  /** Cylinder along Z. */
  const cylZ = (z0: number, z1: number, d: number, x = 0, y = 0, seg = 40) => move(k(M.cylinder(z1 - z0, d / 2, d / 2, seg)), [x, y, z0]);
  /** Solid of revolution around Y: profile points are (radius, y), closed polygon with radius >= 0. */
  const revolveY = (profile: Vec2[], z: number, seg = 64, x = 0) => alongY(k(k(new C([profile], 'EvenOdd')).revolve(seg)), 0, x, z);
  /** Solid of revolution around the vertical axis: profile points are (radius, z). */
  const revolveZ = (profile: Vec2[], seg = 64) => k(k(new C([profile], 'EvenOdd')).revolve(seg));
  /** 2D section (X, Y) extruded along Y from y0 to y0+len; section +Y maps to world -Z, so it is flipped upright here. */
  const prismY = (cs: CrossSection, y0: number, len: number, z: number, x = 0) => alongY(k(k(cs.mirror([0, 1])).extrude(len)), y0, x, z);
  const rounded = (w: number, h: number, r: number) => { const rr = Math.max(.01, Math.min(r, w / 2 - .01, h / 2 - .01)); return k(k(C.square([w - 2 * rr, h - 2 * rr], true)).offset(rr, 'Round', 2, 24)); };
  const ngon = (radius: number, sides: number) => k(C.circle(radius, sides));
  /** Place a Z-extruded plaque/letter solid: its local X along `u`, local Y along `v`, local Z (thickness) along u×v, origin at `at`. */
  const place = (s: Manifold, at: Vec3, u: Vec3, v: Vec3) => {
    const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return k(s.transform([...u, 0, ...v, 0, ...n, 0, ...at, 1] as Mat4));
  };
  /** Text outline, centred on the origin, cap height `h` mm, reading along +X with +Y up. Null for an empty string. */
  const text = (str: string, h: number, tracking = .06): CrossSection | undefined => {
    if (!str.trim()) return undefined;
    const f = typeface(), loops: Vec2[][] = [], scale = h / 720;
    let cursor = 0;
    for (const ch of str) {
      const glyph = (f.data.glyphs as Record<string, { ha: number }>)[ch];
      if (!glyph) throw Error(`Dumbbell label glyph missing: ${ch}`);
      for (const shape of f.generateShapes(ch, 1000)) for (const path of [shape, ...shape.holes]) loops.push(path.getPoints(4).map(p => [(p.x + cursor) * scale, p.y * scale] as Vec2));
      cursor += glyph.ha + 1000 * tracking;
    }
    const cs = k(new C(loops, 'EvenOdd')), b = cs.bounds();
    return k(cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
  };
  /** Text fitted inside a w×h box (keeps aspect), or undefined. */
  const fitText = (str: string, w: number, h: number) => {
    const t = text(str, 100); if (!t) return undefined;
    const b = t.bounds(), s = Math.min(w / (b.max[0] - b.min[0]), h / (b.max[1] - b.min[1]));
    return k(t.scale([s, s]));
  };
  const add = (mat: Mat, ...solids: Manifold[]) => {
    const g = groups.get(mat[0]) ?? { mat, solids: [] };
    g.solids.push(...solids.filter(s => !s.isEmpty())); groups.set(mat[0], g);
  };
  /** Merge each material group into one named SolidPart, translate onto the floor, release every intermediate. */
  const finish = (label: string, lift: Vec3, run: () => void): SolidPart[] => {
    const out: SolidPart[] = []; let success = false;
    try {
      run();
      for (const { mat: [name, role, color, metalness, roughness], solids } of groups.values()) {
        if (!solids.length) continue;
        out.push({ name, solid: move(union(solids), lift), role, color, metalness, roughness });
      }
      for (const p of out) if (p.role === 'fastener') p.authoredFastenerFinish = true;
      for (const p of out) if (p.solid.isEmpty() || p.solid.status() !== 'NoError') throw Error(`Invalid ${label} ${p.name}`);
      success = true; return out;
    } finally { const keep = new Set(success ? out.map(p => p.solid) : []); for (const s of owned.reverse()) if (!keep.has(s as Manifold)) s.delete(); }
  };
  return { M, C, k, move, union, cut, meet, hull, box, alongY, cylY, cylZ, revolveY, revolveZ, prismY, rounded, ngon, place, text, fitText, add, finish };
}
export type DumbbellKit = ReturnType<typeof dumbbellKit>;
/** Quarter-circle arc points (radius r around centre c), from angle a0 to a1 in degrees. */
export function arc(c: Vec2, r: number, a0: number, a1: number, n = 8): Vec2[] {
  return Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as Vec2; });
}
