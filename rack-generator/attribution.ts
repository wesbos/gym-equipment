import type { AttributionResolver } from './catalog-contract.ts';
import { systemAttribution } from './system-attribution.ts';
import { vendorAttribution } from './vendor-metadata.ts';

/** Product identity without importing CAD builders into the UI. */
export const partAttribution: AttributionResolver = part =>
  systemAttribution(part) ?? vendorAttribution(part);
