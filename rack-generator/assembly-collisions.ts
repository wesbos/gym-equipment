import { Euler, Vector3 } from 'three';
import type { Vec2, Vec3, NumericParams, LocalBox, CollisionInstance, CollisionWarning, Mount, Target } from './types.ts';
import { isHostedTarget, isRailTarget } from './rack-targets.ts';
interface OrientedBox { center: Vec3; half: Vec3; axes: [Vec3, Vec3, Vec3] }
// Conservative interference checks for resolved accessories, in millimetres.
// These envelopes cover working bodies, excluding collars, mounting pins and
// washers. Frame-to-frame joins and accessory-to-post contact are omitted;
// protruding accessory bodies are checked against frame beams.
// This is a placement aid, not a solid/solid manufacturing clearance check.
import { attachmentPartIds, getAttachmentCollisionBoxes } from './attachment-mounts.ts';

const CLEARANCE = 2;
const ATTACHMENT_BODIES = new Set(attachmentPartIds);
const HOOK_ANCHORS: Record<string, Vec3> = {
  'j-hook-standard': [8.753, -85.08286, 150.00177],
  'j-hook-roller': [7.9503, -42.38026, 149.9999],
  'j-hook-sandwich': [8.74882, -44.99326, 150.00006],
};
const HOOK_SIZES: Record<string, Vec3> = {
  'j-hook-standard': [77.508, 267.166, 200],
  'j-hook-roller': [79.412, 181.761, 200],
  'j-hook-sandwich': [77.495, 186.987, 200],
};
const FRAME_BODIES = new Set(['crossmember-425', 'crossmember-725', 'crossmember-1075',
  'angled-crossmember', 'offset-crossmember', 'branded-crossmember', 'branded-crossmember-lite']);
// Outer skin profiles measured from the existing Manifold foot sketches (Y,Z).
const FOOT_PROFILES: Record<string, Vec2[]> = {
  'foot-400': [[-139.5,185.086],[-139.5,44.925],[-133.503,44.925],[-133.503,77.892],[-98.606,77.968],[-22.123,33.812],[22.579,8.011],[20.498,0],[235.5,0],[235.5,8.011],[170.702,8.011],[12.445,99.367],[-78.764,152.026],[-133.503,152.104],[-133.503,185.086]],
  'foot-800': [[-314.5,185.079],[-314.5,44.904],[-308.482,44.904],[-308.482,77.886],[76.409,77.95],[153.258,33.597],[197.578,8.01],[195.518,0],[410.5,0],[410.5,8.01],[345.717,8.01],[186.697,99.812],[96.238,152.034],[-308.482,152.098],[-308.482,185.079]],
};
const NAMES: Record<string, string> = {
  'j-hook-standard': 'Standard J-hook',
  'j-hook-roller': 'Roller J-hook',
  'j-hook-sandwich': 'Sandwich J-hook',
  'safety-box': 'Box safety',
  'safety-pin-pipe': 'Pin-and-pipe safety',
  'safety-webbing': 'Webbing safety',
  'pullup-straight': 'Standard pull-up bar',
  'pullup-multigrip': 'Multi-grip pull-up bar',
  'pullup-sphere': 'Spherical pull-up bar',
  'spotter-arm': 'Spotter arm',
  'dip-horn': 'Dip horn',
  'dip-bar-adjustable': 'Adjustable dip bar',
  landmine: 'Landmine',
  monolift: 'Monolift',
  'single-bar-holder': 'Single bar holder',
  'storage-pin-short': 'Short weight storage pin',
  'storage-pin-long': 'Long weight storage pin',
  'foot-400': 'Short stabilizer foot',
  'foot-800': 'Long stabilizer foot',
  nameplate: 'Nameplate panel',
  'branded-crossmember': 'Nameplate crossmember',
  'branded-crossmember-lite': 'Nameplate crossmember lite',
  'crossmember-425': '425 mm crossmember',
  'crossmember-725': '725 mm crossmember',
  'crossmember-1075': '1075 mm crossmember',
  'angled-crossmember': 'Angled crossmember',
  'offset-crossmember': 'Offset crossmember',
};
const vector = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const number = (v: number | undefined, fallback: number): number => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
const box = (min: Vec3, max: Vec3): LocalBox => ({ min, max });
const segmentBox = (a: Vec3, b: Vec3, diameter: number): LocalBox => box(a.map((v, i) => Math.min(v, b[i]) - diameter / 2) as Vec3,
  a.map((v, i) => Math.max(v, b[i]) + diameter / 2) as Vec3);
function segmentedStock(points: Vec3[], width: number): LocalBox[] {
  const result = [];
  for (let n = 1; n < points.length; n++) {
    const a = points[n - 1], b = points[n], count = Math.max(1, Math.ceil(Math.hypot(...a.map((v, i) => b[i] - v)) / 30));
    for (let i = 0; i < count; i++) result.push(segmentBox(
      a.map((v, k) => v + (b[k] - v) * i / count) as Vec3, a.map((v, k) => v + (b[k] - v) * (i + 1) / count) as Vec3, width));
  }
  return result;
}
function footBodies(part: string, p: NumericParams): LocalBox[] {
  const long = part === 'foot-800', scale = number(p.length, long ? 800 : 400) / (long ? 800 : 400);
  const shape = FOOT_PROFILES[part], root = shape[0][0] + 20, end = long ? 410.5 : 235.5;
  const width = number(p.width, 75), result = [];
  // Slice the sloping side silhouette so the air below its elevated rear tube
  // remains clear. Ignore the upright flange and its bolts.
  for (let y = root; y < end; y += 20) {
    const next = Math.min(end, y + 20), heights = [];
    for (let i = 0; i < shape.length; i++) {
      const a = shape[i], b = shape[(i + 1) % shape.length];
      if (a[0] >= y && a[0] <= next) heights.push(a[1]);
      for (const x of [y, next]) if (a[0] !== b[0] && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0])) heights.push(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]));
    }
    if (heights.length) result.push(box([-width / 2, y * scale, Math.min(...heights)], [width / 2, next * scale, Math.max(...heights)]));
  }
  const padWidth = number(p.padWidth, 95), padDepth = number(p.padDepth, 215) * scale;
  result.push(box([-padWidth / 2, end * scale - padDepth, 0], [padWidth / 2, end * scale, number(p.baseThickness, 8)]));
  return result;
}

function localBodies(instance: CollisionInstance): LocalBox[] {
  // Adapters can supply tighter profiles without coupling this module to WASM.
  if (Array.isArray(instance.collisionBoxes)) return instance.collisionBoxes;
  const p = instance.params || {}, part = typeof instance.part === 'string' ? instance.part : '';
  if (ATTACHMENT_BODIES.has(part)) return getAttachmentCollisionBoxes(part, p);
  if (HOOK_SIZES[part]) {
    const defaults = HOOK_SIZES[part];
    const size = ['width', 'depth', 'height'].map((key, i) => number(p[key], defaults[i]));
    const anchor = vector(instance.mount?.localAnchor) ? instance.mount.localAnchor
      : HOOK_ANCHORS[part].map((v, i) => v * size[i] / defaults[i]);
    // The receiving cup extends +Y beyond the post; the tall rear collar is
    // deliberately absent from this volume. Slot conflicts handle its pin.
    return [box([-size[0] / 2 + 3, anchor[1] + 39, 0],
      [size[0] / 2 - 3, size[1] / 2, Math.min(size[2], anchor[2] - 25)])];
  }
  const defaultLength = part === 'crossmember-425' || part === 'angled-crossmember' ? 425
    : part === 'crossmember-725' ? 725 : part === 'offset-crossmember' ? 1225 : 1075;
  const length = number(p.length, defaultLength);
  if (FOOT_PROFILES[part]) return footBodies(part, p);
  if (part === 'nameplate') {
    const height = number(p.height, 175), thickness = number(p.thickness, 5.0524);
    return [box([-length / 2 + 20, -thickness / 2, 50 * height / 175],
      [length / 2 - 20, thickness / 2, 225 * height / 175])];
  }
  if (FRAME_BODIES.has(part)) {
    const width = number(p.width, 75), plate = number(p.plateThickness, 6), half = length / 2 - plate - width / 2;
    if (part === 'angled-crossmember') {
      // Builder rotates the sloped beam 180° around Z after creating it.
      return segmentedStock([[half, 0, 75 + width / 2 * number(p.rise, 199) / (length - 2 * plate)],
        [-half, 0, 75 + number(p.rise, 199) * (1 - width / 2 / (length - 2 * plate))]], width);
    }
    if (part === 'offset-crossmember') {
      const sx = length / 1225, sy = number(p.offset, 193.5) / 193.5;
      return segmentedStock([[-575 * sx, 36 * sy, 75], [-335 * sx, -126 * sy, 75],
        [335 * sx, -126 * sy, 75], [575 * sx, 36 * sy, 75]], width);
    }
    const panelHeight = number(p.panelHeight, part === 'branded-crossmember' ? 300 : 150);
    if (part === 'branded-crossmember' && panelHeight > 175) return [
      box([-length / 2 + 20, -width / 2, panelHeight - width], [length / 2 - 20, width / 2, panelHeight]),
      box([-length / 2 + 20, -2.5262, 50 * panelHeight / 300], [length / 2 - 20, 2.5262, 225 * panelHeight / 300]),
    ];
    const height = part.startsWith('branded-') ? panelHeight : number(p.plateHeight, 150);
    return [box([-length / 2 + 20, -width / 2, height / 2 - width / 2], [length / 2 - 20, width / 2, height / 2 + width / 2])];
  }
  if (part.startsWith('pullup-')) {
    const half = length / 2 - 20, diameter = number(p.diameter, 32);
    if (part === 'pullup-straight') return [segmentBox([-half, 0, 175], [half, 0, 175], diameter)];
    if (part === 'pullup-multigrip' || part === 'pullup-sphere') {
      const sphere = part === 'pullup-sphere', scale = length / 1075;
      const projection = number(p.projection, sphere ? 190 : 170) / (sphere ? 190 : 170);
      const front = (sphere ? -141.194 : -85) * projection;
      const back = (sphere ? 48.806 : 85) * projection;
      const z = sphere ? 99.639 : 80, outer = 370 * scale;
      const bodies = [segmentBox([-outer, front, z], [outer, front, z], diameter)];
      // Small segments follow bent rails without filling the empty centre.
      const addSegment = (a: Vec3, b: Vec3, d = diameter) => {
        const count = Math.max(1, Math.ceil(Math.hypot(...a.map((v, i) => b[i] - v)) / 50));
        for (let i = 0; i < count; i++) bodies.push(segmentBox(
          a.map((v, k) => v + (b[k] - v) * i / count) as Vec3,
          a.map((v, k) => v + (b[k] - v) * (i + 1) / count) as Vec3, d));
      };
      for (const sign of [-1, 1]) {
        for (const y of [front, back]) addSegment([sign * outer, y, z], [sign * half, y, 30]);
        if (sphere) {
          addSegment([sign * outer, back, z], [sign * 200 * scale, back, z]);
          addSegment([sign * 200 * scale, back, z], [0, -134 * projection, z]);
          for (const [x, y, factor] of [[350, 158.806, 1], [200, 108.806, 0.64]]) {
            const center: Vec3 = [sign * x * scale, y * projection, z];
            addSegment([center[0], front, z], center);
            bodies.push(segmentBox(center, center, number(p.sphereDiameter, 125) * factor));
          }
        } else {
          addSegment([sign * 310 * scale, front, z], [sign * 310 * scale, back, z]);
          addSegment([sign * 140 * scale, front, z], [sign * 200 * scale, back, z]);
        }
      }
      if (!sphere) bodies.push(segmentBox([-outer, back, z], [outer, back, z], diameter));
      return bodies;
    }
  }
  if (part === 'safety-box') {
    const width = number(p.width, 75), height = number(p.height, 75);
    return [box([-length / 2 + 5, -width / 2, 0], [length / 2 - 5, width / 2, height + 5])];
  }
  if (part === 'safety-pin-pipe') {
    const r = number(p.pipeDiameter, 45) / 2;
    return [box([-length / 2 + 5, -r, 100 - r], [length / 2, r, 100 + r])];
  }
  if (part === 'safety-webbing') {
    const half = length / 2 - 50, width = number(p.strapWidth, 40);
    const thickness = number(p.strapThickness, 3), sag = Number.isFinite(p.sag) && p.sag >= 0 ? p.sag : 50;
    const height = (x: number) => 53 - (51.5 * (1 - (x / half) ** 2)) * sag / 50;
    // Separate strips preserve the empty space above and below a hanging strap.
    return Array.from({ length: 24 }, (_, i) => {
      const a = -half + 2 * half * i / 24, b = -half + 2 * half * (i + 1) / 24;
      const za = height(a), zb = height(b);
      return box([a, -width / 2, Math.min(za, zb) - thickness / 2],
        [b, width / 2, Math.max(za, zb) + thickness / 2]);
    });
  }
  // An unknown adapter has no inferred envelope: its mounting slot is still
  // checked, and it may opt into body checking through collisionBoxes.
  return [];
}

function worldBodies(instance: CollisionInstance): OrientedBox[] {
  const origin = vector(instance.position) ? instance.position : [0, 0, 0];
  const rotation = new Euler(...(instance.rotation?.every(Number.isFinite) ? instance.rotation : [0,0,0]) as Vec3);
  const axes = [[1,0,0],[0,1,0],[0,0,1]].map(v=>new Vector3(...v).applyEuler(rotation).toArray()) as [Vec3,Vec3,Vec3];
  return localBodies(instance).flatMap<OrientedBox>(b => {
    if (!vector(b.min) || !vector(b.max) || b.min.some((v, i) => v >= b.max[i])) return [];
    const local = b.min.map((v, i) => (v + b.max[i]) / 2) as Vec3;
    const center=new Vector3(...local).applyEuler(rotation).add(new Vector3(...origin)).toArray() as Vec3;
    return [{center, half:b.min.map((v,i)=>(b.max[i]-v)/2) as Vec3, axes}];
  });
}

function intersects(a: OrientedBox, b: OrientedBox) {
  const delta = a.center.map((v, i) => b.center[i] - v);
  // Full 15-axis OBB SAT: shaft spins are roll/pitch, not CAD Z yaw.
  const cross=a.axes.flatMap(x=>b.axes.map(y=>new Vector3(...x).cross(new Vector3(...y)).toArray() as Vec3));
  for (const candidate of [...a.axes,...b.axes,...cross]) {
    const length=Math.hypot(...candidate);
    if(length<1e-10) continue;
    const axis=candidate.map(v=>v/length);
    const dot=(v: number[])=>v.reduce((sum,x,i)=>sum+x*axis[i],0);
    const extent=(o: OrientedBox)=>o.half.reduce((sum,h,i)=>sum+h*Math.abs(dot(o.axes[i])),0);
    if(extent(a)+extent(b)-Math.abs(dot(delta))<=CLEARANCE) return false;
  }
  return true;
}

type Slot = Partial<Mount> & { connectionId?: string; station?: number; host?: string; unit?: number; frame?: number };
function sharedSlot(a: CollisionInstance, b: CollisionInstance): Slot | null {
  const mounts = (instance: CollisionInstance): Slot[] => (Array.isArray(instance.mounts) ? instance.mounts : instance.mount ? [instance.mount] : []) as Slot[];
  for (const x of mounts(a)) for (const y of mounts(b)) {
    // Top targets use hole=0 as an upright placeholder. Their actual through
    // hole is identified by rail and station, including both faces of the rail.
    // Top and underside rail targets use the same side hole at a station.
    if (isRailTarget(x as Target) || isRailTarget(y as Target)) {
      if (isRailTarget(x as Target) && isRailTarget(y as Target)
        && x.connectionId === y.connectionId && Number.isInteger(x.station) && x.station === y.station) return x;
      continue;
    }
    // Hosted targets (#178) share a slot only with another part on the same host station.
    if (isHostedTarget(x as Target) || isHostedTarget(y as Target)) {
      if (isHostedTarget(x as Target) && isHostedTarget(y as Target) && x.host === y.host && x.unit === y.unit && x.frame === y.frame && x.station === y.station) return x;
      continue;
    }
    if (x?.uprightId && (x.connectorId ?? x.uprightId) === (y?.connectorId ?? y?.uprightId) && Number.isFinite(x.hole) && x.hole === y.hole) return x;
  }
  return null;
}

/** Return one warning per interfering pair involving a resolved accessory. */
export function detectCollisions(resolvedInstances: unknown): CollisionWarning[] {
  if (!Array.isArray(resolvedInstances)) return [];
  const candidates: CollisionInstance[] = resolvedInstances.filter((i: unknown): i is CollisionInstance => !!i && typeof i === 'object' && 'id' in i && typeof i.id === 'string' && 'part' in i && typeof i.part === 'string');
  const instances = candidates.filter(i => i && typeof i.id === 'string' && i.collisionEnabled !== false
    && !(i.kind === 'structure' && i.part === 'upright')
    && (i.kind === 'accessory' || i.collisionEnabled === true || Array.isArray(i.collisionBoxes) || FRAME_BODIES.has(i.part)));
  const bodies = new Map(instances.map(i => [i, worldBodies(i)]));
  const warnings: CollisionWarning[] = [], seen = new Set<string>();
  for (let i = 0; i < instances.length; i++) for (let j = i + 1; j < instances.length; j++) {
    const a = instances[i], b = instances[j];
    if (a.id === b.id) continue;
    if (a.kind === 'structure' && b.kind === 'structure') continue;
    const key = JSON.stringify([a.id, b.id].sort());
    if (seen.has(key)) continue;
    // A part mounted on another accessory (#178) wraps or clamps its host by design.
    const hosts = (v: CollisionInstance) => (Array.isArray(v.mounts) ? v.mounts : []).map(m => m?.hostId);
    if (hosts(a).includes(b.ownerId ?? b.id) || hosts(b).includes(a.ownerId ?? a.id)) continue;
    const slot = a.kind === 'accessory' && b.kind === 'accessory' ? sharedSlot(a, b) : null;
    const overlap = slot || bodies.get(a)!.some(x => bodies.get(b)!.some(y => intersects(x, y)));
    if (!overlap) continue;
    const name = (v: CollisionInstance) => v.name || NAMES[v.part] || String(v.part || 'Accessory').replaceAll('-', ' ');
    // The first ID is the movable accessory so a warning click opens its editor.
    const ids: [string, string] = a.kind === 'structure' ? [b.id, a.id] : [a.id, b.id];
    warnings.push({ ids, message: slot
      ? isRailTarget(slot as Target)
        ? `${name(a)} and ${name(b)} share mounting station ${slot.station! + 1} on ${slot.connectionId}.`
        : isHostedTarget(slot as Target) ? `${name(a)} and ${name(b)} share station ${slot.station! + 1} on ${slot.host}.`
        : `${name(a)} and ${name(b)} share mounting hole ${slot.hole! + 1} on ${slot.uprightId}.`
      : `${name(a)} and ${name(b)} overlap. Move one to another hole or face.` });
    seen.add(key);
  }
  return warnings;
}
