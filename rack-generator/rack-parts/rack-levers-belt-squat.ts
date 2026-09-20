/** Lever arms, belt squat attachments, band pegs and grip (#135). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: rack-registry.ts spreads PARTS. Entries live in rack-levers-belt-squat-*.ts; research in research/rack-levers-belt-squat.md.
 * Ordered by Gym Radar ownership within each section. */
import type { RackPart } from '../rack-part.ts';
import { BOS_SHOULDER_BOULDER, FRINGE_MAMMOTH_BELT_SQUAT, ROGUE_MONSTER_LITE_LEVER_ARMS, VENDETTA_180_LEVER_ARM_ADAPTERS } from './rack-levers-belt-squat-levers.ts';
import { GETRXD_RX3_CENTER_POST, ROGUE_VELOCIDOR } from './rack-levers-belt-squat-mounts.ts';
import { ROGUE_RHINO_BELT_SQUAT_DROP_IN } from './rack-levers-belt-squat-rhino.ts';
import { JD_WRIST_ROLLER, OAK_CLUB_IRON_3, REP_BAND_PEGS_2, ROGUE_MONSTER_LITE_BAND_PEG, ROGUE_MONSTER_PLATE_STORAGE_PIN, ROGUE_SP3358_PLATE_STORAGE } from './rack-levers-belt-squat-pegs.ts';
export const PARTS = [
  FRINGE_MAMMOTH_BELT_SQUAT, BOS_SHOULDER_BOULDER, ROGUE_VELOCIDOR, GETRXD_RX3_CENTER_POST, VENDETTA_180_LEVER_ARM_ADAPTERS, ROGUE_RHINO_BELT_SQUAT_DROP_IN, ROGUE_MONSTER_LITE_LEVER_ARMS,
  ROGUE_MONSTER_PLATE_STORAGE_PIN, ROGUE_MONSTER_LITE_BAND_PEG, JD_WRIST_ROLLER, OAK_CLUB_IRON_3, REP_BAND_PEGS_2, ROGUE_SP3358_PLATE_STORAGE,
] as const satisfies readonly RackPart[];
