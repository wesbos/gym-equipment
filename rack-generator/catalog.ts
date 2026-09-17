import { definitions as cables } from './parts/cable-systems.ts';
import { definitions as smith } from './parts/smith.ts';
/** Shared CAD registry: rendering, thumbnails and printing use the same builders. */
import { definitions as structure } from './parts/structure.ts';
import { definitions as attachments } from './parts/attachments.ts';
import { definitions as bars } from './parts/bars-safeties.ts';
export const definitions = [...structure, ...bars, ...attachments, ...cables, ...smith];

import type { CADCatalog } from './catalog-contract.ts';
/** Vendor/system streams extend this shared registry, not individual workers. */
export const catalog: CADCatalog = { definitions };
