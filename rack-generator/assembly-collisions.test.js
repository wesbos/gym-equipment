import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCollisions } from './assembly-collisions.js';

const mount = (uprightId = 'front-left', hole = 10, face = 'front') => ({ uprightId, hole, face });
const accessory = (id, changes = {}) => ({ id, part: 'custom', kind: 'accessory',
  position: [0, 0, 0], rotation: [0, 0, 0], ...changes });
const bounds = (min, max) => ({ collisionBoxes: [{ min, max }] });

test('same rack hole reports a slot conflict even on opposite faces', () => {
  const result = detectCollisions([
    accessory('hook', { part: 'j-hook-standard', mount: mount() }),
    accessory('safety', { part: 'safety-box', mount: mount('front-left', 10, 'back') }),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].ids, ['hook', 'safety']);
  assert.match(result[0].message, /mounting hole 10 on front-left/);
});

test('a safety span checks both of its upright mounting points', () => {
  const result = detectCollisions([
    accessory('span', { mounts: [mount('front-left', 8), mount('rear-left', 8)] }),
    accessory('hook', { mount: mount('rear-left', 8) }),
  ]);
  assert.equal(result.length, 1);
});

test('hook cup can overlap a safety beam while occupying a different hole', () => {
  const result = detectCollisions([
    accessory('hook', { part: 'j-hook-standard', mount: mount('front-left', 10) }),
    accessory('safety', { part: 'safety-box', params: { length: 1075 },
      rotation: [0, 0, Math.PI / 2], position: [0, 400, 20], mount: mount('front-left', 9) }),
  ]);
  assert.equal(result.length, 1);
  assert.match(result[0].message, /overlapping working bodies/);
});

test('different-height accessories and paired accessories on distant posts are clear', () => {
  assert.deepEqual(detectCollisions([
    accessory('pair:left', { ownerId: 'pair', part: 'j-hook-standard', mount: mount('front-left', 10) }),
    accessory('pair:right', { ownerId: 'pair', part: 'j-hook-standard', position: [1000, 0, 0], mount: mount('front-right', 10) }),
    accessory('upper', { part: 'j-hook-standard', position: [0, 0, 300], mount: mount('front-left', 16) }),
  ]), []);
});

test('intended structural joins and mounting collars do not generate warnings', () => {
  assert.deepEqual(detectCollisions([
    accessory('frame', { kind: 'structure', ...bounds([-100, -100, -100], [100, 100, 300]) }),
    accessory('hook', { part: 'j-hook-standard' }),
    accessory('collar-only', bounds([-30, -130, 130], [30, -60, 190])),
  ]), []);
});

test('touching faces and penetrations within 2 mm are ignored', () => {
  assert.deepEqual(detectCollisions([
    accessory('a', bounds([0, 0, 0], [20, 20, 20])),
    accessory('b', bounds([18.5, 0, 0], [38.5, 20, 20])),
  ]), []);
});

test('oriented boxes avoid false positives from broad world bounds', () => {
  const long = bounds([-200, -5, 0], [200, 5, 20]);
  assert.deepEqual(detectCollisions([
    accessory('a', { ...long, rotation: [0, 0, Math.PI / 4] }),
    accessory('b', { ...long, rotation: [0, 0, Math.PI / 4], position: [-15, 15, 0] }),
  ]), []);
  assert.equal(detectCollisions([
    accessory('a', { ...long, rotation: [0, 0, Math.PI / 4] }),
    accessory('b', { ...long, rotation: [0, 0, -Math.PI / 4] }),
  ]).length, 1);
});

test('sagging strap preserves empty space above its centre', () => {
  assert.deepEqual(detectCollisions([
    accessory('strap', { part: 'safety-webbing' }),
    accessory('clear', bounds([-25, -15, 30], [25, 15, 45])),
  ]), []);
  assert.equal(detectCollisions([
    accessory('strap', { part: 'safety-webbing' }),
    accessory('obstruction', bounds([-25, -15, 0], [25, 15, 8])),
  ]).length, 1);
});

test('pull-up collision envelopes cover the bars without filling the grip opening', () => {
  const pullup = accessory('pullup', { part: 'pullup-multigrip' });
  assert.deepEqual(detectCollisions([
    pullup, accessory('opening', bounds([-20, -15, 72], [20, 15, 88])),
  ]), []);
  assert.equal(detectCollisions([
    pullup, accessory('on-bar', bounds([-20, -90, 72], [20, -80, 88])),
  ]).length, 1);
});

test('invalid boxes are ignored and repeated input IDs produce no duplicate warning', () => {
  const a = accessory('a', { mount: mount() }), b = accessory('b', { mount: mount(), ...bounds([0, 0, NaN], [1, 1, 1]) });
  assert.equal(detectCollisions([a, b, b, null]).length, 1);
  assert.deepEqual(detectCollisions(null), []);
});
