import { defineFloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
/** Published envelope (L x W x H, in), grip and weight scheme per model, from powerblock.com Tech Specs (Sep 2026).
 * Each nested plate is one selector level: plates engaged by the pin lift with the handle, the rest stay in the cradle. */
export interface PowerBlockModel {
  name: string; length: number; width: number; height: number; /** Handle cage outer length (end walls), mm */ cage: number;
  grip: number; gripDiameter: number; knurled: boolean; handleLb: number; plateLb: number; adders: number; adderLb: number; max: number;
  /** Selector rail colours, innermost plate first */ rails: readonly string[]; /** Pro-style colour bands instead of full sleeves */ bands: boolean;
  /** Plate and handle-cage colours */ finish: string; cageColor: string; roughness: number; /** Cage head label, end-face badge */ badge: string; faceBadge?: string; arched: boolean;
}
const inch = (v: number) => Math.round(v * 25.4);
const [WHITE, PURPLE, GREEN, YELLOW, BLUE, RED, BLACK, ORANGE, GRAY] = ['#ecebe6', '#6b3fa0', '#1f8a4c', '#e8c51c', '#1f5fb4', '#c8242d', '#1b1c1e', '#e0701e', '#9a9c9e'];
const PRO = [BLACK, WHITE, ORANGE, GREEN, YELLOW, BLUE, RED, PURPLE, GRAY];
export const POWERBLOCK_MODELS: readonly PowerBlockModel[] = [
  { name: 'Elite USA 90', length: inch(16.25), width: inch(6), height: inch(6), cage: 221, grip: inch(4.75), gripDiameter: 32, knurled: true, handleLb: 15, plateLb: 10, adders: 2, adderLb: 2.5, max: 90,
    rails: [WHITE, PURPLE, GREEN, YELLOW, BLUE, RED, BLACK], bands: false, finish: '#141517', cageColor: '#161719', roughness: .32, badge: '#c8242d', arched: false },
  { name: 'Pro 100 EXP', length: inch(19.21), width: inch(7.63), height: inch(7.72), cage: 236, grip: inch(4.88), gripDiameter: 38, knurled: true, handleLb: 10, plateLb: 10, adders: 2, adderLb: 2.5, max: 100,
    rails: PRO, bands: true, finish: '#1d1e20', cageColor: '#161719', roughness: .78, badge: '#e9e9e6', faceBadge: '#3a3c3f', arched: false },
  { name: 'Pro 50', length: inch(13), width: inch(7), height: inch(7.25), cage: 180, grip: inch(4.88), gripDiameter: 38, knurled: false, handleLb: 5, plateLb: 5, adders: 1, adderLb: 2.5, max: 50,
    rails: PRO, bands: true, finish: '#1d1e20', cageColor: '#161719', roughness: .78, badge: '#b8232b', faceBadge: '#3a3c3f', arched: true },
  { name: 'Pro 32', length: inch(12), width: inch(5.75), height: inch(5.5), cage: 170, grip: inch(4.88), gripDiameter: 32, knurled: false, handleLb: 4, plateLb: 4, adders: 0, adderLb: 0, max: 32,
    rails: PRO.slice(1, 8), bands: true, finish: '#1d1e20', cageColor: '#161719', roughness: .78, badge: '#b8232b', faceBadge: '#3a3c3f', arched: true },
  { name: 'Sport 24', length: inch(10), width: inch(5.5), height: inch(5.5), cage: 160, grip: inch(4.88), gripDiameter: 32, knurled: false, handleLb: 3, plateLb: 3, adders: 0, adderLb: 0, max: 24,
    rails: [WHITE, ORANGE, GREEN, YELLOW, BLUE, RED, PURPLE], bands: false, finish: '#56595c', cageColor: '#56595c', roughness: .5, badge: '#e0452a', arched: true },
];
export const powerBlockModel = (params: NumericParams) => { const m = POWERBLOCK_MODELS[params.model]; if (!m) throw Error('Unsupported dumbbell model.'); return m; };
/** Selectable weights: handle + engaged plates + micro adders, capped at the model maximum. */
export function powerBlockWeights(model: PowerBlockModel): number[] {
  const out: number[] = [];
  for (let plates = 0; plates <= model.rails.length; plates++) for (let adders = 0; adders <= model.adders; adders++) {
    const w = model.handleLb + plates * model.plateLb + adders * model.adderLb; if (w <= model.max && !out.includes(w)) out.push(w);
  }
  return out.sort((a, b) => a - b);
}
/** Selector setting: plates on the pin (innermost first) and micro adders in the handle core. */
export function powerBlockSelection(model: PowerBlockModel, weight: number) {
  const plates = Math.min(model.rails.length, Math.floor((weight - model.handleLb) / model.plateLb + 1e-9));
  const adders = model.adderLb ? Math.round((weight - model.handleLb - plates * model.plateLb) / model.adderLb) : 0;
  if (!powerBlockWeights(model).includes(weight) || adders < 0 || adders > model.adders) throw Error('Unsupported dumbbell weight.');
  return { plates, adders };
}
export const POWERBLOCK_CRADLE_MARGIN = 14;
export const POWERBLOCK_LIFT = 80;
export const POWERBLOCK = defineFloorPart({
  id: 'powerblock', name: 'PowerBlock dumbbell', title: 'PowerBlock adjustable dumbbells', noun: 'dumbbell',
  description: 'PowerBlock Elite USA 90 and Pro/Sport adjustable dumbbells. Independent reconstruction from published dimensions; PowerBlock trademarks belong to PowerBlock.',
  params: [
    { key: 'model', label: 'Model', default: 0, options: POWERBLOCK_MODELS.map((_, i) => i), format: v => POWERBLOCK_MODELS[v]?.name ?? String(v) },
    { key: 'weight', label: 'Selected weight', default: 50, options: p => powerBlockWeights(powerBlockModel(p)), format: v => `${v} lb` },
  ],
  // Long axis along floor depth so "Add matching pair" sets the second dumbbell beside the first, as racked.
  footprint: p => { const m = powerBlockModel(p); return { width: m.width + 2 * POWERBLOCK_CRADLE_MARGIN, depth: m.length + 2 * POWERBLOCK_CRADLE_MARGIN }; },
  placement: { side: 'left', gap: 300 },
  pair: { gap: 60 },
  vendor: {vendor:'PowerBlock',url:'https://powerblock.com/products/elite-usa-90-adjustable-dumbbells',credit:'PowerBlock — Elite USA 90 and Pro/Sport dumbbells',trademark:'PowerBlock, Elite USA and Pro EXP are trademarks of PowerBlock.',reconstruction:'Independent Manifold reconstruction from published length/width/height, grip specs, selector weight charts and product photos. Plate count per model follows the published weight increments; cage, rail and cradle details estimated; scenery only, excluded from print export.'},
});
