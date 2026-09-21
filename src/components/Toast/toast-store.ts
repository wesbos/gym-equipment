/** Undo toasts (#205): destructive or major builder actions (delete, reset, clear history, open gym) announce
 * themselves with an Undo button. A toast's undo is only offered while the history is exactly where the action left it:
 * any later edit, undo, redo or seek dismisses it, so Undo can never revert something else. No React here; the
 * Toaster component renders the list. */
import type { BuilderStore, WorkingCheckpoint } from '../../state/builder-store.ts';

export interface Toast {
  id: number;
  message: string;
  /** Present while the action can still be undone from the toast. */
  undo?: () => void;
  /** Accessible name for the Undo button ("Undo delete bench"): never the bare "Undo" of the toolbar button. */
  undoLabel?: string;
  tone: 'info' | 'danger';
  /** Auto-dismiss delay; 0 keeps it until dismissed. */
  duration: number;
}
type TimelineMark = { position: number; latest: number; applied: number; count: number; doc: unknown };
const markOf = (store: BuilderStore): TimelineMark => {
  const { timeline, doc } = store.getSnapshot();
  return { position: timeline.position, latest: timeline.latest, applied: timeline.applied, count: timeline.entries.length, doc };
};
const sameMark = (a: TimelineMark, b: TimelineMark) => a.position === b.position && a.latest === b.latest && a.applied === b.applied && a.count === b.count && a.doc === b.doc;

export const TOAST_DURATION_MS = 6000;
export class ToastStore {
  private list: readonly Toast[] = [];
  private listeners = new Set<() => void>();
  private watchers = new Map<number, () => void>();
  private serial = 0;
  /** Most recent toasts shown; older ones drop off. */
  limit = 3;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.list;
  private emit() { this.listeners.forEach(fn => fn()); }
  show = (toast: Omit<Toast, 'id' | 'tone' | 'duration'> & Partial<Pick<Toast, 'tone' | 'duration'>>) => {
    const id = ++this.serial;
    const next = [...this.list, { tone: 'info' as const, duration: TOAST_DURATION_MS, ...toast, id }];
    for (const old of next.slice(0, Math.max(0, next.length - this.limit))) this.unwatch(old.id);
    this.list = next.slice(-this.limit);
    this.emit();
    return id;
  };
  dismiss = (id: number) => {
    this.unwatch(id);
    if (!this.list.some(t => t.id === id)) return;
    this.list = this.list.filter(t => t.id !== id);
    this.emit();
  };
  clear = () => { for (const t of this.list) this.unwatch(t.id); this.list = []; this.emit(); };
  private unwatch(id: number) { this.watchers.get(id)?.(); this.watchers.delete(id); }
  /** Show an undoable toast for the state `store` is in now. `undo` runs at most once; the toast then closes. */
  undoable(store: BuilderStore, message: string, undo: () => void, options: { undoLabel?: string; tone?: Toast['tone'] } = {}) {
    const mark = markOf(store);
    let id = 0;
    const run = () => { this.dismiss(id); store.act(undo); };
    id = this.show({ message, undo: run, undoLabel: options.undoLabel ?? `Undo ${message.toLowerCase()}`, tone: options.tone ?? 'danger' });
    // History moved on: the Undo would revert something else. Drop the toast.
    this.watchers.set(id, store.subscribe(() => { if (!sameMark(mark, markOf(store))) this.dismiss(id); }));
    return id;
  }
}
export const toasts = new ToastStore();

/** Run a history-recorded action; when it changed the document, toast it with an Undo that steps history back. */
export function withUndo(store: BuilderStore, message: string | (() => string), action: () => void, target: ToastStore = toasts) {
  const before = markOf(store);
  store.act(action);
  if (sameMark(before, markOf(store)) || !store.getSnapshot().canUndo) return null;
  return target.undoable(store, typeof message === 'function' ? message() : message, () => store.history('undo'));
}
/** Run an action that replaces the working design or its history (clear history, open a gym): Undo puts the
 * captured checkpoint back. */
export async function withCheckpoint(store: BuilderStore, message: string | (() => string), action: () => unknown, target: ToastStore = toasts) {
  const checkpoint: WorkingCheckpoint = store.checkpoint();
  await action();
  return target.undoable(store, typeof message === 'function' ? message() : message, () => store.restoreCheckpoint(checkpoint));
}
