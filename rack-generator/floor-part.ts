/** Floor-part entry contract and param helpers. Entries are registered in floor-registry.ts. */
import type { NumericParams, PartDefinition, Vec2 } from './types.ts';
import type { VendorAttribution } from './vendor-metadata.ts';
/** Local floor rectangle in mm: width along the part's X, depth along its floor Z, centre offset from its origin. */
export interface FloorBox { width: number; depth: number; offset?: Vec2 }
type ByParams<T> = T | ((params: NumericParams) => T);
export interface FloorParam { key: string; label: string; default: number; options: ByParams<readonly number[]>; format?: (value: number) => string }
export interface FloorPartSpec<Id extends string = string> {
  id: Id; /** Inspector/instance name */ name: string; /** Catalog card name */ title: string; /** Lowercase noun for UI copy and warnings */ noun: string;
  description?: string; params: readonly FloorParam[]; validate?: (params: NumericParams) => void;
  footprint: ByParams<FloorBox>; /** Soft use-clearance zone; warns when it overlaps the rack or another part. */ clearance?: ByParams<FloorBox>;
  /** Suggested placement: rack side and footprint gap from the rack's outer tube face (default right, 200 mm). */
  placement?: { side?: 'right' | 'left' | 'front' | 'back'; gap?: number };
  /** Pairable: "Add matching pair" places a second unit `gap` mm beside the first along local X. */ pair?: { gap: number };
  colors?: readonly (readonly [string, string])[]; colorLabel?: string; vendor?: VendorAttribution;
  /** Parks in rack bar cradles (barbell-cradles.ts); floor placement is the fallback. */ parks?: boolean;
}
export interface FloorPart<Id extends string = string> extends FloorPartSpec<Id> { defaults: NumericParams }
export function defineFloorPart<const Id extends string>(spec: FloorPartSpec<Id>): FloorPart<Id> {
  return { ...spec, defaults: Object.fromEntries(spec.params.map(p => [p.key, p.default])) };
}
export const resolveBy = <T,>(value: ByParams<T>, params: NumericParams): T => typeof value === 'function' ? (value as (p: NumericParams) => T)(params) : value;
export const floorOptions = (param: FloorParam, params: NumericParams) => resolveBy(param.options, params);
/** Strict: saved docs with unknown keys or off-list values are rejected, never coerced. */
export function validateFloorParams(part: FloorPart, input: unknown): NumericParams {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !Object.hasOwn(part.defaults, k))) throw Error(`Invalid ${part.noun} parameters.`);
  const params = { ...part.defaults, ...input as NumericParams };
  for (const p of part.params) if (!floorOptions(p, params).includes(params[p.key])) throw Error(`Unsupported ${part.noun} ${p.label.toLowerCase()}.`);
  part.validate?.(params);
  return params;
}
/** UI edits: snap each param (in order) to its nearest allowed option so dependent options stay valid. */
export function coerceFloorParams(part: FloorPart, input: NumericParams): NumericParams {
  const params = { ...part.defaults, ...input };
  for (const p of part.params) { const options = floorOptions(p, params); if (!options.includes(params[p.key])) params[p.key] = options.reduce((a, b) => Math.abs(b - params[p.key]) < Math.abs(a - params[p.key]) ? b : a); }
  return params;
}
export const floorDefinition = (part: FloorPart, build: PartDefinition['build']): PartDefinition => ({
  id: part.id, name: part.title, category: 'Floor items', defaults: part.defaults, build, description: part.description,
  standardOptions: Object.fromEntries(part.params.filter(p => typeof p.options !== 'function').map(p => [p.key, (p.options as readonly number[]).map(value => ({ value, label: (p.format ?? String)(value) }))])),
});
