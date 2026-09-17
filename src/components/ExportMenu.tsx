import './export-menu.css';
import { useEffect, useId, useRef, useState } from 'react';
import { ResetButton } from './ResetButton.tsx';
import type { BuilderStore } from '../state/builder-store.ts';
import type { PrintLayout } from '../exports/print-3mf.ts';
import { ExportJob, readExportFormat, rememberExportFormat, type ExportFormat } from '../exports/export-job.ts';

const DEFAULT_LAYOUT: PrintLayout = 'laid-out';
const formats: ExportFormat[] = ['glb', '3mf'];

export function ExportMenu({ store, exportGLB, loading, empty }: {
  store: BuilderStore; exportGLB: () => Promise<ArrayBuffer>; loading: boolean; empty: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>(() => {
    try { return readExportFormat(sessionStorage); } catch { return 'glb'; }
  });
  const [focusedFormat, setFocusedFormat] = useState<ExportFormat>(format);
  const [layout, setLayout] = useState<PrintLayout>(DEFAULT_LAYOUT);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const latestGLB = useRef(exportGLB);
  latestGLB.current = exportGLB;
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  };
  const [job] = useState(() => new ExportJob({
    createWorker: () => new Worker(new URL('../exports/print-worker.ts', import.meta.url), { type: 'module' }),
    exportGLB: () => latestGLB.current(),
    busy: setBusy,
    status: (message, error) => store.status(message, error),
    complete: () => close(!!root.current?.contains(document.activeElement)),
    download: (blob, filename) => {
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url;
      link.download = filename;
      try { link.click(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    },
  }));
  useEffect(() => () => job.dispose(), [job]);
  useEffect(() => {
    if (!open) return;
    items.current[formats.indexOf(format)]?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
    // Focus the remembered choice on opening, not when selecting a format.
  }, [open]);

  const start = () => {
    if (busy || empty || (format === 'glb' && loading)) return;
    try { rememberExportFormat(sessionStorage, format); } catch { /* Storage may be unavailable. */ }
    // Keep focus inside the popover before disabling its download button.
    items.current[formats.indexOf(format)]?.focus();
    void job.start(format, store.getSnapshot().doc, layout);
  };
  return <div className="export-menu" ref={root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); }
    }}>
    <button id="export" ref={trigger} className="primary" type="button"
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      aria-describedby="status" onClick={() => setOpen(!open)}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          if (open) items.current[formats.indexOf(format)]?.focus();
        }
      }}>{busy ? `Exporting ${busy.toUpperCase()}…` : 'Export ⌄'}</button>
    {open && <section className="export-menu-options" aria-label="Export options">
      <div id={menuId} role="menu" aria-label="Export format" onKeyDown={event => {
        const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
        let next: number | undefined;
        if (event.key === 'ArrowDown') next = (index + 1) % formats.length;
        if (event.key === 'ArrowUp') next = (index + formats.length - 1) % formats.length;
        if (event.key === 'Home' || event.key.toLowerCase() === 'g') next = 0;
        if (event.key === 'End' || event.key === '3') next = 1;
        if (next !== undefined) { event.preventDefault(); event.stopPropagation(); items.current[next]?.focus(); }
      }}>
        {formats.map((value, index) => <button key={value} type="button" role="menuitemradio"
          ref={element => { items.current[index] = element; }}
          aria-checked={format === value} aria-disabled={!!busy}
          tabIndex={focusedFormat === value ? 0 : -1}
          onFocus={() => setFocusedFormat(value)}
          onClick={() => { if (!busy) setFormat(value); }}>
          <span aria-hidden="true">{format === value ? '●' : '○'}</span> {value === 'glb' ? 'GLB — rack scene' : '3MF — print ready'}
        </button>)}
      </div>
      {format === '3mf' && <div className="export-print-options">
        <label>Part arrangement <select aria-label="Print arrangement" disabled={!!busy} value={layout}
          onChange={event => setLayout(event.target.value as PrintLayout)}>
          <option value="laid-out">Laid out — flat, spaced in a row</option>
          <option value="assembled">Assembled — rack coordinates (Z up)</option>
        </select></label>
        <ResetButton label="print arrangement" value="laid out" changed={layout !== DEFAULT_LAYOUT}
          disabled={!!busy} onReset={() => setLayout(DEFAULT_LAYOUT)} />
        <p>One file · Separate named objects · Millimetres · 100% scale</p>
        <dl className="export-print-facts">
          <dt>Colors</dt><dd>Solid colors; textures omitted</dd>
          <dt>Profile</dt><dd>Placeholder: 256 mm bed · 0.4 mm nozzle · PLA</dd>
        </dl>
        <p>Open as project. Select your printer and filaments.</p>
        <a href="https://github.com/wesbos/gym-equipment/blob/main/docs/print-export.md" target="_blank" rel="noreferrer">Export details ↗</a>
      </div>}
      <div className="export-menu-actions">
        <button type="button" className="primary" disabled={!!busy || empty || (format === 'glb' && loading)}
          onClick={start}>{busy ? 'Preparing…' : `Download ${format.toUpperCase()}`}</button>
        {busy === '3mf' && <button type="button" onClick={() => { job.cancel(); items.current[1]?.focus(); }}>Cancel export</button>}
      </div>
    </section>}
  </div>;
}
