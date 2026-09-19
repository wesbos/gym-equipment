/** Specialty-bar geometry description, shared by the metadata (footprint, rest pose, park height) and the Manifold
 * builder (../parts/specialty-bars.ts). Pure math: no Manifold imports, safe for the main bundle.
 *
 * Every solid is a `Prim`: a planar section swept along a path (straight rods, S-cambers, bows, pad blocks, arms)
 * or the convex hull of a point set (sheared frame tubes, plates). Each prim has an exact support function, so the
 * floor rest pose and the footprint come from the same ideal geometry the builder meshes (mesh vertices lie on or
 * inside it, so the built bounds sit within a fraction of a millimetre of the footprint).
 *
 * "Worn" frame: X along the bar, origin on the shaft axis at the bar centre, -Y forward (towards the handles),
 * +Z up, i.e. the bar as it sits on the lifter's back. The floor pose rotates the worn frame about X by θ and lifts
 * it by `axisZ`, so the shaft axis always stays on local Y = 0 (where rack cradles hold it). */
export type V3 = [number, number, number];
export type V2 = [number, number];
/** Section in (n, b) coordinates: n along the path normal N = B × T, b along the fixed binormal B. */
export type Section = { circle: number; seg?: number } | { poly: V2[]; round?: number; seg?: number };
export interface SweepPrim { kind: 'sweep'; name: string; mat: string; density: number; path: V3[]; B: V3; section: Section; bevel?: number }
export interface HullPrim { kind: 'hull'; name: string; mat: string; density: number; points: V3[] }
export type Prim = SweepPrim | HullPrim;
export const STEEL = 7.85e-6, FOAM = 1.2e-7, RUBBER = 1.2e-6; // kg/mm³

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => mul(a, 1 / Math.hypot(...a));
export const inch = (v: number) => v * 25.4;
const X: V3 = [1, 0, 0], Z: V3 = [0, 0, 1];

/** Rounded rectangle section: inner rectangle plus a round offset, so the outer size is exactly w × h. */
export const rrect = (w: number, h: number, round: number, at: V2 = [0, 0]): Section => {
  const r = Math.min(round, w / 2 - .01, h / 2 - .01), a = w / 2 - r, c = h / 2 - r;
  return { poly: [[at[0] - a, at[1] - c], [at[0] + a, at[1] - c], [at[0] + a, at[1] + c], [at[0] - a, at[1] + c]], round: r, seg: 32 };
};
/** Straight rod a→b. B is chosen perpendicular to the rod (X for rods across the bar, else Z projected). */
export function rod(name: string, mat: string, a: V3, b: V3, r: number, density = STEEL, seg = 40): SweepPrim {
  const t = norm(sub(b, a)), ref = Math.abs(t[0]) < .9 ? X : Z;
  return { kind: 'sweep', name, mat, density, path: [a, b], B: norm(sub(ref, mul(t, dot(ref, t)))), section: { circle: r, seg } };
}
/** Rod along X at (y, z). */
export const xrod = (name: string, mat: string, x0: number, x1: number, r: number, y = 0, z = 0, density = STEEL, seg = 40) =>
  rod(name, mat, [x0, y, z], [x1, y, z], r, density, seg);
/** Block extruded along X from x0 to x1 with a section given in absolute (y, z). */
export const xblock = (name: string, mat: string, x0: number, x1: number, section: Section, density = STEEL, bevel?: number): SweepPrim =>
  ({ kind: 'sweep', name, mat, density, path: [[x0, 0, 0], [x1, 0, 0]], B: Z, section, bevel });
/** Straight block along a YZ-plane direction: section (n, b) with b along X. */
export const slab = (name: string, mat: string, a: V3, b: V3, section: Section, density = STEEL, bevel?: number): SweepPrim =>
  ({ kind: 'sweep', name, mat, density, path: [a, b], B: X, section, bevel });
export const hull = (name: string, mat: string, points: V3[], density = STEEL): HullPrim => ({ kind: 'hull', name, mat, density, points });
/** Axis-aligned box as a hull prim. */
export const box = (name: string, mat: string, min: V3, max: V3, density = STEEL) =>
  hull(name, mat, [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]] as V3), density);

/** Resample a dense polyline to `n` equal arc-length segments (n + 1 points). */
export function resample(points: V3[], n: number): V3[] {
  const acc = [0]; for (let i = 1; i < points.length; i++) acc.push(acc[i - 1] + Math.hypot(...sub(points[i], points[i - 1])));
  const total = acc.at(-1)!, out: V3[] = []; let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = total * k / n; while (j < acc.length - 2 && acc[j + 1] < s) j++;
    const f = acc[j + 1] > acc[j] ? (s - acc[j]) / (acc[j + 1] - acc[j]) : 0;
    out.push(add(points[j], mul(sub(points[j + 1], points[j]), Math.min(1, Math.max(0, f)))));
  }
  return out;
}
/** Tube along a planar curve given densely; B is the curve plane normal. Resampled to ~`step` mm segments. */
export function tube(name: string, mat: string, dense: V3[], B: V3, r: number, density = STEEL, step = 7, seg = 40): SweepPrim {
  let len = 0; for (let i = 1; i < dense.length; i++) len += Math.hypot(...sub(dense[i], dense[i - 1]));
  return { kind: 'sweep', name, mat, density, path: resample(dense, Math.max(1, Math.ceil(len / step))), B: norm(B), section: { circle: r, seg } };
}

/** Frames along a sweep: tangent T and normal N = B × T at each path point. */
export function sweepFrames(p: SweepPrim) {
  const P = p.path, n = P.length - 1;
  return P.map((_, i) => { const T = norm(sub(P[Math.min(n, i + 1)], P[Math.max(0, i - 1)])); return { P: P[i], T, N: norm(cross(p.B, T)) }; });
}
const polyArea = (poly: V2[]) => poly.reduce((s, [x, y], i) => { const [u, v] = poly[(i + 1) % poly.length]; return s + x * v - u * y; }, 0) / 2;
const polyPerimeter = (poly: V2[]) => poly.reduce((s, [x, y], i) => { const [u, v] = poly[(i + 1) % poly.length]; return s + Math.hypot(u - x, v - y); }, 0);
export function sectionArea(s: Section) { return 'circle' in s ? Math.PI * s.circle ** 2 : Math.abs(polyArea(s.poly)) + polyPerimeter(s.poly) * (s.round ?? 0) + Math.PI * (s.round ?? 0) ** 2; }
const sectionCentroid = (s: Section): V2 => 'circle' in s ? [0, 0] : [s.poly.reduce((a, p) => a + p[0], 0) / s.poly.length, s.poly.reduce((a, p) => a + p[1], 0) / s.poly.length];

/** Ideal support h(u) = max over the solid of x·u, for any unit direction u. */
export function support(p: Prim, u: V3): number {
  if (p.kind === 'hull') return Math.max(...p.points.map(q => dot(q, u)));
  const frames = sweepFrames(p), s = p.section;
  const at = (f: { P: V3; T: V3; N: V3 }, grow: number) => {
    const perp = Math.sqrt(Math.max(0, 1 - dot(f.T, u) ** 2)), c = dot(f.P, u);
    if ('circle' in s) return c + (s.circle + grow) * perp;
    const nu = dot(f.N, u), bu = dot(p.B, u);
    return c + Math.max(...s.poly.map(([n, b]) => n * nu + b * bu)) + Math.max(0, (s.round ?? 0) + grow) * perp;
  };
  let best = -Infinity;
  if (p.bevel) {
    // Hull of the full-round section shortened by `bevel` at both ends and the (round − bevel) section at full length.
    const b = p.bevel, [f0, f1] = [frames[0], frames.at(-1)!];
    for (const f of [{ ...f0, P: add(f0.P, mul(f0.T, b)) }, { ...f1, P: sub(f1.P, mul(f1.T, b)) }]) best = Math.max(best, at(f, 0));
    for (const f of [f0, f1]) best = Math.max(best, at(f, -b));
    return best;
  }
  for (const f of frames) best = Math.max(best, at(f, 0));
  return best;
}
/** Mass and centre of mass (worn frame) of a prim set. */
export function massProperties(prims: readonly Prim[]) {
  let m = 0, c: V3 = [0, 0, 0];
  for (const p of prims) {
    if (p.kind === 'hull') {
      const lo = [0, 1, 2].map(k => Math.min(...p.points.map(q => q[k]))), hi = [0, 1, 2].map(k => Math.max(...p.points.map(q => q[k])));
      const mass = p.density * (hi[0] - lo[0]) * (hi[1] - lo[1]) * (hi[2] - lo[2]) * .6, mid = mul(p.points.reduce((a, q) => add(a, q), [0, 0, 0] as V3), 1 / p.points.length);
      m += mass; c = add(c, mul(mid, mass)); continue;
    }
    const area = sectionArea(p.section), [cn, cb] = sectionCentroid(p.section), f = sweepFrames(p);
    for (let i = 1; i < f.length; i++) {
      const ds = Math.hypot(...sub(f[i].P, f[i - 1].P)), mass = p.density * area * ds;
      const mid = add(mul(add(f[i].P, f[i - 1].P), .5), add(mul(norm(add(f[i].N, f[i - 1].N)), cn), mul(p.B, cb)));
      m += mass; c = add(c, mul(mid, mass));
    }
  }
  return { mass: m, center: mul(c, 1 / m) };
}

export interface RestPose { theta: number; axisZ: number; min: V3; max: V3; mass: number }
/** Rotation of the worn frame about X by θ (radians): y' = y cosθ − z sinθ, z' = y sinθ + z cosθ. */
export const rotX = (theta: number, [x, y, z]: V3): V3 => { const c = Math.cos(theta), s = Math.sin(theta); return [x, y * c - z * s, y * s + z * c]; };
/** Floor rest: a roll about the bar axis where the centre-of-mass height above the lowest point is a local minimum
 * (a stable pose on a flat floor), then the lift that puts that lowest point on the floor. With `prefer` (radians)
 * the stable rest nearest that roll wins (e.g. camber and handles lying towards the front, logos up); otherwise the
 * lowest one, ties preferring the smallest roll, then a positive one. Returns the posed bounds. */
export function restPose(prims: readonly Prim[], prefer?: number): RestPose {
  const { mass, center } = massProperties(prims);
  const S = (u: V3) => Math.max(...prims.map(p => support(p, u)));
  const lowest = (t: number) => S([0, -Math.sin(t), -Math.cos(t)]); // depth of the lowest point below the axis
  const h = (t: number) => rotX(t, center)[2] + lowest(t);
  const steps = 360, dt = 2 * Math.PI / steps, samples = Array.from({ length: steps }, (_, i) => -Math.PI + i * dt), values = samples.map(h);
  const candidates: { t: number; v: number }[] = [];
  for (let i = 0; i < steps; i++) {
    if (values[i] > values[(i + steps - 1) % steps] + 1e-9 || values[i] > values[(i + 1) % steps] + 1e-9) continue;
    let a = samples[i] - dt, b = samples[i] + dt; const g = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 60; k++) { const c = b - g * (b - a), d = a + g * (b - a); if (h(c) < h(d)) b = d; else a = c; }
    let t = (a + b) / 2; t = Math.atan2(Math.sin(t), Math.cos(t)); candidates.push({ t, v: h(t) });
  }
  const best = Math.min(...candidates.map(c => c.v)), gap = (t: number) => Math.abs(Math.atan2(Math.sin(t - prefer!), Math.cos(t - prefer!)));
  const pick = prefer === undefined ? candidates.filter(c => c.v < best + 1e-3).sort((p, q) => {
    const d = Math.abs(p.t) - Math.abs(q.t); return Math.abs(d) > 1e-6 ? d : q.t - p.t;
  })[0] : [...candidates].sort((p, q) => gap(p.t) - gap(q.t))[0];
  const theta = Math.abs(pick.t) < 1e-7 ? 0 : pick.t, axisZ = lowest(theta), c = Math.cos(theta), s = Math.sin(theta);
  const min: V3 = [-S([-1, 0, 0]), -S([0, -c, s]), 0], max: V3 = [S([1, 0, 0]), S([0, c, -s]), axisZ + S([0, s, c])];
  return { theta, axisZ, min, max, mass };
}
/** Worn-frame point → posed local frame (floor under the footprint's shaft axis, z = 0 on the floor). */
export const posePoint = (pose: Pick<RestPose, 'theta' | 'axisZ'>, p: V3): V3 => { const q = rotX(pose.theta, p); return [q[0], q[1], q[2] + pose.axisZ]; };
