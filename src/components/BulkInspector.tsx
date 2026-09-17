import { NumericControl } from './NumericControl.tsx';
import { ResetButton } from './ResetButton.tsx';
import { partDefaults } from '../../rack-generator/reset.ts';
import { useSyncExternalStore } from 'react';
import type { BuilderStore } from '../state/builder-store.ts';
import { selectionOwners, sharedFields } from '../state/selection.ts';
export function BulkInspector({ store }: { store: BuilderStore }) {
  const { doc, resolved, selection, definitions, inputRevision } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const instances = resolved.filter(r => selection.includes(r.id));
  const owners = selectionOwners(resolved, selection);
  const canDuplicate = instances.every(r => r.kind === 'accessory' && doc.accessories.some(a => a.id === r.ownerId)) && !resolved.some(r => owners.includes(r.ownerId) && !selection.includes(r.id));
  return <div id="inspector" className="inspector-fields">
    {sharedFields(doc, instances).map(field => {
      const values = instances.map(r => doc.accessories.find(a => a.id === r.ownerId)?.params[field.key] ?? r.params[field.key]);
      const defaults = instances.map(r => partDefaults(doc, r.part)[field.key]);
      const mixed = values.some(value => value !== values[0]);
      const options = definitions.find(d => d.id === instances[0].part)?.standardOptions?.[field.key]?.filter(option =>
        option.value >= field.min && option.value <= field.max && instances.every(r =>
          definitions.find(d => d.id === r.part)?.standardOptions?.[field.key]?.some(other => other.value === option.value)));
      return <label className="field" key={field.key}><span>{field.label} (mm)</span>
        <NumericControl key={JSON.stringify([selection, inputRevision])} label={field.label}
          value={values[0]} mixed={mixed} min={field.min} max={field.max} step={field.step}
          standardOptions={options} showSlider={false}
          onGestureStart={store.beginGesture} onGestureEnd={store.endGesture}
          onValue={value => store.act(() => store.editSelectionParam(field.key, value))} />
        <ResetButton label={field.label} changed={values.some((value, index) => value !== defaults[index])}
          onReset={() => { store.endGesture(); store.act(() => store.resetSelectionParam(field.key)); }} />
      </label>;
    })}
    {canDuplicate && <button onClick={() => store.act(store.duplicateSelected)}>Duplicate parts</button>}
    <button className="danger" onClick={() => store.act(store.removeSelected)}>Remove parts</button>
    {instances.some(r => r.paired) && <p className="note">Pair dimensions/removal affect both sides.</p>}
  </div>;
}
