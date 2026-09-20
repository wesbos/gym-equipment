/** Editor power-tool UI state (#206) outside the builder store: which overlays are open. Tiny atoms, so opening the
 * palette or the outliner never re-renders the builder page, and store patches (drags) never re-render them. */
import { useSyncExternalStore } from 'react';
import { createAtom } from '../components/PartGallery/gallery-state.ts';
import { layoutFor, openSheet, setSheetSnap, sheetState } from '../components/MobileShell/shell-state.ts';

export type EditorPanel = 'palette' | 'shortcuts';
const panel = createAtom<EditorPanel | null>(() => null);
const outliner = createAtom<boolean>(() => false);
let returnFocus: HTMLElement | null = null;

/** Opens a modal panel (closing the other), remembering what had focus. */
export function openPanel(name: EditorPanel) {
  if (panel.get() === name) return;
  if (!panel.get()) returnFocus = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
  panel.set(name);
}
/** Closes the open panel and (unless `restoreFocus` is false) returns focus to whatever opened it. */
export function closePanel(restoreFocus = true) {
  if (!panel.get()) return;
  panel.set(null);
  const target = returnFocus;
  returnFocus = null;
  if (restoreFocus && target?.isConnected) target.focus({ preventScroll: true });
}
export const togglePanel = (name: EditorPanel) => panel.get() === name ? closePanel() : openPanel(name);
export const openPanelName = () => panel.get();
export const usePanel = () => useSyncExternalStore(panel.subscribe, panel.get, panel.get);

export const setOutlinerOpen = (open: boolean) => { if (outliner.get() !== open) outliner.set(open); };
/** Phones (#203) show the outliner as a sheet tab; elsewhere it floats over the stage. */
const phone = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && layoutFor(q => window.matchMedia(q).matches).startsWith('phone');
export function toggleOutliner() {
  if (!phone()) { outliner.set(!outliner.get()); return; }
  const sheet = sheetState.get();
  if (sheet.tab === 'outliner' && sheet.snap !== 'peek') setSheetSnap('peek'); else openSheet('outliner');
}
export const isOutlinerOpen = () => outliner.get();
export const useOutlinerOpen = () => useSyncExternalStore(outliner.subscribe, outliner.get, outliner.get);
