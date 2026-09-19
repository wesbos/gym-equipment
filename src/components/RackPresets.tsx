import { useState } from 'react';
import { RACK_PRESETS, applyPreset, type RackPreset } from '../../rack-generator/presets.ts';
import { GRID_PROFILES, gridProfile } from '../../rack-generator/profiles.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import './rack-presets.css';
// Curated manufacturer starters (profiles with `starters`) are grouped by brand below the core starters.
const isBrandStarter = (p: RackPreset) => !!gridProfile(p.profileId).starters?.length;
const brandGroups = [...new Set(RACK_PRESETS.filter(p => p.featured && isBrandStarter(p)).map(p => p.vendor ?? 'Other'))];
export function RackPresets({store}:{store:BuilderStore}) {
  const [choice,setChoice] = useState(RACK_PRESETS.find(p => !p.featured)!.id);
  const apply = (id:string) => {
    if (store.getSnapshot().dirty && !window.confirm('Replace your unsaved working rack with this starting point? You can undo this change.')) return;
    store.act(() => { store.endGesture(); store.commit(applyPreset(id), { category: "preset", label: RACK_PRESETS.find(p => p.id === id)?.label ?? id, replacement: true }); store.select(null); });
  };
  const button = (p: RackPreset) => <button type="button" key={p.id} data-preset={p.id} onClick={() => apply(p.id)}>{p.label}</button>;
  return <details className="rack-presets" open><summary>Rack starting points</summary>
    <div className="featured-presets">
      {RACK_PRESETS.filter(p => p.featured && !isBrandStarter(p)).map(button)}
    </div>
    {brandGroups.map(vendor => <details key={vendor} className="brand-presets" data-vendor={vendor}><summary>{vendor} racks</summary>
      <div className="featured-presets">{RACK_PRESETS.filter(p => p.featured && isBrandStarter(p) && (p.vendor ?? 'Other') === vendor).map(button)}</div>
    </details>)}
    <details className="more-presets"><summary>More configurations</summary>
      <label>Rack profile<select aria-label="Rack profile" value={choice} onChange={e=>setChoice(e.target.value)}>
        {GRID_PROFILES.filter(profile=>RACK_PRESETS.some(p=>p.profileId===profile.id && !p.featured)).map(profile=><optgroup key={profile.id} label={profile.label}>{RACK_PRESETS.filter(p=>p.profileId===profile.id && !p.featured).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>)}
      </select></label>
      <button type="button" onClick={()=>apply(choice)}>Apply rack profile</button>
      {GRID_PROFILES.filter(p=>p.source).map(p=><p key={p.id}><a href={p.source} target="_blank" rel="noreferrer">{p.label} vendor specs</a></p>)}
    </details>
  </details>;
}
