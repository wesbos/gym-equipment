import * as THREE from 'three';
import type { RackDoc } from '../../rack-generator/types.ts';
import type { SwapCandidate } from '../../rack-generator/swap.ts';
/** Disposable world-space regions. Removed members retain a pickable graph-derived region. */
export function createSwapRegions(candidates: SwapCandidate[], instances: Map<string, THREE.Group>, doc: RackDoc) {
  const root = new THREE.Group();
  const boxes = new Map<string, THREE.Box3Helper>();
  for (const candidate of candidates) {
    if (!candidate.valid) continue;
    const box = new THREE.Box3();
    for (const group of instances.values()) if (group.userData.ownerId === candidate.ownerId) box.union(new THREE.Box3().setFromObject(group));
    if (box.isEmpty()) {
      const node = doc.uprights[candidate.ownerId], edge = doc.connections.find(e => e.id === candidate.ownerId);
      if (node) box.setFromCenterAndSize(new THREE.Vector3(node.x, doc.rack.height / 2, -node.y), new THREE.Vector3(doc.rack.tube, doc.rack.height, doc.rack.tube));
      else if (edge) {
        const a = doc.uprights[edge.from], b = doc.uprights[edge.to];
        const z = candidate.entries[0]?.position[2] ?? doc.rack.firstHole;
        box.setFromPoints([new THREE.Vector3(a.x, z, -a.y), new THREE.Vector3(b.x, z + doc.rack.tube, -b.y)]).expandByScalar(doc.rack.tube / 2);
      }
    }
    if (box.isEmpty()) continue;
    box.expandByScalar(8);
    const outline = new THREE.Box3Helper(box, new THREE.Color('#629c82'));
    const material = outline.material as THREE.LineBasicMaterial; material.transparent = true; material.opacity = 0.45;
    root.add(outline); boxes.set(candidate.ownerId, outline);
    // Proxy is only needed for missing members. Existing geometry is raycast precisely.
    if (!Array.from(instances.values()).some(g => g.userData.ownerId === candidate.ownerId)) {
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(...box.getSize(new THREE.Vector3()).toArray()), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.copy(box.getCenter(new THREE.Vector3())); proxy.userData.ownerId = candidate.ownerId; root.add(proxy);
    }
  }
  return {
    root,
    hover(owner: string | null) { for (const [id, box] of boxes) { const material = box.material as THREE.LineBasicMaterial; material.color.set(id === owner ? '#e2a248' : '#629c82'); material.opacity = id === owner ? 1 : 0.45; } },
    dispose() { root.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Box3Helper) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } }); root.clear(); root.removeFromParent(); },
  };
}
