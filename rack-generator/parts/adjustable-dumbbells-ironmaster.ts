/** Adjustable dumbbells family: IronMaster Quick-Lock dumbbell and stand builders (see floor-parts/adjustable-dumbbells-ironmaster.ts). */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { dumbbellKit, type DumbbellKit, type Mat, type Pt } from './adjustable-dumbbells-kit.ts';
import { QUICK_LOCK as Q, QUICK_LOCK_DUMBBELL, QUICK_LOCK_STAND, QUICK_LOCK_STAND_LOADS, QUICK_LOCK_STAND_SIZE as S, quickLockLoading, quickLockStandPair, type QuickLockEnd } from '../floor-parts/adjustable-dumbbells-ironmaster.ts';
const MAT = {
  plates: ['Black cast-iron Quick-Lock plates', 'source', '#1d1e20', .1, .75],
  heavy: ['Heavy Handle split plates', 'source', '#1f2022', .15, .65],
  chrome: ['Chrome handle and backing plates', 'source', '#e2e4e6', .85, .24],
  knurl: ['Diamond-knurled chrome grip', 'handle', '#b9bdc1', .9, .42],
  bushing: ['Brass-tone grip bushings', 'source', '#b89b62', .8, .35],
  screws: ['Chrome Quick-Lock locking screws', 'source', '#dfe1e3', .85, .3],
  screwKnurl: ['Knurled screw rims', 'source', '#bfc3c7', .95, .45],
  marks: ['Etched OPEN / LOCK arrows', 'source', '#6d7074', .6, .5],
  bolts: ['Black-oxide socket bolts', 'fastener', '#2a2b2d', .6, .4],
  stand: ['Dark grey metallic powder-coated steel', 'source', '#54575b', .4, .5],
  mats: ['Diamond-texture rubber mats', 'liner', '#151515', 0, .9],
  feet: ['Rubber levelling feet', 'liner', '#111213', 0, .85],
  badge: ['IRONMASTER badge', 'source', '#e8e8e6', .2, .5],
  hardware: ['Chrome button-head bolts', 'fastener', '#c8cbcf', .9, .25],
} as const satisfies Record<string, Mat>;
type Group = keyof typeof MAT;
const ZC = Q.plate / 2;
/** One Quick-Lock dumbbell, handle along X, lying on its plate edges with the floor at `at`. */
function quickLockUnit(t: DumbbellKit, p: NumericParams, at: Vec3) {
  const { screws, ends } = quickLockLoading(p), heavy = !!p.heavy, pan0 = Q.inside / 2, face = heavy ? pan0 - Q.heavy : pan0;
  const out = new Map<Group, Manifold[]>(), put = (g: Group, ...s: Manifold[]) => out.set(g, [...(out.get(g) ?? []), ...s]);
  const square = (x0: number, len: number, size: number, r: number) => t.extrudeX(t.rrect(size, size, r), x0, len, 0, ZC);
  /** Tapered plate: narrow inboard face, full 6.7" square outboard, eased outer edge — stacked plates read as ribs. */
  const plate = (x0: number, thick: number) => t.hull([square(x0, .5, Q.plate - 8, Q.radius - 4), square(x0 + thick * .4, thick * .6 - 1.2, Q.plate, Q.radius), square(x0 + thick - .5, .5, Q.plate - 4, Q.radius - 2)]);
  /** Outer-face relief of the outermost plate: raised border, recessed field, round centre boss and bore. */
  const relief = (s: Manifold, x1: number, depth: number) => t.cut(s, [t.cut(t.extrudeX(t.rrect(Q.plate - 22, Q.plate - 22, 15), x1 - depth, depth + 1, 0, ZC), [t.cylX(x1 - depth - 1, x1 + 2, 0, ZC, 81, 40)]), t.cylX(x1 - 14, x1 + 1, 0, ZC, 27, 24)]);
  const endSolids = (e: QuickLockEnd, screw: boolean) => {
    const g = new Map<Group, Manifold[]>(), add = (k: Group, ...s: Manifold[]) => g.set(k, [...(g.get(k) ?? []), ...s]);
    // Chrome backing plate: square dished pan with a centre boss, threaded bore and the top alignment notch.
    const notch = t.move(t.rot(t.boxC([Q.pan + 2, 7, 7], [0, 0, 0]), [45, 0, 0]), [pan0 + Q.pan / 2, 0, Q.plate]);
    // Its rim wraps the first plate's tapered inboard edge, as on the product.
    if (screw || e.big + e.five + e.small) add('chrome', t.cut(square(pan0 + Q.pan - .1, 4.5, Q.plate, Q.radius), [square(pan0 + Q.pan - 1, 6.5, Q.plate - 4, Q.radius - 2)]));
    add('chrome', t.cut(square(pan0, Q.pan, Q.plate, Q.radius), [t.cut(t.extrudeX(t.rrect(Q.plate - 20, Q.plate - 20, 15), pan0 + Q.pan - 3, 4, 0, ZC), [t.cylX(pan0, pan0 + Q.pan + 1, 0, ZC, 62, 40)]), t.cylX(pan0 + 2, pan0 + Q.pan + 1, 0, ZC, 25, 24), notch]));
    if (heavy) {
      // Heavy Handle plate: two machined halves clamped round the grip, split through the axis, two socket bolts on top.
      const x0 = pan0 - Q.heavy, mid = x0 + Q.heavy / 2, top = Q.plate, holes = [-55, 55].map(y => t.cylZ(top - 8, top + 1, mid, y, 10, 20));
      const seam = t.cut(t.boxC([Q.heavy + 2, Q.plate + 4, .9], [mid, 0, ZC]), [t.boxC([Q.heavy - 3, Q.plate - 16, 2], [mid + 1.5, 0, ZC])]);
      add('heavy', t.cut(t.hull([square(x0, .6, Q.plate - 3, Q.radius - 1.5), square(x0 + .6, Q.heavy - 1.2, Q.plate, Q.radius), square(pan0 - .6, .6, Q.plate - 3, Q.radius - 1.5)]), [seam, ...holes]));
      for (const y of [-55, 55]) add('bolts', t.cut(t.cylZ(top - 8, top - 2.5, mid, y, 8.6, 20), [t.cylZ(top - 5, top - 2, mid, y, 4.6, 6)]));
    }
    // Plates outboard of the pan: 22.5 lb blocks innermost, then 5 lb, then the 2.5 lb plate under the screw.
    const stack = [...Array(e.big).fill(Q.big), ...Array(e.five + e.small).fill(Q.pitch)] as number[];
    let x = pan0 + Q.pan;
    stack.forEach((thick, i) => { const last = i === stack.length - 1, s = plate(x, thick); add('plates', last ? relief(s, x + thick, e.small ? 2.4 : 1.5) : s); x += thick; });
    if (screw) {
      // Quick-Lock screw head: 4" spun-chrome disc, knurled rim band, etched OPEN arrow and LOCK arc on the face.
      const r = Q.headD / 2, h = Q.head;
      add('screws', t.lathe([[0, x], [r - 1.5, x], [r - .6, x + 1.5], [r - .6, h + x - 1.5], [r - 2, x + h], [r - 4, x + h], [r - 4.6, x + h - .4], [0, x + h - .4]], 0, ZC, 64));
      add('screwKnurl', t.cut(t.lathe([[r - 2, x + 2.2], [r, x + 2.2], [r, x + h - 2.2], [r - 2, x + h - 2.2]], 0, ZC, 64), [t.boxC([h, 6, 6], [x + h / 2, 0, ZC + r])]));
      const arrow: Pt[] = [[-2, 8], [2, 8], [2, 32], [7, 32], [0, 43], [-7, 32], [-2, 32]];
      const arc: Pt[] = [...Array(9)].flatMap((_, i) => { const a = (25 + i * 6) * Math.PI / 180; return [[Math.sin(a) * 40, Math.cos(a) * 40]] as Pt[]; });
      const arcIn: Pt[] = arc.map(([u, v]) => [u * 36 / 40, v * 36 / 40] as Pt).reverse();
      add('marks', t.extrudeX(t.poly(arrow), x + h - .5, .35, 0, ZC), t.extrudeX(t.poly([...arc, ...arcIn].reverse()), x + h - .5, .35, 0, ZC));
    }
    // Bushing and plain collar where the knurled grip meets the pan (or the Heavy Handle plate).
    add('bushing', t.cylX(face - 2.5, face, 0, ZC, 42, 40));
    add('chrome', t.cylX(face - 7.5, face - 2.5, 0, ZC, Q.grip + 1, 40));
    return g;
  };
  ends.forEach((e, i) => { for (const [k, s] of endSolids(e, screws > i)) put(k, ...(i ? s.map(t.mirrorX) : s)); });
  // Grip: 1.25" chrome tube with fine diamond knurl, shown as raised rings.
  put('knurl', t.cylX(-face, face, 0, ZC, Q.grip, 40));
  for (let x = -face + 9; x <= face - 9; x += 2.2) put('knurl', t.cylX(x, x + .8, 0, ZC, Q.grip + .45, 32));
  for (const [k, s] of out) t.add(MAT[k], ...s.map(m => t.move(m, at)));
}
export function buildQuickLockDumbbell(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  quickLockLoading(p);
  const t = dumbbellKit(api);
  return t.finish('IronMaster Quick-Lock dumbbell', () => quickLockUnit(t, p, [0, 0, 0]));
}
/** Stand SKU 1008, built with X along the 19" top (the dumbbells' axis) and Y across the 14.5" width. */
export function buildQuickLockStand(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(QUICK_LOCK_STAND_LOADS as readonly number[]).includes(p.load)) throw Error('Unsupported dumbbell stand dumbbells.');
  const t = dumbbellKit(api), L = S.depth / 2, W = S.width / 2, P = S.panel / 2, foot = 19, sheet = 2.1, mat = 2.8;
  const topZ = S.height - mat - sheet, panelX = L - 21, sheetT = 2, flange = 23;
  return t.finish('IronMaster Quick-Lock stand', () => {
    const steel: Manifold[] = [];
    for (const s of [-1, 1]) {
      const xo = s * panelX, xi = s * (panelX - sheetT);
      // End panel: 12.5" × 25" U-channel with inward flanges, badge, two chrome bolts and two levelling feet.
      steel.push(t.box([Math.min(xo, xi), -P, foot], [Math.max(xo, xi), P, topZ]));
      for (const y of [-1, 1]) {
        steel.push(t.box([Math.min(xi, xi - s * flange), y > 0 ? P - sheetT : -P, foot], [Math.max(xi, xi - s * flange), y > 0 ? P : -P + sheetT, topZ]));
        t.add(MAT.feet, t.cylZ(0, foot, s * (panelX - 18), y * (P - 20), 38, 24));
      }
      // IRONMASTER badge: striped barbell "I" mark and a row of block letters (flat plates, no logo artwork).
      const face = (y0: number, y1: number, z0: number, z1: number) => t.box([s > 0 ? xo : xo - 1, Math.min(y0, y1), z0], [s > 0 ? xo + 1 : xo, Math.max(y0, y1), z1]), dir = s;
      t.add(MAT.badge, face(dir * -72, dir * -64, 514, 552), ...[0, 1, 2, 3].map(i => face(dir * -76, dir * -60, 517 + i * 9, 521 + i * 9)));
      for (let i = 0; i < 10; i++) t.add(MAT.badge, face(dir * (-56 + i * 13), dir * (-46 + i * 13), 524, 544));
      for (const z of [335, 45]) t.add(MAT.hardware, t.cylX(s > 0 ? xo : xo - 3, s > 0 ? xo + 3 : xo, 0, z, 12, 16));
      // Top-sheet lip turned up along each 14.5" end.
      steel.push(t.box([s > 0 ? L - sheet : -L, -W, topZ], [s > 0 ? L : -L + sheet, W, topZ + 19.5]));
    }
    // Top sheet with its rubber mat.
    steel.push(t.box([-L, -W, topZ], [L, W, topZ + sheet]));
    t.add(MAT.mats, t.box([-L + sheet, -W + 2, topZ + sheet], [L - sheet, W - 2, S.height]));
    // Two shelves between the panels, with downturned lip bands along both open sides and rubber mats.
    for (const z of [64, 495]) {
      const sl = S.shelfLength / 2, sd = S.shelfDepth / 2;
      steel.push(t.box([-sl, -sd, z - sheetT], [sl, sd, z]));
      for (const y of [-1, 1]) steel.push(t.box([-sl, y > 0 ? sd - sheetT : -sd, z - 38], [sl, y > 0 ? sd : -sd + sheetT, z]));
      t.add(MAT.mats, t.box([-sl + 4, -sd + 4, z], [sl - 4, sd - 4, z + 1.5]));
      for (const x of [-1, 1]) for (const y of [-1, 1]) t.add(MAT.hardware, t.cylY(y > 0 ? sd : -sd - 2.5, y > 0 ? sd + 2.5 : -sd, x * (sl - 25), z - 19, 11, 14));
    }
    // Separator above the upper shelf, dividing it front and rear.
    steel.push(t.box([-S.shelfLength / 2, -1, 496.5], [S.shelfLength / 2, 1, 496.5 + 127]));
    t.add(MAT.stand, ...steel);
    if (p.load) { const pair = quickLockStandPair(p.load); for (const y of [-92, 92]) quickLockUnit(t, pair, [0, y, S.height]); }
  });
}
export const definitions: PartDefinition[] = [floorDefinition(QUICK_LOCK_DUMBBELL, buildQuickLockDumbbell), floorDefinition(QUICK_LOCK_STAND, buildQuickLockStand)];
