import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGymBackdrop } from './gym-backdrop.ts';

test('distant slats remain outside a full orbit after zoom and pan without rebuilding instances', () => {
  const backdrop = createGymBackdrop(), camera = new THREE.PerspectiveCamera();
  const meshes = backdrop.group.children.filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh);
  const versions = meshes.map(mesh => mesh.instanceMatrix.version);
  assert.equal(meshes.length, 2);
  for (const target of [new THREE.Vector3(), new THREE.Vector3(20000, 1000, -15000)])
    for (const distance of [1000, 10000, 40000]) for (let angle = 0; angle < 2*Math.PI; angle += Math.PI/12) {
      camera.position.set(target.x+Math.sin(angle)*distance, 2000, target.z+Math.cos(angle)*distance);
      backdrop.follow(camera, target);
      const innerRadius = (12000-35)*backdrop.group.scale.x;
      assert.ok(innerRadius - distance > 5800, 'the camera cannot enter the slats');
      assert.equal(backdrop.group.position.x, target.x);
      assert.equal(backdrop.group.position.z, target.z);
    }
  assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix.version), versions);
  backdrop.dispose();
});

test('backdrop teardown releases shared buffers and materials exactly once', () => {
  const backdrop = createGymBackdrop(), scene = new THREE.Scene();
  scene.add(backdrop.group);
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.InstancedMesh>();
  backdrop.group.traverse(o => {
    if (o instanceof THREE.Mesh) { resources.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) resources.add(m); }
    if (o instanceof THREE.InstancedMesh) resources.add(o);
  });
  let disposed = 0;
  const onDispose = () => disposed++;
  for (const resource of resources) {
    if (resource instanceof THREE.BufferGeometry) resource.addEventListener('dispose', onDispose);
    else if (resource instanceof THREE.Material) resource.addEventListener('dispose', onDispose);
    else resource.addEventListener('dispose', onDispose);
  }
  backdrop.dispose(); backdrop.dispose();
  assert.equal(disposed, resources.size);
  assert.equal(backdrop.group.parent, null);
});
