import { accessoryRotation, validateMountedRotation, mountedRotationMode, orientedMountTarget, shaftRotation, rotateMountedPoint } from './mounted-rotation.ts';
import { detectCollisions } from './assembly-collisions.ts';
import { systemLowerCrossmemberStation } from "./cable-stations.ts";
import { validateSystems, resolveSystems } from './systems.ts';
import { validateFloorItems, resolveFloorItems } from './floor-items.ts';
import { parkBarbells } from './barbell-cradles.ts';
import { validateWallItems, resolveWallItems } from './wall-items.ts';
import { validateHangItems, resolveHangItems } from './hang-items.ts';
import { validateRoom } from './walls.ts';
import { validateLogo, logoSite } from './logos/types.ts';
import { pairSuffix } from './physical-identity.ts';
import { darkoTopMounts, darkoTopMount, matchingDarkoTarget } from './darko-mounts.ts';
import { isVendorPart, vendorDefaults, vendorPlacement, vendorLimits, validateVendorParams, validateVendorMount, resolveVendor } from './vendor-mounts.ts';
import { VOLTRA_IDS, DARKO_IDS, isDarkoTop } from './vendor-metadata.ts';
import { validateMountShaft } from './mount-shafts.ts';
import { RACK_PART_IDS, isRackPart, rackPart, rackTargets } from './rack-registry.ts';
import { acceptsRail, acceptsTarget, rackPlacementFace, rackDefaults, rackDefaultHole, rackLimits, rackPlacement, rackRailMounts, railMount, resolveRack, validateRackMount, validateRackPartParams } from './rack-mounts.ts';
import { hostedCandidates, hostedOn, hostedPairTarget, resolveHosted, validateHostedMount } from './rack-hosts.ts';
import { TARGET_KINDS, isHostedTarget, isRailTarget, isUprightTarget } from './rack-targets.ts';
import { gridProfile, type GridProfile } from './profiles.ts';
import { legacyGraph, validateGraph, structureSlots } from './topology.ts';
import { snapDimensions } from './grid.ts';
import { validateAppearance } from './appearance.ts';
import type { UprightNode, RackDoc, RackDimensions, Accessory, Target, Mount, ResolvedInstance, Vec3, NumericParams, PartId, Face, UprightId, StructureSlot, StructureVariant, PlacementInfo } from './types.ts';
import { holdsPlates, platePeg, plateParams, validatePlateFloor, validatePlateStack, type PlateId } from './plates.ts';
import { attachmentPartIds, getAttachmentDefaults, getAttachmentPlacementInfo, getAttachmentAnchor, getAttachmentCollisionBoxes, hookAnchor, hookCollisionBoxes, mountFrame } from './attachment-mounts.ts';
import { fitParams, fitStationOffsets, rackMountFit } from './mount-fit.ts';

/** Connection-based rack document. Coordinates are millimetres, Z up; angles radians.
 * Width/depth are clear distances between upright inner faces. Hole numbers are
 * zero-based station indices. This module is pure and does not generate geometry.
 */
export const ASSEMBLY_VERSION = 2;
export const RACK_DEFAULTS: Readonly<RackDimensions> = Object.freeze({ height: 2032, width: 1075, depth: 725, tube: 75, holeDiameter: 25, pitch: 50, firstHole: 65 });
export const UPRIGHT_IDS: readonly UprightId[] = Object.freeze(['front-left', 'front-right', 'rear-left', 'rear-right']);
export const FACES: readonly Face[] = Object.freeze(['front', 'back', 'left', 'right']);
export const ACCESSORY_PARTS = Object.freeze(['pullup-straight', 'pullup-multigrip', 'pullup-sphere', 'j-hook-standard', 'j-hook-roller', 'j-hook-sandwich', 'safety-box', 'safety-pin-pipe', 'safety-webbing', 'foot-400', 'foot-800', ...attachmentPartIds, ...VOLTRA_IDS, ...DARKO_IDS, ...RACK_PART_IDS]);
/** Includes rack-registry entries registered after load (test seam). */
export const isAccessoryPart = (part: string) => ACCESSORY_PARTS.includes(part) || isRackPart(part);
/** Parts that bolt to a crossmember rail station (Darko Anchors and registry entries that accept it, on top or under). */
const railMounted = (part: string, kind: string) => kind === 'crossmember-top' ? isDarkoTop(part) || acceptsTarget(part, 'crossmember-top') : acceptsRail(part) && acceptsTarget(part, kind as 'crossmember-under');
export const STRUCTURE_SLOTS: readonly StructureSlot[] = Object.freeze<StructureSlot[]>([
  ...UPRIGHT_IDS.map((id): StructureSlot => ({ id, part: 'upright', connectedTo: [] })),
  { id: 'left-upper-crossmember', part: 'crossmember-725', connectedTo: ['front-left', 'rear-left'] },
  { id: 'left-lower-crossmember', part: 'crossmember-725', connectedTo: ['front-left', 'rear-left'] },
  { id: 'right-upper-crossmember', part: 'crossmember-725', connectedTo: ['front-right', 'rear-right'] },
  { id: 'right-lower-crossmember', part: 'crossmember-725', connectedTo: ['front-right', 'rear-right'] },
  { id: 'rear-crossmember', part: 'crossmember-1075', connectedTo: ['rear-left', 'rear-right'] },
]);
const SOURCE_DEFAULTS: Record<string, NumericParams> = {
  'pullup-straight': { length: 1075, diameter: 32 },
  'pullup-multigrip': { length: 1075, diameter: 32, projection: 170 },
  'pullup-sphere': { length: 1075, diameter: 32, projection: 190, sphereDiameter: 125 },
  'j-hook-standard': { width: 77.50773067687726, depth: 267.1657279908552, height: 199.99746128159586, holeDiameter: 25 },
  'j-hook-roller': { width: 79.41224628971781, depth: 181.76052942221077, height: 200.00000949949026, holeDiameter: 25 },
  'j-hook-sandwich': { width: 77.49497432826422, depth: 186.9865255761083, height: 200.00000949949026, holeDiameter: 25 },
  'safety-box': { length: 1075, width: 75, height: 75, wall: 3, upright: 75 },
  'safety-pin-pipe': { length: 1075, pipeDiameter: 45, wall: 3, pinDiameter: 16, upright: 75 },
  'safety-webbing': { length: 1075, strapWidth: 40, strapThickness: 3, sag: 50, upright: 75 },
  'foot-400': { length: 400, width: 75, wall: 3, baseThickness: 8, padWidth: 95, padDepth: 215, plateThickness: 6, holeDiameter: 25 },
  'foot-800': { length: 800, width: 75, wall: 3, baseThickness: 8, padWidth: 95, padDepth: 215, plateThickness: 6, holeDiameter: 25 },
  ...Object.fromEntries(attachmentPartIds.map(part => [part, getAttachmentDefaults(part)])),
};
const BEAM_SLOTS = STRUCTURE_SLOTS.filter(s => s.part !== 'upright').map(s => s.id);
const DEPTH_SLOTS = BEAM_SLOTS.filter(id => id !== 'rear-crossmember');
const FRAME_PARTS: Record<string, { slots: string[]; label: string; defaults: NumericParams }> = {
  'crossmember-425': { slots: BEAM_SLOTS, label: '425 mm crossmember', defaults: {} },
  'crossmember-725': { slots: BEAM_SLOTS, label: '725 mm crossmember', defaults: {} },
  'crossmember-1075': { slots: BEAM_SLOTS, label: '1075 mm crossmember', defaults: {} },
  'angled-crossmember': { slots: DEPTH_SLOTS, label: 'Angled crossmember', defaults: { rise: 200 } },
  'offset-crossmember': { slots: ['rear-crossmember'], label: 'Offset crossmember', defaults: { offset: 193.5 } },
  'branded-crossmember': { slots: ['rear-crossmember'], label: 'BOS STRENGTH nameplate crossmember', defaults: {} },
  'branded-crossmember-lite': { slots: ['rear-crossmember'], label: 'BOS STRENGTH nameplate crossmember lite', defaults: {} },
  'profile-nameplate': { slots: ['rear-crossmember'], label: 'Manufacturer nameplate crossmember', defaults: {} },
  nameplate: { slots: ['rear-crossmember'], label: 'Nameplate panel and supporting rail', defaults: {} },
};
/** Detached defaults for editors; keep geometry and UI on one source of truth. */
export function getPartDefaults(part: string): NumericParams {
  if (isVendorPart(part)) return vendorDefaults(part);
  if (isRackPart(part)) return rackDefaults(part);
  return { ...(FRAME_PARTS[part]?.defaults ?? SOURCE_DEFAULTS[part] ?? {}) };
}
const NORMALS: Record<Face, Vec3> = { front: [0, -1, 0], back: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0] };
const ROTATIONS: Record<Face, number> = { front: Math.PI, back: 0, left: Math.PI / 2, right: -Math.PI / 2 };
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function fail(message: string): never { throw new Error(message); }
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const isPullup = (part: string) => part.startsWith('pullup-');
const isSafety = (part: string) => part.startsWith('safety-');
const isHook = (part: string) => part.startsWith('j-hook-');
const isFoot = (part: string) => part === 'foot-400' || part === 'foot-800';
const isMountedAttachment = (part: string) => attachmentPartIds.includes(part);
const supportsPair = (part: string) => isRackPart(part) ? rackPlacement(part).paired : !isPullup(part) && (!isMountedAttachment(part) || getAttachmentPlacementInfo(part).paired);
/** Registry preference: a named face, or the outer/inner side face of this upright. */
function rackPreferredFace(doc: RackDoc, part: string, uprightId: string): Face {
  const want = rackPlacementFace(part, doc.rack), faces = rackPlacement(part).faces ?? [...FACES];
  const p = doc.uprights[uprightId], xs = p ? Object.values(doc.uprights).filter(q => q.y === p.y).map(q => q.x) : [];
  const left = p ? p.x === Math.min(...xs) : sideOf(uprightId) === 'left';
  const face = want === 'outside' ? (left ? 'left' : 'right') : want === 'inside' ? (left ? 'right' : 'left') : want ?? 'front';
  return faces.includes(face) ? face : faces[0];
}
const isWidePullup = (part: string) => isPullup(part) && part !== 'pullup-straight';
const rowOf = (id: string) => id.startsWith('rear-') ? 'rear' : 'front';
const sideOf = (id: string) => id.endsWith('-right') ? 'right' : 'left';
const otherSide = (id: string): UprightId => `${rowOf(id)}-${sideOf(id) === 'left' ? 'right' : 'left'}`;
const maxHole = (rack: RackDimensions) => Math.floor((rack.height - rack.holeDiameter / 2 - rack.firstHole) / rack.pitch);
const holeZ = (rack: RackDimensions, hole: number) => rack.firstHole + hole * rack.pitch;
/** Upright size along Y (front-to-back); rectangular 2x3 posts face their narrow side forward. */
const tubeDepthOf = (rack: RackDimensions) => rack.tubeDepth ?? rack.tube;
/** Upright size along a horizontal span direction. */
const tubeAlong = (rack: RackDimensions, dx: number, dy: number) => Math.abs(dx) >= Math.abs(dy) ? rack.tube : tubeDepthOf(rack);
const uprightHeight = (rack: RackDimensions, node?: UprightNode) => Math.min(rack.height, node?.height ?? rack.height);
const maxHoleAt = (rack: RackDimensions, node?: UprightNode) => maxHole({ ...rack, height: uprightHeight(rack, node) });
export function validHole(rack: RackDimensions, hole: number, face: Face): boolean {
  if (!Number.isFinite(hole) || hole < 0 || hole > maxHole(rack)) return false;
  if (Number.isInteger(hole)) return true;
  const z = holeZ(rack,hole);
  return (face === 'front' || face === 'back') && rack.benchSpacing === rack.pitch/2 && Number.isInteger(hole*2) && z >= (rack.benchStart ?? Infinity) && z <= (rack.benchEnd ?? -Infinity);
}
const upperHole = (rack: RackDimensions) => Math.floor((rack.height - 25 - rack.firstHole) / rack.pitch) - Math.round(100 / rack.pitch);
const pullupHole = (rack: RackDimensions) => Math.floor((rack.height - 25 - rack.firstHole) / rack.pitch) - Math.round(200 / rack.pitch);
function finiteRange(value: unknown, low: number, high: number, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high) fail(`${label} must be between ${low} and ${high}.`);
}
function postCenter(rack: RackDimensions & { uprights?: RackDoc["uprights"] }, id: string): Vec3 {
  if (rack.uprights?.[id]) return [rack.uprights[id].x, rack.uprights[id].y, 0];
  return [(sideOf(id) === 'left' ? -1 : 1) * (rack.width + rack.tube) / 2, (rowOf(id) === 'front' ? -1 : 1) * (rack.depth + tubeDepthOf(rack)) / 2, 0];
}
/** Colour as positive worker params: prefixR/G/B = channel + 1. */
const colorParams = (prefix: string, color: string): NumericParams => Object.fromEntries(['R', 'G', 'B'].map((c, i) => [prefix + c, parseInt(color.slice(1 + 2 * i, 3 + 2 * i), 16) + 1]));
/** Builder params for a profile's base, holes and decal, in the upright's local frame
 * (tube centre at local x = 15, +x toward the rack centre line, local y flipped when the post is turned). */
function uprightFrameParams(doc: RackDoc, id: string, profile: GridProfile, angle: number): NumericParams {
  const r = doc.rack, node = doc.uprights[id], td = tubeDepthOf(r), flip = angle ? -1 : 1, base = profile.base;
  const out: NumericParams = {};
  if (td !== r.tube) out.depth = td;
  if (profile.wall) out.wall = profile.wall;
  if (profile.sideStride && profile.sideStride > 1) out.sideStride = profile.sideStride;
  if (profile.numbered === false) out.unnumbered = 1;
  if (profile.decal) Object.assign(out, colorParams('decal', profile.decal.color), { decalLength: profile.decal.length, decalWidth: profile.decal.width, decalTop: profile.decal.top });
  if (!base || base.style === 'plate') return out;
  const live = Object.entries(doc.uprights).filter(([other]) => !doc.removed.includes(other));
  if (base.style === 'bolt-down') return Object.assign(out, { baseStyle: 1, plateOut: base.out, plateFore: base.fore, plateThickness: base.thickness }, base.in ? { plateIn: base.in } : {});
  if (base.style === 'wall') {
    const bracketIn = Math.abs(node.x) - r.tube / 2;
    return Object.assign(out, { baseStyle: 3, wallDepth: r.depth + 6.35, armLow: base.armLow, armHigh: base.armHigh, armSize: base.armSize, bracketHeight: base.bracketHeight, bracketOut: base.bracketOut },
      flip < 0 ? { armFlip: 1 } : {}, bracketIn > 1 ? { bracketIn } : {});
  }
  // Posts sharing one column (same x) share one continuous foot; each post draws its half.
  const column = live.filter(([, n]) => Math.abs(n.x - node.x) < 1).map(([, n]) => n.y).sort((a, b) => a - b);
  const prev = column.filter(y => y < node.y - 1).at(-1), next = column.find(y => y > node.y + 1);
  const minus = prev === undefined ? td / 2 + base.front : (node.y - prev) / 2, plus = next === undefined ? td / 2 + base.back : (next - node.y) / 2;
  Object.assign(out, { baseStyle: 2, footWidth: base.width, footHeight: base.height, footWall: base.wall ?? 3,
    footMinus: flip > 0 ? minus : plus, footPlus: flip > 0 ? plus : minus });
  const openMinus = flip > 0 ? prev !== undefined : next !== undefined, openPlus = flip > 0 ? next !== undefined : prev !== undefined;
  if (openMinus) out.footOpenMinus = 1;
  if (openPlus) out.footOpenPlus = 1;
  if (base.caps) out.footCaps = 1;
  if (base.gusset) Object.assign(out, { gussetHeight: base.gusset.height, gussetLength: base.gusset.length });
  const opposite = live.some(([, n]) => Math.sign(n.x) === -Math.sign(node.x) && Math.abs(n.x) > 1);
  if (base.rearBar && next === undefined && opposite && Math.abs(node.x) > r.tube / 2) {
    const worldY = base.rearBar === 'end' ? plus - base.width / 2 - (base.rearBarOffset ?? 0) : base.rearBarOffset ?? 0;
    const localY = worldY * flip;
    Object.assign(out, { crossIn: Math.abs(node.x) }, Math.abs(localY) > 0.01 ? { crossY: Math.abs(localY) } : {}, localY < 0 ? { crossBack: 1 } : {});
  }
  return out;
}
function nameplateParams(profile: GridProfile): NumericParams {
  const plate = profile.nameplate!;
  return { panelStyle: ({ badge: 1, arch: 2, panel: 3 } as const)[plate.style], panelHeight: plate.height ?? 150, badgeWidth: plate.width ?? 150,
    ...colorParams('panel', plate.color), ...(plate.accent ? colorParams('accent', plate.accent) : {}), ...(plate.center ? { badgeCenter: 1 } : {}) };
}
function rotateZ(point: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [point[0] * c - point[1] * s, point[0] * s + point[1] * c, point[2]];
}
function mount(rack: RackDimensions & { uprights?: RackDoc["uprights"] }, uprightId: UprightId, hole: number, face: Face = 'front', localAnchor?: Vec3): Mount {
  const center = postCenter(rack, uprightId); center[2] = holeZ(rack, hole);
  const position = center.map((v, i) => v + NORMALS[face][i] * (i === 1 ? tubeDepthOf(rack) : rack.tube) / 2) as Vec3;
  return { uprightId, face, hole, position, center, ...(localAnchor ? { localAnchor: [...localAnchor] as Vec3 } : {}) };
}
function targetsFor(accessory: Accessory): Target[] {
  const targets = [accessory.target];
  if (isRailTarget(accessory.target)) return accessory.paired && accessory.pairTarget ? [...targets, accessory.pairTarget] : targets;
  if (isHostedTarget(accessory.target)) return accessory.paired && accessory.pairHost ? [...targets, accessory.pairHost] : targets;
  if (accessory.paired) {
    const face = accessory.target.face;
    targets.push({ ...accessory.target, uprightId: accessory.pairTo ?? otherSide(accessory.target.uprightId), face: face === 'left' ? 'right' : face === 'right' ? 'left' : face });
  }
  return targets;
}
function dependencies(accessory: Accessory): string[] {
  if (isRailTarget(accessory.target)) return targetsFor(accessory).flatMap(t => isRailTarget(t) ? [t.connectionId,t.uprightId] : []);
  // Hosted parts depend on their host accessory (checked, and pruned with it, in validateAssembly / pruneHosted).
  if (isHostedTarget(accessory.target)) return [];
  if (accessory.spanTo) return [accessory.target.uprightId, accessory.spanTo, ...(accessory.paired ? [accessory.pairTo ?? otherSide(accessory.target.uprightId), accessory.pairedSpanTo!] : [])];
  const ids = new Set<string>();
  for (const t of targetsFor(accessory)) {
    if (isSafety(accessory.part)) for (const row of ['front', 'rear'] as const) ids.add(`${row}-${sideOf(t.uprightId)}`);
    else if (isPullup(accessory.part)) {
      for (const side of ['left', 'right']) ids.add(`${rowOf(t.uprightId)}-${side}`);
      if (accessory.part !== 'pullup-straight') for (const side of ['left', 'right']) ids.add(`${side}-upper-crossmember`);
    } else ids.add(t.uprightId);
  }
  return [...ids];
}
function accessoryLimits(rack: RackDimensions, accessory: Accessory): [number, number] {
  if (isVendorPart(accessory.part)) return vendorLimits(accessory.part, accessory.params, rack);
  if (isRackPart(accessory.part)) return rackLimits(accessory, rack);
  if (isFoot(accessory.part)) return [0, 0];
  if (isMountedAttachment(accessory.part)) {
    const anchor = getAttachmentAnchor(accessory.part, accessory.params, rackMountFit(rack, accessory.target.face));
    return [Math.max(0, Math.ceil((anchor.minHoleZ - rack.firstHole) / rack.pitch)), Math.floor((rack.height - anchor.maxAbove - rack.firstHole) / rack.pitch)];
  }
  let min = 0, max = maxHole(rack);
  if (isHook(accessory.part)) { min = Math.ceil((150 - rack.firstHole) / rack.pitch); max = Math.floor((rack.height - 50 - rack.firstHole) / rack.pitch); }
  if (accessory.part === 'safety-box') min = Math.ceil((137.5 - rack.firstHole) / rack.pitch);
  if (accessory.part === 'safety-webbing') min = Math.ceil((158 + (accessory.params.sag ?? 50) - 50 - rack.firstHole) / rack.pitch);
  if (accessory.part === 'safety-pin-pipe') min = Math.ceil((100 - rack.firstHole) / rack.pitch);
  if (accessory.part === 'pullup-straight') max = pullupHole(rack);
  if (accessory.part === 'pullup-multigrip') max = Math.floor((rack.height - 66 - rack.firstHole) / rack.pitch);
  if (accessory.part === 'pullup-sphere') max = Math.floor((rack.height - 132 - rack.firstHole) / rack.pitch);
  return [Math.max(0, min), Math.max(0, max)];
}
/** Every pin of a fitted built-in passes through a real hole: normal pins through the mount face, transverse pins
 * through the adjacent faces (whole stations only; side faces follow the profile's side-hole stride). */
function validateFittedHoles(rack: RackDimensions, profile: GridProfile, part: string, face: Face, hole: number) {
  const frame = mountFrame(part), offsets = fitStationOffsets(frame.stations.map(s => s.z), rack.pitch), stride = profile.sideStride ?? 1;
  frame.stations.forEach((station, i) => {
    const normal = Math.abs(station.axis[0] * frame.normal[0] + station.axis[1] * frame.normal[1]) > 0.9;
    const through: Face = normal ? face : face === 'front' || face === 'back' ? 'left' : 'front', h = hole + Math.round(offsets[i] / rack.pitch);
    if (!validHole(rack, h, through) || ((through === 'left' || through === 'right') && stride > 1 && h % stride !== 0)) fail(`This attachment needs a real ${through === face ? '' : 'side '}hole at station ${h + 1} for its ${normal ? 'pin' : 'transverse pin'}.`);
  });
}
function validateParams(part: string, params: unknown): asserts params is NumericParams {
  if (!isRecord(params)) fail('Accessory parameters must be an object.');
  if (isVendorPart(part)) { validateVendorParams(part, params as NumericParams); return; }
  if (isRackPart(part)) { validateRackPartParams(part, params as NumericParams); return; }
  const defaults = SOURCE_DEFAULTS[part];

  for (const [key, value] of Object.entries(params)) {
    if (!Object.hasOwn(defaults, key)) fail(`Unsupported ${part} parameter: ${key}.`);
    finiteRange(value, 0.1, 4000, `${part} ${key}`);
    // Spans and mounting interfaces are controlled by the rack connections.
    if (['length', 'upright', 'holeDiameter'].includes(key)) fail(`${key} is controlled by the rack connection.`);
    if (isHook(part) && Math.abs(value - defaults[key]) > 0.001) fail('J-hook dimensions must retain their 75 mm upright fit.');
    if (part === 'safety-box' && ['width', 'height'].includes(key) && Math.abs(value - defaults[key]) > 0.001) fail('Box safety dimensions must retain their measured cradle connection.');
    if (isFoot(part) && ['width', 'plateThickness', 'baseThickness'].includes(key) && Math.abs(value - defaults[key]) > 0.001) fail('Foot mounting and floor interfaces must retain their measured dimensions.');
    if (key === 'projection' && Math.abs(value - defaults[key]) > 0.001) fail('Multi-grip plate depth must retain its upper-rail bolt spacing.');
  }
  const numeric = params as NumericParams;
  if (isMountedAttachment(part)) getAttachmentAnchor(part, numeric);
  if (isPullup(part)) finiteRange(numeric.diameter ?? 32, 15, 60, 'Pull-up bar diameter');
  if (part === 'safety-pin-pipe' && (numeric.pipeDiameter ?? 45) - 2 * (numeric.wall ?? 3) <= (numeric.pinDiameter ?? 16)) fail('Safety pipe bore must fit the pin.');
  if (part === 'safety-box' && 2 * (numeric.wall ?? 3) >= Math.min(numeric.width ?? 75, numeric.height ?? 75)) fail('Safety wall thickness must fit the tube.');
}
/** Validate imported JSON before using it. Returns a detached, normalized document. */
export function validateAssembly(input: unknown): RackDoc {
  if (!isRecord(input) || ![1, ASSEMBLY_VERSION].includes(input.version as number) || !isRecord(input.rack)) fail('Unsupported assembly document.');
  if (input.profileId !== undefined && (typeof input.profileId !== 'string' || input.profileId.length > 100)) fail('Invalid rack profile identity.');
  const r = input.rack;
  finiteRange(r.height, 1000, 4000, 'Height'); finiteRange(r.width, 400, 2000, 'Clear width'); finiteRange(r.depth, 300, 1500, 'Clear depth');
  finiteRange(r.tube, 50, 100, 'Tube');
  if (r.tube !== (gridProfile(typeof input.profileId === 'string' ? input.profileId : undefined).tube ?? 75)) fail('Tube size must match the named rack profile; generic connections require 75 mm uprights.');
  const profile = gridProfile(typeof input.profileId === 'string' ? input.profileId : undefined), manufacturer = profile.id !== 'generic-75';
  if (r.holeDiameter !== profile.holeDiameter) fail(`This profile uses ${profile.holeDiameter} mm mounting holes.`);
  if (manufacturer && r.pitch !== profile.pitch) fail('Manufacturer pitch must match its rack profile.');
  finiteRange(r.pitch, 50, 100, 'Hole pitch');
  if (!manufacturer && Math.abs(100 / r.pitch - Math.round(100 / r.pitch)) > 1e-8) fail('Hole pitch must divide the 100 mm flange bolt spacing.');
  finiteRange(r.firstHole, 30, 150, 'First hole height');
  if ((r.tubeDepth ?? r.tube) !== (profile.tubeDepth ?? r.tube)) fail('Upright depth must match the named rack profile.');
  const rack: RackDimensions = { ...copy(r), height: r.height, width: r.width, depth: r.depth, tube: r.tube, holeDiameter: r.holeDiameter, pitch: r.pitch, firstHole: r.firstHole };
  if (profile.tubeDepth !== undefined && profile.tubeDepth !== r.tube) rack.tubeDepth = profile.tubeDepth; else delete rack.tubeDepth;
  if (profile.benchZone) {
    const zone = profile.benchZone;
    rack.benchStart = r.firstHole + zone.startStation * r.pitch;
    rack.benchEnd = r.firstHole + zone.endStation * r.pitch;
    rack.benchSpacing = zone.spacing;
  } else {
    delete rack.benchStart; delete rack.benchEnd; delete rack.benchSpacing;
  }
  const graph = input.version === 1 ? legacyGraph(rack) : validateGraph(input);
  const slots = structureSlots(graph);
  if (!Array.isArray(input.accessories) || input.accessories.length > 40) fail('An assembly can contain at most 40 accessory groups.');
  if (!Array.isArray(input.removed) || input.removed.length > slots.length || new Set(input.removed).size !== input.removed.length) fail('Invalid removed structure list.');
  for (const id of input.removed) if (!slots.some(slot => slot.id === id)) fail(`Unknown structural slot: ${id}.`);
  const removed = input.removed as string[];
  const structure: Record<string, StructureVariant> = {};
  if (input.structure !== undefined && !isRecord(input.structure)) fail('Structural variants must be an object.');
  for (const [id, variant] of Object.entries(input.structure ?? {})) {
    if (!isRecord(variant) || typeof variant.part !== 'string' || (!FRAME_PARTS[variant.part] || !slots.some(s => s.id === id && s.part !== 'upright'))) fail(`Incompatible structural variant for ${id}.`);
    const params = variant.params ?? {}, defaults = FRAME_PARTS[variant.part].defaults;
    if (!isRecord(params)) fail('Structural variant parameters must be an object.');
    const cleanParams: NumericParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (!Object.hasOwn(defaults, key)) fail(`Unsupported structural parameter: ${key}.`);
      finiteRange(value, 25, 600, key);
      cleanParams[key] = value;
    }
    const edge = graph.connections.find(e => e.id === id)!;
    if (['offset-crossmember', 'nameplate'].includes(variant.part) && (graph.uprights[edge.from].y !== graph.uprights[edge.to].y || graph.uprights[edge.from].x >= graph.uprights[edge.to].x)) fail('This specialized frame adapter requires a left-to-right horizontal connection.');
    const effective = { ...defaults, ...cleanParams };
    if (variant.part === 'angled-crossmember' && (effective.rise % r.pitch !== 0 || effective.rise + 190 > r.height)) fail('Angled crossmember rise must align with upright hole stations and fit the height.');
    if (variant.part === 'branded-crossmember' && 250 % r.pitch !== 0) fail('The full nameplate flange requires 50 mm upright stations.');
    if (variant.part === 'profile-nameplate' && !profile.nameplate) fail('This rack profile has no manufacturer nameplate.');
    validateMountShaft(variant.part, cleanParams, rack.holeDiameter);
    structure[id] = { ...copy(variant), part: variant.part as PartId, params: cleanParams };
  }
  const ids = new Set(slots.map(slot => slot.id));
  const accessories = input.accessories.map(a => {
    if (!isRecord(a) || typeof a.id !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(a.id) || ids.has(a.id)) fail('Accessory IDs must be unique and valid.');
    ids.add(a.id);
    if (typeof a.part !== 'string' || !isAccessoryPart(a.part)) fail(`No rack connection adapter for ${a.part}.`);
    if (!isRecord(a.target) || typeof a.target.uprightId !== "string" || !Object.hasOwn(graph.uprights, a.target.uprightId) || !FACES.includes(a.target.face as Face) || typeof a.target.hole !== 'number' || !(Number.isInteger(a.target.hole) || validHole(rack, a.target.hole, a.target.face as Face))) fail(`Invalid connection target for ${a.id}.`);
    if (a.target.kind !== undefined && !(TARGET_KINDS as readonly unknown[]).includes(a.target.kind)) fail('Unknown mount target kind.');
    if (isRailTarget(a.target as unknown as Target) && !railMounted(a.part, a.target.kind as string)) fail(a.target.kind === 'crossmember-under' && isRackPart(a.part) ? 'This part does not hang under a crossmember.' : 'This part requires an upright target.');
    if (isHostedTarget(a.target as unknown as Target) && !isRackPart(a.part)) fail('Only registry rack parts mount on other accessories.');
    if (!a.spanTo && (isSafety(a.part) || isPullup(a.part)) && a.target.face !== (sideOf(a.target.uprightId as UprightId) === 'left' ? 'right' : 'left')) fail('Spanning parts mount on the inward-facing connection of an upright.');
    if (typeof a.paired !== 'boolean' || !supportsPair(a.part) && a.paired) fail('This part is placed as one complete or handed assembly.');
    if (graph.uprights[a.target.uprightId].height !== undefined && a.target.hole > maxHoleAt(rack, graph.uprights[a.target.uprightId])) fail(`Invalid connection target for ${a.id}: above the top of this shorter upright.`);
    const params = a.params ?? {}; validateParams(a.part, params);
    if (isWidePullup(a.part)) {
      const original = legacyGraph(rack);
      if (UPRIGHT_IDS.some(id => !graph.uprights[id] || graph.uprights[id].x !== original.uprights[id].x || graph.uprights[id].y !== original.uprights[id].y) || original.connections.filter(e => e.id.includes('upper')).some(e => !graph.connections.some(current => current.id === e.id && current.from === e.from && current.to === e.to && current.level === e.level))) fail('Wide pull-up rail adapters require the original rectangular upper rails.');
    }
    if (isWidePullup(a.part) && (rack.pitch !== 50 || rack.depth < (a.part === 'pullup-sphere' ? 425 : 375))) fail('This pull-up plate requires 50 mm rail stations and enough clear depth for its full bolt span.');
    if (isWidePullup(a.part) && ['left-upper-crossmember', 'right-upper-crossmember'].some(id => structure[id]?.part === 'angled-crossmember')) fail('Wide pull-up plates require level upper side rails.');
    if (manufacturer && isFoot(a.part)) fail('BOS floor-foot bolt patterns are unavailable on this reconstructed profile.');
    if (isFoot(a.part) && rack.firstHole !== 65) fail('Floor-mounted feet require the first upright hole at 65 mm.');
    if (rack.tube !== 75 && isFoot(a.part)) fail('Source attachment sleeves require 75 mm uprights; no true 3-inch adapter is available.');
    // Built-in hooks, attachments and safeties fit other uprights by adapting their sleeve and pin (mount-fit.ts, #162).
    const fit = isMountedAttachment(a.part) || isHook(a.part) || isSafety(a.part) ? rackMountFit(rack, a.target.face as Face) : null;
    if (fit && (isMountedAttachment(a.part) || isHook(a.part))) validateFittedHoles(rack, profile, a.part, a.target.face as Face, a.target.hole);
    if (isMountedAttachment(a.part)) {
      const anchor = getAttachmentAnchor(a.part, params, fit);
      if (anchor.requiredPitch && anchor.requiredPitch !== rack.pitch) fail('This attachment requires 50 mm upright hole spacing for its full bolt pattern.');
      if (anchor.boltStations.some(station => Math.abs(station.zOffset / rack.pitch - Math.round(station.zOffset / rack.pitch)) > 0.001)) fail('The attachment bolt pattern does not align with these upright stations.');
    }
    validateMountShaft(a.part, params, rack.holeDiameter, fit?.pin);
    const clean: Accessory = { ...copy(a), id: a.id, part: a.part as PartId, target: { ...copy(a.target), uprightId: a.target.uprightId as UprightId, face: a.target.face as Face, hole: a.target.hole }, paired: a.paired, params: { ...params } };
    if (a.plates !== undefined) {
      const plates = validatePlateStack(clean.part, a.plates);
      if (plates.length) validatePlateFloor(plates, holeZ(rack, clean.target.hole) + platePeg(clean.part)!.origin[2] - getAttachmentAnchor(clean.part, params, fit).point[2]);
      if (plates.length) clean.plates = plates; else delete clean.plates;
    }
    validateMountedRotation(clean);
    if (clean.rotation !== undefined || clean.target.orientation !== undefined) clean.rotation = accessoryRotation(clean);
    if (isVendorPart(clean.part)) validateVendorMount({ rack, ...graph, removed, structure }, clean);
    if (isRackPart(clean.part)) validateRackMount({ rack, ...graph, removed, structure }, clean);
    if (isRailTarget(clean.target)) {
      if (!railMounted(clean.part, clean.target.kind)) fail('This part requires an upright target.');
      if (clean.paired && !clean.pairTarget) clean.pairTarget = matchingDarkoTarget({rack,...graph,removed,structure},clean.target);
      if (clean.paired && !clean.pairTarget) fail('Choose a parallel crossmember for the matching pair.');
      if (clean.pairTarget) {
        if (clean.pairTarget.kind !== clean.target.kind || clean.pairTarget.connectionId === clean.target.connectionId) fail('Choose a distinct matching crossmember.');
        const m = railMount({rack,...graph,removed,structure},clean.target), n = railMount({rack,...graph,removed,structure},clean.pairTarget);
        const v = n.center.map((x,i) => x-m.center[i]);
        if (Math.abs(v[2])>.01 || Math.hypot(v[0],v[1])<rack.tube || Math.abs(v[0]*m.pinAxis![1]-v[1]*m.pinAxis![0])>.01 || Math.abs(m.pinAxis![0]*n.pinAxis![1]-m.pinAxis![1]*n.pinAxis![0])>.01) fail('Paired Darko cradles must align across parallel rails at equal heights.');
      }
    } else if (clean.pairTarget) fail('Crossmember pair target requires a crossmember-mounted part.');
    if (isUprightTarget(clean.target) && clean.paired && !clean.pairTo && UPRIGHT_IDS.includes(clean.target.uprightId)) clean.pairTo = otherSide(clean.target.uprightId);
    if (!clean.spanTo && UPRIGHT_IDS.includes(clean.target.uprightId)) {
      if (clean.part === 'pullup-straight') clean.spanTo = otherSide(clean.target.uprightId);
      if (isSafety(clean.part)) {
        // Historical safeties run front-to-rear regardless of the clicked row.
        clean.target.uprightId = `front-${sideOf(clean.target.uprightId)}`;
        clean.spanTo = `rear-${sideOf(clean.target.uprightId)}`;
        if (clean.paired) { clean.pairTo = otherSide(clean.target.uprightId); clean.pairedSpanTo = `rear-${sideOf(clean.pairTo)}`; }
      }
    }
    for (const key of ['spanTo', 'pairTo', 'pairedSpanTo'] as const) if (a[key] !== undefined && (typeof a[key] !== 'string' || !Object.hasOwn(graph.uprights, a[key]) || a[key] === clean.target.uprightId)) fail('Invalid explicit accessory endpoint.');
    if (clean.paired && !clean.pairTo && isUprightTarget(clean.target)) fail('Choose an explicit matching upright for this pair.');
    if ((isSafety(clean.part) || clean.part === 'pullup-straight') && !clean.spanTo) fail('Choose an explicit span endpoint for this upright.');
    if (clean.spanTo) {
      if (!(isSafety(clean.part) || clean.part === 'pullup-straight')) fail('Explicit spans require a safety or straight pull-up bar.');
      if (clean.paired && !clean.pairedSpanTo) fail('Paired spans require explicit second endpoints.');
      const spans = [[clean.target.uprightId, clean.spanTo]];
      if (clean.paired) spans.push([clean.pairTo!, clean.pairedSpanTo!]);
      for (const [from, to] of spans) {
        const p = graph.uprights[from], q = graph.uprights[to];
        if (!p || !q) fail(`${isSafety(clean.part) ? 'Safeties need' : 'This bar needs'} an upright at both ends; ${!p ? from : to} is not part of this rack.`);
        if ((p.x !== q.x && p.y !== q.y) || Math.hypot(q.x-p.x, q.y-p.y) < rack.tube + 300 || Math.hypot(q.x-p.x, q.y-p.y) > rack.tube + 3000) fail('Spanning endpoints must be axis aligned and at least 300 mm apart.');
        const spanFace: Face = p.x === q.x ? 'front' : 'left';
        if (!validHole(rack,clean.target.hole,spanFace)) fail('The span requires real holes on its mounting faces.');
      }
    }
    const [min, max] = accessoryLimits(rack, clean);
    if (!isWidePullup(clean.part) && (clean.target.hole < min || clean.target.hole > max)) fail(`${a.part} fits hole numbers ${min + 1}–${max + 1} at this rack height.`);
    if (isWidePullup(clean.part)) clean.target.hole = upperHole(rack) + Math.round(50 / rack.pitch);
    for (const id of dependencies(clean)) if (!slots.some(s => s.id === id) || removed.includes(id)) fail(`${a.id} depends on removed ${id}.`);
    return clean;
  });
  // Hosted parts (#178) are checked once every accessory is known: the host exists, offers that frame and station, and
  // the part fits it. Hosts are never hosted themselves, so one pass suffices.
  for (const a of accessories) if (isHostedTarget(a.target)) {
    const host = accessories.find(x => x.id === (a.target as { host?: string }).host);
    if (host && isHostedTarget(host.target)) fail(`${a.id} cannot mount on another mounted attachment.`);
    const hostDoc = { rack, uprights: graph.uprights, removed, accessories };
    a.target = validateHostedMount(hostDoc, a);
    if (a.paired) a.pairHost = validateHostedMount(hostDoc, a, a.pairHost ?? hostedPairTarget(hostDoc, a)); else delete a.pairHost;
  }
  for (const a of accessories) if (!isHostedTarget(a.target)) delete a.pairHost;
  if (typeof input.nextId !== 'number' || !Number.isSafeInteger(input.nextId) || input.nextId < 1 || input.nextId > 1000000) fail('Invalid next accessory ID.');
  const appearance = validateAppearance(input.appearance);
  const floorItems = validateFloorItems(input.floorItems, [...Object.keys(graph.uprights), ...graph.connections.map(e=>e.id), ...accessories.map(a=>a.id)]);
  const wallItems = validateWallItems(input.wallItems, [...Object.keys(graph.uprights), ...graph.connections.map(e=>e.id), ...accessories.map(a=>a.id), ...floorItems.map(f=>f.id)]), room = validateRoom(input.room);
  const hangItems = validateHangItems(input.hangItems, wallItems, [...Object.keys(graph.uprights), ...graph.connections.map(e=>e.id), ...accessories.map(a=>a.id), ...floorItems.map(f=>f.id), ...wallItems.map(w=>w.id)]);
  const systems = validateSystems({ ...input, ...graph, rack, removed, structure, accessories, floorItems } as RackDoc, input.systems);
  const logo = validateLogo(input.logo);
  return { ...copy(input), ...(input.floorItems !== undefined ? { floorItems } : {}), ...(input.wallItems !== undefined ? { wallItems } : {}), ...(input.hangItems !== undefined ? { hangItems } : {}), ...(room ? { room } : {}), ...(logo ? { logo } : {}), ...(appearance ? { appearance } : {}), ...graph, ...(systems ? { systems } : {}), version: ASSEMBLY_VERSION, rack, removed: [...removed], structure, accessories, nextId: input.nextId };

}
export function getPartPlacementInfo(part: string, input?: RackDoc): PlacementInfo | null {
  if (isVendorPart(part)) return vendorPlacement(part);
  if (isRackPart(part)) return rackPlacement(part);
  if (isMountedAttachment(part)) {
    const info = getAttachmentPlacementInfo(part);
    return { ...info, family: part.startsWith('storage-pin-') ? 'storage-pins' : part.startsWith('dip-') ? 'dips' : part };
  }
  if (part === 'upright') return { family: 'upright', label: 'Upright', paired: false, slots: input ? Object.keys(input.uprights) : [...UPRIGHT_IDS], fields: [] };
  if (FRAME_PARTS[part]) {
    const data = FRAME_PARTS[part];
    const fields = part === 'angled-crossmember' ? [{ key: 'rise', label: 'Rise', min: 50, max: 600, step: input?.rack?.pitch ?? 50 }] : part === 'offset-crossmember' ? [{ key: 'offset', label: 'Offset', min: 100, max: 350, step: 5 }] : [];
    return { family: 'frame', label: data.label, paired: false, slots: input && part.startsWith('crossmember-') ? input.connections.map(e => e.id) : [...data.slots], fields };
  }
  if (isFoot(part)) return { family: 'feet', label: part === 'foot-800' ? 'Long stabilizer foot' : 'Short stabilizer foot', paired: true, fixedHole: 0, faces: [...FACES], fields: [{ key: 'padDepth', label: 'Toe plate depth', min: 100, max: 300, step: 5 }] };
  if (!isAccessoryPart(part)) return null;
  if (isHook(part)) return { family: 'j-hooks', label: part.replaceAll('-', ' '), paired: true, faces: [...FACES], fields: [] };
  if (isSafety(part)) return { family: 'safeties', label: part.replaceAll('-', ' '), paired: true, faces: ['left', 'right'], fields: part === 'safety-webbing' ? [{ key: 'sag', label: 'Strap sag', min: 10, max: 100, step: 5 }] : [] };
  return { family: 'pullups', label: part.replaceAll('-', ' '), paired: false, faces: ['left', 'right'], ...(isWidePullup(part) ? { fixedHole: upperHole(input?.rack ?? RACK_DEFAULTS) + 1 } : {}), fields: [{ key: 'diameter', label: 'Grip diameter', min: 15, max: 60, step: 1 }] };
}
/** Initial pair choice for a new placement or reset: never a pair for unpairable parts. */
export function pairedByDefault(part: string, input?: RackDoc): boolean {
  const info = getPartPlacementInfo(part, input);
  return !!info?.paired && (info.defaultPaired ?? true);
}
export function replaceStructurePart(input: RackDoc, id: string, part: string, params: NumericParams = {}): RackDoc {
  const doc = validateAssembly(input), slot = structureSlots(doc).find(s => s.id === id);
  if (part === 'upright' && Object.hasOwn(doc.uprights, id)) return restoreInstance(doc, id);
  if (!slot || !FRAME_PARTS[part] || slot.part === 'upright' || (!part.startsWith('crossmember-') && !FRAME_PARTS[part].slots.includes(id))) fail('That part does not fit the selected frame connection.');
  if (slot.connectedTo.some(dep => doc.removed.includes(dep))) fail('Restore the connecting uprights first.');
  doc.structure[id] = { ...doc.structure[id], part: part as PartId, params: copy(params) }; doc.removed = doc.removed.filter(removed => removed !== id);
  return validateAssembly(doc);
}
export function createAssembly(overrides: Partial<RackDimensions> & { rack?: Partial<RackDimensions>; emptyAccessories?: boolean } = {}): RackDoc {
  const { emptyAccessories: _emptyAccessories, rack: rackOverrides, ...dimensions } = overrides;
  const rack = { ...RACK_DEFAULTS, ...(rackOverrides ?? dimensions) };
  const base = { version: 1, rack, removed: [], accessories: [], nextId: 1 };
  const result = validateAssembly(base);
  if (overrides.emptyAccessories) return result;
  const hookHole = Math.min(24, Math.floor((rack.height - 100 - rack.firstHole) / rack.pitch));
  const safetyHole = Math.min(12, hookHole - 3);
  result.accessories = [
    { id: 'pullup-front', part: 'pullup-straight', target: { uprightId: 'front-left', face: 'right', hole: pullupHole(rack) }, paired: false, params: {} },
    { id: 'jhooks-front', part: 'j-hook-standard', target: { uprightId: 'front-left', face: 'front', hole: hookHole }, paired: true, params: {} },
    { id: 'safeties', part: 'safety-box', target: { uprightId: 'front-left', face: 'right', hole: Math.max(2, safetyHole) }, paired: true, params: {} },
  ];
  return validateAssembly(result);
}
export function defaultAccessoryTarget(doc: RackDoc, part: string, uprightId = 'front-left'): Target {
  if (isRackPart(part)) return { uprightId, face: rackPreferredFace(doc, part, uprightId), hole: rackDefaultHole(part, doc.rack) };
  const defaultHole = isFoot(part) ? 0 : isPullup(part) ? pullupHole(doc.rack) : isSafety(part) ? 12 : 24;
  return { uprightId, face: isPullup(part) || isSafety(part) ? (sideOf(uprightId) === 'left' ? 'right' : 'left') : 'front', hole: Math.min(defaultHole, maxHole(doc.rack) - 2) };
}
export function addAccessory(input: RackDoc, part: string, target: Partial<Target> = {}, paired = true, params: NumericParams = {}): RackDoc {
  const doc = validateAssembly(input);
  if (!isAccessoryPart(part)) fail(`No rack connection adapter for ${part}.`);
  const uprightId = target.uprightId ?? 'front-left';
  const defaultTarget = defaultAccessoryTarget(doc, part, uprightId);
  let id: string; do { id = `accessory-${doc.nextId++}`; } while (doc.accessories.some(a => a.id === id) || Object.hasOwn(doc.uprights, id) || doc.connections.some(e => e.id === id));
  doc.accessories.push({ id, part: part as PartId, target: { ...target, uprightId, face: target.face ?? defaultTarget.face, hole: target.hole ?? defaultTarget.hole } as Target, paired: supportsPair(part) ? paired : false, params: copy(params) });
  return validateAssembly(doc);
}
export function moveAccessory(input: RackDoc, id: string, target: Partial<Target>, paired?: boolean): RackDoc {
  const doc = validateAssembly(input), ownerId = id.split(':')[0];
  const a = doc.accessories.find(a => a.id === ownerId); if (!a) fail('Select an accessory to move.');
  if (target.uprightId && target.uprightId !== a.target.uprightId && UPRIGHT_IDS.includes(target.uprightId)) { delete a.spanTo; delete a.pairTo; delete a.pairedSpanTo; }
  if (target.orientation !== undefined) a.rotation = target.orientation;
  delete a.target.orientation;
  // A plain upright target (no kind) replaces a rail or hosted target outright instead of merging into it.
  if (!('kind' in target) && 'face' in target && 'hole' in target && !isUprightTarget(a.target)) { a.target = { uprightId: a.target.uprightId, face: a.target.face, hole: a.target.hole }; delete a.pairTarget; }
  a.target = { ...a.target, ...target } as Target; if (isRailTarget(a.target)) delete a.pairTarget; delete a.pairHost; if (paired !== undefined) a.paired = supportsPair(a.part) ? paired : false;
  if (!isHostedTarget(a.target)) { delete (a.target as { host?: string }).host; for (const key of ['unit', 'frame'] as const) delete (a.target as unknown as Record<string, unknown>)[key]; }
  return settleHosted(doc, ownerId);
}
export function unpairAccessory(input: RackDoc, id: string): RackDoc {
  const doc = validateAssembly(input), ownerId = id.split(':')[0];
  const a = doc.accessories.find(a => a.id === ownerId); if (!a) fail('Select a paired accessory.');
  if (!a.paired) return doc;
  const other = targetsFor(a)[1]; let secondId: string;
  do { secondId = `accessory-${doc.nextId++}`; } while (doc.accessories.some(x => x.id === secondId) || Object.hasOwn(doc.uprights, secondId) || doc.connections.some(e => e.id === secondId));
  for (const overrides of [doc.appearance?.overrides, doc.appearance?.finishOverrides]) {
    if (!overrides) continue;
    const targets = [a.target, other];
    const suffix = (index: number) => pairSuffix(targets, index);
    const first = overrides[`${a.id}:${suffix(0)}`];
    const second = overrides[`${a.id}:${suffix(1)}`];
    if (first) overrides[a.id] = first;
    if (second) overrides[secondId] = second;
    delete overrides[`${a.id}:left`]; delete overrides[`${a.id}:right`];
  }
  a.paired = false;
  const second = { ...a, id: secondId, target: { ...other }, ...(a.pairedSpanTo ? { spanTo: a.pairedSpanTo } : {}), params: { ...a.params } };
  delete second.pairTarget; delete a.pairTarget; delete second.pairHost; delete a.pairHost; delete second.pairTo; delete second.pairedSpanTo; delete a.pairTo; delete a.pairedSpanTo;
  doc.accessories.push(second);
  // Parts mounted on the second unit (#178) move with it to the new accessory.
  for (const h of hostedOn(doc.accessories, a.id)) {
    if (isHostedTarget(h.target) && h.target.unit === 1) h.target = { ...h.target, host: secondId, unit: 0 };
    if (h.pairHost?.unit === 1) h.pairHost = { ...h.pairHost, host: secondId, unit: 0 };
  }
  return validateAssembly(doc);
}
/** Replace a storage pin's plate stack (root outward); both sides of a pair carry it. */
export function setPlateStack(input: RackDoc, id: string, plates: readonly PlateId[]): RackDoc {
  const doc = validateAssembly(input), a = doc.accessories.find(a => a.id === id.split(':')[0]);
  if (!a || !holdsPlates(a.part)) fail('Select a weight storage pin to load plates.');
  if (plates.length) a.plates = [...plates]; else delete a.plates;
  return validateAssembly(doc);
}
export function removeInstance(input: RackDoc, id: string): RackDoc {
  if (input.floorItems?.some(item => item.id === id)) return validateAssembly({ ...input, floorItems: input.floorItems.filter(item => item.id !== id) });
  // A panel takes its hung attachments with it; hung attachments are removed on their own.
  if (input.wallItems?.some(item => item.id === id)) return validateAssembly({ ...input, wallItems: input.wallItems.filter(item => item.id !== id), ...(input.hangItems ? { hangItems: input.hangItems.filter(h => h.panel !== id) } : {}) });
  if (input.hangItems?.some(item => item.id === id)) return validateAssembly({ ...input, hangItems: input.hangItems.filter(item => item.id !== id) });
  const doc = validateAssembly(input), ownerId = id.split(':')[0];
  if (structureSlots(doc).some(slot => slot.id === ownerId)) {
    const removed = new Set(doc.removed); removed.add(ownerId);
    for (const slot of structureSlots(doc)) if (slot.connectedTo.some(dep => removed.has(dep))) removed.add(slot.id);
    doc.removed = [...removed];
    doc.accessories = doc.accessories.filter(a => dependencies(a).every(dep => !removed.has(dep)));
  } else doc.accessories = doc.accessories.filter(a => a.id !== ownerId);
  pruneHosted(doc);
  if (doc.systems) doc.systems = doc.systems.filter(system => {
    if (system.id === ownerId) return false;
    if (!structureSlots(doc).some(slot => slot.id === ownerId)) return true;
    // Keep independent systems whose supported topology survives this removal.
    try { validateSystems(doc, [system]); return true; } catch { return false; }
  });
  return validateAssembly(doc);
}
/** Drops hosted parts (#178) whose host accessory is gone or no longer offers their station (removed, unpaired, swapped
 * to a part without that tube or bar), repeatedly. Mutates and returns `doc`. */
export function pruneHosted<T extends Pick<RackDoc, 'rack' | 'uprights' | 'removed' | 'accessories'>>(doc: T): T {
  for (let changed = true; changed;) {
    changed = false;
    doc.accessories = doc.accessories.filter(a => {
      if (!isHostedTarget(a.target)) return true;
      try { validateHostedMount(doc, a); return true; } catch { changed = true; return false; }
    });
  }
  return doc;
}
/** Validates an edited document; when the edit left hosted parts (#178) without their host station (a host moved to a
 * face, pairing or variant that no longer offers it), those parts are dropped. The accessory being edited never is. */
function settleHosted(doc: RackDoc, editedId?: string): RackDoc {
  try { return validateAssembly(doc); } catch (error) {
    const hosted = doc.accessories.filter(a => isHostedTarget(a.target) && a.id !== editedId);
    if (!hosted.length) throw error;
    const base = validateAssembly({ ...doc, accessories: doc.accessories.filter(a => !hosted.includes(a)) });
    const kept = hosted.filter(h => { try { validateAssembly({ ...base, accessories: [...base.accessories, h] }); return true; } catch { return false; } });
    return validateAssembly({ ...base, accessories: [...base.accessories, ...kept] });
  }
}
export function restoreInstance(input: RackDoc, id: string): RackDoc {
  const doc = validateAssembly(input), slot = structureSlots(doc).find(slot => slot.id === id);
  if (!slot) fail('Unknown structural slot.');
  if (slot.connectedTo.some(dep => doc.removed.includes(dep))) fail('Restore the connecting uprights first.');
  doc.removed = doc.removed.filter(removed => removed !== id); return validateAssembly(doc);
}
export function getAvailableStructure(input: RackDoc): { id: string; part: PartId }[] {
  const doc = validateAssembly(input);
  return structureSlots(doc).filter(slot => doc.removed.includes(slot.id) && slot.connectedTo.every(id => !doc.removed.includes(id))).map(slot => ({ id: slot.id, part: slot.part }));
}
export function resizeAssembly(input: RackDoc, patch: Partial<RackDimensions>): RackDoc {
  const doc = validateAssembly(input);
  if (!isRecord(patch) || Object.keys(patch).some(key => !(key in RACK_DEFAULTS))) fail('Unsupported rack dimension.');
  const previous = doc.rack;
  doc.rack = snapDimensions(doc.rack, patch, doc.profileId);
  for (const node of Object.values(doc.uprights)) {
    const shift = (value: number, before: number, after: number) => value <= -before ? value-(after-before) : value >= before ? value+(after-before) : value*after/before;
    node.x = shift(node.x,(previous.width+previous.tube)/2,(doc.rack.width+doc.rack.tube)/2);
    node.y = shift(node.y,(previous.depth+tubeDepthOf(previous))/2,(doc.rack.depth+tubeDepthOf(doc.rack))/2);
    if (node.height !== undefined && node.height >= doc.rack.height) delete node.height;
  }
  // Validate dimensions before using them in arithmetic; adapt placements only after.
  validateAssembly({ ...doc, accessories: [] });
  for (const a of doc.accessories) {
    if (a.part === 'pullup-straight' && a.target.hole === pullupHole(input.rack)) a.target.hole = pullupHole(doc.rack);
    if (isWidePullup(a.part)) a.target.hole = upperHole(doc.rack) + Math.round(50 / doc.rack.pitch);
  }
  return validateAssembly(doc);
}
export function getMounts(input: RackDoc, part?: string, params: NumericParams = {}): Mount[] {
  const doc = validateAssembly(input), result: Mount[] = [];
  if (part && isDarkoTop(part)) return darkoTopMounts(doc);
  if (part !== undefined && !isAccessoryPart(part)) return result;
  // Registry parts on crossmember rails (top or underside): every rail station that validates as a full candidate.
  const tops = part && isRackPart(part) ? rackRailMounts(doc, part).filter(m => {
    if (!isRailTarget(m)) return false;
    const target = { kind: m.kind, connectionId: m.connectionId, station: m.station, side: m.side, uprightId: m.uprightId, face: m.face, hole: 0 };
    try { validateAssembly({ ...doc, accessories: [{ id: 'mount-preview', part: part as PartId, target, paired: false, params }] }); return true; } catch { return false; }
  }) : [];
  // Registry parts on other accessories (#178): every host station that validates alongside the existing accessories.
  if (part && isRackPart(part) && rackTargets(rackPart(part)!).some(k => k === 'spotter-arm' || k === 'pull-up-bar')) {
    tops.push(...hostedCandidates(doc, part).filter(m => {
      if (!isHostedTarget(m)) return false;
      const target = { kind: m.kind, host: m.host, unit: m.unit, frame: m.frame, station: m.station, uprightId: m.uprightId, face: m.face, hole: 0 };
      try { validateAssembly({ ...doc, accessories: [...doc.accessories, { id: 'mount-preview', part: part as PartId, target, paired: false, params }] }); return true; } catch { return false; }
    }));
  }
  if (part && isRackPart(part) && !rackTargets(rackPart(part)!).includes('upright')) return tops;
  if (part && isWidePullup(part)) {
    if (doc.rack.pitch !== 50 || doc.rack.depth < (part === 'pullup-sphere' ? 425 : 375) || ['left-upper-crossmember', 'right-upper-crossmember'].some(id => doc.removed.includes(id) || doc.structure[id]?.part === 'angled-crossmember')) return result;
    const hole = upperHole(doc.rack) + 1;
    for (const id of Object.keys(doc.uprights)) if (!doc.removed.includes(id) && !doc.removed.includes(otherSide(id))) {
      const m = mount({ ...doc.rack, uprights: doc.uprights }, id, hole, sideOf(id) === 'left' ? 'right' : 'left');
      m.position[1] = m.center[1] = (rowOf(id) === 'front' ? -1 : 1) * (doc.rack.depth / 2 - 62.5);
      result.push({ ...m, label: 'Upper side rails', connectorId: `${sideOf(id)}-upper-crossmember` });
    }
    return result;
  }
  // Coarser side-face drilling (e.g. Titan 6-inch side holes) limits side-mounted parts; spanning bars and safeties pin through their own stations.
  const stride = gridProfile(doc.profileId).sideStride ?? 1, spanning = !!part && (isSafety(part) || isPullup(part));
  for (const id of Object.keys(doc.uprights)) if (!doc.removed.includes(id)) for (let hole = 0; hole <= maxHoleAt(doc.rack, doc.uprights[id]); hole += doc.rack.benchSpacing ? 0.5 : 1) for (const face of FACES) {
    if (stride > 1 && !spanning && (face === 'left' || face === 'right') && !Number.isInteger(hole / stride)) continue;
    if (validHole(doc.rack, hole, face)) result.push(mount({ ...doc.rack, uprights: doc.uprights }, id, hole, face));
  }
  if (!part) return result;
  return [...tops, ...result.filter(m => {
    const candidate = { id: 'mount-preview', part, target: { uprightId: m.uprightId, face: m.face, hole: m.hole }, paired: false, params };
    try { validateAssembly({ ...doc, accessories: [candidate] }); return true; } catch { return false; }
  })];
}
/** Safety saddles on a non-75 mm upright: `upright` is the tube across the safety, `uprightSpan` along it, plus the rack's
 * pin class and bore (mount-fit.ts). A saved pin-and-pipe pinDiameter wins. Empty on 75 mm racks. */
function safetyFit(rack: RackDimensions, a: Accessory, across: number, along: number): NumericParams {
  const fit = rackMountFit(rack, 'left');
  if (!fit) return {};
  return { upright: across, uprightSpan: along, rackHole: rack.holeDiameter, ...(a.part === 'safety-pin-pipe' ? { pinDiameter: a.params.pinDiameter ?? fit.pin } : { rackPin: fit.pin }) };
}
/** Resolve every connection against the current rack dimensions and source origins. */
export function resolveAssembly(input: RackDoc): ResolvedInstance[] {
  const doc = validateAssembly(input), r = { ...doc.rack, uprights: doc.uprights }, result: ResolvedInstance[] = [...resolveFloorItems(doc.floorItems), ...resolveWallItems(doc.wallItems, doc.room), ...resolveHangItems(doc)];
  const append = (id: string, part: PartId, params: NumericParams, position: Vec3, angle: number, mounts: Mount[], kind: ResolvedInstance['kind'], ownerId = id, paired = false, connectedTo: string[] = []) => {
    result.push({ ...(doc.logo && logoSite(part) ? { logo: doc.logo } : {}), id, part, params, position, rotation: [0, 0, angle], mount: mounts[0] ?? null, mounts, ownerId, kind, paired, connectedTo });
  };
  const profile = gridProfile(doc.profileId);
  for (const id of Object.keys(doc.uprights)) if (!doc.removed.includes(id)) {
    const node = doc.uprights[id], vendorBase = !!profile.base && profile.base.style !== 'plate';
    // Vendor bases are handed by the post's side of the rack so outward plates and inward floor bars stay outside/inside.
    const angle = (vendorBase ? node.x > 0 : sideOf(id) === 'right') ? Math.PI : 0, center = postCenter(r, id), offset = rotateZ([15, 0, 0], angle);
    const params: NumericParams = { height: uprightHeight(r, node), width: r.tube, wall: 3, cornerRadius: 3, holeDiameter: r.holeDiameter, spacing: r.pitch, firstHole: r.firstHole, benchStart: r.benchStart ?? r.firstHole, benchEnd: r.benchEnd ?? r.height, benchSpacing: r.benchSpacing ?? r.pitch, baseWidth: 105, baseDepth: 135, baseThickness: 8 };
    Object.assign(params, uprightFrameParams(doc, id, profile, angle));
    append(id, 'upright', params, center.map((v, i) => v - offset[i]) as Vec3, angle, [mount(r, id, 0, 'front', [15, 0, r.firstHole])], 'structure');
  }
  for (const slot of structureSlots(doc).filter(s => s.part !== 'upright')) if (!doc.removed.includes(slot.id) && slot.connectedTo.every(id => !doc.removed.includes(id))) {
    const variant = doc.structure[slot.id] ?? { part: slot.part, params: {} }, framePart = variant.part;
    const settings = { ...FRAME_PARTS[framePart].defaults, ...variant.params };
    const edge = doc.connections.find(e => e.id === slot.id)!;
    const a = postCenter(r, edge.from), b = postCenter(r, edge.to);
    const rear = a[1] === b[1], high = edge.level === 'upper';
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]) - tubeAlong(r, b[0] - a[0], b[1] - a[1]);
    // Flange bolts sit on real stations: 150 mm on the 50 mm source grid, 50.8 mm × 2 or 76.2 mm × 1 on vendor lattices.
    // Left-right beams bolt into side faces, which may only be drilled every `sideStride` stations.
    const stride = rear ? profile.sideStride ?? 1 : 1;
    const flangeHeight = framePart === 'branded-crossmember' ? 300 : 50 + Math.max(stride, Math.round(100 / r.pitch), 1) * r.pitch;
    const edgeHeight = Math.min(uprightHeight(r, doc.uprights[edge.from]), uprightHeight(r, doc.uprights[edge.to]));
    const rise = framePart === 'angled-crossmember' ? settings.rise : 0;
    const upper = Math.floor((edgeHeight - 25 - r.firstHole) / r.pitch) - Math.round((flangeHeight - 50 + rise) / r.pitch);
    const hole = high ? Math.floor(upper / stride) * stride : systemLowerCrossmemberStation(doc,edge.from,edge.to);
    const side = slot.id.startsWith('right') ? 'right' : 'left';
    const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
    const params: NumericParams = { length: span, width: r.tube, wall: 3, holeDiameter: r.holeDiameter, spacing: r.pitch, plateThickness: 6, plateHeight: flangeHeight };
    if (r.pitch !== 50) params.boltDiameter = r.holeDiameter - 0.8;
    if (framePart === 'profile-nameplate') Object.assign(params, nameplateParams(profile));
    if (rise) params.rise = rise;
    if (framePart.startsWith('branded-')) params.panelHeight = flangeHeight;
    if (framePart === 'offset-crossmember') { params.length = 1225 * (span + r.tube) / 1150; params.offset = settings.offset; }
    const mounts = slot.connectedTo.map((id, i) => mount(r, id, hole + (rise && !i ? Math.round(rise / r.pitch) : 0), framePart === 'offset-crossmember' ? 'front' : rear ? (b[0] > a[0] ? (i ? 'left' : 'right') : (i ? 'right' : 'left')) : (b[1] > a[1] ? (i ? 'front' : 'back') : (i ? 'back' : 'front')), [i ? params.length / 2 : -params.length / 2, 0, 25 + (rise && !i ? rise : 0)]));
    const position: Vec3 = [x, y, holeZ(r, hole) - 25];
    if (framePart === 'offset-crossmember') {
      const flangeY = 61.484 * (settings.offset / 193.5) + 6;
      position[1] -= r.tube / 2 + flangeY;
      mounts.forEach((m, i) => { m.localAnchor = [(i ? 1 : -1) * (span + r.tube) / 2, flangeY, 25]; });
    }
    if (framePart === 'nameplate') {
      append(`${slot.id}:beam`, slot.part, params, position, 0, mounts, 'structure', slot.id, false, slot.connectedTo);
      const panelParams = { length: span, height: 175, thickness: 5.0524, holeDiameter: r.holeDiameter };
      append(slot.id, 'nameplate', panelParams, [x, y, position[2] + 37.5 - 225], 0, mounts, 'structure', slot.id, false, slot.connectedTo);
      result[result.length - 1].collisionEnabled = true;
    } else {
      append(slot.id, framePart, params, position, angle, mounts, 'structure', slot.id, false, slot.connectedTo);
      if (['branded-crossmember', 'offset-crossmember'].includes(framePart)) result[result.length - 1].collisionEnabled = true;
    }
  }
  for (const a of doc.accessories) {
    const defaults = isVendorPart(a.part) ? vendorDefaults(a.part) : SOURCE_DEFAULTS[a.part], params = { ...defaults, ...a.params };
    if (isVendorPart(a.part)) {
      result.push(...resolveVendor(doc, a, targetsFor(a).map(t=>orientedMountTarget(t,accessoryRotation(a)))));
    } else if (isRackPart(a.part) && isHostedTarget(a.target)) {
      continue;
    } else if (isRackPart(a.part)) {
      result.push(...resolveRack(doc, a, targetsFor(a).map(t=>orientedMountTarget(t,accessoryRotation(a)))));
    } else if (a.spanTo) {
      for (const [index, t] of targetsFor(a).entries()) {
      const endpoint = index ? a.pairedSpanTo! : a.spanTo;
      const start = postCenter(r, t.uprightId), end = postCenter(r, endpoint);
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const clear = Math.hypot(end[0] - start[0], end[1] - start[1]) - tubeAlong(r, end[0] - start[0], end[1] - start[1]);
      const z = a.part === 'pullup-straight' ? 25 : a.part === 'safety-box' ? 137.5 : a.part === 'safety-webbing' ? 158 : 100;
      const faces: [Face, Face] = Math.abs(end[0]-start[0]) > 0 ? (end[0] > start[0] ? ['right','left'] : ['left','right']) : (end[1] > start[1] ? ['back','front'] : ['front','back']);
      const anchorSpan = a.part === 'pullup-straight' ? clear : clear + tubeAlong(r, end[0] - start[0], end[1] - start[1]);
      const mounts = [t.uprightId, endpoint].map((id, i) => mount(r, id, t.hole, faces[i], [(i ? 1 : -1) * anchorSpan / 2, 0, z]));
      append(a.paired ? `${a.id}:${pairSuffix(targetsFor(a), index)}` : a.id, a.part, { ...params, mountSpacing: faces[0] !== 'front' && faces[0] !== 'back' && (profile.sideStride ?? 1) > 1 ? profile.sideStride! * r.pitch : r.pitch === 50 ? 200 : Math.max(1, Math.round(200 / r.pitch)) * r.pitch, boltDiameter: r.pitch === 50 ? 16 : r.holeDiameter-0.8, holeDiameter: r.holeDiameter, length: clear - (isSafety(a.part) && a.part !== 'safety-pin-pipe' ? 6 : 0), upright: r.tube, ...(isSafety(a.part) ? safetyFit(r, a, ...(Math.abs(end[0]-start[0]) > 0 ? [tubeDepthOf(r), r.tube] : [r.tube, tubeDepthOf(r)]) as [number, number]) : {}) }, [(start[0]+end[0])/2, (start[1]+end[1])/2, holeZ(r,a.target.hole)-z], angle, mounts, 'accessory', a.id, a.paired, [t.uprightId,endpoint]);
      }
    } else if (isMountedAttachment(a.part)) {
      for (const [index, t] of targetsFor(a).entries()) {
        const fit = rackMountFit(r, t.face), anchor = getAttachmentAnchor(a.part, params, fit), normal = NORMALS[t.face], angle = Math.atan2(normal[1], normal[0]) - Math.atan2(anchor.outward[1], anchor.outward[0]);
        const rotation = shaftRotation(angle, accessoryRotation(a));
        const m = mount(r, t.uprightId, t.hole, t.face, anchor.point), local = rotateMountedPoint(anchor.point, rotation);
        const mounts = anchor.boltStations.map(station => ({ ...mount(r, t.uprightId, t.hole + Math.round(station.zOffset / r.pitch), t.face, station.point), pinAxis: rotateZ(station.axis, angle) }));
        append(a.paired ? `${a.id}:${pairSuffix(targetsFor(a), index)}` : a.id, a.part, { ...params, holeDiameter: r.holeDiameter, ...plateParams(a.plates), ...fitParams(fit) }, m.center.map((v, i) => v - local[i]) as Vec3, angle, mounts, 'accessory', a.id, a.paired, [t.uprightId]);
        result[result.length - 1].rotation = rotation;
        result[result.length - 1].collisionBoxes = getAttachmentCollisionBoxes(a.part, params, fit);
        result[result.length - 1].localOutward = anchor.outward;
      }
    } else if (isFoot(a.part)) {
      const anchor: Vec3 = [0, a.part === 'foot-800' ? -314.5 : -139.5, 65];
      for (const [index, t] of targetsFor(a).entries()) {
        const angle = ROTATIONS[t.face], m = mount(r, t.uprightId, 0, t.face, anchor), local = rotateZ(anchor, angle);
        append(a.paired ? `${a.id}:${pairSuffix(targetsFor(a), index)}` : a.id, a.part, { ...params, holeDiameter: r.holeDiameter }, m.position.map((v, i) => v - local[i]) as Vec3, angle, [m], 'accessory', a.id, a.paired, [t.uprightId]);
      }
    } else if (isHook(a.part)) {
      for (const [index, t] of targetsFor(a).entries()) {
        const fit = rackMountFit(r, t.face), angle = ROTATIONS[t.face], anchor = hookAnchor(a.part, fit), m = mount(r, t.uprightId, t.hole, t.face, anchor), local = rotateZ(anchor, angle);
        append(a.paired ? `${a.id}:${pairSuffix(targetsFor(a), index)}` : a.id, a.part, { ...params, holeDiameter: r.holeDiameter, ...fitParams(fit) }, m.center.map((v, i) => v - local[i]) as Vec3, angle, [m], 'accessory', a.id, a.paired, [t.uprightId]);
        if (fit) result[result.length - 1].collisionBoxes = hookCollisionBoxes(a.part, fit);
      }
    } else if (isSafety(a.part)) {
      for (const [index, t] of targetsFor(a).entries()) {
        const side = sideOf(t.uprightId), x = postCenter(r, `front-${side}`)[0], z = a.part === 'safety-box' ? 137.5 : a.part === 'safety-webbing' ? 158 : 100;
        const span = (r.depth + tubeDepthOf(r)) / 2;
        const mounts = (['front', 'rear'] as const).map((row, i) => mount(r, `${row}-${side}`, t.hole, row === 'front' ? 'back' : 'front', [(i ? 1 : -1) * span, 0, z]));
        append(a.paired ? `${a.id}:${side}` : a.id, a.part, { ...params, length: r.depth - (a.part === 'safety-pin-pipe' ? 0 : 6), upright: r.tube, ...safetyFit(r, a, r.tube, tubeDepthOf(r)) }, [x, 0, holeZ(r, t.hole) - z], Math.PI / 2, mounts, 'accessory', a.id, a.paired, mounts.map(m => m.uprightId));
      }
    } else {
      const row = rowOf(a.target.uprightId), y = postCenter(r, `${row}-left`)[1];
      let mounts = (['left', 'right'] as const).map((side, i) => mount(r, `${row}-${side}`, a.target.hole, i ? 'left' : 'right', [(i ? 1 : -1) * r.width / 2, 0, a.part === 'pullup-straight' ? 25 : 30]));
      // Source sphere grips extend along +Y. Turn front mounts around the
      // asymmetric plate center so grips face the user without moving rail holes.
      const angle = a.part === 'pullup-sphere' && row === 'front' ? Math.PI : 0;
      const direction = angle ? -1 : 1;
      let yy = y, zz = holeZ(r, a.target.hole) - 25;
      if (a.part !== 'pullup-straight') {
        // These wide plates bolt to the upper depth rails, not one upright hole.
        // Their four bolts follow the rail's 50 mm stations across a 250/300 mm span.
        const sy = a.part === 'pullup-sphere' ? (params.projection / 190) : (params.projection / 170);
        yy = (row === 'front' ? -1 : 1) * (r.depth / 2 - 62.5 - (a.part === 'pullup-sphere' ? 150 : 125) * sy);
        if (a.part === 'pullup-sphere') yy += direction * 46.194 * sy;
        zz = holeZ(r, upperHole(r)) + 50 - 30;
        const stations = a.part === 'pullup-sphere' ? [-196.194 * sy, 103.806 * sy] : [-125 * sy, 125 * sy];
        mounts = (['left', 'right'] as const).flatMap((side, i) => stations.map(yStation => {
          const localAnchor: Vec3 = [direction * (i ? 1 : -1) * r.width / 2, yStation, 30];
          const m = mount(r, `${row}-${side}`, a.target.hole, i ? 'left' : 'right', localAnchor);
          m.center[1] = m.position[1] = yy + direction * yStation;
          return { ...m, label: 'Upper side rails', connectorId: `${side}-upper-crossmember` };
        }));
      }
      append(a.id, a.part, { ...params, length: r.width }, [0, yy, zz], angle, mounts, 'accessory', a.id, false, dependencies(a));
    }
  }
  // Hosted parts (#178) ride on their resolved host instance.
  for (const a of doc.accessories) if (isRackPart(a.part) && isHostedTarget(a.target)) result.push(...resolveHosted(doc, a));
  result.push(...resolveSystems(doc));
  parkBarbells(result, doc.floorItems);
  return result;
}

/** Preview callers stage this document and commit once; this function never mutates input. */
export function setAccessoryRotation(input: RackDoc, id: string, radians: number): RackDoc {
  const doc=validateAssembly(input), a=doc.accessories.find(a=>a.id===id.split(':')[0]);
  if(!a) throw Error('Select an accessory to rotate.');
  a.rotation=radians;
  delete a.target.orientation;
  if(a.pairTarget) delete a.pairTarget.orientation;
  return validateAssembly(doc);
}
export function rotateAccessory(input: RackDoc, id: string, deltaDegrees: number): RackDoc {
  const a=input.accessories.find(a=>a.id===id.split(':')[0]);
  if(!a) throw Error('Select an accessory to rotate.');
  return setAccessoryRotation(input,id,accessoryRotation(a)+deltaDegrees*Math.PI/180);
}
export function rotationMode(doc: RackDoc, id: string) {
  const a=doc.accessories.find(a=>a.id===id.split(':')[0]);
  return a ? mountedRotationMode(a) : {kind:'fixed' as const,supported:false,step:0,label:'No mounted selection',reason:'Select a mounted attachment.'};
}
export function previewAccessoryRotation(input: RackDoc, id: string, radians: number) {
  try {
    const doc=setAccessoryRotation(input,id,radians), all=resolveAssembly(doc), instances=all.filter(i=>i.ownerId===id.split(':')[0]);
    const ids=new Set(instances.map(i=>i.id)), warnings=detectCollisions(all).filter(w=>w.ids.some(id=>ids.has(id)));
    return {valid:true as const,doc,instances,warnings,error:undefined};
  } catch(error) { return {valid:false as const,error:(error as Error).message,warnings:[]}; }
}
