/** Lever arms, belt squat attachments, band pegs and grip (#135): Manifold builders for the entries in ../rack-parts/rack-levers-belt-squat.ts.
 * Family slot: catalog.ts spreads `definitions`. */
import type { PartDefinition } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { JD_WRIST_ROLLER, OAK_CLUB_IRON_3, REP_BAND_PEGS_2, ROGUE_MONSTER_LITE_BAND_PEG, ROGUE_MONSTER_PLATE_STORAGE_PIN, ROGUE_SP3358_PLATE_STORAGE } from '../rack-parts/rack-levers-belt-squat-pegs.ts';
import { buildIron3, buildMonsterLitePeg, buildMonsterStoragePin, buildRepPeg, buildSpPlateStorage, buildWristRoller } from './rack-levers-belt-squat-pegs.ts';
export const definitions: PartDefinition[] = [
  rackDefinition(ROGUE_MONSTER_PLATE_STORAGE_PIN, buildMonsterStoragePin),
  rackDefinition(ROGUE_MONSTER_LITE_BAND_PEG, buildMonsterLitePeg),
  rackDefinition(JD_WRIST_ROLLER, buildWristRoller),
  rackDefinition(OAK_CLUB_IRON_3, buildIron3),
  rackDefinition(REP_BAND_PEGS_2, buildRepPeg),
  rackDefinition(ROGUE_SP3358_PLATE_STORAGE, buildSpPlateStorage),
];
