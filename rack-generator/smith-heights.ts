import { SYSTEM_DEFAULTS } from "./system-types.ts";
import type { NumericParams } from "./types.ts";
export const SMITH_BAR_MIN = 396;
// Reconstructed carriage extends90 mm below its datum; the safety pad extends45
// above its datum.150 mm retains clearance for the tilted local bar offset too.
export const SMITH_SAFETY_GAP = 150;
export const SMITH_SAFETY_MIN = SMITH_BAR_MIN - SMITH_SAFETY_GAP;
export function smithHeightControls(p: NumericParams, rackHeight: number) {
  const barMin = Math.max(SMITH_BAR_MIN, p.safetyHeight + SMITH_SAFETY_GAP);
  const safetyMax = p.barHeight - SMITH_SAFETY_GAP;
  return {
    barMin,
    barMax: rackHeight < 2200 ? 1721 : 2029,
    safetyMin: SMITH_SAFETY_MIN,
    safetyMax,
    barDefault: Math.max(SYSTEM_DEFAULTS["smith-rep"].barHeight, barMin),
    safetyDefault: Math.min(
      SYSTEM_DEFAULTS["smith-rep"].safetyHeight,
      safetyMax,
    ),
  };
}
