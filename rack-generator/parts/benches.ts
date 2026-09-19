/** Rogue, Ironmaster, Freak Athlete and other benches: Manifold builders for the entries in ../floor-parts/benches.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  APEX_ADJUSTABLE_BENCH, FREAK_ATHLETE_ABX, IRONMASTER_SUPER_BENCH, IRONMASTER_SUPER_BENCH_PRO, MAJOR_FITNESS_PLT01, PRIME_SHORTY_BENCH,
  ROGUE_ADJUSTABLE_BENCH_2, ROGUE_ADJUSTABLE_BENCH_3, ROGUE_FLAT_UTILITY_BENCH_2, ROGUE_MANTA_RAY, ROGUE_MONSTER_UTILITY_BENCH_2, ROGUE_THOMPSON_FAT_PAD,
  TITAN_ELITE_FID_BENCH, TITAN_SEATED_STATIONARY_BENCH, TITAN_SINGLE_POST_FLAT_BENCH,
} from '../floor-parts/benches.ts';
import { buildAdjustable } from './benches-adjustable.ts';
import { buildIronmasterPro, buildIronmasterSB } from './benches-ironmaster.ts';
import { buildRogueFUB, buildRogueMUB, buildThompsonFatPad, buildTitanSeated, buildTitanSPFB } from './benches-flat.ts';
const adjustable = (part: { id: Parameters<typeof buildAdjustable>[1] } & Parameters<typeof floorDefinition>[0]) =>
  floorDefinition(part, (api, p) => buildAdjustable(api, part.id, p));
export const definitions: PartDefinition[] = [
  floorDefinition(IRONMASTER_SUPER_BENCH_PRO, buildIronmasterPro),
  adjustable(FREAK_ATHLETE_ABX),
  adjustable(ROGUE_ADJUSTABLE_BENCH_3),
  floorDefinition(ROGUE_FLAT_UTILITY_BENCH_2, buildRogueFUB),
  floorDefinition(ROGUE_MONSTER_UTILITY_BENCH_2, buildRogueMUB),
  floorDefinition(ROGUE_THOMPSON_FAT_PAD, buildThompsonFatPad),
  adjustable(ROGUE_MANTA_RAY),
  adjustable(ROGUE_ADJUSTABLE_BENCH_2),
  adjustable(APEX_ADJUSTABLE_BENCH),
  adjustable(PRIME_SHORTY_BENCH),
  floorDefinition(IRONMASTER_SUPER_BENCH, buildIronmasterSB),
  adjustable(MAJOR_FITNESS_PLT01),
  floorDefinition(TITAN_SEATED_STATIONARY_BENCH, buildTitanSeated),
  floorDefinition(TITAN_SINGLE_POST_FLAT_BENCH, buildTitanSPFB),
  adjustable(TITAN_ELITE_FID_BENCH),
];
