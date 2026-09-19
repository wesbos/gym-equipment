import { PAINT_SWATCHES } from '../appearance.ts';
import { defineFloorPart } from '../floor-part.ts';
export const BACKREST_ANGLES = [0, 15, 30, 45, 60, 75, 85] as const;
export const SEAT_ANGLES = [-15, 0, 10, 20] as const;
export const NIGHTHAWK_DEFAULTS = { backrestAngle: 0, seatAngle: 0 };
export const NIGHTHAWK_COLORS = PAINT_SWATCHES.filter(([name]) => ['Metallic Black','Red','Blue','Matte Black','Army Green','White'].includes(name));
const degrees = (value: number) => `${value}°`;
export const NIGHTHAWK = defineFloorPart({
  id: 'rep-nighthawk', name: 'REP Nighthawk', title: 'REP Nighthawk adjustable bench', noun: 'bench', section: 'Benches',
  description: 'REP Fitness Nighthawk (AB-4102). Independent reconstruction from published dimensions; REP trademarks belong to REP Fitness.',
  params: [
    { key: 'backrestAngle', label: 'Backrest angle', default: NIGHTHAWK_DEFAULTS.backrestAngle, options: BACKREST_ANGLES, format: degrees },
    { key: 'seatAngle', label: 'Seat angle', default: NIGHTHAWK_DEFAULTS.seatAngle, options: SEAT_ANGLES, format: degrees },
  ],
  footprint: { width: 658, depth: 1295 },
  // Centre 550 mm beyond the rack's outer tube face, as shipped in #47.
  placement: { side: 'right', gap: 550 - 658 / 2 },
  colors: NIGHTHAWK_COLORS, colorLabel: 'Bench frame color',
  vendor: {vendor:'REP Fitness',url:'https://repfitness.com/products/rep-nighthawk-adjustable-bench',credit:'REP Fitness — Nighthawk AB-4102',trademark:'REP and Nighthawk are trademarks of REP Fitness.',reconstruction:'Independent Manifold reconstruction from published envelope, angles, official drawings and photos. Secondary frame sections and internals estimated; scenery only, excluded from print export.'},
});
