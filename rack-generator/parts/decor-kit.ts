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
/** Glyphs on a cap-height-1 em for stroke weight `W`: [advance width, polygons]. Plain block capitals, not any brand's
 * lettering. Heavier weights widen each letter so counters stay open. */
function glyphSet(W: number): Record<string, [number, Pt[][]]> {
  const g = (W - .19) * 1.4, e = W / 2;
  const v = (x: number, y0 = 0, y1 = 1): Pt[] => bar([x, y0], [x, y1], W);
  const h = (y: number, x0: number, x1: number): Pt[] => bar([x0, y], [x1, y], W);
  return {
    ' ': [.34, []],
    A: [.74 + g, [bar([.02, -.05], [.37 + g / 2, 1.05], W * 1.1), bar([.72 + g, -.05], [.37 + g / 2, 1.05], W * 1.1), h(.3, .17, .57 + g)]],
    C: [.7 + g, [arc([.37 + g / 2, .5], .37 + g / 2, .5, 38, 322, W)]],
    D: [.7 + g, [v(e), h(1 - e, e, .32), h(e, e, .32), arc([.3, .5], .4 + g, .5, -90, 90, W)]],
    E: [.58 + g, [v(e), h(1 - e, e, .58 + g), h(.5, e, .52 + g), h(e, e, .58 + g)]],
    I: [W, [v(e)]],
    K: [.68 + g, [v(e), bar([.12, .38], [.7 + g, 1.08], W * 1.05), bar([.3, .56], [.72 + g, -.06], W * 1.1)]],
    L: [.56 + g, [v(e), h(e, e, .56 + g)]],
    M: [.86 + 2 * g, [v(e), v(.86 + 2 * g - e), bar([e, 1.02], [.43 + g, .26], W), bar([.86 + 2 * g - e, 1.02], [.43 + g, .26], W)]],
    N: [.72 + g, [v(e), v(.72 + g - e), bar([e, 1.03], [.72 + g - e, -.03], W * 1.1)]],
    R: [.68 + g, [v(e), h(1 - e, e, .36), h(.45, e, .36), arc([.36, .675], .3 + g, .325, -90, 90, W), bar([.34, .46], [.68 + g, -.04], W * 1.1)]],
    S: [.64 + g, [arc([.32 + g / 2, .735], .3 + g / 2, .265, 25, 270, W), arc([.32 + g / 2, .265], .3 + g / 2, .265, -155, 90, W)]],
    T: [.66 + g, [h(1 - e, 0, .66 + g), v(.33 + g / 2)]],
    V: [.72 + g, [bar([.0, 1.05], [.36 + g / 2, -.05], W * 1.1), bar([.72 + g, 1.05], [.36 + g / 2, -.05], W * 1.1)]],
    W: [1.02 + 2 * g, [bar([.0, 1.05], [.25 + g / 2, -.05], W), bar([.51 + g, .85], [.25 + g / 2, -.05], W), bar([.51 + g, .85], [.77 + 1.5 * g, -.05], W), bar([1.02 + 2 * g, 1.05], [.77 + 1.5 * g, -.05], W)]],
    Y: [.72 + g, [bar([.0, 1.06], [.36 + g / 2, .44], W * 1.05), bar([.72 + g, 1.06], [.36 + g / 2, .44], W * 1.05), v(.36 + g / 2, 0, .5)]],
  };
}
const glyphCache = new Map<number, Record<string, [number, Pt[][]]>>();
const glyphs = (weight: number) => { let set = glyphCache.get(weight); if (!set) glyphCache.set(weight, set = glyphSet(weight)); return set; };
const GLYPHS = glyphs(.19);
export const FONT_CHARS = Object.keys(GLYPHS).join('');
/** Advance of a line in em units (cap height 1), with `track` em between letters. */
export function textWidth(text: string, track = .09, weight = .19) {
  return [...text].reduce((sum, c, i) => sum + glyph(c, weight)[0] + (i ? track : 0), 0);
}
function glyph(c: string, weight: number) { const g = glyphs(weight)[c]; if (!g) throw Error(`Decor font has no glyph for "${c}".`); return g; }
/** Lettering as a 2D section in the (x, z) face plane: cap height `cap` mm, centred on (cx, cz). */
export function lettering(k: Kit, text: string, cap: number, [cx, cz]: Vec2, track = .09, weight = .19): CrossSection {
  const width = textWidth(text, track, weight), polys: Pt[][] = [];
  let x = -width / 2;
  for (const c of text) {
    const [adv, shapes] = glyph(c, weight);
    for (const shape of shapes) polys.push(shape.map(([px, py]) => [(x + px) * cap + cx, (py - .5) * cap + cz] as Pt));
    x += adv + track;
  }
  // Each stroke is its own non-zero polygon; clip the flat stroke ends to the cap band.
  const strokes = k.k(new k.api.CrossSection(polys, 'NonZero'));
  const band = k.rect([cx - width * cap, cz - cap / 2], [cx + width * cap, cz + cap / 2]);
  return k.k(strokes.intersect(band));
}
