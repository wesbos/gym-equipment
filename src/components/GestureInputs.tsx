import { useEffect, useRef, type InputHTMLAttributes } from 'react';

/** Same convention as NumericControl: a drag/picker session brackets its live edits so history records one entry. */
export interface GestureCallbacks { onGestureStart?(): void; onGestureEnd?(): void; onGestureCancel?(): void }
export type GestureSession = ReturnType<typeof createGestureSession>;
/** Idempotent begin/end so any mix of input, change, pointer and blur events yields one start/end pair. */
export function createGestureSession(callbacks: () => GestureCallbacks) {
  let active = false;
  return {
    get active() { return active; },
    begin() { if (!active) { active = true; callbacks().onGestureStart?.(); } },
    end() { if (active) { active = false; callbacks().onGestureEnd?.(); } },
    /** Escape reverts the live edits; callers without a cancel just finish. */
    cancel() { if (active) { active = false; const c = callbacks(); (c.onGestureCancel ?? c.onGestureEnd)?.(); } },
  };
}
function useGestureInput({ onGestureStart, onGestureEnd, onGestureCancel }: GestureCallbacks) {
  const latest = useRef<GestureCallbacks>({}), ref = useRef<HTMLInputElement>(null), session = useRef<GestureSession>(null);
  latest.current = { onGestureStart, onGestureEnd, onGestureCancel };
  session.current ??= createGestureSession(() => latest.current);
  const gesture = session.current;
  useEffect(() => {
    // React maps native `input` to onChange; the committing native `change` (picker closed / thumb released)
    // is only observable directly. Listen on the document so a final value React delivers lands first.
    const input = ref.current!, doc = input.ownerDocument;
    const change = (e: Event) => { if (e.target === input) gesture.end(); };
    doc.addEventListener('change', change);
    return () => { doc.removeEventListener('change', change); gesture.end(); };
  }, [gesture]);
  return { ref, gesture };
}
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'>;
/** Color stays live while the native picker drags; one history entry lands when it closes. */
export function GestureColorInput({ value, onValue, onGestureStart, onGestureEnd, onGestureCancel, ...input }: InputProps & GestureCallbacks & {
  value: string; onValue(value: string): void;
}) {
  const { ref, gesture } = useGestureInput({ onGestureStart, onGestureEnd, onGestureCancel });
  return <input {...input} ref={ref} type="color" value={value}
    onChange={e => { gesture.begin(); onValue(e.target.value); }}
    onBlur={e => { gesture.end(); input.onBlur?.(e); }}
    onKeyDown={e => { if (e.key === 'Escape') gesture.cancel(); input.onKeyDown?.(e); }} />;
}
/** Range drags collapse to one entry; keyboard steps still commit individually via native change. */
export function GestureRange({ value, onValue, onGestureStart, onGestureEnd, onGestureCancel, ...input }: InputProps & GestureCallbacks & {
  value: number; onValue(value: number): void;
}) {
  const { ref, gesture } = useGestureInput({ onGestureStart, onGestureEnd, onGestureCancel });
  return <input {...input} ref={ref} type="range" value={value}
    onPointerDown={e => { if (e.button === 0) gesture.begin(); input.onPointerDown?.(e); }}
    onPointerUp={e => { gesture.end(); input.onPointerUp?.(e); }}
    onPointerCancel={e => { gesture.end(); input.onPointerCancel?.(e); }}
    onChange={e => { gesture.begin(); onValue(e.target.valueAsNumber); }}
    onBlur={e => { gesture.end(); input.onBlur?.(e); }}
    onKeyDown={e => { if (e.key === 'Escape') gesture.cancel(); input.onKeyDown?.(e); }} />;
}
