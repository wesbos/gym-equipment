/** Room decor (#201): structure, ceiling fixtures, Levrack storage and furniture that stand on the floor or hang from the
 * ceiling. Metadata only (main bundle): never import Manifold builders here. Family slot: floor-registry.ts spreads PARTS.
 * Research: ../research/decor.md. Builders: ../parts/decor.ts and ../parts/decor-levrack.ts.
 *
 * Ceiling-hung parts (beam, lights, fan, rig) are floor items with a `ceiling` height param: their footprint is the plan
 * outline under them and they are `underlay`s, so they never raise overlap warnings with the equipment below. Every
 * footprint's X is the part's width and Y its depth; ceiling parts reach from z = ceiling down to their lowest point. */
import { defineFloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';

export const inch = (v: number) => v * 25.4, ft = (v: number) => v * 304.8;
const range = (a: number, b: number, step: number) => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step);
const pick = <T,>(list: readonly T[], i: number, what: string) => { const v = list[i]; if (v === undefined) throw Error(`Unsupported ${what}.`); return v; };
const COOP = 'https://www.youtube.com/watch?v=QCfulhfSSNo';
const generic = (product: string, reconstruction: string, url = COOP): VendorAttribution => ({
  vendor: 'Generic', url, credit: `Generic — ${product}`, trademark: 'Generic building product; no brand shown.', reconstruction,
});
const SCENERY = ' Scenery only, excluded from print export.';
export const CEILINGS = range(2100, 3600, 25);
const ceilingParam = (fallback = 2750) => ({ key: 'ceiling', label: 'Ceiling height', default: fallback, options: CEILINGS, format: (v: number) => `${v} mm` });

// ── Structure ─────────────────────────────────────────────────────────────────────────────────────────
export const LALLY = { diameters: [inch(3.5), inch(4)], plate: inch(6), plateT: inch(3 / 8) } as const;
export const LALLY_POST = defineFloorPart({
  id: 'decor-lally-post', name: 'Lally post', title: 'Steel lally column', noun: 'post', section: 'Room decor',
  description: 'A 3-1/2″ or 4″ round steel lally column with 6″ square base and cap plates, painted black, carrying a basement beam. Independent reconstruction of a generic column; no brand shown.',
  params: [
    { key: 'height', label: 'Height to beam', default: 2400, options: range(2000, 3600, 25), format: (v: number) => `${v} mm` },
    { key: 'diameter', label: 'Diameter', default: 0, options: [0, 1], format: (v: number) => v ? '4″' : '3-1/2″' },
  ],
  footprint: { width: LALLY.plate, depth: LALLY.plate },
  vendor: generic('steel lally column', 'Published standard sizes: 3-1/2″ and 4″ OD columns with bolted 6″ × 6″ × 3/8″ plates. Paint and the plate bolts estimated from Coop’s tour (5:27, 9:42).' + SCENERY),
});
export const BEAM_LENGTHS = range(1000, 15000, 250);
export const BIRCH_BEAM = defineFloorPart({
  id: 'decor-birch-beam', name: 'Birch-clad beam', title: 'Birch-clad basement beam', noun: 'beam', section: 'Room decor', underlay: true,
  description: 'A dropped basement beam boxed in birch plywood with 1/8″ reveals between the 8 ft panels and stainless screw heads, hung at the ceiling. Independent reconstruction of Coop’s DIY cladding; no brand shown.',
  params: [
    { key: 'length', label: 'Length', default: 12000, options: BEAM_LENGTHS, format: (v: number) => `${(v / 1000).toFixed(2)} m` },
    { key: 'width', label: 'Width', default: 400, options: range(200, 600, 25), format: (v: number) => `${v} mm` },
    { key: 'drop', label: 'Drop below ceiling', default: 350, options: range(150, 600, 25), format: (v: number) => `${v} mm` },
    ceilingParam(),
  ],
  validate: p => { if (p.drop >= p.ceiling - 1500) throw Error('The beam must stay 1.5 m above the floor.'); },
  footprint: p => ({ width: p.length, depth: p.width }),
  vendor: generic('birch-clad beam', 'Coop clads his steel beam in birch plywood with an 1/8″ gap between boards and stainless screws (10:05–10:20). Width, drop and the 8 ft panel joints estimated from the tour.' + SCENERY),
});
export const WALL_SECTION_FINISHES = ['Painted drywall', 'Birch wainscot on the front', 'Birch wainscot both sides'] as const;
export const WALL_BLOCK = defineFloorPart({
  id: 'decor-wall-section', name: 'Wall section', title: 'Drywall wall section', noun: 'wall section', section: 'Room decor',
  description: 'A straight run of framed wall in white drywall, with an optional birch plywood wainscot and baseboard: a partition, a closet return, or a thick return that shapes an L-shaped room inside the builder’s rectangle. Independent reconstruction; no brand shown.',
  params: [
    { key: 'length', label: 'Length', default: 2400, options: range(300, 15000, 100), format: (v: number) => `${v} mm` },
    { key: 'thickness', label: 'Thickness', default: 150, options: range(100, 6000, 50), format: (v: number) => `${v} mm` },
    { key: 'height', label: 'Height', default: 2750, options: range(900, 3600, 25), format: (v: number) => `${v} mm` },
    { key: 'finish', label: 'Finish', default: 1, options: [0, 1, 2], format: (v: number) => WALL_SECTION_FINISHES[v] ?? String(v) },
    { key: 'wainscot', label: 'Wainscot height', default: 1220, options: range(600, 1800, 20), format: (v: number) => `${v} mm` },
  ],
  validate: p => { if (p.finish && p.wainscot >= p.height - 100) throw Error('The wainscot must stop below the top of the wall.'); },
  footprint: p => ({ width: p.length, depth: p.thickness }),
  vendor: generic('drywall wall section', 'Half-inch drywall on studs, a 3-1/2″ painted baseboard, a birch plywood wainscot with a flat cap, as in Coop’s basement (9:40–10:30). The front face is local −Y.' + SCENERY),
});

// ── Lighting and air ─────────────────────────────────────────────────────────────────────────────────
export const LINEAR_LED = { width: 70, height: 60, section: ft(4) } as const;
export const HE_WILLIAMS_LINEAR = defineFloorPart({
  id: 'he-williams-linear-led', name: 'Linear LED fixture', title: 'H.E. Williams linear LED', noun: 'light', section: 'Room decor', underlay: true,
  description: 'A continuous run of H.E. Williams-style surface linear LED fixtures in 4 ft sections: a slim white extrusion with a frosted, self-lit lens, mounted on the ceiling. Independent reconstruction; H.E. Williams trademarks belong to H.E. Williams, Inc.',
  params: [
    { key: 'sections', label: 'Length', default: 2, options: range(1, 12, 1), format: (v: number) => `${v * 4} ft (${v} × 4 ft)` },
    ceilingParam(),
  ],
  footprint: p => ({ width: p.sections * LINEAR_LED.section, depth: LINEAR_LED.width }),
  vendor: { vendor: 'H.E. Williams', url: 'https://www.hewilliams.com/', credit: 'H.E. Williams — linear LED', trademark: 'H.E. Williams is a trademark of H.E. Williams, Inc.',
    reconstruction: 'Coop’s high-CRI 5000 K linear lights come in 4 ft and 8 ft sections (7:00–7:20). Extrusion section (70 × 60 mm), end caps and joints estimated from the tour.' + SCENERY },
});
export const FAN_DIAMETERS = [60, 72, 84, 96] as const;
export const FAN_BLADES = [5, 6, 8] as const;
export const DOWNRODS = [0, 150, 300, 450, 600] as const;
export const fanSpan = (p: NumericParams) => inch(pick(FAN_DIAMETERS, p.diameter, 'fan diameter'));
export const BIG_ASS_FANS_I6 = defineFloorPart({
  id: 'big-ass-fans-i6', name: 'Big Ass Fans i6', title: 'Big Ass Fans i6 ceiling fan', noun: 'fan', section: 'Room decor', underlay: true,
  description: 'A Big Ass Fans i6 in black: a flat cylindrical motor on a canopy or downrod with six aluminium airfoil blades, in 60–96″ spans. Also builds 5- and 8-blade variants. Independent reconstruction; Big Ass Fans and i6 are trademarks of Delta T LLC.',
  params: [
    { key: 'diameter', label: 'Diameter', default: 1, options: [0, 1, 2, 3], format: (v: number) => FAN_DIAMETERS[v] ? `${FAN_DIAMETERS[v]}″` : String(v) },
    { key: 'blades', label: 'Blades', default: 1, options: [0, 1, 2], format: (v: number) => FAN_BLADES[v] ? `${FAN_BLADES[v]} blades` : String(v) },
    { key: 'downrod', label: 'Downrod', default: 0, options: [0, 1, 2, 3, 4], format: (v: number) => v ? `${DOWNRODS[v]} mm` : 'Flush mount' },
    ceilingParam(),
  ],
  footprint: p => ({ width: fanSpan(p), depth: fanSpan(p) }),
  vendor: { vendor: 'Big Ass Fans', url: 'https://bigassfans.com/i6-ceiling-fan/', credit: 'Big Ass Fans — i6', trademark: 'Big Ass Fans and i6 are trademarks of Delta T LLC.',
    reconstruction: 'Published: six aluminium airfoils, 60/72/84/96″ spans, flush or downrod mounting. Motor and canopy proportions and the blade planform estimated from product photos and Coop’s tour (0:42, 7:00–7:15), where two black 6-blade fans hang between the light rows.' + SCENERY },
});
export const RIG_LAYOUTS = ['Gymnastic rings', 'Trapeze bars', 'Rings and bars alternating'] as const;
export const RIG = { board: 290, boardT: 19, ringsGap: 500, strap: 38 } as const;
export const rigLength = (p: NumericParams) => (p.stations - 1) * p.spacing + 600;
export const CEILING_RIG = defineFloorPart({
  id: 'decor-ceiling-rig', name: 'Ceiling rig', title: 'Ceiling-mounted rings and monkey-bar rig', noun: 'rig', section: 'Room decor', underlay: true,
  description: 'A birch board lagged to the ceiling joists with pairs of eye bolts, carrying wooden gymnastic rings and trapeze-style monkey bars on adjustable straps (and an optional climbing rope), like the kids’ course over Coop’s turf lane. Independent reconstruction of a DIY build; no brand shown.',
  params: [
    { key: 'stations', label: 'Stations', default: 8, options: range(2, 16, 1), format: (v: number) => `${v} stations` },
    { key: 'spacing', label: 'Spacing', default: 750, options: range(450, 1200, 50), format: (v: number) => `${v} mm` },
    { key: 'layout', label: 'Hanging', default: 2, options: [0, 1, 2], format: (v: number) => RIG_LAYOUTS[v] ?? String(v) },
    { key: 'hang', label: 'Grip height', default: 1900, options: range(1200, 2600, 50), format: (v: number) => `${v} mm` },
    { key: 'rope', label: 'Climbing rope', default: 1, options: [0, 1], format: (v: number) => v ? 'At one end' : 'None' },
    ceilingParam(),
  ],
  validate: p => { if (p.hang > p.ceiling - 350) throw Error('The grips must hang at least 350 mm below the ceiling.'); },
  footprint: p => ({ width: rigLength(p), depth: RIG.ringsGap + 44 }),
  vendor: generic('ceiling rings and monkey-bar rig', 'Coop built a monkey-bar course on a birch strip over the turf (5:20–5:25, 10:35): eye bolts in pairs, wooden rings on blue straps, green bars on yellow straps and a climbing rope. Spacing, board size and strap lengths estimated.' + SCENERY),
});

// ── Levrack ───────────────────────────────────────────────────────────────────────────────────────────
const LEVRACK_TM = 'Levrack is a trademark of Levrack, LLC.';
export const LEVRACK = { upright: inch(3), header: 150, gray: '#6d7174', lengths: [7, 8, 10, 12], depths: [30, 36, 48], heights: [7, 8] } as const;
/** A Levrack's published overall length is 6″ over its nominal size (8 ft → 8′6″). */
export const levrackLength = (p: NumericParams) => ft(pick(LEVRACK.lengths, p.length, 'Levrack length')) + inch(6);
export const levrackDepth = (p: NumericParams) => inch(pick(LEVRACK.depths, p.depth, 'Levrack depth'));
export const levrackHeight = (p: NumericParams) => ft(pick(LEVRACK.heights, p.height, 'Levrack height'));
const levrackParams = [
  { key: 'length', label: 'Length', default: 0, options: [0, 1, 2, 3], format: (v: number) => LEVRACK.lengths[v] ? `${LEVRACK.lengths[v]} ft` : String(v) },
  { key: 'depth', label: 'Depth', default: 0, options: [0, 1, 2], format: (v: number) => LEVRACK.depths[v] ? `${LEVRACK.depths[v]}″` : String(v) },
  { key: 'height', label: 'Height', default: 0, options: [0, 1], format: (v: number) => LEVRACK.heights[v] ? `${LEVRACK.heights[v]} ft` : String(v) },
];
export const LEVRACK_MOBILE_STORAGE = defineFloorPart({
  id: 'levrack-mobile-storage', name: 'Levrack', title: 'Levrack mobile cabinet storage', noun: 'storage unit', section: 'Room decor',
  description: 'A Levrack: a black pallet-rack frame with an overhead track and a lettered header, carrying tall Stealth Grey cabinets that roll out sideways from the frame on the track, with red pull handles. 7–12 ft long, 30–48″ deep, 7 or 8 ft tall. Independent reconstruction; Levrack trademarks belong to Levrack, LLC.',
  params: levrackParams,
  footprint: p => ({ width: levrackLength(p), depth: levrackDepth(p) }),
  vendor: { vendor: 'Levrack', url: 'https://levrack.com/product/8ft-levrack/', credit: 'Levrack — mobile cabinet storage', trademark: LEVRACK_TM,
    reconstruction: 'Published: 7/8/10/12 ft systems 6″ over nominal length, 7 or 8 ft tall, 30/36/48″ deep, mobile cabinets 15″ and 18″ wide, Stealth Grey. Upright size, track, header and handles estimated from Coop’s tour (1:32–2:20) and Levrack photos. ' + SCENERY },
});
export const WORKSTATION_LENGTHS = [4, 8] as const;
export const LEVRACK_WORKSTATION = defineFloorPart({
  id: 'levrack-workstation', name: 'Levrack Workstation', title: 'Levrack Workstation', noun: 'workstation', section: 'Room decor',
  description: 'The Levrack Workstation: an 11-gauge powder-coated steel bench top on pallet-rack uprights, with a two-drawer bank and a black slatwall back and end panel, 4 or 8 ft long. Independent reconstruction; Levrack trademarks belong to Levrack, LLC.',
  params: [
    { key: 'length', label: 'Length', default: 0, options: [0, 1], format: (v: number) => `${WORKSTATION_LENGTHS[v] ?? v} ft` },
    { key: 'drawers', label: 'Drawers', default: 2, options: [0, 1, 2, 3], format: (v: number) => v ? `${v} drawer${v > 1 ? 's' : ''}` : 'Open' },
    { key: 'slatwall', label: 'Slatwall', default: 2, options: [0, 1, 2], format: (v: number) => ['None', 'Back panel', 'Back and end panels'][v] ?? String(v) },
  ],
  footprint: p => ({ width: ft(pick(WORKSTATION_LENGTHS, p.length, 'workstation length')) + inch(3), depth: inch(30) }),
  vendor: { vendor: 'Levrack', url: 'https://levrack.com/product/levrack-workstation/', credit: 'Levrack — Workstation', trademark: LEVRACK_TM,
    reconstruction: 'Published: 4 ft and 8 ft lengths, 11-gauge solid steel tops on a pallet-rack upright and two beams. Top height (36″), depth (30″), drawer bank and slatwall panels estimated from Coop’s tour (1:45–2:57).' + SCENERY },
});
export const LEVRACK_OVERHEAD = defineFloorPart({
  id: 'levrack-overhead-frame', name: 'Levrack overhead frame', title: 'Levrack overhead frame', noun: 'frame', section: 'Room decor', underlay: true,
  description: 'A Levrack overhead frame: four pallet-rack uprights, a wire-deck top shelf, a lettered black header and an under-shelf light, standing over a workstation or cabinets. Independent reconstruction; Levrack trademarks belong to Levrack, LLC.',
  params: [...levrackParams, { key: 'light', label: 'Light', default: 1, options: [0, 1], format: (v: number) => v ? 'Under-shelf LED' : 'None' }],
  footprint: p => ({ width: levrackLength(p), depth: levrackDepth(p) }),
  vendor: { vendor: 'Levrack', url: 'https://levrack.com/', credit: 'Levrack — overhead frame', trademark: LEVRACK_TM,
    reconstruction: 'Published: 7/8/10/12 ft frames, 7 or 8 ft tall, 30/36/48″ deep. Header size, wire deck, diagonal brace and light estimated from Coop’s tour (1:32, 2:52). The header lettering is plain block capitals, not the Levrack logo.' + SCENERY },
});

// ── Storage and furniture ─────────────────────────────────────────────────────────────────────────────
export const PLAE_RACK = { upright: inch(3), width: inch(80), depth: inch(24), height: inch(84), shelves: [inch(5), inch(20), inch(35), inch(50)] } as const;
export const PLAE_STORAGE_RACK = defineFloorPart({
  id: 'plae-3x3-storage-rack', name: 'PLAE storage rack', title: 'PLAE 3×3 storage shelving rack', noun: 'storage rack', section: 'Floor storage',
  description: 'PLAE’s heavy storage rack: 3×3″ 11-gauge uprights with offset holes, four rubber-lined steel shelves and bar or plate pegs up top, optionally loaded with two rows of colour-banded kettlebells. Independent reconstruction; PLAE trademarks belong to PLAE.',
  params: [
    { key: 'loaded', label: 'Kettlebells', default: 1, options: [0, 1], format: (v: number) => v ? 'Two shelves of kettlebells' : 'Empty' },
    { key: 'pegs', label: 'Top pegs', default: 1, options: [0, 1], format: (v: number) => v ? 'Bar and plate pegs' : 'None' },
  ],
  footprint: { width: PLAE_RACK.width, depth: PLAE_RACK.depth },
  vendor: { vendor: 'PLAE', url: 'https://plae.co/', credit: 'PLAE — storage rack', trademark: 'PLAE is a trademark of PLAE.',
    reconstruction: 'Coop: 3×3″ 11-gauge uprights with offset holes (2:57–3:05). Width (80″), depth (24″), height (84″), shelf heights and the pegs estimated from the tour; kettlebells are simple low-poly bells with coloured handle bands.' + SCENERY },
});
export const DESK_WIDTHS = [48, 60, 72, 84] as const;
export const BIRCH_DESK = defineFloorPart({
  id: 'decor-birch-desk', name: 'Desk', title: 'Birch-top desk', noun: 'desk', section: 'Room decor',
  description: 'A simple desk with a thick birch butcher-block style top on black steel legs, as in Coop’s bay-window office nook. Independent reconstruction; no brand shown.',
  params: [
    { key: 'width', label: 'Width', default: 2, options: [0, 1, 2, 3], format: (v: number) => DESK_WIDTHS[v] ? `${DESK_WIDTHS[v]}″` : String(v) },
    { key: 'monitor', label: 'Monitor', default: 1, options: [0, 1], format: (v: number) => v ? 'Ultrawide monitor' : 'Clear top' },
  ],
  footprint: p => ({ width: inch(pick(DESK_WIDTHS, p.width, 'desk width')), depth: inch(30) }),
  vendor: generic('birch-top desk', 'Top 30″ deep and 29″ high on four 2″ square legs; the ultrawide monitor is a generic 34″ screen on a stand. Estimated from Coop’s tour (8:35–8:45).' + SCENERY),
});
export const STEP_STOOL = defineFloorPart({
  id: 'decor-step-stool', name: 'Step stool', title: 'Two-step birch step stool', noun: 'step stool', section: 'Room decor',
  description: 'A kids’ step stool with birch plywood treads between grey-painted sides, one or two steps. Independent reconstruction; no brand shown.',
  params: [{ key: 'steps', label: 'Steps', default: 2, options: [1, 2], format: (v: number) => `${v} step${v > 1 ? 's' : ''}` }],
  footprint: p => ({ width: 400, depth: p.steps === 2 ? 380 : 240 }),
  vendor: generic('birch step stool', 'Treads 400 mm wide, 230 and 460 mm high; grey sides. Estimated from Coop’s tour (0:45, 1:27).' + SCENERY),
});
export const LADDER_HEIGHTS = [3, 4, 5, 6] as const;
export const STEP_LADDER = defineFloorPart({
  id: 'decor-step-ladder', name: 'Step ladder', title: 'Wooden step ladder', noun: 'ladder', section: 'Room decor',
  description: 'A classic wooden A-frame step ladder with a paint shelf, 3–6 ft. Independent reconstruction; no brand shown.',
  params: [{ key: 'height', label: 'Height', default: 1, options: [0, 1, 2, 3], format: (v: number) => LADDER_HEIGHTS[v] ? `${LADDER_HEIGHTS[v]} ft` : String(v) }],
  footprint: p => { const h = ft(pick(LADDER_HEIGHTS, p.height, 'ladder height')); return { width: 450 + h * .06, depth: h * .56 }; },
  vendor: generic('wooden step ladder', 'Rails, steps on 12″ centres, a fold-down paint shelf and spreader bars; splay estimated. As on Coop’s window wall (8:32).' + SCENERY),
});

export const PARTS = [
  LALLY_POST, BIRCH_BEAM, WALL_BLOCK, HE_WILLIAMS_LINEAR, BIG_ASS_FANS_I6, CEILING_RIG,
  LEVRACK_MOBILE_STORAGE, LEVRACK_WORKSTATION, LEVRACK_OVERHEAD, PLAE_STORAGE_RACK, BIRCH_DESK, STEP_STOOL, STEP_LADDER,
] as const;
