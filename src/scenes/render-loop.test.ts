import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createMotionCheck, createRenderLoop, pinPrograms } from './render-loop.ts';

function fakeFrames() {
  const queue = new Map<number, FrameRequestCallback>();
  let next = 1;
  return {
    raf: (callback: FrameRequestCallback) => { queue.set(next, callback); return next++; },
    caf: (id: number) => { queue.delete(id); },
    get pending() { return queue.size; },
    tick() { const callbacks = [...queue.values()]; queue.clear(); for (const c of callbacks) c(0); },
  };
}

test('renders only when invalidated, coalescing requests into one frame', () => {
  const frames = fakeFrames();
  let rendered = 0;
  const loop = createRenderLoop(() => { rendered++; return false; }, frames.raf, frames.caf);
  assert.equal(frames.pending, 0, 'idle: no frame scheduled');
  loop.invalidate(); loop.invalidate(); loop.invalidate();
  assert.equal(frames.pending, 1);
  frames.tick();
  assert.equal(rendered, 1);
  assert.equal(frames.pending, 0, 'stops once nothing changed');
  frames.tick();
  assert.equal(rendered, 1);
});

test('keeps rendering while the frame asks for more, and invalidations during a frame schedule the next', () => {
  const frames = fakeFrames();
  let remaining = 3, rendered = 0, nested = true;
  const loop = createRenderLoop(() => {
    rendered++;
    if (nested) { nested = false; loop.invalidate(); }
    return --remaining > 0;
  }, frames.raf, frames.caf);
  loop.invalidate();
  for (let i = 0; i < 6; i++) frames.tick();
  assert.equal(rendered, 3);
  assert.equal(frames.pending, 0);
});

test('renderNow replaces a pending frame and dispose cancels everything', () => {
  const frames = fakeFrames();
  let rendered = 0;
  const loop = createRenderLoop(() => { rendered++; return false; }, frames.raf, frames.caf);
  loop.invalidate();
  loop.renderNow();
  assert.equal(rendered, 1);
  assert.equal(frames.pending, 0);
  loop.invalidate();
  loop.dispose();
  assert.equal(frames.pending, 0);
  loop.invalidate(); loop.renderNow(); frames.tick();
  assert.equal(rendered, 1);
});

test('pinned programs survive disposal of every material that used them', () => {
  const programs = [{ usedTimes: 1 }, { usedTimes: 2 }];
  const renderer = { info: { programs } } as unknown as THREE.WebGLRenderer, pinned = new WeakSet<object>();
  pinPrograms(renderer, pinned); pinPrograms(renderer, pinned);
  assert.deepEqual(programs.map(p => p.usedTimes), [2, 3], 'each program is pinned exactly once');
  programs.push({ usedTimes: 1 });
  pinPrograms(renderer, pinned);
  assert.deepEqual(programs.map(p => p.usedTimes), [2, 3, 2]);
});

test('motion check ends damping frames once the camera stops visibly moving', () => {
  const moving = createMotionCheck(), camera = new THREE.PerspectiveCamera(), target = new THREE.Vector3();
  camera.position.set(0, 0, 8000);
  assert.equal(moving(camera, target), true, 'first frame');
  camera.position.x += 50;
  assert.equal(moving(camera, target), true, 'a visible step');
  camera.position.x += 0.1; // 0.1 mm at an 8 m orbit
  assert.equal(moving(camera, target), false);
  camera.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.01);
  assert.equal(moving(camera, target), true, 'a visible turn');
  target.x += 5;
  assert.equal(moving(camera, target), true, 'a pan');
  assert.equal(moving(camera, target), false);
});
