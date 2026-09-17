import { useState, type ReactNode } from 'react';
import type { StandardOption } from '../../rack-generator/types.ts';
import './standard-size-control.css';

export function StandardSizeControl({ label, name, value, mixed, options, disabled, onValue, children, reset }: {
  label: string; name?: string; value: number; mixed?: boolean; options: readonly StandardOption[];
  reset?: ReactNode; disabled?: boolean; onValue: (value: number) => void; children: ReactNode;
}) {
  const [custom, setCustom] = useState(false);
  const match = mixed ? -1 : options.findIndex(option => Math.abs(option.value - value) < 1e-6);
  const expanded = custom || match === -1;
  function select(value: number) { onValue(value); setCustom(false); }
  return <span className="standard-size-control">
    <span className="standard-options" role="radiogroup" aria-label={label}>
      {options.map((option, index) => <button type="button" role="radio" key={option.value}
        aria-label={option.label} aria-checked={index === match} tabIndex={index === (match < 0 ? 0 : match) ? 0 : -1}
        disabled={disabled} onClick={() => select(option.value)}
        onKeyDown={event => {
          const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
          if (!delta && !['Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + delta + options.length) % options.length;
          select(options[next].value);
          (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
        }}>{option.label}</button>)}
    </span>
    <button type="button" className="custom-size" aria-label={`Custom ${label.toLowerCase()}`} aria-expanded={expanded}
      disabled={disabled} onClick={() => setCustom(!expanded)}>Custom {expanded ? '⌃' : '⌄'}</button>
    {!expanded && reset}
    {expanded ? children : <input type="hidden" name={name} value={value} />}
  </span>;
}
