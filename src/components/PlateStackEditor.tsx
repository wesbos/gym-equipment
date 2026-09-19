import { useState, type KeyboardEvent } from 'react';
import { setPlateStack } from '../../rack-generator/assembly.ts';
import { PLATE_LINES, PLATE_PRESETS, expandRuns, lineSet, linePlates, plateFits, plateLine, platePeg, plateRoom, plateRuns, plateSpec, plateStackLength, plateTotalLabel, type PlateId } from '../../rack-generator/plates.ts';
import type { Accessory } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import './plate-stack.css';
const round = (v: number) => Math.round(v * 10) / 10;
const GROUPS = [...new Set(PLATE_LINES.map(l => l.group))];
const lineLabel = (id: string) => { const l = plateLine(id)!; return l.legacy ? `${l.name} (default)` : `${l.brand} ${l.name}`; };
const spec = (id: PlateId) => plateSpec(id)!;
/** Storage-pin plate loading: pick a brand line, then a weight (and finish), as weight × count rows from the peg root outward. */
export function PlateStackEditor({ store, entry }: { store: BuilderStore; entry: Accessory }) {
  const plates = entry.plates ?? [], last = plates.at(-1);
  const [line, setLine] = useState<string>(() => (last && spec(last).line) || 'standard-kg');
  const [finish, setFinish] = useState<string | undefined>(() => (last && spec(last).finish) || undefined);
  const [plate, setPlate] = useState<PlateId>(() => last ?? 'kg15');
  const [count, setCount] = useState(1), [error, setError] = useState('');
  const peg = platePeg(entry.part);
  if (!peg) return null;
  const runs = plateRuns(plates), used = plateStackLength(plates), current = plateLine(line)!;
  const options = linePlates(line, finish), selected = options.includes(plate) ? plate : options[0];
  const apply = (next: PlateId[], label: string) => {
    try {
      store.commit(setPlateStack(store.getSnapshot().doc, entry.id, next), { category: 'edit', label });
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const chooseLine = (id: string) => {
    const l = plateLine(id)!, nextFinish = l.finishes?.[0]?.id, weights = linePlates(id, nextFinish), s = spec(selected);
    setLine(id); setFinish(nextFinish);
    // Keep the closest weight when switching lines (e.g. 45 lb iron → 45 lb bumper).
    setPlate(weights.reduce((best, p) => Math.abs(spec(p).weight - s.weight) < Math.abs(spec(best).weight - s.weight) ? p : best, weights[0]));
  };
  const chooseFinish = (id: string) => {
    const key = spec(selected).key!;
    setFinish(id);
    setPlate(linePlates(line, id).find(p => spec(p).key === key) ?? linePlates(line, id)[0]);
  };
  const add = () => apply([...plates, ...Array<PlateId>(count).fill(selected)], 'Load plates');
  const setRun = (index: number, value: number) => apply(expandRuns(runs.map((r, i) => i === index ? { ...r, count: value } : r)), 'Change plate count');
  // Enter inside the parent placement form must not submit placement.
  const noSubmit = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
  const s = spec(selected), set = lineSet(line, finish), fits = plateFits(entry.part, plates, selected);
  return (
    <fieldset className="plate-stack" id="plate-stack">
      <legend>Plate stack</legend>
      <div className="plate-meter" role="meter" aria-label="Pin length used" aria-valuemin={0} aria-valuemax={peg.length} aria-valuenow={round(used)}>
        {plates.map((p, i) => <span key={i} title={spec(p).label} style={{ width: `${spec(p).width / peg.length * 100}%`, background: spec(p).color }} />)}
      </div>
      <p className="note" id="plate-capacity">{round(used)} of {peg.length} mm used · {plateTotalLabel(plates)}{entry.paired ? ' on each pin' : ''}</p>
      {!!runs.length && <ol className="plate-runs">
        {runs.map((r, i) => {
          const rs = spec(r.plate), rl = plateLine(rs.line!)!;
          return (
            <li key={`${i}-${r.plate}`} data-plate={r.plate}>
              <i style={{ background: rs.color }} />
              <span>{rs.label}{!rl.legacy && <small>{rl.brand} {rl.name}</small>}</span>
              <button type="button" aria-label={`Remove one ${rs.label}`} onClick={() => setRun(i, r.count - 1)}>−</button>
              <output>×{r.count}</output>
              <button type="button" aria-label={`Add one ${rs.label}`} onClick={() => setRun(i, r.count + 1)}>+</button>
              <button type="button" aria-label={`Remove ${rs.label} row`} onClick={() => setRun(i, 0)}>×</button>
            </li>
          );
        })}
      </ol>}
      <label className="plate-line">
        <span>Plate line</span>
        <select aria-label="Plate line" value={line} onChange={e => chooseLine(e.target.value)}>
          {GROUPS.map(group => <optgroup key={group} label={group}>
            {PLATE_LINES.filter(l => l.group === group).map(l => <option key={l.id} value={l.id}>{lineLabel(l.id)} · {l.unit.toUpperCase()}</option>)}
          </optgroup>)}
        </select>
      </label>
      {current.finishes && <label className="plate-line">
        <span>Finish</span>
        <select aria-label="Plate finish" value={finish ?? current.finishes[0].id} onChange={e => chooseFinish(e.target.value)}>
          {current.finishes.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>}
      <div className="plate-add">
        <select aria-label="Plate weight" value={selected} onChange={e => setPlate(e.target.value as PlateId)}>
          {options.map(id => <option key={id} value={id}>{spec(id).label} · Ø{round(spec(id).diameter)} × {round(spec(id).width)} mm</option>)}
        </select>
        <span>×</span>
        <input aria-label="Plate count" type="number" min={1} max={16} step={1} value={count} onKeyDown={noSubmit}
          onChange={e => setCount(Math.max(1, Math.min(16, Math.floor(Number(e.target.value)) || 1)))} />
        <button type="button" id="add-plates" onClick={add}>Add</button>
      </div>
      <p className="note">{round(Math.max(0, plateRoom(entry.part, plates)))} mm free · room for {fits} more {s.label} ({round(s.width)} mm)</p>
      {error && <p className="plate-error" role="alert" id="plate-error">{error}</p>}
      <div className="plate-presets">
        {PLATE_PRESETS.map(p => <button type="button" key={p.id} data-preset={p.id} onClick={() => apply([...p.plates], `Load ${p.label}`)}
          className={plateStackLength(p.plates) > peg.length ? 'too-long' : undefined}>{p.label}</button>)}
        {!current.legacy && set.length > 1 && <button type="button" data-preset="line-set" onClick={() => apply(set, `Load ${current.brand} ${current.name} set`)}
          className={plateStackLength(set) > peg.length ? 'too-long' : undefined}>One of each {current.brand}</button>}
        {!current.legacy && <button type="button" data-preset="line-pair" onClick={() => apply([options[0], options[0]], `Load pair of ${spec(options[0]).label}`)}
          className={plateStackLength([options[0], options[0]]) > peg.length ? 'too-long' : undefined}>Pair of {spec(options[0]).label}</button>}
      </div>
      {!!plates.length && <button type="button" onClick={() => apply([], 'Unload plates')}>Unload all plates</button>}
    </fieldset>
  );
}
