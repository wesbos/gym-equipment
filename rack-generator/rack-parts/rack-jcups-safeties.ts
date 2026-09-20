/** Brand J-cups, safeties, spotter arms and pull-up bars (#133). Metadata only (main bundle): never import Manifold builders here.
 * Family slot: rack-registry.ts spreads PARTS. Entries live in the rack-jcups-safeties-*.ts files beside this one
 * (cups, spotters, spans, monolifts); research notes in research/rack-jcups-safeties.md. Order: most owned first. */
import type { RackPart } from '../rack-part.ts';
import { GHOST_ROLLER_J_CUP, REP_FLAT_SANDWICH_J_CUPS, ROGUE_MONSTER_LITE_J_CUPS, ROGUE_MONSTER_SANDWICH_J_CUP, BOS_ROLLER_J_CUPS, IRWIN_RETURN_ROLLER_J_CUPS, TITAN_ROLLER_J_HOOKS } from './rack-jcups-safeties-cups.ts';
import { ROGUE_SAML_24_SPOTTER_ARMS, ROGUE_MONSTER_SPOTTER_ARMS_2, REP_SPOTTER_ARMS, SURPLUS_STEALTH_SPOTTERS, OAK_CLUB_ALPHA_SPOTTER_ARMS } from './rack-jcups-safeties-spotters.ts';
import { REP_STRAP_SAFETIES, ROGUE_MONSTER_STRAP_SAFETY_2, ROGUE_MONSTER_LITE_STRAP_SAFETY_2, BOS_SAFETY_STRAPS, REP_FLIP_DOWN_SAFETIES, REP_PULL_UP_BAR, REP_MULTI_GRIP_PULL_UP_BAR, ROGUE_FAT_SKINNY_PULL_UP_BAR } from './rack-jcups-safeties-spans.ts';
import { ROGUE_AM_2_MONOLIFT, MUTANT_METALS_SNAP_BACK_MONOLIFT } from './rack-jcups-safeties-monolifts.ts';
import { FEET_PARTS } from './rack-jcups-safeties-feet.ts';
export const PARTS = [
  GHOST_ROLLER_J_CUP, ROGUE_SAML_24_SPOTTER_ARMS, REP_SPOTTER_ARMS, REP_FLAT_SANDWICH_J_CUPS, REP_STRAP_SAFETIES, REP_MULTI_GRIP_PULL_UP_BAR,
  ROGUE_MONSTER_STRAP_SAFETY_2, ROGUE_MONSTER_LITE_STRAP_SAFETY_2, ROGUE_MONSTER_SPOTTER_ARMS_2, REP_FLIP_DOWN_SAFETIES, BOS_ROLLER_J_CUPS,
  REP_PULL_UP_BAR, ROGUE_MONSTER_SANDWICH_J_CUP, ROGUE_MONSTER_LITE_J_CUPS, IRWIN_RETURN_ROLLER_J_CUPS, SURPLUS_STEALTH_SPOTTERS,
  OAK_CLUB_ALPHA_SPOTTER_ARMS, ROGUE_AM_2_MONOLIFT, BOS_SAFETY_STRAPS, TITAN_ROLLER_J_HOOKS, ROGUE_FAT_SKINNY_PULL_UP_BAR, MUTANT_METALS_SNAP_BACK_MONOLIFT,
] as const satisfies readonly RackPart[];
/** Parts that needed the registry v2 context (#178): floor-standing feet. Kept apart from the #133 PARTS list. */
export const REGISTRY_V2_PARTS = [...FEET_PARTS] as const satisfies readonly RackPart[];
