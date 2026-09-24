/** Monolift builders (#133): Rogue AM-2 / AML-2 Adjustable Monolift 2.0 and Mutant Metals Snap-Back Rollers. Source frame
 * (rack-part.ts): origin on the upright centreline at the pin, +Y out of the mounting face, X across it, Z up. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2 } from '../types.ts';
import { buildWith, FINISH, faceOf, widthOf, type Finish } from './rack-jcups-safeties-kit.ts';
import { AM2, amJaw, SNAP_BACK, SNAP_COLORS, ROGUE_AM_2_MONOLIFT, MUTANT_METALS_SNAP_BACK_MONOLIFT } from '../rack-parts/rack-jcups-safeties-monolifts.ts';

const TEX_RED: Finish = { color: '#b3191f', metalness: .15, roughness: .78 };
const shiftY = (pts: readonly (readonly [number, number])[], dy: number): Vec2[] => pts.map(([y, z]) => [y + dy, z]);

/** Parallel straight edges meeting on the bisector at a tube's mitered weld. */
const miterEdge = (path: Vec2[], offset: number): Vec2[] => {
  const normals = path.slice(1).map(([y, z], i) => {
    const dy = y - path[i][0], dz = z - path[i][1], length = Math.hypot(dy, dz);
    return [-dz / length, dy / length] as Vec2;
  });
  return path.map(([y, z], i) => {
    const a = normals[Math.max(0, i - 1)], b = normals[Math.min(i, normals.length - 1)];
    const scale = offset / (1 + a[0] * b[0] + a[1] * b[1]);
    return [y + (a[0] + b[0]) * scale, z + (a[1] + b[1]) * scale];
  });
};
const tubeProfile = (path: Vec2[], halfWidth: number): Vec2[] => [...miterEdge(path, halfWidth), ...miterEdge(path, -halfWidth).reverse()];

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
    // Each plate gets its own through-cuts, oriented to read correctly from that plate's outside face.
    const logoY = s.logo.flatMap(points => points.map(([y]) => y));
    const logoMirrorY = Math.min(...logoY) + Math.max(...logoY);
    const pivotBore = k.rod([-g - t - 1, f + py, pz], [g + t + 1, f + py, pz], 10, 48);
    const steel: Manifold[] = [1, -1].map(side => {
      const x0 = side > 0 ? g : -g - t, x1 = side > 0 ? g + t : -g;
      const windows = s.logo.map(points => k.prism(
        points.map(([y, z]) => [f + (side > 0 ? y : logoMirrorY - y), z]), x0 - 1, x1 + 1, 'x',
      ));
      return k.minus(k.prism(shiftY(s.body, f), x0, x1, 'x', 1.5), ...windows, pivotBore);
    });
    // Welded bridges and a full steel nose plate close the front of the housing.
    steel.push(
      k.box([-g - e, f + e, s.top - t], [g + e, f + s.reach - e, s.top - e]),
      k.box([-g - e, f + e, s.bottom + e], [g + e, f + t, s.top - e]),
      k.box([-g - e, f + s.reach - t, -25], [g + e, f + s.reach, s.top]),
    );
    k.put('3/8 in steel side plates with MM windows', k.union(steel), tone(body));

    // One side strap and a rear return form an L; the opposite side stays open for mounting.
    // The clasp sits just below the logo, well above the foot of the rear leg.
    const cx = Math.max(wu + 2.5, g + t), back = f - 2 * faceOf(p) - 4;
    const { bottom: z0, top: z1 } = s.clasp, zm = (z0 + z1) / 2;
    const strap = k.rbox([cx, back, z0], [cx + t, f + 25, z1], 3, 'x');
    const screws = [-16, 24].map(y => k.rod([cx - 1, f - y, zm], [cx + t + 1, f - y, zm], 2.2, 16));
    const clasp = k.union([
      k.box([-cx, back - t, z0], [cx + t, back + e, z1]),
      k.minus(strap, ...screws),
      k.box([g - e, f + e, z0 + 1], [cx + e, f + t - e, z1 - 1]),
    ]);
    // Hand only the clasp: reflecting the logo-bearing body would reverse its MM cut-outs.
    k.put('L-shaped rack clasp', p.mirror === 1 ? k.k(clasp.mirror([1, 0, 0])) : clasp, tone(body));
    k.put('Upright protection pads', k.union([k.box([-wu, f - 2, -228], [wu, f - .3, -80]), k.box([-wu, back + .4, z0 + 3], [wu, back + 2.2, z1 - 3])]), FINISH.uhmw, 'liner');

    // Four walls around a hollow square bore, with two planar sections and a single miter.
    const path = shiftY(s.armPath, f), tubeHalf = s.armTube / 2, armW = g - 2, wall = s.catchPlate;
    const tube = k.minus(k.prism(tubeProfile(path, tubeHalf), -tubeHalf, tubeHalf, 'x'),
      k.prism(tubeProfile(path, tubeHalf - s.armWall), -tubeHalf + s.armWall, tubeHalf - s.armWall, 'x'));
    k.put('Welded square-tube swing arm', k.minus(k.union([
      tube, k.rod([-armW, f + py, pz], [armW, f + py, pz], 17, 48),
    ]), pivotBore), tone(arm), 'handle');

    // Inclined tray and roller share one transform, so the lip, axle and bar rest stay aligned.
    const catchTransform = (solid: Manifold) => k.k(k.k(solid.rotate([s.catchTilt, 0, 0])).translate([0, f + s.catchY, s.catchZ]));
    const L = s.rollerL, tubeY = -tubeHalf - L / 2 - s.rollerGap;
    const y0 = tubeY - tubeHalf, lipInner = L / 2 + s.rollerGap, y1 = lipInner + wall, zf = -s.rollerR - s.rollerFloorGap;
    // A solid flat foot beneath the roller, welded to the tube end with a rounded upturned lip.
    // There is no rear wall or raised flange alongside the arm.
    const bendR = 5, bendY = lipInner - bendR, bendZ = zf + bendR;
    const bend = (r: number, reverse = false): Vec2[] => Array.from({ length: 13 }, (_, i) => {
      const a = (-90 + (reverse ? 12 - i : i) * 7.5) * Math.PI / 180;
      return [bendY + Math.cos(a) * r, bendZ + Math.sin(a) * r];
    });
    const foot: Vec2[] = [[y0, zf - wall], ...bend(bendR + wall), [y1, 22], [lipInner, 22], ...bend(bendR, true), [y0, zf]];
    const lipBore = k.rod([0, lipInner - 4, 0], [0, y1 + 5, 0], 6, 32);
    const footWeld = [
      ...[-tubeHalf, tubeHalf].map(x => k.rod([x, y0, zf], [x, tubeY + tubeHalf, zf], .8, 12)),
      ...[y0, tubeY + tubeHalf].map(y => k.rod([-tubeHalf, y, zf], [tubeHalf, y, zf], .8, 12)),
    ];
    // A small weld overlap at the tube footprint avoids coplanar slivers when print export partitions the solids.
    const weldLand = k.box([-tubeHalf, y0, zf - wall], [tubeHalf, tubeY + tubeHalf, zf + .05]);
    const tray = k.union([k.minus(k.prism(foot, -tubeHalf, tubeHalf, 'x'), lipBore), weldLand, ...footWeld]);
    k.put('Inclined roller catch cradle', catchTransform(tray), tone(arm));
    k.put('Nylon roller', catchTransform(k.revolve([[0, 0], [s.rollerR - 2, 0], [s.rollerR, 2], [s.rollerR, L - 2], [s.rollerR - 2, L], [0, L]], [0, -L / 2, 0], 'y', 64)), { color: '#161719', metalness: 0, roughness: .42 }, 'handle');
    k.put('Roller axle', catchTransform(k.rod([0, -L / 2 - 8, 0], [0, y1 + 3.5, 0], 5, 28)), FINISH.stainless, 'fastener');
    // A cap over the lip: inner and outer pads, top bridge and returns around both side edges.
    const cover = k.minus(
      k.rbox([-tubeHalf - 3, lipInner - 3, -12], [tubeHalf + 3, y1 + 4, 25], 1.5, 'z'),
      k.box([-tubeHalf, lipInner - .2, -13], [tubeHalf, y1 + .2, 22]), lipBore,
    );
    k.put('Wraparound front lip cover', catchTransform(cover), FINISH.uhmw, 'liner');
    // UHMW covers the front faces of the two tube sections; both sides stay painted steel.
    const along = (segment: number, fraction: number): Vec2 => path[segment].map((v, i) => v + (path[segment + 1][i] - v) * fraction) as Vec2;
    const padPath = [along(0, .35), path[1], along(1, .82)];
    const pad = [...miterEdge(padPath, tubeHalf), ...miterEdge(padPath, tubeHalf + 3).reverse()];
    const padScrews: Manifold[] = [], holes: Manifold[] = [];
    for (const [segment, fraction] of [[0, .5], [0, .85], [1, .3], [1, .65]]) {
      const [y, z] = along(segment, fraction);
      const dy = path[segment + 1][0] - path[segment][0], dz = path[segment + 1][1] - path[segment][1], length = Math.hypot(dy, dz);
      const ny = -dz / length, nz = dy / length;
      const at = (offset: number): [number, number, number] => [0, y + ny * (tubeHalf + offset), z + nz * (tubeHalf + offset)];
      holes.push(k.rod(at(-1), at(4), 4, 24));
      padScrews.push(k.rod(at(-.3), at(2.6), 3.8, 24));
    }
    k.put('Swing arm front protection', k.minus(k.prism(pad, -tubeHalf + 1, tubeHalf - 1, 'x'), ...holes), FINISH.uhmw, 'liner');
    k.put('Recessed arm protection screws', k.union(padScrews), FINISH.blackZinc, 'fastener');
    const [fy, fz] = miterEdge(path, tubeHalf)[1], [by, bz] = miterEdge(path, -tubeHalf)[1];
    k.put('Square-tube miter weld', k.union([
      k.rod([-tubeHalf, fy, fz], [tubeHalf, fy, fz], 1.1, 12),
      k.rod([-tubeHalf, by, bz], [tubeHalf, by, bz], 1.1, 12),
      ...[-tubeHalf, tubeHalf].map(x => k.rod([x, by, bz], [x, fy, fz], 1.1, 12)),
    ]), tone(arm));

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
