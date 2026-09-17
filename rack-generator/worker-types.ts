import type { LibraryWorkerRequest, NumericParams, PartDefinition, UprightMesh, UprightWorkerRequest } from './types.ts';
export type { LibraryWorkerRequest, UprightWorkerRequest } from './types.ts';
/** Transferable mesh payload. Positions may contain additional properties after XYZ. */
export interface LibraryMesh {
 name: string;
 color?: string;
 metalness?: number;
 roughness?: number;
 positions: Float32Array;
 indices: Uint32Array;
 stride: number;
}
export type CatalogDefinition = Omit<PartDefinition, 'build'>;
export type LibraryWorkerResponse =
 | { type: 'catalog'; definitions: CatalogDefinition[] }
 | { type: 'model'; id: LibraryWorkerRequest['id']; part: string; params: NumericParams; meshes: LibraryMesh[] }
 | { type: 'error'; id: LibraryWorkerRequest['id']; error: string };
export type UprightWorkerResponse =
 | { id: UprightWorkerRequest['id']; model: UprightMesh }
 | { id: UprightWorkerRequest['id']; error: string };
