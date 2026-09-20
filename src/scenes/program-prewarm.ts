import * as THREE from 'three';
import type { FrameFinishResources } from './frame-finishes.ts';

/** Picked-up parts: see-through wireframe (see pickup-materials.ts). */
const pickup = <M extends THREE.MeshStandardMaterial>(m: M) => Object.assign(m, { opacity: 0.16, transparent: true, depthWrite: false, wireframe: true });

export interface PrewarmOverlays {
  /** Shared mesh overlay materials (ghost, cradle). */
  meshes: THREE.Material[];
  /** Shared instanced dot materials (mount, hook). */
  instanced: THREE.Material[];
  /** Shared line materials (selection outline). */
  lines: THREE.Material[];
}

/**
 * Link every shader variant the builder can switch to mid-interaction (instance finishes, their pickup
 * wireframes, the shared overlays and swap outlines) before the user needs it, using the live scene's
 * lights, fog and environment so the programs match exactly. The shared overlay materials are compiled
 * in place and left alone; the returned function frees only the stand-ins created here.
 */
export async function prewarmPrograms(renderer: THREE.WebGLRenderer, camera: THREE.Camera, target: THREE.Scene, finishes: FrameFinishResources, overlays: PrewarmOverlays) {
  const warm = new THREE.Scene(), geometry = new THREE.BoxGeometry();
  const finish = [undefined, { frameFinish: 'stainless' as const }, { frameFinish: 'clear-grind' as const }].map(appearance => finishes.material({ role: 'frame' }, appearance));
  const owned: THREE.Material[] = [...finish, ...finish.map(m => pickup(m.clone()))];
  for (const material of [...owned, ...overlays.meshes]) warm.add(new THREE.Mesh(geometry, material));
  const dots = overlays.instanced.map(material => new THREE.InstancedMesh(geometry, material, 1));
  const box = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
  const lines = overlays.lines.map(material => {
    const helper = new THREE.Box3Helper(box);
    (helper.material as THREE.Material).dispose();
    helper.material = material;
    return helper;
  });
  // Swap regions build their own translucent outlines.
  const swap = new THREE.Box3Helper(box);
  Object.assign(swap.material, { transparent: true, opacity: 0.45 });
  owned.push(swap.material as THREE.Material);
  warm.add(...dots, ...lines, swap);
  await renderer.compileAsync(warm, camera, target);
  return () => {
    for (const m of owned) m.dispose();
    for (const d of dots) d.dispose();
    geometry.dispose(); swap.geometry.dispose();
    for (const l of lines) l.geometry.dispose();
  };
}
