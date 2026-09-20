/** Outliner (#206): the scene as a tree (Rack, Systems, Floor, Walls with their hung attachments, Plates). Click a row
 * to select it and fly the camera to it; Shift/⌘-click to extend the selection; the eye hides and the padlock locks
 * (session only). Windowed rows, and store subscriptions that ignore moves: dragging a part never re-renders it. */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { BuilderSnapshot } from '../../state/builder-store.ts';
import type { ResolvedInstance } from '../../../rack-generator/types.ts';
import { useStoreSelector } from '../../state/use-store.ts';
import { setOutlinerOpen } from '../../state/editor-ui.ts';
import { openSheet } from '../MobileShell/shell-state.ts';
import { PartThumbnail } from '../PartThumbnail.tsx';
import { galleryCatalog } from '../PartGallery/gallery-state.ts';
import { focusParts, type EditorApi } from '../CommandPalette/commands.ts';
import { allIn, buildOutline, descendantIds, filterOutline, flattenOutline, outlineSignature, rowOrder, treeKey, windowRows, type OutlineNode, type OutlineRow } from './outliner-model.ts';
import './outliner.css';

interface Outline { nodes: OutlineNode[]; signature: string; count: number }
const outlines = new WeakMap<readonly ResolvedInstance[], { definitions: BuilderSnapshot['definitions']; outline: Outline }>();
/** The outline for a snapshot, cached per resolved array (every commit makes a new one; pointer moves do not). */
function outlineOf(s: BuilderSnapshot): Outline {
  const cached = outlines.get(s.resolved);
  if (cached && cached.definitions === s.definitions) return cached.outline;
  const { byId } = galleryCatalog(s.definitions);
  const nodes = buildOutline(s.resolved, s.doc, (part, r) => byId.get(part)?.name ?? r.name ?? part.replaceAll('-', ' '));
  const outline = { nodes, signature: outlineSignature(nodes), count: s.resolved.length };
  outlines.set(s.resolved, { definitions: s.definitions, outline });
  return outline;
}
const sameOutline = (a: Outline, b: Outline) => a.signature === b.signature;
const selectSelection = (s: BuilderSnapshot) => s.selection;
const selectHidden = (s: BuilderSnapshot) => s.hidden;
const selectLocked = (s: BuilderSnapshot) => s.locked;
const selectDefinitions = (s: BuilderSnapshot) => s.definitions;
const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

const Eye = ({ off }: { off: boolean }) => <svg viewBox="0 0 16 16" aria-hidden="true">{off
  ? <><path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z" opacity=".35" /><path d="m3 13 10-10" /></>
  : <><path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z" /><circle cx="8" cy="8" r="1.8" /></>}</svg>;
const Lock = ({ on }: { on: boolean }) => <svg viewBox="0 0 16 16" aria-hidden="true">
  <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" />{on ? <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /> : <path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.7" />}</svg>;

/** `floating`: a panel over the stage (tablet and desktop). `sheet`: the phone sheet's Outliner tab (#203). */
export const Outliner = memo(function Outliner({ api, variant = 'floating' }: { api: EditorApi; variant?: 'floating' | 'sheet' }) {
  const { store } = api;
  const outline = useStoreSelector(store, outlineOf, sameOutline);
  const selection = useStoreSelector(store, selectSelection);
  const hiddenList = useStoreSelector(store, selectHidden), lockedList = useStoreSelector(store, selectLocked);
  const definitions = useStoreSelector(store, selectDefinitions);
  const defaults = useMemo(() => galleryCatalog(definitions).defaults, [definitions]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState(0);
  const [scroll, setScroll] = useState({ top: 0, height: 400 });
  const [rowHeight] = useState(() => coarse() ? 44 : 32);
  const scroller = useRef<HTMLDivElement>(null), tree = useRef<HTMLDivElement>(null);

  const nodes = useMemo(() => filterOutline(outline.nodes, filter), [outline, filter]);
  const rows = useMemo(() => flattenOutline(nodes, filter ? new Set() : collapsed), [nodes, collapsed, filter]);
  const order = useMemo(() => rowOrder(rows), [rows]);
  const selected = useMemo(() => new Set(selection), [selection]);
  const hidden = useMemo(() => new Set(hiddenList), [hiddenList]), locked = useMemo(() => new Set(lockedList), [lockedList]);
  const ids = useMemo(() => new Map(rows.map(r => [r.node.key, descendantIds(r.node)])), [rows]);

  useLayoutEffect(() => {
    const element = scroller.current!;
    const measure = () => setScroll({ top: element.scrollTop, height: element.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, []);
  // A selection made elsewhere (the scene, warnings, the palette) scrolls its row into view.
  const last = selection.at(-1);
  useEffect(() => {
    if (!last) return;
    const index = rows.findIndex(r => r.node.id === last);
    if (index < 0) return;
    setActive(index);
    const element = scroller.current!, top = index * rowHeight;
    if (top < element.scrollTop || top + rowHeight > element.scrollTop + element.clientHeight) element.scrollTop = Math.max(0, top - element.clientHeight / 2);
    // Only when the selection changes, not on every re-flatten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  const toggle = (key: string) => setCollapsed(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const activate = (row: OutlineRow, event?: Pick<MouseEvent, 'shiftKey' | 'metaKey' | 'ctrlKey'>) => {
    const extend = !!(event?.shiftKey || event?.metaKey || event?.ctrlKey);
    if (row.node.id && extend) { store.select(row.node.id, event, order); return; }
    const targets = ids.get(row.node.key) ?? [];
    if (extend) { store.selectMany(targets, true); return; }
    focusParts(api, targets);
    // The phone sheet jumps to the inspector on selection; from the outliner, stay on the list.
    if (variant === 'sheet') openSheet('outliner');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = rows[active];
    if ((event.key === 'Enter' || event.key === ' ') && row) {
      event.preventDefault(); event.stopPropagation();
      if (event.key === ' ' && row.node.id) store.select(row.node.id, { metaKey: true }, order); else activate(row, event);
      return;
    }
    const next = treeKey(rows, active, event.key);
    if (!next) return;
    // Arrow keys here move in the tree, not through history.
    event.preventDefault(); event.stopPropagation();
    if (next.toggle) toggle(next.toggle);
    setActive(next.index);
    const element = scroller.current!, top = next.index * rowHeight;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (top + rowHeight > element.scrollTop + element.clientHeight) element.scrollTop = top + rowHeight - element.clientHeight;
  };

  const [first, lastRow] = windowRows(rows.length, rowHeight, scroll.top, scroll.height);
  const rowId = (row: OutlineRow) => `ol-${row.node.key.replace(/[^a-z0-9-]/gi, '-')}`;
  const activeRow = rows[Math.min(active, rows.length - 1)];
  const items = [];
  for (let i = first; i <= lastRow; i++) {
    const row = rows[i], node = row.node, targets = ids.get(node.key) ?? [];
    const isHidden = allIn(targets, hidden), isLocked = allIn(targets, locked), isSelected = !!node.id && selected.has(node.id);
    items.push(<div key={node.key} id={rowId(row)} role="treeitem" aria-level={row.depth + 1} aria-setsize={row.setsize} aria-posinset={row.posinset}
      aria-expanded={row.expandable ? row.expanded : undefined} aria-selected={node.id ? isSelected : undefined}
      data-instance-id={node.id} data-group={node.id ? undefined : node.key}
      className={`ol-row${node.id ? '' : ' ol-group'}${i === active ? ' ol-active' : ''}${isHidden ? ' ol-hidden' : ''}${isLocked ? ' ol-locked' : ''}`}
      style={{ transform: `translateY(${i * rowHeight}px)`, height: rowHeight, paddingLeft: 6 + row.depth * 14 }}
      onClick={event => { setActive(i); activate(row, event); }}>
      {row.expandable
        ? <button type="button" tabIndex={-1} className="ol-chevron" aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${node.label}`}
            onClick={event => { event.stopPropagation(); toggle(node.key); }}>{row.expanded ? '▾' : '▸'}</button>
        : <span className="ol-chevron" aria-hidden="true" />}
      {node.part && <PartThumbnail part={node.part} params={defaults.get(node.part)?.defaults} enabled={definitions.length > 0} className="ol-thumb" />}
      <span className="ol-name">{node.label}{!node.id && <span className="ol-count">{targets.length}</span>}</span>
      {node.detail && <span className="ol-detail">{node.detail}</span>}
      <button type="button" tabIndex={-1} className="ol-toggle ol-eye" aria-pressed={isHidden} aria-label={`${isHidden ? 'Show' : 'Hide'} ${node.label}${node.detail ? ` ${node.detail}` : ''}`}
        onClick={event => { event.stopPropagation(); store.setHidden(targets, !isHidden); }}><Eye off={isHidden} /></button>
      <button type="button" tabIndex={-1} className="ol-toggle ol-lock" aria-pressed={isLocked} aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${node.label}${node.detail ? ` ${node.detail}` : ''}`}
        onClick={event => { event.stopPropagation(); store.setLocked(targets, !isLocked); }}><Lock on={isLocked} /></button>
    </div>);
  }
  return <section className={`outliner ol-${variant}`} id="outliner" aria-label="Outliner">
    <div className="ol-heading">
      <h2>Outliner <span className="ol-total">{outline.count}</span></h2>
      {hiddenList.length > 0 && <button type="button" className="ol-show-all" onClick={store.showAll}>Show all ({hiddenList.length})</button>}
      {variant === 'floating' && <button type="button" className="ol-close" aria-label="Close outliner" onClick={() => setOutlinerOpen(false)}>×</button>}
    </div>
    <input className="ol-filter" type="search" placeholder="Filter parts" aria-label="Filter parts" value={filter}
      onChange={e => { setFilter(e.target.value); setActive(0); }}
      onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); tree.current?.focus(); } }} />
    <div className="ol-scroller" ref={scroller} onScroll={e => setScroll({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight })}>
      <div ref={tree} className="ol-tree" role="tree" aria-label="Scene parts" aria-multiselectable="true" tabIndex={0}
        aria-activedescendant={activeRow && active >= first && active <= lastRow ? rowId(activeRow) : undefined}
        style={{ height: rows.length * rowHeight }} onKeyDown={onKeyDown}>
        {items}
      </div>
      {!rows.length && <p className="ol-empty">{filter ? `No parts match “${filter}”.` : 'No parts yet.'}</p>}
    </div>
  </section>;
});
