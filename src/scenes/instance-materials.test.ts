import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cloneInstanceMaterials } from './instance-materials.ts';
import { BuilderStore, type StorageLike } from '../state/builder-store.ts';

test('repeated geometry shares buffers but never shares instance/cache materials', () => {
  const model = new THREE.Group(), geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial({ color: '#123456' });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.materialSource = { role: 'frame', color: '#123456' }; model.add(mesh);
  const appearance = { frameColor: '#ff0000', overrides: { left: '#0000ff' } };
  const left = cloneInstanceMaterials(model, appearance, 'left').children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const right = cloneInstanceMaterials(model, appearance, 'right').children[0] as typeof left;
  assert.equal(left.geometry, right.geometry);
  assert.notEqual(left.material, right.material); assert.notEqual(left.material, material);
  assert.equal(left.material.color.getHexString(), '0000ff'); assert.equal(right.material.color.getHexString(), 'ff0000');
  assert.equal(material.color.getHexString(), '123456');
  left.material.dispose(); right.material.dispose(); geometry.dispose(); material.dispose();
});
test('appearance survives local reload, JSON import, undo and redo with physical selection', () => {
  let saved: string | null = null;
  const storage: StorageLike = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const store = new BuilderStore(storage), doc = store.getSnapshot().doc;
  const appearance = { frameColor: '#ff0000', hardwareFinish: 'gold' as const, overrides: { 'jhooks-front:right': '#00ff00' } };
  store.commit({ ...doc, appearance }); store.select('jhooks-front:right');
  assert.equal(store.getSnapshot().selected, 'jhooks-front:right');
  assert.deepEqual(new BuilderStore(storage).getSnapshot().doc.appearance, appearance);
  store.history('undo'); assert.equal(store.getSnapshot().doc.appearance, undefined);
  store.history('redo'); assert.deepEqual(store.getSnapshot().doc.appearance, appearance);
  store.importJSON(JSON.stringify(store.getSnapshot().doc)); assert.deepEqual(store.getSnapshot().doc.appearance, appearance);
});
