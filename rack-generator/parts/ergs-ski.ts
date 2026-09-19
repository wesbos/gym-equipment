/** Concept2 SkiErg and Rogue Echo SKI: column, V arms and top pulley bar, flywheel at the foot of the column facing the user,
 * handles on cords, and the optional plywood floor stand. Build axes: X across, +Y from the user toward the column, Z up. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { withKit, type Finish, type Kit } from './ergs-kit.ts';
import { SKI_ERGS, skiMount, type SkiBrand } from '../floor-parts/ergs.ts';

const F = (color: string, roughness = .55, metalness = 0, role: Finish['role'] = 'source'): Finish => ({ role, color, roughness, metalness });
const LIME = '#c3d52c', WHITE = '#eeeeea';

interface SkiLook { frame: Finish; handle: string; cord: string; colW: number; colD: number; topD: number; split: number; fanD: number; fanT: number; fanZ: number; barW: number; slots: boolean }
const LOOK: Record<SkiBrand, SkiLook> = {
  // Concept2: 4.3 in wide column, tapering V arms, lime handles, 18 in housing (published 19 in wall-mount bottom width incl. clips).
  c2: { frame: F('#17181a', .55), handle: LIME, cord: '#d9dbd2', colW: 110, colD: 200, topD: 96, split: 1080, fanD: 462, fanT: 170, fanZ: 255, barW: 521, slots: false },
  // Rogue: wider slotted arms, "ROGUE" top bar, orange handles, fan with the ROGUE cover, turf wheels.
  echo: { frame: F('#2c2e31', .7), handle: '#e0512b', cord: '#d8d8d2', colW: 105, colD: 180, topD: 110, split: 1180, fanD: 420, fanT: 190, fanZ: 330, barW: 495, slots: true },
};

function build(K: Kit, brand: SkiBrand, p: NumericParams) {
  const lk = LOOK[brand], spec = SKI_ERGS[brand], m = skiMount(brand, p), H = spec.height;
  const rubber = F('#151617', .9, 0, 'liner'), hw: Finish = { role: 'fastener', color: '#2e3033', metalness: .8, roughness: .35, authored: true };
  const box = m.box, stand = m.stand;
  const base = stand ? 26 : 0, y0 = stand ? box.depth / 2 - (brand === 'echo' ? 120 : 55) - lk.colD : -box.depth / 2 + lk.fanT + (brand === 'echo' ? 8 : 5.5);
  const backY = y0 + lk.colD, cy = backY - lk.colD / 2;
  // ---- Column and V arms (front face flush, back face tapering up to the pulley bar).
  K.add('Frame', lk.frame, K.span([-lk.colW / 2, y0, base], [lk.colW / 2, backY, lk.split]));
  const armTop = H - 40, armX = lk.barW / 2 - 50;
  for (const s of [-1, 1]) {
    const arm = K.hull([K.box([lk.colW / 2 + 6, lk.topD, 2], [s * lk.colW / 4, y0 + lk.topD / 2, lk.split]), K.box([62, lk.topD, 2], [s * armX, y0 + lk.topD / 2, armTop])]);
    const at = (t: number): Vec3 => [s * (lk.colW / 4 + (armX - lk.colW / 4) * t), y0 + lk.topD / 2, lk.split + (armTop - lk.split) * t];
    const slots = lk.slots ? [K.hull([K.box([16, 400, 1], at(.3)), K.box([16, 400, 1], at(.72))])] : [];
    K.add('Frame', lk.frame, K.cut(arm, slots));
  }
  K.add('Frame', lk.frame, K.span([-lk.barW / 2 + 20, y0, armTop - 10], [lk.barW / 2 - 20, y0 + lk.topD, H - 6]));
  K.add('Pulley bar cap', F('#1b1c1e', .6), K.span([-lk.barW / 2 + 20, y0 - 2, H - 8], [lk.barW / 2 - 20, y0 + lk.topD + 2, H]));
  // Pulleys at the bar ends, cords down to the handles.
  const handleZ = brand === 'echo' ? H - 150 : 960, handleX = brand === 'echo' ? lk.barW / 2 - 40 : 78;
  for (const s of [-1, 1]) {
    K.add('Pulleys', F('#202123', .5, .3), K.disc([s * (lk.barW / 2 - 30), y0 - 14, H - 34], 'y', 50, 22, 24), K.span([s * (lk.barW / 2 - 20) - 20, y0 - 30, H - 60], [s * (lk.barW / 2 - 20) + 20, y0 + 10, H - 10]));
    const top: Vec3 = [s * (lk.barW / 2 - 36), y0 - 20, H - 45], grip: Vec3 = [s * handleX, y0 - 34, handleZ + 70];
    K.add('Cords', F(lk.cord, .7, 0, 'liner'), K.rod(top, grip, 5, 6));
    // Handle: tapered grip with a flared foot and a cord bulb on top.
    K.add('Handles', F(lk.handle, .6, 0, 'handle'), K.cone([grip[0], grip[1], grip[2]], [grip[0], grip[1], grip[2] - 150], 26, 34, 18), K.cone([grip[0], grip[1], grip[2] - 150], [grip[0] + s * 30, grip[1], grip[2] - 190], 34, 22, 14), K.sphere(grip, 32, 14));
  }
  if (brand === 'c2') for (const s of [-1, 1]) K.add('Handle holders', F('#1a1b1d', .6), K.span([s * 50, y0 - 20, 880], [s * 104, y0, 900]));
  // ---- Flywheel housing at the foot of the column, face toward the user.
  const fz = base + lk.fanZ, fy = y0 - lk.fanT / 2, R = lk.fanD / 2;
  K.add('Flywheel housing', F('#141517', .6), K.disc([0, fy - lk.fanT / 2 + 12, fz], 'y', lk.fanD, 24, 64), K.disc([0, fy + lk.fanT / 2 - 12, fz], 'y', lk.fanD, 24, 64));
  K.add('Flywheel drum mesh', F('#5e6266', .5, .5), K.disc([0, fy, fz], 'y', lk.fanD - 16, lk.fanT - 40, 64));
  for (const a of [40, 140, 220, 320]) { const x = (R - 12) * Math.cos(a * Math.PI / 180), z = fz + (R - 12) * Math.sin(a * Math.PI / 180);
    K.add('Flywheel housing', F('#141517', .6), K.hull([K.sphere([x, fy - lk.fanT / 2 + 20, z], 26, 10), K.sphere([x, fy + lk.fanT / 2 - 20, z], 26, 10)])); }
  const face = fy - lk.fanT / 2;
  K.add('Damper grille recess', F('#2b2d30', .7), K.disc([0, face + 3, fz], 'y', lk.fanD - 150, 8, 48));
  const grille: Manifold[] = [];
  if (brand === 'c2') {
    for (let i = 0; i < 6; i++) grille.push(K.hoop([0, face - 1, fz], 'y', 64 + i * 46, 5, 40, 6));
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; grille.push(K.rod([30 * Math.cos(t), face - 1, fz + 30 * Math.sin(t)], [150 * Math.cos(t), face - 1, fz + 150 * Math.sin(t)], 5, 6)); }
    K.add('Decal · lime', F(LIME, .5), K.disc([0, face - 5, fz], 'y', 32, 1, 24));
  } else {
    for (let i = 0; i < 9; i++) grille.push(K.hoop([0, face - 1, fz], 'y', 40 + i * 28, 4, 40, 6));
    K.add('Fan cover', F('#1c1d1f', .5, .2), K.disc([0, face - 4, fz], 'y', 130, 6, 32));
    K.add('Badge · white', F(WHITE, .5), K.box([70, 1, 16], [0, face - 7.5, fz]));
  }
  K.add('Damper grille', F('#0c0c0d', .45, .1), ...grille);
  K.add('Flywheel housing', F('#141517', .6), K.span([-40, y0 - 10, fz - 60], [40, y0 + 1, fz + 60]));
  // ---- Monitor on the column front with its arm.
  const monZ = brand === 'echo' ? 1030 : 930;
  K.add('Monitor arm', F('#18191b', .55), K.bar([0, y0, monZ], [0, y0 - 80, monZ + 30], 40, 30, 4));
  const mw = brand === 'echo' ? 150 : 176, mh = brand === 'echo' ? 150 : 196;
  const place = (s: Manifold) => K.move(K.rotate(s, [-12, 0, 0]), [0, y0 - 110, monZ + 40]);
  K.add('Performance monitor', F('#161718', .5), place(K.pad(mw, 50, mh, 14, [0, 0, 0])));
  K.add('Monitor LCD', F(brand === 'echo' ? '#8fa38a' : '#9fb3a2', .3), place(K.box([mw - 44, 4, mh * .5], [0, -26, mh * .6])));
  // Model plates: white word on the arm (C2 lime mark) / ROGUE on the column sides and top bar.
  if (brand === 'c2') {
    K.add('Decal · lime', F(LIME, .5), K.span([lk.colW / 2 + 40, y0 + 20, 1500], [lk.colW / 2 + 41, y0 + 70, 1550]));
    K.add('Decal · white', F(WHITE, .5), K.bar([lk.colW / 2 + 55, y0 + 45, 1570], [lk.colW / 2 + 100, y0 + 45, 1900], 30, 1, 0, [0, 1, 0]));
  } else {
    for (const s of [-1, 1]) K.add('Badge · white', F(WHITE, .5), K.span([s * (lk.colW / 2) - .5 * s, cy - 36, 520], [s * (lk.colW / 2 + .8), cy + 36, 900]));
    K.add('Badge · white', F(WHITE, .5), K.span([-110, y0 - 2.5, H - 70], [110, y0 - 1, H - 22]));
  }
  // ---- Base: foot plate with transport wheels behind the column.
  const wheelD = brand === 'echo' ? 150 : 70, wheelX = brand === 'echo' ? box.width / 2 - 38 : 110;
  K.add('Frame', lk.frame, K.span([-lk.colW / 2 - 40, y0 - 30, base], [lk.colW / 2 + 40, backY + 20, base + 12]));
  for (const s of [-1, 1]) {
    const wh = K.wheel([s * wheelX, backY + wheelD / 2 - (brand === 'echo' ? 30 : 40), base + wheelD / 2 + (stand ? 4 : 0)], wheelD, brand === 'echo' ? 50 : 24, .45, 28);
    K.add('Transport wheels', rubber, wh.tyre); K.add('Wheel hubs', F('#5b5f63', .45, .4), wh.hub);
    K.add('Frame', lk.frame, K.span([s * (lk.colW / 2), backY - 60, base + 10], [s * (wheelX - (brand === 'echo' ? 26 : 13)), backY + wheelD / 2 - 20, base + wheelD / 2 + 20]));
  }
  if (!stand) {
    // Wall mount: bracket at the top of the column back and rubber feet on the floor.
    K.add('Wall bracket', F('#1b1c1e', .6), K.span([-lk.colW / 2 - 30, backY, H - 420], [lk.colW / 2 + 30, box.depth / 2, H - 300]));
    for (const s of [-1, 1]) K.add('Feet', rubber, K.span([s * (lk.colW / 2 + 20) - 18, y0 - 20, 0], [s * (lk.colW / 2 + 20) + 18, backY, 6]));
    return;
  }
  // ---- Floor stand: plywood platform (grip top, natural edges), U-shaped support tube to the column.
  const pw = stand.platform[0], pl = stand.platform[1], py0 = -box.depth / 2, py1 = py0 + pl;
  K.add('Platform plywood', F('#c9a26d', .7), K.pad(pw, pl, base - 3, 18, [0, (py0 + py1) / 2, 0]));
  K.add('Platform grip top', F('#1f2022', .95, 0, 'liner'), K.pad(pw - 2, pl - 2, 3, 17, [0, (py0 + py1) / 2, base - 3]));
  if (brand === 'echo') for (let i = 0; i < 6; i++) for (const s of [-1, 1]) K.add('Platform lines', F('#e6e6e2', .6), K.span([s * 30, py0 + 120 + i * 28, base], [s * 210, py0 + 128 + i * 28, base + .6]));
  if (brand === 'echo') K.add('Platform lines', F('#e6e6e2', .6), K.span([-3, py0 + 60, base], [3, py0 + 320, base + .6]));
  const ux = stand.tube / 2 - 16, uTop = stand.uTop, uy = y0 - 18, foot = py0 + stand.uFoot;
  K.add('Stand tube', F('#18191b', .5, .2), K.pipe([[-ux, foot, base + 8], [-ux, uy - 40, uTop - 30], [-ux + 40, uy, uTop], [ux - 40, uy, uTop], [ux, uy - 40, uTop - 30], [ux, foot, base + 8]], 32, 18));
  K.add('Stand tube', F('#18191b', .5, .2), K.span([-40, uy - 10, uTop - 30], [40, y0, uTop + 30]));
  for (const s of [-1, 1]) K.add('Fasteners', hw, K.span([s * ux - 12, foot - 25, base], [s * ux + 12, foot + 25, base + 5]));
}

export function buildSkiErg(api: ManifoldAPI, brand: SkiBrand, p: NumericParams): SolidPart[] {
  return withKit(api, brand === 'c2' ? 'Concept2 SkiErg' : 'Rogue Echo SKI', K => build(K, brand, p));
}
