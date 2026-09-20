/** Brand spotter-arm builders (#133). Source frame (rack-part.ts): origin on the upright centreline at the pin axis,
 * +Y out of the mounting face (y = upright / 2), X across the face, Z up. Numbers: rack-parts/rack-jcups-safeties-spotters.ts. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2 } from '../types.ts';
import { buildWith, FINISH, faceOf, widthOf, type Finish, type Kit } from './rack-jcups-safeties-kit.ts';
import {
  SAML, MONSTER_SPOTTER, REP_SPOTTER, STEALTH, STEALTH_COLORS, ALPHA, ALPHA_ACCENTS,
  ROGUE_SAML_24_SPOTTER_ARMS, ROGUE_MONSTER_SPOTTER_ARMS_2, REP_SPOTTER_ARMS, SURPLUS_STEALTH_SPOTTERS, OAK_CLUB_ALPHA_SPOTTER_ARMS,
} from '../rack-parts/rack-jcups-safeties-spotters.ts';

const ORANGE: Finish = { color: '#f07a1f', metalness: .05, roughness: .5 };
/** Rectangular hollow arm tube along +Y (x ±w/2, z from top - h to top), open ends capped later. */
function armTube(k: Kit, y0: number, y1: number, w: number, h: number, top: number, wall: number, holes: { n: number; d: number; from: number; step: number; z?: number }) {
  const outer = k.box([-w / 2, y0, top - h], [w / 2, y1, top]), inner = k.box([-w / 2 + wall, y0 - 1, top - h + wall], [w / 2 - wall, y1 + 1, top - wall]);
  const cuts: Manifold[] = [inner];
  for (let i = 0; i < holes.n; i++) { const y = holes.from + i * holes.step; if (y > y1 - 20) break; cuts.push(k.rod([-w, y, holes.z ?? top - h / 2], [w, y, holes.z ?? top - h / 2], holes.d / 2, 24)); }
  return k.minus(outer, ...cuts);
}
/** Laser-cut hole numbers as small flat plates below each hole (no lettering reproduced). */
function numberTabs(k: Kit, w: number, zTab: number, holes: { n: number; from: number; step: number }, y1: number) {
  const tabs: Manifold[] = [];
  for (let i = 0; i < holes.n; i++) { const y = holes.from + i * holes.step; if (y > y1 - 20) break; for (const s of [1, -1]) tabs.push(k.box([s > 0 ? w / 2 : -w / 2 - .3, y - 4, zTab - 5], [s > 0 ? w / 2 + .3 : -w / 2, y + 4, zTab + 5])); }
  return k.union(tabs);
}
/** Ring-handled pin (hitch / detent) along Y at height z, handle ring in the YZ plane in front of `yFront`. */
function ringPin(k: Kit, f: number, z: number, r: number, yFront: number, ring: Finish, name: string) {
  const len = yFront + 12 - (f - 60);
  k.put(name, k.revolve([[0, 0], [r - 1.2, 0], [r, 1.2], [r, len], [0, len]], [0, f - 60, z], 'y', 24), FINISH.zinc, 'rod');
  const loop = k.k(k.k(k.k(k.C.circle(22, 36)).subtract(k.k(k.C.circle(15, 36)))).extrude(5));
  k.put(name + ' ring', k.k(k.k(loop.rotate([0, 90, 0])).translate([-2.5, yFront + 12 + 18, z])), ring, 'handle');
}

export function buildSaml(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_SAML_24_SPOTTER_ARMS.defaults, ...params }, f = faceOf(p), wu = widthOf(p) / 2, a = SAML, t = a.plate, pitch = p.mountSpacing ?? 50;
  return buildWith(api, k => {
    const steel: Manifold[] = [], end = f + a.reach, cx = wu + .6;
    steel.push(armTube(k, f + t - .5, end, a.w, a.h, a.top, a.wall, { n: a.holes, d: a.holeD, from: f + 110, step: 50.8 }));
    steel.push(k.rbox([-a.w / 2, f, a.low], [a.w / 2, f + t, a.high], 6, 'y'));
    // Horizontal U clasp at arm level wrapping both side faces of the upright.
    for (const s of [1, -1]) steel.push(k.rbox([s > 0 ? cx : -cx - t, f - a.claspBack, a.top - a.h], [s > 0 ? cx + t : -cx, f + t, a.top], 6, 'x'), k.box([s > 0 ? a.w / 2 - .5 : -cx - t, f, a.top - a.h], [s > 0 ? cx + t : -a.w / 2 + .5, f + t, a.top]));
    const g: Vec2[] = [[f + t - .5, a.top - a.h + .5], [f + a.gussetOut, a.top - a.h + .5], [f + t - .5, a.low + 30]];
    steel.push(k.prism(g, -t / 2, t / 2, 'x'));
    steel.push(k.box([-a.w / 2, end - t, a.top - a.h], [a.w / 2, end, a.top + a.strip + a.lip]));
    k.put('3 × 3 in 11-gauge arm, end plate, clasp and gusset', k.union(steel), FINISH.black);
    k.put('Gusset logo cut-out', k.union([1, -1].map(s => k.box([s > 0 ? t / 2 : -t / 2 - .3, f + 60, a.top - a.h - 55], [s > 0 ? t / 2 + .3 : -t / 2, f + 170, a.top - a.h - 30]))), { color: '#0b0b0c', metalness: 0, roughness: .9 });
    k.put('UHMW top insert', k.box([-a.w / 2 + 6, f + a.flatFrom, a.top], [a.w / 2 - 6, end - t - 1, a.top + a.strip]), FINISH.uhmw, 'liner');
    k.put('5/8 in welded top pin', k.revolve([[0, 0], [6.4, 0], [7.9, 1.5], [7.9, 80], [0, 80]], [0, f - 80, 0], 'y', 24), FINISH.black, 'rod');
    ringPin(k, f, -4 * pitch, 7.9, f + t, ORANGE, '5/8 in hitch pin');
  });
}

export function buildMonsterSpotter(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_SPOTTER_ARMS_2.defaults, ...params }, f = faceOf(p), wu = widthOf(p) / 2, a = MONSTER_SPOTTER, t = a.plate, pitch = p.mountSpacing ?? 50;
  return buildWith(api, k => {
    const steel: Manifold[] = [], end = f + a.reach, cx = wu + .6;
    steel.push(armTube(k, f + t - .5, end, a.w, a.h, a.top, a.wall, { n: a.holes, d: a.holeD, from: f + 150, step: 50.8 }));
    // 3/8 in laser clasp: a tall front plate and side cheeks that wrap the upright.
    steel.push(k.rbox([-cx - t, f, a.claspBottom], [cx + t, f + t, a.claspTop], 8, 'y'));
    for (const s of [1, -1]) steel.push(k.rbox([s > 0 ? cx : -cx - t, f - a.claspBack, a.claspBottom], [s > 0 ? cx + t : -cx, f + t, a.claspTop], 8, 'x'));
    // Top triangle carrying the welded pin, and the extended 3/16 in lower gusset with its pin window.
    const top: Vec2[] = [[f + t - .5, a.top - .5], [f + a.flatFrom, a.top - .5], [f + t - .5, a.claspTop]];
    steel.push(k.prism(top, -t / 2, t / 2, 'x'));
    const g: Vec2[] = [[f + t - .5, a.top - a.h + .5], [f + a.gussetOut, a.top - a.h + .5], [f + t + 60, a.low], [f + t - .5, a.low]];
    steel.push(k.minus(k.prism(g, -a.gusset / 2, a.gusset / 2, 'x'), k.box([-10, f + t + 18, -3 * pitch - 22], [10, f + t + 70, -3 * pitch + 22])));
    steel.push(k.box([-a.w / 2, end - t, a.top - a.h], [a.w / 2, end, a.top + a.strip + a.lip]));
    k.put('3/8 in clasp, 3 × 3 in arm and gussets', k.union(steel), FINISH.black);
    k.put('Hole numbers', numberTabs(k, a.w, a.top - a.h + 12, { n: a.holes, from: f + 150, step: 50.8 }, end), { color: '#0b0b0c', metalness: 0, roughness: .9 });
    k.put('Gusset logo cut-out', k.union([1, -1].map(s => k.box([s > 0 ? a.gusset / 2 : -a.gusset / 2 - .3, f + 110, a.top - a.h - 60], [s > 0 ? a.gusset / 2 + .3 : -a.gusset / 2, f + 290, a.top - a.h - 30]))), { color: '#0b0b0c', metalness: 0, roughness: .9 });
    k.put('UHMW top liner', k.box([-a.w / 2 + 4, f + a.flatFrom, a.top], [a.w / 2 - 4, end - t - 1, a.top + a.strip]), FINISH.uhmw, 'liner');
    // Face Saver: angled UHMW over the top triangle.
    const fs: Vec2[] = [[f + t + 2, a.claspTop - 6], [f + a.flatFrom, a.top + a.strip], [f + a.flatFrom - 14, a.top + a.strip], [f + t + 2, a.claspTop - 26]];
    k.put('Face Saver angled UHMW', k.prism(fs, -a.w / 2 + 4, a.w / 2 - 4, 'x'), FINISH.uhmw, 'liner');
    k.put('1 in welded top pin', k.revolve([[0, 0], [11, 0], [12.4, 1.5], [12.4, 80], [0, 80]], [0, f - 80, 0], 'y', 32), FINISH.black, 'rod');
    ringPin(k, f, -3 * pitch, 12.4, f + t, FINISH.blackZinc, '1 in detent pin');
  });
}

export function buildRepSpotter(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_SPOTTER_ARMS.defaults, ...params }, f = faceOf(p), wu = widthOf(p) / 2, a = REP_SPOTTER, t = a.plate, pinR = p.series ? 12.4 : 7.9;
  if (![0, 1].includes(p.series)) throw Error('Unsupported REP spotter arm series.');
  return buildWith(api, k => {
    const steel: Manifold[] = [], y0 = f + a.pad, end = f + a.reach, cx = wu + .6, W = 38.1;
    steel.push(armTube(k, y0 + t - .5, end, a.w, a.h, a.top, a.wall, { n: a.holes, d: a.holeD, from: y0 + 95, step: 53 }));
    steel.push(k.rbox([-W, y0, a.low], [W, y0 + t, a.high], 5, 'y'));
    // Upper U clasp above the arm and the lower padded wrap.
    const upper = [a.top + 6, a.high], lower = [a.low, a.low + 48];
    for (const [z0, z1] of [upper, lower]) for (const s of [1, -1]) steel.push(k.rbox([s > 0 ? cx : -cx - 6, f - a.claspBack, z0], [s > 0 ? cx + 6 : -cx, y0 + t, z1], 4, 'x'), k.box([s > 0 ? W - .5 : -cx - 6, f, z0], [s > 0 ? cx + 6 : -W + .5, y0 + t, z1]));
    // Welded 2 mm support strut from the plate foot to the arm underside, and the 5 mm gusset between.
    const sa: [number, number, number] = [0, y0 + t, a.low + 60], sb: [number, number, number] = [0, y0 + 330, a.top - a.h];
    const len = Math.hypot(sb[1] - sa[1], sb[2] - sa[2]), ang = Math.atan2(sb[2] - sa[2], sb[1] - sa[1]) * 180 / Math.PI;
    const hollow = k.minus(k.box([-a.strut / 2, -12, -a.strutH / 2], [a.strut / 2, len + 12, a.strutH / 2]), k.box([-a.strut / 2 + 2, -13, -a.strutH / 2 + 2], [a.strut / 2 - 2, len + 13, a.strutH / 2 - 2]));
    const strut = k.k(k.k(hollow.rotate([ang, 0, 0])).translate([0, sa[1], sa[2]]));
    steel.push(k.k(strut.intersect(k.box([-W, y0 + t - .5, a.low], [W, end, a.top - a.h + 1]))));
    steel.push(k.prism([[y0 + t - .5, a.top - a.h + .5], [y0 + 220, a.top - a.h + .5], [y0 + t - .5, a.low + 70]], -2.5, 2.5, 'x'));
    steel.push(k.box([-a.w / 2, end - t, a.top - a.h], [a.w / 2, end, a.top + a.lip]));
    k.put('Matte black arm, end plate, clasps, strut and gusset', k.union(steel), FINISH.black);
    k.put('Hole numbers', numberTabs(k, a.w, a.top - a.h + 12, { n: a.holes, from: y0 + 95, step: 53 }, end), { color: '#0b0b0c', metalness: 0, roughness: .9 });
    k.put('REP logo plate', k.union([1, -1].map(s => k.box([s > 0 ? 2.5 : -2.8, y0 + 30, a.top - a.h - 42], [s > 0 ? 2.8 : -2.5, y0 + 110, a.top - a.h - 16]))), { color: '#e9e9e7', metalness: 0, roughness: .6 });
    k.put('Molded polyurethane upright pads', k.union([k.box([-W + 3, f, a.top - 20], [W - 3, y0, a.high - 4]), k.box([-W + 3, f, a.low + 4], [W - 3, y0, a.low + 44])]), FINISH.uhmw, 'liner');
    k.put(p.series ? '1 in pin' : '5/8 in pin', k.revolve([[0, 0], [pinR - 1.5, 0], [pinR, 1.5], [pinR, 85 + a.pad], [0, 85 + a.pad]], [0, f - 85, 0], 'y', 32), FINISH.black, 'rod');
  });
}

export function buildStealth(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...SURPLUS_STEALTH_SPOTTERS.defaults, ...params }, tone = STEALTH_COLORS[p.color]; if (!tone) throw Error('Unsupported Stealth Spotter colour.');
  const f = faceOf(p), wu = widthOf(p) / 2, a = STEALTH, t = a.plate, s = a.side;
  return buildWith(api, k => {
    const steel: Manifold[] = [], end = f + a.reach, cx = wu + .6, W = a.w / 2, bottom = a.low;
    // Side-mount channel: front web plus side cheeks with the rear locking slot, 7 in tall (three holes).
    // Members sit 0.3 mm off each other's faces (coplanar seams leave zero-area triangles in the print export).
    const e = .3;
    steel.push(k.box([-cx - t + e, f + e, bottom + e], [cx + t - e, f + t - e, a.high - e]));
    for (const side of [1, -1]) steel.push(k.minus(k.rbox([side > 0 ? cx : -cx - t, f - a.claspBack, bottom], [side > 0 ? cx + t : -cx, f + t, a.high], 6, 'x'),
      k.rbox([side > 0 ? cx - 1 : -cx - t - 1, f - a.claspBack + 8, -120], [side > 0 ? cx + t + 1 : -cx + 1, f - a.claspBack + 30, -60], 8, 'x')));
    // Arm: two 1/4 in side plates whose top rises to the channel, a bottom plate and the front lip plate.
    const prof: Vec2[] = [[f + t - .5, bottom], [end, bottom], [end, a.top + a.strip + a.lip], [end - 10, a.top + a.strip + a.lip], [end - 10, a.top], [f + a.flatFrom, a.top], [f + 40, a.high - 20], [f + t - .5, a.high - 20]];
    const holes = Array.from({ length: a.holes }, (_, i) => k.rod([-W - 1, f + 170 + i * 50.8, bottom + 38], [W + 1, f + 170 + i * 50.8, bottom + 38], a.holeD / 2, 24));
    for (const side of [1, -1]) steel.push(k.minus(k.prism(prof, side > 0 ? W - s : -W, side > 0 ? W : -W + s, 'x'), ...holes));
    steel.push(k.box([-W + s - .5, f + t - .5, bottom + e], [W - s + .5, end - e, bottom + s]));
    steel.push(k.box([-W + e, end - t, bottom + 2 * e], [W - e, end - e, a.top + a.strip + a.lip]));
    k.put('Hand-welded side plates, channel and lip', k.union(steel), { color: tone[1], metalness: .2, roughness: .82 });
    k.put('Hole numbers', numberTabs(k, a.w, bottom + 12, { n: a.holes, from: f + 170, step: 50.8 }, end), { color: '#0b0b0c', metalness: 0, roughness: .9 });
    k.put('Lip logo cut-out', k.union([1, -1].map(side => k.box([side > 0 ? W : -W - .3, end - 60, bottom + 10], [side > 0 ? W + .3 : -W, end - 20, bottom + 45]))), { color: '#0b0b0c', metalness: 0, roughness: .9 });
    k.put('UHMW catch', k.box([-W + s, f + a.flatFrom, a.top], [W - s, end - t - 1, a.top + a.strip]), FINISH.uhmw, 'liner');
    k.put('1 in welded stainless pin', k.revolve([[0, 0], [11, 0], [12.4, 1.5], [12.4, 82], [0, 82]], [0, f - 82, 0], 'y', 32), FINISH.stainless, 'rod');
  });
}

export function buildAlpha(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...OAK_CLUB_ALPHA_SPOTTER_ARMS.defaults, ...params }, accent = ALPHA_ACCENTS[p.accent]; if (!accent || ![0, 1].includes(p.pin)) throw Error('Unsupported Alpha spotter arm option.');
  const f = faceOf(p), wu = widthOf(p) / 2, a = ALPHA, s = a.side, ct = a.collarT, back = -(p.upright ?? 75) / 2, pinR = p.pin ? 12.4 : 7.9;
  return buildWith(api, k => {
    const steel: Manifold[] = [], end = f + a.reach, W = a.w / 2, cx = wu + .6, half = a.h / 2;
    // Wrap-around collar (front, both sides and back) centred on the pin, 1/4 in plate.
    const ch = a.collarH / 2;
    // Members sit 0.3 mm off each other's faces (coplanar seams leave zero-area triangles in the print export).
    const e = .3;
    steel.push(k.box([-cx - ct + e, f, -ch + e], [cx + ct - e, f + ct, ch - e]), k.box([-cx - ct + e, back - .6 - ct, -ch + e], [cx + ct - e, back - .6, ch - e]));
    for (const side of [1, -1]) steel.push(k.minus(k.box([side > 0 ? cx : -cx - ct, back - .6 - ct - e, -ch], [side > 0 ? cx + ct : -cx, f + ct + e, ch]), k.rod([-cx - ct - 1, 0, 0], [cx + ct + 1, 0, 0], pinR + .6, 32)));
    // Double-sided arm: 3/16 in side plates that flare top and bottom toward the collar, with club and ring cut-outs.
    const prof: Vec2[] = [[f + ct - .5, -a.flare], [f + a.flatFrom, -half], [end, -half], [end, half], [f + a.flatFrom, half], [f + ct - .5, a.flare]];
    const cuts: Manifold[] = [];
    for (let i = 0; i < 9; i++) { const y = f + a.flatFrom + 25 + i * 50; if (y > end - 30) break; cuts.push(k.rod([-W - 1, y, 0], [W + 1, y, 0], i % 2 ? 9 : 14, 20)); }
    for (const side of [1, -1]) steel.push(k.minus(k.prism(prof, side > 0 ? W - s : -W, side > 0 ? W : -W + s, 'x'), ...cuts));
    steel.push(k.box([-W + s - .5, f + ct - .5, -half + e], [W - s + .5, end - e, -half + s]), k.box([-W + s - .5, f + ct - .5, half - s], [W - s + .5, end - e, half - e]));
    steel.push(k.box([-W + e, end - 6.35, -half + 2 * e], [W - e, end, half - 2 * e]));
    k.put('Welded 3/16 in and 1/4 in plate arm and collar', k.union(steel), FINISH.black);
    k.put('Accent cut-out inserts', k.union(cuts.map(c => k.k(c.intersect(k.box([-W - .01, f, -half], [-W + 1.2, end, half]))))), { color: accent[1], metalness: .5, roughness: .4 });
    k.put('3/8 in UHMW catch, both faces', k.union([k.box([-W + 2, f + a.flatFrom, half], [W - 2, end - 1, half + a.strip]), k.box([-W + 2, f + a.flatFrom, -half - a.strip], [W - 2, end - 1, -half])]), FINISH.uhmw, 'liner');
    k.put('UHMW tip caps', k.box([-W, end, -half - a.strip], [W, end + 6, half + a.strip]), FINISH.uhmw, 'liner');
    k.put(p.pin ? '1 in MagPin' : '5/8 in MagPin', k.rod([-cx - ct - 4, 0, 0], [cx + ct + 2, 0, 0], pinR, 32), FINISH.stainless, 'rod');
    k.put('MagPin knob', k.revolve([[0, 0], [19, 0], [20, 2], [20, 14], [19, 16], [0, 16]], [cx + ct + 2, 0, 0], 'x', 36), FINISH.stainless, 'handle');
  });
}
