/** Catalog leftovers (#176): floor products other families skipped because they needed a floor part. Metadata only (main
 * bundle): never import Manifold builders here. Family slot: floor-registry.ts spreads PARTS. Research: ../research/leftovers.md.
 * Builders: ../parts/leftovers.ts. Wall leftovers (the Rogue strips) live in ../wall-parts/leftovers.ts.
 *
 * Every entry stands on the floor, Z up. The layouts below are plain maths shared with the builders, so footprints,
 * published dimensions and solids stay in step. Landmine handles lie along local X (the barbell axis); the loaded pose
 * slides them onto the +X sleeve of a men's 20 kg bar lying on the floor. */
import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams, Vec2 } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';
import { BAR } from './barbell.ts';
import { plateSpec, type PlateId } from '../plates.ts';

export const inch = (v: number) => v * 25.4;
const idx = (n: number) => Array.from({ length: n }, (_, i) => i);
const named = (names: readonly string[]) => (v: number) => names[v] ?? String(v);
const credit = (vendor: string, url: string, product: string, trademark: string, reconstruction: string): VendorAttribution => ({ vendor, url, credit: `${vendor} — ${product}`, trademark, reconstruction });
const tail = (brand: string) => `Independent reconstruction from published specs and product photos; ${brand} trademarks belong to ${brand}.`;
const ROGUE_TM = 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.', TITAN_TM = 'Titan and Titan Fitness are trademarks of Titan Fitness.';
const want = <T,>(v: T | undefined, what: string): T => { if (v === undefined) throw Error(`Unsupported ${what}.`); return v; };
/** Axis-aligned bounds [min, max] of solids, in mm. */
export interface Bounds { min: [number, number, number]; max: [number, number, number] }
const boxOf = (b: Bounds): FloorBox => ({ width: b.max[0] - b.min[0], depth: b.max[1] - b.min[1], offset: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2] });
const LOADED = { key: 'loaded', label: 'Pose', default: 0, options: [0, 1], format: named(['Handle on its own', 'On a 20 kg bar sleeve']) };
/** Loaded bar: the handle's sleeve bore is the bar axis; the bar end sits `endX` along +X. Returns the bar's x span. */
export const barSpan = (endX: number): [number, number] => [endX - BAR.length, endX];
export const BAR_END_CAP = 19;

// ── Titan Viking Press Landmine Handle (neutral grip, V2) ────────────────────────────────────────────
/** Published: 26.5" overall length, 16" overall height, 50 mm tubes, 9.5" top grips with 7.5" between them, grip posts
 * at 8.5" and 21.5" on centre, 5" × 50 mm installation sleeve, 11 ga powder-coated black steel, 17 lb.
 * Frame lies flat on the floor: crossbar along Y at x = 0, posts along +X, sleeve along −X. */
export const VIKING = {
  length: inch(26.5), height: inch(16), tube: 50, grip: inch(9.5), gripGap: inch(7.5), posts: [inch(8.5), inch(21.5)], sleeve: inch(5),
  sleeveOD: 60.3, sleeveID: 51.8, knobAt: 32, knob: { stud: 12, h: 14, w: 38 }, product: 'https://titan.fitness/products/neutral-grip-viking-press-landmine-handle-v2',
} as const;
/** Crossbar axis → top-grip axis along X (16" minus the sleeve and one tube). */
export const vikingReach = VIKING.height - VIKING.sleeve - VIKING.tube;
export function vikingBounds(p: NumericParams): Bounds {
  const r = VIKING.sleeveOD / 2, x0 = -VIKING.tube / 2 - VIKING.sleeve, x1 = vikingReach + VIKING.tube / 2;
  const [bx0] = barSpan(-VIKING.tube / 2 - 4);
  return { min: [p.loaded ? bx0 : x0, -VIKING.length / 2, 0], max: [x1, VIKING.length / 2, 2 * r + VIKING.knob.stud + VIKING.knob.h] };
}
export const TITAN_VIKING_HANDLE = defineFloorPart({
  id: 'titan-viking-press-landmine-handle', name: 'Viking Press Landmine Handle', title: 'Titan Viking Press Landmine Handle', noun: 'landmine handle', section: 'Accessories',
  description: `Titan Fitness Viking Press Landmine Handle (V2): a 26.5″ × 16″ frame of 50 mm fat-grip tubes with neutral grips on two loops (8.5″ and 21.5″ on centre) and a 5″ slide-over sleeve with a threaded stop knob; lie it on the floor or slide it onto a bar sleeve. ${tail('Titan Fitness')}`,
  params: [LOADED],
  footprint: p => boxOf(vikingBounds(p)), placement: { side: 'front', gap: 300 },
  vendor: credit('Titan Fitness', VIKING.product, 'Viking Press Landmine Handle', TITAN_TM, 'Published: 26.5″ length, 16″ height, 50 mm grips, 9.5″ handle length, grip spacing 8.5″ and 21.5″, 50 mm × 5″ installation sleeve, 11 ga powder-coated steel, 17 lb (Titan spec table and dimension drawing). Estimated from photos: 60 mm sleeve OD, stop-knob size and position. Loaded pose lays a 20 kg Olympic bar through the sleeve. Scenery only, excluded from print export.'),
});

// ── Rogue Parallel Landmine Handle (standard or fat grip) ────────────────────────────────────────────
/** Published comparison table: handle length 8.75", handles 10" on centre, barbell centre to handle centre 10", total depth
 * 9.25", width 11.75" / 12.5" and height 12.25" / 12.5" (standard 32 mm / fat 48 mm), 0.25" laser-cut plates. */
export const PARALLEL = {
  handle: inch(8.75), spacing: inch(10), rise: inch(10), depth: inch(9.25), plate: inch(.25), bore: 52, cap: inch(.25),
  grips: [{ name: 'Standard grip · 32 mm', d: 32, width: inch(11.75), height: inch(12.25), lb: 11.5 }, { name: 'Fat grip · 48 mm', d: 48, width: inch(12.5), height: inch(12.5), lb: 13.5 }],
  product: 'https://www.roguefitness.com/rogue-parallel-landmine-handle',
} as const;
export const parallelGrip = (p: NumericParams) => want(PARALLEL.grips[p.grip], 'parallel handle grip');
/** Plate outline numbers (Y across, Z up from the bar axis): ear radius, lug radius, saddle depth. */
export function parallelLayout(p: NumericParams) {
  const g = parallelGrip(p), ear = g.width / 2 - PARALLEL.spacing / 2, lug = g.height - PARALLEL.rise - ear;
  // Handles run 8.75" between capped ends; each plate's outer face sits 4 mm inside the handle end.
  const faceX = PARALLEL.handle / 2 - 4;
  return { ...g, ear, lug, axisZ: lug, faceX, saddle: PARALLEL.rise - inch(2.1) };
}
export function parallelBounds(p: NumericParams): Bounds {
  const l = parallelLayout(p), half = PARALLEL.depth / 2;
  const [bx0] = barSpan(half - 6);
  return { min: [p.loaded ? bx0 : -half, -l.width / 2, 0], max: [half, l.width / 2, l.height] };
}
export const ROGUE_PARALLEL_HANDLE = defineFloorPart({
  id: 'rogue-parallel-landmine-handle', name: 'Parallel Landmine Handle', title: 'Rogue Parallel Landmine Handle', noun: 'landmine handle', section: 'Accessories',
  description: `Rogue Parallel Landmine Handle: two ¼″ laser-cut ROGUE plates welded to a pair of 8.75″ textured handles 10″ on centre, 10″ above the bar; standard 32 mm or fat 48 mm grip. Stands on its bar bores or rides a bar sleeve. ${tail('Rogue Fitness')}`,
  params: [{ key: 'grip', label: 'Handle', default: 0, options: [0, 1], format: v => PARALLEL.grips[v]?.name ?? String(v) }, LOADED],
  footprint: p => boxOf(parallelBounds(p)), placement: { side: 'front', gap: 300 },
  vendor: credit('Rogue Fitness', PARALLEL.product, 'Parallel Landmine Handle (standard and fat grip)', ROGUE_TM, 'Published (Rogue comparison table): 8.75″ handles 10″ on centre, 10″ bar centre to handle centre, 9.25″ depth, 11.75″ × 12.25″ (standard, 32 mm) or 12.5″ × 12.5″ (fat, 48 mm), ¼″ laser-cut steel, textured black powder coat, 11.5 / 13.5 lb. Estimated from photos: saddle curve, window cut-outs, bore collars and end caps; the laser-cut ROGUE lettering is a plain badge. Scenery only, excluded from print export.'),
});

// ── Titan Straight Landmine Handles ─────────────────────────────────────────────────────────────────
/** Published: 30" overall, 7" handles with 29 mm rubber grips, 3.5" × 50 mm sleeve, 8.5 lb. Arms rise in a V from the
 * sleeve (plane ⟂ the bar) to grips level with each other. Rise and arm size estimated from photos. */
export const STRAIGHT = { span: inch(30), grip: inch(7), gripD: 29, sleeve: inch(3.5), sleeveOD: 60.3, sleeveID: 51.8, arm: 22, rise: inch(9.5), product: 'https://titan.fitness/products/straight-landmine-handles' } as const;
export function straightBounds(p: NumericParams): Bounds {
  const [bx0] = barSpan(STRAIGHT.sleeve / 2 - 4);
  const top = STRAIGHT.sleeveOD / 2 + STRAIGHT.rise + STRAIGHT.gripD / 2;
  return { min: [p.loaded ? bx0 : -STRAIGHT.sleeve / 2, -STRAIGHT.span / 2, 0], max: [STRAIGHT.sleeve / 2, STRAIGHT.span / 2, top] };
}
export const TITAN_STRAIGHT_HANDLES = defineFloorPart({
  id: 'titan-straight-landmine-handles', name: 'Straight Landmine Handles', title: 'Titan Straight Landmine Handles', noun: 'landmine handle', section: 'Accessories',
  description: `Titan Fitness Straight Landmine Handles: a 3.5″ slide-over sleeve with two steel arms rising in a V to 7″ rubber-coated 29 mm grips, 30″ tip to tip, for landmine rotations and rows. ${tail('Titan Fitness')}`,
  params: [LOADED],
  footprint: p => boxOf(straightBounds(p)), placement: { side: 'front', gap: 300 },
  vendor: credit('Titan Fitness', STRAIGHT.product, 'Straight Landmine Handles', TITAN_TM, 'Published: 30″ overall length, 7″ handles, 29 mm rubber grips, 3.5″ × 50 mm sleeve, powder-coated black steel, 8.5 lb (Titan spec table and dimension drawing). Estimated from photos: 22 mm arms, 9.5″ rise from the sleeve to the grips and the 60 mm sleeve OD. Scenery only, excluded from print export.'),
});

// ── Rogue Post Landmine ─────────────────────────────────────────────────────────────────────────────
/** Published: 7.25" solid 1.875" round post, 10" pivot sleeve, 7 ga steel, 9 lb; the manual stacks two 45 lb bumpers. */
export const POST_LANDMINE = {
  post: inch(7.25), postD: inch(1.875), sleeve: inch(10), sleeveOD: inch(2.375), sleeveID: 53, clevis: { w: inch(3), h: inch(3.25), t: 4.55, base: 8 }, pivotIn: inch(1.1), bolt: 19,
  product: 'https://www.roguefitness.com/post-landmine',
} as const;
export const POST_BASES: readonly { name: string; plate: PlateId }[] = [
  { name: 'Two 45 lb Rogue HG 2.0 bumpers', plate: 'rogue-hg2-lb:45' },
  { name: 'Two 45 lb Rogue Echo V2 bumpers', plate: 'rogue-echo-v2:45' },
  { name: 'Two 20 kg bumpers', plate: 'kg20' },
];
export const POST_ANGLES = [15, 30, 45] as const;
export const postPlate = (p: NumericParams) => { const b = want(POST_BASES[p.base], 'post landmine base'); return { ...b, spec: want(plateSpec(b.plate), 'post landmine plate') }; };
/** Pivot and sleeve pose: the sleeve points along +X, tilted up by `angle`; pivot bolt axis along Y. */
export function postLayout(p: NumericParams) {
  if (!POST_ANGLES.includes(p.angle as never)) throw Error('Unsupported post landmine sleeve angle.');
  const { spec } = postPlate(p), a = p.angle * Math.PI / 180, c = POST_LANDMINE.clevis;
  const pivotZ = POST_LANDMINE.post + c.base + c.h - c.w / 2;
  const along = (s: number): Vec2 => [s * Math.cos(a), pivotZ + s * Math.sin(a)];
  // Sleeve runs from `pivotIn` behind the pivot to its far end.
  const s0 = -POST_LANDMINE.pivotIn, s1 = POST_LANDMINE.sleeve - POST_LANDMINE.pivotIn;
  return { spec, a, pivotZ, along, s0, s1, stack: 2 * spec.width + .5 };
}
export function postBounds(p: NumericParams): Bounds {
  const l = postLayout(p), R = l.spec.diameter / 2, r = POST_LANDMINE.sleeveOD / 2, sa = Math.sin(l.a), ca = Math.cos(l.a);
  const end = l.along(l.s1), back = l.along(l.s0);
  const xMax = Math.max(R, end[0] + r * sa), zMax = end[1] + r * ca, xMin = Math.min(-R, back[0] - r * sa);
  return { min: [xMin, -R, 0], max: [xMax, R, zMax] };
}
export const ROGUE_POST_LANDMINE = defineFloorPart({
  id: 'rogue-post-landmine', name: 'Post Landmine', title: 'Rogue Post Landmine', noun: 'landmine', section: 'Accessories',
  description: `Rogue Post Landmine: a 7.25″ solid 1-7/8″ post dropped through a pair of bumper plates, with a 7 ga clevis and a 10″ pivoting sleeve for a barbell end; choose the plates and the sleeve angle. ${tail('Rogue Fitness')}`,
  params: [
    { key: 'base', label: 'Plate base', default: 0, options: idx(POST_BASES.length), format: v => POST_BASES[v]?.name ?? String(v) },
    { key: 'angle', label: 'Sleeve angle', default: 15, options: POST_ANGLES, format: v => `${v}° up` },
  ],
  footprint: p => boxOf(postBounds(p)), placement: { side: 'front', gap: 400 },
  vendor: credit('Rogue Fitness', POST_LANDMINE.product, 'Post Landmine (RA0025)', ROGUE_TM, 'Published: 7.25″ base post of 1.875″ solid round, 10″ pivot sleeve, 7 ga steel, 9 lb, 315 lb capacity; the RA0025 manual stacks two 45 lb bumpers (or an Echo sled / Butcher). Estimated from photos: 2.375″ sleeve OD, clevis size and pivot position; the printed ROGUE mark is a plain white band. Plates use the catalog plate lines. Scenery only, excluded from print export.'),
});

// ── Texas Strength Systems Combo Rack ──────────────────────────────────────────────────────────────
/** Published: footprint 39" (rack only) / 64" (with bench) × 83" × 49", hooks from ~30" to ~69" on 1" holes, 7 ga uprights,
 * stainless hooks numbered on three sides, hand-jack uprights, drop-in bench with lift-off platform, 350 lb.
 * Local +Y runs from the rack toward the bench foot; the hooks sit on the upright line y = 0. */
export const TSS = {
  width: inch(83), rackDepth: inch(39), benchDepth: inch(64), frameHeight: inch(49), hookMin: 30, hookMax: 69,
  base: 76.2, side: 1244 / 2, rear: -600, sleeve: { w: 101.6, h: 305 }, upright: 76.2, inner: 63.5, jackPost: 50.8, jackY: -250,
  legAngle: 42, pad: { length: inch(48), width: inch(12), thick: 76, top: inch(17) },
  product: 'https://texasstrengthsystems.com/products/tss-combo-rack-copy',
} as const;
export const TSS_COLORS: readonly (readonly [string, string, number, number])[] = [
  ['Black', '#1b1c1e', .3, .45], ['Red', '#b3202a', .25, .4], ['White', '#e8e8e4', .1, .4], ['Blue', '#1f5bb5', .25, .4], ['Dark Blue', '#1c2f5e', .25, .42],
  ['Neon Green', '#6fd42c', .2, .4], ['Dark Green', '#1f5a33', .25, .42], ['Hammertone Gray', '#6d6a63', .55, .55], ['Orange', '#e0661d', .2, .4],
  ['Yellow', '#e8c21a', .2, .4], ['Pink', '#e06aa5', .2, .4], ['Clear Coat', '#8a8d90', .8, .38],
];
/** Bench frame colours offered as the second choice on the rack's variants. */
export const TSS_ACCENTS = [0, 1, 2, 3, 4] as const;
const HOOKS = Array.from({ length: TSS.hookMax - TSS.hookMin + 1 }, (_, i) => TSS.hookMin + i);
/** Pad head end: the pad's foot end lands on the published 64" bench footprint. */
export const tssPadHead = () => TSS.rear + TSS.benchDepth - TSS.pad.length;
/** Splayed front leg from the upright base: plan angle (from +X toward +Y), length chosen for the published 83" width. */
export function tssLeg() {
  const a = TSS.legAngle * Math.PI / 180, h = TSS.base / 2, reach = TSS.width / 2 - TSS.side - h * Math.sin(a);
  const length = reach / Math.cos(a);
  const tip: Vec2 = [TSS.side + length * Math.cos(a), length * Math.sin(a)];
  return { a, length, tip, h, front: tip[1] + h * Math.cos(a) };
}
/** Hook cup floor height (mm), black upright top (hand-jack stage) and stainless inner tube top. */
export function tssUpright(p: NumericParams) {
  if (!HOOKS.includes(p.hooks)) throw Error('Unsupported combo rack hook height.');
  const hook = inch(p.hooks), top = Math.min(TSS.frameHeight, Math.max(inch(24), hook - inch(12)));
  return { hook, top, innerTop: hook + inch(7), plateTop: hook + inch(9) };
}
export function tssBounds(p: NumericParams): Bounds {
  const leg = tssLeg(), u = tssUpright(p), yMax = p.bench ? TSS.rear + TSS.benchDepth : leg.front;
  return { min: [-TSS.width / 2, TSS.rear, 0], max: [TSS.width / 2, yMax, u.plateTop] };
}
export const TSS_COMBO_RACK = defineFloorPart({
  id: 'tss-combo-rack', name: 'TSS Combo Rack', title: 'Texas Strength Systems Combo Rack', noun: 'combo rack', section: 'Machines',
  description: `Texas Strength Systems Combo Rack: the competition bench/squat combo used at powerlifting meets, with 7 ga hand-jack uprights on splayed legs, stainless numbered hooks on 1″ holes from ~30″ to ~69″ and a drop-in bench with a diamond-plate lift-off platform; 83″ wide, 39″ deep (64″ with the bench). ${tail('Texas Strength Systems')}`,
  params: [
    { key: 'hooks', label: 'Hook height', default: 40, options: HOOKS, format: v => `${v}″` },
    { key: 'bench', label: 'Bench', default: 1, options: [0, 1], format: named(['Rack only (squat)', 'Drop-in bench + lift-off']) },
    { key: 'color', label: 'Frame colour', default: 0, options: idx(TSS_COLORS.length), format: v => TSS_COLORS[v]?.[0] ?? String(v) },
    { key: 'accent', label: 'Bench frame colour', default: 0, options: TSS_ACCENTS, format: v => TSS_COLORS[v]?.[0] ?? String(v) },
  ],
  footprint: p => boxOf(tssBounds(p)), placement: { side: 'right', gap: 400 },
  vendor: credit('Texas Strength Systems', TSS.product, 'TSS Combo Rack', 'Texas Strength Systems and TSS are trademarks of Texas Strength Systems.', 'Published: 39″ (rack only) / 64″ (with bench) × 83″ × 49″ footprint, hooks ~30″ to ~69″ on 1″ holes, 7 ga uprights, stainless hooks numbered on three sides, hand jacks, drop-in bench with lift-off platform, replaceable nylon rollers, 350 lb, frame colours from the variant list. Estimated from photos: 3″ base tubes, leg splay, upright sleeves, jack linkage, hook plate and the 48″ × 12″ pad at 17″. The hand-jack stage follows the hook height; hole numbers are plain tick marks and the cut lettering is a plain badge. Scenery only, excluded from print export.'),
});

// ── Theraband FlexBar ───────────────────────────────────────────────────────────────────────────────
/** Published: 12" long ridged natural-rubber bar; yellow 1-3/8", red 1-1/2", green 1-3/4", blue 2" (6/10/15/25 lb to bend). */
export const FLEXBAR = { length: inch(12), ridges: 16, ridge: .045, product: 'https://www.performancehealth.com/theraband-flexbar' } as const;
export const FLEXBAR_LEVELS = [
  { name: 'Yellow · extra light (6 lb)', d: inch(1.375), color: '#f2cf1d' }, { name: 'Red · light (10 lb)', d: inch(1.5), color: '#d3242d' },
  { name: 'Green · medium (15 lb)', d: inch(1.75), color: '#1f9660' }, { name: 'Blue · heavy (25 lb)', d: inch(2), color: '#1f5fae' },
] as const;
export const flexbarLevel = (p: NumericParams) => want(FLEXBAR_LEVELS[p.level], 'FlexBar resistance');
export const THERABAND_FLEXBAR = defineFloorPart({
  id: 'theraband-flexbar', name: 'FlexBar', title: 'Theraband FlexBar', noun: 'flexbar', section: 'Accessories',
  description: `THERABAND FlexBar: a 12″ ridged natural-rubber resistance bar for grip, wrist and tennis-elbow work, colour-coded yellow 1-3/8″, red 1-1/2″, green 1-3/4″ or blue 2″; shown lying on the floor. ${tail('Performance Health')}`,
  params: [{ key: 'level', label: 'Resistance', default: 1, options: idx(FLEXBAR_LEVELS.length), format: v => FLEXBAR_LEVELS[v]?.name ?? String(v) }],
  footprint: p => ({ width: FLEXBAR.length, depth: flexbarLevel(p).d }), pair: { gap: 40 },
  vendor: credit('Performance Health', FLEXBAR.product, 'THERABAND FlexBar', 'THERABAND and FlexBar are trademarks of Performance Health.', 'Published: 12″ / 30.5 cm length, dry natural rubber, diameters 1-3/8″ (yellow), 1-1/2″ (red), 1-3/4″ (green), 2″ (blue) with 6/10/15/25 lb to bend into a U. Estimated from photos: 16 longitudinal ridges and their depth, the rounded ends; the THERABAND print is a plain white band. Scenery only, excluded from print export.'),
});

// ── Freak Athlete Nordic Mini Pro ───────────────────────────────────────────────────────────────────
/** No spec table is published; the storage photo labels the pad 21" × 18" and the listing ships at 49 lb. Everything else
 * is scaled from the product renders and customer photos (research/leftovers.md). Local +Y runs from the leg end to the
 * roller end plate. */
export const NORDIC = {
  pad: { length: inch(21), width: inch(18), thick: 64, top: 216 }, padY: [-393, 140] as Vec2,
  roller: { d: 127, length: 216, hub: 60 }, rollerY: 210, lowerZ: 180, gaps: [80, 105, 130, 155, 180],
  plate: { y: 285, t: 6, w: 356, z: [15, 420] as Vec2 }, wheel: { r: 30, w: 24, x: 150, y: 336 }, horn: { d: 50, length: 75, z: 210 },
  foot: { y: -520, x: 190, w: 70, l: 110, t: 8 }, spine: { w: 50, z: [96, 146] as Vec2 },
  product: 'https://freakathlete.co/products/nordic-mini-pro',
} as const;
export const nordicUpperZ = (p: NumericParams) => NORDIC.lowerZ + NORDIC.roller.d + want(NORDIC.gaps[p.ankle], 'Nordic roller gap');
/** Working-pose bounds (before the storage rotation). */
export function nordicWorkBounds(p: NumericParams): Bounds {
  const R = NORDIC.roller, halfX = R.hub / 2 + R.length, top = Math.max(nordicUpperZ(p) + R.d / 2, NORDIC.plate.z[1]);
  return { min: [-halfX, NORDIC.foot.y - NORDIC.foot.l / 2, 0], max: [halfX, NORDIC.plate.y + NORDIC.plate.t + NORDIC.horn.length, top] };
}
/** Stored standing on its end plate (roller end down, legs up): working (x, y, z) → (x, z, yMax − y). */
export function nordicBounds(p: NumericParams): Bounds {
  const w = nordicWorkBounds(p);
  if (!p.pose) return w;
  return { min: [w.min[0], w.min[2], 0], max: [w.max[0], w.max[2], w.max[1] - w.min[1]] };
}
export const FREAK_NORDIC_MINI_PRO = defineFloorPart({
  id: 'freak-athlete-nordic-mini-pro', name: 'Nordic Mini Pro', title: 'Freak Athlete Nordic Mini Pro', noun: 'nordic bench', section: 'Machines',
  description: `Freak Athlete Nordic Mini Pro: a portable Nordic hamstring anchor with a 21″ × 18″ knee pad on splayed legs, adjustable twin ankle rollers over a fixed pair, and a steel end plate with a counterweight horn and wheels so it stores upright against a wall. ${tail('Freak Athlete')}`,
  params: [
    { key: 'ankle', label: 'Ankle roller gap', default: 2, options: idx(NORDIC.gaps.length), format: v => `Hole ${v + 1} · ${NORDIC.gaps[v]} mm` },
    { key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: named(['Working (flat)', 'Stored upright']) },
  ],
  footprint: p => boxOf(nordicBounds(p)), placement: { side: 'right', gap: 400 },
  vendor: credit('Freak Athlete', NORDIC.product, 'Nordic Mini Pro', 'Freak Athlete is a trademark of Freak Athlete.', 'Published: 21″ × 18″ pad callout on the storage photo, 49 lb shipping weight, black textured pad with orange FREAK ATHLETE side print, storage upright on the end plate. No spec table is published, so the frame, legs, 5″ rollers, roller gaps, end plate, wheels and horn are scaled from the manufacturer renders and customer photos. Prints and laser-cut lettering are plain badges. Scenery only, excluded from print export.'),
});

export const PARTS = [TITAN_VIKING_HANDLE, ROGUE_PARALLEL_HANDLE, TITAN_STRAIGHT_HANDLES, ROGUE_POST_LANDMINE, TSS_COMBO_RACK, THERABAND_FLEXBAR, FREAK_NORDIC_MINI_PRO] as const;
