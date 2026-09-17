import { swapCandidate } from './swap.ts';
import { partDefaults } from './reset.ts';
import { getMounts, getPartPlacementInfo, resolveAssembly, validateAssembly, addAccessory, moveAccessory } from './assembly.ts';
import { detectCollisions } from './assembly-collisions.ts';
import type { RackDoc, PartId, Mount, ResolvedInstance, NumericParams } from './types.ts';

export interface PlacementProposal { doc: RackDoc; entries: ResolvedInstance[]; ownerId: string; target?: Mount; label: string }
export interface ProposalResult { proposal: PlacementProposal | null; reason: string; evaluated: number; mounts: Mount[] }
export const PROPOSAL_LIMIT = 64;
/** Coordinates, not opaque post names, determine the working and storage rows. */
export function scoreMount(doc: RackDoc, part: PartId, m: Mount): number {
  const posts = Object.values(doc.uprights), p = doc.uprights[m.uprightId];
  const rear = part.startsWith('storage-') || part === 'single-bar-holder';
  const row = (rear ? Math.max : Math.min)(...posts.map(p => p.y));
  const left = Math.min(...posts.filter(q => q.y === p.y).map(q => q.x));
  const outside = p.x === left ? 'left' : 'right';
  const face = rear || part === 'landmine' ? outside : 'front';
  const hooks = doc.accessories.find(a => a.part.startsWith('j-hook'));
  const height = part.startsWith('foot-') ? 65 : part === 'landmine' ? 165 : rear ? 365
    : part.startsWith('dip-') ? 815 : part.startsWith('safety-') || part === 'spotter-arm' ? (hooks ? 65 + hooks.target.hole * doc.rack.pitch - 250 : 815)
    : part === 'monolift' ? 1415 : part.startsWith('pullup-') ? doc.rack.height - 200 : 1215;
  return Math.abs(p.y - row) * 4 + (m.face === face ? 0 : 500) + Math.abs(m.position[2] - height) + (p.x === left ? 0 : 1);
}
function locationLabel(doc: RackDoc, id: string): string {
  const p = doc.uprights[id], posts = Object.values(doc.uprights);
  const row = p.y === Math.min(...posts.map(p => p.y)) ? 'front' : p.y === Math.max(...posts.map(p => p.y)) ? 'rear' : 'middle';
  const xs = posts.filter(q => q.y === p.y).map(q => q.x);
  const side = p.x === Math.min(...xs) ? 'left' : p.x === Math.max(...xs) ? 'right' : 'center';
  return `${row} ${side}`;
}
function proposalParams(doc: RackDoc, part: PartId, movingId: string | null): NumericParams {
  const previous = doc.accessories.find(a => a.id === movingId);
  if (previous) return previous.params;
  return part === 'safety-pin-pipe' ? { pinDiameter: partDefaults(doc, part).pinDiameter } : {};
}
/** Mount enumeration must validate the same profile defaults as the eventual preview. */
export function placementMounts(doc: RackDoc, part: PartId, movingId: string | null = null): Mount[] {
  return getMounts(doc, part, proposalParams(doc, part, movingId));
}
/** Strip renderer metadata, retaining all domain target fields (including future target kinds). */
type DomainTarget<T> = T extends Mount ? Omit<T, 'position' | 'center' | 'localAnchor' | 'pinAxis' | 'label' | 'connectorId'> : never;
export function placementTarget<T extends Mount>(target: T): DomainTarget<T> {
  const { position, center, localAnchor, pinAxis, label, connectorId, ...domainTarget } = target;
  return structuredClone(domainTarget) as DomainTarget<T>;
}
/** Pure preview document adapter, also usable by swap/hover callers. */
export function proposalAt(doc: RackDoc, part: PartId, target: Mount, paired: boolean, movingId: string | null = null): PlacementProposal {
  const info = getPartPlacementInfo(part, doc)!, domainTarget = placementTarget(target);
  const next = movingId ? moveAccessory(doc, movingId, domainTarget, paired)
    : addAccessory(doc, part, domainTarget, false, proposalParams(doc, part, null));
  const accessory = movingId ? next.accessories.find(a => a.id === movingId)! : next.accessories.at(-1)!;
  accessory.target = { ...domainTarget, ...accessory.target };
  accessory.paired = !!info.paired && paired;
  // Upright symmetry is local to this adapter. Other target kinds use their
  // domain validator's pair rules (e.g. matching parallel crossmember targets).
  if (accessory.paired && !accessory.pairTo && (!('kind' in domainTarget) || domainTarget.kind === 'upright')) {
    const p = doc.uprights[accessory.target.uprightId];
    accessory.pairTo = Object.entries(doc.uprights).filter(([id,q]) => id !== accessory.target.uprightId && !doc.removed.includes(id) && q.y === p.y)
      .sort((a,b) => Math.abs(a[1].x-p.x)-Math.abs(b[1].x-p.x))[0]?.[0];
  }
  if (accessory.paired && accessory.spanTo && accessory.pairTo && !accessory.pairedSpanTo) {
    const start = doc.uprights[accessory.target.uprightId], end = doc.uprights[accessory.spanTo], peer = doc.uprights[accessory.pairTo];
    accessory.pairedSpanTo = Object.keys(doc.uprights).find(id => !doc.removed.includes(id)
      && doc.uprights[id].x === peer.x + end.x - start.x && doc.uprights[id].y === peer.y + end.y - start.y);
  }
  const ownerId = accessory.id, valid = validateAssembly(next);
  const entries = resolveAssembly(valid).filter(r => (r.ownerId || r.id) === ownerId);
  return { doc: valid, entries, ownerId, target, label: target.label ?? `${locationLabel(doc, target.uprightId)} · ${target.face} · hole ${target.hole + 1}` };
}
export function proposalCollision(base: ResolvedInstance[], proposal: PlacementProposal): string | undefined {
  const ids = new Set(proposal.entries.map(r => r.id));
  return detectCollisions([...base.filter(r => (r.ownerId || r.id) !== proposal.ownerId), ...proposal.entries]).find(w => w.ids.some(id => ids.has(id)))?.message;
}
export function structureProposalAt(doc: RackDoc, part: PartId, slot: string): PlacementProposal {
  const candidate = swapCandidate(doc, slot, part);
  if (!candidate.valid) throw new Error(candidate.reason);
  return { ...candidate, label: slot.replaceAll('-', ' ') };
}
export function suggestPlacement(doc: RackDoc, part: PartId, paired = true, movingId: string | null = null): ProposalResult {
  const info = getPartPlacementInfo(part, doc), base = resolveAssembly(doc);
  let reason = 'No compatible mounting connection remains.', evaluated = 0;
  const structural = part === 'upright' || !!info?.slots?.length;
  const mounts = structural ? [] : placementMounts(doc, part, movingId).sort((a,b) => scoreMount(doc,part,a)-scoreMount(doc,part,b));
  const candidates = structural ? (info?.slots ?? []).filter(id => part !== 'upright' || doc.removed.includes(id)) : mounts;
  if (part === 'upright' && !candidates.length) reason = 'All uprights are present; extend the rack in Uprights & connections.';
  // No WASM or mesh builds: bounded transform/envelope checks after ranking.
  for (const candidate of candidates.slice(0, PROPOSAL_LIMIT)) {
    evaluated++;
    try {
      let proposal: PlacementProposal;
      if (typeof candidate === 'string') {
        proposal = structureProposalAt(doc, part, candidate);
      } else proposal = proposalAt(doc, part, candidate, paired, movingId);
      const collision = proposalCollision(base, proposal);
      if (collision) { reason = collision; continue; }
      return { proposal, mounts, reason: '', evaluated };
    } catch (error) { reason = (error as Error).message; }
  }
  if (!structural && !mounts.length) {
    // Preserve the actual adapter rejection instead of guessing at pitch/face.
    const target = getMounts(doc).find(m => m.hole === 12 && m.face === (part.startsWith('pullup-') || part.startsWith('safety-') ? 'right' : 'front')) ?? getMounts(doc)[0];
    if (target) try { proposalAt(doc,part,target,paired,movingId); } catch(error) { reason = (error as Error).message; }
  }
  return { proposal: null, mounts, reason: `${evaluated === PROPOSAL_LIMIT ? 'Checked the 64 best positions. ' : ''}${reason}`, evaluated };
}
