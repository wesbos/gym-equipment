/** Glute-ham developers: Rogue Abram GHD 2.0, Rogue GH-1 and REP GHD. Specs and footprints: ../floor-parts/hypers.ts (GhdSpec). */
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { ghdLayout, type GhdSpec } from '../floor-parts/hypers.ts';
import { buildWith, type HyperKit, type Material, type Pt } from './hypers-kit.ts';
import { HM } from './hypers-materials.ts';
import { DIAMOND, humpPad, rollerPair, ZINC_CAPS } from './hypers-assemblies.ts';
export interface GhdLook { frame: Material; pad: Material; roller: Material; brand: Material; postText: boolean; plateLogo: boolean }
/** Polygon in plan (XY) extruded from z0 by h. */
const plan = (kit: HyperKit, pts: Pt[], z0: number, h: number) => kit.at(kit.k(kit.k(new kit.C([[...pts].reverse()])).extrude(h)), [0, 0, z0]);
/** Triangular gusset plate in the YZ plane at x, t thick outward (sign sx), foot length a, height b, centred on y. */
const gusset = (kit: HyperKit, x: number, sx: number, y: number, z0: number, a: number, b: number) =>
  kit.prismX([[y - a, z0], [y + a, z0], [y + 28, z0 + b], [y - 28, z0 + b]], 6, sx > 0 ? x : x - 6);
/** Diamond-tread studs on a plate face lying in XZ at y (studs on the −Y face when dir < 0). */
function tread(kit: HyperKit, w: number, z0: number, z1: number, y: number, dir: number) {
  const out = [], nx = 7, nz = Math.max(3, Math.round((z1 - z0) / 55));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = -w / 2 + (i + .5) * w / nx, z = z0 + (j + .5) * (z1 - z0) / nz, rot = (i + j) % 2 ? 35 : -35;
    out.push(kit.at(kit.k(kit.k(kit.M.cube([22, 1.6, 6], true)).rotate([0, rot, 0])), [x, y + dir * .8, z]));
  }
  return out;
}
/** GHD roller carriage: sleeve on a 2×3 chassis at `chassis` Z, 2×2 post, two roller pairs, footplate (optional diamond
 * tread and side handles) toward +Y of the roller axis `ry`. */
export function rollerCarriage(kit: HyperKit, o: { ry: number; chassis: number; rollers: GhdSpec['rollers']; footplate: GhdSpec['footplate']; frame: Material; roller: Material; brand?: Material; sideHandles?: boolean }) {
  const { add, box, rod } = kit, F = o.frame, T: readonly [number, number] = [inch2, inch3], ry = o.ry, R = o.rollers, fp = o.footplate, topZ = Math.max(...R.z) + 45;
  add(F, box([-T[0] / 2 - 6, ry - 50, o.chassis - T[1] / 2 - 6], [T[0] / 2 + 6, ry + 50, o.chassis + T[1] / 2 + 6]));
  add(HM.caps, rod([T[0] / 2 + 6, ry, o.chassis], [T[0] / 2 + 40, ry, o.chassis], 14, 12), kit.ball([T[0] / 2 + 46, ry, o.chassis], 26, 16));
  add(F, box([-inch2 / 2, ry - inch2 / 2, o.chassis + T[1] / 2], [inch2 / 2, ry + inch2 / 2, topZ]));
  for (const z of R.z) rollerPair(kit, ry, z, R.d, R.len, R.x0, o.roller, ZINC_CAPS);
  const fy = ry + fp.dy;
  add(F, box([-40, ry, fp.top - fp.h + 30], [40, fy, fp.top - fp.h + 70]), box([-40, ry, fp.top - 70], [40, fy, fp.top - 30]));
  add(fp.tread ? DIAMOND : F, kit.at(kit.k(kit.rrect(fp.w, fp.h, 18).extrude(fp.t)).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]), [0, fy + fp.t, fp.top - fp.h / 2]));
  if (fp.tread) add(DIAMOND, ...tread(kit, fp.w - 40, fp.top - fp.h + 20, fp.top - 20, fy, -1));
  if (o.brand) add(o.brand, box([-60, fy - .8, fp.top - 90], [60, fy, fp.top - 50]));
  if (o.sideHandles) for (const sx of [-1, 1]) {
    // Bent side handles off the footplate edges (reverse-hyper grips).
    const x = sx * (fp.w / 2 + 30);
    add(F, box([sx > 0 ? fp.w / 2 - 20 : -fp.w / 2 - 12, fy - 10, fp.top - 150], [sx > 0 ? fp.w / 2 + 12 : -fp.w / 2 + 20, fy + fp.t, fp.top - 120]), box([sx > 0 ? fp.w / 2 - 20 : -fp.w / 2 - 12, fy - 10, fp.top - 330], [sx > 0 ? fp.w / 2 + 12 : -fp.w / 2 + 20, fy + fp.t, fp.top - 300]));
    add(F, rod([x, fy - 5, fp.top - 135], [x, fy - 5, fp.top - 315], 30, 20), rod([sx * (fp.w / 2), fy - 5, fp.top - 135], [x, fy - 5, fp.top - 135], 30, 20), rod([sx * (fp.w / 2), fy - 5, fp.top - 315], [x, fy - 5, fp.top - 315], 30, 20));
    add(HM.foam, rod([x, fy - 5, fp.top - 150], [x, fy - 5, fp.top - 300], 36, 20));
  }
}
export function buildGhd(spec: GhdSpec, look: GhdLook, label: string) {
  return (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
    const L = ghdLayout(spec, p), S = spec;
    return buildWith(api, label, kit => {
      const { add, box, rod, bar } = kit, B = S.base, [rw, rh] = B.rail, F = look.frame, lift = 8;
      // ── Base.
      let railTop = lift + rh;
      if (B.kind === 'v') {
        const run = B.y1 - B.y0, dx = B.rear - B.front, wx = rw * Math.hypot(run, dx) / run, xIn = (y: number, sx: number) => sx * (B.front + (B.y1 - y) / run * dx - wx);
        for (const sx of [-1, 1]) {
          add(F, plan(kit, sx > 0 ? [[B.front - wx, B.y1], [B.front, B.y1], [B.rear, B.y0], [B.rear - wx, B.y0]] : [[-B.front, B.y1], [-B.front + wx, B.y1], [-B.rear + wx, B.y0], [-B.rear, B.y0]], lift, rh));
          for (const y of [B.y0 + 40, B.y1 - 40]) { const xc = xIn(y, sx) + sx * wx / 2; add(HM.rubber, box([xc - rw / 2, y - 35, 0], [xc + rw / 2, y + 35, lift])); }
          for (let i = 0; i < 4; i++) { const y = B.y0 + 70 + i * 40, xo = sx * (B.front + (B.y1 - y) / run * dx); add(HM.bolts, rod([xo - sx * 1, y, lift + rh / 2], [xo + sx * .5, y, lift + rh / 2], 13, 12)); }
          const ce = sx * (B.rear - wx / 2);
          add(HM.caps, box([ce - wx / 2 + 2, B.y0 - .01, lift], [ce + wx / 2 - 2, B.y0 + 4, lift + rh]));
        }
        for (const y of B.cross) add(F, box([xIn(y, -1) - 10, y - rw / 2, lift], [xIn(y, 1) + 10, y + rw / 2, lift + rh]));
        if (L.wheel) for (const sx of [-1, 1]) {
          const x = sx * (B.front - wx / 2);
          add(F, box([x - rw / 2 - 6, B.y1 - 40, lift], [x - rw / 2, L.wheel.y + 8, lift + rh]), box([x + rw / 2, B.y1 - 40, lift], [x + rw / 2 + 6, L.wheel.y + 8, lift + rh]));
          add(HM.rubber, rod([x - rw / 2 + 2, L.wheel.y, L.wheel.d / 2], [x + rw / 2 - 2, L.wheel.y, L.wheel.d / 2], L.wheel.d, 32));
          add(HM.zinc, rod([x - rw / 2 - 7, L.wheel.y, L.wheel.d / 2], [x + rw / 2 + 7, L.wheel.y, L.wheel.d / 2], 16, 12));
        }
      } else {
        add(F, box([-rw / 2, B.y0, lift], [rw / 2, B.y1, lift + rh]));
        for (const y of [B.y0 + rw / 2 + 12, B.y1 - rw / 2 - 12]) {
          add(F, box([-B.half + 70, y - rw / 2, lift], [B.half - 70, y + rw / 2, lift + rh]));
          // Angled sled foot plates at each end of the cross feet.
          for (const sx of [-1, 1]) add(F, kit.hull([box([sx > 0 ? B.half - 75 : -B.half + 5, y - rw / 2 - 12, 0], [sx > 0 ? B.half - 5 : -B.half + 75, y + rw / 2 + 12, 5]), box([sx > 0 ? B.half - 75 : -B.half + 70, y - rw / 2 - 12, 0], [sx > 0 ? B.half - 70 : -B.half + 75, y + rw / 2 + 12, lift + rh])]), box([sx > 0 ? B.half - 5 : -B.half, y - rw / 2 - 12, 0], [sx > 0 ? B.half : -B.half + 5, y + rw / 2 + 12, 30]));
        }
        if (L.wheel) for (const sx of [-1, 1]) {
          const x = sx * (B.half - 150);
          add(F, box([x - 16, L.wheel.y - 8, lift], [x - 10, B.y0 + 30, lift + rh]), box([x + 10, L.wheel.y - 8, lift], [x + 16, B.y0 + 30, lift + rh]));
          add(HM.rubber, rod([x - 10, L.wheel.y, L.wheel.d / 2 + 4], [x + 10, L.wheel.y, L.wheel.d / 2 + 4], L.wheel.d, 32));
          // Band pegs on the rear foot.
          add(HM.bolts, rod([sx * 300, B.y0 + 2, lift + rh / 2], [sx * 300, L.wheel.y - L.wheel.d / 2 + 2, lift + rh / 2], 25, 16));
        }
      }
      railTop = lift + rh;
      // ── Front upright, chassis beam and pad post (2×3), with base gussets.
      const T: readonly [number, number] = [inch2, inch3];
      const post = (y: number, z1: number) => { add(F, box([-T[0] / 2, y - T[1] / 2, railTop - 2], [T[0] / 2, y + T[1] / 2, z1])); for (const sx of [-1, 1]) add(F, gusset(kit, sx * T[0] / 2, sx, y, railTop, 110, 150)); };
      post(S.front.y, S.front.z + T[1] / 2);
      const padZ = S.pad.apex - S.pad.h;
      post(S.post, padZ - 6);
      add(F, box([-T[0] / 2, S.post, S.chassis - T[1] / 2], [T[0] / 2, S.front.y, S.chassis + T[1] / 2]));
      for (let y = S.stations.y - 45; y < S.stations.y + S.stations.pitch * (S.stations.n - 1) + 45; y += S.stations.pitch) for (const sx of [-1, 1]) add(HM.bolts, rod([sx * (T[0] / 2 - .5), y, S.chassis + 14], [sx * (T[0] / 2 + .6), y, S.chassis + 14], 11, 12));
      if (look.postText) for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const z = padZ - 120 - i * 50; add(look.brand, box([sx > 0 ? T[0] / 2 : -T[0] / 2 - .8, S.post - 22, z - 40], [sx > 0 ? T[0] / 2 + .8 : -T[0] / 2, S.post + 22, z])); }
      if (S.quadrant) {
        // Swing-arm quadrant plates with ten slots on the front upright.
        const cy = S.front.y, cz = S.front.z - 40, pts: Pt[] = [[cy, cz - 60]];
        for (let i = 0; i <= 12; i++) { const a = Math.PI * (.5 + i / 12 * .5); pts.push([cy + 190 * Math.cos(a), cz + 190 * Math.sin(a)]); }
        for (const sx of [-1, 1]) {
          const x0 = sx > 0 ? T[0] / 2 : -T[0] / 2 - 6, slots = Array.from({ length: 10 }, (_, i) => { const a = Math.PI * (.55 + i / 9 * .4), y = cy + 150 * Math.cos(a), z = cz + 150 * Math.sin(a); return box([x0 - 1, y - 7, z - 14], [x0 + 7, y + 7, z + 14]); });
          add(F, kit.cut(kit.prismX(pts, 6, x0), slots));
        }
      }
      if (S.step) {
        const st = S.step;
        add(F, box([-T[0] / 2, S.post, st.z - T[0] / 2], [T[0] / 2, S.front.y, st.z + T[0] / 2]));
        add(DIAMOND, box([-st.w / 2, st.y - st.l / 2, st.z + T[0] / 2], [st.w / 2, st.y + st.l / 2, st.z + T[0] / 2 + 5]));
        for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) add(DIAMOND, kit.at(kit.k(kit.k(kit.M.cube([22, 6, 1.6], true)).rotate([0, 0, (i + j) % 2 ? 35 : -35])), [-st.w / 2 + (i + .5) * st.w / 6, st.y - st.l / 2 + (j + .5) * st.l / 4, st.z + T[0] / 2 + 5.8]));
        // Chrome carriage rails beside the top rail.
        for (const sx of [-1, 1]) add(HM.chrome, rod([sx * 42, S.post + 60, S.chassis], [sx * 42, S.front.y - 30, S.chassis], 25, 20));
      }
      // ── Pad: steel carrier plate, two humped halves, handle bars along Y with end grips.
      const pd = S.pad;
      add(F, box([-pd.gap / 2 - pd.w, pd.y - pd.l / 2 + 30, padZ - 6], [pd.gap / 2 + pd.w, pd.y + pd.l / 2 - 30, padZ]));
      for (const sx of [-1, 1]) add(look.pad, humpPad(kit, sx > 0 ? pd.gap / 2 : -pd.gap / 2 - pd.w, pd.w, pd.y, padZ, pd.l, pd.h));
      const h = S.handles;
      add(F, bar([-h.x, S.post, h.z], [h.x, S.post, h.z], 38, 38, [0, 1, 0]));
      for (const sx of [-1, 1]) {
        add(F, rod([sx * h.x, h.y[0] + 160, h.z], [sx * h.x, h.y[1], h.z], h.d, 24));
        add(HM.foam, rod([sx * h.x, h.y[0], h.z], [sx * h.x, h.y[0] + 160, h.z], h.d + 6, 24));
        add(HM.caps, box([sx * h.x - h.d / 2, h.y[1] - 1, h.z - h.d / 2], [sx * h.x + h.d / 2, h.y[1], h.z + h.d / 2]));
      }
      rollerCarriage(kit, { ry: L.rollerY, chassis: S.chassis, rollers: S.rollers, footplate: S.footplate, frame: F, roller: look.roller, brand: look.plateLogo ? look.brand : undefined });
      return L.shift;
    });
  };
}
const inch2 = 50.8, inch3 = 76.2;
