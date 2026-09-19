/** Pendulum reverse hypers on leaning A-frames: Rogue RH-2 and Titan H-PND / Economy H-PND.
 * Specs and footprints: ../floor-parts/hypers.ts (RhSpec, rhLayout). */
import type { NumericParams, SolidPart, ManifoldAPI, Vec3 } from '../types.ts';
import { comboLayout, rhLayout, type ComboSpec, type RhSpec } from '../floor-parts/hypers.ts';
import { buildWith, lerp3, type HyperKit, type Material, type Pt } from './hypers-kit.ts';
import { rollerCarriage } from './hypers-ghd.ts';
import { HM } from './hypers-materials.ts';
import { gripBar, letterBlocks, pendulum } from './hypers-assemblies.ts';
export interface RhLook { frame: Material; pad: Material; letters: Material; label?: Material }
/** Frame, legs, plates, pad and steps shared by the A-frame reverse hypers. Returns leg helpers for extras. */
export function rhFrame(kit: HyperKit, S: RhSpec, look: RhLook) {
  const { add, box, bar, cushion, at } = kit, B = S.base, Lg = S.legs, [rw, rh] = B.rail, [fl, fh] = B.feet;
  for (const sx of [-1, 1]) {
    const x = sx * B.railX;
    add(look.frame, box([x - rw / 2, -B.half, fh], [x + rw / 2, B.half, fh + rh]));
    for (const e of [-1, 1]) add(HM.rubber, box([x - rw / 2, e > 0 ? B.half - fl - 20 : -B.half + 20, 0], [x + rw / 2, e > 0 ? B.half - 20 : -B.half + fl + 20, fh]));
    add(HM.caps, box([x - rw / 2, B.half - 3, fh], [x + rw / 2, B.half, fh + rh]), box([x - rw / 2, -B.half, fh], [x + rw / 2, -B.half + 3, fh + rh]));
  }
  for (const y of B.cross) add(look.frame, box([-B.railX, y - rw / 2, fh], [B.railX, y + rw / 2, fh + rh]));
  // Legs lean in from the base rails to the top plates.
  const [lx, ly] = Lg.section, baseZ = fh + rh;
  const leg = (sx: number, which: readonly [number, number]) => ({ a: [sx * B.railX, which[0], baseZ - 4] as Vec3, b: [sx * Lg.topX, which[1], Lg.topZ] as Vec3 });
  for (const sx of [-1, 1]) for (const w of [Lg.front, Lg.rear]) { const { a, b } = leg(sx, w); add(look.frame, bar(a, lerp3(a, b, 1 + 40 / Math.hypot(b[1] - a[1], b[2] - a[2])), lx, ly)); }
  // Lettered top plates on the outside of each frame, with cut or raised letters and four bolts.
  const P = S.plate, px = Lg.topX + lx / 2;
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? px : -px - 6;
    add(look.frame, box([x0, P.y[0], P.z[0]], [x0 + 6, P.y[1], P.z[1]]));
    const face = sx > 0 ? px + 6 : -px - 6, span = (P.y[1] - P.y[0]) * .62, mid = (P.y[0] + P.y[1]) / 2, zc = (P.z[0] + P.z[1]) / 2;
    if (P.letters) { const w = P.letters * 34; add(look.letters, ...letterBlocks(kit, P.letters, P.cut ? face - sx * .6 : face, sx, mid - w / 2, mid + w / 2, zc - 18, zc + 18, P.cut ? .8 : .6)); }
    if (P.badge) add(HM.label, box([sx > 0 ? face : face - 1, mid - 70, zc - 16], [sx > 0 ? face + 1 : face, mid + 70, zc + 16]));
    void span;
    for (const y of [P.y[0] + 26, P.y[1] - 26]) for (const z of [zc - 24, zc + 24]) add(HM.hardware, kit.rod([face, y, z], [face + sx * 5, y, z], 22, 6));
  }
  // Cross tubes and pad board under the pad, then the cornered pad.
  const pd = S.pad, padZ = pd.top - pd.t;
  for (const y of [pd.y - pd.l / 2 + 70, pd.y + pd.l / 2 - 70]) add(look.frame, bar([-px, y, padZ - 38], [px, y, padZ - 38], inch2(), 76, [0, 1, 0]));
  add(look.frame, bar([-px, S.pend.pivot[0], padZ - 38], [px, S.pend.pivot[0], padZ - 38], 51, 76, [0, 1, 0]));
  if (pd.insert) {
    // Split pad: two outer sections and a removable middle insert.
    const gap = 8, side = (pd.w - pd.insert - 2 * gap) / 2;
    for (const sx of [-1, 1]) add(look.pad, at(cushion(side, pd.l, pd.t, pd.r, pd.e), [sx * (pd.insert / 2 + gap + side / 2), pd.y, padZ]));
    add(look.pad, at(cushion(pd.insert, pd.l - 20, pd.t - 6, 12, 10), [0, pd.y, padZ]));
    add(look.frame, box([-pd.w / 2 + 10, pd.y - pd.l / 2 + 10, padZ - 8], [pd.w / 2 - 10, pd.y + pd.l / 2 - 10, padZ]));
  } else add(look.pad, at(cushion(pd.w, pd.l, pd.t, pd.r, pd.e), [0, pd.y, padZ]));
  // Pendulum clevis hanging from the pivot cross tube.
  const pv = S.pend.pivot, aw = S.pend.arm[0];
  for (const sx of [-1, 1]) add(look.frame, box([sx > 0 ? aw / 2 + 5 : -aw / 2 - 11, pv[0] - 30, pv[1] - 30], [sx > 0 ? aw / 2 + 11 : -aw / 2 - 5, pv[0] + 30, padZ - 76]));
  // Steps welded to the rear legs, pointing back.
  const st = S.steps;
  for (const sx of [-1, 1]) {
    const { a, b } = leg(sx, Lg.rear), t = (st.z - a[2]) / (b[2] - a[2]), at0 = lerp3(a, b, t);
    add(look.frame, box([at0[0] - st.section[0] / 2, st.y - st.len, st.z - st.section[1] / 2], [at0[0] + st.section[0] / 2, at0[1], st.z + st.section[1] / 2]));
    add(HM.rubber, box([at0[0] - st.section[0] / 2 + 6, st.y - st.len + 6, st.z + st.section[1] / 2], [at0[0] + st.section[0] / 2 - 6, at0[1] - 10, st.z + st.section[1] / 2 + 3]));
  }
  return { px, padZ };
}
const inch2 = () => 50.8;
export function buildRh(spec: RhSpec, look: RhLook, label: string) {
  return (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
    const L = rhLayout(spec, p);
    return buildWith(api, label, kit => {
      const S = spec, { px, padZ } = rhFrame(kit, S, look), h = S.handles;
      if (h.kind === 'rogue') for (const sx of [-1, 1]) {
        const x = sx * h.x, far = Math.max(...h.uprights.map(u => u[0]));
        kit.add(look.frame, kit.rod([x, h.y0, h.z], [x, far, h.z], h.d, 24));
        kit.add(look.frame, kit.box([x - 12, h.y0 - 10, h.z - 12], [x + 12, h.y0 + 30, padZ]));
        for (const [y0, z0, y1, z1] of h.uprights) gripBar(kit, [x, y0, z0], [x, y1, z1], h.d, h.grip, look.frame);
      } else for (const sx of [-1, 1]) {
        // Twin telescoping handle beams: fixed sleeve under the pad, holed inner tube, red pull pin, upright knurled grip.
        const x = sx * h.x, b = h.beam;
        kit.add(look.frame, kit.box([x - b / 2 - 5, h.y0, h.z - b / 2 - 5], [x + b / 2 + 5, h.y0 + 380, h.z + b / 2 + 5]));
        kit.add(look.frame, kit.box([x - b / 2, h.y0 + 380, h.z - b / 2], [x + b / 2, h.y1, h.z + b / 2]));
        for (let y = h.y0 + 420; y < h.y1 - 50; y += 50) kit.add(HM.bolts, kit.rod([x - sx * .5 + sx * b / 2, y, h.z], [x + sx * (b / 2 + .6), y, h.z], 16, 12));
        kit.add(HM.red, kit.rod([x + sx * (b / 2 + 5), h.y0 + 350, h.z], [x + sx * (b / 2 + 30), h.y0 + 350, h.z], 20, 16));
        const gy = h.y1 - b / 2;
        gripBar(kit, [x, gy, h.z + b / 2], [x, gy, h.z + b / 2 + h.gripLen], h.d, h.gripLen * .8, look.frame);
        kit.add(look.frame, kit.box([x - b / 2, h.y0, h.z - b / 2], [x + b / 2, h.y0 + 20, padZ]));
      }
      if (S.crossBrace) kit.add(HM.brace, kit.rod([-px, S.crossBrace, padZ - 120], [px, S.crossBrace, padZ - 120], 25, 24));
      pendulum(kit, S.pend, L.swing, L.load, look.frame, { collars: S.collars, holes: S.holes });
      return L.shift;
    });
  };
}

/** Reverse hyper + GHD combos: the A-frame hyper with a GHD roller carriage on a base extension (Donkey, Reverse Hammer). */
export function buildCombo(spec: ComboSpec, look: RhLook & { roller: Material }, label: string) {
  return (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
    const L = comboLayout(spec, p), S = spec.rh, g = spec.ghd;
    return buildWith(api, label, kit => {
      const { add, box, rod } = kit, { padZ } = rhFrame(kit, S, look), F = look.frame, B = S.base, baseTop = B.feet[1] + B.rail[1];
      pendulum(kit, S.pend, L.swing, L.load, F, { collars: S.collars, holes: S.holes, chain: spec.chain });
      // GHD extension: posts at both ends of the chassis, chassis beam, optional chrome carriage rails and swing-arm quadrant.
      const T = [50.8, 76.2] as const;
      for (const y of [g.from, g.front.y]) add(F, box([-T[0] / 2, y - T[1] / 2, baseTop - 2], [T[0] / 2, y + T[1] / 2, y === g.front.y ? g.front.z + T[1] / 2 : g.chassis + T[1] / 2]));
      for (const y of [g.from, g.front.y]) for (const sx of [-1, 1]) add(F, box([-B.railX, y - T[1] / 2, baseTop - 2], [B.railX, y + T[1] / 2, baseTop + 40].map((v, i) => i === 0 ? sx * 0 + v : v) as Vec3));
      add(F, box([-T[0] / 2, g.from, g.chassis - T[1] / 2], [T[0] / 2, g.front.y, g.chassis + T[1] / 2]));
      if (g.rails) for (const sx of [-1, 1]) add(HM.chrome, rod([sx * 45, g.from + 40, g.chassis + 10], [sx * 45, g.front.y - 40, g.chassis + 10], 25, 20));
      if (g.quadrant) {
        const cy = g.front.y, cz = g.front.z - 40, pts: Pt[] = [[cy, cz - 60]];
        for (let i = 0; i <= 12; i++) { const a = Math.PI * (.5 + i / 12 * .5); pts.push([cy + 190 * Math.cos(a), cz + 190 * Math.sin(a)]); }
        for (const sx of [-1, 1]) {
          const x0 = sx > 0 ? T[0] / 2 : -T[0] / 2 - 6, slots = Array.from({ length: g.stations.n }, (_, i) => { const a = Math.PI * (.55 + i / (g.stations.n - 1) * .4), y = cy + 150 * Math.cos(a), z = cz + 150 * Math.sin(a); return box([x0 - 1, y - 7, z - 14], [x0 + 7, y + 7, z + 14]); });
          add(F, kit.cut(kit.prismX(pts, 6, x0), slots));
        }
      }
      rollerCarriage(kit, { ry: L.rollerY, chassis: g.chassis, rollers: g.rollers, footplate: g.footplate, frame: F, roller: look.roller, sideHandles: g.sideHandles });
      if (L.wheel) for (const sx of [-1, 1]) {
        const x = sx * B.railX, w = L.wheel;
        add(F, box([x - B.rail[0] / 2, B.half - 50, B.feet[1]], [x - B.rail[0] / 2 + 5, w.y + 8, baseTop]), box([x + B.rail[0] / 2 - 5, B.half - 50, B.feet[1]], [x + B.rail[0] / 2, w.y + 8, baseTop]));
        add(HM.rubber, rod([x - B.rail[0] / 2 + 7, w.y, w.d / 2], [x + B.rail[0] / 2 - 7, w.y, w.d / 2], w.d, 28));
      }
      const h = spec.rearHandles;
      if (h) for (const sx of [-1, 1]) {
        add(F, rod([sx * h.x, h.y[0] + 150, h.z], [sx * h.x, h.y[1], h.z], h.d, 24), box([sx * h.x - 12, h.y[1] - 20, h.z - 12], [sx * h.x + 12, h.y[1] + 10, padZ]));
        add(HM.foam, rod([sx * h.x, h.y[0], h.z], [sx * h.x, h.y[0] + 150, h.z], h.d + 6, 24));
      }
      return L.shift;
    });
  };
}
