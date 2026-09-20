/** Builders for the registry v2 rollers, seats and pads (#178): Rogue Multi-Use Rack Roller, REP Utility Seat, Darko
 * Thresher Pad. Frames (rack-part.ts): the roller on the upright centreline at its peg hole (+Y toward the facing post,
 * X across the face, `acrossOut` = the rack's outside); the seat and pad on their host station (origin on the hole axis,
 * +Y along the arm or safety, Z up, X across it). Sizes: rack-parts/rack-rollers-pads-v2.ts. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2 } from '../types.ts';
import { buildWith, FINISH, type Finish } from './rack-jcups-safeties-kit.ts';
import {
  DARKO_THRESHER_PAD, RACK_ROLLER, REP_UTILITY_SEAT, ROGUE_MULTI_USE_RACK_ROLLER, THRESHER, THRESHER_LINERS, UTILITY_SEAT,
  rackRollerLayout, thresherLayout, thresherOutline, utilitySeatLayout,
} from '../rack-parts/rack-rollers-pads-v2.ts';
const inch = (v: number) => v * 25.4;
const VINYL: Finish = { color: '#18191b', metalness: 0, roughness: .86 }, MG_BLACK: Finish = { color: '#141517', metalness: .55, roughness: .32 };
const UHMW: Finish = { color: '#232426', metalness: 0, roughness: .72 }, ZINC: Finish = FINISH.zinc, CUTOUT: Finish = { color: '#07080a', metalness: 0, roughness: .95 };
const lo = (a: number, b: number) => Math.min(a, b), hi = (a: number, b: number) => Math.max(a, b);

// ─── Rogue Multi-Use Rack Roller ────────────────────────────────────────────────────────────────────────────────────
export function buildRackRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MULTI_USE_RACK_ROLLER.defaults, ...params }, l = rackRollerLayout(p), r = RACK_ROLLER, t = r.plate, lite = p.series === 1;
  const pinR = (lite ? inch(.625) : inch(1)) / 2 - .3;
  return buildWith(api, k => {
    const { box, prism, rod, revolve, union, minus, put } = k;
    const xs = (a: number, b: number): [number, number] => [lo(a, b), hi(a, b)];
    // One bracket (near end); the far end is its mirror image about the span centre.
    const bracket = (): { steel: Manifold; liner: Manifold; badge: Manifold; pins: Manifold; ring: Manifold; bolt: Manifold } => {
      const s = l.s, [px0, px1] = xs(-s * l.w, s * (l.w + t));
      // Pin plate flat on the inner side face: the welded peg's top hole, the detent hole two stations down, the offset hole.
      const plate = minus(box([px0, l.plate0, r.bracketBottom], [px1, l.plate1, r.bracketTop]),
        rod([0, l.plate0 - 1, l.detentZ], [0, l.plate1 + 1, l.detentZ], pinR + 1.2, 24), rod([s * inch(.75), l.plate0 - 1, l.detentZ - inch(1.9)], [s * inch(.75), l.plate1 + 1, l.detentZ - inch(1.9)], pinR + 1.2, 24),
        box([-s * inch(.9) - 2, l.plate0 - 1, -inch(3.2)], [-s * inch(.9) + 2, l.plate1 + 1, -inch(1.6)]));
      // Diagonal formed gusset from the plate's front edge forward and inward to the ear plate.
      const A: Vec2 = [s * l.w, l.plate0], B: Vec2 = [l.earX, l.ear0 - t], n = t * 1.3;
      const diag = prism([A, [A[0] + s * n, A[1]], [B[0] + s * n, B[1]], B], r.bracketBottom, r.webTop, 'z');
      const earPts: Vec2[] = [[l.earX, r.webTop], [l.axisX, r.axisZ + r.earRadius], [l.axisX, r.axisZ - r.earRadius], [l.earX, r.bracketBottom]];
      const ear = minus(union([prism(earPts, l.ear0 - t, l.ear0, 'y'), rod([l.axisX, l.ear0 - t, r.axisZ], [l.axisX, l.ear0, r.axisZ], r.earRadius, 40)]),
        rod([l.axisX, l.ear0 - t - 1, r.axisZ], [l.axisX, l.ear0 + 1, r.axisZ], inch(.34), 24),
        ...[-1, 1].map(side => box([l.axisX + side * inch(.95) - 2.5, l.ear0 - t - 1, r.axisZ - inch(.45)], [l.axisX + side * inch(.95) + 2.5, l.ear0 + 1, r.axisZ + inch(.45)])));
      const steel = union([plate, diag, ear]);
      const liner = box([px0 + 2, l.face, r.bracketBottom + 3], [px1 - 2, l.plate0, r.bracketTop - 3]);
      // Laser-cut ROGUE panel on the gusset's outer face (a flat recessed band; no lettering reproduced).
      const d: Vec2 = [B[0] - A[0], B[1] - A[1]];
      const off = (q: Vec2, f: number, e: number): Vec2 => [q[0] + d[0] * f + s * e, q[1] + d[1] * f];
      const badge = prism([off(A, .12, n + .1), off(A, .88, n + .1), off(A, .88, n + .5), off(A, .12, n + .5)], r.bracketBottom + 14, r.webTop - 12, 'z');
      // Welded peg through the upright from the top hole; the detent pin two stations down with its handle on the inner side.
      const pins = union([rod([0, -l.face - 12, 0], [0, l.plate1 + 5, 0], pinR, 24), rod([0, l.plate1, 0], [0, l.plate1 + 5, 0], pinR + 4, 24),
        rod([0, -l.face - 14, l.detentZ], [0, l.plate1 + 12, l.detentZ], pinR, 24), rod([0, l.plate1 + 4, l.detentZ], [0, l.plate1 + 12, l.detentZ], pinR + 4, 24)]);
      const ry = l.plate1 + 18;
      const ring = lite
        ? union([rod([-26, ry, l.detentZ], [26, ry, l.detentZ], 7, 16), box([-5, l.plate1 + 11, l.detentZ - 5], [5, ry, l.detentZ + 5])])
        : minus(rod([0, ry - 2, l.detentZ - 30], [0, ry + 2, l.detentZ - 30], 21, 32), rod([0, ry - 3, l.detentZ - 30], [0, ry + 3, l.detentZ - 30], 15, 32));
      const bolt = union([rod([l.axisX, l.ear0 - t - 7, r.axisZ], [l.axisX, l.ear0 - t, r.axisZ], inch(.55), 24), rod([l.axisX, l.ear0 - t, r.axisZ], [l.axisX, l.ear0 + 8, r.axisZ], inch(.31), 20)]);
      return { steel, liner, badge, pins, ring, bolt };
    };
    const near = bracket(), far = bracket();
    const flip = (m: Manifold) => k.k(k.k(m.mirror([0, 1, 0])).translate([0, l.S, 0]));
    const both = (key: keyof typeof near) => union([near[key], flip(far[key])]);
    put('MG Black 1/4 in formed brackets', both('steel'), MG_BLACK, 'source');
    put('UHMW clasp liners', both('liner'), UHMW, 'liner');
    put('ROGUE laser-cut panel', both('badge'), CUTOUT, 'source');
    put(lite ? '5/8 in pegs and detent pins' : '1 in pegs and detent pins', both('pins'), ZINC, 'fastener');
    put(lite ? 'Orange detent pin handles' : 'Detent pin rings', both('ring'), lite ? { color: '#e4661b', metalness: .1, roughness: .55 } : FINISH.black, 'handle');
    put('5/8 in button-head axle screws', both('bolt'), FINISH.blackZinc, 'fastener');
    // 41 x 6 in vinyl roller with gathered ends and end-cap bosses.
    const R = r.padDiameter / 2, L = l.pad1 - l.pad0;
    const pad = revolve([[0, 0], [R - 26, 0], [R - 9, 3], [R - 2, 11], [R, 22], [R, L - 22], [R - 2, L - 11], [R - 9, L - 3], [R - 26, L], [0, L]], [l.axisX, l.pad0, r.axisZ], 'y', 64);
    // Pleats: shallow radial grooves in each gathered end.
    const pleats = Array.from({ length: 14 }, (_, i) => i * Math.PI / 7).flatMap(a => [l.pad0 - 1, l.pad1 - 5].map(y =>
      k.k(k.k(box([-2, 0, 0], [2, 6, R - 30]).rotate([0, a * 180 / Math.PI, 0])).translate([l.axisX, y, r.axisZ]))));
    put('41 x 6 in black vinyl roller pad', minus(pad, ...pleats), VINYL, 'source');
    put('Roller end caps', union([l.pad0 - 3, l.pad1 - 1].map(y => rod([l.axisX, y, r.axisZ], [l.axisX, y + 4, r.axisZ], r.boss / 2, 32))), FINISH.black, 'source');
  });
}

// ─── REP Fitness Utility Seat ───────────────────────────────────────────────────────────────────────────────────────
export function buildUtilitySeat(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_UTILITY_SEAT.defaults, ...params }, l = utilitySeatLayout(p), u = UTILITY_SEAT, t = u.steel, s = l.s, W = l.halfW;
  const pinR = (p.pin ? inch(.625) : inch(1)) / 2 - .3;
  return buildWith(api, k => {
    const { box, rod, union, minus, put } = k;
    const X = (a: number, b: number) => [lo(a, b), hi(a, b)] as const;
    const [p0, p1] = X(l.plate0, l.plate1), [w0, w1] = X(l.wall0, l.wall1);
    // End plates over each member: REP logo window above the member, a stadium hand slot inboard of the wall.
    const slot = (x: number) => union([box([x - u.slot[0] / 2 + u.slot[1] / 2, -u.slot[1] / 2, l.deck0 - 1], [x + u.slot[0] / 2 - u.slot[1] / 2, u.slot[1] / 2, l.deckTop + 1]),
      ...[-1, 1].map(e => rod([x + e * (u.slot[0] / 2 - u.slot[1] / 2), 0, l.deck0 - 1], [x + e * (u.slot[0] / 2 - u.slot[1] / 2), 0, l.deckTop + 1], u.slot[1] / 2, 24))]);
    const handX = [l.wall0 + s * inch(1.9), l.wall1 - s * inch(1.9)], logoX = [l.near - s * inch(1.5), l.far + s * inch(1.5)];
    const windows = logoX.map(x => box([x - inch(1.1), -inch(1.4), l.deck0 - 1], [x + inch(1.1), inch(1.4), l.deckTop + 1]));
    const deck = minus(box([p0, -W - inch(.35), l.deck0], [p1, W + inch(.35), l.deckTop]), ...handX.map(slot), ...windows);
    // Tray: side rails, end walls with the alternating 1 in / 5/8 in pin-hole row, two cross ribs, round bars under the slots.
    const row = (x: number) => Array.from({ length: 9 }, (_, i) => rod([x - 8, (i - 4) * inch(1.25), 0], [x + 8, (i - 4) * inch(1.25), 0], (i % 2 ? inch(.6875) : inch(1.0625)) / 2, 20));
    const walls = [l.wall0, l.wall1].map((x, i) => { const inward = i ? -s : s; return minus(box([lo(x, x + inward * t), -W, l.bottom], [hi(x, x + inward * t), W, l.deck0 + .5]), ...row(x)); });
    const rails = [-1, 1].map(e => box([w0 + t - .5, e > 0 ? W - t : -W, l.bottom], [w1 - t + .5, e > 0 ? W : -W + t, l.deck0 + .5]));
    const ribs = [1 / 3, 2 / 3].map(f => { const x = w0 + (w1 - w0) * f; return box([x - t / 2, -W + t - .5, l.bottom + 10], [x + t / 2, W - t + .5, l.deck0 + .5]); });
    const bars = handX.map(x => rod([x, -inch(2.6), l.deck0 - 16], [x, inch(2.6), l.deck0 - 16], 12.7, 24));
    const hangers = handX.flatMap(x => [-1, 1].map(e => box([x - 6, e * inch(2.6) - 4, l.deck0 - 30], [x + 6, e * inch(2.6) + 4, l.deck0 + .5])));
    put('Metallic black 11-gauge seat frame', union([deck, ...walls, ...rails, ...ribs, ...bars, ...hangers]), { color: '#26282b', metalness: .6, roughness: .38 }, 'source');
    put('Non-slip rubber mat', box([-u.top[0] / 2 + (l.wall0 + l.wall1) / 2, -u.top[1] / 2, l.deckTop], [u.top[0] / 2 + (l.wall0 + l.wall1) / 2, u.top[1] / 2, l.deckTop + u.mat]), { color: '#1b1b1c', metalness: 0, roughness: .96 }, 'liner');
    // UHMW liners on the end walls (against the members' inner faces) and under the end plates (on the members' tops).
    const liners = [[l.near, l.wall0], [l.far, l.wall1]].flatMap(([m, w]) => [box([lo(m, w), -W + 8, l.bottom + 6], [hi(m, w), W - 8, l.deck0 - 2]), box([lo(m, m - s * (m === l.near ? 1 : -1) * inch(3)), -W + 10, l.top], [hi(m, m - s * (m === l.near ? 1 : -1) * inch(3)), W - 10, l.deck0])]);
    put(p.liners ? 'Thick UHMW liners (49 in rack kit)' : 'UHMW liners', union(liners), UHMW, 'liner');
    // Quick-release pins through each member's side hole into the end wall; the ring outside the member.
    const pins = [[l.near, -s], [l.far, s]].map(([m, out]) => {
      const x0 = m + out * (2 * l.hw + 18), x1 = (m === l.near ? l.wall0 : l.wall1) - out * (t + 10);
      return union([rod([x0, 0, 0], [x1, 0, 0], pinR, 24), rod([x0, 0, 0], [x0 + out * 6, 0, 0], pinR + 5, 24)]);
    });
    put(p.pin ? '5/8 in quick-release pins' : '1 in quick-release pins', union(pins), ZINC, 'fastener');
    put('Pin rings', union([[l.near, -s], [l.far, s]].map(([m, out]) => { const x = m + out * (2 * l.hw + 30); return minus(rod([x - 2, 0, -24], [x + 2, 0, -24], 19, 28), rod([x - 3, 0, -24], [x + 3, 0, -24], 14, 28)); })), ZINC, 'handle');
    if (p.pad) {
      const mid = (l.wall0 + l.wall1) / 2, z0 = l.deckTop + u.mat;
      put('Utility Seat Pad, CleanGrip vinyl', k.rbox([mid - inch(16.5), -inch(5.75), z0], [mid + inch(16.5), inch(5.75), z0 + inch(2.5)], 22, 'z'), VINYL, 'source');
      put('REP pad badge', box([mid - inch(2), -inch(5.75) - .4, z0 + inch(.9)], [mid + inch(2), -inch(5.75), z0 + inch(1.6)]), { color: '#e9e9e7', metalness: 0, roughness: .6 }, 'source');
    }
  });
}

// ─── Darko Lifting Thresher Pad ─────────────────────────────────────────────────────────────────────────────────────
export function buildThresherPad(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...DARKO_THRESHER_PAD.defaults, ...params }, l = thresherLayout(p), t = THRESHER, liner = THRESHER_LINERS[p.liner] ?? THRESHER_LINERS[0];
  return buildWith(api, k => {
    const { box, prism, rod, union, minus, put } = k;
    const turn = (m: Manifold) => l.deg ? k.k(m.rotate([-l.deg, 0, 0])) : m;
    const outline = thresherOutline(), R = l.lockR, hole = t.hole / 2;
    // Holes in the plate frame (before the angle): pivot, the five lock holes on the arc, the pair near the pad, the D.
    const at: Vec2[] = [[0, 0], ...[0, 15, 30, 45, 60].map(a => [-R * Math.cos(a * Math.PI / 180), -R * Math.sin(a * Math.PI / 180)] as Vec2), ...t.pairHoles.map(([y, z]) => [inch(y), inch(z)] as Vec2)];
    // Darko "D" mark as a plain D-shaped cut-out (no logo artwork): straight side toward the rack.
    const [dy, dz, dr] = t.logo, d: Vec2[] = [[inch(dy - dr), inch(dz + dr)], [inch(dy - dr), inch(dz - dr)], ...Array.from({ length: 9 }, (_, i) => { const a = (-90 + i * 22.5) * Math.PI / 180; return [inch(dy - dr * .2) + inch(dr) * Math.cos(a), inch(dz) + inch(dr) * Math.sin(a)] as Vec2; })];
    const plates = [-1, 1].map(side => {
      const [x0, x1] = side > 0 ? [l.x0, l.x1] : [-l.x1, -l.x0];
      const cuts = [...at.map(([y, z]) => rod([x0 - 1, y, z], [x1 + 1, y, z], hole, 24)), prism(d, x0 - 1, x1 + 1, 'x')];
      const flange = box([side > 0 ? l.x1 - .5 : -l.x1 - t.flange, inch(-4.7), t.padZ - t.steel], [side > 0 ? l.x1 + t.flange : -l.x1 + .5, inch(1), t.padZ]);
      return union([minus(prism(outline, x0, x1, 'x'), ...cuts), flange]);
    });
    put('Wrinkle black 3/16 in side plates', turn(union(plates)), { color: '#1b1c1e', metalness: .25, roughness: .88 }, 'source');
    const liners = [-1, 1].map(side => minus(prism(outline, side > 0 ? l.hw : -l.x0, side > 0 ? l.x0 : -l.hw, 'x'), ...at.map(([y, z]) => rod([-l.x1, y, z], [l.x1, y, z], hole, 24))));
    put(liner[0], turn(union(liners)), { color: liner[1], metalness: 0, roughness: .7 }, 'liner');
    // Pad: steel substrate plate, then the grippy cushion with a stitched top seam.
    const [pw, pl, ph] = t.pad, y0 = t.padY - pl / 2, y1 = t.padY + pl / 2, zs = t.padZ + 12;
    put('Steel pad substrate', turn(box([-pw / 2 + inch(.5), y0 + inch(.5), t.padZ], [pw / 2 - inch(.5), y1 - inch(.5), zs])), { color: '#202124', metalness: .4, roughness: .6 }, 'source');
    // Pillowed cushion: full-size sides, the top edge rolled in by 10 mm.
    const top = t.padZ + ph, cushion = k.k(k.M.hull([k.rbox([-pw / 2, y0, zs], [pw / 2, y1, top - 12], 16, 'z'), k.rbox([-pw / 2 + 10, y0 + 10, top - 1], [pw / 2 - 10, y1 - 10, top], 10, 'z')]));
    put('Grippy seat pad', turn(cushion), { color: '#1e1f21', metalness: 0, roughness: .93 }, 'source');
    put('Top-stitched seam', turn(minus(k.rbox([-pw / 2 - .5, y0 - .5, top - 17], [pw / 2 + .5, y1 + .5, top - 14], 16, 'z'), k.rbox([-pw / 2 + 1, y0 + 1, top - 18], [pw / 2 - 1, y1 - 1, top - 13], 15, 'z'))), { color: '#34363a', metalness: 0, roughness: .8 }, 'source');
    // Two 0.98 in Magpins through the plates and the arm (they stay on the arm's hole line; the plates rotate about the pivot).
    const pinR = t.magpin / 2, reach = l.x1 + 4;
    put('0.98 in Magpins (sold separately)', union([0, -R].map(y => rod([-reach - 4, y, 0], [reach, y, 0], pinR, 28))), ZINC, 'fastener');
    // Round polished Magpin heads (as in Darko's photos) on the +X side, the magnet cap on the other.
    put('Magpin heads', union([0, -R].map(y => union([k.k(k.k(k.M.sphere(15, 32)).translate([reach + 11, y, 0])), rod([reach, y, 0], [reach + 8, y, 0], pinR + 2, 24), rod([-reach - 8, y, 0], [-reach - 4, y, 0], pinR + 3, 24)]))), { color: '#c9cdd0', metalness: .95, roughness: .15 }, 'handle');
  });
}
