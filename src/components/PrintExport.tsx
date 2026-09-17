import './print-export.css';
import { useEffect, useRef, useState } from 'react';
import type { BuilderStore } from '../state/builder-store.ts';
import type { PrintLayout } from '../exports/print-3mf.ts';
import type { PrintRequest, PrintResponse } from '../exports/print-worker.ts';
export function PrintExport({store}: {store:BuilderStore}) {
  const [open,setOpen]=useState(false), [layout,setLayout]=useState<PrintLayout>('laid-out'), [busy,setBusy]=useState(false);
  const worker = useRef<Worker|null>(null);
  useEffect(()=>()=>worker.current?.terminate(),[]);
  const cancel = () => { worker.current?.terminate(); worker.current=null; setBusy(false); store.status('Print export cancelled.'); };
  const start = () => {
    if (worker.current) return;
    const doc = structuredClone(store.getSnapshot().doc);
    const w = new Worker(new URL('../exports/print-worker.ts',import.meta.url),{type:'module'});
    worker.current=w; setBusy(true); store.status('Building watertight print volumes…');
    const finish = () => { w.terminate(); worker.current=null; setBusy(false); };
    w.onerror = e => { finish(); store.status(`Print export failed: ${e.message}`,true); };
    w.onmessage = ({data}: MessageEvent<PrintResponse>) => {
      if (data.type==='progress') { store.status(`Preparing print parts ${data.done}/${data.total}…`); return; }
      finish();
      if (data.type==='error') { store.status(`Print export failed: ${data.error}`,true); return; }
      const url=URL.createObjectURL(new Blob([data.bytes],{type:'model/3mf'})), link=document.createElement('a');
      link.href=url; link.download='bos-strength-print-parts.3mf'; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      store.status(`3MF exported: ${data.report.instances} parts, ${data.report.volumes} watertight volumes · millimetres, 100% scale.${data.report.occludedComponents.length ? ` ${data.report.occludedComponents.length} fully covered components omitted (see archive report).` : ''}`);
      setOpen(false);
    };
    w.postMessage({doc,options:{layout}} satisfies PrintRequest);
  };
  return <div className="print-export">
    <button id="print-export" onClick={()=>setOpen(!open)} aria-expanded={open}>Export 3MF</button>
    {open && <section aria-label="Print export options" className="print-export-options">
      <strong>Printable rack parts · 3MF</strong>
      <p>Each physical part is a separate object with named color volumes. Full size in millimetres; no automatic printer scaling.</p>
      <label>Part arrangement <select aria-label="Print arrangement" disabled={busy} value={layout} onChange={e=>setLayout(e.target.value as PrintLayout)}>
        <option value="laid-out">Lay parts flat, spaced in a row</option><option value="assembled">Keep rack assembly coordinates (Z up)</option>
      </select></label>
      <p>Flat mode minimizes axis-aligned height and places parts on Z = 0, with 20 mm gaps. Arrange for your bed and check supports in the slicer. Full-size rack members exceed desktop printer beds.</p>
      <p>Open as a project to retain colors. Choose your own printer and filament profiles: the file has a placeholder 256 mm bed, 0.4 mm nozzle and Generic PLA color slots.</p>
      <p>Overlaps within each part are cut; later catalog volumes keep their color. Textures and metal finishes export as dominant solid colors only.</p>
      <button className="primary" disabled={busy || !store.getSnapshot().resolved.length} onClick={start}>{busy?'Preparing…':'Download 3MF'}</button>
      {busy ? <button onClick={cancel}>Cancel export</button> : <button onClick={()=>setOpen(false)}>Close</button>}
    </section>}
  </div>;
}
