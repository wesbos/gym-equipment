import type { FrameFinishResources } from './frame-finishes.ts';
import * as THREE from 'three';
import { resolveMaterial, type Appearance, type MaterialSource } from '../../rack-generator/appearance.ts';
/** Geometry is shared with the cache; materials always belong to one instance. */
export function cloneInstanceMaterials(model: THREE.Group, appearance: Appearance | undefined, instanceId: string, finishes?: FrameFinishResources) {
  const clone = model.clone();
  clone.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = object.userData.materialSource as MaterialSource;
    object.material = finishes?.material(source, appearance, instanceId) ?? new THREE.MeshStandardMaterial(resolveMaterial(source, appearance, instanceId));
  });
  return clone;
}
