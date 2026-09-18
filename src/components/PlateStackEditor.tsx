import { useState, type KeyboardEvent } from 'react';
import { setPlateStack } from '../../rack-generator/assembly.ts';
import { PLATE_IDS, PLATE_PRESETS, PLATE_SPECS, expandRuns, platePeg, plateRoom, plateRuns, plateStackLength, plateTotalLabel, type PlateId } from '../../rack-generator/plates.ts';
import type { Accessory } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import './plate-stack.css';
const round = (v: number) => Math.round(v * 10) / 10;
/** Storage-pin plate loading: weight × count rows from the peg root outward. */
export function PlateStackEditor({ store, entry }: { store: BuilderStore; entry: Accessory }) {
  const [plate, setPlate] = useState<PlateId>('kg15'), [count, setCount] = useState(1), [error, setError] = useState('');
  const peg = platePeg(entry.part);
  if (!peg) return null;
  const plates = entry.plates ?? [], runs = plateRuns(plates), used = plateStackLength(plates);
  const apply = (next: PlateId[], label: string) => {
    try {
      store.commit(setPlateStack(store.getSnapshot().doc, entry.id, next), { category: 'edit', label });
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const setRun = (index: number, value: number) => apply(expandRuns(runs.map((r, i) => i === index ? { ...r, count: value } : r)), 'Change plate count');
  // Enter inside the parent placement form must not submit placement.
  const noSubmit = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); apply([...plates, ...Array<PlateId>(count).fill(plate)], 'Load plates'); } };
  return (
    <fieldset className="plate-stack" id="plate-stack">
      <legend>Plate stack</legend>
      <div className="plate-meter" role="meter" aria-label="Pin length used" aria-valuemin={0} aria-valuemax={peg.length} aria-valuenow={round(used)}>
        {plates.map((p, i) => <span key={i} style={{ width: `${PLATE_SPECS[p].width / peg.length * 100}%`, background: PLATE_SPECS[p].color }} />)}
      </div>
      <p className="note" id="plate-capacity">{round(used)} of {peg.length} mm used · {plateTotalLabel(plates)}{entry.paired ? ' on each pin' : ''}</p>
      {!!runs.length && <ol className="plate-runs">
        {runs.map((r, i) => (
          <li key={`${i}-${r.plate}`} data-plate={r.plate}>
            <i style={{ background: PLATE_SPECS[r.plate].color }} />
            <span>{PLATE_SPECS[r.plate].label}</span>
            <button type="button" aria-label={`Remove one ${PLATE_SPECS[r.plate].label}`} onClick={() => setRun(i, r.count - 1)}>−</button>
            <output>×{r.count}</output>
            <button type="button" aria-label={`Add one ${PLATE_SPECS[r.plate].label}`} onClick={() => setRun(i, r.count + 1)}>+</button>
            <button type="button" aria-label={`Remove ${PLATE_SPECS[r.plate].label} row`} onClick={() => setRun(i, 0)}>×</button>
          </li>
        ))}
      </ol>}
      <div className="plate-add">
        <select aria-label="Plate weight" value={plate} onChange={e => setPlate(e.target.value as PlateId)}>
          {(['bumper', 'iron'] as const).map(style => <optgroup key={style} label={style === 'bumper' ? 'Bumper plates' : 'Iron plates'}>
            {PLATE_IDS.filter(id => PLATE_SPECS[id].style === style).map(id => <option key={id} value={id}>{PLATE_SPECS[id].label}</option>)}
          </optgroup>)}
        </select>
        <span>×</span>
        <input aria-label="Plate count" type="number" min={1} max={16} step={1} value={count} onKeyDown={noSubmit}
          onChange={e => setCount(Math.max(1, Math.min(16, Math.floor(Number(e.target.value)) || 1)))} />
        <button type="button" id="add-plates" onClick={() => apply([...plates, ...Array<PlateId>(count).fill(plate)], 'Load plates')}>Add</button>
      </div>
      <p className="note">{round(Math.max(0, plateRoom(entry.part, plates)))} mm free for another plate</p>
      {error && <p className="plate-error" role="alert" id="plate-error">{error}</p>}
      <div className="plate-presets">
        {PLATE_PRESETS.map(p => <button type="button" key={p.id} data-preset={p.id} onClick={() => apply([...p.plates], `Load ${p.label}`)}
          className={plateStackLength(p.plates) > peg.length ? 'too-long' : undefined}>{p.label}</button>)}
      </div>
      {!!plates.length && <button type="button" onClick={() => apply([], 'Unload plates')}>Unload all plates</button>}
    </fieldset>
  );
}
