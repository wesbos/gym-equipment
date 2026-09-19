/** Rogue Monster Band Peg 2.0 builder (#131 proof entry). Source frame (rack-part.ts): origin on the upright centreline
 * at the hole axis, +Y out of the mounting face, Z up. The rod runs through the upright; the cap bears on the far face. */
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { vendorSolid } from './vendor-solid.ts';
import { BAND_PEG, bandPegProud, ROGUE_MONSTER_BAND_PEG } from '../rack-parts/rogue-band-pegs.ts';
/** Half-profile (radius, length) of a chamfered cylinder for Manifold.revolve; zero chamfers drop their corner point. */
export const revolveProfile = (radius: number, length: number, c0: number, c1: number): [number, number][] =>
  [[0, 0], ...(c0 ? [[radius - c0, 0]] : []), [radius, c0], [radius, length - c1], ...(c1 ? [[radius - c1, length]] : []), [0, length]] as [number, number][];
const FINISHES = [{ color: '#1c1d1f', metalness: .35, roughness: .72 }, { color: '#c7cbce', metalness: .88, roughness: .28 }] as const;
export function buildBandPeg(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_BAND_PEG.defaults, ...params }, face = (p.upright ?? 75) / 2, f = FINISHES[p.finish];
  if (!f || ![0, 1].includes(p.head)) throw Error('Unsupported band peg option.');
  return vendorSolid(api, s => {
    const { M, keep: k, add } = s, r = BAND_PEG.rod / 2, proud = bandPegProud(p), chamfer = 1.6;
    /** Solid of revolution along +Y from y0 to y1: radius r with `c` mm chamfers at both ends. */
    const rod = (y0: number, y1: number, radius: number, c0: number, c1: number, segments = 48) => {
      const pts = revolveProfile(radius, y1 - y0, c0, c1);
      return k(k(k(M.revolve([pts], segments)).rotate([-90, 0, 0])).translate([0, y0, 0]));
    };
    // 1-inch solid rod: from the cap face through the upright to the rounded-over tip 7-3/8 in proud of a 3 in tube.
    add('Band peg 1 in solid rod', rod(-face - .01, face + proud, r, 0, chamfer), 'source', f.color, f.metalness, f.roughness);
    const y0 = -face - BAND_PEG.cap;
    if (p.head === 0) {
      // Machined two-piece version: low round cap with a generous chamfer and a turned relief where it meets the rod.
      add('Machined chamfered cap', rod(y0, -face, BAND_PEG.capDiameter / 2, 3.2, .6, 64), 'source', f.color, f.metalness, f.roughness * .92);
      add('Cap press-fit seam', rod(-face - 1.2, -face + .6, r + .5, .2, .2), 'source', '#111214', .3, .8);
    } else {
      // Cast hex head, 1-1/2 in across flats (flats up and down, corners across the face), with the usual 30° washer-face chamfer on the outer corners.
      const circum = BAND_PEG.hexAcrossFlats / Math.sqrt(3);
      const hex = k(k(k(M.cylinder(BAND_PEG.cap, circum, circum, 6)).rotate([-90, 0, 0])).translate([0, y0, 0]));
      const crown = rod(y0, -face, circum, 3.8, 1.2, 64);
      add('Cast hex head', k(hex.intersect(crown)), 'source', f.color, f.metalness, f.roughness);
    }
  });
}
export const definitions: PartDefinition[] = [rackDefinition(ROGUE_MONSTER_BAND_PEG, buildBandPeg)];
