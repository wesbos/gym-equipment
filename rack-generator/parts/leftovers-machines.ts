/** Catalog leftovers (#176): the Texas Strength Systems Combo Rack and the Freak Athlete Nordic Mini Pro.
 * Floor axes: Z up, origin on the floor; layouts and bounds come from ../floor-parts/leftovers.ts. */
import type { Mat4 } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { TSS, TSS_COLORS, TSS_ACCENTS, tssLeg, tssUpright, tssPadHead, NORDIC, nordicUpperZ, nordicWorkBounds, inch } from '../floor-parts/leftovers.ts';
import { kit, finish, beam, roundRect, alongZ, transformParts, BADGE, ZINC } from './leftovers-kit.ts';

const Y: Vec3 = [0, 1, 0];
const tssColor = (i: number, what: string) => { const c = TSS_COLORS[i]; if (!c) throw Error(`Unsupported combo rack ${what}.`); return c; };

// ── Texas Strength Systems Combo Rack ──────────────────────────────────────────────────────────────
const STAINLESS = finish('Stainless steel hooks and inner uprights', 'source', '#c9ccce', .85, .32);
const NYLON = finish('Nylon hook rollers', 'liner', '#ebe8de', 0, .45);
const PAD = finish('Textured black competition bench pad', 'source', '#18191b', 0, .78);
const DIAMOND = finish('Diamond-plate lift-off platform', 'source', '#9a9ea2', .8, .45);
const RUBBER = finish('Black rubber feet', 'liner', '#141516', 0, .85);
const ETCH = finish('Etched hole numbers', 'source', '#3b3d40', .4, .6);
export function buildTssComboRack(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (p.bench !== 0 && p.bench !== 1) throw Error('Unsupported combo rack bench.');
  if (!(TSS_ACCENTS as readonly number[]).includes(p.accent)) throw Error('Unsupported combo rack bench frame colour.');
  const c = tssColor(p.color, 'frame colour'), a = tssColor(p.accent, 'bench frame colour'), u = tssUpright(p), leg = tssLeg();
  const frameF = finish(`${c[0]} powder-coated 7 ga frame`, 'source', c[1], c[2], c[3]);
  const benchF = finish(`${a[0]} powder-coated bench frame`, 'source', a[1], a[2], a[3]);
  return kit(api, k => {
    const B = TSS.base, h = B / 2, W = TSS.side, rear = TSS.rear, U = TSS.upright, I = TSS.inner, sl = TSS.sleeve;
    // Base: rear crossmember (cut lettering pocket) and a side rail, sleeve and splayed leg per side.
    const pocket = k.span([-inch(14), rear - 1, h - inch(.7)], [inch(14), rear + 1.2, h + inch(.7)]);
    k.add(frameF, k.cut(k.span([-W - h, rear, 0], [W + h, rear + B, B]), [pocket]));
    k.add(BADGE, k.span([-inch(14) + 1, rear + .6, h - inch(.7) + 1], [inch(14) - 1, rear + 1.2, h + inch(.7) - 1]));
    for (const s of [-1, 1]) {
      const x = s * W;
      k.add(frameF, k.span([x - h, rear, 0], [x + h, h, B]), k.span([x - sl.w / 2, -sl.w / 2, 0], [x + sl.w / 2, sl.w / 2, sl.h]));
      const dir: Vec3 = [s * Math.cos(leg.a), Math.sin(leg.a), 0];
      k.add(frameF, beam(k, [x, 0, h], [x + dir[0] * leg.length, dir[1] * leg.length, h], B, B));
      // Bolt heads where the rails bolt to the rear crossmember.
      for (const zb of [B * .3, B * .7]) k.add(ZINC, k.cyl(6, 9, 'x', [x + s * (h + 3), rear + B * 1.5, zb], 6));
      // Hand-jack upright: black 7 ga tube in its sleeve, stainless inner tube pinned on 1" holes, J-hook on top.
      k.add(frameF, k.span([x - U / 2, -U / 2, sl.h - 120], [x + U / 2, U / 2, u.top]));
      const innerBottom = Math.max(sl.h - 100, u.top - 420);
      const holes = [], ticks = [];
      for (let zz = u.top + inch(1); zz < u.innerTop - inch(1.5); zz += inch(1)) {
        holes.push(k.cyl(I + 2, 9.5, 'x', [x, 0, zz], 16));
        ticks.push(k.span([x - 9, -I / 2 - .5, zz - 1.5], [x + 9, -I / 2 + .1, zz + 1.5]));
      }
      k.add(STAINLESS, k.cut(k.span([x - I / 2, -I / 2, innerBottom], [x + I / 2, I / 2, u.innerTop]), holes));
      if (ticks.length) k.add(ETCH, ...ticks);
      // Knurled stainless pin through the black upright's top hole.
      k.add(STAINLESS, k.cyl(U + 70, 9.5, 'x', [x + s * 35, 0, u.top - 25], 20), k.cyl(22, 13, 'x', [x + s * (U / 2 + 50), 0, u.top - 25], 20));
      // J-hook: tall back plate on the lifter side of the inner tube, cup floor and front lip, nylon roller.
      const hw = inch(3), ht = 6.35, yb = I / 2, cup = 70;
      k.add(STAINLESS, k.span([x - hw / 2, yb, u.hook - 36], [x + hw / 2, yb + ht, u.plateTop]),
        k.span([x - hw / 2, yb, u.hook - 36], [x + hw / 2, yb + cup, u.hook - 30]), k.span([x - hw / 2, yb + cup - ht, u.hook - 36], [x + hw / 2, yb + cup, u.hook + 22]));
      k.add(NYLON, k.cyl(hw - 10, 15, 'x', [x, yb + ht + (cup - 2 * ht) / 2, u.hook - 15], 28));
      // Hand jack: post with a forked top behind the upright, lever arm off the upright's inner face, link and pin.
      const xj = x, jy = TSS.jackY, P = TSS.jackPost, za = u.top - 110;
      k.add(frameF, k.span([xj - P / 2, jy - P / 2, B], [xj + P / 2, jy + P / 2, 760]));
      for (const f of [-1, 1]) k.add(frameF, k.span([xj + f * 13 - 6, jy - P / 2, 760], [xj + f * 13 + 6, jy + P / 2, 840]));
      k.add(frameF, k.span([xj - P / 2, -205, za - 25], [xj + P / 2, -U / 2, za + 25]));
      k.add(frameF, beam(k, [xj, -200, za - 10], [xj, jy + P / 2 + 8, za - 190], 30, 10));
      k.add(ZINC, k.cyl(P + 16, 8, 'x', [xj, -200, za - 10], 6));
      k.add(STAINLESS, k.cyl(90, 9.5, 'z', [xj, -60, za + 25 + 45], 20));
    }
    if (!p.bench) return;
    // Drop-in bench: 48" × 12" pad at 17", accent frame on a floor crossmember, two foot-end legs, lift-off steps.
    const pd = TSS.pad, head = tssPadHead(), foot = head + pd.length, pz = pd.top - pd.thick, rw = 50.8;
    k.add(PAD, alongZ(k, roundRect(k, [0, (head + foot) / 2], pd.width, pd.length, 18), pd.thick, pz));
    for (const s of [-1, 1]) k.add(benchF, k.span([s * 100 - rw / 2, head + 60, pz - rw], [s * 100 + rw / 2, foot - 60, pz]));
    k.add(benchF, k.span([-130, foot - 150, pz - rw], [130, foot - 100, pz]), k.span([-130, head + 100, pz - rw], [130, head + 150, pz]));
    for (const s of [-1, 1]) {
      k.add(benchF, k.span([s * 115 - rw / 2, foot - 150, 10], [s * 115 + rw / 2, foot - 100, pz - rw]));
      k.add(RUBBER, k.span([s * 115 - 32, foot - 157, 0], [s * 115 + 32, foot - 93, 10]));
      k.add(benchF, k.span([s * 115 - rw / 2, head + 100, B], [s * 115 + rw / 2, head + 150, pz - rw]));
    }
    const cx = W - h;
    k.add(benchF, k.span([-cx, -200, 0], [cx, -123.8, B]), k.span([-150, head + 90, 0], [150, head + 160, B]), k.span([-rw / 2, -200, 0], [rw / 2, head + 160, B]));
    for (const s of [-1, 1]) {
      const x0 = s * 190, x1 = s * 470, [lo, hi] = [Math.min(x0, x1), Math.max(x0, x1)];
      k.add(DIAMOND, k.span([lo, -440, 174], [hi, -210, 180]));
      for (const xx of [lo + 19, hi - 19]) for (const yy of [-421, -229]) k.add(benchF, k.span([xx - 19, yy - 19, 0], [xx + 19, yy + 19, 174]));
    }
    k.add(benchF, k.span([-cx, -440, 0], [cx, -363.8, B]));
  });
}

// ── Freak Athlete Nordic Mini Pro ───────────────────────────────────────────────────────────────────
const FA_BLACK = finish('Black powder-coated steel frame', 'source', '#1c1d1f', .3, .62);
const FA_PAD = finish('Black textured knee pad', 'source', '#1f2022', 0, .82);
const FA_ORANGE = finish('Orange FREAK ATHLETE print', 'source', '#e0661d', 0, .5);
const FOAM = finish('Black foam ankle rollers', 'handle', '#18191b', 0, .9);
const ROLLER_CAP = finish('Knurled roller end caps', 'source', '#2b2c2e', .2, .6);
const CHROME = finish('Chrome counterweight horn', 'source', '#c7cacd', .95, .2);
const WHEEL = finish('Grey rubber transport wheels', 'liner', '#2e2f31', 0, .7);
export function buildNordicMiniPro(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (p.pose !== 0 && p.pose !== 1) throw Error('Unsupported Nordic pose.');
  const N = NORDIC, upperZ = nordicUpperZ(p), wb = nordicWorkBounds(p);
  const parts = kit(api, k => {
    const pd = N.pad, [y0, y1] = [N.padY[1] - pd.length, N.padY[1]], pz = pd.top - pd.thick;
    k.add(FA_PAD, alongZ(k, roundRect(k, [0, (y0 + y1) / 2], pd.width, pd.length, 16), pd.thick, pz));
    k.add(FA_ORANGE, k.span([pd.width / 2 - .1, y0 + 150, pz + 21], [pd.width / 2 + .4, y1 - 25, pz + 43]));
    // Steel pan under the pad, centre spine to the end plate, leg brackets and splayed flat-bar legs on rubber feet.
    const [s0, s1] = N.spine.z;
    k.add(FA_BLACK, k.span([-200, y0 + 20, s1], [200, y1 - 10, pz]), k.span([-N.spine.w / 2, y0 + 40, s0], [N.spine.w / 2, N.plate.y, s1]));
    for (const s of [-1, 1]) {
      const top: Vec3 = [s * 170, y0 + 60, s1 + 2], bottom: Vec3 = [s * N.foot.x, N.foot.y, N.foot.t];
      k.add(FA_BLACK, k.span([s * 170 - 30, y0 + 30, s0], [s * 170 + 30, y0 + 90, s1]), beam(k, top, bottom, 50, 10));
      k.add(FA_BLACK, k.span([s * N.foot.x - 30, N.foot.y - 45, N.foot.t - 2], [s * N.foot.x + 30, N.foot.y + 45, N.foot.t + 4]));
      k.add(RUBBER, k.span([s * N.foot.x - N.foot.w / 2, N.foot.y - N.foot.l / 2, 0], [s * N.foot.x + N.foot.w / 2, N.foot.y + N.foot.l / 2, N.foot.t]));
    }
    // Roller post with pop-pin collar; fixed lower pair and adjustable upper pair of 5" foam rollers.
    const R = N.roller, ry = N.rollerY;
    k.add(FA_BLACK, k.span([-25, ry - 25, s0], [25, ry + 25, upperZ + 30]), k.span([-29, ry - 31, upperZ - 45], [29, ry + 31, upperZ + 25]));
    k.add(FA_BLACK, k.cyl(26, 7, 'y', [0, ry - 31 - 13, upperZ - 80], 16));
    k.add(ROLLER_CAP, k.cyl(16, 15, 'y', [0, ry - 31 - 26 - 8, upperZ - 80], 24));
    for (const zc of [N.lowerZ, upperZ]) {
      k.add(ZINC, k.cyl(2 * (R.hub / 2 + R.length) - 4, 12.7, 'x', [0, ry, zc], 24));
      for (const s of [-1, 1]) {
        const xa = s * R.hub / 2, xb = s * (R.hub / 2 + R.length);
        k.add(FOAM, k.cyl(R.length - 8, R.d / 2, 'x', [(xa + xb) / 2 - s * 2, ry, zc], 48));
        k.add(ROLLER_CAP, k.cyl(6, R.d / 2 - 12, 'x', [xb - s * 3, ry, zc], 40), k.cyl(3, R.d / 2 - 4, 'x', [xa + s * 1.5, ry, zc], 40));
        k.add(ZINC, k.cyl(4, 9, 'x', [xb - s * 2, ry, zc], 16));
      }
    }
    // End plate with laser-cut lettering, transport wheels on forks, chrome counterweight horn.
    const P = N.plate, [pz0, pz1] = P.z;
    k.add(FA_BLACK, k.span([-P.w / 2, P.y, pz0], [P.w / 2, P.y + P.t, pz1]));
    k.add(BADGE, k.span([-120, P.y + P.t, pz1 - 70], [0, P.y + P.t + .4, pz1 - 45]), k.span([-40, P.y + P.t, pz1 - 125], [120, P.y + P.t + .4, pz1 - 100]));
    const Wh = N.wheel;
    for (const s of [-1, 1]) {
      const x = s * Wh.x;
      for (const f of [-1, 1]) k.add(FA_BLACK, k.span([x + f * (Wh.w / 2 + 1) - 1.5, P.y + P.t, Wh.r - 10], [x + f * (Wh.w / 2 + 1) + 1.5, Wh.y + 6, Wh.r + 12]));
      k.add(WHEEL, k.cyl(Wh.w, Wh.r, 'x', [x, Wh.y, Wh.r], 32));
      k.add(ZINC, k.cyl(Wh.w + 8, 4, 'x', [x, Wh.y, Wh.r], 12));
    }
    const H = N.horn;
    k.add(CHROME, k.rod([0, P.y + P.t, H.z], Y, H.length, H.d / 2, 40));
    k.add(FA_BLACK, k.rod([0, P.y + P.t, H.z], Y, 8, H.d / 2 + 10, 40));
  });
  if (!p.pose) return parts;
  // Stored on its end plate: (x, y, z) → (x, z, yMax − y).
  const m: Mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, wb.max[1], 1];
  return transformParts(parts, m);
}
