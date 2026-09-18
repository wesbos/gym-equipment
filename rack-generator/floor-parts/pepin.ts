import { PAINT_SWATCHES } from '../appearance.ts';
import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
/** REP x PÉPIN FAST Series: per-dumbbell max per pair size (65/85/105/125 lb pairs are sold per hand). */
export const PEPIN_VARIANTS = [65, 85, 105, 125] as const;
/** Published/measured envelope (mm): 188 mm plates, 125 mm × 34 mm grip, 12.25 mm plate pitch
 * (36.8 / 41.7 / 46.5 cm dumbbell lengths at 85 / 105 / 125 lb), cradle 135 mm base / 155 mm bookends,
 * 205 mm loaded height. The cradle base is fixed; bookends move to pre-drilled stations per variant. */
export const PEPIN = { plate: 188, pitch: 12.25, steel: 11.5, head: 27, cap: 8, grip: 125, handle: 34, lift: 17,
  cradleLength: 490, cradleWidth: 135, bookendWidth: 155, bookendHeight: 125, restGap: 80 } as const;
/** Main 5 lb plates per side: two per 20 lb add-on pair. Two 2.5 lb micro plates live in the handle. */
export const pepinPlates = (variant: number) => (variant - 15) / 10;
export const pepinWeights = (variant: number) => Array.from({length:(variant - 10) / 5 + 1}, (_, i) => 10 + i * 5);
/** 10 lb pop-pin stations select plates from the headplate outward; the 5 lb step engages both micro plates. */
export const pepinSelection = (weight: number) => ({ plates: Math.floor((weight - 10) / 10), micro: (weight - 10) % 10 === 5 });
/** Dumbbell length with `plates` per side (handle, headplates, plates and end selector strips). */
export const pepinLength = (plates: number) => PEPIN.grip + 2 * (PEPIN.head + plates * PEPIN.pitch + PEPIN.cap);
const pounds = (v: number) => `${v} lb`;
const dumbbellBox = (p: NumericParams): FloorBox => p.rest
  ? { width: 2 * PEPIN.plate + PEPIN.restGap, depth: PEPIN.cradleLength, offset: [(PEPIN.plate + PEPIN.restGap) / 2, 0] }
  : { width: PEPIN.plate, depth: PEPIN.cradleLength };
export const PEPIN_DUMBBELL = defineFloorPart({
  id: 'rep-pepin-dumbbell', name: 'REP x PÉPIN FAST Series', title: 'REP x PÉPIN FAST adjustable dumbbell', noun: 'dumbbell',
  description: 'REP x PÉPIN FAST Series adjustable dumbbell in its steel cradle. Independent reconstruction; REP and PÉPIN trademarks belong to their owners.',
  params: [
    { key: 'variant', label: 'Set size', default: 85, options: PEPIN_VARIANTS, format: v => `${v} lb${v === 125 ? ' (max)' : ''}` },
    { key: 'weight', label: 'Weight setting', default: 85, options: p => pepinWeights(p.variant), format: pounds },
    { key: 'rest', label: 'Dumbbell', default: 0, options: [0, 1], format: v => ['Racked in cradle', 'Set down beside cradle'][v] },
  ],
  footprint: dumbbellBox,
  placement: { side: 'left', gap: 300 },
  // Step-between stance, matching the REP stand's 16.3" opening.
  pair: { gap: 400 },
  vendor: {vendor:'REP Fitness',url:'https://repfitness.com/products/rep-x-pepin-fast-series-adjustable-dumbbell',credit:'REP Fitness — REP x PÉPIN FAST Series adjustable dumbbell (DBS-7000)',trademark:'REP is a trademark of REP Fitness; PÉPIN and FAST Series are trademarks of Pépin.',reconstruction:'Independent Manifold reconstruction from published lengths (36.8–46.5 cm), 34 mm handle, 188 mm plates, cradle envelope and product photos. Plate profile, rail and selector details estimated; scenery only, excluded from print export.'},
});
/** REP Adjustable Dumbbell Stand, REP x PÉPIN trays (DBA-7000-01): 31" × 22.3", four 1" leg stations. */
export const STAND_HEIGHTS = [18, 19, 20, 21] as const;
export const STAND = { width: 787, length: 566, opening: 414, trayWidth: 183, trayLength: 503 } as const;
export const STAND_COLORS = PAINT_SWATCHES.filter(([name]) => ['Metallic Black','White','Matte Black'].includes(name));
export const PEPIN_STAND = defineFloorPart({
  id: 'rep-pepin-stand', name: 'REP Adjustable Dumbbell Stand', title: 'REP adjustable dumbbell stand', noun: 'dumbbell stand',
  description: 'REP Adjustable Dumbbell Stand with REP x PÉPIN FAST Series trays. Independent reconstruction; REP trademarks belong to REP Fitness.',
  params: [
    { key: 'height', label: 'Tray height', default: 18, options: STAND_HEIGHTS, format: v => `${v}"` },
    { key: 'load', label: 'Dumbbells', default: 85, options: [0, ...PEPIN_VARIANTS], format: v => v ? `${v} lb pair in cradles` : 'Empty trays' },
  ],
  footprint: { width: STAND.width, depth: STAND.length },
  placement: { side: 'left', gap: 400 },
  colors: STAND_COLORS, colorLabel: 'Stand color',
  vendor: {vendor:'REP Fitness',url:'https://repfitness.com/products/rep-adjustable-dumbbell-stand',credit:'REP Fitness — Adjustable Dumbbell Stand (DBA-7000-01)',trademark:'REP is a trademark of REP Fitness; PÉPIN is a trademark of Pépin.',reconstruction:'Independent Manifold reconstruction from published 31" × 22.3" footprint, 18–21" tray heights, 7.2" × 19.8" trays, 16.3" opening and product photos. Tube sections, casters and add-on plate holder estimated; trays modelled straight; scenery only, excluded from print export.'},
});
