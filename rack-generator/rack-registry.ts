/** Rack-part registry (#131): brand attachments that mount on the rack (upright holes or crossmember tops), persisted
 * as doc.accessories like the built-in hooks. PartId, ACCESSORY_PARTS, placement info, target/param validation, hole
 * limits, resolve (instances, mounts, collision bodies), bar cradles, the sidebar sections, the inspector params,
 * vendor credit, thumbnails, GLB/3MF and the worker param guard all read these entries (see rack-mounts.ts).
 *
 * To add a rack part (never edit this file, catalog.ts or BuilderPage.tsx — use your family slot):
 *  1. rack-generator/rack-parts/<family>.ts — `export const MY_PART = defineRackPart({ id, name, title, noun, section,
 *     vendor, params, mount, bodies, ... })` and list it in that file's PARTS. Metadata only: no Manifold imports.
 *  2. rack-generator/parts/<family>.ts — the builder in the rack-part.ts source frame,
 *     `export const definitions = [rackDefinition(MY_PART, buildMyPart)]`. */
import type { RackPart } from './rack-part.ts';
import { ROGUE_MONSTER_BAND_PEG } from './rack-parts/rogue-band-pegs.ts';
import { REP_LEG_ROLLER } from './rack-parts/rep-leg-roller.ts';
// Family slots: each file owns its PARTS list, so parallel families never edit this file.
import { PARTS as ROLLERS_PADS, REGISTRY_V2_PARTS as ROLLERS_PADS_V2 } from './rack-parts/rack-rollers-pads.ts';
import { PARTS as JCUPS_SAFETIES, REGISTRY_V2_PARTS as JCUPS_SAFETIES_V2 } from './rack-parts/rack-jcups-safeties.ts';
import { PARTS as DIPS_LANDMINES } from './rack-parts/rack-dips-landmines.ts';
import { PARTS as LEVERS_BELT_SQUAT } from './rack-parts/rack-levers-belt-squat.ts';
import { PARTS as DIGITAL_CABLE } from './rack-parts/rack-digital-cable.ts';
export * from './rack-part.ts';
export const RACK_PARTS = [
  ROGUE_MONSTER_BAND_PEG, REP_LEG_ROLLER,
  ...ROLLERS_PADS, ...JCUPS_SAFETIES, ...DIPS_LANDMINES, ...LEVERS_BELT_SQUAT, ...DIGITAL_CABLE,
  // Registry v2 (#178): parts that need rack context, hosted targets or the floor rule.
  ...ROLLERS_PADS_V2, ...JCUPS_SAFETIES_V2,
] as const;
export type RackPartId = (typeof RACK_PARTS)[number]['id'];
export const RACK_PART_IDS: RackPartId[] = RACK_PARTS.map(p => p.id);
const registry = new Map<string, RackPart>(RACK_PARTS.map(p => [p.id, p]));
/** Test seam: registers an extra entry for this process only. */
export const registerRackPart = (part: RackPart) => { registry.set(part.id, part); };
export const rackPart = (id: string | null | undefined) => id ? registry.get(id) : undefined;
export const isRackPart = (id: string | null | undefined): id is RackPartId => !!id && registry.has(id);
