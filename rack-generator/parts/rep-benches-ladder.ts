/** REP ladder benches that share one layout: AB-4100 (1.0), AB-5200 1.0, AB-5200 2.0 and AB-3100. A front leg (raked or
 * vertical) meets one 2×3″ spine that runs down to the rear cross-foot; the back link rides a ladder along the spine and
 * the seat link rides a ladder on the front leg. Stations are solved from fixed link lengths for every published angle. */
import type { ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { AB3100, AB4100, AB5200, AB5202 } from '../floor-parts/rep-benches.ts';
import { REP_AB_5200_2 } from '../floor-parts/rep-benches.ts';
import { MAT, benchKit, rotYZ, type BenchKit, type Material, type Pt } from './rep-benches-kit.ts';
import { ladderPlates, ladderStations, linkLength, onLine, padAssembly, popPin, type LadderStyle, type PadLayout } from './rep-benches-adjustable.ts';
export interface LadderBench {
  label: string; L: number; W: number; pads: (p: NumericParams) => PadLayout;
  back: readonly number[]; seat: readonly number[]; decline?: readonly number[];
  /** Front leg from its floor end to the junction with the spine. */ frontFoot: Pt; J: Pt; legTube?: [number, number];
  frontStyle: 'tfoot' | 'plate' | 'crossbar'; frontFootWidth: number; /** cheeks: side plates from the foot; stem: short tube forward from the foot bar; leg: bar through the front leg. */
  handle: { y: number; z: number; length: number; d: number; mat: Material; mount: 'cheeks' | 'stem' | 'leg' };
  rearFoot: number; footTop: number; wheels: 'behind' | 'ends';
  rearPost?: { y: number; adjustable?: boolean }; storage?: { y: number };
  backLadder: { from: number; to: number; lift: number; flatY: number; bracket: number; drop: number; style: LadderStyle; cage?: boolean };
  seatLadder: { offset: number; from: number; to: number; flat: number; bracket: number; drop: number; style: LadderStyle };
  rails?: (p: NumericParams) => Material;
}
/** Layout shared by builder and tests: pads, ladder lines and every solved station. */
export function ladderLayout(b: LadderBench, p: NumericParams) {
  const pads = b.pads(p), [py, pz] = pads.pivot, railBottom = pads.H - pads.T - (pads.railH ?? 30);
  const spineEnd: Pt = [b.rearFoot, b.footTop];
  const lift = (q: Pt): Pt => [q[0], q[1] + b.backLadder.lift];
  const ladderA = lift(onLine(b.J, spineEnd, b.backLadder.from)), ladderB = lift(onLine(b.J, spineEnd, b.backLadder.to));
  const backLocal: Pt = [py + b.backLadder.bracket, railBottom - b.backLadder.drop], backBracket = (a: number) => rotYZ(backLocal, pads.pivot, a);
  const backLink = linkLength(backBracket(0), onLine(ladderA, ladderB, b.backLadder.flatY));
  const angles = [...(b.decline ?? []), ...b.back];
  const backStations = ladderStations(backBracket, backLink, ladderA, ladderB, angles);
  // Seat ladder: a line offset forward of the front-leg axis (toward −Y) between two fractions of the leg.
  const leg = (f: number): Pt => [b.frontFoot[0] + (b.J[0] - b.frontFoot[0]) * f, b.frontFoot[1] + (b.J[1] - b.frontFoot[1]) * f];
  const dl = Math.hypot(b.J[0] - b.frontFoot[0], b.J[1] - b.frontFoot[1]), nrm: Pt = [-(b.J[1] - b.frontFoot[1]) / dl, (b.J[0] - b.frontFoot[0]) / dl];
  const offLeg = (q: Pt): Pt => [q[0] + nrm[0] * b.seatLadder.offset, q[1] + nrm[1] * b.seatLadder.offset];
  const seatA = offLeg(leg(b.seatLadder.from)), seatB = offLeg(leg(b.seatLadder.to)), seatFlat = offLeg(leg(b.seatLadder.flat));
  const seatLocal: Pt = [py - b.seatLadder.bracket, railBottom - b.seatLadder.drop], seatBracket = (a: number) => rotYZ(seatLocal, pads.pivot, -a);
  const seatLink = linkLength(seatBracket(0), seatFlat);
  const seatStations = ladderStations(seatBracket, seatLink, seatA, seatB, b.seat, seatFlat);
  /** Rear post top for a back angle: the rail underside where it crosses the post (declines lower an adjustable post). */
  const postTop = (a: number) => b.rearPost ? pz + (b.rearPost.y - py) * Math.tan(a * Math.PI / 180) + (railBottom - pz) / Math.cos(a * Math.PI / 180) : 0;
  return { pads, railBottom, spineEnd, ladderA, ladderB, backBracket, backLink, backStations, angles, seatA, seatB, seatBracket, seatLink, seatStations, postTop, py, pz };
}
export function buildLadderBenchInto(t: BenchKit, b: LadderBench, p: NumericParams) {
  const g = ladderLayout(b, p), back = p.backrestAngle, seat = p.seatAngle;
  const ai = g.angles.indexOf(back), si = b.seat.indexOf(seat);
  if (ai < 0 || si < 0 || (!b.rearPost?.adjustable && back < 0) || (back < 0 && !p.post)) throw Error('Unsupported bench angle.');
  const pa = padAssembly(t, g.pads, back, seat), { W } = b, [lw, lh] = b.legTube ?? [50.8, 76.2], rails = b.rails?.(p) ?? MAT.frame;
  const front = -b.L / 2, rear = b.L / 2;
  // Front leg, spine and hinge tower.
  t.add(MAT.frame, t.above(t.member(0, [b.frontFoot[0] + (b.frontFoot[0] - b.J[0]) * .08, b.frontFoot[1] - 30], b.J, lw, lh), b.frontStyle === 'crossbar' ? 40 : 16), t.member(0, b.J, g.spineEnd, 50.8, 76.2));
  for (const s of [-1, 1]) t.add(MAT.frame, t.hull([t.cylX(s * 32 - 4, s * 32 + 4, b.J[0], b.J[1], 96, 24), t.cylX(s * 32 - 4, s * 32 + 4, g.py, g.pz, 56, 24)]));
  // Front foot and carry handle.
  const hx = b.handle.length / 2, fy = b.frontFoot[0];
  if (b.frontStyle === 'tfoot') {
    const fw = b.frontFootWidth / 2, foot: Pt[] = [[-fw, fy + 60], [-fw, fy - 40], [-hx - 10, front + 40], [hx + 10, front + 40], [fw, fy - 40], [fw, fy + 60]];
    t.add(MAT.frame, t.move(t.k(t.outline(foot, 10).extrude(10)), [0, 0, 6]));
    t.add(MAT.rubber, t.k(t.k(t.outline(foot, 10).offset(-3, 'Round', 2, 16)).extrude(6)));
  } else if (b.frontStyle === 'plate') {
    // Square foot plate whose toe is the bench's front extreme.
    const len = 2 * (fy - front);
    t.add(MAT.frame, t.slab(b.frontFootWidth, len - 6, 10, 6, [0, fy, 6])); t.add(MAT.rubber, t.slab(b.frontFootWidth, len, 6, 5, [0, fy, 0]));
  } else {
    t.add(MAT.frame, t.crossTube(-b.frontFootWidth / 2 + 45, b.frontFootWidth / 2 - 45, fy, 22, 40, 40));
    for (const s of [-1, 1]) t.endCap(s * (b.frontFootWidth / 2 - 45), s * b.frontFootWidth / 2, fy, 0, 52, 50);
  }
  if (b.handle.mount === 'cheeks') for (const s of [-1, 1]) t.add(MAT.frame, t.hull([t.span([s * (hx + 5) - 5, fy - 30, 14], [s * (hx + 5) + 5, fy + 10, 24]), t.cylX(s * (hx + 5) - 5, s * (hx + 5) + 5, b.handle.y, b.handle.z, b.handle.d + 8, 20)]));
  else if (b.handle.mount === 'stem') t.add(MAT.frame, t.cyl([0, b.handle.y, b.handle.z], [0, fy, b.handle.z], 32, 16));
  if (b.handle.mat === MAT.knurl) t.knurledBar(-hx, hx, b.handle.y, b.handle.z, b.handle.d);
  else t.add(b.handle.mat, t.cylX(-hx, hx, b.handle.y, b.handle.z, b.handle.d, 24));
  // Rear cross-foot with grooved rubber end caps and transport wheels.
  t.add(MAT.frame, t.crossTube(-W / 2 + 64, W / 2 - 64, b.rearFoot, 42, 76.2, 60), t.span([-40, b.rearFoot - 45, b.footTop], [40, b.rearFoot + 45, b.footTop + 6]));
  for (const s of [-1, 1]) {
    t.endCap(s * (W / 2 - 64), s * W / 2, b.rearFoot, 0, 80, 82);
    const wx = s * (W / 2 - (b.wheels === 'ends' ? 100 : 130)), wy = b.rearFoot + 38 + 26;
    for (const side of [-1, 1]) t.add(MAT.frame, t.span([wx + side * 19 - 3, b.rearFoot + 38, 16], [wx + side * 19 + 3, wy + 22, 68]));
    t.wheel(wx, wy, 36, 64, 28);
  }
  // Rear support post (fixed, or telescoping with a pop-pin for the decline angles) with its rubber rest.
  if (b.rearPost) {
    const top = g.postTop(back < 0 ? back : 0) - 8, y = b.rearPost.y, adjustable = !!(b.rearPost.adjustable && p.post);
    t.add(MAT.frame, t.member(0, [y, b.footTop], [y, adjustable ? 250 : top], 50.8, 50.8));
    if (adjustable) {
      t.add(BLACK_CHROME, t.member(0, [y, 180], [y, top], 38, 38, 0));
      popPin(t, y, 225, 26, 40, 14);
      for (let z = 262; z < top - 10; z += 22) t.add(MAT.hardware, t.cylX(-19.5, -18.5, y, z, 8, 10));
    }
    t.add(MAT.rubber, t.slab(56, 56, 8, 6, [0, y, top]));
  }
  if (b.storage) {
    t.add(MAT.frame, t.member(0, [b.rearFoot, b.footTop], [b.storage.y, b.footTop], 50.8, 60));
    for (const s of [-1, 1]) t.add(MAT.frame, t.span([s * 40 - 4, b.storage.y - 30, b.footTop - 30], [s * 40 + 4, rear - 10, b.footTop + 96]));
    t.add(MAT.uhmw, t.slab(96, 10, 110, 3, [0, rear - 5, b.footTop - 18]));
  }
  // Back ladder along the spine, support link and pin.
  const bl = b.backLadder, slots = g.backStations.slice((b.decline ?? []).length);
  ladderPlates(t, rails, g.ladderA, g.ladderB, slots, bl.style);
  if (bl.cage) {
    const up = (q: Pt, h: number): Pt => [q[0], q[1] + h];
    for (const s of [-1, 1]) {
      t.add(rails, t.member(s * (bl.style.xs[1] + 8), up(g.ladderA, bl.style.above + 26), up(g.ladderB, bl.style.above + 26), 8, 14, 0));
      for (const q of [g.ladderA, g.ladderB]) t.add(rails, t.member(s * (bl.style.xs[1] + 8), up(q, bl.style.above - 10), up(q, bl.style.above + 33), 8, 14, 0));
    }
  }
  const st = g.backStations[ai], br = g.backBracket(back);
  for (const s of [-1, 1]) t.add(MAT.frame, t.member(s * 20, br, st, 8, 56, 0));
  t.add(MAT.frame, pa.tb(t.span([-28, g.py + bl.bracket - 20, g.railBottom - bl.drop - 12], [28, g.py + bl.bracket + 20, g.railBottom])));
  t.add(MAT.hardware, t.cylX(-28, 28, br[0], br[1], 20, 16));
  const pinX = bl.style.xs[1] + bl.style.thick / 2 + 4;
  t.add(MAT.hardware, t.cylX(-pinX, pinX, st[0], st[1], bl.style.pin, 20));
  for (const s of [-1, 1]) t.add(MAT.rubber, t.cylX(s * pinX, s * (pinX + 16), st[0], st[1], bl.style.pin + 8, 20));
  // Seat ladder on the front leg, seat link and pin.
  const sl = b.seatLadder;
  ladderPlates(t, rails, g.seatA, g.seatB, g.seatStations, sl.style);
  const ss = g.seatStations[si], sb = g.seatBracket(seat);
  for (const s of [-1, 1]) t.add(MAT.frame, t.member(s * (sl.style.xs[1] + sl.style.thick / 2 + 5), sb, ss, 7, 44, 0));
  t.add(MAT.frame, pa.ts(t.span([-26, g.py - sl.bracket - 18, g.railBottom - sl.drop - 10], [26, g.py - sl.bracket + 18, g.railBottom])));
  const spX = sl.style.xs[1] + sl.style.thick / 2 + 4;
  t.add(MAT.hardware, t.cylX(-spX, spX, ss[0], ss[1], sl.style.pin, 20), t.cylX(-26, 26, sb[0], sb[1], 18, 16));
  for (const s of [-1, 1]) t.add(MAT.rubber, t.cylX(s * spX, s * (spX + 14), ss[0], ss[1], sl.style.pin + 8, 20));
  // Visible bolts on the ladder and leg plates.
  for (const f of [.1, .5, .9]) { const q = onLine(g.ladderA, g.ladderB, bl.from + (bl.to - bl.from) * f); t.boltX(bl.style.xs[1] + bl.style.thick / 2, q[0], q[1] - bl.style.below + 22, 1); t.boltX(-bl.style.xs[1] - bl.style.thick / 2, q[0], q[1] - bl.style.below + 22, -1); }
  return { g, pa };
}
export const buildLadderBench = (b: LadderBench) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const t = benchKit(api);
  return t.finish(b.label, () => { buildLadderBenchInto(t, b, p); });
};
const BLACK_CHROME: Material = ['Black chrome inner post', 'source', '#2a2c2f', .85, .25];
const closed = (xs: number[], below: number, above: number): LadderStyle => ({ xs, thick: 8, below, above, pin: 22, closed: true });
const open = (xs: number[], below: number, above: number): LadderStyle => ({ xs, thick: 8, below, above, pin: 22, closed: false });

// ── Product layouts (mm). Pads from REP's tables; frame stations estimated from photos and drawings. ────────
const pad = (H: number, T: number, pivotY: number, gap: number, back: [number, number, number?], seat: [number, number, number]): PadLayout =>
  ({ H, T, pivot: [pivotY, H - T - 15], gap, backLen: back[0], backW: back[1], backHeadW: back[2], seatLen: seat[0], seatW: seat[1], seatFrontW: seat[2] });
export const AB4100_BENCH: LadderBench = {
  label: 'AB-4100', L: AB4100.length, W: AB4100.width, back: AB4100.back, seat: AB4100.seat,
  pads: p => pad(AB4100.height, AB4100.padThick, -640 + AB4100.seatLength + AB4100.gap / 2, AB4100.gap, p.pad ? [AB4100.backLength, 355.6, 299.7] : [AB4100.backLength, AB4100.padWidths[0]], [AB4100.seatLength, 299.7, AB4100.seatFront]),
  frontFoot: [-585, 16], J: [-420, 282], frontStyle: 'crossbar', frontFootWidth: 290,
  handle: { y: -AB4100.length / 2 + 14, z: 22, length: 150, d: 28, mat: MAT.grip, mount: 'stem' },
  rearFoot: 520, footTop: 72, wheels: 'ends', rearPost: { y: 520 }, storage: { y: 600 },
  backLadder: { from: -140, to: 470, lift: 56, flatY: 400, bracket: 290, drop: 38, style: closed([-33, 33], 92, 60) },
  seatLadder: { offset: 53, from: .35, to: .85, flat: .6, bracket: 150, drop: 36, style: closed([-33, 33], 40, 40) },
};
export const AB5200_BENCH: LadderBench = {
  label: 'AB-5200', L: AB5200.length, W: AB5200.width, back: AB5200.back, seat: AB5200.seat,
  pads: p => pad(AB5200.height, AB5200.padThick, -686.5 + AB5200.seatLength + AB5200.gap / 2, AB5200.gap, [AB5200.backLength, AB5200.padWidths[p.pad ? 1 : 0]], [AB5200.seatLength, AB5200.padWidths[p.pad ? 1 : 0], AB5200.seatFronts[p.pad ? 1 : 0]]),
  frontFoot: [-640, 16], J: [-470, 300], frontStyle: 'tfoot', frontFootWidth: 190,
  handle: { y: -AB5200.length / 2 + 16.5, z: 44, length: 170, d: 25, mat: MAT.stainless, mount: 'cheeks' },
  rearFoot: 560, footTop: 72, wheels: 'ends', rearPost: { y: 560 }, storage: { y: 700 },
  backLadder: { from: -200, to: 500, lift: 56, flatY: 420, bracket: 320, drop: 38, style: closed([-33, 33], 92, 60), cage: true },
  seatLadder: { offset: 53, from: .35, to: .85, flat: .6, bracket: 120, drop: 36, style: closed([-33, 33], 40, 40) },
};
export const RAIL_COLORS = REP_AB_5200_2.params.find(q => q.key === 'rail')!;
export const AB5202_BENCH: LadderBench = {
  label: 'AB-5200 2.0', L: AB5202.length, W: AB5202.width, back: AB5202.back, seat: AB5202.seat, decline: AB5202.decline,
  pads: p => pad(AB5202.height, AB5202.padThick, -681.5 + AB5202.seatLength + AB5202.gap / 2, AB5202.gap, [AB5202.backLength, AB5202.padWidths[p.pad ? 1 : 0]], [AB5202.seatLength, AB5202.padWidths[p.pad ? 1 : 0], AB5202.seatFronts[p.pad ? 1 : 0]]),
  frontFoot: [-600, 16], J: [-600, 300], legTube: [76.2, 76.2], frontStyle: 'tfoot', frontFootWidth: AB5202.frontFoot,
  handle: { y: -AB5202.length / 2 + 16.5, z: 44, length: 170, d: 25, mat: MAT.knurl, mount: 'cheeks' },
  rearFoot: 580, footTop: 72, wheels: 'ends', rearPost: { y: 580, adjustable: true }, storage: { y: 700 },
  backLadder: { from: -330, to: 500, lift: 56, flatY: 420, bracket: 330, drop: 38, style: closed([-33, 33], 92, 60), cage: true },
  seatLadder: { offset: 60, from: .3, to: .92, flat: .6, bracket: 150, drop: 36, style: closed([-34, 34], 30, 60) },
  rails: p => {
    const [name, color] = REP_AB_5200_2_RAILS[p.rail] ?? REP_AB_5200_2_RAILS[0];
    return RAIL_MATS[name] ??= [`Ladder rails · ${name}`, 'source', color, name === 'Clear Coat' ? .6 : .05, name === 'Clear Coat' ? .35 : .5];
  },
};
const REP_AB_5200_2_RAILS = (REP_AB_5200_2.colors ?? []) as readonly (readonly [string, string])[];
const RAIL_MATS: Record<string, Material> = {};
export const AB3100_BENCH: LadderBench = {
  label: 'AB-3100', L: AB3100.length, W: AB3100.width, back: AB3100.back, seat: AB3100.seat,
  pads: () => pad(AB3100.height, AB3100.padThick, -626.4 + AB3100.seatLength + AB3100.gap / 2, AB3100.gap, [AB3100.backLength, AB3100.backWidth, AB3100.backHead], [AB3100.seatLength, AB3100.seatWidth, AB3100.seatFront]),
  frontFoot: [-580, 16], J: [-330, 290], frontStyle: 'plate', frontFootWidth: 130,
  handle: { y: -580 + 250 * 104 / 274, z: 120, length: 250, d: 30, mat: MAT.grip, mount: 'leg' },
  rearFoot: 545.35, footTop: 72, wheels: 'behind', rearPost: { y: 545.35 },
  backLadder: { from: -120, to: 440, lift: 50, flatY: 380, bracket: 280, drop: 36, style: open([-31, 31], 80, 40) },
  seatLadder: { offset: 44, from: .2, to: .75, flat: .45, bracket: 140, drop: 34, style: open([-30, 30], 28, 34) },
};
