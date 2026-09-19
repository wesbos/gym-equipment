/** Concept2 and Rogue Echo ergs and air bikes. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 * Sources, published dimensions and estimates: research/ergs.md. */
import { defineFloorPart, type FloorBox, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';

const inch = (v: number) => Math.round(v * 25.4);
const pick = <T,>(list: readonly T[], i: number, what: string): T => { const v = list[i]; if (v === undefined) throw Error(`Unsupported ${what}.`); return v; };
const POSES = ['In use', 'Separated for storage'] as const;
const pose = { key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: (v: number) => POSES[v] ?? String(v) };
const C2_TRADEMARK = 'Concept2, RowErg, BikeErg, SkiErg and PM5 are trademarks of Concept2, Inc.';

// ---- Concept2 indoor rowers (RowErg = current Model D; Model C predecessor).
export type C2Model = 'rowerg' | 'd' | 'c';
export type C2Monitor = 'pm5' | 'pm4' | 'pm3' | 'pm2';
export interface C2RowerConfig { model: C2Model; tall: boolean; colour: number; monitor: C2Monitor; storage: boolean }
export const C2_MONITORS: Record<C2Model, readonly C2Monitor[]> = { rowerg: ['pm5'], d: ['pm5', 'pm4', 'pm3'], c: ['pm3', 'pm2'] };
export function c2RowerConfig(model: C2Model, p: NumericParams): C2RowerConfig {
  return { model, tall: model === 'rowerg' && p.legs === 1, colour: model === 'd' ? p.colour ?? 0 : 0, monitor: pick(C2_MONITORS[model], p.monitor ?? 0, 'rower monitor'), storage: p.pose === 1 };
}
/** Published 96 × 24 in assembled; 9 × 4 ft use area; storage 25 × 33 × 54 in (standard) / 27 × 47 × 54 in (tall).
 * `stored` is the modelled separated pose (front section resting on casters + housing rim, monorail stood beside it); see research/ergs.md. */
export const C2_ROWER = { length: 2440, width: 610, clearance: { width: 1220, depth: 2740 }, storage: { standard: { width: 635, depth: 838 }, tall: { width: 686, depth: 1194 }, height: 1372 },
  stored: { standard: { width: 645, depth: 880 }, tall: { width: 645, depth: 1034 }, modelC: { width: 645, depth: 889 } } } as const;
const c2Footprint = (c: C2RowerConfig): FloorBox => c.storage ? { ...C2_ROWER.stored[c.model === 'c' ? 'modelC' : c.tall ? 'tall' : 'standard'] } : { width: C2_ROWER.width, depth: C2_ROWER.length };
const c2Clearance = (c: C2RowerConfig): FloorBox => c.storage ? c2Footprint(c) : { ...C2_ROWER.clearance };
const c2Vendor = (model: string, url: string, extra: string) => ({ vendor: 'Concept2', url, credit: `Concept2 — ${model}`, trademark: C2_TRADEMARK,
  reconstruction: `Independent Manifold reconstruction from Concept2's published length, width, seat height, monorail length and storage dimensions, the official parts schematics and product photos. ${extra} Flywheel internals, beam sections and fastener positions estimated; scenery only, excluded from print export.` });

export const CONCEPT2_ROWERG = defineFloorPart({
  id: 'concept2-rowerg', name: 'Concept2 RowErg', title: 'Concept2 RowErg rower', noun: 'rower', section: 'Cardio',
  description: 'Concept2 RowErg with PM5, standard (14 in) or tall (20 in) legs, rowing or separated into its two storage pieces. Independent reconstruction from published dimensions; Concept2 trademarks belong to Concept2, Inc.',
  params: [
    { key: 'legs', label: 'Legs', default: 0, options: [0, 1], format: v => ['Standard (14 in seat)', 'Tall (20 in seat)'][v] ?? String(v) },
    pose,
  ],
  footprint: p => c2Footprint(c2RowerConfig('rowerg', p)), clearance: p => c2Clearance(c2RowerConfig('rowerg', p)),
  placement: { side: 'right', gap: 350 },
  vendor: c2Vendor('RowErg (PM5)', 'https://www.concept2.com/ergs/rowerg', 'Tall legs raise the monorail 6 in; storage pose follows the published separated footprint.'),
});
export const CONCEPT2_MODEL_D = defineFloorPart({
  id: 'concept2-model-d', name: 'Concept2 Model D', title: 'Concept2 Model D rower', noun: 'rower', section: 'Cardio',
  description: 'Concept2 Model D indoor rower (2003–2020) in black or light blue-grey with its PM5, PM4 or PM3 monitor. Independent reconstruction from published dimensions; Concept2 trademarks belong to Concept2, Inc.',
  params: [
    { key: 'colour', label: 'Colour', default: 0, options: [0, 1], format: v => ['Black', 'Light grey / blue'][v] ?? String(v) },
    { key: 'monitor', label: 'Monitor', default: 0, options: [0, 1, 2], format: v => ['PM5', 'PM4', 'PM3'][v] ?? String(v) },
    pose,
  ],
  footprint: p => c2Footprint(c2RowerConfig('d', p)), clearance: p => c2Clearance(c2RowerConfig('d', p)),
  placement: { side: 'right', gap: 350 },
  vendor: c2Vendor('Model D Indoor Rower', 'https://www.concept2.com/support/indoor-rowers/model-d', 'Colourways follow the black and light blue-grey parts schematics.'),
});
export const CONCEPT2_MODEL_C = defineFloorPart({
  id: 'concept2-model-c', name: 'Concept2 Model C', title: 'Concept2 Model C rower', noun: 'rower', section: 'Cardio',
  description: 'Concept2 Model C indoor rower (1993–2003): grey front frame, black monorail, caged flywheel with the round front grille and PM3 or PM2 monitor. Independent reconstruction from published dimensions; Concept2 trademarks belong to Concept2, Inc.',
  params: [
    { key: 'monitor', label: 'Monitor', default: 0, options: [0, 1], format: v => ['PM3', 'PM2'][v] ?? String(v) },
    pose,
  ],
  footprint: p => c2Footprint(c2RowerConfig('c', p)), clearance: p => c2Clearance(c2RowerConfig('c', p)),
  placement: { side: 'right', gap: 350 },
  vendor: c2Vendor('Model C Indoor Rower', 'https://www.concept2.com/support/indoor-rowers/model-c', 'Model C shares the Model D envelope; its caged flywheel and fixed monitor arm follow the Model C schematic.'),
});
/** Rogue: 99 × 26 in, 16 in seat height; 38 × 26 in folded (`foldedModel` = the modelled resting pose, 36.3 in). */
export const ECHO_ROWER = { length: inch(99), width: inch(26), folded: { width: inch(26), depth: inch(38) }, foldedModel: { width: inch(26), depth: 921 } } as const;
export const echoRowerFolded = (p: NumericParams) => p.pose === 1;
export const ROGUE_ECHO_ROWER = defineFloorPart({
  id: 'rogue-echo-rower', name: 'Rogue Echo Rower', title: 'Rogue Echo Rower', noun: 'rower', section: 'Cardio',
  description: 'Rogue Echo Rower: texture-black steel, wide ROGUE front beam, splayed front legs on four turf tyres and a hinged monorail that folds up for storage. Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: v => ['In use', 'Folded for storage'][v] ?? String(v) }],
  footprint: p => echoRowerFolded(p) ? { ...ECHO_ROWER.foldedModel } : { width: ECHO_ROWER.width, depth: ECHO_ROWER.length },
  clearance: p => echoRowerFolded(p) ? { ...ECHO_ROWER.foldedModel } : { width: C2_ROWER.clearance.width, depth: ECHO_ROWER.length + 300 },
  placement: { side: 'right', gap: 350 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-echo-rower', credit: 'Rogue Fitness — Echo Rower', trademark: 'Rogue and Echo are trademarks of Rogue Fitness.',
    reconstruction: 'Independent Manifold reconstruction from Rogue\'s published length, width, seat height and folded footprint, and product photos. Beam, leg and housing sections estimated from photos; use area follows the Concept2 rower zone (no Rogue figure). Scenery only, excluded from print export.' },
});


// ---- Air bikes. Envelope = published L × W × H; use area = ISO 20957-1 free area (0.6 m round the machine) where the maker publishes none.
export interface AirBikeInfo { length: number; width: number; height: number }
export const AIR_BIKES = {
  /** Rogue: 55 in L (seat furthest from the fan) × 29.5 in W (handles) × 52.25 in H (top of handles). */
  echo: { length: inch(55), width: inch(29.5), height: inch(52.25) },
  /** Assault Fitness spec panel: 50.95 × 23.34 × 50 in (129.4 × 59.3 × 127 cm). */
  assault: { length: 1294, width: 593, height: 1270 },
  /** Bells of Steel: 53 × 23 × 51 in (135 × 58 × 130 cm). */
  blitz: { length: inch(53), width: inch(23), height: inch(51) },
  /** REP: 57.41 × 27.23 × 53.24 in (1458 × 692 × 1352 mm). */
  strive: { length: 1458, width: 692, height: 1352 },
  /** Schwinn: 53 × 26.5 × 53 in (134.6 × 67.3 × 134.6 cm). */
  ad7: { length: 1346, width: 673, height: 1346 },
  /** Schwinn: 49.7 × 25.7 × 50.9 in (126.2 × 65.3 × 129.3 cm). */
  ad6: { length: 1262, width: 653, height: 1293 },
} as const satisfies Record<string, AirBikeInfo>;
const ISO_FREE = 600;
const bikeBox = (b: AirBikeInfo): FloorBox => ({ width: b.width, depth: b.length });
const bikeClearance = (b: AirBikeInfo): FloorBox => ({ width: b.width + 2 * ISO_FREE, depth: b.length + 2 * ISO_FREE });
const bikeReconstruction = (maker: string, extra: string) => `Independent Manifold reconstruction from ${maker}'s published length, width and height and product photos. ${extra} Tube sections, fork and backbone layout, blade pitch and guard wire counts estimated from photos; use area is the ISO 20957-1 0.6 m free zone (no maker figure). Scenery only, excluded from print export.`;
function airBike<const Id extends string>(id: Id, name: string, title: string, key: keyof typeof AIR_BIKES, description: string, vendor: { vendor: string; url: string; credit: string; trademark: string; reconstruction: string }) {
  return defineFloorPart({ id, name, title, noun: 'bike', section: 'Cardio', description, params: [], footprint: bikeBox(AIR_BIKES[key]), clearance: bikeClearance(AIR_BIKES[key]), placement: { side: 'right', gap: ISO_FREE + 50 }, vendor });
}
export const ROGUE_ECHO_BIKE = airBike('rogue-echo-bike', 'Rogue Echo Bike', 'Rogue Echo Bike V3.0', 'echo',
  'Rogue Echo Bike V3.0 air bike: belt-driven 27 in steel fan in a full steel-wire guard, textured black frame, 11 × 5 seat settings. Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-echo-bike', credit: 'Rogue Fitness — Echo Bike V3.0', trademark: 'Rogue and Echo Bike are trademarks of Rogue Fitness.',
    reconstruction: bikeReconstruction('Rogue', 'The 27 in fan, 23.75 × 44.5 in foot footprint and the official dimension drawing are published.') });
export const ASSAULT_BIKE_CLASSIC = airBike('assault-airbike-classic', 'AssaultBike Classic', 'AssaultBike Classic', 'assault',
  'Assault Fitness AssaultBike Classic air bike: black round-tube frame, wire-guarded steel fan, U-shaped rear foot and centre floor rail. Independent reconstruction from published dimensions; Assault Fitness trademarks belong to Assault Fitness.',
  { vendor: 'Assault Fitness', url: 'https://www.assaultfitness.com/bikes/assault-bike-classic/', credit: 'Assault Fitness — AssaultBike Classic', trademark: 'AssaultBike and Assault Fitness are trademarks of Assault Fitness.',
    reconstruction: bikeReconstruction('Assault Fitness', 'Assault also lists 48.4 in height in its FAQ; the 50 in spec-panel figure is used.') });
export const SCHWINN_AIRDYNE_AD7 = airBike('schwinn-airdyne-ad7', 'Schwinn Airdyne AD7', 'Schwinn Airdyne AD7', 'ad7',
  'Schwinn Airdyne AD7 air bike: grey frame with red accents, wide black paddle fan behind a wire guard, raked fork with the SCHWINN lettering. Independent reconstruction from published dimensions; Schwinn and Airdyne trademarks belong to their owners.',
  { vendor: 'Schwinn Fitness', url: 'https://www.schwinnfitness.com/products/schwinn-airdyne-ad7', credit: 'Schwinn Fitness — Airdyne AD7', trademark: 'Schwinn and Airdyne are trademarks of Pacific Cycle / Johnson Health Tech.',
    reconstruction: bikeReconstruction('Schwinn', 'Minimum ceiling height user + 17.6 in is published.') });
export const SCHWINN_AIRDYNE_AD6 = airBike('schwinn-airdyne-ad6', 'Schwinn Airdyne AD6', 'Schwinn Airdyne AD6', 'ad6',
  'Schwinn Airdyne AD6 air bike: grey round-tube frame, grey crank shroud with the red Schwinn roundel, black wire fan guard. Independent reconstruction from published dimensions; Schwinn and Airdyne trademarks belong to their owners.',
  { vendor: 'Schwinn Fitness', url: 'https://www.schwinnfitness.com/products/schwinn-airdyne-ad6', credit: 'Schwinn Fitness — Airdyne AD6', trademark: 'Schwinn and Airdyne are trademarks of Pacific Cycle / Johnson Health Tech.',
    reconstruction: bikeReconstruction('Schwinn', 'Minimum ceiling height user + 17.9 in is published.') });
export const REP_STRIVE_AIR_BIKE = airBike('rep-strive-air-bike', 'REP Strive Air Bike', 'REP Strive Air Bike (VPR)', 'strive',
  'REP Fitness Strive Air Bike featuring VPR: variable-pitch fan behind perforated magnetic covers, multi-grip handles, satin metallic black frame. Independent reconstruction from published dimensions; REP trademarks belong to REP Fitness.',
  { vendor: 'REP Fitness', url: 'https://repfitness.com/products/strive-air-bike-featuring-vpr', credit: 'REP Fitness — Strive Air Bike featuring VPR', trademark: 'REP, Strive and VPR are trademarks of REP Fitness.',
    reconstruction: bikeReconstruction('REP', 'The 35 mm grips and 100 mm casters are published.') });
export const BOS_BLITZ_AIR_BIKE = airBike('bos-blitz-air-bike', 'Bells of Steel Blitz', 'Bells of Steel Blitz Air Bike', 'blitz',
  'Bells of Steel Blitz Air Bike: 25 in fan, belt drive, inverted-U fork over the fan and the yellow BLITZ seat tube. Independent reconstruction from published dimensions; Bells of Steel trademarks belong to Bells of Steel.',
  { vendor: 'Bells of Steel', url: 'https://www.bellsofsteel.us/products/blitz-air-bike', credit: 'Bells of Steel — Blitz Air Bike', trademark: 'Bells of Steel and Blitz are trademarks of Bells of Steel.',
    reconstruction: bikeReconstruction('Bells of Steel', 'The 25 in fan is published.') });

// ---- Concept2 BikeErg: 48 × 24 in, clearance for use 60 × 48 in; seat-to-pedal 30.75–41 in, 10 in of handlebar height.
export const BIKEERG = { length: inch(48), width: inch(24), clearance: { width: inch(48), depth: inch(60) }, seat: [31, 33, 35, 37, 39, 41], bars: [0, 2.5, 5, 7.5, 10], pedalLow: 85 } as const;
export function bikeErgPositions(p: NumericParams) {
  if (!(BIKEERG.seat as readonly number[]).includes(p.seat) || !(BIKEERG.bars as readonly number[]).includes(p.bars)) throw Error('Unsupported bike erg setting.');
  return { seatTop: BIKEERG.pedalLow + inch(p.seat), barUp: inch(p.bars) };
}
export const CONCEPT2_BIKEERG = defineFloorPart({
  id: 'concept2-bikeerg', name: 'Concept2 BikeErg', title: 'Concept2 BikeErg', noun: 'bike', section: 'Cardio',
  description: 'Concept2 BikeErg with PM5: front flywheel housing, box-section frame, silver seat post and handlebar stem, bull-horn bars. Seat and handlebar heights follow the published fit ranges. Independent reconstruction from published dimensions; Concept2 trademarks belong to Concept2, Inc.',
  params: [
    { key: 'seat', label: 'Seat to pedal', default: 35, options: BIKEERG.seat, format: v => `${v} in` },
    { key: 'bars', label: 'Handlebar rise', default: 5, options: BIKEERG.bars, format: v => `${v} in` },
  ],
  footprint: { width: BIKEERG.width, depth: BIKEERG.length }, clearance: { ...BIKEERG.clearance }, placement: { side: 'right', gap: 350 },
  vendor: { vendor: 'Concept2', url: 'https://www.concept2.com/ergs/bikeerg', credit: 'Concept2 — BikeErg (PM5)', trademark: C2_TRADEMARK,
    reconstruction: 'Independent Manifold reconstruction from Concept2\'s published length, width, clearance for use, seat-to-pedal range, crank length and Q factor, the BikeErg fit-guide side drawing and product photos. Frame sections, housing width and handlebar bend estimated; scenery only, excluded from print export.' },
});

// ---- Ski ergs. Concept2 publishes floor-stand, wide-stand and wall-mount envelopes; Rogue publishes with / without its floor stand.
export type SkiBrand = 'c2' | 'echo';
export interface SkiStand { platform: readonly [number, number]; tube: number; uTop: number; uFoot: number }
export interface SkiMount { label: string; box: FloorBox; stand?: SkiStand; clearance: FloorBox }
/** Standing zone = floor-stand platform, plus the ISO 20957-1 0.6 m free zone at the sides and behind the skier (no maker figure). */
const skiClear = (box: FloorBox, standDepth: number): FloorBox => box.depth >= standDepth
  ? { width: box.width + 2 * ISO_FREE, depth: box.depth + ISO_FREE, offset: [0, ISO_FREE / 2] }
  : { width: Math.max(box.width, 600) + 2 * ISO_FREE, depth: box.depth + standDepth + ISO_FREE, offset: [0, (standDepth + ISO_FREE) / 2] };
export const SKI_ERGS = {
  /** Concept2: 85 in tall; floor stand 23.5 × 50 in, wide stand 32 × 52 in, wall mount 19 in (bottom) / 20.5 in (top) wide × 16 in deep. */
  c2: { height: inch(85), mounts: [
    { label: 'Floor stand', box: { width: 597, depth: 1270 }, stand: { platform: [597, 1270], tube: 540, uTop: 805, uFoot: 270 } },
    { label: 'Wide floor stand', box: { width: 813, depth: 1321 }, stand: { platform: [813, 1321], tube: 740, uTop: 805, uFoot: 290 } },
    { label: 'Wall mount', box: { width: 521, depth: 406 } },
  ] },
  /** Rogue: 85.5 in tall; 51 × 28 in with the floor stand, 19.5 × 24.5 in without. */
  echo: { height: 2172, mounts: [
    { label: 'Floor stand', box: { width: 711, depth: 1295 }, stand: { platform: [690, 1245], tube: 711, uTop: 880, uFoot: 350 } },
    { label: 'Wall / rack mount', box: { width: 495, depth: 622 } },
  ] },
} as const satisfies Record<SkiBrand, { height: number; mounts: readonly Omit<SkiMount, 'clearance'>[] }>;
export function skiMount(brand: SkiBrand, p: NumericParams): SkiMount {
  const list: readonly Omit<SkiMount, 'clearance'>[] = SKI_ERGS[brand].mounts, m = pick(list, p.mount ?? 0, 'ski erg mount');
  return { ...m, clearance: skiClear(m.box, SKI_ERGS[brand].mounts[0].box.depth) };
}
const mountParam = (brand: SkiBrand) => ({ key: 'mount', label: 'Mount', default: 0, options: SKI_ERGS[brand].mounts.map((_, i) => i), format: (v: number) => SKI_ERGS[brand].mounts[v]?.label ?? String(v) });
export const CONCEPT2_SKIERG = defineFloorPart({
  id: 'concept2-skierg', name: 'Concept2 SkiErg', title: 'Concept2 SkiErg', noun: 'ski erg', section: 'Cardio',
  description: 'Concept2 SkiErg with PM5 on its floor stand, wide floor stand or wall mount: tapered V arms to the pulley bar, lime handles, flywheel at the foot. Independent reconstruction from published dimensions; Concept2 trademarks belong to Concept2, Inc.',
  params: [mountParam('c2')],
  footprint: p => skiMount('c2', p).box, clearance: p => skiMount('c2', p).clearance, placement: { side: 'right', gap: ISO_FREE + 50 },
  vendor: { vendor: 'Concept2', url: 'https://www.concept2.com/ergs/skierg', credit: 'Concept2 — SkiErg (PM5)', trademark: C2_TRADEMARK,
    reconstruction: 'Independent Manifold reconstruction from Concept2\'s published height, floor-stand, wide-stand and wall-mount envelopes and product photos. Column, arm and flywheel sections estimated from photos; use area is the stand platform plus the ISO 20957-1 0.6 m free zone. Scenery only, excluded from print export.' },
});
export const ROGUE_ECHO_SKI = defineFloorPart({
  id: 'rogue-echo-ski', name: 'Rogue Echo SKI', title: 'Rogue Echo SKI', noun: 'ski erg', section: 'Cardio',
  description: 'Rogue Echo SKI: slotted V arms under the ROGUE pulley bar, orange handles, front fan with turf wheels, on the plywood floor stand or wall / rack mounted. Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  params: [mountParam('echo')],
  footprint: p => skiMount('echo', p).box, clearance: p => skiMount('echo', p).clearance, placement: { side: 'right', gap: ISO_FREE + 50 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-echo-ski', credit: 'Rogue Fitness — Echo SKI', trademark: 'Rogue and Echo are trademarks of Rogue Fitness.',
    reconstruction: 'Independent Manifold reconstruction from Rogue\'s published height and footprints with and without the floor stand, and product photos. Column, slot and fan sections estimated from photos; use area is the stand platform plus the ISO 20957-1 0.6 m free zone. Scenery only, excluded from print export.' },
});

export const PARTS = [ROGUE_ECHO_BIKE, CONCEPT2_ROWERG, CONCEPT2_MODEL_D, CONCEPT2_MODEL_C, ASSAULT_BIKE_CLASSIC, SCHWINN_AIRDYNE_AD7, SCHWINN_AIRDYNE_AD6, REP_STRIVE_AIR_BIKE, BOS_BLITZ_AIR_BIKE, CONCEPT2_SKIERG, ROGUE_ECHO_SKI, CONCEPT2_BIKEERG, ROGUE_ECHO_ROWER] as const satisfies readonly FloorPart[];
