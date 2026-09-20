/** REP Fitness Lat Pulldown & Low Row towers (#178, #136): selectorized and plate-loaded. Built in the machine frame of
 * rack-parts/rack-digital-cable-trainers.ts (u out of the rack from the rear post's outer face, v across from the rack
 * centreline, z up from the floor) with the cable-tower kit, then mapped into the rack-part frame. Sizes and estimates:
 * REP_LAT and research/rack-digital-cable-trainers.md. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { MAT, mat, towerKit, type TowerKit } from './cable-towers-kit.ts';
import { weightStack, cableEnd, latBar } from './cable-towers-components.ts';
import { REP_LAT, REP_PLATE_LAT, REP_SELECTORIZED_LAT, inch, repLatLayout, type MachineFrame } from '../rack-parts/rack-digital-cable-trainers.ts';

const REP_BLACK = mat('REP metallic black steel', '#27292c', .55, .42);
const GRAPHITE = mat('Graphite head plate', '#46494d', .5, .45);
const BRUSHED = mat('Brushed REP logo inserts', '#b7bbbe', .9, .3);
const TREAD = mat('Diamond-tread footplate', '#232427', .55, .5);
const BAR = mat('Black lat and row bars', '#1d1e20', .5, .45);
const GRIP = mat('Black rubber grips', '#141415', 0, .85, 'handle');
const BOLT = MAT.zinc;

/** Run `build` in the machine frame and map every solid into the rack-part frame (mirrored when +u is local -X). */
export function inMachine(t: TowerKit, f: MachineFrame, build: () => void) {
  t.within(s => t.move(f.o < 0 ? t.mirrorX(s) : s, [f.o * f.W / 2, f.S / 2, -f.hh]), build);
}
/** Grooved aluminium pulley with two black side plates hanging from a strap (axis across u, along v). */
function pulley(t: TowerKit, c: Vec3, dia = REP_LAT.pulley) {
  t.add(MAT.alu, t.sheave(c, 'y', dia, 25, 32));
  for (const e of [-1, 1]) t.add(REP_BLACK, t.hull([t.cyl('y', c[1] + e * 16 - 2, c[1] + e * 16 + 2, dia * .72, c, 24), t.cbox([c[0], c[1] + e * 16, c[2] + dia * .55], [30, 4, 6])]));
  t.add(BOLT, t.cyl('y', c[1] - 22, c[1] + 22, 12, c, 12));
}
function build(api: ManifoldAPI, params: NumericParams, selectorized: boolean): SolidPart[] {
  const part = selectorized ? REP_SELECTORIZED_LAT : REP_PLATE_LAT, p = { ...part.defaults, ...params };
  if (![0, 1].includes(p.series) || (selectorized && (![0, 1].includes(p.stack) || !(p.pin >= 0 && p.pin <= (p.stack ? 28 : 18)))))
    throw Error('Unsupported REP lat pulldown option.');
  const l = repLatLayout(p), f = l.f, L = REP_LAT, t = towerKit(api), R = L.pulley / 2;
  const bolt = p.series ? 24 : 16, hw = inch(1.5);
  return t.finish('REP lat pulldown', () => inMachine(t, f, () => {
    // ── Rear Base Stabilizer: bolt tabs on both rear posts' inner faces, 45° legs, straight centre 9.5 in behind them.
    const inner = f.S / 2 - f.T / 2, tabV = inner - 6.35, legV = tabV - hw, back = L.rbs.back - hw, run = back + f.W / 2;
    for (const s of [-1, 1]) {
      t.add(REP_BLACK, t.box([-f.W / 2 - L.rbs.tab[0] / 2, Math.min(s * tabV, s * inner), f.hh - L.rbs.tabBelow], [-f.W / 2 + L.rbs.tab[0] / 2, Math.max(s * tabV, s * inner), f.hh - L.rbs.tabBelow + L.rbs.tab[1]]));
      for (const k of [0, 2]) {
        const z = f.hh + k * (p.mountSpacing ?? 50), v0 = s * (f.S / 2 + f.T / 2 + 14), v1 = s * (tabV - 16);
        t.add(BOLT, t.cyl('y', Math.min(v0, v1), Math.max(v0, v1), bolt - .8, [-f.W / 2, 0, z], 16),
          t.cyl('y', Math.min(v0, v0 - s * 14), Math.max(v0, v0 - s * 14), bolt * 1.7, [-f.W / 2, 0, z], 6),
          t.cyl('y', Math.min(v1, v1 + s * 14), Math.max(v1, v1 + s * 14), bolt * 1.7, [-f.W / 2, 0, z], 6));
      }
      t.add(REP_BLACK, t.beam([-f.W / 2, s * legV, l.rbsZ], [back, s * (legV - run), l.rbsZ], L.tube, L.tube));
    }
    const centreHalf = legV - run + hw;
    const holes = Array.from({ length: Math.max(0, Math.floor(centreHalf * 2 / inch(2)) - 1) }, (_, i) => -centreHalf + inch(2) * (i + 1));
    t.add(REP_BLACK, t.cut(t.box([back - hw, -centreHalf - hw, l.rbsZ - hw], [back + hw, centreHalf + hw, l.rbsZ + hw]),
      holes.filter(v => Math.abs(v) > inch(2.5)).map(v => t.cyl('z', l.rbsZ - hw - 2, l.rbsZ + hw + 2, inch(1), [back, v, 0], 16))));
    // ── Front base: post under the RBS centre with the low-row pulley, floor tube back to the rear base.
    t.add(REP_BLACK, t.box([back - hw, -hw, 0], [back + hw, hw, l.rbsZ - hw]), t.box([back + hw, -inch(1), 0], [L.base.u0, inch(1), inch(2)]),
      t.box([back - inch(2.5), -inch(2.5), l.rbsZ - hw - 8], [back + inch(2.5), inch(2.5), l.rbsZ - hw]));
    const lowC: Vec3 = [back - hw - R * .7, 0, L.lowPulley];
    pulley(t, lowC);
    // Diamond-plate footplate: a U around the post, V-notched front plate with the brushed logo insert.
    const fp = L.footplate, notch: Vec2[] = [[-fp.half, 0], [fp.half, 0], [fp.half, fp.h], [inch(2.2), fp.h], [0, fp.h - inch(2.4)], [-inch(2.2), fp.h], [-fp.half, fp.h]];
    t.add(TREAD, t.prismYZ(notch, fp.u0, fp.u0 + 4.8));
    for (const s of [-1, 1]) t.add(TREAD, t.box([fp.u0, s > 0 ? fp.half - 4.8 : -fp.half, 0], [fp.u1, s > 0 ? fp.half : -fp.half + 4.8, fp.h]));
    t.add(BRUSHED, t.box([fp.u0 - 1, -inch(2.2), inch(1.8)], [fp.u0 + .2, inch(2.2), inch(3.2)]));
    // ── Rear base: transverse channel, angled feet down to bolt tabs, band pegs.
    const B = L.base;
    t.add(REP_BLACK, t.box([B.u0, -B.half, inch(0.4)], [B.u1, B.half, B.h]));
    for (const s of [-1, 1]) {
      const v0 = s * (B.half - inch(1.5));
      t.add(REP_BLACK, t.box([B.u1 + inch(1.5), Math.min(v0 - inch(1.5), v0 + inch(1.5)), 0], [B.back, Math.max(v0 - inch(1.5), v0 + inch(1.5)), 9.5]),
        t.prismXZ([[B.u0, inch(0.4)], [B.back, 0], [B.back, 9.5], [B.u1 + inch(1), B.h]], Math.min(v0, v0 + s * 6.35) - (s > 0 ? 0 : 0), Math.max(v0, v0 + s * 6.35)));
      t.add(BOLT, t.cyl('z', 9.5, 14, 30, [B.back - inch(1.3), v0, 0], 6));
      t.add(REP_BLACK, t.cyl('y', Math.min(s * B.half, s * B.pegs), Math.max(s * B.half, s * B.pegs), inch(1), [L.rods.u, 0, inch(2)], 20));
    }
    // ── Top member on the rear top crossmember: 3x3 beam, saddle plate and two vertical bolts, T-head, lat J-hooks.
    t.add(REP_BLACK, t.box([L.memberFront, -hw, l.beam0], [L.memberBack, hw, l.top]),
      t.box([L.head.u0, -L.head.half, l.beam0], [L.head.u1, L.head.half, l.top]),
      t.box([-f.W - inch(0.5), -inch(3), l.beam0 - 9.5], [inch(0.5), inch(3), l.beam0]));
    for (const s of [-1, 1]) t.add(BOLT, t.cyl('z', l.beam0 - inch(6), l.top + 12, bolt - .8, [-f.W / 2, s * inch(2.25), 0], 16), t.cyl('z', l.top, l.top + 14, bolt * 1.7, [-f.W / 2, s * inch(2.25), 0], 6));
    for (const s of [-1, 1]) t.add(REP_BLACK, t.prismXZ([[L.memberFront, l.beam0], [L.memberFront + inch(1.2), l.beam0], [L.memberFront + inch(1.2), l.beam0 - inch(3)], [L.memberFront - inch(0.8), l.beam0 - inch(3)], [L.memberFront - inch(0.8), l.beam0 - inch(1.8)], [L.memberFront - inch(0.2), l.beam0 - inch(1.8)], [L.memberFront, l.beam0 - inch(2.3)]], s * inch(6) - 3, s * inch(6) + 3));
    t.add(BRUSHED, t.box([-inch(5.5), -hw - .8, l.top - inch(2.2)], [-inch(1.5), -hw + .2, l.top - inch(0.8)]));
    // ── Pulleys and cables (simplified 1:1 routes: stack or carriage → T-head → lat pulley; low row → floor → floating block).
    const latC: Vec3 = [L.latPulley, 0, l.beam0 - R - 14], rearC: Vec3 = [L.rods.u - R, 0, l.beam0 - R - 14];
    pulley(t, latC); pulley(t, rearC);
    for (const c of [latC, rearC]) for (const e of [-1, 1]) t.add(REP_BLACK, t.box([c[0] - 15, e * 16 - 2, c[2]], [c[0] + 15, e * 16 + 2, l.beam0]));
    const floatC: Vec3 = [inch(15), 0, Math.max(inch(30), l.top * .48)], floorC: Vec3 = [B.u0 - inch(1), 0, inch(4.6)];
    for (const dz of [-R - 6, R + 6]) t.add(MAT.alu, t.sheave([floatC[0], 0, floatC[2] + dz], 'y', L.pulley, 25, 32));
    for (const e of [-1, 1]) t.add(REP_BLACK, t.hull([t.cyl('y', e * 17 - 2, e * 17 + 2, L.pulley * .8, [floatC[0], 0, floatC[2] - R - 6], 24), t.cyl('y', e * 17 - 2, e * 17 + 2, L.pulley * .8, [floatC[0], 0, floatC[2] + R + 6], 24)]));
    pulley(t, floorC);
    const liftTop = selectorized ? l.stackTop + 55 : L.carriage.z + inch(4) + 10, latBarZ = l.beam0 - inch(7);
    t.add(MAT.cable, t.cable([[L.rods.u, 0, liftTop], [L.rods.u, 0, rearC[2]], [rearC[0], 0, rearC[2] + R], [latC[0], 0, latC[2] + R], [latC[0] - R, 0, latC[2]], [latC[0] - R, 0, latBarZ + 60]], 5));
    t.add(MAT.cable, t.cable([[lowC[0] - R, 0, lowC[2]], [lowC[0], 0, lowC[2] + R], [floorC[0], 0, floorC[2] + R], [floorC[0] + R, 0, floorC[2]], [floatC[0] + R + 2, 0, floatC[2] - R - 6], [floatC[0] + R + 2, 0, floatC[2] + R + 6], [floatC[0] + R * .4, 0, l.beam0]], 5));
    t.add(mat('Rubber cable stop balls', '#18191a', 0, .8), t.cyl('x', lowC[0] - R - 40, lowC[0] - R - 6, 32, [0, 0, lowC[2]], 20));
    t.within(s => t.move(t.rotate(s, [0, 0, 90]), [latC[0] - R, 0, 0]), () => { cableEnd(t, [0, 0, latBarZ + 60], 40); latBar(t, [0, 0, latBarZ - 40], L.latBar, inch(5), inch(3.2), 28, BAR, GRIP); });
    if (selectorized) {
      // ── Selectorized stack on its spacer, C-channel shroud with the REP insert, graphite head plate with band pegs.
      t.add(REP_BLACK, t.box([L.rods.u - L.plate.w / 2, -L.plate.d / 2 + inch(1), B.h], [L.rods.u + L.plate.w / 2, L.plate.d / 2 - inch(1), L.stackBase]));
      weightStack(t, { x: L.rods.u, y: 0, z0: L.stackBase, w: L.plate.w, d: L.plate.d, t: L.plate.t, n: l.plates, head: L.head20, face: '-x', rodSep: L.rods.half * 2,
        rodD: L.rods.d, rodTop: l.beam0, rodAxis: 'y', pin: p.pin, stripe: () => '#8d9296', plate: MAT.stack, labelW: inch(2.4) });
      t.add(GRAPHITE, t.box([L.rods.u - L.plate.w / 2 - 1, -L.plate.d / 2 - 1, l.stackTop - L.head20], [L.rods.u + L.plate.w / 2 + 1, L.plate.d / 2 + 1, l.stackTop + 1]));
      t.add(REP_BLACK, t.cyl('y', -inch(8.25), inch(8.25), inch(0.75), [L.rods.u, 0, l.stackTop - L.head20 / 2], 16));
      const S = L.shroud, top = l.stackTop + inch(6.5), web = L.plate.d / 2 + inch(0.6);
      for (const s of [-1, 1]) {
        const a = s * web, b = s * (web - S.face), c = s * (web + 3);
        t.add(REP_BLACK, t.box([L.rods.u - S.depth / 2, Math.min(a, c), B.h], [L.rods.u + S.depth / 2, Math.max(a, c), top]),
          ...[-1, 1].map(e => t.box([L.rods.u + e * S.depth / 2 - (e > 0 ? 3 : 0), Math.min(a, b), B.h], [L.rods.u + e * S.depth / 2 + (e > 0 ? 0 : 3), Math.max(a, b), top])));
      }
      t.add(BRUSHED, t.box([L.rods.u - S.depth / 2 - 1, -web + inch(0.6), top - inch(3.6)], [L.rods.u - S.depth / 2 + .2, -web + S.face - inch(0.6), top - inch(2.4)]));
    } else {
      // ── Plate-loaded carriage: sleeves on the guide rods, cross plates, two Olympic horns, rubber stops.
      for (const e of [-1, 1]) {
        t.add(MAT.chrome, t.cyl('z', B.h, l.beam0, L.rods.d, [L.rods.u, e * L.rods.half, 0], 20));
        t.add(REP_BLACK, t.cyl('z', L.carriage.z - inch(4), L.carriage.z + inch(4), L.carriage.sleeve, [L.rods.u, e * L.rods.half, 0], 24));
        t.add(MAT.rubber, t.cyl('z', B.h, B.h + inch(1.2), inch(1.8), [L.rods.u, e * L.rods.half, 0], 20));
        t.add(REP_BLACK, t.cyl('y', Math.min(e * inch(3.8), e * L.carriage.horn), Math.max(e * inch(3.8), e * L.carriage.horn), inch(1.97), [L.rods.u, 0, L.carriage.z - inch(1)], 28));
        t.add(REP_BLACK, t.cyl('y', Math.min(e * inch(3.6), e * inch(4.3)), Math.max(e * inch(3.6), e * inch(4.3)), inch(3.4), [L.rods.u, 0, L.carriage.z - inch(1)], 28));
      }
      for (const z of [L.carriage.z - inch(3.5), L.carriage.z + inch(3.5)]) t.add(REP_BLACK, t.box([L.rods.u - inch(1), -L.rods.half, z - 6], [L.rods.u + inch(1), L.rods.half, z + 6]));
      t.add(REP_BLACK, t.box([L.rods.u - inch(1.6), -inch(2), L.carriage.z - inch(3.5)], [L.rods.u - inch(1.1), inch(2), L.carriage.z + inch(3.5)]));
    }
  }), [0, 0]);
}
export const buildRepSelectorizedLat = (api: ManifoldAPI, params: NumericParams) => build(api, params, true);
export const buildRepPlateLat = (api: ManifoldAPI, params: NumericParams) => build(api, params, false);
