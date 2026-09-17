import { createAssembly, validateAssembly, addAccessory } from './assembly.ts';
import { extendUpright } from './graph-edits.ts';
import type { RackDoc } from './types.ts';
export const RACK_PRESETS = [
  { id:'generic-four', label:'BOS 4-post', kind:'four', depth:725 },
  { id:'generic-six', label:'BOS 6-post + storage', kind:'six', depth:725 },
  { id:'generic-half', label:'BOS half rack', kind:'half', depth:425 },
] as const;
export function applyPreset(id: string): RackDoc {
  const preset = RACK_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error('Unknown rack preset.');
  let doc = createAssembly({depth:preset.depth,emptyAccessories:true});
  doc.profileId = 'generic-75';
  if (preset.kind === 'six') {
    doc = extendUpright(doc,'rear-left','rear',425);
    doc = extendUpright(doc,'rear-right','rear',425);
  }
  if (preset.kind === 'half') {
    delete doc.uprights['rear-left']; delete doc.uprights['rear-right'];
    doc.connections = [{id:'half-top',from:'front-left',to:'front-right',level:'upper'}];
    doc = addAccessory(validateAssembly(doc),'foot-800',{uprightId:'front-left',face:'front',hole:0},true);
  }
  return validateAssembly(doc);
}
