import { useEffect, useRef, useSyncExternalStore } from 'react';
import { toasts as defaultStore, type Toast, type ToastStore } from './toast-store.ts';
import './toast.css';

function ToastItem({ toast, store }: { toast: Toast; store: ToastStore }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = () => { clearTimeout(timer.current); if (toast.duration) timer.current = setTimeout(() => store.dismiss(toast.id), toast.duration); };
  const pause = () => clearTimeout(timer.current);
  useEffect(() => { start(); return pause; }, [toast.id]);
  return <div className={`toast toast-${toast.tone}`} role="status" onPointerEnter={pause} onPointerLeave={start} onFocus={pause} onBlur={start}>
    <span className="toast-message">{toast.message}</span>
    {toast.undo && <button type="button" className="toast-undo" aria-label={toast.undoLabel} onClick={toast.undo}>Undo</button>}
    <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => store.dismiss(toast.id)}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
    </button>
  </div>;
}
/** Bottom-centre stack of undo toasts. Mount once per page; phones lift it above the selection bar and sheet. */
export function Toaster({ store = defaultStore }: { store?: ToastStore }) {
  const list = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return <div className="toaster" aria-live="polite">{list.map(toast => <ToastItem key={toast.id} toast={toast} store={store} />)}</div>;
}
