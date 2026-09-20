/** Brand-accurate Olympic plate lines (#129). Pure data: every diameter and width per weight, face recipe,
 * colours and markings. Geometry lives in parts/plates.ts; sources and estimates in research/plates.md.
 * Millimetres. Weights are in the line's own unit. `code` and the order of `weights`/`finishes` are
 * persisted through plate params (see plates.ts), so only ever append. */

/** How the plate body is shaped. Each kind is one revolve recipe plus boolean features in parts/plates.ts. */
export type PlateKind = 'bumper' | 'competition' | 'iron' | 'calibrated' | 'change' | 'flat' | 'wagon-steel';
/** Through cut-outs: tri-grip kidneys, hex windows (Equalizer), slot handles (Weight It Out), wedge windows (Titan). */
export interface PlateGrips { kind: 'tri' | 'hex' | 'slot' | 'wedge'; n: number; /** Centre radius / R. */ r: number; /** Size / R. */ size: number; minD?: number; deg?: number }
export interface PlateFace {
  kind: PlateKind;
  /** Outer diameter of the steel hub insert or collar (mm). */
  insert?: number; insertColor?: string; insertRecess?: number;
  /** Bumper inner zone radius / R and its recess (mm) on both faces. */
  inner?: number; innerDepth?: number;
  /** Raised outer lip: radial width / R and how far the face inside it is recessed (mm). */
  lip?: number; lipDepth?: number;
  /** Rim chamfer (mm). */
  edge?: number;
  /** Iron: dish depth as a fraction of the width, on the front and (optionally) the back. */
  dish?: number; back?: number; boss?: number;
  spokes?: { n: number; w: number; minD?: number; deg?: number };
  grips?: PlateGrips;
  /** Recessed grip pockets cut into the rim of both faces (26'ER). */
  pockets?: { n: number; deg: number; depth: number; r: number };
  /** Competition steel disc diameter / D, and its thickness. */
  disc?: number; discDepth?: number;
  /** Wagon-wheel steel: disc plate thickness and rim band radial thickness. */
  plate?: number; band?: number;
  /** Raised abstract relief medallions (Arnold edition); never reproduces the silhouette artwork. */
  medallions?: { n: number; r: number; size: number; deg: number };
  /** Plates at or below this diameter drop the dish/spokes and read as plain small plates. */
  plainBelow?: number;
}
/** A weight marking. `text` expands {w} weight, {k} kg equivalent of lb ({k2} to two decimals), {l} lb equivalent of kg. */
export interface PlateMarking {
  text: string; at: number; r: number; h: number;
  arc?: 'out' | 'in'; rot?: number;
  /** print: pad-printed ink; raised: cast/moulded relief (body colour unless `color`); deboss: cut in; inlay: cut in and ink-filled. */
  style?: 'print' | 'raised' | 'deboss' | 'inlay';
  color?: string; minD?: number; maxD?: number; back?: boolean; spacing?: number;
  /** Horizontal scale (condensed faces < 1). */ sx?: number;
  /** Raised rectangular badge behind raised lettering. */ badge?: boolean;
}
export interface PlateWeight {
  key: string; weight: number; diameter: number; width: number;
  color?: string; ink?: string; accent?: string; metal?: 'chrome' | 'zinc'; label?: string;
  /** What is estimated for this weight (anything not listed is published). */
  est?: string;
}
export interface PlateFinish { id: string; label: string; color: string; ink?: string; colors?: Record<string, string>; metal?: 'chrome' | 'raw' }
export type PlateMaterial = 'rubber' | 'urethane' | 'cast' | 'hammertone' | 'painted' | 'chrome' | 'steel';
export interface PlateLine {
  id: string; code: number; brand: string; name: string; unit: 'kg' | 'lb';
  group: 'Bumper plates' | 'Iron plates' | 'Calibrated & competition' | 'Change & fractional plates' | 'Wagon wheels';
  material: PlateMaterial; color: string; ink: string; accent?: string;
  face: PlateFace; markings: PlateMarking[];
  /** Flecks (Rogue Fleck, HomeGrown) or marbled streaks (Fringe Savage) in `accent`. */
  pattern?: { kind: 'fleck' | 'speck' | 'marble'; density: number };
  weights: PlateWeight[]; finishes?: PlateFinish[];
  url: string; vendor: string; trademark: string; reconstruction: string;
  /** Legacy plate ids (the default lines) keep their original geometry. */
  legacy?: boolean;
}
const inch = (v: number) => Math.round(v * 25.4 * 100) / 100;
const lbOf = (d: number, w: number, key: string, weight: number, extra: Partial<PlateWeight> = {}): PlateWeight => ({ key, weight, diameter: d, width: w, ...extra });
const W = (weight: number, dIn: number, wIn: number, extra: Partial<PlateWeight> = {}) => lbOf(inch(dIn), inch(wIn), String(weight), weight, extra);
const M = (weight: number, d: number, w: number, extra: Partial<PlateWeight> = {}) => lbOf(d, w, String(weight), weight, extra);
/** Published diameter in mm, width in inches (Rogue and Fringe list 450 mm bumpers with inch widths). */
const Wm = (weight: number, d: number, wIn: number, extra: Partial<PlateWeight> = {}) => lbOf(d, inch(wIn), String(weight), weight, extra);
const IWF = { red: '#c8202f', blue: '#1f58b5', yellow: '#f2c318', green: '#23894a', white: '#eef0ee', black: '#16171a', grey: '#9a9ea3', orange: '#e2702a' } as const;
const WHITE = '#f4f5f2', BLACK = '#141517';
const ROGUE = { vendor: 'Rogue Fitness', trademark: 'Rogue trademarks belong to Rogue Fitness.' };
/** Rogue bumper markings: typeset ROGUE arcs top and bottom (180° symmetric) and the weight left and right. */
const rogueBumper = (style: PlateMarking['style'] = 'print', unit = 'LB', color?: string): PlateMarking[] => [
  { text: 'ROGUE', at: 90, r: .7, h: .16, sx: 1.12, arc: 'out', style, color, back: true },
  { text: 'ROGUE', at: 270, r: .7, h: .16, sx: 1.12, arc: 'out', style, color, back: true },
  { text: `{w}${unit}`, at: 180, r: .66, h: .066, sx: .72, style, color, back: true },
  { text: `{w}${unit}`, at: 0, r: .66, h: .066, sx: .72, rot: 180, style, color, back: true },
];

export const PLATE_LINES: readonly PlateLine[] = [
  {
    id: 'standard-kg', code: 1, brand: 'Standard', name: 'IWF colour KG bumpers', unit: 'kg', group: 'Bumper plates', legacy: true,
    material: 'rubber', color: IWF.red, ink: WHITE, face: { kind: 'bumper' }, markings: [],
    weights: [M(25, 450, 88.9, { color: IWF.red }), M(20, 450, 82.55, { color: IWF.blue }), M(15, 450, 66.675, { color: IWF.yellow }), M(10, 450, 44.45, { color: IWF.green })],
    url: 'https://www.roguefitness.com/kg-rogue-bumpers', vendor: 'BOS STRENGTH', trademark: '',
    reconstruction: 'Default IWF-colour bumper with Rogue HG 2.0 KG published widths (25 kg 3.5", 20 kg 3.25", 15 kg 2.625", 10 kg 1.75") at 450 mm.',
  },
  {
    id: 'standard-lb', code: 2, brand: 'Standard', name: 'Machined iron LB plates', unit: 'lb', group: 'Iron plates', legacy: true,
    material: 'cast', color: '#1d1f21', ink: WHITE, face: { kind: 'iron' }, markings: [],
    weights: [M(45, 448, 38.1), M(35, 360, 38.1), M(25, 300, 38.1), M(10, 228, 30.988)],
    url: 'https://www.roguefitness.com/rogue-machined-olympic-plates', vendor: 'BOS STRENGTH', trademark: '',
    reconstruction: 'Default machined iron plate with Rogue machined Olympic plate published sizes (45/35/25 lb 1.5" wide at 448/360/300 mm, 10 lb 1.22" at 228 mm).',
  },
  // ---------------------------------------------------------------- Rogue bumpers
  {
    id: 'rogue-echo-v2', code: 3, brand: 'Rogue', name: 'Echo Bumper Plates V2', unit: 'lb', group: 'Bumper plates', ...ROGUE,
    material: 'rubber', color: BLACK, ink: WHITE,
    face: { kind: 'bumper', insert: 74, inner: .44, innerDepth: 1.6, edge: 3.5 }, markings: rogueBumper(),
    weights: [Wm(10, 450, .83), Wm(15, 450, 1.04), Wm(25, 450, 1.5), Wm(35, 450, 1.9), Wm(45, 450, 2.4)],
    url: 'https://www.roguefitness.com/rogue-echo-bumper-plates-with-white-text',
    reconstruction: 'Published 450 mm diameter, 50.6 mm collar opening and per-weight widths (10 lb 0.83" to 45 lb 2.40"). Stainless insert OD, the stepped inner zone and print sizes are estimated from Rogue product photos; ROGUE is typeset, not the logo artwork.',
  },
  {
    id: 'rogue-color-echo', code: 4, brand: 'Rogue', name: 'Color Echo Bumper Plates', unit: 'lb', group: 'Bumper plates', ...ROGUE,
    material: 'rubber', color: BLACK, ink: WHITE,
    face: { kind: 'bumper', insert: 74, inner: .44, innerDepth: 1.6, edge: 3.5 }, markings: rogueBumper(),
    weights: [Wm(10, 450, .83), Wm(15, 450, 1.04), Wm(25, 450, 1.5, { color: '#2e9a45' }), Wm(35, 450, 1.93, { color: '#f0c419' }), Wm(45, 450, 2.36, { color: '#1f5fb8' }), Wm(55, 450, 2.75, { color: '#c42a32' })],
    url: 'https://www.roguefitness.com/rogue-color-echo-bumper-plate',
    reconstruction: 'Published 450 mm diameter, 50.4 mm opening and widths 10 lb 0.83" to 55 lb 2.75". Colours read from Rogue photos (10/15 black, 25 green, 35 yellow, 45 blue, 55 red); insert and print sizes estimated.',
  },
  {
    id: 'rogue-mil-echo', code: 5, brand: 'Rogue', name: 'MIL Spec Echo Bumper Plates', unit: 'lb', group: 'Bumper plates', ...ROGUE,
    material: 'rubber', color: '#1a1b1d', ink: '#1a1b1d',
    face: { kind: 'bumper', insert: 74, inner: .44, innerDepth: 2.2, lip: .08, lipDepth: 1.2, edge: 4 }, markings: rogueBumper('raised'),
    weights: [Wm(10, 450, .83), Wm(15, 450, 1.2), Wm(25, 450, 1.6), Wm(35, 450, 2.07), Wm(45, 450, 2.72)],
    url: 'https://www.roguefitness.com/rogue-mil-echo-bumper-plates-black',
    reconstruction: 'Published 450 mm diameter, 50.6 mm opening and widths 10 lb 0.83" to 45 lb 2.72". Black-on-black raised branding and weights, grooved inner zone and raised rim estimated from Rogue photos.',
  },
  {
    id: 'rogue-fleck', code: 6, brand: 'Rogue', name: 'Fleck Plates', unit: 'lb', group: 'Bumper plates', ...ROGUE,
    material: 'rubber', color: BLACK, ink: WHITE, accent: '#8f959b', pattern: { kind: 'fleck', density: .6 },
    face: { kind: 'bumper', insert: 74, inner: .44, innerDepth: 1.6, edge: 3.5 }, markings: rogueBumper(),
    weights: [Wm(10, 450, .85, { accent: '#8e9398' }), Wm(15, 450, 1.2, { accent: '#e8e9e6' }), Wm(25, 450, 1.6, { accent: '#2fa13c' }), Wm(35, 450, 2.08, { accent: '#e8c21a' }), Wm(45, 450, 2.76, { accent: '#1d63c4' }), Wm(55, 450, 3.02, { accent: '#d3232f' })],
    url: 'https://www.roguefitness.com/rogue-fleck-plates',
    reconstruction: 'Published 450 mm diameter, 50.4 mm 304 stainless insert and widths 10 lb 0.85" to 55 lb 3.02", with black + grey/white/green/yellow/blue/red fleck per weight. Fleck placement is a deterministic stand-in pattern, not the moulded pattern of any one plate.',
  },
  {
    id: 'rogue-hg2-kg', code: 7, brand: 'Rogue', name: 'HG 2.0 KG Bumper Plates', unit: 'kg', group: 'Bumper plates', ...ROGUE,
    material: 'rubber', color: '#18191b', ink: '#18191b',
    face: { kind: 'bumper', insert: 76, inner: .45, innerDepth: 2.4, lip: .07, lipDepth: 1, edge: 4 },
    markings: [
      { text: 'ROGUE', at: 90, r: .7, h: .13, sx: 1.12, arc: 'out', style: 'raised', back: true }, { text: 'ROGUE', at: 270, r: .7, h: .13, sx: 1.12, arc: 'out', style: 'raised', back: true },
      { text: 'HG\n{w}\nKG', at: 180, r: .69, h: .062, style: 'raised', back: true, spacing: .25 }, { text: 'HG\n{w}\nKG', at: 0, r: .69, h: .062, rot: 180, style: 'raised', back: true, spacing: .25 },
    ],
    weights: [M(25, 450, inch(3.5)), M(20, 450, inch(3.25)), M(15, 450, inch(2.625)), M(10, 450, inch(1.75)), M(5, 450, inch(1))],
    url: 'https://www.roguefitness.com/kg-rogue-bumpers',
    reconstruction: 'Published 450 mm diameter, 50.4 mm opening and widths 5 kg 1" to 25 kg 3.5" (the same widths as the default IWF-colour line). Black-on-black raised ROGUE arcs and boxed HG/weight/KG blocks estimated from Rogue photos.',
  },
  {
    id: 'rogue-hg2-lb', code: 8, brand: 'Rogue', name: 'HG 2.0 Bumper Plates', unit: 'lb', group: 'Bumper plates', ...ROGUE,
    material: 'rubber', color: '#18191b', ink: '#18191b',
    face: { kind: 'bumper', insert: 76, inner: .45, innerDepth: 2.4, lip: .07, lipDepth: 1, edge: 4 },
    markings: [
      { text: 'ROGUE', at: 90, r: .7, h: .13, sx: 1.12, arc: 'out', style: 'raised', back: true }, { text: 'ROGUE', at: 270, r: .7, h: .13, sx: 1.12, arc: 'out', style: 'raised', back: true },
      { text: 'HG\n{w}\nLB', at: 180, r: .69, h: .062, style: 'raised', back: true, spacing: .25 }, { text: 'HG\n{w}\nLB', at: 0, r: .69, h: .062, rot: 180, style: 'raised', back: true, spacing: .25 },
    ],
    weights: [Wm(10, 450, 1), Wm(15, 450, 1.37), Wm(25, 450, 2), Wm(35, 450, 2.75), Wm(45, 450, 3.25), Wm(55, 450, 3.75)],
    url: 'https://www.roguefitness.com/rogue-hg-2-0-bumper-plates',
    reconstruction: 'Published 450 mm diameter, 50.4 mm opening and widths 10 lb 1.00" to 55 lb 3.75". Raised black branding and weight blocks estimated from Rogue photos.',
  },
  {
    id: 'rogue-lb-competition', code: 9, brand: 'Rogue', name: 'LB Competition Plates', unit: 'lb', group: 'Calibrated & competition', ...ROGUE,
    material: 'rubber', color: IWF.green, ink: WHITE,
    face: { kind: 'competition', disc: .5, discDepth: 4, insert: 64, edge: 4, lip: .04, lipDepth: .9 },
    markings: [
      { text: 'ROGUE', at: 90, r: .77, h: .12, sx: 1.12, arc: 'out', style: 'raised', color: WHITE }, { text: 'ROGUE', at: 270, r: .77, h: .12, sx: 1.12, arc: 'out', style: 'raised', color: WHITE },
      { text: '{w}', at: 185, r: .745, h: .1, sx: .9, style: 'raised', color: WHITE }, { text: '{w}', at: 5, r: .745, h: .1, sx: .9, rot: 180, style: 'raised', color: WHITE },
      { text: 'COMPETITION\nLB', at: 199, r: .745, h: .03, style: 'raised', color: WHITE, spacing: .4 }, { text: 'COMPETITION\nLB', at: 19, r: .745, h: .03, rot: 180, style: 'raised', color: WHITE, spacing: .4 },
    ],
    weights: [Wm(25, 450, 1.25, { color: '#2a9a47' }), Wm(35, 450, 1.7, { color: '#f2c51a' }), Wm(45, 450, 2.15, { color: '#1f5db6' }), Wm(55, 450, 2.5, { color: '#c7262f' })],
    url: 'https://www.roguefitness.com/rogue-competition-plates',
    reconstruction: 'Published 450 mm diameter, 50.4 mm opening, widths 25 lb 1.25" to 55 lb 2.50" and IWF colours. The chrome steel disc (~225 mm) and raised white lettering sizes are estimated from Rogue photos.',
  },
  // ---------------------------------------------------------------- Rogue iron and steel
  {
    id: 'rogue-deep-dish', code: 10, brand: 'Rogue', name: 'Deep Dish Plates', unit: 'lb', group: 'Iron plates', ...ROGUE,
    material: 'cast', color: '#1b1c1e', ink: '#1b1c1e',
    face: { kind: 'iron', lip: .11, dish: .62, boss: 96, edge: 2.5, spokes: { n: 4, w: 13, minD: 440, deg: 45 } },
    markings: [
      { text: 'ROGUE', at: 90, r: .66, h: .13, sx: 1.12, arc: 'out', style: 'raised' }, { text: 'ROGUE', at: 270, r: .66, h: .13, sx: 1.12, arc: 'out', style: 'raised' },
      { text: '{w}', at: 180, r: .58, h: .13, style: 'raised' }, { text: '{w}', at: 0, r: .58, h: .13, rot: 180, style: 'raised' },
      { text: 'MADE IN USA', at: 90, r: .42, h: .04, arc: 'out', style: 'raised', minD: 270 },
    ],
    weights: [M(45, 450, 50), M(35, 360, 34.5), M(25, 276, 34.5), M(10, 229, 20), M(5, 190, 14.5), M(100, 450, 75)],
    url: 'https://www.roguefitness.com/rogue-deep-dish-plates',
    reconstruction: 'Published diameters and widths per weight (5 lb 190 × 14.5 mm to 100 lb 450 × 75 mm), 50 mm opening, machined back, hub and rim. Lip width, dish depth, the X spokes on 45/100 lb and raised lettering sizes are estimated from Rogue photos.',
  },
  {
    id: 'rogue-deep-dish-arnold', code: 11, brand: 'Rogue', name: 'Deep Dish Plates – Arnold Edition', unit: 'lb', group: 'Iron plates', ...ROGUE,
    material: 'cast', color: '#1b1c1e', ink: '#1b1c1e',
    face: { kind: 'iron', lip: .11, dish: .62, boss: 96, edge: 2.5, spokes: { n: 4, w: 13, deg: 45 }, medallions: { n: 2, r: .5, size: .2, deg: 90 } },
    markings: [
      { text: 'ROGUE', at: 90, r: .72, h: .12, sx: 1.12, arc: 'out', style: 'raised' }, { text: 'ROGUE', at: 270, r: .72, h: .12, sx: 1.12, arc: 'out', style: 'raised' },
      { text: '{w}', at: 180, r: .56, h: .13, style: 'raised' }, { text: '{w}', at: 0, r: .56, h: .13, rot: 180, style: 'raised' },
    ],
    weights: [M(45, 450, 50)],
    url: 'https://www.roguefitness.com/rogue-deep-dish-plates',
    reconstruction: 'Published 450 mm × 50 mm 45 lb only, machined rim, back and hub. The embossed Schwarzenegger silhouettes are represented by abstract raised medallions (the likeness is not reproduced); spoke and letter sizes estimated from photos.',
  },
  {
    id: 'rogue-calibrated-kg', code: 12, brand: 'Rogue', name: 'Calibrated KG Steel Plates 2.0', unit: 'kg', group: 'Calibrated & competition', ...ROGUE,
    material: 'painted', color: IWF.red, ink: WHITE,
    face: { kind: 'calibrated', lip: .035, boss: 88, spokes: { n: 4, w: 9, minD: 300, deg: 45 }, edge: 1.2 },
    markings: [
      { text: 'ROGUE', at: 90, r: .75, h: .11, sx: 1.12, arc: 'out', style: 'raised', color: WHITE }, { text: 'ROGUE', at: 270, r: .75, h: .11, sx: 1.12, arc: 'out', style: 'raised', color: WHITE },
      { text: '{w}', at: 186, r: .6, h: .18, sx: .82, style: 'raised', color: WHITE }, { text: '{w}', at: 6, r: .6, h: .18, sx: .82, rot: 180, style: 'raised', color: WHITE },
      { text: 'KG', at: 207, r: .64, h: .06, style: 'raised', color: WHITE }, { text: 'KG', at: 27, r: .64, h: .06, rot: 180, style: 'raised', color: WHITE },
      { text: 'EST. 2006', at: 90, r: .5, h: .04, style: 'raised', color: WHITE, minD: 300 },
    ],
    weights: [
      M(50, 450, 54, { color: '#1b1c1f', est: 'width' }), M(25, 450, 27, { color: '#9c1c29' }), M(20, 450, 22.5, { color: '#1c4fa0' }), M(15, 400, 21, { color: '#e6b91e' }), M(10, 325, 21, { color: '#23874a' }),
      M(5, 228, 16, { color: '#eceeea', ink: '#141517', est: 'width' }), M(2.5, 190, 13, { color: '#1b1c1f', est: 'width' }), M(1.25, 160, 10, { metal: 'chrome', ink: '#141517', est: 'width' }),
      M(.5, 134, 7, { metal: 'chrome', ink: '#141517', est: 'width' }), M(.25, 112, 5, { metal: 'chrome', ink: '#141517', est: 'width' }),
    ],
    url: 'https://www.roguefitness.com/rogue-calibrated-kg-steel-plates',
    reconstruction: 'Published diameters 450/450/450/400/325/228/190/160/134/112 mm, 50.4 mm opening; 25/20/15/10 kg widths 27/22.5/21/21 mm (Garage Gym Reviews). 50 kg and change-plate widths are estimated; raised cross, hub collar and lettering sizes estimated from Rogue photos.',
  },
  {
    id: 'rogue-calibrated-lb', code: 13, brand: 'Rogue', name: 'Calibrated LB Steel Plates 2.0', unit: 'lb', group: 'Calibrated & competition', ...ROGUE,
    material: 'painted', color: IWF.red, ink: WHITE,
    face: { kind: 'calibrated', lip: .035, boss: 88, spokes: { n: 4, w: 9, minD: 300, deg: 45 }, edge: 1.2 },
    markings: [
      { text: 'ROGUE', at: 90, r: .75, h: .11, sx: 1.12, arc: 'out', style: 'raised', color: WHITE }, { text: 'ROGUE', at: 270, r: .75, h: .11, sx: 1.12, arc: 'out', style: 'raised', color: WHITE },
      { text: '{w}', at: 186, r: .6, h: .18, sx: .82, style: 'raised', color: WHITE }, { text: '{w}', at: 6, r: .6, h: .18, sx: .82, rot: 180, style: 'raised', color: WHITE },
      { text: 'LB', at: 207, r: .64, h: .06, style: 'raised', color: WHITE }, { text: 'LB', at: 27, r: .64, h: .06, rot: 180, style: 'raised', color: WHITE },
      { text: 'EST. 2006', at: 90, r: .5, h: .04, style: 'raised', color: WHITE, minD: 300 },
    ],
    weights: [
      M(55, 450, 27, { color: '#931b28', est: 'width' }), M(45, 450, 22.5, { color: '#1c4fa0', est: 'width' }), M(35, 400, 21, { color: '#e6b91e', est: 'width' }), M(25, 325, 21, { color: '#23874a', est: 'width' }),
      M(10, 228, 17, { color: '#eceeea', ink: '#141517', est: 'width' }), M(5, 190, 14, { color: '#1b1c1f', est: 'width' }), M(2.5, 160, 11, { metal: 'chrome', ink: '#141517', est: 'width' }),
      M(1, 134, 8, { metal: 'chrome', ink: '#141517', est: 'width' }), M(.5, 112, 6, { metal: 'chrome', ink: '#141517', est: 'width' }), M(.25, 90, 5, { metal: 'chrome', ink: '#141517', est: 'width' }),
    ],
    url: 'https://www.roguefitness.com/rogue-calibrated-lb-steel-plates',
    reconstruction: 'Published diameters 450/450/400/325/228/190/160/134/112/90 mm and 50.4 mm opening. Rogue does not publish LB widths; they are estimated from the KG line (55 ≈ 25 kg, 45 ≈ 20 kg) and photos.',
  },
  {
    id: 'rogue-lb-change', code: 14, brand: 'Rogue', name: 'LB Change Plates', unit: 'lb', group: 'Change & fractional plates', ...ROGUE,
    material: 'rubber', color: WHITE, ink: '#18191b',
    face: { kind: 'change', insert: 66, inner: .62, innerDepth: .8, edge: 2 },
    markings: [
      { text: 'ROGUE', at: 90, r: .77, h: .15, sx: 1.12, arc: 'out', back: true }, { text: 'ROGUE', at: 270, r: .77, h: .15, sx: 1.12, arc: 'out', back: true },
      { text: '{w}\nLB', at: 180, r: .75, h: .085, back: true, spacing: .5 }, { text: '{w}\nLB', at: 0, r: .75, h: .085, rot: 180, back: true, spacing: .5 },
    ],
    weights: [M(10, 230, 26, { color: '#f1f2ef' }), M(5, 190, 19, { color: '#1f5db7', ink: WHITE }), M(2.5, 162, 15, { color: '#2ea64a', ink: WHITE }), M(1.25, 133.3, 10, { color: '#f1f2ef' })],
    url: 'https://www.roguefitness.com/rogue-lb-change-plates',
    reconstruction: 'Published diameters and widths (1.25 lb 133.3 × 10 mm to 10 lb 230 × 26 mm), colours and 50.4 mm opening; rubber over a metal centre. Hub collar size and print layout estimated from Rogue photos.',
  },
  {
    id: 'rogue-26er', code: 15, brand: 'Rogue', name: "26'ER Wagon Wheels", unit: 'lb', group: 'Wagon wheels', ...ROGUE,
    material: 'rubber', color: '#151618', ink: WHITE,
    face: { kind: 'bumper', insert: 80, inner: .42, innerDepth: 3, edge: 6, pockets: { n: 4, deg: 18, depth: 16, r: .085 } },
    markings: [
      { text: 'ROGUE', at: 90, r: .72, h: .13, sx: 1.12, arc: 'out', back: true }, { text: 'ROGUE', at: 270, r: .72, h: .13, sx: 1.12, arc: 'out', back: true },
      { text: '{w}\nLB', at: 180, r: .56, h: .07, back: true, spacing: .45 }, { text: '{w}\nLB', at: 0, r: .56, h: .07, rot: 180, back: true, spacing: .45 },
    ],
    weights: [W(70, 26, 3.97)],
    url: 'https://www.roguefitness.com/rogue-26-er-wagon-wheel-pair',
    reconstruction: 'Published 26" diameter, 3.97" width, 70 lb, 50.6 mm hub opening and recycled rubber with recessed grip points. Pocket count and size, inner zone and print sizes estimated from Rogue photos.',
  },
  // ---------------------------------------------------------------- Iron
  {
    id: 'strength-co-iron', code: 16, brand: 'The Strength Co.', name: 'Olympic Iron Plates', unit: 'lb', group: 'Iron plates',
    vendor: 'The Strength Co.', trademark: 'The Strength Co. trademarks belong to The Strength Co.',
    material: 'cast', color: '#1c1d1f', ink: '#1c1d1f',
    face: { kind: 'iron', lip: .1, dish: .55, boss: 100, edge: 2, spokes: { n: 4, w: 11, minD: 225, deg: 45 }, plainBelow: 210 },
    markings: [
      { text: 'THE\nSTRENGTH\nCO.', at: 90, r: .56, h: .065, style: 'raised', spacing: .35, minD: 225 }, { text: 'THE\nSTRENGTH\nCO.', at: 270, r: .56, h: .065, rot: 180, style: 'raised', spacing: .35, minD: 225 },
      { text: '{w}', at: 180, r: .6, h: .12, style: 'raised' }, { text: '{w}', at: 0, r: .6, h: .12, rot: 180, style: 'raised' },
      { text: 'MADE IN USA', at: 90, r: .36, h: .045, arc: 'out', style: 'raised', minD: 225 },
    ],
    weights: [W(45, 17.75, 1.25), W(35, 14.75, 1.25), W(25, 11.75, 1.25), W(10, 9.13, .88), W(5, 8, .63), W(2.5, 6.5, .5), W(1.25, 5, .3), W(100, 17.75, 2.25)],
    url: 'https://thestrengthco.com/products/olympic-barbell-plates',
    reconstruction: 'Published diameters and widths per weight (1.25 lb 5 × 0.3" to 100 lb 17.75 × 2.25"), 1.99" bore, e-coat. Dish depth, X spoke width and raised lettering layout estimated from The Strength Co. photos.',
  },
  {
    id: 'cap-olympic-iron', code: 17, brand: 'CAP Barbell', name: '2" Olympic Plate', unit: 'lb', group: 'Iron plates',
    vendor: 'CAP Barbell', trademark: 'CAP trademarks belong to CAP Barbell.',
    material: 'hammertone', color: '#56595c', ink: '#c9ccce',
    face: { kind: 'iron', lip: .09, dish: .5, boss: 92, edge: 2.5, back: .3, spokes: { n: 4, w: 14, minD: 350, deg: 45 } },
    markings: [
      { text: 'STANDARD', at: 90, r: .72, h: .1, arc: 'out', style: 'raised', color: '#c4c7c9' }, { text: 'BARBELL', at: 270, r: .72, h: .1, arc: 'in', style: 'raised', color: '#c4c7c9', minD: 350 },
      { text: '{w}\nLB.', at: 180, r: .56, h: .1, style: 'raised', color: '#c4c7c9', spacing: .35, minD: 350 }, { text: '{k}\nKG.', at: 0, r: .56, h: .1, style: 'raised', color: '#c4c7c9', spacing: .35, minD: 350 },
      { text: '{w}LBS  {k}KGS', at: 270, r: .72, h: .1, arc: 'in', style: 'raised', color: '#c4c7c9', maxD: 349 },
    ],
    weights: [W(45, 17.75, 1.5), W(35, 14, 1.5), W(25, 11, 1.5), W(10, 9, 1), W(5, 8, .75), W(2.5, 6.5, .5), W(100, 17.75, 2.5)],
    finishes: [{ id: 'gray', label: 'Gray (OPG)', color: '#56595c', ink: '#c9ccce' }, { id: 'black', label: 'Black (OP)', color: '#232427', ink: '#b9bcbe' }],
    url: 'https://capbarbell.com/products/cap-barbell-cast-iron-olympic-weight-plate',
    reconstruction: 'Diameters and thicknesses per weight from Iron Company\'s CAP OPG#2 table (2.5 lb 6.5 × 0.5" to 100 lb 17.75 × 2.5"). Hammertone finish, silver-painted raised STANDARD/BARBELL lettering, rib (spoke) and dish depth estimated from CAP photos.',
  },
  {
    id: 'cap-grip', code: 18, brand: 'CAP Barbell', name: '2" Olympic Grip Plate', unit: 'lb', group: 'Iron plates',
    vendor: 'CAP Barbell', trademark: 'CAP trademarks belong to CAP Barbell.',
    material: 'hammertone', color: '#2a2b2e', ink: '#c3c6c9',
    face: { kind: 'iron', lip: .07, dish: .35, boss: 84, edge: 2.5, back: .2, grips: { kind: 'tri', n: 3, r: .72, size: .2, deg: 90 } },
    markings: [
      { text: 'CAP', at: 90, r: .4, h: .11, style: 'raised', color: '#c3c6c9', badge: true },
      { text: '{w}', at: 270, r: .42, h: .12, style: 'raised', color: '#c3c6c9', badge: true },
    ],
    weights: [W(45, 17.8, 1.6, { est: 'diameter, width' }), W(35, 15.2, 1.5, { est: 'diameter, width' }), W(25, 12.4, 1.3, { est: 'diameter, width' }), W(10, 9.8, 1.1, { est: 'diameter, width' }), W(5, 8.4, .9, { est: 'diameter, width' }), W(2.5, 6.9, .75, { est: 'diameter, width' })],
    url: 'https://capbarbell.com/products/cap-barbell-cast-iron-olympic-grip-plate',
    reconstruction: 'CAP publishes weights, the 2" opening, three grip openings and silver-painted weights but no per-weight sizes: diameters and widths are estimated from photos against the 2" bore. Typeset CAP stands in for the logo artwork.',
  },
  {
    id: 'york-legacy-milled', code: 19, brand: 'York Barbell', name: 'Legacy Precision Milled Olympic Plates', unit: 'lb', group: 'Iron plates',
    vendor: 'York Barbell', trademark: 'York trademarks belong to York Barbell.',
    material: 'cast', color: '#1d1e20', ink: '#d9dbdc',
    face: { kind: 'iron', lip: .09, dish: .5, boss: 96, edge: 1.5, spokes: { n: 4, w: 16, minD: 290, deg: 45 } },
    markings: [
      { text: 'YORK', at: 90, r: .77, h: .12, arc: 'out', style: 'raised', color: '#e2e3e3' },
      { text: '{w}', at: 90, r: .6, h: .075, style: 'raised', color: '#e2e3e3', minD: 290 },
      { text: 'BARBELL', at: 180, r: .78, h: .085, arc: 'out', style: 'raised', minD: 290 },
      { text: 'OLYMPIC', at: 0, r: .78, h: .085, arc: 'out', style: 'raised', minD: 290 },
      { text: 'STANDARD', at: 270, r: .78, h: .085, arc: 'in', style: 'raised', minD: 290 },
      { text: '{w}', at: 270, r: .62, h: .12, style: 'raised', color: '#e2e3e3', maxD: 289 },
    ],
    weights: [W(45, 17.5, 1.5), W(35, 14.875, 1.375), W(25, 12, 1.25), W(10, 9.125, 1), W(5, 7.5, .75), W(2.5, 6.5, .4375)],
    url: 'https://yorkbarbell.com/product/2-inch-legacy-cast-iron-precision-milled-olympic-plate/',
    reconstruction: 'Published diameters and thicknesses (2.5 lb 6.5 × 7/16" to 45 lb 17.5 × 1.5"), milled back and edge. Dish, spoke width and the white-filled YORK/weight lettering are estimated from York photos; YORK is typeset, not the logo artwork.',
  },
  {
    id: 'wio-machined', code: 20, brand: 'Weight It Out', name: 'Cast Iron Machined Plates', unit: 'lb', group: 'Iron plates',
    vendor: 'Weight It Out', trademark: 'Weight It Out trademarks belong to Weight It Out.',
    material: 'cast', color: '#1f2022', ink: '#1f2022',
    face: { kind: 'flat', edge: 1, grips: { kind: 'slot', n: 2, r: .8, size: .34, deg: 90, minD: 300 } },
    markings: [
      { text: 'WEIGHT IT OUT', at: 90, r: .55, h: .085, arc: 'out', style: 'deboss' },
      { text: 'MADE IN THE USA', at: 270, r: .55, h: .075, arc: 'in', style: 'deboss' },
      { text: '{w}\nLBS', at: 180, r: .5, h: .08, style: 'deboss', spacing: .4 }, { text: '{k}\nKG', at: 0, r: .5, h: .08, style: 'deboss', spacing: .4 },
    ],
    weights: [W(45, 17.72, .75), W(25, 14.5, .625), W(10, 8.9, .625), W(5, 7, .5), W(2.5, 5.6, .4), W(100, 17.72, 1.75)],
    finishes: [
      { id: 'black', label: 'Black coated', color: '#1f2022' }, { id: 'clear', label: 'Clear coat', color: '#8d9093', metal: 'raw' },
      { id: 'blue', label: 'Custom blue', color: '#1f4fa8' }, { id: 'red', label: 'Custom red', color: '#b8232a' }, { id: 'green', label: 'Custom green', color: '#1d6b3a' },
      { id: 'purple', label: 'Custom purple', color: '#8a2d9c' }, { id: 'white', label: 'Custom white', color: '#e6e7e5' }, { id: 'orange', label: 'Custom orange', color: '#e0701f' }, { id: 'yellow', label: 'Custom yellow', color: '#e8c12a' },
    ],
    url: 'https://www.weightitout.us/products/cast-iron-machined-weight-plate-pairs',
    reconstruction: 'Published diameters and thicknesses (2.5 lb 5.6 × 0.4" to 100 lb 17.72 × 1.75"), dual handle slots and nine coating colours. Slot size and debossed lettering layout estimated from Weight It Out photos.',
  },
  {
    id: 'ivanko-om', code: 21, brand: 'Ivanko', name: 'OM Series Olympic Machined Plates', unit: 'lb', group: 'Iron plates',
    vendor: 'Ivanko Barbell Company', trademark: 'Ivanko trademarks belong to Ivanko Barbell Company.',
    material: 'hammertone', color: '#4a5159', ink: '#c3c7ca',
    face: { kind: 'iron', lip: .085, dish: .45, boss: 92, edge: 1.2, spokes: { n: 3, w: 16, minD: 290, deg: 270 } },
    markings: [
      { text: 'IVANKO', at: 90, r: .77, h: .11, arc: 'out', style: 'raised', color: '#b9bec2' },
      { text: 'BARBELL', at: 335, r: .77, h: .1, arc: 'out', style: 'raised', color: '#b9bec2', minD: 290 },
      { text: 'COMPANY', at: 208, r: .77, h: .1, arc: 'out', style: 'raised', color: '#b9bec2', minD: 290 },
      { text: '{w}', at: 90, r: .57, h: .085, style: 'raised', color: '#b9bec2', minD: 290 },
      { text: '{w}', at: 270, r: .7, h: .12, style: 'raised', color: '#b9bec2', maxD: 289 },
    ],
    weights: [W(45, 17.75, 1.5625), W(35, 14.1875, 1.5625), W(25, 11.8125, 1.5625), W(10, 9, 1.25), W(5, 7.75, .875), W(2.5, 6.4375, .625), W(1.25, 5.25, .5)],
    url: 'https://ivankobarbell.com/products/om-series-olympic-machined-plate',
    reconstruction: 'Published diameters and thicknesses (1.25 lb 5-1/4 × 1/2" to 45 lb 17-3/4 × 1-9/16"), machined back, edge and rim. 1985 grey hammertone, three-spoke dish and machined raised lettering estimated from Ivanko photos.',
  },
  // ---------------------------------------------------------------- REP
  {
    id: 'rep-equalizer', code: 22, brand: 'REP Fitness', name: 'Equalizer Urethane-Coated Plates', unit: 'lb', group: 'Iron plates',
    vendor: 'REP Fitness', trademark: 'REP trademarks belong to REP Fitness.',
    material: 'urethane', color: '#1a1b1e', ink: WHITE,
    face: { kind: 'iron', lip: .07, dish: .12, back: .12, boss: 96, edge: 4, insert: 78, grips: { kind: 'hex', n: 6, r: .64, size: .19, minD: 300, deg: 90 }, spokes: { n: 4, w: 5, deg: 0, minD: 150 } },
    markings: [
      { text: 'REP', at: 90, r: .34, h: .1, style: 'inlay', color: WHITE },
      { text: '{w}', at: 270, r: .36, h: .1, style: 'inlay', color: WHITE },
    ],
    weights: [W(45, 17.7, 1.8), W(35, 14.3, 2), W(25, 12.25, 2), W(10, 8.8, 1.4), W(5, 7.7, 1), W(2.5, 6.25, .9)],
    url: 'https://repfitness.com/products/urethane-coated-equalizer-plate-pairs',
    reconstruction: 'Published diameters and widths from REP\'s dimension drawing (2.5 lb 6.25 × 0.9" to 45 lb 17.7 × 1.8"), six symmetrical grip holes, steel hub and debossed white-inlay markings. Hex size and rib layout estimated from REP photos.',
  },
  {
    id: 'rep-change', code: 23, brand: 'REP Fitness', name: 'Change Plates (LB)', unit: 'lb', group: 'Change & fractional plates',
    vendor: 'REP Fitness', trademark: 'REP trademarks belong to REP Fitness.',
    material: 'rubber', color: WHITE, ink: '#18191b',
    face: { kind: 'change', insert: 80, inner: .5, innerDepth: .8, edge: 2.5, insertColor: '#b9bec2' },
    markings: [
      { text: 'REP FITNESS', at: 90, r: .74, h: .1, arc: 'out', back: true }, { text: 'REP FITNESS', at: 270, r: .74, h: .1, arc: 'out', back: true },
      { text: '{w}\nLB', at: 180, r: .74, h: .085, back: true, spacing: .45 }, { text: '{w}\nLB', at: 0, r: .74, h: .085, rot: 180, back: true, spacing: .45 },
    ],
    weights: [W(10, 8.75, 1, { color: '#f0f1ee' }), W(5, 8.25, .75, { color: '#153e8a', ink: WHITE }), W(2.5, 6.25, .6, { color: '#3fb14b', ink: WHITE }), W(1.25, 5.25, .5, { color: '#f0f1ee' })],
    url: 'https://repfitness.com/products/change-plates-lb',
    reconstruction: 'Published diameters and widths from REP\'s drawing (1.25 lb 5.25 × 0.5" to 10 lb 8.75 × 1.0"), colours (white/green/blue/white) and a metal insert with rubber coating. Insert ring size and print sizes estimated from REP photos.',
  },
  {
    id: 'rep-black-bumper', code: 24, brand: 'REP Fitness', name: 'Black Bumper Plates (LB)', unit: 'lb', group: 'Bumper plates',
    vendor: 'REP Fitness', trademark: 'REP trademarks belong to REP Fitness.',
    material: 'rubber', color: '#141517', ink: WHITE,
    face: { kind: 'bumper', insert: 72, inner: .5, innerDepth: 1.8, edge: 4, lip: .05, lipDepth: .8 },
    markings: [
      { text: 'REP FITNESS', at: 90, r: .72, h: .105, arc: 'out', style: 'raised', color: WHITE, back: true }, { text: 'REP FITNESS', at: 270, r: .72, h: .105, arc: 'out', style: 'raised', color: WHITE, back: true },
      { text: '{w}LB', at: 180, r: .7, h: .045, style: 'raised', color: WHITE, back: true }, { text: '{w}LB', at: 0, r: .7, h: .045, rot: 180, style: 'raised', color: WHITE, back: true },
    ],
    weights: [W(10, 17.7, 1), W(15, 17.7, 1.2), W(25, 17.7, 1.8), W(35, 17.7, 2.4), W(45, 17.7, 2.8)],
    url: 'https://repfitness.com/products/black-bumper-plate-pairs',
    reconstruction: 'Published 17.7" diameter and widths from REP\'s drawing (10 lb 1.0" to 45 lb 2.8"), hooked steel insert and white raised lettering. Insert and letter sizes estimated from REP photos.',
  },
  {
    id: 'rep-old-school', code: 25, brand: 'REP Fitness', name: 'Old School Iron Plates', unit: 'lb', group: 'Iron plates',
    vendor: 'REP Fitness', trademark: 'REP trademarks belong to REP Fitness.',
    material: 'cast', color: '#202124', ink: '#b8bcbf',
    face: { kind: 'iron', lip: .07, dish: .55, boss: 92, edge: 2, spokes: { n: 4, w: 12, minD: 350, deg: 45 } },
    markings: [
      { text: 'BARBELL', at: 90, r: .74, h: .1, arc: 'out', style: 'raised', color: '#b8bcbf', minD: 350 }, { text: 'STANDARD', at: 270, r: .74, h: .1, arc: 'in', style: 'raised', color: '#b8bcbf', minD: 350 },
      { text: '{w}\nLBS', at: 180, r: .55, h: .1, style: 'raised', color: '#b8bcbf', spacing: .3, minD: 350 }, { text: '{k}\nKGS', at: 0, r: .55, h: .1, style: 'raised', color: '#b8bcbf', spacing: .3, minD: 350 },
      { text: 'STANDARD', at: 90, r: .72, h: .11, arc: 'out', style: 'raised', color: '#b8bcbf', maxD: 349 },
      { text: '{w}LBS  {k}KGS', at: 270, r: .72, h: .1, arc: 'in', style: 'raised', color: '#b8bcbf', maxD: 349 },
    ],
    weights: [W(45, 17.7, 1.5), W(35, 14.3, 1.5), W(25, 10.7, 1.5), W(10, 8.8, 1), W(5, 7.7, .75), W(2.5, 6.25, .5)],
    url: 'https://repfitness.com/products/old-school-iron-plate-pairs',
    reconstruction: 'Published diameters and widths from REP\'s drawing (2.5 lb 6.25 × 0.5" to 45 lb 17.7 × 1.5"); one-sided deep lip, matte finish and raised silver lettering. Spoke width and dish depth estimated from REP photos.',
  },
  // ---------------------------------------------------------------- Other bumpers
  {
    id: 'fringe-savage', code: 26, brand: 'Fringe Sport', name: 'Savage Bumper Plates', unit: 'lb', group: 'Bumper plates',
    vendor: 'Fringe Sport', trademark: 'Fringe Sport trademarks belong to Fringe Sport.',
    material: 'rubber', color: '#1f5db4', ink: WHITE, accent: '#101114', pattern: { kind: 'marble', density: .42 },
    face: { kind: 'bumper', insert: 74, inner: .5, innerDepth: 1.8, edge: 5, lip: .06, lipDepth: 2 },
    markings: [
      { text: 'FRINGE SPORT', at: 90, r: .72, h: .11, arc: 'out', back: true }, { text: 'FRINGE SPORT', at: 270, r: .72, h: .11, arc: 'out', back: true },
      { text: '{w}', at: 5, r: .74, h: .085, back: true }, { text: 'TRAINING', at: -3.5, r: .74, h: .028, back: true }, { text: 'LB', at: -9, r: .74, h: .045, back: true },
      { text: '{w}', at: 185, r: .74, h: .085, rot: 180, back: true }, { text: 'TRAINING', at: 176.5, r: .74, h: .028, rot: 180, back: true }, { text: 'LB', at: 171, r: .74, h: .045, rot: 180, back: true },
    ],
    weights: [Wm(10, 445, 1.05, { color: '#8c9196', accent: '#3d4145' }), Wm(15, 450, 1.2, { color: '#e2702a', accent: '#6b2f0d' }), Wm(25, 450, 1.87, { color: '#2a9a3f', accent: '#0f3a18' }), Wm(35, 450, 2.35, { color: '#e9c21d', accent: '#5c4a06' }), Wm(45, 450, 2.9, { color: '#1f5db4', est: 'width', accent: '#0b1f45' }), Wm(55, 450, 3.2, { color: '#c3292f', accent: '#4a0c10' })],
    url: 'https://www.fringesport.com/products/savage-bumper-plate-pairs',
    reconstruction: 'Published 450 mm (10 lb 445 mm) diameter, 50.3 mm hooked steel insert, deeper lip and widths 10 lb 1.05" to 55 lb 3.2". Savage lists 45 lb at 2.35" (a duplicate of the 35 lb figure); the Fringe black bumper 2.9" is used. Marble streaks are a deterministic stand-in pattern.',
  },
  {
    id: 'fringe-black', code: 27, brand: 'Fringe Sport', name: 'Black Bumper Plates', unit: 'lb', group: 'Bumper plates',
    vendor: 'Fringe Sport', trademark: 'Fringe Sport trademarks belong to Fringe Sport.',
    material: 'rubber', color: '#17181a', ink: '#17181a',
    face: { kind: 'bumper', insert: 74, inner: .5, innerDepth: 1.8, edge: 6, lip: .045, lipDepth: 1 },
    markings: [
      { text: 'FRINGE SPORT', at: 90, r: .72, h: .11, arc: 'out', style: 'raised', back: true }, { text: 'FRINGE SPORT', at: 270, r: .72, h: .11, arc: 'out', style: 'raised', back: true },
      { text: '{w}', at: 5, r: .74, h: .085, style: 'raised', back: true }, { text: 'TRAINING', at: -3.5, r: .74, h: .028, style: 'raised', back: true }, { text: 'LB', at: -9, r: .74, h: .045, style: 'raised', back: true },
      { text: '{w}', at: 185, r: .74, h: .085, rot: 180, style: 'raised', back: true }, { text: 'TRAINING', at: 176.5, r: .74, h: .028, rot: 180, style: 'raised', back: true }, { text: 'LB', at: 171, r: .74, h: .045, rot: 180, style: 'raised', back: true },
    ],
    weights: [Wm(10, 445, 1.05), Wm(15, 450, 1.2), Wm(25, 450, 1.87), Wm(35, 450, 2.35), Wm(45, 450, 2.9), Wm(55, 450, 3.2)],
    url: 'https://www.fringesport.com/products/onefitwonder-black-bumper-plates-pairs',
    reconstruction: 'Published 450 mm (10 lb 445 mm) diameter, 50.4 mm steel insert, bevelled edge and widths 10 lb 1.05" to 55 lb 3.2". Raised black lettering sizes estimated from Fringe Sport photos.',
  },
  {
    id: 'cap-bumper', code: 28, brand: 'CAP Barbell', name: 'Olympic Rubber Bumper Plate', unit: 'lb', group: 'Bumper plates',
    vendor: 'CAP Barbell', trademark: 'CAP trademarks belong to CAP Barbell.',
    material: 'rubber', color: '#161719', ink: '#161719',
    face: { kind: 'bumper', insert: 70, inner: .46, innerDepth: 2, edge: 4, lip: .05, lipDepth: 1 },
    markings: [
      { text: 'CAP', at: 90, r: .72, h: .14, arc: 'out', style: 'raised', back: true }, { text: 'BARBELL', at: 270, r: .72, h: .11, arc: 'in', style: 'raised', back: true },
      { text: '{w}\nLB', at: 180, r: .7, h: .05, style: 'raised', back: true, spacing: .3 }, { text: '{k}\nKG', at: 0, r: .7, h: .05, style: 'raised', back: true, spacing: .3 },
    ],
    weights: [W(10, 17.75, 1.1, { est: 'width' }), W(15, 17.75, 1.4, { est: 'width' }), W(25, 17.75, 1.75, { est: 'width' }), W(35, 17.75, 2.2, { est: 'width' }), W(45, 17.75, 2.6), W(55, 17.75, 3, { est: 'width' })],
    url: 'https://capbarbell.com/products/cap-olympic-rubber-bumper-plate-black',
    reconstruction: 'CAP\'s dimension graphic gives 17.75" diameter, 1.9375" hub and 2.60" width for the 45 lb; other widths are estimated in proportion. Raised black lettering estimated from CAP photos; CAP is typeset, not the logo artwork.',
  },
  {
    id: 'balancefrom-bumper', code: 29, brand: 'BalanceFrom', name: 'Olympic Bumper Plates', unit: 'lb', group: 'Bumper plates',
    vendor: 'BalanceFrom', trademark: 'BalanceFrom trademarks belong to BalanceFrom.',
    material: 'rubber', color: '#141517', ink: '#3b9ad9',
    face: { kind: 'bumper', insert: 66, inner: .45, innerDepth: 1.5, edge: 4 },
    markings: [
      { text: 'EVERYDAY', at: 90, r: .74, h: .11, arc: 'out', back: true }, { text: 'ESSENTIALS', at: 270, r: .74, h: .11, arc: 'in', back: true },
      { text: '{w}\nLB', at: 180, r: .66, h: .065, back: true, spacing: .3 }, { text: '{k2}\nKG', at: 0, r: .66, h: .065, back: true, spacing: .3 },
    ],
    weights: [W(10, 17.75, 1.09, { ink: '#c9cdd1' }), W(15, 17.75, 1.18, { ink: '#e4812e' }), W(25, 17.75, 1.93, { ink: '#39b54a' }), W(35, 17.75, 2.05, { ink: '#f2c21b' }), W(45, 17.75, 2.83, { ink: '#3b9ad9' }), W(55, 17.75, 3.66, { ink: '#e0302f' })],
    url: 'https://vminnovations.com/products/balancefrom-fitness-370-pound-olympic-bumper-strength-training-weight-plate-set',
    reconstruction: 'Published 17.75" diameter, 2" hub and widths from BalanceFrom\'s dimension graphic (10 lb 1.09" to 55 lb 3.66"), with colour-coded lettering. Insert and print sizes estimated from product photos.',
  },
  {
    id: 'homegrown-bumper', code: 30, brand: 'HomeGrown Lifting', name: 'URA-MAX & Hyper-Thin Bumper Plates', unit: 'lb', group: 'Bumper plates',
    vendor: 'HomeGrown Lifting', trademark: 'HomeGrown trademarks belong to HomeGrown Lifting.',
    material: 'rubber', color: '#1a1b1d', ink: '#1a1b1d', accent: '#d9442f', pattern: { kind: 'speck', density: .1 },
    face: { kind: 'bumper', insert: 70, insertRecess: 3, inner: .46, innerDepth: 2.5, edge: 6, lip: .05, lipDepth: 1.5 },
    markings: [
      { text: 'HomeGrown', at: 90, r: .72, h: .11, arc: 'out', style: 'raised', back: true }, { text: 'Made in KY, USA', at: 270, r: .72, h: .08, arc: 'in', style: 'raised', back: true },
      { text: '{w}', at: 180, r: .68, h: .09, style: 'raised', back: true }, { text: '{w}', at: 0, r: .68, h: .09, style: 'raised', back: true },
    ],
    weights: [
      W(45, 17.72, 2.4, { key: '45ht', label: '45 lb Hyper-Thin', accent: '#d9442f' }), W(45, 17.72, 3.6, { accent: '#d9442f' }), W(35, 17.72, 3.1, { accent: '#2f86d6' }),
      W(25, 17.72, 2.5, { accent: '#e8c21a' }), W(15, 17.72, 1.6, { accent: '#e2702a' }), W(10, 17.72, 1.1, { accent: '#a9adb1' }),
    ],
    url: 'https://homegrownlifting.com/products/new-product-hyper-thin-45s',
    reconstruction: 'Published 17.72" diameter, 2" press-fit 304 stainless collar and widths: Hyper-Thin 45 lb 2.4"; URA-MAX 45/35/25/15/10 lb 3.6/3.1/2.5/1.6/1.1". Crumb-rubber colour specks are a deterministic stand-in pattern; lettering estimated from HomeGrown photos.',
  },
  // ---------------------------------------------------------------- Fractional and wagon wheels
  {
    id: 'microgainz-olympic', code: 31, brand: 'Micro Gainz', name: 'Olympic Fractional Plates', unit: 'lb', group: 'Change & fractional plates',
    vendor: 'Micro Gainz', trademark: 'Micro Gainz trademarks belong to Micro Gainz.',
    material: 'painted', color: '#1c1d1f', ink: '#1c1d1f',
    face: { kind: 'flat', edge: .8 },
    markings: [
      { text: 'MICRO\nGAINZ', at: 90, r: .8, h: .1, style: 'deboss', spacing: .2, maxD: 100 }, { text: '{w}\nLB', at: 270, r: .82, h: .07, style: 'deboss', spacing: .2, maxD: 100 },
      { text: 'MICRO GAINZ', at: 90, r: .55, h: .07, style: 'print', color: '#8f9396', minD: 101 }, { text: '{w} LB', at: 270, r: .55, h: .09, style: 'print', color: '#8f9396', minD: 101 },
    ],
    weights: [M(1.25, 88.9, 20.7), M(1, 88.9, 16.54), M(.75, 88.9, 12.22), M(.5, 88.9, 8.2), M(.25, 88.9, 4.17), M(2.5, 177.8, 6.35)],
    finishes: [{ id: 'black', label: 'Black', color: '#1c1d1f' }, { id: 'color', label: 'Multi-colour', color: '#1c1d1f', colors: { '1.25': '#2f9a45', '1': '#e7c11c', '0.75': '#1f5fb8', '0.5': '#c7282f', '0.25': '#56595d' } }],
    url: 'https://microgainz.com/products/micro-gainz-olympic-size-fractional-weight-plates-set-of-10-plates-25lb-1-25lb-w-bag',
    reconstruction: 'Published 3.5" diameter and thicknesses (0.25 lb 0.164" to 1.25 lb 0.815") of the sintered-steel fractional set, and the 2.5 lb 7" × 1/4" laser-cut steel plate with white pad print. Multi-colour assignment per weight estimated from the set photos; the dumbbell-only (non-Olympic) Micro Gainz plates are out of scope.',
  },
  {
    id: 'titan-wagon-wheel', code: 32, brand: 'Titan Fitness', name: 'Wagon Wheel Pulling Blocks', unit: 'lb', group: 'Wagon wheels',
    vendor: 'Titan Fitness', trademark: 'Titan trademarks belong to Titan Fitness.',
    material: 'painted', color: '#18191b', ink: '#18191b',
    face: { kind: 'wagon-steel', plate: 9.525, band: 6.35, insert: 76, grips: { kind: 'wedge', n: 9, r: .65, size: .54, deg: 90 } },
    markings: [{ text: 'TITAN', at: 90, r: .23, h: .085, sx: 1.1, style: 'deboss' }, { text: '{w}  LB', at: 270, r: .24, h: .055, style: 'deboss' }],
    weights: [W(45, 26, 2)],
    url: 'https://www.titan.fitness/products/45-lb-pair-wagon-wheel-pulling-blocks',
    reconstruction: 'Published 26" diameter, 0.375" laser-cut steel, 51 mm collar and 2" carrying lip, 45 lb each. Nine wedge windows, collar size and the cut-through TITAN / 45 LB lettering estimated from Titan photos.',
  },
  {
    // Dick's house brand. Only the weights, "cast iron", "Olympic" and "grip handles" are published; every size is measured
    // off Dick's straight-on catalogue photos against the 2" bore, and the widths come from the plate mass (research/plates.md).
    id: 'fitness-gear-olympic-cast', code: 33, brand: 'Fitness Gear', name: 'Olympic Cast Plate (tri-grip)', unit: 'lb', group: 'Iron plates',
    vendor: "Dick's Sporting Goods", trademark: "Fitness Gear trademarks belong to Dick's Sporting Goods.",
    material: 'hammertone', color: '#4f5154', ink: '#c4c7ca',
    face: { kind: 'iron', lip: .1, dish: .3, boss: 80, edge: 2.5, back: .2, grips: { kind: 'tri', n: 3, r: .665, size: .37, deg: 90 } },
    markings: [
      { text: 'FITNESS GEAR', at: 90, r: .4, h: .1, sx: 1.05, arc: 'out', style: 'raised', color: '#c4c7ca' },
      { text: '{w}LBS', at: 270, r: .6, h: .1, style: 'raised', color: '#c4c7ca' },
    ],
    weights: [
      M(45, 399, 38, { est: 'diameter, width' }), M(35, 340, 36, { est: 'diameter, width' }), M(25, 306, 33, { est: 'diameter, width' }),
      M(10, 242, 22, { est: 'diameter, width' }), M(5, 187, 18, { est: 'diameter, width' }), M(2.5, 156, 14, { est: 'diameter, width' }),
    ],
    finishes: [{ id: 'hammertone', label: 'Grey hammertone', color: '#4f5154', ink: '#c4c7ca' }, { id: 'black', label: 'Gloss black (older run)', color: '#1d1e20', ink: '#e9eaea' }],
    url: 'https://www.dickssportinggoods.com/p/fitness-gear-olympic-cast-plate-single-16fgeufg25lblycstwpl/16fgeufg25lblycstwpl',
    reconstruction: "Dick's publishes the weights (2.5–45 lb), cast iron, the 2\" Olympic hole and grip handles only. Diameters are measured on Dick's straight-on photos against the 2\" bore (45 lb ≈ 15.7\", matching an owner's \"about 15.5 in\" review); rim widths are solved from the plate mass; tri-grip windows, rim, dish and the raised FITNESS GEAR / weight lettering follow the photos, typeset without logo artwork.",
  },
];
