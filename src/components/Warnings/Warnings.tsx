/** Clickable placement warnings (#206): the inspector's list and the stage's warning badge. Each warning selects the
 * parts involved and flies the camera to them. Warnings are recomputed after edits settle (not per drag frame), and
 * the list re-renders only when a warning appears, clears or changes. */
import { memo, useEffect, useId, useRef, useState } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import type { EditorApi } from '../CommandPalette/commands.ts';
import { collectWarnings, focusWarning, sameWarnings, type PlacementWarning } from './warnings-model.ts';
import './warnings.css';

const SETTLE_MS = 150;
export function useWarnings(store: BuilderStore) {
  const [warnings, setWarnings] = useState(() => { const s = store.getSnapshot(); return collectWarnings(s.doc, s.resolved); });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined, seen = store.getSnapshot();
    const compute = () => {
      timer = undefined;
      const s = store.getSnapshot(), next = collectWarnings(s.doc, s.resolved);
      setWarnings(previous => sameWarnings(previous, next) ? previous : next);
    };
    const unsubscribe = store.subscribe(() => {
      const s = store.getSnapshot();
      if (s.doc === seen.doc && s.resolved === seen.resolved) return;
      seen = s;
      clearTimeout(timer);
      timer = setTimeout(compute, SETTLE_MS);
    });
    compute();
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [store]);
  return warnings;
}
function WarningItems({ api, warnings, onPick }: { api: EditorApi; warnings: readonly PlacementWarning[]; onPick?: () => void }) {
  return <ul className="warning-list" aria-label="Placement warnings">
    {warnings.map((warning, i) => <li key={`${i}:${warning.ids.join()}`}>
      <button type="button" className="warning-item" data-warning-ids={warning.ids.join(' ')}
        onClick={() => { onPick?.(); focusWarning(api, warning); }}>
        <span aria-hidden="true">△</span> {warning.message}
      </button>
    </li>)}
  </ul>;
}
/** The inspector's list (kept at #warnings). */
export const WarningsList = memo(function WarningsList({ api }: { api: EditorApi }) {
  const warnings = useWarnings(api.store);
  return <div id="warnings">{warnings.length > 0 && <WarningItems api={api} warnings={warnings} />}</div>;
});
/** The stage badge: "△ 3" opens the list over the canvas (the inspector is off screen on phones). */
export const WarningsButton = memo(function WarningsButton({ api }: { api: EditorApi }) {
  const warnings = useWarnings(api.store);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), panel = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (!warnings.length) setOpen(false); }, [warnings.length]);
  if (!warnings.length) return null;
  return <div className="warnings-badge" ref={root} onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); } }}>
    <button type="button" id="warnings-button" aria-expanded={open} aria-controls={open ? panel : undefined} onClick={() => setOpen(!open)}
      title="Placement warnings">△ {warnings.length}<span className="wb-label"> warning{warnings.length === 1 ? '' : 's'}</span></button>
    {open && <div id={panel} className="warnings-popover">
      <WarningItems api={api} warnings={warnings} />
    </div>}
  </div>;
});
