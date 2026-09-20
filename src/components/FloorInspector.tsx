import { resetAppearanceField } from '../../rack-generator/appearance-reset.ts';
import type { BuilderSnapshot, BuilderStore } from '../state/builder-store.ts';
import { useStoreSelector } from '../state/use-store.ts';
import type { FloorItem } from '../../rack-generator/types.ts';
import { floorPart, floorOptions, coerceFloorParams } from '../../rack-generator/floor-registry.ts';
import type { NumericParams } from '../../rack-generator/types.ts';
import { NumericControl } from './NumericControl.tsx';
import { barCradles, barSpecOf } from '../../rack-generator/barbell-cradles.ts';
import { BarPlatesEditor } from './BarPlatesEditor.tsx';
import { AppearanceControls } from './AppearanceControls.tsx';
import { InspectorHeader } from './Inspector/InspectorHeader.tsx';
import { Section } from './Inspector/Section.tsx';
import { Choice, InspectorFooter, Swatches } from './Inspector/controls.tsx';
import { removeSelectionWithUndo } from './Toast/undo-actions.ts';
/** What the inspector shows: the item without its floor position (a drag moves it every frame), its colour and cradle. */
function floorView(state: BuilderSnapshot, id: string) {
  const item=state.doc.floorItems!.find(i=>i.id===id)!;
  return { item, color: state.doc.appearance?.overrides?.[id], cradle: item.cradle ? barCradles(state.resolved,barSpecOf(item)).find(c=>c.key===item.cradle)?.label ?? null : null };
}
const shown=(item: FloorItem)=>JSON.stringify({...item,position:undefined});
const sameView=(a: ReturnType<typeof floorView>, b: ReturnType<typeof floorView>)=>a.color===b.color && a.cradle===b.cradle && (a.item===b.item || shown(a.item)===shown(b.item));
/** Controls come from the registry entry: one select per param, optional paint palette, rotation.
 * Handlers read the live document at event time, since a position-only change does not re-render this inspector. */
export function FloorInspector({store,id}:{store:BuilderStore;id:string}) {
  const {item,color,cradle}=useStoreSelector(store,state=>floorView(state,id),sameView),part=floorPart(item.part)!;
  const live=()=>store.getSnapshot();
  const noun=part.noun,Noun=noun[0].toUpperCase()+noun.slice(1),colorLabel=part.colorLabel ?? `${Noun} color`;
  // A param change that shortens loaded sleeves past their plates is refused with the capacity message.
  const setParams=(params:NumericParams)=>store.act(()=>store.updateFloor(id,{params:coerceFloorParams(part,params)}));
  const paint=(value:string|undefined)=>{
    const doc=structuredClone(live().doc);doc.appearance ??= {};doc.appearance.overrides ??= {};doc.appearance.finishOverrides ??= {};
    if(value) {doc.appearance.overrides[id]=value;doc.appearance.finishOverrides[id]='paint';}
    else {doc.appearance=resetAppearanceField(doc.appearance,'color',id);}
    store.commit(doc);
  };
  return <><InspectorHeader store={store} part={item.part} /><div id="inspector" className="insp-body inspector-fields">
    <Section id="placement" title="Placement" badge={item.cradle ? 'parked' : `${Math.round(item.rotation*180/Math.PI)}°`}>
      {!item.cradle && <label className="field"><span>Rotation (degrees)</span><NumericControl label={`${Noun} rotation`} value={item.rotation*180/Math.PI} min={-180} max={180} step={15} defaultValue={0} onGestureStart={store.beginGesture} onGestureEnd={store.endGesture} onValue={v=>store.updateFloor(id,{rotation:v*Math.PI/180})}/></label>}
      {part.parks && <p className="note">{cradle ? `Parked in ${cradle}` : item.cradle ? 'Its cradle is gone — lying on the floor.' : 'On the floor · double-click to park in a cradle'}</p>}
      {item.cradle && <button type="button" onClick={()=>{const doc=structuredClone(live().doc),floor=doc.floorItems!.find(i=>i.id===id)!,at=live().resolved.find(r=>r.id===id)!;
        delete floor.cradle;floor.position=[at.position[0],-at.position[1]];floor.rotation=at.rotation[2];store.commit(doc);}}>Set on floor</button>}
      <p className="note">Drag to move · R rotates · 25 mm snap · Alt bypass</p>
    </Section>
    {part.params.length>0 && <Section id="options" title="Options">
      {part.params.map(param=>{const {key,label,format=String}=param;return <Choice key={key} label={label} value={item.params[key]}
        options={floorOptions(param,item.params).map(v=>({value:v,label:format(v)}))} onChange={v=>setParams({...item.params,[key]:v})}
        reset={{changed:item.params[key] !== param.default,onReset:()=>setParams({...item.params,[key]:param.default})}} />;})}
    </Section>}
    {part.bar && <Section id="plates" title="Plates"><BarPlatesEditor key={id} store={store} item={item} part={part} /></Section>}
    <Section id="appearance" title="Appearance">
      {part.colors && <Swatches label={colorLabel} colors={part.colors} value={color} onChange={paint} defaultLabel="Default / global" reset={{changed:!!color,onReset:()=>paint(undefined)}} />}
      <AppearanceControls store={store} />
    </Section>
    {part.vendor && <p className="note insp-credit"><a href={part.vendor.url} target="_blank" rel="noreferrer">{part.name} · independent reconstruction ↗</a></p>}
  </div>
  <InspectorFooter>
    <button type="button" className="primary" onClick={()=>store.startPlacement(item.part,id)}>{part.parks ? 'Move / park ↗' : 'Move on floor ↗'}</button>
    <button type="button" onClick={()=>{const doc=structuredClone(live().doc),floor=doc.floorItems!.find(i=>i.id===id)!;
      floor.params={...part.defaults};floor.rotation=0;delete floor.plates;
      if(doc.appearance?.overrides)delete doc.appearance.overrides[id];
      if(doc.appearance?.finishOverrides)delete doc.appearance.finishOverrides[id];
      store.commit(doc);}}>Reset this {noun}</button>
    <button type="button" className="danger" onClick={()=>removeSelectionWithUndo(store)}>Remove {noun}</button>
  </InspectorFooter></>;
}
