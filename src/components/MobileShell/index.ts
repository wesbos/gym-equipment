/** The builder's app shell (#203). Slots for other builder components:
 *
 * - Stage overlay: children of `.stage-overlay` (BuilderPage) float over the canvas, above the phone sheet. The
 *   overlay ignores pointer events; its children receive them.
 * - Inspector region: `.inspector-panel` (BuilderPage). On phones it is the sheet's Inspector (and Room) tab.
 * - Toolbar actions: children of `.toolbar-slot` (BuilderPage) sit in the top bar at every size, phones included.
 * - Sheet tabs: add `{ id, label, panel? }` to `SHEET_TABS` in BuilderPage and put an always-mounted element with
 *   `data-sheet-panel="<id>"` inside `<BuilderSheet>`. `openSheet(tab, snap)` shows a tab from anywhere; `useSheetState()`
 *   reads it; `useLayoutMode()` says which layout is active.
 */
export { BuilderSheet, type SheetTab } from './BuilderSheet.tsx';
export { OverflowMenu, PanelToggles } from './ShellControls.tsx';
export {
  openSheet, setSheetSnap, useSheetState, sheetState, useLayoutMode, isPhoneLayout, togglePanel, usePanelPrefs,
  type LayoutMode, type SheetSnap, type SheetTabId,
} from './shell-state.ts';
