/** Mats, platforms, jacks, pads, balls and rollers. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it. Research: ../research/floor-accessories.md.
 *
 * Every entry stands on the floor at its footprint centre, Z up. Published sizes are the tables below (inches converted
 * with `inch`); the builders in ../parts/floor-accessories*.ts read the same numbers so footprints and solids stay in step. */
import { defineFloorPart, type FloorBox, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';

export const inch = (v: number) => v * 25.4;
const idx = (n: number) => Array.from({ length: n }, (_, i) => i);
const named = (names: readonly string[]) => (v: number) => names[v] ?? String(v);
export interface Swatch { name: string; hex: string }
const colorParam = (colors: readonly Swatch[], label = 'Color') => ({ key: 'color', label, default: 0, options: idx(colors.length), format: named(colors.map(c => c.name)) });
const vendorOf = (vendor: string, url: string, credit: string, trademark: string, reconstruction: string): VendorAttribution => ({ vendor, url, credit, trademark, reconstruction });
const lbs = (v: number) => `${v} lb`;

// ── Tractor Supply 4'×6'×¾" stall mat ───────────────────────────────────────────────────────────
/** Published 48" × 72" × 3/4" (TSC item 2219003). Stud grid pitch, stud size and height are estimates from the underside photos. */
export const STALL_MAT = { width: inch(48), length: inch(72), thick: inch(.75), seam: 2, studPitch: inch(1.5), studD: inch(1.15), studH: inch(3 / 16) } as const;
export const stallMatSize = (p: NumericParams): FloorBox => ({ width: p.across * STALL_MAT.width + (p.across - 1) * STALL_MAT.seam, depth: p.deep * STALL_MAT.length + (p.deep - 1) * STALL_MAT.seam });
export const TSC_STALL_MAT = defineFloorPart({
  id: 'tractor-supply-horse-stall-mat', name: 'Horse stall mat', title: "Tractor Supply horse stall mat 4'×6'", noun: 'stall mat', section: 'Accessories', underlay: true,
  description: "Tractor Supply 4'×6'×¾\" vulcanised rubber stall mats, tiled edge to edge with hairline seams (1 × 1 up to 6 × 4 mats); a single mat can be flipped to show its studded underside. Independent reconstruction from published dimensions; Tractor Supply trademarks belong to Tractor Supply Co.",
  params: [
    { key: 'across', label: "Mats across (4' sides)", default: 1, options: [1, 2, 3, 4, 5, 6], format: v => `${v} × 4' = ${v * 4}'` },
    { key: 'deep', label: "Mats deep (6' sides)", default: 1, options: [1, 2, 3, 4], format: v => `${v} × 6' = ${v * 6}'` },
    { key: 'side', label: 'Face up', default: 0, options: p => p.across * p.deep === 1 ? [0, 1] : [0], format: named(['Hammered top (as laid)', 'Studded underside']) },
  ],
  footprint: stallMatSize, placement: { side: 'front', gap: 0 },
  vendor: vendorOf('Tractor Supply', 'https://www.tractorsupply.com/tsc/product/4-ft-x-6-ft-x-3-4-in-thick-rubber-stall-mat-2219003', "Tractor Supply — 4 ft. x 6 ft. x 3/4 in. rubber stall mat",
    'Tractor Supply and TSC are trademarks of Tractor Supply Co.', "Independent Manifold reconstruction. Published: 48\" × 72\" × 3/4\", 94 lb, square-cut edges. Estimated from photos: underside stud pitch (1.5\"), stud diameter (1.15\") and height (3/16\"); the fine hammered top texture is below mesh scale and shown as a matte finish. Scenery only, excluded from print export."),
});

// ── Massenomics Horse Stall Mat Gripper ─────────────────────────────────────────────────────────
/** A grip trainer cut from a ¾" stall mat with a steel pin bracket. Block size scaled from product photos (no published size). */
export const GRIPPER = { width: inch(12), depth: inch(7.5), thick: inch(.75), studH: inch(3 / 16), plate: { w: inch(5.2), h: inch(2.1), t: 2, tabW: inch(1.1), tabOut: inch(.9) } } as const;
export const MASSENOMICS_GRIPPER = defineFloorPart({
  id: 'massenomics-horse-stall-mat-gripper', name: 'Horse Stall Mat Gripper', title: 'Massenomics Horse Stall Mat Gripper', noun: 'mat gripper', section: 'Accessories',
  description: 'Massenomics pinch-grip trainer: a block of genuine ¾" stall mat with a steel carabiner bracket, shown lying smooth side up. Independent reconstruction from product photos; Massenomics trademarks belong to Massenomics.',
  params: [],
  footprint: { width: GRIPPER.width, depth: GRIPPER.depth + GRIPPER.plate.tabOut },
  vendor: vendorOf('Massenomics', 'https://massenomics.com/shop/horse-stall-mat-gripper', 'Massenomics — Horse Stall Mat Gripper', 'Massenomics is a trademark of Massenomics.',
    'Independent Manifold reconstruction. Published: cut from 3/4" horse stall mat, single steel pin bracket. Estimated from photos (scaled against a 2" loading pin): 12" × 7.5" block, 5.2" × 2.1" bracket plates with a 1.1" tab. Prints and wordmark shown as plain white plates. Scenery only, excluded from print export.'),
});

// ── AbMat Hip Thrust Pad, AbMat, Barbell Pillows ────────────────────────────────────────────────
export const HIP_THRUST_PAD = { length: inch(18), width: inch(9), thick: inch(1.75), edge: inch(1) } as const;
export const ABMAT_HIP_THRUST_PAD = defineFloorPart({
  id: 'abmat-hip-thrust-pad', name: 'Hip Thrust Pad', title: 'AbMat Hip Thrust Pad', noun: 'hip thrust pad', section: 'Accessories',
  description: 'AbMat Hip Thrust Pad (18" × 9" × 1.75" Cordura pillow with a firm top layer), shown lying flat. Independent reconstruction from published dimensions; AbMat trademarks belong to AbMat.',
  params: [], footprint: { width: HIP_THRUST_PAD.length, depth: HIP_THRUST_PAD.width },
  vendor: vendorOf('AbMat', 'https://abmat.com/products/hip-thrust-pad', 'AbMat — Hip Thrust Pad (inventor Devan Grell)', 'AbMat and Hip Thrust Pad are trademarks of AbMat.',
    'Independent Manifold reconstruction. Published: 18" × 9" × 1.75", black Cordura outer, multi-layer foam. Estimated: 1" thick piped edge and the domed top; the HTP print and woven tag shown as plain plates. Scenery only, excluded from print export.'),
});
export interface AbMatModel { name: string; length: number; width: number; height: number; /** thin front lip, back end height and peak position (share of length), from side photos */ lip: number; back: number; peak: number; vinyl: boolean }
export const ABMAT_MODELS: readonly AbMatModel[] = [
  { name: 'AbMat (molded foam)', length: inch(14.5), width: inch(11.75), height: inch(2.75), lip: 7, back: inch(1.45), peak: .64, vinyl: false },
  { name: 'Original AbMat (vinyl covered)', length: inch(15), width: inch(12), height: inch(2.5), lip: 9, back: inch(1.35), peak: .62, vinyl: true },
];
export const abmatModel = (p: NumericParams) => { const m = ABMAT_MODELS[p.model]; if (!m) throw Error('Unsupported ab mat model.'); return m; };
export const ABMAT = defineFloorPart({
  id: 'abmat', name: 'AbMat', title: 'AbMat', noun: 'ab mat', section: 'Accessories',
  description: 'AbMat contoured sit-up pad: the single-molded closed-cell foam AbMat (14.5" × 11.75" × 2.75") and the vinyl-covered Original (15" × 12" × 2.5"). Independent reconstruction from published dimensions; AbMat trademarks belong to AbMat.',
  params: [{ key: 'model', label: 'Model', default: 0, options: idx(ABMAT_MODELS.length), format: named(ABMAT_MODELS.map(m => m.name)) }],
  // Length along floor depth: the thin tailbone lip faces -Y (the user sits in front of it).
  footprint: p => { const m = abmatModel(p); return { width: m.width, depth: m.length }; },
  vendor: vendorOf('AbMat', 'https://abmat.com/products/abmat', 'AbMat — AbMat and Original AbMat (inventor Fred Koch)', 'AbMat is a trademark of AbMat.',
    'Independent Manifold reconstruction. Published: 14.5" × 11.75" × 2.75" (molded) and 15" × 12" × 2.5" (Original). Estimated from side photos: lip thickness, peak position and back-end height of the arch. Printed wordmark and debossed MADE IN USA mark shown as plain plates. Scenery only, excluded from print export.'),
});
/** Foam discs that sit in vertical barbell-holder tubes. Size estimated from photos against 2" tube bores. */
export const PILLOW = { diameter: 52, thick: 25, gap: 12 } as const;
export const PILLOW_PACKS = [4, 10, 20, 40] as const;
export const pillowGrid = (pack: number): [number, number] => pack === 4 ? [2, 2] : pack === 10 ? [5, 2] : pack === 20 ? [5, 4] : [8, 5];
export const ABMAT_BARBELL_PILLOWS = defineFloorPart({
  id: 'abmat-barbell-pillows', name: 'Barbell Pillows', title: 'AbMat Barbell Pillows', noun: 'barbell pillows', section: 'Accessories',
  description: 'AbMat Barbell Pillows: closed-skin foam discs that cushion bars dropped into vertical storage tubes, laid out as a pack of 4, 10, 20 or 40. Independent reconstruction from product photos; AbMat trademarks belong to AbMat.',
  params: [{ key: 'pack', label: 'Pack', default: 4, options: PILLOW_PACKS, format: v => `${v} pack` }],
  footprint: p => { const [c, r] = pillowGrid(p.pack); return { width: c * PILLOW.diameter + (c - 1) * PILLOW.gap, depth: r * PILLOW.diameter + (r - 1) * PILLOW.gap }; },
  vendor: vendorOf('AbMat', 'https://abmat.com/products/barbell-pillows', 'AbMat — Barbell Pillows', 'AbMat is a trademark of AbMat.',
    'Independent Manifold reconstruction. Published: packs of 4, 10, 20 and 40, made in the USA. Estimated from photos: Ø52 × 25 mm disc (fits a 2" storage-tube bore), black foam with a smooth skin face. Scenery only, excluded from print export.'),
});

// ── Deadlift jacks ──────────────────────────────────────────────────────────────────────────────
/** Profiles are traced in the X (foot length) / Z plane; the plate lies in XZ, thickness along Y. */
export const GENESIS_JACK = { height: inch(18.25), foot: inch(7.5), footWidth: inch(2.25), footH: inch(1.2), plate: 6.35, bar: 30 } as const;
export const GENESIS_COLORS: readonly Swatch[] = [
  { name: 'REP black', hex: '#1b1c1e' }, { name: 'Onyx', hex: '#2a2b2e' }, { name: 'Snow', hex: '#e9e9e6' }, { name: 'Stone', hex: '#77797a' },
  { name: 'Moss', hex: '#5a5f3c' }, { name: 'Blood', hex: '#8d1f24' }, { name: 'Sea', hex: '#1f5f6e' },
];
export const REP_GENESIS_JACK = defineFloorPart({
  id: 'rep-kleva-genesis-jack-2', name: 'Genesis Jack 2.0', title: 'REP x Kleva Built Genesis Jack 2.0', noun: 'deadlift jack', section: 'Accessories',
  description: 'REP x Kleva Built Genesis Jack 2.0: a laser-cut aluminium rocker jack (18.25" tall, 7.5" foot) with a lined J-hook, finger-scalloped handle and ridged rocker foot. Independent reconstruction from published dimensions; REP Fitness and Kleva Built trademarks belong to their owners.',
  params: [colorParam(GENESIS_COLORS, 'Frame color')],
  footprint: { width: GENESIS_JACK.foot, depth: GENESIS_JACK.footWidth },
  vendor: vendorOf('REP Fitness', 'https://repfitness.com/products/rep-x-kleva-built-genesis-jack-2-0', 'REP Fitness x Kleva Built — Genesis Jack 2.0', 'REP Fitness is a trademark of REP Fitness; Genesis Jack and Kleva Built are trademarks of Kleva Built.',
    'Independent Manifold reconstruction. Published: 18.25" height, 7.5" × 2.25" foot, bars up to 30 mm, 1,000 lb rating, aluminium frame with plastic liners and feet. Estimated from studio photos (scaled to the 18.25" height): hook centre (~9"), handle 5.4" × 1.7" with four finger scallops, spine width, cheek and foot-block thicknesses. The REP x KB print is a plain plate. Scenery only, excluded from print export.'),
});
export const RITFIT_JACK = { height: inch(16.93), base: inch(7.87), baseWidth: inch(4.13), handle: inch(4.7), hookOpening: inch(1.18), lip: inch(2.05) } as const;
export const RITFIT_DEADLIFT_JACK = defineFloorPart({
  id: 'ritfit-deadlift-jack', name: 'RitFit deadlift jack', title: 'RitFit Deadlift Jack', noun: 'deadlift jack', section: 'Accessories',
  description: 'RitFit Deadlift Jack: a cranked steel plate with a diamond-textured hook guard and plastic handle, standing in a PVC tray base whose toe curls up for rocking (16.93" tall, 7.87" × 4.13" base). Independent reconstruction from the published dimension drawing; RitFit trademarks belong to RitFit.',
  params: [], footprint: { width: RITFIT_JACK.base, depth: RITFIT_JACK.baseWidth },
  vendor: vendorOf('RitFit', 'https://www.ritfitsports.com/products/ritfit-deadlift-jack-barbell-stand', 'RitFit — Deadlift Jack', 'RitFit is a trademark of RitFit.',
    'Independent Manifold reconstruction. Published: 16.93" height, 7.87" × 4.13" base, 4.7" handle, 1.18" hook opening, 2.05" lip, 660 lb rating. Estimated from the dimension drawing (~74 px/in): plate widths, hook centre (~9"), base thickness and toe curl. Diamond texture shown as a matte finish; RITFIT print as a plain plate. Scenery only, excluded from print export.'),
});

// ── Bench Blokz ─────────────────────────────────────────────────────────────────────────────────
/** Big Blok face and slot depths solved from the published board heights (2-board 3", 3-board 4.5", 4-board 6", 5-board 7.5")
 * against the outline drawing (~38.7 px/in); thickness from the 3" flat position (bar in the cross-face channel). */
export const BENCH_BLOKZ = { height: inch(8.56), width: inch(5.75), thick: inch(3.5), topSlot: inch(2.56), bottomSlot: inch(1.06), sideSlot: inch(1.25), channel: inch(.5), channelY: inch(3.74), chamfer: inch(.32) } as const;
export const BENCH_BLOKZ_MODELS = [{ name: 'Big Blok 2-5 (28 mm bars)', slot: 30 }, { name: 'Big Blok for BandBell (38 mm bars)', slot: 40 }] as const;
export const BENCH_BLOKZ_ENTRY = defineFloorPart({
  id: 'bench-blokz', name: 'Bench Blokz', title: 'Bench Blokz Big Blok', noun: 'bench blok', section: 'Accessories',
  description: 'Bench Blokz Big Blok: a chamfered closed-cell foam block that stands in for 2-, 3-, 4- and 5-board press boards depending on which slot holds the bar. Shown lying flat. Independent reconstruction from the published board heights; Bench Blokz trademarks belong to Bench Blokz.',
  params: [{ key: 'model', label: 'Model', default: 0, options: idx(BENCH_BLOKZ_MODELS.length), format: named(BENCH_BLOKZ_MODELS.map(m => m.name)) }],
  footprint: { width: BENCH_BLOKZ.width, depth: BENCH_BLOKZ.height },
  vendor: vendorOf('Bench Blokz', 'https://benchblokz.com/', 'Bench Blokz — Big Blok 2-5 and Big Blok for BandBell', 'Bench Blokz is a trademark of Bench Blokz; BandBell is a trademark of BandBell.',
    'Independent Manifold reconstruction. Published: 3/4.5/6/7.5" board heights, 28 mm (38 mm BandBell) bar slots, 600 lb rating. Estimated: 8.56" × 5.75" face and slot depths (2.56 / 1.06 / 1.25") solved from those heights against the outline drawing, 3.5" thickness, 0.5" cross channel. BENCHBLOKZ.COM stencil shown as a plain plate. Small Blok not modelled (its outline could not be dimensioned). Scenery only, excluded from print export.'),
});

// ── Lifting platforms ───────────────────────────────────────────────────────────────────────────
/** Garage Gym Reviews' DIY build: two crossed layers of ¾" plywood, a 4'×8' top sheet, 2'×8' stall-mat strips each side. */
export const DIY_PLATFORM = { size: inch(96), ply: inch(.75), layers: 3, center: inch(48) } as const;
export const DIY_FINISHES: readonly Swatch[] = [{ name: 'Raw plywood', hex: '#dcc095' }, { name: 'Golden oak stain', hex: '#b5803e' }, { name: 'Dark walnut stain', hex: '#6b4524' }];
export const DIY_LIFTING_PLATFORM = defineFloorPart({
  id: 'diy-lifting-platform', name: 'DIY lifting platform', title: "DIY 8'×8' lifting platform", noun: 'platform', section: 'Accessories', underlay: true,
  description: "The classic DIY 8'×8' deadlift / Olympic platform: two crossed layers of ¾\" plywood, a 4'×8' finished plywood centre and 2'-wide horse-stall-mat strips each side (cut from 4'×6' mats, so each strip has one cross seam). Built from the Garage Gym Reviews guide.",
  params: [
    { key: 'finish', label: 'Centre finish', default: 0, options: idx(DIY_FINISHES.length), format: named(DIY_FINISHES.map(f => f.name)) },
    { key: 'logo', label: 'Centre logo', default: 0, options: [0, 1], format: named(['None', 'Stencilled logo plate']) },
  ],
  footprint: { width: DIY_PLATFORM.size, depth: DIY_PLATFORM.size }, placement: { side: 'front', gap: 0 },
  vendor: vendorOf('DIY (Garage Gym Reviews guide)', 'https://www.garagegymreviews.com/diy-weightlifting-platform-with-squat-stand-attached', 'DIY lifting platform — build after Garage Gym Reviews (Coop Mitchell)', 'Garage Gym Reviews is a trademark of its owner; stall mats as sold by Tractor Supply.',
    'Independent Manifold reconstruction of the published build: 96" × 96", two crossed 3/4" base layers, 3/4" top (4\' × 8\' plywood centre, 2\' × 8\' stall-mat strips), 2.25" total. Estimated: screw rows, stain colours and the logo plate. Scenery only, excluded from print export.'),
});
/** Rogue 8'×8' Oly Platform (XX12931): 2"×2" 11-gauge frame around an 8'×8' bay of 24"×24"×1.5" tiles. */
export const ROGUE_PLATFORM = { inner: inch(96), tube: inch(2), tile: inch(24), tileH: inch(1.5), corner: inch(3), /** frame-bolt head proud of each outer face */ bolt: 6 } as const;
export const ROGUE_PLATFORM_FLOORS = ['16 crumb rubber tiles', '16 smooth black tiles', "Wood centre (4'×8') + 8 crumb tiles"] as const;
export const ROGUE_OLY_PLATFORM = defineFloorPart({
  id: 'rogue-8x8-oly-platform', name: "Rogue 8'×8' Oly Platform", title: "Rogue 8'×8' Oly Platform", noun: 'platform', section: 'Accessories', underlay: true,
  description: "Rogue 8'×8' Oly Platform: a bolt-together 2\"×2\" 11-gauge steel frame (8'4\" outside) with gusseted corner blocks, filled with 24\"×24\"×1.5\" rubber tiles or a 4'×8' wood centre. Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.",
  params: [{ key: 'floor', label: 'Flooring', default: 0, options: idx(ROGUE_PLATFORM_FLOORS.length), format: named(ROGUE_PLATFORM_FLOORS) }],
  footprint: { width: ROGUE_PLATFORM.inner + 2 * (ROGUE_PLATFORM.tube + ROGUE_PLATFORM.bolt), depth: ROGUE_PLATFORM.inner + 2 * (ROGUE_PLATFORM.tube + ROGUE_PLATFORM.bolt) }, placement: { side: 'front', gap: 0 },
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/rogue8x8-oly-platform', "Rogue Fitness — 8'×8' Oly Platform", 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    "Independent Manifold reconstruction. Published: 8'×8' inside, 8'4\" outside, 2\"×2\" 11-gauge frame, 24\"×24\"×1.5\" tiles (16, or 8 with a 4'×8' wood centre). Estimated: 3\" corner-block radius, bolt and anchor-tab positions, wood colour. The rail wordmark and wood stencil are plain plates. Scenery only, excluded from print export."),
});

/** Beyond Power Travel VOLTRA Platform: published 700 × 390 × 22 mm maple board, 6.2 kg. Everything else is measured on the
 * Beyond Power renders, the help-centre dock video and owner photos against that outline (research/floor-accessories.md).
 * Front (-Y) is the handle-slot edge; the dock sits centred along the length, 145 mm in from the rear edge. */
export const VOLTRA_PLATFORM = {
  length: 700, width: 390, board: 22, pad: 2.5, tape: .8, tapeInset: 5, corner: 28, edge: 4,
  slot: { w: 95, h: 50, inset: 20 }, dock: { d: 90, bore: 76, rise: 22, fromRear: 145, bolts: 78, counterbore: 98 },
  strips: { l: 240, w: 60, x: 190, y: 120 }, centrePad: [95, 110] as const,
  /** VOLTRA I envelope (docs/vendor/voltra.md): 323 × 139 × 100 mm. */
  voltra: { length: 323, width: 139, height: 100 },
} as const;
export const voltraDockY = () => VOLTRA_PLATFORM.width / 2 - VOLTRA_PLATFORM.dock.fromRear;
export const BEYOND_POWER_TRAVEL_PLATFORM = defineFloorPart({
  id: 'beyond-power-travel-voltra-platform', name: 'Travel VOLTRA Platform', title: 'Beyond Power Travel VOLTRA Platform', noun: 'platform', section: 'Accessories',
  description: 'Beyond Power Travel Platform for VOLTRA I: a 700 × 390 × 22 mm laminated maple board with black grip tape printed with a white half-court, a stainless dock the VOLTRA clicks into, a carry slot on the front edge and rubber pads underneath; optionally shown with a VOLTRA I docked. Independent reconstruction from published dimensions; Beyond Power and VOLTRA trademarks belong to Beyond Power.',
  params: [{ key: 'voltra', label: 'VOLTRA I', default: 0, options: [0, 1], format: named(['Empty dock', 'VOLTRA I docked']) }],
  footprint: { width: VOLTRA_PLATFORM.length, depth: VOLTRA_PLATFORM.width }, placement: { side: 'front', gap: 300 },
  vendor: vendorOf('Beyond Power', 'https://www.beyond-power.com/products/travel-platform', 'Beyond Power — Travel Platform (VOLTRA I), SKU 1.02.001.0022', 'Beyond Power and VOLTRA are trademarks of Beyond Power.',
    'Independent Manifold reconstruction. Published: 700 × 390 × 22 mm (27.6 × 15.4 × 0.87 in), maple wood, 6.2 kg, VOLTRA I aligned on the silver mounting circle, dock held by 8 screws under a rubber pad. Estimated from the Beyond Power renders, help-centre video and owner photos scaled to that outline: 90 mm dock 145 mm from the rear edge, 95 × 50 mm carry slot, 28 mm corners, grip-tape inset, court-line layout, four 240 × 60 mm rubber strips and the centre pad. The Beyond Power wordmark is typeset; the docked VOLTRA I is a simplified 323 × 139 × 100 mm body. Scenery only, excluded from print export.'),
});

// ── Foam rollers ────────────────────────────────────────────────────────────────────────────────
/** TriggerPoint GRID 1.0: 13" × 5.5" EVA over a hollow core. Zone lengths (ribs / flat "palm" bands) measured on the studio photo. */
export const GRID = { length: inch(13), diameter: inch(5.5), core: 102, bore: 95 } as const;
export const GRID_COLORS: readonly (Swatch & { core: string })[] = [
  { name: 'Black', hex: '#1c1d1f', core: '#b5d334' }, { name: 'Orange', hex: '#f08a1c', core: '#1c1d1f' }, { name: 'Lime', hex: '#b9d53a', core: '#1c1d1f' },
  { name: 'Pink', hex: '#e8457d', core: '#1c1d1f' }, { name: 'Teal', hex: '#1aa3a3', core: '#1c1d1f' }, { name: 'Mint', hex: '#8fe0c9', core: '#1c1d1f' }, { name: 'Midnight', hex: '#1d2a4a', core: '#b5d334' },
];
export const TRIGGERPOINT_GRID = defineFloorPart({
  id: 'triggerpoint-grid-foam-roller', name: 'GRID foam roller', title: 'TriggerPoint GRID 1.0 Foam Roller', noun: 'foam roller', section: 'Accessories',
  description: 'TriggerPoint GRID 1.0 (13" × 5.5"): EVA foam over a hollow core with the three-zone GRID surface — flat palm bands, tubular finger ribs and narrow fingertip columns. Shown lying on its side. Independent reconstruction from published dimensions; TriggerPoint trademarks belong to TriggerPoint.',
  params: [colorParam(GRID_COLORS)],
  footprint: { width: GRID.length, depth: GRID.diameter },
  vendor: vendorOf('TriggerPoint', 'https://www.tptherapy.com/products/grid-1-0-foam-roller', 'TriggerPoint — GRID 1.0 Foam Roller', 'TriggerPoint and GRID are trademarks of TriggerPoint / Implus.',
    'Independent Manifold reconstruction. Published: 13" × 5.5", hollow core, EVA foam, nine colourways. Estimated from the studio photo: rib and flat-zone lengths (2 ribs · palm · 4 ribs · palm · 2 ribs), longitudinal column angles, groove depths and the core bore. The logo badge is a plain framed plate. Scenery only, excluded from print export.'),
});
export const AMAZON_ROLLER = { diameter: inch(6), lengths: [12, 18, 24, 36] } as const;
export const AMAZON_ROLLER_COLORS: readonly (Swatch & { fleck?: string })[] = [{ name: 'Black', hex: '#1d1e20' }, { name: 'Blue speckled', hex: '#1d1e20', fleck: '#2f78d8' }, { name: 'Red speckled', hex: '#1d1e20', fleck: '#d0342c' }];
export const AMAZON_BASICS_ROLLER = defineFloorPart({
  id: 'amazon-basics-high-density-foam-roller', name: 'High-density foam roller', title: 'Amazon Basics High-Density Foam Roller', noun: 'foam roller', section: 'Accessories',
  description: 'Amazon Basics high-density moulded polypropylene bead-foam roller, 6" diameter in 12", 18", 24" and 36" lengths, plain black or speckled. Shown lying on its side. Independent reconstruction from published dimensions; Amazon Basics trademarks belong to Amazon.',
  params: [{ key: 'length', label: 'Length', default: 18, options: AMAZON_ROLLER.lengths, format: v => `${v}"` }, colorParam(AMAZON_ROLLER_COLORS)],
  footprint: p => ({ width: inch(p.length), depth: AMAZON_ROLLER.diameter }),
  vendor: vendorOf('Amazon Basics', 'https://www.amazon.com/dp/B00XM2MRGI', 'Amazon Basics — High-Density Round Foam Roller', 'Amazon and Amazon Basics are trademarks of Amazon.com, Inc.',
    'Independent Manifold reconstruction. Published: 6" diameter; 12, 18, 24 and 36" lengths; black, blue-speckled and red-speckled colourways. Estimated: end-edge radius and fleck density; the embossed end-face wordmark is a plain plate. Scenery only, excluded from print export.'),
});

// ── Squat wedges ────────────────────────────────────────────────────────────────────────────────
/** REP cork wedge: 8.8" × 5.3", 25° front / 45° back. REP's 4.9" height is inconsistent with those slopes; the height follows
 * from the slopes and ~0.5" end lips (3.3", which also matches the side photo). */
export const REP_WEDGE = { length: inch(8.8), width: inch(5.3), lip: inch(.5), front: 25, back: 45 } as const;
export const repWedgePeak = () => { const t1 = Math.tan(REP_WEDGE.back * Math.PI / 180), t2 = Math.tan(REP_WEDGE.front * Math.PI / 180), x = t2 * REP_WEDGE.length / (t1 + t2); return { x, z: REP_WEDGE.lip + t1 * x }; };
export const REP_CORK_SQUAT_WEDGE = defineFloorPart({
  id: 'rep-cork-squat-wedge', name: 'Cork squat wedge', title: 'REP Fitness Cork Squat Wedge', noun: 'squat wedge', section: 'Accessories',
  description: 'REP Fitness Cork Squat Wedge: a solid cork block with a 25° heel ramp and 45° back face, both covered in inset grip tape (8.8" × 5.3", sold in pairs). Independent reconstruction from published dimensions; REP Fitness trademarks belong to REP Fitness.',
  params: [], footprint: { width: REP_WEDGE.width, depth: REP_WEDGE.length }, pair: { gap: 70 },
  vendor: vendorOf('REP Fitness', 'https://repfitness.com/products/cork-squat-wedge', 'REP Fitness — Cork Squat Wedge', 'REP Fitness is a trademark of REP Fitness.',
    'Independent Manifold reconstruction. Published: 8.8" × 5.3", 25° / 45° slopes, 2.2 lb, 700 lb rating, sold as a pair. Estimated: 0.5" end lips and the resulting 3.3" height (the published 4.9" does not fit the slopes), 0.25" tape border, edge chamfers; side logos are plain plates. Scenery only, excluded from print export.'),
});
export const TITAN_WEDGE = { ramp: inch(15.5), sheet: 4.8, hem: 9, widths: [inch(20.5), inch(8.5)], angles: [15, 22.5, 30], heights: [inch(4.5), inch(6.5), inch(8.5)] } as const;
type P2 = [number, number];
/** Folded-sheet layout in the (y, z) side plane, centred on the footprint. The published heights fix the sheet length from the toe
 * hem to the top bend (~16.3" at every angle); the 15.5" ramp is the taped surface centred on it. The back leg drops at 68° to a
 * forward foot flange. */
export function titanWedgeLayout(p: NumericParams) {
  const i = TITAN_WEDGE.angles.indexOf(p.angle as 15), width = TITAN_WEDGE.widths[p.style];
  if (i < 0) throw Error('Unsupported squat wedge angle.'); if (!width) throw Error('Unsupported squat wedge style.');
  const a = p.angle * Math.PI / 180, t = TITAN_WEDGE.sheet, r = TITAN_WEDGE.hem / 2, height = TITAN_WEDGE.heights[i], u: P2 = [Math.cos(a), Math.sin(a)], n: P2 = [-u[1], u[0]];
  const A: P2 = [r, r], Ls = (height - r - t / 2) / u[1], B: P2 = [A[0] + u[0] * Ls, A[1] + u[1] * Ls];
  const legAngle = 68 * Math.PI / 180, F: P2 = [B[0] - (B[1] - t / 2) / Math.tan(legAngle), t / 2], d: P2 = [(B[0] - F[0]) / Math.hypot(B[0] - F[0], B[1] - F[1]), (B[1] - F[1]) / Math.hypot(B[0] - F[0], B[1] - F[1])];
  const off = (q: P2, v: P2, k: number): P2 => [q[0] + v[0] * k, q[1] + v[1] * k], ln: P2 = [d[1], -d[0]]; // leg normal, outward (+y)
  const ramp = [off(A, n, -t / 2), off(B, n, -t / 2), off(B, n, t / 2), off(A, n, t / 2)], leg = [off(F, ln, -t / 2), off(F, ln, t / 2), off(B, ln, t / 2), off(B, ln, -t / 2)];
  const foot: P2[] = [[F[0] - 30, 0], [F[0] + t / 2, 0], [F[0] + t / 2, t], [F[0] - 30, t]], s0 = (Ls - TITAN_WEDGE.ramp) / 2;
  const ys = [...ramp, ...leg, ...foot].map(q => q[0]), minY = Math.min(0, ...ys), maxY = Math.max(B[0] + t / 2, ...ys), shift = -(minY + maxY) / 2, sh = (q: P2): P2 => [q[0] + shift, q[1]];
  const mid: P2 = [(B[0] + F[0]) / 2, (B[1] + F[1]) / 2];
  return {
    a, width, height, depth: maxY - minY, hem: sh(A), bend: sh(B), ramp: ramp.map(sh), leg: leg.map(sh), foot: foot.map(sh),
    rampTop: [sh(off(off(A, n, t / 2), u, s0)), sh(off(off(A, n, t / 2), u, s0 + TITAN_WEDGE.ramp))] as [P2, P2],
    legTilt: -Math.asin(d[0]) * 180 / Math.PI, slotAt: sh(off(B, d, -38)), logoAt: sh(off(mid, ln, t / 2)),
  };
}
export const TITAN_SQUAT_WEDGE = defineFloorPart({
  id: 'titan-squat-wedge', name: 'Titan squat wedge', title: 'Titan Fitness Squat Wedge', noun: 'squat wedge', section: 'Accessories',
  description: 'Titan Fitness folded-steel squat wedge (15.5" ramp at 15°, 22.5° or 30°) with inset grip tape, an angle window and a slanted back leg with handle slot — one 20.5" wide single or an 8.5" wide pair. Independent reconstruction from published dimensions; Titan Fitness trademarks belong to Titan Fitness.',
  params: [
    { key: 'angle', label: 'Angle', default: 15, options: TITAN_WEDGE.angles, format: v => `${v}°` },
    { key: 'style', label: 'Style', default: 0, options: [0, 1], format: named(['Single (20.5" wide)', 'Pair (8.5" wide each)']) },
  ],
  footprint: p => { const w = titanWedgeLayout(p); return { width: w.width, depth: w.depth }; }, pair: { gap: 60 },
  vendor: vendorOf('Titan Fitness', 'https://www.titan.fitness/products/squat-wedge', 'Titan Fitness — Squat Wedge', 'Titan Fitness is a trademark of Titan Fitness.',
    'Independent Manifold reconstruction. Published: 15.5" ramp; 15° / 22.5° / 30° at 4.5" / 6.5" / 8.5" tall; 20.5" single or 8.5" pair. Estimated: the folded sheet runs ~16.3" from toe hem to top bend (solved from the published heights, so the 15.5" is the taped surface), 3/16" sheet, 9 mm toe hem, 68° back leg and foot flange, tape border and angle window; the leg logo is a plain plate. Scenery only, excluded from print export.'),
});

// ── Medicine and slam balls ─────────────────────────────────────────────────────────────────────
/** `lace`: how far the laced seam stands proud of the 14" sphere at the front (-Y). */
export const ROGUE_MED_BALL = { diameter: inch(14), lace: 3.9, weights: [4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30] } as const;
export const ROGUE_MEDICINE_BALL = defineFloorPart({
  id: 'rogue-medicine-ball', name: 'Rogue medicine ball', title: 'Rogue Medicine Ball', noun: 'medicine ball', section: 'Accessories',
  description: 'Rogue Medicine Ball: a 14" soft-shell wall ball in black coated vinyl with a laced closing seam, gore panels and printed weight (4–30 lb). Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'weight', label: 'Weight', default: 20, options: ROGUE_MED_BALL.weights, format: lbs }],
  footprint: { width: ROGUE_MED_BALL.diameter, depth: ROGUE_MED_BALL.diameter + ROGUE_MED_BALL.lace, offset: [0, -ROGUE_MED_BALL.lace / 2] },
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/rogue-medicine-balls', 'Rogue Fitness — Rogue Medicine Balls', 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction. Published: 14" diameter, 4–30 lb, black coated-vinyl shell, double-stitched nylon seams. Estimated: lacing length and latitude, gore count, soft contact flat. ROGUE / MADE IN THE USA wordmark as a plain plate; weight numerals in a plain stroke font. Scenery only, excluded from print export.'),
});
/** Echo Slam Ball: 9" (10–30 lb) and 10" (35–50 lb), red PVC. Groove latitudes read from the studio photo. */
export const ECHO_SLAM = { weights: [10, 15, 20, 25, 30, 35, 40, 45, 50], grooves: [48, 14, -7, -15, -48] } as const;
export const echoSlamDiameter = (lb: number) => inch(lb >= 35 ? 10 : 9);
export const ROGUE_ECHO_SLAM_BALL = defineFloorPart({
  id: 'rogue-echo-slam-ball', name: 'Echo Slam Ball', title: 'Rogue Echo Slam Ball', noun: 'slam ball', section: 'Accessories',
  description: 'Rogue Echo Slam Ball: a dead-bounce red PVC ball with a pebbled shell and moulded ring grooves, 9" (10–30 lb) or 10" (35–50 lb). Independent reconstruction from published dimensions; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'weight', label: 'Weight', default: 20, options: ECHO_SLAM.weights, format: lbs }],
  footprint: p => ({ width: echoSlamDiameter(p.weight), depth: echoSlamDiameter(p.weight) }),
  vendor: vendorOf('Rogue Fitness', 'https://www.roguefitness.com/rogue-echo-slam-balls', 'Rogue Fitness — Rogue Echo Slam Balls', 'Rogue, Rogue Fitness and Echo are trademarks of Rogue Fitness.',
    'Independent Manifold reconstruction. Published: 9" (10–30 lb) and 10" (35–50 lb) diameter, red PVC shell with white LB and Rogue markings. Estimated: groove latitudes and fill-plug size from photos; the ESB and ROGUE marks are plain plates, weights in a plain stroke font. Scenery only, excluded from print export.'),
});
export const DYNAMAX = { diameter: inch(14), lace: 3.0, weights: [4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30] } as const;
export const DYNAMAX_COLORS: readonly (Swatch & { band: string })[] = [
  { name: 'Black / Gray', hex: '#1c1c1e', band: '#b9bbbd' }, { name: 'Red / Gray', hex: '#b3232a', band: '#b9bbbd' }, { name: 'Blue / Gray', hex: '#2c5fb0', band: '#b9bbbd' },
  { name: 'Navy / Gray', hex: '#1f2b52', band: '#b9bbbd' }, { name: 'Green / Gray', hex: '#2b7a3d', band: '#b9bbbd' }, { name: 'Orange / Gray', hex: '#e06a1e', band: '#b9bbbd' },
  { name: 'Purple / Gray', hex: '#5a3a8c', band: '#b9bbbd' }, { name: 'Black / Black (Monster)', hex: '#1c1c1e', band: '#2a2a2c' },
];
export const DYNAMAX_MEDICINE_BALL = defineFloorPart({
  id: 'dynamax-medicine-ball', name: 'Dynamax medicine ball', title: 'Dynamax Medicine Ball', noun: 'medicine ball', section: 'Accessories',
  description: 'Dynamax Standard 14" medicine ball: a padded soft ball with a contrasting label panel front and back, laced seam and printed weight, in the Dynamax colour pairs. Independent reconstruction from published dimensions; Dynamax trademarks belong to Dynamax.',
  params: [{ key: 'weight', label: 'Weight', default: 10, options: DYNAMAX.weights, format: lbs }, colorParam(DYNAMAX_COLORS, 'Ball / panel colour')],
  footprint: { width: DYNAMAX.diameter, depth: DYNAMAX.diameter + DYNAMAX.lace, offset: [0, -DYNAMAX.lace / 2] },
  vendor: vendorOf('Dynamax', 'https://www.medicineballs.com/product/standard-ball/', 'Dynamax — Standard 14" Medicine Ball', 'Dynamax is a trademark of Dynamax Inc.',
    'Independent Manifold reconstruction. Published: 14" diameter, 2–35 lb (Rogue lists 4–30), colour pairs. Estimated: label-panel extents, lacing length and latitude; the DYNAMAX print is a plain plate, weights in a plain stroke font. Scenery only, excluded from print export.'),
});

// ── Calf block ──────────────────────────────────────────────────────────────────────────────────
/** U4C Fitness The Calf Curve: 3/16" steel bent into an omega (3.8" curve) 24" long, 7" across the feet, 4.5" tall. */
export const CALF_CURVE = { length: inch(24), width: inch(7), height: inch(4.5), curve: inch(3.8), sheet: inch(3 / 16), legs: [inch(2.3), inch(6.8), inch(5.8), inch(6.8), inch(2.3)], cutH: inch(2.4), pad: 3 } as const;
export const U4C_CALF_CURVE = defineFloorPart({
  id: 'u4c-calf-curve', name: 'The Calf Curve', title: 'U4C Fitness The Calf Curve', noun: 'calf block', section: 'Accessories',
  description: 'U4C Fitness The Calf Curve: a 24" calf-raise block of 3/16" steel bent into an omega with a grip-taped 3.8" curve, two handle cut-outs per side and six foot tabs. Independent reconstruction from published dimensions; U4C Fitness trademarks belong to U4C Fitness.',
  params: [{ key: 'pads', label: 'Rubber foot pads', default: 0, options: [0, 1], format: named(['None', 'Rubber pads']) }],
  footprint: { width: CALF_CURVE.length, depth: CALF_CURVE.width },
  vendor: vendorOf('U4C Fitness', 'https://u4cfitness.com/products/the-calf-curve-calf-raise-block', 'U4C Fitness — The Calf Curve', 'U4C Fitness and The Calf Curve are trademarks of U4C Fitness.',
    'Independent Manifold reconstruction. Published: 24" × 7" × 4.5", 3.8" curve, 3/16" steel, 12 lb, optional rubber pads. Estimated from the side photo: leg and cut-out lengths (2.3 / 6.8 / 5.8 / 6.8 / 2.3") and the 2.4" cut-out height. Scenery only, excluded from print export.'),
});

/** Highest-owned first (Gym Radar, Sep 2026). */
export const PARTS = [
  TSC_STALL_MAT, MASSENOMICS_GRIPPER, ABMAT_HIP_THRUST_PAD, ABMAT, ABMAT_BARBELL_PILLOWS, REP_GENESIS_JACK, BENCH_BLOKZ_ENTRY, DIY_LIFTING_PLATFORM,
  TRIGGERPOINT_GRID, RITFIT_DEADLIFT_JACK, REP_CORK_SQUAT_WEDGE, TITAN_SQUAT_WEDGE, AMAZON_BASICS_ROLLER, U4C_CALF_CURVE, ROGUE_MEDICINE_BALL, ROGUE_ECHO_SLAM_BALL,
  DYNAMAX_MEDICINE_BALL, ROGUE_OLY_PLATFORM, BEYOND_POWER_TRAVEL_PLATFORM,
] as const satisfies readonly FloorPart[];
