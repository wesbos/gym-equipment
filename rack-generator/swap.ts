import { getPartPlacementInfo, replaceStructurePart, resolveAssembly, validateAssembly } from './assembly.ts';
import { ownerFor, partDefaults } from './reset.ts';
import { structureSlots } from './topology.ts';
import type { NumericParams, PartId, RackDoc, ResolvedInstance } from './types.ts';
export type SwapCandidate = { valid: true; ownerId: string; doc: RackDoc; entries: ResolvedInstance[] } | { valid: false; ownerId: string; reason: string };
/** Physical selection resolves to a single logical owner, including paired and composite parts. */
export function swapCandidate(doc: RackDoc, id: string, part: PartId): SwapCandidate {
  const ownerId = ownerFor(doc, id);
  try {
    const accessory = doc.accessories.find(a => a.id === ownerId);
    let next: RackDoc;
    if (accessory) {
      const before = getPartPlacementInfo(accessory.part, doc), after = getPartPlacementInfo(part, doc);
      if (!after || after.slots || before?.family !== after.family) throw Error('Choose an accessory in the same family to swap this part.');
      if (accessory.paired && !after.paired) throw Error('This replacement does not support the existing matching pair.');
      next = structuredClone(doc);
      const replacement = next.accessories.find(a => a.id === ownerId)!;
      replacement.part = part;
      replacement.params = {};
      if (part === 'safety-pin-pipe') replacement.params.pinDiameter = partDefaults(doc, part).pinDiameter;
      // Retain owner, pair endpoints and span graph; validation rejects incompatible mounts.
      next = validateAssembly(next);
    } else {
      const params: NumericParams = part === 'angled-crossmember' ? { rise: partDefaults(doc, part).rise } : {};
      next = replaceStructurePart(doc, ownerId, part, params);
    }
    return { valid: true, ownerId, doc: next, entries: resolveAssembly(next).filter(r => (r.ownerId || r.id) === ownerId) };
  } catch (error) {
    return { valid: false, ownerId, reason: error instanceof Error ? error.message : String(error) };
  }
}
export function swapCandidates(doc: RackDoc, part: PartId): SwapCandidate[] {
  return [...structureSlots(doc).map(s => s.id), ...doc.accessories.map(a => a.id)].map(id => swapCandidate(doc, id, part));
}
