/** Floor-accessories family: shared Manifold toolkit (owned-solid bookkeeping, profile extrusions, revolves, sphere and
 * surface decals, a plain stroke font for weight numerals, material groups). Used by the floor-accessories-*.ts builders. */
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec3 } from '../types.ts';

export type Pt = [number, number];
/** Plain stroke font on a 4 × 6 grid: digits, a few unit/label letters and marks only (no brand artwork). */
const GLYPHS: Record<string, number[][]> = {
  '0': [[0, 0, 4, 0], [4, 0, 4, 6], [4, 6, 0, 6], [0, 6, 0, 0]], '1': [[2, 0, 2, 6], [2, 6, .8, 4.8], [.8, 0, 3.2, 0]],
  '2': [[0, 6, 4, 6], [4, 6, 4, 3], [4, 3, 0, 3], [0, 3, 0, 0], [0, 0, 4, 0]], '3': [[0, 6, 4, 6], [4, 6, 4, 0], [4, 0, 0, 0], [1, 3, 4, 3]],
  '4': [[0, 6, 0, 3], [0, 3, 4, 3], [3.2, 6, 3.2, 0]], '5': [[4, 6, 0, 6], [0, 6, 0, 3], [0, 3, 4, 3], [4, 3, 4, 0], [4, 0, 0, 0]],
  '6': [[4, 6, 0, 6], [0, 6, 0, 0], [0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3]], '7': [[0, 6, 4, 6], [4, 6, 1.6, 0]],
  '8': [[0, 0, 4, 0], [4, 0, 4, 6], [4, 6, 0, 6], [0, 6, 0, 0], [0, 3, 4, 3]], '9': [[4, 3, 0, 3], [0, 3, 0, 6], [0, 6, 4, 6], [4, 6, 4, 0], [4, 0, 0, 0]],
  K: [[0, 0, 0, 6], [0, 3, 4, 6], [1.2, 3.9, 4, 0]], G: [[4, 6, 0, 6], [0, 6, 0, 0], [0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 2, 3]],
  L: [[0, 6, 0, 0], [0, 0, 4, 0]], B: [[0, 0, 0, 6], [0, 6, 3, 6], [3, 6, 4, 5], [4, 5, 4, 4], [4, 4, 3, 3], [0, 3, 3, 3], [3, 3, 4, 2], [4, 2, 4, 1], [4, 1, 3, 0], [3, 0, 0, 0]],
  E: [[4, 6, 0, 6], [0, 6, 0, 0], [0, 0, 4, 0], [0, 3, 3, 3]], S: [[4, 6, 0, 6], [0, 6, 0, 3], [0, 3, 4, 3], [4, 3, 4, 0], [4, 0, 0, 0]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]], T: [[0, 6, 4, 6], [2, 6, 2, 0]], P: [[0, 0, 0, 6], [0, 6, 3.3, 6], [3.3, 6, 4, 5.2], [4, 5.2, 4, 3.8], [4, 3.8, 3.3, 3], [3.3, 3, 0, 3]],
  '.': [[2, 0, 2, .2]], '-': [[.6, 3, 3.4, 3]], '°': [[1, 6, 3, 6], [3, 6, 3, 4], [3, 4, 1, 4], [1, 4, 1, 6]], ' ': [],
};
/** Shared solid-building kit: every created Manifold/CrossSection is owned and freed by `finish` / `release`. */
export function accessoryKit(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [], seen = new Set<Manifold | CrossSection>();
  /** Own a solid (idempotent), so it is freed with the kit unless it is returned. */
  const k = <T extends Manifold | CrossSection>(s: T): T => { if (!seen.has(s)) { seen.add(s); owned.push(s); } return s; };
  const move = (s: Manifold, v: Vec3) => k(s.translate(v));
  const turn = (s: Manifold, r: Vec3) => k(s.rotate(r));
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const cut = (s: Manifold, holes: Manifold[]) => holes.length ? k(M.difference([s, ...holes])) : s;
  const meet = (a: Manifold, b: Manifold) => k(M.intersection([a, b]));
  const hull = (s: Manifold[]) => k(M.hull(s));
  const box = (min: Vec3, max: Vec3) => move(k(M.cube(max.map((v, i) => v - min[i]) as Vec3)), min);
  const sphere = (c: Vec3, r: number, seg = 32) => move(k(M.sphere(r, seg)), c);
  /** Cylinder along an axis from a to b, centred at the other two coordinates (u, v in axis order y/z, x/z, x/y). */
  const cyl = (axis: 'x' | 'y' | 'z', a: number, b: number, r: number, u = 0, v = 0, seg = 32, r2 = r) => {
    const c = k(M.cylinder(b - a, r, r2, seg));
    if (axis === 'z') return move(c, [u, v, a]);
    if (axis === 'x') return move(turn(c, [0, 90, 0]), [a, u, v]);
    return move(turn(c, [-90, 0, 0]), [u, a, v]);
  };
  const poly = (pts: Pt[]) => k(C.ofPolygons([pts]));
  const roundRect = (w: number, h: number, r: number, seg = 24) => { const rr = Math.max(.05, Math.min(r, w / 2 - .05, h / 2 - .05)); return k(k(C.square([w - 2 * rr, h - 2 * rr], true)).offset(rr, 'Round', 2, seg)); };
  /** Rounded-rectangle slab centred on (x, y), z0..z1. */
  const slab = (w: number, d: number, r: number, z0: number, z1: number, x = 0, y = 0, seg = 24) => move(k(roundRect(w, d, r, seg).extrude(z1 - z0)), [x, y, z0]);
  /** Extrude a section drawn in the XZ plane (x, z) through Y from y0 to y1. */
  const sideProfile = (cs: CrossSection, y0: number, y1: number) => move(turn(k(cs.extrude(y1 - y0)), [90, 0, 0]), [0, y1, 0]);
  /** Extrude a section drawn in the YZ plane (y, z) along X from x0 to x1. */
  const endProfile = (cs: CrossSection, x0: number, x1: number) => move(turn(turn(k(cs.extrude(x1 - x0)), [90, 0, 0]), [0, 0, 90]), [x0, 0, 0]);
  /** Revolve a (radius, z) section around Z. */
  const revolve = (cs: CrossSection, seg = 64) => k(cs.revolve(seg));
  /** Stroke text centred at (0, 0) in its own (u, v) plane; `h` is the cap height. */
  const text = (s: string, h: number, stroke = h * .17) => {
    const g = h / 6, adv = 5.2 * g, width = s.length * adv - 1.2 * g, parts: CrossSection[] = [];
    [...s.toUpperCase()].forEach((ch, i) => {
      const x0 = -width / 2 + i * adv;
      for (const [x1, y1, x2, y2] of GLYPHS[ch] ?? []) parts.push(k(C.hull([k(k(C.circle(stroke / 2, 10)).translate([x0 + x1 * g, y1 * g - h / 2])), k(k(C.circle(stroke / 2, 10)).translate([x0 + x2 * g, y2 * g - h / 2]))])));
    });
    if (!parts.length || [...s.toUpperCase()].some(ch => !GLYPHS[ch])) throw Error(`Unsupported accessory text ${s}.`);
    return k(C.union(parts));
  };
  /** Thin decal hugging a sphere of radius R centred at c: a (u, v) section projected along -Y onto the front (u = x, v = z),
   * re-aimed by `aim` (degrees, e.g. [-90, 0, 0] for the top, [0, 0, 90] for +X). Lies between R and R + lift. */
  const sphereDecal = (cs: CrossSection, c: Vec3, R: number, lift = .7, aim: Vec3 = [0, 0, 0], seg = 64) => {
    const prism = turn(k(cs.extrude(R + 10)), [90, 0, 0]); // v -> z, extrusion -> y in [-(R + 10), 0]
    const aimed = aim.some(Boolean) ? turn(prism, aim) : prism;
    return cut(meet(move(aimed, c), sphere(c, R + lift, seg)), [sphere(c, R - .01, seg)]);
  };
  const groups = new Map<string, { solids: Manifold[]; role: SolidPart['role']; color: string; metalness: number; roughness: number }>();
  const add = (name: string, solid: Manifold | undefined, role: SolidPart['role'], color: string, metalness = 0, roughness = .6) => {
    if (!solid || solid.isEmpty()) return;
    const g = groups.get(name) ?? { solids: [], role, color, metalness, roughness }; g.solids.push(solid); groups.set(name, g);
  };
  const release = (keep: Manifold[] = []) => { const s = new Set(keep); for (const o of owned.reverse()) if (!s.has(o as Manifold)) o.delete(); owned.length = 0; seen.clear(); };
  /** Collect groups into SolidParts (optionally shifted so the footprint box is centred), then free every other intermediate. */
  const finish = (label: string, shift?: Vec3) => {
    const out: SolidPart[] = []; let ok = false;
    try {
      for (const [name, g] of groups) {
        let solid = union(g.solids); if (shift) solid = move(solid, shift);
        if (solid.isEmpty() || solid.status() !== 'NoError') throw Error(`Invalid ${label} ${name}`);
        out.push({ name, solid, role: g.role, color: g.color, metalness: g.metalness, roughness: g.roughness, ...(g.role === 'fastener' ? { authoredFastenerFinish: true } : {}) });
      }
      ok = true; return out;
    } finally { release(ok ? out.map(p => p.solid) : []); }
  };
  /** Run a builder body with the kit, freeing everything if it throws. */
  const run = (label: string, body: () => Vec3 | void) => { try { const shift = body(); return finish(label, shift || undefined); } catch (e) { release(); throw e; } };
  return { M, C, k, move, turn, union, cut, meet, hull, box, sphere, cyl, poly, roundRect, slab, sideProfile, endProfile, revolve, text, sphereDecal, add, finish, release, run };
}
export type AccessoryKit = ReturnType<typeof accessoryKit>;
/** Darken (f < 1) or lighten (f > 1) a #rrggbb colour. */
export const shade = (hex: string, f: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)))).map(v => v.toString(16).padStart(2, '0')).join('');
/** Small deterministic PRNG for flecks and grain. */
export const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
