/** Primary vendor specs checked 2026-09-17 (REP/BoS) and 2026-09-19 (catalog wave, #130).
 * Values stay in mm without rounding imperial hole pitch to the generic source grid.
 * Unpublished fabrication details are explicitly estimated; these are reconstructed
 * models, not certified fits. Sources and estimates: research/rack-profiles.md. */

/** How an upright meets the floor.
 * - `plate`: the BOS asymmetric three-hole plate (default, generic/BoS/REP 5000 profiles).
 * - `bolt-down`: a welded rectangular floor plate; `out`/`in` extend it beyond the outer/inner
 *   side faces, `fore` beyond both the front and back faces.
 * - `foot`: a flat-foot base tube under each side (flat-foot racks, half racks, squat stands).
 *   `front`/`back` are the overhangs past the front-most upright's front face and the rear-most
 *   upright's back face; posts in one column share one continuous tube. `rearBar` adds the floor
 *   crossbar joining both feet at the foot's rear end (`end`, moved `rearBarOffset` forward) or at the rear posts
 *   (`post`, moved `rearBarOffset` rearward).
 * - `wall`: fold-back wall mount; each post swings on two arms hinged to wall brackets. */
export type FrameBase =
  | { style: 'plate' }
  | { style: 'bolt-down'; out: number; in?: number; fore: number; thickness: number }
  | { style: 'foot'; width: number; height: number; front: number; back: number; wall?: number; rearBar?: 'end' | 'post'; rearBarOffset?: number; gusset?: { height: number; length: number }; caps?: boolean }
  | { style: 'wall'; armLow: number; armHigh: number; armSize: number; bracketHeight: number; bracketOut: number };
/** Flat coloured nameplate on the rear top crossmember; no manufacturer artwork. */
export interface ProfileNameplate { style: 'badge' | 'arch' | 'panel'; color: string; accent?: string; height?: number; center?: boolean; width?: number }
export type StarterKind = 'four' | 'six' | 'stand' | 'wall';
/** A curated starting point. `rearHeight` shortens the rear (storage) posts of a half rack;
 * `pullups` lists front pull-up bar diameters, highest bar first. */
/** A rack attachment that ships with the rack (#130: The Dane 2.0's cable stacks), placed on the starter's `upright`
 * (default front-left) at its registry-preferred face and hole. */
export interface StarterAttachment { part: string; upright?: string; paired?: boolean }
export interface ProfileStarter { kind: StarterKind; height: number; depth: number; rearHeight?: number; label: string; featured?: boolean; pullups?: readonly number[]; rearCrossmember?: boolean;
  /** Keep only a rear lower crossmember (a low rear brace) instead of the side lower crossmembers. */
  rearLower?: boolean; attachments?: readonly StarterAttachment[] }
export interface GridProfile {
  tube?: number;
  /** Upright size front-to-back (Y) when it differs from `tube` (2x3 uprights). */
  tubeDepth?: number;
  id: string;
  label: string;
  /** Brand heading for grouped starters. */
  vendor?: string;
  widths: readonly number[];
  depths: readonly number[];
  heights?: readonly number[];
  pitch: number;
  holeDiameter: number;
  source?: string;
  reconstructionNote?: string;
  benchZone?: { startStation: number; endStation: number; spacing: number };
  wall?: number;
  firstHole?: number;
  /** Side faces are drilled every `sideStride` stations (Titan: 6-inch side holes on a 2-inch lattice). */
  sideStride?: number;
  numbered?: boolean;
  base?: FrameBase;
  nameplate?: ProfileNameplate;
  /** Vertical decal strip on each upright's outer side face near the top. */
  decal?: { color: string; length: number; width: number; top: number };
  /** Default frame powder coat for starters. */
  color?: string;
  /** Factory colour of the floor base (feet or plates) when it differs from the posts (two-tone frames). */
  baseColor?: string;
  /** Clear depth of the rear storage bay for six-post starters. */
  storageDepth?: number;
  lowerCrossmembers?: boolean;
  starters?: readonly ProfileStarter[];
}
const inch = (n: number) => Number((n * 25.4).toFixed(4));
const ROGUE_BLACK = '#1c1d1f', TITAN_BLACK = '#18191b', REP_METALLIC = '#303236';
const MONSTER_LITE = { pitch: inch(2), holeDiameter: inch(11 / 16), wall: 3.04, firstHole: inch(2.5), benchZone: { startStation: 7, endStation: 22, spacing: inch(1) } } as const;
const ROGUE_DECAL = { color: '#e6e7e8', length: inch(13), width: inch(0.9), top: inch(5) } as const;
const ROGUE_BOLT_DOWN: FrameBase = { style: 'bolt-down', out: inch(2), fore: inch(2), thickness: inch(3 / 8) };
/** Rogue Monster Lite squat-stand base: 48-inch 2x3 feet with the posts toward the rear, triangle gussets,
 * rear floor crossbar a few inches in from the rear ends. */
const ROGUE_STAND_BASE: FrameBase = { style: 'foot', width: inch(3), height: inch(2), front: inch(29), back: inch(16), rearBar: 'end', rearBarOffset: inch(3), gusset: { height: inch(9), length: inch(4) } };
const TITAN_BADGE: ProfileNameplate = { style: 'badge', color: '#eceded', accent: '#d21f26' };
/** Catalog leftovers (#130, #136, #178). Research: research/rack-profiles.md and research/rack-digital-cable-trainers.md. */
const LEFTOVER_PROFILES: readonly GridProfile[] = [
  { id: 'fitness-reality-810xlt', label: 'Fitness Reality 810XLT Super Max Power Cage', vendor: 'Fitness Reality', tube: inch(2), wall: 1.9, pitch: inch(3), holeDiameter: inch(1), firstHole: inch(12), numbered: false,
    widths: [inch(40)], depths: [inch(19)], heights: [inch(74.5)],
    base: { style: 'foot', width: inch(3), height: inch(3), front: inch(13.5), back: inch(13.5), wall: 1.9, gusset: { height: inch(6), length: inch(4) }, caps: true },
    color: '#a9adb1', baseColor: '#3c3e42',
    source: 'https://fitnessreality.com/fitness-reality-810xlt-super-max-power-rack-cage-with-800lbs-weight-capacity/',
    starters: [{ kind: 'four', height: inch(74.5), depth: inch(19), label: 'Fitness Reality 810XLT Super Max cage · 83 in · 46 x 50 in', featured: true, pullups: [31.75], rearLower: true }],
    reconstructionNote: 'Reconstruction: published 2 x 2 in steel frame, 1 in holes, 19 bar heights, 46 in wide x 50 in deep x 83 in tall (74.5 in with the reversible pull-up bar flipped; 50.5 x 46.5 x 83.5 in on Amazon), two rear stability bars and 800 lb capacity (owner\'s manual 2810). The 3 in hole pitch, 12 in first hole, 40 in inside width (3 in feet and gusset plates inside the published 46 in), 3 x 3 in feet and gussets are estimated from the manual drawings and product photos; the multi-grip pull-up bar is shown as a straight 1.25 in bar and the two curved rear braces as straight top and low rear crossmembers. Physical fit unverified.' },
  { id: 'fray-savage-f1', label: 'Fray Fitness Savage Series F-1 Power Rack', vendor: 'Fray Fitness', tube: inch(3), wall: 3.04, pitch: inch(2), holeDiameter: inch(1 + 1 / 16), firstHole: inch(2.5), numbered: true,
    widths: [inch(42)], depths: [inch(31), inch(43)], heights: [inch(79.5), inch(94)],
    base: { style: 'bolt-down', out: 3, in: inch(2), fore: 3, thickness: inch(3 / 8) }, nameplate: { style: 'arch', color: '#8a8d91', height: inch(10) }, color: '#1b1c1e',
    source: 'https://web.archive.org/web/20231205061451/https://frayfitness.com/products/savage-series-f-1-power-rack',
    starters: [
      { kind: 'four', height: inch(94), depth: inch(31), label: 'Fray Savage Series F-1 · 94 in tall · 37 in deep', featured: true, pullups: [31.75] },
      { kind: 'four', height: inch(94), depth: inch(43), label: 'Fray Savage Series F-1 · 94 in tall · 49 in deep', pullups: [31.75] },
      { kind: 'four', height: inch(79.5), depth: inch(31), label: 'Fray Savage Series F-1 · 79.5 in short · 37 in deep', pullups: [31.75] },
    ],
    reconstructionNote: 'Reconstruction: published 3 x 3 in 11-gauge posts, 1 in four-way holes on 2 in centres with laser-cut numbers, 1 in hardware, 94 / 79.5 in heights, 48 in wide x 37 / 49 in deep (archived Fray product pages; the store is closed). Inside width and depth (42 in, 31 / 43 in) follow from the 3 in posts and Fray\'s 42 / 31 in crossmember SKUs; hole size, first hole, bolt-down plates and the grey arched logo plate are estimated from Fray\'s renders. Physical fit unverified.' },
  { id: 'fringe-dane-2', label: 'Fringe Sport The Dane 2.0', vendor: 'Fringe Sport', tube: 75, wall: 3.04, pitch: inch(2), holeDiameter: inch(1 + 1 / 16), firstHole: inch(6), numbered: true,
    widths: [inch(39)], depths: [inch(30)], heights: [inch(89)],
    base: { style: 'bolt-down', out: inch(1.5), fore: inch(1.5), thickness: inch(3 / 8) }, nameplate: { style: 'panel', color: '#26282b', height: inch(9) }, color: '#161719',
    source: 'https://www.fringesport.com/products/the-dane-2-0',
    starters: [{ kind: 'four', height: inch(89), depth: inch(30), label: 'Fringe Sport The Dane 2.0 · dual 160 lb stacks · 92 in', featured: true, pullups: [31.75],
      attachments: [{ part: 'fringe-sport-dane-2-cable-stacks', upright: 'rear-left', paired: true }] }],
    reconstructionNote: 'Reconstruction: published 3x3 (metric) 11-gauge uprights 89 in long, 1 in holes on 2 in centres, 60 x 47 x 92 in overall with the extension feet (about 33 in deep without), 1,200 lb rack capacity and two 160 lb 1:1 stacks inside the side frames. The 30 in inside depth, 39 in inside width, 6 in base-tube station, base plates and the black sign plate are estimated from Fringe renders scaled to the published height; the second rear crossmember at about 63 in is not modelled. Physical fit unverified.' },
];
export const GRID_PROFILES: readonly GridProfile[] = [
  { id: 'generic-75', label: 'BOS generic 75 mm', widths: [425,725,1075], depths: [425,725,1075], pitch:50, holeDiameter:25 },
  ...(['hydra','manticore'] as const).map(series => ({id:`bos-${series}`,label:`Bells of Steel ${series === 'hydra' ? 'Hydra' : 'Manticore'}`,tube:76.2,widths:[1092.2],depths:[609.6,762,1092.2],heights:[2133.6,2286,2743.2],pitch:50.8,holeDiameter:series === 'hydra'?15.875:25.4,source:'https://bellsofsteel.com/collections/all/products/kraken-4-post-hydra-manticore',reconstructionNote:'Reconstructed true 3-inch frame for Kraken. Published nominal dimensions; first-hole datum, bracket and base contours are estimated. 108-inch Kraken uses the 90-inch kit with lower crossmembers raised18 inches; physical fit is unverified.'})),
  { id: 'rep-pr-5000', label:'REP PR-5000', widths:[1140.32], depths:[406.4,762,1041.4], heights:[2032,2362.2], pitch:2*25.4, holeDiameter:25.4,
    source:'https://repfitness.com/products/pr-5000-power-rack-pre-selected',
    reconstructionNote:'Reconstruction: published rack dimensions, 50.8 mm pitch and 25.4 mm holes. First-hole datum (65 mm), flange outlines, bolts and base details are estimated from BOS source geometry; physical REP fit is unverified.' },
  { id: 'rep-pr-4000', label:'REP PR-4000', vendor: 'REP Fitness', widths:[1140.32], depths:[406.4,609.6,762,1041.4], heights:[2032,2362.2], pitch:2*25.4, holeDiameter:5/8*25.4,
    source:'https://repfitness.com/products/pr-4000-rack-builder',
    benchZone:{startStation:8,endStation:22,spacing:25.4},
    base: { style: 'bolt-down', out: inch(2.5), fore: inch(0.5), thickness: inch(3 / 8) },
    nameplate: { style: 'badge', color: '#b9bcbf', center: true, width: inch(8) }, color: REP_METALLIC,
    reconstructionNote:'Reconstruction: published 50.8 mm pitch, 25.4 mm bench-zone spacing and 15.875 mm holes. REP now lists 3x3 11-gauge uprights; the saved-document tube stays 75 mm so existing racks and J-hooks keep fitting. Bench-zone bounds (stations 8–22, 471.4–1182.6 mm), first-hole datum (65 mm), post-style foot plates and the centred logo badge are estimated. Front/back bench holes are modeled separately; physical REP fit is unverified.' },
  { id: 'rogue-rm-monster-2', label: 'Rogue Monster Rack 2.0 (RM-3/RM-4/RM-6)', vendor: 'Rogue Fitness', tube: inch(3), wall: 3.04,
    widths: [inch(43)], depths: [inch(24), inch(30), inch(43)], heights: [inch(80.375), inch(90.375), inch(100.375), inch(108.375)],
    pitch: inch(2), holeDiameter: inch(1 + 1 / 16), firstHole: inch(2.5), numbered: true,
    base: ROGUE_BOLT_DOWN, nameplate: { style: 'arch', color: '#c8102e', height: inch(11) }, decal: ROGUE_DECAL, color: ROGUE_BLACK, storageDepth: inch(24),
    source: 'https://www.roguefitness.com/rogue-rm-4-bolt-together-monster-rack-2-0',
    starters: [
      { kind: 'four', height: inch(90.375), depth: inch(43), label: 'Rogue RM-4 Monster Rack 2.0 · 90″ · 43″ deep', featured: true, pullups: [31.75] },
      { kind: 'four', height: inch(90.375), depth: inch(30), label: 'Rogue RM-3 Monster Rack 2.0 · 90″ · 30″ deep', pullups: [31.75] },
      { kind: 'six', height: inch(90.375), depth: inch(43), label: 'Rogue RM-6 Monster Rack 2.0 · 90″ · 43″ + 24″ storage', pullups: [31.75] },
    ],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge uprights, 1-inch hardware, 2-inch hole spacing, 43-inch inside width, 24/30/43-inch depths and 80.375–108.375-inch heights (53 × 53-inch RM-4 footprint). The 1-1/16-inch hole, 2.5-inch first hole, plate outlines, nameplate arch and decal strip are estimated from photos; physical Rogue fit is unverified.' },
  { id: 'rogue-rml-3', label: 'Rogue Monster Lite RML-390/490/690 3.0', vendor: 'Rogue Fitness', tube: inch(3), ...MONSTER_LITE, numbered: true,
    widths: [inch(43)], depths: [inch(24), inch(30), inch(43)], heights: [inch(80.375), inch(90.375)],
    base: ROGUE_BOLT_DOWN, decal: ROGUE_DECAL, color: ROGUE_BLACK, storageDepth: inch(24),
    source: 'https://www.roguefitness.com/rml-390c-power-rack-3-0',
    starters: [
      { kind: 'four', height: inch(90.375), depth: inch(30), label: 'Rogue RML-390 Monster Lite 3.0 · 90″ · 30″ deep', featured: true, pullups: [31.75] },
      { kind: 'four', height: inch(90.375), depth: inch(43), label: 'Rogue RML-490 Monster Lite 3.0 · 90″ · 43″ deep', pullups: [31.75] },
      { kind: 'six', height: inch(90.375), depth: inch(43), label: 'Rogue RML-690 Monster Lite 3.0 · 90″ · 43″ + 24″ storage', pullups: [31.75] },
    ],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge uprights, 5/8-inch hardware, Westside spacing (1 inch through the bench and clean-pull zone, 2 inches elsewhere), 43-inch inside width, 24/30/43-inch depths, 80.375/90.375-inch heights and 34/40 × 53-inch footprints. The 11/16-inch hole, Westside bounds (stations 7–22), first hole and plate outlines are estimated; physical Rogue fit is unverified.' },
  { id: 'rogue-rml-390f', label: 'Rogue RML-390F Flat Foot Monster Lite', vendor: 'Rogue Fitness', tube: inch(3), ...MONSTER_LITE, firstHole: inch(4), numbered: true,
    widths: [inch(43)], depths: [inch(30)], heights: [inch(92.25)],
    base: { style: 'foot', width: inch(3), height: inch(2), front: inch(6), back: inch(6), gusset: { height: inch(9), length: inch(4) } },
    decal: ROGUE_DECAL, color: ROGUE_BLACK, lowerCrossmembers: false,
    source: 'https://www.roguefitness.com/rml-390f-flat-foot-monster-lite-rack',
    starters: [{ kind: 'four', height: inch(92.25), depth: inch(30), label: 'Rogue RML-390F Flat Foot · 92″ · 30″ deep', featured: true, pullups: [31.75] }],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge uprights on 2x3 11-gauge 48-inch flat feet, 5/8-inch hardware, Westside spacing, 30-inch inside depth, 92.25-inch height and 48 × 49-inch footprint. Gusset plate outlines, hole bounds and first hole are estimated from photos; physical Rogue fit is unverified.' },
  { id: 'rogue-r3', label: 'Rogue R-3 Power Rack', vendor: 'Rogue Fitness', tube: inch(2), tubeDepth: inch(3), ...MONSTER_LITE, numbered: false,
    widths: [inch(43)], depths: [inch(24), inch(30)], heights: [inch(90.375)],
    base: { style: 'bolt-down', out: inch(3), fore: inch(2), thickness: inch(3 / 8) }, color: ROGUE_BLACK,
    source: 'https://www.roguefitness.com/rogue-bolt-together-r-3',
    starters: [{ kind: 'four', height: inch(90.375), depth: inch(30), label: 'Rogue R-3 Power Rack · 90″ · 30″ deep', featured: true, pullups: [31.75, 50.8] }],
    reconstructionNote: 'Reconstruction: published 2x3 11-gauge uprights (2-inch face forward), Westside spacing, 43-inch inside width, 24/30-inch depths, 90.375-inch height and 34/40 × 53-inch footprints. Hole size, plate outlines and fat/skinny bar heights are estimated; physical Rogue fit is unverified.' },
  { id: 'rogue-hr2', label: 'Rogue HR-2 Half Rack', vendor: 'Rogue Fitness', tube: inch(3), ...MONSTER_LITE, firstHole: inch(4), numbered: true,
    widths: [inch(43)], depths: [inch(17)], heights: [inch(92.25), inch(110.25)],
    base: { ...ROGUE_STAND_BASE, front: inch(19.5), back: inch(5.5), rearBarOffset: 0 }, color: ROGUE_BLACK, lowerCrossmembers: false,
    source: 'https://www.roguefitness.com/rogue-hr-2-half-rack',
    starters: [
      { kind: 'four', height: inch(92.25), rearHeight: inch(72.25), depth: inch(17), label: 'Rogue HR-2 Half Rack · 90″ front / 70″ rear', featured: true, pullups: [31.75], rearCrossmember: false },
      { kind: 'four', height: inch(110.25), rearHeight: inch(92.25), depth: inch(17), label: 'Rogue HR-2 Half Rack · 108″ front / 90″ rear', pullups: [31.75], rearCrossmember: false },
    ],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge uprights on the SML 2x3 base, 17-inch crossmembers, 90/108-inch front and 70/90-inch rear sticks, 48 × 49-inch footprint and Westside spacing. The front post position on the 48-inch feet, gussets and hole bounds are estimated; physical Rogue fit is unverified.' },
  ...([
    ['rogue-sml-1', 'Rogue SML-1 70″ Monster Lite Squat Stand', inch(72.25), [] as number[], 'https://www.roguefitness.com/sml-1-rogue-70-monster-lite-squat-stand-1'],
    ['rogue-sml-2', 'Rogue SML-2 90″ Monster Lite Squat Stand', inch(92.25), [31.75], 'https://www.roguefitness.com/sml-2-rogue-90-monster-lite-squat-stand'],
  ] as const).map(([id, label, height, pullups, source]): GridProfile => ({
    id, label, vendor: 'Rogue Fitness', tube: inch(3), ...MONSTER_LITE, firstHole: inch(4), numbered: true,
    widths: [inch(43)], depths: [inch(12)], heights: [height], base: ROGUE_STAND_BASE, color: ROGUE_BLACK, source,
    starters: [{ kind: 'stand', height, depth: inch(12), label: `${label.replace(' Monster Lite Squat Stand', '')} squat stand`, featured: true, pullups }],
    reconstructionNote: `Reconstruction: published 3x3 11-gauge uprights, three 2x3 11-gauge base tubes, 5/8-inch holes, Westside spacing, ${Math.round(height / 25.4 * 100) / 100}-inch height and 48 × 49-inch footprint. The post position on the 48-inch feet (16 inches from the rear, crossbar 3 inches in), triangle plates and hole bounds are estimated from photos; physical Rogue fit is unverified.`,
  })),
  { id: 'rogue-sm-1', label: 'Rogue SM-1 Monster Squat Stand 2.0', vendor: 'Rogue Fitness', tube: inch(3), wall: 3.04, pitch: inch(2), holeDiameter: inch(1 + 1 / 16), firstHole: inch(5), numbered: true,
    widths: [inch(43)], depths: [inch(12)], heights: [inch(73)],
    base: { style: 'foot', width: inch(3), height: inch(3), front: inch(23.5), back: inch(23.5), rearBar: 'post', rearBarOffset: inch(8), gusset: { height: inch(10), length: inch(5) }, caps: true },
    color: ROGUE_BLACK, source: 'https://www.roguefitness.com/rogue-sm-1-squat-stand-2-0',
    starters: [{ kind: 'stand', height: inch(73), depth: inch(12), label: 'Rogue SM-1 Monster squat stand 2.0 · 73″', featured: true }],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge steel, 1-inch hardware, 73-inch height, rubber feet and 50 × 54-inch footprint. Foot section, post position, gussets and 43-inch inside width are estimated from photos; physical Rogue fit is unverified.' },
  { id: 'rogue-s-2', label: 'Rogue S-2 Squat Stand 2.0', vendor: 'Rogue Fitness', tube: inch(2), tubeDepth: inch(3), ...MONSTER_LITE, firstHole: inch(4), numbered: false,
    widths: [inch(43)], depths: [inch(12)], heights: [inch(92)],
    base: ROGUE_STAND_BASE,
    decal: ROGUE_DECAL, color: ROGUE_BLACK, source: 'https://www.roguefitness.com/rogue-s2-squat-stand-2-0',
    starters: [{ kind: 'stand', height: inch(92), depth: inch(12), label: 'Rogue S-2 squat stand 2.0 · 92″ · fat/skinny bar', featured: true, pullups: [31.75, 50.8] }],
    reconstructionNote: 'Reconstruction: published 2x3 11-gauge uprights, Westside spacing, 5/8-inch hardware, 92-inch height, 48 × 48-inch footprint, triangle-plate base and 1.25/2-inch pull-up bars. Post position, inside width and hole size are estimated; physical Rogue fit is unverified.' },
  { id: 'rogue-rml-3w', label: 'Rogue RML-3W Fold Back Wall Mount Rack', vendor: 'Rogue Fitness', tube: inch(3), ...MONSTER_LITE, numbered: true,
    widths: [inch(43)], depths: [inch(21.5), inch(41.5)], heights: [inch(90.375)],
    base: { style: 'wall', armLow: inch(13), armHigh: inch(65), armSize: inch(3), bracketHeight: inch(10.125), bracketOut: inch(5) },
    decal: ROGUE_DECAL, color: ROGUE_BLACK, source: 'https://www.roguefitness.com/rogue-rml-3w-fold-back-wall-mount-rack',
    starters: [
      { kind: 'wall', height: inch(90.375), depth: inch(21.5), label: 'Rogue RML-3W fold-back wall rack · 21.5″ deep', featured: true, pullups: [31.75] },
      { kind: 'wall', height: inch(90.375), depth: inch(41.5), label: 'Rogue RML-3W fold-back wall rack · 41.5″ deep', pullups: [31.75] },
    ],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge uprights, 5/8-inch hardware, 43-inch inside / 49-inch outside width, 21.5/41.5-inch inside depth from the wall, 90.375-inch height and 59 × 10.125-inch wall brackets. Arm heights and hinge details are estimated from photos; shown unfolded. Physical Rogue fit is unverified.' },
  { id: 'titan-x3', label: 'Titan X-3 Series Bolt-Down Power Rack', vendor: 'Titan Fitness', tube: inch(3), ...MONSTER_LITE, sideStride: 3, numbered: false,
    widths: [inch(42)], depths: [inch(24), inch(36)], heights: [inch(80), inch(90)],
    base: { style: 'bolt-down', out: inch(3), fore: inch(1.5), thickness: inch(3 / 8) }, nameplate: TITAN_BADGE, color: TITAN_BLACK,
    source: 'https://www.titan.fitness/products/x-3-series-bolt-down-power-rack-90-24',
    starters: [
      { kind: 'four', height: inch(90), depth: inch(24), label: 'Titan X-3 bolt-down · 90″ · 24″ deep', featured: true, pullups: [31.75, 50.8] },
      { kind: 'four', height: inch(90), depth: inch(36), label: 'Titan X-3 bolt-down · 90″ · 36″ deep', pullups: [31.75, 50.8] },
      { kind: 'four', height: inch(80), depth: inch(24), label: 'Titan X-3 bolt-down · 80″ · 24″ deep', pullups: [31.75, 50.8] },
    ],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge uprights, 11/16-inch holes, Westside spacing through the bench and clean-pull zone, 6-inch side hole spacing, 42 × 24/36-inch inside dimensions, 80/90-inch heights and 54-inch footprint width. Westside bounds, first hole, plate outlines and badge are estimated; physical Titan fit is unverified.' },
  { id: 'titan-x3-flat-foot', label: 'Titan X-3 Series Flat Foot Power Rack', vendor: 'Titan Fitness', tube: inch(3), ...MONSTER_LITE, firstHole: inch(4), sideStride: 3, numbered: false,
    widths: [inch(42)], depths: [inch(30)], heights: [inch(82), inch(91)],
    base: { style: 'foot', width: inch(3), height: inch(2), front: inch(6), back: inch(6), gusset: { height: inch(13), length: inch(3) } },
    nameplate: TITAN_BADGE, color: TITAN_BLACK, lowerCrossmembers: false,
    source: 'https://www.titan.fitness/products/x3-series-flat-foot-power-rack',
    starters: [
      { kind: 'four', height: inch(91), depth: inch(30), label: 'Titan X-3 flat foot · 91″ · 30″ deep', featured: true, pullups: [31.75, 50.8] },
      { kind: 'four', height: inch(82), depth: inch(30), label: 'Titan X-3 flat foot · 82″ · 30″ deep', pullups: [31.75, 50.8] },
    ],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge uprights, 11/16-inch holes, Westside and 6-inch side spacing, 42 × 30-inch inside dimensions, 82/91-inch heights and 50 × 48-inch footprint. Foot section, gusset outline and first hole are estimated from photos; physical Titan fit is unverified.' },
  { id: 'titan-t3', label: 'Titan T-3 Series Power Rack', vendor: 'Titan Fitness', tube: inch(2), tubeDepth: inch(3), ...MONSTER_LITE, sideStride: 3, numbered: false,
    widths: [inch(42)], depths: [inch(24), inch(36)], heights: [inch(82), inch(91)],
    base: { style: 'bolt-down', out: inch(4), fore: inch(1.375), thickness: inch(3 / 8) }, nameplate: TITAN_BADGE, color: TITAN_BLACK,
    source: 'https://www.titan.fitness/products/t-3-series-power-rack-91-24',
    starters: [
      { kind: 'four', height: inch(91), depth: inch(24), label: 'Titan T-3 · 91″ · 24″ deep', featured: true, pullups: [31.75, 50.8] },
      { kind: 'four', height: inch(91), depth: inch(36), label: 'Titan T-3 · 91″ · 36″ deep', pullups: [31.75, 50.8] },
      { kind: 'four', height: inch(82), depth: inch(24), label: 'Titan T-3 · 82″ · 24″ deep', pullups: [31.75, 50.8] },
    ],
    reconstructionNote: 'Reconstruction: published 2x3 11-gauge uprights (2-inch face forward: 42-inch inside / 46-inch outside width, 24-inch inside / 30-inch outside depth), 11/16-inch holes, Westside and 6-inch side spacing, 82/91-inch heights and 54 × 32.75-inch footprint. Westside bounds, first hole and plate outlines are estimated; physical Titan fit is unverified.' },
  { id: 'titan-t2', label: 'Titan T-2 Series Power Rack', vendor: 'Titan Fitness', tube: inch(2), wall: 1.9, pitch: inch(2), holeDiameter: 26, firstHole: inch(4), numbered: false,
    widths: [inch(42)], depths: [inch(26)], heights: [inch(71), inch(83)],
    base: { style: 'foot', width: inch(2), height: inch(2), front: inch(10), back: inch(10), wall: 1.9, rearBar: 'post', caps: true },
    nameplate: TITAN_BADGE, color: TITAN_BLACK, lowerCrossmembers: false,
    source: 'https://www.titan.fitness/products/t2-series-power-rack',
    starters: [
      { kind: 'four', height: inch(71), depth: inch(26), label: 'Titan T-2 · 71″ · 26″ deep', featured: true, pullups: [31.75] },
      { kind: 'four', height: inch(83), depth: inch(26), label: 'Titan T-2 · 83″ · 26″ deep', pullups: [31.75] },
    ],
    reconstructionNote: 'Reconstruction: published 2x2 14-gauge uprights, 26 mm holes on 2-inch centres, 42 × 26-inch inside footprint, 71/83-inch heights, rubber feet and 57 × 50-inch footprint. Foot section, rear floor crossbar and first hole are estimated from photos; weight horns are omitted. Physical Titan fit is unverified.' },
  { id: 'rep-pr-1100', label: 'REP PR-1100 Power Rack', vendor: 'REP Fitness', tube: inch(2), wall: 1.9, pitch: inch(3), holeDiameter: inch(1), firstHole: inch(5), numbered: true,
    widths: [inch(44)], depths: [inch(24)], heights: [inch(85)],
    base: { style: 'foot', width: inch(2), height: inch(2), front: inch(10.25), back: inch(10.25), wall: 1.9, rearBar: 'post', caps: true },
    nameplate: { style: 'badge', color: '#8d9296', center: true, width: inch(5) }, color: REP_METALLIC, lowerCrossmembers: false,
    source: 'https://repfitness.com/products/pr-1100-power-rack',
    starters: [{ kind: 'four', height: inch(85), depth: inch(24), label: 'REP PR-1100 · 85″ · 24″ deep', featured: true, pullups: [31.75] }],
    reconstructionNote: 'Reconstruction: published 2x2 14-gauge uprights, 1-inch holes on 3-inch centres, 3/8-inch hardware, 44 × 24 × 79-inch working area, 85-inch height and 58.1 × 48.5-inch footprint. The multi-grip arch is represented by a straight 1.25-inch bar; foot section and first hole are estimated. Physical REP fit is unverified.' },
  { id: 'rep-apollo', label: 'REP Apollo Half Rack', vendor: 'REP Fitness', tube: inch(3), wall: 3.04, pitch: inch(2), holeDiameter: inch(1), firstHole: inch(4), numbered: true,
    widths: [1140.32], depths: [inch(16)], heights: [inch(80), inch(93)],
    base: { style: 'foot', width: inch(3), height: inch(2), front: inch(13), back: inch(13) },
    nameplate: { style: 'panel', color: '#b8bbbe', height: inch(8) }, color: REP_METALLIC, lowerCrossmembers: false,
    source: 'https://repfitness.com/products/apollo-rack-builder',
    starters: [
      { kind: 'four', height: inch(93), depth: inch(16), label: 'REP Apollo half rack · 93″ · 16″ storage', featured: true, pullups: [31.75] },
      { kind: 'four', height: inch(80), depth: inch(16), label: 'REP Apollo half rack · 80″ · 16″ storage', pullups: [31.75] },
    ],
    reconstructionNote: 'Reconstruction: published 3x3 11-gauge steel, 1-inch holes on 2-inch centres, flat-foot base, 48 × 52.4-inch footprint, 80/93-inch uprights and 16-inch crossmembers (5000-series width). Foot overhangs, logo-plate outline and first hole are estimated; physical REP fit is unverified.' },
  ...LEFTOVER_PROFILES,
];
export function gridProfile(id?: string): GridProfile {
  return GRID_PROFILES.find(p => p.id === id) ?? GRID_PROFILES.find(p => p.id === 'generic-75')!;
}
