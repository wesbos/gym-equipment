import type { CrossSection, Manifold, Mat4, Vec2 } from 'manifold-3d';
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import helvetiker from '../logos/fonts/helvetiker.json';
import type { ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
import { PLATE_BORE, PLATE_GAP, PLATE_SPECS, plateParts, plateSpec, type LegacyPlateId, type PlateId, type PlateSpec } from '../plates.ts';
import type { PlateFace, PlateLine, PlateMarking, PlateWeight } from '../plates-lines.ts';
/** Reusable Olympic plate stack. Plates stack from `origin` outward along `axis`
 * (storage peg root, or a barbell sleeve collar), each centred on the axis line.
 * Profiles are (radius, axial) and revolved; the solid's local +Z becomes `axis`.
 * Roles are 'source' so frame/hardware finishes never recolor factory colours.
 * The eight default plate ids keep their original geometry exactly; brand lines (#129) add
 * face recipes, hub inserts, grips, markings and fleck patterns (see plates-lines.ts).
 */
export interface PlateStackPlacement {
  origin: Vec3; axis: Vec3; /** Solid name prefix. */ name?: string; segments?: number;
  /** 'simple' skips markings and fleck patterns (plate trees, large racks of plates). Default 'full'. */
  detail?: 'full' | 'simple';
  /** 'out' (default) puts each plate's branded front face toward +axis; 'in' flips every plate. */
  facing?: 'out' | 'in';
  /** Rotation of the markings about the axis, radians: one angle for all plates or one per plate index. */
  clock?: number | ((index: number) => number);
  /** Clearance between neighbouring plates (default PLATE_GAP, which the capacity checks assume). */
  gap?: number;
}
const HUB = 45;
function bumperProfiles(spec: PlateSpec): { rubber: Vec2[]; hub: Vec2[] } {
  const R = spec.diameter / 2, w = spec.width, c = 3, d = Math.min(2, w * .04), b = PLATE_BORE / 2;
  return {
    // Chamfered tread with shallow recessed faces between hub collar and lip.
    rubber: [[HUB, 0], [70, 0], [74, d], [R - 26, d], [R - 22, 0], [R - c, 0], [R, c], [R, w - c], [R - c, w], [R - 22, w], [R - 26, w - d], [74, w - d], [70, w], [HUB, w]],
    hub: [[b + 1, 0], [HUB, 0], [HUB, w], [b + 1, w], [b, w - 1], [b, 1]],
  };
}
function ironProfile(spec: PlateSpec): Vec2[] {
  // Flat back, raised rim and hub boss on the face, thinner web between.
  const R = spec.diameter / 2, w = spec.width, b = PLATE_BORE / 2, web = w * .45, rim = Math.min(24, R * .12);
  return [[b, 1], [b + 1, 0], [R - 2, 0], [R, 2], [R, w - 3], [R - 3, w], [R - rim, w], [R - rim - 6, web], [HUB + 16, web], [HUB + 10, w], [b + 1, w], [b, w - 1]];
}
/** Column-major rigid transform taking local +Z to `axis`, translated to `at`. */
function frame(axis: Vec3, at: Vec3): Mat4 {
  const length = Math.hypot(...axis);
  if (!(length > 0)) throw Error('Plate stack axis must be non-zero.');
  const a = axis.map(v => v / length) as Vec3, seed: Vec3 = Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
  const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  let u = cross(seed, a); const n = Math.hypot(...u); u = u.map(v => v / n) as Vec3;
  const v = cross(a, u);
  return [...u, 0, ...v, 0, ...a, 0, ...at, 1];
}
// ------------------------------------------------------------------ materials
type Look = { color: string; metalness: number; roughness: number };
const LOOK: Record<PlateLine['material'], Omit<Look, 'color'>> = {
  rubber: { metalness: 0, roughness: .82 }, urethane: { metalness: .05, roughness: .5 }, cast: { metalness: .55, roughness: .62 },
  hammertone: { metalness: .62, roughness: .5 }, painted: { metalness: .3, roughness: .42 }, chrome: { metalness: 1, roughness: .12 }, steel: { metalness: .85, roughness: .35 },
};
const CHROME: Look = { color: '#dfe3e6', metalness: 1, roughness: .12 };
/** Brushed/satin chrome for large flat discs, which read black as mirror chrome without an environment map. */
const SATIN: Look = { color: '#d3d7da', metalness: .8, roughness: .3 };
const STAINLESS: Look = { color: '#c9ccce', metalness: .9, roughness: .3 };
const RAW: Look = { color: '#8d9093', metalness: .85, roughness: .38 };
const INK = { metalness: 0, roughness: .55 };
// ------------------------------------------------------------------ text (bundled Helvetiker Bold; typeset names, never logo artwork)
let font: Font | undefined;
const typeface = () => font ??= new FontLoader().parse(helvetiker as never);
type Glyph = { loops: Vec2[][]; advance: number };
const GLYPHS = new Map<string, Glyph>();
/** Glyph outlines normalised to a cap height of 1 (baseline y = 0). */
function glyph(ch: string): Glyph {
  const hit = GLYPHS.get(ch);
  if (hit) return hit;
  const f = typeface(), data = helvetiker as unknown as { resolution: number; glyphs: Record<string, { ha: number }> };
  const cap = 72.6, size = 100, s = 1 / cap;
  const shapes = Object.hasOwn(data.glyphs, ch) ? f.generateShapes(ch, size) : [];
  const loops: Vec2[][] = [];
  for (const shape of shapes) for (const path of [shape, ...shape.holes]) {
    const pts = path.getPoints(3).map(p => [p.x * s, p.y * s] as Vec2);
    if (pts.length > 2 && Math.hypot(pts[0][0] - pts.at(-1)![0], pts[0][1] - pts.at(-1)![1]) < 1e-6) pts.pop();
    if (pts.length > 2) loops.push(pts);
  }
  const g = { loops, advance: ((data.glyphs[ch]?.ha ?? 60) * size / data.resolution) * s };
  GLYPHS.set(ch, g);
  return g;
}
const TRACK = .08;
const lineWidth = (text: string) => [...text].reduce((w, ch, i) => w + glyph(ch).advance + (i ? TRACK : 0), 0);
/** 2D loops for a marking, in plate-face coordinates (x right, y up, looking at the face). */
function markingLoops(m: PlateMarking, text: string, R: number): Vec2[][] {
  const h = m.h * R, sx = m.sx ?? 1, loops: Vec2[][] = [], rot = (m.rot ?? 0) * Math.PI / 180, at = m.at * Math.PI / 180;
  if (m.arc) {
    // Glyphs follow the circle at radius r (their vertical centre): 'out' puts letter tops outward, reading clockwise.
    const rc = m.r * R, total = lineWidth(text) * h * sx, dir = m.arc === 'out' ? -1 : 1;
    let x = 0;
    for (const ch of text) {
      const g = glyph(ch), mid = (x + g.advance / 2) * h * sx - total / 2, theta = at + dir * mid / rc;
      const up = m.arc === 'out' ? theta : theta + Math.PI, c = Math.cos(up - Math.PI / 2), s = Math.sin(up - Math.PI / 2);
      const cx = Math.cos(theta) * rc, cy = Math.sin(theta) * rc;
      for (const loop of g.loops) loops.push(loop.map(([px, py]) => {
        const lx = (px - g.advance / 2) * h * sx, ly = (py - .5) * h;
        return [cx + lx * c - ly * s, cy + lx * s + ly * c] as Vec2;
      }));
      x += g.advance + TRACK;
    }
    return loops;
  }
  const lines = text.split('\n'), gap = m.spacing ?? .3, height = lines.length + (lines.length - 1) * gap;
  const cx = Math.cos(at) * m.r * R, cy = Math.sin(at) * m.r * R, c = Math.cos(rot), s = Math.sin(rot);
  lines.forEach((line, row) => {
    const lw = lineWidth(line), base = height / 2 - 1 - row * (1 + gap);
    let x = -lw / 2;
    for (const ch of line) {
      const g = glyph(ch);
      for (const loop of g.loops) loops.push(loop.map(([px, py]) => {
        const lx = (x + px) * h * sx, ly = (base + py) * h;
        return [cx + lx * c - ly * s, cy + lx * s + ly * c] as Vec2;
      }));
      x += g.advance + TRACK;
    }
  });
  return loops;
}
const fmt = (v: number) => String(Math.round(v * 1000) / 1000);
function markingText(m: PlateMarking, line: PlateLine, w: PlateWeight) {
  const kg = w.weight * .45359237, lb = w.weight / .45359237;
  return m.text.replaceAll('{k2}', kg.toFixed(2)).replaceAll('{w}', fmt(w.weight)).replaceAll('{k}', kg < 5 ? kg.toFixed(2) : kg.toFixed(1)).replaceAll('{l}', lb.toFixed(1));
}
// ------------------------------------------------------------------ deterministic patterns
function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917)) >>> 0) / 4294967296; }
function patternLoops(kind: 'fleck' | 'speck' | 'marble', density: number, r0: number, r1: number, seed: number): Vec2[][] {
  const next = rng(seed), area = Math.PI * (r1 * r1 - r0 * r0), loops: Vec2[][] = [];
  const blob = kind === 'fleck' ? 420 : kind === 'speck' ? 9 : 260;
  const count = Math.min(kind === 'speck' ? 90 : kind === 'fleck' ? 80 : 30, Math.round(area * density / blob));
  for (let i = 0; i < count; i++) {
    const rr = Math.sqrt(r0 * r0 + next() * (r1 * r1 - r0 * r0)), th = next() * Math.PI * 2, cx = Math.cos(th) * rr, cy = Math.sin(th) * rr;
    const pts: Vec2[] = [];
    if (kind === 'marble') {
      // Curved streak along the tangent, a few mm wide.
      const len = 60 + next() * 110, wid = 4 + next() * 9, bend = (next() - .5) * .9, n = 5, tx = -Math.sin(th), ty = Math.cos(th);
      const spine = Array.from({ length: n }, (_, k) => { const t = k / (n - 1) - .5, off = bend * len * t * t; return [cx + tx * t * len + Math.cos(th) * off, cy + ty * t * len + Math.sin(th) * off] as Vec2; });
      const side = (k: number, sgn: number) => { const t = k / (n - 1), taper = Math.sin(Math.PI * t) * wid / 2 + .3; return [spine[k][0] + Math.cos(th) * taper * sgn, spine[k][1] + Math.sin(th) * taper * sgn] as Vec2; };
      for (let k = 0; k < n; k++) pts.push(side(k, 1));
      for (let k = n - 1; k >= 0; k--) pts.push(side(k, -1));
    } else {
      const size = kind === 'fleck' ? 8 + next() * 16 : 1.4 + next() * 2.4, n = kind === 'fleck' ? 7 : 4, a0 = next() * 6.28;
      for (let k = 0; k < n; k++) { const a = a0 + k * Math.PI * 2 / n, rad = size * (.55 + next() * .45); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
    }
    // Counter-clockwise so overlapping blobs merge under the NonZero fill rule.
    const area2 = pts.reduce((a, p, j) => { const q = pts[(j + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
    loops.push(area2 < 0 ? pts.reverse() : pts);
  }
  return loops;
}
// ------------------------------------------------------------------ line plates
type LocalPart = { suffix: string; solid: Manifold; look: Look };
type Step = [r: number, depth: number];
/** Depth of a face profile (step list) at radius r. */
const depthAt = (steps: Step[], r: number) => steps.reduce((d, [sr, sd]) => r >= sr ? sd : d, steps[0]?.[1] ?? 0);
/** Revolve outline for a body ring from r0 to R, width w, with stepped front/back faces and a chamfered rim. */
function bodyOutline(r0: number, R: number, w: number, front: Step[], back: Step[], edge: number): Vec2[] {
  const e = Math.max(.2, Math.min(edge, w / 3, (R - r0) / 4)), slope = 1.2;
  const face = (steps: Step[]) => {
    const pts: Vec2[] = [[r0, steps[0][1]]];
    for (let i = 1; i < steps.length; i++) {
      const [r, d] = steps[i], prev = steps[i - 1][1];
      if (r <= r0 + slope || r >= R - e - slope) continue;
      pts.push([r - slope / 2, prev], [r + slope / 2, d]);
    }
    pts.push([R - e, depthAt(steps, R - e)]);
    return pts;
  };
  const b = face(back), f = face(front);
  const rimB = b.at(-1)![1], rimF = f.at(-1)![1];
  return [...b, [R, rimB + e], [R, w - rimF - e], ...f.reverse().map(([r, d]) => [r, w - d] as Vec2)];
}
function buildLinePlate(api: ManifoldAPI, id: PlateId, segments: number, simple: boolean): LocalPart[] {
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [], out: LocalPart[] = [];
  const k = <T extends Manifold | CrossSection>(x: T): T => (owned.push(x), x);
  const parts = plateParts(id)!, spec = plateSpec(id)!, { line, weight: w, finish } = parts, face: PlateFace = line.face;
  const R = w.diameter / 2, W = w.width, D = w.diameter, b = PLATE_BORE / 2 + .1;
  const body: Look = w.metal === 'chrome' ? CHROME : finish?.metal === 'raw' ? RAW : { color: spec.color, ...LOOK[line.material] };
  const inkDefault = spec.ink ?? '#f4f5f2';
  const revolve = (outline: Vec2[]) => k(k(new C([outline], 'EvenOdd')).revolve(segments));
  const ring = (r0: number, r1: number, z0: number, z1: number) => revolve([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
  const prism = (loops: Vec2[][], z0: number, z1: number) => k(k(k(new C(loops, 'EvenOdd')).extrude(z1 - z0)).translate([0, 0, z0]));
  const polar = (r: number, a: number): Vec2 => [Math.cos(a) * r, Math.sin(a) * r];
  const union = (s: Manifold[]) => s.length === 1 ? s[0] : k(M.union(s));
  const bar = (a: number, width: number, p0: number, p1: number): Vec2[] => {
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy * width / 2, ny = ux * width / 2;
    return [[ux * p0 + nx, uy * p0 + ny], [ux * p0 - nx, uy * p0 - ny], [ux * p1 - nx, uy * p1 - ny], [ux * p1 + nx, uy * p1 + ny]];
  };
  const plain = D <= (face.plainBelow ?? 0);
  try {
    let insertR = Math.min((face.insert ?? 0) / 2, b + .35 * (R - b));
    const r0 = insertR > b ? insertR : b, lip = (face.lip ?? 0) * R, ld = face.lip ? face.lipDepth ?? 1 : 0;
    let front: Step[] = [[r0, 0]], back: Step[] = [[r0, 0]], edge = face.edge ?? 2, outerR = R;
    /** Unioned into the body; through-cuts remove material everywhere; face cuts are marking/pattern recesses. */
    const extra: Manifold[] = [], through: Manifold[] = [], faceCuts: Manifold[] = [];
    const inks: { solid: Manifold; color: string }[] = [], accents: Manifold[] = [], reliefs: Manifold[] = [];
    switch (face.kind) {
      case 'bumper': case 'change': {
        const inner = (face.inner ?? .45) * R, id = face.innerDepth ?? 1.5;
        front = [[r0, ld + id], [inner, ld], ...(lip ? [[R - lip, 0] as Step] : [])];
        back = front;
        break;
      }
      case 'competition': {
        const disc = (face.disc ?? .5) * R, dd = Math.min(face.discDepth ?? 4, W / 4);
        front = [[r0, dd], [disc, ld], ...(lip ? [[R - lip, 0] as Step] : [])]; back = [[r0, 1.2 + ld], [R * .42, ld], ...(lip ? [[R - lip, 0] as Step] : [])];
        out.push({ suffix: ' steel disc', solid: ring(r0 - .01, disc, W - dd, W), look: SATIN });
        break;
      }
      case 'iron': {
        const dish = Math.min(face.dish ?? .5, .7) * W, rim = Math.max(lip, 3), boss = Math.max(r0 + 2, Math.min((face.boss ?? 90) / 2, b + .3 * (R - b), R - rim - 6));
        const bk = (face.back ?? 0) * W;
        front = plain ? [[r0, 0], [boss, dish * .5], [R - rim, 0]] : [[r0, 0], [boss, dish], [R - rim, 0]];
        if (bk) back = [[r0, 0], [boss, bk], [R - rim, 0]];
        const sp = face.spokes;
        if (sp && !plain && D >= (sp.minD ?? 0)) {
          const bars = Array.from({ length: sp.n }, (_, i) => bar(((sp.deg ?? 0) + i * 360 / sp.n) * Math.PI / 180, sp.w, boss - 2, R - rim + 1.5));
          extra.push(prism(bars, W - dish - .5, W - dish * .12));
          if (bk) extra.push(prism(bars, bk * .12, bk + .5));
        }
        const md = face.medallions;
        if (md) for (let i = 0; i < md.n; i++) {
          const [cx, cy] = polar(md.r * R, (md.deg + i * 360 / md.n) * Math.PI / 180), rx = md.size * R * .38, ry = md.size * R * .5;
          const oval = (sx: number, sy: number) => Array.from({ length: 28 }, (_, j) => { const t = j / 28 * Math.PI * 2; return [cx + Math.cos(t) * sx, cy + Math.sin(t) * sy] as Vec2; });
          extra.push(prism([oval(rx, ry)], W - dish - .5, W - dish * .55), prism([oval(rx * .55, ry * .7)], W - dish * .56, W - dish * .3));
        }
        break;
      }
      case 'calibrated': {
        const rim = Math.max(lip, 3), boss = Math.max(r0 + 2, Math.min((face.boss ?? 88) / 2, b + .3 * (R - b))), field = Math.min(1.4, W * .08);
        front = [[r0, 0], [boss, field], [R - rim, 0]];
        const sp = face.spokes;
        if (sp && D >= (sp.minD ?? 0)) extra.push(prism(Array.from({ length: sp.n }, (_, i) => bar(((sp.deg ?? 0) + i * 360 / sp.n) * Math.PI / 180, sp.w, boss - 1, R - rim + 1)), W - field - .3, W - .25));
        break;
      }
      case 'flat': break;
      case 'wagon-steel': {
        const t = face.plate ?? 9.5, band = face.band ?? 6;
        front = [[r0, (W - t) / 2]]; back = front; edge = .8; outerR = R - band + .5;
        // Rim band (the carrying lip) and hub collar span the full width so plates stack lip to lip.
        extra.push(ring(R - band, R, 0, W), ring(b, insertR + .5, 0, W));
        insertR = 0;
        break;
      }
      default: throw Error(`Unknown plate kind ${(face as PlateFace).kind}.`);
    }
    // Through cut-outs: grips, windows and rim pockets.
    const g = face.grips;
    if (g && D >= (g.minD ?? 0)) {
      const holes: Vec2[][] = [], a0 = (g.deg ?? 90) * Math.PI / 180;
      for (let i = 0; i < g.n; i++) {
        const a = a0 + i * Math.PI * 2 / g.n, rc = g.r * R, [cx, cy] = polar(rc, a);
        if (g.kind === 'hex') holes.push(Array.from({ length: 6 }, (_, j) => { const [x, y] = polar(g.size * R, a + j * Math.PI / 3); return [cx + x, cy + y] as Vec2; }));
        else if (g.kind === 'slot') {
          const hw = g.size * R / 2, hh = .055 * R, t: Vec2 = [-Math.sin(a), Math.cos(a)], n: Vec2 = [Math.cos(a), Math.sin(a)], pts: Vec2[] = [];
          const at = (u: number, v: number): Vec2 => [cx + t[0] * u + n[0] * v, cy + t[1] * u + n[1] * v];
          for (let j = 0; j <= 8; j++) { const q = -Math.PI / 2 + j * Math.PI / 8; pts.push(at(hw + Math.cos(q) * hh, Math.sin(q) * hh)); }
          for (let j = 0; j <= 8; j++) { const q = Math.PI / 2 + j * Math.PI / 8; pts.push(at(-hw + Math.cos(q) * hh, Math.sin(q) * hh)); }
          holes.push(pts);
        } else {
          // Tri-grip kidneys and wagon-wheel wedges: annular windows between constant-width spokes.
          const r1 = (g.r + g.size / 2) * R, rin = (g.r - g.size / 2) * R, half = Math.PI / g.n, sw = (g.kind === 'wedge' ? .075 : .6) * R, n = 10, pts: Vec2[] = [];
          const lim = (rho: number) => Math.max(.05, half - Math.asin(Math.min(.95, sw / 2 / rho)));
          for (let j = 0; j <= n; j++) pts.push(polar(r1, a - lim(r1) + 2 * lim(r1) * j / n));
          for (let j = n; j >= 0; j--) pts.push(polar(rin, a - lim(rin) + 2 * lim(rin) * j / n));
          holes.push(pts);
        }
      }
      const cutter = k(new C(holes, 'EvenOdd')), round = g.kind === 'slot' ? 0 : .025 * R;
      const shaped = round ? k(k(cutter.offset(-round, 'Round', 2, 12)).offset(round, 'Round', 2, 12)) : cutter;
      through.push(k(k(shaped.extrude(W + 4)).translate([0, 0, -2])));
    }
    const p = face.pockets;
    if (p) for (let i = 0; i < p.n; i++) {
      const a = (45 + i * 360 / p.n) * Math.PI / 180, half = p.deg / 2 * Math.PI / 180, pts: Vec2[] = [];
      for (let j = 0; j <= 8; j++) pts.push(polar(R + 2, a - half + 2 * half * j / 8));
      for (let j = 8; j >= 0; j--) pts.push(polar(R * (1 - p.r), a - half + 2 * half * j / 8));
      through.push(prism([pts], -1, p.depth), prism([pts], W - p.depth, W + 1));
    }
    const annulus = k(k(C.circle(outerR - Math.max(1.5, Math.min(edge, 4)), segments)).subtract(k(C.circle(r0 + 1.2, segments))));
    // Markings: cut into the face and ink-filled flush (print/inlay), left recessed (deboss) or raised
    // inside the face envelope (cast/moulded relief), so stack widths stay exact.
    if (!simple) {
      for (const m of line.markings) {
        if (D < (m.minD ?? 0) || D > (m.maxD ?? Infinity)) continue;
        const loops2d = markingLoops(m, markingText(m, line, w), R);
        if (!loops2d.length) continue;
        const style = m.style ?? 'print', color = w.ink ?? m.color ?? inkDefault;
        for (const isBack of m.back ? [false, true] : [false]) {
          // Seen from the back, the face's right is local -X: mirror so the text reads correctly there.
          const loops = isBack ? loops2d.map(l => l.map(([x, y]) => [-x, y] as Vec2)) : loops2d;
          // Clip to the face annulus so small plates never print into the bore or over the rim.
          const shape = k(k(new C(loops, 'EvenOdd')).intersect(annulus));
          if (shape.isEmpty()) continue;
          const steps = isBack ? back : front, depth = depthAt(steps, m.r * R), z = isBack ? depth : W - depth;
          const slab = (cs: CrossSection, z0: number, z1: number) => k(k(cs.extrude(z1 - z0)).translate([0, 0, z0]));
          const span = (a: number, c: number, cs = shape) => isBack ? slab(cs, z - c, z + a) : slab(cs, z - a, z + c);
          if (style === 'raised' && depth >= .45) {
            let lift = Math.min(depth - .1, face.kind === 'iron' ? Math.min(2.5, depth * .5) : 1.1), base = 0;
            if (m.badge && depth >= 1.2) {
              // Raised rectangular badge behind the lettering (CAP grip plates).
              const box = shape.bounds(), pad = m.h * R * .3, bw = box.max[0] - box.min[0] + 2 * pad, bh = box.max[1] - box.min[1] + 2 * pad;
              const plate = k(k(k(C.square([bw, bh], true)).translate([(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2])).intersect(annulus));
              base = lift * .45; reliefs.push(span(.3, base, plate)); lift -= base;
            }
            const relief = isBack ? slab(shape, z - base - lift, z - base + .3) : slab(shape, z + base - .3, z + base + lift);
            if (m.color || w.ink) inks.push({ solid: relief, color }); else reliefs.push(relief);
          } else if (style === 'deboss' && face.kind === 'wagon-steel') through.push(slab(shape, -1, W + 1));
          else {
            const cut = style === 'deboss' ? Math.min(1.2, W * .25) : style === 'inlay' ? Math.min(1, W * .2) : Math.min(.5, W * .1);
            faceCuts.push(span(cut, 1));
            if (style !== 'deboss') inks.push({ solid: span(cut, 0), color });
          }
        }
      }
      // Flecks, specks and marble streaks, flush in each flat face band of both faces.
      if (line.pattern && spec.accent) {
        const bands: [number, number, number][] = [];
        front.forEach(([r, d], i) => bands.push([r + 2.5, (front[i + 1]?.[0] ?? R - Math.max(edge, 2)) - 2.5, d]));
        const seed = line.code * 7919 + Math.round(w.weight * 100);
        bands.forEach(([a, c, d], i) => {
          if (c - a < 8) return;
          const loops = patternLoops(line.pattern!.kind, line.pattern!.density, a, c, seed + i * 31);
          if (!loops.length) return;
          // Clip to the band so blobs never spill over a step or past the rim.
          const band = k(k(C.circle(c, segments)).subtract(k(C.circle(a, segments))));
          const shape = k(k(new C(loops, 'NonZero')).intersect(band));
          if (shape.isEmpty()) return;
          const slab = (z0: number, z1: number) => k(k(shape.extrude(z1 - z0)).translate([0, 0, z0]));
          for (const isBack of [false, true]) {
            const z = isBack ? d : W - d, t = .35;
            faceCuts.push(isBack ? slab(z - 1, z + t) : slab(z - t, z + 1));
            accents.push(isBack ? slab(z, z + t) : slab(z - t, z));
          }
        });
      }
    }
    let solid = revolve(bodyOutline(r0, outerR, W, front, back, edge));
    if (extra.length) solid = union([solid, ...extra]);
    const allCuts = [...through, ...faceCuts];
    if (allCuts.length) solid = k(M.difference([solid, ...allCuts]));
    out.unshift({ suffix: '', solid, look: body });
    if (reliefs.length) {
      // Cast/moulded lettering in the body colour, a touch glossier where it wears, so it reads like the photos.
      let merged = union(reliefs);
      if (through.length) merged = k(merged.subtract(union(through)));
      if (!merged.isEmpty()) out.splice(1, 0, { suffix: ' lettering', solid: merged, look: { ...body, roughness: Math.max(.18, body.roughness - .3), metalness: Math.min(1, body.metalness + .1) } });
    }
    if (insertR > b) {
      const rec = face.insertRecess ?? 0;
      out.push({ suffix: ' hub', solid: ring(b, insertR + .01, rec, W - rec), look: face.insertColor ? { ...STAINLESS, color: face.insertColor } : STAINLESS });
    }
    const holes = through.length ? union(through) : undefined;
    const groups = new Map<string, Manifold[]>();
    for (const { solid: s, color } of inks) groups.set(color, [...(groups.get(color) ?? []), s]);
    let inkAll: Manifold | undefined;
    for (const [color, solids] of groups) {
      let merged = union(solids);
      if (holes) merged = k(merged.subtract(holes));
      if (merged.isEmpty()) continue;
      inkAll = inkAll ? k(inkAll.add(merged)) : merged;
      out.push({ suffix: groups.size > 1 && color !== inkDefault ? ` markings ${color}` : ' markings', solid: merged, look: { color, ...INK } });
    }
    if (accents.length) {
      let merged = union(accents);
      if (holes) merged = k(merged.subtract(holes));
      if (inkAll) merged = k(merged.subtract(inkAll));
      if (!merged.isEmpty()) out.push({ suffix: ' pattern', solid: merged, look: { color: spec.accent!, metalness: body.metalness, roughness: body.roughness } });
    }
    for (const part of out) if (part.solid.status() !== 'NoError' || part.solid.isEmpty()) throw Error(`Invalid plate solid ${id}${part.suffix}.`);
    const keep = new Set<Manifold | CrossSection>(out.map(part => part.solid));
    owned.reverse().forEach(o => { if (!keep.has(o)) o.delete(); });
    return out;
  } catch (error) {
    owned.forEach(o => o.delete());
    throw error;
  }
}
// Built plates in their local frame are reused across stacks (copies are transformed); a small LRU keeps WASM memory bounded.
const CACHE = new WeakMap<ManifoldAPI, Map<string, LocalPart[]>>();
const CACHE_SIZE = 48;
function linePlate(api: ManifoldAPI, id: PlateId, segments: number, simple: boolean): LocalPart[] {
  let cache = CACHE.get(api);
  if (!cache) CACHE.set(api, cache = new Map());
  const key = `${id}|${segments}|${simple ? 's' : 'f'}`, hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const built = buildLinePlate(api, id, segments, simple);
  cache.set(key, built);
  while (cache.size > CACHE_SIZE) { const [oldest, parts] = cache.entries().next().value!; cache.delete(oldest); parts.forEach(p => p.solid.delete()); }
  return built;
}
export function buildPlateStack(api: ManifoldAPI, plates: readonly PlateId[], placement: PlateStackPlacement): SolidPart[] {
  const { CrossSection: C } = api, allocated: (Manifold | CrossSection)[] = [], result: SolidPart[] = [];
  const keep = <T extends Manifold | CrossSection>(x: T): T => (allocated.push(x), x);
  const segments = placement.segments ?? 96, prefix = placement.name ?? 'plate', gap = placement.gap ?? PLATE_GAP;
  const length = Math.hypot(...placement.axis), unit = placement.axis.map(v => v / length) as Vec3;
  const revolve = (ring: Vec2[], at: Vec3) => keep(keep(keep(new C([ring], 'EvenOdd')).revolve(segments)).transform(frame(placement.axis, at)));
  try {
    let offset = 0;
    for (const [index, id] of plates.entries()) {
      const spec = plateSpec(id);
      if (!spec) throw Error(`Unknown plate ${id}.`);
      const at = placement.origin.map((v, i) => v + unit[i] * offset) as Vec3, name = `${prefix}-${index + 1} ${spec.label}`;
      if (Object.hasOwn(PLATE_SPECS, id)) {
        const legacy = PLATE_SPECS[id as LegacyPlateId];
        if (legacy.style === 'bumper') {
          const { rubber, hub } = bumperProfiles(legacy);
          result.push({ name, solid: revolve(rubber, at), role: 'source', color: legacy.color, metalness: 0, roughness: .82 });
          result.push({ name: `${name} hub`, solid: revolve(hub, at), role: 'source', color: '#c9ccce', metalness: .9, roughness: .3 });
        } else result.push({ name, solid: revolve(ironProfile(legacy), at), role: 'source', color: legacy.color, metalness: .55, roughness: .62 });
      } else {
        const clock = typeof placement.clock === 'function' ? placement.clock(index) : placement.clock ?? 0, flip = placement.facing === 'in';
        const title = plateParts(id)!.line;
        for (const part of linePlate(api, id, segments, placement.detail === 'simple')) {
          let s = part.solid;
          if (clock) s = keep(s.rotate([0, 0, clock * 180 / Math.PI]));
          if (flip) s = keep(keep(s.rotate([180, 0, 0])).translate([0, 0, spec.width]));
          result.push({ name: `${name} ${title.brand} ${title.name}${part.suffix}`, solid: keep(s.transform(frame(placement.axis, at))), role: 'source', ...part.look });
        }
      }
      offset += spec.width + gap;
    }
    return result;
  } catch (error) { result.length = 0; throw error; } finally {
    const saved = new Set<Manifold | CrossSection>(result.map(p => p.solid));
    allocated.reverse().forEach(p => { if (!saved.has(p)) p.delete(); });
  }
}
