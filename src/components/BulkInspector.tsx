import { NumericControl } from './NumericControl.tsx';
import { ResetButton } from './ResetButton.tsx';
import { partDefaults } from '../../rack-generator/reset.ts';
import { useSyncExternalStore } from 'react';
import type { BuilderStore } from '../state/builder-store.ts';
import { useStoreSelector } from '../state/use-store.ts';
import { selectionOwners, sharedFields } from '../state/selection.ts';
import { canDuplicate } from '../state/selection-actions.ts';
import { removeSelectionWithUndo } from './Toast/undo-actions.ts';
/** Shared parameters of a multi-selection (the inspector's "Shared parameters" section). */
export function BulkInspector({ store }: { store: BuilderStore }) {
  const { doc, resolved, selection, definitions, inputRevision } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const instances = resolved.filter(r => selection.includes(r.id));
  const fields = sharedFields(doc, instances);
  return <div className="inspector-fields bulk-fields">
    {fields.map(field => {
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
    {!fields.length && <p className="note">These parts share no editable dimensions. Paint and finish below apply to every selected piece.</p>}
    {instances.some(r => r.paired) && <p className="note">Paired · edits affect both sides</p>}
  </div>;
}
/** Multi-select footer actions. */
export function BulkActions({ store }: { store: BuilderStore }) {
  const duplicable = useStoreSelector(store, s => canDuplicate(s.doc, s.resolved, s.selection) && !selectionOwners(s.resolved, s.selection).some(owner => s.doc.systems?.some(x => x.id === owner)));
  return <>
    {duplicable && <button type="button" onClick={() => store.act(() => { store.duplicateSelected(); })}>Duplicate parts</button>}
    <button type="button" className="danger" onClick={() => removeSelectionWithUndo(store)}>Remove parts</button>
  </>;
}
