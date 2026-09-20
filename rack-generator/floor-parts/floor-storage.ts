/** Plate trees, barbell holders and dumbbell racks (#123). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 * Sources, published dimensions and every estimate: research/floor-storage.md. Builders: parts/floor-storage*.ts.
 * Floor axes: X across the product (plate horns / shelf length), Y depth with -Y the front (loading side), Z up;
 * origin on the floor at the footprint centre. Footprints never change with a `loaded` param: loads stay inside them. */
import { defineFloorPart, type FloorParam } from '../floor-part.ts';
import { PLATE_GAP, PLATE_SPECS, type PlateId } from '../plates.ts';
import type { NumericParams } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';
import { repBell } from './kettlebells.ts';
import { dumbbellEnvelope, dumbbellShape } from './fixed-dumbbells.ts';
export const IN = 25.4;
const inch = (v: number) => v * IN;
const credit = (vendor: string, url: string, product: string, trademark: string, reconstruction: string): VendorAttribution => ({ vendor, url, credit: `${vendor} — ${product}`, trademark, reconstruction });
const ROGUE_TM = 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.', REP_TM = 'REP and REP Fitness are trademarks of REP Fitness.', TITAN_TM = 'Titan and Titan Fitness are trademarks of Titan Fitness.';
const tail = (brand: string) => `Independent reconstruction from published specs and product photos; ${brand} trademarks belong to ${brand}.`;
const enumParam = (key: string, label: string, names: readonly string[], def = 0): FloorParam => ({ key, label, default: def, options: names.map((_, i) => i), format: v => names[v] ?? String(v) });
const LOAD_NAMES = ['Empty', 'Half loaded', 'Fully loaded'] as const;
const loadParam = (label = 'Loaded', names: readonly string[] = LOAD_NAMES, def = 0) => enumParam('loaded', label, names, def);
const count = (noun: string) => (v: number) => v ? `${v} ${noun}${v === 1 ? '' : 's'}` : 'Empty';
const range = (n: number, from = 0) => Array.from({ length: n - from + 1 }, (_, i) => i + from);
export interface Paint { name: string; color: string; metalness: number; roughness: number }
const paint = (name: string, color: string, metalness: number, roughness: number): Paint => ({ name, color, metalness, roughness });
/** Factory powder coats (fixed per product/colourway, not the user's rack paint). */
export const PAINT = {
  rogueBlack: paint('Textured black powder coat', '#1b1c1e', .25, .74),
  titanBlack: paint('Black powder coat', '#18191b', .3, .6),
  repMetallic: paint('Metallic Black powder coat', '#3a3c3f', .55, .42),
  repMatte: paint('Matte Black powder coat', '#232426', .15, .8),
  repRed: paint('Red powder coat', '#b0222a', .3, .45),
  repBlue: paint('Blue powder coat', '#2f86c9', .3, .45),
  repWhite: paint('White powder coat', '#ebebe7', .1, .45),
} as const;

// ── Plate trees ────────────────────────────────────────────────────────────────────────────────────
/** Horn tree: an upright on an H base (two feet + spine), three tiers of horns through the upright, optional vertical bar
 * sleeves on the spine and casters under the foot ends. `feet` is the axis the two feet run along. */
export interface TreeSpec {
  /** Upright section (X × Y) and top height above the frame's floor datum. */ upright: [number, number]; height: number;
  /** Horn axis heights above the frame datum, bottom first; horn OD and length from the upright face. */ tiers: readonly number[]; hornD: number; horn: number;
  /** Usable plate length per horn (collar/stopper to cap). */ usable: number;
  feet: 'x' | 'y'; /** Foot length, section (wide × tall) and spine length/section. */ foot: number; footSection: [number, number]; spine: number; spineSection: [number, number];
  /** Vertical bar sleeves on the spine: distance from centre, bore, OD, height above the spine top. */ sleeves?: { offset: number; bore: number; od: number; height: number };
  /** Caster wheel diameter and total caster height (floor to foot underside); 0 = floor feet. */ caster: { wheel: number; height: number } | undefined;
  gusset: { base: number; height: number }; paint: Paint; hornFinish: 'black' | 'black-chrome-tip';
  /** Brand lettering on the upright or a foot. */ brand: { text: string; on: 'upright' | 'foot'; color: string };
}
const ROGUE_TREE: Omit<TreeSpec, 'caster'> = {
  upright: [inch(2), inch(3)], height: inch(50), tiers: [inch(11.2), inch(11.2 + 18.275), inch(11.2 + 2 * 18.275)], hornD: inch(1.9), horn: inch(12), usable: inch(11.5),
  feet: 'x', foot: inch(24), footSection: [inch(3), inch(2)], spine: inch(24), spineSection: [inch(3), inch(2)],
  gusset: { base: inch(7), height: inch(9) }, paint: PAINT.rogueBlack, hornFinish: 'black', brand: { text: 'ROGUE', on: 'upright', color: '#ecebe6' },
};
export const ROGUE_CASTER = { wheel: inch(3), height: inch(4) };
export const rogueTreeSpec = (p: NumericParams): TreeSpec => ({ ...ROGUE_TREE, caster: p.wheels ? ROGUE_CASTER : undefined });
export const REP_TREE: TreeSpec = {
  upright: [inch(2), inch(3)], height: inch(50), tiers: [inch(10), inch(28.5), inch(47)], hornD: 50, horn: inch(9), usable: inch(8),
  feet: 'x', foot: inch(24), footSection: [inch(3), inch(2)], spine: inch(24), spineSection: [inch(3), inch(2)],
  sleeves: { offset: inch(6.25), bore: 52, od: inch(2.5), height: inch(7) }, caster: undefined,
  gusset: { base: inch(8), height: inch(8) }, paint: PAINT.repMatte, hornFinish: 'black-chrome-tip', brand: { text: 'REP', on: 'foot', color: '#101112' },
};
export const TITAN_CASTER = { wheel: inch(2.5), height: inch(3.6) };
export const TITAN_TREE: TreeSpec = {
  upright: [inch(2.5), inch(2.5)], height: inch(57.625) - TITAN_CASTER.height, tiers: [inch(14.3), inch(14.3 + 18.5), inch(14.3 + 37)], hornD: 50, horn: inch(8.75), usable: inch(8.25),
  feet: 'x', foot: inch(24.5), footSection: [inch(2.5), inch(2.5)], spine: inch(24.5), spineSection: [inch(2.5), inch(2.5)],
  sleeves: { offset: inch(4.5), bore: 52, od: inch(2.5), height: inch(7) }, caster: TITAN_CASTER,
  gusset: { base: inch(6), height: inch(5) }, paint: PAINT.titanBlack, hornFinish: 'black', brand: { text: 'TITAN', on: 'foot', color: '#e9e9e6' },
};
/** Floor footprint of a tree: horn tip to horn tip vs. foot/spine, whichever is wider. */
export function treeBox(s: TreeSpec) {
  const span = s.upright[0] + 2 * s.horn, alongX = s.feet === 'x' ? s.foot : s.spine, alongY = s.feet === 'x' ? s.spine : s.foot;
  return { width: Math.max(span, alongX), depth: Math.max(s.upright[1], alongY) };
}
/** Frame datum: the caster height lifts the whole tree. */
export const treeLift = (s: TreeSpec) => s.caster?.height ?? 0;
export const PLATE_KINDS = ['Bumper plates (kg)', 'Iron plates (lb)'] as const;
/** Heaviest plates on the bottom horns; bumpers 25/20/15 kg, iron 45/35/25 lb (tiers bottom → top). */
const TIER_PLATES: readonly (readonly PlateId[])[] = [['kg25', 'kg20', 'kg15'], ['lb45', 'lb35', 'lb25']];
/** Plates on one horn for a tier: as many of the tier's plate as fit the usable length (half = half of that, at least one). */
export function hornLoad(usable: number, tier: number, tiers: number, loaded: number, kind: number): PlateId[] {
  if (!loaded) return [];
  const table = TIER_PLATES[kind]; if (!table) throw Error('Unsupported plate kind.');
  const id = table[Math.min(table.length - 1, Math.round(tier * (table.length - 1) / Math.max(1, tiers - 1)))], w = PLATE_SPECS[id].width;
  const fit = Math.floor((usable + PLATE_GAP) / (w + PLATE_GAP));
  return Array<PlateId>(loaded === 2 ? fit : Math.max(1, Math.floor(fit / 2))).fill(id);
}
const treeParams = (bars: boolean): FloorParam[] => [
  loadParam('Plates'), enumParam('plates', 'Plate type', PLATE_KINDS),
  ...(bars ? [{ key: 'bars', label: 'Stored barbells', default: 0, options: [0, 1, 2], format: count('bar') }] : []),
];
export const ROGUE_PLATE_TREE = defineFloorPart({
  id: 'rogue-vertical-plate-tree-2', name: 'Rogue Vertical Plate Tree 2.0', title: 'Rogue Vertical Plate Tree 2.0', noun: 'plate tree', section: 'Floor storage',
  description: `Rogue Vertical Plate Tree 2.0 (RF0644): a 2×3″ 11 ga upright, 50″ tall, with six 12″ Schedule 40 pipe posts (1.9″ OD) on three tiers 18.275″ apart so full-size 450 mm plates fit every tier; bolt-together H base with triangle gusset plates, optional set of four casters. Load it with bumpers or iron. ${tail('Rogue Fitness')}`,
  params: [...treeParams(false), enumParam('wheels', 'Wheels', ['Floor feet', 'Optional caster set'])],
  footprint: p => treeBox(rogueTreeSpec(p)),
  placement: { side: 'right', gap: 300 },
  vendor: credit('Rogue Fitness', 'https://www.roguefitness.com/rogue-vertical-plate-tree-2-0', 'Vertical Plate Tree 2.0 (RF0644)', ROGUE_TM,
    'Published 26″ × 24″ × 50″ envelope, six 12″ Schedule 40 (1.9″ OD) posts, 18.275″ tier spacing and optional wheels; H-base layout, 2×3″ upright, gusset size, hole pattern and caster height estimated from product photos. The ROGUE lettering is typeset in a generic font. Scenery only, excluded from print export.'),
});
export const REP_PLATE_TREE = defineFloorPart({
  id: 'rep-bar-weight-plate-tree', name: 'REP Bar & Weight Plate Tree', title: 'REP Bar & Weight Plate Tree', noun: 'plate tree', section: 'Floor storage',
  description: `REP Fitness Bar & Weight Plate Tree: 24″ × 24″ × 50″, six weight horns with 8″ usable length per side on three tiers, two vertical barbell sleeves on the base spine, H base with chamfered rubber foot caps; 850 lb capacity. Load plates and up to two stored bars. ${tail('REP Fitness')}`,
  params: treeParams(true),
  footprint: treeBox(REP_TREE),
  placement: { side: 'right', gap: 300 },
  vendor: credit('REP Fitness', 'https://repfitness.com/products/bar-and-weight-plate-tree', 'Bar & Weight Plate Tree', REP_TM,
    'Published 24″ × 24″ × 50″ envelope, six horns with 8″ usable length, two bar holders and 850 lb capacity; tier heights, tube sections, sleeve height and foot caps estimated from product photos. The embossed REP lettering is typeset in a generic font. Scenery only, excluded from print export.'),
});
export const TITAN_PLATE_TREE = defineFloorPart({
  id: 'titan-portable-plate-barbell-tree', name: 'Titan Portable Plate & Barbell Tree', title: 'Titan Portable Weight Plate & Barbell Storage Tree', noun: 'plate tree', section: 'Floor storage',
  description: `Titan Fitness Portable Weight Plate and Barbell Storage Tree: 24.5″ × 24.5″ × 57.625″ on four locking casters, six 50 mm posts with 8.25″ loadable sleeves on tiers 18.5″ apart, two 52 mm × 7″ vertical barbell sleeves; 1,000 lb capacity. ${tail('Titan Fitness')}`,
  params: treeParams(true),
  footprint: treeBox(TITAN_TREE),
  placement: { side: 'right', gap: 300 },
  vendor: credit('Titan Fitness', 'https://www.titan.fitness/products/portable-plate-barbell-storage-tree', 'Portable Weight Plate and Barbell Storage Tree (401919)', TITAN_TM,
    'Published 24.5″ × 24.5″ × 57.625″ envelope, 50 mm posts with 8.25″ sleeves, 18.5″ tier spacing, 52 mm × 7″ bar sleeves and locking casters; tube sections, bottom tier height and caster size estimated from photos. Scenery only, excluded from print export.'),
});

// ── Titan Barbell Storage Holder ───────────────────────────────────────────────────────────────────
/** Bent 9 ga cover (top + two side walls with cut TITAN lettering) over a 3 ga base plate, lined sleeve tubes on a grid. */
export const TITAN_HOLDER_SIZES = [
  { label: '5 sleeves · 12″ × 12″', side: inch(12), grid: 'x5' as const, pitch: inch(3.25) },
  { label: '9 sleeves · 19″ × 19″', side: inch(19), grid: '3x3' as const, pitch: inch(5.5) },
] as const;
export const TITAN_HOLDER = { height: inch(9), bore: 51, tube: inch(2.375), base: inch(.2391), wall: inch(.1495), rim: 15, rimD: 68, notch: [inch(5), inch(.6)] as [number, number] } as const;
const holderSize = (p: NumericParams) => { const s = TITAN_HOLDER_SIZES[p.size]; if (!s) throw Error('Unsupported barbell holder size.'); return s; };
/** Sleeve centres (x, y); centre first so a single stored bar stands in the middle. */
export function titanHolderSleeves(p: NumericParams): [number, number][] {
  const s = holderSize(p), d = s.pitch;
  if (s.grid === 'x5') return [[0, 0], [-d, -d], [d, -d], [-d, d], [d, d]];
  const out: [number, number][] = [[0, 0]];
  for (const y of [-d, 0, d]) for (const x of [-d, 0, d]) if (x || y) out.push([x, y]);
  return out;
}
export const TITAN_BARBELL_HOLDER = defineFloorPart({
  id: 'titan-barbell-storage-holder', name: 'Titan Barbell Storage Holder', title: 'Titan Barbell Storage Holder (vertical)', noun: 'barbell holder', section: 'Floor storage',
  description: `Titan Fitness vertical Barbell Storage Holder: a 9″ tall bent 9 ga steel cover with cut TITAN lettering over a 3 ga base, holding 5 (12″ × 12″) or 9 (19″ × 19″) barbells upright in 51 mm nylon-lined sleeves. Show stored bars standing in it. ${tail('Titan Fitness')}`,
  params: [
    { key: 'size', label: 'Storage holder', default: 0, options: [0, 1], format: v => TITAN_HOLDER_SIZES[v]?.label ?? String(v) },
    { key: 'loaded', label: 'Stored barbells', default: 0, options: p => range(titanHolderSleeves(p).length), format: count('bar') },
  ],
  footprint: p => ({ width: holderSize(p).side, depth: holderSize(p).side }),
  placement: { side: 'right', gap: 300 },
  vendor: credit('Titan Fitness', 'https://www.titan.fitness/products/vertical-barbell-storage-rack', 'Barbell Storage Holder, 5 and 9 sleeves (400346 / 401151)', TITAN_TM,
    'Published 12″ × 12″ × 9″ (5 sleeves) and 19″ × 19″ × 9″ (9 sleeves), 51 mm bar holes, 9 ga tubes, 3 ga base, plastic sleeve inserts; sleeve pitch, tube OD, liner rim and foot notch measured from product photos. The cut TITAN lettering is typeset in a generic font. Scenery only, excluded from print export.'),
});

// ── Dumbbell racks ─────────────────────────────────────────────────────────────────────────────────
/** REP 3-tier Dumbbell Rack: A-frame ends (angled front leg, near-vertical rear post, logo gusset), three angled 11 ga trays. */
export const REP_DB_RACK = { length: inch(48), depth: inch(24), height: inch(36), usable: inch(42.5), tray: inch(10), lip: inch(1), tilt: 12, steel: inch(.1196),
  tube: inch(2), foot: [inch(2.25), inch(2.5)] as [number, number], trays: [inch(7.5), inch(19.5), inch(31.5)] } as const;
export const REP_DB_COLORS = [PAINT.repMetallic, PAINT.repRed, PAINT.repBlue, PAINT.repMatte] as const;
/** REP rubber hex 5–50 lb set: half = 5–25, full = 5–50 (pairs). */
export const repRackWeights = (loaded: number) => loaded ? range(loaded === 2 ? 10 : 5, 1).map(i => i * 5) : [];
/** Pairs side by side (lying on a flat, so each takes its across-corners width) along the published 42.5″ usable shelf,
 * heaviest on the bottom shelf, spilling upward when a shelf is full; x is each dumbbell's centre. */
export function repRackLayout(loaded: number, gap = 3) {
  const S = REP_DB_RACK.usable, slots: { weight: number; tier: number; x: number }[] = []; let tier = 0, cursor = 0;
  for (const weight of repRackWeights(loaded).reverse()) {
    const w = dumbbellEnvelope(dumbbellShape('rep-hex-dumbbell', { weight })).width;
    if (cursor + 2 * w + gap > S) { tier++; cursor = 0; }
    if (tier >= REP_DB_RACK.trays.length) throw Error('REP rack is full.');
    for (let i = 0; i < 2; i++) { slots.push({ weight, tier, x: -S / 2 + cursor + w / 2 }); cursor += w + gap; }
  }
  return slots;
}
export const REP_DUMBBELL_RACK = defineFloorPart({
  id: 'rep-dumbbell-rack', name: 'REP Dumbbell Rack', title: 'REP 3-tier Dumbbell Rack', noun: 'dumbbell rack', section: 'Floor storage',
  description: `REP Fitness 3-tier Dumbbell Rack: 48″ × 24″ × 36″, three angled 11 ga steel shelves with a 1″ lip (42.5″ usable, 10″ deep) bolted to A-frame ends with REP logo gussets, in Metallic Black, Red, Blue or Matte Black. Load it with the REP 5–50 lb rubber hex set. ${tail('REP Fitness')}`,
  params: [enumParam('color', 'Colour', REP_DB_COLORS.map(c => c.name.replace(' powder coat', ''))), loadParam('Dumbbells', ['Empty', 'REP hex 5–25 lb pairs', 'REP hex 5–50 lb pairs'])],
  footprint: { width: REP_DB_RACK.length, depth: REP_DB_RACK.depth },
  placement: { side: 'left', gap: 400 },
  vendor: credit('REP Fitness', 'https://repfitness.com/products/dumbbell-storage-rack', 'Dumbbell Rack, 3-tier', REP_TM,
    'Published 36″ × 48″ × 24″ envelope, 42.5″ usable shelf, 10″ resting depth, 4.5″ grab space, 11 ga shelves with 1″ lip and colour options; leg angles, tray heights and tilt, tube sizes and gusset outline estimated from product photos. Stored dumbbells reuse the REP hex dumbbell geometry. Scenery only, excluded from print export.'),
});
/** Rogue 3-Tier Dumbbell Rack: two 3/8″ laser-cut end plates, three offset tiers of front/rear saddle rails and a centre divider. */
export const ROGUE_DB_RACK = { length: inch(93), depth: inch(30), height: inch(33), plate: inch(.375), positions: 10,
  /** Tier rail-top heights and centre-line depths (front → back), rail spacing (front to rear saddle row). */
  tiers: [[inch(9), inch(-8)], [inch(21), inch(-.5)], [inch(32), inch(7)]] as [number, number][], railGap: inch(9) } as const;
/** Rogue urethane pairs per load: half = 5–35 lb (7 pairs), full = 5–75 lb (15 pairs, the published 30-dumbbell capacity). */
export const rogueRackWeights = (loaded: number) => loaded ? range(loaded === 2 ? 15 : 7, 1).map(i => i * 5) : [];
export const ROGUE_DUMBBELL_RACK = defineFloorPart({
  id: 'rogue-3-tier-dumbbell-rack', name: 'Rogue 3-Tier Dumbbell Rack', title: 'Rogue 3-Tier Dumbbell Rack', noun: 'dumbbell rack', section: 'Floor storage',
  description: `Rogue 3-Tier Dumbbell Rack: 93″ × 30″ × 33″, two 3/8″ laser-cut steel end plates with cut ROGUE lettering and bolt-down foot plates, three offset tiers of ten saddle positions each (30 dumbbells) with a centre rail divider, for Rogue urethane dumbbells. ${tail('Rogue Fitness')}`,
  params: [loadParam('Dumbbells', ['Empty', 'Rogue urethane 5–35 lb pairs', 'Rogue urethane 5–75 lb pairs'])],
  footprint: { width: ROGUE_DB_RACK.length, depth: ROGUE_DB_RACK.depth },
  placement: { side: 'back', gap: 400 },
  vendor: credit('Rogue Fitness', 'https://www.roguefitness.com/rogue-3-tier-dumbbell-rack', '3-Tier Dumbbell Rack (XX11789)', ROGUE_TM,
    'Published 93″ × 30″ × 33″ envelope, 0.375″ laser-cut end plates, 10 positions per tier (30 dumbbells) and plastic saddles; end-plate outline, window cut-outs, tier heights/offsets and rail sections estimated from product photos. Stored dumbbells use the Rogue urethane head sizes in a low-poly form. Scenery only, excluded from print export.'),
});

// ── REP Dumbbell Storage Cart ──────────────────────────────────────────────────────────────────────
export const REP_CART = { width: inch(32), depth: inch(23.3), height: inch(20.75), post: inch(1.5), caster: inch(4.25), wheel: inch(3), skirt: inch(2),
  cutout: [inch(11), inch(7.5)] as [number, number], bottom: inch(6), liner: inch(.375) } as const;
export const REP_CART_COLORS = [
  { name: 'Metallic Black', frame: PAINT.repMetallic, panel: PAINT.repMetallic },
  { name: 'White', frame: PAINT.repWhite, panel: PAINT.repMatte },
  { name: 'Matte Black', frame: PAINT.repMatte, panel: PAINT.repMatte },
] as const;
/** The cart is built for either REP adjustable pair, cradles bolted to the top shelf. */
export const REP_CART_DUMBBELLS = ['Empty', 'REP x PÉPIN FAST pair', 'REP QuickDraw pair'] as const;
export const REP_CART_SETS: Record<number, readonly number[]> = { 0: [0], 1: [65, 85, 105, 125], 2: [30, 40, 50, 60] };
/** Optional pegboard hooks stick out of both side panels, widening the footprint. */
export const REP_CART_HOOK = inch(3.5);
export const repCartBox = (p: NumericParams) => ({ width: REP_CART.width + (p.hooks ? 2 * REP_CART_HOOK : 0), depth: REP_CART.depth });
export const REP_DUMBBELL_CART = defineFloorPart({
  id: 'rep-dumbbell-storage-cart', name: 'REP Dumbbell Storage Cart', title: 'REP Dumbbell Storage Cart', noun: 'dumbbell cart', section: 'Floor storage',
  description: `REP Fitness Dumbbell Storage Cart: 32″ × 23.3″, 20.75″ to the top lip, 11 ga top shelf with a step-in cut-out and crumb-rubber liner, 12 ga bottom utility shelf, perforated pegboard side frames (optional six hooks) on four locking casters. Holds a pair of REP x PÉPIN FAST or QuickDraw adjustable dumbbells in their cradles. ${tail('REP Fitness')}`,
  params: [
    enumParam('color', 'Colour', REP_CART_COLORS.map(c => c.name)),
    enumParam('hooks', 'Pegboard hooks', ['Without hooks', 'With six hooks']),
    enumParam('dumbbells', 'Dumbbells', REP_CART_DUMBBELLS, 1),
    { key: 'set', label: 'Set size', default: 85, options: p => REP_CART_SETS[p.dumbbells] ?? [0], format: v => v ? `${v} lb per hand` : '—' },
  ],
  footprint: repCartBox,
  placement: { side: 'left', gap: 400 },
  vendor: credit('REP Fitness', 'https://repfitness.com/products/rep-dumbbell-storage-cart', 'Dumbbell Storage Cart', `${REP_TM} QuickDraw is a trademark of REP Fitness; PÉPIN is a trademark of Pépin.`,
    'Published 32″ × 23.3″ footprint, 20.75″ height to the top lip, 11/12/16 ga steel, crumb rubber liners, locking casters, colour and hook options; cut-out size, shelf heights, pegboard hole grid and caster size estimated from product photos. The cradled pair reuses the REP x PÉPIN and QuickDraw dumbbell geometry. Scenery only, excluded from print export.'),
});

// ── Titan Dumbbell Stand & Plate Tree ──────────────────────────────────────────────────────────────
export const TITAN_STAND = { height: inch(28.125), width: inch(26), depth: inch(23.5), rest: [inch(8.25), inch(19.5)] as [number, number], lip: inch(1.375),
  peg: inch(6.5), pegD: 25, tilt: 8, tube: inch(1.5), foot: inch(2) } as const;
/** 1″ standard plates (rubber-coated grip plates), estimated: 25 lb 12″ × 1.4″, 10 lb 9″ × 1.05″, 5 lb 7.75″ × .85″. */
export const STANDARD_PLATES = { 25: { d: inch(12), w: inch(1.4) }, 10: { d: inch(9), w: inch(1.05) }, 5: { d: inch(7.75), w: inch(.85) } } as const;
/** Plates per peg (inner pegs first): half = one plate each, full = as many as fit the 6.5″ peg. */
export function titanStandPegLoad(peg: number, loaded: number): (keyof typeof STANDARD_PLATES)[] {
  if (!loaded) return [];
  const lb = ([25, 10, 25, 5] as const)[peg], w = STANDARD_PLATES[lb].w, fit = Math.floor((TITAN_STAND.peg - 6) / (w + 1));
  return Array(loaded === 2 ? fit : 1).fill(lb);
}
export const TITAN_STAND_DUMBBELLS = ['Empty platform', 'Pair of 60 lb urethane dumbbells', 'Pair of PowerBlock Elite USA 90s'] as const;
export const TITAN_DUMBBELL_STAND = defineFloorPart({
  id: 'titan-dumbbell-stand-plate-tree', name: 'Titan Dumbbell Stand & Plate Tree', title: 'Titan Dumbbell Stand and Plate Tree', noun: 'dumbbell stand', section: 'Floor storage',
  description: `Titan Fitness Dumbbell Stand and Plate Tree: 28.125″ tall, 26″ × 23.5″, an angled top platform of two 8.25″ × 19.5″ rests with 1.375″ lips on two A-frames, four 25 mm × 6.5″ pegs for 1″ standard plates; 260 lb capacity. Holds adjustable or fixed dumbbells. ${tail('Titan Fitness')}`,
  params: [enumParam('dumbbells', 'Dumbbells', TITAN_STAND_DUMBBELLS), loadParam('Standard plates')],
  footprint: { width: TITAN_STAND.width, depth: TITAN_STAND.depth },
  placement: { side: 'left', gap: 400 },
  vendor: credit('Titan Fitness', 'https://www.titan.fitness/products/dumbbell-stand-plate-tree-power-block-v3', 'Dumbbell Stand and Plate Tree (420044)', TITAN_TM,
    'Published 28.125″ × 23.5″ × 26″ envelope, 8.25″ × 19.5″ rests with 1.375″ lip, 6.5″ × 25 mm pegs and 260 lb capacity; A-frame geometry, platform tilt, tube sizes and standard plate sizes estimated from product photos. Stored dumbbells reuse the REP urethane and PowerBlock geometry. Scenery only, excluded from print export.'),
});

// ── REP Kettlebell Rack 2.0 ────────────────────────────────────────────────────────────────────────
export interface KbTier { z: number; y: number; depth: number }
/** Published 51.4″ × 23.25″ × 30.84″ (2-tier) / 33.6″ (3-tier); flat shelves with moulded liners. Shelf top heights and depths estimated. */
export const REP_KB_RACKS = [
  { label: 'Two-tier', height: inch(30.84), tiers: [{ z: inch(14.5), y: inch(-5.375), depth: inch(12.5) }, { z: inch(30.1), y: inch(5.375), depth: inch(12.5) }] as KbTier[] },
  { label: 'Three-tier', height: inch(33.6), tiers: [{ z: inch(7), y: inch(-7.5), depth: inch(8.25) }, { z: inch(20.1), y: 0, depth: inch(8.25) }, { z: inch(32.85), y: inch(7.5), depth: inch(8.25) }] as KbTier[] },
] as const;
export const REP_KB = { length: inch(51.41), depth: inch(23.25), shelf: inch(49), lip: inch(.75), tube: [inch(2), inch(3)] as [number, number], liner: 4 } as const;
/** REP kg bells: single = 4–24 kg (11), double = 4–24 kg pairs (22). */
export const REP_KB_SET = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] as const;
export const repKbLoad = (loaded: number): number[] => loaded === 2 ? REP_KB_SET.flatMap(kg => [kg, kg]) : loaded ? [...REP_KB_SET] : [];
export interface BellSlot { kg: number; tier: number; x: number; y: number }
/** Heaviest bells on the lowest shelf, lightest on top, staggered between a front and a back row when the shelf is deep
 * enough: each bell takes the smallest x that clears every bell already on its shelf (handle widths within a row, body
 * spheres across rows). Returns undefined for a bell that no longer fits. */
export function packBells(kgs: readonly number[], tiers: readonly KbTier[], length: number, gap = 8): (BellSlot | undefined)[] {
  const dims = (kg: number) => { const l = repBell(0, kg).layout; return { R: l.R, hw: l.halfWidth }; };
  const placed: (BellSlot & { R: number; hw: number })[] = [], out: (BellSlot | undefined)[] = [];
  let tier = 0, row = 0;
  for (const kg of [...kgs].sort((a, b) => b - a)) {
    let slot: (BellSlot & { R: number; hw: number }) | undefined;
    const { R, hw } = dims(kg);
    for (; tier < tiers.length && !slot; ) {
      const t = tiers[tier], stagger = t.depth - 2 * R > 20, rows = stagger ? [row, 1 - row] : [0];
      for (const r of rows) {
        const y = stagger ? t.y + (r ? 1 : -1) * (t.depth / 2 - R - 4) : t.y;
        let x = -length / 2 + hw;
        for (const o of placed.filter(o => o.tier === tier)) {
          const dy = Math.abs(o.y - y), need = dy < 1 ? o.hw + hw + gap : Math.sqrt(Math.max(0, (o.R + R + gap) ** 2 - dy * dy));
          x = Math.max(x, o.x + need);
        }
        if (x + hw <= length / 2 && (!slot || x < slot.x)) slot = { kg, tier, x, y, R, hw };
      }
      if (!slot) { tier++; row = 0; }
    }
    if (slot) { placed.push(slot); row = slot.y > tiers[slot.tier].y ? 0 : 1; out.push({ kg, tier: slot.tier, x: slot.x, y: slot.y }); } else out.push(undefined);
  }
  return out;
}
export const REP_KETTLEBELL_RACK = defineFloorPart({
  id: 'rep-kettlebell-rack-2', name: 'REP Kettlebell Rack 2.0', title: 'REP Kettlebell Rack 2.0', noun: 'kettlebell rack', section: 'Floor storage',
  description: `REP Fitness Kettlebell Rack 2.0: 51.4″ × 23.25″, two tiers (30.84″) or three (33.6″) of flat 11 ga steel shelves with moulded hex-pattern liners and REP end caps on zig-zag tube frames, sized for a double 4–24 kg kettlebell set. ${tail('REP Fitness')}`,
  params: [enumParam('tiers', 'Storage tiers', REP_KB_RACKS.map(r => r.label)), loadParam('Kettlebells', ['Empty', 'REP 4–24 kg set', 'REP 4–24 kg double set'])],
  footprint: { width: REP_KB.length, depth: REP_KB.depth },
  placement: { side: 'left', gap: 400 },
  vendor: credit('REP Fitness', 'https://repfitness.com/products/kettlebell-rack-2-0', 'Kettlebell Rack 2.0', REP_TM,
    'Published 51.41″ × 23.25″ × 30.84″ (two-tier) and 51.42″ × 23.25″ × 33.60″ (three-tier), 11 ga frame, flat shelves with moulded plastic liners, 1500 lb per shelf; shelf heights/depths, frame tube path and end caps estimated from product photos. Stored bells use the REP kettlebell body and handle layout in a low-poly form. Scenery only, excluded from print export.'),
});

// ── Yes4All Deluxe Vertical Barbell Holder (5 bars) ──────────────────────────────────────────────────
/** Amazon B07WFB6Z93 (model RW6H): published 12″ × 12″ × 7.5″, 11.75″ box body 6.05″ to the top plate, 2″ (51 mm) liners, 5 bars.
 * Quincunx hole pitch, liner flange, tube OD, logo cut and foot notch measured on the Amazon and Gym Radar owner photos. */
export const YES4ALL_HOLDER = { side: inch(12), box: inch(11.75), top: inch(6.05), height: inch(7.5), sheet: 3, base: 3, lip: 15,
  bore: 51, tube: 61, flange: 63, corner: 76, notch: [150, 9.5] as [number, number] } as const;
/** Sleeve centres: the centre first, then the four corners of a 152 mm square. */
export const yes4allSleeves = (): [number, number][] => { const c = YES4ALL_HOLDER.corner; return [[0, 0], [-c, -c], [c, -c], [-c, c], [c, c]]; };
export const YES4ALL_BARBELL_HOLDER = defineFloorPart({
  id: 'yes4all-vertical-barbell-holder', name: 'Yes4All Vertical Barbell Holder', title: 'Yes4All Vertical Barbell Storage Rack (5 bars)', noun: 'barbell holder', section: 'Floor storage',
  description: `Yes4All Deluxe Vertical Barbell Holder: a 12″ square, 7.5″ tall black steel box (top plate and two side walls with the cut-out Yes4All logo, open ends over a lipped base tray) with five welded tubes and 2″ plastic liners in a quincunx for Olympic bars. Show stored bars standing in it. ${tail('Yes4All')}`,
  params: [{ key: 'loaded', label: 'Stored barbells', default: 0, options: range(5), format: count('bar') }],
  footprint: { width: YES4ALL_HOLDER.side, depth: YES4ALL_HOLDER.side },
  placement: { side: 'right', gap: 300 },
  vendor: credit('Yes4All', 'https://www.amazon.com/dp/B07WFB6Z93', 'Deluxe Vertical Barbell Holder, 5 bars (RW6H)', 'Yes4All is a trademark of Yes4All.',
    'Published 12″ × 12″ × 7.5″ overall, 11.75″ box body 6.05″ to the top plate, 2″ liners, five bars, heavy-gauge steel (Amazon listing and dimension image). Estimated from the Amazon and Gym Radar owner photos: 152 mm corner pitch, 61 mm tubes, 63 mm liner flange, 15 mm tray lips, 150 × 9.5 mm foot notch and the logo cut (typeset, not the logo artwork). Scenery only, excluded from print export.'),
});

// ── CAP Barbell A-Frame Olympic Plate Rack (RK-2A 7-post, RK-2BB 5-post) ─────────────────────────────
export interface AFramePeg { x: 1 | -1; z: number; root: number; tip: number }
export interface AFrameSpec {
  name: string; height: number; width: number; depth: number;
  /** Foot tube section (x wide × z tall) and its centreline x; leg section (x × y) from the bottom centreline x/z to the apex. */
  foot: [number, number]; footX: number; leg: [number, number]; legBottom: [number, number]; apex: [number, number];
  /** Base crossmember section (y deep × z tall) and its underside height; optional welded mid crossbar height. */
  cross: [number, number]; crossZ: number; mid?: number;
  pegs: AFramePeg[]; posts: { z: number; h: number }[]; pegD: number;
  /** Plates per peg tier for the loaded views, heaviest low. */ loads: { z: number; plate: PlateId }[]; postPlate?: PlateId;
  ribbedCaps: boolean;
}
/** RK-2A: 22″ D × 19″ W × 37″ H welded A-frame, mid crossbar, five side pegs (3 right, 2 left) and two vertical posts (Amazon B0013SZC8S, CAP gallery). */
export const CAP_RK2A: AFrameSpec = {
  name: 'RK-2A · 7 posts, 37″', height: inch(37), width: inch(19), depth: inch(22), foot: [40, 45], footX: inch(19) / 2 - 20, leg: [25, 50], legBottom: [200, 45], apex: [0, inch(37)],
  cross: [50, 25], crossZ: 12, mid: 470, pegD: 48,
  pegs: [{ x: 1, z: 880, root: 0, tip: inch(19) / 2 }, { x: 1, z: 675, root: 0, tip: inch(19) / 2 }, { x: 1, z: 415, root: 0, tip: inch(19) / 2 }, { x: -1, z: 845, root: 0, tip: inch(19) / 2 }, { x: -1, z: 495, root: 0, tip: inch(19) / 2 }],
  posts: [{ z: 37, h: 100 }, { z: 482, h: 90 }],
  loads: [{ z: 600, plate: 'lb45' }, { z: 780, plate: 'lb35' }, { z: 2000, plate: 'lb25' }], postPlate: 'lb10', ribbedCaps: true,
};
/** RK-2BB: 12″ D × 19.9″ W × 30″ H bolt-together A-frame of 25 × 50 mm tube, four 4″ side pegs and a 4″ centre post (CAP manual + Amazon B00ZEYG9WK). */
export const CAP_RK2BB: AFrameSpec = {
  name: 'RK-2BB · 5 posts, 30″', height: inch(30), width: 505.5, depth: inch(12), foot: [50, 25], footX: 505.5 / 2 - 25, leg: [25, 50], legBottom: [171, 50], apex: [14, inch(30) - 17],
  cross: [50, 25], crossZ: 25, pegD: 48,
  pegs: [{ x: 1, z: 698, root: 49, tip: 159 }, { x: -1, z: 698, root: 49, tip: 159 }, { x: 1, z: 292, root: 138, tip: 240 }, { x: -1, z: 292, root: 138, tip: 240 }],
  posts: [{ z: 50, h: inch(4) }],
  loads: [{ z: 400, plate: 'lb25' }, { z: 2000, plate: 'lb10' }], postPlate: 'lb10', ribbedCaps: false,
};
export const CAP_AFRAMES = [CAP_RK2A, CAP_RK2BB] as const;
export const capAFrame = (p: NumericParams) => { const s = CAP_AFRAMES[p.model]; if (!s) throw Error('Unsupported plate rack model.'); return s; };
/** Leg centreline x at height z. */
export const aFrameLegX = (s: AFrameSpec, z: number) => s.legBottom[0] + (s.apex[0] - s.legBottom[0]) * (z - s.legBottom[1]) / (s.apex[1] - s.legBottom[1]);
/** Peg root: RK-2A pegs start at the leg's outer face; the RK-2BB saddles set their own published root. */
export const aFramePegRoot = (s: AFrameSpec, peg: AFramePeg) => peg.root || aFrameLegX(s, peg.z) + s.leg[0] / 2;
export const CAP_A_FRAME_PLATE_RACK = defineFloorPart({
  id: 'cap-a-frame-olympic-plate-rack', name: 'CAP A-Frame Plate Rack', title: 'CAP Barbell A-Frame Olympic Plate Rack', noun: 'plate rack', section: 'Floor storage',
  description: `CAP Barbell A-frame Olympic plate storage rack: black powder-coated steel A-frame on two foot tubes with 2″ plate pegs out to each side and vertical centre posts — the welded 7-post RK-2A (37″) or the bolt-together 5-post RK-2BB (30″). Show iron plates on the pegs. ${tail('CAP Barbell')}`,
  params: [enumParam('model', 'Model', CAP_AFRAMES.map(s => s.name)), loadParam('Plates')],
  footprint: p => ({ width: capAFrame(p).width, depth: capAFrame(p).depth }),
  placement: { side: 'left', gap: 400 },
  vendor: credit('CAP Barbell', 'https://www.capbarbell.com/products/cap-a-style-olympic-plate-storage-rack', 'A-Frame Olympic Plate Storage Rack (RK-2A 7-post, RK-2BB 5-post)', 'CAP and CAP Barbell are trademarks of CAP Barbell.',
    'Published: RK-2BB 30″ H × 19.9″ W × 12″ D with 4″ side pegs and a 4″ centre post, 25 × 50 mm tubes, five 2″ pegs, M10 bolts, 13.9 lb (Amazon dimension image, CAP assembly manual); RK-2A 37″ H × 19″ W × 22″ D, 500 lb (Amazon). Estimated from CAP / Amazon front elevations and Gym Radar owner photos: leg rake and apex, peg heights and saddles, foot sections, the RK-2A mid crossbar and ribbed foot caps. Scenery only, excluded from print export.'),
});

export const PARTS = [
  ROGUE_PLATE_TREE, TITAN_BARBELL_HOLDER, REP_DUMBBELL_RACK, TITAN_PLATE_TREE, REP_PLATE_TREE, REP_DUMBBELL_CART, TITAN_DUMBBELL_STAND,
  REP_KETTLEBELL_RACK, ROGUE_DUMBBELL_RACK, YES4ALL_BARBELL_HOLDER, CAP_A_FRAME_PLATE_RACK,
] as const;
