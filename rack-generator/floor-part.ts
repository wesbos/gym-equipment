/** Floor-part entry contract and param helpers. Entries are registered in floor-registry.ts. */
import type { NumericParams, PartDefinition, Vec2 } from './types.ts';
import type { VendorAttribution } from './vendor-metadata.ts';
import { DEFAULT_FLOOR_SECTION, type FloorSection } from './catalog-sections.ts';
/** Local floor rectangle in mm: width along the part's X, depth along its floor Z, centre offset from its origin. */
export interface FloorBox { width: number; depth: number; offset?: Vec2 }
/** A parking bar's own geometry (barbell-cradles.ts, plate stacks): local X along the bar, origin on the floor under
 * its centre. Parts without one use the men's Olympic bar (DEFAULT_BAR_SPEC in floor-parts/barbell.ts). */
export interface BarSpec {
  /** Shaft diameter where it rests in a cradle, mm */ shaft: number; /** Centre to the inner collar face (half the grip span) */ shaftHalf: number;
  /** Centre to the start of the loadable sleeve */ sleeveStart: number; sleeveLength: number; sleeveDiameter: number;
  /** Bar axis height when the bar lies on the floor (its collars on the ground) */ axisZ: number;
  /** Sleeve axis offset from the shaft axis, mm, in the bar's local frame (y along local Y, z up), for bars whose
   * sleeves are dropped or swung off the rackable shaft (S-cambers, CB-1 legs, Transformer brackets). The bar keeps
   * its floor roll when parked, so one offset serves both. Omitted: the sleeves are coaxial with the shaft. */
  sleeveOffset?: { y: number; z: number };
}
type ByParams<T> = T | ((params: NumericParams) => T);
export interface FloorParam { key: string; label: string; default: number; options: ByParams<readonly number[]>; format?: (value: number) => string }
export interface FloorPartSpec<Id extends string = string> {
  id: Id; /** Inspector/instance name */ name: string; /** Catalog card name */ title: string; /** Lowercase noun for UI copy and warnings */ noun: string;
  description?: string; /** Sidebar heading and library category (catalog-sections.ts) */ section?: FloorSection;
  params: readonly FloorParam[]; validate?: (params: NumericParams) => void;
  footprint: ByParams<FloorBox>; /** Soft use-clearance zone; warns when it overlaps the rack or another part. */ clearance?: ByParams<FloorBox>;
  /** Suggested placement: rack side and footprint gap from the rack's outer tube face (default right, 200 mm). */
  placement?: { side?: 'right' | 'left' | 'front' | 'back'; gap?: number };
  /** Pairable: "Add matching pair" places a second unit `gap` mm beside the first along local X. */ pair?: { gap: number };
  colors?: readonly (readonly [string, string])[]; colorLabel?: string; vendor?: VendorAttribution;
  /** Parks in rack bar cradles (barbell-cradles.ts); floor placement is the fallback. */ parks?: boolean;
  /** Parking bars: own shaft/sleeve/axis geometry; omitted means the 20 kg Olympic bar. */ bar?: ByParams<BarSpec>;
}
export interface FloorPart<Id extends string = string> extends FloorPartSpec<Id> { defaults: NumericParams }
/** The param contract shared by floor and wall parts (wall-part.ts). */
export type ParamPart = Pick<FloorPart, 'defaults' | 'params' | 'noun' | 'validate'>;
export function defineFloorPart<const Id extends string>(spec: FloorPartSpec<Id>): FloorPart<Id> {
  return { ...spec, defaults: Object.fromEntries(spec.params.map(p => [p.key, p.default])) };
}
export const resolveBy = <T,>(value: ByParams<T>, params: NumericParams): T => typeof value === 'function' ? (value as (p: NumericParams) => T)(params) : value;
export const floorOptions = (param: FloorParam, params: NumericParams) => resolveBy(param.options, params);
/** Strict: saved docs with unknown keys or off-list values are rejected, never coerced. */
export function validateFloorParams(part: ParamPart, input: unknown): NumericParams {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !Object.hasOwn(part.defaults, k))) throw Error(`Invalid ${part.noun} parameters.`);
  const params = { ...part.defaults, ...input as NumericParams };
  for (const p of part.params) if (!floorOptions(p, params).includes(params[p.key])) throw Error(`Unsupported ${part.noun} ${p.label.toLowerCase()}.`);
  part.validate?.(params);
  return params;
}
/** UI edits: snap each param (in order) to its nearest allowed option so dependent options stay valid. */
export function coerceFloorParams(part: ParamPart, input: NumericParams): NumericParams {
  const params = { ...part.defaults, ...input };
  for (const p of part.params) { const options = floorOptions(p, params); if (!options.includes(params[p.key])) params[p.key] = options.reduce((a, b) => Math.abs(b - params[p.key]) < Math.abs(a - params[p.key]) ? b : a); }
  return params;
}
export const floorDefinition = (part: FloorPart, build: PartDefinition['build']): PartDefinition => ({
  id: part.id, name: part.title, category: part.section ?? DEFAULT_FLOOR_SECTION, defaults: part.defaults, build, description: part.description,
  standardOptions: Object.fromEntries(part.params.filter(p => typeof p.options !== 'function').map(p => [p.key, (p.options as readonly number[]).map(value => ({ value, label: (p.format ?? String)(value) }))])),
});
