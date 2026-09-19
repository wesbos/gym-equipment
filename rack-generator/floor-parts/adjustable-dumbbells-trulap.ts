/** Adjustable dumbbells family: Trulap 8592 G4 (metadata only, no Manifold imports). */
import { defineFloorPart } from '../floor-part.ts';
import type { FloorPart } from '../floor-part.ts';
import { POSE_OPTIONS, poseLabel } from './adjustable-dumbbells-common.ts';
/** Published (trulap.com, GGR, Shredded Dad): 195 mm plates, 127 mm × Ø34 handle, 500 × 215 mm dock, length 267 mm at the
 * 4 kg minimum and 441 mm at 41.5 kg. 26 settings in 1.5 kg steps: each step adds one ≈7 mm chrome plate, alternating ends
 * (13 selectable plates on one end, 12 on the other). Hub, fixed core and dock heights are estimates (research notes). */
export const TRULAP = { plate: 195, pitch: 7, grip: 127, gripDiameter: 34, hub: 30, core: 40, plates: [13, 12] as const,
  dockLength: 500, dockWidth: 215, blockTop: 95, plateBottom: 75 } as const;
export const TRULAP_KG = Array.from({ length: 26 }, (_, i) => 4 + 1.5 * i);
/** Trulap's published lb chart for the 26 settings (GGR). */
export const TRULAP_LB = [8.5, 12, 15.5, 19, 21.5, 25, 28.5, 32, 35.5, 39, 42.5, 45, 48.5, 52, 55.5, 59, 62, 65, 68.5, 72, 75, 78.5, 82, 85.5, 89, 92] as const;
/** Plates carried on the [+X, −X] ends at a setting: 1.5 kg per step, alternating ends starting at +X. */
export const trulapPlates = (kg: number): [number, number] => { const n = Math.round((kg - 4) / 1.5); return [Math.ceil(n / 2), Math.floor(n / 2)]; };
/** Dumbbell length (mm) at a setting: handle with its hubs and fixed cores plus the carried plates. */
export const trulapLength = (kg: number) => { const [a, b] = trulapPlates(kg); return TRULAP.grip + 2 * (TRULAP.hub + TRULAP.core) + (a + b) * TRULAP.pitch; };
const format = (kg: number) => { const i = TRULAP_KG.indexOf(kg); return i < 0 ? `${kg} kg` : `${kg} kg · ${TRULAP_LB[i]} lb`; };
export const TRULAP_8592 = defineFloorPart({
  id: 'trulap-8592-g4', name: 'Trulap 8592 G4', title: 'Trulap 8592 G4 adjustable dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'Trulap 8592 G4 twist-handle adjustable dumbbell in its nylon dock: 26 settings from 4 to 41.5 kg (8.5–92 lb), bright chrome plates with interlocking top fins. Independent reconstruction from published dimensions; Trulap trademarks belong to Trulap.',
  params: [
    { key: 'weight', label: 'Weight setting', default: 20.5, options: TRULAP_KG, format },
    { key: 'pose', label: 'Dumbbell', default: 0, options: POSE_OPTIONS, format: poseLabel },
  ],
  footprint: { width: TRULAP.dockWidth, depth: TRULAP.dockLength },
  placement: { side: 'left', gap: 300 },
  pair: { gap: 60 },
  vendor: {vendor:'Trulap',url:'https://trulap.com/products/8592g4',credit:'Trulap — 8592 G4 adjustable dumbbell',trademark:'Trulap is a trademark of Trulap.',reconstruction:'Independent Manifold reconstruction from published 195 mm plates, 127 mm × Ø34 handle, 500 × 215 mm dock, 267–441 mm length range, 26 × 1.5 kg settings and product photos. Plate split per end (13/12, alternating), hub and core lengths, fin comb and dock leg heights estimated; scenery only, excluded from print export.'},
});
export const PARTS = [TRULAP_8592] as const satisfies readonly FloorPart[];
