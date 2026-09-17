/** Shared CAD registry: rendering, thumbnails and printing use the same builders. */
import { definitions as structure } from './parts/structure.ts';
import { definitions as attachments } from './parts/attachments.ts';
import { definitions as bars } from './parts/bars-safeties.ts';
export const definitions = [...structure, ...bars, ...attachments];
