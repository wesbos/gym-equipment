/** Semantic roles are assigned by CAD definitions, never inferred by the renderer. */
export type MaterialRole = 'frame' | 'fastener' | 'handle' | 'rod' | 'sleeve' | 'liner' | 'source';
export type HardwareFinish = 'chrome' | 'gold' | 'oxide';
export type FrameFinish = 'paint' | 'stainless' | 'clear-grind';
export const FRAME_FINISHES = {
  paint: { color: '#283e32', metalness: 0.55, roughness: 0.4 },
  stainless: { color: '#c5c9cc', metalness: 1, roughness: 0.24 },
  'clear-grind': { color: '#aaa59a', metalness: 0.92, roughness: 0.38 },
} as const;
export const PAINT_SWATCHES = [
  ['Black', '#17191a'], ['Matte Black', '#242526'], ['Metallic Black', '#353739'],
  ['White', '#eeeeea'], ['Red', '#a9232c'], ['Blue', '#24528a'], ['Green', '#24513c'],
  ['Olive', '#666b43'], ['Army Green', '#454f36'],
] as const;
export interface Appearance {
  frameFinish?: FrameFinish;
  finishOverrides?: Record<string, FrameFinish>;
  frameColor?: string;
  hardwareFinish?: HardwareFinish;
  /** Keys are resolved physical instance IDs, including a paired side suffix. */
  overrides?: Record<string, string>;
}
export interface MaterialSource {
  role: MaterialRole;
  color?: string;
  metalness?: number;
  roughness?: number;
}
export const DEFAULT_FRAME_COLOR = '#283e32';
export const HARDWARE_FINISHES = {
  chrome: { color: '#e8ebee', metalness: 1, roughness: 0.16 },
  gold: { color: '#d6ad52', metalness: 1, roughness: 0.23 },
  oxide: { color: '#242424', metalness: 0.72, roughness: 0.5 },
} as const satisfies Record<HardwareFinish, { color: string; metalness: number; roughness: number }>;
/** Shared by rendering and exports (including future 3MF). Returns detached PBR data. */
export function resolveMaterial(source: MaterialSource, appearance?: Appearance, instanceId?: string): { color: string; metalness: number; roughness: number; finish?: Exclude<FrameFinish, 'paint'> } {
  if (source.role === 'fastener') return { ...HARDWARE_FINISHES[appearance?.hardwareFinish ?? 'chrome'] };
  if (source.role === 'frame') {
    const overrideColor = instanceId ? appearance?.overrides?.[instanceId] : undefined;
    const finish = (instanceId ? appearance?.finishOverrides?.[instanceId] : undefined)
      ?? (overrideColor ? 'paint' : appearance?.frameFinish ?? 'paint');
    if (finish !== 'paint') return { ...FRAME_FINISHES[finish], finish };
  }
  return {
    color: source.role === 'frame'
      ? (instanceId ? appearance?.overrides?.[instanceId] : undefined) ?? appearance?.frameColor ?? DEFAULT_FRAME_COLOR
      : source.color ?? DEFAULT_FRAME_COLOR,
    metalness: source.metalness ?? 0.55,
    roughness: source.roughness ?? 0.4,
  };
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const color = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export function validateAppearance(input: unknown): Appearance | undefined {
  if (input === undefined) return undefined;
  if (!record(input)) throw Error('Appearance must be an object.');
  const result: Appearance = {};
  if (input.frameFinish !== undefined) {
    if (typeof input.frameFinish !== 'string' || !Object.hasOwn(FRAME_FINISHES, input.frameFinish)) throw Error('Unknown frame finish.');
    result.frameFinish = input.frameFinish as FrameFinish;
  }
  if (input.finishOverrides !== undefined) {
    if (!record(input.finishOverrides) || Object.keys(input.finishOverrides).length > 500) throw Error('Invalid finish overrides.');
    result.finishOverrides = {};
    for (const [id, value] of Object.entries(input.finishOverrides)) {
      if (!/^[a-z][a-z0-9:-]{0,159}$/.test(id) || ['constructor', 'prototype', '__proto__'].includes(id) || typeof value !== 'string' || !Object.hasOwn(FRAME_FINISHES, value)) throw Error('Invalid physical instance finish override.');
      result.finishOverrides[id] = value as FrameFinish;
    }
  }
  if (input.frameColor !== undefined) {
    if (!color(input.frameColor)) throw Error('Frame color must be a six-digit hex color.');
    result.frameColor = input.frameColor;
  }
  if (input.hardwareFinish !== undefined) {
    if (typeof input.hardwareFinish !== 'string' || !Object.hasOwn(HARDWARE_FINISHES, input.hardwareFinish)) throw Error('Unknown hardware finish.');
    result.hardwareFinish = input.hardwareFinish as HardwareFinish;
  }
  if (input.overrides !== undefined) {
    if (!record(input.overrides) || Object.keys(input.overrides).length > 500) throw Error('Invalid appearance overrides.');
    result.overrides = {};
    for (const [id, value] of Object.entries(input.overrides)) {
      if (!/^[a-z][a-z0-9:-]{0,159}$/.test(id) || ['constructor', 'prototype', '__proto__'].includes(id) || !color(value)) throw Error('Invalid physical instance color override.');
      result.overrides[id] = value;
    }
  }
  return result;
}
