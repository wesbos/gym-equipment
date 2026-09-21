/** Placement warnings (#206): every collision, floor, wall and hang warning for a design, and what clicking one
 * selects and frames. Pure and unit tested (src/components/warnings.test.ts). */
import type { RackDoc, ResolvedInstance } from '../../../rack-generator/types.ts';
import { detectCollisions } from '../../../rack-generator/assembly-collisions.ts';
import { floorWarnings } from '../../../rack-generator/floor-items.ts';
import { wallWarnings } from '../../../rack-generator/wall-items.ts';
import { hangWarnings } from '../../../rack-generator/hang-items.ts';
import type { EditorApi } from '../CommandPalette/commands.ts';

export interface PlacementWarning { ids: readonly string[]; message: string }
const cache = new WeakMap<readonly ResolvedInstance[], { doc: RackDoc; warnings: PlacementWarning[] }>();
/** The same list the scene's status line counts, computed once per (doc, resolved). */
export function collectWarnings(doc: RackDoc, resolved: readonly ResolvedInstance[]): PlacementWarning[] {
  const hit = cache.get(resolved);
  if (hit?.doc === doc) return hit.warnings;
  const warnings = [...detectCollisions(resolved), ...floorWarnings(doc), ...wallWarnings(doc), ...hangWarnings(doc)];
  cache.set(resolved, { doc, warnings });
  return warnings;
}
/** Warning ids are physical ids, owner ids (a pair), `rack` (the frame) or `<wall>-wall` (a room wall, not a part).
 * `select`: the parts named (the rack frame only when nothing else is); `frame`: everything involved. */
export function warningTargets(warning: PlacementWarning, resolved: readonly ResolvedInstance[]): { select: string[]; frame: string[] } {
  const physical = (id: string) => resolved.filter(r => r.id === id || r.ownerId === id).map(r => r.id);
  const named = [...new Set(warning.ids.filter(id => id !== 'rack').flatMap(physical))];
  const rack = warning.ids.includes('rack') ? resolved.filter(r => r.kind === 'structure').map(r => r.id) : [];
  return { select: named.length ? named : rack, frame: [...new Set([...named, ...rack])] };
}
/** Same warnings (by message and ids): the list re-renders only when a warning appears, disappears or changes. */
export const sameWarnings = (a: readonly PlacementWarning[], b: readonly PlacementWarning[]) =>
  a === b || a.length === b.length && a.every((w, i) => w.message === b[i].message && w.ids.join() === b[i].ids.join());

/** Select the parts a warning names and frame everything it involves. */
export function focusWarning(api: EditorApi, warning: PlacementWarning) {
  const s = api.store.getSnapshot(), { select, frame } = warningTargets(warning, s.resolved);
  if (s.placing || s.structureChoice || s.systemChoice) api.store.cancelPlacement();
  if (select.length) api.store.selectMany(select);
  if (frame.length) api.scene()?.focus(frame);
}
