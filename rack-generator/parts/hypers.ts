/** Reverse hypers, GHDs and back extensions: Manifold builders for the entries in ../floor-parts/hypers.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * Shared kit, materials and sub-assemblies: hypers-kit.ts, hypers-materials.ts, hypers-assemblies.ts. Builders:
 * hypers-scout.ts (scissor reverse hyper), hypers-pro.ts (tilting multi-machine), hypers-ghd.ts (GHDs),
 * hypers-rh.ts (A-frame reverse hypers and the hyper + GHD combos), hypers-45.ts (45° hyperextensions). */
import type { PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  ABRAM, BODY_SOLID_GHYP345, BODY_SOLID_SPEC, BOS_REVERSE_HAMMER, DONKEY_SPEC, ECON_HPND, FREAK_HYPER_PRO, GH1, HPND, REP_GHD, REP_GHD_SPEC, REVERSE_HAMMER_SPEC,
  RH2, ROGUE_ABRAM_GHD, ROGUE_DONKEY, ROGUE_GH1, ROGUE_RH2, SCOUT_HYPER, TITAN_ECON_HPND, TITAN_HPND, TITAN_RC_SPEC, TITAN_ROMAN_CHAIR,
} from '../floor-parts/hypers.ts';
import { buildCombo, buildRh } from './hypers-rh.ts';
import { buildGhd } from './hypers-ghd.ts';
import { buildHyper45 } from './hypers-45.ts';
import { HM } from './hypers-materials.ts';
import { buildHyperPro } from './hypers-pro.ts';
import { buildScoutHyper } from './hypers-scout.ts';
const rogueGhd = { frame: HM.rogue, pad: HM.vinyl, roller: HM.foam, brand: HM.white, postText: true, plateLogo: false };
export const definitions: PartDefinition[] = [
  floorDefinition(SCOUT_HYPER, buildScoutHyper),
  floorDefinition(FREAK_HYPER_PRO, buildHyperPro),
  floorDefinition(ROGUE_ABRAM_GHD, buildGhd(ABRAM, rogueGhd, 'Abram GHD')),
  floorDefinition(REP_GHD, buildGhd(REP_GHD_SPEC, { frame: HM.black, pad: HM.vinyl, roller: HM.rollerVinyl, brand: HM.white, postText: false, plateLogo: true }, 'REP GHD')),
  floorDefinition(TITAN_ROMAN_CHAIR, buildHyper45(TITAN_RC_SPEC, { frame: HM.black, inner: HM.black, pad: HM.vinyl, brand: HM.white }, 'Titan Roman Chair')),
  floorDefinition(TITAN_HPND, buildRh(HPND, { frame: HM.black, pad: HM.vinyl, letters: HM.cut }, 'H-PND')),
  floorDefinition(ROGUE_RH2, buildRh(RH2, { frame: HM.rogue, pad: HM.vinyl, letters: HM.cut }, 'RH-2')),
  floorDefinition(TITAN_ECON_HPND, buildRh(ECON_HPND, { frame: HM.black, pad: HM.vinyl, letters: HM.cut }, 'Economy H-PND')),
  floorDefinition(BODY_SOLID_GHYP345, buildHyper45(BODY_SOLID_SPEC, { frame: HM.black, inner: HM.zinc, pad: HM.vinyl, brand: HM.white }, 'GHYP345B')),
  floorDefinition(ROGUE_DONKEY, buildCombo(DONKEY_SPEC, { frame: HM.rogue, pad: HM.vinyl, letters: HM.cut, roller: HM.foam }, 'Donkey')),
  floorDefinition(ROGUE_GH1, buildGhd(GH1, rogueGhd, 'GH-1')),
  floorDefinition(BOS_REVERSE_HAMMER, buildCombo(REVERSE_HAMMER_SPEC, { frame: HM.black, pad: HM.vinyl, letters: HM.cut, roller: HM.rollerVinyl }, 'Reverse Hammer')),
];
