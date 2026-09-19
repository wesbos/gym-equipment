/** Floor-storage builders: dumbbell racks (REP 3-tier, Rogue 3-tier saddle), the REP dumbbell cart, the Titan dumbbell
 * stand & plate tree and the REP Kettlebell Rack 2.0. Stored loads reuse the dumbbell/kettlebell/PÉPIN/PowerBlock data. */
import type { Mat4 } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import {
  IN, PAINT, type Paint, REP_DB_RACK, REP_DB_COLORS, repRackLayout, ROGUE_DB_RACK, rogueRackWeights,
  REP_CART, REP_CART_COLORS, REP_CART_LOADS, REP_CART_HOOK, TITAN_STAND, STANDARD_PLATES, titanStandPegLoad,
  REP_KB, REP_KB_RACKS, repKbLoad, packBells,
} from '../floor-parts/floor-storage.ts';
import { dumbbellShape, type HexShape } from '../floor-parts/fixed-dumbbells.ts';
import { buildFixedDumbbell } from './fixed-dumbbells.ts';
import { buildPepinDumbbell } from './pepin.ts';
import { buildPowerBlock } from './powerblock.ts';
import { repBell, BAND_COLORS } from '../floor-parts/kettlebells.ts';
import { kit, finish, beam, pipe, prism, bolt, caster, fitText, onFace, adopt, tiltX, urethaneDumbbell, lowBell, standardPlate, type Kit, type Finish } from './floor-storage-kit.ts';
const coat = (p: Paint, what: string): Finish => finish(`${p.name} ${what}`, 'source', p.color, p.metalness, p.roughness);
const RUBBER = finish('Black rubber foot caps', 'liner', '#141516', 0, .85);
const want = (ok: boolean, what: string) => { if (!ok) throw Error(`Unsupported ${what}.`); };
const move = (at: Vec3): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...at, 1] as Mat4;
const rad = (d: number) => d * Math.PI / 180;

// ── REP 3-tier Dumbbell Rack ─────────────────────────────────────────────────────────────────────────
/** Leg centre lines in (y, z): angled front leg and near-vertical rear post, meeting under the top cap. */
export const REP_RACK_LEGS = { front: [[-5.5 * IN, 2.5 * IN], [3.3 * IN, 35 * IN]] as Vec2[], rear: [[8.5 * IN, 2.5 * IN], [5.4 * IN, 35 * IN]] as Vec2[] };
const along = (line: Vec2[], z: number) => line[0][0] + (line[1][0] - line[0][0]) * (z - line[0][1]) / (line[1][1] - line[0][1]);
/** Tray front edge distance ahead of the front leg, bottom → top (the long 45–50 lb heads stay inside the feet). */
export const REP_TRAY_OFFSETS = [3.9 * IN, 6 * IN, 7.5 * IN];
/** Published space where the hand grabs the handle, between the front and rear channels. */
export const REP_GRAB = 4.5 * IN;
/** Tray i: front bottom corner (y, z) and the along-tray / up unit vectors for the 12° tilt (rear higher). */
export function repTray(i: number) {
  const R = REP_DB_RACK, z = R.trays[i], y = along(REP_RACK_LEGS.front, z) - REP_TRAY_OFFSETS[i], a = rad(R.tilt);
  return { y, z, u: [Math.cos(a), Math.sin(a)] as Vec2, n: [-Math.sin(a), Math.cos(a)] as Vec2 };
}
/** End-frame centre: the logo gusset and its bolt heads on the outer face reach the published 48″ length. */
export const REP_RACK_FRAME_X = REP_DB_RACK.length / 2 - REP_DB_RACK.tube / 2 - 5 - 1.6 - 9 * .65;
export function buildRepDumbbellRack(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const color = REP_DB_COLORS[p.color]; want(!!color && [0, 1, 2].includes(p.loaded), 'dumbbell rack setting');
  const frame = coat(color, 'steel frame'), trays = coat(color, '11 ga shelves');
  const ink = finish('White REP logo', 'source', '#e9e9e6', 0, .5);
  return kit(api, k => {
    const R = REP_DB_RACK, [fw, fh] = R.foot, t = R.tube, xFrame = REP_RACK_FRAME_X, cap = 1.4 * IN;
    for (const side of [-1, 1]) {
      const x = side * xFrame;
      // Foot tube with tapered rubber caps, the two legs and a top cap.
      k.add(frame, k.span([x - fw / 2, -R.depth / 2 + cap, 0], [x + fw / 2, R.depth / 2 - cap, fh]));
      for (const end of [-1, 1]) {
        const slab = (y: number, h: number) => k.span([x - fw / 2 - 1, y - .5, 0], [x + fw / 2 + 1, y + .5, h]);
        k.add(RUBBER, k.k(api.Manifold.hull([slab(end * (R.depth / 2 - cap + .5), fh + 2), slab(end * (R.depth / 2 - .5), fh * .5)])));
      }
      for (const line of [REP_RACK_LEGS.front, REP_RACK_LEGS.rear]) k.add(frame, beam(k, [x, line[0][0], fh - 5], [x, line[1][0], line[1][1]], t, t));
      k.add(frame, k.span([x - t / 2 - 2, 2.4 * IN, 34.6 * IN], [x + t / 2 + 2, 6.4 * IN, 36 * IN]));
      // Logo gusset between the legs at the foot, on the outer face.
      const gx = side > 0 ? x + t / 2 : x - t / 2 - 5, gz = fh, g: Vec2[] = [[along(REP_RACK_LEGS.front, gz) - t / 2, gz], [along(REP_RACK_LEGS.rear, gz) + t / 2, gz], [along(REP_RACK_LEGS.rear, 10 * IN), 10 * IN], [along(REP_RACK_LEGS.front, 10 * IN), 10 * IN]];
      k.add(frame, prism(k, g, 5, 'yz', gx));
      const logoX = side > 0 ? x + t / 2 + 5 : x - t / 2 - 5, yc = (along(REP_RACK_LEGS.front, 5 * IN) + along(REP_RACK_LEGS.rear, 5 * IN)) / 2;
      k.add(ink, onFace(k, fitText(k, 'REP', 3.2 * IN, 1 * IN), .5, [logoX, yc, 5.2 * IN], [0, side, 0], [0, 0, 1]));
      for (const [y, z] of [[along(REP_RACK_LEGS.front, 7 * IN), 7 * IN], [along(REP_RACK_LEGS.rear, 7 * IN), 7 * IN]]) bolt(k, [side > 0 ? x + t / 2 + 5 : x - t / 2 - 5, y, z], [side, 0, 0], 9);
    }
    // Angled trays: floor + 1″ lips front and back, bracket plates bolted to the inside of each front leg.
    const xi = xFrame - t / 2 - 5, T = R.tray, st = R.steel;
    for (let i = 0; i < R.trays.length; i++) {
      const { y, z, u, n } = repTray(i), pt = (a: number, b: number): Vec2 => [y + u[0] * a + n[0] * b, z + u[1] * a + n[1] * b];
      // Each tier is a front and a rear formed channel with the 4.5″ grab gap between them (10″ total resting depth).
      const c = (T - REP_GRAB) / 2, channel = (u0: number): Vec2[] => [pt(u0, 0), pt(u0 + c, 0), pt(u0 + c, R.lip), pt(u0 + c - st, R.lip), pt(u0 + c - st, st), pt(u0 + st, st), pt(u0 + st, R.lip), pt(u0, R.lip)];
      for (const u0 of [0, T - c]) k.add(trays, prism(k, channel(u0), 2 * xi, 'yz', -xi));
      for (const side of [-1, 1]) {
        // End plate tying both channels, with an ear reaching back to the leg's bolts.
        const bx = side > 0 ? xi : -xi - 5, legY = along(REP_RACK_LEGS.front, z + 1 * IN), plate: Vec2[] = [pt(0, 0), pt(T, 0), [Math.max(legY + t / 2 + 8, y + T + 4), z + 3.4 * IN], pt(0, R.lip)];
        k.add(trays, prism(k, plate, 5, 'yz', bx));
        for (const dz of [.2, 2.4]) bolt(k, [side * (xFrame + t / 2), legY, z + dz * IN], [side, 0, 0], 8);
      }
    }
    // REP rubber hex dumbbells: every head bridges the lips of its channel, the handle over the grab gap.
    for (const slot of repRackLayout(p.loaded)) {
      const shape = dumbbellShape('rep-hex-dumbbell', { weight: slot.weight }) as HexShape;
      const { y, z, u, n } = repTray(slot.tier), a = T / 2, b = R.lip;
      const at: Vec3 = [slot.x, y + u[0] * a + n[0] * b, z + u[1] * a + n[1] * b];
      adopt(k, buildFixedDumbbell(api, { ...shape, label: { ...shape.label, left: '', right: '' } }), tiltX(R.tilt, at), q => `Stored REP hex dumbbells · ${q.name}`);
    }
  });
}

// ── Rogue 3-Tier Dumbbell Rack ───────────────────────────────────────────────────────────────────────
const inchPts = (pts: number[][]) => pts.map(([y, z]) => [y * IN, z * IN] as Vec2);
/** 3/8″ end plate outline (y, z inches): front and rear foot legs over an arched opening, a straight front edge rising from
 * the bottom tier to the top one (the tier rails bolt along it) and a vertical rear edge. */
export const ROGUE_PLATE_OUTLINE = inchPts([[-14.2, 0], [-10.6, 0], [-8.6, 4.2], [8.6, 4.2], [10.6, 0], [14.2, 0], [13.2, 33], [1.2, 33], [-14.2, 9.6]]);
/** Two large cut-outs between the tiers leave a ladder of bands carrying each tier's rails and divider. */
export const ROGUE_PLATE_WINDOWS = [inchPts([[-11.2, 10.4], [10.4, 10.4], [10.5, 16.8], [-8, 16.8]]), inchPts([[-4.2, 22.3], [10.5, 22.3], [10.6, 28.2], [-.4, 28.2]])];
const SADDLE = finish('Black plastic dumbbell saddles', 'liner', '#1a1b1d', 0, .55);
export function buildRogueDumbbellRack(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  want([0, 1, 2].includes(p.loaded), 'dumbbell rack load');
  const steel = coat(PAINT.rogueBlack, 'laser-cut steel end plates'), rails = coat(PAINT.rogueBlack, 'saddle rails and divider');
  return kit(api, k => {
    const R = ROGUE_DB_RACK, pl = R.plate, bh = 1.6 + 11 * .65, xo = R.length / 2 - bh, xp = xo - pl, pitch = (R.length - 2 * 3 * IN) / R.positions;
    for (const side of [-1, 1]) {
      const x0 = side > 0 ? xp : -xo, outline = k.csCut(k.poly(ROGUE_PLATE_OUTLINE), ROGUE_PLATE_WINDOWS.map(w => k.poly(w)));
      const plate = prism(k, outline, pl, 'yz', x0), letters = onFace(k, fitText(k, 'ROGUE', 7 * IN, 1.25 * IN), pl + 4, [side > 0 ? x0 - 2 : x0 + pl + 2, 0, 5.35 * IN], [0, side, 0], [0, 0, 1]);
      k.add(steel, k.cut(plate, [letters]));
      // Bolt-down foot plates under the front and rear legs.
      for (const y of [-13.2 * IN, 13.2 * IN]) k.add(steel, k.cut(k.span([side > 0 ? xo - 3.2 * IN : -xo, y - 1.8 * IN, 0], [side > 0 ? xo : -xo + 3.2 * IN, y + 1.8 * IN, 6]), [k.cyl(10, 8, 'z', [side * (xo - 1.9 * IN), y, 3], 16)]));
    }
    for (const [zTop, yc] of R.tiers) {
      for (const dir of [-1, 1]) {
        const y = yc + dir * R.railGap / 2;
        // 2″ angle rails, saddle blocks with a concave seat for the round heads.
        const lip = dir > 0 ? [y + IN - 4.8, y + IN] : [y - IN, y - IN + 4.8];
        k.add(rails, k.span([-xp, y - IN, zTop - 2.25 * IN], [xp, y + IN, zTop - 1.25 * IN]), k.span([-xp, lip[0], zTop - 3.25 * IN], [xp, lip[1], zTop - 2.25 * IN]));
        for (let i = 0; i < R.positions; i++) {
          const x = -R.length / 2 + 3 * IN + (i + .5) * pitch;
          k.add(SADDLE, k.cut(k.span([x - 1.9 * IN, y - 1.2 * IN, zTop - 1.25 * IN], [x + 1.9 * IN, y + 1.2 * IN, zTop]), [k.cyl(3 * IN, 4.2 * IN, 'y', [x, y, zTop + 3.55 * IN], 48)]));
        }
        for (const side of [-1, 1]) bolt(k, [side * xo, y, zTop - 2.2 * IN], [side, 0, 0], 11);
      }
      // Centre rail divider on edge between the head rows.
      k.add(rails, k.span([-xp, yc - 3 * IN / 16, zTop - 2.4 * IN], [xp, yc + 3 * IN / 16, zTop + .6 * IN]));
    }
    // Rogue urethane pairs, ten positions per tier: lightest on the top tier, heavier below.
    const weights = rogueRackWeights(p.loaded).flatMap(w => [w, w]);
    weights.forEach((weight, j) => {
      const tier = R.tiers.length - 1 - Math.floor(j / R.positions), i = j % R.positions, [zTop, yc] = R.tiers[tier];
      const s = dumbbellShape('rogue-urethane-dumbbell', { weight }) as { D: number; L: number; gap: number; handle: { d: number } };
      urethaneDumbbell(k, s, move([-R.length / 2 + 3 * IN + (i + .5) * pitch, yc, zTop - .6 * IN]));
    });
  });
}

// ── REP Dumbbell Storage Cart ────────────────────────────────────────────────────────────────────────
export function buildRepCart(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const c = REP_CART_COLORS[p.color]; want(!!c && [0, 1].includes(p.hooks) && (REP_CART_LOADS as readonly number[]).includes(p.load), 'dumbbell cart setting');
  const frame = coat(c.frame, 'side frames'), panel = coat(c.panel, '16 ga pegboard panels'), shelf = coat(c.panel, '11/12 ga shelves');
  const rubber = finish('Crumb rubber shelf liners', 'liner', '#1d1e20', 0, .95), ink = finish('White REP badge lettering', 'source', '#e9e9e6', 0, .5);
  const hook = finish('Black pegboard hooks', 'source', '#1c1d1f', .4, .5), tyre = finish('Black caster wheels', 'liner', '#151617', 0, .6), steel = finish('Black caster forks', 'source', '#222326', .5, .45);
  return kit(api, k => {
    const C = REP_CART, W = C.width, D = C.depth, H = C.height, ps = C.post, xs = W / 2 - ps / 2 - 4.5, ys = D / 2 - ps / 2 - 1 * IN, [cw, cd] = C.cutout;
    const top = H - C.liner, st = 3;
    // Corner posts on caster plates, top and bottom side rails, perforated side panels.
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) { k.add(frame, k.span([sx * xs - ps / 2, sy * ys - ps / 2, C.caster], [sx * xs + ps / 2, sy * ys + ps / 2, top - C.skirt])); caster(k, sx * xs, sy * ys, C.caster, C.wheel, { steel, tyre }, sx > 0 ? -1 : 1); }
      k.add(frame, k.span([sx * xs - ps / 2, -ys, C.caster], [sx * xs + ps / 2, ys, C.caster + 1.25 * IN]));
      const px = sx * (xs + ps / 2 - 1.5), z0 = C.caster + 1.25 * IN, z1 = top - C.skirt, holes: ReturnType<Kit['cyl']>[] = [];
      for (let y = -ys + IN; y <= ys - IN + 1; y += IN) for (let z = z0 + IN; z <= z1 - .6 * IN; z += IN) holes.push(k.cyl(6, IN / 8, 'x', [px, y, z], 8));
      k.add(panel, k.cut(k.span([px - .75, -ys + ps / 2, z0], [px + .75, ys - ps / 2, z1]), [k.compose(holes)]));
      if (p.hooks) for (const [y, z] of [[-4 * IN, z1 - 2.5 * IN], [0, z1 - 5.5 * IN], [4 * IN, z1 - 2.5 * IN]]) {
        const o = sx * (xs + ps / 2);
        k.add(hook, pipe(k, [o, y, z], [o + sx * (REP_CART_HOOK - 4), y, z + .4 * IN], 3, 10), pipe(k, [o + sx * (REP_CART_HOOK - 4), y, z + .4 * IN], [o + sx * (REP_CART_HOOK - 4), y, z + 1.2 * IN], 3, 10), k.span([o - (sx > 0 ? 0 : 4), y - 8, z - 12], [o + (sx > 0 ? 4 : 0), y + 8, z + 12]));
      }
    }
    // Top shelf: 11 ga deck with a 2″ skirt and the front step-in cut-out; crumb rubber liner with add-on plate slots.
    const deck = (h: number, z0: number, inset = 0) => k.cut(k.span([-W / 2 + inset, -D / 2 + inset, z0], [W / 2 - inset, D / 2 - inset, z0 + h]), [k.span([-cw / 2 - inset, -D / 2 - 1, z0 - 1], [cw / 2 + inset, -D / 2 + cd + inset, z0 + h + 1])]);
    const skirt = k.cut(deck(C.skirt, top - C.skirt), [deck(C.skirt + 2, top - C.skirt - 1, st)]);
    k.add(shelf, deck(st, top - st), skirt);
    const slots = [-1.5, -.5, .5, 1.5].map(i => k.span([i * 1.3 * IN - .35 * IN, D / 2 - 7 * IN, top - 1], [i * 1.3 * IN + .35 * IN, D / 2 - 2 * IN, H + 1]));
    k.add(rubber, k.cut(deck(C.liner, top, 6), slots));
    // Flared front brackets under the top shelf beside the cut-out with the REP badge.
    for (const sx of [-1, 1]) {
      const x0 = sx * (cw / 2 + st), x1 = sx * (xs - ps / 2), y = -D / 2 + 1.5 * IN, tri: Vec2[] = sx > 0 ? [[x0, top - C.skirt], [x1, top - C.skirt], [x1, top - C.skirt - 4 * IN]] : [[x1, top - C.skirt - 4 * IN], [x1, top - C.skirt], [x0, top - C.skirt]];
      k.add(frame, prism(k, tri, 3, 'xz', y));
      if (sx < 0) k.add(ink, onFace(k, fitText(k, 'REP', 2 * IN, .7 * IN), .5, [(x0 * .35 + x1 * .65), y - .01, top - C.skirt - 1.1 * IN], [1, 0, 0], [0, 0, 1]));
    }
    // Bottom utility shelf with its own cut-out and liner.
    const b = C.bottom, bd = (h: number, z0: number, inset = 0) => k.cut(k.span([-xs + ps / 2 + inset, -ys + inset, z0], [xs - ps / 2 - inset, ys - inset, z0 + h]), [k.span([-cw / 2 - inset, -ys - 1, z0 - 1], [cw / 2 + inset, -ys + 5 * IN + inset, z0 + h + 1])]);
    k.add(shelf, bd(3, b - 3), k.cut(bd(1.25 * IN, b - 1.25 * IN), [bd(1.25 * IN + 2, b - 1.25 * IN - 1, 3)]));
    k.add(rubber, bd(C.liner, b, 5));
    // REP x PÉPIN pair in their cradles, bolted either side of the cut-out.
    if (p.load) for (const sx of [-1, 1]) adopt(k, buildPepinDumbbell(api, { variant: p.load, weight: p.load, rest: 0 }), move([sx * (cw / 2 + (W / 2 - cw / 2) / 2), .5 * IN, H]), q => `Stored REP x PÉPIN · ${q.name}`);
  });
}

// ── Titan Dumbbell Stand & Plate Tree ────────────────────────────────────────────────────────────────
/** Frame layout (mm): frame x, leg foot/top y, platform pivot height, peg (x side, leg front/rear, z). */
export function titanStandLayout() {
  const S = TITAN_STAND, fx = S.width / 2 - S.peg - S.tube / 2, a = rad(S.tilt), halfLen = S.rest[1] / 2;
  const zRear = S.height - S.lip, zc = zRear - halfLen * Math.sin(a);
  const legAt = (front: boolean, z: number) => (front ? -1 : 1) * (7 * IN - (7 - 3.25) * IN * (z - S.foot) / (zc - 1.2 * IN - S.foot));
  const pegs: { sx: number; front: boolean; z: number }[] = [{ sx: 1, front: true, z: 14 * IN }, { sx: 1, front: false, z: 10 * IN }, { sx: -1, front: true, z: 10 * IN }, { sx: -1, front: false, z: 14 * IN }];
  return { fx, a, zc, legAt, pegs };
}
export function buildTitanStand(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  want([0, 1, 2].includes(p.dumbbells) && [0, 1, 2].includes(p.loaded), 'dumbbell stand setting');
  const frame = coat(PAINT.titanBlack, 'steel frame'), deck = coat(PAINT.titanBlack, 'platform'), cap = finish('Ribbed black plastic foot caps', 'liner', '#131415', 0, .7);
  const ink = finish('White TITAN lettering', 'source', '#ecebe6', 0, .5), red = finish('Red TITAN badge', 'source', '#c8242d', .1, .5);
  return kit(api, k => {
    const S = TITAN_STAND, { fx, a, zc, legAt, pegs } = titanStandLayout(), t = S.tube, f = S.foot, capL = 1.6 * IN, top = zc - 1.2 * IN;
    for (const sx of [-1, 1]) {
      const x = sx * fx;
      k.add(frame, k.span([x - f / 2, -S.depth / 2 + capL, 0], [x + f / 2, S.depth / 2 - capL, f]));
      for (const end of [-1, 1]) {
        const y0 = end * (S.depth / 2 - capL), y1 = end * S.depth / 2, ribs = [0, 1, 2, 3].map(i => k.span([x - f / 2 - 1, Math.min(y0, y1) + 4 + i * 9, f - 4], [x + f / 2 + 1, Math.min(y0, y1) + 8 + i * 9, f + 1]));
        k.add(cap, k.cut(k.span([x - f / 2 - .5, Math.min(y0, y1), 0], [x + f / 2 + .5, Math.max(y0, y1), f + .5]), ribs));
      }
      // A-frame legs from the foot to the platform support rail.
      for (const front of [true, false]) k.add(frame, beam(k, [x, legAt(front, f), f - 3], [x, legAt(front, top), top], t, t));
      k.add(frame, beam(k, [x, -S.rest[1] / 2 * Math.cos(a) + 20, zc - 1.2 * IN - S.rest[1] / 2 * Math.sin(a) + 20 * Math.tan(a)], [x, S.rest[1] / 2 * Math.cos(a) - 20, zc - 1.2 * IN + S.rest[1] / 2 * Math.sin(a) - 20 * Math.tan(a)], t, t));
      bolt(k, [x + sx * f / 2, 0, f / 2], [sx, 0, 0], 8);
    }
    k.add(frame, k.span([-fx + f / 2, -f / 2, 0], [fx - f / 2, f / 2, f]));
    // Pegs with end caps and the stored standard plates (inner face against the leg).
    for (const [i, g] of pegs.entries()) {
      const y = legAt(g.front, g.z), x0 = g.sx * (fx + t / 2);
      k.add(frame, k.cyl(S.peg, S.pegD / 2, 'x', [g.sx * (fx + t / 2 + S.peg / 2 - 3), y, g.z], 24));
      k.add(cap, k.cyl(4, S.pegD / 2 + .8, 'x', [g.sx * (S.width / 2 - 2), y, g.z], 24));
      bolt(k, [g.sx * (fx - t / 2), y, g.z], [-g.sx, 0, 0], 8);
      let off = 3;
      for (const lb of titanStandPegLoad(i, p.loaded)) { const pl = STANDARD_PLATES[lb]; standardPlate(k, pl.d, pl.w, x0 + g.sx * off, g.sx, y, g.z + S.pegD / 2 - 13); off += pl.w + 1; }
    }
    // Angled platform: 3 mm deck, 1.375″ outer lips and a centre divider rib (front lower).
    const w = 2 * S.rest[0] + .75 * IN, L = S.rest[1], st = 3, sec: Vec2[] = [[-w / 2, 0], [w / 2, 0], [w / 2, S.lip], [w / 2 - st, S.lip], [w / 2 - st, st], [.375 * IN, st], [.375 * IN, S.lip], [-.375 * IN, S.lip], [-.375 * IN, st], [-w / 2 + st, st], [-w / 2 + st, S.lip], [-w / 2, S.lip]];
    const plat = prism(k, sec, L, 'xz', -L / 2);
    k.add(deck, k.k(plat.transform(tiltX(S.tilt, [0, 0, zc]))));
    // TITAN lettering up the front +X leg with the red badge.
    const lz = 12 * IN, ly = legAt(true, lz);
    k.add(ink, onFace(k, fitText(k, 'TITAN', t * .7, 4.2 * IN, true), .5, [fx + t / 2, ly, lz], [0, 1, 0], [0, 0, 1]));
    k.add(red, k.k(k.cyl(.5, t * .32, 'x', [fx + t / 2 + .25, legAt(true, lz - 2.6 * IN), lz - 2.6 * IN], 20)));
    // Stored dumbbells on the two rests: 60 lb urethane pair or PowerBlock Elite USA 90s in their cradles.
    for (const sx of [-1, 1]) {
      const cx = sx * (S.rest[0] / 2 + .375 * IN), at: Vec3 = [cx, 2, zc + st];
      if (p.dumbbells === 1) urethaneDumbbell(k, dumbbellShape('rep-urethane-dumbbell', { weight: 60 }) as never, tiltX(S.tilt, at));
      if (p.dumbbells === 2) adopt(k, buildPowerBlock(api, { model: 0, weight: 50 }), tiltX(S.tilt, at), q => `Stored PowerBlock · ${q.name}`);
    }
  });
}

// ── REP Kettlebell Rack 2.0 ──────────────────────────────────────────────────────────────────────────
export function buildRepKettlebellRack(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const rack = REP_KB_RACKS[p.tiers]; want(!!rack && [0, 1, 2].includes(p.loaded), 'kettlebell rack setting');
  const frame = coat(PAINT.repMatte, '11 ga steel frame'), shelves = coat(PAINT.repMatte, 'shelves'), liner = finish('Moulded hex-pattern shelf liners', 'liner', '#161718', 0, .7);
  const caps = finish('REP shelf end caps', 'source', '#1b1c1e', .35, .5), pads = finish('Black rubber foot pads', 'liner', '#121314', 0, .85);
  return kit(api, k => {
    const K = REP_KB, [tw, th] = K.tube, xf = K.shelf / 2 - 3.2 * IN, st = 3, tiers = rack.tiers;
    for (const sx of [-1, 1]) {
      const x = sx * xf, footH = 2 * IN, fy = K.depth / 2 - .6 * IN;
      k.add(frame, k.span([x - tw / 2, -fy, 10], [x + tw / 2, fy, 10 + footH]));
      for (const end of [-1, 1]) {
        const a = end * fy, b = end * (fy - 3 * IN), c = end * K.depth / 2;
        k.add(pads, k.span([x - tw / 2 - 2, Math.min(a, b), 0], [x + tw / 2 + 2, Math.max(a, b), 10]), k.span([x - tw / 2 - 1, Math.min(a, c), 10], [x + tw / 2 + 1, Math.max(a, c), 10 + footH]));
      }
      // Zig-zag tube path: up from the foot to the bottom shelf support, then slanting back to each shelf above.
      const pts: Vec3[] = [[x, tiers[0].y + tiers[0].depth * .15, 10 + footH - 4]];
      for (const tier of tiers) pts.push([x, tier.y + tier.depth * .15, tier.z - st - K.liner - th * .5]);
      for (let i = 1; i < pts.length; i++) k.add(frame, beam(k, pts[i - 1], pts[i], tw, th, [1, 0, 0]));
      for (const tier of tiers) k.add(frame, beam(k, [x, tier.y - tier.depth / 2 + 30, tier.z - st - K.liner - th / 2], [x, tier.y + tier.depth / 2 - 30, tier.z - st - K.liner - th / 2], tw, th * .8));
    }
    for (const tier of tiers) {
      const z = tier.z - K.liner, y0 = tier.y - tier.depth / 2, y1 = tier.y + tier.depth / 2, x = K.shelf / 2;
      // Flat shelf with rolled front/back lips, liner and sloped end caps carrying REP lettering.
      k.add(shelves, k.span([-x, y0, z - st], [x, y1, z]), k.span([-x, y0, z - st], [x, y0 + st, z + K.liner + K.lip]), k.span([-x, y1 - st, z - st], [x, y1, z + K.liner + K.lip]));
      k.add(liner, k.span([-x + 4, y0 + st + 2, z], [x - 4, y1 - st - 2, z + K.liner]));
      for (const sx of [-1, 1]) {
        const cap: Vec2[] = [[y0, z - 1.4 * IN], [y1, z - 1.4 * IN], [y1, z + K.liner + K.lip], [y0, z + K.liner + K.lip]];
        const x0 = sx > 0 ? x : -K.length / 2, capT = K.length / 2 - x;
        k.add(caps, k.cut(prism(k, cap, capT, 'yz', x0), [onFace(k, fitText(k, 'REP', tier.depth * .3, .5 * IN), 3, [sx * (K.length / 2 - 2), tier.y, z - .5 * IN], [0, sx, 0], [0, 0, 1])]));
      }
    }
    // REP kettlebells, heaviest on the bottom shelf, staggered front/back where the shelf is deep enough.
    packBells(repKbLoad(p.loaded), tiers, K.shelf - 2 * IN).forEach(slot => {
      if (!slot) return;
      const l = repBell(0, slot.kg).layout, band = BAND_COLORS[({ 4: 'White', 6: 'Gray', 8: 'Pink', 10: 'Orange', 12: 'Blue', 14: 'Brown', 16: 'Yellow', 18: 'Brown', 20: 'Gray', 22: 'Black', 24: 'Green' } as Record<number, string>)[slot.kg]];
      lowBell(k, l, band, [slot.x, slot.y, tiers[slot.tier].z]);
    });
  });
}
