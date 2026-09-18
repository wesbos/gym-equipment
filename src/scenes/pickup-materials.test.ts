import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { pickupAppearance, cloneAppliedAssembly } from './pickup-materials.ts';
test('active pickup export clone keeps applied materials and later finish edits survive cancellation', () => {
  const root = new THREE.Group(), material = new THREE.MeshStandardMaterial({ color: '#a9232c' });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); root.add(mesh);
  pickupAppearance(root, true);
  const exported = cloneAppliedAssembly(root), copy = (exported.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
  assert.notEqual(copy, material); assert.equal(copy.opacity, 1); assert.equal(copy.wireframe, false); assert.equal(copy.transparent, false);
  assert.equal(copy.color.getHexString(), 'a9232c'); assert.equal(material.opacity, 0.16);
  pickupAppearance(root, false); material.opacity = 0.8;
  pickupAppearance(root, true); pickupAppearance(root, false); assert.equal(material.opacity, 0.8);
  mesh.geometry.dispose(); material.dispose(); copy.dispose();
});
