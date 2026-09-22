import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGymFloor, fitRackShadow } from './gym-floor.ts';
import { addSteelUVs } from './frame-finishes.ts';

test('shadow camera follows rack bounds without altering them', () => {
  const light = new THREE.DirectionalLight();
  light.shadow.autoUpdate = false;
  const box = new THREE.Box3(new THREE.Vector3(-100, 0, -200), new THREE.Vector3(900, 2400, 2000));
  const original = box.clone();
  fitRackShadow(light, box);
  assert.deepEqual(box, original);
  assert.deepEqual(light.target.position, box.getCenter(new THREE.Vector3()));
  assert.equal(light.shadow.autoUpdate, false);
  assert.equal(light.shadow.needsUpdate, true);
  assert.ok(light.shadow.camera.far > light.shadow.camera.near);
  assert.ok(light.shadow.camera.right >= box.getSize(new THREE.Vector3()).length() / 2);
});
test('steel UVs are finite, face projected and generated only once without changing CAD positions', () => {
  const geometry = new THREE.BoxGeometry(75, 75, 2032).toNonIndexed();
  geometry.deleteAttribute('uv');
  const positions = geometry.getAttribute('position').array.slice();
  addSteelUVs(geometry);
  const uv = geometry.getAttribute('uv');
  assert.equal(uv.count, geometry.getAttribute('position').count);
  assert.ok(Array.from(uv.array).every(Number.isFinite));
  assert.ok(Math.max(...uv.array) > 1, 'Brush should repeat in physical units');
  addSteelUVs(geometry);
  assert.equal(geometry.getAttribute('uv'), uv);
  assert.deepEqual(geometry.getAttribute('position').array, positions);
  geometry.dispose();
});
test('studio floor is plain matte Lambert; a defined room finish (black rubber included) covers the room footprint', () => {
  const context = new Proxy({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => k in t ? t[k as 'createImageData'] : () => {}, set: () => true });
  const g = globalThis as { document?: unknown };
  g.document = { createElement: () => ({ getContext: () => context }) };
  try {
    const floor = createGymFloor(16), material = floor.mesh.material;
    assert.ok(material instanceof THREE.MeshLambertMaterial);
    assert.ok(!('roughness' in material) && !('specular' in material) && !('sheen' in material));
    assert.equal(material.envMap, null);
    assert.equal(material.map, null, 'the studio ground is a plain colour');
    assert.equal(material.reflectivity, 0);
    assert.equal(material.fog, true);
    assert.equal(material.color.getHexString(), 'e6e4df');
    assert.equal(floor.mesh.receiveShadow, true);
    assert.equal(floor.room.visible, false);
    const size = { left: 2000, right: 2000, back: 3000, front: 1000, height: 3000 };
    // No finish defined: the studio ground shows through the room.
    assert.equal(floor.update(size, null), true);
    assert.equal(floor.room.visible, false);
    // A gym that defines finishes keeps its black rubber, over the room only, at its tuned tint.
    assert.equal(floor.update(size, 'black-rubber'), true);
    assert.equal(floor.room.visible, true);
    assert.equal(floor.room.material.color.getHexString(), '909090');
    assert.equal(floor.room.material.map!.colorSpace, THREE.SRGBColorSpace);
    assert.equal(floor.update(size, 'black-rubber'), false, 'unchanged finish is a no-op');
    let disposed = 0;
    for (const resource of [floor.mesh.geometry, material, floor.room.material.map!]) resource.addEventListener('dispose', () => disposed++);
    floor.dispose(); floor.dispose();
    assert.equal(disposed, 3);
  } finally { delete g.document; }
});
