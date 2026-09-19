/** Rogue Monster Band Peg 2.0 (#131 proof entry). Metadata only (main bundle): never import Manifold builders here.
 * Research: research/rack-registry.md. */
import { defineRackPart, PIN_1IN } from '../rack-part.ts';
import type { NumericParams } from '../types.ts';
const inch = (v: number) => v * 25.4;
/** Published: 11" overall including the cap, 1" rod, 7-3/8" proud of a 3" upright when fully inserted.
 * The cap height follows from those three: 11 - 3 - 7.375 = 5/8". Cap/hex size estimated from photos. */
export const BAND_PEG = { length: inch(11), rod: inch(1), proud: inch(7.375), cap: inch(0.625), capDiameter: inch(1.5), hexAcrossFlats: inch(1.5) } as const;
export const BAND_PEG_HEADS = ['Machined chamfered cap', 'Standard hex head'] as const;
export const BAND_PEG_FINISHES = ['Proprietary matte black', 'Bright zinc'] as const;
/** Rod length behind the mounting face: the rod passes the upright and the cap bears on the opposite face. */
export const bandPegProud = (p: NumericParams) => BAND_PEG.length - BAND_PEG.cap - (p.upright ?? 75);
export const ROGUE_MONSTER_BAND_PEG = defineRackPart({
  id: 'rogue-monster-band-peg-2', name: 'Rogue Monster Band Peg 2.0', title: 'Rogue Monster Band Pegs 2.0', noun: 'band peg', section: 'Band pegs & grip',
  description: '1-inch solid steel band pegs for Monster uprights · 11 in overall · 7-3/8 in proud of a 3 in tube. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'head', label: 'Head', default: 0, options: [0, 1], format: v => BAND_PEG_HEADS[v] ?? String(v) },
    // The machined two-piece version ships only in matte black; the hex version in black or bright zinc.
    { key: 'finish', label: 'Finish', default: 0, options: p => p.head ? [0, 1] : [0], format: v => BAND_PEG_FINISHES[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/monster-band-pegs-2-0-4-pack',
    credit: 'Rogue Fitness — Monster Band Peg 2.0 · Made in USA', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 11 in overall length, 1 in rod and 7-3/8 in projection from a 3 in upright. Cap and hex-head sizes and chamfers estimated from product photos; physical fit unverified.',
  },
  // Through the upright: cap on the far face, rod proud of the mounting face.
  mount: { pin: PIN_1IN, extent: { below: BAND_PEG.capDiameter / 2, above: BAND_PEG.capDiameter / 2 } },
  bodies: p => {
    const face = (p.upright ?? 75) / 2, r = BAND_PEG.rod / 2, head = BAND_PEG.capDiameter / 2;
    return [
      { min: [-r, face, -r], max: [r, face + bandPegProud(p), r] },
      { min: [-head, -face - BAND_PEG.cap, -head], max: [head, -face, head] },
    ];
  },
  pair: { default: true },
  // Low on the uprights, pointing out past the sleeves, where bands run up to the bar.
  placement: { height: 115, face: 'outside' },
});
