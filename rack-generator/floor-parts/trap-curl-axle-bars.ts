/** Trap, curl, axle and multi-grip bars (#109). Metadata only (main bundle): never import Manifold builders here.
 * Specs are published dimensions in mm (sources and estimates: research/trap-curl-axle-bars.md); the builders in
 * ../parts/trap-curl-axle-bars.ts read them, and the analytic envelopes below give the floor footprints.
 * Frames: X along the bar, Y across it, Z up, origin on the floor under the bar centre. */
import { defineFloorPart, type BarSpec, type FloorParam, type FloorPart } from '../floor-part.ts';
import type { NumericParams, Vec2 } from '../types.ts';
const inch = (v: number) => Math.round(v * 25.4 * 100) / 100;
type P2 = readonly [number, number];
export interface Mat { color: string; metalness: number; roughness: number }
export const MAT = {
  texturedBlack: { color: '#2a2b2e', metalness: .15, roughness: .86 }, glossBlack: { color: '#141517', metalness: .3, roughness: .38 },
  metallicBlack: { color: '#1d1f22', metalness: .55, roughness: .42 }, ecoat: { color: '#111214', metalness: .4, roughness: .32 },
  cerakote: { color: '#1e1f21', metalness: .2, roughness: .62 }, blackOxide: { color: '#27292c', metalness: .62, roughness: .45 },
  matteBlack: { color: '#222326', metalness: .5, roughness: .55 }, hardChrome: { color: '#dde1e4', metalness: 1, roughness: .15 },
  chrome: { color: '#e9ecef', metalness: 1, roughness: .09 }, brightZinc: { color: '#cdd5dc', metalness: 1, roughness: .22 },
  clearZinc: { color: '#c6cbcf', metalness: .95, roughness: .3 }, stainless: { color: '#b3b8bc', metalness: .92, roughness: .3 },
  knurlChrome: { color: '#9aa0a5', metalness: .9, roughness: .5 }, knurlZinc: { color: '#a7aeb4', metalness: .9, roughness: .55 },
  knurlStainless: { color: '#8e9397', metalness: .88, roughness: .55 }, knurlBlack: { color: '#0e0f10', metalness: .35, roughness: .9 },
  rubber: { color: '#18191a', metalness: 0, roughness: .95 }, bronze: { color: '#b08a4a', metalness: 1, roughness: .3 },
  fringeYellow: { color: '#e2b41f', metalness: .1, roughness: .5 }, gold: { color: '#e0bd5e', metalness: .85, roughness: .25 },
  badgeWhite: { color: '#e6e6e3', metalness: 0, roughness: .6 }, steelPlate: { color: '#b9bec2', metalness: .9, roughness: .35 },
  capDark: { color: '#2c2e31', metalness: .6, roughness: .4 }, satinSteel: { color: '#8e9296', metalness: .9, roughness: .38 }, satinChrome: { color: '#a3a8ad', metalness: 1, roughness: .3 },
} as const satisfies Record<string, Mat>;
export interface Finish { name: string; shaft: Mat; knurl: Mat; sleeve: Mat }
const finishParam = (finishes: readonly { name: string }[], label = 'Finish'): FloorParam =>
  ({ key: 'finish', label, default: 0, options: finishes.map((_, i) => i), format: v => finishes[v]?.name ?? String(v) });
const pick = <T,>(list: readonly T[], i: number | undefined, what: string) => { const v = list[i ?? 0]; if (!v) throw Error(`Unsupported ${what}.`); return v; };

// ─── Axle (fat) bars: one 2" tube, non-rotating collars ────────────────────────────────────────────
export interface AxleSpec { name: string; length: number; grip: number; shaftDia: number; sleeveDia: number; collarDia: number; collarWidth: number; hollow: boolean; mat: Mat; cap: Mat; rings?: readonly Vec2[] }
export const axleSleeve = (s: AxleSpec) => s.length / 2 - s.grip / 2 - s.collarWidth;
export const axleEnvelope = (s: AxleSpec) => ({ width: s.length, depth: s.collarDia, axisZ: s.collarDia / 2 });
export const TITAN_AXLES: readonly AxleSpec[] = [
  { name: '84"', length: inch(84), grip: inch(52), shaftDia: 50.3, sleeveDia: 50.3, collarDia: 68, collarWidth: 12.5, hollow: true, mat: MAT.texturedBlack, cap: MAT.capDark },
  { name: '60"', length: inch(60), grip: inch(43), shaftDia: 49, sleeveDia: 49, collarDia: 68, collarWidth: 13, hollow: true, mat: MAT.texturedBlack, cap: MAT.capDark },
];
export const FRINGE_AXLE: AxleSpec = { name: '20 kg', length: inch(84), grip: inch(84) - 2 * (inch(15.5) + 16), shaftDia: 50.8, sleeveDia: 49, collarDia: 66, collarWidth: 16, hollow: true, mat: MAT.matteBlack, cap: MAT.capDark };
/** Yellow ring marks (centre x, width) read off the product photos. */
export const FRINGE_STUBBY: AxleSpec = { name: 'Stubby', length: inch(70.75), grip: inch(70.75) - 2 * (inch(9) + 16), shaftDia: 50.8, sleeveDia: 50.8, collarDia: 66, collarWidth: 16, hollow: false, mat: MAT.matteBlack, cap: MAT.gold,
  rings: [[150, 5], [235, 28], [320, 5], [400, 5]] };
export const axleSpec = (id: string, p: NumericParams) => id === 'titan-axle-barbell' ? pick(TITAN_AXLES, p.length, 'axle length') : id === 'fringe-sport-20kg-axle-bar' ? FRINGE_AXLE : FRINGE_STUBBY;

// ─── EZ / cambered curl bars ────────────────────────────────────────────────────────────────────
/** `profile` is the shaft centreline half (x from the centre out to the inner collar face, y across), lying flat with
 * the bends horizontal; every extreme |y| sits on a flat run so the envelope is exact. `knurl` lists knurled segment indices. */
export interface CurlSpec { length: number; between: number; shaftDia: number; sleeveDia: number; collarDia: number; collarWidth: number; profile: readonly P2[]; knurl: readonly number[]; bend: number;
  finishes: readonly Finish[]; ribbed?: boolean; bushing: boolean; logoBand?: number }
export const curlSleeve = (s: CurlSpec) => s.length / 2 - s.between / 2 - s.collarWidth;
export function curlEnvelope(s: CurlSpec) {
  const r = s.shaftDia / 2, R = s.collarDia / 2, ys = s.profile.map(p => p[1]);
  const max = Math.max(Math.max(...ys) + r, R), min = Math.min(Math.min(...ys) - r, -R);
  return { width: s.length, depth: max - min, axisZ: Math.max(R, s.sleeveDia / 2), yMin: min, yMax: max };
}
/** Rogue W: centre flat, valley, long angled grip, peak, then back to the axis. */
const rogueWave = (between: number): Vec2[] => [[0, 0], [55, 0], [105, -38], [128, -38], [222, 38], [245, 38], [315, 0], [between / 2, 0]];
/** The rackable bar spreads the same W wider around a longer logo centre (spec drawing). */
const rogueRackWave = (between: number): Vec2[] => [[0, 0], [93, 0], [158, 38], [205, 38], [318, -38], [378, -38], [500, 0], [between / 2, 0]];
const ROGUE_FINISHES: Finish[] = [
  { name: 'Black E-coat · bright zinc', shaft: MAT.ecoat, knurl: MAT.knurlBlack, sleeve: MAT.brightZinc },
  { name: 'Black Cerakote · bright zinc', shaft: MAT.cerakote, knurl: MAT.knurlBlack, sleeve: MAT.brightZinc },
  { name: 'Stainless steel', shaft: MAT.stainless, knurl: MAT.knurlStainless, sleeve: MAT.stainless },
];
export const CURL_SPECS = {
  'rogue-curl-bar': { length: inch(54.5), between: inch(31.5), shaftDia: 28.5, sleeveDia: 50, collarDia: 60, collarWidth: 25.4, profile: rogueWave(inch(31.5)), knurl: [1, 3, 5], bend: 26, finishes: ROGUE_FINISHES, bushing: true, logoBand: 70 },
  'rogue-rackable-curl-bar': { length: inch(74.75), between: inch(51.8125), shaftDia: 28.5, sleeveDia: 50, collarDia: 60, collarWidth: 24.6, profile: rogueRackWave(inch(51.8125)), knurl: [1, 3, 5], bend: 40, finishes: ROGUE_FINISHES.slice(0, 2), bushing: true, logoBand: 70 },
  'rep-rackable-curl-bar': { length: inch(74), between: inch(51), shaftDia: 30, sleeveDia: 50, collarDia: 62, collarWidth: 38, profile: [[0, 0], [40, 0], [98, 50], [118, 50], [218, -50], [238, -50], [298, 0], [inch(25.5), 0]], knurl: [1, 3, 5], bend: 16, bushing: true,
    finishes: [{ name: 'Hard chrome', shaft: MAT.satinChrome, knurl: MAT.knurlChrome, sleeve: MAT.satinChrome }, { name: 'Stainless steel', shaft: MAT.stainless, knurl: MAT.knurlStainless, sleeve: MAT.stainless }] },
  'cap-olympic-ez-curl-bar': { length: 1200, between: inch(32), shaftDia: 25.4, sleeveDia: 50, collarDia: 54, collarWidth: 6, profile: [[0, 0], [50, 0], [108, -34], [138, -34], [230, 34], [260, 34], [330, 0], [inch(16), 0]], knurl: [1, 2, 3, 4, 5], bend: 40, bushing: false,
    finishes: [{ name: 'Chrome', shaft: MAT.chrome, knurl: MAT.knurlChrome, sleeve: MAT.chrome }, { name: 'Black · chrome sleeves', shaft: MAT.glossBlack, knurl: MAT.knurlBlack, sleeve: MAT.chrome }] },
  'bos-ez-curl-bar-45': { length: 1143, between: 752, shaftDia: 28, sleeveDia: 50, collarDia: 58, collarWidth: 17.5, profile: [[0, 28], [22, 28], [112, -28], [160, -28], [240, 28], [262, 28], [330, 0], [376, 0]], knurl: [1, 3], bend: 22, bushing: true, ribbed: true,
    finishes: [{ name: 'Black phosphate · nickel', shaft: MAT.blackOxide, knurl: MAT.knurlBlack, sleeve: MAT.chrome }] },
} as const satisfies Record<string, CurlSpec>;
export type CurlId = keyof typeof CURL_SPECS;

// ─── Open trap bars (jack feet, removable/bolted handle brackets) ─────────────────────────────────
/** Jack pose = standing on its feet, U frame up (as stored and photographed); flat pose = lying down, U behind the lifter.
 * `low`/`high` are flat-pose handle-centre heights above the sleeve axis (published loaded heights − 225 mm plate radius). */
export interface OpenTrapSpec {
  length: number; collarGap: number; collarWidth: number; collarDia: number; sleeveDia: number; stubDia: number;
  plateX: number; plate: { t: number; w: number; top: number };
  frame: { kind: 'round' | 'rect'; d: number; t: number; height: number; topHalf: number; legX: number; corner: number; knurl?: number };
  handles: { dia: number; span: number; low: number; high: number; widths: readonly { name: string; inner: number }[]; defaultWidth: number; bracket: 'plates' | 'gusset' | 'loop' };
  feet: { kind: 'pad' | 'tee'; x: number; depth: number; jack: number; /** Tee post continues the frame leg straight down */ post?: boolean };
  sleeves?: readonly { name: string; sleeve: number }[];
  mats: { frame: Mat; handle: Mat; sleeve: Mat; stub: Mat; foot: Mat };
}
export const OPEN_TRAP_SPECS = {
  'rep-open-trap-bar': { length: inch(84.3), collarGap: inch(50.5), collarWidth: 12, collarDia: 60, sleeveDia: 50, stubDia: 40, plateX: inch(33.1) / 2, plate: { t: 12, w: 90, top: 70 },
    frame: { kind: 'round', d: 44.5, t: 44.5, height: 430, topHalf: inch(33.1) / 2 + 22, legX: inch(33.1) / 2 + 22, corner: 80, knurl: inch(6) },
    handles: { dia: 33, span: 127, low: inch(8.3) - 225, high: inch(11.3) - 225, widths: [{ name: 'Narrow · 23"', inner: inch(23) }, { name: 'Standard · 25"', inner: inch(25) }, { name: 'Wide · 27.3"', inner: inch(27.3) }], defaultWidth: 1, bracket: 'plates' },
    feet: { kind: 'pad', x: inch(33.1) / 2 + 6, depth: 120, jack: 240 }, mats: { frame: MAT.texturedBlack, handle: MAT.knurlStainless, sleeve: MAT.hardChrome, stub: MAT.hardChrome, foot: MAT.rubber } },
  'kabuki-trap-bar-hd': { length: 1955.8, collarGap: 1068.2, collarWidth: 12, collarDia: 62, sleeveDia: 50, stubDia: 44, plateX: 400, plate: { t: 12, w: 100, top: 80 },
    frame: { kind: 'rect', d: 38, t: 50.8, height: 330, topHalf: 290, legX: 412, corner: 70 },
    handles: { dia: 29, span: 127, low: 247.7 - 225, high: 323.9 - 225, widths: [{ name: 'Narrow · 23"', inner: 584.2 }, { name: 'Standard · 25"', inner: 635 }, { name: 'Wide · 27"', inner: 685.8 }], defaultWidth: 1, bracket: 'plates' },
    feet: { kind: 'pad', x: 406, depth: 130, jack: 240 }, mats: { frame: MAT.glossBlack, handle: MAT.knurlZinc, sleeve: MAT.clearZinc, stub: MAT.clearZinc, foot: MAT.rubber } },
  'giant-northland-open-trap-hex-bar': { length: 2116, collarGap: 1280, collarWidth: 12, collarDia: 58, sleeveDia: 50, stubDia: 42, plateX: 425, plate: { t: 10, w: 60, top: 40 },
    frame: { kind: 'round', d: 44.5, t: 44.5, height: 400, topHalf: 330, legX: 447, corner: 90 },
    handles: { dia: 28, span: 125, low: -12, high: 60, widths: [{ name: '25"', inner: inch(25) }], defaultWidth: 0, bracket: 'gusset' },
    feet: { kind: 'tee', x: 447, depth: 150, jack: 240, post: true }, sleeves: [{ name: '16" sleeves', sleeve: inch(16) }, { name: '10" sleeves', sleeve: inch(10) }],
    mats: { frame: MAT.metallicBlack, handle: MAT.knurlZinc, sleeve: MAT.satinSteel, stub: MAT.metallicBlack, foot: MAT.rubber } },
  'bos-open-trap-bar': { length: 1500, collarGap: 980, collarWidth: 13, collarDia: 60, sleeveDia: 50, stubDia: 50, plateX: 440, plate: { t: 30, w: 50, top: 0 },
    frame: { kind: 'round', d: 32, t: 32, height: 300, topHalf: 190.5, legX: 452.5, corner: 0 },
    handles: { dia: 25, span: 240, low: -10, high: 80, widths: [{ name: '600 mm', inner: 600 }], defaultWidth: 0, bracket: 'loop' },
    feet: { kind: 'tee', x: 210, depth: 140, jack: 240 }, mats: { frame: MAT.glossBlack, handle: MAT.knurlBlack, sleeve: MAT.clearZinc, stub: MAT.glossBlack, foot: MAT.rubber } },
} as const satisfies Record<string, OpenTrapSpec>;
export type OpenTrapId = keyof typeof OPEN_TRAP_SPECS;
export const OPEN_TRAP_POSES = ['On its jack feet', 'Lying flat (deadlift)'] as const;
export const openTrapSleeve = (s: OpenTrapSpec, p: NumericParams = {}) => s.sleeves ? pick(s.sleeves, p.sleeves, 'sleeve length').sleeve : s.length / 2 - s.collarGap / 2 - s.collarWidth;
export const openTrapLength = (s: OpenTrapSpec, p: NumericParams = {}) => s.collarGap + 2 * (s.collarWidth + openTrapSleeve(s, p));
/** Jack-pose extents before centring: y of the high (front, −y) and low handles, bracket margins, feet. */
export function openTrapLayout(s: OpenTrapSpec, p: NumericParams = {}) {
  const h = s.handles, inner = pick(h.widths, p.handles ?? h.defaultWidth, 'handle width').inner, hx = inner / 2 + h.dia / 2;
  const yHigh = -h.high, yLow = -h.low, margin = h.bracket === 'loop' ? 0 : 14;
  const yMin = Math.min(yHigh - h.dia / 2 - margin, -s.feet.depth / 2, -s.collarDia / 2, -s.plate.w / 2, -s.frame.t / 2);
  const yMax = Math.max(yLow + h.dia / 2 + margin, s.feet.depth / 2, s.collarDia / 2, s.plate.w / 2, s.frame.t / 2);
  const axis = s.feet.jack, top = axis + s.frame.height + s.frame.d / 2 + (s.frame.knurl ? .25 : 0);
  return { inner, hx, yHigh, yLow, yMin, yMax, axis, top, length: openTrapLength(s, p) };
}
export function openTrapEnvelope(s: OpenTrapSpec, p: NumericParams = {}) {
  const l = openTrapLayout(s, p);
  return p.pose === 1 ? { width: l.length, depth: l.top, axisZ: l.yMax } : { width: l.length, depth: l.yMax - l.yMin, axisZ: l.axis };
}

// ─── Rogue TB-2 closed hex bar ─────────────────────────────────────────────────────────────────
/** Frame centreline (x ≥ 0, y ≥ 0 quarter) of the 1.5" square-tube elongated hexagon, 25" handle centres, 7" raised U grips. */
export const TB2 = { length: inch(88.5), tube: inch(1.5), outline: [[622, 0], [622, 72], [452, 300], [392, inch(28.5) / 2 - inch(.75)]] as readonly P2[], handleX: inch(12.5), handleDia: 34,
  rise: 180, uHalf: 140, collarX: 706, collarWidth: 10, collarDia: 63, sleeveDia: 48.5, axisZ: 31.5 } as const;
export const tb2Envelope = () => ({ width: TB2.length, depth: 2 * (TB2.outline[3][1] + TB2.tube / 2), axisZ: TB2.axisZ });

// ─── Multi-grip / Swiss / football bars ──────────────────────────────────────────────────────────
/** `profile`: rail centreline half in the XZ plane (x from 0 to the end block), camber up as racked. `ring`: flat closed
 * square-tube frame outline instead (x ≥ 0, y ≥ 0 quarter). Handles: centre x, angle from neutral (converging at +y). */
export interface MultiGripSpec {
  length: number; collarX: number; collarWidth: number; collarDia: number; stubDia: number; sleeveDia: number;
  rail: { kind: 'round' | 'rect' | 'plate'; t: number; h: number }; width: number;
  profile?: readonly P2[]; arch?: { half: number; rise: number }; ring?: readonly P2[];
  end: { x0: number; x1: number; h: number; kind: 'plates' | 'block' | 'box' };
  handles: readonly { x: number; angle: number; dia: number }[]; handleCaps?: number;
  holes?: { half: number; step: number; d: number };
  extras: readonly ('eyebolt' | 'xbrace' | 'hook' | 'titanPlate' | 'flange' | 'hexCap' | 'logoPlate')[];
  sleeves?: readonly { name: string; sleeve: number }[];
  finishes: readonly { name: string; frame: Mat; handle: Mat; sleeve: Mat }[];
}
const MG4_SPACING_12 = [6, 8, 10, 12, 14, 16], MG4_SPACING_16 = [18, 20, 22, 24, 26];
export const MULTI_GRIP_SPECS = {
  'kabuki-kadillac-bar': { length: 2209.8, collarX: inch(52.5) / 2, collarWidth: 10, collarDia: 60, stubDia: 42, sleeveDia: 50, rail: { kind: 'plate', t: 12.7, h: 66 }, width: 177.8,
    arch: { half: 450, rise: 85 }, end: { x0: 450, x1: inch(40.5) / 2, h: 66, kind: 'box' },
    handles: [{ x: inch(15.3) / 2, angle: 10, dia: 33.8 }, { x: inch(22.3) / 2, angle: 12.5, dia: 33.8 }, { x: inch(29.2) / 2, angle: 15, dia: 33.8 }], extras: ['xbrace', 'flange'],
    finishes: [{ name: 'Bright zinc', frame: MAT.texturedBlack, handle: MAT.knurlZinc, sleeve: MAT.brightZinc }, { name: 'Matte black', frame: MAT.texturedBlack, handle: MAT.knurlBlack, sleeve: MAT.matteBlack }] },
  'rep-cambered-swiss-bar': { length: inch(80.7), collarX: 655, collarWidth: 14, collarDia: 60, stubDia: 40, sleeveDia: 50, rail: { kind: 'round', t: 38, h: 38 }, width: 236,
    profile: [[0, inch(2.5)], [330, inch(2.5)], [400, 0], [450, 0]], end: { x0: 450, x1: 480, h: 76, kind: 'plates' },
    handles: [{ x: 130, angle: 0, dia: 35 }, { x: 250, angle: 0, dia: 35 }, { x: 425, angle: 0, dia: 35 }], extras: ['eyebolt'],
    finishes: [{ name: 'Textured black · hard chrome', frame: MAT.texturedBlack, handle: MAT.knurlBlack, sleeve: MAT.hardChrome }] },
  'rogue-mg-4cn-multi-grip-camber-bar': { length: inch(83.8), collarX: inch(51.5) / 2, collarWidth: 12, collarDia: 58, stubDia: 42, sleeveDia: 50, rail: { kind: 'rect', t: 25.4, h: 50.8 }, width: inch(7.1),
    profile: [[0, inch(3.5)], [185, inch(3.5)], [498, 0], [505, 0]], end: { x0: 505, x1: inch(41) / 2, h: 50.8, kind: 'block' },
    handles: [{ x: inch(14) / 2, angle: 12, dia: 32 }, { x: inch(22) / 2, angle: 16, dia: 32 }], handleCaps: 5, holes: { half: 482, step: 25.4, d: 12.7 }, extras: ['hexCap', 'logoPlate'],
    sleeves: [{ name: '15.5" sleeves', sleeve: inch(15.5) }, { name: '9" sleeves', sleeve: inch(9) }],
    finishes: [{ name: 'Matte black', frame: MAT.texturedBlack, handle: MAT.knurlBlack, sleeve: MAT.matteBlack }, { name: 'Stainless steel', frame: MAT.texturedBlack, handle: MAT.knurlStainless, sleeve: MAT.stainless }] },
  'bos-arch-nemesis-swiss-bar': { length: inch(78.1), collarX: 585, collarWidth: 10, collarDia: 72, stubDia: 40, sleeveDia: 49.7, rail: { kind: 'plate', t: 10, h: 50 }, width: inch(7.5),
    arch: { half: 510, rise: inch(5.5) - 50 }, end: { x0: 510, x1: 545, h: 62, kind: 'box' },
    handles: [{ x: inch(12) / 2, angle: 18, dia: 32 }, { x: inch(20.5) / 2, angle: 18, dia: 32 }, { x: inch(29) / 2, angle: 18, dia: 32 }], extras: ['hook', 'logoPlate'],
    finishes: [{ name: 'Gloss black', frame: MAT.glossBlack, handle: MAT.knurlBlack, sleeve: MAT.glossBlack }] },
  'titan-multi-grip-barbell': { length: inch(82), collarX: inch(53) / 2, collarWidth: 10, collarDia: 60, stubDia: 48, sleeveDia: 48, rail: { kind: 'rect', t: inch(1.5), h: inch(1.5) }, width: inch(10.25),
    ring: [[inch(39.5) / 2 - inch(.75), 0], [inch(39.5) / 2 - inch(.75), 62], [inch(39.5) / 2 - 58, inch(10.25) / 2 - inch(.75)]], end: { x0: 0, x1: inch(39.5) / 2, h: inch(1.5), kind: 'block' },
    handles: [{ x: 127, angle: 30, dia: 32 }, { x: inch(20) / 2, angle: 0, dia: 32 }, { x: inch(29) / 2, angle: 0, dia: 32 }], extras: ['titanPlate'],
    finishes: [{ name: 'Powder-coated black', frame: MAT.texturedBlack, handle: MAT.knurlBlack, sleeve: MAT.texturedBlack }] },
} as const satisfies Record<string, MultiGripSpec>;
export type MultiGripId = keyof typeof MULTI_GRIP_SPECS;
export const MG4_SPACINGS = { narrow: MG4_SPACING_12, wide: MG4_SPACING_16 };
/** Handles after params (MG-4CN threaded pairs move along the hole rows). */
export function multiGripHandles(id: MultiGripId, p: NumericParams = {}) {
  const s: MultiGripSpec = MULTI_GRIP_SPECS[id];
  if (id !== 'rogue-mg-4cn-multi-grip-camber-bar') return s.handles;
  const [a, b] = s.handles, n = p.narrow ?? 14, w = p.wide ?? 22;
  if (!MG4_SPACING_12.includes(n) || !MG4_SPACING_16.includes(w)) throw Error('Unsupported multi-grip handle spacing.');
  return [{ ...a, x: inch(n) / 2 }, { ...b, x: inch(w) / 2 }];
}
export const multiGripSleeve = (s: MultiGripSpec, p: NumericParams = {}) => s.sleeves ? pick(s.sleeves, p.sleeves, 'sleeve length').sleeve : s.length / 2 - s.collarX - s.collarWidth;
export const multiGripLength = (s: MultiGripSpec, p: NumericParams = {}) => 2 * (s.collarX + s.collarWidth + multiGripSleeve(s, p));
/** Camber up, resting on the sleeves, collars and end blocks. */
export function multiGripEnvelope(s: MultiGripSpec, p: NumericParams = {}) {
  const railHalf = s.rail.kind === 'round' ? s.rail.t / 2 : s.rail.h / 2, low = Math.max(s.collarDia / 2, s.stubDia / 2, s.sleeveDia / 2, s.end.h / 2, railHalf);
  return { width: multiGripLength(s, p), depth: Math.max(s.width + 2 * (s.handleCaps ?? 0), s.collarDia), axisZ: low };
}

/** Cradle geometry (#139) for the rackable bars: the diameter that rests in the cradle (shaft, or the sleeve stub
 * between a multi-grip frame and its collar), collar and sleeve stations, and the floor axis height. */
export function trapCurlAxleBarSpec(id: string, p: NumericParams): BarSpec {
  if (id in CURL_SPECS) { const s: CurlSpec = CURL_SPECS[id as CurlId]; return { shaft: s.shaftDia, shaftHalf: s.between / 2, sleeveStart: s.between / 2 + s.collarWidth, sleeveLength: curlSleeve(s), sleeveDiameter: s.sleeveDia, axisZ: curlEnvelope(s).axisZ }; }
  if (id in MULTI_GRIP_SPECS) { const s: MultiGripSpec = MULTI_GRIP_SPECS[id as MultiGripId]; return { shaft: s.stubDia, shaftHalf: s.collarX, sleeveStart: s.collarX + s.collarWidth, sleeveLength: multiGripSleeve(s, p), sleeveDiameter: s.sleeveDia, axisZ: multiGripEnvelope(s, p).axisZ }; }
  const s = axleSpec(id, p); return { shaft: s.shaftDia, shaftHalf: s.grip / 2, sleeveStart: s.grip / 2 + s.collarWidth, sleeveLength: axleSleeve(s), sleeveDiameter: s.sleeveDia, axisZ: axleEnvelope(s).axisZ };
}
const barOf = (id: string) => (p: NumericParams) => trapCurlAxleBarSpec(id, p);

// ─── Catalog entries ─────────────────────────────────────────────────────────────────────────────
const section = 'Barbells' as const, bar = 'bar';
const recon = (published: string, estimated: string) => `Independent Manifold reconstruction from ${published}. ${estimated} Scenery only; excluded from print export.`;
const curlFootprint = (id: CurlId) => { const e = curlEnvelope(CURL_SPECS[id]); return { width: e.width, depth: e.depth }; };
const posePlacement = { side: 'front', gap: 300 } as const;
const poseParam: FloorParam = { key: 'pose', label: 'Resting pose', default: 0, options: [0, 1], format: v => OPEN_TRAP_POSES[v] ?? String(v) };
const openTrapFootprint = (id: OpenTrapId) => (p: NumericParams) => { const e = openTrapEnvelope(OPEN_TRAP_SPECS[id], p); return { width: e.width, depth: e.depth }; };
const widthParam = (id: OpenTrapId): FloorParam => { const h = OPEN_TRAP_SPECS[id].handles; return { key: 'handles', label: 'Handle set', default: h.defaultWidth, options: h.widths.map((_, i) => i), format: v => h.widths[v]?.name ?? String(v) }; };
const mgFootprint = (id: MultiGripId) => (p: NumericParams) => { const e = multiGripEnvelope(MULTI_GRIP_SPECS[id], p); return { width: e.width, depth: e.depth }; };
const mgFinish = (id: MultiGripId, label?: string) => finishParam(MULTI_GRIP_SPECS[id].finishes, label);
const axleFootprint = (id: string) => (p: NumericParams) => { const e = axleEnvelope(axleSpec(id, p)); return { width: e.width, depth: e.depth }; };

export const REP_OPEN_TRAP_BAR = defineFloorPart({
  id: 'rep-open-trap-bar', name: 'REP Open Trap Bar', title: 'REP Open Trap Bar', noun: bar, section,
  description: 'REP Fitness Open Trap Bar: 84.3" round-tube open frame with integrated deadlift jack feet, 6" of frame knurl, removable knurled stainless handle pairs (23/25/27.3") at 8.3" in-line and 11.3" high loaded heights, 16.5" chrome sleeves. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [poseParam, widthParam('rep-open-trap-bar')], footprint: openTrapFootprint('rep-open-trap-bar'), placement: posePlacement,
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/open-trap-bar', credit: 'REP Fitness — Open Trap Bar', trademark: 'REP Fitness and REP are trademarks of REP Fitness.',
    reconstruction: recon('the published tech specs (84.3" length, 50.5" collar to collar, 33.1" frame interior, 16.5" sleeves, handle widths and 8.3"/11.3" loaded handle heights) and 16 product photos', 'Frame tube diameter, U height, jack foot height, bracket plates and liners are estimated from photos; the rotating handle set is not modelled.') },
});
export const ROGUE_CURL_BAR = defineFloorPart({
  id: 'rogue-curl-bar', name: 'Rogue Curl Bar', title: 'Rogue Curl Bar', noun: bar, section,
  description: 'Rogue Curl Bar: 54.5" cambered EZ bar, 28.5 mm shaft with Ohio knurl on the angled grips, smooth logo centre, 31.5" between sleeves, 10.5" bushing sleeves. Not rackable. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [finishParam(CURL_SPECS['rogue-curl-bar'].finishes)], footprint: curlFootprint('rogue-curl-bar'), placement: posePlacement,
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-curl-bar', credit: 'Rogue Fitness — Curl Bar', trademark: 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    reconstruction: recon('the published specs (54.5" bar length, 31.5" between sleeves, 10.5" sleeves, 28.5 mm shaft) and 11 product photos', 'Bend offsets, bend radii and collar size are estimated from the spec drawing and photos.') },
});
export const KABUKI_KADILLAC_BAR = defineFloorPart({
  id: 'kabuki-kadillac-bar', name: 'Kabuki Kadillac Bar', title: 'Kabuki Strength Kadillac Bar', noun: bar, section,
  description: 'Kabuki Strength Kadillac Bar: arched laser-cut plate frame with a centre X brace and three angled neutral grips (15.3/22.3/29.2" at 10/12.5/15°), 1.33" knurled handles, rackable 40.5–52.5", 16.75" sleeves on bolted flanges. Independent reconstruction; Kabuki Strength trademarks belong to Kabuki Strength.',
  params: [mgFinish('kabuki-kadillac-bar', 'Handles & sleeves')], footprint: mgFootprint('kabuki-kadillac-bar'), placement: posePlacement, parks: true, bar: barOf('kabuki-kadillac-bar'),
  vendor: { vendor: 'Kabuki Strength', url: 'https://www.roguefitness.com/kabuki-kadillac-bars', credit: 'Kabuki Strength — Kadillac Bar (made by Rogue Fitness)', trademark: 'Kabuki Strength and Kadillac Bar are trademarks of Kabuki Strength.',
    reconstruction: recon('the published specs (221 cm length, 17.78 cm width/height, 42.55 cm sleeves, rack fit 40.5–52.5", handle spacing and angles, 1.33" handles) and 18 product photos', 'Plate thickness and height, arch rise, X brace and end-box details are estimated from photos.') },
});
export const TITAN_AXLE_BARBELL = defineFloorPart({
  id: 'titan-axle-barbell', name: 'Titan Axle Barbell', title: 'Titan Fitness 84" Axle Barbell', noun: bar, section,
  description: 'Titan Fitness Axle Barbell: 1.98" fat grip and sleeves in one black powder-coated tube, raised collars, 52" grip and 15.5" sleeves on the 84" bar (60" variant: 43" grip, 8" sleeves). Rackable. Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [{ key: 'length', label: 'Length', default: 0, options: [0, 1], format: v => TITAN_AXLES[v]?.name ?? String(v) }], footprint: axleFootprint('titan-axle-barbell'), placement: posePlacement, parks: true, bar: barOf('titan-axle-barbell'),
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/axle-barbells', credit: 'Titan Fitness — Axle Barbell', trademark: 'Titan Fitness is a trademark of Titan Fitness.',
    reconstruction: recon('the published specs (84"/60" length, 52"/43" grip, 15.5"/8" sleeves, 1.98" diameter) and 16 product photos', 'Collar diameter and width are estimated from photos.') },
});
export const REP_CAMBERED_SWISS_BAR = defineFloorPart({
  id: 'rep-cambered-swiss-bar', name: 'REP Cambered Swiss Bar', title: 'REP Cambered Swiss Bar', noun: bar, section,
  description: 'REP Fitness Cambered Swiss Bar: round-tube ladder cambered 2.5" above the sleeves, three knurled 35 mm neutral grips with the outer pair at a deficit, removable centre eyebolt, twin-plate sleeve brackets and 14" hard-chrome sleeves. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [], footprint: mgFootprint('rep-cambered-swiss-bar'), placement: posePlacement, parks: true, bar: barOf('rep-cambered-swiss-bar'),
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/cambered-swiss-multi-grip-barbell', credit: 'REP Fitness — Cambered Swiss Bar', trademark: 'REP Fitness and REP are trademarks of REP Fitness.',
    reconstruction: recon('the published tech specs (80.7" length, 14.03" sleeves, 2.5" camber, 35 mm handles, 50 mm sleeves) and 14 product photos', 'Frame length, ladder width, handle positions and bracket plates are estimated from photos.') },
});
export const ROGUE_RACKABLE_CURL_BAR = defineFloorPart({
  id: 'rogue-rackable-curl-bar', name: 'Rogue Rackable Curl Bar', title: 'Rogue Rackable Curl Bar', noun: bar, section,
  description: 'Rogue Rackable Curl Bar: 74.75" cambered curl bar with 51.8" between sleeves so it racks in standard J-cups, 28.5 mm Ohio-knurled bends, black E-coat or Cerakote shaft, 10.5" bright zinc bushing sleeves. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [finishParam(CURL_SPECS['rogue-rackable-curl-bar'].finishes)], footprint: curlFootprint('rogue-rackable-curl-bar'), placement: posePlacement, parks: true, bar: barOf('rogue-rackable-curl-bar'),
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-rackable-curl-bar', credit: 'Rogue Fitness — Rackable Curl Bar', trademark: 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    reconstruction: recon('the published specs (74.75" length, 51.8125" between sleeves, 10.5" sleeves, 28.5 mm shaft) and 12 product photos', 'Bend offsets and collar size are estimated from the spec drawing and photos.') },
});
export const ROGUE_MG4CN = defineFloorPart({
  id: 'rogue-mg-4cn-multi-grip-camber-bar', name: 'Rogue MG-4CN Multi-Grip Bar', title: 'Rogue MG-4CN Narrow Multi-Grip Camber Bar', noun: bar, section,
  description: 'Rogue MG-4CN: narrow 7.1" frame of 1×2" 11-gauge tube cambered 3.5", holes every 1" for two threaded 32 mm knurled handle pairs (12° and 16°, 6–26" spacing), lockable 15.5" or 9" sleeves. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'narrow', label: '12° pair spacing', default: 14, options: MG4_SPACING_12, format: v => `${v}"` },
    { key: 'wide', label: '16° pair spacing', default: 22, options: MG4_SPACING_16, format: v => `${v}"` },
    { key: 'sleeves', label: 'Sleeves', default: 0, options: [0, 1], format: v => MULTI_GRIP_SPECS['rogue-mg-4cn-multi-grip-camber-bar'].sleeves[v]?.name ?? String(v) },
    mgFinish('rogue-mg-4cn-multi-grip-camber-bar', 'Handles & sleeves'),
  ], footprint: mgFootprint('rogue-mg-4cn-multi-grip-camber-bar'), placement: posePlacement, parks: true, bar: barOf('rogue-mg-4cn-multi-grip-camber-bar'),
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-mg-4cn-narrow-multi-grip-camber-bar', credit: 'Rogue Fitness — MG-4CN Narrow Multi-Grip Camber Bar', trademark: 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    reconstruction: recon('the published specs (83.8"/70.8" length, 51.5" between sleeves, 41" rackable span, 7.1"/5" frame width, 3.5" camber, 1×2" tube, 1" hole pitch, 5" × 32 mm handles at 12°/16°, 15.5"/9" sleeves) and 17 product photos', 'Camber ramp positions and end-block details are estimated from photos.') },
});
export const BOS_ARCH_NEMESIS = defineFloorPart({
  id: 'bos-arch-nemesis-swiss-bar', name: 'Arch Nemesis Swiss Bar', title: 'Bells of Steel Arch Nemesis Swiss Bar', noun: bar, section,
  description: 'Bells of Steel Arch Nemesis: 78.1" arched plate frame (7.5" wide, 5.5" deep) with three angled 32 mm neutral grips at 12/20.5/29", a top cable hook, glossy black powder coat and non-rotating 49.7 mm sleeves. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [], footprint: mgFootprint('bos-arch-nemesis-swiss-bar'), placement: posePlacement, parks: true, bar: barOf('bos-arch-nemesis-swiss-bar'),
  vendor: { vendor: 'Bells of Steel', url: 'https://bellsofsteel.com/products/arch-nemesis-swiss-bar', credit: 'Bells of Steel — Arch Nemesis Swiss Bar', trademark: 'Bells of Steel and Arch Nemesis are trademarks of Bells of Steel.',
    reconstruction: recon('the published specs (78.1" length, 7.5" width, 5.5" depth, 49.7 mm sleeves, 32 mm grips at 12/20.5/29") and 9 product photos', 'Frame length, plate thickness, grip angle, collar position and hook shape are estimated from photos.') },
});
export const CAP_EZ_CURL_BAR = defineFloorPart({
  id: 'cap-olympic-ez-curl-bar', name: 'CAP Olympic EZ Curl Bar', title: 'CAP Barbell 47" Olympic EZ Curl Bar', noun: bar, section,
  description: 'CAP Barbell 47" Olympic EZ curl bar (the Amazon best seller): 1200 mm solid steel bar, 25.4 mm shaft knurled on the bends, 32" between collars, 7.5" rotating 2" sleeves, chrome or black. Independent reconstruction; CAP Barbell trademarks belong to CAP Barbell.',
  params: [finishParam(CURL_SPECS['cap-olympic-ez-curl-bar'].finishes)], footprint: curlFootprint('cap-olympic-ez-curl-bar'), placement: posePlacement,
  vendor: { vendor: 'CAP Barbell', url: 'https://capbarbell.com/products/cap-barbell-47-inch-olympic-solid-curl-bar-black-1', credit: 'CAP Barbell — 47" Olympic EZ Curl Bar', trademark: 'CAP and CAP Barbell are trademarks of CAP Barbell.',
    reconstruction: recon('the published specs (1200 mm length, 32" between collars, 7.5" sleeves, 25.4 mm shaft) and 12 product photos', 'Bend offsets and collar size are estimated from photos.') },
});
export const REP_RACKABLE_CURL_BAR = defineFloorPart({
  id: 'rep-rackable-curl-bar', name: 'REP Rackable Curl Bar', title: 'REP Rackable Curl Bar', noun: bar, section,
  description: 'REP Fitness Rackable Curl Bar: 74" EZ bar with 51" between sleeves for standard racks, 30 mm shaft with medium knurl on the bends only, hybrid bushing 10" sleeves, hard chrome or stainless. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [finishParam(CURL_SPECS['rep-rackable-curl-bar'].finishes)], footprint: curlFootprint('rep-rackable-curl-bar'), placement: posePlacement, parks: true, bar: barOf('rep-rackable-curl-bar'),
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/rackable-curl-bar', credit: 'REP Fitness — Rackable Curl Bar', trademark: 'REP Fitness and REP are trademarks of REP Fitness.',
    reconstruction: recon('the published tech specs (74" length, 51" between sleeves, 10" sleeves, 30 mm shaft) and 9 product photos', 'Bend offsets and the wide collar are estimated from photos.') },
});
export const GIANT_NORTHLAND = defineFloorPart({
  id: 'giant-northland-open-trap-hex-bar', name: 'Northland Open Trap Hex Bar', title: 'Giant Lifting Northland Open Trap Hex Bar', noun: bar, section,
  description: 'Giant Lifting Northland Open Trap Hex Bar: round-tube open frame with a built-in jack on T feet, bolted gusset plates carrying dual 28 mm knurled handles 25" apart, metallic black finish, 16" or 10" sleeves. Independent reconstruction; Giant Lifting trademarks belong to Giant Lifting.',
  params: [poseParam, { key: 'sleeves', label: 'Sleeves', default: 0, options: [0, 1], format: v => OPEN_TRAP_SPECS['giant-northland-open-trap-hex-bar'].sleeves[v]?.name ?? String(v) }],
  footprint: openTrapFootprint('giant-northland-open-trap-hex-bar'), placement: posePlacement,
  vendor: { vendor: 'Giant Lifting', url: 'https://giantlifting.com/products/giant-northland-open-trap-hex-bar', credit: 'Giant Lifting — Northland Open Trap Hex Bar', trademark: 'Giant Lifting and Northland are trademarks of Giant Lifting.',
    reconstruction: recon('the published features (dual 28 mm handles 25" apart, 16"/10" sleeves, built-in jack, solid steel feet) and 14 product and review photos', 'Overall length, frame and foot geometry and handle heights are estimated from photos (Giant publishes no dimension table).') },
});
export const TITAN_MULTI_GRIP = defineFloorPart({
  id: 'titan-multi-grip-barbell', name: 'Titan Multi-Grip Barbell', title: 'Titan Fitness Multi-Grip Barbell', noun: bar, section,
  description: 'Titan Fitness Multi-Grip Barbell V3: flat 39.5 × 10.25" frame of 1.5" square tube with chamfered ends, 30° angled grips 10" apart and neutral grips at 20" and 29" (32 mm, 7" long), silver Titan badge, 14.5" black sleeves. Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [], footprint: mgFootprint('titan-multi-grip-barbell'), placement: posePlacement, parks: true, bar: barOf('titan-multi-grip-barbell'),
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/multi-grip-barbell-v3', credit: 'Titan Fitness — Multi-Grip Barbell V3', trademark: 'Titan Fitness is a trademark of Titan Fitness.',
    reconstruction: recon('the published specs (82" length, 39.5 × 10.25 × 1.5" frame, 53" sleeve to sleeve, 32 mm × 7" grips, 30° pair at 10", neutral 20"/29", 48 mm sleeves) and 9 product photos', 'Published 82" length and 14.5" sleeves overlap by 11 mm, so the loadable sleeve is 14.1"; chamfer size and badge are estimated.') },
});
export const BOS_EZ_CURL_BAR = defineFloorPart({
  id: 'bos-ez-curl-bar-45', name: 'Bells of Steel EZ Curl Bar', title: 'Bells of Steel EZ Curl Bar 45"', noun: bar, section,
  description: 'Bells of Steel 45" EZ Curl Bar: deep-bend 28 mm black phosphate shaft with moderate knurl on the grips, bronze bushings and 7" machined nickel sleeves. Not rackable. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [], footprint: curlFootprint('bos-ez-curl-bar-45'), placement: posePlacement,
  vendor: { vendor: 'Bells of Steel', url: 'https://bellsofsteel.com/products/ez-curl-bar-45', credit: 'Bells of Steel — EZ Curl Bar (45")', trademark: 'Bells of Steel is a trademark of Bells of Steel.',
    reconstruction: recon('the published specs (1143 mm length, 28 mm shaft, 7" sleeves) and 8 product photos', 'Distance between collars, bend offsets and collar size are estimated from photos.') },
});
export const FRINGE_20KG_AXLE = defineFloorPart({
  id: 'fringe-sport-20kg-axle-bar', name: 'Fringe Sport Axle Bar', title: 'Fringe Sport 20 kg Axle "Fat" Bar', noun: bar, section,
  description: 'Fringe Sport 20 kg "El Gordazo" axle: 7 ft, 2" unknurled matte-black shaft, non-rotating 49 mm sleeves with 15.5" loadable, raised collars. Rackable. Independent reconstruction; Fringe Sport trademarks belong to Fringe Sport.',
  params: [], footprint: axleFootprint('fringe-sport-20kg-axle-bar'), placement: posePlacement, parks: true, bar: barOf('fringe-sport-20kg-axle-bar'),
  vendor: { vendor: 'Fringe Sport', url: 'https://www.fringesport.com/products/onefitwonder-axle-bar-20-kg', credit: 'Fringe Sport — 20 kg Axle "Fat" Bar', trademark: 'Fringe Sport is a trademark of Fringe Sport.',
    reconstruction: recon('the published specs (7 ft length, 50 mm shaft, 49 mm sleeves, 15.5" loadable) and 12 product photos', 'Collar diameter and width are estimated from photos.') },
});
export const KABUKI_TRAP_BAR_HD = defineFloorPart({
  id: 'kabuki-trap-bar-hd', name: 'Kabuki Trap Bar HD', title: 'Kabuki Strength Trap Bar HD', noun: bar, section,
  description: 'Kabuki Strength Trap Bar HD: rectangular-tube open frame with built-in jack, swappable handle brackets for 23/25/27" between the 29 mm knurled high and low handles (low handles 1.27 cm above the sleeve line), 17" clear-zinc sleeves. Independent reconstruction; Kabuki Strength trademarks belong to Kabuki Strength.',
  params: [poseParam, widthParam('kabuki-trap-bar-hd')], footprint: openTrapFootprint('kabuki-trap-bar-hd'), placement: posePlacement,
  vendor: { vendor: 'Kabuki Strength', url: 'https://www.strengthshop.co.uk/products/kabuki-strength-the-trap-bar-hd', credit: 'Kabuki Strength — The Trap Bar HD', trademark: 'Kabuki Strength is a trademark of Kabuki Strength.',
    reconstruction: recon('the published specs (195.58 cm length, 43.18 cm sleeves, 29 mm handles, 58.4/63.5/68.6 cm handle spacing, 24.77/32.39 cm loaded handle heights) and 9 product photos', 'Frame tube section and shape, jack foot height and bracket plates are estimated from photos.') },
});
export const BOS_OPEN_TRAP_BAR = defineFloorPart({
  id: 'bos-open-trap-bar', name: 'Bells of Steel Open Trap Bar', title: 'Bells of Steel Open Trap Bar / Hex Bar', noun: bar, section,
  description: 'Bells of Steel Open Trap Bar: 1500 mm welded open frame (381 mm top, 400 mm diagonals) with T-foot deadlift jack, looped dual-height 25 mm knurled handles 600 mm apart and 247 mm white-zinc bushing sleeves. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [poseParam], footprint: openTrapFootprint('bos-open-trap-bar'), placement: posePlacement,
  vendor: { vendor: 'Bells of Steel', url: 'https://bellsofsteel.com/products/open-trap-bar-hex-bar', credit: 'Bells of Steel — Open Trap Bar / Hex Bar', trademark: 'Bells of Steel is a trademark of Bells of Steel.',
    reconstruction: recon('the published dimension drawing (1500 mm length, 381 mm top, 400 mm diagonals, 600 mm between handles, 420 mm feet, 247 mm sleeves, 25 mm handles) and 9 product photos', 'Frame tube size, loop handle heights and jack height are estimated from photos.') },
});
export const FRINGE_STUBBY_AXLE = defineFloorPart({
  id: 'fringe-sport-stubby-axle-bar', name: 'Fringe Sport Stubby Axle', title: 'Fringe Sport Stubby Axle Rackable Shorty', noun: bar, section,
  description: 'Fringe Sport "El Gordito" Stubby Axle: 70.75" rackable shorty with a 2" unknurled matte-black tube throughout, yellow grip ring marks, gold end badges and 9" sleeves. Independent reconstruction; Fringe Sport trademarks belong to Fringe Sport.',
  params: [], footprint: axleFootprint('fringe-sport-stubby-axle-bar'), placement: posePlacement, parks: true, bar: barOf('fringe-sport-stubby-axle-bar'),
  vendor: { vendor: 'Fringe Sport', url: 'https://www.fringesport.com/products/short-axle-barbell', credit: 'Fringe Sport — Stubby Axle Barbell', trademark: 'Fringe Sport is a trademark of Fringe Sport.',
    reconstruction: recon('the published specs (70.75" length, 2" diameter throughout, 9" sleeves) and 10 product photos', 'Collar size and ring-mark positions are estimated from photos.') },
});
export const ROGUE_TB2 = defineFloorPart({
  id: 'rogue-tb-2-trap-bar', name: 'Rogue TB-2 Trap Bar', title: 'Rogue TB-2 Trap Bar', noun: bar, section,
  description: 'Rogue TB-2 Trap Bar: 88.5 × 28.5" closed hexagon of 1.5" square tube, flush and raised knurled 1.34" handles 25" on centre (raised grips 8.25" off the floor), 16" black SCH 80 pipe sleeves. Flip it for the flush handles. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [], footprint: () => { const e = tb2Envelope(); return { width: e.width, depth: e.depth }; }, placement: posePlacement,
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-tb-2-trap-bar', credit: 'Rogue Fitness — TB-2 Trap Bar', trademark: 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    reconstruction: recon('the published specs (88.5" length, 28.5" width, 9" height, 1.5" square tube, 1.34" handles 25" on centre, 8.25" raised handle height, 1.91" × 16" sleeves) and 8 product photos', 'Hexagon corner positions, frame length and gussets are estimated from photos.') },
});
export const PARTS = [
  REP_OPEN_TRAP_BAR, ROGUE_CURL_BAR, KABUKI_KADILLAC_BAR, TITAN_AXLE_BARBELL, REP_CAMBERED_SWISS_BAR, ROGUE_RACKABLE_CURL_BAR, ROGUE_MG4CN, BOS_ARCH_NEMESIS,
  CAP_EZ_CURL_BAR, REP_RACKABLE_CURL_BAR, GIANT_NORTHLAND, TITAN_MULTI_GRIP, BOS_EZ_CURL_BAR, FRINGE_20KG_AXLE, KABUKI_TRAP_BAR_HD, BOS_OPEN_TRAP_BAR, FRINGE_STUBBY_AXLE, ROGUE_TB2,
] as const satisfies readonly FloorPart[];
/** Sleeve-axis height above the floor in each part's resting pose (parked bars ride on this axis). */
export function barAxisZ(id: string, p: NumericParams): number {
  if (id in CURL_SPECS) return curlEnvelope(CURL_SPECS[id as CurlId]).axisZ;
  if (id in OPEN_TRAP_SPECS) return openTrapEnvelope(OPEN_TRAP_SPECS[id as OpenTrapId], p).axisZ;
  if (id in MULTI_GRIP_SPECS) return multiGripEnvelope(MULTI_GRIP_SPECS[id as MultiGripId], p).axisZ;
  if (id === 'rogue-tb-2-trap-bar') return TB2.axisZ;
  return axleEnvelope(axleSpec(id, p)).axisZ;
}
