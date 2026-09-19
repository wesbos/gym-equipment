/** Shared Manifold kit for the hypers family (reverse hypers, GHDs, back extensions).
 * Z up, millimetres. Every intermediate is tracked and released by `done`/`fail`; only returned solids survive. */
import type { CrossSection, Manifold, Mat4 } from 'manifold-3d';
import type { ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
import type { PlateId } from '../plates.ts';
import { buildPlateStack } from './plates.ts';
type Role = SolidPart['role'];
export type Material = readonly [name: string, role: Role, color: string, metalness: number, roughness: number];
export type Pt = [number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const unit = (v: Vec3): Vec3 => { const n = Math.hypot(...v); if (!(n > 0)) throw Error('Zero-length member.'); return v.map(x => x / n) as Vec3; };
/** Column-major rigid transform: local +Z along `axis`, local +X toward `side` (orthogonalised), origin at `at`. */
export function frameMatrix(axis: Vec3, side: Vec3, at: Vec3): Mat4 {
  const a = unit(axis); let s = cross(cross(a, side), a);
  if (Math.hypot(...s) < 1e-9) s = cross(cross(a, Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0]), a);
  const u = unit(s), v = cross(a, u);
  return [...u, 0, ...v, 0, ...a, 0, ...at, 1] as Mat4;
}
/** Rotate a point about the X axis through `pivot` by `deg` (positive tips +Y toward +Z). */
export function rotX(p: Vec3, pivot: Vec3, deg: number): Vec3 {
  const a = deg * Math.PI / 180, y = p[1] - pivot[1], z = p[2] - pivot[2];
  return [p[0], pivot[1] + y * Math.cos(a) - z * Math.sin(a), pivot[2] + y * Math.sin(a) + z * Math.cos(a)];
}
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function hyperKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [], groups = new Map<Material, Manifold[]>(), extra: SolidPart[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const at = (s: Manifold, v: Vec3) => k(s.translate(v));
  const box = (min: Vec3, max: Vec3) => at(k(M.cube(sub(max, min))), min);
  const cube = (size: Vec3, centre: Vec3) => at(k(M.cube(size, true)), centre);
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => k(M.difference([s, ...holes]));
  const hull = (s: Manifold[]) => k(M.hull(s));
  const place = (s: Manifold, m: Mat4) => k(s.transform(m));
  /** Rectangular member from a to b: `w` across (toward `side`, default X), `h` in the remaining direction. */
  const bar = (a: Vec3, b: Vec3, w: number, h: number, side: Vec3 = [1, 0, 0]) => {
    const len = Math.hypot(...sub(b, a));
    return place(k(M.cube([w, h, len])).translate([-w / 2, -h / 2, 0]), frameMatrix(sub(b, a), side, a));
  };
  const rod = (a: Vec3, b: Vec3, d: number, n = 32) => place(k(M.cylinder(Math.hypot(...sub(b, a)), d / 2, d / 2, n)), frameMatrix(sub(b, a), [1, 0, 0], a));
  const cone = (a: Vec3, b: Vec3, d0: number, d1: number, n = 32) => place(k(M.cylinder(Math.hypot(...sub(b, a)), d0 / 2, d1 / 2, n)), frameMatrix(sub(b, a), [1, 0, 0], a));
  const ball = (c: Vec3, d: number, n = 24) => at(k(M.sphere(d / 2, n)), c);
  const rrect = (w: number, l: number, r: number) => { const rr = Math.max(.5, Math.min(r, w / 2 - .5, l / 2 - .5)); return k(k(C.square([w - 2 * rr, l - 2 * rr], true)).offset(rr, 'Round', 2, 24)); };
  /** Rounded-plan slab, bottom at z0, centred on (x, y). */
  const slab = (w: number, l: number, h: number, r: number, c: Vec3) => at(k(rrect(w, l, r).extrude(h)), c);
  /** Upholstered pad in local frame: X width, Y length, Z thickness from 0; corner radius r, crowned edge radius e. */
  const cushion = (w: number, l: number, t: number, r: number, e: number) => {
    const layers: Manifold[] = [], steps = 4, base = Math.max(1, t - e);
    layers.push(k(rrect(w, l, r).extrude(base)));
    for (let i = 1; i <= steps; i++) {
      const a = (i / steps) * Math.PI / 2, inset = e * (1 - Math.cos(a)), z = base + e * Math.sin(a);
      layers.push(at(k(rrect(w - 2 * inset, l - 2 * inset, Math.max(1, r - inset)).extrude(.01 + (i === steps ? 0 : 0))), [0, 0, z - .01]));
    }
    return hull(layers);
  };
  /** Stadium band (strap loop) lying in the local XY plane, `width` thick along local Z. */
  const band = (w: number, h: number, thick: number, width: number) => {
    const outer = rrect(w, h, Math.min(w, h) / 2), inner = rrect(w - 2 * thick, h - 2 * thick, Math.min(w, h) / 2 - thick);
    return k(k(C.difference([outer, inner])).extrude(width));
  };
  /** Prism: polygon in the Y/Z plane, extruded along +X from x0 by t. */
  const prismX = (pts: Pt[], t: number, x0: number) => at(k(k(k(new C([pts])).extrude(t)).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1] as Mat4)), [x0, 0, 0]);
  /** Revolved profile of (radius, axial) points about local Z, then placed along a→axis. */
  const revolve = (profile: Pt[], origin: Vec3, axis: Vec3, n = 48) => place(k(k(new C([profile])).revolve(n)), frameMatrix(axis, [1, 0, 0], origin));
  /** Foam roller with hard end caps, axis a→b. */
  const roller = (a: Vec3, b: Vec3, d: number, cap = 8) => {
    const dir = unit(sub(b, a)), len = Math.hypot(...sub(b, a)), inA = a.map((v, i) => v + dir[i] * cap) as Vec3, inB = b.map((v, i) => v - dir[i] * cap) as Vec3;
    return { foam: cone(inA, inB, d, d, 40), caps: [rod(a, inA, d * .82, 32), rod(inB, b, d * .82, 32)], len };
  };
  const add = (m: Material, ...s: Manifold[]) => {
    for (const x of s) if (x.status() !== 'NoError' || x.isEmpty()) throw Error(`Invalid solid for ${m[0]} (#${(groups.get(m)?.length ?? 0) + 1}): ${x.status()}`);
    const g = groups.get(m) ?? []; g.push(...s); groups.set(m, g);
  };
  /** Pivot a set of solids about an X-axis hinge. */
  const hinge = (s: Manifold, pivot: Vec3, deg: number) => deg ? k(k(k(s.translate([-pivot[0], -pivot[1], -pivot[2]])).rotate([deg, 0, 0])).translate(pivot)) : s;
  const plates = (stack: readonly PlateId[], origin: Vec3, axis: Vec3, name: string) => {
    if (!stack.length) return;
    const parts = buildPlateStack(api, stack, { origin, axis, name, segments: 72 });
    for (const p of parts) owned.push(p.solid);
    extra.push(...parts);
  };
  /** Union each material group into one SolidPart, shift everything by `shift`, and release every intermediate. */
  const done = (shift: Vec3 = [0, 0, 0], label = 'hyper'): SolidPart[] => {
    const out: SolidPart[] = [];
    for (const [[name, role, color, metalness, roughness], solids] of groups) out.push({ name, solid: at(union(solids), shift), role, color, metalness, roughness });
    for (const p of extra) out.push({ ...p, solid: at(p.solid, shift) });
    for (const p of out) if (p.solid.isEmpty() || p.solid.status() !== 'NoError') throw Error(`Invalid ${label} ${p.name}`);
    const keep = new Set<Manifold | CrossSection>(out.map(p => p.solid));
    for (const s of owned.reverse()) if (!keep.has(s)) s.delete();
    owned.length = 0;
    return out;
  };
  const fail = () => { for (const s of owned.reverse()) s.delete(); owned.length = 0; };
  const plateCentre = (pivot: Vec3, p: Vec3, swing: number) => rotX(p, pivot, -swing);
  return { plateCentre, M, C, k, at, box, cube, union, cut, hull, place, bar, rod, cone, ball, rrect, slab, cushion, band, prismX, revolve, roller, add, hinge, plates, done, fail };
}
export type HyperKit = ReturnType<typeof hyperKit>;
/** Run a builder with the kit, releasing all WASM memory on failure. */
export function buildWith(api: ManifoldAPI, label: string, body: (kit: HyperKit) => Vec3 | void): SolidPart[] {
  const kit = hyperKit(api);
  try { const shift = body(kit); return kit.done(shift ?? [0, 0, 0], label); } catch (e) { kit.fail(); throw e; }
}
