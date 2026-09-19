/** Adjustable dumbbells family: NÜOBELL twist-handle builder. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { DUMBBELL_LIFT } from '../floor-parts/adjustable-dumbbells-common.ts';
import { NUOBELL as N, NUOBELL_COLORWAYS, NUOBELL_DUMBBELL, NUOBELL_SETS, nuobellCradleLength, nuobellDiscs, nuobellLength, nuobellSelection, nuobellWeights } from '../floor-parts/adjustable-dumbbells-nuobell.ts';
import { dumbbellKit, type Mat, type Pt } from './adjustable-dumbbells-kit.ts';
/** Disc bottom and axis heights when seated in the cradle. */
export const NUOBELL_BOTTOM = N.clearance, NUOBELL_AXIS = N.clearance + N.height - N.disc / 2;
export function buildNuobell(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(NUOBELL_SETS as readonly number[]).includes(p.set) || !nuobellWeights(p.set).includes(p.weight) || !NUOBELL_COLORWAYS[p.colorway] || ![0, 1].includes(p.pose)) throw Error('Unsupported dumbbell setting.');
  const t = dumbbellKit(api), [, discColor] = NUOBELL_COLORWAYS[p.colorway], allBlack = p.colorway === NUOBELL_COLORWAYS.length - 1;
  const M = {
    carried: ['Selected discs · lifted with handle', 'source', discColor, .35, .5],
    head: ['Handset head plates', 'source', discColor, .35, .5],
    resting: ['Discs left in cradle', 'source', discColor, .35, .5],
    comb: ['Interlocking comb tabs and end tongue', 'source', '#121314', .2, .55],
    hub: ['Twist hubs and cones', 'source', '#111213', .25, .45],
    window: ['Weight window and ± marks', 'source', '#e9e9e6', 0, .5],
    grip: [allBlack ? 'Black knurled grip' : 'Knurled aluminium grip', 'handle', allBlack ? '#1d1e20' : '#c4c6c8', allBlack ? .4 : .8, .38],
    screw: ['Chrome end screws', 'fastener', '#d6d9dc', 1, .18],
    saddles: ['Cradle end saddles and clips', 'liner', '#151516', 0, .75],
    rails: ['Aluminium cradle rails', 'source', '#d0d2d4', .85, .25],
    etch: ['Engraved rail marking', 'source', '#6d7073', .5, .5],
  } as const satisfies Record<string, Mat>;
  const count = nuobellDiscs(p.set), n = nuobellSelection(p.weight), L = nuobellLength(p.set), half = L / 2, lift = p.pose ? 0 : DUMBBELL_LIFT;
  const cz = NUOBELL_AXIS, r = N.disc / 2, top = N.clearance + N.height, head0 = N.grip / 2 + N.hub - 30, disc0 = N.grip / 2 + N.hub;
  return t.finish('NÜOBELL', () => {
    /** Flat-bottomed Ø193 disc outline in (Y, Z), optionally grown by `grow`. */
    const tr = (cs: CrossSection, x: number, y: number) => t.k(cs.translate([x, y])), sub = (a: CrossSection, b: CrossSection) => t.k(a.subtract(b)), int = (a: CrossSection, b: CrossSection) => t.k(a.intersect(b));
    const outline = (grow = 0) => int(tr(t.circle(2 * (r + grow), 72), 0, cz), tr(t.k(t.C.square([2 * r + 2 * grow + 2, N.height + 2 * grow], true)), 0, N.clearance + N.height / 2 - grow));
    const disc = outline(), capBox = (drop: number) => tr(t.k(t.C.square([62, drop], true)), 0, top - drop / 2);
    const up = (s: Manifold) => lift ? t.move(s, [0, 0, lift]) : s;
    // Grip with fine rings for the knurl (built once, centred), hubs and cones mirrored to both ends.
    t.add(M.grip, up(t.cylX(-N.grip / 2 - 2, N.grip / 2 + 2, 0, cz, N.gripD, 40)));
    for (let x = -N.grip / 2 + 5; x < N.grip / 2 - 5; x += 3.5) t.add(M.grip, up(t.cylX(x, x + 1.2, 0, cz, N.gripD + .9, 40)));
    t.both(M.hub, up(t.lathe([[0, N.grip / 2 - 1], [18, N.grip / 2 - 1], [20.5, N.grip / 2 + 2], [39, N.grip / 2 + 20], [39, head0 + 2], [0, head0 + 2]], 0, cz, 56)));
    // Weight window on top of the hub, flanked by − and + marks (twist toward + for weight).
    t.both(M.window, up(t.box([N.grip / 2 + 23, -8, cz + 37.4], [N.grip / 2 + 39, 8, cz + 39.4])));
    const mx = N.grip / 2 + 31;
    t.both(M.window, ...[t.box([mx - 2, -14.2, cz + 35.3], [mx + 2, -12.8, cz + 37.2]), t.box([mx - 2, 12.8, cz + 35.3], [mx + 2, 14.2, cz + 37.2]), t.box([mx - .7, 11.5, cz + 35.3], [mx + .7, 15.5, cz + 37.2])].map(up));
    // Head plate (part of the handset): 30 mm disc with four trapezoid windows in its inner face showing the black hub spider.
    const win = (a: number) => tr(t.k(t.poly([[-13, 44], [13, 44], [22, 80], [-22, 80]] as Pt[]).rotate(a)), 0, cz);
    const windows = [45, 135, 225, 315].map(a => t.extrudeX(win(a), head0 - 1, 9));
    t.both(M.head, up(t.cut(t.extrudeX(disc, head0, 30 - .3), windows)));
    t.both(M.hub, ...[45, 135, 225, 315].map(a => up(t.extrudeX(win(a), head0 + 6, 2))));
    // 2.5 lb discs, inside out: the rod picks up the inner `n`; the rest stay seated against the outer saddle.
    for (let i = 0; i < count; i++) {
      // The outer end disc is thinner so its raised tongue and screw head finish at the published length.
      const x0 = disc0 + i * N.pitch, thick = i === count - 1 ? N.pitch - 1.7 : N.pitch - .6, carried = i < n, place = (s: Manifold) => carried ? up(s) : s, last = i === count - 1;
      const drop = i % 2 ? 44 : 38, body = sub(disc, capBox(drop)), cap = int(disc, capBox(drop));
      let plate = t.extrudeX(body, x0, thick);
      if (last) plate = t.cut(plate, [t.box([x0 - 1, -22.5, N.clearance - 1], [x0 + thick + 1, 22.5, N.clearance + 12])]);
      t.both(carried ? M.carried : M.resting, place(plate));
      // Comb tabs overlap the next disc's slot so the band reads continuous, with alternating notches along the top.
      const notch = t.box([x0 - 1, i % 2 ? 14 : -22, top - 5], [x0 + thick + 1, i % 2 ? 22 : -14, top + 1]);
      t.both(M.comb, place(t.cut(t.extrudeX(cap, x0, last ? thick : N.pitch + .2), [notch])));
      if (last) {
        // Outer face: raised rounded tongue from the top edge and the chrome centre screw.
        const tongue = int(tr(t.rrect(54, 92, 20), 0, top - 26), outline(-1));
        t.both(M.comb, place(t.extrudeX(tongue, x0 + thick - .2, 1.9)));
        t.both(M.screw, place(t.cylX(x0 + thick - .2, x0 + thick + 1.7, 0, cz, 13, 24)));
      }
    }
    // Cradle (photos r02, n02): two low curved end saddles hugging the underside of each bell, two fat floor-level
    // aluminium tubes, and short U-clips round the tubes at the inner face of each bell. Nothing rises above the bell's lower third.
    const Lc = nuobellCradleLength(p.set), sx = half + N.saddleGap, W = N.cradleWidth / 2, railY = 85, railD = 30, clipH = 64;
    const band = (z0: number, z1: number, w = 2 * W) => tr(t.k(t.C.square([w, z1 - z0], true)), 0, (z0 + z1) / 2);
    const saddleCs = sub(t.k(t.C.hull([band(0, 1), tr(t.circle(40, 32), W - 20, N.saddleHeight - 20), tr(t.circle(40, 32), -W + 20, N.saddleHeight - 20)])), outline(1.5));
    // Ribbed outer face: a shallow pocket split by one vertical and one horizontal rib.
    const ribs = [t.cut(t.box([sx + N.saddle - 4, -W + 14, 6], [sx + N.saddle + 1, W - 14, 40]), [t.box([sx + N.saddle - 5, -2, 0], [sx + N.saddle + 2, 2, 50]), t.box([sx + N.saddle - 5, -W, 21], [sx + N.saddle + 2, W, 25])])];
    t.both(M.saddles, t.cut(t.extrudeX(saddleCs, sx, N.saddle), [...ribs, ...[-1, 1].map(s => t.cylZ(-1, 7, sx + N.saddle / 2, s * (W - 10), 7, 16))]));
    // Curved cradle pad running in under the outer discs, following the disc profile up to the tubes.
    t.both(M.saddles, t.extrudeX(sub(band(0, 38), outline(1)), sx - 58, 58.5));
    for (const s of [-1, 1]) t.add(M.rails, t.cylX(-Lc / 2, Lc / 2, s * railY, railD / 2, railD, 40));
    t.add(M.etch, t.box([-38, -railY - railD / 2 - .35, 11], [38, -railY - railD / 2 + .45, 19]));
    const clip = (sy: number) => int(sub(tr(t.rrect(40, clipH + 12, 9), sy * railY, (clipH - 12) / 2), outline(1)), band(0, clipH));
    t.both(M.saddles, ...[-1, 1].map(sy => t.extrudeX(clip(sy), disc0 - 6, 12)));
  });
}
export const definitions: PartDefinition[] = [floorDefinition(NUOBELL_DUMBBELL, buildNuobell)];
