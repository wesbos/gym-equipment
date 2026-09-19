/** Strongman sandbags: size tables and catalog entries (metadata only). Sources in research/strongman.md. */
import { defineFloorPart, type FloorBox } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { inch, kgLb, LB, lbKg, pick } from './strongman-loads.ts';

/** Upright strongman bag: `d` max diameter, `h` height, optional `top`/`bottom` diameters for tapered bags (mm). */
export interface BagSize { label: string; d: number; h: number; top?: number; bottom?: number }
/** Packed builder's sand plus the bulge of a filled shell (effective 1.8-1.9 kg/L, fitted to Rogue's published table). */
const bagHeight = (kg: number, d: number, density = 1.9, min = .42) => Math.max(min * d, kg / density / (Math.PI * (d / 2000) ** 2));

// Cerberus Dual-Ply: published bag heights per size; one 40 cm shell diameter (photo ratio + volume check).
export const CERBERUS_DUAL_PLY_SIZES: readonly BagSize[] = ([[45, 215], [60, 284], [80, 379], [100, 473], [120, 568], [140, 662], [160, 756], [180, 850]] as const)
  .map(([kg, h]) => ({ label: kgLb(kg), d: 400, h }));
// Rogue Strongman / Echo Strongman: published height x diameter table (in).
const ROGUE_TABLE = [[25, 4.5, 11.5], [50, 6, 13], [100, 7.5, 16], [150, 11.5, 16], [200, 15.5, 16], [250, 19.5, 16], [300, 22.5, 16], [400, 36, 16]] as const;
export const ROGUE_SANDBAG_SIZES: readonly BagSize[] = ROGUE_TABLE.map(([lb, h, d]) => ({ label: `${lb} lb`, d: inch(d), h: inch(h) }));
// Rogue Cyclone: published height, top and bottom diameters (in); the top is the wide end.
export const CYCLONE_SIZES: readonly BagSize[] = ([[100, 20, 14, 8], [150, 20, 16, 9.5], [200, 20, 18, 12], [250, 24.5, 18, 12]] as const)
  .map(([lb, h, top, bottom]) => ({ label: `${lb} lb`, d: inch(top), h: inch(h), top: inch(top), bottom: inch(bottom) }));
// Freedom Strength: 15 sizes, 25 lb steps; 16" shell (estimated), height from fill volume.
export const FREEDOM_SIZES: readonly BagSize[] = Array.from({ length: 15 }, (_, i) => 50 + 25 * i).map(lb => ({ label: `${lb} lb`, d: inch(16), h: bagHeight(lb * LB, inch(16), 1.95) }));
export const FREEDOM_COLORS = [{ name: 'Black with red top', body: '#1a1b1d', top: '#c4161c', logo: '#f2f2ef' }, { name: 'Limited edition white', body: '#eeeeea', top: '#eeeeea', logo: '#141414' }] as const;
/** The limited white run was sold in 50-200 lb only. */
export const freedomSizeOptions = (p: NumericParams) => p.color ? [0, 2, 4, 6] : FREEDOM_SIZES.map((_, i) => i);
// Bells of Steel Fitness Sandbag: 8 sizes 50-400 lb; 15.5" shell (estimated from photos), height from fill volume.
/** Side handles stand this far off the shell on either side (mm). */
export const BOS_HANDLE_REACH = 36;
export const BOS_SIZES: readonly BagSize[] = [50, 100, 150, 200, 250, 300, 350, 400].map(lb => ({ label: lbKg(lb), d: inch(15.5), h: bagHeight(lb * LB, inch(15.5)) }));

/** REP Sandbags: horizontal duffel with seven handles; published 20" small to 36" XL lengths. */
export interface DuffelSize { label: string; length: number; d: number; range: string }
export const REP_SANDBAG_SIZES: readonly DuffelSize[] = [
  { label: 'Small', length: inch(20), d: inch(8.5), range: '5-25 lb' },
  { label: 'Medium', length: inch(25), d: inch(10), range: '25-75 lb' },
  { label: 'Large', length: inch(30), d: inch(11.5), range: '50-125 lb' },
  { label: 'X-Large', length: inch(36), d: inch(12.5), range: '125-200 lb' },
];
export const REP_SANDBAG_COLORS = [['Black', '#1c1d1f'], ['Army Green', '#4a5234'], ['Blue', '#1e3fb4'], ['Camo', '#b59f76'], ['Pink', '#d8347c'], ['Red', '#c8142c'], ['Tan', '#c1a57a']] as const;
/** Blue and pink ship in small and medium only. */
export const repSizeOptions = (p: NumericParams) => p.color === 2 || p.color === 4 ? [0, 1] : [0, 1, 2, 3];
/** Flattened resting height of the REP duffel: the shell slumps to ~78% of its diameter. */
export const REP_SLUMP = .78;

/** Cerberus Throwing Sandbag: squat kettle-shaped bag, 10.5" x 1.5" silicone handle. */
export const THROWING_SIZES = [{ label: '10 kg / 22 lb', d: 260, h: 170 }, { label: '20 kg / 44 lb', d: 320, h: 215 }, { label: '35 kg / 77 lb', d: 380, h: 265 }] as const;
export const THROW_HANDLE = { length: inch(10.5), d: inch(1.5), rise: 150 } as const;
/** Cerberus Húsafell sandbag: coffin-hexagon slab lying on its face; sized from fill volume (area 0.78 W·H, H 1.1 W, T 0.38 W). */
export const HUSAFELL_BAG_SIZES = [60, 80, 100, 120, 140, 160, 180].map(kg => { const w = 1000 * Math.cbrt(kg / 1.75 / 1000 / (.78 * 1.1 * .38)); return { label: kgLb(kg), w, h: 1.1 * w, t: .38 * w }; });
/** Cerberus Sandstone: stone-shaped sandbag, 1.08:1 wide-to-tall once filled. */
export const SANDSTONE_SIZES = [20, 40, 60, 80, 100, 120, 140].map(kg => { const d = 1000 * Math.cbrt(6 * kg / 1.75 / 1000 / Math.PI / .93) ; return { label: kgLb(kg), d, h: .86 * d }; });

const bagBox = (sizes: readonly BagSize[]) => (p: NumericParams): FloorBox => { const s = pick(sizes, p.size, 'sandbag size'); return { width: s.d, depth: s.d }; };
const sizeParam = (sizes: readonly { label: string }[], def: number) => ({ key: 'size', label: 'Size', default: def, options: sizes.map((_, i) => i), format: (v: number) => sizes[v]?.label ?? String(v) });
const bagPlacement = { side: 'right' as const, gap: 400 };

export const CERBERUS_DUAL_PLY = defineFloorPart({
  id: 'cerberus-dual-ply-sandbag', name: 'Cerberus Dual-Ply Sandbag', title: 'Cerberus Dual-Ply Sandbag', noun: 'sandbag', section: 'Strongman',
  description: 'CERBERUS Dual-Ply strongman sandbag in eight fill sizes: red 1050D Cordura shell, black top band with double hook-and-loop straps and the black three-headed dog print. Independent reconstruction from published bag heights and photos; Cerberus trademarks belong to Cerberus Strength.',
  params: [sizeParam(CERBERUS_DUAL_PLY_SIZES, 3)], footprint: bagBox(CERBERUS_DUAL_PLY_SIZES), placement: bagPlacement,
  vendor: { vendor: 'Cerberus Strength', url: 'https://cerberus-strength.com/products/dual-ply-sandbag', credit: 'Cerberus Strength — Dual-Ply Sandbag (V3)', trademark: 'CERBERUS is a trademark of Cerberus Strength.', reconstruction: 'Independent Manifold reconstruction from the published per-size bag heights (21.5-85 cm) and product photos. The 40 cm shell diameter is estimated from photo proportions and fill volume; the filled-bag slump, strap layout and print outline are approximations; no logo artwork. Scenery only.' },
});
export const ROGUE_STRONGMAN_SANDBAG = defineFloorPart({
  id: 'rogue-strongman-sandbag', name: 'Rogue Strongman Sandbag', title: 'Rogue Strongman Sandbags', noun: 'sandbag', section: 'Strongman',
  description: 'Rogue Strongman Sandbag (made in USA) from 25 to 400 lb: black 1000D Cordura cylinder with the zipper protection flap and white ROGUE print on top. Independent reconstruction from the published height and diameter table; Rogue trademarks belong to Rogue Fitness.',
  params: [sizeParam(ROGUE_SANDBAG_SIZES, 4)], footprint: bagBox(ROGUE_SANDBAG_SIZES), placement: bagPlacement,
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-strongman-sandbags', credit: 'Rogue Fitness — Rogue Strongman Sandbags (RA1160)', trademark: 'Rogue and Rogue Strongman are trademarks of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published height/diameter table (25-400 lb) and product photos. Filled-bag slump, seam piping and flap size are estimated; the logo is a plain white bar. Scenery only.' },
});
export const ROGUE_ECHO_SANDBAG = defineFloorPart({
  id: 'rogue-echo-strongman-sandbag', name: 'Rogue Echo Strongman Sandbag', title: 'Rogue Echo Strongman Sandbags', noun: 'sandbag', section: 'Strongman',
  description: 'Rogue Echo Strongman Sandbag from 25 to 400 lb: handle-less black Cordura cylinder with the logo flap over the top zipper. Independent reconstruction from the published height and diameter table; Rogue trademarks belong to Rogue Fitness.',
  params: [sizeParam(ROGUE_SANDBAG_SIZES, 3)], footprint: bagBox(ROGUE_SANDBAG_SIZES), placement: bagPlacement,
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-echo-strongman-sandbags', credit: 'Rogue Fitness — Rogue Echo Strongman Sandbags (IP1300)', trademark: 'Rogue and Rogue Echo are trademarks of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published height/diameter table (25-400 lb) and product photos. Filled-bag slump, seam piping and flap size are estimated; the logo is a plain white bar. Scenery only.' },
});
export const ROGUE_CYCLONE_SANDBAG = defineFloorPart({
  id: 'rogue-cyclone-strongman-sandbag', name: 'Rogue Cyclone Strongman Sandbag', title: 'Rogue Cyclone Strongman Sandbags', noun: 'sandbag', section: 'Strongman',
  description: 'Rogue Cyclone Strongman Sandbag, 100-250 lb: the patented tapered bag, wider at the top than the bottom, with the logo flap on top. Independent reconstruction from the published height and top/bottom diameters; Rogue trademarks belong to Rogue Fitness.',
  params: [sizeParam(CYCLONE_SIZES, 1)], footprint: bagBox(CYCLONE_SIZES), placement: bagPlacement,
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-cyclone-strongman-sandbags', credit: 'Rogue Fitness — Rogue Cyclone Strongman Sandbags', trademark: 'Rogue and Cyclone are trademarks of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published heights (20-24.5") and top/bottom diameters (14-18" / 8-12") and product photos. Slump, seam piping and flap size estimated; the logo is a plain white bar. Scenery only.' },
});
export const FREEDOM_STRENGTH_SANDBAG = defineFloorPart({
  id: 'freedom-strength-strongman-sandbag', name: 'Freedom Strength Strongman Sandbag', title: 'Freedom Strength Strongman Sandbag', noun: 'sandbag', section: 'Strongman',
  description: 'Freedom Strength Strongman Sandbag in 15 sizes from 50 to 400 lb: black 1050D Cordura with the flap-free red top panel and white eagle print, or the limited white run. Independent reconstruction from photos and fill volume; Freedom Strength trademarks belong to Freedom Strength Co.',
  params: [
    { key: 'color', label: 'Colour', default: 0, options: [0, 1], format: v => FREEDOM_COLORS[v]?.name ?? String(v) },
    { key: 'size', label: 'Size', default: 4, options: freedomSizeOptions, format: v => FREEDOM_SIZES[v]?.label ?? String(v) },
  ],
  footprint: bagBox(FREEDOM_SIZES), placement: bagPlacement,
  vendor: { vendor: 'Freedom Strength Co.', url: 'https://freedomstrength.us/products/strongman-sandbag', credit: 'Freedom Strength Co. — Strongman Sandbag (V3)', trademark: 'Freedom Strength is a trademark of Freedom Strength Co.', reconstruction: 'Independent Manifold reconstruction from product photos and the published 50-400 lb size range. No dimensions are published: the 16" shell and the per-size heights (packed sand, 1.95 kg/L effective) are estimates; the eagle print is a plain white badge. Scenery only.' },
});
export const BELLS_OF_STEEL_SANDBAG = defineFloorPart({
  id: 'bells-of-steel-fitness-sandbag', name: 'Bells of Steel Fitness Sandbag', title: 'Bells of Steel Fitness Sandbags', noun: 'sandbag', section: 'Strongman',
  description: 'Bells of Steel Fitness Sandbag, 50-400 lb: black Cordura strongman cylinder with a webbing grab handle over the top closure, two side handles and the white weight print. Independent reconstruction from photos and fill volume; Bells of Steel trademarks belong to Bells of Steel.',
  params: [sizeParam(BOS_SIZES, 3)], footprint: p => { const s = pick(BOS_SIZES, p.size, 'sandbag size'); return { width: s.d + BOS_HANDLE_REACH * 2, depth: s.d }; }, placement: bagPlacement,
  vendor: { vendor: 'Bells of Steel', url: 'https://www.bellsofsteel.com/products/sandbags', credit: 'Bells of Steel — Fitness Sandbags', trademark: 'Bells of Steel is a trademark of Bells of Steel.', reconstruction: 'Independent Manifold reconstruction from product photos and the published 50-400 lb capacities. No dimensions are published: the 15.5" shell and heights from fill volume are estimates; the weight print is a plain white badge. Scenery only.' },
});
export const REP_SANDBAG = defineFloorPart({
  id: 'rep-sandbag', name: 'REP Sandbag', title: 'REP Sandbags', noun: 'sandbag', section: 'Strongman',
  description: 'REP Fitness training sandbag in four sizes and seven colours: a 1000D Cordura duffel with two wrap straps, seven riveted webbing handles and the top zipper. Independent reconstruction from the published 20-36" lengths; REP trademarks belong to REP Fitness.',
  params: [
    { key: 'color', label: 'Colour', default: 0, options: REP_SANDBAG_COLORS.map((_, i) => i), format: v => REP_SANDBAG_COLORS[v]?.[0] ?? String(v) },
    { key: 'size', label: 'Size', default: 1, options: repSizeOptions, format: v => { const s = REP_SANDBAG_SIZES[v]; return s ? `${s.label} (${s.range})` : String(v); } },
  ],
  footprint: p => { const s = pick(REP_SANDBAG_SIZES, p.size, 'sandbag size'); return { width: s.d * 1.1 + 40, depth: s.length + 30 }; },
  placement: bagPlacement, pair: { gap: 150 },
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/sandbags', credit: 'REP Fitness — Sandbags', trademark: 'REP is a trademark of REP Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 20" (small) to 36" (XL) lengths, handle count and product photos. Bag diameters, slump and strap spacing are estimated; the camo colourway is approximated with blotch patches; no logo artwork. Scenery only.' },
});
export const CERBERUS_THROWING_SANDBAG = defineFloorPart({
  id: 'cerberus-throwing-sandbag', name: 'Cerberus Strongman Throwing Sandbag', title: 'Cerberus Strongman Throwing Sandbag', noun: 'sandbag', section: 'Strongman',
  description: 'CERBERUS Strongman Throwing Sandbag (10, 20 or 35 kg): squat red Cordura bag with the 10.5" x 1.5" silicone handle on black webbing. Independent reconstruction from the published handle size and photos; Cerberus trademarks belong to Cerberus Strength.',
  params: [sizeParam(THROWING_SIZES, 1)],
  footprint: p => { const s = pick(THROWING_SIZES, p.size, 'sandbag size'); return { width: s.d, depth: s.d * .92 }; },
  placement: bagPlacement, pair: { gap: 150 },
  vendor: { vendor: 'Cerberus Strength', url: 'https://cerberus-strength.com/products/strongman-throwing-bag', credit: 'Cerberus Strength — Strongman Throwing Sandbag (V2)', trademark: 'CERBERUS is a trademark of Cerberus Strength.', reconstruction: 'Independent Manifold reconstruction from the published 10.5" x 1.5" handle, capacities and product photos. Bag diameters and heights are estimated from fill volume; strap routing approximated; no logo artwork. Scenery only.' },
});
export const CERBERUS_HUSAFELL_SANDBAG = defineFloorPart({
  id: 'cerberus-husafell-sandbag', name: 'Cerberus Húsafell Sandbag', title: 'Cerberus Húsafell Strongman Sandbag', noun: 'sandbag', section: 'Strongman',
  description: 'CERBERUS Húsafell replica sandbag (60-180 kg): coffin-hexagon slab with a red face, black piping and black side walls, lying on its back. Independent reconstruction from photos and fill volume; Cerberus trademarks belong to Cerberus Strength.',
  params: [sizeParam(HUSAFELL_BAG_SIZES, 2)],
  footprint: p => { const s = pick(HUSAFELL_BAG_SIZES, p.size, 'sandbag size'); return { width: s.w, depth: s.h }; },
  placement: bagPlacement,
  vendor: { vendor: 'Cerberus Strength', url: 'https://cerberus-strength.com/products/dual-ply-husafell-sandbag', credit: 'Cerberus Strength — Húsafell Strongman Sandbag', trademark: 'CERBERUS is a trademark of Cerberus Strength.', reconstruction: 'Independent Manifold reconstruction from product photos (outline traced from the front view) and the published 60-180 kg sizes. No dimensions are published: width, height and thickness come from fill volume at 1.75 kg/L; no logo artwork. Scenery only.' },
});
export const CERBERUS_SANDSTONE = defineFloorPart({
  id: 'cerberus-sandstone-sandbag', name: 'Cerberus Sandstone Sandbag', title: 'Cerberus Sandstone Sandbag', noun: 'sandbag', section: 'Strongman',
  description: 'CERBERUS Sandstone (20-140 kg): a panelled red Cordura atlas-stone sandbag with the black logo band and the black strap flap over the top closure. Independent reconstruction from photos and fill volume; Cerberus trademarks belong to Cerberus Strength.',
  params: [sizeParam(SANDSTONE_SIZES, 3)],
  footprint: p => { const s = pick(SANDSTONE_SIZES, p.size, 'sandbag size'); return { width: s.d, depth: s.d }; },
  placement: bagPlacement,
  vendor: { vendor: 'Cerberus Strength', url: 'https://cerberus-strength.com/products/sandstone-strongman-sandbag', credit: 'Cerberus Strength — Sandstone Sandbag', trademark: 'CERBERUS is a trademark of Cerberus Strength.', reconstruction: 'Independent Manifold reconstruction from product photos and the published 20-140 kg sizes. No dimensions are published: diameters come from fill volume at 1.75 kg/L and a 1.08:1 slump; panel seams and the logo band are approximations without artwork. Scenery only.' },
});
