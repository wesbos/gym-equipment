/** Brand spotter arms (#133): Rogue SAML-24 and Monster 2.0, REP, Surplus Strength Stealth Spotters and Oak Club Alpha.
 * Metadata only (main bundle): no Manifold imports. Research: research/rack-jcups-safeties.md. All arms project along +Y
 * from the mounting face; z is relative to the mounting pin axis (the target hole). Numbers are shared with the builder. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const faceWidth = (p: NumericParams) => p.uprightWidth ?? p.upright ?? 75;
const BAR_R = 14.25;
/** Common spotter-arm envelope: arm box and the catch surface the bar lands on. */
export interface ArmSpec {
  /** Arm tube width (X) and height (Z), top of the arm (pin-relative), and reach from the mounting face to the lip front. */
  w: number; h: number; top: number; reach: number;
  /** Catch surface (UHMW or bare steel) thickness on top, lip rise above it, lowest and highest points of the end hardware. */
  strip: number; lip: number; low: number; high: number;
  /** Flat catch starts this far out from the face. */ flatFrom: number;
}
export const armCatchZ = (a: ArmSpec) => a.top + a.strip;
function armBodies(p: NumericParams, a: ArmSpec): LocalBox[] {
  const f = face(p);
  return [
    { min: [-a.w / 2, f + a.flatFrom, a.top - a.h], max: [a.w / 2, f + a.reach, armCatchZ(a)] },
    { min: [-a.w / 2, f + 1, a.low], max: [a.w / 2, f + a.flatFrom, a.high] },
  ];
}
const armSlots = (p: NumericParams, a: ArmSpec) => [{ point: [0, face(p) + a.flatFrom + (a.reach - a.flatFrom) * .55, armCatchZ(a) + BAR_R] as Vec3, axis: [1, 0, 0] as Vec3 }];
const armExtent = (a: ArmSpec) => ({ below: -a.low + 1, above: a.high + 1 });
function fits3in(p: NumericParams, name: string) {
  const w = faceWidth(p);
  if (Math.abs(w - inch(3)) > 2.5) throw Error(`${name} fit a 3 in upright face, not ${(w / 25.4).toFixed(2)} in.`);
}

// ─── Rogue SAML-24 Monster Lite Safety Spotter Arms ────────────────────────────────────────────────────────────
/** Published: 3x3 in 11-gauge tube, 24.625 in long, UHMW insert on top, welded end plate, 5/8 in pins, 44 lb pair. */
export const SAML: ArmSpec & Record<string, number> = { w: inch(3), h: inch(3), top: -30, reach: inch(24.625), strip: inch(1 / 4), lip: 30, low: -236, high: 40, flatFrom: 40,
  wall: 3.05, plate: inch(3 / 8), claspBack: 66, gussetOut: 300, holes: 10, holeD: 12.7 };
export const ROGUE_SAML_24_SPOTTER_ARMS = defineRackPart({
  id: 'rogue-saml-24-spotter-arms', name: 'Rogue SAML-24 Spotter Arm', title: 'Rogue SAML-24 Monster Lite Spotter Arms', noun: 'spotter arm', section: 'J-cups & safeties',
  description: '24 in Monster Lite safety spotter arms: 3 × 3 in 11-gauge tube with a UHMW top insert, welded end plate, clasp, gusset and hitch pin · 24.625 in long · 5/8 in pins. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/saml-24-monster-lite-spotter-arms-pair',
    credit: 'Rogue Fitness — SAML-24 Monster Lite Spotter Arms · Made in USA', trademark: 'Rogue and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 3 × 3 in 11-gauge tube, 24.625 in length, UHMW top insert, welded end plates and 5/8 in pins. End-plate height, clasp, gusset outline, hole pattern and hitch-pin position estimated from Rogue product photos; physical fit unverified.',
  },
  mount: { pin: PIN_5_8IN, extent: armExtent(SAML), validate: (_r, p) => fits3in(p, 'SAML-24 spotter arms') },
  bodies: p => armBodies(p, SAML),
  pair: { default: true },
  cradles: { kind: 'working', label: 'SAML-24 Spotter Arms', slots: p => armSlots(p, SAML) },
  placement: { height: 815, face: 'front' },
  family: 'spotter-arm',
});

// ─── Rogue Monster Safety Spotter Arms 2.0 ─────────────────────────────────────────────────────────────────────
/** Published: 24 in from the upright, 19 in flat portion, 3x3 in 11-gauge tube, 0.375 in laser clasp, extended
 * 0.1875 in gusset, angled Face Saver UHMW, 2 in hole spacing, two 1 in detent pins, 54 lb pair. */
export const MONSTER_SPOTTER: ArmSpec & Record<string, number> = { w: inch(3), h: inch(3), top: -40, reach: inch(24), strip: inch(1 / 4), lip: 30, low: -232, high: 62, flatFrom: inch(24) - inch(19),
  wall: 3.05, plate: inch(3 / 8), gusset: inch(3 / 16), claspTop: 60, claspBottom: -150, claspBack: 70, gussetOut: 430, holes: 10, holeD: inch(1) };
export const ROGUE_MONSTER_SPOTTER_ARMS_2 = defineRackPart({
  id: 'rogue-monster-spotter-arms-2', name: 'Rogue Monster Spotter Arm 2.0', title: 'Rogue Monster Safety Spotter Arms 2.0', noun: 'spotter arm', section: 'J-cups & safeties',
  description: 'Monster safety spotter arms 2.0: 3 × 3 in 11-gauge arm with numbered 1 in holes on 2 in centres, 0.375 in laser-cut clasp, extended gusset, Face Saver UHMW and 1 in detent pins · 24 in from the upright, 19 in flat. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/monster-safety-spotter-arms-2-0',
    credit: 'Rogue Fitness — Monster Safety Spotter Arms 2.0 · Made in USA', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 24 in depth from the upright, 19 in flat portion, 3 × 3 in 11-gauge tube, 0.375 in clasp, 0.1875 in gusset, 2 in hole centres and 1 in detent pins. Clasp height, gusset outline and pin positions estimated from Rogue product photos; physical fit unverified.',
  },
  mount: { pin: PIN_1IN, extent: armExtent(MONSTER_SPOTTER), validate: (_r, p) => fits3in(p, 'Monster spotter arms') },
  bodies: p => armBodies(p, MONSTER_SPOTTER),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Monster Spotter Arms 2.0', slots: p => armSlots(p, MONSTER_SPOTTER) },
  placement: { height: 815, face: 'front' },
  family: 'spotter-arm',
});

// ─── REP Fitness Spotter Arms ──────────────────────────────────────────────────────────────────────────────────
/** Published: 27.6 in long, 23.4 in landing zone, 11.3 in tall, 3 mm main tube, 2 mm support tube, 5 mm gusset, 1 in
 * holes, polyurethane upright protection, steel lip, 18.7/19.8 lb each (5000/4000). */
export const REP_SPOTTER: ArmSpec & Record<string, number> = { w: inch(2), h: inch(3), top: inch(1.5), reach: inch(27.6) - 95, strip: 0, lip: 28, low: inch(1.5) + 55 - inch(11.3), high: inch(1.5) + 55, flatFrom: inch(27.6) - 95 - inch(23.4),
  wall: 3, plate: inch(3 / 8), pad: 3, claspBack: 66, strut: 38, strutH: 25, holes: 10, holeD: inch(1) };
export const REP_SPOTTER_SERIES = ['4000 Series · 5/8 in pin', '5000 Series · 1 in pin'] as const;
export const REP_SPOTTER_ARMS = defineRackPart({
  id: 'rep-spotter-arms', name: 'REP Spotter Arm', title: 'REP Fitness Spotter Arms', noun: 'spotter arm', section: 'J-cups & safeties',
  description: 'Pin-in spotter arms with numbered 1 in holes, a steel lip, a welded support strut and gusset, and polyurethane pads on the upright clasps · 27.6 in long, 23.4 in landing zone, 11.3 in tall · 4000 or 5000 Series. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => REP_SPOTTER_SERIES[v] ?? String(v) }],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/spotter-arms',
    credit: 'REP Fitness — Spotter Arms (PRA-4130 / PRA-5132)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 27.6 in length, 23.4 in landing zone, 11.3 in height, 3 mm main tube, 2 mm support tube, 5 mm gusset and 1 in holes. Tube section, clasp shapes and strut angle estimated from REP product photos; physical fit unverified.',
  },
  mount: { pin: p => p.series ? PIN_1IN : PIN_5_8IN, extent: armExtent(REP_SPOTTER), validate: (_r, p) => fits3in(p, 'REP spotter arms') },
  bodies: p => armBodies(p, REP_SPOTTER),
  pair: { default: true },
  cradles: { kind: 'working', label: 'REP Spotter Arms', slots: p => armSlots(p, REP_SPOTTER) },
  placement: { height: 815, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter >= PIN_1IN ? 1 : 0 }),
  family: 'spotter-arm',
});

// ─── Surplus Strength Stealth Spotters ─────────────────────────────────────────────────────────────────────────
/** Published: 27 3/16 in total length (fits a 24 in deep rack), 20 in+ flat catch, 13 3/4 in usable bottom space,
 * 7 in total height (covers 3 holes), 1 in welded stainless pin, UHMW, 3x3 in racks with 1 in holes on 2 in spacing. */
export const STEALTH: ArmSpec & Record<string, number> = { w: inch(3), h: inch(3), top: 25 - inch(7) + inch(3), reach: inch(27 + 3 / 16) - inch(3.25), strip: inch(3 / 8), lip: 24, low: 25 - inch(7), high: 25, flatFrom: 95,
  side: inch(1 / 4), claspBack: inch(3.25), plate: inch(3 / 8), holes: 10, holeD: inch(1) };
export const STEALTH_COLORS = [['Textured Black', '#1f2022'], ['Textured Red', '#9a1c1f']] as const;
export const SURPLUS_STEALTH_SPOTTERS = defineRackPart({
  id: 'surplus-strength-stealth-spotters', name: 'Stealth Spotter', title: 'Surplus Strength Stealth Spotters', noun: 'spotter arm', section: 'J-cups & safeties',
  description: 'Compact spotter arms with a side-mount channel and fixed 1 in stainless pin that covers only three holes, a 20 in+ UHMW-protected flat catch and numbered 1 in holes · 27 3/16 in overall, 7 in tall. Independent reconstruction; Surplus Strength trademarks belong to Surplus Strength.',
  params: [{ key: 'color', label: 'Colour', default: 0, options: [0, 1], format: v => STEALTH_COLORS[v]?.[0] ?? String(v) }],
  vendor: {
    vendor: 'Surplus Strength', url: 'https://surplusstrength.com/products/stealth-spotters',
    credit: 'Surplus Strength — Stealth Spotters · Made in Tennessee, USA', trademark: 'Surplus Strength and Stealth Spotters are trademarks of Surplus Strength.',
    reconstruction: 'Published 27 3/16 in total length, 20 in+ flat catch, 7 in height, 1 in welded stainless pin, UHMW top and 1 in / 2 in hole fit. Channel depth, side-plate thickness, rise curve and hole positions estimated from Surplus Strength photos and renders; physical fit unverified.',
  },
  mount: { pin: PIN_1IN, extent: armExtent(STEALTH), validate: (_r, p) => fits3in(p, 'Stealth Spotters') },
  bodies: p => armBodies(p, STEALTH),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Stealth Spotters', slots: p => armSlots(p, STEALTH) },
  placement: { height: 815, face: 'front' },
  family: 'spotter-arm',
});

// ─── Oak Club Mfg Alpha Spotter Arms ───────────────────────────────────────────────────────────────────────────
/** Published: 3/16 in and 1/4 in welded steel, low-profile double-sided design with 3/8 in UHMW on both sides, MagPin
 * (sold separately), 41 lb pair. Length, section and collar size estimated from Oak Club photos. */
export const ALPHA: ArmSpec & Record<string, number> = { w: 63.5, h: inch(3), top: inch(1.5), reach: 610, strip: inch(3 / 8), lip: 0, low: -76, high: 76, flatFrom: 150,
  side: inch(3 / 16), collarT: inch(1 / 4), collarH: 100, flare: 75 };
export const ALPHA_ACCENTS = [['Black accent', '#1c1d1f'], ['Bronze accent', '#a07a4a'], ['Silver accent', '#c0c3c6']] as const;
export const OAK_CLUB_ALPHA_SPOTTER_ARMS = defineRackPart({
  id: 'oak-club-alpha-spotter-arms', name: 'Oak Club Alpha Spotter Arm', title: 'Oak Club Mfg Alpha Spotter Arms', noun: 'spotter arm', section: 'J-cups & safeties',
  description: 'Low-profile, double-sided spotter arms of welded 3/16 in and 1/4 in plate with club and ring cut-outs, 3/8 in UHMW on both faces and a wrap-around collar locked by a MagPin through the side holes. Independent reconstruction; Oak Club Mfg trademarks belong to Oak Club Mfg.',
  params: [
    { key: 'pin', label: 'MagPin', default: 1, options: [0, 1], format: v => ['5/8 in MagPin', '1 in MagPin'][v] ?? String(v) },
    { key: 'accent', label: 'Accent', default: 0, options: [0, 1, 2], format: v => ALPHA_ACCENTS[v]?.[0] ?? String(v) },
  ],
  vendor: {
    vendor: 'Oak Club Mfg', url: 'https://oakclubmfg.com/collections/rackattachments/products/alpha',
    credit: 'Oak Club Mfg — Alpha Spotter Arms (AA-1)', trademark: 'Oak Club and Alpha are trademarks of Oak Club Mfg.',
    reconstruction: 'Published 3/16 in and 1/4 in steel, double-sided design with 3/8 in UHMW on both sides and MagPin locking. Length, section, collar and cut-out pattern estimated from Oak Club product photos; physical fit unverified.',
  },
  mount: { pin: p => p.pin ? PIN_1IN : PIN_5_8IN, pinAxis: 'across', extent: armExtent(ALPHA), validate: (_r, p) => fits3in(p, 'Alpha spotter arms') },
  bodies: p => armBodies(p, ALPHA),
  pair: { default: true },
  cradles: { kind: 'working', label: 'Alpha Spotter Arms', slots: p => armSlots(p, ALPHA) },
  placement: { height: 815, face: 'front' },
  autoFit: rack => ({ pin: rack.holeDiameter >= PIN_1IN ? 1 : 0 }),
  family: 'spotter-arm',
});
export const SPOTTER_PARTS = [ROGUE_SAML_24_SPOTTER_ARMS, ROGUE_MONSTER_SPOTTER_ARMS_2, REP_SPOTTER_ARMS, SURPLUS_STEALTH_SPOTTERS, OAK_CLUB_ALPHA_SPOTTER_ARMS] as const satisfies readonly RackPart[];
