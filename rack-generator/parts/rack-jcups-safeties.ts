/** Brand J-cups, safeties, spotter arms and pull-up bars (#133): Manifold builders for the entries in ../rack-parts/rack-jcups-safeties.ts.
 * Family slot: catalog.ts spreads `definitions`; one `rackDefinition(PART, build)` per entry. Builders live in the
 * rack-jcups-safeties-*.ts files beside this one. */
import type { PartDefinition } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { buildGhostRoller, buildRepSandwich, buildRogueCup, buildBosRoller, buildIrwinRoller, buildTitanRoller } from './rack-jcups-safeties-cups.ts';
import { buildSaml, buildMonsterSpotter, buildRepSpotter, buildStealth, buildAlpha } from './rack-jcups-safeties-spotters.ts';
import { buildRepStraps, buildRogueStraps, buildBosStraps, buildFlipDown, buildRepPullUp, buildRepMultiGrip, buildRogueFatSkinny } from './rack-jcups-safeties-spans.ts';
import { buildAm2, buildSnapBack } from './rack-jcups-safeties-monolifts.ts';
import { GHOST_ROLLER_J_CUP, REP_FLAT_SANDWICH_J_CUPS, ROGUE_MONSTER_LITE_J_CUPS, ROGUE_MONSTER_SANDWICH_J_CUP, BOS_ROLLER_J_CUPS, IRWIN_RETURN_ROLLER_J_CUPS, TITAN_ROLLER_J_HOOKS } from '../rack-parts/rack-jcups-safeties-cups.ts';
import { ROGUE_SAML_24_SPOTTER_ARMS, ROGUE_MONSTER_SPOTTER_ARMS_2, REP_SPOTTER_ARMS, SURPLUS_STEALTH_SPOTTERS, OAK_CLUB_ALPHA_SPOTTER_ARMS } from '../rack-parts/rack-jcups-safeties-spotters.ts';
import { REP_STRAP_SAFETIES, ROGUE_MONSTER_STRAP_SAFETY_2, ROGUE_MONSTER_LITE_STRAP_SAFETY_2, BOS_SAFETY_STRAPS, REP_FLIP_DOWN_SAFETIES, REP_PULL_UP_BAR, REP_MULTI_GRIP_PULL_UP_BAR, ROGUE_FAT_SKINNY_PULL_UP_BAR } from '../rack-parts/rack-jcups-safeties-spans.ts';
import { ROGUE_AM_2_MONOLIFT, MUTANT_METALS_SNAP_BACK_MONOLIFT } from '../rack-parts/rack-jcups-safeties-monolifts.ts';
export const definitions: PartDefinition[] = [
  rackDefinition(GHOST_ROLLER_J_CUP, buildGhostRoller),
  rackDefinition(REP_FLAT_SANDWICH_J_CUPS, buildRepSandwich),
  rackDefinition(ROGUE_MONSTER_LITE_J_CUPS, (api, p) => buildRogueCup(api, p, 0)),
  rackDefinition(ROGUE_MONSTER_SANDWICH_J_CUP, (api, p) => buildRogueCup(api, p, 1)),
  rackDefinition(BOS_ROLLER_J_CUPS, buildBosRoller),
  rackDefinition(IRWIN_RETURN_ROLLER_J_CUPS, buildIrwinRoller),
  rackDefinition(TITAN_ROLLER_J_HOOKS, buildTitanRoller),
  rackDefinition(ROGUE_SAML_24_SPOTTER_ARMS, buildSaml),
  rackDefinition(ROGUE_MONSTER_SPOTTER_ARMS_2, buildMonsterSpotter),
  rackDefinition(REP_SPOTTER_ARMS, buildRepSpotter),
  rackDefinition(SURPLUS_STEALTH_SPOTTERS, buildStealth),
  rackDefinition(OAK_CLUB_ALPHA_SPOTTER_ARMS, buildAlpha),
  rackDefinition(REP_STRAP_SAFETIES, buildRepStraps),
  rackDefinition(ROGUE_MONSTER_STRAP_SAFETY_2, buildRogueStraps(false)),
  rackDefinition(ROGUE_MONSTER_LITE_STRAP_SAFETY_2, buildRogueStraps(true)),
  rackDefinition(BOS_SAFETY_STRAPS, buildBosStraps),
  rackDefinition(REP_FLIP_DOWN_SAFETIES, buildFlipDown),
  rackDefinition(REP_PULL_UP_BAR, buildRepPullUp),
  rackDefinition(REP_MULTI_GRIP_PULL_UP_BAR, buildRepMultiGrip),
  rackDefinition(ROGUE_FAT_SKINNY_PULL_UP_BAR, buildRogueFatSkinny),
  rackDefinition(ROGUE_AM_2_MONOLIFT, buildAm2),
  rackDefinition(MUTANT_METALS_SNAP_BACK_MONOLIFT, buildSnapBack),
];
