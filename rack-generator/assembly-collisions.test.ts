import type { CollisionInstance, Vec3, UprightId, Face } from './types.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCollisions } from './assembly-collisions.ts';

const mount = (uprightId: UprightId = 'front-left', hole = 10, face: Face = 'front') => ({ uprightId, hole, face });
const accessory = (id: string, changes: Partial<CollisionInstance> = {}): CollisionInstance => ({ id, part: 'custom', kind: 'accessory',
  position: [0, 0, 0], rotation: [0, 0, 0], ...changes });
const bounds = (min: Vec3, max: Vec3) => ({ collisionBoxes: [{ min, max }] });

test('same rack hole reports a slot conflict even on opposite faces', () => {
  const result = detectCollisions([
    accessory('hook', { part: 'j-hook-standard', mount: mount() }),
    accessory('safety', { part: 'safety-box', mount: mount('front-left', 10, 'back') }),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].ids, ['hook', 'safety']);
  assert.match(result[0].message, /mounting hole 11 on front-left/);
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
  assert.match(result[0].message, /overlap/);
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
    accessory('frame', { part: 'upright', kind: 'structure', ...bounds([-100, -100, -100], [100, 100, 300]) }),
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
  assert.deepEqual(detectCollisions([{ id: 'incomplete', kind: 'accessory' }]), []);
});

test('accessory payloads collide with frame beams but frame joins stay quiet', () => {
  const beam = accessory('beam', { part: 'crossmember-1075', kind: 'structure', params: { length: 1075 } });
  const warnings = detectCollisions([
    beam, accessory('dip', bounds([-30, -50, 60], [30, 50, 100])),
  ]);
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0].ids, ['dip', 'beam']);
  assert.deepEqual(detectCollisions([
    beam, accessory('joined-beam', { ...beam, id: 'joined-beam', rotation: [0, 0, Math.PI / 2] }),
  ]), []);
  assert.deepEqual(detectCollisions([
    beam, accessory('flange-contact', bounds([525, -15, 60], [550, 15, 100])),
  ]), []);
});

test('long foot envelopes preserve air below its elevated tube and cover the toe', () => {
  const foot = accessory('foot', { part: 'foot-800', params: { length: 800 } });
  assert.deepEqual(detectCollisions([
    foot, accessory('under-leg', bounds([-20, -220, 10], [20, -180, 30])),
  ]), []);
  for (const obstruction of [bounds([-20, -220, 100], [20, -180, 130]), bounds([-40, 390, 0], [40, 405, 12])]) {
    assert.equal(detectCollisions([foot, accessory('obstacle', obstruction)]).length, 1);
  }
});

test('offset crossmember preserves central recess instead of using one broad box', () => {
  const offset = accessory('offset', { part: 'offset-crossmember', kind: 'structure', params: { length: 1225, offset: 193.5 } });
  assert.deepEqual(detectCollisions([
    offset, accessory('recess', bounds([-20, -10, 60], [20, 10, 90])),
  ]), []);
  assert.equal(detectCollisions([
    offset, accessory('beam-hit', bounds([-20, -135, 60], [20, -115, 90])),
  ]).length, 1);
});

test('nameplate, branded panel, and angled beam each have body coverage', () => {
  for (const [part, kind, obstruction] of [
    ['nameplate', 'accessory', bounds([-20, -10, 100], [20, 10, 120])],
    ['branded-crossmember', 'structure', bounds([-20, -10, 100], [20, 10, 120])],
    ['angled-crossmember', 'structure', bounds([-20, -10, 165], [20, 10, 180])],
  ] satisfies [string, 'accessory' | 'structure', ReturnType<typeof bounds>][]) {
    assert.equal(detectCollisions([
      accessory('part', { part, kind, params: { length: part === 'angled-crossmember' ? 425 : 1075 } }),
      accessory('obstacle', obstruction),
    ]).length, 1, part);
  }
});

test('all eight additional attachment bodies detect a real payload obstruction', () => {
  // Points are on source-measured arm, sleeve, hook or peg regions, away from
  // the mounting cavity. This also exercises metadata without an override.
  for (const [part, point] of [
    ['spotter-arm', [0, 150, 150]],
    ['dip-horn', [-200, 230, 45]],
    ['dip-bar-adjustable', [175, 100, 270]],
    ['landmine', [100, 4, 95]],
    ['monolift', [8, 150, 40]],
    ['single-bar-holder', [-90, 0, 100]],
    ['storage-pin-short', [100, 0, 40]],
    ['storage-pin-long', [180, 0, 40]],
  ] satisfies [string, Vec3][]) {
    const obstruction = bounds(point.map(v => v - 5) as Vec3, point.map(v => v + 5) as Vec3);
    assert.equal(detectCollisions([accessory('part', { part }), accessory('obstacle', obstruction)]).length, 1, part);
  }
});

test('storage peg mounting cavity and space between dip handles stay clear', () => {
  assert.deepEqual(detectCollisions([
    accessory('peg', { part: 'storage-pin-short' }),
    accessory('mount-contact', bounds([-140, -15, 30], [-100, 15, 50])),
  ]), []);
  assert.deepEqual(detectCollisions([
    accessory('dip', { part: 'dip-horn' }),
    accessory('between-handles', bounds([-180, -30, 30], [-100, 30, 55])),
  ]), []);
});

test('rotated storage peg can interfere with a frame beam', () => {
  const warnings = detectCollisions([
    accessory('beam', { part: 'crossmember-725', kind: 'structure', params: { length: 725 } }),
    accessory('peg', { part: 'storage-pin-long', position: [0, -100, 35], rotation: [0, 0, Math.PI / 2] }),
  ]);
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0].ids, ['peg', 'beam']);
});
