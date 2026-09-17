import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { GeometryCache, geometryKey } from './geometry-cache.ts';
import type { ResolvedInstance } from '../../rack-generator/types.ts';
import type { ValidatedLogo } from '../../rack-generator/logos/types.ts';

const entry = (part: ResolvedInstance['part'], params: Record<string, number>, logo?: ValidatedLogo) => ({ part, params, logo });
const logo = { loops: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } as ValidatedLogo;

test('32 active models cannot evict a displayed multipart, logo-aware preview', async () => {
  const disposed: THREE.BufferGeometry[] = [];
  const cache = new GeometryCache<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>>(model => { disposed.push(model.geometry); model.geometry.dispose(); model.material.dispose(); });
  const active = Array.from({ length: 32 }, (_, height) => geometryKey(entry('upright', { height: 1000 + height })));
  const load = (key: string) => cache.get(key, async () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  await Promise.all(active.map(load));
  const keys = [geometryKey(entry('nameplate', { length: 1000 }, logo)), geometryKey(entry('crossmember-725', { length: 800 }))];
  const release = cache.pin(keys);
  const originals = await Promise.all(keys.map(load));
  const ghosts = originals.map(model => model.clone());
  cache.trim(active);
  await Promise.resolve();
  assert.deepEqual(disposed, [], 'displayed clones must keep their shared buffers alive');
  assert.deepEqual(await Promise.all(keys.map(load)), originals, 'hover reuses the cached CAD result');
  ghosts.forEach((ghost, i) => assert.equal(ghost.geometry, originals[i].geometry));
  release();
  cache.trim(active);
  await Promise.resolve();
  assert.deepEqual(disposed, originals.map(model => model.geometry), 'released previews become evictable');
  cache.dispose();
});

test('overlapping worker and displayed owners keep pending geometry pinned until both finish', async () => {
  const disposed: string[] = [];
  const cache = new GeometryCache<string>(value => { disposed.push(value); }, 0);
  let complete!: (value: string) => void;
  const key = 'pending-preview';
  const releaseWorker = cache.pin([key]), releaseDisplay = cache.pin([key]);
  const pending = cache.get(key, () => new Promise(resolve => { complete = resolve; }));
  releaseWorker(); releaseWorker();
  cache.trim();
  complete('model');
  await pending;
  assert.deepEqual(disposed, []);
  assert.equal(await cache.get(key, async () => 'unexpected rebuild'), 'model');
  releaseDisplay(); cache.trim();
  await Promise.resolve();
  assert.deepEqual(disposed, ['model']);
  cache.dispose();
});

test('evicted request failure does not delete a newer request for the same key', async () => {
  const cache = new GeometryCache<string>(() => {}, 0);
  let reject!: (error: Error) => void;
  const old = cache.get('same', () => new Promise((_, fail) => { reject = fail; }));
  cache.trim();
  const current = cache.get('same', async () => 'new');
  reject(new Error('old request failed'));
  await assert.rejects(old);
  assert.equal(cache.get('same', async () => 'wrong'), current);
  cache.dispose();
});

test('route teardown disposes a pinned late worker result exactly once', async () => {
  const disposed: string[] = [];
  const cache = new GeometryCache<string>(value => { disposed.push(value); });
  let resolve!: (value: string) => void;
  const release = cache.pin(['late']);
  const pending = cache.get('late', () => new Promise(done => { resolve = done; }));
  cache.dispose(); cache.dispose(); release();
  resolve('late model'); await pending; await Promise.resolve();
  assert.deepEqual(disposed, ['late model']);
});

test('geometry identity tracks logo loops and normalizes parameter ordering', () => {
  assert.equal(geometryKey(entry('nameplate', { length: 900, tube: 75 }, logo)), geometryKey(entry('nameplate', { tube: 75, length: 900 }, logo)));
  assert.notEqual(geometryKey(entry('nameplate', { length: 900 }, logo)), geometryKey(entry('nameplate', { length: 900 })));
  assert.notEqual(geometryKey(entry('nameplate', { length: 900 }, logo)), geometryKey(entry('nameplate', { length: 900 }, { ...logo, loops: [[[0, 0], [2, 0], [2, 2], [0, 0]]] })));
});
