/** Specialty cable grips (MAG, Eclipse, Angles 90, Darko and friends): Manifold builders for the entries in ../hang-parts/specialty-grips.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `hangDefinition(PART, build)` per entry.
 *
 * Same contract as the REP set (parts/cable-attachments.ts): source axes X along the wall, -Y out of it, Z up; the origin is the
 * carabiner anchor (the hook rod axis through the top of the eye/ring/hook seat), and `hook: 1` adds the same J-peg. Deep attachments
 * (the Kleva Atlas pieces) slide back along the peg so they clear the panel face; pairs hang together on one hook where they fit.
 * Sources, published dimensions and every estimate: rack-generator/research/specialty-grips.md. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { HOOK_REACH, HOOK_ROD, hangDefinition, type HangPart } from '../hang-part.ts';
import { smooth } from './cable-attachments.ts';
import {
  PORTER_ECLIPSE, ANGLES90_GRIPS, TRAKHANDLE_SPORT, DARKO_SHORTY, MUTANT_ARC, MAG_MS, DARKO_DANGLERS, KORIKAHM_PADDLE, PRIME_KAZ, BELT_FED_BFAS,
  PRIME_ROT8, KLEVA_ATLAS_MULTI, MAG_CS, MAG_MP, SPIRAL_DUALLY, MAG_MN, KENSUI_SWISSIES, MAG_WG, DARKO_LONGY, KENSUI_SWISSIES_MAX, MAG_CN,
  KLEVA_ANGLED_CLOSE, CARBONFLEX_48, CARBONFLEX_24,
} from '../hang-parts/specialty-grips.ts';

type Material = Pick<SolidPart, 'role' | 'color' | 'metalness' | 'roughness'>;
const mat = (role: SolidPart['role'], color: string, metalness: number, roughness: number): Material => ({ role, color, metalness, roughness });
const STAINLESS = mat('source', '#c9cdd0', 1, .24);
const ZINC = mat('source', '#c3c6c8', .9, .3);
const RAW_ALUMINIUM = mat('handle', '#c4c8cc', .9, .4);
const SILVER_HARDWARE = mat('fastener', '#d2d5d8', 1, .22);
const BLACK_POWDER = mat('source', '#1c1d1f', .3, .62);
const BLACK_ANODISED = mat('source', '#17181a', .55, .38);
const BLACK_PLASTIC = mat('liner', '#161718', 0, .55);
const BLACK_RUBBER = mat('liner', '#18191b', 0, .9);
const NYLON = mat('liner', '#161719', 0, .9);
const WHITE_PRINT = mat('source', '#e6e6e1', 0, .6);
const HOOK = mat('source', '#26282a', .4, .5);
/** Anchor z of a ring/eye centre whose hole (radius r) rests on the hook rod. */
const hangZ = (r: number) => -(r - HOOK_ROD / 2);
const IN = 25.4, DEG = Math.PI / 180;
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
  const ellipsoid = (at: Vec3, r: Vec3, n = 20) => k(k(k(M.sphere(1, n)).scale(r)).translate(at));
  /** Rounded tube through `points` (capsule chain). */
  const tube = (points: Vec3[], d: number, n = 20) => k(M.union(points.slice(1).map((p, i) => k(M.hull([sphere(points[i], d, n), sphere(p, d, n)])))));
  const box = (size: Vec3, at: Vec3) => k(k(M.cube(size, true)).translate(at));
  const union = (list: Manifold[]) => list.length === 1 ? list[0] : k(M.union(list));
  const hull = (list: (Manifold | Vec3)[]) => k(M.hull(list));
  const place = (m: Manifold, rot: Vec3, at: Vec3) => k(k(m.rotate(rot)).translate(at));
  /** Box with every edge rounded to r (hull of eight spheres), centred on the origin. */
  const roundBox = ([x, y, z]: Vec3, r: number, n = 16) => hull([-1, 1].flatMap(a => [-1, 1].flatMap(b => [-1, 1].map(c => sphere([a * (x / 2 - r), b * (y / 2 - r), c * (z / 2 - r)], 2 * r, n)))));
  /** Torus in the XZ plane (axis along Y), so a hook rod along Y threads it. */
  const ring = (center: Vec3, radius: number, wire: number, n = 40) => {
    const circle = k(C.circle(wire / 2, 12)), moved = k(circle.translate([radius, 0]));
    return k(k(k(moved.revolve(n)).rotate([90, 0, 0])).translate(center));
  };
  /** Solid of revolution about the Z axis from a (radius, z) outline; centred at `at`. */
  const lathe = (profile: P2[], at: Vec3, n = 40) => k(k(poly2([[0, profile[0][1]], ...profile, [0, profile.at(-1)![1]]]).revolve(n)).translate(at));
  /** Flat 2D outline in the XZ plane (x, z), extruded `t` thick along Y and centred on y. */
  const flat = (section: CrossSection, t: number, y = 0) => k(k(k(section.extrude(t)).rotate([90, 0, 0])).translate([0, y + t / 2, 0]));
  const circle2 = ([x, z]: P2, r: number, n = 28) => k(k(C.circle(r, n)).translate([x, z]));
  const rect2 = ([x, z]: P2, w: number, h: number) => k(k(C.square([w, h], true)).translate([x, z]));
  const hull2 = (list: CrossSection[]) => k(C.hull(list));
  const union2 = (list: CrossSection[]) => list.length === 1 ? list[0] : k(C.union(list));
  const poly2 = (points: P2[]) => { const area = points.reduce((s, p, i) => { const q = points[(i + 1) % points.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0); return k(new C([area < 0 ? [...points].reverse() : points])); };
  /** In-plane band of `width` along a polyline; closed joins the ends. Quads share per-point normals, so no gaps. */
  const band2 = (points: P2[], width: number, closed = false) => {
    const n = points.length, h = width / 2, normals = pathNormals(points, closed);
    const quads: CrossSection[] = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n, p = points[i], q = points[j], a = normals[i], b = normals[j];
      quads.push(poly2([[p[0] + a[0] * h, p[1] + a[1] * h], [q[0] + b[0] * h, q[1] + b[1] * h], [q[0] - b[0] * h, q[1] - b[1] * h], [p[0] - a[0] * h, p[1] - a[1] * h]]));
    }
    return union2(quads);
  };
  /** Smoothed 2D path (Catmull-Rom through control points). */
  const curve = (points: P2[], step = 6): P2[] => smooth(points, step).map(([x, , z]) => [x, z]);
  /** Webbing ribbon following an XZ path, `width` across Y (strap seen edge-on from the front), `thick` in the path plane. */
  const ribbon = (path: P2[], width: number, thick: number, y = 0) => union(path.slice(1).map((q, i) => {
    const p = path[i], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * thick / 2, nz = dx / l * thick / 2;
    return hull([p, q].flatMap(([x, z]) => [-1, 1].flatMap(sy => [-1, 1].map(sn => [x + sn * nx, y + sy * width / 2, z + sn * nz] as Vec3))));
  }));
  /** J-peg into the panel (identical to the REP set): rod from the face out past the anchor, upturned tip, rear tab behind the face. */
  const hook = () => union([cylinder([0, HOOK_REACH + 4.5, 0], [0, -22, 0], HOOK_ROD, 16), sphere([0, -22, 0], HOOK_ROD, 16), cylinder([0, -22, 0], [0, -25, 20], HOOK_ROD, 16), sphere([0, -25, 20], HOOK_ROD, 16), sphere([0, HOOK_REACH + 4.5, 0], HOOK_ROD, 16), cylinder([0, HOOK_REACH + 4.5, 0], [0, HOOK_REACH + 4.5, -12], HOOK_ROD, 16)]);
  return { M, C, owned, k, cylinder, sphere, ellipsoid, tube, box, union, hull, place, roundBox, ring, lathe, flat, circle2, rect2, hull2, union2, poly2, band2, curve, ribbon, hook };
}
function pathNormals(points: P2[], closed = false): P2[] {
  const n = points.length;
  return points.map((_, i) => {
    const a = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [-tz / l, tx / l] as P2;
  });
}
/** Path shifted sideways by d along its normals (stitch lines, linings). */
const offsetPath = (points: P2[], d: number, closed = false): P2[] => pathNormals(points, closed).map(([nx, nz], i) => [points[i][0] + nx * d, points[i][1] + nz * d]);
const mirrorX = (points: P2[]): P2[] => points.map(([x, z]) => [-x, z]);
/** Point on an arc about c at angle a (degrees). */
const polar = (c: P2, r: number, a: number): P2 => [c[0] + r * Math.cos(a * DEG), c[1] + r * Math.sin(a * DEG)];
const arc = (c: P2, r: number, a0: number, a1: number, step = 8): P2[] => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step)); return Array.from({ length: n + 1 }, (_, i) => polar(c, r, a0 + (a1 - a0) * i / n)); };

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
/** Flat eye tab in XZ: round boss around a hole (radius r) resting on the rod, blending down into a base of `width` at z = base. */
function eyeTab(t: Kit, r: number, boss: number, base: number, width: number) {
  const cz = hangZ(r);
  return t.k(t.hull2([t.circle2([0, cz], boss, 32), t.rect2([0, base], width, 2)]).subtract(t.circle2([0, cz], r, 24)));
}

// ————— Porter PhysEd Eclipse —————
/** Eclipse grip: cast M10 swivel eye and hex body, 38 mm × 85 mm knurled billet handle, 3″ domed base. */
export const buildEclipse = attachment(PORTER_ECLIPSE, t => {
  const eye = t.flat(eyeTab(t, 6.5, 15, -24, 22), 11);
  const hex = t.k(t.k(t.M.cylinder(24, 21.5, 21.5, 6)).translate([0, 0, -50]));
  const swivel = t.union([eye, t.cylinder([0, 0, -26], [0, 0, -22], 27, 32), hex, t.cylinder([0, 0, -53], [0, 0, -50], 34, 36)]);
  const grip = t.cylinder([0, 0, -138], [0, 0, -53], 38, 48);
  // Base: collar, conical top face out to the 3″ rim, short rim, shallow convex bottom dome.
  const base = t.lathe([[21, -138], [21, -141.5], [38.1, -147], [38.1, -150.5], [30, -152.2], [15, -153.2]], [0, 0, 0], 64);
  const etch = [t.box([8, .6, 5], [-6, -18.9, -38]), t.box([8, .6, 5], [6, -18.9, -38])];
  return [
    { name: 'Cast swivel eye and hex body', solid: swivel, ...mat('source', '#2b2c2e', .35, .78) },
    { name: 'CE M10 and 0.45T castings', solid: t.union(etch), ...mat('source', '#4a4b4e', .35, .7) },
    { name: 'Knurled black anodised handle', solid: grip, ...mat('handle', '#1d1e21', .55, .5) },
    { name: 'Domed 3″ base plate', solid: base, ...mat('source', '#121314', .55, .25) },
  ];
});

// ————— Angles90 A90 grips —————
/** One A90 grip: curved (arched) TPU prism 165 mm long, strap loop over the rod through the top slits, shortener loop below. */
function a90Grip(t: Kit, y: number, top: number): Manifold[][] {
  const L = 165, sag = 26, sec: Manifold[] = [];
  const zAt = (x: number) => top - 22 - sag * (x / (L / 2)) ** 2;
  const samples = Array.from({ length: 11 }, (_, i) => -L / 2 + 8 + (L - 16) * i / 10);
  for (const x of samples) {
    const f = 1 - .3 * (Math.abs(x) / (L / 2)) ** 2, z = zAt(x), a = Math.atan(-2 * sag * x / (L / 2) ** 2);
    // Rounded prism section (broad top, narrower bottom), leaning with the arch: an upper and a lower ellipsoid.
    sec.push(t.hull([[5, 18, 11], [-9, 13, 10]].map(([dz, ry, rz]) => t.k(t.ellipsoid([0, 0, 0], [9, ry * f, rz * f], 18).rotate([0, a * 180 / Math.PI, 0]).translate([x - Math.sin(a) * dz * f, y, z + Math.cos(a) * dz * f])))));
  }
  const body = t.union(sec.slice(1).map((s, i) => t.hull([sec[i], s])));
  const strapTop = zAt(30) + 10;
  const loop = t.ribbon(t.curve([[-30, strapTop - 6], [-22, -70], [-8, -8], [0, HOOK_ROD / 2 + 1.2], [8, -8], [22, -70], [30, strapTop - 6]], 6), 22, 2.4, y);
  const under = t.ribbon(t.curve([[-19, zAt(19) - 12], [-14, zAt(0) - 34], [0, zAt(0) - 40], [14, zAt(0) - 34], [19, zAt(19) - 12]], 5), 20, 2.4, y);
  const print = t.box([70, .8, 6], [0, y - 18.1, zAt(0) + 4]);
  return [[body], [loop, under], [print]];
}
export const buildAngles90 = attachment(ANGLES90_GRIPS, t => {
  const grips = [-4, 40].map(y => a90Grip(t, y, -170));
  return [
    { name: 'Orange TPU grips', solid: t.union(grips.flatMap(g => g[0])), ...mat('handle', '#f06a1c', 0, .7) },
    { name: 'Black webbing straps', solid: t.union(grips.flatMap(g => g[1])), ...NYLON },
    { name: 'ANGLES90 print', solid: t.union(grips.flatMap(g => g[2])), ...mat('source', '#121212', 0, .6) },
  ];
});

// ————— TrakFitness TrakHandle Sport —————
export const buildTrakHandle = attachment(TRAKHANDLE_SPORT, t => {
  const eye = t.union([t.flat(eyeTab(t, 5, 9.5, -14, 12), 6), t.cylinder([0, 0, -30], [0, 0, -12], 13, 24)]);
  const hub2 = t.k(t.hull2([t.circle2([-45, -52], 12), t.circle2([45, -52], 12), t.circle2([0, -44], 18), t.circle2([-30, -38], 12), t.circle2([30, -38], 12)]).subtract(t.circle2([0, -108], 50, 64)));
  const hub = t.flat(hub2, 22);
  const print = t.union([t.box([46, .6, 5], [4, -11.3, -41]), t.box([22, .6, 6], [10, -11.3, -49])]);
  const gz = -208, half = 60, disc = (s: number) => t.hull([t.cylinder([s * half, 0, gz], [s * (half + 26), 0, gz], 54, 40), t.cylinder([s * (half + 4), 0, gz], [s * (half + 22), 0, gz], 62, 40)]);
  const grip = t.union([t.cylinder([-half - 1, 0, gz], [half + 1, 0, gz], 29, 36), disc(-1), disc(1)]);
  const bosses = t.union([-1, 1].map(s => t.cylinder([s * (half + 26), 0, gz], [s * (half + 32), 0, gz], 16, 20)));
  const cables = t.union([-1, 1].map(s => t.tube([[s * 52, 0, -58], [s * 80, 0, -130], [s * 92, 0, gz]], 3.5, 10)));
  return [
    { name: 'Swivel eye', solid: eye, ...STAINLESS },
    { name: 'Crescent hub', solid: hub, ...mat('source', '#1c1d1f', .1, .5) },
    { name: 'TrakHandle Sport print', solid: print, ...WHITE_PRINT },
    { name: 'Rotating grip with end discs', solid: grip, ...mat('handle', '#202124', .05, .75) },
    { name: 'Cable bosses', solid: bosses, ...BLACK_ANODISED },
    { name: 'Coated steel cables', solid: cables, ...mat('source', '#2e3033', .5, .45) },
  ];
});

// ————— Darko Lifting Shorty / Longy —————
/** Curved 3/8″ bar with D-handle holes, clover hub around an acetal landmine liner, eye tab and white D logo plates. */
function darkoBar(part: HangPart, width: number, holes: number[]) {
  return attachment(part, t => {
    const th = 9.5, band = 38, hubZ = -58, X = width / 2 - band / 2, drop = 41, zAt = (x: number) => hubZ - drop * (x / X) ** 2;
    const half: P2[] = Array.from({ length: 13 }, (_, i) => { const x = X * i / 12; return [x, zAt(x)]; });
    const path = [...mirrorX(half).reverse(), ...half.slice(1)];
    const holeCuts = holes.flatMap(x => [-1, 1].map(s => t.circle2([s * x, zAt(x)], 8.5, 24)));
    const bar2 = t.k(t.union2([t.band2(path, band), t.circle2([-X, zAt(X)], band / 2, 32), t.circle2([X, zAt(X)], band / 2, 32)]).subtract(t.union2(holeCuts)));
    const bar = t.flat(bar2, th);
    const clover2 = t.k(t.union2([t.circle2([0, hubZ], 37, 48), ...[-1, 1].flatMap(sx => [-1, 1].map(sz => t.circle2([sx * 29, hubZ + sz * 29], 11)))]).subtract(t.circle2([0, hubZ], 27, 48)));
    const plates = [-1, 1].map(s => t.flat(clover2, 12, s * (th / 2 + 6)));
    const liner = t.k(t.cylinder([0, -th / 2 - 13, hubZ], [0, th / 2 + 13, hubZ], 56, 48).subtract(t.cylinder([0, -20, hubZ], [0, 20, hubZ], 50, 48)));
    const tab = t.flat(eyeTab(t, 7, 13, hubZ + 20, 30), th);
    const bolts = [-1, 1].flatMap(s => [-1, 1].flatMap(sx => [-1, 1].map(sz => t.cylinder([sx * 29, s * (th / 2 + 12), hubZ + sz * 29], [sx * 29, s * (th / 2 + 15), hubZ + sz * 29], 10, 16))));
    const logos = [-1, 1].map(s => t.box([24, th + 8, 44], [s * 54, 0, zAt(54)]));
    const marks = [-1, 1].map(s => t.box([9, .6, 20], [s * 54, -th / 2 - 4.3, zAt(54)]));
    return [
      { name: 'Black 3/8″ steel bar', solid: bar, ...BLACK_POWDER },
      { name: 'Clover hub plates and eye tab', solid: t.union([...plates, tab]), ...BLACK_ANODISED },
      { name: 'Black acetal landmine liner', solid: liner, ...BLACK_PLASTIC, color: '#26272a' },
      { name: 'Socket head bolts', solid: t.union(bolts), ...mat('source', '#3b3d40', .8, .35) },
      { name: 'White D logo plates', solid: t.union(logos), ...mat('source', '#e8e8e4', 0, .45) },
      { name: 'D marks', solid: t.union(marks), ...mat('source', '#1a1a1a', 0, .5) },
    ];
  });
}
/** Shorty: 8 holes per side at 27 mm pitch. Longy: 11 per side at 28.8 mm pitch so two pairs land 24″ and 10.4″ apart. */
export const buildShorty = darkoBar(DARKO_SHORTY, 22.75 * IN, Array.from({ length: 8 }, (_, i) => 70 + 27 * i));
export const buildLongy = darkoBar(DARKO_LONGY, 32.4 * IN, Array.from({ length: 11 }, (_, i) => 5.2 * IN - 2 * 28.8 + 28.8 * i));

// ————— Mutant Metals ARC —————
/** ARC, 5° standard frame: 1/4″ half-disc plate (three cable holes, window, MM mark) on a bent 1.75″ barrel; 8″ × 35 mm handles. */
export const buildArc = attachment(MUTANT_ARC, t => {
  const R = 112, holeR = 6.5, top = hangZ(holeR) + holeR + 9.5, cz = top - R, tubeD = 1.75 * IN, rise = 5 * DEG, barrel = 10.75 * IN / 2, handle = 8 * IN;
  const plate2 = t.k(t.k(t.circle2([0, cz], R, 96).intersect(t.rect2([0, cz + R / 2], 2 * R + 2, R)))
    .subtract(t.union2([
      t.hull2([t.circle2([0, hangZ(holeR)], holeR, 20), t.circle2([0, hangZ(holeR) - 8], holeR, 20)]),
      ...[-1, 1].map(s => t.hull2([t.circle2(polar([0, cz], R - 17, 90 + s * 42), 6, 20), t.circle2(polar([0, cz], R - 25, 90 + s * 42), 6, 20)])),
      t.hull2([t.circle2([-38, cz + 18], 8), t.circle2([38, cz + 18], 8), t.circle2([-16, cz + 50], 8), t.circle2([16, cz + 50], 8)]),
      t.rect2([-66, cz + 30], 12, 3), t.rect2([-66, cz + 37], 3, 14), t.rect2([-60, cz + 37], 3, 14),
    ])));
  const plate = t.flat(plate2, 6.35);
  const along = (s: number, d: number): Vec3 => [s * d * Math.cos(rise), 0, cz + d * Math.sin(rise)];
  const tube = t.union([-1, 1].map(s => t.k(t.cylinder(along(s, -tubeD * .18), along(s, barrel), tubeD, 40).subtract(t.cylinder(along(s, barrel - 20), along(s, barrel + 1), tubeD - 8, 32)))));
  const welds = t.union([-60, 0, 60].map(x => t.ellipsoid([x, 0, cz + tubeD / 2 - 1], [14, 6, 3], 12)));
  const handles = t.union([-1, 1].map(s => t.hull([t.cylinder(along(s, barrel), along(s, barrel + handle - 3), 35, 40), t.cylinder(along(s, barrel), along(s, barrel + handle), 31, 40)])));
  return [
    { name: 'Half-disc plate', solid: plate, ...BLACK_POWDER },
    { name: '5° threaded barrel', solid: t.union([tube, welds]), ...BLACK_POWDER, color: '#202124' },
    { name: '8″ black anodised aluminium handles', solid: handles, ...mat('handle', '#232427', .55, .5) },
  ];
});

// ————— MAG (Maximum Advantage Grip) —————
interface MagGrip { at: P2; size: Vec3; /** tilt in the frame plane, + = outer end up (°) */ roll: number; /** turn about Z, + = user-side end outward (°) */ yaw: number }
interface MagSpec { half: P2[]; band: number; grip: MagGrip; logo: { at: P2; angle: number; w: number } }
function magGrip(part: HangPart, spec: MagSpec) {
  return attachment(part, t => {
    const holeR = 6.5, cz = hangZ(holeR), th = 19;
    const path = t.curve([...mirrorX(spec.half).reverse(), ...spec.half.slice(1)], 5);
    const frame2 = t.k(t.union2([t.band2(path, spec.band), t.hull2([t.circle2([0, cz], 17, 40), t.circle2([0, spec.half[0][1]], spec.band / 2)]), ...[-1, 1].map(s => t.circle2([s * spec.half.at(-1)![0], spec.half.at(-1)![1]], spec.band / 2, 32))]).subtract(t.circle2([0, cz], holeR, 24)));
    const frame = t.flat(frame2, th);
    const { at, size, roll, yaw } = spec.grip;
    const block = t.roundBox(size, Math.min(12, size[0] / 2.4));
    const grips = [-1, 1].map(s => t.place(block, [0, -s * roll, s * yaw], [s * at[0], 0, at[1]]));
    const { at: la, angle, w } = spec.logo;
    const logo = t.union([t.place(t.box([w, .6, 12], [0, 0, 0]), [0, -angle, 0], [la[0], -th / 2 - .3, la[1]]), t.place(t.box([w * .8, .6, 3], [0, 0, 0]), [0, -angle, 0], [la[0] - 6 * Math.sin(angle * DEG), -th / 2 - .3, la[1] - 10 * Math.cos(angle * DEG)])]);
    return [
      { name: 'Rubber-coated steel frame', solid: frame, ...mat('source', '#19191b', 0, .88) },
      { name: 'Contoured rubber grips', solid: t.union(grips), ...mat('handle', '#1c1c1e', 0, .92) },
      { name: 'Yellow MAG mark', solid: logo, ...mat('source', '#d8c42a', 0, .6) },
    ];
  });
}
const medium: P2[] = [[0, -22], [42, -44], [150, -102], [212, -138], [252, -151], [290, -147], [312, -128], [318, -98]];
export const buildMagMs = magGrip(MAG_MS, { half: medium, band: 38, grip: { at: [279, -106], size: [80, 62, 42], roll: 20, yaw: 30 }, logo: { at: [-110, -70], angle: -27, w: 66 } });
export const buildMagMp = magGrip(MAG_MP, { half: medium, band: 38, grip: { at: [279, -106], size: [80, 62, 42], roll: 20, yaw: -30 }, logo: { at: [-110, -70], angle: -27, w: 66 } });
export const buildMagMn = magGrip(MAG_MN, { half: medium, band: 38, grip: { at: [279, -106], size: [80, 62, 42], roll: 20, yaw: 0 }, logo: { at: [-110, -70], angle: -27, w: 66 } });
export const buildMagWg = magGrip(MAG_WG, { half: [[0, -20], [46, -42], [150, -90], [250, -112], [440, -114], [492, -112], [504, -96], [506, -74]], band: 40, grip: { at: [483, -88], size: [30, 96, 78], roll: 0, yaw: 0 }, logo: { at: [-110, -62], angle: -24, w: 62 } });
const close: P2[] = [[0, -24], [0, -62], [14, -98], [44, -122], [80, -120], [102, -104]];
export const buildMagCs = magGrip(MAG_CS, { half: close, band: 40, grip: { at: [66, -76], size: [115, 44, 48], roll: 28, yaw: 20 }, logo: { at: [0, -92], angle: 0, w: 32 } });
export const buildMagCn = magGrip(MAG_CN, { half: close, band: 40, grip: { at: [74, -72], size: [42, 100, 85], roll: 12, yaw: 0 }, logo: { at: [0, -92], angle: 0, w: 32 } });

// ————— Darko Lifting Danglers —————
export const buildDanglers = attachment(DARKO_DANGLERS, t => {
  const rings: Manifold[] = [], collars: Manifold[] = [], eggs: Manifold[] = [];
  for (const [s, y] of [[-1, -4], [1, 4]] as const) {
    const R = 12.5, wire = 5.5, cz = hangZ(R - wire / 2), a = s * 19;
    const tilt = (m: Manifold) => t.k(m.rotate([0, a, 0]));
    rings.push(tilt(t.ring([0, y, cz], R, wire, 32)));
    collars.push(tilt(t.union([t.k(t.k(t.M.cylinder(7, 7, 7, 6)).translate([0, y, cz - R - 9])), t.cylinder([0, y, cz - R - 3], [0, y, cz - R - 2], 9, 16)])));
    eggs.push(tilt(t.hull([t.sphere([0, y, -37], 25, 28), t.ellipsoid([0, y, -86], [25.5, 25.5, 27], 28)])));
  }
  return [
    { name: 'Stainless eye bolts', solid: t.union(rings), ...STAINLESS },
    { name: 'Hex collars', solid: t.union(collars), ...STAINLESS, roughness: .3 },
    { name: 'Textured avocado grips', solid: t.union(eggs), ...mat('handle', '#1d1e20', 0, .95) },
  ];
});

// ————— Arc paddle handles (KORIKAHM MSP, PRIME RO-T8) —————
interface ArcSpec { R: number; end: number; slots: number[]; slot: number; grip: number; fin: number; plate: Material; block: Material; badge?: Material; /** one trapezoid rubber paddle instead of a round bar with a fin */ paddle?: boolean }
function arcHandle(part: HangPart, spec: ArcSpec) {
  return attachment(part, t => {
    const holeR = 5, cz = hangZ(holeR), c: P2 = [0, cz - spec.R], band = 24, th = 6.35;
    const path = arc(c, spec.R, 90, spec.end, 6), P = polar(c, spec.R, spec.end);
    const slots = spec.slots.map(a => t.hull2([t.circle2(polar(c, spec.R, a + spec.slot / 2), 3.6, 16), t.circle2(polar(c, spec.R, a - spec.slot / 2), 3.6, 16)]));
    const plate2 = t.k(t.union2([t.band2(path, band), t.circle2([0, cz], 12, 32)]).subtract(t.union2([t.circle2([0, cz], holeR, 20), ...slots])));
    const plate = t.flat(plate2, th);
    const bx = P[0] + 2, bz = P[1] - 16, gz = bz - 10, gx0 = bx - 18, gx1 = gx0 - spec.grip;
    const block = t.union([t.box([34, 40, 50], [bx, 0, bz]), t.cylinder([bx + 17, 0, gz], [bx + 26, 0, gz], 16, 20), t.cylinder([bx + 26, 0, gz], [bx + 30, 0, gz], 20, 20), t.cylinder([bx - 4, -22, bz - 30], [bx - 4, 22, bz - 30], 14, 20)]);
    const grip = spec.paddle
      ? t.hull([t.k(t.roundBox([spec.grip, 36, 26], 11).translate([(gx0 + gx1) / 2, 0, gz])), t.k(t.roundBox([spec.grip - 34, 26, 8], 3.5).translate([(gx0 + gx1) / 2 + 6, 0, gz - spec.fin]))])
      : t.union([t.cylinder([gx0 + 4, 0, gz], [gx1 + 12, 0, gz], 33, 36), t.sphere([gx1 + 12, 0, gz], 33, 32)]);
    // Paddle fin under the grip bar: trapezoid in XZ, thickest at the bar.
    const fin = t.hull([t.roundBox([spec.grip - 8, 26, 8], 3.5), t.k(t.roundBox([spec.grip - 44, 18, 6], 2.5).translate([6, 0, -spec.fin + 4]))]);
    const finPlaced = t.k(fin.translate([(gx0 + gx1) / 2 + 2, 0, gz - 6]));
    const out: Piece[] = [
      { name: 'Slotted arc plate', solid: plate, ...spec.plate },
      { name: 'Pivot block', solid: block, ...spec.block },
      { name: 'Rotating paddle grip', solid: spec.paddle ? grip : t.union([grip, finPlaced]), ...mat('handle', '#1f2022', 0, .85) },
    ];
    if (spec.badge) out.push({ name: 'PRIME badge', solid: t.box([22, .8, 30], [bx, -20.4, bz + 4]), ...spec.badge });
    return out;
  });
}
const LIME = mat('source', '#84c341', .25, .5);
export const buildKorikahm = arcHandle(KORIKAHM_PADDLE, { R: 96, end: -12, slots: [80, 66, 52, 38, 24, 10], slot: 7, grip: 165, fin: 40, plate: LIME, block: mat('source', '#1a1b1d', .3, .55), paddle: true });
export const buildRot8 = arcHandle(PRIME_ROT8, { R: 76, end: -6, slots: [70, 46, 22], slot: 13, grip: 150, fin: 42, plate: BLACK_POWDER, block: mat('source', '#2a2c2f', .35, .6), badge: mat('source', '#8dc63f', .1, .5) });

// ————— PRIME KAZ handles —————
/** Tapered ribbed aluminium spool (small: 2.25″ top to 1.70″ bottom), end flanges, square nut on top, nylon strap loop to the hook. */
function kazSpool(t: Kit, x: number, y: number, top: number) {
  const L = 133, r0 = 2.25 * IN / 2, r1 = 1.70 * IN / 2, grooves = 9, profile: P2[] = [];
  profile.push([39, top], [39, top - 6]);
  for (let i = 0; i < grooves; i++) {
    const z0 = top - 6 - L * i / grooves, z1 = top - 6 - L * (i + 1) / grooves, r = r0 + (r1 - r0) * (i + .5) / grooves;
    profile.push([r, z0 - 1.5], [r - 1.6, z0 - 3.5], [r - 1.6, z1 + 3.5], [r, z1 + 1.5]);
  }
  profile.push([33, top - 6 - L], [33, top - 12 - L]);
  const body = t.lathe(profile.map(([r, z]) => [r, z] as P2), [x, y, 0], 48);
  const nut = t.box([15, 15, 7], [x, y, top + 3.5]);
  return { body, nut };
}
export const buildKaz = attachment(PRIME_KAZ, t => {
  const top = -150, spools = [[-1, -6], [1, 14]].map(([s, y]) => ({ s, y, ...kazSpool(t, s * 45, y, top) }));
  const straps = spools.map(({ s, y }) => t.flat(t.band2(t.curve([[s * 45 - 16, top + 1], [s * 18 - 10, -60], [-6, -2], [0, HOOK_ROD / 2 + 1.3], [6, -2], [s * 18 + 10, -60], [s * 45 + 16, top + 1]], 5), 25), 2.6, y));
  return [
    { name: 'Ribbed aluminium spools', solid: t.union(spools.map(s => s.body)), ...mat('handle', '#c9ccd0', .85, .32) },
    { name: 'Square nuts', solid: t.union(spools.map(s => s.nut)), ...mat('source', '#3c3e41', .7, .4) },
    { name: 'Nylon straps', solid: t.union(straps), ...NYLON },
  ];
});

// ————— Belt Fed Strength BFAS —————
export const buildBfas = attachment(BELT_FED_BFAS, t => {
  const R = 22, wire = 6, cz = hangZ(R - wire / 2), w = 1.625 * IN, th = 7.6, rivZ = -186;
  const legs = [-1, 1].map(s => [[s * 8, cz - R + 5], [s * 32, -110], [s * 55, rivZ + 6]] as P2[]);
  const loops = [-1, 1].map(s => t.curve([[s * 55, rivZ + 4], [s * 55 + 24, -236], [s * 55 + 26, -320], [s * 55, -372], [s * 55 - 26, -320], [s * 55 - 24, -236]].map(p => p as P2), 6).slice(0, -1));
  const wrap = t.curve([[-10, cz - R - 4], [0, cz - R - wire / 2 - 2], [10, cz - R - 4]], 3);
  const face2 = t.union2([...legs.map(p => t.band2(p, w)), ...loops.map(p => t.band2(p, w, true)), t.band2(wrap, w)]);
  const edge2 = t.union2([...legs.map(p => t.band2(p, w + 5)), ...loops.map(p => t.band2(p, w + 5, true)), t.band2(wrap, w + 5)]);
  const leather = t.flat(face2, th), edges = t.flat(edge2, th - 2.4);
  const stitch2 = t.union2([
    ...legs.flatMap(p => [-1, 1].map(d => t.band2(offsetPath(p, d * (w / 2 - 4)), 1.2))),
    ...loops.flatMap(p => [-1, 1].map(d => t.band2(offsetPath(p, d * (w / 2 - 4), true), 1.2, true))),
  ]);
  const stitch = t.flat(stitch2, th + 1);
  const rivets = t.union([-1, 1].flatMap(s => [-1, 1].flatMap(d => [-1, 1].map(f => t.hull([t.cylinder([s * 55 + d * 9, f * th / 2, rivZ], [s * 55 + d * 9, f * (th / 2 + 1.2), rivZ], 11, 16), t.cylinder([s * 55 + d * 9, f * th / 2, rivZ], [s * 55 + d * 9, f * (th / 2 + 2.2), rivZ], 7, 16)])))));
  const logo = t.cylinder([41, -th / 2 - .5, -130], [41, -th / 2 + .5, -130], 22, 28);
  return [
    { name: 'Steel O-ring', solid: t.ring([0, 0, cz], R, wire), ...STAINLESS },
    { name: 'Natural leather strap', solid: leather, ...mat('source', '#b98556', 0, .72) },
    { name: 'Water buffalo edge binding', solid: edges, ...mat('source', '#6b4223', 0, .8) },
    { name: 'Cream stitching', solid: stitch, ...mat('source', '#e7dcc2', 0, .85) },
    { name: 'Chicago screw rivets', solid: rivets, ...mat('source', '#2d2e30', .8, .3) },
    { name: 'Embossed Belt Fed mark', solid: logo, ...mat('source', '#8f6034', 0, .8) },
  ];
});

// ————— REP × Kleva Built Atlas —————
/** Atlas Multi-Grip: two rails (a 6″ grip apart) rising into a sleeve tower, ten knurled 29 mm rungs, spacer rollers, stainless eye. */
export const buildAtlasMulti = attachment(KLEVA_ATLAS_MULTI, t => {
  const yc = -15, gap = 6 * IN / 2, th = 9.5, X = 16 * IN - 21, zAt = (x: number) => -190 - 22 * Math.abs(x) / X, sz = -72, eyeR = 7;
  const railPath: P2[] = [[-X, zAt(X)], [0, zAt(0)], [X, zAt(X)]];
  const tower = t.union2([t.hull2([t.circle2([0, sz], 44, 48), t.rect2([0, zAt(0) + 8], 112, 10)]), ...[-1, 1].map(s => t.circle2([s * 42, -36], 16))]);
  const rail2 = t.k(t.union2([t.band2(railPath, 42), t.circle2([-X, zAt(X)], 21, 32), t.circle2([X, zAt(X)], 21, 32), tower]).subtract(t.circle2([0, sz], 30, 48)));
  const rails = [-1, 1].map(s => t.flat(rail2, th, yc + s * (gap + th / 2)));
  const rungX = [4, 8, 9.5, 11, 15].map(v => v * IN);
  const rungs = rungX.flatMap(x => [-1, 1].map(s => t.cylinder([s * x, yc - gap, zAt(x)], [s * x, yc + gap, zAt(x)], 29, 32)));
  const bolts = rungX.flatMap(x => [-1, 1].flatMap(s => [-1, 1].map(f => t.cylinder([s * x, yc + f * (gap + th), zAt(x)], [s * x, yc + f * (gap + th + 3), zAt(x)], 16, 20))));
  const spacers = [-1, 1].map(s => t.cylinder([s * 42, yc - gap, -36], [s * 42, yc + gap, -36], 22, 24));
  const tab = t.flat(eyeTab(t, eyeR, 14, -30, 44), 12, yc);
  const liner = t.k(t.cylinder([0, yc - gap - th - 3, sz], [0, yc + gap + th + 3, sz], 62, 48).subtract(t.cylinder([0, yc - 99, sz], [0, yc + 99, sz], 52, 48)));
  const logo = t.box([74, .6, 16], [-150, yc - gap - th - .3, zAt(150)]);
  return [
    { name: 'Black aluminium rails and tower', solid: t.union(rails), ...BLACK_POWDER, metalness: .4 },
    { name: 'Knurled 29 mm aluminium grips', solid: t.union(rungs), ...RAW_ALUMINIUM },
    { name: 'Spacer rollers', solid: t.union(spacers), ...mat('source', '#b9bdc1', .9, .3) },
    { name: 'Stainless bolts', solid: t.union(bolts), ...SILVER_HARDWARE },
    { name: 'Stainless cable eye', solid: tab, ...STAINLESS },
    { name: 'Plastic sleeve protection', solid: liner, ...BLACK_PLASTIC },
    { name: 'REP × KB print', solid: logo, ...WHITE_PRINT },
  ];
});
/** Angled Atlas close grip: front and rear T-plates, 29 mm × 6″ handles splayed 12.5° in plan, grey sleeve tube and eye. */
export const buildAtlasAngled = attachment(KLEVA_ANGLED_CLOSE, t => {
  const yc = -16, gap = 6 * IN / 2, th = 10, hz = -170, sz = -62, splay = gap * Math.tan(12.5 * DEG), hx = 4 * IN;
  const plate = (xh: number, r: number) => t.k(t.union2([
    t.hull2([t.circle2([-xh, hz], r, 36), t.circle2([xh, hz], r, 36)]),
    t.hull2([t.rect2([0, hz + 18], 120, 10), t.circle2([0, sz], 40, 40)]),
    t.circle2([0, sz], 44, 48), ...[-1, 1].map(s => t.circle2([s * 40, sz + 22], 14)), t.circle2([0, sz - 42], 13),
  ]).subtract(t.circle2([0, sz], 30, 48)));
  const front = t.flat(plate(hx - splay, 29), th, yc - gap - th / 2), rear = t.flat(plate(hx + splay, 23), th, yc + gap + th / 2);
  const sleeve = t.k(t.cylinder([0, yc - gap - 2, sz], [0, yc + gap + 2, sz], 66, 48).subtract(t.cylinder([0, yc - 99, sz], [0, yc + 99, sz], 52, 48)));
  const tab = t.flat(eyeTab(t, 6.5, 12, sz + 30, 30), 10, yc);
  const handles = [-1, 1].map(s => t.cylinder([s * (hx - splay), yc - gap, hz], [s * (hx + splay), yc + gap, hz], 29, 32));
  const heads = (y: number, f: number, xs: P2[]) => xs.map(([x, z]) => t.cylinder([x, y, z], [x, y + f * 3.5, z], 17, 20));
  const bolts = [...heads(yc - gap - th, -1, [[-(hx - splay), hz], [hx - splay, hz], [-40, sz + 22], [40, sz + 22], [0, sz - 42]]), ...heads(yc + gap + th, 1, [[-(hx + splay), hz], [hx + splay, hz], [-40, sz + 22], [40, sz + 22], [0, sz - 42]])];
  const logo = t.box([62, .6, 14], [0, yc - gap - th - .3, hz + 2]);
  return [
    { name: 'Black aluminium T-plates', solid: t.union([front, rear]), ...BLACK_POWDER, metalness: .4 },
    { name: 'Grey sleeve tube and eye', solid: t.union([sleeve, tab]), ...mat('source', '#6d7074', .75, .38) },
    { name: 'Colorado-knurl handles', solid: t.union(handles), ...RAW_ALUMINIUM },
    { name: 'Stainless button heads', solid: t.union(bolts), ...SILVER_HARDWARE },
    { name: 'REP × KB print', solid: logo, ...WHITE_PRINT },
  ];
});

// ————— Dynepic Spiral Strength Dually —————
export const buildDually = attachment(SPIRAL_DUALLY, t => {
  const holeR = 6, cz = hangZ(holeR), sheaveZ = -44;
  const cheek2 = t.k(t.hull2([t.circle2([0, cz], 12.5, 32), t.circle2([-12, sheaveZ - 8], 19), t.circle2([12, sheaveZ - 8], 19)]).subtract(t.circle2([0, cz], holeR, 24)));
  const cheeks = [-1, 1].map(s => t.flat(cheek2, 4, s * 8));
  const sheave = t.k(t.cylinder([0, -6, sheaveZ], [0, 6, sheaveZ], 42, 40).subtract(t.ring([0, 0, sheaveZ], 21, 9, 40)));
  const axle = t.cylinder([0, -12, sheaveZ], [0, 12, sheaveZ], 11, 20);
  const gx = 32, gTop = -405, gLen = 132;
  const rope = t.union([t.tube(arc([0, sheaveZ], 19, 180, 0, 15).map(([x, z]) => [x, 0, z] as Vec3), 9, 12), ...[-1, 1].map(s => t.tube([[s * 19, 0, sheaveZ], [s * 22, 0, sheaveZ - 60], [s * gx, 0, gTop + 4]], 9, 12))]);
  // Tapered grip with six raised spiral bands (saw-tooth profile), rounded foot.
  const prof: P2[] = [[6, 0]];
  for (let i = 0; i < 6; i++) { const z0 = -gLen * i / 6, z1 = -gLen * (i + 1) / 6, r = 12 + 17 * (i + 1) / 6; prof.push([r - 3, z0 - 2], [r, z1 + 3], [r - 1.5, z1]); }
  prof.push([27, -gLen - 4], [18, -gLen - 7]);
  const grips = t.union([-1, 1].map(s => t.lathe(prof, [s * gx, 0, gTop], 40)));
  return [
    { name: 'Red aluminium pulley', solid: t.union(cheeks), ...mat('source', '#c3252f', .6, .35) },
    { name: 'Sheave and axle', solid: t.union([sheave, axle]), ...mat('source', '#b7bbbf', .9, .3) },
    { name: 'Braided polyester rope', solid: rope, ...mat('liner', '#141516', 0, .9) },
    { name: 'Spiral Strength EPDM grips', solid: grips, ...mat('handle', '#18191b', 0, .92) },
  ];
});

// ————— Kensui Swissies —————
/** Swissies V1: "?"-shaped nylon-fibreglass hook, rubber-lined seat on the rod, stem down into a 32 mm knurled handle along X. */
function swissie(t: Kit, y: number) {
  const seat = 17, c: P2 = [0, HOOK_ROD / 2 - seat], R = seat + 11, th = 26;
  const arcPts = arc(c, R, 215, 0, 8), stem = t.curve([[R, c[1]], [R - 2, -50], [R - 10, -98], [R - 26, -122]], 5);
  const body2 = t.union2([t.band2([...arcPts, ...stem.slice(1)], 22), t.circle2(arcPts[0], 11, 24)]);
  const body = t.flat(body2, th, y);
  const lining = t.flat(t.band2(arc(c, seat + 2, 190, -8, 8), 4), th + .6, y);
  const hz = -127, handle = t.union([t.cylinder([R - 26, y, hz], [-96, y, hz], 32, 36), t.sphere([R - 26, y, hz], 32, 32)]);
  const cap = t.cylinder([-96, y, hz], [-98, y, hz], 29, 32);
  return { body, lining, handle, cap };
}
export const buildSwissies = attachment(KENSUI_SWISSIES, t => {
  const pair = [-6, 30].map(y => swissie(t, y));
  return [
    { name: 'Nylon-fibreglass hooks', solid: t.union(pair.map(p => p.body)), ...mat('source', '#1d1e20', .05, .6) },
    { name: 'Rubber seat linings', solid: t.union(pair.map(p => p.lining)), ...BLACK_RUBBER },
    { name: 'Knurled 32 mm handles', solid: t.union(pair.map(p => p.handle)), ...mat('handle', '#222326', .05, .85) },
    { name: 'KENSUI end caps', solid: t.union(pair.map(p => p.cap)), ...mat('source', '#55585c', .5, .45) },
  ];
});
/** Swissies V2 MAX: peaked hook hung by its carabiner eyelet, rubber-lined roof, stem into a knurled fin-shaped palm support. */
function swissieMax(t: Kit, y: number) {
  const holeR = 5, cz = hangZ(holeR), th = 32;
  const centre: P2[] = [[-62, -86], [-62, -70], [-8, -24], [0, -20], [8, -24], [48, -64], [48, -126]];
  const path = t.curve(centre, 5);
  const body2 = t.union2([t.band2(path, 22), t.circle2(centre[0], 11, 24), t.hull2([t.circle2([0, cz], 10.5, 28), t.rect2([0, -24], 26, 8)])]);
  const body = t.flat(t.k(body2.subtract(t.circle2([0, cz], holeR, 20))), th, y);
  const lining = t.flat(t.band2(offsetPath(t.curve(centre.slice(1, 6), 5), -12.5), 3.5), th + .6, y);
  const fin = t.hull([t.roundBox([134, 44, 10], 4.5).translate([-6, y, -126]), t.roundBox([100, 28, 8], 3.5).translate([1, y, -190])].map(m => t.k(m)));
  return { body, lining, fin };
}
export const buildSwissiesMax = attachment(KENSUI_SWISSIES_MAX, t => {
  const pair = [-6, 42].map(y => swissieMax(t, y));
  return [
    { name: 'Nylon-fibreglass hooks', solid: t.union(pair.map(p => p.body)), ...mat('source', '#1d1e20', .05, .6) },
    { name: 'Rubber roof linings', solid: t.union(pair.map(p => p.lining)), ...BLACK_RUBBER },
    { name: 'Knurled fin palm supports', solid: t.union(pair.map(p => p.fin)), ...mat('handle', '#232427', .05, .88) },
  ];
});

// ————— Beyond Power CarbonFlex —————
/** 28 mm carbon tube, PE wave grips inboard of aluminium end caps, centre aluminium block with a titanium U-shackle on the rod. */
function carbonFlex(part: HangPart, lengthIn: number) {
  return attachment(part, t => {
    const L = lengthIn * IN, half = L / 2, z = -46, wire = 6, r = 13;
    const shackle = t.tube([[-r, 0, -26], ...arc([0, -7], r, 180, 0, 12).map(([x, zz]) => [x, 0, zz] as Vec3), [r, 0, -26]], wire, 16);
    const block = t.k(t.roundBox([40, 36, 44], 6).translate([0, 0, z]));
    const logo = t.ellipsoid([0, -18, z + 2], [5, 1.2, 9], 16);
    const bar = t.cylinder([-half + 7, 0, z], [half - 7, 0, z], 28, 36);
    const caps = t.union([-1, 1].map(s => t.cylinder([s * (half - 7), 0, z], [s * half, 0, z], 29, 36)));
    const grips = t.union([-1, 1].map(s => t.cylinder([s * (half - 172), 0, z], [s * (half - 7), 0, z], 31, 36)));
    return [
      { name: 'Carbon-fibre tube', solid: bar, ...mat('source', '#1c1d20', .45, .3) },
      { name: 'Wave-pattern PE grips', solid: grips, ...mat('handle', '#141517', 0, .8) },
      { name: 'Aluminium end caps and swivel block', solid: t.union([caps, block]), ...mat('source', '#b8bbbf', .9, .3) },
      { name: 'Titanium shackle', solid: shackle, ...mat('source', '#a7aaae', .95, .28) },
      { name: 'Block logo recess', solid: logo, ...mat('source', '#55585c', .7, .4) },
    ];
  });
}
export const buildCarbonFlex48 = carbonFlex(CARBONFLEX_48, 48);
export const buildCarbonFlex24 = carbonFlex(CARBONFLEX_24, 24);

export const definitions: PartDefinition[] = [
  hangDefinition(PORTER_ECLIPSE, buildEclipse), hangDefinition(ANGLES90_GRIPS, buildAngles90), hangDefinition(TRAKHANDLE_SPORT, buildTrakHandle),
  hangDefinition(DARKO_SHORTY, buildShorty), hangDefinition(MUTANT_ARC, buildArc), hangDefinition(MAG_MS, buildMagMs), hangDefinition(DARKO_DANGLERS, buildDanglers),
  hangDefinition(KORIKAHM_PADDLE, buildKorikahm), hangDefinition(PRIME_KAZ, buildKaz), hangDefinition(BELT_FED_BFAS, buildBfas), hangDefinition(PRIME_ROT8, buildRot8),
  hangDefinition(KLEVA_ATLAS_MULTI, buildAtlasMulti), hangDefinition(MAG_CS, buildMagCs), hangDefinition(MAG_MP, buildMagMp), hangDefinition(SPIRAL_DUALLY, buildDually),
  hangDefinition(MAG_MN, buildMagMn), hangDefinition(KENSUI_SWISSIES, buildSwissies), hangDefinition(MAG_WG, buildMagWg), hangDefinition(DARKO_LONGY, buildLongy),
  hangDefinition(KENSUI_SWISSIES_MAX, buildSwissiesMax), hangDefinition(MAG_CN, buildMagCn), hangDefinition(KLEVA_ANGLED_CLOSE, buildAtlasAngled),
  hangDefinition(CARBONFLEX_48, buildCarbonFlex48), hangDefinition(CARBONFLEX_24, buildCarbonFlex24),
];
