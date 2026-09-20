import type { ReactNode } from 'react';
import { ResetButton } from '../ResetButton.tsx';

export interface ChoiceOption<T extends string | number> { value: T; label: string }
/** Segmented buttons read best up to six short options; longer lists fall back to a native select. */
export const SEGMENT_LIMIT = 6;
export const segmented = (options: readonly ChoiceOption<string | number>[]) =>
  options.length > 1 && options.length <= SEGMENT_LIMIT && options.reduce((n, o) => n + o.label.length, 0) <= 34;

/** A labelled inspector row: label and reset on top, the control underneath. */
export function Row({ label, children, reset, hint }: { label: ReactNode; children: ReactNode; reset?: ReactNode; hint?: ReactNode }) {
  return <div className="field insp-row"><span>{label}</span>{children}{reset}{hint && <small className="insp-hint">{hint}</small>}</div>;
}

/** One value from a short list: a segmented radio group (≤ 6 short options) or a select. Both carry `label` as their
 * accessible name, and each segment its `data-value`, so tests and screen readers find them the same way. */
export function Choice<T extends string | number>({ label, value, options, onChange, disabled, name, reset, forceSelect = false }: {
  label: string; value: T; options: readonly ChoiceOption<T>[]; onChange(value: T): void; disabled?: boolean; name?: string;
  reset?: { changed: boolean; onReset(): void; label?: string }; forceSelect?: boolean;
}) {
  const resetButton = reset && <ResetButton label={reset.label ?? label} changed={reset.changed} disabled={disabled} onReset={reset.onReset} />;
  if (forceSelect || !segmented(options)) {
    return <Row label={label} reset={resetButton}>
      <select aria-label={label} name={name} value={String(value)} disabled={disabled}
        onChange={e => onChange(options.find(o => String(o.value) === e.target.value)!.value)}>
        {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </Row>;
  }
  const index = options.findIndex(o => o.value === value);
  return <Row label={label} reset={resetButton}>
    <span className="insp-segmented" role="radiogroup" aria-label={label} aria-disabled={disabled || undefined}>
      {options.map((o, i) => <button key={String(o.value)} type="button" role="radio" aria-checked={i === index} data-value={String(o.value)}
        tabIndex={i === (index < 0 ? 0 : index) ? 0 : -1} disabled={disabled}
        onClick={() => { if (o.value !== value) onChange(o.value); }}
        onKeyDown={e => {
          const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          if (!delta) return;
          e.preventDefault();
          const next = (i + delta + options.length) % options.length;
          onChange(options[next].value);
          (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
        }}>{o.label}</button>)}
    </span>
    {name && <input type="hidden" name={name} value={String(value)} />}
  </Row>;
}

/** Colour swatches with an optional "default" chip; `value` undefined means the default is in use. */
export function Swatches({ label, colors, value, onChange, defaultLabel = 'Default', reset }: {
  label: string; colors: readonly (readonly [string, string])[]; value: string | undefined; onChange(color: string | undefined): void;
  defaultLabel?: string; reset?: { changed: boolean; onReset(): void };
}) {
  return <Row label={label} reset={reset && <ResetButton label={label.toLowerCase()} changed={reset.changed} onReset={reset.onReset} />}>
    <span className="insp-swatches" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={value === undefined} className="insp-swatch insp-swatch-default" data-value="" title={defaultLabel} aria-label={`${label}: ${defaultLabel}`} onClick={() => onChange(undefined)}>
        <span aria-hidden="true" />
      </button>
      {colors.map(([name, hex]) => <button type="button" role="radio" key={hex} aria-checked={value?.toLowerCase() === hex.toLowerCase()} className="insp-swatch" data-value={hex}
        title={name} aria-label={`${label}: ${name}`} onClick={() => onChange(hex)}><span aria-hidden="true" style={{ background: hex }} /></button>)}
    </span>
  </Row>;
}

/** Sticky bottom bar of the inspector: primary action first, destructive last. */
export function InspectorFooter({ children }: { children: ReactNode }) {
  return <div className="insp-footer">{children}</div>;
}
