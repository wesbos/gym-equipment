import { gridProfile } from './profiles.ts';
import type { RackDimensions } from './types.ts';
/** Reference clear spans; nearest wins, with exact ties going to the smaller value. */
export const GENERIC_SPANS = [425, 725, 1075] as const;
export function nearest(value: number, catalog: readonly number[]): number {
  if (!Number.isFinite(value)) throw new Error('Dimension must be finite.');
  return [...catalog].sort((a, b) => Math.abs(a - value) - Math.abs(b - value) || a - b)[0];
}
/** Preserve the source 80-inch cut length; cutting height is independent of hole phase.
 * Each 50 mm increment retains its safe 17 mm top-center clearance. */
export function snapDimensions(rack: RackDimensions, patch: Partial<RackDimensions>, profileId?: string): RackDimensions {
  const result = { ...rack, ...patch }, profile = gridProfile(profileId);
  for (const key of ['width', 'depth'] as const) if (patch[key] !== undefined) result[key] = nearest(patch[key], key === 'width' ? profile.widths : profile.depths);
  if (patch.height !== undefined) {
    const heights = profile.heights ?? Array.from({ length: 80 }, (_, i) => 2032 + (i - 21) * rack.pitch).filter(h => h >= 1000 && h <= 4000);
    result.height = nearest(patch.height, heights);
  }
  return result;
}
/** Keyboard/numeric-control adapter: move directly to the adjacent valid value. */
export function stepDimension(rack: RackDimensions, key: 'width' | 'depth' | 'height', value: number, direction: -1 | 1, profileId?: string): number {
  const profile = gridProfile(profileId);
  const catalog = key === 'height' ? (profile.heights ?? Array.from({length:80},(_,i) => 2032+(i-21)*rack.pitch).filter(h => h>=1000 && h<=4000)) : key === 'width' ? profile.widths : profile.depths;
  const ordered = [...catalog].sort((a,b)=>a-b);
  return direction === 1 ? ordered.find(n => n > value+1e-6) ?? ordered.at(-1)! : [...ordered].reverse().find(n => n < value-1e-6) ?? ordered[0];
}
