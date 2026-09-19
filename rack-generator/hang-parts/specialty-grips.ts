/** Specialty cable grips (MAG, Eclipse, Angles 90, Darko and friends). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; hang-registry.ts already spreads it.
 * Sources, published dimensions and estimates: rack-generator/research/specialty-grips.md. */
import { defineHangPart, type HangPart } from '../hang-part.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';
const SECTION = 'Cable attachments' as const;
/** The peg's upturned tip rises 26 mm above the anchor (same as the REP set). */
const above = 26;
const credit = (vendor: string, url: string, product: string, trademark: string, published: string, estimated = 'Secondary dimensions estimated from product photos'): VendorAttribution => ({
  vendor, url, credit: `${vendor} — ${product}`, trademark,
  reconstruction: `Independent Manifold reconstruction. Published: ${published}. ${estimated}; scenery only, excluded from print export.`,
});
const ending = (brand: string) => `Independent reconstruction for layout; ${brand} trademarks belong to ${brand}.`;
type Spec = Parameters<typeof defineHangPart>[0];
const part = <const Id extends string>(spec: Omit<Spec, 'section'> & { id: Id }) => defineHangPart({ ...spec, section: SECTION });

export const PORTER_ECLIPSE = part({ id: 'porter-physed-eclipse-grip', name: 'Eclipse grip', title: 'Porter PhysEd Eclipse grip', noun: 'Eclipse grip',
  description: `Porter PhysEd Eclipse Grip (black): vertical 38 mm mountain-knurled billet aluminium handle on a 3″ domed base plate, hung from an M10 360° bearing swivel eye with a hex body. ${ending('Porter PhysEd')}`,
  envelope: { width: 80, above, drop: 155 },
  vendor: credit('Porter PhysEd', 'https://porterpef.com/products/eclipse-grip', 'Eclipse Grip (black)', 'Porter PhysEd and Eclipse Grip are trademarks of Porter PhysEd.', '38 mm billet aluminium handle, 3″ base, 360° bearing swivel, mountain knurl, 1.4 lb', 'Handle length, swivel eye and hex sizes and the base dome scaled from the 38 mm handle in product photos') });
export const ANGLES90_GRIPS = part({ id: 'angles90-grips', name: 'A90 grips (pair)', title: 'Angles90 A90 grips (pair)', noun: 'A90 grips',
  description: `Angles90 A90 Grips, the pair on one hook: curved orange two-layer TPU prism handles with a finger groove, pull-through slits and black automotive webbing loops. ${ending('Angles90')}`,
  envelope: { width: 175, above, drop: 235 },
  vendor: credit('Angles90', 'https://angles90.com/products/angles90-grips', 'A90 Grips (pair, orange)', 'Angles90 and A90 are trademarks of Angles90 GmbH.', 'sold as a pair, TPU two-layer grip, 180 kg per handle, 278 g', 'Grip length, section, curvature and strap loop length estimated from product and hand photos') });
export const TRAKHANDLE_SPORT = part({ id: 'trakfitness-trakhandle-sport', name: 'TrakHandle Sport', title: 'TrakFitness TrakHandle Sport', noun: 'TrakHandle',
  description: `TrakFitness TrakHandle Sport (sold in pairs; one shown): black crescent hub with a swivel eye and printed TrakHandle Sport mark, twin steel cables to a rotating dumbbell-style grip with round end discs (3-axis rotation). ${ending('TrakFitness')}`,
  envelope: { width: 190, above, drop: 240 },
  vendor: credit('TrakFitness', 'https://www.trakfitnessllc.com/shop/p/trakhandle-sport', 'TrakHandle Sport (pack of 2)', 'TrakHandle and TrakFitness are trademarks of Trak Fitness LLC.', 'patented 3-axis rotating cable handle, sold in pairs, 2.5 lb shipping weight', 'All dimensions scaled from product photos (hand for scale); the grip is shown at rest') });
const darko = (handle: string, product: string, published: string, estimated?: string) =>
  credit('Darko Lifting', `https://darkolifting.com/products/${handle}`, product, 'Darko Lifting is a trademark of Darko Lifting.', published, estimated);
export const DARKO_SHORTY = part({ id: 'darko-lifting-shorty-bar', name: 'The Shorty Bar', title: 'Darko Lifting The Shorty Bar', noun: 'Shorty Bar',
  description: `Darko Lifting The Shorty Bar: curved 3/8″ black steel bar with eight D-handle holes per side, clover hub with a black acetal landmine liner, swivel eye tab and white D logo plates; 22.75″ × 5″. ${ending('Darko Lifting')}`,
  envelope: { width: 580, above, drop: 120 },
  vendor: darko('the-shorty-bar', 'The Shorty Bar (black)', '22.75″ wide, 5″ tall, 3/8″ steel, 8 adjustment holes per side, black acetal liner, 3.5 lb', 'Bar depth, arc, hole size and pitch and hub plates estimated from product photos') });
export const MUTANT_ARC = part({ id: 'mutant-metals-arc-cable-attachment', name: 'ARC cable attachment', title: 'Mutant Metals ARC cable attachment', noun: 'ARC',
  description: `Mutant Metals ARC Cable Attachment (Rogue-built), 5° standard frame with 8″ black anodised aluminium handles: half-disc plate with three cable holes and a window, welded 1.75″ threaded barrel, 35 mm handles; 26.5″ × 5.5″. ${ending('Mutant Metals')}`,
  envelope: { width: 685, above, drop: 125 },
  vendor: credit('Mutant Metals', 'https://www.roguefitness.com/mutant-metals-arc', 'Mutant Metals ARC Cable Attachment (5°, standard frame, 8″ aluminium handles, black)', 'Mutant Metals is a trademark of Mutant Metals; Rogue is a trademark of Rogue Fitness.', '5° centre assembly 10.75″ W × 5.75″ H × 1.75″ D; 26.5″ overall and 5.5″ tall with 8″ handles; 35 mm handles; 5.1 lb frame', 'Plate radius, window and hole layout estimated from Rogue drawings and photos') });
const mag = (handle: string, product: string, published: string) =>
  credit('MAG (Maximum Advantage Grip)', `https://www.maxagrip.com/${handle}/`, product, 'MAG and Maximum Advantage Grip are trademarks of their owner.', published, 'Frame profile, band and grip-block sizes and grip angles scaled from the three product photos per grip (front, hands, top)');
const magBlurb = (what: string) => `MAG ${what}: rubber-coated steel frame with a carabiner eye at the apex, contoured rubber grips and the yellow MAG mark. ${ending('MAG')}`;
export const MAG_MS = part({ id: 'mag-medium-grip-supinate', name: 'MAG medium supinated grip', title: 'MAG medium grip supinate (MS006)', noun: 'MAG grip',
  description: magBlurb('Medium Grip Supinate (MS006), about 22″ middle finger to middle finger, grips turned toward supination'),
  envelope: { width: 675, above, drop: 175 }, vendor: mag('medium-grip-supinate-ms006', 'Medium Grip Supinate (MS006)', 'approx. 22″ wide, middle finger to middle finger') });
export const DARKO_DANGLERS = part({ id: 'darko-lifting-danglers', name: 'Danglers (pair)', title: 'Darko Lifting Danglers (pair)', noun: 'Danglers',
  description: `Darko Lifting Danglers, the pair on one hook: textured avocado-shaped grips (2″ × 2″ × 3.5″) on stainless eye bolts; black of the 16 colours. ${ending('Darko Lifting')}`,
  envelope: { width: 110, above, drop: 110 },
  vendor: darko('danglers', 'Danglers (pair, black)', '2″ × 2″ × 3.5″, sold as a pair, 16 colours', 'Eye bolt size and avocado profile estimated from the four available photos') });
export const KORIKAHM_PADDLE = part({ id: 'korikahm-msp-paddle-grip', name: 'MSP paddle grip', title: 'KORIKAHM MSP paddle grip', noun: 'paddle grip',
  description: `KORIKAHM MSP-Paddle Grip (sold in pairs; one shown): lime-green slotted arc plate with a carabiner hole, pivot block and a rotating black rubber paddle grip; 7.7″ tall, 8.6″ wide. ${ending('KORIKAHM')}`,
  envelope: { width: 255, above, drop: 190 },
  vendor: credit('KORIKAHM', 'https://www.amazon.com/dp/B09G6MG821', 'MSP-Paddle Grip (SP-PADDLE GRIP, green)', 'KORIKAHM is a trademark of its owner.', '7.7″ height, 8.6″ width, 5.5″ paddle, alloy steel and rubber, 4.2 lb pair', 'Arc radius, slot layout and block size estimated from the Amazon gallery') });
const prime = (handle: string, product: string, published: string, estimated?: string) =>
  credit('PRIME Fitness', `https://primefitnessusa.com/products/${handle}`, product, 'PRIME, KAZ and RO-T8 are trademarks of PRIME Fitness USA.', published, estimated);
export const PRIME_KAZ = part({ id: 'prime-fitness-kaz-handles', name: 'KAZ handles (pair, small)', title: 'PRIME KAZ handles (pair, small)', noun: 'KAZ handles',
  description: `PRIME Fitness KAZ Handles, small size, the pair on one hook: tapered 1.70″–2.25″ ribbed aluminium spools with end flanges hanging from black nylon straps. ${ending('PRIME Fitness')}`,
  envelope: { width: 170, above, drop: 300 },
  vendor: prime('kaz-handles-pair-copy', 'KAZ Handles (pair, Small 1.70″–2.25″)', 'Small taper 1.70″ to 2.25″ (XS 1.25″–1.77″, L 2.0″–2.5″), sold as a pair', 'Grip length, flange sizes, groove count and strap loop estimated from product photos') });
export const BELT_FED_BFAS = part({ id: 'belt-fed-strength-bfas', name: 'BFAS leather accessory strap', title: 'Belt Fed Strength BFAS', noun: 'accessory strap',
  description: `Belt Fed Strength BFAS: 30″ natural leather accessory strap bound in brown water buffalo, folded through a steel O-ring into two riveted 7.5″ hand loops. ${ending('Belt Fed Strength')}`,
  envelope: { width: 215, above, drop: 400 },
  vendor: credit('Belt Fed Strength', 'https://www.beltfedstrength.com/product-page/bfas', 'BFAS (natural leather)', 'Belt Fed Strength is a trademark of Belt Fed Strength.', '30″ overall length, 7.5″ hand loops, 1-5/8″ width, ≈ 0.3″ thick', 'Ring size, rivet spacing and leg splay estimated from product photos; strap modelled flat-laid facing out') });
export const PRIME_ROT8 = part({ id: 'prime-fitness-ro-t8-handles', name: 'RO-T8 handle', title: 'PRIME RO-T8 handles', noun: 'RO-T8 handle',
  description: `PRIME Fitness RO-T8 Handles (sold in pairs; one shown): black slotted arc plate with a carabiner hole, pivot block with the green PRIME badge and a rotating textured paddle grip. ${ending('PRIME Fitness')}`,
  envelope: { width: 220, above, drop: 160 },
  vendor: prime('prime-ro-t8-handles', 'RO-T8 Handles (pair)', 'swivel paddle handle pair, 6 lb shipping weight', 'All dimensions scaled from product photos against the 8.6″ KORIKAHM clone') });
const repKleva = (handle: string, product: string, published: string, estimated: string) =>
  credit('REP Fitness × Kleva Built', `https://repfitness.com/products/${handle}`, product, 'REP is a trademark of REP Fitness; Kleva Built and Atlas are trademarks of Kleva Built Corp.', published, estimated);
export const KLEVA_ATLAS_MULTI = part({ id: 'rep-kleva-atlas-multi-grip', name: 'Atlas multi-grip', title: 'REP × Kleva Built Atlas multi-grip', noun: 'Atlas multi-grip',
  description: `REP × Kleva Built Atlas Multi-Grip Cable/Landmine Attachment: two black aluminium rails with ten 6″ × 29 mm knurled grips (8″, 16–22″ and 30″ widths), a centre tower with a 50 mm landmine sleeve and a stainless eye. ${ending('REP Fitness and Kleva Built')}`,
  envelope: { width: 815, above, drop: 235 },
  vendor: repKleva('rep-x-kleva-built-cable-attachment-bundles', 'Atlas Multi-Grip Landmine/Cable Attachment (black; Kleva spec page klevabuilt.com/products/atlasattachment)', '32″ length, 6.75″ depth, 9.75″ height, 6″ × 29 mm knurled aluminium grips at 8″, 16–22″ and 30″, fits 50 mm sleeves, under 8 lb', 'Rail profile, tower outline and exact rung positions estimated from product photos; hung pushed back along the peg so the 6.75″ depth clears the panel') });
export const MAG_CS = part({ id: 'mag-close-grip-supinate', name: 'MAG close supinated grip', title: 'MAG close grip supinate (CS003)', noun: 'MAG grip',
  description: magBlurb('Close Grip Supinate (CS003), about 5″ middle finger to middle finger, winged grips'),
  envelope: { width: 250, above, drop: 145 }, vendor: mag('close-grip-supinate-cs003', 'Close Grip Supinate (CS003)', 'approx. 5″ wide, middle finger to middle finger') });
export const MAG_MP = part({ id: 'mag-medium-grip-pronate', name: 'MAG medium pronated grip', title: 'MAG medium grip pronate (MP005)', noun: 'MAG grip',
  description: magBlurb('Medium Grip Pronate (MP005), about 22″ middle finger to middle finger, grips turned toward pronation'),
  envelope: { width: 675, above, drop: 175 }, vendor: mag('medium-grip-pronate-mp005', 'Medium Grip Pronate (MP005)', 'approx. 22″ wide, middle finger to middle finger') });
export const SPIRAL_DUALLY = part({ id: 'dynepic-spiral-strength-dually', name: 'Spiral Strength Dually', title: 'Dynepic Spiral Strength Dually', noun: 'Dually',
  description: `Dynepic Spiral Strength Dually (classic red): dynamic coupled tricep rope, double-braided polyester rope running over a red aluminium pulley to two tapered spiral-ribbed EPDM grips. ${ending('Dynepic Sports')}`,
  envelope: { width: 125, above, drop: 545 },
  vendor: credit('Dynepic Sports', 'https://dynepic-sports.com/products/dually', 'Spiral Strength Dually (classic red)', 'Spiral Strength and Dually are trademarks of Dynepic Sports.', 'aircraft aluminium pulley, US-made EPDM grips, double-braided polyester rope, stainless quicklink, 300 lb rating, 1.3 lb', 'Grip length and taper, rope length and pulley plate size estimated from product photos; quicklink omitted (the pulley eye sits on the peg)') });
export const MAG_MN = part({ id: 'mag-medium-grip-neutral', name: 'MAG medium neutral grip', title: 'MAG medium grip neutral (MN004)', noun: 'MAG grip',
  description: magBlurb('Medium Grip Neutral (MN004), about 22″ middle finger to middle finger, neutral grips'),
  envelope: { width: 675, above, drop: 175 }, vendor: mag('medium-grip-neutral-mn004', 'Medium Grip Neutral (MN004)', 'approx. 22″ wide, middle finger to middle finger') });
const kensui = (handle: string, product: string, published: string, estimated: string) =>
  credit('Kensui Fitness', `https://kensuifitness.com/products/${handle}`, product, 'Kensui and Swissies are trademarks of Kensui Fitness.', published, estimated);
export const KENSUI_SWISSIES = part({ id: 'kensui-swissies', name: 'Swissies (pair)', title: 'Kensui Swissies (pair)', noun: 'Swissies',
  description: `Kensui Swissies (black), the pair on one hook: nylon-fibreglass neutral-grip hooks with rubber-lined seats and 32 mm knurled handles with KENSUI end caps. ${ending('Kensui Fitness')}`,
  envelope: { width: 200, above, drop: 145 },
  vendor: kensui('swissies', 'Swissies (pair, black)', '32 mm knurled handle, fits 25–34 mm bars, nylon-fibreglass body, 800 lb capacity, 0.8 lb pair', 'Body outline and handle length estimated from product photos') });
export const MAG_WG = part({ id: 'mag-wide-grip', name: 'MAG wide neutral grip', title: 'MAG wide grip (WG007)', noun: 'MAG grip',
  description: magBlurb('Wide Grip (WG007), about 38″ middle finger to middle finger, neutral end grips'),
  envelope: { width: 1055, above, drop: 140 }, vendor: mag('wide-grip-wg007', 'Wide Grip (WG007)', 'approx. 38″ wide, middle finger to middle finger') });
export const DARKO_LONGY = part({ id: 'darko-lifting-longy-bar', name: 'The Longy Bar', title: 'Darko Lifting The Longy Bar', noun: 'Longy Bar',
  description: `Darko Lifting The Longy Bar: 32.4″ curved 3/8″ black steel bar with D-handle holes (24″ and 10.4″ pairs for REP Ares-style cable spreads), clover hub with acetal landmine liner, swivel eye tab and D logo plates. ${ending('Darko Lifting')}`,
  envelope: { width: 825, above, drop: 120 },
  vendor: darko('the-longy-bar', 'The Longy Bar (black)', '32.4″ wide, 5″ tall, 3/8″ steel, holes at 24″ and 10.4″ apart among the adjustment holes, 5 lb', 'Bar depth, arc, hole count and hub plates estimated from product photos') });
export const KENSUI_SWISSIES_MAX = part({ id: 'kensui-swissies-v2-max', name: 'Swissies V2 MAX (pair)', title: 'Kensui Swissies V2 MAX (pair)', noun: 'Swissies',
  description: `Kensui Swissies V2 MAX (neutral), the pair on one hook by their carabiner eyelets: peaked rubber-lined hooks for bars up to 64 mm and knurled fin-shaped palm-support grips. ${ending('Kensui Fitness')}`,
  envelope: { width: 155, above, drop: 195 },
  vendor: kensui('swissies-max', 'Swissies V2 MAX (pair, black)', 'bars up to 64 mm, nylon-fibreglass body, carabiner eyelet, 800 lb capacity, 1.5 lb pair', 'Body outline, fin size and eyelet estimated from product photos') });
export const MAG_CN = part({ id: 'mag-close-grip-neutral', name: 'MAG close neutral grip', title: 'MAG close grip neutral (CN001)', noun: 'MAG grip',
  description: magBlurb('Close Grip Neutral (CN001), horn-shaped neutral grips on a short stem'),
  envelope: { width: 245, above, drop: 145 }, vendor: mag('close-grip-neutral-cn001', 'Close Grip Neutral (CN001)', 'close neutral grip; no width published (sized like the 5″ CS003)') });
export const KLEVA_ANGLED_CLOSE = part({ id: 'rep-kleva-angled-atlas-close-grip', name: 'Angled Atlas close grip', title: 'REP × Kleva Built Angled Atlas close grip', noun: 'close grip',
  description: `REP × Kleva Built Angled Atlas Close-Grip Cable and Landmine Attachment (Colorado knurl): black aluminium T-plates with the REP × KB mark, 12.5° angled 29 mm × 6″ knurled handles, landmine sleeve and anodised eye. ${ending('REP Fitness and Kleva Built')}`,
  envelope: { width: 285, above, drop: 200 },
  vendor: repKleva('rep-x-kleva-built-angled-atlas-close-grip-cable-landmine-attachment', 'Angled Atlas Close-Grip Cable and Landmine Attachment (Colorado knurl)', '11.15″ L × 7.1″ D × 8.2″ H, 8″ handle width, 29 mm × 6″ handles angled 12.5°, 4.4 lb', 'Plate outline, sleeve boss and bolt layout estimated from product photos; hung pushed back along the peg so the 7.1″ depth clears the panel') });
const beyond = (inch: number, mm: number) => credit('Beyond Power', 'https://www.beyond-power.com/products/carbonflex-bar-with-premium-grip', `CarbonFlex Bar with Premium Grip (${inch}″)`, 'Beyond Power, CarbonFlex and VOLTRA are trademarks of Beyond Power.', `${mm} mm (${inch}″) length, 28 mm carbon-fibre tube, aluminium and titanium hardware, PE grips, 400 kg load capacity`, 'Grip sleeve length, swivel block and shackle sizes estimated from product renders');
export const CARBONFLEX_48 = part({ id: 'beyond-power-carbonflex-bar-48', name: '48″ CarbonFlex bar', title: 'Beyond Power CarbonFlex bar (48″)', noun: 'CarbonFlex bar',
  description: `Beyond Power CarbonFlex Bar with Premium Grip, 48″: 28 mm carbon-fibre lat bar with wave-pattern PE grips, aluminium end caps and a centre aluminium swivel block with a titanium shackle. ${ending('Beyond Power')}`,
  envelope: { width: 1220, above, drop: 70 }, vendor: beyond(48, 1219) });
export const CARBONFLEX_24 = part({ id: 'beyond-power-carbonflex-bar-24', name: '24″ CarbonFlex bar', title: 'Beyond Power CarbonFlex bar (24″)', noun: 'CarbonFlex bar',
  description: `Beyond Power CarbonFlex Bar with Premium Grip, 24″: 28 mm carbon-fibre straight bar with wave-pattern PE grips, aluminium end caps and a centre aluminium swivel block with a titanium shackle. ${ending('Beyond Power')}`,
  envelope: { width: 615, above, drop: 70 }, vendor: beyond(24, 609) });

/** Highest-owned first (Gym Radar, Sep 2026). */
export const PARTS = [
  PORTER_ECLIPSE, ANGLES90_GRIPS, TRAKHANDLE_SPORT, DARKO_SHORTY, MUTANT_ARC, MAG_MS, DARKO_DANGLERS, KORIKAHM_PADDLE, PRIME_KAZ, BELT_FED_BFAS,
  PRIME_ROT8, KLEVA_ATLAS_MULTI, MAG_CS, MAG_MP, SPIRAL_DUALLY, MAG_MN, KENSUI_SWISSIES, MAG_WG, DARKO_LONGY, KENSUI_SWISSIES_MAX, MAG_CN,
  KLEVA_ANGLED_CLOSE, CARBONFLEX_48, CARBONFLEX_24,
] as const satisfies readonly HangPart[];
