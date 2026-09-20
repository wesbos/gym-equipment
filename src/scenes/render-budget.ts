/** What the builder can afford to draw on this device. Desktop keeps the long-standing defaults. */
export interface RenderBudget {
  /** Cap for `renderer.setPixelRatio`. */
  pixelRatio: number;
  /** Key-light shadow map edge in texels. */
  shadowMapSize: number;
  /** MSAA on the default framebuffer. Kept on touch devices: tile-based mobile GPUs resolve MSAA on-chip, which
   * is far cheaper than buying the same edge quality with a higher pixel ratio. */
  antialias: boolean;
  /** Phone or tablet budget in effect. */
  mobile: boolean;
}

export interface RenderEnvironment {
  devicePixelRatio: number;
  /** `(pointer: coarse)`: the primary input is a finger. */
  coarsePointer: boolean;
  /** Screen size in CSS pixels. */
  screenWidth: number;
  screenHeight: number;
  /** `navigator.deviceMemory` (GiB, Chromium only). */
  deviceMemory?: number;
}

/** Short side under this is a phone or small tablet, whatever its pointer claims. */
const SMALL_SCREEN = 600;

export function renderBudget(env: RenderEnvironment): RenderBudget {
  const dpr = Math.max(1, env.devicePixelRatio || 1);
  const mobile = env.coarsePointer || Math.min(env.screenWidth, env.screenHeight) < SMALL_SCREEN;
  if (!mobile) return { pixelRatio: Math.min(dpr, 2), shadowMapSize: 2048, antialias: true, mobile: false };
  // Phones are 3x and tablets 2x: 1.5x plus MSAA is sharp at arm's length for a third to a quarter of the fill.
  const lowMemory = env.deviceMemory !== undefined && env.deviceMemory <= 2;
  return { pixelRatio: Math.min(dpr, lowMemory ? 1.25 : 1.5), shadowMapSize: 1024, antialias: true, mobile: true };
}

export function currentRenderEnvironment(): RenderEnvironment {
  return {
    devicePixelRatio: globalThis.devicePixelRatio ?? 1,
    coarsePointer: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
    screenWidth: globalThis.screen?.width ?? 1920,
    screenHeight: globalThis.screen?.height ?? 1080,
    deviceMemory: (globalThis.navigator as { deviceMemory?: number } | undefined)?.deviceMemory,
  };
}

/** Fog tuned for a ~12 m orbit. Beyond that, scale it with the orbit so a fitted large room (a 13 m gym on a
 * portrait phone fits from ~50 m) is not lost in fog; closer orbits keep the original fade exactly. */
export function fogRange(orbitDistance: number): [near: number, far: number] {
  const scale = Math.max(1, orbitDistance / 12000);
  return [18000 * scale, 42000 * scale];
}
