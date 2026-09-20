import * as THREE from 'three';

export interface RenderLoop {
  /** Schedule one frame (coalesced). Call after anything visible changes. */
  invalidate(): void;
  /** Render synchronously now, e.g. right after a resize cleared the canvas. */
  renderNow(): void;
  dispose(): void;
}

/**
 * On-demand rendering: nothing runs while the scene is idle. `frame` renders once and returns true
 * while it needs another frame (damping, an animation). Invalidations made during a frame schedule
 * the next one.
 */
export function createRenderLoop(
  frame: () => boolean,
  raf: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  caf: (id: number) => void = cancelAnimationFrame,
): RenderLoop {
  let id = 0, disposed = false;
  const run = () => {
    id = 0;
    if (!disposed && frame()) invalidate();
  };
  function invalidate() {
    if (!id && !disposed) id = raf(run);
  }
  return {
    invalidate,
    renderNow() {
      if (disposed) return;
      if (id) { caf(id); id = 0; }
      run();
    },
    dispose() {
      disposed = true;
      if (id) caf(id);
      id = 0;
    },
  };
}

/**
 * Damped orbits decay geometrically, and OrbitControls keeps reporting motion until it is below its EPS in scene
 * units squared (mm² here): seconds of frames after a flick that nobody can see. This says whether the camera moved
 * more than `tolerance` of its orbit radius (or radians) since the last call: 1e-4 is about 0.1 px on a phone.
 */
export function createMotionCheck(tolerance = 1e-4) {
  const position = new THREE.Vector3(), target = new THREE.Vector3(), quaternion = new THREE.Quaternion();
  let primed = false;
  return (camera: THREE.Camera, focus: THREE.Vector3) => {
    const reach = Math.max(1e-6, camera.position.distanceTo(focus)) * tolerance;
    const moving = !primed || camera.position.distanceTo(position) > reach || focus.distanceTo(target) > reach || camera.quaternion.angleTo(quaternion) > tolerance;
    position.copy(camera.position); target.copy(focus); quaternion.copy(camera.quaternion); primed = true;
    return moving;
  };
}

/**
 * Keep every linked shader program for the renderer's lifetime. three.js deletes a program when the
 * last material using it is disposed; the builder replaces instance, ghost and highlight materials on
 * every edit, so without this each edit relinked the same shaders (getUniforms/getProgramInfoLog
 * stalls mid-drag). Programs are keyed by material variant, not colour, so the set stays small and
 * is freed with the context.
 */
export function pinPrograms(renderer: THREE.WebGLRenderer, pinned: WeakSet<object>) {
  for (const program of renderer.info.programs ?? []) {
    if (pinned.has(program)) continue;
    pinned.add(program);
    program.usedTimes++;
  }
}
