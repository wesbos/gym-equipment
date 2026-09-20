/** Destructive builder actions with an undo toast (#205). Every UI path (action bar, inspector footers, keyboard)
 * calls these so the toast and its Undo behave the same everywhere. */
import { createAssembly } from '../../../rack-generator/assembly.ts';
import type { BuilderStore } from '../../state/builder-store.ts';
import { partMeta } from '../Inspector/part-meta.ts';
import { toasts, withCheckpoint, withUndo } from './toast-store.ts';

/** "bench", "2 parts": what a removal took away, for the toast. */
export function selectionLabel(store: BuilderStore) {
  const { selection, resolved, definitions } = store.getSnapshot();
  if (selection.length > 1) return `${selection.length} parts`;
  const physical = resolved.find(r => r.id === selection[0]);
  return physical ? partMeta(physical.part, definitions).name : 'part';
}
export function removeSelectionWithUndo(store: BuilderStore) {
  if (!store.getSnapshot().selection.length) return null;
  const label = selectionLabel(store);
  return withUndo(store, `Deleted ${label}`, () => store.removeSelected());
}
export function resetRackWithUndo(store: BuilderStore, afterReset?: () => void) {
  return withUndo(store, 'Rack reset to the stock assembly', () => {
    store.endGesture();
    store.commit(createAssembly(), { category: 'preset', label: 'Reset entire rack', replacement: true });
    store.select(null);
    afterReset?.();
  });
}
export function clearHistoryWithUndo(store: BuilderStore) {
  return withCheckpoint(store, 'History cleared', () => store.clearHistory());
}
/** Opening a gallery gym replaces the working design and its history; Undo brings the previous design back. */
export async function openDesignWithUndo(store: BuilderStore, open: () => Promise<unknown>, title: string) {
  const checkpoint = store.checkpoint();
  await open();
  return toasts.undoable(store, `Opened ${title}`, () => store.restoreCheckpoint(checkpoint), { tone: 'info', undoLabel: `Undo open ${title}` });
}
