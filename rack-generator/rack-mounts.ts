/** Assembly adapter for registry rack parts (rack-registry.ts, #131): placement info, hole limits, target validation
 * and resolved instances. Pure; no geometry. Upright targets use the same face frames as Darko/VOLTRA
 * (vendor-mounts.ts); crossmember-top targets reuse the Darko Anchor rail stations (darko-mounts.ts). */
import { pairSuffix } from './physical-identity.ts';
import { darkoTopMount, darkoTopMounts } from './darko-mounts.ts';
import { resolveBy, validateFloorParams } from './floor-part.ts';
import { rackPart, rackHoles, rackTargets, rackFamily, type RackPart } from './rack-registry.ts';
import type { Accessory, Face, Mount, NumericParams, PlacementInfo, RackDimensions, RackDoc, ResolvedInstance, Target, Vec3 } from './types.ts';
type MountDoc = Pick<RackDoc, 'rack' | 'uprights' | 'connections' | 'removed' | 'structure'>;
const FACES: readonly Face[] = ['front', 'back', 'left', 'right'];
const ROTATIONS: Record<Face, number> = { front: Math.PI, back: 0, left: Math.PI / 2, right: -Math.PI / 2 };
const NORMALS: Record<Face, Vec3> = { front: [0, -1, 0], back: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0] };
const entry = (part: string): RackPart => { const found = rackPart(part); if (!found) throw Error(`Unknown rack attachment ${part}.`); return found; };
const Title = (part: RackPart) => part.noun[0].toUpperCase() + part.noun.slice(1);
/** Entry params plus the resolved rack context the builder, bodies and cradle slots see. */
export const rackContextParams = (part: RackPart, params: NumericParams, rack: RackDimensions, mirror = false): NumericParams =>
  ({ ...part.defaults, ...params, upright: rack.tube, mountSpacing: rack.pitch, holeDiameter: rack.holeDiameter, ...(mirror ? { mirror: 1 } : {}) });
export const rackDefaults = (part: string): NumericParams => ({ ...entry(part).defaults });
export const acceptsCrossmemberTop = (part: string) => !!rackPart(part) && rackTargets(entry(part)).includes('crossmember-top');
export function rackPlacement(part: string): PlacementInfo {
  const p = entry(part);
  return { family: rackFamily(p), label: p.name, paired: !!p.pair, defaultPaired: !!p.pair?.default, fields: [], faces: [...(p.mount.faces ?? FACES)],
    handed: !!p.handed, mountType: rackTargets(p).join(' / '), description: p.vendor.reconstruction };
}
/** Strict document validation: unknown keys (including resolved context keys) and off-list values are refused. */
export function validateRackPartParams(part: string, params: NumericParams) { validateFloorParams(entry(part), params); }
/** Target hole range from the entry's vertical extent: the part stays above the floor and below the upright top. */
export function rackLimits(accessory: Accessory, rack: RackDimensions): [number, number] {
  if (accessory.target.kind === 'crossmember-top') return [0, 0];
  const p = entry(accessory.part), { below, above } = resolveBy(p.mount.extent, rackContextParams(p, accessory.params, rack));
  return [Math.max(0, Math.ceil((below - rack.firstHole) / rack.pitch - 1e-9)), Math.floor((rack.height - above - rack.firstHole) / rack.pitch + 1e-9)];
}
function realHole(rack: RackDimensions, hole: number, face: Face) {
  const max = Math.floor((rack.height - rack.holeDiameter / 2 - rack.firstHole) / rack.pitch), z = rack.firstHole + hole * rack.pitch;
  if (!Number.isFinite(hole) || hole < 0 || hole > max) return false;
  return Number.isInteger(hole) || ((face === 'front' || face === 'back') && rack.benchSpacing === rack.pitch / 2 && Number.isInteger(hole * 2) && z >= (rack.benchStart ?? Infinity) && z <= (rack.benchEnd ?? -Infinity));
}
const pairFace = (face: Face): Face => face === 'left' ? 'right' : face === 'right' ? 'left' : face;
/** Target kind, bore, faces, hole pattern and the entry's own fit rules. Throws user-facing messages. */
export function validateRackMount(doc: MountDoc, accessory: Accessory) {
  const p = entry(accessory.part), t = accessory.target, kind = t.kind ?? 'upright', name = Title(p), rack = doc.rack;
  const params = rackContextParams(p, accessory.params, rack);
  if (!rackTargets(p).includes(kind)) throw Error(kind === 'crossmember-top' ? 'This part requires an upright target.' : `${name} requires a crossmember-top target.`);
  const pin = resolveBy(p.mount.pin, params);
  if (pin > rack.holeDiameter) throw Error(`${name} mounting pin ${pin} mm exceeds the rack bore ${rack.holeDiameter} mm.`);
  p.mount.validate?.(rack, params);
  if (t.kind === 'crossmember-top') { darkoTopMount(doc, t); return; }
  const faces = p.mount.faces ?? FACES;
  for (const face of accessory.paired ? [t.face, pairFace(t.face)] : [t.face]) if (!faces.includes(face)) throw Error(`${name} does not mount on the ${face} face.`);
  const holes = rackHoles(p, params);
  if ((p.mount.mainStations ?? holes.length > 1) && !Number.isInteger(t.hole)) throw Error(`${name} needs main upright stations, not bench half holes.`);
  for (const offset of holes) if (!realHole(rack, t.hole + offset, t.face)) throw Error(`${name} needs a real hole ${Math.abs(offset)} station${Math.abs(offset) === 1 ? '' : 's'} ${offset < 0 ? 'below' : 'above'} its mount.`);
}
/** Crossmember-top stations an entry can use (Darko Anchor rail stations), before full document validation. */
export const rackTopMounts = (doc: MountDoc, part: string): Mount[] => acceptsCrossmemberTop(part) ? darkoTopMounts(doc) : [];
/** One instance per target (two for a pair). Upright: origin on the post centreline at the target hole, local +Y out of
 * the face. Crossmember top: origin on the rail bolt axis, local +Y out of the chosen rail side. */
export function resolveRack(doc: RackDoc, accessory: Accessory, targets: Target[]): ResolvedInstance[] {
  const p = entry(accessory.part), r = doc.rack;
  return targets.map((t, i) => {
    const params = rackContextParams(p, accessory.params, r, !!p.handed && i > 0);
    const base = { id: accessory.paired ? `${accessory.id}:${pairSuffix(targets, i)}` : accessory.id, part: accessory.part, params, ownerId: accessory.id, kind: 'accessory' as const,
      paired: accessory.paired, localOutward: [0, 1, 0] as Vec3, collisionBoxes: resolveBy(p.bodies, params).map(b => ({ min: [...b.min] as Vec3, max: [...b.max] as Vec3 })), name: p.name };
    if (t.kind === 'crossmember-top') {
      const m = darkoTopMount(doc, t), edge = doc.connections.find(e => e.id === t.connectionId)!, a = doc.uprights[edge.from], b = doc.uprights[edge.to];
      return { ...base, position: m.center, rotation: [0, 0, Math.atan2(b.y - a.y, b.x - a.x) + (t.side === -1 ? Math.PI : 0)], mount: m, mounts: [m], connectedTo: [edge.id, edge.from, edge.to] };
    }
    const post = doc.uprights[t.uprightId], z = r.firstHole + t.hole * r.pitch, angle = ROTATIONS[t.face], normal = NORMALS[t.face];
    const across: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
    const mounts: Mount[] = rackHoles(p, params).map(offset => ({ ...t, hole: t.hole + offset, center: [post.x, post.y, z + offset * r.pitch],
      position: [post.x + normal[0] * r.tube / 2, post.y + normal[1] * r.tube / 2, z + offset * r.pitch], localAnchor: [0, 0, offset * r.pitch],
      pinAxis: p.mount.pinAxis === 'across' ? across : [...normal] }));
    return { ...base, position: [post.x, post.y, z], rotation: [0, 0, angle], mount: mounts[0], mounts, connectedTo: [t.uprightId] };
  });
}
/** New-placement params on this rack (autoFit), e.g. a 5/8-inch variant on 5/8-inch holes. */
export const rackAutoFit = (part: string, rack: RackDimensions): NumericParams => ({ ...(entry(part).autoFit?.(rack) ?? {}) });
/** Suggested target hole for a new placement: the entry's preferred height, clamped into its limits. */
export function rackDefaultHole(part: string, rack: RackDimensions): number {
  const p = entry(part), height = p.placement?.height ?? 1215;
  const [min, max] = rackLimits({ id: 'probe', part: p.id as Accessory['part'], target: { uprightId: '', face: 'front', hole: 0 }, paired: false, params: rackAutoFit(part, rack) }, rack);
  return Math.min(Math.max(min, Math.round((height - rack.firstHole) / rack.pitch)), Math.max(min, max));
}
