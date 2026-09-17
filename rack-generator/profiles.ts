/** Primary vendor specs checked 2026-09-17. Values stay in mm without rounding
 * imperial hole pitch to the generic source grid. Missing fabrication dimensions
 * prevent a catalog entry from being advertised as a compatible preset. */
export interface GridProfile {
  id: string;
  label: string;
  widths: readonly number[];
  depths: readonly number[];
  heights?: readonly number[];
  pitch: number;
  holeDiameter: number;
  source?: string;
  unavailableReason?: string;
}
export const GRID_PROFILES: readonly GridProfile[] = [
  { id: 'generic-75', label: 'BOS generic 75 mm', widths: [425,725,1075], depths: [425,725,1075], pitch:50, holeDiameter:25 },
  { id: 'rep-pr-5000', label:'REP PR-5000', widths:[50.8*25.4-150], depths:[16*25.4,30*25.4,41*25.4], heights:[80*25.4,93*25.4], pitch:2*25.4, holeDiameter:25.4,
    source:'https://repfitness.com/products/pr-5000-power-rack-pre-selected',
    unavailableReason:'Published dimensions recorded; first-hole datum and physical crossmember mounting dimensions still need verification. BOS source flanges are not REP adapters.' },
  { id: 'rep-pr-4000', label:'REP PR-4000', widths:[50.8*25.4-150], depths:[16*25.4,24*25.4,30*25.4,41*25.4], heights:[80*25.4,93*25.4], pitch:2*25.4, holeDiameter:5/8*25.4,
    source:'https://repfitness.com/products/pr-4000-rack-builder',
    unavailableReason:'Requires verified bench-zone limits, 25.4 mm front-face stations within that zone, first-hole datum, and matching 15.875 mm hardware adapters.' },
];
export function gridProfile(id?: string): GridProfile {
  return GRID_PROFILES.find(p => p.id === id) ?? GRID_PROFILES[0];
}
