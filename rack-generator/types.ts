import type { RackSystem, SystemPartId } from './system-types.ts';
import type { ValidatedLogo } from './logos/types.ts';
import type { Appearance, MaterialSource } from './appearance.ts';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';

export type ManifoldAPI = ManifoldToplevel;
export type { Manifold, CrossSection, Mesh } from 'manifold-3d';
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type NumericParams = Record<string, number>;
export type PartParams = NumericParams;
export type PartId = SystemPartId | 'rep-nighthawk' | 'darko-anchor' | 'darko-dock' | 'darko-j' | 'darko-double-j' | 'darko-double-decker' | 'voltra-sliding' | 'voltra-adaptive' | 'voltra-fixed' | 'upright' | 'crossmember-425' | 'crossmember-725' | 'crossmember-1075' | 'angled-crossmember' | 'offset-crossmember' | 'nameplate' | 'branded-crossmember' | 'branded-crossmember-lite' | 'foot-400' | 'foot-800' | 'pullup-straight' | 'pullup-multigrip' | 'pullup-sphere' | 'safety-box' | 'safety-pin-pipe' | 'safety-webbing' | 'j-hook-standard' | 'j-hook-roller' | 'j-hook-sandwich' | 'spotter-arm' | 'dip-horn' | 'dip-bar-adjustable' | 'landmine' | 'monolift' | 'single-bar-holder' | 'storage-pin-short' | 'storage-pin-long';
export interface SolidPart extends MaterialSource { name: string; solid: Manifold; color?: string; metalness?: number; roughness?: number }
export interface StandardOption { value: number; label: string }
export interface PartDefinition { standardOptions?: Record<string, readonly StandardOption[]>; id: string; name: string; category: string; defaults: NumericParams; build: (api: ManifoldAPI, params: NumericParams, logo?: ValidatedLogo) => SolidPart[]; reference?: { file: string; node: string }; description?: string; /** Laid-out 3MF: keep the builder's Z-up frame (base end down) instead of the smallest-height heuristic. */ printOrientation?: 'standing' }
export interface UprightParams { height: number; width: number; wall: number; radius: number; diameter: number; spacing: number; offset: number }
export interface UprightMesh { positions: Float32Array; indices: Uint32Array; stride: number; height: number; centers: number[]; volume: number; params: UprightParams }
export interface LibraryWorkerRequest { logo?: ValidatedLogo; id: number | string; part: string; params: NumericParams }
export interface UprightWorkerRequest { id: number | string; params: Partial<UprightParams> }
export type Face = 'front' | 'back' | 'left' | 'right';
export type UprightId = string;
export interface UprightNode { x: number; y: number }
export interface ConnectionEdge { id: string; from: string; to: string; level: "upper" | "lower" }
export interface RackDimensions { height: number; width: number; depth: number; tube: number; holeDiameter: number; pitch: number; firstHole: number; benchStart?: number; benchEnd?: number; benchSpacing?: number }
export interface UprightTarget { orientation?: number; kind?: 'upright'; uprightId: UprightId; face: Face; hole: number }
/** Upper rail bearing tab with a side through-bolt at an actual rail station. */
export interface CrossmemberTopTarget { orientation?: number; kind: 'crossmember-top'; connectionId: string; station: number; side: 1 | -1; uprightId: UprightId; face: Face; hole: number }
export type Target = UprightTarget | CrossmemberTopTarget;
export interface Accessory { /** Radians about the adapter-defined axis; omitted means zero. */ rotation?: number; id: string; part: PartId; target: Target; paired: boolean; params: NumericParams; spanTo?: string; pairTo?: string; pairedSpanTo?: string; pairTarget?: CrossmemberTopTarget }
export interface StructureVariant { part: PartId; params: NumericParams }
export interface FloorItem { id: string; part: 'rep-nighthawk'; position: Vec2; rotation: number; params: NumericParams }
export interface RackDoc { floorItems?: FloorItem[]; systems?: RackSystem[]; logo?: ValidatedLogo; appearance?: Appearance; version: 2; uprights: Record<string, UprightNode>; connections: ConnectionEdge[]; profileId?: string; rack: RackDimensions; removed: string[]; structure: Record<string, StructureVariant>; accessories: Accessory[]; nextId: number }

export interface StructureSlot { id: string; part: PartId; connectedTo: UprightId[] }
export interface LocalBox { min: Vec3; max: Vec3 }
export type Mount = Target & { position: Vec3; center: Vec3; localAnchor?: Vec3; pinAxis?: Vec3; label?: string; connectorId?: string }
export interface ResolvedInstance { logo?: ValidatedLogo; id: string; part: PartId; params: NumericParams; position: Vec3; rotation: Vec3; mount: Mount | null; mounts: Mount[]; ownerId: string; kind: 'structure' | 'accessory' | 'floor-item'; paired: boolean; connectedTo: string[]; collisionEnabled?: boolean; collisionBoxes?: LocalBox[]; localOutward?: Vec3; name?: string }
export interface PlacementField { key: string; label: string; min: number; max: number; step: number }
export interface PlacementInfo { family: string; label: string; paired: boolean; slots?: string[]; fields: PlacementField[]; faces?: Face[]; fixedHole?: number; requiredPitch?: number; handed?: boolean; mountType?: string; description?: string }
export interface CollisionWarning { ids: [string, string]; message: string }
export type CollisionInstance = Partial<Omit<ResolvedInstance, 'id' | 'part' | 'mount' | 'mounts'>> & { id: string; part: string; mount?: Partial<Mount> | null; mounts?: Partial<Mount>[] };
export interface BoltStation { point: Vec3; zOffset: number; axis: Vec3; diameter: number }
export interface AttachmentAnchor { point: Vec3; outward: Vec3; pinAxis: Vec3; requiredTube: number; minHoleZ: number; maxAbove: number; requiredPitch?: number; boltStations: BoltStation[]; bounds: LocalBox; matingFacePoint: Vec3 }
