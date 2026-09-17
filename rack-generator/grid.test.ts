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

test('REP catalogs preserve exact inch conversion and stay separate from generic grids', async () => {
  const { GRID_PROFILES } = await import('./profiles.ts');
  const rep = GRID_PROFILES.find(p => p.id === 'rep-pr-5000')!;
  assert.equal(rep.pitch,50.8);
  assert.equal(rep.holeDiameter,25.4);
  assert.equal(snapDimensions(RACK_DEFAULTS,{depth:750},rep.id).depth,762);
  assert.equal(snapDimensions(RACK_DEFAULTS,{height:2360},rep.id).height,2362.2);
  assert.equal(snapDimensions(RACK_DEFAULTS,{depth:750}).depth,725);
  assert.ok(rep.reconstructionNote);
  const pr4000 = GRID_PROFILES.find(p => p.id === 'rep-pr-4000')!;
  assert.equal(pr4000.holeDiameter,15.875);
  assert.match(pr4000.reconstructionNote!,/Bench-zone/);
});

test('numeric arrows advance between valid targets instead of sticking on a snapped value', async () => {
  const { stepDimension } = await import('./grid.ts');
  assert.equal(stepDimension(RACK_DEFAULTS,'width',725,1),1075);
  assert.equal(stepDimension(RACK_DEFAULTS,'width',725,-1),425);
  assert.equal(stepDimension(RACK_DEFAULTS,'height',2032,1),2082);
});
