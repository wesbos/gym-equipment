import test from 'node:test';
import assert from 'node:assert/strict';
import { fogRange, renderBudget } from './render-budget.ts';

const desktop = { devicePixelRatio: 2, coarsePointer: false, screenWidth: 1728, screenHeight: 1117 };

test('desktop keeps the original budget', () => {
  assert.deepEqual(renderBudget(desktop), { pixelRatio: 2, shadowMapSize: 2048, antialias: true, mobile: false });
  assert.equal(renderBudget({ ...desktop, devicePixelRatio: 3 }).pixelRatio, 2);
  assert.equal(renderBudget({ ...desktop, devicePixelRatio: 1 }).pixelRatio, 1);
});

test('phones and tablets cap pixel ratio and shadow map but keep MSAA', () => {
  const phone = renderBudget({ devicePixelRatio: 3, coarsePointer: true, screenWidth: 390, screenHeight: 844 });
  assert.deepEqual(phone, { pixelRatio: 1.5, shadowMapSize: 1024, antialias: true, mobile: true });
  assert.equal(renderBudget({ devicePixelRatio: 2, coarsePointer: true, screenWidth: 1024, screenHeight: 1366 }).pixelRatio, 1.5);
  // A small window with a mouse still gets the small-screen budget; a 1x phone is not upscaled.
  assert.equal(renderBudget({ devicePixelRatio: 1, coarsePointer: false, screenWidth: 360, screenHeight: 740 }).pixelRatio, 1);
  assert.equal(renderBudget({ devicePixelRatio: 3, coarsePointer: true, screenWidth: 360, screenHeight: 740, deviceMemory: 2 }).pixelRatio, 1.25);
});

test('fog is unchanged for normal orbits and scales for far fits', () => {
  assert.deepEqual(fogRange(6000), [18000, 42000]);
  assert.deepEqual(fogRange(12000), [18000, 42000]);
  const [near, far] = fogRange(51465);
  assert.ok(near > 51465, 'a fitted room is in front of the fog');
  assert.ok(far > near);
});
