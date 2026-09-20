/** Display identity for the inspector header, action bar and toasts: name, maker, catalog section and credit link.
 * Static registry data resolved once per part (names from the worker definitions once they load). */
import { CATALOG_SECTIONS, brandLabel } from '../PartGallery/gallery-model.ts';
import { creditOf } from '../VendorControls.tsx';
import { floorPart } from '../../../rack-generator/floor-registry.ts';
import { wallPart } from '../../../rack-generator/wall-registry.ts';
import { hangPart } from '../../../rack-generator/hang-registry.ts';
import { rackPart } from '../../../rack-generator/rack-registry.ts';
import { isSystemPart, SYSTEM_NAMES } from '../../../rack-generator/system-types.ts';

export interface PartMeta { name: string; brand: string; section: string | null; url: string | null; trademark: string | null }
const sectionOf = new Map<string, string>(CATALOG_SECTIONS.flatMap(([section, ids]) => ids.map(id => [id as string, section] as const)));
const cache = new Map<string, PartMeta>();
const pretty = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replaceAll('-', ' ');
export const cleanName = (name: string) => name.replace(/^BOS STRENGTH\s*/, '');

export function partMeta(part: string, definitions?: readonly { id: string; name: string }[]): PartMeta {
  const defined = definitions?.find(d => d.id === part)?.name;
  const key = `${part}\u0000${defined ?? ''}`;
  let meta = cache.get(key);
  if (!meta) {
    const registry = floorPart(part) ?? wallPart(part) ?? hangPart(part) ?? rackPart(part);
    const name = cleanName(defined ?? registry?.name ?? (isSystemPart(part) ? SYSTEM_NAMES[part] : pretty(part))) || part;
    const credit = creditOf(part);
    meta = { name, brand: credit ? brandLabel(credit.vendor) : 'BOS STRENGTH', section: sectionOf.get(part) ?? null, url: credit?.url ?? null, trademark: credit?.trademark ?? null };
    cache.set(key, meta);
  }
  return meta;
}
