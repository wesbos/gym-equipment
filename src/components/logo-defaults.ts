import type { LogoSource } from '../../rack-generator/logos/types.ts';

export const LOGO_DEFAULTS = Object.freeze({
  text: 'MY GYM', font: 'helvetiker' as const, threshold: 128, contrast: 1, bridges: true,
});
export function defaultLogoSource(kind: LogoSource['kind'] = 'text'): LogoSource {
  if (kind === 'svg') return { kind, data: '' };
  if (kind === 'raster') return { kind, data: '', threshold: LOGO_DEFAULTS.threshold, contrast: LOGO_DEFAULTS.contrast };
  return { kind, text: LOGO_DEFAULTS.text, font: LOGO_DEFAULTS.font };
}
export function isDefaultLogoSource(source: LogoSource): boolean {
  return source.kind === 'text' && source.text === LOGO_DEFAULTS.text && source.font === LOGO_DEFAULTS.font;
}
