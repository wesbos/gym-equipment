/** Brand J-cups (#133): Ghost Strong Return Roller, REP Flat Sandwich, Rogue Monster Lite and Monster, Bells of Steel,
 * Irwin and Titan roller J-cups. Metadata only (main bundle): no Manifold imports. Research: research/rack-jcups-safeties.md.
 * Geometry numbers are shared with the builder (parts/rack-jcups-safeties-cups.ts) so bodies and cradles follow the
 * solids. Profiles are (y out from the mounting face, z up from the cup's lowest edge) in mm; `pinZ` is the height of
 * the mounting pin above that edge, so builder z = profile z - pinZ. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
type Pt = [number, number];
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const faceWidth = (p: NumericParams) => p.uprightWidth ?? p.upright ?? 75;
const BAR_R = 14.25;
/** J-cup bodies/cradles common shape: the cup in front of the face plus the side clasp that wraps the upright. */
export interface CupLayout { pinZ: number; height: number; reach: number; width: number; rest: [number, number]; clasp?: { side: 1 | -1 | 0; z0: number; z1: number; back: number; t: number } }
function cupBodies(p: NumericParams, c: CupLayout): LocalBox[] {
  const f = face(p), z = (v: number) => v - c.pinZ, w = faceWidth(p) / 2;
  const boxes: LocalBox[] = [{ min: [-c.width / 2, f + 1, z(0)], max: [c.width / 2, f + c.reach, z(c.height)] }];
  if (c.clasp) for (const s of c.clasp.side ? [c.clasp.side] : [-1, 1]) {
    const x0 = w + .6, x1 = w + .6 + c.clasp.t;
    boxes.push({ min: [s > 0 ? x0 : -x1, f - c.clasp.back, z(c.clasp.z0)], max: [s > 0 ? x1 : -x0, f, z(c.clasp.z1)] });
  }
  return boxes;
}
const cupSlot = (p: NumericParams, c: CupLayout) => [{ point: [0, face(p) + c.rest[0], c.rest[1] - c.pinZ] as Vec3, axis: [1, 0, 0] as Vec3 }];
const extentOf = (c: CupLayout) => ({ below: c.pinZ + 1, above: c.height - c.pinZ + 1 });
/** 3x3 products clasp a true 3 in (or 75 mm) face; the 2x3 and 60 mm variants their own. */
function faceFits(p: NumericParams, want: number, name: string) {
  const w = faceWidth(p);
  if (Math.abs(w - want) > 2.5) throw Error(`${name} clasp fits a ${(want / 25.4).toFixed(want < 60 ? 1 : 0)} in upright face, not ${(w / 25.4).toFixed(2)} in.`);
}
const pinFit = (rack: RackDimensions) => rack.holeDiameter >= PIN_1IN ? 1 : 0;

// ─── Ghost Strong Return Roller J-Cup 2.0 ──────────────────────────────────────────────────────────────────────
/** Published (Rogue-made 2.0): 2.75 in wide, 10.625 in total / 7.875 in roller-to-top, 2.875 in rackable depth,
 * 3/8 in formed channel, 7 x 8.25 x 10.5 in, 22 lb pair. Liner, roller profile and clasp sizes estimated from photos. */
export const GHOST = {
  width: inch(2.75), plate: inch(3 / 8), backLiner: 3, faceLiner: inch(1 / 4), back: inch(10.5), floorDrop: inch(.125), rackable: inch(2.875),
  lipLiner: inch(1 / 4), lipTop: 76, rollerZ: 45, rollerLength: 70, claspBack: 64, claspTop: 52, pinFromTop: 25.4, pinBehind: 88,
  /** Half profile (radius, t along the roller from the back): cylindrical base, cone, concave waist, front flare. */
  roller: [[0, 0], [18, 0], [19.5, 1.5], [19.5, 22], [14.5, 48], [14.5, 55], [20.5, 65], [21.5, 67], [21.5, 70], [0, 70]] as Pt[],
  waistT: 51.5,
} as const;
export const GHOST_FINISHES = [
  ['Texture Black', '#232426'], ['Bright Blue', '#1d5fbf'], ['Dark Blue', '#1c2b52'], ['Bright Green', '#2f9e3c'], ['Burnt Orange', '#c1561f'],
  ['Dark Red', '#7c1a1d'], ['Gun Metal', '#4a4d52'], ['Light Gray', '#a9adb1'], ['White', '#e6e7e8'],
] as const;
export const GHOST_ROLLERS = ['Composite roller', 'Silicon carbide coated steel roller'] as const;
export function ghostLayout(): CupLayout & { floorY: number; lipY: number } {
  const g = GHOST, backFront = g.backLiner + g.plate + g.faceLiner, lipY = backFront + g.rackable, reach = lipY + g.lipLiner + g.plate, pinZ = g.floorDrop + g.back - g.pinFromTop;
  return { pinZ, height: g.floorDrop + g.back, reach, width: g.width, floorY: backFront, lipY,
    rest: [backFront + 1.5 + g.waistT, g.floorDrop + g.rollerZ + 14.5 + BAR_R], clasp: { side: -1, z0: 0, z1: g.floorDrop + g.claspTop, back: g.claspBack, t: g.plate } };
}
export const GHOST_ROLLER_J_CUP = defineRackPart({
  id: 'ghost-strong-ghost-roller-j-cup', name: 'Ghost Roller J-Cup', title: 'Ghost Strong Return Roller J-Cups 2.0', noun: 'j-cup', section: 'J-cups & safeties',
  description: 'Return roller J-cup with a patented conical roller that rolls the bar to the front of the cup · 2.75 in wide · 10.5 in back plate with UHMW face, back and lip · 1 in or 5/8 in pin. Independent reconstruction; Ghost Strong trademarks belong to Ghost Strong.',
  params: [
    { key: 'pin', label: 'Pin', default: 1, options: [0, 1], format: v => ['5/8 in pin (Monster Lite)', '1 in pin (Monster)'][v] ?? String(v) },
    { key: 'roller', label: 'Roller', default: 0, options: [0, 1], format: v => GHOST_ROLLERS[v] ?? String(v) },
    { key: 'color', label: 'Finish', default: 0, options: GHOST_FINISHES.map((_, i) => i), format: v => GHOST_FINISHES[v]?.[0] ?? String(v) },
  ],
  vendor: {
    vendor: 'Ghost Strong', url: 'https://www.roguefitness.com/ghost-roller-j-cups-2-0-1-inch-pins',
    credit: 'Ghost Strong — Return Roller J-Cup 2.0 (manufactured by Rogue Fitness) · Made in USA', trademark: 'Ghost Strong and Return Roller are trademarks of Ghost Strong; Rogue is a trademark of Rogue Fitness.',
    reconstruction: 'Published 2.75 in width, 10.625 in total height, 7.875 in from roller to top, 2.875 in rackable depth and 3/8 in formed channel. Roller profile, liner thicknesses, clasp length and pin length estimated from Rogue product photos; physical fit unverified.',
  },
  mount: { pin: p => p.pin ? PIN_1IN : PIN_5_8IN, extent: extentOf(ghostLayout()), faces: ['front', 'back'], validate: (_r, p) => faceFits(p, inch(3), 'Ghost Roller J-Cup') },
  bodies: p => cupBodies(p, ghostLayout()),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Ghost Roller J-Cups', slots: p => cupSlot(p, ghostLayout()) },
  placement: { height: 1215, face: 'front' },
  autoFit: rack => ({ pin: pinFit(rack) }),
  family: 'j-hooks',
});

// ─── REP Flat Sandwich J-Cups 2.0 / 1.0 ────────────────────────────────────────────────────────────────────────
/** Published 2.0: 6 in extension from the rack, landing zone 6.1 in tall × 1.2 in wide × 2 in long, 13.3/14.3 lb pair
 * (4000/5000). Steel core with urethane/plastic liners. Profile, wrap and pin position estimated from photos. */
export const REP_SANDWICH = {
  core: inch(1 / 4), liner: 12, inset: 1.5, wrapT: 5, wrapBack: 64, wrapTop: 57, height: 198, reach: inch(6), pinFromTop: 22, pinBehind: 80,
  /** 2.0: taller landing lip. 1.0: the original, 12 mm lower lip. */
  profiles: [
    [[5, 0], [120, 0], [152.4, 30], [152.4, 57], [146, 63], [128, 63], [106, 41], [48, 41], [42, 47], [42, 192], [36, 198], [5, 198]],
    [[5, 0], [120, 0], [152.4, 30], [152.4, 45], [146, 51], [128, 51], [108, 36], [48, 36], [42, 42], [42, 192], [36, 198], [5, 198]],
  ] as Pt[][],
  floor: [41, 36], landing: [48, 106],
} as const;
export const REP_SERIES = ['4000 Series · 5/8 in pin', '5000 Series · 1 in pin'] as const;
export const REP_VERSIONS = ['2.0', '1.0'] as const;
export function repSandwichLayout(p: NumericParams): CupLayout {
  const r = REP_SANDWICH, v = p.version ?? 0, width = r.core + 2 * r.liner;
  return { pinZ: r.height - r.pinFromTop, height: r.height, reach: r.reach, width, rest: [(r.landing[0] + r.landing[1]) / 2 - 6, r.floor[v] + BAR_R], clasp: { side: 0, z0: 0, z1: r.wrapTop, back: r.wrapBack, t: r.wrapT } };
}
export const REP_FLAT_SANDWICH_J_CUPS = defineRackPart({
  id: 'rep-flat-sandwich-j-cups', name: 'REP Flat Sandwich J-Cup', title: 'REP Fitness Flat Sandwich J-Cups', noun: 'j-cup', section: 'J-cups & safeties',
  description: 'Steel-core J-cups sandwiched in textured plastic liners with a flat landing zone and a U-wrap that hugs the upright · 6 in reach · 4000 (5/8 in) or 5000 (1 in) Series · 2.0 or original 1.0. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [
    { key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => REP_SERIES[v] ?? String(v) },
    { key: 'version', label: 'Version', default: 0, options: [0, 1], format: v => REP_VERSIONS[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/flat-sandwich-j-cups-2-0',
    credit: 'REP Fitness — Flat Sandwich J-Cups 2.0 (PRA-4012 / PRA-5013) and 1.0', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 6 in extension, 6.1 in landing-zone height, 1.2 in width and 2 in landing length. Side profile, liner split, U-wrap and pin height estimated from REP and owner photos; the 1.0 lip height is estimated from owner photos. Physical fit unverified.',
  },
  mount: { pin: p => p.series ? PIN_1IN : PIN_5_8IN, extent: p => extentOf(repSandwichLayout(p)), faces: ['front', 'back'], validate: (_r, p) => faceFits(p, inch(3), 'REP Flat Sandwich J-Cup') },
  bodies: p => cupBodies(p, repSandwichLayout(p)),
  pair: { default: true },
  cradles: { kind: 'working', label: 'REP Flat Sandwich J-Cups', slots: p => cupSlot(p, repSandwichLayout(p)) },
  placement: { height: 1215, face: 'front' },
  autoFit: rack => ({ series: pinFit(rack) }),
  family: 'j-hooks',
});

// ─── Rogue Monster Lite and Monster J-Cups ─────────────────────────────────────────────────────────────────────
/** Published: Monster Lite standard 3 in × 6 in, 2.5 in rackable, 3/8 in plate; ML 1 in sandwich 1.5 in × 10 in,
 * 2.5 in rackable; Monster standard 3 in × 7.75 in, 2.75 in rackable; Monster sandwich 1.5 in × 10 in, 2.5 in rackable. */
export const ROGUE_CUP = {
  plate: inch(3 / 8), core: inch(3 / 4), backPad: 3, claspBack: 60,
  /** Bent standard cups: back plate, bend, floor, 40° lip (outline of the 3/8 in plate). */
  standard: [
    { height: inch(6), floorEnd: 78, lipY: inch(4), lipZ: 38, pinFromTop: 22, clasp: [60, 120] as Pt },
    { height: inch(7.75), floorEnd: 84, lipY: inch(4.35), lipZ: 42, pinFromTop: 24, clasp: [70, 140] as Pt },
  ],
  /** Sandwich side-plate profile (both lines): tall column, sloped underside, 2.5 in landing, chamfered lip. */
  sandwich: [[12.5, 0], [50, 0], [156, 50], [160, 58], [160, 90], [152, 100], [140, 100], [107, 66], [52, 66], [46, 72], [46, 248], [40, 254], [12.5, 254]] as Pt[],
  sandwichFloor: 66, sandwichLanding: [46, 107] as Pt, sandwichPinFromTop: 25, sandwichClasp: [60, 127] as Pt,
} as const;
export const ROGUE_ML_STYLES = ['Standard (UHMW face)', '1 in Sandwich'] as const;
export const ROGUE_MONSTER_STYLES = ['1 in Sandwich', 'Standard (UHMW face)'] as const;
/** `line` 0 = Monster Lite, 1 = Monster; `sandwich` true for the UHMW-core cups. */
export function rogueCupLayout(line: 0 | 1, sandwich: boolean): CupLayout {
  const c = ROGUE_CUP;
  if (sandwich) return { pinZ: 254 - c.sandwichPinFromTop, height: 256, reach: 160, width: 2 * c.plate + c.core, rest: [(c.sandwichLanding[0] + c.sandwichLanding[1]) / 2 + 2, c.sandwichFloor + 2 + BAR_R],
    clasp: { side: 1, z0: c.sandwichClasp[0], z1: c.sandwichClasp[1], back: c.claspBack, t: c.plate } };
  const s = c.standard[line], pad = 6.35;
  return { pinZ: s.height - s.pinFromTop, height: s.height, reach: s.lipY, width: inch(3), rest: [c.plate + pad + 32, c.plate + pad + BAR_R],
    clasp: { side: 1, z0: s.clasp[0], z1: s.clasp[1], back: c.claspBack, t: c.plate } };
}
export const ROGUE_MONSTER_LITE_J_CUPS = defineRackPart({
  id: 'rogue-monster-lite-j-cups', name: 'Rogue Monster Lite J-Cup', title: 'Rogue Monster Lite J-Cups', noun: 'j-cup', section: 'J-cups & safeties',
  description: 'Monster Lite J-cups for 5/8 in holes: laser-cut, bent 3/8 in plate with a UHMW face (3 × 6 in), or the 1 in sandwich with a full UHMW core (1.5 × 10 in) · 2.5 in rackable depth · swing-in clasp. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'style', label: 'Style', default: 0, options: [0, 1], format: v => ROGUE_ML_STYLES[v] ?? String(v) }],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/j-3358-monster-lite-j-cups',
    credit: 'Rogue Fitness — Monster Lite J-Cup Pairs (Standard / 1" Sandwich) · Made in USA', trademark: 'Rogue and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published widths (3 in / 1.5 in), heights (6 in / 10 in), 2.5 in rackable depth, 3/8 in plate and 5/8 in pin. Bend radii, lip angle, UHMW insert size and clasp position estimated from Rogue product photos; physical fit unverified.',
  },
  mount: { pin: PIN_5_8IN, extent: p => extentOf(rogueCupLayout(0, p.style === 1)), faces: ['front', 'back'], validate: (_r, p) => faceFits(p, inch(3), 'Monster Lite J-Cup') },
  bodies: p => cupBodies(p, rogueCupLayout(0, p.style === 1)),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Monster Lite J-Cups', slots: p => cupSlot(p, rogueCupLayout(0, p.style === 1)) },
  placement: { height: 1215, face: 'front' },
  family: 'j-hooks',
});
export const ROGUE_MONSTER_SANDWICH_J_CUP = defineRackPart({
  id: 'rogue-monster-sandwich-j-cup', name: 'Rogue Monster J-Cup', title: 'Rogue Monster 1" Sandwich J-Cups', noun: 'j-cup', section: 'J-cups & safeties',
  description: 'Monster J-cups for 3 × 3 in uprights with 1 in holes: 1 in sandwich with a full-height UHMW core and UHMW back pad (1.5 × 10 in, 2.5 in rackable), or the bent standard cup (3 × 7.75 in, 2.75 in rackable). Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'style', label: 'Style', default: 0, options: [0, 1], format: v => ROGUE_MONSTER_STYLES[v] ?? String(v) }],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/monster-j-cup-pairs',
    credit: 'Rogue Fitness — Monster J-Cup Pairs (1" Sandwich / Standard) · Made in USA', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published widths (1.5 in / 3 in), heights (10 in / 7.75 in), rackable depths (2.5 in / 2.75 in), 3/8 in plate and 1 in pin. Profile, clasp and UHMW sizes estimated from Rogue product photos; physical fit unverified.',
  },
  mount: { pin: PIN_1IN, extent: p => extentOf(rogueCupLayout(1, p.style !== 1)), faces: ['front', 'back'], validate: (_r, p) => faceFits(p, inch(3), 'Monster J-Cup') },
  bodies: p => cupBodies(p, rogueCupLayout(1, p.style !== 1)),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Monster J-Cups', slots: p => cupSlot(p, rogueCupLayout(1, p.style !== 1)) },
  placement: { height: 1215, face: 'front' },
  family: 'j-hooks',
});

// ─── Roller J-cups: Bells of Steel, Irwin Fitness, Titan ───────────────────────────────────────────────────────
/** Shared roller-cup description: back plate with a UHMW face and top pin, floor channel, front lip, roller along +Y. */
export interface RollerCup {
  /** Heights are from the cup's lowest edge: `floorZ` is the channel floor underside (a gusset fills below it), `lipH` the lip top. */
  backW: number; backH: number; backT: number; faceLiner: number; floorZ: number; floorT: number; channelW: number; inner: number; lipH: number; lipT: number;
  /** The lip top leans this far out past its foot (Titan's flared lip). */ lipLean?: number;
  rollerR: number; rollerZ: number; pinFromTop: number; clasp: { side: 1 | -1 | 0; z0: number; z1: number; back: number; t: number };
}
export function rollerLayout(c: RollerCup, dip: number): CupLayout & { floorY: number; lipY: number } {
  const floorY = c.backT + c.faceLiner, lipY = floorY + c.inner;
  return { pinZ: c.backH - c.pinFromTop, height: c.backH, reach: lipY + c.lipT + (c.lipLean ?? 0), width: Math.max(c.backW, c.channelW), floorY, lipY,
    rest: [floorY + c.inner / 2, c.rollerZ + c.rollerR - dip + BAR_R], clasp: c.clasp };
}
/** BoS: estimated from product photos (no published dimensions besides fit): Hydra/Manticore 3 in, 60 mm version. */
export const BOS_ROLLER = [
  { name: 'Hydra · 3 × 3 in · 5/8 in', face: inch(3), pin: PIN_5_8IN, roller: '#ecebe6', magPin: false },
  { name: 'Manticore · 3 × 3 in · 1 in', face: inch(3), pin: PIN_1IN, roller: '#ecebe6', magPin: true },
  { name: '60 mm · 5/8 in', face: 60, pin: PIN_5_8IN, roller: '#ecebe6', magPin: false },
] as const;
export const BOS_CUP: RollerCup = { backW: 64, backH: 190, backT: 8, faceLiner: 6, floorZ: 0, floorT: 6, channelW: 64, inner: 88, lipH: 80, lipT: 6, rollerR: 22, rollerZ: 34, pinFromTop: 24,
  clasp: { side: 1, z0: 0, z1: 64, back: 70, t: 6 } };
export const IRWIN_ROLLERS = ['Center return acetal roller', 'Flat acetal roller', 'Center return hardened steel roller', 'Flat hardened steel roller'] as const;
export const IRWIN_COLORS = [['Black', '#1f2022'], ['Red', '#8e1b20'], ['White', '#e3e3e1'], ['Green', '#2f5a47'], ['Blue', '#21478f'], ['Slate Blue', '#48678a']] as const;
/** Irwin: estimated from the Irwin renders and owner photo (no published dimensions). Center-return dip 6 mm. */
export const IRWIN_CUP: RollerCup = { backW: 70, backH: 250, backT: 9.5, faceLiner: 6.35, floorZ: 55, floorT: 9.5, channelW: 76.2, inner: 76, lipH: 128, lipT: 9.5, rollerR: 25.4, rollerZ: 93, pinFromTop: 25,
  clasp: { side: 0, z0: 50, z1: 120, back: inch(3) + 4, t: 6.35 } };
export const IRWIN_DIP = 6;
/** Titan published: 9.5 in tall, 10 in overall depth, 1.5 × 3 in roller pad, 16 mm (5/8 in) locking pop-pin. */
export const TITAN_SERIES = [{ name: 'X-3 · 3 × 3 in', face: inch(3) }, { name: 'T-3 · 2 × 3 in', face: inch(2) }] as const;
export const TITAN_CUP: RollerCup = { backW: 58, backH: inch(9.5), backT: 6, faceLiner: 6, floorZ: 45, floorT: 6, channelW: 64, inner: inch(3) + 4, lipH: 103, lipT: 6, lipLean: 22, rollerR: inch(.75), rollerZ: 72, pinFromTop: 24,
  clasp: { side: 0, z0: 40, z1: 94, back: inch(3) + 6, t: 6 } };
export const TITAN_DIP = 3;
export const BOS_ROLLER_J_CUPS = defineRackPart({
  id: 'bells-of-steel-roller-j-cups', name: 'Bells of Steel Roller J-Cup', title: 'Bells of Steel Roller J-Cups', noun: 'j-cup', section: 'J-cups & safeties',
  description: 'Roller J-cups with a nylon roller between the UHMW-faced back plate and the padded front lip · Hydra (3 × 3 in, 5/8 in), Manticore (3 × 3 in, 1 in, magnetic lock pin) or 60 mm racks. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [{ key: 'version', label: 'Rack', default: 0, options: [0, 1, 2], format: v => BOS_ROLLER[v]?.name ?? String(v) }],
  vendor: {
    vendor: 'Bells of Steel', url: 'https://bellsofsteel.com/products/roller-j-cups',
    credit: 'Bells of Steel — Roller J-Cups (R-CUP-RA-HDR / RC-RA-MTC / RLR-CUP-RA)', trademark: 'Bells of Steel, Hydra and Manticore are trademarks of Bells of Steel.',
    reconstruction: 'Published fits (Hydra 3 × 3 in with 5/8 in holes, Manticore 3 × 3 in with 1 in holes and mag pins, 60 mm racks) and capacities. All dimensions are estimated from Bells of Steel product photos; physical fit unverified.',
  },
  mount: { pin: p => BOS_ROLLER[p.version ?? 0]?.pin ?? PIN_5_8IN, extent: extentOf(rollerLayout(BOS_CUP, 0)),    validate: (_r, p) => faceFits(p, BOS_ROLLER[p.version ?? 0]?.face ?? inch(3), 'Bells of Steel Roller J-Cup') },
  bodies: p => cupBodies(p, rollerLayout(BOS_CUP, 0)),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Bells of Steel Roller J-Cups', slots: p => cupSlot(p, rollerLayout(BOS_CUP, 0)) },
  placement: { height: 1215, face: 'front' },
  autoFit: rack => ({ version: rack.tube < 66 ? 2 : pinFit(rack) }),
  family: 'j-hooks',
});
export const IRWIN_RETURN_ROLLER_J_CUPS = defineRackPart({
  id: 'irwin-return-roller-j-cups', name: 'Irwin Return Roller J-Cup', title: 'Irwin Fitness Return Roller J-Cups 2.0', noun: 'j-cup', section: 'J-cups & safeties',
  description: 'Made-in-Canada roller J-cups with a machined center-return (or flat) roller, a formed solid-steel clasp, gusseted side plates and a secondary pin hole · 5/8 in or 1 in holes on 3 × 3 in uprights. Independent reconstruction; Irwin Fitness trademarks belong to Irwin Fitness.',
  params: [
    { key: 'pin', label: 'Pin', default: 1, options: [0, 1], format: v => ['5/8 in holes', '1 in holes'][v] ?? String(v) },
    { key: 'roller', label: 'Roller', default: 0, options: [0, 1, 2, 3], format: v => IRWIN_ROLLERS[v] ?? String(v) },
    { key: 'color', label: 'Colour', default: 0, options: IRWIN_COLORS.map((_, i) => i), format: v => IRWIN_COLORS[v]?.[0] ?? String(v) },
  ],
  vendor: {
    vendor: 'Irwin Fitness', url: 'https://irwinfitness.ca/products/ifs-roller-j-cups',
    credit: 'Irwin Fitness — Return Roller J-Cups 2.0 · Made in Canada', trademark: 'Irwin Fitness and IFS are trademarks of Irwin Fitness.',
    reconstruction: 'Published roller options (machined acetal or hardened 2 in steel, center-return or flat), formed clasp, secondary 5/8 in or 1 in pin hole and 3 × 3 in fit. Dimensions estimated from Irwin renders and an owner photo; physical fit unverified.',
  },
  mount: { pin: p => p.pin ? PIN_1IN : PIN_5_8IN, extent: extentOf(rollerLayout(IRWIN_CUP, 0)), faces: ['front', 'back'], validate: (_r, p) => faceFits(p, inch(3), 'Irwin Roller J-Cup') },
  bodies: p => cupBodies(p, rollerLayout(IRWIN_CUP, 0)),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Irwin Return Roller J-Cups', slots: p => cupSlot(p, rollerLayout(IRWIN_CUP, p.roller === 0 || p.roller === 2 ? IRWIN_DIP : 0)) },
  placement: { height: 1215, face: 'front' },
  autoFit: rack => ({ pin: pinFit(rack) }),
  family: 'j-hooks',
});
export const TITAN_ROLLER_J_HOOKS = defineRackPart({
  id: 'titan-x3-roller-j-hooks', name: 'Titan Roller J-Hook', title: 'Titan X-3 Series Quick Release Roller J-Hooks', noun: 'j-hook', section: 'J-cups & safeties',
  description: 'Roller J-hooks with a 1.5 × 3 in self-centering nylon roller, nylon-lined back plate and lip, and a 16 mm quick-release locking pop-pin behind the upright · 9.5 in tall, 10 in deep · X-3 (3 × 3 in) or T-3 (2 × 3 in). Independent reconstruction; Titan Fitness trademarks belong to Titan Fitness.',
  params: [{ key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => TITAN_SERIES[v]?.name ?? String(v) }],
  vendor: {
    vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/x-3-series-quick-release-roller-j-hooks',
    credit: 'Titan Fitness — X-3 / T-3 Series Quick Release Roller J-Hooks (401952 / 401951)', trademark: 'Titan Fitness, X-3 and T-3 are trademarks of Titan Fitness.',
    reconstruction: 'Published 9.5 in height, 10 in overall depth, 1.5 × 3 in roller pad, 5/8 in locking pin, 16 mm pop-pin and 1,000 lb pair rating. Plate thicknesses, gusset and clasp estimated from Titan product photos; physical fit unverified.',
  },
  mount: { pin: PIN_5_8IN, extent: extentOf(rollerLayout(TITAN_CUP, 0)), faces: ['front', 'back'], validate: (_r, p) => faceFits(p, TITAN_SERIES[p.series ?? 0]?.face ?? inch(3), 'Titan Roller J-Hook') },
  bodies: p => cupBodies(p, rollerLayout(TITAN_CUP, 0)),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Titan Roller J-Hooks', slots: p => cupSlot(p, rollerLayout(TITAN_CUP, TITAN_DIP)) },
  placement: { height: 1215, face: 'front' },
  autoFit: rack => ({ series: (rack.tube < 60 ? 1 : 0) }),
  family: 'j-hooks',
});
export const CUP_PARTS = [GHOST_ROLLER_J_CUP, REP_FLAT_SANDWICH_J_CUPS, ROGUE_MONSTER_LITE_J_CUPS, ROGUE_MONSTER_SANDWICH_J_CUP, BOS_ROLLER_J_CUPS, IRWIN_RETURN_ROLLER_J_CUPS, TITAN_ROLLER_J_HOOKS] as const satisfies readonly RackPart[];
