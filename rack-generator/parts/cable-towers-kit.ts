/** Shared Manifold kit for the stand-alone cable tower family (parts/cable-towers.ts).
 * Build frame: X across the machine, Y front (-Y, where the user stands) to back, Z up, millimetres.
 * Every intermediate Manifold/CrossSection is tracked and released in `finish`; only the returned solids survive.
 * The finished solids are recentred so the XY bounding box is centred on the origin with z >= 0 (floor-part contract). */
import type { Mat4 } from 'manifold-3d';
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildPlateStack } from './plates.ts';
import type { PlateId } from '../plates.ts';
export type Role = SolidPart['role'];
/** Material: display name, appearance role, colour, metalness, roughness. */
export type Mat = readonly [name: string, role: Role, color: string, metalness: number, roughness: number];
export const mat = (name: string, color: string, metalness: number, roughness: number, role: Role = 'source'): Mat => [name, role, color, metalness, roughness];
/** Common factory finishes. Frame paints are per-product ('source': fixed factory colours, never rack paint). */
export const MAT = {
  chrome: mat('Chrome guide rods', '#dfe3e6', 1, .14),
  stainless: mat('Stainless steel', '#c4c8cb', .95, .28),
  zinc: mat('Zinc-plated hardware', '#b9bcbf', .85, .35, 'fastener'),
  cable: mat('Black-coated steel cable', '#161718', .2, .5),
  nylon: mat('Black nylon pulleys', '#1b1c1e', 0, .55),
  alu: mat('Polished aluminium pulleys', '#c9ccd0', .95, .22),
  stack: mat('Black cast-iron stack plates', '#1c1d1f', .35, .6),
  vinyl: mat('Black vinyl upholstery', '#18191a', 0, .7, 'liner'),
  rubber: mat('Black rubber feet', '#141515', 0, .92, 'liner'),
  grip: mat('Knurled grips', '#aab0b5', .85, .45, 'handle'),
  foam: mat('Black foam grips', '#131314', 0, .85, 'handle'),
  strap: mat('Black nylon straps', '#1a1a1b', 0, .8),
  label: mat('White weight labels', '#e9e8e3', 0, .6),
  tread: mat('Diamond tread plate', '#2a2b2d', .6, .45),
  uhmw: mat('Black UHMW liners', '#101011', 0, .6, 'liner'),
} as const;
let font: Font | undefined;
const typeface = () => font ??= new FontLoader().parse(helvetiker as never);
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return v.map(n => n / l) as Vec3; };
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** Column-major rigid transform taking local +X to `x`, local +Z as near `up` as possible, origin to `at`. */
function basisX(x: Vec3, at: Vec3, up: Vec3 = [0, 0, 1]): Mat4 {
  const u = norm(x), parallel = Math.abs(u[0] * up[0] + u[1] * up[1] + u[2] * up[2]) > .95;
  const seed: Vec3 = parallel ? (Math.abs(u[0]) > .9 ? [0, 1, 0] : [1, 0, 0]) : up;
  const v = norm(cross(seed, u)), n = cross(u, v);
  return [...u, 0, ...v, 0, ...n, 0, ...at, 1] as Mat4;
}
/** Column-major rigid transform taking local +Z to `axis`, origin to `at`. */
function basisZ(axis: Vec3, at: Vec3): Mat4 {
  const a = norm(axis), seed: Vec3 = Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  const u = norm(cross(seed, a)), v = cross(a, u);
  return [...u, 0, ...v, 0, ...a, 0, ...at, 1] as Mat4;
}
export type Axis = 'x' | 'y' | 'z';
const AXES: Record<Axis, Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
export function towerKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [];
  const groups = new Map<string, { mat: Mat; solids: Manifold[] }>();
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const meet = (a: Manifold, b: Manifold) => k(M.intersection([a, b]));
  const hull = (s: Manifold[]) => k(M.hull(s));
  const box = (min: Vec3, max: Vec3) => move(k(M.cube(max.map((v, i) => v - min[i]) as Vec3)), min);
  /** Box by centre and size. */
  const cbox = (c: Vec3, size: Vec3) => box(c.map((v, i) => v - size[i] / 2) as Vec3, c.map((v, i) => v + size[i] / 2) as Vec3);
  const rotate = (s: Manifold, r: Vec3) => k(s.rotate(r));
  const transform = (s: Manifold, m: Mat4) => k(s.transform(m));
  /** Rectangular section (w wide, h tall) from a to b; `up` picks which way h points. */
  const beam = (a: Vec3, b: Vec3, w: number, h: number, up: Vec3 = [0, 0, 1]) => {
    const L = Math.hypot(...sub(b, a));
    return transform(k(k(M.cube([L, w, h], false)).translate([0, -w / 2, -h / 2])), basisX(sub(b, a), a, up));
  };
  /** Cylinder from a to b. */
  const rod = (a: Vec3, b: Vec3, d: number, seg = 24) => {
    const L = Math.hypot(...sub(b, a));
    return transform(k(M.cylinder(L, d / 2, d / 2, seg)), basisZ(sub(b, a), a));
  };
  /** Cylinder along a principal axis from t0 to t1 at the other two coordinates (c = full point, the axis coordinate ignored). */
  const cyl = (axis: Axis, t0: number, t1: number, d: number, c: Vec3, seg = 24) => {
    const i = 'xyz'.indexOf(axis), a = [...c] as Vec3, b = [...c] as Vec3; a[i] = t0; b[i] = t1;
    return rod(a, b, d, seg);
  };
  /** Closed polyline cable made of rods (straight runs between pulley tangents). */
  const cable = (pts: Vec3[], d = 5) => union(pts.slice(1).map((p, i) => rod(pts[i], p, d, 8)));
  /** Solid of revolution around local Z: profile points are (radius, z). Then oriented along `axis` at `at`. */
  const revolve = (profile: Vec2[], axis: Vec3, at: Vec3, seg = 32) => transform(k(k(new C([profile], 'EvenOdd')).revolve(seg)), basisZ(axis, at));
  /** Grooved sheave on its axle boss: diameter `dia`, width `w`. */
  const sheave = (at: Vec3, axis: Axis | Vec3, dia: number, w = 22, seg = 32) => {
    const R = dia / 2, g = Math.min(8, R * .18), hw = w / 2;
    return revolve([[6, -hw], [R, -hw], [R, -hw + 2.5], [R - g, -1.2], [R - g, 1.2], [R, hw - 2.5], [R, hw], [6, hw]], typeof axis === 'string' ? AXES[axis] : axis, at, seg);
  };
  /** Vertical rectangular upright (w along X, d along Y) with round through-holes on the ±Y faces (`holesY`) and/or ±X faces. */
  const upright = (x: number, y: number, z0: number, z1: number, w: number, d: number, holes?: { dia: number; pitch: number; start: number; count: number; faces?: 'y' | 'x' | 'xy'; seg?: number }) => {
    const body = box([x - w / 2, y - d / 2, z0], [x + w / 2, y + d / 2, z1]);
    if (!holes) return body;
    const cuts: Manifold[] = [];
    for (let i = 0; i < holes.count; i++) {
      const z = holes.start + i * holes.pitch; if (z + holes.dia / 2 > z1 - 4) break;
      if ((holes.faces ?? 'y').includes('y')) cuts.push(cyl('y', y - d / 2 - 2, y + d / 2 + 2, holes.dia, [x, 0, z], holes.seg ?? 16));
      if ((holes.faces ?? 'y').includes('x')) cuts.push(cyl('x', x - w / 2 - 2, x + w / 2 + 2, holes.dia, [0, y, z], holes.seg ?? 16));
    }
    return cuts.length ? cut(body, [union(cuts)]) : body;
  };
  const rounded = (w: number, h: number, r: number) => { const rr = Math.max(.01, Math.min(r, w / 2 - .01, h / 2 - .01)); return k(k(C.square([w - 2 * rr, h - 2 * rr], true)).offset(rr, 'Round', 2, 24)); };
  /** Rounded box (plan radius r) from z0 to z1. */
  const rbox = (c: Vec2, w: number, d: number, z0: number, z1: number, r: number) => move(k(rounded(w, d, r).extrude(z1 - z0)), [c[0], c[1], z0]);
  /** Upholstered pad: rounded-rect slab with a softened crown (hull of a full-size base and an inset top). */
  const pad = (c: Vec2, w: number, d: number, z0: number, z1: number, r = 20) => {
    const h = z1 - z0, inset = Math.min(8, h * .3);
    return hull([rbox(c, w, d, z0, z1 - inset, r), rbox(c, w - 2 * inset, d - 2 * inset, z0 + inset, z1, Math.max(2, r - inset))]);
  };
  /** Foam roller along `axis` with softened ends. */
  const roller = (axis: Axis, t0: number, t1: number, d: number, c: Vec3) => {
    const L = t1 - t0, r = d / 2, e = Math.min(6, L / 4);
    const a = [...c] as Vec3; a['xyz'.indexOf(axis)] = t0;
    return revolve([[0, 0], [r - e, 0], [r, e], [r, L - e], [r - e, L], [0, L]], AXES[axis], a, 32);
  };
  /** Extrude an XZ polygon along Y from y0 to y1 (side profiles of feet, gussets, arms). */
  const prismXZ = (pts: Vec2[], y0: number, y1: number) => move(rotate(k(k(new C([pts], 'EvenOdd')).extrude(y1 - y0)), [90, 0, 0]), [0, y1, 0]);
  /** Extrude a YZ polygon along X from x0 to x1. */
  const prismYZ = (pts: Vec2[], x0: number, x1: number) => move(rotate(rotate(k(k(new C([pts], 'EvenOdd')).extrude(x1 - x0)), [90, 0, 0]), [0, 0, 90]), [x0, 0, 0]);
  /** Extrude an XY polygon along Z. */
  const prismXY = (pts: Vec2[], z0: number, z1: number) => move(k(k(new C([pts], 'EvenOdd')).extrude(z1 - z0)), [0, 0, z0]);
  /** Place a Z-extruded plaque/letter solid: its local X along `u`, local Y along `v`, thickness along u×v, origin at `at`. */
  const place = (s: Manifold, at: Vec3, u: Vec3, v: Vec3) => transform(s, [...u, 0, ...v, 0, ...cross(u, v), 0, ...at, 1] as Mat4);
  /** Typeset text outline centred on the origin, cap height `h`, reading along +X with +Y up (brand names only, no logo artwork). */
  const text = (str: string, h: number, tracking = .06): CrossSection | undefined => {
    if (!str.trim()) return undefined;
    const f = typeface(), loops: Vec2[][] = [], scale = h / 720;
    let cursor = 0;
    for (const ch of str) {
      const glyph = (f.data.glyphs as Record<string, { ha: number }>)[ch];
      if (!glyph) throw Error(`Cable tower label glyph missing: ${ch}`);
      for (const shape of f.generateShapes(ch, 1000)) for (const path of [shape, ...shape.holes]) loops.push(path.getPoints(3).map(p => [(p.x + cursor) * scale, p.y * scale] as Vec2));
      cursor += glyph.ha + 1000 * tracking;
    }
    const cs = k(new C(loops, 'EvenOdd')), b = cs.bounds();
    return k(cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
  };
  /** Text fitted into a w×h box and extruded `t` thick, placed on a face (u = reading direction, v = up). */
  const label = (str: string, w: number, h: number, t: number, at: Vec3, u: Vec3, v: Vec3) => {
    const raw = text(str, 100); if (!raw) return undefined;
    const b = raw.bounds(), s = Math.min(w / (b.max[0] - b.min[0]), h / (b.max[1] - b.min[1]));
    return place(k(k(raw.scale([s, s])).extrude(t)), at, u, v);
  };
  let xf: ((s: Manifold) => Manifold) | undefined;
  const add = (m: Mat, ...solids: (Manifold | undefined)[]) => {
    const g = groups.get(m[0]) ?? { mat: m, solids: [] };
    g.solids.push(...solids.filter((s): s is Manifold => !!s && !s.isEmpty()).map(s => xf ? xf(s) : s)); groups.set(m[0], g);
  };
  /** Build a sub-assembly in its own frame: every solid added inside `run` is passed through `f` (nests). */
  const within = (f: (s: Manifold) => Manifold, run: () => void) => {
    const prev = xf; xf = prev ? (s => prev(f(s))) : f;
    try { run(); } finally { xf = prev; }
  };
  const mirrorX = (s: Manifold) => k(s.mirror([1, 0, 0]));
  /** Olympic plates on a horn/sleeve: stacked from `origin` outward along `axis`, grouped under one material each. */
  const plates = (ids: readonly PlateId[], origin: Vec3, axis: Vec3, segments = 36) => {
    if (!ids.length) return;
    for (const p of buildPlateStack(api, ids, { origin, axis, name: 'Loaded plate', segments })) {
      owned.push(p.solid);
      const kind = p.name.includes('hub') ? 'steel hubs' : p.name.replace(/^Loaded plate-\d+ /, '');
      add([`Loaded plates · ${kind}`, p.role, p.color!, p.metalness ?? .5, p.roughness ?? .6], p.solid);
    }
  };
  /** Merge each material group, recentre the XY bounding box on the origin, release every intermediate.
   * `center` (optional) pins the build-frame XY point that becomes the origin, for parts whose footprint grows with a param
   * (loaded plates) and is described with a footprint offset instead of moving the machine. */
  const finish = (label: string, run: () => void, center?: Vec2): SolidPart[] => {
    const out: SolidPart[] = []; let success = false;
    try {
      run();
      const merged = [...groups.values()].filter(g => g.solids.length).map(g => ({ g, solid: union(g.solids) }));
      let dx: number, dy: number;
      if (center) { dx = -center[0]; dy = -center[1]; }
      else {
        const all = union(merged.map(m => m.solid)), b = all.boundingBox();
        dx = -(b.min[0] + b.max[0]) / 2; dy = -(b.min[1] + b.max[1]) / 2;
      }
      for (const { g: { mat: [name, role, color, metalness, roughness] }, solid } of merged)
        out.push({ name, solid: move(solid, [dx, dy, 0]), role, color, metalness, roughness, ...(role === 'fastener' ? { authoredFastenerFinish: true } : {}) });
      for (const p of out) if (p.solid.isEmpty() || p.solid.status() !== 'NoError') throw Error(`Invalid ${label} ${p.name}`);
      success = true; return out;
    } finally { const keep = new Set(success ? out.map(p => p.solid) : []); for (const s of owned.reverse()) if (!keep.has(s as Manifold)) s.delete(); }
  };
  return { M, C, k, within, mirrorX, move, union, cut, meet, hull, box, cbox, rotate, transform, beam, rod, cyl, cable, revolve, sheave, upright, rounded, rbox, pad, roller, prismXZ, prismYZ, prismXY, place, text, label, add, plates, finish };
}
export type TowerKit = ReturnType<typeof towerKit>;
