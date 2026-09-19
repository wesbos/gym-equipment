/** REP Fitness benches and bench attachments. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 * Published dimensions and every estimate are recorded in ../research/rep-benches.md. */
import { PAINT_SWATCHES } from '../appearance.ts';
import { defineFloorPart, type FloorBox, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
const inch = (v: number) => Math.round(v * 25.4 * 10) / 10;
const deg = (v: number) => `${v}°`;
const swatch = (names: string[], extra: Record<string, string> = {}) => names.map(n => [n, extra[n] ?? PAINT_SWATCHES.find(([s]) => s === n)?.[1] ?? '#353739'] as const);
const EXTRA = { 'Clear Coat': '#8c8f91', Purple: '#4a3a78' };
/** REP's current frame colour list (BlackWing, FB-5000, AB-5200 2.0 frames and rails). */
const REP7 = swatch(['Metallic Black', 'Red', 'Blue', 'Matte Black', 'Clear Coat', 'Army Green', 'White'], EXTRA);
const attribution = (url: string, credit: string, trademark: string, reconstruction: string) => ({ vendor: 'REP Fitness', url, credit, trademark, reconstruction });
const TRADEMARK = 'REP, REP Fitness and CleanGrip are trademarks of REP Fitness.';
const INDEPENDENT = 'Independent reconstruction from published dimensions; REP trademarks belong to REP Fitness.';
const PAD_WIDTHS = (standard: string, wide: string) => ({ key: 'pad', label: 'Pad width', default: 0, options: [0, 1], format: (v: number) => v ? wide : standard });
const angleParam = (key: 'backrestAngle' | 'seatAngle', options: readonly number[] | ((p: NumericParams) => readonly number[]), def = 0) =>
  ({ key, label: key === 'backrestAngle' ? 'Backrest angle' : 'Seat angle', default: def, options, format: deg });

// ── FB-5000 Competition Flat Bench ──────────────────────────────────────────────────────────────────────
export const FB5000 = { length: inch(50.5), width: inch(21), height: inch(16.9), padLength: inch(48), padWidths: [inch(12), inch(13.75)], padThick: inch(4), tube: inch(3) };
export const REP_FB_5000 = defineFloorPart({
  id: 'rep-fb-5000', name: 'REP FB-5000', title: 'REP FB-5000 competition flat bench', noun: 'bench', section: 'Benches',
  description: `REP Fitness FB-5000 Competition Flat Bench: 3×3″ 11-gauge tripod frame, 4″ CleanGrip pad at the 16.9″ IPF height, loop handle and rear wheels. ${INDEPENDENT}`,
  params: [PAD_WIDTHS('Narrow 12″ (FB-5002)', 'Wide 13.75″ (FB-5052)')],
  footprint: { width: FB5000.width, depth: FB5000.length },
  placement: { side: 'right', gap: 250 },
  colors: REP7, colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/fb-5000-competition-flat-bench', 'REP Fitness — FB-5000 Competition Flat Bench', `${TRADEMARK} FB-5000 is a REP Fitness product name.`,
    'Independent Manifold reconstruction from the published tech specs (50.5 × 21 × 16.9 in, 48 × 12/13.75 × 4 in pad, 3×3 in 11-gauge steel), the official dimension drawing, assembly manual and product photos. Post positions, foot, wheel and handle sizes are estimated from photos; scenery only, excluded from print export.'),
});

// ── Adjustable benches ──────────────────────────────────────────────────────────────────────────────────
export const BLACKWING = {
  length: inch(59.5), width: inch(25.8), height: inch(17.2), backLength: inch(38.2), seatLength: inch(15.6), padWidths: [inch(12.2), inch(14)], seatFront: inch(8.5),
  frontFoot: inch(14.8), handleLength: inch(6.9), handleDiameter: 25, padThick: inch(2.6),
  back: [-8, 0, 10, 20, 30, 37.5, 45, 52.5, 60, 67.5, 75, 85] as const, seat: [-10, 0, 8, 15, 30, 45] as const,
};
export const AB4100 = {
  length: inch(51.3), width: inch(20.3), height: inch(17), backLength: inch(36), seatLength: inch(13), padWidths: [inch(12), inch(14)], seatFront: inch(7.8), gap: inch(1.57), padThick: inch(2.8),
  back: [0, 15, 30, 45, 60, 75, 85] as const, seat: [0, 10, 20] as const,
};
export const AB5202 = {
  length: inch(57.6), width: inch(25.8), height: inch(17.5), backLength: inch(41.7), seatLength: inch(11.4), padWidths: [inch(12), inch(14)], seatFronts: [inch(8.9), inch(11)], gap: inch(1.4),
  frontFoot: inch(7.5), padThick: inch(2.5),
  back: [0, 20, 30, 37.5, 45, 52.5, 60, 67.5, 75, 85] as const, decline: [-8, -6, -4] as const, seat: [0, 8, 20, 30] as const,
};
export const AB5200 = {
  length: inch(57.6), width: inch(20.6), height: inch(17.75), backLength: inch(41.8), seatLength: inch(11.5), padWidths: [inch(12), inch(14)], seatFronts: [inch(8.9), inch(11)], gap: inch(2.25),
  padThick: inch(2.5), back: [0, 15, 30, 45, 60, 75, 85] as const, seat: [0, 15, 30] as const,
};
export const AB3100 = {
  length: inch(50.5), width: inch(23), height: inch(16.75), backLength: inch(34.75), seatLength: inch(13), backWidth: inch(11.75), backHead: inch(9), seatWidth: inch(10.5), seatFront: inch(8), gap: inch(1.7), padThick: inch(2.8),
  back: [0, 30, 45, 60, 75, 90] as const, seat: [0, 10, 20] as const,
};
export const AB3002 = {
  length: inch(56.6), width: inch(25.8), height: inch(17.1), backLength: inch(36), seatLength: inch(15), padWidths: [inch(11.8), inch(14)], seatWidth: inch(15), seatFront: inch(10.7), gap: inch(2.1),
  roller: inch(7.7), padThick: inch(2.8), back: [-12, 0, 15, 30, 45, 60, 70, 85] as const, seat: [0, 5, 10, 15, 20] as const, rollerStations: [1, 2, 3, 4, 5, 6] as const,
};
export const AB3000 = {
  length: inch(54), width: inch(26), height: inch(17.5), backLength: inch(36), seatLength: inch(15), backWidth: inch(12), seatWidth: inch(15), seatFront: inch(10.7), gap: inch(1.75),
  padThick: inch(2.8), back: [-20, 0, 20, 35, 50, 65, 85] as const, seat: [0, 5, 10, 15, 20] as const, rollerStations: [1, 2, 3, 4, 5, 6] as const,
};
export const AB5000 = {
  length: inch(57), width: inch(20.25), height: inch(17.75), backLength: inch(38.2), seatLength: inch(15.3), padWidths: [inch(12.2), inch(14)], seatWidths: [inch(12), inch(14)], seatFronts: [inch(8), inch(7.9)], padThick: inch(2.5), gap: 42, slide: 38,
  back: [0, 15, 30, 45, 60, 75, 90] as const, seat: [-15, 0, 15, 30, 45] as const,
};
/** Attachments that fit the BlackWing and AB-5000 (REP compatibility lists). */
export const BENCH_ATTACHMENTS = ['None', 'Leg Roller Attachment 1.0', 'Leg Roller Attachment 2.0', 'Leg Extension & Leg Curl Attachment'] as const;
const attachmentParam = { key: 'attachment', label: 'Attachment', default: 0, options: [0, 1, 2, 3], format: (v: number) => BENCH_ATTACHMENTS[v] ?? String(v) };
const zeroGapParam = { key: 'zeroGap', label: 'ZeroGap seat', default: 0, options: [0, 1], format: (v: number) => v ? 'Slid back (zero gap)' : 'Forward' };
/** Footprints measured from the built solids (flat pads) and pinned by rep-benches.test.ts. Index = attachment. */
export const BLACKWING_BOXES: readonly FloorBox[] = [
  { width: BLACKWING.width, depth: BLACKWING.length },
  { width: BLACKWING.width, depth: 1787.47, offset: [0, -138.09] },
  { width: BLACKWING.width, depth: 1846.74, offset: [0, -167.72] },
  { width: BLACKWING.width, depth: 2031.02, offset: [0, 200.39] },
];
export const AB5000_BOXES: readonly FloorBox[] = [
  { width: AB5000.width, depth: AB5000.length },
  { width: AB5000.width, depth: 1755.12, offset: [0, -153.66] },
  { width: 586, depth: 1814.39, offset: [0, -183.3] },
  { width: 648.7, depth: 1947.13, offset: [0, 152.09] },
];
const withAttachment = (boxes: readonly FloorBox[]) => (p: NumericParams) => boxes[p.attachment] ?? boxes[0];

export const REP_BLACKWING = defineFloorPart({
  id: 'rep-blackwing', name: 'REP BlackWing', title: 'REP BlackWing adjustable bench', noun: 'bench', section: 'Benches',
  description: `REP Fitness BlackWing (AB-5300) flat/incline/decline bench: closed 12-position ladder, 6-position ratcheting seat on the patented ZeroGap slide, tripod T-foot with knurled handle, storage stand; fits the leg roller and leg extension/curl attachments. ${INDEPENDENT}`,
  params: [angleParam('backrestAngle', BLACKWING.back), angleParam('seatAngle', BLACKWING.seat), PAD_WIDTHS('Standard 12.2″', 'Wide 14″'), zeroGapParam, attachmentParam],
  footprint: withAttachment(BLACKWING_BOXES),
  placement: { side: 'right', gap: 250 },
  colors: REP7, colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/blackwing-adjustable-bench', 'REP Fitness — BlackWing AB-5300', `${TRADEMARK} BlackWing and ZeroGap are trademarks of REP Fitness.`,
    'Independent Manifold reconstruction from the published tech specs (59.5 × 25.8 × 17.2 in, 38.2 in back pad, 15.6 in seat, 14.8 in front foot, 12 back and 6 seat angles), the official dimension drawing, spares sheet, assembly manual and photos. Tube sections, ladder notch geometry and the ratchet are estimated; scenery only, excluded from print export.'),
});
export const REP_AB_4100 = defineFloorPart({
  id: 'rep-ab-4100', name: 'REP AB-4100', title: 'REP AB-4100 adjustable bench', noun: 'bench', section: 'Benches',
  description: `REP Fitness AB-4100 (original, pre-Nighthawk) flat/incline bench: closed ladder with 7 back and 3 seat angles, raked front leg with handle, rubber-coated upright storage post. ${INDEPENDENT}`,
  params: [angleParam('backrestAngle', AB4100.back), angleParam('seatAngle', AB4100.seat), PAD_WIDTHS('Standard 12″', 'Wide 14″ back (AB-3000 wide pad)')],
  footprint: { width: AB4100.width, depth: AB4100.length },
  placement: { side: 'right', gap: 250 },
  colors: swatch(['Matte Black', 'Metallic Black', 'Red', 'Blue', 'Army Green', 'White', 'Purple'], EXTRA), colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/ab-4100-adjustable-weight-bench', 'REP Fitness — AB-4100', `${TRADEMARK} AB-4100 is a REP Fitness product name.`,
    'Independent Manifold reconstruction from the archived REP product page (51.3 × 20.3 × 17 in, 36 × 12 in back pad, 13 in seat, 1.57 in gap, 7- & 14-gauge steel), the AB-4100 spares sheet and studio photos. Section sizes, ladder slot spacing and link lengths are estimated; scenery only, excluded from print export.'),
});
export const REP_AB_5200_2 = defineFloorPart({
  id: 'rep-ab-5200-2', name: 'REP AB-5200 2.0', title: 'REP AB-5200 2.0 adjustable bench', noun: 'bench', section: 'Benches',
  description: `REP Fitness AB-5200 2.0 (AB-5202): 10-position closed back ladder, 4-position front seat ladder, fixed or adjustable rear post (adds −8/−6/−4° decline), accent-colour ladder rails, knurled stainless front handle. ${INDEPENDENT}`,
  params: [
    { key: 'post', label: 'Rear post', default: 0, options: [0, 1], format: v => v ? 'Adjustable (decline)' : 'Fixed' },
    angleParam('backrestAngle', p => p.post ? [...AB5202.decline, ...AB5202.back] : AB5202.back), angleParam('seatAngle', AB5202.seat), PAD_WIDTHS('Standard 12″', 'Wide 14″'),
    { key: 'rail', label: 'Ladder rail color', default: 0, options: REP7.map((_, i) => i), format: v => REP7[v]?.[0] ?? String(v) },
  ],
  footprint: { width: AB5202.width, depth: AB5202.length },
  placement: { side: 'right', gap: 250 },
  colors: REP7, colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/ab-5200-2-0', 'REP Fitness — AB-5200 2.0 (AB-5202)', `${TRADEMARK} AB-5200 is a REP Fitness product name.`,
    'Independent Manifold reconstruction from the published tech specs (57.6 × 25.8 × 17.5 in, 41.7 in back pad, 11.4 in seat, 1.4 in gap, 7.5 in front foot), the official dimension drawing, AB-5202 spares sheet, assembly manual and photos. Tube sections, ladder notch geometry and the adjustable post travel are estimated; scenery only, excluded from print export.'),
});
export const REP_AB_3100 = defineFloorPart({
  id: 'rep-ab-3100', name: 'REP AB-3100', title: 'REP AB-3100 adjustable bench', noun: 'bench', section: 'Benches',
  description: `REP Fitness AB-3100 flat/incline bench: three-post frame, open ladder with 6 back and 3 seat angles, tapered pads, rubber-gripped front handle and grooved rubber feet on all three contacts. ${INDEPENDENT}`,
  params: [angleParam('backrestAngle', AB3100.back), angleParam('seatAngle', AB3100.seat)],
  footprint: { width: AB3100.width, depth: AB3100.length },
  placement: { side: 'right', gap: 250 },
  colors: swatch(['Metallic Black', 'Red', 'Blue', 'Matte Black']), colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/ab-3100-adjustable-weight-bench', 'REP Fitness — AB-3100', `${TRADEMARK} AB-3100 is a REP Fitness product name.`,
    'Independent Manifold reconstruction from the published tech specs (50.5 × 23 × 16.75 in, 34.75 × 11.75→9 in back pad, 13 × 10.5→8 in seat, 1.7 in gap), the official dimension drawing, AB-3100 manual and photos. Tube sections and ladder tooth spacing are estimated; scenery only, excluded from print export.'),
});
export const REP_AB_3000_2 = defineFloorPart({
  id: 'rep-ab-3000-2', name: 'REP AB-3000 2.0', title: 'REP AB-3000 2.0 FID adjustable bench', noun: 'bench', section: 'Benches',
  description: `REP Fitness AB-3000 2.0 (AB-3002) flat/incline/decline bench: open ladder with laser-cut angle numbers (8 back angles), 5-position pop-pin seat, built-in 6-position leg rollers with horizontal handle, rubber-covered bases. ${INDEPENDENT}`,
  params: [angleParam('backrestAngle', AB3002.back), angleParam('seatAngle', AB3002.seat), PAD_WIDTHS('Standard 11.8″', 'Wide 14″'),
    { key: 'roller', label: 'Leg roller position', default: 1, options: AB3002.rollerStations, format: v => `Hole ${v}` }],
  footprint: { width: AB3002.width, depth: AB3002.length },
  placement: { side: 'right', gap: 250 },
  colors: swatch(['Metallic Black', 'Red', 'Blue', 'White', 'Matte Black']), colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/ab-3000-fid-adjustable-bench', 'REP Fitness — AB-3000 2.0 FID (AB-3002)', `${TRADEMARK} AB-3000 is a REP Fitness product name.`,
    'Independent Manifold reconstruction from the published tech specs (56.6 × 25.8 × 17.1 in, 36 × 11.8 in back pad, 15 × 15→10.7 in seat, 7.7 in rollers, 2.1 in gap), the official dimension drawing, AB-3002 spares sheet, manual and photos. Tube sections and leg-roller hole angles are estimated; scenery only, excluded from print export.'),
});
export const REP_AB_3000 = defineFloorPart({
  id: 'rep-ab-3000', name: 'REP AB-3000 1.0', title: 'REP AB-3000 FID adjustable bench (1.0)', noun: 'bench', section: 'Benches',
  description: `REP Fitness original AB-3000 FID bench: open ladder from −20 to 85°, 5-position pop-pin seat, built-in leg rollers on a hinged arm with vertical grip handle, round floor pads. ${INDEPENDENT}`,
  params: [angleParam('backrestAngle', AB3000.back), angleParam('seatAngle', AB3000.seat),
    { key: 'roller', label: 'Leg roller position', default: 1, options: AB3000.rollerStations, format: v => `Hole ${v}` }],
  footprint: { width: AB3000.width, depth: AB3000.length },
  placement: { side: 'right', gap: 250 },
  colors: swatch(['Metallic Black', 'Matte Black']), colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/ab-3000-fid-adjustable-bench', 'REP Fitness — AB-3000 FID (original)', `${TRADEMARK} AB-3000 is a REP Fitness product name.`,
    'Independent Manifold reconstruction from retailer and review specs (54 × 26 × 17.5 in, 36 × 12 in stock back pad, 7 back angles −20…85°, 5 seat angles, 1.75 in gap), REP’s pad table (15 × 15→10.7 in seat), the AB-3000 manual and owner photos. Frame sections and roller-arm hole angles are estimated; scenery only, excluded from print export.'),
});
export const REP_AB_5200 = defineFloorPart({
  id: 'rep-ab-5200', name: 'REP AB-5200 1.0', title: 'REP AB-5200 adjustable bench (1.0)', noun: 'bench', section: 'Benches',
  description: `REP Fitness original AB-5200 flat/incline bench: 2×3″ 11-gauge frame, caged closed ladder with 7 back and 3 seat angles, rear support post, stainless front handle, upright storage. ${INDEPENDENT}`,
  params: [angleParam('backrestAngle', AB5200.back), angleParam('seatAngle', AB5200.seat), PAD_WIDTHS('Standard 12″', 'Wide 14″')],
  footprint: { width: AB5200.width, depth: AB5200.length },
  placement: { side: 'right', gap: 250 },
  colors: swatch(['Metallic Black', 'Matte Black', 'Red', 'Blue']), colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/ab-5200-2-0', 'REP Fitness — AB-5200 (original)', `${TRADEMARK} AB-5200 is a REP Fitness product name.`,
    'Independent Manifold reconstruction from review specs (17.75 in flat height, 55.25 in total pad length, 2.25 in gap, 8.25 sq ft, 2×3 in frame, 7 back/3 seat angles), REP’s wide-pad table (41.8 in back, 11.5 in seat), the AB-5200 manual and owner photos. Overall length is taken from the 2.0; width derives from the published footprint; scenery only, excluded from print export.'),
});
export const REP_AB_5000 = defineFloorPart({
  id: 'rep-ab-5000', name: 'REP AB-5000 Zero Gap', title: 'REP AB-5000 Zero Gap adjustable bench', noun: 'bench', section: 'Benches',
  description: `REP Fitness AB-5000 ZERO GAP: 2×3.5″ 11-gauge frame, stainless laser-marked quadrants with blue pop-pins (7 back, 5 seat angles), sliding ZeroGap seat on twin guide rods, four-foot base; fits the leg roller and leg extension/curl attachments. ${INDEPENDENT}`,
  params: [angleParam('backrestAngle', AB5000.back), angleParam('seatAngle', AB5000.seat), PAD_WIDTHS('Standard 12.2″', 'Wide 14″'), zeroGapParam, attachmentParam],
  footprint: withAttachment(AB5000_BOXES),
  placement: { side: 'right', gap: 250 },
  colors: swatch(['Metallic Black', 'Red', 'Blue', 'Matte Black', 'Clear Coat'], EXTRA), colorLabel: 'Bench frame color',
  vendor: attribution('https://repfitness.com/products/ab-5000-zero-gap-adjustable-bench', 'REP Fitness — AB-5000 ZERO GAP', `${TRADEMARK} ZeroGap is a trademark of REP Fitness.`,
    'Independent Manifold reconstruction from REP’s dimension photo (53.5 in pads, 12.25 in width, 17.75 in height, 8 sq ft), review specs (57 in with feet, 7 back/5 seat angles, 2×3.5 in tube), REP’s pad table, the AB-5000 manual and product photos. Width derives from the published footprint; quadrant hole radii are estimated; scenery only, excluded from print export.'),
});

// ── Attachments and pads ────────────────────────────────────────────────────────────────────────────────
export const LEG_ROLLER = {
  v1: { added: inch(12.5), roller: 100, rollerLength: 190, insert: 38 },
  v2: { added: 405.6, roller: 143.4, rollerLength: 244.4, width: 586, insert: 50, spacing: [262, 293, 324, 356, 387] as const, handle: 190 },
};
export const legRollerSpacings = (p: NumericParams) => p.version ? LEG_ROLLER.v2.spacing : [0];
/** Standalone boxes (resting on the floor on their roller pads), measured from the build and pinned by the test. */
export const LEG_ROLLER_BOXES = { v1: { width: 448, depth: 616.15 }, v2: { width: 586, depths: [691.57, 691.57, 691.57, 691.44, 715.28] } } as const;
export const REP_LEG_ROLLER = defineFloorPart({
  id: 'rep-bench-leg-roller', name: 'REP Leg Roller Attachment', title: 'REP adjustable bench leg roller attachment', noun: 'leg roller',
  section: 'Benches',
  description: `REP Fitness Adjustable Bench Leg Roller Attachment 1.0 (4″ foam rollers, 12.5″ added length) and 2.0 (5.65″ molded rollers, tool-free slider, knurled grab handle), shown resting on its rollers. Slides into the head end of the BlackWing, Nighthawk, AB-5000 and AB-5100 back rail; pick it as the attachment on those benches to see it mounted. ${INDEPENDENT}`,
  params: [
    { key: 'version', label: 'Version', default: 1, options: [0, 1], format: v => v ? '2.0' : '1.0' },
    { key: 'spacing', label: 'Roller spacing', default: 262, options: legRollerSpacings, format: v => v ? `${v} mm c-c` : 'Fixed' },
  ],
  footprint: p => legRollerBox(p),
  placement: { side: 'right', gap: 250 },
  vendor: attribution('https://repfitness.com/products/adjustable-bench-leg-roller-attachment-2-0', 'REP Fitness — Adjustable Bench Leg Roller Attachment 1.0 / 2.0', TRADEMARK,
    'Independent Manifold reconstruction from the published specs (1.0: 4 in pads, 12.5 in added length; 2.0: 143.4 mm × 244.4 mm rollers, 586 mm width, 262–387 mm roller centres, 405.6 mm added length), the 2.0 dimension drawing and photos. Slider station count and tube sections are estimated; scenery only, excluded from print export.'),
});
/** Resting-pose envelope; pinned against the build by the family test. */
export function legRollerBox(p: NumericParams): FloorBox {
  if (!p.version) return LEG_ROLLER_BOXES.v1;
  const i = LEG_ROLLER.v2.spacing.indexOf(p.spacing as never);
  return { width: LEG_ROLLER_BOXES.v2.width, depth: LEG_ROLLER_BOXES.v2.depths[i] ?? LEG_ROLLER_BOXES.v2.depths[0] };
}
export const LELC = {
  length: 846, width: 648.7, height: 918.5, roller: 140, rollerLength: 240, horn: 177, hornDiameter: 50, handle: 212, decline: 15,
  extension: [317.5, 349, 381, 413, 445] as const, curl: [852.5, 876, 900] as const,
};
export const REP_LEG_EXTENSION_CURL = defineFloorPart({
  id: 'rep-leg-extension-curl', name: 'REP Leg Extension & Leg Curl', title: 'REP leg extension & leg curl bench attachment', noun: 'attachment', section: 'Benches',
  description: `REP Fitness Leg Extension & Leg Curl Bench Attachment (BA-5010): wheeled base plate with bench leg receiver, cam pivot arm with extension and curl rollers, dual weight horns, band pegs, flat thigh pad and side handles. The bench front foot locks onto it at a 15° decline; pick it as the attachment on the BlackWing or AB-5000 to see it mounted. ${INDEPENDENT}`,
  params: [
    { key: 'extension', label: 'Extension roller height', default: 381, options: LELC.extension, format: v => `${Math.round(v / 25.4 * 10) / 10}″` },
    { key: 'curl', label: 'Curl roller height', default: 876, options: LELC.curl, format: v => `${Math.round(v / 25.4 * 10) / 10}″` },
  ],
  footprint: { width: LELC.width, depth: LELC.length },
  placement: { side: 'right', gap: 250 },
  vendor: attribution('https://repfitness.com/products/leg-extension-leg-curl-bench-attachment', 'REP Fitness — Leg Extension & Leg Curl Bench Attachment (BA-5010)', TRADEMARK,
    'Independent Manifold reconstruction from the published tech specs (846 × 648.7 × 918.5 mm, 140 × 240 mm rollers, 50 × 177 mm horns, 212 mm handles, 317.5–445 and 852.5–900 mm roller heights, 15° bench decline), the official dimension drawing, assembly manual, spares sheet and photos. Intermediate roller stations, plate outline and cam shape are estimated; scenery only, excluded from print export.'),
});
/** REP replacement pads (CleanGrip / standard vinyl tables): back L×W→W(head)×H and optional seat L×W→front×H, inches. */
export const BENCH_PADS = [
  { name: 'Wide · AB-3000 / AB-4100 back', back: [37.4, 14, 11.8, 2.8] },
  { name: 'Wide · AB-5000', back: [38.2, 14, 14, 2.5], seat: [15.35, 14, 7.9, 2.5] },
  { name: 'Wide · AB-5200', back: [41.8, 14, 14, 2.5], seat: [11.5, 14, 11, 2.5] },
  { name: 'Standard · FB-5000 (4″)', back: [48, 12, 12, 4] },
  { name: 'Standard · AB-4100', back: [36, 12, 12, 2.8], seat: [13, 11.8, 7.8, 2.8] },
  { name: 'Standard · BlackWing', back: [38.2, 12.2, 12.2, 2.6], seat: [15.6, 12.2, 8.5, 2.6] },
] as const satisfies readonly { name: string; back: readonly number[]; seat?: readonly number[] }[];
export const PAD_GAP = 60;
export function benchPadBox(p: NumericParams): FloorBox {
  const pad = BENCH_PADS[p.fit] ?? BENCH_PADS[0], back = inch(pad.back[0]), seat = 'seat' in pad ? inch(pad.seat[0]) : 0;
  return { width: inch(pad.back[1]), depth: seat ? back + PAD_GAP + seat : back };
}
export const REP_BENCH_PAD = defineFloorPart({
  id: 'rep-bench-pad', name: 'REP Bench Pad', title: 'REP replacement bench pad', noun: 'bench pad', section: 'Benches',
  description: `REP Fitness replacement bench pads (Wide Bench Pads and CleanGrip standard pads) with their steel-backed plywood boards and T-nut bolt pattern, laid on the floor. ${INDEPENDENT}`,
  params: [{ key: 'fit', label: 'Pad', default: 0, options: BENCH_PADS.map((_, i) => i), format: v => BENCH_PADS[v]?.name ?? String(v) }],
  footprint: benchPadBox,
  placement: { side: 'right', gap: 250 },
  vendor: attribution('https://repfitness.com/products/wide-bench-pads', 'REP Fitness — Wide Bench Pads / CleanGrip bench pads', TRADEMARK,
    'Independent Manifold reconstruction from REP’s published pad tables (length, width, taper and height per bench model) and photos. Board inset and bolt pattern are estimated; scenery only, excluded from print export.'),
});

export const PARTS = [REP_FB_5000, REP_BLACKWING, REP_AB_4100, REP_AB_5200_2, REP_AB_3100, REP_AB_3000_2, REP_AB_3000, REP_AB_5200, REP_AB_5000, REP_LEG_ROLLER, REP_LEG_EXTENSION_CURL, REP_BENCH_PAD] as const satisfies readonly FloorPart[];
