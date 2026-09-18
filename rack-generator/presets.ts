import { createAssembly, validateAssembly, addAccessory } from './assembly.ts';
import { extendUpright } from './graph-edits.ts';
import { GRID_PROFILES, gridProfile } from './profiles.ts';
import type { RackDoc } from './types.ts';
export interface RackPreset { id:string; label:string; kind:'four'|'six'|'half'; depth:number; profileId:string; height:number; featured?:boolean }
// Featured starters are existing supported combinations; preserve the full catalog.
const featuredIds = new Set([
  'rep-pr-5000-four-2032-1041.4', 'rep-pr-5000-four-2362.2-762',
  'rep-pr-5000-six-2032-1041.4', 'rep-pr-5000-six-2362.2-1041.4',
  'rep-pr-5000-four-2032-406.4', 'bos-hydra-four-2133.6-762',
  'bos-manticore-six-2286-1092.2',
]);
export const RACK_PRESETS: readonly RackPreset[] = [
  { id:'generic-four', label:'BOS 4-post', kind:'four', depth:725, profileId:'generic-75',height:2032 },
  { id:'generic-six', label:'BOS 6-post + storage', kind:'six', depth:725, profileId:'generic-75',height:2032 },
  { id:'generic-half', label:'BOS half rack', kind:'half', depth:425, profileId:'generic-75',height:2032 },
  ...GRID_PROFILES.filter(p => p.id.startsWith('rep-') || p.id.startsWith('bos-')).flatMap(profile => profile.heights!.flatMap(height => profile.depths.flatMap(depth => (['four','six'] as const).map(kind => ({
    featured:featuredIds.has(`${profile.id}-${kind}-${height}-${depth}`),
    id:`${profile.id}-${kind}-${height}-${depth}`, profileId:profile.id, height, depth, kind,
    label:`${profile.label} ${kind === 'four' ? depth === 406.4 ? 'shallow half rack (4 posts)' : '4-post' : profile.id.startsWith('bos-') ? '6-post + 24″ storage' : '6-post + 16″ storage'} · ${Math.round(height/25.4)}″ high · ${Math.round(depth/25.4)}″ deep`,
  })))))
];
export function applyPreset(id: string): RackDoc {
  const preset = RACK_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error('Unknown rack preset.');
  const profile = gridProfile(preset.profileId);
  let doc = createAssembly({depth:preset.depth,height:preset.height,emptyAccessories:true});
  // Start the graph only after establishing profile dimensions; migration builds
  // exact centers without snapping vendor spans through the source catalog.
  doc = validateAssembly({ ...doc, version:1, profileId:profile.id, rack:{...doc.rack, width:profile.widths.at(-1)!, tube:profile.tube??75, pitch:profile.pitch, holeDiameter:profile.holeDiameter} });
  if (preset.kind === 'six') {
    const storageDepth = profile.id === 'generic-75' ? 425 : profile.id.startsWith('bos-') ? 609.6 : 406.4;
    doc = extendUpright(doc,'rear-left','rear',storageDepth);
    doc = extendUpright(doc,'rear-right','rear',storageDepth);
  }
  if (preset.kind === 'half') {
    delete doc.uprights['rear-left']; delete doc.uprights['rear-right'];
    doc.connections = [{id:'half-top',from:'front-left',to:'front-right',level:'upper'}];
    doc = addAccessory(validateAssembly(doc),'foot-800',{uprightId:'front-left',face:'front',hole:0},true);
  }
  return validateAssembly(doc);
}
