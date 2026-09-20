import { wallPart, wallFace } from './wall-registry.ts';
import { resolveBy, validateFloorParams as validateParams } from './floor-part.ts';
import { rackBounds } from './floor-items.ts';
import { ROOM_DEFAULTS, isWallId, wallFrames, wallToFloor, type Room, type WallId, type WallOpening } from './walls.ts';
import type { RackDoc, ResolvedInstance, Vec2, WallItem } from './types.ts';
type Rect = { min: Vec2; max: Vec2 };
const entry = (part: string) => { const found = wallPart(part); if (!found) throw Error('Unknown wall item.'); return found; };
export const roomOf = (doc: Pick<RackDoc, 'room'>): Room => doc.room ?? ROOM_DEFAULTS;
export function validateWallItems(input: unknown, reserved: string[] = []): WallItem[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 100) throw Error('At most 100 wall items are allowed.');
  const ids = new Set(reserved);
  return input.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^wall-[a-z0-9-]{1,100}$/.test(item.id) || ids.has(item.id)) throw Error('Invalid or duplicate wall item ID.');
    ids.add(item.id);
    const part = entry(item.part);
    if (!isWallId(item.wall)) throw Error('Unknown wall.');
    if (!Array.isArray(item.position) || item.position.length !== 2 || !item.position.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100000) || item.position[1] < 0) throw Error('Invalid wall position.');
    return { id:item.id, part:item.part, wall:item.wall, position:[...item.position] as Vec2, params:validateParams(part, item.params) };
  });
}
/** Wall [u, height] -> source Z-up: world floor X/Z -> X/-Y, height -> Z; the wall's rotation turns local -Y into the room. */
export function resolveWallItems(items: WallItem[] = [], room: Room = ROOM_DEFAULTS): ResolvedInstance[] {
  const frames = wallFrames(room);
  return items.map(item => { const frame = frames[item.wall], [x, z] = wallToFloor(frame, item.position[0]);
    return { id:item.id, ownerId:item.id, part:item.part, params:{...item.params}, position:[x,-z,item.position[1]], rotation:[0,0,frame.rotation], kind:'wall-item', mount:null, mounts:[], connectedTo:[], paired:false, name:entry(item.part).name }; });
}
/** Openings cut into the wall finishes (#200) by wall items whose part declares `opening` (windows, doors), clipped to
 * their wall. A decor part only needs `opening` in its wall-part spec: the scene cuts the hole, and the part (placed like
 * any wall item: `wall` + `[u, height]` of its face centre, frame from wallFrames(room)[wall]) draws the frame and glass. */
export function wallOpenings(doc: Pick<RackDoc, 'room' | 'wallItems'>): WallOpening[] {
  const frames = wallFrames(roomOf(doc)), openings: WallOpening[] = [];
  for (const item of doc.wallItems ?? []) {
    const part = entry(item.part);
    if (!part.opening) continue;
    const { width, height } = part.opening === true ? wallFace(part, item.params) : resolveBy(part.opening, item.params), [u, h] = item.position, frame = frames[item.wall];
    const min: Vec2 = [Math.max(-frame.length / 2, u - width / 2), Math.max(0, h - height / 2)], max: Vec2 = [Math.min(frame.length / 2, u + width / 2), Math.min(frame.height, h + height / 2)];
    if (min[0] < max[0] && min[1] < max[1]) openings.push({ id: item.id, wall: item.wall, min, max });
  }
  return openings;
}
export function wallRect(item: Pick<WallItem, 'part' | 'params' | 'position'>): Rect {
  const { width, height } = wallFace(entry(item.part), item.params), [u, h] = item.position;
  return { min:[u-width/2,h-height/2], max:[u+width/2,h+height/2] };
}
const overlaps = (a: Rect, b: Rect, margin = 0) => a.min.every((v, i) => v < b.max[i] + margin && a.max[i] + margin > b.min[i]);
/** Keeps the whole face on the wall, snapped to 25 mm unless `snap` is false. */
export function clampWallPosition(room: Room, item: Pick<WallItem, 'part' | 'params'>, wall: WallId, [u, h]: Vec2, snap = true): Vec2 {
  const frame = wallFrames(room)[wall], { width, height } = wallFace(entry(item.part), item.params);
  const grid = (v: number) => snap ? Math.round(v / 25) * 25 : v, clamp = (v: number, limit: number, low = -limit) => Math.min(limit, Math.max(low, v));
  const halfU = Math.max(0, frame.length / 2 - width / 2), top = Math.max(height / 2, frame.height - height / 2);
  return [clamp(grid(u), halfU), clamp(grid(h), top, height / 2)];
}
const title = (noun: string) => noun[0].toUpperCase() + noun.slice(1);
export function wallWarnings(doc: RackDoc) {
  const items = doc.wallItems ?? [], warnings: { ids: [string, string]; message: string }[] = [], room = roomOf(doc), frames = wallFrames(room);
  if (!items.length) return warnings;
  for (const [i, item] of items.entries()) {
    const rect = wallRect(item), frame = frames[item.wall];
    if (rect.min[0] < -frame.length / 2 - 1e-6 || rect.max[0] > frame.length / 2 + 1e-6 || rect.min[1] < -1e-6 || rect.max[1] > frame.height + 1e-6) warnings.push({ ids:[item.id, `${item.wall}-wall`], message:`${title(entry(item.part).noun)} extends past the ${frame.label.toLowerCase()}.` });
    for (const other of items.slice(i + 1)) if (other.wall === item.wall && overlaps(rect, wallRect(other))) warnings.push({ ids:[item.id, other.id], message:'Wall items overlap.' });
  }
  const rack = rackBounds(doc);
  if (rack) for (const frame of Object.values(frames)) {
    const [nx, nz] = frame.normal, reach = Math.min(...[0, 1].flatMap(x => [0, 1].map(z => ((x ? rack.max[0] : rack.min[0]) - frame.center[0]) * nx + ((z ? rack.max[1] : rack.min[1]) - frame.center[1]) * nz)));
    if (reach < 0) warnings.push({ ids:['rack', `${frame.id}-wall`], message:`Rack crosses the ${frame.label.toLowerCase()}.` });
  }
  return warnings;
}
/** Adds one item at `placement` (clamped), else on the left wall facing the rack, stepping clear of other wall items. */
export function addWallItem(doc: RackDoc, part: string, placement?: { wall: WallId; position: Vec2 }): RackDoc {
  const spec = entry(part), next = structuredClone(doc), room = roomOf(doc), frames = wallFrames(room);
  const taken = (id: string) => next.wallItems!.some(i => i.id === id) || !!next.floorItems?.some(i => i.id === id) || !!next.systems?.some(i => i.id === id) || Object.hasOwn(next.uprights, id) || next.connections.some(i => i.id === id) || next.accessories.some(i => i.id === id);
  next.wallItems ??= [];
  let id: string; do { id = `wall-${next.nextId++}`; } while (taken(id));
  const item: WallItem = { id, part: spec.id as WallItem['part'], wall: 'back', position: [0, 0], params: { ...spec.defaults } };
  if (placement) { item.wall = placement.wall; item.position = clampWallPosition(room, item, placement.wall, placement.position); }
  else {
    const { width } = wallFace(spec, item.params), rack = rackBounds(doc) ?? { min: [0, 0], max: [0, 0] }, h = spec.height ?? 1500, stride = width + 100;
    const back = frames.back, left = frames.left, beside = (x: number) => x - back.center[0], opposite = -((rack.min[1] + rack.max[1]) / 2 - left.center[1]);
    // Left wall facing the rack (square to the default 3D view), then the back wall 900 mm either side of the rack, then the rest.
    const starts: [WallId, number, number][] = [['left', opposite, 1], ['left', opposite - stride, -1], ['back', beside(rack.min[0] - 900 - width / 2), -1], ['back', beside(rack.max[0] + 900 + width / 2), 1], ...(['right', 'front'] as const).flatMap(w => [[w, 0, 1], [w, -stride, -1]] as [WallId, number, number][])];
    const fits = (wall: WallId, u: number) => { const position: Vec2 = [u, h], clamped = clampWallPosition(room, item, wall, position);
      return Math.abs(clamped[0] - Math.round(u / 25) * 25) < 1e-6 && !next.wallItems!.some(other => other.wall === wall && overlaps(wallRect({ ...item, position: clamped }), wallRect(other), 50)) ? clamped : null; };
    let found: [WallId, Vec2] | null = null;
    for (const [wall, start, step] of starts) {
      for (let u = start; !found && Math.abs(u) <= frames[wall].length / 2; u += step * stride) { const position = fits(wall, u); if (position) found = [wall, position]; }
      if (found) break;
    }
    [item.wall, item.position] = found ?? ['left', clampWallPosition(room, item, 'left', [opposite, h])];
  }
  next.wallItems.push(item); return next;
}
