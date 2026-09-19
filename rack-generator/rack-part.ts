/** Rack-part entry contract (#131): brand attachments that mount on the rack itself — J-cups, rollers, pads,
 * dips, landmines, lever arms, band pegs, digital-resistance mounts. Entries are registered in rack-registry.ts
 * and persist as ordinary doc.accessories, so pairing, face/hole moves, undo, save/reload, collisions, swap,
 * GLB and 3MF work exactly like the built-in hooks and the Darko/VOLTRA parts.
 *
 * Builder source axes (same frame as parts/darko.ts and parts/voltra.ts):
 *  - origin on the centreline of the tube it mounts to, on the axis of the target hole (`holes` offset 0);
 *  - +Y points OUT of the mounting face (the mating face is the plane y = params.upright / 2);
 *  - Z up; X across the face (for a crossmember-top mount, X runs along the rail).
 *  - Offset hole k sits at z = k * params.mountSpacing (the rack pitch).
 * Builders receive the entry params plus the rack context keys in RACK_CONTEXT_KEYS. */
import type { Face, LocalBox, NumericParams, PartDefinition, RackDimensions, Vec3 } from './types.ts';
import type { VendorAttribution } from './vendor-metadata.ts';
import { resolveBy, validateFloorParams, coerceFloorParams, type FloorParam } from './floor-part.ts';
import { DEFAULT_RACK_SECTION, type RackSection } from './catalog-sections.ts';
/** Param helpers shared with floor parts (params are the same numeric selects). */
export { resolveBy, floorOptions, type FloorParam } from './floor-part.ts';
type ByParams<T> = T | ((params: NumericParams) => T);
/** Rack-crossing pin/bolt diameters checked against the rack bore (the same classes Darko and VOLTRA use):
 * 1-inch hardware in 1-1/16" holes checks as 24.8 mm, 5/8-inch hardware in 11/16" holes as 15.5 mm. */
export const PIN_1IN = 24.8, PIN_5_8IN = 15.5;
/** Resolved-only params the builder, bodies and cradle slots receive (never saved, never user-editable):
 * `upright` tube size (mm), `mountSpacing` hole pitch (mm), `holeDiameter` rack bore (mm), and `mirror` = 1 on
 * the second unit of a `handed` pair (mirror your geometry across local X). */
export const RACK_CONTEXT_KEYS = ['upright', 'mountSpacing', 'holeDiameter', 'mirror'] as const;
export type RackTargetKind = 'upright' | 'crossmember-top';
export interface RackMount {
  /** Accepted target kinds (default ['upright']). 'crossmember-top' uses the Darko Anchor rail stations: an active
   * upper, straight perforated crossmember; the part bolts through the rail's side hole at `station`. */
  targets?: readonly RackTargetKind[];
  /** Upright holes used, as station offsets from the target hole: [0] single pin, [0, -2] a two-bolt plate spanning
   * two pitches down, [-1, 1] a pattern straddling the target. Every one must be a real hole on the face. Default [0]. */
  holes?: ByParams<readonly number[]>;
  /** Require integer (main) stations, refusing bench-zone half holes. Default: true when more than one hole is used. */
  mainStations?: boolean;
  /** Rack-crossing pin/bolt diameter in mm, checked against the rack bore (use PIN_1IN / PIN_5_8IN). */
  pin: ByParams<number>;
  /** Mount pin direction: 'normal' passes through the face (J-cup pin, through-bolt); 'across' runs parallel to the
   * face (a sleeve's transverse pin, like the spotter arm). Default 'normal'. */
  pinAxis?: 'normal' | 'across';
  /** Reach below/above the target hole centre (mm): holes whose part would hit the floor or pass the upright top are refused. */
  extent: ByParams<{ below: number; above: number }>;
  /** Faces it may mount on (default all four). */
  faces?: readonly Face[];
  /** Extra fit rules (throw with a user-facing message), e.g. a required pitch. */
  validate?: (rack: RackDimensions, params: NumericParams) => void;
}
/** Bar rest points (local frame, shaft axis) that make brand J-cups/spotters/storage park barbells like the built-in J-hooks. */
export interface RackCradles { kind: 'working' | 'storage'; /** Plural product label for cradle names, e.g. 'Ghost Roller J-Cups'. */ label: string; slots: (params: NumericParams) => { point: Vec3; axis: Vec3 }[] }
export interface RackPlacement { height?: number; face?: Face | 'inside' | 'outside' }
export interface RackPartSpec<Id extends string = string> {
  id: Id; /** Inspector/instance name */ name: string; /** Catalog card name */ title: string; /** Lowercase noun for UI copy and warnings */ noun: string;
  description?: string; /** Sidebar heading and library category (catalog-sections.ts) */ section?: RackSection;
  params: readonly FloorParam[]; validate?: (params: NumericParams) => void;
  vendor: VendorAttribution;
  mount: RackMount;
  /** Local collision bodies of the working parts (pads, arms, cups), excluding the pin/collar that sits in the hole. */
  bodies: ByParams<LocalBox[]>;
  /** Pairable across the rack (left/right uprights, mirrored side faces); `default` is the initial "Add matching pair" state. */
  pair?: { default: boolean };
  /** The second unit of a pair is the mirror image (receives `mirror: 1`). */
  handed?: boolean;
  cradles?: RackCradles;
  /** Suggested mount for new placements (resolved with the autoFit params): target hole height (mm) and preferred face
   * ('inside'/'outside' = the inner/outer side face of the upright). Front-row uprights are preferred. */
  placement?: ByParams<RackPlacement>;
  /** Params picked for a new placement on this rack (e.g. a 5/8-inch variant on 5/8-inch holes). */
  autoFit?: (rack: RackDimensions) => NumericParams;
  /** Swap/variant family (default `rack:<section>`). Use an existing family (e.g. 'j-hooks') to swap with built-ins. */
  family?: string;
}
export interface RackPart<Id extends string = string> extends RackPartSpec<Id> { defaults: NumericParams }
export function defineRackPart<const Id extends string>(spec: RackPartSpec<Id>): RackPart<Id> {
  return { ...spec, defaults: Object.fromEntries(spec.params.map(p => [p.key, p.default])) };
}
const CONTEXT = new Set<string>(RACK_CONTEXT_KEYS);
/** Entry params without the resolved rack context. */
export const withoutContext = (params: NumericParams): NumericParams => Object.fromEntries(Object.entries(params).filter(([k]) => !CONTEXT.has(k)));
/** Strict: saved docs with unknown keys or off-list values are rejected. Context keys are allowed (worker requests carry them). */
export const validateRackParams = (part: RackPart, input: unknown): NumericParams =>
  validateFloorParams(part, input && typeof input === 'object' && !Array.isArray(input) ? withoutContext(input as NumericParams) : input);
export const coerceRackParams = (part: RackPart, input: NumericParams) => coerceFloorParams(part, withoutContext(input));
export const rackTargets = (part: RackPart) => part.mount.targets ?? ['upright'];
export const rackHoles = (part: RackPart, params: NumericParams) => [...resolveBy(part.mount.holes ?? [0], params)];
export const rackPlacementFor = (part: RackPart, params: NumericParams): RackPlacement => resolveBy(part.placement ?? {}, { ...part.defaults, ...params });
export const rackFamily = (part: RackPart) => part.family ?? `rack:${part.section ?? DEFAULT_RACK_SECTION}`;
/** Default params plus a stand-in 75 mm, 50 mm pitch, 25 mm bore rack context, for thumbnails and tests. */
export const rackBuildParams = (part: RackPart, params: NumericParams = {}): NumericParams => ({ upright: 75, mountSpacing: 50, holeDiameter: 25, ...part.defaults, ...params });
export const rackDefinition = (part: RackPart, build: PartDefinition['build']): PartDefinition => ({
  id: part.id, name: part.title, category: part.section ?? DEFAULT_RACK_SECTION, defaults: part.defaults, build, description: part.description,
  standardOptions: Object.fromEntries(part.params.filter(p => typeof p.options !== 'function').map(p => [p.key, (p.options as readonly number[]).map(value => ({ value, label: (p.format ?? String)(value) }))])),
});
