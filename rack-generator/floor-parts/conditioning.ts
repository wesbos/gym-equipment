/** Sleds, battle ropes and plyo boxes. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 *
 * Specs, sources and every estimate are recorded in ../research/conditioning.md. Swept parts (ropes, the jump rope and the
 * TANK M1's tubes and tyres) take their footprints from the exact vertices in ./conditioning-layouts.ts, which the builders
 * reuse; box-built parts use their published dimensions. Frame: X across, Y along the part (sled length), Z up. */
import { defineFloorPart, type FloorParam, type FloorPart } from '../floor-part.ts';
import { plateStackLength, type PlateId } from '../plates.ts';
import type { NumericParams } from '../types.ts';
import { ROPE_POSES, JUMP_ROPE_POSES, TANK_BAR_POSES, jumpRopeLayout, ropeLayout, tankLayout, type RopeSpec } from './conditioning-layouts.ts';
export const inch = (v: number) => v * 25.4;
const enumParam = (key: string, label: string, names: readonly string[], def = 0): FloorParam => ({ key, label, default: def, options: names.map((_, i) => i), format: v => names[v] ?? String(v) });
const recon = (published: string, estimated: string) => `Independent Manifold reconstruction from ${published}. ${estimated} Scenery only, excluded from print export.`;
const size = (b: { min: number[]; max: number[] }) => ({ width: b.max[0] - b.min[0], depth: b.max[1] - b.min[1] });
// ------------------------------------------------------------------------------------------------ sled loads
export interface SledLoad { label: string; plates: readonly PlateId[] }
/** Plate stacks on the sled horn, bottom plate first (largest down). Options are filtered to what fits the loadable post. */
export const SLED_LOADS: readonly SledLoad[] = [
  { label: 'Empty', plates: [] },
  { label: '45 lb iron', plates: ['lb45'] },
  { label: '2 × 45 lb iron', plates: ['lb45', 'lb45'] },
  { label: '3 × 45 lb iron', plates: ['lb45', 'lb45', 'lb45'] },
  { label: '4 × 45 lb iron', plates: ['lb45', 'lb45', 'lb45', 'lb45'] },
  { label: '6 × 45 lb iron', plates: Array<PlateId>(6).fill('lb45') },
  { label: '2 × 25 lb iron', plates: ['lb25', 'lb25'] },
  { label: '25 kg bumper', plates: ['kg25'] },
  { label: '2 × 25 kg bumpers', plates: ['kg25', 'kg25'] },
  { label: '4 × 25 kg bumpers', plates: ['kg25', 'kg25', 'kg25', 'kg25'] },
  { label: '20 + 15 + 10 kg bumpers', plates: ['kg20', 'kg15', 'kg10'] },
  { label: '2 × 20 kg bumpers', plates: ['kg20', 'kg20'] },
];
export const sledLoadOptions = (loadable: number) => SLED_LOADS.flatMap((l, i) => plateStackLength(l.plates) <= loadable ? [i] : []);
const loadParam = (loadable: (p: NumericParams) => number, def: number): FloorParam => ({ key: 'load', label: 'Plates on the horn', default: def, options: p => sledLoadOptions(loadable(p)), format: v => SLED_LOADS[v]?.label ?? String(v) });
// ------------------------------------------------------------------------------------------------ plate sleds
export interface TubeSledSpec {
  brand: 'rogue' | 'titan'; L: number; W: number; /** Push pole tops */ H: number; tube: { w: number; h: number }; skid: number; ends: 'skid' | 'shoe';
  deck: { l: number; w: number; drop: number }; horn: { d: number; loadable: number }; pole: number; receiver: { d: number; h: number; inset: number };
  holes: { d: number; pitch: number }; disc?: { d: number; t: number };
}
/** Rogue Dog Sled 1.2: 40 × 24 × 39.5", 2 × 3" 11 ga runners on 4" skids, 1.9" push poles. */
export const DOG_SLED: TubeSledSpec = {
  brand: 'rogue', L: inch(40), W: inch(24), H: inch(39.5), tube: { w: inch(2), h: inch(3) }, skid: inch(4), ends: 'skid',
  deck: { l: inch(18), w: inch(18.5), drop: 10 }, horn: { d: inch(1.9), loadable: inch(16) }, pole: inch(1.9), receiver: { d: inch(2.375), h: 64, inset: 130 },
  holes: { d: inch(.75), pitch: inch(2) },
};
/** Titan Pro Sled core: 40 × 24", 37" poles to 39", 48 mm horn with 17" loadable, UHMW shoes, rubber divider disc. */
export const TITAN_SLED: TubeSledSpec = {
  brand: 'titan', L: inch(40), W: inch(24), H: inch(39), tube: { w: inch(2), h: inch(3) }, skid: inch(3), ends: 'shoe',
  deck: { l: inch(19), w: inch(18.5), drop: 6 }, horn: { d: 48, loadable: inch(17) }, pole: 48, receiver: { d: 60.3, h: 60, inset: 118 },
  holes: { d: inch(.75), pitch: inch(2) }, disc: { d: 200, t: 10 },
};
/** Rogue Echo Dog Sled: 36.5 × 25 × 37.5", single 0.25" formed plate base, 17" loadable post. */
export const ECHO_SLED = { L: inch(36.5), W: inch(25), H: inch(37.5), t: inch(.25), skid: inch(3.5), wall: 22, deckZ: inch(4.5), horn: { d: inch(1.9), loadable: inch(17) }, pole: inch(1.9), receiver: { d: inch(2.375), h: inch(3) } } as const;
/** Rogue Slice Sled: 27.5 × 22.75 × 37.25", 0.25" laser-cut formed steel, fold-flat 14" post. */
export const SLICE_SLED = { L: inch(27.5), W: inch(22.75), H: inch(37.25), t: inch(.25), wallRear: 118, wallFront: 14, horn: { d: inch(1.9), loadable: inch(14) }, postFromRear: 235, pole: inch(1.9), receiver: { d: inch(2.375), h: 70 } } as const;
export const SLICE_POSTS = ['Weight post up', 'Folded flat for storage'] as const;
const sledVendor = (vendor: string, url: string, credit: string, trademark: string, published: string, estimated: string) => ({ vendor, url, credit, trademark, reconstruction: recon(published, estimated) });
export const TORQUE_TANK_M1 = defineFloorPart({
  id: 'torque-tank-m1-push-sled', name: 'TANK M1 push sled', title: 'Torque TANK M1 push sled', noun: 'sled', section: 'Cardio',
  description: 'Torque Fitness TANK M1 all-surface push sled: three-wheel chassis with the Mag-Force resistance wheel in the nose housing, twin Y push handles on the rear axle, a pivoting push/pull bar and a plate horn. Independent reconstruction; Torque and TANK trademarks belong to Torque Fitness.',
  params: [enumParam('bar', 'Push/pull bar', TANK_BAR_POSES), loadParam(() => 164, 1)],
  footprint: p => size(tankLayout(p.bar).bounds), clearance: p => ({ width: 1100, depth: size(tankLayout(p.bar).bounds).depth + 2400 }),
  placement: { side: 'front', gap: 600 },
  vendor: sledVendor('Torque Fitness', 'https://www.torquefitness.com/products/tank-m1-push-sled', 'Torque Fitness — TANK M1 Push Sled (XTTM1-RPH-103)', 'Torque, TANK and Mag-Force are trademarks of Torque Fitness.',
    'the XTTM1-RPH-103 assembly guide (1370 × 808 × 957 mm with the bar forward, scaled top and side drawings, 10" rear wheels), the published 45.1 × 31.9 × 37.5" envelope and 19 vendor photos',
    'Tube diameters, housing contour, grip angles and tread pattern are drawing/photo estimates; the optional console, dumbbell cradles and straps are not modelled.'),
});
export const ROGUE_SLICE_SLED = defineFloorPart({
  id: 'rogue-slice-sled', name: 'Slice Sled', title: 'Rogue Slice Sled', noun: 'sled', section: 'Cardio',
  description: 'Rogue Slice Sled: laser-cut 1/4" steel push/drag sled with tapered ROGUE runners, rear push poles, a strap anchor and a 14" weight post that folds flat. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [enumParam('post', 'Weight post', SLICE_POSTS), loadParam(p => p.post ? 0 : SLICE_SLED.horn.loadable, 2)],
  footprint: { width: SLICE_SLED.W, depth: SLICE_SLED.L }, clearance: { width: 1000, depth: SLICE_SLED.L + 2400 }, placement: { side: 'front', gap: 600 },
  vendor: sledVendor('Rogue Fitness', 'https://www.roguefitness.com/rogue-slice-sled', 'Rogue Fitness — Rogue Slice Sled', 'Rogue is a trademark of Rogue Fitness.',
    'the published 27.5 × 22.75 × 37.25" dimensions, 14" loadable post, 0.25" plate and 9 vendor photos (including the RA1266 runner outline)',
    'Runner wall heights, taper, pole Ø (1.9") and post position are photo estimates; the 16\' strap is not modelled.'),
});
export const ROGUE_ECHO_DOG_SLED = defineFloorPart({
  id: 'rogue-echo-dog-sled', name: 'Echo Dog Sled', title: 'Rogue Echo Dog Sled', noun: 'sled', section: 'Cardio',
  description: 'Rogue Echo Dog Sled: budget push/pull sled cut from one 1/4" plate, formed runners with upturned tips, a bolted ROGUE saddle, four pole sleeves and a 17" loadable post. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [loadParam(() => ECHO_SLED.horn.loadable, 3)],
  footprint: { width: ECHO_SLED.W, depth: ECHO_SLED.L }, clearance: { width: 1100, depth: ECHO_SLED.L + 2400 }, placement: { side: 'front', gap: 600 },
  vendor: sledVendor('Rogue Fitness', 'https://www.roguefitness.com/rogue-echo-dog-sled', 'Rogue Fitness — Rogue Echo Dog Sled', 'Rogue and Echo are trademarks of Rogue Fitness.',
    'the published 36.5 × 25 × 37.5" dimensions, 17" loadable length, 0.25" plate and 10 vendor photos (including a top view of the saddle)',
    'Runner wall and saddle heights, window outline and pole/sleeve sizes are photo estimates.'),
});
export const TITAN_PRO_SLED = defineFloorPart({
  id: 'titan-pro-sled-system', name: 'Pro Sled', title: 'Titan Pro Sled System', noun: 'sled', section: 'Cardio',
  description: 'Titan Fitness Pro Sled System (core unit + two poles): 2 × 3" runners with 2" hole spacing, UHMW ski shoes, 48 mm poles and horn, rubber divider disc. Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [loadParam(() => TITAN_SLED.horn.loadable, 10)],
  footprint: { width: TITAN_SLED.W, depth: TITAN_SLED.L }, clearance: { width: 1100, depth: TITAN_SLED.L + 2400 }, placement: { side: 'front', gap: 600 },
  vendor: sledVendor('Titan Fitness', 'https://titan.fitness/products/pro-sled-system', 'Titan Fitness — Pro Sled System (PROSLED-GROUP / 401816 core)', 'Titan Fitness is a trademark of Titan Fitness.',
    'the published dimension graphic (40 × 24", 39" to the pole tops, 37" poles, 48 mm poles and horn, 17" loadable) and 12 vendor photos',
    'Tube size (2 × 3"), shoe outline, deck size and divider-disc size are photo estimates.'),
});
export const ROGUE_DOG_SLED = defineFloorPart({
  id: 'rogue-dog-sled', name: 'Dog Sled 1.2', title: 'Rogue Dog Sled 1.2', noun: 'sled', section: 'Cardio',
  description: 'Rogue Dog Sled 1.2: 2 × 3" 11 ga runners on 4" skids with attachment holes, four pole sleeves, 1.9" push poles, a bolted 1/4" deck with carabiner slot and a centre horn. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [loadParam(() => DOG_SLED.horn.loadable, 3)],
  footprint: { width: DOG_SLED.W, depth: DOG_SLED.L }, clearance: { width: 1100, depth: DOG_SLED.L + 2400 }, placement: { side: 'front', gap: 600 },
  vendor: sledVendor('Rogue Fitness', 'https://www.roguefitness.com/rogue-dog-sled', 'Rogue Fitness — Rogue Dog Sled 1.2 (XX2044)', 'Rogue is a trademark of Rogue Fitness.',
    'the published 40 × 24 × 39.5" footprint, 4" skids, 2 × 3" 11 ga tube, 1.9" handles and 9 vendor photos',
    'Horn length (16"), deck size, sleeve height and hole layout are photo estimates.'),
});
// ------------------------------------------------------------------------------------------------ battle ropes
export interface RopeColour { name: string; color: string }
export const REP_ROPE_COLOURS: readonly RopeColour[] = [{ name: 'Red', color: '#c21f2a' }, { name: 'Blue', color: '#1f6cc4' }, { name: 'Black', color: '#1e1f21' }];
export const REP_ROPE_SIZES = [{ d: 1.5, ft: 30 }, { d: 1.5, ft: 50 }, { d: 2, ft: 30 }, { d: 2, ft: 50 }] as const;
export const AMAZON_ROPE_SIZES = [{ d: 1.5, ft: 30 }, { d: 2, ft: 30 }] as const;
export const TITAN_ROPE_LENGTHS = [30, 40, 50] as const;
export const TITAN_ROPE_DIAMETERS = [1.5, 2] as const;
const ft = (v: number) => v * 304.8;
export const amazonRope = (p: NumericParams): RopeSpec => { const s = AMAZON_ROPE_SIZES[p.size]; return { kind: 'twisted', D: inch(s.d), L: ft(s.ft), handle: 205, handleD: inch(s.d) + 3.5, tracer: true }; };
export const repRope = (p: NumericParams): RopeSpec => { const s = REP_ROPE_SIZES[p.size]; return { kind: 'sleeve', D: inch(s.d), L: ft(s.ft), handle: 235, handleD: inch(s.d) + 12, tracer: false }; };
export const titanRope = (p: NumericParams): RopeSpec => ({ kind: 'twisted', D: inch(TITAN_ROPE_DIAMETERS[p.diameter]), L: ft(TITAN_ROPE_LENGTHS[p.length]), handle: 185, handleD: inch(TITAN_ROPE_DIAMETERS[p.diameter]) + 3.5, tracer: false });
const poseParam = enumParam('pose', 'Pose', ROPE_POSES);
const ropeFootprint = (spec: (p: NumericParams) => RopeSpec) => (p: NumericParams) => size(ropeLayout(spec(p), p.pose).bounds);
export const AMAZON_BASICS_BATTLE_ROPE = defineFloorPart({
  id: 'amazon-basics-battle-rope', name: 'Amazon Basics battle rope', title: 'Amazon Basics battle rope', noun: 'battle rope', section: 'Cardio',
  description: 'Amazon Basics battle rope: 30 ft, 3-strand twisted poly dacron with a yellow tracer yarn and black heat-shrink grips, 1.5" or 2". Independent reconstruction; Amazon and Amazon Basics trademarks belong to Amazon.com, Inc.',
  params: [enumParam('size', 'Size', AMAZON_ROPE_SIZES.map(s => `${s.d}" × ${s.ft} ft`)), poseParam],
  footprint: ropeFootprint(amazonRope), placement: { side: 'front', gap: 400 },
  vendor: { vendor: 'Amazon Basics', url: 'https://www.amazon.com/dp/B072Z2ZTLJ', credit: 'Amazon Basics — Battle Rope for Home Gym Workout (B072Z2ZTLJ / B072Z5N674)', trademark: 'Amazon and Amazon Basics are trademarks of Amazon.com, Inc.',
    reconstruction: recon('the listed 1.5" / 2" × 30 ft sizes, 3-strand poly dacron construction, tracer line, heat-shrink end caps and 9 listing photos', 'Lay length (3.3 × Ø), grip length (8") and coil proportions are photo estimates; the optional mid sleeve is not modelled.') },
});
export const REP_SLEEVE_BATTLE_ROPE = defineFloorPart({
  id: 'rep-sleeve-battle-rope', name: 'REP sleeve battle rope', title: 'REP Fitness sleeve battle rope', noun: 'battle rope', section: 'Cardio',
  description: 'REP Fitness Sleeve Battle Rope: poly rope in a red, blue or black nylon sleeve with moulded black rubber REP handles, 1.5" or 2", 30 or 50 ft. Independent reconstruction; REP trademarks belong to REP Fitness.',
  params: [enumParam('color', 'Colour', REP_ROPE_COLOURS.map(c => c.name)), enumParam('size', 'Size', REP_ROPE_SIZES.map(s => `${s.d}" × ${s.ft} ft`)), poseParam],
  footprint: ropeFootprint(repRope), placement: { side: 'front', gap: 400 },
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/sleeve-battle-rope', credit: 'REP Fitness — Sleeve Battle Rope (BR-1530 … BR-2050)', trademark: 'REP and REP Fitness are trademarks of REP Fitness.',
    reconstruction: recon('the listed colours and 1.5" / 2" × 30 / 50 ft sizes and 16 vendor photos', 'Sleeve thickness, bunching, handle length (9.25") and diameter are photo estimates.') },
});
export const TITAN_BATTLE_ROPE = defineFloorPart({
  id: 'titan-poly-dacron-battle-rope', name: 'Titan battle rope', title: 'Titan Fitness black poly dacron battle rope', noun: 'battle rope', section: 'Cardio',
  description: 'Titan Fitness black poly dacron battle rope: tightly twisted 3-strand rope with glossy heat-shrink TITAN grips, 30/40/50 ft, 1.5" or 2". Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [enumParam('length', 'Length', TITAN_ROPE_LENGTHS.map(v => `${v} ft`)), enumParam('diameter', 'Diameter', TITAN_ROPE_DIAMETERS.map(v => `${v}"`)), poseParam],
  footprint: ropeFootprint(titanRope), placement: { side: 'front', gap: 400 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/black-poly-dacron-battle-ropes', credit: 'Titan Fitness — Black Poly Dacron Battle Ropes (410521 … 410526)', trademark: 'Titan Fitness is a trademark of Titan Fitness.',
    reconstruction: recon('the listed 30/40/50 ft × 1.5" / 2" variants, published 30 ft weights and 48 vendor photos (8 per variant)', 'Lay length, grip length (7.25") and coil proportions are photo estimates.') },
});
// ------------------------------------------------------------------------------------------------ plyo boxes
/** Box sizes in inches, smallest first. Standing height is a param: the box is turned onto one of its three faces. */
export const REP_PLYO_SIZES = [{ name: 'Small', dims: [16, 18, 20] }, { name: 'Medium', dims: [16, 20, 24] }, { name: 'Large', dims: [20, 24, 30] }] as const;
export const GAMES_BOX_DIMS = [20, 24, 30] as const;
export interface PlyoOrientation { dims: readonly [number, number, number]; height: number; width: number; depth: number }
/** The footprint for a 3-in-1 box stood at `height` (inches): the two remaining dimensions, longer one along X. */
export function plyoOrientation(dims: readonly number[], height: number): PlyoOrientation {
  const rest = dims.filter((_, i) => i !== dims.indexOf(height)).sort((a, b) => b - a);
  return { dims: dims as [number, number, number], height, width: rest[0], depth: rest[1] };
}
const heightParam = (dims: (p: NumericParams) => readonly number[], def: number): FloorParam => ({ key: 'height', label: 'Standing height', default: def, options: p => dims(p), format: v => `${v}"` });
const plyoFootprint = (dims: (p: NumericParams) => readonly number[]) => (p: NumericParams) => { const o = plyoOrientation(dims(p), p.height); return { width: inch(o.width), depth: inch(o.depth) }; };
export const REP_SOFT_PLYO_BOX = defineFloorPart({
  id: 'rep-3-in-1-soft-plyo-box', name: 'REP soft plyo box', title: 'REP Fitness 3-in-1 soft plyo box', noun: 'plyo box', section: 'Cardio',
  description: 'REP Fitness 3-in-1 Soft Plyo Box: wood core, soft foam and a black vinyl cover with white border lines and height markings, Small 16 × 18 × 20", Medium 16 × 20 × 24" or Large 20 × 24 × 30". Independent reconstruction; REP trademarks belong to REP Fitness.',
  params: [enumParam('size', 'Size', REP_PLYO_SIZES.map(s => `${s.name} (${s.dims.join(' × ')}")`), 2), heightParam(p => REP_PLYO_SIZES[p.size].dims, 20)],
  footprint: plyoFootprint(p => REP_PLYO_SIZES[p.size].dims), placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/3-in-1-soft-plyo-boxes', credit: 'REP Fitness — 3-in-1 Soft Plyo Boxes (PB-5100-20 / -24 / -30)', trademark: 'REP and REP Fitness are trademarks of REP Fitness.',
    reconstruction: recon('the published Small/Medium/Large dimensions and 24 vendor photos (per-size hero shots, cover and core layers)', 'Edge radius, border inset and label sizes are photo estimates.') },
});
export const TITAN_SOFT_PLYO_BOX = defineFloorPart({
  id: 'titan-3-in-1-soft-foam-plyo-box', name: 'Titan soft plyo box', title: 'Titan Fitness 3-in-1 soft foam plyo box', noun: 'plyo box', section: 'Cardio',
  description: 'Titan Fitness 3-in-1 Soft Foam Plyometric Box, 20 × 24 × 30": firm foam core in slip-resistant black vinyl with TITAN FITNESS wordmarks and height arrows. Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [heightParam(() => GAMES_BOX_DIMS, 20)],
  footprint: plyoFootprint(() => GAMES_BOX_DIMS), placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/3-in-1-soft-foam-plyometric-box-20-in-24-in-30-in', credit: 'Titan Fitness — 3-in-1 Soft Foam Plyometric Box 20" × 24" × 30" (412244)', trademark: 'Titan Fitness is a trademark of Titan Fitness.',
    reconstruction: recon('the published 20 × 24 × 30" dimension graphic and 10 vendor photos', 'Edge radius and label sizes are photo estimates.') },
});
export const ROGUE_GAMES_BOX = defineFloorPart({
  id: 'rogue-games-box', name: 'Rogue Games Box', title: 'Rogue Games Box (3-in-1 wood plyo box)', noun: 'plyo box', section: 'Cardio',
  description: 'Rogue Games Box: 20 × 24 × 30" 3-in-1 wood plyo box in A/C plywood with burned ROGUE branding and hand holes, as used at the CrossFit Games. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [heightParam(() => GAMES_BOX_DIMS, 24)],
  footprint: plyoFootprint(() => GAMES_BOX_DIMS), placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-games-box', credit: 'Rogue Fitness — Rogue Games Box (RA0368) / Flat Pack Games Box (RF0253)', trademark: 'Rogue is a trademark of Rogue Fitness.',
    reconstruction: recon('the published 30 × 24 × 20" dimensions and 8 vendor photos', 'Panel thickness (3/4"), hand-hole size and branding size are photo estimates.') },
});
// ------------------------------------------------------------------------------------------------ jump rope
export const PRO_ROPE_LENGTHS = [95, 100, 105, 110, 115] as const;
export const ROGUE_PRO_JUMP_ROPE = defineFloorPart({
  id: 'rogue-pro-jump-rope', name: 'Rogue PRO jump rope', title: 'Rogue PRO jump rope', noun: 'jump rope', section: 'Cardio',
  description: 'Rogue PRO weighted jump rope: 1 lb knurled stainless handles (25 mm × 5.95") on 360° bearing swivels and a red-coated 5.5 mm cable, 95–115". Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'length', label: 'Cable length', default: 110, options: PRO_ROPE_LENGTHS, format: v => `${v}"` }, enumParam('pose', 'Pose', JUMP_ROPE_POSES)],
  footprint: p => size(jumpRopeLayout(p.length, p.pose).bounds), placement: { side: 'front', gap: 400 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-pro-jump-rope', credit: 'Rogue Fitness — Rogue PRO Jump Rope (AD0099)', trademark: 'Rogue is a trademark of Rogue Fitness.',
    reconstruction: recon('the published 5.95" × 25 mm handles, 5.5 mm cable, 95–115" lengths and 12 vendor photos (rope and PRO cable kit)', 'Cone and swivel proportions are photo estimates.') },
});
export const PARTS = [
  REP_SOFT_PLYO_BOX, TORQUE_TANK_M1, AMAZON_BASICS_BATTLE_ROPE, REP_SLEEVE_BATTLE_ROPE, ROGUE_SLICE_SLED, TITAN_BATTLE_ROPE, ROGUE_ECHO_DOG_SLED,
  TITAN_PRO_SLED, ROGUE_DOG_SLED, ROGUE_PRO_JUMP_ROPE, ROGUE_GAMES_BOX, TITAN_SOFT_PLYO_BOX,
] as const satisfies readonly FloorPart[];
