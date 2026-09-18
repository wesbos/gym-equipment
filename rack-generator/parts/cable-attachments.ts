import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { HOOK_REACH, HOOK_ROD, hangDefinition, type HangPart } from '../hang-part.ts';
import { LAT_BAR, STRAIGHT_BAR, TRICEP_ROPE, D_HANDLES, TRIANGLE_ROW, PUSHDOWN_BAR, CURL_BAR, ANKLE_CUFF } from '../hang-parts/cable-attachments.ts';
/** Source axes: X along the wall, -Y out of it, Z up. Origin = carabiner anchor: the hook rod / carabiner axis
 * through the top of the eye, so a hung attachment's eye rests on its peg and a future cable clip uses the same point. */
type Material = Pick<SolidPart, 'role' | 'color' | 'metalness' | 'roughness'>;
const CHROME: Material = { role: 'handle', color: '#d8dcdf', metalness: 1, roughness: .18 };
const KNURL: Material = { role: 'handle', color: '#a9aeb2', metalness: .95, roughness: .45 };
const RUBBER: Material = { role: 'liner', color: '#141516', metalness: 0, roughness: .72 };
const NYLON: Material = { role: 'liner', color: '#1b1c1e', metalness: 0, roughness: .9 };
const HOOK: Material = { role: 'source', color: '#26282a', metalness: .4, roughness: .5 };
const EYE_HOLE = 7, EYE_CENTER = -(EYE_HOLE - HOOK_ROD / 2), BAR_AXIS = -45;
type Kit = ReturnType<typeof kit>;
function kit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: Manifold[] = [];
  const k = <T extends Manifold>(s: T): T => (owned.push(s), s);
  const deg = 180 / Math.PI;
  const cylinder = (a: Vec3, b: Vec3, d: number, n = 24) => {
    const v = b.map((x, i) => x - a[i]), len = Math.hypot(...v);
    return k(k(k(M.cylinder(len, d / 2, d / 2, n)).rotate([0, Math.acos(v[2] / len) * deg, Math.atan2(v[1], v[0]) * deg])).translate(a));
  };
  const sphere = (at: Vec3, d: number, n = 20) => k(k(M.sphere(d / 2, n)).translate(at));
  /** Rounded tube through `points` (capsule chain). */
  const tube = (points: Vec3[], d: number, n = 20) => k(M.union(points.slice(1).map((p, i) => k(M.hull([sphere(points[i], d, n), sphere(p, d, n)])))));
  /** Ring in the XZ plane (axis along Y), so a hook rod along Y threads it. */
  const ring = (center: Vec3, radius: number, wire: number) => {
    const circle = C.circle(wire / 2, 12), moved = circle.translate([radius, 0]), solid = k(moved.revolve(40));
    circle.delete(); moved.delete();
    return k(k(solid.rotate([90, 0, 0])).translate(center));
  };
  const box = (size: Vec3, at: Vec3) => k(k(M.cube(size, true)).translate(at));
  const union = (list: Manifold[]) => k(M.union(list));
  /** Swivel eye tab (6 mm plate in the XZ plane) from its hole at the anchor down to `base`. */
  const eye = (base: number, thickness = 6) => {
    const outline = k(M.hull([cylinder([0, -thickness / 2, EYE_CENTER], [0, thickness / 2, EYE_CENTER], 26, 28), box([20, thickness, 1], [0, 0, base])]));
    return k(outline.subtract(cylinder([0, -thickness, EYE_CENTER], [0, thickness, EYE_CENTER], EYE_HOLE * 2, 24)));
  };
  /** Chrome swivel sleeve along X with collars; its eye tab rises into the anchor. */
  const swivel = (z = BAR_AXIS) => union([cylinder([-35, 0, z], [35, 0, z], 38, 32), cylinder([-43, 0, z], [-35, 0, z], 33, 32), cylinder([35, 0, z], [43, 0, z], 33, 32), eye(z + 12)]);
  /** J-peg into the panel: rod from the face (y = HOOK_REACH) out past the anchor, upturned tip, rear tab behind the face. */
  const hook = () => union([cylinder([0, HOOK_REACH + 4.5, 0], [0, -22, 0], HOOK_ROD, 16), sphere([0, -22, 0], HOOK_ROD, 16), cylinder([0, -22, 0], [0, -25, 20], HOOK_ROD, 16), sphere([0, -25, 20], HOOK_ROD, 16), sphere([0, HOOK_REACH + 4.5, 0], HOOK_ROD, 16), cylinder([0, HOOK_REACH + 4.5, 0], [0, HOOK_REACH + 4.5, -12], HOOK_ROD, 16)]);
  return { M, C, owned, k, cylinder, sphere, tube, ring, box, union, eye, swivel, hook };
}
/** Catmull-Rom resample of a polyline in XZ (y = 0) at ~`step` mm. */
export function smooth(points: [number, number][], step = 8): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t, f = (a: number, b: number, c: number, d: number) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), 0, f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([points.at(-1)![0], 0, points.at(-1)![1]]);
  return out;
}
const mirror = (points: Vec3[]): Vec3[] => points.map(([x, y, z]) => [-x, y, z]);
/** Three-strand twisted rope along an XZ path (Y is the fixed side normal). */
function rope(t: Kit, path: Vec3[], d: number, pitch = 70) {
  const strands: Manifold[] = [];
  let s = 0;
  const samples = path.map((p, i) => { if (i) s += Math.hypot(...p.map((v, j) => v - path[i - 1][j])); return { p, s, i }; });
  for (let strand = 0; strand < 3; strand++) {
    const points = samples.map(({ p, s, i }) => {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], tx = b[0] - a[0], tz = b[2] - a[2], len = Math.hypot(tx, tz) || 1;
      const phase = s / pitch * 2 * Math.PI + strand * 2 * Math.PI / 3, r = d * .23;
      // Offset around the path: Y (side) and the in-plane normal (-tz, tx).
      return [p[0] - tz / len * r * Math.sin(phase), r * Math.cos(phase), p[2] + tx / len * r * Math.sin(phase)] as Vec3;
    });
    strands.push(t.tube(points, d * .56, 12));
  }
  return t.union(strands);
}
type Build = (t: Kit) => (Material & { name: string; solid: Manifold })[];
function attachment(part: HangPart, build: Build) {
  return (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
    if (p.hook !== 0 && p.hook !== 1) throw Error(`Unsupported ${part.noun} pose.`);
    const t = kit(api); let out: SolidPart[] = [], success = false;
    try {
      out = build(t);
      if (p.hook) out.push({ name: 'Pegboard hook', solid: t.hook(), ...HOOK });
      for (const piece of out) if (piece.solid.isEmpty() || piece.solid.status() !== 'NoError') throw Error(`Invalid ${part.noun} ${piece.name}`);
      success = true; return out;
    } finally { const keep = new Set(success ? out.map(o => o.solid) : []); for (const s of t.owned.reverse()) if (!keep.has(s)) s.delete(); }
  };
}
/** 48″ tip to tip: 30″ straight centre, ends raked 20° down, 26 mm fully knurled. */
export const buildLatBar = attachment(LAT_BAR, t => {
  const rake = 20 * Math.PI / 180, end = 609.5 - 13, run = end - 381, z = BAR_AXIS;
  const half: Vec3[] = [[0, 0, z], [381, 0, z], [end, 0, z - run * Math.tan(rake)]];
  return [{ name: 'Knurled chrome bar', solid: t.union([t.tube(half, 26, 24), t.tube(mirror(half), 26, 24)]), ...KNURL }, { name: 'Swivel and eye', solid: t.swivel(), ...CHROME }];
});
/** 25″ × 25.5 mm straight bar, knurled grips outboard of the swivel. */
export const buildStraightBar = attachment(STRAIGHT_BAR, t => {
  const z = BAR_AXIS, end = 317.5 - 12.75, grips = [-1, 1].map(s => t.cylinder([s * 70, 0, z], [s * 290, 0, z], 26.2, 28));
  return [{ name: 'Chrome bar', solid: t.tube([[-end, 0, z], [end, 0, z]], 25.5, 28), ...CHROME }, { name: 'Knurled grips', solid: t.union(grips), ...KNURL }, { name: 'Swivel and eye', solid: t.swivel(), ...CHROME }];
});
/** 860 mm braided rope doubled through a centre ferrule; strands hang ~420 mm to rubber end caps. */
export const buildTricepRope = attachment(TRICEP_ROPE, t => {
  const path = smooth([[6, -52], [36, -80], [60, -150], [64, -260], [54, -360], [45, -405]], 7);
  const caps = [1, -1].map(s => t.union([t.cylinder([s * 45, 0, -398], [s * 44, 0, -440], 44, 28), t.sphere([s * 44, 0, -440], 44, 24)]));
  const ferrule = t.union([t.box([36, 28, 34], [0, 0, -42]), t.eye(-26)]);
  return [{ name: 'Braided nylon rope', solid: t.union([rope(t, path, 28), rope(t, mirror(path), 28)]), ...NYLON }, { name: 'Rubber end caps', solid: t.union(caps), ...RUBBER }, { name: 'Chrome ferrule and eye', solid: ferrule, ...CHROME }];
});
/** Two steel D-handles (32 mm × 150 mm hollow grips) on nylon straps and O-rings, both on one hook, splayed 4°. */
export const buildDHandles = attachment(D_HANDLES, t => {
  const rings: Manifold[] = [], straps: Manifold[] = [], grips: Manifold[] = [];
  for (const side of [-1, 1]) {
    const y = side * 13, turn = (v: Vec3): Vec3 => { const a = side * 4 * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
    const at = (x: number, z: number) => turn([x, y, z]);
    rings.push(t.ring(at(0, -15.5), 22, 7));
    const band = (a: Vec3, b: Vec3) => t.k(t.M.hull([t.cylinder([a[0], a[1] - 19, a[2]], [a[0], a[1] + 19, a[2]], 3, 8), t.cylinder([b[0], b[1] - 19, b[2]], [b[0], b[1] + 19, b[2]], 3, 8)]));
    straps.push(band(at(-8, -40), at(-66, -272)), band(at(8, -40), at(66, -272)), band(at(-9, -38), at(9, -38)));
    const grip = t.cylinder(at(-75, -275), at(75, -275), 32, 32);
    grips.push(t.k(grip.subtract(t.cylinder(at(-80, -275), at(80, -275), 22, 24))));
  }
  return [{ name: 'Steel O-rings', solid: t.union(rings), ...CHROME }, { name: 'Nylon straps', solid: t.union(straps), ...NYLON }, { name: 'Knurled steel grips', solid: t.union(grips), ...KNURL }];
});
/** Close-grip V: eye plate, four raked legs, two 30 mm ergonomic grips running out from the wall. */
export const buildTriangleRow = attachment(TRIANGLE_ROW, t => {
  const plate = t.k(t.M.hull([t.cylinder([0, -3, EYE_CENTER], [0, 3, EYE_CENTER], 30, 28), t.box([110, 6, 8], [0, 0, -40])]));
  const legs = [-1, 1].flatMap(sx => [-1, 1].map(sy => t.tube([[sx * 48, 0, -40], [sx * 100, sy * 55, -188]], 19, 16)));
  const grips = [-1, 1].map(sx => t.union([t.cylinder([sx * 100, -60, -195], [sx * 100, 60, -195], 30, 28), t.sphere([sx * 100, 0, -195], 33, 24)]));
  const caps = [-1, 1].flatMap(sx => [-1, 1].map(sy => t.cylinder([sx * 100, sy * 60, -195], [sx * 100, sy * 68, -195], 31, 28)));
  return [{ name: 'Chrome frame and eye plate', solid: t.union([t.k(plate.subtract(t.cylinder([0, -6, EYE_CENTER], [0, 6, EYE_CENTER], EYE_HOLE * 2))), ...legs, ...caps]), ...CHROME }, { name: 'Ergonomic knurled grips', solid: t.union(grips), ...KNURL }];
});
/** Inverted-V pushdown bar: 25.3 mm arms raked 38°, knurled mid-sections, flared end plates. */
export const buildPushdownBar = attachment(PUSHDOWN_BAR, t => {
  const rake = 38 * Math.PI / 180, apex: Vec3 = [0, 0, -40], along = (s: number, d: number): Vec3 => [s * d * Math.cos(rake), 0, apex[2] - d * Math.sin(rake)];
  const arms = [-1, 1].map(s => t.tube([apex, along(s, 240)], 25.3, 24)), knurl = [-1, 1].map(s => t.cylinder(along(s, 45), along(s, 200), 26, 28));
  const plates = [-1, 1].map(s => t.cylinder(along(s, 236), along(s, 246), 72, 36));
  return [{ name: 'Chrome bar and plates', solid: t.union([...arms, ...plates, t.eye(-30)]), ...CHROME }, { name: 'Knurled grips', solid: t.union(knurl), ...KNURL }];
});
/** 720 mm cambered (EZ) curl bar: W camber either side of the swivel, 25 mm, knurled on the dips and outer grips. */
export const buildCurlBar = attachment(CURL_BAR, t => {
  const half = smooth([[0, 0], [70, 0], [112, -24], [158, -30], [204, -4], [240, 0], [347.5, 0]], 6).map(([x, , z]) => [x, 0, BAR_AXIS + z] as Vec3);
  const chrome: Manifold[] = [], knurl: Manifold[] = [];
  for (const points of [half, mirror(half)]) for (let i = 1; i < points.length; i++) {
    const x = Math.abs(points[i][0] + points[i - 1][0]) / 2;
    ((x > 105 && x < 205) || (x > 250 && x < 335) ? knurl : chrome).push(t.k(t.M.hull([t.sphere(points[i - 1], 25, 20), t.sphere(points[i], 25, 20)])));
  }
  return [{ name: 'Chrome bar', solid: t.union(chrome), ...CHROME }, { name: 'Knurled grips', solid: t.union(knurl), ...KNURL }, { name: 'Swivel and eye', solid: t.swivel(), ...CHROME }];
});
/** Neoprene-padded cuff (Ø120 × 70 mm) on a webbing tab with two steel D-rings. */
export const buildAnkleCuff = attachment(ANKLE_CUFF, t => {
  const dRings = [-5, 5].map(y => {
    const top = t.k(t.ring([0, y, -12.5], 18, 5).subtract(t.box([60, 12, 30], [0, y, -12.5 - 15])));
    return t.union([top, t.cylinder([-18, y, -12.5], [-18, y, -24], 5, 12), t.cylinder([18, y, -24], [18, y, -12.5], 5, 12), t.tube([[-18, y, -24], [18, y, -24]], 5, 12)]);
  });
  const cuff = t.k(t.cylinder([0, -35, -105], [0, 35, -105], 120, 48).subtract(t.cylinder([0, -40, -105], [0, 40, -105], 96, 48)));
  const binding = [-33, 33].map(y => t.k(t.cylinder([0, y - 3, -105], [0, y + 3, -105], 123, 48).subtract(t.cylinder([0, y - 4, -105], [0, y + 4, -105], 93, 48))));
  const tab = t.box([30, 26, 26], [0, 0, -36]), flap = t.box([14, 60, 40], [58, 0, -120]);
  return [{ name: 'Steel D-rings', solid: t.union(dRings), ...CHROME }, { name: 'Neoprene cuff', solid: t.union([cuff, tab, flap]), ...NYLON }, { name: 'Nylon binding', solid: t.union(binding), role: 'liner', color: '#3b3e42', metalness: 0, roughness: .85 }];
});
export const definitions: PartDefinition[] = [
  hangDefinition(LAT_BAR, buildLatBar), hangDefinition(STRAIGHT_BAR, buildStraightBar), hangDefinition(TRICEP_ROPE, buildTricepRope), hangDefinition(D_HANDLES, buildDHandles),
  hangDefinition(TRIANGLE_ROW, buildTriangleRow), hangDefinition(PUSHDOWN_BAR, buildPushdownBar), hangDefinition(CURL_BAR, buildCurlBar), hangDefinition(ANKLE_CUFF, buildAnkleCuff),
];
