/** Strongman stones, kegs, tyres and stone platforms: data and catalog entries (metadata only). Sources in research/strongman.md. */
import { defineFloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { inch, LB, pick } from './strongman-loads.ts';

/** Poured concrete at 150 lb/ft³ (2400 kg/m³): the usual DIY atlas-stone mix (Slater/Rogue mould charts). */
export const CONCRETE = 2403;
export const ATLAS_DIAMETERS = [10, 12, 14, 16, 18, 20, 22, 24] as const;
export const sphereKg = (dMm: number, density: number) => density * Math.PI / 6 * (dMm / 1000) ** 3;
export const atlasLb = (dIn: number) => Math.round(sphereKg(inch(dIn), CONCRETE) / LB / 5) * 5;
export const DIY_ATLAS_STONE = defineFloorPart({
  id: 'diy-atlas-stone', name: 'Atlas stone', title: 'Atlas Stone (concrete, DIY)', noun: 'stone', section: 'Strongman',
  description: 'Home-poured concrete atlas stone in the standard 10-24" mould sizes, with the mould seam round its equator and the flat pour spot on top. Independent reconstruction of the common two-piece-mould stone; mould makers\' trademarks belong to their owners.',
  params: [{ key: 'diameter', label: 'Diameter', default: 16, options: ATLAS_DIAMETERS, format: v => `${v}" (~${atlasLb(v)} lb)` }],
  footprint: p => ({ width: inch(p.diameter), depth: inch(p.diameter) }), placement: { side: 'front', gap: 500 }, pair: { gap: 150 },
  vendor: { vendor: 'DIY (concrete atlas stone)', url: 'https://www.roguefitness.com/slater-stone-molds', credit: 'DIY concrete atlas stone cast in a standard two-piece mould', trademark: 'Mould brands (Slater, Rogue) are trademarks of their owners; no brand is implied.', reconstruction: 'Independent Manifold reconstruction of a home-poured concrete stone: nominal mould diameter, weight from 150 lb/ft³ concrete, equator seam and pour flat from owner photos. Surface texture and seam size estimated. Scenery only.' },
});
/** Natural lifting stone: granite boulder (2650 kg/m³), long/wide/tall about 1 : 0.75 : 0.5 once the resting face is flattened. */
export const GRANITE = 2650;
export const NATURAL_WEIGHTS = [50, 100, 150, 200, 250, 300, 400] as const;
/** Volume of the unit (length 1) boulder shape built by parts/strongman-stones.ts, measured once; checked by the tests. */
export const BOULDER_UNIT_VOLUME = .184;
export const BOULDER = { wide: .75, tall: .58 } as const; // tall is the pre-flattening half-axis ratio; resting stones stand ~0.45 L
export const boulderLength = (lb: number) => 1000 * Math.cbrt(lb * LB / GRANITE / BOULDER_UNIT_VOLUME);
export const NATURAL_STONE = defineFloorPart({
  id: 'diy-natural-stone', name: 'Natural stone', title: 'Natural Lifting Stone', noun: 'stone', section: 'Strongman',
  description: 'A natural granite lifting stone: an irregular, water-rounded boulder sized by weight (50-400 lb). Independent reconstruction of a typical field stone; no brand.',
  params: [{ key: 'weight', label: 'Weight', default: 150, options: NATURAL_WEIGHTS, format: v => `${v} lb` }],
  footprint: p => { const l = boulderLength(p.weight); return { width: l * BOULDER.wide, depth: l }; }, placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'DIY (natural stone)', url: 'https://gymradar.com/equipment/natural-stone-custom-diy', credit: 'Natural granite lifting stone (owner-sourced)', trademark: 'No trademark: a natural field stone.', reconstruction: 'Independent Manifold reconstruction: a rounded granite boulder (2650 kg/m³) with length/width/height ratios about 1 : 0.75 : 0.5 and a flattened resting face, sized to the chosen weight. Shape is representative, not a specific stone. Scenery only.' },
});
/** Mike Bartos Stone of Steel: 20" (135 lb empty) and 17" (100 lb empty) plate-loaded steel stones. */
export const STONE_OF_STEEL = [{ d: 20, lb: 135, max: '450+ lb' }, { d: 17, lb: 100, max: '~300 lb' }] as const;
export const BARTOS_STONE_OF_STEEL = defineFloorPart({
  id: 'mike-bartos-stone-of-steel', name: 'Stone of Steel', title: "Mike Bartos' Stone of Steel", noun: 'stone', section: 'Strongman',
  description: "Mike Bartos' Stone of Steel: the plate-loaded atlas stone, two flat-black steel hemispheres bolted at the top around an internal plate shaft. Independent reconstruction from published diameters and weights; Mike Bartos' PowerCenter trademarks belong to their owner.",
  params: [{ key: 'size', label: 'Diameter', default: 0, options: [0, 1], format: v => { const s = STONE_OF_STEEL[v]; return s ? `${s.d}" (${s.lb} lb empty, ${s.max})` : String(v); } }],
  footprint: p => { const s = pick(STONE_OF_STEEL, p.size, 'stone size'); return { width: inch(s.d), depth: inch(s.d) }; }, placement: { side: 'front', gap: 500 },
  vendor: { vendor: "Mike Bartos' PowerCenter", url: 'https://www.mbpowercenter.com/product/stone-of-steel/', credit: "Mike Bartos' PowerCenter — Stone of Steel", trademark: "Stone of Steel and Mike Bartos' PowerCenter are trademarks of their owner.", reconstruction: 'Independent Manifold reconstruction from the published 20" / 17" diameters, 135 / 100 lb empty weights and owner photos. Seam, bolt boss and print band estimated; the print is a plain white band without artwork. Scenery only.' },
});
/** Titan Husafell Stone Carry: 30" tall, 28.5" wide, 18.5" top edge, 8" bottom edge, 6" thick; 97 lb empty. */
export const TITAN_HUSAFELL = { h: inch(30), w: inch(28.5), top: inch(18.5), bottom: inch(8), t: inch(6), shoulder: inch(9.5) } as const;
export const TITAN_HUSAFELL_STONE = defineFloorPart({
  id: 'titan-husafell-stone-carry', name: 'Titan Husafell Stone Carry', title: 'Titan Husafell Stone Carry', noun: 'stone', section: 'Strongman',
  description: 'Titan Fitness Husafell Stone Carry: a plate-loadable steel shell traced from the legendary Icelandic stone, with an open top and laser-cut carry handles. Independent reconstruction from published dimensions; Titan trademarks belong to Titan Fitness.',
  params: [{ key: 'load', label: 'Plates inside', default: 0, options: [0, 1, 2], format: v => ['Empty (97 lb)', '2 × 45 lb inside', '3 × 45 lb inside'][v] ?? String(v) }],
  footprint: { width: TITAN_HUSAFELL.w, depth: TITAN_HUSAFELL.t }, placement: { side: 'front', gap: 500 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/husafell-stone', credit: 'Titan Fitness — Husafell Stone Carry (430029)', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 30" x 28.5" x 6" envelope, 18.5" top and 8" bottom edges and product photos. Shoulder height, handle slots and the top scoop are estimated. Scenery only.' },
});
/** US Sankey kegs (published nominal sizes): diameter, height, empty weight. Strongman kegs are filled with water or sand. */
export const KEGS = [
  { name: '1/2 barrel (15.5 gal)', d: inch(16.1), h: inch(23.3), lb: 30 },
  { name: '1/4 barrel slim (7.75 gal)', d: inch(11.1), h: inch(23.3), lb: 22 },
  { name: '1/6 barrel sixtel (5.16 gal)', d: inch(9.25), h: inch(23.3), lb: 16 },
  { name: '1/4 barrel stubby (7.75 gal)', d: inch(16.1), h: inch(13.9), lb: 22 },
] as const;
export const KEG_FILLS = ['Empty', 'Water', 'Dry sand'] as const;
export const kegGallons = [15.5, 7.75, 5.16, 7.75] as const;
export const kegWeight = (size: number, fill: number) => Math.round(KEGS[size].lb + (fill === 1 ? kegGallons[size] * 8.34 : fill === 2 ? kegGallons[size] * 3.785 * 1.6 / LB : 0));
export const DIY_KEG = defineFloorPart({
  id: 'diy-strongman-keg', name: 'Strongman keg', title: 'Strongman Keg (steel beer keg, DIY)', noun: 'keg', section: 'Strongman',
  description: 'A stainless US Sankey beer keg used as a strongman keg: rolled chimes with hand-holds, two rolling bands, domed ends and the spear valve, filled with water or sand. Independent reconstruction from standard keg dimensions; brewery trademarks belong to their owners.',
  params: [
    { key: 'size', label: 'Keg size', default: 0, options: [0, 1, 2, 3], format: v => KEGS[v]?.name ?? String(v) },
    { key: 'fill', label: 'Filled with', default: 2, options: [0, 1, 2], format: v => KEG_FILLS[v] ?? String(v) },
  ],
  footprint: p => { const k = pick(KEGS, p.size, 'keg size'); return { width: k.d, depth: k.d }; }, placement: { side: 'front', gap: 500 }, pair: { gap: 120 },
  vendor: { vendor: 'DIY (steel beer keg)', url: 'https://gymradar.com/equipment/keg-custom-diy', credit: 'US Sankey stainless beer keg repurposed as a strongman keg', trademark: 'Brewery names stamped on kegs belong to their owners; none are modelled.', reconstruction: 'Independent Manifold reconstruction from published US keg sizes (1/2 bbl 16.1" x 23.3", 1/4 slim 11.1" x 23.3", sixtel 9.25" x 23.3", 1/4 stubby 16.1" x 13.9"). Chime, band and hand-hold details from owner photos; fill weight is informational. Scenery only.' },
});
export const kegDescription = (p: NumericParams) => `${KEGS[p.size]?.name}: ~${kegWeight(p.size, p.fill)} lb`;
/** Flip tyres: published tractor tyre sizes (Firestone/Titan agricultural data books), outside diameter, section width, rim. */
export const TIRES = [
  { name: '18.4-34 tractor (~300 lb)', od: inch(64.4), width: inch(18.4), rim: inch(34) },
  { name: '18.4-38 tractor (~350 lb)', od: inch(68.3), width: inch(18.4), rim: inch(38) },
  { name: '20.8-38 tractor (~450 lb)', od: inch(72.8), width: inch(20.8), rim: inch(38) },
  { name: '23.1-26 combine (~550 lb)', od: inch(63.4), width: inch(23.1), rim: inch(26) },
  { name: '28L-26 combine (~700 lb)', od: inch(64.4), width: inch(28), rim: inch(26) },
  { name: '30.5L-32 combine (~900 lb)', od: inch(71.9), width: inch(30.5), rim: inch(32) },
] as const;
export const DIY_TIRE = defineFloorPart({
  id: 'diy-strongman-tire', name: 'Strongman tire', title: 'Strongman Tire (tractor tire)', noun: 'tire', section: 'Strongman',
  description: 'A used agricultural tractor or combine tire for flipping, lying flat, with R-1 chevron lugs, sidewalls and the open bead. Independent reconstruction from published tire sizes; tire makers\' trademarks belong to their owners.',
  params: [
    { key: 'size', label: 'Tire size', default: 2, options: TIRES.map((_, i) => i), format: v => TIRES[v]?.name ?? String(v) },
    { key: 'pose', label: 'Position', default: 0, options: [0, 1], format: v => ['Lying flat', 'Standing on tread'][v] ?? String(v) },
  ],
  footprint: p => { const t = pick(TIRES, p.size, 'tire size'); return p.pose ? { width: t.width, depth: t.od } : { width: t.od, depth: t.od }; },
  clearance: p => { const t = pick(TIRES, p.size, 'tire size'); return { width: t.od + 1200, depth: t.od * 2 + 600 }; },
  placement: { side: 'front', gap: 900 },
  vendor: { vendor: 'DIY (used tractor tire)', url: 'https://gymradar.com/equipment/strongman-tire-custom-diy', credit: 'Used agricultural tire (R-1 bar tread) for tire flips', trademark: 'Tire makers\' names and sidewall markings belong to their owners; none are modelled.', reconstruction: 'Independent Manifold reconstruction from published tire sizes (outside diameter, section width, rim diameter). Lug count, angle and depth follow an R-1 bar tread; weights are typical used-tire figures. Scenery only.' },
});
/** DIY atlas-stone loading platform from the common 2x6 plan: 36" square top, 3/4" plywood deck with rubber mat. */
export const PLATFORM_HEIGHTS = [36, 40, 44, 48, 52] as const;
export const PLATFORM = { top: inch(36), base: inch(36), lumber: [inch(1.5), inch(5.5)] as const, deck: inch(.75), mat: inch(.375) } as const;
export const DIY_STONE_PLATFORM = defineFloorPart({
  id: 'diy-atlas-stone-platform', name: 'Atlas stone platform', title: 'Atlas Stone Platform (DIY)', noun: 'platform', section: 'Strongman',
  description: 'The classic home-built atlas stone loading platform: a 2x6 lumber frame with 2x4 rails, a 36" square plywood deck and a rubber mat, built to a standard stone-load height. Independent reconstruction from the common build plan; no brand.',
  params: [{ key: 'height', label: 'Load height', default: 48, options: PLATFORM_HEIGHTS, format: v => `${v}"` }],
  footprint: { width: PLATFORM.top, depth: PLATFORM.top }, placement: { side: 'front', gap: 600 },
  vendor: { vendor: 'DIY (lumber build)', url: 'https://gymradar.com/equipment/atlas-stone-platform-custom-diy', credit: 'DIY atlas stone platform (2x6 frame, plywood deck)', trademark: 'No trademark: a home-built platform.', reconstruction: 'Independent Manifold reconstruction of the widely shared plan: 36" square top, 2x6 legs and aprons, 2x4 mid rails, 3/4" plywood and a 3/8" mat. Rail heights estimated; nominal lumber sizes (1.5" x 5.5"). Scenery only.' },
});
