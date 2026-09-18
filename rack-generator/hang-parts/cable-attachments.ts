import { defineHangPart } from '../hang-part.ts';
/** REP cable attachments v1 set (repfitness.com/collections/cable-attachments, Sep 2026). Published specs are
 * quoted per entry; everything else is estimated from product photos. */
const rep = (handle: string, product: string, specs: string) => ({
  vendor: 'REP Fitness', url: `https://repfitness.com/products/${handle}`, credit: `REP Fitness — ${product}`,
  trademark: 'REP is a trademark of REP Fitness.',
  reconstruction: `Independent Manifold reconstruction. Published: ${specs}. Swivel, eye and secondary dimensions estimated from product photos; scenery only, excluded from print export.`,
});
/** The peg's upturned tip rises 26 mm above the anchor. */
const above = 26;
export const LAT_BAR = defineHangPart({ id: 'rep-lat-bar-48', name: '48″ solid lat bar', title: 'REP 48″ solid lat bar', noun: 'lat bar',
  envelope: { width: 1220, above, drop: 140 }, vendor: rep('48-inch-solid-lat-bar', '48" Solid Lat Bar', '48″ length, 26 mm fully knurled hard chrome') });
export const STRAIGHT_BAR = defineHangPart({ id: 'rep-straight-bar-25', name: '25″ straight bar', title: 'REP 25″ straight bar', noun: 'straight bar',
  envelope: { width: 640, above, drop: 70 }, vendor: rep('25-straight-bar-cable-attachment', '25" Straight Bar', '25″ length, 25.5 mm diameter') });
export const TRICEP_ROPE = defineHangPart({ id: 'rep-tricep-rope', name: 'Tricep rope', title: 'REP tricep rope', noun: 'rope',
  envelope: { width: 170, above, drop: 475 }, vendor: rep('tricep-rope', 'Tricep Rope', '860 mm black braided nylon, plastic end caps') });
export const D_HANDLES = defineHangPart({ id: 'rep-d-handles', name: 'D-handles (pair)', title: 'REP D-handle pair', noun: 'D-handles',
  envelope: { width: 200, above, drop: 305 }, vendor: rep('d-handle-cable-attachment', 'D-handle (steel, pair)', '32 mm steel grip, 10.3″ nylon strap, steel O-ring') });
export const TRIANGLE_ROW = defineHangPart({ id: 'rep-triangle-row', name: 'Triangle row', title: 'REP triangle row', noun: 'triangle row',
  envelope: { width: 240, above, drop: 215 }, vendor: rep('triangle-row', 'Triangle Row', '30 mm ergonomic grips, hard chrome') });
export const PUSHDOWN_BAR = defineHangPart({ id: 'rep-pushdown-bar', name: 'Tricep pushdown bar', title: 'REP tricep pushdown bar', noun: 'pushdown bar',
  envelope: { width: 440, above, drop: 225 }, vendor: rep('tricep-pressdown-bar', 'Tricep Pushdown Bar', '25.3 mm diameter, hard chrome') });
export const CURL_BAR = defineHangPart({ id: 'rep-curl-bar', name: 'Multi-grip curl bar', title: 'REP multi-grip (EZ) curl bar', noun: 'curl bar',
  envelope: { width: 725, above, drop: 115 }, vendor: rep('multi-grip-curl-bar', 'Multi-Grip Curl Bar', '28.3″ (720 mm) length, 25 mm diameter') });
export const ANKLE_CUFF = defineHangPart({ id: 'rep-ankle-cuff', name: 'Ankle cuff', title: 'REP ankle cuff', noun: 'ankle cuff',
  envelope: { width: 135, above, drop: 180 }, vendor: rep('ankle-cuff', 'Ankle Cuff', '25″ neoprene-padded nylon strap, steel D-rings') });
