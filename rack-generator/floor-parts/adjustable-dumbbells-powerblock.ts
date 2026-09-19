/** PowerBlock dumbbell stands: Large Column Stand and Large Compact Stand (metadata only, no Manifold imports).
 * The dumbbells themselves are presets of the `powerblock` entry (floor-parts/powerblock.ts). */
import { defineFloorPart } from '../floor-part.ts';
import { POWERBLOCK_MODELS } from './powerblock.ts';
import { inch } from './adjustable-dumbbells-common.ts';
/** Loads: 0 = empty, otherwise 1 + a POWERBLOCK_MODELS index. Both stands are rated for PowerBlock pairs up to 90 lb per hand
 * (so not the Pro 100 EXP); the angled column tray fits sets up to the 16.25" Elite USA 90 inside its 18" footprint. */
const loads = (maxLength: number) => [0, ...POWERBLOCK_MODELS.flatMap((m, i) => m.max <= 90 && m.length <= maxLength ? [i + 1] : [])];
export const COLUMN_LOADS = loads(413), COMPACT_LOADS = loads(432);
/** Overall length of a racked PowerBlock as built: plate nest plus the 1.2 mm end-face badges on Pro-style sets. */
export const powerBlockLength = (load: number) => { const m = POWERBLOCK_MODELS[load - 1]; return m ? m.length + (m.faceBadge ? 2.4 : 0) : 0; };
const loadLabel = (v: number) => v ? `${POWERBLOCK_MODELS[v - 1]?.name ?? v} pair` : 'Empty';
/** Published 22" W × 18" D × 28" H (powerblock.com); tray, column and channel sizes estimated from product photos. */
export const COLUMN_STAND = { width: inch(22), depth: inch(18), height: inch(28), base: inch(1.5), column: [inch(8), inch(5.5)] as const,
  trayWidth: inch(22), trayDepth: inch(16), tilt: 8, lip: inch(1.5), channel: inch(3), channelRise: inch(2) } as const;
/** Published 18" W × 17" D × 26" H unfolded, 2" folded (powerblock.com); tray and tube sizes estimated from product photos. */
export const COMPACT_STAND = { width: inch(18), depth: 432, height: inch(26), trayDepth: inch(15), lip: inch(1), channel: inch(2.5), channelRise: inch(1.5), tube: 25 } as const;
const vendor = (product: string, url: string, published: string) => ({ vendor: 'PowerBlock', url, credit: `PowerBlock — ${product}`, trademark: 'PowerBlock is a trademark of PowerBlock.',
  reconstruction: `Independent Manifold reconstruction from the published ${published} and product photos. Tray, tube and channel sizes estimated; a loaded pair reuses the PowerBlock dumbbell builder; scenery only, excluded from print export.` });
export const POWERBLOCK_COLUMN_STAND = defineFloorPart({
  id: 'powerblock-column-stand', name: 'PowerBlock Large Column Stand', title: 'PowerBlock Large Column Stand', noun: 'dumbbell stand', section: 'Floor storage',
  description: 'PowerBlock Large Column Stand: angled tray with grip mats and a micro-weight channel on a single column. Independent reconstruction from published dimensions; PowerBlock trademarks belong to PowerBlock.',
  params: [
    { key: 'finish', label: 'Column finish', default: 0, options: [0, 1], format: v => ['Silver', 'Black'][v] ?? String(v) },
    { key: 'load', label: 'Dumbbells', default: 1, options: COLUMN_LOADS, format: loadLabel },
  ],
  footprint: { width: COLUMN_STAND.width, depth: COLUMN_STAND.depth },
  placement: { side: 'left', gap: 300 },
  vendor: vendor('Large Column Stand', 'https://powerblock.com/products/column-stand', '18" × 22" × 28" envelope'),
});
export const POWERBLOCK_COMPACT_STAND = defineFloorPart({
  id: 'powerblock-large-compact-stand', name: 'PowerBlock Large Compact Stand', title: 'PowerBlock Large Compact Stand', noun: 'dumbbell stand', section: 'Floor storage',
  description: 'PowerBlock Large Compact Stand: folding X-leg stand with a lipped tray and micro-weight channel. Independent reconstruction from published dimensions; PowerBlock trademarks belong to PowerBlock.',
  params: [{ key: 'load', label: 'Dumbbells', default: 1, options: COMPACT_LOADS, format: loadLabel }],
  // A 17" Commercial Pro 90 pair overhangs the 17" leg spread by a hair.
  footprint: p => ({ width: COMPACT_STAND.width, depth: Math.max(COMPACT_STAND.depth, powerBlockLength(p.load)) }),
  placement: { side: 'left', gap: 300 },
  vendor: vendor('Large Compact Stand', 'https://powerblock.com/products/compact-stand', '18" × 17" × 26" unfolded envelope'),
});
export const PARTS = [POWERBLOCK_COLUMN_STAND, POWERBLOCK_COMPACT_STAND] as const;
