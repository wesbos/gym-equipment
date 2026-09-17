import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundedFrame, boundedWait } from './visual-check-timing.ts';

test('a suspended animation frame fails at the overall deadline and cancels its callback', async () => {
  const request = globalThis.requestAnimationFrame, cancel = globalThis.cancelAnimationFrame;
  let cancelled = 0;
  globalThis.requestAnimationFrame = () => 42;
  globalThis.cancelAnimationFrame = id => { cancelled = id; };
  try {
    await assert.rejects(boundedFrame(performance.now() + 10, 'cycle 2 / idle'), /cycle 2 \/ idle \/ animation frame: timed out/);
    assert.equal(cancelled, 42);
  } finally { globalThis.requestAnimationFrame = request; globalThis.cancelAnimationFrame = cancel; }
});
test('a stalled export gets a stage-specific timeout without depending on frames', async () => {
  await assert.rejects(boundedWait(new Promise<never>(() => {}), performance.now() + 10, 'cycle 1 / GLB'), /cycle 1 \/ GLB: timed out/);
});
