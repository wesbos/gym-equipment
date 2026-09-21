import { InspectorHeader } from './Inspector/InspectorHeader.tsx';
import { Section } from './Inspector/Section.tsx';
import { Choice, InspectorFooter } from './Inspector/controls.tsx';
import { removeSelectionWithUndo } from './Toast/undo-actions.ts';
import { deepEqual, useStoreSelector } from '../state/use-store.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { wallPart } from '../../rack-generator/wall-registry.ts';
import { floorOptions, coerceFloorParams } from '../../rack-generator/floor-part.ts';
import { roomOf } from '../../rack-generator/wall-items.ts';
import { ROOM_DEFAULTS, ROOM_LIMITS, WALL_IDS, wallFrames, type WallId } from '../../rack-generator/walls.ts';
import type { NumericParams } from '../../rack-generator/types.ts';
import { NumericControl } from './NumericControl.tsx';
/** Registry-driven like FloorInspector: param selects, wall + [along, height], and the wall's own distance. */
export function WallInspector({store,id}:{store:BuilderStore;id:string}) {
  const {item,room}=useStoreSelector(store,s=>({item:s.doc.wallItems!.find(i=>i.id===id)!,room:roomOf(s.doc)}),deepEqual),part=wallPart(item.part)!;
  const noun=part.noun,frame=wallFrames(room)[item.wall];
  const setParams=(params:NumericParams)=>store.updateWall(id,{params:coerceFloorParams(part,params)});
  const gesture={onGestureStart:store.beginGesture,onGestureEnd:store.endGesture};
  return <><InspectorHeader store={store} part={item.part} /><div id="inspector" className="insp-body inspector-fields">
    <Section id="placement" title="Placement" badge={frame.label}>
      <Choice label="Wall" value={item.wall} options={WALL_IDS.map(wall=>({value:wall,label:wallFrames(room)[wall].label}))} onChange={wall=>store.updateWall(id,{wall:wall as WallId})} />
      <label className="field"><span>Along wall (mm from centre)</span><NumericControl label={`${noun} position along wall`} value={item.position[0]} min={-frame.length/2} max={frame.length/2} step={25} defaultValue={0} {...gesture} onValue={v=>store.updateWall(id,{position:[v,item.position[1]]})}/></label>
      <label className="field"><span>Height (centre, mm)</span><NumericControl label={`${noun} height`} value={item.position[1]} min={0} max={room.height} step={25} defaultValue={part.height ?? 1500} {...gesture} onValue={v=>store.updateWall(id,{position:[item.position[0],v]})}/></label>
      <label className="field"><span>{frame.label} distance (mm)</span><NumericControl label={`${frame.label} distance`} value={room[item.wall]} min={ROOM_LIMITS[item.wall][0]} max={ROOM_LIMITS[item.wall][1]} step={50} defaultValue={ROOM_DEFAULTS[item.wall]} {...gesture} onValue={v=>store.setRoom({[item.wall]:v})}/></label>
      <p className="note">Drag along the wall · 25 mm snap · Alt bypass</p>
    </Section>
    {part.params.length>0 && <Section id="options" title="Options">
      {part.params.map(param=>{const {key,label,format=String}=param;return <Choice key={key} label={label} value={item.params[key]}
        options={floorOptions(param,item.params).map(v=>({value:v,label:format(v)}))} onChange={v=>setParams({...item.params,[key]:v})}
        reset={{changed:item.params[key] !== param.default,onReset:()=>setParams({...item.params,[key]:param.default})}} />;})}
    </Section>}
    <p className="note insp-credit">Scenery: GLB only, never 3MF</p>
  </div>
  <InspectorFooter>
    <button type="button" className="primary" onClick={()=>store.startPlacement(item.part,id)}>Move on wall ↗</button>
    <button type="button" onClick={()=>store.updateWall(id,{params:{...part.defaults},position:[item.position[0],part.height ?? 1500]})}>Reset this {noun}</button>
    <button type="button" className="danger" onClick={()=>removeSelectionWithUndo(store)}>Remove {noun}</button>
  </InspectorFooter></>;
}
