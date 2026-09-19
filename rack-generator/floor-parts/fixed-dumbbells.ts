/** Fixed and loadable dumbbells. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 *
 * Every entry resolves its params to a plain `DumbbellShape` (millimetres) that the builder in
 * ../parts/fixed-dumbbells.ts turns into solids and that the footprint is computed from, so the two can never drift.
 * Per-weight tables and their sources are documented in ../research/fixed-dumbbells.md. Frame: the dumbbell lies on
 * the floor with its handle along Y (floor depth), so "Add matching pair" sets the second one beside it along X. */
import { defineFloorPart, type FloorBox, type FloorParam, type FloorPartSpec } from '../floor-part.ts';
import { PLATE_SPECS } from '../plates.ts';
import type { NumericParams } from '../types.ts';
const inch = (v: number) => v * 25.4;
const LB = 0.45359237;
const round1 = (v: number) => Math.round(v * 10) / 10;
/** a..b inclusive in `step` increments. */
const steps = (a: number, b: number, step: number) => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => round1(a + i * step));
const pounds = (v: number) => `${v} lb`;
const AC = (af: number) => af * 2 / Math.sqrt(3);
export interface Finish { name: string; color: string; metalness: number; roughness: number }
const fin = (name: string, color: string, metalness: number, roughness: number): Finish => ({ name, color, metalness, roughness });
export const FINISH = {
  rubber: fin('Black rubber-encased cast-iron heads', '#1c1d1f', 0, .82),
  urethane: fin('Black urethane-coated steel heads', '#18191b', 0, .6),
  blackIron: fin('Black enamel cast-iron heads', '#222325', .35, .62),
  grayIron: fin('Gray enamel cast-iron heads', '#6e7072', .45, .55),
  chrome: fin('Chrome-plated steel', '#dfe3e6', 1, .14),
  blackOxide: fin('Black-oxide steel', '#2b2c2e', .75, .42),
  stainless: fin('Stainless steel', '#c4c8cb', .95, .28),
  brightZinc: fin('Bright zinc-plated steel', '#cfd5da', .9, .22),
  blackZinc: fin('Black zinc-plated steel', '#2e3033', .7, .38),
  matteBlack: fin('Matte black cerakote sleeves', '#232426', .3, .6),
  bareSteel: fin('Bare steel handle, aged', '#8a8279', .75, .5),
  grayHammer: fin('Gray hammertone cast-iron plates', '#878a7c', .35, .6),
  ivankoGray: fin('Gray poly-baked cast-iron plates', '#7f8175', .35, .62),
  ironPlate: fin('Hammertone cast-iron Olympic plates', '#595b5c', .5, .6),
  silver: fin('Silver-painted weight numerals', '#c9ccce', .55, .4),
  white: fin('White pad-printed logo and weight', '#ecebe6', 0, .55),
} as const;
export type HandleStyle = 'straight' | 'contour' | 'ergo' | 'cast' | 'coated';
export interface HandleSpec {
  style: HandleStyle; d: number; finish: Finish;
  /** 'full' = knurl between the heads; 'bands' = centre band plus a narrow ring each side; 'ergo' = CAP/Amazon three-zone grip. */
  knurl: 'full' | 'bands' | 'ergo' | 'none'; knurlLength?: number;
  /** Chamfered steel collar washer where the handle meets each head. */ collar?: { d: number; w: number; finish: Finish };
}
export interface LabelSpec {
  /** recess = sunken panel with raised same-colour text; frame = raised border + raised text; end-print = ink on the outer end face. */
  kind: 'recess' | 'frame' | 'end-print'; left: string; right: string; ink?: Finish; underline?: boolean;
  /** Text runs along the handle axis (default) or across the flat. */ read?: 'axis' | 'across'; /** Smooth moulded panel floor and lettering (recess). */ panel?: Finish;
}
export interface HexShape { kind: 'hex'; lb: number; L: number; af: number; grip: number; handle: HandleSpec; head: Finish; bevel: number; endScale: number; edge: number; label: LabelSpec }
export interface UrethaneShape { kind: 'urethane'; lb: number; D: number; L: number; gap: number; handle: HandleSpec; head: Finish; ring: { d: number; w: number; finish: Finish }; flange: { d: number; w: number; finish: Finish }; brand: string; number: string }
export type ProCap = 'troy-chrome' | 'troy-rubber' | 'ivanko-iron' | 'ivanko-rubber' | 'ivanko-chrome' | 'washer';
export interface ProShape { kind: 'pro'; lb: number; D: number; plates: number; t: number; grip: number; handle: HandleSpec; plate: Finish; hub: { d: number; w: number; finish: Finish }; cap: { style: ProCap; d: number; w: number }; brand: string; number: string; rubber: boolean }
export type CastStyle = 'crown' | 'bun' | 'globe';
export interface CastShape { kind: 'cast'; lb: number; style: CastStyle; D: number; W: number; grip: number; handle: HandleSpec; head: Finish; brand: string; number: string; frame: boolean }
export interface FatbellShape { kind: 'fatbell'; lb: number; D: number; zTop: number; zBase: number; opening: number; cavity: number; openBottom: boolean; handleD: number; stripe: string }
export interface LoadablePlate { lb: number; d: number; w: number }
export interface LoadableShape {
  kind: 'loadable'; length: number; sleeve: number; sleeveD: number; flange: { d: number; w: number; step?: { d: number; w: number } }; grip: number; d: number; knurlLength: number;
  shaft: Finish; sleeves: Finish; grips?: Finish; bushing: boolean; cap: { color: string; open: boolean };
  plates: LoadablePlate[]; collar?: { kind: 'oso' | 'screw'; d: number; w: number; finish: Finish };
}
export type DumbbellShape = HexShape | UrethaneShape | ProShape | CastShape | FatbellShape | LoadableShape;
/** Overall envelope: footprint width (X), depth (Y, along the handle) and the handle axis height above the floor. */
export function dumbbellEnvelope(s: DumbbellShape): { width: number; depth: number; height: number; axis: number } {
  switch (s.kind) {
    case 'hex': return { width: AC(s.af) - 2 * (1 / Math.cos(Math.PI / 6) - 1) * s.edge, depth: 2 * s.L + s.grip, height: s.af, axis: s.af / 2 };
    case 'urethane': return { width: s.D, depth: 2 * s.L + s.gap, height: s.D, axis: s.D / 2 };
    case 'pro': return { width: s.D, depth: s.grip + 2 * proHeadLength(s), height: s.D, axis: s.D / 2 };
    case 'cast': return { width: s.D, depth: s.grip + 2 * s.W, height: s.D, axis: s.D / 2 };
    case 'fatbell': return { width: s.D, depth: s.D, height: s.zTop - s.zBase, axis: -s.zBase };
    case 'loadable': { const d = loadableDiameter(s); return { width: d, depth: s.length, height: d, axis: d / 2 }; }
  }
}
export const PRO_PLATE_GAP = 1.2;
/** Head length of a pro-style dumbbell from the handle hub to the end-cap face. */
export const proHeadLength = (s: ProShape) => s.hub.w + s.plates * s.t + (s.plates - 1) * PRO_PLATE_GAP + s.cap.w;
export const loadableDiameter = (s: LoadableShape) => Math.max(s.flange.d, s.sleeveD, s.collar?.d ?? 0, ...s.plates.map(p => p.d));
/** Per-weight row [lb, head length along the handle, across flats, handle Ø] (mm). */
type HexRow = readonly [number, number, number, number];
const row = <T extends readonly [number, ...unknown[]]>(rows: readonly T[], lb: number, label: string): T => {
  const r = rows.find(x => x[0] === lb); if (!r) throw Error(`Unsupported ${label} weight.`); return r;
};
// ---------------------------------------------------------------- CAP Barbell rubber hex (SDR / SDRIS / SDRBIS)
/** Walmart per-weight L × corners × flats (all 27 sizes) and CAP dimension graphics (15/35/40/45/75/80 lb); head length
 * = (L − 5.04")/2; 55/105–120 lb smoothed where the retailer values repeat. Exposed handle 5.04" (128 mm). */
const CAP_RUBBER: readonly HexRow[] = [
  [3, 47, 57, 32], [5, 54, 70, 32], [8, 63, 82, 32], [10, 72, 91, 32], [12, 74, 95, 32], [15, 80, 100, 32], [20, 86, 110, 32], [25, 91, 117, 32],
  [30, 99, 128, 32], [35, 104, 134, 32], [40, 109, 140, 32], [45, 114, 144, 33], [50, 118, 150, 33], [55, 122, 155, 33], [60, 127, 160, 33],
  [65, 130, 165, 33], [70, 134, 170, 33], [75, 137, 175, 41], [80, 140, 180, 41], [85, 144, 183, 41], [90, 146, 185, 41], [95, 148, 188, 41],
  [100, 150, 190, 41], [105, 153, 194, 41], [110, 155, 197, 41], [115, 158, 200, 41], [120, 160, 203, 41],
];
export const CAP_HANDLES = ['Chrome ergo handle (SDRIS)', 'Black-oxide handle (SDRBIS)'] as const;
function capRubberShape(p: NumericParams): HexShape {
  const [lb, L, af, d] = row(CAP_RUBBER, p.weight, 'CAP rubber hex'), heavy = lb >= 50;
  return { kind: 'hex', lb, L, af, grip: 128, head: FINISH.rubber, bevel: L * .1, endScale: .9, edge: 2.5,
    handle: { style: heavy ? 'straight' : 'ergo', d, finish: p.handle ? FINISH.blackOxide : FINISH.chrome, knurl: heavy ? 'bands' : 'ergo', collar: { d: d + 12, w: 4, finish: p.handle ? FINISH.blackOxide : FINISH.chrome } },
    label: { kind: 'recess', left: String(lb), right: String(lb), panel: fin('Smooth moulded weight panels', '#2c2d30', .05, .4) } };
}
// ---------------------------------------------------------------- CAP Barbell cast iron hex, black (SDB2)
/** CAP per-weight dimension graphics (L, corners, Ø) with 30/35/50/55 lb interpolated; head length = (L − 5.08")/2. */
const CAP_IRON: readonly HexRow[] = [
  [5, 44, 58, 29], [8, 54, 71, 29], [10, 58, 78, 29], [12, 65, 81, 29], [15, 68, 90, 29], [20, 75, 101, 29], [25, 82, 108, 29], [30, 87, 115, 29],
  [35, 91, 121, 29], [40, 96, 127, 29], [45, 101, 134, 29], [50, 106, 139, 30], [55, 110, 143, 30], [60, 114, 147, 30], [65, 120, 152, 30],
  [70, 122, 154, 31], [75, 124, 158, 31], [80, 131, 163, 31], [85, 131, 165, 31], [90, 132, 167, 31], [95, 133, 172, 32], [100, 134, 175, 32],
  [105, 135, 178, 32], [110, 137, 180, 32], [115, 138, 183, 32], [120, 140, 185, 32],
];
function capIronShape(p: NumericParams): HexShape {
  const [lb, L, af, d] = row(CAP_IRON, p.weight, 'CAP cast iron hex'), cast = lb <= 15;
  return { kind: 'hex', lb, L, af, grip: 129, head: FINISH.blackIron, bevel: L * .08, endScale: .9, edge: 3,
    handle: cast ? { style: 'cast', d, finish: FINISH.blackIron, knurl: 'none' } : { style: 'straight', d, finish: FINISH.blackOxide, knurl: 'full' },
    label: { kind: 'frame', left: String(lb), right: String(lb), ink: FINISH.silver } };
}
// ---------------------------------------------------------------- Rogue rubber hex
/** Rogue publishes only the handle Ø (25 mm to 10 lb, 35 mm from 12.5 lb); head sizes are REP-equal head volumes
 * re-shaped to Rogue's longer heads (length ≈ 0.9 × flats) with a 130 mm grip. Estimates, ±10–15 %. */
const ROGUE_HEX: readonly HexRow[] = [
  [2.5, 60, 66, 25], [5, 59, 65, 25], [7.5, 69, 77, 25], [10, 77, 86, 25], [12.5, 82, 92, 35], [15, 87, 97, 35], [17.5, 93, 103, 35], [20, 96, 106, 35],
  [22.5, 101, 112, 35], [25, 106, 118, 35], [27.5, 107, 119, 35], [30, 111, 124, 35], [35, 116, 129, 35], [40, 124, 138, 35], [45, 130, 144, 35],
  [50, 136, 151, 35], [55, 139, 155, 35], [60, 143, 159, 35], [65, 144, 160, 35], [70, 147, 163, 35], [75, 153, 170, 35], [80, 158, 175, 35],
  [85, 161, 179, 35], [90, 165, 183, 35], [95, 167, 186, 35], [100, 169, 187, 35], [105, 172, 192, 35], [110, 175, 195, 35], [115, 178, 198, 35],
  [120, 181, 201, 35], [125, 183, 203, 35],
];
function rogueHexShape(p: NumericParams): HexShape {
  const [lb, L, af, d] = row(ROGUE_HEX, p.weight, 'Rogue hex');
  return { kind: 'hex', lb, L, af, grip: 130, head: FINISH.rubber, bevel: L * .16, endScale: .72, edge: 2,
    handle: { style: 'contour', d, finish: FINISH.chrome, knurl: 'bands' }, label: { kind: 'recess', left: 'ROGUE', right: String(lb), panel: fin('Smooth moulded ROGUE / weight panels', '#3c3d40', .05, .36) } };
}
// ---------------------------------------------------------------- REP Fitness rubber hex
/** Photo-measured from REP's per-weight product photos (scale = published 5.2" grip); 7.5/12.5/17.5/22.5/105–125 lb
 * interpolated. Handle 28 mm (2.5–15 lb) / 34 mm (17.5–125 lb), fully knurled, straight. */
const REP_HEX: readonly HexRow[] = [
  [2.5, 51, 72, 28], [5, 51, 70, 28], [7.5, 62, 81, 28], [10, 68, 92, 28], [12.5, 74, 97, 28], [15, 76, 104, 28], [17.5, 84, 108, 34], [20, 87, 112, 34],
  [22.5, 91, 118, 34], [25, 98, 123, 34], [27.5, 99, 124, 34], [30, 104, 128, 34], [35, 108, 133, 34], [40, 115, 148, 34], [45, 117, 152, 34],
  [50, 128, 162, 34], [55, 129, 164, 34], [60, 129, 168, 34], [65, 133, 167, 34], [70, 133, 170, 34], [75, 140, 181, 34], [80, 142, 184, 34],
  [85, 144, 190, 34], [90, 149, 192, 34], [95, 153, 194, 34], [100, 156, 195, 34], [105, 158, 200, 34], [110, 161, 203, 34], [115, 163, 206, 34],
  [120, 166, 209, 34], [125, 168, 212, 34],
];
function repHexShape(p: NumericParams): HexShape {
  const [lb, L, af, d] = row(REP_HEX, p.weight, 'REP hex');
  return { kind: 'hex', lb, L, af, grip: 132, head: FINISH.rubber, bevel: L * .18, endScale: .67, edge: 2,
    handle: { style: 'straight', d, finish: FINISH.chrome, knurl: 'full' }, label: { kind: 'recess', left: 'REP', right: String(lb), read: 'across', panel: fin('Smooth moulded REP / weight panels', '#2e2f32', .05, .4) } };
}
// ---------------------------------------------------------------- Amazon Basics rubber encased hex
/** Amazon item dimensions (overall × corners) per variant, cm graphic for 10 lb, 40 lb bundle title for flats;
 * exposed handle ≈ 4.8" photo-measured; 50 lb extrapolated from the size chart. */
const AMAZON_HEX: readonly HexRow[] = [
  [10, 75, 89, 27], [15, 91, 99, 34], [20, 93, 108, 34], [25, 98, 115, 34], [30, 103, 123, 34], [35, 108, 132, 34], [40, 117, 140, 36], [45, 119, 143, 35], [50, 124, 150, 36],
];
function amazonHexShape(p: NumericParams): HexShape {
  const [lb, L, af, d] = row(AMAZON_HEX, p.weight, 'Amazon hex');
  return { kind: 'hex', lb, L, af, grip: 122, head: FINISH.rubber, bevel: L * .1, endScale: .88, edge: 2.5,
    handle: { style: 'ergo', d, finish: FINISH.chrome, knurl: 'ergo', collar: { d: d + 10, w: 4, finish: FINISH.chrome } },
    label: { kind: 'recess', left: `${lb}LB`, right: `${lb}LB`, panel: fin('Smooth moulded weight panels', '#2c2d30', .05, .4) } };
}
// ---------------------------------------------------------------- Body-Solid cast iron hex (SDX)
/** Body-Solid's published head size per weight (2–8", read as across corners); overall length, grip and Ø estimated
 * from the equivalent CAP cast hex. */
const BODY_SOLID: readonly HexRow[] = [
  [3, 39, 44, 28], [5, 45, 55, 28], [8, 55, 72, 28], [10, 59, 77, 28], [12, 66, 82, 28], [15, 69, 88, 32], [20, 76, 99, 32], [25, 83, 106, 32],
  [30, 88, 115, 32], [35, 92, 122, 32], [40, 97, 126, 32], [45, 102, 132, 32], [50, 107, 136, 32], [55, 111, 141, 32], [60, 115, 145, 32],
  [65, 121, 154, 32], [70, 123, 156, 32], [75, 125, 159, 32], [80, 132, 162, 32], [85, 133, 164, 32], [90, 134, 171, 32], [95, 135, 174, 32], [100, 136, 176, 32],
];
function bodySolidShape(p: NumericParams): HexShape {
  const [lb, L, af, d] = row(BODY_SOLID, p.weight, 'Body-Solid hex'), cast = lb <= 12;
  return { kind: 'hex', lb, L, af, grip: 127, head: FINISH.grayIron, bevel: L * .08, endScale: .9, edge: 3,
    handle: cast ? { style: 'cast', d, finish: FINISH.grayIron, knurl: 'none' } : { style: 'straight', d, finish: fin('Gray knurled steel handle', '#8e9092', .8, .38), knurl: 'full' },
    label: { kind: 'frame', left: String(lb), right: String(lb), ink: FINISH.silver, panel: fin('Black enamel label panels', '#1c1d1f', .3, .55) } };
}
// ---------------------------------------------------------------- Amazon Basics neoprene
/** Amazon item dimensions per variant: [lb, overall length, head width across corners] (inches); 7 lb interpolated. Colour per weight from the listings. */
export const NEOPRENE: readonly (readonly [number, number, number, string, string])[] = [
  [1, 4.88, 1.78, '#dc7c86', 'Pink'], [2, 5.78, 2.32, '#e98fae', 'Pink'], [3, 6.3, 2.7, '#8e3fb2', 'Purple'], [4, 6.7, 2.8, '#1f67c9', 'Blue'],
  [5, 7.05, 3.21, '#a3ad22', 'Green'], [6, 7.35, 3.35, '#e8741f', 'Orange'], [7, 7.7, 3.47, '#7d8084', 'Light Grey'], [8, 8.18, 3.59, '#ebc12b', 'Yellow'],
  [10, 8.6, 4.02, '#2c4c9e', 'Navy Blue'], [12, 8.97, 4.36, '#29292b', 'Black'], [15, 9.7, 4.64, '#4b4e53', 'Dark Grey'], [20, 10, 5.1, '#2e4632', 'Dark Green'],
];
function neopreneShape(p: NumericParams): HexShape {
  const [lb, length, corners, color, name] = row(NEOPRENE, p.weight, 'neoprene dumbbell'), ac = inch(corners), af = ac * Math.sqrt(3) / 2;
  const L = ac * (lb <= 2 ? .6 : .64), grip = inch(length) - 2 * L, coat = fin(`${name} neoprene-coated cast iron`, color, 0, .78);
  return { kind: 'hex', lb, L, af, grip, head: coat, bevel: L * .14, endScale: .8, edge: af * .09,
    handle: { style: 'coated', d: Math.min(18 + .14 * ac, af * .55), finish: coat, knurl: 'none' },
    label: { kind: 'end-print', left: `${lb}LB`, right: `${lb}LB`, ink: fin('Moulded weight marking', mixHex(color, '#ffffff', .55), 0, .7), underline: true } };
}
/** Blend two #rrggbb colours. */
export function mixHex(a: string, b: string, t: number) {
  const c = (s: string, i: number) => parseInt(s.slice(1 + 2 * i, 3 + 2 * i), 16);
  return '#' + [0, 1, 2].map(i => Math.round(c(a, i) * (1 - t) + c(b, i) * t).toString(16).padStart(2, '0')).join('');
}
// ---------------------------------------------------------------- Urethane round (Rogue IP0661, REP DBS-5000)
/** Rogue's published head-diameter bands; head lengths photo-measured on REP's identical OEM heads to 50 lb and
 * mass-modelled above (see research notes). */
const URETHANE_D = (lb: number) => lb <= 15 ? 127 : lb <= 30 ? 153 : lb <= 45 ? 173 : lb <= 125 ? 193 : 204;
const URETHANE_L: Record<number, number> = { 5: 22, 10: 34, 15: 46, 20: 43, 25: 55, 30: 64, 35: 58, 40: 66, 45: 73, 50: 65, 55: 69, 60: 74, 65: 79, 70: 84, 75: 89, 80: 94,
  85: 99, 90: 105, 95: 111, 100: 117, 105: 123, 110: 129, 115: 135, 120: 141, 125: 148, 130: 137, 135: 143, 140: 148, 145: 154, 150: 159 };
const urethaneLength = (lb: number) => { const L = URETHANE_L[lb]; if (!L) throw Error('Unsupported urethane dumbbell weight.'); return L; };
function rogueUrethaneShape(p: NumericParams): UrethaneShape {
  const lb = p.weight, d = lb <= 45 ? 31 : 34;
  return { kind: 'urethane', lb, D: URETHANE_D(lb), L: urethaneLength(lb), gap: 143, head: FINISH.urethane, brand: 'ROGUE', number: String(lb),
    handle: { style: 'straight', d, finish: FINISH.chrome, knurl: 'full', knurlLength: 119 },
    ring: { d: d + 6, w: 7, finish: FINISH.chrome }, flange: { d: d + 10, w: 2, finish: FINISH.stainless } };
}
function repUrethaneShape(p: NumericParams): UrethaneShape {
  const lb = p.weight, d = lb <= 50 ? 32 : 34;
  return { kind: 'urethane', lb, D: URETHANE_D(lb), L: urethaneLength(lb), gap: 158, head: FINISH.urethane, brand: 'REP', number: String(lb),
    handle: { style: 'straight', d, finish: fin('Satin chrome knurled handle', '#c9cdd0', .95, .26), knurl: 'full', knurlLength: 122 },
    ring: { d: d + 7, w: 13, finish: FINISH.brightZinc }, flange: { d: 59, w: 3, finish: FINISH.brightZinc } };
}
// ---------------------------------------------------------------- Pro-style (Troy HFD/PFD/RUFD, Ivanko R/EP, RUB/EPR, RMC/EPC)
const IRON = 7.15e-3, STEEL = 7.85e-3; // g/mm³
/** Stacked-plate head from mass: total plate thickness for diameter D after the handle and end cap, split into equal plates ≤ tMax. */
function proPlates(lb: number, D: number, grip: number, d: number, capMass: number, tMax: number, fill: number) {
  const handle = STEEL * Math.PI / 4 * d * d * (grip + 90) / 1000, head = (lb * LB - handle) / 2 - capMass;
  const total = head * 1000 / (IRON * fill * Math.PI / 4 * D * D), plates = Math.max(1, Math.ceil(total / tMax));
  return { plates, t: round1(Math.max(8, total / plates)) };
}
/** Plate diameter by weight, estimated from product photos (Troy grows to its 8" plate by 27.5 lb). */
const TROY_D = (lb: number) => lb <= 5 ? 115 : lb <= 7.5 ? 128 : lb <= 10 ? 150 : lb <= 12.5 ? 160 : lb <= 15 ? 170 : lb <= 17.5 ? 178 : lb <= 20 ? 185 : lb <= 22.5 ? 190 : lb <= 25 ? 196 : 203;
export const TROY_FINISHES = ['Gray hammertone (HFD)', 'Black textured (PFD)', 'Rubber encased (RUFD)'] as const;
export const TROY_HANDLES = ['Straight 27 mm handle', 'Contoured 32 mm handle'] as const;
function troyShape(p: NumericParams): ProShape {
  const lb = p.weight, D = TROY_D(lb), contoured = p.handle === 1, d = contoured ? 32 : 27, grip = 150, rubber = p.finish === 2;
  const capD = round1(D * .56), { plates, t } = proPlates(lb, D, grip, d, .35, 27, rubber ? .82 : .94);
  const plate = rubber ? fin('Black rubber-encased plates', '#1b1c1e', 0, .8) : p.finish === 1 ? fin('Black textured machined plates', '#232426', .35, .6) : FINISH.grayHammer;
  return { kind: 'pro', lb, D, plates, t, grip, plate, rubber, brand: 'TROY', number: String(lb),
    handle: { style: contoured ? 'contour' : 'straight', d, finish: FINISH.chrome, knurl: contoured ? 'bands' : 'full' },
    hub: { d: d + 14, w: 9, finish: FINISH.chrome }, cap: { style: rubber ? 'troy-rubber' : 'troy-chrome', d: capD, w: 13 } };
}
const IVANKO_D = (lb: number) => lb <= 5 ? 150 : lb <= 7.5 ? 168 : lb <= 10 ? 190 : lb <= 12.5 ? 200 : lb <= 15 ? 210 : lb <= 17.5 ? 220 : 230;
export const IVANKO_FINISHES = ['Gray cast iron, ductile end plates (R/EP)', 'Rubber encased, rubber end plates (RUB/EPR)', 'Chrome plates and end plates (RMC/EPC)'] as const;
function ivankoShape(p: NumericParams): ProShape {
  const lb = p.weight, D = IVANKO_D(lb), d = 30, grip = 133, rubber = p.finish === 1, chrome = p.finish === 2, washer = lb <= 7.5;
  const capD = round1(D * .62), { plates, t } = proPlates(lb, D, grip, d, washer ? .1 : .6, 25, rubber ? .82 : .95);
  const plate = rubber ? fin('Black rubber-encased plates', '#19191b', 0, .78) : chrome ? FINISH.chrome : FINISH.ivankoGray;
  return { kind: 'pro', lb, D, plates, t, grip, plate, rubber, brand: 'IVANKO', number: String(lb),
    handle: { style: 'straight', d, finish: FINISH.chrome, knurl: 'full' }, hub: { d: 42, w: 8, finish: FINISH.chrome },
    cap: { style: washer ? 'washer' : rubber ? 'ivanko-rubber' : chrome ? 'ivanko-chrome' : 'ivanko-iron', d: washer ? 60 : capD, w: washer ? 8 : 12 } };
}
// ---------------------------------------------------------------- York cast heads
/** Cast head from mass: diameter for a crowned cylinder or bun of width/diameter `aspect`, or a sphere (aspect 1). */
function castHead(lb: number, d: number, grip: number, aspect: number, fill: number, oneHandle = false) {
  const solve = (dd: number) => {
    const handle = (oneHandle ? IRON : STEEL) * Math.PI / 4 * dd * dd * grip, V = (lb * LB * 1000 - handle) / 2 / IRON;
    const D = Math.cbrt(Math.max(V, 1) / (fill * Math.PI / 4 * aspect)); return { D: round1(D), W: round1(aspect * D), d: dd };
  };
  // Small sizes carry a thinner handle: keep the bar under 55 % of the head diameter.
  let r = solve(d); for (let i = 0; i < 4 && r.d > .55 * r.D; i++) r = solve(round1(.55 * r.D));
  return r;
}
export const YORK_ROUNDHEAD_WEIGHTS = [...steps(1, 10, 1), 12, ...steps(15, 100, 5)];
export const YORK_ROUNDHEAD_FINISHES = ['Black, worn to bare iron', 'Gray hammertone'] as const;
function yorkRoundheadShape(p: NumericParams): CastShape {
  const lb = p.weight; if (!YORK_ROUNDHEAD_WEIGHTS.includes(lb)) throw Error('Unsupported York roundhead weight.');
  const { D, W, d } = castHead(lb, lb <= 12 ? 25.4 : 28.6, lb <= 12 ? 92 + 2.5 * lb : 124, .5, .9), grip = lb <= 12 ? 92 + 2.5 * lb : 124;
  const head = p.finish ? fin('Gray hammertone cast-iron heads', '#6f7676', .4, .6) : fin('Black cast iron, worn to bare iron', '#34322f', .5, .62);
  return { kind: 'cast', lb, style: 'crown', D, W, grip, head, brand: 'YORK', number: String(lb), frame: false,
    handle: { style: 'straight', d, finish: FINISH.bareSteel, knurl: 'none' } };
}
export const YORK_LEGACY_WEIGHTS = steps(5, 150, 5);
function yorkLegacyShape(p: NumericParams): CastShape {
  const lb = p.weight; if (!YORK_LEGACY_WEIGHTS.includes(lb)) throw Error('Unsupported York Legacy weight.');
  const grip = 127, { D, W, d } = castHead(lb, 33, grip, .5, .9);
  return { kind: 'cast', lb, style: 'crown', D, W, grip, head: fin('Black painted cast-iron heads', '#27282b', .3, .72), brand: 'YORK', number: String(lb), frame: true,
    handle: { style: 'straight', d, finish: fin('Black knurled 33 mm steel handle', '#3a3b3d', .7, .45), knurl: 'full' } };
}
/** 1–10 and 12 lb solid-cast buns, 15–45 lb buns on a 1" steel bar, 50–100 lb globes (Vintage Weights PGH set history). */
export const YORK_BUN_GLOBE_WEIGHTS = [...steps(1, 10, 1), 12, ...steps(15, 45, 5), ...steps(50, 100, 5)];
function yorkBunGlobeShape(p: NumericParams): CastShape {
  const lb = p.weight; if (!YORK_BUN_GLOBE_WEIGHTS.includes(lb)) throw Error('Unsupported York bun or globe weight.');
  const solid = lb <= 12, globe = lb >= 50, grip = solid ? 90 + lb * 2 : lb === 55 || lb === 65 ? 114 : 127;
  const { D, W, d } = globe ? castHead(lb, 25.4, grip, 1, Math.PI / 6 / (Math.PI / 4)) : castHead(lb, solid ? 24 : 25.4, grip, .62, .78, solid);
  const head = fin('Cast iron with aged black patina', '#564c40', .45, .72);
  return { kind: 'cast', lb, style: globe ? 'globe' : 'bun', D, W: globe ? D : W, grip, head, brand: 'YORK', number: String(lb), frame: false,
    handle: solid ? { style: 'cast', d, finish: head, knurl: 'none' } : { style: 'straight', d, finish: FINISH.bareSteel, knurl: 'none' } };
}
// ---------------------------------------------------------------- Rogue Thompson Fatbell
/** Rogue's published bell diameter per weight; handle 32/37/40 mm; stripe colours read from Rogue's size-lineup photo. */
export const FATBELLS: readonly (readonly [number, number, string])[] = [
  [9, 161, '#e9e7e1'], [13, 172, '#3a3b3d'], [18, 185, '#e57a8a'], [26, 194, '#1f63c4'], [35, 204, '#f0c419'], [44, 214, '#6a4a9c'], [53, 221, '#1f8a4c'],
  [62, 230, '#e0701e'], [70, 236, '#c8242d'], [80, 244, '#8d9094'], [88, 244, '#e9e7e1'], [97, 256, '#1f63c4'], [106, 262, '#f0c419'], [124, 273, '#6a4a9c'], [150, 286, '#1f8a4c'],
];
function fatbellShape(p: NumericParams): FatbellShape {
  const [lb, D, stripe] = row(FATBELLS, p.weight, 'Fatbell'), R = D / 2, zTop = .785 * R, zBase = -.89 * R, openBottom = lb <= 18;
  const opening = .9 * Math.sqrt(R * R - zTop * zTop), handleD = lb <= 18 ? 32 : lb <= 88 ? 37 : 40;
  const outer = Math.PI * ((R * R * zTop - zTop ** 3 / 3) - (R * R * zBase - zBase ** 3 / 3));
  const cavity = Math.min(R - 8, Math.max(opening + 6, Math.cbrt(3 * Math.max(0, outer - lb * LB * 1000 / IRON) / (4 * Math.PI))));
  return { kind: 'fatbell', lb, D, zTop, zBase, opening, cavity: round1(cavity), openBottom, handleD, stripe };
}
// ---------------------------------------------------------------- Loadable handles
/** Iron change plates: 10 and 25 lb reuse the shared Olympic plate specs; 2.5 and 5 lb estimated from CAP/Titan change plates. */
export const LOADABLE_PLATES: readonly LoadablePlate[] = [
  { lb: 25, d: PLATE_SPECS.lb25.diameter, w: PLATE_SPECS.lb25.width }, { lb: 10, d: PLATE_SPECS.lb10.diameter, w: PLATE_SPECS.lb10.width },
  { lb: 5, d: 203, w: 22 }, { lb: 2.5, d: 162, w: 16 },
];
export const LOADABLE_PLATE_GAP = .5;
/** Plates for one sleeve, largest first from the collar outward. */
export function loadablePlates(perSide: number): LoadablePlate[] {
  const out: LoadablePlate[] = []; let rest = perSide;
  for (const p of LOADABLE_PLATES) while (rest >= p.lb - 1e-9) { out.push(p); rest = round1(rest - p.lb); }
  if (Math.abs(rest) > 1e-9) throw Error('Unsupported plate load.');
  return out;
}
const stackLength = (plates: readonly LoadablePlate[]) => plates.reduce((s, p, i) => s + p.w + (i ? LOADABLE_PLATE_GAP : 0), 0);
const LOADS = [...steps(0, 25, 2.5), ...steps(30, 100, 5)];
/** Per-side loads whose plate stack (plus the collar, when fitted) fits on the sleeve. */
export const loadableLoads = (sleeve: number, collar = 0) => LOADS.filter(v => stackLength(loadablePlates(v)) + collar + (v ? 1 : 0) <= sleeve);
const OSO = { kind: 'oso' as const, d: 92, w: 42, finish: fin('Rogue OSO collar', '#8d9296', .6, .4) };
const SCREW = (finish: Finish) => ({ kind: 'screw' as const, d: 76, w: 25, finish });
export const ROGUE_DB_MODELS = ['DB-15', 'DB-10'] as const;
export const ROGUE_DB_FINISHES = ['Black zinc shaft / bright zinc sleeves', 'Stainless shaft / bright zinc sleeves', 'Stainless shaft / matte black sleeves'] as const;
const rogueDb = (model: number) => model ? { length: inch(14.25), sleeve: inch(3.625), lb: 9 } : { length: inch(20.5), sleeve: inch(6.75), lb: 14 };
function rogueDbShape(p: NumericParams): LoadableShape {
  const m = rogueDb(p.model), flange = { d: 70, w: 13 }, grip = m.length - 2 * m.sleeve - 2 * flange.w;
  return { kind: 'loadable', length: m.length, sleeve: m.sleeve, sleeveD: 50, flange, grip, d: 28.5, knurlLength: inch(5.5),
    shaft: p.finish === 0 ? FINISH.blackZinc : FINISH.stainless, sleeves: p.finish === 2 ? FINISH.matteBlack : FINISH.brightZinc, bushing: true,
    cap: { color: '#1d1e20', open: false }, plates: loadablePlates(p.load), collar: p.collars ? OSO : undefined };
}
function strengthCoShape(p: NumericParams): LoadableShape {
  const length = inch(18.75), sleeve = inch(5.75), grip = inch(6), flange = { d: 74, w: (length - 2 * sleeve - grip) / 2 };
  return { kind: 'loadable', length, sleeve, sleeveD: 50, flange, grip, d: 28.5, knurlLength: grip - 8, shaft: FINISH.brightZinc, sleeves: FINISH.brightZinc,
    bushing: true, cap: { color: '#eeeeea', open: false }, plates: loadablePlates(p.load) };
}
export const CAP_OB_FINISHES = ['Black', 'Chrome', 'Chrome with rubber grip'] as const;
function capObShape(p: NumericParams): LoadableShape {
  const length = inch(20), sleeve = inch(6.5), flange = { d: 72, w: 10 }, grip = length - 2 * sleeve - 2 * flange.w, black = p.finish === 0;
  const steel = black ? FINISH.blackOxide : FINISH.chrome;
  return { kind: 'loadable', length, sleeve, sleeveD: 50, flange, grip, d: 25.4, knurlLength: grip - 16, shaft: steel, sleeves: steel, bushing: false,
    grips: p.finish === 2 ? fin('Black rubber grip sleeve', '#1b1b1c', 0, .85) : undefined, cap: { color: '#101011', open: true },
    plates: loadablePlates(p.load), collar: p.collars ? SCREW(black ? fin('Black screw collar', '#1c1d1f', .6, .45) : FINISH.chrome) : undefined };
}
function titanShape(p: NumericParams): LoadableShape {
  const length = inch(20), sleeve = inch(6.5), grip = inch(5.75), w = (length - 2 * sleeve - grip) / 2;
  return { kind: 'loadable', length, sleeve, sleeveD: 50, flange: { d: 70, w: w * .6, step: { d: 58, w: w * .4 } }, grip, d: 28, knurlLength: grip,
    shaft: FINISH.chrome, sleeves: FINISH.chrome, bushing: true, cap: { color: '#1f2a4d', open: false }, plates: loadablePlates(p.load) };
}
// ---------------------------------------------------------------- registry entries
const weightParam = (options: readonly number[], def: number, label = 'Weight'): FloorParam => ({ key: 'weight', label, default: def, options, format: pounds });
const enumParam = (key: string, label: string, names: readonly string[], def = 0): FloorParam => ({ key, label, default: def, options: names.map((_, i) => i), format: v => names[v] ?? String(v) });
const envelopeBox = (shape: (p: NumericParams) => DumbbellShape) => (p: NumericParams): FloorBox => { const e = dumbbellEnvelope(shape(p)); return { width: e.width, depth: e.depth }; };
const PLACEMENT = { side: 'left' as const, gap: 300 };
const PAIR = { gap: 60 };
const rows = (r: readonly (readonly [number, ...unknown[]])[]) => r.map(x => x[0]);
/** Shape resolver per part id; the builder dispatches on the returned `kind`. */
export const DUMBBELL_SHAPES: Record<string, (p: NumericParams) => DumbbellShape> = {};
function dumbbell<const Id extends string>(spec: Omit<FloorPartSpec<Id>, 'footprint' | 'placement' | 'pair' | 'section'>, shape: (p: NumericParams) => DumbbellShape) {
  DUMBBELL_SHAPES[spec.id] = shape;
  return defineFloorPart<Id>({ ...spec, footprint: envelopeBox(shape), placement: PLACEMENT, pair: PAIR, section: 'Dumbbells' });
}
const recon = (published: string, estimated: string) => `Independent Manifold reconstruction from ${published}. ${estimated} Weight numbers and brand names are typeset in a generic font (no logo artwork); scenery only, excluded from print export.`;
export const CAP_RUBBER_HEX = dumbbell({
  id: 'cap-rubber-hex-dumbbell', name: 'CAP rubber hex dumbbell', title: 'CAP Barbell rubber hex dumbbell', noun: 'dumbbell',
  description: 'CAP Barbell rubber-coated hex dumbbell (SDR), 3–120 lb, with chrome or black-oxide ergo handle. Independent reconstruction from published dimensions; CAP Barbell trademarks belong to CAP Barbell.',
  params: [weightParam(rows(CAP_RUBBER), 25), enumParam('handle', 'Handle', CAP_HANDLES)],
  vendor: { vendor: 'CAP Barbell', url: 'https://capbarbell.com/products/cap-barbell-rubber-hex-dumbbell-pair', credit: 'CAP Barbell — Rubber Coated Hex Dumbbell (SDR / SDRIS / SDRBIS)', trademark: 'CAP and CAP Barbell are trademarks of CAP Barbell, Inc.',
    reconstruction: recon('the retailer per-weight length × corners × flats for all 27 sizes, CAP dimension graphics (15–80 lb) and product photos', 'Head length is derived from the 5.04" exposed handle; handle Ø between graphics, ergo contour and knurl zones are estimated.') },
}, capRubberShape);
export const CAP_CAST_HEX = dumbbell({
  id: 'cap-cast-iron-hex-dumbbell', name: 'CAP cast iron hex dumbbell', title: 'CAP Barbell cast iron hex dumbbell', noun: 'dumbbell',
  description: 'CAP Barbell black cast iron hex dumbbell (SDB2), 5–120 lb, silver framed weight numerals; one-piece cast handle to 15 lb. Independent reconstruction from published dimensions; CAP Barbell trademarks belong to CAP Barbell.',
  params: [weightParam(rows(CAP_IRON), 25)],
  vendor: { vendor: 'CAP Barbell', url: 'https://capbarbell.com/products/cap-cast-iron-hex-dumbbell-black', credit: 'CAP Barbell — Cast Iron Hex Dumbbell, Black (SDB2)', trademark: 'CAP and CAP Barbell are trademarks of CAP Barbell, Inc.',
    reconstruction: recon('CAP per-weight dimension graphics (overall length, head size, handle Ø) and product photos', '30/35/50/55 lb are interpolated; head length is derived from the 5.08" handle; chamfers and label frame size are estimated.') },
}, capIronShape);
export const ROGUE_RUBBER_HEX = dumbbell({
  id: 'rogue-rubber-hex-dumbbell', name: 'Rogue rubber hex dumbbell', title: 'Rogue rubber hex dumbbell', noun: 'dumbbell',
  description: 'Rogue rubber hex dumbbell, 2.5–125 lb, contoured chrome handle with centre knurl band and ROGUE / weight label panels. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [weightParam(rows(ROGUE_HEX), 50)],
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-dumbbells', credit: 'Rogue Fitness — Rogue Dumbbells (rubber hex)', trademark: 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    reconstruction: recon('the published 25/35 mm handle diameters and product photos', 'Rogue publishes no per-weight head sizes: heads carry REP-equivalent volumes in Rogue proportions (±10–15 %); knurl bands and contour are photo estimates.') },
}, rogueHexShape);
export const REP_HEX_DB = dumbbell({
  id: 'rep-hex-dumbbell', name: 'REP hex dumbbell', title: 'REP Fitness rubber hex dumbbell', noun: 'dumbbell',
  description: 'REP Fitness rubber hex dumbbell, 2.5–125 lb, straight fully knurled chrome handle, bevelled heads with REP / weight panels. Independent reconstruction; REP trademarks belong to REP Fitness.',
  params: [weightParam(rows(REP_HEX), 50)],
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/rubber-hex-dumbbell-pairs', credit: 'REP Fitness — Rubber Hex Dumbbells', trademark: 'REP and REP Fitness are trademarks of REP Fitness.',
    reconstruction: recon('the published 5.2" grip and 28/34 mm handle diameters, with head sizes measured from REP\'s per-weight product photos', 'Weights that share a product photo are interpolated (±5 %); bevel depth and panel size are estimated.') },
}, repHexShape);
export const AMAZON_RUBBER_HEX = dumbbell({
  id: 'amazon-basics-rubber-hex-dumbbell', name: 'Amazon Basics rubber hex dumbbell', title: 'Amazon Basics rubber encased hex dumbbell', noun: 'dumbbell',
  description: 'Amazon Basics rubber encased hex dumbbell, 10–50 lb, contoured chrome handle and moulded "LB" weight panels. Independent reconstruction; Amazon Basics trademarks belong to Amazon.',
  params: [weightParam(rows(AMAZON_HEX), 25)],
  vendor: { vendor: 'Amazon Basics', url: 'https://www.amazon.com/dp/B0DKNNNH6X', credit: 'Amazon Basics — Rubber Encased Hex Dumbbell', trademark: 'Amazon and Amazon Basics are trademarks of Amazon.com, Inc.',
    reconstruction: recon('per-variant item dimensions (length × corners, 10–45 lb), the 10 lb metric dimension graphic and product photos', 'Head length follows a 4.8" photo-measured handle; the 50 lb size and the grip contour are estimated.') },
}, amazonHexShape);
export const BODY_SOLID_HEX = dumbbell({
  id: 'body-solid-cast-iron-hex-dumbbell', name: 'Body-Solid cast iron hex dumbbell', title: 'Body-Solid cast iron hex dumbbell', noun: 'dumbbell',
  description: 'Body-Solid SDX gray cast iron hex dumbbell, 3–100 lb, raised silver numerals; one-piece cast handle to 12 lb. Independent reconstruction; Body-Solid trademarks belong to Body-Solid.',
  params: [weightParam(rows(BODY_SOLID), 25)],
  vendor: { vendor: 'Body-Solid', url: 'https://bodysolid.com/hex-dumbbells', credit: 'Body-Solid — Cast Iron Hex Dumbbells (SDX)', trademark: 'Body-Solid is a trademark of Body-Solid, Inc.',
    reconstruction: recon('Body-Solid\'s published per-weight head size (2–8") and product photos', 'Overall length, grip and handle Ø are estimated from the equivalent CAP cast hex.') },
}, bodySolidShape);
export const AMAZON_NEOPRENE = dumbbell({
  id: 'amazon-basics-neoprene-dumbbell', name: 'Amazon Basics neoprene dumbbell', title: 'Amazon Basics neoprene dumbbell', noun: 'dumbbell',
  description: 'Amazon Basics neoprene-coated hexagon hand weight, 1–20 lb, colour-coded by weight with the weight on each end. Independent reconstruction; Amazon Basics trademarks belong to Amazon.',
  params: [weightParam(rows(NEOPRENE), 10)],
  vendor: { vendor: 'Amazon Basics', url: 'https://www.amazon.com/dp/B01LR5S6HK', credit: 'Amazon Basics — Neoprene Dumbbell Hand Weights', trademark: 'Amazon and Amazon Basics are trademarks of Amazon.com, Inc.',
    reconstruction: recon('per-variant item dimensions (overall length × head width, 1–20 lb), listed colours and product photos', 'Head length, handle thickness and edge rounding are photo estimates; 7 lb dimensions are interpolated.') },
}, neopreneShape);
export const ROGUE_URETHANE = dumbbell({
  id: 'rogue-urethane-dumbbell', name: 'Rogue urethane dumbbell', title: 'Rogue urethane dumbbell', noun: 'dumbbell',
  description: 'Rogue urethane round dumbbell, 5–150 lb, 6" straight knurled chrome handle, white printed ROGUE and boxed weight. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [weightParam(steps(5, 150, 5), 50)],
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-urethane-dumbbells', credit: 'Rogue Fitness — Rogue Urethane Dumbbells (IP0661)', trademark: 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    reconstruction: recon('the published head diameters (127/153/173/193/204 mm), 31/34 mm handle and 6" handle length', 'Head lengths are photo-measured on the matching REP heads to 50 lb and mass-modelled above; face step and collars are photo estimates.') },
}, rogueUrethaneShape);
export const REP_URETHANE = dumbbell({
  id: 'rep-urethane-dumbbell', name: 'REP urethane dumbbell', title: 'REP Fitness urethane dumbbell', noun: 'dumbbell',
  description: 'REP Fitness urethane-coated round dumbbell, 5–150 lb, 6" handle with 4.8" knurl, white printed REP and boxed weight. Independent reconstruction; REP trademarks belong to REP Fitness.',
  params: [weightParam(steps(5, 150, 5), 50)],
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/urethane-coated-round-dumbbell-pairs', credit: 'REP Fitness — Urethane Coated Round Dumbbells (DBS-5000)', trademark: 'REP and REP Fitness are trademarks of REP Fitness.',
    reconstruction: recon('the published 6.0" handle, 4.8" knurl and 32/34 mm diameters, with head sizes measured from REP\'s per-weight photos (5–50 lb)', '55–150 lb heads assume the same OEM diameter bands with mass-modelled lengths.') },
}, repUrethaneShape);
export const TROY_PRO_STYLE = dumbbell({
  id: 'troy-pro-style-dumbbell', name: 'Troy pro-style dumbbell', title: 'Troy Barbell pro-style dumbbell', noun: 'dumbbell',
  description: 'Troy Barbell pro-style dumbbell (HFD/PFD/RUFD), 5–150 lb, stacked machined plates with TROY chrome end caps. Independent reconstruction; Troy trademarks belong to Troy Barbell & Fitness.',
  params: [weightParam([...steps(5, 52.5, 2.5), ...steps(55, 150, 5)], 50), enumParam('finish', 'Plates', TROY_FINISHES), enumParam('handle', 'Handle', TROY_HANDLES)],
  vendor: { vendor: 'Troy Barbell & Fitness', url: 'https://dumbbellsdirect.com/products/troy-hfd-c-pro-style-hammer-tone-gray-dumbbell-sets-chrome-end-caps', credit: 'Troy Barbell & Fitness — Pro-Style Dumbbells (HFD-C / HFDC-C / PFD / RUFD)', trademark: 'Troy is a trademark of Troy Barbell & Fitness / USA Sports.',
    reconstruction: recon('the published 27 mm straight / 32 mm contoured handles, 150 mm handle length, weight range and product photos', 'Plate diameters are photo estimates; plate count and thickness follow a cast-iron mass model.') },
}, troyShape);
export const IVANKO_FIXED = dumbbell({
  id: 'ivanko-fixed-dumbbell', name: 'Ivanko fixed dumbbell', title: 'Ivanko fixed pro-style dumbbell', noun: 'dumbbell',
  description: 'Ivanko fixed dumbbell, 5–150 lb, 30 mm drop-forged handle, cast plates with ductile end plates, rubber or chrome options. Independent reconstruction; Ivanko trademarks belong to Ivanko Barbell Company.',
  params: [weightParam([...steps(5, 57.5, 2.5), ...steps(60, 150, 5)], 50), enumParam('finish', 'Plates', IVANKO_FINISHES)],
  vendor: { vendor: 'Ivanko Barbell Company', url: 'https://ivankobarbell.com/products/fixed-dumbbells-cast-iron-plates-w-ductile-cast-iron-end-plates-gray-r-ep-1-25', credit: 'Ivanko Barbell Company — Fixed Dumbbells (R/EP-1.25, RUB/EPR, RMC/EPC)', trademark: 'Ivanko and PermaLock are trademarks of Ivanko Barbell Company.',
    reconstruction: recon('the published 30 mm handle, weight range, end-plate construction (washers on 5/7.5 lb) and product photos', 'Plate diameters are photo estimates; plate count and thickness follow a cast-iron mass model.') },
}, ivankoShape);
export const YORK_ROUNDHEAD = dumbbell({
  id: 'york-vintage-roundhead-dumbbell', name: 'York roundhead dumbbell', title: 'York Barbell vintage roundhead dumbbell', noun: 'dumbbell',
  description: 'Vintage York Barbell solid roundhead dumbbell (1960s–1990s), 1–100 lb, crowned cast heads with raised YORK and weight panels, smooth steel handle. Independent reconstruction; York Barbell trademarks belong to York Barbell.',
  params: [weightParam(YORK_ROUNDHEAD_WEIGHTS, 25), enumParam('finish', 'Finish', YORK_ROUNDHEAD_FINISHES)],
  vendor: { vendor: 'York Barbell', url: 'https://www.vintageweightspgh.com/equipment/york-roundhead-dumbbells', credit: 'York Barbell — vintage solid roundhead dumbbells (collector reference: Vintage Weights PGH)', trademark: 'York and York Barbell are trademarks of York Barbell Company.',
    reconstruction: recon('the collector weight run (1–10, 12, 15–100 lb) and collector photos and videos', 'No dimensions are published: head diameter comes from a cast-iron mass model at the photographed 0.5 width/diameter ratio.') },
}, yorkRoundheadShape);
export const YORK_BUNS_GLOBES = dumbbell({
  id: 'york-vintage-bun-globe-dumbbell', name: 'York bun / globe dumbbell', title: 'York Barbell vintage buns & globes dumbbell', noun: 'dumbbell',
  description: 'Vintage York Barbell (1930s–60s) dumbbells: solid-cast buns 1–12 lb, buns on a 1" steel bar 15–45 lb and globes 50–100 lb, raised YORK and weight. Independent reconstruction; York Barbell trademarks belong to York Barbell.',
  params: [weightParam(YORK_BUN_GLOBE_WEIGHTS, 50)],
  vendor: { vendor: 'York Barbell', url: 'https://www.youtube.com/watch?v=HdxSIU3Bxt4', credit: 'York Barbell — vintage bun and globe dumbbells (collector reference: Vintage Weights PGH)', trademark: 'York and York Barbell are trademarks of York Barbell Company.',
    reconstruction: recon('the collector-documented set (weights, 1" smooth steel bar, ≈5" handle, 4.5" on 55/65 lb) and collector photos', 'Head and globe diameters come from a cast-iron mass model; bun profile is photo-estimated.') },
}, yorkBunGlobeShape);
export const YORK_LEGACY = dumbbell({
  id: 'york-legacy-round-dumbbell', name: 'York Legacy dumbbell', title: 'York Legacy solid round dumbbell', noun: 'dumbbell',
  description: 'York Legacy solid round dumbbell, 5–150 lb, re-creation of the foundry roundhead with framed YORK and weight panels and a knurled 33 mm handle. Independent reconstruction; York Barbell trademarks belong to York Barbell.',
  params: [weightParam(YORK_LEGACY_WEIGHTS, 25)],
  vendor: { vendor: 'York Barbell', url: 'https://yorkbarbell.com/product/legacy-solid-round-dumbbell/', credit: 'York Barbell — Legacy Solid Round Dumbbell', trademark: 'York and York Barbell are trademarks of York Barbell Company.',
    reconstruction: recon('the published 33 mm knurled handle, 5–150 lb range and York\'s product photos', 'Head diameter comes from a cast-iron mass model at the photographed width/diameter ratio; crown and panel size are estimated.') },
}, yorkLegacyShape);
export const ROGUE_FATBELL = dumbbell({
  id: 'rogue-thompson-fatbell', name: 'Rogue Thompson Fatbell', title: 'Rogue Thompson Fatbell', noun: 'fatbell',
  description: 'Rogue Thompson Fatbell, 9–150 lb: open-topped cast iron sphere with an interior ergo handle and colour-coded stripe. Independent reconstruction; Rogue and Thompson Fatbell trademarks belong to their owners.',
  params: [weightParam(rows(FATBELLS), 53)],
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-thompson-fatbells', credit: 'Rogue Fitness — Rogue Thompson Fatbells (Donnie Thompson design)', trademark: 'Rogue is a trademark of Rogue Fitness; Fatbell is a trademark of Donnie Thompson.',
    reconstruction: recon('the published bell diameter per weight (161–286 mm) and 32/37/40 mm handle diameters', 'Opening, base flat and cavity size follow a cast-iron mass model and photos; stripe colours are read from Rogue\'s lineup photo.') },
}, fatbellShape);
const loadParam = (options: (p: NumericParams) => readonly number[], def: number): FloorParam => ({ key: 'load', label: 'Plates per side', default: def, options, format: v => v ? `${v} lb` : 'Empty' });
export const ROGUE_DB15 = dumbbell({
  id: 'rogue-db15-loadable-dumbbell', name: 'Rogue DB-15 loadable dumbbell', title: 'Rogue DB-15 loadable dumbbell', noun: 'dumbbell',
  description: 'Rogue DB-15 (and DB-10) loadable dumbbell: 28.5 mm Ohio-knurl handle, bushing sleeves for Olympic plates, optional OSO collars. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [enumParam('model', 'Model', ROGUE_DB_MODELS), enumParam('finish', 'Finish', ROGUE_DB_FINISHES), enumParam('collars', 'Collars', ['None', 'Rogue OSO collars']),
    loadParam(p => loadableLoads(rogueDb(p.model).sleeve, p.collars ? OSO.w : 0), 25)],
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-loadable-dumbbells', credit: 'Rogue Fitness — Rogue Loadable Dumbbells (DB-15 / DB-10)', trademark: 'Rogue, Ohio Bar and OSO are trademarks of Rogue Fitness.',
    reconstruction: recon('the published 20.5" / 14.25" length, 6.75" / 3.625" loadable sleeves, 28.5 mm handle and 5.5" knurl', 'Collar flange, bushing and OSO collar sizes are photo estimates; plates are generic iron change plates.') },
}, rogueDbShape);
export const STRENGTH_CO_LOADABLE = dumbbell({
  id: 'strength-co-loadable-dumbbell', name: 'Strength Co. loadable dumbbell', title: 'The Strength Co. loadable dumbbell (MB-12)', noun: 'dumbbell',
  description: 'The Strength Co. "Mini Barbell" MB-12 loadable dumbbell: bright zinc, 28.5 mm medium knurl, 5.75" sleeves. Independent reconstruction; The Strength Co. trademarks belong to The Strength Co.',
  params: [loadParam(() => loadableLoads(inch(5.75)), 25)],
  vendor: { vendor: 'The Strength Co.', url: 'https://www.thestrength.co/products/loadable-dumbbell-made-in-usa', credit: 'The Strength Co. — Loadable Dumbbell "Mini Barbell" MB-12', trademark: 'The Strength Co. is a trademark of The Strength Co.',
    reconstruction: recon('the published 18.75" length, 5.75" sleeves, 6" between sleeves and 28.5 mm handle', 'Collar flange diameter and chamfers are photo estimates; plates are generic iron change plates.') },
}, strengthCoShape);
export const CAP_OLYMPIC_HANDLE = dumbbell({
  id: 'cap-olympic-dumbbell-handle', name: 'CAP Olympic dumbbell handle', title: 'CAP Barbell loadable Olympic dumbbell handle', noun: 'dumbbell handle',
  description: 'CAP Barbell 20" solid Olympic dumbbell handle (OB-20) with rotating 2" sleeves and screw collars, black, chrome or rubber-grip. Independent reconstruction; CAP Barbell trademarks belong to CAP Barbell.',
  params: [enumParam('finish', 'Finish', CAP_OB_FINISHES), enumParam('collars', 'Collars', ['None', 'Screw collars'], 1), loadParam(p => loadableLoads(inch(6.5), p.collars ? 25 : 0), 25)],
  vendor: { vendor: 'CAP Barbell', url: 'https://capbarbell.com/products/cap-barbell-deluxe-folding-foam-exercise-mat', credit: 'CAP Barbell — 20" Olympic Solid Dumbbell Handle (OB-20)', trademark: 'CAP and CAP Barbell are trademarks of CAP Barbell, Inc.',
    reconstruction: recon('the published 20" length, 6.5" loadable sleeves, 2" sleeves and product photos', 'Flange and screw-collar sizes are photo estimates; plates are generic iron change plates.') },
}, capObShape);
export const TITAN_LOADABLE = dumbbell({
  id: 'titan-loadable-olympic-dumbbell-handle', name: 'Titan loadable dumbbell handle', title: 'Titan loadable 20" Olympic dumbbell handle', noun: 'dumbbell handle',
  description: 'Titan Fitness loadable 20" Olympic dumbbell handle: chrome, 28 mm medium diamond knurl, bronze-bushed 6.5" sleeves. Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [loadParam(() => loadableLoads(inch(6.5)), 25)],
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/loadable-20-in-olympic-dumbbell-handles-pair', credit: 'Titan Fitness — Loadable 20" Olympic Dumbbell Handles (430365)', trademark: 'Titan Fitness is a trademark of Titan Fitness.',
    reconstruction: recon('the published 20" length, 6.5" sleeves, 5.75" knurled grip, 28 mm shaft and 50 mm sleeves', 'Collar step sizes are photo estimates; plates are generic iron change plates.') },
}, titanShape);
export const PARTS = [
  CAP_RUBBER_HEX, CAP_CAST_HEX, ROGUE_RUBBER_HEX, REP_HEX_DB, YORK_ROUNDHEAD, ROGUE_FATBELL, REP_URETHANE, AMAZON_RUBBER_HEX, ROGUE_DB15, BODY_SOLID_HEX,
  YORK_BUNS_GLOBES, ROGUE_URETHANE, STRENGTH_CO_LOADABLE, AMAZON_NEOPRENE, YORK_LEGACY, CAP_OLYMPIC_HANDLE, IVANKO_FIXED, TROY_PRO_STYLE, TITAN_LOADABLE,
] as const;
/** The resolved shape for a part id and params (throws on an unknown id). */
export function dumbbellShape(id: string, p: NumericParams): DumbbellShape {
  const s = DUMBBELL_SHAPES[id]; if (!s) throw Error(`Unknown dumbbell ${id}.`); return s(p);
}
