/** Floor-part registry: free-standing scenery (#47) persisted in doc.floorItems — dragged/rotated on the gym
 * floor, included in GLB, excluded from 3MF. PartId, validation, bounds/warnings, suggested placement, pairs,
 * the sidebar group, FloorInspector, vendor credit and the worker param guard all read these entries.
 *
 * To add a floor part:
 *  1. rack-generator/floor-parts/<part>.ts — `export const MY_PART = defineFloorPart({ id, name, title, noun, params, footprint, ... })`.
 *     Metadata only (it ships in the main bundle): never import Manifold builders here.
 *  2. rack-generator/parts/<part>.ts — the builder, `export const definitions = [floorDefinition(MY_PART, buildMyPart)]`.
 *  3. Register: add MY_PART to FLOOR_PARTS below, and spread its `definitions` into catalog.ts.
 * Params are numeric selects (enums as 0/1/… with `format`); `options` may depend on earlier params. */
import type { FloorPart } from './floor-part.ts';
import { NIGHTHAWK } from './floor-parts/nighthawk.ts';
import { POWERBLOCK } from './floor-parts/powerblock.ts';
import { PEPIN_DUMBBELL, PEPIN_STAND } from './floor-parts/pepin.ts';
import { BARBELL } from './floor-parts/barbell.ts';
// Family slots: each file owns its PARTS list, so parallel families never edit this file.
import { PARTS as POWER_BARS } from './floor-parts/power-bars.ts';
import { PARTS as SPECIALTY_BARS } from './floor-parts/specialty-bars.ts';
import { PARTS as TRAP_CURL_AXLE_BARS } from './floor-parts/trap-curl-axle-bars.ts';
import { PARTS as FIXED_DUMBBELLS } from './floor-parts/fixed-dumbbells.ts';
import { PARTS as ADJUSTABLE_DUMBBELLS } from './floor-parts/adjustable-dumbbells.ts';
import { PARTS as KETTLEBELLS } from './floor-parts/kettlebells.ts';
import { PARTS as REP_BENCHES } from './floor-parts/rep-benches.ts';
import { PARTS as BENCHES } from './floor-parts/benches.ts';
import { PARTS as ERGS } from './floor-parts/ergs.ts';
import { PARTS as CARDIO } from './floor-parts/cardio.ts';
import { PARTS as CONDITIONING } from './floor-parts/conditioning.ts';
import { PARTS as STRONGMAN } from './floor-parts/strongman.ts';
import { PARTS as HYPERS } from './floor-parts/hypers.ts';
import { PARTS as LEG_MACHINES } from './floor-parts/leg-machines.ts';
import { PARTS as BELT_SQUAT_MACHINES } from './floor-parts/belt-squat-machines.ts';
import { PARTS as CABLE_TOWERS } from './floor-parts/cable-towers.ts';
import { PARTS as FLOOR_STORAGE } from './floor-parts/floor-storage.ts';
import { PARTS as FLOOR_ACCESSORIES } from './floor-parts/floor-accessories.ts';
import { PARTS as LEFTOVERS } from './floor-parts/leftovers.ts';
import { PARTS as DECOR } from './floor-parts/decor.ts';
export * from './floor-part.ts';
export const FLOOR_PARTS = [
  NIGHTHAWK, POWERBLOCK, PEPIN_DUMBBELL, PEPIN_STAND, BARBELL,
  ...POWER_BARS, ...SPECIALTY_BARS, ...TRAP_CURL_AXLE_BARS, ...FIXED_DUMBBELLS, ...ADJUSTABLE_DUMBBELLS, ...KETTLEBELLS,
  ...REP_BENCHES, ...BENCHES, ...ERGS, ...CARDIO, ...CONDITIONING, ...STRONGMAN, ...HYPERS, ...LEG_MACHINES,
  ...BELT_SQUAT_MACHINES, ...CABLE_TOWERS, ...FLOOR_STORAGE, ...FLOOR_ACCESSORIES, ...LEFTOVERS, ...DECOR,
] as const;
export type FloorPartId = (typeof FLOOR_PARTS)[number]['id'];
export const FLOOR_PART_IDS: FloorPartId[] = FLOOR_PARTS.map(p => p.id);
const registry = new Map<string, FloorPart>(FLOOR_PARTS.map(p => [p.id, p]));
/** Test seam: registers an extra entry for this process only. */
export const registerFloorPart = (part: FloorPart) => { registry.set(part.id, part); };
export const floorPart = (id: string) => registry.get(id);
export const isFloorPart = (id: string | null | undefined): id is FloorPartId => !!id && registry.has(id);
