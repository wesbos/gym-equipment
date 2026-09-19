/** Power, deadlift and multipurpose barbells: Manifold builders for the entries in ../floor-parts/power-bars.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * One lathe-built bar serves every product: local X along the bar, origin on the floor under its centre, axis at
 * collarDiameter/2 so the shoulders rest on the floor (the footprint is length × collar diameter). */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec2 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { PARTS, collarLength, powerBarFinish, powerBarModel, powerBarProduct, type Mat, type PowerBarModel } from '../floor-parts/power-bars.ts';
const BRONZE: Mat = ['#b0773f', .9, .32], WELD: Mat = ['#8c8a86', .85, .6];
const shade = (hex: string, k: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
/** Knurl zones along +X (centre knurl straddles 0; grip zones split by the smooth ring marks), in bar coordinates. */
export function knurlZones(m: PowerBarModel): [number, number][] {
  const k = m.knurl, end = m.inside / 2 - k.runout, zones: [number, number][] = [];
  if (k.center) zones.push([-k.center / 2, k.center / 2]);
  for (const side of [1, -1]) {
    let from = k.from;
    for (const mark of [...k.marks].sort((a, b) => a - b)) { zones.push(side > 0 ? [from, mark - k.markWidth / 2] : [-(mark - k.markWidth / 2), -from]); from = mark + k.markWidth / 2; }
    zones.push(side > 0 ? [from, end] : [-end, -from]);
  }
  return zones.sort((a, b) => a[0] - b[0]);
}
export function buildPowerBar(api: ManifoldAPI, id: string, p: NumericParams): SolidPart[] {
  const product = powerBarProduct(id); if (!product) throw Error(`Unknown barbell ${id}.`);
  const m = powerBarModel(product, p), finish = powerBarFinish(product, p);
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [], out: SolidPart[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const z = m.collarDiameter / 2, r = m.shaft / 2, R = m.sleeveDiameter / 2, half = m.inside / 2, collar = collarLength(m), s0 = half + collar, L = m.length / 2;
  /** Solid of revolution about the bar axis from [x along the bar, radius] points (outline order, may start/end on the axis). */
  const lathe = (pts: Vec2[], seg = 48) => {
    const loop = pts.map(([x, rad]) => [Math.max(rad, 0), x] as Vec2), cs = k(new C([loop]));
    return k(k(k(cs.revolve(seg)).rotate([0, 90, 0])).translate([0, 0, z]));
  };
  const both = (s: Manifold) => [s, k(s.mirror([1, 0, 0]))];
  const union = (s: Manifold[]) => k(M.union(s));
  const cyl = (a: number, b: number, rad: number, seg = 40) => lathe([[a, 0], [a, rad], [b, rad], [b, 0]], seg);
  const groups = new Map<string, { solids: Manifold[]; role: SolidPart['role']; mat: Mat }>();
  const add = (name: string, role: SolidPart['role'], mat: Mat, ...solids: Manifold[]) => { const g = groups.get(name) ?? { solids: [], role, mat }; g.solids.push(...solids); groups.set(name, g); };
  let success = false;
  try {
    // Shaft: smooth steel between knurl zones (grip ring marks and the centre gap are these smooth spans).
    const zones = knurlZones(m), smooth: [number, number][] = [];
    let at = -half - 1;
    for (const [a, b] of zones) { smooth.push([at, a]); at = b; }
    smooth.push([at, half + 1]);
    add(`${m.shaft} mm shaft`, 'rod', finish.shaft, ...smooth.filter(([a, b]) => b - a > .05).map(([a, b]) => cyl(a, b, r)));
    // Knurl: revolved ring relief (peaks just proud of the shaft, valleys cut into it), chamfered into each smooth edge.
    const pitch = m.knurl.pitch * 2, depth = m.knurl.depth, peak = r + depth * .45, valley = r - depth * .55;
    const band = ([a, b]: [number, number]) => {
      const pts: Vec2[] = [[a, 0], [a, valley]];
      for (let x = a + pitch / 2, i = 0; x < b - pitch / 4; x += pitch / 2, i++) pts.push([x, i % 2 ? valley : peak]);
      pts.push([b, valley], [b, 0]);
      return lathe(pts, 32);
    };
    const knurlMat: Mat = [shade(finish.shaft[0], .8), finish.shaft[1] * .9, Math.min(.95, finish.shaft[2] + .25)];
    add(`${product.name} knurl${m.knurl.center ? ', centre knurl' : ''} and ring marks`, 'handle', knurlMat, ...zones.map(band));
    // Shoulders (collars) with their inner-face treatment; sleeves with an end pocket holding the cap.
    const D = m.collarDiameter / 2, ch = m.collarStyle === 'classic' ? 3 : Math.min(2, collar / 5);
    const shoulder = lathe([[half, 0], [half, D - ch], [half + ch, D], [s0 - ch, D], [s0, D - ch], [s0, 0]]);
    if (m.collarStyle === 'weld') {
      // Recessed TIG weld: a groove in the shoulder's outer face at the sleeve root, filled by a rough bead.
      const groove = lathe([[s0 - 2.4, R - .5], [s0 - 2.4, R + 3], [s0 + .1, R + 3], [s0 + .1, R - .5]]);
      add('Sleeve shoulders', 'sleeve', finish.sleeve, ...both(k(M.difference([shoulder, groove]))));
      add('Recessed TIG weld bead', 'source', WELD, ...both(lathe([[s0 - 2.2, R - .2], [s0 - 2.2, R + 2.6], [s0 - .6, R + 2.6], [s0 - .6, R - .2]], 40)));
    } else add(m.collarStyle === 'classic' ? 'Classic thick collars' : 'Sleeve shoulders', 'sleeve', finish.sleeve, ...both(shoulder));
    if (product.vendor !== 'REP Fitness' && m.collarStyle !== 'weld')
      add('Bronze bushing thrust washers', 'source', BRONZE, ...both(lathe([[half - .8, r + .3], [half - .8, r + 4.5], [half + 1, r + 4.5], [half + 1, r + .3]], 40)));
    const cap = m.cap, pocket = cap.bronze ? R - 6 : R - 2.5, capR = cap.bronze ? pocket - 4 : pocket, recess = cap.recess, deep = recess + 3;
    const sleeve = lathe([[s0, 0], [s0, R - .6], [s0 + .6, R], [L - 1, R], [L, R - 1], [L, pocket], [L - deep, pocket], [L - deep, 0]]);
    add(`${Math.round(m.sleeve)} mm loadable sleeves`, 'sleeve', finish.sleeve, ...both(sleeve));
    const capFace = L - recess;
    add('End caps', 'source', [cap.base, .35, .45], ...both(lathe([[L - deep, 0], [L - deep, capR], [capFace, capR], [capFace, 0]], 48)));
    if (cap.bronze) add('Bronze sleeve bushings', 'source', BRONZE, ...both(lathe([[L - deep, capR - .2], [L - deep, pocket], [capFace - .3, pocket], [capFace - .3, capR - .2]], 48)));
    else add('Internal snap rings', 'source', ['#6f7275', .9, .35], ...both(lathe([[L - deep, pocket - 1.4], [L - deep, pocket + .01], [capFace + .5, pocket + .01], [capFace + .5, pocket - 1.4]], 40)));
    // Flat emblems on the cap face, in the cap's YZ plane (no logo artwork: plain geometric plates in the cap colours).
    const t = .45, plate = (shape: CrossSection) => { const s = k(k(k(shape.extrude(t)).rotate([0, 90, 0])).translate([capFace, 0, z])); return [s, k(s.mirror([1, 0, 0]))]; };
    const circle = (rad: number, n = 40) => k(C.circle(rad, n));
    const poly = (pts: Vec2[]) => k(new C([pts]));
    const rim = (outer: CrossSection, inner: CrossSection) => k(outer.subtract(inner));
    const diamond = (h: number, w: number) => poly([[0, -h], [w, 0], [0, h], [-w, 0]]);
    const u = capR, emblems: [string, string, CrossSection][] = [];
    // (CrossSection x → bar -Z after the rotation, y → bar Y; shapes are symmetric or drawn with that in mind.)
    if (cap.emblem === 'block') emblems.push(['End-cap emblem', cap.accent, k(k(C.square([u * .78, u * .9], true)).offset(u * .08, 'Round', 2, 12))], ['End-cap ring text', cap.accent, rim(circle(u * .93), circle(u * .84))]);
    if (cap.emblem === 'disc') emblems.push(['End-cap emblem', cap.accent, circle(u * .58)], ['End-cap ring text', cap.accent, rim(circle(u * .93), circle(u * .86))]);
    if (cap.emblem === 'ring') emblems.push(['End-cap ring text', cap.accent, rim(circle(u * .95), circle(u * .66))], ['End-cap emblem', cap.accent, k(k(C.square([u * .5, u * .55], true)).offset(u * .06, 'Round', 2, 12))]);
    if (cap.emblem === 'diamond') emblems.push(['End-cap emblem', cap.accent, rim(diamond(u * .5, u * .34), diamond(u * .38, u * .24))], ['End-cap ring text', cap.accent, rim(circle(u * .94), circle(u * .88))]);
    if (cap.emblem === 'double-diamond') emblems.push(['End-cap emblem', cap.accent, k(rim(diamond(u * .52, u * .36), diamond(u * .42, u * .27)).add(rim(diamond(u * .3, u * .19), diamond(u * .2, u * .11))))], ['End-cap ring text', cap.accent, rim(circle(u * .94), circle(u * .88))]);
    if (cap.emblem === 'cross') { const bone = k(C.square([u * .16, u * 1.35], true)); emblems.push(['End-cap emblem', cap.accent, k(k(bone.rotate(38)).add(k(bone.rotate(-38))))], ['End-cap ring text', cap.accent, rim(circle(u * .93), circle(u * .85))]); }
    if (cap.emblem === 'star') { const pts: Vec2[] = []; for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, rr = u * (i % 2 ? .6 : .72); pts.push([rr * Math.cos(a), rr * Math.sin(a)]); } emblems.push(['End-cap emblem', cap.accent, rim(poly(pts), circle(u * .46))], ['End-cap ring text', cap.accent, rim(circle(u * .94), circle(u * .86))]); }
    if (cap.emblem === 'sectors') {
      // Colorado badge: red sky band over a yellow sun and white peaks inside a navy ring.
      const sky = k(circle(u * .8).intersect(k(C.square([u * .8, u * 1.7]).translate([-u * .8, -u * .85]))));
      emblems.push(['End-cap emblem', cap.accent, sky], ['End-cap sun', '#f0b323', k(circle(u * .34).intersect(k(C.square([u * .34, u * .7]).translate([-u * .34, -u * .35]))).translate([u * .02, 0]))],
        ['End-cap peaks', '#f1f1ee', poly([[u * .05, u * .62], [-u * .44, u * .18], [-u * .1, -u * .05], [-u * .38, -u * .28], [u * .05, -u * .72]])]);
    }
    for (const [name, color, shape] of emblems) add(name, 'source', [color, .2, .5], ...plate(shape));
    for (const [name, g] of groups) out.push({ name, solid: g.solids.length === 1 ? g.solids[0] : union(g.solids), role: g.role, color: g.mat[0], metalness: g.mat[1], roughness: g.mat[2] });
    for (const part of out) if (part.solid.isEmpty() || part.solid.status() !== 'NoError') throw Error(`Invalid barbell solid ${part.name}`);
    success = true; return out;
  } finally { const keep = new Set(success ? out.map(p => p.solid) : []); for (const s of owned.reverse()) if (!keep.has(s as Manifold)) s.delete(); }
}
export const definitions: PartDefinition[] = PARTS.map(part => floorDefinition(part, (api, p) => buildPowerBar(api, part.id, p)));
