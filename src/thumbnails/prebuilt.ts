import type { NumericParams } from '../../rack-generator/types.ts';
import manifest from './manifest.json';
import { thumbnailKey } from './queue.ts';

/** Canonical `thumbnailKey` → content-hashed WebP in public/thumbnails/ (null: geometry can't build). `npm run thumbnails`. */
export const prebuiltManifest: Readonly<Record<string, string | null>> = manifest;
const base = `${import.meta.env?.BASE_URL ?? '/'}thumbnails/`;
let byPart: Map<string, string | null> | undefined;

/** URL of the build-time image, null when the part is known not to build, undefined when the live pipeline must render.
 *  Empty params mean catalog defaults (the worker merges them), so rows can show images before definitions load. */
export function prebuiltThumbnail(part: string, params: NumericParams = {}, key = thumbnailKey({ part, params })): string | null | undefined {
  let file: string | null | undefined = prebuiltManifest[key];
  if (file === undefined && !Object.keys(params).length) {
    byPart ??= new Map(Object.entries(prebuiltManifest).map(([key, value]) => [JSON.parse(key)[0] as string, value]));
    file = byPart.get(part);
  }
  return file === undefined ? undefined : file && base + file;
}
