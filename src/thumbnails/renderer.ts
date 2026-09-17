import { createStudioLighting } from '../scenes/studio-lighting.ts';
import { resolveMaterial } from '../../rack-generator/appearance.ts';
import * as THREE from 'three';
import type { LibraryMesh } from '../../rack-generator/worker-types.ts';

/** A single small canvas, rendered once per result; no animation loop or reference GLB work. */
export function createThumbnailRenderer() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(128, 128, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const lighting = createStudioLighting(scene, renderer);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100000);
  const group = new THREE.Group();
  // Manifold parts are Z-up; match the part viewer's Y-up presentation.
  group.rotation.x = -Math.PI / 2;
  scene.add(group);
  const clear = () => {
    for (const child of [...group.children]) {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      mesh.geometry.dispose();
      mesh.material.dispose();
      group.remove(mesh);
    }
  };
  return {
    render(meshes: LibraryMesh[]): string {
      try {
        for (const mesh of meshes) {
          const geometry = new THREE.BufferGeometry();
          const material = new THREE.MeshStandardMaterial({ ...resolveMaterial(mesh, { frameColor: mesh.color ?? '#496454' }), flatShading: true });
          group.add(new THREE.Mesh(geometry, material));
          geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(mesh.positions, mesh.stride), 3, 0));
          geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
        }
        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(group);
        if (box.isEmpty()) throw new Error('Empty thumbnail');
        const center = box.getCenter(new THREE.Vector3());
        const radius = box.getSize(new THREE.Vector3()).length() / 2;
        camera.position.copy(center).add(new THREE.Vector3(0.9, 0.6, 1).normalize().multiplyScalar(radius * 3));
        camera.lookAt(center);
        camera.updateMatrixWorld(true);
        // Project all box corners to fit tall uprights and wide members equally.
        let extent = 0;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y));
        }
        extent = Math.max(extent * 1.12, 1);
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.far = Math.max(radius * 6, 10);
        camera.updateProjectionMatrix();
        if (renderer.getContext().isContextLost()) throw new Error('Thumbnail context lost');
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      } finally { clear(); }
    },
    dispose() { clear(); lighting.dispose(); scene.clear(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); },
  };
}
