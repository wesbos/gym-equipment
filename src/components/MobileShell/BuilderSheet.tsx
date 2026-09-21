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
  contentDragMode, isPhoneLayout, openSheet, setSheetSnap, settleSnap, sheetSizes, sheetState, stepSnap, useLayoutMode, useSheetState,
  SNAPS, type ContentDrag, type SheetSnap, type SheetTabId, type SnapSizes,
} from './shell-state.ts';

/** A sheet tab. Its panel is the element inside the sheet with `data-sheet-panel` containing `panel` (default: `id`);
 * several tabs may share a panel (Room shows the inspector). `onSelect` runs when the tab is chosen. Panels stay
 * mounted; only the active one displays on phones. On tablet and desktop, a panel keeps its normal place. */
export interface SheetTab { id: SheetTabId; label: string; panel?: string; icon?: ReactNode; onSelect?: () => void }

interface SheetDrag { id: number; start: number; startSize: number; size: number; active: boolean; samples: { t: number; size: number }[] }
/** Controls that use vertical drags themselves (sliders, scrubbable numbers, the timeline rail, text) keep them. */
function ownsVerticalDrag(target: Element, body: Element) {
  if (target.closest('input, textarea, select, [role=slider], [contenteditable=true]')) return true;
  for (let el: Element | null = target; el && el !== body; el = el.parentElement) {
    const action = getComputedStyle(el).touchAction;
    if (action === 'none' || action.includes('pan-x') && !action.includes('pan-y')) return true;
  }
  return false;
}
const SNAP_LABEL: Record<SheetSnap, string> = { peek: 'Collapsed', half: 'Half open', full: 'Fully open' };

export function BuilderSheet({ store, tabs, children }: { store: BuilderStore; tabs: readonly SheetTab[]; children: ReactNode }) {
  const layout = useLayoutMode(), phone = isPhoneLayout(layout), side = layout === 'phone-land';
  const { tab, snap } = useSheetState();
  const dock = useRef<HTMLDivElement>(null), header = useRef<HTMLDivElement>(null), safe = useRef<HTMLSpanElement>(null);
  const tabList = useRef<HTMLDivElement>(null);
  const sizes = useRef<SnapSizes>({ peek: 0, half: 0, full: 0 });
  const placed = useRef<{ layout: string; size: number } | null>(null);
  const drag = useRef<SheetDrag | null>(null);
  const suppressClick = useRef(false);
  const layoutRef = useRef(layout), snapRef = useRef(snap), sideRef = useRef(side);
  layoutRef.current = layout; snapRef.current = snap; sideRef.current = side;

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

  // A tab strip too wide for the screen scrolls; mark it so CSS fades its edges (#215).
  useEffect(() => {
    const list = tabList.current;
    if (!list || !phone || side || typeof ResizeObserver !== 'function') return;
    const check = () => list.toggleAttribute('data-overflow', list.scrollWidth > list.clientWidth + 1);
    const observer = new ResizeObserver(check);
    observer.observe(list);
    check();
    return () => { observer.disconnect(); list.removeAttribute('data-overflow'); };
  }, [phone, side, tabs]);
  // The chosen tab scrolls into view in an overflowing strip.
  useEffect(() => {
    const list = tabList.current, button = list?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (list?.hasAttribute('data-overflow') && button) list.scrollTo({ left: button.offsetLeft - (list.clientWidth - button.offsetWidth) / 2 });
  }, [tab]);

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
  const beginDrag = (id: number, coord: number, t: number): SheetDrag => {
    const size = sizes.current[snapRef.current];
    return drag.current = { id, start: coord, startSize: size, size, active: false, samples: [{ t, size }] };
  };
  /** Moves the sheet with the gesture: a transform only, no render. */
  const moveDrag = (d: SheetDrag, coord: number, t: number) => {
    const el = dock.current;
    if (!el) return;
    if (!d.active) { d.active = true; el.classList.add('dragging'); }
    const { peek, full } = sizes.current, raw = d.startSize + coord - d.start;
    // Rubber-band a little past the end snaps.
    d.size = raw > full ? full + (raw - full) * 0.2 : raw < peek ? peek - (peek - raw) * 0.2 : raw;
    d.samples.push({ t, size: d.size });
    if (d.samples.length > 6) d.samples.shift();
    el.style.transform = sideRef.current ? `translateX(${full - d.size}px)` : `translateY(${full - d.size}px)`;
  };
  /** Settles on a snap point from the release position and velocity. */
  const finishDrag = (d: SheetDrag, t: number, cancelled: boolean) => {
    if (drag.current === d) drag.current = null;
    const el = dock.current;
    if (!d.active || !el) return;
    suppressClick.current = true;
    const first = d.samples[0], last = d.samples[d.samples.length - 1], dt = last.t - first.t;
    const velocity = cancelled || dt <= 0 || t - last.t > 80 ? 0 : (last.size - first.size) / dt;
    el.classList.remove('dragging');
    el.style.transform = '';
    setSheetSnap(settleSnap(sizes.current, d.size, velocity));
  };
  // Header drags follow the pointer on the window (it soon leaves the header); the header captures it once it moves,
  // so the canvas never sees the gesture. A press that does not move stays a click on the tab or handle.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (!phone || drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const target = e.currentTarget, d = beginDrag(e.pointerId, axis(e), e.timeStamp);
    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== d.id) return;
      if (!d.active) {
        if (Math.abs(axis(ev) - d.start) < 6) return;
        try { target.setPointerCapture(d.id); } catch { /* The pointer may already be gone. */ }
      }
      ev.preventDefault();
      moveDrag(d, axis(ev), ev.timeStamp);
    };
    const end = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== d.id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      finishDrag(d, ev.timeStamp, ev.type === 'pointercancel');
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  // Content drags (bottom sheet, touch): below full the content moves the sheet (up grows it, down lowers it unless
  // the panel is scrolled); at full, a downward drag on a panel scrolled to the top lowers the sheet. Anything else is
  // a native scroll. Touch events, so a sheet drag can preventDefault the scroll it replaces.
  useEffect(() => {
    const body = dock.current?.querySelector<HTMLElement>('.sheet-body');
    if (!body || !phone || side) return;
    let touch: { id: number; x: number; y: number; panel: HTMLElement | null; mode: ContentDrag | undefined; d: SheetDrag | null } | null = null;
    const start = (e: TouchEvent) => {
      if (touch || drag.current || e.touches.length !== 1) { touch = null; return; }
      const t = e.touches[0], target = e.target as Element;
      touch = { id: t.identifier, x: t.clientX, y: t.clientY, panel: target.closest<HTMLElement>('[data-sheet-panel]'), d: null,
        mode: ownsVerticalDrag(target, body) ? 'native' : undefined };
    };
    const move = (e: TouchEvent) => {
      const t = touch && [...e.changedTouches].find(c => c.identifier === touch!.id);
      if (!touch || !t || touch.mode === 'native') return;
      if (!touch.mode) {
        touch.mode = contentDragMode(snapRef.current, touch.panel?.scrollTop ?? 0, t.clientX - touch.x, t.clientY - touch.y);
        if (touch.mode !== 'sheet') return;
        touch.d = beginDrag(-1, -touch.y, e.timeStamp);
      }
      if (e.cancelable) e.preventDefault();
      moveDrag(touch.d!, -t.clientY, e.timeStamp);
    };
    const end = (e: TouchEvent) => {
      if (!touch || ![...e.changedTouches].some(c => c.identifier === touch!.id)) return;
      const d = touch.d;
      touch = null;
      if (d) finishDrag(d, e.timeStamp, e.type === 'touchcancel');
    };
    body.addEventListener('touchstart', start, { passive: true });
    body.addEventListener('touchmove', move, { passive: false });
    body.addEventListener('touchend', end);
    body.addEventListener('touchcancel', end);
    return () => {
      body.removeEventListener('touchstart', start);
      body.removeEventListener('touchmove', move);
      body.removeEventListener('touchend', end);
      body.removeEventListener('touchcancel', end);
    };
  }, [phone, side]);
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
        <div className="sheet-tabs" ref={tabList} role="tablist" aria-label="Builder panels" aria-orientation={side ? 'vertical' : 'horizontal'} onKeyDown={onTabKey}>
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
