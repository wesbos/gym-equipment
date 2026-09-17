import { Matrix3, Vector2 } from 'three';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { SVGLoader, type StrokeStyle } from 'three/addons/loaders/SVGLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import helvetiker from './fonts/helvetiker.json';
import helvetikerRegular from './fonts/helvetikerRegular.json';
import type { CrossSection, ManifoldAPI, Vec2 } from '../types.ts';
import type { LogoSource } from './types.ts';
import { LOGO_LIMITS } from './types.ts';
import { budget } from './contours.ts';
const fonts = { helvetiker, helvetikerRegular };
export function textContours(source: Extract<LogoSource, { kind: 'text' }>): Vec2[][] {
  if (!source.text.trim() || source.text.length > 32 || /[\r\n]/.test(source.text)) throw Error('Enter 1–32 characters on one line.');
  const data = fonts[source.font];
  if (!data || [...source.text].some(c => !Object.hasOwn(data.glyphs, c))) throw Error('This bundled font does not include a character. Use Latin letters, digits or basic punctuation.');
  const font = new FontLoader().parse(data), loops: Vec2[][] = [];
  let cursor = 0;
  for (const ch of source.text) {
    const shapes = font.generateShapes(ch, 100);
    loops.push(...shapes.flatMap(s => [s, ...s.holes].map(p => p.getPoints(8).map(v => [v.x + cursor, v.y] as Vec2))));
    cursor += (data.glyphs[ch as keyof typeof data.glyphs].ha + 100) * 100 / data.resolution;
  }
  budget(loops); return loops;
}
const tags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'title', 'desc']);
const attrs = new Set(['xmlns', 'version', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'transform', 'fill', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'stroke-miterlimit', 'opacity', 'fill-opacity', 'stroke-opacity', 'id', 'style']);
/** Inert XML only: no browser DOM, CSS, URL references, entities or resource loaders. */
export function safeSvg(data: string): string {
  if (data.length > LOGO_LIMITS.source || /<!|<\?|url\s*\(|(?:href|onload|onclick)\s*=/i.test(data)) throw Error('SVG contains unsupported declarations or active/external content. Export plain SVG paths without references.');
  if ((data.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).length > 12000) throw Error('SVG exceeds the coordinate budget. Simplify paths first.');
  const doc = new DOMParser({ onError: () => { throw Error('Malformed SVG XML.'); } }).parseFromString(data, 'image/svg+xml');
  if (doc.documentElement?.tagName !== 'svg') throw Error('Expected an SVG document.');
  let count = 0;
  const visit = (node: NonNullable<typeof doc.documentElement>, depth: number) => {
    if (++count > 256 || depth > 16) throw Error('SVG exceeds the element/depth budget. Flatten groups first.');
    if (!tags.has(node.tagName)) throw Error(`Unsupported SVG <${node.tagName}>. Convert text, clipping, masks and references to plain paths first.`);
    for (let i = 0; i < node.attributes.length; i++) {
      const a = node.attributes.item(i)!;
      if (!attrs.has(a.name)) throw Error(`Unsupported SVG attribute ${a.name}. Export plain filled or stroked paths.`);
    }
    const style = node.getAttribute('style');
    if (style) {
      node.removeAttribute('style');
      for (const declaration of style.split(';').filter(s => s.trim())) {
        const [name, value, extra] = declaration.split(':').map(s => s.trim());
        if (extra || !['fill', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'stroke-miterlimit', 'opacity', 'fill-opacity', 'stroke-opacity'].includes(name)) throw Error('Unsupported SVG style. Expand CSS to presentation attributes.');
        node.setAttribute(name, value);
      }
    }
    if (node.hasAttribute('fill-rule') && !['nonzero', 'evenodd'].includes(node.getAttribute('fill-rule')!)) throw Error('Unsupported SVG fill rule.');
    for (let i = 0; i < node.childNodes.length; i++) { const child = node.childNodes.item(i)!; if (child.nodeType === 1) visit(child as typeof node, depth + 1); }
  };
  visit(doc.documentElement!, 0);
  return new XMLSerializer().serializeToString(doc);
}
export function svgContours(api: ManifoldAPI, data: string): Vec2[][] {
  const clean = safeSvg(data);
  // SVGLoader only needs an inert XML tree. Never attach uploaded nodes to document.
  const previous = globalThis.DOMParser;
  class InertParser extends DOMParser {
    override parseFromString(text: string, mime: 'image/svg+xml') {
      const doc = super.parseFromString(text, mime);
      // Gradients were rejected by safeSvg. SVGLoader probes this selector only.
      Object.assign(doc, { querySelectorAll: () => [] });
      return doc;
    }
  }
  globalThis.DOMParser = InertParser as unknown as typeof globalThis.DOMParser;
  const owned: CrossSection[] = [], keep = (s: CrossSection) => (owned.push(s), s);
  try {
    const paths = new SVGLoader().parse(clean).paths;
    for (const p of paths) {
      const style = p.userData!.style as StrokeStyle & { opacity?: number; fill?: string; fillOpacity?: number; fillRule?: string; stroke?: string; strokeOpacity?: number };
      if (style.opacity === 0) continue;
      const loops = p.subPaths.map(s => s.getPoints(8).map(v => [v.x, -v.y] as Vec2));
      if (loops.flat().length > LOGO_LIMITS.points) throw Error('SVG exceeds the flattened point budget. Simplify curves.');
      if (style.fill !== 'none' && style.fillOpacity !== 0) {
        // SVG fills implicitly close open subpaths (including polygon/polyline).
        keep(new api.CrossSection(loops.filter(l => l.length >= 3), style.fillRule === 'evenodd' ? 'EvenOdd' : 'NonZero'));
      }
      if (style.stroke && style.stroke !== 'none' && style.strokeOpacity !== 0 && style.strokeWidth > 0) {
        for (const path of p.subPaths) {
          const transform = p.userData!.transform as Matrix3, inverse = transform.clone().invert();
          const e = transform.elements, scale = Math.sqrt(Math.abs(e[0]*e[4]-e[1]*e[3]));
          if (!Number.isFinite(scale) || scale < 1e-8 || Math.abs(transform.determinant()) < 1e-10) throw Error('SVG has a degenerate transform.');
          // Stroke in source coordinates, then transform the outline (including skew/nonuniform scale).
          const geometry = SVGLoader.pointsToStroke(path.getPoints(8).map(v => v.applyMatrix3(inverse)), { ...style, strokeWidth: style.strokeWidth / scale }, 8);
          if (!geometry) continue;
          try {
            const vertices = geometry.getAttribute('position'), triangles: Vec2[][] = [];
            if (vertices.count > 18000) throw Error('SVG stroke is too complex. Simplify it first.');
            for (let i = 0; i < vertices.count; i += 3) triangles.push([0, 1, 2].map(j => { const v = new Vector2(vertices.getX(i + j), vertices.getY(i + j)).applyMatrix3(transform); return [v.x, -v.y]; }));
            keep(new api.CrossSection(triangles, 'NonZero'));
          } finally { geometry.dispose(); }
        }
      }
    }
    if (!owned.length) throw Error('SVG contains no visible filled or stroked paths.');
    const union = api.CrossSection.union(owned); owned.push(union);
    const loops = union.toPolygons(); budget(loops); return loops;
  } finally { globalThis.DOMParser = previous; owned.reverse().forEach(s => s.delete()); }
}
/** Boundary-edge tracing of a thresholded bitmap, followed by collinear simplification. */
export function traceBitmap(pixels: Uint8ClampedArray, width: number, height: number, threshold: number, contrast: number): Vec2[][] {
  if (width < 1 || height < 1 || width > 256 || height > 256 || pixels.length !== width * height * 4) throw Error('Raster trace dimensions exceed 256 × 256.');
  const ink = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const i = (y * width + x) * 4, alpha = pixels[i + 3] / 255;
    const gray = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) * alpha + 255 * (1 - alpha);
    return (gray - 128) * contrast + 128 < threshold;
  };
  const edges = new Map<string, Vec2[]>();
  const edge = (x: number, y: number, a: number, b: number) => { const key = `${x},${y}`; if (edges.has(key)) throw Error('Raster has diagonally touching pixels. Adjust threshold or separate the shapes.'); edges.set(key, [[x, y], [a, b]]); };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (ink(x, y)) {
    if (!ink(x, y - 1)) edge(x, y, x + 1, y);
    if (!ink(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    if (!ink(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
    if (!ink(x - 1, y)) edge(x, y + 1, x, y);
  }
  if (edges.size > 20000) throw Error('Raster has too much detail/noise. Increase contrast or simplify the image.');
  const loops: Vec2[][] = [];
  while (edges.size) {
    const first = edges.values().next().value!, start = first[0], loop: Vec2[] = []; let p = start;
    do {
      const key = `${p[0]},${p[1]}`, next = edges.get(key);
      if (!next) throw Error('Raster contour is open. Adjust threshold.');
      edges.delete(key); loop.push([p[0], -p[1]]); p = next[1];
    } while (p[0] !== start[0] || p[1] !== start[1]);
    loops.push(loop.filter((p, i) => { const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length]; return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]); }));
  }
  budget(loops); return loops;
}
