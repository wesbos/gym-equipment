/** Small shell controls (#203): the phone top bar's overflow menu and the tablet/desktop panel toggles. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { togglePanel, usePanelPrefs } from './shell-state.ts';

/** Phones: a "more" button and a dropdown holding `children`. Tablet and desktop: `display: contents`, so the children
 * sit inline in the toolbar as before. Clicking an element marked `data-menu-close` closes the menu. */
export function OverflowMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div className="toolbar-overflow" ref={root} data-open={open || undefined}>
      <button type="button" className="overflow-trigger" aria-label="More actions" aria-haspopup="true" aria-expanded={open}
        onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="4" cy="10" r="1.8" /><circle cx="10" cy="10" r="1.8" /><circle cx="16" cy="10" r="1.8" /></svg>
      </button>
      <div className="toolbar-menu" onClick={e => {
        const target = e.target as Element;
        if (target.closest('[data-menu-close]')) return setOpen(false);
        // A section that expands in place (Export's options, Configurations) scrolls into view once it has rendered.
        const section = target.closest<HTMLElement>('.export-menu, .config-manager');
        if (section) requestAnimationFrame(() => section.scrollIntoView({ block: 'nearest' }));
      }}>{children}</div>
    </div>
  );
}

const PanelIcon = ({ side }: { side: 'left' | 'right' | 'bottom' }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
    {side === 'left' && <path d="M7.5 4v12" />}
    {side === 'right' && <path d="M12.5 4v12" />}
    {side === 'bottom' && <path d="M3 12.5h14" />}
  </svg>
);

/** Tablet and desktop: show or hide the parts sidebar, the timeline and the inspector so the canvas can be large.
 * Writes `data-hide-left` / `data-hide-right` / `data-hide-timeline` on the shell; the choice persists per browser. */
export function PanelToggles({ shell }: { shell: RefObject<HTMLElement | null> }) {
  const prefs = usePanelPrefs();
  useLayoutEffect(() => {
    const el = shell.current;
    if (!el) return;
    el.toggleAttribute('data-hide-left', !prefs.left);
    el.toggleAttribute('data-hide-right', !prefs.right);
    el.toggleAttribute('data-hide-timeline', !prefs.timeline);
  }, [prefs, shell]);
  return (
    <div className="panel-toggles" role="group" aria-label="Panels">
      <button type="button" aria-pressed={prefs.left} aria-label="Parts panel" title={prefs.left ? 'Hide parts panel' : 'Show parts panel'} onClick={() => togglePanel('left')}><PanelIcon side="left" /></button>
      <button type="button" aria-pressed={prefs.timeline} aria-label="Timeline panel" title={prefs.timeline ? 'Hide timeline' : 'Show timeline'} onClick={() => togglePanel('timeline')}><PanelIcon side="bottom" /></button>
      <button type="button" aria-pressed={prefs.right} aria-label="Inspector panel" title={prefs.right ? 'Hide inspector' : 'Show inspector'} onClick={() => togglePanel('right')}><PanelIcon side="right" /></button>
    </div>
  );
}
