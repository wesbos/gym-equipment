import { ResetButton } from './ResetButton.tsx';
import type { Accessory, CrossmemberTopTarget } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { rackPart, coerceRackParams } from '../../rack-generator/rack-registry.ts';
import { floorOptions } from '../../rack-generator/floor-part.ts';
import { rackTopMounts } from '../../rack-generator/rack-mounts.ts';
/** Registry rack parts (#131): one select per entry param (same pattern as FloorInspector), plus the rail station
 * pickers for crossmember-top mounts. Upright, face, hole and pairing stay in the shared accessory inspector. */
export function RackPartControls({ store, entry }: { store: BuilderStore; entry: Accessory }) {
  const part = rackPart(entry.part);
  if (!part) return null;
  const doc = store.getSnapshot().doc, params = { ...part.defaults, ...entry.params };
  const commit = (update: (a: Accessory) => void) => store.act(() => { const next = structuredClone(store.getSnapshot().doc); update(next.accessories.find(a => a.id === entry.id)!); store.commit(next); });
  // Saved params stay sparse: only values that differ from the entry defaults are stored.
  const setParams = (values: Record<string, number>) => commit(a => { const full = coerceRackParams(part, values); a.params = Object.fromEntries(Object.entries(full).filter(([k, v]) => v !== part.defaults[k])); });
  const mounts = entry.target.kind === 'crossmember-top' ? rackTopMounts(doc, entry.part) : [];
  const key = (t: CrossmemberTopTarget) => `${t.connectionId}:${t.station}:${t.side}`;
  const setTarget = (value: string, pair = false) => commit(a => {
    const t = mounts.find(m => m.kind === 'crossmember-top' && key(m) === value);
    if (t?.kind !== 'crossmember-top') return;
    const target: CrossmemberTopTarget = { kind: t.kind, connectionId: t.connectionId, station: t.station, side: t.side, uprightId: t.uprightId, face: t.face, hole: 0 };
    if (pair) a.pairTarget = target; else { a.target = target; delete a.pairTarget; }
  });
  const stations = (value: string, onChange: (value: string) => void, label: string) => <label className="field"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    {mounts.map(m => m.kind === 'crossmember-top' && <option key={key(m)} value={key(m)}>{m.connectorId} · hole {m.station + 1} · side {m.side}</option>)}</select></label>;
  return <>
    {entry.target.kind === 'crossmember-top' && <>
      {stations(key(entry.target), value => setTarget(value), 'Crossmember top / side bolt station')}
      {part.pair && <label className="field"><span>Matching crossmember pair</span><input type="checkbox" checked={entry.paired} onChange={e => commit(a => { a.paired = e.target.checked; })} /></label>}
      {entry.paired && entry.pairTarget && stations(key(entry.pairTarget), value => setTarget(value, true), 'Second unit target')}
    </>}
    {part.params.map(param => {
      const { key: name, label, format = String } = param;
      return <label className="field" key={name}><span>{label}</span>
        <select aria-label={label} name={name} value={params[name]} onChange={e => setParams({ ...params, [name]: Number(e.target.value) })}>
          {floorOptions(param, params).map(v => <option key={v} value={v}>{format(v)}</option>)}
        </select>
        <ResetButton label={label} changed={params[name] !== part.defaults[name]} onReset={() => setParams({ ...params, [name]: part.defaults[name] })} />
      </label>;
    })}
  </>;
}
