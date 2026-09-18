import type { NumericParams } from './types.ts';
/** Build-time print detail (#89). NumericParams carry numbers only, so the 3MF
 * exporter injects `printMinFeature`: the narrowest printable cut feature in
 * source millimetres, 2 × nozzle × scale denominator (8 mm at 1:10 = 0.8 mm
 * printed). Absent or 0 is the full on-screen/GLB detail; any positive value is
 * the simplified print build. Builders never see it outside the print export.
 */
export const PRINT_NOZZLE = 0.4;
export const printMinFeature = (scale: number) => 2 * PRINT_NOZZLE * scale;
export const minFeature = (p: NumericParams) => Math.max(0, p.printMinFeature ?? 0);
