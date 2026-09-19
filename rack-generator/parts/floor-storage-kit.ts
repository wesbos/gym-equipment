/** Shared Manifold helpers for the floor-storage family (#123), built on the wall-storage Kit (owned-memory cleanup,
 * material groups) plus floor-frame primitives: oriented tubes, plane prisms, casters, bolts, typeset lettering and the
 * stored loads (Olympic bars, plate stacks, dumbbells, kettlebells) merged into shared material groups.
 * Floor axes: X across, Y depth (-Y front), Z up; origin on the floor at the footprint centre. */
import type { CrossSection, Manifold, Mat4 } from 'manifold-3d';
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import type { SolidPart, Vec2, Vec3 } from '../types.ts';
import { PLATE_BORE, PLATE_GAP, PLATE_SPECS, type PlateId } from '../plates.ts';
import { buildPlateStack } from './plates.ts';
import { kit, finish, olympicBar, ZINC, type Kit, type Finish } from './wall-storage-kit.ts';
export { kit, finish, olympicBar, ZINC, type Kit, type Finish };
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
/** Right-handed basis matrix: local X → u, local Y → v, local Z → u × v, then translate. */
export const basis = (u: Vec3, v: Vec3, at: Vec3): Mat4 => { const w = cross(u, v); return [...u, 0, ...v, 0, ...w, 0, ...at, 1] as Mat4; };
/** Rectangular section (w along `side`, h across) from a to b. */
export function beam(k: Kit, a: Vec3, b: Vec3, w: number, h: number, side: Vec3 = [1, 0, 0]) {
  const d = sub(b, a), len = Math.hypot(...d), ax = unit(d), s = unit(sub(side, ax.map(v => v * dot(side, ax)) as Vec3)), t = cross(ax, s);
  const c = k.k(k.api.Manifold.cube([w, h, len], true));
  return k.k(c.transform([...s, 0, ...t, 0, ...ax, 0, ...a.map((v, i) => v + d[i] / 2), 1] as Mat4));
}
/** Round bar from a to b. */
export const pipe = (k: Kit, a: Vec3, b: Vec3, r: number, n = 32) => { const d = sub(b, a); return k.rod(a, unit(d), Math.hypot(...d), r, n); };
export type Plane = 'yz' | 'xz' | 'xy';
/** Counter-clockwise copy of a simple polygon (the Kit's 'Positive' fill drops clockwise loops). */
export const ccw = (pts: Vec2[]) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) < 0 ? [...pts].reverse() : pts;
/** Polygon in a principal plane extruded `t` along the remaining axis starting at `at` (x for yz, y for xz, z for xy). */
export function prism(k: Kit, cs: CrossSection | Vec2[], t: number, plane: Plane, at = 0) {
  const s = Array.isArray(cs) ? k.poly(ccw(cs)) : cs, e = k.k(s.extrude(t));
  if (plane === 'xy') return k.k(e.translate([0, 0, at]));
  if (plane === 'yz') return k.k(e.transform(basis([0, 1, 0], [0, 0, 1], [at, 0, 0])));
  return k.k(e.transform(basis([1, 0, 0], [0, 0, 1], [0, at + t, 0])));
}
/** Hex-head bolt with washer, head outward along `n` from the face point `at`. */
export function bolt(k: Kit, at: Vec3, n: Vec3, size = 10) {
  k.add(ZINC, k.rod(at, n, 1.6, size * 1.05, 20), k.rod(at.map((v, i) => v + n[i] * 1.6) as Vec3, n, size * .65, size * .85, 6));
}
/** Swivel caster under a frame point: top plate at `height`, swivel race, fork, `wheel` Ø tyre on an X axle, locking pedal on the ±X side. */
export function caster(k: Kit, x: number, y: number, height: number, wheel: number, f: { steel: Finish; tyre: Finish }, lock: -1 | 0 | 1 = 0) {
  const r = wheel / 2, w = Math.max(20, wheel * .38), plate = wheel * .6, top = height, off = 0;
  k.add(f.steel, k.span([x - plate / 2, y - plate / 2, top - 3.5], [x + plate / 2, y + plate / 2, top]));
  k.add(f.steel, k.cyl(8, plate * .38, 'z', [x, y, top - 7.5], 24));
  const forkTop = top - 11.5;
  for (const s of [-1, 1]) k.add(f.steel, k.span([x + s * (w / 2 + 1) - 1.25, y - r * .55, r - 6], [x + s * (w / 2 + 1) + 1.25, y + r * .55, forkTop]));
  k.add(f.steel, k.span([x - w / 2 - 2.5, y - r * .55, forkTop - 3], [x + w / 2 + 2.5, y + r * .55, forkTop]));
  k.add(f.tyre, k.cyl(w, r, 'x', [x, y + off, r], 32));
  k.add(f.steel, k.cyl(w + 8, 5, 'x', [x, y + off, r], 12));
  // Foot-operated total-lock pedal on the fork side.
  if (lock) k.add(f.tyre, k.span([x + lock * (w / 2 + 2.5), y - r * .35, r * 1.1], [x + lock * (w / 2 + 14), y + r * .35, r * 1.1 + 5]));
}
let font: Font | undefined;
const typeface = () => font ??= new FontLoader().parse(helvetiker as never);
/** Typeset text outline (Helvetiker Bold, no logo artwork) centred on the origin, cap height `h`, reading along +X. */
export function text(k: Kit, str: string, h: number, tracking = .06): CrossSection {
  const f = typeface(), loops: Vec2[][] = [], scale = h / 720; let cursor = 0;
  for (const ch of str) {
    const glyph = (f.data.glyphs as Record<string, { ha: number }>)[ch];
    if (!glyph) throw Error(`Missing glyph ${ch}`);
    for (const shape of f.generateShapes(ch, 1000)) for (const path of [shape, ...shape.holes]) loops.push(path.getPoints(3).map(p => [(p.x + cursor) * scale, p.y * scale] as Vec2));
    cursor += glyph.ha + 1000 * tracking;
  }
  const cs = k.k(new k.api.CrossSection(loops, 'EvenOdd')), b = cs.bounds();
  return k.k(cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
}
/** Text fitted into a w × h box (keeps aspect), optionally rotated a quarter turn to read upward. */
export function fitText(k: Kit, str: string, w: number, h: number, vertical = false) {
  const t = text(k, str, 100), b = t.bounds(), tw = b.max[0] - b.min[0], th = b.max[1] - b.min[1];
  const s = vertical ? Math.min(h / tw, w / th) : Math.min(w / tw, h / th), scaled = k.k(t.scale([s, s]));
  return vertical ? k.k(scaled.rotate(90)) : scaled;
}
/** Place a centred XY section (text or badge) on a face: section X → u, section Y → v, thickness `t` along u × v from `at`. */
export const onFace = (k: Kit, cs: CrossSection, t: number, at: Vec3, u: Vec3, v: Vec3) => k.k(k.k(cs.extrude(t)).transform(basis(u, v, at)));

// ── Stored loads ─────────────────────────────────────────────────────────────────────────────────────
/** Men's 20 kg Olympic bar standing on its end (sleeve down) with its lower end cap on the floor point (x, y, z). */
export const standingBar = (k: Kit, x: number, y: number, z: number, length: number, oxide: boolean) => olympicBar(k, [x, y, z + length / 2], [0, 0, 1], oxide);
/** Plate stack on a horn or peg through buildPlateStack (48 segments), plates hung on the horn top: the bore rests on it. */
export function hornPlates(k: Kit, plates: readonly PlateId[], root: Vec3, axis: Vec3, hornD: number, name: string) {
  if (!plates.length) return;
  const sag = Math.max(0, (PLATE_BORE - hornD) / 2), origin: Vec3 = [root[0], root[1], root[2] + sag];
  const parts = buildPlateStack(k.api, plates, { origin, axis, name, segments: 48 });
  adopt(k, parts);
}
export const stackLength = (plates: readonly PlateId[]) => plates.reduce((s, p, i) => s + PLATE_SPECS[p].width + (i ? PLATE_GAP : 0), 0);
const finishCache = new Map<string, Finish>();
/** Material Finish shared by every solid with the same name/role/colour so repeated loads merge into one group. */
export function sharedFinish(p: Pick<SolidPart, 'name' | 'role' | 'color' | 'metalness' | 'roughness'>, rename?: string) {
  const name = rename ?? p.name, key = `${name}|${p.role}|${p.color}|${p.metalness}|${p.roughness}`;
  let f = finishCache.get(key); if (!f) finishCache.set(key, f = finish(name, p.role, p.color ?? '#808080', p.metalness ?? 0, p.roughness ?? .5));
  return f;
}
/** Take ownership of built SolidParts (another family's builder output), optionally transformed, merging them by material.
 * `rename` maps a source part to its merged group name (e.g. plate labels collapse into one group per colour). */
export function adopt(k: Kit, parts: SolidPart[], m?: Mat4, rename: (p: SolidPart) => string | undefined = p => p.name.replace(/^.*?-\d+ /, 'Stored plates · ')) {
  for (const p of parts) { k.k(p.solid); k.add(sharedFinish(p, rename(p)), m ? k.k(p.solid.transform(m)) : p.solid); }
}
/** Rotation about X by `deg` (tilted shelves), then translation. */
export const tiltX = (deg: number, at: Vec3): Mat4 => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, ...at, 1] as Mat4; };
/** Quarter turn about Z (handle along X) then translation. */
export const turnZ = (at: Vec3): Mat4 => [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, ...at, 1] as Mat4;
const URETHANE = finish('Stored dumbbells · black urethane heads', 'source', '#18191b', 0, .6);
const CHROME = finish('Stored dumbbells · chrome handles', 'handle', '#d3d8dc', .95, .2);
/** Low-poly round urethane dumbbell (handle along Y, resting on the floor point): heads Ø D × L with chamfers, chrome grip and collars. */
export function urethaneDumbbell(k: Kit, s: { D: number; L: number; gap: number; handle: { d: number } }, m: Mat4) {
  const R = s.D / 2, c = Math.min(6, s.L * .12), head = (y0: number, dir: number) => {
    const ring: Vec2[] = [[0, 0], [R - c, 0], [R, c], [R, s.L - c], [R - c, s.L], [0, s.L]].map(([r, y]) => [r, y0 + dir * y] as Vec2);
    const cs = k.poly(dir > 0 ? ring : ring.map(([r, y]) => [r, y] as Vec2).reverse());
    return k.k(k.k(cs.revolve(32)).transform(basis([1, 0, 0], [0, 0, -1], [0, 0, 0])));
  };
  const place = (x: Manifold) => k.k(k.k(x.translate([0, 0, R])).transform(m));
  k.add(URETHANE, place(head(s.gap / 2, 1)), place(head(-s.gap / 2, -1)));
  k.add(CHROME, place(k.cyl(s.gap + 2, s.handle.d / 2, 'y', [0, 0, 0], 20)));
  for (const side of [-1, 1]) k.add(CHROME, place(k.cyl(6, s.handle.d / 2 + 4, 'y', [0, side * (s.gap / 2 - 3), 0], 20)));
}
const BELL_IRON = finish('Stored kettlebells · textured black cast iron', 'source', '#1f2022', .2, .78);
/** Low-poly kettlebell from a solved bell layout: truncated sphere body + hull-of-spheres handle, colour band on both horns. */
export function lowBell(k: Kit, l: { R: number; zc: number; path: { x: number; z: number; r: number; s: number }[] }, band: string | undefined, at: Vec3) {
  const M = k.api.Manifold, body = k.k(M.intersection([k.k(k.k(M.sphere(l.R, 28)).translate([0, 0, l.zc])), k.span([-l.R - 1, -l.R - 1, 0], [l.R + 1, l.R + 1, l.zc + l.R + 1])]));
  const hulls: Manifold[] = [], bands: Manifold[] = [], pts = l.path.filter((p, i) => i % 3 === 0 || i === l.path.length - 1);
  for (const sx of [1, -1]) for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    hulls.push(k.k(M.hull([k.k(k.k(M.sphere(a.r, 8)).translate([sx * a.x, 0, a.z])), k.k(k.k(M.sphere(b.r, 8)).translate([sx * b.x, 0, b.z]))])));
    if (band && a.s >= 0 && b.s <= 16 && b.s > 0) bands.push(k.k(M.hull([k.k(k.k(M.sphere(a.r + .8, 12)).translate([sx * a.x, 0, a.z])), k.k(k.k(M.sphere(b.r + .8, 12)).translate([sx * b.x, 0, b.z]))])));
  }
  k.add(BELL_IRON, k.k(k.union([body, ...hulls]).translate(at)));
  if (band && bands.length) k.add(sharedFinish({ name: 'Stored kettlebells · colour bands', role: 'source', color: band, metalness: .05, roughness: .6 }), k.k(k.union(bands).translate(at)));
}
export const IRON_CHANGE = finish('Stored 1″ standard plates · black rubber coated', 'source', '#1c1d1f', .05, .8);
export const PLATE_RING = finish('Stored 1″ standard plates · steel inserts', 'source', '#b6babd', .85, .3);
/** 1″ standard grip plate (rubber coated, steel bore ring) on a peg axis along ±X at (x, y, z), inner face at x. */
export function standardPlate(k: Kit, d: number, w: number, x: number, dir: number, y: number, z: number) {
  const R = d / 2, b = 14, ring: Vec2[] = [[b + 1, 0], [R - 3, 0], [R, 3], [R, w - 3], [R - 3, w], [R * .72, w], [R * .68, w * .7], [b + 18, w * .7], [b + 14, w], [b + 1, w]];
  const plate = k.k(k.k(k.poly(ring).revolve(40)).transform(basis([0, 1, 0], [0, 0, 1], [0, 0, 0])));
  const place = (s: Manifold) => k.k((dir > 0 ? s : k.k(s.mirror([1, 0, 0]))).translate([x, y, z]));
  k.add(IRON_CHANGE, place(plate));
  k.add(PLATE_RING, place(k.k(k.k(k.poly([[b, 0], [b + 1.5, 0], [b + 1.5, w], [b, w]]).revolve(24)).transform(basis([0, 1, 0], [0, 0, 1], [0, 0, 0])))));
}
