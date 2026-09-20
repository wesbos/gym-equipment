/** Mikolo × GMWD TAWERET 1:1 Cable Ratio Leg Extension and Curl Machine (LE09, "Master Series"): pure description for the
 * leg-machines engine (see leg-machines-models.ts). Sources and every estimate: research/leg-machines.md.
 * Frame: X across (the tower, cam disc, pulley and plate horn are on the user's right, −X), −Y the front (roller end), Z up. */
import type { NumericParams } from '../types.ts';
import { add, f, inch, lb45, rotX, scale, sub, swing, swingAbout, CHROME, GRIP, RUBBER, ZINC, type Kit, type V3 } from './leg-machines-kit.ts';
import { bent, dial, footCap, gripHandle, pulley, roller } from './leg-machines-models.ts';

const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
/** Published: 49.6" L × 30.6" W × 43.5" H; backrest 14.2" × 25.6"; seat 20.5" long; 17.8" roller (5.5" listed, 6" in the launch
 * video); 2" × 2" 14-ga and 2" × 3" 12-ga steel; 2" plates, 400 lb; 1:1 cable; 25 cam, 7 roller and 5 backrest positions.
 * Everything else is scaled off the right-side video frame and the dimension drawing (research/leg-machines.md). */
export const MIKOLO_TAWERET = {
  rail: [51, 76] as const, railX: 230, base: [15, 1105] as const, feet: { front: 40, rear: 1075, half: 300 },
  tower: { x: -300, y: 95, top: 810 }, pivot: [-300, 125, 640] as V3, cam: 260, drum: 60, pulley: [-318, 215, 780] as V3,
  lever: { base: 380, step: 20 }, roller: { l: inch(17.8), d: inch(6) },
  seat: { top: 520, t: 70, w: 380, l: inch(20.5), y0: 205 }, back: { w: inch(14.2), h: inch(25.6), t: 64, recline: 15, step: 30 },
  load: { pivot: [-93, 250, 470] as V3, arm: 560, rest: -11, attach: 190, horn: inch(10.6) },
  handleTip: inch(30.6) / 2, prone: 13,
  rep: { extension: [0, 45, 85], curl: [95, 140, 180] },
  colors: [['Black', '#18191b'], ['Red', '#b3202a']] as const,
};
export const TAWERET_REPS = ['Start', 'Mid-rep', 'Peak contraction'] as const;
/** Point at `r` along a lever from `h` at `deg` above the horizontal, pointing toward +Y (the rear). */
const rearLever = (h: V3, deg: number, r: number): V3 => add(h, [0, r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180)]);
export function describeMikoloTaweret(k: Kit, p: NumericParams) {
  const M = MIKOLO_TAWERET, frame = 'Matte black steel frame', accent = 'Frame accents', pads = 'Upholstered pads', hw = 'Zinc hardware', red = 'Red pop-pin knobs';
  const accentColor = M.colors[p.color]?.[1] ?? M.colors[0][1];
  k.finish(frame, f('source', '#18191b', .15, .62)); k.finish(accent, f('source', accentColor, .2, .5)); k.finish(pads, f('liner', '#151617', 0, .82)); k.finish('Foam roller pads', f('liner', '#151617', 0, .78));
  k.finish(hw, ZINC); k.finish(red, f('source', '#c3202a', .6, .35)); k.finish('Roller end caps', f('source', '#c9ccd0', .85, .3)); k.finish('Steel cam disc', f('source', '#b9bdc1', .95, .22));
  k.finish('Aluminium pulley', f('source', '#c3202a', .7, .3)); k.finish('Steel cable', f('source', '#2a2b2d', .6, .4)); k.finish('Chrome plate horn', CHROME);
  k.finish('Rubber grips', GRIP); k.finish('Rubber foot caps', RUBBER); k.finish('MIKOLO x GMWD logo', f('source', '#f1f1ee', 0, .5));
  const [rw, rh] = M.rail, xs = [-M.railX, M.railX] as const, S = M.seat, P = M.pivot;
  // Base ladder: long 2 × 3 rails (red on the red version), front and rear feet with rubber caps.
  for (const x of xs) k.beam(accent, [x, M.base[0], rh / 2], [x, M.base[1], rh / 2], rw, rh, Z);
  for (const y of [M.feet.front, M.feet.rear]) {
    k.beam(frame, [-M.feet.half, y, rh / 2], [M.feet.half, y, rh / 2], 51, rh, Z);
    footCap(k, 'Rubber foot caps', 'Rubber foot caps', [-M.feet.half, y, rh / 2], [-1, 0, 0], 51, rh, 70);
    footCap(k, 'Rubber foot caps', 'Rubber foot caps', [M.feet.half, y, rh / 2], X, 51, rh, 70);
  }
  // Front tower on the right, carrying the knee pivot, cam disc and the pulley guard; a brace back to the base rail.
  const T = M.tower;
  k.beam(frame, [T.x, T.y, rh], [T.x, T.y, T.top], 51, 100, Y);
  k.beam(frame, [T.x, T.y + 40, 200], [xs[0], 480, rh], 51, 51, X);
  k.beam(frame, [T.x, T.y, 300], [xs[0], T.y, 300], 51, 51, Z);
  dial(k, 'Steel cam disc', [T.x - 32, P[1], P[2]], M.cam, 6, 25, M.cam / 2 - 22, 13, -150, 60);
  k.polygon(frame, [M.pulley[0] - 20, M.pulley[1], M.pulley[2]], Y, Z, [[-120, -40], [80, -80], [80, 70], [-40, 70]], 6);
  k.polygon(frame, [M.pulley[0] + 14, M.pulley[1], M.pulley[2]], Y, Z, [[-120, -40], [80, -80], [80, 70], [-40, 70]], 6);
  pulley(k, 'Aluminium pulley', undefined, M.pulley, X, 110, 26);
  k.rod(hw, [M.pulley[0] - 26, M.pulley[1], M.pulley[2]], [M.pulley[0] + 24, M.pulley[1], M.pulley[2]], 20, 6);
  // Seat support: A-frame legs off the rails (red on the red version), cross tubes and a spine under the seat.
  const under = S.top - S.t - 20;
  for (const x of xs) {
    k.beam(accent, [x, 150, rh], [x, 360, under], 51, 51, X);
    k.beam(accent, [x, 960, rh], [x, 640, under], 51, 51, X);
    k.beam(accent, [x, 340, under], [x, 660, under], 51, 51, Z);
  }
  for (const y of [360, 640]) k.beam(accent, [xs[0], y, under], [xs[1], y, under], 51, 51, Z);
  k.beam(frame, [0, S.y0 - 20, under + 25], [0, S.y0 + S.l + 30, under + 25], 51, 51, Z);
  // Seat: pivots at its rear; in prone mode the front tilts 13° up into a thigh pad (one red mode pin).
  const seatPivot: V3 = [0, S.y0 + S.l, under + 25], prone = p.mode === 1;
  if (prone) k.push(rotX(-M.prone, seatPivot));
  k.pad(pads, [0, S.y0 + S.l / 2, S.top - S.t], X, Y, S.w, S.l, S.t, 30, 16);
  if (prone) k.pop();
  k.rod(red, [xs[1] + 26, seatPivot[1] - 60, under], [xs[1] + 50, seatPivot[1] - 60, under], 12, 12);
  k.rod(red, [xs[1] + 44, seatPivot[1] - 60, under], [xs[1] + 60, seatPivot[1] - 60, under], 40, 24);
  // Backrest: hinged at the seat rear on a 5-position slide; reclined 15° for extensions, folded flat behind the seat for curls.
  const hinge: V3 = [0, S.y0 + S.l + 25 + (p.backPad - 3) * M.back.step, S.top - 40], B = M.back;
  k.beam(frame, [0, S.y0 + S.l - 20, under + 50], [0, S.y0 + S.l + 150, under + 50], 60, 60, Z);
  k.rod(hw, [0, S.y0 + S.l + 90, under + 80], [0, S.y0 + S.l + 90, under + 110], 12, 12); k.rod(frame, [0, S.y0 + S.l + 90, under + 110], [0, S.y0 + S.l + 90, under + 135], 34, 20);
  k.push(rotX(-(prone ? 90 : B.recline), hinge));
  k.beam(frame, [0, hinge[1] + 20, hinge[2] - 20], [0, hinge[1] + 20, hinge[2] + B.h - 80], 60, 40, Y);
  k.pad(pads, [0, hinge[1], hinge[2] + B.h / 2], X, Z, B.w, B.h, B.t, 34, 14);
  // Printed logo: a mark over three typeset lines (plain plates, not the artwork).
  for (const [w, h, z] of [[36, 40, 150], [90, 14, 190], [14, 14, 216], [100, 16, 242]] as const) k.box('MIKOLO x GMWD logo', [-w / 2, hinge[1] - B.t - .6, hinge[2] + B.h - z - h], [w / 2, hinge[1] - B.t, hinge[2] + B.h - z]);
  k.pop();
  // Rear bent handles either side (the prone-curl grips) and short handles beside the seat front.
  for (const s of [-1, 1]) {
    k.beam(frame, [s * M.railX, 1000, rh], [s * M.railX, 1000, 300], 51, 51, X);
    bent(k, frame, [[s * M.railX, 1000, 300], [s * (M.handleTip - 60), 1060, 330], [s * (M.handleTip - 16), 1130, 350]], 32);
    gripHandle(k, frame, 'Rubber grips', [s * (M.handleTip - 16), 1130, 350], [s * (M.handleTip - 16), 1250, 360], 32, 110);
    bent(k, frame, [[s * M.railX, 400, under], [s * (M.railX + 30), 330, under + 30]], 30);
    gripHandle(k, frame, 'Rubber grips', [s * (M.railX + 30), 330, under + 30], [s * (M.railX + 40), 230, under + 60], 30, 90);
  }
  // Knee lever: flat plate from the pivot to the 7-hole roller arm, drum on the pivot, Ø6" × 17.8" roller cantilevered inward.
  const legA = M.rep[prone ? 'curl' : 'extension'][p.rep] ?? 0, len = M.lever.base + (p.roller - 1) * M.lever.step, lx = T.x - 48;
  k.rod(frame, [T.x - 40, P[1], P[2]], [T.x + 30, P[1], P[2]], 38, 24);
  k.push(swingAbout(legA, P));
  k.rod('Aluminium pulley', [T.x - 30, P[1], P[2]], [T.x - 20, P[1], P[2]], 2 * M.drum, 40);
  k.beam(frame, [lx, P[1], P[2] + 40], [lx, P[1], P[2] - len - 50], 12, 90, Y);
  for (let i = 0; i < 7; i++) { const z = P[2] - M.lever.base - i * M.lever.step; k.hole(frame, [lx - 8, P[1], z], [lx + 8, P[1], z], 11, 12); }
  k.rod(red, [lx - 6, P[1], P[2] - 110], [lx - 30, P[1], P[2] - 110], 36, 24);
  k.rod(frame, [lx + 6, P[1], P[2] - len], [T.x - 20, P[1], P[2] - len], 34, 24);
  roller(k, [T.x - 20, P[1], P[2] - len], [T.x - 20 + M.roller.l, P[1], P[2] - len], M.roller.d);
  k.pop();
  // Plate-loaded weight lever under the seat: pivot at the tower, cable bracket at the 1:1 point, chrome 2" horn outward on
  // the right. The drum pays out cable as the knee lever turns, so the lever end lifts.
  const L = M.load, turn = (prone ? legA - M.rep.curl[0] : legA) * Math.PI / 180, lift = turn * M.drum / L.attach * 180 / Math.PI, a = L.rest + lift;
  const end = rearLever(L.pivot, a, L.arm), q = rearLever(L.pivot, a, L.attach);
  k.rod(frame, [T.x + 25, L.pivot[1], L.pivot[2]], [L.pivot[0] + 30, L.pivot[1], L.pivot[2]], 32, 24);
  k.beam(frame, L.pivot, end, 51, 76, X);
  k.beam(frame, [L.pivot[0], q[1], q[2]], [M.pulley[0], q[1], q[2]], 40, 40, Z);
  k.cable('Steel cable', [[M.pulley[0], P[1] + M.drum * .7, P[2] + M.drum * .7], [M.pulley[0], M.pulley[1] - 52, M.pulley[2] + 12], [M.pulley[0], M.pulley[1] + 20, M.pulley[2] + 54], [M.pulley[0], M.pulley[1] + 54, M.pulley[2] - 10], [M.pulley[0], q[1], q[2] + 24]], 5);
  k.rod(hw, [M.pulley[0], q[1], q[2] + 20], [M.pulley[0], q[1], q[2] + 60], 14, 12);
  k.rod(frame, [L.pivot[0] + 26, end[1], end[2]], [L.pivot[0] - 26, end[1], end[2]], 70, 32);
  const root: V3 = [L.pivot[0] - 26, end[1], end[2]];
  k.rod('Chrome plate horn', root, add(root, [-8, 0, 0]), 70, 32);
  k.rod('Chrome plate horn', add(root, [-8, 0, 0]), add(root, [-L.horn, 0, 0]), 50, 40);
  if (p.plates) k.plates('Loaded plate', lb45(p.plates), add(root, [-8.5, 0, 0]), [-1, 0, 0]);
  void scale; void sub; void swing;
}
