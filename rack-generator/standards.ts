import { gridProfile } from './profiles.ts';
import { snapDimensions } from './grid.ts';
import type { RackDimensions, StandardOption } from './types.ts';

/** Imperial labels are rounded only for display; stored millimetres are never rounded. */
export function millimetreOption(value: number): StandardOption {
  const inches = Number((value / 25.4).toFixed(3));
  return { value, label: `${inches}″ / ${value} mm` };
}
export const GENERIC_SPAN_OPTIONS = [425, 725, 1075].map(millimetreOption);
export const UPRIGHT_HEIGHT_OPTIONS = [72, 80, 93, 108].map(inches => ({
  value: Number((inches * 25.4).toFixed(4)), label: `${inches}″ / ${Number((inches * 25.4).toFixed(4))} mm`,
}));
/** Do not advertise vendor sizes on the generic source lattice. */
export function dimensionOptions(rack: RackDimensions, key: 'height' | 'width' | 'depth', profileId?: string): StandardOption[] {
  const profile = gridProfile(profileId);
  const values = key === 'height' ? (profile.heights ?? UPRIGHT_HEIGHT_OPTIONS.map(o => o.value)) : key === 'width' ? profile.widths : profile.depths;
  return values.filter(value => Math.abs(snapDimensions(rack, { [key]: value }, profileId)[key] - value) < 1e-6).map(millimetreOption);
}
