/** Plates on barbell sleeves (#160): wraps every loadable floor bar's catalog build so the plateR… / plateL… params
 * that resolveFloorItems emits become plate stacks on the bar's own sleeves (barSleeves at the local origin, so the
 * instance pose carries them parked, yawed or lifted onto the plates). The bar itself builds from its catalog params
 * only; `racked` still reaches it. Stacks are named `plate-R…` / `plate-L…` and are scene + GLB dressing. */
import type { PartDefinition, SolidPart } from '../types.ts';
import { floorPart } from '../floor-registry.ts';
import { barSleeves } from '../floor-parts/barbell.ts';
import { barLoadFromParams, sleeveSpec, withoutBarLoadParams } from '../bar-loads.ts';
import { buildPlateStack } from './plates.ts';

export function withBarLoads(definition: PartDefinition): PartDefinition {
  const part = floorPart(definition.id);
  if (!part?.bar) return definition;
  return {
    ...definition,
    build: (api, params, logo) => {
      const stacks = barLoadFromParams(params), base = withoutBarLoadParams(params);
      const parts = definition.build(api, base, logo);
      if (!stacks[0].length && !stacks[1].length) return parts;
      const added: SolidPart[] = [];
      try {
        const sleeves = barSleeves({ position: [0, 0, 0], rotation: [0, 0, 0] }, sleeveSpec(part, base));
        for (const [i, side] of (['R', 'L'] as const).entries())
          if (stacks[i].length) added.push(...buildPlateStack(api, stacks[i], { origin: sleeves[i].origin, axis: sleeves[i].axis, name: `plate-${side}`, segments: 64 }));
        return [...parts, ...added];
      } catch (error) {
        for (const p of [...parts, ...added]) p.solid.delete();
        throw error;
      }
    },
  };
}
