/** Dip attachments, landmines and landmine handles (#134). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS (`defineRackPart({ section: 'Dips & landmines', ... })`); rack-registry.ts already spreads it.
 * Entries live in rack-dips-landmines-landmines.ts (rack landmines) and rack-dips-landmines-dips.ts (dip attachments). */
import type { RackPart } from '../rack-part.ts';
import { LANDMINES } from './rack-dips-landmines-landmines.ts';
export const PARTS = [...LANDMINES] as const satisfies readonly RackPart[];
