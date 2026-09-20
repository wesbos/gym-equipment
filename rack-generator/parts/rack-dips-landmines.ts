/** Dip attachments, landmines and landmine handles (#134): Manifold builders for the entries in ../rack-parts/rack-dips-landmines.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `rackDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { definitions as landmines } from './rack-dips-landmines-landmines.ts';
export const definitions: PartDefinition[] = [...landmines];
