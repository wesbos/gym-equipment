/** Gym walls (#85): four flat mounting planes around the rack origin. The distant circular backdrop is
 * decorative only; these walls are the placement surfaces wall parts snap to. World floor mm, as floor items:
 * X right, Z toward the default camera. `doc.room` stores each wall's distance from the origin. */
import type { Vec2, Vec3 } from './types.ts';
export const WALL_IDS = ['back', 'left', 'right', 'front'] as const;
export type WallId = (typeof WALL_IDS)[number];
export interface Room { back: number; left: number; right: number; front: number; height: number }
export const ROOM_DEFAULTS: Room = { back: 1500, left: 3000, right: 3000, front: 3000, height: 3000 };
export const ROOM_LIMITS: Record<keyof Room, readonly [number, number]> = { back: [600, 15000], left: [600, 15000], right: [600, 15000], front: [600, 15000], height: [2100, 6000] };
/** `along` is +u (rightward when facing the wall from inside); `normal` points into the room; `rotation`
 * is the source Z rotation that turns a part's local +X to `along` and its local -Y (its front) to `normal`. */
export interface WallFrame { id: WallId; label: string; center: Vec2; along: Vec2; normal: Vec2; length: number; height: number; rotation: number }
export function wallFrames(room: Room = ROOM_DEFAULTS): Record<WallId, WallFrame> {
  const { back, left, right, front, height } = room, midX = (right - left) / 2, midZ = (front - back) / 2;
  const frame = (id: WallId, center: Vec2, along: Vec2, length: number, rotation: number): WallFrame =>
    ({ id, label: `${id[0].toUpperCase()}${id.slice(1)} wall`, center, along, normal: [-along[1], along[0]], length, height, rotation });
  return {
    back: frame('back', [midX, -back], [1, 0], left + right, 0),
    left: frame('left', [-left, midZ], [0, -1], back + front, Math.PI / 2),
    right: frame('right', [right, midZ], [0, 1], back + front, -Math.PI / 2),
    front: frame('front', [midX, front], [-1, 0], left + right, Math.PI),
  };
}
export const isWallId = (value: unknown): value is WallId => (WALL_IDS as readonly unknown[]).includes(value);
/** Wall coordinates [u along the wall from its centre, height] -> world floor [x, z]. */
export const wallToFloor = (frame: WallFrame, u: number): Vec2 => [frame.center[0] + frame.along[0] * u, frame.center[1] + frame.along[1] * u];
export function validateRoom(input: unknown): Room | undefined {
  if (input === undefined) return undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !Object.hasOwn(ROOM_DEFAULTS, k))) throw Error('Invalid room walls.');
  const room = { ...ROOM_DEFAULTS, ...input as Partial<Room> };
  for (const [key, [min, max]] of Object.entries(ROOM_LIMITS) as [keyof Room, readonly [number, number]][])
    if (typeof room[key] !== 'number' || !Number.isFinite(room[key]) || room[key] < min || room[key] > max) throw Error(`Room ${key} must be ${min}–${max} mm.`);
  return room;
}
export interface WallHit { wall: WallId; u: number; h: number; distance: number }
/** World ray -> wall coordinates on one wall's infinite plane (drags), or null when parallel/behind. */
export function wallPlaneHit(frame: WallFrame, origin: Vec3, direction: Vec3): WallHit | null {
  const [nx, nz] = frame.normal, facing = direction[0] * nx + direction[2] * nz;
  if (Math.abs(facing) < 1e-9) return null;
  const distance = ((frame.center[0] - origin[0]) * nx + (frame.center[1] - origin[2]) * nz) / facing;
  if (distance <= 0) return null;
  const x = origin[0] + direction[0] * distance, y = origin[1] + direction[1] * distance, z = origin[2] + direction[2] * distance;
  return { wall: frame.id, u: (x - frame.center[0]) * frame.along[0] + (z - frame.center[1]) * frame.along[1], h: y, distance };
}
/** True when `point` is on the room side of the wall: the wall is drawn and pickable only from inside. */
export const facesInside = (frame: WallFrame, point: Vec3) => (point[0] - frame.center[0]) * frame.normal[0] + (point[2] - frame.center[1]) * frame.normal[1] > 0;
/** Nearest wall face the ray hits from inside the room, within its length and height. */
export function wallHit(room: Room, origin: Vec3, direction: Vec3): WallHit | null {
  let best: WallHit | null = null;
  for (const frame of Object.values(wallFrames(room))) {
    if (!facesInside(frame, origin)) continue;
    const hit = wallPlaneHit(frame, origin, direction);
    if (hit && Math.abs(hit.u) <= frame.length / 2 && hit.h >= 0 && hit.h <= frame.height && (!best || hit.distance < best.distance)) best = hit;
  }
  return best;
}
