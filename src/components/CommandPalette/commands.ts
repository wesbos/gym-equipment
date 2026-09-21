/** Editor commands (#206): everything the command palette lists and the builder's keyboard shortcuts run. A command
 * names its shortcut from the registry (src/state/shortcuts.ts), so the palette shows the same keys the dispatcher
 * handles. No React: `builderShortcutHandlers` is what BuilderPage's single keydown listener dispatches to. */
import { clearHistoryWithUndo, removeSelectionWithUndo } from '../Toast/undo-actions.ts';
import type { BuilderSnapshot, BuilderStore } from '../../state/builder-store.ts';
import type { BuilderScene, BuilderView } from '../../scenes/builder-scene.ts';
import type { ExportFormat } from '../../exports/export-job.ts';
import { historyKeyStep, type ShortcutHandlers, type ShortcutId } from '../../state/shortcuts.ts';
import { closePanel, openPanelName, togglePanel, toggleOutliner } from '../../state/editor-ui.ts';
import { galleryView, openGallery } from '../PartGallery/gallery-state.ts';

/** What commands act on: the store, the 3D scene, and the page-level actions that live in BuilderPage. */
export interface EditorApi {
  store: BuilderStore;
  scene(): BuilderScene | null;
  /** Switch the camera view (and the view buttons' state), fitting the gym. */
  view(mode: BuilderView): void;
  saveJSON(): void;
  loadJSON(): void;
  openGyms(): void;
  exportFile(format: ExportFormat): void;
  resetRack(): void;
}
export type CommandGroup = 'Edit' | 'Selection' | 'View' | 'History' | 'Design' | 'File' | 'Help';
export interface Command {
  id: string; label: string; group: CommandGroup;
  /** Extra search words. */
  keywords?: string;
  shortcut?: ShortcutId;
  /** Hidden from the palette (and its shortcut declines) when false. */
  available?: (state: BuilderSnapshot, store: BuilderStore) => boolean;
  run: (api: EditorApi) => void;
}

const busy = (s: BuilderSnapshot) => !!(s.placing || s.structureChoice || s.systemChoice);
const hasSelection = (s: BuilderSnapshot) => s.selection.length > 0;
/** Select these physical instances and fly the camera to them (the outliner, warnings and palette share this). */
export function focusParts(api: EditorApi, ids: readonly string[]) {
  const { store } = api;
  if (!ids.length) return;
  if (busy(store.getSnapshot())) store.cancelPlacement();
  // One part: a plain select, which also anchors Shift-click ranges.
  if (ids.length === 1) store.select(ids[0]); else store.selectMany(ids);
  api.scene()?.focus(ids);
}
/** Frame the selection, or fit the whole gym when nothing is selected. */
export function frameSelection(api: EditorApi) {
  const { selection } = api.store.getSnapshot();
  if (selection.length) api.scene()?.focus(selection); else api.scene()?.fit();
}
export const COMMANDS: readonly Command[] = [
  { id: 'gallery', label: 'Parts gallery: browse and add parts', group: 'Edit', keywords: 'catalog library new insert', shortcut: 'open-gallery', run: () => openGallery() },
  { id: 'undo', label: 'Undo', group: 'History', shortcut: 'undo', available: s => s.canUndo, run: ({ store }) => store.history('undo') },
  { id: 'redo', label: 'Redo', group: 'History', shortcut: 'redo', available: s => s.canRedo, run: ({ store }) => store.history('redo') },
  { id: 'latest', label: 'Return to the latest history step', group: 'History', keywords: 'timeline', available: s => s.timeline.viewing, run: ({ store }) => store.latestHistory() },
  { id: 'clear-history', label: 'Clear history (keep the current design)', group: 'History', keywords: 'erase timeline steps', available: s => s.timeline.latest > 0,
    run: ({ store }) => { if (window.confirm('Erase all past steps? The current design stays.')) void clearHistoryWithUndo(store); } },
  { id: 'select-all', label: 'Select all', group: 'Selection', shortcut: 'select-all', available: s => !busy(s) && s.resolved.length > 0, run: ({ store }) => store.selectAll() },
  { id: 'deselect', label: 'Clear the selection', group: 'Selection', keywords: 'deselect none', available: hasSelection, run: ({ store }) => store.select(null) },
  { id: 'delete', label: 'Delete the selection', group: 'Selection', keywords: 'remove', shortcut: 'delete', available: hasSelection, run: ({ store }) => { removeSelectionWithUndo(store); } },
  { id: 'duplicate', label: 'Duplicate the selection', group: 'Selection', keywords: 'copy clone', shortcut: 'duplicate', available: hasSelection, run: ({ store }) => store.act(() => store.duplicateSelected()) },
  // The store's rotateSelection / rotationSubject (#204) are what the R key and the touch rotate buttons use.
  { id: 'rotate', label: 'Rotate the selected part', group: 'Selection', keywords: 'turn spin', shortcut: 'rotate', available: (_, store) => !!store.rotationSubject(), run: ({ store }) => { store.rotateSelection(1); } },
  { id: 'rotate-back', label: 'Rotate the selected part the other way', group: 'Selection', keywords: 'turn spin counter', shortcut: 'rotate-back', available: (_, store) => !!store.rotationSubject(), run: ({ store }) => { store.rotateSelection(-1); } },
  { id: 'reposition', label: 'Move the selected part (pick it up)', group: 'Selection', keywords: 'reposition relocate drag pick up', shortcut: 'double-click-move',
    available: s => s.selection.length === 1 && !busy(s), run: ({ store }) => { store.repositionSelected(); } },
  { id: 'hide', label: 'Hide the selection', group: 'Selection', keywords: 'visibility', shortcut: 'hide', available: hasSelection, run: ({ store }) => store.setHidden(store.getSnapshot().selection, true) },
  { id: 'show-all', label: 'Show all hidden parts', group: 'Selection', keywords: 'unhide visibility reveal', shortcut: 'show-all', available: s => s.hidden.length > 0, run: ({ store }) => store.showAll() },
  { id: 'lock', label: 'Lock or unlock the selection', group: 'Selection', keywords: 'freeze pin', shortcut: 'lock', available: hasSelection, run: ({ store }) => store.setLocked(store.getSnapshot().selection) },
  { id: 'unlock-all', label: 'Unlock all parts', group: 'Selection', keywords: 'unfreeze', available: s => s.locked.length > 0, run: ({ store }) => store.setLocked(store.getSnapshot().locked, false) },
  { id: 'select-tool', label: 'Toggle the box-select tool', group: 'Selection', keywords: 'marquee lasso', run: ({ store }) => store.patch({ selectionTool: !store.getSnapshot().selectionTool }) },
  { id: 'frame-selection', label: 'Frame the selection', group: 'View', keywords: 'focus zoom camera', shortcut: 'frame-selection', run: frameSelection },
  { id: 'fit', label: 'Fit the whole gym in view', group: 'View', keywords: 'zoom extents camera reset', run: api => api.scene()?.fit() },
  { id: 'view-iso', label: '3D view', group: 'View', keywords: 'perspective iso camera', shortcut: 'view-iso', run: api => api.view('iso') },
  { id: 'view-front', label: 'Front view', group: 'View', keywords: 'camera elevation', shortcut: 'view-front', run: api => api.view('front') },
  { id: 'view-side', label: 'Side view', group: 'View', keywords: 'camera elevation profile', shortcut: 'view-side', run: api => api.view('side') },
  { id: 'view-top', label: 'Top view', group: 'View', keywords: 'camera plan overhead', shortcut: 'view-top', run: api => api.view('top') },
  { id: 'outliner', label: 'Show or hide the outliner', group: 'View', keywords: 'parts list tree scene hierarchy layers', shortcut: 'toggle-outliner', run: () => toggleOutliner() },
  { id: 'build', label: 'Play the build animation', group: 'View', keywords: 'assemble showcase', available: s => !s.loading && !busy(s),
    run: () => document.querySelector<HTMLButtonElement>('[data-build-toggle]')?.click() },
  { id: 'room', label: 'Room settings: walls, floor, turf and ceiling', group: 'Design', keywords: 'finishes paint colour color', available: s => !busy(s), run: ({ store }) => store.openRoom() },
  { id: 'toggle-pairs', label: 'Toggle "Add matching pair"', group: 'Design', keywords: 'pairs paired symmetric', run: ({ store }) => store.patch({ paired: !store.getSnapshot().paired }) },
  { id: 'gyms', label: 'Open the gym gallery', group: 'Design', keywords: 'examples prebuilt templates', run: api => api.openGyms() },
  { id: 'reset-rack', label: 'Reset entire rack…', group: 'Design', keywords: 'new start over', run: api => api.resetRack() },
  { id: 'export-glb', label: 'Export GLB (3D scene)', group: 'File', keywords: 'download gltf model', run: api => api.exportFile('glb') },
  { id: 'export-3mf', label: 'Export 3MF (print ready)', group: 'File', keywords: 'download print 3d printer', run: api => api.exportFile('3mf') },
  { id: 'save-json', label: 'Save design as JSON', group: 'File', keywords: 'download backup file', run: api => api.saveJSON() },
  { id: 'load-json', label: 'Load a design from JSON', group: 'File', keywords: 'open import upload file', run: api => api.loadJSON() },
  { id: 'shortcuts', label: 'Keyboard shortcuts', group: 'Help', keywords: 'keys hotkeys help', shortcut: 'shortcuts', run: () => togglePanel('shortcuts') },
];
export const commandById = new Map(COMMANDS.map(c => [c.id, c]));
export const availableCommands = (state: BuilderSnapshot, store: BuilderStore) => COMMANDS.filter(c => !c.available || c.available(state, store));

/** Every builder-scope shortcut's handler: commands with a shortcut run through their command (declining when the
 * command is unavailable); the rest (Escape, history keys, the palette itself) are wired here. */
export function builderShortcutHandlers(api: EditorApi): ShortcutHandlers {
  const { store } = api;
  const handlers: ShortcutHandlers = {};
  for (const command of COMMANDS) {
    if (!command.shortcut) continue;
    handlers[command.shortcut] = () => {
      if (command.available && !command.available(store.getSnapshot(), store)) return false;
      command.run(api);
    };
  }
  const addingStructure = () => { const s = store.getSnapshot(); return !!s.structureChoice && s.structureMode === 'add'; };
  const history = (event: KeyboardEvent) => {
    // While adding structure the arrows cycle candidate positions (the scene's structure-cycle shortcut).
    if (addingStructure()) return false;
    const { position, latest } = store.getSnapshot().timeline;
    const step = historyKeyStep(event, position, latest);
    if (step === undefined) return false;
    store.seekHistory(step);
  };
  return {
    ...handlers,
    'command-palette': () => togglePanel('palette'),
    shortcuts: () => togglePanel('shortcuts'),
    'open-gallery': () => { if (galleryView.get().open || openPanelName()) return false; openGallery(); },
    // Never swallowed: widgets that close on Escape still let the builder cancel placement (as before #206).
    escape: () => { if (openPanelName()) { closePanel(); return; } store.escape(); },
    'history-back': history, 'history-forward': history, 'history-start': history, 'history-end': history,
  };
}
