import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** The studio's sky: the page background (src/styles/tokens.css --c-bg). Scene background, fog and the backdrop
 * share it so the canvas edge disappears under the floating UI. */
export const STUDIO_BACKGROUND = '#efeeea';

/** Shared display transform and bounded studio lighting for rack, part studies and thumbnails. */
export function createStudioLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer, shadows = false) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = shadows;
  // Three r186 PCF uses the filtered shadow implementation (PCFSoft is deprecated).
  renderer.shadowMap.type = THREE.PCFShadowMap;
  scene.environmentIntensity = 0.6;
  // A light floor bounces warm light back up; the sky is neutral white.
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0xd9d4cb, 0.3);
  const key = new THREE.DirectionalLight(0xfffaf3, 1.5);
  key.position.set(-2200, 4500, 4500);
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.25);
  fill.position.set(-2500, 1800, -2000);
  key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.normalBias = 0.5;
  key.shadow.bias = -0.00005;
  key.shadow.autoUpdate = false;
  scene.add(hemisphere, key, key.target, fill);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  let disposed = false;
  return { key, fill, hemisphere, dispose() {
    if (disposed) return;
    disposed = true;
    key.shadow.dispose(); environment.dispose(); scene.environment = null;
    scene.remove(hemisphere, key, key.target, fill);
  } };
}
