import type { CrossSection, ManifoldAPI, Vec2 } from '../types.ts';
import { LOGO_LIMITS, type LogoSource, type ValidatedLogo, validateLogo } from './types.ts';
const area = (l: Vec2[]) => l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
export function budget(loops: Vec2[][]) {
  if (!loops.length || loops.length > LOGO_LIMITS.loops || loops.reduce((n, l) => n + l.length, 0) > LOGO_LIMITS.points) throw Error('Logo is empty or too complex. Use fewer than 128 contours and 6,000 points; simplify the artwork or increase raster threshold.');
  if (loops.some(l => l.length < 3 || l.some(p => !p.every(Number.isFinite) || p.some(n => Math.abs(n) > 1e7)))) throw Error('Logo has invalid or degenerate coordinates.');
}
/** Morphological checks bound both cut features and remaining steel; topology check catches floating islands. */
export function checkCut(api: ManifoldAPI, loops: Vec2[][]) {
  budget(loops);
  for (const original of loops) {
    const loop = original[0][0] === original.at(-1)![0] && original[0][1] === original.at(-1)![1] ? original.slice(0, -1) : original;
    const cross = (a: Vec2, b: Vec2, c: Vec2) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    for (let i=0;i<loop.length;i++) for(let j=i+2;j<loop.length;j++) {
      if(i===0 && j===loop.length-1)continue;
      const a=loop[i],b=loop[(i+1)%loop.length],c=loop[j],d=loop[(j+1)%loop.length];
      if(cross(a,b,c)*cross(a,b,d)<-1e-12 && cross(c,d,a)*cross(c,d,b)<-1e-12) throw Error('Self-intersecting validated contour. Reimport and simplify the artwork.');
    }
  }
  const owned: CrossSection[] = [], keep = (s: CrossSection) => (owned.push(s), s);
  try {
    const cut = keep(new api.CrossSection(loops, 'EvenOdd'));
    if (cut.isEmpty()) throw Error('Logo has no filled contours.');
    const components = cut.decompose(); owned.push(...components);
    const expanded = components.map(c => keep(c.offset(LOGO_LIMITS.minimum / 2 - .001, 'Round', 2, 16)));
    for (let i = 0; i < components.length; i++) {
      if (keep(components[i].offset(-LOGO_LIMITS.minimum / 2, 'Round', 2, 16)).isEmpty()) throw Error('A cut feature is below the 0.8 mm minimum. Enlarge or remove tiny details.');
      for (let j = i + 1; j < components.length; j++) if (keep(expanded[i].intersect(expanded[j])).area() > .00001) throw Error('A steel gap is below the 0.8 mm minimum. Increase spacing between shapes.');
    }
    const plate = keep(api.CrossSection.square([184, 28], true)), steel = keep(plate.subtract(cut));
    const pieces = steel.decompose(); owned.push(...pieces);
    if (pieces.length !== 1) throw Error('Logo leaves floating islands. Enable bridges or open the enclosed contours in your artwork.');
    for (const [s, name] of [[cut, 'cut feature'], [steel, 'steel gap']] as const) {
      const inset = keep(s.offset(-LOGO_LIMITS.minimum / 2, 'Round', 2, 16));
      const opened = keep(inset.offset(LOGO_LIMITS.minimum / 2 + .035, 'Round', 2, 16));
      const lost = keep(s.subtract(opened));
      // A small corner allowance accommodates polygonal curve flattening; narrow runs are rejected.
      const slivers = lost.decompose(); owned.push(...slivers);
      if (inset.isEmpty() || slivers.some(piece => piece.area() > .4)) throw Error(`Logo has a ${name} below the 0.8 mm structural minimum. Use bolder, shorter text or simplify/widen the artwork.`);
    }
  } finally { owned.reverse().forEach(s => s.delete()); }
}
export function finalizeLogo(api: ManifoldAPI, source: LogoSource, raw: Vec2[][], autoBridge: boolean): ValidatedLogo {
  budget(raw);
  const points = raw.flat(), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(180 / (maxX - minX), 24 / (maxY - minY));
  if (!Number.isFinite(scale) || scale <= 0) throw Error('Logo must have positive width and height.');
  const normalized = raw.map(l => l.map(([x, y]): Vec2 => [(x - (minX + maxX) / 2) * scale, (y - (minY + maxY) / 2) * scale]));
  const owned: CrossSection[] = [], keep = (s: CrossSection) => (owned.push(s), s);
  try {
    let cut = keep(new api.CrossSection(normalized, 'EvenOdd'));
    if (source.kind === 'text') {
      const original = cut;
      // Remove needle-like glyph tips/notches at the structural radius before adding bridges.
      cut = keep(keep(cut.offset(.42, 'Round', 2, 24)).offset(-.42, 'Round', 2, 24));
      cut = keep(keep(cut.offset(-.42, 'Round', 2, 24)).offset(.42, 'Round', 2, 24));
      const glyphPieces = original.decompose(); owned.push(...glyphPieces);
      for (const piece of glyphPieces) if (keep(piece.intersect(cut)).area() < piece.area() * .9) throw Error('Text is too fine at this size. Use fewer characters or the bold font.');
    }
    const beforeBridges = cut;
    let bridges = 0;
    // Generalizes bos-lettering.py: a full-height steel strip through each counter.
    for (const hole of cut.toPolygons().filter(l => area(l) < 0)) {
      if (!autoBridge) throw Error('Enclosed counters need bridges. Enable automatic bridges or supply stencil artwork.');
      const x = (Math.min(...hole.map(p => p[0])) + Math.max(...hole.map(p => p[0]))) / 2;
      const strip = keep(keep(api.CrossSection.square([1.2, 28], true)).translate([x, 0]));
      cut = keep(cut.subtract(strip)); bridges++;
    }
    const bridgedPieces = beforeBridges.decompose(); owned.push(...bridgedPieces);
    for (const piece of bridgedPieces) if (keep(piece.intersect(cut)).isEmpty()) throw Error('A bridge would erase a small detail. Enlarge or remove that detail and preview again.');
    cut = keep(cut.simplify(.03));
    const loops = cut.toPolygons().map(l => [...l, [...l[0]] as Vec2]);
    budget(loops); checkCut(api, loops);
    return validateLogo({ version: 1, source, loops, minimum: .8, bridges, warnings: [...(source.kind === 'text' ? ['Glyph tips and notches rounded to the 0.8 mm structural minimum.'] : []), ...(bridges ? [`${bridges} vertical steel bridge(s) added to retain islands.`] : [])] })!;
  } finally { owned.reverse().forEach(s => s.delete()); }
}
