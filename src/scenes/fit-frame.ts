import * as THREE from 'three';

/** Share of the uncovered canvas the framed content spans along its limiting axis (#215). */
export const FIT_FILL = 0.88;

export interface FitFrame {
  /** Orbit target: on the view axis, as close to the content centre as the centring allows. */
  target: THREE.Vector3;
  /** Camera distance from `target` along `direction`. */
  distance: number;
}

/**
 * Tight perspective framing of a box (#215): the smallest camera distance along `direction` at which every corner
 * projects inside `fill` of the view's half-angle tangents, with the camera shifted sideways so the projected box is
 * centred (a perspective box's centre does not project to the centre of its silhouette).
 *
 * For one screen axis with corner offsets `x_i` (along the axis) and `w_i` (towards the camera), a lateral shift `a` and
 * distance `D` fit when `|x_i - a| <= t (D - w_i)` for every corner. A shift exists iff, for every pair,
 * `D >= (x_i - x_j) / 2t + (w_i + w_j) / 2`, so the minimum distance is the largest pair bound over both axes; the
 * shift is then the one in the feasible interval that centres the silhouette.
 */
export function fitFrame(box: THREE.Box3, direction: THREE.Vector3, tangentX: number, tangentY: number, fill = FIT_FILL): FitFrame {
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const d = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), d).normalize();
  const up = new THREE.Vector3().crossVectors(d, right).normalize();
  const corners: { x: number; y: number; w: number }[] = [];
  const corner = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    corner.set((i & 1 ? 0.5 : -0.5) * size.x, (i & 2 ? 0.5 : -0.5) * size.y, (i & 4 ? 0.5 : -0.5) * size.z);
    corners.push({ x: corner.dot(right), y: corner.dot(up), w: corner.dot(d) });
  }
  const tx = tangentX * fill, ty = tangentY * fill;
  // Keep the nearest corner a little in front of the camera even for a degenerate (flat, face-on) box.
  let distance = Math.max(1, ...corners.map(c => c.w + 1));
  for (const i of corners)
    for (const j of corners)
      distance = Math.max(distance, (i.x - j.x) / (2 * tx) + (i.w + j.w) / 2, (i.y - j.y) / (2 * ty) + (i.w + j.w) / 2);
  const shift = (axis: 'x' | 'y', t: number) => {
    let low = -Infinity, high = Infinity;
    for (const c of corners) {
      low = Math.max(low, c[axis] - t * (distance - c.w));
      high = Math.min(high, c[axis] + t * (distance - c.w));
    }
    // Any shift in [low, high] fits; centre the silhouette: max + min of the projected offsets falls as the shift grows.
    const balance = (a: number) => {
      let min = Infinity, max = -Infinity;
      for (const c of corners) { const s = (c[axis] - a) / (distance - c.w); min = Math.min(min, s); max = Math.max(max, s); }
      return min + max;
    };
    for (let i = 0; i < 50 && high - low > 1e-9 * (1 + Math.abs(low)); i++) {
      const mid = (low + high) / 2;
      if (balance(mid) > 0) low = mid; else high = mid;
    }
    return (low + high) / 2;
  };
  const target = center.addScaledVector(right, shift('x', tx)).addScaledVector(up, shift('y', ty));
  return { target, distance };
}

/** Share of the whole canvas that `box` spans on screen, per axis (1 = edge to edge; tests, diagnostics). */
export function projectedFill(box: THREE.Box3, camera: THREE.PerspectiveCamera): { x: number; y: number } {
  const view = camera.matrixWorldInverse, tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const p = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(view);
    const x = p.x / -p.z, y = p.y / -p.z;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { x: (maxX - minX) / (2 * tangent * camera.aspect), y: (maxY - minY) / (2 * tangent) };
}
