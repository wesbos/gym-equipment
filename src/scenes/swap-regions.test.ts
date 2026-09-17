import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAssembly, removeInstance } from '../../rack-generator/assembly.ts';
import { swapCandidates } from '../../rack-generator/swap.ts';
import { createSwapRegions } from './swap-regions.ts';
test('removed upright regions remain pickable and dispose every helper/proxy resource', () => {
  const doc = removeInstance(createAssembly(), 'front-left');
  const regions = createSwapRegions(swapCandidates(doc, 'upright'), new Map(), doc);
  assert.ok(regions.root.children.some(o => o instanceof THREE.Mesh && o.userData.ownerId === 'front-left'));
  let geometries = 0, materials = 0, disposedGeometry = 0, disposedMaterial = 0;
  regions.root.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Box3Helper) {
    geometries++; o.geometry.addEventListener('dispose', () => disposedGeometry++);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials++; m.addEventListener('dispose', () => disposedMaterial++); }
  } });
  regions.hover('front-left'); regions.hover(null); regions.dispose();
  assert.equal(disposedGeometry, geometries); assert.equal(disposedMaterial, materials);
  assert.equal(regions.root.children.length, 0);
});
