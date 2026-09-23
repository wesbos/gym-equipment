import { ResetButton } from './ResetButton.tsx';
import type { Accessory, CrossmemberTopTarget, HostedTarget, Mount, PartId } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { rackPart, coerceRackParams, rackTargets, type RackTargetKind } from '../../rack-generator/rack-registry.ts';
import { floorOptions } from '../../rack-generator/floor-part.ts';
import { rackRailMounts } from '../../rack-generator/rack-mounts.ts';
import { isHostedTarget, isRailTarget, targetKind } from '../../rack-generator/rack-targets.ts';
import { useMemo } from 'react';
import { placementMounts, proposalAt, scoreMount } from '../../rack-generator/placement-proposals.ts';
const KIND_LABELS: Record<RackTargetKind, string> = { upright: 'Upright hole', 'crossmember-top': 'Crossmember top', 'crossmember-under': 'Under a crossmember', 'spotter-arm': 'Spotter arm / box safety', 'pull-up-bar': 'Pull-up bar' };
/** Registry rack parts (#131): one select per entry param (same pattern as FloorInspector), plus the rail station
 * pickers for crossmember-top / -under mounts and the host station picker for parts on a spotter arm or pull-up bar
 * (#178). Upright, face, hole and pairing stay in the shared accessory inspector. */
export function RackPartControls({ store, entry }: { store: BuilderStore; entry: Accessory }) {
  const part = rackPart(entry.part), doc = store.getSnapshot().doc;
  // Every target kind the entry accepts that has a fitting mount on this rack (hooks stay above the early return).
  const many = !!part && (rackTargets(part).length > 1 || isHostedTarget(entry.target));
  const candidates: Mount[] = useMemo(() => many ? placementMounts(doc, entry.part as PartId, entry.id) : [], [doc, entry.part, entry.id, many]);
  if (!part) return null;
  const params = { ...part.defaults, ...entry.params };
  const commit = (update: (a: Accessory) => void) => store.act(() => { const next = structuredClone(store.getSnapshot().doc); update(next.accessories.find(a => a.id === entry.id)!); store.commit(next); });
  // Saved params stay sparse: only values that differ from the entry defaults are stored.
  const setParams = (values: Record<string, number>) => commit(a => { const full = coerceRackParams(part, values); a.params = Object.fromEntries(Object.entries(full).filter(([k, v]) => v !== part.defaults[k])); });
  const kind = targetKind(entry.target);
  const mounts = isRailTarget(entry.target) ? (many ? candidates : rackRailMounts(doc, entry.part)).filter(m => m.kind === kind) : [];
  const key = (t: CrossmemberTopTarget) => `${t.connectionId}:${t.station}:${t.side}`;
  const setTarget = (value: string, pair = false) => commit(a => {
    const t = mounts.find(m => isRailTarget(m) && key(m) === value);
    if (!isRailTarget(t)) return;
    const target: CrossmemberTopTarget = { kind: t.kind, connectionId: t.connectionId, station: t.station, side: t.side, uprightId: t.uprightId, face: t.face, hole: 0 };
    if (pair) a.pairTarget = target; else { a.target = target; delete a.pairTarget; }
  });
  const stations = (value: string, onChange: (value: string) => void, label: string, pair = false) => <label className="field"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    {mounts.filter(m => !pair || !part.pair?.railSpacing || (isRailTarget(m) && isRailTarget(entry.target)
      && m.connectionId === entry.target.connectionId && m.side === entry.target.side
      && Math.abs(m.station - entry.target.station) * doc.rack.pitch >= part.pair.railSpacing.min))
      .map(m => isRailTarget(m) && <option key={key(m)} value={key(m)}>{m.connectorId} · hole {m.station + 1} · side {m.side}</option>)}</select></label>;
  const kinds = rackTargets(part).filter(k => k === kind || candidates.some(m => (m.kind ?? 'upright') === k));
  const hostKey = (t: HostedTarget) => `${t.host}:${t.unit}:${t.frame}:${t.station}`;
  const hosted = candidates.filter((m): m is Mount & HostedTarget => isHostedTarget(m) && m.kind === kind);
  const move = (m: Mount | undefined) => { if (m) store.act(() => store.commit(proposalAt(doc, entry.part as PartId, m, entry.paired && !isHostedTarget(m), entry.id).doc)); };
  const switchKind = (k: string) => move(candidates.filter(m => (m.kind ?? 'upright') === k).sort((a, b) => scoreMount(doc, entry.part as PartId, a) - scoreMount(doc, entry.part as PartId, b))[0]);
  return <>
    {kinds.length > 1 && <label className="field"><span>Mount on</span><select aria-label="Mount on" value={kind} onChange={e => switchKind(e.target.value)}>
      {kinds.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}</select></label>}
    {isHostedTarget(entry.target) && <label className="field"><span>{kind === 'pull-up-bar' ? 'Bar clamp station' : 'Arm hole'}</span>
      <select aria-label="Host station" value={hostKey(entry.target)} onChange={e => move(hosted.find(m => hostKey(m) === e.target.value))}>
        {hosted.map(m => <option key={hostKey(m)} value={hostKey(m)}>{m.label}</option>)}
        {!hosted.some(m => hostKey(m) === hostKey(entry.target as HostedTarget)) && <option value={hostKey(entry.target)}>station {entry.target.station + 1}</option>}
      </select></label>}
    {isRailTarget(entry.target) && <>
      {stations(key(entry.target), value => setTarget(value), entry.target.kind === 'crossmember-under' ? 'Crossmember underside / side bolt station' : 'Crossmember top / side bolt station')}
      {part.pair && <label className="field"><span>{part.pair.railSpacing ? 'Matching handle on this crossmember' : 'Matching crossmember pair'}</span><input type="checkbox" checked={entry.paired} onChange={e => commit(a => { a.paired = e.target.checked; })} /></label>}
      {entry.paired && entry.pairTarget && stations(key(entry.pairTarget), value => setTarget(value, true), 'Second unit target', true)}
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
