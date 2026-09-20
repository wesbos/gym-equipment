/** Gallery UI state outside the builder store: whether the gallery is open (plus the view it reopens on) and the
 * per-browser recents/favourites. Tiny external stores, so opening the gallery or starring a part never re-renders
 * the builder page, and the builder store's frequent patches (drags, proposals) never re-render the gallery. */
import { useSyncExternalStore } from 'react';
import type { BuilderSnapshot, BuilderStore } from '../../state/builder-store.ts';
import type { PartId, RackDimensions } from '../../../rack-generator/types.ts';
import { buildGalleryItems, loadPrefs, savePrefs, pushRecent, rackFitCache, toggleFavourite, CATALOG_PART_IDS, type GalleryDefinition, type GalleryItem, type GalleryPrefs, type GalleryScope, type RackFit } from './gallery-model.ts';

type Listener = () => void;
export function createAtom<T>(initial: () => T) {
  let value: T | undefined, ready = false;
  const listeners = new Set<Listener>();
  const get = () => { if (!ready) { value = initial(); ready = true; } return value as T; };
  return {
    get,
    set(next: T) { value = next; ready = true; listeners.forEach(fn => fn()); },
    subscribe(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}

export interface GalleryView { open: boolean; scope: GalleryScope; query: string; brands: readonly string[]; fitsOnly: boolean }
export const galleryView = createAtom<GalleryView>(() => ({ open: false, scope: { kind: 'all' }, query: '', brands: [], fitsOnly: false }));
let returnFocus: HTMLElement | null = null;
/** Opens the gallery on all parts (or the given scope and query), with fresh brand chips; only the "fits my rack"
 * choice carries over from the last visit. */
export function openGallery(options: { scope?: GalleryScope; query?: string } = {}) {
  const view = galleryView.get();
  if (view.open) return;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  galleryView.set({ ...view, open: true, scope: options.scope ?? { kind: 'all' }, query: options.query ?? '', brands: [] });
}
/** Closes the gallery and returns focus to whatever opened it (unless `restoreFocus` is false). */
export function closeGallery(state: Partial<Omit<GalleryView, 'open'>> = {}, restoreFocus = true) {
  const view = galleryView.get();
  if (!view.open) return;
  galleryView.set({ ...view, ...state, open: false });
  const target = returnFocus;
  returnFocus = null;
  if (restoreFocus && target?.isConnected) target.focus({ preventScroll: true });
}
export const useGalleryOpen = () => useSyncExternalStore(galleryView.subscribe, () => galleryView.get().open);

const storage = () => { try { return window.localStorage; } catch { return undefined; } };
const known = new Set<string>(CATALOG_PART_IDS);
export const galleryPrefs = createAtom<GalleryPrefs>(() => loadPrefs(storage(), id => known.has(id)));
function updatePrefs(update: (prefs: GalleryPrefs) => GalleryPrefs) {
  const next = update(galleryPrefs.get());
  galleryPrefs.set(next);
  savePrefs(storage(), next);
}
export const recordRecent = (id: string) => { if (galleryPrefs.get().recent[0] !== id) updatePrefs(p => ({ ...p, recent: pushRecent(p.recent, id) })); };
export const toggleFavouritePart = (id: string) => updatePrefs(p => ({ ...p, favourites: toggleFavourite(p.favourites, id) }));
export const useGalleryPrefs = () => useSyncExternalStore(galleryPrefs.subscribe, galleryPrefs.get);

/** Starts the builder's normal placement flow for a part from the gallery: `pair`/`single` override the part's default
 * pairing (the same state the sidebar's "Add matching pair" toggle sets). A part already being placed is re-staged
 * rather than placed (a sidebar card's second click places it; a gallery pick never should). */
export function addPart(store: BuilderStore, id: PartId, mode: 'default' | 'single' | 'pair' = 'default') {
  recordRecent(id);
  const current = store.getSnapshot();
  if (current.placing?.part === id || current.structureChoice === id || current.systemChoice === id) store.cancelPlacement();
  store.startPlacement(id);
  if (mode === 'default') return;
  const after = store.getSnapshot(), paired = mode === 'pair';
  if (after.placing?.part === id && after.paired !== paired) store.patch({ paired });
}

/** Store slices the gallery subscribes to (with useStoreSelector): module-level, so they are stable. */
export const selectDefinitions = (state: BuilderSnapshot) => state.definitions;
export const selectRack = (state: BuilderSnapshot) => state.doc.rack;
export const selectActivePart = (state: BuilderSnapshot): string | null => state.placing?.part ?? state.structureChoice ?? state.systemChoice ?? null;

/** Gallery items and default params per definitions array (the worker delivers it once), shared by every consumer. */
const catalogs = new WeakMap<readonly GalleryDefinition[], { items: GalleryItem[]; byId: Map<string, GalleryItem>; defaults: Map<string, GalleryDefinition> }>();
export function galleryCatalog(definitions: readonly GalleryDefinition[]) {
  let catalog = catalogs.get(definitions);
  if (!catalog) {
    const items = buildGalleryItems(definitions);
    catalog = { items, byId: new Map(items.map(i => [i.id as string, i])), defaults: new Map(definitions.map(d => [d.id, d])) };
    catalogs.set(definitions, catalog);
  }
  return catalog;
}

/** "Fits my rack" lookups shared by the gallery and the idle warm-up, per rack (by value: commits clone the doc). */
const fits = new Map<string, (id: string) => RackFit | null>();
export function rackFits(rack: RackDimensions) {
  const key = JSON.stringify(rack);
  let fit = fits.get(key);
  if (!fit) {
    if (fits.size > 8) fits.clear();
    fit = rackFitCache(rack);
    fits.set(key, fit);
  }
  return fit;
}

/** Computes every card's spec line, then the current rack's fit checks, in idle slices once the catalog has loaded,
 * so opening the gallery or typing a search never pays for the few expensive footprints (posed specialty bars) or
 * the first run of the attachments' fit rules on the main thread. */
const warmed = new WeakSet<object>();
export function warmGalleryCatalog(definitions: readonly GalleryDefinition[], rack: () => RackDimensions) {
  if (!definitions.length || warmed.has(definitions) || typeof window === 'undefined') return;
  warmed.add(definitions);
  const { items } = galleryCatalog(definitions);
  const idle = (fn: (deadline?: IdleDeadline) => void) => { if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 4000 }); else setTimeout(fn, 50); };
  const work = [...items.map(item => () => item.spec), ...items.map(item => () => rackFits(rack())(item.id))];
  let next = 0;
  const step = (deadline?: IdleDeadline) => {
    const until = performance.now() + 8;
    while (next < work.length && (deadline ? deadline.timeRemaining() > 2 : performance.now() < until)) work[next++]();
    if (next < work.length) idle(step);
  };
  idle(step);
}
