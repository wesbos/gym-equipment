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
// Floor family slots (one file per family; register entries inside the family files).
import { definitions as powerBars } from './parts/power-bars.ts';
import { definitions as specialtyBars } from './parts/specialty-bars.ts';
import { definitions as trapCurlAxleBars } from './parts/trap-curl-axle-bars.ts';
import { definitions as fixedDumbbells } from './parts/fixed-dumbbells.ts';
import { definitions as adjustableDumbbells } from './parts/adjustable-dumbbells.ts';
import { definitions as kettlebells } from './parts/kettlebells.ts';
import { definitions as repBenches } from './parts/rep-benches.ts';
import { definitions as benches } from './parts/benches.ts';
import { definitions as ergs } from './parts/ergs.ts';
import { definitions as cardio } from './parts/cardio.ts';
import { definitions as conditioning } from './parts/conditioning.ts';
import { definitions as strongman } from './parts/strongman.ts';
import { definitions as hypers } from './parts/hypers.ts';
import { definitions as legMachines } from './parts/leg-machines.ts';
import { definitions as beltSquatMachines } from './parts/belt-squat-machines.ts';
import { definitions as cableTowers } from './parts/cable-towers.ts';
import { definitions as floorStorage } from './parts/floor-storage.ts';
import { definitions as floorAccessories } from './parts/floor-accessories.ts';
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
  ...powerBars,
  ...specialtyBars,
  ...trapCurlAxleBars,
  ...fixedDumbbells,
  ...adjustableDumbbells,
  ...kettlebells,
  ...repBenches,
  ...benches,
  ...ergs,
  ...cardio,
  ...conditioning,
  ...strongman,
  ...hypers,
  ...legMachines,
  ...beltSquatMachines,
  ...cableTowers,
  ...floorStorage,
  ...floorAccessories,
];
// Hang family slots.
import { definitions as cableHandles } from './parts/cable-handles.ts';
import { definitions as specialtyGrips } from './parts/specialty-grips.ts';
import { definitions as hangingAccessories } from './parts/hanging-accessories.ts';
// Rack attachments (rack-registry.ts): proof entries + family slots.
import { definitions as rogueBandPegs } from './parts/rogue-band-pegs.ts';
import { definitions as repLegRoller } from './parts/rep-leg-roller.ts';
import { definitions as rackRollersPads } from './parts/rack-rollers-pads.ts';
import { definitions as rackJcupsSafeties } from './parts/rack-jcups-safeties.ts';
import { definitions as rackDipsLandmines } from './parts/rack-dips-landmines.ts';
import { definitions as rackLeversBeltSquat } from './parts/rack-levers-belt-squat.ts';
import { definitions as rackDigitalCable } from './parts/rack-digital-cable.ts';
const rack: PartDefinition[] = [
  ...rogueBandPegs,
  ...repLegRoller,
  ...rackRollersPads,
  ...rackJcupsSafeties,
  ...rackDipsLandmines,
  ...rackLeversBeltSquat,
  ...rackDigitalCable,
];
// Wall family slots.
import { definitions as wallStorage } from './parts/wall-storage.ts';
// Wall parts: same pattern; entries register in wall-registry.ts.
import { definitions as pegboard } from './parts/pegboard.ts';
import { definitions as cableAttachments } from './parts/cable-attachments.ts';
const wall: PartDefinition[] = [
  ...pegboard,
  ...wallStorage,
  // Hang parts (hang-registry.ts)
  ...cableAttachments,
  ...cableHandles,
  ...specialtyGrips,
  ...hangingAccessories,
];
// Retain PartDefinition's builder signature, including the optional logo argument
// when that stream integrates; vendor marks remain internal to their builders.
export const definitions: PartDefinition[] = [...structure, ...bars, ...attachments, ...voltra, ...darko, ...rack, ...cables, ...smith, ...floor, ...wall];
export const catalog: CADCatalog = {
  definitions,
  attribution: partAttribution,
};
