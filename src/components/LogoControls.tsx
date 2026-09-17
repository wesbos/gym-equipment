import { ResetButton } from './ResetButton.tsx';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { BuilderStore } from '../state/builder-store.ts';
import type { LogoSource, ValidatedLogo } from '../../rack-generator/logos/types.ts';

export function LogoControls({ store }: { store: BuilderStore }) {
  const { doc, inputRevision } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [source, setSource] = useState<LogoSource>(doc.logo?.source ?? { kind: 'text', text: 'MY GYM', font: 'helvetiker' });
  const [bridges, setBridges] = useState(true), [preview, setPreview] = useState<ValidatedLogo | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const job = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => { job.current?.terminate(); job.current = null; if (timer.current) clearTimeout(timer.current); };
  useEffect(() => () => stop(), []);
  const savedSource = JSON.stringify(doc.logo?.source ?? null);
  useEffect(() => {
    stop(); setBusy(false); setSource(doc.logo?.source ?? { kind: 'text', text: 'MY GYM', font: 'helvetiker' }); setPreview(null); setError('');
  }, [savedSource, inputRevision]);
  function update(next: LogoSource) { stop(); setBusy(false); setSource(next); setPreview(null); setError(''); }
  function inspect() {
    stop(); setBusy(true); setPreview(null); setError('');
    const worker = new Worker(new URL('../../rack-generator/logos/logo-worker.ts', import.meta.url), { type: 'module' });
    job.current = worker;
    const fail = (message: string) => { stop(); setBusy(false); setError(message); };
    timer.current = setTimeout(() => fail('Logo processing exceeded 10 seconds. Simplify the artwork and try again.'), 10000);
    worker.onerror = () => fail('Logo worker failed. Simplify the artwork and try again.');
    worker.onmessage = ({ data }: MessageEvent<{ logo?: ValidatedLogo; error?: string }>) => {
      stop(); setBusy(false);
      if (data.error) setError(data.error); else setPreview(data.logo!);
    };
    worker.postMessage({ source, bridges });
  }
  async function upload(file?: File) {
    if (!file) return;
    stop(); setBusy(false); setPreview(null); setError('');
    try {
      if (file.size > 250000) throw Error('Choose a file smaller than 250 KB.');
      if (/\.svg$/i.test(file.name)) update({ kind: 'svg', data: await file.text() });
      else {
        if (!['image/png', 'image/jpeg'].includes(file.type)) throw Error('Choose SVG, PNG or JPEG.');
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
        update({ kind: 'raster', data, threshold: 128, contrast: 1 });
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to read file.'); }
  }
  return <details className="appearance-controls logo-controls">
    <summary>Custom logo</summary>
    <label className="field"><span>Logo source</span><select aria-label="Logo source" value={source.kind} onChange={e => update(e.target.value === 'text' ? { kind: 'text', text: 'MY GYM', font: 'helvetiker' } : e.target.value === 'svg' ? { kind: 'svg', data: '' } : { kind: 'raster', data: '', threshold: 128, contrast: 1 })}>
      <option value="text">Text</option><option value="svg">SVG upload</option><option value="raster">PNG / JPEG upload</option>
    </select></label>
    <ResetButton label="logo source" changed={source.kind !== 'text'} onReset={() => update({ kind: 'text', text: 'MY GYM', font: 'helvetiker' })} />
    {source.kind === 'text' ? <>
      <label className="field"><span>Logo text</span><input aria-label="Logo text" maxLength={32} value={source.text} onChange={e => update({ ...source, text: e.target.value })} /></label>
      <ResetButton label="logo text" value="MY GYM" changed={source.text !== 'MY GYM'} onReset={() => update({ ...source, text: 'MY GYM' })} />
      <label className="field"><span>Logo font</span><select aria-label="Logo font" value={source.font} onChange={e => update({ ...source, font: e.target.value as 'helvetiker' | 'helvetikerRegular' })}><option value="helvetiker">Helvetiker Bold</option><option value="helvetikerRegular">Helvetiker Regular</option></select></label>
      <ResetButton label="logo font" value="Helvetiker Bold" changed={source.font !== 'helvetiker'} onReset={() => update({ ...source, font: 'helvetiker' })} />
    </> : <label className="field"><span>Upload logo (250 KB maximum)</span><input key={source.data ? 'uploaded' : 'empty'} aria-label="Upload logo" type="file" accept=".svg,.png,.jpg,.jpeg" onChange={e => void upload(e.target.files?.[0])} /></label>}
    {source.kind !== 'text' && <ResetButton label="logo upload" changed={!!source.data} onReset={() => update({ ...source, data: '' })} />}
    {source.kind === 'raster' && <>
      <label className="field"><span>Threshold: {source.threshold ?? 128}</span><input aria-label="Logo threshold" type="range" min="1" max="254" value={source.threshold ?? 128} onChange={e => update({ ...source, threshold: Number(e.target.value) })} /></label>
      <ResetButton label="logo threshold" value={128} changed={(source.threshold ?? 128) !== 128} onReset={() => update({ ...source, threshold: 128 })} />
      <label className="field"><span>Contrast: {source.contrast ?? 1}</span><input aria-label="Logo contrast" type="range" min="0.5" max="3" step="0.1" value={source.contrast ?? 1} onChange={e => update({ ...source, contrast: Number(e.target.value) })} /></label>
      <ResetButton label="logo contrast" value={1} changed={(source.contrast ?? 1) !== 1} onReset={() => update({ ...source, contrast: 1 })} />
    </>}
    <label><input type="checkbox" checked={bridges} onChange={e => { stop(); setBusy(false); setBridges(e.target.checked); setPreview(null); }} /> Automatic island bridges</label>
    <ResetButton label="automatic island bridges" changed={!bridges} onReset={() => { stop(); setBusy(false); setBridges(true); setPreview(null); setError(''); }} />
    <button type="button" onClick={inspect}>{busy ? 'Restart preview' : 'Validate & preview logo'}</button>
    {busy && <p role="status">Tracing and validating logo…</p>}
    {error && <p role="alert">{error}</p>}
    {preview && <>
      <svg role="img" aria-label="Validated cut contour preview" viewBox="-94 -16 188 32" style={{ width: '100%', background: '#d5d8d1', marginTop: 12 }}>
        <path fill="#252a23" fillRule="evenodd" transform="scale(1,-1)" d={preview.loops.map(l => `M${l.map(p => p.join(',')).join('L')}Z`).join('')} />
      </svg>
      <p className="note">{preview.loops.length} closed contours · {preview.minimum} mm minimum feature. {preview.warnings.join(' ')}</p>
      <button type="button" onClick={() => store.act(() => store.commit({ ...store.getSnapshot().doc, logo: preview }))}>Apply logo to rack</button>
    </>}
    <ResetButton label="stock BOS lettering" changed={!!doc.logo} onReset={() => store.act(() => { const next = { ...store.getSnapshot().doc }; delete next.logo; store.commit(next); setPreview(null); })} />
  </details>;
}
