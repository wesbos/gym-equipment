/** REP bench attachments: Adjustable Bench Leg Roller 1.0 / 2.0 and the Leg Extension & Leg Curl attachment (BA-5010).
 * Each is authored in a local frame and placed either standalone on the floor or mounted on a bench. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { LEG_ROLLER, LELC } from '../floor-parts/rep-benches.ts';
import { MAT, benchKit, type BenchKit, type Material, type Pt } from './rep-benches-kit.ts';
type Place = (s: Manifold) => Manifold;
const ATTACH_STEEL: Material = ['Metallic black powder-coated attachment steel', 'source', '#2e3033', .35, .5];
const NICKEL: Material = ['Black nickel handle', 'handle', '#3a3c3f', .85, .3];
const MOLDED: Material = ['Molded polyurethane roller pads', 'liner', '#1a1b1d', 0, .8];
/** Leg roller in the receiver frame: origin on the bench back-rail axis at its head-end opening, +Y out of the rail,
 * +Z toward the pad top. Returns the two roller-axle points (Y/Z) for placement. */
export function legRollerGeometry(t: BenchKit, version: number, spacing: number, place: Place): Pt[] {
  const add = (m: Material, ...s: Manifold[]) => t.add(m, ...s.map(place));
  if (!version) {
    const v = LEG_ROLLER.v1, bend: Pt = [25, 0], dir: Pt = [Math.cos(35 * Math.PI / 180), Math.sin(35 * Math.PI / 180)];
    const lower: Pt = [bend[0] + 70 * dir[0], bend[1] + 70 * dir[1]], upper: Pt = [bend[0] + 330 * dir[0], bend[1] + 330 * dir[1]];
    add(ATTACH_STEEL, t.member(0, [-250, 0], [bend[0] + 19, 0], v.insert, v.insert), t.member(0, bend, [upper[0] + 18 * dir[0], upper[1] + 18 * dir[1]], v.insert, v.insert));
    for (const a of [lower, upper]) {
      add(MAT.hardware, t.cylX(-v.rollerLength - 34, v.rollerLength + 34, a[0], a[1], 16, 12));
      for (const x of [-1, 1]) {
        add(MAT.foam, t.cylX(x * 24, x * (24 + v.rollerLength), a[0], a[1], v.roller, 32));
        add(MAT.stainless, t.cylX(x * (24 + v.rollerLength), x * (28 + v.rollerLength), a[0], a[1], 34, 16));
      }
    }
    return [lower, upper];
  }
  const v = LEG_ROLLER.v2, fixed: Pt = [100, 95], a = -48 * Math.PI / 180, dir: Pt = [Math.cos(a), Math.sin(a)];
  const moving: Pt = [fixed[0] + spacing * dir[0], fixed[1] + spacing * dir[1]], end: Pt = [fixed[0] + (v.spacing[4] + 40) * dir[0], fixed[1] + (v.spacing[4] + 40) * dir[1]];
  // Slotted insert, hub, fixed-roller yoke, sliding arm and trolley.
  add(ATTACH_STEEL, t.cut(t.member(0, [-250, 0], [40, 0], v.insert - 12, v.insert - 12), [-200, -140, -80].map(y => t.span([-40, y - 18, -4], [40, y + 18, 4]))));
  add(ATTACH_STEEL, t.hull([t.span([-30, 20, -22], [30, 80, 22]), t.cylX(-30, 30, fixed[0], fixed[1], 60, 24)]), t.member(0, fixed, end, 50.8, 50.8));
  add(MAT.stainless, t.member(0, [moving[0] - 45 * dir[0], moving[1] - 45 * dir[1]], [moving[0] + 45 * dir[0], moving[1] + 45 * dir[1]], 60, 60, 4));
  add(MAT.grip, t.cylX(30, 44, 55, 30, 42, 24));
  add(MAT.logo, t.cylX(44, 45.5, 55, 30, 34, 24));
  // Knurled grab handle rising from the hub.
  const hs = [t.cyl([0, 60, 20], [0, 60, 20 + v.handle], 32, 24)];
  for (let z = 70; z < v.handle; z += 7) hs.push(t.cyl([0, 60, 20 + z], [0, 60, 21.2 + z], 33.4, 24));
  add(NICKEL, t.union(hs));
  const inner = v.width / 2 - v.rollerLength;
  for (const p of [fixed, moving]) {
    add(MAT.hardware, t.cylX(-v.width / 2 + 6, v.width / 2 - 6, p[0], p[1], 18, 12));
    for (const x of [-1, 1]) {
      add(MOLDED, t.cylX(x * inner, x * (v.width / 2 - 4), p[0], p[1], v.roller, 36));
      add(MAT.board, t.cylX(x * (v.width / 2 - 4), x * v.width / 2, p[0], p[1], v.roller - 22, 32));
    }
  }
  return [fixed, moving];
}
/** Standalone leg roller resting on its four rollers, centred on its footprint. */
export function buildLegRoller(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const version = p.version ? 1 : 0, spacing = version ? p.spacing : 0;
  if (version && !(LEG_ROLLER.v2.spacing as readonly number[]).includes(spacing)) throw Error('Unsupported leg roller spacing.');
  const t = benchKit(api), r = version ? LEG_ROLLER.v2.roller / 2 : LEG_ROLLER.v1.roller / 2;
  return t.finish('leg roller', () => {
    const [a, b] = legRollerGeometry(t, version, spacing, s => s);
    // 1.0: tilt so both roller axles sit level on the floor. 2.0: rest on the sliding rollers and the insert tip with
    // the grab handle up, as in REP's product shot. Then centre the envelope (pinned by the family test).
    const zAt = (q: Pt, deg: number) => q[0] * Math.sin(deg * Math.PI / 180) + q[1] * Math.cos(deg * Math.PI / 180);
    let tilt = -Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    if (version) {
      let best = Infinity;
      for (let d = -90; d <= 90; d += .05) {
        const end = LEG_ROLLER.v2.spacing[4] + 40, tip: Pt = [100 + end * Math.cos(-48 * Math.PI / 180), 95 + end * Math.sin(-48 * Math.PI / 180)];
        const rollers = Math.min(zAt(a, d) - r, zAt(b, d) - r, zAt(tip, d) - 36), insert = Math.min(zAt([-250, -19], d), zAt([-250, 19], d));
        if (zAt([60, 20 + LEG_ROLLER.v2.handle], d) > zAt([60, 20], d) && Math.abs(rollers - insert) < best && zAt(a, d) - r >= rollers - 1e-9) { best = Math.abs(rollers - insert); tilt = d; }
      }
    }
    t.transformAll(s => t.rot(s, [tilt, 0, 0]));
    const box = t.bounds();
    t.transformAll(s => t.move(s, [-(box.min[0] + box.max[0]) / 2, -(box.min[1] + box.max[1]) / 2, -box.min[2]]));
  });
}

// ── Leg Extension & Leg Curl attachment (BA-5010) ──────────────────────────────────────────────────────
/** Local frame: origin on the floor at the base centre, +Y toward the bench (leg receiver end), wheels at −Y. */
export function lelcLayout(p: NumericParams, receiverTop = 300) {
  if (!(LELC.extension as readonly number[]).includes(p.extension) || !(LELC.curl as readonly number[]).includes(p.curl)) throw Error('Unsupported roller height.');
  // Column beside the leg receiver so the thigh pad continues the bench seat; rollers and horns face the wheel end.
  const half = LELC.length / 2, column = 40, pivot: Pt = [column, 620];
  return { half, column, pivot, receiver: [half - 170, half] as Pt, receiverTop, extension: [column - 200, p.extension] as Pt, curl: [column - 170, p.curl] as Pt, horn: [column - 260, 250] as Pt };
}
export function lelcGeometry(t: BenchKit, p: NumericParams, place: Place, receiverTop = 300) {
  const g = lelcLayout(p, receiverTop), add = (m: Material, ...s: Manifold[]) => t.add(m, ...s.map(place)), W = LELC.width;
  // Base plate with REP cut-out, band pegs, wheel brackets and the raised leg receiver with two lock pins.
  const plate: Pt[] = [[-150, -g.half + 40], [150, -g.half + 40], [230, -120], [230, g.half - 190], [160, g.half], [-160, g.half], [-230, g.half - 190], [-230, -120]];
  add(ATTACH_STEEL, t.cut(t.move(t.k(t.outline(plate, 12).extrude(8)), [0, 0, 4]), [t.span([-70, -260, 2], [70, -225, 14])]));
  add(MAT.rubber, t.k(t.k(t.outline(plate, 12).offset(-4, 'Round', 2, 16)).extrude(4)));
  for (const x of [-1, 1]) {
    for (const side of [-1, 1]) add(ATTACH_STEEL, t.span([x * 150 + side * 18 - 3, -g.half + 20, 10], [x * 150 + side * 18 + 3, -g.half + 90, 60]));
    t.add(MAT.wheels, place(t.cylX(x * 150 - 13, x * 150 + 13, -g.half + 35, 35, 70, 28)));
    add(MAT.hardware, t.cylX(x * 150 - 24, x * 150 + 24, -g.half + 35, 35, 14, 12));
    add(ATTACH_STEEL, t.span([x * 120 - 6, -320, 12], [x * 120 + 6, -290, 60]), t.cylX(x * 120, x * 185, -305, 50, 28, 16), t.cylX(x * 185, x * 192, -305, 50, 40, 16));
  }
  const [r0, r1] = g.receiver, rt = g.receiverTop;
  add(ATTACH_STEEL, t.cut(t.hull([t.span([-150, r0, 12], [150, r1, 30]), t.span([-150, r0 + 40, rt - 20], [150, r1 - 10, rt])]), [t.span([-110, r0 + 60, rt - 60], [110, r1 + 1, rt + 1])]));
  for (const x of [-1, 1]) { add(MAT.hardware, t.cylX(x * 150, x * 176, (r0 + r1) / 2 + 20, rt - 40, 16, 16)); add(MAT.grip, t.cylX(x * 176, x * 196, (r0 + r1) / 2 + 20, rt - 40, 34, 20)); }
  // Column, top bracket with the flat thigh pad and side handles.
  add(ATTACH_STEEL, t.member(0, [g.column, 12], [g.column, 760], 76.2, 76.2), t.hull([t.span([-45, g.column - 60, 12], [45, g.column + 60, 22]), t.span([-40, g.column - 40, 60], [40, g.column + 40, 70])]));
  const pad = t.pad(t.roundRect(260, 300, 30), 0, 70, 16, 10);
  const at = (s: Manifold) => t.move(s, [0, g.column + 20, 760]);
  t.add(MAT.vinyl, place(at(pad.vinyl))); t.add(MAT.piping, place(at(pad.piping))); t.add(MAT.board, place(at(pad.backing)));
  const hx = W / 2;
  for (const x of [-1, 1]) {
    add(ATTACH_STEEL, t.cyl([x * 40, g.column + 60, 740], [x * (hx - LELC.handle), g.column + 90, 760], 30, 20));
    add(MAT.grip, t.cylX(x * (hx - LELC.handle), x * hx, g.column + 90, 760, 34, 24));
  }
  // Cam pivot arm: curl rollers up front, extension rollers below, weight horns behind; REP cut-out plates.
  for (const x of [-1, 1]) {
    add(ATTACH_STEEL, t.hull([t.cylX(x * 44 - 5, x * 44 + 5, g.pivot[0], g.pivot[1], 90, 28), t.cylX(x * 44 - 5, x * 44 + 5, g.curl[0], g.curl[1], 60, 24)]));
    add(ATTACH_STEEL, t.hull([t.cylX(x * 44 - 5, x * 44 + 5, g.pivot[0], g.pivot[1], 80, 28), t.cylX(x * 44 - 5, x * 44 + 5, g.extension[0], g.extension[1], 60, 24)]));
    add(ATTACH_STEEL, t.hull([t.cylX(x * 44 - 5, x * 44 + 5, g.pivot[0], g.pivot[1], 80, 28), t.cylX(x * 44 - 5, x * 44 + 5, g.horn[0], g.horn[1], 70, 24)]));
  }
  add(MAT.logo, t.span([49, g.pivot[0] - 40, g.pivot[1] - 130], [50.5, g.pivot[0] + 10, g.pivot[1] - 60]));
  add(MAT.hardware, t.cylX(-60, 60, g.pivot[0], g.pivot[1], 30, 20));
  for (const c of [g.curl, g.extension]) {
    add(MAT.hardware, t.cylX(-(LELC.rollerLength + 50), LELC.rollerLength + 50, c[0], c[1], 22, 16));
    for (const x of [-1, 1]) { add(MOLDED, t.cylX(x * 50, x * (50 + LELC.rollerLength), c[0], c[1], LELC.roller, 36)); add(MAT.board, t.cylX(x * (50 + LELC.rollerLength), x * (54 + LELC.rollerLength), c[0], c[1], LELC.roller - 24, 32)); }
  }
  add(MAT.stainless, t.cylX(-50 - LELC.horn, 50 + LELC.horn, g.horn[0], g.horn[1], LELC.hornDiameter, 28));
  for (const x of [-1, 1]) add(ATTACH_STEEL, t.cylX(x * 49, x * 62, g.horn[0], g.horn[1], 90, 28));
  return g;
}
export function buildLegExtensionCurl(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = benchKit(api);
  return t.finish('leg extension & curl', () => { lelcGeometry(t, p, s => s); });
}

// ── Mounting on a bench (BlackWing, AB-5000) ───────────────────────────────────────────────────────────
export interface BenchMount {
  /** Back-rail transform (pad articulation) and the rail's head-end opening. */ tb: Place; railEnd: number; railZ: number;
  /** Rear-foot floor contact the bench tips about, and the front-foot underside that drops into the leg receiver. */ rearContact: number; frontFoot: number;
}
/** Settings used when an attachment is shown mounted on a bench. */
export const MOUNTED = { spacing: LEG_ROLLER.v2.spacing[0], extension: LELC.extension[2], curl: LELC.curl[1] } as const;
/** Adds the selected attachment (0 none, 1 leg roller 1.0, 2 leg roller 2.0, 3 leg extension & leg curl). */
export function mountAttachment(t: BenchKit, attachment: number, m: BenchMount) {
  if (![0, 1, 2, 3].includes(attachment)) throw Error('Unsupported bench attachment.');
  if (attachment === 1 || attachment === 2) legRollerGeometry(t, attachment - 1, MOUNTED.spacing, s => m.tb(t.move(s, [0, m.railEnd, m.railZ])));
  if (attachment !== 3) return;
  // The bench tips 15° about its rear foot so the front foot sits in the receiver (REP: 15° bench decline).
  const a = -LELC.decline, rad = a * Math.PI / 180;
  t.transformAll(s => t.move(t.rot(t.move(s, [0, -m.rearContact, 0]), [a, 0, 0]), [0, m.rearContact, 0]));
  const drop = t.bounds().min[2];
  t.transformAll(s => t.move(s, [0, 0, -drop]));
  const dy = m.frontFoot - m.rearContact, footY = m.rearContact + dy * Math.cos(rad), footZ = dy * Math.sin(rad) - drop;
  const g = lelcLayout(MOUNTED), shift = footY - (g.receiver[0] + g.receiver[1]) / 2;
  lelcGeometry(t, MOUNTED, s => t.move(s, [0, shift, 0]), footZ + 40);
}
