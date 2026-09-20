/** Curved self-powered treadmills (AssaultRunner Pro / Elite), BowFlex Max Trainer M6, WaterRower, StairMaster 8Gx StepMill
 * and Sole E35 elliptical. Side-profile coordinates as in cardio-kit.ts (s from the machine front, h up). */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { ASSAULTRUNNER_ELITE, ASSAULTRUNNER_PRO, MAX_TRAINER_M6, SOLE_E35, STAIRMASTER_8GX, WATERROWER, waterRowerWood } from '../floor-parts/cardio.ts';
import { F, finish, withCardioKit, type CardioKit, type Finish } from './cardio-kit.ts';
import { sideWord } from './cardio-bikes.ts';

/** Side-profile polygon [s, h] extruded across x0..x0+t. */
const profile = (K: CardioKit, pts: Vec2[], x0: number, t: number, round = 0) => K.plate(pts.map(([s, h]) => [s - K.L / 2, h] as Vec2), x0, t, round);

// ------------------------------------------------------------------------------------------------ AssaultRunner Pro / Elite
/** Running-surface curve (belt top h at s), fitted through the Pro side profile: front lip, dip at mid-deck, rear lip. */
export const runnerCurve = (s: number) => 1.4737e-4 * s * s - .3164 * s + 618.4;
export function buildAssaultRunner(api: ManifoldAPI, elite: boolean): SolidPart[] {
  const env = elite ? ASSAULTRUNNER_ELITE : ASSAULTRUNNER_PRO, { L, W, H } = env, belt = env.belt[0];
  return withCardioKit(api, elite ? 'AssaultRunner Elite' : 'AssaultRunner Pro', L, K => {
    const P = K.P, cover = elite ? finish('source', '#4b4e52', .35, .45) : finish('source', '#3b3d41', .15, .55), dark = finish('source', '#1a1b1d', .1, .6);
    const post = elite ? finish('source', '#55585d', .55, .35) : finish('source', '#1c1d1f', .3, .45), red = finish('source', '#e2231a', .05, .45);
    // Banana side covers: top edge follows the running curve, rounded ends, flat-ish underside.
    // The slats ride just above the cover's top edge; both ends are rounded bumpers.
    const s0 = 150, s1 = L - 150, top: Vec2[] = [];
    for (let i = 0; i <= 24; i++) { const s = s1 - (s1 - s0) * i / 24; top.push([s, runnerCurve(s) - 22]); }
    const endR = 150, rearC: Vec2 = [L - endR, runnerCurve(L - endR) - 22 - endR], frontC: Vec2 = [endR, runnerCurve(endR) - 22 - endR];
    const arcPts = (c: Vec2, a0: number, a1: number): Vec2[] => Array.from({ length: 9 }, (_, i) => { const a = (a0 + (a1 - a0) * i / 8) * Math.PI / 180; return [c[0] + endR * Math.cos(a), c[1] + endR * Math.sin(a)]; });
    const outline: Vec2[] = [[1100, 66], [1640, 104], [rearC[0], Math.min(104, rearC[1] - endR)], ...arcPts(rearC, -60, 90).slice(1), ...top, ...arcPts(frontC, 90, 240), [320, 78]];
    const half = belt / 2 + 72;
    for (const x of [-1, 1]) K.add('Side covers', cover, profile(K, outline, x > 0 ? belt / 2 + 6 : -half, half - belt / 2 - 6, 0));
    K.add('Deck frame', dark, profile(K, [[90, 120], [L - 90, 120], ...top.map(([s, h]) => [s, h - 90] as Vec2).filter(([s]) => s > 90 && s < L - 90)], -belt / 2 - 6, belt + 12, 0));
    // Slats on the running surface (62 in the loop; the top run shown), each square to the curve.
    const n = 50;
    for (let i = 0; i < n; i++) {
      const s = s0 + 30 + (s1 - s0 - 60) * (i + .5) / n, h = runnerCurve(s), slope = 2 * 1.4737e-4 * s - .3164, ang = Math.atan(slope) * 180 / Math.PI;
      const slat = K.rotate(K.box([belt, 26, 16], [0, 0, -8]), [ang, 0, 0]);
      K.add('Running slats', finish('liner', '#202123', 0, .9), K.move(slat, P(s, h)));
    }
    // Feet, front transport wheels, rear lift handle.
    for (const x of [-1, 1]) {
      K.add('Levelling feet', F.rubber, K.disc(P(1470, 10, x * 210), 'z', 60, 20, 20), K.rod(P(1470, 15, x * 210), P(1470, 75, x * 210), 18, 12));
      const w = K.wheel(P(250, 45, x * 225), 90, 36);
      K.add('Transport wheels', F.rubber, w.tyre); K.add('Transport wheels', F.plasticGrey, w.hub);
    }
    K.add('Rear handle', dark, K.pipe([P(1620, 110, -200), P(L - 60, 120, -170), P(L - 60, 120, 170), P(1620, 110, 200)], 28, 14));
    // Wordmarks on the side covers.
    for (const x of [-1, 1] as const) {
      // "ASSAULT FITNESS" reads rear-to-front on one side and front-to-rear on the other: ASSAULT always comes first.
      const [sa, sf] = x > 0 ? [1170, 1450] : [1470, 1190];
      sideWord(K, 'ASSAULT', 46, P(sa - 40, 250), P(sa + 40, 250), .5, x, half, elite ? ['Cover lettering · black', finish('source', '#121314', .1, .4)] : ['Cover lettering · red', red], 230);
      sideWord(K, 'FITNESS', 40, P(sf - 40, 250), P(sf + 40, 250), .5, x, half, ['Cover lettering', finish('source', '#b7babd', .1, .5)], 220);
    }
    // Posts: oval (Pro) or wing-foil (Elite), leaning forward, outside the side covers.
    const px = half + 40, pBase: Vec2 = [785, 300], pTop: Vec2 = [665, 1215];
    for (const x of [-1, 1] as const) {
      K.add('Posts', post, K.bar(P(pBase[0], pBase[1], x * px), P(pTop[0], pTop[1], x * px), elite ? 44 : 70, elite ? 150 : 128, elite ? 20 : 34));
      K.add('Posts', post, K.span(P(700, 240, x * px - 45), P(880, 330, x * px + 45)));
      if (!elite) sideWord(K, 'ASSAULTRUNNER PRO', 44, P(pBase[0], pBase[1]), P(pTop[0], pTop[1]), .38, x, px + 35, ['Post lettering · red', red], 560);
      else sideWord(K, 'ASSAULTRUNNER ELITE', 36, P(pBase[0], pBase[1]), P(pTop[0], pTop[1]), .4, x, px + 22, ['Post lettering', finish('source', '#26282b', .2, .4)], 520);
    }
    const rx = W / 2 - 19;
    if (!elite) {
      // Pro: tubular loop — side rails back to the grips, sweeping up and forward to a U over the front.
      for (const x of [-1, 1]) K.add('Handrails', dark, K.pipe([P(1105, 1228, x * rx), P(720, 1236, x * rx), P(560, 1262, x * rx), P(260, 1440, x * (rx - 60)), P(135, 1510, x * (rx - 120))], 38, 16));
      K.add('Handrails', dark, K.pipe([P(135, 1510, -(rx - 120)), P(95, 1530, -(rx - 170)), P(95, 1530, rx - 170), P(135, 1510, rx - 120)], 38, 16));
      for (const x of [-1, 1]) K.add('Handrails', dark, K.rod(P(pTop[0], pTop[1], x * px), P(660, 1236, x * rx), 40, 16));
    } else {
      // Elite: swept wing handlebar with twin cup holders and flat side grips.
      for (const x of [-1, 1]) {
        K.add('Handrails', post, K.pipe([P(720, 1236, x * (px + 10)), P(520, 1300, x * (px - 10)), P(220, 1470, x * (px - 40)), P(120, 1510, x * (px - 100))], 46, 16));
        K.add('Side grips', F.foam, K.span(P(820, 1215, x * rx - 19), P(1120, 1245, x * rx + 19)));
        K.add('Handrails', post, K.bar(P(pTop[0], pTop[1], x * px), P(830, 1230, x * (W / 2 - 22)), 44, 40, 12));
        K.add('Cup holders', dark, K.disc(P(190, 1478, x * 150), 'z', 96, 90, 24));
      }
      K.add('Handrails', post, K.hull([K.sphere(P(120, 1510, -(px - 100)), 50, 14), K.sphere(P(120, 1510, px - 100), 50, 14), K.sphere(P(200, 1480, 0), 60, 14)]));
    }
    // Battery console on its stalk, top at the published height.
    const r = 30 * Math.PI / 180, ch = 150;
    K.screen(150, ch, 34, P(115 + 34 * Math.cos(r) + ch / 2 * Math.sin(r), H - ch / 2 * Math.cos(r)), [0, Math.cos(r), Math.sin(r)], [0, -Math.sin(r), Math.cos(r)], [118, 90]);
    K.add('Console stalk', dark, K.rod(P(150, 1500), P(170, H - 100), 30, 14));
  });
}

// ------------------------------------------------------------------------------------------------ BowFlex Max Trainer M6
export function buildMaxTrainer(api: ManifoldAPI): SolidPart[] {
  const { L, W, H } = MAX_TRAINER_M6;
  return withCardioKit(api, 'Max Trainer M6', L, K => {
    const P = K.P, shroud = finish('source', '#d9dcdf', .2, .45), trim = finish('source', '#3a3c40', .2, .5), black = finish('source', '#161719', .15, .5);
    const red = finish('source', '#d8202c', .1, .4);
    // Tower shroud (silver-white) with dark edge bands.
    const tower: Vec2[] = [[0, 70], [440, 70], [440, 300], [418, 560], [330, 880], [230, 1050], [140, 1127], [40, 1000], [0, 800]];
    K.add('Tower shroud', shroud, profile(K, tower, -135, 270, 20));
    K.add('Tower trim', trim, profile(K, tower.map(([s, h]) => [s < 220 ? Math.max(0, s - 8) : s + 8, h + (h > 900 ? 8 : 0)] as Vec2), -118, 236, 20));
    // Resistance fan (front, low) with red ring; upper magnetic disc cover; MAX lettering.
    for (const x of [-1, 1]) {
      K.add('Fan housing', black, K.disc(P(246, 253, x * 150), 'x', 408, 30, 56));
      K.add('Fan ring', red, K.ring(P(246, 253, x * 166), 'x', 400, 350, 4, 56));
      K.add('Fan housing', finish('source', '#2c2e31', .4, .4), K.disc(P(246, 253, x * 168), 'x', 150, 6, 32));
      K.add('Upper disc cover', trim, K.disc(P(200, 814, x * 138), 'x', 316, 10, 48));
      const m = K.word('MAX', 70, P(190, 560, x * 135.2), [0, x, 0], [0, 0, 1], 1, 160); if (m) K.add('Tower lettering', black, m);
    }
    // Base rail and feet.
    K.add('Base', black, K.bar(P(40, 26), P(1090, 26), 70, 44, 10));
    for (const s of [60, 1090]) K.add('Base', black, K.bar(P(s, 22, -250), P(s, 22, 250), 60, 40, 10, [0, 1, 0]));
    for (const s of [60, 1090]) for (const x of [-1, 1]) K.add('Levelling feet', F.rubber, K.disc(P(s, 5, x * 235), 'z', 44, 10, 16));
    // Pedals (one high, one low) on their links from the tower.
    for (const [x, lo] of [[-1, true], [1, false]] as const) {
      const h = lo ? 210 : 480, px = x * 95;
      K.add('Pedals', black, K.move(K.pad(150, L - 668, 40, 30, [0, 0, 0]), P((668 + L) / 2, h - 30, px)));
      K.add('Pedal treads', F.rubber, K.move(K.pad(136, L - 700, 4, 26, [0, 0, 0]), P((668 + L) / 2, h + 10, px)));
      K.add('Pedal links', black, K.bar(P(400, 560, px), P(760, h - 20, px), 34, 50, 10), K.bar(P(700, h - 30, px), P(460, 110, px), 30, 44, 10));
    }
    // Moving handles (pivot high on the tower) with the tips at the published height; fixed four-grip bar; console.
    const pivot = P(400, 1020);
    for (const [x, fwd] of [[-1, true], [1, false]] as const) {
      const tip = P(fwd ? 170 : 440, H - 20, x * (W / 2 - 20));
      K.add('Moving handles', black, K.pipe([[x * 150, pivot[1], pivot[2]], [x * (W / 2 - 60), pivot[1] + (fwd ? -40 : 20), pivot[2] + 180], [tip[0], tip[1], tip[2] - 150]], 36, 14));
      K.add('Handle grips', F.foam, K.rod([tip[0], tip[1], tip[2] - 170], tip, 40, 16), K.sphere(tip, 40, 12));
      K.add('Moving handles', black, K.bar([x * 150, pivot[1], pivot[2]], P(fwd ? 560 : 360, 560, x * 150), 34, 44, 10));
    }
    K.add('Pivot hub', trim, K.disc(pivot, 'x', 90, 320, 32));
    for (const x of [-1, 1]) K.add('Fixed handlebar', F.foam, K.pipe([P(420, 1150, x * 110), P(560, 1170, x * 150), P(720, 1110, x * 170)], 34, 14));
    K.add('Console mast', black, K.bar(P(360, 1060), P(380, 1260), 80, 60, 16));
    const r = 25 * Math.PI / 180;
    K.screen(230, 190, 50, P(420, 1330), [0, Math.cos(r), Math.sin(r)], [0, -Math.sin(r), Math.cos(r)], [120, 70], black);
    K.add('Console accent', red, K.span(P(418, 1390, -80), P(424, 1400, 80)));
  });
}

// ------------------------------------------------------------------------------------------------ WaterRower
export function buildWaterRower(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const { L, W, H } = WATERROWER, wood = waterRowerWood(p), stored = !!p.pose;
  return withCardioKit(api, 'WaterRower', L, K => {
    const P = K.P, oak = finish('source', wood.color, 0, .55), black = finish('source', '#141517', .2, .45), tankF = finish('source', '#8d9ca6', .2, .06);
    // Twin rails with seat tracks; front base board spanning the published width; feet.
    for (const x of [-1, 1]) {
      K.add('Solid wood frame', oak, K.span(P(30, 18, x * 125 - 17), P(L, 146, x * 125 + 17)));
      K.add('Seat tracks', finish('source', '#1d1e20', .6, .35), K.span(P(700, 146, x * 125 - 12), P(L - 40, 160, x * 125 + 12)));
      K.add('Rubber feet', F.rubber, K.span(P(L - 130, 0, x * 125 - 20), P(L - 40, 18, x * 125 + 20)), K.span(P(370, 0, x * 125 - 20), P(470, 18, x * 125 + 20)));
    }
    K.add('Solid wood frame', oak, K.span(P(0, 22, -W / 2), P(95, 70, W / 2)), K.span(P(95, 40, -150), P(560, 118, 150)), K.span(P(1900, 18, -150), P(1950, 110, 150)));
    for (const x of [-1, 1]) {
      const w = K.wheel(P(40, 38, x * (W / 2 - 13)), 76, 26);
      K.add('Front wheels', F.rubber, w.tyre); K.add('Front wheels', black, w.hub);
    }
    // Water tank (clear polycarbonate) with its black filler cap.
    K.add('Water tank', tankF, K.lathe([[0, -98], [240, -98], [268, -70], [272, 0], [268, 70], [240, 98], [0, 98]], P(431, 232), 'z', 64));
    K.add('Tank water', finish('source', '#6c8a9a', .1, .2), K.disc(P(431, 200), 'z', 520, 110, 48));
    K.add('Tank cap', black, K.disc(P(431, 336), 'z', 110, 14, 28));
    // Front posts, top and middle rails, A-frame footboard, footplates with straps.
    for (const x of [-1, 1]) {
      K.add('Solid wood frame', oak, K.span(P(15, 118, x * 60 - 17), P(95, H - 12, x * 60 + 17)));
      K.add('Solid wood frame', oak, K.span(P(95, H - 42, x * 60 - 15), P(610, H - 12, x * 60 + 15)), K.span(P(95, 350, x * 60 - 15), P(590, 380, x * 60 + 15)));
    }
    K.add('Solid wood frame', oak, K.bar(P(935, 150), P(610, 488), 250, 36, 4, [1, 0, 0]));
    for (const x of [-1, 1]) {
      K.add('Footplates', black, K.bar(P(860, 222, x * 62), P(700, 390, x * 62), 110, 14, 4, [1, 0, 0]));
      K.add('Foot straps', black, K.bar(P(775, 305, x * 62), P(760, 320, x * 62), 124, 30, 6, [1, 0, 0]));
    }
    // S4 monitor on the footboard top, the handle and strap; pulley cap on the front posts.
    const r = 40 * Math.PI / 180;
    K.screen(170, 125, 40, P(612, H - 64), [0, Math.cos(r), Math.sin(r)], [0, -Math.sin(r), Math.cos(r)], [120, 70], black);
    K.add('Handle', black, K.rod(P(655, 455, -230), P(655, 455, 230), 30, 16));
    K.add('Handle', F.foam, K.rod(P(655, 455, -225), P(655, 455, -110), 34, 16), K.rod(P(655, 455, 110), P(655, 455, 225), 34, 16));
    K.add('Strap', black, K.span(P(40, 460, -18), P(655, 468, 18)));
    K.add('Pulley cap', black, K.disc(P(55, H - 30, 0), 'x', 60, 150, 24));
    // Sliding seat: wooden carriage on four wheels with a black cushion.
    K.add('Solid wood frame', oak, K.span(P(1580, 175, -150), P(1830, 270, 150)));
    for (const s of [1600, 1810]) for (const x of [-1, 1]) K.add('Seat wheels', black, K.disc(P(s, 172, x * 110), 'x', 44, 20, 16));
    K.add('Seat cushion', finish('source', '#161718', 0, .85), K.move(K.pad(300, 260, 50, 30, [0, 0, 0]), P(1705, 270)));
    if (stored) K.transformGroups(K.groupNames(), (s: Manifold) => K.rotate(s, [90, 0, 0]));
  });
}

// ------------------------------------------------------------------------------------------------ StairMaster 8Gx
export function buildStairMaster(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const { L, W, H, step } = STAIRMASTER_8GX;
  return withCardioKit(api, 'StairMaster 8Gx', L, K => {
    const P = K.P, body = finish('source', '#1a1b1d', .2, .45), boss = finish('source', '#3a3c40', .4, .35), red = finish('source', '#d8262c', .1, .4);
    const inner = 290, outer = 400;
    // Side covers: tall front, sloping top along the stair line, sprocket bosses top-front and bottom-rear.
    const cover: Vec2[] = [[70, 30], [1290, 30], [1335, 110], [1345, 300], [1310, 440], [380, 1225], [200, 1240], [60, 1130], [0, 960], [15, 90]];
    for (const x of [-1, 1]) {
      K.add('Side covers', body, profile(K, cover, x > 0 ? inner : -outer, outer - inner, 24));
      K.add('Sprocket bosses', boss, K.disc(P(257, 967, x * (outer + 6)), 'x', 500, 12, 64), K.disc(P(1086, 287, x * (outer + 6)), 'x', 430, 12, 56));
      K.add('Sprocket bosses', body, K.disc(P(257, 967, x * (outer + 13)), 'x', 380, 4, 64), K.disc(P(1086, 287, x * (outer + 13)), 'x', 320, 4, 56));
      const m = K.word('StairMaster', 38, P(300, 250, x * (outer + .1)), [0, x, 0], [0, 0, 1], 1, 230); if (m) K.add('Cover lettering', finish('source', '#8d9094', .2, .4), m);
    }
    K.add('Side covers', body, profile(K, [[20, 30], [260, 30], [260, 1180], [120, 1200], [20, 1050]], -inner, 2 * inner, 20));
    // Revolving staircase: four visible 9 in steps along the incline, risers, rubber nosings.
    for (let i = 0; i < 4; i++) {
      const s = 1230 - i * 245, h = 400 + i * step;
      K.add('Steps', finish('source', '#232427', .3, .5), K.span(P(s - 120, h - 26, -inner + 8), P(s + 125, h, inner - 8)));
      K.add('Step treads', F.rubber, K.span(P(s - 112, h, -inner + 20), P(s + 118, h + 4, inner - 20)));
      K.add('Steps', finish('source', '#232427', .3, .5), K.span(P(s - 125, h - step, -inner + 8), P(s - 110, h - 26, inner - 8)));
    }
    K.add('Rear bumper', body, K.span(P(1330, 260, -inner - 20), P(L, 330, inner + 20)));
    K.add('Rear bumper accent', red, K.span(P(L - 20, 290, -inner), P(L + .01, 300, inner)));
    // Handrails: long side rails from the front hook, down the stair line, rear loop and support posts.
    const rx = W / 2 - 19;
    for (const x of [-1, 1]) {
      K.add('Handrails', finish('source', '#1d1e20', .2, .5), K.pipe([P(330, 1930, x * (rx - 60)), P(370, 1790, x * (rx - 40)), P(480, 1760, x * rx), P(960, 1610, x * rx), P(1150, 1520, x * rx), P(1215, 1380, x * rx), P(1150, 1240, x * rx), P(960, 1465, x * rx)], 38, 16));
      K.add('Handrails', finish('source', '#1d1e20', .2, .5), K.rod(P(960, 1465, x * rx), P(880, 1050, x * (outer - 20)), 38, 16), K.rod(P(390, 1780, x * (rx - 40)), P(300, 1230, x * 200), 40, 16));
      K.add('Handrail grips', F.foam, K.rod(P(520, 1748, x * (rx - 2)), P(900, 1628, x * (rx - 2)), 42, 16));
    }
    // Console mast and display (16 in touch or LED), top at the published height.
    const touch = !p.console, r = 18 * Math.PI / 180, dh = touch ? 330 : 360, dt = 60;
    K.add('Console mast', body, K.bar(P(230, 1150), P(170, H - dh + 40), 110, 80, 20));
    K.add('Console mast', body, K.span(P(150, 1690, -150), P(260, 1760, 150)));
    K.screen(touch ? 440 : 400, dh, dt, P(dt * Math.cos(r) + dh / 2 * Math.sin(r) + 1, H - dh / 2 * Math.cos(r)), [0, Math.cos(r), Math.sin(r)], [0, -Math.sin(r), Math.cos(r)], touch ? [352, 200] : [300, 250], finish('source', '#111214', .1, .45), touch ? 25 : 0);
    // Front transport wheels and rear levellers.
    for (const x of [-1, 1]) {
      const w = K.wheel(P(110, 50, x * (inner + 55)), 100, 34);
      K.add('Transport wheels', F.rubber, w.tyre); K.add('Transport wheels', F.plasticGrey, w.hub);
      K.add('Levelling feet', F.rubber, K.disc(P(1240, 15, x * (inner + 55)), 'z', 60, 30, 20));
    }
  });
}

// ------------------------------------------------------------------------------------------------ Sole E35 elliptical
export function buildSoleE35(api: ManifoldAPI): SolidPart[] {
  const { L, W, H } = SOLE_E35;
  return withCardioKit(api, 'Sole E35', L, K => {
    const P = K.P, gloss = finish('source', '#141517', .3, .35), frame = finish('source', '#1d1e20', .3, .45), red = finish('source', '#d4212b', .1, .4);
    // Teardrop flywheel housing: lower disc hulled to the mast root.
    K.add('Flywheel housing', gloss, K.hull([K.disc(P(400, 430), 'x', 770, 230, 64), K.disc(P(320, 850), 'x', 140, 170, 24)]));
    for (const x of [-1, 1]) {
      K.add('Housing badge', F.plastic, K.disc(P(369, 369, x * 116), 'x', 250, 3, 48));
      K.add('Housing badge ring', red, K.ring(P(369, 369, x * 118), 'x', 250, 226, 2, 48));
      const m = K.word('SOLE', 46, P(369, 385, x * 118.2), [0, x, 0], [0, 0, 1], .8, 150); if (m) K.add('Badge lettering', F.white, m);
      const e = K.word('E35', 30, P(369, 330, x * 118.2), [0, x, 0], [0, 0, 1], .8, 80); if (e) K.add('Badge lettering · red', red, e);
    }
    // Front stabiliser, rear frame with twin chrome rails and the rear end cap with wheels.
    K.add('Base frame', frame, K.move(K.pad(620, 150, 55, 40, [0, 0, 0]), P(75, 0)));
    for (const x of [-1, 1]) K.add('Levelling feet', F.rubber, K.disc(P(80, 4, x * 280), 'z', 50, 8, 16));
    K.add('Base frame', frame, K.bar(P(500, 90), P(L - 120, 90), 240, 60, 14));
    for (const x of [-1, 1]) K.add('Chrome rails', F.chrome, K.rod(P(850, 135, x * 110), P(1590, 135, x * 110), 34, 18));
    K.add('Rear end cap', F.plastic, K.move(K.pad(420, 130, 150, 30, [0, 0, 0]), P(L - 65, 10)));
    for (const x of [-1, 1]) {
      const w = K.wheel(P(L - 60, 40, x * 225), 70, 26);
      K.add('Transport wheels', F.rubber, w.tyre); K.add('Transport wheels', F.plasticGrey, w.hub);
    }
    // Pedal arms from the crank to the rail rollers, cushioned footplates (one high, one low).
    for (const [x, hi] of [[-1, true], [1, false]] as const) {
      const px = x * 115, crank = P(400 + (hi ? -90 : 90) * 0, hi ? 520 : 340, px), roller = P(1500, 160, px);
      K.add('Pedal arms', frame, K.bar(crank, roller, 40, 60, 12));
      const mid = (a: number) => [0, crank[1] + (roller[1] - crank[1]) * a, crank[2] + (roller[2] - crank[2]) * a] as Vec3;
      const a = mid(.5), fh = a[2] + 40;
      K.add('Footplates', F.plastic, K.move(K.pad(150, 430, 36, 30, [0, 0, 0]), [px, a[1], fh]));
      K.add('Footplate cushions', F.rubber, K.move(K.pad(136, 400, 6, 26, [0, 0, 0]), [px, a[1], fh + 36]));
      K.add('Pedal arms', F.steel, K.disc(roller, 'x', 60, 30, 20));
    }
    // Console mast (curving up and back) with the 10.1 in touchscreen; moving arms; fixed grips.
    K.add('Console mast', frame, K.pipe([P(320, 840), P(360, 1000), P(430, 1180), P(470, 1330)], 70, 18));
    const r = 34 * Math.PI / 180;
    K.screen(330, 250, 60, P(420, 1480), [0, Math.cos(r), Math.sin(r)], [0, -Math.sin(r), Math.cos(r)], [222, 125], F.plastic);
    K.add('Console accent', red, K.span(P(438, 1395, -150), P(442, 1399, 150)));
    const pivot = P(584, 1100);
    K.add('Arm pivot', frame, K.disc(pivot, 'x', 90, 300, 28));
    for (const x of [-1, 1]) {
      const tip = P(560, H - 25, x * (W / 2 - 25));
      K.add('Moving arms', frame, K.pipe([[x * 150, pivot[1], pivot[2]], [x * (W / 2 - 60), pivot[1], pivot[2] + 120], [tip[0], tip[1] + 10, tip[2] - 200]], 40, 14));
      K.add('Arm grips', F.foam, K.rod([tip[0], tip[1] + 10, tip[2] - 220], tip, 50, 16), K.sphere(tip, 50, 12));
      K.add('Moving arms', frame, K.bar([x * 150, pivot[1], pivot[2]], P(900, 480, x * 150), 36, 48, 10));
      K.add('Fixed grips', F.foam, K.pipe([P(470, 1330, x * 60), P(560, 1360, x * 120), P(620, 1300, x * 150)], 36, 14));
    }
  });
}
export type { Finish };
