/** The builder's dock (#203). On tablet and desktop it is `display: contents`, so its panels (parts sidebar, inspector,
 * timeline, status bar) stay grid items of the three-column shell. On phones it becomes a sheet: a bottom sheet with
 * peek / half / full snap points in portrait, and a side sheet in short landscape. Tabs pick which panel shows.
 *
 * Dragging writes the sheet's transform directly (no React render, no store patch); only settling on a snap point
 * updates `sheetState`, which re-renders this component alone (its children are stable elements from the page). The
 * canvas inset (`--sheet-rest` on the shell) changes once per snap, so the scene sees one resize, never a drag. */
import { useEffect, useLayoutEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import {
  isPhoneLayout, openSheet, setSheetSnap, settleSnap, sheetSizes, sheetState, stepSnap, useLayoutMode, useSheetState,
  SNAPS, type SheetSnap, type SheetTabId, type SnapSizes,
} from './shell-state.ts';

/** A sheet tab. Its panel is the element inside the sheet with `data-sheet-panel` containing `panel` (default: `id`);
 * several tabs may share a panel (Room shows the inspector). `onSelect` runs when the tab is chosen. Panels stay
 * mounted; only the active one displays on phones. On tablet and desktop, a panel keeps its normal place. */
export interface SheetTab { id: SheetTabId; label: string; panel?: string; icon?: ReactNode; onSelect?: () => void }

interface SheetDrag { id: number; start: number; startSize: number; size: number; active: boolean; samples: { t: number; size: number }[] }
const SNAP_LABEL: Record<SheetSnap, string> = { peek: 'Collapsed', half: 'Half open', full: 'Fully open' };

export function BuilderSheet({ store, tabs, children }: { store: BuilderStore; tabs: readonly SheetTab[]; children: ReactNode }) {
  const layout = useLayoutMode(), phone = isPhoneLayout(layout), side = layout === 'phone-land';
  const { tab, snap } = useSheetState();
  const dock = useRef<HTMLDivElement>(null), header = useRef<HTMLDivElement>(null), safe = useRef<HTMLSpanElement>(null);
  const sizes = useRef<SnapSizes>({ peek: 0, half: 0, full: 0 });
  const placed = useRef<{ layout: string; size: number } | null>(null);
  const drag = useRef<SheetDrag | null>(null);
  const suppressClick = useRef(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Size the sheet for the current snap point, and inset the canvas once it has settled.
  useLayoutEffect(() => {
    const el = dock.current, shell = el?.parentElement;
    if (!el || !shell) return;
    if (!phone) {
      for (const name of ['--sheet-full', '--sheet-size']) el.style.removeProperty(name);
      shell.style.removeProperty('--sheet-rest');
      placed.current = null;
      return;
    }
    let restTimer: ReturnType<typeof setTimeout> | undefined;
    const place = (animate: boolean) => {
      const style = getComputedStyle(safe.current!), top = (shell.querySelector('.toolbar') as HTMLElement | null)?.offsetHeight ?? 0;
      const status = el.querySelector<HTMLElement>('.status-bar');
      const peek = side
        ? header.current!.offsetWidth + parseFloat(style.paddingRight || '0')
        : header.current!.offsetHeight + (status?.offsetHeight ?? 0) + parseFloat(style.paddingBottom || '0');
      const s = sizes.current = sheetSizes(side, { width: shell.clientWidth, height: shell.clientHeight, top }, Math.round(peek));
      const size = s[snap], rest = Math.min(size, s.half);
      el.style.setProperty('--sheet-full', `${s.full}px`);
      el.style.setProperty('--sheet-size', `${size}px`);
      const previous = placed.current;
      placed.current = { layout, size };
      clearTimeout(restTimer);
      // Growing: shrink the canvas after the sheet has covered it; shrinking: grow the canvas at once, so no gap shows.
      if (animate && previous?.layout === layout && size > previous.size) restTimer = setTimeout(() => shell.style.setProperty('--sheet-rest', `${rest}px`), 300);
      else shell.style.setProperty('--sheet-rest', `${rest}px`);
    };
    place(true);
    const resize = () => place(false);
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); clearTimeout(restTimer); };
  }, [phone, side, layout, snap]);

  // Follow the editor: selecting opens the inspector, placing drops the sheet so the canvas is free, the room
  // inspector has its own tab.
  useEffect(() => {
    let prev = store.getSnapshot();
    return store.subscribe(() => {
      const s = store.getSnapshot(), p = prev;
      if (s === p) return;
      prev = s;
      if (!isPhoneLayout(layoutRef.current)) return;
      if (s.roomInspector && !p.roomInspector) return openSheet('room');
      if (!s.roomInspector && p.roomInspector && sheetState.get().tab === 'room') openSheet('inspector', sheetState.get().snap);
      if ((s.placing && !p.placing) || (s.systemChoice && !p.systemChoice)) return setSheetSnap('peek');
      if (s.structureChoice && !p.structureChoice) return openSheet('inspector');
      if (s.selected && s.selected !== p.selected && !s.placing) openSheet('inspector');
    });
  }, [store]);

  const choose = (next: SheetTab) => {
    if (next.id === tab && snap !== 'peek') return setSheetSnap('peek');
    if (next.id === 'room') { if (!store.getSnapshot().roomInspector) store.openRoom(); }
    else if (tab === 'room' && store.getSnapshot().roomInspector) store.select(null);
    next.onSelect?.();
    openSheet(next.id);
  };

  const axis = (e: { clientX: number; clientY: number }) => side ? -e.clientX : -e.clientY;
  // The drag follows the pointer on the window (it soon leaves the header); the header captures it once it moves, so
  // the canvas never sees the gesture. A press that does not move stays a click on the tab or handle.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (!phone || drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const target = e.currentTarget, size = sizes.current[snap];
    const d: SheetDrag = { id: e.pointerId, start: axis(e), startSize: size, size, active: false, samples: [{ t: e.timeStamp, size }] };
    drag.current = d;
    const move = (ev: globalThis.PointerEvent) => {
      const el = dock.current;
      if (ev.pointerId !== d.id || !el) return;
      const delta = axis(ev) - d.start;
      if (!d.active) {
        if (Math.abs(delta) < 6) return;
        d.active = true;
        try { target.setPointerCapture(d.id); } catch { /* The pointer may already be gone. */ }
        el.classList.add('dragging');
      }
      ev.preventDefault();
      const { peek, full } = sizes.current, raw = d.startSize + delta;
      // Rubber-band a little past the end snaps.
      d.size = raw > full ? full + (raw - full) * 0.2 : raw < peek ? peek - (peek - raw) * 0.2 : raw;
      d.samples.push({ t: ev.timeStamp, size: d.size });
      if (d.samples.length > 6) d.samples.shift();
      el.style.transform = side ? `translateX(${full - d.size}px)` : `translateY(${full - d.size}px)`;
    };
    const end = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== d.id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      drag.current = null;
      const el = dock.current;
      if (!d.active || !el) return;
      suppressClick.current = true;
      const first = d.samples[0], last = d.samples[d.samples.length - 1], dt = last.t - first.t;
      const velocity = ev.type === 'pointercancel' || dt <= 0 || ev.timeStamp - last.t > 80 ? 0 : (last.size - first.size) / dt;
      el.classList.remove('dragging');
      el.style.transform = '';
      setSheetSnap(settleSnap(sizes.current, d.size, velocity));
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const grow = e.key === 'ArrowUp' || (side && e.key === 'ArrowLeft') || e.key === 'PageUp';
    const shrink = e.key === 'ArrowDown' || (side && e.key === 'ArrowRight') || e.key === 'PageDown';
    const next: SheetSnap | undefined = grow ? stepSnap(snap, 1) : shrink ? stepSnap(snap, -1)
      : e.key === 'Home' ? 'peek' : e.key === 'End' ? 'full'
      : e.key === 'Enter' || e.key === ' ' ? (snap === 'peek' ? 'half' : 'peek') : undefined;
    if (!next) return;
    e.preventDefault();
    setSheetSnap(next);
  };
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = side ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    const i = tabs.findIndex(t => t.id === tab), step = e.key === keys[1] ? 1 : e.key === keys[0] ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    choose(next);
    e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus();
  };

  // Only the active tab's panel displays on phones; generated from the tab list so added tabs need no CSS.
  const panelCss = useMemo(() => tabs.map(t =>
    `.builder-page[data-layout^=phone] .builder-dock[data-tab="${t.id}"] [data-sheet-panel~="${t.panel ?? t.id}"]`).join(',') + '{display:flex}', [tabs]);

  return (
    <div className="builder-dock" ref={dock} data-tab={tab} data-snap={snap} data-side={side || undefined}
      onClickCapture={e => { if (suppressClick.current) { suppressClick.current = false; e.preventDefault(); e.stopPropagation(); } }}>
      <style>{panelCss}</style>
      <span className="sheet-safe" ref={safe} aria-hidden="true" />
      <div className="sheet-header" ref={header} onPointerDown={onPointerDown}>
        <div className="sheet-handle" role="slider" tabIndex={phone ? 0 : -1} aria-label="Panel size"
          aria-orientation={side ? 'horizontal' : 'vertical'} aria-valuemin={0} aria-valuemax={SNAPS.length - 1}
          aria-valuenow={SNAPS.indexOf(snap)} aria-valuetext={SNAP_LABEL[snap]} onKeyDown={onKeyDown}
          onClick={() => setSheetSnap(snap === 'peek' ? 'half' : 'peek')} />
        <div className="sheet-tabs" role="tablist" aria-label="Builder panels" aria-orientation={side ? 'vertical' : 'horizontal'} onKeyDown={onTabKey}>
          {tabs.map(t => (
            <button key={t.id} type="button" role="tab" data-tab={t.id} aria-selected={t.id === tab} tabIndex={t.id === tab ? 0 : -1}
              onClick={() => choose(t)}>
              {t.icon && <span className="sheet-tab-icon" aria-hidden="true">{t.icon}</span>}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}
