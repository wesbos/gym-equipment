/** Rack fit for the built-in BOS attachments (#162): the source J-hooks, spotter arm, dips, landmine, monolift,
 * bar holder and storage pins were modelled around a 75 mm tube with 25 mm holes on a 50 mm pitch. On any other
 * upright (2x2, 2x3 narrow face forward, 3x3; 5/8" or 1" holes; 2" or 3" pitch) the part keeps its working body and
 * only its mount adapts:
 *  - along the mount normal the mating face stays put; the sleeve/collar/studs behind it shrink or grow to the tube
 *    depth, and anything behind the far face (back plates, nuts) moves with it;
 *  - across the face, wrap-around sleeves bring their side plates in or out to the tube width;
 *  - multi-bolt patterns move their bolts onto the nearest real stations of the rack pitch;
 *  - rack-crossing pins and bolts take the rack's hardware class (5/8" or 1").
 * Each map is monotone and piecewise linear, with a rigid 15 mm core around the tube centre and every station so
 * pins, bores and nuts stay round; only the bands between the core and the faces stretch. Pure: no geometry. */
import { PIN_1IN, PIN_5_8IN } from './rack-part.ts';
import type { Face, LocalBox, RackDimensions, Vec3 } from './types.ts';

/** Source mount frame in the part's local coordinates: tube centre on the station-0 hole axis, outward normal of the
 * mating face, whether the part wraps the tube's side faces, and its rack-crossing pin/bolt stations. */
export interface FitFrame { center: Vec3; normal: Vec3; wrap: boolean; stations: readonly { z: number; axis: Vec3 }[]; pin: number }
/** Target tube depth along the mount normal and width across the face, pin class and pitch (mm). */
export interface MountFit { depth: number; width: number; pin: number; pitch: number }
/** Resolved-only builder params carrying a fit (never saved; absent on 75 mm racks). */
export const FIT_KEYS = ['fitDepth', 'fitWidth', 'fitPin', 'fitPitch'] as const;
const SOURCE = 37.5, CORE = 15;

/** The fit for a mount face on this rack, or null on the source 75 mm tube (the built-ins stay exactly as modelled). */
export function rackMountFit(rack: Pick<RackDimensions, 'tube' | 'tubeDepth' | 'holeDiameter' | 'pitch'>, face: Face): MountFit | null {
  if (rack.tube === 75 && rack.tubeDepth === undefined) return null;
  const depth = rack.tubeDepth ?? rack.tube, frontBack = face === 'front' || face === 'back';
  return { depth: frontBack ? depth : rack.tube, width: frontBack ? rack.tube : depth, pin: rackPinClass(rack.holeDiameter), pitch: rack.pitch };
}
/** 5/8-inch hardware in 5/8"–11/16" holes, 1-inch hardware in 1"–1-1/16" holes (the registry's pin classes). */
export const rackPinClass = (bore: number) => bore < 20 ? PIN_5_8IN : PIN_1IN;
export const fitParams = (fit: MountFit | null): Record<string, number> => fit ? { fitDepth: fit.depth, fitWidth: fit.width, fitPin: fit.pin, fitPitch: fit.pitch } : {};
export function paramsFit(params: Record<string, number | undefined>): MountFit | null {
  const { fitDepth: depth, fitWidth: width, fitPin: pin, fitPitch: pitch } = params;
  return depth && width && pin && pitch ? { depth, width, pin, pitch } : null;
}
/** Station offsets snapped to the rack pitch: nearest whole stations, kept distinct and in order. */
export function fitStationOffsets(offsets: readonly number[], pitch: number): number[] {
  const order = offsets.map((z, i) => ({ z, i })).sort((a, b) => a.z - b.z), result = [...offsets];
  let previous = -Infinity;
  for (const { z, i } of order) { const n = Math.max(Math.round(z / pitch), previous + 1); result[i] = n * pitch; previous = n; }
  return result;
}
/** Symmetric band map of a distance from the centre: rigid core, stretched band to the face, shifted beyond. */
const band = (t: number, half: number) => t <= CORE ? t : t <= SOURCE ? CORE + (t - CORE) * (half - CORE) / (SOURCE - CORE) : t - (SOURCE - half);
const sign = (v: number) => v < 0 ? -1 : 1;
export interface FitMap {
  /** Map a point of the source part. */
  point(p: Vec3): Vec3;
  /** Map a point rigidly with station k's axis: the axis position maps, the offset from it is kept (round pins). */
  alongAxis(p: Vec3, k: number): Vec3;
  /** Map a small rigid piece (screw, washer) with its centre. */
  rigid(p: Vec3, center: Vec3): Vec3;
  box(b: LocalBox): LocalBox;
  /** New station z offsets (source order). */
  offsets: number[];
  /** Pin radius scale for rack-crossing hardware. */
  pinScale: number;
}
export function fitMap(frame: FitFrame, fit: MountFit): FitMap {
  const c = frame.center, n = frame.normal, a: Vec3 = [-n[1], n[0], 0];
  const hn = fit.depth / 2, ha = fit.width / 2;
  if (!(hn > CORE && ha > CORE)) throw Error('Rack tube is too small for the built-in attachment sleeves.');
  const source = frame.stations.map(s => s.z), offsets = fitStationOffsets(source, fit.pitch);
  const knots = source.map((z, i) => [z, offsets[i]]).sort((x, y) => x[0] - y[0]);
  const fz = (z: number) => {
    if (z <= knots[0][0] + CORE) return z + knots[0][1] - knots[0][0];
    for (let i = 0; i < knots.length - 1; i++) {
      const [z0, n0] = knots[i], [z1, n1] = knots[i + 1];
      if (z <= z1 - CORE) return z0 + CORE >= z ? z + n0 - z0 : n0 + CORE + (z - z0 - CORE) * (n1 - n0 - 2 * CORE) / (z1 - z0 - 2 * CORE);
      if (z <= z1 + CORE) return z + n1 - z1;
    }
    const [zl, nl] = knots[knots.length - 1]; return z + nl - zl;
  };
  const point = (p: Vec3): Vec3 => {
    const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], u = d[0] * n[0] + d[1] * n[1], v = d[0] * a[0] + d[1] * a[1];
    const U = SOURCE - hn + sign(u) * band(Math.abs(u), hn), V = frame.wrap ? sign(v) * band(Math.abs(v), ha) : v;
    return [c[0] + n[0] * U + a[0] * V, c[1] + n[1] * U + a[1] * V, c[2] + fz(d[2])];
  };
  const offset = (p: Vec3, q: Vec3): Vec3 => { const m = point(q); return [m[0] + p[0] - q[0], m[1] + p[1] - q[1], m[2] + p[2] - q[2]]; };
  const alongAxis = (p: Vec3, k: number) => {
    const s = frame.stations[k], o: Vec3 = [c[0], c[1], c[2] + s.z], t = (p[0] - o[0]) * s.axis[0] + (p[1] - o[1]) * s.axis[1] + (p[2] - o[2]) * s.axis[2];
    return offset(p, [o[0] + s.axis[0] * t, o[1] + s.axis[1] * t, o[2] + s.axis[2] * t]);
  };
  const box = (b: LocalBox): LocalBox => {
    const x = point(b.min), y = point(b.max);
    return { min: [0, 1, 2].map(i => Math.min(x[i], y[i])) as Vec3, max: [0, 1, 2].map(i => Math.max(x[i], y[i])) as Vec3 };
  };
  return { point, alongAxis, rigid: offset, box, offsets, pinScale: fit.pin / frame.pin };
}
