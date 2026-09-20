/** Shared toolkit for the cardio family (bikes, treadmills, curved runners, climbers, rower, elliptical).
 * Builds on the ergs kit (tracked intermediates, material groups, centring `done`) and adds typeset wordmarks,
 * glossy screens and a side-profile ("s" from the machine front, "h" up) coordinate helper.
 * Build axes: X across the machine, Y along it with the machine FRONT (console / handlebar end) at -Y, Z up, millimetres. */
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import type { Mat4 } from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec2, Vec3 } from '../types.ts';
import { createKit, type Finish, type Kit } from './ergs-kit.ts';
export type { Finish } from './ergs-kit.ts';
export { arc, inch } from './ergs-kit.ts';

let font: Font | undefined;
/** Bundled Helvetiker Bold: brand names are typeset, never copied logo artwork. */
const typeface = () => font ??= new FontLoader().parse(helvetiker as never);

const fin = (role: Finish['role'], color: string, metalness = 0, roughness = .55): Finish => ({ role, color, metalness, roughness });
/** Factory finishes shared across the family ('source' = fixed colour, never recoloured by rack paint). */
export const F = {
  screen: fin('source', '#07080a', .35, .06),
  bezel: fin('source', '#121315', .15, .38),
  plastic: fin('source', '#1b1c1e', 0, .62),
  plasticGrey: fin('source', '#3b3d40', 0, .58),
  rubber: fin('liner', '#141516', 0, .9),
  belt: fin('liner', '#1a1b1c', 0, .95),
  foam: fin('handle', '#1d1e1f', 0, .88),
  chrome: fin('source', '#d8dcdf', 1, .14),
  steel: fin('fastener', '#8d9195', .85, .3),
  red: fin('source', '#c8102e', .05, .45),
  lens: fin('source', '#9fb3bf', .1, .08),
  white: fin('source', '#ecebe6', 0, .5),
} as const;
export const finish = fin;

export function createCardioKit(api: ManifoldAPI, length: number) {
  const K = createKit(api);
  /** Side-profile point: s mm back from the machine front, h mm up, at x across. */
  const P = (s: number, h: number, x = 0): Vec3 => [x, s - length / 2, h];
  /** Local 2D outline (X right, Y up), centred, cap height `h`. */
  const text = (str: string, h: number, tracking = .08): CrossSection | undefined => {
    if (!str.trim()) return undefined;
    const f = typeface(), loops: Vec2[][] = [], scale = h / 720;
    let cursor = 0;
    for (const ch of str) {
      const glyph = (f.data.glyphs as Record<string, { ha: number }>)[ch];
      if (!glyph) { cursor += 500; continue; }
      for (const shape of f.generateShapes(ch, 1000)) for (const path of [shape, ...shape.holes]) loops.push(path.getPoints(3).map(p => [(p.x + cursor) * scale, p.y * scale] as Vec2));
      cursor += glyph.ha + 1000 * tracking;
    }
    const cs = K.k(new K.C(loops, 'EvenOdd')), b = cs.bounds();
    return K.k(cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]));
  };
  /** Place a Z-extruded flat solid with its local X along u, local Y along v (thickness along u×v), origin at `at`. */
  const place = (s: Manifold, at: Vec3, u: Vec3, v: Vec3) => {
    const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return K.k(s.transform([...u, 0, ...v, 0, ...n, 0, ...at, 1] as Mat4));
  };
  /** Typeset wordmark `h` tall standing `depth` proud of a surface: centred at `at`, reading along u, up along v. */
  const word = (str: string, h: number, at: Vec3, u: Vec3, v: Vec3, depth = 1.2, maxW = Infinity) => {
    let t = text(str, h); if (!t) return undefined;
    const b = t.bounds(), w = b.max[0] - b.min[0];
    if (w > maxW) t = K.k(t.scale([maxW / w, maxW / w]));
    return place(K.k(t.extrude(depth)), at, u, v);
  };
  /** Screen / display: bezel slab w × h × t with a glossy glass inset on its viewing face.
   * Centre `at`, the glass faces `face` (a unit vector in the YZ plane), tilted so its top edge follows `up`. */
  const screen = (w: number, h: number, t: number, at: Vec3, face: Vec3, up: Vec3, glass: [number, number], bezel: Finish = F.bezel, offset = 0) => {
    const right: Vec3 = [up[1] * face[2] - up[2] * face[1], up[2] * face[0] - up[0] * face[2], up[0] * face[1] - up[1] * face[0]];
    const slab = place(K.move(K.k(K.M.cube([w, h, t], true)), [0, 0, -t / 2]), at, right, up);
    const g = place(K.k(K.M.cube([glass[0], glass[1], 1.2], true)), [at[0] + face[0] * .5 + up[0] * offset, at[1] + face[1] * .5 + up[1] * offset, at[2] + face[2] * .5 + up[2] * offset], right, up);
    K.add('Display bezel', bezel, slab);
    K.add('Glossy display glass', F.screen, g);
    return { right };
  };
  /** Trim a solid to z >= 0 (diagonal members whose section would dip under the floor). */
  const aboveFloor = (s: Manifold) => K.inter(s, K.span([-5000, -5000, 0], [5000, 5000, 6000]));
  return { ...K, P, L: length, text, place, word, screen, aboveFloor };
}
export type CardioKit = ReturnType<typeof createCardioKit> & Kit;
/** Builder wrapper: every intermediate is freed, even when a build throws; the build is centred on its footprint. */
export function withCardioKit(api: ManifoldAPI, label: string, length: number, body: (K: CardioKit) => void): SolidPart[] {
  const K = createCardioKit(api, length) as CardioKit;
  let success = false;
  try { body(K); const parts = K.done(label); success = true; return parts; }
  finally { K.dispose(success); }
}
/** Unit direction in the YZ side plane from an angle in degrees measured from +h (up) toward the machine rear (+s). */
export const lean = (deg: number): Vec3 => [0, Math.sin(deg * Math.PI / 180), Math.cos(deg * Math.PI / 180)];
