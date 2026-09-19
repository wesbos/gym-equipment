/** Adjustable dumbbells family: REP QuickDraw (metadata only, no Manifold imports). */
import { defineFloorPart } from '../floor-part.ts';
import type { FloorPart } from '../floor-part.ts';
import { POSE_OPTIONS, poseLabel, pounds } from './adjustable-dumbbells-common.ts';
/** REP QuickDraw pair sizes: per-dumbbell max. All sizes share the 20.6" cradle; smaller sets fill it with spacers. */
export const QUICKDRAW_SETS = [30, 40, 50, 60] as const;
/** Published REP spec table (mm): 523 × 215 × 119 cradle, 201 racked height, 185 plates, 137 mm clear 32 mm grip
 * (124 with the micro plates), lengths 310/363/417/470 mm. Derived: 26.7 mm plate pitch, 33 mm headplates, 6.35 mm micros. */
export const QUICKDRAW = { cradleLength: 523, cradleWidth: 215, cradleHeight: 119, rackedHeight: 201, plate: 185, flat: 9,
  grip: 137, gripDiameter: 32, micro: 6.35, head: 33, pitch: 26.7, groove: 1.5, maxPlates: 5 } as const;
/** 5 lb plates per side: 2/3/4/5 for the 30/40/50/60 lb sets. */
export const quickDrawPlates = (set: number) => (set - 10) / 10;
export const quickDrawWeights = (set: number) => Array.from({ length: (set - 5) / 5 + 1 }, (_, i) => 5 + 5 * i);
/** Switches lock plates innermost first (10 lb per pair); the odd 5 lb seats both 2.5 lb micro plates. */
export const quickDrawSelection = (weight: number) => ({ plates: Math.floor((weight - 5) / 10), micro: (weight - 5) % 10 === 5 });
/** Dumbbell length (headplates, grip and the set's plates). */
export const quickDrawLength = (plates: number) => QUICKDRAW.grip + 2 * (QUICKDRAW.head + plates * QUICKDRAW.pitch);
export const REP_QUICKDRAW = defineFloorPart({
  id: 'rep-quickdraw-dumbbell', name: 'REP QuickDraw', title: 'REP QuickDraw adjustable dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'REP QuickDraw adjustable dumbbell (DBS-6000) in its cradle: Lock-N-Load slider switches lock each 5 lb plate to the handle. Independent reconstruction from published dimensions; REP trademarks belong to REP Fitness.',
  params: [
    { key: 'set', label: 'Set size', default: 50, options: QUICKDRAW_SETS, format: v => `5–${v} lb` },
    { key: 'weight', label: 'Selected weight', default: 35, options: p => quickDrawWeights(p.set), format: pounds },
    { key: 'pose', label: 'Dumbbell', default: 0, options: POSE_OPTIONS, format: poseLabel },
  ],
  footprint: { width: QUICKDRAW.cradleWidth, depth: QUICKDRAW.cradleLength },
  placement: { side: 'left', gap: 300 },
  pair: { gap: 80 },
  vendor: {vendor:'REP Fitness',url:'https://repfitness.com/products/quickdraw-adjustable-dumbbell-lb',credit:'REP Fitness — QuickDraw Adjustable Dumbbell (DBS-6000)',trademark:'REP, QuickDraw and Lock-N-Load are trademarks of REP Fitness.',reconstruction:'Independent Manifold reconstruction from the published cradle envelope (20.6" × 8.45" × 4.7"), 7.9" racked height, 7.3" plates, 12.2–18.5" lengths, 32 mm grip and product photos. Plate pitch, headplate and micro plate thickness derived from those lengths; switch, tooth, tube and saddle details estimated; scenery only, excluded from print export.'},
});
export const PARTS = [REP_QUICKDRAW] as const satisfies readonly FloorPart[];
