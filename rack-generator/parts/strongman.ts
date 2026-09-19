/** Strongman implements: Manifold builders for the entries in ../floor-parts/strongman.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { PARTS } from '../floor-parts/strongman.ts';
import { SANDBAG_DEFINITIONS } from './strongman-sandbags.ts';
import { STONE_DEFINITIONS } from './strongman-stones.ts';
import { FRAME_DEFINITIONS } from './strongman-frames.ts';
const all = [...SANDBAG_DEFINITIONS, ...STONE_DEFINITIONS, ...FRAME_DEFINITIONS];
/** Catalog order follows PARTS (most owned first). */
export const definitions: PartDefinition[] = PARTS.map(p => all.find(d => d.id === p.id)!);
