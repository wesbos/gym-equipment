import { resolveAssembly, validateAssembly } from './assembly.ts';
import { withSystem } from './systems.ts';
import { SYSTEM_NAMES, type SystemPartId } from './system-types.ts';
import type { RackDoc, NumericParams } from './types.ts';
import type { PlacementProposal } from './placement-proposals.ts';

/** Use the same graph-derived bay validation as installed systems and exports. */
export function systemProposal(doc: RackDoc, part: SystemPartId, params: NumericParams = {}): { proposal: PlacementProposal | null; reason: string } {
  try {
    const next = validateAssembly(withSystem(doc, part, params));
    const system = next.systems!.at(-1)!;
    const entries = resolveAssembly(next).filter(entry => entry.ownerId === system.id);
    return { proposal: { doc: next, entries, ownerId: system.id,
      label: `${SYSTEM_NAMES[part]} · ${system.bay!.length}-post bay (${system.bay!.join(', ')})` }, reason: '' };
  } catch (error) {
    return { proposal: null, reason: error instanceof Error ? error.message : String(error) };
  }
}
