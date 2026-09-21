import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FIT_FILL, fitFrame, projectedFill } from './fit-frame.ts';

const views: Record<string, [number, number, number]> = { iso: [1, 0.65, 1.2], front: [0, 0, 1], side: [1, 0, 0], top: [0, 1, 0.0001] };
const boxes = {
  rack: new THREE.Box3(new THREE.Vector3(-643, 0, -543), new THREE.Vector3(643, 2032, 543)),
  // Coop: a 13 m square, low room, off the origin.
  coop: new THREE.Box3(new THREE.Vector3(-7522, 0, -607), new THREE.Vector3(5749, 2751, 12657)),
};
const aspects = { phone: 390 / 580, landscape: 750 / 290, tablet: 740 / 1650 };

/** Places a camera from the frame and returns the projected fill and the silhouette centre (NDC). */
function place(box: THREE.Box3, view: [number, number, number], aspect: number) {
  const camera = new THREE.PerspectiveCamera(42, aspect, 1, 1e6), direction = new THREE.Vector3(...view).normalize();
  const tangent = Math.tan(THREE.MathUtils.degToRad(21));
  const { target, distance } = fitFrame(box, direction, tangent * aspect, tangent);
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { fill: projectedFill(box, camera), bounds: { minX, maxX, minY, maxY } };
}

test('fit fills FIT_FILL of the limiting axis, centred, in every view and aspect', () => {
  for (const [name, box] of Object.entries(boxes))
    for (const [viewName, view] of Object.entries(views))
      for (const [aspectName, aspect] of Object.entries(aspects)) {
        const { fill, bounds } = place(box, view, aspect), label = `${name} ${viewName} ${aspectName}`;
        assert.ok(Math.abs(Math.max(fill.x, fill.y) - FIT_FILL) < 1e-6, `${label}: fill ${JSON.stringify(fill)}`);
        assert.ok(fill.x <= FIT_FILL + 1e-6 && fill.y <= FIT_FILL + 1e-6, `${label}: fits`);
        assert.ok(Math.abs(bounds.minX + bounds.maxX) < 1e-6 && Math.abs(bounds.minY + bounds.maxY) < 1e-6, `${label}: centred`);
      }
});

test('a larger box frames from farther away; the target stays near the box centre', () => {
  const direction = new THREE.Vector3(...views.iso).normalize(), t = Math.tan(THREE.MathUtils.degToRad(21));
  const small = fitFrame(boxes.rack, direction, t, t), big = fitFrame(boxes.coop, direction, t, t);
  assert.ok(big.distance > small.distance * 4);
  const center = boxes.coop.getCenter(new THREE.Vector3()), size = boxes.coop.getSize(new THREE.Vector3()).length();
  assert.ok(big.target.distanceTo(center) < size / 4);
});
