/** Wall-part registry: scenery mounted on the gym walls (#85), persisted in doc.wallItems as wall + [u, height] —
 * dragged along its wall plane, included in GLB, excluded from 3MF. Mirrors floor-registry.ts.
 *
 * To add a wall part:
 *  1. rack-generator/wall-parts/<part>.ts — `export const MY_PART = defineWallPart({ id, name, title, noun, params, face, depth })`.
 *     Metadata only (it ships in the main bundle): never import Manifold builders here.
 *  2. rack-generator/parts/<part>.ts — the builder, `export const definitions = [wallDefinition(MY_PART, buildMyPart)]`.
 *     Source axes: X along the wall, -Y out of the wall, Z up; origin at the face centre on the wall surface.
 *  3. Register: add MY_PART to WALL_PARTS below, and spread its `definitions` into catalog.ts. */
import type { WallPart } from './wall-part.ts';
import { PEGBOARD } from './wall-parts/pegboard.ts';
// Family slots: each file owns its PARTS list, so parallel families never edit this file.
import { PARTS as WALL_STORAGE } from './wall-parts/wall-storage.ts';
export * from './wall-part.ts';
export const WALL_PARTS = [PEGBOARD, ...WALL_STORAGE] as const;
export type WallPartId = (typeof WALL_PARTS)[number]['id'];
export const WALL_PART_IDS: WallPartId[] = WALL_PARTS.map(p => p.id);
const registry = new Map<string, WallPart>(WALL_PARTS.map(p => [p.id, p]));
/** Test seam: registers an extra entry for this process only. */
export const registerWallPart = (part: WallPart) => { registry.set(part.id, part); };
export const wallPart = (id: string) => registry.get(id);
export const isWallPart = (id: string | null | undefined): id is WallPartId => !!id && registry.has(id);
