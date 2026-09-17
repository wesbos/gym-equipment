import { getPartPlacementInfo, removeInstance } from '../../rack-generator/assembly.ts';
import type { PartId, RackDoc, ResolvedInstance, PlacementField } from '../../rack-generator/types.ts';
/** Physical IDs are paint targets. Owners are deduplicated only for geometry/removal. */
export type PhysicalInstanceId = ResolvedInstance['id'];
export interface SelectionGesture { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }
export function selectionOwners(resolved: ResolvedInstance[], ids: readonly PhysicalInstanceId[]) {
  return [...new Set(resolved.filter(r => ids.includes(r.id)).map(r => r.ownerId))];
}
export function removeSelection(doc: RackDoc, resolved: ResolvedInstance[], ids: readonly PhysicalInstanceId[]) {
  return selectionOwners(resolved, ids).reduce((next, id) => removeInstance(next, id), doc);
}
export function sharedFields(doc: RackDoc, instances: ResolvedInstance[]): PlacementField[] {
  if (!instances.length || instances.some(r => r.kind !== 'accessory')) return [];
  const fields = instances.map(r => editableFields(r.part, doc));
  return fields[0].flatMap(field => {
    const matches = fields.map(list => list.find(f => f.key === field.key));
    if (matches.some(f => !f)) return [];
    const min = Math.max(...matches.map(f => f!.min)), max = Math.min(...matches.map(f => f!.max));
    return min <= max ? [{ ...field, min, max, step: Math.max(...matches.map(f => f!.step)) }] : [];
  });
}

export function editableFields(part: PartId, doc: RackDoc): PlacementField[] {
  return part.startsWith("pullup")
    ? [
        {
          key: "diameter",
          label: "Grip diameter",
          min: 15,
          max: 60,
          step: 0.5,
        },
        ...(part === "pullup-sphere"
          ? [
              {
                key: "sphereDiameter",
                label: "Sphere diameter",
                min: 40,
                max: 200,
                step: 0.5,
              },
            ]
          : []),
      ]
    : part === "safety-pin-pipe"
      ? [
          {
            key: "pipeDiameter",
            label: "Pipe diameter",
            min: 32,
            max: 75,
            step: 0.5,
          },
          { key: "wall", label: "Pipe wall", min: 1, max: 10, step: 0.5 },
          {
            key: "pinDiameter",
            label: "Pin diameter",
            min: 12,
            max: 24,
            step: 0.5,
          },
        ]
      : part === "safety-webbing"
        ? [
            { key: "sag", label: "Strap sag", min: 1, max: 200, step: 0.5 },
            {
              key: "strapWidth",
              label: "Strap width",
              min: 20,
              max: 75,
              step: 0.5,
            },
            {
              key: "strapThickness",
              label: "Strap thickness",
              min: 1,
              max: 8,
              step: 0.5,
            },
          ]
        : getPartPlacementInfo(part, doc)?.fields || [];
}
