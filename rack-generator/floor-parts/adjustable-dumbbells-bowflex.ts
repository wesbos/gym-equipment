/** Adjustable dumbbells family: Bowflex SelectTech 552 and 1090 (metadata only, no Manifold imports).
 * Envelopes, weight settings and per-side plate lists are from the Bowflex owner's manuals (BD552, BD1090);
 * plate thicknesses, radii and the dial-to-plate cam tables are estimates from product photos (research notes). */
import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { POSE_OPTIONS, poseLabel, pounds } from './adjustable-dumbbells-common.ts';
export interface SelectTechPlate { /** lb */ lb: number; /** thickness along the handle, mm */ t: number; /** radius above the handle axis, mm */ r: number }
export interface SelectTechModel {
  name: string; handleLb: number; weights: readonly number[];
  /** Per-side plates, innermost (next to the grip) first. */ plates: readonly SelectTechPlate[];
  /** Plates carried per side at each weight setting: indices into `plates`, same order as `weights`. */ cam: readonly (readonly number[])[];
  /** Published envelope of dumbbell + tray, mm */ length: number; width: number; height: number;
  /** Handle axis height, tray well floor and tray wall height, mm */ axis: number; floor: number; trayHeight: number; trayWidth: number;
  grip: number; gripDiameter: number; knurled: boolean; handlePlate: { t: number; r: number }; dial: { d: number; t: number };
  /** Plate half-width ÷ half-height, profile segments (low = faceted), rim bevel, top slot width */ aspect: number; segments: number; bevel: number; slot: number;
  colorways: readonly { name: string; plate: string; accent: string; bracket: string; dial: string; cap: string; logo: string; numerals: string; ring?: string }[];
}
const RED = '#d0202a';
export const SELECTTECH_552: SelectTechModel = {
  name: 'SelectTech 552', handleLb: 5, weights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 52.5],
  // Manual plate list C5 7.5, C4 7.5, C3 5, C2 2.5, C1 1.25 lb (C1 outermost by the dial).
  plates: [{ lb: 7.5, t: 21, r: 99 }, { lb: 7.5, t: 21, r: 98 }, { lb: 5, t: 19, r: 92 }, { lb: 2.5, t: 19, r: 81 }, { lb: 1.25, t: 14, r: 70 }],
  cam: [[], [4], [3], [3, 4], [2], [2, 4], [2, 3], [2, 3, 4], [0, 3], [0, 2], [0, 1], [0, 1, 3], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4]],
  length: 430, width: 212, height: 228, axis: 129, floor: 20, trayHeight: 70, trayWidth: 206,
  grip: 120, gripDiameter: 33, knurled: false, handlePlate: { t: 20, r: 90 }, dial: { d: 95, t: 22 },
  aspect: 1.07, segments: 64, bevel: 4, slot: 44,
  colorways: [
    { name: 'Classic (red)', plate: '#2a2b2d', accent: RED, bracket: RED, dial: '#1a1a1b', cap: '#1d1e1f', logo: '#e0262b', numerals: '#e8e8e8' },
    { name: 'Results Series', plate: '#1c1d1f', accent: '#8d9095', bracket: '#9a9ea3', dial: '#1a1a1b', cap: '#3a3c3f', logo: '#e8e8e8', numerals: '#e8e8e8' },
  ],
};
export const SELECTTECH_1090: SelectTechModel = {
  name: 'SelectTech 1090', handleLb: 10, weights: Array.from({ length: 17 }, (_, i) => 10 + 5 * i),
  // Manual plate list C5 15, C4 10, C3 7.5, C2 5, C1 2.5 lb.
  plates: [{ lb: 15, t: 30, r: 112 }, { lb: 10, t: 25, r: 110 }, { lb: 7.5, t: 22, r: 98 }, { lb: 5, t: 20, r: 85 }, { lb: 2.5, t: 16, r: 74 }],
  cam: [[], [4], [3], [2], [1], [1, 4], [0], [0, 4], [0, 3], [0, 2], [0, 1], [0, 1, 4], [0, 1, 3], [0, 1, 2], [0, 1, 2, 4], [0, 1, 2, 3], [0, 1, 2, 3, 4]],
  length: 444, width: 242, height: 253, axis: 141, floor: 22, trayHeight: 76, trayWidth: 236,
  grip: 113, gripDiameter: 32, knurled: true, handlePlate: { t: 16, r: 92 }, dial: { d: 102, t: 24 },
  aspect: 1.08, segments: 16, bevel: 7, slot: 48,
  colorways: [
    { name: 'Classic (red)', plate: '#35373a', accent: '#8d9095', bracket: RED, dial: '#3a3c3f', cap: '#2a2b2d', logo: '#e0262b', numerals: '#d42a2a', ring: RED },
    { name: 'Results Series', plate: '#1d1e20', accent: '#8d9095', bracket: '#9a9ea3', dial: '#1a1a1b', cap: '#3a3c3f', logo: '#e8e8e8', numerals: '#e8e8e8', ring: '#2a2b2d' },
  ],
};
/** Plates carried per side for a weight setting (throws for off-chart weights). */
export function selectTechSelection(model: SelectTechModel, weight: number) {
  const i = model.weights.indexOf(weight);
  if (i < 0) throw Error('Unsupported dumbbell weight.');
  return model.cam[i];
}
const footprint = (m: SelectTechModel): FloorBox => ({ width: m.width, depth: m.length });
const bowflexPart = <const Id extends string>(id: Id, m: SelectTechModel, defaultWeight: number, url: string, sku: string) => defineFloorPart({
  id, name: `Bowflex ${m.name}`, title: `Bowflex ${m.name} adjustable dumbbell`, noun: 'dumbbell', section: 'Dumbbells',
  description: `Bowflex ${m.name} dial-select adjustable dumbbell in its tray: turn the end dials and the handle lifts only the selected U-slot plates (${m.weights[0]}–${m.weights.at(-1)} lb). Independent reconstruction; Bowflex and SelectTech trademarks belong to BowFlex Inc.`,
  params: [
    { key: 'colorway', label: 'Colourway', default: 0, options: m.colorways.map((_, i) => i), format: v => m.colorways[v]?.name ?? String(v) },
    { key: 'weight', label: 'Dial setting', default: defaultWeight, options: m.weights, format: pounds },
    { key: 'pose', label: 'Dumbbell', default: 0, options: POSE_OPTIONS, format: poseLabel },
  ],
  footprint: footprint(m),
  placement: { side: 'left', gap: 300 },
  pair: { gap: 80 },
  vendor: { vendor: 'BowFlex', url, credit: `BowFlex — ${m.name} adjustable dumbbells (${sku})`, trademark: 'Bowflex and SelectTech are trademarks of BowFlex Inc.',
    reconstruction: `Independent Manifold reconstruction from the owner's-manual envelope (${m.length} × ${m.width} × ${m.height} mm), published weight settings and per-side plate list, and product photos. Plate thicknesses, radii and taper, the dial-to-plate cam table, tray well depth and dial details are estimated; scenery only, excluded from print export.` },
});
export const BOWFLEX_552 = bowflexPart('bowflex-selecttech-552', SELECTTECH_552, 25, 'https://www.bowflex.com/products/bowflex-results-series-552-selecttech-dumbbells', '552 / 100131');
export const BOWFLEX_1090 = bowflexPart('bowflex-selecttech-1090', SELECTTECH_1090, 50, 'https://www.bowflex.com/products/bowflex-results-series-1090-selecttech-dumbbells', '1090');
export const selectTechModel = (id: string): SelectTechModel => id === BOWFLEX_1090.id ? SELECTTECH_1090 : SELECTTECH_552;
export const selectTechParams = (m: SelectTechModel, p: NumericParams) => {
  if (!m.colorways[p.colorway] || ![0, 1].includes(p.pose)) throw Error('Unsupported dumbbell setting.');
  return { colors: m.colorways[p.colorway], carried: selectTechSelection(m, p.weight), lifted: p.pose === 0 };
};
export const PARTS = [BOWFLEX_552, BOWFLEX_1090] as const;
