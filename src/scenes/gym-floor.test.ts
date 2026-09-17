import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitRackShadow } from './gym-floor.ts';
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
