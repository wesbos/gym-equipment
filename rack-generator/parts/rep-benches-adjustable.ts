/** REP adjustable benches: shared pad/rail/ladder/quadrant helpers and one layout function per product.
 * Axes: X across, +Y toward the back-pad head end, origin on the floor at the footprint centre. Every pad pivots
 * about its bench's hinge; support links have fixed lengths and their ladder stations are solved per angle. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { BLACKWING } from '../floor-parts/rep-benches.ts';
import { MAT, benchKit, rotYZ, stationOnLine, type BenchKit, type Material, type Pt } from './rep-benches-kit.ts';
import { taperedOutline } from './rep-benches-flat.ts';
import { mountAttachment } from './rep-benches-attachments.ts';
export interface PadLayout {
  H: number; T: number; pivot: Pt; gap: number;
  backLen: number; backW: number; backHeadW?: number; seatLen: number; seatW: number; seatFrontW: number;
  /** ZeroGap slide toward the back pad (mm) when engaged. */ slide?: number;
  railW?: number; railH?: number; corner?: number; edge?: number;
}
/** Back and seat pads with their steel rails, hinged at `pivot`. Returns world transforms for rail-mounted points. */
export function padAssembly(t: BenchKit, g: PadLayout, back: number, seat: number, zeroGap = 0) {
  const [py, pz] = g.pivot, railW = g.railW ?? 50, railH = g.railH ?? 30, corner = g.corner ?? 22, edge = g.edge ?? 14;
  const padZ = g.H - g.T, railZ = padZ - railH / 2, slide = zeroGap ? g.slide ?? 0 : 0;
  const b0 = py + g.gap / 2, b1 = b0 + g.backLen, s1 = py - g.gap / 2 + slide, s0 = s1 - g.seatLen;
  const backPad = t.pad(taperedOutline(t, b0, b1, g.backW, g.backHeadW ?? g.backW, corner), padZ, g.T, edge, 12);
  const seatPad = t.pad(taperedOutline(t, s0, s1, g.seatFrontW, g.seatW, corner), padZ, g.T, edge, 12);
  const backRail = t.member(0, [py - 8, railZ], [b1 - 25, railZ], railW, railH);
  const seatRail = t.member(0, [s0 + 30, railZ], [s1 - 6, railZ], railW, railH);
  const hx = railW / 2 + 3;
  const hinge = [-1, 1].map(s => t.hull([t.span([s * hx - 3, py - 20, railZ - 6], [s * hx + 3, py + 20, railZ + railH / 2]), t.cylX(s * hx - 3, s * hx + 3, py, pz, 40, 20)]));
  const tb = (s: Manifold) => t.articulate(s, g.pivot, back), ts = (s: Manifold) => t.articulate(s, g.pivot, -seat);
  t.add(MAT.vinyl, tb(backPad.vinyl), ts(seatPad.vinyl)); t.add(MAT.piping, tb(backPad.piping), ts(seatPad.piping)); t.add(MAT.board, tb(backPad.backing), ts(seatPad.backing));
  t.add(MAT.frame, tb(backRail), ts(seatRail), ...hinge.map(tb));
  t.add(MAT.hardware, t.cylX(-hx - 14, hx + 14, py, pz, 20, 16));
  return { padZ, railZ, railW, railH, b0, b1, s0, s1, slide, back: (q: Pt) => rotYZ(q, g.pivot, back), seat: (q: Pt) => rotYZ(q, g.pivot, -seat), tb, ts };
}
export type PadFrame = ReturnType<typeof padAssembly>;
/** Point on a straight line at a given Y. */
export const onLine = (a: Pt, b: Pt, y: number): Pt => [y, a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0])];
/** Link length that lands the bracket at `flatStation` with the pad flat. */
export const linkLength = (bracket: Pt, flatStation: Pt) => Math.hypot(bracket[0] - flatStation[0], bracket[1] - flatStation[1]);
/** Where a rotated bracket's fixed-length link meets its ladder line, for each angle. */
export const ladderStations = (bracket: (deg: number) => Pt, len: number, lineA: Pt, lineB: Pt, angles: readonly number[], near?: Pt) =>
  angles.map(a => stationOnLine(bracket(a), len, lineA, [lineB[0] - lineA[0], lineB[1] - lineA[1]], near));
export interface LadderStyle { xs: number[]; thick: number; below: number; above: number; pin: number; closed: boolean; notch?: number }
/** Side ladder plates along A→B: `open` teeth cut down from the top edge to each pin seat, or `closed` slots joined
 * by a retained channel (the pin cannot lift out). Pins seat at the station points on the line. */
export function ladderPlates(t: BenchKit, mat: Material, lineA: Pt, lineB: Pt, stations: Pt[], o: LadderStyle) {
  const dy = lineB[0] - lineA[0], dz = lineB[1] - lineA[1], len = Math.hypot(dy, dz), u: Pt = [dy / len, dz / len], n: Pt = [-u[1], u[0]];
  const off = (q: Pt, h: number, s = 0): Pt => [q[0] + n[0] * h + u[0] * s, q[1] + n[1] * h + u[1] * s];
  const notch = o.notch ?? o.pin + 4, channel = o.above - notch / 2 - 12;
  for (const x of o.xs) {
    const x0 = x - o.thick / 2, top = (q: Pt) => off(q, o.above), bot = (q: Pt) => off(q, -o.below);
    const a = off(lineA, 0, -40), b = off(lineB, 0, 40);
    let plate = t.prismYZ([bot(a), bot(b), top(b), top(a)], x0, o.thick);
    const holes: Manifold[] = [];
    for (const s of stations) {
      holes.push(t.cylX(x0 - 1, x0 + o.thick + 1, s[0], s[1], notch, 20));
      const upTo = o.closed ? channel : o.above + 10;
      holes.push(t.prismYZ([off(s, 0, -notch / 2), off(s, 0, notch / 2), off(s, upTo, notch / 2), off(s, upTo, -notch / 2)], x0 - 1, o.thick + 2));
    }
    if (o.closed) {
      const f = stations.reduce((m, s) => (s[0] < m[0] ? s : m)), l = stations.reduce((m, s) => (s[0] > m[0] ? s : m));
      holes.push(t.prismYZ([off(f, channel - notch / 2, -notch / 2), off(l, channel - notch / 2, notch / 2), off(l, channel + notch / 2, notch / 2), off(f, channel + notch / 2, -notch / 2)], x0 - 1, o.thick + 2));
    }
    t.add(mat, t.cut(plate, holes));
  }
}
/** Stainless or steel quadrant plate about `c` (angles from +Y toward +Z) with one hole per pin station. */
export function quadrant(t: BenchKit, mat: Material, c: Pt, r0: number, r1: number, a0: number, a1: number, x0: number, thick: number, holes: Pt[], hole: number) {
  t.add(mat, t.cut(t.sector(c, r0, r1, a0, a1, x0, thick), holes.map(h => t.cylX(x0 - 1, x0 + thick + 1, h[0], h[1], hole, 16))));
}
/** Pop-pin shaft along X with a knob on the x1 end. */
export function popPin(t: BenchKit, y: number, z: number, x0: number, x1: number, d: number, knob: Material = MAT.stainless) {
  const out = x1 > x0 ? 1 : -1;
  t.add(MAT.hardware, t.cylX(Math.min(x0, x1), Math.max(x0, x1), y, z, d, 20));
  t.add(knob, t.cylX(x1, x1 + out * 14, y, z, d * 1.8, 24), t.cylX(x1 + out * 14, x1 + out * 20, y, z, d * 1.3, 20));
}
/** Seat or back arm that swings with its pad: a pin station on a circle of radius r about the pivot. */
export function armStations(pivot: Pt, r: number, restAngle: number, sign: 1 | -1, angles: readonly number[]) {
  const rest: Pt = [pivot[0] + r * Math.cos(restAngle * Math.PI / 180), pivot[1] + r * Math.sin(restAngle * Math.PI / 180)];
  return { rest, stations: angles.map(a => rotYZ(rest, pivot, sign * a)) };
}
const angleIndex = (list: readonly number[], v: number) => { const i = list.indexOf(v); if (i < 0) throw Error('Unsupported bench angle.'); return i; };

// ── BlackWing (AB-5300) ────────────────────────────────────────────────────────────────────────────────
export function blackwingLayout(p: NumericParams) {
  const L = BLACKWING.length, W = BLACKWING.width, H = BLACKWING.height, T = BLACKWING.padThick;
  const front = -L / 2, rear = L / 2, seatFront = -700, gap = 45, py = seatFront + BLACKWING.seatLength + gap / 2;
  const pads: PadLayout = { H, T, pivot: [py, H - T - 15], gap, backLen: BLACKWING.backLength, backW: BLACKWING.padWidths[p.pad ? 1 : 0], seatLen: BLACKWING.seatLength, seatW: BLACKWING.padWidths[p.pad ? 1 : 0], seatFrontW: BLACKWING.seatFront, slide: 38, railH: 44 };
  const J: Pt = [-440, 292], rearFoot = rear - 170, footTop = 72, spineEnd: Pt = [rearFoot, footTop];
  // Ladder line parallel to the spine axis, pins riding 20 mm above the tube.
  const lift = (q: Pt): Pt => [q[0], q[1] + 58];
  const ladderA = lift(onLine(J, spineEnd, -150)), ladderB = lift(onLine(J, spineEnd, 560));
  const bracketLocal: Pt = [py + 300, H - T - 30 - 42], bracket = (a: number) => rotYZ(bracketLocal, pads.pivot, a);
  const link = linkLength(bracket(0), onLine(ladderA, ladderB, 440));
  const stations = ladderStations(bracket, link, ladderA, ladderB, BLACKWING.back);
  const seatArm = armStations(pads.pivot, 225, 218, -1, BLACKWING.seat);
  return { L, W, H, T, front, rear, pads, J, rearFoot, footTop, spineEnd, ladderA, ladderB, bracket, link, stations, seatArm, handleY: front + 15 };
}
export function buildBlackWingInto(t: BenchKit, p: NumericParams) {
  const g = blackwingLayout(p), { W, J, rearFoot, footTop } = g, back = p.backrestAngle, seat = p.seatAngle;
  const ai = angleIndex(BLACKWING.back, back), si = angleIndex(BLACKWING.seat, seat);
  const pa = padAssembly(t, g.pads, back, seat, p.zeroGap), [py, pz] = g.pads.pivot;
  // Tripod: raked front leg to the T-foot, one 2×3″ spine to the rear foot, then the storage-stand tail.
  t.add(MAT.frame, t.above(t.member(0, [-650, -10], J, 50.8, 76.2), 16), t.member(0, J, g.spineEnd, 50.8, 76.2), t.member(0, [rearFoot, footTop], [g.rear - 44, footTop], 50.8, 60));
  // Hinge tower: side plates from the spine junction up to the pad pivot.
  for (const s of [-1, 1]) t.add(MAT.frame, t.hull([t.cylX(s * 32 - 4, s * 32 + 4, J[0], J[1], 96, 24), t.cylX(s * 32 - 4, s * 32 + 4, py, pz, 56, 24)]));
  // T-foot: winged plate on rubber with the mountain-logo cut-out, cheek plates and the knurled stainless handle.
  const fw = BLACKWING.frontFoot / 2, foot: Pt[] = [[-fw, -560], [-fw, -598], [-95, -640], [-70, -742], [70, -742], [95, -640], [fw, -598], [fw, -560]];
  const logo = t.move(t.k(t.outline([[-34, -702], [34, -702], [34, -690], [0, -657], [-34, -690]], 1).extrude(12)), [0, 0, 5]);
  t.add(MAT.frame, t.cut(t.move(t.k(t.outline(foot, 8).extrude(10)), [0, 0, 6]), [logo]));
  t.add(MAT.rubber, t.k(t.k(t.outline(foot, 8).offset(-4, 'Round', 2, 16)).extrude(6)));
  const hx = BLACKWING.handleLength / 2;
  for (const s of [-1, 1]) t.add(MAT.frame, t.hull([t.span([s * (hx + 5) - 5, -735, 14], [s * (hx + 5) + 5, -690, 22]), t.cylX(s * (hx + 5) - 5, s * (hx + 5) + 5, g.handleY, 42, 30, 20)]));
  t.knurledBar(-hx, hx, g.handleY, 42, BLACKWING.handleDiameter);
  // Rear foot: 2×3″ cross tube, wheels in housings, rubber end blocks.
  t.add(MAT.frame, t.crossTube(-W / 2 + 70, W / 2 - 70, rearFoot, 42, 76.2, 60), t.span([-40, rearFoot - 45, footTop], [40, rearFoot + 45, footTop + 6]));
  for (const s of [-1, 1]) {
    t.endCap(s * (W / 2 - 70), s * W / 2, rearFoot, 0, 80, 84);
    for (const side of [-1, 1]) t.add(MAT.frame, t.span([s * (W / 2 - 115) + side * 19 - 3, rearFoot + 38, 16], [s * (W / 2 - 115) + side * 19 + 3, rearFoot + 92, 70]));
    t.wheel(s * (W / 2 - 115), rearFoot + 66, 36, 66, 28);
  }
  // Storage stand at the head end: upright tabs with a plastic liner.
  for (const s of [-1, 1]) t.add(MAT.frame, t.span([s * 40 - 4, g.rear - 46, footTop - 30], [s * 40 + 4, g.rear - 10, footTop + 96]));
  t.add(MAT.uhmw, t.slab(96, 10, 110, 3, [0, g.rear - 5, footTop - 18]));
  // Closed 12-station back ladder and the twin-plate support arm with its knob pin.
  ladderPlates(t, MAT.frame, g.ladderA, g.ladderB, g.stations, { xs: [-34, 34], thick: 8, below: 96, above: 62, pin: 25, closed: true });
  const st = g.stations[ai], br = g.bracket(back);
  for (const s of [-1, 1]) t.add(MAT.frame, t.member(s * 22, br, st, 8, 62, 0));
  t.add(MAT.frame, pa.tb(t.span([-30, py + 282, pa.railZ - 56], [30, py + 318, pa.railZ])));
  t.add(MAT.hardware, t.cylX(-30, 30, br[0], br[1], 20, 16));
  popPin(t, st[0], st[1], -44, 48, 22);
  // Ratcheting seat: stainless arc on the hinge tower, seat arm and pop-pin.
  quadrant(t, MAT.stainless, g.pads.pivot, 200, 250, 218 - 55, 218 + 20, 40, 6, g.seatArm.stations, 16);
  const pin = g.seatArm.stations[si];
  t.add(MAT.frame, pa.ts(t.hull([t.span([46, pa.s1 - 130, pa.railZ - 20], [52, pa.s1 - 40, pa.railZ]), t.cylX(46, 52, g.seatArm.rest[0], g.seatArm.rest[1], 30, 16)])));
  popPin(t, pin[0], pin[1], 34, 56, 12);
  // ZeroGap carriage under the seat with its stainless label plate and slide knob.
  t.add(MAT.frame, pa.ts(t.member(0, [pa.s0 + 40, pa.railZ - 45], [pa.s1 - 30, pa.railZ - 45], 60, 60)));
  t.add(MAT.stainless, pa.ts(t.cut(t.span([30, pa.s0 + 50, pa.railZ - 67], [32.5, pa.s0 + 300, pa.railZ - 23]), Array.from({ length: 8 }, (_, i) => t.cylX(29, 34, pa.s0 + 175 + i * 15, pa.railZ - 45, 7, 10)))));
  t.add(MAT.stainless, pa.ts(t.cylX(-50, -32, pa.s1 - 60, pa.railZ - 45, 34, 20)));
  for (const y of [-80, 210, 480]) { const z = onLine(g.ladderA, g.ladderB, y)[1] - 70; t.boltX(38, y, z, 1); t.boltX(-38, y, z, -1); }
  return { g, pa };
}
export function buildBlackWing(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = benchKit(api);
  return t.finish('BlackWing', () => {
    const { g, pa } = buildBlackWingInto(t, p);
    // Receiver knob under the back-rail head end, then the chosen attachment.
    t.add(MAT.hardware, pa.tb(t.cyl([0, pa.b1 - 60, pa.railZ - 22], [0, pa.b1 - 60, pa.railZ - 50], 12, 12)));
    t.add(MAT.grip, pa.tb(t.cyl([0, pa.b1 - 60, pa.railZ - 50], [0, pa.b1 - 60, pa.railZ - 64], 36, 20)));
    mountAttachment(t, p.attachment, { tb: pa.tb, railEnd: pa.b1 - 25, railZ: pa.railZ, rearContact: g.rearFoot, frontFoot: -650 });
  });
}
