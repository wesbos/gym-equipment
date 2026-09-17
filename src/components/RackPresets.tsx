import { useState } from 'react';
import { RACK_PRESETS, applyPreset } from '../../rack-generator/presets.ts';
import { GRID_PROFILES } from '../../rack-generator/profiles.ts';
import type { BuilderStore } from '../state/builder-store.ts';
export function RackPresets({store}:{store:BuilderStore}) {
  const [choice,setChoice] = useState(RACK_PRESETS.find(p => p.profileId === 'rep-pr-5000')!.id);
  const apply = (id:string) => store.act(() => { store.commit(applyPreset(id)); store.select(null); });
  return <details className="rack-presets"><summary>Rack starting points</summary>
    {RACK_PRESETS.filter(p => p.profileId === 'generic-75').map(p => <button type="button" key={p.id} onClick={() => apply(p.id)}>{p.label}</button>)}
    <label>REP rack<select aria-label="REP rack" value={choice} onChange={e=>setChoice(e.target.value)} style={{width:'100%'}}>
      {GRID_PROFILES.filter(p=>p.id.startsWith('rep-')).map(profile=><optgroup key={profile.id} label={profile.label}>{RACK_PRESETS.filter(p=>p.profileId===profile.id).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>)}
    </select></label>
    <button type="button" onClick={()=>apply(choice)}>Apply REP rack</button>
    {GRID_PROFILES.filter(p=>p.source).map(p=><p key={p.id}><a href={p.source} target="_blank" rel="noreferrer">{p.label} vendor specs</a></p>)}
  </details>;
}
