/** Kettlebells. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 *
 * Every bell stands with its flat base on the floor at the origin, handle loop in the XZ plane (X along the grip),
 * weight markings facing -Y and brand side facing +Y. The handle centreline and body are solved here as plain maths
 * (shared with the Manifold builders in ../parts/kettlebells.ts), so footprints, heights and masses stay in step. */
import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';

const inch = (v: number) => v * 25.4;
const LB = 0.45359237;
/** Cast / ductile iron, kg per mm³. */
export const IRON_DENSITY = 7.1e-6;
export const KB_PAIR_GAP = 120;

/** Classic cast bell: sphere with a flat machined base and a round-section handle loop in the XZ plane. */
export interface BellShape {
  /** Overall height, handle outer width (across the horns), grip diameter, body diameter, flat base diameter (mm). */
  height: number; width: number; grip: number; body: number; base: number;
  /** Horn root polar angle on the body (deg from the top), share of the horn rise where the handle is widest,
   * superellipse exponent of the upper loop (2 = round, 4 = boxy), horn fillet growth as a share of the grip radius. */
  shoulder: number; waist: number; square: number; flare: number;
}
export interface HandlePoint { x: number; z: number; r: number; /** arc length from the horn's body surface point (mm, negative inside) */ s: number }
export interface BellLayout extends BellShape { R: number; sag: number; zc: number; zt: number; a: number; phi: number; surface: { x: number; z: number }; path: HandlePoint[]; hornLength: number; halfWidth: number; halfDepth: number }

/** Handle centreline from the horn root (sunk into the body) to the top centre, one side (x ≥ 0); mirror for the other. */
export function bellLayout(g: BellShape): BellLayout {
  const R = g.body / 2, sag = R - Math.sqrt(Math.max(0, R * R - (g.base / 2) ** 2)), zc = R - sag;
  const r0 = g.grip / 2, zt = g.height - r0, a = g.width / 2 - r0;
  let phi = g.shoulder * Math.PI / 180;
  if (R * Math.sin(phi) > a * .96) phi = Math.asin(Math.min(1, a * .96 / R));
  const S = { x: R * Math.sin(phi), z: zc + R * Math.cos(phi) }, n = { x: Math.sin(phi), z: Math.cos(phi) };
  const zw = S.z + g.waist * Math.max(0, zt - S.z), L = Math.hypot(a - S.x, zw - S.z);
  const dir = { x: (a - S.x) / L, z: (zw - S.z) / L };
  const P = [{ x: S.x - n.x * g.grip * .45, z: S.z - n.z * g.grip * .45 }, { x: S.x + dir.x * L * .4, z: S.z + dir.z * L * .4 }, { x: a, z: zw - L * .25 }, { x: a, z: zw }];
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12, u = 1 - t; pts.push({ x: u ** 3 * P[0].x + 3 * u * u * t * P[1].x + 3 * u * t * t * P[2].x + t ** 3 * P[3].x, z: u ** 3 * P[0].z + 3 * u * u * t * P[1].z + 3 * u * t * t * P[2].z + t ** 3 * P[3].z }); }
  const e = 2 / g.square;
  for (let i = 1; i <= 16; i++) { const t = i / 16 * Math.PI / 2; pts.push({ x: i === 16 ? 0 : a * Math.cos(t) ** e, z: zw + (zt - zw) * Math.sin(t) ** e }); }
  // Arc length measured from the point where the centreline leaves the body.
  const inside = (p: { x: number; z: number }) => Math.hypot(p.x, p.z - zc) < R;
  let exit = pts.findIndex(p => !inside(p)); if (exit < 0) exit = 0;
  const path: HandlePoint[] = []; let s = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > exit) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    const sd = i < exit ? -Math.hypot(pts[i].x - pts[exit].x, pts[i].z - pts[exit].z) : s;
    const f = Math.max(0, 1 - Math.max(0, sd) / (.3 * L));
    path.push({ ...pts[i], s: sd, r: r0 * (1 + g.flare * f * f) });
  }
  const halfWidth = Math.max(R, ...path.map(p => p.x + p.r)), halfDepth = Math.max(R, ...path.map(p => p.r));
  return { ...g, R, sag, zc, zt, a, phi, surface: S, path, hornLength: L, halfWidth, halfDepth };
}
/** Solid iron volume (mm³): truncated sphere plus the handle tube outside it. */
export function bellVolume(l: BellLayout) {
  const body = 4 / 3 * Math.PI * l.R ** 3 - Math.PI * l.sag ** 2 * (3 * l.R - l.sag) / 3;
  let tube = 0;
  for (let i = 1; i < l.path.length; i++) {
    const p = l.path[i], q = l.path[i - 1], out = Math.hypot((p.x + q.x) / 2, (p.z + q.z) / 2 - l.zc) > l.R;
    if (out) tube += Math.PI * ((p.r + q.r) / 2) ** 2 * Math.hypot(p.x - q.x, p.z - q.z);
  }
  return body + 2 * tube;
}
export interface BellSpec extends Omit<BellShape, 'body' | 'height' | 'base'> {
  kg: number; body?: number; height?: number; base?: number; /** base diameter as a share of the body when unpublished */ baseRatio?: number;
  /** window clearance above the body top as a share of the handle width when the height is unpublished */ gapRatio?: number;
}
/** Resolve unpublished body diameter (from mass and iron density) and height (from the window clearance). */
export function solveBell(spec: BellSpec, density = IRON_DENSITY): BellLayout {
  const shape = (D: number): BellShape => {
    const base = spec.base ?? D * (spec.baseRatio ?? .56), R = D / 2, sag = R - Math.sqrt(Math.max(0, R * R - (base / 2) ** 2));
    return { ...spec, body: D, base, height: spec.height ?? (D - sag + (spec.gapRatio ?? .32) * spec.width + spec.grip) };
  };
  if (spec.body) return bellLayout(shape(spec.body));
  let lo = 40, hi = 500;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (bellVolume(bellLayout(shape(mid))) * density < spec.kg) lo = mid; else hi = mid; }
  return bellLayout(shape((lo + hi) / 2));
}
export const bellFootprint = (l: { halfWidth: number; halfDepth: number }): FloorBox => ({ width: 2 * l.halfWidth, depth: 2 * l.halfDepth });

/** Linear interpolation (and end extrapolation) of published size tables keyed by kg. */
function lerpTable(table: readonly (readonly number[])[], kg: number): number[] {
  let i = table.findIndex(r => r[0] >= kg); if (i <= 0) i = i === 0 ? 1 : table.length - 1;
  const [a, b] = [table[i - 1], table[i]], t = (kg - a[0]) / (b[0] - a[0]);
  return a.map((v, j) => v + (b[j] - v) * t);
}
/** Yes4All published size chart (kg, outer handle width in, height in, grip in); the 16 kg and 40 kg sizes are interpolated. */
export const YES4ALL_CHART = [[4, 6.1, 6.5, 1], [6, 6.5, 7.1, 1.1], [8, 6.9, 7.5, 1.2], [10, 7.25, 8.25, 1.46], [12, 7.7, 8.7, 1.3], [14, 7.75, 9, 1.46], [20, 8.1, 9.8, 1.4], [24, 8.27, 10.4, 1.4], [32, 9.1, 11.4, 1.42]] as const;
/** Titan LB Cast Iron Kettlebell spec tables per weight (lb: height, inner handle width, grip mm, body width in). */
export const TITAN_LB_CHART = [[5, 5.5, 4, 26, 2.6], [10, 6.9, 4, 27, 4], [15, 7.5, 4.85, 29, 4.5], [20, 7.9, 4.9, 30, 4.9], [25, 8.75, 5, 32, 5.4], [30, 9, 5.25, 34, 5.7], [35, 9.5, 5.4, 38, 6], [40, 10, 5.5, 38, 6.3], [45, 10.35, 5.5, 38, 6.3], [50, 10.7, 6, 38, 6.8], [55, 11, 6, 38, 7], [60, 11, 6, 38, 7.2], [65, 11.5, 6.25, 38, 7.4], [70, 11.7, 6.4, 38, 7.5], [75, 11.85, 6.25, 44, 8], [80, 11.9, 5.75, 44, 8.4], [90, 12.6, 7, 48, 8.25], [100, 13, 5.85, 40, 9]] as const;
/** Rogue Ductile Iron Kettlebell size chart (kg, lb, stripe, grip in, handle width in, base in). */
export const ROGUE_CHART = [
  [4, 9, 'White', 1.19, 5.67, 2.8], [6, 13, 'Gray', 1.19, 5.67, 3.27], [8, 18, 'Pink', 1.19, 6.42, 2.86], [12, 26, 'Blue', 1.4, 7.52, 3.26],
  [16, 35, 'Yellow', 1.5, 7.8, 3.55], [18, 40, 'Tan', 1.5, 7.8, 3.09], [20, 44, 'Gray', 1.5, 7.8, 2.91], [24, 53, 'Green', 1.5, 7.8, 4.13],
  [28, 62, 'Orange', 1.5, 7.8, 3.79], [32, 70, 'Red', 1.5, 7.8, 4.56], [36, 80, 'Gray', 1.5, 7.8, 5.29], [40, 88, 'White', 1.5, 7.8, 5.72],
  [44, 97, 'Blue', 1.57, 9.06, 5.95], [48, 106, 'Yellow', 1.57, 9.06, 5.97], [56, 124, 'Gray', 1.65, 9.21, 6.02], [68, 150, 'Green', 1.65, 9.21, 6.09],
  [80, 176, 'Orange', 1.73, 9.37, 6.15], [92, 203, 'Red', 1.73, 9.37, 6.24],
] as const;
/** Rogue photo ratios per kg: body/handle width, height/handle width, horn root angle (deg from top). */
export const ROGUE_PHOTO_RATIOS = [[4, .68, 1.19, 53], [16, .81, 1.26, 45], [40, 1.17, 1.54, 32], [92, 1.3, 1.7, 30]] as const;
export const BAND_COLORS: Record<string, string> = {
  White: '#eceae4', Gray: '#8c9095', Pink: '#e89ab4', Blue: '#2f7fd0', Yellow: '#f0c419', Tan: '#c8a574', Green: '#2e9a48', Orange: '#ec6f1c', Red: '#cf2a2a',
  Purple: '#7d4fc0', Brown: '#7a4a2e', 'Dark red': '#8f3326', Black: '#1b1b1c', Mint: '#6fcfae', 'Light blue': '#5aa6e8', Navy: '#2c3f8f',
};

/** Finish recipes: body/handle colour and PBR, band style. */
export interface BellFinish { name: string; color: string; metalness: number; roughness: number }
const ECOAT: BellFinish = { name: 'Black E-coat', color: '#26272a', metalness: .2, roughness: .5 };
const POWDER: BellFinish = { name: 'Textured black powder coat', color: '#2a2b2d', metalness: .05, roughness: .85 };
const ENAMEL: BellFinish = { name: 'Gloss black enamel', color: '#0f1011', metalness: .12, roughness: .14 };

/** Everything a cast-bell builder needs: layout, finish, bands and markings. */
export interface CastBellModel {
  layout: BellLayout; finish: BellFinish; band?: string; bandWidth?: number;
  /** Weight marking on the -Y face: lines of text, raised or debossed, framed by a ring and divider. */
  front: { lines: string[]; ring: boolean; divider: boolean; relief: 'deboss' | 'raised'; disc?: 'raised' | 'flat'; badge?: string; ink?: string; /** plain plate standing in for a printed/cast wordmark above the numerals */ brandBar?: boolean; /** printed colour disc on a flat panel */ panel?: string };
  /** Turn the bell 180° so the brand side faces -Y (REP casts its logo on the hero side). */
  flip?: boolean;
  /** Brand side (+Y): a plain plate standing in for the wordmark (no logo artwork). */
  back?: { plate: 'deboss' | 'raised' | 'print'; width: number; height: number; color?: string; lines?: string[] };
  /** Rubber / marbled coating over the iron (Fringe Savage). */
  coat?: { color: string; streak: string };
}
/** Floor box of a cast bell: handle width across X; along Y the front marking side may be a flat panel inset from the sphere. */
export function castFootprint(m: CastBellModel): FloorBox {
  const l = m.layout, R = l.R, F = m.front;
  let front = R, back = R;
  if (F.badge) front = R + .75;
  else if (F.disc) { const rp = R * (F.disc === 'raised' ? .36 : .43), yp = Math.sqrt(R * R - rp * rp); front = yp + (F.disc === 'raised' ? 2.2 : 0) + (F.ink ? .6 : F.relief === 'deboss' ? (F.panel ? .3 : 0) : 1.1); }
  if (m.back?.plate === 'raised') back = R + .6; else if (m.back?.plate === 'print') back = R + .45;
  const tube = Math.max(...l.path.map(p => p.r)); front = Math.max(front, tube); back = Math.max(back, tube);
  if (m.flip) [front, back] = [back, front];
  return { width: 2 * l.halfWidth, depth: front + back, offset: [0, (back - front) / 2] };
}
const kgLb = (kg: number) => Math.round(kg / LB);
const fmtKg = (kg: number) => `${kg} kg / ${kgLb(kg)} lb`;

// ---------- Rogue Kettlebells (ductile iron, colour-coded handle stripes; V1 = original imported run) ----------
export const rogueRow = (kg: number) => { const r = ROGUE_CHART.find(r => r[0] === kg); if (!r) throw Error('Unsupported kettlebell weight.'); return r; };
export function rogueBell(kg: number, finish: BellFinish = POWDER, stripes = true): CastBellModel {
  const [, lb, stripe, grip, width, base] = rogueRow(kg);
  // Body diameter, height and horn angle as ratios of the published handle width, measured on Rogue's 4/16/40/92 kg product photos.
  const [, dw, hw, shoulder] = lerpTable(ROGUE_PHOTO_RATIOS, kg), W = inch(width);
  const layout = bellLayout({ body: W * dw, height: W * hw, width: W, grip: inch(grip), base: inch(base), shoulder, waist: .62, square: 3, flare: .32 });
  return { layout, finish, band: stripes ? BAND_COLORS[stripe] : undefined, bandWidth: inch(.5),
    front: { lines: [`${kg}KG`, `${lb}LB`], ring: true, divider: true, relief: 'deboss' }, back: { plate: 'deboss', width: layout.body * .56, height: layout.body * .15, lines: ['EST.2006'] } };
}
export const ROGUE_KG = ROGUE_CHART.map(r => r[0]);
export const ROGUE_USA_FINISHES = [ECOAT, { ...POWDER, name: 'Black powder coat (Class A)', roughness: .7 }] as const;
const rogueVendor = (url: string, credit: string, rec: string): VendorAttribution => ({ vendor: 'Rogue Fitness', url, credit, trademark: 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.', reconstruction: rec });

// ---------- Generic cast-bell size curve (for brands that publish weights only) ----------
/** Chart bells keep the published height and handle width; the body follows the cast-bell body/handle ratio measured on
 * Rogue's product photos (solid-iron density alone under-sizes the body, since cast bells carry cored voids). */
/** Body diameter of a classic cast bell by weight: Rogue's published handle width times the photo body ratio. */
export const castBodyDiameter = (kg: number) => inch(lerpTable(ROGUE_CHART.map(r => [r[0], r[4]]), kg)[1]) * lerpTable(ROGUE_PHOTO_RATIOS, kg)[1];
interface CurveOptions { grip?: number; shoulder?: number; waist?: number; square?: number; flare?: number; widthScale?: number; heightScale?: number; baseRatio?: number; bodyScale?: number }
function curveBell(kg: number, o: CurveOptions = {}) {
  const [, w, h, g] = lerpTable(YES4ALL_CHART, kg), [, , , sh] = lerpTable(ROGUE_PHOTO_RATIOS, kg), W = inch(w) * (o.widthScale ?? 1), D = castBodyDiameter(kg) * (o.bodyScale ?? 1);
  return bellLayout({ body: D, base: D * (o.baseRatio ?? .56), width: W, height: inch(h) * (o.heightScale ?? 1), grip: o.grip ?? inch(g), shoulder: o.shoulder ?? Math.min(58, sh + 10), waist: o.waist ?? .45, square: o.square ?? 2.7, flare: o.flare ?? .3 });
}

// ---------- REP Kettlebells ----------
export const REP_KG = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48] as const;
export const REP_LB = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
const REP_KG_BANDS: Record<number, string> = { 4: 'White', 6: 'Gray', 8: 'Pink', 10: 'Orange', 12: 'Blue', 14: 'Brown', 16: 'Yellow', 18: 'Brown', 20: 'Gray', 22: 'Black', 24: 'Green', 28: 'Yellow', 32: 'Red', 36: 'White', 40: 'Blue', 44: 'Brown', 48: 'Black' };
const REP_LB_BANDS: Record<number, string> = { 5: 'White', 10: 'Gray', 15: 'Pink', 20: 'Orange', 25: 'Navy', 30: 'Dark red', 35: 'Yellow', 40: 'Dark red', 45: 'Gray', 50: 'Black' };
export function repBell(unit: number, weight: number): CastBellModel {
  const kg = unit ? weight * LB : weight, band = (unit ? REP_LB_BANDS : REP_KG_BANDS)[weight];
  if (!band) throw Error('Unsupported kettlebell weight.');
  const layout = curveBell(kg, { grip: kg >= 12 ? 35 : undefined, square: 2.9, waist: .5 });
  return { layout, finish: { ...POWDER, name: 'Textured black coating' }, band: BAND_COLORS[band], bandWidth: 13,
    front: { lines: unit ? [`${weight}LB`] : [`${weight}KG`, `${kgLb(weight)}LB`], ring: true, divider: !unit, relief: 'deboss' }, back: { plate: 'deboss', width: layout.body * .5, height: layout.body * .14 }, flip: true };
}

// ---------- CAP Barbell enamel coated cast iron (SDK2) ----------
export const CAP_LB = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80] as const;
export function capBell(lb: number): CastBellModel {
  if (!(CAP_LB as readonly number[]).includes(lb)) throw Error('Unsupported kettlebell weight.');
  const layout = curveBell(lb * LB, { grip: Math.min(42, 26 + lb * .5), square: 2.4, waist: .42, flare: .38, bodyScale: 1.03 });
  return { layout, finish: ENAMEL, front: { lines: [`${lb}LB`], ring: false, divider: false, relief: 'raised', disc: 'raised', brandBar: true } };
}

// ---------- Yes4All powder coated cast iron ----------
export const YES4ALL_KG = [4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40] as const;
const YES4ALL_BANDS: Record<number, string> = { 4: 'White', 6: 'Purple', 8: 'Navy', 10: 'Orange', 12: 'Light blue', 14: 'Brown', 16: 'Yellow', 20: 'Mint', 24: 'Mint', 32: 'Yellow', 40: 'Red' };
export function yes4allBell(kg: number): CastBellModel {
  const band = YES4ALL_BANDS[kg]; if (!band) throw Error('Unsupported kettlebell weight.');
  const layout = curveBell(kg, { baseRatio: .6, square: 2.7 });
  return { layout, finish: { ...POWDER, name: 'Black powder coat' }, band: BAND_COLORS[band], bandWidth: 16,
    front: { lines: [`${kg}KG`, `${kgLb(kg)}LB`], ring: false, divider: true, relief: 'deboss', disc: 'flat' }, back: { plate: 'raised', width: layout.body * .46, height: layout.body * .13 } };
}

// ---------- Titan LB cast iron ----------
export const TITAN_LB = TITAN_LB_CHART.map(r => r[0]);
export function titanCastBell(lb: number): CastBellModel {
  const row = TITAN_LB_CHART.find(r => r[0] === lb); if (!row) throw Error('Unsupported kettlebell weight.');
  const [, h, inner, grip, body] = row;
  const layout = bellLayout({ height: inch(h), width: inch(inner) + 2 * grip, grip, body: inch(body), base: inch(body) * .56, shoulder: lerpTable(ROGUE_PHOTO_RATIOS, lb * LB)[3], waist: .5, square: 2.7, flare: .4 });
  return { layout, finish: { ...POWDER, name: 'Black powder coat' },
    front: { lines: [`${lb}LB`], ring: false, divider: false, relief: 'raised', disc: 'flat', ink: '#e9e9e6', brandBar: true, panel: '#131415' } };
}

// ---------- Fringe Sport Prime / Savage ----------
export const FRINGE_KG = [12, 16, 20, 24, 32] as const;
const FRINGE_PRIME_BANDS: Record<number, string> = { 12: 'Navy', 16: 'Orange', 20: 'Purple', 24: 'Mint', 32: 'Red' };
export function fringePrimeBell(kg: number): CastBellModel {
  const band = FRINGE_PRIME_BANDS[kg]; if (!band) throw Error('Unsupported kettlebell weight.');
  const layout = curveBell(kg, { grip: 35, square: 2.8, waist: .48 });
  return { layout, finish: { ...POWDER, name: 'Matte black powder coat' }, band: BAND_COLORS[band], bandWidth: 14,
    front: { lines: [`${kg}KG`, `${kgLb(kg)}LB`], ring: false, divider: false, relief: 'raised', disc: 'flat' } };
}
export const SAVAGE_COLORS: Record<number, [string, string]> = { 12: ['#2d7d45', 'Green'], 16: ['#e7b92a', 'Yellow'], 20: ['#1f4f9a', 'Blue'], 24: ['#d22a2a', 'Red'], 32: ['#e36a1f', 'Orange'] };
export function fringeSavageBell(kg: number): CastBellModel {
  const c = SAVAGE_COLORS[kg]; if (!c) throw Error('Unsupported kettlebell weight.');
  const layout = curveBell(kg, { grip: 36, square: 2.6, waist: .45, flare: .35, widthScale: 1.03 });
  return { layout, finish: { name: `${c[1]} rubber coating`, color: c[0], metalness: 0, roughness: .72 }, coat: { color: c[0], streak: '#18191a' },
    front: { lines: [`${kg}KG`, `${kgLb(kg)}LB`], ring: true, divider: true, relief: 'raised', badge: '#f3f1ea', ink: c[0] }, back: { plate: 'print', width: layout.body * .44, height: layout.body * .44, color: '#f3f1ea' } };
}

// ---------- Onnit Primal Bells ----------
/** Heights: Gorilla 14.5" published; others from the photo proportions and weights. Head width (incl. ears/cheeks),
 * depth and height are shares of the overall height, measured on the Onnit front product photos (depth estimated). */
export const ONNIT_ANIMALS = [
  { name: 'Howler', lb: 18, height: 235, width: 190, grip: 34, head: [.68, .55, .57] },
  { name: 'Chimp', lb: 36, height: 275, width: 203, grip: 37, head: [.66, .56, .59] },
  { name: 'Orangutan', lb: 54, height: 300, width: 192, grip: 38, head: [.74, .56, .63] },
  { name: 'Gorilla', lb: 72, height: inch(14.5), width: 202, grip: 39, head: [.62, .56, .66] },
  { name: 'Bigfoot', lb: 90, height: 390, width: 226, grip: 40, head: [.62, .58, .72] },
] as const;
/** How far the muzzle, nose and brow reach forward of the skull (share of the half depth). */
export const ONNIT_FACE_REACH = 1.1;
/** Head envelope (mm) and handle layout for a Primal Bell; the handle roots into the crown of the head. */
export function onnitLayout(animal: number) {
  const a = ONNIT_ANIMALS[animal]; if (!a) throw Error('Unsupported kettlebell animal.');
  return { animal: a, ...sculptedLayout(a) };
}
/** A sculpted-head bell: overall height, handle outer width, grip diameter and head (width, depth, height) as shares of the height. */
export interface SculptedBell { height: number; width: number; grip: number; head: readonly [number, number, number] }
/** Head envelope (mm) and handle layout for a sculpted-head bell; the handle roots into the crown of the head. */
export function sculptedLayout(a: SculptedBell) {
  const [hw, hd, hh] = a.head.map(v => v * a.height);
  // Virtual crown sphere for the horn roots: radius ~ half the skull height, centred at 55% of the head height.
  const crown = { R: hh * .46, zc: hh * .54 };
  const shape: BellShape = { height: a.height, width: a.width, grip: a.grip, body: 2 * crown.R, base: 1, shoulder: 40, waist: .45, square: 3, flare: .3 };
  const shift = crown.zc - bellLayout(shape).zc;
  const layout = bellLayout({ ...shape, height: a.height - shift });
  const tubeX = Math.max(...layout.path.map(p => p.x + p.r)), tubeY = Math.max(...layout.path.map(p => p.r));
  return { hw, hd, hh, crown, layout, shift, halfWidth: Math.max(tubeX, hw / 2), halfDepth: Math.max(tubeY, hd / 2) };
}
/** Footprint of a sculpted bell whose face (nose, brow) reaches `reach` × the half depth forward of the skull. */
export const sculptedFootprint = (o: ReturnType<typeof sculptedLayout>, reach = ONNIT_FACE_REACH) => {
  const front = Math.max(o.halfDepth, o.hd / 2 * reach), back = o.halfDepth; return { width: 2 * o.halfWidth, depth: front + back, offset: [0, (back - front) / 2] as [number, number] };
};

// ---------- Onnit Zombie Bells (2013 limited edition) ----------
/** No dimensions were ever published. Relative sizes are measured on Onnit's same-distance studio lineup (uncrate / Gym Radar
 * copies): overall heights 1 : 0.91 : 0.82 : 0.72 (72 → 18 lb), handle width ≈ constant (the "enlarged handles"), head width with
 * ears 0.98 / 0.87 / 0.80 / 0.76 of the handle width (widened ~6 % in review so the cheeks and jaw fill the face as in the photos), head 63 / 65 / 60 / 55 % of the height. Absolute scale: the 2-pood
 * Mega Dead is taken at the 14.5" of Onnit's 2-pood Primal Gorilla; grips 35–40 mm from the handle-leg widths. Depth ≈ 0.95 ×
 * head height (Onnit side view). `reach`: how far the face comes forward of the skull, as a share of the half depth (the brow and
 * teeth on the skull-nosed heads, the fleshy nose on the Mega Dead and Brain Goblin). */
export const ZOMBIE_HEADS = [
  { name: 'Brain Goblin', lb: 18, height: 266, width: 202, grip: 35, head: [.62, .52, .55], reach: 1.18 },
  { name: 'Staple Head', lb: 36, height: 303, width: 227, grip: 38, head: [.64, .57, .6], reach: 1 },
  { name: 'Ghostface Thrilla', lb: 54, height: 335, width: 231, grip: 40, head: [.64, .62, .65], reach: 1 },
  { name: 'Mega Dead', lb: 72, height: inch(14.5), width: 228, grip: 40, head: [.64, .6, .63], reach: 1.18 },
] as const;
export function zombieLayout(head: number) {
  const z = ZOMBIE_HEADS[head]; if (!z) throw Error('Unsupported kettlebell head.');
  return { zombie: z, ...sculptedLayout(z) };
}

// ---------- Competition bells (constant size, colour by weight) ----------
export interface CompetitionModel { /** widest circle, crown height between the horns, flat base diameter */ eq: number; crown: number; base: number; layout: BellLayout; color: string; stripe?: string; paintTop: number; steel: string; front: string[]; logoRing: boolean; logoColor: string; weightColor?: string }
export const KBK_KG = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48] as const;
const IKO: Record<number, string> = { 8: '#ef9fb4', 12: '#2749b5', 16: '#f1c21c', 20: '#6d3fa3', 24: '#1f6d45', 28: '#ec6a24', 32: '#d8262c', 36: '#8d9196', 40: '#eeede8', 44: '#b9bcc0', 48: '#c9a449' };
export const COMP_SHAPE = (height: number, width: number, grip: number, base: number): BellShape => ({ height, width, grip, body: 210, base, shoulder: 60, waist: .3, square: 4.2, flare: .22 });
/** Competition body proportions from the Kettlebell Kings / Titan product photos: widest at 34% of the height, crown at 67%, flat base 0.68 D. */
export const compBodyShape = (height: number) => ({ eq: height * .34, crown: height * .67, base: 210 * .68 });
export function kbkBell(kg: number): CompetitionModel {
  if (!(KBK_KG as readonly number[]).includes(kg)) throw Error('Unsupported kettlebell weight.');
  const odd = kg < 34 && kg % 4 === 2, color = IKO[odd ? kg - 2 : kg];
  const layout = bellLayout(COMP_SHAPE(280, 185, 35, 128));
  return { ...compBodyShape(280), layout, color, stripe: odd ? '#141414' : undefined, paintTop: layout.zt - 32, steel: '#b9bec3', front: [`${kg}kg`], logoRing: true, logoColor: '#00000033', weightColor: undefined };
}
export const TITAN_COMP_KG = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32] as const;
const TITAN_COMP: Record<number, string> = { 8: '#f2c72a', 10: '#f6a35a', 12: '#ef7a1f', 14: '#d9282b', 16: '#e6589b', 18: '#7a3fb0', 20: '#2f8fe0', 22: '#233c8f', 24: '#1ea39b', 26: '#3a9c46', 28: '#245b33', 30: '#6e4a30', 32: '#f1f0ec' };
export const TITAN_COMP_NAMES: Record<number, string> = { 8: 'Yellow', 10: 'Light Orange', 12: 'Orange', 14: 'Red', 16: 'Pink', 18: 'Purple', 20: 'Blue', 22: 'Navy Blue', 24: 'Teal', 26: 'Green', 28: 'Hunter Green', 30: 'Brown', 32: 'White' };
export function titanCompBell(kg: number): CompetitionModel {
  const color = TITAN_COMP[kg]; if (!color) throw Error('Unsupported kettlebell weight.');
  const layout = bellLayout(COMP_SHAPE(290, 190, 35, 132));
  return { ...compBodyShape(290), layout, color, paintTop: layout.zt - 36, steel: '#b3b7bb', front: [`${kg}`], logoRing: true, logoColor: '#6b5a3e' };
}

// ---------- Adjustable bells ----------
/** Ironmaster Quick-Lock kettlebell handle: 8.75" × 7.75" empty; 0.5" 5 lb plates, 0.25" 2.5 lb plates, 0.5" locking-screw head. */
export const IRONMASTER = { width: inch(8.75), height: inch(7.75), grip: inch(1.375), plate: 159, plateCorner: 22, plate5: inch(.5), plate25: inch(.25), screwHead: inch(.5), screwDisc: 76, screwLb: 2.5, standardMax: 57.5 - 22.5 - 2.5 } as const;
export const IRONMASTER_HANDLES = [12.5, 22.5] as const;
export const ironmasterWeights = (handle: number) => { const h = IRONMASTER_HANDLES[handle], out: number[] = [h]; for (let w = h + 2.5; w <= h + 57.5 + 1e-9; w += 2.5) out.push(w); return out; };
export function ironmasterStack(handle: number, weight: number) {
  const h = IRONMASTER_HANDLES[handle]; if (h === undefined || !ironmasterWeights(handle).includes(weight)) throw Error('Unsupported kettlebell weight.');
  if (weight === h) return { plates5: 0, plates25: 0, screw: false, addOn: false, stack: 0 };
  const plates = weight - h - IRONMASTER.screwLb, plates5 = Math.floor(plates / 5 + 1e-9), plates25 = plates - plates5 * 5 > 1e-9 ? 1 : 0;
  return { plates5, plates25, screw: true, addOn: plates > IRONMASTER.standardMax + 1e-9, stack: IRONMASTER.screwHead + plates5 * IRONMASTER.plate5 + plates25 * IRONMASTER.plate25 };
}
/** Freak Athlete FA Adjustable Kettlebell: published 302.5 H × 229.3 L × 180 W mm, 206 mm handle, 140 mm window, 33 mm grip. */
export const FREAK = { height: 302.5, length: 229.3, depth: 180, width: 206, window: 140, grip: 33, plates: 10, plateKg: 2, shellKg: 12, pin: 15.3 } as const;
/** Pin height for a setting: the magnetic pin drops one 2 kg plate (13 mm pitch) per step below the empty-shell station. */
export const freakPinZ = (kg: number) => 46 + (32 - kg) / 2 * 13;
export const FREAK_KG = Array.from({ length: 11 }, (_, i) => 12 + 2 * i);
/** REP Adjustable Kettlebell: competition-size shell, 33 mm handle, ~123 mm window, 140 mm base; four plates per model. */
export const REP_ADJ_MODELS = [
  { name: '8–16 kg', unit: 'kg', min: 8, step: 2, plates: 4, cap: '#d0262d' },
  { name: '16–24 kg', unit: 'kg', min: 16, step: 2, plates: 4, cap: '#2c5fb8' },
  { name: '20–40 lb', unit: 'lb', min: 20, step: 5, plates: 4, cap: '#d0262d' },
] as const;
export const REP_ADJ = { height: 280, body: 205, width: 123 + 2 * 33, grip: 33, base: 140, plate: 118, rim: 136, plateGap: 70 } as const;
/** Plate thickness (mm) of one REP adjustable plate: iron disc of the plate diameter carrying one weight step. */
export const repAdjPlateT = (model: number) => { const m = REP_ADJ_MODELS[model]; const kg = m.unit === 'lb' ? m.step * LB : m.step; return kg / IRON_DENSITY / (Math.PI * (REP_ADJ.plate / 2) ** 2 - Math.PI * 15 ** 2); };
export const repAdjSpares = (model: number, weight: number) => { const m = REP_ADJ_MODELS[model]; return Math.round((m.min + m.plates * m.step - weight) / m.step); };
export const repAdjWeights = (model: number) => { const m = REP_ADJ_MODELS[model]; if (!m) throw Error('Unsupported kettlebell model.'); return Array.from({ length: m.plates + 1 }, (_, i) => m.min + i * m.step); };
/** Bells of Steel Adjustable Competition Kettlebell: steel competition shell, iron plates, 0.5 kg steps. */
export const BOS_MODELS = [{ name: '12–20.5 kg', max: 20.5 }, { name: '12–32 kg', max: 32 }] as const;
export const BOS_COLORS = [['Black', '#1c1d1f'], ['Blue', '#1f3fae'], ['Purple', '#4b2f9c'], ['Yellow', '#f2c81c']] as const;
export const bosWeights = (model: number) => { const m = BOS_MODELS[model]; if (!m) throw Error('Unsupported kettlebell model.'); return Array.from({ length: Math.round((m.max - 12) / .5) + 1 }, (_, i) => 12 + i * .5); };
export const BOS = { height: 280, body: 210, width: 185, grip: 35, base: 143, plate: 150, plateGap: 70 } as const;
/** Removed iron (kg) as 2 kg plates plus one fractional plate; thickness of a 150 mm plate per kg of iron. */
export const bosSpares = (model: number, weight: number) => { const kg = BOS_MODELS[model].max - weight, whole = Math.floor(kg / 2 + 1e-9); return { kg, plates: [...Array(whole).fill(2), ...(kg - whole * 2 > 1e-9 ? [kg - whole * 2] : [])] as number[] }; };
export const BOS_MM_PER_KG = 1 / IRON_DENSITY / (Math.PI * (BOS.plate / 2) ** 2 - Math.PI * 16 ** 2);
/** Bowflex SelectTech 840: 8.8" L × 7" W × 12.5" H; six settings. */
export const BOWFLEX_840 = { length: inch(8.8), depth: inch(7), height: inch(12.5), weights: [8, 12, 20, 25, 35, 40] } as const;

/** Removed-plate stack beside an adjustable bell (as in the product photos), from the removed plate count. */
export const spareStackBox = (bellWidth: number, bellDepth: number, plate: number, gap: number, spares: number): FloorBox => spares
  ? { width: bellWidth / 2 + gap + plate + bellWidth / 2, depth: Math.max(bellDepth, plate), offset: [(gap + plate) / 2, 0] }
  : { width: bellWidth, depth: bellDepth };

// ---------- Floor part entries ----------
const kgOpts = (list: readonly number[]) => list;
const lb = (v: number) => `${v} lb`;
const common = { noun: 'kettlebell', section: 'Kettlebells', placement: { side: 'left', gap: 350 }, pair: { gap: KB_PAIR_GAP } } as const;

export const ROGUE_KETTLEBELL = defineFloorPart({
  ...common, id: 'rogue-kettlebell', name: 'Rogue Kettlebell', title: 'Rogue Kettlebells',
  description: 'Rogue ductile iron kettlebell, 4–92 kg, textured black powder coat with colour-coded handle stripes, debossed weight circle and Rogue side (the V1 run shares the casting). Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'weight', label: 'Weight', default: 16, options: kgOpts(ROGUE_KG), format: fmtKg }],
  footprint: p => castFootprint(rogueBell(p.weight)),
  vendor: rogueVendor('https://www.roguefitness.com/rogue-kettlebells', 'Rogue Fitness — Rogue Kettlebells (ductile iron, IP0670) and the original V1 powder-coat run', 'Handle diameter, handle width, flat base diameter and stripe colour per weight from the published Rogue size chart; body diameter solved from the weight at iron density, height from the photographed window clearance. Weight numerals in a plain stroke font, brand side as a blank debossed panel; scenery only.'),
});
export const ROGUE_USA_KETTLEBELL = defineFloorPart({
  ...common, id: 'rogue-usa-kettlebell', name: 'Rogue Kettlebell (USA)', title: 'Rogue Kettlebell, E-Coat / Powder Coat',
  description: 'Made-in-USA Rogue Kettlebell cast by Cadillac Casting / OSCO: black E-coat (9–88 lb) or Class A powder coat (13–88 lb), debossed weight circle and "Made in the USA" Rogue side. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'finish', label: 'Finish', default: 0, options: [0, 1], format: v => ['E-Coat (semi-gloss)', 'Powder Coat'][v] ?? String(v) },
    { key: 'weight', label: 'Weight', default: 16, options: p => ROGUE_KG.filter(kg => kg <= 40 && (p.finish ? kg >= 6 : true)), format: fmtKg },
  ],
  footprint: p => castFootprint(rogueBell(p.weight)),
  vendor: rogueVendor('https://www.roguefitness.com/rogue-kettlebell-e-coat', 'Rogue Fitness — Rogue Kettlebell E-Coat (USC001) and Powder Coat (USC001-PC)', 'Handle diameters 1.2" (9–18 lb), 1.4" (26 lb), 1.5" (35–88 lb) published; handle width and base follow the Rogue size chart for the same weights; body solved from weight, height estimated from photos. No stripes, debossed marks; scenery only.'),
});
export const REP_KETTLEBELL = defineFloorPart({
  ...common, id: 'rep-kettlebell', name: 'REP Kettlebell', title: 'REP Kettlebells',
  description: 'REP Fitness gravity-die-cast kettlebell in kg (4–48) or lb (5–50), textured black coating with colour-coded handle bands, debossed REP front and weight circle. Independent reconstruction; REP trademarks belong to REP Fitness.',
  params: [
    { key: 'unit', label: 'Line', default: 0, options: [0, 1], format: v => ['Kettlebells (kg)', 'Kettlebells (lb)'][v] ?? String(v) },
    { key: 'weight', label: 'Weight', default: 16, options: p => p.unit ? REP_LB : REP_KG, format: v => `${v}` },
  ],
  footprint: p => castFootprint(repBell(p.unit, p.weight)),
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/kettlebells-kg', credit: 'REP Fitness — Kettlebells (kg) KB-3002 and Kettlebells (lb)', trademark: 'REP and REP Fitness are trademarks of REP Fitness.', reconstruction: 'Weights and band colours from the REP variant list; 35 mm handle (12 kg+) published; handle width and height follow a published cast-bell size chart, body solved from weight. Brand mark as a blank debossed panel; scenery only.' },
});
export const CAP_KETTLEBELL = defineFloorPart({
  ...common, id: 'cap-cast-iron-kettlebell', name: 'CAP Cast Iron Kettlebell', title: 'CAP Barbell Cast Iron Kettlebell',
  description: 'CAP Barbell enamel coated cast iron kettlebell (SDK2), 5–80 lb, gloss black enamel with a raised CAP weight disc on the front. Independent reconstruction; CAP Barbell trademarks belong to CAP Barbell.',
  params: [{ key: 'weight', label: 'Weight', default: 35, options: CAP_LB, format: lb }],
  footprint: p => castFootprint(capBell(p.weight)),
  vendor: { vendor: 'CAP Barbell', url: 'https://capbarbell.com/products/cap-enamel-coated-cast-iron-kettlebell', credit: 'CAP Barbell — Enamel Coated Cast Iron Kettlebell (SDK2)', trademark: 'CAP and CAP Barbell are trademarks of CAP Barbell.', reconstruction: 'Weights published; CAP publishes no dimensions, so height and handle width follow a published cast-bell size chart, body solved from weight, thick handle and raised disc from product photos; scenery only.' },
});
export const YES4ALL_KETTLEBELL = defineFloorPart({
  ...common, id: 'yes4all-kettlebell', name: 'Yes4All Kettlebell', title: 'Yes4All Kettlebell',
  description: 'Yes4All powder coated cast iron kettlebell, 4–40 kg, colour-coded rings at the horns and dual kg/lb markings. Independent reconstruction; Yes4All trademarks belong to Yes4All.',
  params: [{ key: 'weight', label: 'Weight', default: 16, options: YES4ALL_KG, format: fmtKg }],
  footprint: p => castFootprint(yes4allBell(p.weight)),
  vendor: { vendor: 'Yes4All', url: 'https://www.amazon.com/Yes4All-Competition-Kettlebell-Handles-Bottoms/dp/B0B4ZYHYBR', credit: 'Yes4All — Powder Coated Cast Iron Kettlebell', trademark: 'Yes4All is a trademark of Yes4All.', reconstruction: 'Height, outer handle width and grip diameter from the Yes4All dimension images (4–32 kg; 16 and 40 kg interpolated); body solved from weight; ring colours from product photos; scenery only.' },
});
export const TITAN_CAST_KETTLEBELL = defineFloorPart({
  ...common, id: 'titan-cast-iron-kettlebell', name: 'Titan Cast Iron Kettlebell', title: 'Titan Fitness LB Cast Iron Kettlebells',
  description: 'Titan Fitness LB cast iron kettlebell, 5–100 lb, black powder coat with the printed Titan weight badge. Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [{ key: 'weight', label: 'Weight', default: 35, options: TITAN_LB, format: lb }],
  footprint: p => castFootprint(titanCastBell(p.weight)),
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/lb-cast-iron-kettlebells', credit: 'Titan Fitness — LB Cast Iron Kettlebells', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: 'Overall height, handle width, grip diameter and body width per weight from the Titan specification tables; flat base and horn shape from photos; printed badge as a plain plate; scenery only.' },
});
export const FRINGE_PRIME_KETTLEBELL = defineFloorPart({
  ...common, id: 'fringe-prime-kettlebell', name: 'Fringe Sport Prime Kettlebell', title: 'Fringe Sport Prime Kettlebells',
  description: 'Fringe Sport Prime kettlebell, 12–32 kg, matte black powder coat with colour-coded handle bands and a raised flat weight panel. Independent reconstruction; Fringe Sport trademarks belong to Fringe Sport.',
  params: [{ key: 'weight', label: 'Weight', default: 16, options: FRINGE_KG, format: fmtKg }],
  footprint: p => castFootprint(fringePrimeBell(p.weight)),
  vendor: { vendor: 'Fringe Sport', url: 'https://www.fringesport.com/products/prime-kettlebells-by-fringe-sport', credit: 'Fringe Sport — Prime Kettlebells', trademark: 'Fringe Sport and Prime are trademarks of Fringe Sport.', reconstruction: 'Weights published; height and handle width follow a published cast-bell size chart, body solved from weight; band colours and flat panel from product photos; scenery only.' },
});
export const FRINGE_SAVAGE_KETTLEBELL = defineFloorPart({
  ...common, id: 'fringe-savage-kettlebell', name: 'Fringe Sport Savage Kettlebell', title: 'Fringe Sport Savage Kettlebells',
  description: 'Fringe Sport Savage kettlebell, 12–32 kg, soft-touch rubber coating in the Savage colour per weight with black marbling and white badges. Independent reconstruction; Fringe Sport trademarks belong to Fringe Sport.',
  params: [{ key: 'weight', label: 'Weight', default: 16, options: FRINGE_KG, format: v => `${fmtKg(v)} · ${SAVAGE_COLORS[v]?.[1] ?? ''}` }],
  footprint: p => castFootprint(fringeSavageBell(p.weight)),
  vendor: { vendor: 'Fringe Sport', url: 'https://www.fringesport.com/products/savage-kettlebells', credit: 'Fringe Sport — Savage Kettlebells', trademark: 'Fringe Sport and Savage are trademarks of Fringe Sport.', reconstruction: 'Weights and colours per weight published; size follows a published cast-bell size chart, body solved from weight; marbling streaks approximated; badges as plain discs; scenery only.' },
});
export const ONNIT_PRIMAL_KETTLEBELL = defineFloorPart({
  ...common, id: 'onnit-primal-kettlebell', name: 'Onnit Primal Bell', title: 'Onnit Primal Kettlebells',
  description: 'Onnit Primal Bell cast iron kettlebells with sculpted primate heads: Howler 18 lb, Chimp 36 lb, Orangutan 54 lb, Gorilla 72 lb, Bigfoot 90 lb (discontinued). Independent reconstruction; Onnit trademarks belong to Onnit.',
  params: [{ key: 'animal', label: 'Bell', default: 1, options: ONNIT_ANIMALS.map((_, i) => i), format: v => ONNIT_ANIMALS[v] ? `${ONNIT_ANIMALS[v].name} · ${ONNIT_ANIMALS[v].lb} lb` : String(v) }],
  footprint: p => sculptedFootprint(onnitLayout(p.animal)),
  vendor: { vendor: 'Onnit', url: 'https://www.onnit.com/primal-bells/', credit: 'Onnit — Primal Bells (Howler, Chimp, Orangutan, Gorilla, Bigfoot)', trademark: 'Onnit and Primal Bell are trademarks of Onnit Labs.', reconstruction: 'Weights published; heights from retailer listings (Gorilla 14.5", Chimp ~10.5") and product-photo proportions, others estimated. Heads sculpted from smooth-blended primitives after the product photos, not scanned; scenery only.' },
});
export const ONNIT_ZOMBIE_KETTLEBELL = defineFloorPart({
  ...common, id: 'onnit-zombie-kettlebell', name: 'Onnit Zombie Bell', title: 'Onnit Zombie Kettlebells',
  description: 'Onnit Zombie Bells, the 2013 limited-edition cast iron kettlebells with hand-sculpted undead human heads and enlarged handles: Brain Goblin 18 lb, Staple Head 36 lb, Ghostface Thrilla 54 lb, Mega Dead 72 lb (discontinued). Independent reconstruction; Onnit trademarks belong to Onnit.',
  params: [{ key: 'head', label: 'Bell', default: 1, options: ZOMBIE_HEADS.map((_, i) => i), format: v => ZOMBIE_HEADS[v] ? `${ZOMBIE_HEADS[v].name} · ${ZOMBIE_HEADS[v].lb} lb` : String(v) }],
  footprint: p => { const o = zombieLayout(p.head); return sculptedFootprint(o, o.zombie.reach); },
  vendor: { vendor: 'Onnit', url: 'https://www.onnit.com/zombie-bells/', credit: 'Onnit — Zombie Bells (Brain Goblin, Staple Head, Ghostface Thrilla, Mega Dead)', trademark: 'Onnit and Zombie Bells are trademarks of Onnit Labs.', reconstruction: 'Weights, names and the enlarged handles published (archived onnit.com/zombie-bells, 2013–2025). No dimensions were published: relative sizes are measured on Onnit\'s same-distance studio lineup and the Mega Dead is scaled to the 14.5" of Onnit\'s 2-pood Primal Gorilla, with depth from the side view. Heads are sculpted from smooth-blended primitives after the Onnit photos, not scanned; scenery only.' },
});
export const KBK_COMPETITION_KETTLEBELL = defineFloorPart({
  ...common, id: 'kettlebell-kings-competition-kettlebell', name: 'Kettlebell Kings Competition Kettlebell', title: 'Kettlebell Kings Competition Kettlebell',
  description: 'Kettlebell Kings single-cast steel competition kettlebell, one 280 × 210 mm size with a 35 mm handle for every weight (8–48 kg), IKO colour coding with black stripes on the odd sizes and a bare steel handle. Independent reconstruction; Kettlebell Kings trademarks belong to Kettlebell Kings.',
  params: [{ key: 'weight', label: 'Weight', default: 16, options: KBK_KG, format: fmtKg }],
  footprint: p => bellFootprint(kbkBell(p.weight).layout),
  vendor: { vendor: 'Kettlebell Kings', url: 'https://www.kettlebellkings.com/products/competition-kettlebell', credit: 'Kettlebell Kings — Competition Kettlebell (35 mm)', trademark: 'Kettlebell Kings is a trademark of Kettlebell Kings.', reconstruction: 'Competition standard 280 mm height, 210 mm body, 35 mm handle and the 185 mm handle width Kettlebell Kings publish; IKO colours and odd-weight stripes from product photos; window and base estimated; crown logo as a plain ring; scenery only.' },
});
export const TITAN_COMPETITION_KETTLEBELL = defineFloorPart({
  ...common, id: 'titan-competition-kettlebell', name: 'Titan Competition Kettlebell', title: 'Titan Fitness Competition Kettlebells',
  description: 'Titan Fitness hollow-core steel competition kettlebell, 8–32 kg, one 290 × 210 mm size with a 35 mm handle, Titan colour per weight and a laser-etched logo ring. Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [{ key: 'weight', label: 'Weight', default: 16, options: TITAN_COMP_KG, format: v => `${fmtKg(v)} · ${TITAN_COMP_NAMES[v] ?? ''}` }],
  footprint: p => bellFootprint(titanCompBell(p.weight).layout),
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/kg-competition-kettlebell', credit: 'Titan Fitness — KG Competition Kettlebells', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: '290 mm height, 210 mm diameter, 190 mm handle width, 35 mm handle and colour per weight from the Titan specification tables; window, base and logo ring estimated from photos; scenery only.' },
});
export const IRONMASTER_KETTLEBELL = defineFloorPart({
  ...common, id: 'ironmaster-quick-lock-kettlebell-handle', name: 'Ironmaster Quick-Lock Kettlebell', title: 'Ironmaster Quick-Lock Adjustable Kettlebell Handle',
  description: 'Ironmaster Quick-Lock adjustable kettlebell handle (12.5 or 22.5 lb) loaded with Quick-Lock dumbbell plates on the locking screw, in 2.5 lb steps. Independent reconstruction; Ironmaster trademarks belong to Ironmaster.',
  params: [
    { key: 'handle', label: 'Handle', default: 1, options: [0, 1], format: v => `${IRONMASTER_HANDLES[v] ?? v} lb handle` },
    { key: 'weight', label: 'Loaded weight', default: 40, options: p => ironmasterWeights(p.handle), format: lb },
  ],
  footprint: { width: Math.max(IRONMASTER.width, IRONMASTER.plate), depth: IRONMASTER.plate },
  vendor: { vendor: 'Ironmaster', url: 'https://www.ironmaster.com/products/quick-lock-adjustable-kettlebell-handle/', credit: 'Ironmaster — Quick-Lock Adjustable Kettlebell Handle 22.5 and 12.5', trademark: 'Ironmaster and Quick-Lock are trademarks of Ironmaster.', reconstruction: 'Published 8.75" × 7.75" empty handle, 11.5" at 57.5 lb and 13.75" at 80 lb (22.5 handle), 1.375" grip, 2.5 lb steps and locking-screw ranges; plate size and thickness derived from those heights; body facets from photos; scenery only.' },
});
export const FREAK_KETTLEBELL = defineFloorPart({
  ...common, id: 'freak-athlete-adjustable-kettlebell', name: 'Freak Athlete Adjustable Kettlebell', title: 'Freak Athlete FA Adjustable Kettlebell',
  description: 'Freak Athlete FA adjustable kettlebell: powder-coated cast iron shell over ten 2 kg internal plates, 12–32 kg, selected with a magnetic side pin. Independent reconstruction; Freak Athlete trademarks belong to Freak Athlete.',
  params: [{ key: 'weight', label: 'Weight', default: 24, options: FREAK_KG, format: fmtKg }],
  footprint: { width: FREAK.length, depth: FREAK.depth, offset: [FREAK.pin / 2, 0] },
  vendor: { vendor: 'Freak Athlete', url: 'https://freakathlete.co/products/kettlebell', credit: 'Freak Athlete — FA Adjustable Kettlebell', trademark: 'Freak Athlete and FA are trademarks of Freak Athlete.', reconstruction: 'Published 302.5 × 229.3 × 180 mm, 206 mm handle, 140 mm window, 33 mm grip, 12–32 kg in 2 kg steps with ten plates; shell facets, pin and scale from product renders; logo as a plain orange badge; scenery only.' },
});
export const REP_ADJUSTABLE_KETTLEBELL = defineFloorPart({
  ...common, id: 'rep-adjustable-kettlebell', name: 'REP Adjustable Kettlebell', title: 'REP Adjustable Kettlebell',
  description: 'REP Fitness adjustable competition-style kettlebell (8–16 kg, 16–24 kg or 20–40 lb): cast iron shell with a coloured top cap; removed plates stack beside the bell. Independent reconstruction; REP trademarks belong to REP Fitness.',
  params: [
    { key: 'model', label: 'Model', default: 0, options: [0, 1, 2], format: v => REP_ADJ_MODELS[v]?.name ?? String(v) },
    { key: 'weight', label: 'Weight', default: 16, options: p => repAdjWeights(p.model), format: v => `${v}` },
  ],
  footprint: p => spareStackBox(REP_ADJ.body, REP_ADJ.body, REP_ADJ.rim, REP_ADJ.plateGap, repAdjSpares(p.model, p.weight)),
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/adjustable-kettlebells', credit: 'REP Fitness — Adjustable Kettlebell', trademark: 'REP and REP Fitness are trademarks of REP Fitness.', reconstruction: 'Weight ranges and steps published; 33 mm handle, ~123 mm window and ~140 mm base from the BarBend measurements; shell height and plate size estimated from product photos; scenery only.' },
});
export const BOS_ADJUSTABLE_KETTLEBELL = defineFloorPart({
  ...common, id: 'bells-of-steel-adjustable-competition-kettlebell', name: 'Bells of Steel Adjustable Kettlebell', title: 'Bells of Steel Adjustable Competition Kettlebell',
  description: 'Bells of Steel adjustable competition kettlebell: competition-size steel shell loaded with iron plates in 0.5 kg steps (12–20.5 or 12–32 kg), in black, blue, purple or yellow; removed plates stack beside the bell. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [
    { key: 'model', label: 'Model', default: 1, options: [0, 1], format: v => BOS_MODELS[v]?.name ?? String(v) },
    { key: 'color', label: 'Colour', default: 1, options: [0, 1, 2, 3], format: v => BOS_COLORS[v]?.[0] ?? String(v) },
    { key: 'weight', label: 'Weight', default: 16, options: p => bosWeights(p.model), format: v => `${v} kg` },
  ],
  footprint: p => spareStackBox(BOS.body, BOS.body, BOS.plate, BOS.plateGap, p.weight < BOS_MODELS[p.model].max - 1e-9 ? 1 : 0),
  vendor: { vendor: 'Bells of Steel', url: 'https://bellsofsteel.us/collections/kettlebells/products/adjustable-kettlebell', credit: 'Bells of Steel — Adjustable Competition Kettlebell', trademark: 'Bells of Steel is a trademark of Bells of Steel.', reconstruction: 'Weight ranges, 0.5 kg steps and colours published; competition-standard 280 mm × 210 mm shell and 35 mm handle; plate sizes estimated from product photos; logo as a plain ring; scenery only.' },
});
export const BOWFLEX_840_KETTLEBELL = defineFloorPart({
  ...common, id: 'bowflex-selecttech-840-kettlebell', name: 'Bowflex SelectTech 840 Kettlebell', title: 'Bowflex SelectTech 840 Adjustable Kettlebell',
  description: 'Bowflex SelectTech 840 adjustable kettlebell, 8–40 lb in six settings chosen with the top dial, resting on its base tray. Independent reconstruction; Bowflex and SelectTech trademarks belong to BowFlex Inc.',
  params: [{ key: 'weight', label: 'Dial setting', default: 20, options: BOWFLEX_840.weights, format: lb }],
  footprint: { width: BOWFLEX_840.length, depth: BOWFLEX_840.depth },
  vendor: { vendor: 'BowFlex', url: 'https://www.bowflex.com/product/840-adjustable-kettlebell/100790.html', credit: 'BowFlex — SelectTech 840 Kettlebell (100790)', trademark: 'BowFlex and SelectTech are trademarks of BowFlex Inc.', reconstruction: 'Published 8.8" × 7" × 12.5" envelope and 8/12/20/25/35/40 lb settings; shell bands, dial, handle and base tray from product photos; scenery only.' },
});
export const kgToLb = kgLb;
export const LB_KG = LB;
export const PARTS = [
  ROGUE_KETTLEBELL, REP_KETTLEBELL, ROGUE_USA_KETTLEBELL, CAP_KETTLEBELL, IRONMASTER_KETTLEBELL, FREAK_KETTLEBELL, REP_ADJUSTABLE_KETTLEBELL,
  YES4ALL_KETTLEBELL, BOS_ADJUSTABLE_KETTLEBELL, ONNIT_PRIMAL_KETTLEBELL, BOWFLEX_840_KETTLEBELL, KBK_COMPETITION_KETTLEBELL,
  FRINGE_PRIME_KETTLEBELL, FRINGE_SAVAGE_KETTLEBELL, TITAN_CAST_KETTLEBELL, TITAN_COMPETITION_KETTLEBELL, ONNIT_ZOMBIE_KETTLEBELL,
] as const;
export type KettlebellParams = NumericParams;
