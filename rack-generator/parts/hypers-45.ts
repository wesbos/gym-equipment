/** 45° back hyperextensions: Titan Roman Chair and Body-Solid GHYP345B. Specs and poses: ../floor-parts/hypers.ts (Hyper45Spec). */
import type { Manifold } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { hyper45Layout, type Hyper45Spec } from '../floor-parts/hypers.ts';
import { buildWith, lerp3, type HyperKit, type Material, type Pt } from './hypers-kit.ts';
import { HM } from './hypers-materials.ts';
import { DIAMOND } from './hypers-assemblies.ts';
export interface Hyper45Look { frame: Material; inner: Material; pad: Material; brand: Material }
const add3 = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** Half-ellipse ring in plan opening toward +Y (apex toward −Y) with straight arms to yEnd. */
function rearArc(kit: HyperKit, cy: number, ax: number, by: number, w: number, h: number, yEnd: number, z0: number) {
  const pts: Pt[] = [], n = 32;
  for (let i = 0; i <= n; i++) { const t = Math.PI + (i / n) * Math.PI; pts.push([ax * Math.cos(t), cy + by * Math.sin(t)]); }
  pts.push([ax, yEnd], [ax - w, yEnd]);
  for (let i = n; i >= 0; i--) { const t = Math.PI + (i / n) * Math.PI; pts.push([(ax - w) * Math.cos(t), cy + (by - w) * Math.sin(t)]); }
  pts.push([-ax + w, yEnd], [-ax, yEnd]);
  return kit.at(kit.k(kit.k(new kit.C([pts])).extrude(h)), [0, 0, z0]);
}
export function buildHyper45(spec: Hyper45Spec, look: Hyper45Look, label: string) {
  return (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
    const L = hyper45Layout(spec, p), S = spec, P = L.pose;
    return buildWith(api, label, kit => {
      const { add, box, rod, bar, cushion, at } = kit, [rw, rh] = S.rail, F = look.frame, lift = 6;
      // Base: spine, front cross foot with end caps, rear arc / fork with capped arms.
      const R = S.rear, apex = R.y - R.r;
      add(F, box([-rw / 2, S.foot.y - S.foot.rail / 2, lift], [rw / 2, apex + rw, lift + rh]));
      add(F, box([-S.foot.half + 20, S.foot.y - S.foot.rail / 2, lift], [S.foot.half - 20, S.foot.y + S.foot.rail / 2, lift + rh]));
      for (const sx of [-1, 1]) add(HM.caps, box([sx > 0 ? S.foot.half - 20 : -S.foot.half, S.foot.y - S.foot.rail / 2, 0], [sx > 0 ? S.foot.half : -S.foot.half + 20, S.foot.y + S.foot.rail / 2, lift + rh + 2]));
      add(F, rearArc(kit, R.y, R.half, R.r, rw, rh, S.half - 30, lift));
      for (const sx of [-1, 1]) add(HM.caps, box([sx > 0 ? R.half - rw : -R.half, S.half - 30, 0], [sx > 0 ? R.half : -R.half + rw, S.half, lift + rh + 2]), box([sx > 0 ? R.half - rw : -R.half, R.y - 30, 0], [sx > 0 ? R.half : -R.half + rw, R.y + 30, lift]));
      add(HM.rubber, box([-rw / 2, apex - 10, 0], [rw / 2, apex + rw, lift]), box([-rw / 2, S.foot.y + 60, 0], [rw / 2, S.foot.y + 160, lift]));
      // Footplate at 45°, rising away from the pads, on two brackets from the front foot; heel lip on the high edge.
      const fp = S.footplate, n = P.n, u = P.u, bottom: Vec3 = [0, fp.y, fp.z], topEdge = add3(bottom, n, fp.l);
      const plate = (m: Material, off: number, t: number, len: number, w: number) => kit.place(kit.k(kit.M.cube([w, len, t])).translate([-w / 2, 0, 0]), [1, 0, 0, 0, 0, n[1], n[2], 0, 0, u[1], u[2], 0, 0, bottom[1] + u[1] * off, bottom[2] + u[2] * off, 1] as unknown as import('manifold-3d').Mat4);
      add(DIAMOND, plate(DIAMOND, -5, 5, fp.l, fp.w));
      for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) { const c = add3(add3(bottom, n, (j + .5) * fp.l / 5), u, .6); add(DIAMOND, at(kit.k(kit.k(kit.k(kit.M.cube([22, 6, 1.6], true)).rotate([0, 0, (i + j) % 2 ? 35 : -35])).rotate([45, 0, 0])), [-fp.w / 2 + (i + .5) * fp.w / 6, c[1], c[2]])); }
      add(DIAMOND, kit.place(kit.k(kit.M.cube([fp.w, 5, fp.lip])).translate([-fp.w / 2, 0, 0]), [1, 0, 0, 0, 0, n[1], n[2], 0, 0, u[1], u[2], 0, 0, topEdge[1] - n[1] * 5, topEdge[2] - n[2] * 5, 1] as unknown as import('manifold-3d').Mat4));
      for (const sx of [-1, 1]) add(F, kit.hull([box([sx * 150 - 4, S.foot.y - 20, lift + rh], [sx * 150 + 4, S.foot.y + 20, lift + rh + 2]), kit.at(kit.k(kit.M.cube([8, 8, 8], true)), add3(add3(bottom, n, fp.l * .55), u, -8).map((v, i) => i === 0 ? sx * 150 : v) as Vec3), kit.at(kit.k(kit.M.cube([8, 8, 8], true)), add3(bottom, u, -8).map((v, i) => i === 0 ? sx * 150 : v) as Vec3)]));
      // Telescoping 45° post: outer sleeve on the spine with gussets and knob, inner tube with holes up to the pad carrier.
      const base = P.base, axisTop = P.axis, [ow, oh] = S.post.outer, [iw, ih] = S.post.inner, oTop = add3(base, u, S.post.outerLen);
      add(F, bar(add3(base, u, -40), oTop, ow, oh));
      for (const sx of [-1, 1]) add(F, kit.prismX([[base[1] - 150, lift + rh], [base[1] + 40, lift + rh], [base[1] + 40, lift + rh + 100]], 6, sx > 0 ? ow / 2 : -ow / 2 - 6));
      add(look.inner, bar(add3(oTop, u, -120), axisTop, iw, ih));
      for (let d = 30; d < Math.hypot(axisTop[1] - oTop[1], axisTop[2] - oTop[2]) - 20; d += 25.4) { const c = add3(oTop, u, d); add(HM.bolts, rod([ow / 2 * 0 + iw / 2 - .5, c[1], c[2]], [iw / 2 + .6, c[1], c[2]], 10, 12)); }
      const knob = add3(oTop, u, -35);
      add(HM.caps, rod([ow / 2, knob[1], knob[2]], [ow / 2 + 22, knob[1], knob[2]], 16, 16), rod([ow / 2 + 22, knob[1], knob[2]], [ow / 2 + 42, knob[1], knob[2]], 44, 28));
      add(look.brand, rod([ow / 2 + 42, knob[1], knob[2]], [ow / 2 + 42.6, knob[1], knob[2]], 30, 28));
      // Pad carrier plate and the two pads (rotated to the 45° line), brand strip on the carrier.
      const pd = S.pads, top = P.top, carrier = add3(top, n, -pd.t);
      const tilt = (m: Manifold, at0: Vec3) => kit.at(kit.k(m.rotate([45, 0, 0])), at0);
      add(F, tilt(kit.k(kit.M.cube([2 * pd.w + pd.gap, pd.l * .8, 8], true)), add3(carrier, n, -4)));
      for (const sx of [-1, 1]) add(look.pad, tilt(cushion(pd.w, pd.l, pd.t, pd.kind === 'bolster' ? 40 : 16, pd.kind === 'bolster' ? pd.t * .55 : 14), [sx * (pd.gap / 2 + pd.w / 2), carrier[1], carrier[2]]));
      add(look.brand, tilt(kit.k(kit.M.cube([180, 1, 26], true)), add3(add3(carrier, n, -18), u, -pd.l * .4 - 1)));
      // Handles: drop from the carrier, cross bar, grips pointing toward the pad end.
      const h = S.handles, c0 = add3(carrier, n, -30), c1 = add3(c0, n, -h.drop);
      add(F, bar(c0, c1, 32, 32), rod([-h.x, c1[1], c1[2]], [h.x, c1[1], c1[2]], h.d, 24));
      for (const sx of [-1, 1]) {
        const a: Vec3 = [sx * h.x, c1[1], c1[2]], b: Vec3 = [sx * h.x, c1[1] + h.reach, c1[2] + 20];
        add(F, kit.ball(a, h.d, 16));
        add(HM.foam, rod(a, b, h.d + 6, 24));
      }
      void lerp3;
      return L.shift;
    });
  };
}
