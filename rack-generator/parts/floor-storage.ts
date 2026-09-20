/** Plate trees, barbell holders and dumbbell racks: Manifold builders for the entries in ../floor-parts/floor-storage.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * Builders live in floor-storage-trees.ts / floor-storage-racks.ts on the shared floor-storage-kit.ts. */
import type { PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  ROGUE_PLATE_TREE, TITAN_BARBELL_HOLDER, REP_DUMBBELL_RACK, TITAN_PLATE_TREE, REP_PLATE_TREE, REP_DUMBBELL_CART, TITAN_DUMBBELL_STAND,
  REP_KETTLEBELL_RACK, ROGUE_DUMBBELL_RACK,
} from '../floor-parts/floor-storage.ts';
import { buildRogueTree, buildRepTree, buildTitanTree, buildTitanHolder } from './floor-storage-trees.ts';
import { buildRepDumbbellRack, buildRogueDumbbellRack, buildRepCart, buildTitanStand, buildRepKettlebellRack } from './floor-storage-racks.ts';
export const definitions: PartDefinition[] = [
  floorDefinition(ROGUE_PLATE_TREE, buildRogueTree),
  floorDefinition(TITAN_BARBELL_HOLDER, buildTitanHolder),
  floorDefinition(REP_DUMBBELL_RACK, buildRepDumbbellRack),
  floorDefinition(TITAN_PLATE_TREE, buildTitanTree),
  floorDefinition(REP_PLATE_TREE, buildRepTree),
  floorDefinition(REP_DUMBBELL_CART, buildRepCart),
  floorDefinition(TITAN_DUMBBELL_STAND, buildTitanStand),
  floorDefinition(REP_KETTLEBELL_RACK, buildRepKettlebellRack),
  floorDefinition(ROGUE_DUMBBELL_RACK, buildRogueDumbbellRack),
];
