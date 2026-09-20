/** Leg rollers, seats and pads that mount on the rack (#132): Manifold builders for the entries in ../rack-parts/rack-rollers-pads.ts.
 * Source frame (rack-part.ts): origin on the upright centreline at the target hole axis, +Y out of the mounting face
 * (face at y = upright / 2), X across the face, Z up. Every layout number comes from the metadata helpers so the
 * builds, collision bodies and extents agree. The revolved roller stacks follow parts/rep-leg-roller.ts. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import type { MaterialRole } from '../appearance.ts';
import { rackDefinition } from '../rack-part.ts';
import { DARKO_THRESHER_PAD, REP_UTILITY_SEAT, ROGUE_MULTI_USE_RACK_ROLLER } from '../rack-parts/rack-rollers-pads-v2.ts';
import { buildRackRoller, buildThresherPad, buildUtilitySeat } from './rack-rollers-pads-v2.ts';
import { vendorSolid } from './vendor-solid.ts';
import { revolveProfile } from './rogue-band-pegs.ts';
import {
  REP_LEG_ROLLER_2, REP_LR2, repLr2, ROGUE_MONSTER_SINGLE_LEG_ROLLER_2, ROGUE_SLR2, rogueSlr2, ROGUE_MONSTER_LITE_LEG_ROLLER, ROGUE_ML_ROLLER, rogueMlRoller,
  BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER, BOS_ROLLER, bosRoller, ROGUE_MONSTER_PRITCHETT_PAD, PRITCHETT, pritchettLayout, BELLS_OF_STEEL_SEAL_ROW_PAD, SEAL_ROW, sealRowLayout,
  REP_PEGASUS, PEGASUS, pegasusLayout, PRIME_PRODIGY_STABILITY_PAD, PRODIGY, prodigyLayout, PEGASUS_HANDLE, TITAN_RACK_MOUNTED_LEG_ROLLER, TITAN_ROLLER, titanRoller,
} from '../rack-parts/rack-rollers-pads.ts';
type Scope = Parameters<Parameters<typeof vendorSolid>[1]>[0];
type Finish = { color: string; metalness: number; roughness: number; role?: MaterialRole };
const F = (color: string, metalness: number, roughness: number, role: MaterialRole = 'source'): Finish => ({ color, metalness, roughness, role });
const REP_BLACK = F('#1d1e21', .45, .5), ROGUE_BLACK = F('#18191b', .4, .42), BOS_BLACK = F('#222326', .3, .72), PRIME_BLACK = F('#1f2023', .35, .68);
const ZINC = F('#c4c8cc', .85, .3), CHROME = F('#dde0e3', .95, .14), NICKEL = F('#9a9ea3', .9, .26), GUNMETAL = F('#45484c', .85, .34), MACHINED = F('#7d8186', .88, .3);
const VINYL = F('#26272a', 0, .78), CLEANGRIP = F('#232427', 0, .72), FOAM = F('#1f2022', 0, .9), UHMW = F('#2e2f31', 0, .6, 'liner');
const FASTENER = F('#2a2b2e', .7, .35, 'fastener'), WHITE = F('#eeeeec', 0, .55), GREEN = F('#8ed13a', .1, .45), ORANGE = F('#f06a1d', .1, .45), BRONZE = F('#b07a3e', .8, .35);
const DEG = Math.PI / 180;

/** Shared solids on top of the vendorSolid scope. */
function kit(v: Scope) {
  const { M, C } = v;
  /** Idempotent keep: every handle is owned (and deleted) exactly once, including the scope's own box/cylinder results. */
  const k = <T extends Manifold | CrossSection>(x: T): T => { if (!v.owned.includes(x)) v.keep(x); return x; };
  const add = (name: string, solid: Manifold, f: Finish) => v.add(name, solid, f.role ?? 'source', f.color, f.metalness, f.roughness);
  /** Revolved solid along +Y (axis at x, z) from y0 to y1, chamfered c0/c1 at its ends. */
  const alongY = (x: number, z: number, y0: number, y1: number, r: number, c0 = 0, c1 = 0, seg = 48) =>
    k(k(k(M.revolve([revolveProfile(r, y1 - y0, c0, c1)], seg)).rotate([-90, 0, 0])).translate([x, y0, z]));
  /** Same along +X (axis at y, z) from x0 to x1. */
  const alongX = (y: number, z: number, x0: number, x1: number, r: number, c0 = 0, c1 = 0, seg = 48) =>
    k(k(k(M.revolve([revolveProfile(r, x1 - x0, c0, c1)], seg)).rotate([0, 90, 0])).translate([x0, y, z]));
  /** Same along +Z (axis at x, y) from z0 to z1. */
  const alongZ = (x: number, y: number, z0: number, z1: number, r: number, c0 = 0, c1 = 0, seg = 48) =>
    k(k(M.revolve([revolveProfile(r, z1 - z0, c0, c1)], seg)).translate([x, y, z0]));
  const polar = (r: (a: number) => number, n: number) => k(new C([Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI; return [r(a) * Math.cos(a), r(a) * Math.sin(a)] as [number, number]; })]));
  /** Knurled (fine-toothed) or star-lobed disc cross-section. */
  const knurled = (r: number, teeth = 56, depth = .8) => polar(a => r - (Math.cos(a * teeth) > 0 ? 0 : depth), teeth * 4);
  const star = (r: number, lobes = 6) => polar(a => r * (.78 + .22 * Math.cos(a * lobes)), 96);
  /** Extruded cross-section laid along +Y from y0 (section X stays X, section Y becomes -Z). */
  const prismY = (s: CrossSection, y0: number, len: number, x = 0, z = 0) => k(k(k(s.extrude(len)).rotate([-90, 0, 0])).translate([x, y0, z]));
  /** Along +X from x0 (section X becomes -Z... section Y stays Y). */
  const prismX = (s: CrossSection, x0: number, len: number, y = 0, z = 0) => k(k(k(s.extrude(len)).rotate([0, 90, 0])).translate([x0, y, z]));
  /** Flat plate from a YZ outline, `thick` across X centred on x. */
  const plateYZ = (pts: [number, number][], thick: number, x: number) => k(k(k(k(new C([pts.map(([y, z]) => [y, z] as [number, number])], 'NonZero')).extrude(thick)).rotate([90, 0, 90])).translate([x - thick / 2, 0, 0]));
  /** Rectangular tube polyline in the YZ plane: `w` across X, `h` in-plane; corners filled by hulls of the end slabs. */
  const beam = (pts: [number, number][], w: number, h: number, x = 0) => {
    const slab = (at: [number, number], deg: number) => k(k(k(M.cube([w, .5, h], true)).rotate([deg, 0, 0])).translate([x, at[0], at[1]]));
    const angle = (a: [number, number], b: [number, number]) => Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;
    const parts: Manifold[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), t = angle(a, b);
      parts.push(k(k(k(M.cube([w, L, h], true)).rotate([t, 0, 0])).translate([x, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2])));
      if (i < pts.length - 1) parts.push(k(M.hull([slab(b, t), slab(b, angle(b, pts[i + 1]))])));
    }
    return k(M.union(parts));
  };
  /** Convex pillow pad from an outline in XY: thickness along +Z from z0, top edge rounded by r (and the bottom by rb). */
  const pillow = (s: CrossSection, t: number, r: number, rb = 0, z0 = 0) => {
    const slab = (inset: number, z: number) => k(k(k(inset > 0 ? k(s.offset(-inset, 'Round', 24)) : s).extrude(.2)).translate([0, 0, z0 + z]));
    const rings = [0, 30, 60, 90].map(a => a * DEG);
    return k(M.hull([
      ...rings.map(a => slab(r * (1 - Math.cos(a)), t - r + r * Math.sin(a) - (a ? .2 : 0))),
      ...(rb ? rings.map(a => slab(rb * (1 - Math.cos(a)), rb - rb * Math.sin(a))) : [slab(0, 0)]),
    ]));
  };
  const roundedPoly = (corners: [number, number, number][]) => k(C.hull(corners.map(([x, y, r]) => k(k(C.circle(r, 32)).translate([x, y])))));
  /** Radial folds on a gathered vinyl roller end at y (facing `side`), axis at x/z. */
  const gathers = (y: number, side: 1 | -1, r0: number, r1: number, x = 0, z = 0, n = 16) => {
    const ribs = Array.from({ length: n }, (_, i) => k(k(k(k(M.cube([3.2, 4, r1 - r0], true)).translate([0, 0, (r0 + r1) / 2])).rotate([0, i / n * 360 + 7, 0])).translate([x, y + side * 1.4, z])));
    return k(M.union(ribs));
  };
  /** Thin stitch ring around a Y-axis roller at y. */
  const stitchY = (y: number, r: number, x = 0, z = 0) => k(alongY(x, z, y - .7, y + .7, r + .5).subtract(alongY(x, z, y - 1, y + 1, r - 1.5)));
  const stitchX = (x: number, r: number, y = 0, z = 0) => k(alongX(y, z, x - .7, x + .7, r + .5).subtract(alongX(y, z, x - 1, x + 1, r - 1.5)));
  /** Frame of a YZ-plane rotation: local (u along, w up) about `origin` by `deg`. */
  const rotYZ = (m: Manifold, deg: number, origin: [number, number]) => k(k(m.rotate([deg, 0, 0])).translate([0, origin[0], origin[1]]));
  return { ...v, k, add, alongY, alongX, alongZ, knurled, star, prismY, prismX, plateYZ, beam, pillow, roundedPoly, gathers, stitchY, stitchX, rotYZ };
}
type Kit = ReturnType<typeof kit>;
const build = (api: ManifoldAPI, fn: (s: Kit) => void) => vendorSolid(api, v => fn(kit(v)));

/** Gathered-end vinyl roller along +Y from y0 to y1 (Rogue and BoS style). */
function gatheredRollerY(s: Kit, name: string, y0: number, y1: number, r: number, f: Finish, x = 0, z = 0) {
  s.add(name, s.alongY(x, z, y0, y1, r, r * .32, r * .32, 64), f);
  s.add('Gathered pad ends', s.k(s.M.union([s.alongY(x, z, y0 - 1.5, y0 + 5, r * .62, 1, 0), s.alongY(x, z, y1 - 5, y1 + 1.5, r * .62, 0, 1), s.gathers(y0 + 1, -1, r * .4, r * .68, x, z), s.gathers(y1 - 1, 1, r * .4, r * .68, x, z)])), f);
}

// ───────────────────────────── Leg rollers ─────────────────────────────

export function buildRepLegRoller2(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_LEG_ROLLER_2.defaults, ...params }, g = repLr2(p), r = REP_LR2.padDiameter / 2;
  return build(api, s => {
    // Nickel shaft through the upright to the threaded stud; the knob clamps the shoulder against the mounting face.
    s.add('Nickel-plated 1 in shaft', s.k(s.M.union([s.alongY(0, 0, g.knob0, -g.face + 2, 10.6, 1, 0, 32), s.alongY(0, 0, -g.face + 1, g.pad1 - 4, REP_LR2.shaft / 2, 0, 0, 40)])), NICKEL);
    s.add('Shoulder collar', s.alongY(0, 0, g.face, g.face + REP_LR2.shoulder[1], REP_LR2.shoulder[0] / 2, .8, 1.5, 48), F('#1a1b1d', .45, .45));
    s.add('Pad hub', s.alongY(0, 0, g.face + REP_LR2.shoulder[1] - .5, g.pad0 + 1, REP_LR2.hub[0] / 2, 0, 2, 48), F('#161719', .4, .5));
    s.add('Molded CleanGrip roller pad', s.alongY(0, 0, g.pad0, g.pad1, r, 11, 11, 72), CLEANGRIP);
    // Molded end faces with the radial "turbine" pattern and a seam ring near each end.
    const caps: Manifold[] = [];
    for (const [y, side] of [[g.pad0, -1], [g.pad1, 1]] as const) {
      caps.push(s.alongY(0, 0, y - (side < 0 ? .8 : 0), y + (side > 0 ? .8 : 0), r - 13));
      for (let i = 0; i < 22; i++) caps.push(s.k(s.k(s.k(s.M.cube([1.4, 1.6, 26], true)).translate([6, 0, 40])).rotate([0, i / 22 * 360, 0])).translate([0, y + side * 1.2, 0]));
    }
    s.add('Molded end caps', s.k(s.M.union(caps)), F('#1a1b1d', 0, .6));
    s.add('Pad seams', s.k(s.M.union([s.stitchY(g.pad0 + 16, r), s.stitchY(g.pad1 - 16, r), s.box([1.2, REP_LR2.pad - 40, 1.2], [r - .2, (g.pad0 + g.pad1) / 2, 0])])), F('#3a3b3e', 0, .7));
    s.add('End retaining nut', s.k(s.M.union([s.alongY(0, 0, g.pad1, g.pad1 + 12, 21, 0, 1.5), s.alongY(0, 0, g.pad1 + 11, g.tip, 15, 0, 1.5, 6)])), NICKEL);
    s.add('Knurled securing knob', s.k(s.k(s.prismY(s.knurled(REP_LR2.knob[0] / 2), g.knob0 + 2, REP_LR2.knob[1] - 2)).add(s.alongY(0, 0, g.knob0, g.knob0 + 2.5, REP_LR2.knob[0] / 2 - 3, 1.5, 0))), F('#131415', .3, .45));
  });
}
export function buildRogueSingleLegRoller2(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_SINGLE_LEG_ROLLER_2.defaults, ...params }, g = rogueSlr2(p), [cd, cl] = ROGUE_SLR2.collar;
  return build(api, s => {
    s.add('1 in threaded steel rod', s.alongY(0, 0, g.nut0 - 6, g.tip, ROGUE_SLR2.rod / 2, 1.5, 2, 40), F('#1c1d1f', .45, .55));
    s.add('Machined shaft collars', s.k(s.M.union([s.alongY(0, 0, g.face, g.pad0, cd / 2, .8, .8), s.alongY(0, 0, g.pad1, g.pad1 + cl, cd / 2, .8, .8)])), GUNMETAL);
    s.add('Collar set screws', s.k(s.M.union([s.cylinder(3, 5, [0, g.face + cl / 2, cd / 2 + 1.5], [0, 0, 0], 12), s.cylinder(3, 5, [0, g.pad1 + cl / 2, cd / 2 + 1.5], [0, 0, 0], 12)])), FASTENER);
    gatheredRollerY(s, '27 oz vinyl EPDM foam pad', g.pad0, g.pad1, ROGUE_SLR2.padDiameter / 2, VINYL);
    s.add('Knurled screw-on nut', s.k(s.k(s.prismY(s.knurled(ROGUE_SLR2.nut[0] / 2, 64, .7), g.nut0 + 2, ROGUE_SLR2.nut[1] - 4)).add(s.k(s.alongY(0, 0, g.nut0, g.nut0 + 2.5, ROGUE_SLR2.nut[0] / 2 - 4, 1.5, 0)).add(s.alongY(0, 0, -g.face - 2.2, -g.face, ROGUE_SLR2.nut[0] / 2 - 4, 0, 1)))), MACHINED);
  });
}
export function buildRogueMonsterLiteLegRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_LITE_LEG_ROLLER.defaults, ...params }, g = rogueMlRoller(p), R = ROGUE_ML_ROLLER, z = R.shaftZ, [pw, pt] = R.plate;
  return build(api, s => {
    const h = R.plateTop - g.bottom, cz = (R.plateTop + g.bottom) / 2, side = g.face + 1.5 + 3.2;
    // Hanger plate on the face, lower wrap channel around the upright sides, top pin through the upright.
    s.add('Hanger plate and wrap channel', s.k(s.M.union([
      s.box([pw, pt, h], [0, g.face + pt / 2, cz]),
      ...[-1, 1].map(x => s.box([6.35, g.face + 26, 64], [x * side, (g.face - 26) / 2 + pt / 2, g.detentZ])),
      s.box([2 * side + 6.35, pt, 64], [0, g.face + pt / 2, g.detentZ]),
    ])), ROGUE_BLACK);
    s.add('Top hanger pin', s.alongY(0, 0, -g.face - 36, g.face + pt + 8, R.pin / 2 - .3, 1.2, 1.2, 32), ROGUE_BLACK);
    s.add('0.625 in detent pin', s.alongX(0, g.detentZ, -side - 14, side + 12, R.pin / 2 - .4, 1.5, 0, 24), ZINC);
    const ring = s.k(s.k(s.k(s.k(s.C.circle(19, 32)).subtract(s.k(s.C.circle(13.5, 32)))).extrude(5.5)).rotate([90, 0, 0]));
    s.add('Orange detent pull ring', s.k(s.k(ring.translate([side + 30, 2.75, g.detentZ]))), ORANGE);
    s.add('Roller shaft', s.alongY(0, z, g.plate1 - 1, g.tip, R.rod / 2, 0, 1.5, 32), ROGUE_BLACK);
    s.add('Bright shaft collars', s.k(s.M.union([s.alongY(0, z, g.pad0 - R.collar[1], g.pad0 + 2, R.collar[0] / 2, .8, 0), s.alongY(0, z, g.pad1 - 2, g.pad1 + R.collar[1], R.collar[0] / 2, 0, .8)])), ZINC);
    gatheredRollerY(s, 'Vinyl-upholstered foot pad', g.pad0, g.pad1, R.padDiameter / 2, VINYL, 0, z);
  });
}
export function buildBosSplitSquatRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER.defaults, ...params }, g = bosRoller(p), B = BOS_ROLLER, [bh, bt, bd] = B.bracket;
  const pinR = p.hardware ? 12.3 : 7.8;
  if (![0, 1].includes(p.hardware)) throw Error('Unsupported Bells of Steel leg roller hardware.');
  return build(api, s => {
    const side = g.face + 1.5 + bt / 2;
    s.add('Open anti-rotation bracket', s.k(s.M.union([s.box([2 * side + bt, bt, bh], [0, g.face + bt / 2, 0]), ...[-1, 1].map(x => s.box([bt, bd, bh * .78], [x * side, g.face + bt - bd / 2, 0]))])), BOS_BLACK);
    s.add('Threaded mounting pin', s.alongY(0, 0, g.back + 2, g.pad1 - 12, pinR, 1, 0, 32), F('#26272a', .6, .45));
    s.add('Zinc thread', s.alongY(0, 0, g.back, -g.face + 4, pinR + .4, 1.2, 0, 32), ZINC);
    s.add('Chrome star knob', s.k(s.k(s.prismY(s.star(B.knob[0] / 2), g.knob0, B.knob[1] - 6)).add(s.alongY(0, 0, g.knob0 + B.knob[1] - 8, -g.face, 20, 0, 1.2, 40))), CHROME);
    s.add('Zinc pad bushings', s.k(s.M.union([s.alongY(0, 0, g.plate1 + B.standoff, g.pad0 + 3, B.bushing[0] / 2, .8, 0), s.alongY(0, 0, g.pad1 - 3, g.pad1 + B.bushing[1] - 6, B.bushing[0] / 2, 0, .8)])), ZINC);
    s.add('Pin tip', s.alongY(0, 0, g.pad1 + B.bushing[1] - 7, g.tip, 11, 0, 1.5, 24), F('#26272a', .6, .45));
    gatheredRollerY(s, 'Vinyl high-density foam pad', g.pad0, g.pad1, B.padDiameter / 2, F('#1f2022', 0, .74));
  });
}

export function buildTitanLegRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...TITAN_RACK_MOUNTED_LEG_ROLLER.defaults, ...params }, g = titanRoller(p), T = TITAN_ROLLER, r = T.padDiameter / 2;
  return build(api, s => {
    s.add('16 mm threaded pin', s.alongY(0, 0, g.knob0 - 3, g.pad1 - 10, T.pin / 2, 1, 0, 32), F('#232427', .7, .4));
    s.add('Rubber bumper', s.alongY(0, 0, g.face, g.face + T.bumper[1], T.bumper[0] / 2, 0, 1.2, 48), F('#121213', 0, .9, 'liner'));
    s.add('Black zinc hub', s.alongY(0, 0, g.face + T.bumper[1] - .5, g.pad0 + 2, T.hub[0] / 2, 0, 1.5, 40), F('#202124', .75, .4));
    gatheredRollerY(s, 'HeftyGrip vinyl foam pad', g.pad0, g.pad1, r, F('#1f2022', 0, .7));
    if (g.spacer) s.add('1 in T-3 spacer', s.alongY(0, 0, -g.face - g.spacer, -g.face, T.spacer[0] / 2, .8, .8, 40), F('#141516', .1, .7, 'liner'));
    s.add('Pad end disc and bolt', s.k(s.k(s.alongY(0, 0, g.pad1 - 1, g.pad1 + 3, 26, 0, .8, 40)).add(s.alongY(0, 0, g.pad1 + 2.5, g.tip, 7, 0, 1.5, 6))), F('#232427', .7, .4));
    s.add('Knurled knob', s.k(s.k(s.prismY(s.knurled(T.knob[0] / 2, 48, .8), g.knob0 + 2, T.knob[1] - 2)).add(s.alongY(0, 0, g.knob0 - 3, g.knob0 + 2.5, 13, 2, 0, 32))), F('#161719', .4, .45));
  });
}

// ───────────────────────────── Rogue Monster Pritchett Pad ─────────────────────────────

export function buildPritchettPad(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_PRITCHETT_PAD.defaults, ...params }, g = pritchettLayout(p), P = PRITCHETT, c = P.channel, arm = P.arm;
  if (![0, 1].includes(p.series)) throw Error('Unsupported Pritchett pad series.');
  return build(api, s => {
    const side = g.face + 1.6 + c.plate / 2, front = g.face + 1.6 + c.plate, [a, b, cc, end] = g.points;
    // Formed clasp channel around the front and sides of the upright, with a tab carrying the pin at the target hole.
    s.add('Clasp channel', s.k(s.M.union([
      s.box([2 * side + c.plate, c.plate, -30 - c.bottom], [0, front - c.plate / 2, (c.bottom - 30) / 2]),
      s.box([72, c.plate, c.top + 30], [0, front - c.plate / 2, (c.top - 30) / 2]),
      ...[-1, 1].map(x => s.box([c.plate, c.depth + c.plate + 1.6, -30 - c.bottom], [x * side, g.face - c.depth / 2 + (c.plate + 1.6) / 2, (c.bottom - 30) / 2])),
    ])), ROGUE_BLACK);
    s.add('UHMW channel lining', s.box([g.face * 2 - 6, 1.6, -40 - c.bottom], [0, g.face + .8, (c.bottom - 30) / 2]), UHMW);
    if (!p.series) s.add('Welded 1 in mounting pin', s.alongY(0, 0, g.face - P.pinReach, front + 12, 12.2, 1.5, 1, 40), ROGUE_BLACK);
    else {
      s.add('5/8 in hitch pin', s.alongY(0, 0, -g.face - 22, front + 16, 7.8, 1.5, 0, 24), ZINC);
      s.add('Hitch pin clip', s.k(s.k(s.k(s.k(s.k(s.C.circle(16, 32)).subtract(s.k(s.C.circle(13, 32)))).extrude(3)).rotate([90, 0, 0])).translate([0, -g.face - 12, -10])), ZINC);
    }
    // 3x3 in 11-gauge arm: horizontal run, riser and upper riser, with the 1 in lightening holes and the carry handle.
    const holes: Manifold[] = [], seg = (p0: [number, number], p1: [number, number], ts: number[]) => ts.forEach(t => holes.push(s.alongX(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, -arm, arm, 12.7, 0, 0, 20)));
    seg(a, b, [.52, .68, .84]); seg(b, cc, [.2, .82]); seg(cc, end, [.15, .32, .49, .66, .83]);
    const rise = Math.atan2(cc[1] - b[1], cc[0] - b[0]) / DEG, mid: [number, number] = [(b[0] + cc[0]) / 2, (b[1] + cc[1]) / 2];
    const slot = s.rotYZ(s.k(s.M.cube([arm + 4, 110, 32], true)), rise, mid);
    s.add('3x3 in 11-gauge arm', s.k(s.k(s.beam([a, b, cc, end], arm, arm)).subtract(s.k(s.M.union([...holes, slot])))), ROGUE_BLACK);
    s.add('Machined UHMW handle', s.rotYZ(s.k(s.M.cube([arm - 8, 108, 12], true)), rise, [mid[0] - 10 * Math.sin(rise * DEG), mid[1] + 10 * Math.cos(rise * DEG)]), UHMW);
    // Two gussets from the pin tab down to the arm top.
    const gz = a[1] + arm / 2;
    for (const x of [-1, 1]) s.add('Gusset', s.plateYZ([[front, c.top - 6], [front, gz - 1], [front + 150, gz - 1]], 6.35, x * (arm / 2 - 3.2)), ROGUE_BLACK);
    // Laser-cut logo on the riser (flat plate standing in for the cut lettering).
    for (const x of [-1, 1]) s.add('ROGUE logo cut-out', s.rotYZ(s.k(s.M.cube([.6, 120, 22], true)).translate([x * (arm / 2 + .2), 0, 0]), rise, [mid[0] + 150 * Math.cos(rise * DEG), mid[1] + 150 * Math.sin(rise * DEG)]), F('#0b0b0c', .2, .8));
    // Pad plate and the tapered self-skinned polyurethane pad (8 in at the top, 11 in at the bottom).
    const tilt = Math.atan2(g.along[1], g.along[0]) / DEG, [L, wTop, wBot, t] = P.pad, rr = 22;
    // Local +Y runs out and up the pad: 11 in wide at the low (rack) end, 8 in at the high outer end.
    const outline = s.roundedPoly([[-(wBot / 2 - rr), -L / 2 + rr, rr], [wBot / 2 - rr, -L / 2 + rr, rr], [-(wTop / 2 - rr), L / 2 - rr, rr], [wTop / 2 - rr, L / 2 - rr, rr]]);
    const base: [number, number] = [end[0] + P.padPlate * g.dir[0], end[1] + P.padPlate * g.dir[1]];
    s.add('Pad plate', s.rotYZ(s.k(s.k(s.k(outline.offset(-14, 'Round', 16)).extrude(P.padPlate)).translate([0, 0, -P.padPlate])), tilt, base), ROGUE_BLACK);
    s.add('Self-skinned polyurethane pad', s.rotYZ(s.pillow(outline, t, 12, 4), tilt, base), FOAM);
  });
}

// ───────────────────────────── Bells of Steel Seal Row Pad ─────────────────────────────

export function buildSealRowPad(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BELLS_OF_STEEL_SEAL_ROW_PAD.defaults, ...params }, g = sealRowLayout(p), S = SEAL_ROW, wall = S.wall, pinR = p.hardware ? 12.3 : 7.8;
  if (![0, 1].includes(p.hardware)) throw Error('Unsupported seal row pad hardware.');
  return build(api, s => {
    const gap = 1.5, front = g.face + gap + wall, side = g.face + gap + wall / 2, h = g.top - g.bottom, cz = (g.top + g.bottom) / 2;
    s.add('Wrap-around bracket', s.k(s.M.union([s.box([2 * side + wall, wall, h], [0, front - wall / 2, cz]), ...[-1, 1].map(x => s.box([wall, front + g.face - 6, h], [x * side, (front - g.face + 6) / 2, cz]))])), BOS_BLACK);
    s.add('UHMW bracket liner', s.box([2 * g.face - 8, gap, h - 10], [0, g.face + gap / 2, cz]), UHMW);
    s.add('Top mounting rod', s.alongY(0, 0, -g.face - 32, front + 10, pinR, 1.5, 1.5, 32), F('#1b1c1e', .6, .45));
    s.add('Clamp rod', s.alongY(0, g.clampZ, -g.face - 24, front + 30, pinR - 1.2, 0, 1.2, 24), ZINC);
    s.add('Knurled clamp knob', s.prismY(s.knurled(24, 48, .8), front + 2, 22, 0, g.clampZ), ZINC);
    s.add('Clamp nut and washer', s.k(s.k(s.alongY(0, g.clampZ, -g.face - 2.5, -g.face, pinR + 9, 0, 0, 32)).add(s.alongY(0, g.clampZ, -g.face - 14, -g.face - 2, pinR + 6, 1, 0, 6))), ZINC);
    s.add('BOS logo plate', s.box([.8, 46, 18], [side + wall / 2 + .3, 0, g.bottom + 30]), F('#2e2f33', .3, .6));
    // Selector wheel plates outside the bracket walls: 7-hole arc around the pivot bolt.
    const [py, pz] = g.pivot, plateX = side + wall / 2 + 3.4, [up, down] = S.wheel, outline: [number, number][] = [[g.face + 2, pz + up], [py + 12, pz + up], [g.face + S.wheelDepth, pz + 40], [g.face + S.wheelDepth, pz - 60], [py + 20, pz + down], [g.face + 2, pz + down]];
    const holes = S.angles.map((a, i) => s.alongX(py + 64 * Math.cos((180 - a) * DEG), pz + 64 * Math.sin((180 - a) * DEG), -plateX - 8, plateX + 8, 9.5, 0, 0, 20));
    s.add('Selector wheel plates', s.k(s.k(s.M.union([-1, 1].map(x => s.plateYZ(outline, 6.35, x * plateX)))).subtract(s.k(s.M.union(holes)))), BOS_BLACK);
    s.add('Pivot bolt', s.k(s.M.union([s.alongX(py, pz, -plateX - 8, plateX + 8, 9.5, 1, 1, 24), ...[-1, 1].map(x => s.alongX(py, pz, x < 0 ? -plateX - 12 : plateX + 3, x < 0 ? -plateX - 3 : plateX + 12, 15, .8, .8, 6))])), ZINC);
    const sel = 180 - g.angle, pin: [number, number] = [py + 64 * Math.cos(sel * DEG), pz + 64 * Math.sin(sel * DEG)];
    s.add('Selector pop-pin', s.k(s.k(s.alongX(pin[0], pin[1], -plateX - 4, plateX + 22, 8.5, 1, 0, 20)).add(s.alongX(pin[0], pin[1], plateX + 14, plateX + 30, 13, 1, 2, 24))), ZINC);
    // 2x3 in arm (dog-leg) and the pad board plus the tombstone pad on its second leg.
    s.add('2x3 in arm', s.beam(g.arm, S.armSize[0], S.armSize[1]), BOS_BLACK);
    const [W, L, t] = [S.pad[0], S.pad[1], S.pad[2]], u0 = S.padStart, legTop = S.arm[2][1] + S.armSize[1] / 2;
    const outlineXY = s.roundedPoly([[-(W / 2 - 22), u0 + 22, 22], [W / 2 - 22, u0 + 22, 22], [-(W / 2 - 118), u0 + L - 118, 118], [W / 2 - 118, u0 + L - 118, 118]]);
    const mountPlate = s.box([110, 150, 6.35], [0, S.arm[1][0] + 110, legTop + 3.2]);
    s.add('Pad mount plate', s.rotYZ(mountPlate, g.angle, g.pivot), BOS_BLACK);
    s.add('Pad board', s.rotYZ(s.k(s.k(s.k(outlineXY.offset(-6, 'Round', 16)).extrude(S.board - 6.35)).translate([0, 0, legTop + 6.35])), g.angle, g.pivot), F('#141516', .2, .8));
    s.add('Vinyl chest pad', s.rotYZ(s.pillow(outlineXY, t, 13, 5, legTop + S.board), g.angle, g.pivot), F('#1d1e20', 0, .7));
  });
}

// ───────────────────────────── REP Pegasus ─────────────────────────────

export function buildPegasus(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_PEGASUS.defaults, ...params }, g = pegasusLayout(p), P = PEGASUS, t = P.wall, pinR = p.series ? 7.8 : 12.3;
  if (![0, 1].includes(p.series)) throw Error('Unsupported Pegasus series.');
  return build(api, s => {
    const gap = 2, front = g.face + gap + t, side = g.face + gap + t / 2, h = g.sleeveTop - g.sleeveBottom, cz = (g.sleeveTop + g.sleeveBottom) / 2;
    // Sleeve box: side walls from behind the upright to the box front, pinned through the upright's side holes by the
    // magnetic pin; it slides on from the front and houses the roller post.
    const boxFront = g.face + P.boxFront, back = -g.face - 4;
    s.add('Sleeve', s.k(s.M.union([s.box([2 * side + t, t, h], [0, front - t / 2, cz]), s.box([2 * side + t, t, h * .55], [0, boxFront - t / 2, g.sleeveBottom + h * .275]),
      ...[-1, 1].map(x => s.box([t, boxFront - back, h], [x * side, (boxFront + back) / 2, cz]))])), REP_BLACK);
    s.add('UHMW sleeve liners', s.k(s.M.union([s.box([2 * g.face - 10, gap, h - 12], [0, g.face + gap / 2, cz]), ...[-1, 1].map(x => s.box([gap, 2 * g.face - 16, h - 12], [x * (g.face + gap / 2), 0, cz]))])), UHMW);
    s.add('REP logo', s.box([.8, 22, 70], [-(side + t / 2 + .4), g.face + 60, cz + 10]), WHITE);
    const outer = side + t / 2;
    s.add('Magnetic pin', s.alongX(0, 0, -outer - 5, outer + 3, pinR, 1.2, 0, 32), ZINC);
    s.add('Mountain-logo pin knob', s.alongX(0, 0, outer + 2, outer + 22, 23, 0, 2.5, 48), F('#111214', .4, .4));
    s.add('Mountain logo', s.k(s.M.union([-1, 1].map(k => s.k(s.k(s.M.cube([.6, 3, 16], true)).rotate([k * 32, 0, 0])).translate([outer + 22.2, k * 4, 1])))), WHITE);
    s.add('Clamp knob', s.k(s.k(s.prismX(s.knurled(25, 48, .8), outer + 2, 20, 0, g.sleeveBottom + 26)).add(s.alongX(0, g.sleeveBottom + 26, outer - .5, outer + 2.5, 12, 0, 0, 24))), ZINC);
    // Main arm: pivot plates on the sleeve, 2x3 in tube out to the seat pivot, angle pop-pin.
    const [ay, az] = g.A;
    s.add('Arm pivot plates', s.k(s.M.union([-1, 1].map(x => s.box([6.35, 80, 112], [x * 40, ay - 10, az + 1])))), REP_BLACK);
    s.add('Arm pivot bolt', s.alongX(ay, az, -48, 48, 9, 1, 1, 24), ZINC);
    s.add('Main arm', s.beam([g.armAt(-30, -20), g.armAt(g.armLength + 70, -20)], inch2(2), inch2(3)), REP_BLACK);
    s.add('Arm angle pop-pin', s.k(s.k(s.alongX(ay - 30, az + 34, -46, 58, 7, 1, 0, 20)).add(s.alongX(ay - 30, az + 34, 50, 64, 11, 1, 2, 24))), ZINC);
    // Seat angle arc plates (zinc) on the arm, under the seat pivot, with seven locking holes.
    const arcHoles: Manifold[] = P.seatAngles.map((b, i) => { const a = (-90 - 60 + i * 20) * DEG; return s.alongX(62 * Math.cos(a) + g.armLength, 62 * Math.sin(a), -60, 60, 5.5, 0, 0, 16); });
    const disc = s.k(s.k(s.alongX(g.armLength, 0, -34, 34, P.arcRadius, 0, 0, 48)).subtract(s.k(s.M.union([s.box([80, 2 * P.arcRadius + 4, P.arcRadius + 2], [0, g.armLength, P.arcRadius / 2 + 1]), s.alongX(g.armLength, 0, -28, 28, P.arcRadius, 0, 0, 48)]))));
    s.add('Seat angle arc plates', s.rotYZ(s.k(s.k(disc).subtract(s.k(s.M.union(arcHoles)))), g.alpha, g.A), ZINC);
    // Seat: bracket, steel frame and the tapered CleanGrip pad (11 in at the front, 7.5 in at the rack end).
    const [L, wFar, wNear, st] = P.seat, rr = 26, seatOutline = s.roundedPoly([[-(wNear / 2 - rr), -L / 2 + rr, rr], [wNear / 2 - rr, -L / 2 + rr, rr], [-(wFar / 2 - rr), L / 2 - rr, rr], [wFar / 2 - rr, L / 2 - rr, rr]]);
    const seat = (m: Manifold) => s.rotYZ(s.k(m.translate([0, g.seatMid, 0])), g.seatAngle, g.S);
    s.add('Seat pivot bracket', s.rotYZ(s.k(s.M.union([...[-1, 1].map(x => s.box([6.35, 120, P.seatLift + 4], [x * 22, 20, (P.seatLift + 4) / 2 - 2])), s.alongX(0, 0, -30, 30, 8, 0, 0, 20)])), g.seatAngle, g.S), REP_BLACK);
    s.add('Seat frame', seat(s.k(s.k(s.k(seatOutline.offset(-6, 'Round', 16)).extrude(P.frame)).translate([0, 0, P.seatLift]))), REP_BLACK);
    const seatBase = P.seatLift + P.frame;
    s.add('CleanGrip seat pad', seat(s.pillow(seatOutline, st, 16, 5, seatBase)), CLEANGRIP);
    s.add('Seat piping', seat(s.k(s.k(s.k(s.k(seatOutline.offset(.6, 'Round', 16)).subtract(s.k(seatOutline.offset(-2, 'Round', 16)))).extrude(2)).translate([0, 0, seatBase + 9]))), F('#8f9296', 0, .6));
    s.add('REP seat logo', seat(s.box([96, 1, 26], [0, L / 2 + .3, seatBase + st * .52])), WHITE);
    // Roller post on the sleeve front, axle and the twin 5.8 in CleanGrip rollers with stitched ends.
    const postY = g.face + P.postY, post = P.post, top = g.axleZ + 40, r = P.rollerDiameter / 2, x0 = post / 2 + 4, x1 = P.width / 2 - 2.2;
    s.add('Roller post', s.k(s.M.union([s.box([post, post, top - g.sleeveBottom - 20], [0, postY, (top + g.sleeveBottom + 20) / 2]), s.box([post, postY - post / 2 - front + 1, 60], [0, (front + postY - post / 2) / 2, g.sleeveBottom + 50])])), REP_BLACK);
    s.add('Carry handle', s.k(s.k(s.box([74, 12, PEGASUS_HANDLE - 40], [0, postY, top + (PEGASUS_HANDLE - 40) / 2 - 1])).subtract(s.box([52, 14, PEGASUS_HANDLE - 58], [0, postY, top + (PEGASUS_HANDLE - 58) / 2 - 1]))), REP_BLACK);
    s.add('Roller height pop-pin', s.k(s.k(s.alongY(0, g.axleZ - 64, postY - post / 2 - 2, postY + post / 2 + 20, 7, 0, 1, 20)).add(s.alongY(0, g.axleZ - 64, postY + post / 2 + 12, postY + post / 2 + 26, 11, 1, 2, 24))), ZINC);
    s.add('Roller axle', s.alongX(postY, g.axleZ, -x0 - 3, x0 + 3, 12.7, 0, 0, 24), ZINC);
    const rollers: Manifold[] = [], stitches: Manifold[] = [], caps: Manifold[] = [];
    for (const k of [-1, 1]) {
      const a = k < 0 ? -x1 : x0, b = k < 0 ? -x0 : x1;
      rollers.push(s.alongX(postY, g.axleZ, a, b, r, 14, 14, 64));
      stitches.push(s.stitchX(a + 18, r, postY, g.axleZ), s.stitchX(b - 18, r, postY, g.axleZ));
      const e = k < 0 ? a : b;
      caps.push(s.alongX(postY, g.axleZ, e - .8, e + .8, r - 18, 0, 0, 48));
      for (let i = 0; i < 4; i++) caps.push(s.k(s.k(s.k(s.M.cube([2.4, 60, 4], true)).rotate([i * 45, 0, 0])).translate([e + k * 1, postY, g.axleZ])));
    }
    s.add('CleanGrip leg rollers', s.k(s.M.union(rollers)), CLEANGRIP);
    s.add('Roller stitching', s.k(s.M.union(stitches)), F('#9a9ca0', 0, .6));
    s.add('Roller end caps', s.k(s.M.union(caps)), F('#3a3c3f', .2, .5));
  });
}
const inch2 = (v: number) => v * 25.4;

// ───────────────────────────── Prime Prodigy Stability Pad ─────────────────────────────

export function buildProdigy(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...PRIME_PRODIGY_STABILITY_PAD.defaults, ...params }, g = prodigyLayout(p), P = PRODIGY, pitch = p.mountSpacing ?? 50, [mw, mh, mt] = P.mountPlate;
  return build(api, s => {
    const front = g.face + mt, lockZ = -2 * pitch, side = g.face + 1.5 + 3.2, [px, py] = g.pivot, [z0, z1] = P.pivotZ;
    s.add('Mount plate and wrap', s.k(s.M.union([
      s.box([mw, mt, z1 - z0 - 10], [0, g.face + mt / 2, (z0 + 10 + z1) / 2]),
      ...[-1, 1].map(x => s.box([6.35, g.face + 10, 70], [x * side, (g.face - 10) / 2 + mt / 2, lockZ])),
      s.box([40, py - front - 20, z1 - z0 - 20], [0, (front + py - 20) / 2, (z0 + z1) / 2]),
    ])), PRIME_BLACK);
    s.add('1 in mounting pin', s.alongY(0, 0, -g.face + 6, front + 14, 12.3, 1.5, 1.5, 32), CHROME);
    s.add('Rubber pin tip', s.alongY(0, 0, -g.face, -g.face + 6.5, 11.5, 1.5, 0, 32), F('#141414', 0, .9, 'liner'));
    s.add('Lock pop-pin knob', s.k(s.k(s.alongX(0, lockZ, side - 2, side + 16, 6, 0, 0, 16)).add(s.alongX(0, lockZ, side + 10, side + 30, 14, 1, 3, 32))), GREEN);
    s.add('Swing pivot housing', s.alongZ(px, py, z0, z1 - 8, 28, 1.5, 0, 48), PRIME_BLACK);
    s.add('Bronze pivot bushing', s.alongZ(px, py, z1 - 9, z1, 27, 0, 1.2, 48), BRONZE);
    // Arm in its own frame along +Y from the pivot, then swung about Z.
    const [aw, ah] = P.arm, [iw, ih] = P.inner, reach = g.reach, swing = (m: Manifold) => s.k(s.k(m.rotate([0, 0, -g.swing])).translate([px, py, 0]));
    const outerLen = Math.min(P.outer, reach - 80);
    s.add('Outer arm', swing(s.box([aw, outerLen, ah], [0, outerLen / 2 + 20, P.armZ])), PRIME_BLACK);
    s.add('Telescoping inner arm', swing(s.box([iw, reach - outerLen + 120, ih], [0, outerLen + 20 + (reach - outerLen) / 2 - 60 + 1, P.armZ])), F('#aab0b6', .7, .4));
    const knob = (y: number) => s.k(s.k(s.alongZ(0, y, P.armZ + ah / 2 - 2, P.armZ + ah / 2 + 20, 6, 0, 0, 16)).add(s.alongZ(0, y, P.armZ + ah / 2 + 14, P.armZ + ah / 2 + 30, 14, 1, 3, 32)));
    s.add('Swing and length pop-pins', swing(s.k(s.M.union([knob(62), knob(outerLen + 4)]))), GREEN);
    s.add('Pad pivot block', swing(s.box([aw + 8, 40, ah + 12], [0, reach + 6, P.armZ])), PRIME_BLACK);
    s.add('Pad angle pop-pin', swing(s.k(s.k(s.alongX(reach + 6, P.armZ, aw / 2 + 2, aw / 2 + 12, 6, 0, 0, 16)).add(s.alongX(reach + 6, P.armZ, aw / 2 + 8, aw / 2 + 26, 14, 1, 3, 32)))), GREEN);
    // Half-moon pad: flat back on the bracket plate, rounded face out; 13-3/4 in along its long axis.
    const [padL, padW, padD] = P.pad, outline = s.k(s.k(s.k(s.k(s.C.circle(1, 64)).scale([padW / 2, padD - 8])).translate([0, 8])).intersect(s.k(s.k(s.C.square([padW + 2, padD], true)).translate([0, padD / 2]))));
    const padAt = (m: Manifold) => s.k(s.k(s.k(m.rotate([0, 0, -(g.swing + g.padAngle)])).translate([g.end[0], g.end[1], P.armZ])));
    const long = (m: Manifold) => p.orientation ? s.k(m.rotate([0, 90, 0])) : m;
    s.add('Pad back plate', padAt(long(s.box([padW - 20, 8, padL - 30], [0, 26, 0]))), PRIME_BLACK);
    const body = s.k(s.k(s.k(s.C.hull([outline])).extrude(padL - 24, 0, 0, 1, true)).translate([0, 30, 0]));
    const ends = [-1, 1].map(k => s.k(s.k(s.k(s.k(outline.offset(-10, 'Round', 24)).extrude(.2, 0, 0, 1, true)).translate([0, 30, k * padL / 2]))));
    s.add('Vinyl half-moon pad', padAt(long(s.k(s.M.hull([body, ...ends])))), F('#2a2b2e', 0, .66));
  });
}

export const definitions: PartDefinition[] = [
  rackDefinition(REP_PEGASUS, buildPegasus),
  rackDefinition(REP_LEG_ROLLER_2, buildRepLegRoller2),
  rackDefinition(ROGUE_MONSTER_SINGLE_LEG_ROLLER_2, buildRogueSingleLegRoller2),
  rackDefinition(ROGUE_MONSTER_PRITCHETT_PAD, buildPritchettPad),
  rackDefinition(BELLS_OF_STEEL_SEAL_ROW_PAD, buildSealRowPad),
  rackDefinition(PRIME_PRODIGY_STABILITY_PAD, buildProdigy),
  rackDefinition(ROGUE_MONSTER_LITE_LEG_ROLLER, buildRogueMonsterLiteLegRoller),
  rackDefinition(BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER, buildBosSplitSquatRoller),
  rackDefinition(TITAN_RACK_MOUNTED_LEG_ROLLER, buildTitanLegRoller),
  // Registry v2 (#178): parts that span the rack or mount on a spotter arm (parts/rack-rollers-pads-v2.ts).
  rackDefinition(ROGUE_MULTI_USE_RACK_ROLLER, buildRackRoller),
  rackDefinition(REP_UTILITY_SEAT, buildUtilitySeat),
  rackDefinition(DARKO_THRESHER_PAD, buildThresherPad),
];
