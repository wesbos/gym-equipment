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
export * from './floor-part.ts';
export const FLOOR_PARTS = [NIGHTHAWK] as const;
export type FloorPartId = (typeof FLOOR_PARTS)[number]['id'];
export const FLOOR_PART_IDS: FloorPartId[] = FLOOR_PARTS.map(p => p.id);
const registry = new Map<string, FloorPart>(FLOOR_PARTS.map(p => [p.id, p]));
/** Test seam: registers an extra entry for this process only. */
export const registerFloorPart = (part: FloorPart) => { registry.set(part.id, part); };
export const floorPart = (id: string) => registry.get(id);
export const isFloorPart = (id: string | null | undefined): id is FloorPartId => !!id && registry.has(id);
