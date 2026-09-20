import type { RackSystem, SystemPartId } from './system-types.ts';
import type { FloorPartId } from './floor-registry.ts';
import type { WallPartId } from './wall-registry.ts';
import type { HangPartId } from './hang-registry.ts';
import type { RackPartId } from './rack-registry.ts';
import type { Room, WallId } from './walls.ts';
import type { ValidatedLogo } from './logos/types.ts';
import type { Appearance, MaterialSource } from './appearance.ts';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type { PlateId } from './plates.ts';

export type ManifoldAPI = ManifoldToplevel;
export type { Manifold, CrossSection, Mesh } from 'manifold-3d';
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type NumericParams = Record<string, number>;
export type PartParams = NumericParams;
export type PartId = SystemPartId | FloorPartId | WallPartId | HangPartId | RackPartId | 'darko-anchor' | 'darko-dock' | 'darko-j' | 'darko-double-j' | 'darko-double-decker' | 'voltra-sliding' | 'voltra-adaptive' | 'voltra-fixed' | 'upright' | 'crossmember-425' | 'crossmember-725' | 'crossmember-1075' | 'angled-crossmember' | 'offset-crossmember' | 'nameplate' | 'branded-crossmember' | 'branded-crossmember-lite' | 'profile-nameplate' | 'foot-400' | 'foot-800' | 'pullup-straight' | 'pullup-multigrip' | 'pullup-sphere' | 'safety-box' | 'safety-pin-pipe' | 'safety-webbing' | 'j-hook-standard' | 'j-hook-roller' | 'j-hook-sandwich' | 'spotter-arm' | 'dip-horn' | 'dip-bar-adjustable' | 'landmine' | 'monolift' | 'single-bar-holder' | 'storage-pin-short' | 'storage-pin-long';
export interface SolidPart extends MaterialSource { name: string; solid: Manifold; color?: string; metalness?: number; roughness?: number }
export interface StandardOption { value: number; label: string }
export interface PartDefinition { standardOptions?: Record<string, readonly StandardOption[]>; id: string; name: string; category: string; defaults: NumericParams; build: (api: ManifoldAPI, params: NumericParams, logo?: ValidatedLogo) => SolidPart[]; reference?: { file: string; node: string }; description?: string; /** Laid-out 3MF: keep the builder's Z-up frame (base end down) instead of the smallest-height heuristic. */ printOrientation?: 'standing' }
export interface UprightParams { height: number; width: number; wall: number; radius: number; diameter: number; spacing: number; offset: number }
export interface UprightMesh { positions: Float32Array; indices: Uint32Array; stride: number; height: number; centers: number[]; volume: number; params: UprightParams }
export interface LibraryWorkerRequest { logo?: ValidatedLogo; id: number | string; part: string; params: NumericParams }
export type Face = 'front' | 'back' | 'left' | 'right';
export type UprightId = string;
/** `height` overrides the rack height for one post (e.g. a half rack's shorter rear storage posts). */
export interface UprightNode { x: number; y: number; height?: number }
export interface ConnectionEdge { id: string; from: string; to: string; level: "upper" | "lower" }
/** `tube` is the upright face width along X; `tubeDepth` (default `tube`) is its front-to-back size along Y for rectangular 2x3 uprights. */
export interface RackDimensions { height: number; width: number; depth: number; tube: number; tubeDepth?: number; holeDiameter: number; pitch: number; firstHole: number; benchStart?: number; benchEnd?: number; benchSpacing?: number }
export interface UprightTarget { orientation?: number; kind?: 'upright'; uprightId: UprightId; face: Face; hole: number }
/** Upper rail station with a side through-bolt: on the top bearing tab (`crossmember-top`) or hanging under the rail
 * with the bolt through the same side hole (`crossmember-under`, #178). */
export interface CrossmemberTopTarget { orientation?: number; kind: 'crossmember-top' | 'crossmember-under'; connectionId: string; station: number; side: 1 | -1; uprightId: UprightId; face: Face; hole: number }
/** A registry part mounted on another accessory (#178): hole `station` of a spotter arm or box safety, or a clamp station
 * along a pull-up bar. `host` is the host accessory id, `unit` its pair unit (0, or 1 for the second unit of a pair) and
 * `frame` which of its tubes or bars (a fat/skinny bar has two). `uprightId`/`face` mirror the host's own target;
 * `hole` is 0. The part follows the host when it moves and is removed with it. */
export interface HostedTarget { orientation?: number; kind: 'spotter-arm' | 'pull-up-bar'; host: string; unit: number; frame: number; station: number; uprightId: UprightId; face: Face; hole: number }
export type Target = UprightTarget | CrossmemberTopTarget | HostedTarget;
export interface Accessory { /** Radians about the adapter-defined axis; omitted means zero. */ rotation?: number; id: string; part: PartId; target: Target; paired: boolean; params: NumericParams; spanTo?: string; pairTo?: string; pairedSpanTo?: string; pairTarget?: CrossmemberTopTarget; /** Storage-pin plate stack, root outward; each side of a pair carries it. */ plates?: PlateId[] }
export interface StructureVariant { part: PartId; params: NumericParams }
/** `cradle` (parking parts only, #83): bar-cradle key from barbell-cradles.ts; position/rotation are then its floor drop spot. */
/** Plates loaded on a bar's two sleeves (#160), each stack from the inner collar outward. `both` loads the sleeves
 * alike (the default); uneven loading stores the +X (`right`) and −X (`left`) sleeves separately. */
export type BarLoad = { both: PlateId[] } | { right: PlateId[]; left: PlateId[] };
export interface FloorItem { id: string; part: FloorPartId; position: Vec2; rotation: number; params: NumericParams; cradle?: string; /** Bars with sleeves (`bar` spec) only. */ plates?: BarLoad }
/** Wall-mounted scenery (#85): `position` is [u along the wall from its centre, face-centre height] in mm. */
export interface WallItem { id: string; part: WallPartId; wall: WallId; position: Vec2; params: NumericParams }
/** An attachment hanging on hook `slot` of wall item `panel`; it follows the panel. */
export interface HangItem { id: string; part: HangPartId; panel: string; slot: number }
export interface RackDoc { room?: Room; wallItems?: WallItem[]; hangItems?: HangItem[]; floorItems?: FloorItem[]; systems?: RackSystem[]; logo?: ValidatedLogo; appearance?: Appearance; version: 2; uprights: Record<string, UprightNode>; connections: ConnectionEdge[]; profileId?: string; rack: RackDimensions; removed: string[]; structure: Record<string, StructureVariant>; accessories: Accessory[]; nextId: number }

export interface StructureSlot { id: string; part: PartId; connectedTo: UprightId[] }
export interface LocalBox { min: Vec3; max: Vec3 }
export type Mount = Target & { position: Vec3; center: Vec3; localAnchor?: Vec3; pinAxis?: Vec3; label?: string; connectorId?: string; /** Hosted mounts: the resolved host instance id (its bodies are not a collision). */ hostId?: string }
export interface ResolvedInstance { logo?: ValidatedLogo; id: string; part: PartId; params: NumericParams; position: Vec3; rotation: Vec3; mount: Mount | null; mounts: Mount[]; ownerId: string; kind: 'structure' | 'accessory' | 'floor-item' | 'wall-item'; paired: boolean; connectedTo: string[]; collisionEnabled?: boolean; collisionBoxes?: LocalBox[]; localOutward?: Vec3; name?: string }
export interface PlacementField { key: string; label: string; min: number; max: number; step: number }
export interface PlacementInfo { family: string; label: string; paired: boolean; /** Initial pair choice; omitted means `paired`. */ defaultPaired?: boolean; slots?: string[]; fields: PlacementField[]; faces?: Face[]; fixedHole?: number; requiredPitch?: number; handed?: boolean; mountType?: string; description?: string }
export interface CollisionWarning { ids: [string, string]; message: string }
export type CollisionInstance = Partial<Omit<ResolvedInstance, 'id' | 'part' | 'mount' | 'mounts'>> & { id: string; part: string; mount?: Partial<Mount> | null; mounts?: Partial<Mount>[] };
export interface BoltStation { point: Vec3; zOffset: number; axis: Vec3; diameter: number }
export interface AttachmentAnchor { point: Vec3; outward: Vec3; pinAxis: Vec3; requiredTube: number; minHoleZ: number; maxAbove: number; requiredPitch?: number; boltStations: BoltStation[]; bounds: LocalBox; matingFacePoint: Vec3 }
