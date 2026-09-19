/** Adjustable dumbbells family: Trulap 8592 G4 builder. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { DUMBBELL_LIFT } from '../floor-parts/adjustable-dumbbells-common.ts';
import { TRULAP as T, TRULAP_8592, trulapPlates } from '../floor-parts/adjustable-dumbbells-trulap.ts';
import { builderParams, dumbbellKit, type Mat } from './adjustable-dumbbells-kit.ts';
const MAT = {
  carried: ['Selected plates · chrome-plated cast iron', 'source', '#e8eaec', .62, .26],
  resting: ['Plates left in dock · chrome-plated cast iron', 'source', '#e8eaec', .62, .26],
  core: ['Handle cores and hubs · chrome', 'source', '#e2e4e6', .66, .26],
  button: ['End-face release buttons', 'source', '#e4e6e8', 1, .15],
  comb: ['Black interlock comb', 'source', '#1e1f21', .2, .6],
  grip: ['Knurled aluminium grip', 'handle', '#c6c9cd', .85, .36],
  marks: ['TRULAP wordmarks and indicator rings', 'source', '#141516', .1, .5],
  window: ['Weight window', 'source', '#eeeeea', 0, .45],
  dock: ['Reinforced nylon dock', 'source', '#252629', .05, .72],
  tubes: ['Stainless dock tubes', 'source', '#c9ccd0', .95, .22],
} as const satisfies Record<string, Mat>;
export const TRULAP_CENTER = T.plateBottom + T.plate / 2;
const GRIP = T.grip / 2, CORE0 = GRIP + T.hub, PLATE0 = CORE0 + T.core, GAP = .8, CHORD = T.plate / 2 - 17, COMB = 50;
export function buildTrulap8592(api: ManifoldAPI, input: NumericParams) {
  const p = builderParams(TRULAP_8592, input), lift = p.pose ? 0 : DUMBBELL_LIFT, carriedCount = trulapPlates(p.weight);
  const t = dumbbellKit(api), zc = TRULAP_CENTER, R = T.plate / 2;
  return t.finish('Trulap 8592 G4', () => {
    const carried: [Mat, Manifold][] = [], fixed: [Mat, Manifold][] = [];
    /** One plate from x0 (toward +X) of thickness th: disc with the top comb notch, a thin fin rising through it and a
     * black spacer behind the fin. `s` = ±1 builds on either end (x0 is the inner face station). */
    const plate = (s: number, x0: number, th: number, mat: Mat, list: [Mat, Manifold][], face = false) => {
      const a = s > 0 ? x0 : -x0 - th, b = a + th, finA = s > 0 ? a : b - th * .45, finB = s > 0 ? a + th * .45 : b;
      let disc = t.cut(t.cylX(a, b, 0, zc, T.plate, 72), [t.box([a - 1, -COMB - 2, zc + CHORD], [b + 1, COMB + 2, zc + R + 1])]);
      const fin = t.inter([t.box([finA, -COMB + 4, zc + CHORD - 1], [finB, COMB - 4, zc + R]), t.cylX(finA - 1, finB + 1, 0, zc, T.plate - 3, 72)]);
      if (face) {
        // Outer end face: V notch in the comb, two small holes; the wordmark and button are added as separate solids.
        const o = s > 0 ? b : a, inward = s > 0 ? -1 : 1;
        disc = t.cut(disc, [-70, 70].map(y => t.cylX(Math.min(o, o + inward * 4), Math.max(o, o + inward * 4), y, zc, 4, 12)));
        list.push([MAT.marks, t.box([Math.min(o, o - inward * .8), -38, zc + 22], [Math.max(o, o - inward * .8), 38, zc + 38])]);
        list.push([MAT.button, t.cylX(Math.min(o, o - inward * 3), Math.max(o, o - inward * 3), 0, zc, 22, 32)]);
      }
      list.push([mat, t.union([disc, fin])], [MAT.comb, t.box([s > 0 ? finB : a, -COMB + 2, zc + CHORD - 1], [s > 0 ? b : finA, COMB - 2, zc + CHORD + 9])]);
    };
    for (const [side, s] of [[0, 1], [1, -1]] as const) {
      const total = T.plates[side], n = carriedCount[side];
      for (let i = 0; i < total; i++) {
        const on = i < n;
        plate(s, PLATE0 + i * T.pitch, T.pitch - GAP, on ? MAT.carried : MAT.resting, on ? carried : fixed, i === total - 1);
      }
      // Fixed core stack (the 4 kg handle's own plates), then the domed hub with its indicator ring and weight window.
      for (let i = 0; i < 6; i++) plate(s, CORE0 + i * T.core / 6, T.core / 6 - GAP, MAT.core, carried);
      const hub = t.lathe([[0, GRIP - 1], [24, GRIP - 1], [30, GRIP + 3], [48, GRIP + 10], [64, GRIP + 19], [74, GRIP + 26], [77, CORE0], [0, CORE0]], 0, zc, 64);
      const ring = t.lathe([[26, GRIP + 3], [38, GRIP + 3], [38, GRIP + 5], [26, GRIP + 5]], 0, zc, 48);
      const win = t.box([GRIP + 13, -7, zc + 50], [GRIP + 20, 7, zc + 60]), word = t.box([GRIP + 21, -22, zc + 64], [GRIP + 24, 22, zc + 71]);
      const put = (m: Mat, solid: Manifold) => carried.push([m, s > 0 ? solid : t.mirrorX(solid)]);
      put(MAT.core, hub); put(MAT.marks, ring); put(MAT.window, win); put(MAT.marks, word);
    }
    carried.push([MAT.grip, t.cylX(-GRIP - 1, GRIP + 1, 0, zc, T.gripDiameter, 40)]);
    for (let x = -GRIP + 6; x < GRIP - 6; x += 3.6) carried.push([MAT.grip, t.cylX(x, x + 1.3, 0, zc, T.gripDiameter + .8, 40)]);
    // Dock: two end cradles, each a saddle block on an inner and an outer leg, with the latch tower at the outer end,
    // joined by two stainless tubes (front one labelled).
    const L = T.dockLength / 2, W = T.dockWidth / 2, x0 = CORE0 - 5, legTop = 55;
    const profile = t.poly([[-W, 0], [W, 0], [W - 6, T.blockTop], [-W + 6, T.blockTop]]);
    const cradle = t.cut(t.extrudeX(profile, x0, L - x0), [
      t.cylX(x0 - 1, L - 10, 0, zc, T.plate + 4, 72),
      t.box([x0 + 32, -W - 1, -1], [L - 28, W + 1, legTop]),
      t.box([x0 - 1, -W + 18, -1], [L + 1, W - 18, 14]),
    ]);
    const tower = t.hull([t.box([L - 14, -38, legTop], [L, 38, T.blockTop]), t.box([L - 12, -26, T.blockTop], [L, 26, T.blockTop + 24])]);
    const latch = t.box([L - 1, -16, T.blockTop + 6], [L, 16, T.blockTop + 14]);
    for (const s of [cradle, tower]) fixed.push([MAT.dock, s], [MAT.dock, t.mirrorX(s)]);
    fixed.push([MAT.marks, latch], [MAT.marks, t.mirrorX(latch)]);
    for (const y of [-W + 20, W - 20]) fixed.push([MAT.tubes, t.cylX(-x0 - 20, x0 + 20, y, 70, 25, 32)]);
    fixed.push([MAT.marks, t.inter([t.cylX(-42, 42, -W + 20, 70, 25.6, 32), t.box([-42, -W, 66], [42, -W + 10, 74])])]);
    for (const [m, s] of fixed) t.add(m, s);
    for (const [m, s] of carried) t.add(m, lift ? t.move(s, [0, 0, lift]) : s);
  });
}
export const definitions: PartDefinition[] = [floorDefinition(TRULAP_8592, buildTrulap8592)];
