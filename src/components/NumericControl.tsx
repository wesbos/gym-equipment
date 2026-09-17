import { StandardSizeControl } from './StandardSizeControl.tsx';
import type { StandardOption } from '../../rack-generator/types.ts';
import { useEffect, useRef, useState, type PointerEvent } from "react";
import "./numeric-control.css";
export interface NumericControlProps {
  label: string;
  standardOptions?: readonly StandardOption[];
  showSlider?: boolean;
  name?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number | "any";
  disabled?: boolean;
  /** Domain-specific snapping can be supplied without coupling this control to rack topology. */
  normalize?: (value: number) => number;
  advance?: (value: number, direction: -1 | 1) => number;
  onValue: (value: number) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  onInvalid?: () => void;
}
export function NumericControl(props: NumericControlProps) {
  if (!props.standardOptions?.length) return <FreeformNumericControl {...props} />;
  return <StandardSizeControl {...props} options={props.standardOptions} onValue={value => {
    props.onGestureEnd?.();
    props.onGestureStart?.();
    props.onValue(props.normalize ? props.normalize(value) : value);
    props.onGestureEnd?.();
  }}><FreeformNumericControl {...props} showSlider={false} /></StandardSizeControl>;
}
function FreeformNumericControl({
  label,
  showSlider = true,
  name,
  value,
  min,
  max,
  step = 1,
  disabled,
  normalize,
  advance,
  onValue,
  onGestureStart,
  onGestureEnd,
  onInvalid,
}: NumericControlProps) {
  const [text, setText] = useState(String(value));
  const [dragging, setDragging] = useState(false);
  const last = useRef(value);
  const range = useRef({
    min: Math.min(0, value),
    max: Math.max(100, value * 2),
  });
  const gesture = useRef(false);
  const pointer = useRef<{
    id: number;
    x: number;
    value: number;
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    if (value !== last.current) {
      setText(String(value));
      last.current = value;
    }
  }, [value]);
  const parsed = text.trim() === "" ? NaN : Number(text);
  const invalid =
    !Number.isFinite(parsed) ||
    (min !== undefined && parsed < min) ||
    (max !== undefined && parsed > max);
  function begin() {
    if (!gesture.current) {
      gesture.current = true;
      onGestureStart?.();
    }
  }
  function end() {
    if (gesture.current) {
      gesture.current = false;
      onGestureEnd?.();
    }
  }
  function emit(next: number) {
    const normalized = Math.min(
      max ?? Infinity,
      Math.max(min ?? -Infinity, normalize ? normalize(next) : next),
    );
    if (!Number.isFinite(normalized)) {
      onInvalid?.();
      return;
    }
    last.current = normalized;
    onValue(normalized);
    if (normalized !== next) setText(String(normalized));
  }
  function scrub(next: number) {
    const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next));
    const rounded = Number(bounded.toFixed(6));
    setText(String(rounded));
    emit(rounded);
  }
  function release(e: PointerEvent<HTMLInputElement>) {
    if (!pointer.current || e.pointerId !== pointer.current.id) return;
    const moved = pointer.current.moved;
    pointer.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (moved) {
      end();
      e.currentTarget.blur();
    }
  }
  return (
    <span className="numeric-control">
      <input
        id={name}
        name={name}
        type="number"
        aria-label={label}
        aria-invalid={invalid}
        title="Drag to scrub · Shift for fine steps · click to type"
        value={text}
        min={min}
        max={max}
        step={advance ? "any" : step}
        disabled={disabled}
        required
        className={dragging ? "scrubbing" : ""}
        onKeyDown={e => {
          if (advance && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault(); begin(); scrub(advance(value, e.key === 'ArrowUp' ? 1 : -1));
          }
        }}
        onFocus={begin}
        onBlur={() => {
          if (!pointer.current?.moved) end();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          begin();
          const next = raw.trim() === "" ? NaN : Number(raw);
          if (
            Number.isFinite(next) &&
            (min === undefined || next >= min) &&
            (max === undefined || next <= max)
          )
            emit(next);
          else onInvalid?.();
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          begin();
          pointer.current = {
            id: e.pointerId,
            x: e.clientX,
            value: Number.isFinite(parsed) ? parsed : value,
            moved: false,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = pointer.current;
          if (!start || start.id !== e.pointerId) return;
          const delta = e.clientX - start.x;
          if (!start.moved && Math.abs(delta) < 4) return;
          start.moved = true;
          setDragging(true);
          e.preventDefault();
          const increment =
            (step === "any" ? 0.1 : step) * (e.shiftKey ? 0.1 : 1);
          scrub(start.value + Math.round(delta / 4) * increment);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={() => {
          if (pointer.current) {
            pointer.current = null;
            setDragging(false);
            end();
          }
        }}
        onDoubleClick={(e) => e.currentTarget.select()}
      />
      {showSlider && <input
        type="range"
        aria-label={`${label} slider`}
        min={min ?? Math.min(range.current.min, value)}
        max={max ?? Math.max(range.current.max, value)}
        step={advance ? "any" : step === "any" ? 0.1 : step}
        value={value}
        disabled={disabled}
        onFocus={begin}
        onBlur={end}
        onPointerDown={begin}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={e => {
          begin();
          if (advance && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            e.preventDefault(); scrub(advance(value, e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1));
          }
        }}
        onKeyUp={end}
        onChange={(e) => {
          begin();
          scrub(e.target.valueAsNumber);
        }}
      />}
      {invalid && (
        <small role="status">
          Enter a number{min !== undefined ? ` ≥ ${min}` : ""}
          {max !== undefined ? ` ≤ ${max}` : ""}.
        </small>
      )}
    </span>
  );
}
