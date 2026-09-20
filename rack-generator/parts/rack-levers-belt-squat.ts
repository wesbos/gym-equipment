/** Lever arms, belt squat attachments, band pegs and grip (#135): Manifold builders for the entries in ../rack-parts/rack-levers-belt-squat.ts.
 * Family slot: catalog.ts spreads `definitions`. */
import type { PartDefinition } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { BOS_SHOULDER_BOULDER, FRINGE_MAMMOTH_BELT_SQUAT, ROGUE_MONSTER_LITE_LEVER_ARMS, VENDETTA_180_LEVER_ARM_ADAPTERS } from '../rack-parts/rack-levers-belt-squat-levers.ts';
import { buildMammoth, buildMlLeverArm, buildShoulderBoulder, buildVendetta } from './rack-levers-belt-squat-levers.ts';
import { GETRXD_RX3_CENTER_POST, ROGUE_VELOCIDOR } from '../rack-parts/rack-levers-belt-squat-mounts.ts';
import { buildRx3CenterPost, buildVelocidor } from './rack-levers-belt-squat-mounts.ts';
import { ROGUE_RHINO_BELT_SQUAT_DROP_IN } from '../rack-parts/rack-levers-belt-squat-rhino.ts';
import { buildRhinoDropIn } from './rack-levers-belt-squat-rhino.ts';
import { JD_WRIST_ROLLER, OAK_CLUB_IRON_3, REP_BAND_PEGS_2, ROGUE_MONSTER_LITE_BAND_PEG, ROGUE_MONSTER_PLATE_STORAGE_PIN, ROGUE_SP3358_PLATE_STORAGE } from '../rack-parts/rack-levers-belt-squat-pegs.ts';
import { buildIron3, buildMonsterLitePeg, buildMonsterStoragePin, buildRepPeg, buildSpPlateStorage, buildWristRoller } from './rack-levers-belt-squat-pegs.ts';
export const definitions: PartDefinition[] = [
  rackDefinition(FRINGE_MAMMOTH_BELT_SQUAT, buildMammoth),
  rackDefinition(BOS_SHOULDER_BOULDER, buildShoulderBoulder),
  rackDefinition(ROGUE_VELOCIDOR, buildVelocidor),
  rackDefinition(GETRXD_RX3_CENTER_POST, buildRx3CenterPost),
  rackDefinition(VENDETTA_180_LEVER_ARM_ADAPTERS, buildVendetta),
  rackDefinition(ROGUE_RHINO_BELT_SQUAT_DROP_IN, buildRhinoDropIn),
  rackDefinition(ROGUE_MONSTER_LITE_LEVER_ARMS, buildMlLeverArm),
  rackDefinition(ROGUE_MONSTER_PLATE_STORAGE_PIN, buildMonsterStoragePin),
  rackDefinition(ROGUE_MONSTER_LITE_BAND_PEG, buildMonsterLitePeg),
  rackDefinition(JD_WRIST_ROLLER, buildWristRoller),
  rackDefinition(OAK_CLUB_IRON_3, buildIron3),
  rackDefinition(REP_BAND_PEGS_2, buildRepPeg),
  rackDefinition(ROGUE_SP3358_PLATE_STORAGE, buildSpPlateStorage),
];
