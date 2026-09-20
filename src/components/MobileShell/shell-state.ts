/** App-shell state for the builder (#203): which layout the viewport gets, the phone sheet's tab and snap point, and
 * the tablet/desktop panel toggles. Tiny external stores (like the parts gallery's), so opening the sheet, dragging it
 * or collapsing a panel never re-renders the builder page, and the builder store's frequent patches never re-render
 * the shell. */
import { useSyncExternalStore } from 'react';

type Listener = () => void;
export function createAtom<T>(initial: () => T) {
  let value: T | undefined, ready = false;
  const listeners = new Set<Listener>();
  const get = () => { if (!ready) { value = initial(); ready = true; } return value as T; };
  return {
    get,
    set(next: T) { if (Object.is(next, get())) return; value = next; ready = true; listeners.forEach(fn => fn()); },
    subscribe(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}

/** `phone`: portrait phone (bottom sheet). `phone-land`: short landscape phone (side sheet, slim top bar).
 * `tablet` and `desktop`: the three-column layout with collapsible panels. */
export type LayoutMode = 'phone' | 'phone-land' | 'tablet' | 'desktop';
/** Media queries, most specific first. Short landscape windows up to 1000 px wide count as phones; wider short windows
 * (a squat desktop browser) keep the desktop layout. */
export const LAYOUT_QUERIES: readonly [LayoutMode, string][] = [
  ['phone-land', '(max-height: 500px) and (min-width: 561px) and (max-width: 1000px)'],
  ['phone', '(max-width: 760px)'],
  ['tablet', '(max-width: 1200px)'],
];
export function layoutFor(matches: (query: string) => boolean): LayoutMode {
  return LAYOUT_QUERIES.find(([, query]) => matches(query))?.[0] ?? 'desktop';
}
const media = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const readLayout = (): LayoutMode => media() ? layoutFor(q => window.matchMedia(q).matches) : 'desktop';
function subscribeLayout(fn: Listener) {
  if (!media()) return () => {};
  const lists = LAYOUT_QUERIES.map(([, q]) => window.matchMedia(q));
  lists.forEach(l => l.addEventListener('change', fn));
  return () => lists.forEach(l => l.removeEventListener('change', fn));
}
/** The current layout mode; re-renders only when the mode changes (rotation, window resize across a breakpoint). */
export const useLayoutMode = () => useSyncExternalStore(subscribeLayout, readLayout, () => 'desktop' as LayoutMode);
export const isPhoneLayout = (mode: LayoutMode) => mode === 'phone' || mode === 'phone-land';

/* ---------- Sheet (phones) ---------- */

export type SheetSnap = 'peek' | 'half' | 'full';
export const SNAPS: readonly SheetSnap[] = ['peek', 'half', 'full'];
/** Built-in tabs; other components may add their own (see `SheetTab` and `BuilderSheet`). */
export type SheetTabId = 'parts' | 'inspector' | 'timeline' | 'room' | (string & {});
export interface SheetState { tab: SheetTabId; snap: SheetSnap }
export const sheetState = createAtom<SheetState>(() => ({ tab: 'parts', snap: 'peek' }));
/** Opens the phone sheet on a tab (keeping the current tab when omitted) at a snap point. Without a snap, a peeking
 * sheet rises to half and a half or full sheet stays put. A no-op on tablet and desktop, where every panel is visible. */
export function openSheet(tab?: SheetTabId, snap?: SheetSnap) {
  const current = sheetState.get();
  const next = { tab: tab ?? current.tab, snap: snap ?? (current.snap === 'peek' ? 'half' : current.snap) };
  if (next.tab !== current.tab || next.snap !== current.snap) sheetState.set(next);
}
export function setSheetSnap(snap: SheetSnap) {
  const current = sheetState.get();
  if (current.snap !== snap) sheetState.set({ ...current, snap });
}
export const useSheetState = () => useSyncExternalStore(sheetState.subscribe, sheetState.get, sheetState.get);

export interface SnapSizes { peek: number; half: number; full: number }
/** Sheet sizes in px along its axis (height for the bottom sheet, width for the side sheet). */
export function sheetSizes(side: boolean, viewport: { width: number; height: number; top: number }, peek: number): SnapSizes {
  if (side) {
    // Sized by the panel's own width beyond the peek (tab rail plus any right safe area), so a notch never squeezes
    // the panel; at least 180 px of canvas always stays visible.
    const room = Math.max(peek, viewport.width - 180), content = Math.min(380, Math.max(240, viewport.width * 0.38));
    const half = Math.round(Math.min(room, peek + content));
    const full = Math.round(Math.max(half, Math.min(room, peek + viewport.width * 0.55)));
    return { peek, half, full };
  }
  // Full leaves a strip of canvas under the top bar, so the rack stays in view.
  const full = Math.max(peek, Math.round(viewport.height - viewport.top - 56));
  const half = Math.min(full, Math.max(peek + 120, Math.round(viewport.height * 0.5)));
  return { peek, half, full };
}
/** The snap point a drag settles on: a flick (|velocity| above ~0.45 px/ms, positive = growing) moves to the next snap
 * in its direction; a slow release goes to the nearest one. */
export function settleSnap(sizes: SnapSizes, size: number, velocity: number): SheetSnap {
  if (Math.abs(velocity) > 0.45) {
    if (velocity > 0) return SNAPS.find(s => sizes[s] > size + 1) ?? 'full';
    return [...SNAPS].reverse().find(s => sizes[s] < size - 1) ?? 'peek';
  }
  return SNAPS.reduce((best, s) => Math.abs(sizes[s] - size) < Math.abs(sizes[best] - size) ? s : best, 'peek' as SheetSnap);
}
export type ContentDrag = 'sheet' | 'native';
/** What a vertical drag on the sheet's content does, once it has moved past the slop (undefined: not decided yet).
 * Mostly horizontal drags scroll natively. Below full, the sheet follows the finger, except a downward drag on a
 * scrolled panel, which scrolls it back first. At full, only a downward drag on a panel scrolled to the top moves the
 * sheet (like a native iOS sheet); the rest scrolls. `dy` is positive downward. */
export function contentDragMode(snap: SheetSnap, scrollTop: number, dx: number, dy: number): ContentDrag | undefined {
  if (Math.hypot(dx, dy) < 8) return undefined;
  if (Math.abs(dx) > Math.abs(dy)) return 'native';
  const atTop = scrollTop <= 0;
  if (snap === 'full') return dy > 0 && atTop ? 'sheet' : 'native';
  return dy > 0 && !atTop ? 'native' : 'sheet';
}
export const stepSnap = (snap: SheetSnap, direction: 1 | -1): SheetSnap =>
  SNAPS[Math.min(SNAPS.length - 1, Math.max(0, SNAPS.indexOf(snap) + direction))];

/* ---------- Collapsible panels (tablet and desktop) ---------- */

export interface PanelPrefs { left: boolean; right: boolean; timeline: boolean }
const PANELS_KEY = 'bos-strength-panels-v1';
const storage = () => { try { return window.localStorage; } catch { return undefined; } };
export const panelPrefs = createAtom<PanelPrefs>(() => {
  const shown: PanelPrefs = { left: true, right: true, timeline: true };
  try {
    const saved = JSON.parse(storage()?.getItem(PANELS_KEY) ?? 'null');
    if (saved && typeof saved === 'object') for (const k of ['left', 'right', 'timeline'] as const) if (typeof saved[k] === 'boolean') shown[k] = saved[k];
  } catch { /* Unreadable prefs: show every panel. */ }
  return shown;
});
export function togglePanel(panel: keyof PanelPrefs) {
  const next = { ...panelPrefs.get(), [panel]: !panelPrefs.get()[panel] };
  panelPrefs.set(next);
  try { storage()?.setItem(PANELS_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
}
export const usePanelPrefs = () => useSyncExternalStore(panelPrefs.subscribe, panelPrefs.get, panelPrefs.get);
