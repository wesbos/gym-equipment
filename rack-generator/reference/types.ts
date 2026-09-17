import type { Vec3 } from '../types.ts';
/** Decoded source data used only by development analysis tools. */
export interface SourceBounds { min: Vec3; max: Vec3; size: Vec3 }
export interface SourceMesh { positions: number[]; indices: number[] }
export interface SourcePart extends SourceMesh { name: string; color?: number[]; material?: string; bounds: SourceBounds }
export interface DecodedSource { id: string; reference: { file: string; node: string }; units: string; axes: string; size: Vec3; parts: SourcePart[] }
export interface ConnectedComponent extends SourceMesh { min: number[]; max: number[]; size: number[]; center: number[] }
export interface InventoryGLTF {
 nodes: { name: string; matrix?: number[]; translation?: Vec3; rotation?: [number,number,number,number]; scale?: Vec3; mesh?: number; children?: number[] }[];
 meshes: { primitives: { attributes: { POSITION: number } }[] }[];
 accessors: { min?: Vec3; max?: Vec3 }[];
}
