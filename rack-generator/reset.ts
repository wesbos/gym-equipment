import { defaultAccessoryTarget, createAssembly, getPartDefaults, getPartPlacementInfo, RACK_DEFAULTS, resizeAssembly, validateAssembly, resolveAssembly } from './assembly.ts';
import { snapDimensions } from './grid.ts';
import { gridProfile } from './profiles.ts';
import { structureSlots } from './topology.ts';
import type { Accessory, NumericParams, PartId, RackDoc } from './types.ts';

/** Snap source dimensions through the active profile; never reset a REP bore/pitch to BOS. */
export function dimensionDefaults(doc: RackDoc) {
  return snapDimensions(doc.rack, { height: RACK_DEFAULTS.height, width: RACK_DEFAULTS.width, depth: RACK_DEFAULTS.depth }, doc.profileId);
}
export function resetDimensions(doc: RackDoc) {
  const { height, width, depth } = dimensionDefaults(doc);
  return resizeAssembly(doc, { height, width, depth });
}
export function ownerFor(doc: RackDoc, id: string): string {
  return resolveAssembly(doc).find(r => r.id === id)?.ownerId || id;
}
/** Domain defaults adjusted only for documented mounting constraints. */
export function partDefaults(doc: RackDoc, part: PartId): NumericParams {
  const defaults = getPartDefaults(part);
  if (part === 'angled-crossmember') defaults.rise = Math.round(defaults.rise / doc.rack.pitch) * doc.rack.pitch;
  if (part === 'safety-pin-pipe') defaults.pinDiameter = Math.min(defaults.pinDiameter, doc.rack.holeDiameter - 0.8);
  return defaults;
}
export function defaultVariant(doc: RackDoc, id: string): PartId {
  const owner = ownerFor(doc, id), accessory = doc.accessories.find(a => a.id === owner);
  if (!accessory) return structureSlots(doc).find(s => s.id === owner)!.part;
  const stock = createAssembly().accessories.find(a => a.id === owner);
  return stock?.part ?? accessory.part;
}
/** Placement defaults keep explicit graph endpoints; no arbitrary relocation of dynamic posts. */
export function placementDefaults(doc: RackDoc, accessory: Accessory): Accessory {
  const stock = createAssembly().accessories.find(a => a.id === accessory.id);
  const stockPost = stock && doc.uprights[stock.target.uprightId] && !doc.removed.includes(stock.target.uprightId) ? stock.target.uprightId : accessory.target.uprightId;
  const target = defaultAccessoryTarget(doc, accessory.part, accessory.spanTo ? accessory.target.uprightId : stockPost);
  const info = getPartPlacementInfo(accessory.part, doc);
  return { ...accessory, params: {}, target: { ...target,
    face: accessory.spanTo ? accessory.target.face : target.face,
    hole: info?.fixedHole ?? target.hole }, paired: !!info?.paired };
}
export function resetPart(doc: RackDoc, id: string, field?: string): RackDoc {
  const next = structuredClone(doc), owner = ownerFor(doc, id);
  const accessory = next.accessories.find(a => a.id === owner);
  const variant = next.structure[owner];
  const part = accessory?.part ?? variant?.part;
  if (!part) return validateAssembly(next);
  const params = accessory?.params ?? variant!.params;
  if (field) params[field] = partDefaults(doc, part)[field];
  else {
    for (const key of Object.keys(params)) delete params[key];
    // The source pin is larger than PR-4000's bore: preserve a safe domain default.
    if (part === 'safety-pin-pipe' && gridProfile(doc.profileId).holeDiameter < getPartDefaults(part).pinDiameter)
      params.pinDiameter = partDefaults(doc, part).pinDiameter;
    if (part === 'angled-crossmember') params.rise = partDefaults(doc, part).rise;
  }
  return validateAssembly(next);
}
