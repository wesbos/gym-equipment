import { useSyncExternalStore } from 'react';
import type { BuilderStore } from '../state/builder-store.ts';
import { BACKREST_ANGLES, SEAT_ANGLES, NIGHTHAWK_COLORS, NIGHTHAWK_DEFAULTS } from '../../rack-generator/floor-items.ts';
import { NumericControl } from './NumericControl.tsx';
export function FloorInspector({store,id}:{store:BuilderStore;id:string}) {
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot),item=state.doc.floorItems!.find(i=>i.id===id)!;
  return <><h2 id="selection-title">REP Nighthawk</h2><div id="inspector" className="inspector-fields">
    {([['backrestAngle','Backrest angle',BACKREST_ANGLES],['seatAngle','Seat angle',SEAT_ANGLES]] as const).map(([key,label,angles])=><label className="field" key={key}><span>{label}</span><select aria-label={label} value={item.params[key]} onChange={e=>store.updateFloor(id,{params:{...item.params,[key]:Number(e.target.value)}})}>{angles.map(a=><option key={a} value={a}>{a}°</option>)}</select></label>)}
    <label className="field"><span>Bench frame color</span><select aria-label="Bench frame color" value={state.doc.appearance?.overrides?.[id] ?? ''} onChange={e=>store.paintSelection(e.target.value || undefined)}><option value="">Default / global</option>{NIGHTHAWK_COLORS.map(([name,color])=><option key={color} value={color}>{name}</option>)}</select></label>
    <label className="field"><span>Rotation (degrees)</span><NumericControl label="Bench rotation" value={item.rotation*180/Math.PI} min={-180} max={180} step={15} defaultValue={0} onGestureStart={store.beginGesture} onGestureEnd={store.endGesture} onValue={v=>store.updateFloor(id,{rotation:v*Math.PI/180})}/></label>
    <button onClick={()=>{store.beginGesture();store.updateFloor(id,{params:{...NIGHTHAWK_DEFAULTS},rotation:0});store.paintSelection();store.endGesture();}}>Reset this bench</button>
    <button onClick={()=>store.startPlacement(item.part,id)}>Move on floor ↗</button>
    <button className="danger" onClick={store.removeSelected}>Remove bench</button>
    <p className="note">Drag to move · 25 mm snap · Alt for free movement · R to rotate · Esc to cancel</p>
    <a href="https://repfitness.com/products/rep-nighthawk-adjustable-bench" target="_blank" rel="noreferrer">REP Fitness Nighthawk · independent reconstruction</a>
  </div></>;
}
