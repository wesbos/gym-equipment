import type { MaterialSource } from './appearance.ts';
import type { LibraryWorkerRequest, NumericParams, PartDefinition } from './types.ts';
export type { LibraryWorkerRequest } from './types.ts';
/** Transferable mesh payload. Positions may contain additional properties after XYZ. */
export interface LibraryMesh extends MaterialSource {
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
