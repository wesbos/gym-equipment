import { deepEqual, useStoreSelector } from '../state/use-store.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { hangPart } from '../../rack-generator/hang-registry.ts';
import { wallPart } from '../../rack-generator/wall-registry.ts';
import { panelSlots } from '../../rack-generator/hang-items.ts';
import { wallFrames } from '../../rack-generator/walls.ts';
import { roomOf } from '../../rack-generator/wall-items.ts';
import { InspectorHeader } from './Inspector/InspectorHeader.tsx';
import { Section } from './Inspector/Section.tsx';
import { InspectorFooter } from './Inspector/controls.tsx';
import { removeSelectionWithUndo } from './Toast/undo-actions.ts';
const inches = (mm: number) => `${Math.abs(mm / 25.4).toFixed(1).replace(/\.0$/, '')}″`;
/** A hung attachment: where it hangs, move/remove, and its product credit. */
export function HangInspector({store,id}:{store:BuilderStore;id:string}) {
  const {item,panel,room}=useStoreSelector(store,s=>{const item=s.doc.hangItems!.find(i=>i.id===id)!;return {item,panel:s.doc.wallItems!.find(p=>p.id===item.panel)!,room:roomOf(s.doc)};},deepEqual),part=hangPart(item.part)!;
  const [x,z]=panelSlots(panel)[item.slot],wall=wallFrames(room)[panel.wall];
  return <><InspectorHeader store={store} part={item.part} /><div id="inspector" className="insp-body inspector-fields">
    <Section id="placement" title="Placement" badge={`hook ${item.slot+1}/${panelSlots(panel).length}`}>
      <p className="note">Hanging on hook {item.slot+1} of {panelSlots(panel).length}: {x ? `${inches(x)} ${x<0?'left':'right'} of centre` : 'centred'}, {inches(z)} {z<0?'below':'above'} the middle of the {wallPart(panel.part)!.noun} on the {wall.label.toLowerCase()}.</p>
      <button type="button" onClick={()=>store.select(panel.id)}>Select its {wallPart(panel.part)!.noun}</button>
      <p className="note">Drag between hooks · double-click to reposition · follows its panel · the eye is kept as the carabiner anchor for cable use later</p>
    </Section>
    {part.vendor && <p className="note insp-credit"><a href={part.vendor.url} target="_blank" rel="noreferrer">{part.vendor.credit} · independent reconstruction ↗</a></p>}
  </div>
  <InspectorFooter>
    <button type="button" className="primary" onClick={()=>store.startPlacement(item.part,id)}>Move to another hook ↗</button>
    <button type="button" className="danger" onClick={()=>removeSelectionWithUndo(store)}>Remove {part.noun}</button>
  </InspectorFooter></>;
}
