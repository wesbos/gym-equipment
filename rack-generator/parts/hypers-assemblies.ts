/** Shared sub-assemblies for the hypers family: reverse-hyper pendulums with plate horns and straps, GHD roller
 * carriages with footplates, humped GHD pads, lettered frame plates and rubber-gripped handles. All add their solids to
 * the kit; geometry maths that drives footprints lives in ../floor-parts/hypers.ts (pendulumExtent). */
import type { Manifold } from 'manifold-3d';
import type { SolidPart, Vec3 } from '../types.ts';
import { plateStackLength, type PlateId } from '../plates.ts';
import type { Pendulum } from '../floor-parts/hypers.ts';
import type { HyperKit, Material, Pt } from './hypers-kit.ts';
import { HM } from './hypers-materials.ts';
type Role = SolidPart['role'];
const mat = (name: string, role: Role, color: string, metalness: number, roughness: number): Material => [name, role, color, metalness, roughness];
export const RED_COLLAR = mat('Red aluminium axle collars', 'source', '#c7262e', .5, .35);
export const DIAMOND = mat('Diamond-tread steel footplate', 'source', '#232427', .45, .45);
export const ZINC_CAPS = mat('Zinc roller end caps', 'fastener', '#c4c8cc', .9, .3);
/** Pendulum swing arm about an X-axis pivot: clevis, arm tube (optional adjustment holes), full-width plate horn with
 * collars, strap loop (or chain + belt), loaded plates with spring or axle collars. `swing` > 0 tips the arm back (−Y). */
export function pendulum(kit: HyperKit, P: Pendulum, swing: number, load: readonly PlateId[], frame: Material, opts: { collars?: 'spring' | 'axle'; holes?: boolean; chain?: boolean; name?: string } = {}) {
  const { add, box, rod, hinge, band, place, revolve } = kit, pv: Vec3 = [0, P.pivot[0], P.pivot[1]], sw = (m: Manifold) => hinge(m, pv, -swing);
  const [aw, ad] = P.arm, y = P.pivot[0];
  // Pivot hub and axle (fixed), arm, horn sleeve and collars (swinging).
  add(HM.bolts, rod([-aw / 2 - 14, y, pv[2]], [aw / 2 + 14, y, pv[2]], 20, 16));
  add(frame, sw(box([-aw / 2, y - ad / 2, P.bottom], [aw / 2, y + ad / 2, pv[2] + 22])));
  add(frame, sw(rod([-aw / 2 - 4, y, pv[2]], [aw / 2 + 4, y, pv[2]], 46, 24)));
  if (opts.holes) for (let z = P.post + 70; z < pv[2] - 50; z += 45) for (const sx of [-1, 1]) add(HM.bolts, sw(box([sx > 0 ? aw / 2 - .5 : -aw / 2 - .5, y - 8, z - 8], [sx > 0 ? aw / 2 + .5 : -aw / 2 + .5, y + 8, z + 8])));
  const end = aw / 2 + P.collar + P.horn;
  add(HM.zinc, sw(rod([-end, y, P.post], [end, y, P.post], P.sleeve, 40)));
  for (const sx of [-1, 1]) {
    add(frame, sw(rod([sx * aw / 2, y, P.post], [sx * (aw / 2 + P.collar), y, P.post], P.sleeve + 26, 40)));
    add(HM.caps, sw(rod([sx * (end - 3), y, P.post], [sx * end, y, P.post], P.sleeve + 2, 40)));
  }
  // Strap: steel ring under the arm and a webbing loop (or a chain down to a belt).
  add(HM.zinc, sw(revolve([[19, -4], [27, -4], [27, 4], [19, 4]], [0, y, P.bottom - 20], [1, 0, 0], 32)));
  add(frame, sw(box([-3, y - 14, P.bottom - 12], [3, y + 14, P.bottom + 6])));
  const s = P.strap, loop = place(band(2 * s.r, s.top - s.bottom + 2 * s.r, 3, s.w), [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, -s.w / 2, y, (s.top + s.bottom) / 2, 1]);
  if (opts.chain) {
    const a = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0] as const, b = [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0] as const;
    for (let z = P.bottom - 40, i = 0; z > s.top + s.r; z -= 22, i++) { const m = i % 2 ? b : a, off: Vec3 = i % 2 ? [-1.75, y, z] : [0, y + 1.75, z]; add(HM.chrome, sw(place(band(12, 26, 3.5, 3.5), [...m, ...off, 1] as unknown as import('manifold-3d').Mat4))); }
  }
  add(HM.webbing, sw(loop));
  if (load.length) {
    const c = kit.plateCentre(pv, [0, y, P.post], swing);
    for (const sx of [-1, 1]) kit.plates(load, [sx * (aw / 2 + P.collar), c[1], c[2]], [sx, 0, 0], `${opts.name ?? 'Horn'} ${sx > 0 ? 'right' : 'left'} plate`);
    const stack = plateStackLength(load);
    for (const sx of [-1, 1]) {
      const x0 = sx * (aw / 2 + P.collar + stack + 1);
      if (opts.collars === 'axle') add(RED_COLLAR, sw(rod([x0, y, P.post], [x0 + sx * 12, y, P.post], P.sleeve + 22, 32)));
      else add(HM.chrome, sw(rod([x0, y, P.post], [x0 + sx * 10, y, P.post], P.sleeve + 14, 32)));
    }
  }
}
/** Foam ankle roller pair on a through-axle along X at (y, z): rollers from |x| = x0 to x0 + len. */
export function rollerPair(kit: HyperKit, y: number, z: number, d: number, len: number, x0: number, foam: Material, caps: Material = ZINC_CAPS) {
  const { add, rod } = kit;
  add(HM.zinc, rod([-x0 - len - 6, y, z], [x0 + len + 6, y, z], 25, 16));
  for (const sx of [-1, 1]) {
    const a: Vec3 = [sx * x0, y, z], b: Vec3 = [sx * (x0 + len), y, z], r = kit.roller(sx > 0 ? a : b, sx > 0 ? b : a, d, 7);
    add(foam, r.foam); add(caps, ...r.caps);
    add(HM.bolts, rod([sx * (x0 + len), y, z], [sx * (x0 + len + 8), y, z], 18, 6));
  }
}
/** Half-round GHD hip pad: D-profile in YZ (length l along Y, apex h above z0 including a base board), width w along X
 * from x0; centred on y. The front/back faces are the rounded ends a GHD user drapes over. */
export function humpPad(kit: HyperKit, x0: number, w: number, y: number, z0: number, l: number, h: number, board = 18) {
  const n = 28, pts: Pt[] = [[y + l / 2, z0], [y + l / 2, z0 + board]];
  for (let i = 1; i < n; i++) { const t = (i / n) * Math.PI; pts.push([y + (l / 2) * Math.cos(t), z0 + board + (h - board) * Math.sin(t)]); }
  pts.push([y - l / 2, z0 + board], [y - l / 2, z0]);
  return kit.prismX(pts, w, x0);
}
/** Raised "letters" on a plate face (no copied artwork): n blocks with gaps across [y0, y1] at height [z0, z1], on the face at x (outward sign sx). */
export function letterBlocks(kit: HyperKit, n: number, x: number, sx: number, y0: number, y1: number, z0: number, z1: number, depth = .8) {
  const out: Manifold[] = [], pitch = (y1 - y0) / n;
  for (let i = 0; i < n; i++) out.push(kit.box([sx > 0 ? x : x - depth, y0 + i * pitch + pitch * .12, z0], [sx > 0 ? x + depth : x, y0 + (i + 1) * pitch - pitch * .12, z1]));
  return out;
}
/** Round handle bar with a rubber grip over its last `grip` mm. */
export function gripBar(kit: HyperKit, a: Vec3, b: Vec3, d: number, grip: number, steel: Material, rubber: Material = HM.foam) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), t = Math.max(0, 1 - grip / len), m: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  kit.add(steel, kit.rod(a, m, d, 24));
  kit.add(rubber, kit.rod(m, b, d + 6, 24));
}
