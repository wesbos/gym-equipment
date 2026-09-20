/** Shared Manifold helpers for the room decor family (#201): the leftovers/wall-storage Kit, self-lit finishes, a plain
 * block-capital stroke font for banner and header lettering, and small shapes (rings, arcs) the decor builders share.
 * Materials are module-level finishes so every decor part groups its solids into a handful of meshes. */
import type { CrossSection } from 'manifold-3d';
import type { ManifoldAPI, SolidPart, Vec2 } from '../types.ts';
import { kit as baseKit, finish, type Finish, type Kit } from './leftovers-kit.ts';
export { finish, alongX, alongZ, beam, torus, type Finish, type Kit } from './leftovers-kit.ts';

const glowing = new Map<string, number>();
/** A self-lit `source` finish (light lenses, window glass): the part carries `emissive` so the scene lights it. */
export function glow(name: string, color: string, intensity: number, roughness = .3): Finish {
  glowing.set(name, intensity);
  return finish(name, 'source', color, 0, roughness);
}
/** `kit` plus the emissive flag on glowing finishes. */
export function decorKit(api: ManifoldAPI, build: (k: Kit) => void): SolidPart[] {
  const out = baseKit(api, build);
  for (const part of out) { const e = glowing.get(part.name); if (e) part.emissive = e; }
  return out;
}

// ── Shared finishes ───────────────────────────────────────────────────────────────────────────────────
export const WHITE_TRIM = finish('Painted white trim', 'source', '#eef0ee', 0, .55);
export const DRYWALL = finish('Painted drywall', 'source', '#e6e8e6', 0, .9);
export const BIRCH = finish('Birch plywood', 'source', '#d9c4a1', 0, .72);
export const BLACK_STEEL = finish('Black powder-coated steel', 'source', '#1b1c1e', .35, .6);
export const RUBBER = finish('Black rubber', 'liner', '#141516', 0, .8);
export const GLASS = glow('Window glass (daylight)', '#dfeef2', .55, .08);

// ── Stroke font ───────────────────────────────────────────────────────────────────────────────────────
type Pt = [number, number];
/** Quad around the segment a → b, `w` wide (flat ends). */
function bar(a: Pt, b: Pt, w: number): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2;
  return [[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]];
}
/** Elliptical ring sector (degrees, counter-clockwise from +x) of stroke `w`. */
function arc(c: Pt, rx: number, ry: number, a0: number, a1: number, w: number, n = 20): Pt[] {
  const outer: Pt[] = [], inner: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180, c0 = Math.cos(t), s0 = Math.sin(t);
    outer.push([c[0] + rx * c0, c[1] + ry * s0]); inner.push([c[0] + (rx - w) * c0, c[1] + (ry - w) * s0]);
  }
  return [...outer, ...inner.reverse()];
}
const W = .19;
const v = (x: number, y0 = 0, y1 = 1): Pt[] => bar([x, y0], [x, y1], W);
const h = (y: number, x0: number, x1: number): Pt[] => bar([x0, y], [x1, y], W);
/** Glyphs on a cap-height-1 em: [advance width, polygons]. Plain block capitals, not any brand's lettering. */
const GLYPHS: Record<string, [number, Pt[][]]> = {
  ' ': [.34, []],
  A: [.74, [bar([.02, -.05], [.37, 1.05], W * 1.1), bar([.72, -.05], [.37, 1.05], W * 1.1), h(.3, .17, .57)]],
  C: [.7, [arc([.37, .5], .37, .5, 38, 322, W)]],
  D: [.7, [v(.095), h(.905, .1, .32), h(.095, .1, .32), arc([.3, .5], .4, .5, -90, 90, W)]],
  E: [.58, [v(.095), h(.905, .1, .58), h(.5, .1, .52), h(.095, .1, .58)]],
  I: [.19, [v(.095)]],
  K: [.68, [v(.095), bar([.12, .38], [.7, 1.08], W * 1.05), bar([.3, .56], [.72, -.06], W * 1.1)]],
  L: [.56, [v(.095), h(.095, .1, .56)]],
  M: [.86, [v(.095), v(.765), bar([.1, 1.02], [.43, .26], W), bar([.76, 1.02], [.43, .26], W)]],
  N: [.72, [v(.095), v(.625), bar([.1, 1.03], [.62, -.03], W * 1.1)]],
  R: [.68, [v(.095), h(.905, .1, .36), h(.45, .1, .36), arc([.36, .675], .3, .325, -90, 90, W), bar([.34, .46], [.68, -.04], W * 1.1)]],
  S: [.64, [arc([.32, .735], .3, .265, 25, 270, W), arc([.32, .265], .3, .265, -155, 90, W)]],
  T: [.66, [h(.905, 0, .66), v(.33)]],
  V: [.72, [bar([.0, 1.05], [.36, -.05], W * 1.1), bar([.72, 1.05], [.36, -.05], W * 1.1)]],
  W: [1.02, [bar([.0, 1.05], [.25, -.05], W), bar([.51, .85], [.25, -.05], W), bar([.51, .85], [.77, -.05], W), bar([1.02, 1.05], [.77, -.05], W)]],
  Y: [.72, [bar([.0, 1.06], [.36, .44], W * 1.05), bar([.72, 1.06], [.36, .44], W * 1.05), v(.36, 0, .5)]],
};
export const FONT_CHARS = Object.keys(GLYPHS).join('');
/** Advance of a line in em units (cap height 1), with `track` em between letters. */
export function textWidth(text: string, track = .09) {
  return [...text].reduce((sum, c, i) => sum + glyph(c)[0] + (i ? track : 0), 0);
}
function glyph(c: string) { const g = GLYPHS[c]; if (!g) throw Error(`Decor font has no glyph for "${c}".`); return g; }
/** Lettering as a 2D section in the (x, z) face plane: cap height `cap` mm, centred on (cx, cz). */
export function lettering(k: Kit, text: string, cap: number, [cx, cz]: Vec2, track = .09): CrossSection {
  const width = textWidth(text, track), polys: Pt[][] = [];
  let x = -width / 2;
  for (const c of text) {
    const [adv, shapes] = glyph(c);
    for (const shape of shapes) polys.push(shape.map(([px, py]) => [(x + px) * cap + cx, (py - .5) * cap + cz] as Pt));
    x += adv + track;
  }
  // Each stroke is its own non-zero polygon; clip the flat stroke ends to the cap band.
  const strokes = k.k(new k.api.CrossSection(polys, 'NonZero'));
  const band = k.rect([cx - width * cap, cz - cap / 2], [cx + width * cap, cz + cap / 2]);
  return k.k(strokes.intersect(band));
}
