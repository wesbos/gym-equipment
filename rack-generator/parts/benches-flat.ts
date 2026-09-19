/** Flat and fixed benches: Rogue Flat Utility Bench 2.0, Monster Utility Bench 2.0 (and the Thompson Fat Pad on either),
 * Titan TITAN Series Single Post Flat Bench and Titan Seated Stationary Bench. Origin at the footprint centre, +Y rear. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { FUB_FRAME, MUB_FRAME, ROGUE_PADS, THOMPSON_FAT_PAD, TITAN_COLORS, TITAN_SEATED, TITAN_SPFB, type FlatPad, type Pt } from '../floor-parts/benches-specs.ts';
import { buildBench, RUBBER, STAINLESS, STEEL, VINYL, ZINC, type Kit } from './benches-kit.ts';
const ROGUE_BLACK = '#1c1d1f';
/** Upholstered flat pad centred on the origin, bottom at z0, with Rogue's red side print on fat pads. */
function flatPad(kit: Kit, pad: FlatPad, z0: number) {
  const r = pad.t > 80 ? 30 : 22, e = pad.t > 80 ? 22 : 14;
  kit.add(pad.color === 'textured' ? 'Pad · textured foam' : 'Pad · grabber vinyl', VINYL(pad.color === 'textured' ? '#202123' : '#131416'),
    kit.pad(kit.rectPts(pad.w, pad.len), pad.t, r, e, z0));
  if (pad.logo) for (const x of [-1, 1]) kit.add('Pad print', { color: '#c8102e', role: 'source', metalness: 0, roughness: .6 }, kit.box([.6, pad.len * .42, pad.t * .42], [x * (pad.w / 2 + .2), 0, z0 + pad.t * .45]));
  kit.add('Pad substrate', STEEL('#0f1011', .8, 0), kit.planSlab(kit.rectPts(pad.w - 14, pad.len - 14), z0 - 6, 6, 16));
}
/** Rogue Flat Utility Bench 2.0: single-piece notched-and-formed 2×3 frame with raked legs and rubber-footed 14 in feet. */
export function buildRogueFUB(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const pad = p.pad === 1 ? THOMPSON_FAT_PAD : { name: 'Standard', len: FUB_FRAME.pad.len, w: FUB_FRAME.pad.w, t: FUB_FRAME.pad.t, color: 'textured' as const };
  return buildBench(api, kit => {
    const { tube, tubeYZ, box, add } = kit, F: Manifold[] = [], rub: Manifold[] = [];
    const L = FUB_FRAME.L, W = FUB_FRAME.W, zb = FUB_FRAME.padBottom - 6, rail = 51, footY = L / 2 - 38;
    F.push(tubeYZ(0, [-(L / 2 - 175), zb - rail / 2], [L / 2 - 175, zb - rail / 2], rail, 76));
    for (const y of [-1, 1]) {
      F.push(tubeYZ(0, [y * (L / 2 - 175), zb - rail / 2], [y * footY, 51 + 8], 51, 76));
      F.push(tube([-(W / 2 - 40), y * footY, 8 + 51 / 2], [W / 2 - 40, y * footY, 8 + 51 / 2], 51, 76));
      for (const x of [-1, 1]) rub.push(box([44, 76, 8 + 51 + 3], [x * (W / 2 - 22), y * footY, (8 + 51 + 3) / 2]));
    }
    // White vertical ROGUE decal on the outer (end-facing) face of the rear leg, following its rake.
    const top: [number, number] = [L / 2 - 175, zb - rail / 2], bot: [number, number] = [footY, 59], rake = Math.atan2(bot[0] - top[0], top[1] - bot[1]);
    const mid: [number, number] = [(top[0] + bot[0]) / 2 + Math.cos(rake) * 26, (top[1] + bot[1]) / 2 + Math.sin(rake) * 26];
    add('Leg decal', { color: '#f1f1ef', role: 'source', metalness: 0, roughness: .6 }, kit.hinge(box([24, 1, 160], [0, mid[0], mid[1]]), mid, rake * 180 / Math.PI));
    flatPad(kit, { ...pad, name: pad.name }, FUB_FRAME.padBottom);
    add('Frame · Black', STEEL(ROGUE_BLACK, .5, .3), ...F);
    add('Rubber feet', RUBBER, ...rub);
    return kit.collect();
  });
}
/** Rogue Monster Utility Bench 2.0: 3×3 11-ga, column front foot with handle, rear base with wheels, R-logo gussets. */
export function buildRogueMUB(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const pad = ROGUE_PADS[p.pad] ?? ROGUE_PADS[0], padB = MUB_FRAME.padBottom[p.height] ?? MUB_FRAME.padBottom[0];
  return buildBench(api, kit => {
    const { tube, tubeYZ, box, span, add, plateYZ, planSlab, wheel, boltX, cyl } = kit, F: Manifold[] = [], rub: Manifold[] = [], hw: Manifold[] = [], tyres: Manifold[] = [], hubs: Manifold[] = [];
    const L = MUB_FRAME.L, W = MUB_FRAME.W, t = 76, zr = padB - t / 2, front = -L / 2 + 95, rearY = L / 2 - 60 - 38;
    F.push(tubeYZ(0, [-L / 2 + 40, zr], [L / 2 - 20, zr], t, t));
    // Front column: post on a flat plate with bolt-on rubber foot; handle bar in front of it.
    F.push(tube([0, front, 12], [0, front, zr], t, t));
    F.push(planSlab(kit.rectPts(190, 150, 0, front), 6, 6, 8));
    rub.push(planSlab(kit.rectPts(196, 156, 0, front), 0, 6, 10));
    const handle = p.handle === 0 ? STEEL(ROGUE_BLACK, .5, .3) : STAINLESS;
    add(p.handle === 0 ? 'Front handle · MG Black' : 'Front handle · knurled stainless', { ...handle, role: 'handle' }, cyl([0, -L / 2 + 16, 12], [0, -L / 2 + 16, p.handle === 2 ? zr - 120 : zr - 30], 32, 24));
    F.push(span([-20, -L / 2 + 16, zr - 36], [20, front, zr - 12]), span([-20, -L / 2 + 16, 6], [20, front - 60, 12]));
    // Rear post on the wide base, wedge rubber feet, twin rear wheels, UHMW storage cap.
    F.push(tube([0, rearY, t], [0, rearY, zr], t, t));
    F.push(tube([-(W / 2 - 50), rearY, 8 + t / 2], [W / 2 - 50, rearY, 8 + t / 2], t, t));
    for (const x of [-1, 1]) {
      rub.push(kit.k(kit.M.hull([box([6, t + 8, t + 10], [x * (W / 2 - 56), rearY, (t + 10) / 2]), box([4, t + 8, 26], [x * (W / 2 - 2), rearY, 13])])));
      for (const g of [-2, -1, 0, 1, 2]) rub.push(box([30, 3, 3], [x * (W / 2 - 30), rearY + g * 14, 27 + (1 - Math.abs(g) * .1) * 2]));
    }
    for (const x of [-1, 1]) {
      wheel(x * 95, L / 2 - 30, 34, 60, 26, tyres, hubs);
      for (const side of [-1, 1]) F.push(span([x * 95 + side * 17 - 2.5, rearY + t / 2, 14], [x * 95 + side * 17 + 2.5, L / 2 - 30, 54]));
    }
    add('UHMW storage cap', { color: '#141516', role: 'liner', metalness: 0, roughness: .5 }, box([t + 6, 18, t + 6], [0, L / 2 - 9, zr]));
    // 3/16 in gussets with laser-cut R logos, both posts, both sides.
    for (const [y, dir] of [[front, 1], [rearY, -1]] as [number, 1 | -1][]) for (const x of [-1, 1]) {
      const g: Pt[] = [[y, zr - t / 2 - 150], [y, zr - t / 2], [y + dir * 150, zr - t / 2]];
      const plate = plateYZ(x * (t / 2 + 2.4), [[y - dir * 30, zr - t / 2 - 170], [y - dir * 30, zr + t / 2 - 8], [y + dir * 170, zr + t / 2 - 8], [y + dir * 170, zr - t / 2 + 4], ...g.slice(0, 1)], 4.8);
      F.push(plate);
      add('Gusset R cut-outs', STEEL('#0c0c0d', .8, 0), plateYZ(x * (t / 2 + 4.9), [[y + dir * 25, zr - t / 2 - 60], [y + dir * 25, zr - t / 2 - 20], [y + dir * 55, zr - t / 2 - 20], [y + dir * 55, zr - t / 2 - 60]], .4));
      for (const [by, bz] of [[y - dir * 12, zr - t / 2 - 120], [y + dir * 120, zr + 10], [y - dir * 12, zr]] as Pt[]) hw.push(boltX(x * (t / 2 + 4.8), by, bz, x as 1 | -1, 20, 7));
    }
    flatPad(kit, pad, padB);
    add('Frame · MG Black', STEEL(ROGUE_BLACK, .45, .35), ...F);
    add('Rubber feet', RUBBER, ...rub);
    add('Wheels', RUBBER, ...tyres);
    add('Wheel hubs', STEEL('#35373a', .35, .7), ...hubs);
    add('Hardware · black zinc', ZINC, ...hw);
    return kit.collect();
  });
}
/** Thompson Fat Pad on a Rogue base (Monster Utility 2.0 standard / Shorty, or Flat Utility 2.0). */
export function buildThompsonFatPad(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return p.base === 2 ? buildRogueFUB(api, { pad: 1 }) : buildRogueMUB(api, { pad: 2, height: p.base, handle: 0 });
}
/** TITAN Series Single Post Flat Bench: 3×3 11-ga single front post, knurled loop handle, rear base with wheels. */
export function buildTitanSPFB(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const color = TITAN_COLORS[p.color] ?? TITAN_COLORS[0];
  return buildBench(api, kit => {
    const { tube, tubeYZ, box, span, add, planSlab, wheel, capsules } = kit, F: Manifold[] = [], rub: Manifold[] = [], tyres: Manifold[] = [], hubs: Manifold[] = [];
    const { L, W, pad } = TITAN_SPFB, t = 76, padB = TITAN_SPFB.top - pad.t, zr = padB - 6 - t / 2, front = -L / 2 + 190, rearY = L / 2 - 170;
    F.push(tubeYZ(0, [front - 60, zr], [rearY + 90, zr], t, t));
    F.push(tube([0, front, 10], [0, front, zr], t, t));
    F.push(planSlab(kit.rectPts(250, 200, 0, front), 4, 8, 10)); rub.push(planSlab(kit.rectPts(254, 204, 0, front), 0, 4, 12));
    add('Knurled handle', { color: '#2e3033', role: 'handle', metalness: .75, roughness: .42 }, capsules([[0, front - t / 2, 110], [0, front - t / 2 - 95, 110], [0, front - t / 2 - 95, 230], [0, front - t / 2, 230]], 32));
    F.push(tube([0, rearY, t + 8], [0, rearY, zr], t, t));
    F.push(tube([-(W / 2 - 60), rearY, 8 + t / 2], [W / 2 - 60, rearY, 8 + t / 2], t, t));
    for (const x of [-1, 1]) rub.push(kit.k(kit.M.hull([box([6, t + 6, t + 10], [x * (W / 2 - 64), rearY, (t + 10) / 2]), box([4, t + 6, 30], [x * (W / 2 - 2), rearY, 15])])));
    for (const x of [-1, 1]) {
      wheel(x * 120, L / 2 - 32, 36, 64, 26, tyres, hubs);
      for (const side of [-1, 1]) F.push(span([x * 120 + side * 17 - 2.5, rearY + t / 2, 16], [x * 120 + side * 17 + 2.5, L / 2 - 32, 58]));
    }
    for (const y of [front, rearY]) add('T badges', STEEL('#0b0c0d', .7, .1), box([1.2, 34, 44], [t / 2 + .6, y, zr - 110]));
    add('Pad plate', STEEL('#141516', .7, .2), planSlab(kit.rectPts(200, 900), padB - 6, 6, 10));
    add('Pad · HeftyGrip vinyl', VINYL('#131416'), kit.pad(kit.rectPts(pad.w, pad.len), pad.t, 26, 20, padB));
    add(`Frame · ${color.name}`, STEEL(color.hex, .5, .3), ...F);
    add('Rubber feet', RUBBER, ...rub);
    add('Wheels', RUBBER, ...tyres);
    add('Wheel hubs', STEEL('#35373a', .35, .7), ...hubs);
    return kit.collect();
  });
}
/** Titan Seated Stationary Bench: low T base, single post, fixed 18 in seat and slightly reclined back, front handle. */
export function buildTitanSeated(api: ManifoldAPI, _p: NumericParams): SolidPart[] {
  return buildBench(api, kit => {
    const { tube, tubeYZ, box, span, add, wheel, capsules, hinge, pad, rectPts, cyl } = kit, F: Manifold[] = [], rub: Manifold[] = [], tyres: Manifold[] = [], hubs: Manifold[] = [];
    const S = TITAN_SEATED, D = S.D, W = S.W, rearY = D / 2 - 60, post = D / 2 - 330, base = 51;
    F.push(tubeYZ(0, [-D / 2 + 30, 8 + base / 2], [rearY, 8 + base / 2], base, 76));
    rub.push(box([90, 60, 8 + base + 4], [0, -D / 2 + 30, (8 + base + 4) / 2]));
    F.push(tube([-(W / 2 - 40), rearY, 8 + base / 2 + 4], [W / 2 - 40, rearY, 8 + base / 2 + 4], 64, 64));
    for (const x of [-1, 1]) {
      rub.push(cyl([x * (W / 2 - 40), rearY, 8 + base / 2 + 4], [x * W / 2, rearY, 8 + base / 2 + 4], 70, 24), box([40, 60, 8], [x * (W / 2 - 60), rearY, 4]));
      wheel(x * (W / 2 - 110), D / 2 - 26, 28, 52, 22, tyres, hubs);
      for (const side of [-1, 1]) F.push(span([x * (W / 2 - 110) + side * 14 - 2.5, rearY + 30, 10], [x * (W / 2 - 110) + side * 14 + 2.5, D / 2 - 26, 46]));
    }
    const seatB = S.seatTop - S.seat.t;
    F.push(tube([0, post, 8 + base - 4], [0, post, seatB - 30], 64, 64));
    F.push(span([-110, post - 110, seatB - 30], [110, post + 110, seatB - 6]));
    add('Pads · HeftyGrip vinyl', VINYL('#131416'), pad(rectPts(S.seat.w, S.seat.len, 0, post), S.seat.t, 30, 16, seatB));
    // Back upright from the seat frame, reclined, with the back pad.
    const hinge0: [number, number] = [post + S.seat.len / 2 + 10, seatB - 20];
    const back = [tubeYZ(0, [post + 60, seatB - 18], hinge0, 36, 51), tubeYZ(0, hinge0, [hinge0[0], S.H - 90], 51, 51)].map(m => hinge(m, hinge0, -S.recline));
    F.push(...back);
    const bz = S.seatTop;
    add('Pads · HeftyGrip vinyl', VINYL('#131416'), hinge(kit.move(kit.rot(pad(rectPts(S.back.w, S.back.len, 0, 0), S.back.t, 30, 16, 0), [90, 0, 0]), [0, hinge0[0] - 12, bz + S.back.len / 2]), hinge0, -S.recline));
    add('Pad plates', STEEL('#141516', .7, .2), hinge(span([-90, hinge0[0] - 14, bz + 40], [90, hinge0[0] - 8, bz + S.back.len - 40]), hinge0, -S.recline));
    // Knurled front handle angled forward under the seat.
    F.push(capsules([[0, post - 32, 330], [0, post - 150, 250]], 28));
    add('Knurled handle', { color: '#2e3033', role: 'handle', metalness: .75, roughness: .42 }, capsules([[0, post - 110, 277], [0, post - 205, 214]], 34));
    add('Frame · Black', STEEL('#1b1c1e', .5, .3), ...F);
    add('Rubber feet', RUBBER, ...rub);
    add('Wheels', RUBBER, ...tyres);
    add('Wheel hubs', STEEL('#35373a', .35, .7), ...hubs);
    return kit.collect();
  });
}
