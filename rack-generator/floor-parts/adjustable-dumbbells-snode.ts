/** Adjustable dumbbells family: Snode AD80 (metadata only, no Manifold imports). */
import { defineFloorPart } from '../floor-part.ts';
import type { FloorPart } from '../floor-part.ts';
import { POSE_OPTIONS, poseLabel, pounds } from './adjustable-dumbbells-common.ts';
/** Published (snodesport.com / Northern Fitness): dumbbell 460 × 170 × 170 mm at 80 lb, cradle 490 × 190 × 90 mm,
 * grip 115 mm × Ø36 knurled chrome. Seven 5 lb plates per side are picked up from the inside out by the collar dial
 * (10 lb handle + 10 lb per setting). Plate pitch, hub and cone lengths are solved from the 460 mm envelope (research notes). */
export const SNODE = { length: 460, plate: 170, grip: 115, gripDiameter: 36, cone: 35, hub: 22, pitch: 16.5, plates: 7,
  cradleLength: 490, cradleWidth: 190, cradleHeight: 90, plateBottom: 18, cap: 14, capDiameter: 38 } as const;
export const SNODE_WEIGHTS = [10, 20, 30, 40, 50, 60, 70, 80] as const;
/** Plates carried per side at a dial setting. */
export const snodePlates = (weight: number) => (weight - 10) / 10;
export const SNODE_AD80 = defineFloorPart({
  id: 'snode-ad80', name: 'Snode AD80', title: 'Snode AD80 adjustable dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'Snode AD80 quick-adjusting dumbbell in its cast-iron cradle: 10–80 lb collar dial, dovetailed round plates and optional 1.25 lb magnetic caps. Independent reconstruction from published dimensions; Snode trademarks belong to Snode.',
  params: [
    { key: 'weight', label: 'Dial setting', default: 50, options: SNODE_WEIGHTS, format: pounds },
    { key: 'caps', label: 'Magnetic 1.25 lb caps', default: 0, options: [0, 1, 2], format: v => ['None', '1 per end (+2.5 lb)', '2 per end (+5 lb)'][v] ?? String(v) },
    { key: 'pose', label: 'Dumbbell', default: 0, options: POSE_OPTIONS, format: poseLabel },
  ],
  footprint: { width: SNODE.cradleWidth, depth: SNODE.cradleLength },
  placement: { side: 'left', gap: 300 },
  pair: { gap: 60 },
  vendor: {vendor:'Snode',url:'https://www.snodesport.com/products/ad-80-quick-adjusting-dumbbells',credit:'Snode — AD80 quick-adjusting dumbbell',trademark:'Snode and AD80 are trademarks of Snode.',reconstruction:'Independent Manifold reconstruction from published 460 × 170 × 170 mm dumbbell, 490 × 190 × 90 mm cradle, 115 mm × Ø36 grip, 10 lb steps and product photos. Plate thickness, hub/cone lengths, dovetail seam pattern, cradle end blocks and plate seat height estimated; scenery only, excluded from print export.'},
});
export const PARTS = [SNODE_AD80] as const satisfies readonly FloorPart[];
