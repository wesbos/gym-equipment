/** Command palette (#206): ⌘K / Ctrl-K (or the toolbar's search button) opens a searchable list of every editor
 * action and every catalog part. Keyboard first: type, ↑/↓, Enter; Escape closes. An ARIA combobox driving a
 * listbox; a centred dialog on desktop and a full-screen sheet on phones. Mounted only while open. */
import { memo, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { PartThumbnail } from '../PartThumbnail.tsx';
import type { PartId } from '../../../rack-generator/types.ts';
import { addPart, galleryCatalog, selectDefinitions, useGalleryPrefs } from '../PartGallery/gallery-state.ts';
import { useStoreSelector } from '../../state/use-store.ts';
import { closePanel, usePanel } from '../../state/editor-ui.ts';
import { comboKeys, matches, shortcut } from '../../state/shortcuts.ts';
import { availableCommands, commandById, type EditorApi } from './commands.ts';
import { commandEntry, loadPaletteRecents, mergedRecents, partEntries, pushPaletteRecent, rankPalette, savePaletteRecents, type PaletteEntry } from './palette-model.ts';
import './command-palette.css';

const storage = () => { try { return window.localStorage; } catch { return undefined; } };
let paletteRecents: string[] | null = null;
const recents = () => (paletteRecents ??= loadPaletteRecents(storage()));
function remember(key: string) { paletteRecents = pushPaletteRecent(recents(), key); savePaletteRecents(storage(), paletteRecents); }

export const CommandPalette = memo(function CommandPalette({ api }: { api: EditorApi }) {
  return usePanel() === 'palette' ? <PaletteDialog api={api} /> : null;
});

function Keycaps({ entry }: { entry: PaletteEntry }) {
  const combo = entry.shortcut && shortcut(entry.shortcut).combos[0];
  if (!combo) return null;
  return <span className="cp-keys" aria-hidden="true">{comboKeys(combo).map((key, i) => <kbd key={i}>{key}</kbd>)}</span>;
}

function PaletteDialog({ api }: { api: EditorApi }) {
  const { store } = api;
  const definitions = useStoreSelector(store, selectDefinitions);
  const gallery = useGalleryPrefs();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  // Availability is read when the palette opens and on each keystroke; the palette never subscribes to edits.
  const commands = useMemo(() => availableCommands(store.getSnapshot(), store).map(commandEntry), [store]);
  const parts = useMemo(() => partEntries(galleryCatalog(definitions).items), [definitions]);
  const defaults = useMemo(() => galleryCatalog(definitions).defaults, [definitions]);
  const sections = useMemo(() => rankPalette(query, commands, parts, mergedRecents(recents(), gallery.recent)), [query, commands, parts, gallery.recent]);
  const entries = useMemo(() => sections.flatMap(s => s.entries), [sections]);
  const current = entries[Math.min(active, entries.length - 1)];

  // Modal: the builder behind is inert while the palette is up.
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>('.builder-shell');
    shell?.setAttribute('inert', '');
    input.current?.focus({ preventScroll: true });
    return () => shell?.removeAttribute('inert');
  }, []);
  useLayoutEffect(() => { setActive(0); }, [query]);
  useLayoutEffect(() => {
    if (current) list.current?.querySelector(`[data-key="${CSS.escape(current.key)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const run = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    remember(entry.key);
    closePanel();
    if (entry.kind === 'part') { addPart(store, entry.id as PartId); return; }
    const command = commandById.get(entry.id);
    if (command && (!command.available || command.available(store.getSnapshot(), store))) store.act(() => command.run(api));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Builder shortcuts never see keys typed in the palette.
    event.stopPropagation();
    const move = (to: number) => { event.preventDefault(); if (entries.length) setActive((to + entries.length) % entries.length); };
    if (event.key === 'Escape' || matches('command-palette', event)) { event.preventDefault(); closePanel(); return; }
    if (event.key === 'ArrowDown') return move(active + 1);
    if (event.key === 'ArrowUp') return move(active - 1);
    if (event.key === 'PageDown') return move(Math.min(entries.length - 1, active + 8));
    if (event.key === 'PageUp') return move(Math.max(0, active - 8));
    if (event.key === 'Enter') { event.preventDefault(); run(current); return; }
    if (event.key === 'Tab') { event.preventDefault(); input.current?.focus(); }
  };
  const optionId = (entry: PaletteEntry) => `cp-option-${entry.key.replace(/[^a-z0-9-]/gi, '-')}`;
  let index = 0;
  return <div className="command-palette" onKeyDown={onKeyDown}>
    <div className="cp-backdrop" onPointerDown={() => closePanel()} />
    <div className="cp-panel" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="cp-search">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
        <input ref={input} id="palette-search" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-autocomplete="list"
          aria-activedescendant={current ? optionId(current) : undefined} aria-label="Search actions and parts"
          placeholder={`Search ${commands.length} actions and ${parts.length} parts… ("add …" for parts)`}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go"
          value={query} onChange={e => setQuery(e.target.value)} />
        <button type="button" className="cp-close" aria-label="Close command palette" onClick={() => closePanel()}>Esc</button>
      </div>
      <div className="cp-results" id="palette-results" role="listbox" aria-label="Actions and parts" ref={list}>
        {sections.map(section => <div role="group" aria-label={section.label} key={section.label}>
          <div className="cp-section" aria-hidden="true">{section.label}</div>
          {section.entries.map(entry => {
            const i = index++;
            return <div key={entry.key} id={optionId(entry)} data-key={entry.key} role="option" aria-selected={i === active}
              className={`cp-option cp-${entry.kind}`} onPointerMove={() => { if (i !== active) setActive(i); }}
              onClick={() => run(entry)}>
              {entry.kind === 'part'
                ? <PartThumbnail part={entry.id} params={defaults.get(entry.id)?.defaults} enabled={definitions.length > 0} className="cp-thumb" />
                : <span className="cp-icon" aria-hidden="true">{ICONS[entry.detail] ?? '›'}</span>}
              <span className="cp-text"><span className="cp-label">{entry.label}</span><span className="cp-detail">{entry.detail}</span></span>
              <Keycaps entry={entry} />
            </div>;
          })}
        </div>)}
        {!entries.length && <p className="cp-empty">No actions or parts match “{query.trim()}”.</p>}
      </div>
      <div className="cp-footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> run</span><span><kbd>Esc</kbd> close</span><span><kbd>add</kbd> parts only</span>
      </div>
      <div className="cp-live" aria-live="polite">{query ? `${entries.length} result${entries.length === 1 ? '' : 's'}` : ''}</div>
    </div>
  </div>;
}
const ICONS: Record<string, string> = { Edit: '+', History: '↶', Selection: '▣', View: '◎', Design: '▦', File: '⇩', Help: '?' };
