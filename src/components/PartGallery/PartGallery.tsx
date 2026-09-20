/** Parts gallery (#183): a large overlay for browsing the whole catalog. Category nav, instant search, brand chips,
 * "fits my rack", recents and favourites, a windowed thumbnail grid with arrow-key navigation, and a detail pane whose
 * Add / Add pair start the builder's usual placement flow. Cards are `[data-part]` buttons: click (or Enter) adds,
 * dragging drops into the viewport. Mounted only while open; it subscribes to the definitions and the rack only. */
import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import type { NumericParams, PartId, RackDimensions } from '../../../rack-generator/types.ts';
import { PartThumbnail } from '../PartThumbnail.tsx';
import { VendorCredit } from '../VendorControls.tsx';
import { pairedByDefault } from '../../../rack-generator/assembly.ts';
import { partAttribution } from '../../../rack-generator/attribution.ts';
import {
  brandFacets, categoryTree, detailRows, filterItems, gridLayout, moveIndex, rackFitCache, rackSummary, scopeItems, visibleRows,
  CATALOG_PART_IDS, type GalleryDefinition, type GalleryItem, type GalleryScope, type RackFit,
} from './gallery-model.ts';
import {
  addPart, closeGallery, galleryCatalog, galleryView, openGallery, selectDefinitions, selectRack, toggleFavouritePart,
  useGalleryOpen, useGalleryPrefs,
} from './gallery-state.ts';
import { shallowEqual, useStoreSelector } from '../../state/use-store.ts';
import './part-gallery.css';

const CARD_MIN = 168, GAP = 12, ROW_HEIGHT = 218, HEADER_HEIGHT = 40, BRAND_CHIPS = 12;
const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (/INPUT|SELECT|TEXTAREA/.test(target.tagName) || target.isContentEditable);

/** Always mounted: owns the "/" and "A" shortcuts and renders the dialog while open. */
export const PartGallery = memo(function PartGallery({ store }: { store: BuilderStore }) {
  const open = useGalleryOpen();
  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || galleryView.get().open) return;
      if (event.key !== '/' && event.key.toLowerCase() !== 'a') return;
      if (event.target instanceof Element && event.target.closest('[role="menu"],[role="dialog"]')) return;
      event.preventDefault();
      openGallery();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  return open ? <GalleryDialog store={store} /> : null;
});

/** The sidebar entry point. */
export const GalleryLauncher = memo(function GalleryLauncher({ total = CATALOG_PART_IDS.length }: { total?: number }) {
  return <button type="button" id="open-gallery" className="gallery-launch" aria-haspopup="dialog" aria-keyshortcuts="/ A" onClick={() => openGallery()}>
    <span className="gallery-launch-plus" aria-hidden="true">+</span>
    <span><strong>Add parts</strong><small>Browse all {total} parts</small></span>
    <kbd aria-hidden="true">/</kbd>
  </button>;
});

interface CardActions {
  add: (id: PartId) => void;
  focus: (index: number) => void;
  hover: (index: number) => void;
  unhover: () => void;
  inspect: (index: number) => void;
  dragStart: (id: PartId, event: DragEvent<HTMLButtonElement>) => void;
  dragEnd: () => void;
}

function GalleryDialog({ store }: { store: BuilderStore }) {
  const definitions = useStoreSelector(store, selectDefinitions);
  // Commits structured-clone the doc; the rack slice only changes identity when its values do.
  const rack = useStoreSelector(store, selectRack, shallowEqual);
  const prefs = useGalleryPrefs();
  const initial = useRef(galleryView.get()).current;
  const [scope, setScopeState] = useState<GalleryScope>(initial.scope);
  const [query, setQuery] = useState(initial.query);
  const [brands, setBrands] = useState<readonly string[]>(initial.brands);
  const [fitsOnly, setFitsOnly] = useState(initial.fitsOnly);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [allBrands, setAllBrands] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const root = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null);
  const view = useRef({ scope, query, brands, fitsOnly });
  view.current = { scope, query, brands, fitsOnly };

  const { items, defaults } = galleryCatalog(definitions);
  const fit = useMemo(() => rackFitCache(rack), [rack]);
  const tree = useMemo(() => categoryTree(items), [items]);
  const scoped = useMemo(() => scopeItems(items, scope, prefs), [items, scope, prefs]);
  // Brand chips count what the search and fit filter leave, so every chip's number is what clicking it shows.
  const unbranded = useMemo(() => filterItems(items, { scope, query: deferredQuery, brands: [], fitsOnly }, { ...prefs, fit }), [items, scope, deferredQuery, fitsOnly, prefs, fit]);
  const facets = useMemo(() => brandFacets(unbranded), [unbranded]);
  const results = useMemo(() => { const keys = new Set(brands); return keys.size ? unbranded.filter(i => keys.has(i.brandKey)) : unbranded; }, [unbranded, brands]);
  const rackParts = useMemo(() => scoped.filter(i => fit(i.id) !== null), [scoped, fit]);
  const refused = useMemo(() => rackParts.filter(i => fit(i.id)?.fits === false).length, [rackParts, fit]);
  const favourites = useMemo(() => new Set(prefs.favourites), [prefs.favourites]);
  const activeIndex = Math.max(0, results.findIndex(i => i.id === activeId));
  const active = results[activeIndex];
  const grouped = !deferredQuery.trim() && scope.kind !== 'recent' && scope.kind !== 'favourites';

  const setScope = useCallback((next: GalleryScope) => { setScopeState(next); setBrands([]); setAllBrands(false); setActiveId(null); }, []);
  const close = useCallback((restoreFocus = true) => closeGallery(view.current, restoreFocus), []);

  // Modal: the builder behind is inert while the gallery is up (restored on close or when a drag starts).
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>('.builder-shell');
    shell?.setAttribute('inert', '');
    search.current?.focus({ preventScroll: true });
    return () => shell?.removeAttribute('inert');
  }, []);

  const actions = useMemo<CardActions>(() => {
    let hoverTimer = 0;
    return {
      add: id => { close(); addPart(store, id); },
      focus: index => { window.clearTimeout(hoverTimer); setActiveIdByIndex(index); },
      // Hover intent: crossing cards on the way to the detail pane does not change it.
      hover: index => { window.clearTimeout(hoverTimer); hoverTimer = window.setTimeout(() => setActiveIdByIndex(index), 160); },
      unhover: () => window.clearTimeout(hoverTimer),
      inspect: index => { window.clearTimeout(hoverTimer); setActiveIdByIndex(index); },
      dragStart: (id, event) => {
        event.dataTransfer.setData('text/plain', id);
        event.dataTransfer.effectAllowed = 'copy';
        addPart(store, id);
        // After the browser has captured the drag image: fade the gallery out and let drops reach the viewport.
        window.setTimeout(() => {
          root.current?.classList.add('pg-dragging');
          document.querySelector('.builder-shell')?.removeAttribute('inert');
        }, 0);
      },
      dragEnd: () => close(false),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, close]);
  const resultsRef = useRef(results);
  resultsRef.current = results;
  function setActiveIdByIndex(index: number) { const item = resultsRef.current[index]; if (item) setActiveId(item.id); }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Builder shortcuts (Delete, undo, R, history arrows) never see keys typed in the gallery.
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === '/' && !isTyping(event.target)) { event.preventDefault(); search.current?.select(); search.current?.focus(); return; }
    if (event.key === 'Tab') {
      const focusable = [...root.current!.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]),input,a[href],[tabindex="0"]')].filter(el => el.offsetParent !== null);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); root.current?.querySelector<HTMLElement>('.pg-card[tabindex="0"]')?.focus(); }
    if (event.key === 'Enter' && active) { event.preventDefault(); actions.add(active.id); }
  };
  const scopeTitle = scope.kind === 'all' ? 'All parts' : scope.kind === 'recent' ? 'Recently added' : scope.kind === 'favourites' ? 'Favourites' : scope.section ?? scope.category;
  const shownFacets = allBrands ? facets : facets.slice(0, BRAND_CHIPS);
  for (const key of brands) if (!shownFacets.some(f => f.key === key)) { const facet = facets.find(f => f.key === key); if (facet) shownFacets.push(facet); }

  return <div className="part-gallery" ref={root} onKeyDown={onKeyDown}>
    <div className="pg-backdrop" onPointerDown={() => close()} />
    <div className="pg-panel" role="dialog" aria-modal="true" aria-labelledby="pg-title">
      <header className="pg-header">
        <div className="pg-heading">
          <span className="pg-eyebrow">Parts gallery · {items.length} parts</span>
          <h2 id="pg-title">Add parts</h2>
        </div>
        <label className="pg-search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
          <input ref={search} id="gallery-search" type="search" placeholder="Search name, brand or type…" aria-label="Search parts" aria-controls="pg-grid"
            autoComplete="off" spellCheck={false} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onSearchKey} />
        </label>
        <button type="button" className="pg-close" aria-label="Close parts gallery" onClick={() => close()}>×<kbd aria-hidden="true">ESC</kbd></button>
      </header>
      <nav className="pg-nav" aria-label="Part categories">
        <ul>
          <NavItem label="All parts" count={items.length} current={scope.kind === 'all'} onSelect={() => setScope({ kind: 'all' })} />
          <NavItem label="Recent" count={prefs.recent.length} current={scope.kind === 'recent'} onSelect={() => setScope({ kind: 'recent' })} icon="↺" />
          <NavItem label="Favourites" count={prefs.favourites.length} current={scope.kind === 'favourites'} onSelect={() => setScope({ kind: 'favourites' })} icon="★" />
        </ul>
        <ul className="pg-categories">
          {tree.map(category => {
            const open = scope.kind === 'category' && scope.category === category.label;
            return <NavItem key={category.label} label={category.label} count={category.count} current={open && !scope.section}
              expanded={category.sections.length > 1 ? open : undefined} onSelect={() => setScope({ kind: 'category', category: category.label })}>
              {open && category.sections.length > 1 && <ul className="pg-sections">
                {category.sections.map(section => <NavItem key={section.label} label={section.label} count={section.count}
                  current={scope.kind === 'category' && scope.section === section.label}
                  onSelect={() => setScope({ kind: 'category', category: category.label, section: section.label })} />)}
              </ul>}
            </NavItem>;
          })}
        </ul>
      </nav>
      <section className="pg-main" aria-label="Results">
        <div className="pg-filters">
          <div className="pg-brands">
            <div className={`pg-chips${allBrands ? ' pg-chips-all' : ''}`} role="group" aria-label="Brands">
              {shownFacets.map(facet => <button type="button" key={facet.key} className="pg-chip" aria-pressed={brands.includes(facet.key)}
                onClick={() => setBrands(list => list.includes(facet.key) ? list.filter(k => k !== facet.key) : [...list, facet.key])}>
                {facet.label}<span>{facet.count}</span></button>)}
            </div>
            {facets.length > BRAND_CHIPS && <button type="button" className="pg-chip pg-chip-more" aria-expanded={allBrands} onClick={() => setAllBrands(!allBrands)}>
              {allBrands ? 'Fewer' : `+${facets.length - BRAND_CHIPS} brands`}</button>}
            {brands.length > 0 && <button type="button" className="pg-chip pg-chip-clear" onClick={() => setBrands([])}>Clear</button>}
          </div>
          {rackParts.length > 0 && <label className="pg-fit" title={rackSummary(rack)}>
            <input type="checkbox" id="gallery-fits" checked={fitsOnly} onChange={e => setFitsOnly(e.target.checked)} />
            <span>Fits my rack<small>{rackSummary(rack)}{refused ? ` · hides ${refused}` : ''}</small></span>
          </label>}
        </div>
        <p className="pg-status" role="status" aria-live="polite">
          <strong>{scopeTitle}</strong> · {results.length} {results.length === 1 ? 'part' : 'parts'}{deferredQuery.trim() ? ` for “${deferredQuery.trim()}”` : ''}
        </p>
        {results.length ? <GalleryGrid items={results} grouped={grouped} activeIndex={activeIndex} actions={actions} favourites={favourites}
          fit={fit} defaults={defaults} thumbs={definitions.length > 0} resetKey={`${JSON.stringify(scope)}|${deferredQuery}|${brands.join()}|${fitsOnly}`} />
          : <EmptyState scope={scope} query={deferredQuery} onAll={() => { setScope({ kind: 'all' }); setQuery(query); }} />}
      </section>
      {active && <GalleryDetail item={active} definition={defaults.get(active.id)} fit={fit(active.id)} favourite={favourites.has(active.id)} rack={rack} thumbs={definitions.length > 0} store={store} close={close} />}
    </div>
  </div>;
}

function NavItem({ label, count, current, expanded, icon, onSelect, children }: { label: string; count: number; current: boolean; expanded?: boolean; icon?: string; onSelect: () => void; children?: ReactNode }) {
  return <li>
    <button type="button" className="pg-nav-item" aria-current={current ? 'true' : undefined} aria-expanded={expanded} onClick={onSelect}>
      {icon && <span className="pg-nav-icon" aria-hidden="true">{icon}</span>}<span className="pg-nav-label">{label}</span><span className="pg-count">{count}</span>
    </button>
    {children}
  </li>;
}

function EmptyState({ scope, query, onAll }: { scope: GalleryScope; query: string; onAll: () => void }) {
  const message = scope.kind === 'recent' ? 'Parts you add show up here.' : scope.kind === 'favourites' ? 'Star a part (★ in its details, or F on a card) to keep it here.' : `No parts match${query.trim() ? ` “${query.trim()}”` : ''} with these filters.`;
  return <div className="pg-empty"><p>{message}</p>{scope.kind !== 'all' && <button type="button" onClick={onAll}>Search all parts</button>}</div>;
}

/** Windowed grid: only the rows near the viewport are mounted (~30 cards), so 470 parts scroll and filter smoothly. */
const GalleryGrid = memo(function GalleryGrid({ items, grouped, activeIndex, actions, favourites, fit, defaults, thumbs, resetKey }: {
  items: GalleryItem[]; grouped: boolean; activeIndex: number; actions: CardActions; favourites: Set<string>; fit: (id: string) => RackFit | null;
  defaults: Map<string, GalleryDefinition>; thumbs: boolean; resetKey: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [scrollTop, setScrollTop] = useState(0);
  const focusPending = useRef(false);
  useLayoutEffect(() => {
    const el = scroller.current!;
    const measure = () => setSize(s => s.width === el.clientWidth && s.height === el.clientHeight ? s : { width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // New results start at the top.
  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; setScrollTop(0); }, [resetKey]);
  // Inner width (the scroller pads 12 px, 8 px on phones); narrower cards on phones keep two columns.
  const inner = size.width - (size.width < 500 ? 16 : 24), min = size.width < 500 ? 136 : CARD_MIN;
  const columns = Math.max(1, Math.floor((inner + GAP) / (min + GAP)));
  const layout = useMemo(() => gridLayout(items, columns, { grouped, rowHeight: ROW_HEIGHT, headerHeight: HEADER_HEIGHT, gap: GAP }), [items, columns, grouped]);
  // Three rows of overscan either side: wheel scrolling reaches already-mounted cards before new rows render.
  const [first, last] = visibleRows(layout, scrollTop, size.height, 3);
  const frame = useRef(0);
  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => { frame.current = 0; if (scroller.current) setScrollTop(scroller.current.scrollTop); });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const ensureVisible = (index: number) => {
    const el = scroller.current!, row = layout.rows[layout.rowOf[index]];
    if (!row) return;
    const header = grouped && layout.rows[layout.rowOf[index] - 1]?.kind === 'header' ? HEADER_HEIGHT : 0;
    if (row.top - header < el.scrollTop) el.scrollTop = row.top - header;
    else if (row.top + row.height + GAP > el.scrollTop + el.clientHeight) el.scrollTop = row.top + row.height + GAP - el.clientHeight;
    setScrollTop(el.scrollTop);
  };
  // Keyboard focus follows the active card, and survives the grid re-rendering under it (new results, windowing):
  // when the focused card unmounts, focus moves to the roving card instead of dropping to <body>.
  const hadFocus = useRef(false);
  useLayoutEffect(() => {
    const lost = hadFocus.current && (document.activeElement === document.body || document.activeElement === null);
    if (!focusPending.current && !lost) return;
    focusPending.current = false;
    scroller.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"] .pg-card, .pg-card[tabindex="0"]`)?.focus({ preventScroll: true });
  });
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && items[activeIndex]) { event.preventDefault(); toggleFavouritePart(items[activeIndex].id); return; }
    const pageRows = Math.max(1, Math.floor(size.height / (ROW_HEIGHT + GAP)));
    const next = moveIndex(layout, activeIndex, event.key, pageRows);
    if (next === null) return;
    event.preventDefault();
    ensureVisible(next);
    focusPending.current = true;
    actions.focus(next);
  };
  // Roving tabindex: the active card, or the first mounted one when the active card is scrolled out of the window.
  const mounted = layout.rows.slice(first, last + 1).filter(r => r.kind === 'cards') as { start: number; end: number }[];
  const firstCard = mounted[0], lastCard = mounted.at(-1);
  const tabbable = firstCard && lastCard && (activeIndex < firstCard.start || activeIndex >= lastCard.end) ? firstCard.start : activeIndex;
  const rows = [];
  for (let r = first; r <= last; r++) {
    const row = layout.rows[r];
    if (row.kind === 'header') {
      rows.push(<div key={`h${r}`} role="row" className="pg-row-header" style={{ transform: `translateY(${row.top}px)`, height: row.height }}>
        <span role="columnheader" aria-colspan={columns}>{row.label}<small>{row.count}</small></span>
      </div>);
      continue;
    }
    const cells = [];
    for (let i = row.start; i < row.end; i++) {
      const item = items[i];
      cells.push(<GalleryCard key={item.id} item={item} index={i} active={i === activeIndex} tabbable={i === tabbable} favourite={favourites.has(item.id)}
        fits={fit(item.id)?.fits !== false} params={defaults.get(item.id)?.defaults} thumbs={thumbs} actions={actions} />);
    }
    rows.push(<div key={`r${row.start}`} role="row" className="pg-row" style={{ transform: `translateY(${row.top}px)`, height: row.height, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{cells}</div>);
  }
  return <div className="pg-scroller" ref={scroller} onScroll={onScroll}>
    <div id="pg-grid" role="grid" aria-label="Parts" aria-rowcount={layout.rows.length} aria-colcount={columns} className="pg-grid" style={{ height: layout.height }} onKeyDown={onKeyDown}
      onFocus={() => { hadFocus.current = true; }} onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) hadFocus.current = false; }}>
      {rows}
    </div>
  </div>;
});

const GalleryCard = memo(function GalleryCard({ item, index, active, tabbable, favourite, fits, params, thumbs, actions }: {
  item: GalleryItem; index: number; active: boolean; tabbable: boolean; favourite: boolean; fits: boolean; params?: NumericParams; thumbs: boolean; actions: CardActions;
}) {
  return <div role="gridcell" className="pg-cell" data-index={index} aria-selected={active}>
    <button type="button" className="pg-card" data-part={item.id} data-fits={fits ? undefined : 'false'} tabIndex={tabbable ? 0 : -1}
      aria-label={item.name} aria-describedby={`pg-d-${item.id}`} draggable={item.draggable}
      onClick={() => actions.add(item.id)} onFocus={() => actions.focus(index)}
      onPointerEnter={e => { if (e.pointerType === 'mouse') actions.hover(index); }} onPointerLeave={actions.unhover}
      onDragStart={e => actions.dragStart(item.id, e)} onDragEnd={actions.dragEnd}>
      <PartThumbnail part={item.id} params={params} enabled={thumbs} className="pg-thumb" />
      <span className="pg-card-name">{item.name}</span>
      <span className="pg-card-meta" id={`pg-d-${item.id}`}>
        <span className="pg-card-brand">{item.brand}</span>
        <span className="pg-card-spec">{item.spec}{fits ? '' : ' · does not fit your rack'}</span>
      </span>
      <span className="pg-card-add" aria-hidden="true">+</span>
    </button>
    {favourite && <span className="pg-card-fav" aria-label="Favourite">★</span>}
    <button type="button" className="pg-card-info" tabIndex={-1} aria-label={`Details: ${item.name}`} onClick={() => actions.inspect(index)}>i</button>
  </div>;
});

const GalleryDetail = memo(function GalleryDetail({ item, definition, fit, favourite, rack, thumbs, store, close }: {
  item: GalleryItem; definition?: GalleryDefinition; fit: RackFit | null; favourite: boolean; rack: RackDimensions; thumbs: boolean; store: BuilderStore; close: () => void;
}) {
  const rows = useMemo(() => detailRows(item, definition), [item, definition]);
  const add = (mode: 'default' | 'single' | 'pair') => { close(); addPart(store, item.id, mode); };
  // Floor pairs always start paired; rack attachments start from their registry default (what a card click does).
  const pairsByDefault = item.kind === 'floor' || pairedByDefault(item.id);
  return <aside className="pg-detail" aria-label={`${item.name} details`}>
    <div className="pg-detail-thumb"><PartThumbnail key={item.id} part={item.id} params={definition?.defaults} enabled={thumbs} className="pg-thumb-large" /></div>
    <div className="pg-detail-body">
      <span className="pg-eyebrow">{item.category}{item.section !== item.category ? ` · ${item.section}` : ''}</span>
      <h3 id="pg-detail-name">{item.name}</h3>
      <div className="pg-credit">{partAttribution(item.id) ? <VendorCredit part={item.id} /> : <p className="note">BOS STRENGTH original part</p>}</div>
      {fit && <p className={`pg-fit-note ${fit.fits ? 'ok' : 'bad'}`}>{fit.fits ? `✓ Fits your rack (${rackSummary(rack)})` : `△ ${fit.reason}`}</p>}
      <dl className="pg-dims">{rows.map(([label, value], i) => <div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {item.description && <p className="pg-description">{item.description}</p>}
    </div>
    <div className="pg-detail-actions">
      {item.pairable ? <>
        <button type="button" id="gallery-add-pair" className={pairsByDefault ? 'primary' : ''} onClick={() => add('pair')}>Add pair</button>
        <button type="button" id="gallery-add" className={pairsByDefault ? '' : 'primary'} onClick={() => add('single')}>Add one</button>
      </> : <button type="button" id="gallery-add" className="primary" onClick={() => add('default')}>{item.kind === 'system' ? 'Install' : 'Add to rack'}</button>}
      <button type="button" className="pg-fav" aria-pressed={favourite} aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'} onClick={() => toggleFavouritePart(item.id)}>{favourite ? '★' : '☆'}</button>
      {item.draggable && <p className="pg-drag-hint">or drag a card into the scene</p>}
    </div>
  </aside>;
});
