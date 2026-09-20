/** Dip attachment builders (#134). Layout numbers come from ../rack-parts/rack-dips-landmines-dips.ts (shared with
 * the collision bodies). Source frame: origin on the upright centreline at the target hole axis, +Y out of the face. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec2, Vec3 } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { vendorSolid } from './vendor-solid.ts';
import { kit, type Scope } from './rack-dips-landmines-kit.ts';
import {
  BOS_DIP, BOS_Y_DIP, MUTANT_HANDLES, mmHandleLayout, bosDipLayout, DROP_IN, dropInLayout, FRINGE_SWAN_NECK, MATADOR, matadorLayout, MUTANT_UDA, REP_DIP, REP_DIP_STATION, REP_DROP_IN_DIP,
  repDipLayout, ROGUE_MATADOR, SWAN, swanLayout, UDA, UDA_COLORS, udaLayout,
} from '../rack-parts/rack-dips-landmines-dips.ts';
const inch = (v: number) => v * 25.4;
type Finish = readonly [string, number, number];
const ZINC: Finish = ['#c5c9cc', .85, .28], UHMW: Finish = ['#1c1c1d', 0, .85], CAP: Finish = ['#151516', .05, .6], ORANGE: Finish = ['#e0661f', .05, .5];
/** Round bar a→b of diameter d (revolved along Y, then yawed/pitched into place), with optional chamfers. */
function rodAB(s: Scope, a: Vec3, b: Vec3, d: number, c0 = 0, c1 = 0, n = 40): Manifold {
  const K = kit(s), v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...v);
  const yaw = -Math.atan2(v[0], v[1]) * 180 / Math.PI, pitch = Math.asin(v[2] / L) * 180 / Math.PI;
  return s.keep(s.keep(s.keep(K.alongY(0, 0, 0, L, d / 2, c0, c1, n).rotate([pitch, 0, 0])).rotate([0, 0, yaw])).translate(a));
}
/** Rounded-rectangle outline (corner radius r) in a plane. */
function roundRect(s: Scope, x0: number, y0: number, x1: number, y1: number, r: number): CrossSection {
  return kit(s).roundRect(x0, y0, x1, y1, r, 20);
}
/** Detent / pull pin across the upright (along X at height z): shaft, head on +X, and a pull ring in the XZ plane. */
function crossPin(s: Scope, x0: number, x1: number, z: number, d: number, ring: Finish, name: string, ringName: string) {
  const K = kit(s);
  s.add(name, s.keep(s.M.union([K.alongX(0, z, x0, x1, d / 2, 1.5, 0, 32), K.alongX(0, z, x1, x1 + 8, d / 2 + 5, .8, 1.5, 32)])), 'fastener', ...ZINC);
  const loop = s.keep(s.keep(s.keep(K.circle(0, 0, 20, 32).subtract(K.circle(0, 0, 15, 32))).extrude(4)).rotate([90, 0, 0]));
  s.add(ringName, s.keep(loop.translate([x1 + 8 + 18, 2, z])), 'source', ...ring);
}
// ---------------- Mutant Metals UDA ----------------
export function buildUda(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...MUTANT_UDA.defaults, ...params }, g = udaLayout(p), U = UDA, frame: Finish = [UDA_COLORS[p.color]?.[1] ?? '#1f2022', .35, .68];
  const handleFinish: Finish = p.handles ? ['#2a2b2d', .55, .55] : ['#bcc0c3', .88, .4];
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, top = g.zb + U.cupH, [py0, py1] = g.plateY, t = g.t;
    // Side plates: a fin outline, the top-front corner cut away in a concave sweep up to the upright.
    const fin = (topZ: number) => {
      const low = g.zb + 70, dy = py1 - (py0 + 40), dz = top - low, arc: Vec2[] = Array.from({ length: 13 }, (_, i) => { const a = i / 12 * Math.PI / 2; return [py1 - dy * Math.sin(a), low + dz * (1 - Math.cos(a))]; });
      const outline = K.poly([[py0, g.zb], [py1, g.zb], ...arc, [py0, top]]);
      return topZ >= top ? outline : s.keep(outline.intersect(K.rect(py0 - 1, g.zb - 1, py1 + 1, topZ)));
    };
    add('Pin side plate', K.plateYZ(fin(top), g.plateX[0], g.plateX[1]), 'source', ...frame);
    add('Far side plate', K.plateYZ(fin(p.hardware ? top : U.shortTop), -g.plateX[1], -g.plateX[0]), 'source', ...frame);
    add('UHMW cup liners', s.keep(s.M.union([box([U.liner - .4, py1 - py0 - 30, 60], [g.f + U.liner / 2 + .2, (py0 + py1) / 2 - 8, g.zb + 45]), box([U.liner - .4, py1 - py0 - 30, 60], [-g.f - U.liner / 2 - .2, (py0 + py1) / 2 - 8, g.zb + 45]), box([2 * g.f - 20, U.liner - .4, 40], [0, g.f + U.liner / 2 + .2, g.zb + t / 2])])), 'liner', ...UHMW);
    // 2x2 web between the plates, the spine and its gusset, then the bat-wing crossbar.
    add('2x2 web tube', box([2 * g.plateX[1], t, t], [0, (g.webY + g.webF) / 2, g.zc]), 'source', ...frame);
    add('Spine', box([t, g.cb0 - g.webF + 1, t], [0, (g.webF + g.cb0) / 2, g.zc]), 'source', ...frame);
    add('Spine gusset', K.plateYZ(K.poly([[g.webF, g.zb + t - 1], [g.cb0 - 6, g.zb + t - 1], [g.webF, g.zb + t + 58]]), -4.75, 4.75), 'source', ...frame);
    add('Crossbar centre', box([U.centre + 2, t, t], [0, g.cb0 + t / 2, g.zc]), 'source', ...frame);
    const holes = s.keep(s.M.union(([1, -1] as const).flatMap(side => U.holes.map(h => { const [hx, hy] = g.hole(h); return rodAB(s, [side * (hx - g.normal[0] * 40), hy - g.normal[1] * 40, g.zc], [side * (hx + g.normal[0] * 40), hy + g.normal[1] * 40, g.zc], 27, 0, 0, 24); }))));
    for (const side of [1, -1] as const) {
      const c: Vec3 = [side * (g.wingStart[0] + g.dir[0] * U.wing / 2), g.wingStart[1] + g.dir[1] * U.wing / 2, g.zc];
      const wing = s.keep(s.keep(box([U.wing + t * Math.tan(g.a), t, t]).rotate([0, 0, -side * U.sweep])).translate(c));
      add(side > 0 ? 'Right wing' : 'Left wing', s.keep(wing.subtract(holes)), 'source', ...frame);
    }
    add('Storage pad', box([60, 14, 6], [0, g.cb0 + t / 2, g.zb + t + 3]), 'liner', ...UHMW);
    // Mount: welded 1 in stainless J-cup pin, or the 5/8 in detent pin with its orange pull ring.
    if (p.hardware) crossPin(s, -g.plateX[1] - 6, g.plateX[1] + 2, 0, inch(5 / 8), ORANGE, '5/8 in detent pin', 'Orange pull loop');
    else add('1 in stainless mount pin', s.keep(s.M.union([K.alongX(0, 0, g.plateX[0] - U.pinLen, g.plateX[1], U.pin / 2, 1.5, 0, 40), K.alongX(0, 0, g.plateX[1], g.plateX[1] + 2.5, U.pin / 2 + 5, 0, 1, 40)])), 'fastener', '#c3c7ca', .85, .35);
    // Handles on the wing normals: threaded 1 in pin with a knurled knob behind, plastic washer, shoulder, knurled grip.
    for (const side of [1, -1] as const) {
      const h = g.handle(side), yaw = -side * U.sweep, at = (y0: number, y1: number, r: number, c0 = 0, c1 = 0, n = 40) =>
        s.keep(s.keep(K.alongY(0, 0, y0, y1, r, c0, c1, n).rotate([0, 0, yaw])).translate([h.root[0], h.root[1], g.zc]));
      add('Knurled knob', at(h.knob0, -t / 2, U.knob[0] / 2, 1.5, 1, 48), 'handle', '#1c1d1f', .5, .75);
      add('Handle pin', at(h.knob0 - 4, t / 2 + U.washer, U.pin / 2, 1, 0, 32), 'source', ...handleFinish);
      add('Plastic washer', at(t / 2, t / 2 + U.washer, 22, 0, 0, 40), 'liner', ...UHMW);
      add('Handle shoulder', at(t / 2 + U.washer, h.grip0, U.shoulder[0] / 2, .8, 0, 40), 'source', ...handleFinish);
      add('Knurled grip', at(h.grip0, h.grip1, h.d / 2, 0, 2, 40), 'handle', handleFinish[0], handleFinish[1], .62);
      add('Knurl marks', s.keep(s.M.union([1, 2].map(i => at(h.grip0 + i * inch(6) - 1.5, h.grip0 + i * inch(6) + 1.5, h.d / 2 + .25, 0, 0, 40)))), 'handle', '#6e7275', .7, .5);
    }
  });
}
// ---------------- Mutant Metals Handles ----------------
export function buildMutantHandle(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...MUTANT_HANDLES.defaults, ...params }, g = mmHandleLayout(p), U = UDA, finish: Finish = p.handles ? ['#2a2b2d', .55, .55] : ['#bcc0c3', .88, .4];
  return vendorSolid(api, s => {
    const K = kit(s), { add } = s;
    add('Knurled knob', K.alongY(0, 0, g.knob[0], g.knob[1], U.knob[0] / 2, 1.5, 1, 48), 'handle', '#1c1d1f', .5, .75);
    add('Threaded 1 in pin', K.alongY(0, 0, g.knob[0] - 4, g.shoulder0, U.pin / 2, 1, 0, 32), 'source', ...finish);
    add('Plastic washer', K.alongY(0, 0, g.f, g.shoulder0, 22, 0, 0, 40), 'liner', ...UHMW);
    add('Handle shoulder', K.alongY(0, 0, g.shoulder0, g.grip0, U.shoulder[0] / 2, .8, 0, 40), 'source', ...finish);
    add('Knurled grip', K.alongY(0, 0, g.grip0, g.grip1, g.d / 2, 0, 2, 40), 'handle', finish[0], finish[1], .62);
    add('Knurl marks', s.keep(s.M.union([1, 2].map(i => K.alongY(0, 0, g.grip0 + i * inch(6) - 1.5, g.grip0 + i * inch(6) + 1.5, g.d / 2 + .25, 0, 0, 40)))), 'handle', '#6e7275', .7, .5);
  });
}
// ---------------- Rogue Monster Lite Matador ----------------
export function buildMatador(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MATADOR.defaults, ...params }, g = matadorLayout(p), M = MATADOR, BLACK: Finish = ['#1d1e20', .32, .7];
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, back = g.web[1] - M.depth;
    add('Channel web', box([2 * g.flangeX[1], M.plate, M.h], [0, (g.web[0] + g.web[1]) / 2, M.top - M.h / 2]), 'source', ...BLACK);
    const flange = roundRect(s, back, g.bottom, g.web[1], M.top, 12);
    add('Channel flanges', s.keep(s.M.union([K.plateYZ(flange, g.flangeX[0], g.flangeX[1]), K.plateYZ(flange, -g.flangeX[1], -g.flangeX[0])])), 'source', ...BLACK);
    add('Spine', box([M.spine[0], g.cy0 - g.web[1] + 1, M.spine[1]], [0, (g.web[1] + g.cy0) / 2, g.zc]), 'source', ...BLACK);
    add('Gusset', K.plateYZ(K.poly([[g.web[1] - .5, g.zBot + .5], [g.web[1] - .5, g.bottom + 22], [g.cy0 - 12, g.zBot + .5]]), -3.2, 3.2), 'source', ...BLACK);
    add('Crossbar', box([M.cross[0], M.cross[1], M.spine[1]], [0, (g.cy0 + g.cy1) / 2, g.zc]), 'source', ...BLACK);
    add('Crossbar end caps', s.keep(s.M.union([1, -1].map(side => box([3, M.cross[1] - 2, M.spine[1] - 2], [side * (M.cross[0] / 2 + 1.5), (g.cy0 + g.cy1) / 2, g.zc])))), 'source', ...CAP);
    for (const side of [1, -1] as const) {
      const h = g.handle(side);
      add('1-7/8 in handle', rodAB(s, h.a, h.b, M.handle, 1, 3, 48), 'handle', '#222325', .3, .72);
      const dir: Vec3 = [(h.b[0] - h.a[0]), h.b[1] - h.a[1], 0], L = Math.hypot(dir[0], dir[1]), tip: Vec3 = [h.b[0] + dir[0] / L * 4, h.b[1] + dir[1] / L * 4, h.b[2]];
      add('Handle end cap', rodAB(s, [h.b[0] - dir[0] / L, h.b[1] - dir[1] / L, h.b[2]], tip, M.handle - 1, 0, 3, 40), 'source', ...CAP);
    }
    if (p.pin) {
      add('1 in Matador detent pin', s.keep(s.M.union([K.alongX(0, 0, -g.flangeX[1] - 10, g.flangeX[1], 12.7, 1.5, 0, 40), K.alongX(0, 0, g.flangeX[1], g.flangeX[1] + 12, 19, 1, 1.5, 40)])), 'fastener', ...ZINC);
      const ring = s.keep(s.keep(s.keep(K.circle(0, 0, 25, 40).subtract(K.circle(0, 0, 20, 40))).extrude(5)).rotate([90, 0, 0]));
      add('Steel pull ring', s.keep(ring.translate([g.flangeX[1] + 12 + 22, 2.5, 0])), 'fastener', '#9da1a4', .85, .35);
    } else crossPin(s, -g.flangeX[1] - 12, g.flangeX[1], 0, inch(5 / 8), ORANGE, '5/8 x 4 in detent pin', 'Orange pull loop');
  });
}
// ---------------- REP Fitness Dip Station ----------------
export function buildRepDipStation(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_DIP_STATION.defaults, ...params }, g = repDipLayout(p), R = REP_DIP, BLACK: Finish = ['#1e1f22', .32, .72], d = p.series ? inch(1) : inch(5 / 8);
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, back = g.w1 - R.depth, armZ0 = R.armTop - R.arm[1];
    add('C-cup web', box([2 * g.w1, R.plate, R.h], [0, (g.w0 + g.w1) / 2, R.top - R.h / 2]), 'source', ...BLACK);
    const flange = roundRect(s, back, g.bottom, g.w1, R.top, 14);
    add('C-cup flanges', s.keep(s.M.union([K.plateYZ(flange, g.w0, g.w1), K.plateYZ(flange, -g.w1, -g.w0)])), 'source', ...BLACK);
    add('Plastic cup liners', s.keep(s.M.union([1, -1].map(side => box([R.liner - .3, R.depth - 18, R.h - 30], [side * (g.f + R.liner / 2 + .15), (back + g.w1) / 2 + 4, R.top - R.h / 2])))), 'liner', ...UHMW);
    add('Mount peg', K.alongX(0, 0, g.w0 - 58, g.w1 + 3, d / 2, 1.5, 1, 32), 'source', ...BLACK);
    add('Lock pin', K.alongX(0, g.pinZ, -g.w1 - 6, g.w1 + 8, d / 2, 1.5, 0, 32), 'fastener', ...ZINC);
    add('Red pull knob', s.keep(s.M.union([K.alongX(0, g.pinZ, g.w1 + 8, g.w1 + 34, 14, 1, 3, 32), box([10, 12, 44], [g.w1 + 26, 0, g.pinZ])])), 'source', '#c8202a', .05, .5);
    add('Arm', box([R.arm[0], R.armLen - (g.w1 - g.f) + 1, R.arm[1]], [0, (g.w1 + g.f + R.armLen) / 2, R.armTop - R.arm[1] / 2]), 'source', ...BLACK);
    const gz = g.bottom + 30;
    add('Gusset', K.plateYZ(K.poly([[g.w1 - .5, armZ0 + .5], [g.w1 - .5, gz], [g.f + 205, armZ0 + .5]]), -3, 3), 'source', ...BLACK);
    add('REP logo panels', s.keep(s.M.union([1, -1].map(side => box([.6, R.logo[0], R.logo[1]], [side * 3.2, g.w1 + 16 + R.logo[0] / 2, armZ0 - 34])))), 'source', '#e8e8e6', .05, .6);
    add('Crossbar', box([R.cross[0], R.cross[1], R.cross[2]], [0, g.f + (R.crossY[0] + R.crossY[1]) / 2, R.crossTop - R.cross[2] / 2]), 'source', ...BLACK);
    add('Crossbar end caps', s.keep(s.M.union([1, -1].map(side => box([3, R.cross[1] - 2, R.cross[2] - 2], [side * (R.cross[0] / 2 + 1.5), g.f + (R.crossY[0] + R.crossY[1]) / 2, R.crossTop - R.cross[2] / 2])))), 'source', ...CAP);
    // Bolt-together arm: the handle section's square sleeve collar slides over the arm and takes two bolts.
    const [yy0, yy1] = R.yoke;
    add('Arm sleeve collar', box([R.arm[0] + 12, yy1 - yy0, R.arm[1] + 12], [0, g.f + (yy0 + yy1) / 2, R.armTop - R.arm[1] / 2]), 'source', ...BLACK);
    for (const by of [yy0 + 25, yy1 - 22]) {
      const bz = R.armTop - R.arm[1] / 2;
      // Hex head and nut as six-sided revolves along X.
      add('Yoke bolt', s.keep(s.M.union([K.alongX(g.f + by, bz, -R.arm[0] / 2 - 14, R.arm[0] / 2 + 6, 7.9, 0, 0, 24), K.alongX(g.f + by, bz, R.arm[0] / 2 + 6, R.arm[0] / 2 + 16, 13.9, 0, 0, 6), K.alongX(g.f + by, bz, -R.arm[0] / 2 - 12, -R.arm[0] / 2, 13.9, 0, 0, 6)])), 'fastener', ...ZINC);
    }
    for (const side of [1, -1] as const) {
      const h = g.handle(side);
      add('Handle', rodAB(s, h.a, h.b, R.handle, 0, 2, 48), 'handle', '#1f2023', .3, .72);
      const v = [h.b[0] - h.a[0], h.b[1] - h.a[1]], L = Math.hypot(v[0], v[1]);
      add('Handle end plug', rodAB(s, [h.b[0] - v[0] / L, h.b[1] - v[1] / L, h.b[2]], [h.b[0] + v[0] / L * 4, h.b[1] + v[1] / L * 4, h.b[2]], R.handle - 2, 0, 1.5, 40), 'source', ...CAP);
    }
  });
}
// ---------------- REP Fitness Drop-In Dip Attachment ----------------
export function buildRepDropIn(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_DROP_IN_DIP.defaults, ...params }, g = dropInLayout(p), D = DROP_IN, BLACK: Finish = ['#1d1e21', .3, .74], d = p.series ? inch(1) : inch(5 / 8);
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, fx = [g.f + D.liner, g.f + D.liner + D.plate];
    // Main plate (parallel to the rack face) with the laser-cut mountain outline.
    const outline = K.poly([[g.xo, -g.half], [g.xi, -g.half], [g.xi, g.armZ[1]], [g.xo - D.topFlat, g.half], [g.xo, g.half]]);
    const [xc, zp] = D.logo;
    const peak = K.poly([[xc, zp], [xc + 22, zp - 31], [xc + 8, zp - 24], [xc, zp - 33], [xc - 9, zp - 24], [xc - 22, zp - 31]]);
    const base = K.poly([[xc - 27, zp - 38], [xc - 9, zp - 29], [xc, zp - 38], [xc + 8, zp - 29], [xc + 27, zp - 38], [xc + 60, zp - 85], [xc - 60, zp - 85]]);
    add('Main plate', K.plateXZ(s.keep(outline.subtract(K.union2([peak, base]))), g.y0, g.y1), 'source', ...BLACK);
    // Double C-cup: two formed channels wrapping the upright, plastic lined.
    for (const [z0, z1] of g.cups) {
      const flange = roundRect(s, g.y1 - D.cupDepth, z0, g.y1, z1, 8);
      add('C-cup', s.keep(s.M.union([K.plateYZ(flange, fx[0], fx[1]), K.plateYZ(flange, -fx[1], -fx[0])])), 'source', ...BLACK);
      add('C-cup liners', s.keep(s.M.union([1, -1].map(side => box([D.liner - .3, D.cupDepth - 12, z1 - z0 - 12], [side * (g.f + D.liner / 2 + .15), g.y1 - D.cupDepth / 2, (z0 + z1) / 2])))), 'liner', ...UHMW);
    }
    add('J-cup peg', K.alongY(0, 0, g.f - 45, g.y0 + .2, d / 2, 1.5, 0, 32), 'source', ...BLACK);
    // Square arm along the plate's bottom edge, bolted on; the canted handle leaves its inner end.
    const armY = g.y1 + D.arm / 2, armZc = (g.armZ[0] + g.armZ[1]) / 2;
    add('Arm tube', box([g.xo - 12 - g.xi, D.arm, D.arm], [(g.xo - 12 + g.xi) / 2, armY, armZc]), 'source', ...BLACK);
    add('Arm end cap', box([3, D.arm - 2, D.arm - 2], [g.xi - 1.4, armY, armZc]), 'source', ...CAP);
    const vx = g.xo - 48;
    add('Square washer plate', box([46, 46, 5], [vx, armY, g.armZ[1] + 2.5]), 'fastener', ...ZINC);
    add('Vertical arm bolt', s.keep(s.M.union([K.alongZ(vx, armY, g.armZ[0] - 14, g.armZ[1] + 16, 7.9, 1, 0, 24), K.hexZ(vx, armY, g.armZ[1] + 5, g.armZ[1] + 15, 24), K.hexZ(vx, armY, g.armZ[0] - 12, g.armZ[0], 24)])), 'fastener', ...ZINC);
    const hx = g.xi + 75;
    add('Horizontal arm bolt', s.keep(s.M.union([K.alongY(hx, armZc, g.y0 - 14, g.y1 + D.arm + 12, 7.9, 1, 0, 24), K.hexY(hx, armZc, g.y1 + D.arm, g.y1 + D.arm + 10, 24), K.hexY(hx, armZc, g.y0 - 12, g.y0, 24)])), 'fastener', ...ZINC);
    const h = g.handle, v = [h.b[0] - h.a[0], h.b[1] - h.a[1]], L = Math.hypot(v[0], v[1]);
    add('44 mm handle', rodAB(s, h.a, h.b, D.handle, 0, 2, 48), 'handle', '#1f2023', .3, .74);
    add('Handle end plug', rodAB(s, [h.b[0] - v[0] / L, h.b[1] - v[1] / L, h.b[2]], [h.b[0] + v[0] / L * 3, h.b[1] + v[1] / L * 3, h.b[2]], D.handle - 2, 0, 1.2, 40), 'source', ...CAP);
    if (p.mirror === 1) for (const part of s.parts) part.solid = s.keep(part.solid.mirror([1, 0, 0]));
  });
}
// ---------------- Bells of Steel Y Dip Bar ----------------
export function buildBosYDip(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BOS_Y_DIP.defaults, ...params }, g = bosDipLayout(p), B = BOS_DIP, BLACK: Finish = ['#212225', .32, .72], d = g.mtc ? inch(1) : 16;
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, back = g.w1 - 70, plate = g.px[1] - g.px[0];
    add('Cup web', box([2 * g.w1, plate, B.top - B.bottom], [0, g.w1 - plate / 2, (B.top + B.bottom) / 2]), 'source', ...BLACK);
    add('Tall cup plate', K.plateYZ(roundRect(s, back, B.bottom, g.w1, B.top, 10), g.px[0], g.px[1]), 'source', ...BLACK);
    add('Short cup plate', K.plateYZ(roundRect(s, back, B.bottom, g.w1, B.shortTop, 10), -g.px[1], -g.px[0]), 'source', ...BLACK);
    if (g.mtc) add('UHMW liners', s.keep(s.M.union([1, -1].map(side => box([B.mtc.liner - .3, 60, side > 0 ? B.top - B.bottom - 20 : B.shortTop - B.bottom - 20], [side * (g.f + B.mtc.liner / 2 + .15), back + 36, side > 0 ? (B.top + B.bottom) / 2 : (B.shortTop + B.bottom) / 2])))), 'liner', ...UHMW);
    add('Fixed peg', s.keep(s.M.union([K.alongX(0, 0, -g.f + 10, g.px[1], d / 2, 1.5, 0, 32), K.alongX(0, 0, g.px[1], g.px[1] + 3, d / 2 + 4, 0, 1, 32)])), 'source', ...BLACK);
    if (g.mtc) add('1 in lock pin', s.keep(s.M.union([K.alongX(0, g.pinZ, -g.px[1] - 8, g.px[1], 12.7, 1.5, 0, 32), K.alongX(0, g.pinZ, g.px[1], g.px[1] + 14, 17, 1, 2, 32)])), 'fastener', ...ZINC);
    else {
      crossPin(s, -g.px[1] - 12, g.px[1], g.pinZ, 16, ORANGE, '16 mm pull pin', 'Orange pull loop');
      const clip = s.keep(s.keep(s.keep(K.circle(0, 0, 11, 24).subtract(K.circle(0, 0, 9.5, 24))).extrude(3)).rotate([0, 90, 0]));
      add('R-clip', s.keep(clip.translate([-g.px[1] - 9, 0, g.pinZ - 9])), 'fastener', ...ZINC);
    }
    const spineEnd = g.f + (g.mtc ? B.mtc.spineY : B.bolt.spineY);
    add('Spine', box([g.s, spineEnd - g.w1 + 1, g.s], [0, (g.w1 + spineEnd) / 2, g.zb + g.s / 2]), 'source', ...BLACK);
    if (g.mtc) {
      const y0 = g.f + B.mtc.spineY, t = B.mtc.tube;
      add('Crossbar', box([B.mtc.cross, t, t], [0, y0 + t / 2, g.zc]), 'source', ...BLACK);
      add('Crossbar end caps', s.keep(s.M.union([1, -1].map(side => box([3, t - 2, t - 2], [side * (B.mtc.cross / 2 + 1.5), y0 + t / 2, g.zc])))), 'source', ...CAP);
      add('Storage pad', box([46, 40, 5], [0, (g.w1 + y0) / 2, g.zt + 2.5]), 'liner', ...UHMW);
    } else {
      const [sa0, sa1] = B.bolt.saddle, [st0, st1] = B.bolt.stub, t = inch(2), sw = g.s / 2 + B.bolt.plate;
      add('Saddle cap', s.keep(s.M.union([box([2 * sw, sa1 - sa0, B.bolt.plate], [0, g.f + (sa0 + sa1) / 2, g.zb + g.s + B.bolt.plate / 2]), ...[1, -1].map(side => box([B.bolt.plate, sa1 - sa0, g.s], [side * (g.s / 2 + B.bolt.plate / 2), g.f + (sa0 + sa1) / 2, g.zb + g.s / 2]))])), 'source', ...BLACK);
      for (const side of [1, -1] as const) {
        const x0 = sw, x1 = g.rootX;
        add('L-arm', s.keep(s.M.union([box([6.35, sa1 - sa0, g.s + 6], [side * (x0 + 3.2), g.f + (sa0 + sa1) / 2, g.zb + g.s / 2 + 3]), box([x1 - x0, st1 - st0, t], [side * (x0 + x1) / 2, g.f + (st0 + st1) / 2, g.zb + t / 2])])), 'source', ...BLACK);
      }
      for (const by of [sa0 + 7, sa1 - 7]) add('M12 x 75 bolt', s.keep(s.M.union([K.alongX(g.f + by, g.zb + g.s / 2, -sw - 15, sw + 13, 6, 0, 0, 20), K.alongX(g.f + by, g.zb + g.s / 2, sw + 6.35, sw + 14, 10, 0, 0, 6), K.alongX(g.f + by, g.zb + g.s / 2, -sw - 16, -sw - 6.35, 10, 0, 0, 6)])), 'fastener', ...ZINC);
    }
    for (const side of [1, -1] as const) {
      const h = g.handle(side), v = [h.b[0] - h.a[0], h.b[1] - h.a[1]], L = Math.hypot(v[0], v[1]);
      add('1.9 in handle', rodAB(s, h.a, h.b, B.handle, 1, 2, 48), 'handle', '#202124', .3, .72);
      add('Handle end caps', s.keep(s.M.union([rodAB(s, [h.b[0] - v[0] / L, h.b[1] - v[1] / L, h.b[2]], [h.b[0] + v[0] / L * 3, h.b[1] + v[1] / L * 3, h.b[2]], B.handle - 2, 0, 1.2, 40), rodAB(s, [h.a[0] - v[0] / L * 3, h.a[1] - v[1] / L * 3, h.a[2]], [h.a[0] + v[0] / L, h.a[1] + v[1] / L, h.a[2]], B.handle - 2, 1.2, 0, 40)])), 'source', ...CAP);
    }
  });
}
// ---------------- Fringe Sport The Swan Neck ----------------
export function buildSwanNeck(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...FRINGE_SWAN_NECK.defaults, ...params }, g = swanLayout(p), S = SWAN, BLACK: Finish = ['#1c1d1f', .3, .76];
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, w = S.plate[0] / 2, fy = g.f + S.plate[1];
    add('Wall plate', K.plateXZ(roundRect(s, -w, g.low - 38, w, 38, 10), g.f, fy), 'source', ...BLACK);
    for (const z of [0, g.low]) {
      add('M24 mounting bolt', s.keep(s.M.union([K.alongY(0, z, -g.f - 26, fy + 14, 12, 1, 0, 32), K.hexY(0, z, fy, fy + 15, 36)])), 'fastener', ...ZINC);
      add('M24 nut', K.hexY(0, z, -g.f - 20, -g.f, 36), 'fastener', ...ZINC);
    }
    const leaf = K.hull2([K.rect(-w, fy - .5, w, g.hinge), K.circle(0, g.hinge, w, 40)]);
    add('Hinge leaves', s.keep(s.M.union([K.plateXY(leaf, g.leafTop[0], g.leafTop[1]), K.plateXY(leaf, g.leafBot[0], g.leafBot[1])])), 'source', ...BLACK);
    add('Hinge pin', s.keep(s.M.union([K.alongZ(0, g.hinge, g.leafBot[0] - 12, g.leafTop[1] + 4, 11, 0, 0, 32), K.hexZ(0, g.hinge, g.leafTop[1], g.leafTop[1] + 12, 30), K.hexZ(0, g.hinge, g.leafBot[0] - 12, g.leafBot[0], 30)])), 'fastener', ...ZINC);
    const popY = fy + 26;
    add('Pop-pin body', s.keep(s.M.union([K.hexZ(-14, popY, g.leafTop[1], g.leafTop[1] + 16, 22), K.alongZ(-14, popY, g.leafTop[1] + 16, g.leafTop[1] + 24, 5, 0, 0, 20)])), 'fastener', ...ZINC);
    add('Red pop-pin knob', K.alongZ(-14, popY, g.leafTop[1] + 24, g.leafTop[1] + 44, 13, 1, 3, 32), 'source', '#c8102e', .15, .4);
    // Swivel box (2x3 on edge) on the hinge, a through hole for the lever arm's pin, the post and its slotted hook tab.
    const holeY = g.y1 - 42, zc = (g.boxZ[0] + g.boxZ[1]) / 2;
    const swivel = box([S.box[0], g.y1 - (g.hinge - S.box[1]), g.boxZ[1] - g.boxZ[0]], [0, (g.y1 + g.hinge - S.box[1]) / 2, zc]);
    add('Swivel box', s.keep(swivel.subtract(K.alongX(holeY, zc, -40, 40, 14.5, 0, 0, 32))), 'source', ...BLACK);
    add('Post', box([S.post, S.post, g.postTop - g.boxZ[1] + 1], [0, g.y1 - S.post / 2, (g.postTop + g.boxZ[1]) / 2]), 'source', ...BLACK);
    const tab = K.hull2([K.rect(g.y1 - 10, g.postTop - S.tab[2], g.y1 + S.tab[1] - S.tab[2] / 2, g.postTop), K.circle(g.y1 + S.tab[1] - S.tab[2] / 2, g.postTop - S.tab[2] / 2, S.tab[2] / 2, 32)]);
    const slot = K.union2([18, 34, 50].map(dy => K.circle(g.y1 + dy, g.postTop - S.tab[2] / 2, 10, 24)));
    add('Slotted hook tab', K.plateYZ(s.keep(tab.subtract(slot)), -S.tab[0] / 2, S.tab[0] / 2), 'source', ...BLACK);
    if (p.magpin) {
      add('5/8 in magpin', K.alongX(holeY, zc, -S.box[0] / 2 - 8, S.box[0] / 2, 7.9, 1.5, 0, 32), 'fastener', ...ZINC);
      add('Fringe magpin knob', K.alongX(holeY, zc, S.box[0] / 2, S.box[0] / 2 + 22, 19, 1, 3, 40), 'source', '#e0552a', .3, .4);
    }
  });
}
export const definitions: PartDefinition[] = [
  rackDefinition(MUTANT_UDA, buildUda),
  rackDefinition(MUTANT_HANDLES, buildMutantHandle),
  rackDefinition(ROGUE_MATADOR, buildMatador),
  rackDefinition(REP_DIP_STATION, buildRepDipStation),
  rackDefinition(REP_DROP_IN_DIP, buildRepDropIn),
  rackDefinition(BOS_Y_DIP, buildBosYDip),
  rackDefinition(FRINGE_SWAN_NECK, buildSwanNeck),
];
