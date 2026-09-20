import test from 'node:test';
import assert from 'node:assert/strict';
import { TouchTracker, TOUCH_SLOP, TAP_MAX_MS, choosePick, pickOffsets } from './touch-input.ts';

const at = (pointerId: number, clientX: number, clientY: number) => ({ pointerId, clientX, clientY });

test('a short still touch is a tap', () => {
  const t = new TouchTracker();
  t.down(at(1, 100, 100), 0);
  t.move(at(1, 103, 102));
  assert.deepEqual(t.up(at(1, 103, 102), 120), { tap: true, primary: true, remaining: 0 });
});

test('an orbit, a pinch or a long hold is never a tap', () => {
  const t = new TouchTracker();
  t.down(at(1, 100, 100), 0);
  assert.equal(t.move(at(1, 100 + TOUCH_SLOP + 1, 100)), true);
  t.move(at(1, 101, 100)); // back near the start: still an orbit
  assert.equal(t.up(at(1, 101, 100), 100).tap, false);

  t.down(at(2, 100, 100), 0); t.down(at(3, 200, 100), 10);
  assert.equal(t.count, 2);
  assert.equal(t.up(at(3, 200, 100), 50).tap, false);
  assert.equal(t.up(at(2, 100, 100), 60).tap, false);

  t.down(at(4, 100, 100), 0);
  assert.equal(t.up(at(4, 100, 100), TAP_MAX_MS + 1).tap, false);
});

test('pick offsets probe the centre first, then rings', () => {
  const offsets = pickOffsets(20);
  assert.deepEqual(offsets[0], [0, 0, 0]);
  assert.equal(offsets.length, 25);
  assert.ok(offsets.every(([x, y, r]) => Math.abs(Math.hypot(x, y) - r) < 1e-9));
});

test('small parts near the finger beat a large part under it', () => {
  assert.equal(choosePick([{ item: 'upright', distance: 0, screenSize: 400 }, { item: 'j-hook', distance: 11, screenSize: 30 }]), 'j-hook');
  assert.equal(choosePick([{ item: 'upright', distance: 0, screenSize: 400 }]), 'upright');
  assert.equal(choosePick([{ item: 'bench', distance: 0, screenSize: 120 }, { item: 'pin', distance: 22, screenSize: 20 }]), 'bench');
  // A mid-sized neighbour never steals a tap that landed on a part.
  assert.equal(choosePick([{ item: 'rower', distance: 0, screenSize: 300 }, { item: 'crossmember', distance: 5, screenSize: 90 }]), 'rower');
  // Nothing under the finger: the nearest part, small ones first.
  assert.equal(choosePick([{ item: 'upright', distance: 11, screenSize: 300 }, { item: 'bench', distance: 22, screenSize: 150 }]), 'upright');
  assert.equal(choosePick([]), null);
});
