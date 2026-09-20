/** VOLTRA accessories and rack-mounted cable systems (#136): Manifold builders for the entries in ../rack-parts/rack-digital-cable.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `rackDefinition(PART, build)` per entry. */
import type { PartDefinition } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { BEYOND_POWER_ADAPTIVE_BAR_MOUNT, BEYOND_POWER_FIXED_BAR_MOUNT, BEYOND_POWER_ROTATOR, BEYOND_POWER_STRAP_MOUNT, BULLETPROOF_ISOLATOR, BULLETPROOF_VTS, DARKO_QUICKMOUNT } from '../rack-parts/rack-digital-cable.ts';
import { buildIsolator, buildVts } from './rack-digital-cable-bpf.ts';
import { REP_PLATE_LAT, REP_SELECTORIZED_LAT } from '../rack-parts/rack-digital-cable-trainers.ts';
import { buildRepPlateLat, buildRepSelectorizedLat } from './rack-digital-cable-trainers.ts';
import { buildAdaptiveBarMount, buildFixedBarMount, buildQuickMount, buildRotator, buildStrapMount } from './rack-digital-cable-voltra.ts';
export const definitions: PartDefinition[] = [
  rackDefinition(DARKO_QUICKMOUNT, buildQuickMount),
  rackDefinition(BEYOND_POWER_ADAPTIVE_BAR_MOUNT, buildAdaptiveBarMount),
  rackDefinition(BULLETPROOF_VTS, buildVts),
  rackDefinition(BEYOND_POWER_STRAP_MOUNT, buildStrapMount),
  rackDefinition(BULLETPROOF_ISOLATOR, buildIsolator),
  rackDefinition(BEYOND_POWER_ROTATOR, buildRotator),
  rackDefinition(BEYOND_POWER_FIXED_BAR_MOUNT, buildFixedBarMount),
  // Rack-system cable machines (#178): rack-parts/rack-digital-cable-trainers.ts.
  rackDefinition(REP_SELECTORIZED_LAT, buildRepSelectorizedLat),
  rackDefinition(REP_PLATE_LAT, buildRepPlateLat),
];
