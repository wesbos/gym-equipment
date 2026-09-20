import { LOGO_DEFAULTS, defaultLogoSource, isDefaultLogoSource } from './logo-defaults.ts';
import { ResetButton } from './ResetButton.tsx';
import { GestureRange } from './GestureInputs.tsx';
import { useEffect, useRef, useState } from 'react';
import { deepEqual, useStoreSelector } from '../state/use-store.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import type { LogoSource, ValidatedLogo } from '../../rack-generator/logos/types.ts';

export function LogoControls({ store }: { store: BuilderStore }) {
  const { logo, inputRevision } = useStoreSelector(store, s => ({ logo: s.doc.logo, inputRevision: s.inputRevision }), deepEqual);
  const [source, setSource] = useState<LogoSource>(logo?.source ?? defaultLogoSource());
  const [bridges, setBridges] = useState<boolean>(LOGO_DEFAULTS.bridges), [preview, setPreview] = useState<ValidatedLogo | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const job = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // File reads cannot all be aborted; queued callbacks can also outlive terminate().
  const generation = useRef(0);
  const stop = () => { generation.current++; job.current?.terminate(); job.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => stop(), []);
  const savedSource = JSON.stringify(logo?.source ?? null);
  useEffect(() => {
    stop(); setBusy(false); setSource(logo?.source ?? defaultLogoSource()); setBridges(LOGO_DEFAULTS.bridges); setPreview(null); setError('');
  }, [savedSource, inputRevision]);
  function update(next: LogoSource) { stop(); setBusy(false); setSource(next); setPreview(null); setError(''); }
  function inspect() {
    stop(); setBusy(true); setPreview(null); setError('');
    const token = generation.current;
    const worker = new Worker(new URL('../../rack-generator/logos/logo-worker.ts', import.meta.url), { type: 'module' });
    job.current = worker;
    const fail = (message: string) => { if (token !== generation.current) return; stop(); setBusy(false); setError(message); };
    timer.current = setTimeout(() => fail('Logo processing exceeded 10 seconds. Simplify the artwork and try again.'), 10000);
    worker.onerror = () => fail('Logo worker failed. Simplify the artwork and try again.');
    worker.onmessage = ({ data }: MessageEvent<{ logo?: ValidatedLogo; error?: string }>) => {
      if (token !== generation.current) return;
      stop(); setBusy(false);
      if (data.error) setError(data.error); else setPreview(data.logo!);
    };
    worker.postMessage({ source, bridges });
  }
  async function upload(file?: File) {
    if (!file) return;
    stop(); setBusy(true); setPreview(null); setError('');
    const token = generation.current;
    try {
      if (file.size > 250000) throw Error('Choose a file smaller than 250 KB.');
      if (/\.svg$/i.test(file.name)) {
        const data = await file.text();
        if (token === generation.current) update({ kind: 'svg', data });
      }
      else {
        if (!['image/png', 'image/jpeg'].includes(file.type)) throw Error('Choose SVG, PNG or JPEG.');
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
        if (token === generation.current) update({ kind: 'raster', data, threshold: LOGO_DEFAULTS.threshold, contrast: LOGO_DEFAULTS.contrast });
      }
    } catch (e) { if (token === generation.current) { stop(); setBusy(false); setError(e instanceof Error ? e.message : 'Unable to read file.'); } }
  }
  function resetStock() {
    update(defaultLogoSource()); setBridges(LOGO_DEFAULTS.bridges);
    // Draft-only reset must not create document history or discard redo.
    if (store.getSnapshot().doc.logo) store.act(() => {
      const next = { ...store.getSnapshot().doc }; delete next.logo; store.commit(next);
    });
  }
  // Raster tuning is draft-only today; bracketing keeps a single entry if it ever commits live.
  const gesture = { onGestureStart: store.beginGesture, onGestureEnd: store.endGesture, onGestureCancel: store.cancelGesture };
  const canResetStock = !!logo || !isDefaultLogoSource(source) || bridges !== LOGO_DEFAULTS.bridges || !!preview || !!error || busy;
  return <details className="appearance-controls logo-controls">
    <summary>Custom logo</summary>
    <label className="field"><span>Logo source</span><select aria-label="Logo source" value={source.kind} onChange={e => update(defaultLogoSource(e.target.value as LogoSource['kind']))}>
      <option value="text">Text</option><option value="svg">SVG upload</option><option value="raster">PNG / JPEG upload</option>
    </select></label>
    <ResetButton label="logo source" changed={source.kind !== 'text'} onReset={() => update(defaultLogoSource())} />
    {source.kind === 'text' ? <>
      <label className="field"><span>Logo text</span><input aria-label="Logo text" maxLength={32} value={source.text} onChange={e => update({ ...source, text: e.target.value })} /></label>
      <ResetButton label="logo text" value={LOGO_DEFAULTS.text} changed={source.text !== LOGO_DEFAULTS.text} onReset={() => update({ ...source, text: LOGO_DEFAULTS.text })} />
      <label className="field"><span>Logo font</span><select aria-label="Logo font" value={source.font} onChange={e => update({ ...source, font: e.target.value as 'helvetiker' | 'helvetikerRegular' })}><option value="helvetiker">Helvetiker Bold</option><option value="helvetikerRegular">Helvetiker Regular</option></select></label>
      <ResetButton label="logo font" value="Helvetiker Bold" changed={source.font !== LOGO_DEFAULTS.font} onReset={() => update({ ...source, font: LOGO_DEFAULTS.font })} />
    </> : <label className="field"><span>Upload logo (250 KB maximum)</span><input key={source.data ? 'uploaded' : 'empty'} aria-label="Upload logo" type="file" accept=".svg,.png,.jpg,.jpeg" onChange={e => void upload(e.target.files?.[0])} /></label>}
    {source.kind !== 'text' && <ResetButton label="logo upload" changed={!!source.data} onReset={() => update({ ...source, data: '' })} />}
    {source.kind === 'raster' && <>
      <label className="field"><span>Threshold: {source.threshold ?? LOGO_DEFAULTS.threshold}</span><GestureRange {...gesture} aria-label="Logo threshold" min="1" max="254" value={source.threshold ?? LOGO_DEFAULTS.threshold} onValue={threshold => update({ ...source, threshold })} /></label>
      <ResetButton label="logo threshold" value={LOGO_DEFAULTS.threshold} changed={(source.threshold ?? LOGO_DEFAULTS.threshold) !== LOGO_DEFAULTS.threshold} onReset={() => update({ ...source, threshold: LOGO_DEFAULTS.threshold })} />
      <label className="field"><span>Contrast: {source.contrast ?? LOGO_DEFAULTS.contrast}</span><GestureRange {...gesture} aria-label="Logo contrast" min="0.5" max="3" step="0.1" value={source.contrast ?? LOGO_DEFAULTS.contrast} onValue={contrast => update({ ...source, contrast })} /></label>
      <ResetButton label="logo contrast" value={LOGO_DEFAULTS.contrast} changed={(source.contrast ?? LOGO_DEFAULTS.contrast) !== LOGO_DEFAULTS.contrast} onReset={() => update({ ...source, contrast: LOGO_DEFAULTS.contrast })} />
    </>}
    <label><input type="checkbox" checked={bridges} onChange={e => { stop(); setBusy(false); setBridges(e.target.checked); setPreview(null); }} /> Automatic island bridges</label>
    <ResetButton label="automatic island bridges" changed={bridges !== LOGO_DEFAULTS.bridges} onReset={() => { stop(); setBusy(false); setBridges(LOGO_DEFAULTS.bridges); setPreview(null); setError(''); }} />
    <button type="button" onClick={inspect}>{busy ? 'Restart preview' : 'Validate & preview logo'}</button>
    {busy && <p role="status">Processing logo…</p>}
    {error && <p role="alert">{error}</p>}
    {preview && <>
      <svg role="img" aria-label="Validated cut contour preview" viewBox="-94 -16 188 32" style={{ width: '100%', background: '#d5d8d1', marginTop: 12 }}>
        <path fill="#252a23" fillRule="evenodd" transform="scale(1,-1)" d={preview.loops.map(l => `M${l.map(p => p.join(',')).join('L')}Z`).join('')} />
      </svg>
      <p className="note">{preview.loops.length} closed contours · {preview.minimum} mm minimum feature. {preview.warnings.join(' ')}</p>
      <button type="button" onClick={() => store.act(() => store.commit({ ...store.getSnapshot().doc, logo: preview }))}>Apply logo to rack</button>
    </>}
    <ResetButton label="stock BOS lettering" changed={canResetStock} onReset={resetStock} />
  </details>;
}
