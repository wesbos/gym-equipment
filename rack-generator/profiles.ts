/** Primary vendor specs checked 2026-09-17. Values stay in mm without rounding
 * imperial hole pitch to the generic source grid. Unpublished fabrication details
 * are explicitly estimated; these are reconstructed models, not certified fits. */
export interface GridProfile {
  tube?: number;
  id: string;
  label: string;
  widths: readonly number[];
  depths: readonly number[];
  heights?: readonly number[];
  pitch: number;
  holeDiameter: number;
  source?: string;
  reconstructionNote?: string;
  benchZone?: { startStation: number; endStation: number; spacing: number };
}
export const GRID_PROFILES: readonly GridProfile[] = [
  { id: 'generic-75', label: 'BOS generic 75 mm', widths: [425,725,1075], depths: [425,725,1075], pitch:50, holeDiameter:25 },
  ...(['hydra','manticore'] as const).map(series => ({id:`bos-${series}`,label:`Bells of Steel ${series === 'hydra' ? 'Hydra' : 'Manticore'}`,tube:76.2,widths:[1092.2],depths:[609.6,762,1092.2],heights:[2133.6,2286],pitch:50.8,holeDiameter:series === 'hydra'?15.875:25.4,source:'https://bellsofsteel.com/collections/all/products/kraken-4-post-hydra-manticore',reconstructionNote:'Reconstructed true 3-inch frame for Kraken. Published nominal dimensions; first-hole datum, bracket and base contours are estimated. 108-inch raised-crossmember configurations are not yet modeled; physical fit is unverified.'})),
  { id: 'rep-pr-5000', label:'REP PR-5000', widths:[1140.32], depths:[406.4,762,1041.4], heights:[2032,2362.2], pitch:2*25.4, holeDiameter:25.4,
    source:'https://repfitness.com/products/pr-5000-power-rack-pre-selected',
    reconstructionNote:'Reconstruction: published rack dimensions, 50.8 mm pitch and 25.4 mm holes. First-hole datum (65 mm), flange outlines, bolts and base details are estimated from BOS source geometry; physical REP fit is unverified.' },
  { id: 'rep-pr-4000', label:'REP PR-4000', widths:[1140.32], depths:[406.4,609.6,762,1041.4], heights:[2032,2362.2], pitch:2*25.4, holeDiameter:5/8*25.4,
    source:'https://repfitness.com/products/pr-4000-rack-builder',
    benchZone:{startStation:8,endStation:22,spacing:25.4},
    reconstructionNote:'Reconstruction: published 50.8 mm pitch, 25.4 mm bench-zone spacing and 15.875 mm holes. Bench-zone bounds (stations 8–22, 471.4–1182.6 mm), first-hole datum (65 mm), flanges, bolts and bases are estimated. Front/back bench holes are modeled separately; physical REP fit is unverified.' },
];
export function gridProfile(id?: string): GridProfile {
  return GRID_PROFILES.find(p => p.id === id) ?? GRID_PROFILES.find(p => p.id === 'generic-75')!;
}
