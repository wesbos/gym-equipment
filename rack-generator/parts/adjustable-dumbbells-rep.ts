/** Adjustable dumbbells family: REP QuickDraw builder. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { DUMBBELL_LIFT } from '../floor-parts/adjustable-dumbbells-common.ts';
import { QUICKDRAW as Q, QUICKDRAW_SETS, REP_QUICKDRAW, quickDrawPlates, quickDrawSelection, quickDrawWeights } from '../floor-parts/adjustable-dumbbells-rep.ts';
import { dumbbellKit, type Mat, type Pt } from './adjustable-dumbbells-kit.ts';
const MAT = {
  locked: ['Locked plates · lifted with handle', 'source', '#1c1d1f', .1, .7],
  unlocked: ['Unlocked plates left in cradle', 'source', '#1c1d1f', .1, .7],
  head: ['Handle headplates and support rods', 'source', '#1e1f21', .15, .65],
  micro: ['2.5 lb micro plates', 'source', '#222325', .1, .7],
  grip: ['Nickel-plated volcano-knurled grip', 'handle', '#8e9195', .85, .4],
  switches: ['Red Lock-N-Load slider switches', 'source', '#ee3a2b', 0, .5],
  white: ['White lock icons, REP logo and caution labels', 'source', '#f2f2f2', 0, .6],
  screws: ['Chrome socket screws', 'fastener', '#c8cbcf', 1, .2],
  tongue: ['Steel latch tongues', 'source', '#b9bbbd', .8, .35],
  cradle: ['Molded cradle saddles, clips and spacers', 'source', '#141516', 0, .85],
  rubber: ['Rubber-sleeved cradle tubes', 'liner', '#19191a', 0, .9],
  steel: ['Black steel cradle tubes', 'source', '#232427', .5, .45],
} as const satisfies Record<string, Mat>;
/** Plate centre height when racked: the 185 mm disc tops out at the published 201 mm racked height. */
export const QD_CENTER = Q.rackedHeight - Q.plate / 2;
const FLAT = QD_CENTER - Q.plate / 2 + Q.flat, R = Q.plate / 2;
/** Inner face of plate i (0 = innermost) along +X; the headplate spans [grip/2, grip/2 + head]. */
export const qdPlateX = (i: number) => Q.grip / 2 + Q.head + i * Q.pitch;
/** Saddles fill the 26.5 mm between the 60 lb set's outer plate and the cradle end. */
const SADDLE_X = qdPlateX(Q.maxPlates), END = Q.cradleLength / 2;
const TUBE_Y = 70, TUBE_Z = QD_CENTER - Math.sqrt(R * R - TUBE_Y * TUBE_Y) - 19;
/** Rack ends: 5 − N spacers per side fill the fixed cradle on smaller sets. */
export function buildQuickDraw(api: ManifoldAPI, p: NumericParams) {
  if (!(QUICKDRAW_SETS as readonly number[]).includes(p.set) || !quickDrawWeights(p.set).includes(p.weight) || ![0, 1].includes(p.pose)) throw Error('Unsupported dumbbell setting.');
  const t = dumbbellKit(api), { C, k } = t, N = quickDrawPlates(p.set), { plates, micro } = quickDrawSelection(p.weight), lift = p.pose === 0 ? DUMBBELL_LIFT : 0;
  return t.finish('REP QuickDraw', () => {
    const put = (mat: Mat, lifted: boolean, ...s: Manifold[]) => t.both(mat, ...s.map(m => lifted && lift ? t.move(m, [0, 0, lift]) : m));
    const sq = (min: Pt, max: Pt) => k(k(C.square([max[0] - min[0], max[1] - min[1]])).translate(min));
    /** Flat-bottom Ø185 disc in (y, z), optionally clipped below `topZ`. */
    const disc = (topZ = Q.rackedHeight + 1): CrossSection => k(k(k(C.circle(R, 72)).translate([0, QD_CENTER])).intersect(sq([-R - 1, FLAT], [R + 1, topZ])));
    const plateT = Q.pitch - Q.groove;
    // ---- Selector plates: tooth notch on top, switch facet on the front rim, outer-face strip.
    for (let i = 0; i < N; i++) {
      const x0 = qdPlateX(i), xm = x0 + plateT / 2, locked = i < plates, mat = locked ? MAT.locked : MAT.unlocked, lifted = locked;
      const body = t.cut(t.extrudeX(disc(), x0, plateT), [
        t.box([xm, -9, Q.rackedHeight - 5], [x0 + plateT + 1, 9, Q.rackedHeight + 2]),
        t.box([x0 - 1, -R - 2, QD_CENTER - 28], [x0 + plateT + 1, -R + 4.5, QD_CENTER + 28]),
        t.box([xm - 7, -R + 4, QD_CENTER - 22], [xm + 7, -R + 9.5, QD_CENTER + 22]),
      ]);
      put(mat, lifted, body);
      // Outer-face strip: tapered nylon strip (sits in the 1.5 mm groove), two socket screws and the latch tongue.
      const xs = x0 + plateT, stripT = Q.groove - .1;
      put(mat, lifted, t.extrudeX(t.poly([[-27.5, 192], [-11, 84], [11, 84], [27.5, 192]]), xs, stripT));
      put(MAT.screws, lifted, ...[-13, 13].map(y => t.cylX(xs, xs + stripT, y, 180, 10, 16)));
      put(MAT.tongue, lifted, t.box([xs, -7.5, 70], [xs + stripT, 7.5, 90]));
      // Slider switch: tab down toward the closed padlock = locked; icons above (open) and below (closed).
      const tz = QD_CENTER + (locked ? -10 : 10);
      put(MAT.switches, lifted, t.box([xm - 6, -R - 2.5, tz - 6], [xm + 6, -R + 6, tz + 6]));
      for (const dz of [34, -34]) {
        const ry = -Math.sqrt(R * R - dz * dz);
        put(MAT.white, lifted, t.box([xm - 4, ry - 1, QD_CENTER + dz - 4], [xm + 4, ry + 1.2, QD_CENTER + dz + 4]));
      }
    }
    // ---- Spacer blocks: low arched molded blocks (top ≈ 147 mm) against each saddle on the smaller sets.
    const spacer = k(k(k(C.circle(85, 64)).translate([0, 62])).intersect(sq([-R, FLAT], [R, Q.plate])));
    for (let j = N; j < Q.maxPlates; j++) put(MAT.cradle, false, t.extrudeX(spacer, qdPlateX(j), plateT));
    // ---- Handle: headplates, grip, micro plates, support rods, headplate hardware.
    const g = Q.grip / 2, head = t.extrudeX(disc(), g, Q.head);
    // Two low black support rods tie the headplates under the grip (GGR: "two steel support rods").
    put(MAT.head, true, head, t.cylX(0, g + 4, 60, 60, 19, 24), t.cylX(0, g + 4, -60, 60, 19, 24));
    put(MAT.head, true, t.box([g - 12, -18, QD_CENTER], [g, 18, QD_CENTER + 45]));
    put(MAT.screws, true, ...[-13, 13].map(y => t.cylX(g - 1.2, g, y, 186, 10, 16)));
    put(MAT.switches, true, t.boxC([10, 8, 10], [g + Q.head / 2, -Math.sqrt(R * R - 60 * 60) - 1, QD_CENTER + 60]));
    // Knurled grip: core plus raised rings for the volcano pattern; ends seat into the headplates.
    put(MAT.grip, true, t.cylX(0, g + 4, 0, QD_CENTER, Q.gripDiameter - 1, 40));
    for (let x = 3; x < g - 3; x += 3.5) put(MAT.grip, true, t.cylX(x, x + 1.4, 0, QD_CENTER, Q.gripDiameter, 40));
    if (micro) {
      // 2.5 lb micro plate against each headplate: inverted-U slot around the grip, finger slot, caution label.
      const mx = g - Q.micro, uSlot = k(t.rrect(40, 2 * (QD_CENTER + 50 - FLAT), 20).translate([0, FLAT]));
      const cs = k(k(disc().subtract(uSlot)).subtract(k(t.rrect(38, 16, 8).translate([0, 170]))));
      put(MAT.micro, true, t.extrudeX(cs, mx, Q.micro));
      put(MAT.white, true, t.box([mx - .4, 24, 140], [mx, 64, 168]));
    }
    // ---- Cradle: two saddles with tunnels and white REP logos, rubber-sleeved tubes, bare tubes under the grip, clips.
    const saddle = k(k(k(t.rrect(Q.cradleWidth, 2 * Q.cradleHeight, 100, 32).intersect(sq([-120, 0], [120, 130]))).subtract(t.rrect(115, 90, 40))).subtract(sq([-15, Q.cradleHeight - 14], [15, Q.cradleHeight + 1])));
    const letters = repLetters(t, END);
    t.add(MAT.cradle, t.cut(t.extrudeX(saddle, SADDLE_X, END - SADDLE_X), letters.map(l => t.move(l, [.6, 0, 0]))));
    t.add(MAT.cradle, t.cut(t.mirrorX(t.extrudeX(saddle, SADDLE_X, END - SADDLE_X)), repLetters(t, END, -1).map(l => t.mirrorX(t.move(l, [.6, 0, 0])))));
    t.add(MAT.white, ...letters, ...repLetters(t, END, -1).map(t.mirrorX));
    for (const y of [-TUBE_Y, TUBE_Y]) {
      t.add(MAT.steel, t.cylX(-g, g, y, TUBE_Z, 25, 28));
      put(MAT.rubber, false, t.cylX(g - 4, SADDLE_X + 10, y, TUBE_Z, 38, 32));
      for (let j = 0; j <= Q.maxPlates; j++) put(MAT.rubber, false, t.cylX(qdPlateX(j) - .8, qdPlateX(j) + .8, y, TUBE_Z, 39.5, 32));
      put(MAT.cradle, false, t.box([g - 26, y - 20, 6], [g - 4, y + 20, TUBE_Z + 19 + 2]));
    }
  });
}
/** Block "REP" letters on a saddle's outer face (x = xFace), reading left to right from outside that end. */
function repLetters(t: ReturnType<typeof dumbbellKit>, xFace: number, side = 1): Manifold[] {
  const h = 32, w = 26, s = 8, z0 = 50, depth = 1.2, out: Manifold[] = [];
  const bar = (u0: number, v0: number, u1: number, v1: number) => out.push(t.box([xFace - depth, side * (side > 0 ? u0 : u1), z0 + v0], [xFace - .2, side * (side > 0 ? u1 : u0), z0 + v1]));
  const letter = (u: number, kind: 'R' | 'E' | 'P') => {
    bar(u, 0, u + s, h);
    bar(u, h - s, u + w, h);
    bar(u, h / 2 - s / 2 + 2, u + w, h / 2 + s / 2 + 2);
    if (kind === 'E') bar(u, 0, u + w, s);
    else bar(u + w - s, h / 2 - s / 2 + 2, u + w, h);
    if (kind === 'R') { const leg: Vec3[] = [[xFace - depth, 0, 0], [xFace - .2, 0, 0]]; out.push(t.hull([...leg.map(([x]) => [x, side * (u + w / 2 - 3), z0 + h / 2 - 2] as Vec3), ...leg.map(([x]) => [x, side * (u + w / 2 + 5), z0 + h / 2 - 2] as Vec3), ...leg.map(([x]) => [x, side * (u + w - s), z0] as Vec3), ...leg.map(([x]) => [x, side * (u + w), z0] as Vec3)])); }
  };
  letter(-45, 'R'); letter(-13, 'E'); letter(19, 'P');
  return out;
}
export const definitions: PartDefinition[] = [floorDefinition(REP_QUICKDRAW, buildQuickDraw)];
