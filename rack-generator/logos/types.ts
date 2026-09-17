import type { Vec2 } from '../types.ts';
export type LogoSource = { kind: 'text'; text: string; font: 'helvetiker' | 'helvetikerRegular' } | { kind: 'svg'; data: string } | { kind: 'raster'; data: string; threshold: number; contrast: number };
/** Millimetres in a 180 × 24 reference area. Explicitly closed, bridged cut loops. */
export interface ValidatedLogo { version: 1; source: LogoSource; loops: Vec2[][]; minimum: number; bridges: number; warnings: string[] }
export const LOGO_LIMITS = { source: 350_000, points: 6000, loops: 128, minimum: .8 } as const;
export const logoSite = (part: string) => ['nameplate', 'branded-crossmember', 'branded-crossmember-lite'].includes(part);
/** Cheap bounded document validation. Workers additionally recheck topology and features. */
export function validateLogo(input: unknown): ValidatedLogo | undefined {
  if (input === undefined) return undefined;
  const bad = (): never => { throw Error('Invalid logo data. Reimport and validate the source in Custom logo.'); };
  if (!input || typeof input !== 'object') return bad();
  const logo = input as ValidatedLogo;
  if (logo.version !== 1 || logo.minimum !== LOGO_LIMITS.minimum || !Number.isInteger(logo.bridges) || logo.bridges < 0 || logo.bridges > 128) return bad();
  const s = logo.source;
  if (!s || !['text', 'svg', 'raster'].includes(s.kind)) return bad();
  if (s.kind === 'text') {
    if (typeof s.text !== 'string' || !s.text.trim() || s.text.length > 32 || !['helvetiker', 'helvetikerRegular'].includes(s.font)) return bad();
  } else {
    if (typeof s.data !== 'string' || s.data.length > LOGO_LIMITS.source) return bad();
    if (s.kind === 'raster' && (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s.data) || !Number.isFinite(s.threshold) || s.threshold < 0 || s.threshold > 255 || !Number.isFinite(s.contrast) || s.contrast < .5 || s.contrast > 3)) return bad();
  }
  if (!Array.isArray(logo.warnings) || logo.warnings.length > 8 || logo.warnings.some(w => typeof w !== 'string' || w.length > 300)) return bad();
  if (!Array.isArray(logo.loops) || !logo.loops.length || logo.loops.length > LOGO_LIMITS.loops) return bad();
  let count = 0;
  for (const loop of logo.loops) {
    if (!Array.isArray(loop) || loop.length < 4 || (count += loop.length) > LOGO_LIMITS.points) return bad();
    for (const p of loop) if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 90.001 || Math.abs(p[1]) > 12.001) return bad();
    if (loop[0][0] !== loop.at(-1)![0] || loop[0][1] !== loop.at(-1)![1]) return bad();
  }
  return structuredClone(logo);
}
