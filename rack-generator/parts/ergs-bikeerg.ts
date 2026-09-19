/** Concept2 BikeErg: flywheel housing at the front, box-section main frame with the concept2 panel, silver seat post and
 * handlebar stem, bull-horn bars, PM5 on its arm. Build axes: X across, +Y toward the flywheel, Z up.
 * Side-view proportions are scaled off Concept2's BikeErg fit-guide drawing (48 in long). */
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { withKit, type Finish } from './ergs-kit.ts';
import { BIKEERG, bikeErgPositions } from '../floor-parts/ergs.ts';

const F = (color: string, roughness = .55, metalness = 0, role: Finish['role'] = 'source'): Finish => ({ role, color, roughness, metalness });
const LIME = '#c3d52c', WHITE = '#eeeeea';

export function buildBikeErg(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const { seatTop, barUp } = bikeErgPositions(p), L = BIKEERG.length, W = BIKEERG.width, front = L / 2, rear = -L / 2;
  return withKit(api, 'Concept2 BikeErg', K => {
    const black = F('#17181a', .55), alu = F('#c4c8cb', .32, .85, 'rod'), rubber = F('#151617', .9, 0, 'liner'), hw: Finish = { role: 'fastener', color: '#2e3033', metalness: .8, roughness: .35, authored: true };
    // ---- Flywheel housing (axle along X), grille faces on both sides, drum mesh, clips and damper lever.
    const hub: Vec3 = [0, 355, 328], hd = 476, hw2 = 180, R = hd / 2;
    for (const s of [-1, 1]) {
      K.add('Flywheel housing', F('#141517', .6), K.disc([s * (hw2 / 2 - 12), hub[1], hub[2]], 'x', hd, 24, 64));
      K.add('Housing face ring', F('#141517', .6), K.ring([s * (hw2 / 2 + 2), hub[1], hub[2]], 'x', hd - 24, hd - 160, 8, 64));
      K.add('Damper grille recess', F('#2b2d30', .7), K.disc([s * (hw2 / 2 - 2), hub[1], hub[2]], 'x', hd - 150, 8, 48));
      for (let i = 0; i < 6; i++) K.add('Damper grille', F('#0c0c0d', .45, .1), K.hoop([s * (hw2 / 2 + 1), hub[1], hub[2]], 'x', 70 + i * 50, 5, 40, 6));
      for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; K.add('Damper grille', F('#0c0c0d', .45, .1), K.rod([s * (hw2 / 2 + 1), hub[1] + 30 * Math.cos(t), hub[2] + 30 * Math.sin(t)], [s * (hw2 / 2 + 1), hub[1] + 162 * Math.cos(t), hub[2] + 162 * Math.sin(t)], 5, 6)); }
      K.add('Housing face ring', F('#141517', .6), K.disc([s * (hw2 / 2 + 1), hub[1], hub[2]], 'x', 64, 10, 32));
      K.add('Decal · lime', F(LIME, .5), K.disc([s * (hw2 / 2 + 6.5), hub[1], hub[2]], 'x', 34, 1, 24));
    }
    K.add('Flywheel drum mesh', F('#6b6f73', .5, .6), K.disc(hub, 'x', hd - 16, hw2 - 40, 64));
    for (const a of [20, 110, 200, 290]) { const y = hub[1] + (R - 12) * Math.cos(a * Math.PI / 180), z = hub[2] + (R - 12) * Math.sin(a * Math.PI / 180);
      K.add('Flywheel housing', F('#141517', .6), K.hull([K.sphere([-hw2 / 2 + 20, y, z], 26, 10), K.sphere([hw2 / 2 - 20, y, z], 26, 10)])); }
    K.add('Damper lever', F('#232427', .6), K.bar([hw2 / 2 + 4, hub[1] - 160, hub[2] + 140], [hw2 / 2 + 4, hub[1] - 120, hub[2] + 185], 10, 22, 3));
    // ---- Main frame: deep box beam with the concept2 panel, rear triangle to the seat tube and rear foot.
    K.add('Frame', black, K.span([-35, -505, 155], [35, hub[1] - 150, 362]));
    K.add('Frame', black, K.hull([K.box([70, 70, 2], [0, -430, 362]), K.box([60, 56, 2], [0, -488, 700])]));
    K.add('Frame', black, K.bar([0, -440, 220], [0, rear + 32, 40], 60, 55, 4));
    K.add('Frame', black, K.bar([0, hub[1] - 60, 140], [0, 520, 40], 60, 55, 4));
    K.add('Frame', black, K.span([-30, hub[1] - 170, 150], [30, hub[1] - 20, 260]));
    for (const s of [-1, 1]) K.add('Decal · white', F(WHITE, .5), K.span([s * 35 - (s > 0 ? 0 : .8), -60, 270], [s * 35 + (s > 0 ? .8 : 0), 120, 312]));
    for (const s of [-1, 1]) K.add('Decal · lime', F(LIME, .5), K.span([s * 35 - (s > 0 ? 0 : .8), -110, 272], [s * 35 + (s > 0 ? .8 : 0), -66, 312]));
    // Feet: front stabiliser with casters, rear stabiliser with levelling feet.
    K.add('Frame', black, K.bar([-W / 2 + 22, 520, 34], [W / 2 - 22, 520, 34], 60, 46, 4, [0, 1, 0]), K.bar([-W / 2 + 22, rear + 32, 34], [W / 2 - 22, rear + 32, 34], 60, 46, 4, [0, 1, 0]));
    for (const s of [-1, 1]) {
      K.add('Foot caps', rubber, K.bar([s * (W / 2 - 24), 520, 34], [s * W / 2, 520, 34], 64, 50, 6, [0, 1, 0]), K.bar([s * (W / 2 - 24), rear + 32, 34], [s * W / 2, rear + 32, 34], 64, 50, 6, [0, 1, 0]));
      const wh = K.wheel([s * (W / 2 - 40), front - 27, 27], 54, 22, .5, 24);
      K.add('Caster wheels', rubber, wh.tyre); K.add('Caster hubs', F('#6d7175', .4, .5), wh.hub);
      K.add('Frame', black, K.span([s * (W / 2 - 40) - 16, 540, 24], [s * (W / 2 - 40) + 16, front - 27, 52]));
      K.add('Levelling feet', rubber, K.disc([s * (W / 2 - 60), rear + 32, 5], 'z', 46, 10, 16));
    }
    // ---- Drivetrain: crank on the frame, 170 mm arms, platform pedals (Q factor 155 mm).
    const bb: Vec3 = [0, -288, 267];
    K.add('Drive cover', F('#1b1c1e', .6), K.disc(bb, 'x', 170, 84, 40));
    for (const s of [-1, 1]) {
      const pin: Vec3 = [s * 77, bb[1] + s * 170 * Math.cos(.35), bb[2] + s * 170 * Math.sin(.35)];
      K.add('Crank arms', F('#b8bcc0', .35, .85, 'rod'), K.bar([s * 50, bb[1], bb[2]], pin, 14, 30, 6), K.disc([s * 46, bb[1], bb[2]], 'x', 56, 10, 24));
      K.add('Pedals', F('#1a1b1c', .6, .3), K.span([pin[0] + s * 4, pin[1] - 50, pin[2] - 12], [pin[0] + s * 100, pin[1] + 50, pin[2] + 12]));
    }
    // ---- Seat: silver post with the numbered scale, saddle (angle-adjustable clamp).
    const sp0: Vec3 = [0, -488, 690], sp1: Vec3 = [0, -500, seatTop - 70];
    K.add('Seat post', alu, K.bar(sp0, sp1, 48, 48, 4));
    K.add('Frame', black, K.span([-32, -520, 690], [32, -456, 720]));
    K.add('Seat clamp', F('#1b1c1e', .6), K.span([-22, -540, seatTop - 72], [22, -460, seatTop - 52]));
    const sy = -500;
    const saddle = K.hull([K.pad(160, 110, 30, 50, [0, sy - 40, seatTop - 30]), K.pad(56, 60, 24, 20, [0, sy + 120, seatTop - 30]), K.sphere([0, sy - 25, seatTop - 25], 150, 18)]);
    K.add('Saddle', F('#151617', .7), K.inter(saddle, K.span([-120, sy - 200, seatTop - 40], [120, sy + 200, seatTop])));
    // ---- Handlebar post: black lower post rising out of the housing top, silver stem, bull-horn bars, PM5.
    const postTop = 760 + barUp;
    K.add('Frame', black, K.bar([0, 400, hub[2] + R - 30], [0, 400, 760], 60, 60, 4));
    K.add('Handlebar post', alu, K.bar([0, 400, 740], [0, 400, postTop + 110], 48, 48, 4));
    K.add('Handlebar post', alu, K.bar([0, 470, postTop + 130], [0, 250, postTop + 130], 44, 44, 4));
    K.add('Adjust knobs', F('#151617', .7), K.disc([0, 330, postTop + 170], 'z', 50, 22, 16), K.disc([34, 400, 700], 'x', 44, 20, 16));
    const hz = postTop + 138, bars: Vec3[] = [[0, 280, hz], [120, 280, hz], [205, 250, hz + 10], [230, 160, hz - 20], [236, 70, hz - 90]];
    for (const s of [-1, 1]) {
      const pts = bars.map(([x, y, z]) => [s * x, y, z] as Vec3);
      K.add('Handlebars', F('#1b1c1e', .55), K.pipe(pts, 26, 16));
      K.add('Handlebar foam', F('#141516', .85, 0, 'handle'), K.pipe(pts.slice(2), 32, 16));
    }
    const pm = (s: ReturnType<typeof K.pad>) => K.move(K.rotate(s, [-18, 0, 0]), [0, 520, postTop + 150]);
    K.add('Monitor arm', F('#18191b', .55), K.bar([0, 470, postTop + 130], [0, 520, postTop + 160], 36, 30, 4));
    K.add('Performance monitor', F('#161718', .5), pm(K.pad(176, 58, 196, 14, [0, 0, 0])));
    K.add('Monitor LCD', F('#9fb3a2', .3), pm(K.box([132, 4, 98], [0, -30, 118])));
    K.add('Fasteners', hw, K.disc([hw2 / 2 + 9, hub[1], hub[2]], 'x', 14, 4, 12), K.disc([-hw2 / 2 - 9, hub[1], hub[2]], 'x', 14, 4, 12));
  });
}
