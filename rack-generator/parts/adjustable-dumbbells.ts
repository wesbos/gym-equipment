/** Adjustable dumbbells and their stands: Manifold builders for the entries in ../floor-parts/adjustable-dumbbells.ts.
 * Family slot: catalog.ts already spreads `definitions`; each brand file adds one `floorDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { definitions as IRONMASTER } from './adjustable-dumbbells-ironmaster.ts';
import { definitions as NUOBELL } from './adjustable-dumbbells-nuobell.ts';
import { definitions as KENSUI } from './adjustable-dumbbells-kensui.ts';
import { definitions as BOWFLEX } from './adjustable-dumbbells-bowflex.ts';
import { definitions as REP } from './adjustable-dumbbells-rep.ts';
import { definitions as SNODE } from './adjustable-dumbbells-snode.ts';
import { definitions as EISENLINK } from './adjustable-dumbbells-eisenlink.ts';
import { definitions as MX_SELECT } from './adjustable-dumbbells-mx-select.ts';
import { definitions as TRULAP } from './adjustable-dumbbells-trulap.ts';
import { definitions as POWERBLOCK } from './adjustable-dumbbells-powerblock.ts';
export const definitions: PartDefinition[] = [...IRONMASTER, ...NUOBELL, ...KENSUI, ...BOWFLEX, ...REP, ...SNODE, ...EISENLINK, ...MX_SELECT, ...TRULAP, ...POWERBLOCK];
