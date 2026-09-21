import { useState, type ReactNode } from 'react';
import { Icon } from '../SelectionBar/icons.tsx';

/** Open/closed per section id, remembered per browser (a convenience only: storage may be unavailable). */
const STORAGE_KEY = 'bos-strength-inspector-sections-v1';
let remembered: Record<string, boolean> | null = null;
function read() {
  if (remembered) return remembered;
  try { remembered = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}; } catch { remembered = {}; }
  return remembered!;
}
function write(id: string, open: boolean) {
  read()[id] = open;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remembered)); } catch { /* private mode: keep it in memory */ }
}
/** A collapsible inspector group (Placement, Options, Appearance, Plates, Logo, Advanced). */
export function Section({ id, title, children, defaultOpen = true, badge, className = '' }: {
  id: string; title: string; children: ReactNode; defaultOpen?: boolean; badge?: ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(() => read()[id] ?? defaultOpen);
  return <details className={`insp-section ${className}`} data-section={id} open={open}
    onToggle={e => { const next = e.currentTarget.open; if (next !== open) { setOpen(next); write(id, next); } }}>
    <summary><span className="insp-section-title">{title}</span>{badge !== undefined && <span className="insp-section-badge">{badge}</span>}<Icon name="chevron" size={16} /></summary>
    <div className="insp-section-body">{children}</div>
  </details>;
}

/** Open state for self-contained <details> panels (logo, systems) that the inspector remounts on selection and history
 * changes: kept for this page session only, so a fresh load always starts them collapsed. */
const sessionOpen = new Map<string, boolean>();
export function useSessionOpen(id: string, defaultOpen = false) {
  const [open, setOpen] = useState(() => sessionOpen.get(id) ?? defaultOpen);
  const onToggle = (e: { currentTarget: HTMLDetailsElement }) => { const next = e.currentTarget.open; sessionOpen.set(id, next); if (next !== open) setOpen(next); };
  return { open, onToggle };
}
