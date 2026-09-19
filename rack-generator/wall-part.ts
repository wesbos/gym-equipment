/** Wall-part entry contract. Entries are registered in wall-registry.ts; params reuse the floor-part helpers. */
import type { NumericParams, PartDefinition } from './types.ts';
import type { VendorAttribution } from './vendor-metadata.ts';
import { resolveBy, type FloorParam } from './floor-part.ts';
import { DEFAULT_WALL_SECTION, type WallSection } from './catalog-sections.ts';
type ByParams<T> = T | ((params: NumericParams) => T);
/** Face rectangle in mm: width along the wall, height up it. `depth` is the standoff from the wall surface. */
export interface WallFace { width: number; height: number }
export interface WallPartSpec<Id extends string = string> {
  id: Id; /** Inspector/instance name */ name: string; /** Catalog card name */ title: string; /** Lowercase noun for UI copy and warnings */ noun: string;
  description?: string; /** Sidebar heading and library category (catalog-sections.ts) */ section?: WallSection;
  params: readonly FloorParam[]; validate?: (params: NumericParams) => void;
  face: ByParams<WallFace>; depth: number;
  /** Hook slots for hangable parts (hang-registry.ts): [x along, z up] on the face, from its centre. Index = slot number. */
  slots?: (params: NumericParams) => [number, number][];
  /** Suggested centre height above the floor (default 1500 mm). */ height?: number;
  vendor?: VendorAttribution;
}
export interface WallPart<Id extends string = string> extends WallPartSpec<Id> { defaults: NumericParams }
export function defineWallPart<const Id extends string>(spec: WallPartSpec<Id>): WallPart<Id> {
  return { ...spec, defaults: Object.fromEntries(spec.params.map(p => [p.key, p.default])) };
}
export const wallFace = (part: WallPart, params: NumericParams) => resolveBy(part.face, params);
export const wallDefinition = (part: WallPart, build: PartDefinition['build']): PartDefinition => ({
  id: part.id, name: part.title, category: part.section ?? DEFAULT_WALL_SECTION, defaults: part.defaults, build, description: part.description,
  standardOptions: Object.fromEntries(part.params.filter(p => typeof p.options !== 'function').map(p => [p.key, (p.options as readonly number[]).map(value => ({ value, label: (p.format ?? String)(value) }))])),
});
