/** Adjustable dumbbells family: Eisenlink Adjustable Square Dumbbell (metadata only, no Manifold imports). */
import { defineFloorPart } from '../floor-part.ts';
import type { FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { pounds } from './adjustable-dumbbells-common.ts';
/** Eisenlink kits: 50 lb (6 × 5 lb + 2 × 2.5 lb plates) and 80 lb (12 × 5 lb + 2 × 2.5 lb) per dumbbell. */
export const EISENLINK_SETS = [50, 80] as const;
/** Published (mm): 7.2" (183) square plates, 0.4" (10.2) 5 lb plates, 11.2" (284) long at 50 lb, 6.8" (173) clear
 * 35.5 mm knurled handle. Estimated: 10.5 mm fixed end plates, 2.5 lb plates as thick as the 5 lb (weight saved by the
 * window), Ø94 × 14 mm screw heads that sink 9.8 mm into the 2.5 lb plate window (closes the published 284 mm). */
export const EISENLINK = { plate: 183, corner: 24, plateT: 10.2, endT: 10.5, grip: 173, gripDiameter: 35.5, head: 94, headT: 14, recess: 9.8 } as const;
export const eisenlinkWeights = (set: number) => Array.from({ length: (set - 10) / 5 + 1 }, (_, i) => 10 + 5 * i);
/** 10 lb bare handle; 15 lb adds the two 2.5 lb screws; then one 5 lb plate per side per 10 lb, the 2.5 lb plates on the odd 5. */
export function eisenlinkSelection(weight: number) {
  if (weight < 15) return { screws: false, plates: 0, small: false };
  return { screws: true, plates: Math.floor((weight - 15) / 10), small: (weight - 15) % 10 === 5 };
}
/** Loaded length: only the plates on the dumbbell count, so it grows with the weight. */
export function eisenlinkLength(weight: number) {
  const { screws, plates, small } = eisenlinkSelection(weight), E = EISENLINK;
  return E.grip + 2 * (E.endT + plates * E.plateT + (small ? E.plateT : 0) + (screws ? E.headT - (small ? E.recess : 0) : 0));
}
const validSetting = (p: NumericParams) => (EISENLINK_SETS as readonly number[]).includes(p.set) && eisenlinkWeights(p.set).includes(p.weight);
export const EISENLINK_SQUARE = defineFloorPart({
  id: 'eisenlink-square-dumbbell', name: 'Eisenlink Square Dumbbell', title: 'Eisenlink adjustable square dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'Eisenlink Adjustable Square Dumbbell: slide-on square steel plates on locating pins, held by chrome end screws; only the loaded plates are on the handle, so it grows with the weight. Independent reconstruction from published dimensions; Eisenlink trademarks belong to Eisenlink.',
  params: [
    { key: 'set', label: 'Set size', default: 50, options: EISENLINK_SETS, format: v => `10–${v} lb` },
    { key: 'weight', label: 'Loaded weight', default: 50, options: p => eisenlinkWeights(p.set), format: pounds },
  ],
  footprint: p => ({ width: EISENLINK.plate, depth: validSetting(p) ? eisenlinkLength(p.weight) : eisenlinkLength(50) }),
  placement: { side: 'left', gap: 300 },
  pair: { gap: 60 },
  vendor: {vendor:'Eisenlink',url:'https://eisenlink.com/collections/square-dumbbell',credit:'Eisenlink — Adjustable Square Dumbbell (A030)',trademark:'Eisenlink is a trademark of Eisenlink.',reconstruction:'Independent Manifold reconstruction from the published 7.2" square plates, 0.4" 5 lb plates, 11.2" length at 50 lb, 6.8" × 35.5 mm handle and 3.7" screws, plus product photos. End-plate and 2.5 lb plate thickness, screw head size, slot, window and pin positions estimated; scenery only, excluded from print export.'},
});
export const PARTS = [EISENLINK_SQUARE] as const satisfies readonly FloorPart[];
