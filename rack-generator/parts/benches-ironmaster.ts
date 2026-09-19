/** Ironmaster Super Bench PRO V2 and original Super Bench: seesaw pad that pivots on a single post, numbered locking ring
 * with a foot/hand lever, side-plug incline seat, and the head-end receiver attachments (Crunch Situp, Leg Attachment PRO,
 * Preacher Curl Pad, Bar Dip Handle, Seated Press Pad). Geometry data lives in ../floor-parts/benches-specs.ts. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import {
  IRONMASTER_ANGLES, IRONMASTER_PRO, IRONMASTER_SB, ironmasterAttachment, ironmasterLayout, ironmasterSeat, rotYZ, type IronmasterSpec, type Pt,
} from '../floor-parts/benches-specs.ts';
import { buildBench, CHROME, geomSolids, RUBBER, STAINLESS, STEEL, VINYL, ZINC } from './benches-kit.ts';
export const IRONMASTER_FINISHES = [{ name: 'Textured Black', hex: '#1b1c1e' }, { name: 'Hammertone Gray', hex: '#5e6164' }] as const;
export function buildIronmaster(api: ManifoldAPI, s: IronmasterSpec, p: NumericParams): SolidPart[] {
  if (!(IRONMASTER_ANGLES as readonly number[]).includes(p.backrestAngle)) throw Error('Unsupported bench angle.');
  const pro = s === IRONMASTER_PRO, l = ironmasterLayout(s), P = s.pivot, a = p.backrestAngle;
  const frameColor = pro ? IRONMASTER_FINISHES[0] : IRONMASTER_FINISHES[p.color ?? 0] ?? IRONMASTER_FINISHES[0];
  return buildBench(api, kit => {
    const { tube, tubeYZ, cyl, box, span, add, hinge, pad, taperPts, plateYZ, wheel, boltX, cut } = kit;
    const frame = STEEL(frameColor.hex, .62, .25), F: Manifold[] = [], U: Manifold[] = [], rub: Manifold[] = [], hw: Manifold[] = [];
    const up = (m: Manifold) => hinge(m, P, a);
    // ── Lower frame: two feet with ribbed rubber end caps, spine, post ─────────────────────────────
    const foot = 76, cap = 52, spineZ = 60, spineH = 64, spineW = 51;
    // Feet: 76 mm tube with 82 mm rubber caps, so the caps set the frame's end faces.
    const feet: [number, number][] = pro ? [[s.frame[0] + 41, s.seatFootW], [s.L - 25 - 25 - 38, s.headFootW]] : [[s.frame[0] + 41, s.seatFootW], [s.frame[1] - 41, s.headFootW]];
    for (const [y, w] of feet) {
      F.push(tube([-(w / 2 - cap), y, foot / 2], [w / 2 - cap, y, foot / 2], foot, foot));
      for (const x of [-1, 1]) {
        const c = box([cap, foot + 6, foot + 4], [x * (w / 2 - cap / 2), y, (foot + 4) / 2]);
        const grooves = [-2, -1, 0, 1, 2].map(i => box([6, 4, foot - 16], [x * (w / 2 - 2), y + i * 12, foot / 2 + 2]));
        rub.push(cut(c, grooves));
      }
      for (const x of [-1, 1]) hw.push(boltX(x * (spineW / 2 + 18), y + (y < s.L / 2 ? 1 : -1) * 0, spineZ, x as 1 | -1, 19, 8));
      const inward = y < s.L / 2 ? 1 : -1;
      for (const x of [-1, 1]) F.push(span([x * (spineW / 2 + 1), y - inward * foot / 2, spineZ - 30], [x * (spineW / 2 + 7), y + inward * (foot / 2 + 60), spineZ + 30]));
    }
    F.push(tubeYZ(0, [feet[0][0], spineZ], [feet[1][0], spineZ], spineH, spineW));
    F.push(tube([0, s.post, spineZ + spineH / 2 - 4], [0, s.post, P[1] - 22], spineW, 76));
    if (pro) {
      // Wheels on the head foot's outer face, lift handle on the seat foot.
      for (const x of [-1, 1]) {
        const wx = x * (s.headFootW / 2 - 70); wheel(wx, s.L - 25, 27, 50, 20, rub, hw);
        for (const side of [-1, 1]) F.push(span([wx + side * 13 - 2.5, feet[1][0] + foot / 2, 12], [wx + side * 13 + 2.5, s.L - 25, 42]));
      }
      F.push(kit.capsules([[-58, 44, foot], [-58, 22, foot + 46], [58, 22, foot + 46], [58, 44, foot]], 16));
    }
    add('Ironmaster emblem', STEEL('#d9dbde', .35, .8), box([2, 170, 22], [-spineW / 2 - 1, s.post + 330, spineZ]));
    // ── Upper frame and pad (rotate together about the post-top pivot) ───────────────────────────
    const zc = l.zc;
    U.push(tubeYZ(0, [l.seatEnd + 30, zc], [l.E - 6, zc], l.frameH, 51));
    for (const x of [-1, 1]) U.push(plateYZ(x * 31, [[P[0] - 50, zc + 10], [P[0] + 70, zc + 10], [P[0] + 45, P[1] - 46], [P[0] - 30, P[1] - 46]], 7));
    hw.push(cyl([-44, P[0], P[1]], [44, P[0], P[1]], 20, 16), boltX(44, P[0], P[1], 1, 30, 10), boltX(-44, P[0], P[1], -1, 30, 10));
    for (const yr of l.receivers) U.push(tube([-62, yr, zc - l.frameH], [62, yr, zc - l.frameH], l.frameH, l.frameH));
    const padParts: Manifold[] = [];
    if (s.narrowLen) {
      const n0 = l.seatEnd + s.narrowLen, n1 = n0 + s.taperLen;
      padParts.push(pad(taperPts(l.seatEnd, n0 + 45, s.padNarrowW, s.padNarrowW), s.padT, 34, 14, l.padB));
      padParts.push(pad([[-s.padNarrowW / 2, n0], [s.padNarrowW / 2, n0], [s.padW / 2, n1], [s.padW / 2, l.E], [-s.padW / 2, l.E], [-s.padW / 2, n1]], s.padT, 34, 14, l.padB));
    } else padParts.push(pad(taperPts(l.seatEnd, l.E, s.padW, s.padW), s.padT, 30, 14, l.padB));
    add('Bench pad · vinyl', VINYL('#141517'), ...padParts.map(up));
    // Head-end receiver: pull pin on +X, threaded knob on −X.
    U.push(tube([-30, l.E - 40, zc], [30, l.E - 40, zc], 44, 30));
    hw.push(up(cyl([30, l.E - 40, zc], [70, l.E - 40, zc], 16, 12)));
    add('Receiver knobs', { color: '#18191b', role: 'handle', metalness: 0, roughness: .7 }, up(cyl([72, l.E - 40, zc], [82, l.E - 40, zc], 36, 16)), up(cyl([-78, l.E - 40, zc], [-30, l.E - 40, zc], 16, 12)), up(cyl([-100, l.E - 40, zc], [-78, l.E - 40, zc], 44, 8)));
    // ── Locking ring (stainless, numbered notches) and diagonal brace, lever on the post ─────────
    const [ri, ro] = s.ringR, rx = -(spineW / 2 + 12), ring: Pt[] = [];
    const at = (deg: number, r: number) => rotYZ([P[0] + r, P[1]], deg, P);
    const lo = pro ? 190 : 176, hi = pro ? 292 : 356, lever = pro ? 285 : 262;
    for (let i = 0; i <= 40; i++) ring.push(at(lo + (hi - lo) * i / 40, ro));
    const notches = IRONMASTER_ANGLES.map(n => lever - n).sort((q, r) => r - q);
    for (let i = 40; i >= 0; i--) {
      const deg = lo + (hi - lo) * i / 40; ring.push(at(deg, ri));
    }
    const ringSolid = plateYZ(rx, ring, 5, []);
    const cuts = notches.map(n => { const c = at(n, ri + 6); return box([12, 13, 13], [rx, c[0], c[1]]); });
    const ringParts = [cut(ringSolid, cuts)];
    // Tick marks: short etched bars beside each notch.
    const ticks = notches.map(n => { const c = at(n, (ri + ro) / 2 + 8); return box([1, 3, 14], [rx - 3, c[0], c[1]]); });
    if (pro) ringParts.push(plateYZ(rx, [at(hi - 4, ro - 6), at(hi + 2, ri + 10), [P[0] + 300, zc - l.frameH / 2 + 2], [P[0] + 330, zc - l.frameH / 2 + 2]], 5));
    else ringParts.push(plateYZ(rx, [at(hi - 3, ri), at(hi, ro), [at(hi, ro)[0] + 20, zc - 20], [at(hi, ri)[0] - 30, zc - 20]], 5), plateYZ(rx, [at(lo + 3, ri), at(lo, ro), [at(lo, ro)[0] - 20, zc - 20], [at(lo, ri)[0] + 30, zc - 20]], 5));
    add('Locking ring', pro ? STAINLESS : STEEL('#bfc2c5', .4, .8), ...ringParts.map(up));
    add('Ring numbers', STEEL('#3a3c3f', .6, .2), ...ticks.map(up));
    const lp = at(lever, ri - 4);
    F.push(plateYZ(rx + 6, [[s.post - 38, lp[1] - 60], [s.post + 38, lp[1] - 60], [lp[0] + 16, lp[1] + 6], [lp[0] - 10, lp[1] + 6]], 6));
    add('Locking lever pedal', { color: '#18191b', role: 'handle', metalness: 0, roughness: .8 }, cyl([rx + 2, s.post - 38, lp[1] - 55], [rx - 34, s.post - 120, lp[1] - 80], 20, 12));
    hw.push(cyl([rx + 6, s.post + 20, lp[1] - 30], [rx + 6, s.post + 20, lp[1] - 5], 9, 10));
    add('Upper frame', frame, ...U.map(up));
    // ── Incline seat and attachments ─────────────────────────────────────────────────────────────
    for (const g of [p.inclineSeat ? ironmasterSeat(s, p.inclineSeat) : undefined, p.attachment ? ironmasterAttachment(s, p.attachment) : undefined]) {
      if (!g) continue;
      const out = geomSolids(kit, g);
      add('Upper frame', frame, ...out.frame.map(up));
      add('Attachment chrome', CHROME, ...out.chrome.map(up));
      add('Attachment grips', { color: '#151618', role: 'handle', metalness: 0, roughness: .75 }, ...out.grip.map(up));
      add('Roller pads · vinyl', VINYL('#141517'), ...out.rollers.map(up));
      add('Hardware', ZINC, ...out.shafts.map(up));
      add('Bench pad · vinyl', VINYL('#141517'), ...out.pads.map(up));
    }
    add(`Frame · ${frameColor.name}`, frame, ...F);
    add('Rubber feet and wheels', RUBBER, ...rub);
    add('Hardware', ZINC, ...hw);
    return kit.collect([0, -s.L / 2, 0]);
  });
}
export const buildIronmasterPro = (api: ManifoldAPI, p: NumericParams) => buildIronmaster(api, IRONMASTER_PRO, p);
export const buildIronmasterSB = (api: ManifoldAPI, p: NumericParams) => buildIronmaster(api, IRONMASTER_SB, p);
