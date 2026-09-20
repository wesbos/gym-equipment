/** Shared Manifold kit for the belt squat, calf and tib machine family (parts/belt-squat-machines.ts).
 * Build frame: X across the machine, Y along floor depth, Z up, millimetres. Builders work in the design coordinates of
 * ../floor-parts/belt-squat-machines.ts and `finish` shifts every solid by the layout's centring offset, so the bounding
 * box is centred on the origin and matches the footprint. Every intermediate Manifold/CrossSection is tracked and
 * released in `finish`; only the returned solids survive. */
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import type { Mat4 } from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { PlateId } from '../plates.ts';
import { buildPlateStack } from './plates.ts';
export type Role = SolidPart['role'];
/** Material: display name, appearance role, colour, metalness, roughness. */
export type Mat = readonly [name: string, role: Role, color: string, metalness: number, roughness: number];
let font: Font | undefined;
const typeface = () => font ??= new FontLoader().parse(helvetiker as never);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
/** Rotate point p about the X axis through `pivot` (Y/Z plane), degrees; positive turns +Y toward +Z. */
export const rotX = (p: Vec3, pivot: Vec3, degrees: number): Vec3 => {
  const a = degrees * Math.PI / 180, y = p[1] - pivot[1], z = p[2] - pivot[2];
  return [p[0], pivot[1] + y * Math.cos(a) - z * Math.sin(a), pivot[2] + y * Math.sin(a) + z * Math.cos(a)];
};
export function machineKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [];
  const groups = new Map<string, { mat: Mat; solids: Manifold[] }>(), stacks: SolidPart[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const hull = (s: Manifold[]) => k(M.hull(s));
  const box = (min: Vec3, max: Vec3) => move(k(M.cube(sub(max, min))), min);
  /** Axis-aligned box from centre and size. */
  const cube = (c: Vec3, size: Vec3) => box([c[0] - size[0] / 2, c[1] - size[1] / 2, c[2] - size[2] / 2], [c[0] + size[0] / 2, c[1] + size[1] / 2, c[2] + size[2] / 2]);
  /** Rigid frame with local Z along a→b and local Y toward `up` (projected), placed at a. */
  const frameAt = (a: Vec3, b: Vec3, up: Vec3): Mat4 => {
    const z = norm(sub(b, a)); let x = cross(up, z);
    if (Math.hypot(...x) < 1e-6) x = cross([0, 1, 0], z);
    if (Math.hypot(...x) < 1e-6) x = cross([1, 0, 0], z);
    x = norm(x); const y = cross(z, x);
    return [...x, 0, ...y, 0, ...z, 0, ...a, 1] as Mat4;
  };
  const place = (s: Manifold, a: Vec3, b: Vec3, up: Vec3 = [0, 0, 1]) => k(s.transform(frameAt(a, b, up)));
  /** Rectangular tube a→b: `w` across (local X), `h` toward `up` (local Y); wall > 0 makes it hollow with open ends. */
  const tube = (a: Vec3, b: Vec3, w: number, h: number, up: Vec3 = [0, 0, 1], wall = 0, r = 0) => {
    const len = Math.hypot(...sub(b, a));
    const outer = r > 0 ? k(k(k(C.square([w - 2 * r, h - 2 * r], true)).offset(r, 'Round', 2, 12)).extrude(len)) : move(k(M.cube([w, h, len], true)), [0, 0, len / 2]);
    const s = wall > 0 ? cut(outer, [move(k(M.cube([w - 2 * wall, h - 2 * wall, len + 2], true)), [0, 0, len / 2])]) : outer;
    return place(s, a, b, up);
  };
  /** Round bar a→b. */
  const rod = (a: Vec3, b: Vec3, d: number, seg = 32) => place(k(M.cylinder(Math.hypot(...sub(b, a)), d / 2, d / 2, seg)), a, b, [0, 0, 1]);
  /** Tapered round a→b (d0 at a, d1 at b). */
  const cone = (a: Vec3, b: Vec3, d0: number, d1: number, seg = 32) => place(k(M.cylinder(Math.hypot(...sub(b, a)), d0 / 2, d1 / 2, seg)), a, b, [0, 0, 1]);
  const ball = (c: Vec3, d: number, seg = 24) => move(k(M.sphere(d / 2, seg)), c);
  /** Bent round bar through the points, with ball joints at the bends. */
  const bent = (pts: Vec3[], d: number, seg = 24) => union([...pts.slice(1).map((p, i) => rod(pts[i], p, d, seg)), ...pts.slice(1, -1).map(p => ball(p, d, seg))]);
  const rrect = (w: number, h: number, r: number) => { const rr = Math.max(.01, Math.min(r, w / 2 - .01, h / 2 - .01)); return k(k(C.square([w - 2 * rr, h - 2 * rr], true)).offset(rr, 'Round', 2, 16)); };
  /** Rounded slab: w (X) × l (Y) plan with corner radius r, from z0 up by h. */
  const slab = (c: Vec3, w: number, l: number, h: number, r: number) => move(k(rrect(w, l, r).extrude(h)), c);
  /** Upholstered pad: rounded plan plus rounded vertical edges (hull of two inset slabs). */
  const pad = (c: Vec3, w: number, l: number, h: number, r: number, e = Math.min(10, h / 3)) =>
    hull([slab([c[0], c[1], c[2]], w - 2 * e, l - 2 * e, h, Math.max(1, r - e)), slab([c[0], c[1], c[2] + e], w, l, h - 2 * e, r)]);
  /** Polygon (u, v) extruded by `t` along +`axis` starting at `at`: 'x' → (u,v) = (Y,Z); 'y' → (X,Z); 'z' → (X,Y). */
  const plate = (pts: Vec2[], t: number, axis: 'x' | 'y' | 'z', at = 0) => {
    const e = k(k(new C([pts], 'EvenOdd')).extrude(t));
    if (axis === 'z') return move(e, [0, 0, at]);
    // extrude is along +Z: map (u, v, w) → axis frame.
    return axis === 'x' ? k(e.transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, at, 0, 0, 1] as Mat4)) : k(e.transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, at + t, 0, 1] as Mat4));
  };
  /** Solid of revolution around the Z axis from (radius, z) profile points, moved to `at`. */
  const revolve = (profile: Vec2[], at: Vec3 = [0, 0, 0], seg = 48) => move(k(k(new C([profile], 'EvenOdd')).revolve(seg)), at);
  /** Revolution solid (radius, axial) laid along a→direction. */
  const revolveAlong = (profile: Vec2[], a: Vec3, dir: Vec3, seg = 48) => place(k(k(new C([profile], 'EvenOdd')).revolve(seg)), a, [a[0] + dir[0], a[1] + dir[1], a[2] + dir[2]]);
  /** Round through-holes of diameter d at the given centres, along `axis` (a long cylinder per hole). */
  const holes = (centres: Vec3[], d: number, axis: 'x' | 'y' | 'z', len = 200, seg = 12) => centres.map(c => {
    const h = len / 2, a: Vec3 = [...c], b: Vec3 = [...c], i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    a[i] -= h; b[i] += h; return rod(a, b, d, seg);
  });
  /** Raised diamond-tread lozenges over a w×l area centred at c (top face at c[2]); returns one solid. */
  const tread = (c: Vec3, w: number, l: number, pitch = 32, h = 1.4) => {
    const out: Manifold[] = [], nx = Math.floor(w / pitch), ny = Math.floor(l / pitch);
    const lozenge = k(k(k(C.circle(1, 12)).scale([pitch * .36, pitch * .08])).extrude(h));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const x = c[0] - (nx - 1) * pitch / 2 + i * pitch, y = c[1] - (ny - 1) * pitch / 2 + j * pitch;
      out.push(move(k(lozenge.rotate([0, 0, (i + j) % 2 ? 45 : -45])), [x, y, c[2]]));
    }
    return union(out);
  };
  /** Text outline centred on the origin, cap height `h` mm, reading along +X (bundled Helvetiker Bold). */
  const text = (str: string, h: number, tracking = .06): CrossSection => {
    const f = typeface(), loops: Vec2[][] = [], scale = h / 720;
    let cursor = 0;
    for (const ch of str) {
      const glyph = (f.data.glyphs as Record<string, { ha: number }>)[ch];
      if (!glyph) throw Error(`Label glyph missing: ${ch}`);
      for (const shape of f.generateShapes(ch, 1000)) for (const path of [shape, ...shape.holes]) loops.push(path.getPoints(3).map(p => [(p.x + cursor) * scale, p.y * scale] as Vec2));
      cursor += glyph.ha + 1000 * tracking;
    }
    const cs = k(new C(loops, 'EvenOdd')), b = cs.bounds();
    return k(cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
  };
  /** Text fitted inside w × h (keeps aspect). */
  const fitText = (str: string, w: number, h: number) => {
    const t = text(str, 100), b = t.bounds(), s = Math.min(w / (b.max[0] - b.min[0]), h / (b.max[1] - b.min[1]));
    return k(t.scale([s, s]));
  };
  /** Flat 2D shape (u right, v up) extruded `t` mm out of a face: origin `at`, u/v world directions, extruded along u×v. */
  const decal = (cs: CrossSection, t: number, at: Vec3, u: Vec3, v: Vec3) => {
    const n = cross(u, v);
    return k(k(cs.extrude(t)).transform([...u, 0, ...v, 0, ...n, 0, ...at, 1] as Mat4));
  };
  const add = (mat: Mat, ...solids: Manifold[]) => {
    const g = groups.get(mat[0]) ?? { mat, solids: [] };
    g.solids.push(...solids.filter(s => !s.isEmpty())); groups.set(mat[0], g);
  };
  /** Olympic plates from parts/plates.ts (IWF colours, role 'source'), merged per plate label. */
  const plates = (list: readonly PlateId[], origin: Vec3, axis: Vec3) => { if (list.length) stacks.push(...buildPlateStack(api, list, { origin, axis, segments: 64 })); };
  /** Merge each material group into one named SolidPart (plus plate groups), shift by `shift`, release every intermediate. */
  const finish = (label: string, shift: Vec2, run: () => void): SolidPart[] => {
    const out: SolidPart[] = []; let success = false;
    try {
      run();
      for (const { mat: [name, role, color, metalness, roughness], solids } of groups.values()) {
        if (!solids.length) continue;
        out.push({ name, solid: move(union(solids), [shift[0], shift[1], 0]), role, color, metalness, roughness });
      }
      const byLabel = new Map<string, SolidPart[]>();
      for (const s of stacks) { owned.push(s.solid); const key = s.name.replace(/^plate-\d+ /, ''); byLabel.set(key, [...byLabel.get(key) ?? [], s]); }
      for (const [key, list] of byLabel) out.push({ ...list[0], name: `Plates · ${key}`, solid: move(union(list.map(s => s.solid)), [shift[0], shift[1], 0]) });
      for (const p of out) if (p.role === 'fastener') p.authoredFastenerFinish = true;
      for (const p of out) if (p.solid.isEmpty() || p.solid.status() !== 'NoError') throw Error(`Invalid ${label} ${p.name}`);
      success = true; return out;
    } finally {
      const keep = new Set(success ? out.map(p => p.solid) : []);
      for (const s of owned.reverse()) if (!keep.has(s as Manifold)) s.delete();
      if (!success) for (const s of stacks) if (!owned.includes(s.solid)) s.solid.delete();
    }
  };
  return { M, C, k, move, union, cut, hull, box, cube, tube, rod, cone, ball, bent, rrect, slab, pad, plate, revolve, revolveAlong, holes, tread, text, fitText, decal, add, plates, finish };
}
export type MachineKit = ReturnType<typeof machineKit>;
