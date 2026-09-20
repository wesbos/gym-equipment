/** Layout helpers for the gym-gallery generator scripts (`scripts/gyms/<slug>.ts`, #184). Each script builds its RackDoc
 * through the real builder APIs (presets, addAccessory/suggestPlacement, addFloorItem, addWallItem, placeHang) so the
 * document is valid by construction, then writes `src/gyms/data/<slug>.json` through lib.ts `writeGym`.
 *
 * Floor coordinates are the builder's world floor millimetres: X right, Z toward the default camera (the front
 * wall), rack at the origin. Rotations are degrees about the vertical: 0 faces the camera, 90 faces +X (right),
 * -90 faces -X (left), 180 faces the back wall. */
import { writeGym as writeGallery } from './lib.ts';
import { addAccessory, resolveAssembly, setPlateStack, validateAssembly } from '../../rack-generator/assembly.ts';
import { freeCradles, suggestCradle } from '../../rack-generator/barbell-cradles.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { placementMounts, proposalAt, suggestPlacement } from '../../rack-generator/placement-proposals.ts';
import { addFloorItem, floorBounds, floorWarnings, rackBounds } from '../../rack-generator/floor-items.ts';
import { addWallItem, roomOf, wallWarnings } from '../../rack-generator/wall-items.ts';
import { wallFrames } from '../../rack-generator/walls.ts';
import { placeHang, hangWarnings, freeSlots } from '../../rack-generator/hang-items.ts';
import { detectCollisions } from '../../rack-generator/assembly-collisions.ts';
import { systemWarnings } from '../../rack-generator/systems.ts';
import { plateId } from '../../rack-generator/plates.ts';
import type { Room, WallId } from '../../rack-generator/walls.ts';
import type { BarLoad, NumericParams, PartId, RackDoc, Target, Vec2 } from '../../rack-generator/types.ts';
import type { PlateId } from '../../rack-generator/plates.ts';
import type { GymEntry } from '../../src/gyms/types.ts';

/** The gallery entry minus its doc (src/gyms/types.ts GymEntry). `equipment` names the owner's gear and, where the
 * catalog has no exact product, the closest part standing in for it. */
export type GymMeta = Omit<GymEntry, 'doc'>;

const deg = (d: number) => d * Math.PI / 180;

/** A rack preset (see RACK_PRESETS) with an optional frame colour. */
export function rack(presetId: string, frameColor?: string): RackDoc {
  const doc = applyPreset(presetId);
  if (frameColor) doc.appearance = { ...doc.appearance, frameColor };
  return validateAssembly(doc);
}

/** Room walls, as distances from the rack origin (mm). */
export function room(doc: RackDoc, walls: Partial<Room>): RackDoc {
  return validateAssembly({ ...doc, room: { back: 1500, left: 3000, right: 3000, front: 3000, height: 2700, ...walls } });
}

/** Rack attachment at an explicit target, or wherever the builder's placement ranking puts it when `target` is omitted. */
export function attach(doc: RackDoc, part: string, target?: Partial<Target>, paired = true, params: NumericParams = {}): RackDoc {
  let next: RackDoc;
  if (target) {
    // Go through the builder's own placement (it fits pins/sleeves to the rack's bores) when the mount is offered.
    const t = target as Partial<{ uprightId: string; face: string; hole: number }>;
    const mount = placementMounts(doc, part as PartId).find(m => (!t.uprightId || m.uprightId === t.uprightId) && (!t.face || m.face === t.face) && (t.hole === undefined || m.hole === t.hole));
    if (!mount) return addAccessory(doc, part, target, paired, params);
    next = validateAssembly(proposalAt(doc, part as PartId, mount, paired).doc);
  } else {
    const { proposal, reason } = suggestPlacement(doc, part as PartId, paired);
    if (!proposal) throw Error(`${part}: ${reason}`);
    next = validateAssembly(proposal.doc);
  }
  if (Object.keys(params).length) { const a = next.accessories.at(-1)!; a.params = { ...a.params, ...params }; }
  return validateAssembly(next);
}

/** Last accessory id (for plate stacks / hosted parts). */
export const lastAccessory = (doc: RackDoc) => doc.accessories.at(-1)!.id;

/** Floor item at [x, z] (mm) facing `rotation` degrees, with param overrides and an optional bar load. */
export function floor(doc: RackDoc, part: string, position: Vec2, rotation = 0, params: NumericParams = {}, plates?: BarLoad): RackDoc {
  const next = addFloorItem(doc, part, position);
  const item = next.floorItems!.at(-1)!;
  item.rotation = deg(rotation); item.params = { ...item.params, ...params };
  if (plates) item.plates = plates;
  return validateAssembly(next);
}

/** Parks a bar in a free cradle: the highest working one (J-cups, monolift) by default, or the first whose label
 * matches `where` (e.g. /storage/ or a part name). Unmatched throws, so a layout never silently drops a bar. */
export function rackBar(doc: RackDoc, part: string, where?: RegExp, plates?: BarLoad): RackDoc {
  const next = floor(doc, part, [0, 0], 0, {}, plates), item = next.floorItems!.at(-1)!;
  const cradles = freeCradles(resolveAssembly(next), next.floorItems, item.id);
  const cradle = where ? cradles.find(c => where.test(c.label) || where.test(c.kind)) : suggestCradle(cradles);
  if (!cradle) throw Error(`${part}: no free cradle${where ? ` matching ${where}` : ''} (${cradles.map(c => c.label).join('; ')})`);
  item.cradle = cradle.key;
  return validateAssembly(next);
}

/** Loads a storage pin / plate-holding accessory (root outward). */
export const loadPin = (doc: RackDoc, id: string, plates: PlateId[]) => setPlateStack(doc, id, plates);

/** Wall item on `wall` at [world coordinate along the wall, centre height] (mm): world X on the back and front walls,
 * world Z on the left and right walls (converted to the wall's own u, which runs from its centre). */
export function wall(doc: RackDoc, part: string, on: WallId, [at, height]: Vec2, params: NumericParams = {}): RackDoc {
  const frame = wallFrames(roomOf(doc))[on], point: Vec2 = on === 'back' || on === 'front' ? [at, frame.center[1]] : [frame.center[0], at];
  const u = (point[0] - frame.center[0]) * frame.along[0] + (point[1] - frame.center[1]) * frame.along[1];
  const next = addWallItem(doc, part, { wall: on, position: [u, height] });
  const item = next.wallItems!.at(-1)!;
  if (Object.keys(params).length) item.params = { ...item.params, ...params };
  return validateAssembly(next);
}
export const lastWall = (doc: RackDoc) => doc.wallItems!.at(-1)!.id;

/** Hangs each part on the next free hook of `panel`. */
export function hang(doc: RackDoc, panel: string, parts: string[]): RackDoc {
  let next = doc;
  for (const part of parts) {
    const slot = freeSlots(next, part).find(s => s.panel === panel);
    if (!slot) throw Error(`No free hook on ${panel} for ${part}.`);
    next = placeHang(next, part, slot);
  }
  return validateAssembly(next);
}

/** Plate id shorthand: `p('rogue-hg2-lb', '45')`. */
export const p = (line: string, key: string, finish?: string): PlateId => plateId(line, key, finish);
export const times = <T>(n: number, v: T): T[] => Array(n).fill(v);

/** Every builder warning for the doc: collisions, floor/wall/hang overlaps, system issues. */
export function warnings(doc: RackDoc): string[] {
  const resolved = resolveAssembly(doc);
  const name = (id: string) => {
    const f = doc.floorItems?.find(i => i.id === id); if (!f) return id;
    const b = floorBounds(f); return `${id}(${f.part} x ${Math.round(b.min[0])}..${Math.round(b.max[0])} z ${Math.round(b.min[1])}..${Math.round(b.max[1])})`;
  };
  const r = roomOf(doc), outside = (doc.floorItems ?? []).filter(i => !i.cradle).filter(i => {
    const b = floorBounds(i); return b.min[0] < -r.left - 10 || b.max[0] > r.right + 10 || b.min[1] < -r.back - 10 || b.max[1] > r.front + 10;
  });
  return [
    ...outside.map(i => `room ${name(i.id)}: extends past a wall`),
    ...detectCollisions(resolved).map(w => `collision ${w.ids.join(' / ')}: ${w.message}`),
    ...floorWarnings(doc).map(w => `floor ${w.ids.map(name).join(' / ')}: ${w.message}`),
    ...wallWarnings(doc).map(w => `wall ${w.ids.join(' / ')}: ${w.message}`),
    ...hangWarnings(doc).map(w => `hang ${w.ids.join(' / ')}: ${w.message}`),
    ...systemWarnings(doc).map(w => `system: ${w}`),
  ];
}

export { rackBounds };

/** Writes the gym through the gallery's writer (scripts/gyms/lib.ts: cleanDocument, catalog check, JSON), then prints
 * this file's stricter checks (named overlaps, items past a wall, system warnings) and exits non-zero on any. */
export function writeGym(entry: GymMeta & { doc: RackDoc }) {
  const out = writeGallery({ ...entry, doc: validateAssembly(entry.doc) });
  const found = warnings(out.doc);
  for (const w of found) console.warn(`  ${entry.slug}: ${w}`);
  if (found.length) process.exitCode = 1;
  return out;
}
