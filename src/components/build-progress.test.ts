import test from 'node:test';
import assert from 'node:assert/strict';
import { progressLabel, replacesScene } from './BuildProgress/build-progress-model.ts';

test('the loading indicator counts models, then says the parts are being placed (#218)', () => {
  assert.equal(progressLabel(null), 'Loading…');
  assert.equal(progressLabel({ done: 0, total: 0 }), 'Loading…');
  assert.equal(progressLabel({ done: 3, total: 40 }), 'Loading models · 3 of 40');
  assert.equal(progressLabel({ done: 40, total: 40 }), 'Placing parts…');
});

test('a mostly new design dims the canvas; a part or two loading while editing does not', () => {
  assert.equal(replacesScene(null, true), true, 'first build');
  assert.equal(replacesScene({ total: 30, parts: 40 }, false), true, 'a gallery gym replacing the rack');
  assert.equal(replacesScene({ total: 1, parts: 40 }, false), false, 'one new attachment');
  assert.equal(replacesScene({ total: 2, parts: 3 }, false), false, 'tiny batches never dim');
  assert.equal(replacesScene(null, false), false);
});
