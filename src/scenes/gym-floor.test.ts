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
test('rubber floor is matte Lambert: no specular or env reflection, still shadowed, fogged and speckled', () => {
  const context = new Proxy({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => k in t ? t[k as 'createImageData'] : () => {}, set: () => true });
  const g = globalThis as { document?: unknown };
  g.document = { createElement: () => ({ getContext: () => context }) };
  try {
    const floor = createGymFloor(16), material = floor.mesh.material;
    assert.ok(material instanceof THREE.MeshLambertMaterial);
    assert.ok(!('roughness' in material) && !('specular' in material) && !('sheen' in material));
    assert.equal(material.envMap, null);
    assert.equal(material.reflectivity, 0);
    assert.equal(material.fog, true);
    assert.equal(material.color.getHexString(), '909090');
    assert.equal(material.map!.repeat.x, 20);
    assert.equal(material.map!.colorSpace, THREE.SRGBColorSpace);
    assert.equal(floor.mesh.receiveShadow, true);
    let disposed = 0;
    for (const resource of [floor.mesh.geometry, material, material.map!]) resource.addEventListener('dispose', () => disposed++);
    floor.dispose(); floor.dispose();
    assert.equal(disposed, 3);
  } finally { delete g.document; }
});
