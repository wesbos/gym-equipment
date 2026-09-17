import test from 'node:test';
import assert from 'node:assert/strict';
import { dimensionOptions, UPRIGHT_HEIGHT_OPTIONS } from './standards.ts';
import { GRID_PROFILES } from './profiles.ts';
import { snapDimensions } from './grid.ts';
import { definitions } from './parts/structure.ts';
const rack = { height: 2032, width: 1075, depth: 725, tube: 75, holeDiameter: 25, pitch: 50, firstHole: 65 };
test('all offered rack standards are fixed points of profile validation', () => {
  for (const profile of GRID_PROFILES) for (const key of ['height', 'width', 'depth'] as const) {
    const dimensions = { ...rack, pitch: profile.pitch };
    for (const option of dimensionOptions(dimensions, key, profile.id)) {
      assert.equal(snapDimensions(dimensions, { [key]: option.value }, profile.id)[key], option.value);
    }
  }
});
test('exact imperial dimensions and generic source spans stay distinct', () => {
  assert.deepEqual(UPRIGHT_HEIGHT_OPTIONS.map(o => o.value), [1828.8, 2032, 2362.2, 2743.2]);
  assert.deepEqual(dimensionOptions(rack, 'depth').map(o => o.value), [425, 725, 1075]);
  assert.deepEqual(dimensionOptions(rack, 'height').map(o => o.value), [2032]);
  assert.deepEqual(dimensionOptions(rack, 'depth', 'rep-pr-4000').map(o => o.value), [406.4, 609.6, 762, 1041.4]);
  assert.deepEqual(dimensionOptions(rack, 'width', 'rep-pr-5000').map(o => o.value), [1140.32]);
});
test('part standards survive the worker catalog serialization boundary', () => {
  const catalog = structuredClone(definitions.map(({ build, ...definition }) => definition));
  assert.deepEqual(catalog.find(d => d.id === 'crossmember-725')?.standardOptions?.length.map(o => o.value), [425, 725, 1075]);
});
