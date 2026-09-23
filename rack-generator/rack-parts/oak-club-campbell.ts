import { defineRackPart, PIN_1IN } from '../rack-part.ts';
import type { NumericParams } from '../types.ts';

/** Published dimensions in mm; the 4-inch bracket envelope is photo-derived.
 * See research/oak-club-campbell.md for the measurements and mounting frames. */
export const CAMPBELL = { grip: 32, insideGrip: 133.35, plate: 6.35, liner: 6.35, height: 101.6, corner: 12.7 } as const;
export const campbellHand = (p: NumericParams) => ((p.hand ?? 0) + (p.mirror ?? 0)) % 2 ? -1 : 1;
export function campbellLayout(p: NumericParams) {
  const f = (p.upright ?? 75) / 2, w = (p.uprightWidth ?? p.upright ?? 75) / 2;
  const outer = f + CAMPBELL.liner + CAMPBELL.plate, r = CAMPBELL.grip / 2;
  return { f, w, outer, r, elbow: outer + CAMPBELL.insideGrip + r, tip: CAMPBELL.insideGrip + r, hand: campbellHand(p) };
}
export const OAK_CLUB_CAMPBELL = defineRackPart({
  id: 'oak-club-campbell', name: 'Oak Club Campbell', title: 'Oak Club Campbell Handles', noun: 'campbell handle', section: 'Band pegs & grip',
  description: 'Left and right L-grips for pull-ups on a crossmember or Hatfield / belt squats on uprights · 32 mm grips · 5¼ in inside grip length · lined 3×3 in bracket and 1 in pin. Independent reconstruction; Oak Club trademarks belong to Oak Club Mfg.',
  params: [
    { key: 'hand', label: 'Handle', default: 0, options: [0, 1], format: v => v ? 'Right' : 'Left' },
    { key: 'color', label: 'Color', default: 0, options: [0, 1], format: v => v ? '90s pink' : 'Sandtex black' },
  ],
  vendor: {
    vendor: 'Oak Club Mfg', url: 'https://oakclubmfg.com/collections/rackattachments/products/campbell',
    credit: 'Oak Club Mfg — Campbell handles · Made in Canada', trademark: 'Oak Club and Campbell are trademarks of Oak Club Mfg.',
    reconstruction: 'Published 32 mm grip, 5¼ in inside grip length, ¼ in steel and UHMW, 3×3 in / 1 in compatibility. Mirrored three-sided brackets, welded L-grips, cream-backed club cutout and end caps reconstructed from official photos. Bracket envelope, welds and pin-head details estimated; MagPin shown for mounting and sold separately by Oak Club.',
  },
  mount: {
    targets: ['upright', 'crossmember-top'], pin: PIN_1IN,
    extent: { below: CAMPBELL.height / 2, above: CAMPBELL.insideGrip + CAMPBELL.grip / 2 },
    // The tube's length becomes local Z; each handed web bears on the rail top.
    railRoll: p => -campbellHand(p) * Math.PI / 2,
    railEndClearance: CAMPBELL.height / 2 + 25,
    validate: rack => {
      if (rack.tube < 74 || rack.tube > 77 || (rack.tubeDepth ?? rack.tube) < 74 || (rack.tubeDepth ?? rack.tube) > 77)
        throw Error('Campbell handles fit 3×3 in (75–76.2 mm) square rack tubing with 1 in holes.');
    },
  },
  bodies: p => {
    const { outer, r, elbow, tip } = campbellLayout(p);
    return [
      { min: [-r, outer, -r], max: [r, elbow + r, r] },
      { min: [-r, elbow - r, 0], max: [r, elbow + r, tip] },
    ];
  },
  handed: true,
  pair: { default: true, mirrorParam: 'hand', railSpacing: { preferred: 450, min: 110 } },
  placement: { height: 1200, face: 'inside' },
});
