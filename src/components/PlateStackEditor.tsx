import { useState, type KeyboardEvent } from 'react';
import { setPlateStack } from '../../rack-generator/assembly.ts';
import { PLATE_GAP, PLATE_LINES, PLATE_PRESETS, expandRuns, lineSet, linePlates, plateLine, plateParts, platePeg, plateRuns, plateSpec, plateStackLength, plateTotalLabel, type PlateId } from '../../rack-generator/plates.ts';
import type { Accessory } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import './plate-stack.css';
const round = (v: number) => Math.round(v * 10) / 10;
const GROUPS = [...new Set(PLATE_LINES.map(l => l.group))];
const lineLabel = (id: string) => { const l = plateLine(id)!; return l.legacy ? `${l.name} (default)` : `${l.brand} ${l.name}`; };
const spec = (id: PlateId) => plateSpec(id)!;
/** Weight label without the finish (the finish has its own select). */
const weightLabel = (id: PlateId) => { const p = plateParts(id)!; return p.weight.label ?? `${p.weight.weight} ${p.line.unit}`; };
/** Room on a peg or sleeve of `capacity` mm after `plates` (the plateRoom / plateFits rules, by length). */
const roomFor = (capacity: number, plates: readonly PlateId[]) => capacity - plateStackLength(plates) - (plates.length ? PLATE_GAP : 0);
const fitsFor = (capacity: number, plates: readonly PlateId[], plate: PlateId) =>
  Math.max(0, Math.floor((capacity - plateStackLength(plates) + (plates.length ? 0 : PLATE_GAP) + 1e-6) / (spec(plate).width + PLATE_GAP)));
export interface PlateStackProps {
  plates: readonly PlateId[];
  /** Loadable length, mm (peg or sleeve). */ capacity: number;
  /** Commits the new stack (root outward); throws a user-facing error to refuse it. */ apply: (next: PlateId[], label: string) => void;
  legend: string; /** Meter label, e.g. "Pin length used" */ meter: string; /** After the totals, e.g. " on each pin" */ suffix?: string;
  /** Element id prefix (default "plate": #plate-stack, #plate-capacity, #add-plates, #plate-error) */ idPrefix?: string;
  /** Prefix for control labels when several stacks share a panel, e.g. "Right sleeve" */ labelPrefix?: string;
}
/** Plate loading: pick a brand line, then a weight (and finish), as weight × count rows from the root outward. */
export function PlateStack({ plates, capacity, apply: commit, legend, meter, suffix = '', idPrefix, labelPrefix }: PlateStackProps) {
  const last = plates.at(-1);
  const [line, setLine] = useState<string>(() => (last && spec(last).line) || 'standard-kg');
  const [finish, setFinish] = useState<string | undefined>(() => (last && spec(last).finish) || undefined);
  const [plate, setPlate] = useState<PlateId>(() => last ?? 'kg15');
  const [count, setCount] = useState(1), [error, setError] = useState('');
  const ids = idPrefix ? { stack: idPrefix, capacity: `${idPrefix}-capacity`, add: `${idPrefix}-add`, error: `${idPrefix}-error` } : { stack: 'plate-stack', capacity: 'plate-capacity', add: 'add-plates', error: 'plate-error' };
  const aria = (name: string) => labelPrefix ? `${labelPrefix} ${name.toLowerCase()}` : name;
  const runs = plateRuns(plates), used = plateStackLength(plates), current = plateLine(line)!;
  const options = linePlates(line, finish), selected = options.includes(plate) ? plate : options[0];
  const apply = (next: PlateId[], label: string) => {
    try { commit(next, label); setError(''); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
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
  const s = spec(selected), set = lineSet(line, finish), fits = fitsFor(capacity, plates, selected);
  return (
    <fieldset className="plate-stack" id={ids.stack}>
      <legend>{legend}</legend>
      <div className="plate-meter" role="meter" aria-label={meter} aria-valuemin={0} aria-valuemax={round(capacity)} aria-valuenow={round(used)}>
        {plates.map((p, i) => <span key={i} title={spec(p).label} style={{ width: `${spec(p).width / capacity * 100}%`, background: spec(p).color }} />)}
      </div>
      <p className="note" id={ids.capacity}>{round(used)} of {round(capacity)} mm used · {plateTotalLabel(plates)}{suffix}</p>
      {!!runs.length && <ol className="plate-runs">
        {runs.map((r, i) => {
          const rs = spec(r.plate), rl = plateLine(rs.line!)!;
          return (
            <li key={`${i}-${r.plate}`} data-plate={r.plate}>
              <i style={{ background: rs.color }} />
              <span>{rs.label}{!rl.legacy && <small>{rl.brand} {rl.name}</small>}</span>
              <button type="button" aria-label={aria(`Remove one ${rs.label}`)} onClick={() => setRun(i, r.count - 1)}>−</button>
              <output>×{r.count}</output>
              <button type="button" aria-label={aria(`Add one ${rs.label}`)} onClick={() => setRun(i, r.count + 1)}>+</button>
              <button type="button" aria-label={aria(`Remove ${rs.label} row`)} onClick={() => setRun(i, 0)}>×</button>
            </li>
          );
        })}
      </ol>}
      <label className="plate-line">
        <span>Plate line</span>
        <select aria-label={aria('Plate line')} value={line} onChange={e => chooseLine(e.target.value)}>
          {GROUPS.map(group => <optgroup key={group} label={group}>
            {PLATE_LINES.filter(l => l.group === group).map(l => <option key={l.id} value={l.id}>{lineLabel(l.id)} · {l.unit.toUpperCase()}</option>)}
          </optgroup>)}
        </select>
      </label>
      {current.finishes && <label className="plate-line">
        <span>Finish</span>
        <select aria-label={aria('Plate finish')} value={finish ?? current.finishes[0].id} onChange={e => chooseFinish(e.target.value)}>
          {current.finishes.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>}
      <div className="plate-add">
        <select aria-label={aria('Plate weight')} value={selected} onChange={e => setPlate(e.target.value as PlateId)}>
          {options.map(id => <option key={id} value={id} title={`Ø${round(spec(id).diameter)} × ${round(spec(id).width)} mm`}>{weightLabel(id)} · {round(spec(id).width)} mm</option>)}
        </select>
        <span>×</span>
        <input aria-label={aria('Plate count')} type="number" min={1} max={16} step={1} value={count} onKeyDown={noSubmit}
          onChange={e => setCount(Math.max(1, Math.min(16, Math.floor(Number(e.target.value)) || 1)))} />
        <button type="button" id={ids.add} onClick={add}>Add</button>
      </div>
      <p className="note">{round(Math.max(0, roomFor(capacity, plates)))} mm free · room for {fits} more {s.label} ({round(s.width)} mm)</p>
      {error && <p className="plate-error" role="alert" id={ids.error}>{error}</p>}
      <div className="plate-presets">
        {PLATE_PRESETS.map(p => <button type="button" key={p.id} data-preset={p.id} onClick={() => apply([...p.plates], `Load ${p.label}`)}
          className={plateStackLength(p.plates) > capacity ? 'too-long' : undefined}>{p.label}</button>)}
        {!current.legacy && set.length > 1 && <button type="button" data-preset="line-set" onClick={() => apply(set, `Load ${current.brand} ${current.name} set`)}
          className={plateStackLength(set) > capacity ? 'too-long' : undefined}>One of each {current.brand}</button>}
        {!current.legacy && <button type="button" data-preset="line-pair" onClick={() => apply([options[0], options[0]], `Load pair of ${spec(options[0]).label}`)}
          className={plateStackLength([options[0], options[0]]) > capacity ? 'too-long' : undefined}>Pair of {spec(options[0]).label}</button>}
      </div>
      {!!plates.length && <button type="button" onClick={() => apply([], 'Unload plates')}>{aria('Unload all plates')}</button>}
    </fieldset>
  );
}
/** Storage-pin plate loading. */
export function PlateStackEditor({ store, entry }: { store: BuilderStore; entry: Accessory }) {
  const peg = platePeg(entry.part);
  if (!peg) return null;
  return <PlateStack plates={entry.plates ?? []} capacity={peg.length} legend="Plate stack" meter="Pin length used" suffix={entry.paired ? ' on each pin' : ''}
    apply={(next, label) => store.commit(setPlateStack(store.getSnapshot().doc, entry.id, next), { category: 'edit', label })} />;
}
