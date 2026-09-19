/** Rogue and staple cable handles, bars, straps and hardware: Manifold builders for the entries in ../hang-parts/cable-handles.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `hangDefinition(PART, build)` per entry.
 *
 * Same contract as the REP set (parts/cable-attachments.ts): source axes X along the wall, -Y out of it, Z up; the origin is the
 * carabiner anchor (the hook rod axis through the top of the eye/ring), and `hook: 1` adds the same J-peg. Webbing products are
 * modelled flat-laid (strap faces toward the viewer) so they read like their product photos on a pegboard. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { HOOK_REACH, HOOK_ROD, hangDefinition, type HangPart } from '../hang-part.ts';
import { smooth } from './cable-attachments.ts';
import {
  ROGUE_V_GRIP, ROGUE_SINGLE_HANDLE, ROGUE_LAT_BAR, ROGUE_CURL_BAR, ROGUE_STRAIGHT_BAR_40, ROGUE_STRAIGHT_BAR_20, ROGUE_ANKLE_CUFF,
  SPUD_LONG_AB_STRAP, DAISY_CHAINS, GYMREAPERS_ANKLE_STRAP, MANUEKLEAR_TRICEP_STRAPS, BOS_SWIVEL_SHACKLES, BEYOND_POWER_CARABINER,
  BLUSLM_WAVE_84, BLUSLM_WAVE_78, BLUSLM_V_62, BLUSLM_V_60, BLUSLM_V_56, BLUSLM_CLOSE_24, BLUSLM_CLOSE_26, BLUSLM_CLOSE_22,
} from '../hang-parts/cable-handles.ts';

type Material = Pick<SolidPart, 'role' | 'color' | 'metalness' | 'roughness'>;
const RAW_ALUMINIUM: Material = { role: 'handle', color: '#c4c8cc', metalness: .9, roughness: .42 };
const STAINLESS: Material = { role: 'source', color: '#c9cdd0', metalness: 1, roughness: .24 };
const STAINLESS_KNURL: Material = { role: 'handle', color: '#b0b4b7', metalness: .95, roughness: .5 };
const ECOAT: Material = { role: 'source', color: '#1e1f21', metalness: .35, roughness: .5 };
const ECOAT_KNURL: Material = { role: 'handle', color: '#2d2e31', metalness: .4, roughness: .78 };
const BLACK_STEEL: Material = { role: 'source', color: '#1b1c1e', metalness: .3, roughness: .62 };
const BLACK_OXIDE: Material = { role: 'source', color: '#2c2e31', metalness: .65, roughness: .38 };
const BLACK_PLASTIC: Material = { role: 'liner', color: '#161718', metalness: 0, roughness: .6 };
const ZINC: Material = { role: 'source', color: '#c3c6c8', metalness: .9, roughness: .3 };
const NYLON: Material = { role: 'liner', color: '#18191b', metalness: 0, roughness: .9 };
const STITCH: Material = { role: 'liner', color: '#46494d', metalness: 0, roughness: .9 };
const LABEL_WHITE: Material = { role: 'source', color: '#e6e6e1', metalness: 0, roughness: .7 };
const HOOK: Material = { role: 'source', color: '#26282a', metalness: .4, roughness: .5 };
/** Anchor z of a ring/eye centre whose hole (radius r) rests on the hook rod. */
const hangZ = (r: number) => -(r - HOOK_ROD / 2);
type P2 = [number, number];
type Deletable = { delete(): void };

type Kit = ReturnType<typeof kit>;
function kit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: Deletable[] = [];
  const k = <T extends Deletable>(s: T): T => (owned.push(s), s);
  const deg = 180 / Math.PI;
  const cylinder = (a: Vec3, b: Vec3, d: number, n = 24, d2 = d) => {
    const v = b.map((x, i) => x - a[i]), len = Math.hypot(...v);
    return k(k(k(M.cylinder(len, d / 2, d2 / 2, n)).rotate([0, Math.acos(v[2] / len) * deg, Math.atan2(v[1], v[0]) * deg])).translate(a));
  };
  const sphere = (at: Vec3, d: number, n = 20) => k(k(M.sphere(d / 2, n)).translate(at));
  /** Rounded tube through `points` (capsule chain). */
  const tube = (points: Vec3[], d: number, n = 20) => k(M.union(points.slice(1).map((p, i) => k(M.hull([sphere(points[i], d, n), sphere(p, d, n)])))));
  const box = (size: Vec3, at: Vec3) => k(k(M.cube(size, true)).translate(at));
  const union = (list: Manifold[]) => list.length === 1 ? list[0] : k(M.union(list));
  const hull = (list: (Manifold | Vec3)[]) => k(M.hull(list));
  /** Torus in the XZ plane (axis along Y), so a hook rod along Y threads it. */
  const ring = (center: Vec3, radius: number, wire: number, n = 40) => {
    const circle = k(C.circle(wire / 2, 12)), moved = k(circle.translate([radius, 0]));
    return k(k(k(moved.revolve(n)).rotate([90, 0, 0])).translate(center));
  };
  /** Flat 2D outline in the XZ plane (x, z), extruded `t` thick along Y and centred on y. */
  const flat = (section: CrossSection, t: number, y = 0) => k(k(k(section.extrude(t)).rotate([90, 0, 0])).translate([0, y + t / 2, 0]));
  const circle2 = ([x, z]: P2, r: number, n = 28) => k(k(C.circle(r, n)).translate([x, z]));
  const hull2 = (list: CrossSection[]) => k(C.hull(list));
  const union2 = (list: CrossSection[]) => list.length === 1 ? list[0] : k(C.union(list));
  const poly2 = (points: P2[]) => { const area = points.reduce((s, p, i) => { const q = points[(i + 1) % points.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0); return k(new C([area < 0 ? [...points].reverse() : points])); };
  /** In-plane band (webbing seen face-on) of `width` along a polyline; closed joins the ends. Quads share per-point normals, so no gaps. */
  const band2 = (points: P2[], width: number, closed = false) => {
    const n = points.length, h = width / 2, normals = points.map((p, i) => {
      const a = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [-tz / l, tx / l] as P2;
    });
    const quads: CrossSection[] = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n, p = points[i], q = points[j], a = normals[i], b = normals[j];
      quads.push(poly2([[p[0] + a[0] * h, p[1] + a[1] * h], [q[0] + b[0] * h, q[1] + b[1] * h], [q[0] - b[0] * h, q[1] - b[1] * h], [p[0] - a[0] * h, p[1] - a[1] * h]]));
    }
    return union2(quads);
  };
  /** Smoothed 2D path helper (Catmull-Rom through control points). */
  const curve = (points: P2[], step = 6): P2[] => smooth(points, step).map(([x, , z]) => [x, z]);
  /** Cylindrical shell with axis along Y (ankle cuffs). */
  const shell = (center: Vec3, outer: number, inner: number, y0: number, y1: number, n = 56) =>
    k(cylinder([center[0], y0, center[2]], [center[0], y1, center[2]], outer, n).subtract(cylinder([center[0], y0 - 1, center[2]], [center[0], y1 + 1, center[2]], inner, n)));
  /** J-peg into the panel (identical to the REP set): rod from the face out past the anchor, upturned tip, rear tab behind the face. */
  const hook = () => union([cylinder([0, HOOK_REACH + 4.5, 0], [0, -22, 0], HOOK_ROD, 16), sphere([0, -22, 0], HOOK_ROD, 16), cylinder([0, -22, 0], [0, -25, 20], HOOK_ROD, 16), sphere([0, -25, 20], HOOK_ROD, 16), sphere([0, HOOK_REACH + 4.5, 0], HOOK_ROD, 16), cylinder([0, HOOK_REACH + 4.5, 0], [0, HOOK_REACH + 4.5, -12], HOOK_ROD, 16)]);
  return { M, C, owned, k, cylinder, sphere, tube, box, union, hull, ring, flat, circle2, hull2, union2, poly2, band2, curve, shell, hook };
}
type Piece = Material & { name: string; solid: Manifold };
type Build = (t: Kit) => Piece[];
function attachment(part: HangPart, build: Build) {
  return (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
    if (p.hook !== 0 && p.hook !== 1) throw Error(`Unsupported ${part.noun} pose.`);
    const t = kit(api); let out: SolidPart[] = [], success = false;
    try {
      out = build(t);
      if (p.hook) out.push({ name: 'Pegboard hook', solid: t.hook(), ...HOOK });
      for (const piece of out) if (piece.solid.isEmpty() || piece.solid.status() !== 'NoError') throw Error(`Invalid ${part.noun} ${piece.name}`);
      success = true; return out;
    } finally { const keep = new Set<Deletable>(success ? out.map(o => o.solid) : []); for (const s of t.owned.reverse()) if (!keep.has(s)) s.delete(); }
  };
}
const mirrorX = (points: P2[]): P2[] => points.map(([x, z]) => [-x, z]);
const IN = 25.4;
/** Polyline with every interior corner rounded to radius r (arc sampled every ~6°). */
function fillet(points: P2[], r: number): P2[] {
  const out: P2[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]], lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
    const u1: P2 = [u[0] / lu, u[1] / lu], v1: P2 = [v[0] / lv, v[1] / lv], turn = Math.atan2(u1[0] * v1[1] - u1[1] * v1[0], u1[0] * v1[0] + u1[1] * v1[1]);
    if (Math.abs(turn) < 1e-4) { out.push(b); continue; }
    const tl = Math.min(r * Math.tan(Math.abs(turn) / 2), lu / 2, lv / 2), rr = tl / Math.tan(Math.abs(turn) / 2), side = Math.sign(turn);
    const start: P2 = [b[0] - u1[0] * tl, b[1] - u1[1] * tl], centre: P2 = [start[0] - u1[1] * rr * side, start[1] + u1[0] * rr * side];
    const a0 = Math.atan2(start[1] - centre[1], start[0] - centre[0]), n = Math.max(2, Math.ceil(Math.abs(turn) / (6 * Math.PI / 180)));
    for (let j = 0; j <= n; j++) { const ang = a0 + turn * j / n; out.push([centre[0] + rr * Math.cos(ang), centre[1] + rr * Math.sin(ang)]); }
  }
  out.push(points.at(-1)!);
  return out;
}

// ————— Rogue bars: shared laser-cut swivel tab with collars —————
/** Rogue swivel tab (1/4″ plate in XZ, round boss around the bar, carabiner hole at the top, laser-cut window) plus two collars. */
function rogueSwivel(t: Kit, barZ: number, bar: number, tab: Material, collar: Material): Piece[] {
  const holeR = 8, holeZ = hangZ(holeR), th = 6.35;
  const outline = t.union2([t.hull2([t.circle2([0, holeZ], 15), t.circle2([0, barZ + 20], 16)]), t.circle2([0, barZ], bar / 2 + 12, 40)]);
  const cut = t.union2([t.circle2([0, holeZ], holeR), t.circle2([0, barZ], bar / 2 + .4, 32), t.k(t.k(t.C.square([7, 12], true)).translate([0, (holeZ + barZ) / 2 + 3]))]);
  const plate = t.flat(t.k(outline.subtract(cut)), th);
  const collars = [-1, 1].flatMap(s => [t.cylinder([s * (th / 2 + .2), 0, barZ], [s * 13, 0, barZ], bar + 20, 40), t.cylinder([s * 13, 0, barZ], [s * 46, 0, barZ], bar + 10, 40)]);
  return [{ name: 'Laser-cut swivel tab', solid: plate, ...tab }, { name: 'Swivel collars', solid: t.union(collars), ...collar }];
}
/** Bar along a smoothed XZ half-profile (mirrored), split into knurled and smooth runs by |x| ranges. Collinear samples are merged,
 * so straight runs are single capsules. */
function profiledBar(t: Kit, half: P2[], d: number, knurled: (x: number) => boolean) {
  const knurl: Manifold[] = [], plain: Manifold[] = [];
  const kept = half.filter((p, i) => {
    if (i === 0 || i === half.length - 1) return true;
    const a = half[i - 1], b = half[i + 1], turn = Math.abs(Math.atan2(p[1] - a[1], p[0] - a[0]) - Math.atan2(b[1] - p[1], b[0] - p[0]));
    return turn > .004 || knurled(Math.abs(a[0] + p[0]) / 2) !== knurled(Math.abs(p[0] + b[0]) / 2);
  });
  for (const pts of [kept, mirrorX(kept)]) for (let i = 1; i < pts.length; i++) {
    const a: Vec3 = [pts[i - 1][0], 0, pts[i - 1][1]], b: Vec3 = [pts[i][0], 0, pts[i][1]];
    (knurled(Math.abs(a[0] + b[0]) / 2) ? knurl : plain).push(t.hull([t.sphere(a, d, 24), t.sphere(b, d, 24)]));
  }
  return { knurl: t.union(knurl), plain: plain.length ? t.union(plain) : undefined };
}
/** Trim capsule ends to flat faces: intersect with slabs normal to the end tangents. */
function trimEnds(t: Kit, solid: Manifold, half: P2[], d: number) {
  let out = solid;
  for (const pts of [half, mirrorX(half)]) {
    const e = pts.at(-1)!, f = pts.at(-2)!, l = Math.hypot(e[0] - f[0], e[1] - f[1]), u: P2 = [(e[0] - f[0]) / l, (e[1] - f[1]) / l];
    const cutter = t.cylinder([e[0], 0, e[1]], [e[0] + u[0] * d, 0, e[1] + u[1] * d], d * 1.5, 24);
    out = t.k(out.subtract(cutter));
  }
  return out;
}

/** Rotating V-grip: stainless clevis eye on a bronze-bushed swivel barrel, black side plates, two 32 mm H-5 handles at 90°. */
export const buildRogueVGrip = attachment(ROGUE_V_GRIP, t => {
  const holeR = 8, holeZ = hangZ(holeR), clevis = t.flat(t.k(t.hull2([t.circle2([0, holeZ], 14), t.k(t.k(t.C.square([30, 4], true)).translate([0, -25]))]).subtract(t.circle2([0, holeZ], holeR))), 9.5);
  const barrel = t.union([t.cylinder([0, 0, -24], [0, 0, -54], 34, 40), t.cylinder([0, 0, -22], [0, 0, -25], 30, 40)]);
  const pad: P2 = [55, -12], lobe: P2 = [30, -44], wing = (s: number) => t.hull2([t.circle2([s * pad[0], pad[1]], 20), t.circle2([s * lobe[0], lobe[1]], 13)]);
  const outline = t.union2([wing(-1), wing(1), t.hull2([t.circle2([-24, -58], 9), t.circle2([24, -58], 9)]), t.hull2([t.circle2([-lobe[0], lobe[1]], 13), t.circle2([-22, -58], 9)]), t.hull2([t.circle2([lobe[0], lobe[1]], 13), t.circle2([22, -58], 9)])]);
  const plates = [-1, 1].map(s => t.flat(outline, s < 0 ? 8 : 6.35, s * 21.5));
  const bolts = [-1, 1].flatMap(sy => [-1, 1].flatMap(sx => [lobe, pad].map(([x, z]) => {
    const y0 = sy * (sy < 0 ? 25.5 : 24.7); return t.cylinder([sx * x, y0, z], [sx * x, y0 + sy * 3, z], 12, 20, 9);
  })));
  const c = Math.SQRT1_2, along = (s: number, d: number): Vec3 => [s * (pad[0] + d * c), 0, pad[1] - d * c];
  const grips = [-1, 1].map(s => t.cylinder(along(s, 0), along(s, 132), 32, 36));
  const rests = [-1, 1].map(s => {
    const body = t.union([t.cylinder(along(s, 130), along(s, 137), 40, 40, 52), t.cylinder(along(s, 137), along(s, 150), 56, 44), t.cylinder(along(s, 150), along(s, 152), 56, 44, 52)]);
    return t.k(body.subtract(t.cylinder(along(s, 148), along(s, 153), 16, 20)));
  });
  return [
    { name: 'Stainless clevis eye', solid: clevis, ...STAINLESS },
    { name: 'Swivel hub (bronze bushings)', solid: barrel, ...BLACK_OXIDE, color: '#484b4f', metalness: .75 },
    { name: 'Black steel side plates', solid: t.union([...plates, ...bolts]), ...BLACK_STEEL },
    { name: 'Knurled aluminium H-5 handles', solid: t.union(grips), ...RAW_ALUMINIUM },
    { name: 'Flanged Rogue rests', solid: t.union(rests), ...BLACK_PLASTIC },
  ];
});

/** Single handle: welded zinc ring, 1.5″ webbing triangle with sewn Rogue patch, 5″ × 28.5 mm spinning handle on shoulder bolts. */
export const buildRogueSingleHandle = attachment(ROGUE_SINGLE_HANDLE, t => {
  const ringR = 21.5, wire = 8, ringZ = hangZ(ringR - wire / 2), handleZ = ringZ + ringR + wire / 2 - 8.5 * IN, half = 2.5 * IN, web = 1.5 * IN;
  const top: P2 = [0, ringZ - ringR + 2], legs = [-1, 1].map(s => t.band2([[s * 6, top[1] - 4], [s * (half + 1.5), handleZ - 16]], web));
  const loop = t.band2([[-10, top[1] + 1], [10, top[1] + 1]], 16);
  const webbing = t.flat(t.union2([...legs, loop]), 3.2);
  const tabs = [-1, 1].map(s => t.box([3.2, web, 40], [s * (half + 3.2), 0, handleZ - 4]));
  const leg = (s: number, d: number): P2 => { const a: P2 = [s * 6, top[1] - 4], b: P2 = [s * (half + 1.5), handleZ - 16]; return [a[0] + (b[0] - a[0]) * d, a[1] + (b[1] - a[1]) * d]; };
  const dir = (s: number) => { const a = leg(s, 0), b = leg(s, 1), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] as P2; };
  const patch = t.flat(t.band2([leg(-1, .22), leg(-1, .64)], 30), 1.2, -2.2);
  const wordmark = t.flat(t.band2([leg(-1, .27), leg(-1, .59)], 10), .6, -3.1);
  const stitch = [-1, 1].flatMap(s => {
    // Box-X stitch below the ring: box outline plus both diagonals, thin thread lines.
    const u = dir(s), n: P2 = [-u[1], u[0]], o = leg(s, .05), w = web / 2 - 5, L = 30, at = (a: number, b: number): P2 => [o[0] + u[0] * a + n[0] * b, o[1] + u[1] * a + n[1] * b];
    return [[at(0, -w), at(0, w)], [at(L, -w), at(L, w)], [at(0, -w), at(L, -w)], [at(0, w), at(L, w)], [at(0, -w), at(L, w)], [at(0, w), at(L, -w)]].map(([p, q]) => t.flat(t.band2([p, q], 1.3), .5, -1.85));
  });
  const handle = t.cylinder([-half, 0, handleZ], [half, 0, handleZ], 28.5, 36);
  const hardware = [-1, 1].flatMap(s => [t.cylinder([s * (half + 4.8), 0, handleZ], [s * (half + 6.5), 0, handleZ], 22, 28), t.cylinder([s * (half + 6.5), 0, handleZ], [s * (half + 13), 0, handleZ], 14, 6)]);
  return [
    { name: 'Zinc-plated welded ring', solid: t.ring([0, 0, ringZ], ringR, wire), ...ZINC },
    { name: '1.5″ nylon webbing', solid: t.union([webbing, ...tabs]), ...NYLON },
    { name: 'Box stitching', solid: t.union(stitch), ...STITCH },
    { name: 'Sewn Rogue patch', solid: patch, ...NYLON, color: '#0f1011' },
    { name: 'Rogue wordmark', solid: wordmark, ...LABEL_WHITE },
    { name: 'Knurled aluminium handle', solid: handle, ...RAW_ALUMINIUM },
    { name: 'Shoulder bolts and washers', solid: t.union(hardware), ...BLACK_OXIDE },
  ];
});

/** Lat bar: 48″ tip to tip, 1.125″, straight centre to 61% of the half length, ends raked 30° down; E-coat, fully knurled. */
export const buildRogueLatBar = attachment(ROGUE_LAT_BAR, t => {
  const d = 1.125 * IN, z = -60, rake = 30 * Math.PI / 180, bend = 372, endX = 24 * IN - d / 2 * Math.sin(rake);
  const half: P2[] = [[0, z], [bend, z], [endX, z - (endX - bend) * Math.tan(rake)]];
  const pts = fillet(half, 90);
  const bar = trimEnds(t, profiledBar(t, pts, d, () => true).knurl, pts, d);
  return [{ name: 'Fully knurled E-coat bar', solid: bar, ...ECOAT_KNURL }, ...rogueSwivel(t, z, d, ECOAT, ECOAT)];
});

/** Curl bar: 35.5″ × 28.5 mm cambered bar (hump, dip, raised outer grips), knurled grip runs, E-coat. */
export const buildRogueCurlBar = attachment(ROGUE_CURL_BAR, t => {
  const d = 28.5, z = -60;
  const ctrl: P2[] = [[0, 0], [60, 0], [110, 14], [150, 20], [192, 4], [235, -30], [266, -40], [300, -26], [370, 12], [444, 48]];
  const pts = t.curve(ctrl.map(([x, dz]) => [x, z + dz]), 11);
  const parts = profiledBar(t, pts, d, x => (x > 160 && x < 240) || x > 292);
  const knurl = trimEnds(t, parts.knurl, pts, d);
  return [{ name: 'Knurled grips', solid: knurl, ...ECOAT_KNURL }, { name: 'E-coat bar', solid: parts.plain!, ...ECOAT }, ...rogueSwivel(t, z, d, ECOAT, ECOAT)];
});

/** Stainless straight lat bar: 28.5 mm fully knurled with smooth index rings, stainless swivel tab. */
function rogueStraightBar(part: HangPart, lengthIn: number, rings: number[]) {
  return attachment(part, t => {
    const d = 28.5, z = -60, end = lengthIn * IN / 2, stops = [46, ...rings, end];
    const knurl: Manifold[] = [], plain: Manifold[] = [t.cylinder([-46, 0, z], [46, 0, z], d, 36)];
    for (const s of [-1, 1]) for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1] + (i > 1 ? 1.6 : 0), b = stops[i] - (i < stops.length - 1 ? 1.6 : 0);
      knurl.push(t.cylinder([s * a, 0, z], [s * b, 0, z], d, 36));
      if (i < stops.length - 1) plain.push(t.cylinder([s * (stops[i] - 1.6), 0, z], [s * (stops[i] + 1.6), 0, z], d - 1.2, 36));
    }
    const chamfers = [-1, 1].map(s => t.cylinder([s * (end - .01), 0, z], [s * end, 0, z], d - 3, 36));
    return [{ name: 'Knurled stainless bar', solid: t.union(knurl), ...STAINLESS_KNURL }, { name: 'Smooth index rings', solid: t.union([...plain, ...chamfers]), ...STAINLESS }, ...rogueSwivel(t, z, d, STAINLESS, STAINLESS)];
  });
}
export const buildRogueStraightBar40 = rogueStraightBar(ROGUE_STRAIGHT_BAR_40, 40, [150, 300, 420]);
export const buildRogueStraightBar20 = rogueStraightBar(ROGUE_STRAIGHT_BAR_20, 20, [140]);

// ————— Ankle cuffs —————
/** Welded D-ring in the XZ plane: curved top resting on the rod, straight bar at the bottom (z = bar). */
function dRing(t: Kit, x: number, y: number, width: number, height: number, wire: number) {
  const r = width / 2, top = t.k(t.ring([x, y, height - r], r, wire).subtract(t.box([width + wire * 2, wire * 3, r + wire], [x, y, height - r - (r + wire) / 2])));
  return t.union([top, t.cylinder([x - r, y, height - r], [x - r, y, 0], wire, 12), t.cylinder([x + r, y, 0], [x + r, y, height - r], wire, 12), t.tube([[x - r, y, 0], [x + r, y, 0]], wire, 12)]);
}
/** Ring pivoted about the cuff axis (X) through z = cz by `a` degrees. */
const pivotX = (t: Kit, m: Manifold, cz: number, a: number) => t.k(t.k(t.k(m.translate([0, 0, -cz])).rotate([a, 0, 0])).translate([0, 0, cz]));
/** D-ring hung on the rod: inner top of the curve on the rod top. */
const hungDRing = (t: Kit, y: number, width: number, height: number, wire: number) => t.k(dRing(t, 0, y, width, height, wire).translate([0, 0, HOOK_ROD / 2 + wire / 2 - height]));
/** Rogue ankle cuff: closed 4″ Cordura cuff (axis along the wall so its logo band faces out), hook-and-loop wrap, three welded
 * D-rings along the top (middle one on the hook), the large closure ring, heel strap, Rogue patch and Made in USA tag. */
export const buildRogueAnkleCuff = attachment(ROGUE_ANKLE_CUFF, t => {
  const w = 4 * IN, outer = 98, wire = 5, ringH = 26, bar = HOOK_ROD / 2 + wire / 2 - ringH, cz = bar - 6 - outer / 2, front = -outer / 2;
  const ring = hungDRing(t, 0, 30, ringH, wire), tab = t.box([30, 22, 12], [0, 0, bar - 3]);
  const rings = [0, -38, 38].map(a => a ? pivotX(t, ring, cz, a) : ring), tabs = [0, -38, 38].map(a => a ? pivotX(t, tab, cz, a) : tab);
  const along = (x0: number, x1: number, d: number, n = 56) => t.cylinder([x0, 0, cz], [x1, 0, cz], d, n);
  const cuff = t.k(along(-w / 2, w / 2, outer).subtract(along(-w / 2 - 1, w / 2 + 1, outer - 14)));
  const wrap = t.k(along(-27, 27, outer + 5).subtract(along(-28, 28, outer - 2)));
  const closure = t.k(t.k(dRing(t, 0, 0, 34, 30, wire).rotate([0, 90, 0])).translate([22, front - 4, cz + 17]));
  const heel = t.flat(t.band2(t.curve([[-34, cz - outer / 2 + 14], [-40, cz - outer / 2 - 28], [0, cz - outer / 2 - 58], [40, cz - outer / 2 - 28], [34, cz - outer / 2 + 14]], 6), 24), 3);
  const patch = t.box([36, 1.2, 13], [-10, front - 3.6, cz + 8]), word = t.box([24, .6, 4.5], [-10, front - 4.4, cz + 8]), flag = t.box([16, 1.2, 10], [-38, front + .2, cz + 16]);
  return [
    { name: 'Welded D-rings', solid: t.union([...rings, closure]), ...BLACK_OXIDE },
    { name: 'Cordura cuff and ring tabs', solid: t.union([cuff, ...tabs]), ...NYLON },
    { name: 'Hook-and-loop wrap', solid: wrap, ...NYLON, color: '#242528' },
    { name: 'Heel strap', solid: heel, ...NYLON },
    { name: 'Rogue patch', solid: patch, ...NYLON, color: '#0e0f10' },
    { name: 'Rogue wordmark', solid: word, ...LABEL_WHITE },
    { name: 'Made in USA tag', solid: flag, role: 'source', color: '#b3262e', metalness: 0, roughness: .7 },
  ];
});

/** Gymreapers ankle strap: 7 mm neoprene cuff with bound edges, hook-and-loop webbing wrap with the skull logo patch, and the two
 * closure D-rings meeting on top (both on the hook). */
export const buildGymreapersAnkleStrap = attachment(GYMREAPERS_ANKLE_STRAP, t => {
  const w = 88, outer = 100, wire = 5.5, ringH = 34, bar = HOOK_ROD / 2 + wire / 2 - ringH, cz = bar - 7 - outer / 2, front = -outer / 2;
  const rings = [-8, 8].map(y => hungDRing(t, y, 40, ringH, wire));
  const tab = t.box([44, 30, 14], [0, 0, bar - 3]);
  const along = (x0: number, x1: number, d: number, n = 56) => t.cylinder([x0, 0, cz], [x1, 0, cz], d, n);
  const cuff = t.k(along(-w / 2 + 3, w / 2 - 3, outer).subtract(along(-w / 2, w / 2, outer - 16)));
  const binding = [-1, 1].map(s => t.k(along(s * (w / 2 - 4), s * w / 2, outer + 2).subtract(along(s * (w / 2 - 5), s * (w / 2 + 1), outer - 20))));
  const wrap = t.k(along(-32, 32, outer + 6).subtract(along(-33, 33, outer - 2)));
  const patch = t.box([62, 1.4, 38], [0, front - 3.6, cz + 2]), mark = t.box([38, .7, 3.5], [-9, front - 4.6, cz + 2]), skull = t.cylinder([20, front - 4.2, cz + 2], [20, front - 5, cz + 2], 13, 20);
  return [
    { name: 'Stainless D-rings (black)', solid: t.union(rings), ...BLACK_OXIDE },
    { name: 'Neoprene cuff', solid: t.union([cuff, tab]), ...NYLON, color: '#141517' },
    { name: 'Edge binding', solid: t.union(binding), ...NYLON, color: '#27292c' },
    { name: 'Hook-and-loop webbing wrap', solid: wrap, ...NYLON, color: '#1e1f22' },
    { name: 'Logo patch', solid: patch, role: 'source', color: '#0b0b0c', metalness: .1, roughness: .35 },
    { name: 'Gymreapers wordmark and skull', solid: t.union([mark, skull]), ...LABEL_WHITE },
  ];
});

// ————— Straps —————
/** Spud long ab strap: steel ring, stitched 2″ stem with the yellow Spud label, two long forearm loops. */
export const buildSpudLongAbStrap = attachment(SPUD_LONG_AB_STRAP, t => {
  const ringR = 20, wire = 7, ringZ = hangZ(ringR - wire / 2), web = 2 * IN, stemTop = ringZ - ringR + 4, split = -200, bottom = -805;
  const stem = t.band2([[0, stemTop + 6], [0, split - 20]], web);
  const loop = (s: number) => t.band2(t.curve([[s * 14, split], [s * 66, split - 180], [s * 102, split - 430], [s * 94, bottom + 40], [s * 70, bottom + 17], [s * 44, bottom + 60], [s * 30, split - 330], [s * 16, split - 120], [s * 14, split]], 8), 32, true);
  const webbing = t.flat(t.union2([stem, loop(-1), loop(1)]), 3);
  const stitch = [0, 1, 2, 3].map(i => t.flat(t.band2([[-web / 2 + 7, stemTop - 12 - i * 9], [web / 2 - 7, stemTop - 12 - i * 9]], 1.4), .6, -1.8));
  const label = t.box([40, 1.2, 64], [0, -2.1, split + 26]), text = t.box([30, .6, 44], [0, -2.9, split + 26]);
  return [
    { name: 'Steel ring', solid: t.ring([0, 0, ringZ], ringR, wire), ...ZINC },
    { name: '2″ nylon webbing', solid: webbing, ...NYLON, color: '#2a2b2e' },
    { name: 'Bar-tack stitching', solid: t.union(stitch), ...STITCH },
    { name: 'Spud Inc. label', solid: label, role: 'source', color: '#d4c21c', metalness: 0, roughness: .7 },
    { name: 'Label lettering', solid: text, role: 'source', color: '#1a1a14', metalness: 0, roughness: .7 },
  ];
});

/** Daisy chains (pair): 20 mm tape folded over the hook (inner chain in front, outer chain behind), each leg hanging straight with
 * four pocket loops that bulge out of the wall, black bar-tacks between pockets, end loops at the bottom. */
export const buildDaisyChains = attachment(DAISY_CHAINS, t => {
  const tape = 20, thick = 2, len = 108, pockets = 4, top = HOOK_ROD / 2 + tape / 2, chains: Manifold[] = [], tacks: Manifold[] = [];
  /** Tape ribbon whose width runs along X at `x`, following a path in the YZ plane (pocket loops). */
  const ribbon = (x: number, path: P2[], w: number) => t.union(path.slice(1).map((q, i) => {
    const p = path[i], dy = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dy, dz) || 1, ny = -dz / l * thick / 2, nz = dy / l * thick / 2;
    return t.hull([p, q].flatMap(([y, z]) => [-1, 1].flatMap(sx => [-1, 1].map(sn => [x + sx * w / 2, y + sn * ny, z + sn * nz] as Vec3))));
  }));
  for (const [x, y] of [[16, -2], [50, 2]] as const) {
    const bands: CrossSection[] = [], bars: CrossSection[] = [], loops: Manifold[] = [];
    // Fold over the rod: an arch from leg to leg whose inner edge rests on the rod top.
    bands.push(t.band2(t.curve([[-x, -34], [-x * .72, -8], [0, top], [x * .72, -8], [x, -34]], 4), tape));
    for (const s of [-1, 1]) {
      const cx = s * x, zEnd = -30 - pockets * len;
      bands.push(t.band2([[cx, -34], [cx, zEnd]], tape));
      for (let p = 0; p < pockets; p++) {
        const z0 = -30 - p * len, z1 = z0 - len;
        loops.push(ribbon(cx, t.curve([[y - thick, z0 - 6], [y - 22, z0 - 26], [y - 30, z0 - len / 2], [y - 22, z1 + 26], [y - thick, z1 + 6]], 6), tape * .92));
        bars.push(t.band2([[cx - tape / 2 - 1.5, z0], [cx + tape / 2 + 1.5, z0]], 5));
      }
      bars.push(t.band2([[cx - tape / 2 - 1.5, zEnd], [cx + tape / 2 + 1.5, zEnd]], 5));
      bands.push(t.band2(t.curve([[cx, zEnd], [cx + s * 12, zEnd - 36], [cx + s * 5, zEnd - 90], [cx - s * 7, zEnd - 66], [cx - s * 4, zEnd - 18], [cx, zEnd]], 5), tape * .9, true));
    }
    chains.push(t.flat(t.union2(bands), thick, y), ...loops);
    tacks.push(t.flat(t.union2(bars), thick + 1.2, y));
  }
  return [
    { name: 'Red nylon daisy chains', solid: t.union(chains), role: 'liner', color: '#c21f2a', metalness: 0, roughness: .8 },
    { name: 'Bar-tacks', solid: t.union(tacks), role: 'liner', color: '#141414', metalness: 0, roughness: .9 },
  ];
});

/** MANUEKLEAR 3-grip tricep straps: polished D-ring, 6.3″ webbing stem with label, two padded legs with three hand openings each. */
export const buildManueklearTricepStraps = attachment(MANUEKLEAR_TRICEP_STRAPS, t => {
  const ringW = 40, ringH = 34, wire = 6, barZ = 3 + wire / 2 - ringH, split = 3 + wire / 2 - 6.3 * IN, bottom = 3 + wire / 2 - 24 * IN;
  const ring = dRing(t, 0, 0, ringW, ringH, wire), dRingSolid = t.k(ring.translate([0, 0, barZ]));
  const stem = t.flat(t.band2([[0, barZ + 2], [0, split - 30]], 38), 3.2);
  const pad: CrossSection[] = [], openings: CrossSection[] = [];
  for (const s of [-1, 1]) {
    const pts = t.curve([[s * 12, split - 10], [s * 30, split - 110], [s * 52, split - 260], [s * 68, bottom + 40], [s * 68, bottom + 14]], 6);
    pad.push(t.band2(pts, 56), t.hull2([t.circle2([s * 68, bottom + 30], 28), t.circle2([s * 68, bottom + 20], 28)]));
    const at = (f: number): P2 => { const i = Math.min(pts.length - 1, Math.round(f * (pts.length - 1))); return pts[i]; };
    for (const [f0, f1] of [[.2, .38], [.48, .66], [.76, .94]]) openings.push(t.hull2([t.circle2(at(f0), 15, 24), t.circle2(at(f1), 15, 24)]));
  }
  const legs2 = t.k(t.union2(pad).subtract(t.union2(openings)));
  const legs = t.flat(legs2, 8, 0);
  const lining = t.flat(t.k(t.k(t.union2(openings).offset(3, 'Round', 2, 16)).intersect(t.union2(pad))), 8.6, 0);
  const label = t.box([22, 1.2, 70], [0, -2.1, split + 50]), mark = t.box([8, .6, 8], [0, -2.9, split + 24]);
  return [
    { name: 'Polished steel D-ring', solid: dRingSolid, ...STAINLESS },
    { name: 'Nylon webbing stem', solid: stem, ...NYLON, color: '#7c3a86' },
    { name: 'Padded neoprene legs', solid: legs, role: 'liner', color: '#a44fb0', metalness: 0, roughness: .85 },
    { name: 'Black lining', solid: lining, ...NYLON },
    { name: 'MANUEKLEAR label', solid: label, role: 'source', color: '#111112', metalness: 0, roughness: .6 },
    { name: 'Label mark', solid: mark, role: 'source', color: '#e0b21c', metalness: 0, roughness: .6 },
  ];
});

// ————— Hardware —————
/** Bells of Steel jaw-swivel snap shackles, four on the hook: bail around the rod, body with quick-release plunger and pull ring,
 * swivel neck, clevis fork with pin and split ring. 70 mm overall. */
export const buildBosSwivelShackles = attachment(BOS_SWIVEL_SHACKLES, t => {
  const steel: Manifold[] = [], rings: Manifold[] = [];
  for (const y of [-15, 3, 21, 39]) {
    // Snap bail: a slim hook (6 mm bar, 16 mm opening) from the hinge boss over the rod and down to the latch.
    const bailIn = 8, cz = hangZ(bailIn), arc: P2[] = [];
    for (let i = 0; i <= 28; i++) { const ang = (-35 + i * 250 / 28) * Math.PI / 180; arc.push([(bailIn + 3) * Math.cos(ang), cz + (bailIn + 3) * Math.sin(ang)]); }
    const bail = t.flat(t.union2([t.band2(arc, 6), t.circle2([-11, -10], 4.5, 16), t.band2([[9, cz - 6.3], [11, -13]], 6)]), 5, y);
    const body = t.hull([t.box([26, 12, 3], [0, y, -15]), t.box([12, 10, 3], [0, y, -27])]);
    const plunger = t.union([t.cylinder([-15, y, -19], [16, y, -19], 5, 16), t.cylinder([-17, y, -19], [-14, y, -19], 7, 16)]);
    const neck = t.union([t.cylinder([0, y, -28], [0, y, -33], 9, 20), t.cylinder([0, y, -33], [0, y, -37], 11, 6)]);
    const lug = (x: number) => t.hull([t.cylinder([x, y - 4, -57.5], [x, y + 4, -57.5], 8, 20), t.box([5, 8, 1], [x, y, -52])]);
    const fork = t.union([t.box([22, 8, 5], [0, y, -39]), t.box([5, 8, 18], [-8.5, y, -46]), t.box([5, 8, 18], [8.5, y, -46]), lug(-8.5), lug(8.5)]);
    const pin = t.union([t.cylinder([-13, y, -57], [13, y, -57], 4.5, 16), t.cylinder([-14.5, y, -57], [-12, y, -57], 7, 16)]);
    steel.push(bail, body, plunger, neck, fork, pin);
    rings.push(t.k(t.k(t.ring([0, 0, 0], 7, 1.6, 24).rotate([0, 0, 90])).translate([18.5, y, -19])), t.k(t.k(t.ring([0, 0, 0], 7, 1.6, 24).rotate([0, 0, 90])).translate([15.5, y, -57])));
  }
  return [{ name: '316 stainless shackles', solid: t.union(steel), ...STAINLESS }, { name: 'Split pull rings', solid: t.union(rings), ...STAINLESS, roughness: .3 }];
});

/** Beyond Power premium carabiners, six on the hook: 75.5 × 40.3 mm anodised aluminium ovals, 10.7 mm stock, 9.9 mm straight bar gates. */
export const buildBeyondPowerCarabiners = attachment(BEYOND_POWER_CARABINER, t => {
  const stock = 10.5, halfW = (40.3 - stock) / 2, straight = 75.5 - 40.3, innerR = 19.3 / 2, topZ = HOOK_ROD / 2 - innerR, botZ = topZ - straight;
  const frames: Manifold[] = [], gates: Manifold[] = [];
  for (let i = 0; i < 6; i++) {
    const y = -16 + i * 12.5, arc = (z: number, a0: number) => {
      const pts: Vec3[] = []; for (let j = 0; j <= 12; j++) { const a = a0 + j * Math.PI / 12; pts.push([halfW * Math.cos(a), y, z + halfW * Math.sin(a)]); } return pts;
    };
    // Spine (x > 0) and both bends; the gate side keeps a short hinge stub at the bottom and a notched nose at the top.
    const top = arc(topZ, 0), bottom = arc(botZ, Math.PI);
    frames.push(t.tube([[halfW, y, botZ], [halfW, y, topZ], ...top.slice(1), [-halfW, y, topZ - 4]], stock, 16), t.tube([...bottom, [halfW, y, botZ]], stock, 16), t.tube([[-halfW, y, botZ], [-halfW, y, botZ + 6]], stock, 16));
    gates.push(t.cylinder([-halfW + .8, y, botZ + 6], [-halfW + .8, y, topZ - 7], 9.9, 20));
  }
  return [{ name: 'Anodised aluminium frames', solid: t.union(frames), role: 'source', color: '#8e9398', metalness: .85, roughness: .32 }, { name: 'Straight bar gates', solid: t.union(gates), role: 'source', color: '#5c6166', metalness: .8, roughness: .35 }];
});

// ————— BLUSLM rubber-dipped lat bars —————
interface BluslmSpec { width: number; kind: 'wave' | 'v' | 'close'; /** grip trace angle from horizontal (°, + = outer end up) */ grip: number; paddle: number }
const RUBBER: Material = { role: 'liner', color: '#1c1d1f', metalness: 0, roughness: .86 };
function bluslm(part: HangPart, spec: BluslmSpec) {
  return attachment(part, t => {
    const holeR = 6.5, eyeZ = hangZ(holeR), th = 17, bw = 38, a = spec.grip * Math.PI / 180, L = spec.paddle;
    // Grip paddle: tapered rubber block at a frame end, projecting out of the wall (−Y), traced at `grip` degrees in XZ.
    // Corners are [along the trace, y, across the trace] for the right-hand paddle; the left one mirrors it.
    const corners: Vec3[] = [[-4, th / 2, -12], [-4, th / 2, 12], [L, th / 2, -8], [L, th / 2, 8], [-2, -62, -10], [-2, -62, 10], [L * .82, -60, -6], [L * .82, -60, 6]];
    const local = ([along, y, off]: Vec3): Vec3 => [Math.cos(a) * along - Math.sin(a) * off, y, Math.sin(a) * along + Math.cos(a) * off];
    // Fit the frame so the overall width across the paddles is the published width.
    const reach = Math.max(bw / 2 * .2, ...corners.map(c => local(c)[0])), end = spec.width / 2 - reach;
    const half: P2[] = spec.kind === 'wave'
      ? [[0, eyeZ - 6], [.1 * end, eyeZ - 34], [.28 * end, eyeZ - 60], [.46 * end, eyeZ - 47], [.66 * end, eyeZ - 62], [.86 * end, eyeZ - 68], [end, eyeZ - 68]]
      : spec.kind === 'v' ? [[0, eyeZ - 6], [.5 * end, eyeZ - 42], [.9 * end, eyeZ - 66], [end, eyeZ - 68]]
        : [[0, eyeZ - 6], [0, eyeZ - 34], [.4 * end, eyeZ - 60], [end, eyeZ - 64]];
    const path = t.curve([...mirrorX(half).reverse(), ...half.slice(1)], 6);
    const apex = t.hull2([t.circle2([0, eyeZ], 17, 32), t.circle2([0, eyeZ - 14], 16)]);
    const frame2 = t.k(t.union2([t.band2(path, bw), apex]).subtract(t.circle2([0, eyeZ], holeR + 4.5, 32)));
    const frame = t.flat(frame2, th);
    const grommet = t.k(t.cylinder([0, -th / 2 - 1, eyeZ], [0, th / 2 + 1, eyeZ], 2 * holeR + 9, 32).subtract(t.cylinder([0, -th, eyeZ], [0, th, eyeZ], 2 * holeR, 32)));
    const paddles = [-1, 1].map(s => t.hull(corners.map(c => { const [x, y, z] = local(c); return [s * (end + x), y, half.at(-1)![1] + z] as Vec3; })));
    const h = end;
    const logoAt: P2 = spec.kind === 'close' ? [0, eyeZ - 44] : [-.3 * h, eyeZ - 50];
    const logo = t.box([spec.kind === 'close' ? 34 : 64, .8, 9], [logoAt[0], -th / 2 - .3, logoAt[1] + (spec.kind === 'close' ? 0 : 4)]);
    return [
      { name: 'Rubber-dipped steel frame', solid: t.union([frame, ...paddles]), ...RUBBER },
      { name: 'Steel grommet eye', solid: grommet, ...STAINLESS },
      { name: 'BLUSLM print', solid: logo, role: 'source', color: '#c9a227', metalness: .2, roughness: .6 },
    ];
  });
}
export const buildBluslmWave84 = bluslm(BLUSLM_WAVE_84, { width: 841, kind: 'wave', grip: 22, paddle: 86 });
export const buildBluslmWave78 = bluslm(BLUSLM_WAVE_78, { width: 780, kind: 'wave', grip: 68, paddle: 80 });
export const buildBluslmV62 = bluslm(BLUSLM_V_62, { width: 623, kind: 'v', grip: 28, paddle: 84 });
export const buildBluslmV60 = bluslm(BLUSLM_V_60, { width: 595, kind: 'v', grip: 100, paddle: 78 });
export const buildBluslmV56 = bluslm(BLUSLM_V_56, { width: 555, kind: 'v', grip: 80, paddle: 78 });
export const buildBluslmClose24 = bluslm(BLUSLM_CLOSE_24, { width: 245, kind: 'close', grip: 40, paddle: 72 });
export const buildBluslmClose26 = bluslm(BLUSLM_CLOSE_26, { width: 265, kind: 'close', grip: 24, paddle: 86 });
export const buildBluslmClose22 = bluslm(BLUSLM_CLOSE_22, { width: 220, kind: 'close', grip: 88, paddle: 70 });

export const definitions: PartDefinition[] = [
  hangDefinition(ROGUE_V_GRIP, buildRogueVGrip), hangDefinition(SPUD_LONG_AB_STRAP, buildSpudLongAbStrap), hangDefinition(ROGUE_SINGLE_HANDLE, buildRogueSingleHandle),
  hangDefinition(DAISY_CHAINS, buildDaisyChains), hangDefinition(BLUSLM_WAVE_84, buildBluslmWave84), hangDefinition(BLUSLM_WAVE_78, buildBluslmWave78),
  hangDefinition(BLUSLM_V_62, buildBluslmV62), hangDefinition(BLUSLM_V_60, buildBluslmV60), hangDefinition(BLUSLM_V_56, buildBluslmV56),
  hangDefinition(BLUSLM_CLOSE_24, buildBluslmClose24), hangDefinition(BLUSLM_CLOSE_26, buildBluslmClose26), hangDefinition(BLUSLM_CLOSE_22, buildBluslmClose22),
  hangDefinition(ROGUE_LAT_BAR, buildRogueLatBar), hangDefinition(GYMREAPERS_ANKLE_STRAP, buildGymreapersAnkleStrap), hangDefinition(ROGUE_CURL_BAR, buildRogueCurlBar),
  hangDefinition(ROGUE_ANKLE_CUFF, buildRogueAnkleCuff), hangDefinition(BEYOND_POWER_CARABINER, buildBeyondPowerCarabiners), hangDefinition(MANUEKLEAR_TRICEP_STRAPS, buildManueklearTricepStraps),
  hangDefinition(BOS_SWIVEL_SHACKLES, buildBosSwivelShackles), hangDefinition(ROGUE_STRAIGHT_BAR_40, buildRogueStraightBar40), hangDefinition(ROGUE_STRAIGHT_BAR_20, buildRogueStraightBar20),
];
