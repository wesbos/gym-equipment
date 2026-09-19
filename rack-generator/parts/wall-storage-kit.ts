/** Shared Manifold kit for the wall-storage family (#128): material-grouped solids with owned-memory cleanup, wall-plane
 * profile extrusions, and the stored loads (a faithful Olympic bar, change plates, medicine balls).
 * Wall axes: X along the wall, -Y out of it (d = distance from the wall = -y), Z up. */
import type { CrossSection, Manifold, Mat4 } from 'manifold-3d';
import type { ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { MaterialRole } from '../appearance.ts';
import { BAR } from '../floor-parts/barbell.ts';
import { PLATE_SPECS, type PlateId } from '../plates.ts';
import { buildPlateStack } from './plates.ts';
import { CHANGE_PLATES, type StoredPlate } from '../wall-parts/wall-storage.ts';
export interface Finish { name: string; role: MaterialRole; color: string; metalness: number; roughness: number }
export const finish = (name: string, role: MaterialRole, color: string, metalness: number, roughness: number): Finish => ({ name, role, color, metalness, roughness });
export const ZINC = finish('Zinc-plated mounting hardware', 'fastener', '#b9bdc0', .85, .3);
export const UHMW = finish('Black UHMW liners', 'liner', '#141516', 0, .55);
/** Column-major rigid transform taking local +Z to `axis`, translated to `at`. */
export function frame(axis: Vec3, at: Vec3): Mat4 {
  const length = Math.hypot(...axis), a = axis.map(v => v / length) as Vec3, seed: Vec3 = Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  let u = cross(seed, a); const n = Math.hypot(...u); u = u.map(v => v / n) as Vec3;
  const v = cross(a, u);
  return [...u, 0, ...v, 0, ...a, 0, ...at, 1];
}
export class Kit {
  readonly owned: (Manifold | CrossSection)[] = [];
  readonly groups = new Map<Finish, Manifold[]>();
  readonly extra: SolidPart[] = [];
  constructor(readonly api: ManifoldAPI) {}
  k<T extends Manifold | CrossSection>(s: T): T { this.owned.push(s); return s; }
  /** Axis-aligned box between two corners. */
  span(a: Vec3, b: Vec3) { const size = a.map((v, i) => Math.abs(b[i] - v)) as Vec3, c = a.map((v, i) => (v + b[i]) / 2) as Vec3; return this.k(this.k(this.api.Manifold.cube(size, true)).translate(c)); }
  /** Cylinder centred at `at` along a principal axis. */
  cyl(length: number, r: number, axis: 'x' | 'y' | 'z', at: Vec3, n = 32) {
    let s = this.k(this.api.Manifold.cylinder(length, r, r, n, true));
    if (axis === 'x') s = this.k(s.rotate([0, 90, 0])); else if (axis === 'y') s = this.k(s.rotate([90, 0, 0]));
    return this.k(s.translate(at));
  }
  /** Cylinder from `from` along `axis` (unit-ish vector) for `length`. */
  rod(from: Vec3, axis: Vec3, length: number, r: number, n = 32) { return this.k(this.k(this.api.Manifold.cylinder(length, r, r, n)).transform(frame(axis, from))); }
  place(s: Manifold, axis: Vec3, at: Vec3) { return this.k(s.transform(frame(axis, at))); }
  union(parts: Manifold[]) { return this.k(this.api.Manifold.union(parts)); }
  cut(s: Manifold, holes: Manifold[]) { return holes.length ? this.k(this.api.Manifold.difference([s, ...holes])) : s; }
  compose(parts: Manifold[]) { return this.k(this.api.Manifold.compose(parts)); }
  // 2D sections
  poly(points: Vec2[]) { return this.k(new this.api.CrossSection([points], 'Positive')); }
  rect(a: Vec2, b: Vec2) { return this.poly([[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]); }
  circle(c: Vec2, r: number, n = 32) { return this.k(this.k(this.api.CrossSection.circle(r, n)).translate(c)); }
  csUnion(parts: CrossSection[]) { return this.k(this.api.CrossSection.union(parts)); }
  csCut(a: CrossSection, holes: CrossSection[]) { return holes.length ? this.k(this.api.CrossSection.difference([a, ...holes])) : a; }
  offset(c: CrossSection, delta: number) { return this.k(c.offset(delta, 'Round', 2, 24)); }
  /** Front profile (x, z) extruded out of the wall: occupies y ∈ [y0 - t, y0]. */
  front(c: CrossSection, t: number, y0 = 0) { return this.k(this.k(this.k(c.extrude(t)).rotate([90, 0, 0])).translate([0, y0, 0])); }
  /** Side profile (d, z) with d = distance from the wall, extruded along X: occupies x ∈ [x0, x0 + t]. */
  side(c: CrossSection, t: number, x0: number) { return this.k(this.k(this.k(this.k(c.extrude(t)).rotate([90, 0, 0])).rotate([0, 0, -90])).translate([x0 + t, 0, 0])); }
  /** Plan profile in wall coordinates (x, y ≤ 0) extruded up: occupies z ∈ [z0, z0 + t]. */
  plan(c: CrossSection, t: number, z0: number) { return this.k(this.k(c.extrude(t)).translate([0, 0, z0])); }
  add(f: Finish, ...solids: Manifold[]) { const list = this.groups.get(f) ?? []; list.push(...solids); this.groups.set(f, list); }
  /** Hex-head lag/bolt with washer, head outward, on a wall-facing surface at depth `d`. */
  lag(x: number, z: number, d: number, size = 8, n = 6) {
    this.add(ZINC, this.cyl(1.6, size * 1.4, 'y', [x, -d - .8, z], 24), this.cyl(size * .7, size * .95, 'y', [x, -d - 1.6 - size * .35, z], n));
  }
  finish(): SolidPart[] {
    const out: SolidPart[] = [];
    for (const [f, solids] of this.groups) {
      const solid = solids.length === 1 ? solids[0] : this.union(solids);
      out.push({ name: f.name, solid, role: f.role, color: f.color, metalness: f.metalness, roughness: f.roughness, ...(f.role === 'fastener' ? { authoredFastenerFinish: true } : {}) });
    }
    return [...out, ...this.extra];
  }
}
/** Runs a builder with owned-memory cleanup: every intermediate is deleted, only returned solids survive. */
export function kit(api: ManifoldAPI, build: (k: Kit) => void): SolidPart[] {
  const k = new Kit(api); let out: SolidPart[] = [];
  try {
    build(k); out = k.finish();
    for (const p of out) if (p.solid.isEmpty() || p.solid.status() !== 'NoError' || !(p.solid.volume() > 0)) throw Error(`Invalid wall storage solid: ${p.name}`);
    return out;
  } catch (e) { out = []; throw e; } finally {
    const keep = new Set(out.map(p => p.solid));
    for (const s of [...k.owned].reverse()) if (!keep.has(s as Manifold)) s.delete();
    for (const p of k.extra) if (!keep.has(p.solid)) p.solid.delete();
  }
}

// ── Stored loads ──────────────────────────────────────────────────────────────────────────────────────
const CHROME = finish('Hard chrome bar shafts', 'source', '#d7dce0', 1, .17), OXIDE = finish('Black oxide bar shafts', 'source', '#2a2c2f', .7, .42);
const KNURL_CHROME = finish('Chrome bar knurling', 'handle', '#a4aaae', .9, .6), KNURL_OXIDE = finish('Black oxide bar knurling', 'handle', '#1e2022', .75, .66);
const SLEEVE = finish('Bright chrome bar sleeves', 'source', '#e1e5e8', 1, .13), END_CAP = finish('Bar sleeve end caps', 'source', '#55585c', .8, .35);
/** Men's 20 kg Olympic bar (BAR): 28.5 mm shaft with IWF/IPF knurl bands, 56 mm collars and 50 mm sleeves, laid along `axis`
 * with its centre at `at`. `finish` 0 = hard chrome, 1 = black oxide shaft. Low-poly, ~2k triangles. */
export function olympicBar(k: Kit, at: Vec3, axis: Vec3, oxide = false) {
  const r = BAR.shaft / 2, n = 24, pieces = (f: Finish, list: Manifold[]) => k.add(f, ...list.map(s => k.place(s, axis, at)));
  pieces(oxide ? OXIDE : CHROME, [k.cyl(2 * BAR.shaftHalf + 2, r, 'z', [0, 0, 0], n)]);
  const zones: Vec2[] = [[-BAR.centerKnurl, BAR.centerKnurl]];
  for (const side of [-1, 1]) { let from: number = BAR.knurl[0]; for (const ring of BAR.rings) { zones.push(side > 0 ? [from, ring - 2.5] : [-(ring - 2.5), -from]); from = ring + 2.5; } zones.push(side > 0 ? [from, BAR.knurl[1]] : [-BAR.knurl[1], -from]); }
  pieces(oxide ? KNURL_OXIDE : KNURL_CHROME, zones.map(([a, b]) => k.cyl(b - a, r + .35, 'z', [0, 0, (a + b) / 2], n)));
  const sleeves: Manifold[] = [], caps: Manifold[] = [];
  for (const side of [-1, 1]) {
    const c0 = BAR.shaftHalf, c1 = c0 + BAR.collar, end = BAR.length / 2;
    sleeves.push(k.cyl(BAR.collar, BAR.collarDiameter / 2, 'z', [0, 0, side * (c0 + c1) / 2], 32), k.cyl(end - c1 - 3, BAR.sleeveDiameter / 2, 'z', [0, 0, side * (c1 + end - 3) / 2], 32));
    caps.push(k.cyl(3, 19, 'z', [0, 0, side * (end - 1.5)], 24));
  }
  pieces(SLEEVE, sleeves); pieces(END_CAP, caps);
}
const CHANGE_IRON = finish('Black iron change plates', 'source', '#1d1f21', .5, .62);
const ball = { skin: finish('Black vinyl medicine balls', 'source', '#1b1c1e', 0, .72), band: finish('Medicine ball seam bands', 'source', '#0f1011', 0, .85) };
/** Plates stacked from `origin` along `axis`: table plates through buildPlateStack, 5/2.5 lb change plates as iron revolves. */
export function plateStack(k: Kit, plates: readonly StoredPlate[], origin: Vec3, axis: Vec3, name: string) {
  const length = Math.hypot(...axis), unit = axis.map(v => v / length) as Vec3;
  let offset = 0;
  for (const [i, id] of plates.entries()) {
    const at = origin.map((v, j) => v + unit[j] * offset) as Vec3;
    if (id in PLATE_SPECS) k.extra.push(...buildPlateStack(k.api, [id as PlateId], { origin: at, axis: unit, name: `${name} ${i + 1}`, segments: 48 }));
    else {
      const spec = CHANGE_PLATES[id as keyof typeof CHANGE_PLATES], R = spec.diameter / 2, w = spec.width, b = 25.4;
      const ring: Vec2[] = [[b, .8], [b + .8, 0], [R - 1.5, 0], [R, 1.5], [R, w - 1.5], [R - 1.5, w], [R - 9, w], [R - 12, w * .55], [b + 16, w * .55], [b + 12, w], [b + .8, w], [b, w - .8]];
      k.add(CHANGE_IRON, k.place(k.k(k.k(new k.api.CrossSection([ring], 'Positive')).revolve(48)), unit, at));
    }
    offset += (id in PLATE_SPECS ? PLATE_SPECS[id as PlateId].width : CHANGE_PLATES[id as keyof typeof CHANGE_PLATES].width) + .5;
  }
}
/** 14″ vinyl medicine ball with a darker equator seam band. */
export function medBall(k: Kit, at: Vec3, diameter: number) {
  const r = diameter / 2, s = k.k(k.api.Manifold.sphere(r, 48)), band = k.k(k.k(k.api.Manifold.sphere(r + 1.2, 48)).intersect(k.span([-r - 2, -r - 2, -22], [r + 2, r + 2, 22])));
  k.add(ball.skin, k.k(s.translate(at))); k.add(ball.band, k.k(k.k(band.rotate([90, 0, 20])).translate(at)));
}
