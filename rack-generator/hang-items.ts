import { hangPart, HOOK_REACH } from './hang-registry.ts';
import { wallPart } from './wall-registry.ts';
import { resolveWallItems, roomOf } from './wall-items.ts';
import type { HangItem, NumericParams, RackDoc, ResolvedInstance, Vec2, Vec3, WallItem } from './types.ts';
type Rect = { min: Vec2; max: Vec2 };
export interface HangTarget { panel: string; slot: number }
const entry = (part: string) => { const found = hangPart(part); if (!found) throw Error('Unknown hung attachment.'); return found; };
/** Hook slots [x, z] on a wall item's face; empty for unslotted wall parts. */
export const panelSlots = (panel: Pick<WallItem, 'part' | 'params'>, params: NumericParams = panel.params): Vec2[] => wallPart(panel.part)?.slots?.(params) ?? [];
/** Strict: every hung attachment needs an existing slotted panel, a real slot, and a slot of its own. */
export function validateHangItems(input: unknown, panels: WallItem[], reserved: string[] = []): HangItem[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 200) throw Error('At most 200 hung attachments are allowed.');
  const ids = new Set(reserved), used = new Set<string>();
  return input.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^hang-[a-z0-9-]{1,100}$/.test(item.id) || ids.has(item.id)) throw Error('Invalid or duplicate hung attachment ID.');
    ids.add(item.id); entry(item.part);
    const panel = panels.find(p => p.id === item.panel);
    if (!panel) throw Error('Hung attachment references a missing panel.');
    if (!Number.isInteger(item.slot) || item.slot < 0 || item.slot >= panelSlots(panel).length) throw Error('Hook slot does not exist on its panel.');
    if (used.has(`${item.panel}:${item.slot}`)) throw Error('Hook slot is already used.');
    used.add(`${item.panel}:${item.slot}`);
    return { id:item.id, part:item.part, panel:item.panel, slot:item.slot };
  });
}
/** Local anchor on the panel: slot on the face, pushed out by the panel standoff plus the peg reach. */
export const hookAnchor = (panel: WallItem, slot: number): Vec3 => { const [x, z] = panelSlots(panel)[slot]; return [x, -(wallPart(panel.part)!.depth + HOOK_REACH), z]; };
/** Attachments follow their panel: panel transform × hook anchor. Ownership stays with the attachment (drag/select). */
export function resolveHangItems(doc: Pick<RackDoc, 'hangItems' | 'wallItems' | 'room'>, items = doc.hangItems ?? []): ResolvedInstance[] {
  const panels = new Map(resolveWallItems(doc.wallItems, roomOf(doc)).map(e => [e.id, e]));
  return items.map(item => {
    const panel = doc.wallItems!.find(p => p.id === item.panel)!, at = panels.get(item.panel)!, a = at.rotation[2], [x, y, z] = hookAnchor(panel, item.slot);
    const position: Vec3 = [at.position[0] + x * Math.cos(a) - y * Math.sin(a), at.position[1] + x * Math.sin(a) + y * Math.cos(a), at.position[2] + z];
    return { id:item.id, ownerId:item.id, part:item.part, params:{ hook: 1 }, position, rotation:[0,0,a], kind:'wall-item', mount:null, mounts:[], connectedTo:[item.panel], paired:false, name:entry(item.part).name };
  });
}
function hangRect(part: string, [x, z]: Vec2): Rect { const { width, above, drop } = entry(part).envelope; return { min:[x-width/2,z-drop], max:[x+width/2,z+above] }; }
const overlaps = (a: Rect, b: Rect) => a.min.every((v, i) => v < b.max[i] && a.max[i] > b.min[i]);
/** Slots where `part` can hang: free, and its envelope clear of the other attachments on that panel.
 * Ordered for suggestions: panels in doc order, top row first, centre-out. */
export function freeSlots(doc: RackDoc, part: string, movingId: string | null = null): HangTarget[] {
  const others = (doc.hangItems ?? []).filter(h => h.id !== movingId), out: (HangTarget & { rank: [number, number] })[] = [];
  for (const panel of doc.wallItems ?? []) {
    const slots = panelSlots(panel), taken = others.filter(h => h.panel === panel.id);
    slots.forEach((pos, slot) => {
      if (taken.some(h => h.slot === slot || overlaps(hangRect(part, pos), hangRect(h.part, slots[h.slot])))) return;
      out.push({ panel:panel.id, slot, rank:[-pos[1], Math.abs(pos[0])] });
    });
  }
  const order = (doc.wallItems ?? []).map(p => p.id);
  return out.sort((a, b) => order.indexOf(a.panel) - order.indexOf(b.panel) || a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1]).map(({ panel, slot }) => ({ panel, slot }));
}
/** Hangs a new attachment (or moves `movingId`) onto `target`. Validation rejects taken or missing slots. */
export function placeHang(doc: RackDoc, part: string, target: HangTarget, movingId: string | null = null): RackDoc {
  entry(part);
  const next = structuredClone(doc); next.hangItems ??= [];
  const moving = next.hangItems.find(h => h.id === movingId);
  if (moving) Object.assign(moving, target);
  else {
    const ids = new Set([...next.hangItems, ...next.wallItems ?? [], ...next.floorItems ?? [], ...next.systems ?? [], ...next.accessories, ...next.connections].map(i => i.id).concat(Object.keys(next.uprights)));
    let id: string; do { id = `hang-${next.nextId++}`; } while (ids.has(id));
    next.hangItems.push({ id, part: part as HangItem['part'], ...target });
  }
  return next;
}
/** After a panel's params change: keep attachments on hooks at the same physical spot, drop the rest. Returns the dropped IDs. */
export function reslotHangs(doc: RackDoc, panelId: string, previous: NumericParams): string[] {
  const panel = doc.wallItems?.find(p => p.id === panelId), before = panel ? panelSlots(panel, previous) : [], after = panel ? panelSlots(panel) : [], dropped: string[] = [];
  doc.hangItems = (doc.hangItems ?? []).filter(h => {
    if (h.panel !== panelId) return true;
    const [x, z] = before[h.slot] ?? [NaN, NaN], slot = after.findIndex(p => Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1] - z) < 1e-6);
    if (slot < 0) { dropped.push(h.id); return false; }
    h.slot = slot; return true;
  });
  return dropped;
}
export function hangWarnings(doc: RackDoc) {
  const items = doc.hangItems ?? [], warnings: { ids: [string, string]; message: string }[] = [];
  for (const [i, a] of items.entries()) {
    const slots = panelSlots(doc.wallItems!.find(p => p.id === a.panel)!);
    for (const b of items.slice(i + 1)) if (a.panel === b.panel && overlaps(hangRect(a.part, slots[a.slot]), hangRect(b.part, slots[b.slot]))) warnings.push({ ids:[a.id, b.id], message:'Hung attachments overlap.' });
  }
  return warnings;
}
