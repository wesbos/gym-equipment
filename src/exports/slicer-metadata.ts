import { PRINT_NOZZLE } from '../../rack-generator/print-detail.ts';
/** Bambu 2.8 ignores the project palette for non-Bambu Application strings.
 * This compatibility marker selects its project reader (also understood by Orca).
 * Designer + Description identify BOS STRENGTH as the actual generator.
 * See docs/print-export.md for verified versions and the upstream reader contract.
 */
export const SLICER_APPLICATION = 'BambuStudio-01.09.00.00';
/** Default 0.4 mm nozzle process (#87). A system process name with no
 * `different_settings_to_system` makes both readers' load_external_preset
 * adopt that system preset's values and select it unmodified. If the preset is
 * not installed, they fall back to a project process as before.
 */
export const SLICER_PROCESS = '0.20mm Standard @BBL X1C';
export function slicerPalette(colors: string[]) {
  const each = (value: string) => colors.map(() => value);
  return {
    filament_colour: colors,
    filament_type: each('PLA'),
    filament_settings_id: each('Generic PLA'),
    filament_is_support: each('0'),
    filament_diameter: each('1.75'),
    filament_density: each('1.24'),
    filament_retraction_length: each('nil'),
    filament_long_retractions_when_cut: each('nil'),
    filament_retraction_distances_when_cut: each('nil'),
    filament_minimal_purge_on_wipe_tower: each('15'),
    // Required by the project readers, not an inferred user printer profile.
    // No temperatures, machine G-code, supports or scaling are supplied.
    printer_settings_id: '', print_settings_id: SLICER_PROCESS, nozzle_diameter: [String(PRINT_NOZZLE)],
    printable_height: '256', printable_area: ['0x0','256x0','256x256','0x256'],
  };
}
