/** Fixed and loadable dumbbells: Manifold builders for the entries in ../floor-parts/fixed-dumbbells.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * Each entry's params resolve to a `DumbbellShape` (metadata file); one builder per construction family turns it into
 * named material groups. Build frame: handle along Y, X across, Z up, origin on the floor at the footprint centre. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec2, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { buildPlateStack } from './plates.ts';
import type { PlateId } from '../plates.ts';
import {
  PARTS, FINISH, LOADABLE_PLATE_GAP, PRO_PLATE_GAP, dumbbellEnvelope, dumbbellShape, mixHex, proHeadLength,
  type CastShape, type DumbbellShape, type FatbellShape, type Finish, type HandleSpec, type HexShape, type LoadableShape, type ProShape, type UrethaneShape,
} from '../floor-parts/fixed-dumbbells.ts';
import { arc, dumbbellKit, type DumbbellKit, type Mat, type Role } from './fixed-dumbbells-kit.ts';
const mat = (f: Finish, role: Role = 'source', suffix = ''): Mat => [f.name + suffix, role, f.color, f.metalness, f.roughness];
/** Knurl bands are separate, darker and rougher solids over the handle steel. */
const knurlMat = (f: Finish): Mat => [`${f.name} · knurl`, 'handle', mixHex(f.color, '#4a4c4f', .38), Math.min(1, f.metalness), Math.min(.72, f.roughness + .3)];
/** Handle between two heads whose inner faces sit at y = ±yIn; the steel runs `embed` mm into each head. */
function handle(t: DumbbellKit, h: HandleSpec, yIn: number, z: number, embed = 10) {
  const r = h.d / 2, y1 = yIn + embed, steel = h.style === 'cast' || h.style === 'coated' ? mat(h.finish) : mat(h.finish, 'handle');
  const profile = (radius: (y: number) => number, a: number, b: number, n = 40): Vec2[] => {
    const pts: Vec2[] = [[0, a]];
    for (let i = 0; i <= n; i++) { const y = a + (b - a) * i / n; pts.push([radius(y), y]); }
    pts.push([0, b]); return pts;
  };
  /** Radius along the grip (y measured from the centre). */
  let radius: (y: number) => number;
  const bump = (u: number, c: number, w: number) => Math.exp(-(((u - c) / w) ** 2));
  const flare = (u: number, from: number, amount: number) => u > from ? amount * ((u - from) / (1 - from)) ** 2 : 0;
  if (h.style === 'contour') {
    // Rogue / Troy contoured: fullest in the middle, a waist by the knurl rings, flaring into each head.
    radius = y => { const u = Math.min(1, Math.abs(y) / yIn); return r * (1 - .085 * bump(u, .66, .2)) + flare(u, .86, 3.5); };
  } else if (h.style === 'ergo') {
    // CAP / Amazon ergo: slightly bulged knurled centre, thinner smooth necks, a small flare into the collar.
    radius = y => { const u = Math.min(1, Math.abs(y) / yIn); return r * (1 - .08 * Math.min(1, Math.max(0, (u - .55) / .2))) + .8 * bump(u, 0, .45) + flare(u, .9, 2.2); };
  } else if (h.style === 'cast' || h.style === 'coated') {
    const grow = h.style === 'coated' ? h.d * .34 : h.d * .2, run = h.style === 'coated' ? h.d * .55 : h.d * .35;
    radius = y => { const g = Math.abs(y) - (yIn - run); return r + (g > 0 ? grow * (1 - Math.sqrt(Math.max(0, 1 - (g / run) ** 2))) : 0); };
  } else radius = () => r;
  const body = h.style === 'straight' ? t.cylY(-y1, y1, h.d, z, 0, 40) : t.revolveY(profile(y => Math.abs(y) > yIn ? radius(yIn) : radius(y), -y1, y1, 64), z, 40);
  t.add(steel, body);
  const band = (a: number, b: number) => t.revolveY(profile(y => radius(y) + .35, a, b, 12), z, 40);
  const km = knurlMat(h.finish);
  if (h.knurl === 'full') { const half = (h.knurlLength ?? 2 * yIn - 12) / 2; t.add(km, band(-half, half)); }
  else if (h.knurl === 'bands') { const c = Math.min(18, yIn * .28); t.add(km, band(-c, c)); for (const s of [-1, 1]) { const a = c + 11; t.add(km, s > 0 ? band(a, a + 10) : band(-a - 10, -a)); } }
  else if (h.knurl === 'ergo') { const c = yIn * .36; t.add(km, band(-c, c)); for (const s of [-1, 1]) { const a = yIn * .5; t.add(km, s > 0 ? band(a, a + yIn * .16) : band(-a - yIn * .16, -a)); } }
  if (h.collar) for (const s of [-1, 1]) t.add(mat(h.collar.finish, 'handle', ' · collar'), t.cylY(s > 0 ? yIn - h.collar.w : -yIn, s > 0 ? yIn : -yIn + h.collar.w, h.collar.d, z, 0, 40));
}
// ------------------------------------------------------------------------------------------------ hex heads
function buildHex(api: ManifoldAPI, s: HexShape): SolidPart[] {
  const t = dumbbellKit(api), e = dumbbellEnvelope(s), z = e.axis, R = s.af / Math.sqrt(3), yIn = s.grip / 2, yOut = yIn + s.L;
  return t.finish(s.head.name, [0, 0, 0], () => {
    const round = (radius: number) => { const hex = t.ngon(radius, 6); return s.edge > .05 ? t.k(t.k(hex.offset(-s.edge, 'Round', 2, 12)).offset(s.edge, 'Round', 2, 12)) : hex; };
    const section = round(R), end = t.k(section.scale([s.endScale, s.endScale])), b = Math.min(s.bevel, s.L * .3);
    const top = z + s.af / 2, flat = R, panelW = flat * (s.label.kind === 'frame' ? .8 : .62), panelL = (s.L - 2 * b) * (s.label.kind === 'frame' ? .86 : .78);
    const heads: Manifold[] = [], cuts: Manifold[] = [], inks: Manifold[] = [], raised: Manifold[] = [];
    for (const side of [-1, 1]) {
      const y0 = side > 0 ? yIn : -yOut, mid = side * (yIn + s.L / 2);
      heads.push(t.hull([t.prismY(section, y0 + b, s.L - 2 * b, z), t.prismY(end, y0, s.L, z)]));
      const str = side < 0 ? s.label.left : s.label.right, u: Vec3 = [0, side, 0], v: Vec3 = [-side, 0, 0];
      if (s.label.kind === 'recess') {
        const across = s.label.read === 'across', pw = across ? flat * .74 : panelW, pl = across ? (s.L - 2 * b) * .66 : panelL;
        cuts.push(t.place(t.k(t.rounded(pw, pl, 2).extrude(4)), [0, mid, top - 1.5], [1, 0, 0], [0, 1, 0]));
        const floor = t.place(t.k(t.rounded(pw, pl, 2).extrude(.3)), [0, mid, top - 1.5], [1, 0, 0], [0, 1, 0]);
        const letters = across ? t.fitText(str, pw * .78, pl * .5) : t.fitText(str, pl * .78, pw * .62);
        const lu: Vec3 = across ? [1, 0, 0] : u, lv: Vec3 = across ? [0, 1, 0] : v;
        (s.label.panel ? inks : raised).push(floor);
        if (letters) raised.push(t.place(t.k(letters.extrude(1.3)), [0, mid, top - 1.5], lu, lv));
      } else if (s.label.kind === 'frame') {
        const outer = t.rounded(panelW, panelL, 3), ring = t.k(outer.subtract(t.rounded(panelW - 5, panelL - 5, 1.8)));
        inks.push(t.place(t.k(ring.extrude(2.4)), [0, mid, top - 1], [1, 0, 0], [0, 1, 0]));
        if (s.label.panel) t.add(mat(s.label.panel), t.place(t.k(t.rounded(panelW - 4, panelL - 4, 2).extrude(1.25)), [0, mid, top - 1], [1, 0, 0], [0, 1, 0]));
        const letters = t.fitText(str, panelL * .7, (panelW - 5) * .72);
        if (letters) inks.push(t.place(t.k(letters.extrude(2.2)), [0, mid, top - 1], u, v));
      } else {
        // Moulded-in weight on the outer end face, reading upright from the end.
        const face = side * yOut, eu: Vec3 = [-side, 0, 0], ev: Vec3 = [0, 0, 1], w = R * s.endScale * 1.2, lines = t.fitText(str, w, s.af * s.endScale * .3);
        if (lines) {
          const tb = lines.bounds(), bar = s.label.underline ? t.k(t.k(t.C.square([tb.max[0] - tb.min[0], Math.max(1.2, (tb.max[1] - tb.min[1]) * .12)], true)).translate([0, tb.min[1] - (tb.max[1] - tb.min[1]) * .22])) : undefined;
          const art = bar ? t.k(lines.add(bar)) : lines, at: Vec3 = [0, face - side * .6, z + (bar ? (tb.max[1] - tb.min[1]) * .12 : 0)];
          cuts.push(t.place(t.k(art.extrude(2)), at, eu, ev));
          inks.push(t.place(t.k(art.extrude(.45)), at, eu, ev));
        }
      }
    }
    t.add(mat(s.head), t.cut(t.union(heads), cuts), ...raised);
    if (inks.length) t.add(mat(s.label.ink ?? s.label.panel ?? FINISH.silver, 'source'), ...inks);
    handle(t, s.handle, yIn, z, Math.min(12, s.L * .4));
  });
}
// ------------------------------------------------------------------------------------------------ urethane round heads
function buildUrethane(api: ManifoldAPI, s: UrethaneShape): SolidPart[] {
  const t = dumbbellKit(api), R = s.D / 2, z = R, yIn = s.gap / 2, yOut = yIn + s.L;
  return t.finish(s.head.name, [0, 0, 0], () => {
    const fi = Math.min(3, s.L / 5), fo = Math.min(7, s.L / 3.2), rs = .4 * s.D, step = 1;
    for (const side of [-1, 1]) {
      const pts: Vec2[] = [[0, yIn], [R - fi, yIn], ...arc([R - fi, yIn + fi], fi, -90, 0, 4), ...arc([R - fo, yOut - fo], fo, 0, 90, 8), [rs, yOut], [rs, yOut - step], [0, yOut - step]];
      const head = t.revolveY(side > 0 ? pts : pts.map(([r, y]) => [r, -y] as Vec2), z, 96);
      // White pad print on the face: wordmark over a boxed weight, reading upright from the end.
      const eu: Vec3 = [-side, 0, 0], ev: Vec3 = [0, 0, 1], face = side * (yOut - step);
      const word = t.fitText(s.brand, s.D * .5, s.D * .13), num = t.fitText(s.number, s.D * .16, s.D * .07);
      const boxW = s.D * .24, boxH = s.D * .11, stroke = Math.max(1, s.D * .008);
      const frame = t.k(t.rounded(boxW, boxH, 1).subtract(t.rounded(boxW - 2 * stroke, boxH - 2 * stroke, .6)));
      const art = t.k(t.C.union([...(word ? [t.k(word.translate([0, s.D * .1]))] : []), t.k(frame.translate([0, -s.D * .12])), ...(num ? [t.k(num.translate([0, -s.D * .12]))] : [])]));
      t.add(mat(s.head), t.cut(head, [t.place(t.k(art.extrude(1)), [0, face - side * .4, z], eu, ev)]));
      t.add(mat(FINISH.white), t.place(t.k(art.extrude(.3)), [0, face - side * .4, z], eu, ev));
      const f0 = side > 0 ? yIn - s.flange.w : -yIn, r0 = side > 0 ? yIn - s.flange.w - s.ring.w : -yIn + s.flange.w;
      t.add(mat(s.flange.finish, 'handle', ' · flange washer'), t.cylY(f0, f0 + s.flange.w, s.flange.d, z, 0, 48));
      t.add(mat(s.ring.finish, 'handle', ' · collar'), t.cylY(r0, r0 + s.ring.w, s.ring.d, z, 0, 48));
    }
    handle(t, { ...s.handle, knurlLength: Math.min(s.handle.knurlLength ?? 1e9, 2 * (yIn - s.flange.w - s.ring.w) - 2) }, yIn - s.flange.w - s.ring.w, z, s.flange.w + s.ring.w + Math.min(12, s.L * .5));
  });
}
// ------------------------------------------------------------------------------------------------ pro-style stacked plates
function buildPro(api: ManifoldAPI, s: ProShape): SolidPart[] {
  const t = dumbbellKit(api), R = s.D / 2, z = R, yIn = s.grip / 2, yOut = yIn + proHeadLength(s);
  return t.finish(s.plate.name, [0, 0, 0], () => {
    const f = Math.min(s.t / 2 - .3, s.rubber ? 7 : 3.2), capBody = s.cap.w - .8, capR = s.cap.d / 2;
    const badge = s.cap.style.startsWith('troy') ? { plate: FINISH.blackIron, ink: { name: 'Orange TROY lettering', color: '#e38b2c', metalness: .1, roughness: .5 } as Finish }
      : { plate: { name: 'Gold IVANKO badge', color: '#c8a24a', metalness: .8, roughness: .3 } as Finish, ink: FINISH.blackIron };
    for (const side of [-1, 1]) {
      const at = (y: number, len: number) => side > 0 ? y : -y - len;
      t.add(mat(s.hub.finish, 'handle', ' · hub collar'), t.cylY(at(yIn, s.hub.w), at(yIn, s.hub.w) + s.hub.w, s.hub.d, z, 0, 48));
      let y = yIn + s.hub.w;
      for (let i = 0; i < s.plates; i++) {
        const pts: Vec2[] = [[20, y], [R - f, y], ...arc([R - f, y + f], f, -90, 0, 5), ...arc([R - f, y + s.t - f], f, 0, 90, 5), [20, y + s.t]];
        t.add(mat(s.plate), t.revolveY(side > 0 ? pts : pts.map(([r, yy]) => [r, -yy] as Vec2), z, 96));
        y += s.t + (i < s.plates - 1 ? PRO_PLATE_GAP : 0);
      }
      // Spacer core under the plate grooves (hidden), then the end cap and its badges.
      t.add(mat(s.plate), t.cylY(at(yIn + s.hub.w, y - yIn - s.hub.w), at(yIn + s.hub.w, y - yIn - s.hub.w) + y - yIn - s.hub.w, s.D * .55, z, 0, 48));
      const cy0 = y, face = side * (cy0 + capBody), eu: Vec3 = [-side, 0, 0], ev: Vec3 = [0, 0, 1];
      if (s.cap.style === 'washer') {
        t.add(mat(FINISH.chrome, 'fastener', ' · washer'), t.cylY(at(cy0, capBody), at(cy0, capBody) + capBody, s.cap.d, z, 0, 48));
        t.add(mat(FINISH.blackOxide, 'fastener', ' · bolt'), t.alongY(t.k(t.ngon(12, 6).extrude(.8)), side > 0 ? cy0 + capBody : -cy0 - capBody - .8, 0, z));
        continue;
      }
      const fr = s.cap.style.startsWith('troy') ? Math.min(5, capBody * .45) : 2;
      const capPts: Vec2[] = [[0, cy0], [capR, cy0], ...arc([capR - fr, cy0 + capBody - fr], fr, 0, 90, 5), [0, cy0 + capBody]];
      const capFinish = s.cap.style === 'troy-chrome' || s.cap.style === 'ivanko-chrome' ? FINISH.chrome : s.cap.style.endsWith('rubber') ? { ...s.plate, name: 'Rubber end plates' } : { ...s.plate, name: 'Ductile cast-iron end plates', color: mixHex(s.plate.color, '#000000', .12) };
      const socket = t.alongY(t.k(t.ngon(s.D * .035, 6).extrude(6)), side > 0 ? cy0 + capBody - 5 : -cy0 - capBody - 1, 0, z);
      t.add(mat(capFinish, capFinish === FINISH.chrome ? 'handle' : 'source', capFinish === FINISH.chrome ? ' · end caps' : ''), t.cut(t.revolveY(side > 0 ? capPts : capPts.map(([r, yy]) => [r, -yy] as Vec2), z, 96), [socket]));
      t.add(mat(FINISH.blackOxide, 'fastener', ' · socket bolt'), t.alongY(t.k(t.ngon(s.D * .03, 6).extrude(4.5)), side > 0 ? cy0 + capBody - 5 : -cy0 - capBody + .5, 0, z));
      // Badges: brand oval above the socket, weight tag below; raised to the cap envelope (yOut).
      const bw = s.cap.d * .56, bh = s.cap.d * .17, nw = s.cap.d * .3, nh = s.cap.d * .15, lift = .8;
      const brandOval = t.rounded(bw, bh, bh / 2), numTag = t.rounded(nw, nh, s.cap.style.startsWith('troy') ? nh / 2 : 1.5);
      const plates = t.k(t.C.union([t.k(brandOval.translate([0, s.cap.d * .2])), t.k(numTag.translate([0, -s.cap.d * .2]))]));
      const at3: Vec3 = [0, face - side * .2, z];
      if (s.cap.style === 'ivanko-rubber') {
        const word = t.fitText(s.brand, bw, bh * .8);
        if (word) t.add(mat(capFinish), t.place(t.k(t.k(word.translate([0, s.cap.d * .2])).extrude(lift + .2)), at3, eu, ev));
        t.add(mat(badge.plate, 'source', ' · weight tag'), t.place(t.k(t.k(numTag.translate([0, -s.cap.d * .2])).extrude(lift + .2)), at3, eu, ev));
      } else t.add(mat(badge.plate, 'source', ' · badges'), t.place(t.k(plates.extrude(lift)), at3, eu, ev));
      const word = s.cap.style === 'ivanko-rubber' ? undefined : t.fitText(s.brand, bw * .74, bh * .62), num = t.fitText(s.number, nw * .74, nh * .66);
      const ink = t.k(t.C.union([...(word ? [t.k(word.translate([0, s.cap.d * .2]))] : []), ...(num ? [t.k(num.translate([0, -s.cap.d * .2]))] : [])]));
      if (!ink.isEmpty()) t.add(mat(badge.ink, 'source', ' · badge lettering'), t.place(t.k(ink.extrude(lift + .2)), [0, face - side * .2, z], eu, ev));
    }
    handle(t, s.handle, yIn, z, s.hub.w + 10);
    void yOut;
  });
}
// ------------------------------------------------------------------------------------------------ York cast heads
/** Head profile (radius, y) from y0 to y0+W for the crowned roundhead, bun or globe, radius grown by `grow`. */
function castProfile(s: CastShape, y0: number, grow = 0): Vec2[] {
  const R = s.D / 2 + grow, W = s.W, pts: Vec2[] = [];
  if (s.style === 'globe') {
    const n = 40; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; pts.push([R * Math.cos(a), y0 + W / 2 + (W / 2 + grow) * Math.sin(a)]); }
    return [[0, y0 - grow], ...pts.slice(1, -1), [0, y0 + W + grow]];
  }
  if (s.style === 'bun') {
    const p = 3.1, n = 48; for (let i = 0; i <= n; i++) { const v = -1 + 2 * i / n, u = (1 - Math.abs(v) ** p) ** (1 / p); pts.push([Math.max(0, R * u), y0 + W / 2 + (W / 2 + grow) * v]); }
    return pts;
  }
  const crown = .045 * s.D, f = Math.min(.12 * s.D, .3 * W), n = 16, rim = (y: number) => R - crown * ((y - y0 - W / 2) / (W / 2)) ** 2;
  pts.push([0, y0 - grow], [rim(y0 + f) - f, y0 - grow]);
  pts.push(...arc([rim(y0 + f) - f, y0 + f], f + grow, -90, -10, 6).map(([r, y]) => [r, Math.max(y0 - grow, y)] as Vec2));
  for (let i = 1; i < n; i++) { const y = y0 + f + (W - 2 * f) * i / n; pts.push([rim(y), y]); }
  pts.push(...arc([rim(y0 + W - f) - f, y0 + W - f], f + grow, 10, 90, 6).map(([r, y]) => [r, Math.min(y0 + W + grow, y)] as Vec2));
  pts.push([0, y0 + W + grow]);
  return pts;
}
function buildCast(api: ManifoldAPI, s: CastShape): SolidPart[] {
  const t = dumbbellKit(api), R = s.D / 2, z = R, yIn = s.grip / 2;
  return t.finish(s.head.name, [0, 0, 0], () => {
    const relief = Math.max(1.6, s.D * .016);
    for (const side of [-1, 1]) {
      const prof = castProfile(s, yIn), flip = (p: Vec2[]) => side > 0 ? p : p.map(([r, y]) => [r, -y] as Vec2);
      const head = t.revolveY(flip(prof), z, 96), grown = t.revolveY(flip(castProfile(s, yIn, relief)), z, 96);
      // Raised panel on the top of the rim: YORK on one head, the weight on the other, reading across the dumbbell.
      const mid = side * (yIn + s.W / 2), label = side < 0 ? s.brand : s.number, pw = s.D * (s.style === 'globe' ? .46 : .52), ph = s.W * (s.style === 'globe' ? .3 : .5);
      const art: Manifold[] = [];
      const letters = t.fitText(label, pw * .78, ph * .62);
      if (letters) art.push(t.k(letters.extrude(30)));
      if (s.frame) art.push(t.k(t.k(t.rounded(pw, ph, ph * .25).subtract(t.rounded(pw - 2 * relief * 1.6, ph - 2 * relief * 1.6, ph * .18))).extrude(30)));
      const raised = art.map(a => t.meet(t.place(a, [0, mid, z + R - 22], [1, 0, 0], [0, 1, 0]), grown));
      t.add(mat(s.head), head, ...raised);
      if (s.handle.style !== 'cast') t.add(mat(s.head), t.cylY(side * yIn - 2, side * yIn + 2, s.handle.d + 5, z, 0, 32));
    }
    handle(t, s.handle, yIn, z, Math.min(14, s.W * .4));
  });
}
// ------------------------------------------------------------------------------------------------ Thompson Fatbell
function buildFatbell(api: ManifoldAPI, s: FatbellShape): SolidPart[] {
  const t = dumbbellKit(api), R = s.D / 2, a = s.opening, rc = s.cavity;
  return t.finish('Rogue Thompson Fatbell', [0, 0, -s.zBase], () => {
    const outer = (z0: number, z1: number, n = 36): Vec2[] => Array.from({ length: n + 1 }, (_, i) => { const zz = z0 + (z1 - z0) * i / n; return [Math.sqrt(Math.max(0, R * R - zz * zz)), zz] as Vec2; });
    const inner = (z0: number, z1: number, n = 30): Vec2[] => Array.from({ length: n + 1 }, (_, i) => { const zz = z0 + (z1 - z0) * i / n; return [Math.sqrt(Math.max(0, rc * rc - zz * zz)), zz] as Vec2; });
    const zl = Math.sqrt(rc * rc - a * a), ab = a * .78, zlb = -Math.sqrt(rc * rc - ab * ab), rb = Math.sqrt(R * R - s.zBase * s.zBase);
    const pts: Vec2[] = s.openBottom
      ? [[ab, s.zBase], [rb, s.zBase], ...outer(s.zBase, s.zTop).slice(1), [a, s.zTop], [a, zl], ...inner(zl, zlb).slice(1), [ab, zlb]]
      : [[0, s.zBase], [rb, s.zBase], ...outer(s.zBase, s.zTop).slice(1), [a, s.zTop], [a, zl], ...inner(zl, -rc).slice(1)];
    let bell = t.revolveZ(pts, 96);
    // Recessed side panel with raised THOMPSON / FATBELLS and the weight (-X), raised ROGUE on the far side (+X).
    const ball = (r: number) => t.k(t.M.sphere(r, 96)), pw = R * .82, ph = R * .5, depth = 1.8;
    const panel = t.meet(t.place(t.k(t.rounded(pw, ph, 5).extrude(R * .6)), [-R * .5, 0, R * .05], [0, -1, 0], [0, 0, 1]), t.cut(ball(R + 3), [ball(R - depth)]));
    bell = t.cut(bell, [panel]);
    const lines = [t.fitText('THOMPSON', pw * .8, ph * .24), t.fitText('FATBELLS', pw * .8, ph * .24), t.fitText(`${s.lb} LB`, pw * .4, ph * .16)];
    const ys = [ph * .22, -ph * .06, -ph * .32].map(v => v + R * .05);
    const flat: Manifold[] = [];
    lines.forEach((l, i) => { if (l) flat.push(t.place(t.k(l.extrude(R * .6)), [-R * .5, 0, ys[i]], [0, -1, 0], [0, 0, 1])); });
    const rogue = t.fitText('ROGUE', R * .95, R * .26);
    if (rogue) flat.push(t.place(t.k(rogue.extrude(R * .6)), [R * .5, 0, R * .08], [0, 1, 0], [0, 0, 1]));
    bell = t.cut(bell, [t.meet(t.place(t.k(t.rounded(R * 1.05, R * .36, 6).extrude(R * .6)), [R * .5, 0, R * .08], [0, 1, 0], [0, 0, 1]), t.cut(ball(R + 3), [ball(R - depth)]))]);
    const skin = t.cut(ball(R), [ball(R - depth - 1)]), letters = flat.map(f => t.meet(f, skin));
    t.add(['Black powder-coated cast iron', 'source', '#353638', .35, .66], bell, ...letters);
    t.add(['Colour-coded weight stripe', 'source', s.stripe, .1, .5], t.revolveZ([[a, s.zTop - .1], [a + 7, s.zTop - .1], [a + 7, s.zTop + .6], [a, s.zTop + .6]], 96));
    t.add(['Ergo handle, powder-coated', 'handle', '#2e2f31', .35, .6], t.cylY(-rc - 6, rc + 6, s.handleD, 0, 0, 40));
  });
}
// ------------------------------------------------------------------------------------------------ loadable handles
const SHARED_PLATES: Record<number, PlateId> = { 25: 'lb25', 10: 'lb10' };
function buildLoadable(api: ManifoldAPI, s: LoadableShape): SolidPart[] {
  const t = dumbbellKit(api), z = dumbbellEnvelope(s).axis, half = s.length / 2, collarLen = s.flange.w + (s.flange.step?.w ?? 0), yS = s.grip / 2 + collarLen;
  return t.finish('loadable dumbbell', [0, 0, 0], () => {
    t.add(mat(s.shaft, 'handle'), t.cylY(-yS - 6, yS + 6, s.d, z, 0, 40));
    t.add(knurlMat(s.shaft), t.cylY(-s.knurlLength / 2, s.knurlLength / 2, s.d + .5, z, 0, 40));
    if (s.grips) t.add(mat(s.grips, 'handle'), t.cylY(-s.grip / 2 + 4, s.grip / 2 - 4, s.d + 9, z, 0, 40));
    const ironMat: Mat = ['Iron Olympic plates', 'source', '#1d1f21', .55, .62];
    for (const side of [-1, 1]) {
      const span = (y: number, len: number): [number, number] => side > 0 ? [y, y + len] : [-y - len, -y];
      let y = s.grip / 2;
      if (s.flange.step) { t.add(mat(s.sleeves, 'handle', ' · collar'), t.cylY(...span(y, s.flange.step.w), s.flange.step.d, z, 0, 48)); y += s.flange.step.w; }
      const fr = Math.min(2.5, s.flange.w / 4), [f0] = span(y, s.flange.w);
      const flangePts: Vec2[] = [[s.sleeveD / 2 - 1, 0], [s.flange.d / 2 - fr, 0], ...arc([s.flange.d / 2 - fr, fr], fr, -90, 0, 3), ...arc([s.flange.d / 2 - fr, s.flange.w - fr], fr, 0, 90, 3), [s.sleeveD / 2 - 1, s.flange.w]];
      t.add(mat(s.sleeves, 'handle', ' · collar'), t.revolveY(flangePts.map(([r, yy]) => [r, f0 + yy] as Vec2), z, 64));
      if (s.bushing) t.add(['Bronze bushing', 'handle', '#b98a4a', .9, .35], t.cylY(...span(s.grip / 2 - 1.2, 1.4), s.d + 7, z, 0, 40));
      y = yS;
      const sleeveLen = half - yS, [s0, s1] = span(y, sleeveLen);
      const endRecess = t.cylY(side > 0 ? half - (s.cap.open ? 8 : .7) : -half - 1, side > 0 ? half + 1 : -half + (s.cap.open ? 8 : .7), s.cap.open ? 30 : 42, z, 0, 40);
      const sleevePts: Vec2[] = [[0, 0], [s.sleeveD / 2, 0], [s.sleeveD / 2, sleeveLen - 1.2], [s.sleeveD / 2 - 1.2, sleeveLen], [0, sleeveLen]];
      t.add(mat(s.sleeves, 'handle', ' · sleeves'), t.cut(t.revolveY(side > 0 ? sleevePts.map(([r, yy]) => [r, s0 + yy] as Vec2) : sleevePts.map(([r, yy]) => [r, s1 - yy] as Vec2), z, 64), [endRecess]));
      if (!s.cap.open) t.add(['End cap badge', 'source', s.cap.color, .2, .5], t.cylY(side > 0 ? half - .7 : -half + .1, side > 0 ? half - .1 : -half + .7, 41.4, z, 0, 40));
      // Plates from the collar outward: shared Olympic iron plates for 25/10 lb, matching change plates below that.
      let py = yS + .5;
      const shared = s.plates.filter(p => SHARED_PLATES[p.lb]).map(p => SHARED_PLATES[p.lb]);
      if (shared.length) for (const part of buildPlateStack(api, shared, { origin: [0, side * py, z], axis: [0, side, 0], name: 'plate', segments: 72 })) t.add(ironMat, t.k(part.solid));
      for (const p of s.plates) if (SHARED_PLATES[p.lb]) py += p.w + LOADABLE_PLATE_GAP;
      for (const p of s.plates.filter(q => !SHARED_PLATES[q.lb])) {
        const r = p.d / 2, w = p.w, rim = Math.min(14, r * .14), web = w * .5, prof: Vec2[] = [[25.2, .8], [26, 0], [r - 1.5, 0], [r, 1.5], [r, w - 2], [r - 2, w], [r - rim, w], [r - rim - 4, web], [45, web], [40, w], [26, w], [25.2, w - .8]];
        t.add(ironMat, t.revolveY(prof.map(([rr, yy]) => [rr, side * (py + yy)] as Vec2), z, 72));
        py += w + LOADABLE_PLATE_GAP;
      }
      if (s.collar) {
        const c = s.collar, cy = s.plates.length ? py : yS + .5, [c0, c1] = span(cy, c.w);
        t.add(mat(c.finish, 'handle'), t.cut(t.cylY(c0, c1, c.d, z, 0, 48), [t.cylY(c0 - 1, c1 + 1, s.sleeveD + .4, z, 0, 40)]));
        if (c.kind === 'oso') t.add(mat(c.finish, 'handle'), t.box([-9, c0 + 4, z + c.d / 2 - 6], [9, c1 - 4, z + c.d / 2 + 4]));
        else {
          t.add(mat(FINISH.chrome, 'fastener', ' · T-screw'), t.cylZ(z + c.d / 2 - 2, z + c.d / 2 + 16, 9, 0, (c0 + c1) / 2, 20));
          t.add(mat(FINISH.chrome, 'fastener', ' · T-screw'), t.alongY(t.k(t.k(t.M.cylinder(40, 3, 3, 16)).rotate([0, 90, 0])), (c0 + c1) / 2, -20, z + c.d / 2 + 14));
        }
      }
    }
  });
}
export function buildFixedDumbbell(api: ManifoldAPI, s: DumbbellShape): SolidPart[] {
  switch (s.kind) {
    case 'hex': return buildHex(api, s);
    case 'urethane': return buildUrethane(api, s);
    case 'pro': return buildPro(api, s);
    case 'cast': return buildCast(api, s);
    case 'fatbell': return buildFatbell(api, s);
    case 'loadable': return buildLoadable(api, s);
  }
}
export const buildDumbbellPart = (id: string) => (api: ManifoldAPI, p: NumericParams) => buildFixedDumbbell(api, dumbbellShape(id, p));
export const definitions: PartDefinition[] = PARTS.map(part => floorDefinition(part, buildDumbbellPart(part.id)));
