/** Concept2 RowErg / Model D / Model C and Rogue Echo Rower builders.
 * Build axes: X across (+X = rower's right, the flywheel housing side), +Y toward the flywheel, Z up; origin at the footprint centre. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { withKit, type Finish, type Kit } from './ergs-kit.ts';
import { ECHO_ROWER, c2RowerConfig, echoRowerFolded, type C2Model, type C2RowerConfig } from '../floor-parts/ergs.ts';

const LIME = '#c3d52c', WHITE = '#eeeeea';
const F = (color: string, roughness = .55, metalness = 0, role: Finish['role'] = 'source'): Finish => ({ role, color, roughness, metalness });
interface Palette { frame: Finish; front: Finish; rail: Finish; legs: Finish; housing: Finish; face: Finish; drum: Finish; seat: Finish; foot: Finish; grip: Finish; bar: Finish }
function palette(c: C2RowerConfig): Palette {
  if (c.model === 'c') return {
    frame: F('#c4c8cb', .5, .15), front: F('#c4c8cb', .5, .15), rail: F('#18191b', .5), legs: F('#3b3e41', .55), housing: F('#16171a', .6),
    face: F('#bfc3c6', .5, .1), drum: F('#2d2f32', .7, .3), seat: F('#1d1e20', .8), foot: F('#232427', .75), grip: F('#b98446', .7), bar: F('#1a1b1d', .6) };
  if (c.colour === 1) return {
    frame: F('#d5d9dc', .45, .1), front: F('#d5d9dc', .45, .1), rail: F('#1f3f95', .4, .15), legs: F('#d5d9dc', .45, .1), housing: F('#d9dcdf', .45, .1),
    face: F('#1f3b8c', .45, .1), drum: F('#8d9195', .5, .6), seat: F('#26282b', .75), foot: F('#232427', .75), grip: F('#22409a', .6), bar: F('#22409a', .55) };
  return {
    frame: F('#17181a', .55), front: F('#17181a', .55), rail: F('#17181a', .5), legs: F('#17181a', .55), housing: F('#141517', .6),
    face: F('#1b1c1e', .6), drum: F('#6b6f73', .5, .6), seat: F(c.model === 'rowerg' ? '#51565c' : '#2a2c2f', .75), foot: F('#3b3f45', .75), grip: F('#2f3d55', .7), bar: F('#1a1b1d', .6) };
}
export interface C2Layout { railTop: number; railH: number; railW: number; rearY: number; railFront: number; hub: Vec3; housingD: number; housingW: number; stabY: number; lift: number }
/** Published: 96 × 24 in overall, 14 / 20 in seat height, 54 in monorail. Hub, beam and housing sizes are photo estimates. */
export function c2Layout(c: C2RowerConfig): C2Layout {
  const lift = c.tall ? 154 : 0;
  return { railTop: 300 + lift, railH: 90, railW: 62, rearY: -1220, railFront: -1220 + 1372, hub: [128, 1220 - (c.model === 'c' ? 252 : 243), 638 + lift], housingD: c.model === 'c' ? 500 : 482, housingW: c.model === 'c' ? 150 : 178, stabY: 1090, lift };
}

/** Front section (flywheel, footrests, monitor) and monorail (seat, rear legs) are separate groups so the storage pose can move them apart. */
function buildC2(K: Kit, c: C2RowerConfig) {
  const L = c2Layout(c), P = palette(c), { hub, lift } = L;
  const front: Record<string, [Finish, Manifold[]]> = {}, rail: Record<string, [Finish, Manifold[]]> = {}, arm: Record<string, [Finish, Manifold[]]> = {};
  const put = (bag: typeof front, name: string, f: Finish, ...s: Manifold[]) => { (bag[name] ??= [f, []])[1].push(...s); };
  const rubber = F('#1b1c1e', .9, 0, 'liner'), metal = F('#b9bdc1', .28, .9, 'rod'), hw: Finish = { role: 'fastener', color: '#2e3033', metalness: .8, roughness: .35, authored: true };
  // ---- Monorail: I-beam with a stainless seat track, rear legs, seat carriage.
  const rt = L.railTop, rb = rt - L.railH, y0 = L.rearY + 10, y1 = L.railFront, w = L.railW;
  const beam = K.union([K.span([-w / 2, y0, rt - 12], [w / 2, y1, rt]), K.span([-9, y0, rb + 10], [9, y1, rt - 10]), K.span([-w / 2 + 6, y0, rb], [w / 2 - 6, y1, rb + 12])]);
  put(rail, 'Monorail', P.rail, beam, K.span([-w / 2 + 4, y0 + 2, rb + 10], [w / 2 - 4, y1 - 2, rt - 10]));
  put(rail, 'Stainless seat track', metal, K.span([-21, y0 + 30, rt], [21, y1 - 20, rt + 3]));
  put(rail, 'Rail end caps', rubber, K.span([-w / 2 - 2, L.rearY, rb - 2], [w / 2 + 2, y0 + 1, rt + 5]));
  // Rear legs: standard = flat plate with side flanges on a foot bar; tall = steel A-frame.
  const footY = L.rearY + 40;
  /** Plate in the XZ plane ([x, z] points) centred on y, t thick. */
  const xz = (pts: Vec2[], y: number, t: number) => K.move(K.rotate(K.plate(pts, -t / 2, t), [0, 0, -90]), [0, y, 0]);
  if (!c.tall) {
    put(rail, 'Rear legs', P.legs, xz([[-150, 40], [150, 40], [58, rb + 2], [-58, rb + 2]], footY - 18, 7));
    for (const s of [-1, 1]) put(rail, 'Rear legs', P.legs, K.plate([[footY - 22, 40], [footY + 45, 40], [footY - 12, rb + 2], [footY - 22, rb + 2]], s * 52 - 3, 6));
  } else {
    for (const s of [-1, 1]) put(rail, 'Rear legs', P.legs, K.bar([s * 175, footY - 5, 40], [s * 24, footY - 5, rb + 4], 50, 9, 2, [0, 0, 1]));
    put(rail, 'Rear legs', P.legs, K.bar([-110, footY - 5, 180], [110, footY - 5, 180], 38, 9, 2, [0, 0, 1]), K.span([-60, footY - 22, rb - 4], [60, footY + 18, rb + 2]));
  }
  put(rail, 'Rear legs', P.legs, K.span([-205, footY - 30, 8], [205, footY + 30, 44]));
  for (const s of [-1, 1]) put(rail, 'Rear feet', rubber, K.span([s * 205, footY - 32, 0], [s * 225, footY + 32, 46]), K.span([s * 150 - 40, footY - 30, 0], [s * 150 + 40, footY + 30, 8]));
  // Decals: "RowERG" / model plate on the +X web near the rear, white word + lime word (flat plates, no artwork).
  const decal = (x: number, ya: number, yb: number, za: number, zb: number) => K.span([x, ya, za], [x + .8, yb, zb]);
  if (c.model === 'rowerg') put(rail, 'Decal · white', F(WHITE, .5), decal(9, L.rearY + 110, L.rearY + 200, rb + 28, rb + 62)), put(rail, 'Decal · lime', F(LIME, .5), decal(9, L.rearY + 200, L.rearY + 290, rb + 28, rb + 62));
  else if (c.model === 'd' && c.colour === 1) put(rail, 'Decal · lime', F(LIME, .5), decal(9, L.rearY + 110, L.rearY + 330, rb + 30, rb + 60));
  else put(rail, 'Decal · blue', F('#2a64b8', .5), decal(9, L.rearY + 110, L.rearY + 400, rb + 30, rb + 60));
  // Seat: carriage on four track rollers, anatomical pad with raised rear and centre channel.
  const sy = c.storage ? L.rearY + 200 : -380, sz = rt + 3;
  put(rail, 'Seat carriage', F('#9ea3a8', .35, .7), K.span([-48, sy - 110, sz + 14], [48, sy + 110, sz + 22]));
  for (const dy of [-80, 80]) for (const s of [-1, 1]) put(rail, 'Seat rollers', F('#2a2b2e', .6), K.disc([s * 22, sy + dy, sz + 10], 'x', 20, 14, 20));
  for (const dy of [-80, 80]) put(rail, 'Seat rollers', F('#2a2b2e', .6), K.disc([0, sy + dy, rb - 10], 'x', 20, 40, 20), K.span([-35, sy + dy - 6, rb - 14], [-31, sy + dy + 6, sz + 16]));
  const seatTop = rt + (c.tall ? 210 - 154 : 56);
  const seat = K.hull([K.pad(300, 270, 16, 60, [0, sy, seatTop - 34]), K.pad(260, 230, 14, 55, [0, sy + 6, seatTop - 20])]);
  const bumps = [-1, 1].map(s => K.hull([K.sphere([s * 85, sy - 72, seatTop - 8], 70, 20), K.sphere([s * 70, sy + 50, seatTop - 20], 50, 16)]));
  put(rail, 'Seat', P.seat, K.cut(K.union([seat, ...bumps]), [K.box([60, 300, 40], [0, sy, seatTop + 8]), K.box([400, 400, 60], [0, sy, seatTop + 30])]));
  put(rail, 'Seat', P.seat, K.span([-50, sy - 100, sz + 22], [50, sy + 100, seatTop - 34]));
  // ---- Front section: rising box beam from the monorail joint to the flywheel hub.
  const bw = c.model === 'c' ? 70 : 76, bh = c.model === 'c' ? 100 : 112;
  const a: Vec3 = [0, y1 - 150, rb + 55], b: Vec3 = [0, hub[1] + 40, hub[2] - 5];
  put(front, 'Front frame', P.front, K.bar(a, b, bw, bh, 6), K.span([-bw / 2, y1 - 170, rb - 8], [bw / 2, y1 - 40, rt + 18]));
  put(front, 'Beam end caps', F('#1b1c1e', .8), K.bar([0, b[1] - 2, b[2]], [0, b[1] + 16, b[2] + 6], bw + 4, bh + 4, 6));
  // Model logo on the beam's +X face: lime mark + white word plates.
  const dir = [b[1] - a[1], b[2] - a[2]], dl = Math.hypot(dir[0], dir[1]), at = (t: number, off = 0): Vec3 => [bw / 2, a[1] + dir[0] * t - dir[1] / dl * off, a[2] + dir[1] * t + dir[0] / dl * off];
  if (c.model !== 'c' && c.colour !== 1) {
    put(front, 'Decal · lime', F(LIME, .5), K.bar(at(.3), at(.35), .8, 44, 0, [1, 0, 0]));
    put(front, 'Decal · white', F(WHITE, .5), K.bar(at(.36), at(.6), .8, 34, 0, [1, 0, 0]));
  } else put(front, 'Decal · lime', F(c.colour === 1 ? '#1f3b8c' : '#2a64b8', .5), K.bar(at(.32), at(.6), .8, 34, 0, [1, 0, 0]));
  // Axle block and housing mount.
  put(front, 'Front frame', P.front, K.span([-bw / 2 - 4, hub[1] - 70, hub[2] - 70], [hub[0] - L.housingW / 2 + 2, hub[1] + 70, hub[2] + 55]));
  // ---- Flywheel housing: mesh drum band between two covers, spiral damper grille on the +X face.
  const hx = hub[0], hd = L.housingD, hw2 = L.housingW;
  put(front, 'Flywheel housing', P.housing, K.disc([hx - hw2 / 2 + 11, hub[1], hub[2]], 'x', hd, 22, 64), K.disc([hx + hw2 / 2 - 14, hub[1], hub[2]], 'x', hd, 28, 64));
  put(front, 'Flywheel drum mesh', P.drum, K.disc([hx, hub[1], hub[2]], 'x', hd - 16, hw2 - 40, 64));
  // Cover clips (four latches round the rim) and the damper lever at the top.
  for (const ang of [30, 150, 210, 330]) { const r = hd / 2 - 12, y = hub[1] + r * Math.cos(ang * Math.PI / 180), z = hub[2] + r * Math.sin(ang * Math.PI / 180);
    put(front, 'Flywheel housing', P.housing, K.hull([K.sphere([hx - hw2 / 2 + 20, y, z], 26, 10), K.sphere([hx + hw2 / 2 - 20, y, z], 26, 10)])); }
  const fx = hx + hw2 / 2;
  if (c.model === 'c') {
    put(front, 'Housing face ring', P.face, K.ring([fx + 2, hub[1], hub[2]], 'x', hd - 10, hd - 150, 6, 64));
    put(front, 'Damper grille', F('#141517', .6), K.disc([fx - 2, hub[1], hub[2]], 'x', hd - 150, 6, 48));
    for (let i = 0; i < 9; i++) put(front, 'Damper grille', F('#141517', .6), K.hoop([fx + 1, hub[1], hub[2]], 'x', 60 + i * 38, 5, 40, 6));
    // Rear shroud: curved deflector behind the drum.
    put(front, 'Flywheel housing', P.housing, K.cut(K.disc([hx, hub[1], hub[2]], 'x', hd, hw2 - 10, 64), [K.disc([hx, hub[1], hub[2]], 'x', hd - 18, hw2, 64), K.span([hx - 200, hub[1] - 20, hub[2] - 400], [hx + 200, hub[1] + 400, hub[2] + 400])]));
  } else {
    put(front, 'Housing face ring', P.housing, K.ring([fx + 3, hub[1], hub[2]], 'x', hd - 24, hd - 160, 8, 64));
    put(front, 'Damper grille recess', c.colour === 1 ? P.face : F('#2b2d30', .7), K.disc([fx - 3, hub[1], hub[2]], 'x', hd - 150, 8, 48));
    const grille: Manifold[] = [];
    for (let i = 0; i < 6; i++) grille.push(K.hoop([fx + 2, hub[1], hub[2]], 'x', 70 + i * 50, 5, 40, 6));
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; grille.push(K.rod([fx + 2, hub[1] + 30 * Math.cos(t), hub[2] + 30 * Math.sin(t)], [fx + 2, hub[1] + 162 * Math.cos(t), hub[2] + 162 * Math.sin(t)], 5, 6)); }
    put(front, 'Damper grille', F('#0c0c0d', .45, .1), ...grille);
    put(front, 'Housing face ring', P.housing, K.disc([fx + 1, hub[1], hub[2]], 'x', 64, 10, 32));
    put(front, 'Decal · lime', F(LIME, .5), K.disc([fx + 6.5, hub[1], hub[2]], 'x', 34, 1, 24));
    // Damper lever on the rear-upper rim of the face, 1–10 scale.
    put(front, 'Damper lever', F('#232427', .6), K.bar([fx + 4, hub[1] - 150, hub[2] + 150], [fx + 4, hub[1] - 110, hub[2] + 190], 10, 22, 3));
  }
  // ---- Monitor tower and arm (pivots flat for storage), PM monitor facing the rower.
  const towerY = hub[1] - 185, tz0 = b[2] - 60 - (hub[1] - towerY) * .38, tz1 = hub[2] + 95;
  if (c.model === 'c') {
    put(arm, 'Monitor arm', P.front, K.bar([0, towerY + 20, tz0], [0, towerY - 230, tz1 + 80], 44, 38, 4));
  } else {
    for (const s of [-1, 1]) put(arm, 'Monitor arm', P.front, K.plate([[towerY - 32, tz0], [towerY + 32, tz0], [towerY + 32, tz1], [towerY - 32, tz1]], s * 26 - 3, 6));
    put(arm, 'Monitor arm', F('#18191b', .55), K.bar([0, towerY, tz1 - 20], [0, towerY - 140, tz1 + 205], 42, 34, 5));
  }
  const monTop: Vec3 = c.model === 'c' ? [0, towerY - 250, tz1 + 90] : [0, towerY - 150, tz1 + 218];
  const mon = c.monitor, mw = mon === 'pm2' ? 150 : 176, mh = mon === 'pm2' ? 140 : mon === 'pm5' ? 196 : 186;
  const pmBody = K.pad(mw, 58, mh, 14, [0, 0, 0]), screen = K.box([mw - 44, 4, mh * .5], [0, -30, mh * .6]);
  const tilt = (s: Manifold) => K.move(K.rotate(K.move(s, [0, 0, -mh / 2]), [-12, 0, 0]), [monTop[0], monTop[1], monTop[2] + mh / 2 - 10]);
  put(arm, 'Performance monitor', F(mon === 'pm4' ? '#2a2c2f' : '#161718', .5), tilt(pmBody));
  put(arm, 'Monitor LCD', F(mon === 'pm5' ? '#9fb3a2' : '#8e9d8a', .3, 0), tilt(screen));
  if (c.model === 'rowerg') put(arm, 'Device holder', F('#1c1d1f', .6), K.bar([0, towerY - 60, tz1 + 70], [0, towerY - 120, tz1 + 55], 150, 14, 3));
  // ---- Footrests: two Flexfoot plates on a pivot frame, heel cups and straps, angled toward the flywheel.
  const heel: Vec3 = [0, y1 - 130, 150 + lift], toe: Vec3 = [0, y1 + 70, 368 + lift];
  const fd = [toe[1] - heel[1], toe[2] - heel[2]], fl = Math.hypot(fd[0], fd[1]), n = [-fd[1] / fl, fd[0] / fl];
  const along = (t: number, off: number, x: number): Vec3 => [x, heel[1] + fd[0] * t + n[0] * off, heel[2] + fd[1] * t + n[1] * off];
  put(front, 'Front frame', P.front, K.bar(along(.05, -35, 0), along(.95, -35, 0), 60, 40, 4));
  for (const s of [-1, 1]) {
    const x = s * 96;
    put(front, 'Footrests', P.foot, K.bar(along(-.05, 0, x), along(1, 0, x), 116, 12, 10), K.bar(along(-.05, 0, x), along(-.05, 55, x), 116, 10, 4));
    for (const t of [.3, .55, .8]) put(front, 'Footrests', P.foot, K.bar(along(t, 6, x - 52), along(t + .08, 6, x - 52), 6, 8, 1), K.bar(along(t, 6, x + 52), along(t + .08, 6, x + 52), 6, 8, 1));
    put(front, 'Foot straps', F('#101112', .85, 0, 'liner'), K.bar(along(.62, 18, x), along(.7, 18, x), 140, 6, 2));
    put(front, 'Foot straps', F('#101112', .85, 0, 'liner'), K.bar(along(.62, 8, x + s * 70), along(.62, 30, x + s * 70), 10, 10, 2));
  }
  // ---- Handle parked in its holder (in use) or hung on the housing peg (storage), chain to the sprocket inside the housing.
  const hy = c.storage ? hub[1] - 262 : y1 + 95, hz = c.storage ? hub[2] + 140 : rt + 118;
  put(front, 'Handle', P.bar, K.pipe([[-230, hy - 8, hz], [-60, hy, hz], [60, hy, hz], [230, hy - 8, hz]], 30, 18));
  for (const s of [-1, 1]) put(front, 'Handle grips', F(P.grip.color, .75, 0, 'handle'), K.rod([s * 140, hy - 4, hz], [s * 272, hy - 10, hz], 36, 20));
  put(front, 'Handle', P.bar, K.span([-14, hy - 20, hz - 20], [14, hy + 20, hz + 20]));
  put(front, 'Drive chain', F('#aeb2b6', .35, .9, 'rod'), K.rod([0, hy + 18, hz], [0, hub[1] - 90, hub[2] + 30], 9, 8));
  const hold = { y: y1 + 95, z: rt + 118 };
  put(front, 'Handle holder', F('#1b1c1e', .7), K.span([-30, hold.y + 10, hold.z - 40], [30, hold.y + 40, hold.z - 8]));
  // ---- Front legs to the caster stabiliser.
  const legTop = hub[2] - L.housingD / 2 + 5, stY = L.stabY;
  if (c.tall) {
    for (const [ya, yb] of [[hub[1] - 150, stY - 20], [hub[1] + 150, stY + 20], [hub[1] - 150, stY + 20]] as const)
      put(front, 'Front legs', P.legs, K.bar([70, ya, legTop + (ya < hub[1] ? 30 : 0)], [70, yb, 50], 12, 52, 2));
    put(front, 'Front legs', P.legs, K.span([40, hub[1] - 180, legTop], [100, hub[1] + 180, legTop + 40]));
  } else {
    put(front, 'Front legs', P.legs, K.bar([70, hub[1] - 90, legTop + 15], [70, stY - 18, 48], 34, 48, 5), K.bar([70, hub[1] + 150, legTop + 25], [70, stY + 18, 48], 34, 48, 5));
    put(front, 'Front legs', P.legs, K.span([40, hub[1] - 120, legTop], [100, hub[1] + 180, legTop + 36]));
  }
  put(front, 'Stabiliser', P.legs, K.span([-280, stY - 26, 16], [280, stY + 26, 58]));
  for (const s of [-1, 1]) {
    put(front, 'Stabiliser caps', rubber, K.span([s * 280, stY - 28, 14], [s * 305, stY + 28, 60]), K.span([s * 250 - 22, stY - 30, 0], [s * 250 + 22, stY + 10, 16]));
    const wh = K.wheel([s * 262, 1220 - 26, 26], 52, 22, .5, 24);
    put(front, 'Caster wheels', rubber, wh.tyre); put(front, 'Caster hubs', F('#6d7175', .4, .5), wh.hub);
    put(front, 'Stabiliser', P.legs, K.span([s * 262 - 16, stY + 20, 18], [s * 262 + 16, 1220 - 26, 48]));
  }
  put(front, 'Fasteners', hw, K.disc([fx + 9, hub[1], hub[2]], 'x', 14, 4, 12), ...[-1, 1].map(s => K.disc([s * 22, stY, 60], 'z', 14, 4, 12)));
  // The monitor arm pivots at the tower top: folded back along the beam for storage.
  const pivot: Vec3 = [0, towerY, tz1];
  const fold = (m: Manifold) => c.storage ? K.move(K.rotate(K.move(m, [0, -pivot[1], -pivot[2]]), [C2_STORAGE.armFold, 0, 0]), pivot) : m;
  for (const [n, [fin, list]] of Object.entries(arm)) put(front, n, fin, ...list.map(fold));
  return { front, rail, L };
}

/** Storage pose: front section tipped back until its casters and housing rim both touch the floor (monitor arm folded along the beam,
 * handle on the housing peg), monorail stood on its rear end beside the beam with its legs tucked under the tipped section. */
export const C2_STORAGE = { armFold: 78, railX: -115, railBack: 524 };
/** Tip angle (degrees about X) that puts the caster wheels and the housing rim on the floor together. */
export function c2StorageTilt(L: C2Layout) {
  const A = (1220 - 26) - L.hub[1], B = L.hub[2] - 26, D = L.housingD / 2 - 26, R = Math.hypot(A, B);
  return -(180 - Math.asin(D / R) * 180 / Math.PI - Math.atan2(B, A) * 180 / Math.PI);
}
export function buildC2Rower(api: ManifoldAPI, model: C2Model, p: NumericParams): SolidPart[] {
  const c = c2RowerConfig(model, p);
  return withKit(api, 'Concept2 rower', K => {
    const { front, rail, L } = buildC2(K, c);
    if (!c.storage) {
      for (const [n, [fin, s]] of Object.entries(front)) K.add(n, fin, ...s);
      for (const [n, [fin, s]] of Object.entries(rail)) K.add(n, fin, ...s);
      return;
    }
    const tilt = c2StorageTilt(L), f = (s: Manifold) => K.rotate(s, [tilt, 0, 0]);
    const tipped = Object.entries(front).map(([n, [fin, s]]) => [n, fin, s.map(f)] as const);
    const fb = bounds(tipped.flatMap(([, , s]) => s));
    for (const [n, fin, s] of tipped) K.add(n, fin, ...s);
    // Rear end down, legs pointing back under the tipped beam toward the casters.
    const stood = Object.entries(rail).map(([n, [fin, s]]) => [n, fin, s.map(m => K.rotate(m, [90, 0, 180]))] as const);
    const rbx = bounds(stood.flatMap(([, , s]) => s));
    const shift: Vec3 = [C2_STORAGE.railX - (rbx.min[0] + rbx.max[0]) / 2, fb.min[1] + C2_STORAGE.railBack + L.lift - rbx.max[1], fb.min[2] - rbx.min[2]];
    for (const [n, fin, s] of stood) K.add(`Monorail · ${n}`, fin, ...s.map(m => K.move(m, shift)));
  });
}
/** Rogue Echo Rower: 99 × 26 in, 16 in seat. Texture-black steel, wide "ROGUE" front beam, splayed front legs on four turf tyres,
 * hinged monorail that folds up in line with the beam (38 × 26 in folded). */
export const ECHO_FOLD = { rail: -90, arm: 100 };
export function buildEchoRower(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const folded = echoRowerFolded(p), L = ECHO_ROWER.length, W = ECHO_ROWER.width, rearY = -L / 2, front = L / 2;
  return withKit(api, 'Rogue Echo Rower', K => {
    const frame = F('#3d4044', .75), rail: Record<string, [Finish, Manifold[]]> = {}, fr: Record<string, [Finish, Manifold[]]> = {};
    const put = (bag: typeof rail, name: string, f: Finish, ...s: Manifold[]) => { (bag[name] ??= [f, []])[1].push(...s); };
    const rubber = F('#1b1c1e', .9, 0, 'liner'), metal = F('#b9bdc1', .28, .9, 'rod'), white = F(WHITE, .5), hw: Finish = { role: 'fastener', color: '#2e3033', metalness: .8, roughness: .35, authored: true };
    // ---- Monorail (rear end to the hinge under the footrests), rear leg on a foot bar, seat.
    const rt = 350, rb = 260, hingeY = 180, rw = 70;
    put(rail, 'Monorail', frame, K.span([-rw / 2, rearY + 12, rb], [rw / 2, hingeY, rt]));
    put(rail, 'Seat track', metal, K.span([-22, rearY + 40, rt], [22, hingeY - 20, rt + 3]));
    put(rail, 'Rail end caps', rubber, K.span([-rw / 2 - 2, rearY, rb - 2], [rw / 2 + 2, rearY + 13, rt + 4]));
    const footY = rearY + 70;
    put(rail, 'Rear leg', frame, K.hull([K.box([90, 40, 2], [0, footY, rb]), K.box([150, 60, 2], [0, footY, 44])]));
    put(rail, 'Rear leg', frame, K.span([-200, footY - 32, 10], [200, footY + 32, 46]));
    for (const s of [-1, 1]) put(rail, 'Rear feet', rubber, K.span([s * 200, footY - 34, 0], [s * 222, footY + 34, 48]), K.span([s * 150 - 40, footY - 32, 0], [s * 150 + 40, footY + 32, 10]));
    put(rail, 'Decal · white', white, K.span([rw / 2, rearY + 90, rb + 22], [rw / 2 + .8, rearY + 250, rb + 70]));
    const sy = folded ? rearY + 210 : -350;
    put(rail, 'Seat carriage', F('#9ea3a8', .35, .7), K.span([-50, sy - 110, rt + 12], [50, sy + 110, rt + 20]));
    for (const dy of [-80, 80]) for (const s of [-1, 1]) put(rail, 'Seat rollers', F('#2a2b2e', .6), K.disc([s * 22, sy + dy, rt + 10], 'x', 20, 14, 20));
    const seatTop = 406;
    const seat = K.hull([K.pad(310, 250, 16, 50, [0, sy, seatTop - 34]), K.pad(280, 220, 16, 45, [0, sy + 4, seatTop - 16])]);
    put(rail, 'Seat', F('#161718', .7), K.cut(seat, [K.box([50, 300, 30], [0, sy, seatTop + 8])]), K.span([-50, sy - 90, rt + 20], [50, sy + 90, seatTop - 34]));
    // ---- Front section: wide beam from the hinge to the flywheel hub, "ROGUE" on both faces.
    const hub: Vec3 = [110, front - 262, 660], hd = 520, hw2 = 190;
    const a: Vec3 = [0, hingeY - 140, rb + 50], b: Vec3 = [0, hub[1] + 20, hub[2]];
    put(fr, 'Front frame', frame, K.bar(a, b, 80, 172, 8), K.span([-rw / 2 - 8, hingeY - 160, rb - 10], [rw / 2 + 8, hingeY + 10, rt + 10]));
    const dir = [b[1] - a[1], b[2] - a[2]], at = (t: number): [number, number] => [a[1] + dir[0] * t, a[2] + dir[1] * t];
    for (const s of [-1, 1]) { const [ya, za] = at(.28), [yb, zb] = at(.7); put(fr, 'Decal · white', white, K.bar([s * 40.4, ya, za], [s * 40.4, yb, zb], .8, 80, 0, [1, 0, 0])); }
    // Footrest cradle (round belly under the stretcher), plates and quick-release straps.
    put(fr, 'Front frame', frame, K.disc([0, hingeY + 40, rb - 20], 'x', 150, 110, 40));
    const heel: Vec3 = [0, hingeY - 120, 175], toe: Vec3 = [0, hingeY + 90, 400];
    const fd = [toe[1] - heel[1], toe[2] - heel[2]], fl = Math.hypot(fd[0], fd[1]), n = [-fd[1] / fl, fd[0] / fl];
    const along = (t: number, off: number, x: number): Vec3 => [x, heel[1] + fd[0] * t + n[0] * off, heel[2] + fd[1] * t + n[1] * off];
    for (const s of [-1, 1]) {
      const x = s * 100;
      put(fr, 'Footrests', F('#1f2023', .75), K.bar(along(-.05, 0, x), along(1, 0, x), 118, 12, 10), K.bar(along(-.05, 0, x), along(-.05, 60, x), 118, 10, 4));
      put(fr, 'Foot straps', F('#0f1011', .85, 0, 'liner'), K.bar(along(.6, 18, x), along(.7, 18, x), 142, 6, 2));
      put(fr, 'Strap levers', F('#b3232b', .5), K.bar(along(.6, 30, x + s * 60), along(.72, 30, x + s * 60), 14, 10, 3));
    }
    // Handle in its holder, chain to the housing.
    const hy = hingeY + 120, hz = rt + 150;
    put(fr, 'Handle', F('#1a1b1d', .6), K.pipe([[-230, hy - 8, hz], [-60, hy, hz], [60, hy, hz], [230, hy - 8, hz]], 30, 18));
    for (const s of [-1, 1]) put(fr, 'Handle grips', F('#141516', .8, 0, 'handle'), K.rod([s * 140, hy - 4, hz], [s * 272, hy - 10, hz], 36, 20));
    put(fr, 'Drive chain', F('#aeb2b6', .35, .9, 'rod'), K.rod([0, hy + 18, hz], [0, hub[1] - 100, hub[2] + 40], 9, 8));
    // ---- Flywheel housing: dark grey shell, black round grille with the ROGUE centre badge on the +X face.
    const fx = hub[0] + hw2 / 2;
    put(fr, 'Flywheel housing', F('#34373b', .6, .1), K.disc([hub[0] - hw2 / 2 + 12, hub[1], hub[2]], 'x', hd, 24, 64), K.disc([fx - 16, hub[1], hub[2]], 'x', hd, 32, 64));
    put(fr, 'Flywheel drum', F('#3b3e42', .55, .3), K.disc(hub, 'x', hd - 18, hw2 - 40, 64));
    put(fr, 'Housing face ring', F('#63676c', .45, .25), K.ring([fx + 2, hub[1], hub[2]], 'x', hd - 30, hd - 110, 6, 64));
    put(fr, 'Grille', F('#101112', .6), K.disc([fx, hub[1], hub[2]], 'x', hd - 120, 6, 48));
    const grid: Manifold[] = [];
    for (let i = -6; i <= 6; i++) { const h = Math.sqrt(Math.max(0, (hd / 2 - 70) ** 2 - (i * 30) ** 2)); if (h > 10) grid.push(K.span([fx + 2.5, hub[1] + i * 30 - 2, hub[2] - h], [fx + 4.5, hub[1] + i * 30 + 2, hub[2] + h]), K.span([fx + 2.5, hub[1] - h, hub[2] + i * 30 - 2], [fx + 4.5, hub[1] + h, hub[2] + i * 30 + 2])); }
    put(fr, 'Grille', F('#2a2c2f', .5, .2), ...grid);
    put(fr, 'Grille badge', F('#34363a', .5, .2), K.disc([fx + 5, hub[1], hub[2]], 'x', 80, 3, 32));
    put(fr, 'Decal · white', white, K.span([fx + 6.5, hub[1] - 24, hub[2] - 6], [fx + 7.3, hub[1] + 24, hub[2] + 6]));
    put(fr, 'Front frame', frame, K.span([-40, hub[1] - 90, hub[2] - 90], [hub[0] - hw2 / 2 + 2, hub[1] + 90, hub[2] + 70]));
    // Monitor arm from the beam behind the housing, 4.7 in console with phone holder.
    const towerY = hub[1] - 230, beamZ = (y: number) => a[2] + (b[2] - a[2]) * (y - a[1]) / (b[1] - a[1]);
    // The arm pivots at its foot: folded down along the beam for storage.
    const armBase: Vec3 = [0, towerY, beamZ(towerY) + 40], fold = (m: Manifold) => folded ? K.move(K.rotate(K.move(m, [0, -armBase[1], -armBase[2]]), [ECHO_FOLD.arm, 0, 0]), armBase) : m;
    put(fr, 'Front frame', frame, K.span([-26, towerY - 30, beamZ(towerY)], [26, towerY + 30, armBase[2] + 20]));
    put(fr, 'Monitor arm', frame, fold(K.bar(armBase, [0, towerY - 40, hub[2] + 330], 46, 40, 5)), fold(K.bar([0, towerY - 40, hub[2] + 330], [0, towerY - 90, hub[2] + 420], 40, 34, 5)));
    const mon = (s: Manifold) => fold(K.move(K.rotate(s, [-15, 0, 0]), [0, towerY - 110, hub[2] + 430]));
    put(fr, 'Console', F('#161718', .5), mon(K.pad(150, 50, 170, 14, [0, 0, 0])));
    put(fr, 'Console LCD', F('#8fa38a', .3), mon(K.box([106, 4, 96], [0, -26, 100])));
    put(fr, 'Phone holder', F('#1c1d1f', .6), mon(K.span([-80, -10, 170], [80, 20, 200])));
    // ---- Splayed front legs to four turf tyres (front-right and rear-left axles), with a crossbar.
    const legTop: Vec3 = [40, hub[1], hub[2] - hd / 2 + 20], wd = 180, ww = 52;
    const axles: [number, number][] = [[1, front - wd / 2], [-1, hub[1] - 300]];
    for (const [s, y] of axles) {
      const foot: Vec3 = [s * (W / 2 - ww - 40), y, wd / 2];
      put(fr, 'Front legs', frame, K.bar(legTop, foot, 60, 60, 5));
      put(fr, 'Front legs', frame, K.bar([s * (W / 2 - ww - 60), y, wd / 2], [s * (W / 2 - ww - 2), y, wd / 2], 40, 70, 5, [0, 1, 0]));
      const wh = K.wheel([s * (W / 2 - ww / 2), y, wd / 2], wd, ww, .5, 32);
      put(fr, 'Turf tyres', rubber, wh.tyre); put(fr, 'Wheel hubs', F('#3a3d41', .5, .3), wh.hub);
      put(fr, 'Fasteners', hw, K.disc([s * (W / 2 - 2), y, wd / 2], 'x', 26, 4, 16));
    }
    put(fr, 'Front legs', frame, K.bar([-(W / 2 - ww - 40) * .55, hub[1] - 300 + (front - wd / 2 - hub[1] + 300) * .45, 280], [(W / 2 - ww - 40) * .55, hub[1] - 300 + (front - wd / 2 - hub[1] + 300) * .55, 280], 34, 34, 4));
    put(fr, 'Front frame', frame, K.span([0, hub[1] - 60, legTop[2] - 20], [80, hub[1] + 60, legTop[2] + 40]));
    if (!folded) { for (const [n, [f, s]] of Object.entries(rail)) K.add(n, f, ...s); for (const [n, [f, s]] of Object.entries(fr)) K.add(n, f, ...s); return; }
    // Folded: the front section tips about the hinge until the housing rim and the front turf tyres both touch the floor;
    // the monorail swings up vertical on its hinge.
    const hinge: Vec3 = [0, hingeY, rb + 20];
    const about = (m: Manifold, deg: number) => K.move(K.rotate(K.move(m, [0, -hinge[1], -hinge[2]]), [deg, 0, 0]), hinge);
    const hRel = [hub[1] - hinge[1], hub[2] - hinge[2]], wRel = [axles[0][1] - hinge[1], wd / 2 - hinge[2]];
    const A = hRel[0] - wRel[0], B = hRel[1] - wRel[1], D = hd / 2 - wd / 2, R = Math.hypot(A, B);
    const tip = -(Math.acos(D / R) + Math.atan2(-A, B)) * 180 / Math.PI;
    for (const [n, [f, s]] of Object.entries(fr)) K.add(n, f, ...s.map(m => about(m, tip)));
    for (const [n, [f, s]] of Object.entries(rail)) K.add(`Monorail · ${n}`, f, ...s.map(m => about(m, ECHO_FOLD.rail)));
  });
}
function bounds(solids: Manifold[]) {
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const s of solids) { const b = s.boundingBox(); min = min.map((v, i) => Math.min(v, b.min[i])); max = max.map((v, i) => Math.max(v, b.max[i])); }
  return { min, max };
}
