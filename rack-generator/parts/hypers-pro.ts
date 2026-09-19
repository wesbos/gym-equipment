/** Freak Athlete Hyper Pro: wheeled arc-and-U base, tilting carriage with footplate, XL rollers and pads.
 * Metadata and pose maths: ../floor-parts/hypers.ts (hyperProLayout). */
import type { Manifold, Mat4 } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { hyperProLayout } from '../floor-parts/hypers.ts';
import { buildWith, type HyperKit, type Material, type Pt } from './hypers-kit.ts';
import { HM } from './hypers-materials.ts';
const FA = {
  frame: ['Matte black powder-coated 14-gauge steel', 'source', '#1c1d1f', .3, .58],
  pad: ['Charcoal textured vinyl pads', 'liner', '#2a2c2f', 0, .82],
  orange: ['Freak Athlete orange branding', 'source', '#ee7426', 0, .55],
  hub: ['Roller hub caps', 'source', '#1a1b1c', .15, .5],
  blue: ['Blue pop-pin knob', 'source', '#2f7fd4', .05, .45],
  yellow: ['Yellow pop-pin knob', 'source', '#f0bf2a', .05, .45],
  red: ['Red pop-pin knobs', 'source', '#d4372a', .05, .45],
  green: ['Green pop-pin knob', 'source', '#3aa845', .05, .45],
  white: ['White knob and cam lever', 'source', '#e6e6e1', .05, .5],
  purple: ['Purple pivot knob', 'source', '#5b49c9', .05, .45],
  etch: ['Laser-etched footplate markings', 'source', '#3a3c3f', .4, .5],
} as const satisfies Record<string, Material>;
/** Half-ellipse ring in plan (XY): centre (0, cy), outer semi-axes (ax, by), ring width w; `side` +1 keeps y ≥ cy, −1 keeps y ≤ cy. */
function arcRing(kit: HyperKit, cy: number, ax: number, by: number, w: number, h: number, side: 1 | -1, n = 40) {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI; pts.push([ax * Math.cos(t), cy + side * by * Math.sin(t)]); }
  for (let i = n; i >= 0; i--) { const t = (i / n) * Math.PI; pts.push([(ax - w) * Math.cos(t), cy + side * (by - w) * Math.sin(t)]); }
  return kit.k(kit.k(new kit.C([side < 0 ? pts.reverse() : pts])).extrude(h));
}
/** Plate in the XZ plane, `t` thick toward −Y from y, rounded corners. */
function xzPlate(kit: HyperKit, w: number, z0: number, z1: number, r: number, t: number, y: number, x = 0) {
  const m: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, x, y, (z0 + z1) / 2, 1];
  return kit.place(kit.k(kit.rrect(w, z1 - z0, r).extrude(t)), m);
}
export function buildHyperPro(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = hyperProLayout(p), H = L.H, B = H.base, ghd = p.setup === 1;
  return buildWith(api, 'Hyper Pro', kit => {
    const { add, box, rod, ball, hull, cushion, at, cut, bar, hinge } = kit;
    const half = H.width / 2, w = B.w;
    // ── Base: 2×3 in spine, bent front arc on wheels, rear U with rubber feet.
    add(FA.frame, box([-w / 2, B.apexY - 20, 0], [w / 2, B.spineEnd + 20, B.h]));
    add(FA.frame, arcRing(kit, B.tipY, half, B.apexY - B.tipY + w / 2, w, B.h, 1));
    add(FA.frame, arcRing(kit, B.rearTipY, half, B.rearTipY - B.spineEnd + w / 2, w, B.h, -1));
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? half - w : -half, x1 = x0 + w;
      add(FA.frame, box([x0, B.rearTipY - 1, 0], [x1, B.rearEnd, B.h]));
      add(HM.rubber, box([x0 - .01 * sx, B.rearEnd, 0], [x1, B.rearEnd + B.capL, B.h + 4]));
      add(HM.caps, box([x0, B.tipY - 16, 0], [x1, B.tipY + 1, B.h]));
      // Transport wheels on tabs ahead of the arc tips.
      const wx = sx * (half - w - 14);
      add(FA.frame, box([wx - sx * 14 - 3, B.wheelY - 6, 20], [wx - sx * 14 + 3, B.tipY - 10, 60].map((v, i) => i === 0 ? v : v) as Vec3));
      add(HM.rubber, rod([wx - 11, B.wheelY, B.wheel / 2], [wx + 11, B.wheelY, B.wheel / 2], B.wheel, 32));
      add(HM.zinc, rod([wx - 13, B.wheelY, B.wheel / 2], [wx + 13, B.wheelY, B.wheel / 2], 22, 16));
    }
    // Storage lock pop pin on the rear U (red) and the front pivot yoke with its purple pop pin.
    add(FA.red, ball([half - w / 2, B.rearEnd - 60, B.h + 22], 34), rod([half - w / 2, B.rearEnd - 60, B.h], [half - w / 2, B.rearEnd - 60, B.h + 12], 18, 16));
    const F = H.pivot;
    for (const sx of [-1, 1]) add(FA.frame, box([sx > 0 ? w / 2 : -w / 2 - 6, F[1] - 40, B.h - 2], [sx > 0 ? w / 2 + 6 : -w / 2, F[1] + 40, F[2] + 30]));
    add(HM.bolts, rod([-w / 2 - 10, F[1], F[2]], [w / 2 + 10, F[1], F[2]], 18, 16));
    add(FA.purple, rod([-w / 2 - 10, F[1] + 20, B.h + 40], [-w / 2 - 26, F[1] + 20, B.h + 40], 16, 16), at(kit.k(kit.M.cylinder(24, 17, 15, 24)).rotate([0, -90, 0]), [-w / 2 - 26, F[1] + 20, B.h + 40]));
    // Strut anchor on the rear U apex.
    const A = H.strut.a;
    for (const sx of [-1, 1]) add(FA.frame, box([sx > 0 ? w / 2 : -w / 2 - 6, A[1] - 45, B.h - 2], [sx > 0 ? w / 2 + 6 : -w / 2, A[1] + 30, A[2] + 28]));
    add(HM.bolts, rod([-w / 2 - 10, A[1], A[2]], [w / 2 + 10, A[1], A[2]], 18, 16));
    // ── Carriage, built at the pose pivot then tipped by the incline.
    const P = L.pose.pivot, loc = (x: number, y: number, z: number): Vec3 => [x, P[1] + y, P[2] + z], tip = (m: Manifold) => hinge(m, P, L.pose.angle);
    const s = L.s, bm = H.beam, sl = H.slide, post = H.rollers.y - s, y1 = ghd ? H.ghd.beamEnd : bm.y1;
    const car: Manifold[] = [];
    car.push(box(loc(-bm.w / 2, bm.y0, bm.z - bm.h / 2), loc(bm.w / 2, y1, bm.z + bm.h / 2)));
    car.push(box(loc(-sl.w / 2, sl.y0, sl.z - sl.w / 2), loc(sl.w / 2, sl.y1, sl.z + sl.w / 2)));
    car.push(box(loc(-bm.w / 2, bm.y0, sl.z), loc(bm.w / 2, bm.y0 + 60, bm.z)), box(loc(-bm.w / 2, sl.y1 - 60, sl.z), loc(bm.w / 2, sl.y1, bm.z)));
    for (const sx of [-1, 1]) car.push(box(loc(sx > 0 ? w / 2 + 6 : -w / 2 - 12, -40, -30), loc(sx > 0 ? w / 2 + 12 : -w / 2 - 6, 45, sl.z + 20)));
    // Roller post on its slide sleeve, footplate brackets, and the 8-gauge footplate.
    car.push(box(loc(-26, post - 26, -20), loc(26, post + 26, 395)), box(loc(-33, post - 42, sl.z - 33), loc(33, post + 42, sl.z + 33)));
    const fy = H.footplate.y - s, top = H.footplateTop - H.pivot[2], fp = H.footplate;
    for (const z of [30, 390]) car.push(box(loc(-60, fy, z - 15), loc(60, post - 20, z + 15)));
    add(FA.frame, tip(union(car)));
    const plate = cut(xzPlate(kit, fp.w, P[2] + fp.z0, P[2] + top, 24, fp.t, P[1] + fy + fp.t), [-1, 1].map(sx => box(loc(sx * 110 - 18, fy - 1, 150), loc(sx * 110 + 18, fy + fp.t + 1, 320))));
    add(FA.frame, tip(plate));
    add(FA.etch, tip(box(loc(-120, fy - .8, top - 70), loc(120, fy, top - 40))));
    // Slide-tube station holes, cam lever and colour-coded pop pins.
    for (let i = 0; i < H.positions; i++) add(HM.bolts, tip(box(loc(-sl.w / 2 - .8, -100 + i * H.pitch + 170, sl.z - 5), loc(-sl.w / 2, -100 + i * H.pitch + 180, sl.z + 5))));
    add(FA.white, tip(bar(loc(-40, post, sl.z), loc(-40, post - 95, sl.z - 45), 10, 24, [0, 0, 1])));
    add(FA.blue, tip(ball(loc(-52, post + 10, sl.z + 5), 34)));
    add(FA.yellow, tip(ball(loc(-45, 470, bm.z - 5), 32)));
    add(FA.red, tip(ball(loc(45, 700, bm.z - 10), 32)));
    // XL rollers: vinyl foam on a through-axle with flat hub caps and bolts.
    const R = H.rollers;
    for (const z of R.z) {
      add(HM.zinc, tip(rod(loc(-R.x0 - R.len - 6, post, z), loc(R.x0 + R.len + 6, post, z), 22, 16)));
      for (const sx of [-1, 1]) {
        const a = loc(sx * R.x0, post, z), b = loc(sx * (R.x0 + R.len), post, z), r = kit.roller(sx > 0 ? a : b, sx > 0 ? b : a, R.d, 6);
        add(FA.pad, tip(r.foam)); add(FA.hub, ...r.caps.map(tip));
        add(FA.hub, tip(rod(loc(sx * (R.x0 + R.len), post, z), loc(sx * (R.x0 + R.len + 3), post, z), R.d * .55, 32)));
        add(HM.bolts, tip(rod(loc(sx * (R.x0 + R.len + 3), post, z), loc(sx * (R.x0 + R.len + 9), post, z), 16, 6)));
      }
    }
    // Pads: long main pad and the split end pad (bench), or the domed split GHD pad (GHD setup).
    const pd = H.pad, pz = bm.z + bm.h / 2;
    if (!ghd) {
      add(FA.pad, tip(at(cushion(pd.w, pd.main[1] - pd.main[0], pd.t, 22, 20), loc(0, (pd.main[0] + pd.main[1]) / 2, pz))));
      const hw = (pd.w - pd.split) / 2;
      for (const sx of [-1, 1]) add(FA.pad, tip(at(cushion(hw, pd.end[1] - pd.end[0], pd.t, 20, 18), loc(sx * (pd.split / 2 + hw / 2), (pd.end[0] + pd.end[1]) / 2, pz))));
      // Orange "FREAK ATHLETE" wordmark on both pad sides, as letter blocks (5 + 7 letters).
      for (const sx of [-1, 1]) {
        const x = sx > 0 ? pd.w / 2 - .4 : -pd.w / 2 + .4, y0 = pd.main[0] + 60, pitch = 32;
        for (let i = 0; i < 13; i++) if (i !== 5) { const ya = y0 + i * pitch; add(FA.orange, tip(box(loc(sx > 0 ? x : x - .8, ya + 3, pz + 22), loc(sx > 0 ? x + .8 : x, ya + pitch - 5, pz + 50)))); }
      }
    } else {
      const g = H.ghd, len = g.pad[1] - g.pad[0], n = 24, prof: Pt[] = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI; prof.push([(g.pad[0] + g.pad[1]) / 2 - (len / 2) * Math.cos(t), g.h * Math.sin(t)]); }
      for (const sx of [-1, 1]) {
        const x0 = sx > 0 ? g.gap / 2 : -g.gap / 2 - g.halfW, dome = kit.prismX([...prof].reverse().map(([y, z]) => [P[1] + y, P[2] + pz + 12 + z] as Pt), g.halfW, x0);
        add(FA.pad, dome, box(loc(x0 + 8, g.pad[0] + 10, pz), loc(x0 + g.halfW - 8, g.pad[1] - 10, pz + 12)));
        const fx = sx > 0 ? g.gap / 2 + g.halfW : -g.gap / 2 - g.halfW - .6;
        add(FA.orange, box(loc(fx, (g.pad[0] + g.pad[1]) / 2 - 40, pz + 40), loc(fx + .6, (g.pad[0] + g.pad[1]) / 2 + 40, pz + 110)));
      }
    }
    // Rear handles off the beam end.
    for (const sx of [-1, 1]) {
      add(FA.frame, tip(rod(loc(sx * 20, y1 - 30, bm.z - 5), loc(sx * 150, y1 + 10, bm.z - 25), 32)));
      add(HM.foam, tip(rod(loc(sx * 150, y1 + 10, bm.z - 25), loc(sx * 255, y1 + 34, bm.z - 41), 32)));
    }
    add(HM.caps, tip(box(loc(-bm.w / 2, y1, bm.z - bm.h / 2), loc(bm.w / 2, y1 + 6, bm.z + bm.h / 2))));
    // Telescoping incline strut (black outer sleeve on the base, zinc inner tube on the carriage) with green/white knobs.
    const Bp = L.strutB, dir = Bp.map((v, i) => v - A[i]) as Vec3, len = Math.hypot(...dir), u = dir.map(v => v / len) as Vec3, ptA = (d: number): Vec3 => A.map((v, i) => v + u[i] * d) as Vec3;
    add(FA.frame, bar(A, ptA(Math.min(H.strut.outer, len - 30)), 51, 51));
    add(HM.zinc, bar(ptA(Math.min(H.strut.outer, len - 30) - 60), Bp, 40, 40));
    add(FA.green, ball(ptA(Math.min(H.strut.outer, len - 30) - 20).map((v, i) => i === 0 ? -42 : v) as Vec3, 32));
    add(FA.white, ball(ptA(70).map((v, i) => i === 0 ? 40 : v) as Vec3, 30));
    for (const sx of [-1, 1]) add(FA.frame, tip(box(loc(sx > 0 ? sl.w / 2 : -sl.w / 2 - 6, H.strut.b[1] - 35, H.strut.b[2] - 30), loc(sx > 0 ? sl.w / 2 + 6 : -sl.w / 2, H.strut.b[1] + 35, sl.z + 20))));
    add(HM.bolts, rod(Bp.map((v, i) => i === 0 ? -40 : v) as Vec3, Bp.map((v, i) => i === 0 ? 40 : v) as Vec3, 16, 16));
    // GHD setup: telescoping front post lifting the carriage pivot.
    if (ghd) {
      add(FA.frame, bar([0, F[1], F[2]], [0, F[1] + (P[1] - F[1]) * .5, F[2] + (P[2] - F[2]) * .5], 51, 51, [1, 0, 0]));
      add(HM.zinc, bar([0, F[1] + (P[1] - F[1]) * .4, F[2] + (P[2] - F[2]) * .4], [0, P[1], P[2]], 40, 40, [1, 0, 0]));
      add(FA.blue, ball([-40, F[1] + (P[1] - F[1]) * .45, F[2] + (P[2] - F[2]) * .45], 32));
    }
    function union(s: Manifold[]) { return kit.union(s); }
    return L.shift;
  });
}
