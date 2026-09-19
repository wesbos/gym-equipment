/** Westside Barbell Scout Hyper (Rogue): folding scissor-leg reverse hyper. Metadata and layout: ../floor-parts/hypers.ts. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { inch, scoutLayout } from '../floor-parts/hypers.ts';
import { plateStackLength } from '../plates.ts';
import { buildWith, lerp3, type Pt } from './hypers-kit.ts';
import { HM } from './hypers-materials.ts';
/** Y/Z outline of a plate with rounded bottom corners (square top edge under the pad). */
export function plateOutline(y0: number, y1: number, z0: number, z1: number, r: number, n = 8): Pt[] {
  const pts: Pt[] = [[y1, z1], [y0, z1]];
  for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI / 2; pts.push([y0 + r + r * Math.cos(a), z0 + r + r * Math.sin(a)]); }
  for (let i = 0; i <= n; i++) { const a = 1.5 * Math.PI + (i / n) * Math.PI / 2; pts.push([y1 - r + r * Math.cos(a), z0 + r + r * Math.sin(a)]); }
  return pts;
}
export function buildScoutHyper(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = scoutLayout(p), S = L.S;
  return buildWith(api, 'Scout Hyper', kit => {
    const { add, bar, rod, box, cushion, at, prismX, hull, hinge, revolve, band, place, ball } = kit;
    const T = S.tube, padZ = S.padTop - S.padT, [py0, py1] = S.plateY, plateZ0 = padZ - S.plateGap, xo = S.padW / 2 - 6;
    // Round-edge pad: crowned vinyl over a board, full 27.5 × 21.5 × 2 in.
    add(HM.vinyl, at(cushion(S.padW, S.padD, S.padT, 34, 22), [0, 0, padZ]));
    // Steel side plates carrying the pad, with rounded bottom corners, branding and warning labels.
    for (const sx of [-1, 1]) {
      add(HM.black, prismX(plateOutline(py0, py1, plateZ0, padZ, 42), 6, sx > 0 ? xo : -xo - 6));
      const face = sx > 0 ? xo + 6 : -xo - 6.8;
      add(HM.white, box([face, -80, 1066], [face + .8, 118, 1101]), box([face, -70, 1019], [face + .8, 108, 1053]));
      add(HM.label, box([face, 160, 1072], [face + .8, 250, 1112]));
      add(HM.orange, box([face + (sx > 0 ? .2 : -.2), 160, 1104], [face + (sx > 0 ? 1 : .6), 250, 1112]));
      for (const [y, z] of [[-200, 1100], [0, 1112], [200, 1100], [-200, 1000], [262, 1000]] as Pt[]) add(HM.bolts, rod([sx * (xo + 6), y, z], [sx * (xo + 9), y, z], 13, 16));
    }
    // Cross tubes under the pad: front (handle mount), rear pendulum hanger, and a centre board rail.
    add(HM.black, bar([-xo, 250, padZ - 30], [xo, 250, padZ - 30], T, T, [0, 1, 0]));
    add(HM.black, bar([-xo, S.pivot[1] + 21, 1010], [xo, S.pivot[1] + 21, 1010], T, inch(3), [0, 1, 0]));
    add(HM.black, bar([-xo, -230, padZ - 15], [xo, -230, padZ - 15], T, 30, [0, 1, 0]));
    // Scissor legs: rear-foot pair outboard (tops slide in the patented groove, locked by the pop pins), front-foot pair inboard.
    const legs = [{ top: S.rearLeg.top, foot: S.rearLeg.foot, x: xo - T / 2 }, { top: S.frontLeg.top, foot: S.frontLeg.foot, x: xo - 1.5 * T }];
    const legAt = (l: typeof legs[number], z: number) => { const [ty, tz] = l.top; return ty + (l.foot - ty) * (tz - z) / tz; };
    for (const l of legs) for (const sx of [-1, 1]) {
      const x = sx * l.x, top: Vec3 = [x, l.top[0], l.top[1]], low: Vec3 = [x, legAt(l, 30), 30], up = lerp3(low, top, 1 + 30 / Math.hypot(top[1] - low[1], top[2] - low[2]));
      add(HM.black, bar(low, up, T, T));
      // Rubber boot: flat pad on the floor tapering up around the leg.
      const fy = l.foot, by = legAt(l, S.bootH);
      add(HM.rubber, hull([box([x - S.bootW / 2, fy - S.bootL / 2, 0], [x + S.bootW / 2, fy + S.bootL / 2, 8]), box([x - T / 2 - 4, by - T / 2 - 10, S.bootH - 1], [x + T / 2 + 4, by + T / 2 + 10, S.bootH])]));
      // Adjustment holes up the lower legs (black dots) and the top pivot bolt.
      for (let i = 0; i < 4; i++) { const z = 260 + i * 70; add(HM.bolts, rod([x + sx * (T / 2 - .5), legAt(l, z), z], [x + sx * (T / 2 + 1), legAt(l, z), z], 9, 12)); }
      add(HM.bolts, rod([sx * (l.x - T / 2 - 2), l.top[0], l.top[1]], [sx * (xo + 9), l.top[0], l.top[1]], 16, 16));
    }
    // Crossing pivot: one through-bolt per side, hex head outboard.
    const cz = (S.frontLeg.foot - S.rearLeg.foot) / ((S.frontLeg.foot - S.frontLeg.top[0]) / S.frontLeg.top[1] + (S.rearLeg.top[0] - S.rearLeg.foot) / S.rearLeg.top[1]);
    const cy = legAt(legs[0], cz);
    for (const sx of [-1, 1]) add(HM.bolts, rod([sx * (legs[1].x - T / 2), cy, cz], [sx * (xo + 2), cy, cz], 14, 16), rod([sx * (xo - 1), cy, cz], [sx * (xo + 7), cy, cz], 24, 6));
    // Front-leg crossmember and the rubber-covered rear step across the rear-foot legs.
    const fz = 230, fy = legAt(legs[1], fz);
    add(HM.black, bar([-legs[1].x, fy, fz], [legs[1].x, fy, fz], T, T, [0, 1, 0]));
    const sy = legAt(legs[0], 232);
    add(HM.black, box([-xo, sy - 105, 214], [xo, sy + 10, 252]));
    add(HM.rubber, box([-xo + 8, sy - 100, 252], [xo - 8, sy + 4, 258]));
    // Pop pins locking the sliding leg tops: boss, red indicator band, ball knob, flat end face at the published 32 in width.
    for (const sx of [-1, 1]) {
      const y = 235, z = 1038, o = (a: number, b: number, d: number) => rod([sx * a, y, z], [sx * b, y, z], d, 24);
      add(HM.black, o(xo + 6, xo + 24, 30));
      add(HM.red, o(xo + 24, xo + 31, 16));
      add(HM.caps, at(ball([0, 0, 0], 36, 24), [sx * 386, y, z]), o(S.knobX - 3, S.knobX, 20));
    }
    // Handles: square arms off the front cross tube, angled grips with 6 in foam sleeves.
    const h = S.handle;
    for (const sx of [-1, 1]) {
      const x = sx * h.x, s: Vec3 = [x, h.start[0], h.start[1]], e: Vec3 = [x, h.elbow[0], h.elbow[1]], t: Vec3 = [x, L.tip[1], L.tip[2]];
      add(HM.black, bar([x, 240, h.start[1] + 25], s, 38, 38), bar(s, e, 38, 38), hull([box([x - 19, e[1] - 19, e[2] - 19], [x + 19, e[1] + 19, e[2] + 19]), rod(e, lerp3(e, t, .15), 34)]));
      add(HM.black, rod(e, lerp3(e, t, 1 - 152 / h.length), 32));
      add(HM.foam, rod(lerp3(e, t, 1 - 152 / h.length), t, h.grip, 32));
    }
    // Pendulum swing arm: clevis, square arm, weight posts with collars, D-ring and hyper strap loop; all swing about the pivot.
    const P = S.pivot, swing = (m: import('manifold-3d').Manifold) => hinge(m, P, -L.swing);
    add(HM.black, box([-26, P[1] - 22, P[2] - 18], [-20, P[1] + 22, 972]), box([20, P[1] - 22, P[2] - 18], [26, P[1] + 22, 972]));
    add(HM.bolts, rod([-34, P[1], P[2]], [34, P[1], P[2]], 16, 16));
    add(HM.black, swing(box([-S.arm / 2, P[1] - S.arm / 2, 250], [S.arm / 2, P[1] + S.arm / 2, P[2] + 14])));
    add(HM.black, swing(box([-3, P[1] - 14, 238], [3, P[1] + 14, 262])));
    const hornEnd = S.arm / 2 + S.collar + S.horn;
    add(HM.zinc, swing(rod([-hornEnd, P[1], S.post], [hornEnd, P[1], S.post], S.sleeve, 40)));
    for (const sx of [-1, 1]) {
      add(HM.black, swing(rod([sx * S.arm / 2, P[1], S.post], [sx * (S.arm / 2 + S.collar), P[1], S.post], 76, 40)));
      add(HM.caps, swing(rod([sx * (hornEnd - 4), P[1], S.post], [sx * hornEnd, P[1], S.post], S.sleeve + 3, 40)));
    }
    add(HM.zinc, swing(revolve([[21, -5], [31, -5], [31, 5], [21, 5]], [0, P[1], 232], [1, 0, 0], 32)));
    const loop = place(band(2 * S.strap.r, S.strap.top - S.strap.bottom + 2 * S.strap.r, 3, 50), [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, -25, P[1], (S.strap.top + S.strap.bottom) / 2, 1]);
    add(HM.webbing, swing(loop));
    // Plates on both weight posts, then spring collars outboard of the stack.
    if (L.load.length) {
      for (const sx of [-1, 1]) kit.plates(L.load, [sx * (S.arm / 2 + S.collar), L.postC[1], L.postC[2]], [sx, 0, 0], sx > 0 ? 'Right post plate' : 'Left post plate');
      const stack = plateStackLength(L.load);
      for (const sx of [-1, 1]) { const x0 = sx * (S.arm / 2 + S.collar + stack + 1); add(HM.chrome, swing(rod([x0, P[1], S.post], [x0 + sx * 11, P[1], S.post], 64, 32))); }
    }
    return L.shift;
  });
}
