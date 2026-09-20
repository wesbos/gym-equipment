/** Compact sidebar catalog (#183): favourites, recent parts (or a few quick picks on a first visit) and category
 * shortcuts into the gallery. Cards keep the old sidebar behaviour: click starts placement (a second click places
 * the suggestion), drag drops into the viewport. Subscribes to the definitions and the active part only. */
import { memo, useEffect, useMemo } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import type { PartId } from '../../../rack-generator/types.ts';
import { PartThumbnail } from '../PartThumbnail.tsx';
import { categoryTree, type GalleryItem } from './gallery-model.ts';
import { galleryCatalog, openGallery, selectActivePart, selectDefinitions, useGalleryPrefs, warmGalleryCatalog } from './gallery-state.ts';
import { useStoreSelector } from '../../state/use-store.ts';

/** First-visit picks: one of each kind of placement (rack pair, floor item, spanning rack part, hang item). */
export const QUICK_PICKS: readonly PartId[] = ['j-hook-standard', 'safety-pin-pipe', 'pullup-straight', 'olympic-barbell', 'landmine', 'rogue-adjustable-bench-3'];
const SHOWN = 8;

/** Favourites and recent parts (quick picks until the first gallery add), as sidebar cards. */
export const CompactCatalog = memo(function CompactCatalog({ store }: { store: BuilderStore }) {
  const definitions = useStoreSelector(store, selectDefinitions);
  const activePart = useStoreSelector(store, selectActivePart);
  const prefs = useGalleryPrefs();
  const { byId, defaults } = galleryCatalog(definitions);
  useEffect(() => warmGalleryCatalog(definitions), [definitions]);
  const pick = (ids: readonly string[]) => ids.flatMap(id => byId.get(id) ?? []).slice(0, SHOWN);
  const favourites = pick(prefs.favourites), recent = pick(prefs.recent.filter(id => !prefs.favourites.includes(id)));
  const card = (item: GalleryItem) => <SidebarCard key={item.id} item={item} store={store} active={activePart === item.id}
    params={defaults.get(item.id)?.defaults} thumbs={definitions.length > 0} />;
  return <>
    {favourites.length > 0 && <section className="compact-section" aria-label="Favourite parts">
      <h3>Favourites</h3>{favourites.map(card)}
    </section>}
    <section className="compact-section" aria-label={recent.length ? 'Recent parts' : 'Quick picks'}>
      <h3>{recent.length ? 'Recent' : 'Quick picks'}</h3>
      {(recent.length ? recent : pick(QUICK_PICKS)).map(card)}
    </section>
  </>;
});

/** Category shortcuts into the gallery. Static: the catalog tree never changes at runtime. */
export const BrowseCategories = memo(function BrowseCategories() {
  const { items } = galleryCatalog(NO_DEFINITIONS);
  const tree = useMemo(() => categoryTree(items), [items]);
  return <section className="compact-section compact-browse" aria-label="Browse by category">
    <h3>Browse the catalog</h3>
    <ul>
      {tree.map(category => <li key={category.label}>
        <button type="button" data-category={category.label} onClick={() => openGallery({ scope: { kind: 'category', category: category.label } })}>
          <span>{category.label}</span><small>{category.count}</small>
        </button>
      </li>)}
    </ul>
    <button type="button" className="compact-browse-all" onClick={() => openGallery({ scope: { kind: 'all' } })}>Browse all {items.length} parts ↗</button>
  </section>;
});
const NO_DEFINITIONS: readonly never[] = [];

/** Sidebar cards call the store directly and never touch the recents list, so the list never reorders under the
 * pointer between the first click (stage) and the second (place). */
const SidebarCard = memo(function SidebarCard({ item, store, active, params, thumbs }: { item: GalleryItem; store: BuilderStore; active: boolean; params?: Record<string, number>; thumbs: boolean }) {
  return <button type="button" className="part-card" data-part={item.id} aria-pressed={active} draggable={item.draggable}
    onClick={() => store.startPlacement(item.id)}
    onDragStart={e => { e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'copy'; store.startPlacement(item.id); }}>
    <PartThumbnail enabled={thumbs} part={item.id} params={params} className="thumb" />
    <span>{item.name}<small className={item.kind === 'system' ? 'system-hint' : undefined}>{item.kind === 'system' ? item.spec : item.brand}</small></span>
    <span className="part-plus">+</span>
  </button>;
});
