/** REP FB-5000 flat bench and loose replacement pads. Axes: X across, +Y toward the rear (wheel) end, origin at the footprint centre. */
import type { ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { BENCH_PADS, FB5000, PAD_GAP, benchPadBox } from '../floor-parts/rep-benches.ts';
import { MAT, benchKit, inch, type BenchKit, type Pt } from './rep-benches-kit.ts';
/** FB-5000 layout shared with the tests (mm). */
export function fb5000Layout(p: NumericParams) {
  const L = FB5000.length, W = FB5000.width, H = FB5000.height, t = FB5000.tube, padW = FB5000.padWidths[p.pad ? 1 : 0];
  if (!padW) throw Error('Unsupported bench pad width.');
  const front = -L / 2, rear = L / 2, wheelD = 76, wheelY = rear - wheelD / 2, rearPost = rear - 170, loopR = 95, loopZ = 172;
  const frontPost = front + loopR + 16 + t / 2 + 7, padFront = front + 36, padRear = padFront + FB5000.padLength;
  const padBottom = H - FB5000.padThick, beamTop = padBottom - 6, beamBottom = beamTop - t;
  return { L, W, H, t, padW, front, rear, wheelD, wheelY, rearPost, frontPost, loopR, loopZ, padFront, padRear, padBottom, beamTop, beamBottom };
}
/** Rounded pad plan: rectangle, or a taper from `w0` at y0 to `w1` at y1. */
export const taperedOutline = (t: BenchKit, y0: number, y1: number, w0: number, w1: number, r: number) =>
  t.outline([[-w0 / 2, y0], [w0 / 2, y0], [w1 / 2, y1], [-w1 / 2, y1]] as Pt[], r);
export function buildFB5000(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = benchKit(api), g = fb5000Layout(p), { W, H, rearPost, frontPost } = g, tube = g.t;
  return t.finish('FB-5000', () => {
    // 3×3″ main beam under the pad, plus two cross mounting plates for the four pad bolts.
    t.add(MAT.frame, t.member(0, [g.padFront + 40, g.beamBottom + tube / 2], [g.padRear - 40, g.beamBottom + tube / 2], tube, tube));
    for (const y of [g.padFront + 40, g.padRear - 40]) t.add(MAT.rubber, t.span([-tube / 2 + 3, y - 4, g.beamBottom + 3], [tube / 2 - 3, y + 4, g.beamTop - 3]));
    for (const y of [-330, 330]) t.add(MAT.frame, t.span([-100, y - 30, g.beamTop], [100, y + 30, g.padBottom]));
    // Posts with bolted flange plates at the beam.
    const flange = (y: number) => {
      t.add(MAT.frame, t.span([-63, y - 63, g.beamBottom - 16], [63, y + 63, g.beamBottom]));
      for (const [dx, dy] of [[-48, -48], [48, -48], [-48, 48], [48, 48]]) t.add(MAT.hardware, t.cyl([dx, y + dy, g.beamBottom - 26], [dx, y + dy, g.beamBottom - 16], 19, 6));
    };
    flange(frontPost); flange(rearPost);
    // Front leg: single post on a square rubber-padded foot plate, D loop handle, stainless badge.
    t.add(MAT.frame, t.member(0, [frontPost, 18], [frontPost, g.beamBottom - 16], tube, tube), t.span([-65, frontPost - 65, 8], [65, frontPost + 65, 18]));
    t.add(MAT.rubber, t.slab(140, 140, 8, 6, [0, frontPost, 0]));
    const loop = t.move(t.rot(t.rot(t.arc(g.loopR, 32, 180), [0, -90, 0]), [0, 0, 180]), [0, frontPost - tube / 2 - 7, g.loopZ]);
    t.add(MAT.frame, loop, ...[-1, 1].map(s => t.cyl([0, frontPost - tube / 2 - 8, g.loopZ + s * g.loopR], [0, frontPost - tube / 2 + 2, g.loopZ + s * g.loopR], 32, 20)));
    for (const s of [-1, 1]) {
      t.add(MAT.stainless, t.slab(2, 36, 150, 1, [s * (tube / 2 + 1), frontPost, 80]));
      t.add(MAT.hardware, t.cyl([s * (tube / 2 + 2), frontPost, 88], [s * (tube / 2 + 4), frontPost, 88], 5, 8), t.cyl([s * (tube / 2 + 2), frontPost, 222], [s * (tube / 2 + 4), frontPost, 222], 5, 8));
    }
    // Rear leg: post on a 2×3″ cross-foot with grooved rubber end caps and wheels behind it.
    const footZ = [12, 63] as const;
    t.add(MAT.frame, t.member(0, [rearPost, footZ[1]], [rearPost, g.beamBottom - 16], tube, tube), t.span([-63, rearPost - 63, footZ[1]], [63, rearPost + 63, footZ[1] + 8]));
    t.add(MAT.frame, t.crossTube(-W / 2 + 60, W / 2 - 60, rearPost, (footZ[0] + footZ[1]) / 2, tube, footZ[1] - footZ[0]));
    for (const s of [-1, 1]) t.endCap(s * (W / 2 - 64), s * W / 2, rearPost, 0, 90, 82);
    t.add(MAT.hardware, t.cyl([0, rearPost - 48, footZ[1] + 8], [0, rearPost - 48, footZ[1] + 18], 20, 6), t.cyl([0, rearPost + 48, footZ[1] + 8], [0, rearPost + 48, footZ[1] + 18], 20, 6));
    for (const s of [-1, 1]) {
      const x = s * 166;
      for (const side of [-1, 1]) t.add(MAT.frame, t.hull([t.span([x + side * 17 - 2.5, rearPost + tube / 2, 22], [x + side * 17 + 2.5, rearPost + tube / 2 + 10, 60]), t.cylX(x + side * 17 - 2.5, x + side * 17 + 2.5, g.wheelY, 50, 34, 20)]));
      t.wheel(x, g.wheelY, 50, g.wheelD, 26);
    }
    // 4″ CleanGrip pad with piping seam, plywood board and REP logo plates on both sides.
    const pad = t.pad(t.roundRect(g.padW, FB5000.padLength, 22), g.padBottom, FB5000.padThick, 20, 12);
    const at = (s: typeof pad.vinyl) => t.move(s, [0, (g.padFront + g.padRear) / 2, 0]);
    t.add(MAT.vinyl, at(pad.vinyl)); t.add(MAT.piping, at(pad.piping)); t.add(MAT.board, at(pad.backing));
    // Three white letter blocks stand in for the printed REP wordmark on each pad side (no logo artwork).
    for (const s of [-1, 1]) for (const [i, w] of [42, 40, 40].entries()) {
      const y0 = -425 + i * 52;
      t.add(MAT.logo, t.span([s > 0 ? g.padW / 2 - .5 : -g.padW / 2 - 1, y0, g.padBottom + 40], [s > 0 ? g.padW / 2 + 1 : -g.padW / 2 + .5, y0 + w, g.padBottom + 72]));
    }
  });
}
/** Loose replacement pads laid on the floor: back pad toward −Y, seat toward +Y. */
export function buildBenchPad(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const spec = BENCH_PADS[p.fit];
  if (!spec) throw Error('Unsupported bench pad.');
  const t = benchKit(api), { depth } = benchPadBox(p);
  return t.finish('bench pad', () => {
    const place = (dims: readonly number[], y0: number, headFirst: boolean) => {
      const [len, w0, w1, h] = dims.map(inch), y1 = y0 + len, cs = headFirst ? taperedOutline(t, y0, y1, w1, w0, 20) : taperedOutline(t, y0, y1, w0, w1, 20);
      const pad = t.pad(cs, 0, h, Math.min(18, h / 3), 12);
      t.add(MAT.vinyl, pad.vinyl); t.add(MAT.piping, pad.piping); t.add(MAT.board, pad.backing);
    };
    place(spec.back, -depth / 2, true);
    if ('seat' in spec) place(spec.seat, -depth / 2 + inch(spec.back[0]) + PAD_GAP, false);
  });
}
