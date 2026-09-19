/** Adjustable dumbbells family: MX Select EVO MX100 dial dumbbell (metadata only, no Manifold imports). */
import { defineFloorPart, type FloorPart } from '../floor-part.ts';
import { POSE_OPTIONS, poseLabel, pounds } from './adjustable-dumbbells-common.ts';
/** Published (MX Select brochure + dimension drawing): 10 × 5 lb plates per side, a 243 mm handset and 432 mm at 100 lb, 202 × 182 mm plates, 152 × Ø29 mm knurled grip, 475 mm × 211 mm in the cradle (pair footprint 475 × 415).
 * Derived: 9.45 mm plate pitch and a 45.5 mm handset head per side. Head, dial and cradle pocket sizes estimated from photos. */
export const MX100 = { plates: 10, pitch: 9.45, plateW: 202, plateH: 182, grip: 152, gripD: 29, contouredD: 36, head: 45.5,
  cradleLength: 475, cradleWidth: 207, height: 211, plateBottom: 29 } as const;
export const MX100_GRIPS = ['Knurled steel handle (MX100KS)', 'Contoured rubber handle (MX100CR)'] as const;
/** 10 dial settings, 10–100 lb. The weight legend's kg column (5.9 kg at dial 1, +4.4 kg per number, 45.4 kg at 10) and the
 * 432 mm length at 100 lb (all 10 plates per side on) mean dial k carries k plates per side: the bare handset is ≈1.5 kg
 * and the "10 lb" setting already includes the innermost pair of plates. */
export const mx100Weights = () => Array.from({ length: MX100.plates }, (_, i) => 10 + 10 * i);
export const mx100Selection = (weight: number) => weight / 10;
/** Dumbbell length with `plates` per side. */
export const mx100Length = (plates: number) => MX100.grip + 2 * (MX100.head + plates * MX100.pitch);
export const MX100_DUMBBELL = defineFloorPart({
  id: 'mx-select-evo-mx100', name: 'MX Select EVO MX100', title: 'MX Select EVO MX100 adjustable dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'MX Select EVO MX100 dial-select adjustable dumbbell (10–100 lb in 10 lb steps) in its nylon cradle. Independent reconstruction from published dimensions; MX Select trademarks belong to MX Select.',
  params: [
    { key: 'weight', label: 'Dial setting', default: 50, options: mx100Weights(), format: v => `${pounds(v)} (dial ${v / 10})` },
    { key: 'grip', label: 'Handle', default: 0, options: [0, 1], format: v => MX100_GRIPS[v] ?? String(v) },
    { key: 'pose', label: 'Dumbbell', default: 0, options: POSE_OPTIONS, format: poseLabel },
  ],
  footprint: { width: MX100.cradleWidth, depth: MX100.cradleLength },
  placement: { side: 'left', gap: 300 },
  // Published pair footprint 475 × 415 mm: two 207 mm cradles almost touching.
  pair: { gap: 1 },
  vendor: {vendor:'MX Select',url:'https://mxselect.com/products/evo-mx100-knurled-dumbbells/',credit:'MX Select — EVO MX100 adjustable dumbbells (MX100KS knurled / MX100CR contoured)',trademark:'MX Select and MX100 are trademarks of MX Select.',reconstruction:'Independent Manifold reconstruction from the published 243 / 432 mm lengths, 202 × 182 mm plate face, 152 × 29 mm grip, 475 × 211 mm cradle envelope and product photos. Plate pitch and head length derived; handset head diameter, dial, cradle pockets and decals estimated; scenery only, excluded from print export.'},
});
export const PARTS = [MX100_DUMBBELL] as const satisfies readonly FloorPart[];
