/** REP Fitness benches and bench attachments: Manifold builders for the entries in ../floor-parts/rep-benches.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { REP_AB_3000, REP_AB_3000_2, REP_AB_5000, REP_AB_3100, REP_AB_4100, REP_AB_5200, REP_AB_5200_2, REP_BENCH_PAD, REP_BLACKWING, REP_FB_5000, REP_LEG_EXTENSION_CURL, REP_LEG_ROLLER } from '../floor-parts/rep-benches.ts';
import { AB3100_BENCH, AB4100_BENCH, AB5200_BENCH, AB5202_BENCH, buildLadderBench } from './rep-benches-ladder.ts';
import { buildBlackWing } from './rep-benches-adjustable.ts';
import { buildAb3000, buildAb5000 } from './rep-benches-fid.ts';
import { buildBenchPad, buildFB5000 } from './rep-benches-flat.ts';
import { buildLegExtensionCurl, buildLegRoller } from './rep-benches-attachments.ts';
export const definitions: PartDefinition[] = [
  floorDefinition(REP_FB_5000, buildFB5000),
  floorDefinition(REP_BLACKWING, buildBlackWing),
  floorDefinition(REP_AB_4100, buildLadderBench(AB4100_BENCH)),
  floorDefinition(REP_AB_5200_2, buildLadderBench(AB5202_BENCH)),
  floorDefinition(REP_AB_3100, buildLadderBench(AB3100_BENCH)),
  floorDefinition(REP_AB_3000_2, buildAb3000(true)),
  floorDefinition(REP_AB_3000, buildAb3000(false)),
  floorDefinition(REP_AB_5200, buildLadderBench(AB5200_BENCH)),
  floorDefinition(REP_AB_5000, buildAb5000),
  floorDefinition(REP_LEG_ROLLER, buildLegRoller),
  floorDefinition(REP_LEG_EXTENSION_CURL, buildLegExtensionCurl),
  floorDefinition(REP_BENCH_PAD, buildBenchPad),
];
