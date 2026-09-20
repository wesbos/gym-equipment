import type { Vec3, Vec2, NumericParams, PlacementInfo, AttachmentAnchor, LocalBox, Face } from './types.ts';
import { fitMap, type FitFrame, type MountFit } from './mount-fit.ts';
import { SOURCE_MOUNT_SHAFTS } from './mount-shafts.ts';
interface AttachmentDefinition { label: string; size: Vec3; anchor: Vec3; outward: Vec3; pinAxis: Vec3; paired: boolean; /** New placements start as a pair only when true. */ defaultPaired: boolean; type: string; note: string; boxes: [Vec3, Vec3][]; requiredPitch?: number; handed?: boolean; additionalBolts?: { z: number; axis: Vec3 }[]; /** The sleeve or collar wraps the tube's side faces (rack fit brings them in or out, #162). */ wrap: boolean }
/** Source-derived upright adapters. Millimetres, Z up.
 * Anchors are upright CENTER / bolt-axis intersections, not mesh bounds centers.
 * Measurements come from decoded source collar contact planes and shaft sections.
 * Source-sized bodies remain rigid: resizing a clamp would destroy its 75 mm fit.
 */
const TABLE: Record<string, AttachmentDefinition> = {
  'spotter-arm': {
    wrap: true, label: 'Spotter arm', size: [95.9795495156153, 711.8301833828959, 385.0044128179775],
    anchor: [0, -318.41469035, 355.00034], outward: [0, 1, 0], pinAxis: [1, 0, 0], paired: true, defaultPaired: true,
    type: 'retaining-pin', note: 'Transverse retaining shaft at Z355; upright cavity between the opposed UHMW side pads.',
    boxes: [[[-39, -265.9, 75], [39, 355.9151, 265]]],
  },
  'dip-horn': {
    wrap: true, label: 'Dip horn', size: [686.272410067909, 606.7577509815051, 199.9958250671625],
    anchor: [302.11049, -7.04947, 25.00042], outward: [-1, 0, 0], pinAxis: [0, 1, 0], paired: false, defaultPaired: false,
    type: 'retaining-pin', note: 'Complete two-handle assembly. Anchor is the transverse pin through the padded 75 mm collar.',
    boxes: [
      [[128.45, -249.11, 6.99], [265, 238.23, 127.01]],
      [[-356.45, 155.13, 21.59], [241.39, 304.79, 67.35]],
      [[-362.68, -304.63, 21.69], [237.26, -167.35, 67.19]],
    ],
  },
  'dip-bar-adjustable': {
    wrap: true, label: 'Adjustable dip bar', size: [476.48113348489386, 557.9987205721534, 316.2001718155119],
    anchor: [-173.70955, -158.50075, 25.0002], outward: [1, 0, 0], pinAxis: [1, 0, 0], paired: false, defaultPaired: false,
    type: 'multi-bolt-collar', requiredPitch: 50, handed: true,
    additionalBolts: [{ z: 250, axis: [1, 0, 0] }, { z: 50, axis: [0, 1, 0] }, { z: 200, axis: [0, 1, 0] }],
    note: 'Handed source assembly. Lower/upper transverse bolts are 250 mm apart; perpendicular collar pins are 150 mm apart. Place individually; automatic mirroring is not implied.',
    boxes: [
      [[-127, -201.5, 49.99], [142.8, -120.99, 300.01]],
      [[142.79, -279, 159.5], [238.25, -113, 316.21]],
      [[148.45, -113, 247.7], [199.1, 279, 298.4]],
    ],
  },
  landmine: {
    wrap: false, label: 'Landmine', size: [400.0000059604645, 91.99855476617813, 190.00183045864105],
    anchor: [-147.50001, 3.99685, 19.995], outward: [1, 0, 0], pinAxis: [1, 0, 0], paired: true, defaultPaired: false,
    type: 'two-bolt-plate', requiredPitch: 50, additionalBolts: [{ z: 150, axis: [1, 0, 0] }],
    note: 'Two rack mounting studs at Z20 and Z170. The smaller sleeve articulation bolts are not rack mounts.',
    boxes: [[[ -84.96, -31.01, 57], [20, 39, 133]], [[-20.01, -24.52, 66.5], [200, 32.5, 123.5]]],
  },
  monolift: {
    wrap: true, label: 'Monolift', size: [152.50658867013829, 556.6585891784836, 325.52698254585266],
    anchor: [8.748, -240.82804, 300.81799], outward: [0, 1, 0], pinAxis: [1, 0, 0], paired: true, defaultPaired: true,
    type: 'retaining-pin', note: 'Rear transverse 16 mm source shaft, not the forward swing pivot. Source upright cavity is centered between the opposed liners.',
    boxes: [[[-8.26, -192.3, 0], [25.77, 278.34, 323.31]]],
  },
  'single-bar-holder': {
    wrap: false, label: 'Single bar holder', size: [246.21925984427253, 64.73516080390016, 140.0000937283039],
    anchor: [71.78962545, -0.0332, 20.0002], outward: [-1, 0, 0], pinAxis: [1, 0, 0], paired: true, defaultPaired: false,
    type: 'two-bolt-plate', additionalBolts: [{ z: 100, axis: [1, 0, 0] }],
    note: 'Rack-facing mounting plate is X34.289625; the upright center sits another 37.5 mm behind it. Bolt levels Z20 and Z120.',
    boxes: [[[-123.11, -32.37, 29.99], [-58.30, 32.37, 140.01]], [[-75.8, -32.37, 40], [30, 32.37, 100]]],
  },
  'storage-pin-short': {
    wrap: false, label: 'Short storage pin', size: [340.00001614913344, 79.54709240133084, 79.77537915533793],
    anchor: [-112.50000547, -0.2264557, 39.88815497], outward: [1, 0, 0], pinAxis: [1, 0, 0], paired: true, defaultPaired: true,
    type: 'through-stud', note: 'The peg shoulder meets the rack at X-75; the rear nut sits behind the far upright face at X-150.',
    boxes: [[[-74.9, -39.78, 0], [-64.9, 39.78, 79.78]], [[-64.9, -25.3, 14.59], [170.01, 25.3, 65.19]]],
  },
  'storage-pin-long': {
    wrap: false, label: 'Long storage pin', size: [455.00002056360245, 79.54099029302597, 79.76317405700684],
    anchor: [-170.00001594, -0.22950768, 39.88815472], outward: [1, 0, 0], pinAxis: [1, 0, 0], paired: true, defaultPaired: true,
    type: 'through-stud', note: 'The peg shoulder meets the rack at X-132.5; the rear nut sits behind the far upright face at X-207.5.',
    boxes: [[[-132.4, -39.78, 0], [-122.4, 39.78, 79.78]], [[-122.4, -25.3, 14.59], [227.51, 25.3, 65.19]]],
  },
};
export const attachmentPartIds = Object.freeze(Object.keys(TABLE));
const faces: Face[] = ['front', 'back', 'left', 'right'];
function definition(part: string): AttachmentDefinition {
  if (!Object.hasOwn(TABLE, part)) throw new Error(`No attachment mount adapter for ${part}.`);
  return TABLE[part];
}
export function getAttachmentDefaults(part: string): NumericParams {
  const d = definition(part);
  return { width: d.size[0], depth: d.size[1], height: d.size[2], holeDiameter: 25 };
}
export function getAttachmentPlacementInfo(part: string): PlacementInfo {
  const d = definition(part);
  return { family: 'attachment', label: d.label, paired: d.paired, defaultPaired: d.paired && d.defaultPaired, faces: [...faces], fields: [],
    ...(d.requiredPitch ? { requiredPitch: d.requiredPitch } : {}), handed: !!d.handed,
    mountType: d.type, description: d.note };
}
function rigidParams(part: string, params: NumericParams = {}) {
  const base = getAttachmentDefaults(part);
  for (const key of ['width', 'depth', 'height']) if (params[key] !== undefined && (!Number.isFinite(params[key]) || Math.abs(params[key] - base[key]) > .001)) {
    throw new Error(`${part} dimensions must retain their source 75 mm upright fit.`);
  }
  if (params.holeDiameter !== undefined && params.holeDiameter !== 25) throw new Error('Attachment adapters require the rack’s 25 mm mounting bores.');
}
/** Retaining-pin midpoints of the source J-hooks (the upright centre) and their overall sizes. */
export const HOOK_ANCHORS: Readonly<Record<string, Vec3>> = Object.freeze({
  'j-hook-standard': [8.753024654290442, -85.08286, 150.00177048395147],
  'j-hook-roller': [7.950296872119169, -42.38026, 149.9999016070705],
  'j-hook-sandwich': [8.748823188354173, -44.99326, 150.00005966760105],
});
export const HOOK_SIZES: Readonly<Record<string, Vec3>> = Object.freeze({
  'j-hook-standard': [77.50773067687726, 267.1657279908552, 199.99746128159586],
  'j-hook-roller': [79.41224628971781, 181.76052942221077, 200.00000949949026],
  'j-hook-sandwich': [77.49497432826422, 186.9865255761083, 200.00000949949026],
});
/** Source mount frame of a built-in hook or attachment (mount-fit.ts): J-hooks wrap the tube on a normal pin. */
export function mountFrame(part: string): FitFrame {
  if (Object.hasOwn(HOOK_ANCHORS, part)) return { center: [...HOOK_ANCHORS[part]], normal: [0, 1, 0], wrap: true, stations: [{ z: 0, axis: [0, 1, 0] }], pin: SOURCE_MOUNT_SHAFTS[part] };
  const d = definition(part);
  return { center: [...d.anchor], normal: [...d.outward], wrap: d.wrap, stations: [{ z: 0, axis: [...d.pinAxis] }, ...(d.additionalBolts ?? []).map(b => ({ z: b.z, axis: [...b.axis] as Vec3 }))], pin: SOURCE_MOUNT_SHAFTS[part] };
}
/** Mount anchor in the part frame. With a rack `fit` (non-75 mm tube) the anchor, stations and bounds follow the
 * adapted sleeve: the mating face stays, the tube centre moves to the new tube, bolts snap to the rack pitch. */
export function getAttachmentAnchor(part: string, params: NumericParams = {}, fit: MountFit | null = null): AttachmentAnchor {
  const d = definition(part); rigidParams(part, params);
  const stations = [{ z: 0, axis: d.pinAxis }, ...(d.additionalBolts || [])];
  const source: AttachmentAnchor = {
    point: [...d.anchor], outward: [...d.outward], pinAxis: [...d.pinAxis], requiredTube: 75,
    minHoleZ: d.anchor[2], maxAbove: d.size[2] - d.anchor[2],
    ...(d.requiredPitch ? { requiredPitch: d.requiredPitch } : {}),
    boltStations: stations.map(s => ({ point: [d.anchor[0], d.anchor[1], d.anchor[2] + s.z], zOffset: s.z, axis: [...s.axis], diameter: 25 })),
    bounds: { min: [-d.size[0] / 2, -d.size[1] / 2, 0], max: [d.size[0] / 2, d.size[1] / 2, d.size[2]] },
    matingFacePoint: d.anchor.map((v, i) => v + d.outward[i] * 37.5) as Vec3,
  };
  if (!fit) return source;
  const map = fitMap(mountFrame(part), fit), bounds = map.box(source.bounds);
  return {
    point: map.point(source.point), outward: source.outward, pinAxis: source.pinAxis, requiredTube: fit.depth,
    minHoleZ: d.anchor[2] - bounds.min[2], maxAbove: bounds.max[2] - d.anchor[2],
    boltStations: source.boltStations.map((s, i) => ({ point: map.point(s.point), zOffset: map.offsets[i], axis: s.axis, diameter: fit.pin })),
    bounds, matingFacePoint: map.point(source.matingFacePoint),
  };
}
/** Conservative local body regions omit the upright collar, its pins, and nuts.
 * Curved bodies are represented by multiple regions rather than a rack-wide box.
 */
export function getAttachmentCollisionBoxes(part: string, params: NumericParams = {}, fit: MountFit | null = null): LocalBox[] {
  const d = definition(part); rigidParams(part, params);
  const boxes = d.boxes.map(([min, max]): LocalBox => ({ min: [...min], max: [...max] }));
  if (!fit) return boxes;
  const map = fitMap(mountFrame(part), fit);
  return boxes.map(map.box);
}
/** Working-body box of a J-hook cup (the tall collar and pin are left to slot checks), fitted when `fit` is set. */
export function hookCollisionBoxes(part: string, fit: MountFit | null): LocalBox[] {
  const size = HOOK_SIZES[part], anchor = HOOK_ANCHORS[part];
  const box: LocalBox = { min: [-size[0] / 2 + 3, anchor[1] + 39, 0], max: [size[0] / 2 - 3, size[1] / 2, Math.min(size[2], anchor[2] - 25)] };
  return [fit ? fitMap(mountFrame(part), fit).box(box) : box];
}
/** J-hook upright centre in the part frame: the pin midpoint, or its fitted position on another tube. */
export const hookAnchor = (part: string, fit: MountFit | null): Vec3 => fit ? fitMap(mountFrame(part), fit).point(HOOK_ANCHORS[part]) : [...HOOK_ANCHORS[part]];
