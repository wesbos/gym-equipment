/** Brand monolift attachments (#133): Rogue AM-2 / AML-2 Adjustable Monolift 2.0 and Mutant Metals Snap-Back Rollers.
 * Metadata only (main bundle): no Manifold imports. Both project along +Y from the front face; z is relative to the
 * mounting pin. Profiles are (y out from the face, z) in mm and shared with the builder. Research: research/rack-jcups-safeties.md. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { NumericParams, RackDimensions, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
type Pt = [number, number];
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const faceWidth = (p: NumericParams) => p.uprightWidth ?? p.upright ?? 75;
const BAR_R = 14.25;
const fits3in = (name: string) => (_r: RackDimensions, p: NumericParams) => {
  const w = faceWidth(p); if (w < inch(2) - 1.5 || w > inch(3) + 2.5) throw Error(`${name} brackets fit 2 to 3 in upright faces, not ${(w / 25.4).toFixed(2)} in.`);
};

/** Published AM-2 (Monster) / AML-2 (Monster Lite): 16.75 in from the mounting face, 3.25 in jaw depth, 4 in overall /
 * 1.25 in jaw width, 14 in (AM-2) or 17 in (AML-2) tall, 18 in when loaded, 0.25 and 0.375 in steel, 8 in re-rack space. */
export const AM2 = {
  reach: inch(16.75), jawDepth: inch(3.25), width: inch(4), jaw: inch(1.25), plate: inch(.25), bracketT: inch(.375),
  /** Frame plates (two, 4 in apart overall): triangle from the bracket out to the handle root, with a triangular window. */
  frame: [[14, 48], [190, 48], [205, 20], [120, -70], [14, -70]] as Pt[],
  window: [[40, 30], [140, 30], [60, -40]] as Pt[],
  /** Red counterweight handle (between the frame plates) and the J jaw hanging below the frame. */
  handle: [[150, 36], [405, 36], [inch(16.75), 56], [inch(16.75), 76], [405, 96], [150, 96]] as Pt[],
  hook: [[112, -40], [152, -40], [222, -250], [272, -250], [272, -205], [287, -205], [287, -262], [273, -276], [214, -276], [198, -262]] as Pt[],
  bracket: { z0: -80, z1: 110, back: 60 }, lite: { extraDrop: inch(3) },
} as const;
export const amJaw = (p: NumericParams): Pt[] => AM2.hook.map(([y, z]) => [y, z < -100 && p.line ? z - AM2.lite.extraDrop : z]);
const amRest = (p: NumericParams): [number, number] => [247,-250 - (p.line ? AM2.lite.extraDrop : 0) + 6.35 + BAR_R];
export const ROGUE_AM_2_MONOLIFT = defineRackPart({
  id: 'rogue-am-2-monolift', name: 'Rogue AM-2 Monolift', title: 'Rogue AM-2 Adjustable Monolift 2.0', noun: 'monolift', section: 'J-cups & safeties',
  description: 'Rack-mounted adjustable monolift: MG black brackets on detent pins, a swinging frame with a red counterweight handle and 1.25 in red jaws in recessed UHMW · 16.75 in from the face, 3.25 in jaw, 8 in re-rack space · AM-2 (Monster, 1 in) or AML-2 (Monster Lite, 5/8 in). Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'line', label: 'Version', default: 0, options: [0, 1], format: v => ['AM-2 · Monster · 1 in pins', 'AML-2 · Monster Lite · 5/8 in pins'][v] ?? String(v) }],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-am-2-adjustable-monolift-2-0-monster',
    credit: 'Rogue Fitness — AM-2 / AML-2 Adjustable Monolift 2.0 · Made in USA', trademark: 'Rogue, Monster and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 16.75 in depth from the mounting face, 3.25 in jaw depth, 4 in / 1.25 in widths, 14 in / 17 in heights, 0.25 and 0.375 in steel and the MG black / texture red finishes. Frame outline, handle, jaw hook and pivot hardware estimated from Rogue photos; shown unloaded; physical fit unverified.',
  },
  mount: { pin: p => p.line ? PIN_5_8IN : PIN_1IN, extent: p => ({ below: 277 + (p.line ? AM2.lite.extraDrop : 0), above: 111 }), faces: ['front', 'back'], validate: fits3in('AM-2 monolift') },
  bodies: p => {
    const f = face(p), drop = p.line ? AM2.lite.extraDrop : 0;
    return [{ min: [-AM2.width / 2, f + 12, -72], max: [AM2.width / 2, f + AM2.reach, 96] }, { min: [-AM2.jaw / 2 - 6, f + 112, -276 - drop], max: [AM2.jaw / 2 + 6, f + 287, -72] }];
  },
  pair: { default: true },
  cradles: { kind: 'working', label: 'AM-2 Monolift', slots: p => [{ point: [0, face(p) + amRest(p)[0], amRest(p)[1]] as Vec3, axis: [1, 0, 0] as Vec3 }] },
  placement: p => ({ height: 1415 + (p.line ? AM2.lite.extraDrop : 0), face: 'front' }),
  autoFit: rack => ({ line: rack.holeDiameter >= PIN_1IN ? 0 : 1 }),
  family: 'monolift',
});

/** Published: under 23.5 lb per side, torsion springs, 0–5.5 in+ bar clearance, nylon rollers with 2-1/4 in usable
 * space, 2-3/16 in max bar, 3/8 in steel, dual ball-bearing pivot, fits 3x3 and 2x3 with 5/8–1 in holes. */
/** Photo-derived curves, in the mounting-face plane. Keep the continuous tangent at the beam and rear leg. */
const bezier = (a: Pt, b: Pt, c: Pt, d: Pt, segments = 40): Pt[] => Array.from({ length: segments + 1 }, (_, i) => {
  const u = i / segments, v = 1 - u;
  return [v ** 3 * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u ** 3 * d[0], v ** 3 * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u ** 3 * d[1]];
});
export const SNAP_BACK = {
  plate: inch(3 / 8), gap: 62, reach: 330, top: 45, bottom: -235,
  /** Deep top beam and narrow rear leg, with the MM windows at the upright end. */
  body: [[0, 45], [330, 45], [330, -25], ...bezier([245, -25], [125, -25], [60, -108], [60, -235]), [0, -235]] as Pt[],
  logo: [
    [[88, 27], [61, -1], [19, 27], [7, 27], [61, -23], [78, -3], [78, -32], [88, -21]],
    [[88, -36], [78, -25], [61, -45], [24, -11], [24, -77], [35, -86], [35, -39], [61, -60], [78, -41], [88, -52]],
  ] as Pt[][],
  pivot: [245, 10] as Pt,
  /** The broad curved channel hangs behind the nylon roller, ending in an inclined catch. */
  armOuter: bezier([245, 10], [120, -15], [58, -115], [69, -205]),
  armInner: bezier([219, -12], [166, -53], [107, -131], [99, -186]),
  catchY: 115, catchZ: -199, catchTilt: -32, rollerR: 21, rollerL: inch(2.25),
} as const;
/** A bar lies across the roller axis. Its working station is halfway along the tilted nylon roller. */
export const snapBarRest = (): Pt => {
  const a = SNAP_BACK.catchTilt * Math.PI / 180, r = SNAP_BACK.rollerR + BAR_R;
  return [SNAP_BACK.catchY - Math.sin(a) * r, SNAP_BACK.catchZ + Math.cos(a) * r];
};
export const SNAP_COLORS = [['Gloss Black', '#141517'], ['Flat White', '#e4e4e2'], ['Blue', '#0085c8'], ['Red', '#b3161c'], ['Neon Green', '#54d62c'], ['Clear Grind', '#9ea3a8']] as const;
export const MUTANT_METALS_SNAP_BACK_MONOLIFT = defineRackPart({
  id: 'mutant-metals-snap-back-monolift', name: 'Snap-Back Roller', title: 'Mutant Metals Snap-Back Rollers', noun: 'monolift', section: 'J-cups & safeties',
  description: 'Torsion-spring monolift catches: the swing arm carries a nylon roller catch in front of the upright and snaps back to clear the bar path; 3/8 in steel side plates with a dual ball-bearing pivot and 3D-printed lip covers · fits 3x3 and 2x3 racks with 5/8 to 1 in holes. Independent reconstruction; Mutant Metals trademarks belong to Mutant Metals.',
  params: [
    { key: 'pin', label: 'Pin', default: 1, options: [0, 1], format: v => ['5/8 in pin', '1 in pin'][v] ?? String(v) },
    { key: 'color', label: 'Body colour', default: 0, options: SNAP_COLORS.map((_, i) => i), format: v => SNAP_COLORS[v]?.[0] ?? String(v) },
    { key: 'arm', label: 'Swing arm colour', default: 3, options: SNAP_COLORS.map((_, i) => i), format: v => SNAP_COLORS[v]?.[0] ?? String(v) },
  ],
  vendor: {
    vendor: 'Mutant Metals', url: 'https://mutantmetals.com/products/p/mutant-metals-snap-roller-monos',
    credit: 'Mutant Metals — Snap-Back Rollers V1.1', trademark: 'Mutant Metals and Snap-Back Rollers are trademarks of Mutant Metals.',
    reconstruction: 'Published torsion-spring snap-back, 0–5.5 in clearance, 2-1/4 in roller space, 2-3/16 in max bar, 3/8 in steel, dual ball-bearing pivot and rack fits. The 330 × 280 mm frame outline, MM windows, formed arm, 32° inclined catch, lower clasp and round bearing caps are estimated from four owner reference photos; shown in the catch position; physical fit unverified.',
  },
  mount: { pin: p => p.pin ? PIN_1IN : PIN_5_8IN, extent: { below: 250, above: 46 }, faces: ['front', 'back'], validate: fits3in('Snap-Back Roller') },
  bodies: p => {
    const f = face(p), w = SNAP_BACK.gap / 2 + SNAP_BACK.plate;
    return [{ min: [-w, f + 1, SNAP_BACK.bottom], max: [w, f + SNAP_BACK.reach, SNAP_BACK.top] }, { min: [-31, f + 68, -247.1], max: [31, f + 163, -158] }];
  },
  pair: { default: true },
  cradles: { kind: 'working', label: 'Snap-Back Rollers', slots: p => [{ point: [0, face(p) + snapBarRest()[0], snapBarRest()[1]] as Vec3, axis: [1, 0, 0] as Vec3 }] },
  placement: { height: 1415, face: 'front' },
  autoFit: rack => ({ pin: rack.holeDiameter >= PIN_1IN ? 1 : 0 }),
  family: 'monolift',
});
export const MONOLIFT_PARTS = [ROGUE_AM_2_MONOLIFT, MUTANT_METALS_SNAP_BACK_MONOLIFT] as const satisfies readonly RackPart[];
