/** Shared CAD registry: rendering, thumbnails and printing use the same builders. */
import { definitions as structure } from './parts/structure.ts';
import { definitions as attachments } from './parts/attachments.ts';
import { definitions as bars } from './parts/bars-safeties.ts';
import { definitions as floor } from './parts/nighthawk.ts';
export const definitions = [...structure, ...bars, ...attachments, ...floor];

import type { CADCatalog } from './catalog-contract.ts';
/** Vendor/system streams extend this shared registry, not individual workers. */
export const catalog: CADCatalog = { definitions };
