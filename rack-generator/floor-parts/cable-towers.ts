/** Stand-alone cable towers, lat pulldowns and functional trainers. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 *
 * Each entry's published dimensions live in a `*_DIMS` constant shared with its builder in ../parts/cable-towers.ts, so the
 * footprint and the geometry cannot drift. Build frame: X across the machine, Y from the user side (-Y) to the back, Z up.
 * Sources, dimension tables and estimates are in ../research/cable-towers.md. */
import { defineFloorPart, type FloorParam, type FloorPart } from '../floor-part.ts';
import type { PlateId } from '../plates.ts';
import type { NumericParams } from '../types.ts';
export const inch = (v: number) => v * 25.4;
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step);
const pounds = (v: number) => `${v} lb`;
const TAIL = 'Independent reconstruction from published dimensions and product photos';
/** Selector-pin weights for a stack: the head plate alone, then one plate per step. */
export const stackWeights = (first: number, step: number, max: number) => range(first, max, step);
/** Pin index (0 = head plate only) for a selected weight. */
export const pinIndex = (weights: readonly number[], weight: number) => Math.max(0, weights.indexOf(weight));
/** Plate-loaded carriages hold 45 lb iron plates in this preview (count total, split across horns by the builder). */
export const ironPlates = (count: number): PlateId[] => Array<PlateId>(count).fill('lb45');
/** Loaded 45 lb plates; `when` limits it to the plate-loaded configurations of an entry. */
const loadedParam = (max: number, fallback = 0, when: (p: NumericParams) => boolean = () => true): FloorParam => ({ key: 'loaded', label: 'Loaded plates', default: fallback, options: p => when(p) ? range(0, max) : [0], format: v => v ? `${v} × 45 lb (${v * 45} lb)` : 'Empty' });
const holeParam = (key: string, label: string, count: number, fallback: number, first = 1): FloorParam => ({ key, label, default: fallback, options: range(first, count), format: v => `Hole ${v}` });

// ------------------------------------------------------------------------------------------------ Bells of Steel Cable Tower
/** Bells of Steel Cable Tower (PULT / STK-PULT, 2025 revamp). bellsofsteel.com spec drawing: 2051 mm tall, 787 mm top header,
 * 724 × 737 mm base; 2" × 2" 14 ga uprights, 33 numbered carriage holes on 2" pitch, Ø90 / Ø114 mm pulleys (manual parts list). */
export const BOS_TOWER_DIMS = { height: 2051, header: 787, base: 724, feet: 737, tube: inch(2), pitch: inch(2), hole1: 183, holes: 33, width: 737, depth: 879.8 } as const;
export const BOS_TOWER_LOADING = ['Weight stack 210 lb', 'Mini weight stack 110 lb', 'Plate loaded'] as const;
export const bosTowerWeights = (p: NumericParams) => p.loading === 2 ? [0] : stackWeights(10, 10, p.loading === 1 ? 110 : 210);
export const BOS_CABLE_TOWER = defineFloorPart({
  id: 'bells-of-steel-cable-tower', name: 'Bells of Steel Cable Tower', title: 'Bells of Steel Cable Tower', noun: 'cable tower', section: 'Machines',
  description: `Bells of Steel Cable Tower: 2" × 2" silver upright with 33 numbered carriage holes, 2:1 dual-cable carriage, 210 lb / 110 lb selector stack or plate-loaded carriage, wall brackets or back upright. ${TAIL}; Bells of Steel trademarks belong to Bells of Steel.`,
  params: [
    { key: 'loading', label: 'Loading', default: 0, options: [0, 1, 2], format: v => BOS_TOWER_LOADING[v] ?? String(v) },
    { key: 'pin', label: 'Selector pin', default: 100, options: bosTowerWeights, format: v => v ? pounds(v) : 'Plate loaded' },
    loadedParam(5, 0, p => p.loading === 2),
    holeParam('carriage', 'Carriage height', BOS_TOWER_DIMS.holes, 30),
    { key: 'upright', label: 'Back support', default: 0, options: [0, 1], format: v => v ? 'Back upright' : 'Wall brackets' },
  ],
  footprint: { width: BOS_TOWER_DIMS.width, depth: BOS_TOWER_DIMS.depth },
  placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'Bells of Steel', url: 'https://bellsofsteel.com/products/cable-tower', credit: 'Bells of Steel — Cable Tower (weight stack, mini stack and plate loaded)', trademark: 'Bells of Steel is a trademark of Bells of Steel Manufacturing.', reconstruction: 'Independent Manifold reconstruction from the published 2051 mm height, 787 mm header and 724 × 737 mm base drawing, the STK-PULT4 assembly manual parts list (Ø90/Ø114 pulleys) and product photos. Tube gauges, pulley plate outlines and cable routing estimated; scenery only, excluded from print export.' },
});

// ------------------------------------------------------------------------------------------------ Temple of Gainz Multi-Flight V3
/** Temple of Gainz Selectorized Standing Multi-Flight V3 (TOG-1006V3). templeofgainz.com dimension drawing: 76.4" tall,
 * 44.7" front base, 28.7" rear base, 26.5" deep, 62.1" across the handles spread flat; 11 lb (5 kg) plates to 220 lb (100 kg);
 * 30 numbered sliding-assembly positions. */
export const TOG_FLIGHT_DIMS = { height: inch(76.4), frontBase: inch(44.7), rearBase: inch(28.7), base: inch(26.5), handleSpan: inch(62.1), positions: 30, width: inch(44.7), depth: 690 } as const;
export const togFlightWeights = stackWeights(11, 11, 220);
export const TOG_HEAD_PAD = ['Head pad removed', 'Head pad · low', 'Head pad · mid', 'Head pad · high'] as const;
export const TOG_MULTI_FLIGHT = defineFloorPart({
  id: 'temple-of-gainz-multi-flight-v3', name: 'Temple of Gainz Multi-Flight V3', title: 'Temple of Gainz Selectorized Standing Multi-Flight V3', noun: 'machine', section: 'Machines',
  description: `Temple of Gainz Selectorized Standing Multi-Flight Version 3 ("the Deltoid Variant"): twin numbered dial cams on a 30-position sliding assembly, swivelling movement arms, three-position head pad and a 220 lb (11 lb step) stack behind the logo shroud. ${TAIL}; Temple of Gainz trademarks belong to Temple of Gainz.`,
  params: [
    holeParam('carriage', 'Sliding assembly position', TOG_FLIGHT_DIMS.positions, 14),
    { key: 'pin', label: 'Selector pin', default: 55, options: togFlightWeights, format: pounds },
    { key: 'headPad', label: 'Head pad', default: 1, options: [0, 1, 2, 3], format: v => TOG_HEAD_PAD[v] ?? String(v) },
  ],
  footprint: { width: TOG_FLIGHT_DIMS.width, depth: TOG_FLIGHT_DIMS.depth },
  placement: { side: 'right', gap: 400 },
  vendor: { vendor: 'Temple of Gainz', url: 'https://templeofgainz.com/products/selectorized-standing-multi-flight-machine-the-deltoid-variant-lateral-raise-machine-version-3', credit: 'Temple of Gainz — Selectorized Standing Multi-Flight Machine Version 3 (TOG-1006V3)', trademark: 'Temple of Gainz and Multi-Flight are trademarks of Temple of Gainz.', reconstruction: 'Independent Manifold reconstruction from the published 76.4 in height, 44.7/28.7 in base widths and 26.5 in depth drawing, the 11–220 lb stack chart and 17 studio renders. Post sections, cam and arm geometry, cable routing and shroud outlines estimated; scenery only, excluded from print export.' },
});

// ------------------------------------------------------------------------------------------------ Lat towers (Titan, Bells of Steel)
/** Two-upright lat tower: the frame runs front to back (Y) with the stack between the uprights, the lat arm reaches forward
 * over the seat box, the rear foot runs across (X). Shared by the Titan Lat Tower and the Bells of Steel Lat Pulldown. */
export interface LatTowerDims {
  height: number; length: number; baseWidth: number; latBar: number; tube: number;
  /** Upright centre-to-centre (Y), rear foot length (X). */
  cc: number;
  /** Arm front pulley ahead of the front upright; seat box length and seat top; footplate reach from the front upright. */
  armReach: number; seatBox: number; seatTop: number; thigh0: number; thighStep: number; thighCount: number;
  stack: readonly number[];
  /** Overall bounding box (the lat bar hangs wider than the published base width). */
  width: number; depth: number;
}
/** Titan Lat Tower | 10–300 lb selector (400467): 87" H × 41" W × 57" D, 48" × 1" knurled stainless lat bar, 14" low-row handle,
 * 17" × 9" footplate, 10 lb start / 300 lb stack, 1:1, 3" × 3" 11 ga uprights with 1" holes. */
export const TITAN_LAT_DIMS: LatTowerDims = { height: inch(87), length: inch(57), baseWidth: inch(41), latBar: inch(48), tube: inch(3), cc: 560, armReach: 360, seatBox: 470, seatTop: 480, thigh0: 640, thighStep: inch(1.5), thighCount: 6, stack: stackWeights(10, 10, 300), width: inch(48), depth: inch(57) };
export const TITAN_LAT_TOWER = defineFloorPart({
  id: 'titan-lat-tower-300', name: 'Titan Lat Tower', title: 'Titan Lat Tower Pulldown & Cable Row (10–300 lb selector)', noun: 'lat tower', section: 'Machines',
  description: `Titan Fitness Lat Tower Pulldown & Cable Row Machine with the 10–300 lb selector stack: 3" × 3" uprights, forward TITAN lat arm with a 48" knurled stainless bar, red anodized pulleys, seat box with adjustable thigh rollers and footplate. ${TAIL}; Titan Fitness trademarks belong to Titan Fitness.`,
  params: [
    { key: 'pin', label: 'Selector pin', default: 100, options: TITAN_LAT_DIMS.stack, format: pounds },
    { key: 'thigh', label: 'Thigh pad height', default: 3, options: range(1, TITAN_LAT_DIMS.thighCount), format: v => `Position ${v}` },
  ],
  footprint: { width: TITAN_LAT_DIMS.width, depth: TITAN_LAT_DIMS.depth },
  placement: { side: 'right', gap: 400 },
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/lat-tower-10-300-lb-selector', credit: 'Titan Fitness — Lat Tower Pulldown & Cable Row Machine, 10–300 LB Selector (400467)', trademark: 'Titan Fitness and TITAN are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 87 × 41 × 57 in envelope, 48 in lat bar, 17 × 9 in footplate and 10–300 lb stack chart, and 12 product photos. Upright spacing, arm and seat-box outlines and cable routing estimated; scenery only, excluded from print export.' },
});
/** Bells of Steel Lat Pulldown Low Row Machine (LAT-MA / PLT-LAT-MA): 87" H × 42" W × 70" L, 310 lb stack in 10 lb steps or
 * Olympic plate-loaded carriage, 1:1, aluminium pulleys, 3" × 3" Hydra-style uprights. */
export const BOS_LAT_DIMS: LatTowerDims = { height: inch(87), length: inch(70), baseWidth: inch(42), latBar: inch(48), tube: inch(3), cc: 600, armReach: 660, seatBox: 640, seatTop: 450, thigh0: 690, thighStep: inch(1.5), thighCount: 6, stack: stackWeights(10, 10, 310), width: inch(48), depth: inch(70) };
export const BOS_LAT_LOADING = ['Weight stack 310 lb', 'Plate loaded'] as const;
export const BOS_LAT_PULLDOWN = defineFloorPart({
  id: 'bells-of-steel-lat-pulldown-low-row', name: 'Bells of Steel Lat Pulldown', title: 'Bells of Steel Lat Pulldown Low Row Machine', noun: 'lat pulldown', section: 'Machines',
  description: `Bells of Steel Lat Pulldown / Low Row Machine: 3" × 3" frame with a 310 lb (10 lb step) stack or Olympic plate-loaded carriage, bolted forward lat arm, aluminium pulleys, BELLS OF STEEL seat box with twin knee pads and a diamond-plate footplate. ${TAIL}; Bells of Steel trademarks belong to Bells of Steel.`,
  params: [
    { key: 'loading', label: 'Loading', default: 0, options: [0, 1], format: v => BOS_LAT_LOADING[v] ?? String(v) },
    { key: 'pin', label: 'Selector pin', default: 100, options: p => p.loading ? [0] : BOS_LAT_DIMS.stack, format: v => v ? pounds(v) : 'Plate loaded' },
    loadedParam(6, 0, p => p.loading === 1),
    { key: 'thigh', label: 'Knee pad height', default: 3, options: range(1, BOS_LAT_DIMS.thighCount), format: v => `Position ${v}` },
  ],
  footprint: { width: BOS_LAT_DIMS.width, depth: BOS_LAT_DIMS.depth },
  placement: { side: 'right', gap: 400 },
  vendor: { vendor: 'Bells of Steel', url: 'https://bellsofsteel.com/products/lat-pulldown-low-row-machine', credit: 'Bells of Steel — Lat Pulldown Low Row Machine (310 lb stack and plate loaded)', trademark: 'Bells of Steel is a trademark of Bells of Steel Manufacturing.', reconstruction: 'Independent Manifold reconstruction from the published 42 × 70 × 87 in footprint, 310 lb / 10 lb stack chart and 18 product photos. Upright spacing, arm plates, seat-box outline and cable routing estimated; scenery only, excluded from print export.' },
});

/** Titan Plate-Loaded Lat Pull Down & Cable Row V2 (400895 / SALPLRv2): 85" H × 57" D, 1100 mm rear guide-frame tube (manual
 * part 8, the widest member; Titan lists 47" overall width), 13" loadable sleeve, 37.5" lat bar, 15" low-row handle, Φ95 pulleys,
 * 280 × 300 × 60 seat cushion, Φ100 × 180 thigh foams with four positions, 400 lb capacity, 1:1. */
export const TITAN_PLATE_LAT_DIMS = { height: inch(85), length: inch(57), rearTube: 1100, sleeve: inch(13), latBar: inch(37.5), lowRow: inch(15), pulley: 95, thighCount: 4, maxPlates: 8, width: 1100, depth: inch(57),
  /** Build frame: upright at y = 0, rear tube back face and the plate-horn centre behind it; loaded 45 lb plates (Ø448) overhang the rear tube. */
  rearFace: 325, hornY: 175 } as const;
/** Loaded plates reach past the rear tube; the machine stays put and the footprint grows backwards (floor Z is build -Y). */
export const titanPlateLatFootprint = (p: NumericParams) => {
  const D = TITAN_PLATE_LAT_DIMS, extra = p.loaded ? Math.max(0, D.hornY + 224 - D.rearFace) : 0;
  return { width: D.width, depth: D.depth + extra, offset: [0, -extra / 2] as [number, number] };
};
export const TITAN_PLATE_LAT = defineFloorPart({
  id: 'titan-plate-loaded-lat-pulldown', name: 'Titan Plate-Loaded Lat Pulldown', title: 'Titan Plate-Loaded Lat Pull Down & Cable Row', noun: 'lat pulldown', section: 'Machines',
  description: `Titan Fitness Plate-Loaded Lat Pull Down & Cable Row Machine (V2): single upright with a forward top beam and bar hook, twin chrome guide rods carrying a 13" plate horn, 37.5" lat bar, low-row cable and handle, seat with four-position thigh foams and twin diamond footplates. ${TAIL}; Titan Fitness trademarks belong to Titan Fitness.`,
  params: [
    { key: 'loaded', label: 'Loaded plates', default: 2, options: range(0, TITAN_PLATE_LAT_DIMS.maxPlates), format: v => v ? `${v} × 45 lb (${v * 45} lb)` : 'Empty' },
    { key: 'thigh', label: 'Thigh pad height', default: 2, options: range(1, TITAN_PLATE_LAT_DIMS.thighCount), format: v => `Position ${v}` },
  ],
  footprint: titanPlateLatFootprint,
  placement: { side: 'right', gap: 400 },
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/plate-loaded-lat-tower', credit: 'Titan Fitness — Plate-Loaded Lat Pull Down & Cable Row Machine V2 (400895)', trademark: 'Titan Fitness and TITAN are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 85 in height, 57 in depth, 13 in sleeve, 37.5 in lat bar and 15 in row handle, the SALPLRv2 operator manual parts list (1100 mm rear tube, Φ95 pulleys, 280 × 300 mm seat, Φ100 × 180 foams) and 14 photos. Titan lists 47 in overall width; the model spans the 1100 mm rear tube. Tube sections and cable routing estimated; scenery only, excluded from print export.' },
});

/** Titan Wall and Rack Mounted Pulley Tower V3 (401866 short 80.5" / 401867 tall 84.5"): 25" W × 27.5" D, 2" × 2" steel tube,
 * 18 trolley positions, twin 10.25" × 1" weight posts with 2" Olympic adapter sleeves, 2:1 dual-handle multi-pulley bracket,
 * 13 pulleys (operator manual SHPULTWRv3b), 350 lb capacity. */
export const TITAN_PULLEY_DIMS = { heights: [inch(80.5), inch(84.5)], width: inch(25), depth: inch(27.5), tube: inch(2), positions: 18, post: inch(10.25), maxPlates: 7 } as const;
export const TITAN_PULLEY_TOWER = defineFloorPart({
  id: 'titan-wall-pulley-tower', name: 'Titan Pulley Tower', title: 'Titan Wall and Rack Mounted Pulley Tower', noun: 'pulley tower', section: 'Machines',
  description: `Titan Fitness Wall and Rack Mounted Pulley Tower V3 (80.5" short or 84.5" tall): 2" × 2" front upright with an 18-position multi-pulley bracket and twin swivel pulleys, plate-loaded weight carriage on the rear guide tube with 10.25" posts and 2" sleeves, H base and wall brackets. ${TAIL}; Titan Fitness trademarks belong to Titan Fitness.`,
  params: [
    { key: 'height', label: 'Height', default: 0, options: [0, 1], format: v => v ? 'Tall 84.5"' : 'Short 80.5"' },
    holeParam('carriage', 'Trolley position', TITAN_PULLEY_DIMS.positions, 14),
    { key: 'loaded', label: 'Loaded plates', default: 2, options: range(0, TITAN_PULLEY_DIMS.maxPlates), format: v => v ? `${v} × 45 lb (${v * 45} lb)` : 'Empty' },
  ],
  footprint: { width: TITAN_PULLEY_DIMS.width, depth: TITAN_PULLEY_DIMS.depth },
  placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/short-wall-mounted-pulley-tower-v3', credit: 'Titan Fitness — Wall and Rack Mounted Pulley Tower V3 (401866 / 401867)', trademark: 'Titan Fitness and TITAN are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 80.5/84.5 in heights, 25 × 27.5 in base, 2 × 2 in tube, 10.25 in × 1 in weight posts and 18 trolley positions, the V3 operator manual exploded view (13 pulleys, H base, guide tube, wall frames) and 24 photos. Hole pitch, bracket outlines and cable routing estimated; scenery only, excluded from print export.' },
});

// ------------------------------------------------------------------------------------------------ REP Arcadia
/** REP Fitness Arcadia Functional Trainer (FT-3500): 80.8" H (78" with the multi-grip bar inverted) × 55.3" W × 35.8" D, 42" between
 * uprights, dual 170 lb stacks (220 lb upgrade) in 10 lb steps with 20 lb minimum, 2:1, 32 laser-numbered trolley positions from
 * 13" to 68", aluminium pulleys, metallic black shrouds, pegboard storage. */
export const REP_ARCADIA_DIMS = { height: inch(80.8), invertedHeight: inch(78), width: inch(55.3), depth: inch(35.8), positions: 32, low: inch(13), high: inch(68) } as const;
export const repArcadiaWeights = (p: NumericParams) => stackWeights(20, 10, p.stack ? 220 : 170);
export const REP_ARCADIA = defineFloorPart({
  id: 'rep-arcadia-functional-trainer', name: 'REP Arcadia', title: 'REP Arcadia Functional Trainer', noun: 'functional trainer', section: 'Machines',
  description: `REP Fitness Arcadia Functional Trainer: twin metallic-black shrouded stacks (170 lb, or 220 lb upgrade), laser-numbered 32-position trolleys on stainless strips, built-in multi-grip pull-up bar (normal or inverted) and pegboard storage between the towers. ${TAIL}; REP Fitness trademarks belong to REP Fitness.`,
  params: [
    { key: 'stack', label: 'Weight stacks', default: 0, options: [0, 1], format: v => v ? '2 × 220 lb (upgrade)' : '2 × 170 lb' },
    { key: 'pin', label: 'Selector pins', default: 60, options: repArcadiaWeights, format: pounds },
    holeParam('left', 'Left trolley', REP_ARCADIA_DIMS.positions, 26),
    holeParam('right', 'Right trolley', REP_ARCADIA_DIMS.positions, 26),
    { key: 'bar', label: 'Multi-grip bar', default: 0, options: [0, 1], format: v => v ? 'Inverted (78")' : 'Standard (80.8")' },
  ],
  footprint: { width: REP_ARCADIA_DIMS.width, depth: REP_ARCADIA_DIMS.depth },
  placement: { side: 'back', gap: 300 },
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/arcadia-functional-trainer', credit: 'REP Fitness — Arcadia Functional Trainer (FT-3500)', trademark: 'REP, REP Fitness and Arcadia are trademarks of REP Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 80.8/78 in height, 55.3 × 35.8 in footprint, 42 in between uprights, 170/220 lb stacks and 13–68 in trolley range, with 18 product and review photos. Shroud, foot and trolley outlines, stack plate size and cable routing estimated; scenery only, excluded from print export.' },
});

// ------------------------------------------------------------------------------------------------ Inspire FTX
/** Inspire Fitness FTX Functional Trainer (FTX.2PK): 54" W × 40" D × 82" H, V-corner layout, 2 × 165 lb stacks (15 lb selector +
 * fifteen 10 lb plates, owner's manual step 2B), 2:1, 30 swivel-pulley positions, built-in pull-up bar, matte black. */
export const INSPIRE_FTX_DIMS = { height: inch(82), width: inch(54), depth: 1016.7, positions: 30, angle: 20 } as const;
export const inspireFtxWeights = stackWeights(15, 10, 165);
export const INSPIRE_FTX = defineFloorPart({
  id: 'inspire-ftx-functional-trainer', name: 'Inspire FTX', title: 'Inspire FTX Functional Trainer', noun: 'functional trainer', section: 'Machines',
  description: `Inspire Fitness FTX Functional Trainer: V-corner twin towers with 165 lb stacks, chrome carriage tubes with 30 swivel-pulley positions and red lock levers, INSPIRE top caps, arched rear brace, accessory hanger and pull-up bar. ${TAIL}; Inspire Fitness trademarks belong to Health in Motion LLC.`,
  params: [
    { key: 'pin', label: 'Selector pins', default: 55, options: inspireFtxWeights, format: pounds },
    holeParam('left', 'Left pulley position', INSPIRE_FTX_DIMS.positions, 28),
    holeParam('right', 'Right pulley position', INSPIRE_FTX_DIMS.positions, 28),
  ],
  footprint: { width: INSPIRE_FTX_DIMS.width, depth: INSPIRE_FTX_DIMS.depth },
  placement: { side: 'back', gap: 300 },
  vendor: { vendor: 'Inspire Fitness', url: 'https://inspirefitness.com/products/ftx-functional-trainer', credit: 'Inspire Fitness — FTX Functional Trainer', trademark: 'Inspire Fitness and FTX are trademarks of Health in Motion LLC.', reconstruction: 'Independent Manifold reconstruction from the published 54 × 40 × 82 in envelope, 2 × 165 lb stacks and 30 pulley positions, the FTX owner\'s manual assembly drawings and 9 product photos. Tower angle, tube sections and cable routing estimated; scenery only, excluded from print export.' },
});

// ------------------------------------------------------------------------------------------------ REP Adonis
/** REP Fitness Adonis Cable Tower (MT-5000): 92.1" H × 54.9" D (footplate retracted) × 45.5" W with base; base 45.9" × 23.5" × 14.4";
 * 3" × 3" 11 ga uprights, 1" holes on 2" centres; 34 trolley positions from 14" to 79"; 2:1 trolley, 1:1 lat/row; 6.3" loadable
 * horns; optional 210 lb selector stack (10 lb steps); metallic black; aluminium pulleys. */
export const REP_ADONIS_DIMS = { height: inch(92.1), depth: inch(54.9), baseWidth: inch(45.9), baseDepth: inch(23.5), baseHeight: inch(14.4), positions: 34, low: inch(14), high: inch(79), horn: inch(6.3), latBar: inch(41), maxPlates: 8, stack: stackWeights(10, 10, 210) } as const;
export const REP_ADONIS_LOADING = ['Plate-loaded', 'Plate-loaded + selectorized'] as const;
export const REP_ADONIS = defineFloorPart({
  id: 'rep-adonis-cable-tower', name: 'REP Adonis', title: 'REP Adonis Cable Tower', noun: 'cable tower', section: 'Machines',
  description: `REP Fitness Adonis Cable Tower: 3" × 3" tower with REP shroud panels, 34-position 2:1 trolley, forward lat arm and footplate for 1:1 pulldowns and rows, plate-loaded carriage (6.3" horns) with the optional 210 lb selector stack, and the storage base. ${TAIL}; REP Fitness trademarks belong to REP Fitness.`,
  params: [
    { key: 'loading', label: 'Loading', default: 0, options: [0, 1], format: v => REP_ADONIS_LOADING[v] ?? String(v) },
    { key: 'pin', label: 'Selector pin', default: 0, options: p => p.loading ? REP_ADONIS_DIMS.stack : [0], format: v => v ? pounds(v) : 'Plate loaded' },
    { key: 'loaded', label: 'Loaded plates', default: 2, options: range(0, REP_ADONIS_DIMS.maxPlates), format: v => v ? `${v} × 45 lb (${v * 45} lb)` : 'Empty' },
    holeParam('carriage', 'Trolley position', REP_ADONIS_DIMS.positions, 20),
    { key: 'base', label: 'Base', default: 1, options: [0, 1], format: v => v ? 'Adonis base' : 'No base (rack or wall anchored)' },
  ],
  footprint: p => ({ width: p.base ? REP_ADONIS_DIMS.baseWidth : REP_ADONIS_DIMS.latBar, depth: REP_ADONIS_DIMS.depth }),
  placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/adonis-cable-tower', credit: 'REP Fitness — Adonis Cable Tower (MT-5000)', trademark: 'REP, REP Fitness and Adonis are trademarks of REP Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 92.1 in height, 54.9 in depth, 45.5/45.9 in base width, 14–79 in trolley range, 6.3 in horns and 210 lb stack, with 29 product photos. Upright spacing, shroud and arm outlines, lat bar length and cable routing estimated; scenery only, excluded from print export.' },
});

// ------------------------------------------------------------------------------------------------ Force USA Functional Trainer Rack
/** Force USA Functional Trainer Rack (FTR, F-FTR-JH-SA): exterior 49" W × 43" D × 87" H, interior 43" × 33" × 81"; 3" × 3" 11 ga
 * uprights, 1" holes on 2" spacing; dual 200 lb stacks (250/300 lb upgrades), 2:1 freestyle pulley arms on reversible trolleys,
 * polished aluminium pulleys, matte black with hex-pattern plates, pegboard and shelf storage. */
export const FORCE_FTR_DIMS = { height: inch(87), frameWidth: inch(49), depth: inch(43), tube: inch(3), holes: 33, stacks: [200, 250, 300] } as const;
export const forceFtrWeights = (p: NumericParams) => stackWeights(10, 10, FORCE_FTR_DIMS.stacks[p.stack] ?? 200);
/** The freestyle arms project past the 49" frame at their resting angle; the model's X extent includes them. */
export const FORCE_FTR_ARM_REACH = 337.9;
export const FORCE_FTR = defineFloorPart({
  id: 'force-usa-functional-trainer-rack', name: 'Force USA FTR', title: 'Force USA Functional Trainer Rack', noun: 'functional trainer', section: 'Machines',
  description: `Force USA Functional Trainer Rack (FTR): 3" × 3" half-rack frame with twin 200 lb stacks (250/300 lb upgrades) in the rear bays, freestyle pulley arms on 2:1 trolleys up the front uprights, hex-pattern FORCE USA side plates, pegboard, shelf and suspension anchor. ${TAIL}; Force USA trademarks belong to Johnson Health Tech.`,
  params: [
    { key: 'stack', label: 'Weight stacks', default: 0, options: [0, 1, 2], format: v => `2 × ${FORCE_FTR_DIMS.stacks[v] ?? v} lb` },
    { key: 'pin', label: 'Selector pins', default: 60, options: forceFtrWeights, format: pounds },
    holeParam('left', 'Left trolley', FORCE_FTR_DIMS.holes, 32),
    holeParam('right', 'Right trolley', FORCE_FTR_DIMS.holes, 32),
  ],
  footprint: { width: inch(49) + 2 * FORCE_FTR_ARM_REACH, depth: inch(43) },
  placement: { side: 'back', gap: 300 },
  vendor: { vendor: 'Force USA', url: 'https://www.forceusa.com/products/functional-trainer-rack', credit: 'Force USA — Functional Trainer Rack (FTR)', trademark: 'Force USA is a trademark of Johnson Health Tech.', reconstruction: 'Independent Manifold reconstruction from the published 49 × 43 × 87 in exterior and 43 × 33 × 81 in interior dimensions, 3 × 3 in uprights with 1 in holes on 2 in spacing, 200/250/300 lb stacks and 9 product images including front and side dimension drawings. Bay spacing, arm and cap outlines and cable routing estimated; scenery only, excluded from print export.' },
});

// ------------------------------------------------------------------------------------------------ Major Fitness B52
/** Major Fitness Spirit B52 All-In-One Home Gym (B52BL / B52PRO): 78.7" W × 66.9" D × 82.6" H, interior 43.0" × 55.2";
 * 2" × 3" 14 ga uprights (Pro: 12 ga front, 2" × 2" middle); Smith bar (10 positions), 17 cable positions, 2:1; Standard is
 * plate-loaded with plastic pulleys, Pro adds dual weight stacks and aluminium pulleys. Tactical Black, Recon Desert, Patriot Blue. */
export const MAJOR_B52_DIMS = { width: inch(78.7), depth: inch(66.9), height: inch(82.6), interior: inch(43), cable: 17, stack: stackWeights(10, 10, 170), maxPlates: 6 } as const;
export const MAJOR_B52_COLORS = [['Tactical Black', '#1c1d1f'], ['Recon Desert', '#b59f7c'], ['Patriot Blue', '#2c5da8']] as const;
export const MAJOR_B52 = defineFloorPart({
  id: 'major-fitness-b52', name: 'Major Fitness B52', title: 'Major Fitness B52 All-In-One Home Gym', noun: 'home gym', section: 'Machines',
  description: `Major Fitness Spirit B52 all-in-one: 2" × 3" power rack with a Smith bar, J-hooks, safety arms, multi-grip pull-up top, 17-position 2:1 cable columns fed by plate-loaded carriages (Standard) or twin weight stacks (Pro), low-row footplate, landmine and plate storage, in Tactical Black, Recon Desert or Patriot Blue. ${TAIL}; Major Fitness trademarks belong to Major Fitness.`,
  params: [
    { key: 'model', label: 'Model', default: 0, options: [0, 1], format: v => v ? 'B52 Pro (weight stacks)' : 'B52 Standard (plate loaded)' },
    { key: 'color', label: 'Colour', default: 0, options: [0, 1, 2], format: v => MAJOR_B52_COLORS[v]?.[0] ?? String(v) },
    { key: 'pin', label: 'Selector pins', default: 0, options: p => p.model ? MAJOR_B52_DIMS.stack : [0], format: v => v ? pounds(v) : 'Plate loaded' },
    { key: 'loaded', label: 'Loaded plates', default: 2, options: p => p.model ? [0] : range(0, MAJOR_B52_DIMS.maxPlates), format: v => v ? `${v} × 45 lb (${v * 45} lb)` : 'Empty' },
    holeParam('carriage', 'Cable position', MAJOR_B52_DIMS.cable, 15),
    { key: 'smith', label: 'Smith bar', default: 8, options: range(1, 10), format: v => `Hook ${v}` },
  ],
  footprint: { width: MAJOR_B52_DIMS.width, depth: MAJOR_B52_DIMS.depth },
  placement: { side: 'back', gap: 300 },
  vendor: { vendor: 'Major Fitness', url: 'https://www.majorfitness.com/products/all-in-one-home-gym-smith-machine-spirit-b52', credit: 'Major Fitness — Spirit B52 All-In-One Home Gym Smith Machine (Standard and Pro)', trademark: 'Major Fitness and Spirit B52 are trademarks of Major Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 78.7 × 66.9 × 82.6 in envelope, 43 × 55.2 in interior, 2 × 3 in tube, 17 cable and 10 Smith positions and 28 product renders across models and colourways. Upright spacing, attachment outlines, stack plate size and cable routing estimated; scenery only, excluded from print export.' },
});

export const PARTS = [BOS_CABLE_TOWER, TOG_MULTI_FLIGHT, TITAN_PLATE_LAT, TITAN_LAT_TOWER, REP_ARCADIA, TITAN_PULLEY_TOWER, REP_ADONIS, INSPIRE_FTX, BOS_LAT_PULLDOWN, FORCE_FTR, MAJOR_B52] as const satisfies readonly FloorPart[];
