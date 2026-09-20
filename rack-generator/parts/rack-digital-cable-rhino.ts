/** Rogue Monster Rhino + INDY Functional Trainer (#122). Built in the machine frame of rack-parts/rack-digital-cable-trainers.ts
 * (u out of the rack from the rear post's outer face, v across from the rack centreline, z up from the floor), then mapped
 * into the rack-part frame. Sizes and estimates: RHINO_INDY and research/rack-digital-cable-trainers.md. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { MAT, mat, towerKit, type TowerKit } from './cable-towers-kit.ts';
import { weightStack, swivelPulley, cableEnd, latBar } from './cable-towers-components.ts';
import { RHINO_INDY, RHINO_TROLLEY, ROGUE_RHINO_INDY, inch, rhinoLayout } from '../rack-parts/rack-digital-cable-trainers.ts';
import { inMachine } from './rack-digital-cable-trainers.ts';

const ROGUE_BLACK = mat('Rogue textured black steel', '#1b1c1e', .35, .7);
const SHROUD = mat('Textured black INDY shrouds', '#161718', .25, .82);
const LETTERS = mat('Cut-out ROGUE lettering', '#3b3d40', .4, .6);
const TREAD = mat('Diamond tread plate', '#2a2b2d', .6, .45);
const RED = mat('Rogue red pop-pin knobs', '#c8102e', .2, .5);
const ROLLER = mat('Silver trolley rollers', '#b9bdc0', .85, .3);
const GRIP = mat('Knurled Multi Grip handles', '#2b2c2e', .6, .5, 'handle');

/** Cast pulley with a black face ring (Rogue's five-spoke look, simplified to a grooved aluminium sheave and hub). */
function pulley(t: TowerKit, c: Vec3, axis: 'x' | 'y', dia: number) {
  t.add(MAT.alu, t.sheave(c, axis, dia, 24, 32));
  t.add(ROGUE_BLACK, t.cyl(axis, (axis === 'x' ? c[0] : c[1]) - 14, (axis === 'x' ? c[0] : c[1]) + 14, dia * .34, c, 20));
}
export function buildRhinoIndy(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_RHINO_INDY.defaults, ...params };
  if (![0, 1, 2].includes(p.sides) || !(p.trolley >= 0 && p.trolley < RHINO_TROLLEY.length)) throw Error('Unsupported Rhino + INDY option.');
  const l = rhinoLayout(p), f = l.f, R = RHINO_INDY, t = towerKit(api), half = f.S / 2, top = l.top, hw = inch(1.5);
  return t.finish('Rhino + INDY trainer', () => inMachine(t, f, () => {
    // ── Pulley deck: 7 in welded platform in the rear bay, diamond tread top with the belt-cable slot, footplate in front.
    const d0 = -f.W - R.deck.depth, d1 = -f.W - 6, dv = half - f.T / 2 - 8, dz = R.deck.h;
    t.add(ROGUE_BLACK, t.cut(t.box([d0, -dv, 0], [d1, dv, dz - 5]), [t.box([d0 + inch(3), -dv + inch(3), inch(3)], [d1 - inch(3), dv - inch(3), dz])]));
    t.add(TREAD, t.cut(t.box([d0, -dv, dz - 5], [d1, dv, dz]), [t.box([(d0 + d1) / 2 - inch(5), -inch(1), dz - 8], [(d0 + d1) / 2 + inch(5), inch(1), dz + 2])]));
    t.add(ROGUE_BLACK, t.box([d0 - inch(2.5), -inch(2), 0], [d0, inch(2), inch(6)]));
    pulley(t, [d0 - inch(1.2), 0, inch(3.5)], 'y', inch(4.5));
    const foot: Vec2[] = [[d0 - inch(11), 0], [d0 - inch(3), 0], [d0 - inch(3), inch(3)], [d0 - inch(7), inch(11)], [d0 - inch(9.5), inch(11)]];
    t.add(TREAD, t.prismXZ(foot, -inch(8), inch(8)));
    t.add(ROGUE_BLACK, t.cut(t.prismXZ([[d0 - inch(3), 0], [d0, 0], [d0, inch(6.5)], [d0 - inch(3), inch(6.5)]], -inch(3.5), inch(3.5)), [t.box([d0 - inch(4), -inch(1.2), inch(2)], [d0 + 2, inch(1.2), inch(5.5)])]));
    // ── Rhino: 3x6 upright behind the rear crossmember with its cut-out wordmark, plate trolley and posts, top angle members.
    const r = R.rhino;
    // Published 92 in overall on a 90 in rack: the Rhino head and the top pulley plates rise about 1.6 in over the uprights.
    t.add(ROGUE_BLACK, t.box([r.u0, -r.half, 0], [r.u1, r.half, top + inch(1.5)]), t.box([r.u0 - inch(2), -inch(4), 0], [r.u1 + inch(4), inch(4), 9.5]));
    // Text reads upward from outside; the machine frame is mirrored when acrossOut = -1, so the letter direction flips with it.
    t.add(LETTERS, t.label('ROGUE', inch(22), inch(2.6), 1.2, [(r.u0 + r.u1) / 2, f.o > 0 ? -r.half : -r.half - 1.2, top - inch(30)], [0, 0, 1], [-f.o, 0, 0]));
    t.add(ROGUE_BLACK, t.box([r.u0 - 8, -r.half - 8, r.trolley - inch(5)], [r.u1 + 8, r.half + 8, r.trolley + inch(5)]));
    for (const e of [-1, 1]) {
      t.add(ROGUE_BLACK, t.cyl('x', r.u1 + 8, r.u1 + 8 + r.post, inch(1.9), [0, e * inch(2.4), r.trolley], 24),
        t.cyl('x', r.u1 + 8, r.u1 + 8 + inch(0.5), inch(4), [0, e * inch(2.4), r.trolley], 24));
      t.add(ROGUE_BLACK, t.beam([0, e * half, top - hw], [(r.u0 + r.u1) / 2, e * r.half, top - hw], inch(3), inch(3)));
    }
    t.add(MAT.uhmw, t.cyl('x', r.u1 + 8, r.u1 + inch(9), inch(1), [0, 0, r.trolley + inch(3.5)], 16));
    const rc = (r.u0 + r.u1) / 2, rz = top - inch(1);
    pulley(t, [rc, 0, rz], 'y', inch(4.5));
    // ── Lever handles on the rear uprights' inner faces (stowed), Multi Grip handles at the tips.
    for (const e of [-1, 1]) {
      const v = e * (half - f.T / 2 - inch(2.2)), a: Vec3 = [-f.W - inch(1), v, R.lever.hinge], b: Vec3 = [-f.W - R.lever.reach, v, R.lever.tip];
      t.add(ROGUE_BLACK, t.box([-f.W - 6, e > 0 ? half - f.T / 2 - inch(3.6) : -half + f.T / 2, R.lever.hinge - inch(3)], [-f.W, e > 0 ? half - f.T / 2 : -half + f.T / 2 + inch(3.6), R.lever.hinge + inch(3)]));
      t.add(ROGUE_BLACK, t.beam(a, b, inch(3), inch(3)));
      t.add(GRIP, t.cyl('y', Math.min(v, v - e * inch(7)), Math.max(v, v - e * inch(7)), inch(1.25), [b[0] - inch(2), 0, b[2] + inch(2)], 20));
    }
    // ── Lat pulldown: top centre crossmember front to back, pulley bracket and lat bar, cable back to the Rhino.
    const mid = (l.front - f.W / 2) / 2;
    t.add(ROGUE_BLACK, t.box([l.front + f.W / 2, -hw, top - inch(3)], [-f.W, hw, top]));
    t.add(ROGUE_BLACK, t.box([mid - inch(3), -inch(2), top - inch(7)], [mid + inch(3), -inch(1.6), top - inch(3)]), t.box([mid - inch(3), inch(1.6), top - inch(7)], [mid + inch(3), inch(2), top - inch(3)]));
    pulley(t, [mid, 0, top - inch(5.2)], 'y', inch(3.5));
    t.add(MAT.cable, t.cable([[mid - inch(1.75), 0, top - inch(10)], [mid - inch(1.75), 0, top - inch(5.2)], [mid, 0, top - inch(3.45)], [rc, 0, rz + inch(2.25)], [rc + inch(2.25), 0, rz], [rc + inch(2.25), 0, r.trolley + inch(5)]], 4.8));
    t.within(s => t.move(t.rotate(s, [0, 0, 90]), [mid - inch(1.75), 0, 0]), () => { cableEnd(t, [0, 0, top - inch(10)], 40); latBar(t, [0, 0, top - inch(10) - 100], inch(44), inch(6), inch(4), 28, ROGUE_BLACK, GRIP); });
    // ── INDY stacks: plates on two guide rods in the side plane, shrouds, top pulley plates, front plates and swivel trolleys.
    const S = R.stack, P = R.plate, sheave = R.topPlate.pulley / 2;
    for (const s of l.sides) {
      const v = s * half, u0 = l.stackU - S.shroud / 2, u1 = l.stackU + S.shroud / 2, zTop = top - S.topGap;
      const headTop = weightStack(t, { x: l.stackU, y: v, z0: S.bottom + inch(1.5), w: P.along, d: P.across, t: P.t, n: P.n, head: R.head, face: s > 0 ? '-y' : '+y',
        rodSep: inch(7.5), rodD: inch(1), rodTop: zTop, rodAxis: 'x', pin: 10, stripe: () => '#e9e8e3', plate: MAT.stack, labelW: inch(1.6), pinKnob: '#c8102e' });
      t.add(ROGUE_BLACK, t.box([u0, v - inch(2.5), S.bottom], [u1, v + inch(2.5), S.bottom + inch(1.5)]), t.box([u0, v - inch(2.5), zTop], [u1, v + inch(2.5), zTop + inch(1.5)]));
      // Shroud: outboard panel with the ROGUE wordmark, keyhole-grid inboard panel, closed ends.
      const vo = v + s * S.out, vi = v - s * S.in, keyholes = [];
      for (let c = 0; c < 5; c++) for (let k = 0; k < 9; k++) keyholes.push(t.cbox([u0 + inch(3.5) + c * inch(3), vi, S.bottom + inch(12) + k * inch(6.5)], [inch(0.9), 12, inch(1.9)]));
      t.add(SHROUD, t.box([u0, Math.min(vo, vo - s * 3), S.bottom], [u1, Math.max(vo, vo - s * 3), zTop]),
        t.cut(t.box([u0, Math.min(vi, vi + s * 3), S.bottom], [u1, Math.max(vi, vi + s * 3), zTop]), keyholes),
        ...[u0, u1 - 3].map(u => t.box([u, Math.min(vo, vi), S.bottom], [u + 3, Math.max(vo, vi), zTop])));
      t.add(LETTERS, t.label('ROGUE', inch(34), inch(4.5), 1.2, [l.stackU, f.o > 0 ? vo : vo + s * 1.2, S.bottom + inch(29)], [0, 0, 1], [s * f.o, 0, 0]));
      // Top rear side pulley plates over the side top crossmember: two plates, a pulley over the stack and one behind the post.
      const pu0 = u0 - inch(1), pu1 = inch(3), pz0 = top - inch(3), pz1 = top - inch(3) + R.topPlate.h;
      for (const e of [-1, 1]) t.add(ROGUE_BLACK, t.box([pu0, Math.min(v + e * (f.T / 2 + 2), v + e * (f.T / 2 + 8.35)), pz0], [pu1, Math.max(v + e * (f.T / 2 + 2), v + e * (f.T / 2 + 8.35)), pz1]));
      const pz = pz1 - sheave - 4;
      pulley(t, [l.stackU, v, pz], 'y', R.topPlate.pulley); pulley(t, [pu1 - sheave - 10, v, pz], 'y', R.topPlate.pulley);
      // Front top side pulley plate and the drop down the front upright's outer side.
      const vf = v + s * (f.T / 2 + 20), fu = l.front + sheave;
      t.add(ROGUE_BLACK, t.box([l.front - f.W / 2 - inch(2), Math.min(vf - s * 10, v + s * (f.T / 2 + 2)), pz0], [l.front + inch(7), Math.max(vf - s * 10, v + s * (f.T / 2 + 2)), pz1]),
        t.box([l.front - f.W / 2 - inch(2), Math.min(vf + s * 14, vf + s * 20), pz0], [l.front + inch(7), Math.max(vf + s * 14, vf + s * 20), pz1]));
      pulley(t, [fu, vf, pz], 'y', R.topPlate.pulley);
      // Swivel trolley: steel carriage around the front upright, silver rollers, U handle, red pop pin, swivel pulley outboard.
      const zt = l.trolleyZ, h = R.trolley.h / 2, cu0 = l.front - f.W / 2 - 9, cu1 = l.front + f.W / 2 + 9, cv0 = v - s * (f.T / 2 + 9), cv1 = v + s * (f.T / 2 + 9);
      t.add(ROGUE_BLACK, t.box([cu0 - 6, Math.min(cv0, cv1), zt - h], [cu0, Math.max(cv0, cv1), zt + h]), t.box([cu1, Math.min(cv0, cv1), zt - h], [cu1 + 6, Math.max(cv0, cv1), zt + h]),
        t.box([cu0 - 6, Math.min(cv1, cv1 + s * 6), zt - h], [cu1 + 6, Math.max(cv1, cv1 + s * 6), zt + h]), t.box([cu0 - 6, Math.min(cv0, cv0 - s * 6), zt - h], [cu1 + 6, Math.max(cv0, cv0 - s * 6), zt + h]));
      for (const z of [zt - h + inch(1.2), zt + h - inch(1.2)]) for (const u of [cu0 - 3, cu1 + 3]) t.add(ROLLER, t.cyl('y', Math.min(v - s * inch(1), v + s * inch(1)), Math.max(v - s * inch(1), v + s * inch(1)), inch(1.5), [u, 0, z], 20));
      t.add(ROGUE_BLACK, t.rod([cu0 - 6, v - inch(1.6), zt + h - 10], [cu0 - inch(4), v - inch(1.6), zt + h - 10], 16, 12), t.rod([cu0 - 6, v + inch(1.6), zt + h - 10], [cu0 - inch(4), v + inch(1.6), zt + h - 10], 16, 12),
        t.rod([cu0 - inch(4), v - inch(1.6), zt + h - 10], [cu0 - inch(4), v + inch(1.6), zt + h - 10], 16, 12));
      t.add(RED, t.cyl('y', Math.min(cv1 + s * 6, cv1 + s * 40), Math.max(cv1 + s * 6, cv1 + s * 40), 26, [l.front, 0, zt - h + inch(2)], 20));
      // Swivel pulley under the carriage's outboard side, facing forward (Rogue's renders): the cable leaves toward the user.
      t.add(ROGUE_BLACK, t.box([l.front - inch(1.2), Math.min(cv1 + s * 6, vf + s * 10), zt - h], [l.front + inch(1.2), Math.max(cv1 + s * 6, vf + s * 10), zt - h + inch(2.5)]));
      const exit = swivelPulley(t, [l.front, vf, zt - h], [-1, 0, 0], R.trolley.pulley, ROGUE_BLACK, MAT.alu);
      cableEnd(t, [exit[0] - 20, exit[1], exit[2]], 50);
      // Cables: stack head up over the rear plate pulley, forward along the top, down the front upright to the trolley.
      t.add(MAT.cable, t.cable([[l.stackU, v, headTop + 55], [l.stackU, v, pz - sheave + 4], [l.stackU - sheave, v, pz], [l.stackU - sheave, v, pz + sheave], [fu, vf, pz + sheave], [fu - sheave, vf, pz], [fu - sheave, vf, zt - h + 18]], 4.8));
    }
  }), [0, 0]);
}
