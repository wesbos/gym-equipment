/** Bikes, treadmills and other cardio machines. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 *
 * Every machine is built with its FRONT (console / handlebar end) at -Y and the user facing it. Side-profile numbers are
 * "s" mm back from the front extreme and "h" mm up from the floor. The published length × width is the footprint of the
 * in-use pose; a folded treadmill's footprint comes from the same deck profile, hinge and fold angle the builder uses,
 * so the two cannot drift. Sources, measured photo proportions and estimates: ../research/cardio.md. */
import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
export const inch = (v: number) => Math.round(v * 25.4 * 10) / 10;
type Vec2 = [number, number];

// ------------------------------------------------------------------------------------------------ treadmills
export type TreadFrame = 'post' | 'z';
export type TreadConsole = 'sole' | 'horizon' | 'nt' | 'nt65' | 'proform' | 'peloton';
export interface TreadmillSpec {
  /** Published assembled length, width, height (mm). */ L: number; W: number; H: number;
  /** Belt top above the floor (published step-up where given). */ stepUp: number;
  /** Running belt width × length. */ belt: Vec2;
  /** Deck: outer width, front end s, frame bottom h, foot-rail top h, rear end-cap radius (side profile). */
  deck: { w: number; front: number; bottom: number; rail: number; cap: number; /** Rounded nose (deck is the whole base) */ nose?: number };
  /** Motor hood: s range, top h, width. */ hood: { s0: number; s1: number; h: number; w: number };
  /** Base / incline frame under the front of the deck: rear end s (the folded stand), outer width, rail height. */
  base: { rear: number; w: number; h: number };
  frame: TreadFrame;
  /** Uprights: foot (s0, h0) → top (s1, h1); side depth × thickness across; centre |x|. Z frames add the top arm's front end. */
  upright: { s0: number; h0: number; s1: number; h1: number; depth: number; thick: number; x: number; arm?: Vec2 };
  console: TreadConsole;
  /** Display (glass) and its housing: housing w × h × t, glass w × h, front-face centre s, top edge h, tilt from vertical (top toward the front). */
  display: { w: number; h: number; t: number; glass: Vec2; s: number; top: number; tilt: number };
  /** Folding deck: hinge (s, h) and the published folded length and height. */
  fold?: { s: number; h: number; L: number; H: number };
  colors: { frame: string; accent: string; trim: string };
  brand: string;
}
/** Deck side profile ([s, h] loop, counter-clockwise): square-ish front, big rounded rear end cap, flat bottom. */
export function treadDeckProfile(t: TreadmillSpec): Vec2[] {
  const { front, bottom, rail, cap, nose } = t.deck, rear = t.L, r = Math.min(cap, (rail - bottom) / 2 - .5), pts: Vec2[] = [];
  const n = nose ? Math.min(nose, (rail - bottom) / 2 - .5) : 0;
  if (n) for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 16; pts.push([front + n + n * Math.cos(a), bottom + n + n * Math.sin(a)]); } else pts.push([front, bottom]);
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 16; pts.push([rear - r + r * Math.cos(a), bottom + r + r * Math.sin(a)]); }
  for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 16; pts.push([rear - r + r * Math.cos(a), rail - r + r * Math.sin(a)]); }
  if (n) for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + i * Math.PI / 16; pts.push([front + n + n * Math.cos(a), rail - n + n * Math.sin(a)]); } else pts.push([front, rail]);
  return pts;
}
/** Rear levelling feet under the deck ([s0, s1] × [0, bottom]); they fold up with it. */
export const treadRearFeet = (t: TreadmillSpec): Vec2[] => [[t.L - 260, 0], [t.L - 170, 0], [t.L - 170, t.deck.bottom], [t.L - 260, t.deck.bottom]];
const rotAbout = ([s, h]: Vec2, [cs, ch]: Vec2, deg: number): Vec2 => {
  const a = deg * Math.PI / 180, vs = s - cs, vh = h - ch;
  return [cs + vs * Math.cos(a) - vh * Math.sin(a), ch + vs * Math.sin(a) + vh * Math.cos(a)];
};
/** Everything that folds with the deck, as side-profile points. */
const foldingPoints = (t: TreadmillSpec) => [...treadDeckProfile(t), ...treadRearFeet(t)];
/** Fold angle (degrees, rear end up) that brings the folded deck to the published folded height. */
export function treadFoldAngle(t: TreadmillSpec): number {
  if (!t.fold) return 0;
  const f = t.fold, top = (deg: number) => Math.max(...foldingPoints(t).map(p => rotAbout(p, [f.s, f.h], deg)[1]));
  let lo = 55, hi = 88;
  if (top(hi) < f.H) return hi;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (top(mid) < f.H) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** Folded side profile points of the deck assembly (for the envelope and tests). */
export const treadFolded = (t: TreadmillSpec): Vec2[] => t.fold ? foldingPoints(t).map(p => rotAbout(p, [t.fold!.s, t.fold!.h], treadFoldAngle(t))) : [];
/** Footprint: published L × W in use; folded, the base stand (or the raised deck, whichever reaches further back) × W. */
export function treadFootprint(t: TreadmillSpec, folded: boolean): FloorBox {
  if (!folded || !t.fold) return { width: t.W, depth: t.L };
  const rear = Math.max(t.base.rear, t.upright.s1, ...treadFolded(t).map(p => p[0]));
  return { width: t.W, depth: rear };
}

/** Sole F63 (2026 refresh): 75 × 34 × 52 in, folded 42 × 34 × 71 in, 20 × 60 in belt. */
export const SOLE_F63_SPEC: TreadmillSpec = {
  L: inch(75), W: inch(34), H: inch(52), stepUp: 222, belt: [inch(20), inch(60)],
  deck: { w: 720, front: 300, bottom: 58, rail: 228, cap: 64 }, hood: { s0: 12, s1: 400, h: 392, w: 700 },
  base: { rear: inch(42), w: 700, h: 58 }, frame: 'post',
  upright: { s0: 175, h0: 40, s1: 575, h1: 1060, depth: 88, thick: 56, x: 392 }, console: 'sole',
  display: { w: 300, h: 215, t: 28, glass: [270, 180], s: 105, top: inch(52), tilt: 26 },
  fold: { s: 330, h: 215, L: inch(42), H: inch(71) },
  colors: { frame: '#1b1c1e', accent: '#c41e2a', trim: '#2c2e31' }, brand: 'SOLE',
};
/** Horizon 7.0 AT: 76 × 35 × 67 in, folded 44 × 35 × 68 in, 20 × 60 in deck, 8 5/8 in step-up. */
export const HORIZON_70AT_SPEC: TreadmillSpec = {
  L: inch(76), W: inch(35), H: inch(67), stepUp: inch(8.625), belt: [inch(20), inch(60)],
  deck: { w: 740, front: 330, bottom: 70, rail: 226, cap: 60 }, hood: { s0: 20, s1: 480, h: 322, w: 720 },
  base: { rear: inch(44), w: 720, h: 62 }, frame: 'post',
  upright: { s0: 150, h0: 30, s1: 560, h1: 1110, depth: 95, thick: 60, x: 395 }, console: 'horizon',
  display: { w: 250, h: 170, t: 24, glass: [220, 150], s: 70, top: inch(67), tilt: 22 },
  fold: { s: 360, h: 160, L: inch(44), H: inch(68) },
  colors: { frame: '#1a1b1d', accent: '#1f6fd1', trim: '#2b2d30' }, brand: 'HORIZON',
};
/** NordicTrack Commercial 1750 (2024 Z frame): 77.3 × 37 × 59.5 in, folded 44.2 × 37 × 69 in, 22 × 60 in belt, 10 in step-up. */
export const NT_1750_SPEC: TreadmillSpec = {
  L: inch(77.3), W: inch(37), H: inch(59.5), stepUp: 254, belt: [inch(22), inch(60)],
  deck: { w: 800, front: 210, bottom: 88, rail: 262, cap: 70 }, hood: { s0: 125, s1: 330, h: 345, w: 780 },
  base: { rear: inch(44.2), w: 760, h: 70 }, frame: 'z',
  upright: { s0: 55, h0: 20, s1: 915, h1: 1095, depth: 92, thick: 64, x: 438, arm: [250, 1122] }, console: 'nt',
  display: { w: 405, h: 330, t: 42, glass: [352, 200], s: 300, top: inch(59.5), tilt: 8 },
  fold: { s: 300, h: 170, L: inch(44.2), H: inch(69) },
  colors: { frame: '#18191b', accent: '#e0301e', trim: '#26282b' }, brand: 'NordicTrack',
};
/** NordicTrack Commercial 1250: same frame as the 1750 with the 10 in tilting touchscreen. */
export const NT_1250_SPEC: TreadmillSpec = { ...NT_1750_SPEC, display: { w: 262, h: 330, t: 40, glass: [220, 138], s: 300, top: inch(59.5), tilt: 8 } };
/** NordicTrack T Series 10: 75.1 × 34.3 × 58.4 in, folded 41 × 34.3 × 68.3 in, 20 × 60 in belt, 8.3 in step-up. */
export const NT_T10_SPEC: TreadmillSpec = {
  L: inch(75.1), W: inch(34.3), H: inch(58.4), stepUp: inch(8.3), belt: [inch(20), inch(60)],
  deck: { w: 740, front: 200, bottom: 72, rail: 219, cap: 62 }, hood: { s0: 120, s1: 320, h: 305, w: 720 },
  base: { rear: inch(41), w: 700, h: 60 }, frame: 'z',
  upright: { s0: 55, h0: 20, s1: 880, h1: 1075, depth: 84, thick: 58, x: 405, arm: [245, 1100] }, console: 'nt',
  display: { w: 262, h: 330, t: 40, glass: [220, 138], s: 290, top: inch(58.4), tilt: 8 },
  fold: { s: 290, h: 150, L: inch(41), H: inch(68.3) },
  colors: { frame: '#18191b', accent: '#e0301e', trim: '#26282b' }, brand: 'NordicTrack',
};
/** NordicTrack T 6.5 S (NTL17915, 2016–2022): 73.5 × 36 × 54 in, folded 38 in long × 66 in high, 20 × 55 in belt, 5 in display. */
export const NT_T65S_SPEC: TreadmillSpec = {
  L: inch(73.5), W: inch(36), H: inch(54), stepUp: 225, belt: [inch(20), inch(55)],
  deck: { w: 730, front: 300, bottom: 70, rail: 232, cap: 58 }, hood: { s0: 30, s1: 400, h: 330, w: 700 },
  base: { rear: inch(38), w: 700, h: 58 }, frame: 'post',
  upright: { s0: 120, h0: 40, s1: 330, h1: 990, depth: 74, thick: 50, x: 380 }, console: 'nt65',
  display: { w: 150, h: 115, t: 10, glass: [120, 90], s: 230, top: 1290, tilt: 32 },
  fold: { s: 330, h: 150, L: inch(38), H: inch(66) },
  colors: { frame: '#9ea3a8', accent: '#e8751a', trim: '#2a2c2f' }, brand: 'NordicTrack',
};
/** ProForm Pro 2000 (PFTL13113): 80 × 39.5 × 63 in, 22 × 60 in belt, SpaceSaver fold. */
export const PROFORM_PRO2000_SPEC: TreadmillSpec = {
  L: inch(80), W: inch(39.5), H: inch(63), stepUp: 250, belt: [inch(22), inch(60)],
  deck: { w: 800, front: 310, bottom: 82, rail: 256, cap: 64 }, hood: { s0: 60, s1: 470, h: 390, w: 760 },
  base: { rear: inch(42), w: 760, h: 64 }, frame: 'post',
  upright: { s0: 170, h0: 60, s1: 360, h1: 1030, depth: 100, thick: 56, x: 415 }, console: 'proform',
  display: { w: 245, h: 180, t: 18, glass: [215, 150], s: 110, top: inch(63), tilt: 20 },
  fold: { s: 360, h: 170, L: inch(42), H: inch(72) },
  colors: { frame: '#a6aaae', accent: '#d8262c', trim: '#2a2c2f' }, brand: 'PRO-FORM',
};
/** Peloton Tread (TR02, non-folding): 68 × 33 × 62 in, 59 × 20 in belt, 23.8 in HD touchscreen. */
export const PELOTON_TREAD_SPEC: TreadmillSpec = {
  L: inch(68), W: inch(33), H: inch(62), stepUp: 222, belt: [inch(20), inch(59)],
  deck: { w: 700, front: 0, bottom: 75, rail: 222, cap: 72, nose: 60 }, hood: { s0: 0, s1: 0, h: 0, w: 0 },
  base: { rear: 0, w: 0, h: 0 }, frame: 'z',
  upright: { s0: 150, h0: 200, s1: 620, h1: 1150, depth: 66, thick: 66, x: 360, arm: [30, 1168] }, console: 'peloton',
  display: { w: 594, h: 356, t: 36, glass: [527, 297], s: 150, top: inch(62), tilt: 4 },
  colors: { frame: '#1c1d1f', accent: '#df1f26', trim: '#2a2b2e' }, brand: 'PELOTON',
};

// ------------------------------------------------------------------------------------------------ bikes, runners, climbers
/** Published assembled envelopes (mm). */
export const PELOTON_BIKE = { L: inch(59), W: inch(23), H: inch(53) } as const;
export const PELOTON_BIKE_PLUS = { L: inch(59), W: inch(22), H: inch(59) } as const;
export const SCHWINN_IC4 = { L: inch(48.7), W: inch(21.2), H: inch(51.8) } as const;
export const SUNNY_B1002 = { L: inch(53.94), W: inch(19.1), H: inch(44.49) } as const;
export const ASSAULTRUNNER_PRO = { L: inch(69.7), W: inch(33.1), H: inch(64), belt: [inch(17), inch(62)] } as const;
export const ASSAULTRUNNER_ELITE = { L: inch(69.9), W: inch(31.7), H: inch(64.4), belt: [inch(17), inch(62)] } as const;
export const MAX_TRAINER_M6 = { L: inch(46), W: inch(26), H: inch(64.2) } as const;
/** WaterRower (all woods): 209 × 56 × 53 cm, 30 cm seat; stored upright on its front wheels. */
export const WATERROWER = { L: 2090, W: 560, H: 530, seat: 300 } as const;
export const STAIRMASTER_8GX = { L: inch(58), W: inch(34), H: inch(79), step: inch(9) } as const;
export const SOLE_E35 = { L: inch(70), W: inch(31), H: inch(70) } as const;

// ------------------------------------------------------------------------------------------------ catalog entries
const folded = { key: 'pose', label: 'Deck', default: 0, options: [0, 1], format: (v: number) => ['Down · in use', 'Folded up'][v] ?? String(v) };
/** Manufacturer use area around the machine (mm): side clearance and space behind the user (+Y = floor -Z). */
const useArea = (fp: FloorBox, side: number, front: number, rear: number): FloorBox =>
  ({ width: fp.width + 2 * side, depth: fp.depth + front + rear, offset: [0, (front - rear) / 2] });
const treadClear = (t: TreadmillSpec, side: number, rear: number) => (p: NumericParams) => p.pose ? treadFootprint(t, true) : useArea(treadFootprint(t, false), side, 0, rear);
const tail = (brand: string) => `Independent reconstruction from published dimensions and product photos; ${brand} trademarks belong to ${brand}.`;
const reconstruction = (what: string) => `Independent Manifold reconstruction from the published ${what} and product photos (side profiles measured against the published length). Internal mechanisms, tube sections and fastener positions estimated; scenery only, excluded from print export.`;

export const PELOTON_BIKE_PART = defineFloorPart({
  id: 'peloton-bike', name: 'Peloton Bike', title: 'Peloton Bike', noun: 'bike', section: 'Cardio',
  description: `Peloton Bike (original series): matte black carbon-steel frame, front flywheel, red resistance knob and 21.5 in HD touchscreen on its tilting post. ${tail('Peloton')}`,
  params: [], footprint: { width: PELOTON_BIKE.W, depth: PELOTON_BIKE.L }, clearance: useArea({ width: PELOTON_BIKE.W, depth: PELOTON_BIKE.L }, 610, 610, 610),
  placement: { side: 'left', gap: 700 },
  vendor: { vendor: 'Peloton', url: 'https://www.onepeloton.com/bikes/compare', credit: 'Peloton — Bike (original series)', trademark: 'Peloton and Peloton Bike are trademarks of Peloton Interactive, Inc.', reconstruction: reconstruction('59 × 23 × 53 in envelope, 21.5 in screen, 170 mm cranks') },
});
export const PELOTON_BIKE_PLUS_PART = defineFloorPart({
  id: 'peloton-bike-plus', name: 'Peloton Bike+', title: 'Peloton Bike+', noun: 'bike', section: 'Cardio',
  description: `Peloton Bike+ (original series): graphite frame, front flywheel and 23.8 in rotating HD touchscreen on its swivel arm. ${tail('Peloton')}`,
  params: [], footprint: { width: PELOTON_BIKE_PLUS.W, depth: PELOTON_BIKE_PLUS.L }, clearance: useArea({ width: PELOTON_BIKE_PLUS.W, depth: PELOTON_BIKE_PLUS.L }, 610, 610, 610),
  placement: { side: 'left', gap: 700 },
  vendor: { vendor: 'Peloton', url: 'https://www.onepeloton.com/bikes/compare', credit: 'Peloton — Bike+ (original series)', trademark: 'Peloton and Peloton Bike+ are trademarks of Peloton Interactive, Inc.', reconstruction: reconstruction('59 × 22 × 59 in envelope, 23.8 in screen, 170 mm cranks') },
});
export const SCHWINN_IC4_PART = defineFloorPart({
  id: 'schwinn-ic4', name: 'Schwinn IC4', title: 'Schwinn IC4 indoor cycling bike', noun: 'bike', section: 'Cardio',
  description: `Schwinn IC4 indoor cycling bike: charcoal frame, 40 lb front flywheel with red-ringed guard, red saddle, 3 lb dumbbell cradles and backlit LCD with media shelf. ${tail('Schwinn / BowFlex')}`,
  params: [], footprint: { width: SCHWINN_IC4.W, depth: SCHWINN_IC4.L }, clearance: useArea({ width: SCHWINN_IC4.W, depth: SCHWINN_IC4.L }, 610, 610, 610),
  placement: { side: 'left', gap: 700 },
  vendor: { vendor: 'Schwinn Fitness (BowFlex Inc.)', url: 'https://www.schwinnfitness.com/products/schwinn-ic4-indoor-cycling-bike', credit: 'Schwinn Fitness — IC4 Indoor Cycling Bike', trademark: 'Schwinn and IC4 are trademarks of their respective owners; BowFlex and JRNY are trademarks of BowFlex Inc.', reconstruction: reconstruction('48.7 × 21.2 × 51.8 in envelope and the identical BowFlex C6 side profile') },
});
export const SUNNY_B1002_PART = defineFloorPart({
  id: 'sunny-sf-b1002', name: 'Sunny SF-B1002', title: 'Sunny Health & Fitness SF-B1002 indoor cycling bike', noun: 'bike', section: 'Cardio',
  description: `Sunny Health & Fitness SF-B1002 belt-drive indoor cycling bike: black frame, 49 lb chrome flywheel with red face, grey crank cover, chrome posts and red transport wheels. ${tail('Sunny Health & Fitness')}`,
  params: [], footprint: { width: SUNNY_B1002.W, depth: SUNNY_B1002.L }, clearance: useArea({ width: SUNNY_B1002.W, depth: SUNNY_B1002.L }, 610, 610, 610),
  placement: { side: 'left', gap: 700 },
  vendor: { vendor: 'Sunny Health & Fitness', url: 'https://sunnyhealthfitness.com/products/sunny-health-and-fitness-sf-b1002-belt-drive-indoor-cycling-bike', credit: 'Sunny Health & Fitness — SF-B1002 Belt Drive Indoor Cycling Bike', trademark: 'Sunny Health & Fitness is a trademark of Sunny Distributor Inc.', reconstruction: reconstruction('53.94 × 19.1 × 44.49 in envelope') },
});
const treadPart = <const Id extends string>(id: Id, t: TreadmillSpec, o: { name: string; title: string; description: string; vendor: { vendor: string; url: string; credit: string; trademark: string }; what: string; side?: number; rear?: number }) => defineFloorPart({
  id, name: o.name, title: o.title, noun: 'treadmill', section: 'Cardio', description: o.description,
  params: t.fold ? [folded] : [],
  footprint: p => treadFootprint(t, !!p.pose), clearance: treadClear(t, o.side ?? 610, o.rear ?? 2000),
  placement: { side: 'left', gap: 800 },
  vendor: { ...o.vendor, reconstruction: reconstruction(o.what) },
});
export const SOLE_F63 = treadPart('sole-f63', SOLE_F63_SPEC, {
  name: 'Sole F63', title: 'Sole F63 folding treadmill',
  description: `Sole F63 folding treadmill (2026): 3.0 HP brushless motor hood, 20 × 60 in CushionFlex deck with red end caps, slanted uprights, white LED console with speed dial and tablet cradle; the deck folds up on its hydraulic assist. ${tail('Sole Fitness')}`,
  vendor: { vendor: 'Sole Fitness', url: 'https://www.soletreadmills.com/products/sole-f63', credit: 'Sole Fitness — F63 Treadmill', trademark: 'SOLE, F63 and CushionFlex are trademarks of Sole Fitness.' },
  what: '75 × 34 × 52 in envelope, 42 × 34 × 71 in folded size, 20 × 60 in running surface',
});
export const HORIZON_70AT = treadPart('horizon-7-0-at', HORIZON_70AT_SPEC, {
  name: 'Horizon 7.0 AT', title: 'Horizon 7.0 AT folding treadmill',
  description: `Horizon 7.0 AT folding treadmill: curved uprights, 7.25 in LCD console with QuickDial speed and incline dials, speaker wings and tablet holder, blue-accented 20 × 60 in Variable Response deck. ${tail('Horizon Fitness')}`,
  vendor: { vendor: 'Horizon Fitness (Johnson Health Tech)', url: 'https://www.horizonfitness.com/products/horizon-7-0-at-treadmill', credit: 'Horizon Fitness — 7.0 AT Treadmill', trademark: 'Horizon Fitness, QuickDial and RapidSync are trademarks of Johnson Health Tech.' },
  what: '76 × 35 × 67 in envelope, 44 × 35 × 68 in folded size, 8 5/8 in step-up',
});
export const NT_1750 = treadPart('nordictrack-commercial-1750', NT_1750_SPEC, {
  name: 'NordicTrack Commercial 1750', title: 'NordicTrack Commercial 1750 treadmill',
  description: `NordicTrack Commercial 1750 (2024 Z frame): diagonal uprights with a forward console arm, 16 in pivoting touchscreen over a fabric speaker bar, 22 × 60 in RunFlex deck and SpaceSaver fold. ${tail('iFIT (NordicTrack)')}`,
  vendor: { vendor: 'NordicTrack (iFIT)', url: 'https://www.nordictrack.com/treadmills/commercial-1750-treadmill', credit: 'NordicTrack — Commercial 1750 Treadmill', trademark: 'NordicTrack, iFIT, RunFlex and SpaceSaver are trademarks of iFIT Inc.' },
  what: '77.3 × 37 × 59.5 in footprint, 44.2 × 37 × 69 in folded size, 10 in step-up and official dimension drawings', rear: 2440,
});
export const NT_1250 = treadPart('nordictrack-commercial-1250', NT_1250_SPEC, {
  name: 'NordicTrack Commercial 1250', title: 'NordicTrack Commercial 1250 treadmill',
  description: `NordicTrack Commercial 1250 (2024 Z frame): the 1750's diagonal uprights and fold with a 10 in tilting touchscreen, 22 × 60 in deck. ${tail('iFIT (NordicTrack)')}`,
  vendor: { vendor: 'NordicTrack (iFIT)', url: 'https://www.nordictrack.com/treadmills/commercial-1250-treadmill', credit: 'NordicTrack — Commercial 1250 Treadmill', trademark: 'NordicTrack, iFIT, RunFlex and SpaceSaver are trademarks of iFIT Inc.' },
  what: '77.3 × 37 × 59.5 in footprint, 44.2 × 37 × 69 in folded size, 10 in step-up and official dimension drawings', rear: 2440,
});
export const NT_T10 = treadPart('nordictrack-t-series-10', NT_T10_SPEC, {
  name: 'NordicTrack T Series 10', title: 'NordicTrack T Series 10 treadmill',
  description: `NordicTrack T Series 10 folding treadmill: compact Z frame, 10 in tilting touchscreen with speaker bar, AutoBreeze console and 20 × 60 in SelectFlex deck. ${tail('iFIT (NordicTrack)')}`,
  vendor: { vendor: 'NordicTrack (iFIT)', url: 'https://www.nordictrack.com/product/t-series-10-treadmill', credit: 'NordicTrack — T Series 10 Treadmill', trademark: 'NordicTrack, iFIT, SelectFlex and AutoBreeze are trademarks of iFIT Inc.' },
  what: '75.1 × 34.3 × 58.4 in footprint, 41 × 34.3 × 68.3 in folded size, 8.3 in step-up and official dimension drawings', rear: 2440,
});
export const NT_T65S = treadPart('nordictrack-t-6-5-s', NT_T65S_SPEC, {
  name: 'NordicTrack T 6.5 S', title: 'NordicTrack T 6.5 S treadmill',
  description: `NordicTrack T 6.5 S (NTL17915): silver uprights, classic console with silver side panels, 5 in blue LCD, tablet shelf and orange deck accents on a 20 × 55 in belt; SpaceSaver fold. ${tail('iFIT (NordicTrack)')}`,
  vendor: { vendor: 'NordicTrack (iFIT)', url: 'https://treadmillfactory.ca/products/nordictrack-t-6-5-s-treadmill', credit: 'NordicTrack — T 6.5 S Treadmill (NTL17915)', trademark: 'NordicTrack, iFIT and SpaceSaver are trademarks of iFIT Inc.' },
  what: '73.5 × 36 × 54 in envelope, 38 in folded length and 66 in folded height, 20 × 55 in belt', rear: 2440,
});
export const PROFORM_PRO2000 = treadPart('proform-pro-2000', PROFORM_PRO2000_SPEC, {
  name: 'ProForm Pro 2000', title: 'ProForm Pro 2000 treadmill',
  description: `ProForm Pro 2000 (PFTL13113): silver PRO-FORM uprights on a wide base, iFit console with silver speaker grilles and accessory tray, tablet holder, 22 × 60 in ProShox deck and SpaceSaver fold. ${tail('iFIT (ProForm)')}`,
  vendor: { vendor: 'ProForm (iFIT)', url: 'https://www.proformfitness.ca/treadmills/pro2000-pftl13113', credit: 'ProForm — Pro 2000 Treadmill (PFTL13113)', trademark: 'ProForm, iFIT, ProShox and SpaceSaver are trademarks of iFIT Inc.' },
  what: '80 × 39.5 × 63 in envelope and 22 × 60 in belt', rear: 2440,
});
export const PELOTON_TREAD = treadPart('peloton-tread', PELOTON_TREAD_SPEC, {
  name: 'Peloton Tread', title: 'Peloton Tread', description: `Peloton Tread: low slim deck with rounded end caps, round Z uprights and handlebar loop, 23.8 in HD touchscreen on its post. ${tail('Peloton')}`,
  vendor: { vendor: 'Peloton', url: 'https://www.onepeloton.com/tread', credit: 'Peloton — Tread', trademark: 'Peloton and Peloton Tread are trademarks of Peloton Interactive, Inc.' },
  what: '68 × 33 × 62 in envelope, 59 × 20 in belt, 23.8 in screen', rear: 2000,
});
export const ASSAULTRUNNER_PRO_PART = defineFloorPart({
  id: 'assaultrunner-pro', name: 'AssaultRunner Pro', title: 'Assault Fitness AssaultRunner Pro', noun: 'treadmill', section: 'Cardio',
  description: `AssaultRunner Pro self-powered curved treadmill: 62-slat contoured belt between grey side covers, oval front post with red wordmark, tubular handrail loop and battery console. ${tail('Assault Fitness')}`,
  params: [], footprint: { width: ASSAULTRUNNER_PRO.W, depth: ASSAULTRUNNER_PRO.L }, clearance: useArea({ width: ASSAULTRUNNER_PRO.W, depth: ASSAULTRUNNER_PRO.L }, 610, 0, 2000),
  placement: { side: 'left', gap: 800 },
  vendor: { vendor: 'Assault Fitness', url: 'https://www.assaultfitness.com/treadmills/assault-runner-pro/', credit: 'Assault Fitness — AssaultRunner Pro', trademark: 'Assault Fitness and AssaultRunner are trademarks of Assault Fitness.', reconstruction: reconstruction('69.7 × 33.1 × 64 in envelope and 17 × 62 in running surface') },
});
export const ASSAULTRUNNER_ELITE_PART = defineFloorPart({
  id: 'assaultrunner-elite', name: 'AssaultRunner Elite', title: 'Assault Fitness AssaultRunner Elite', noun: 'treadmill', section: 'Cardio',
  description: `AssaultRunner Elite self-powered curved treadmill: gunmetal wing-foil posts, swept handlebar with twin cup holders and flat grips, 62-slat contoured belt. ${tail('Assault Fitness')}`,
  params: [], footprint: { width: ASSAULTRUNNER_ELITE.W, depth: ASSAULTRUNNER_ELITE.L }, clearance: useArea({ width: ASSAULTRUNNER_ELITE.W, depth: ASSAULTRUNNER_ELITE.L }, 610, 0, 2000),
  placement: { side: 'left', gap: 800 },
  vendor: { vendor: 'Assault Fitness', url: 'https://www.assaultfitness.com/treadmills/assault-runner-elite/', credit: 'Assault Fitness — AssaultRunner Elite', trademark: 'Assault Fitness and AssaultRunner are trademarks of Assault Fitness.', reconstruction: reconstruction('69.9 × 31.7 × 64.4 in envelope and 17 × 62 in running surface') },
});
export const MAX_TRAINER_M6_PART = defineFloorPart({
  id: 'bowflex-max-trainer-m6', name: 'BowFlex Max Trainer M6', title: 'BowFlex Max Trainer M6', noun: 'trainer', section: 'Cardio',
  description: `BowFlex Max Trainer M6 elliptical-stepper: silver tower with red-ringed resistance fan, moving and fixed handlebars, backlit LCD with media rack and two large pedals on a compact base. ${tail('BowFlex Inc.')}`,
  params: [], footprint: { width: MAX_TRAINER_M6.W, depth: MAX_TRAINER_M6.L }, clearance: useArea({ width: MAX_TRAINER_M6.W, depth: MAX_TRAINER_M6.L }, 610, 300, 610),
  placement: { side: 'left', gap: 700 },
  vendor: { vendor: 'BowFlex Inc.', url: 'https://www.bowflex.com/products/max-trainer-m6', credit: 'BowFlex — Max Trainer M6', trademark: 'BowFlex, Max Trainer and JRNY are trademarks of BowFlex Inc.', reconstruction: reconstruction('46 × 26 × 64.2 in envelope and 8.5 in low-pedal height') },
});
const WOODS = [
  { name: 'Oak', color: '#b9824a' }, { name: 'Natural (ash)', color: '#d8b786' }, { name: 'Cherry', color: '#9a5a35' }, { name: 'Walnut', color: '#5e3d27' },
] as const;
export const waterRowerWood = (p: NumericParams) => { const w = WOODS[p.wood ?? 0]; if (!w) throw Error('Unsupported rower wood.'); return w; };
export const WATERROWER_PART = defineFloorPart({
  id: 'waterrower-oak-s4', name: 'WaterRower Oak', title: 'WaterRower Oak rowing machine with S4', noun: 'rower', section: 'Cardio',
  description: `WaterRower in solid wood with the S4 monitor: twin rail frame, clear water tank with paddle, A-frame footboard, sliding seat and strap; stands upright on its front wheels for storage. ${tail('WaterRower')}`,
  params: [
    { key: 'wood', label: 'Wood', default: 0, options: WOODS.map((_, i) => i), format: v => WOODS[v]?.name ?? String(v) },
    { key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: v => ['Rowing', 'Stored upright'][v] ?? String(v) },
  ],
  footprint: p => p.pose ? { width: WATERROWER.W, depth: WATERROWER.H } : { width: WATERROWER.W, depth: WATERROWER.L },
  clearance: p => p.pose ? { width: WATERROWER.W, depth: WATERROWER.H } : useArea({ width: WATERROWER.W, depth: WATERROWER.L }, 300, 300, 600),
  placement: { side: 'left', gap: 450 },
  vendor: { vendor: 'WaterRower', url: 'https://www.waterrower.com.au/waterrower-oak-rowing-machine', credit: 'WaterRower — Oak Rowing Machine with S4 Monitor', trademark: 'WaterRower and S4 are trademarks of WaterRower (UK) Ltd.', reconstruction: reconstruction('209 × 56 × 53 cm envelope and 30 cm seat height') },
});
export const STAIRMASTER_8GX_PART = defineFloorPart({
  id: 'stairmaster-8gx', name: 'StairMaster 8Gx', title: 'StairMaster 8Gx StepMill', noun: 'climber', section: 'Cardio',
  description: `StairMaster 8Gx StepMill: revolving 9 in staircase between sculpted side covers with round sprocket bosses, looping handrails and a 16 in touchscreen or LED console. ${tail('Core Health & Fitness (StairMaster)')}`,
  params: [{ key: 'console', label: 'Console', default: 0, options: [0, 1], format: v => ['16 in Apex touchscreen', 'Apex LED'][v] ?? String(v) }],
  footprint: { width: STAIRMASTER_8GX.W, depth: STAIRMASTER_8GX.L }, clearance: useArea({ width: STAIRMASTER_8GX.W, depth: STAIRMASTER_8GX.L }, 610, 0, 2000),
  placement: { side: 'left', gap: 800 },
  vendor: { vendor: 'Core Health & Fitness', url: 'https://www.corehandf.com/products/stairmaster-8gx-1', credit: 'StairMaster — 8Gx', trademark: 'StairMaster and StepMill are trademarks of Core Health & Fitness, LLC.', reconstruction: reconstruction('58 × 34 × 79 in envelope and 9 in step height') },
});
export const SOLE_E35_PART = defineFloorPart({
  id: 'sole-e35', name: 'Sole E35', title: 'Sole E35 elliptical', noun: 'elliptical', section: 'Cardio',
  description: `Sole E35 front-drive elliptical (2026): teardrop flywheel housing with red-ringed SOLE badge, curved console mast with 10.1 in touchscreen, moving arms, cushioned pedals and twin rear rails. ${tail('Sole Fitness')}`,
  params: [], footprint: { width: SOLE_E35.W, depth: SOLE_E35.L }, clearance: useArea({ width: SOLE_E35.W, depth: SOLE_E35.L }, 610, 300, 610),
  placement: { side: 'left', gap: 800 },
  vendor: { vendor: 'Sole Fitness', url: 'https://www.soletreadmills.com/products/sole-e35', credit: 'Sole Fitness — E35 Elliptical', trademark: 'SOLE and E35 are trademarks of Sole Fitness.', reconstruction: reconstruction('70 × 31 × 70 in envelope and 20 in stride') },
});

export const TREADMILL_SPECS: Record<string, TreadmillSpec> = {
  'sole-f63': SOLE_F63_SPEC, 'horizon-7-0-at': HORIZON_70AT_SPEC, 'nordictrack-commercial-1750': NT_1750_SPEC, 'nordictrack-commercial-1250': NT_1250_SPEC,
  'nordictrack-t-series-10': NT_T10_SPEC, 'nordictrack-t-6-5-s': NT_T65S_SPEC, 'proform-pro-2000': PROFORM_PRO2000_SPEC, 'peloton-tread': PELOTON_TREAD_SPEC,
};
export const PARTS = [
  PELOTON_BIKE_PART, PELOTON_BIKE_PLUS_PART, SOLE_F63, SCHWINN_IC4_PART, ASSAULTRUNNER_PRO_PART, ASSAULTRUNNER_ELITE_PART, NT_T10, HORIZON_70AT,
  PROFORM_PRO2000, PELOTON_TREAD, NT_1250, NT_1750, SUNNY_B1002_PART, MAX_TRAINER_M6_PART, WATERROWER_PART, NT_T65S, STAIRMASTER_8GX_PART, SOLE_E35_PART,
] as const;
