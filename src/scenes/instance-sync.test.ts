import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { InstanceSync } from './instance-sync.ts';
import { cloneInstanceMaterials } from './instance-materials.ts';
import { GeometryCache, geometryKey } from '../geometry/geometry-cache.ts';
import type { ResolvedInstance } from '../../rack-generator/types.ts';

const modelOf = (color: string) => {
  const model = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.userData.materialSource = { role: 'frame', color };
  model.add(mesh);
  return model;
};
const entry = (id: string, position: [number, number, number] = [0, 0, 0], part = 'upright'): ResolvedInstance =>
  ({ id, ownerId: id, part, params: {}, position, rotation: [0, 0, 0], kind: 'structure', mount: null, mounts: [], connectedTo: [], paired: false }) as unknown as ResolvedInstance;
function harness() {
  const root = new THREE.Group(), instances = new Map<string, THREE.Group>(), built: string[] = [], disposed: THREE.Group[] = [];
  const sync = new InstanceSync(root, instances, (model, e) => {
    built.push(e.id);
    const g = cloneInstanceMaterials(model, undefined, e.id);
    g.position.set(...e.position); g.userData = { id: e.id, ownerId: e.ownerId };
    return g;
  }, g => disposed.push(g));
  return { root, instances, built, disposed, sync };
}

test('moving one instance keeps every group, mesh and material and only updates its transform', () => {
  const { root, instances, built, disposed, sync } = harness(), a = modelOf('#111111'), b = modelOf('#222222');
  sync.sync([entry('a'), entry('b')], [a, b], undefined, () => undefined);
  const before = [...root.children], material = (instances.get('a')!.children[0] as THREE.Mesh).material;
  built.length = 0;
  sync.sync([entry('a', [100, 0, 5]), entry('b')], [a, b], undefined, () => undefined);
  assert.deepEqual(built, []);
  assert.deepEqual(disposed, []);
  assert.deepEqual(root.children, before);
  assert.equal((instances.get('a')!.children[0] as THREE.Mesh).material, material);
  assert.deepEqual(instances.get('a')!.position.toArray(), [100, 0, 5]);
});

test('changed geometry or materials rebuild only that instance; removed ones are disposed; order follows the resolve', () => {
  const { root, instances, built, disposed, sync } = harness(), a = modelOf('#111111'), b = modelOf('#222222'), c = modelOf('#333333');
  sync.sync([entry('a'), entry('b'), entry('c')], [a, b, c], undefined, () => undefined);
  const [ga, gb, gc] = root.children;
  built.length = 0;
  // New model for b (params changed), c gets an appearance override, a is removed, d is new.
  const b2 = modelOf('#222222'), d = modelOf('#444444');
  sync.sync([entry('d'), entry('c'), entry('b')], [d, c, b2], { overrides: { c: '#ff0000' } }, () => undefined);
  assert.deepEqual(built.sort(), ['b', 'c', 'd']);
  assert.deepEqual(new Set(disposed), new Set([ga, gb, gc]));
  assert.deepEqual(root.children.map(g => g.userData.id), ['d', 'c', 'b']);
  assert.deepEqual([...instances.keys()], ['d', 'c', 'b']);
  built.length = 0; disposed.length = 0;
  sync.sync([entry('d'), entry('c'), entry('b')], [d, c, b2], { overrides: { c: '#ff0000' } }, () => undefined);
  assert.deepEqual(built, []); assert.deepEqual(disposed, []);
  sync.clear();
  assert.equal(root.children.length, 0); assert.equal(instances.size, 0);
});

test('duplicate ids keep every group displayed and the last one addressable, as the full rebuild did', () => {
  const { root, instances, sync, disposed } = harness(), a = modelOf('#111111');
  sync.sync([entry('a'), entry('a', [5, 0, 0])], [a, a], undefined, () => undefined);
  assert.equal(root.children.length, 2);
  assert.equal(instances.get('a'), root.children[1]);
  sync.sync([entry('a')], [a], undefined, () => undefined);
  assert.equal(root.children.length, 1);
  assert.equal(disposed.length, 1);
});

test('geometry keys are memoised per entry and the cache reports resolved batches', async () => {
  const e = entry('a'), key = geometryKey(e);
  assert.equal(geometryKey(e), key);
  assert.equal(key, JSON.stringify(['upright', null, {}]));
  const cache = new GeometryCache<string>(() => {}, 0);
  let resolve!: (v: string) => void;
  const pending = cache.get(key, () => new Promise(r => { resolve = r; }));
  assert.equal(cache.isReady(key), false);
  resolve('model'); await pending;
  assert.equal(cache.isReady(key), true);
  cache.trim();
  assert.equal(cache.isReady(key), false, 'evicted models are no longer ready');
  cache.get(key, () => Promise.reject(new Error('no'))).catch(() => {});
  await Promise.resolve(); await Promise.resolve();
  assert.equal(cache.isReady(key), false, 'failed builds are never ready');
});
