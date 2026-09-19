/** REP FID benches with their own frames: AB-3000 1.0 / 2.0 (built-in hinged leg rollers, open ladder, pop-pin seat)
 * and the AB-5000 Zero Gap (four-foot frame, stainless quadrants with blue pop-pins, sliding seat on guide rods). */
import type { ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { AB3000, AB3002, AB5000 } from '../floor-parts/rep-benches.ts';
import { MAT, benchKit, rotYZ, type BenchKit, type Material, type Pt } from './rep-benches-kit.ts';
import { mountAttachment } from './rep-benches-attachments.ts';
import { armStations, ladderPlates, ladderStations, linkLength, onLine, padAssembly, popPin, quadrant, type PadLayout } from './rep-benches-adjustable.ts';
const BLUE: Material = ['Blue anodized pop-pin knobs', 'source', '#1d5fd1', .5, .35];
const angleIndex = (list: readonly number[], v: number) => { const i = list.indexOf(v); if (i < 0) throw Error('Unsupported bench angle.'); return i; };
/** Seat pad with the AB-3000's thick rounded nose: a 4″ bolster across the wide front edge. */
function seatNose(t: BenchKit, pa: ReturnType<typeof padAssembly>, width: number, H: number) {
  // Top flush with the pad; the 4″ roll hangs ~1.2″ below the 2.8″ pad, as REP's pad table describes.
  const r = 50.8, s = t.hull([t.cylX(-width / 2 + 24, width / 2 - 24, pa.s0 + r, H - r, 2 * r, 32), t.cylX(-width / 2 + 24, width / 2 - 24, pa.s0 + r + 40, H - r, 2 * r, 32)]);
  t.add(MAT.vinyl, pa.ts(s));
}

// ── AB-3000 (1.0 and 2.0) ──────────────────────────────────────────────────────────────────────────────
interface Ab3000Spec { v2: boolean; L: number; W: number; H: number; T: number; back: readonly number[]; seat: readonly number[]; gap: number; backLen: number; backW: (p: NumericParams) => number; seatLen: number; seatW: number; seatFront: number; roller: number }
const AB3002_SPEC: Ab3000Spec = { v2: true, L: AB3002.length, W: AB3002.width, H: AB3002.height, T: AB3002.padThick, back: AB3002.back, seat: AB3002.seat, gap: AB3002.gap, backLen: AB3002.backLength, backW: p => AB3002.padWidths[p.pad ? 1 : 0], seatLen: AB3002.seatLength, seatW: AB3002.seatFront, seatFront: AB3002.seatWidth, roller: AB3002.roller };
const AB3000_SPEC: Ab3000Spec = { v2: false, L: AB3000.length, W: AB3000.width, H: AB3000.height, T: AB3000.padThick, back: AB3000.back, seat: AB3000.seat, gap: AB3000.gap, backLen: AB3000.backLength, backW: () => AB3000.backWidth, seatLen: AB3000.seatLength, seatW: AB3000.seatFront, seatFront: AB3000.seatWidth, roller: 185 };
export function ab3000Layout(s: Ab3000Spec, p: NumericParams) {
  const front = -s.L / 2, rear = s.L / 2, rollerD = 152, rearFoot = rear - (s.v2 ? 38.1 : 70), footTop = 72;
  const head = rear - 20, py = head - s.backLen - s.gap / 2;
  const pads: PadLayout = { H: s.H, T: s.T, pivot: [py, s.H - s.T - 15], gap: s.gap, backLen: s.backLen, backW: s.backW(p), seatLen: s.seatLen, seatW: s.seatW, seatFrontW: s.seatFront };
  const post = py - s.seatLen + 70, J: Pt = [post, 300], spineEnd: Pt = [rearFoot, footTop];
  const lift = (q: Pt): Pt => [q[0], q[1] + 50];
  const ladderA = lift(onLine(J, spineEnd, py + 60)), ladderB = lift(onLine(J, spineEnd, rearFoot - 110));
  const railBottom = s.H - s.T - 30, backLocal: Pt = [py + 250, railBottom - 36], bracket = (a: number) => rotYZ(backLocal, pads.pivot, a);
  const link = linkLength(bracket(0), onLine(ladderA, ladderB, rearFoot - 220));
  const stations = ladderStations(bracket, link, ladderA, ladderB, s.back);
  const seatArm = armStations(pads.pivot, 250, 208, -1, s.seat);
  // Leg-roller arm: hinge low on the front post; hole 1 puts the rollers forward (use), later holes swing them back.
  const hinge: Pt = [post - 10, 250], armLen = Math.hypot(front + rollerD / 2 - hinge[0], 118 - hinge[1]);
  const arm0 = Math.atan2(118 - hinge[1], front + rollerD / 2 - hinge[0]) * 180 / Math.PI;
  const rollerAt = (hole: number): Pt => { const a = (arm0 + (hole - 1) * 11) * Math.PI / 180; return [hinge[0] + armLen * Math.cos(a), hinge[1] + armLen * Math.sin(a)]; };
  return { front, rear, rearFoot, footTop, pads, post, J, spineEnd, ladderA, ladderB, bracket, link, stations, seatArm, hinge, rollerAt, rollerD, railBottom };
}
function buildAb3000Into(t: BenchKit, s: Ab3000Spec, p: NumericParams) {
  const g = ab3000Layout(s, p), ai = angleIndex(s.back, p.backrestAngle), si = angleIndex(s.seat, p.seatAngle);
  if (!(p.roller >= 1 && p.roller <= 6 && Number.isInteger(p.roller))) throw Error('Unsupported leg roller position.');
  const pa = padAssembly(t, g.pads, p.backrestAngle, p.seatAngle), { W } = s, [py, pz] = g.pads.pivot;
  seatNose(t, pa, s.seatFront, s.H);
  // Front A-frame: vertical post and a diagonal brace, spine down to the rear foot.
  t.add(MAT.frame, t.member(0, [g.post, 20], g.J, 76.2, 76.2), t.member(0, g.J, g.spineEnd, 50.8, 76.2), t.above(t.member(0, [g.post + 140, 0], onLine(g.J, g.spineEnd, g.post + 290), 50.8, 50.8), 20));
  for (const x of [-1, 1]) t.add(MAT.frame, t.hull([t.cylX(x * 42 - 4, x * 42 + 4, g.J[0], g.J[1], 110, 24), t.cylX(x * 42 - 4, x * 42 + 4, py, pz, 60, 24), t.cylX(x * 42 - 4, x * 42 + 4, g.J[0] - 20, g.J[1] + 40, 60, 24)]));
  // REP badge plate on the hinge tower side.
  t.add(s.v2 ? MAT.frame : MAT.stainless, t.span([44, g.J[0] + 30, g.J[1] - 5], [47, g.J[0] + 150, g.J[1] + 40]));
  t.add(s.v2 ? MAT.logo : MAT.frame, t.span([46.5, g.J[0] + 45, g.J[1] + 5], [48, g.J[0] + 135, g.J[1] + 30]));
  // Feet: 2.0 rubber-covered cross bases; 1.0 round floor pads on the post and rear-foot ends.
  const frontW = s.v2 ? 420 : 300;
  t.add(MAT.frame, t.crossTube(-frontW / 2 + (s.v2 ? 55 : 30), frontW / 2 - (s.v2 ? 55 : 30), g.post + 40, 36, 150, 40));
  t.add(MAT.frame, t.crossTube(-W / 2 + (s.v2 ? 64 : 70), W / 2 - (s.v2 ? 64 : 70), g.rearFoot, 42, 76.2, 60), t.span([-40, g.rearFoot - 38, g.footTop], [40, g.rearFoot + 38, g.footTop + 6]));
  for (const x of [-1, 1]) {
    if (s.v2) { t.endCap(x * (frontW / 2 - 55), x * frontW / 2, g.post + 40, 0, 150, 60); t.endCap(x * (W / 2 - 64), x * W / 2, g.rearFoot, 0, 76.2, 82); }
    else {
      t.add(MAT.rubber, t.cyl([x * (frontW / 2 - 30), g.post + 40, 0], [x * (frontW / 2 - 30), g.post + 40, 12], 110, 32), t.cyl([x * (W / 2 - 70), g.rearFoot, 0], [x * (W / 2 - 70), g.rearFoot, 12], 140, 32));
      t.add(MAT.frame, t.span([x * (W / 2 - 70) - 40, g.rearFoot - 38, 12], [x * (W / 2 - 70) + 40, g.rearFoot + 38, 72]), t.span([x * (frontW / 2 - 30) - 30, g.post + 40 - 75, 12], [x * (frontW / 2 - 30) + 30, g.post + 40 + 75, 56]));
      t.add(MAT.rubber, t.span([x * W / 2 - (x > 0 ? 40 : 0), g.rearFoot - 20, 20], [x * W / 2 + (x < 0 ? 40 : 0), g.rearFoot + 20, 62]));
    }
    // Enclosed (2.0) or open (1.0) transport wheels at the rear-foot ends, toward the bench.
    const wx = x * (W / 2 - (s.v2 ? 110 : 150)), wy = g.rearFoot - 66;
    for (const side of [-1, 1]) t.add(MAT.frame, t.span([wx + side * 19 - 3, wy - 32, s.v2 ? 12 : 30], [wx + side * 19 + 3, g.rearFoot - 38, 70]));
    t.wheel(wx, wy, 38, 64, 26);
  }
  // Open ladder with laser-cut numbers (2.0) along the spine, support arm and pin with rubber end caps.
  ladderPlates(t, MAT.frame, g.ladderA, g.ladderB, g.stations, { xs: [-33, 33], thick: 8, below: 86, above: 44, pin: 22, closed: false });
  const st = g.stations[ai], br = g.bracket(p.backrestAngle);
  for (const x of [-1, 1]) t.add(MAT.frame, t.member(x * 20, br, st, 8, 56, 0));
  t.add(MAT.frame, pa.tb(t.span([-28, py + 230, g.railBottom - 48], [28, py + 270, g.railBottom])));
  t.add(MAT.hardware, t.cylX(-45, 45, st[0], st[1], 22, 20), t.cylX(-28, 28, br[0], br[1], 20, 16));
  for (const x of [-1, 1]) t.add(MAT.rubber, t.cylX(x * 45, x * 60, st[0], st[1], 30, 20));
  // Pop-pin seat: hole plate on the hinge tower, seat arm and pin.
  quadrant(t, MAT.frame, g.pads.pivot, 222, 278, 208 - 30, 208 + 12, 46, 8, g.seatArm.stations, 14);
  const sp = g.seatArm.stations[si];
  t.add(MAT.frame, pa.ts(t.hull([t.span([54, pa.s1 - 140, g.railBottom - 20], [60, pa.s1 - 40, g.railBottom]), t.cylX(54, 60, g.seatArm.rest[0], g.seatArm.rest[1], 34, 16)])));
  popPin(t, sp[0], sp[1], 40, 62, 12);
  // Built-in leg rollers on the hinged arm, locked by a pin through one of six holes.
  const rc = g.rollerAt(p.roller), holes = [1, 2, 3, 4, 5, 6].map(h => { const q = g.rollerAt(h), d = Math.hypot(q[0] - g.hinge[0], q[1] - g.hinge[1]); return [g.hinge[0] + (q[0] - g.hinge[0]) * 70 / d, g.hinge[1] + (q[1] - g.hinge[1]) * 70 / d] as Pt; });
  for (const x of [-1, 1]) t.add(MAT.frame, t.cut(t.hull(holes.map(h => t.cylX(x * 44 - 4, x * 44 + 4, h[0], h[1], 34, 16)).concat(t.cylX(x * 44 - 4, x * 44 + 4, g.hinge[0], g.hinge[1], 46, 20))), holes.map(h => t.cylX(x * 44 - 6, x * 44 + 6, h[0], h[1], 12, 12))));
  t.add(MAT.frame, t.member(0, g.hinge, rc, 50.8, 50.8));
  const lock = holes[p.roller - 1];
  popPin(t, lock[0], lock[1], -52, 52, 10, MAT.hardware);
  const half = s.roller + 30;
  t.add(MAT.stainless, t.cylX(-half - 6, half + 6, rc[0], rc[1], 22, 16));
  for (const x of [-1, 1]) {
    t.add(MAT.foam, t.cylX(x * 30, x * (30 + s.roller), rc[0], rc[1], g.rollerD, 32));
    t.add(MAT.stainless, t.cylX(x * (30 + s.roller), x * (32 + s.roller), rc[0], rc[1], 70, 20));
  }
  // Handle on the roller arm: 2.0 horizontal rubber-gripped bar; 1.0 vertical grip with raised rings.
  const hq: Pt = [g.hinge[0] + (rc[0] - g.hinge[0]) * .55, g.hinge[1] + (rc[1] - g.hinge[1]) * .55];
  if (s.v2) t.add(MAT.grip, t.cylX(-75, 75, hq[0], hq[1] + 40, 28, 20)), t.add(MAT.frame, t.member(0, hq, [hq[0], hq[1] + 40], 30, 30));
  else {
    const top: Pt = [hq[0] - 10, hq[1] + 170];
    t.add(MAT.frame, t.cyl([0, hq[0], hq[1]], [0, top[0], top[1]], 28, 20));
    for (let f = .45; f < .95; f += .12) t.add(MAT.grip, t.cyl([0, hq[0] + (top[0] - hq[0]) * f, hq[1] + (top[1] - hq[1]) * f], [0, hq[0] + (top[0] - hq[0]) * (f + .04), hq[1] + (top[1] - hq[1]) * (f + .04)], 32, 20));
  }
  return { g, pa };
}
export const buildAb3000 = (v2: boolean) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const t = benchKit(api);
  return t.finish(v2 ? 'AB-3000 2.0' : 'AB-3000', () => { buildAb3000Into(t, v2 ? AB3002_SPEC : AB3000_SPEC, p); });
};
export const ab3000LayoutFor = (v2: boolean, p: NumericParams) => ab3000Layout(v2 ? AB3002_SPEC : AB3000_SPEC, p);

// ── AB-5000 Zero Gap ───────────────────────────────────────────────────────────────────────────────────
export function ab5000Layout(p: NumericParams) {
  const L = AB5000.length, W = AB5000.width, H = AB5000.height, T = AB5000.padThick, front = -L / 2, rear = L / 2;
  const seatFront = -690, py = seatFront + AB5000.seatLength + AB5000.gap / 2, wide = p.pad ? 1 : 0;
  const pads: PadLayout = { H, T, pivot: [py, H - T - 15], gap: AB5000.gap, slide: AB5000.slide, railH: 44, backLen: AB5000.backLength, backW: AB5000.padWidths[wide], seatLen: AB5000.seatLength, seatW: AB5000.seatWidths[wide], seatFrontW: AB5000.seatFronts[wide] };
  const frontFoot = -560, rearFoot = rear - 41.1, footTop = 64, beamZ = 300;
  const beamA: Pt = [py - 60, beamZ], beamB: Pt = [py + 560, beamZ];
  const backArm = armStations(pads.pivot, 245, 188, 1, AB5000.back), seatArm = armStations(pads.pivot, 175, 232, -1, AB5000.seat);
  return { L, W, H, T, front, rear, pads, frontFoot, rearFoot, footTop, beamA, beamB, backArm, seatArm };
}
export function buildAb5000Into(t: BenchKit, p: NumericParams) {
  const g = ab5000Layout(p), ai = angleIndex(AB5000.back, p.backrestAngle), si = angleIndex(AB5000.seat, p.seatAngle);
  const pa = padAssembly(t, g.pads, p.backrestAngle, p.seatAngle, p.zeroGap), { W } = g, [py, pz] = g.pads.pivot;
  // 2×3.5″ frame: front and rear cross-feet, raked legs up to the horizontal REP beam, vertical rear post.
  const tube = [50.8, 88.9] as const;
  t.add(MAT.frame, t.above(t.member(0, [g.frontFoot - 20, 20], g.beamA, tube[0], tube[1]), g.footTop), t.member(0, g.beamA, g.beamB, tube[0], tube[1]));
  t.add(MAT.frame, t.above(t.member(0, g.beamB, [g.rearFoot - 60, 30], tube[0], tube[1]), g.footTop), t.member(0, [g.rearFoot, g.footTop], [g.rearFoot, g.H - g.T - 30 - 8], 50.8, 50.8));
  t.add(MAT.rubber, t.slab(56, 56, 8, 6, [0, g.rearFoot, g.H - g.T - 30 - 8]));
  for (const x of [-1, 1]) t.add(MAT.frame, t.hull([t.cylX(x * 32 - 4, x * 32 + 4, g.beamA[0], g.beamA[1], 96, 24), t.cylX(x * 32 - 4, x * 32 + 4, py, pz, 56, 24)]));
  t.add(MAT.stainless, t.span([26, g.beamA[0] + 250, g.beamA[1] - 26], [28, g.beamA[0] + 390, g.beamA[1] + 26]));
  for (const [y, w, d] of [[g.frontFoot, 330, 76.2], [g.rearFoot, W, 76.2]] as const) {
    t.add(MAT.frame, t.crossTube(-w / 2 + 70, w / 2 - 70, y, 34, d, 60), t.span([-40, y - 38, g.footTop - 4], [40, y + 38, g.footTop + 4]));
    for (const x of [-1, 1]) t.endCap(x * (w / 2 - 70), x * w / 2, y, 0, d + 6, 72);
  }
  t.add(MAT.stainless, t.span([-120, g.frontFoot - 39, 18], [-10, g.frontFoot - 38, 50]));
  for (const x of [-1, 1]) {
    for (const side of [-1, 1]) t.add(MAT.frame, t.span([x * (W / 2 - 110) + side * 19 - 3, g.rearFoot - 100, 14], [x * (W / 2 - 110) + side * 19 + 3, g.rearFoot - 38, 66]));
    t.wheel(x * (W / 2 - 110), g.rearFoot - 72, 36, 64, 26);
  }
  // Urethane grip handle raked forward from the front leg, with a stainless end cap.
  const hA = onLine([g.frontFoot - 20, 20], g.beamA, g.frontFoot + 60), hz = 150;
  t.add(MAT.frame, t.cyl([0, hA[0], hA[1]], [0, g.front + 110, hz], 32, 20));
  t.add(MAT.grip, t.cyl([0, g.front + 110, hz], [0, g.front + 12, hz], 38, 24));
  t.add(MAT.stainless, t.cyl([0, g.front + 12, hz], [0, g.front, hz], 30, 24));
  // Stainless quadrants with laser-cut stations and blue anodized pop-pins: back arc and seat arc.
  quadrant(t, MAT.stainless, g.pads.pivot, 220, 270, 188 - 8, 188 + 100, 34, 5, g.backArm.stations, 16);
  quadrant(t, MAT.stainless, g.pads.pivot, 150, 200, 232 - 50, 232 + 20, -39, 5, g.seatArm.stations, 14);
  const bp = g.backArm.stations[ai], sp = g.seatArm.stations[si];
  t.add(MAT.frame, pa.tb(t.hull([t.span([40, py + 30, pa.railZ - 20], [46, py + 110, pa.railZ]), t.cylX(40, 46, g.backArm.rest[0], g.backArm.rest[1], 36, 16)])));
  t.add(MAT.frame, pa.ts(t.hull([t.span([-50, pa.s1 - 120, pa.railZ - 20], [-44, pa.s1 - 40, pa.railZ]), t.cylX(-50, -44, g.seatArm.rest[0], g.seatArm.rest[1], 32, 16)])));
  popPin(t, bp[0], bp[1], 28, 50, 12, BLUE); popPin(t, sp[0], sp[1], -32, -54, 12, BLUE);
  // ZeroGap seat carriage: twin chrome guide rods, end plates and the slide knob.
  const rodZ = pa.railZ - 35;
  for (const x of [-1, 1]) t.add(MAT.stainless, pa.ts(t.cyl([x * 22, pa.s0 + 20, rodZ], [x * 22, pa.s1 - 30, rodZ], 20, 20)));
  for (const y of [pa.s0 + 16, pa.s1 - 36]) t.add(MAT.frame, pa.ts(t.span([-44, y - 6, rodZ - 18], [44, y + 6, pa.railZ])));
  t.add(MAT.hardware, pa.ts(t.cyl([0, pa.s1 - 100, rodZ - 20], [0, pa.s1 - 100, rodZ - 60], 16, 16)), pa.ts(t.cyl([0, pa.s1 - 100, rodZ - 60], [0, pa.s1 - 100, rodZ - 76], 40, 20)));
  // Receiver knob under the back rail head end (for the leg roller attachment).
  const knob = pa.tb(t.cyl([0, pa.b1 - 60, pa.railZ - 15], [0, pa.b1 - 60, pa.railZ - 45], 12, 12)), cap = pa.tb(t.cyl([0, pa.b1 - 60, pa.railZ - 45], [0, pa.b1 - 60, pa.railZ - 60], 34, 20));
  t.add(MAT.hardware, knob); t.add(MAT.grip, cap);
  return { g, pa };
}
export function buildAb5000(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = benchKit(api);
  return t.finish('AB-5000', () => {
    const { g, pa } = buildAb5000Into(t, p);
    mountAttachment(t, p.attachment, { tb: pa.tb, railEnd: pa.b1 - 25, railZ: pa.railZ, rearContact: g.rearFoot, frontFoot: g.frontFoot });
  });
}
