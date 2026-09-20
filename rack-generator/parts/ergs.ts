/** Concept2 and Rogue Echo ergs and air bikes: Manifold builders for the entries in ../floor-parts/ergs.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { ASSAULT_BIKE_CLASSIC, BOS_BLITZ_AIR_BIKE, CONCEPT2_MODEL_C, CONCEPT2_MODEL_D, CONCEPT2_ROWERG, REP_STRIVE_AIR_BIKE, ROGUE_ECHO_BIKE, CONCEPT2_SKIERG, ROGUE_ECHO_SKI, CONCEPT2_BIKEERG, ROGUE_ECHO_ROWER, SCHWINN_AIRDYNE_AD6, SCHWINN_AIRDYNE_AD7, SCHWINN_AIRDYNE_AD4, SCHWINN_AIRDYNE_AD3 } from '../floor-parts/ergs.ts';
import { buildAirBike } from './ergs-bikes.ts';
import { airdyneAd3, airdyneAd4, airdyneAd6, airdyneAd7, assaultClassic, blitz, echoBike, strive } from './ergs-bike-specs.ts';
import { buildC2Rower, buildEchoRower } from './ergs-rowers.ts';
import { buildSkiErg } from './ergs-ski.ts';
import { buildBikeErg } from './ergs-bikeerg.ts';
export const definitions: PartDefinition[] = [
  floorDefinition(ROGUE_ECHO_BIKE, api => buildAirBike(api, echoBike())),
  floorDefinition(CONCEPT2_ROWERG, (api, p) => buildC2Rower(api, 'rowerg', p)),
  floorDefinition(CONCEPT2_MODEL_D, (api, p) => buildC2Rower(api, 'd', p)),
  floorDefinition(CONCEPT2_MODEL_C, (api, p) => buildC2Rower(api, 'c', p)),
  floorDefinition(ASSAULT_BIKE_CLASSIC, api => buildAirBike(api, assaultClassic())),
  floorDefinition(SCHWINN_AIRDYNE_AD7, api => buildAirBike(api, airdyneAd7())),
  floorDefinition(SCHWINN_AIRDYNE_AD6, api => buildAirBike(api, airdyneAd6())),
  floorDefinition(SCHWINN_AIRDYNE_AD4, api => buildAirBike(api, airdyneAd4())),
  floorDefinition(SCHWINN_AIRDYNE_AD3, api => buildAirBike(api, airdyneAd3())),
  floorDefinition(REP_STRIVE_AIR_BIKE, api => buildAirBike(api, strive())),
  floorDefinition(BOS_BLITZ_AIR_BIKE, api => buildAirBike(api, blitz())),
  floorDefinition(CONCEPT2_SKIERG, (api, p) => buildSkiErg(api, 'c2', p)),
  floorDefinition(ROGUE_ECHO_SKI, (api, p) => buildSkiErg(api, 'echo', p)),
  floorDefinition(CONCEPT2_BIKEERG, buildBikeErg),
  floorDefinition(ROGUE_ECHO_ROWER, buildEchoRower),
];
