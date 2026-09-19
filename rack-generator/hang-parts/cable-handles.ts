/** Rogue and staple cable handles, bars, straps and hardware. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; hang-registry.ts already spreads it.
 * Sources, published dimensions and estimates: rack-generator/research/cable-handles.md. */
import { defineHangPart, type HangPart } from '../hang-part.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';
const SECTION = 'Cable attachments' as const;
/** The peg's upturned tip rises 26 mm above the anchor (same as the REP set). */
const above = 26;
const credit = (vendor: string, url: string, product: string, trademark: string, published: string, estimated = 'Secondary dimensions estimated from product photos'): VendorAttribution => ({
  vendor, url, credit: `${vendor} — ${product}`, trademark,
  reconstruction: `Independent Manifold reconstruction. Published: ${published}. ${estimated}; scenery only, excluded from print export.`,
});
const rogue = (handle: string, product: string, published: string, estimated?: string) =>
  credit('Rogue Fitness', `https://www.roguefitness.com/${handle}`, product, 'Rogue and ROGUE are trademarks of Rogue Fitness.', published, estimated);
const ending = (brand: string) => `Independent reconstruction for layout; ${brand} trademarks belong to ${brand}.`;
type Spec = Parameters<typeof defineHangPart>[0];
const part = <const Id extends string>(spec: Omit<Spec, 'section'> & { id: Id }) => defineHangPart({ ...spec, section: SECTION });

export const ROGUE_V_GRIP = part({ id: 'rogue-rotating-v-grip', name: 'Rotating V-grip', title: 'Rogue rotating V-grip', noun: 'V-grip',
  description: `Rogue Rotating V-Grip: two 32 mm knurled aluminium H-5 handles at 90° on black steel side plates, bronze-bushed 360° swivel hub and a 3/8″ stainless clevis eye; 14.4″ × 5.8″. ${ending('Rogue Fitness')}`,
  envelope: { width: 370, above, drop: 145 },
  vendor: rogue('rogue-rotating-v-grip-cable-attachment', 'Rogue Rotating V-Grip Cable Attachment (RA3456, raw aluminium handles)', '14.4″ width, 5.8″ height, 5″ × 32 mm H-5 handles, 90° hub, 3/8″ stainless clevis plate, 1/4″ and 5/16″ steel side plates', 'Plate outlines, hub barrel and flanged rests estimated from product photos') });
export const ROGUE_SINGLE_HANDLE = part({ id: 'rogue-single-handle', name: 'Single handle', title: 'Rogue single handle', noun: 'handle',
  description: `Rogue Single Handle Cable Attachment: 5″ × 28.5 mm knurled aluminium handle spinning on shoulder bolts, 1.5″ black nylon webbing with sewn-in Rogue patch and a zinc-plated welded ring; 8.5″ ring to handle centre. ${ending('Rogue Fitness')}`,
  envelope: { width: 170, above, drop: 235 },
  vendor: rogue('single-handle-cable-attachment', 'Single Handle Cable Attachment (28.5 mm aluminium)', '8.5″ from top of ring to handle centre, 5″ handle, 28.5 mm diameter, 1.5″ webbing', 'Ring size, webbing path and bolt hardware estimated from product photos') });
export const ROGUE_LAT_BAR = part({ id: 'rogue-lat-bar', name: 'Rogue lat bar', title: 'Rogue lat bar', noun: 'lat bar',
  description: `Rogue Lat Bar in black E-coat: 48″ tip to tip, 1.125″ fully knurled bar bent 30° down at the ends, laser-cut swivel tab between two collars. ${ending('Rogue Fitness')}`,
  envelope: { width: 1220, above, drop: 210 },
  vendor: rogue('rogue-lat-bar', 'Rogue Lat Bar (RA1078, black E-coat)', '48″ width, 1.125″ diameter, fully knurled, laser-cut Rogue swivel tab', 'Bend position (61% of the half length), 30° rake and tab outline estimated from product photos') });
export const ROGUE_CURL_BAR = part({ id: 'rogue-curl-bar-cable-attachment', name: 'Curl bar cable attachment', title: 'Rogue curl bar cable attachment', noun: 'curl bar',
  description: `Rogue Curl Bar Cable Attachment in black E-coat: 35.5″ × 28.5 mm cambered bar with raised outer grips, knurled grip sections and a laser-cut swivel tab. ${ending('Rogue Fitness')}`,
  envelope: { width: 905, above, drop: 120 },
  vendor: rogue('rogue-curl-bar-cable-attachment', 'Rogue Curl Bar Cable Attachment (RA3255, black E-coat)', '35.5″ length, 28.5 mm diameter, fully knurled grips', 'Camber profile estimated from product photos') });
export const ROGUE_STRAIGHT_BAR_40 = part({ id: 'rogue-stainless-straight-lat-bar-40', name: '40″ stainless straight lat bar', title: 'Rogue 40″ stainless straight lat bar', noun: 'straight bar',
  description: `Rogue Stainless Straight Lat Bar, 40″ size: 28.5 mm fully knurled stainless bar with index rings and a laser-cut stainless swivel tab. ${ending('Rogue Fitness')}`,
  envelope: { width: 1020, above, drop: 90 },
  vendor: rogue('rogue-stainless-straight-lat-bar', 'Rogue Stainless Straight Lat Bar (RA2713, 40″)', '40″ length, 28.5 mm diameter, stainless, fully knurled', 'Knurl ring positions and tab outline estimated from product photos') });
export const ROGUE_STRAIGHT_BAR_20 = part({ id: 'rogue-stainless-straight-lat-bar-20', name: '20″ stainless straight lat bar', title: 'Rogue 20″ stainless straight lat bar', noun: 'straight bar',
  description: `Rogue Stainless Straight Lat Bar, 20″ size: 28.5 mm fully knurled stainless bar with a laser-cut stainless swivel tab. ${ending('Rogue Fitness')}`,
  envelope: { width: 512, above, drop: 90 },
  vendor: rogue('rogue-stainless-straight-lat-bar', 'Rogue Stainless Straight Lat Bar (RA2712, 20″)', '20″ length, 28.5 mm diameter, stainless, fully knurled', 'Knurl ring positions and tab outline estimated from product photos') });
export const ROGUE_ANKLE_CUFF = part({ id: 'rogue-ankle-cuff', name: 'Rogue ankle cuff', title: 'Rogue ankle cuff', noun: 'ankle cuff',
  description: `Rogue Ankle Cuff Cable Attachment (sold in pairs; one shown): 4″ wide black Cordura cuff with hook-and-loop closure, welded D-rings, heel strap and sewn-in Rogue and Made in USA tags. ${ending('Rogue Fitness')}`,
  envelope: { width: 115, above, drop: 200 },
  vendor: rogue('rogue-ankle-cuff-cable-attatchment-pair', 'Rogue Ankle Cuff Cable Attachment (RA2810)', '15″ × 4″ cuff, adjustable 9–14″ circumference, 4 welded ring attachment points', 'Closed diameter (≈ 12″ circumference), ring size and heel strap estimated from product photos') });
export const SPUD_LONG_AB_STRAP = part({ id: 'spud-long-ab-strap', name: 'Long ab strap', title: 'Spud Inc. long ab strap', noun: 'ab strap',
  description: `Spud Inc. Long Ab Strap: 32″ of 2″ black nylon webbing from a steel ring, splitting into two forearm loops, with the yellow Spud label. ${ending('Spud Inc.')}`,
  envelope: { width: 245, above, drop: 810 },
  vendor: credit('Spud Inc.', 'https://www.spud-inc-straps.com/products/long-abdominal-strap', 'Long Abdominal Strap (black)', 'Spud Inc. is a trademark of Spud, Inc.', '32″ × 2″ (Rogue lists 30″ × 2″)', 'Ring size, split point and loop shape estimated from product photos; webbing modelled flat-laid facing out') });
export const DAISY_CHAINS = part({ id: 'generic-daisy-chains', name: 'Daisy chains (pair)', title: 'Daisy chains (pair)', noun: 'daisy chains',
  description: `Generic nylon daisy chains, the popular Amazon 2-pack: 1.1 m × 20 mm red webbing with eight stitched pocket loops and black bar-tacks, both chains folded over one hook. Independent reconstruction of an unbranded product.`,
  envelope: { width: 145, above, drop: 565 },
  vendor: credit('Generic (Amazon)', 'https://www.amazon.com/dp/B0BM8RW8GP', '2 pcs adjustable daisy chain, 1.1 m', 'Unbranded generic product; no trademark claimed.', '1.1 m length, 20 mm (0.63″) width, 8 loops, 22 kN', 'Pocket length and bulge estimated from product photos; hung folded in half, flat-laid facing out') });
export const GYMREAPERS_ANKLE_STRAP = part({ id: 'gymreapers-ankle-straps', name: 'Gymreapers ankle strap', title: 'Gymreapers ankle strap', noun: 'ankle strap',
  description: `Gymreapers Ankle Strap (black; sold in pairs, one shown): 7 mm neoprene-padded cuff with hook-and-loop webbing wrap, skull logo patch and twin stainless D-rings. ${ending('Gymreapers')}`,
  envelope: { width: 95, above, drop: 145 },
  vendor: credit('Gymreapers', 'https://www.gymreapers.com/products/ankle-straps', 'Gymreapers Ankle Straps (pair, black)', 'Gymreapers is a trademark of Gymreapers LLC.', '7 mm neoprene padding, stainless steel D-rings, adjustable hook-and-loop', 'Cuff width, closed diameter and ring size estimated from product photos') });
export const MANUEKLEAR_TRICEP_STRAPS = part({ id: 'manueklear-tricep-straps', name: 'Tricep straps', title: 'Manueklear 3-grip tricep straps', noun: 'tricep straps',
  description: `MANUEKLEAR 3-Grip tricep rope: 24″ padded strap from a steel D-ring, 6.3″ webbing stem splitting into two neoprene legs with three hand openings each. ${ending('MANUEKLEAR')}`,
  envelope: { width: 200, above, drop: 615 },
  vendor: credit('MANUEKLEAR', 'https://www.amazon.com/dp/B0CCNJZ7MM', '3 Grip Lengths in 1 Tricep Rope (24″, purple)', 'MANUEKLEAR is a trademark of its owner.', '24″ overall length, 6.3″ stem', 'Leg width, opening sizes and splay estimated from product photos; modelled flat-laid facing out') });
export const BOS_SWIVEL_SHACKLES = part({ id: 'bells-of-steel-swivel-shackles', name: 'Swivel shackles (set of 4)', title: 'Bells of Steel swivel shackles (set of 4)', noun: 'shackles',
  description: `Bells of Steel Swivel Shackles, set of 4 on one hook: 70 mm stainless jaw-swivel snap shackles with quick-release plunger, clevis pin and pull rings. ${ending('Bells of Steel')}`,
  envelope: { width: 45, above, drop: 66 },
  vendor: credit('Bells of Steel', 'https://bellsofsteel.com/products/swivel-shackles', 'Swivel Shackles (set of 4)', 'Bells of Steel is a trademark of Bells of Steel.', '70 mm (2-3/4″) total length, 12 mm cable connector width, 16 mm attachment width, stainless steel', 'Bail, body and clevis proportions estimated from product photos and a matching 70 mm jaw-swivel drawing') });
export const BEYOND_POWER_CARABINER = part({ id: 'beyond-power-premium-carabiner', name: 'Premium carabiners (6-pack)', title: 'Beyond Power premium carabiner (6-pack)', noun: 'carabiners',
  description: `Beyond Power Premium Carabiner, six on one hook: 75.5 × 40.3 mm aircraft-grade aluminium ovals with 10.7 mm stock and a 9.9 mm straight bar gate. ${ending('Beyond Power')}`,
  envelope: { width: 45, above, drop: 66 },
  vendor: credit('Beyond Power', 'https://www.beyond-power.com/products/premium-carabiner', 'Premium Carabiner (6 pack)', 'Beyond Power and VOLTRA are trademarks of Beyond Power.', '75.5 × 40.3 mm outside, 54.0 × 19.3 mm inside, 10.7 mm stock, 9.9 mm gate', 'Gate hinge and nose notch estimated from product photos') });
const bluslm = (size: string, published: string) => credit('BLUSLM', 'https://www.amazon.com/dp/B0D7CK2BYK', `LAT Pulldown Attachments 8-piece set — ${size}`, 'BLUSLM is a trademark of its owner.', `${published}, 4″ (10 cm) tall, 11 mm steel with 6 mm rubber coating (17 mm)`, 'Frame curve and grip angles estimated from product photos');
const blurb = (what: string) => `BLUSLM rubber-dipped 17 mm steel ${what} with angled grip paddles and a steel grommet eye; part of the BLUSLM 8-piece lat pulldown set. ${ending('BLUSLM')}`;
export const BLUSLM_WAVE_84 = part({ id: 'bluslm-wave-lat-bar-84', name: 'BLUSLM 33″ wave lat bar', title: 'BLUSLM 33″ wave lat bar', noun: 'lat bar',
  description: blurb('33.1″ wave lat bar, pronated wide grips'), envelope: { width: 845, above, drop: 100 }, vendor: bluslm('33.1″ wave lat bar', '84 cm (33.1″) width') });
export const BLUSLM_WAVE_78 = part({ id: 'bluslm-wave-lat-bar-78', name: 'BLUSLM 31″ wave lat bar', title: 'BLUSLM 31″ wave lat bar', noun: 'lat bar',
  description: blurb('30.7″ wave lat bar, near-neutral wide grips'), envelope: { width: 785, above, drop: 100 }, vendor: bluslm('30.7″ wave lat bar', '78 cm (30.7″) width') });
export const BLUSLM_V_62 = part({ id: 'bluslm-v-lat-bar-62', name: 'BLUSLM 24.6″ V lat bar', title: 'BLUSLM 24.6″ V lat bar', noun: 'lat bar',
  description: blurb('24.6″ V lat bar, pronated medium grips'), envelope: { width: 628, above, drop: 100 }, vendor: bluslm('24.6″ V lat bar', '62.3 cm (24.6″) width') });
export const BLUSLM_V_60 = part({ id: 'bluslm-v-lat-bar-60', name: 'BLUSLM 23.5″ V lat bar', title: 'BLUSLM 23.5″ V lat bar', noun: 'lat bar',
  description: blurb('23.5″ V lat bar, inward-tilted neutral grips'), envelope: { width: 600, above, drop: 100 }, vendor: bluslm('23.5″ V lat bar', '59.5 cm (23.5″) width') });
export const BLUSLM_V_56 = part({ id: 'bluslm-v-lat-bar-56', name: 'BLUSLM 21.9″ V lat bar', title: 'BLUSLM 21.9″ V lat bar', noun: 'lat bar',
  description: blurb('21.9″ V lat bar, neutral medium grips'), envelope: { width: 560, above, drop: 100 }, vendor: bluslm('21.9″ V lat bar', '55.5 cm (21.9″) width') });
export const BLUSLM_CLOSE_24 = part({ id: 'bluslm-close-grip-24', name: 'BLUSLM 9.7″ close grip', title: 'BLUSLM 9.7″ curved close grip', noun: 'close grip',
  description: blurb('9.7″ close-grip row handle, curved grips'), envelope: { width: 250, above, drop: 90 }, vendor: bluslm('9.7″ curved close grip', '24.5 cm (9.7″) width') });
export const BLUSLM_CLOSE_26 = part({ id: 'bluslm-close-grip-26', name: 'BLUSLM 10.5″ close grip', title: 'BLUSLM 10.5″ wide-paddle close grip', noun: 'close grip',
  description: blurb('10.5″ close-grip row handle, wide flat paddles'), envelope: { width: 270, above, drop: 90 }, vendor: bluslm('10.5″ wide-paddle close grip', '26.5 cm (10.5″) width') });
export const BLUSLM_CLOSE_22 = part({ id: 'bluslm-close-grip-22', name: 'BLUSLM 8.7″ neutral close grip', title: 'BLUSLM 8.7″ neutral close grip', noun: 'close grip',
  description: blurb('8.7″ close-grip row handle, parallel neutral grips'), envelope: { width: 225, above, drop: 90 }, vendor: bluslm('8.7″ neutral close grip', '22 cm (8.7″) width') });

/** Highest-owned first (Gym Radar, Sep 2026). */
export const PARTS = [
  ROGUE_V_GRIP, SPUD_LONG_AB_STRAP, ROGUE_SINGLE_HANDLE, DAISY_CHAINS, BLUSLM_WAVE_84, BLUSLM_WAVE_78, BLUSLM_V_62, BLUSLM_V_60, BLUSLM_V_56,
  BLUSLM_CLOSE_24, BLUSLM_CLOSE_26, BLUSLM_CLOSE_22, ROGUE_LAT_BAR, GYMREAPERS_ANKLE_STRAP, ROGUE_CURL_BAR, ROGUE_ANKLE_CUFF, BEYOND_POWER_CARABINER,
  MANUEKLEAR_TRICEP_STRAPS, BOS_SWIVEL_SHACKLES, ROGUE_STRAIGHT_BAR_40, ROGUE_STRAIGHT_BAR_20,
] as const satisfies readonly HangPart[];
