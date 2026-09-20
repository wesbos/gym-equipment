/** Catalog leftovers (#176): wall products other families skipped. Metadata only (main bundle): never import Manifold
 * builders here. Family slot: wall-registry.ts spreads PARTS. Research: ../research/leftovers.md. Builders: ../parts/leftovers-wall.ts.
 * Wall axes: X along the wall, -Y out of it, Z up; origin at the face centre on the wall surface. */
import { defineWallPart } from '../wall-part.ts';
import type { NumericParams } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';

const inch = (v: number) => v * 25.4;
const credit = (vendor: string, url: string, product: string, trademark: string, reconstruction: string): VendorAttribution => ({ vendor, url, credit: `${vendor} — ${product}`, trademark, reconstruction });
const ROGUE_TM = 'Rogue, Monster and The Strip are trademarks of Rogue Fitness.';

// ── Rogue Monster Strip and The 3x3 Strip 2.0 ───────────────────────────────────────────────────────
/** One wall-mounted 3" × 3" 11 ga storage tube. Published: 36" or 16" (Half-Strip) long, side holes 2" on centre, four
 * (or two) oversized front holes over 3/8" × 2-1/2" lags 8" / 16" / 8" on centre (12" on the Half-Strip), a detent pin.
 * Side holes sit on odd inches from the top, front holes on even inches (the photos show them staggered). */
export interface StripSpec {
  hole: number; lagHole: number; finish: { name: string; color: string; roughness: number };
  pin: { d: number; grip: number; collar: number; ring: { R: number; r: number; sx: number }; shank: string; head: string };
}
export const STRIP = { tube: inch(3), wall: 3.05, corner: 5, lengths: [inch(36), inch(16)], lagBore: 11 } as const;
export const MONSTER_STRIP: StripSpec = {
  hole: 26.2, lagHole: inch(1.625), finish: { name: 'MG Black powder coat', color: '#1d1e20', roughness: .7 },
  pin: { d: inch(1), grip: inch(4.5), collar: 17, ring: { R: 21, r: 3.6, sx: 1.3 }, shank: '#2a2c2f', head: '#1a1b1d' },
};
export const STRIP_2: StripSpec = {
  hole: 17.5, lagHole: inch(1.25), finish: { name: 'Signature Texture Black powder coat', color: '#1b1c1e', roughness: .82 },
  pin: { d: inch(.625), grip: inch(4), collar: 12.5, ring: { R: 17, r: 3, sx: 1.3 }, shank: '#2a2c2f', head: '#e3701f' },
};
const stripLength = (p: NumericParams) => { const L = STRIP.lengths[p.length]; if (L === undefined) throw Error('Unsupported strip length.'); return L; };
/** Stations along the strip, as distance from the top (mm). */
export function stripStations(p: NumericParams) {
  const L = stripLength(p), n = Math.round(L / inch(1));
  const side = Array.from({ length: n / 2 }, (_, i) => inch(1 + 2 * i));
  const front = Array.from({ length: n / 2 - 1 }, (_, i) => inch(2 + 2 * i));
  const lags = n === 36 ? [2, 10, 26, 34].map(inch) : [2, 14].map(inch);
  const band: [number, number] = n === 36 ? [inch(13), inch(23)] : [inch(5), inch(11)];
  return { L, side, front: front.filter(d => lags.includes(d) || d < band[0] || d > band[1]), lags, band };
}
/** Pin extents along X from the tube centre: the tip pokes out the −X side, the pull ring hangs off +X. */
export function pinReach(s: StripSpec) {
  const half = STRIP.tube / 2, collar = 9, ring = s.pin.ring;
  const ringCentre = half + 1 + collar + ring.R * ring.sx - ring.r;
  return { tip: half - s.pin.grip, collarX: half + 1, collar, ringCentre, ringMax: ringCentre + (ring.R + ring.r) * ring.sx };
}
const stripFace = (s: StripSpec) => (p: NumericParams) => ({ width: 2 * Math.max(pinReach(s).ringMax, -pinReach(s).tip), height: stripLength(p) });
const stripPart = <const Id extends string>(id: Id, title: string, spec: StripSpec, url: string, blurb: string, published: string) => ({ ...defineWallPart({
  id, name: title, title, noun: 'strip', section: 'Wall storage',
  description: `${blurb} Independent reconstruction from published specs and product photos; Rogue Fitness trademarks belong to Rogue Fitness.`,
  params: [
    { key: 'length', label: 'Length', default: 0, options: [0, 1], format: (v: number) => ['36″ Strip', '16″ Half-Strip'][v] ?? String(v) },
    { key: 'pin', label: 'Detent pin', default: 1, options: [0, 1], format: (v: number) => v ? 'In the top hole' : 'Removed' },
  ],
  face: stripFace(spec), depth: STRIP.tube, height: 1500,
  vendor: credit('Rogue Fitness', url, title, ROGUE_TM, `${published} Estimated from photos: hole diameters, lag-access hole size, the staggered odd/even-inch hole rows and the lettering band; the laser-cut ROGUE lettering is a plain badge. Scenery only, excluded from print export.`),
}), spec });
export const ROGUE_MONSTER_STRIP = stripPart('rogue-monster-strip', 'Rogue Monster Strip', MONSTER_STRIP, 'https://www.roguefitness.com/monster-strip',
  'Rogue Monster Strip: a 36″ (or 16″ Half-Strip) 3×3″ 11 ga MG Black tube lagged into a stud, drilled on 2″ centres for 1″ Monster hardware, with a 1″ × 4-1/2″ detent pin, to store Monster matadors, landmines, bar holders and plate horns on the wall.',
  'Published: 36″ / 16″ length, 3″ × 3″ 11 ga tube, side holes 2″ on centre, 1″ × 4-1/2″ detent pin, 3/8″ × 2-1/2″ lags with oversized front holes 8″ / 16″ / 8″ on centre (12″ on the Half-Strip), MG Black powder coat, 13 / 6.75 lb.');
export const ROGUE_3X3_STRIP_2 = stripPart('rogue-3x3-strip-2', 'Rogue 3x3 Strip 2.0', STRIP_2, 'https://www.roguefitness.com/the-3x3-strip-2-0',
  'Rogue 3x3 Strip 2.0: a 36″ (or 16″ Half-Strip) 3×3″ 11 ga textured black tube lagged into a stud, drilled on 2″ centres for 5/8″ Monster Lite hardware, with an orange-handled 5/8″ × 4″ detent pin, to store Monster Lite attachments on the wall.',
  'Published: 36″ / 16″ length, 3″ × 3″ 11 ga tube, holes 2″ on centre on both sides, 5/8″ × 4″ detent pin, four 3/8″ × 2-1/2″ wood lags with oversized front holes 8″ / 16″ / 8″ on centre (12″ on the Half-Strip), Signature Texture Black powder coat.');

export const PARTS = [ROGUE_MONSTER_STRIP, ROGUE_3X3_STRIP_2] as const;
