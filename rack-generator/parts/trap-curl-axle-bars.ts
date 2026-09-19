/** Trap, curl, axle and multi-grip bars (#109): Manifold builders for ../floor-parts/trap-curl-axle-bars.ts.
 * Five shared builders (axle, curl, open trap, TB-2 hex, multi-grip) read the published specs there. Each builds in a
 * local frame (X along the bar, sleeve axis on local z = 0 or at the jack height), groups solids by material, then
 * centres the footprint on the origin with the lowest point on the floor. Intermediates are owned and deleted. */
import type { MaterialRole } from '../appearance.ts';
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec2, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  MAT, PARTS, CURL_SPECS, OPEN_TRAP_SPECS, MULTI_GRIP_SPECS, TB2, axleSpec, openTrapLayout, multiGripHandles, multiGripLength,
  type AxleSpec, type CurlId, type CurlSpec, type Mat, type MultiGripId, type MultiGripSpec, type OpenTrapId, type OpenTrapSpec,
} from '../floor-parts/trap-curl-axle-bars.ts';

const DEG = Math.PI / 180;
type P2 = readonly [number, number];
interface Group { role: MaterialRole; mat: Mat; solids: Manifold[]; authored?: boolean }
/** Owned-solid kit: every intermediate is tracked and deleted in `finish`/`dispose`; only returned solids survive. */
class Kit {
  owned: (Manifold | CrossSection)[] = [];
  groups = new Map<string, Group>();
  constructor(readonly api: ManifoldAPI) {}
  k<T extends Manifold | CrossSection>(s: T): T { this.owned.push(s); return s; }
  move(s: Manifold, v: Vec3) { return this.k(s.translate(v)); }
  box(min: Vec3, max: Vec3) { return this.move(this.k(this.api.Manifold.cube([max[0] - min[0], max[1] - min[1], max[2] - min[2]])), min); }
  /** Cylinder between two points (segment counts are multiples of 4 so axis-aligned extents are exact). */
  cyl(a: Vec3, b: Vec3, r: number, seg = 32) {
    const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...d);
    const c = this.k(this.api.Manifold.cylinder(len, r, r, seg));
    return this.move(this.k(c.rotate([0, Math.acos(d[2] / len) / DEG, Math.atan2(d[1], d[0]) / DEG])), a);
  }
  cx(x0: number, x1: number, r: number, y = 0, z = 0, seg = 32) { return this.cyl([x0, y, z], [x1, y, z], r, seg); }
  sphere(p: Vec3, r: number, seg = 32) { return this.move(this.k(this.api.Manifold.sphere(r, seg)), p); }
  /** Round tube through points: cylinders plus joint spheres. */
  tube(pts: readonly Vec3[], r: number, seg = 32) {
    const out: Manifold[] = [];
    for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]) > 1e-6) out.push(this.cyl(pts[i - 1], pts[i], r, seg));
    for (const p of pts.slice(1, -1)) out.push(this.sphere(p, r, seg));
    return out;
  }
  /** Swept round tube along a planar polyline (plane normal `n`): one mesh with mitred rings and flat end caps. */
  sweep(pts: readonly Vec3[], r: number, n: Vec3, seg = 32): Manifold {
    const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
    const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const P = pts.filter((p, i) => i === 0 || Math.hypot(...sub(p, pts[i - 1])) > 1e-6), m = P.length, verts: number[] = [], tris: number[] = [];
    const dirs = P.slice(1).map((p, i) => norm(sub(p, P[i])));
    for (let i = 0; i < m; i++) {
      const a = dirs[Math.min(i, m - 2)], prev = dirs[Math.max(0, i - 1)], T = i === 0 || i === m - 1 ? a : norm([prev[0] + a[0], prev[1] + a[1], prev[2] + a[2]]);
      const inc = i === 0 ? a : prev, B = norm(cross(inc, n));
      for (let j = 0; j < seg; j++) {
        const f = 2 * Math.PI * j / seg, q0: Vec3 = [P[i][0] + r * (Math.cos(f) * n[0] + Math.sin(f) * B[0]), P[i][1] + r * (Math.cos(f) * n[1] + Math.sin(f) * B[1]), P[i][2] + r * (Math.cos(f) * n[2] + Math.sin(f) * B[2])];
        const s = -dot(sub(q0, P[i]), T) / dot(inc, T); verts.push(q0[0] + inc[0] * s, q0[1] + inc[1] * s, q0[2] + inc[2] * s);
      }
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; tris.push(a, b, d, a, d, c);
    }
    const c0 = m * seg, c1 = c0 + 1; verts.push(...P[0], ...P[m - 1]);
    for (let j = 0; j < seg; j++) { const j1 = (j + 1) % seg; tris.push(c0, j1, j, c1, (m - 1) * seg + j, (m - 1) * seg + j1); }
    const make = (flip: boolean) => { const tv = flip ? tris.map((_, i) => tris[i - i % 3 + 2 - i % 3]) : tris;
      return this.k(new this.api.Manifold(new this.api.Mesh({ numProp: 3, vertProperties: new Float32Array(verts), triVerts: new Uint32Array(tv) }))); };
    let solid = make(false); if (solid.status() !== 'NoError' || solid.volume() < 0) solid = make(true);
    return solid;
  }
  /** Closed polygon (x, y) extruded along Z from z0 to z1. */
  prism(loop: readonly Vec2[], z0: number, z1: number) { return this.move(this.k(this.k(new this.api.CrossSection([loop as Vec2[]], 'NonZero')).extrude(z1 - z0)), [0, 0, z0]); }
  /** Closed polygon in the XZ plane (u = x, v = z) extruded across Y from y0 to y1. */
  prismXZ(loop: readonly Vec2[], y0: number, y1: number) { return this.move(this.k(this.prism(loop, 0, y1 - y0).rotate([90, 0, 0])), [0, y1, 0]); }
  /** Closed polygon in the YZ plane (u = y, v = z) extruded along X from x0 to x1. */
  prismYZ(loop: readonly Vec2[], x0: number, x1: number) { return this.move(this.k(this.k(this.prism(loop, 0, x1 - x0).rotate([90, 0, 0])).rotate([0, 0, 90])), [x0, 0, 0]); }
  /** Mitred square-tube ring around a closed centreline (x, y), `w` wide, `h` tall, centred on z. */
  ring(loop: readonly Vec2[], w: number, h: number, z = 0) {
    const c = this.k(new this.api.CrossSection([loop as Vec2[]], 'NonZero')), ring = this.k(this.k(c.offset(w / 2, 'Miter', 4)).subtract(this.k(c.offset(-w / 2, 'Miter', 4))));
    return this.move(this.k(ring.extrude(h)), [0, 0, z - h / 2]);
  }
  union(list: Manifold[]) { return list.length === 1 ? list[0] : this.k(this.api.Manifold.union(list)); }
  cut(s: Manifold, holes: Manifold[]) { return holes.length ? this.k(this.api.Manifold.difference([s, ...holes])) : s; }
  add(name: string, role: MaterialRole, mat: Mat, solids: Manifold | Manifold[], authored = false) {
    const g = this.groups.get(name) ?? { role, mat, solids: [], authored }; g.solids.push(...[solids].flat()); this.groups.set(name, g);
  }
  /** Union each material group, optionally rotate (flat trap-bar pose), then centre the footprint and drop to the floor. */
  finish(rotate?: Vec3): SolidPart[] {
    const merged = [...this.groups].map(([name, g]) => { let s = this.union(g.solids); if (rotate) s = this.k(s.rotate(rotate)); return { name, g, s }; });
    const all = this.union(merged.map(m => m.s)), b = all.boundingBox(), shift: Vec3 = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]];
    const out: SolidPart[] = merged.map(({ name, g, s }) => ({ name, solid: s.translate(shift), role: g.role, ...g.mat, ...(g.authored ? { authoredFastenerFinish: true } : {}) }));
    for (const p of out) if (p.solid.isEmpty() || p.solid.status() !== 'NoError') { for (const q of out) q.solid.delete(); throw Error(`Invalid bar solid: ${p.name}`); }
    return out;
  }
  dispose() { for (const s of this.owned.reverse()) s.delete(); this.owned = []; }
}
const run = (api: ManifoldAPI, build: (k: Kit) => SolidPart[]) => { const k = new Kit(api); try { return build(k); } finally { k.dispose(); } };

/** Rounds interior corners of a 2D polyline with arcs; `seg[i]` maps piece i→i+1 to its source segment (−1 on arcs). */
export function filletPath(pts: readonly P2[], radius: number, stepDeg = 12) {
  const out: Vec2[] = [[pts[0][0], pts[0][1]]], seg: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const [A, B, C] = [pts[i - 1], pts[i], pts[i + 1]], la = Math.hypot(A[0] - B[0], A[1] - B[1]), lc = Math.hypot(C[0] - B[0], C[1] - B[1]);
    const u: Vec2 = [(A[0] - B[0]) / la, (A[1] - B[1]) / la], v: Vec2 = [(C[0] - B[0]) / lc, (C[1] - B[1]) / lc];
    const theta = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));
    if (radius <= 0 || Math.PI - theta < 1e-4) { out.push([B[0], B[1]]); seg.push(i - 1); continue; }
    const t = Math.min(radius / Math.tan(theta / 2), la / 2, lc / 2), r = t * Math.tan(theta / 2);
    const P: Vec2 = [B[0] + u[0] * t, B[1] + u[1] * t], Q: Vec2 = [B[0] + v[0] * t, B[1] + v[1] * t];
    const bis = Math.hypot(u[0] + v[0], u[1] + v[1]), O: Vec2 = [B[0] + (u[0] + v[0]) / bis * r / Math.sin(theta / 2), B[1] + (u[1] + v[1]) / bis * r / Math.sin(theta / 2)];
    const a0 = Math.atan2(P[1] - O[1], P[0] - O[0]); let a1 = Math.atan2(Q[1] - O[1], Q[0] - O[0]), da = a1 - a0;
    if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; a1 = a0 + da;
    out.push(P); seg.push(i - 1);
    const n = Math.max(2, Math.ceil(Math.abs(da) / (stepDeg * DEG)));
    for (let j = 1; j <= n; j++) { const a = a0 + da * j / n; out.push(j === n ? Q : [O[0] + r * Math.cos(a), O[1] + r * Math.sin(a)]); seg.push(-1); }
  }
  out.push([pts.at(-1)![0], pts.at(-1)![1]]); seg.push(pts.length - 2);
  return { pts: out, seg };
}
/** Mirror a centre-out half profile (x ≥ 0) into a full left-to-right polyline; `half[i]` is each segment's source index. */
function mirrorHalf(half: readonly P2[]) {
  const left = [...half].reverse().map(([x, y]) => [-x, y] as Vec2), pts: Vec2[] = [...left.slice(0, -1), ...half.map(([x, y]) => [x, y] as Vec2)];
  const n = half.length - 1, halfSeg = pts.slice(1).map((_, i) => i < n ? n - 1 - i : i - n);
  return { pts, halfSeg };
}
/** Closed outline of a polyline strip `half` thick either side, mitred at the joints (for rect/plate rails in XZ). */
function strip(pts: readonly Vec2[], half: number): Vec2[] {
  const normals = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    let n: Vec2 = [-dy / l, dx / l];
    if (i > 0 && i < pts.length - 1) { // mitre: scale the bisector normal by 1/cos(half turn)
      const d0 = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]], l0 = Math.hypot(d0[0], d0[1]), n0: Vec2 = [-d0[1] / l0, d0[0] / l0];
      const cos = n[0] * n0[0] + n[1] * n0[1]; n = [n[0] / cos, n[1] / cos];
    }
    return n;
  });
  return [...pts.map((p, i) => [p[0] + normals[i][0] * half, p[1] + normals[i][1] * half] as Vec2), ...pts.map((p, i) => [p[0] - normals[i][0] * half, p[1] - normals[i][1] * half] as Vec2).reverse()];
}
const lerpZ = (pts: readonly P2[], x: number) => { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]]; if (x >= Math.min(a[0], b[0]) - 1e-9 && x <= Math.max(a[0], b[0]) + 1e-9) return a[0] === b[0] ? Math.max(a[1], b[1]) : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return pts.at(-1)![1]; };
const mirrorQuarter = (q: readonly P2[]): Vec2[] => {
  const full: Vec2[] = [...q.map(([x, y]) => [x, y] as Vec2), ...[...q].reverse().map(([x, y]) => [-x, y] as Vec2), ...q.map(([x, y]) => [-x, -y] as Vec2), ...[...q].reverse().map(([x, y]) => [x, -y] as Vec2)];
  return full.filter((p, i) => { const n = full[(i + 1) % full.length]; return Math.hypot(p[0] - n[0], p[1] - n[1]) > 1e-6; });
};
/** Sleeve end face: an inset disk that reads as the end cap / pipe bore. */
function endCaps(k: Kit, half: number, r: number, mat: Mat, name = 'Sleeve end caps', z = 0) {
  k.add(name, 'source', mat, [-1, 1].map(s => k.cx(s * (half - 1), s * half, r, 0, z, 32)));
}

// ─── Axles ─────────────────────────────────────────────────────────────────────────────────────
export function buildAxle(api: ManifoldAPI, s: AxleSpec): SolidPart[] {
  return run(api, k => {
    const g = s.grip / 2, c = g + s.collarWidth, L = s.length / 2;
    k.add('2" axle grip (unknurled)', 'rod', s.mat, k.cx(-g - 1, g + 1, s.shaftDia / 2, 0, 0, 48));
    for (const d of [-1, 1]) {
      // Twin-flange welded collar with a groove between the rings.
      const w = s.collarWidth; k.add('Raised collars', 'source', s.mat, [k.cx(d * g, d * (g + w * .42), s.collarDia / 2, 0, 0, 48), k.cx(d * (g + w * .58), d * c, s.collarDia / 2, 0, 0, 48), k.cx(d * g, d * c, s.collarDia / 2 - 4, 0, 0, 48)]);
      k.add('Non-rotating sleeves', 'sleeve', s.mat, k.cx(d * (c - 1), d * (L - 1), s.sleeveDia / 2, 0, 0, 48));
    }
    endCaps(k, L, s.sleeveDia / 2 - (s.hollow ? 4 : 5), s.cap, s.hollow ? 'Open tube ends' : 'Gold end badges');
    if (s.rings) k.add('Yellow grip ring marks', 'source', MAT.fringeYellow, s.rings.flatMap(([x, w]) => [-1, 1].map(d => k.cx(d * x - w / 2, d * x + w / 2, s.shaftDia / 2 + .2, 0, 0, 48))));
    return k.finish();
  });
}

// ─── Curl bars ─────────────────────────────────────────────────────────────────────────────────
export function buildCurlBar(api: ManifoldAPI, s: CurlSpec, p: NumericParams): SolidPart[] {
  const f = s.finishes[p.finish ?? 0]; if (!f) throw Error('Unsupported curl bar finish.');
  return run(api, k => {
    const r = s.shaftDia / 2, B = s.between / 2, L = s.length / 2, { pts, halfSeg } = mirrorHalf(s.profile), path = filletPath(pts, s.bend);
    const at = (q: Vec2): Vec3 => [q[0], q[1], 0], plain: Manifold[] = [], knurl: Manifold[] = [];
    // Shaft: one swept run per stretch of plain or knurled pieces (straight grips knurled by source segment, arcs plain).
    const pts3 = path.pts.map(at); pts3[0][0] -= 2; pts3.at(-1)![0] += 2;
    const kind = path.seg.map(src => src >= 0 && s.knurl.includes(halfSeg[src]));
    for (let i = 0; i < kind.length;) { let j = i; while (j + 1 < kind.length && kind[j + 1] === kind[i]) j++; const run = pts3.slice(i, j + 2); if (Math.hypot(run.at(-1)![0] - run[0][0], run.at(-1)![1] - run[0][1]) > 1e-6) (kind[i] ? knurl : plain).push(k.sweep(run, r, [0, 0, 1], 32)); i = j + 1; }
    k.add('Cambered shaft', 'rod', f.shaft, plain);
    k.add('Knurled cambered grips', 'handle', f.knurl, knurl);
    if (s.logoBand) k.add('Smooth logo centre', 'rod', { ...f.shaft, roughness: f.shaft.roughness + .15 }, k.cx(-s.logoBand / 2, s.logoBand / 2, r + .1, 0, 0, 32));
    for (const d of [-1, 1]) {
      k.add('Sleeve collars', 'sleeve', f.sleeve, k.cx(d * B, d * (B + s.collarWidth), s.collarDia / 2, 0, 0, 48));
      if (s.bushing) k.add('Bronze bushing faces', 'source', MAT.bronze, k.cx(d * (B - 2), d * B, r + 3, 0, 0, 32));
      const s0 = B + s.collarWidth - 1, s1 = L - 1;
      if (s.ribbed) {
        k.add('Rotating sleeves', 'sleeve', f.sleeve, k.cx(d * s0, d * s1, s.sleeveDia / 2 - .5, 0, 0, 48));
        const ribs: Manifold[] = []; for (let x = s0 + 4; x < s1 - 3; x += 4) ribs.push(k.cx(d * x, d * (x + 2.2), s.sleeveDia / 2, 0, 0, 48));
        k.add('Machined sleeve ribs', 'sleeve', f.sleeve, ribs);
      } else k.add('Rotating sleeves', 'sleeve', f.sleeve, k.cx(d * s0, d * s1, s.sleeveDia / 2, 0, 0, 48));
    }
    endCaps(k, L, s.sleeveDia / 2 - 3, MAT.capDark);
    return k.finish();
  });
}

// ─── Open trap bars ────────────────────────────────────────────────────────────────────────────
/** Built in the jack pose (feet down, U up; handles vertical, high handle at −y); `pose: 1` lays it flat. */
export function buildOpenTrap(api: ManifoldAPI, s: OpenTrapSpec, p: NumericParams): SolidPart[] {
  if (![0, 1].includes(p.pose ?? 0)) throw Error('Unsupported trap bar pose.');
  const l = openTrapLayout(s, p), A = l.axis, fr = s.frame, h = s.handles, m = s.mats;
  return run(api, k => {
    const px0 = s.plateX, px1 = s.plateX + s.plate.t, pz0 = A - 45, pz1 = A + s.plate.top, cg = s.collarGap / 2, L = l.length / 2;
    const frame: Manifold[] = [], steel: Manifold[] = [], grips: Manifold[] = [];
    // U frame in the XZ plane.
    const legZ = fr.corner === 0 ? A : pz1 - 5, top = A + fr.height;
    const raw: Vec2[] = [[-fr.legX, legZ], [-fr.topHalf, top], [fr.topHalf, top], [fr.legX, legZ]], path = filletPath(raw, fr.corner, 8).pts;
    if (fr.kind === 'round') frame.push(k.sweep(path.map(([x, z]) => [x, 0, z] as Vec3), fr.d / 2, [0, 1, 0], 32));
    else {
      frame.push(k.prismXZ(strip(path, fr.d / 2), -fr.t / 2, fr.t / 2));
    }
    if (fr.knurl) k.add('Frame knurl (6")', 'handle', MAT.knurlBlack, k.cx(-fr.knurl / 2, fr.knurl / 2, fr.d / 2 + .25, 0, top, 32));
    for (const d of [-1, 1]) {
      const X = (x: number) => d * x, ax = (a: number, b: number): [number, number] => d > 0 ? [a, b] : [-b, -a];
      // Side plate / sleeve mount.
      if (h.bracket === 'loop') steel.push(k.cx(X(px0), X(px1), s.plate.w / 2, 0, A, 32));
      else { const [x0, x1] = ax(px0, px1); steel.push(k.box([x0, -s.plate.w / 2, pz0], [x1, s.plate.w / 2, pz1])); }
      // Sleeve stub, collar, loadable sleeve.
      k.add('Sleeve stubs', 'sleeve', m.stub, k.cx(X(px1 - 1), X(cg + 1), s.stubDia / 2, 0, A, 32));
      k.add('Sleeve collars', 'sleeve', m.sleeve, k.cx(X(cg), X(cg + s.collarWidth), s.collarDia / 2, 0, A, 48));
      k.add('Loadable sleeves', 'sleeve', m.sleeve, k.cx(X(cg + s.collarWidth - 1), X(L - 1), s.sleeveDia / 2, 0, A, 48));
      // Handles and brackets. Handles run along Z in the jack pose (fore-aft once flat).
      const hx = X(l.hx), gz0 = A - h.span / 2, gz1 = A + h.span / 2;
      if (h.bracket === 'loop') {
        // One swept loop, starting and ending (0.5 mm apart) mid-way up the high grip, so no booleans between tube pieces.
        const rr = (l.yLow - l.yHigh) / 2, yc = (l.yLow + l.yHigh) / 2, zm = A, loop: Vec3[] = [[hx, l.yHigh, zm + .25]];
        for (let j = 0; j <= 12; j++) { const a = Math.PI * j / 12; loop.push([hx, yc - rr * Math.cos(a), gz1 - rr + rr * Math.sin(a)]); }
        for (let j = 0; j <= 12; j++) { const a = Math.PI * j / 12; loop.push([hx, yc + rr * Math.cos(a), gz0 + rr - rr * Math.sin(a)]); }
        loop.push([hx, l.yHigh, zm - .25]);
        grips.push(k.sweep(loop, h.dia / 2, [1, 0, 0], 32));
        // Struts: axis-level bar to the sleeve mount, diagonal brace from the loop top to the frame leg.
        steel.push(k.cyl([hx, l.yLow, A], [X(px0 + 2), l.yLow * .3, A], 11, 32));
        const zz = gz1 - rr, legAt = fr.legX - (zz - A) / fr.height * (fr.legX - fr.topHalf);
        steel.push(k.cyl([hx, yc, gz1 + 2], [X(legAt), 0, zz], 10, 32));
      } else {
        const inX = l.hx - h.dia / 2 - 14, y0 = l.yHigh - h.dia / 2 - 14, y1 = l.yLow + h.dia / 2 + 14, th = 10;
        const outline: Vec2[] = h.bracket === 'gusset'
          ? [[inX, y0], [inX + 30, y0], [px0 + 1, -25], [px0 + 1, 25], [inX + 30, y1], [inX, y1]]
          : [[inX, y0 + 12], [inX + 12, y0], [px0 + 1, y0], [px0 + 1, y1], [inX + 12, y1], [inX, y1 - 12]];
        const shape = outline.map(([x, y]) => [d * x, y] as Vec2), loop = d > 0 ? shape : [...shape].reverse();
        for (const z of [gz0 - th, gz1]) steel.push(k.prism(loop, z, z + th));
        for (const y of [l.yHigh, l.yLow]) grips.push(k.cyl([hx, y, gz0 - th / 2], [hx, y, gz1 + th / 2], h.dia / 2, 32));
      }
      // Jack feet.
      if (s.feet.kind === 'pad') {
        const fw = s.feet.depth / 2, pad0 = 12, pad1 = 24, [x0, x1] = ax(px0, px1);
        steel.push(k.prismYZ([[-s.plate.w / 2, pz0 + 1], [s.plate.w / 2, pz0 + 1], [fw - 18, pad1 - 1], [-(fw - 18), pad1 - 1]], x0, x1));
        const [f0, f1] = ax(s.feet.x - 30, s.feet.x + 30);
        steel.push(k.box([f0, -fw, pad0 - .5], [f1, fw, pad1]));
        k.add('Jack foot liners', 'liner', m.foot, k.box([f0 + 2, -fw, 0], [f1 - 2, fw, pad0]));
      } else {
        const fr2 = 15, fz = 17, fx = X(s.feet.x), capL = 30, fw = s.feet.depth / 2;
        const pr = s.feet.post ? fr.d / 2 : 14, top0: Vec3 = s.feet.post ? [fx, 0, legZ] : [X((px0 + px1) / 2), 0, A - s.plate.w / 2 + 4];
        steel.push(k.cyl(top0, [fx, 0, fz], pr, 32), k.sphere([fx, 0, fz], Math.min(pr, fz), 32));
        steel.push(k.cyl([fx, -(fw - capL + 2), fz], [fx, fw - capL + 2, fz], fr2, 32));
        k.add('Rubber foot caps', 'liner', m.foot, [-1, 1].map(e => k.cyl([fx, e * (fw - capL), fz], [fx, e * fw, fz], fz, 32)));
      }
    }
    k.add('Open trap frame', 'source', m.frame, frame);
    k.add('Side plates, brackets and jack', 'source', m.frame, steel);
    k.add('Knurled handles', 'handle', m.handle, grips);
    endCaps(k, L, s.sleeveDia / 2 - 3, MAT.capDark, 'Sleeve end caps', A);
    return k.finish(p.pose === 1 ? [-90, 0, 0] : undefined);
  });
}

// ─── Rogue TB-2 ────────────────────────────────────────────────────────────────────────────────
export function buildTB2(api: ManifoldAPI): SolidPart[] {
  return run(api, k => {
    const A = TB2.axisZ, t = TB2.tube, yR = TB2.outline[3][1], hr = TB2.handleDia / 2, frame: Manifold[] = [], plain: Manifold[] = [], raised: Manifold[] = [], knurl: Manifold[] = [];
    frame.push(k.ring(mirrorQuarter(TB2.outline), t, t, A));
    const ex = TB2.outline[0][0] + t / 2;
    for (const d of [-1, 1]) {
      const X = (x: number) => d * x, tri: Vec2[] = [[X(ex - 2), -58], [X(ex + 52), -13], [X(ex + 52), 13], [X(ex - 2), 58]], loop = d > 0 ? tri : [...tri].reverse();
      frame.push(k.prism(loop, A + t / 2 - 5, A + t / 2), k.prism(loop, A - t / 2, A - t / 2 + 5));
      k.add('SCH 80 pipe sleeves', 'sleeve', MAT.texturedBlack, [k.cx(X(ex - 2), X(TB2.collarX + 1), TB2.sleeveDia / 2, 0, A, 48), k.cx(X(TB2.collarX + TB2.collarWidth - 1), X(TB2.length / 2 - 1), TB2.sleeveDia / 2, 0, A, 48)]);
      k.add('Sleeve collars', 'sleeve', MAT.texturedBlack, k.cx(X(TB2.collarX), X(TB2.collarX + TB2.collarWidth), TB2.collarDia / 2, 0, A, 48));
      // Flush handle across the frame (knurled centre) and the raised U grip over it.
      const hx = X(TB2.handleX);
      // Tubes never share a surface or cross another round tube (print export subtracts overlaps): the flush handle stops
      // 3 mm into each rail, the knurl sleeve is 0.25 mm proud, and the U legs land on the rail tops outboard of it.
      plain.push(k.cyl([hx, -(yR - 16), A], [hx, -138, A], hr), k.cyl([hx, 138, A], [hx, yR - 16, A], hr)); knurl.push(k.cyl([hx, -140, A], [hx, 140, A], hr + .25));
      const u = filletPath([[-yR - 2, A + t / 2 - .05], [-yR - 2, A + 50], [-TB2.uHalf, A + TB2.rise], [TB2.uHalf, A + TB2.rise], [yR + 2, A + 50], [yR + 2, A + t / 2 - .05]], 45, 10).pts.map(([y, z]) => [hx, y, z] as Vec3);
      raised.push(k.sweep(u, hr, [1, 0, 0], 32)); knurl.push(k.cyl([hx, -110, A + TB2.rise], [hx, 110, A + TB2.rise], hr + .25, 32));
    }
    k.add('1.5" square-tube hex frame', 'source', MAT.texturedBlack, frame);
    k.add('Handle tube', 'source', MAT.texturedBlack, plain);
    // Raised U grips stay a separate solid: unioning two crossing round tubes leaves float32 sliver triangles.
    k.add('Raised U grips', 'source', MAT.texturedBlack, raised);
    k.add('Knurled handles', 'handle', MAT.knurlBlack, knurl);
    k.add('Logo plate', 'source', MAT.badgeWhite, k.box([-95, -yR - 11, A + t / 2 - .01], [95, -yR + 11, A + t / 2 + .8]));
    endCaps(k, TB2.length / 2, 19, MAT.rubber, 'Open pipe ends', A);
    return k.finish();
  });
}

// ─── Multi-grip / Swiss bars ───────────────────────────────────────────────────────────────────
export function buildMultiGrip(api: ManifoldAPI, id: MultiGripId, p: NumericParams): SolidPart[] {
  const s: MultiGripSpec = MULTI_GRIP_SPECS[id], f = s.finishes[p.finish ?? 0]; if (!f) throw Error('Unsupported multi-grip finish.');
  const handles = multiGripHandles(id, p), L = multiGripLength(s, p) / 2, yc = s.width / 2 - s.rail.t / 2;
  return run(api, k => {
    const frame: Manifold[] = [], grips: Manifold[] = [], zinc: Manifold[] = [], bolts: Manifold[] = [];
    // Rail centreline (x, z), camber up.
    let line: Vec2[] = [];
    if (s.arch) {
      const { half, rise } = s.arch, R = (half * half + rise * rise) / (2 * rise);
      for (let i = 0; i <= 32; i++) { const x = -half + 2 * half * i / 32; line.push([x, Math.sqrt(R * R - x * x) - (R - rise)]); }
      line[0][1] = 0; line[32][1] = 0;
      if (s.end.x0 > half) line = [[-s.end.x0, 0], ...line, [s.end.x0, 0]];
    } else if (s.profile) line = mirrorHalf(s.profile).pts;
    const zAt = (x: number) => s.ring ? 0 : lerpZ(line, x);
    if (s.ring) frame.push(k.ring(mirrorQuarter(s.ring), s.rail.t, s.rail.h, 0));
    else for (const y of [-yc, yc]) {
      if (s.rail.kind === 'round') frame.push(k.sweep(filletPath(line, 30, 10).pts.map(([x, z]) => [x, y, z] as Vec3), s.rail.t / 2, [0, 1, 0], 32));
      else frame.push(k.prismXZ(strip(line, s.rail.h / 2), y - s.rail.t / 2, y + s.rail.t / 2));
    }
    // Hole rows (MG-4CN): 1" pitch through both rails.
    let rails = s.ring || s.rail.kind === 'round' ? frame : [k.cut(k.union(frame), s.holes ? Array.from({ length: Math.floor(s.holes.half / s.holes.step) * 2 + 1 }, (_, i) => (i - Math.floor(s.holes!.half / s.holes!.step)) * s.holes!.step)
      .map(x => k.cyl([x, -s.width, zAt(x)], [x, s.width, zAt(x)], s.holes!.d / 2, 16)) : [])];
    // Handles (converging at +y) with button caps on threaded ends.
    for (const h of handles) for (const d of [-1, 1]) {
      // Ends buried in the rails; pulled in so the tilted end disks never poke past the frame's outer faces.
      const tan = Math.tan(h.angle * DEG), r = h.dia / 2, dz = zAt(d * (h.x - tan * yc)) - zAt(d * (h.x + tan * yc)), c = 2 * yc / Math.hypot(2 * tan * yc, 2 * yc, dz);
      const ye = Math.min(yc, s.width / 2 - .3 - r * Math.sqrt(Math.max(0, 1 - c * c))), xa = d * (h.x - tan * ye), xb = d * (h.x + tan * ye);
      grips.push(k.cyl([xb, -ye, zAt(xb)], [xa, ye, zAt(xa)], r, 32));
      if (s.handleCaps) for (const [x, y] of [[xa, yc], [xb, -yc]] as Vec2[]) { const o = Math.sign(y) * (yc + s.rail.t / 2); bolts.push(k.cyl([x, o - Math.sign(y) * .5, zAt(x)], [x, o + Math.sign(y) * s.handleCaps, zAt(x)], 12, 24)); }
    }
    // End blocks, stubs, collars, sleeves.
    const e = s.end, W = s.width / 2;
    for (const d of [-1, 1]) {
      const X = (x: number) => d * x, ax = (a: number, b: number): [number, number] => d > 0 ? [a, b] : [-b, -a];
      if (e.kind === 'plates') {
        for (const [a, b] of [[e.x0, e.x0 + 8], [e.x1 - 8, e.x1]]) { const [x0, x1] = ax(a, b); rails.push(k.box([x0, -W, -e.h / 2], [x1, W, e.h / 2])); }
        const [h0, h1] = ax(e.x0 + 7, e.x1 - 7); zinc.push(k.box([h0, -28, -28], [h1, 28, 28]));
        for (const y of [-58, 58]) bolts.push(k.cx(X(e.x1 - 1), X(e.x1 + 7), 9, y, 0, 24), k.cx(X(e.x0 - 7), X(e.x0 + 1), 9, y, 0, 24));
      } else if (e.kind === 'box') {
        const [x0, x1] = ax(s.ring ? e.x1 - 20 : e.x0 - 10, e.x1), [w0, w1] = ax(e.x0 + 8, e.x1 - 10);
        rails.push(k.cut(k.box([x0, -W, -e.h / 2], [x1, W, e.h / 2]), [k.box([w0, -W + 8, -e.h / 2 - 1], [w1, W - 8, e.h / 2 + 1])]));
      } else { // Oversized by 0.3 mm so no block face is coplanar with a rail face.
        const [x0, x1] = ax(s.ring ? e.x1 - 20 : e.x0 - .3, s.ring ? e.x1 + .3 : e.x1); const bw = s.ring ? 45 : W + .3; rails.push(k.box([x0, -bw, -e.h / 2 - .3], [x1, bw, e.h / 2 + .3])); }
      let stub0 = e.x1 - 1;
      if (s.extras.includes('flange')) {
        zinc.push(k.cx(X(e.x1 - 1), X(e.x1 + 8), 30, 0, 0, 48)); stub0 = e.x1 + 7;
        for (let j = 0; j < 3; j++) { const a = (90 + j * 120) * DEG; bolts.push(k.cx(X(e.x1 + 7), X(e.x1 + 12), 5, 21 * Math.cos(a), 21 * Math.sin(a), 16)); }
      }
      k.add('Sleeve stubs', 'sleeve', f.sleeve, k.cx(X(stub0), X(s.collarX + 1), s.stubDia / 2, 0, 0, 48));
      k.add('Sleeve collars', 'sleeve', f.sleeve, k.cx(X(s.collarX), X(s.collarX + s.collarWidth), s.collarDia / 2, 0, 0, 48));
      k.add('Loadable sleeves', 'sleeve', f.sleeve, k.cx(X(s.collarX + s.collarWidth - 1), X(L - 1), s.sleeveDia / 2, 0, 0, 48));
      // MG-4CN lockable sleeves: hex lock nut against the collar, on the frame side.
      if (s.extras.includes('hexCap')) k.add('Sleeve lock nuts', 'sleeve', f.sleeve, k.cx(X(s.collarX - 16), X(s.collarX + 1), 27, 0, 0, 6));
    }
    // Extras.
    const topZ = (x: number) => zAt(x) + (s.rail.kind === 'round' ? s.rail.t / 2 : s.rail.h / 2);
    if (s.extras.includes('eyebolt')) {
      rails.push(k.box([-25, -yc, topZ(0) - 9], [25, yc, topZ(0) - 1]));
      const eye = k.k(k.k(k.k(api.CrossSection.circle(5, 24)).translate([15, 0])).revolve(32));
      zinc.push(k.move(k.k(eye.rotate([90, 0, 0])), [0, 0, topZ(0) + 20]), k.cyl([0, 0, topZ(0) - 9], [0, 0, topZ(0) + 6], 6, 16), k.cyl([0, 0, topZ(0) - 1], [0, 0, topZ(0) + 4], 10, 6));
    }
    if (s.extras.includes('xbrace')) for (const a of [1, -1]) rails.push(k.move(k.k(k.box([-110, -5, -20], [110, 5, 20]).rotate([0, 0, a * Math.atan2(2 * yc, 180) / DEG])), [0, 0, zAt(0) + 6]));
    if (s.extras.includes('hook')) {
      rails.push(k.box([-22, -yc, topZ(0) - 8], [22, yc, topZ(0)]));
      k.add('Cable hook', 'source', f.frame, k.cut(k.box([-14, -5, topZ(0) - 2], [14, 5, topZ(0) + 34]), [k.cyl([0, -8, topZ(0) + 20], [0, 8, topZ(0) + 20], 8, 24), k.box([-3, -8, topZ(0) + 20], [3, 8, topZ(0) + 40])]));
    }
    if (s.extras.includes('titanPlate')) k.add('Titan badge', 'source', MAT.steelPlate, k.box([-80, -yc - 13, s.rail.h / 2 - .01], [80, -yc + 13, s.rail.h / 2 + 1]));
    if (s.extras.includes('logoPlate')) k.add('Logo plate', 'source', MAT.steelPlate, k.box([-45, -yc - s.rail.t / 2 + 1.5, topZ(90) - .01], [45, -yc + s.rail.t / 2 - 1.5, topZ(90) + .8]));
    k.add(s.arch ? 'Arched plate frame' : 'Multi-grip frame', 'source', f.frame, rails);
    k.add('Knurled neutral grips', 'handle', f.handle, grips);
    if (zinc.length) k.add('Zinc hub, flange and eyebolt', 'source', MAT.clearZinc, zinc);
    if (bolts.length) k.add('Bolts and handle caps', 'fastener', MAT.blackOxide, bolts, true);
    endCaps(k, L, s.sleeveDia / 2 - 3, MAT.capDark);
    return k.finish();
  });
}

const builders: Record<string, PartDefinition['build']> = {};
for (const id of Object.keys(CURL_SPECS) as CurlId[]) builders[id] = (api, p) => buildCurlBar(api, CURL_SPECS[id], p);
for (const id of Object.keys(OPEN_TRAP_SPECS) as OpenTrapId[]) builders[id] = (api, p) => buildOpenTrap(api, OPEN_TRAP_SPECS[id], p);
for (const id of Object.keys(MULTI_GRIP_SPECS) as MultiGripId[]) builders[id] = (api, p) => buildMultiGrip(api, id, p);
for (const id of ['titan-axle-barbell', 'fringe-sport-20kg-axle-bar', 'fringe-sport-stubby-axle-bar']) builders[id] = (api, p) => buildAxle(api, axleSpec(id, p));
builders['rogue-tb-2-trap-bar'] = api => buildTB2(api);
export const definitions: PartDefinition[] = PARTS.map(part => floorDefinition(part, builders[part.id]));
