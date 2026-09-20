import type { NumericParams } from './types.ts';

/** Rack-crossing shafts, not plate bores, heads, washers or articulation pivots.
 * Hook tube diameters are exact CAD values. Other source profile envelopes are
 * rounded UP to 0.1 mm; changing holeDiameter only drills their plate bores and
 * does not resize these shafts. These checks establish geometric clearance only.
 */
export const SOURCE_MOUNT_SHAFTS: Readonly<Record<string, number>> = Object.freeze({
  'j-hook-standard': 15.7674,
  'j-hook-roller': 15.7668,
  'j-hook-sandwich': 15.766,
  // solid.319 transverse profile at Y-318.4/Z355: ~15.99 mm.
  'spotter-arm': 16,
  // bolts-and-metal-plates 110 mm section: ~16.008 mm.
  'dip-horn': 16.1,
  // Bolts.003 upper tube: 16.2228 mm (lower tube: 16.0372).
  'dip-bar-adjustable': 16.3,
  // body.001 90 mm rack studs: ~15.895 mm.
  landmine: 15.9,
  // bolts.020 rear retaining section: ~16.006 mm.
  monolift: 16.1,
  // bolts.022 105 mm shafts: ~15.952 mm.
  'single-bar-holder': 16,
  // solid.040/.042 revolved threaded sections: radii 8.126/8.137 mm.
  'storage-pin-short': 16.3,
  'storage-pin-long': 16.3,
  // saddle() builds a fixed 16 mm pin, independent of holeDiameter.
  'offset-crossmember': 16,
  'safety-box': 16,
  'safety-webbing': 16,
});

/** `fitPin`: the rack's pin class when the built-in is fitted to a non-75 mm upright (mount-fit.ts, #162); the
 * pin-and-pipe safety keeps an explicit saved pinDiameter. */
export function validateMountShaft(part: string, params: NumericParams, bore: number, fitPin?: number): void {
  const diameter = part === 'safety-pin-pipe' ? params.pinDiameter ?? fitPin ?? 16 : fitPin !== undefined && SOURCE_MOUNT_SHAFTS[part] !== undefined ? fitPin : SOURCE_MOUNT_SHAFTS[part];
  if (diameter !== undefined && diameter > bore) {
    throw new Error(`${part} retaining pin/bolt diameter ${diameter} mm exceeds the rack bore ${bore} mm.`);
  }
}
