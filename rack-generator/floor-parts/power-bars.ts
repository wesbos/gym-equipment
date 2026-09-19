/** Power, deadlift and multipurpose barbells. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 * Published lengths, collar spans, sleeve lengths and shaft diameters are in research/power-bars.md; every bar is one
 * PowerBarModel run through the shared builder in parts/power-bars.ts, with finishes (and Boneyard shafts) as params. */
import { defineFloorPart, type BarSpec, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
const inch = (v: number) => Math.round(v * 25.4 * 10) / 10;
/** Colour, metalness, roughness. */
export type Mat = readonly [string, number, number];
export interface BarFinish { name: string; shaft: Mat; sleeve: Mat }
export type Emblem = 'block' | 'disc' | 'ring' | 'diamond' | 'double-diamond' | 'cross' | 'star' | 'sectors';
export type CollarStyle = 'flange' | 'classic' | 'weld';
export interface PowerBarModel {
  /** Overall length, inner collar face to inner collar face, loadable sleeve length, shaft and sleeve diameters (mm). */
  length: number; inside: number; sleeve: number; shaft: number; sleeveDiameter: number;
  collarDiameter: number; collarStyle: CollarStyle;
  /** Knurl layout from the bar centre: inner grip-knurl edge, smooth run-out before each collar, centre knurl width
   * (0 = none), smooth ring-mark centres (IPF 405, IWF 455) and mark width. Pitch/depth set the relief of the band. */
  knurl: { from: number; runout: number; center: number; marks: readonly number[]; markWidth: number; pitch: number; depth: number };
  /** End cap: base disc and a flat accent emblem; `recess` sinks it into the sleeve bore; `bronze` shows the bushing ring there. */
  cap: { base: string; accent: string; emblem: Emblem; recess: number; bronze?: boolean };
}
/** Collar (shoulder) length that closes the published overall length: (length − inside − 2·sleeve) / 2. */
export const collarLength = (m: PowerBarModel) => (m.length - m.inside - 2 * m.sleeve) / 2;
export const barSpecFor = (m: PowerBarModel): BarSpec => ({ shaft: m.shaft, shaftHalf: m.inside / 2, sleeveStart: m.inside / 2 + collarLength(m), sleeveLength: m.sleeve, sleeveDiameter: m.sleeveDiameter, axisZ: m.collarDiameter / 2 });

// Finish materials, from product photos: zinc is bluish-bright, black zinc a dark satin, stainless a warm grey.
const BRIGHT_ZINC: Mat = ['#d5dade', 1, .2], BLACK_ZINC: Mat = ['#2c2e31', .75, .42], CHROME: Mat = ['#e2e6e9', 1, .1], HARD_CHROME: Mat = ['#d9dde0', 1, .14];
const STAINLESS: Mat = ['#b9b6b0', .95, .3], BARE: Mat = ['#8f9396', .9, .45], BLACK_OXIDE: Mat = ['#27292b', .7, .45], E_COAT: Mat = ['#1f2022', .35, .5];
const MATTE_BLACK: Mat = ['#1d1e20', .45, .55], DURACOAT: Mat = ['#1a1b1d', .4, .5];
const cerakote = (color: string): Mat => [color, .15, .55];
const [CK_BLACK, CK_RED, CK_BLUE, CK_OD, CK_GREEN, CK_GUN, CK_PURPLE, CK_PINK, CK_WHITE] = ['#1e1f21', '#c3262c', '#1f5aa8', '#4b5a3a', '#3c6b3c', '#4f5357', '#6a3f9a', '#e0428c', '#e9e9e6'].map(cerakote);
const f = (name: string, shaft: Mat, sleeve: Mat): BarFinish => ({ name, shaft, sleeve });

const ROGUE_CAP = { recess: 1.2 } as const, TEXAS_CAP = { base: '#161719', accent: '#eeeeea', emblem: 'ring', recess: 7, bronze: true } as const;
/** Rogue Ohio Power Bar: 86.52" long, 51.5" between sleeves, 16.25" sleeves, 29 mm; 16.9375" smooth gap with a centre knurl. */
const OHIO_POWER: PowerBarModel = { length: inch(86.52), inside: inch(51.5), sleeve: inch(16.25), shaft: 29, sleeveDiameter: 50, collarDiameter: 58, collarStyle: 'flange',
  knurl: { from: inch(16.9375) / 2, runout: 12, center: 120, marks: [405], markWidth: 5, pitch: 2.2, depth: .3 }, cap: { base: '#141517', accent: '#f1f1ee', emblem: 'block', ...ROGUE_CAP } };
const OHIO_BAR: PowerBarModel = { length: inch(86.75), inside: 1310, sleeve: inch(16.4), shaft: 28.5, sleeveDiameter: 50, collarDiameter: 58, collarStyle: 'flange',
  knurl: { from: 215, runout: 12, center: 0, marks: [405, 455], markWidth: 5, pitch: 2, depth: .22 }, cap: { base: '#151618', accent: '#b3242f', emblem: 'disc', ...ROGUE_CAP } };
const BELLA: PowerBarModel = { length: inch(79.13), inside: 1310, sleeve: inch(13), shaft: 25, sleeveDiameter: 50, collarDiameter: 56, collarStyle: 'flange',
  knurl: { from: 215, runout: 12, center: 0, marks: [405, 455], markWidth: 5, pitch: 2, depth: .2 }, cap: { base: '#a4a8ac', accent: '#2b2d31', emblem: 'disc', ...ROGUE_CAP } };
const OHIO_DEADLIFT: PowerBarModel = { length: inch(90.5), inside: inch(56), sleeve: inch(15.5), shaft: 27, sleeveDiameter: 50, collarDiameter: 58, collarStyle: 'flange',
  knurl: { from: inch(17) / 2, runout: 12, center: 0, marks: [405], markWidth: 5, pitch: 2.2, depth: .3 }, cap: { base: '#151618', accent: '#c9b27a', emblem: 'block', ...ROGUE_CAP } };
const OLY_28: PowerBarModel = { length: 2200, inside: 1310, sleeve: 415, shaft: 28, sleeveDiameter: 50, collarDiameter: 58, collarStyle: 'flange',
  knurl: { from: 215, runout: 12, center: 0, marks: [455], markWidth: 5, pitch: 2, depth: .2 }, cap: { base: '#151618', accent: '#eeeeea', emblem: 'cross', ...ROGUE_CAP } };
const boneyard = (m: PowerBarModel): PowerBarModel => ({ ...m, cap: { base: '#151618', accent: '#eeeeea', emblem: 'cross', ...ROGUE_CAP } });
/** Texas: thick classic collars with a bronze thrust washer, end caps sunk ~7 mm with the bronze bushing showing. */
const TEXAS_ORIGINAL: PowerBarModel = { length: inch(86.4), inside: inch(52), sleeve: inch(15), shaft: 28.5, sleeveDiameter: 50, collarDiameter: 63, collarStyle: 'classic',
  knurl: { from: 215, runout: 22, center: inch(4), marks: [405], markWidth: 5, pitch: 2.4, depth: .34 }, cap: TEXAS_CAP };
const TEXAS_PRO: PowerBarModel = { length: inch(86.5), inside: inch(51.625), sleeve: inch(16), shaft: 29, sleeveDiameter: 50, collarDiameter: 60, collarStyle: 'classic',
  knurl: { from: 215, runout: 18, center: inch(5.625), marks: [405], markWidth: 5, pitch: 2.4, depth: .34 }, cap: TEXAS_CAP };
const TEXAS_DEADLIFT: PowerBarModel = { length: inch(92.5), inside: inch(56.5), sleeve: inch(15.5), shaft: 27, sleeveDiameter: 50, collarDiameter: 63, collarStyle: 'classic',
  knurl: { from: 215, runout: 22, center: 0, marks: [405], markWidth: 5, pitch: 2.4, depth: .38 }, cap: TEXAS_CAP };
const TEXAS_SQUAT: PowerBarModel = { length: inch(96.5), inside: inch(57.5), sleeve: inch(16.875), shaft: 31.75, sleeveDiameter: 50, collarDiameter: 66, collarStyle: 'classic',
  knurl: { from: 215, runout: 22, center: inch(6), marks: [405], markWidth: 5, pitch: 2.4, depth: .34 }, cap: TEXAS_CAP };
/** REP: 86.6" bars, 50 mm smooth sleeves, thin rounded shoulders with laser-etched faces, metal end caps. */
const REP_COLORADO: PowerBarModel = { length: inch(86.6), inside: 1310, sleeve: inch(16.1), shaft: 28.5, sleeveDiameter: 50, collarDiameter: 60, collarStyle: 'flange',
  knurl: { from: 215, runout: 30, center: 0, marks: [405, 455], markWidth: 5, pitch: 1.8, depth: .2 }, cap: { base: '#1b2a4a', accent: '#c2272f', emblem: 'sectors', recess: .8 } };
const REP_BLACK_DIAMOND: PowerBarModel = { length: inch(86.6), inside: 1310, sleeve: inch(16.3), shaft: 29, sleeveDiameter: 50, collarDiameter: 60, collarStyle: 'flange',
  knurl: { from: 215, runout: 30, center: 150, marks: [405], markWidth: 5, pitch: 1.8, depth: .3 }, cap: { base: '#1c1d1f', accent: '#eeeeea', emblem: 'diamond', recess: .8 } };
const REP_DOUBLE_BLACK: PowerBarModel = { ...REP_BLACK_DIAMOND, knurl: { ...REP_BLACK_DIAMOND.knurl, pitch: 2.2, depth: .42 }, cap: { base: '#9ea2a6', accent: '#1c1d1f', emblem: 'double-diamond', recess: .8 } };
/** American Barbell: 2200 mm, 16.338" sleeves, 29 mm stainless, recessed TIG-weld groove at the shoulder. */
const AB_CHEWY: PowerBarModel = { length: 2200, inside: 1310, sleeve: inch(16.338), shaft: 29, sleeveDiameter: 50, collarDiameter: 57, collarStyle: 'weld',
  knurl: { from: 215, runout: 18, center: 127, marks: [405], markWidth: 7, pitch: 1.27, depth: .3 }, cap: { base: '#141517', accent: '#b9bcbf', emblem: 'star', recess: 1 } };

const TEXAS_FINISHES = [f('Bare steel / chrome sleeves', BARE, CHROME), f('Bare steel / bare sleeves', BARE, BARE), f('Chrome', CHROME, CHROME), f('Black zinc / chrome sleeves', BLACK_ZINC, CHROME),
  f('Black Cerakote', CK_BLACK, CHROME), f('Red Cerakote', CK_RED, CHROME), f('Blue Cerakote', CK_BLUE, CHROME), f('Military green Cerakote', CK_GREEN, CHROME),
  f('Gunmetal gray Cerakote', CK_GUN, CHROME), f('Purple Cerakote', CK_PURPLE, CHROME), f('Pink Cerakote', CK_PINK, CHROME), f('White Cerakote', CK_WHITE, CHROME)];
const REP_POWER_FINISHES = [f('Black Cerakote / Duracoat', CK_BLACK, DURACOAT), f('Blue Cerakote / Duracoat', CK_BLUE, DURACOAT), f('Green Cerakote / Duracoat', CK_OD, DURACOAT),
  f('Red Cerakote / Duracoat', CK_RED, DURACOAT), f('Stainless / hard chrome', STAINLESS, HARD_CHROME), f('Stainless / stainless', STAINLESS, STAINLESS)];

export interface PowerBarProduct {
  id: string; title: string; name: string; model: PowerBarModel; finishes: readonly BarFinish[];
  /** Boneyard: the shaft variants, each its own base geometry. */ shafts?: readonly { name: string; model: PowerBarModel }[];
  vendor: string; url: string; blurb: string; published: string; estimated: string; trademark: string;
}
const ROGUE_TM = 'Rogue, Ohio Bar, Ohio Power Bar, Bella Bar and Boneyard are trademarks of Rogue Fitness.';
const TEXAS_TM = 'Texas Power Bars and Buddy Capps are trademarks of Texas Power Bars.';
const REP_TM = 'REP Fitness, Colorado Bar, Black Diamond and Double Black Diamond are trademarks of REP Fitness.';
export const POWER_BAR_PRODUCTS = [
  { id: 'rogue-ohio-power-bar', title: 'Rogue 45 lb Ohio Power Bar', name: 'Ohio Power Bar', model: OHIO_POWER, vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-45lb-ohio-power-bar-black-zinc', trademark: ROGUE_TM,
    finishes: [f('Black zinc / bright zinc sleeves', BLACK_ZINC, BRIGHT_ZINC), f('Bare steel', BARE, BARE), f('Stainless / chrome sleeves', STAINLESS, CHROME), f('Stainless / stainless sleeves', STAINLESS, STAINLESS),
      f('Black Cerakote / matte black sleeves', CK_BLACK, MATTE_BLACK), f('Red Cerakote / matte black sleeves', CK_RED, MATTE_BLACK), f('Blue Cerakote / matte black sleeves', CK_BLUE, MATTE_BLACK), f('OD green Cerakote / matte black sleeves', CK_OD, MATTE_BLACK)],
    blurb: '29 mm power bar with a centre knurl and single IPF marks, bronze bushings and snap-ring sleeves.',
    published: '86.52" overall, 51.5" between sleeves, 16.25" loadable sleeves, 29 mm shaft, 16.9375" centre gap (Rogue gear specs and dimension graphic)', estimated: 'collar and end-cap diameters, centre-knurl width and ring widths from photos' },
  { id: 'texas-deadlift-bar', title: 'Texas Deadlift Bar', name: 'Texas Deadlift Bar', model: TEXAS_DEADLIFT, vendor: 'Texas Power Bars', url: 'https://texaspowerbars.com/products/texas-deadlift-bar', trademark: TEXAS_TM, finishes: TEXAS_FINISHES,
    blurb: '27 mm, 92.5" deadlift bar with aggressive knurl, no centre knurl and single power marks; thick classic collars.',
    published: '92.5" overall, 56.5" inside collars, 15.5" loadable sleeves, 27 mm shaft (texaspowerbars.com spec table)', estimated: 'collar diameter, knurl extents and end-cap recess from photos' },
  { id: 'rogue-ohio-bar', title: 'Rogue The Ohio Bar', name: 'Ohio Bar', model: OHIO_BAR, vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/the-ohio-bar-black-zinc', trademark: ROGUE_TM,
    finishes: [f('Black zinc / bright zinc sleeves', BLACK_ZINC, BRIGHT_ZINC), f('Black oxide / bright zinc sleeves', BLACK_OXIDE, BRIGHT_ZINC), f('Stainless steel', STAINLESS, STAINLESS),
      f('Black Cerakote / bright zinc sleeves', CK_BLACK, BRIGHT_ZINC), f('Red Cerakote / bright zinc sleeves', CK_RED, BRIGHT_ZINC), f('Blue Cerakote / bright zinc sleeves', CK_BLUE, BRIGHT_ZINC)],
    blurb: '20 kg, 28.5 mm multipurpose bar: dual IWF/IPF marks, no centre knurl, bronze bushings.',
    published: '86.75" overall, 16.40" loadable sleeves, 28.5 mm shaft (Rogue gear specs)', estimated: 'standard 1310 mm collar span; collar size and knurl extents from photos' },
  { id: 'texas-power-bar', title: 'Texas Power Bar "Original"', name: 'Texas Power Bar', model: TEXAS_ORIGINAL, vendor: 'Texas Power Bars', url: 'https://texaspowerbars.com/products/original-texas-power-bar', trademark: TEXAS_TM, finishes: TEXAS_FINISHES,
    blurb: 'The 1980 Buddy Capps power bar: 28.5 mm, 4" centre knurl, single power marks, thick classic collars.',
    published: '86" overall, 52" inside collars, 28.5 mm shaft, 4" centre knurl (texaspowerbars.com); 15" loadable sleeves (older Texas listing)', estimated: 'collar length closes the overall length (sleeves 15"); collar diameter and recess from photos' },
  { id: 'rogue-bella-bar', title: 'Rogue The Bella Bar 2.0 · 15 kg', name: 'Bella Bar 2.0', model: BELLA, vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-bella-bar-2-0-black-zinc', trademark: ROGUE_TM,
    finishes: [f('Black zinc / bright zinc sleeves', BLACK_ZINC, BRIGHT_ZINC), f('Stainless steel', STAINLESS, STAINLESS), f('E-coat', E_COAT, BRIGHT_ZINC), f('Black Cerakote', CK_BLACK, BRIGHT_ZINC), f('Pink Cerakote', CK_PINK, BRIGHT_ZINC)],
    blurb: "15 kg women's multipurpose bar: 25 mm shaft, dual marks, no centre knurl, 13\" sleeves.",
    published: '79.13" overall, 13.00" loadable sleeves, 25 mm shaft (Rogue gear specs)', estimated: 'standard 1310 mm grip span, which leaves 20 mm collars; knurl extents from photos' },
  { id: 'rogue-ohio-power-bar-20kg', title: 'Rogue 20 kg Ohio Power Bar', name: '20 kg Ohio Power Bar', model: { ...OHIO_POWER, sleeve: inch(16.875) }, vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-20-kg-ohio-power-bar-black-zinc', trademark: ROGUE_TM,
    finishes: [f('Black zinc / bright zinc sleeves', BLACK_ZINC, BRIGHT_ZINC), f('Stainless / chrome sleeves', STAINLESS, CHROME)],
    blurb: 'IPF-approved 20 kg version of the Ohio Power Bar with friction-welded, longer 16.875" sleeves.',
    published: '86.52" overall, 51.5" between sleeves, 16.875" loadable sleeves, 29 mm (Rogue gear specs)', estimated: 'thin 16.5 mm shoulders close the published length; knurl layout as the 45 lb bar' },
  { id: 'texas-power-bar-pro', title: 'Texas Power Bar "PRO" · 29 mm', name: 'Texas Power Bar PRO', model: TEXAS_PRO, vendor: 'Texas Power Bars', url: 'https://texaspowerbars.com/products/pro-texas-power-bar', trademark: TEXAS_TM, finishes: TEXAS_FINISHES,
    blurb: '7th-gen 29 mm Texas bar: thinner competition collars, 16" sleeves, 5 5/8" centre knurl; aggressive or medium knurl.',
    published: '86.5" overall, 51 5/8" inside collars, 16" loadable sleeves, 29 mm, 5 5/8" centre knurl (texaspowerbars.com)', estimated: 'collar diameter and knurl extents from photos' },
  { id: 'rogue-ohio-deadlift-bar', title: 'Rogue Ohio Deadlift Bar', name: 'Ohio Deadlift Bar', model: OHIO_DEADLIFT, vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-ohio-deadlift-bar-black-zinc', trademark: ROGUE_TM,
    finishes: [f('Black zinc / bright zinc sleeves', BLACK_ZINC, BRIGHT_ZINC), f('Bare steel', BARE, BARE), f('E-coat', E_COAT, BRIGHT_ZINC), f('Black Cerakote', CK_BLACK, BRIGHT_ZINC)],
    blurb: '27 mm, 90.5" deadlift bar: aggressive knurl, no centre knurl, snap-ring sleeves.',
    published: '90.5" overall, 56" between sleeves, 15.5" loadable sleeves, 27 mm, 17" centre gap (Rogue gear specs and dimension graphic)', estimated: 'collar and cap diameters from photos' },
  { id: 'rep-colorado-bar', title: 'REP Colorado Bar · 20 kg', name: 'Colorado Bar', model: REP_COLORADO, vendor: 'REP Fitness', url: 'https://repfitness.com/products/colorado-bar-20kg', trademark: REP_TM,
    finishes: [f('Hard chrome', HARD_CHROME, HARD_CHROME), f('Black Cerakote / Duracoat', CK_BLACK, DURACOAT), f('Blue Cerakote / Duracoat', CK_BLUE, DURACOAT), f('Green Cerakote / Duracoat', CK_OD, DURACOAT),
      f('Red Cerakote / Duracoat', CK_RED, DURACOAT), f('White Cerakote / Duracoat', CK_WHITE, DURACOAT)],
    blurb: '28.5 mm multipurpose bar with composite bushings, volcano knurl, dual IPF/IWF marks and no centre knurl.',
    published: '86.6" overall, 16.1" loadable sleeves, 28.5 mm shaft, 50 mm sleeves (repfitness.com spec table)', estimated: 'standard 1310 mm collar span; shoulder size and knurl extents from photos' },
  { id: 'rep-double-black-diamond-power-bar', title: 'REP Double Black Diamond Power Bar', name: 'Double Black Diamond Power Bar', model: REP_DOUBLE_BLACK, vendor: 'REP Fitness', url: 'https://repfitness.com/products/double-black-diamond-power-bar', trademark: REP_TM, finishes: REP_POWER_FINISHES,
    blurb: '29 mm power bar with REP\'s deepest mountain knurl, centre knurl, IPF marks and bronze bushings.',
    published: '86.6" overall, 16.3" loadable sleeves, 29 mm shaft, 50 mm sleeves (repfitness.com spec table)', estimated: 'standard 1310 mm collar span; centre-knurl width and shoulder from photos' },
  { id: 'rogue-boneyard-bar', title: 'Rogue Boneyard Bar', name: 'Boneyard Bar', model: boneyard(OHIO_BAR), vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-28-5-mm-boneyard-bars', trademark: ROGUE_TM,
    shafts: [{ name: '28.5 mm · Ohio Bar', model: boneyard(OHIO_BAR) }, { name: '28 mm · Olympic', model: OLY_28 }, { name: '29 mm · Ohio Power Bar', model: boneyard(OHIO_POWER) }, { name: '25 mm · Bella 15 kg', model: boneyard(BELLA) }],
    finishes: [f('Bright zinc', BRIGHT_ZINC, BRIGHT_ZINC), f('Black zinc / bright zinc sleeves', BLACK_ZINC, BRIGHT_ZINC), f('Chrome', CHROME, CHROME), f('Raw steel', BARE, BARE)],
    blurb: 'Second-quality Rogue bushing bars with Boneyard end caps; built on the Ohio, Olympic, Ohio Power and Bella platforms.',
    published: 'shaft sizes and finishes per Rogue Boneyard listings; each variant uses its base bar\'s published specs', estimated: 'knurl marks vary per bar in reality; the base bar\'s layout is shown' },
  { id: 'rep-black-diamond-power-bar', title: 'REP Black Diamond Power Bar', name: 'Black Diamond Power Bar', model: REP_BLACK_DIAMOND, vendor: 'REP Fitness', url: 'https://repfitness.com/products/black-diamond-power-bar', trademark: REP_TM, finishes: REP_POWER_FINISHES,
    blurb: '29 mm power bar with deep volcano knurl, centre knurl, IPF marks and bronze bushings.',
    published: '86.6" overall, 16.3" loadable sleeves, 29 mm shaft, 50 mm sleeves (repfitness.com spec table)', estimated: 'standard 1310 mm collar span; centre-knurl width and shoulder from photos' },
  { id: 'american-barbell-chewy-bar', title: 'American Barbell Stainless IPF Chewy Bar', name: 'Chewy Bar', model: AB_CHEWY, vendor: 'American Barbell', url: 'https://americanbarbell.com/products/the-chewy-bar', trademark: 'American Barbell and Chewy Bar are trademarks of American Barbell.',
    finishes: [f('Stainless shaft / hard chrome sleeves', STAINLESS, HARD_CHROME)],
    blurb: 'IPF-spec 29 mm stainless power bar with a 20 TPI knurl, centre knurl, composite bushings and recessed TIG-weld shoulders.',
    published: '2200 mm overall, 16.338" sleeves, 29 mm stainless shaft (americanbarbell.com)', estimated: 'IPF 1310 mm collar span, centre-knurl width and mark widths from photos' },
  { id: 'texas-squat-bar', title: 'Texas Squat Bar', name: 'Texas Squat Bar', model: TEXAS_SQUAT, vendor: 'Texas Power Bars', url: 'https://texaspowerbars.com/products/texas-squat-bar', trademark: TEXAS_TM, finishes: TEXAS_FINISHES,
    blurb: '25 kg, 31.75 mm squat bar, 96.5" long with a 6" centre knurl and single power marks.',
    published: '96.5" overall, 57.5" inside collars, 16.875" loadable sleeves, 31.75 mm, 6" centre knurl (texaspowerbars.com spec table)', estimated: 'collar diameter and knurl extents from photos' },
] as const satisfies readonly PowerBarProduct[];
export type PowerBarId = (typeof POWER_BAR_PRODUCTS)[number]['id'];
export const KNURL_GRADES = ['Aggressive', 'Medium'] as const;
/** The product's geometry at these params (Boneyard shaft; Texas PRO medium knurl is shallower). */
export function powerBarModel(product: PowerBarProduct, p: NumericParams): PowerBarModel {
  const base = product.shafts ? product.shafts[p.shaft ?? 0]?.model : product.model;
  if (!base) throw Error('Unsupported barbell shaft.');
  return p.knurl === 1 ? { ...base, knurl: { ...base.knurl, depth: base.knurl.depth * .6, pitch: base.knurl.pitch * .85 } } : base;
}
export function powerBarFinish(product: PowerBarProduct, p: NumericParams): BarFinish {
  const finish = product.finishes[p.finish ?? 0]; if (!finish) throw Error('Unsupported barbell finish.'); return finish;
}
const define = (product: PowerBarProduct & { id: PowerBarId }) => {
  const params = [
    ...(product.shafts ? [{ key: 'shaft', label: 'Shaft', default: 0, options: product.shafts.map((_, i) => i), format: (v: number) => product.shafts![v]?.name ?? String(v) }] : []),
    ...(product.finishes.length > 1 ? [{ key: 'finish', label: 'Finish', default: 0, options: product.finishes.map((_, i) => i), format: (v: number) => product.finishes[v]?.name ?? String(v) }] : []),
    ...(product.id === 'texas-power-bar-pro' ? [{ key: 'knurl', label: 'Knurling', default: 0, options: [0, 1], format: (v: number) => KNURL_GRADES[v] ?? String(v) }] : []),
  ];
  const model = (p: NumericParams) => powerBarModel(product, p);
  return defineFloorPart<PowerBarId>({
    id: product.id, name: product.name, title: product.title, noun: 'barbell', section: 'Barbells',
    description: `${product.blurb} Independent reconstruction from published dimensions; ${product.vendor} trademarks belong to ${product.vendor}.`,
    params, footprint: p => { const m = model(p); return { width: m.length, depth: m.collarDiameter }; },
    placement: { side: 'front', gap: 300 }, parks: true, bar: p => barSpecFor(model(p)),
    vendor: { vendor: product.vendor, url: product.url, credit: `${product.vendor} — ${product.title}`, trademark: product.trademark,
      reconstruction: `Independent Manifold reconstruction. Published: ${product.published}. Estimated: ${product.estimated}. Knurl drawn as ring relief, emblems as flat plates; scenery only, excluded from print export.` },
  });
};
export const powerBarProduct = (id: string): PowerBarProduct | undefined => POWER_BAR_PRODUCTS.find(p => p.id === id);
export const PARTS: readonly FloorPart<PowerBarId>[] = POWER_BAR_PRODUCTS.map(define);
