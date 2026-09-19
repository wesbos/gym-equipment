/** Strongman implements: shared Manifold toolkit. Every allocation is owned and freed in `free()`,
 * except the grouped solids `done()` returns (see parts/powerblock.ts for the pattern). */
import type { CrossSection, Manifold, Mat4 } from 'manifold-3d';
import type { ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildPlateStack } from './plates.ts';
import type { PlateId } from '../plates.ts';

export type Role = SolidPart['role'];
export interface Finish { color: string; metalness?: number; roughness?: number; role?: Role }
/** Factory finishes shared across the family (never rack paint). */
export const FINISH = {
  black: { color: '#1b1c1e', metalness: .35, roughness: .55 },
  texturedBlack: { color: '#202123', metalness: .2, roughness: .78 },
  zinc: { color: '#b9bdc0', metalness: .85, roughness: .32 },
  chrome: { color: '#d8dcdf', metalness: 1, roughness: .16 },
  knurl: { color: '#8f9397', metalness: .85, roughness: .5, role: 'handle' as Role },
  stainless: { color: '#c4c8cb', metalness: .9, roughness: .3 },
  fastener: { color: '#2b2c2e', metalness: .8, roughness: .35, role: 'fastener' as Role },
} satisfies Record<string, Finish>;
/** Column-major rigid transform taking local +Z to `axis`, translated to `at`. */
export function alongAxis(axis: Vec3, at: Vec3): Mat4 {
  const n = Math.hypot(...axis), a = axis.map(v => v / n) as Vec3, seed: Vec3 = Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  let u = cross(seed, a); const l = Math.hypot(...u); u = u.map(v => v / l) as Vec3;
  const v = cross(a, u);
  return [...u, 0, ...v, 0, ...a, 0, ...at, 1];
}
/** Small deterministic value noise for organic shapes (fabric sag, natural stone). */
export function noise3(seed: number) {
  const h = (x: number, y: number, z: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453; return s - Math.floor(s); };
  const sm = (t: number) => t * t * (3 - 2 * t), lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const c = (dx: number, dy: number, dz: number) => h(xi + dx, yi + dy, zi + dz);
    return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf), lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf), zf) * 2 - 1;
  };
}

export function strongmanKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [];
  const groups = new Map<string, { solids: Manifold[]; finish: Required<Finish> }>();
  let kept = new Set<Manifold>();
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const rot = (s: Manifold, r: Vec3) => k(s.rotate(r));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const inter = (a: Manifold, b: Manifold) => k(M.intersection([a, b]));
  const hull = (s: Manifold[]) => k(M.hull(s));
  const box = (min: Vec3, max: Vec3) => move(k(M.cube(max.map((v, i) => v - min[i]) as Vec3)), min);
  const cbox = (size: Vec3, center: Vec3) => move(k(M.cube(size, true)), center);
  const sphere = (r: number, at: Vec3 = [0, 0, 0], seg = 32) => move(k(M.sphere(r, seg)), at);
  /** Cylinder (or cone) from point a to point b. */
  const rod = (a: Vec3, b: Vec3, r: number, seg = 32, r2 = r) => {
    const d = b.map((v, i) => v - a[i]) as Vec3, len = Math.hypot(...d);
    return k(k(M.cylinder(len, r, r2, seg)).transform(alongAxis(d, a)));
  };
  /** Axis-aligned cylinder shortcut: axis 'x' | 'y' | 'z', from a to b, centred at the other two coordinates. */
  const bar = (axis: 'x' | 'y' | 'z', a: number, b: number, d: number, u: number, v: number, seg = 32) =>
    axis === 'x' ? rod([a, u, v], [b, u, v], d / 2, seg) : axis === 'y' ? rod([u, a, v], [u, b, v], d / 2, seg) : rod([u, v, a], [u, v, b], d / 2, seg);
  /** Square/rectangular hollow tube between two points (outer w x h, wall t), long axis a -> b. */
  const tube = (a: Vec3, b: Vec3, w: number, h: number, t = 3, r = 3) => {
    const d = b.map((v, i) => v - a[i]) as Vec3, len = Math.hypot(...d);
    const outer = k(k(k(C.square([w - 2 * r, h - 2 * r], true)).offset(r, 'Round', 2, 12)).extrude(len));
    const inner = k(k(k(C.square([w - 2 * t - 2 * Math.max(.5, r - t), h - 2 * t - 2 * Math.max(.5, r - t)], true)).offset(Math.max(.5, r - t), 'Round', 2, 12)).extrude(len + 2));
    return k(k(M.difference([outer, move(inner, [0, 0, -1])])).transform(alongAxis(d, a)));
  };
  /** Rounded rectangle slab: w (x) by l (y) by h (z) with corner radius r, base centred at `at`. */
  const slab = (w: number, l: number, h: number, r: number, at: Vec3) => {
    const rr = Math.max(.1, Math.min(r, w / 2 - .05, l / 2 - .05));
    return move(k(k(k(C.square([w - 2 * rr, l - 2 * rr], true)).offset(rr, 'Round', 2, 16)).extrude(h)), at);
  };
  /** Polygon (x, y) extruded along +Z by h from z0. */
  const prism = (pts: Vec2[], h: number, z0 = 0) => move(k(k(new C([pts], 'EvenOdd')).extrude(h)), [0, 0, z0]);
  /** Revolve a closed (r, z) polygon about Z. */
  const revolve = (ring: Vec2[], seg = 64, degrees = 360) => k(k(new C([ring], 'EvenOdd')).revolve(seg, degrees));
  /** Torus (ring) about Z: major radius R, minor radius r. */
  const torus = (R: number, r: number, seg = 48, minor = 16) => k(k(k(C.circle(r, minor)).translate([R, 0])).revolve(seg));
  const add = (name: string, solid: Manifold, finish: Finish) => {
    const g = groups.get(name) ?? { solids: [], finish: { role: 'source', metalness: 0, roughness: .6, ...finish } };
    g.solids.push(solid); groups.set(name, g);
  };
  const plates = (list: readonly PlateId[], origin: Vec3, axis: Vec3, name: string) => {
    if (!list.length) return;
    for (const p of buildPlateStack(api, list, { origin, axis, name, segments: 64 })) { k(p.solid); add(p.name.replace(/-\d+ /, ' '), p.solid, { color: p.color!, metalness: p.metalness, roughness: p.roughness, role: 'source' }); }
  };
  /** Groups -> SolidParts, re-centred on the footprint (floor at z = 0) and optionally fitted to exact
   * width/depth: organic shapes are scaled by at most `fit` (fraction) so their box matches the footprint. */
  const done = (target?: { width: number; depth: number; fit?: number }) => {
    const out: SolidPart[] = [];
    for (const [name, g] of groups) out.push({ name, solid: union(g.solids), ...g.finish });
    const all = k(M.union(out.map(p => p.solid))), b = all.boundingBox();
    const size = [b.max[0] - b.min[0], b.max[1] - b.min[1]], centre: Vec3 = [(b.max[0] + b.min[0]) / 2, (b.max[1] + b.min[1]) / 2, b.min[2]];
    let sx = 1, sy = 1;
    if (target) {
      sx = target.width / size[0]; sy = target.depth / size[1];
      const tol = target.fit ?? .004;
      if (Math.abs(sx - 1) > tol || Math.abs(sy - 1) > tol) throw Error(`Strongman build ${size.map(v => v.toFixed(1)).join(' x ')} misses footprint ${target.width.toFixed(1)} x ${target.depth.toFixed(1)}`);
    }
    for (const p of out) {
      p.solid = move(p.solid, centre.map(v => -v) as Vec3);
      if (sx !== 1 || sy !== 1) p.solid = k(p.solid.scale([sx, sy, 1]));
      if (p.solid.isEmpty() || p.solid.status() !== 'NoError') throw Error(`Invalid strongman solid ${p.name}`);
    }
    kept = new Set(out.map(p => p.solid));
    return out;
  };
  const free = () => { for (const s of owned.reverse()) if (!kept.has(s as Manifold)) s.delete(); owned.length = 0; };
  return { api, M, C, k, move, rot, union, cut, inter, hull, box, cbox, sphere, rod, bar, tube, slab, prism, revolve, torus, add, plates, done, free };
}
export type Kit = ReturnType<typeof strongmanKit>;
/** Standard build wrapper: allocate a kit, run the body, keep only the returned solids. */
export function withKit(api: ManifoldAPI, body: (K: Kit) => SolidPart[]): SolidPart[] {
  const K = strongmanKit(api);
  try { return body(K); } finally { K.free(); }
}
