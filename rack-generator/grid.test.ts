import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearest, snapDimensions } from './grid.ts';
import { RACK_DEFAULTS } from './assembly.ts';
test('catalog spans, deterministic lower tie, and 80-inch cut phase', () => {
  assert.equal(nearest(575, [425, 725, 1075]), 425);
  assert.equal(snapDimensions(RACK_DEFAULTS, { width: 1037 }).width, 1075);
  assert.equal(snapDimensions(RACK_DEFAULTS, { height: 2032 }).height, 2032);
  assert.equal(snapDimensions(RACK_DEFAULTS, { height: 2045 }).height, 2032);
  assert.throws(() => nearest(NaN, [425]));
});
