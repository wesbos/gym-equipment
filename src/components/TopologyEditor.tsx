import { gridProfile } from '../../rack-generator/profiles.ts';
import './TopologyEditor.css';
import { useState } from 'react';
import { connectUprights, extendUpright, moveConnection, moveUpright, spanAccessory, type Direction } from '../../rack-generator/graph-edits.ts';
import { removeInstance } from '../../rack-generator/assembly.ts';
import type { RackDoc, PartId } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
/** A top-view ghost stays local until Apply; all edits go through normal undo/history. */
export function TopologyEditor({ doc, store, selected }: { doc: RackDoc; store: BuilderStore; selected: string | null }) {
  const [preview, setPreview] = useState<RackDoc | null>(null);
  const [error, setError] = useState('');
  const ids = Object.keys(doc.uprights).filter(id => !doc.removed.includes(id));
  function propose(action: () => RackDoc) {
    try { setPreview(action()); setError(''); } catch (e) { setPreview(null); setError((e as Error).message); }
  }
  const edge = doc.connections.find(e => e.id === selected);
  const shown = preview ?? doc, entries = Object.entries(shown.uprights).filter(([id]) => !shown.removed.includes(id));
  const minX = Math.min(...entries.map(([,p]) => p.x))-200, minY = Math.min(...entries.map(([,p]) => p.y))-200;
  const width = Math.max(...entries.map(([,p]) => p.x))-minX+200, height = Math.max(...entries.map(([,p]) => p.y))-minY+200;
  return <details className="topology-editor" open><summary>Uprights & connections</summary>
    <svg role="img" aria-label="Top view placement preview" viewBox={`${minX} ${minY} ${width} ${height}`} style={{width:'100%',height:150,background:'#202020'}}>
      {shown.connections.filter(e => !shown.removed.includes(e.id)).map(e => <line key={e.id} x1={shown.uprights[e.from].x} y1={shown.uprights[e.from].y} x2={shown.uprights[e.to].x} y2={shown.uprights[e.to].y} stroke={preview && !doc.connections.some(old => old.id === e.id) ? '#f0ac59':'#888'} strokeWidth={20} />)}
      {shown.accessories.filter(a => a.spanTo).map(a => <line key={a.id} x1={shown.uprights[a.target.uprightId].x} y1={shown.uprights[a.target.uprightId].y} x2={shown.uprights[a.spanTo!].x} y2={shown.uprights[a.spanTo!].y} stroke="#82bdd8" strokeWidth={12} />)}
      {entries.map(([id,p]) => <g key={id} role="button" tabIndex={0} aria-label={`Select ${id}`} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); store.select(id); setPreview(null); } }} onClick={() => { store.select(id); setPreview(null); }} style={{cursor:'pointer'}}><title>{id}</title><rect x={p.x-38} y={p.y-38} width={76} height={76} fill={id === selected ? '#fff' : preview && !doc.uprights[id] ? '#f0ac59' : '#aaa'} /><text x={p.x} y={p.y+105} textAnchor="middle" fill="white" fontSize={55}>{id}</text></g>)}
    </svg>
    <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); propose(() => extendUpright(doc, String(f.get('from')), f.get('direction') as Direction, Number(f.get('span')))); }}>
      <label>From upright<select name="from" defaultValue={selected && ids.includes(selected) ? selected : ids[0]}>{ids.map(id => <option key={id}>{id}</option>)}</select></label>
      <label>Direction<select name="direction"><option value="left">Left</option><option value="right">Right</option><option value="rear">Rear</option><option value="front">Front</option></select></label>
      <label>Clear span<select name="span">{gridProfile(doc.profileId).depths.map(n => <option key={n}>{n}</option>)}</select></label>
      <button>Preview add upright</button>
    </form>
    <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget), from = String(f.get('from')), to = String(f.get('to')), kind = String(f.get('kind')); propose(() => kind === 'upper' || kind === 'lower' ? connectUprights(doc, from, to, kind) : spanAccessory(doc, from, to, kind as PartId, Number(f.get('hole'))-1)); }}>
      <label>Start<select name="from">{ids.map(id => <option key={id}>{id}</option>)}</select></label>
      <label>End<select name="to" defaultValue={ids[1]}>{ids.map(id => <option key={id}>{id}</option>)}</select></label>
      <label>Connection<select name="kind"><option value="upper">Upper crossmember</option><option value="lower">Lower crossmember</option><option value="pullup-straight">Straight pull-up bar</option><option value="safety-box">Box safety</option><option value="safety-pin-pipe">Pin-pipe safety</option><option value="safety-webbing">Webbing safety</option></select></label>
      <label>Hole number<input name="hole" type="number" step={doc.rack.benchSpacing ? 0.5 : 1} min="1" defaultValue="25" /></label>
      <button>Preview connection</button>
    </form>
    {selected && doc.uprights[selected] && <form key={selected+JSON.stringify(doc.uprights[selected])} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); propose(() => moveUpright(doc, selected, Number(f.get('x')), Number(f.get('y')))); }}>
      <p>{selected} · {doc.rack.pitch} mm grid</p>
      <label>X (mm)<input name="x" type="number" step="any" defaultValue={doc.uprights[selected].x}/></label>
      <label>Depth (mm)<input name="y" type="number" step="any" defaultValue={doc.uprights[selected].y}/></label>
      <button>Preview move</button><button type="button" onClick={() => propose(() => removeInstance(doc, selected))}>Preview remove upright</button>
    </form>}
    {edge && <form key={JSON.stringify(edge)} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); propose(() => moveConnection(doc, edge.id, String(f.get('from')), String(f.get('to')), f.get('level') as 'upper' | 'lower')); }}>
      <p>Move connection {edge.id}</p>
      <label>From<select name="from" defaultValue={edge.from}>{ids.map(id => <option key={id}>{id}</option>)}</select></label>
      <label>To<select name="to" defaultValue={edge.to}>{ids.map(id => <option key={id}>{id}</option>)}</select></label>
      <label>Level<select name="level" defaultValue={edge.level}><option>upper</option><option>lower</option></select></label>
      <button>Preview move connection</button>
      <button type="button" onClick={() => propose(() => removeInstance(doc,edge.id))}>Preview remove connection</button>
    </form>}
    <p role="status">{error || (preview ? 'Preview' : '')}</p>
    {preview && <><button type="button" onClick={() => { store.act(() => store.commit(preview)); setPreview(null); }}>Apply topology</button><button type="button" onClick={() => setPreview(null)}>Cancel preview</button></>}
  </details>;
}
