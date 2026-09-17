import { useState } from 'react';
import { RACK_PRESETS, applyPreset } from '../../rack-generator/presets.ts';
import { GRID_PROFILES } from '../../rack-generator/profiles.ts';
import type { BuilderStore } from '../state/builder-store.ts';
export function RackPresets({store}:{store:BuilderStore}) {
  const [choice,setChoice] = useState(RACK_PRESETS.find(p => p.profileId === 'rep-pr-5000')!.id);
  const apply = (id:string) => store.act(() => { store.commit(applyPreset(id)); store.select(null); });
  return <details className="rack-presets"><summary>Rack starting points</summary>
    <p>Replace the current rack with a starting frame. Undo restores your design.</p>
    {RACK_PRESETS.filter(p => p.profileId === 'generic-75').map(p => <button type="button" key={p.id} onClick={() => apply(p.id)}>{p.label}</button>)}
    <label>Manufacturer reconstruction<select aria-label="Manufacturer reconstruction" value={choice} onChange={e=>setChoice(e.target.value)} style={{width:'100%'}}>
      {GRID_PROFILES.filter(p=>p.id.startsWith('rep-') || p.id.startsWith('bos-')).map(profile=><optgroup key={profile.id} label={profile.label}>{RACK_PRESETS.filter(p=>p.profileId===profile.id).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>)}
    </select></label>
    <p>{GRID_PROFILES.find(p => p.id === RACK_PRESETS.find(p=>p.id===choice)?.profileId)?.reconstructionNote}</p>
    <button type="button" onClick={()=>apply(choice)}>Apply Manufacturer reconstruction</button>
    <p>Published dimensions and hole spacing; estimated mounting details. No verified physical fit.</p>
    {GRID_PROFILES.filter(p=>p.source).map(p=><p key={p.id}><a href={p.source} target="_blank" rel="noreferrer">{p.label} vendor specs</a></p>)}
  </details>;
}
