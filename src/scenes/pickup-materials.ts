import * as THREE from 'three';
type PickupMaterial = THREE.Material & { wireframe?: boolean };
const originals = new WeakMap<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean; wireframe?: boolean }>();
export function pickupAppearance(root: THREE.Object3D, active: boolean) {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of (Array.isArray(object.material) ? object.material : [object.material]) as PickupMaterial[]) {
      if (active) {
        if (!originals.has(material)) originals.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, wireframe: material.wireframe });
        Object.assign(material, { opacity: 0.16, transparent: true, depthWrite: false, wireframe: true });
      } else {
        const original = originals.get(material);
        if (original) { Object.assign(material, original); originals.delete(material); }
      }
    }
  });
}
/** Own materials on the export clone; geometry and textures remain shared/read-only. */
export function cloneAppliedAssembly(root: THREE.Object3D) {
  const clone = root.clone();
  clone.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const copy = (material: THREE.Material) => Object.assign(material.clone(), originals.get(material) ?? {});
    object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
  });
  return clone;
}
