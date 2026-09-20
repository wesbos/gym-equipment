/** Bands, rings, suspension trainers, collars and other pegboard accessories: Manifold builders for the entries in ../hang-parts/hanging-accessories.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `hangDefinition(PART, build)` per entry.
 *
 * Same hang contract as the cable attachments: source axes X along the wall, -Y out of it, Z up; the origin is the anchor on the hook
 * rod axis (the rod is Ø6, so whatever rests on it touches z = +3), and `hook: 1` adds the same J-peg. The peg runs from the panel
 * face (y = +75) to its upturned tip (y ≈ -22, rising to z = +23), so anything threaded on it lives in y ∈ [-19.5, 75].
 * Loops (bands, collars, rings, belts) hang the physical way: the rod passes through them, so a loop's width runs along the peg (Y).
 * Webbing tails that hang below a loop (wraps, straps, TRX, ring straps, the pillow belt) are modelled flat-laid facing out, as in the
 * cable-handles family. Sources and every estimate: rack-generator/research/hanging-accessories.md. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { HOOK_REACH, HOOK_ROD, hangDefinition, type HangPart } from '../hang-part.ts';
import { smooth } from './cable-attachments.ts';
import {
  MONSTER_BANDS, MONSTER_BAND_0, MONSTER_BAND_1, MONSTER_BAND_2, MONSTER_BAND_3, MONSTER_BAND_4, MONSTER_BAND_5, MONSTER_BAND_6, MONSTER_BAND_7,
  ELITEFTS_PACK, ELITEFTS_BAND_PACK, FAT_GRIPZ, FAT_GRIPZ_EXTREME, CAPTAINS_OF_CRUSH, KEPPI_OPENCOLLAR, ROGUE_USA_COLLARS, TITAN_TWISTLOCK_PRO,
  ROGUE_HG_COLLARS, BOS_MAGNETIC_COLLARS, FRINGE_MAGPIN, OAK_CLUB_MAGPIN_3, TRX_HOME2, REP_WOOD_RINGS, SLING_SHOT, HIP_CIRCLE, SPUD_PILLOW_BELT,
  INZER_LEVER_BELT, ROGUE_WRIST_WRAPS, ROGUE_OHIO_STRAPS, ROGUE_SR1,
} from '../hang-parts/hanging-accessories.ts';

type Material = Pick<SolidPart, 'role' | 'color' | 'metalness' | 'roughness'>;
const latex = (color: string): Material => ({ role: 'liner', color, metalness: 0, roughness: .62 });
const fabric = (color: string, roughness = .92): Material => ({ role: 'liner', color, metalness: 0, roughness });
const print = (color: string): Material => ({ role: 'source', color, metalness: 0, roughness: .7 });
const STAINLESS: Material = { role: 'source', color: '#c9cdd0', metalness: 1, roughness: .24 };
const POLISHED: Material = { role: 'source', color: '#dfe2e5', metalness: 1, roughness: .14 };
const RAW_ALUMINIUM: Material = { role: 'handle', color: '#c2c6ca', metalness: .9, roughness: .45 };
const BLACK_ANODISED: Material = { role: 'source', color: '#1d1e20', metalness: .6, roughness: .38 };
const BLACK_KNURL: Material = { role: 'handle', color: '#2a2b2e', metalness: .55, roughness: .72 };
const BLACK_PLASTIC: Material = { role: 'source', color: '#151617', metalness: .05, roughness: .55 };
const BLACK_RUBBER: Material = { role: 'liner', color: '#141516', metalness: 0, roughness: .85 };
const BLACK_STEEL: Material = { role: 'source', color: '#1c1d1f', metalness: .45, roughness: .5 };
const WEBBING: Material = fabric('#151618', .9);
const WHITE = print('#ecece8');
const HOOK: Material = { role: 'source', color: '#26282a', metalness: .4, roughness: .5 };
const IN = 25.4, ROD = HOOK_ROD / 2;
/** Front limit for anything threaded on the peg: the back of the upturned tip. */
const TIP_BACK = -19.4;
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
  const tube = (points: Vec3[], d: number, n = 16) => union(points.slice(1).map((p, i) => k(M.hull([sphere(points[i], d, n), sphere(p, d, n)]))));
  const box = (size: Vec3, at: Vec3) => k(k(M.cube(size, true)).translate(at));
  const union = (list: Manifold[]) => list.length === 1 ? list[0] : k(M.union(list));
  const hull = (list: (Manifold | Vec3)[]) => k(M.hull(list));
  /** Torus in the XZ plane (axis along Y), so a hook rod along Y threads it. */
  const ring = (center: Vec3, radius: number, wire: number, n = 48, m = 14) => {
    const circle = k(C.circle(wire / 2, m)), moved = k(circle.translate([radius, 0]));
    return k(k(k(moved.revolve(n)).rotate([90, 0, 0])).translate(center));
  };
  /** 2D outline in the XZ plane (x, z), extruded along Y over [y0, y1]. */
  const prismXZ = (section: CrossSection, y0: number, y1: number) => k(k(k(section.extrude(y1 - y0)).rotate([90, 0, 0])).translate([0, y1, 0]));
  /** 2D outline in the YZ plane (y, z), extruded along X over [x0, x1]. */
  const prismYZ = (section: CrossSection, x0: number, x1: number) => k(k(k(section.extrude(x1 - x0)).rotate([90, 0, 90])).translate([x0, 0, 0]));
  const circle2 = ([x, z]: P2, r: number, n = 32) => k(k(C.circle(r, n)).translate([x, z]));
  const rect2 = (w: number, h: number, [x, z]: P2 = [0, 0]) => k(k(C.square([w, h], true)).translate([x, z]));
  const rrect2 = (w: number, h: number, r: number, at: P2 = [0, 0]) => k(k(k(C.square([w - 2 * r, h - 2 * r], true)).offset(r, 'Round', 2, 12)).translate(at));
  const hull2 = (list: CrossSection[]) => k(C.hull(list));
  const union2 = (list: CrossSection[]) => list.length === 1 ? list[0] : k(C.union(list));
  const poly2 = (points: P2[]) => { const area = points.reduce((s, p, i) => { const q = points[(i + 1) % points.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0); return k(new C([area < 0 ? [...points].reverse() : points])); };
  /** In-plane band of `width` along a polyline; closed joins the ends. */
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
  const curve = (points: P2[], step = 6): P2[] => smooth(points, step).map(([x, , z]) => [x, z]);
  /** Rotate about an axis parallel to X through (y, z). */
  const rotX = (m: Manifold, degrees: number, [y, z]: P2) => k(k(k(m.translate([0, -y, -z])).rotate([degrees, 0, 0])).translate([0, y, z]));
  /** Rotate about an axis parallel to Y through (x, z). */
  const rotY = (m: Manifold, degrees: number, [x, z]: P2) => k(k(k(m.translate([-x, 0, -z])).rotate([0, degrees, 0])).translate([x, 0, z]));
  const hook = () => union([cylinder([0, HOOK_REACH + 4.5, 0], [0, -22, 0], HOOK_ROD, 16), sphere([0, -22, 0], HOOK_ROD, 16), cylinder([0, -22, 0], [0, -25, 20], HOOK_ROD, 16), sphere([0, -25, 20], HOOK_ROD, 16), sphere([0, HOOK_REACH + 4.5, 0], HOOK_ROD, 16), cylinder([0, HOOK_REACH + 4.5, 0], [0, HOOK_REACH + 4.5, -12], HOOK_ROD, 16)]);
  return { M, C, owned, k, cylinder, sphere, tube, box, union, hull, ring, prismXZ, prismYZ, circle2, rect2, rrect2, hull2, union2, poly2, band2, curve, rotX, rotY, hook };
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

// ————— Hung loops —————
/** A loop draped over the rod: top arc (radius a, centre on the rod axis) and bottom arc (radius b, centre D below) joined by the
 * outer tangents. Radii are centreline radii; b < a pinches the loop below the rod (a sleeve with something hanging from it). */
export interface Drape { a: number; b: number; D: number; phi: number }
const drapePerimeter = (a: number, b: number, D: number) => { const phi = Math.asin((b - a) / D); return a * (Math.PI - 2 * phi) + b * (Math.PI + 2 * phi) + 2 * Math.sqrt(D * D - (b - a) ** 2); };
/** Solve the arc spacing D so the loop centreline has perimeter P. */
export function drape(a: number, b: number, P: number, top = 0): Drape & { top: number } {
  let lo = Math.abs(b - a) + 1e-6, hi = P;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (drapePerimeter(a, b, mid) < P) lo = mid; else hi = mid; }
  const D = (lo + hi) / 2; return { a, b, D, phi: Math.asin((b - a) / D), top };
}
/** Closed outline of the drape offset by o (positive = outward), counter-clockwise, top centre at z = top. */
function drapePath({ a, b, D, phi, top }: Drape & { top: number }, o: number, step = 4): P2[] {
  const arc = (cz: number, r: number, from: number, to: number) => {
    const n = Math.max(6, Math.ceil(Math.abs(to - from) * r / step)), pts: P2[] = [];
    for (let i = 0; i <= n; i++) { const ang = from + (to - from) * i / n; pts.push([r * Math.cos(ang), cz + r * Math.sin(ang)]); }
    return pts;
  };
  return [...arc(top, a + o, phi, Math.PI - phi), ...arc(top - D, b + o, Math.PI - phi, 2 * Math.PI + phi)];
}
/** The drape's right strand at fraction f (0 = top tangent, 1 = bottom tangent), pushed out by o along its normal. */
function strandPoint({ a, b, D, phi, top }: Drape & { top: number }, f: number, o: number, side = 1): P2 {
  const n: P2 = [Math.cos(phi), Math.sin(phi)], p: P2 = [a * n[0], top + a * n[1]], q: P2 = [b * n[0], top - D + b * n[1]];
  return [side * (p[0] + (q[0] - p[0]) * f + n[0] * o), p[1] + (q[1] - p[1]) * f + n[1] * o];
}
/** Drape ring (thickness t) extruded over y ∈ [y0, y1]; where y0 reaches past the peg tip the front edge tapers back to it near the top. */
function loopSolid(t: Kit, d: Drape & { top: number }, thick: number, y0: number, y1: number) {
  const section = t.k(t.poly2(drapePath(d, thick / 2)).subtract(t.poly2(drapePath(d, -thick / 2))));
  const solid = t.prismXZ(section, y0, y1);
  return y0 < TIP_BACK ? clipFront(t, solid, y0, d.top - 6, d.top - 70) : solid;
}
/** Gather the front edge onto the peg: keep y ≥ TIP_BACK above zStart, the full front y0 below zFull, linear between. */
function clipFront(t: Kit, solid: Manifold, y0: number, zStart: number, zFull: number) {
  const big = 4000, keep = t.poly2([[TIP_BACK, big], [TIP_BACK, zStart], [y0 - 1, zFull], [y0 - 1, -big], [big, -big], [big, big]]);
  return t.k(solid.intersect(t.prismYZ(keep, -big, big)));
}
/** Flat plate lying on a strand's outer face (fractions f0–f1 along the strand), spanning y ∈ [y0, y1]. */
function strandPlate(t: Kit, d: Drape & { top: number }, thick: number, f0: number, f1: number, y0: number, y1: number, depth = .7, side = 1, lift = 0) {
  const o = thick / 2 + lift + depth / 2;
  return t.prismXZ(t.band2([strandPoint(d, f0, o, side), strandPoint(d, f1, o, side)], depth), y0, y1);
}
/** Outline badge (rectangle ring) on a strand face: the stitched logo patch on Mark Bell bands. */
function strandBadge(t: Kit, d: Drape & { top: number }, thick: number, fc: number, len: number, y0: number, y1: number, stroke = 3, side = 1) {
  const strandLen = Math.hypot(...strandPoint(d, 1, 0).map((v, i) => v - strandPoint(d, 0, 0)[i]) as [number, number]);
  const f0 = fc - len / 2 / strandLen, f1 = fc + len / 2 / strandLen, s = stroke / strandLen, ys = stroke;
  return t.union([strandPlate(t, d, thick, f0, f1, y0, y0 + ys, .7, side), strandPlate(t, d, thick, f0, f1, y1 - ys, y1, .7, side),
    strandPlate(t, d, thick, f0, f0 + s, y0, y1, .7, side), strandPlate(t, d, thick, f1 - s, f1, y0, y1, .7, side)]);
}
/** Y range for a loop of width w threaded on the peg: slid forward against the upturned tip, or flush with the panel when wider. */
const pegSpan = (w: number): P2 => w <= 74 - TIP_BACK - .5 ? [TIP_BACK + .5, TIP_BACK + .5 + w] : [74 - w, 74];

// ————— Rogue Monster Bands —————
/** Monster Band #n: 41″ flat length (inner perimeter 82″), the rod carrying the top bend, a looser bottom bend on wider bands. */
export function monsterBandDrape(n: number) {
  const b = MONSTER_BANDS[n], thick = b.thick * IN, bIn = 11 + 4.5 * b.width;
  return { ...drape(ROD + thick / 2, bIn + thick / 2, 2 * 41 * IN + Math.PI * thick), thick, width: b.width * IN };
}
function monsterBand(n: number) {
  const b = MONSTER_BANDS[n];
  return (t: Kit): Piece[] => {
    const d = monsterBandDrape(n), [y0, y1] = pegSpan(d.width), mid = (y0 + y1) / 2, wide = b.width >= 1.75;
    const band = loopSolid(t, d, d.thick, y0, y1);
    // Print: the big ROGUE on 1.75″+ bands, the small Rogue Fitness wordmark on the minis; both run along the strand.
    const len = wide ? 3.4 * d.width : 130, strand = d.D, f0 = .22, f1 = f0 + len / strand, ph = (wide ? .66 : .5) * d.width;
    // Five letter blocks for ROGUE (the minis' small wordmark stays one strip).
    const printed = wide ? [0, 1, 2, 3, 4].map(i => strandPlate(t, d, d.thick, f0 + (f1 - f0) * i / 5, f0 + (f1 - f0) * (i + .78) / 5, mid - ph / 2, mid + ph / 2)) : [strandPlate(t, d, d.thick, f0, f1, mid - ph / 2, mid + ph / 2)];
    if (n === 7) for (const f of [.13, .155, .18]) printed.push(strandPlate(t, d, d.thick, f, f + 7 / strand, y0 + 2, y1 - 2));
    return [
      { name: `${b.colour[0].toUpperCase()}${b.colour.slice(1)} latex band`, solid: band, ...latex(b.hex) },
      { name: n === 7 ? 'ROGUE print and stripes' : 'Rogue print', solid: t.union(printed), ...print(b.print) },
    ];
  };
}

/** elitefts Pro pack: eight loops nested on the rod (inner = widest). Nested loops share the arc spacing D, so each outer loop is
 * the inner outline offset by one band thickness. */
export function elitePackDrapes() {
  const thick = 4.5, gap = .15, order = [3, 3, 2, 2, 1, 1, 0, 0], a0 = ROD + thick / 2, b0 = 17;
  const mid = 3.5 * (thick + gap), base = drape(a0 + mid, b0 + mid, 2 * 41 * IN + Math.PI * thick);
  return order.map((kind, i) => { const o = i * (thick + gap); return { kind, thick, drape: { ...base, a: a0 + o, b: b0 + o, phi: Math.asin((b0 - a0) / base.D) } }; });
}
const buildElitePack = attachment(ELITEFTS_BAND_PACK, t => {
  const loops = elitePackDrapes(), byKind: Manifold[][] = [[], [], [], []], prints: Manifold[] = [];
  loops.forEach(({ kind, thick, drape: d }, i) => {
    const w = ELITEFTS_PACK[kind].width * IN, y0 = TIP_BACK + .4, y1 = y0 + w;
    byKind[kind].push(loopSolid(t, d, thick, y0, y1));
    // White elitefts print on the outer loop of each pair, on the part of its face the narrower bands in front leave visible.
    if (i % 2) {
      const front = i < 7 ? y0 + ELITEFTS_PACK[loops[i + 1].kind].width * IN : y0, vis0 = Math.max(front, y0) + 2, vis1 = y1 - 2;
      const len = Math.max(60, 2.4 * (vis1 - vis0)), f0 = .2 + i * .02;
      if (vis1 - vis0 > 6) prints.push(strandPlate(t, d, thick, f0, f0 + len / d.D, vis0 + .15 * (vis1 - vis0), vis1 - .15 * (vis1 - vis0), .6, i % 4 === 1 ? 1 : -1));
    }
  });
  return [
    ...ELITEFTS_PACK.map((b, kind) => ({ name: `${b.name} bands (2)`, solid: t.union(byKind[kind]), ...latex(b.hex) })),
    { name: 'elitefts prints', solid: t.union(prints), ...WHITE },
  ];
});

// ————— Mark Bell Sling Shot & Hip Circle —————
/** Sling Shot Original, L, hung by one sleeve: top sleeve pinched below the rod into the sewn centre panel, the second sleeve hanging
 * free below. The 6.5″ sleeves gather onto the peg at the top and open to full width below. */
export const SLING = { width: 6.5 * IN, thick: 3.2, sleeve: 2 * 7.5 * IN, panel: 5 * IN };
const buildSlingShot = attachment(SLING_SHOT, t => {
  const { width, thick, sleeve, panel } = SLING, y1 = 73.5, y0 = y1 - width;
  const top = drape(ROD + thick / 2, thick, sleeve + Math.PI * thick);
  const joinTop = -top.D, joinBottom = joinTop - panel;
  const lower = { ...drape(thick, 20, sleeve + Math.PI * thick), top: joinBottom };
  const section = t.union2([
    t.k(t.poly2(drapePath({ ...top, top: 0 }, thick / 2)).subtract(t.poly2(drapePath({ ...top, top: 0 }, -thick / 2)))),
    t.rect2(4 * thick, panel + 2, [0, (joinTop + joinBottom) / 2]),
    t.k(t.poly2(drapePath(lower, thick / 2)).subtract(t.poly2(drapePath(lower, -thick / 2)))),
  ]);
  const body = clipFront(t, t.prismXZ(section, y0, y1), y0, -2, -60);
  // White seams across the panel ends and down the sleeve centre lines; a white outline badge on the lower sleeve.
  const seamX = 2 * thick + .3, seams = [joinTop, joinBottom].map(z => t.box([.8, width - 6, 3], [seamX, (y0 + y1) / 2, z]));
  const midSeam = t.box([.8, 2, panel - 8], [seamX, (y0 + y1) / 2, (joinTop + joinBottom) / 2]);
  const badge = strandBadge(t, lower, thick, .45, 75, (y0 + y1) / 2 - 42, (y0 + y1) / 2 + 42, 3.5);
  return [
    { name: 'Red Sling Shot elastic', solid: body, ...fabric('#c8211e', .85) },
    { name: 'White seams and badge', solid: t.union([...seams, midSeam, badge]), ...WHITE },
  ];
});
/** Hip Circle, L: 3.25″ woven loop (≈ 15.5″ flat), soft enough to hang in a round-bottomed drape. */
export const HIP = { width: 3.25 * IN, thick: 4, flat: 15.5 * IN };
const buildHipCircle = attachment(HIP_CIRCLE, t => {
  const { width, thick, flat } = HIP, d = { ...drape(ROD + thick / 2, 26, 2 * flat + Math.PI * thick), top: 0 }, [y0, y1] = pegSpan(width), mid = (y0 + y1) / 2;
  const grip = [.3, .5, .7].map(f => t.prismXZ(t.band2([strandPoint(d, 0, -thick / 2 - .3, -1), strandPoint(d, 1, -thick / 2 - .3, -1)], .6), y0 + f * width - 1.5, y0 + f * width + 1.5));
  return [
    { name: 'Black woven fabric loop', solid: loopSolid(t, d, thick, y0, y1), ...fabric('#1c1c1e') },
    { name: 'Grip strips', solid: t.union(grip), ...fabric('#3a3b3e', .7) },
    { name: 'White badge', solid: strandBadge(t, d, thick, .5, 58, mid - 26, mid + 26, 3), ...WHITE },
  ];
});

// ————— Fat Gripz —————
/** Fat Gripz slid onto the peg: the bore rests on the peg tip at the front and on the rod near the panel, so the grip tilts down
 * toward the wall. Built along +Y, then tilted about the tip contact. */
export function gripzPose(od: number) {
  const L = 4.75 * IN, rb = 1.1 * IN / 2, ro = od / 2, contact: P2 = [-25, 23];
  let front = 20, theta = 0;
  for (let i = 0; i < 60; i++) {
    const back = L - front; theta = Math.asin((contact[1] - ROD) / back);
    const maxY = contact[0] + back * Math.cos(theta) + (ro - rb) * Math.sin(theta);
    if (maxY > 74.5) front += .25; else break;
  }
  return { L, rb, ro, front, theta: theta * 180 / Math.PI, contact };
}
function fatGripz(part: HangPart, od: number, colour: string, text: string) {
  return attachment(part, t => {
    const { L, rb, ro, front, theta, contact } = gripzPose(od), zc = contact[1] - rb, y0 = contact[0] - front, y1 = y0 + L;
    const slotAt = -70 * Math.PI / 180, slot = t.hull2([t.circle2([rb * Math.cos(slotAt), zc + rb * Math.sin(slotAt)], 2.2, 12), t.circle2([ro * 1.3 * Math.cos(slotAt), zc + ro * 1.3 * Math.sin(slotAt)], 2.2, 12)]);
    const section = t.k(t.k(t.circle2([0, zc], ro, 56).subtract(t.circle2([0, zc], rb, 40))).subtract(slot));
    const body = t.prismXZ(section, y0, y1);
    // Smooth label panel on the +X flank with the black wordmark; end chamfer rings.
    const panel = t.k(t.prismXZ(t.k(t.circle2([0, zc], ro + .6, 56).subtract(t.circle2([0, zc], ro - .5, 56))), y0 + 16, y1 - 16).intersect(t.box([ro, L, ro * .9], [ro, (y0 + y1) / 2, zc + ro * .12])));
    const shell = t.k(t.circle2([0, zc], ro + 1, 56).subtract(t.circle2([0, zc], ro + .3, 56))), band = t.box([ro, L, ro * .3], [ro, (y0 + y1) / 2, zc + ro * .22]);
    const word = t.union([t.k(t.prismXZ(shell, y0 + 22, y0 + 44).intersect(band)), t.k(t.prismXZ(shell, y0 + 50, y1 - 22).intersect(band))]);
    const tilt = (m: Manifold) => t.rotX(m, -theta, contact);
    return [
      { name: `${part.id === 'fat-gripz' ? 'Blue' : 'Orange'} textured rubber sleeve`, solid: tilt(body), ...fabric(colour, .8) },
      { name: 'Smooth label panel', solid: tilt(panel), ...fabric(colour, .45) },
      { name: 'Fat Gripz wordmark', solid: tilt(word), ...print(text) },
    ];
  });
}

// ————— IronMind Captains of Crush —————
/** CoC No. 1 hung by its coil: 2.5-turn Ø6.2 spring (coil axis along the peg), legs into two knurled 1″ × 3.9″ handles. */
export const COC = { wire: 6.2, coil: 14, handle: 25.4, handleLen: 99, splay: 15, leg: 24 };
const buildCoC = attachment(CAPTAINS_OF_CRUSH, t => {
  const { wire, coil, handle, handleLen, splay, leg } = COC, zc = ROD - (coil - wire / 2), turns = 2.5, pitch = wire + .6;
  const helix: Vec3[] = [];
  for (let i = 0; i <= 60; i++) { const f = i / 60, ang = f * turns * 2 * Math.PI; helix.push([coil * Math.cos(ang), -turns * pitch / 2 + f * turns * pitch, zc + coil * Math.sin(ang)]); }
  const s = splay * Math.PI / 180, dir = (side: number): Vec3 => [side * Math.sin(s), 0, -Math.cos(s)];
  const top = (side: number): Vec3 => [side * coil + side * leg * Math.sin(s), side * 3.5, zc - leg * Math.cos(s)];
  const along = (side: number, d: number): Vec3 => { const p = top(side), v = dir(side); return [p[0] + v[0] * d, p[1], p[2] + v[2] * d]; };
  const legs = [1, -1].map(side => t.tube([side > 0 ? helix[0] : helix.at(-1)!, [side * coil, side * 3.5, zc - 2], along(side, 10)], wire, 14));
  const spring = t.union([t.tube(helix, wire, 14), ...legs]);
  const handles = [1, -1].map(side => t.union([t.cylinder(along(side, 0), along(side, 13), handle - 2, 32, handle), t.cylinder(along(side, 16.5), along(side, handleLen), handle, 32)]));
  const bands = [1, -1].map(side => t.cylinder(along(side, 13), along(side, 16.5), handle - .8, 32));
  const ends = [1, -1].map(side => t.cylinder(along(side, handleLen), along(side, handleLen + .6), handle - 3, 32));
  return [
    { name: 'GR8 steel spring', solid: spring, role: 'source', color: '#9da2a6', metalness: .95, roughness: .3 },
    { name: 'Knurled aluminium handles', solid: t.union(handles), ...RAW_ALUMINIUM },
    { name: 'Smooth handle bands and end faces', solid: t.union([...bands, ...ends]), ...POLISHED },
  ];
});

// ————— Barbell collars: a pair threaded on the peg, bores resting on the rod —————
/** Collar i of a pair: y range for width w, front collar just behind the peg tip, back collar next to it. */
const pairSpan = (w: number, i: number, gap = 1.5): P2 => { const y0 = TIP_BACK - .6 + i * (w + gap); return [y0, y0 + w]; };
/** Bore centre for a bore (innermost surface) of radius r resting on the rod. */
const boreZ = (r: number) => ROD - r;

/** Keppi OPENCOLLAR: C-shaped body opening downward, aluminium cover over the top-left, lever with loop on top, steel jaw tabs. */
export const KEPPI = { od: 96, width: 44, bore: 25.6, opening: 50 };
const buildKeppi = attachment(KEPPI_OPENCOLLAR, t => {
  const { od, width, bore, opening } = KEPPI, zc = boreZ(bore), R = od / 2, bodies: Manifold[] = [], covers: Manifold[] = [], levers: Manifold[] = [], jaws: Manifold[] = [], marks: Manifold[] = [];
  const C2 = t.k(t.k(t.circle2([0, zc], R - 2.5, 64).subtract(t.circle2([0, zc], bore, 56))).subtract(t.rect2(opening, R, [0, zc - R / 2])));
  const arc = (r0: number, r1: number, a0: number, a1: number) => {
    const pts: P2[] = []; for (let i = 0; i <= 24; i++) { const a = (a0 + (a1 - a0) * i / 24) * Math.PI / 180; pts.push([r1 * Math.cos(a), zc + r1 * Math.sin(a)]); }
    for (let i = 24; i >= 0; i--) { const a = (a0 + (a1 - a0) * i / 24) * Math.PI / 180; pts.push([r0 * Math.cos(a), zc + r0 * Math.sin(a)]); }
    return t.poly2(pts);
  };
  for (const i of [0, 1]) {
    const [y0, y1] = pairSpan(width, i);
    bodies.push(t.prismXZ(C2, y0 + 1, y1 - 1));
    covers.push(t.prismXZ(arc(R - 3, R, 70, 222), y0, y1), t.prismXZ(arc(R - 7, R - 2.4, 96, 222), y0 - .6, y0 + 1.5), t.prismXZ(arc(R - 7, R - 2.4, 96, 222), y1 - 1.5, y1 + .6));
    levers.push(t.prismXZ(t.union2([t.rrect2(36, 9, 3, [8, zc + R + 2]), t.k(t.rrect2(16, 14, 5, [28, zc + R + 4]).subtract(t.rrect2(8, 6, 2.5, [28, zc + R + 4])))]), y0 + 6, y1 - 6));
    for (const s of [-1, 1]) jaws.push(t.box([4, width - 10, 12], [s * (opening / 2 + 1), (y0 + y1) / 2, zc - bore + 4]));
    marks.push(t.box([.6, 26, 5], [-R - .1, (y0 + y1) / 2, zc + 6]), t.prismXZ(t.band2(t.curve([[-R * .72, zc - R * .45], [-R * .83, zc - R * .1]], 3), 3.5), y0 - 1.2, y0 - .6));
  }
  return [
    { name: 'Black rubber bodies', solid: t.union(bodies), ...BLACK_RUBBER },
    { name: 'Brushed aluminium covers', solid: t.union(covers), role: 'source', color: '#c8cbce', metalness: .9, roughness: .32 },
    { name: 'Flip levers', solid: t.union(levers), ...STAINLESS },
    { name: 'Steel jaw tabs', solid: t.union(jaws), ...POLISHED },
    { name: 'KEPPI marks', solid: t.union(marks), role: 'source', color: '#6f7377', metalness: .5, roughness: .5 },
  ];
});

/** Rogue USA Aluminum: 1.5″ billet ring with twelve flats, hinge knuckles at the upper left, black nylon lever on top. */
export const ROGUE_USA = { od: 76, width: 1.5 * IN, bore: 26.8, lining: 1.5 };
const buildRogueUsa = attachment(ROGUE_USA_COLLARS, t => {
  const { od, width, bore, lining } = ROGUE_USA, inner = bore - lining, zc = boreZ(inner), R = od / 2, bodies: Manifold[] = [], liners: Manifold[] = [], levers: Manifold[] = [], marks: Manifold[] = [], pins: Manifold[] = [], etched: Manifold[] = [];
  const flats: P2[] = []; for (let i = 0; i < 12; i++) { const a = (i + .5) * Math.PI / 6; flats.push([R / Math.cos(Math.PI / 12) * .985 * Math.cos(a), zc + R / Math.cos(Math.PI / 12) * .985 * Math.sin(a)]); }
  const outline = t.k(t.k(t.poly2(flats).intersect(t.circle2([0, zc], R, 64))).subtract(t.circle2([0, zc], bore, 56)));
  const split = t.rect2(2.2, 16, [-R * .62, zc + R * .74]);
  const leverAt = 68 * Math.PI / 180, lx = (R + 3) * Math.cos(leverAt), lz = zc + (R + 3) * Math.sin(leverAt);
  for (const i of [0, 1]) {
    const [y0, y1] = pairSpan(width, i);
    bodies.push(t.prismXZ(t.k(outline.subtract(split)), y0, y1));
    liners.push(t.prismXZ(t.k(t.circle2([0, zc], bore + .2, 48).subtract(t.circle2([0, zc], inner, 48))), y0 + 1, y1 - 1));
    for (const [dy0, dy1] of [[0, 11], [width - 11, width]]) pins.push(t.cylinder([-R * .72, y0 + dy0, zc + R * .7], [-R * .72, y0 + dy1, zc + R * .7], 13, 24));
    // Lever lies tangent across the top, descending to the right past the body.
    levers.push(t.rotY(t.union([t.box([46, width - 6, 7], [lx - 4, (y0 + y1) / 2, lz - 1]), t.box([10, width - 6, 11], [lx - 24, (y0 + y1) / 2, lz - 3])]), 22, [lx, lz]));
    marks.push(t.rotY(t.box([28, 7, .6], [lx - 4, (y0 + y1) / 2, lz + 2.8]), 22, [lx, lz]));
    etched.push(t.box([.5, width - 16, 7], [R + .15, (y0 + y1) / 2, zc - 4]));
  }
  return [
    { name: 'Clear-anodised billet bodies', solid: t.union(bodies), role: 'source', color: '#cfd2d5', metalness: .88, roughness: .3 },
    { name: 'Hinge knuckles', solid: t.union(pins), role: 'source', color: '#bfc3c6', metalness: .9, roughness: .26 },
    { name: 'Rubber linings', solid: t.union(liners), ...BLACK_RUBBER },
    { name: 'Black nylon levers', solid: t.union(levers), ...BLACK_PLASTIC },
    { name: 'White lever logos', solid: t.union(marks), ...WHITE },
    { name: 'Laser-etched Rogue logos', solid: t.union(etched), role: 'source', color: '#8b8f93', metalness: .7, roughness: .5 },
  ];
});

/** Titan TwistLock Pro: 3.675″ × 1.5″ black ring, knurled rim, polished face, black twist-lock insert, TITAN wordmark + helmet. */
export const TITAN = { od: 3.675 * IN, width: 1.5 * IN, bore: 25.5, insert: 31 };
const buildTitan = attachment(TITAN_TWISTLOCK_PRO, t => {
  const { od, width, bore, insert } = TITAN, zc = boreZ(bore), R = od / 2, faces: Manifold[] = [], rims: Manifold[] = [], inserts: Manifold[] = [], marks: Manifold[] = [];
  const annulus = (r0: number, r1: number) => t.k(t.circle2([0, zc], r1, 72).subtract(t.circle2([0, zc], r0, 64)));
  for (const i of [0, 1]) {
    const [y0, y1] = pairSpan(width, i);
    faces.push(t.prismXZ(annulus(insert, R - 2.5), y0, y1), t.prismXZ(annulus(R - 3, R - .6), y0, y0 + 3.5), t.prismXZ(annulus(R - 3, R - .6), y1 - 3.5, y1));
    rims.push(t.prismXZ(annulus(R - 3, R), y0 + 4, y1 - 4));
    inserts.push(t.prismXZ(annulus(bore, insert + .2), y0 + 1, y1 - 1));
    marks.push(t.box([28, .5, 5], [0, y0 - .2, zc + R * .72]), t.prismXZ(t.hull2([t.circle2([0, zc - R * .74], 3.4, 16), t.rect2(5, 2, [0, zc - R * .74 - 3.5])]), y0 - .45, y0));
  }
  return [
    { name: 'Black anodised faces', solid: t.union(faces), ...BLACK_ANODISED },
    { name: 'Volcano-knurled rims', solid: t.union(rims), ...BLACK_KNURL },
    { name: 'Twist-lock inserts', solid: t.union(inserts), ...BLACK_RUBBER, color: '#101112' },
    { name: 'TITAN wordmark and helmet', solid: t.union(marks), ...WHITE },
  ];
});

/** Rogue HG 2.0: chamfered-square black nylon body 1.875″ wide, hinge at the lower left, red spring tab on top, ribbed pads. */
export const HG = { across: 86, width: 1.875 * IN, bore: 27.5, pad: 2.5 };
const buildHg = attachment(ROGUE_HG_COLLARS, t => {
  const { across, width, bore, pad } = HG, inner = bore - pad, zc = boreZ(inner), h = across / 2, ch = 17, bodies: Manifold[] = [], pads: Manifold[] = [], tabs: Manifold[] = [], bolts: Manifold[] = [], badges: Manifold[] = [], words: Manifold[] = [];
  const oct = t.poly2([[-h + ch, zc - h], [h - ch, zc - h], [h, zc - h + ch], [h, zc + h - ch], [h - ch, zc + h], [-h + ch, zc + h], [-h, zc + h - ch], [-h, zc - h + ch]]);
  const outline = t.k(t.k(oct.subtract(t.circle2([0, zc], bore, 56))).subtract(t.rect2(2.4, h - bore + 2, [h * .12, zc + (h + bore) / 2])));
  const ribs = t.union2(Array.from({ length: 9 }, (_, j) => { const a = (200 + j * 17.5) * Math.PI / 180; return t.circle2([(inner + .9) * Math.cos(a), zc + (inner + .9) * Math.sin(a)], 1.3, 10); }));
  const padSection = t.k(t.union2([t.k(t.circle2([0, zc], bore + .2, 56).subtract(t.circle2([0, zc], inner, 56))), ribs]).intersect(t.rect2(2 * bore + 6, bore + 4, [0, zc - bore / 2 + 2])));
  for (const i of [0, 1]) {
    const y0 = 74.6 - (2 - i) * width, y1 = y0 + width, ym = (y0 + y1) / 2;
    bodies.push(t.prismXZ(outline, y0, y1));
    pads.push(t.prismXZ(padSection, y0 + 3, y1 - 3), t.prismXZ(t.k(t.circle2([0, zc], bore + .2, 56).subtract(t.circle2([0, zc], inner, 56))), y0 + 3, y1 - 3));
    tabs.push(t.prismXZ(t.union2([t.rrect2(30, 8, 2.5, [h * .38, zc + h + 3]), t.rrect2(10, 12, 3, [h * .38 + 12, zc + h + 7])]), ym - 8, ym + 8));
    for (const [x, z] of [[-h + 8, zc - h + 8], [h - 8, zc - h + 8], [-h + 8, zc + h - 8], [h - 8, zc + h - 8]] as P2[]) bolts.push(t.cylinder([x, y0 - .8, z], [x, y0 + .2, z], 6, 16));
    badges.push(t.box([.6, 26, 24], [h + .3, ym, zc]), t.box([30, .6, 4], [-h * .2, y0 - .3, zc + h - 6]));
    words.push(t.box([.5, 17, 8], [h + .8, ym, zc - 2]));
  }
  return [
    { name: 'Black nylon-resin bodies', solid: t.union(bodies), ...BLACK_PLASTIC, roughness: .6 },
    { name: 'Ribbed rubber pads', solid: t.union(pads), ...BLACK_RUBBER, color: '#232427' },
    { name: 'Red spring tabs', solid: t.union(tabs), role: 'source', color: '#d42a2f', metalness: .05, roughness: .5 },
    { name: 'Stainless hardware', solid: t.union(bolts), ...STAINLESS },
    { name: 'ROGUE HG badges', solid: t.union(badges), ...WHITE },
    { name: 'HG lettering', solid: t.union(words), ...print('#141414') },
  ];
});

/** Bells of Steel magnetic clamp: slim 1″ × 3″ octagon, lever folded along the right flat, four face magnets, lattice lining. */
export const BOS = { od: 3 * IN, width: 1 * IN, bore: 27, lining: 2 };
const buildBos = attachment(BOS_MAGNETIC_COLLARS, t => {
  const { od, width, bore, lining } = BOS, inner = bore - lining, zc = boreZ(inner), R = od / 2 / Math.cos(Math.PI / 8), bodies: Manifold[] = [], linings: Manifold[] = [], levers: Manifold[] = [], magnets: Manifold[] = [], prints: Manifold[] = [];
  const oct: P2[] = []; for (let i = 0; i < 8; i++) { const a = (i + .5) * Math.PI / 4; oct.push([R * Math.cos(a), zc + R * Math.sin(a)]); }
  const outline = t.k(t.k(t.k(t.poly2(oct).offset(-2, 'Round', 2, 8)).offset(2, 'Round', 2, 8)).subtract(t.circle2([0, zc], bore, 56)));
  const flat = od / 2;
  for (const i of [0, 1]) {
    const [y0, y1] = pairSpan(width, i, 1), ym = (y0 + y1) / 2;
    bodies.push(t.prismXZ(outline, y0, y1));
    linings.push(t.prismXZ(t.k(t.circle2([0, zc], bore + .2, 48).subtract(t.circle2([0, zc], inner, 48))), y0 + 1, y1 - 1));
    levers.push(t.box([6, width - 3, 46], [flat + 3, ym, zc - 4]), t.box([8, width - 3, 10], [flat + 1, ym, zc + 22]));
    for (const a of [45, 135, 225, 315]) { const r = (bore + R) / 2 + 1, ang = a * Math.PI / 180; magnets.push(t.cylinder([r * Math.cos(ang), y0 - .5, zc + r * Math.sin(ang)], [r * Math.cos(ang), y0 + .2, zc + r * Math.sin(ang)], 7, 20)); }
    prints.push(t.box([.5, width - 10, 32], [flat + 6.2, ym, zc - 4]));
  }
  return [
    { name: 'Black clamp bodies', solid: t.union(bodies), ...BLACK_PLASTIC, color: '#1a1b1d', roughness: .5 },
    { name: 'Lattice rubber linings', solid: t.union(linings), ...BLACK_RUBBER, color: '#2b2c2f' },
    { name: 'Folded levers', solid: t.union(levers), ...BLACK_PLASTIC, color: '#202124' },
    { name: 'Face magnets', solid: t.union(magnets), role: 'source', color: '#8e9296', metalness: .9, roughness: .3 },
    { name: 'BELLS OF STEEL print', solid: t.union(prints), ...WHITE },
  ];
});

// ————— Loading pins —————
/** Fringe Magpin 1″: the lynch pin through the nose hole makes a D whose arc hangs on the rod; pin and cap hang straight down. */
export const MAGPIN = { pin: 24.5, pinLen: 5.5 * IN, cap: 2 * IN, capThick: .75 * IN, ring: 17, wire: 2.6 };
const buildFringeMagpin = attachment(FRINGE_MAGPIN, t => {
  const { pin, pinLen, cap, capThick, ring, wire } = MAGPIN, zp = ROD - (ring - wire / 2), noseTop = zp + 9.3, capTop = noseTop - pinLen;
  const arc: Vec3[] = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; arc.push([ring * Math.cos(a), 0, zp + ring * Math.sin(a)]); }
  const lynch = t.union([t.tube(arc, wire, 10), t.cylinder([-ring - 2.5, 0, zp], [ring + 1, 0, zp], 4.8, 14), t.cylinder([-ring - 4.5, 0, zp], [-ring - 1.5, 0, zp], 9, 18)]);
  const shaft = t.k(t.union([t.cylinder([0, 0, capTop], [0, 0, noseTop - pin / 2], pin, 36), t.k(t.sphere([0, 0, noseTop - pin / 2], pin, 36).intersect(t.box([pin + 2, pin + 2, pin / 2 + 1], [0, 0, noseTop - pin / 4 + .5])))]).subtract(t.cylinder([-pin, 0, zp], [pin, 0, zp], 5.4, 16)));
  const capBody = t.cylinder([0, 0, capTop - capThick + 1.2], [0, 0, capTop], cap, 48);
  const chamfer = t.cylinder([0, 0, capTop - capThick], [0, 0, capTop - capThick + 1.2], cap - 2.4, 48, cap);
  const printed = t.union([t.box([30, 9, .5], [0, -5, capTop - capThick - .2]), t.box([22, 5, .5], [0, 5, capTop - capThick - .2])]);
  return [
    { name: 'Stainless 1″ pin', solid: shaft, ...STAINLESS },
    { name: 'Knurled black magnetic cap', solid: t.union([capBody, chamfer]), ...BLACK_KNURL },
    { name: 'Lynch pin', solid: lynch, role: 'source', color: '#b9a36a', metalness: .9, roughness: .3 },
    { name: 'Fringe Sport print', solid: printed, ...WHITE },
  ];
});
/** Oak Club MagPin 3 pair: each magnet face clings to a side of the rod just above its shaft, shafts running under the rod. */
export const MAGPIN3 = { head: 1.75 * IN, headThick: 19, collar: 3.5, shaft: IN, shaftLen: 4.5 * IN, offset: 18, y: [-2, 34] };
const buildOakMagpin = attachment(OAK_CLUB_MAGPIN_3, t => {
  const { head, headThick, collar, shaft, shaftLen, offset, y } = MAGPIN3, z = -offset, heads: Manifold[] = [], collars: Manifold[] = [], shafts: Manifold[] = [], marks: Manifold[] = [];
  y.forEach((yc, i) => {
    const s = i ? -1 : 1, face = s * ROD, x = (d: number) => face + s * d;
    collars.push(t.cylinder([x(0), yc, z], [x(collar), yc, z], head - 2, 48));
    heads.push(t.cylinder([x(collar), yc, z], [x(headThick - 1), yc, z], head, 48), t.cylinder([x(headThick - 1), yc, z], [x(headThick), yc, z], head, 48, head - 2));
    const tip = x(-shaftLen);
    shafts.push(t.cylinder([x(0), yc, z], [tip, yc, z], shaft, 36), t.k(t.sphere([tip, yc, z], shaft, 36).intersect(t.box([shaft, shaft + 2, shaft + 2], [tip - s * shaft / 2, yc, z]))));
    marks.push(t.union([t.cylinder([x(headThick), yc, z + 3], [x(headThick + .5), yc, z + 3], 7, 16), t.cylinder([x(headThick), yc - 3.4, z - 2], [x(headThick + .5), yc - 3.4, z - 2], 7, 16), t.cylinder([x(headThick), yc + 3.4, z - 2], [x(headThick + .5), yc + 3.4, z - 2], 7, 16), t.box([.5, 2.5, 7], [x(headThick + .25), yc, z - 7])]));
  });
  return [
    { name: 'Knurled black aluminium heads', solid: t.union(heads), ...BLACK_KNURL },
    { name: 'Two-tone collars', solid: t.union(collars), role: 'source', color: '#6d7c86', metalness: .75, roughness: .35 },
    { name: 'Stainless shafts', solid: t.union(shafts), ...STAINLESS },
    { name: 'Club marks', solid: t.union(marks), role: 'source', color: '#3a3c40', metalness: .5, roughness: .5 },
  ];
});

// ————— TRX HOME2 —————
/** Black carabiner on the rod, a black stem splitting into two straps with cam buckles, yellow lower straps into foam handles,
 * foot cradles below. Webbing flat-laid facing out. */
export const TRX = { web: 1.5 * IN, handle: 5 * IN, handleD: 32, spread: 72 };
const buildTrx = attachment(TRX_HOME2, t => {
  const { web, handle, handleD, spread } = TRX, th = 2.6;
  // Carabiner: oval of Ø9 stock, inner width 30, inner length 70, with a straight gate on the left.
  const r = 19.5, zTop = ROD - (r - 4.5), zBot = zTop - 44, oval: Vec3[] = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; oval.push([r * Math.cos(a), 0, zTop + r * Math.sin(a)]); }
  for (let i = 0; i <= 16; i++) { const a = Math.PI + Math.PI * i / 16; oval.push([r * Math.cos(a), 0, zBot + r * Math.sin(a)]); }
  const biner = t.tube([...oval, oval[0]], 9, 12);
  const gate = t.union([t.cylinder([-r, 0, zBot], [-r, 0, zTop - 4], 7, 14), t.cylinder([-r, 0, zTop - 14], [-r, 0, zTop - 2], 11, 16)]);
  const loopTop = zBot - r + 3, stemBot = loopTop - 160, lower = (s: number): P2[] => [[s * 8, stemBot + 10], [s * spread * .6, stemBot - 150], [s * spread, stemBot - 330]];
  const face = (pts: P2[], w: number, y = 0, depth = th) => t.prismXZ(t.band2(pts, w), y - depth / 2, y + depth / 2);
  const stem = face([[0, loopTop + 10], [0, stemBot]], web);
  const eyelet = t.prismXZ(t.k(t.rrect2(web + 6, 46, 8, [0, loopTop - 12]).subtract(t.rrect2(web - 8, 24, 6, [0, loopTop - 10]))), -th, th);
  const straps = [-1, 1].map(s => face(t.curve(lower(s), 8), web));
  const yellowTop = stemBot - 330, apex = yellowTop - 150, handleZ = apex - 125, hx = (s: number) => s * (spread + 6);
  const yellow = [-1, 1].flatMap(s => [face([[s * spread, yellowTop + 4], [s * spread, apex + 6]], web),
    face([[hx(s), apex], [hx(s) - handle / 2 - 4, handleZ]], web * .78), face([[hx(s), apex], [hx(s) + handle / 2 + 4, handleZ]], web * .78)]);
  const buckles = [-1, 1].map(s => { const [x, z] = t.curve(lower(s), 8).at(-1)!; return t.union([t.box([web + 10, 12, 44], [x, 0, z + 18]), t.box([web + 4, 16, 12], [x, 0, z + 30])]); });
  const handles = [-1, 1].map(s => t.cylinder([hx(s) - handle / 2, 0, handleZ], [hx(s) + handle / 2, 0, handleZ], handleD, 32));
  const cradles = [-1, 1].map(s => t.prismXZ(t.k(t.rrect2(handle + 8, 78, 26, [hx(s), handleZ - 42]).subtract(t.rrect2(handle - 22, 52, 16, [hx(s), handleZ - 44]))), -9, 9));
  const stripes = [face([[0, loopTop - 32], [0, stemBot + 6]], 7, -th / 2 - .3, .6), ...[-1, 1].map(s => face(t.curve(lower(s), 8).slice(2, -6), 7, -th / 2 - .3, .6))];
  const tabs = [face([[0, stemBot + 70], [0, stemBot + 40]], web - 6, -th / 2 - .5, 1), ...[-1, 1].map(s => face([[s * spread, yellowTop - 20], [s * spread, yellowTop - 50]], web - 8, -th / 2 - .5, 1))];
  const tabMarks = [face([[0, stemBot + 62], [0, stemBot + 48]], web - 16, -th / 2 - 1.2, .5), ...[-1, 1].map(s => face([[s * spread, yellowTop - 28], [s * spread, yellowTop - 42]], web - 18, -th / 2 - 1.2, .5))];
  return [
    { name: 'Black locking carabiner', solid: t.union([biner, gate]), ...BLACK_STEEL },
    { name: 'Black premium webbing', solid: t.union([stem, eyelet, ...straps]), ...WEBBING },
    { name: 'Grey centre stripes', solid: t.union(stripes), ...fabric('#5d6064', .8) },
    { name: 'Yellow lower straps', solid: t.union(yellow), ...fabric('#f0cf12', .8) },
    { name: 'Cam buckles', solid: t.union(buckles), ...BLACK_PLASTIC },
    { name: 'Foam handles', solid: t.union(handles), ...BLACK_RUBBER, color: '#1d1e20' },
    { name: 'Foot cradles', solid: t.union(cradles), ...fabric('#18191b', .85) },
    { name: 'TRX tabs', solid: t.union([...tabs.slice(0, 1)]), ...fabric('#f0cf12', .7) },
    { name: 'TRX tab marks', solid: t.union([tabMarks[0], ...tabs.slice(1), ...tabMarks.slice(1)]), ...print('#111111') },
  ];
});

// ————— REP wood rings —————
/** Both 1.25″ rings on the rod; each strap cinches round its ring bottom and hangs as a folded hank with the carabiner at the fold. */
export const RINGS = { id: 180, grip: 1.25 * IN, web: 38, hank: 330 };
const buildRings = attachment(REP_WOOD_RINGS, t => {
  const { id, grip, web, hank } = RINGS, R = (id + grip) / 2, zc = ROD - id / 2, woods: Manifold[] = [], straps: Manifold[] = [], numbers: Manifold[] = [], biners: Manifold[] = [], marks: Manifold[] = [];
  [-2.5, 32].forEach((yc, i) => {
    const s = i ? 1 : -1, xs = s * 26, zb = zc - R, top = zb - grip / 2 - 2, bottom = top - hank;
    woods.push(t.ring([0, yc, zc], R, grip, 72, 20));
    marks.push(t.k(t.ring([0, yc, zc], R, grip + .8, 72, 20).intersect(t.box([22, grip, 30], [0, yc - grip / 2, zc - R]))));
    // Cinch loop round the ring bottom, then a four-layer hank (two folds) hanging below it.
    straps.push(t.prismYZ(t.k(t.circle2([yc, zb], grip / 2 + 3, 32).subtract(t.circle2([yc, zb], grip / 2 + .2, 32))), xs - web / 2, xs + web / 2));
    const layers = [-4.5, -1.5, 1.5, 4.5];
    straps.push(t.prismYZ(t.union2([...layers.map(dy => t.rect2(2.6, hank, [yc + dy, top - hank / 2])), t.k(t.circle2([yc, bottom], 6, 24).subtract(t.circle2([yc, bottom], 3, 24))), t.rect2(12, 4, [yc, top])]), xs - web / 2, xs + web / 2));
    for (let j = 0; j < 5; j++) numbers.push(t.box([web * .45, .5, 9], [xs, yc - 5.9, top - 30 - j * 63.5]));
    const bz = bottom - 6 - 28;
    biners.push(t.union([t.ring([xs, yc, bz], 22, 7, 32, 10), t.box([10, 10, 14], [xs, yc, bz - 24])]));
  });
  return [
    { name: 'Birch plywood rings', solid: t.union(woods), role: 'source', color: '#e2cea6', metalness: 0, roughness: .6 },
    { name: 'REP engraving', solid: t.union(marks), role: 'source', color: '#c8ab7c', metalness: 0, roughness: .7 },
    { name: 'Black double-layer straps', solid: t.union(straps), ...WEBBING },
    { name: 'White strap numbers', solid: t.union(numbers), ...WHITE },
    { name: 'Screw-lock carabiners', solid: t.union(biners), ...BLACK_STEEL },
  ];
});

// ————— Spud Inc. Pillow Belt —————
/** Pillow belt (L) hung by both loop straps: the 36″ pad folds in half (fold at the bottom), face out. */
export const PILLOW = { pad: 36 * IN, width: 6.5 * IN, thick: 1.5 * IN, strap: 250 };
const buildPillowBelt = attachment(SPUD_PILLOW_BELT, t => {
  const { pad, width, thick, strap } = PILLOW, gap = 3, yf = -thick - gap / 2, yb = gap / 2, padTop = -strap, bend = thick + gap / 2;
  const straight = pad / 2 - Math.PI * (bend - thick / 2) / 2, fold = padTop - straight, hw = width / 2;
  const profile = t.union2([t.rect2(thick, straight, [yf + thick / 2, padTop - straight / 2]), t.rect2(thick, straight, [yb + thick / 2, padTop - straight / 2]),
    t.k(t.k(t.circle2([0, fold], bend, 40).subtract(t.circle2([0, fold], gap / 2, 24))).subtract(t.rect2(2 * bend + 2, bend + 1, [0, fold + bend / 2])))]);
  const body = t.prismYZ(t.k(t.k(profile.offset(-2, 'Round', 2, 8)).offset(2, 'Round', 2, 8)), -hw, hw);
  const stripe = t.prismYZ(t.rect2(1.4, straight - 6, [yf - .6, padTop - straight / 2]), -26, 26);
  const label = t.box([72, 1.4, 34], [0, yf - .8, fold + 44]), text = t.box([54, .6, 16], [0, yf - 1.7, fold + 44]);
  // Loop straps: each strap's top loop over the rod, the strap running down to its pad end with the sewn adjustment loops.
  const loops: Manifold[] = [], straps: Manifold[] = [];
  for (const [y0, y1, yPad] of [[-26, -1, yf + thick / 2], [1, 26, yb + thick / 2]] as [number, number, number][]) {
    const d = { ...drape(ROD + 1.5, 4, 150), top: 0 };
    loops.push(loopSolid(t, d, 3, y0, y1));
    const ym = (y0 + y1) / 2, zTop = -d.D - 6, path = t.curve([[ym, zTop], [(ym + yPad) / 2, (zTop + padTop) / 2], [yPad, padTop + 4]], 8);
    straps.push(t.prismYZ(t.band2(path, 3), -12.7, 12.7));
    for (let j = 0; j < 4; j++) { const [py, pz] = path[Math.min(path.length - 1, 3 + j * Math.floor(path.length / 5))], sgn = Math.sign(ym); straps.push(t.prismYZ(t.k(t.circle2([py + sgn * 4, pz], 6, 16).subtract(t.circle2([py + sgn * 4, pz], 3, 12))), -12.7, 12.7)); }
  }
  return [
    { name: 'Black Kaiju pad', solid: body, ...fabric('#17181a') },
    { name: 'Charcoal webbing stripe', solid: stripe, ...fabric('#3b3d41', .85) },
    { name: 'Loop straps', solid: t.union([...loops, ...straps]), ...WEBBING },
    { name: 'Spud Inc label', solid: label, ...print('#0e0e0e') },
    { name: 'Label lettering', solid: text, ...print('#e3cf1d') },
  ];
});

// ————— Inzer Forever Lever Belt 10 mm —————
/** Buckled L belt hung over the rod as a stiff ring; lever buckle on the right side of the ring. */
export const INZER = { width: 4 * IN, thick: 10, circumference: 35 * IN, buckleAt: -8 };
const buildInzer = attachment(INZER_LEVER_BELT, t => {
  const { width, thick, circumference, buckleAt } = INZER, Rm = circumference / 2 / Math.PI, Ri = Rm - thick / 2, Ro = Rm + thick / 2, zc = ROD - Ri, [y0, y1] = pegSpan(width), ym = (y0 + y1) / 2;
  const annulus = (r0: number, r1: number, n = 96) => t.k(t.circle2([0, zc], r1, n).subtract(t.circle2([0, zc], r0, n)));
  const sector = (r0: number, r1: number, a0: number, a1: number) => {
    const pts: P2[] = [], n = 20; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([r1 * Math.cos(a), zc + r1 * Math.sin(a)]); }
    for (let i = n; i >= 0; i--) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([r0 * Math.cos(a), zc + r0 * Math.sin(a)]); }
    return t.poly2(pts);
  };
  const belt = clipFront(t, t.prismXZ(annulus(Ri, Ro), y0, y1), y0, ROD - 4, ROD - 60);
  const flap = t.prismXZ(sector(Ro - .2, Ro + thick, buckleAt - 16, buckleAt + 42), y0 + .5, y1 - .5);
  const stitchRows = [8, 14, width - 14, width - 8].flatMap(dy => [t.prismXZ(annulus(Ro - .2, Ro + .5), y0 + dy - .6, y0 + dy + .6)]);
  const flapStitch = [8, 14, width - 14, width - 8].map(dy => t.prismXZ(sector(Ro + thick - .2, Ro + thick + .5, buckleAt - 15, buckleAt + 41), y0 + dy - .6, y0 + dy + .6));
  const stitch = t.union([...stitchRows, ...flapStitch]);
  const holes = [-24, -30, -36].map(a => { const ang = (buckleAt + a) * Math.PI / 180; return t.cylinder([(Ro - 2) * Math.cos(ang), ym, zc + (Ro - 2) * Math.sin(ang)], [(Ro + .6) * Math.cos(ang), ym, zc + (Ro + .6) * Math.sin(ang)], 9, 16); });
  // Lever buckle: base plate and the raised lever on the flap, tangent to the ring.
  const ang = buckleAt * Math.PI / 180, bx = (Ro + thick + 3) * Math.cos(ang), bz = zc + (Ro + thick + 3) * Math.sin(ang);
  const plate = t.rotY(t.box([6, width * .72, 92], [bx, ym, bz]), -buckleAt, [bx, bz]);
  const lever = t.rotY(t.union([t.box([9, width * .58, 70], [bx + 5, ym, bz - 6]), t.box([12, width * .36, 16], [bx + 7, ym, bz + 26])]), -buckleAt, [bx, bz]);
  return [
    { name: 'Black suede leather belt', solid: t.union([belt, flap]), ...fabric('#1a1a1b', .95) },
    { name: 'White lock-stitching', solid: stitch, ...fabric('#e8e6df', .8) },
    { name: 'Prong holes', solid: t.union(holes), ...print('#050505') },
    { name: 'Polished lever buckle', solid: t.union([plate, lever]), ...POLISHED },
  ];
});

// ————— Rogue lifting gear —————
/** A strap loop over the rod (edge-on, width along the peg) with a flat tail hanging below it, fanned by `fan` degrees. */
function loopAndTail(t: Kit, loopPerimeter: number, loopWidth: number, y: number, tailW: number, tailT: number, tailLen: number, fan: number) {
  const d = { ...drape(ROD + tailT / 2, 3, loopPerimeter), top: 0 }, loop = loopSolid(t, d, tailT, y - loopWidth / 2, y + loopWidth / 2);
  const pivot: P2 = [0, -d.D - 3], tailTop = pivot[1] + 2;
  const tail = (m: Manifold) => t.rotY(m, fan, pivot);
  return { loop, tail, tailTop, tailBottom: tailTop - tailLen, body: tail(t.box([tailW, tailT, tailLen], [0, y, tailTop - tailLen / 2])) };
}
/** Rogue Wrist Wraps 2.0 (24″): ⅝″ elastic thumb loops on the rod, 3″ × 24″ wraps hanging flat, Rogue logo, hook-and-loop, tab. */
export const WRAPS = { width: 3 * IN, length: 24 * IN, thick: 3, loop: 2 * 2.5 * IN, loopW: .625 * IN };
const buildWraps = attachment(ROGUE_WRIST_WRAPS, t => {
  const { width, length, thick, loop, loopW } = WRAPS, bodies: Manifold[] = [], loops: Manifold[] = [], logos: Manifold[] = [], velcro: Manifold[] = [], tabs: Manifold[] = [];
  [[-9, 2.2], [12, -2.2]].forEach(([y, fan]) => {
    const w = loopAndTail(t, loop, loopW, y, width, thick, length - 30, fan), fy = y - thick / 2;
    loops.push(w.loop); bodies.push(w.body);
    logos.push(w.tail(t.box([18, .6, 64], [0, fy - .3, w.tailTop - 70])));
    velcro.push(w.tail(t.box([width - 14, 1, 120], [0, fy - .5, w.tailBottom + 150])));
    tabs.push(w.tail(t.prismXZ(t.poly2([[-width / 2, w.tailBottom + 1], [width / 2, w.tailBottom + 1], [width / 2 - 8, w.tailBottom - 30], [-width / 2 + 8, w.tailBottom - 30]]), y - thick / 2 - .4, y + thick / 2 + .4)));
  });
  return [
    { name: 'Black elastic wraps', solid: t.union(bodies), ...fabric('#18191b') },
    { name: 'Elastic thumb loops', solid: t.union(loops), ...fabric('#111214', .8) },
    { name: 'Reflective Rogue logo', solid: t.union(logos), role: 'source', color: '#8d9095', metalness: .3, roughness: .45 },
    { name: 'Hook-and-loop field', solid: t.union(velcro), ...fabric('#26272a', .98) },
    { name: 'Reinforced closure tabs', solid: t.union(tabs), ...fabric('#0f1011', .85) },
  ];
});
/** Rogue Ohio nylon straps: closed 1.5″ loops over the rod, 22.5″ overall, tails hanging flat with the red Rogue label. */
export const OHIO = { width: 1.5 * IN, length: 22.5 * IN, thick: 2.6, loop: 9 * IN };
const buildOhio = attachment(ROGUE_OHIO_STRAPS, t => {
  const { width, length, thick, loop } = OHIO, straps: Manifold[] = [], labels: Manifold[] = [], words: Manifold[] = [], stitches: Manifold[] = [];
  [[TIP_BACK + width / 2 + .5, 3.5], [TIP_BACK + 1.5 * width + 2.5, -3.5]].forEach(([y, fan]) => {
    const s = loopAndTail(t, loop, width, y, width, thick, length - loop / 2 + 4, fan), fy = y - thick / 2;
    straps.push(s.loop, s.body);
    labels.push(s.tail(t.box([width - 4, 1, 62], [0, fy - .5, s.tailTop - 60])));
    words.push(s.tail(t.box([.6 * width, .5, 34], [0, fy - 1.2, s.tailTop - 60])));
    stitches.push(s.tail(t.box([width - 6, .6, 3], [0, fy - .3, s.tailTop - 12])), s.tail(t.box([width - 6, .6, 3], [0, fy - .3, s.tailTop - 24])));
  });
  return [
    { name: 'Black nylon webbing', solid: t.union(straps), ...WEBBING },
    { name: 'Red Rogue labels', solid: t.union(labels), ...print('#d0212b') },
    { name: 'Label lettering', solid: t.union(words), ...WHITE },
    { name: 'Box stitching', solid: t.union(stitches), ...fabric('#3a3c40', .9) },
  ];
});
/** Rogue SR-1: 10′ grey cable in three coils over the rod, both 6.75″ red handles hanging side by side below the coil. */
export const SR1 = { cable: 3 / 32 * IN, length: 120 * IN, coil: 108, handleLen: 6.75 * IN, taper: [.5 * IN, .875 * IN] };
const buildSr1 = attachment(ROGUE_SR1, t => {
  const { cable, coil, handleLen, taper } = SR1, zc = ROD - (coil - cable / 2), ys = [-17, -14.4, -11.8, -9.2], cables: Manifold[] = [], handles: Manifold[] = [], caps: Manifold[] = [], swivels: Manifold[] = [];
  for (const y of ys.slice(0, 3)) cables.push(t.ring([0, y, zc], coil, cable, 96, 8));
  const coilBottom = zc - coil, handleTop = coilBottom - 60;
  for (const [s, y] of [[-1, ys[0]], [1, ys[3]]] as [number, number][]) {
    const x = s * 13;
    cables.push(t.tube([[s * 6, ys[1], coilBottom + 4], [x * .8, y, coilBottom - 20], [x, y, handleTop + 20]], cable, 8));
    swivels.push(t.cylinder([x, y, handleTop + 21], [x, y, handleTop + 14], 5, 12), t.sphere([x, y, handleTop + 21], 4, 10));
    caps.push(t.cylinder([x, y, handleTop + 14], [x, y, handleTop - 6], 15, 24, 14));
    const g0 = handleTop - 6, gEnd = g0 - handleLen + 20;
    handles.push(t.union([t.cylinder([x, y, g0], [x, y, g0 - handleLen * .5], taper[0] + 2, 28, taper[0] + 5), t.cylinder([x, y, g0 - handleLen * .5], [x, y, g0 - handleLen * .66], taper[0] + 5, 28, taper[1]),
      t.cylinder([x, y, g0 - handleLen * .66], [x, y, gEnd], taper[1], 28), t.cylinder([x, y, gEnd], [x, y, gEnd - 3], taper[1], 28, taper[1] - 4)]));
  }
  return [
    { name: 'Grey coated speed cable', solid: t.union(cables), role: 'source', color: '#c9cbcd', metalness: .1, roughness: .45 },
    { name: 'Red glass-filled nylon handles', solid: t.union(handles), role: 'source', color: '#d63a4f', metalness: 0, roughness: .5 },
    { name: 'Bearing caps', solid: t.union(caps), ...BLACK_PLASTIC },
    { name: 'Swivel eyes', solid: t.union(swivels), ...STAINLESS },
  ];
});

export const definitions: PartDefinition[] = [
  hangDefinition(FAT_GRIPZ, fatGripz(FAT_GRIPZ, 2.25 * IN, '#1b8fd8', '#101316')),
  ...[MONSTER_BAND_0, MONSTER_BAND_1, MONSTER_BAND_2, MONSTER_BAND_3, MONSTER_BAND_4, MONSTER_BAND_5, MONSTER_BAND_6, MONSTER_BAND_7].map((part, n) => hangDefinition(part, attachment(part, monsterBand(n)))),
  hangDefinition(FRINGE_MAGPIN, buildFringeMagpin), hangDefinition(CAPTAINS_OF_CRUSH, buildCoC), hangDefinition(KEPPI_OPENCOLLAR, buildKeppi),
  hangDefinition(ROGUE_USA_COLLARS, buildRogueUsa), hangDefinition(TRX_HOME2, buildTrx), hangDefinition(TITAN_TWISTLOCK_PRO, buildTitan),
  hangDefinition(ROGUE_HG_COLLARS, buildHg), hangDefinition(ELITEFTS_BAND_PACK, buildElitePack), hangDefinition(BOS_MAGNETIC_COLLARS, buildBos),
  hangDefinition(SLING_SHOT, buildSlingShot), hangDefinition(SPUD_PILLOW_BELT, buildPillowBelt), hangDefinition(REP_WOOD_RINGS, buildRings),
  hangDefinition(OAK_CLUB_MAGPIN_3, buildOakMagpin), hangDefinition(FAT_GRIPZ_EXTREME, fatGripz(FAT_GRIPZ_EXTREME, 2.75 * IN, '#f26a1b', '#4a5a6b')),
  hangDefinition(HIP_CIRCLE, buildHipCircle), hangDefinition(INZER_LEVER_BELT, buildInzer), hangDefinition(ROGUE_WRIST_WRAPS, buildWraps),
  hangDefinition(ROGUE_OHIO_STRAPS, buildOhio), hangDefinition(ROGUE_SR1, buildSr1),
];
