import { createAssembly, validateAssembly, addAccessory, defaultAccessoryTarget } from './assembly.ts';
import { extendUpright } from './graph-edits.ts';
import { GRID_PROFILES, gridProfile, type StarterAttachment, type StarterKind } from './profiles.ts';
import { rackAutoFit } from './rack-mounts.ts';
import type { RackDoc } from './types.ts';
export interface RackPreset {
  id: string; label: string; kind: 'half' | StarterKind; depth: number; profileId: string; height: number; featured?: boolean;
  /** Brand heading used to group featured starters. */
  vendor?: string;
  /** Height of the rear (storage) posts of a half rack. */
  rearHeight?: number;
  /** Front pull-up bar diameters, highest first. */
  pullups?: readonly number[];
  rearCrossmember?: boolean;
  /** Only a rear lower crossmember (low rear brace) instead of the side lower crossmembers. */
  rearLower?: boolean;
  /** Rack attachments that ship with the rack (placed at their registry-preferred face and hole). */
  attachments?: readonly StarterAttachment[];
}
// Featured starters are existing supported combinations; preserve the full catalog.
const featuredIds = new Set([
  'rep-pr-5000-four-2032-1041.4', 'rep-pr-5000-four-2362.2-762',
  'rep-pr-5000-six-2032-1041.4', 'rep-pr-5000-six-2362.2-1041.4',
  'rep-pr-5000-four-2032-406.4', 'bos-hydra-four-2133.6-762',
  'bos-manticore-six-2286-1092.2', 'rep-pr-4000-four-2362.2-762',
]);
/** Profiles whose presets enumerate every height × depth × 4/6-post combination. */
const ENUMERATED = new Set(['rep-pr-5000', 'rep-pr-4000', 'bos-hydra', 'bos-manticore']);
const vendorOf = (id: string) => gridProfile(id).vendor ?? (id.startsWith('bos-') ? 'Bells of Steel' : id.startsWith('rep-') ? 'REP Fitness' : undefined);
export const RACK_PRESETS: readonly RackPreset[] = [
  { id:'generic-four', label:'BOS 4-post', kind:'four', depth:725, profileId:'generic-75',height:2032 },
  { id:'generic-six', label:'BOS 6-post + storage', kind:'six', depth:725, profileId:'generic-75',height:2032 },
  { id:'generic-half', label:'BOS half rack', kind:'half', depth:425, profileId:'generic-75',height:2032 },
  ...GRID_PROFILES.filter(p => ENUMERATED.has(p.id)).flatMap(profile => profile.heights!.flatMap(height => profile.depths.flatMap(depth => (['four','six'] as const).map(kind => ({
    featured:featuredIds.has(`${profile.id}-${kind}-${height}-${depth}`), vendor: vendorOf(profile.id),
    id:`${profile.id}-${kind}-${height}-${depth}`, profileId:profile.id, height, depth, kind,
    label:`${profile.label} ${kind === 'four' ? depth === 406.4 ? 'shallow half rack (4 posts)' : '4-post' : profile.id.startsWith('bos-') ? '6-post + 24″ storage' : '6-post + 16″ storage'} · ${Math.round(height/25.4)}″ high · ${Math.round(depth/25.4)}″ deep`,
  }))))),
  // Curated manufacturer starters (#130): one real, published configuration each.
  ...GRID_PROFILES.flatMap(profile => (profile.starters ?? []).map((starter): RackPreset => ({
    id: `${profile.id}-${starter.kind}-${starter.height}-${starter.depth}${starter.rearHeight ? `-${starter.rearHeight}` : ''}`,
    label: starter.label, kind: starter.kind, depth: starter.depth, height: starter.height, profileId: profile.id,
    featured: !!starter.featured, vendor: vendorOf(profile.id),
    ...(starter.rearHeight ? { rearHeight: starter.rearHeight } : {}), ...(starter.pullups?.length ? { pullups: starter.pullups } : {}),
    ...(starter.rearCrossmember === false ? { rearCrossmember: false } : {}),
    ...(starter.rearLower ? { rearLower: true } : {}), ...(starter.attachments?.length ? { attachments: starter.attachments } : {}),
  }))),
];
export function applyPreset(id: string): RackDoc {
  const preset = RACK_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error('Unknown rack preset.');
  const profile = gridProfile(preset.profileId);
  let doc = createAssembly({depth:preset.depth,height:preset.height,emptyAccessories:true});
  // Start the graph only after establishing profile dimensions; migration builds
  // exact centers without snapping vendor spans through the source catalog.
  doc = validateAssembly({ ...doc, version:1, profileId:profile.id, rack:{...doc.rack, width:profile.widths.at(-1)!, tube:profile.tube??75,
    ...(profile.tubeDepth ? { tubeDepth: profile.tubeDepth } : {}), firstHole: profile.firstHole ?? doc.rack.firstHole, pitch:profile.pitch, holeDiameter:profile.holeDiameter} });
  if (preset.kind === 'six') {
    const storageDepth = profile.storageDepth ?? (profile.id === 'generic-75' ? 425 : profile.id.startsWith('bos-') ? 609.6 : 406.4);
    doc = extendUpright(doc,'rear-left','rear',storageDepth);
    doc = extendUpright(doc,'rear-right','rear',storageDepth);
  }
  if (preset.kind === 'half') {
    delete doc.uprights['rear-left']; delete doc.uprights['rear-right'];
    doc.connections = [{id:'half-top',from:'front-left',to:'front-right',level:'upper'}];
    doc = addAccessory(validateAssembly(doc),'foot-800',{uprightId:'front-left',face:'front',hole:0},true);
  }
  if (preset.kind === 'stand' || preset.kind === 'wall') {
    // Two free posts: the base (feet or wall arms) carries them, pull-up bars span the front.
    delete doc.uprights['rear-left']; delete doc.uprights['rear-right'];
    doc.connections = [];
  }
  if (preset.rearHeight) for (const post of ['rear-left', 'rear-right']) doc.uprights[post] = { ...doc.uprights[post], height: preset.rearHeight };
  const ids = new Set(doc.connections.map(e => e.id));
  if (profile.defaultUpperCrossmember) for (const edge of doc.connections.filter(e => e.level === 'upper')) {
    doc.structure[edge.id] = { part: profile.defaultUpperCrossmember, params: {} };
  }
  if (profile.lowerCrossmembers === false) doc.removed = [...doc.removed, ...['left-lower-crossmember', 'right-lower-crossmember'].filter(e => ids.has(e) && !doc.removed.includes(e))];
  if (preset.rearLower) {
    doc.removed = [...doc.removed, ...['left-lower-crossmember', 'right-lower-crossmember'].filter(e => ids.has(e) && !doc.removed.includes(e))];
    doc.connections = [...doc.connections, { id: 'rear-lower-crossmember', from: 'rear-left', to: 'rear-right', level: 'lower' }];
  }
  if (preset.rearCrossmember === false && ids.has('rear-crossmember')) doc.removed = [...doc.removed, 'rear-crossmember'];
  else if (profile.nameplate && ids.has('rear-crossmember')) doc.structure = { ...doc.structure, 'rear-crossmember': { part: profile.defaultUpperCrossmember === 'crossmember-flush' ? 'profile-nameplate-flush' : 'profile-nameplate', params: {} } };
  if (profile.color) doc.appearance = { ...doc.appearance, frameColor: profile.color };
  doc = validateAssembly(doc);
  for (const [index, diameter] of (preset.pullups ?? []).entries()) {
    // Fat/skinny pairs: the second (fat) bar hangs about six inches below the first. Bars bolt
    // into the side faces, so they snap to the profile's side-hole stride.
    const stride = profile.sideStride ?? 1, top = Math.floor(defaultAccessoryTarget(doc, 'pullup-straight').hole / stride) * stride;
    const hole = top - index * Math.max(stride, Math.round(152.4 / doc.rack.pitch));
    doc = addAccessory(doc, 'pullup-straight', { uprightId: 'front-left', hole }, false, { diameter });
  }
  for (const a of preset.attachments ?? []) doc = addAccessory(doc, a.part, { uprightId: a.upright ?? 'front-left' }, a.paired ?? false, rackAutoFit(a.part, doc.rack));
  return validateAssembly(doc);
}
