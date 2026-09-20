/** Beyond Power Travel VOLTRA Platform: maple board, grip tape and court print, stainless dock, carry slot, rubber pads, and an
 * optional docked VOLTRA I. Sizes: VOLTRA_PLATFORM in ../floor-parts/floor-accessories.ts; sources in research/floor-accessories.md.
 * Floor axes: X along the 700 mm length, -Y the front (carry-slot) edge, Z up; origin on the floor at the board centre. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import { VOLTRA_PLATFORM, voltraDockY } from '../floor-parts/floor-accessories.ts';
import { accessoryKit, type AccessoryKit, type Pt } from './floor-accessories-kit.ts';

const MAPLE = '#d8b98c', TAPE = '#1b1b1c', PRINT = '#eeeeea', RUBBER = '#161718', STAINLESS = '#b9bec2', DOCK_PAD = '#9da1a4';
const VOLTRA_SHELL = '#d5d8d8', VOLTRA_TRIM = '#a2a8ac';
let font: Font | undefined;
/** Typeset (Helvetiker Bold) text outline centred on the origin with cap height `h`: a stand-in for the wordmark, not the logo. */
function typeset(K: AccessoryKit, str: string, h: number): CrossSection {
  const f = font ??= new FontLoader().parse(helvetiker as never), loops: Pt[][] = [], scale = h / 720; let cursor = 0;
  for (const ch of str) {
    const glyph = (f.data.glyphs as Record<string, { ha: number }>)[ch]; if (!glyph) throw Error(`Missing glyph ${ch}`);
    for (const shape of f.generateShapes(ch, 1000)) for (const path of [shape, ...shape.holes]) loops.push(path.getPoints(3).map(p => [(p.x + cursor) * scale, p.y * scale] as Pt));
    cursor += glyph.ha + 40;
  }
  const cs = K.k(new K.C(loops, 'EvenOdd')), b = cs.bounds();
  return K.k(cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
}
const stadium = (K: AccessoryKit, w: number, h: number) => K.roundRect(w, h, Math.min(w, h) / 2 - .01);
/** A 2D section extruded between z0 and z1. */
const lift = (K: AccessoryKit, cs: CrossSection, z0: number, z1: number) => K.move(K.k(cs.extrude(z1 - z0)), [0, 0, z0]);
/** Rounded-rectangle slab with its top and bottom edges rounded over by `e` (hull of inset slabs on a quarter circle). */
function pillow(K: AccessoryKit, w: number, d: number, r: number, z0: number, z1: number, e: number, x = 0, y = 0) {
  const layers: Manifold[] = [];
  for (const t of [0, 30, 60, 90]) {
    const a = t * Math.PI / 180, o = e * (1 - Math.cos(a)), dz = e * (1 - Math.sin(a));
    layers.push(K.slab(w - 2 * o, d - 2 * o, Math.max(1, r - o), z0 + dz, z1 - dz, x, y, 32));
  }
  return K.hull(layers);
}
/** Line of width `w` from a to b (flat round-capped stroke). */
const stroke = (K: AccessoryKit, a: Pt, b: Pt, w: number) => K.k(K.C.hull([K.k(K.k(K.C.circle(w / 2, 10)).translate(a)), K.k(K.k(K.C.circle(w / 2, 10)).translate(b))]));

/** White half-court printed on the grip tape: baseline, lane with ticks, the free-throw circle round the dock, 3-point line. */
function court(K: AccessoryKit): CrossSection {
  const P = VOLTRA_PLATFORM, w = 4, dockY = voltraDockY(), base = P.width / 2 - P.tapeInset - 12, half = P.length / 2 - P.tapeInset - 12, lane = 75;
  const parts: CrossSection[] = [
    stroke(K, [-half, base], [half, base], w),
    stroke(K, [-lane, base], [-lane, dockY], w), stroke(K, [lane, base], [lane, dockY], w), stroke(K, [-lane, dockY], [lane, dockY], w),
    K.k(K.k(K.C.circle(lane + w / 2, 72)).subtract(K.k(K.C.circle(lane - w / 2, 72)))).translate([0, dockY]),
  ];
  for (const y of [base - 30, base - 55, base - 80]) for (const s of [-1, 1]) parts.push(stroke(K, [s * lane, y], [s * (lane + 12), y], w));
  // 3-point line: straight corner legs from the baseline, then an arc centred near the basket (peak 235 mm from the rear edge).
  const corner = 205, legEnd = 90, peak = P.width / 2 - 235, c = (corner ** 2 + legEnd ** 2 - peak ** 2) / (2 * (legEnd - peak)), r = c - peak;
  for (const s of [-1, 1]) parts.push(stroke(K, [s * corner, base], [s * corner, legEnd], w));
  const arc = K.k(K.k(K.C.circle(r + w / 2, 128)).subtract(K.k(K.C.circle(r - w / 2, 128)))).translate([0, c]);
  parts.push(K.k(arc.intersect(K.k(K.C.square([2 * corner + w, legEnd + 400], false)).translate([-corner - w / 2, legEnd - legEnd - 400]))));
  return K.k(K.C.union(parts));
}

/** Simplified VOLTRA I lying on its back in the dock: housing, seam, carry handle, touchscreen, cable outlet and connector. */
function voltra(K: AccessoryKit, z0: number) {
  const v = VOLTRA_PLATFORM.voltra, y = voltraDockY(), H = 79, zt = z0 + H, cx = -19;
  K.add('VOLTRA I housing', pillow(K, 285, v.width, 22, z0, zt, 12, cx, y), 'source', VOLTRA_SHELL, .25, .35);
  K.add('VOLTRA I rear seam', K.slab(278, v.width - 7, 21, z0 - 2, z0 + .01, cx, y), 'source', VOLTRA_TRIM, .25, .4);
  const handle = K.cut(K.slab(51, 123, 16, z0 + 26, z0 + 52, 136, y), [K.slab(29, 91, 10, z0 + 20, z0 + 58, 136, y)]);
  K.add('VOLTRA I carry handle', handle, 'handle', VOLTRA_SHELL, .2, .4);
  K.add('VOLTRA I touchscreen bezel', K.slab(89, 105, 5, zt, zt + 1.5, -107, y), 'source', '#747d80', .3, .4);
  K.add('VOLTRA I touchscreen', K.slab(81, 97, 3, zt + 1.5, zt + 2.2, -107, y), 'source', '#101a20', .25, .12);
  K.add('VOLTRA I outlet bezel', K.slab(103, 112, 11, zt, zt + 2, 0, y), 'source', '#a2a8ac', .3, .4);
  K.add('VOLTRA I cable outlet', K.cut(K.cyl('z', zt + 2, zt + 9, 21.5, 0, y, 40), [K.cyl('z', zt, zt + 10, 10.5, 0, y, 32)]), 'source', '#e0703a', .2, .45);
  K.add('VOLTRA I cable and boot', K.union([K.cyl('z', zt + 2, zt + 22, 1.5, 0, y, 12), K.cyl('z', zt + 22, zt + 44, 6, 0, y, 20)]), 'liner', '#cfd4d5', 0, .6);
  const eye = K.cut(K.slab(19, 32, 9, 0, 7, 0, 0), [K.slab(9, 20, 4, -1, 8, 0, 0)]);
  K.add('VOLTRA I connector eye', K.move(K.turn(eye, [0, 90, 0]), [3.5, y, zt + 44 + 17]), 'source', '#b2b8be', .85, .2);
}

export function buildTravelPlatform(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (![0, 1].includes(p.voltra)) throw Error('Unsupported platform VOLTRA option.');
  const K = accessoryKit(api), P = VOLTRA_PLATFORM, L = P.length, W = P.width, z0 = P.pad, z1 = P.pad + P.board, zt = z1 + P.tape, dockY = voltraDockY();
  return K.run('travel platform', () => {
    const slotY = -W / 2 + P.slot.inset + P.slot.h / 2, slot = K.k(stadium(K, P.slot.w, P.slot.h).translate([0, slotY]));
    // Laminated maple board with rounded-over edges (hull of inset slabs on a quarter circle) and the carry slot.
    K.add('Maple board', K.cut(pillow(K, L, W, P.corner, z0, z1, P.edge), [lift(K, slot, z0 - 1, z1 + 1)]), 'source', MAPLE, 0, .55);
    // Grip tape inset from the edge, notched round the slot out to the front edge; the printed court flush on top.
    const notch = K.k(K.roundRect(P.slot.w + 16, P.slot.h + P.slot.inset + 24, 12).translate([0, slotY - P.slot.inset / 2 - 4]));
    const tape = K.k(K.roundRect(L - 2 * P.tapeInset, W - 2 * P.tapeInset, P.corner - P.tapeInset).subtract(notch));
    const print = K.k(court(K).intersect(tape));
    const logo = K.k(K.C.union([K.k(typeset(K, 'Beyond', 15).translate([0, 10])), K.k(typeset(K, 'Power', 15).translate([-2, -10]))]));
    const mark = K.k(logo.translate([-L / 2 + 34 + 39, -W / 2 + 32 + 18]));
    const ink = K.k(K.C.union([print, mark]));
    K.add('Black grip tape', lift(K, K.k(tape.subtract(ink)), z1 - .01, zt), 'liner', TAPE, 0, .95);
    K.add('White court print', lift(K, ink, z1 - .01, zt + .02), 'source', PRINT, 0, .7);
    // Stainless dock: ring with a rounded top edge and four base notches, grey pad inside.
    const d = P.dock, R = d.d / 2, top = zt + d.rise;
    const ring = K.cut(K.hull([K.cyl('z', zt - .5, top - 2.5, R, 0, dockY, 64), K.cyl('z', zt - .5, top, R - 2.5, 0, dockY, 64)]), [
      K.cyl('z', zt + 2, top + 1, d.bore / 2, 0, dockY, 64),
      ...[45, 135, 225, 315].map(a => K.move(K.turn(K.box([R - 8, -7, zt - 1], [R + 2, 7, zt + 5]), [0, 0, a]), [0, dockY, 0])),
    ]);
    K.add('Stainless VOLTRA dock', ring, 'source', STAINLESS, .85, .25);
    K.add('Dock floor pad', K.cyl('z', zt + 1.9, zt + 3, d.bore / 2 - .2, 0, dockY, 64), 'liner', DOCK_PAD, 0, .7);
    // Underside: four lengthwise rubber strips and the oval pad over the dock's backing plate.
    const s = P.strips, pads: Manifold[] = [];
    for (const x of [-s.x, s.x]) for (const y of [-s.y, s.y]) pads.push(lift(K, K.k(stadium(K, s.l, s.w).translate([x, y])), 0, z0 + .01));
    pads.push(lift(K, K.k(K.k(K.C.circle(.5, 48)).scale([P.centrePad[0], P.centrePad[1]]).translate([0, dockY])), 0, z0 + .01));
    K.add('Rubber pads', K.union(pads), 'liner', RUBBER, 0, .9);
    if (p.voltra) voltra(K, top - 1);
  });
}
