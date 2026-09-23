/** Monolift builders (#133): Rogue AM-2 / AML-2 Adjustable Monolift 2.0 and Mutant Metals Snap-Back Rollers. Source frame
 * (rack-part.ts): origin on the upright centreline at the pin, +Y out of the mounting face, X across it, Z up. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2 } from '../types.ts';
import { buildWith, FINISH, faceOf, widthOf, type Finish } from './rack-jcups-safeties-kit.ts';
import { AM2, amJaw, SNAP_BACK, SNAP_COLORS, ROGUE_AM_2_MONOLIFT, MUTANT_METALS_SNAP_BACK_MONOLIFT } from '../rack-parts/rack-jcups-safeties-monolifts.ts';

const TEX_RED: Finish = { color: '#b3191f', metalness: .15, roughness: .78 };
const shiftY = (pts: readonly (readonly [number, number])[], dy: number): Vec2[] => pts.map(([y, z]) => [y + dy, z]);

export function buildAm2(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_AM_2_MONOLIFT.defaults, ...params }; if (![0, 1].includes(p.line)) throw Error('Unsupported AM-2 monolift version.');
  const f = faceOf(p), wu = widthOf(p) / 2, a = AM2, t = a.plate, bt = a.bracketT, W = a.width / 2, J = a.jaw / 2, pinR = p.line ? 7.9 : 12.4;
  return buildWith(api, k => {
    const cx = wu + .6, b = a.bracket;
    // Bracket: front plate with the hook and backstop bolts, side cheeks around the upright.
    const bracket: Manifold[] = [k.rbox([-cx - bt, f, b.z0], [cx + bt, f + bt, b.z1], 8, 'y')];
    for (const s of [1, -1]) bracket.push(k.rbox([s > 0 ? cx : -cx - bt, f - b.back, b.z0], [s > 0 ? cx + bt : -cx, f + bt, b.z1], 8, 'x'));
    k.put('MG black 1/4 in bracket', k.union(bracket), FINISH.black);
    // Swinging frame: two 1/4 in plates 4 in apart with a triangular window, hung on the bracket bolts.
    const frameSec = k.k(k.k(new k.C([shiftY(a.frame, f)], 'EvenOdd')).subtract(k.k(new k.C([shiftY(a.window, f)], 'EvenOdd'))));
    const plate = (x0: number) => k.k(k.k(k.k(frameSec.extrude(t)).translate([0, 0, x0])).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]));
    const spacer = k.box([-W + t, f + a.frame[0][0], 20], [W - t, f + a.frame[0][0] + 20, 48]);
    k.put('Frame plates', k.union([plate(W - t), plate(-W), spacer]), FINISH.black);
    k.put('Frame logo cut-out', k.union([1, -1].map(s => k.box([s > 0 ? W : -W - .3, f + 70, -60], [s > 0 ? W + .3 : -W, f + 150, -40]))), TEX_RED);
    k.put('Red counterweight handle', k.prism(shiftY(a.handle, f), -J, J, 'x', 3), TEX_RED, 'handle');
    k.put('Handle UHMW end caps', k.box([-J - 1, f + a.reach - 14, 60], [J + 1, f + a.reach, 72]), FINISH.uhmw, 'liner');
    const jaw = shiftY(amJaw(p), f);
    k.put('Red 1.25 in jaw', k.prism(jaw, -J, J, 'x', 2), TEX_RED, 'handle');
    // Recessed hook UHMW on both jaw faces and the black counterweight plates.
    const hook = jaw.slice(2, 9);
    const liner = (x0: number, x1: number) => k.k(k.k(k.k(k.k(k.k(new k.C([hook], 'EvenOdd')).offset(-3, 'Round', 12)).extrude(x1 - x0)).translate([0, 0, x0])).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]));
    k.put('Recessed hook UHMW', k.union([liner(J, J + 3), liner(-J - 3, -J)]), FINISH.uhmw, 'liner');
    k.put('Hook and backstop bolts', k.union([k.rod([-W - 6, f + 30, 32], [W + 6, f + 30, 32], 8, 20), k.rod([-W - 6, f + 30, 78], [W + 6, f + 30, 78], 8, 20), k.rod([-W - 6, f + 150, -20], [W + 6, f + 150, -20], 8, 20)]), FINISH.zinc, 'fastener');
    k.put(p.line ? '5/8 in detent pin' : '1 in detent pin', k.revolve([[0, 0], [pinR - 1.2, 0], [pinR, 1.2], [pinR, 70 + bt + 18], [0, 70 + bt + 18]], [0, f - 70, 0], 'y', 28), FINISH.blackZinc, 'rod');
    const ring = k.k(k.k(k.k(k.C.circle(26, 36)).subtract(k.k(k.C.circle(18, 36)))).extrude(6));
    k.put('Detent pin D-ring', k.k(k.k(ring.rotate([0, 90, 0])).translate([-3, f + bt + 18 + 22, 0])), FINISH.blackZinc, 'handle');
  });
}

export function buildSnapBack(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...MUTANT_METALS_SNAP_BACK_MONOLIFT.defaults, ...params }, body = SNAP_COLORS[p.color], arm = SNAP_COLORS[p.arm];
  if (!body || !arm || ![0, 1].includes(p.pin)) throw Error('Unsupported Snap-Back Roller option.');
  const f = faceOf(p), wu = widthOf(p) / 2, s = SNAP_BACK, t = s.plate, g = s.gap / 2, pinR = p.pin ? 12.4 : 7.9;
  const tone = (c: readonly [string, string]): Finish => c[0] === 'Clear Grind' ? { color: c[1], metalness: .85, roughness: .35 } : c[0].startsWith('Flat') ? { color: c[1], metalness: .1, roughness: .8 } : { color: c[1], metalness: .35, roughness: .32 };
  return buildWith(api, k => {
    const [py, pz] = s.pivot, e = .3;
    // These are windows through both plates, not a dark badge applied to the forward beam.
    const windows = s.logo.map(points => k.prism(shiftY(points, f), -g - t - 1, g + t + 1, 'x'));
    const pivotBore = k.rod([-g - t - 1, f + py, pz], [g + t + 1, f + py, pz], 10, 48);
    const steel: Manifold[] = [1, -1].map(side => k.minus(k.prism(shiftY(s.body, f), side > 0 ? g : -g - t, side > 0 ? g + t : -g, 'x', 1.5), ...windows, pivotBore));
    // Narrow welded top/rear bridges, leaving the curved opening clear.
    steel.push(k.box([-g - e, f + e, s.top - t], [g + e, f + s.reach - e, s.top - e]), k.box([-g - e, f + e, s.bottom + e], [g + e, f + t, s.top - e]));
    k.put('3/8 in steel side plates with MM windows', k.union(steel), tone(body));

    // Low U-wrap: straight side straps, a rear return, and thin upright protection pads.
    const cx = Math.max(wu + 2.5, g + t), back = f - 2 * faceOf(p) - 4;
    const clasp = [k.box([-cx - t, back - t, -190], [cx + t, back + e, -136])];
    for (const side of [1, -1]) {
      const x0 = side > 0 ? cx : -cx - t, x1 = side > 0 ? cx + t : -cx;
      const strap = k.rbox([x0, back, -190], [x1, f + 25, -136], 3, 'x');
      const screws = [-16, 24].map(y => k.rod([x0 - 1, f - y, -163], [x1 + 1, f - y, -163], 2.2, 16));
      clasp.push(k.minus(strap, ...screws));
      clasp.push(k.box([side > 0 ? g - e : -cx - e, f + e, -189], [side > 0 ? cx + e : -g + e, f + t - e, -137]));
    }
    k.put('Lower wraparound rack clasp', k.union(clasp), tone(body));
    k.put('Upright protection pads', k.union([k.box([-wu, f - 2, -228], [wu, f - .3, -80]), k.box([-wu, back + .4, -187], [wu, back + 2.2, -139])]), FINISH.uhmw, 'liner');

    // Formed arm: two curved cheeks and the thin curved front web. The rear is open;
    // extruding the whole profile would turn the channel into a heavy solid block.
    const outer = shiftY(s.armOuter, f), inner = shiftY(s.armInner, f);
    const band = [...outer, ...[...inner].reverse()];
    const armW = g - 2, wall = 6.35;
    const frontWeb = [...inner, ...inner.map(([y, z]) => [y - wall, z] as Vec2).reverse()];
    k.put('Curved swing arm channel', k.union([
      k.prism(band, -armW, -armW + wall, 'x'), k.prism(band, armW - wall, armW, 'x'),
      k.prism(frontWeb, -armW + e, armW - e, 'x'),
      k.rod([-armW, f + py, pz], [armW, f + py, pz], 17, 48),
    ]), tone(arm), 'handle');

    // Inclined tray and roller share one transform, so the lip, axle and bar rest stay aligned.
    const catchTransform = (solid: Manifold) => k.k(k.k(solid.rotate([s.catchTilt, 0, 0])).translate([0, f + s.catchY, s.catchZ]));
    const L = s.rollerL, y0 = -L / 2 - 7, y1 = L / 2 + 7, zf = -s.rollerR - 3;
    const tray = k.union([
      k.box([-armW, y0, zf - wall], [armW, y1, zf]),
      k.box([-armW, y0, zf - wall], [armW, y0 + wall, 26]),
      k.box([-armW, y1 - wall, zf - wall], [armW, y1, 22]),
    ]);
    k.put('Inclined roller catch cradle', catchTransform(tray), tone(arm));
    k.put('Nylon roller', catchTransform(k.revolve([[0, 0], [s.rollerR - 2, 0], [s.rollerR, 2], [s.rollerR, L - 2], [s.rollerR - 2, L], [0, L]], [0, -L / 2, 0], 'y', 64)), { color: '#161719', metalness: 0, roughness: .42 }, 'handle');
    k.put('Roller axle', catchTransform(k.rod([0, y0 - 1, 0], [0, y1 + 1, 0], 5, 28)), FINISH.stainless, 'fastener');
    const cover = k.rbox([-armW - 1.5, y1, zf - wall - 1], [armW + 1.5, y1 + 5, 25], 2, 'y');
    k.put('3D printed front lip cover', catchTransform(cover), { color: '#202123', metalness: 0, roughness: .75 }, 'liner');
    // Narrow black edge strips leave the coloured curved web and its weld seams exposed.
    const strip = [...inner.slice(0, -4).map(([y, z]) => [y + 2.5, z] as Vec2), ...inner.slice(0, -4).reverse()];
    k.put('Curved arm edge protection', k.union([k.prism(strip, -armW - .8, -armW + 6, 'x'), k.prism(strip, armW - 6, armW + .8, 'x')]), FINISH.uhmw, 'liner');
    k.put('Curved web weld seams', k.union([13, 26].map(i => {
      const [y, z] = inner[i];
      return k.rod([-armW + 6, y, z], [armW - 6, y, z], 1.3, 12);
    })), tone(arm));

    const hardware: Manifold[] = [k.rod([-g - t, f + py, pz], [g + t, f + py, pz], 9.8, 48)];
    for (const side of [1, -1]) {
      // Round, low-profile machined bearing caps, with two smaller stop/retaining screws.
      const cap = k.revolve([[0, 0], [12.5, 0], [13.5, 1], [13.5, 3.8], [12, 5], [0, 5]], [0, 0, 0], 'x', 64);
      hardware.push(k.k(k.k(cap.rotate([0, side > 0 ? 0 : 180, 0])).translate([side * (g + t), f + py, pz])));
      for (const [y, z, r] of [[py + 7, pz - 23, 3.2], [py - 42, s.top - 10, 5.2]]) {
        hardware.push(k.rod([side * (g + t), f + y, z], [side * (g + t + 2.2), f + y, z], r, 24));
      }
    }
    k.put('Round pivot bearing caps and retaining screws', k.union(hardware), FINISH.stainless, 'fastener');
    k.put(p.pin ? '1 in stainless mounting pin' : '5/8 in stainless mounting pin', k.revolve([[0, 0], [pinR - 1.5, 0], [pinR, 1.5], [pinR, 2 * faceOf(p) + 30], [0, 2 * faceOf(p) + 30]], [0, -faceOf(p) - 30, 0], 'y', 48), FINISH.stainless, 'rod');
  });
}
