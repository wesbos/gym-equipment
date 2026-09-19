/** Adjustable dumbbells family: Bowflex SelectTech 552 / 1090 builder (one parametric builder for both).
 * Build axes (kit): X along the handle, Y across, Z up. U-slot plates stand in two tray wells; the handle (grip, inner
 * handle plates, top bar, selector shaft and end dials) drops into the slots and picks up the plates the dial selects. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { BOWFLEX_1090, BOWFLEX_552, type SelectTechModel, selectTechModel, selectTechParams } from '../floor-parts/adjustable-dumbbells-bowflex.ts';
import { DUMBBELL_LIFT } from '../floor-parts/adjustable-dumbbells-common.ts';
import { dumbbellKit, type Mat } from './adjustable-dumbbells-kit.ts';
/** Gap between neighbouring plates along the handle, mm. */
export const SELECTTECH_GAP = 1.5;
/** Plate stations along +X: [x0, x1] of the inner handle plate, each weight plate and the dial. */
export function selectTechLayout(m: SelectTechModel) {
  const hp0 = m.grip / 2, hp1 = hp0 + m.handlePlate.t;
  let x = hp1 + SELECTTECH_GAP;
  const plates = m.plates.map(p => { const span: [number, number] = [x, x + p.t]; x += p.t + SELECTTECH_GAP; return span; });
  const dial: [number, number] = [x, x + m.dial.t];
  // Outline radii: solved so each slotted lobe tops out at its listed height and the innermost plate spans the published width.
  let aspect = 1, r0 = m.plates[0].r;
  for (let i = 0; i < 30; i++) { aspect = m.width / 2 / r0; r0 += m.plates[0].r - lobeTop(outlinePoints(m, r0, aspect), m.slot / 2) + m.axis; }
  aspect = m.width / 2 / r0;
  const radius = (r: number) => { let re = r; for (let i = 0; i < 30; i++) re += r - lobeTop(outlinePoints(m, re, aspect), m.slot / 2) + m.axis; return re; };
  return { handlePlate: [hp0, hp1] as [number, number], plates, dial, aspect, radius, dumbbellLength: 2 * dial[1] };
}
/** Plate outline in YZ (counter-clockwise): top half-ellipse of radius re × re·aspect about the axis, bottom half reaching the well floor. */
export function outlinePoints(m: SelectTechModel, re: number, aspect: number): [number, number][] {
  const a = re * aspect, below = m.axis - m.floor, n = m.segments;
  return Array.from({ length: n }, (_, i) => { const th = 2 * Math.PI * i / n, c = Math.cos(th); return [-a * Math.sin(th), m.axis + (c >= 0 ? re : below) * c] as [number, number]; });
}
/** Height of the outline where the top slot edge (|y| = c) meets it. */
function lobeTop(points: [number, number][], c: number) {
  let top = -Infinity;
  points.forEach(([y0, z0], i) => { const [y1, z1] = points[(i + 1) % points.length]; if ((y0 - c) * (y1 - c) <= 0 && y0 !== y1) top = Math.max(top, z0 + (z1 - z0) * (c - y0) / (y1 - y0)); });
  return top;
}
export function buildSelectTech(api: ManifoldAPI, p: NumericParams, m: SelectTechModel): SolidPart[] {
  const { colors, carried, lifted } = selectTechParams(m, p), L = selectTechLayout(m), t = dumbbellKit(api);
  const plateColor = colors.plate;
  const MAT = {
    carried: [lifted ? 'Selected plates · lifted with handle' : 'Selected plates', 'source', plateColor, .15, .62],
    resting: ['Plates left in tray', 'source', plateColor, .15, .62],
    handlePlates: ['Inner handle plates and selector shaft', 'source', '#1f2022', .2, .55],
    bar: ['Handle top bar', 'source', colors.accent, colors.accent === '#8d9095' ? .6 : .1, .4],
    bracket: ['Handle bracket', 'source', colors.bracket, colors.bracket === '#9a9ea3' ? .7 : .1, .4],
    dial: ['Selector dials', 'source', colors.dial, .1, .55],
    numerals: ['Dial numerals and pointer', 'source', colors.numerals, 0, .5],
    cap: ['Dial caps', 'source', colors.cap, .2, .45],
    logo: ['Dial cap logos and rings', 'source', colors.logo, .1, .4],
    ring: ['Selector ring', 'source', colors.ring ?? '#2a2b2d', .1, .45],
    grip: [m.knurled ? 'Knurled chrome grip' : 'Rubber grip', 'handle', m.knurled ? '#c4c7cb' : '#161718', m.knurled ? .95 : 0, m.knurled ? .3 : .85],
    chrome: ['Chrome grip ferrules', 'source', '#c9ccd0', 1, .18],
    tray: ['Moulded storage tray', 'source', '#1b1c1e', 0, .7],
    label: ['Tray labels', 'source', '#bdbfc2', 0, .6],
    screws: ['Bracket screws', 'fastener', '#2c2d2f', .6, .4],
  } satisfies Record<string, Mat>;
  const { axis, floor } = m, below = axis - floor;
  const up = (s: Manifold) => lifted ? t.move(s, [0, 0, DUMBBELL_LIFT]) : s;
  /** Plate outline for a lobe height r above the axis. */
  const outline = (r: number) => t.poly(outlinePoints(m, L.radius(r), L.aspect));
  /** U-slot plate between x0 and x1: bevelled rim (rounded on the 552, chamfered facets on the 1090), slot open at the top. */
  const plate = (r: number, x0: number, x1: number) => {
    const cs = outline(r), b = Math.min(m.bevel, (x1 - x0) / 3), inner = t.k(cs.offset(-b, 'Round', 2, 16));
    const body = t.hull([t.extrudeX(inner, x0, x1 - x0), t.extrudeX(cs, x0 + b, x1 - x0 - 2 * b)]);
    return t.cut(body, [t.box([x0 - 1, -m.slot / 2, axis], [x1 + 1, m.slot / 2, axis + r + 30]), t.cylX(x0 - 1, x1 + 1, 0, axis, m.slot, 32)]);
  };
  const turnX = (s: Manifold, deg: number) => t.move(t.rot(t.move(s, [0, 0, -axis]), [deg, 0, 0]), [0, 0, axis]);
  return t.finish(`Bowflex ${m.name}`, () => {
    // Weight plates, innermost first; the dial's cam carries `carried` per side, the rest stay seated in the tray wells.
    m.plates.forEach((pl, i) => {
      const [x0, x1] = L.plates[i], s = plate(pl.r, x0, x1);
      if (carried.includes(i)) t.both(MAT.carried, up(s)); else t.both(MAT.resting, s);
    });
    // Handle: inner D plates, selector shaft with notched discs, top bar, bracket, grip.
    const [h0, h1] = L.handlePlate, [d0, d1] = L.dial, dialTop = axis + m.dial.d / 2, barTop = axis + .7 * m.plates[0].r;
    const handle: Manifold[] = [plate(m.handlePlate.r, h0, h1), t.cylX(h1 - 1, d0 + 1, 0, axis, 30, 24)];
    for (const [x0, x1] of L.plates) handle.push(t.cylX((x0 + x1) / 2 - 2, (x0 + x1) / 2 + 2, 0, axis, 40, 24));
    t.both(MAT.handlePlates, ...handle.map(up));
    // Top bar runs over the selector shaft from the handle plate to the dial; its nameplate tab overhangs the dial rim.
    const bw = m.slot / 2 - 3, tabZ = dialTop + 5;
    t.both(MAT.bar, up(t.box([h0 + m.handlePlate.t * .3, -bw, dialTop], [d0 - .5, bw, barTop])),
      up(t.hull([t.box([d0 - 1, -bw, tabZ], [d0, bw, barTop]), t.box([d0 - 1, -bw * .6, tabZ], [d0 + m.dial.t * .55, bw * .6, tabZ + 3])])));
    // Weight pointer on the tab, over the selected numeral.
    t.both(MAT.numerals, up(t.hull([t.boxC([1, 10, .8], [d0 + m.dial.t * .1, 0, tabZ + 3.4]), t.boxC([1, 1, .8], [d0 + m.dial.t * .5, 0, tabZ + 3.4])])));
    // Y bracket on the inner face of each handle plate, with two screws.
    const arm = (len: number, deg: number) => turnX(t.boxC([3, 22, len], [h0 - 1.5, 0, axis + len / 2]), deg);
    t.both(MAT.bracket, up(t.cylX(h0 - 3, h0, 0, axis, m.gripDiameter + 20, 32)), up(arm(.72 * m.handlePlate.r, 35)), up(arm(.72 * m.handlePlate.r, -35)), up(arm(.5 * m.handlePlate.r, 180)));
    const sr = .55 * m.handlePlate.r;
    t.both(MAT.screws, ...[35, -35].map(deg => up(turnX(t.cylX(h0 - 4.5, h0 - 2.5, 0, axis + sr, 7, 12), deg))));
    // Grip: barrel rubber (552) or knurled chrome (1090), with chrome ferrules at the plates.
    const g = m.grip / 2, gd = m.gripDiameter;
    if (m.knurled) {
      const grip: Manifold[] = [t.cylX(-g - 1, g + 1, 0, axis, gd, 40)];
      for (let x = -g + 12; x < g - 12; x += 4) grip.push(t.cylX(x, x + 1.4, 0, axis, gd + .9, 40));
      t.add(MAT.grip, up(t.union(grip)));
      t.both(MAT.chrome, up(t.cylX(g - 10, g, 0, axis, gd + 4, 40)));
    } else {
      t.add(MAT.grip, up(t.union([t.cylX(-g + 10, 0, 0, axis, gd, 40, gd + 3), t.cylX(0, g - 10, 0, axis, gd + 3, 40, gd)])));
      t.both(MAT.chrome, up(t.cylX(g - 12, g, 0, axis, gd + 3, 40, gd + 1)));
    }
    // End dials: numbered pocket ring turned so the selected setting reads under the bar pointer, cap, ring and logo.
    const n = m.weights.length, sel = m.weights.indexOf(p.weight), R = m.dial.d / 2, pw = Math.PI * m.dial.d / n * .72;
    t.both(MAT.dial, up(t.cylX(d0, d1, 0, axis, m.dial.d, 48)));
    const pockets: Manifold[] = [], chips: Manifold[] = [];
    for (let j = 0; j < n; j++) {
      const deg = (j - sel) * 360 / n;
      pockets.push(turnX(t.boxC([m.dial.t * .72, pw, 4], [d0 + m.dial.t * .55, 0, axis + R + 1]), deg));
      chips.push(turnX(t.boxC([m.dial.t * .3, pw * .34, .8], [d0 + m.dial.t * .55, 0, axis + R + 3.2]), deg));
    }
    t.both(MAT.dial, ...pockets.map(up)); t.both(MAT.numerals, ...chips.map(up));
    t.both(MAT.cap, up(t.cylX(d1 - 1, d1 + 1.2, 0, axis, m.dial.d * .58, 40)));
    t.both(MAT.logo, up(t.cut(t.cylX(d1 - 1, d1 + 1.6, 0, axis, m.dial.d * .64, 40), [t.cylX(d1 - 2, d1 + 2, 0, axis, m.dial.d * .58, 40)])),
      up(t.extrudeX(t.k(t.circle(m.dial.d * .2, 32).scale([1.45, 1])), d1 + 1, 1, 0, axis)));
    if (colors.ring) t.both(MAT.ring, up(t.cylX(d0 - 2, d0, 0, axis, m.dial.d + 3, 48)));
    // Tray: rounded body with two plate wells, arched underside (corner feet), dial saddles and moulded labels.
    const TL = m.length, TW = m.trayWidth, TH = m.trayHeight;
    const wellHalf = Math.max(...m.plates.map(pl => L.radius(pl.r) * L.aspect * Math.sqrt(Math.max(0, 1 - ((axis - TH) / below) ** 2)))) + 3;
    const wells = [-1, 1].map(s => t.box(s > 0 ? [h0 - 3, -wellHalf, floor] : [-d0 + 1, -wellHalf, floor], s > 0 ? [d0 - 1, wellHalf, TH + 1] : [-(h0 - 3), wellHalf, TH + 1]));
    const arch = t.extrudeY(t.k(t.circle(2, 64).scale([TL * .38, 13])), -TW, 2 * TW, 0, 0);
    const tunnel = t.extrudeX(t.rrect(TW * .5, 30, 8), -TL, 2 * TL, 0, 0);
    let tray = t.cut(t.extrudeZ(t.rrect(TL, TW, 24), 0, TH), [...wells, arch, tunnel]);
    const saddles = [-1, 1].map(s => {
      const x0 = s > 0 ? d0 - 2 : -TL / 2 + 6, x1 = s > 0 ? TL / 2 - 6 : -(d0 - 2);
      return t.cut(t.box([x0, -R * 1.05, TH - 1], [x1, R * 1.05, axis - R * .45]), [t.cylX(x0 - 1, x1 + 1, 0, axis, m.dial.d + 3, 48)]);
    });
    tray = t.union([tray, ...saddles]);
    t.add(MAT.tray, tray);
    t.add(MAT.label, t.box([-m.grip * .3, -9, TH], [m.grip * .3, 9, TH + .8]), t.box([-38, -TW / 2 - .8, TH * .45], [38, -TW / 2 + .2, TH * .45 + 11]));
  });
}
export const buildBowflex552 = (api: ManifoldAPI, p: NumericParams) => buildSelectTech(api, p, selectTechModel(BOWFLEX_552.id));
export const buildBowflex1090 = (api: ManifoldAPI, p: NumericParams) => buildSelectTech(api, p, selectTechModel(BOWFLEX_1090.id));
export const definitions: PartDefinition[] = [floorDefinition(BOWFLEX_552, buildBowflex552), floorDefinition(BOWFLEX_1090, buildBowflex1090)];
