/** Leg rollers, seats and pads that mount on the rack (#132). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS (`defineRackPart({ section: 'Rollers & pads', ... })`); rack-registry.ts already spreads it. */
import type { RackPart } from '../rack-part.ts';
export const PARTS = [] as const satisfies readonly RackPart[];
