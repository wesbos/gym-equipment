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
export const SNAP_BACK = {
  plate: inch(3 / 8), gap: 62, reach: 300, top: 40, bottom: -250,
  /** Side plates: top edge out from the face, concave arc down to the upright. */
  body: [[0, 40], [300, 40], [300, 10], [250, -5], [200, -35], [160, -80], [128, -140], [106, -200], [96, -250], [0, -250]] as Pt[],
  pivot: [270, 10] as Pt, armR: 20, catchY: 140, catchZ: -255, rollerR: 18, rollerL: inch(2.25),
} as const;
export const SNAP_COLORS = [['Gloss Black', '#141517'], ['Flat White', '#e4e4e2'], ['Blue', '#2273d0'], ['Red', '#b3161c'], ['Neon Green', '#54d62c'], ['Clear Grind', '#9ea3a8']] as const;
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
    reconstruction: 'Published torsion-spring snap-back, 0–5.5 in clearance, 2-1/4 in roller space, 2-3/16 in max bar, 3/8 in steel, dual ball-bearing pivot and rack fits. Body outline, arm curve, pivot and roller positions estimated from Mutant Metals owner photos; shown in the catch position; physical fit unverified.',
  },
  mount: { pin: p => p.pin ? PIN_1IN : PIN_5_8IN, extent: { below: 287, above: 41 }, faces: ['front', 'back'], validate: fits3in('Snap-Back Roller') },
  bodies: p => {
    const f = face(p), w = SNAP_BACK.gap / 2 + SNAP_BACK.plate;
    return [{ min: [-w, f + 1, -250], max: [w, f + SNAP_BACK.reach, 40] }];
  },
  pair: { default: true },
  cradles: { kind: 'working', label: 'Snap-Back Rollers', slots: p => [{ point: [0, face(p) + SNAP_BACK.catchY, SNAP_BACK.catchZ + SNAP_BACK.rollerR + BAR_R] as Vec3, axis: [1, 0, 0] as Vec3 }] },
  placement: { height: 1415, face: 'front' },
  autoFit: rack => ({ pin: rack.holeDiameter >= PIN_1IN ? 1 : 0 }),
  family: 'monolift',
});
export const MONOLIFT_PARTS = [ROGUE_AM_2_MONOLIFT, MUTANT_METALS_SNAP_BACK_MONOLIFT] as const satisfies readonly RackPart[];
