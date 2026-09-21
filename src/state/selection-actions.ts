/** What the selection action bar (#205) and the inspector footer can do with the current selection, plus the pure
 * document edits behind them (variant swap, pairing, duplication). No React and no geometry: unit tested in
 * selection-actions.test.ts and cheap enough to run on every store change (the bar's selector does). */
import { getPartPlacementInfo, pairedByDefault, replaceStructurePart, rotationMode, unpairAccessory } from '../../rack-generator/assembly.ts';
import { isSystemPart } from '../../rack-generator/system-types.ts';
import { isUprightTarget } from '../../rack-generator/rack-targets.ts';
import { addFloorItem } from '../../rack-generator/floor-items.ts';
import { addWallItem } from '../../rack-generator/wall-items.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { CATALOG_PART_IDS } from '../components/PartGallery/gallery-model.ts';
import type { PartId, RackDoc, ResolvedInstance } from '../../rack-generator/types.ts';
import type { PhysicalInstanceId } from './selection.ts';

export type SelectionKind = 'none' | 'room' | 'rack' | 'structure' | 'floor' | 'wall' | 'hang' | 'system' | 'multi';
export interface SelectionActions {
  kind: SelectionKind;
  /** Physical pieces selected. */ count: number;
  /** The single selected physical piece (null for none, room and multi). */ id: string | null;
  /** Part of the single selection, for labels and thumbnails. */ part: PartId | null;
  /** Reposition in 3D (floor drag, wall slide, hook pick, mount pick or topology move). */ move: boolean;
  /** Rotation step in degrees for ±buttons; 0 when the selection cannot rotate. */ rotate: number;
  duplicate: boolean;
  remove: boolean;
  /** Other variants the single selection can be swapped to. */ swap: boolean;
  pair: 'pair' | 'unpair' | null;
  focus: boolean;
}
/** The snapshot fields the action logic reads (a structural subset of BuilderSnapshot). */
export interface SelectionState {
  doc: RackDoc; resolved: ResolvedInstance[]; selection: readonly PhysicalInstanceId[]; selected: string | null;
  roomInspector?: boolean;
}
const NONE: SelectionActions = { kind: 'none', count: 0, id: null, part: null, move: false, rotate: 0, duplicate: false, remove: false, swap: false, pair: null, focus: false };
const physicalOf = (state: Pick<SelectionState, 'resolved'>, id: string | null) =>
  id ? state.resolved.find(r => r.id === id) ?? state.resolved.find(r => r.ownerId === id) : undefined;

/** Which kind of thing the selection is: drives the bar's buttons and the inspector route. */
export function selectionKind(state: SelectionState): SelectionKind {
  if (state.roomInspector) return 'room';
  if (state.selection.length > 1) return 'multi';
  const physical = physicalOf(state, state.selected);
  if (!physical) return 'none';
  const { doc } = state;
  if (isSystemPart(physical.part) || doc.systems?.some(s => s.id === physical.ownerId)) return 'system';
  if (physical.kind === 'floor-item') return 'floor';
  if (physical.kind === 'wall-item') return doc.hangItems?.some(h => h.id === physical.id) ? 'hang' : 'wall';
  if (doc.accessories.some(a => a.id === physical.ownerId)) return 'rack';
  return 'structure';
}

/** Structure members swap to the frame parts that fit their slot; accessories to their family (catalog order).
 * Accessory families do not depend on the document, so they are cached for the session. */
const familyVariants = new Map<string, PartId[]>();
const slotVariants = new WeakMap<RackDoc, Map<string, PartId[]>>();
export function variantOptions(doc: RackDoc, resolved: ResolvedInstance[], id: string | null): PartId[] {
  const physical = physicalOf({ resolved }, id);
  if (!physical || physical.kind === 'floor-item' || physical.kind === 'wall-item' || physical.part === 'upright' || isSystemPart(physical.part)) return [];
  const entry = doc.accessories.find(a => a.id === physical.ownerId);
  if (entry) {
    const family = getPartPlacementInfo(entry.part, doc)?.family;
    if (!family) return [];
    let list = familyVariants.get(family);
    if (!list) {
      list = CATALOG_PART_IDS.filter(p => { const info = getPartPlacementInfo(p); return info?.family === family && !info.slots?.length && p !== 'upright'; });
      familyVariants.set(family, list);
    }
    return list.includes(entry.part) ? list : [entry.part, ...list];
  }
  const slot = physical.ownerId || physical.id;
  let bySlot = slotVariants.get(doc);
  if (!bySlot) slotVariants.set(doc, bySlot = new Map());
  let list = bySlot.get(slot);
  if (!list) { list = CATALOG_PART_IDS.filter(p => getPartPlacementInfo(p, doc)?.slots?.includes(slot)); bySlot.set(slot, list); }
  return list;
}

/** The inspector's variant change: accessories keep their mount and restart from the variant's defaults (an
 * upright-mounted pair follows the new variant's pairing rules); frame members are replaced in their slot. */
export function applyVariant(doc: RackDoc, resolved: ResolvedInstance[], id: string, variant: PartId): RackDoc {
  const physical = physicalOf({ resolved }, id);
  if (!physical) throw Error('Select a part to swap.');
  const entry = doc.accessories.find(a => a.id === physical.ownerId);
  if (!entry) return replaceStructurePart(doc, physical.ownerId || physical.id, variant);
  if (entry.part === variant) return doc;
  const next = structuredClone(doc), item = next.accessories.find(a => a.id === entry.id)!;
  const info = getPartPlacementInfo(entry.part, doc);
  item.part = variant; item.params = {};
  if (isUprightTarget(entry.target)) item.paired = !info?.paired ? pairedByDefault(variant, doc) : !!getPartPlacementInfo(variant, doc)?.paired && entry.paired;
  return next;
}

/** Pair an unpaired pairable accessory (its mirror is derived from the mount), or split a pair into two sides. */
export function togglePair(doc: RackDoc, resolved: ResolvedInstance[], id: string): RackDoc {
  const physical = physicalOf({ resolved }, id), entry = doc.accessories.find(a => a.id === physical?.ownerId);
  if (!entry || !getPartPlacementInfo(entry.part, doc)?.paired) throw Error('Select a pairable attachment.');
  if (entry.paired) return unpairAccessory(doc, entry.id);
  const next = structuredClone(doc);
  next.accessories.find(a => a.id === entry.id)!.paired = true;
  return next;
}

/** Physical pieces a duplicate copies: whole accessory owners (both sides of a pair), floor, wall and hung items.
 * Systems and frame members cannot be duplicated. */
function duplicable(doc: RackDoc, resolved: ResolvedInstance[], selection: readonly PhysicalInstanceId[]) {
  const instances = resolved.filter(r => selection.includes(r.id));
  if (!instances.length) return null;
  for (const r of instances) {
    if (isSystemPart(r.part)) return null;
    if (r.kind === 'accessory' && doc.accessories.some(a => a.id === r.ownerId)) continue;
    if (r.kind === 'floor-item' && doc.floorItems?.some(i => i.id === r.id)) continue;
    if (r.kind === 'wall-item' && (doc.wallItems?.some(i => i.id === r.id) || doc.hangItems?.some(h => h.id === r.id && freeSlots(doc, h.part).length))) continue;
    return null;
  }
  return instances;
}
export const canDuplicate = (doc: RackDoc, resolved: ResolvedInstance[], selection: readonly PhysicalInstanceId[]) => !!duplicable(doc, resolved, selection);

/** Copies the selection in one document: accessory owners at their existing mounts (the user then moves them), with
 * per-piece paint; floor and wall items at the next free spot beside the rack with the same options; hung items on
 * the next free hook. Returns the new owner ids to select, or null when nothing can be copied. */
export function duplicateSelection(doc: RackDoc, resolved: ResolvedInstance[], selection: readonly PhysicalInstanceId[]): { doc: RackDoc; owners: string[] } | null {
  const instances = duplicable(doc, resolved, selection);
  if (!instances) return null;
  let next = structuredClone(doc);
  const owners: string[] = [];
  const copyPaint = (from: string, to: string) => {
    for (const key of ['overrides', 'finishOverrides'] as const) {
      const value = doc.appearance?.[key]?.[from];
      if (!value) continue;
      next.appearance ??= {}; (next.appearance[key] as Record<string, string>) ??= {};
      (next.appearance[key] as Record<string, string>)[to] = value;
    }
  };
  const taken = (id: string) => next.accessories.some(a => a.id === id) || !!next.uprights[id] || next.connections.some(c => c.id === id);
  for (const owner of [...new Set(instances.filter(r => r.kind === 'accessory').map(r => r.ownerId))]) {
    const item = doc.accessories.find(a => a.id === owner)!;
    let id: string;
    do { id = `accessory-${next.nextId++}`; } while (taken(id));
    next.accessories.push({ ...structuredClone(item), id }); owners.push(id);
    for (const physical of resolved.filter(r => r.ownerId === owner)) copyPaint(physical.id, id + physical.id.slice(owner.length));
  }
  for (const r of instances) {
    const floor = doc.floorItems?.find(i => i.id === r.id), wall = doc.wallItems?.find(i => i.id === r.id), hang = doc.hangItems?.find(h => h.id === r.id);
    if (floor) {
      next = addFloorItem(next, floor.part);
      const copy = next.floorItems!.at(-1)!;
      copy.params = structuredClone(floor.params); copy.rotation = floor.rotation;
      if (floor.plates) copy.plates = structuredClone(floor.plates);
      copyPaint(floor.id, copy.id); owners.push(copy.id);
    } else if (wall) {
      next = addWallItem(next, wall.part);
      const copy = next.wallItems!.at(-1)!;
      copy.params = structuredClone(wall.params);
      copyPaint(wall.id, copy.id); owners.push(copy.id);
    } else if (hang) {
      const slot = freeSlots(next, hang.part)[0];
      if (!slot) continue;
      next = placeHang(next, hang.part, slot);
      owners.push(next.hangItems!.at(-1)!.id);
    }
  }
  return owners.length ? { doc: next, owners } : null;
}

/** Every action the bar offers for this selection. */
export function selectionActions(state: SelectionState): SelectionActions {
  const kind = selectionKind(state);
  if (kind === 'none' || kind === 'room') return kind === 'none' ? NONE : { ...NONE, kind };
  const { doc, resolved, selection } = state;
  const duplicate = canDuplicate(doc, resolved, selection);
  if (kind === 'multi') return { ...NONE, kind, count: selection.length, duplicate, remove: true, focus: true };
  const physical = physicalOf(state, state.selected)!;
  const base = { ...NONE, kind, count: 1, id: physical.id, part: physical.part, duplicate, remove: true, focus: true };
  switch (kind) {
    case 'system': return base;
    case 'floor': return { ...base, move: true, rotate: doc.floorItems?.find(i => i.id === physical.id)?.cradle ? 0 : 15 };
    case 'wall': case 'hang': return { ...base, move: true };
    // Uprights and connections move through the topology editor (store.pickup opens it on the move form).
    case 'structure': return { ...base, move: Object.hasOwn(doc.uprights, physical.ownerId) || doc.connections.some(c => c.id === physical.ownerId), swap:variantOptions(doc, resolved, physical.id).length > 1 };
    case 'rack': {
      const entry = doc.accessories.find(a => a.id === physical.ownerId)!, mode = rotationMode(doc, entry.id);
      return { ...base, move: true, rotate: mode.supported ? mode.step : 0, swap: variantOptions(doc, resolved, physical.id).length > 1,
        pair: getPartPlacementInfo(entry.part, doc)?.paired ? entry.paired ? 'unpair' : 'pair' : null };
    }
  }
  return base;
}
/** The action bar's view: busy modes (placing, structure or system staging) have their own hint bar, so it hides. */
export function barActions(state: SelectionState & { placing?: unknown; structureChoice?: unknown; systemChoice?: unknown }): SelectionActions {
  if (state.placing || state.structureChoice || state.systemChoice || !state.selection.length) return NONE;
  return selectionActions(state);
}
export function sameActions(a: SelectionActions, b: SelectionActions) {
  return a === b || (Object.keys(a) as (keyof SelectionActions)[]).every(key => a[key] === b[key]);
}
