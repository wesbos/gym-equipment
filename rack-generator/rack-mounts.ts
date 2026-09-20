/** Assembly adapter for registry rack parts (rack-registry.ts, #131): placement info, hole limits, target validation
 * and resolved instances. Pure; no geometry. Upright targets use the same face frames as Darko/VOLTRA
 * (vendor-mounts.ts); crossmember-top and crossmember-under targets reuse the Darko Anchor rail stations
 * (darko-mounts.ts). Hosted targets (spotter arms, pull-up bars, #178) live in rack-hosts.ts. */
import { pairSuffix } from './physical-identity.ts';
import { darkoTopMount, darkoTopMounts } from './darko-mounts.ts';
import { resolveBy, validateFloorParams } from './floor-part.ts';
import { rackPart, rackHoles, rackTargets, rackFamily, rackPlacementFor, type RackPart, type RackTargetKind } from './rack-registry.ts';
import { RAIL_KINDS, basisEuler, cross, isHostedTarget, isRailTarget, isUprightTarget, targetKind } from './rack-targets.ts';
import type { Accessory, CrossmemberTopTarget, Face, Mount, NumericParams, PlacementInfo, RackDimensions, RackDoc, ResolvedInstance, Target, UprightNode, Vec3 } from './types.ts';
type MountDoc = Pick<RackDoc, 'rack' | 'uprights' | 'connections' | 'removed' | 'structure'>;
const FACES: readonly Face[] = ['front', 'back', 'left', 'right'];
const ROTATIONS: Record<Face, number> = { front: Math.PI, back: 0, left: Math.PI / 2, right: -Math.PI / 2 };
const NORMALS: Record<Face, Vec3> = { front: [0, -1, 0], back: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0] };
const entry = (part: string): RackPart => { const found = rackPart(part); if (!found) throw Error(`Unknown rack attachment ${part}.`); return found; };
const Title = (part: RackPart) => part.noun[0].toUpperCase() + part.noun.slice(1);
/** Context keys every hosted target receives (the rest of the v2 context is opt-in via RackPartSpec.context). */
const HOST_KEYS = new Set(['hostWidth', 'hostHeight', 'hostTop', 'hostHole', 'hostPitch', 'hostSpan']);
/** Entry params plus the resolved rack context the builder, bodies and cradle slots see. `extra` carries the v2
 * context (#178); only host keys and the keys the entry lists in `context` are passed on. */
export function rackContextParams(part: RackPart, params: NumericParams, rack: RackDimensions, mirror = false, face?: Face, span?: number, extra: NumericParams = {}): NumericParams {
  // Rectangular posts: the tube size through the mounting face sets the mating face (y = upright / 2).
  const depth = rack.tubeDepth ?? rack.tube, frontBack = face === 'front' || face === 'back';
  const upright = frontBack ? depth : rack.tube, width = frontBack ? rack.tube : face ? depth : rack.tube;
  const opt = Object.fromEntries(Object.entries(extra).filter(([k]) => HOST_KEYS.has(k) || (part.context as readonly string[] | undefined)?.includes(k)));
  return { ...part.defaults, ...params, upright, mountSpacing: rack.pitch, holeDiameter: rack.holeDiameter, ...(mirror ? { mirror: 1 } : {}),
    ...(width !== upright ? { uprightWidth: width } : {}), ...(span !== undefined ? { uprightSpan: span } : {}), ...opt };
}
/** Opt-in v2 rack context of an upright target: hole height above the floor, clear inside width and depth, the height
 * of the mounting upright, and which way local +X points relative to the rack (acrossOut, +1 = out of the rack). */
export function uprightContext(doc: Pick<RackDoc, 'rack' | 'uprights' | 'removed'>, t: Pick<Target, 'uprightId' | 'face' | 'hole'>): NumericParams {
  const rack = doc.rack, node: UprightNode | undefined = doc.uprights[t.uprightId];
  const live = Object.entries(doc.uprights).filter(([id]) => !doc.removed.includes(id)).map(([, n]) => n);
  const cx = live.reduce((s, n) => s + n.x, 0) / (live.length || 1), cy = live.reduce((s, n) => s + n.y, 0) / (live.length || 1), angle = ROTATIONS[t.face];
  const out = node ? (node.x - cx) * Math.cos(angle) + (node.y - cy) * Math.sin(angle) : 0;
  // Rack-system parts (#178): which row the post stands in, and how far its column reaches (front to rear posts).
  const column = node ? live.filter(n => Math.abs(n.x - node.x) < 1).map(n => Math.abs(n.y - node.y)) : [];
  return { holeHeight: rack.firstHole + t.hole * rack.pitch, rackWidth: rack.width, rackDepth: rack.depth, rackHeight: Math.min(rack.height, node?.height ?? rack.height), acrossOut: out < -1 ? -1 : 1,
    rowSide: node && node.y > cy + 1 ? 1 : -1, columnReach: Math.max(0, ...column) };
}
/** `uprightSpan` for a spanning entry (RackMount.span): centre-to-centre distance to the nearest live post in line
 * with the mounting face, along local X ('across', signed) or local +Y ('normal'). */
export function rackSpan(doc: Pick<RackDoc, 'uprights' | 'removed'>, part: RackPart, t: Target): number | undefined {
  const mode = part.mount.span, post = doc.uprights[t.uprightId];
  if (!mode || !isUprightTarget(t) || !post) return undefined;
  const angle = ROTATIONS[t.face], across = [Math.cos(angle), Math.sin(angle)], normal = NORMALS[t.face];
  const [dir, side] = mode === 'across' ? [across, normal] : [normal, across];
  let best: number | undefined;
  for (const [id, q] of Object.entries(doc.uprights)) {
    if (id === t.uprightId || doc.removed.includes(id)) continue;
    const dx = q.x - post.x, dy = q.y - post.y, along = dx * dir[0] + dy * dir[1], lateral = dx * side[0] + dy * side[1];
    if (Math.abs(lateral) > 1 || Math.abs(along) < 1 || (mode === 'normal' && along < 0)) continue;
    if (best === undefined || Math.abs(along) < Math.abs(best)) best = along;
  }
  return best;
}
export const rackDefaults = (part: string): NumericParams => ({ ...entry(part).defaults });
export const acceptsTarget = (part: string, kind: RackTargetKind) => !!rackPart(part) && rackTargets(entry(part)).includes(kind);
export const acceptsCrossmemberTop = (part: string) => acceptsTarget(part, 'crossmember-top');
/** Accepts any rail station target (on top of or under an upper crossmember). */
export const acceptsRail = (part: string) => RAIL_KINDS.some(kind => acceptsTarget(part, kind));
export function rackPlacement(part: string): PlacementInfo {
  const p = entry(part);
  return { family: rackFamily(p), label: p.name, paired: !!p.pair, defaultPaired: !!p.pair?.default, fields: [], faces: [...(p.mount.faces ?? FACES)],
    handed: !!p.handed, mountType: rackTargets(p).join(' / '), description: p.vendor.reconstruction };
}
/** Strict document validation: unknown keys (including resolved context keys) and off-list values are refused. */
export function validateRackPartParams(part: string, params: NumericParams) { validateFloorParams(entry(part), params); }
/** Floor band (RackMount.floor) as whole hole numbers on this rack, or undefined for parts that do not reach the floor. */
function floorHoles(p: RackPart, params: NumericParams, rack: RackDimensions): [number, number] | undefined {
  if (!p.mount.floor) return undefined;
  const { min, max } = resolveBy(p.mount.floor, { ...p.defaults, ...params });
  return [Math.max(0, Math.ceil((min - rack.firstHole) / rack.pitch - 1e-9)), Math.floor((max - rack.firstHole) / rack.pitch + 1e-9)];
}
/** Target hole range from the entry's vertical extent: the part stays above the floor and below the upright top.
 * Floor parts (RackMount.floor) use the holes whose height puts their foot on the floor. */
export function rackLimits(accessory: Accessory, rack: RackDimensions): [number, number] {
  if (!isUprightTarget(accessory.target)) return [0, 0];
  const p = entry(accessory.part), params = rackContextParams(p, accessory.params, rack, false, accessory.target.face);
  const top = (above: number) => Math.floor((rack.height - above - rack.firstHole) / rack.pitch + 1e-9);
  const floor = floorHoles(p, accessory.params, rack);
  if (floor) return [floor[0], p.mount.overTop ? floor[1] : Math.min(floor[1], top(resolveBy(p.mount.extent, params).above))];
  const { below, above } = resolveBy(p.mount.extent, params);
  return [Math.max(0, Math.ceil((below - rack.firstHole) / rack.pitch - 1e-9)), top(above)];
}
function realHole(rack: RackDimensions, hole: number, face: Face) {
  const max = Math.floor((rack.height - rack.holeDiameter / 2 - rack.firstHole) / rack.pitch), z = rack.firstHole + hole * rack.pitch;
  if (!Number.isFinite(hole) || hole < 0 || hole > max) return false;
  return Number.isInteger(hole) || ((face === 'front' || face === 'back') && rack.benchSpacing === rack.pitch / 2 && Number.isInteger(hole * 2) && z >= (rack.benchStart ?? Infinity) && z <= (rack.benchEnd ?? -Infinity));
}
const pairFace = (face: Face): Face => face === 'left' ? 'right' : face === 'right' ? 'left' : face;
const KIND_NAMES: Record<RackTargetKind, string> = { upright: 'an upright hole', 'crossmember-top': 'a crossmember-top target', 'crossmember-under': 'a crossmember-under target (under an upper rail)', 'spotter-arm': 'a spotter arm or box safety mount', 'pull-up-bar': 'a pull-up bar mount' };
/** Target kind, bore, faces, hole pattern and the entry's own fit rules. Throws user-facing messages. Hosted targets
 * are checked against their host by rack-hosts.ts (validateHostedMount), which needs the other accessories. */
export function validateRackMount(doc: MountDoc, accessory: Accessory) {
  const p = entry(accessory.part), t = accessory.target, kind = targetKind(t), name = Title(p), rack = doc.rack;
  const accepted = rackTargets(p);
  if (!accepted.includes(kind)) {
    if (isRailTarget(t) && accepted.includes('upright')) throw Error('This part requires an upright target.');
    if (kind === 'upright' && accepted.length === 1 && accepted[0] === 'crossmember-top') throw Error(`${name} requires a crossmember-top target.`);
    throw Error(`${name} mounts on ${accepted.map(k => KIND_NAMES[k]).join(' or ')}, not ${KIND_NAMES[kind]}.`);
  }
  if (isHostedTarget(t)) return;
  const params = rackContextParams(p, accessory.params, rack, false, kind === 'upright' ? t.face : undefined, rackSpan(doc, p, t), isUprightTarget(t) ? uprightContext(doc, t) : {});
  const pin = resolveBy(p.mount.pin, params);
  if (pin > rack.holeDiameter) throw Error(`${name} mounting pin ${pin} mm exceeds the rack bore ${rack.holeDiameter} mm.`);
  p.mount.validate?.(rack, params);
  if (isRailTarget(t)) { darkoTopMount(doc, t); return; }
  const faces = p.mount.faces ?? FACES;
  for (const face of accessory.paired ? [t.face, pairFace(t.face)] : [t.face]) if (!faces.includes(face)) throw Error(`${name} does not mount on the ${face} face.`);
  const holes = rackHoles(p, params);
  if ((p.mount.mainStations ?? holes.length > 1) && !Number.isInteger(t.hole)) throw Error(`${name} needs main upright stations, not bench half holes.`);
  for (const offset of holes) if (!realHole(rack, t.hole + offset, t.face)) throw Error(`${name} needs a real hole ${Math.abs(offset)} station${Math.abs(offset) === 1 ? '' : 's'} ${offset < 0 ? 'below' : 'above'} its mount.`);
  const floor = p.mount.floor && resolveBy(p.mount.floor, params);
  if (floor) {
    const z = rack.firstHole + t.hole * rack.pitch;
    if (z < floor.min - 1e-6 || z > floor.max + 1e-6) throw Error(`${name} stands on the floor from a hole ${Math.round(floor.min)}–${Math.round(floor.max)} mm up; hole ${t.hole + 1} is ${Math.round(z)} mm above the floor.`);
  }
}
/** Rail station on top of or under an upper crossmember: the Darko Anchor station (validated there), with the marker
 * on the rail's side face (top) or its underside (under). */
export function railMount(doc: MountDoc, t: CrossmemberTopTarget): Mount {
  const m = darkoTopMount(doc, t) as CrossmemberTopTarget & Mount;
  if (t.kind !== 'crossmember-under') return m;
  return { ...m, kind: 'crossmember-under', position: [m.center[0], m.center[1], m.center[2] - doc.rack.tube / 2], label: `${m.connectorId} · underside / side hole ${t.station + 1}` };
}
/** Crossmember stations an entry can use (top and/or underside, per its targets), before full document validation. */
export const rackRailMounts = (doc: MountDoc, part: string): Mount[] => !rackPart(part) ? [] : RAIL_KINDS.filter(kind => acceptsTarget(part, kind))
  .flatMap(kind => darkoTopMounts(doc).map(m => kind === 'crossmember-top' ? m : railMount(doc, { ...(m as CrossmemberTopTarget), kind })));
/** Crossmember-top stations an entry can use (Darko Anchor rail stations), before full document validation. */
export const rackTopMounts = (doc: MountDoc, part: string): Mount[] => acceptsCrossmemberTop(part) ? darkoTopMounts(doc) : [];
/** One instance per target (two for a pair). Upright: origin on the post centreline at the target hole, local +Y out of
 * the face. Crossmember top: origin on the rail bolt axis, local +Y out of the chosen rail side. Crossmember under:
 * origin on the rail bolt axis, local +Y down out of the underside, local X along the bolt (the chosen side), local Z
 * along the rail. Hosted targets are resolved by rack-hosts.ts once their host is resolved. */
export function resolveRack(doc: RackDoc, accessory: Accessory, targets: Target[]): ResolvedInstance[] {
  const p = entry(accessory.part), r = doc.rack;
  return targets.map((t, i) => {
    const params = rackContextParams(p, accessory.params, r, !!p.handed && i > 0, isUprightTarget(t) ? t.face : undefined, rackSpan(doc, p, t),
      isUprightTarget(t) ? uprightContext(doc, t) : {});
    const base = { id: accessory.paired ? `${accessory.id}:${pairSuffix(targets, i)}` : accessory.id, part: accessory.part, params, ownerId: accessory.id, kind: 'accessory' as const,
      paired: accessory.paired, localOutward: [0, 1, 0] as Vec3, collisionBoxes: resolveBy(p.bodies, params).map(b => ({ min: [...b.min] as Vec3, max: [...b.max] as Vec3 })), name: p.name };
    if (isRailTarget(t)) {
      const m = railMount(doc, t), edge = doc.connections.find(e => e.id === t.connectionId)!, a = doc.uprights[edge.from], b = doc.uprights[edge.to];
      if (t.kind === 'crossmember-under') {
        const X = m.pinAxis!, Y: Vec3 = [0, 0, -1], Z = cross(X, Y);
        return { ...base, position: m.center, rotation: basisEuler(X, Y, Z), localOutward: [0, 1, 0], mount: m, mounts: [m], connectedTo: [edge.id, edge.from, edge.to] };
      }
      return { ...base, position: m.center, rotation: [0, 0, Math.atan2(b.y - a.y, b.x - a.x) + (t.side === -1 ? Math.PI : 0)], mount: m, mounts: [m], connectedTo: [edge.id, edge.from, edge.to] };
    }
    const post = doc.uprights[t.uprightId], z = r.firstHole + t.hole * r.pitch, angle = ROTATIONS[t.face], normal = NORMALS[t.face];
    const across: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
    const mounts: Mount[] = rackHoles(p, params).map(offset => ({ ...t, hole: t.hole + offset, center: [post.x, post.y, z + offset * r.pitch],
      position: [post.x + normal[0] * r.tube / 2, post.y + normal[1] * (r.tubeDepth ?? r.tube) / 2, z + offset * r.pitch], localAnchor: [0, 0, offset * r.pitch],
      pinAxis: p.mount.pinAxis === 'across' ? across : [...normal] }));
    return { ...base, position: [post.x, post.y, z], rotation: [0, 0, angle], mount: mounts[0], mounts, connectedTo: [t.uprightId] };
  });
}
/** New-placement params on this rack (autoFit), e.g. a 5/8-inch variant on 5/8-inch holes. */
export const rackAutoFit = (part: string, rack: RackDimensions): NumericParams => ({ ...(entry(part).autoFit?.(rack) ?? {}) });
/** Preferred face for a new placement on this rack (see RackPlacement). */
export const rackPlacementFace = (part: string, rack: RackDimensions) => rackPlacementFor(entry(part), rackAutoFit(part, rack)).face;
/** Suggested target hole for a new placement: the entry's preferred height, clamped into its limits. */
export function rackDefaultHole(part: string, rack: RackDimensions): number {
  const p = entry(part), height = rackPlacementFor(p, rackAutoFit(part, rack)).height ?? 1215;
  const [min, max] = rackLimits({ id: 'probe', part: p.id as Accessory['part'], target: { uprightId: '', face: 'front', hole: 0 }, paired: false, params: rackAutoFit(part, rack) }, rack);
  return Math.min(Math.max(min, Math.round((height - rack.firstHole) / rack.pitch)), Math.max(min, max));
}
