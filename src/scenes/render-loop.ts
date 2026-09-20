import type * as THREE from 'three';

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
