/** Adjustable dumbbells family: MX Select EVO MX100 builder. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { DUMBBELL_LIFT } from '../floor-parts/adjustable-dumbbells-common.ts';
import { MX100 as X, MX100_DUMBBELL, mx100Selection, mx100Weights } from '../floor-parts/adjustable-dumbbells-mx-select.ts';
import { dumbbellKit, type Mat, type Pt } from './adjustable-dumbbells-kit.ts';
/** Grip axis height when racked: the plate centre bore sits 96 mm above the plate foot (dimension drawing, estimated). */
export const MX100_AXIS = X.plateBottom + 96;
/** Handset head: Ø152 drum with flats top and bottom (122 mm tall), from the grip end out to the first plate. */
export const MX100_HEAD = { d: 152, flat: 61 } as const;
export function buildMx100(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!mx100Weights().includes(p.weight) || ![0, 1].includes(p.grip) || ![0, 1].includes(p.pose)) throw Error('Unsupported dumbbell setting.');
  const t = dumbbellKit(api), n = mx100Selection(p.weight), lift = p.pose ? 0 : DUMBBELL_LIFT, cz = MX100_AXIS;
  const M = {
    carried: ['Selected plates · lifted with handset', 'source', '#1c1d1f', .3, .6],
    resting: ['Plates left in cradle', 'source', '#1c1d1f', .3, .6],
    head: ['Steel and ABS handset heads', 'source', '#18191b', .25, .5],
    grip: p.grip ? ['Contoured rubber grip', 'handle', '#141516', 0, .85] : ['Knurled steel grip', 'handle', '#a3a6aa', .85, .38],
    dial: ['Knurled selector dials', 'fastener', '#c5c8cb', .9, .3],
    face: ['Dial faces', 'source', '#e7e7e3', 0, .5],
    mark: ['Dial index and release buttons', 'source', '#111111', .1, .5],
    yellow: ['Yellow pointers and legend border', 'source', '#f2d20f', 0, .5],
    cradle: ['Polyamide nylon cradle', 'source', '#161718', .05, .8],
    legend: ['Weight legend decal', 'source', '#0f0f10', 0, .6],
    red: ['Caution strip', 'source', '#d6262b', 0, .5],
    white: ['Decal lettering', 'source', '#f2f2f2', 0, .5],
  } as const satisfies Record<string, Mat>;
  return t.finish('MX100', () => {
    const tr = (cs: CrossSection, x: number, y: number) => t.k(cs.translate([x, y]));
    const up = (s: Manifold) => lift ? t.move(s, [0, 0, lift]) : s;
    const w = X.plateW / 2, top = X.plateBottom + X.plateH;
    /** Plate face (Y, Z): 202 × 182, big top radii, tight bottom radii and a flat foot. */
    const plate = t.k(t.C.hull([[-1, 1].map(s => tr(t.circle(96, 48), s * (w - 48), top - 48)), [-1, 1].map(s => tr(t.circle(28, 24), s * (w - 14), X.plateBottom + 14))].flat()));
    const g = X.grip / 2, h0 = g, h1 = g + X.head;
    // Grip: knurled steel with fine rings, or the contoured rubber sleeve.
    if (p.grip) t.add(M.grip, up(t.lathe([[0, -g - 1], [16, -g - 1], [18, -g * .45], [18, g * .45], [16, g + 1], [0, g + 1]] as Pt[], 0, cz, 40)));
    else { t.add(M.grip, up(t.cylX(-g - 1, g + 1, 0, cz, X.gripD, 36))); for (let x = -g + 6; x < g - 6; x += 3.5) t.add(M.grip, up(t.cylX(x, x + 1.2, 0, cz, X.gripD + .8, 36))); }
    // Handset heads: chamfered drum with flats, inner-face recesses, top dial and front release button.
    const R = MX100_HEAD.d / 2, flat = MX100_HEAD.flat, mid = (h0 + h1) / 2;
    const drum = t.inter([t.lathe([[0, h0 + .5], [R - 3, h0 + .5], [R, h0 + 3], [R, h1 - 1.5], [R - 1.5, h1], [0, h1]] as Pt[], 0, cz, 64), t.box([h0, -R - 1, cz - flat], [h1 + 1, R + 1, cz + flat])]);
    const recesses = [45, 135, 225, 315].map(a => t.cylX(h0, h0 + 3, 45 * Math.cos(a * Math.PI / 180), cz + 45 * Math.sin(a * Math.PI / 180), 17, 24));
    t.both(M.head, up(t.cut(drum, recesses)), up(t.cylX(h0 - 2.5, h0 + 1, 0, cz, 38, 32)));
    const dialTop = cz + flat + 10;
    t.both(M.dial, up(t.cut(t.cylZ(cz + flat - .5, dialTop, mid, 0, 36, 40), Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI / 10; return t.boxC([2.2, 1.4, 9], [mid + 18 * Math.cos(a), 18 * Math.sin(a), dialTop - 5]); }))));
    t.both(M.face, up(t.cylZ(dialTop - .4, dialTop + .6, mid, 0, 29, 40)));
    // Index line on the dial face turns 36° per setting; the yellow pointer on the head marks the selected number.
    t.both(M.mark, up(t.move(t.rot(t.boxC([12, 1.6, .6], [6, 0, 0]), [0, 0, 90 + n * 36]), [mid, 0, dialTop + .7])));
    t.both(M.yellow, up(t.cylZ(dialTop + .5, dialTop + .9, mid, 0, 8, 20)), up(t.extrudeZ(t.poly([[0, -3.5], [0, 3.5], [-6, 0]] as Pt[]), cz + flat - .2, .8, mid + 27, 0)));
    t.both(M.mark, up(t.cylY(-R - 3, -R + 6, mid, cz - 20, 16, 24, 10)));
    // 5 lb plates, inside out from the head face; the stepped notch on top shifts one station per plate.
    for (let i = 0; i < X.plates; i++) {
      const x0 = h1 + i * X.pitch, notch = t.boxC([X.pitch + 1, 10, 6], [x0 + X.pitch / 2, -45 + i * 10, top]);
      const s = t.cut(t.extrudeX(plate, x0, i === X.plates - 1 ? X.pitch : X.pitch - .55), [notch]);
      t.both(i < n ? M.carried : M.resting, i < n ? up(s) : s);
    }
    // Cradle: D-shaped end walls, shallow plate pockets with thin walls, lower centre deck with the weight legend.
    const L = X.cradleLength / 2, W = X.cradleWidth / 2, wall0 = h1 + X.plates * X.pitch + 1.5, deck = 12, rim = X.plateBottom + 16;
    const D = t.k(t.k(t.C.hull([tr(t.circle(2 * W, 72), 0, 19), tr(t.k(t.C.square([2 * W, 1], true)), 0, .5)])).intersect(tr(t.k(t.C.square([2 * W + 2, 130], true)), 0, 65)));
    const decal = t.box([L - .6, -28, 48], [L + 1, 28, 68]);
    // Accessory slots either side of the decal take the magnetic add-on plate holders.
    const slots = [-1, 1].map(s => t.box([L - 8, s * 70 - 2.5, 16], [L + 1, s * 70 + 2.5, 58]));
    t.both(M.cradle, t.cut(t.extrudeX(D, wall0, L - wall0), [decal, ...slots]));
    // MX100 decal: recessed white label, black lettering blocks and the yellow X slash, flush with the wall face.
    t.both(M.white, t.box([L - .6, -28, 48], [L - .3, 28, 68]));
    t.both(M.mark, t.box([L - .3, -25, 51], [L, -7, 65]), t.box([L - .3, 7, 51], [L, 25, 65]));
    t.both(M.yellow, t.move(t.rot(t.boxC([.3, 7, 13], [0, 0, 0]), [22, 0, 0]), [L - .15, 0, 58]));
    const p0 = h1 - 9;
    t.both(M.cradle, t.box([p0, -W, 0], [wall0, W, X.plateBottom]), ...[-1, 1].map(s => t.box([p0, s > 0 ? W - 2.2 : -W, X.plateBottom - 1], [wall0, s > 0 ? W : -W + 2.2, rim])), t.box([p0, -W, X.plateBottom - 1], [p0 + 5, W, rim]));
    t.add(M.cradle, t.cut(t.box([-p0 - .1, -90, 0], [p0 + .1, 90, deck]), [-1, 1].flatMap(sx => [-1, 1].map(sy => t.cylZ(-1, deck + 1, sx * (p0 - 14), sy * 70, 6, 16)))));
    t.add(M.yellow, t.extrudeZ(t.rrect(110, 95, 9), deck, .5));
    t.add(M.legend, t.extrudeZ(t.rrect(102, 87, 6), deck + .5, .3));
    t.add(M.red, t.box([-12, 18, deck + .8], [14, 28, deck + 1]));
    t.add(M.white, ...Array.from({ length: 6 }, (_, i) => t.box([-44 + i * 16, -36, deck + .8], [-43 + i * 16, 14, deck + .95])), t.box([-46, 18, deck + .8], [-18, 36, deck + .95]));
  });
}
export const definitions: PartDefinition[] = [floorDefinition(MX100_DUMBBELL, buildMx100)];
