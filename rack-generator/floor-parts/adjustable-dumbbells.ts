/** Adjustable dumbbells and their stands. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: floor-registry.ts already spreads PARTS. Entries live in per-brand files, roughly most-owned first. */
import type { FloorPart } from '../floor-part.ts';
import { PARTS as IRONMASTER } from './adjustable-dumbbells-ironmaster.ts';
import { PARTS as NUOBELL } from './adjustable-dumbbells-nuobell.ts';
import { PARTS as KENSUI } from './adjustable-dumbbells-kensui.ts';
import { PARTS as BOWFLEX } from './adjustable-dumbbells-bowflex.ts';
import { PARTS as REP } from './adjustable-dumbbells-rep.ts';
import { PARTS as SNODE } from './adjustable-dumbbells-snode.ts';
import { PARTS as EISENLINK } from './adjustable-dumbbells-eisenlink.ts';
import { PARTS as MX_SELECT } from './adjustable-dumbbells-mx-select.ts';
import { PARTS as TRULAP } from './adjustable-dumbbells-trulap.ts';
import { PARTS as POWERBLOCK } from './adjustable-dumbbells-powerblock.ts';
export const PARTS = [...IRONMASTER, ...NUOBELL, ...KENSUI, ...BOWFLEX, ...REP, ...SNODE, ...EISENLINK, ...MX_SELECT, ...TRULAP, ...POWERBLOCK] as const satisfies readonly FloorPart[];
