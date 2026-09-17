import { RACK_PRESETS, applyPreset } from '../../rack-generator/presets.ts';
import { GRID_PROFILES } from '../../rack-generator/profiles.ts';
import type { BuilderStore } from '../state/builder-store.ts';
export function RackPresets({store}:{store:BuilderStore}) {
  return <details className="rack-presets"><summary>Rack starting points</summary>
    <p>Replace the current rack with a starting frame. Undo restores your design.</p>
    {RACK_PRESETS.map(p => <button type="button" key={p.id} onClick={() => store.act(() => { store.commit(applyPreset(p.id)); store.select(null); })}>{p.label}</button>)}
    <p>Manufacturer presets awaiting verified mounting geometry:</p>
    {GRID_PROFILES.filter(p => p.unavailableReason).map(p => <p key={p.id}><button disabled>{p.label}</button> {p.unavailableReason} <a href={p.source} target="_blank" rel="noreferrer">Vendor specs</a></p>)}
  </details>;
}
