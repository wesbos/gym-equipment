/** Rack dip attachments (#134): Mutant Metals UDA, Rogue Monster Lite Matador, REP Dip Station, REP Drop-In Dip,
 * Bells of Steel Y Dip Bar, plus Fringe Sport's Swan Neck swivel mount. Metadata only (main bundle): never import
 * Manifold builders here. Research: research/rack-dips-landmines.md.
 *
 * Source frame (rack-part.ts): origin on the upright centreline at the target hole axis, +Y out of the mounting face,
 * X across it, Z up. Cup-style dips straddle the upright (flanges on the two side faces) and pin across it through
 * the side holes (`pinAxis: 'across'`); the dip projects along +Y. The layout helpers here feed both the collision
 * bodies and the builders (parts/rack-dips-landmines-dips.ts), so their numbers never drift apart. */
import { defineRackPart, PIN_1IN, PIN_5_8IN } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const box = (min: Vec3, max: Vec3): LocalBox => ({ min, max });
const DIPS = 'Dips & landmines' as const;
/** Round bar from a to b (diameter d): its exact axis-aligned bounds. */
export interface Rod { a: Vec3; b: Vec3; d: number }
export function rodBox({ a, b, d }: Rod): LocalBox {
  const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...v), r = d / 2;
  const e = v.map(c => r * Math.sqrt(Math.max(0, 1 - (c / L) ** 2)));
  return { min: [0, 1, 2].map(i => Math.min(a[i], b[i]) - e[i]) as Vec3, max: [0, 1, 2].map(i => Math.max(a[i], b[i]) + e[i]) as Vec3 };
}
/** Axis-aligned bounds of a box of size [sx, sy, sz] centred at c and turned by `yaw` degrees about Z. */
export function yawBox(c: Vec3, [sx, sy, sz]: Vec3, yaw: number): LocalBox {
  const a = yaw * Math.PI / 180, hx = (Math.abs(Math.cos(a)) * sx + Math.abs(Math.sin(a)) * sy) / 2, hy = (Math.abs(Math.sin(a)) * sx + Math.abs(Math.cos(a)) * sy) / 2;
  return box([c[0] - hx, c[1] - hy, c[2] - sz / 2], [c[0] + hx, c[1] + hy, c[2] + sz / 2]);
}
const mirrorX = (b: LocalBox): LocalBox => box([-b.max[0], b.min[1], b.min[2]], [-b.min[0], b.max[1], b.max[2]]);
/** Fit rule shared by the 3x3-only dips: both post dimensions at least 74 mm. */
const needs3x3 = (name: string) => (rack: RackDimensions) => {
  if (Math.min(rack.tube, rack.tubeDepth ?? rack.tube) < 74) throw Error(`${name} fits 3x3 in uprights only.`);
};
// ---------------- Mutant Metals Ultimate Dip Attachment ----------------
/** Published (Rogue RA2860/RA2861, Mutant Metals): 21.25 W x 6.75 H x 24.5 D in, 2x2 in 11-ga frame, 3/8 in plates,
 * 1-3/8 in x 18 in knurled handles (22 in overall, 1 in x 4 in threaded pin), handles 30° to each other, grip ranges
 * 11.5-20 / 15-24 / 19-27.5 in. Plate outline, spine and centre-segment lengths estimated from the drawings. */
export const UDA = { cupH: inch(6.75), pinTop: 21.5, plate: 9.5, liner: 3, tube: inch(2), plateLen: 127, spine: 89, centre: 185, wing: 170, sweep: 15, holes: [146, 190.5, 241], grip: [inch(1.375), 45], gripLen: inch(18), pin: inch(1), pinLen: inch(4), shoulder: [38, 10], washer: 3, knob: [inch(2.5), 19], shortTop: -40 } as const;
export const UDA_COLORS = [['Textured Black', '#1f2022'], ['Textured Red', '#9c1a1f'], ['Textured Charcoal Gray', '#3b3d40'], ['Textured Dark Blue', '#1e2b49'], ['Gun Metal', '#4b4e53']] as const;
export const UDA_HANDLES = ['Stainless steel handles', 'Proprietary matte black handles'] as const;
export const UDA_POSITIONS = ['Narrow · 11.5-20 in', 'Mid · 15-24 in', 'Wide · 19-27.5 in'] as const;
export function udaLayout(p: NumericParams) {
  const f = face(p), U = UDA, zb = -U.cupH + U.pinTop, t = U.tube, webY = f + U.liner, webF = webY + t, cb0 = webF + U.spine;
  const plateX = [f + U.liner, f + U.liner + U.plate], plateY = [webF - U.plateLen, webF];
  const a = U.sweep * Math.PI / 180, dir: [number, number] = [Math.cos(a), -Math.sin(a)], normal: [number, number] = [Math.sin(a), Math.cos(a)];
  const wingStart: [number, number] = [U.centre / 2, cb0 + t / 2], zc = zb + t / 2;
  const hole = (h: number): [number, number] => { const s = (h - U.centre / 2) / Math.cos(a); return [wingStart[0] + s * dir[0], wingStart[1] + s * dir[1]]; };
  const grip = p.gripSize ? U.grip[1] : U.grip[0];
  /** Handle along the wing normal from its root (hole centre): pin + knob behind, shoulder, grip in front. */
  const handle = (side: 1 | -1) => {
    const [hx, hy] = hole(U.holes[p.position ?? 1]), at = (s: number): Vec3 => [side * (hx + s * normal[0]), hy + s * normal[1], zc];
    return { at, root: [side * hx, hy] as [number, number], grip0: t / 2 + U.washer + U.shoulder[1], grip1: t / 2 + U.washer + U.shoulder[1] + U.gripLen, knob0: -t / 2 - U.knob[1], d: grip };
  };
  return { f, zb, zc, t, webY, webF, cb0, plateX, plateY, dir, normal, wingStart, hole, handle, a };
}
function udaBodies(p: NumericParams): LocalBox[] {
  const g = udaLayout(p), U = UDA, top = g.zb + U.cupH, wingC = (side: 1 | -1): Vec3 => [side * (g.wingStart[0] + g.dir[0] * U.wing / 2), g.wingStart[1] + g.dir[1] * U.wing / 2, g.zc];
  return [
    box([g.plateX[0], g.plateY[0], g.zb], [g.plateX[1], g.plateY[1], top]),
    box([-g.plateX[1], g.plateY[0], g.zb], [-g.plateX[0], g.plateY[1], p.hardware ? top : g.zb + (U.cupH - U.pinTop + U.shortTop)]),
    box([-g.plateX[1], g.webY, g.zb], [g.plateX[1], g.webF, g.zb + g.t]),
    box([-g.t / 2, g.webF, g.zb], [g.t / 2, g.cb0, g.zb + g.t]),
    box([-U.centre / 2, g.cb0, g.zb], [U.centre / 2, g.cb0 + g.t, g.zb + g.t]),
    yawBox(wingC(1), [U.wing, g.t, g.t], -U.sweep), yawBox(wingC(-1), [U.wing, g.t, g.t], U.sweep),
    ...([1, -1] as const).map(side => { const h = g.handle(side); return rodBox({ a: h.at(h.grip0), b: h.at(h.grip1), d: h.d }); }),
  ];
}
export const MUTANT_UDA = defineRackPart({
  id: 'mutant-metals-ultimate-dip-attachment', name: 'Mutant Metals UDA', title: 'Mutant Metals Ultimate Dip Attachment (UDA)', noun: 'dip attachment', section: DIPS,
  description: 'Multi-grip rack dip for 3x3 uprights · bat-wing 2x2 frame with three handle holes per wing · 1-3/8 in x 18 in knurled handles at 30° · 550 lb. Independent reconstruction; Mutant Metals and Rogue trademarks belong to their owners.',
  params: [
    { key: 'hardware', label: 'Mount', default: 0, options: [0, 1], format: v => ['1 in J-cup pin (Monster)', '5/8 in detent pin (Monster Lite)'][v] ?? String(v) },
    { key: 'position', label: 'Handle holes', default: 1, options: [0, 1, 2], format: v => UDA_POSITIONS[v] ?? String(v) },
    { key: 'handles', label: 'Handles', default: 0, options: [0, 1], format: v => UDA_HANDLES[v] ?? String(v) },
    { key: 'gripSize', label: 'Handle diameter', default: 0, options: p => p.handles ? [0] : [0, 1], format: v => ['35 mm (1-3/8 in)', '45 mm (Mutant Metals upgrade)'][v] ?? String(v) },
    { key: 'color', label: 'Frame colour', default: 0, options: [0, 1, 2, 3, 4], format: v => UDA_COLORS[v]?.[0] ?? String(v) },
  ],
  vendor: {
    vendor: 'Mutant Metals', url: 'https://www.roguefitness.com/mutant-metals-ultimate-dip-attachments-uda',
    credit: 'Mutant Metals — Ultimate Dip Attachment (Rogue RA2860 / RA2861) · Made in USA', trademark: 'Mutant Metals and UDA are trademarks of Mutant Metals; Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 21.25 x 6.75 x 24.5 in envelope, 2x2 in 11-ga frame and 3/8 in plates, the three grip ranges, 30° handle angle, 1-3/8 in x 18 in handles with 1 in threaded pins and knurled knobs, 1 in welded or 5/8 in detent pin, colours and 550 lb. Plate outline, spine and wing lengths estimated from photos and the Rogue drawing; physical fit unverified.',
  },
  mount: { pin: p => p.hardware ? PIN_5_8IN : PIN_1IN, pinAxis: 'across', extent: { below: UDA.cupH - UDA.pinTop + 10, above: UDA.pinTop + 8 }, validate: needs3x3('The UDA') },
  bodies: udaBodies,
  pair: { default: false },
  placement: { height: 1275, face: 'front' },
  autoFit: rack => ({ hardware: rack.holeDiameter < 20 ? 1 : 0 }),
});
// ---------------- Mutant Metals Handles ----------------
/** Published (Mutant Metals UDA stainless handles): 22 in overall, 4 in pin section for 2 and 3 in racks, 1-3/8 in x
 * 18 in knurled grip (45 mm option), 1-8 thread for Rogue knurled knobs, 275 lb per handle; used on the UDA, the ARC
 * and straight in rack or jammer-arm holes. Shoulder and knob sizes shared with the UDA model. */
export const MM_HANDLE = { length: inch(22), pinSection: inch(4) } as const;
export function mmHandleLayout(p: NumericParams) {
  const f = face(p), U = UDA, d = p.gripSize ? U.grip[1] : U.grip[0], shoulder0 = f + U.washer, grip0 = shoulder0 + U.shoulder[1], grip1 = grip0 + U.gripLen;
  return { f, d, shoulder0, grip0, grip1, pin0: grip0 - MM_HANDLE.pinSection, knob: [-f - U.knob[1], -f] as [number, number] };
}
export const MUTANT_HANDLES = defineRackPart({
  id: 'mutant-metals-handles', name: 'Mutant Metals Handle', title: 'Mutant Metals Handles', noun: 'handle', section: DIPS,
  description: 'Threaded 1 in pin handles that run straight through a rack hole (or the UDA and ARC) · 1-3/8 in x 18 in knurled grip, 22 in overall · knurled knob behind the upright · 275 lb each. Independent reconstruction; Mutant Metals trademarks belong to Mutant Metals.',
  params: [
    { key: 'handles', label: 'Finish', default: 0, options: [0, 1], format: v => UDA_HANDLES[v] ?? String(v) },
    { key: 'gripSize', label: 'Handle diameter', default: 0, options: p => p.handles ? [0] : [0, 1], format: v => ['35 mm (1-3/8 in)', '45 mm'][v] ?? String(v) },
  ],
  vendor: {
    vendor: 'Mutant Metals', url: 'https://mutantmetals.com/products/p/7268iypgducmtys8vuxi7f7fpyshqr',
    credit: 'Mutant Metals — UDA stainless handles (pair) · Made in USA', trademark: 'Mutant Metals, UDA and ARC are trademarks of Mutant Metals.',
    reconstruction: 'Published 22 in overall length, 4 in pin section for 2 and 3 in racks, 1-3/8 in x 18 in knurled grip with marks every 6 in, 45 mm option, 1-8 thread for Rogue knurled knobs and 275 lb per handle. Shoulder, washer and knob sizes estimated from photos; physical fit unverified.',
  },
  mount: { pin: PIN_1IN, extent: { below: UDA.knob[0] / 2 + 1, above: UDA.knob[0] / 2 + 1 }, validate: rack => { if (Math.max(rack.tube, rack.tubeDepth ?? rack.tube) > inch(3) + 1) throw Error('Mutant Metals handles fit 2 and 3 in uprights.'); } },
  bodies: p => { const g = mmHandleLayout(p), r = g.d / 2; return [box([-r, g.grip0, -r], [r, g.grip1, r]), box([-UDA.shoulder[0] / 2, g.shoulder0, -UDA.shoulder[0] / 2], [UDA.shoulder[0] / 2, g.grip0, UDA.shoulder[0] / 2])]; },
  pair: { default: true },
  // Straight out of the front of both front uprights, at dip height.
  placement: { height: 1150, face: 'front' },
});
// ---------------- Rogue Monster Lite Matador ----------------
/** Published (RA0383 / Monster RA0116): 24 L x 27 W x 10 H in, 1-7/8 in handles 17.75 in c-c at the crossbar and
 * 24.75 in at the tips, 3x3 7-gauge channel, 27 lb, 5/8 x 4 in detent pin (Monster: 1 in Matador pin). Spine,
 * crossbar and gusset sizes estimated from photos (07 plan view scaled to the 27 in width). */
export const MATADOR = { h: inch(10), top: 45, plate: 4.55, liner: 1.5, depth: inch(3.25), spine: [inch(2), inch(3)], spineTop: -40, crossY: 191.5, cross: [inch(21), inch(2)], handle: inch(1.875), rootX: inch(17.75) / 2, tipX: inch(24.75) / 2, reach: 444.4, stub: 15 } as const;
export const MATADOR_PINS = ['Monster Lite · 5/8 x 4 in detent pin', 'Monster · 1 in Matador detent pin'] as const;
export function matadorLayout(p: NumericParams) {
  const f = face(p), M = MATADOR, web = [f + M.liner, f + M.liner + M.plate], flangeX = [f + M.liner, f + M.liner + M.plate];
  const zTop = M.spineTop, zBot = zTop - M.spine[1], zc = (zTop + zBot) / 2, cy0 = f + M.crossY - M.cross[1], cy1 = f + M.crossY;
  const ang = Math.asin((M.tipX - M.rootX) / M.reach), dir: [number, number] = [Math.sin(ang), Math.cos(ang)];
  const handle = (side: 1 | -1) => ({ a: [side * (M.rootX - dir[0] * (M.cross[1] / 2 + M.stub)), (cy0 + cy1) / 2 - dir[1] * (M.cross[1] / 2 + M.stub), zc] as Vec3, b: [side * (M.rootX + dir[0] * M.reach), (cy0 + cy1) / 2 + dir[1] * M.reach, zc] as Vec3 });
  return { f, web, flangeX, zTop, zBot, zc, cy0, cy1, ang, dir, handle, bottom: M.top - M.h };
}
function matadorBodies(p: NumericParams): LocalBox[] {
  const g = matadorLayout(p), M = MATADOR, back = g.web[1] - M.depth;
  return [
    box([-g.flangeX[1], g.web[0], g.bottom], [g.flangeX[1], g.web[1], M.top]),
    box([g.flangeX[0], back, g.bottom], [g.flangeX[1], g.web[1], M.top]), box([-g.flangeX[1], back, g.bottom], [-g.flangeX[0], g.web[1], M.top]),
    box([-M.spine[0] / 2, g.web[1], g.zBot], [M.spine[0] / 2, g.cy0, g.zTop]),
    box([-M.cross[0] / 2, g.cy0, g.zBot], [M.cross[0] / 2, g.cy1, g.zTop]),
    ...([1, -1] as const).map(s => rodBox({ ...g.handle(s), d: M.handle })),
  ];
}
export const ROGUE_MATADOR = defineRackPart({
  id: 'rogue-monster-lite-matador', name: 'Rogue Monster Lite Matador', title: 'Rogue Monster Lite Matador', noun: 'dip attachment', section: DIPS,
  description: 'Channel-mounted rack dip for 3x3 uprights · angled 1-7/8 in handles 17.75 to 24.75 in apart · 24 x 27 x 10 in · 27 lb. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'pin', label: 'Rack & pin', default: 0, options: [0, 1], format: v => MATADOR_PINS[v] ?? String(v) }],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-lite-matador',
    credit: 'Rogue Fitness — Monster Lite Matador (RA0383) · Made in USA', trademark: 'Rogue, Monster Lite, Monster and Matador are trademarks of Rogue Fitness.',
    reconstruction: 'Published 24 x 27 x 10 in, 1-7/8 in handles at 17.75-24.75 in centres, 3x3 7-gauge channel, 27 lb and the 5/8 x 4 in detent pin (Monster version: 1 in Matador pin). Spine, crossbar, gusset and flange depth estimated from photos; physical fit unverified.',
  },
  mount: { pin: p => p.pin ? PIN_1IN : PIN_5_8IN, pinAxis: 'across', extent: { below: MATADOR.h - MATADOR.top + 2, above: MATADOR.top + 25 }, validate: needs3x3('The Matador') },
  bodies: matadorBodies,
  pair: { default: false },
  placement: { height: 1230, face: 'front' },
  autoFit: rack => ({ pin: rack.holeDiameter < 20 ? 0 : 1 }),
});
// ---------------- REP Fitness Dip Station ----------------
/** Published (PRA-4200 / PRA-5202): 32.1 L x 27 W max x 11.3 H in, 400 lb, 4- and 11-gauge steel, J-cup style peg
 * plus a pin, plastic-lined cup, bolt-together arm (a sleeve collar with two bolts). Arm, crossbar, collar, handle size and the peg-to-pin spacing are
 * estimated from REP and review photos (no drawing published). */
export const REP_DIP = { h: inch(11.3), top: 40, plate: 5.7, liner: 1.5, depth: 78, pinDrop: 190, arm: [inch(2), inch(3)], armTop: 10, armLen: 276, cross: [inch(21), inch(2), inch(3)], crossY: [275, 326], crossTop: 10, handle: 44.5, rootX: inch(19) / 2, tipX: inch(25) / 2, length: 521, yoke: [170, 270], logo: [70, 22] } as const;
export const REP_DIP_SERIES = ['4000 Series · 5/8 in', '5000 Series · 1 in'] as const;
export const repDipPinHole = (p: NumericParams) => Math.max(3, Math.round(REP_DIP.pinDrop / (p.mountSpacing ?? 50)));
export function repDipLayout(p: NumericParams) {
  const f = face(p), R = REP_DIP, w0 = f + R.liner, w1 = w0 + R.plate, zc = R.crossTop - R.cross[2] / 2, cy = f + (R.crossY[0] + R.crossY[1]) / 2;
  const ang = Math.asin((R.tipX - R.rootX) / R.length), dir: [number, number] = [Math.sin(ang), Math.cos(ang)];
  const handle = (side: 1 | -1) => ({ a: [side * R.rootX, f + R.crossY[0], zc] as Vec3, b: [side * (R.rootX + dir[0] * R.length), cy + dir[1] * R.length, zc] as Vec3 });
  return { f, w0, w1, zc, cy, ang, dir, handle, bottom: R.top - R.h, pinZ: -repDipPinHole(p) * (p.mountSpacing ?? 50) };
}
function repDipBodies(p: NumericParams): LocalBox[] {
  const g = repDipLayout(p), R = REP_DIP, back = g.w1 - R.depth;
  return [
    box([-g.w1, g.w0, g.bottom], [g.w1, g.w1, R.top]),
    box([g.w0, back, g.bottom], [g.w1, g.w1, R.top]), box([-g.w1, back, g.bottom], [-g.w0, g.w1, R.top]),
    box([-R.arm[0] / 2, g.w1, R.armTop - R.arm[1]], [R.arm[0] / 2, g.f + R.armLen, R.armTop]),
    box([-R.cross[0] / 2, g.f + R.crossY[0], R.crossTop - R.cross[2]], [R.cross[0] / 2, g.f + R.crossY[1], R.crossTop]),
    ...([1, -1] as const).map(s => rodBox({ ...g.handle(s), d: R.handle })),
  ];
}
export const REP_DIP_STATION = defineRackPart({
  id: 'rep-dip-station', name: 'REP Dip Station', title: 'REP Fitness Dip Station', noun: 'dip attachment', section: DIPS,
  description: 'J-cup style rack dip for PR-4000 and PR-5000 · plastic-lined C-cup with a lock pin · bolt-on yoke with angled handles · 32.1 x 27 x 11.3 in · 400 lb. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => REP_DIP_SERIES[v] ?? String(v) }],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/dip-station',
    credit: 'REP Fitness — Dip Station (PRA-4200 / PRA-5202)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 32.1 x 27 x 11.3 in, 400 lb, 4- and 11-gauge steel, J-cup mounting with a pin, plastic lining and the 4000 (5/8 in) and 5000 (1 in) versions. Arm, yoke, crossbar, handle diameter and peg-to-pin spacing estimated from photos; physical fit unverified.',
  },
  mount: {
    pin: p => p.series ? PIN_1IN : PIN_5_8IN, pinAxis: 'across', holes: p => [0, -repDipPinHole(p)],
    extent: p => ({ below: Math.max(REP_DIP.h - REP_DIP.top, repDipPinHole(p) * (p.mountSpacing ?? 50) + 20) + 2, above: REP_DIP.top + 2 }),
    validate: needs3x3('The REP Dip Station'),
  },
  bodies: repDipBodies,
  pair: { default: false },
  placement: { height: 1180, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 0 : 1 }),
});
// ---------------- REP Fitness Drop-In Dip Attachment ----------------
/** Published (PRA-4210 / PRA-5210, official dimension drawing): 12.2 in tall, 15.7 in wide per side, 14 in usable
 * 44 mm handles, 18.3-24 in handle width, 16.5 in depth added, 11-gauge, 18.2 lb per side, 810 lb. Double C-cup,
 * peg, arm tube and bolt positions estimated from the drawing and photos. The first unit reaches toward local -X
 * (the rack centre from a left post); the pair's second unit is mirrored. */
export const DROP_IN = { h: inch(12.2), width: inch(15.7), plate: 3.05, liner: 1.5, cupH: 76, cupDepth: 60, topFlat: 95, arm: inch(2), handle: 44, usable: inch(14), cant: 11.8, depth: inch(16.5), logo: [-120, 70, 60, 85] } as const;
export const DROP_IN_SERIES = ['4000 Series · 5/8 in peg', '5000 Series · 1 in peg'] as const;
export function dropInLayout(p: NumericParams) {
  const f = face(p), D = DROP_IN, half = D.h / 2, y0 = f + D.liner, y1 = y0 + D.plate, xo = f + D.liner + D.plate, xi = xo - D.width;
  const armZ = [-half, -half + D.arm], a = D.cant * Math.PI / 180, dir: [number, number] = [Math.sin(a), Math.cos(a)];
  const rootX = xi + D.handle / 2 + 2, rootY = y1 + D.arm / 2, len = (f + D.depth - D.handle / 2 * Math.sin(a) - rootY) / Math.cos(a);
  const handle = { a: [rootX, rootY, (armZ[0] + armZ[1]) / 2] as Vec3, b: [rootX + dir[0] * len, rootY + dir[1] * len, (armZ[0] + armZ[1]) / 2] as Vec3 };
  return { f, half, y0, y1, xo, xi, armZ, handle, cups: [[half - D.cupH, half], [armZ[1] + 4, armZ[1] + 4 + D.cupH]] as [number, number][] };
}
function dropInBodies(p: NumericParams): LocalBox[] {
  const g = dropInLayout(p), D = DROP_IN, fx = [g.f + D.liner, g.f + D.liner + D.plate];
  const out = [
    box([g.xi, g.y0, -g.half], [g.xo, g.y1, g.half]),
    box([g.xi, g.y1, g.armZ[0]], [g.xo - 12, g.y1 + D.arm, g.armZ[1]]),
    rodBox({ ...g.handle, d: D.handle }),
    ...g.cups.flatMap(([z0, z1]) => [box([fx[0], g.y1 - D.cupDepth, z0], [fx[1], g.y1, z1]), box([-fx[1], g.y1 - D.cupDepth, z0], [-fx[0], g.y1, z1])]),
  ];
  return p.mirror === 1 ? out.map(mirrorX) : out;
}
export const REP_DROP_IN_DIP = defineRackPart({
  id: 'rep-drop-in-dip-attachment', name: 'REP Drop-In Dip', title: 'REP Fitness Drop-In Dip Attachment', noun: 'dip attachment', section: DIPS,
  description: 'Pair of drop-in dip units for the left and right uprights · double C-cup on a J-cup peg · canted 44 mm handles 18.3 to 24 in apart · 12.2 in tall, 16.5 in deep · 810 lb. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => DROP_IN_SERIES[v] ?? String(v) }],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/drop-in-dip-attachment',
    credit: 'REP Fitness — Drop-In Dip Attachment (PRA-4210 / PRA-5210)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 12.2 in height, 15.7 in width, 14 in usable 44 mm handles, 18.3-24 in handle width, 16.5 in depth added, 11-gauge steel, 18.2 lb per side and 810 lb from the REP dimension drawing. Double C-cup, peg, arm tube, bolts and the laser-cut mountain outline estimated from photos; physical fit unverified.',
  },
  mount: { pin: p => p.series ? PIN_1IN : PIN_5_8IN, extent: { below: DROP_IN.h / 2 + 16, above: DROP_IN.h / 2 + 2 }, faces: ['front', 'back'], validate: needs3x3('The REP Drop-In Dip') },
  bodies: dropInBodies,
  pair: { default: true },
  handed: true,
  placement: { height: 1280, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 0 : 1 }),
});
// ---------------- Bells of Steel Y Dip Bar ----------------
/** Published: 1.9 in (48 mm) handles, 16.25 in usable, 25 in long x 27 in wide, 440/500 lb, UHMW-lined Manticore
 * version; manual (DIP-RA): two M12 x 75 arm bolts, a 16 mm pull pin with a 3 x 60 R-clip. Cup plates, spine,
 * stubs, crossbar and the handle splay are estimated from the gallery. */
export const BOS_DIP = { handle: inch(1.9), usable: inch(16.25), length: inch(25), width: inch(27), top: 40, bottom: -163, shortTop: -36, pinDrop: 2,
  bolt: { plate: 6.35, liner: 1, spine: [inch(2), inch(2.5)], spineY: 250, saddle: [170, 232], stub: [175, 226], root: 276, splay: 6 },
  mtc: { plate: 9.5, liner: 3, tube: inch(2.5), spineY: 168, cross: inch(21.5), root: inch(15.5) / 2, splay: 16 } } as const;
export const BOS_DIP_VARIANTS = ['2.3 in (60 mm) uprights · 5/8 in holes (DIP-RA)', 'Hydra 3x3 · 5/8 in holes (YDIP-RA-HDR)', 'Manticore 3x3 · 1 in holes (DB-RA-MTC)'] as const;
export function bosDipLayout(p: NumericParams) {
  const f = face(p), B = BOS_DIP, mtc = p.variant === 2, plate = mtc ? B.mtc.plate : B.bolt.plate, liner = mtc ? B.mtc.liner : B.bolt.liner;
  const px = [f + liner, f + liner + plate], w1 = f + liner + plate, s = mtc ? B.mtc.tube : B.bolt.spine[p.variant ? 1 : 0];
  const zb = B.bottom, zt = mtc ? zb + B.mtc.tube : zb + inch(2), zc = (zb + zt) / 2;
  const splay = (mtc ? B.mtc.splay : B.bolt.splay) * Math.PI / 180, dir: [number, number] = [Math.sin(splay), Math.cos(splay)];
  const rootX = mtc ? B.mtc.root : B.bolt.root, rootY = mtc ? f + B.mtc.spineY + B.mtc.tube / 2 : f + (B.bolt.stub[0] + B.bolt.stub[1]) / 2;
  const behind = mtc ? B.mtc.tube / 2 : inch(1) + inch(1), reach = (mtc ? B.mtc.tube / 2 : inch(1)) + B.usable;
  const handle = (side: 1 | -1) => ({ a: [side * (rootX - dir[0] * behind), rootY - dir[1] * behind, zc] as Vec3, b: [side * (rootX + dir[0] * reach), rootY + dir[1] * reach, zc] as Vec3 });
  return { f, mtc, px, w1, s, zb, zt, zc, dir, rootX, rootY, handle, pinZ: -B.pinDrop * (p.mountSpacing ?? 50) };
}
function bosDipBodies(p: NumericParams): LocalBox[] {
  const g = bosDipLayout(p), B = BOS_DIP, back = g.w1 - 70, spineEnd = g.f + (g.mtc ? B.mtc.spineY : B.bolt.spineY);
  const arms = g.mtc
    ? [box([-B.mtc.cross / 2, g.f + B.mtc.spineY, g.zb], [B.mtc.cross / 2, g.f + B.mtc.spineY + B.mtc.tube, g.zt])]
    : ([1, -1] as const).map(s => { const x0 = g.s / 2 + g.px[1] - g.f, x1 = g.rootX; return box([s > 0 ? x0 : -x1, g.f + B.bolt.stub[0], g.zb], [s > 0 ? x1 : -x0, g.f + B.bolt.stub[1], g.zt]); });
  return [
    box([g.px[0], back, B.bottom], [g.px[1], g.w1, B.top]), box([-g.px[1], back, B.bottom], [-g.px[0], g.w1, B.shortTop]),
    box([-g.s / 2, g.w1, g.zb], [g.s / 2, spineEnd, g.zb + g.s]),
    ...arms, ...([1, -1] as const).map(s => rodBox({ ...g.handle(s), d: B.handle })),
  ];
}
export const BOS_Y_DIP = defineRackPart({
  id: 'bells-of-steel-y-dip-bar', name: 'Bells of Steel Y Dip Bar', title: 'Bells of Steel Y Dip Bar Rack Attachment', noun: 'dip attachment', section: DIPS,
  description: 'J-cup style Y dip bar with a drop pin · bolt-together 5/8 in versions for 60 mm and Hydra uprights, welded UHMW-lined Manticore version · 1.9 in handles, 16.25 in usable · 25 x 27 in. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [{ key: 'variant', label: 'Version', default: 2, options: [0, 1, 2], format: v => BOS_DIP_VARIANTS[v] ?? String(v) }],
  vendor: {
    vendor: 'Bells of Steel', url: 'https://www.bellsofsteel.us/products/y-dip-bar-attachment',
    credit: 'Bells of Steel — Y Dip Bar Rack Attachment (DIP-RA / YDIP-RA-HDR / DB-RA-MTC)', trademark: 'Bells of Steel, Hydra and Manticore are trademarks of Bells of Steel.',
    reconstruction: 'Published 1.9 in handles with 16.25 in usable length, 25 x 27 in, 440 lb (60 mm) / 500 lb, UHMW lining on the Manticore version and the DIP-RA hardware (two M12 x 75 bolts, 16 mm pull pin, R-clip). Cups, spine, arms, crossbar and handle splay estimated from photos; physical fit unverified.',
  },
  mount: {
    pin: p => p.variant === 2 ? PIN_1IN : PIN_5_8IN, pinAxis: 'across', holes: [0, -BOS_DIP.pinDrop],
    extent: p => ({ below: Math.max(-BOS_DIP.bottom, BOS_DIP.pinDrop * (p.mountSpacing ?? 50) + 25) + 2, above: BOS_DIP.top + 2 }),
    validate: (rack, p) => {
      const small = Math.min(rack.tube, rack.tubeDepth ?? rack.tube);
      if (p.variant === 0 && rack.tube > 62) throw Error('The 60 mm Y Dip Bar fits 2.3 in uprights; pick the Hydra or Manticore version.');
      if (p.variant !== 0 && small < 74) throw Error('This Y Dip Bar version fits 3x3 in uprights; pick the 60 mm version.');
    },
  },
  bodies: bosDipBodies,
  pair: { default: false },
  // BOS: use it inside the rack unless the rack is bolted down.
  placement: { height: 1290, face: 'back' },
  autoFit: rack => ({ variant: rack.tube < 65 ? 0 : rack.holeDiameter < 20 ? 1 : 2 }),
});
// ---------------- Fringe Sport The Swan Neck ----------------
/** Published: 380 x 280 x 150 mm, 11.5 lb, matte black, M24 bolts (not for 5/8 in racks), optional 5/8 in magpin.
 * Read as 380 mm tall (bottom leaf to hook tab), 280 mm reach and 150 mm across the leaves' bolt heads, which matches
 * the photo proportions (box about 2.4:1, bolts about 1.85 box heights apart = four 2 in stations); leaf, box, post and hook-tab
 * sizes estimated from Fringe's photos. */
export const SWAN = { reach: 280, height: 380, span: 4, boxH: 110, plate: [76, 8], leaf: [8, 70], hingeY: 70, box: [inch(2), 45], post: inch(2), tab: [8, 75, 45], bolt: 24 } as const;
export function swanLayout(p: NumericParams) {
  const f = face(p), S = SWAN, pitch = p.mountSpacing ?? 50, low = -S.span * pitch, mid = low / 2, half = S.boxH / 2;
  const leafTop = [mid + half + 2, mid + half + 2 + S.leaf[0]], leafBot = [mid - half - 2 - S.leaf[0], mid - half - 2];
  const boxZ = [mid - half, mid + half], postTop = leafBot[0] + S.height, y1 = f + S.reach;
  return { f, pitch, low, leafTop, leafBot, boxZ, postTop, y1, hinge: f + S.plate[1] + S.hingeY };
}
function swanBodies(p: NumericParams): LocalBox[] {
  const g = swanLayout(p), S = SWAN, w = S.plate[0] / 2;
  return [
    box([-w, g.f, g.low - 38], [w, g.f + S.plate[1], 38]),
    box([-w, g.f + S.plate[1], g.leafTop[0]], [w, g.hinge + w, g.leafTop[1]]), box([-w, g.f + S.plate[1], g.leafBot[0]], [w, g.hinge + w, g.leafBot[1]]),
    box([-S.box[0] / 2, g.hinge - S.box[1], g.boxZ[0]], [S.box[0] / 2, g.y1, g.boxZ[1]]),
    box([-S.post / 2, g.y1 - S.post, g.boxZ[1]], [S.post / 2, g.y1, g.postTop]),
    box([-S.tab[0] / 2, g.y1 - 10, g.postTop - S.tab[2]], [S.tab[0] / 2, g.y1 + S.tab[1], g.postTop]),
  ];
}
export const FRINGE_SWAN_NECK = defineRackPart({
  id: 'fringe-sport-the-swan-neck', name: 'Fringe Sport The Swan Neck', title: 'Fringe Sport The Swan Neck', noun: 'swivel mount', section: DIPS,
  description: 'Swivel mount and vertical storage hook for the Fringe belt squat lever arm · bolts to the upright with two M24 bolts · red pop-pin lock · 380 x 280 x 150 mm · 11.5 lb. Independent reconstruction; Fringe Sport trademarks belong to Fringe Sport.',
  params: [{ key: 'magpin', label: 'Package', default: 0, options: [0, 1], format: v => ['The Swan Neck', 'With 5/8 in magpin'][v] ?? String(v) }],
  vendor: {
    vendor: 'Fringe Sport', url: 'https://www.fringesport.com/products/the-swan-neck',
    credit: 'Fringe Sport — The Swan Neck (FS-VertStorage-SwanNeck-V3)', trademark: 'Fringe Sport is a trademark of Fringe Sport.',
    reconstruction: 'Published 380 x 280 x 150 mm, 11.5 lb net, matte black powder coat, M24 mounting bolts (not for 5/8 in racks) and the optional 5/8 in magpin. Hinge leaves, swivel box, post and slotted hook tab estimated from the product photos; physical fit unverified.',
  },
  mount: { pin: SWAN.bolt, holes: [0, -SWAN.span], extent: p => ({ below: SWAN.span * (p.mountSpacing ?? 50) + 40, above: swanLayout(p).postTop + 2 }) },
  bodies: swanBodies,
  pair: { default: false },
  placement: { height: 1000, face: 'front' },
});
