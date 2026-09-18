/** Shared builders and composable attribution for rendering, thumbnails and exports. */
import type { PartDefinition } from './types.ts';
import type { CADCatalog } from './catalog-contract.ts';
import { definitions as structure } from './parts/structure.ts';
import { definitions as attachments } from './parts/attachments.ts';
import { definitions as bars } from './parts/bars-safeties.ts';
import { definitions as voltra } from './parts/voltra.ts';
import { definitions as darko } from './parts/darko.ts';
import { definitions as cables } from './parts/cable-systems.ts';
import { definitions as smith } from './parts/smith.ts';
import { partAttribution } from './attribution.ts';
// Floor parts: one import + one `floor` line each; entries register in floor-registry.ts.
import { definitions as nighthawk } from './parts/nighthawk.ts';
import { definitions as powerblock } from './parts/powerblock.ts';
import { definitions as pepin } from './parts/pepin.ts';
import { definitions as barbell } from './parts/barbell.ts';
const floor: PartDefinition[] = [
  ...nighthawk,
  ...powerblock,
  ...pepin,
  ...barbell,
];
// Wall parts: same pattern; entries register in wall-registry.ts.
import { definitions as pegboard } from './parts/pegboard.ts';
const wall: PartDefinition[] = [
  ...pegboard,
];
// Retain PartDefinition's builder signature, including the optional logo argument
// when that stream integrates; vendor marks remain internal to their builders.
export const definitions: PartDefinition[] = [...structure, ...bars, ...attachments, ...voltra, ...darko, ...cables, ...smith, ...floor, ...wall];
export const catalog: CADCatalog = {
  definitions,
  attribution: partAttribution,
};
