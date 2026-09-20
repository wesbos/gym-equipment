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
  const tone = (c: readonly [string, string]): Finish => c[0] === 'Clear Grind' ? { color: c[1], metalness: .85, roughness: .35 } : c[0].startsWith('Flat') ? { color: c[1], metalness: .1, roughness: .8 } : { color: c[1], metalness: .45, roughness: .3 };
  return buildWith(api, k => {
    const prof = shiftY(s.body, f), steel: Manifold[] = [k.prism(prof, g, g + t, 'x'), k.prism(prof, -g - t, -g, 'x')];
    // Members sit 0.3 mm off each other's faces (coplanar seams leave zero-area triangles in the print export).
    const e = .3;
    steel.push(k.box([-g - t + e, f + e, s.top - t], [g + t - e, f + s.reach - e, s.top - e]), k.box([-g - t + e, f + e, s.bottom + e], [g + t - e, f + t, s.top - e]));
    // J-cup style clasp box around the upright under the top pin.
    const cx = wu + .6;
    for (const side of [1, -1]) steel.push(k.rbox([side > 0 ? cx : -cx - t, f - 60, -120], [side > 0 ? cx + t : -cx, f + t - e, -40], 6, 'x'), k.box([side > 0 ? g + e : -cx - t + e, f + e, -120 + e], [side > 0 ? cx + t - e : -g - e, f + t - 2 * e, -40 - e]));
    k.put('3/8 in steel side plates and clasp', k.union(steel), tone(body));
    k.put('MM logo cut-out', k.union([1, -1].map(side => k.box([side > 0 ? g + t : -g - t - .3, f + 170, -30], [side > 0 ? g + t + .3 : -g - t, f + 250, 20]))), { color: '#0c0c0d', metalness: 0, roughness: .9 });
    // Swing arm: a curved band from the ball-bearing pivot down along the arc to the roller catch.
    const [py, pz] = s.pivot, cy = s.catchY, cz = s.catchZ, pts: Vec2[] = [], inner: Vec2[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, y = py + (cy - py) * u - 40 * Math.sin(Math.PI * u), z = pz + (cz + 10 - pz) * u;
      pts.push([f + y + 16, z]); inner.push([f + y - 16, z]);
    }
    k.put('Swing arm', k.prism([...pts, ...inner.reverse()], -g + 1, g - 1, 'x', 2), tone(arm), 'handle');
    // Roller catch: floor, back and front lips; nylon roller along +Y with 2-1/4 in usable length; printed lip covers.
    const L = s.rollerL, y0 = f + cy - L / 2 - 8, y1 = f + cy + L / 2 + 8, zf = cz - s.rollerR - 6;
    k.put('Roller catch cradle', k.union([k.box([-g + 1, y0, zf - 6], [g - 1, y1, zf]), k.box([-g + 1, y0, zf - 6], [g - 1, y0 + 8, cz + 22]), k.box([-g + 1, y1 - 8, zf - 6], [g - 1, y1, cz + 30])]), tone(arm));
    k.put('Nylon roller', k.revolve([[0, 0], [s.rollerR - 2, 0], [s.rollerR, 2], [s.rollerR, L - 2], [s.rollerR - 2, L], [0, L]], [0, f + cy - L / 2, cz], 'y', 36), { color: '#121213', metalness: 0, roughness: .45 }, 'handle');
    k.put('3D printed front lip cover', k.box([-g + 1, y1, zf - 6], [g - 1, y1 + 5, cz + 30]), { color: '#1a1a1c', metalness: 0, roughness: .7 }, 'liner');
    k.put('Ball-bearing pivot bolt', k.union([k.rod([-g - t - 4, f + py, pz], [g + t + 4, f + py, pz], 8, 24), k.hexHead([g + t, f + py, pz], 'x', 22, 8), k.hexHead([-g - t, f + py, pz], '-x', 22, 8)]), FINISH.stainless, 'fastener');
    k.put('Printed rear pin with magnets', k.revolve([[0, 0], [pinR - 1.5, 0], [pinR, 1.5], [pinR, 70], [0, 70]], [0, f - 70, 0], 'y', 28), { color: '#202123', metalness: 0, roughness: .6 }, 'rod');
  });
}
