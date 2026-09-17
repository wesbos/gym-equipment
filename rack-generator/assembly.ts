import { systemLowerCrossmemberStation } from "./cable-stations.ts";
import { validateSystems, resolveSystems } from './systems.ts';
import { validateLogo, logoSite } from './logos/types.ts';
import { pairSuffix } from './physical-identity.ts';
import { darkoTopMounts, darkoTopMount, matchingDarkoTarget } from './darko-mounts.ts';
import { isVendorPart, vendorDefaults, vendorPlacement, vendorLimits, validateVendorParams, validateVendorMount, resolveVendor } from './vendor-mounts.ts';
import { VOLTRA_IDS, DARKO_IDS, isDarkoTop } from './vendor-metadata.ts';
import { validateMountShaft } from './mount-shafts.ts';
import { gridProfile } from './profiles.ts';
import { legacyGraph, validateGraph, structureSlots } from './topology.ts';
import { snapDimensions } from './grid.ts';
import { validateAppearance } from './appearance.ts';
import type { RackDoc, RackDimensions, Accessory, Target, Mount, ResolvedInstance, Vec3, NumericParams, PartId, Face, UprightId, StructureSlot, StructureVariant, PlacementInfo } from './types.ts';
import { attachmentPartIds, getAttachmentDefaults, getAttachmentPlacementInfo, getAttachmentAnchor, getAttachmentCollisionBoxes } from './attachment-mounts.ts';

/** Connection-based rack document. Coordinates are millimetres, Z up; angles radians.
 * Width/depth are clear distances between upright inner faces. Hole numbers are
 * zero-based station indices. This module is pure and does not generate geometry.
 */
export const ASSEMBLY_VERSION = 2;
export const RACK_DEFAULTS: Readonly<RackDimensions> = Object.freeze({ height: 2032, width: 1075, depth: 725, tube: 75, holeDiameter: 25, pitch: 50, firstHole: 65 });
export const UPRIGHT_IDS: readonly UprightId[] = Object.freeze(['front-left', 'front-right', 'rear-left', 'rear-right']);
export const FACES: readonly Face[] = Object.freeze(['front', 'back', 'left', 'right']);
export const ACCESSORY_PARTS = Object.freeze(['pullup-straight', 'pullup-multigrip', 'pullup-sphere', 'j-hook-standard', 'j-hook-roller', 'j-hook-sandwich', 'safety-box', 'safety-pin-pipe', 'safety-webbing', 'foot-400', 'foot-800', ...attachmentPartIds, ...VOLTRA_IDS, ...DARKO_IDS]);
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
  nameplate: { slots: ['rear-crossmember'], label: 'Nameplate panel and supporting rail', defaults: {} },
};
/** Detached defaults for editors; keep geometry and UI on one source of truth. */
export function getPartDefaults(part: string): NumericParams {
  if (isVendorPart(part)) return vendorDefaults(part);
  return { ...(FRAME_PARTS[part]?.defaults ?? SOURCE_DEFAULTS[part] ?? {}) };
}
// Midpoints of the actual retaining-pin cylinders in the generated part coordinates.
const HOOK_ANCHORS: Record<string, Vec3> = {
  'j-hook-standard': [8.753024654290442, -85.08286, 150.00177048395147],
  'j-hook-roller': [7.950296872119169, -42.38026, 149.9999016070705],
  'j-hook-sandwich': [8.748823188354173, -44.99326, 150.00005966760105],
};
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
const supportsPair = (part: string) => !isPullup(part) && (!isMountedAttachment(part) || getAttachmentPlacementInfo(part).paired);
const isWidePullup = (part: string) => isPullup(part) && part !== 'pullup-straight';
const rowOf = (id: string) => id.startsWith('rear-') ? 'rear' : 'front';
const sideOf = (id: string) => id.endsWith('-right') ? 'right' : 'left';
const otherSide = (id: string): UprightId => `${rowOf(id)}-${sideOf(id) === 'left' ? 'right' : 'left'}`;
const maxHole = (rack: RackDimensions) => Math.floor((rack.height - rack.holeDiameter / 2 - rack.firstHole) / rack.pitch);
const holeZ = (rack: RackDimensions, hole: number) => rack.firstHole + hole * rack.pitch;
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
  return [(sideOf(id) === 'left' ? -1 : 1) * (rack.width + rack.tube) / 2, (rowOf(id) === 'front' ? -1 : 1) * (rack.depth + rack.tube) / 2, 0];
}
function rotateZ(point: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [point[0] * c - point[1] * s, point[0] * s + point[1] * c, point[2]];
}
function mount(rack: RackDimensions & { uprights?: RackDoc["uprights"] }, uprightId: UprightId, hole: number, face: Face = 'front', localAnchor?: Vec3): Mount {
  const center = postCenter(rack, uprightId); center[2] = holeZ(rack, hole);
  const position = center.map((v, i) => v + NORMALS[face][i] * rack.tube / 2) as Vec3;
  return { uprightId, face, hole, position, center, ...(localAnchor ? { localAnchor: [...localAnchor] as Vec3 } : {}) };
}
function targetsFor(accessory: Accessory): Target[] {
  const targets = [accessory.target];
  if (accessory.target.kind === 'crossmember-top') return accessory.paired && accessory.pairTarget ? [...targets, accessory.pairTarget] : targets;
  if (accessory.paired) {
    const face = accessory.target.face;
    targets.push({ ...accessory.target, uprightId: accessory.pairTo ?? otherSide(accessory.target.uprightId), face: face === 'left' ? 'right' : face === 'right' ? 'left' : face });
  }
  return targets;
}
function dependencies(accessory: Accessory): string[] {
  if (accessory.target.kind === 'crossmember-top') return targetsFor(accessory).flatMap(t => t.kind === 'crossmember-top' ? [t.connectionId,t.uprightId] : []);
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
  if (isFoot(accessory.part)) return [0, 0];
  if (isMountedAttachment(accessory.part)) {
    const anchor = getAttachmentAnchor(accessory.part, accessory.params);
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
function validateParams(part: string, params: unknown): asserts params is NumericParams {
  if (!isRecord(params)) fail('Accessory parameters must be an object.');
  if (isVendorPart(part)) { validateVendorParams(part, params as NumericParams); return; }
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
  const rack: RackDimensions = { ...copy(r), height: r.height, width: r.width, depth: r.depth, tube: r.tube, holeDiameter: r.holeDiameter, pitch: r.pitch, firstHole: r.firstHole };
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
    validateMountShaft(variant.part, cleanParams, rack.holeDiameter);
    structure[id] = { ...copy(variant), part: variant.part as PartId, params: cleanParams };
  }
  const ids = new Set(slots.map(slot => slot.id));
  const accessories = input.accessories.map(a => {
    if (!isRecord(a) || typeof a.id !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(a.id) || ids.has(a.id)) fail('Accessory IDs must be unique and valid.');
    ids.add(a.id);
    if (typeof a.part !== 'string' || !ACCESSORY_PARTS.includes(a.part)) fail(`No rack connection adapter for ${a.part}.`);
    if (!isRecord(a.target) || typeof a.target.uprightId !== "string" || !Object.hasOwn(graph.uprights, a.target.uprightId) || !FACES.includes(a.target.face as Face) || typeof a.target.hole !== 'number' || !(Number.isInteger(a.target.hole) || validHole(rack, a.target.hole, a.target.face as Face))) fail(`Invalid connection target for ${a.id}.`);
    if (a.target.kind !== undefined && a.target.kind !== 'upright' && a.target.kind !== 'crossmember-top') fail('Unknown mount target kind.');
    if (a.target.kind === 'crossmember-top' && !isDarkoTop(a.part)) fail('This part requires an upright target.');
    if (!a.spanTo && (isSafety(a.part) || isPullup(a.part)) && a.target.face !== (sideOf(a.target.uprightId as UprightId) === 'left' ? 'right' : 'left')) fail('Spanning parts mount on the inward-facing connection of an upright.');
    if (typeof a.paired !== 'boolean' || !supportsPair(a.part) && a.paired) fail('This part is placed as one complete or handed assembly.');
    const params = a.params ?? {}; validateParams(a.part, params);
    if (isWidePullup(a.part)) {
      const original = legacyGraph(rack);
      if (UPRIGHT_IDS.some(id => !graph.uprights[id] || graph.uprights[id].x !== original.uprights[id].x || graph.uprights[id].y !== original.uprights[id].y) || original.connections.filter(e => e.id.includes('upper')).some(e => !graph.connections.some(current => current.id === e.id && current.from === e.from && current.to === e.to && current.level === e.level))) fail('Wide pull-up rail adapters require the original rectangular upper rails.');
    }
    if (isWidePullup(a.part) && (rack.pitch !== 50 || rack.depth < (a.part === 'pullup-sphere' ? 425 : 375))) fail('This pull-up plate requires 50 mm rail stations and enough clear depth for its full bolt span.');
    if (isWidePullup(a.part) && ['left-upper-crossmember', 'right-upper-crossmember'].some(id => structure[id]?.part === 'angled-crossmember')) fail('Wide pull-up plates require level upper side rails.');
    if (manufacturer && isFoot(a.part)) fail('BOS floor-foot bolt patterns are unavailable on this reconstructed profile.');
    if (isFoot(a.part) && rack.firstHole !== 65) fail('Floor-mounted feet require the first upright hole at 65 mm.');
    if (rack.tube !== 75 && (isMountedAttachment(a.part) || isHook(a.part) || isFoot(a.part))) fail('Source attachment sleeves require 75 mm uprights; no true 3-inch adapter is available.');
    if (isMountedAttachment(a.part)) {
      const anchor = getAttachmentAnchor(a.part, params);
      if (anchor.requiredPitch && anchor.requiredPitch !== rack.pitch) fail('This attachment requires 50 mm upright hole spacing for its full bolt pattern.');
      if (anchor.boltStations.some(station => Math.abs(station.zOffset / rack.pitch - Math.round(station.zOffset / rack.pitch)) > 0.001)) fail('The attachment bolt pattern does not align with these upright stations.');
    }
    validateMountShaft(a.part, params, rack.holeDiameter);
    const clean: Accessory = { ...copy(a), id: a.id, part: a.part as PartId, target: { ...copy(a.target), uprightId: a.target.uprightId as UprightId, face: a.target.face as Face, hole: a.target.hole }, paired: a.paired, params: { ...params } };
    if (isVendorPart(clean.part)) validateVendorMount({ rack, ...graph, removed, structure }, clean);
    if (clean.target.kind === 'crossmember-top') {
      if (!isDarkoTop(clean.part)) fail('This part requires an upright target.');
      if (clean.paired && !clean.pairTarget) clean.pairTarget = matchingDarkoTarget({rack,...graph,removed,structure},clean.target);
      if (clean.paired && !clean.pairTarget) fail('Choose a parallel crossmember for the matching pair.');
      if (clean.pairTarget) {
        if (clean.pairTarget.kind !== 'crossmember-top' || clean.pairTarget.connectionId === clean.target.connectionId) fail('Choose a distinct matching crossmember.');
        const m = darkoTopMount({rack,...graph,removed,structure},clean.target), n = darkoTopMount({rack,...graph,removed,structure},clean.pairTarget);
        const v = n.center.map((x,i) => x-m.center[i]);
        if (Math.abs(v[2])>.01 || Math.hypot(v[0],v[1])<rack.tube || Math.abs(v[0]*m.pinAxis![1]-v[1]*m.pinAxis![0])>.01 || Math.abs(m.pinAxis![0]*n.pinAxis![1]-m.pinAxis![1]*n.pinAxis![0])>.01) fail('Paired Darko cradles must align across parallel rails at equal heights.');
      }
    } else if (clean.pairTarget) fail('Crossmember pair target requires a crossmember-mounted part.');
    if (clean.target.kind !== 'crossmember-top' && clean.paired && !clean.pairTo && UPRIGHT_IDS.includes(clean.target.uprightId)) clean.pairTo = otherSide(clean.target.uprightId);
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
    if (clean.paired && !clean.pairTo && clean.target.kind !== 'crossmember-top') fail('Choose an explicit matching upright for this pair.');
    if ((isSafety(clean.part) || clean.part === 'pullup-straight') && !clean.spanTo) fail('Choose an explicit span endpoint for this upright.');
    if (clean.spanTo) {
      if (!(isSafety(clean.part) || clean.part === 'pullup-straight')) fail('Explicit spans require a safety or straight pull-up bar.');
      if (clean.paired && !clean.pairedSpanTo) fail('Paired spans require explicit second endpoints.');
      const p = graph.uprights[clean.target.uprightId], q = graph.uprights[clean.spanTo];
      if ((p.x !== q.x && p.y !== q.y) || Math.hypot(q.x-p.x, q.y-p.y) < rack.tube + 300 || Math.hypot(q.x-p.x, q.y-p.y) > rack.tube + 3000) fail('Spanning endpoints must be axis aligned and at least 300 mm apart.');
    }
    if (clean.spanTo) {
      const p = graph.uprights[clean.target.uprightId], q = graph.uprights[clean.spanTo];
      const spanFace: Face = p.x === q.x ? 'front' : 'left';
      if (!validHole(rack,clean.target.hole,spanFace)) fail('The span requires real holes on its mounting faces.');
    }
    const [min, max] = accessoryLimits(rack, clean);
    if (!isWidePullup(clean.part) && (clean.target.hole < min || clean.target.hole > max)) fail(`${a.part} fits hole numbers ${min + 1}–${max + 1} at this rack height.`);
    if (isWidePullup(clean.part)) clean.target.hole = upperHole(rack) + Math.round(50 / rack.pitch);
    for (const id of dependencies(clean)) if (!slots.some(s => s.id === id) || removed.includes(id)) fail(`${a.id} depends on removed ${id}.`);
    return clean;
  });
  if (typeof input.nextId !== 'number' || !Number.isSafeInteger(input.nextId) || input.nextId < 1 || input.nextId > 1000000) fail('Invalid next accessory ID.');
  const appearance = validateAppearance(input.appearance);
  const systems = validateSystems({ ...input, ...graph, rack, removed, structure, accessories } as RackDoc, input.systems);
  const logo = validateLogo(input.logo);
  return { ...copy(input), ...(logo ? { logo } : {}), ...(appearance ? { appearance } : {}), ...graph, ...(systems ? { systems } : {}), version: ASSEMBLY_VERSION, rack, removed: [...removed], structure, accessories, nextId: input.nextId };

}
export function getPartPlacementInfo(part: string, input?: RackDoc): PlacementInfo | null {
  if (isVendorPart(part)) return vendorPlacement(part);
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
  if (!ACCESSORY_PARTS.includes(part)) return null;
  if (isHook(part)) return { family: 'j-hooks', label: part.replaceAll('-', ' '), paired: true, faces: [...FACES], fields: [] };
  if (isSafety(part)) return { family: 'safeties', label: part.replaceAll('-', ' '), paired: true, faces: ['left', 'right'], fields: part === 'safety-webbing' ? [{ key: 'sag', label: 'Strap sag', min: 10, max: 100, step: 5 }] : [] };
  return { family: 'pullups', label: part.replaceAll('-', ' '), paired: false, faces: ['left', 'right'], ...(isWidePullup(part) ? { fixedHole: upperHole(input?.rack ?? RACK_DEFAULTS) + 1 } : {}), fields: [{ key: 'diameter', label: 'Grip diameter', min: 15, max: 60, step: 1 }] };
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
  const defaultHole = isFoot(part) ? 0 : isPullup(part) ? pullupHole(doc.rack) : isSafety(part) ? 12 : 24;
  return { uprightId, face: isPullup(part) || isSafety(part) ? (sideOf(uprightId) === 'left' ? 'right' : 'left') : 'front', hole: Math.min(defaultHole, maxHole(doc.rack) - 2) };
}
export function addAccessory(input: RackDoc, part: string, target: Partial<Target> = {}, paired = true, params: NumericParams = {}): RackDoc {
  const doc = validateAssembly(input);
  if (!ACCESSORY_PARTS.includes(part)) fail(`No rack connection adapter for ${part}.`);
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
  a.target = { ...a.target, ...target } as Target; if (a.target.kind === 'crossmember-top') delete a.pairTarget; if (paired !== undefined) a.paired = supportsPair(a.part) ? paired : false;
  return validateAssembly(doc);
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
  delete second.pairTarget; delete a.pairTarget; delete second.pairTo; delete second.pairedSpanTo; delete a.pairTo; delete a.pairedSpanTo;
  doc.accessories.push(second);
  return validateAssembly(doc);
}
export function removeInstance(input: RackDoc, id: string): RackDoc {
  const doc = validateAssembly(input), ownerId = id.split(':')[0];
  if (structureSlots(doc).some(slot => slot.id === ownerId)) {
    const removed = new Set(doc.removed); removed.add(ownerId);
    for (const slot of structureSlots(doc)) if (slot.connectedTo.some(dep => removed.has(dep))) removed.add(slot.id);
    doc.removed = [...removed];
    doc.accessories = doc.accessories.filter(a => dependencies(a).every(dep => !removed.has(dep)));
  } else doc.accessories = doc.accessories.filter(a => a.id !== ownerId);
  if (doc.systems) doc.systems = doc.systems.filter(s => s.id !== ownerId && !structureSlots(doc).some(slot => slot.id === ownerId));
  return validateAssembly(doc);
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
    node.y = shift(node.y,(previous.depth+previous.tube)/2,(doc.rack.depth+doc.rack.tube)/2);
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
  if (part !== undefined && !ACCESSORY_PARTS.includes(part)) return result;
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
  for (const id of Object.keys(doc.uprights)) if (!doc.removed.includes(id)) for (let hole = 0; hole <= maxHole(doc.rack); hole += doc.rack.benchSpacing ? 0.5 : 1) for (const face of FACES) if (validHole(doc.rack, hole, face)) result.push(mount({ ...doc.rack, uprights: doc.uprights }, id, hole, face));
  if (!part) return result;
  return result.filter(m => {
    const candidate = { id: 'mount-preview', part, target: { uprightId: m.uprightId, face: m.face, hole: m.hole }, paired: false, params };
    try { validateAssembly({ ...doc, accessories: [candidate] }); return true; } catch { return false; }
  });
}
/** Resolve every connection against the current rack dimensions and source origins. */
export function resolveAssembly(input: RackDoc): ResolvedInstance[] {
  const doc = validateAssembly(input), r = { ...doc.rack, uprights: doc.uprights }, result: ResolvedInstance[] = [];
  const append = (id: string, part: PartId, params: NumericParams, position: Vec3, angle: number, mounts: Mount[], kind: ResolvedInstance['kind'], ownerId = id, paired = false, connectedTo: string[] = []) => {
    result.push({ ...(doc.logo && logoSite(part) ? { logo: doc.logo } : {}), id, part, params, position, rotation: [0, 0, angle], mount: mounts[0] ?? null, mounts, ownerId, kind, paired, connectedTo });
  };
  for (const id of Object.keys(doc.uprights)) if (!doc.removed.includes(id)) {
    const angle = sideOf(id) === 'right' ? Math.PI : 0, center = postCenter(r, id), offset = rotateZ([15, 0, 0], angle);
    const params = { height: r.height, width: r.tube, wall: 3, cornerRadius: 3, holeDiameter: r.holeDiameter, spacing: r.pitch, firstHole: r.firstHole, benchStart: r.benchStart ?? r.firstHole, benchEnd: r.benchEnd ?? r.height, benchSpacing: r.benchSpacing ?? r.pitch, baseWidth: 105, baseDepth: 135, baseThickness: 8 };
    append(id, 'upright', params, center.map((v, i) => v - offset[i]) as Vec3, angle, [mount(r, id, 0, 'front', [15, 0, r.firstHole])], 'structure');
  }
  for (const slot of structureSlots(doc).filter(s => s.part !== 'upright')) if (!doc.removed.includes(slot.id) && slot.connectedTo.every(id => !doc.removed.includes(id))) {
    const variant = doc.structure[slot.id] ?? { part: slot.part, params: {} }, framePart = variant.part;
    const settings = { ...FRAME_PARTS[framePart].defaults, ...variant.params };
    const edge = doc.connections.find(e => e.id === slot.id)!;
    const a = postCenter(r, edge.from), b = postCenter(r, edge.to);
    const rear = a[1] === b[1], high = edge.level === 'upper';
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]) - r.tube;
    const flangeHeight = framePart === 'branded-crossmember' ? 300 : r.pitch === 50.8 ? 50 + 2*r.pitch : 150;
    const rise = framePart === 'angled-crossmember' ? settings.rise : 0;
    const upper = Math.floor((r.height - 25 - r.firstHole) / r.pitch) - Math.round((flangeHeight - 50 + rise) / r.pitch);
    const hole = high ? upper : systemLowerCrossmemberStation(doc,edge.from,edge.to);
    const side = slot.id.startsWith('right') ? 'right' : 'left';
    const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
    const params: NumericParams = { length: span, width: r.tube, wall: 3, holeDiameter: r.holeDiameter, spacing: r.pitch, plateThickness: 6, plateHeight: flangeHeight };
    if (r.pitch === 50.8) params.boltDiameter = r.holeDiameter - 0.8;
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
      result.push(...resolveVendor(doc, a, targetsFor(a)));
    } else if (a.spanTo) {
      for (const [index, t] of targetsFor(a).entries()) {
      const endpoint = index ? a.pairedSpanTo! : a.spanTo;
      const start = postCenter(r, t.uprightId), end = postCenter(r, endpoint);
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const clear = Math.hypot(end[0] - start[0], end[1] - start[1]) - r.tube;
      const z = a.part === 'pullup-straight' ? 25 : a.part === 'safety-box' ? 137.5 : a.part === 'safety-webbing' ? 158 : 100;
      const faces: [Face, Face] = Math.abs(end[0]-start[0]) > 0 ? (end[0] > start[0] ? ['right','left'] : ['left','right']) : (end[1] > start[1] ? ['back','front'] : ['front','back']);
      const anchorSpan = a.part === 'pullup-straight' ? clear : clear + r.tube;
      const mounts = [t.uprightId, endpoint].map((id, i) => mount(r, id, t.hole, faces[i], [(i ? 1 : -1) * anchorSpan / 2, 0, z]));
      append(a.paired ? `${a.id}:${pairSuffix(targetsFor(a), index)}` : a.id, a.part, { ...params, mountSpacing: r.pitch === 50.8 ? 4*r.pitch : 200, boltDiameter: r.pitch === 50.8 ? r.holeDiameter-0.8 : 16, holeDiameter: r.holeDiameter, length: clear - (isSafety(a.part) && a.part !== 'safety-pin-pipe' ? 6 : 0), upright: r.tube }, [(start[0]+end[0])/2, (start[1]+end[1])/2, holeZ(r,a.target.hole)-z], angle, mounts, 'accessory', a.id, a.paired, [t.uprightId,endpoint]);
      }
    } else if (isMountedAttachment(a.part)) {
      const anchor = getAttachmentAnchor(a.part, params);
      for (const [index, t] of targetsFor(a).entries()) {
        const normal = NORMALS[t.face], angle = Math.atan2(normal[1], normal[0]) - Math.atan2(anchor.outward[1], anchor.outward[0]);
        const m = mount(r, t.uprightId, t.hole, t.face, anchor.point), local = rotateZ(anchor.point, angle);
        const mounts = anchor.boltStations.map(station => ({ ...mount(r, t.uprightId, t.hole + Math.round(station.zOffset / r.pitch), t.face, station.point), pinAxis: rotateZ(station.axis, angle) }));
        append(a.paired ? `${a.id}:${pairSuffix(targetsFor(a), index)}` : a.id, a.part, { ...params, holeDiameter: r.holeDiameter }, m.center.map((v, i) => v - local[i]) as Vec3, angle, mounts, 'accessory', a.id, a.paired, [t.uprightId]);
        result[result.length - 1].collisionBoxes = getAttachmentCollisionBoxes(a.part, params);
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
        const angle = ROTATIONS[t.face], anchor = HOOK_ANCHORS[a.part], m = mount(r, t.uprightId, t.hole, t.face, anchor), local = rotateZ(anchor, angle);
        append(a.paired ? `${a.id}:${pairSuffix(targetsFor(a), index)}` : a.id, a.part, { ...params, holeDiameter: r.holeDiameter }, m.center.map((v, i) => v - local[i]) as Vec3, angle, [m], 'accessory', a.id, a.paired, [t.uprightId]);
      }
    } else if (isSafety(a.part)) {
      for (const [index, t] of targetsFor(a).entries()) {
        const side = sideOf(t.uprightId), x = postCenter(r, `front-${side}`)[0], z = a.part === 'safety-box' ? 137.5 : a.part === 'safety-webbing' ? 158 : 100;
        const span = (r.depth + r.tube) / 2;
        const mounts = (['front', 'rear'] as const).map((row, i) => mount(r, `${row}-${side}`, t.hole, row === 'front' ? 'back' : 'front', [(i ? 1 : -1) * span, 0, z]));
        append(a.paired ? `${a.id}:${side}` : a.id, a.part, { ...params, length: r.depth - (a.part === 'safety-pin-pipe' ? 0 : 6), upright: r.tube }, [x, 0, holeZ(r, t.hole) - z], Math.PI / 2, mounts, 'accessory', a.id, a.paired, mounts.map(m => m.uprightId));
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
  result.push(...resolveSystems(doc));
  return result;
}
