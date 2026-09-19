/** Published dimensions, colourways and linkage layout for the benches family. Pure data + math (main bundle safe):
 * the metadata in ./benches.ts and the Manifold builders in ../parts/benches-*.ts share it, so footprints, ladder
 * stations and tests all agree. Local bench axes: y runs from the front tip (y = 0, handle/seat end) to the head end
 * (y = L), z up, x across; builders shift by −L/2 so the origin sits at the footprint centre. Research: ../research/benches.md. */
export type Pt = [number, number];
export const inch = (v: number) => v * 25.4;
export const deg = (v: number) => `${v}°`;
export const rotYZ = (p: Pt, degrees: number, c: Pt): Pt => {
  const a = degrees * Math.PI / 180, y = p[0] - c[0], z = p[1] - c[1];
  return [c[0] + y * Math.cos(a) - z * Math.sin(a), c[1] + y * Math.sin(a) + z * Math.cos(a)];
};
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const unit = (a: Pt): Pt => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
export const along = (o: Pt, u: Pt, s: number): Pt => [o[0] + u[0] * s, o[1] + u[1] * s];
/** Parameters s (ascending) where the circle |p − c| = r meets the line o + s·u (u unit). */
export function lineCircle(c: Pt, o: Pt, u: Pt, r: number): [number, number] | undefined {
  const d = sub(c, o), t = dot(d, u), n2 = dot(d, d) - t * t, h2 = r * r - n2;
  if (h2 < 0) return undefined;
  const h = Math.sqrt(h2); return [t - h, t + h];
}
export interface PadSpec { len: number; w: number; /** width at the far end (seat front / back head end) when tapered */ wEnd?: number; t: number; r: number; e: number }
/** Ladder-style adjustable bench (Rogue, Freak Athlete, APEX, Prime, Major, Titan). Every length in mm, local axes. */
export interface AdjustableSpec {
  L: number; W: number; top: number; gap: number; seatFront: number; seat: PadSpec; back: PadSpec; rail: number;
  /** main tube section [in-plane height, width across] */ tube: [number, number];
  /** spine front / front-leg top and front-leg floor end (tube centre lines) */ joint: Pt; foot: Pt;
  spineEnd: Pt; rearY: number; rearTube: [number, number]; rubber: number;
  wheel: { d: number; w: number; y: number; z: number; x: number };
  /** ladder rise above the spine centre line (negative: pin runs inside the tube, Manta Ray style) */ ladder: { rise: number };
  /** link attach distances (back: behind the pivot; seat: behind the seat front) and slack beyond the tightest station */
  backLink: { at: number; slack: number }; seatLink: { at: number; slack: number; branch: 0 | 1 };
  backAngles: readonly number[]; seatAngles: readonly number[];
}
export function adjustableLayout(s: AdjustableSpec) {
  const backFront = s.seatFront + s.seat.len + s.gap, backEnd = backFront + s.back.len;
  const pivot: Pt = [backFront + Math.max(s.back.t - s.gap, 0) + 6, s.top - s.back.t];
  const seatHinge: Pt = [s.seatFront + s.seat.len - 20, s.top - s.seat.t];
  const u = unit(sub(s.spineEnd, s.joint)), n: Pt = [-u[1], u[0]];
  const ladder0 = along(s.joint, n, s.tube[0] / 2 + s.ladder.rise);
  const v = unit(sub(s.joint, s.foot)), m: Pt = [-v[1], v[0]];
  const leg0 = along(s.foot, m, s.tube[0] / 2 + 10);
  const backTop = (a: number) => rotYZ([pivot[0] + s.backLink.at, pivot[1] - s.rail], a, pivot);
  const seatTop = (a: number) => rotYZ([s.seatFront + s.seatLink.at, s.top - s.seat.t - s.rail], -a, seatHinge);
  const normal = (p: Pt, o: Pt, w: Pt) => Math.abs(dot(sub(p, o), [-w[1], w[0]]));
  /** Fixed link lengths: just longer than the tightest (largest-offset) setting, so every station is a real solution. */
  const backLen = Math.max(...s.backAngles.map(a => normal(backTop(a), ladder0, u))) + s.backLink.slack;
  const seatLen = Math.max(...s.seatAngles.map(a => normal(seatTop(a), leg0, v))) + s.seatLink.slack;
  /** Pin station along the ladder (distance from the spine's front end) for a back angle. */
  const backStation = (a: number) => { const r = lineCircle(backTop(a), ladder0, u, backLen); if (!r) throw Error(`No ladder station for ${a}°`); return r[1]; };
  const seatStation = (a: number) => { const r = lineCircle(seatTop(a), leg0, v, seatLen); if (!r) throw Error(`No seat station for ${a}°`); return r[s.seatLink.branch]; };
  const backPin = (a: number) => along(ladder0, u, backStation(a)), seatPin = (a: number) => along(leg0, v, seatStation(a));
  const backStations = s.backAngles.map(backStation), seatStations = s.seatAngles.map(seatStation);
  const ladder = { from: Math.min(...backStations) - 45, to: Math.max(...backStations) + 45 };
  const seatLadder = { from: Math.min(...seatStations) - 35, to: Math.max(...seatStations) + 35 };
  return { backFront, backEnd, pivot, seatHinge, u, n, v, m, ladder0, leg0, backTop, seatTop, backLen, seatLen, backStation, seatStation, backPin, seatPin, ladder, seatLadder, spineLen: Math.hypot(...sub(s.spineEnd, s.joint)), legLen: Math.hypot(...sub(s.joint, s.foot)) };
}
export interface Colorway { name: string; hex: string }
const cw = (name: string, hex: string): Colorway => ({ name, hex });
export const ROGUE_COLORS = [cw('Black', '#1c1d1f'), cw('Gun Metal', '#4b4e52'), cw('Rogue Red', '#a3161d'), cw('Blue', '#1c4f9c'), cw('Green', '#2e5a3a'), cw('White', '#e6e6e2'), cw('Orange', '#d45f1c'), cw('Navy', '#1e2a45'), cw('Satin Clear', '#707274')];
export const TITAN_COLORS = [cw('Black', '#1b1c1e'), cw('Navy', '#1f3a73'), cw('White', '#e9e9e6'), cw('Red', '#a51e22')];
export const APEX_COLORS = [cw('Black', '#1d1e20'), cw('Clear Grind', '#8c8f92'), cw('304 Stainless', '#b6b9bc'), cw('Red', '#b3151c'), cw('Gray', '#5b5e62'), cw('Blue', '#1d4fa0'), cw('White', '#e7e7e4')];
export const PRIME_COLORS = [cw('Charcoal', '#45484c'), cw('White', '#e6e6e3'), cw('Black', '#1b1c1e'), cw('Green', '#5fae2e'), cw('Silver', '#a9acaf'), cw('Blue', '#1f63c4'), cw('Red', '#c21f24'), cw('Yellow', '#e2b714')];
export const MAJOR_COLORS = [cw('Black', '#1b1c1e'), cw('Red', '#b4141b')];
/** Rogue Adjustable Bench 3.0 (RF0935): 56.5 × 24.75 in base, 17.5 in pad, 52 in overall pad, 1 in gap, 3×3 11-ga. */
export const ROGUE_AB3: AdjustableSpec = {
  L: inch(56.5), W: inch(24.75), top: inch(17.5), gap: inch(1), seatFront: 96,
  seat: { len: 356, w: inch(11), t: 57, r: 22, e: 14 }, back: { len: inch(52) - 356 - inch(1), w: inch(11), t: 57, r: 22, e: 14 }, rail: 38,
  tube: [76, 76], joint: [438, 292], foot: [206, 10], spineEnd: [1318, 124], rearY: 1318, rearTube: [76, 76], rubber: 10,
  wheel: { d: 76, w: 30, y: inch(56.5) - 38, z: 44, x: inch(24.75) / 2 - 62 },
  ladder: { rise: 14 }, backLink: { at: 250, slack: 80 }, seatLink: { at: 250, slack: 20, branch: 0 },
  backAngles: [0, 15, 30, 37.5, 45, 52.5, 60, 67.5, 75, 85], seatAngles: [0, 15, 30],
};
/** Rogue Adjustable Bench 2.0: 2×3 11-ga, 17.5 in pad, 11.25 × 52 in pad, 24.5 in rear legs, 6 back / 2 seat positions. */
export const ROGUE_AB2: AdjustableSpec = {
  ...ROGUE_AB3, L: inch(56), W: inch(24.5), gap: 6, seatFront: 92,
  seat: { len: 350, w: inch(11.25), t: 60, r: 18, e: 12 }, back: { len: inch(52) - 350 - 6, w: inch(11.25), t: 60, r: 18, e: 12 },
  tube: [76, 51], joint: [430, 292], foot: [200, 10], spineEnd: [1300, 118], rearY: 1300, rearTube: [76, 51],
  wheel: { d: 70, w: 28, y: inch(56) - 36, z: 42, x: inch(24.5) / 2 - 60 },
  ladder: { rise: 12 }, backLink: { at: 250, slack: 80 }, seatLink: { at: 260, slack: 20, branch: 0 },
  backAngles: [0, 15, 30, 45, 60, 85], seatAngles: [0, 15],
};
/** Rogue Manta Ray (RF0983): 57 × 24.75 × 17.5 in, 3×4 7-ga, 12 × 52 × 2.25 in pad, 1 in gap, internal ladder. */
export const ROGUE_MANTA: AdjustableSpec = {
  ...ROGUE_AB3, L: inch(57), W: inch(24.75), seatFront: 96,
  seat: { len: 356, w: inch(12), t: 57, r: 22, e: 14 }, back: { len: inch(52) - 356 - inch(1), w: inch(12), t: 57, r: 22, e: 14 },
  tube: [102, 76], joint: [440, 276], foot: [200, 10], spineEnd: [1336, 118], rearY: 1336, rearTube: [76, 76],
  wheel: { d: 80, w: 32, y: inch(57) - 40, z: 46, x: inch(24.75) / 2 - 64 },
  ladder: { rise: -30 }, backLink: { at: 250, slack: 80 }, seatLink: { at: 230, slack: 20, branch: 0 },
  backAngles: [0, 20, 30, 37.5, 45, 52.5, 60, 67.5, 75, 85], seatAngles: [-20, 0, 10, 20, 30],
};
/** Freak Athlete ABX: 51.4 × 25.2 × 17 in, 11.8 in pads, zero gap, fold-down headrest, 11 back / 5 seat angles. */
export const FREAK_ABX: AdjustableSpec = {
  L: inch(51.4), W: inch(25.2), top: inch(17), gap: 8, seatFront: 40,
  seat: { len: 330, w: 300, wEnd: 250, t: 64, r: 20, e: 16 }, back: { len: 640, w: 300, t: 64, r: 22, e: 16 }, rail: 36,
  tube: [76, 51], joint: [420, 268], foot: [170, 10], spineEnd: [1215, 110], rearY: 1215, rearTube: [76, 64], rubber: 8,
  wheel: { d: 64, w: 26, y: inch(51.4) - 32, z: 36, x: inch(25.2) / 2 - 50 },
  ladder: { rise: 26 }, backLink: { at: 250, slack: 80 }, seatLink: { at: 220, slack: 10, branch: 0 },
  backAngles: [0, 15, 22, 30, 37, 45, 52, 60, 67, 75, 85], seatAngles: [0, 10, 20, 30, 40],
};
/** APEX Adjustable Bench (The Tib Bar Guy / APEX Fitness): published spec card, 55 × 27.25 × 17 in, 17 back / 10 seat. */
export const APEX_BENCH: AdjustableSpec = {
  L: inch(55), W: inch(27.25), top: inch(17), gap: inch(1), seatFront: 30,
  seat: { len: inch(13.25), w: inch(12), t: inch(2.25), r: 22, e: 14 }, back: { len: inch(38.5), w: inch(12), t: inch(2.25), r: 22, e: 14 }, rail: 36,
  tube: [76, 76], joint: [360, 258], foot: [150, 10], spineEnd: [1300, 110], rearY: 1300, rearTube: [70, 70], rubber: 10,
  wheel: { d: 76, w: 30, y: inch(55) - 38, z: 42, x: inch(27.25) / 2 - 58 },
  ladder: { rise: 22 }, backLink: { at: 250, slack: 80 }, seatLink: { at: 280, slack: 45, branch: 0 },
  backAngles: [-10, 0, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85], seatAngles: [-20, -15, -10, 0, 5, 10, 15, 20, 25, 30],
};
/** PRIME Fitness Shorty Adjustable Bench: 51 × 27 × 18 in, ~10 in back pad, removable head-rest extension. */
export const PRIME_SHORTY: AdjustableSpec = {
  L: inch(51), W: inch(27), top: inch(18), gap: 12, seatFront: 60,
  seat: { len: 305, w: 300, t: 50, r: 26, e: 14 }, back: { len: 600, w: inch(10), t: 50, r: 30, e: 14 }, rail: 44,
  tube: [76, 51], joint: [400, 300], foot: [196, 10], spineEnd: [1200, 118], rearY: 1200, rearTube: [70, 64], rubber: 12,
  wheel: { d: 76, w: 30, y: inch(51) - 38, z: 42, x: inch(27) / 2 - 64 },
  ladder: { rise: 18 }, backLink: { at: 250, slack: 80 }, seatLink: { at: 190, slack: 20, branch: 0 },
  backAngles: [0, 10, 20, 30, 35, 40, 45, 60, 75, 85], seatAngles: [-10, 0, 10, 20, 30],
};
/** Major Fitness PLT01: 47.8 × 29.2 × 17.7 in, 31.5 in tapered back (11.5 → 9 in), 12 in tapered seat (10.5 → 8.5 in). */
export const MAJOR_PLT01: AdjustableSpec = {
  L: inch(47.8), W: inch(29.2), top: inch(17.7), gap: 14, seatFront: 78,
  seat: { len: inch(12), w: inch(10.5), wEnd: inch(8.5), t: inch(2.5), r: 18, e: 14 }, back: { len: inch(31.5), w: inch(11.5), wEnd: inch(9), t: inch(2.5), r: 20, e: 14 }, rail: 36,
  tube: [64, 51], joint: [430, 270], foot: [150, 8], spineEnd: [1130, 140], rearY: 1110, rearTube: [51, 51], rubber: 10,
  wheel: { d: 58, w: 24, y: inch(47.8) - 29, z: 44, x: 150 },
  ladder: { rise: 20 }, backLink: { at: 250, slack: 60 }, seatLink: { at: 240, slack: 10, branch: 0 },
  backAngles: [-5, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90], seatAngles: [0, 15, 30, 45],
};
/** Titan Elite Series Adjustable FID Bench: 56.75 × 25.25 × 18.25 in, 36 × 11 back, 15 × 15 seat, 2.25 in pads. */
export const TITAN_FID: AdjustableSpec = {
  L: inch(56.75), W: inch(25.25), top: inch(18.25), gap: 22, seatFront: 110,
  seat: { len: inch(15), w: inch(15), wEnd: inch(11), t: inch(2.25), r: 30, e: 14 }, back: { len: inch(36), w: inch(11), t: inch(2.25), r: 22, e: 14 }, rail: 40,
  tube: [76, 76], joint: [330, 300], foot: [330, 10], spineEnd: [1330, 118], rearY: 1330, rearTube: [76, 76], rubber: 10,
  wheel: { d: 70, w: 28, y: inch(56.75) - 35, z: 42, x: inch(25.25) / 2 - 60 },
  ladder: { rise: 20 }, backLink: { at: 250, slack: 80 }, seatLink: { at: 310, slack: 45, branch: 0 },
  backAngles: [0, 15, 30, 45, 60, 85], seatAngles: [0, 5, 10, 15],
};
/** Front leg-hold rollers on the Titan FID post and the Leg Developer / foot-catch attachment geometry (estimates). */
export const TITAN_FID_ROLLERS = { d: 102, len: 170, y: 150, z: [190, 330] as const };
/** Rogue Manta Ray Foot Catch: two roller pairs on an arm off the head end of the back pad (pad-local, from pad end). */
export const MANTA_FOOT_CATCH = { d: 114, len: 165, near: [40, 26] as Pt, far: [250, -150] as Pt };
/** Freak Athlete ABX Leg Developer: own floor base in front of the seat end; thigh + shin rollers, plate horn. */
export const ABX_LEG_DEV = { reach: 470, baseW: 520, roller: 102, rollerLen: 180, pivotZ: 470 };
/** Freak Athlete ABX fold-down headrest (estimate: 10 in pad on a hinged bracket at the head end). */
export const ABX_HEADREST = { len: 240, w: 280, t: 60, gap: 10 };
/** APEX Stryker Pad: 13 × 8.5 × 3 in pad on a telescoping post in the head-end receiver (9 heights, 7 angles). */
export const APEX_STRYKER = { len: inch(13), w: inch(8.5), t: inch(3), post: 380 };
/** PRIME removable head-rest extension and Preacher Curl Pad (elbow pads that clamp over the head end). */
export const PRIME_HEADREST = { len: 250, w: 230, t: 50 };
export const PRIME_PREACHER = { len: 250, w: 580, t: 60, rise: 120 };
/** Flat benches: published pad and base dimensions. */
export interface FlatPad { name: string; len: number; w: number; t: number; color: 'textured' | 'vinyl'; logo?: 'red' }
export const ROGUE_PADS: readonly FlatPad[] = [
  { name: 'Standard Textured Foam (47 × 12 × 2.25 in)', len: inch(47), w: inch(12), t: inch(2.25), color: 'textured' },
  { name: 'Competition Fat Pad (50 × 12.5 × 4.5 in)', len: inch(50), w: inch(12.5), t: inch(4.5), color: 'vinyl', logo: 'red' },
  { name: 'Thompson Fat Pad (50 × 14.5 × 4.5 in)', len: inch(50), w: inch(14.5), t: inch(4.5), color: 'vinyl', logo: 'red' },
];
export const THOMPSON_FAT_PAD = ROGUE_PADS[2];
/** Monster Utility Bench 2.0 frame top (pad underside) for standard / Shorty: 17 / 15 in with the 2.25 in pad. */
export const MUB_FRAME = { L: inch(47.375), W: inch(26.25), padBottom: [inch(17 - 2.25), inch(15 - 2.25)] as const };
export const FUB_FRAME = { L: inch(47), W: inch(14), padBottom: inch(18 - 2.5), pad: { len: inch(46), w: inch(12), t: inch(2.5) } };
export const TITAN_SPFB = { L: inch(50), W: inch(26), top: inch(17), pad: { len: inch(50), w: inch(14), t: inch(4) } };
export const TITAN_SEATED = { D: inch(43), W: inch(30), H: inch(37), seatTop: inch(18), seat: { len: inch(11.5), w: inch(11.25), t: 64 }, back: { len: inch(19), w: inch(11.25), t: 64 }, recline: 12 };
/** Ironmaster Super Bench PRO V2: 47 in long, 12.5 / 21 in feet, 17.2 in flat, 44 × 12.25/10.25 × 2.5 in pad. */
export const IRONMASTER_ANGLES = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 85] as const;
export interface IronmasterSpec {
  L: number; seatFootW: number; headFootW: number; top: number; padLen: number; padW: number; padNarrowW: number; padT: number;
  narrowLen: number; taperLen: number; pivot: Pt; post: number; padEnd: number; ringR: [number, number]; seatZ: readonly number[];
  /** frame end faces (foot caps) along local y */ frame: Pt;
}
export const IRONMASTER_PRO: IronmasterSpec = {
  L: inch(47), seatFootW: inch(12.5), headFootW: inch(21), top: inch(17.2), padLen: inch(44), padW: inch(12.25), padNarrowW: inch(10.25), padT: inch(2.5),
  narrowLen: 300, taperLen: 90, pivot: [340, 360], post: 372, padEnd: 1194, ringR: [168, 214], seatZ: [inch(12.5), inch(14.5), inch(23.5)], frame: [0, inch(47)],
};
/** Original Super Bench: 44 × 18.75 × 20 in (flat), 41 in frame, 44 × 10 × 3 in pad, equal 18.75 in feet. */
export const IRONMASTER_SB: IronmasterSpec = {
  L: inch(44), seatFootW: inch(18.75), headFootW: inch(18.75), top: inch(20), padLen: inch(44), padW: inch(10), padNarrowW: inch(10), padT: inch(3),
  narrowLen: 0, taperLen: 0, pivot: [300, 408], post: 332, padEnd: inch(44), ringR: [215, 262], seatZ: [inch(12), inch(14), inch(16)], frame: [inch(1.5), inch(42.5)],
};
/** Ironmaster attachments in the head-end receiver (all move with the pad). */
export const IRONMASTER_ATTACHMENTS = ['None', 'Crunch Situp', 'Leg Attachment PRO', 'Preacher Curl Pad', 'Bar Dip Handle', 'Seated Press Pad'] as const;
/** The Leg Attachment PRO is only used at the 10° (third notch) setting, with its support foot on the floor. */
export const LEG_PRO_ANGLE = 10;
/** Round-tube polyline (sphere-jointed, so its extent is exactly each vertex ± d/2), roller pair on a shaft along X,
 * and an upholstered block rounded on every edge (extent: inset corners ± e). All in a pad-attached (y, z) frame. */
export type V3 = [number, number, number];
export interface TubeRun { pts: V3[]; d: number; finish: 'frame' | 'chrome' | 'grip' }
export interface RollerPair { y: number; z: number; d: number; len: number; gap: number }
export interface BlockPad { c: Pt; len: number; t: number; w: number; wEnd?: number; tilt: number; e: number }
export interface AttachmentGeom { tubes: TubeRun[]; rollers: RollerPair[]; pads: BlockPad[] }
export const blockCorners = (b: BlockPad): Pt[] => {
  const hl = b.len / 2 - b.e, ht = b.t / 2 - b.e;
  return [[-hl, -ht], [hl, -ht], [hl, ht], [-hl, ht]].map(([y, z]) => rotYZ([b.c[0] + y, b.c[1] + z], b.tilt, b.c));
};
/** Y extent of attachment geometry after rotating the pad frame by `angle` about `pivot`. */
export function geomExtentY(g: AttachmentGeom, angle: number, pivot: Pt): [number, number] {
  let lo = Infinity, hi = -Infinity;
  const take = (p: Pt, r: number) => { const q = rotYZ(p, angle, pivot); lo = Math.min(lo, q[0] - r); hi = Math.max(hi, q[0] + r); };
  for (const t of g.tubes) for (const p of t.pts) take([p[1], p[2]], t.d / 2);
  for (const r of g.rollers) take([r.y, r.z], r.d / 2);
  for (const b of g.pads) for (const c of blockCorners(b)) take(c, b.e);
  return [lo, hi];
}
/** Half-width (|x|) of attachment geometry: rotation about X never changes it. Roller shafts end 12 mm past the pads. */
export function geomHalfX(g: AttachmentGeom): number {
  let x = 0;
  for (const t of g.tubes) for (const p of t.pts) x = Math.max(x, Math.abs(p[0]) + t.d / 2);
  for (const r of g.rollers) x = Math.max(x, r.gap + r.len + 12);
  for (const b of g.pads) x = Math.max(x, Math.max(b.w, b.wEnd ?? b.w) / 2);
  return x;
}
/** Pad profile (rounded top edges `e`, square bottom) rotated about `pivot`: exact Y extent. */
export function padProfileY(y0: number, y1: number, z0: number, z1: number, e: number, angle: number, pivot: Pt): [number, number] {
  const pts: [Pt, number][] = [[[y0, z0], 0], [[y1, z0], 0], [[y0 + e, z1 - e], e], [[y1 - e, z1 - e], e]];
  let lo = Infinity, hi = -Infinity;
  for (const [p, r] of pts) { const q = rotYZ(p, angle, pivot); lo = Math.min(lo, q[0] - r); hi = Math.max(hi, q[0] + r); }
  return [lo, hi];
}
export function ironmasterLayout(s: IronmasterSpec) {
  const E = s.padEnd, padB = s.top - s.padT, frameH = 51, zc = padB - frameH / 2, seatEnd = E - s.padLen;
  const receivers = s === IRONMASTER_PRO ? [seatEnd + 74, seatEnd + 139, s.post + 110] : [seatEnd + 70, seatEnd + 135, seatEnd + 200];
  const halfW = (y: number) => {
    if (!s.narrowLen) return s.padW / 2;
    const t = Math.min(1, Math.max(0, (y - seatEnd - s.narrowLen) / s.taperLen));
    return (s.padNarrowW + (s.padW - s.padNarrowW) * t) / 2;
  };
  return { E, padB, frameH, zc, seatEnd, receivers, halfW };
}
/** Incline seat: 9.5 in long, 9.25 → 5.25 in wide trapezoid on a C-tube that plugs into a side receiver. */
export function ironmasterSeat(s: IronmasterSpec, receiver: number): AttachmentGeom {
  const l = ironmasterLayout(s), yr = l.receivers[receiver - 1], x = l.halfW(yr) + 24, len = inch(9.5), t = 76;
  return {
    tubes: [{ pts: [[60, yr, l.zc - 50], [x, yr, l.zc - 50], [x, yr - 14, s.top + 110], [0, yr - 14, s.top + 110]], d: 38, finish: 'frame' }],
    rollers: [], pads: [{ c: [yr + 12 + t / 2, s.top + 4 + len / 2], len, t, w: inch(9.25), wEnd: inch(5.25), tilt: 90, e: 14 }],
  };
}
/** Ironmaster attachments in the head-end receiver, in the pad frame (Leg Attachment PRO is posed for the required 10°). */
export function ironmasterAttachment(s: IronmasterSpec, which: number): AttachmentGeom {
  const { E, zc } = ironmasterLayout(s), Zt = s.top, stub: V3[] = [[0, E - 160, zc], [0, E + 60, zc]];
  switch (IRONMASTER_ATTACHMENTS[which]) {
    case 'Crunch Situp': return {
      tubes: [{ pts: [[0, E - 160, zc], [0, E + 100, zc], [0, E + 185, zc + 70], [0, E + 205, zc + 210], [0, E + 160, zc + 330], [0, E + 50, zc + 380], [0, E - 30, zc + 376]], d: 44, finish: 'frame' },
        { pts: [[0, E + 40, zc + 380], [0, E + 26, zc + 560]], d: 32, finish: 'grip' }],
      rollers: [{ y: E + 150, z: zc + 44, d: 100, len: 150, gap: 28 }, { y: E + 100, z: zc + 357, d: 127, len: 165, gap: 28 }], pads: [],
    };
    case 'Leg Attachment PRO': {
      // Posed in the world at the required 10° incline (support foot on the floor), then mapped back into the pad frame.
      const W = (y: number, z: number): V3 => { const q = rotYZ([y, z], -LEG_PRO_ANGLE, s.pivot); return [0, q[0], q[1]]; };
      const R = rotYZ([E + 60, zc], LEG_PRO_ANGLE, s.pivot), K = rotYZ([E + 30, Zt + 34], LEG_PRO_ANGLE, s.pivot);
      const toPad = (q: V3): RollerPair => ({ y: q[1], z: q[2], d: 102, len: inch(7), gap: 30 });
      return {
        tubes: [{ pts: [...stub, W(R[0] + 45, R[1] - 50), W(R[0] + 120, 70), W(R[0] + 135, 30)], d: 50, finish: 'frame' },
          { pts: [W(R[0] + 70, 30), W(R[0] + 330, 30)], d: 44, finish: 'frame' },
          { pts: [W(R[0] + 300, 12), W(R[0] + 340, 12)], d: 24, finish: 'grip' },
          { pts: [W(R[0] + 20, R[1] - 20), W(K[0], K[1])], d: 40, finish: 'frame' },
          { pts: [W(K[0] - 95, K[1] + 58), W(K[0], K[1]), W(K[0] + 45, 190)], d: 44, finish: 'frame' },
          { pts: [W(K[0], K[1]), W(K[0] + 120, K[1] + 120), W(K[0] + 235, K[1] + 165)], d: 44, finish: 'frame' },
          { pts: [W(K[0] + 28, K[1] - 150), W(K[0] + 300, K[1] - 150)], d: 25, finish: 'chrome' },
          { pts: [W(K[0] + 90, K[1] - 150), W(K[0] + 90 + inch(12.5), K[1] - 150)], d: 50, finish: 'chrome' }],
        rollers: [toPad(W(K[0] - 95, K[1] + 58)), toPad(W(K[0] + 45, 190)), toPad(W(K[0] + 235, K[1] + 165))],
        pads: [],
      };
    }
    case 'Preacher Curl Pad': return {
      tubes: [{ pts: [...stub, [0, E + 60, Zt + 230], [0, E + 104, Zt + 296]], d: 46, finish: 'chrome' },
        { pts: [[-70, E + 30, Zt + 210], [-70, E + 10, Zt + 230], [-70, E + 16, Zt + 262]], d: 14, finish: 'chrome' },
        { pts: [[70, E + 30, Zt + 210], [70, E + 10, Zt + 230], [70, E + 16, Zt + 262]], d: 14, finish: 'chrome' }],
      rollers: [], pads: [{ c: [E + 130, Zt + 330], len: inch(12), t: inch(2), w: inch(24), tilt: -45, e: 22 }],
    };
    case 'Bar Dip Handle': {
      const y = E + 120, z = zc + 40, a = inch(20) / 2, b = inch(25) / 2, arm = inch(9.5);
      return {
        tubes: [{ pts: [...stub, [0, y, zc], [0, y, z]], d: 44, finish: 'frame' },
          { pts: [[-b, y, z + arm], [-a, y, z], [a, y, z], [b, y, z + arm]], d: 38, finish: 'frame' },
          { pts: [[-a - (b - a) * .15, y, z + arm * .15], [-b, y, z + arm]], d: 50, finish: 'grip' }, { pts: [[a + (b - a) * .15, y, z + arm * .15], [b, y, z + arm]], d: 50, finish: 'grip' }],
        rollers: [], pads: [],
      };
    }
    case 'Seated Press Pad': return {
      tubes: [{ pts: [...stub, [0, E + 90, Zt + 110], [0, E + 40, Zt + 420], [0, E - 150, Zt + 440]], d: 44, finish: 'frame' }],
      rollers: [], pads: [{ c: [E - inch(10) + inch(3) / 2, Zt + inch(3) + inch(18) / 2], len: inch(18), t: inch(3), w: inch(10.5), tilt: 85, e: 16 }],
    };
    default: return { tubes: [], rollers: [], pads: [] };
  }
}
/** Ironmaster footprint depth range (local y) for a setting: frame [0, L] plus pad, seat and attachment sweeps. */
export function ironmasterExtentY(s: IronmasterSpec, p: Record<string, number>): [number, number] {
  const l = ironmasterLayout(s), a = p.backrestAngle;
  let [lo, hi] = padProfileY(l.seatEnd, l.E, l.padB, s.top, 14, a, s.pivot);
  lo = Math.min(s.frame[0], lo); hi = Math.max(s.frame[1], hi);
  for (const g of [p.inclineSeat ? ironmasterSeat(s, p.inclineSeat) : undefined, p.attachment ? ironmasterAttachment(s, p.attachment) : undefined]) {
    if (!g) continue; const [a0, a1] = geomExtentY(g, a, s.pivot); lo = Math.min(lo, a0); hi = Math.max(hi, a1);
  }
  return [lo, hi];
}
/** Adjustable-bench footprint depth range: frame [0, L] plus attachment sweeps. */
export function adjustableExtentY(kind: string, s: AdjustableSpec, p: Record<string, number>): [number, number] {
  const l = adjustableLayout(s), a = p.backAngle;
  let lo = 0, hi = Math.max(s.L, padProfileY(l.backFront, l.backEnd, s.top - s.back.t, s.top, s.back.e, a, l.pivot)[1]);
  if (kind === 'rogue-manta' && p.footCatch) {
    const R = MANTA_FOOT_CATCH, g: AttachmentGeom = { tubes: [], pads: [], rollers: [R.near, R.far].map(q => ({ y: l.backEnd + q[0], z: s.top + q[1], d: R.d, len: R.len, gap: 30 })) };
    hi = Math.max(hi, geomExtentY(g, a, l.pivot)[1]);
  }
  if (kind === 'abx' && p.legDeveloper) lo = Math.min(lo, -ABX_LEG_DEV.reach);
  if (kind === 'apex' && p.stryker) hi = Math.max(hi, s.L + 60 + APEX_STRYKER.len / 2);
  if (kind === 'prime' && p.headEnd === 0) { const h0 = l.backEnd + 12; hi = Math.max(hi, padProfileY(h0, h0 + PRIME_HEADREST.len, s.top - PRIME_HEADREST.t, s.top, 14, a, l.pivot)[1]); }
  if (kind === 'prime' && p.headEnd === 2) { const y0 = l.backEnd + 20; hi = Math.max(hi, padProfileY(y0, y0 + PRIME_PREACHER.len, s.top + PRIME_PREACHER.rise, s.top + PRIME_PREACHER.rise + PRIME_PREACHER.t, 16, a, l.pivot)[1]); }
  return [lo, hi];
}
