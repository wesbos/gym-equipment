/** Brand parts that span two uprights (#133): strap safeties (REP, Rogue Monster and Monster Lite, Bells of Steel), REP
 * Flip-Down Safeties and pull-up bars (REP 1.25 in and Multi-Grip, Rogue X-433 Fat/Skinny). Metadata only (main bundle).
 * They use RackMount.span: the unit on the target upright draws the whole part to the in-line post `uprightSpan` away
 * (along local X for safeties on the inner side faces, along +Y for bars between the inner side faces). Without such a
 * post (the part viewer, or a removed upright) builders fall back to the product's nominal span. Research:
 * research/rack-jcups-safeties.md. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions } from '../types.ts';
const inch = (v: number) => v * 25.4;
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const faceWidth = (p: NumericParams) => p.uprightWidth ?? p.upright ?? 75;
const pinFit = (rack: RackDimensions) => rack.holeDiameter >= PIN_1IN ? 1 : 0;

// ─── Strap safeties ────────────────────────────────────────────────────────────────────────────────────────────
/** One strap-safety product: bracket plate on the inner face (pin at the target hole), clasp cheeks, ears that carry the
 * strap bolt beyond the post edge, and the webbing (width across local Y). z is relative to the pin. */
export interface StrapSpec {
  plate: number; plateW: number; top: number; bottom: number; claspBack: number;
  earOut: number; earZ: number; earH: number; bolt: number; strapW: number; strapT: number; sag: number; pinFromBolt?: number;
  /** Second, lower bracket pin (stations below the target), REP 1.0 style. */ lowerPin?: number;
}
export const REP_STRAP: StrapSpec[] = [
  { plate: 8.25, plateW: 86, top: 32, bottom: -86, claspBack: 60, earOut: 42, earZ: -58, earH: 56, bolt: 16, strapW: inch(3), strapT: 4, sag: 18 },
  { plate: 6.35, plateW: 76, top: 32, bottom: -130, claspBack: 0, earOut: 36, earZ: -96, earH: 50, bolt: 16, strapW: inch(3), strapT: 4, sag: 45, lowerPin: 2 },
];
export const ROGUE_STRAP: StrapSpec = { plate: inch(.3125), plateW: 64, top: 30, bottom: -122, claspBack: 50, earOut: 40, earZ: -95, earH: 58, bolt: 16, strapW: inch(3), strapT: 4, sag: 25 };
export const BOS_STRAP: StrapSpec = { plate: 6.35, plateW: 70, top: 30, bottom: -100, claspBack: 55, earOut: 36, earZ: -72, earH: 52, bolt: 14, strapW: 50, strapT: 5, sag: 30 };
export const BOS_STRAP_COLORS = [['Black', '#232426'], ['Blue', '#1f54b8'], ['Purple', '#5b2d8e'], ['Bright Orange', '#e8541c']] as const;
/** Post-to-post span; without a rear post (the viewer) a nominal 30 in inside depth toward local -X. */
export const strapSpan = (p: NumericParams) => p.uprightSpan ?? -(inch(30) + (p.upright ?? 75));
function strapBodies(p: NumericParams, s: StrapSpec): LocalBox[] {
  const f = face(p), S = strapSpan(p), sx = Math.sign(S) || -1, w = faceWidth(p) / 2, x = (a: number, b: number): [number, number] => sx > 0 ? [a, b] : [-b, -a];
  const half = s.claspBack > 0 ? w + .6 + s.plate : s.plateW / 2, near = x(-half, w + s.earOut), far = x(Math.abs(S) - w - s.earOut, Math.abs(S) + half), run = x(w + s.earOut, Math.abs(S) - w - s.earOut);
  const zb = s.earZ - s.earH / 2;
  return [
    { min: [near[0], f + 1, zb], max: [near[1], f + s.plate + 8 + s.strapW, s.top] },
    { min: [far[0], f + 1, zb], max: [far[1], f + s.plate + 8 + s.strapW, s.top] },
    { min: [run[0], f + s.plate + 4, s.earZ - s.sag - 12], max: [run[1], f + s.plate + 4 + s.strapW, s.earZ + 8] },
  ];
}
const strapExtent = (s: StrapSpec) => ({ below: -Math.min(s.bottom, s.earZ - s.earH / 2 - 26, s.earZ - s.sag - 12) + 1, above: s.top + 1 });
const strapFits = (name: string) => (_r: RackDimensions, p: NumericParams) => {
  const w = faceWidth(p); if (Math.abs(w - inch(3)) > 2.5) throw Error(`${name} brackets fit a 3 in upright face, not ${(w / 25.4).toFixed(2)} in.`);
};
const strapMount = (pin: RackPart['mount']['pin'], name: string, s: (p: NumericParams) => StrapSpec) => ({
  pin, span: 'across' as const, faces: ['left', 'right'] as const, extent: (p: NumericParams) => strapExtent(s(p)), validate: strapFits(name),
});
export const REP_STRAP_SERIES = ['4000 Series · 5/8 in pins', '5000 Series · 1 in pins'] as const;
export const REP_STRAP_SAFETIES = defineRackPart({
  id: 'rep-strap-safeties', name: 'REP Strap Safety', title: 'REP Fitness Strap Safeties', noun: 'strap safety', section: 'J-cups & safeties',
  description: '3 in reinforced nylon strap safeties bolted to steel brackets that hook into the inner side holes; front and back can sit at different heights · 2.0: 0-gauge wrap brackets with a repositioned pin and less slack · 1.0: flat twin-pin brackets. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [
    { key: 'version', label: 'Version', default: 0, options: [0, 1], format: v => ['2.0', '1.0'][v] ?? String(v) },
    { key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => REP_STRAP_SERIES[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/strap-safeties-2-0',
    credit: 'REP Fitness — Strap Safeties 2.0 (PRA-5123) and 1.0 (PRA-4120 / PRA-5120)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 3 in reinforced nylon straps, 0-gauge (2.0) steel brackets, 26.8 / 37.6 in usable lengths and 24 / 30 / 41 in rack depths; the strap follows the actual post spacing. Bracket shapes, bolt position and sag estimated from REP product photos; physical fit unverified.',
  },
  mount: strapMount(p => p.series ? PIN_1IN : PIN_5_8IN, 'REP strap safety', p => REP_STRAP[p.version ?? 0]),
  bodies: p => strapBodies(p, REP_STRAP[p.version ?? 0]),
  pair: { default: true },
  placement: { height: 715, face: 'inside' },
  autoFit: rack => ({ series: pinFit(rack) }),
  family: 'rack:strap-safeties',
});
export const ROGUE_MONSTER_STRAP_SAFETY_2 = defineRackPart({
  id: 'rogue-monster-strap-safety-2', name: 'Rogue Monster Strap Safety 2.0', title: 'Rogue Monster Safety Strap System 2.0', noun: 'strap safety', section: 'J-cups & safeties',
  description: 'Monster strap safety 2.0: 3 in wide reinforced nylon strap (safety-rated for 10,000 lb) with a grey wear sleeve, bolted to 0.3125 in steel hangers with 1 in pins and UHMW pads; ends mount at independent heights · 24, 30 or 43 in depths. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-safety-strap-2-0-systems',
    credit: 'Rogue Fitness — Monster Safety Strap System 2.0 · Made in USA', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 3 in reinforced nylon strap, 0.3125 in steel brackets, 1 in pins, three UHMW pieces and 24 / 30 / 43 in depths; the strap follows the actual post spacing. Hanger outline, bolt position, sleeve length and sag estimated from Rogue photos; physical fit unverified.',
  },
  mount: strapMount(PIN_1IN, 'Monster strap safety', () => ROGUE_STRAP),
  bodies: p => strapBodies(p, ROGUE_STRAP),
  pair: { default: true },
  placement: { height: 715, face: 'inside' },
  family: 'rack:strap-safeties',
});
export const ROGUE_MONSTER_LITE_STRAP_SAFETY_2 = defineRackPart({
  id: 'rogue-monster-lite-strap-safety-2', name: 'Rogue Monster Lite Strap Safety 2.0', title: 'Rogue Monster Lite Strap Safety System 2.0', noun: 'strap safety', section: 'J-cups & safeties',
  description: 'Monster Lite strap safety 2.0: 3 in black reinforced nylon straps on 0.3125 in formed steel J-cup-style hangers with 5/8 in pins that swing into place without removing the pin · 24, 30 or 43 in depths. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/monster-lite-strap-safety-system-2-0',
    credit: 'Rogue Fitness — Monster Lite Strap Safety System 2.0 · Made in USA', trademark: 'Rogue and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 3 in reinforced nylon straps, 0.3125 in formed steel brackets, 0.625 in pins, pin-and-swing hangers and 24 / 30 / 43 in depths; the strap follows the actual post spacing. Hanger outline, bolt position and sag estimated from Rogue photos; physical fit unverified.',
  },
  mount: strapMount(PIN_5_8IN, 'Monster Lite strap safety', () => ROGUE_STRAP),
  bodies: p => strapBodies(p, ROGUE_STRAP),
  pair: { default: true },
  placement: { height: 715, face: 'inside' },
  family: 'rack:strap-safeties',
});
export const BOS_SAFETY_STRAPS = defineRackPart({
  id: 'bells-of-steel-safety-straps', name: 'Bells of Steel Safety Strap', title: 'Bells of Steel Safety Straps', noun: 'strap safety', section: 'J-cups & safeties',
  description: 'Coloured nylon safety straps on grey steel brackets for Hydra (5/8 in) and Manticore (1 in) racks, 17 to 43 in depths. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [
    { key: 'rack', label: 'Rack', default: 0, options: [0, 1], format: v => ['Hydra · 5/8 in', 'Manticore · 1 in'][v] ?? String(v) },
    { key: 'color', label: 'Strap colour', default: 0, options: BOS_STRAP_COLORS.map((_, i) => i), format: v => BOS_STRAP_COLORS[v]?.[0] ?? String(v) },
  ],
  vendor: {
    vendor: 'Bells of Steel', url: 'https://bellsofsteel.com/products/safety-straps',
    credit: 'Bells of Steel — Safety Straps for Hydra & Manticore Racks', trademark: 'Bells of Steel, Hydra and Manticore are trademarks of Bells of Steel.',
    reconstruction: 'Published strap colours (black, blue, purple, orange), 17 / 24 / 30 / 43 in depths and Hydra / Manticore fits. Strap width, bracket outline and bolt position estimated from Bells of Steel photos; physical fit unverified.',
  },
  mount: strapMount(p => p.rack ? PIN_1IN : PIN_5_8IN, 'Bells of Steel safety strap', () => BOS_STRAP),
  bodies: p => strapBodies(p, BOS_STRAP),
  pair: { default: true },
  placement: { height: 715, face: 'inside' },
  autoFit: rack => ({ rack: pinFit(rack) }),
  family: 'rack:strap-safeties',
});

// ─── REP Flip-Down Safeties ────────────────────────────────────────────────────────────────────────────────────
/** Published: 11-gauge steel, plastic top liner, clevis quick-release pin, 1 in holes along the sides, 1,000 lb (4000/5000),
 * 24 / 30 / 41 in depths. Tube section, pivot tab and pin stations estimated from REP photos. */
export const FLIP_DOWN = { tubeW: inch(2), tubeH: inch(3), wall: 3.05, liner: 5, tabH: 70, tabW: 52, tabT: 6.35, centerStations: 1, overhang: 12 } as const;
export const REP_FLIP_DOWN_SAFETIES = defineRackPart({
  id: 'rep-flip-down-safeties', name: 'REP Flip-Down Safety', title: 'REP Fitness Flip-Down Safeties', noun: 'flip-down safety', section: 'J-cups & safeties',
  description: '11-gauge box-tube safeties that pivot on a welded pin at one upright and flip down onto the other, locked by a red clevis quick-release pin · plastic top liner · 1 in accessory holes along the sides · 24, 30 or 41 in depths. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => ['4000 Series · 5/8 in pins', '5000 Series · 1 in pins'][v] ?? String(v) }],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/flip-down-safeties',
    credit: 'REP Fitness — Flip-Down Safeties (PRA-4110 / PRA-5112)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 11-gauge steel, plastic top liner, clevis quick-release pin, 1 in side holes and 24 / 30 / 41 in depths; the tube follows the actual post spacing. Tube section, pivot tab and lock-pin station estimated from REP photos; physical fit unverified.',
  },
  mount: { pin: p => p.series ? PIN_1IN : PIN_5_8IN, span: 'across', faces: ['left', 'right'], extent: p => ({ below: FLIP_DOWN.centerStations * (p.mountSpacing ?? 50) + FLIP_DOWN.tubeH / 2 + 1, above: 30 }),
    validate: (_r, p) => { const w = faceWidth(p); if (Math.abs(w - inch(3)) > 2.5) throw Error(`Flip-down safeties fit a 3 in upright face, not ${(w / 25.4).toFixed(2)} in.`); } },
  bodies: p => {
    const f = face(p), S = strapSpan(p), w = faceWidth(p) / 2, sx = Math.sign(S) || -1, zc = -FLIP_DOWN.centerStations * (p.mountSpacing ?? 50);
    const a = -sx * (w - FLIP_DOWN.overhang), b = S + sx * (w - FLIP_DOWN.overhang);
    return [{ min: [Math.min(a, b), f + 1, zc - FLIP_DOWN.tubeH / 2], max: [Math.max(a, b), f + FLIP_DOWN.tubeW, zc + FLIP_DOWN.tubeH / 2 + FLIP_DOWN.liner] }];
  },
  pair: { default: true },
  cradles: { kind: 'working', label: 'REP Flip-Down Safeties', slots: p => {
    const f = face(p), S = strapSpan(p), zc = -FLIP_DOWN.centerStations * (p.mountSpacing ?? 50);
    return [{ point: [S / 2, f + FLIP_DOWN.tubeW / 2, zc + FLIP_DOWN.tubeH / 2 + FLIP_DOWN.liner + 14.25], axis: [0, 1, 0] }];
  } },
  placement: { height: 715, face: 'inside' },
  autoFit: rack => ({ series: pinFit(rack) }),
  family: 'rack:strap-safeties',
});

// ─── Pull-up bars ──────────────────────────────────────────────────────────────────────────────────────────────
/** Nominal inside width when there is no facing post (the viewer): REP's 40.8 in usable length. */
export const pullSpan = (p: NumericParams, usable: number) => p.uprightSpan ?? usable + (p.upright ?? 75);
/** REP 1.25 in: published 40.8 in usable length, 1.25 in bar, 4 in mounting-hole distance, 4.5 mm steel, 16.5 lb. */
export const REP_PULLUP = { bar: inch(1.25), usable: inch(40.8), plateW: 57, plateT: 6.35, plateAbove: 32, plateBelow: 32, holeStations: 2 } as const;
/** REP Multi-Grip: published 41.4 in length, 14.6 in width, 7.3 in total height, 14-gauge, 1.25 in front bar and grips,
 * 2 in rear bar; grip spacings neutral-wide 28.4, neutral 6.1, close-to-wide 11.1, 1.25-to-2 in bars 12.3, straights 28.4 in. */
export const REP_MULTI = { bar: inch(1.25), fat: inch(2), length: inch(41.4), width: inch(14.6), height: inch(7.3), neutral: inch(6.1), wide: inch(28.4), close: inch(11.1), barGap: inch(12.3), straight: inch(28.4),
  plateW: 76, plateT: 6.35, plateH: 150, holeStations: 2 } as const;
/** Rear fat bar centre behind the front bar so the frame is the published 14.6 in deep overall. */
export const multiRearX = () => REP_MULTI.width - REP_MULTI.fat / 2 - REP_MULTI.bar / 2;
/** Rogue X-433 Fat/Skinny: published 43 in, 1.25 in OD over 2 in OD, 14 in flanges (Monster Lite 5/8 in hardware). */
export const ROGUE_FAT_SKINNY = { skinny: inch(1.25), fat: inch(2), usable: inch(43), flangeH: inch(14), flangeW: inch(2), flangeT: inch(3 / 8), topHole: inch(.75), skinnyZ: inch(2.1), fatZ: inch(12.4), holeStations: 3 } as const;
const barFaces = { faces: ['left', 'right'] as const, span: 'normal' as const };
function barValidate(name: string) {
  return (_r: RackDimensions, p: NumericParams) => {
    const w = faceWidth(p); if (w < inch(2) - 1.5 || w > inch(3) + 2.5) throw Error(`${name} end plates fit 2 to 3 in upright faces, not ${(w / 25.4).toFixed(2)} in.`);
  };
}
export const REP_PULL_UP_BAR = defineRackPart({
  id: 'rep-pull-up-bar', name: 'REP 1.25 in Pull-Up Bar', title: 'REP Fitness 1.25" Pull-Up Bar', noun: 'pull-up bar', section: 'J-cups & safeties',
  description: 'Straight 1.25 in steel pull-up bar welded to end plates that bolt to the inside of the uprights with two bolts 4 in apart · 40.8 in usable length on PR-4000 / PR-5000 racks. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => ['4000 Series · 5/8 in bolts', '5000 Series · 1 in bolts'][v] ?? String(v) }],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/1-25-pull-up-bar',
    credit: 'REP Fitness — 1.25" Pull-Up Bar (PR-4000-PU-125 / PR-5000-PU-125)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 40.8 in usable length, 1.25 in diameter, 4 in mounting-hole distance and 4.5 mm steel; the bar follows the actual post spacing. End-plate size and bar height on the plate estimated from REP photos; physical fit unverified.',
  },
  mount: { pin: p => p.series ? PIN_1IN : PIN_5_8IN, holes: [0, -REP_PULLUP.holeStations], ...barFaces, validate: barValidate('REP pull-up bar'),
    extent: p => ({ below: REP_PULLUP.holeStations * (p.mountSpacing ?? 50) + REP_PULLUP.plateBelow + 1, above: REP_PULLUP.plateAbove + 1 }) },
  bodies: p => {
    const f = face(p), S = pullSpan(p, REP_PULLUP.usable), zc = -REP_PULLUP.holeStations * (p.mountSpacing ?? 50) / 2, r = REP_PULLUP.bar / 2;
    return [{ min: [-r, f + 1, zc - r], max: [r, S - f - 1, zc + r] }];
  },
  placement: { height: 1900, face: 'inside' },
  autoFit: rack => ({ series: pinFit(rack) }),
  family: 'rack:pull-up-bars',
});
export const REP_MULTI_GRIP_PULL_UP_BAR = defineRackPart({
  id: 'rep-multi-grip-pull-up-bar', name: 'REP Multi-Grip Pull-Up Bar', title: 'REP Fitness Multi-Grip Pull-Up Bar', noun: 'pull-up bar', section: 'J-cups & safeties',
  description: 'Multi-grip pull-up bar: 1.25 in straight front bar, neutral, close and wide angled grips and a 2 in fat rear bar on an arched 14-gauge frame · 41.4 × 14.6 × 7.3 in · bolts inside the top of PR-4000 / PR-5000 uprights. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [
    { key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => ['4000 Series · 5/8 in bolts', '5000 Series · 1 in bolts'][v] ?? String(v) },
    { key: 'grips', label: 'Grips', default: 0, options: [0, 1], format: v => ['Toward local −X (into the rack from the front posts)', 'Toward local +X'][v] ?? String(v) },
  ],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/multi-grip-pull-up-bar',
    credit: 'REP Fitness — Multi-Grip Pull-Up Bar (PRA-4500 / PRA-5552)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 41.4 in length, 14.6 in width, 7.3 in height, 14-gauge steel, 1.25 in and 2 in bars and the neutral / close / wide grip spacings; the frame follows the actual post spacing. Arch shape, grip angles and end plates estimated from REP photos; physical fit unverified.',
  },
  mount: { pin: p => p.series ? PIN_1IN : PIN_5_8IN, holes: [0, -REP_MULTI.holeStations], ...barFaces, validate: barValidate('REP multi-grip pull-up bar'),
    extent: p => ({ below: Math.max(REP_MULTI.holeStations * (p.mountSpacing ?? 50) + 40, REP_MULTI.plateH - 40) + 1, above: REP_MULTI.height - 40 + 1 }) },
  bodies: p => {
    const f = face(p), S = pullSpan(p, REP_MULTI.length - 2 * REP_MULTI.plateT), d = p.grips ? 1 : -1, r = REP_MULTI.fat / 2;
    const reach = multiRearX() + REP_MULTI.fat / 2 - 2, x0 = d > 0 ? -REP_MULTI.bar / 2 : -reach, x1 = d > 0 ? reach : REP_MULTI.bar / 2;
    return [{ min: [x0, f + REP_MULTI.plateT + 20, -20 - r], max: [x1, S - f - REP_MULTI.plateT - 20, REP_MULTI.height - 40 - 4] }];
  },
  placement: { height: 1900, face: 'inside' },
  autoFit: rack => ({ series: pinFit(rack) }),
  family: 'rack:pull-up-bars',
});
export const ROGUE_FAT_SKINNY_PULL_UP_BAR = defineRackPart({
  id: 'rogue-fat-skinny-pull-up-bar', name: 'Rogue X-433 Fat/Skinny Bar', title: 'Rogue 43" Fat/Skinny Pull-Up Bar (X-433)', noun: 'pull-up bar', section: 'J-cups & safeties',
  description: 'Monster Lite X-433 double pull-up bar: a 1.25 in OD skinny bar over a 2 in OD fat bar between 14 in bolt-on flanges · 43 in for 43 in wide racks. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/monster-lite-crossmembers',
    credit: 'Rogue Fitness — Monster Lite X-433 Fat/Skinny Bar · Made in USA', trademark: 'Rogue and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 43 in length, 1.25 in and 2 in outside diameters and 14 in flange height (Rogue dimension graphic); the bars follow the actual post spacing. Flange width, bolt stations and bar heights on the flange estimated from Rogue photos; hardware is sold separately; physical fit unverified.',
  },
  mount: { pin: PIN_5_8IN, holes: [0, -ROGUE_FAT_SKINNY.holeStations], ...barFaces, validate: barValidate('Rogue fat/skinny bar'),
    extent: () => ({ below: ROGUE_FAT_SKINNY.flangeH - ROGUE_FAT_SKINNY.topHole + 1, above: ROGUE_FAT_SKINNY.topHole + 1 }) },
  bodies: p => {
    const f = face(p), S = pullSpan(p, ROGUE_FAT_SKINNY.usable), c = ROGUE_FAT_SKINNY, r = c.fat / 2;
    return [{ min: [-r, f + c.flangeT + 1, c.topHole - c.fatZ - r], max: [r, S - f - c.flangeT - 1, c.topHole - c.skinnyZ + c.skinny / 2] }];
  },
  placement: { height: 1900, face: 'inside' },
  family: 'rack:pull-up-bars',
});
export const SPAN_PARTS = [REP_STRAP_SAFETIES, ROGUE_MONSTER_STRAP_SAFETY_2, ROGUE_MONSTER_LITE_STRAP_SAFETY_2, BOS_SAFETY_STRAPS, REP_FLIP_DOWN_SAFETIES, REP_PULL_UP_BAR, REP_MULTI_GRIP_PULL_UP_BAR, ROGUE_FAT_SKINNY_PULL_UP_BAR] as const satisfies readonly RackPart[];
