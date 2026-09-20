/** Strongman steel implements (farmer's handles, Dinnie handles, yokes, logs, circus dumbbells, log cushions):
 * published dimensions and catalog entries (metadata only). Sources in research/strongman.md. */
import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { PLATE_GAP } from '../plates.ts';
import { inch, LOADS, loadLength, loadOptions, loadParam, loadPlates, loadRadius, pick } from './strongman-loads.ts';

// ---- Farmer's walk handles --------------------------------------------------------------------------------------
/** Titan Upright Farmers Walk Handles (430021): 50" x 9" x 18", 3" 11-ga base, 49 mm x 11" sleeves, 31 mm handle at 8"/16". */
export const TITAN_UPRIGHT = { length: inch(50), feet: inch(9), height: inch(18), tube: inch(3), sleeve: inch(11), sleeveD: 49, post: inch(3), handleL: inch(8), handleD: 31,
  postInset: inch(3.5), postGap: inch(8), foot: inch(.5), connector: { length: inch(28.5), tube: inch(3.375) }, platformWidth: inch(32) } as const;
/** Plate stack origin on each Titan sleeve: plates rest on the collar where the 11" loadable sleeve starts. */
export const titanUprightSleeveZ = () => TITAN_UPRIGHT.height - TITAN_UPRIGHT.sleeve;
const uprightBox = (p: NumericParams): FloorBox => {
  const u = TITAN_UPRIGHT, r = loadRadius(p.load), postY = u.length / 2 - u.postInset, depth = Math.max(u.length, 2 * (postY + r));
  if (!p.mode) return { width: Math.max(u.feet, 2 * r), depth };
  const pitch = u.platformWidth - u.tube; return { width: Math.max(u.platformWidth + (u.feet - u.tube), pitch + 2 * r, pitch + u.feet), depth };
};
export const TITAN_UPRIGHT_FARMERS = defineFloorPart({
  id: 'titan-upright-farmers-walk-handles', name: 'Titan Upright Farmers Walk Handles', title: 'Titan Upright Farmers Walk Handles', noun: 'farmers handle', section: 'Strongman',
  description: 'Titan Fitness Upright Farmers Walk Handles: 3" square base tube with vertical 49 mm plate posts, twin handle uprights with the 31 mm knurled handle at 8" or 16", and the optional Link Connectors that lock a pair into a deadlift frame. Independent reconstruction from published dimensions; Titan trademarks belong to Titan Fitness.',
  params: [
    { key: 'mode', label: 'Setup', default: 0, options: [0, 1], format: v => ['Single handle', 'Pair + Link Connectors (platform)'][v] ?? String(v) },
    { key: 'handle', label: 'Handle height', default: 16, options: [8, 16], format: v => `${v}"` },
    loadParam(TITAN_UPRIGHT.sleeve, 'per post'),
  ],
  footprint: uprightBox, placement: { side: 'left', gap: 400 }, pair: { gap: 560 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/upright-farmers-walk-handles', credit: 'Titan Fitness — Upright Farmers Walk Handles (430021) and Link Connectors', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 50" x 9" x 18" envelope, 3" 11-ga tube, 49 mm x 11" sleeves, 31 mm x 8" handle at 8"/16", 28.5" x 3.375" Link Connectors (32" platform) and product photos. Post spacing, foot plates and pin details estimated. Scenery only.' },
});
/** Straight-shaft farmer's handles: shaft length/diameter, loadable sleeve per end, raised handle frame. */
export interface FarmerSpec { length: number; shaft: number; sleeve: number; grip: number; gripL: number; rise: number; bar: [number, number]; color: string }
export const TITAN_FARMER: FarmerSpec = { length: inch(60), shaft: 50, sleeve: inch(12), grip: 32, gripL: inch(5.5), rise: 105, bar: [12, 44], color: '#17181a' };
export const ROGUE_FARMER: FarmerSpec = { length: inch(60), shaft: 48.26, sleeve: inch(12), grip: 33.4, gripL: inch(5.5), rise: 135, bar: [10, 46], color: '#1d1e20' };
/** Plates ride on the shaft; loaded handles rest on the plates. */
export const farmerBox = (f: FarmerSpec) => (p: NumericParams): FloorBox => ({ width: Math.max(f.bar[1], 2 * loadRadius(p.load), f.shaft + 22), depth: f.length });
export const TITAN_FARMERS = defineFloorPart({
  id: 'titan-farmers-walk-handles', name: 'Titan Farmers Walk Handles', title: 'Titan Farmers Walk Handles', noun: 'farmers handle', section: 'Strongman',
  description: 'Titan Fitness Farmers Walk Handles: 60" black 50 mm shafts with 12" Olympic sleeves at each end and the raised 5.5" x 32 mm handle frame. Independent reconstruction from published dimensions; Titan trademarks belong to Titan Fitness.',
  params: [loadParam(TITAN_FARMER.sleeve, 'per end')], footprint: farmerBox(TITAN_FARMER), placement: { side: 'left', gap: 400 }, pair: { gap: 500 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/farmers-walk-handles', credit: 'Titan Fitness — Farmers Walk Handles', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 60" length, 50 mm shaft, 12" sleeves, 5.5" x 32 mm handle and product photos. Frame bar size and handle rise estimated. Scenery only.' },
});
export const ROGUE_FARMERS = defineFloorPart({
  id: 'rogue-farmers-walk', name: 'Rogue Farmers Walk', title: 'Rogue Farmers Walk Handles', noun: 'farmers handle', section: 'Strongman',
  description: 'Rogue Farmers Walk handle: 60" 1.5" Schedule 80 shaft with 12" loadable sleeves and a raised 1" Schedule 40 handle, in textured black powder coat. Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  params: [loadParam(ROGUE_FARMER.sleeve, 'per end')], footprint: farmerBox(ROGUE_FARMER), placement: { side: 'left', gap: 400 }, pair: { gap: 500 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-farmers-walk', credit: 'Rogue Fitness — Rogue Farmers Walk', trademark: 'Rogue is a trademark of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 60" length, 1.5" Sch 80 shaft, 1" Sch 40 handle, 12" sleeves and product photos. Handle frame size and rise estimated. Scenery only.' },
});

// ---- Dinnie ----------------------------------------------------------------------------------------------------
/** Cerberus Replica Dinnie Stone Handles: loading pins with the two replica rings at the real stones' pick-up heights. */
export const DINNIE = { base: 152, baseT: 10, pin: inch(2), pinTop: inch(17.4), pitch: 460,
  rings: [{ od: [inch(7), inch(6.5)] as const, steel: 21, top: inch(20.5) }, { od: [inch(6.25), inch(5.25)] as const, steel: 17, top: inch(19.5) }] } as const;
/** Plates on each pin must stay below the hanging ring. */
export const dinnieLoadRoom = () => Math.min(...DINNIE.rings.map(r => r.top - r.od[1])) - DINNIE.baseT - 12;
export const CERBERUS_DINNIE = defineFloorPart({
  id: 'cerberus-replica-dinnie-stone-handles', name: 'Cerberus Replica Dinnie Stone Handles', title: 'Cerberus Replica Dinnie Stone Handles', noun: 'dinnie handle', section: 'Strongman',
  description: 'CERBERUS Replica Dinnie Stone Handles: a matched pair of black loading pins on round foot plates with blacksmith-shaped replica rings (round large, oval small) at the real stones\' pick-up heights. Independent reconstruction from photos; Cerberus trademarks belong to Cerberus Strength.',
  params: [loadParam(dinnieLoadRoom(), 'per pin')],
  footprint: p => { const r = Math.max(DINNIE.base / 2, loadRadius(p.load)), [a, b] = DINNIE.rings.map(ring => Math.max(r, ring.od[0] / 2)); return { width: DINNIE.pitch + a + b, depth: 2 * r }; },
  placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'Cerberus Strength', url: 'https://cerberus-strength.com/products/cerberus-dinnie-stone-handles', credit: 'Cerberus Strength — Replica Dinnie Stone Handles', trademark: 'CERBERUS is a trademark of Cerberus Strength.', reconstruction: 'Independent Manifold reconstruction from product photos, the 6.4 kg pair weight and the Dinnie Stones\' ring sizes (7" x 6.5" round, 6.25" x 5.25" oval). Pin length, foot plate and pick-up heights (20.5" / 19.5") are estimates. Scenery only.' },
});
/** Rogue Dinnie Ring Set: hand-forged 5/8" rings, 7" x 6.5" and 6.25" x 5.25". */
export const ROGUE_RINGS = { steel: inch(5 / 8), rings: [[inch(7), inch(6.5)], [inch(6.25), inch(5.25)]] as const, gap: 60 } as const;
export const ROGUE_DINNIE_RINGS = defineFloorPart({
  id: 'rogue-dinnie-ring-set', name: 'Rogue Dinnie Ring Set', title: 'Rogue Dinnie Ring Set', noun: 'ring set', section: 'Strongman',
  description: 'Rogue Dinnie Ring Set: a large and a small ring hand-forged from 5/8" American steel by Lockhart Ironworks, lying as a pair. Independent reconstruction from published ring sizes; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'pose', label: 'Position', default: 0, options: [0, 1], format: v => ['Lying flat', 'Standing on edge'][v] ?? String(v) }],
  footprint: p => { const [[a, b], [c, d]] = ROGUE_RINGS.rings; return p.pose ? { width: a + c + ROGUE_RINGS.gap, depth: ROGUE_RINGS.steel } : { width: a + c + ROGUE_RINGS.gap, depth: Math.max(b, d) }; },
  placement: { side: 'front', gap: 400 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-dinnie-ring-set', credit: 'Rogue Fitness — Dinnie Ring Set (Lockhart Ironworks)', trademark: 'Rogue is a trademark of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 7" x 6.5" and 6.25" x 5.25" ring sizes, 5/8" stock and photos. The hammered irregularity is a small deterministic warp. Scenery only.' },
});

// ---- Yokes -------------------------------------------------------------------------------------------------------
export interface YokeSpec {
  name: string; width: number; depth: number; heights: readonly number[]; interior: number; upright: [number, number]; crossbar: number; horn: number; hornL: number; hornY: number;
  base: number; jcups: boolean; pins: string; /** Crossbar centre heights (in) by upright height (in). */ bars: (h: number) => number[]; defaultBar: (h: number) => number;
}
const barRange = (lo: number, hi: number) => Array.from({ length: (hi - lo) / 2 + 1 }, (_, i) => lo + 2 * i);
export const TITAN_T3_YOKE: YokeSpec = { name: 'Titan T-3', width: inch(52), depth: inch(53), heights: [72, 92], interior: inch(45), upright: [inch(2), inch(3)], crossbar: inch(2.95), horn: 48, hornL: inch(15.5), hornY: inch(17),
  base: inch(3), jcups: false, pins: '#d52b2b', bars: h => barRange(40, h - 8), defaultBar: h => h === 72 ? 56 : 58 };
export const ROGUE_Y1_YOKE: YokeSpec = { name: 'Rogue Y-1', width: inch(50), depth: inch(48), heights: [72], interior: inch(44), upright: [inch(2), inch(3)], crossbar: inch(3), horn: inch(1.9), hornL: inch(12), hornY: inch(19),
  base: inch(3), jcups: true, pins: '#d02a26', bars: h => barRange(40, h - 6), defaultBar: () => 58 };
export const ROGUE_Y2_YOKE: YokeSpec = { ...ROGUE_Y1_YOKE, name: 'Rogue Y-2', heights: [92], bars: h => barRange(40, h - 6), defaultBar: () => 60 };
/** Plates stack from the base top on each horn. */
export const yokeHornX = (y: YokeSpec) => y.interior / 2 + y.upright[0] / 2;
export const yokeBox = (y: YokeSpec) => (p: NumericParams): FloorBox => {
  const r = loadRadius(p.load), x = yokeHornX(y);
  return { width: Math.max(y.width, 2 * (x + r)), depth: Math.max(y.depth, 2 * (y.hornY + r)) };
};
const yokeParams = (y: YokeSpec) => [
  ...(y.heights.length > 1 ? [{ key: 'height', label: 'Upright height', default: y.heights[0], options: y.heights, format: (v: number) => `${v}" ${v === 72 ? '(short)' : '(tall)'}` }] : []),
  { key: 'bar', label: 'Crossbar height', default: y.defaultBar(y.heights[0]), options: (p: NumericParams) => y.bars(p.height ?? y.heights[0]), format: (v: number) => `${v}"` },
  loadParam(y.hornL - 20, 'per horn'),
];
export const TITAN_YOKE = defineFloorPart({
  id: 'titan-t3-series-yoke', name: 'Titan T-3 Series Yoke', title: 'Titan T-3 Series Yoke', noun: 'yoke', section: 'Strongman',
  description: 'Titan Fitness T-3 Series Yoke (short 72" or tall 92"): 2" x 3" 11-ga uprights on skid-foot bases with fixed 48 mm plate horns, and the 2.95" crossbar pinned at any 2" hole. Independent reconstruction from published dimensions; Titan trademarks belong to Titan Fitness.',
  params: yokeParams(TITAN_T3_YOKE), footprint: yokeBox(TITAN_T3_YOKE), placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/t-3-series-yoke', credit: 'Titan Fitness — T-3 Series Yoke (short 72" / tall 92")', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 52" x 53" footprint, 72"/92" heights, 45" interior, 2.95" crossbar, 48 mm x 15.5" horns and product photos. Bracket, gusset and skid details estimated. Scenery only.' },
});
export const ROGUE_Y1 = defineFloorPart({
  id: 'rogue-y1-yoke', name: 'Rogue Y-1 Yoke', title: 'Rogue Y-1 Yoke', noun: 'yoke', section: 'Strongman',
  description: 'Y-1 Rogue Yoke: 72" 2x3 11-gauge uprights, adjustable 3" crossbar with red pins, J-cups, and two bases on four skid/storage feet with plate posts. Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  params: yokeParams(ROGUE_Y1_YOKE), footprint: yokeBox(ROGUE_Y1_YOKE), placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-yoke', credit: 'Rogue Fitness — Y-1 Rogue Yoke (XX1482)', trademark: 'Rogue is a trademark of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 72" height, 50" x 48" footprint, 2x3 uprights, 3" crossbar and product photos. Interior width, post size and bracket details estimated. Scenery only.' },
});
export const ROGUE_Y2 = defineFloorPart({
  id: 'rogue-y2-yoke', name: 'Rogue Y-2 Yoke', title: 'Rogue Y-2 Yoke', noun: 'yoke', section: 'Strongman',
  description: 'Y-2 Rogue Yoke: the 92" tall version of the Rogue yoke with 2x3 uprights, adjustable 3" crossbar, J-cups and skid/storage feet. Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  params: yokeParams(ROGUE_Y2_YOKE), footprint: yokeBox(ROGUE_Y2_YOKE), placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/y2-yoke', credit: 'Rogue Fitness — Y-2 Rogue Yoke', trademark: 'Rogue is a trademark of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 92" height, 50" x 48" footprint, 2x3 uprights, 3" crossbar and product photos. Interior width, post size and bracket details estimated. Scenery only.' },
});

// ---- Logs --------------------------------------------------------------------------------------------------------
/** Titan Rackable Strongman Log Bars: barrel diameter, overall length, sleeve length, handle spacing (published drawings). */
export const TITAN_LOGS = [
  { name: '8"', d: inch(7.75), length: inch(71.25), sleeve: inch(10), spacing: inch(23.75), lb: 50 },
  { name: '10"', d: inch(10), length: inch(74.4), sleeve: inch(11.875), spacing: inch(26), lb: 70 },
  { name: '12"', d: inch(11.3), length: inch(80.3), sleeve: inch(14), spacing: inch(26), lb: 84 },
] as const;
export const LOG_SLEEVE = 48, LOG_HANDLE = 42, LOG_COLLAR = 25;
export const logBox = (p: NumericParams): FloorBox => { const l = pick(TITAN_LOGS, p.size, 'log size'); return { width: l.length, depth: Math.max(l.d, 2 * loadRadius(p.load)) }; };
export const TITAN_LOG = defineFloorPart({
  id: 'titan-rackable-strongman-log', name: 'Titan Rackable Strongman Log', title: 'Titan Rackable Strongman Log Bar', noun: 'log', section: 'Strongman',
  description: 'Titan Fitness Rackable Strongman Log Bar (8", 10" or 12"): black steel barrel with welded end caps, two hand cut-outs around 42 mm knurled neutral handles and 48 mm Olympic sleeves. Independent reconstruction from published drawings; Titan trademarks belong to Titan Fitness.',
  params: [
    { key: 'size', label: 'Barrel size', default: 2, options: [0, 1, 2], format: v => { const l = TITAN_LOGS[v]; return l ? `${l.name} (${l.lb} lb)` : String(v); } },
    { key: 'load', label: 'Plates', default: 0, options: p => loadOptions(pick(TITAN_LOGS, p.size, 'log size').sleeve - LOG_COLLAR), format: v => v ? `${LOADS[v]?.label ?? v} per sleeve` : 'Empty' },
  ],
  footprint: logBox, placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/rackable-strongman-log-bars', credit: 'Titan Fitness — Rackable Strongman Log Bars (8" / 10" / 12")', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published drawings (7.75" / 10" / 11.3" barrels; 71.25" / 74.4" / 80.3" overall; 10" / 11.875" / 14" sleeves; 42 mm handles; 48 mm sleeves) and product photos. Cut-out shape estimated; laser-cut lettering omitted. Scenery only.' },
});
/** Pitbull Strongman Equipment 12" log (Kansas one-man shop, sold via Facebook until ~2021; no website ever existed).
 * Maker's 2020 Facebook spec post: 12" tube ("actually 12 inches"), 5 ft body, ~1 7/8" loading pins, Classic ~85 lb with hollow
 * pins, Solid Shaft End ~105 lb. Owner reviews (Kurtis 2019, Lean Strong Daily 2020, Farr Outpost 2020/2026) measure 82" overall,
 * 11" sleeves, 25.5" handle centres and 1.2–1.3" smooth handles, and weigh the Classic at 84.8 lb. Window size, arc and corners
 * are estimated from their video frames (research/strongman.md). */
export const PITBULL_LOG = { d: inch(12), body: inch(60), length: inch(82), sleeve: inch(11), sleeveD: inch(1.875), bore: inch(1.61), spacing: inch(25.5), handle: inch(1.3),
  window: inch(13.5), arc: 130, corner: inch(1.5), wall: inch(.11), plate: inch(.25) } as const;
/** The pin-to-end-plate fillet: plates stop this far out from the end plate. */
export const PITBULL_WELD = 5;
export const PITBULL_MODELS = ['Classic · hollow pins (~85 lb)', 'Solid Shaft End Log (~105 lb)'] as const;
export const pitbullLogBox = (p: NumericParams): FloorBox => ({ width: PITBULL_LOG.length, depth: Math.max(PITBULL_LOG.d, 2 * loadRadius(p.load)) });
export const PITBULL_12_LOG = defineFloorPart({
  id: 'pitbull-12-strongman-log', name: 'Pitbull 12" Strongman Log', title: 'Pitbull Strongman 12" Log', noun: 'log', section: 'Strongman',
  description: 'Pitbull Strongman Equipment 12" strongman log (discontinued): a 5 ft black-painted 12" steel tube with flat welded end plates, two open rounded-rectangle hand windows around smooth 1.3" neutral handles on 25.5" centres, and 11" loading pins of 1 7/8" pipe (hollow on the Classic, solid on the Solid Shaft End Log). Not rackable. Independent reconstruction from the maker post and owner measurements; Pitbull Strongman Equipment trademarks belong to their owner.',
  params: [
    { key: 'model', label: 'Model', default: 0, options: [0, 1], format: v => PITBULL_MODELS[v] ?? String(v) },
    loadParam(PITBULL_LOG.sleeve - PITBULL_WELD, 'per sleeve'),
  ],
  footprint: pitbullLogBox, placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'Pitbull Strongman Equipment', url: 'https://www.facebook.com/pitbullstrongmanequipment', credit: 'Pitbull Strongman Equipment — 12" Strongman Log (Classic / Solid Shaft End)', trademark: 'Pitbull Strongman Equipment is a trademark of its owner.', reconstruction: 'Independent Manifold reconstruction. Published (maker\'s 2020 Facebook post): 12" tube, 5 ft body, ~1 7/8" pins, ~85 lb Classic / ~105 lb solid. Owner-measured (three video reviews, Gym Radar): 82" overall, 11" sleeves, 25.5" handle centres, 1.2–1.3" smooth handles, 84.8 lb. Estimated from their video frames: 13.5" windows over ~130° of the tube with 1.5" corners, ~0.11" wall (from the weight), 1/4" end plates and weld beads. Scenery only.' },
});
/** AbMat Log Crash Cushions: 43 x 20 x 12 in, black 18 oz ripstop vinyl, sold in pairs. */
export const ABMAT = { l: inch(43), w: inch(20), h: inch(12) } as const;
export const ABMAT_GAPS = [16, 20, 24, 30] as const;
export const ABMAT_LOG_CUSHIONS = defineFloorPart({
  id: 'abmat-log-crash-cushions', name: 'AbMat Log Crash Cushions', title: 'AbMat Log Crash Cushions', noun: 'crash cushion', section: 'Strongman',
  description: 'AbMat Log Crash Cushions (pair): 43" x 20" x 12" rebond-foam pads in black ripstop vinyl with white prints and a top carry strap, set either side of the lifter for log drops. Independent reconstruction from published dimensions; AbMat trademarks belong to AbMat.',
  params: [{ key: 'gap', label: 'Gap between cushions', default: 24, options: ABMAT_GAPS, format: v => `${v}"` }],
  footprint: p => ({ width: 2 * ABMAT.w + inch(p.gap), depth: ABMAT.l }), placement: { side: 'front', gap: 400 },
  vendor: { vendor: 'AbMat', url: 'https://abmat.com/products/log-crash-cushions', credit: 'AbMat — Log Crash Cushions (pair)', trademark: 'AbMat and Crash Cushions are trademarks of AbMat.', reconstruction: 'Independent Manifold reconstruction from the published 43 x 20 x 12 in size and product photos. Seam, zip and strap details estimated; prints are plain white bars without artwork. Scenery only.' },
});

// ---- Circus dumbbells ----------------------------------------------------------------------------------------------
export interface CircusSpec { bell: number; bellL: number; handleL: number; handles: readonly number[]; lb: number }
/** Titan circus dumbbells (published drawings): 10" -> 10.7" x 30.2", 12" -> 12.8" x 28.25"; 5.3" handle; handle diameters per bell. */
export const TITAN_CIRCUS: readonly CircusSpec[] = [
  { bell: inch(10.7), bellL: (inch(30.2) - inch(5.3)) / 2, handleL: inch(5.3), handles: [2, 2.5], lb: 77 },
  { bell: inch(12.8), bellL: (inch(28.25) - inch(5.3)) / 2, handleL: inch(5.3), handles: [2.5, 3], lb: 85 },
];
/** Mike Bartos Training Circus Dumbbell 12": 99 lb, 2.375" handle; bell length and handle gap estimated from photos. */
export const BARTOS_CIRCUS: CircusSpec = { bell: inch(12), bellL: inch(9), handleL: inch(6), handles: [2.375], lb: 99 };
export const circusBox = (c: CircusSpec) => (p: NumericParams): FloorBox => p.pose ? { width: c.bell, depth: c.bell } : { width: c.bell, depth: 2 * c.bellL + c.handleL };
export const TITAN_CIRCUS_DB = defineFloorPart({
  id: 'titan-circus-dumbbell', name: 'Titan Circus Dumbbell', title: 'Titan Circus Dumbbells', noun: 'circus dumbbell', section: 'Strongman',
  description: 'Titan Fitness plate-loadable Circus Dumbbell: 10" or 12" black steel bells with end caps and a 2", 2.5" or 3" handle; 10.75" of internal loadable sleeve for plates up to 10". Independent reconstruction from published drawings; Titan trademarks belong to Titan Fitness.',
  params: [
    { key: 'bell', label: 'Bell size', default: 1, options: [0, 1], format: v => ['10" bells (77 lb)', '12" bells (85 lb)'][v] ?? String(v) },
    { key: 'handle', label: 'Handle diameter', default: 2.5, options: p => pick(TITAN_CIRCUS, p.bell, 'bell size').handles, format: v => `${v}"` },
    { key: 'pose', label: 'Position', default: 0, options: [0, 1], format: v => ['Lying on its side', 'Standing on end'][v] ?? String(v) },
  ],
  footprint: p => circusBox(pick(TITAN_CIRCUS, p.bell, 'bell size'))(p), placement: { side: 'left', gap: 400 }, pair: { gap: 200 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/12-in-circus-dumbbell-2-5-in-handle', credit: 'Titan Fitness — Circus Dumbbells (10" / 12" bells)', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published drawings (10.7" bells, 30.2" long; 12.8" bells, 28.25" long; 5.3" handle; 2"/2.5"/3" handles) and product photos. Plates load inside the bells and are not shown; end-cap details estimated. Scenery only.' },
});
export const BARTOS_CIRCUS_DB = defineFloorPart({
  id: 'mike-bartos-training-circus-dumbbell', name: 'Mike Bartos Training Circus Dumbbell', title: 'Mike Bartos Training Circus Dumbbell', noun: 'circus dumbbell', section: 'Strongman',
  description: "Mike Bartos' PowerCenter Training Circus Dumbbell 12\": plate-loadable black steel bells on a 2.375\" handle, with the white PowerCenter print. Independent reconstruction from published specs and photos; Mike Bartos' PowerCenter trademarks belong to their owner.",
  params: [{ key: 'pose', label: 'Position', default: 1, options: [0, 1], format: v => ['Lying on its side', 'Standing on end'][v] ?? String(v) }],
  footprint: circusBox(BARTOS_CIRCUS), placement: { side: 'left', gap: 400 }, pair: { gap: 200 },
  vendor: { vendor: "Mike Bartos' PowerCenter", url: 'https://www.mbpowercenter.com/product/training-circus-dumbbell-12/', credit: "Mike Bartos' PowerCenter — Training Circus Dumbbell 12\"", trademark: "Mike Bartos' PowerCenter is a trademark of its owner.", reconstruction: 'Independent Manifold reconstruction from the published 12" bells, 2.375" handle and 99 lb weight, plus owner photos. Bell length (9") and handle gap (6") are estimated; the print is a plain white band. Scenery only.' },
});
export { loadPlates, loadLength, PLATE_GAP };
