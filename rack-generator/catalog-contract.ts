import type { PartDefinition } from './types.ts';
/** Compatible with the vendor stream's vendorAttribution(partId) result. */
export interface VendorAttribution {
  vendor: string;
  url: string;
  credit: string;
  trademark: string;
  reconstruction: string;
}
export type AttributionResolver = (partId: string) => VendorAttribution | undefined;
export interface CADCatalog {
  definitions: readonly PartDefinition[];
  /** Register vendorAttribution here when vendor CAD modules join the registry. */
  attribution?: AttributionResolver;
}
