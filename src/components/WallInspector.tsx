import { ResetButton } from './ResetButton.tsx';
import { useSyncExternalStore } from 'react';
import type { BuilderStore } from '../state/builder-store.ts';
import { wallPart } from '../../rack-generator/wall-registry.ts';
import { floorOptions, coerceFloorParams } from '../../rack-generator/floor-part.ts';
import { roomOf } from '../../rack-generator/wall-items.ts';
import { ROOM_DEFAULTS, ROOM_LIMITS, WALL_IDS, wallFrames, type WallId } from '../../rack-generator/walls.ts';
import type { NumericParams } from '../../rack-generator/types.ts';
import { NumericControl } from './NumericControl.tsx';
/** Registry-driven like FloorInspector: param selects, wall + [along, height], and the wall's own distance. */
export function WallInspector({store,id}:{store:BuilderStore;id:string}) {
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot),item=state.doc.wallItems!.find(i=>i.id===id)!,part=wallPart(item.part)!;
  const noun=part.noun,room=roomOf(state.doc),frame=wallFrames(room)[item.wall];
  const setParams=(params:NumericParams)=>store.updateWall(id,{params:coerceFloorParams(part,params)});
  const gesture={onGestureStart:store.beginGesture,onGestureEnd:store.endGesture};
  return <><h2 id="selection-title">{part.name}</h2><div id="inspector" className="inspector-fields">
    {part.params.map(param=>{const {key,label,format=String}=param;return <label className="field" key={key}><span>{label}</span><select aria-label={label} value={item.params[key]} onChange={e=>setParams({...item.params,[key]:Number(e.target.value)})}>{floorOptions(param,item.params).map(v=><option key={v} value={v}>{format(v)}</option>)}</select><ResetButton label={label} changed={item.params[key] !== param.default} onReset={()=>setParams({...item.params,[key]:param.default})} /></label>;})}
    <label className="field"><span>Wall</span><select aria-label="Wall" value={item.wall} onChange={e=>store.updateWall(id,{wall:e.target.value as WallId})}>{WALL_IDS.map(wall=><option key={wall} value={wall}>{wallFrames(room)[wall].label}</option>)}</select></label>
    <label className="field"><span>Along wall (mm from centre)</span><NumericControl label={`${noun} position along wall`} value={item.position[0]} min={-frame.length/2} max={frame.length/2} step={25} defaultValue={0} {...gesture} onValue={v=>store.updateWall(id,{position:[v,item.position[1]]})}/></label>
    <label className="field"><span>Height (centre, mm)</span><NumericControl label={`${noun} height`} value={item.position[1]} min={0} max={room.height} step={25} defaultValue={part.height ?? 1500} {...gesture} onValue={v=>store.updateWall(id,{position:[item.position[0],v]})}/></label>
    <label className="field"><span>{frame.label} distance (mm)</span><NumericControl label={`${frame.label} distance`} value={room[item.wall]} min={ROOM_LIMITS[item.wall][0]} max={ROOM_LIMITS[item.wall][1]} step={50} defaultValue={ROOM_DEFAULTS[item.wall]} {...gesture} onValue={v=>store.setRoom({[item.wall]:v})}/></label>
    <button onClick={()=>store.updateWall(id,{params:{...part.defaults},position:[item.position[0],part.height ?? 1500]})}>Reset this {noun}</button>
    <button onClick={()=>store.startPlacement(item.part,id)}>Move on wall ↗</button>
    <button className="danger" onClick={store.removeSelected}>Remove {noun}</button>
    <p className="note">Drag along the wall · 25 mm snap · Alt bypass · Scenery: GLB only, never 3MF</p>
  </div></>;
}
