/** Rogue Monster Mini Feet (#133, shipped with registry v2 #178): the first floor-standing rack part. Metadata only
 * (main bundle): no Manifold imports. Research: research/rack-registry-v2.md.
 * Frame (rack-part.ts): origin on the upright centreline at the lower bolt hole, +Y out of the mounting face, Z up.
 * The foot bolts through the lowest hole and the hole 6 in above it and stands on the floor: `holeHeight` (opt-in
 * context) is the lower bolt's height, so the vertical leg always reaches z = -holeHeight. */
import { defineRackPart, PIN_1IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions } from '../types.ts';
const inch = (v: number) => v * 25.4;
/** Published: 13 in from the mounting face, 3 in wide, 6.75 in floor to the top of the foot tube, 3x3 11-gauge tube,
 * two 1 x 5 in bolts per foot, 9 lb each. The bolt spacing (holes #1 and #4, 6 in), the 3/8 in plate and the leg and
 * floor-tab sizes are estimated from Rogue's instruction drawings and 16 photos. */
export const MINI_FEET = {
  reach: inch(13), tube: inch(3), wall: 3.05, tubeTop: inch(6.75), boltSpan: inch(6),
  /** Floor to the lower bolt on a Monster upright (derived: tube centred between the bolts, 6.75 - 1.5 - 3 in). */ lowerBolt: inch(2.25),
  plate: { t: inch(3 / 8), w: inch(3), below: inch(1.5), above: inch(1.5) },
  /** Leg: the tube turns down through a mitred corner; its outer face 11 in from the mounting face. */ legOuter: inch(11),
  tab: { from: inch(8), to: inch(13), t: inch(.25), hole: inch(.5) },
  hole: inch(1.0625), bolt: inch(1), head: [inch(1.5), inch(.64)] as const, nut: [inch(1.5), inch(.87)] as const, washer: 3,
} as const;
/** Upright stations from the lower to the upper bolt on this pitch (3 on a 2 in or 50 mm lattice). */
export const feetStations = (p: NumericParams) => Math.max(1, Math.round(MINI_FEET.boltSpan / (p.mountSpacing ?? 50)));
export function miniFeetLayout(p: NumericParams) {
  const f = MINI_FEET, face = (p.upright ?? 75) / 2, upper = feetStations(p) * (p.mountSpacing ?? 50), floor = -(p.holeHeight ?? f.lowerBolt);
  const tubeZ = upper / 2, y0 = face + f.plate.t;
  return { face, upper, floor, tubeZ, y0, top: tubeZ + f.tube / 2, legIn: face + f.legOuter - f.tube, legOut: face + f.legOuter, plateTop: upper + f.plate.above, plateBottom: -f.plate.below };
}
const faceWidth = (p: NumericParams) => p.uprightWidth ?? p.upright ?? 75;
export const ROGUE_MONSTER_MINI_FEET = defineRackPart({
  id: 'rogue-monster-mini-feet', name: 'Rogue Monster Mini Foot', title: 'Rogue Monster Mini Feet', noun: 'mini foot', section: 'J-cups & safeties',
  description: 'Bolt-on 3x3 in 11-gauge stabiliser feet for Monster uprights: a plate on the upright face, a 1 in holed foot tube and a mitred leg down to a floor tab · 13 in from the upright, 6.75 in tall, two 1 in bolts each. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-mini-feet',
    credit: 'Rogue Fitness — Monster Mini Feet (RA1998) · Made in USA', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 13 in from the mounting face, 3 in width, 6.75 in to the top of the foot tube, 3x3 11-gauge tube and two 1 x 5 in bolts per foot. The 6 in bolt spacing, 3/8 in plate, leg and floor tab are estimated from Rogue instructions IS0491 and 16 Rogue, Gym Radar and owner photos; the leg follows the rack\'s real first-hole height to the floor; physical fit unverified.',
  },
  mount: {
    pin: PIN_1IN, holes: p => [0, feetStations(p)], mainStations: true,
    // Stands on the floor: the lower bolt must be 40–100 mm up (the lowest hole on Monster, BOS and REP uprights).
    floor: { min: 40, max: 100 },
    extent: p => ({ below: -miniFeetLayout(p).floor + 1, above: miniFeetLayout(p).plateTop + 1 }),
    validate: (_r: RackDimensions, p: NumericParams) => { const w = faceWidth(p); if (Math.abs(w - inch(3)) > 2.5) throw Error(`Monster Mini Feet fit a 3 in upright face, not ${(w / 25.4).toFixed(2)} in.`); },
  },
  bodies: p => {
    const l = miniFeetLayout(p), h = MINI_FEET.tube / 2;
    return [
      { min: [-h, l.y0 + 1, l.tubeZ - h], max: [h, l.legOut, l.top] },
      { min: [-h, l.legIn, l.floor], max: [h, l.face + MINI_FEET.tab.to, l.tubeZ - h] },
    ] as LocalBox[];
  },
  pair: { default: true },
  // The lowest hole on the front face; the foot projects forward like the rack's own base.
  placement: { height: 65, face: 'front' },
  context: ['holeHeight'],
  family: 'rack:feet',
});
export const FEET_PARTS = [ROGUE_MONSTER_MINI_FEET] as const satisfies readonly RackPart[];
