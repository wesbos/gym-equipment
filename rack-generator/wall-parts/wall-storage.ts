/** Wall-mounted barbell, plate and accessory storage (#128). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; wall-registry.ts already spreads it.
 * Sources, published dimensions and every estimate: research/wall-storage.md. Builders: parts/wall-storage.ts.
 * Wall axes: X along the wall, -Y out of it, Z up; origin at the face centre on the wall surface.
 * Faces never change with a `loaded` param (they reserve the loaded envelope), so loading a rack never moves it on the wall. */
import { defineWallPart } from '../wall-part.ts';
import type { NumericParams, Vec2 } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';
import type { FloorParam } from '../floor-part.ts';
import { BAR } from '../floor-parts/barbell.ts';
import { PLATE_SPECS, type PlateId } from '../plates.ts';
export const IN = 25.4;
const inch = (v: number) => v * IN, fmtIn = (v: number) => `${+(v / IN).toFixed(2)}″`;
const count = (noun: string) => (v: number) => v ? `${v} ${noun}${v === 1 ? '' : 's'}` : 'Empty';
const range = (n: number, from = 0) => Array.from({ length: n - from + 1 }, (_, i) => i + from);
const credit = (vendor: string, url: string, product: string, trademark: string, reconstruction: string): VendorAttribution => ({ vendor, url, credit: `${vendor} — ${product}`, trademark, reconstruction });
const ROGUE_TM = 'Rogue and Rogue Fitness are trademarks of Rogue Fitness.', REP_TM = 'REP and REP Fitness are trademarks of REP Fitness.';
const tail = (brand: string) => `Independent reconstruction from published specs and product photos; ${brand} trademarks belong to ${brand}.`;
/** Bar standing or hanging vertically: overall length and where its sleeve collars sit (from the floor-part BAR). */
export const BAR_LENGTH = BAR.length, BAR_COLLAR_INNER = BAR.shaftHalf, BAR_COLLAR = BAR.collar, BAR_SLEEVE = BAR.sleeve;

// ── Wall Control slotted metal pegboard ────────────────────────────────────────────────────────────────
/** Panel sizes in inches (width × height as mounted). 20 ga steel face on a 3/4″ formed mounting flange. */
export const WC_SIZES = [
  { label: '32″ tall × 16″ wide · vertical', w: 16, h: 32 },
  { label: '16″ tall × 32″ wide · horizontal', w: 32, h: 16 },
  { label: '48″ tall × 16″ wide · vertical', w: 16, h: 48 },
] as const;
/** Baked-on powder-coat colours (name, hex, metalness, roughness); galvanized is bare zinc-coated steel. */
export const WC_COLORS: readonly (readonly [string, string, number, number])[] = [
  ['Black', '#1c1d1f', .3, .42], ['Galvanized', '#b3b7ba', .85, .32], ['White', '#e9e9e5', .1, .4], ['Red', '#b5222a', .2, .4],
  ['Blue', '#1f4c9c', .2, .4], ['Gray', '#6f7275', .25, .42], ['Green', '#2e7438', .2, .4], ['Orange', '#dc6a1e', .2, .4],
  ['Yellow', '#e9bd1b', .2, .4], ['Beige', '#d4c5a2', .15, .42], ['Purple', '#6e2f93', .2, .4], ['Pink', '#df78a6', .2, .4], ['Gold', '#b8944a', .6, .35],
];
export const WC_DEPTH = inch(.75), WC_STEEL = .91, WC_DOT = inch(.25), WC_SLOT: Vec2 = [inch(1 / 8), inch(15 / 16)];
const wcSize = (p: NumericParams) => { const s = WC_SIZES[p.size]; if (!s) throw Error('Unsupported pegboard size.'); return s; };
/** Panel-local hole layout (mm from the panel centre): 1/4″ dots on a 1″ grid, 1″-inboard; vertical slots midway between dot
 * columns on every other dot row (2″ rows); mounting holes at the corners and on the 16″ stud line between them. */
export function wallControlHoles(w: number, h: number) {
  const dots: Vec2[] = [], slots: Vec2[] = [], mounts: Vec2[] = [];
  for (let j = 1; j < h; j++) for (let i = 1; i < w; i++) dots.push([inch(i - w / 2), inch(j - h / 2)]);
  for (let j = 1; j < h; j += 2) for (let i = 1; i < w - 1; i++) slots.push([inch(i + .5 - w / 2), inch(j - h / 2)]);
  const inset = inch(.45);
  for (let u = 0; u <= w; u += 16) for (let v = 0; v <= h; v += 16) if (u === 0 || u === w || v === 0 || v === h)
    mounts.push([inch(u - w / 2) + (u === 0 ? inset : u === w ? -inset : 0), inch(v - h / 2) + (v === 0 ? inset : v === h ? -inset : 0)]);
  return { dots, slots, mounts };
}
export const wallControlPanels = (p: NumericParams) => { const { w } = wcSize(p); return range(p.panels - 1).map(i => (i - (p.panels - 1) / 2) * inch(w)); };
/** Hook slots on real slot centres: every slot column, every other slot row (4″) from the top row. Row-major, top first. */
export function wallControlSlots(p: NumericParams): Vec2[] {
  const { w, h } = wcSize(p), rows: number[] = [];
  for (let j = h - 1; j >= 1; j -= 4) rows.push(inch(j - h / 2));
  const cols = wallControlPanels(p).flatMap(cx => range(w - 2, 1).map(i => cx + inch(i + .5 - w / 2)));
  return rows.flatMap(z => cols.map(x => [x, z] as Vec2));
}
export const WALL_CONTROL = defineWallPart({
  id: 'wall-control-pegboard', name: 'Wall Control pegboard', title: 'Wall Control slotted metal pegboard', noun: 'panel', section: 'Wall storage',
  description: 'Wall Control 20 ga steel pegboard: 1/4″ round holes on 1″ centres with vertical 1″ slots between them for slotted hooks, on a 3/4″ formed flush-with-wall mounting flange. 32″ × 16″, 16″ × 32″ or 48″ × 16″ panels, butted side by side, in the powder-coat colours. Hang attachments on its slots. ' + tail('Wall Control'),
  params: [
    { key: 'size', label: 'Panel size', default: 0, options: [0, 1, 2], format: v => WC_SIZES[v]?.label ?? String(v) },
    { key: 'panels', label: 'Panels side by side', default: 2, options: p => p.size === 2 ? [1, 2, 3] : [1, 2, 3, 4], format: v => `${v} panel${v === 1 ? '' : 's'}` },
    { key: 'color', label: 'Colour', default: 0, options: WC_COLORS.map((_, i) => i), format: v => WC_COLORS[v]?.[0] ?? String(v) },
  ],
  face: p => { const { w, h } = wcSize(p); return { width: p.panels * inch(w), height: inch(h) }; }, depth: WC_DEPTH,
  slots: wallControlSlots, height: 1400,
  vendor: credit('Wall Control', 'https://wallcontrol.com/products/32in-x-16in-metal-pegboard-tool-board-panel', 'Slotted metal pegboard panels', 'Wall Control is a trademark of Wall Control Pegboard.', 'Published 16″ × 32″ panel sizes, 20 ga steel, 1/4″ holes and slots on 1″ centres, 3/4″ flange and colour list; slot length, hole margins and mounting-hole inset measured from the manufacturer photo grid. Scenery only, excluded from print export.'),
});

// ── Prong hangers: Rogue Belt & Band Hanger / Multi-Use Hanger ─────────────────────────────────────────
/** 23.5″ × 4″ laser-cut 11 ga panel folded into a comb of flat prongs 5″ or 8″ deep. */
export interface ProngSpec { prongs: number; prongWidth: number }
export const PRONG_PANEL = { width: inch(23.5), height: inch(4), steel: inch(.1196), holes: [inch(22.5), inch(16)], holeRise: inch(2.5), hole: inch(.375) } as const;
export const PRONG_DEPTHS = [inch(5), inch(8)];
const prongPart = <const Id extends string>(id: Id, title: string, spec: ProngSpec, url: string, blurb: string) => ({ ...defineWallPart({
  id, name: title, title, noun: 'hanger', section: 'Wall storage',
  description: `${blurb} ${tail('Rogue Fitness')}`,
  params: [{ key: 'depth', label: 'Prong depth', default: PRONG_DEPTHS[0], options: PRONG_DEPTHS, format: fmtIn }],
  face: { width: PRONG_PANEL.width, height: PRONG_PANEL.height }, depth: PRONG_DEPTHS[1], height: 1500,
  vendor: credit('Rogue Fitness', url, title, ROGUE_TM, 'Published 23.5″ × 4″ 11 ga panel, prong count/width/depth and 22.5″ × 2.5″ mounting-hole pattern; prong pitch, bend and tip kick estimated from photos. The laser-cut ROGUE lettering is represented by a plain badge.'),
}), spec });
export const ROGUE_BELT_HANGER = prongPart('rogue-belt-band-hanger', 'Rogue Belt & Band Hanger', { prongs: 10, prongWidth: inch(1) }, 'https://www.roguefitness.com/belt-and-band-hanger',
  'Rogue Belt & Band Hanger: 23.5″ × 4″ laser-cut 11 ga black panel with ten 1″ flat prongs, 5″ or 8″ deep, for belts, bands and jump ropes.');
export const ROGUE_MULTI_HANGER = prongPart('rogue-multi-use-hanger', 'Rogue Multi-Use Hanger', { prongs: 6, prongWidth: inch(2) }, 'https://www.roguefitness.com/multi-use-hanger',
  'Rogue Multi-Use Hanger (H-52 / H-82): 23.5″ × 4″ laser-cut 11 ga black panel with six 2″ flat prongs, 5″ or 8″ deep, for chains, belts and bands.');

// ── Gun racks: horizontal barbell storage brackets ─────────────────────────────────────────────────────
export type LinerKind = 'insert' | 'sandwich' | 'lining';
/** Bracket = wall flange + a web plate on its left edge with `rungs` cradles; dimensions in mm. */
export interface GunRackSpec {
  height: number; depth: number; flange: number; steel: number; rungs: number; pitch: number;
  /** Arm thickness under the notch, lip rise above the notch floor, notch radius and its distance from the wall. */
  arm: number; lip: number; notch: number; notchAt: number; spine: number; gusset: number; chamfer: number;
  liner: LinerKind; linerThickness: number; color: string; roughness: number;
}
export const GUN_SPACINGS = [inch(40), inch(46), inch(60)];
/** Notch floors top-first. The first/last cradles leave 42/58 % of the spare height above/below (photo proportions). */
export function gunRackRungs(s: GunRackSpec) {
  const spare = s.height - (s.rungs - 1) * s.pitch, top = s.height / 2 - Math.max(s.lip + 4, .42 * spare);
  return range(s.rungs - 1).map(i => top - i * s.pitch);
}
/** Liner thickness under the bar at the notch floor. */
export const gunRackLift = (s: GunRackSpec, liners: boolean) => liners ? (s.liner === 'lining' ? 3 : 2) : 0;
/** Bar axes [x-independent]: rests on the shaft when brackets sit inside the collars, else on the sleeves. */
export const gunRackRest = (spacing: number) => spacing / 2 < BAR.shaftHalf - 10 ? BAR.shaft / 2 : BAR.sleeveDiameter / 2;
const gunParams = (rungs: (p: NumericParams) => number, liners: boolean, extra: FloorParam[] = []): FloorParam[] => [
  ...extra,
  { key: 'spacing', label: 'Bracket spacing', default: GUN_SPACINGS[1], options: GUN_SPACINGS, format: v => `${fmtIn(v)} c-c${v / 2 > BAR.shaftHalf ? ' · on sleeves' : ' · on shafts'}` },
  ...(liners ? [{ key: 'liners', label: 'UHMW liners', default: 1, options: [0, 1], format: (v: number) => v ? 'UHMW inserts' : 'Bare steel' }] : []),
  { key: 'loaded', label: 'Stored barbells', default: 0, options: p => range(rungs(p)), format: count('bar') },
];
const gunFace = (spec: (p: NumericParams) => GunRackSpec) => (p: NumericParams) => ({ width: Math.max(BAR.length, p.spacing + spec(p).flange), height: spec(p).height });
const ROGUE_GUN = { depth: inch(5), flange: inch(1.75), steel: inch(.1793), pitch: 134, arm: 28, lip: 26, notch: 26, notchAt: 54, spine: 26, gusset: 26, chamfer: 16, liner: 'insert' as const, linerThickness: inch(.375), color: '#1c1d1f', roughness: .78 };
export const ROGUE_V2_SPEC: GunRackSpec = { ...ROGUE_GUN, height: inch(31.75), rungs: 6 };
export const ROGUE_3_SPEC: GunRackSpec = { ...ROGUE_GUN, height: inch(17), rungs: 3 };
export const TITAN_6_SPEC: GunRackSpec = { height: inch(32), depth: inch(5.4), flange: inch(2), steel: inch(.1875), rungs: 6, pitch: 133, arm: 24, lip: 32, notch: 31, notchAt: 68, spine: 36, gusset: 10, chamfer: 14, liner: 'sandwich', linerThickness: inch(.25), color: '#161718', roughness: .6 };
export const REP_GUN_SPECS: readonly GunRackSpec[] = [3, 8].map(rungs => ({ height: inch(rungs === 3 ? 21.7 : 53.1), depth: inch(5.5), flange: inch(2.5), steel: inch(.2043), rungs, pitch: 165, arm: 26, lip: 42, notch: 30, notchAt: 72, spine: 36, gusset: 34, chamfer: 12, liner: 'lining' as const, linerThickness: 3, color: '#2d2f32', roughness: .72 }));
const repGun = (p: NumericParams) => { const s = REP_GUN_SPECS[p.size]; if (!s) throw Error('Unsupported gun rack size.'); return s; };
export const ROGUE_V2_GUN_RACK = defineWallPart({
  id: 'rogue-v2-gun-rack', name: 'Rogue V2 Gun Rack', title: 'Rogue V2 Gun Rack™', noun: 'gun rack', section: 'Wall storage',
  description: `Rogue V2 Gun Rack: a pair of precision-bent 7 ga brackets, 31.75″ tall and 5″ deep, whose six rungs cradle either the shaft or the sleeve of a bar; optional laser-cut UHMW inserts. Show up to six stored bars. ${tail('Rogue Fitness')}`,
  params: gunParams(() => 6, true), face: gunFace(() => ROGUE_V2_SPEC), depth: ROGUE_V2_SPEC.depth + ROGUE_V2_SPEC.linerThickness, height: 1350,
  vendor: credit('Rogue Fitness', 'https://www.roguefitness.com/the-rogue-gun-rack', 'V2 Gun Rack', ROGUE_TM, 'Published 31.75″ height, 5″ depth, 1.75″ flange and 7 ga steel; rung pitch, notch and lip profile, spacing and UHMW insert outline estimated from photos.'),
});
export const ROGUE_3_GUN_RACK = defineWallPart({
  id: 'rogue-3-bar-gun-rack', name: 'Rogue 3 Bar Gun Rack', title: 'Rogue 3 Bar Gun Rack™', noun: 'gun rack', section: 'Wall storage',
  description: `Rogue 3 Bar Gun Rack: two 17″ × 5″ 7 ga brackets with three rungs for the shaft or sleeve of a bar, optional UHMW inserts. ${tail('Rogue Fitness')}`,
  params: gunParams(() => 3, true), face: gunFace(() => ROGUE_3_SPEC), depth: ROGUE_3_SPEC.depth + ROGUE_3_SPEC.linerThickness, height: 1400,
  vendor: credit('Rogue Fitness', 'https://www.roguefitness.com/rogue-3-bar-gun-rack', '3 Bar Gun Rack', ROGUE_TM, 'Published 17″ bracket length, 5″ depth, 1.75″ flange, 7 ga steel and 3/8″ mounting holes; rung profile shared with the V2 Gun Rack estimate.'),
});
export const TITAN_6_BAR_RACK = defineWallPart({
  id: 'titan-wall-mounted-6-barbell-rack', name: 'Titan wall-mounted 6 barbell rack', title: 'Titan Wall Mounted 6 Barbell Rack', noun: 'gun rack', section: 'Wall storage',
  description: `Titan Fitness wall-mounted 6 barbell gun rack: two 32″ × 5.4″ black brackets with six hook-shaped cradles, fully lined with thick UHMW plates on both faces (V2). Show up to six stored bars. ${tail('Titan Fitness')}`,
  params: gunParams(() => 6, false), face: gunFace(() => TITAN_6_SPEC), depth: TITAN_6_SPEC.depth + 3, height: 1350,
  vendor: credit('Titan Fitness', 'https://titan.fitness/products/wall-mounted-6-barbell-rack', 'Wall Mounted 6 Barbell Rack', 'Titan Fitness is a trademark of Titan Fitness.', 'Published 32″ bracket height, 5.4″ depth, six-bar capacity and UHMW lining; flange width, steel thickness and hook profile estimated from photos.'),
});
export const REP_GUN_RACK = defineWallPart({
  id: 'rep-gun-rack-barbell-storage', name: 'REP gun rack barbell storage', title: 'REP Gun Rack Barbell Storage', noun: 'gun rack', section: 'Wall storage',
  description: `REP Fitness Gun Rack: two 6 ga matte black angle brackets, 5.5″ deep and 2.5″ wide, 21.7″ (3 bar) or 53.1″ (8 bar) long, with plastic-lined C cradles; REP recommends mounting them 46″ apart. ${tail('REP Fitness')}`,
  params: gunParams(repGun_rungs, false, [{ key: 'size', label: 'Capacity', default: 0, options: [0, 1], format: v => v ? '8 bar · 53.1″' : '3 bar · 21.7″' }]),
  face: gunFace(repGun), depth: REP_GUN_SPECS[0].depth + 3, height: 1300,
  validate: p => { if (p.loaded > repGun(p).rungs) throw Error('Unsupported gun rack stored barbells.'); },
  vendor: credit('REP Fitness', 'https://repfitness.com/products/gun-rack-barbell-storage', 'Gun Rack Barbell Storage', REP_TM, 'Published 21.7″/53.1″ length, 5.5″ depth, 2.5″ width, 6 ga steel, plastic liners and 46″ spacing; cradle pitch and C profile estimated from photos.'),
});
function repGun_rungs(p: NumericParams) { return repGun(p).rungs; }

// ── Rogue Vertical Bar Hanger ──────────────────────────────────────────────────────────────────────────
/** 3/16″ formed steel: 3″ wall flange over a 4.25″ deep shelf with open-front slots; the collar rests on a UHMW top. */
export const VBH = { depth: inch(4.25), height: inch(3), steel: inch(.1875), slot: 35, slotPitch: inch(3.5), barAt: 58, uhmw: inch(.25), tip: 22 } as const;
export const VBH_SIZES = [{ label: 'Single bar · 6″', length: inch(6), bars: 1, holes: [inch(4)], holeRise: 0 }, { label: 'Triple bar · 12″', length: inch(12), bars: 3, holes: [inch(10)], holeRise: inch(1.25) }] as const;
/** Hardware-local height of the collar seat (UHMW top) above the shelf underside; the face spans the hanging bars. */
export const vbhSeat = VBH.steel + VBH.uhmw;
/** Shift from hardware-local z (shelf underside = 0) to face-centred z: the hanging bars span the face exactly. */
export const vbhShift = -(vbhSeat - BAR.shaftHalf);
export const ROGUE_VERTICAL_BAR_HANGER = defineWallPart({
  id: 'rogue-vertical-bar-hanger', name: 'Rogue Vertical Bar Hanger', title: 'Rogue Vertical Bar Hanger', noun: 'bar hanger', section: 'Wall storage',
  description: `Rogue Vertical Bar Hanger (wall mount): 3/16″ laser-cut formed steel, 4.25″ deep and 3″ tall, 6″ single or 12″ triple, with a UHMW layer where the collar sits. Bars hang sleeve-up; the face reserves their full 2.2 m length. ${tail('Rogue Fitness')}`,
  params: [
    { key: 'size', label: 'Size', default: 1, options: [0, 1], format: v => VBH_SIZES[v]?.label ?? String(v) },
    { key: 'loaded', label: 'Hanging barbells', default: 0, options: p => range(VBH_SIZES[p.size]?.bars ?? 0), format: count('bar') },
  ],
  validate: p => { if (p.loaded > VBH_SIZES[p.size].bars) throw Error('Unsupported bar hanger hanging barbells.'); },
  face: p => ({ width: VBH_SIZES[p.size]?.length ?? VBH_SIZES[1].length, height: BAR.length }), depth: VBH.depth, height: BAR.length / 2 + 25,
  vendor: credit('Rogue Fitness', 'https://www.roguefitness.com/vertical-bar-hanger', 'Vertical Bar Hanger', ROGUE_TM, 'Published 6″/12″ length, 4.25″ depth, 3″ height, 3/16″ steel, UHMW layer and 4″ / 10″ × 1.25″ mounting holes; slot width, pitch and UHMW tip blocks estimated from photos.'),
});

// ── 9-bar vertical holders (floor-standing, parked against the wall) ───────────────────────────────────
/** 18″ square bent-steel box: top sheet folded into front/back walls, lower sheet the bars stand on, nine tubes in a 3 × 3 grid. */
export interface NineBarSpec { size: number; top: number; tubeTop: number; base: number; tubeOd: number; tubeId: number; pitch: number; steel: number; liner?: string; color: string; roughness: number; badge: [number, number] }
export const ROGUE_9_SPEC: NineBarSpec = { size: inch(18), top: inch(7.75), tubeTop: inch(8.5), base: inch(1.5), tubeOd: inch(2.375), tubeId: inch(2), pitch: inch(5.4), steel: inch(.1793), color: '#1c1d1f', roughness: .8, badge: [inch(12), inch(2.2)] };
export const REP_9_SPEC: NineBarSpec = { size: inch(18), top: inch(6.6), tubeTop: inch(7.5), base: inch(1), tubeOd: inch(2.5), tubeId: inch(2.12), pitch: inch(6), steel: inch(.1793), liner: '#3b3d40', color: '#2b2d30', roughness: .7, badge: [inch(7), inch(2.2)] };
export const nineBarFace = (s: NineBarSpec) => ({ width: s.size, height: s.base + BAR.length });
const nineBar = <const Id extends string>(id: Id, title: string, spec: NineBarSpec, vendor: VendorAttribution, blurb: string) => ({ ...defineWallPart({
  id, name: title, title, noun: 'bar holder', section: 'Wall storage', description: `${blurb} Floor-standing: parked on the floor against the wall (height = half its face). ${tail(vendor.vendor)}`,
  params: [{ key: 'loaded', label: 'Stored barbells', default: 3, options: range(9), format: count('bar') }],
  face: nineBarFace(spec), depth: spec.size, height: nineBarFace(spec).height / 2, vendor,
}), spec });
export const ROGUE_9_BAR_HOLDER = nineBar('rogue-9-bar-holder', 'Rogue 9 Bar Holder 2.0', ROGUE_9_SPEC,
  credit('Rogue Fitness', 'https://www.roguefitness.com/rogue-9-bar-holder-2-0', '9 Bar Holder 2.0', ROGUE_TM, 'Published 18″ × 18″ × 8.5″, 7 ga sheets and nine 7″ × 2″ ID DOM tubes; tube pitch, sheet heights and foot relief estimated from photos. The ROGUE cut-out is a plain badge.'),
  'Rogue 9 Bar Holder 2.0: nine 7″ long, 2″ ID DOM tubes between two 7 ga sheets in an 18″ × 18″ × 8.5″ matte black box; bars stand sleeve-first.');
export const REP_9_BAR_STORAGE = nineBar('rep-9-bar-storage', 'REP 9-Bar Storage', REP_9_SPEC,
  credit('REP Fitness', 'https://repfitness.com/products/9-bar-storage', '9-Bar Storage', REP_TM, 'Published 18″ × 18″ × 7.5″, 7 ga steel, black powder coat and plastic-lined tubes; tube size, pitch and sheet heights estimated from the product photo. The REP cut-out is a plain badge.'),
  'REP 9-Bar Storage: 18″ × 18″ × 7.5″ 7 ga black powder-coated holder with nine extra-tall plastic-lined tubes and a laser-cut logo.');

// ── Plate horns and change-plate pegs ─────────────────────────────────────────────────────────────────
/** Change plates below the shared plate table (iron Olympic 5 lb and 2.5 lb, 2″ bore); 10 lb uses PLATE_SPECS.lb10. */
export const CHANGE_PLATES = { cp5: { label: '5 lb', diameter: 200, width: 23 }, cp2: { label: '2.5 lb', diameter: 165, width: 19 } } as const;
export type StoredPlate = PlateId | keyof typeof CHANGE_PLATES;
export const storedPlate = (id: StoredPlate) => id in CHANGE_PLATES ? CHANGE_PLATES[id as keyof typeof CHANGE_PLATES] : PLATE_SPECS[id as PlateId];
export const stackLength = (plates: readonly StoredPlate[]) => plates.reduce((sum, p, i) => sum + storedPlate(p).width + (i ? .5 : 0), 0);
export const stackRadius = (plates: readonly StoredPlate[]) => Math.max(0, ...plates.map(p => storedPlate(p).diameter / 2));
/** A peg: root point on the plate face (x, z) with a tilt up from horizontal (degrees) and a loadable length. */
export interface Peg { x: number; z: number; length: number; tilt: number }
/** Extents [minX, maxX, minZ, maxZ] of a plate stack along a tilted peg (radius measured square to the tilted axis). */
export function stackExtents(peg: Peg, plates: readonly StoredPlate[], start = 0): [number, number, number, number] {
  const r = stackRadius(plates), a = peg.tilt * Math.PI / 180, end = start + stackLength(plates);
  if (!plates.length) return [peg.x, peg.x, peg.z, peg.z];
  return [peg.x - r, peg.x + r, peg.z + start * Math.sin(a) - r * Math.cos(a), peg.z + end * Math.sin(a) + r * Math.cos(a)];
}
/** REP Wall Mounted Plate Storage: 8.25″ horn(s) on a vertical stud-mount plate. */
export const REP_HORN = { plate: [inch(2.5), inch(16)] as Vec2, steel: inch(.25), horn: inch(1.9), length: inch(8.25), boss: 6 } as const;
export const REP_HORN_VARIANTS = [
  { label: 'Single · full-size plates', pegs: [0] },
  { label: 'Double · change plates', pegs: [inch(4.5), -inch(4.5)] },
] as const;
/** Loads by `loaded` value; single horns take 1–2, the double horn 3 (top horn first). */
export const REP_HORN_LOADS: readonly { label: string; variant: number; stacks: readonly (readonly StoredPlate[])[] }[] = [
  { label: 'Empty', variant: -1, stacks: [[], []] },
  { label: '2 × 25 kg bumpers', variant: 0, stacks: [['kg25', 'kg25']] },
  { label: '4 × 45 lb iron', variant: 0, stacks: [['lb45', 'lb45', 'lb45', 'lb45']] },
  { label: '5 + 2.5 lb pairs · 10 lb pair', variant: 1, stacks: [['cp5', 'cp5', 'cp2', 'cp2'], ['lb10', 'lb10']] },
];
export const repHornLoads = (variant: number) => REP_HORN_LOADS.map((l, i) => [l, i] as const).filter(([l]) => l.variant < 0 || l.variant === variant).map(([, i]) => i);
export const repHornPegs = (variant: number): Peg[] => REP_HORN_VARIANTS[variant].pegs.map(z => ({ x: 0, z, length: REP_HORN.length, tilt: 0 }));
/** Symmetric face around the hardware centre that holds every load option. */
function pegFace(pegs: Peg[], loads: readonly { stacks: readonly (readonly StoredPlate[])[] }[], hardware: [number, number], start: number) {
  let x = hardware[0] / 2, z = hardware[1] / 2;
  for (const load of loads) load.stacks.forEach((stack, i) => { if (!pegs[i]) return; const [x0, x1, z0, z1] = stackExtents(pegs[i], stack, start); x = Math.max(x, -x0, x1); z = Math.max(z, -z0, z1); });
  return { width: 2 * x, height: 2 * z };
}
export const repHornFace = (p: NumericParams) => pegFace(repHornPegs(p.variant), repHornLoads(p.variant).map(i => REP_HORN_LOADS[i]), REP_HORN.plate, REP_HORN.boss);
export const REP_WALL_PLATE_STORAGE = defineWallPart({
  id: 'rep-wall-mounted-plate-storage', name: 'REP wall-mounted plate storage', title: 'REP Wall Mounted Plate Storage', noun: 'plate storage', section: 'Wall storage',
  description: `REP Fitness wall-mounted weight horn: a powder-coated steel plate lagged to one stud with a single 8.25″ horn for full-size plates or a double horn for change plates. Show stored plates. ${tail('REP Fitness')}`,
  params: [
    { key: 'variant', label: 'Version', default: 0, options: [0, 1], format: v => REP_HORN_VARIANTS[v]?.label ?? String(v) },
    { key: 'loaded', label: 'Stored plates', default: 0, options: p => repHornLoads(p.variant), format: v => REP_HORN_LOADS[v]?.label ?? String(v) },
  ],
    face: repHornFace, depth: REP_HORN.steel + REP_HORN.length, height: 1300,
  vendor: credit('REP Fitness', 'https://repfitness.com/products/wall-mounted-plate-storage', 'Wall Mounted Plate Storage', REP_TM, 'Published 8.25″ horn length, single/double versions and stud mounting with four lag screws; plate size, horn diameter and double-horn spacing estimated from photos.'),
});
// Change-plate trees: two pegs on top, one below, on a Y-shaped plate that bolts through an upright.
export interface ChangeTreeSpec { span: number; drop: number; horn: number; length: number; tilt: number; steel: number; lobe: number; stem: number; top: number; holes: number[]; bolt: number[]; tabs: number[]; stopper: boolean; badge: [number, number, number]; badgeColor: string; color: string; roughness: number }
export const SDS_TREE: ChangeTreeSpec = { span: inch(9), drop: inch(9), horn: inch(1.9), length: inch(6), tilt: 3, steel: inch(.25), lobe: inch(1.4), stem: inch(2), top: inch(1.4), holes: [-inch(.3), -inch(4.3)], bolt: [-inch(2.3)], tabs: [-inch(3.7), -inch(1.9), inch(1.9), inch(3.7)], stopper: false, badge: [inch(5.2), inch(.9), inch(.55)], badgeColor: '#b9bcbe', color: '#1b1c1e', roughness: .75 };
export const BOS_TREE: ChangeTreeSpec = { span: inch(9), drop: inch(9), horn: inch(1.9), length: inch(8), tilt: 5, steel: inch(.25), lobe: inch(1.3), stem: inch(2.5), top: inch(1.3), holes: [-inch(2.1), -inch(6)], bolt: [-inch(2.1), -inch(6)], tabs: [], stopper: true, badge: [inch(1.6), inch(.75), -inch(.95)], badgeColor: '#aeb1b3', color: '#202123', roughness: .65 };
export const TREE_LOADS: readonly { label: string; stacks: readonly (readonly StoredPlate[])[] }[] = [
  { label: 'Empty', stacks: [[], [], []] },
  { label: '2.5 · 5 · 10 lb pairs', stacks: [['cp2', 'cp2'], ['cp5', 'cp5'], ['lb10', 'lb10']] },
];
export const treePegs = (s: ChangeTreeSpec): Peg[] => [{ x: -s.span / 2, z: 0, length: s.length, tilt: s.tilt }, { x: s.span / 2, z: 0, length: s.length, tilt: s.tilt }, { x: 0, z: -s.drop, length: s.length, tilt: s.tilt }];
/** Plates start this far out along the peg (BoS rubber stopper ring). */
export const treeStart = (s: ChangeTreeSpec) => s.stopper ? 16 : 2;
/** Hardware-local (peg line z = 0) extents → face and the shift that centres it. */
export function treeLayout(s: ChangeTreeSpec) {
  const pegs = treePegs(s), tabRise = s.tabs.length ? 2 * IN * Math.sin(20 * Math.PI / 180) + s.steel : 0;
  let x0 = -s.span / 2 - s.lobe, x1 = -x0, z0 = -s.drop - s.lobe, z1 = s.top + tabRise;
  for (const load of TREE_LOADS) load.stacks.forEach((stack, i) => { const e = stackExtents(pegs[i], stack, treeStart(s)); x0 = Math.min(x0, e[0]); x1 = Math.max(x1, e[1]); z0 = Math.min(z0, e[2]); z1 = Math.max(z1, e[3]); });
  // Peg tips rise with the tilt.
  const tipRise = s.length * Math.sin(s.tilt * Math.PI / 180) + s.horn / 2;
  z1 = Math.max(z1, tipRise);
  return { width: 2 * Math.max(-x0, x1), height: z1 - z0, shift: -(z0 + z1) / 2 };
}
const treePart = <const Id extends string>(id: Id, title: string, spec: ChangeTreeSpec, vendor: VendorAttribution, blurb: string, params: FloorParam[] = []) => ({ ...defineWallPart({
  id, name: title, title, noun: 'plate pegs', section: 'Wall storage',
  description: `${blurb} Bolts through a 3×3 upright; shown flat on the wall (a wall-mount upright or stringer). ${tail(vendor.vendor)}`,
  params: [...params, { key: 'loaded', label: 'Stored plates', default: 0, options: [0, 1], format: v => TREE_LOADS[v]?.label ?? String(v) }],
  face: { width: treeLayout(spec).width, height: treeLayout(spec).height }, depth: spec.steel + spec.length, height: 1200, vendor,
}), spec });
export const BOS_CHANGE_PLATE_PEGS = treePart('bells-of-steel-change-plate-pegs', 'Bells of Steel Change Plate Storage Pegs', BOS_TREE,
  credit('Bells of Steel', 'https://bellsofsteel.us/products/change-plate-pegs', 'Change Plate Storage Pegs', 'Bells of Steel, Hydra and Manticore are trademarks of Bells of Steel.', 'Published 8″ loadable sleeves, triple layout with two pegs on top, upward weld angle, two-bolt mounting and Manticore UHMW pad plus rubber stoppers; plate outline, peg spacing and angle estimated from photos.'),
  'Bells of Steel Change Plate Storage Pegs: three 8″ upward-angled pegs (two on top) on a Y-shaped black plate that bolts to a 3×3 upright with two bolts; the Manticore version adds a UHMW pad and rubber stoppers.',
  [{ key: 'version', label: 'Rack version', default: 0, options: [0, 1], format: v => v ? 'Manticore · 1″ holes + UHMW' : 'Hydra · 5/8″ holes' }]);
export const SDS_CHANGE_PLATE_STORAGE = treePart('stray-dog-change-plate-storage', 'Stray Dog Strength Change Plate Storage', SDS_TREE,
  credit('Stray Dog Strength', 'https://straydogstrength.com/products/change-plate-storage', 'Change Plate Storage', 'Stray Dog Strength is a trademark of Stray Dog Strength.', 'Published dimension drawing: pegs 9″ apart, bottom peg 9″ below, 6″ pegs at 87° (3° up), 4″ hole spacing and 2″ storage tabs; plate thickness and lobe radii scaled from the drawing.'),
  'Stray Dog Strength Change Plate Storage: a single-bolt Y plate with two 6″ pegs 9″ apart and one 9″ below, each angled 3° up, plus four bent storage tabs along the top edge for collars and bands.',
  [{ key: 'bolt', label: 'Upright holes', default: 0, options: [0, 1], format: v => v ? '5/8″ bolt' : '1″ bolt' }]);

// ── Rogue Wall Mount Swiss Brackets (medicine-ball shelf) ─────────────────────────────────────────────
export const SWISS = { reach: inch(15.5), flange: inch(2.5), height: inch(8), arm: inch(2.5), steel: inch(.1875), pipes: [150, 372], pipe: inch(1.05), pipeLength: inch(52), ball: inch(14), gap: 12 } as const;
export const SWISS_SPACINGS = [inch(24), inch(32), inch(40)];
/** Hardware-local: arm top at z = 0. Ball centre above the pipes' axis where it rests on both pipes. */
export const swissBall = () => { const half = (SWISS.pipes[1] - SWISS.pipes[0]) / 2, axis = -SWISS.arm / 2, rise = Math.sqrt((SWISS.ball / 2 + SWISS.pipe / 2) ** 2 - half ** 2); return { d: (SWISS.pipes[0] + SWISS.pipes[1]) / 2, z: axis + rise }; };
/** Hardware-local: arm top at z = 0, flange 8″ down from it; the face spans flange bottom to the ball tops. */
export const swissLayout = () => { const top = swissBall().z + SWISS.ball / 2 + 1.2, bottom = -SWISS.height; return { height: top - bottom, shift: -(top + bottom) / 2, top, bottom }; };
export const ROGUE_SWISS_BRACKETS = defineWallPart({
  id: 'rogue-wall-mount-swiss-brackets', name: 'Rogue Wall Mount Swiss Brackets', title: 'Rogue Wall Mount Swiss Brackets', noun: 'ball shelf', section: 'Wall storage',
  description: `Rogue Wall Mount Swiss Brackets: a pair of 3/16″ laser-cut steel brackets reaching 15.5″ from the wall, carrying two 52″ pipes locked with shaft collars — a wall-mounted medicine-ball shelf. Show up to four 14″ med balls. ${tail('Rogue Fitness')}`,
  params: [
    { key: 'spacing', label: 'Bracket spacing', default: SWISS_SPACINGS[1], options: SWISS_SPACINGS, format: v => `${fmtIn(v)} c-c` },
    { key: 'loaded', label: 'Medicine balls', default: 0, options: range(4), format: count('ball') },
  ],
  face: { width: Math.max(SWISS.pipeLength, 4 * SWISS.ball + 3 * SWISS.gap), height: swissLayout().height }, depth: swissBall().d + SWISS.ball / 2, height: 1200,
  vendor: credit('Rogue Fitness', 'https://www.roguefitness.com/rogue-wall-mount-swiss-brackets', 'Wall Mount Swiss Brackets', ROGUE_TM, 'Published 15.5″ reach, 8″ × 2.5″ bracket, 3/16″ steel, 52″ pipes and four shaft collars; pipe positions, lightening holes and 14″ med balls estimated from photos.'),
});

export const PARTS = [
  WALL_CONTROL, ROGUE_BELT_HANGER, ROGUE_V2_GUN_RACK, ROGUE_VERTICAL_BAR_HANGER, ROGUE_9_BAR_HOLDER, ROGUE_3_GUN_RACK, REP_WALL_PLATE_STORAGE,
  TITAN_6_BAR_RACK, BOS_CHANGE_PLATE_PEGS, REP_GUN_RACK, SDS_CHANGE_PLATE_STORAGE, ROGUE_MULTI_HANGER, REP_9_BAR_STORAGE, ROGUE_SWISS_BRACKETS,
] as const;
