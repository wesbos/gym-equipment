/** Indoor cycling bikes: Peloton Bike / Bike+, Schwinn IC4, Sunny SF-B1002.
 * Side-profile coordinates: s mm back from the front extreme, h mm up (see cardio-kit.ts `P`). Each frame is placed so the
 * front and rear extremes land exactly on the published length and the stabilisers span the published width. */
import type { ManifoldAPI, SolidPart, Vec3, Manifold } from '../types.ts';
import { PELOTON_BIKE, PELOTON_BIKE_PLUS, SCHWINN_IC4, SUNNY_B1002 } from '../floor-parts/cardio.ts';
import { F, finish, withCardioKit, type CardioKit, type Finish } from './cardio-kit.ts';

type Side = 1 | -1;
const unit = (a: Vec3, b: Vec3): Vec3 => { const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return [d[0] / l, d[1] / l, d[2] / l]; };
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Typeset lettering on the ±X face of a frame member running a→b, `off` = half the member width. */
export function sideWord(K: CardioKit, str: string, h: number, a: Vec3, b: Vec3, t: number, side: Side, off: number, mat: [string, Finish], maxW = Infinity) {
  const d = unit(a, b), c = lerp(a, b, t), at: Vec3 = [side * (off + .1), c[1], c[2]];
  const u: Vec3 = side > 0 ? d : [0, -d[1], -d[2]], v: Vec3 = [0, -d[2], d[1]];
  const upright: Vec3 = v[2] < 0 ? [0, -v[1], -v[2]] : v, uu: Vec3 = v[2] < 0 ? [0, -u[1], -u[2]] : u;
  const w = K.word(str, h, at, uu, upright, 1, maxW); if (w) K.add(...mat, w);
}
/** Transverse stabiliser foot: rounded bar `depth` long (Y) across `width`, top at h, with rubber end caps and levellers. */
function stabiliser(K: CardioKit, s: number, width: number, depth: number, h: number, frame: Finish, caps: Finish, feet: number[]) {
  const cap = 70;
  K.add('Frame', frame, K.bar(K.P(s, h / 2, -(width / 2 - cap)), K.P(s, h / 2, width / 2 - cap), depth, h - 12, 10, [0, 1, 0]));
  for (const x of [-1, 1]) {
    K.add('Stabiliser end caps', caps, K.move(K.pad(cap + 6, depth + 6, h - 8, 14, [0, 0, 0]), K.P(s, 8, x * (width / 2 - (cap + 6) / 2))));
  }
  for (const x of feet) K.add('Levelling feet', F.rubber, K.disc(K.P(s, 4, x), 'z', 38, 8, 20));
}
/** Pair of crank arms (170 mm) with platform pedals; `angle` of the +X arm from vertical-down, degrees. */
function crankset(K: CardioKit, s: number, h: number, halfTrack: number, angle: number, pedal: Finish) {
  const hub = K.P(s, h, 0);
  K.add('Cranks and axle', F.steel, K.disc(hub, 'x', 50, 2 * halfTrack - 20, 24));
  for (const side of [-1, 1] as Side[]) {
    const a = (angle + (side > 0 ? 0 : 180)) * Math.PI / 180, end = K.P(s + 170 * Math.sin(a), h - 170 * Math.cos(a), side * halfTrack);
    K.add('Cranks and axle', F.steel, K.bar([side * halfTrack, hub[1], hub[2]], end, 14, 34, 6, [1, 0, 0]));
    K.add('Pedals', pedal, K.pad(95, 105, 22, 10, [end[0] + side * 60, end[1], end[2] - 11]));
    K.add('Cranks and axle', F.steel, K.disc([end[0] + side * 12, end[1], end[2]], 'x', 22, 24, 16));
  }
}
/** Saddle: hull of a wide rear pad and a narrow nose, `top` = highest point. */
function saddle(K: CardioKit, nose: number, tail: number, top: number, w: number, cover: Finish, base: Finish) {
  const rear = K.pad(w, 95, 42, 30, [0, 0, 0]), front = K.pad(58, 50, 34, 20, [0, 0, 0]);
  K.add('Saddle', cover, K.hull([K.move(rear, K.P(tail - 55, top - 42)), K.move(front, K.P(nose + 25, top - 36))]));
  K.add('Saddle rails', base, K.hull([K.move(K.pad(w - 40, 60, 14, 14, [0, 0, 0]), K.P(tail - 60, top - 56)), K.move(K.pad(40, 40, 12, 10, [0, 0, 0]), K.P(nose + 40, top - 50))]));
}
/** Bull-horn / multi-grip handlebar: rear bar at (sRear, hRear) across ±rearX, horns forward to (sTip, hTip) at ±tipX. */
function handlebar(K: CardioKit, o: { sRear: number; hRear: number; rearX: number; sMid: number; hMid: number; midX: number; sTip: number; hTip: number; tipX: number; d: number; center: [number, number] }, grip: Finish, clamp: Finish) {
  for (const x of [-1, 1]) {
    K.add('Handlebar grips', grip, K.pipe([K.P(o.sRear, o.hRear, 0), K.P(o.sRear, o.hRear, x * o.rearX), K.P(o.sMid, o.hMid, x * o.midX), K.P(o.sTip + 60, o.hTip - 40, x * o.tipX), K.P(o.sTip + o.d / 2, o.hTip - o.d / 2, x * o.tipX)], o.d, 16));
  }
  K.add('Handlebar clamp', clamp, K.bar(K.P(o.center[0], o.center[1] - 70), K.P(o.sRear, o.hRear), 44, 40, 8));
}
function knob(K: CardioKit, at: Vec3, dir: Vec3, stalk: number, d: number, color: Finish) {
  const end: Vec3 = [at[0] + dir[0] * stalk, at[1] + dir[1] * stalk, at[2] + dir[2] * stalk];
  K.add('Adjustment knobs', F.steel, K.rod(at, end, 12, 12));
  K.add('Adjustment knobs', color, K.cone(end, [end[0] + dir[0] * d * .9, end[1] + dir[1] * d * .9, end[2] + dir[2] * d * .9], d, d * .8, 16));
}

// ------------------------------------------------------------------------------------------------ Peloton Bike / Bike+
/** Peloton original-series frame. `plus` = Bike+ (graphite, 23.8 in screen on the swivel arm); else Bike (21.5 in on its tilting post). */
export function buildPelotonBike(api: ManifoldAPI, plus: boolean): SolidPart[] {
  const env = plus ? PELOTON_BIKE_PLUS : PELOTON_BIKE, L = env.L, W = env.W;
  return withCardioKit(api, plus ? 'Peloton Bike+' : 'Peloton Bike', L, K => {
    const frame = plus ? finish('source', '#2e3033', .25, .5) : finish('source', '#1c1d1f', .15, .62);
    const trim = finish('source', '#151618', .1, .55), guard = plus ? finish('source', '#55585c', .7, .35) : finish('source', '#b9bcbf', .85, .28);
    const disc = plus ? finish('source', '#9d1426', .2, .45) : finish('source', '#d0102b', .1, .42), P = K.P;
    // Stabilisers: rear T-foot and front foot with transport wheels.
    stabiliser(K, 1230, W, 95, 55, frame, trim, [-W / 2 + 60, W / 2 - 60]);
    stabiliser(K, 112, W, 100, 58, frame, trim, [-W / 2 + 70, W / 2 - 70]);
    for (const x of [-1, 1]) {
      const w = K.wheel(P(40, 30, x * (W / 2 - 50)), 56, 26);
      K.add('Transport wheels', F.rubber, w.tyre); K.add('Transport wheels', F.plasticGrey, w.hub);
      K.add('Frame', frame, K.span(P(40, 28, x * (W / 2 - 68)), P(112, 55, x * (W / 2 - 34))));
    }
    // Frame: rear leg, seat tube, down tube ("PELOTON"), lower beam and the fork straddling the front flywheel.
    const seatFoot = P(1029, 380), head = P(399, 985), rearFoot = P(1235, 50), frontFoot = P(112, 55);
    K.add('Frame', frame, K.bar(rearFoot, seatFoot, 64, 78, 18));
    K.add('Frame', frame, K.bar(P(1033, 360), P(1069, 730), 66, 92, 18));
    const dtA = P(1040, 405), dtB = P(390, 1000);
    K.add('Frame', frame, K.bar(dtA, dtB, 72, 118, 26));
    K.add('Frame', frame, K.bar(P(930, 470), P(262, 565), 52, 64, 14));
    K.add('Frame', frame, K.bar(head, P(300, 820), 76, 92, 20));
    for (const x of [-1, 1]) K.add('Frame', frame, K.bar(P(300, 830, x * 40), P(frontFoot[1] + L / 2, 60, x * 40), 16, 78, 6));
    K.add('Frame', frame, K.hull([K.sphere(P(399, 985), 96, 20), K.sphere(P(405, 930), 90, 20)]));
    K.add('Frame', frame, K.hull([K.sphere(P(1036, 400), 96, 20), K.sphere(P(980, 430), 90, 20)]));
    sideWord(K, 'PELOTON', 44, dtA, dtB, .42, 1, 36, ['Frame lettering', finish('source', '#cfd1d3', .2, .5)], 330);
    sideWord(K, 'PELOTON', 44, dtA, dtB, .42, -1, 36, ['Frame lettering', finish('source', '#cfd1d3', .2, .5)], 330);
    // Flywheel (front) in its black cover, and the drive: red crank disc and the silver belt guard with its window.
    const fly = P(351, 415);
    K.add('Flywheel', finish('source', '#141517', .35, .4), K.disc(fly, 'x', 510, 46, 64));
    K.add('Flywheel', finish('source', '#2a2c2f', .6, .3), K.disc(fly, 'x', 120, 60, 32));
    const crank = P(914, 440);
    const g = K.plate([[crank[1], crank[2] - 150], [fly[1] + 20, fly[2] - 80], [fly[1] - 50, fly[2]], [fly[1] + 20, fly[2] + 80], [crank[1], crank[2] + 150], [crank[1] + 150, crank[2]]], 40, 16, 20);
    const windowCut = K.plate([[crank[1] - 230, crank[2] - 60], [fly[1] + 170, fly[2] - 35], [fly[1] + 170, fly[2] + 35], [crank[1] - 230, crank[2] + 60]], 30, 40, 16);
    K.add('Belt guard', guard, K.cut(g, [windowCut]));
    // Red five-spoke drive pulley over the crank, black hub.
    K.add('Crank disc', disc, K.ring([60, crank[1], crank[2]], 'x', 300, 236, 16, 48));
    for (let i = 0; i < 5; i++) { const a = (i * 72 + 18) * Math.PI / 180; K.add('Crank disc', disc, K.bar([60, crank[1], crank[2]], [60, crank[1] + 128 * Math.cos(a), crank[2] + 128 * Math.sin(a)], 14, 34, 6, [1, 0, 0])); }
    K.add('Crank disc', trim, K.disc([62, crank[1], crank[2]], 'x', 120, 18, 32));
    crankset(K, 914, 440, 92, 35, finish('source', '#26282b', .5, .4));
    // Seat post (height scale), horizontal slider, saddle and the rear dumbbell holder.
    K.add('Seat post', trim, K.bar(P(1069, 700), P(1099, 1045), 56, 66, 14));
    K.add('Seat post', trim, K.hull([K.sphere(P(1099, 1050), 70, 16), K.sphere(P(1130, 1072), 64, 16)]));
    K.add('Seat post', trim, K.bar(P(1110, 1070), P(1395, 1070), 52, 46, 10, [1, 0, 0]));
    saddle(K, 1037, 1354, 1245, 165, finish('source', '#161718', 0, .8), F.steel);
    K.add('Seat post', trim, K.bar(P(1180, 1080), P(1180, 1190), 30, 40, 6));
    // Rear dumbbell cradle: back plate with two hooked cradles, one each side.
    K.add('Dumbbell holder', trim, K.span(P(1382, 990, -30), P(1400, 1110, 30)), K.span(P(L - 16, 950, -110), P(L, 1080, 110)));
    for (const x of [-1, 1]) K.add('Dumbbell holder', trim, K.span(P(1400, 1050, x * 78 - 32), P(L, 1072, x * 78 + 32)), K.span(P(1400, 950, x * 78 - 32), P(1420, 1072, x * 78 + 32)));
    knob(K, P(1060, 700, 0), [0, 1, 0], 45, 44, trim);
    knob(K, P(1250, 1070, 0), [0, 0, -1], 30, 34, trim);
    // Stem, resistance knob, bottle holders, handlebar.
    K.add('Stem', trim, K.bar(P(399, 960), P(414, 1240), 52, 60, 14));
    knob(K, P(420, 1080, 0), [0, -1, 0], 50, 40, trim);
    knob(K, P(559, 890, 0), [0, 0, 1], 30, 44, disc);
    for (const x of [-1, 1]) K.add('Bottle holders', finish('source', '#5b5f63', .2, .3), K.disc(P(318, 895, x * 44), 'z', 82, 120, 24));
    handlebar(K, { sRear: 430, hRear: 1262, rearX: 150, sMid: 320, hMid: 1270, midX: 215, sTip: 150, hTip: 1335, tipX: 150, d: 32, center: [414, 1250] }, F.foam, trim);
    // Display: Bike = 21.5 in on the tilting post; Bike+ = 23.8 in on the swivel arm (vertical, forward of the bars).
    const tilt = plus ? 4 : 18, sw = plus ? 552 : 540, sh = plus ? 368 : 330, st = plus ? 36 : 32, rad = tilt * Math.PI / 180;
    const cs = sh / 2 * Math.sin(rad) + st * Math.cos(rad), ch = plus ? env.H - sh / 2 * Math.cos(rad) : 1415;
    const face: Vec3 = [0, Math.cos(rad), Math.sin(rad)], up: Vec3 = [0, -Math.sin(rad), Math.cos(rad)];
    K.screen(sw, sh, st, P(cs, ch), face, up, plus ? [527, 297] : [476, 268]);
    if (plus) {
      K.add('Screen mount', trim, K.pipe([P(420, 1215), P(300, 1205), P(110, 1205), P(62, 1235)], 44, 16));
      K.add('Screen mount', trim, K.bar(P(62, 1225), P(cs + 10, ch - 40), 70, 50, 12));
      K.add('Screen mount', finish('source', '#4b4e52', .1, .7), K.span(P(cs - 2, ch + sh / 2 - 48, -sw / 2 + 10), P(cs + 2, ch + sh / 2 - 2, sw / 2 - 10)));
    } else {
      K.add('Screen mount', trim, K.pipe([P(400, 1200), P(330, 1185), P(170, 1250), P(cs + 30, ch - 80)], 46, 16));
    }
    K.add('Screen mount', trim, K.span(P(cs + 8, ch - 60, -70), P(cs + 30, ch + 40, 70)));
  });
}

// ------------------------------------------------------------------------------------------------ Schwinn IC4
export function buildSchwinnIC4(api: ManifoldAPI): SolidPart[] {
  const { L, W, H } = SCHWINN_IC4;
  return withCardioKit(api, 'Schwinn IC4', L, K => {
    const P = K.P, frame = finish('source', '#2b2d30', .3, .5), black = finish('source', '#161719', .1, .55), red = finish('source', '#d3202e', .05, .45);
    const grey = finish('source', '#6f7378', .2, .5);
    // Round-tube stabilisers with end caps; transport wheels at the front.
    for (const [s, h] of [[62, 48], [1192, 48]] as const) K.add('Frame', frame, K.rod(P(s, h, -(W / 2 - 60)), P(s, h, W / 2 - 60), 62, 24));
    for (const x of [-1, 1]) {
      K.add('Stabiliser end caps', black, K.move(K.pad(70, 100, 60, 18, [0, 0, 0]), P(58, 16, x * (W / 2 - 35))));
      K.add('Stabiliser end caps', black, K.move(K.pad(70, 94, 62, 20, [0, 0, 0]), P(L - 47, 6, x * (W / 2 - 35))));
      const w = K.wheel(P(26, 26, x * (W / 2 - 35)), 52, 24);
      K.add('Transport wheels', F.rubber, w.tyre); K.add('Transport wheels', grey, w.hub);
      K.add('Levelling feet', F.rubber, K.disc(P(L - 47, 3, x * (W / 2 - 40)), 'z', 40, 6, 16));
    }
    K.add('Frame', frame, K.pipe([P(70, 70), P(380, 112), P(880, 112), P(1180, 70)], 46, 18));
    // Front upright: twin plates either side of the flywheel, merging into the head tube.
    const foot = P(125, 80), headTop = P(323, 1005);
    for (const x of [-1, 1]) K.add('Frame', frame, K.bar(P(125, 80, x * 40), P(250, 660, x * 40), 14, 92, 5));
    K.add('Frame', frame, K.bar(P(228, 560), headTop, 64, 92, 16));
    K.add('Frame', frame, K.span(P(140, 60, -48), P(210, 110, 48)));
    // Main diagonal (head to rear stabiliser), seat tube, grey drive cover.
    const dA = P(335, 830), dB = P(1060, 80);
    K.add('Frame', frame, K.bar(dA, dB, 58, 104, 20));
    K.add('Frame', frame, K.hull([K.sphere(P(318, 900), 98, 18), K.sphere(P(355, 800), 90, 18)]));
    K.add('Frame', frame, K.bar(P(780, 340), P(968, 1011), 52, 78, 14));
    sideWord(K, 'SCHWINN', 40, dA, dB, .38, -1, 30, ['Frame lettering', finish('source', '#d8d9da', .1, .5)], 260);
    sideWord(K, 'IC4', 60, P(780, 340), P(968, 1011), .55, -1, 27, ['Frame lettering', finish('source', '#d8d9da', .1, .5)], 120);
    const bb = P(757, 362), fly = P(287, 373);
    K.add('Drive cover', grey, K.plate([[bb[1] - 230, bb[2] - 40], [bb[1] - 60, bb[2] - 120], [bb[1] + 140, bb[2] - 110], [bb[1] + 150, bb[2] + 120], [bb[1] - 80, bb[2] + 150], [bb[1] - 240, bb[2] + 50]], -32, 64, 30));
    // Flywheel guard (black) with red ring and hub on both faces.
    K.add('Flywheel guard', black, K.disc(fly, 'x', 430, 60, 64));
    for (const x of [-1, 1]) {
      K.add('Flywheel trim', red, K.ring([x * 30.5, fly[1], fly[2]], 'x', 330, 300, 2, 64));
      K.add('Flywheel trim', red, K.disc([x * 31, fly[1], fly[2]], 'x', 86, 4, 32));
    }
    crankset(K, 757, 362, 86, 30, black);
    // Seat post, slider and red saddle; red pop-pin knob.
    K.add('Seat post', grey, K.bar(P(955, 960), P(985, 1068), 42, 56, 10));
    K.add('Seat post', black, K.bar(P(935, 1076), P(1110, 1076), 44, 32, 8, [1, 0, 0]));
    saddle(K, 914, 1165, 1119, 165, red, black);
    knob(K, P(820, 760, 0), [0, 1, 0], 45, 36, red);
    knob(K, P(1040, 1076, 0), [0, 0, -1], 25, 30, red);
    // Stem, resistance knob, dumbbells, handlebar, console with media shelf.
    K.add('Stem', grey, K.bar(P(323, 990), P(318, 1185), 44, 56, 10));
    knob(K, P(452, 820, 0), [0, 0, 1], 55, 40, red);
    for (const x of [-1, 1]) {
      K.add('Dumbbell cradles', black, K.span(P(170, 690, x * 44 - 26), P(215, 710, x * 44 + 26)));
      K.add('3 lb dumbbells', red, K.rod(P(192, 705, x * 44), P(192, 835, x * 44), 32, 16), K.disc(P(192, 712, x * 44), 'z', 52, 34, 20), K.disc(P(192, 828, x * 44), 'z', 52, 34, 20));
    }
    handlebar(K, { sRear: 340, hRear: 1196, rearX: 175, sMid: 180, hMid: 1210, midX: 230, sTip: 5, hTip: 1275, tipX: 105, d: 32, center: [320, 1188] }, F.foam, black);
    K.add('Console', black, K.bar(P(330, 1190), P(345, 1255), 50, 40, 10));
    const r = 28 * Math.PI / 180;
    K.screen(150, 105, 26, P(360, 1258), [0, Math.cos(r), Math.sin(r)], [0, -Math.sin(r), Math.cos(r)], [118, 64], black);
    K.add('Media shelf', black, K.span(P(310, H - 20, -130), P(342, H, 130)));
    K.add('Media shelf', black, K.bar(P(335, 1255), P(326, H - 20), 30, 20, 6));
  });
}

// ------------------------------------------------------------------------------------------------ Sunny SF-B1002
export function buildSunnyB1002(api: ManifoldAPI): SolidPart[] {
  const { L, W, H } = SUNNY_B1002;
  return withCardioKit(api, 'Sunny SF-B1002', L, K => {
    const P = K.P, frame = finish('source', '#141517', .35, .35), red = finish('source', '#d8232a', .05, .4), grey = finish('source', '#8b8f94', .45, .4);
    for (const [s, h] of [[92, 42], [L - 35, 42]] as const) K.add('Frame', frame, K.rod(P(s, h, -(W / 2 - 50)), P(s, h, W / 2 - 50), 58, 24));
    for (const x of [-1, 1]) {
      K.add('Stabiliser end caps', F.plastic, K.move(K.pad(50, 70, 44, 14, [0, 0, 0]), P(L - 35, 20, x * (W / 2 - 25))));
      K.add('Stabiliser end caps', F.plastic, K.move(K.pad(50, 64, 44, 14, [0, 0, 0]), P(92, 20, x * (W / 2 - 25))));
      const w = K.wheel(P(30, 30, x * (W / 2 - 60)), 60, 22);
      K.add('Red transport wheels', red, w.tyre); K.add('Transport wheels', F.plasticGrey, w.hub);
      K.add('Frame', frame, K.span(P(30, 25, x * (W / 2 - 78)), P(92, 55, x * (W / 2 - 42))));
      K.add('Levelling feet', F.rubber, K.disc(P(L - 35, 5, x * (W / 2 - 60)), 'z', 40, 10, 16));
    }
    K.add('Frame', frame, K.bar(P(92, 62), P(L - 35, 62), 44, 70, 8));
    // Front upright (raked back) and the flywheel inside its fork; head and chrome handlebar post.
    const head = P(466, 868);
    for (const x of [-1, 1]) K.add('Frame', frame, K.bar(P(246, 60, x * 42), P(360, 480, x * 42), 14, 100, 5));
    K.add('Frame', frame, K.bar(P(345, 440), head, 64, 100, 12));
    const dA = P(470, 800), dB = P(930, 320);
    K.add('Frame', frame, K.bar(dA, dB, 62, 112, 14));
    K.add('Frame', frame, K.bar(P(935, 270), P(1005, 705), 58, 76, 12));
    K.add('Frame', frame, K.bar(P(940, 300), P(L - 60, 62), 50, 70, 10));
    sideWord(K, 'SUNNY', 44, dA, dB, .6, 1, 31, ['Frame lettering · red', red], 170);
    sideWord(K, 'HEALTH & FITNESS', 22, dA, dB, .32, 1, 31, ['Frame lettering', F.white], 260);
    K.add('Chrome posts', F.chrome, K.bar(P(470, 820), P(492, 1062), 44, 44, 4));
    const fly = P(380, 320);
    K.add('Flywheel rim', F.chrome, K.hoop(fly, 'x', 450, 34, 64, 12));
    K.add('Flywheel face', red, K.disc(fly, 'x', 452, 40, 64));
    K.add('Flywheel hub', F.chrome, K.disc(fly, 'x', 70, 70, 24));
    // Grey crank cover ("SUNNY BIKE") from the crank to the flywheel hub, pedals.
    const bb = P(906, 320);
    K.add('Crank cover', grey, K.hull([K.disc([56, bb[1], bb[2]], 'x', 290, 20, 40), K.disc([56, fly[1] + 60, fly[2]], 'x', 120, 20, 28)]));
    const cw = K.word('SUNNY BIKE', 28, [66.2, (bb[1] + fly[1]) / 2 + 30, bb[2] + 95], [0, -1, 0], [0, 0, 1], 1, 190);
    if (cw) K.add('Frame lettering', F.white, cw);
    crankset(K, 906, 320, 92, 40, F.plastic);
    // Seat post, slider, saddle; red pop pins and the resistance knob.
    K.add('Chrome posts', F.chrome, K.bar(P(995, 690), P(1012, 832), 40, 40, 4));
    K.add('Chrome posts', F.chrome, K.bar(P(975, 845), P(1150, 845), 40, 36, 4, [1, 0, 0]));
    saddle(K, 940, 1200, 962, 170, F.plastic, F.steel);
    knob(K, P(1040, 640, 0), [0, 1, 0], 45, 38, red);
    knob(K, P(1100, 845, 0), [0, 0, -1], 30, 34, red);
    knob(K, P(430, 720, 0), [0, -1, 0], 45, 38, red);
    knob(K, P(520, 790, 0), [0, 0, 1], 50, 46, red);
    handlebar(K, { sRear: 520, hRear: 1030, rearX: 160, sMid: 300, hMid: 1030, midX: 215, sTip: 0, hTip: H, tipX: 120, d: 30, center: [492, 1040] }, F.foam, frame);
    K.add('Bottle cage', F.chrome, K.hoop(P(330, 640), 'z', 74, 5, 24, 6));
  });
}
