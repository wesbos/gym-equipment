/** Parts gallery model (#183): the whole builder catalog as flat, searchable items, plus the pure filtering, search,
 * rack-fit, recents/favourites and grid-layout logic the gallery UI renders. No React and no geometry, so every
 * function here is unit tested (src/components/part-gallery.test.ts) and cheap enough to run per keystroke. */
import type { NumericParams, PartId, RackDimensions, Face } from '../../../rack-generator/types.ts';
import { SYSTEM_PARTS, SYSTEM_NAMES, isSystemPart } from '../../../rack-generator/system-types.ts';
import { FLOOR_PARTS, floorPart, floorOptions, resolveBy, type FloorParam } from '../../../rack-generator/floor-registry.ts';
import { WALL_PARTS, wallPart, wallFace } from '../../../rack-generator/wall-registry.ts';
import { HANG_PARTS, hangPart } from '../../../rack-generator/hang-registry.ts';
import { RACK_PARTS, rackPart, rackTargets, rackBuildParams, rackHoles, rackPlacementFor, PIN_1IN, PIN_5_8IN } from '../../../rack-generator/rack-registry.ts';
import { rackContextParams } from '../../../rack-generator/rack-mounts.ts';
import { FLOOR_SECTIONS, WALL_SECTIONS, HANG_SECTIONS, RACK_SECTIONS, DEFAULT_FLOOR_SECTION, DEFAULT_WALL_SECTION, DEFAULT_HANG_SECTION, DEFAULT_RACK_SECTION, sectionGroups } from '../../../rack-generator/catalog-sections.ts';
import { VOLTRA_IDS, DARKO_IDS } from '../../../rack-generator/vendor-metadata.ts';
import { partAttribution } from '../../../rack-generator/attribution.ts';
import { getPartPlacementInfo } from '../../../rack-generator/assembly.ts';

/** Catalog sections in builder order (the order the old sidebar listed them; the inspector's variant lists use it). */
export const CATALOG_SECTIONS: readonly (readonly [string, readonly PartId[]])[] = [
  ['Systems', SYSTEM_PARTS],
  // Floor, wall and hang parts group under their registry `section` (catalog-sections.ts).
  ...sectionGroups(FLOOR_PARTS, FLOOR_SECTIONS, DEFAULT_FLOOR_SECTION),
  ...sectionGroups(WALL_PARTS, WALL_SECTIONS, DEFAULT_WALL_SECTION),
  ...sectionGroups(HANG_PARTS, HANG_SECTIONS, DEFAULT_HANG_SECTION),
  // Brand rack attachments group under their rack-registry `section`; the built-in VOLTRA mounts lead "Digital & cable".
  ...sectionGroups<PartId>([...VOLTRA_IDS.map(id => ({ id, section: 'Digital & cable' })), ...RACK_PARTS], RACK_SECTIONS, DEFAULT_RACK_SECTION),
  ['Darko Lifting', DARKO_IDS],
  ['Frame', ['upright', 'crossmember-425', 'crossmember-725', 'crossmember-1075', 'angled-crossmember', 'offset-crossmember']],
  ['Bracing & nameplates', ['branded-crossmember', 'branded-crossmember-lite', 'nameplate', 'foot-400', 'foot-800']],
  ['Pull-up bars', ['pullup-straight', 'pullup-multigrip', 'pullup-sphere']],
  ['J-hooks & monolifts', ['j-hook-standard', 'j-hook-roller', 'j-hook-sandwich', 'monolift']],
  ['Safeties', ['safety-box', 'safety-pin-pipe', 'safety-webbing', 'spotter-arm']],
  ['Training attachments', ['dip-horn', 'dip-bar-adjustable', 'landmine']],
  ['Rack storage', ['single-bar-holder', 'storage-pin-short', 'storage-pin-long']],
];
export const CATALOG_PART_IDS: readonly PartId[] = CATALOG_SECTIONS.flatMap(([, ids]) => ids);

/** Top-level gallery categories and the sections they hold, in display order. A section not listed here (a new
 * registry section) becomes its own category after these, so new catalog families never need a gallery edit. */
export const GALLERY_CATEGORIES: readonly { label: string; sections: readonly string[] }[] = [
  { label: 'Racks & systems', sections: ['Systems', 'Frame', 'Bracing & nameplates'] },
  { label: 'Rack attachments', sections: ['J-hooks & monolifts', 'Safeties', 'Pull-up bars', 'Training attachments', 'Rack storage', ...RACK_SECTIONS, DEFAULT_RACK_SECTION, 'Darko Lifting'] },
  { label: 'Barbells', sections: ['Barbells'] },
  { label: 'Plates', sections: ['Plates'] },
  { label: 'Benches', sections: ['Benches'] },
  { label: 'Dumbbells', sections: ['Dumbbells'] },
  { label: 'Kettlebells', sections: ['Kettlebells'] },
  { label: 'Machines', sections: ['Machines'] },
  { label: 'Cardio', sections: ['Cardio'] },
  { label: 'Strongman', sections: ['Strongman'] },
  { label: 'Storage', sections: ['Floor storage', 'Wall storage'] },
  { label: 'Cable attachments', sections: ['Cable attachments'] },
  { label: 'Accessories', sections: ['Accessories', 'Hanging accessories'] },
];

export type GalleryKind = 'system' | 'structure' | 'rack' | 'floor' | 'wall' | 'hang';
export interface GalleryItem {
  id: PartId; name: string; brand: string; brandKey: string; section: string; category: string; kind: GalleryKind;
  /** Short spec line for the card (key dimensions), computed lazily. */ readonly spec: string;
  pairable: boolean; draggable: boolean; description?: string;
  /** Catalog order, the tie-break for every sort. */ order: number;
  /** Normalised name, brand, section, category and id (see normalize). */ haystack: string;
}
/** The worker's catalog entry fields the gallery reads (a structural subset of CatalogPart). */
export interface GalleryDefinition { id: string; name: string; defaults: NumericParams; description?: string }

const HOUSE_BRAND = 'BOS STRENGTH';
/** One chip per maker: "IronMaster" = "Ironmaster", "PRIME Fitness USA" = "PRIME Fitness", "DIY (lumber build)" = "DIY". */
export function brandKey(vendor: string): string {
  return vendor.replace(/\(.*?\)/g, ' ').replace(/\b(inc|usa|llc|co)\.?$/i, ' ').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase() || vendor.toLowerCase();
}
export const brandLabel = (vendor: string) => vendor.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+(Inc\.?|USA)$/i, '').trim() || vendor;
const prettyId = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replaceAll('-', ' ');
const mm = (n: number) => `${Math.round(n)}`;
export const pinLabel = (pin: number) => pin <= PIN_5_8IN + 0.01 ? '5/8″' : pin <= PIN_1IN + 0.01 ? '1″' : `${mm(pin)} mm`;

/** Card blurb for the cable systems (the old sidebar's system hint). */
export function systemHint(id: string) {
  return id === 'cable-kraken' ? 'Hydra / Manticore · supported 4/6-post bay' : id.includes('ares') ? 'REP · 6-post or anchored PR-5000 16″ bay' : 'REP · supported 4/6-post bay';
}
const TARGET_NAMES: Record<string, string> = { upright: 'upright hole', 'crossmember-top': 'crossmember top', 'crossmember-under': 'under a rail', 'spotter-arm': 'spotter arm', 'pull-up-bar': 'pull-up bar' };
const optionCount = (params: readonly FloorParam[], defaults: NumericParams) => params.reduce((n, p) => n * Math.max(1, floorOptions(p, defaults).length), 1);

function kindOf(id: PartId, section: string): GalleryKind {
  if (isSystemPart(id)) return 'system';
  if (floorPart(id)) return 'floor';
  if (wallPart(id)) return 'wall';
  if (hangPart(id)) return 'hang';
  return section === 'Frame' || (section === 'Bracing & nameplates' && !id.startsWith('foot-')) ? 'structure' : 'rack';
}
/** Card spec line: the dimensions that tell two similar products apart. */
export function specLine(id: PartId, definition?: GalleryDefinition): string {
  if (isSystemPart(id)) return systemHint(id);
  const floor = floorPart(id);
  if (floor) {
    const box = resolveBy(floor.footprint, floor.defaults), options = optionCount(floor.params, floor.defaults);
    return `${mm(box.width)} × ${mm(box.depth)} mm${options > 1 ? ` · ${options} options` : ''}`;
  }
  const wall = wallPart(id);
  if (wall) { const face = wallFace(wall, wall.defaults); return `${mm(face.width)} × ${mm(face.height)} mm wall face`; }
  const hang = hangPart(id);
  if (hang) return `${mm(hang.envelope.width)} mm wide · ${mm(hang.envelope.above + hang.envelope.drop)} mm tall`;
  const rack = rackPart(id);
  if (rack) {
    const params = rackBuildParams(rack), pin = resolveBy(rack.mount.pin, params);
    return `${pinLabel(pin)} pin · ${rackTargets(rack).map(t => TARGET_NAMES[t]).join(' / ')}${rack.pair ? ' · pair' : ''}`;
  }
  const dims = Object.entries(definition?.defaults ?? {}).filter(([key]) => ['height', 'length', 'width', 'diameter', 'depth'].includes(key)).slice(0, 2);
  return dims.length ? dims.map(([key, value]) => `${key} ${mm(value)} mm`).join(' · ') : 'BOS STRENGTH rack part';
}

/** Every catalog part as a gallery item. Names come from the worker definitions once they load (built-in names live
 * there); registry parts use their catalog title until then. */
export function buildGalleryItems(definitions: readonly GalleryDefinition[] = []): GalleryItem[] {
  const byId = new Map(definitions.map(d => [d.id, d]));
  const categoryOf = new Map(GALLERY_CATEGORIES.flatMap(c => c.sections.map(s => [s, c.label] as const)));
  const items: GalleryItem[] = [];
  for (const [section, ids] of CATALOG_SECTIONS) for (const id of ids) {
    const definition = byId.get(id), registry = floorPart(id) ?? wallPart(id) ?? hangPart(id) ?? rackPart(id);
    const name = (definition?.name ?? registry?.title ?? (isSystemPart(id) ? SYSTEM_NAMES[id] : prettyId(id))).replace(/^BOS STRENGTH\s*/, '') || id;
    const vendor = partAttribution(id)?.vendor ?? HOUSE_BRAND, category = categoryOf.get(section) ?? section, kind = kindOf(id, section);
    const info = kind === 'rack' || kind === 'structure' ? getPartPlacementInfo(id) : null;
    const pairable = kind === 'floor' ? !!floorPart(id)?.pair : kind === 'rack' ? !!info?.paired : false;
    const draggable = kind !== 'system' && id !== 'upright' && !info?.slots?.length;
    const brand = brandLabel(vendor);
    // `spec` is computed on first read: some footprints (bars with sleeve geometry) cost milliseconds each, and only
    // the ~30 mounted cards ever need theirs.
    let spec: string | undefined;
    items.push({ id, name, brand, brandKey: brandKey(vendor), section, category, kind, get spec() { return spec ??= specLine(id, definition); }, pairable, draggable,
      description: definition?.description ?? registry?.description, order: items.length,
      haystack: normalize(`${name} ${brand} ${vendor} ${section} ${category} ${id}`) });
  }
  return items;
}

/** Nav tree: categories in display order with their non-empty sections and counts. */
export interface CategoryNode { label: string; count: number; sections: { label: string; count: number }[] }
export function categoryTree(items: readonly GalleryItem[]): CategoryNode[] {
  const order = [...GALLERY_CATEGORIES.map(c => c.label), ...new Set(items.map(i => i.category))];
  return [...new Set(order)].map(label => {
    const inCategory = items.filter(i => i.category === label);
    const listed = GALLERY_CATEGORIES.find(c => c.label === label)?.sections ?? [];
    const sections = [...new Set([...listed, ...inCategory.map(i => i.section)])]
      .map(s => ({ label: s, count: inCategory.filter(i => i.section === s).length })).filter(s => s.count);
    return { label, count: inCategory.length, sections };
  }).filter(c => c.count);
}
/** Items of one category in its section display order (sections stay contiguous for the grouped grid). */
function inScopeOrder(items: readonly GalleryItem[], category: string) {
  const sections = GALLERY_CATEGORIES.find(c => c.label === category)?.sections ?? [];
  const rank = (s: string) => { const i = sections.indexOf(s); return i < 0 ? sections.length : i; };
  return items.filter(i => i.category === category).sort((a, b) => rank(a.section) - rank(b.section) || a.order - b.order);
}

/** Where the gallery is looking: everything, recents, favourites, one category, or one section of a category. */
export type GalleryScope = { kind: 'all' } | { kind: 'recent' } | { kind: 'favourites' } | { kind: 'category'; category: string; section?: string };
export interface GalleryFilter { scope: GalleryScope; query: string; brands: readonly string[]; fitsOnly: boolean }
export interface FilterContext { recent: readonly string[]; favourites: readonly string[]; fit?: (id: PartId) => RackFit | null }

/** Lowercase, with hyphens and slashes as spaces, so "j-hook" finds "J hook" and "J-Hook" alike. */
export const normalize = (text: string) => text.toLowerCase().replace(/[-‐–/_·]+/g, ' ');
export const searchTokens = (query: string) => normalize(query).split(/\s+/).filter(Boolean);
/** Relevance of an item for the query tokens, or 0 when any token is missing. Name prefixes beat word prefixes beat
 * substrings; brand beats section. */
export function searchScore(item: GalleryItem, tokens: readonly string[]): number {
  if (!tokens.length) return 1;
  const name = normalize(item.name), brand = normalize(item.brand), meta = normalize(`${item.section} ${item.category}`);
  let score = 0;
  for (const token of tokens) {
    if (!item.haystack.includes(token)) return 0;
    if (name.startsWith(token)) score += 8;
    else if (new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) score += 5;
    else if (name.includes(token)) score += 3;
    else if (brand.includes(token)) score += 2;
    else if (meta.includes(token)) score += 1;
    else score += 0.5;
  }
  return score;
}
/** Items in scope, before search, brand and fit filters (and in the scope's own order). */
export function scopeItems(items: readonly GalleryItem[], scope: GalleryScope, ctx: Pick<FilterContext, 'recent' | 'favourites'>): GalleryItem[] {
  const byId = new Map(items.map(i => [i.id as string, i]));
  if (scope.kind === 'recent') return ctx.recent.flatMap(id => byId.get(id) ?? []);
  if (scope.kind === 'favourites') return ctx.favourites.flatMap(id => byId.get(id) ?? []);
  if (scope.kind === 'category') return inScopeOrder(items, scope.category).filter(i => !scope.section || i.section === scope.section);
  const categories = categoryTree(items).map(c => c.label);
  return categories.flatMap(c => inScopeOrder(items, c));
}
/** Scope, then fit, brand and search filters. A query ranks results by relevance; otherwise scope order is kept. */
export function filterItems(items: readonly GalleryItem[], filter: GalleryFilter, ctx: FilterContext): GalleryItem[] {
  const tokens = searchTokens(filter.query), brands = new Set(filter.brands);
  const scored = scopeItems(items, filter.scope, ctx)
    .filter(i => !filter.fitsOnly || ctx.fit?.(i.id)?.fits !== false)
    .filter(i => !brands.size || brands.has(i.brandKey))
    .map((item, rank) => ({ item, rank, score: searchScore(item, tokens) }))
    .filter(r => r.score > 0);
  if (tokens.length) scored.sort((a, b) => b.score - a.score || a.rank - b.rank);
  return scored.map(r => r.item);
}
/** Brand chips for a result set: one per maker, most parts first. */
export function brandFacets(items: readonly GalleryItem[]): { key: string; label: string; count: number }[] {
  const facets = new Map<string, { key: string; label: string; count: number }>();
  for (const item of items) {
    const facet = facets.get(item.brandKey);
    if (facet) facet.count++; else facets.set(item.brandKey, { key: item.brandKey, label: item.brand, count: 1 });
  }
  return [...facets.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** "Fits my rack" for registry rack attachments: the part's autoFit params on this rack must pass the bore check and
 * its own fit rules on at least one allowed face (what placement would check first). Null for parts without fit rules
 * (floor, wall and hang items, and the built-in BOS, Darko and VOLTRA mounts, which adapt to every profile). */
export interface RackFit { fits: boolean; reason?: string }
export function rackFit(id: string, rack: RackDimensions): RackFit | null {
  const part = rackPart(id);
  // Hosted parts (on a spotter arm or pull-up bar) fit wherever their host does.
  if (!part || rackTargets(part).every(t => t === 'spotter-arm' || t === 'pull-up-bar')) return null;
  const params = { ...part.defaults, ...(part.autoFit?.(rack) ?? {}) };
  const tubeDepth = rack.tubeDepth ?? rack.tube;
  // Nominal stand-ins for the placement context (span to the facing post, v2 rack context), so fit rules that need
  // them judge the tube, bore and pitch rather than a missing target.
  // 'normal' spans cross the rack from a side face (its width) or run front to back from a front/back face (its depth).
  const spanFor = (face: Face) => {
    const frontBack = face === 'front' || face === 'back', width = rack.width + rack.tube, depth = rack.depth + tubeDepth;
    return part.mount.span === 'normal' ? (frontBack ? depth : width) : part.mount.span === 'across' ? (frontBack ? width : depth) : undefined;
  };
  const extra = { holeHeight: rackPlacementFor(part, params).height ?? 1000, rackWidth: rack.width, rackDepth: rack.depth, rackHeight: rack.height, acrossOut: 1 };
  let reason = '';
  const faces = part.mount.faces?.length ? part.mount.faces : ['front', 'left'] as Face[];
  for (const face of faces) {
    try {
      const context = rackContextParams(part, params, rack, false, face, spanFor(face), extra);
      const pin = resolveBy(part.mount.pin, context);
      if (pin > rack.holeDiameter) throw Error(`Needs ${pinLabel(pin)} hardware; your rack has ${mm(rack.holeDiameter)} mm holes.`);
      part.mount.validate?.(rack, context);
      return { fits: true };
    } catch (error) { reason ||= error instanceof Error ? error.message : String(error); }
  }
  return { fits: false, reason: reason || 'Does not fit this rack.' };
}
/** Fit lookups memoised per rack, so filtering on every keystroke never re-runs fit rules. */
export function rackFitCache(rack: RackDimensions) {
  const cache = new Map<string, RackFit | null>();
  return (id: string) => { if (!cache.has(id)) cache.set(id, rackFit(id, rack)); return cache.get(id)!; };
}
export const rackSummary = (rack: RackDimensions) => `${mm(rack.tube)}${rack.tubeDepth && rack.tubeDepth !== rack.tube ? ` × ${mm(rack.tubeDepth)}` : ''} mm tube · ${mm(rack.holeDiameter)} mm holes · ${mm(rack.pitch)} mm pitch`;

/** Detail pane rows: key dimensions and mount facts. */
export function detailRows(item: GalleryItem, definition?: GalleryDefinition): [string, string][] {
  const rows: [string, string][] = [];
  const floor = floorPart(item.id), wall = wallPart(item.id), hang = hangPart(item.id), rack = rackPart(item.id);
  if (floor) {
    const box = resolveBy(floor.footprint, floor.defaults);
    rows.push(['Footprint', `${mm(box.width)} × ${mm(box.depth)} mm`]);
    if (floor.clearance) { const c = resolveBy(floor.clearance, floor.defaults); rows.push(['Use area', `${mm(c.width)} × ${mm(c.depth)} mm`]); }
    if (floor.pair) rows.push(['Pair', `Matching pair, ${mm(floor.pair.gap)} mm apart`]);
    if (floor.parks) rows.push(['Storage', 'Parks in rack bar cradles']);
    for (const p of floor.params.slice(0, 4)) rows.push([p.label, `${floorOptions(p, floor.defaults).length} options · ${(p.format ?? String)(floor.defaults[p.key])}`]);
  } else if (wall) {
    const face = wallFace(wall, wall.defaults);
    rows.push(['Wall face', `${mm(face.width)} × ${mm(face.height)} mm`], ['Depth', `${mm(wall.depth)} mm off the wall`]);
    const slots = wall.slots?.(wall.defaults).length;
    if (slots) rows.push(['Hook slots', String(slots)]);
    for (const p of wall.params.slice(0, 3)) rows.push([p.label, `${floorOptions(p, wall.defaults).length} options`]);
  } else if (hang) {
    rows.push(['Envelope', `${mm(hang.envelope.width)} mm wide · ${mm(hang.envelope.above)} mm above · ${mm(hang.envelope.drop)} mm drop`], ['Mount', 'Hangs from a pegboard or rack hook']);
  } else if (rack) {
    const params = rackBuildParams(rack);
    rows.push(['Mounts on', rackTargets(rack).map(t => TARGET_NAMES[t]).join(' or ')], ['Hardware', `${pinLabel(resolveBy(rack.mount.pin, params))} pin`]);
    const holes = rackHoles(rack, params);
    if (holes.length > 1) rows.push(['Bolt pattern', `${holes.length} holes`]);
    rows.push(['Faces', (rack.mount.faces ?? ['front', 'back', 'left', 'right']).join(', ')]);
    if (rack.pair) rows.push(['Pair', rack.pair.default ? 'Adds a matching pair' : 'Single, pair optional']);
    for (const p of rack.params.slice(0, 3)) rows.push([p.label, `${floorOptions(p, rack.defaults).length} options`]);
  } else if (isSystemPart(item.id)) {
    rows.push(['Installs', systemHint(item.id)]);
  } else {
    for (const [key, value] of Object.entries(definition?.defaults ?? {}).slice(0, 5)) rows.push([prettyId(key.replace(/([A-Z])/g, ' $1').toLowerCase()), `${Math.round(value * 10) / 10}${/count|holes|sides/i.test(key) ? '' : ' mm'}`]);
    if (item.pairable) rows.push(['Pair', 'Adds a matching pair']);
  }
  return rows;
}

/** Recents and favourites, persisted per browser (localStorage, never required). */
export interface GalleryPrefs { recent: string[]; favourites: string[] }
export const PREFS_KEY = 'bos-strength-part-gallery-v1', RECENT_LIMIT = 12;
export const pushRecent = (list: readonly string[], id: string, limit = RECENT_LIMIT) => [id, ...list.filter(x => x !== id)].slice(0, limit);
export const toggleFavourite = (list: readonly string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [id, ...list];
/** Tolerant parse: junk, unknown ids and duplicates are dropped rather than breaking the gallery. */
export function parsePrefs(raw: string | null | undefined, known: (id: string) => boolean = () => true): GalleryPrefs {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  const list = (value: unknown, limit: number) => Array.isArray(value) ? [...new Set(value.filter((x): x is string => typeof x === 'string' && known(x)))].slice(0, limit) : [];
  const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  return { recent: list(record.recent, RECENT_LIMIT), favourites: list(record.favourites, 200) };
}
export function loadPrefs(storage: Pick<Storage, 'getItem'> | undefined, known?: (id: string) => boolean): GalleryPrefs {
  try { return parsePrefs(storage?.getItem(PREFS_KEY), known); } catch { return { recent: [], favourites: [] }; }
}
export function savePrefs(storage: Pick<Storage, 'setItem'> | undefined, prefs: GalleryPrefs) {
  try { storage?.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode or full storage: prefs stay in memory */ }
}

/** Windowed grid layout: section header rows and card rows with pixel offsets, for virtualised rendering and
 * arrow-key movement. `grouped` inserts a header wherever the section changes. */
export type GridRow = { kind: 'header'; label: string; count: number; top: number; height: number } | { kind: 'cards'; start: number; end: number; top: number; height: number };
export interface GridLayout { rows: GridRow[]; height: number; columns: number; rowOf: number[] }
export function gridLayout(items: readonly Pick<GalleryItem, 'section' | 'category'>[], columns: number, opts: { grouped: boolean; rowHeight: number; headerHeight: number; gap: number }): GridLayout {
  const cols = Math.max(1, Math.floor(columns)), rows: GridRow[] = [], rowOf: number[] = [];
  let top = 0, i = 0;
  while (i < items.length) {
    let end = items.length;
    if (opts.grouped) {
      const section = items[i].section;
      end = i; while (end < items.length && items[end].section === section) end++;
      const label = items[i].category === section ? section : `${items[i].category} · ${section}`;
      rows.push({ kind: 'header', label, count: end - i, top, height: opts.headerHeight }); top += opts.headerHeight;
    }
    for (let start = i; start < end; start += cols) {
      const stop = Math.min(end, start + cols);
      for (let k = start; k < stop; k++) rowOf[k] = rows.length;
      rows.push({ kind: 'cards', start, end: stop, top, height: opts.rowHeight }); top += opts.rowHeight + opts.gap;
    }
    i = end;
  }
  return { rows, height: top, columns: cols, rowOf };
}
/** Rows intersecting [scrollTop, scrollTop + viewport], plus `overscan` rows either side. */
export function visibleRows(layout: GridLayout, scrollTop: number, viewport: number, overscan = 2): [number, number] {
  const { rows } = layout;
  if (!rows.length) return [0, -1];
  let lo = 0, hi = rows.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (rows[mid].top + rows[mid].height < scrollTop) lo = mid + 1; else hi = mid; }
  let last = lo;
  while (last < rows.length - 1 && rows[last + 1].top < scrollTop + viewport) last++;
  return [Math.max(0, lo - overscan), Math.min(rows.length - 1, last + overscan)];
}
/** Arrow/Home/End/Page keys in the grid: left/right step through items; up/down keep the column across rows and
 * section breaks. Returns the new index (unchanged at the edges), or null for keys the grid does not handle. */
export function moveIndex(layout: GridLayout, index: number, key: string, pageRows = 3): number | null {
  const count = layout.rowOf.length;
  if (!count) return null;
  const clamp = (n: number) => Math.max(0, Math.min(count - 1, n));
  if (key === 'ArrowRight') return clamp(index + 1);
  if (key === 'ArrowLeft') return clamp(index - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const steps = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : key === 'PageDown' ? pageRows : key === 'PageUp' ? -pageRows : 0;
  if (!steps) return null;
  const row = layout.rows[layout.rowOf[clamp(index)]];
  if (row.kind !== 'cards') return index;
  const column = clamp(index) - row.start;
  let r = layout.rowOf[clamp(index)], moved = 0, target: GridRow = row;
  while (moved < Math.abs(steps)) {
    let next = r + Math.sign(steps);
    while (next >= 0 && next < layout.rows.length && layout.rows[next].kind !== 'cards') next += Math.sign(steps);
    if (next < 0 || next >= layout.rows.length) break;
    r = next; target = layout.rows[r]; moved++;
  }
  if (target === row) return index;
  const cards = target as Extract<GridRow, { kind: 'cards' }>;
  return Math.min(cards.end - 1, cards.start + column);
}
