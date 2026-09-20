/** Wall-part registry: scenery mounted on the gym walls (#85), persisted in doc.wallItems as wall + [u, height] —
 * dragged along its wall plane, included in GLB, excluded from 3MF. Mirrors floor-registry.ts.
 *
 * To add a wall part:
 *  1. rack-generator/wall-parts/<part>.ts — `export const MY_PART = defineWallPart({ id, name, title, noun, params, face, depth })`.
 *     Metadata only (it ships in the main bundle): never import Manifold builders here.
 *  2. rack-generator/parts/<part>.ts — the builder, `export const definitions = [wallDefinition(MY_PART, buildMyPart)]`.
 *     Source axes: X along the wall, -Y out of the wall, Z up; origin at the face centre on the wall surface.
 *  3. Register: add MY_PART to WALL_PARTS below, and spread its `definitions` into catalog.ts.
 *
 * Windows and doors (room finishes, #200): add `opening` to the spec (`true` for the whole face, or a WallFace / params
 * function for a smaller hole). The item is placed like any wall part (`wall` + `position` [u along the wall from its
 * centre, height of the face centre]; world placement from walls.ts wallFrames(room)[wall]), and the scene cuts that
 * rectangle out of every wall finish behind it (wall-items.ts wallOpenings → gym-walls.ts). The part draws its own frame,
 * sill and glass; nothing shows through the hole but the distant backdrop. */
import type { WallPart } from './wall-part.ts';
import { PEGBOARD } from './wall-parts/pegboard.ts';
// Family slots: each file owns its PARTS list, so parallel families never edit this file.
import { PARTS as WALL_STORAGE } from './wall-parts/wall-storage.ts';
import { PARTS as WALL_LEFTOVERS } from './wall-parts/leftovers.ts';
import { PARTS as WALL_DECOR } from './wall-parts/decor.ts';
export * from './wall-part.ts';
export const WALL_PARTS = [PEGBOARD, ...WALL_STORAGE, ...WALL_LEFTOVERS, ...WALL_DECOR] as const;
export type WallPartId = (typeof WALL_PARTS)[number]['id'];
export const WALL_PART_IDS: WallPartId[] = WALL_PARTS.map(p => p.id);
const registry = new Map<string, WallPart>(WALL_PARTS.map(p => [p.id, p]));
/** Test seam: registers an extra entry for this process only. */
export const registerWallPart = (part: WallPart) => { registry.set(part.id, part); };
export const wallPart = (id: string) => registry.get(id);
export const isWallPart = (id: string | null | undefined): id is WallPartId => !!id && registry.has(id);
