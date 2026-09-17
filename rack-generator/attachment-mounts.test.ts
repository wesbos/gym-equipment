import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachmentPartIds, getAttachmentDefaults, getAttachmentPlacementInfo, getAttachmentAnchor, getAttachmentCollisionBoxes } from './attachment-mounts.ts';
const near = (a: number, b: number, tolerance = .02) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
test('storage shoulders and single-holder face meet the upright surface rather than its center', () => {
  near(getAttachmentAnchor('storage-pin-short').matingFacePoint[0], -75);
  near(getAttachmentAnchor('storage-pin-long').matingFacePoint[0], -132.5);
  near(getAttachmentAnchor('single-bar-holder').matingFacePoint[0], 34.289625);
  near(getAttachmentAnchor('landmine').matingFacePoint[0], -110);
});
test('actual retaining shafts and cavity planes anchor the large brackets', () => {
  const spotter = getAttachmentAnchor('spotter-arm');
  near(spotter.point[1], -318.41469); near(spotter.point[2], 355);
  assert.deepEqual(spotter.pinAxis, [1, 0, 0]);
  const mono = getAttachmentAnchor('monolift');
  near(mono.point[1], -240.82804); near(mono.point[2], 300.81799);
  near(mono.matingFacePoint[1], -203.32804);
  near(getAttachmentAnchor('dip-horn').matingFacePoint[0], 264.61049);
});
test('multi-bolt patterns preserve measured rack station spacings and handed parts do not auto-pair', () => {
  assert.deepEqual(getAttachmentAnchor('landmine').boltStations.map(s => s.zOffset), [0, 150]);
  assert.deepEqual(getAttachmentAnchor('single-bar-holder').boltStations.map(s => s.zOffset), [0, 100]);
  assert.deepEqual(getAttachmentAnchor('dip-bar-adjustable').boltStations.map(s => s.zOffset), [0, 250, 50, 200]);
  assert.equal(getAttachmentPlacementInfo('dip-bar-adjustable').requiredPitch, 50);
  assert.equal(getAttachmentPlacementInfo('landmine').requiredPitch, 50);
  assert.equal(getAttachmentPlacementInfo('dip-bar-adjustable').paired, false);
  assert.equal(getAttachmentPlacementInfo('dip-horn').paired, false);
});
test('adapters reject resizing the mating cavity and return detached metadata', () => {
  for (const part of attachmentPartIds) {
    const defaults = getAttachmentDefaults(part);
    assert.throws(() => getAttachmentAnchor(part, { width: defaults.width * 1.1 }), /upright fit/);
    assert.throws(() => getAttachmentAnchor(part, { holeDiameter: 16 }), /25 mm/);
    const anchor = getAttachmentAnchor(part, defaults);
    near(anchor.minHoleZ + anchor.maxAbove, defaults.height, .000001);
    assert.equal(Math.hypot(...anchor.outward), 1);
    assert.ok(anchor.boltStations.every(s => s.diameter === 25));
    anchor.point[0] += 100;
    assert.notEqual(getAttachmentAnchor(part).point[0], anchor.point[0]);
  }
});
test('core collision regions remain outside the mounting upright center', () => {
  for (const part of attachmentPartIds) {
    const anchor = getAttachmentAnchor(part), boxes = getAttachmentCollisionBoxes(part);
    assert.ok(boxes.length > 0);
    for (const box of boxes) {
      assert.ok(box.min.every((v, i) => v < box.max[i]));
      const containsPostCenter = anchor.point.every((v, i) => v >= box.min[i] && v <= box.max[i]);
      assert.equal(containsPostCenter, false, `${part} box includes the upright anchor`);
    }
  }
});
