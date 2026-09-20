/** Bikes, treadmills and other cardio machines: Manifold builders for the entries in ../floor-parts/cardio.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry. */
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  PARTS, TREADMILL_SPECS, PELOTON_BIKE_PART, PELOTON_BIKE_PLUS_PART, SCHWINN_IC4_PART, SUNNY_B1002_PART,
  ASSAULTRUNNER_PRO_PART, ASSAULTRUNNER_ELITE_PART, MAX_TRAINER_M6_PART, WATERROWER_PART, STAIRMASTER_8GX_PART, SOLE_E35_PART,
} from '../floor-parts/cardio.ts';
import { buildPelotonBike, buildSchwinnIC4, buildSunnyB1002 } from './cardio-bikes.ts';
import { buildTreadmill } from './cardio-treadmills.ts';
import { buildAssaultRunner, buildMaxTrainer, buildSoleE35, buildStairMaster, buildWaterRower } from './cardio-machines.ts';

type Build = (api: ManifoldAPI, p: NumericParams) => SolidPart[];
const BUILDERS: Record<string, Build> = {
  [PELOTON_BIKE_PART.id]: api => buildPelotonBike(api, false),
  [PELOTON_BIKE_PLUS_PART.id]: api => buildPelotonBike(api, true),
  [SCHWINN_IC4_PART.id]: api => buildSchwinnIC4(api),
  [SUNNY_B1002_PART.id]: api => buildSunnyB1002(api),
  [ASSAULTRUNNER_PRO_PART.id]: api => buildAssaultRunner(api, false),
  [ASSAULTRUNNER_ELITE_PART.id]: api => buildAssaultRunner(api, true),
  [MAX_TRAINER_M6_PART.id]: api => buildMaxTrainer(api),
  [WATERROWER_PART.id]: (api, p) => buildWaterRower(api, p),
  [STAIRMASTER_8GX_PART.id]: (api, p) => buildStairMaster(api, p),
  [SOLE_E35_PART.id]: api => buildSoleE35(api),
};
for (const [id, spec] of Object.entries(TREADMILL_SPECS)) BUILDERS[id] = (api, p) => buildTreadmill(api, spec, p, id);
/** Builder for a cardio entry id (tests use it directly). */
export function buildCardioPart(id: string): Build {
  const b = BUILDERS[id]; if (!b) throw Error(`No cardio builder for ${id}.`); return b;
}
export const definitions: PartDefinition[] = PARTS.map(part => floorDefinition(part, (api, p) => buildCardioPart(part.id)(api, { ...part.defaults, ...p })));
