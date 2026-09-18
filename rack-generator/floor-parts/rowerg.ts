import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
const IN = 25.4;
/** Concept2 published envelopes (concept2.com/ergs/rowerg, Sep 2026). Storage is W × D on the floor, 54 in (137.2 cm) tall. */
export const ROWERG_SPECS = {
  length: 96 * IN, width: 24 * IN, monorail: 54 * IN, seatHeight: [14 * IN, 20 * IN],
  storage: [{ width: 25 * IN, depth: 33 * IN }, { width: 27 * IN, depth: 47 * IN }], storageHeight: 54 * IN,
  clearance: { width: 4 * 12 * IN, depth: 9 * 12 * IN },
} as const;
export const ROWERG_LEGS = ['Standard (14 in seat)', 'Tall (20 in seat)'] as const;
export const ROWERG_POSES = ['In use', 'Separated storage'] as const;
const storage = (p: NumericParams) => p.pose === 1;
const footprint = (p: NumericParams): FloorBox => storage(p) ? ROWERG_SPECS.storage[p.legs] : { width: ROWERG_SPECS.width, depth: ROWERG_SPECS.length };
export const ROWERG = defineFloorPart({
  id: 'concept2-rowerg', name: 'Concept2 RowErg', title: 'Concept2 RowErg rowing machine', noun: 'rower',
  description: 'Concept2 RowErg (Model D) with PM5. Independent reconstruction from published dimensions; Concept2 trademarks belong to Concept2, Inc.',
  params: [
    { key: 'legs', label: 'Legs', default: 0, options: [0, 1], format: v => ROWERG_LEGS[v] },
    { key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: v => ROWERG_POSES[v] },
  ],
  footprint,
  // 9 ft × 4 ft use clearance while assembled; separated for storage it needs only its own footprint.
  clearance: p => storage(p) ? footprint(p) : ROWERG_SPECS.clearance,
  // Left of the rack, away from the front working zone and the default right-side bench; the 4 ft clearance clears the rack.
  placement: { side: 'left', gap: 450 },
  vendor: {vendor:'Concept2',url:'https://www.concept2.com/ergs/rowerg',credit:'Concept2 — RowErg with PM5',trademark:'Concept2, RowErg and PM5 are trademarks of Concept2, Inc.',reconstruction:'Independent Manifold reconstruction from published length, width, seat heights, monorail length, storage envelopes and product photos. Section sizes, flywheel housing and linkage details estimated; scenery only, excluded from print export.'},
});
