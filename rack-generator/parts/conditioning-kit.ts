/** Shared Manifold kit for the conditioning family (sleds, battle ropes, plyo boxes, jump rope).
 * Every intermediate Manifold/CrossSection is tracked and released in `finish`; only the returned solids survive.
 * Frame: X across, Y along the part, Z up; builders centre on the floor footprint through `finish(shift)`. */
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import type { Mat4 } from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { Mesh3 } from '../floor-parts/conditioning-geometry.ts';
export type Role = SolidPart['role'];
/** Material: display name, appearance role, colour, metalness, roughness. */
export type Mat = readonly [name: string, role: Role, color: string, metalness: number, roughness: number];
let font: Font | undefined;
/** Bundled Helvetiker Bold for typeset brand names and printed numbers (no logo artwork). */
const typeface = () => font ??= new FontLoader().parse(helvetiker as never);
export function conditioningKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [];
  const groups = new Map<string, { mat: Mat; solids: Manifold[] }>(), extras: SolidPart[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const meet = (a: Manifold, b: Manifold) => k(M.intersection([a, b]));
  const hull = (s: Manifold[]) => k(M.hull(s));
  const box = (min: Vec3, max: Vec3) => move(k(M.cube(max.map((v, i) => v - min[i]) as Vec3)), min);
  /** Cylinder along an axis from a to b, centred at (c1, c2) in the other two coordinates (x→(y,z), y→(x,z), z→(x,y)). */
  const cyl = (axis: 'x' | 'y' | 'z', a: number, b: number, d: number, c1 = 0, c2 = 0, seg = 32, d2 = d) => {
    const c = k(M.cylinder(b - a, d / 2, d2 / 2, seg));
    if (axis === 'z') return move(c, [c1, c2, a]);
    if (axis === 'x') return move(k(c.rotate([0, 90, 0])), [a, c1, c2]);
    return move(k(c.rotate([-90, 0, 0])), [c1, a, c2]);
  };
  const polygon = (pts: Vec2[]) => k(new C([pts], 'EvenOdd'));
  /** Plan profile in (x, y) extruded up from z0 to z1. */
  const planProfile = (pts: Vec2[], z0: number, z1: number) => move(k(polygon(pts).extrude(z1 - z0)), [0, 0, z0]);
  const rounded = (w: number, h: number, r: number) => { const rr = Math.max(.01, Math.min(r, w / 2 - .01, h / 2 - .01)); return k(k(C.square([w - 2 * rr, h - 2 * rr], true)).offset(rr, 'Round', 2, 24)); };
  /** Mesh from the pure layout module. */
  const mesh = (m: Mesh3) => k(new M(new api.Mesh({ numProp: 3, vertProperties: new Float32Array(m.pos), triVerts: new Uint32Array(m.tri) })));
  /** Place a Z-extruded solid: local X along `u`, local Y along `v`, local Z along u × v, origin at `at`. */
  const place = (s: Manifold, at: Vec3, u: Vec3, v: Vec3) => {
    const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return k(s.transform([...u, 0, ...v, 0, ...n, 0, ...at, 1] as Mat4));
  };
  /** Text outline centred on the origin, cap height `h`, reading along +X with +Y up. */
  const text = (str: string, h: number, tracking = .04): CrossSection | undefined => {
    if (!str.trim()) return undefined;
    const f = typeface(), loops: Vec2[][] = [], scale = h / 720; let cursor = 0;
    for (const ch of str) {
      const glyph = (f.data.glyphs as Record<string, { ha: number }>)[ch];
      if (!glyph) throw Error(`Label glyph missing: ${ch}`);
      for (const shape of f.generateShapes(ch, 1000)) for (const path of [shape, ...shape.holes]) loops.push(path.getPoints(4).map(p => [(p.x + cursor) * scale, p.y * scale] as Vec2));
      cursor += glyph.ha + 1000 * tracking;
    }
    const cs = k(new C(loops, 'EvenOdd')), b = cs.bounds();
    return k(cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
  };
  /** Text fitted inside w × h (keeps aspect). */
  const fitText = (str: string, w: number, h: number, tracking = .04) => {
    const t = text(str, 100, tracking); if (!t) return undefined;
    const b = t.bounds(), s = Math.min(w / (b.max[0] - b.min[0]), h / (b.max[1] - b.min[1]));
    return k(t.scale([s, s]));
  };
  /** Flat decal/lettering of depth d on a face: `at` is the face point, u = reading direction, v = up; extrudes from -sink to d - sink along the face normal. */
  const decal = (cs: CrossSection | undefined, at: Vec3, u: Vec3, v: Vec3, d: number, sink = 0) => {
    if (!cs) return undefined;
    return place(move(k(cs.extrude(d)), [0, 0, -sink]), at, u, v);
  };
  const add = (mat: Mat, ...solids: (Manifold | undefined)[]) => {
    const g = groups.get(mat[0]) ?? { mat, solids: [] };
    g.solids.push(...solids.filter((s): s is Manifold => !!s && !s.isEmpty())); groups.set(mat[0], g);
  };
  /** Adopt ready-made SolidParts (e.g. buildPlateStack); they are shifted with the rest in `finish`. */
  const adopt = (parts: SolidPart[]) => { extras.push(...parts); };
  /** Merge each material group into one named SolidPart, shift into the footprint frame, release every intermediate. */
  const finish = (label: string, shift: Vec3, run: () => void): SolidPart[] => {
    const out: SolidPart[] = []; let success = false;
    try {
      run();
      for (const { mat: [name, role, color, metalness, roughness], solids } of groups.values()) {
        if (!solids.length) continue;
        out.push({ name, solid: move(union(solids), shift), role, color, metalness, roughness });
      }
      for (const p of extras) { owned.push(p.solid); out.push({ ...p, solid: move(p.solid, shift) }); }
      for (const p of out) if (p.role === 'fastener') p.authoredFastenerFinish = true;
      for (const p of out) if (p.solid.isEmpty() || p.solid.status() !== 'NoError') throw Error(`Invalid ${label} ${p.name}`);
      success = true; return out;
    } finally {
      const keep = new Set(success ? out.map(p => p.solid) : []);
      if (!success) for (const p of extras) if (!owned.includes(p.solid)) owned.push(p.solid);
      for (const s of new Set(owned.reverse())) if (!keep.has(s as Manifold)) s.delete();
    }
  };
  return { api, M, C, k, move, union, cut, meet, hull, box, cyl, polygon, planProfile, profileX, rounded, mesh, place, text, fitText, decal, add, adopt, finish };
  /** Side profile in (y, z) extruded across X from x0 to x1. */
  function profileX(pts: Vec2[], x0: number, x1: number) {
    // Extrude in local Z, then map local (x, y, z) → world (z + x0, x, y): a proper rotation, so orientation is preserved.
    return k(k(polygon(pts).extrude(x1 - x0)).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1] as Mat4));
  }
}
export type ConditioningKit = ReturnType<typeof conditioningKit>;
