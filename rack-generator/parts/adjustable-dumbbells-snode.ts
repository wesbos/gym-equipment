/** Adjustable dumbbells family: Snode AD80 builder. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition } from '../types.ts';
import { floorDefinition, validateFloorParams } from '../floor-part.ts';
import { DUMBBELL_LIFT } from '../floor-parts/adjustable-dumbbells-common.ts';
import { SNODE as S, SNODE_AD80, snodePlates } from '../floor-parts/adjustable-dumbbells-snode.ts';
import { dumbbellKit, type Mat, type Pt } from './adjustable-dumbbells-kit.ts';
const MAT = {
  carried: ['Selected plates · matte black cast iron', 'source', '#1f2022', .25, .8],
  resting: ['Plates left in cradle · matte black cast iron', 'source', '#1f2022', .25, .8],
  hub: ['Inner hub castings', 'source', '#18191b', .25, .75],
  chrome: ['Polished chrome cone flanges', 'source', '#d6d9dc', 1, .12],
  grip: ['Knurled chrome grip', 'handle', '#b8bbbf', .9, .38],
  window: ['Collar weight window', 'source', '#101112', .1, .4],
  numerals: ['Weight window numerals', 'source', '#eceae4', 0, .5],
  cradle: ['Cast-iron cradle', 'source', '#1b1c1e', .3, .72],
  tubes: ['Chrome cradle tubes', 'source', '#d6d9dc', 1, .14],
  caps: ['Magnetic 1.25 lb chrome caps', 'source', '#dcdfe2', 1, .1],
} as const satisfies Record<string, Mat>;
/** Axis heights and stations (build X along the dumbbell). */
export const SNODE_CENTER = S.plateBottom + S.plate / 2;
const GRIP = S.grip / 2, HUB0 = GRIP + S.cone, PLATE0 = HUB0 + S.hub, GAP = 1;
/** Outer face station of the carried stack (hub face when no plate is selected). */
export const snodeCarriedEnd = (n: number) => PLATE0 + n * S.pitch - (n && n < S.plates ? GAP : 0);
export function buildSnodeAd80(api: ManifoldAPI, input: NumericParams) {
  const p = validateFloorParams(SNODE_AD80, input), n = snodePlates(p.weight), lift = p.pose ? 0 : DUMBBELL_LIFT;
  const t = dumbbellKit(api), zc = SNODE_CENTER, R = S.plate / 2;
  return t.finish('Snode AD80', () => {
    const carried: [Mat, Manifold][] = [], fixed: [Mat, Manifold][] = [];
    const put = (list: [Mat, Manifold][], mat: Mat, ...solids: Manifold[]) => { for (const s of solids) list.push([mat, s]); };
    /** Arc (kidney) window in the Y/Z plane around the axis. */
    const kidney = (r0: number, r1: number, a0: number, a1: number): Pt[] => {
      const pts: Pt[] = [], steps = 10;
      for (let i = 0; i <= steps; i++) { const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; pts.push([r1 * Math.cos(a), zc + r1 * Math.sin(a)]); }
      for (let i = steps; i >= 0; i--) { const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; pts.push([r0 * Math.cos(a), zc + r0 * Math.sin(a)]); }
      return pts;
    };
    // Dovetail keys: each plate's top key jogs sideways one step, so the seams read as a staircase across the top.
    const keyY = (i: number) => -42 + i * 14, KEY = 18, KEY_R0 = R - 20;
    const keyBox = (x0: number, x1: number, y: number, grow = 0) => t.inter([
      t.box([x0, y - KEY / 2 - grow, zc + KEY_R0 - grow], [x1, y + KEY / 2 + grow, zc + R + 2]), t.cylX(x0 - 1, x1 + 1, 0, zc, S.plate - 2 * GAP + 2 * grow, 72)]);
    for (let i = 0; i < S.plates; i++) {
      const x0 = PLATE0 + i * S.pitch, x1 = x0 + S.pitch - (i < S.plates - 1 ? GAP : 0);
      let plate = t.cylX(x0, x1, 0, zc, S.plate, 72);
      const holes = [
        t.box([x1 - 4.5, -12, zc + R - 16], [x1 + 1, 12, zc + R + 1]), // top key notch on the outer face
        t.box([x1 - 4.5, -10, zc - R - 1], [x1 + 1, 10, zc - R + 18]), // bottom keyhole
        t.cylX(x1 - 5, x1 + 1, 0, zc, 14, 20),
        t.cut(t.cylX(x1 - 1.2, x1 + 1, 0, zc, 112, 64), [t.cylX(x1 - 2, x1 + 2, 0, zc, 108, 64)]),
      ];
      if (i) holes.push(keyBox(x0 - 1, x0 + 5.2, keyY(i - 1), .6));
      plate = t.cut(plate, holes);
      if (i < S.plates - 1) plate = t.union([plate, keyBox(x1 - 1, x1 + GAP + 4.6, keyY(i))]);
      put(i < n ? carried : fixed, i < n ? MAT.carried : MAT.resting, plate);
    }
    // Inner hub casting: three kidney windows and a top pin hole on the grip face.
    const windows = [30, 150, 270].map(a => t.extrudeX(t.poly(kidney(38, 66, a - 48, a + 48)), HUB0 - 1, 9));
    put(carried, MAT.hub, t.cut(t.cylX(HUB0, PLATE0 - GAP, 0, zc, S.plate, 72), [...windows, t.cylX(HUB0 - 1, HUB0 + 10, 0, zc + 73, 11, 20)]));
    // Chrome cone flange with the collar ring; the weight window sits on the +X collar.
    put(carried, MAT.chrome, t.lathe([[0, GRIP], [23, GRIP], [23, GRIP + 7], [44, GRIP + 29], [44, HUB0 + 2], [0, HUB0 + 2]], 0, zc, 48));
    put(carried, MAT.window, t.box([GRIP + 1.5, -6, zc + 21], [GRIP + 6.5, 6, zc + 23.6]));
    put(carried, MAT.numerals, t.box([GRIP + 2.5, -3.5, zc + 23.2], [GRIP + 5.5, 3.5, zc + 23.8]));
    // Magnetic caps: on the outer face of the carried stack when lifted, on the full stack's end face when racked.
    const face = snodeCarriedEnd(p.pose ? S.plates : n);
    for (let c = 0; c < p.caps; c++) {
      const y = c ? 24 : -24;
      put(carried, MAT.caps, t.cylX(face, face + 4, y, zc, 26, 32), t.lathe([[0, face + 3.5], [S.capDiameter / 2 - 2, face + 3.5], [S.capDiameter / 2, face + 6], [S.capDiameter / 2, face + S.cap - 2], [S.capDiameter / 2 - 2, face + S.cap], [0, face + S.cap]], y, zc, 40));
    }
    const mirror = (list: [Mat, Manifold][]) => [...list, ...list.map(([m, s]) => [m, t.mirrorX(s)] as [Mat, Manifold])];
    const carriedAll = mirror(carried);
    // Knurled grip: core plus fine raised rings.
    carriedAll.push([MAT.grip, t.cylX(-GRIP - 1, GRIP + 1, 0, zc, S.gripDiameter, 40)]);
    for (let x = -GRIP + 5; x < GRIP - 5; x += 3.6) carriedAll.push([MAT.grip, t.cylX(x, x + 1.3, 0, zc, S.gripDiameter + .8, 40)]);
    // Cradle: base plate, chrome side tubes, end blocks with plate saddles and the embossed wordmark, hub saddles.
    const cradle: Manifold[] = [], L = S.cradleLength / 2, W = S.cradleWidth / 2, stackEnd = PLATE0 + S.plates * S.pitch;
    cradle.push(t.cut(t.box([-L + 2, -W, 0], [L - 2, W, 8]), [t.box([-GRIP, -W + 26, -1], [GRIP, W - 26, 9])]));
    const trapezoid = (top: number, h: number) => t.poly([[-W, 0], [W, 0], [top / 2, h], [-top / 2, h]]);
    const blockIn = PLATE0 - 6;
    const block = t.cut(t.extrudeX(trapezoid(122, S.cradleHeight), blockIn, L - 1.5 - blockIn), [
      t.cylX(blockIn - 1, stackEnd + .5, 0, zc, S.plate + 3, 72),
      t.box([L - 16, -60, 82], [L, 60, S.cradleHeight + 1]), // end wall stops below the caps
      t.box([L - 16, -15, 60], [L, 15, 83]), // key U-notch
      t.cylX(L - 18, L, 0, 50, 11, 20),
      t.box([blockIn - 1, -42, -1], [L + 1, 42, 16]), // tunnel between the feet
    ]);
    cradle.push(block, t.mirrorX(block));
    const brand = t.box([L - 1.5, -32, 26], [L, 32, 38]);
    cradle.push(brand, t.mirrorX(brand));
    // Low saddles under the inner hubs.
    const saddle = t.cut(t.box([HUB0 + 2, -W + 20, 6], [PLATE0 - 4, W - 20, 40]), [t.cylX(HUB0, PLATE0, 0, zc, S.plate + 3, 72)]);
    cradle.push(saddle, t.mirrorX(saddle));
    const fixedAll = mirror(fixed);
    for (const y of [-W + 13, W - 13]) fixedAll.push([MAT.tubes, t.cylX(-L + 16, L - 16, y, 19, 22, 32)]);
    for (const s of cradle) fixedAll.push([MAT.cradle, s]);
    for (const [m, s] of fixedAll) t.add(m, s);
    for (const [m, s] of carriedAll) t.add(m, lift ? t.move(s, [0, 0, lift]) : s);
  });
}
export const definitions: PartDefinition[] = [floorDefinition(SNODE_AD80, buildSnodeAd80)];
