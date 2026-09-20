/** Stand-alone cable towers, lat pulldowns and functional trainers: Manifold builders for the entries in ../floor-parts/cable-towers.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * Build frame: X across, Y from the user side (-Y) to the back, Z up. The kit recentres the finished XY bounding box on the origin. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { BOS_CABLE_TOWER, BOS_LAT_DIMS, MAJOR_B52, MAJOR_B52_COLORS, MAJOR_B52_DIMS, FORCE_FTR, FORCE_FTR_ARM_REACH, FORCE_FTR_DIMS, forceFtrWeights, REP_ADONIS, REP_ADONIS_DIMS, INSPIRE_FTX, INSPIRE_FTX_DIMS, inspireFtxWeights, REP_ARCADIA, REP_ARCADIA_DIMS, repArcadiaWeights, BOS_LAT_PULLDOWN, BOS_TOWER_DIMS, TITAN_LAT_DIMS, TITAN_LAT_TOWER, TITAN_PLATE_LAT, TITAN_PLATE_LAT_DIMS, TITAN_PULLEY_DIMS, TITAN_PULLEY_TOWER, TOG_FLIGHT_DIMS, TOG_MULTI_FLIGHT, bosTowerWeights, inch, ironPlates, pinIndex, togFlightWeights, type LatTowerDims } from '../floor-parts/cable-towers.ts';
import { MAT, mat, towerKit, type Mat, type TowerKit } from './cable-towers-kit.ts';
import { STRIPE, cableEnd, dHandle, latBar, swivelPulley, weightStack } from './cable-towers-components.ts';
const BLACK = mat('Black powder-coated steel', '#1b1c1e', .3, .5);
/** Handle strap hanging from a carabiner eye, shortened at low trolley positions so the grip rests just above the floor. */
function hangHandle(t: TowerKit, eye: Vec3, want: number) {
  dHandle(t, eye, Math.max(4, Math.min(want, eye[2] - 20)));
}
// ------------------------------------------------------------------------------------------------ Bells of Steel Cable Tower
const BOS_SILVER = mat('Silver powder-coated upright', '#aeb2b5', .65, .38);
export function buildBosCableTower(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = BOS_TOWER_DIMS, T = D.tube, H = D.height, PUL = MAT.alu;
  return t.finish('Bells of Steel Cable Tower', () => {
    const footH = 76, pad = 6, top = footH + pad, back = 700, yBackFoot = back - T / 2;
    // Feet: 3" × 2" sled feet with angled ends on rubber pads, front one under the upright, rear one at the wall.
    for (const y of [0, yBackFoot]) {
      const L = D.feet / 2, foot = t.prismXZ([[-L, pad], [L, pad], [L, pad + 8], [L - 85, top], [-L + 85, top], [-L, pad + 8]], y - T / 2, y + T / 2);
      const holes = Array.from({ length: 8 }, (_, i) => t.cyl('y', y - T, y + T, 16, [-L + 130 + i * ((2 * L - 260) / 7), 0, pad + footH / 2], 14));
      t.add(BLACK, t.cut(foot, [t.union(holes)]));
      for (const e of [-1, 1]) t.add(MAT.rubber, t.box([e > 0 ? L - 90 : -L, y - T / 2 - 4, 0], [e > 0 ? L : -L + 90, y + T / 2 + 4, pad]));
    }
    // Spine joining the feet (published 724 mm base), with the BELLS OF STEEL plate on its side.
    t.add(BLACK, t.box([-T / 2, T / 2, pad], [T / 2, yBackFoot - T / 2, top]));
    t.add(BLACK, t.box([-T / 2 - 3, T / 2 + 20, pad + 14], [-T / 2, T / 2 + 170, top - 14]));
    t.add(mat('White brand lettering', '#e6e6e2', 0, .6), t.label('BELLS OF STEEL', 140, 22, 1, [-T / 2 - 3, T / 2 + 95, pad + footH / 2], [0, -1, 0], [0, 0, 1]));
    // Silver main upright with 33 numbered carriage holes on 2" pitch, laser-etched numbers every fifth hole.
    const zTop = H - 15, headerZ0 = zTop - T;
    t.add(BLACK, t.box([-50, -50, top], [50, 50, top + 8]));
    t.add(BOS_SILVER, t.upright(0, 0, top + 8, headerZ0, T, T, { dia: 17, pitch: D.pitch, start: D.hole1, count: D.holes, faces: 'xy' }));
    for (let h = 5; h <= D.holes; h += 5) t.add(mat('Etched hole numbers', '#4a4d50', .3, .6), t.label(String(h), 9, 12, .5, [T / 2, -T / 2 - .5, D.hole1 + (h - 1) * D.pitch + 22], [1, 0, 0], [0, 0, 1]));
    // Top header back to the wall (or back upright), top pulley cheeks at the front.
    t.add(BLACK, t.cut(t.box([-T / 2, -T / 2, headerZ0], [T / 2, back, zTop]), [t.union(Array.from({ length: 13 }, (_, i) => t.cyl('x', -T, T, 17, [0, 40 + i * D.pitch, headerZ0 + T / 2], 14)))]));
    const pulleyZ = H - 50, cy = -50;
    for (const x of [-15, 15]) t.add(PUL, t.sheave([x, cy + 45, pulleyZ], 'x', 90, 20));
    for (const e of [-1, 1]) t.add(BLACK, t.hull([t.cyl('x', e * 27 - 3, e * 27 + 3, 100, [0, cy + 45, pulleyZ], 28), t.box([e * 27 - 3, -T / 2, headerZ0], [e * 27 + 3, 30, zTop])]));
    // Stack or plate-loaded carriage behind the upright, under the rear header.
    const stackY = p.loading === 2 ? 470 : 505, rodSep = 230;
    const topPulleyY = [stackY - rodSep / 2 + 40, stackY + 40];
    for (const y of topPulleyY) for (const x of [-15, 15]) t.add(PUL, t.sheave([x, y, headerZ0 - 50], 'x', 90, 20));
    for (const y of topPulleyY) for (const e of [-1, 1]) t.add(BLACK, t.box([e * 27 - 3, y - 52, headerZ0 - 100], [e * 27 + 3, y + 52, headerZ0]));
    let loadTop: number;
    if (p.loading === 2) {
      // Plate-loaded carriage riding both guide rods: twin sleeves, a loading horn across, resting on base bumpers.
      const rz = 390;
      for (const e of [-1, 1]) {
        t.add(MAT.chrome, t.cyl('z', top, headerZ0, 25, [0, stackY + e * rodSep / 2, 0], 20));
        t.add(BLACK, t.cyl('z', rz - 90, rz + 90, 50, [0, stackY + e * rodSep / 2, 0], 24));
        t.add(MAT.rubber, t.cyl('z', top, rz - 90, 40, [0, stackY + e * rodSep / 2, 0], 20));
      }
      t.add(BLACK, t.box([-25, stackY - rodSep / 2, rz - 60], [25, stackY + rodSep / 2, rz + 60]));
      t.add(BLACK, t.cyl('x', -70, 70, 60, [0, stackY, rz], 28));
      t.add(mat('Black loading horn sleeves', '#1f2022', .45, .45), t.cyl('x', -255, 255, 49, [0, stackY, rz], 32));
      for (const e of [-1, 1]) t.add(BLACK, t.cyl('x', e > 0 ? 70 : -80, e > 0 ? 80 : -70, 90, [0, stackY, rz], 32));
      t.add(PUL, t.sheave([0, stackY, rz + 150], 'x', 114, 22));
      t.add(BLACK, t.box([-18, stackY - 20, rz + 60], [18, stackY + 20, rz + 150]));
      const n = p.loaded, right = Math.ceil(n / 2), left = n - right;
      t.plates(ironPlates(right), [81, stackY, rz], [1, 0, 0]);
      t.plates(ironPlates(left), [-81, stackY, rz], [-1, 0, 0]);
      loadTop = rz + 150 + 57;
    } else {
      const weights = bosTowerWeights(p), mini = p.loading === 1;
      const pin = pinIndex(weights, p.pin);
      loadTop = weightStack(t, {
        x: 0, y: stackY, z0: top, w: 118, d: 290, t: 25.4, n: weights.length - 1, head: 50, face: '-x', gap: 2, rodSep, rodD: 25, rodTop: headerZ0, pin, bumper: 36,
        stripe: i => { const f = i / (weights.length - 1); return f <= (mini ? .5 : .35) ? STRIPE.green : f <= .7 ? STRIPE.yellow : STRIPE.red; },
      });
      // Floating Ø114 pulley on the head plate and the stack-top pulley cluster.
      t.add(PUL, t.sheave([0, stackY - 40, loadTop + 70], 'x', 114, 22));
      t.add(BLACK, t.box([-16, stackY - 70, loadTop], [16, stackY - 10, loadTop + 60]));
      for (const [y, z] of [[stackY - 190, loadTop + 110], [stackY - 150, loadTop + 45], [stackY - 110, loadTop + 110]] as const) t.add(PUL, t.sheave([0, y, z], 'x', 90, 20));
      t.add(BLACK, t.box([-16, stackY - 225, loadTop + 20], [16, stackY - 75, loadTop + 150]));
    }
    // Rear support: back upright, or the upper and lower wall L-brackets.
    if (p.upright) t.add(BLACK, t.upright(0, back - T / 2, top, headerZ0, T, T, { dia: 17, pitch: D.pitch, start: D.hole1, count: D.holes, faces: 'xy' }));
    else for (const [z0, z1] of [[headerZ0 - 230, zTop], [top + 20, top + 260]] as const) {
      t.add(BLACK, t.cut(t.box([-T / 2 - 45, back - 6, z0], [-T / 2, back, z1]), [t.hull([t.cyl('y', back - 8, back + 2, 14, [-T / 2 - 22, 0, z0 + 40], 12), t.cyl('y', back - 8, back + 2, 14, [-T / 2 - 22, 0, z1 - 60], 12)])]));
      t.add(BLACK, t.box([-T / 2 - 6, back - 60, z1 - 40], [-T / 2, back, z1]));
    }
    // Carriage at the selected hole: UHMW-lined sleeve, pop pin, front plate with two Ø90 pulleys and twin swivel pulleys.
    const zc = D.hole1 + (p.carriage - 1) * D.pitch;
    t.add(BLACK, t.cut(t.box([-40, -40, zc - 90], [40, 40, zc + 150]), [t.box([-T / 2 - 1, -T / 2 - 1, zc - 91], [T / 2 + 1, T / 2 + 1, zc + 151])]));
    t.add(MAT.uhmw, t.box([-T / 2 - 1, -T / 2 - 1, zc - 90], [-T / 2, T / 2 + 1, zc + 150]), t.box([T / 2, -T / 2 - 1, zc - 90], [T / 2 + 1, T / 2 + 1, zc + 150]));
    t.add(MAT.zinc, t.cyl('x', 40, 70, 12, [0, 0, zc], 12));
    t.add(mat('Black pop-pin knob', '#141516', .1, .5), t.cyl('x', 70, 100, 30, [0, 0, zc], 20));
    t.add(BLACK, t.box([-75, -46, zc - 110], [75, -40, zc + 170]));
    for (const [x, z] of [[-30, zc + 105], [30, zc + 30]] as const) t.add(PUL, t.sheave([x, -60, z], 'y', 90, 20));
    t.add(BLACK, t.box([-60, -110, zc + 48], [60, -46, zc + 60]));
    const eyes: Vec3[] = [];
    for (const x of [-38, 38]) eyes.push(swivelPulley(t, [x, -85, zc + 48], [0, -1, 0], 90, undefined, PUL));
    // Cables: carriage up to the top pulleys, back along the header, down to the stack / carriage.
    for (const x of [-15, 15]) {
      t.add(MAT.cable, t.cable([[x, cy, zc + 160], [x, cy, pulleyZ], [x, cy + 45, pulleyZ + 45], [x, topPulleyY[0], headerZ0 - 5], [x, topPulleyY[0] - 45, headerZ0 - 50], [x, topPulleyY[0] - 45, loadTop + 60]]));
      t.add(MAT.cable, t.cable([[x, topPulleyY[1] + 45, headerZ0 - 50], [x, topPulleyY[1] + 45, loadTop + 40]]));
    }
    for (const eye of eyes) hangHandle(t, cableEnd(t, eye), 420);
  });
}
// ------------------------------------------------------------------------------------------------ Temple of Gainz Multi-Flight V3
export function buildTogMultiFlight(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = TOG_FLIGHT_DIMS, H = D.height;
  const F = mat('Matte black powder-coated steel', '#1c1d1f', .25, .6), W = mat('White laser-cut dial numbering', '#e7e7e3', .1, .5);
  return t.finish('Temple of Gainz Multi-Flight V3', () => {
    const px = 275, pw = 76, pd = 102, baseH = 60, yR = 183, yF = -473, fx = D.frontBase / 2 - 50;
    // Base: rear cross tube (28.7"), side rails under the posts, front feet splayed to the 44.7" front base.
    t.add(F, t.box([-D.rearBase / 2, yR - 60, 8], [D.rearBase / 2, yR, baseH]));
    for (const e of [-1, 1]) {
      t.add(F, t.box([e * px - pw / 2, 0, 8], [e * px + pw / 2, yR - 60, baseH]));
      t.add(F, t.beam([e * px, 30, (baseH + 8) / 2], [e * fx, yF + 45, (baseH + 8) / 2], pw, baseH - 8));
      t.add(F, t.rbox([e * fx, yF + 45], 95, 90, 8, 18, 6));
      for (const [x, y] of [[e * fx, yF + 45], [e * (D.rearBase / 2 - 45), yR - 30]] as const) t.add(MAT.rubber, t.rbox([x, y], 100, 90, 0, 8, 6));
    }
    // Twin posts, the top cap and its front gussets.
    for (const e of [-1, 1]) {
      t.add(F, t.box([e * px - pw / 2, 0, baseH], [e * px + pw / 2, pd, H - 16]));
      t.add(F, t.prismYZ([[0, H - 16], [-125, H - 16], [0, H - 190]], e * px - 5, e * px + 5));
    }
    t.add(F, t.box([-px - 50, -130, H - 16], [px + 50, pd + 20, H]));
    // Stack support and front cross members.
    t.add(F, t.box([-px, 0, 400], [px, pd, 440]));
    t.add(F, t.box([-px, -60, 780], [px, -30, 810]));
    // Chrome guide rods for the sliding assembly.
    for (const e of [-1, 1]) t.add(MAT.chrome, t.cyl('z', 780, H - 16, 32, [e * px, -45, 0], 24));
    // 220 lb stack (11 lb head + 19 plates) centred between the posts, labels to the front.
    const pin = pinIndex(togFlightWeights, p.pin);
    const stackTop = weightStack(t, {
      x: 0, y: pd / 2, z0: 440, w: 400, d: 110, t: 14, n: togFlightWeights.length - 1, head: 32, face: '-y', rodSep: 230, rodD: 22, rodTop: H - 190, rodAxis: 'x', pin, bumper: 0, labelW: 70,
      stripe: i => i <= 6 ? STRIPE.green : i <= 12 ? STRIPE.yellow : STRIPE.red,
    });
    // Shrouds: arched front panel behind the rods and the rear logo shroud.
    t.add(F, t.union([t.box([-200, -12, stackTop + 10], [200, -6, 1000]), t.cyl('y', -12, -6, 400, [0, 0, 960], 48)].map(s => t.meet(s, t.box([-200, -13, stackTop + 10], [200, -5, 1060])))));
    t.add(F, t.box([-225, pd + 4, 440], [225, pd + 10, 1080]));
    t.add(mat('Dark grey shroud logo', '#3b3c3f', .2, .5), t.label('TEMPLE OF', 300, 40, 1, [0, pd + 10, 820], [-1, 0, 0], [0, 0, 1]), t.label('GAINZ', 300, 70, 1, [0, pd + 10, 740], [-1, 0, 0], [0, 0, 1]));
    // Header placard with the exercise chart.
    t.add(F, t.union([t.box([-215, -8, H - 200], [215, -2, H - 60]), t.cyl('y', -8, -2, 120, [-155, 0, H - 80], 32), t.cyl('y', -8, -2, 120, [155, 0, H - 80], 32), t.box([-155, -8, H - 140], [155, -2, H - 20])]));
    t.add(W, t.label('THE DELTOID VARIANT MULTI-FLIGHT', 300, 16, .8, [30, -8.6, H - 50], [1, 0, 0], [0, 0, 1]));
    t.add(W, t.label('TEMPLE OF', 80, 12, .8, [-160, -8.6, H - 110], [1, 0, 0], [0, 0, 1]), t.label('GAINZ', 80, 18, .8, [-160, -8.6, H - 135], [1, 0, 0], [0, 0, 1]));
    for (let i = 0; i < 5; i++) t.add(mat('Exercise chart panels', '#8e9194', .1, .5), t.box([-95 + i * 58, -8.8, H - 180], [-55 + i * 58, -8, H - 75]));
    // 30-position numbered strip on the right post.
    const posZ = (i: number) => 1690 - (i - 1) * inch(1), zp = posZ(p.carriage), zc = zp + 60;
    t.add(W, t.box([px + pw / 2, 14, posZ(30) - 30], [px + pw / 2 + 2, 88, posZ(1) + 30]));
    for (let i = 1; i <= D.positions; i++) {
      t.add(F, t.cyl('x', px + pw / 2, px + pw / 2 + 3, 9, [0, 66, posZ(i)], 10));
      t.add(F, t.label(String(i), 14, 11, .8, [px + pw / 2 + 2, 34, posZ(i)], [0, 1, 0], [0, 0, 1]));
    }
    // Sliding assembly: rod sleeves, back plate, lobed "bowtie" plate and the twin dial cams.
    for (const e of [-1, 1]) t.add(F, t.cyl('z', zc - 210, zc + 110, 56, [e * px, -45, 0], 28));
    t.add(F, t.box([-px, -80, zc - 160], [px, -60, zc + 70]));
    t.add(F, t.hull([t.cyl('y', -100, -86, 150, [-175, 0, zc - 205], 32), t.cyl('y', -100, -86, 150, [175, 0, zc - 205], 32), t.box([-60, -100, zc - 300], [60, -86, zc - 150])]));
    t.add(mat('Silver brand plate', '#b9bcbf', .8, .3), t.box([-60, -102, zc - 232], [60, -100, zc - 208]));
    t.add(F, t.label('TEMPLE OF GAINZ', 100, 12, .6, [0, -102.4, zc - 220], [1, 0, 0], [0, 0, 1]));
    for (const e of [-1, 1]) {
      const cx = e * 152;
      t.add(F, t.cyl('y', -84, -62, 260, [cx, 0, zc], 48));
      t.add(F, t.cyl('y', -122, -100, 300, [cx, 0, zc], 64));
      t.add(mat('White dial rings', '#e7e7e3', .1, .5), t.cut(t.cyl('y', -123.5, -121, 296, [cx, 0, zc], 64), [t.cyl('y', -125, -119, 236, [cx, 0, zc], 64)]));
      for (let a = 0; a < 24; a++) { const r = 134, th = a * Math.PI / 12; t.add(F, t.cyl('y', -124.2, -123, 7, [cx + r * Math.cos(th), 0, zc + r * Math.sin(th)], 8)); }
      t.add(MAT.chrome, t.cyl('y', -140, -122, 62, [cx, 0, zc], 32));
      // Movement arm: drops from the cam hub, then the angled foam-gripped handle forward and down.
      const hub: Vec3 = [cx, -150, zc], elbow: Vec3 = [cx, -150, zc - 380], tip: Vec3 = [cx + e * 25, -150 - 240, zc - 380 - 200];
      t.add(F, t.rod([cx, -140, zc], hub, 44, 20), t.rod(hub, elbow, 38, 20), t.rod(elbow, tip, 34, 20));
      const g0: Vec3 = [elbow[0] + (tip[0] - elbow[0]) * .22, elbow[1] + (tip[1] - elbow[1]) * .22, elbow[2] + (tip[2] - elbow[2]) * .22];
      t.add(MAT.foam, t.rod(g0, tip, 42, 24));
      const cap: Vec3 = [tip[0] + (tip[0] - elbow[0]) * .04, tip[1] + (tip[1] - elbow[1]) * .04, tip[2] + (tip[2] - elbow[2]) * .04];
      t.add(MAT.chrome, t.rod(tip, cap, 44, 24));
    }
    // Sliding-assembly pop pin into the numbered strip, and the gas-spring height assist.
    t.add(F, t.box([px - 30, -70, zp - 12], [px + pw / 2 + 30, -50, zp + 12]), t.box([px + pw / 2 + 12, -50, zp - 12], [px + pw / 2 + 30, 66, zp + 12]));
    t.add(W, t.cyl('x', px + pw / 2 + 30, px + pw / 2 + 58, 36, [0, 66, zp], 24));
    t.add(F, t.cyl('z', 470, 900, 34, [px + pw / 2 + 22, -12, 0], 20));
    t.add(MAT.chrome, t.cyl('z', 900, zc - 160, 14, [px + pw / 2 + 22, -12, 0], 12));
    // Head pad on its stalk (three angles, or removed).
    if (p.headPad) {
      // The stalk telescopes down at the top sliding positions so the pad stays under the top cap.
      const th = (20 + 20 * p.headPad) * Math.PI / 180, pz = Math.min(zc + 240, H - 90 - 230 * Math.sin(th) - 50);
      const P0: Vec3 = [0, -150, pz], P1: Vec3 = [0, -150 - 230 * Math.cos(th), pz + 230 * Math.sin(th)];
      t.add(F, t.rod([0, -90, zc + 70], [0, -150, Math.min(zc + 200, pz - 10)], 36, 16), t.rod([0, -150, Math.min(zc + 200, pz - 10)], P0, 36, 16));
      t.add(MAT.vinyl, t.beam(P0, P1, 200, 90, [0, Math.sin(th), Math.cos(th)]));
    }
    // Pulleys and cables: cams down to the lower pulley bank, up the back over the top pulleys to the stack head.
    const PUL = MAT.nylon;
    for (const x of [-140, -60, 60, 140]) t.add(PUL, t.sheave([x, -40, 250], 'y', 90, 20));
    t.add(F, t.box([-180, -28, 190], [180, -20, 300]));
    for (const x of [-60, 60]) { t.add(PUL, t.sheave([x, pd + 55, H - 100], 'x', 110, 20)); t.add(PUL, t.sheave([x, pd + 55, 180], 'x', 110, 20)); }
    for (const e of [-1, 1]) t.add(F, t.box([e * 88 - 4, pd + 10, H - 170], [e * 88 + 4, pd + 115, H - 16]));
    for (const e of [-1, 1]) {
      t.add(MAT.cable, t.cable([[e * 152, -95, zc - 130], [e * 140, -40, 295]]));
      t.add(MAT.cable, t.cable([[e * 60, pd + 110, H - 100], [e * 60, pd + 110, 180]]));
      t.add(MAT.cable, t.cable([[e * 60, pd, H - 100], [e * 20, pd / 2, stackTop + 40]]));
    }
  });
}
// ------------------------------------------------------------------------------------------------ Lat towers (Titan, Bells of Steel)
interface LatStyle {
  label: string; D: LatTowerDims; frame: Mat; pulley: Mat; pinKnob: string; stripe: (i: number, n: number) => string;
  /** Titan: TITAN letters on the arm side plates, twin foam thigh rollers, arm hook. Bells of Steel: embossed seat box, square knee pads. */
  brand: 'titan' | 'bos';
}
const labelMat = mat('Brand lettering', '#4d5054', .4, .45);
function buildLatTower(api: ManifoldAPI, p: NumericParams, S: LatStyle): SolidPart[] {
  const t = towerKit(api), D = S.D, T = D.tube, H = D.height, F = S.frame, cc = D.cc, back = cc + T / 2, front = back - D.length;
  return t.finish(S.label, () => {
    const armH = S.brand === 'bos' ? 150 : 120, frameTop = H - armH, crossZ = 110;
    // Uprights (front at y = 0, rear at y = cc) with 1" holes on 2" centres, top and bottom frame members.
    for (const y of [0, cc]) t.add(F, t.upright(0, y, 8, frameTop, T, T, { dia: 25.4, pitch: inch(2), start: 250, count: 36, faces: 'xy', seg: 14 }));
    t.add(F, t.box([-T / 2, -T / 2, frameTop - T], [T / 2, back, frameTop]));
    t.add(F, t.box([-T / 2, T / 2, crossZ], [T / 2, cc - T / 2, crossZ + T]));
    t.add(F, t.box([-80, -80, 0], [80, 80, 8]));
    // Rear foot across the machine (published base width), angled ends on rubber pads.
    const L = D.baseWidth / 2;
    t.add(F, t.cut(t.prismXZ([[-L, 8], [L, 8], [L, 26], [L - 70, T + 8], [-L + 70, T + 8], [-L, 26]], cc - T / 2, cc + T / 2), [t.union(Array.from({ length: 6 }, (_, i) => t.cyl('y', cc - T, cc + T, 22, [(i < 3 ? -1 : 1) * (130 + (i % 3) * inch(2)), 0, 8 + T / 2], 14)))]));
    for (const e of [-1, 1]) t.add(MAT.rubber, t.box([e > 0 ? L - 80 : -L, cc - T / 2, 0], [e > 0 ? L : -L + 80, cc + T / 2, 8]));
    // Lat arm: two side plates, taller over the frame, reaching forward over the seat; bolts along both faces.
    const armFront = -D.armReach - 70;
    const plate = t.prismYZ([[armFront, H - armH + 30], [armFront, H], [back, H], [back, H - armH], [cc * .35, H - armH], [0, H - armH + 30]], 0, 10);
    for (const e of [-1, 1]) {
      t.add(F, t.move(plate, [e > 0 ? 22 : -32, 0, 0]));
      for (let y = armFront + 40; y < back - 20; y += 120) t.add(MAT.zinc, t.cyl('x', e > 0 ? 32 : -38, e > 0 ? 38 : -32, 16, [0, y, H - 40], 12));
    }
    t.add(F, t.box([-22, cc * .35, H - 12], [22, back, H]));
    if (S.brand === 'titan') {
      for (const e of [-1, 1]) t.add(labelMat, t.label('TITAN', 190, 44, 1.5, [e * 32, (cc * .35 + back) / 2 + 20, H - 62], [0, e, 0], [0, 0, 1]));
      // J-hook at the arm tip for parking the bar.
      t.add(F, t.box([-6, armFront - 50, H - 55], [6, armFront, H - 40]), t.box([-6, armFront - 50, H - 55], [6, armFront - 38, H + 0]));
    }
    // Pulleys: arm tip, frame-top pair over the stack, figure-8 floating pair, bottom pulley and seat-box low-row pulley.
    const stackY = cc / 2, tipZ = H - 62;
    t.add(S.pulley, t.sheave([0, -D.armReach, tipZ], 'x', 114, 22), t.sheave([0, stackY + 40, frameTop - 120], 'x', 114, 22));
    t.add(S.pulley, t.sheave([0, 150, 1360], 'x', 100, 20), t.sheave([0, 150, 1470], 'x', 100, 20));
    t.add(F, t.hull([t.cyl('x', 13, 17, 116, [0, 150, 1360], 28), t.cyl('x', 13, 17, 116, [0, 150, 1470], 28)]), t.hull([t.cyl('x', -17, -13, 116, [0, 150, 1360], 28), t.cyl('x', -17, -13, 116, [0, 150, 1470], 28)]));
    t.add(S.pulley, t.sheave([0, 70, 130], 'x', 100, 20));
    // Stack (or plate-loaded carriage) between the uprights.
    let headTop: number;
    if (p.loading === 1) {
      const rz = 360, rodSep = 330;
      for (const e of [-1, 1]) {
        t.add(MAT.chrome, t.cyl('z', crossZ + T, frameTop - T, 25, [0, stackY + e * rodSep / 2, 0], 20));
        t.add(F, t.cyl('z', rz - 80, rz + 80, 52, [0, stackY + e * rodSep / 2, 0], 24));
        t.add(MAT.rubber, t.cyl('z', crossZ + T, rz - 80, 40, [0, stackY + e * rodSep / 2, 0], 20));
      }
      t.add(F, t.box([-26, stackY - rodSep / 2, rz - 50], [26, stackY + rodSep / 2, rz + 50]));
      t.add(F, t.cyl('x', -60, 60, 60, [0, stackY, rz], 28));
      t.add(mat('Black loading horn sleeves', '#1f2022', .45, .45), t.cyl('x', -280, 280, 49, [0, stackY, rz], 32));
      for (const e of [-1, 1]) t.add(F, t.cyl('x', e > 0 ? 60 : -70, e > 0 ? 70 : -60, 90, [0, stackY, rz], 32));
      const right = Math.ceil(p.loaded / 2);
      t.plates(ironPlates(right), [71, stackY, rz], [1, 0, 0]);
      t.plates(ironPlates(p.loaded - right), [-71, stackY, rz], [-1, 0, 0]);
      headTop = rz + 80;
    } else {
      const pin = pinIndex(D.stack, p.pin), n = D.stack.length - 1;
      headTop = weightStack(t, { x: 0, y: stackY, z0: crossZ + T, w: 110, d: 250, t: 22, gap: 1.6, n, head: 45, face: '+x', rodSep: 200, rodD: 25, rodTop: frameTop - T, pin, bumper: 35, stripe: i => S.stripe(i, n), pinKnob: S.pinKnob, labelW: 120 });
    }
    // Seat box bolted to the front upright, seat pad, thigh pads on their post, footplate on its extension tube.
    const sb0 = -T / 2, sb1 = -D.seatBox, boxTop = D.seatTop - 85;
    t.add(F, t.cut(t.box([-125, sb1, 40], [125, sb0, boxTop]), [t.box([-119, sb1 + 6, 34], [119, sb0 - 6, boxTop - 6])]));
    for (const y of [sb1 + 60, sb0 - 60]) t.add(F, t.box([-140, y - 50, 0], [140, y + 50, 40]));
    for (const e of [-1, 1]) for (let i = 0; i < 4; i++) t.add(MAT.zinc, t.cyl('x', e > 0 ? 125 : -128, e > 0 ? 128 : -125, 18, [0, sb1 + 60 + i * ((sb0 - sb1 - 120) / 3), boxTop - 40], 12));
    if (S.brand === 'bos') t.add(labelMat, t.label('BELLS OF STEEL', 320, 34, 1.5, [-126, (sb0 + sb1) / 2 - 20, (boxTop + 40) / 2 - 20], [0, -1, 0], [0, 0, 1]));
    const seatY0 = sb1 + 20, seatY1 = sb0 - 150;
    t.add(F, t.box([-150, seatY0, boxTop], [150, seatY1, boxTop + 12]));
    t.add(MAT.vinyl, t.pad([0, (seatY0 + seatY1) / 2], 330, seatY1 - seatY0, boxTop + 12, D.seatTop, 30));
    const thighZ = D.thigh0 + (p.thigh - 1) * D.thighStep, postY = sb0 - 80;
    t.add(F, t.box([-30, postY - 30, boxTop], [30, postY + 30, boxTop + 150]), t.box([-25, postY - 25, boxTop + 100], [25, postY + 25, thighZ - 20]));
    t.add(MAT.zinc, t.cyl('x', 30, 70, 14, [0, postY, boxTop + 110], 12));
    t.add(mat('Pop-pin knob', S.pinKnob, .2, .45), t.cyl('x', 70, 95, 28, [0, postY, boxTop + 110], 20));
    if (S.brand === 'titan') {
      t.add(F, t.cyl('x', -270, 270, 30, [0, postY, thighZ], 20));
      for (const e of [-1, 1]) { t.add(MAT.vinyl, t.roller('x', e > 0 ? 35 : -265, e > 0 ? 265 : -35, 110, [0, postY, thighZ])); t.add(MAT.zinc, t.cyl('x', e > 0 ? 265 : -270, e > 0 ? 270 : -265, 50, [0, postY, thighZ], 20)); }
    } else {
      t.add(F, t.box([-170, postY - 25, thighZ - 20], [170, postY + 25, thighZ + 5]));
      for (const e of [-1, 1]) t.add(MAT.vinyl, t.pad([e * 95, postY], 150, 150, thighZ + 5, thighZ + 75, 25));
    }
    const fpY = front + 10, fpW = inch(17), fpH = inch(9);
    t.add(F, t.box([-T / 2, fpY, 50], [T / 2, sb1, 50 + 50]));
    t.add(F, t.box([-fpW / 2 - 10, fpY, 0], [fpW / 2 + 10, fpY + 120, 10]));
    const fp = t.prismXZ([[-fpW / 2, 10], [fpW / 2, 10], [fpW / 2, fpH + 10], [fpW * .18, fpH + 10], [0, fpH * .45 + 10], [-fpW * .18, fpH + 10], [-fpW / 2, fpH + 10]], fpY - 10, fpY);
    t.add(MAT.tread, fp);
    t.add(S.pulley, t.sheave([0, sb1 - 15, 250], 'x', 100, 20));
    t.add(F, t.box([-18, sb1 - 60, 200], [-14, sb1, 300]), t.box([14, sb1 - 60, 200], [18, sb1, 300]));
    // Cables: stack head up over the frame-top pulley, forward through the arm, down to the bar; low row through the seat box.
    t.add(MAT.cable, t.cable([[0, stackY - 17, headTop + 30], [0, stackY - 17, frameTop - 120], [0, stackY + 40, frameTop - 63], [0, -D.armReach, tipZ + 57], [0, -D.armReach - 57, tipZ], [0, -D.armReach - 57, tipZ - 160]]));
    t.add(MAT.cable, t.cable([[0, 100, 1360], [0, 20, 130], [0, sb1 + 40, 200], [0, sb1 - 15, 200], [0, sb1 - 65, 250]]));
    t.add(MAT.cable, t.cable([[0, 200, 1470], [0, 200, frameTop - T]]));
    // Lat bar on its swivel and chain, and the low-row cable end resting on the footplate.
    const eye = cableEnd(t, [0, -D.armReach - 57, tipZ - 160], 200);
    latBar(t, eye, D.latBar, S.brand === 'titan' ? 250 : 230, S.brand === 'titan' ? 110 : 90, 25.4, MAT.stainless, MAT.grip);
    cableEnd(t, [0, sb1 - 65, 250], 90);
  });
}
const TITAN_RED = mat('Red anodized aluminium pulleys', '#b3262d', .75, .35);
export const buildTitanLatTower = (api: ManifoldAPI, p: NumericParams) => buildLatTower(api, { ...p, loading: 0 }, {
  label: 'Titan Lat Tower', D: TITAN_LAT_DIMS, frame: BLACK, pulley: TITAN_RED, pinKnob: '#c1272d', brand: 'titan',
  stripe: (i, n) => i <= n * .33 ? STRIPE.teal : i <= n * .66 ? STRIPE.yellow : STRIPE.red,
});
export const buildBosLatPulldown = (api: ManifoldAPI, p: NumericParams) => buildLatTower(api, p, {
  label: 'Bells of Steel Lat Pulldown', D: BOS_LAT_DIMS, frame: BLACK, pulley: MAT.alu, pinKnob: '#1b1c1e', brand: 'bos',
  stripe: (i, n) => i <= n * .23 ? STRIPE.green : i <= n * .45 ? STRIPE.yellow : STRIPE.red,
});
// ------------------------------------------------------------------------------------------------ Titan Plate-Loaded Lat Pull Down
export function buildTitanPlateLat(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = TITAN_PLATE_LAT_DIMS, H = D.height, F = BLACK, PUL = MAT.nylon;
  return t.finish('Titan Plate-Loaded Lat Pull Down', () => {
    const back = D.rearFace, yR = back - 25, front = back - D.length, yFoot = front + 25, tw = 50, td = 75;
    // T base: 1100 mm rear guide-frame tube, the long base frame forward to the foot frame with twin footplates.
    t.add(F, t.box([-D.rearTube / 2 + 3, yR - 25, 8], [D.rearTube / 2 - 3, yR + 25, 58]));
    for (const e of [-1, 1]) t.add(MAT.rubber, t.box([e > 0 ? D.rearTube / 2 - 3 : -D.rearTube / 2, yR - 25, 0], [e > 0 ? D.rearTube / 2 : -D.rearTube / 2 + 3, yR + 25, 58]), t.box([e * (D.rearTube / 2 - 70) - 40, yR - 25, 0], [e * (D.rearTube / 2 - 70) + 40, yR + 25, 8]));
    t.add(F, t.box([-tw / 2, yFoot + 25, 8], [tw / 2, yR - 25, 8 + td]));
    t.add(F, t.box([-260, yFoot - 25, 8], [260, yFoot + 25, 58]));
    for (const e of [-1, 1]) t.add(MAT.rubber, t.box([e * 230 - 30, yFoot - 25, 0], [e * 230 + 30, yFoot + 25, 8]));
    for (const e of [-1, 1]) {
      const x = e * 95;
      t.add(F, t.box([x - 8, yFoot - 20, 58], [x + 8, yFoot + 20, 90]));
      t.add(MAT.tread, t.hull([t.rbox([x, yFoot + 5], 115, 10, 70, 80, 4), t.move(t.rotate(t.rbox([0, 0], 115, 10, 0, 1, 4), [-15, 0, 0]), [x, yFoot + 5 + 70, 330])]));
    }
    // Upright (support frame) with the TITAN strip, top beam forward to the bar hook.
    const top = H - td;
    t.add(F, t.box([-tw / 2, -td / 2, 8 + td], [tw / 2, td / 2, top]));
    t.add(mat('TITAN decal', '#d8d8d4', .1, .5), t.box([-tw / 2 - .8, -td / 2 + 10, 1150], [-tw / 2, -td / 2 + 30, 1330]));
    t.add(mat('Red decal mark', '#c1272d', .1, .5), t.box([-tw / 2 - 1, -td / 2 + 12, 1130], [-tw / 2, -td / 2 + 28, 1146]));
    t.add(F, t.label('TITAN', 170, 16, .6, [-tw / 2 - .8, -td / 2 + 20, 1240], [0, 0, 1], [0, 1, 0]));
    const beamFront = -600, beamBack = yR - 10;
    t.add(F, t.box([-tw / 2, beamFront, top], [tw / 2, beamBack, H]));
    t.add(F, t.box([-tw / 2 - 6, -60, top - 30], [tw / 2 + 6, 60, H]));
    t.add(F, t.box([-6, beamFront - 45, H - 20], [6, beamFront, H]), t.box([-6, beamFront - 45, H - 20], [6, beamFront - 33, H + 0]));
    // Guide rods and the plate holder with its 13" horn to the left, resting on the big rubber cushions.
    const carY = D.hornY, rodA = carY - 65, rodB = carY + 65, hz = 330;
    for (const y of [rodA, rodB]) {
      t.add(MAT.chrome, t.cyl('z', 58, top, 25, [0, y, 0], 20));
      t.add(F, t.cyl('z', 8, 58, 60, [0, y, 0], 24));
      t.add(MAT.rubber, t.cyl('z', 58, hz - 70, 55, [0, y, 0], 24));
      t.add(F, t.cyl('z', hz - 70, hz + 70, 45, [0, y, 0], 24));
    }
    t.add(F, t.box([-30, rodA, hz - 40], [30, rodB, hz + 40]));
    t.add(F, t.cyl('x', -110, 90, 60, [0, carY, hz], 28));
    t.add(F, t.cyl('x', -120, -110, 95, [0, carY, hz], 28));
    t.add(mat('Black loading sleeve', '#1f2022', .45, .45), t.cyl('x', -120 - D.sleeve, -120, 49, [0, carY, hz], 32));
    t.add(MAT.rubber, t.cyl('x', -130 - D.sleeve, -120 - D.sleeve, 52, [0, carY, hz], 24), t.cyl('x', 90, 100, 64, [0, carY, hz], 24));
    t.plates(ironPlates(p.loaded), [-121, carY, hz], [-1, 0, 0]);
    // Seat on the seat-cushion frame with its diagonal brace, thigh foams on the adjustable tube.
    const seatY = -330, seatTop = 500;
    t.add(F, t.box([-tw / 2, -td / 2 - 360, seatTop - 110], [tw / 2, -td / 2, seatTop - 70]), t.box([-tw / 2, seatY - 25, 8 + td], [tw / 2, seatY + 25, seatTop - 70]));
    t.add(F, t.beam([0, -td / 2 - 10, 420], [0, -700, 8 + td], tw, 40));
    t.add(F, t.box([-150, seatY - 140, seatTop - 72], [150, seatY + 140, seatTop - 60]));
    t.add(MAT.vinyl, t.pad([0, seatY], 300, 280, seatTop - 60, seatTop, 40));
    const thighZ = 660 + (p.thigh - 1) * inch(1.5), ty = -td / 2 - 70;
    t.add(F, t.box([-22, ty - 22, seatTop - 110], [22, ty + 22, thighZ]));
    t.add(MAT.zinc, t.cyl('x', 22, 55, 12, [0, ty, seatTop + 40], 12));
    t.add(mat('Black knob', '#141516', .1, .5), t.cyl('x', 55, 75, 38, [0, ty, seatTop + 40], 20));
    t.add(MAT.chrome, t.cyl('x', -200, 200, 26, [0, ty, thighZ], 20));
    for (const e of [-1, 1]) t.add(MAT.vinyl, t.roller('x', e > 0 ? 18 : -198, e > 0 ? 198 : -18, 100, [0, ty, thighZ]));
    // Pulleys (Φ95): beam front and rear, figure-8 floating pair, base and low-row pulleys; cables and handles.
    const tipZ = top - 50, tipY = beamFront + 60;
    t.add(PUL, t.sheave([0, tipY, tipZ], 'x', D.pulley, 22), t.sheave([0, carY, top - 50], 'x', D.pulley, 22));
    t.add(PUL, t.sheave([0, 55, 1300], 'x', D.pulley, 22), t.sheave([0, 55, 1400], 'x', D.pulley, 22));
    for (const e of [-1, 1]) t.add(F, t.hull([t.cyl('x', e * 14 - 2, e * 14 + 2, 60, [0, 55, 1300], 20), t.cyl('x', e * 14 - 2, e * 14 + 2, 60, [0, 55, 1400], 20)]));
    t.add(PUL, t.sheave([0, 55, 140], 'x', D.pulley, 22), t.sheave([0, -900, 130], 'x', D.pulley, 22));
    t.add(MAT.cable, t.cable([[0, carY - 48, hz + 40], [0, carY - 48, top - 50]]), t.cable([[0, carY, top - 2], [0, tipY, tipZ + 48], [0, tipY - 48, tipZ], [0, tipY - 48, tipZ - 140]]));
    t.add(MAT.cable, t.cable([[0, 7, 1300], [0, 7, 140]]), t.cable([[0, 55, 92], [0, -900, 82], [0, -948, 130], [0, -948, 200]]));
    const eye = cableEnd(t, [0, tipY - 48, tipZ - 140], 120);
    latBar(t, eye, D.latBar, 160, 110, 25.4, F, MAT.foam);
    // Low-row: short chain from the front pulley to the 15" handle resting behind the footplates.
    t.add(MAT.stainless, t.cyl('z', 60, 200, 10, [0, -948, 0], 8));
    t.add(MAT.chrome, t.cyl('x', -D.lowRow / 2, D.lowRow / 2, 28, [0, -980, 60], 20));
    for (const e of [-1, 1]) t.add(MAT.foam, t.cyl('x', e > 0 ? 50 : -D.lowRow / 2 + 10, e > 0 ? D.lowRow / 2 - 10 : -50, 36, [0, -980, 60], 20));
  }, [0, TITAN_PLATE_LAT_DIMS.rearFace - D.length / 2]);
}
// ------------------------------------------------------------------------------------------------ Titan Wall and Rack Mounted Pulley Tower
export function buildTitanPulleyTower(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = TITAN_PULLEY_DIMS, H = D.heights[p.height] ?? D.heights[0], T = D.tube, F = BLACK, PUL = MAT.nylon;
  return t.finish('Titan Pulley Tower', () => {
    const front = -85, back = front + D.depth, yG = 240, beamH = 64, W = D.width / 2;
    // H base: front and rear beams across (end covers), the base frame spine back to the lower wall frame.
    for (const y of [0, yG]) {
      t.add(F, t.box([-W + 12, y - 32, 0], [W - 12, y + 32, beamH]));
      for (const e of [-1, 1]) t.add(MAT.rubber, t.box([e > 0 ? W - 12 : -W, y - 34, 0], [e > 0 ? W : -W + 12, y + 34, beamH + 2]));
    }
    t.add(F, t.box([-T / 2, 32, 10], [T / 2, back - 6, 10 + T]));
    t.add(F, t.cut(t.box([-T / 2 - 4, back - 6, 10], [T / 2 + 4, back, 260]), [t.hull([t.cyl('y', back - 8, back + 2, 14, [0, 0, 90], 12), t.cyl('y', back - 8, back + 2, 14, [0, 0, 200], 12)])]));
    // Front upright (18 trolley positions) and the rear guide tube, joined by the upper fixing frame with its wall bracket.
    const topZ = H - T, pitch = inch(3), hole1 = 520, zPos = (i: number) => hole1 + (i - 1) * pitch;
    t.add(MAT.zinc, t.upright(0, 0, beamH, topZ, T, T, { dia: 19, pitch, start: hole1, count: D.positions, faces: 'xy' }));
    t.add(F, t.upright(0, yG, beamH, topZ, T, T));
    t.add(F, t.box([-T / 2, front, topZ], [T / 2, back - 6, H]));
    t.add(F, t.cut(t.box([-T / 2 - 60, back - 6, H - 240], [T / 2 + 60, back, H]), [t.union([-1, 1].map(e => t.hull([t.cyl('y', back - 8, back + 2, 14, [e * 60, 0, H - 200], 12), t.cyl('y', back - 8, back + 2, 14, [e * 60, 0, H - 70], 12)])))]));
    // Weight carriage (1" posts with 2" plate sleeves) on the guide tube, resting on the rubber bumper.
    const hz = 330;
    t.add(MAT.rubber, t.cyl('z', beamH, hz - 90, 45, [0, yG, 0], 20));
    t.add(F, t.cut(t.box([-45, yG - 45, hz - 90], [45, yG + 45, hz + 90]), [t.box([-T / 2 - 1, yG - T / 2 - 1, hz - 91], [T / 2 + 1, yG + T / 2 + 1, hz + 91])]));
    t.add(MAT.stainless, t.cyl('x', -45 - D.post - 12, 45 + D.post + 12, 25.4, [0, yG, hz], 20));
    t.add(mat('Black 2" plate sleeves', '#1f2022', .45, .45), t.cyl('x', 50, 45 + D.post, 50, [0, yG, hz], 28), t.cyl('x', -45 - D.post, -50, 50, [0, yG, hz], 28));
    t.add(F, t.cyl('x', 45, 50, 80, [0, yG, hz], 28), t.cyl('x', -50, -45, 80, [0, yG, hz], 28));
    const right = Math.ceil(p.loaded / 2);
    t.plates(ironPlates(right), [51, yG, hz], [1, 0, 0]);
    t.plates(ironPlates(p.loaded - right), [-51, yG, hz], [-1, 0, 0]);
    t.add(PUL, t.sheave([0, yG - 70, hz + 120], 'x', 90, 20));
    t.add(F, t.box([-16, yG - 110, hz + 60], [16, yG - 45, hz + 140]));
    // Pulleys: top front pair, top rear pair above the guide tube, the movable (floating) pair between the tubes.
    for (const y of [-10, yG - 70]) t.add(PUL, t.sheave([0, y, topZ - 45], 'x', 90, 20));
    t.add(PUL, t.sheave([0, 120, 1150], 'x', 90, 20), t.sheave([0, 120, 1060], 'x', 90, 20));
    t.add(F, t.hull([t.cyl('x', 13, 17, 100, [0, 120, 1150], 24), t.cyl('x', 13, 17, 100, [0, 120, 1060], 24)]), t.hull([t.cyl('x', -17, -13, 100, [0, 120, 1150], 24), t.cyl('x', -17, -13, 100, [0, 120, 1060], 24)]));
    for (const e of [-1, 1]) t.add(F, t.box([e * 14 - 2, -60, topZ - 100], [e * 14 + 2, 40, topZ]), t.box([e * 14 - 2, yG - 120, topZ - 100], [e * 14 + 2, yG - 20, topZ]));
    t.add(PUL, t.sheave([0, 60, 150], 'x', 90, 20));
    // Multi-pulley bracket at the selected hole: sleeve, knob, figure-3 cheek plates and twin swivel pulleys.
    const zc = zPos(p.carriage);
    t.add(F, t.cut(t.box([-38, -38, zc - 120], [38, 38, zc + 80]), [t.box([-T / 2 - 1, -T / 2 - 1, zc - 121], [T / 2 + 1, T / 2 + 1, zc + 81])]));
    t.add(MAT.zinc, t.cyl('y', -38, -60, 14, [0, 0, zc], 12));
    t.add(mat('Black knob', '#141516', .1, .5), t.cyl('y', -60, -85, 44, [0, 0, zc], 20));
    for (const e of [-1, 1]) {
      const x = e * 60;
      t.add(F, t.hull([t.cyl('x', x - 3, x + 3, 100, [0, 0, zc + 40], 24), t.cyl('x', x - 3, x + 3, 100, [0, 0, zc - 40], 24)]));
      t.add(PUL, t.sheave([x + e * 14, 0, zc + 40], 'x', 80, 18), t.sheave([x + e * 14, 0, zc - 40], 'x', 80, 18));
      t.add(F, t.box([e > 0 ? 38 : -63, -12, zc - 70], [e > 0 ? 63 : -38, 12, zc - 55]));
      const eye = swivelPulley(t, [e * 95, 0, zc - 60], [e, 0, 0], 70);
      hangHandle(t, cableEnd(t, eye, 60), 380);
    }
    // Cables: bracket up to the top front pulley, back to the rear pulley, down to the carriage; short cable to the base.
    t.add(MAT.cable, t.cable([[0, -55, zc + 90], [0, -55, topZ - 45], [0, -10, topZ], [0, yG - 70, topZ], [0, yG - 115, topZ - 45], [0, yG - 115, hz + 150]]));
    t.add(MAT.cable, t.cable([[0, 75, zc - 120], [0, 75, 1060], [0, 165, 1060], [0, 165, 150]]));
    t.add(MAT.stainless, t.cyl('z', beamH, 180, 10, [0, 105, 0], 8));
  });
}
// ------------------------------------------------------------------------------------------------ REP Arcadia
export function buildRepArcadia(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = REP_ARCADIA_DIMS, W = D.width / 2, F = BLACK;
  const SHROUD = mat('Metallic black shrouds', '#2a2b2e', .55, .32), SILVER = mat('Brushed aluminium logo caps', '#c3c6c9', .85, .3);
  return t.finish('REP Arcadia', () => {
    const back = 195, front = back - D.depth, tx = 300, sw = 135, sy0 = -125, sy1 = 195, st = 6, topZ = 1880;
    const ux = 470, uy = -80, U = 76, barTop = D.invertedHeight, rail = 32, pitch = (D.high - D.low) / (D.positions - 1);
    const weights = repArcadiaWeights(p), pin = pinIndex(weights, p.pin);
    for (const e of [-1, 1]) {
      const cx = e * tx, inner = cx - e * sw, outer = cx + e * sw;
      // Base under the tower and the long foot to the front outer corner with its logo cap.
      t.add(F, t.box([cx - sw, sy0, 0], [cx + sw, sy1, 55]));
      const tip: Vec3 = [e * (W - 70), front + 30, 30];
      t.add(F, t.beam([cx, 40, 30], tip, 95, 55));
      t.add(SILVER, t.beam(tip, [tip[0], tip[1] - 30, 30], 110, 55));
      // Shroud: thin panels with a rounded inner top corner, a stack window on the inner side, REP letters on the front.
      const r = 110, arc = Array.from({ length: 9 }, (_, i) => { const a = Math.PI / 2 * i / 8; return [inner + e * (r - r * Math.cos(a)), topZ - r + r * Math.sin(a)] as [number, number]; });
      const prof: [number, number][] = e > 0 ? [[inner, 60], [outer, 60], [outer, topZ], ...arc.reverse()] : [[outer, 60], [inner, 60], ...arc, [outer, topZ]];
      const shell = t.prismXZ(prof, sy0, sy1), hollow = t.prismXZ(prof.map(([x, z]) => [x + (x === outer ? -e * st : x === inner ? e * st : Math.sign(cx - x) * st * 0), z - (z > topZ - 1 ? st : 0)] as [number, number]), sy0 + st, sy1 - st);
      const windowCut = t.box([inner - 20, 10, 150], [inner + 20, 110, 1150]);
      t.add(SHROUD, t.cut(shell, [hollow, windowCut]));
      t.add(SILVER, t.label('REP', 150, 50, 1.5, [cx - e * 15, sy0 - 1.5, topZ - 110], [1, 0, 0], [0, 0, 1]));
      // Stack inside (visible through the window) with guide rods, pin to the inner side.
      weightStack(t, { x: cx, y: 60, z0: 60, w: 210, d: 140, t: 25.4, gap: 1.6, n: weights.length - 1, head: 45, face: e < 0 ? '+x' : '-x', rodSep: 230, rodD: 20, rodAxis: 'x', rodTop: topZ - 60, pin, bumper: 30, labelW: 80, pinKnob: '#1b1c1e',
        stripe: i => i <= 4 ? STRIPE.green : i <= 10 ? STRIPE.yellow : STRIPE.red });
      // Outer trolley upright with the laser-numbered stainless strip.
      t.add(F, t.box([e * ux - U / 2, uy - U / 2, 0], [e * ux + U / 2, uy + U / 2, barTop - rail]));
      t.add(F, t.box([e * ux - e * U / 2, uy - U / 2, 400], [cx + e * sw, uy + U / 2 - 20, 440]), t.box([e * ux - e * U / 2, uy - U / 2, 1700], [cx + e * sw, uy + U / 2 - 20, 1740]));
      t.add(MAT.stainless, t.box([e * ux - 24, uy - U / 2 - 3, D.low - 60], [e * ux + 24, uy - U / 2, D.high + 120]));
      for (let i = 1; i <= D.positions; i++) {
        const z = D.low + (i - 1) * pitch;
        t.add(F, t.cyl('y', uy - U / 2 - 3.6, uy - U / 2 - 2, 10, [e * ux + e * 12, 0, z], 10));
        t.add(F, t.label(String(i), 20, 16, .6, [e * ux - e * 8, uy - U / 2 - 3.6, z], [1, 0, 0], [0, 0, 1]));
      }
      // Top pulley housing and the trolley: sleeve, knurled pull-pin handle, hex-cut pulley housing, carabiner and handle.
      t.add(F, t.box([e * ux - 12, uy - U / 2 - 60, 1880], [e * ux + 12, uy - U / 2, 1940]));
      t.add(MAT.alu, t.sheave([e * ux, uy - U / 2 - 40, 1900], 'x', 80, 18));
      const zc = D.low + ((e < 0 ? p.left : p.right) - 1) * pitch;
      t.add(F, t.cut(t.box([e * ux - 50, uy - 50, zc - 110], [e * ux + 50, uy + 50, zc + 110]), [t.box([e * ux - U / 2 - 1, uy - U / 2 - 1, zc - 111], [e * ux + U / 2 + 1, uy + U / 2 + 1, zc + 111])]));
      t.add(MAT.grip, t.cyl('x', e * ux - e * 50, e * ux - e * 95, 30, [0, uy - 20, zc + 60], 20));
      const hx = e * (ux + 95), hy = uy - 20;
      const housing = t.cyl('y', hy - 30, hy - 24, 150, [hx, 0, zc + 20], 40), hexes = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [42 * Math.cos(i * Math.PI / 3), 42 * Math.sin(i * Math.PI / 3)])].map(([dx, dz]) => t.cyl('y', hy - 32, hy - 22, 26, [hx + dx, 0, zc + 20 + dz], 6));
      t.add(F, t.cut(housing, [t.union(hexes)]), t.cyl('y', hy + 24, hy + 30, 150, [hx, 0, zc + 20], 40), t.box([e * ux + e * 48, hy - 30, zc - 50], [hx, hy + 30, zc + 90].map((v, i) => i === 0 ? v : v) as Vec3));
      t.add(MAT.alu, t.sheave([hx, hy, zc + 20], 'y', 120, 22));
      const eye = cableEnd(t, [hx, hy, zc - 60], 60);
      hangHandle(t, eye, 330);
      t.add(MAT.cable, t.cable([[e * ux, uy - U / 2 - 80, 1900], [e * ux, uy - U / 2 - 80, zc + 110]]), t.cable([[e * ux, uy - U / 2, 1940], [cx, 60, 1840], [cx, 60, 60 + 30 + (weights.length - 1) * 27 + 45]]));
    }
    // Pegboard storage with two shelves and the rear base crossmember between the towers.
    const px = tx - sw;
    t.add(F, t.box([-px, sy1 - 40, 0], [px, sy1, 50]));
    const holes: Manifold[] = [];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 26; j++) holes.push(t.cyl('y', sy1 - 12, sy1 + 2, 9, [-px + 25 + i * ((2 * px - 50) / 8), 0, 300 + j * 48], 6));
    t.add(F, t.cut(t.box([-px, sy1 - 10, 260], [px, sy1 - 4, 1560]), [t.union(holes)]));
    for (const z of [780, 1170]) t.add(mat('Pegboard shelf lips', '#9fa3a6', .7, .35), t.box([-px, sy1 - 130, z], [px, sy1 - 10, z + 30]));
    // Multi-grip pull-up bar across the upright tops (standard: grips humped up; inverted: humped down).
    const rz = barTop - rail / 2, hump = (D.height - D.invertedHeight) * (p.bar ? -1 : 1), gz = rz + hump;
    t.add(F, t.cyl('x', -ux, ux, rail, [0, uy, rz], 24));
    for (const e of [-1, 1]) {
      t.add(F, t.cyl('x', e > 0 ? ux : -(W - 30), e > 0 ? W - 30 : -ux, rail, [0, uy, rz], 24));
      t.add(SILVER, t.box([e > 0 ? W - 34 : -W, uy - 55, rz - 22], [e > 0 ? W : -W + 34, uy + 55, barTop]));
      t.add(F, t.rod([e * 60, uy, rz], [e * 140, uy - 70, gz], rail, 20), t.cyl('x', e > 0 ? 140 : -380, e > 0 ? 380 : -140, rail, [0, uy - 70, gz], 20), t.rod([e * 380, uy - 70, gz], [e * 440, uy, rz], rail, 20));
      for (const x of [200, 320]) t.add(F, t.rod([e * x, uy, rz], [e * x, uy - 70, gz], 30, 16));
    }
  });
}
// ------------------------------------------------------------------------------------------------ Inspire FTX
export function buildInspireFtx(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = INSPIRE_FTX_DIMS, H = D.height, F = mat('Matte black powder coat', '#1d1e20', .2, .62);
  const RED = mat('Red lock levers', '#d0282e', .1, .45), WHITE = mat('White INSPIRE logo', '#ecebe7', 0, .5);
  const a = D.angle * Math.PI / 180, tx = 328.5, ty = 0, pitch = inch(2), z1 = 330;
  /** Tower-local point (outer side = +x) to the build frame, as the solids are transformed below. */
  const pt = (e: number, [x, y, z]: Vec3): Vec3 => { const lx = e * x, th = -e * a; return [lx * Math.cos(th) - y * Math.sin(th) + e * tx, lx * Math.sin(th) + y * Math.cos(th) + ty, z]; };
  return t.finish('Inspire FTX', () => {
    const weights = inspireFtxWeights, pin = pinIndex(weights, p.pin);
    for (const e of [-1, 1]) {
      const place = (s: Manifold) => t.move(t.rotate(e < 0 ? t.mirrorX(s) : s, [0, 0, -e * D.angle]), [e * tx, ty, 0]);
      t.within(place, () => {
        const top = H - 95;
        // Base frame, sled foot with its upturned toe, the two black uprights and the chrome carriage tube.
        t.add(F, t.box([-215, 20, 0], [170, 130, 40]));
        t.add(F, t.beam([-20, 150, 22], [-20, -300, 22], 70, 44), t.beam([-20, -300, 22], [230, -515, 22], 70, 44));
        t.add(MAT.rubber, t.rbox([232, -517], 90, 50, 0, 44, 22));
        t.add(F, t.box([-205, 40, 40], [-155, 115, top]), t.box([95, 40, 40], [145, 115, top]));
        t.add(MAT.chrome, t.cyl('z', 60, top, 60, [195, 0, 0], 32));
        t.add(F, t.box([-5 + 195 - 60, -30, 40], [195 + 30, 40, 70]));
        const holes = Array.from({ length: D.positions }, (_, i) => t.cyl('y', -12, 10, 11, [158, 0, z1 + i * pitch], 10));
        t.add(F, t.cut(t.box([146, -6, 250], [170, 40, z1 + (D.positions - 1) * pitch + 60]), [t.union(holes)]));
        // Stack of pill-shaped plates between the uprights.
        const stackTop = weightStack(t, { x: -30, y: 78, z0: 40, w: 175, d: 120, t: 24, gap: 1.2, n: weights.length - 1, head: 55, face: '-y', rodSep: 80, rodD: 20, rodAxis: 'x', rodTop: top, pin, bumper: 28, labelW: 60, stripe: () => STRIPE.white });
        // Top cap with the rounded inner corner and INSPIRE logo.
        const r = 120, arc = Array.from({ length: 9 }, (_, i) => { const q = Math.PI / 2 * i / 8; return [-215 + r - r * Math.cos(q), H - r + r * Math.sin(q)] as [number, number]; });
        const cap = t.prismXZ([[-215, top], [230, top], [230, H], ...arc.reverse()], -45, 150);
        t.add(F, cap);
        t.add(WHITE, t.label('INSPIRE', 180, 34, 1.2, [e > 0 ? -20 : 20 - 180 * 0, -46.2 + (e < 0 ? 1.2 : 0), H - 130], [e, 0, 0], [0, 0, 1]));
        t.add(WHITE, t.cut(t.cyl('y', -46.4, -45, 58, [-20, 0, H - 60], 32), [t.cyl('y', -47, -44, 46, [-20, 0, H - 60], 32)]), t.box([-24, -46.4, H - 82], [-16, -45, H - 38]));
        t.add(MAT.alu, t.sheave([195, -10, top + 40], 'x', 80, 18));
        // Carriage at the selected position: sleeve on the chrome tube, red lock lever, pulley housing and swivel pulley.
        const zc = z1 + ((e < 0 ? p.left : p.right) - 1) * pitch;
        t.add(F, t.cyl('z', zc - 110, zc + 110, 88, [195, 0, 0], 32));
        t.add(RED, t.beam([150, -20, zc + 70], [120, -80, zc + 70], 26, 22));
        t.add(F, t.box([150, -6, zc + 55], [165, 6, zc + 85]));
        for (const x of [236, 266]) t.add(F, t.hull([t.cyl('x', x - 3, x + 3, 120, [0, 0, zc + 30], 32), t.cyl('x', x - 3, x + 3, 60, [0, 0, zc - 60], 24)]));
        t.add(F, t.box([225, -30, zc - 40], [240, 30, zc + 60]));
        t.add(MAT.nylon, t.sheave([251, 0, zc + 30], 'x', 100, 22));
        const eye = swivelPulley(t, [251, 0, zc - 80], [1, 0, 0], 70);
        hangHandle(t, cableEnd(t, eye, 60), 330);
        t.add(MAT.cable, t.cable([[195, -40, zc + 110], [195, -40, top + 40], [150, 60, top - 10], [-30, 78, top - 10], [-30, 78, stackTop + 55]]));
      });
    }
    // Arched lower brace and the upper cross brace (with the accessory hanger) between the inner rear corners; pull-up bar.
    const arcPts = (z: number, sag: number, from: Vec3, to: Vec3, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u + sag * Math.sin(Math.PI * u), z] as Vec3; });
    const lowL = pt(-1, [-180, 110, 0]), lowR = pt(1, [-180, 110, 0]);
    t.add(F, t.cable(arcPts(260, 230, lowL, lowR), 50));
    const upL = pt(-1, [-180, 115, 0]), upR = pt(1, [-180, 115, 0]);
    t.add(F, t.cable([[upL[0], upL[1], 1480], [upR[0], upR[1], 1480]], 45));
    t.add(F, t.box([-150, upL[1] - 120, 1505], [150, upL[1] - 20, 1515]), t.box([-60, upL[1] - 30, 1515], [60, upL[1] - 20, 1590]));
    for (const x of [-110, -40, 40, 110]) t.add(MAT.zinc, t.cyl('z', 1440, 1505, 8, [x, upL[1] - 60, 0], 8));
    t.add(MAT.strap, t.box([-20, upL[1] - 64, 1100], [30, upL[1] - 56, 1440]));
    t.add(mat('Black braided rope', '#151516', 0, .9), t.cyl('z', 1060, 1440, 26, [85, upL[1] - 60, 0], 12));
    t.add(F, t.cable([[-110, upL[1] - 60, 1440], [-110, upL[1] - 60, 1300], [-80, upL[1] - 60, 1220], [-130, upL[1] - 60, 1100], [-100, upL[1] - 60, 920], [-110, upL[1] - 60, 800]], 22));
    const barL = pt(-1, [200, 60, 0]), barR = pt(1, [200, 60, 0]);
    t.add(F, t.cable(arcPts(H - 16, 160, barL, barR, 12), 32));
    for (const b of [barL, barR]) t.add(F, t.cyl('z', H - 95, H - 16, 40, [b[0], b[1], 0], 20));
  });
}
// ------------------------------------------------------------------------------------------------ REP Adonis
export function buildRepAdonis(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = REP_ADONIS_DIMS, H = D.height, U = inch(3), F = mat('Metallic black powder coat', '#252629', .5, .38);
  const SHROUD = mat('Black shroud panels', '#1b1c1e', .35, .45), BEIGE = mat('REP shroud lettering', '#b9ad9c', .2, .5), GREY = mat('Grey tread footplate', '#5a5d61', .5, .5);
  return t.finish('REP Adonis', () => {
    const cc = 700, back = cc + U / 2, front = back - D.depth, mid = cc / 2, pw = U / 2 + 6, pitch = (D.high - D.low) / (D.positions - 1);
    // Uprights (1" holes on 2" centres), top crossmember and the lat arm forward from the top.
    for (const y of [0, cc]) t.add(F, t.upright(0, y, 8, H - U, U, U, { dia: 25.4, pitch: inch(2), start: D.low, count: 40, faces: 'xy', seg: 14 }));
    t.add(F, t.box([-U / 2, -U / 2, H - U], [U / 2, back, H]));
    const tipY = -430;
    t.add(F, t.box([-U / 2, tipY - 40, H - U], [U / 2, -U / 2, H]));
    for (const e of [-1, 1]) t.add(F, t.box([e > 0 ? U / 2 : -U / 2 - 6, tipY - 60, H - U - 90], [e > 0 ? U / 2 + 6 : -U / 2, tipY + 80, H]));
    t.add(MAT.alu, t.sheave([0, tipY, H - U - 40], 'x', 110, 22));
    // Shroud panels on both sides with the central slot, vertical REP lettering and perforated patches.
    const slot0 = mid - 110, slot1 = mid + 110;
    for (const e of [-1, 1]) {
      const x0 = e > 0 ? U / 2 : -pw, x1 = e > 0 ? pw : -U / 2;
      t.add(SHROUD, t.cut(t.box([x0, U / 2, 140], [x1, cc - U / 2, H - U - 30]), [t.box([x0 - 1, slot0, 220], [x1 + 1, slot1, H - U - 160])]));
      t.add(BEIGE, t.label('REP', 520, 170, 1.5, [e * (pw + (e > 0 ? 0 : 1.5)), 150, 1500], [0, 0, 1], [0, -e, 0]));
      for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) t.add(F, t.cyl('x', e > 0 ? pw - .5 : -pw - .8, e > 0 ? pw + .8 : -pw + .5, 9, [0, slot1 + 40 + i * 30, 300 + j * 36], 6));
    }
    t.add(MAT.chrome, t.cyl('z', 140, H - U - 30, 32, [0, mid - 60, 0], 20));
    // Plate-loaded carriage on the guide rod (or the selector stack with horns on its head plate), horns through both slots.
    let hornZ: number;
    if (p.loading) {
      const pin = pinIndex(D.stack, p.pin);
      const top = weightStack(t, { x: 0, y: mid + 20, z0: 140, w: U - 4, d: 190, t: 30, gap: 1.2, n: D.stack.length - 1, head: 60, face: '+x', rodSep: 150, rodD: 18, rodTop: H - U - 30, pin, bumper: 30, labelW: 90,
        stripe: () => STRIPE.white });
      t.add(mat('REP 2.5 lb micro disc', '#141516', .3, .5), t.cyl('x', pw, pw + 18, 120, [0, mid + 20, top + 60], 36));
      hornZ = top + 60;
    } else {
      t.add(MAT.rubber, t.cyl('z', 140, 250, 44, [0, mid - 60, 0], 20));
      t.add(F, t.cyl('z', 250, 560, 56, [0, mid - 60, 0], 24), t.box([-U / 2 + 4, mid - 90, 300], [U / 2 - 4, mid + 90, 520]));
      hornZ = 400;
    }
    const hornY = mid;
    t.add(F, t.cyl('x', -pw - 12, pw + 12, 80, [0, hornY, hornZ], 32));
    t.add(mat('Stainless loading horns', '#c4c8cb', .9, .3), t.cyl('x', -pw - 12 - D.horn, pw + 12 + D.horn, 49, [0, hornY, hornZ], 32));
    t.add(F, t.cyl('x', pw + 12 + D.horn, pw + 22 + D.horn, 60, [0, hornY, hornZ], 28), t.cyl('x', -pw - 22 - D.horn, -pw - 12 - D.horn, 60, [0, hornY, hornZ], 28));
    const right = Math.ceil(p.loaded / 2);
    t.plates(ironPlates(right), [pw + 13, hornY, hornZ], [1, 0, 0]);
    t.plates(ironPlates(p.loaded - right), [-pw - 13, hornY, hornZ], [-1, 0, 0]);
    // Trolley on the front upright: sleeve, knurled pop-pin handle, twin hex-cut pulley plates, swivel pulley and handle.
    const zc = D.low + (p.carriage - 1) * pitch;
    t.add(F, t.cut(t.box([-52, -52, zc - 130], [52, 52, zc + 130]), [t.box([-U / 2 - 1, -U / 2 - 1, zc - 131], [U / 2 + 1, U / 2 + 1, zc + 131])]));
    t.add(MAT.grip, t.cyl('x', 52, 110, 30, [0, 0, zc + 60], 20));
    for (const e of [-1, 1]) {
      const plate = t.hull([t.cyl('x', e * 26 - 3, e * 26 + 3, 130, [0, -110, zc + 60], 36), t.cyl('x', e * 26 - 3, e * 26 + 3, 130, [0, -110, zc - 50], 36)]);
      const hx = [[0, 60], [0, -50], [35, 5], [-35, 5], [35, 95], [-35, 95], [35, -85], [-35, -85]].map(([dy, dz]) => t.cyl('x', e * 26 - 5, e * 26 + 5, 24, [0, -110 + dy, zc + dz + 5], 6));
      t.add(F, t.cut(plate, [t.union(hx)]));
    }
    t.add(F, t.box([-29, -60, zc - 100], [29, -52, zc + 110]));
    t.add(MAT.alu, t.sheave([0, -110, zc + 60], 'x', 110, 20), t.sheave([0, -110, zc - 50], 'x', 110, 20));
    const eye = swivelPulley(t, [0, -150, zc - 118], [0, -1, 0], 70, F, MAT.alu);
    hangHandle(t, cableEnd(t, eye, 60), 330);
    // Footplate with the low-row pulley and straight row handle; lat bar under the arm tip.
    t.add(F, t.box([-U / 2, front + 100, 8], [U / 2, -U / 2, 60]));
    t.add(GREY, t.cut(t.box([-230, front, 0], [230, front + 110, 200]), [t.box([-60, front - 1, 80], [60, front + 111, 201]), t.box([-231, front + 15, 12], [231, front + 111, 201])]));
    t.add(F, t.label('REP', 90, 30, 1, [0, front + 1, 40], [1, 0, 0], [0, 0, 1]));
    t.add(MAT.alu, t.sheave([0, front + 60, 140], 'x', 90, 20));
    t.add(MAT.stainless, t.cyl('x', -300, 300, 28, [0, front + 60, 215], 20));
    t.add(MAT.cable, t.cable([[0, -120, zc + 115], [0, -120, H - U - 60], [0, -U / 2 - 10, H - U - 20], [0, mid - 60, H - U - 20]]), t.cable([[0, tipY - 55, H - U - 40], [0, tipY - 55, H - U - 200]]));
    latBar(t, cableEnd(t, [0, tipY - 55, H - U - 200], 60), D.latBar, 200, 110, 25.4, MAT.stainless, MAT.grip);
    // Storage base (two 3" rails across, levelling feet, storage posts) or the anchored tower's foot plates.
    if (p.base) {
      const bw = D.baseWidth / 2, bd = D.baseDepth / 2;
      for (const y of [mid - bd + U / 2, mid + bd - U / 2]) t.add(F, t.cut(t.box([-bw, y - U / 2, 30], [bw, y + U / 2, 30 + U]), [t.union(Array.from({ length: 16 }, (_, i) => t.cyl('y', y - U, y + U, 25.4, [-bw + 70 + i * ((2 * bw - 140) / 15), 0, 30 + U / 2], 12)))]));
      for (const e of [-1, 1]) {
        t.add(F, t.box([e * bw - (e > 0 ? U : 0), mid - bd + U, 30], [e * bw + (e > 0 ? 0 : U), mid + bd - U, 30 + U]));
        for (const y of [mid - bd + U / 2, mid + bd - U / 2]) t.add(MAT.rubber, t.cyl('z', 0, 30, 70, [e * (bw - U / 2), y, 0], 20));
        t.add(F, t.cyl('z', 30 + U, D.baseHeight, 60, [e * (bw - 150), mid, 0], 24));
      }
    } else for (const y of [0, cc]) t.add(F, t.box([-U / 2 - 40, y - U / 2, 0], [U / 2 + 40, y + U / 2, 8]));
  });
}
// ------------------------------------------------------------------------------------------------ Force USA Functional Trainer Rack
export function buildForceFtr(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = FORCE_FTR_DIMS, H = D.height, U = D.tube, F = mat('Matte black electrostatic paint', '#1e1f21', .25, .6);
  const HEX = mat('Hex-pattern aluminium plates', '#b7babd', .8, .32);
  return t.finish('Force USA FTR', () => {
    const ux = D.frameWidth / 2 - U / 2, yM = 420, yR = 760, back = yR + U / 2, front = back - D.depth, capZ = 1960;
    const holes = { dia: 25.4, pitch: inch(2), start: 150, count: 42, faces: 'xy' as const, seg: 10 };
    const weights = forceFtrWeights(p), pin = pinIndex(weights, p.pin);
    for (const e of [-1, 1]) {
      const x = e * ux;
      // Side foot with the angled front toe, three uprights (front trolley upright, stack bay pair).
      t.add(F, t.prismYZ([[front, 0], [back, 0], [back, U], [front + 90, U], [front, 30]], x - U / 2, x + U / 2));
      t.add(MAT.rubber, t.box([x - U / 2 - 3, front, 0], [x + U / 2 + 3, front + 60, 6]));
      t.add(F, t.upright(x, 0, U, H - U, U, U, holes), t.upright(x, yM, U, capZ, U, U, { ...holes, faces: 'x' }), t.upright(x, yR, U, capZ, U, U, { ...holes, faces: 'x' }));
      t.add(F, t.box([x - U / 2, U / 2, H - U], [x + U / 2, yM - U / 2, H]));
      // Stack bay cap: sloped black shroud with the hex-pattern FORCE USA plate on the outside.
      const cap = t.prismYZ([[yM - U / 2, capZ], [back, capZ], [back, H - 170], [yM + 60, H], [yM - U / 2, H]], x - U / 2 - 20, x + U / 2 + 20);
      t.add(F, cap);
      const hx = x + e * (U / 2 + 20);
      t.add(HEX, t.prismYZ([[yM - U / 2 + 10, capZ + 12], [yR, capZ + 12], [yR, H - 150], [yM + 55, H - 12], [yM - U / 2 + 10, H - 12]], e > 0 ? hx : hx - 2, e > 0 ? hx + 2 : hx));
      t.add(F, t.label('FORCE USA', 250, 55, 1, [hx + e * 2, yM + 170, capZ + 115], [0, e, 0], [0, 0, 1]));
      // Stack in the rear bay, labels outboard, guide rods to the cap.
      weightStack(t, { x, y: (yM + yR) / 2, z0: U, w: 100, d: 250, t: 22, gap: 1.4, n: weights.length - 1, head: 50, face: e < 0 ? '-x' : '+x', rodSep: 210, rodD: 22, rodTop: capZ, pin, bumper: 30, labelW: 110, stripe: () => STRIPE.white });
      // Low pulleys by the front of the stack bay, and the trolley with its freestyle arm.
      for (const z of [180, 330]) t.add(MAT.alu, t.sheave([x, yM - 90, z], 'x', 90, 20));
      t.add(F, t.box([x - 16, yM - 140, 120], [x - 12, yM - U / 2, 380]), t.box([x + 12, yM - 140, 120], [x + 16, yM - U / 2, 380]));
      const zc = 300 + ((e < 0 ? p.left : p.right) - 1) * inch(2);
      t.add(F, t.cut(t.box([x - 52, -52, zc - 120], [x + 52, 52, zc + 120]), [t.box([x - U / 2 - 1, -U / 2 - 1, zc - 121], [x + U / 2 + 1, U / 2 + 1, zc + 121])]));
      t.add(MAT.grip, t.cyl('y', -52, -110, 30, [x, 0, zc - 60], 20));
      const a = 35 * Math.PI / 180, piv: Vec3 = [x + e * 70, -10, zc], L = 177, tip: Vec3 = [piv[0] + e * L * Math.cos(a), -10, zc + L * Math.sin(a)];
      t.add(F, t.cyl('x', e > 0 ? x + 52 : x - 70, e > 0 ? x + 70 : x - 52, 90, [0, -10, zc], 28));
      t.add(HEX, t.cut(t.beam(piv, tip, 16, 120, [-e * Math.sin(a), 0, Math.cos(a)]), [t.union([.25, .5, .75].map(u => t.cyl('y', -30, 10, 42, [piv[0] + (tip[0] - piv[0]) * u, 0, piv[2] + (tip[2] - piv[2]) * u], 6)))]));
      t.add(F, t.hull([t.cyl('y', -30, -24, 150, [tip[0], 0, tip[2]], 32), t.cyl('y', 4, 10, 150, [tip[0], 0, tip[2]], 32)]));
      t.add(MAT.alu, t.sheave([tip[0], -10, tip[2]], 'y', 120, 22));
      const eye = swivelPulley(t, [tip[0] + e * 40, -10, tip[2] - 60], [e, 0, 0], 60, F, MAT.alu);
      hangHandle(t, cableEnd(t, eye, 50), 300);
      t.add(MAT.cable, t.cable([[x, -60, zc - 120], [x, -60, 330], [x, yM - 90, 285]]));
    }
    // Front top crossmember with the suspension ring and pull-up grips; rear crossmembers, sign, pegboard, shelf.
    t.add(F, t.cut(t.box([-ux, -U / 2, H - U], [ux, U / 2, H]), [t.union(Array.from({ length: 13 }, (_, i) => t.cyl('y', -U, U, 25.4, [-ux + 120 + i * ((2 * ux - 240) / 12), 0, H - U / 2], 12)))]));
    t.add(MAT.zinc, t.cut(t.cyl('y', -6, 6, 70, [0, 0, H - U - 40], 24), [t.cyl('y', -8, 8, 50, [0, 0, H - U - 40], 24)]));
    for (const e of [-1, 1]) t.add(F, t.cyl('y', -U / 2, -170, 32, [e * 260, 0, H - 30], 20), t.box([e * 260 - 25, -190, H - 60], [e * 260 + 25, -170, H - 5]));
    for (const e of [-1, 1]) t.add(MAT.grip, t.cyl('y', -80, -165, 36, [e * 260, 0, H - 30], 20));
    t.add(F, t.box([-ux, yR - U / 2, 0], [ux, yR + U / 2, U]), t.box([-ux, yR - U / 2, capZ - U], [ux, yR + U / 2, capZ]));
    t.add(F, t.box([-ux, yM - U / 2, 650], [ux, yM + U / 2, 650 + U]), t.box([-ux, yM - U / 2, capZ - U], [ux, yM + U / 2, capZ]));
    t.add(F, t.box([-260, yM - 6, 1640], [260, yM, 1860]));
    t.add(HEX, t.label('FORCE USA', 440, 90, 1.5, [0, yM - 6, 1750], [1, 0, 0], [0, 0, 1]));
    const keys: Manifold[] = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) keys.push(t.hull([t.cyl('y', yM - 10, yM + 6, 16, [-200 + i * 80, 0, 1560 - j * 90], 10), t.cyl('y', yM - 10, yM + 6, 8, [-200 + i * 80, 0, 1540 - j * 90], 8)]));
    t.add(F, t.cut(t.box([-240, yM - 6, 1330], [240, yM, 1620]), [t.union(keys)]));
    t.add(F, t.box([-260, yM - 150, 1150], [260, yM, 1162]), t.box([-260, yM - 150, 1162], [260, yM - 140, 1200]));
  });
}
// ------------------------------------------------------------------------------------------------ Major Fitness B52
export function buildMajorB52(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = towerKit(api), D = MAJOR_B52_DIMS, F = BLACK, [cname, ccolor] = MAJOR_B52_COLORS[p.color] ?? MAJOR_B52_COLORS[0];
  const UP = p.color ? mat(`${cname} powder-coated uprights`, ccolor, .3, .5) : F, PUL = p.model ? MAT.alu : MAT.nylon;
  return t.finish('Major Fitness B52', () => {
    const ux = 584, TX = 76.2, TY = 50.8, yM = 300, yR = 940, back = 1000, front = back - D.depth, top = 2046, inner = D.interior / 2, H = D.height;
    const holes = { dia: 22, pitch: inch(2), start: 250, count: 34, faces: 'xy' as const, seg: 10 };
    // Base: side rails, front and rear crossbars, diagonal braces, landmine and low-row footplate.
    for (const e of [-1, 1]) {
      t.add(F, t.box([e * ux - TX / 2, -420, 0], [e * ux + TX / 2, back, TY]));
      t.add(F, t.beam([e * (inner - 250), 0, TY], [e * inner, 0, 380], 40, 40, [0, 1, 0]));
      for (const y of [-420, back - 60]) t.add(MAT.rubber, t.box([e * ux - TX / 2 - 4, y, 0], [e * ux + TX / 2 + 4, y + 60, 8]));
    }
    t.add(F, t.box([-inner, -TY / 2, 0], [inner, TY / 2, TY]), t.box([-inner, yR - TY / 2, 0], [inner, yR + TY / 2, TY]));
    t.add(F, t.cyl('z', TY, 140, 70, [-ux, -380, 0], 24));
    t.add(mat('Black landmine sleeve', '#1f2022', .45, .45), t.cyl('y', -380, front, 50, [-ux, 0, 110], 28));
    t.add(MAT.zinc, t.cyl('x', -ux - 60, -ux + 60, 14, [0, -380, 110], 12));
    t.add(F, t.box([150, -330, 0], [450, -TY / 2, 30]));
    t.add(MAT.tread, t.hull([t.rbox([300, -300], 320, 10, 30, 40, 5), t.rbox([300, -220], 320, 10, 200, 210, 5)]));
    t.add(PUL, t.sheave([300, -60, 90], 'y', 90, 20));
    // Uprights: 2" × 3" front and rear, 2" × 2" middle; top frame, multi-grip pull-up handles, rear logo plate.
    for (const e of [-1, 1]) {
      const x = e * ux;
      // Colourways paint the front and middle uprights; the rear uprights stay black.
      t.add(UP, t.upright(x, 0, TY, top - TY, TX, TY, holes), t.upright(x, yM, TY, top - TY, TY, TY, { ...holes, faces: 'y' }));
      t.add(F, t.upright(x, yR, TY, top - TY, TX, TY, { ...holes, faces: 'x' }));
      for (let n = 3; n <= 27; n += 2) t.add(mat('White upright numbers', '#e3e3df', 0, .6), t.label(String(n), 16, 12, .5, [x + e * 22, -TY / 2 - .5, holes.start + (n - 1) * inch(2) / 2 + 30], [1, 0, 0], [0, 0, 1]));
      t.add(F, t.box([x - TX / 2, -TY / 2, top - TY], [x + TX / 2, yR + TY / 2, top]));
      t.add(F, t.prismYZ([[yR - 150, top], [yR + TY / 2, top], [yR + TY / 2, top - 260], [yR - 20, top - 260]], x - 6, x + 6));
      // Outer foam pull-up handles and the pulley cheeks on top of the front uprights.
      t.add(F, t.box([x - 20, -30, top], [x + 20, 30, top + 30]));
      t.add(MAT.foam, t.cyl('x', e > 0 ? x + TX / 2 : -870, e > 0 ? 870 : x - TX / 2, 38, [0, 0, top + 14], 20));
      for (const s of [-1, 1]) t.add(F, t.hull([t.cyl('x', x + s * 18 - 3, x + s * 18 + 3, 100, [0, -20, top + 2], 28), t.box([x + s * 18 - 3, -TY / 2, top - 60], [x + s * 18 + 3, TY / 2, top])]));
      t.add(PUL, t.sheave([x, -20, top + 2], 'x', 90, 20));
      // Smith guide rod, spring, catch-tooth plate and the carriage; J-hook, dip arm and plate storage pegs.
      const rodY = 160;
      t.add(MAT.chrome, t.cyl('z', TY, top - TY, 38, [x, rodY, 0], 20));
      t.add(MAT.zinc, t.cyl('z', TY, 220, 52, [x, rodY, 0], 12));
      const teeth: [number, number][] = [[yM - TY / 2 - 40, 400]];
      for (let i = 0; i < 10; i++) { const z = 400 + i * 150; teeth.push([yM - TY / 2 - 40, z + 60], [yM - TY / 2 - 12, z + 110], [yM - TY / 2 - 12, z + 150]); }
      teeth.push([yM - TY / 2, 1950], [yM - TY / 2, 400]);
      t.add(F, t.prismYZ(teeth, x - e * 20 - 5, x - e * 20 + 5));
      t.add(F, t.box([x - e * TX / 2 - (e > 0 ? 60 : 0), -TY / 2, 1300], [x - e * TX / 2 + (e < 0 ? 60 : 0), TY / 2, 1400]), t.box([x - e * TX / 2 - (e > 0 ? 60 : 0), -TY / 2 - 50, 1300], [x - e * TX / 2 + (e < 0 ? 60 : 0), -TY / 2, 1340]));
      t.add(F, t.box([e > 0 ? inner - 150 : -inner, -TY / 2, 880], [e > 0 ? inner : -inner + 150, TY / 2, 930]));
      for (const dx of [50, 110]) t.add(MAT.foam, t.cyl('y', -TY / 2 - 60, -TY / 2, 34, [e * (inner - dx), 0, 905], 16));
      for (const z of [480, 1080]) t.add(mat('Black plate storage pegs', '#1f2022', .45, .45), t.cyl('x', e > 0 ? x + TX / 2 : -860, e > 0 ? 860 : x - TX / 2, 50, [0, yR, z], 24));
      // Weight: Pro stack in the rear bay (blue weight labels), or the Standard plate-loaded carriage on its guide rod.
      const bayY = (yM + yR) / 2;
      let loadTop: number;
      if (p.model) {
        loadTop = weightStack(t, { x, y: bayY, z0: TY, w: 100, d: 250, t: 25, gap: 1.4, n: D.stack.length - 1, head: 50, face: e < 0 ? '-x' : '+x', rodSep: 210, rodD: 22, rodTop: top - TY, pin: pinIndex(D.stack, p.pin), bumper: 30, labelW: 100, pinKnob: '#c8302c', stripe: () => STRIPE.blue });
      } else {
        const rz = 320;
        t.add(MAT.chrome, t.cyl('z', TY, top - TY, 32, [x, bayY, 0], 20));
        t.add(MAT.rubber, t.cyl('z', TY, rz - 110, 50, [x, bayY, 0], 20));
        t.add(F, t.cyl('z', rz - 110, rz + 130, 62, [x, bayY, 0], 24));
        t.add(mat('Black loading horns', '#1f2022', .45, .45), t.cyl('x', x - 250, x + 250, 49, [0, bayY, rz], 28));
        t.add(F, t.cyl('x', x - 50, x - 40, 80, [0, bayY, rz], 24), t.cyl('x', x + 40, x + 50, 80, [0, bayY, rz], 24));
        const n = p.loaded, outer = Math.ceil(n / 2);
        t.plates(ironPlates(outer), [x + e * 51, bayY, rz], [e, 0, 0]);
        t.plates(ironPlates(n - outer), [x - e * 51, bayY, rz], [-e, 0, 0]);
        loadTop = rz + 130;
      }
      t.add(PUL, t.sheave([x, bayY, top - TY - 50], 'x', 90, 20));
      // Cable trolley on the front upright's outer face: sleeve, pop pin, twin pulleys, swivel and handle.
      const zc = 500 + (p.carriage - 1) * inch(3);
      t.add(F, t.cut(t.box([x - 60, -48, zc - 120], [x + 60, 48, zc + 120]), [t.box([x - TX / 2 - 1, -TY / 2 - 1, zc - 121], [x + TX / 2 + 1, TY / 2 + 1, zc + 121])]));
      t.add(mat('Red pop-pin knob', '#c8302c', .1, .45), t.cyl('y', -48, -85, 26, [x, 0, zc - 80], 16));
      for (const dz of [60, -30]) t.add(PUL, t.sheave([x + e * 80, 0, zc + dz], 'x', 90, 20));
      t.add(F, t.box([e > 0 ? x + 60 : x - 104, -40, zc - 80], [e > 0 ? x + 104 : x - 60, 40, zc + 110].map(v => v) as Vec3));
      const eye = swivelPulley(t, [x + e * 80, -70, zc - 90], [0, -1, 0], 70, F, PUL);
      hangHandle(t, cableEnd(t, eye, 60), 300);
      t.add(MAT.cable, t.cable([[x + e * 80, -45, zc + 105], [x + e * 80, -45, top - 20], [x, 30, top + 30], [x, bayY - 45, top - TY - 50], [x, bayY - 45, loadTop + 20]]));
    }
    t.add(F, t.cut(t.box([-inner, -TY / 2, top - TY], [inner, TY / 2, top]), [t.union(Array.from({ length: 5 }, (_, i) => t.cyl('y', -TY, TY, 18, [-40 + i * 20, 0, top - TY / 2], 10)))]));
    for (const e of [-1, 1]) for (const x of [140, 420]) t.add(MAT.grip, t.rod([e * x, -TY / 2, top - 20], [e * (x + 40), -220, top + 36], 32, 16));
    t.add(F, t.box([-inner, yR - TY / 2, top - TY], [inner, yR + TY / 2, top]));
    t.add(F, t.box([-inner, yR - TY / 2 - 6, 1640], [inner, yR - TY / 2, 1860]), t.box([-inner, yR - TY / 2, 1600], [inner, yR + TY / 2, 1640]));
    t.add(mat('White MAJOR FITNESS lettering', '#e3e3df', 0, .6), t.label('MAJOR FITNESS', 420, 70, 1, [30, yR - TY / 2 - 6, 1750], [1, 0, 0], [0, 0, 1]));
    for (const x of [-300, -100, 100, 300]) t.add(MAT.zinc, t.cyl('z', 1540, 1600, 10, [x, yR - 40, 0], 8));
    // Smith bar at the selected hook: carriages on the guide rods, knurled shaft, sleeves out to the published width.
    const zs = 400 + (p.smith - 1) * 150 + 60, bw = D.width / 2;
    for (const e of [-1, 1]) {
      t.add(F, t.box([e * ux - 42, 120, zs - 90], [e * ux + 42, 200, zs + 90]), t.box([e * ux - 42, 100, zs - 30], [e * ux + 42, 120, zs + 30]));
      t.add(MAT.stainless, t.cyl('x', e > 0 ? ux + 42 : -bw, e > 0 ? bw : -ux - 42, 50, [0, 110, zs], 28));
      t.add(MAT.stainless, t.cyl('x', e > 0 ? ux + 42 : -ux - 60, e > 0 ? ux + 60 : -ux - 42, 64, [0, 110, zs], 28));
    }
    t.add(MAT.chrome, t.cyl('x', -ux + 42, ux - 42, 30, [0, 110, zs], 24));
  });
}
export const definitions: PartDefinition[] = [
  floorDefinition(MAJOR_B52, buildMajorB52),
  floorDefinition(FORCE_FTR, buildForceFtr),
  floorDefinition(REP_ADONIS, buildRepAdonis),
  floorDefinition(INSPIRE_FTX, buildInspireFtx),
  floorDefinition(REP_ARCADIA, buildRepArcadia),
  floorDefinition(TITAN_PULLEY_TOWER, buildTitanPulleyTower),
  floorDefinition(TITAN_PLATE_LAT, buildTitanPlateLat),
  floorDefinition(TITAN_LAT_TOWER, buildTitanLatTower),
  floorDefinition(BOS_LAT_PULLDOWN, buildBosLatPulldown),
  floorDefinition(BOS_CABLE_TOWER, buildBosCableTower),
  floorDefinition(TOG_MULTI_FLIGHT, buildTogMultiFlight),
];
