import * as THREE from 'three';
import type { FloorFinish } from '../../rack-generator/room-finishes.ts';
import type { RoomSize } from '../../rack-generator/walls.ts';
import { FLOOR_TILE_MM, FLOOR_TINT, floorTexture } from './finish-textures.ts';

const FLOOR_SIZE = 40000;
const atlas = (finish: FloorFinish, anisotropy: number, repeat: number) => {
  const texture = new THREE.CanvasTexture(floorTexture(finish).canvas);
  texture.name = finish === 'black-rubber' ? 'Rubber gym tile speckles — 2m atlas' : `Floor ${finish} — ${FLOOR_TILE_MM[finish] / 1000}m atlas`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.setScalar(repeat);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, anisotropy);
  return texture;
};
/** The studio ground: a static black rubber tile atlas. A room floor finish (#200) covers just the room's footprint
 * with its own atlas (drawn on first use and kept), on a second plane with the same Lambert program, so switching
 * finish only swaps a map and a tint and never relinks a program. */
export function createGymFloor(anisotropy: number) {
  // Rubber is near-Lambertian: no specular lobe or env reflection to sweep across the plane while orbiting.
  // scene.environment (PMREM) still adds only its view-independent diffuse irradiance.
  const ground = atlas('black-rubber', anisotropy, FLOOR_SIZE / FLOOR_TILE_MM['black-rubber']);
  const material = new THREE.MeshLambertMaterial({ map: ground, color: FLOOR_TINT['black-rubber'], reflectivity: 0 });
  const geometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Gym floor scenery (not exported)';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.6;
  mesh.receiveShadow = true;
  // Room floor: UVs count atlas repeats in mm, so the atlas keeps its physical scale on any room size.
  const textures = new Map<FloorFinish, THREE.CanvasTexture>();
  const roomMaterial = new THREE.MeshLambertMaterial({ map: ground, color: FLOOR_TINT['black-rubber'], reflectivity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const room = new THREE.Mesh(new THREE.BufferGeometry(), roomMaterial);
  room.name = 'Room floor finish (scenery only)';
  room.position.y = -0.3;
  room.receiveShadow = true;
  room.visible = false;
  let disposed = false, finish: FloorFinish = 'black-rubber', key = '';
  return { mesh, room,
    get finish() { return finish; },
    /** Show a floor finish over the room's footprint (black rubber, the default, is the ground itself); true when
     * anything changed. */
    update(size: RoomSize, next: FloorFinish) {
      if (disposed) return false;
      const rect = [size.left, size.right, size.back, size.front, next].join();
      if (rect === key) return false;
      key = rect; finish = next;
      room.visible = next !== 'black-rubber';
      if (!room.visible) return true;
      let texture = textures.get(next);
      if (!texture) { texture = atlas(next, anisotropy, 1); textures.set(next, texture); }
      roomMaterial.map = texture;
      roomMaterial.color.set(FLOOR_TINT[next]);
      const width = size.left + size.right, depth = size.back + size.front, tile = FLOOR_TILE_MM[next];
      const plane = new THREE.PlaneGeometry(width, depth), uv = plane.getAttribute('uv');
      // World-anchored UVs: the atlas grid stays put when a wall moves.
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (-size.left + uv.getX(i) * width) / tile, (size.back - (1 - uv.getY(i)) * depth) / tile);
      plane.rotateX(-Math.PI / 2);
      plane.translate((size.right - size.left) / 2, 0, (size.front - size.back) / 2);
      room.geometry.dispose(); room.geometry = plane;
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.removeFromParent(); room.removeFromParent(); geometry.dispose(); material.dispose(); ground.dispose();
      room.geometry.dispose(); roomMaterial.dispose();
      for (const texture of textures.values()) texture.dispose();
    } };
}

/** Refit only when rack geometry changes; the shadow map is reused while orbiting. */
export function fitRackShadow(light: THREE.DirectionalLight, bounds: THREE.Box3) {
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(800, bounds.getSize(new THREE.Vector3()).length() / 2 + 100);
  light.target.position.copy(center);
  light.position.copy(center).add(new THREE.Vector3(-1, 2, 2).normalize().multiplyScalar(radius * 3));
  const camera = light.shadow.camera;
  camera.left = camera.bottom = -radius;
  camera.right = camera.top = radius;
  camera.near = radius; camera.far = radius * 5;
  camera.updateProjectionMatrix();
  light.shadow.needsUpdate = true;
}
