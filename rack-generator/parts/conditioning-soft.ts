/** Battle rope, plyo box and jump rope builders for the conditioning family.
 * Ropes and the jump rope are swept meshes from ../floor-parts/conditioning-layouts.ts (already centred on the footprint);
 * plyo boxes are built in their own frame (dims ascending along X, Y, Z) and turned onto the chosen standing height. */
import type { Mat4 } from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
import { conditioningKit, type Mat } from './conditioning-kit.ts';
import { jumpRopeLayout, ropeLayout, type RopeSpec } from '../floor-parts/conditioning-layouts.ts';
import { cross } from '../floor-parts/conditioning-geometry.ts';
import { inch } from '../floor-parts/conditioning.ts';
// ------------------------------------------------------------------------------------------------ battle ropes
export interface RopeLook { body: Mat; grip: Mat; tracer?: Mat; label?: { text: string; mat: Mat; width: number } }
export function buildBattleRope(api: ManifoldAPI, spec: RopeSpec, pose: number, look: RopeLook): SolidPart[] {
  const t = conditioningKit(api), lay = ropeLayout(spec, pose);
  return t.finish('battle rope', [0, 0, 0], () => {
    t.add(look.body, t.mesh(lay.body));
    t.add(look.grip, ...lay.ends.map(e => t.mesh(e)));
    if (look.tracer && lay.tracer) t.add(look.tracer, t.mesh(lay.tracer));
    if (look.label) {
      // Printed on the top of each grip, reading toward the tip; flat letters sunk to the grip's chord.
      const R = spec.handleD / 2 * (spec.kind === 'twisted' ? .9 : 1), h = spec.handleD * .5, sag = R - Math.sqrt(R * R - (h / 2) ** 2);
      for (const f of lay.labels) {
        const cs = t.fitText(look.label.text, look.label.width, h), up = cross(f.u, f.t) as Vec3;
        const at: Vec3 = [f.p[0] + f.u[0] * R, f.p[1] + f.u[1] * R, f.p[2] + f.u[2] * R];
        t.add(look.label.mat, t.decal(cs, at, f.t as Vec3, up, sag + .5, sag + .1));
      }
    }
  });
}
// ------------------------------------------------------------------------------------------------ plyo boxes
type Axis = 0 | 1 | 2;
/** In-plane "up" axis for a face normal to `a`: the number on each face gives the height when that up axis stands vertical. */
const labelUp = (a: Axis): Axis => (a === 1 ? 2 : a === 0 ? 1 : 0);
const unitAxis = (a: Axis, s = 1): Vec3 => [a === 0 ? s : 0, a === 1 ? s : 0, a === 2 ? s : 0];
/** Rotation taking the box frame (dims along X, Y, Z) onto the floor frame: `height` axis up, longer remaining axis along X. */
function standUp(dims: readonly number[], height: number): { m: Mat4; up: Axis } {
  const i = dims.indexOf(height) as Axis, rest = ([0, 1, 2] as Axis[]).filter(a => a !== i).sort((a, b) => dims[b] - dims[a]), [j, k] = rest;
  const col = (a: Axis): Vec3 => a === j ? [1, 0, 0] : a === k ? [0, 1, 0] : [0, 0, 1];
  const c0 = col(0), c1 = col(1), c2 = col(2), det = c0[0] * (c1[1] * c2[2] - c1[2] * c2[1]) - c1[0] * (c0[1] * c2[2] - c0[2] * c2[1]) + c2[0] * (c0[1] * c1[2] - c0[2] * c1[1]);
  const flip = (c: Vec3, a: Axis): Vec3 => det < 0 && a === k ? [-c[0], -c[1], -c[2]] : c;
  return { m: [...flip(c0, 0), 0, ...flip(c1, 1), 0, ...flip(c2, 2), 0, 0, 0, 0, 1] as Mat4, up: i };
}
interface FaceInfo { a: Axis; s: 1 | -1; at: Vec3; u: Vec3; v: Vec3; w: number; h: number }
/** The six faces of a box of half-sizes `half` (inset by `inset`), each with a reading frame (u right, v = label up, u × v outward). */
function faces(half: Vec3, inset: number): FaceInfo[] {
  const out: FaceInfo[] = [];
  for (const a of [0, 1, 2] as Axis[]) for (const s of [1, -1] as const) {
    const up = labelUp(a), right = (3 - a - up) as Axis, v = unitAxis(up), n = unitAxis(a, s);
    let u = unitAxis(right); const c = cross(u, v); if (c[0] * n[0] + c[1] * n[1] + c[2] * n[2] < 0) u = unitAxis(right, -1);
    const at: Vec3 = [0, 0, 0]; at[a] = s * (half[a] - inset);
    out.push({ a, s, at, u, v, w: 2 * half[right], h: 2 * half[up] });
  }
  return out;
}
const near = (f: FaceInfo, du: number, dv: number): Vec3 => [f.at[0] + f.u[0] * du + f.v[0] * dv, f.at[1] + f.u[1] * du + f.v[1] * dv, f.at[2] + f.u[2] * du + f.v[2] * dv];
export type SoftBoxStyle = 'rep' | 'titan';
/** Foam-over-wood soft plyo box: rounded vinyl body, printed border (REP), wordmark and height marks on every face. */
export function buildSoftPlyoBox(api: ManifoldAPI, dimsIn: readonly number[], heightIn: number, style: SoftBoxStyle): SolidPart[] {
  const t = conditioningKit(api), dims = dimsIn.map(inch), half = dims.map(d => d / 2) as Vec3, ink = .3, r = style === 'rep' ? 22 : 30;
  const VINYL: Mat = style === 'rep' ? ['Black vinyl cover', 'source', '#1b1c1e', 0, .62] : ['Black glossy vinyl cover', 'source', '#141517', 0, .34];
  const WHITE: Mat = ['White print', 'source', '#e8e8e4', 0, .6], RED: Mat = ['Red print', 'source', '#c9212c', 0, .55];
  const { m } = standUp(dims, inch(heightIn));
  const parts = t.finish('plyo box', [0, 0, inch(heightIn) / 2], () => {
    const b = half.map(v => v - ink - r) as Vec3, corners: Manifold[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push(t.move(t.k(t.M.sphere(r, 32)), [sx * b[0], sy * b[1], sz * b[2]]));
    const put = (mat: Mat, s: Manifold | undefined) => s && t.add(mat, t.k(s.transform(m)));
    put(VINYL, t.hull(corners));
    for (const f of faces(half, ink)) {
      const dec = (cs: CrossSection | undefined, du: number, dv: number, mat: Mat) => put(mat, t.decal(cs, near(f, du, dv), f.u, f.v, ink * 2, ink));
      const H = dims[labelUp(f.a)] / 25.4, fw = f.w, fh = f.h;
      if (style === 'rep') {
        // Inset border line, wordmark low-centre, height number + arrow + INCH top-left.
        const inset = 30, line = 4.5, outer = t.rounded(fw - 2 * inset, fh - 2 * inset, 6), inner = t.rounded(fw - 2 * inset - 2 * line, fh - 2 * inset - 2 * line, 3);
        dec(t.k(outer.subtract(inner)), 0, 0, WHITE);
        const wm = Math.min(fw * .42, 190);
        dec(t.fitText('REP', wm, wm * .3), 0, -fh / 2 + inset + 24 + wm * .2, WHITE);
        dec(t.fitText('F I T N E S S', wm * .95, wm * .07), 0, -fh / 2 + inset + 16, WHITE);
        const nh = Math.min(62, fh * .1), nx = -fw / 2 + inset + 14, ny = fh / 2 - inset - 14 - nh / 2, num = t.fitText(String(H), nh * 1.4, nh);
        const nw = num ? num.bounds().max[0] - num.bounds().min[0] : nh;
        dec(num, nx + nw / 2, ny, WHITE);
        dec(t.polygon([[0, nh * .32], [-nh * .2, -nh * .05], [nh * .2, -nh * .05]]), nx + nw + nh * .28, ny + nh * .22, WHITE);
        dec(t.fitText('INCH', nh * 1.1, nh * .28), nx + nh * .55, ny - nh * .78, WHITE);
      } else {
        // TITAN (white) over FITNESS (red), height number + outline arrow + "inch" bottom-right.
        const wm = Math.min(fw * .45, 230);
        dec(t.fitText('TITAN', wm, wm * .2), 0, fh * .06, WHITE);
        dec(t.fitText('FITNESS', wm * .42, wm * .06), wm * .26, fh * .06 - wm * .15, RED);
        const nh = Math.min(48, fh * .08), nx = fw / 2 - 40 - nh * 1.6, ny = -fh / 2 + 40 + nh / 2, num = t.fitText(String(H), nh * 1.4, nh);
        dec(num, nx, ny, WHITE);
        const ax = nx + nh * 1.25, ay = ny + nh * .15, a = nh * .32;
        dec(t.polygon([[ax, ay + a], [ax - a, ay], [ax - a * .4, ay], [ax - a * .4, ay - a * .9], [ax + a * .4, ay - a * .9], [ax + a * .4, ay], [ax + a, ay]]), 0, 0, WHITE);
        dec(t.fitText('inch', nh * .7, nh * .3), ax, ny - nh * .5, WHITE);
      }
    }
  });
  return parts;
}
/** Rogue Games Box: six 3/4" A/C plywood panels, burned ROGUE on the four long faces, hand holes in the 20 × 24" ends. */
export function buildWoodPlyoBox(api: ManifoldAPI, dimsIn: readonly number[], heightIn: number): SolidPart[] {
  const t = conditioningKit(api), dims = dimsIn.map(inch), [X, Y, Z] = dims, ply = 19, ink = .2;
  const { m } = standUp(dims, inch(heightIn));
  const FACE: Mat = ['A/C plywood (long faces)', 'source', '#dcc298', 0, .72], SIDE: Mat = ['A/C plywood (sides)', 'source', '#d6ba8d', 0, .74];
  const END: Mat = ['A/C plywood (ends)', 'source', '#d1b384', 0, .76], BURN: Mat = ['Burned ROGUE branding', 'source', '#4b2e1b', 0, .85];
  return t.finish('Rogue Games Box', [0, 0, inch(heightIn) / 2], () => {
    const put = (mat: Mat, s: Manifold | undefined) => s && t.add(mat, t.k(s.transform(m)));
    const x = X / 2 - ink, y = Y / 2 - ink, z = Z / 2;
    // Long faces (normal ±X) full height; sides (±Y) between them; ends (±Z) inset between all four, with hand holes.
    for (const s of [-1, 1]) put(FACE, t.box([s > 0 ? x - ply : -x, -y, -z], [s > 0 ? x : -x + ply, y, z]));
    for (const s of [-1, 1]) put(SIDE, t.box([-x + ply, s > 0 ? y - ply : -y, -z], [x - ply, s > 0 ? y : -y + ply, z]));
    for (const s of [-1, 1]) {
      const hole = t.move(t.k(t.rounded(115, 34, 16).extrude(ply + 2)), [0, 0, 0]);
      const hz = s > 0 ? z - ply - 1 : -z - 1, slot = t.move(hole, [0, y - 82, hz]);
      put(END, t.cut(t.box([-x + ply, -y + ply, s > 0 ? z - ply : -z], [x - ply, y - ply, s > 0 ? z : -z + ply]), [slot]));
    }
    // Internal reinforcing cleats (visible through the hand holes).
    put(END, t.box([-x + ply, -y + ply, -30], [x - ply, -y + ply + 19, 30]));
    // Burned ROGUE on the four long faces, reading along the 30" (Z) axis.
    for (const f of faces([x + ink, y + ink, z], ink).filter(f => f.a !== 2)) {
      const u: Vec3 = [0, 0, 1], n = unitAxis(f.a, f.s), v = cross(n, u) as Vec3;
      const width = Z * .62, h = width * .19, off = -(f.a === 0 ? y : x) * .42;
      const at: Vec3 = [f.at[0] + v[0] * off, f.at[1] + v[1] * off, f.at[2]];
      put(BURN, t.decal(t.fitText('ROGUE', width, h, .05), at, u, v, ink * 2, ink));
    }
  });
}
// ------------------------------------------------------------------------------------------------ jump rope
export function buildJumpRope(api: ManifoldAPI, cableIn: number, pose: number): SolidPart[] {
  const t = conditioningKit(api), lay = jumpRopeLayout(cableIn, pose), h = lay.handles;
  return t.finish('Rogue PRO jump rope', [0, 0, 0], () => {
    t.add(['Stainless steel handles', 'handle', '#cdd1d5', .95, .22], t.mesh(h.body), t.mesh(h.eye));
    t.add(['Fine knurl', 'handle', '#a5aaaf', .9, .52], t.mesh(h.knurl));
    t.add(['Etched ROGUE end band', 'handle', '#b3b7bb', .9, .38], t.mesh(h.band));
    t.add(['Black bearing swivels', 'source', '#1b1c1e', .3, .45], t.mesh(h.cap));
    t.add(['Red-coated 5.5 mm cable', 'source', '#c3161d', .1, .32], t.mesh(lay.cable));
  });
}
