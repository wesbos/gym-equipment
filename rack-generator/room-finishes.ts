/** Room finishes (#200): what the room's walls, floor and ceiling look like. Scenery only: finishes never reach the
 * CAD/export root. Every field is optional on `doc.room`, and a missing field is today's look (black slat walls
 * that show only with wall parts, black rubber floor, no turf, no ceiling), so older documents render unchanged. */
import type { Vec2 } from './types.ts';
import type { WallId } from './walls.ts';

/** walls.ts owns WALL_IDS; repeated here (a type-checked copy) so the two modules don't import each other's values. */
const WALLS = ['back', 'left', 'right', 'front'] as const satisfies readonly WallId[];

export const WALL_FINISHES = ['slat', 'drywall', 'birch', 'wainscot'] as const;
export type WallFinish = (typeof WALL_FINISHES)[number];
export const FLOOR_FINISHES = ['black-rubber', 'grey-fleck', 'blue-fleck', 'light-fleck', 'wood', 'concrete'] as const;
export type FloorFinish = (typeof FLOOR_FINISHES)[number];
export const WALL_FINISH_LABELS: Record<WallFinish, string> = {
  slat: 'Black acoustic slats', drywall: 'Painted drywall', birch: 'Birch plywood', wainscot: 'Birch wainscot, painted above',
};
export const FLOOR_FINISH_LABELS: Record<FloorFinish, string> = {
  'black-rubber': 'Black rubber', 'grey-fleck': 'Grey-fleck rubber', 'blue-fleck': 'Blue-fleck rubber', 'light-fleck': 'Light-fleck rubber',
  wood: 'Wood platform', concrete: 'Concrete',
};
/** One wall's surface. `color` applies to drywall and to the drywall above a wainscot; `wainscot` is the plywood height. */
export interface WallSurface { finish: WallFinish; color?: string; wainscot?: number }
/** Every wall's surface, with optional per-wall `overrides` (Coop's end wall differs from his side walls, say). */
export interface RoomWalls extends WallSurface { overrides?: Partial<Record<WallId, WallSurface>> }
/** A turf lane: an axis-aligned rectangle on the floor, centred at `position` (floor [x, z] mm), `size` [x, z] mm.
 * `lines` paints hash marks every metre; `text` stencils a word across the lane near both ends (a brand or "PUSH"). */
export interface TurfLane { position: Vec2; size: Vec2; lines?: boolean; text?: string }
/** Linear LED fixtures, `count` evenly spaced rows running along the room's x or z axis. */
export interface CeilingLights { count: number; along: 'x' | 'z' }
/** A ceiling at the room height. Present means on. */
export interface RoomCeiling { color?: string; lights?: CeilingLights }
export interface RoomFinishes { walls?: RoomWalls; floor?: FloorFinish; turf?: TurfLane[]; ceiling?: RoomCeiling }
export const FINISH_KEYS = ['walls', 'floor', 'turf', 'ceiling'] as const;

export const DEFAULT_WALL_COLOR = '#f2f1ec';
export const DEFAULT_CEILING_COLOR = '#f4f4f1';
export const WAINSCOT_DEFAULT = 1220;
export const WAINSCOT_LIMITS = [300, 2400] as const;
export const TURF_LIMITS = { size: [300, 30000], position: 30000, lanes: 8 } as const;
export const LIGHT_LIMITS = [1, 12] as const;
/** Turf stencil text: short, capitals, digits and a little punctuation. */
export const TURF_TEXT = /^[A-Z0-9][A-Z0-9 &.!-]{0,15}$/;
/** Paint presets for the room inspector. */
export const WALL_PAINTS: readonly [string, string][] = [
  ['White', '#f2f1ec'], ['Warm white', '#ece4d4'], ['Light grey', '#c9cbc8'], ['Charcoal', '#3b3f40'], ['Navy', '#27354a'], ['Sage', '#a6b39c'],
];

const hex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const only = (v: Record<string, unknown>, keys: readonly string[], what: string) => {
  const extra = Object.keys(v).find(k => !keys.includes(k));
  if (extra) throw Error(`Unknown ${what} field "${extra}".`);
};
const inRange = (v: unknown, [min, max]: readonly [number, number]) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

function validateSurface(input: unknown, height: number, keys: readonly string[] = ['finish', 'color', 'wainscot']): WallSurface {
  if (!plain(input)) throw Error('Room walls finish must be an object.');
  only(input, keys, 'wall finish');
  const finish = input.finish as WallFinish;
  if (!WALL_FINISHES.includes(finish)) throw Error(`Wall finish must be one of ${WALL_FINISHES.join(', ')}.`);
  const walls: WallSurface = { finish };
  if (input.color !== undefined) {
    if (finish !== 'drywall' && finish !== 'wainscot') throw Error('Wall colour applies to drywall and wainscot walls.');
    if (!hex(input.color)) throw Error('Wall colour must be a six-digit hex colour.');
    walls.color = input.color.toLowerCase();
  }
  if (input.wainscot !== undefined) {
    if (finish !== 'wainscot') throw Error('Wainscot height applies to wainscot walls.');
    if (!inRange(input.wainscot, WAINSCOT_LIMITS) || (input.wainscot as number) >= height) throw Error(`Wainscot height must be ${WAINSCOT_LIMITS[0]}–${Math.min(WAINSCOT_LIMITS[1], height - 1)} mm.`);
    walls.wainscot = input.wainscot as number;
  }
  return walls;
}
function validateWalls(input: unknown, height: number): RoomWalls {
  const walls: RoomWalls = validateSurface(input, height, ['finish', 'color', 'wainscot', 'overrides']), overrides = (input as Record<string, unknown>).overrides;
  if (overrides === undefined) return walls;
  if (!plain(overrides)) throw Error('Wall overrides must be an object keyed by wall.');
  only(overrides, WALLS, 'wall override');
  walls.overrides = Object.fromEntries(WALLS.filter(id => overrides[id] !== undefined).map(id => [id, validateSurface(overrides[id], height)]));
  return walls;
}
function validateTurf(input: unknown): TurfLane[] {
  if (!Array.isArray(input) || input.length > TURF_LIMITS.lanes) throw Error(`Turf must be a list of up to ${TURF_LIMITS.lanes} lanes.`);
  return input.map(lane => {
    if (!plain(lane)) throw Error('Each turf lane must be an object.');
    only(lane, ['position', 'size', 'lines', 'text'], 'turf lane');
    const pair = (v: unknown, ok: (n: unknown) => boolean) => Array.isArray(v) && v.length === 2 && v.every(ok);
    if (!pair(lane.position, n => inRange(n, [-TURF_LIMITS.position, TURF_LIMITS.position]))) throw Error(`Turf position must be [x, z] within ±${TURF_LIMITS.position} mm.`);
    if (!pair(lane.size, n => inRange(n, TURF_LIMITS.size))) throw Error(`Turf size must be [x, z], each ${TURF_LIMITS.size[0]}–${TURF_LIMITS.size[1]} mm.`);
    if (lane.lines !== undefined && typeof lane.lines !== 'boolean') throw Error('Turf lines must be true or false.');
    if (lane.text !== undefined && (typeof lane.text !== 'string' || !TURF_TEXT.test(lane.text))) throw Error('Turf text must be 1–16 capital letters, digits, spaces or & . ! -.');
    return { position: [...lane.position as Vec2] as Vec2, size: [...lane.size as Vec2] as Vec2, ...(lane.lines !== undefined ? { lines: lane.lines } : {}), ...(lane.text !== undefined ? { text: lane.text } : {}) };
  });
}
function validateCeiling(input: unknown): RoomCeiling {
  if (!plain(input)) throw Error('Ceiling must be an object.');
  only(input, ['color', 'lights'], 'ceiling');
  const ceiling: RoomCeiling = {};
  if (input.color !== undefined) {
    if (!hex(input.color)) throw Error('Ceiling colour must be a six-digit hex colour.');
    ceiling.color = input.color.toLowerCase();
  }
  if (input.lights !== undefined) {
    const lights = input.lights;
    if (!plain(lights)) throw Error('Ceiling lights must be an object.');
    only(lights, ['count', 'along'], 'ceiling lights');
    if (!Number.isInteger(lights.count) || !inRange(lights.count, LIGHT_LIMITS)) throw Error(`Ceiling light rows must be ${LIGHT_LIMITS[0]}–${LIGHT_LIMITS[1]}.`);
    if (lights.along !== 'x' && lights.along !== 'z') throw Error('Ceiling lights run along x or z.');
    ceiling.lights = { count: lights.count as number, along: lights.along };
  }
  return ceiling;
}
/** Validates the finish fields of a room (dims already validated); returns only the fields present, in a fixed order. */
export function validateFinishes(input: Record<string, unknown>, height: number): RoomFinishes {
  const out: RoomFinishes = {};
  if (input.walls !== undefined) out.walls = validateWalls(input.walls, height);
  if (input.floor !== undefined) {
    if (!FLOOR_FINISHES.includes(input.floor as FloorFinish)) throw Error(`Floor finish must be one of ${FLOOR_FINISHES.join(', ')}.`);
    out.floor = input.floor as FloorFinish;
  }
  if (input.turf !== undefined) out.turf = validateTurf(input.turf);
  if (input.ceiling !== undefined) out.ceiling = validateCeiling(input.ceiling);
  return out;
}

/** A wall's surface with its defaults filled in. */
export interface ResolvedSurface { finish: WallFinish; color: string; wainscot: number }
/** Resolved finishes with every default filled in, for the scene. */
export interface ResolvedFinishes {
  /** Each wall's own surface (the room's walls, or that wall's override). */
  surfaces: Record<WallId, ResolvedSurface>;
  floor: FloorFinish; turf: TurfLane[];
  ceiling: { color: string; lights: CeilingLights | null } | null;
  /** Walls draw even without wall parts once a finish is chosen. */
  showWalls: boolean;
}
export function resolveFinishes(room: RoomFinishes | undefined, height = 3000): ResolvedFinishes {
  const walls = room?.walls;
  const surface = (s: WallSurface | undefined): ResolvedSurface => ({ finish: s?.finish ?? 'slat', color: s?.color ?? DEFAULT_WALL_COLOR, wainscot: Math.min(s?.wainscot ?? WAINSCOT_DEFAULT, height - 100) });
  return {
    surfaces: Object.fromEntries(WALLS.map(id => [id, surface(walls?.overrides?.[id] ?? walls)])) as Record<WallId, ResolvedSurface>,
    floor: room?.floor ?? 'black-rubber',
    turf: room?.turf ?? [],
    ceiling: room?.ceiling ? { color: room.ceiling.color ?? DEFAULT_CEILING_COLOR, lights: room.ceiling.lights ?? null } : null,
    showWalls: !!walls,
  };
}
const luminance = (color: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Light intensities per finish. Brighter rooms bounce more light, so the fill rises and the key and exposure
 * come down a little to keep white paint from clipping. Only uniforms change, never the light count. */
export interface RoomLighting { exposure: number; environment: number; hemisphere: number; key: number; fill: number }
export const STUDIO_LIGHTING: RoomLighting = { exposure: 0.9, environment: 0.6, hemisphere: 0.3, key: 1.5, fill: 0.25 };
export function roomLighting(room: RoomFinishes | undefined): RoomLighting {
  const f = resolveFinishes(room);
  const reflect = ({ finish, color }: ResolvedSurface) => finish === 'slat' ? 0 : finish === 'birch' ? 0.45 : finish === 'wainscot' ? 0.25 + 0.75 * luminance(color) : luminance(color);
  const wall = f.showWalls ? WALLS.reduce((sum, id) => sum + reflect(f.surfaces[id]), 0) / WALLS.length : 0;
  const lit = f.ceiling ? (f.ceiling.lights ? 1 : 0.4) : 0;
  const bright = Math.min(1, 0.7 * wall + 0.3 * lit);
  if (!bright) return STUDIO_LIGHTING;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return {
    exposure: round(0.9 - 0.08 * bright),
    environment: round(0.6 + 0.25 * bright),
    hemisphere: round(0.3 + 0.45 * bright),
    key: round(1.5 - 0.35 * bright),
    fill: round(0.25 + 0.2 * bright),
  };
}
