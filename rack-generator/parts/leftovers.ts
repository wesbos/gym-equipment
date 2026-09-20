/** Catalog leftovers (#176): Manifold builders for the floor entries in ../floor-parts/leftovers.ts.
 * The combo rack and the Nordic bench live in ./leftovers-machines.ts; the wall strips in ./leftovers-wall.ts.
 * Floor axes: Z up, origin on the floor; landmine handles run along X (the bar axis), loaded onto the +X sleeve. */
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { BAR } from '../floor-parts/barbell.ts';
import {
  TITAN_VIKING_HANDLE, ROGUE_PARALLEL_HANDLE, TITAN_STRAIGHT_HANDLES, ROGUE_POST_LANDMINE, TSS_COMBO_RACK, THERABAND_FLEXBAR, FREAK_NORDIC_MINI_PRO,
  VIKING, vikingReach, PARALLEL, parallelLayout, STRAIGHT, POST_LANDMINE, postLayout, postPlate, FLEXBAR, flexbarLevel, inch,
} from '../floor-parts/leftovers.ts';
import { buildPlateStack } from './plates.ts';
import { kit, finish, olympicBar, powder, alongX, hull2, intersect, BADGE, ZINC, type Kit } from './leftovers-kit.ts';
import { buildTssComboRack, buildNordicMiniPro } from './leftovers-machines.ts';

const X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0];
const loadedFlag = (p: NumericParams) => { if (p.loaded !== 0 && p.loaded !== 1) throw Error('Unsupported landmine handle pose.'); return p.loaded === 1; };
/** A 20 kg bar whose +X sleeve end sits at `endX`, axis at height z. */
const barTo = (k: Kit, endX: number, z: number) => olympicBar(k, [endX - BAR.length / 2, 0, z], X);

// ── Titan Viking Press Landmine Handle ──────────────────────────────────────────────────────────────
const TITAN_BLACK = powder('Titan black powder-coated 11 ga steel', '#1b1c1e', .62, .35);
const KNOB = finish('Black stop-pin knob', 'handle', '#141516', 0, .55);
export function buildTitanViking(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const loaded = loadedFlag(p);
  return kit(api, k => {
    const r = VIKING.tube / 2, z = VIKING.sleeveOD / 2, L = VIKING.length, [inner, outer] = VIKING.posts;
    const frame: ReturnType<Kit['rod']>[] = [k.rod([0, -L / 2, z], Y, L, r, 40)];
    for (const s of [-1, 1]) {
      for (const c of [inner, outer]) frame.push(k.rod([0, s * c / 2, z], X, vikingReach, r, 40));
      frame.push(k.rod([vikingReach, s * VIKING.gripGap / 2, z], [0, s, 0], VIKING.grip, r, 40));
    }
    // 5" slide-over sleeve welded to the crossbar, bored for a 50 mm bar sleeve.
    const x0 = -r - VIKING.sleeve;
    const sleeve = k.cut(k.rod([x0, 0, z], X, VIKING.sleeve + r * .6, z, 48), [k.rod([x0 - 1, 0, z], X, VIKING.sleeve + 1 - r * .1, VIKING.sleeveID / 2, 48)]);
    k.add(TITAN_BLACK, k.union([...frame, sleeve]));
    // Threaded stop pin: zinc stud and a black T-knob on top of the sleeve.
    const kx = x0 + VIKING.knobAt, { stud, h, w } = VIKING.knob;
    k.add(ZINC, k.cyl(stud + 2, 5, 'z', [kx, 0, 2 * z + stud / 2 - 1], 16));
    k.add(KNOB, k.cyl(h, 11, 'z', [kx, 0, 2 * z + stud + h / 2], 24), k.span([kx - 6, -w / 2, 2 * z + stud + 2], [kx + 6, w / 2, 2 * z + stud + h]));
    if (loaded) barTo(k, -r - 4, z);
  });
}

// ── Rogue Parallel Landmine Handle ──────────────────────────────────────────────────────────────────
const ROGUE_BLACK = powder('Rogue textured black powder-coated ¼″ plate', '#1c1d1f', .78, .3);
const ROGUE_GRIP = finish('Textured powder-coated handles', 'handle', '#202123', .3, .8);
const END_CAP = finish('Black handle end caps', 'source', '#111213', 0, .6);
export function buildRogueParallel(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const loaded = loadedFlag(p), l = parallelLayout(p);
  return kit(api, k => {
    const zb = l.axisZ, zh = zb + PARALLEL.rise, S = PARALLEL.spacing / 2, t = PARALLEL.plate, gr = l.d / 2;
    // Plate outline: hull of the two handle ears and the bar lug, with the saddle scooped between the ears.
    const ears = [-1, 1].map(s => k.circle([s * S, zh], l.ear, 48));
    let outline = hull2(k, [...ears, k.circle([0, zb], l.lug, 48)]);
    const saddleR = inch(4.2);
    const side = (zz: number) => l.lug + (zz - zb) * (l.width / 2 - l.lug) / PARALLEL.rise - inch(.85);
    // Two trapezoid windows under the lettering, split by a centre web (counter-clockwise on both sides).
    const window = (s: number) => {
      const z1 = zb + inch(3.3), z2 = zb + inch(6), pts: [number, number][] = [[s * inch(.3), z1], [s * side(z1), z1], [s * side(z2), z2], [s * inch(.3), z2]];
      return k.poly(s > 0 ? pts : pts.reverse());
    };
    const windows = [window(-1), window(1)];
    outline = k.csCut(outline, [k.circle([0, zb + l.saddle + saddleR], saddleR, 64), k.circle([0, zb], PARALLEL.bore / 2, 48), ...windows]);
    const plates = [alongX(k, outline, t, l.faceX - t), alongX(k, outline, t, -l.faceX)];
    // Bore collars on the outer faces (the protective rings in the close-ups).
    const collarR = Math.min(l.lug - .8, PARALLEL.bore / 2 + 5), collar = (x0: number) => k.cut(k.rod([x0, 0, zb], X, 7, collarR, 40), [k.rod([x0 - 1, 0, zb], X, 9, PARALLEL.bore / 2, 40)]);
    k.add(ROGUE_BLACK, ...plates, collar(l.faceX), collar(-l.faceX - 7));
    const hl = PARALLEL.handle;
    for (const s of [-1, 1]) {
      k.add(ROGUE_GRIP, k.rod([-hl / 2, s * S, zh], X, hl, gr, 40));
      k.add(END_CAP, k.rod([hl / 2, s * S, zh], X, PARALLEL.cap, gr - .6, 32), k.rod([-hl / 2 - PARALLEL.cap, s * S, zh], X, PARALLEL.cap, gr - .6, 32));
    }
    // Laser-cut ROGUE lettering as plain badges on both outer faces.
    for (const s of [-1, 1]) {
      const x = s * l.faceX, bz = zb + inch(6.55);
      k.add(BADGE, k.span([Math.min(x, x + s * .4), -inch(3.3), bz], [Math.max(x, x + s * .4), inch(3.3), bz + inch(1.05)]));
    }
    if (loaded) barTo(k, PARALLEL.depth / 2 - 6, zb);
  });
}

// ── Titan Straight Landmine Handles ─────────────────────────────────────────────────────────────────
const RUBBER_GRIP = finish('Rubber-coated grips', 'handle', '#161718', 0, .82);
export function buildTitanStraight(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const loaded = loadedFlag(p);
  return kit(api, k => {
    const z = STRAIGHT.sleeveOD / 2, L = STRAIGHT.sleeve, ar = STRAIGHT.arm / 2, zg = z + STRAIGHT.rise, gy = STRAIGHT.span / 2 - STRAIGHT.grip;
    const sleeve = k.cut(k.rod([-L / 2, 0, z], X, L, z, 48), [k.rod([-L / 2 - 1, 0, z], X, L + 2, STRAIGHT.sleeveID / 2, 48)]);
    const steel = [sleeve];
    for (const s of [-1, 1]) {
      const a: Vec3 = [0, s * 10, 2 * z - 6], b: Vec3 = [0, s * gy, zg];
      const d = b.map((v, i) => v - a[i]) as Vec3;
      steel.push(k.rod(a, d, Math.hypot(...d), ar, 24), k.k(k.k(k.api.Manifold.sphere(ar, 24)).translate(b)), k.rod(b, [0, s, 0], 14, ar, 24));
      // Rubber grip over the arm end, with a slightly smaller rounded tip.
      k.add(RUBBER_GRIP, k.rod([0, s * (gy + 8), zg], [0, s, 0], STRAIGHT.grip - 12, STRAIGHT.gripD / 2, 32), k.rod([0, s * (STRAIGHT.span / 2 - 4), zg], [0, s, 0], 4, STRAIGHT.gripD / 2 - 2.5, 32));
    }
    k.add(TITAN_BLACK, k.union(steel));
    if (loaded) barTo(k, L / 2 - 4, z);
  });
}

// ── Rogue Post Landmine ─────────────────────────────────────────────────────────────────────────────
const PRINT = finish('White ROGUE print', 'source', '#e9e9e6', 0, .5);
export function buildRoguePostLandmine(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const l = postLayout(p), { plate } = postPlate(p), P = POST_LANDMINE, c = P.clevis;
  return kit(api, k => {
    k.extra.push(...buildPlateStack(k.api, [plate, plate], { origin: [0, 0, 0], axis: [0, 0, 1], name: 'Base plate', segments: 64, detail: 'simple' }));
    const pr = P.postD / 2, gap = P.sleeveOD / 2 + 1.5, top = P.post + c.base;
    const steel = [k.cyl(P.post, pr, 'z', [0, 0, P.post / 2], 40), k.span([-c.w / 2, -gap - c.t, P.post], [c.w / 2, gap + c.t, top])];
    for (const s of [-1, 1]) {
      const cheek = k.k(k.k(roundTop(k, c.w, c.h).extrude(c.t)).rotate([90, 0, 0]));
      steel.push(k.k(cheek.translate([0, s > 0 ? gap + c.t : -gap, top])));
    }
    // Pivot sleeve: closed pivot end, open bar end.
    const dir: Vec3 = [Math.cos(l.a), 0, Math.sin(l.a)], at = (s: number): Vec3 => { const [x, zz] = l.along(s); return [x, 0, zz]; };
    const sl = l.s1 - l.s0, R = P.sleeveOD / 2;
    steel.push(k.cut(k.rod(at(l.s0), dir, sl, R, 48), [k.rod(at(18), dir, sl, P.sleeveID / 2, 48)]));
    k.add(ROGUE_BLACK, k.union(steel));
    // 3/4" pivot bolt with hex head and nut outside the cheeks.
    const outer = gap + c.t;
    k.add(ZINC, k.cyl(2 * outer + 18, P.bolt / 2, 'y', [0, 0, l.pivotZ], 24), k.cyl(11, 16, 'y', [0, outer + 5.5, l.pivotZ], 6), k.cyl(14, 16, 'y', [0, -outer - 7, l.pivotZ], 6));
    // Printed ROGUE band on the top of the sleeve (plain white band, no artwork).
    const band = k.cut(k.rod(at(l.s0 + sl * .14), dir, sl * .42, R + .35, 48), [k.rod(at(l.s0 + sl * .14 - 1), dir, sl * .42 + 2, R - .2, 48)]);
    const upper = k.k(k.k(k.api.Manifold.cube([sl * 2, R * 1.4, R * 2], true)).translate([0, 0, R * 1.05]));
    const upperPose = k.k(k.k(upper.rotate([0, -p.angle, 0])).translate(at(l.s0 + sl * .35)));
    k.add(PRINT, intersect(k, band, upperPose));
  });
}
/** Clevis cheek: w × h with a rounded top, section in (x, z). */
function roundTop(k: Kit, w: number, h: number) {
  return k.csUnion([k.rect([-w / 2, 0], [w / 2, h - w / 2]), k.circle([0, h - w / 2], w / 2, 40)]);
}

// ── Theraband FlexBar ───────────────────────────────────────────────────────────────────────────────
export function buildFlexbar(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const lv = flexbarLevel(p), R = lv.d / 2, L = FLEXBAR.length;
  const rubber = finish(`${lv.name.split(' ·')[0]} natural-rubber FlexBar`, 'source', lv.color, 0, .62);
  return kit(api, k => {
    const n = FLEXBAR.ridges * 8;
    const ridged = (scale: number) => k.poly(Array.from({ length: n }, (_, i) => {
      const th = i / n * Math.PI * 2, r = scale * R * (1 - FLEXBAR.ridge * (1 - Math.cos(FLEXBAR.ridges * th)) / 2);
      return [r * Math.cos(th), r * Math.sin(th)] as [number, number];
    }));
    const sec = ridged(1), chamfer = 5;
    // Body plus two eased ends (the moulded ends are softly rounded). The ridged section is symmetric under a half
    // turn, so the −X end is the +X end spun 180° about Z.
    const end = alongX(k, sec, chamfer, L / 2 - chamfer, .88);
    const bar = k.union([alongX(k, sec, L - 2 * chamfer, -L / 2 + chamfer), end, k.k(end.rotate([0, 0, 180]))]);
    k.add(rubber, k.k(bar.translate([0, 0, R])));
    // Printed THERABAND band along the top ridges (plain white strip).
    const skin = k.cut(alongX(k, ridged(1.012), 120, -60), [alongX(k, ridged(1), 124, -62)]);
    k.add(PRINT_WHITE, k.k(intersect(k, skin, k.span([-61, -R * .32, R * .55], [61, R * .32, R * 1.2])).translate([0, 0, R])));
  });
}
const PRINT_WHITE = finish('White THERABAND print', 'source', '#f2f2ee', 0, .45);

export const definitions: PartDefinition[] = [
  floorDefinition(TITAN_VIKING_HANDLE, buildTitanViking),
  floorDefinition(ROGUE_PARALLEL_HANDLE, buildRogueParallel),
  floorDefinition(TITAN_STRAIGHT_HANDLES, buildTitanStraight),
  floorDefinition(ROGUE_POST_LANDMINE, buildRoguePostLandmine),
  floorDefinition(TSS_COMBO_RACK, buildTssComboRack),
  floorDefinition(THERABAND_FLEXBAR, buildFlexbar),
  floorDefinition(FREAK_NORDIC_MINI_PRO, buildNordicMiniPro),
];
