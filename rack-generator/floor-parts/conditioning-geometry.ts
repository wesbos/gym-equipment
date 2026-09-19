/** Pure swept-tube geometry for the conditioning family (no Manifold): rope, cable, bent tube and wheel meshes.
 * The metadata file computes footprints from these exact vertices and the builders turn the same meshes into Manifolds,
 * so the build bounding box and the footprint can never drift. Millimetres, Z up. */
export type V3 = [number, number, number];
export interface Mesh3 { pos: number[]; tri: number[] }
/** Parallel-transported frame at a path station: tangent t, normal u (starts closest to `up`), binormal v = t × u, arc length s. */
export interface Frame { p: V3; t: V3; u: V3; v: V3; s: number }
export interface Box3 { min: V3; max: V3 }
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => mul(a, 1 / len(a));
export const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** Parallel-transport frames along a polyline. */
export function frames(input: readonly V3[], up: V3 = [0, 0, 1]): Frame[] {
  const pts = input.filter((p, i) => !i || len(sub(p, input[i - 1])) > 1e-6);
  if (pts.length < 2) throw Error('A swept path needs two distinct points.');
  const out: Frame[] = []; let prev: V3 | undefined, s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const inc = i ? unit(sub(p, a)) : undefined, out2 = i < pts.length - 1 ? unit(sub(b, p)) : undefined;
    const t = inc && out2 ? (len(add(inc, out2)) > 1e-9 ? unit(add(inc, out2)) : out2) : (inc ?? out2)!;
    let basis = prev ?? up; if (Math.abs(dot(basis, t)) > .999) basis = Math.abs(t[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
    const u = unit(sub(basis, mul(t, dot(basis, t)))), v = cross(t, u);
    if (i) s += len(sub(p, a));
    out.push({ p, t, u, v, s }); prev = u;
  }
  return out;
}
/** Closed, capped tube along `path`. `radius(frame, phi)` gives the section radius at angle phi (0 = u, pi/2 = v). */
export function sweep(path: readonly V3[] | readonly Frame[], sides: number, radius: (f: Frame, phi: number, i: number) => number, up?: V3, closed = false): Mesh3 & { frames: Frame[] } {
  const fr = (path.length && 'u' in (path[0] as object)) ? path as Frame[] : frames(path as V3[], up);
  const pos: number[] = [], tri: number[] = [], n = fr.length;
  fr.forEach((f, i) => {
    for (let j = 0; j < sides; j++) {
      const phi = 2 * Math.PI * j / sides, r = radius(f, phi, i), c = Math.cos(phi) * r, sn = Math.sin(phi) * r;
      pos.push(f.p[0] + f.u[0] * c + f.v[0] * sn, f.p[1] + f.u[1] * c + f.v[1] * sn, f.p[2] + f.u[2] * c + f.v[2] * sn);
      if (closed || i < n - 1) { const a = i * sides + j, b = i * sides + (j + 1) % sides, next = ((i + 1) % n) * sides - i * sides; tri.push(a, b, b + next, a, b + next, a + next); }
    }
  });
  if (!closed) {
    const start = pos.length / 3, last = (n - 1) * sides;
    pos.push(...fr[0].p, ...fr.at(-1)!.p);
    for (let j = 0; j < sides; j++) tri.push(start, (j + 1) % sides, j, start + 1, last + j, last + (j + 1) % sides);
  }
  return { pos, tri, frames: fr };
}
/** Closed ring sweep (tyre, grommet): frames around a circle of radius rc about `axis` through `c`, starting at `start` (unit, ⟂ axis).
 * Frame u points radially outward, v along the axis side (t × u); `stations` samples around. */
export function ringFrames(c: V3, axis: V3, start: V3, rc: number, stations: number): Frame[] {
  const a = unit(axis), e0 = unit(sub(start, mul(a, dot(start, a)))), e1 = cross(a, e0);
  return Array.from({ length: stations }, (_, i) => {
    const th = 2 * Math.PI * i / stations, radial = add(mul(e0, Math.cos(th)), mul(e1, Math.sin(th))), t = add(mul(e0, -Math.sin(th)), mul(e1, Math.cos(th)));
    return { p: add(c, mul(radial, rc)), t, u: radial, v: cross(t, radial), s: th * rc };
  });
}
/** Round tube of constant radius. */
export const tube = (path: readonly V3[], r: number, sides = 24, up?: V3) => sweep(path, sides, () => r, up);
/** Solid of revolution about the straight axis a→b; `profile` maps distance along the axis (0..|b-a|) to radius. */
export function lathe(a: V3, b: V3, stations: readonly number[], profile: (x: number, phi: number) => number, sides = 48, up?: V3): Mesh3 & { frames: Frame[] } {
  const d = unit(sub(b, a)), fr = frames([a, b], up), { u, v } = fr[0];
  const pts: Frame[] = [...new Set(stations)].sort((x, y) => x - y).map(x => ({ p: add(a, mul(d, x)), t: d, u, v, s: x }));
  return sweep(pts, sides, (f, phi) => profile(f.s, phi));
}
/** Merge several meshes into one (disjoint closed components stay a valid manifold). */
export function merge(meshes: readonly Mesh3[]): Mesh3 {
  const pos: number[] = [], tri: number[] = [];
  for (const m of meshes) { const o = pos.length / 3; pos.push(...m.pos); for (const t of m.tri) tri.push(t + o); }
  return { pos, tri };
}
export function translateMesh(m: Mesh3, d: V3): Mesh3 { return { tri: m.tri, pos: m.pos.map((v, i) => v + d[i % 3]) }; }
export function meshBounds(meshes: readonly Mesh3[], boxes: readonly Box3[] = []): Box3 {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const m of meshes) for (let i = 0; i < m.pos.length; i++) { const k = i % 3; if (m.pos[i] < min[k]) min[k] = m.pos[i]; if (m.pos[i] > max[k]) max[k] = m.pos[i]; }
  for (const b of boxes) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], b.min[k]); max[k] = Math.max(max[k], b.max[k]); }
  return { min, max };
}
/** Polyline through control points with circular fillets of radius r at every interior corner; straight runs subdivided to `step`. */
export function filleted(ctrl: readonly V3[], r: number, arcSeg = 10, step = Infinity): V3[] {
  const out: V3[] = [ctrl[0]];
  const run = (to: V3) => { const from = out.at(-1)!, n = Math.max(1, Math.ceil(len(sub(to, from)) / step)); for (let i = 1; i <= n; i++) out.push(lerp3(from, to, i / n)); };
  for (let i = 1; i < ctrl.length - 1; i++) {
    const p = ctrl[i], a = unit(sub(ctrl[i - 1], p)), b = unit(sub(ctrl[i + 1], p)), ang = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    if (Math.PI - ang < 1e-4) { run(p); continue; }
    const tl = Math.min(r / Math.tan(ang / 2), len(sub(ctrl[i - 1], p)) * .49, len(sub(ctrl[i + 1], p)) * .49), rr = tl * Math.tan(ang / 2);
    const p0 = add(p, mul(a, tl)), p1 = add(p, mul(b, tl)), c = add(p, mul(unit(add(a, b)), rr / Math.sin(ang / 2)));
    run(p0);
    const e0 = sub(p0, c), e1 = sub(p1, c), sweepAng = Math.PI - ang;
    for (let k = 1; k <= arcSeg; k++) {
      const t = k / arcSeg, s0 = Math.sin((1 - t) * sweepAng) / Math.sin(sweepAng), s1 = Math.sin(t * sweepAng) / Math.sin(sweepAng);
      out.push(add(c, add(mul(e0, s0), mul(e1, s1))));
    }
  }
  run(ctrl.at(-1)!);
  return out;
}
/** Arc length of a polyline. */
export const pathLength = (pts: readonly V3[]) => pts.reduce((s, p, i) => i ? s + len(sub(p, pts[i - 1])) : 0, 0);
/** Tiny LRU keyed by a string, for footprint/build reuse of the same layout. */
export function memo<T>(size: number, make: (key: string) => T) {
  const cache = new Map<string, T>();
  return (key: string) => {
    const hit = cache.get(key); if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
    const v = make(key); cache.set(key, v); if (cache.size > size) cache.delete(cache.keys().next().value!); return v;
  };
}
