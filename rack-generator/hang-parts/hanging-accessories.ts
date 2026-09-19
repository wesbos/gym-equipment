/** Bands, rings, suspension trainers, collars and other pegboard accessories. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; hang-registry.ts already spreads it.
 * Sources, published dimensions and estimates: rack-generator/research/hanging-accessories.md. */
import { defineHangPart, type HangPart } from '../hang-part.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';
const SECTION = 'Hanging accessories' as const;
/** The peg's upturned tip rises 26 mm above the anchor (same as every hang part). */
const above = 26;
const credit = (vendor: string, url: string, product: string, trademark: string, published: string, estimated = 'Secondary dimensions estimated from product photos'): VendorAttribution => ({
  vendor, url, credit: `${vendor} — ${product}`, trademark,
  reconstruction: `Independent Manifold reconstruction. Published: ${published}. ${estimated}; scenery only, excluded from print export.`,
});
const ROGUE_TM = 'Rogue and ROGUE are trademarks of Rogue Fitness.';
const rogue = (handle: string, product: string, published: string, estimated?: string) => credit('Rogue Fitness', `https://www.roguefitness.com/${handle}`, product, ROGUE_TM, published, estimated);
const ending = (brand: string) => `Independent reconstruction for layout; ${brand} trademarks belong to ${brand}.`;
type Spec = Parameters<typeof defineHangPart>[0];
const part = <const Id extends string>(spec: Omit<Spec, 'section'> & { id: Id }) => defineHangPart({ ...spec, section: SECTION });

// ————— Rogue Monster Bands: one entry per strength (hang parts carry no params, so each band is its own entry) —————
/** Rogue Monster Band lineup (roguefitness.com/rogue-monster-bands, resistance breakdown table): 41″ loops of natural latex. */
export const MONSTER_BANDS = [
  { n: 0, name: 'Micro', colour: 'orange', hex: '#e79a63', width: .25, thick: .18, lb: 9, print: '#3a2518' },
  { n: 1, name: 'Mini', colour: 'red', hex: '#d63a55', width: .5, thick: .18, lb: 18, print: '#2a1418' },
  { n: 2, name: 'Mini', colour: 'blue', hex: '#2f7fc1', width: .5, thick: .25, lb: 30, print: '#e8eef4' },
  { n: 3, name: 'Light', colour: 'green', hex: '#3fb24c', width: 1.13, thick: .18, lb: 40, print: '#17371a' },
  { n: 4, name: 'Average', colour: 'black', hex: '#1d1e20', width: 1.75, thick: .18, lb: 65, print: '#e9e9e6' },
  { n: 5, name: 'Strong', colour: 'purple', hex: '#8e6cc9', width: 2.5, thick: .18, lb: 95, print: '#1f1a2a' },
  { n: 6, name: 'Strong', colour: 'red', hex: '#d3304a', width: 3.25, thick: .18, lb: 115, print: '#1f1416' },
  { n: 7, name: 'Super', colour: 'silver', hex: '#cbc6bb', width: 4, thick: .25, lb: 225, print: '#1a1a1a' },
] as const;
/** Envelopes measured from the builds (the family test checks they stay tight). */
const BAND_ENVELOPE = [{ width: 35, drop: 1036 }, { width: 37, drop: 1035 }, { width: 41, drop: 1037 }, { width: 43, drop: 1033 }, { width: 48, drop: 1032 }, { width: 55, drop: 1030 }, { width: 62, drop: 1028 }, { width: 72, drop: 1028 }];
const bandId = <N extends number>(n: N) => `rogue-monster-band-${n}` as const;
function monsterBand<const N extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(n: N) {
  const b = MONSTER_BANDS[n], label = `#${n} ${b.colour}`;
  return part({ id: bandId(n), name: `Monster Band ${label}`, title: `Rogue Monster Band ${label} (${b.lb} lb)`, noun: 'band',
    description: `Rogue Monster Band ${b.name} #${n}: ${b.colour} natural-latex 41″ loop, ${b.width}″ wide × ${b.thick}″ thick, ${b.lb} lb at 100% stretch, draped over the hook with ${b.width >= 1.75 ? 'the big ROGUE print' : 'the Rogue Fitness print'} on one strand. ${ending('Rogue Fitness')}`,
    envelope: { ...BAND_ENVELOPE[n], above },
    vendor: rogue('rogue-monster-bands', `Rogue Monster Bands — #${n} ${b.colour} (${b.name})`, `41″ × ${b.width}″ × ${b.thick}″, ${b.lb} lb resistance, natural latex, ${b.colour}`, 'Hanging drape (bottom bend radius) estimated from product photos; print modelled as a flat plate') });
}
export const MONSTER_BAND_0 = monsterBand(0), MONSTER_BAND_1 = monsterBand(1), MONSTER_BAND_2 = monsterBand(2), MONSTER_BAND_3 = monsterBand(3);
export const MONSTER_BAND_4 = monsterBand(4), MONSTER_BAND_5 = monsterBand(5), MONSTER_BAND_6 = monsterBand(6), MONSTER_BAND_7 = monsterBand(7);

/** elitefts Pro Resistance Band Pack: 4 matched pairs, 41″ × 4.5 mm layered latex. Widths from the pack listing. */
export const ELITEFTS_PACK = [
  { name: 'Pro Mini', hex: '#d8344f', width: .5 }, { name: 'Pro Light', hex: '#ef8a2c', width: 1.25 },
  { name: 'Pro Average', hex: '#b9bbbd', width: 1.75 }, { name: 'Pro Strong', hex: '#1f5fae', width: 2.5 },
] as const;
export const ELITEFTS_BAND_PACK = part({ id: 'elitefts-pro-resistance-band-pack', name: 'Pro band pack', title: 'elitefts Pro Resistance Band Pack', noun: 'band pack',
  description: `elitefts Pro Resistance Band Pack: eight 41″ layered-latex loops — two each of red Mini (0.5″), orange Light (1.25″), grey Average (1.75″) and blue Strong (2.5″) — bunched on one hook with white elitefts prints. ${ending('elitefts')}`,
  envelope: { width: 105, above: 42, drop: 1016 },
  vendor: credit('elitefts', 'https://www.elitefts.com/products/eliteftstm-pro-resistance-band-pack', 'elitefts Pro Resistance Band Pack (4 pairs)', 'elitefts is a trademark of elitefts.', '8 bands: 2 × Mini 0.5″ (red), 2 × Light 1.25″ (orange), 2 × Average 1.75″ (grey), 2 × Strong 2.5″ (blue); 41″ length, 4.5 mm thick', 'Nesting on the hook (outer loops drawn around the inner ones) and bottom bend estimated from product photos') });

// ————— Grip —————
export const FAT_GRIPZ = part({ id: 'fat-gripz', name: 'Fat Gripz', title: 'Fat Gripz Pro (blue)', noun: 'Fat Gripz',
  description: `Fat Gripz Pro in blue (sold in pairs; one shown slid onto the hook): 2.25″ OD × 4.75″ soft rubber sleeve with a 1.1″ bore, the squeeze-on slot along one side, diamond texture and the flat Fat Gripz label panel. ${ending('Fat Gripz')}`,
  envelope: { width: 60, above: 43, drop: 40 },
  vendor: credit('Fat Gripz', 'https://www.fatgripz.com/products/fat-gripz-original-1', 'Fat Gripz Pro (2.25″, blue/black)', 'Fat Gripz is a trademark of Fat Gripz Enterprises.', '2.25″ (5.7 cm) outside diameter, 1.1″ (2.7 cm) inside diameter, 4.75″ (12 cm) length, sold as a pair', 'Slot width, label panel and the resting tilt on the peg estimated from product photos') });
export const FAT_GRIPZ_EXTREME = part({ id: 'fat-gripz-extreme', name: 'Fat Gripz Extreme', title: 'Fat Gripz Extreme (orange)', noun: 'Fat Gripz',
  description: `Fat Gripz Extreme (sold in pairs; one shown slid onto the hook): 2.75″ OD × 4.75″ orange rubber sleeve with a 1.1″ bore, squeeze-on slot, diamond texture and the flat Fat Gripz label panel. ${ending('Fat Gripz')}`,
  envelope: { width: 73, above: 50, drop: 46 },
  vendor: credit('Fat Gripz', 'https://www.fatgripz.com/products/fat-gripz-extreme', 'Fat Gripz Extreme (2.75″, orange)', 'Fat Gripz is a trademark of Fat Gripz Enterprises.', '2.75″ (7 cm) outside diameter, 1.1″ (2.7 cm) inside diameter, 4.75″ (12 cm) length, sold as a pair', 'Slot width, label panel and the resting tilt on the peg estimated from product photos') });
export const CAPTAINS_OF_CRUSH = part({ id: 'ironmind-captains-of-crush-no-1', name: 'Captains of Crush No. 1', title: 'IronMind Captains of Crush No. 1 gripper', noun: 'gripper',
  description: `IronMind Captains of Crush No. 1 hand gripper (c. 140 lb), hung by its GR8 spring coil: knurled aircraft-grade aluminium handles with a smooth band near the top and a natural-finish steel coil. ${ending('IronMind')}`,
  envelope: { width: 118, above, drop: 132 },
  vendor: credit('IronMind', 'https://www.ironmind.com/product-info/ironmind-grippers/captains-of-crush-grippers/', 'Captains of Crush No. 1 Gripper (No. 1251, c. 140 lb)', 'Captains of Crush, CoC and IronMind are trademarks of IronMind Enterprises, Inc.', 'c. 140 lb closing strength, knurled aircraft-grade aluminium handles, GR8 steel spring', 'IronMind publishes no dimensions: handle 1″ × 3.9″, 6.2 mm wire, 2.5-turn coil and handle spread estimated from product photos') });

// ————— Barbell collars (a pair on one hook, bores over the peg) —————
export const KEPPI_OPENCOLLAR = part({ id: 'keppi-opencollar', name: 'OPENCOLLAR clips (pair)', title: 'Keppi OPENCOLLAR barbell clips (pair)', noun: 'collars',
  description: `KeppiFitness OPENCOLLAR (silver/black), a pair on one hook: C-shaped 2″ clamps opening downward, black non-slip rubber body under a brushed aluminium cover and the flip lever with its loop on top. ${ending('KeppiFitness')}`,
  envelope: { width: 98, above: 38, drop: 62 },
  vendor: credit('KeppiFitness', 'https://keppifitness.com/products/keppifitness-barbell-clips', 'Fitness Barbell Clips OPENCOLLAR (Silver/Black)', 'Keppi and OPENCOLLAR are trademarks of KeppiFitness.', 'fits 2″ Olympic sleeves, C-shaped with double lever lock, aluminium alloy cover, rubber body, built-in magnet', 'Outer diameter (≈ 96 mm), width (≈ 44 mm) and C opening estimated from product photos against the 2″ bore') });
export const ROGUE_USA_COLLARS = part({ id: 'rogue-usa-aluminum-collars', name: 'USA Aluminum Collars (pair)', title: 'Rogue USA Aluminum Collars (pair)', noun: 'collars',
  description: `Rogue USA Aluminum Collars, a pair on one hook: 1.5″ wide clear-anodised 6061 billet clamps with faceted flats, hinge knuckles, rubber lining and the black nylon lock-open lever with its white Rogue logo. ${ending('Rogue Fitness')}`,
  envelope: { width: 81, above: 34, drop: 61 },
  vendor: rogue('rogue-usa-aluminum-collars', 'Rogue USA Aluminum Collars (AD0126, silver)', '1.5″ width, 0.25 lb each, 6061 billet aluminium, clear hard anodised, rubberised lining, black nylon lever with white Rogue logo', 'Outer diameter (≈ 76 mm), facets and lever length estimated from product photos') });
export const TITAN_TWISTLOCK_PRO = part({ id: 'titan-twistlock-pro-collars', name: 'TwistLock Pro collars (pair)', title: 'Titan TwistLock Pro barbell collars (pair, black)', noun: 'collars',
  description: `Titan TwistLock Pro barbell collars in black, a pair on one hook: 3.675″ × 1.5″ aluminium rings with a volcano-knurled rim, polished face with the TITAN wordmark and helmet badge, and the black twist-lock insert. ${ending('Titan Fitness')}`,
  envelope: { width: 95, above, drop: 71 },
  vendor: credit('Titan Fitness', 'https://www.titan.fitness/products/twistlock-pro-barbell-collars', 'TwistLock® Pro Barbell Collars (black)', 'Titan, Titan Fitness and TwistLock are trademarks of Titan Fitness.', '3.675″ outer diameter, 1.5″ width, 49.5–51.5 mm bore, 1.42 lb per pair, medium volcano knurling, magnets', 'Face/rim split and insert depth estimated from product photos') });
export const ROGUE_HG_COLLARS = part({ id: 'rogue-hg-2-collars', name: 'HG 2.0 collars (pair)', title: 'Rogue HG 2.0 collars (pair)', noun: 'collars',
  description: `Rogue HG 2.0 collars, a pair on one hook: 1.875″ wide black nylon-resin bodies with chamfered corners, the red spring tab, stainless hardware, ribbed rubber pads and the white ROGUE HG badge. ${ending('Rogue Fitness')}`,
  envelope: { width: 90, above: 35, drop: 66 },
  vendor: rogue('rogue-hg-2-0-collars', 'Rogue HG 2.0 Collars (AD0114, black)', '1.875″ width, 0.85 lb per pair, solid nylon resin, red tab, stainless hardware, rubber padding, fits 2″ sleeves', 'Body outline (≈ 86 mm across), hinge and tab sizes estimated from product photos') });
export const BOS_MAGNETIC_COLLARS = part({ id: 'bells-of-steel-magnetic-clamp-collars', name: 'Magnetic clamp collars (pair)', title: 'Bells of Steel magnetic clamp collars (pair, black)', noun: 'collars',
  description: `Bells of Steel Magnetic Clamp Collars in black, a pair on one hook: slim 1″ × 3″ octagonal clamps with the lever folded flat along one flat, four face magnets, a lattice-rubber lining and the white BELLS OF STEEL print. ${ending('Bells of Steel')}`,
  envelope: { width: 91, above, drop: 62 },
  vendor: credit('Bells of Steel', 'https://bellsofsteel.com/products/magnetic-clamp-collars', 'Magnetic Clamp Collars (black)', 'Bells of Steel is a trademark of Bells of Steel.', '1″ (25 mm) width, 3″ (76.2 mm) outer diameter, fits 2″ / 50 mm sleeves, built-in magnets, rubberised interior', 'Lever and magnet sizes estimated from product photos') });

// ————— Loading pins —————
export const FRINGE_MAGPIN = part({ id: 'fringe-sport-magpin', name: 'Magpin', title: 'Fringe Sport Magpin (1″, black)', noun: 'magpin',
  description: `Fringe Sport Magpin, 1″ size in black, hung by its lynch-pin ring: 24.5 mm × 5.5″ stainless pin with a drilled nose and a 2″ × ¾″ knurled anodised magnetic cap with the white Fringe Sport print. ${ending('Fringe Sport')}`,
  envelope: { width: 52, above, drop: 164 },
  vendor: credit('Fringe Sport', 'https://www.fringesport.com/products/magpin-magnetic-hitch-gym-pin-for-squat-racks', 'Magpins: Magnetic Hitch Pins (1″, black)', 'Fringe Sport is a trademark of Fringe Sport.', '24.5 mm pin diameter, 5.5″ pin length, 2″ cap diameter, ¾″ cap thickness, stainless pin, knurled anodised aluminium cap, lock pin included', 'Lynch-pin ring size and nose-hole position estimated from product photos') });
export const OAK_CLUB_MAGPIN_3 = part({ id: 'oak-club-magpin-3', name: 'MagPin 3 (pair)', title: 'Oak Club MagPin 3 (pair)', noun: 'magpins',
  description: `Oak Club Mfg MagPin 3, the pair clinging by their magnet faces to either side of the hook: two-tone knurled aluminium heads with the club mark and 1″ stainless shafts with bullet noses and 4-1/2″ of usable length. ${ending('Oak Club Mfg')}`,
  envelope: { width: 249, above, drop: 42 },
  vendor: credit('Oak Club Mfg', 'https://oakclubmfg.com/products/magpin-3', 'MagPin 3 (pair)', 'Oak Club and MagPin are trademarks of Oak Club Mfg.', '4-1/2″ usable shaft length, two-tone aluminium head, concealed magnet, stainless shaft, sold in pairs', 'Head diameter (≈ 1.75″), head thickness and 1″ shaft size estimated from product photos') });

// ————— Suspension and gymnastics —————
export const TRX_HOME2 = part({ id: 'trx-home2-suspension-trainer', name: 'TRX HOME2', title: 'TRX HOME2 suspension trainer', noun: 'suspension trainer',
  description: `TRX HOME2 Suspension Trainer stowed on one hook: black locking carabiner, black premium webbing with the grey centre stripe, cam buckles, yellow lower straps with TRX tabs, foam handles and foot cradles. ${ending('TRX')}`,
  envelope: { width: 319, above, drop: 920 },
  vendor: credit('TRX', 'https://www.trxtraining.com/products/home-gym', 'TRX® HOME2 System suspension trainer', 'TRX and Suspension Trainer are trademarks of Fitness Anywhere LLC.', 'carabiner for anchor, adjustable straps with premium webbing, comfortable foam handles, adjustable foot cradles (HOME2 labelled product diagram)', 'TRX publishes no strap dimensions: shortened length (≈ 36″), 1.5″ webbing, 5″ handles and buckle sizes estimated from product photos') });
export const REP_WOOD_RINGS = part({ id: 'rep-wood-gymnastic-rings', name: 'Wood gymnastic rings', title: 'REP competition wood gymnastic rings (1.25″)', noun: 'rings',
  description: `REP Competition Gymnastic Wood Rings (1.25″) on their 7′ numbered straps, both rings hung on one hook with each strap folded into a hank below its ring and the black screw-lock carabiner at the fold. ${ending('REP Fitness')}`,
  envelope: { width: 245, above: 36, drop: 607 },
  vendor: credit('REP Fitness', 'https://repfitness.com/products/competition-gymnastic-straps-and-wood-rings', 'Competition Gymnastic Straps and Wood Rings (1.25″ rings, 7′ straps)', 'REP is a trademark of REP Fitness.', '1.25″ ring grip, 7′ straps with 29 numbered 2.5″ sections, double-layer nylon webbing, screw-lock carabiner', 'Ring inner diameter (180 mm), strap width and hank folding estimated from product photos') });

// ————— Bench and hip aids —————
export const SLING_SHOT = part({ id: 'mark-bell-sling-shot-original', name: 'Original Sling Shot', title: 'Mark Bell Original Sling Shot (red, L)', noun: 'Sling Shot',
  description: `Mark Bell Sling Shot Original (level 3, red, size L), hung by one sleeve: two elastic sleeves joined by the sewn centre panel, with the white stitched seams and the white badge on each sleeve. ${ending('Sling Shot')}`,
  envelope: { width: 45, above, drop: 491 },
  vendor: credit('Sling Shot (Mark Bell)', 'https://markbellslingshot.com/products/original-sling-shot', 'Original Sling Shot® (red, L)', 'Sling Shot is a registered trademark of Mark Bell / Sling Shot.', 'level 3 material stiffness, red, sizes M–3XL by bodyweight (L 140–180 lb), patents 8,771,155 and 9,265,983', 'Sling Shot publishes no dimensions: 6.5″ sleeve width, 7″ flat sleeves and 5″ centre panel estimated from product photos') });
export const HIP_CIRCLE = part({ id: 'mark-bell-hip-circle', name: 'Hip Circle', title: 'Mark Bell Hip Circle (black, L)', noun: 'hip circle',
  description: `Mark Bell Hip Circle (moderate, black, size L): a woven fabric loop with grippy lining and the white badge, draped over one hook. ${ending('Sling Shot')}`,
  envelope: { width: 57, above, drop: 380 },
  vendor: credit('Sling Shot (Mark Bell)', 'https://markbellslingshot.com/products/hip-circle', 'Hip Circle® (black, L)', 'Hip Circle and Sling Shot are trademarks of Mark Bell / Sling Shot.', 'moderate resistance, black/blue/grey-black, sizes M/L/XL by bodyweight (L 151–260 lb)', 'Mark Bell publishes no dimensions: 3.25″ width and ≈ 15.5″ flat length estimated from product photos') });
export const SPUD_PILLOW_BELT = part({ id: 'spud-pillow-belt-squat-belt', name: 'Pillow belt squat belt', title: 'Spud Inc. Pillow Belt Squat Belt (L)', noun: 'belt',
  description: `Spud Inc. Pillow Belt Squat Belt (large), hung by both multi-loop straps and folded in half: 36″ × 6.5″ × 1.5″ black Kaiju pad with the charcoal webbing stripe and the yellow Spud Inc label at the fold. ${ending('Spud Inc.')}`,
  envelope: { width: 167, above, drop: 716 },
  vendor: credit('Spud Inc.', 'https://www.spud-inc-straps.com/products/the-pillow-belt-squat-belt', 'The Pillow Belt Squat Belt (large)', 'Spud Inc. is a trademark of Spud, Inc.', 'large pad 36″ × 6.5″ × 1.5″, 7 adjustment loops spaced 2″ apart, Kaiju material, made in USA', 'Strap length, loop sizes and folded drape estimated from product photos') });

// ————— Lifting gear —————
export const INZER_LEVER_BELT = part({ id: 'inzer-forever-lever-belt-10mm', name: 'Forever Lever Belt 10 mm', title: 'Inzer Forever Lever Belt 10 mm (black, L)', noun: 'belt',
  description: `Inzer Forever Lever Belt™ 10 mm in black suede (size L), buckled and hung over the hook: 4″ belt with four rows of white lock-stitching, the prong holes and the polished Lever Buckle on the side. ${ending('Inzer Advance Designs')}`,
  envelope: { width: 353, above, drop: 282 },
  vendor: credit('Inzer Advance Designs', 'https://www.inzernet.com/products/forever-lever-lifting-belt™-10mm', 'Forever Lever Belt™ 10MM (black, large)', 'Inzer, Forever Belt and Lever Belt are trademarks of Inzer Advance Designs.', '10 mm one-piece leather, 4 rows of lock-stitched nylon, suede finish, lever buckle, sizes XS–5XL (L 34–38″)', 'Belt width taken as the 4″ competition width; closed circumference (≈ 35″) and buckle size estimated from product photos') });
export const ROGUE_WRIST_WRAPS = part({ id: 'rogue-wrist-wraps-2', name: 'Wrist Wraps 2.0 (pair)', title: 'Rogue Wrist Wraps 2.0 (24″, black)', noun: 'wrist wraps',
  description: `Rogue Wrist Wraps 2.0, a 24″ black pair hung by their ⅝″ elastic thumb loops: 3″ elastic wraps with the grey Rogue embossment, hook-and-loop field and the reinforced closure tab. ${ending('Rogue Fitness')}`,
  envelope: { width: 122, above, drop: 665 },
  vendor: rogue('rogue-wrist-wraps-2-0', 'Rogue Wrist Wraps 2.0 (24″, black)', '24″ length (17″, 24″, 37.5″ offered), 3″ width, ⅝″ elastic thumb loop, reinforced hook-and-loop tab, reflective Rogue logo, sold in pairs', 'Thickness and hang spread estimated from product photos; wraps modelled flat-laid facing out') });
export const ROGUE_OHIO_STRAPS = part({ id: 'rogue-ohio-lifting-straps', name: 'Ohio lifting straps (pair)', title: 'Rogue Ohio Lifting Straps – Nylon (pair)', noun: 'lifting straps',
  description: `Rogue Ohio Lifting Straps in black nylon, a pair hung by their closed loops: 22.5″ × 1.5″ webbing with the red-and-white Rogue label. ${ending('Rogue Fitness')}`,
  envelope: { width: 96, above, drop: 567 },
  vendor: rogue('rogue-ohio-lifting-straps-nylon', 'Ohio Lifting Straps – Nylon (RA0719, black)', '22.5″ length, 1.5″ width, closed single-loop design, black nylon webbing, red and white Rogue label', 'Loop size and label size estimated from product photos; tails modelled flat-laid facing out') });
export const ROGUE_SR1 = part({ id: 'rogue-sr-1-speed-rope', name: 'SR-1 speed rope', title: 'Rogue SR-1 bearing speed rope (red)', noun: 'speed rope',
  description: `Rogue SR-1 Bearing Speed Rope with red 6.75″ glass-filled nylon handles and 10′ grey coated 3/32″ cable, coiled over the hook with both handles hanging below. ${ending('Rogue Fitness')}`,
  envelope: { width: 220, above, drop: 434 },
  vendor: rogue('rogue-sr-1-regular-handle-bearing-speed-rope-color-series', 'SR-1 Rogue Bearing Speed Rope (red handles, grey cable)', '6.75″ handle length, 0.5″–0.875″ handle taper, 120″ coated 3/32″ cable, 4 cartridge ball bearings', 'Coil diameter and handle cap details estimated from product photos') });

/** Highest-owned first (Gym Radar, Sep 2026); the lifting-gear entries have no Gym Radar count and follow. */
export const PARTS = [
  FAT_GRIPZ, MONSTER_BAND_0, MONSTER_BAND_1, MONSTER_BAND_2, MONSTER_BAND_3, MONSTER_BAND_4, MONSTER_BAND_5, MONSTER_BAND_6, MONSTER_BAND_7,
  FRINGE_MAGPIN, CAPTAINS_OF_CRUSH, KEPPI_OPENCOLLAR, ROGUE_USA_COLLARS, TRX_HOME2, TITAN_TWISTLOCK_PRO, ROGUE_HG_COLLARS, ELITEFTS_BAND_PACK,
  BOS_MAGNETIC_COLLARS, SLING_SHOT, SPUD_PILLOW_BELT, REP_WOOD_RINGS, OAK_CLUB_MAGPIN_3, FAT_GRIPZ_EXTREME, HIP_CIRCLE,
  INZER_LEVER_BELT, ROGUE_WRIST_WRAPS, ROGUE_OHIO_STRAPS, ROGUE_SR1,
] as const satisfies readonly HangPart[];
