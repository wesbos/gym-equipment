/** Pure layouts (no Manifold) for the swept conditioning parts: battle ropes, the jump rope and the TANK M1's tubes and tyres.
 * Every layout is centred on the floor footprint (x/y centre 0, lowest point z = 0) and returns its exact bounds, which the
 * metadata uses as the footprint and the builders reproduce vertex for vertex. Research: ../research/conditioning.md. */
import {
  add, filleted, frames, lathe, len, meshBounds, memo, merge, mul, ringFrames, sub, sweep, translateMesh, tube, unit,
  type Box3, type Frame, type Mesh3, type V3,
} from './conditioning-geometry.ts';
const TAU = Math.PI * 2;
// ------------------------------------------------------------------------------------------------ battle ropes
export type RopeKind = 'twisted' | 'sleeve';
export interface RopeSpec {
  kind: RopeKind; /** Rope diameter */ D: number; /** Overall length */ L: number;
  /** End grip: heat-shrink cap (twisted) or moulded rubber handle (sleeve) */ handle: number; handleD: number;
  tracer: boolean;
}
export const ROPE_POSES = ['Coiled (stacked)', 'Rolled flat', 'Anchored, laid out'] as const;
/** Laid-out rope ends are held this far apart (hands at shoulder width). */
export const ROPE_SPREAD = 600;
/** Anchor loop radius when laid out around a post or strap. */
export const ROPE_ANCHOR_RADIUS = 110;
export interface RopeLayout {
  body: Mesh3; ends: Mesh3[]; tracer?: Mesh3;
  /** Grip label frames at each end: t along the rope toward its tip, u facing up out of the grip. */
  labels: Frame[]; bounds: Box3; /** Centreline length */ length: number; /** Coil outer diameter / height, for tests */ coil?: { od: number; height: number; turns: number };
}
/** Stacked coil width: height ≈ 1.2 × width, like the vendor coils. */
export const coilDiameter = (L: number, D: number) => Math.max(260, Math.sqrt(L * D / (1.2 * Math.PI)));
/** Station spacing along the rope. */
const ropeStep = (s: RopeSpec) => s.kind === 'twisted' ? twistPitch(s) / 10 : 10;
/** 3-strand lay length ≈ 3.3 × diameter (vendor close-ups). */
export const twistPitch = (s: RopeSpec) => 3.3 * s.D;
/** Rope centreline for a pose, sampled every `step`, total length exactly L. zc = centreline height on the floor. */
function centreline(s: RopeSpec, pose: number, outer: number, zc: number): { pts: V3[]; coil?: RopeLayout['coil'] } {
  const step = ropeStep(s), L = s.L, tail = s.handle + 140, pts: V3[] = [];
  const line = (a: V3, b: V3, first = false) => { const n = Math.max(1, Math.ceil(len(sub(b, a)) / step)); for (let i = first ? 0 : 1; i <= n; i++) pts.push(add(a, mul(sub(b, a), i / n))); };
  if (pose === 0) {
    const rc = coilDiameter(L, outer) / 2, pitch = outer + 2, turnLen = Math.hypot(TAU * rc, pitch), helix = L - 2 * tail, turns = helix / turnLen;
    line([rc, -tail, zc], [rc, 0, zc], true);
    const n = Math.ceil(helix / step);
    for (let i = 1; i <= n; i++) { const a = TAU * turns * i / n; pts.push([rc * Math.cos(a), rc * Math.sin(a), zc + pitch * turns * i / n]); }
    const end = pts.at(-1)!, a = TAU * turns, dir: V3 = [-Math.sin(a), Math.cos(a), 0];
    line(end, add(end, mul(dir, tail)));
    return { pts, coil: { od: 2 * rc + outer, height: pitch * turns + outer, turns } };
  }
  if (pose === 1) {
    // Archimedean floor spiral: inner grip straight across the eye, outer grip tangent.
    const gap = outer + 2, r0 = Math.max(tail / 2 + 90, 170), fil = 60;
    const inner = filleted([[r0 - fil - tail, 0, zc], [r0, 0, zc], [r0, fil, zc]], fil, 12, step);
    pts.push(...inner);
    let used = inner.reduce((sum, p, i) => i ? sum + len(sub(p, inner[i - 1])) : 0, 0);
    const target = L - tail, a0 = Math.atan2(fil, r0);
    let a = a0, prev = pts.at(-1)!;
    while (used < target) {
      const r = r0 + gap * (a - a0) / TAU, da = Math.min(step / r, .2);
      const next: V3 = [r * Math.cos(a + da), r * Math.sin(a + da), zc], d = len(sub(next, prev));
      if (used + d > target) { pts.push(add(prev, mul(sub(next, prev), (target - used) / d))); used = target; break; }
      pts.push(next); used += d; prev = next; a += da;
    }
    const end = pts.at(-1)!, dir = unit(sub(end, pts.at(-2)!));
    line(end, add(end, mul(dir, tail)));
    return { pts };
  }
  // Anchored: U-turn around the anchor, legs spreading to the hands.
  const ra = ROPE_ANCHOR_RADIUS, half = ROPE_SPREAD / 2, arc = Math.PI * ra, leg = Math.sqrt(((L - arc) / 2) ** 2 - (half - ra) ** 2);
  line([-half, -leg, zc], [-ra, 0, zc], true);
  const n = Math.ceil(arc / step);
  for (let i = 1; i <= n; i++) { const a = Math.PI - Math.PI * i / n; pts.push([ra * Math.cos(a), ra * Math.sin(a), zc]); }
  line([ra, 0, zc], [half, -leg, zc]);
  return { pts };
}
/** Round-lobed 3-strand section: lobes at 0/120/240° from `twist`, V grooves between. */
const strands = (R: number, depth: number) => (phi: number, twist: number) => R * (1 - depth + depth * Math.sqrt(Math.abs(Math.cos(1.5 * (phi - twist)))));
/** Sleeve fabric: soft bunching rings every ~5 cm with a slow wander. */
const bunch = (R: number) => (s: number, phi: number) => R * (1 + .035 * Math.sin(TAU * s / 52) * (.65 + .35 * Math.sin(TAU * s / 330)) + .018 * Math.sin(2 * phi + s / 45));
/** Rope body outer diameter used for stacking (sleeve adds ~6 mm of nylon over the rope). */
export const ropeOuter = (s: RopeSpec) => s.kind === 'sleeve' ? (s.D + 6) * 1.055 : s.D;
function buildRope(s: RopeSpec, pose: number): RopeLayout {
  const outer = Math.max(ropeOuter(s), s.handleD), zc = s.handleD / 2, { pts, coil } = centreline(s, pose, outer, zc);
  const fr = frames(pts, [0, 0, 1]), L = fr.at(-1)!.s, pitch = twistPitch(s), R = s.D / 2;
  const twisted = strands(R, .3), sleeve = bunch((s.D + 6) / 2);
  const twist = (f: Frame) => TAU * f.s / pitch;
  const inset = 3, bodyFrames = fr.filter(f => f.s > inset && f.s < L - inset);
  const body = sweep(bodyFrames, 20, (f, phi) => s.kind === 'twisted' ? twisted(phi, twist(f)) : sleeve(f.s, phi));
  // End grips: glossy heat-shrink hugging the strands, or a moulded rubber handle with a rounded tip.
  const endSeg = (from: number, to: number) => fr.filter(f => f.s >= from - 1e-6 && f.s <= to + 1e-6);
  const Rh = s.handleD / 2, shrink = strands(Rh, .1);
  const grip = (fs: Frame[], tipAt: number) => sweep(fs, 24, (f, phi) => {
    if (s.kind === 'twisted') return shrink(phi, twist(f));
    const d = Math.abs(f.s - tipAt); return d < 6 ? Rh - 6 + Math.sqrt(36 - (6 - d) ** 2) : Rh;
  });
  const startSeg = endSeg(0, s.handle), endSegF = endSeg(L - s.handle, L);
  const ends = [grip(startSeg, 0), grip(endSegF, L)];
  // Yellow tracer yarn surfacing once per lay on one strand crest (Amazon Basics).
  let tracer: Mesh3 | undefined;
  if (s.tracer) {
    const dashes: Mesh3[] = [];
    for (let k = 0; ; k++) {
      const s0 = s.handle + 20 + k * pitch; if (s0 + 26 > L - s.handle - 20) break;
      const seg = fr.filter(f => f.s >= s0 && f.s <= s0 + 26); if (seg.length < 2) continue;
      dashes.push(tube(seg.map(f => { const a = twist(f), r = R * 1.005; return add(f.p, add(mul(f.u, Math.cos(a) * r), mul(f.v, Math.sin(a) * r))); }), 1.7, 6));
    }
    tracer = merge(dashes);
  }
  // Label frames at each grip's middle, t toward the tip.
  const mid = (target: number, toward: 1 | -1) => { const f = fr.reduce((a, b) => Math.abs(b.s - target) < Math.abs(a.s - target) ? b : a); return { ...f, t: mul(f.t, toward), v: mul(f.v, toward) }; };
  const labels = [mid(s.handle * .5, -1), mid(L - s.handle * .5, 1)];
  const all = [body, ...ends, ...(tracer ? [tracer] : [])], b = meshBounds(all), c: V3 = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]];
  const shift = (m: Mesh3) => translateMesh(m, c), shiftF = (f: Frame): Frame => ({ ...f, p: add(f.p, c) });
  return { body: shift(body), ends: ends.map(shift), tracer: tracer && shift(tracer), labels: labels.map(shiftF), coil, length: L,
    bounds: { min: add(b.min, c), max: add(b.max, c) } };
}
const ropeCache = memo(12, key => { const [spec, pose] = JSON.parse(key) as [RopeSpec, number]; return buildRope(spec, pose); });
export const ropeLayout = (s: RopeSpec, pose: number) => ropeCache(JSON.stringify([s, pose]));
// ------------------------------------------------------------------------------------------------ jump rope
export interface JumpRopeLayout { handles: { body: Mesh3; knurl: Mesh3; band: Mesh3; cap: Mesh3; eye: Mesh3 }; cable: Mesh3; bounds: Box3; /** Cable centreline length */ length: number }
export const JUMP_ROPE_POSES = ['Loose loop on the floor', 'Coiled for the gym bag'] as const;
/** Rogue PRO handle profile along its axis (mm from the plug end): 25 mm stainless, knurled grip, cone to the swivel. */
export const PRO_HANDLE = { length: 151, d: 25, knurl: [16, 96] as const, band: [3, 12] as const, cone: [101, 136] as const, neck: 13, cap: [136, 146] as const, capD: 17, eyeR: 7, wire: 2.2 };
export const PRO_CABLE_D = 5.5;
function buildJumpRope(cableIn: number, pose: number): JumpRopeLayout {
  const h = PRO_HANDLE, r = h.d / 2, zc = r, gapX = 22, cableR = PRO_CABLE_D / 2;
  const bodies: Mesh3[] = [], knurls: Mesh3[] = [], bands: Mesh3[] = [], caps: Mesh3[] = [], eyes: Mesh3[] = [];
  const tips: V3[] = [];
  const prof = (x: number) => {
    if (x <= h.cone[0]) return x < 1 ? r - 1 + x : r;
    if (x <= h.cone[1]) { const k = (x - h.cone[0]) / (h.cone[1] - h.cone[0]); return r + (h.neck / 2 - r) * (k * k * (3 - 2 * k)); }
    return h.neck / 2;
  };
  const st = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  for (const side of [-1, 1]) {
    const x = side * gapX, a: V3 = [x, 0, zc], dir: V3 = [0, 1, 0], at = (d: number) => add(a, mul(dir, d));
    bodies.push(lathe(a, at(h.cap[0]), [0, .5, 1, ...st(2, h.cone[0], 6), ...st(h.cone[0], h.cone[1], 12), h.cap[0]], prof, 40));
    knurls.push(lathe(at(h.knurl[0]), at(h.knurl[1]), [0, h.knurl[1] - h.knurl[0]], () => r + .3, 40));
    bands.push(lathe(at(h.band[0]), at(h.band[1]), [0, h.band[1] - h.band[0]], () => r + .15, 40));
    caps.push(lathe(at(h.cap[0] - 2), at(h.cap[1]), [0, 1.5, h.cap[1] - h.cap[0] + 0.5, h.cap[1] - h.cap[0] + 2], x2 => x2 > h.cap[1] - h.cap[0] + 1 ? h.capD / 2 - 2 : h.capD / 2, 32));
    // Swivel eye: a ring standing up off the cap (the cable passes through horizontally).
    const ec = at(h.cap[1] + h.eyeR); eyes.push(sweep(ringFrames(ec, [1, 0, 0], [0, 0, 1], h.eyeR, 28), 10, () => h.wire, undefined, true));
    tips.push(add(ec, [0, h.eyeR * .2, 0]));
  }
  // Cable: out of each swivel, down to the floor, around a loop (or three stacked turns) and back.
  const L = cableIn * 25.4, step = 20, pts: V3[] = [], zf = cableR;
  const [ta, tb] = tips, lead = 60;
  const aOut: V3 = [ta[0], ta[1] + lead, zf], bOut: V3 = [tb[0], tb[1] + lead, zf];
  const leadLen = len(sub(aOut, ta)) + len(sub(bOut, tb));
  pts.push(ta, aOut);
  if (pose === 0) {
    // Circle through the two lead points, tangent-ish: centre ahead of the handles.
    const rest = L - leadLen, R = (rest + 2 * gapX) / TAU, cy = aOut[1] + Math.sqrt(Math.max(1, R * R - gapX * gapX));
    const a0 = Math.atan2(aOut[1] - cy, aOut[0]), a1 = Math.atan2(bOut[1] - cy, bOut[0]), span = TAU - (a1 - a0 + TAU) % TAU;
    const n = Math.ceil(R * span / step);
    for (let i = 1; i < n; i++) { const a = a0 - span * i / n; pts.push([R * Math.cos(a), cy + R * Math.sin(a), zf]); }
  } else {
    const rest = L - leadLen, turns = 3, R = rest / (TAU * turns), cy = aOut[1] + R, n = Math.ceil(rest / step);
    const a0 = Math.atan2(aOut[1] - cy, aOut[0] - 0);
    for (let i = 1; i < n; i++) { const k = i / n, a = a0 - TAU * turns * k, rr = R + 6.5 * (k - .5) * turns; pts.push([rr * Math.cos(a), cy + rr * Math.sin(a), zf]); }
  }
  pts.push(bOut, tb);
  const cable = sweep(filleted(pts, 25, 6, step), 10, () => cableR), length = cable.frames.at(-1)!.s;
  const merged = { body: merge(bodies), knurl: merge(knurls), band: merge(bands), cap: merge(caps), eye: merge(eyes) };
  const all = [...Object.values(merged), cable], b = meshBounds(all), c: V3 = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]];
  const shift = (m: Mesh3) => translateMesh(m, c);
  return { handles: { body: shift(merged.body), knurl: shift(merged.knurl), band: shift(merged.band), cap: shift(merged.cap), eye: shift(merged.eye) }, cable: shift(cable), length,
    bounds: { min: add(b.min, c), max: add(b.max, c) } };
}
const jumpCache = memo(8, key => { const [len2, pose] = JSON.parse(key) as [number, number]; return buildJumpRope(len2, pose); });
export const jumpRopeLayout = (cableIn: number, pose: number) => jumpCache(JSON.stringify([cableIn, pose]));
// ------------------------------------------------------------------------------------------------ TANK M1
/** Torque TANK M1 layout in chassis coordinates before centring: x across, w = distance from the rear axle toward the nose, z up.
 * Numbers from the XTTM1-RPH-103 assembly guide's scaled top/side drawings (1370 × 808 × 957 mm with the bar forward). */
export const TANK = {
  axleZ: 127, rearWheel: { R: 127, w: 79, x: 364.5 }, frontWheel: { R: 121, w: 70, at: 884 },
  crossbar: { x: 312, w: 39, z0: 78, z1: 154 }, rails: { x0: 95, x1: 121, w0: 39, w1: 1000, z0: 92, z1: 154 },
  deck: { w0: 39, w1: 470, z0: 148 }, horn: { w: 212, d: 45, top: 318, cap: 8 },
  receiver: { x: 149, d: 51, top: 236 }, post: 41.3, grip: 50,
  housing: { x: 122, profile: [[470, 154], [470, 300], [492, 322], [820, 322], [1000, 212], [1013, 184], [1013, 154]] as [number, number][] },
  nose: 1013, pivot: { w: 781, z: 188, x: 170 }, bar: 38.1, barLeg: 481, barEnd: 120, height: 957,
} as const;
export const TANK_BAR_POSES = ['High push (bar raised)', 'Low push / pull (bar forward)'] as const;
/** Push/pull bar leg angle above horizontal per pose. */
export const TANK_BAR_ANGLE = [70, 40.5] as const;
export interface TankLayout {
  meshes: { posts: Mesh3; grips: Mesh3; bar: Mesh3; dring: Mesh3; tyres: Mesh3; rearHubs: Mesh3; frontHub: Mesh3 };
  /** Chassis-frame → build-frame translation (build = chassis + shift, with chassis w along +Y). */
  shift: V3; bounds: Box3; tip: number;
}
/** Knobby tyre: rounded-rectangle section swept around the axle, staggered tread blocks on the crown. */
function tyre(centre: V3, R: number, width: number, h: number, stations = 132): Mesh3 {
  const a = width / 2, b = h / 2, rc = R - b, knob = 7, pitch = 132 / 22;
  return sweep(ringFrames(centre, [1, 0, 0], [0, 0, -1], rc, stations), 36, (f, phi, i) => {
    const c = Math.cos(phi), s = Math.sin(phi), n = 4, base = 1 / ((Math.abs(c) / (b - knob)) ** n + (Math.abs(s) / a) ** n) ** (1 / n);
    if (c < .35) return base;
    const row = s >= 0 ? 0 : .5, k = ((i / pitch + row) % 1 + 1) % 1, on = k < .62 ? 1 : 0, lug = Math.abs(s) > .5 ? (k < .45 ? 1 : 0) : on;
    return base + knob * lug * Math.min(1, (c - .35) / .25);
  }, undefined, true);
}
function buildTank(pose: number): TankLayout {
  const T = TANK, alpha = TANK_BAR_ANGLE[pose] * Math.PI / 180, W = (x: number, w: number, z: number): V3 => [x, w, z];
  const posts: Mesh3[] = [], grips: Mesh3[] = [];
  const rib = (f: Frame, base: number) => base + .9 * Math.cos(TAU * f.s / 9);
  for (const sx of [-1, 1]) {
    const x0 = sx * T.receiver.x, P = (u: number, w: number, z: number) => W(x0 + sx * u, w, z);
    const ctrl = [P(0, 0, 180), P(0, 0, 600), P(62, 18, 735), P(100, 42, 820), P(124, 70, 950)];
    const path = filleted(ctrl, 70, 10, 30);
    // Metal to just inside the top grip; foam grip on the last 150 mm.
    const fr = frames(path), L = fr.at(-1)!.s, gripFrom = L - 150;
    posts.push(sweep(fr.filter(f => f.s <= gripFrom + 20), 24, () => T.post / 2));
    const gripPath = fr.filter(f => f.s >= gripFrom).map(f => f.p);
    grips.push(sweep(filleted(gripPath, 1, 1, 4), 24, f => rib(f, T.grip / 2)));
    // Low branch grip: off the outward bend, pointing inward and toward the nose.
    const base = fr.reduce((a, b2) => Math.abs(b2.p[2] - 690) < Math.abs(a.p[2] - 690) ? b2 : a).p;
    const dir = unit([-sx * 68, 72, 118]), bEnd = add(base, mul(dir, 158));
    posts.push(tube([add(base, mul(dir, -6)), add(base, mul(dir, 40))], T.post / 2, 24));
    grips.push(sweep(filleted([add(base, mul(dir, 28)), bEnd], 1, 1, 4), 24, f => rib(f, T.grip / 2)));
  }
  // Push/pull bar: U-hoop pivoting on the housing sides.
  const d1: V3 = [0, Math.cos(alpha), Math.sin(alpha)], a2 = alpha + 30 * Math.PI / 180, d2: V3 = [0, Math.cos(a2), Math.sin(a2)];
  const p0: V3 = [0, T.pivot.w, T.pivot.z], p1 = add(p0, mul(d1, T.barLeg)), p2 = add(p1, mul(d2, T.barEnd)), X = (x: number, p: V3): V3 => [x, p[1], p[2]];
  const barPath = filleted([X(-T.pivot.x, p0), X(-T.pivot.x, p1), X(-T.pivot.x, p2), X(T.pivot.x, p2), X(T.pivot.x, p1), X(T.pivot.x, p0)], 60, 12, 40);
  const bar = sweep(barPath, 24, () => T.bar / 2);
  // Tow D-ring welded to the hoop crossbar, pointing out past the nose.
  const a3 = a2 - 80 * Math.PI / 180, d3: V3 = [0, Math.cos(a3), Math.sin(a3)], rc = p2;
  const R2 = (x: number, k: number): V3 => add(add(rc, [x, 0, 0]), mul(d3, k));
  const dring = sweep(filleted([R2(-12, 4), R2(-17, 34), R2(0, 60), R2(17, 34), R2(12, 4)], 12, 8, 6), 12, () => 5);
  // Tyres and hubs.
  const rw = T.rearWheel, fw = T.frontWheel, tyres: Mesh3[] = [], rearHubs: Mesh3[] = [];
  for (const sx of [-1, 1]) {
    const c: V3 = [sx * rw.x, 0, rw.R];
    tyres.push(tyre(c, rw.R, rw.w, 54));
    const hw = rw.w / 2 - 5, hubR = rw.R - 51;
    rearHubs.push(lathe(add(c, [-hw, 0, 0]), add(c, [hw, 0, 0]), [0, 6, 6.01, 10, 10.01, 2 * hw - 10.01, 2 * hw - 10, 2 * hw - 6.01, 2 * hw - 6, 2 * hw], x => x < 6 || x > 2 * hw - 6 ? 21 : x < 10 || x > 2 * hw - 10 ? hubR - 14 : hubR, 48));
  }
  const fc: V3 = [0, fw.at, fw.R];
  tyres.push(tyre(fc, fw.R, fw.w, 46));
  const fhw = fw.w / 2 - 6, frontHub = lathe(add(fc, [-fhw, 0, 0]), add(fc, [fhw, 0, 0]), [0, 2 * fhw], () => fw.R - 43, 40);
  const meshes = { posts: merge(posts), grips: merge(grips), bar, dring, tyres: merge(tyres), rearHubs: merge(rearHubs), frontHub };
  // Box/hull extents that can bound the part: housing nose (w = 1013) and the floor.
  const b = meshBounds(Object.values(meshes), [{ min: [-T.housing.x, 0, 0], max: [T.housing.x, T.nose, 0] }]);
  const shift: V3 = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]];
  return { meshes, shift, tip: b.max[1], bounds: { min: add(b.min, shift), max: add(b.max, shift) } };
}
const tankCache = memo(4, key => buildTank(Number(key)));
export const tankLayout = (pose: number) => tankCache(String(pose));
