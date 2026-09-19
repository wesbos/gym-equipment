import { gridProfile } from './profiles.ts';
import { validateAssembly } from './assembly.ts';
import { nearest } from './grid.ts';
import type { RackDoc, PartId } from './types.ts';
export type Direction = 'left' | 'right' | 'rear' | 'front';
const directions = { left: [-1, 0], right: [1, 0], rear: [0, 1], front: [0, -1] } as const;
function nextId(doc: RackDoc, prefix: string): string {
  let id: string;
  do { id = `${prefix}-${doc.nextId++}`; } while (Object.hasOwn(doc.uprights, id) || doc.connections.some(e => e.id === id) || doc.accessories.some(a => a.id === id));
  return id;
}
export function extendUpright(input: RackDoc, from: string, direction: Direction, clear = 725, connect = true): RackDoc {
  const doc = validateAssembly(input), anchor = doc.uprights[from];
  if (!anchor || doc.removed.includes(from)) throw new Error('Choose an existing upright.');
  const id = nextId(doc, 'upright'), [dx, dy] = directions[direction];
  const span = nearest(clear, gridProfile(doc.profileId).depths) + (dy ? doc.rack.tubeDepth ?? doc.rack.tube : doc.rack.tube);
  doc.uprights[id] = { x: anchor.x + dx * span, y: anchor.y + dy * span };
  if (connect) for (const level of ['upper', 'lower'] as const) doc.connections.push({ id: nextId(doc, 'connection'), from, to: id, level });
  return validateAssembly(doc);
}
export function moveUpright(input: RackDoc, id: string, x: number, y: number): RackDoc {
  const doc = validateAssembly(input), node = doc.uprights[id];
  if (!node) throw new Error('Unknown upright.');
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Coordinates must be finite.');
  // Snap relative to this post's current lattice phase. Imported offsets never move implicitly.
  for (const [key, value] of [['x', x], ['y', y]] as const) {
    const steps = (value-node[key])/doc.rack.pitch;
    node[key] += nearest(steps, [Math.floor(steps), Math.ceil(steps)])*doc.rack.pitch;
  }
  return validateAssembly(doc);
}
export function connectUprights(input: RackDoc, from: string, to: string, level: 'upper' | 'lower'): RackDoc {
  const doc = validateAssembly(input);
  if (doc.connections.some(e => !doc.removed.includes(e.id) && e.level === level && [e.from,e.to].includes(from) && [e.from,e.to].includes(to))) throw new Error('This connection already exists.');
  doc.connections.push({ id: nextId(doc, 'connection'), from, to, level });
  return validateAssembly(doc);
}
export function spanAccessory(input: RackDoc, from: string, to: string, part: PartId, hole: number): RackDoc {
  const doc = validateAssembly(input);
  doc.accessories.push({ id: nextId(doc, 'accessory'), part, target: { uprightId: from, face: 'right', hole }, paired: false, spanTo: to, params: {} });
  return validateAssembly(doc);
}
export function moveConnection(input: RackDoc, id: string, from: string, to: string, level: 'upper' | 'lower'): RackDoc {
  const doc = validateAssembly(input), edge = doc.connections.find(e => e.id === id);
  if (!edge) throw new Error('Unknown connection.');
  Object.assign(edge, { from, to, level });
  return validateAssembly(doc);
}
