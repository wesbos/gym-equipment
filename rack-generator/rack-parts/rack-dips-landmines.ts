/** Dip attachments, landmines and landmine handles (#134). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS (`defineRackPart({ section: 'Dips & landmines', ... })`); rack-registry.ts already spreads it.
 * Entries live in rack-dips-landmines-dips.ts (dip attachments, Swan Neck) and rack-dips-landmines-landmines.ts
 * (rack landmines). Listed most-owned first (Gym Radar, Sep 2026). */
import type { RackPart } from '../rack-part.ts';
import { BOS_LANDMINE, KLEVA_ADROIT_2, REP_KLEVA_ADROIT, REP_LANDMINE, ROGUE_LANDMINE, ROGUE_MONSTER_LANDMINE } from './rack-dips-landmines-landmines.ts';
import { BOS_Y_DIP, FRINGE_SWAN_NECK, MUTANT_HANDLES, MUTANT_UDA, REP_DIP_STATION, REP_DROP_IN_DIP, ROGUE_MATADOR } from './rack-dips-landmines-dips.ts';
export const PARTS = [
  MUTANT_UDA, ROGUE_MATADOR, MUTANT_HANDLES, REP_KLEVA_ADROIT, ROGUE_MONSTER_LANDMINE, KLEVA_ADROIT_2, ROGUE_LANDMINE, BOS_LANDMINE, REP_DIP_STATION,
  REP_LANDMINE, REP_DROP_IN_DIP, BOS_Y_DIP, FRINGE_SWAN_NECK,
] as const satisfies readonly RackPart[];
