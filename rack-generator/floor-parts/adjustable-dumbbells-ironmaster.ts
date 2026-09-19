/** Adjustable dumbbells family: IronMaster Quick-Lock dumbbell and its stand (metadata only, no Manifold imports). */
import { defineFloorPart, type FloorBox, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { inch, pounds } from './adjustable-dumbbells-common.ts';
/** Published: 6.7" square plates, 1.25" knurled grip with 6.5" between the chrome backing plates (5.18" with the
 * Heavy Handle kit), 9" at 20 lb, 14.5" at 75 lb, 18.25" at 120 lb. Plate pitch (11.6 mm per 5 or 2.5 lb plate,
 * 48 mm per 22.5 lb plate) and the 8 mm backing plate + 12.4 mm screw head are solved from those lengths. */
export const QUICK_LOCK = { plate: 170, radius: 23, inside: 165, grip: 31.75, pan: 8, head: 12.4, headD: 103, pitch: 11.6, big: 48, heavy: 16.5 } as const;
/** Kits: 45 lb set, 75 lb set, + 120 lb add-on (one 22.5 lb plate per end), + 165 lb add-on (two per end). */
export const QUICK_LOCK_KITS = [
  { name: '5–45 lb set', maxEnd: 17.5, big: 0 },
  { name: '5–75 lb set', maxEnd: 32.5, big: 0 },
  { name: '75 lb set + 120 lb add-on kit', maxEnd: 55, big: 1 },
  { name: '75 lb set + 120 + 165 lb add-on kits', maxEnd: 77.5, big: 2 },
] as const;
const kitOf = (p: NumericParams) => { const kit = QUICK_LOCK_KITS[p.kit]; if (!kit || ![0, 1].includes(p.heavy)) throw Error('Unsupported dumbbell kit.'); return kit; };
/** 2.5 lb steps from the bare handle (5 lb, +15 lb with the Heavy Handle plates) to the kit maximum: 29 settings on the 75 lb set. */
export function quickLockWeights(p: NumericParams): number[] {
  const kit = kitOf(p), base = 5 + 15 * p.heavy;
  return Array.from({ length: (2 * kit.maxEnd + 5) / 2.5 + 1 }, (_, i) => base + 2.5 * i);
}
export interface QuickLockEnd { big: number; five: number; small: number; load: number }
/** Plates on each end, big 22.5 lb plates innermost, then 5 lb, then the 2.5 lb plate under the screw.
 * Odd 2.5 lb settings carry one extra 2.5 lb on one end only (the manual's single-plate offset). */
export function quickLockLoading(p: NumericParams) {
  const kit = kitOf(p), base = 5 + 15 * p.heavy;
  if (!quickLockWeights(p).includes(p.weight)) throw Error('Unsupported dumbbell weight.');
  // 2.5 lb above the bare handle is one locking screw on one end; every higher setting has both screws.
  const screws = p.weight > base + 2.5 ? 2 : p.weight > base ? 1 : 0, total = screws === 2 ? p.weight - base - 5 : 0, a = 2.5 * Math.floor(total / 5 + 1e-9);
  const end = (load: number): QuickLockEnd => {
    const big = load > 32.5 ? Math.ceil((load - 32.5) / 22.5 - 1e-9) : 0, rest = load - 22.5 * big, five = Math.floor(rest / 5 + 1e-9);
    if (big > kit.big) throw Error('Unsupported dumbbell weight.');
    return { big, five, small: rest - 5 * five > 1e-9 ? 1 : 0, load };
  };
  const ends = [end(a), end(total - a)] as const;
  const stack = (e: QuickLockEnd) => e.big * QUICK_LOCK.big + (e.five + e.small) * QUICK_LOCK.pitch;
  return { screws, ends, length: QUICK_LOCK.inside + 2 * QUICK_LOCK.pan + stack(ends[0]) + stack(ends[1]) + screws * QUICK_LOCK.head };
}
export const QUICK_LOCK_DUMBBELL = defineFloorPart({
  id: 'ironmaster-quick-lock-dumbbell', name: 'IronMaster Quick-Lock dumbbell', title: 'IronMaster Quick-Lock adjustable dumbbell', noun: 'dumbbell', section: 'Dumbbells',
  description: 'IronMaster Quick-Lock adjustable dumbbell: chrome handle, square cast-iron plates and Quick-Lock screws, with the 45 or 75 lb set, the 120 and 165 lb add-on kits and the Heavy Handle kit. Independent reconstruction from published dimensions; IronMaster trademarks belong to IronMaster.',
  params: [
    { key: 'kit', label: 'Kit', default: 1, options: QUICK_LOCK_KITS.map((_, i) => i), format: v => QUICK_LOCK_KITS[v]?.name ?? String(v) },
    { key: 'heavy', label: 'Heavy Handle kit', default: 0, options: [0, 1], format: v => ['No', 'Fitted (+15 lb)'][v] ?? String(v) },
    { key: 'weight', label: 'Loaded weight', default: 75, options: quickLockWeights, format: v => `${pounds(v)}${v % 5 ? ' (one end +2.5)' : ''}` },
  ],
  // Lies on the plate edges with the long axis along floor depth, so "Add matching pair" sets the second one beside it.
  footprint: (p: NumericParams): FloorBox => ({ width: QUICK_LOCK.plate, depth: quickLockLoading(p).length }),
  placement: { side: 'left', gap: 300 },
  pair: { gap: 60 },
  vendor: {vendor:'IronMaster',url:'https://www.ironmaster.com/products/quick-lock-adjustable-dumbbells-75-original/',credit:'IronMaster — Quick-Lock Adjustable Dumbbells, 120 lb / 165 lb Add-On Kits and Heavy Handle Plate Kit',trademark:'IronMaster and Quick-Lock are trademarks of IronMaster, LLC.',reconstruction:'Independent Manifold reconstruction from published 6.7" plates, 1.25" × 6.5" grip, 5.18" Heavy Handle grip and 9" / 14.5" / 18.25" loaded lengths, the published plate and screw weights and product photos. Plate pitch, taper and face relief, backing-plate and screw-head sizes are estimates; the 165 lb length follows the 120 lb plate thickness (22.1", published 23.5"). Scenery only, excluded from print export.'},
});
/** Stand for Quick-Lock Adjustable Dumbbells (SKU 1008): published 14.5" × 19" top, 26" tall; 12.5" × 25" end panels,
 * two 12 3/8" × 16 7/8" rubber-covered shelves, a separator above the upper shelf and four levelling feet. */
export const QUICK_LOCK_STAND_SIZE = { width: inch(14.5), depth: inch(19), height: inch(26), panel: inch(12.5), shelfLength: inch(16.875), shelfDepth: inch(12.375) } as const;
export const QUICK_LOCK_STAND_LOADS = [0, 45, 75, 120] as const;
/** Kit and weight of the pair racked on the stand for a `load` value. */
export const quickLockStandPair = (load: number) => ({ kit: [0, 0, 1, 2][QUICK_LOCK_STAND_LOADS.indexOf(load as 0)], heavy: 0, weight: load });
export const QUICK_LOCK_STAND = defineFloorPart({
  id: 'ironmaster-quick-lock-stand', name: 'IronMaster Quick-Lock stand', title: 'IronMaster Quick-Lock dumbbell stand', noun: 'dumbbell stand', section: 'Floor storage',
  description: 'IronMaster stand for Quick-Lock adjustable dumbbells: dark grey steel end panels, rubber-matted top with end lips and two plate shelves. Independent reconstruction from published dimensions; IronMaster trademarks belong to IronMaster.',
  params: [
    { key: 'load', label: 'Dumbbells', default: 75, options: QUICK_LOCK_STAND_LOADS, format: v => v ? `Pair of ${v} lb dumbbells on top` : 'Empty' },
  ],
  footprint: { width: QUICK_LOCK_STAND_SIZE.width, depth: QUICK_LOCK_STAND_SIZE.depth },
  placement: { side: 'left', gap: 300 },
  vendor: {vendor:'IronMaster',url:'https://www.ironmaster.com/products/stand-for-quick-lock-adjustable-dumbbells/',credit:'IronMaster — Stand for Quick-Lock Adjustable Dumbbells (SKU 1008)',trademark:'IronMaster and Quick-Lock are trademarks of IronMaster, LLC.',reconstruction:'Independent Manifold reconstruction from the published 14.5" × 19" × 26" envelope, the assembly sheet part sizes (12.5" × 25" panels, 12 3/8" × 16 7/8" shelves), an owner-measured 2.1 mm top with 15 mm lips and 21 mm overhang, and product photos. Shelf heights, panel flanges, separator height and feet are estimates; scenery only, excluded from print export.'},
});
export const PARTS = [QUICK_LOCK_DUMBBELL, QUICK_LOCK_STAND] as const satisfies readonly FloorPart[];
