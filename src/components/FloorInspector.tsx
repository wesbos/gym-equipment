import { resetAppearanceField } from '../../rack-generator/appearance-reset.ts';
import { ResetButton } from './ResetButton.tsx';
import { useSyncExternalStore } from 'react';
import type { BuilderStore } from '../state/builder-store.ts';
import { floorPart, floorOptions, coerceFloorParams } from '../../rack-generator/floor-registry.ts';
import type { NumericParams } from '../../rack-generator/types.ts';
import { NumericControl } from './NumericControl.tsx';
import { barCradles, barSpecOf } from '../../rack-generator/barbell-cradles.ts';
import { BarPlatesEditor } from './BarPlatesEditor.tsx';
/** Controls come from the registry entry: one select per param, optional paint palette, rotation. */
export function FloorInspector({store,id}:{store:BuilderStore;id:string}) {
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot),item=state.doc.floorItems!.find(i=>i.id===id)!,part=floorPart(item.part)!;
  const noun=part.noun,Noun=noun[0].toUpperCase()+noun.slice(1),colorLabel=part.colorLabel ?? `${Noun} color`;
  // A param change that shortens loaded sleeves past their plates is refused with the capacity message.
  const setParams=(params:NumericParams)=>store.act(()=>store.updateFloor(id,{params:coerceFloorParams(part,params)}));
  const cradle=item.cradle ? barCradles(state.resolved,barSpecOf(item)).find(c=>c.key===item.cradle) : undefined;
  return <><h2 id="selection-title">{part.name}</h2><div id="inspector" className="inspector-fields">
    {part.params.map(param=>{const {key,label,format=String}=param;return <label className="field" key={key}><span>{label}</span><select aria-label={label} value={item.params[key]} onChange={e=>setParams({...item.params,[key]:Number(e.target.value)})}>{floorOptions(param,item.params).map(v=><option key={v} value={v}>{format(v)}</option>)}</select><ResetButton label={label} changed={item.params[key] !== param.default} onReset={()=>setParams({...item.params,[key]:param.default})} /></label>;})}
    {part.colors && <label className="field"><span>{colorLabel}</span><select aria-label={colorLabel} value={state.doc.appearance?.overrides?.[id] ?? ''} onChange={e=>{
      const doc=structuredClone(state.doc);doc.appearance ??= {};doc.appearance.overrides ??= {};doc.appearance.finishOverrides ??= {};
      if(e.target.value) {doc.appearance.overrides[id]=e.target.value;doc.appearance.finishOverrides[id]='paint';}
      else {doc.appearance=resetAppearanceField(doc.appearance,'color',id);}
      store.commit(doc);
    }}><option value="">Default / global</option>{part.colors.map(([name,color])=><option key={color} value={color}>{name}</option>)}</select><ResetButton label={colorLabel.toLowerCase()} changed={!!state.doc.appearance?.overrides?.[id]} onReset={()=>{
      store.commit({...state.doc,appearance:resetAppearanceField(state.doc.appearance ?? {},'color',id)});
    }} /></label>}
    {part.bar && <BarPlatesEditor key={id} store={store} item={item} part={part} />}
    {part.parks && <p className="note">{cradle ? `Parked in ${cradle.label}` : item.cradle ? 'Its cradle is gone — lying on the floor.' : 'On the floor · double-click to park in a cradle'}</p>}
    {!item.cradle && <label className="field"><span>Rotation (degrees)</span><NumericControl label={`${Noun} rotation`} value={item.rotation*180/Math.PI} min={-180} max={180} step={15} defaultValue={0} onGestureStart={store.beginGesture} onGestureEnd={store.endGesture} onValue={v=>store.updateFloor(id,{rotation:v*Math.PI/180})}/></label>}
    <button onClick={()=>{const doc=structuredClone(state.doc),floor=doc.floorItems!.find(i=>i.id===id)!;
      floor.params={...part.defaults};floor.rotation=0;delete floor.plates;
      if(doc.appearance?.overrides)delete doc.appearance.overrides[id];
      if(doc.appearance?.finishOverrides)delete doc.appearance.finishOverrides[id];
      store.commit(doc);}}>Reset this {noun}</button>
    <button onClick={()=>store.startPlacement(item.part,id)}>{part.parks ? 'Move / park ↗' : 'Move on floor ↗'}</button>
    {item.cradle && <button onClick={()=>{const doc=structuredClone(state.doc),floor=doc.floorItems!.find(i=>i.id===id)!,at=state.resolved.find(r=>r.id===id)!;
      delete floor.cradle;floor.position=[at.position[0],-at.position[1]];floor.rotation=at.rotation[2];store.commit(doc);}}>Set on floor</button>}
    <button className="danger" onClick={store.removeSelected}>Remove {noun}</button>
    <p className="note">25 mm snap · Alt bypass</p>
    {part.vendor && <a href={part.vendor.url} target="_blank" rel="noreferrer">{part.name} · independent reconstruction</a>}
  </div></>;
}
