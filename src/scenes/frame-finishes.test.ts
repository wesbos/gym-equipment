import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { addSteelUVs } from './frame-finishes.ts';

for (const axis of ['x', 'y', 'z'] as const) {
  for (const sign of [-1, 1]) {
    test(`steel UVs preserve area on ${sign > 0 ? '+' : '-'}${axis} faces`, () => {
      // The two in-plane edges span exactly one texture repeat in U and V.
      const positions = axis === 'z' ? [0, 0, 9, 180, 0, 9, 0, 40, 9]
        : axis === 'x' ? [9, 0, 0, 9, 0, 180, 9, 40, 0]
          : [0, 9, 0, 0, 9, 180, 40, 9, 0];
      const normal = axis === 'x' ? [sign, 0, 0] : axis === 'y' ? [0, sign, 0] : [0, 0, sign];
      const geometry = new THREE.BufferGeometry();
      try {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute([...normal, ...normal, ...normal], 3));
        addSteelUVs(geometry);
        const uv = geometry.getAttribute('uv');
        assert.deepEqual(Array.from(uv.array), [0, 0, 1, 0, 0, 1]);
        const area = (uv.getX(1) - uv.getX(0)) * (uv.getY(2) - uv.getY(0))
          - (uv.getY(1) - uv.getY(0)) * (uv.getX(2) - uv.getX(0));
        assert.equal(area, 1, 'UV triangle must not collapse to a line');
        addSteelUVs(geometry);
        assert.equal(geometry.getAttribute('uv'), uv, 'existing UVs are retained');
      } finally { geometry.dispose(); }
    });
  }
}
