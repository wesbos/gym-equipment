/** Adjustable dumbbells family: Kensui AdaptaBELL plate-loaded handles (metadata only, no Manifold imports). */
import { defineFloorPart, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
/** PRO / MAX. Published (kensui.com spec card): 9 cm / 10.75 cm peg, Ø34 / Ø38 mm grip, 70 / 150 kg per pair, 28 mm and
 * 50 mm plates; GGR: 2.8" (70 mm) loadable per side on the PRO. Grip length, flange and end-disc sizes are photo estimates
 * scaled from the published grip diameter; MAX loadable length estimated from its longer peg. */
export interface AdaptabellModel { name: string; gripD: number; grip: number; flangeD: number; flangeT: number; cone: number;
  discD: number; discT: number; threadD: number; peg: number; minGap: number; loadable: number; holes: boolean; handleLb: number; metal: boolean }
export const ADAPTABELL_MODELS: readonly AdaptabellModel[] = [
  { name: 'AdaptaBELL PRO', gripD: 34, grip: 135, flangeD: 68, flangeT: 9, cone: 0, discD: 75, discT: 10, threadD: 26, peg: 90, minGap: 32, loadable: 70, holes: true, handleLb: 2, metal: false },
  { name: 'AdaptaBELL MAX', gripD: 38, grip: 205, flangeD: 104, flangeT: 12, cone: 16, discD: 106, discT: 15, threadD: 27, peg: 107.5, minGap: 20, loadable: 85, holes: false, handleLb: 4.5, metal: true },
];
/** Generic 1" standard cast-iron change plates the user loads (estimated catalogue sizes, not a Kensui product): [lb, Ø, thickness]. */
export const ADAPTABELL_PLATES = [[10, 229, 22], [5, 200, 16], [2.5, 158, 13]] as const;
export const ADAPTABELL = { plates: ADAPTABELL_PLATES } as const;
export const adaptabellModel = (p: NumericParams) => { const m = ADAPTABELL_MODELS[p.model]; if (!m) throw Error('Unsupported dumbbell model.'); return m; };
/** Plates per side for a load, heaviest first (innermost against the flange). */
export function adaptabellStack(load: number) {
  const out: (typeof ADAPTABELL_PLATES)[number][] = []; let rest = load;
  for (const plate of ADAPTABELL_PLATES) while (rest >= plate[0] - 1e-9) { out.push(plate); rest -= plate[0]; }
  return out;
}
const stackLength = (load: number) => adaptabellStack(load).reduce((a, [, , t]) => a + t, 0);
/** Loads per side (2.5 lb steps) whose plate stack fits the peg's loadable length. */
export const adaptabellLoads = (m: AdaptabellModel) => Array.from({ length: 17 }, (_, i) => i * 2.5).filter(load => stackLength(load) <= m.loadable);
/** Overall length and the largest diameter (it lies on the floor on that). */
export function adaptabellEnvelope(p: NumericParams) {
  const m = adaptabellModel(p), stack = adaptabellStack(p.load), gap = Math.max(m.minGap, stack.reduce((a, [, , t]) => a + t, 0));
  return { m, stack, gap, length: m.grip + 2 * (m.cone + m.flangeT + gap + m.discT), diameter: Math.max(m.flangeD, m.discD, ...stack.map(([, d]) => d)) };
}
export const ADAPTABELL_DUMBBELL = defineFloorPart({
  id: 'kensui-adaptabell', name: 'Kensui AdaptaBELL', title: 'Kensui AdaptaBELL plate-loaded dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'Kensui AdaptaBELL PRO / MAX plate-loaded dumbbell handle with screw-in ACME pegs and flat knurled end discs, shown loaded with standard change plates and lying on the floor. Independent reconstruction; Kensui trademarks belong to Kensui Fitness.',
  params: [
    { key: 'model', label: 'Model', default: 0, options: ADAPTABELL_MODELS.map((_, i) => i), format: v => ADAPTABELL_MODELS[v]?.name ?? String(v) },
    { key: 'load', label: 'Plates per side', default: 10, options: (p: NumericParams) => adaptabellLoads(adaptabellModel(p)),
      format: v => v ? `${v} lb per side (${adaptabellStack(v).map(([lb]) => lb).join(' + ')})` : 'Empty handle' },
  ],
  footprint: (p: NumericParams) => { const e = adaptabellEnvelope(p); return { width: e.diameter, depth: e.length }; },
  placement: { side: 'left', gap: 300 },
  pair: { gap: 60 },
  vendor: {vendor:'Kensui Fitness',url:'https://kensui.com/products/adaptabell',credit:'Kensui Fitness — AdaptaBELL PRO / MAX plate-loaded dumbbell handles',trademark:'Kensui and AdaptaBELL are trademarks of Kensui Fitness.',reconstruction:'Independent Manifold reconstruction from the published peg lengths (9 / 10.75 cm), grip diameters (34 / 38 mm), 70 mm loadable length and product photos. Grip length, flange and end-disc sizes scaled from photos; the loaded plates are generic 1" cast-iron change plates, not a Kensui product; scenery only, excluded from print export.'},
});
export const PARTS = [ADAPTABELL_DUMBBELL] as const satisfies readonly FloorPart[];
