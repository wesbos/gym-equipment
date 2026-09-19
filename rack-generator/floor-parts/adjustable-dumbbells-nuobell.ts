/** Adjustable dumbbells family: NÜOBELL twist-handle dumbbells (metadata only, no Manifold imports). */
import { defineFloorPart, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { POSE_OPTIONS, poseLabel, pounds } from './adjustable-dumbbells-common.ts';
/** NB550 / NB580 sets: per-dumbbell maximum in lb. */
export const NUOBELL_SETS = [50, 80] as const;
/** Published (nuoathletics.com): 485 / 395 × 193 × 185 mm at max, 105 × Ø32 mm knurled aluminium grip.
 * Derived: 2.5 lb discs at a 7.5 mm pitch (9 / 15 per side) and a 77.5 mm hub + head plate per side. Cradle estimated. */
export const NUOBELL = { disc: 193, height: 185, pitch: 7.5, grip: 105, gripD: 32, hub: 77.5, clearance: 10,
  saddle: 20, saddleGap: 2, cradleWidth: 212, saddleHeight: 70 } as const;
/** Colourways: disc colour; hubs, comb tabs and cradle stay black (the BLK edition also blacks the grip). */
export const NUOBELL_COLORWAYS = [
  ['Classic black', '#34363a'], ['Tactical green', '#4b5a3c'], ['Red', '#b3242b'], ['Ash', '#c9cbcd'], ['Blue', '#2f9bd4'], ['Pink', '#e3a2b6'], ['All black', '#18191b'],
] as const;
export const nuobellDiscs = (set: number) => (set - 5) / 5;
/** 5 lb steps from the 5 lb handset: each step picks up one more 2.5 lb disc per side, inside out. */
export const nuobellWeights = (set: number) => Array.from({ length: nuobellDiscs(set) + 1 }, (_, i) => 5 + 5 * i);
export const nuobellSelection = (weight: number) => (weight - 5) / 5;
/** Dumbbell length with every disc on (the published L). */
export const nuobellLength = (set: number) => NUOBELL.grip + 2 * (NUOBELL.hub + nuobellDiscs(set) * NUOBELL.pitch);
export const nuobellCradleLength = (set: number) => nuobellLength(set) + 2 * (NUOBELL.saddleGap + NUOBELL.saddle);
export const NUOBELL_DUMBBELL = defineFloorPart({
  id: 'nuobell-adjustable-dumbbell', name: 'NÜOBELL', title: 'NÜOBELL adjustable dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'NÜOBELL twist-handle adjustable dumbbell (5–50 or 5–80 lb in 5 lb steps) in its portable cradle. Independent reconstruction from published dimensions; NÜOBELL trademarks belong to NÜO Athletics.',
  params: [
    { key: 'set', label: 'Set size', default: 80, options: NUOBELL_SETS, format: v => `${v} lb (NB5${v})` },
    { key: 'weight', label: 'Weight setting', default: 40, options: (p: NumericParams) => nuobellWeights(p.set), format: pounds },
    { key: 'colorway', label: 'Colourway', default: 0, options: NUOBELL_COLORWAYS.map((_, i) => i), format: v => NUOBELL_COLORWAYS[v]?.[0] ?? String(v) },
    { key: 'pose', label: 'Dumbbell', default: 0, options: POSE_OPTIONS, format: poseLabel },
  ],
  footprint: (p: NumericParams) => ({ width: NUOBELL.cradleWidth, depth: nuobellCradleLength(p.set) }),
  placement: { side: 'left', gap: 300 },
  pair: { gap: 60 },
  vendor: {vendor:'NÜO Athletics',url:'https://nuoathletics.com/products/nuobell-580',credit:'NÜO Athletics — NÜOBELL 550 / 580 adjustable dumbbells',trademark:'NÜOBELL and NÜO are trademarks of NÜO Athletics; SMRTFT is a trademark of its owner.',reconstruction:'Independent Manifold reconstruction from published 485 / 395 × 193 × 185 mm envelopes, the 105 × 32 mm grip, 5 lb steps and product photos. Disc pitch and hub length derived from the two published lengths; cradle saddles, rails, clips and comb-tab detail estimated; scenery only, excluded from print export.'},
});
export const PARTS = [NUOBELL_DUMBBELL] as const satisfies readonly FloorPart[];
