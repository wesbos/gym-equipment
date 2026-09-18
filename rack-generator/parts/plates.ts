import type { CrossSection, Manifold, Mat4, Vec2 } from 'manifold-3d';
import type { ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
import { PLATE_BORE, PLATE_GAP, PLATE_SPECS, type PlateId, type PlateSpec } from '../plates.ts';
/** Reusable Olympic plate stack. Plates stack from `origin` outward along `axis`
 * (storage peg root, or a barbell sleeve collar), each centred on the axis line.
 * Profiles are (radius, axial) and revolved; the solid's local +Z becomes `axis`.
 * Roles are 'source' so frame/hardware finishes never recolor IWF colors.
 */
export interface PlateStackPlacement { origin: Vec3; axis: Vec3; /** Solid name prefix. */ name?: string; segments?: number }
const HUB = 45;
function bumperProfiles(spec: PlateSpec): { rubber: Vec2[]; hub: Vec2[] } {
  const R = spec.diameter / 2, w = spec.width, c = 3, d = Math.min(2, w * .04), b = PLATE_BORE / 2;
  return {
    // Chamfered tread with shallow recessed faces between hub collar and lip.
    rubber: [[HUB, 0], [70, 0], [74, d], [R - 26, d], [R - 22, 0], [R - c, 0], [R, c], [R, w - c], [R - c, w], [R - 22, w], [R - 26, w - d], [74, w - d], [70, w], [HUB, w]],
    hub: [[b + 1, 0], [HUB, 0], [HUB, w], [b + 1, w], [b, w - 1], [b, 1]],
  };
}
function ironProfile(spec: PlateSpec): Vec2[] {
  // Flat back, raised rim and hub boss on the face, thinner web between.
  const R = spec.diameter / 2, w = spec.width, b = PLATE_BORE / 2, web = w * .45, rim = Math.min(24, R * .12);
  return [[b, 1], [b + 1, 0], [R - 2, 0], [R, 2], [R, w - 3], [R - 3, w], [R - rim, w], [R - rim - 6, web], [HUB + 16, web], [HUB + 10, w], [b + 1, w], [b, w - 1]];
}
/** Column-major rigid transform taking local +Z to `axis`, translated to `at`. */
function frame(axis: Vec3, at: Vec3): Mat4 {
  const length = Math.hypot(...axis);
  if (!(length > 0)) throw Error('Plate stack axis must be non-zero.');
  const a = axis.map(v => v / length) as Vec3, seed: Vec3 = Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  let u = cross(seed, a); const n = Math.hypot(...u); u = u.map(v => v / n) as Vec3;
  const v = cross(a, u);
  return [...u, 0, ...v, 0, ...a, 0, ...at, 1];
}
export function buildPlateStack(api: ManifoldAPI, plates: readonly PlateId[], placement: PlateStackPlacement): SolidPart[] {
  const { CrossSection: C } = api, allocated: (Manifold | CrossSection)[] = [], result: SolidPart[] = [];
  const keep = <T extends Manifold | CrossSection>(x: T): T => (allocated.push(x), x);
  const segments = placement.segments ?? 96, prefix = placement.name ?? 'plate';
  const length = Math.hypot(...placement.axis), unit = placement.axis.map(v => v / length) as Vec3;
  const revolve = (ring: Vec2[], at: Vec3) => keep(keep(keep(new C([ring], 'EvenOdd')).revolve(segments)).transform(frame(placement.axis, at)));
  try {
    let offset = 0;
    for (const [index, id] of plates.entries()) {
      const spec = PLATE_SPECS[id];
      if (!spec) throw Error(`Unknown plate ${id}.`);
      const at = placement.origin.map((v, i) => v + unit[i] * offset) as Vec3, name = `${prefix}-${index + 1} ${spec.label}`;
      if (spec.style === 'bumper') {
        const { rubber, hub } = bumperProfiles(spec);
        result.push({ name, solid: revolve(rubber, at), role: 'source', color: spec.color, metalness: 0, roughness: .82 });
        result.push({ name: `${name} hub`, solid: revolve(hub, at), role: 'source', color: '#c9ccce', metalness: .9, roughness: .3 });
      } else result.push({ name, solid: revolve(ironProfile(spec), at), role: 'source', color: spec.color, metalness: .55, roughness: .62 });
      offset += spec.width + PLATE_GAP;
    }
    return result;
  } catch (error) { result.length = 0; throw error; } finally {
    const saved = new Set<Manifold | CrossSection>(result.map(p => p.solid));
    allocated.reverse().forEach(p => { if (!saved.has(p)) p.delete(); });
  }
}
