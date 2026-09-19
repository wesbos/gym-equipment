/** Rogue, Ironmaster, Freak Athlete and other benches. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it. Research: ../research/benches.md. */
import { defineFloorPart, type FloorBox, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import {
  APEX_BENCH, APEX_COLORS, FREAK_ABX, FUB_FRAME, IRONMASTER_ANGLES, IRONMASTER_ATTACHMENTS, IRONMASTER_PRO, IRONMASTER_SB, LEG_PRO_ANGLE, MAJOR_COLORS, MAJOR_PLT01,
  MUB_FRAME, PRIME_COLORS, PRIME_SHORTY, ROGUE_AB2, ROGUE_AB3, ROGUE_COLORS, ROGUE_MANTA, ROGUE_PADS, THOMPSON_FAT_PAD, TITAN_COLORS, TITAN_FID, TITAN_SEATED, TITAN_SPFB,
  adjustableExtentY, deg, geomHalfX, ironmasterAttachment, ironmasterExtentY, type AdjustableSpec, type Colorway, type IronmasterSpec,
} from './benches-specs.ts';
const idx = (n: number) => Array.from({ length: n }, (_, i) => i);
const named = (names: readonly string[]) => (v: number) => names[v] ?? String(v);
const onOff = (on: string, off = 'None') => named([off, on]);
const colorParam = (colors: readonly Colorway[], label = 'Frame color') => ({ key: 'color', label, default: 0, options: idx(colors.length), format: named(colors.map(c => c.name)) });
/** Floor box from a local-y extent: bench origin is the frame centre (y = L/2 local); off-centre sweeps shift the box. */
const boxFrom = (W: number, L: number, [lo, hi]: [number, number]): FloorBox => {
  const mid = (lo + hi) / 2 - L / 2;
  return Math.abs(mid) < 1e-9 ? { width: W, depth: hi - lo } : { width: W, depth: hi - lo, offset: [0, -mid] };
};
const vendorOf = (vendor: string, url: string, credit: string, trademark: string, reconstruction: string) => ({ vendor, url, credit, trademark, reconstruction });
// ── Adjustable (ladder) benches ────────────────────────────────────────────────────────────────
export type AdjustableKind = 'rogue-ab3' | 'rogue-ab2' | 'rogue-manta' | 'abx' | 'apex' | 'prime' | 'major' | 'titan-fid';
export interface AdjustableLook {
  kind: AdjustableKind; spec: AdjustableSpec; colors: readonly Colorway[];
  front: 'plate' | 'manta' | 'post' | 'splay'; frontSpan: number; rear: 'tube' | 'splay';
  handle: 'grip' | 'loop' | 'major' | 'post'; handleW: number;
  ladder: 'plates' | 'enclosed' | 'internal'; ladderColor: string; ladderT?: number; ladderLow?: number;
  /** full-length side plates: start along the spine and margin before its end (ABX, APEX) instead of hugging the stations */
  ladderSpan?: readonly [number, number];
  seatAdjust: 'link' | 'sundial'; sundialR?: number; dialColor?: string; storagePost?: number;
  pinD?: number; railW?: number; padName: string; padColor?: string; accent?: string;
}
export const ADJUSTABLE_LOOKS = {
  'rogue-adjustable-bench-3': { kind: 'rogue-ab3', spec: ROGUE_AB3, colors: ROGUE_COLORS, front: 'plate', frontSpan: 190, rear: 'tube', handle: 'grip', handleW: 150,
    ladder: 'plates', ladderColor: '#1a1b1d', seatAdjust: 'link', storagePost: 330, padName: 'Pads · USA textured foam', padColor: '#232426' },
  'rogue-adjustable-bench-2': { kind: 'rogue-ab2', spec: ROGUE_AB2, colors: ROGUE_COLORS.slice(0, 1), front: 'plate', frontSpan: 180, rear: 'tube', handle: 'loop', handleW: 170,
    ladder: 'plates', ladderColor: 'frame', seatAdjust: 'link', padName: 'Pads · black vinyl' },
  'rogue-manta-ray': { kind: 'rogue-manta', spec: ROGUE_MANTA, colors: [...ROGUE_COLORS, { name: 'Texture Black', hex: '#222325' }], front: 'manta', frontSpan: 350, rear: 'tube', handle: 'grip', handleW: 170,
    ladder: 'internal', ladderColor: '#1a1b1d', seatAdjust: 'link', storagePost: 320, pinD: 28, padName: 'Pads · Thompson grabber vinyl', padColor: '#141517' },
  'freak-athlete-abx': { kind: 'abx', spec: FREAK_ABX, colors: [{ name: 'Starlight Black', hex: '#1d1e21' }], front: 'plate', frontSpan: 298, rear: 'tube', handle: 'grip', handleW: 120,
    ladder: 'plates', ladderColor: '#ededeb', ladderT: 8, ladderLow: -60, ladderSpan: [-30, 70], seatAdjust: 'sundial', sundialR: 200, dialColor: '#1d1e21', storagePost: 300, padName: 'Pads · TruGrip vinyl', accent: '#2c2d30' },
  'apex-adjustable-bench': { kind: 'apex', spec: APEX_BENCH, colors: APEX_COLORS, front: 'plate', frontSpan: 260, rear: 'tube', handle: 'grip', handleW: 178,
    ladder: 'enclosed', ladderColor: '#27282b', ladderT: 8, ladderLow: -45, ladderSpan: [90, 120], seatAdjust: 'sundial', sundialR: 190, dialColor: '#27282b', padName: 'Pads · high-grip vinyl', accent: '#303236' },
  'prime-shorty-adjustable-bench': { kind: 'prime', spec: PRIME_SHORTY, colors: PRIME_COLORS, front: 'plate', frontSpan: 220, rear: 'tube', handle: 'grip', handleW: 140,
    ladder: 'plates', ladderColor: 'frame', seatAdjust: 'link', storagePost: 330, padName: 'Pads · charcoal vinyl', padColor: '#2a2b2e', accent: '#7ed321' },
  'major-fitness-plt01': { kind: 'major', spec: MAJOR_PLT01, colors: MAJOR_COLORS, front: 'splay', frontSpan: 440, rear: 'splay', handle: 'major', handleW: 140,
    ladder: 'plates', ladderColor: 'frame', ladderLow: 10, seatAdjust: 'link', railW: 56, padName: 'Pads · PU leather', padColor: '#202124' },
  'titan-elite-adjustable-fid-bench': { kind: 'titan-fid', spec: TITAN_FID, colors: TITAN_COLORS, front: 'post', frontSpan: 230, rear: 'tube', handle: 'post', handleW: 190,
    ladder: 'plates', ladderColor: '#161719', ladderLow: 16, seatAdjust: 'sundial', sundialR: 150, dialColor: '#161719', padName: 'Pads · HeftyGrip vinyl', accent: '#2f3033' },
} as const satisfies Record<string, AdjustableLook>;
const angleParams = (s: AdjustableSpec) => [
  { key: 'backAngle', label: 'Back pad angle', default: 0, options: s.backAngles, format: deg },
  { key: 'seatAngle', label: 'Seat angle', default: 0, options: s.seatAngles, format: deg },
];
const adjustableFootprint = (id: keyof typeof ADJUSTABLE_LOOKS) => (p: NumericParams) => {
  const look = ADJUSTABLE_LOOKS[id];
  return boxFrom(look.spec.W, look.spec.L, adjustableExtentY(look.kind, look.spec, p));
};
const placement = { side: 'right' as const, gap: 220 };
export const ROGUE_ADJUSTABLE_BENCH_3 = defineFloorPart({
  id: 'rogue-adjustable-bench-3', name: 'Rogue Adjustable Bench 3.0', title: 'Rogue Adjustable Bench 3.0', noun: 'bench', section: 'Benches',
  description: 'Rogue Adjustable Bench 3.0 (RF0935): 3×3 in 11-gauge ladder bench, 10 back and 3 seat positions, front pull handle, rear wheels and built-in storage post. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [...angleParams(ROGUE_AB3), colorParam(ROGUE_COLORS), { key: 'plates', label: 'Adjustment plates', default: 0, options: [0, 1], format: named(['Textured black', 'Brushed stainless']) }],
  footprint: adjustableFootprint('rogue-adjustable-bench-3'), placement,
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/rogue-adjustable-bench-3-0', 'Rogue Fitness — Adjustable Bench 3.0 (RF0935)', 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction from Rogue\'s published footprint (56.5 × 24.75 in), 17.5 in pad height, 52 in overall pad, 11 in pad width, 1 in gap, 3×3 in tube and back/seat angle lists, checked against Rogue and review photos. Seat/back split, link lengths, ladder stations and secondary plate shapes are estimated; scenery only, excluded from print export.'),
});
export const ROGUE_ADJUSTABLE_BENCH_2 = defineFloorPart({
  id: 'rogue-adjustable-bench-2', name: 'Rogue Adjustable Bench 2.0', title: 'Rogue Adjustable Bench 2.0', noun: 'bench', section: 'Benches',
  description: 'Rogue Adjustable Bench 2.0 (discontinued): 2×3 in 11-gauge ladder bench with 6 back and 2 seat positions, U pull handle and rear wheels. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: angleParams(ROGUE_AB2), footprint: adjustableFootprint('rogue-adjustable-bench-2'), placement,
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/rogue-adjustable-bench-2-0', 'Rogue Fitness — Adjustable Bench 2.0', 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction from the published 17.5 in pad height, 11.25 × 52 in pad, 24.5 in rear legs and 2×3 in 11-gauge frame, plus owner/review photos. Overall length (56 in), individual angle values within the published 0–85° range, the 15° seat setting and hidden linkage are estimated; scenery only, excluded from print export.'),
});
export const ROGUE_MANTA_RAY = defineFloorPart({
  id: 'rogue-manta-ray', name: 'Rogue Manta Ray', title: 'Rogue Manta Ray Adjustable Bench', noun: 'bench', section: 'Benches',
  description: 'Rogue Manta Ray (RF0983): 3×4 in 7-gauge incline/decline bench with the ladder inside the tube, manta-shaped front foot, 10 back and 5 seat angles and the optional Foot Catch. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [...angleParams(ROGUE_MANTA), colorParam([...ROGUE_COLORS, { name: 'Texture Black', hex: '#222325' }]), { key: 'footCatch', label: 'Foot catch', default: 0, options: [0, 1], format: onOff('Manta Ray Foot Catch') }],
  footprint: adjustableFootprint('rogue-manta-ray'), placement,
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/rogue-manta-ray-adjustable-bench', 'Rogue Fitness — Manta Ray Adjustable Bench (RF0983) and Foot Catch', 'Rogue, Rogue Fitness and Manta Ray are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction from Rogue\'s published 57 × 24.75 × 17.5 in envelope, 2.25 × 12 × 52 in pad, 1 in gap, 3×4 in 7-gauge frame and angle lists, checked against Rogue side views. Foot Catch roller sizes and arm geometry, the manta foot outline and link lengths are estimated; scenery only, excluded from print export.'),
});
export const FREAK_ATHLETE_ABX = defineFloorPart({
  id: 'freak-athlete-abx', name: 'Freak Athlete ABX', title: 'Freak Athlete ABX Weight Bench', noun: 'bench', section: 'Benches',
  description: 'Freak Athlete ABX: zero-gap ladder bench with white laser-cut ladder plates, fold-down headrest, 11 back and 5 seat angles, and the optional Leg Developer attachment on the front port. Independent reconstruction from published dimensions and photos; Freak Athlete trademarks belong to Freak Athlete.',
  params: [...angleParams(FREAK_ABX), { key: 'headrest', label: 'Headrest', default: 0, options: [0, 1], format: named(['Up (full bench)', 'Folded (half bench)']) },
    { key: 'legDeveloper', label: 'Leg Developer', default: 0, options: [0, 1], format: onOff('ABX Leg Developer Attachment') }],
  footprint: adjustableFootprint('freak-athlete-abx'), placement,
  vendor: vendorOf('Freak Athlete', 'https://freakathlete.co/products/abx', 'Freak Athlete — ABX Weight Bench and ABX Leg Developer Attachment', 'Freak Athlete and ABX are trademarks of Freak Athlete.',
    'Independent Manifold reconstruction from the published 51.4 × 25.2 × 17 in envelope, 11.8 in pads, 11.75 / 25.5 in feet and angle lists, checked against Freak Athlete renders and review photos. Pad lengths, headrest size, Leg Developer geometry and link lengths are estimated; scenery only, excluded from print export.'),
});
export const APEX_ADJUSTABLE_BENCH = defineFloorPart({
  id: 'apex-adjustable-bench', name: 'APEX Adjustable Bench', title: 'APEX Adjustable Bench', noun: 'bench', section: 'Benches',
  description: 'APEX Adjustable Bench (The Tib Bar Guy / APEX Fitness): FID bench with an enclosed ladder, sundial seat, 17 back and 10 seat angles, rear wheels and the optional Stryker Pad in the head-end receiver. Independent reconstruction from published dimensions and photos; APEX trademarks belong to APEX Fitness.',
  params: [...angleParams(APEX_BENCH), colorParam(APEX_COLORS), { key: 'stryker', label: 'Stryker Pad', default: 0, options: [0, 1], format: onOff('APEX Stryker Pad') }],
  footprint: adjustableFootprint('apex-adjustable-bench'), placement,
  vendor: vendorOf('APEX Fitness', 'https://www.apexfitness.com/products/apex-adjustable-bench', 'APEX Fitness (The Tib Bar Guy) — APEX Adjustable Bench and Stryker Pad', 'APEX, Stryker Pad and The Tib Bar Guy are trademarks of their respective owners.',
    'Independent Manifold reconstruction from APEX\'s published spec card: 55 in length, 27.25 / 10.25 in feet, 17 in height, 38.5 × 12 back and 13.25 × 12 seat pads, 2.25 in thick, 1 in clearance, 7 in handle and both angle lists; Stryker Pad 13 × 8.5 × 3 in. Frame section, receiver height, Stryker post height and link geometry are estimated; scenery only, excluded from print export.'),
});
export const PRIME_SHORTY_BENCH = defineFloorPart({
  id: 'prime-shorty-adjustable-bench', name: 'PRIME Shorty Bench', title: 'PRIME Shorty Adjustable Bench', noun: 'bench', section: 'Benches',
  description: 'PRIME Fitness Shorty Adjustable Bench: 3-way (decline/flat/incline) ladder bench with the removable head-rest extension, lime-green pop-pin knobs and the optional Preacher Curl Pad at the head end. Independent reconstruction from published dimensions and photos; PRIME trademarks belong to PRIME Fitness.',
  params: [...angleParams(PRIME_SHORTY), colorParam(PRIME_COLORS), { key: 'headEnd', label: 'Head end', default: 0, options: [0, 1, 2], format: named(['Head-rest extension', 'No extension', 'Preacher Curl Pad']) }],
  footprint: adjustableFootprint('prime-shorty-adjustable-bench'), placement,
  vendor: vendorOf('PRIME Fitness USA', 'https://www.primefitnessusa.com/products/prime-shorty-adjustable-bench', 'PRIME Fitness — Shorty Adjustable Bench and Bench Preacher Curl Pad', 'PRIME and PRIME Fitness are trademarks of PRIME Fitness USA.',
    'Independent Manifold reconstruction from PRIME\'s published 51 × 27 × 18 in envelope (with extension), ~10 in back pad and the published back angles, checked against PRIME product renders in every colourway. Seat angle values (5 positions), pad lengths, extension and preacher pad sizes are estimated; scenery only, excluded from print export.'),
});
export const MAJOR_FITNESS_PLT01 = defineFloorPart({
  id: 'major-fitness-plt01', name: 'Major Fitness PLT01', title: 'Major Fitness PLT01 Adjustable Bench', noun: 'bench', section: 'Benches',
  description: 'Major Fitness PLT01: splayed tripod ladder bench with a sawtooth gear rack, tapered back and seat pads, D pull handle and rear wheels. Independent reconstruction from published dimensions and photos; Major Fitness trademarks belong to Major Fitness.',
  params: [...angleParams(MAJOR_PLT01), colorParam(MAJOR_COLORS)], footprint: adjustableFootprint('major-fitness-plt01'), placement,
  vendor: vendorOf('Major Fitness', 'https://www.majorfitness.com/products/weight-bench-plt01', 'Major Fitness — PLT01 Adjustable Bench', 'Major Fitness is a trademark of Major Fitness.',
    'Independent Manifold reconstruction from the published 47.8 × 29.2 × 17.7 in envelope, 31.5 in back pad (11.5 → 9 in) and 12 in seat (10.5 → 8.5 in), 2.5 in padding, −5° to 90° back range and 4 seat positions, checked against Major Fitness product images. Individual seat angles, tube sections and link lengths are estimated; scenery only, excluded from print export.'),
});
export const TITAN_ELITE_FID_BENCH = defineFloorPart({
  id: 'titan-elite-adjustable-fid-bench', name: 'Titan Elite FID Bench', title: 'Titan Elite Series Adjustable FID Bench', noun: 'bench', section: 'Benches',
  description: 'Titan Elite Series Adjustable FID Bench: single-post tripod with foam leg-hold rollers, sawtooth ladder, 6 back and 4 seat positions, knurled front handle and rear wheels. Independent reconstruction from published dimensions and photos; Titan trademarks belong to Titan Fitness.',
  params: [...angleParams(TITAN_FID), colorParam(TITAN_COLORS)], footprint: adjustableFootprint('titan-elite-adjustable-fid-bench'), placement,
  vendor: vendorOf('Titan Fitness', 'https://www.titan.fitness/products/elite-series-adjustable-fid-bench', 'Titan Fitness — Elite Series Adjustable FID Bench', 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    'Independent Manifold reconstruction from Titan\'s published 56.75 × 25.25 × 18.25 in envelope, 36 × 11 × 2.25 in back and 15 × 15 × 2.25 in seat pads and both angle lists, checked against Titan product photos. Roller sizes, tube layout and link lengths are estimated; scenery only, excluded from print export.'),
});
// ── Ironmaster ─────────────────────────────────────────────────────────────────────────────────
/** Feet set the width unless an attachment (24 in preacher pad, 25 in dip handle) is wider. */
const ironmasterWidth = (s: IronmasterSpec, p: NumericParams) => Math.max(s.headFootW, s.seatFootW, 2 * geomHalfX(ironmasterAttachment(s, p.attachment)));
const IM_ALL = idx(IRONMASTER_ATTACHMENTS.length), IM_SB = IM_ALL.filter(i => IRONMASTER_ATTACHMENTS[i] !== 'Leg Attachment PRO');
const ironmasterParams = (attachments: number[]) => [
  { key: 'attachment', label: 'Attachment', default: 0, options: attachments, format: named(IRONMASTER_ATTACHMENTS) },
  { key: 'backrestAngle', label: 'Bench angle', default: 0, options: (p: NumericParams) => IRONMASTER_ATTACHMENTS[p.attachment] === 'Leg Attachment PRO' ? [LEG_PRO_ANGLE] : IRONMASTER_ANGLES, format: deg },
  { key: 'inclineSeat', label: 'Incline seat', default: 0, options: [0, 1, 2, 3], format: named(['Off', 'Receiver 1 (lowest)', 'Receiver 2', 'Receiver 3 (highest)']) },
];
export const IRONMASTER_SUPER_BENCH_PRO = defineFloorPart({
  id: 'ironmaster-super-bench-pro-v2', name: 'Ironmaster Super Bench PRO V2', title: 'Ironmaster Super Bench PRO V2', noun: 'bench', section: 'Benches',
  description: 'Ironmaster Super Bench PRO V2: single-post pivoting bench with the numbered stainless locking ring, 11 angles, dual-width pad, plug-in incline seat, wheels and handle, plus the head-end attachments (Crunch Situp, Leg Attachment PRO, Preacher Curl Pad, Bar Dip Handle, Seated Press Pad). Independent reconstruction from published dimensions and the assembly manual; Ironmaster trademarks belong to Ironmaster.',
  params: ironmasterParams(IM_ALL),
  footprint: p => boxFrom(ironmasterWidth(IRONMASTER_PRO, p), IRONMASTER_PRO.L, ironmasterExtentY(IRONMASTER_PRO, p)), placement,
  vendor: vendorOf('Ironmaster', 'https://www.ironmaster.com/products/super-bench-pro-v2/', 'Ironmaster — Super Bench PRO V2 and Super Bench attachments', 'Ironmaster and Super Bench are trademarks of Ironmaster LLC.',
    'Independent Manifold reconstruction from Ironmaster\'s published specs (47 in length, 12.5 / 21 in feet, 17.2 in flat height, 44 × 12.25/10.25 × 2.5 in pad, 9.5 × 9.25/5.25 in incline seat, 11 lock-out angles) and the PRO V2 and attachment manuals (Preacher 12 × 24 × 2 in; Dip handle 20–25 in, 9.5 in grips; Seated Press Pad 3 × 10.5 × 18 in, 21 in up, 10 in in, 5° recline; Leg PRO 4 × 7 in rollers at 10°). Pivot, ring radii and attachment frame paths are estimated from photos; scenery only, excluded from print export.'),
});
export const IRONMASTER_SUPER_BENCH = defineFloorPart({
  id: 'ironmaster-super-bench', name: 'Ironmaster Super Bench', title: 'Ironmaster Super Bench Adjustable Utility Bench', noun: 'bench', section: 'Benches',
  description: 'Ironmaster Super Bench (original): single-post pivoting bench with the half-ring lock, 11 angles, 44 × 10 × 3 in pad and plug-in incline seat, with the Crunch Situp, Preacher Curl, Bar Dip and Seated Press attachments. Independent reconstruction from published dimensions and the assembly manual; Ironmaster trademarks belong to Ironmaster.',
  params: [...ironmasterParams(IM_SB), { key: 'color', label: 'Frame finish', default: 0, options: [0, 1], format: named(['Textured Black', 'Hammertone Gray']) }],
  footprint: p => boxFrom(ironmasterWidth(IRONMASTER_SB, p), IRONMASTER_SB.L, ironmasterExtentY(IRONMASTER_SB, p)), placement,
  vendor: vendorOf('Ironmaster', 'https://www.ironmaster.com/products/super-bench/', 'Ironmaster — Super Bench Adjustable Utility Bench', 'Ironmaster and Super Bench are trademarks of Ironmaster LLC.',
    'Independent Manifold reconstruction from Ironmaster\'s published 44 × 18.75 × 20 in (flat) envelope, 41 in frame footprint, 44 × 10 × 3 in pad, 11 angles and the assembly manual. Pivot height, ring radii and post position are estimated from photos; scenery only, excluded from print export.'),
});
// ── Flat and fixed benches ─────────────────────────────────────────────────────────────────────
export const ROGUE_FLAT_UTILITY_BENCH_2 = defineFloorPart({
  id: 'rogue-flat-utility-bench-2', name: 'Rogue Flat Utility Bench 2.0', title: 'Rogue Flat Utility Bench 2.0', noun: 'bench', section: 'Benches',
  description: 'Rogue Flat Utility Bench 2.0: single-piece notched-and-formed 2×3 in 11-gauge frame with raked legs, rubber feet and the 12 in textured foam pad. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [], footprint: { width: FUB_FRAME.W, depth: FUB_FRAME.L }, placement,
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/rogue-flat-utility-bench-2-0', 'Rogue Fitness — Flat Utility Bench 2.0 (RA1362)', 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction from Rogue\'s published 47 × 14 in footprint, 18 in pad height, 12 × 2.5 in pad and 2×3 in 11-gauge frame. Pad length (46 in), leg rake and rail position are estimated from photos; scenery only, excluded from print export.'),
});
const MUB_PADS = ROGUE_PADS.map(p => p.name);
/** Rogue's printed side panel on Fat Pads stands 0.5 mm proud of each side face. */
const PAD_PRINT = 1;
export const ROGUE_MONSTER_UTILITY_BENCH_2 = defineFloorPart({
  id: 'rogue-monster-utility-bench-2', name: 'Rogue Monster Utility Bench 2.0', title: 'Rogue Monster Utility Bench 2.0', noun: 'bench', section: 'Benches',
  description: 'Rogue Monster Utility Bench 2.0: 3×3 in 11-gauge frame with the single-column front foot, front handle, rear wheels, UHMW storage cap and laser-cut R gussets; standard or Shorty height and three USA pads. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'height', label: 'Height', default: 0, options: [0, 1], format: named(['Standard (17 in)', 'Shorty (15 in)']) },
    { key: 'pad', label: 'Pad', default: 0, options: idx(ROGUE_PADS.length), format: named(MUB_PADS) },
    { key: 'handle', label: 'Handle', default: 0, options: [0, 1, 2], format: named(['MG Black', 'Stainless knurled', 'Stainless knurled (short)']) }],
  footprint: p => ({ width: MUB_FRAME.W, depth: Math.max(MUB_FRAME.L, ROGUE_PADS[p.pad]?.len ?? 0) }), placement,
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/monster-utility-bench-2-0-mg-black', 'Rogue Fitness — Monster Utility Bench 2.0 (RF0853)', 'Rogue, Rogue Fitness and Fat Pad are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction from Rogue\'s published 47.375 × 26.25 in footprint, 17 / 15 in heights (standard pad), 19.25 / 17.25 in with Fat Pads, 3×3 in 11-gauge frame and the three pad sizes (47 × 12 × 2.25, 50 × 12.5 × 4.5, 50 × 14.5 × 4.5 in). Post positions, gusset outline, wheel size and handle routing are estimated from photos; scenery only, excluded from print export.'),
});
export const ROGUE_THOMPSON_FAT_PAD = defineFloorPart({
  id: 'rogue-thompson-fat-pad', name: 'Rogue Thompson Fat Pad', title: 'Rogue Thompson Fat Pad', noun: 'bench', section: 'Benches',
  description: 'Rogue Thompson Fat Pad (PAD027): the 50 × 14.5 × 4.5 in grabber-vinyl bench pad created by Donnie Thompson, shown on a Rogue flat bench base. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'base', label: 'Bench base', default: 0, options: [0, 1, 2], format: named(['Monster Utility Bench 2.0', 'Monster Utility Bench 2.0 Shorty', 'Flat Utility Bench 2.0']) }],
  footprint: p => p.base === 2 ? { width: Math.max(FUB_FRAME.W, THOMPSON_FAT_PAD.w + PAD_PRINT), depth: Math.max(FUB_FRAME.L, THOMPSON_FAT_PAD.len) } : { width: MUB_FRAME.W, depth: Math.max(MUB_FRAME.L, THOMPSON_FAT_PAD.len) },
  placement,
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/thompson-fatpad', 'Rogue Fitness — Thompson Fat Pad (PAD027)', 'Rogue, Rogue Fitness and Thompson Fat Pad are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction from Rogue\'s published 50 × 14.5 × 4.5 in pad size and the Monster Utility 2.0 / Flat Utility 2.0 base dimensions. Edge radius and the side print panel are estimated from photos (no logo artwork); scenery only, excluded from print export.'),
});
export const TITAN_SINGLE_POST_FLAT_BENCH = defineFloorPart({
  id: 'titan-series-single-post-flat-bench', name: 'Titan Single Post Flat Bench', title: 'Titan TITAN Series Single Post Flat Bench', noun: 'bench', section: 'Benches',
  description: 'Titan TITAN Series Single Post Flat Bench: 3×3 in 11-gauge single front post, 14 × 4 in HeftyGrip pad, knurled front handle and rear wheels. Independent reconstruction from published dimensions and photos; Titan trademarks belong to Titan Fitness.',
  params: [colorParam(TITAN_COLORS)], footprint: { width: TITAN_SPFB.W, depth: TITAN_SPFB.L }, placement,
  vendor: vendorOf('Titan Fitness', 'https://www.titan.fitness/products/titan-series-single-post-flat-bench', 'Titan Fitness — TITAN Series Single Post Flat Bench', 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    'Independent Manifold reconstruction from Titan\'s published 50 × 26 × 17 in envelope, 50 × 14 × 4 in pad and 3×3 in 11-gauge frame, checked against Titan photos. Post positions, handle loop and wheel size are estimated; scenery only, excluded from print export.'),
});
export const TITAN_SEATED_STATIONARY_BENCH = defineFloorPart({
  id: 'titan-seated-stationary-bench', name: 'Titan Seated Stationary Bench', title: 'Titan Seated Stationary Bench', noun: 'bench', section: 'Benches',
  description: 'Titan Seated Stationary Bench: fixed 18 in seat on a single post with a slightly reclined back pad, low T base, front handle and rear wheels. Independent reconstruction from published dimensions and photos; Titan trademarks belong to Titan Fitness.',
  params: [], footprint: { width: TITAN_SEATED.W, depth: TITAN_SEATED.D }, placement,
  vendor: vendorOf('Titan Fitness', 'https://www.titan.fitness/products/seated-stationary-bench', 'Titan Fitness — Seated Stationary Bench', 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    'Independent Manifold reconstruction from Titan\'s published 43 × 30 × 37 in envelope, 18 in seat height, 11.5 × 11.25 in seat and 19 × 11.25 in back pads, checked against Titan photos and the dimension drawing. Recline angle, tube sizes and base layout are estimated; scenery only, excluded from print export.'),
});
export const PARTS = [
  IRONMASTER_SUPER_BENCH_PRO, FREAK_ATHLETE_ABX, ROGUE_ADJUSTABLE_BENCH_3, ROGUE_FLAT_UTILITY_BENCH_2, ROGUE_MONSTER_UTILITY_BENCH_2, ROGUE_THOMPSON_FAT_PAD,
  ROGUE_MANTA_RAY, ROGUE_ADJUSTABLE_BENCH_2, APEX_ADJUSTABLE_BENCH, PRIME_SHORTY_BENCH, IRONMASTER_SUPER_BENCH, MAJOR_FITNESS_PLT01,
  TITAN_SEATED_STATIONARY_BENCH, TITAN_SINGLE_POST_FLAT_BENCH, TITAN_ELITE_FID_BENCH,
] as const satisfies readonly FloorPart[];
