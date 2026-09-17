/** Shared CAD registry: rendering, thumbnails and printing use the same builders. */
import type { PartDefinition } from './types.ts';
import { definitions as structure } from './parts/structure.ts';
import { definitions as attachments } from './parts/attachments.ts';
import { definitions as bars } from './parts/bars-safeties.ts';
import { definitions as voltra } from './parts/voltra.ts';
import { definitions as darko } from './parts/darko.ts';
// Keep the declared builder contract, including its optional logo argument when
// the independent logo stream integrates. Vendor wordmarks are built internally.
export const definitions: PartDefinition[] = [...structure, ...bars, ...attachments, ...voltra, ...darko];
