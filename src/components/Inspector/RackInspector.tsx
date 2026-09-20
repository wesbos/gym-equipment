import { useState, type FormEvent } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import { shallowEqual, useStoreSelector } from '../../state/use-store.ts';
import { editableFields } from '../../state/selection.ts';
import { variantOptions } from '../../state/selection-actions.ts';
import { getPartPlacementInfo, pairedByDefault, replaceStructurePart, resizeAssembly, rotationMode, unpairAccessory } from '../../../rack-generator/assembly.ts';
import { isSystemPart } from '../../../rack-generator/system-types.ts';
import { isUprightTarget } from '../../../rack-generator/rack-targets.ts';
import { addsStructure } from '../../../rack-generator/structure-candidates.ts';
import { swapCandidates } from '../../../rack-generator/swap.ts';
import { dimensionOptions } from '../../../rack-generator/standards.ts';
import { dimensionDefaults, resetDimensions, partDefaults, resetPart, placementDefaults, defaultVariant } from '../../../rack-generator/reset.ts';
import { gridProfile } from '../../../rack-generator/profiles.ts';
import { snapDimensions, stepDimension } from '../../../rack-generator/grid.ts';
import { platePeg } from '../../../rack-generator/plates.ts';
import type { Face, PartId, UprightId } from '../../../rack-generator/types.ts';
import { NumericControl } from '../NumericControl.tsx';
import { ResetButton } from '../ResetButton.tsx';
import { TopologyEditor } from '../TopologyEditor.tsx';
import { VendorControls } from '../VendorControls.tsx';
import { RackPartControls } from '../RackPartControls.tsx';
import { PlateStackEditor } from '../PlateStackEditor.tsx';
import { AppearanceControls } from '../AppearanceControls.tsx';
import { CableSmithControls } from '../CableSmithControls.tsx';
import { LogoControls } from '../LogoControls.tsx';
import { BulkInspector, BulkActions } from '../BulkInspector.tsx';
import { PartThumbnail } from '../PartThumbnail.tsx';
import { removeSelectionWithUndo, resetRackWithUndo } from '../Toast/undo-actions.ts';
import { InspectorHeader } from './InspectorHeader.tsx';
import { Section } from './Section.tsx';
import { Choice, InspectorFooter, Row } from './controls.tsx';
import { partMeta } from './part-meta.ts';

/** Parts that carry the rack logo: their inspector keeps the logo section. */
const LOGO_PARTS = new Set(['nameplate', 'branded-crossmember', 'branded-crossmember-lite']);
const title = (id: string) => id.replaceAll('-', ' ');

/** Rack settings: the frame, rack-wide appearance, systems, logo and topology. The inspector's empty state. */
function RackSettings({ store, onResetRack }: { store: BuilderStore; onResetRack?: () => void }) {
  const [snapHint, setSnapHint] = useState('');
  const doc = useStoreSelector(store, s => s.doc);
  const dims = (['height', 'width', 'depth'] as const);
  return <>
    <InspectorHeader store={store} title="Rack settings" chip="Your rack" back={false} art={<PartThumbnail part="upright" className="insp-thumb" />}
      subtitle={<span className="insp-brand">{Math.round(doc.rack.width)} × {Math.round(doc.rack.depth)} mm clear · {Math.round(doc.rack.height)} mm tall</span>} />
    <p className="insp-empty">Tap a part in the 3D view to edit it. Shift or ⌘-click (or the Select tool) picks several.</p>
    <div id="inspector" className="insp-body">
      <Section id="frame" title="Frame">
        <form id="frame-form" onSubmit={e => { e.preventDefault(); store.endGesture(); }}>
          {dims.map(key => {
            const label = key === 'height' ? 'Upright height' : `Clear rack ${key}`;
            return <label key={key} className="field"><span>{label}</span><div className="input-wrap">
              <NumericControl defaultValue={dimensionDefaults(doc)[key]} standardOptions={dimensionOptions(doc.rack, key, doc.profileId)} name={key === 'height' ? 'heightIn' : key} label={label}
                value={doc.rack[key]} min={key === 'height' ? 1000 : key === 'width' ? 400 : 300}
                max={key === 'height' ? 4000 : key === 'width' ? 2000 : 1500} step={doc.rack.pitch}
                normalize={value => {
                  const current = store.getSnapshot().doc;
                  const target = snapDimensions(current.rack, { [key]: value }, current.profileId)[key];
                  setSnapHint(`Snapped ${key} target: ${target} mm`);
                  return target;
                }}
                advance={(value, direction) => { const current = store.getSnapshot().doc; return stepDimension(current.rack, key, value, direction, current.profileId); }}
                onGestureStart={store.beginGesture} onGestureEnd={store.endGesture}
                onValue={value => store.act(() => store.commit(resizeAssembly(store.getSnapshot().doc, { [key]: value })))} />
              <span>mm</span>
            </div></label>;
          })}
          <output aria-live="polite">{snapHint || `Grid: ${doc.rack.pitch} mm · depths ${gridProfile(doc.profileId).depths.join(' / ')} mm`}</output>
        </form>
      </Section>
      <Section id="appearance" title="Appearance"><AppearanceControls store={store} /></Section>
      <CableSmithControls store={store} />
      <LogoControls store={store} />
      <TopologyEditor key={JSON.stringify(doc)} doc={doc} store={store} selected={null} moveRequested={false} />
    </div>
    <InspectorFooter>
      <button type="button" onClick={() => store.act(() => { store.endGesture(); store.edit(current => resetDimensions(current)); })}>Reset dimensions</button>
      <button id="reset-design" type="button" className="insp-danger-quiet" onClick={() => resetRackWithUndo(store, onResetRack)}>Reset entire rack</button>
    </InspectorFooter>
  </>;
}

/** The staged frame member (add or swap mode). */
function StructureChoice({ store, part }: { store: BuilderStore; part: PartId }) {
  const { doc, resolved, structureMode } = useStoreSelector(store, s => ({ doc: s.doc, resolved: s.resolved, structureMode: s.structureMode }), shallowEqual);
  const slots = swapCandidates(doc, part).filter(candidate => candidate.valid);
  return <>
    <InspectorHeader store={store} part={part} />
    <div id="inspector" className="insp-body inspector-fields">
      {addsStructure(part) && <Choice label="Structure mode" value={structureMode} options={[{ value: 'add', label: 'Add structure' }, { value: 'swap', label: 'Swap' }]}
        onChange={mode => store.patch({ structureMode: mode })} />}
      {structureMode === 'add' && <TopologyEditor doc={doc} store={store} selected={null} />}
      {structureMode === 'swap' && <div className="insp-stack">{slots.map(slot => <button type="button" key={slot.ownerId} onClick={() => store.previewStructure(slot.ownerId)}>
        {resolved.some(r => r.ownerId === slot.ownerId) ? 'Replace' : 'Add'} {title(slot.ownerId)}
      </button>)}</div>}
      {structureMode === 'swap' && !slots.length && <p className="note">{part === 'upright' ? 'No upright slots' : 'Missing supporting uprights'}</p>}
    </div>
  </>;
}

/** A cable system or Smith: its controls live in the systems panel. */
function SystemInspector({ store, part }: { store: BuilderStore; part: PartId }) {
  return <>
    <InspectorHeader store={store} part={part} chip="System" />
    <div id="inspector" className="insp-body">
      <CableSmithControls store={store} />
      <Section id="appearance" title="Appearance"><AppearanceControls store={store} /></Section>
    </div>
    <InspectorFooter><button type="button" className="danger" onClick={() => removeSelectionWithUndo(store)}>Remove system</button></InspectorFooter>
  </>;
}

function MultiInspector({ store }: { store: BuilderStore }) {
  const { count, kinds } = useStoreSelector(store, s => {
    const pieces = s.resolved.filter(r => s.selection.includes(r.id));
    const kinds = [...new Set(pieces.map(r => isSystemPart(r.part) ? 'system' : r.kind === 'floor-item' ? 'floor' : r.kind === 'wall-item' ? 'wall' : r.kind === 'structure' ? 'frame' : 'rack'))].sort().join(' · ');
    return { count: s.selection.length, kinds };
  }, shallowEqual);
  return <>
    <InspectorHeader store={store} title={`${count} parts`} chip="Multi-select" art={<span className="insp-multi-art" aria-hidden="true">{count}</span>}
      subtitle={<span className="insp-brand">{kinds}</span>} />
    <div id="inspector" className="insp-body">
      <Section id="shared" title="Shared parameters"><BulkInspector store={store} /></Section>
      <Section id="appearance" title="Appearance"><AppearanceControls store={store} /></Section>
    </div>
    <InspectorFooter><BulkActions store={store} /></InspectorFooter>
  </>;
}

/** Rack parts, frame members, systems, multi-select and rack settings (floor, wall, hang and room have their own). */
export function RackInspector({ store, onResetRack }: { store: BuilderStore; onResetRack?: () => void }) {
  // Everything this inspector reads, and nothing placement previews change (proposal, placement text, pointer state).
  const state = useStoreSelector(store, s => ({ doc: s.doc, resolved: s.resolved, selected: s.selected, selection: s.selection,
    structureChoice: s.structureChoice, structureMoveId: s.structureMoveId, definitions: s.definitions }), shallowEqual),
    { doc, resolved, selected, structureChoice, definitions } = state;
  const ownerId = store.ownerOf(selected);
  const entry = doc.accessories.find(a => a.id === ownerId),
    physical = resolved.find(r => r.id === selected) || resolved.find(r => r.ownerId === selected);
  const part = entry?.part || (ownerId ? doc.structure[ownerId]?.part : undefined) || physical?.part;
  const info = part ? getPartPlacementInfo(part, doc) : null;
  if (structureChoice) return <StructureChoice store={store} part={structureChoice} />;
  if (state.selection.length > 1) return <MultiInspector store={store} />;
  if (part && isSystemPart(part)) return <SystemInspector store={store} part={part} />;
  if (!part || !physical) return <RackSettings store={store} onResetRack={onResetRack} />;
  const nameOf = (id: string) => partMeta(id, definitions).name;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    store.act(() => {
      const variant = (data.get('variant') || part) as PartId;
      const params = variant === part ? Object.fromEntries(fields.map(f => [f.key, Number(data.get(f.key))])) : {};
      if (entry) {
        const next = structuredClone(doc), item = next.accessories.find(a => a.id === entry.id)!;
        item.params = variant === part ? { ...item.params, ...params } : {};
        item.part = variant;
        const uprightId = data.get('upright') as UprightId;
        if (isUprightTarget(entry.target)) item.target = {
          uprightId,
          face: spanning ? (uprightId.endsWith('left') ? 'right' : 'left') : (data.get('face') as Face),
          hole: fixedHole ? entry.target.hole : Number(data.get('hole')) - 1,
        };
        if (item.spanTo && data.get('spanTo')) item.spanTo = String(data.get('spanTo'));
        // An unpairable part submits no checkbox: adopt the new variant's default.
        if (isUprightTarget(entry.target)) item.paired =
          variant !== part && !info?.paired ? pairedByDefault(variant, doc) :
          !!getPartPlacementInfo(variant, doc)?.paired && data.get('paired') === 'on';
        store.commit(next);
      } else store.commit(replaceStructurePart(doc, physical.ownerId || physical.id, variant, params));
    });
  };
  const editEntry = (update: (a: NonNullable<typeof entry>) => void) => store.act(() => {
    const next = structuredClone(store.getSnapshot().doc); update(next.accessories.find(a => a.id === entry!.id)!); store.commit(next);
  });
  const fields = editableFields(part, doc);
  const variants = variantOptions(doc, resolved, physical.id);
  const placementDefault = entry ? placementDefaults(doc, entry) : undefined;
  const resetVariant = defaultVariant(doc, ownerId!);
  const spanning = part.startsWith('safety') || part.startsWith('pullup');
  const fixedHole = info?.fixedHole !== undefined || part === 'pullup-multigrip' || part === 'pullup-sphere';
  const rotation = entry ? rotationMode(doc, entry.id) : null;
  const upright = entry && isUprightTarget(entry.target) ? entry.target : null;
  return <>
    <InspectorHeader store={store} part={part} />
    <div id="inspector" className="insp-body inspector-fields">
      <form id="selection-form" className="selection-form" key={JSON.stringify([selected, part])} onSubmit={submit}>
        {entry && <Section id="placement" title="Placement" badge={upright ? `hole ${upright.hole + 1}` : undefined}>
          {upright && <>
            <Row label="Mounting upright" reset={<ResetButton label="mounting upright" changed={upright.uprightId !== placementDefault!.target.uprightId}
              onReset={() => editEntry(a => { a.target.uprightId = placementDefault!.target.uprightId; })} />}>
              <select aria-label="Mounting upright" name="upright" value={upright.uprightId} onChange={e => e.currentTarget.form?.requestSubmit()}>
                {Object.keys(doc.uprights).filter(id => resolved.some(r => r.id === id)).map(id => <option key={id} value={id}>{title(id)}</option>)}
              </select>
            </Row>
            {entry.spanTo && <Row label="Span end upright"><select aria-label="Span end upright" name="spanTo" value={entry.spanTo} onChange={e => e.currentTarget.form?.requestSubmit()}>
              {Object.keys(doc.uprights).filter(id => !doc.removed.includes(id)).map(id => <option key={id} value={id}>{title(id)}</option>)}</select></Row>}
            <Choice label="Mounting face" name="face" value={upright.face} disabled={spanning}
              options={(spanning ? [upright.face] : info?.faces || ['front', 'back', 'left', 'right']).map(face => ({ value: face, label: spanning ? 'Inward connection' : face[0].toUpperCase() + face.slice(1) }))}
              onChange={face => editEntry(a => { if (isUprightTarget(a.target)) a.target.face = face; })}
              reset={{ label: 'mounting face', changed: upright.face !== placementDefault!.target.face, onReset: () => editEntry(a => { a.target.face = placementDefault!.target.face; }) }} />
            <Row label="Hole number" hint={fixedHole ? 'Frame mount' : `Mount height ${doc.rack.firstHole + upright.hole * doc.rack.pitch} mm`}>
              <NumericControl name="hole" label="Hole number" defaultValue={placementDefault!.target.hole + 1} value={upright.hole + 1} min={1} step={doc.rack.benchSpacing ? 0.5 : 1}
                normalize={value => doc.rack.benchSpacing ? Math.round(value * 2) / 2 : Math.round(value)}
                max={Math.floor((doc.rack.height - doc.rack.firstHole) / doc.rack.pitch) + 1} disabled={fixedHole}
                onGestureStart={store.beginGesture} onGestureEnd={store.endGesture}
                onValue={value => store.act(() => { const next = structuredClone(store.getSnapshot().doc); next.accessories.find(a => a.id === entry.id)!.target.hole = value - 1; store.commit(next); })} />
            </Row>
            <label className="field insp-switch"><span>Matching pair</span>
              <input type="checkbox" role="switch" name="paired" checked={!!info?.paired && entry.paired} onChange={e => e.currentTarget.form?.requestSubmit()} disabled={!info?.paired} />
              <ResetButton label="matching pair" disabled={!info?.paired} changed={entry.paired !== placementDefault!.paired} onReset={() => editEntry(a => { a.paired = placementDefault!.paired; })} />
            </label>
          </>}
          {entry.paired && <button type="button" onClick={() => store.act(() => store.commit(unpairAccessory(doc, entry.id)))}>Edit sides independently</button>}
          {rotation && <div className="rotation-controls">
            <p className="note">{rotation.reason}</p>
            {rotation.supported && <button type="button" onClick={() => store.rotateMounted(selected ?? entry.id)}>{rotation.label} · R / scroll</button>}
          </div>}
        </Section>}
        <Section id="options" title="Options">
          {part !== 'upright' && <Row label={entry ? 'Variant' : 'Frame member'} reset={<ResetButton label="variant" changed={part !== resetVariant} onReset={() => store.act(() => {
            const next = structuredClone(doc);
            if (entry) { const a = next.accessories.find(a => a.id === entry.id)!; a.part = resetVariant; a.params = {}; store.commit(next); }
            else store.commit(replaceStructurePart(doc, ownerId!, resetVariant));
          })} />}>
            <select aria-label={entry ? 'Variant' : 'Frame member'} name="variant" value={part} onChange={e => e.currentTarget.form?.requestSubmit()}>
              {variants.map(id => <option value={id} key={id}>{nameOf(id)}</option>)}
            </select>
          </Row>}
          {entry && <VendorControls store={store} entry={entry} />}
          {entry && <RackPartControls store={store} entry={entry} />}
          {fields.map(field => <label className="field" key={field.key}><span>{`${field.label} (mm)`}</span>
            <NumericControl defaultValue={partDefaults(doc, part)[field.key]} standardOptions={definitions.find(d => d.id === part)?.standardOptions?.[field.key]} name={field.key} label={field.label}
              value={entry?.params[field.key] ?? (ownerId ? doc.structure[ownerId]?.params[field.key] : undefined) ?? physical.params[field.key] ?? definitions.find(d => d.id === part)?.defaults[field.key] ?? 0}
              min={field.min} max={field.max} step={field.step}
              onGestureStart={store.beginGesture} onGestureEnd={store.endGesture}
              onValue={value => store.act(() => {
                const next = structuredClone(store.getSnapshot().doc);
                if (entry) { next.accessories.find(a => a.id === entry.id)!.params[field.key] = value; store.commit(next); }
                else store.commit(replaceStructurePart(next, physical.ownerId || physical.id, part, { ...next.structure[physical.ownerId || physical.id]?.params, [field.key]: value }));
              })} />
          </label>)}
          {part === 'upright' && !fields.length && <p className="note">Uprights take the rack's height and tube; change them under Rack settings.</p>}
        </Section>
      </form>
      {entry && platePeg(entry.part) && <Section id="plates" title="Plates" badge={entry.plates?.length || undefined}><PlateStackEditor key={entry.id} store={store} entry={entry} /></Section>}
      <Section id="appearance" title="Appearance"><AppearanceControls store={store} /></Section>
      {LOGO_PARTS.has(part) && <LogoControls store={store} />}
      {!entry && <TopologyEditor key={JSON.stringify(doc)} doc={doc} store={store} selected={ownerId} moveRequested={state.structureMoveId === ownerId} />}
      <Section id="advanced" title="Advanced" defaultOpen={false}>
        <p className="note">{title(physical.id)}{physical.paired ? ' · paired: edits affect both sides' : ''}</p>
        {entry && <TopologyEditor key={JSON.stringify(doc)} doc={doc} store={store} selected={ownerId} moveRequested={false} />}
        {partMeta(part).trademark && <p className="note">{partMeta(part).trademark}</p>}
        <button type="button" onClick={() => store.act(() => { store.endGesture(); store.edit(current => resetPart(current, physical.id)); })}>Reset this part</button>
      </Section>
    </div>
    <InspectorFooter>
      {part !== 'upright' && <button type="submit" form="selection-form" className="primary">{entry ? 'Apply placement' : 'Replace frame member'}</button>}
      {entry && <button type="button" onClick={() => store.startPlacement(entry.part, entry.id)}>Move in 3D ↗</button>}
      <button className="danger" type="button" onClick={() => removeSelectionWithUndo(store)}>Remove part</button>
    </InspectorFooter>
  </>;
}
