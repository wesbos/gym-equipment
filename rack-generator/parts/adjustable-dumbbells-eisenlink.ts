/** Adjustable dumbbells family: Eisenlink Adjustable Square Dumbbell builder. */
import type { CrossSection, ManifoldAPI, NumericParams, PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { EISENLINK as E, EISENLINK_SETS, EISENLINK_SQUARE, eisenlinkSelection, eisenlinkWeights } from '../floor-parts/adjustable-dumbbells-eisenlink.ts';
import { dumbbellKit, type Mat, type Pt } from './adjustable-dumbbells-kit.ts';
const MAT = {
  ends: ['Handle end plates (fixed 10 lb handle)', 'source', '#1b1c1e', .15, .75],
  plates: ['5 lb plates · black powder-coated steel', 'source', '#1b1c1e', .15, .75],
  small: ['2.5 lb windowed plates', 'source', '#1d1e20', .15, .75],
  grip: ['Black knurled handle', 'handle', '#2a2b2d', .35, .7],
  pins: ['Stainless locating pins', 'fastener', '#c9ccce', .9, .3],
  screws: ['Chrome locking screws', 'source', '#e3e5e8', 1, .12],
  logo: ['Etched Eisenlink logo', 'source', '#8a8d90', .6, .5],
} as const satisfies Record<string, Mat>;
/** Handle axis height: the 183 mm square plates stand on the floor. */
export const EISENLINK_AXIS = E.plate / 2;
const Z = EISENLINK_AXIS, PIN_Y = 66, PIN_TOP = Z + 62, PIN_MID = Z - 5, FINGER = E.plate - 30;
export function buildEisenlink(api: ManifoldAPI, p: NumericParams) {
  if (!(EISENLINK_SETS as readonly number[]).includes(p.set) || !eisenlinkWeights(p.set).includes(p.weight)) throw Error('Unsupported dumbbell setting.');
  const t = dumbbellKit(api), { C, k } = t, { screws, plates, small } = eisenlinkSelection(p.weight);
  return t.finish('Eisenlink', () => {
    const sq = (min: Pt, max: Pt) => k(k(C.square([max[0] - min[0], max[1] - min[1]])).translate(min));
    const square = () => k(t.rrect(E.plate, E.plate, E.corner, 12).translate([0, Z]));
    const finger = () => k(t.rrect(55, 17, 8.5, 12).translate([0, FINGER]));
    /** U-slot from the bottom edge up past the axis so a plate slides down over the loosened screw shank. */
    const uSlot = (w: number, top: number) => k(sq([-w / 2, -5], [w / 2, top]).add(k(t.circle(w, 32).translate([0, top]))));
    /** Square plate slab with 0.8 mm eased edges (so the stack reads as separate plates), minus through-cut holes. */
    const slab = (x0: number, th: number, ...holes: CrossSection[]) => {
      const b = .8, body = t.hull([t.extrudeX(square(), x0 + b, th - 2 * b), t.extrudeX(k(t.rrect(E.plate - 2 * b, E.plate - 2 * b, E.corner - b, 12).translate([0, Z])), x0, th)]);
      return t.cut(body, holes.map(h => t.extrudeX(h, x0 - 1, th + 2)));
    };
    // Fixed end plates (part of the 10 lb handle): finger slot, two pin sockets, threaded centre bore.
    const g = E.grip / 2;
    let x = g;
    const endPlate = t.cut(slab(x, E.endT, finger()), [
      ...[-PIN_Y, PIN_Y].map(y => t.cylX(x + E.endT - 3, x + E.endT + 1, y, PIN_TOP, 9, 16)), t.cylX(x + E.endT - 8, x + E.endT + 1, 0, Z, 22, 24)]);
    t.both(MAT.ends, endPlate);
    x += E.endT;
    // 5 lb plates: U-slot, finger slot, four stainless pins on the outer face locate into the next plate.
    for (let i = 0; i < plates; i++, x += E.plateT) {
      t.both(MAT.plates, slab(x, E.plateT, finger(), uSlot(34, Z)));
      t.both(MAT.pins, ...[PIN_TOP, PIN_MID].flatMap(z => [-PIN_Y, PIN_Y].map(y => t.cylX(x + E.plateT - .5, x + E.plateT + 3, y, z, 10, 16))));
    }
    // 2.5 lb plate: big window around the screw head, U-slot and finger slot, two top pins.
    if (small) {
      t.both(MAT.small, slab(x, E.plateT, finger(), uSlot(40, Z - 40), k(t.rrect(124, 112, 12, 12).translate([0, Z - 6]))));
      t.both(MAT.pins, ...[-PIN_Y, PIN_Y].map(y => t.cylX(x + E.plateT - .5, x + E.plateT + 3, y, PIN_TOP, 10, 16)));
      x += E.plateT;
    }
    // Chrome locking screw: knurled Ø94 head (sinks into the 2.5 lb window) on a coarse Ø20 shank into the handle.
    if (screws) {
      const h0 = x - (small ? E.recess : 0), h1 = h0 + E.headT;
      const head = t.hull([t.cylX(h0, h1 - 1.5, 0, Z, E.head, 48), t.cylX(h0, h1, 0, Z, E.head - 4, 48)]);
      const knurl = Array.from({ length: 4 }, (_, j) => t.cylX(h0 + 2 + j * 2.6, h0 + 3.2 + j * 2.6, 0, Z, E.head + .01, 48));
      const logo = t.box([h1 - .5, -22, Z - 6], [h1 - .1, 22, Z + 6]);
      t.both(MAT.screws, t.cut(t.union([head, ...knurl]), [t.move(logo, [.5, 0, 0])]), t.cylX(g + E.endT - 8, h0 + .5, 0, Z, 20, 24));
      t.both(MAT.logo, logo);
    }
    // Knurled Ø35.5 handle with weld collars at the end plates; raised rings stand in for the diamond knurl.
    t.both(MAT.grip, t.cylX(0, g + 3, 0, Z, E.gripDiameter - .8, 40), t.cylX(g - 3, g, 0, Z, 45, 40));
    for (let xr = 2; xr < g - 5; xr += 3.2) t.both(MAT.grip, t.cylX(xr, xr + 1.2, 0, Z, E.gripDiameter, 40));
  });
}
export const definitions: PartDefinition[] = [floorDefinition(EISENLINK_SQUARE, buildEisenlink)];
