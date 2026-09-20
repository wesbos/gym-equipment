/** Fringe Sport The Dane 2.0 dual stacks (#130): one unit per side frame, mounted on the rear upright's front face and
 * spanning to the front upright (local +Y). Local X is across the side plane; acrossOut gives the outboard sign. Sizes
 * and estimates: DANE and research/rack-digital-cable-trainers.md. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { MAT, mat, towerKit, type TowerKit } from './cable-towers-kit.ts';
import { weightStack, swivelPulley, cableEnd, dHandle } from './cable-towers-components.ts';
import { DANE, DANE_TROLLEY, FRINGE_DANE_STACKS, inch, daneLayout } from '../rack-parts/rack-digital-cable-trainers.ts';

const BLACK = mat('Fringe matte black steel', '#161719', .3, .72);
const LETTERS = mat('Cut-out FRINGE SPORT lettering', '#45474a', .45, .55);
const RED = mat('Warhawk red aluminium pulleys and pins', '#b3202a', .55, .38);
const ROLLER = mat('Black trolley rollers', '#1d1e20', .1, .6);

function redPulley(t: TowerKit, c: Vec3, dia: number) {
  t.add(RED, t.sheave(c, 'x', dia, 22, 32));
  t.add(MAT.zinc, t.cyl('x', c[0] - 16, c[0] + 16, 12, c, 12));
}
export function buildDaneStacks(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...FRINGE_DANE_STACKS.defaults, ...params };
  if (!(p.trolley >= 0 && p.trolley < DANE_TROLLEY.length) || !(p.pin >= 0 && p.pin < 16)) throw Error('Unsupported Dane 2.0 option.');
  const l = daneLayout(p), D = DANE, t = towerKit(api), o = l.o, X = (x: number) => o * x, fl = l.floor, S = D.stack;
  const xs = (a: number, b: number): [number, number] => [Math.min(X(a), X(b)), Math.max(X(a), X(b))];
  return t.finish('Dane 2.0 stacks', () => {
    // ── Stack on rubber bumpers over the side base tube, chrome guide rods up to the top crossmember, top plate and pin.
    const headTop = weightStack(t, { x: 0, y: l.stackY, z0: fl + S.z0, w: S.across, d: S.along, t: S.t, n: S.n, head: S.head, face: o > 0 ? '-x' : '+x',
      rodSep: S.rodSep, rodD: inch(1), rodTop: l.top - inch(4.5), rodAxis: 'y', pin: p.pin + 1, bumper: 18,
      stripe: i => i > 15 ? '#c8302c' : i > 8 ? '#e2c12a' : '#2aa39b', plate: MAT.stack, labelW: inch(1.4), pinKnob: '#b3202a' });
    for (const e of [-1, 1]) t.add(BLACK, t.box([-inch(1.6), l.stackY + e * S.rodSep / 2 - inch(1.2), l.top - inch(4.6)], [inch(1.6), l.stackY + e * S.rodSep / 2 + inch(1.2), l.top - inch(3.6)]));
    // ── Pulley housing on the side top crossmember: two plates with the notched top edge, three tabs and the cut-out name.
    const H = D.housing, y0 = H.from, y1 = l.span, z0 = l.top - H.below, z1 = l.top + H.above;
    const outline: Vec2[] = [[y0, z0], [y1, z0], [y1, z1 - inch(1)], [y1 - inch(2), z1 - inch(1)], [y1 - inch(2.6), z1], [y1 - inch(4.6), z1], [y1 - inch(5.2), z1 - inch(1)],
      [(y0 + y1) / 2 + inch(1.6), z1 - inch(1)], [(y0 + y1) / 2 + inch(1), z1], [(y0 + y1) / 2 - inch(1), z1], [(y0 + y1) / 2 - inch(1.6), z1 - inch(1)],
      [y0 + inch(5.2), z1 - inch(1)], [y0 + inch(4.6), z1], [y0 + inch(2.6), z1], [y0 + inch(2), z1 - inch(1)], [y0, z1 - inch(1)]];
    for (const e of [-1, 1]) {
      const x = e * (l.T / 2 + 6);
      t.add(BLACK, t.prismYZ(outline, Math.min(x, x + e * 6), Math.max(x, x + e * 6)));
    }
    t.add(LETTERS, t.label('FRINGE SPORT', (y1 - y0) * .72, inch(1.6), 1, [X(l.T / 2 + 12), (y0 + y1) / 2, l.top + inch(1)], [0, o, 0], [0, 0, 1]));
    const hz = l.top + inch(0.6), R = H.pulley / 2;
    for (const y of [l.stackY, (l.stackY + y1) / 2]) redPulley(t, [0, y, hz], H.pulley);
    // Front pulley bracket over the front upright: drops the cable outboard of the post to the trolley.
    const fx = X(l.W / 2 + 20), frontY = l.span;
    const [bx0, bx1] = xs(l.W / 2 + 2, l.W / 2 + 44);
    t.add(BLACK, t.box([bx0, frontY - inch(2.5), l.top - inch(1)], [bx1, frontY + inch(2.5), l.top + inch(3)]));
    for (const k of [0, 1, 2]) t.add(LETTERS, t.box([xs(l.W / 2 + 43, l.W / 2 + 45)[0], frontY - inch(1.4) + k * inch(0.9), l.top + inch(0.3)], [xs(l.W / 2 + 43, l.W / 2 + 45)[1], frontY - inch(1.1) + k * inch(0.9), l.top + inch(2.4)]));
    t.add(RED, t.sheave([fx, frontY - R, hz], 'x', H.pulley, 22, 32));
    // ── Figure-8 floating pulley between the stack and the front upright, and the low pulley on the base tube.
    const fy = (l.stackY + S.along / 2 + l.span) / 2 + inch(2), fz = fl + D.float.z, r2 = D.float.dia / 2;
    t.add(BLACK, t.hull([t.cyl('x', -10, -6, D.float.dia + 16, [0, fy, fz + r2 + 3], 24), t.cyl('x', -10, -6, D.float.dia + 16, [0, fy, fz - r2 - 3], 24)]),
      t.hull([t.cyl('x', 6, 10, D.float.dia + 16, [0, fy, fz + r2 + 3], 24), t.cyl('x', 6, 10, D.float.dia + 16, [0, fy, fz - r2 - 3], 24)]));
    redPulley(t, [0, fy, fz + r2 + 3], D.float.dia); redPulley(t, [0, fy, fz - r2 - 3], D.float.dia);
    const ly = l.span - l.T / 2 - inch(3.5), lz = fl + inch(9.5);
    t.add(BLACK, t.box([-inch(1.2), ly - inch(2), fl + inch(8)], [inch(1.2), ly + inch(2), fl + inch(8.3)]));
    redPulley(t, [0, ly, lz], inch(3.5));
    // ── Swivel trolley on the front upright: plate carriage, four rollers, U handle, red pop pin and swivel pulley outboard.
    const zt = l.trolleyZ, h = D.trolley.h / 2, cy0 = frontY - l.T / 2 - 8, cy1 = frontY + l.T / 2 + 8, [cx0, cx1] = xs(-l.W / 2 - 8, l.W / 2 + 8);
    t.add(BLACK, t.box([cx0 - 6, cy0 - 6, zt - h], [cx1 + 6, cy0, zt + h]), t.box([cx0 - 6, cy1, zt - h], [cx1 + 6, cy1 + 6, zt + h]),
      t.box([cx0 - 6, cy0, zt - h], [cx0, cy1, zt + h]), t.box([cx1, cy0, zt - h], [cx1 + 6, cy1, zt + h]));
    for (const z of [zt - h + inch(1.1), zt + h - inch(1.1)]) for (const y of [cy0 - 3, cy1 + 3]) t.add(ROLLER, t.cyl('x', -inch(1), inch(1), inch(1.3), [0, y, z], 20));
    t.add(BLACK, t.rod([-inch(1.5), cy1 + 6, zt + h - 12], [-inch(1.5), cy1 + inch(3), zt + h - 12], 14, 12), t.rod([inch(1.5), cy1 + 6, zt + h - 12], [inch(1.5), cy1 + inch(3), zt + h - 12], 14, 12),
      t.rod([-inch(1.5), cy1 + inch(3), zt + h - 12], [inch(1.5), cy1 + inch(3), zt + h - 12], 14, 12));
    t.add(RED, t.cyl('y', cy1 + 6, cy1 + 40, 24, [0, 0, zt - h + inch(1.8)], 20));
    t.add(BLACK, t.box([xs(l.W / 2 + 8, l.W / 2 + 30)[0], frontY - inch(1), zt - h], [xs(l.W / 2 + 8, l.W / 2 + 30)[1], frontY + inch(1), zt - h + inch(2)]));
    // The swivel pulley faces forward, so the cable and D-handle leave toward the user (published 47 in overall width).
    const exit = swivelPulley(t, [fx, frontY, zt - h], [0, 1, 0], D.trolley.pulley, BLACK, RED), end = cableEnd(t, [exit[0], exit[1] + 16, exit[2]], 44);
    t.within(s => t.move(t.rotate(t.move(s, [-end[0], -end[1], 0]), [0, 0, 90]), [end[0], end[1], 0]), () => dHandle(t, end, 180, 110));
    // ── Cables: stack top over the housing pulleys, forward to the front bracket, down to the trolley; the loop through the
    //    floating block down to the low pulley (simplified).
    t.add(MAT.cable, t.cable([[0, l.stackY, headTop + 55], [0, l.stackY, hz - R], [0, l.stackY + R, hz], [0, (l.stackY + y1) / 2, hz + R], [fx, frontY - R, hz + R], [fx, frontY, hz], [fx, frontY, zt - h + 20]], 4.5));
    t.add(MAT.cable, t.cable([[0, (l.stackY + y1) / 2 + R, hz], [0, fy + r2, fz + r2 + 3], [0, fy + r2, fz - r2 - 3], [0, ly + inch(1.75), lz], [0, ly, lz - inch(1.75)]], 4.5));
    // ── Extension foot: holed 2x3 tube bolted to the front upright, level for 12 in at 7 in, then a 45° leg to a floor pad.
    const F = D.feet, fy0 = frontY + l.T / 2, run = F.reach - F.level;
    const legHoles = [0, 1, 2, 3, 4].map(i => t.cyl('x', -F.w, F.w, inch(0.9), [0, fy0 + inch(2) + i * inch(2.2), fl + F.rise], 16));
    t.add(BLACK, t.cut(t.box([-F.w / 2, fy0, fl + F.rise - F.h / 2], [F.w / 2, fy0 + F.level, fl + F.rise + F.h / 2]), legHoles),
      t.beam([0, fy0 + F.level - inch(1), fl + F.rise], [0, fy0 + F.level + run - inch(1.5), fl + inch(1)], F.w, F.h, [0, 0, 1]),
      t.box([-inch(2), fy0 + F.reach - inch(5), fl], [inch(2), fy0 + F.reach, fl + inch(0.4)]),
      // Bolt plate on the upright's outer face.
      t.box([xs(l.W / 2, l.W / 2 + 6)[0], fy0 - l.T, fl + F.rise - F.h / 2 - inch(1)], [xs(l.W / 2, l.W / 2 + 6)[1], fy0 + inch(2), fl + F.rise + F.h / 2 + inch(1)]));
  }, [0, 0]);
}
