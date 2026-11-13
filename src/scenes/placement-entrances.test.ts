import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PlacementEntrances } from './placement-entrances.ts';

test('new discs enter independently with their hubs, leaving existing plates and authored poses intact', t => {
  let time = 0;
  t.mock.method(performance, 'now', () => time);
  const impacts: number[] = [];
  const entrances = new PlacementEntrances((_kind, side) => impacts.push(side));
  const oldBar = new THREE.Group();
  const plate = (name: string) => Object.assign(new THREE.Object3D(), { name });
  oldBar.add(plate('plate-R-1 20 kg'));
  const newBar = oldBar.clone();
  const right = plate('plate-R-2 15 kg'), hub = plate('plate-R-2 15 kg hub'), left = plate('plate-L-2 15 kg');
  newBar.add(right, hub, left);
  entrances.parts(new Map([['bar', oldBar]]), new Map([['bar', newBar]]));
  entrances.draw(() => {
    assert.equal(newBar.children[0].matrix.elements[12], 0);
    assert.equal(right.matrix.elements[12], 640);
    assert.deepEqual(right.matrix.elements, hub.matrix.elements);
    assert.equal(left.visible, false);
  }, () => {});
  assert.equal(right.matrix.elements[12], 0);
  assert.equal(left.visible, true);
  time = 400;
  entrances.draw(() => assert.ok(left.matrix.elements[12] < 0), () => {});
  assert.deepEqual(impacts, [1]);
  time = 1000;
  assert.equal(entrances.draw(() => {}, () => {}), false);
  assert.deepEqual(impacts, [1, -1]);
});

test('turf falls and settles while its authored position remains available outside rendering', t => {
  let time = 0;
  t.mock.method(performance, 'now', () => time);
  const turf = new THREE.Group(), cues: string[] = [];
  const entrances = new PlacementEntrances(kind => cues.push(kind));
  entrances.turf(turf);
  time = 650;
  entrances.draw(() => {
    turf.updateMatrixWorld(true);
    assert.ok(turf.matrixWorld.elements[13] > 1000);
  }, () => {});
  assert.equal(turf.matrixWorld.elements[13], 0);
  time = 900;
  entrances.draw(() => assert.ok(turf.matrix.elements[13] > 0), () => {});
  time = 1500;
  assert.equal(entrances.draw(() => assert.equal(turf.matrix.elements[13], 0), () => {}), false);
  assert.deepEqual(cues, ['turf']);
});
