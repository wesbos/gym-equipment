/** Mats, platforms, jacks and other floor accessories: Manifold builders for the entries in ../floor-parts/floor-accessories.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  ABMAT, ABMAT_BARBELL_PILLOWS, ABMAT_HIP_THRUST_PAD, AMAZON_BASICS_ROLLER, BENCH_BLOKZ_ENTRY, DIY_LIFTING_PLATFORM, DYNAMAX_MEDICINE_BALL, MASSENOMICS_GRIPPER, REP_CORK_SQUAT_WEDGE,
  REP_GENESIS_JACK, RITFIT_DEADLIFT_JACK, ROGUE_ECHO_SLAM_BALL, ROGUE_MEDICINE_BALL, ROGUE_OLY_PLATFORM, TITAN_SQUAT_WEDGE, TRIGGERPOINT_GRID, TSC_STALL_MAT, U4C_CALF_CURVE,
} from '../floor-parts/floor-accessories.ts';
import { buildDiyPlatform, buildMatGripper, buildRoguePlatform, buildStallMat } from './floor-accessories-mats.ts';
import { buildBenchBlokz, buildCalfCurve, buildGenesisJack, buildRepWedge, buildRitfitJack, buildTitanWedge } from './floor-accessories-jacks.ts';
import { buildAbmat, buildAmazonRoller, buildBarbellPillows, buildDynamaxBall, buildEchoSlamBall, buildGridRoller, buildHipThrustPad, buildRogueMedBall } from './floor-accessories-soft.ts';
export const definitions: PartDefinition[] = [
  floorDefinition(TSC_STALL_MAT, buildStallMat), floorDefinition(MASSENOMICS_GRIPPER, buildMatGripper), floorDefinition(ABMAT_HIP_THRUST_PAD, buildHipThrustPad),
  floorDefinition(ABMAT, buildAbmat), floorDefinition(ABMAT_BARBELL_PILLOWS, buildBarbellPillows), floorDefinition(REP_GENESIS_JACK, buildGenesisJack),
  floorDefinition(BENCH_BLOKZ_ENTRY, buildBenchBlokz), floorDefinition(DIY_LIFTING_PLATFORM, buildDiyPlatform), floorDefinition(TRIGGERPOINT_GRID, buildGridRoller),
  floorDefinition(RITFIT_DEADLIFT_JACK, buildRitfitJack), floorDefinition(REP_CORK_SQUAT_WEDGE, buildRepWedge), floorDefinition(TITAN_SQUAT_WEDGE, buildTitanWedge),
  floorDefinition(AMAZON_BASICS_ROLLER, buildAmazonRoller), floorDefinition(U4C_CALF_CURVE, buildCalfCurve), floorDefinition(ROGUE_MEDICINE_BALL, buildRogueMedBall),
  floorDefinition(ROGUE_ECHO_SLAM_BALL, buildEchoSlamBall), floorDefinition(DYNAMAX_MEDICINE_BALL, buildDynamaxBall), floorDefinition(ROGUE_OLY_PLATFORM, buildRoguePlatform),
];
