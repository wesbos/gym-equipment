/** Hang-part entry contract (#85): attachments that hang from one hook slot on a slotted wall part.
 * Model origin = the carabiner anchor (the eye a cable carabiner clips to), so the same model hangs from a
 * panel hook today and can clip to a cable trolley later (#10). Source axes: X along the wall, -Y out of it, Z up. */
import type { NumericParams, PartDefinition } from './types.ts';
import type { VendorAttribution } from './vendor-metadata.ts';
import type { FloorParam } from './floor-part.ts';
/** Hook peg length from the panel face to the anchor, and its rod diameter. */
export const HOOK_REACH = 75, HOOK_ROD = 6;
/** Pose param shared by every hang part: 0 = free (anchor only), 1 = hanging on its panel hook peg. */
export const HOOK_PARAM: FloorParam = { key: 'hook', label: 'Pose', default: 0, options: [0, 1], format: v => v ? 'Hanging on a hook' : 'Free · carabiner anchor' };
/** Rectangle in the panel plane around the anchor that the hung attachment occupies (for slot conflicts). */
export interface HangEnvelope { width: number; above: number; drop: number }
export interface HangPartSpec<Id extends string = string> {
  id: Id; /** Inspector/instance name */ name: string; /** Catalog card name */ title: string; /** Lowercase noun for UI copy */ noun: string;
  description?: string; envelope: HangEnvelope; vendor?: VendorAttribution;
}
export interface HangPart<Id extends string = string> extends HangPartSpec<Id> { params: readonly FloorParam[]; defaults: NumericParams }
export function defineHangPart<const Id extends string>(spec: HangPartSpec<Id>): HangPart<Id> {
  return { ...spec, params: [HOOK_PARAM], defaults: { hook: 0 } };
}
export const hangDefinition = (part: HangPart, build: PartDefinition['build']): PartDefinition => ({
  id: part.id, name: part.title, category: 'Cable attachments', defaults: part.defaults, build, description: part.description,
  standardOptions: { hook: [0, 1].map(value => ({ value, label: HOOK_PARAM.format!(value) })) },
});
