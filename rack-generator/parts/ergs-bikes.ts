/** Air bikes (Rogue Echo Bike, AssaultBike Classic, Schwinn Airdynes, REP Strive, Bells of Steel Blitz) from one parametric fan-bike engine.
 * Build axes: X across (+X = rider's right), +Y toward the fan, Z up. Each spec places its extreme parts on the published envelope:
 * fan cage front at +L/2, rear foot or seat slider at −L/2, handle grip ends at ±W/2, top of the handles at H. */
import type { Manifold, ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
import { withKit, type Finish, type Kit } from './ergs-kit.ts';

export type Guard = 'wire' | 'perforated' | 'slotted';
export interface Tube { pts: Vec3[]; d?: number; rect?: [number, number]; mirror?: boolean; paint?: 'frame' | 'accent' | 'black' | 'silver' }
export interface Plate { a: Vec3; b: Vec3; h: number; color: string; mirror?: boolean; side?: Vec3; round?: boolean }
export interface AirBikeSpec {
  label: string; L: number; W: number; H: number;
  frame: string; accent: string; black?: string; roughness?: number;
  fan: { y: number; z: number; d: number; width: number; blades: number; bladeD: number; bladeW: number; guard: Guard; spokes: number; rings: number; bands: number; guardColor: string; bladeColor: string; rim?: string; hub?: string; windGuard?: boolean };
  feet: { front: { y: number; w: number; wheel: number; depth?: number; wheelY?: number }; rear: { y: number; w: number; depth?: number; u?: number } };
  tubes: Tube[];
  drive: { y: number; z: number; d: number; t: number; color: string; shroud?: [number, number][] };
  crank: number; crankAngle?: number;
  seat: { post: [Vec3, Vec3]; slider?: [number, number, number]; saddle: [number, number]; saddleColor: string; stitch?: string; postSize?: number };
  /** `path`: steel arm tube from its lower end up to the grip; `grip`: rubber section from the tube end to the grip tip. */
  arms: { path: Vec3[]; grip: Vec3[]; d: number; gripD: number; link?: [Vec3, Vec3] };
  console: { mast: Vec3[]; at: Vec3; size: [number, number, number]; tilt: number; screen: string };
  pegs?: { y: number; z: number; x0: number; x1: number };
  plates: Plate[];
}

const F = (color: string, roughness = .55, metalness = 0, role: Finish['role'] = 'source'): Finish => ({ role, color, roughness, metalness });
const mx = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];

function fan(K: Kit, s: AirBikeSpec) {
  const f = s.fan, c: Vec3 = [0, f.y, f.z], R = f.d / 2, w = f.width, guard = F(f.guardColor, .5, .35), blade = F(f.bladeColor, .5, .25);
  // Blades: pitched steel paddles on spokes from the hub.
  const blades: Manifold[] = [];
  for (let i = 0; i < f.blades; i++) {
    const a = 360 * i / f.blades, r0 = 70, r1 = f.bladeD / 2, len = r1 - r0;
    const paddle = K.hull([K.box([4, f.bladeW * .55, 4], [0, 0, r0 + 10]), K.box([4, f.bladeW, 4], [0, 0, r1 - 4])]);
    blades.push(K.move(K.rotate(K.rotate(paddle, [0, 0, 28]), [a, 0, 0]), c));
    blades.push(K.move(K.rotate(K.rod([0, 0, 20], [0, 0, r0 + len * .5], 10, 8), [a, 0, 0]), c));
  }
  K.add('Fan blades', blade, ...blades);
  K.add('Fan hub', F(f.hub ?? '#202124', .45, .4), K.disc(c, 'x', 150, 90, 32), K.disc(c, 'x', 60, w + 6, 24));
  const faces = [-w / 2, w / 2];
  if (f.guard === 'perforated') {
    // Solid side covers pierced with a hex pattern of vents (dark dots on the lighter plate), wire drum band.
    for (const x of faces) {
      K.add('Fan side covers', F(f.rim ?? '#3a3c3f', .6, .2), K.ring([x, f.y, f.z], 'x', 2 * R - 30, 160, 3, 72));
      const dots: Manifold[] = [];
      for (let r = 100; r < R - 30; r += 26) { const n = Math.floor(2 * Math.PI * r / 26); for (let j = 0; j < n; j++) { const t = 2 * Math.PI * (j + (r / 26) % 2 * .5) / n; dots.push(K.disc([x + Math.sign(x) * 1.6, f.y + r * Math.cos(t), f.z + r * Math.sin(t)], 'x', 13, 1.4, 6)); } }
      K.add('Fan cover vents', F('#0d0e0f', .8), ...dots);
    }
  } else {
    // Wire guards: concentric rings plus radial wires on both faces.
    const wires: Manifold[] = [];
    for (const x of faces) {
      for (let i = 1; i <= f.rings; i++) wires.push(K.hoop([x, f.y, f.z], 'x', 2 * R * i / (f.rings + .4), 4, 48, 6));
      for (let i = 0; i < f.spokes; i++) { const t = 2 * Math.PI * i / f.spokes; wires.push(K.rod([x, f.y + 55 * Math.cos(t), f.z + 55 * Math.sin(t)], [x, f.y + (R - 8) * Math.cos(t), f.z + (R - 8) * Math.sin(t)], 4, 5)); }
      if (f.guard === 'slotted') wires.push(K.ring([x, f.y, f.z], 'x', 2 * R, 2 * R - 90, 3, 64));
    }
    K.add('Fan guard wires', guard, ...wires);
  }
  // Drum band: wires across the cage width round the rim, and the rolled rims.
  const band: Manifold[] = [];
  for (let i = 0; i < f.bands; i++) band.push(K.hoop([-w / 2 + w * (i + .5) / f.bands, f.y, f.z], 'x', 2 * R - 6, 4, 64, 6));
  for (const x of faces) band.push(K.hoop([x, f.y, f.z], 'x', 2 * R - 6, 9, 72, 8));
  K.add('Fan guard rims', F(f.rim ?? f.guardColor, .45, .35), ...band);
  if (f.windGuard) K.add('Wind guard', F('#1a1b1d', .5, .1), K.cut(K.ring([0, f.y, f.z], 'x', 2 * R + 10, 2 * R - 4, w + 6, 72), [K.span([-w, f.y - R - 20, f.z - R - 20], [w, f.y + R + 20, f.z + R * .15])]));
}

function tubes(K: Kit, s: AirBikeSpec) {
  const paint = { frame: F(s.frame, s.roughness ?? .6, .15, 'source'), accent: F(s.accent, .5, .1), black: F(s.black ?? '#161718', .6), silver: F('#c3c7ca', .3, .85, 'rod') };
  for (const t of s.tubes) for (const pts of t.mirror ? [t.pts, t.pts.map(mx)] : [t.pts]) {
    const name = { frame: 'Frame', accent: 'Frame accents', black: 'Black frame parts', silver: 'Bright steel' }[t.paint ?? 'frame'];
    if (t.rect) for (let i = 0; i < pts.length - 1; i++) K.add(name, paint[t.paint ?? 'frame'], K.bar(pts[i], pts[i + 1], t.rect[0], t.rect[1], 4));
    else K.add(name, paint[t.paint ?? 'frame'], K.pipe(pts, t.d ?? 38, 18));
  }
  return paint;
}

export function buildAirBike(api: ManifoldAPI, s: AirBikeSpec): SolidPart[] {
  return withKit(api, s.label, K => {
    const paint = tubes(K, s), rubber = F('#151617', .9, 0, 'liner'), hw: Finish = { role: 'fastener', color: '#2d2f31', metalness: .8, roughness: .35, authored: true };
    fan(K, s);
    // Feet: front stabiliser with transport wheels at its front corners, rear stabiliser with levelling feet.
    const ff = s.feet.front, rf = s.feet.rear, fd = ff.depth ?? 70, rd = rf.depth ?? 70;
    K.add('Frame', paint.frame, K.bar([-ff.w / 2 + 30, ff.y, 32], [ff.w / 2 - 30, ff.y, 32], fd, 48, 4, [0, 1, 0]));
    for (const x of [-1, 1]) {
      K.add('Foot caps', rubber, K.bar([x * (ff.w / 2 - 32), ff.y, 32], [x * ff.w / 2, ff.y, 32], fd + 4, 52, 6, [0, 1, 0]), K.disc([x * (ff.w / 2 - 70), ff.y - 10, 6], 'z', 40, 12, 16));
      if (ff.wheel > 0) {
        const wy = ff.wheelY ?? ff.y + fd / 2 + ff.wheel / 2 - 12, wh = K.wheel([x * (ff.w / 2 - 34), wy, ff.wheel / 2 + 5], ff.wheel, 26, .45, 28);
        K.add('Transport wheels', rubber, wh.tyre); K.add('Wheel hubs', F('#8d9195', .4, .6), wh.hub);
        K.add('Frame', paint.frame, K.span([x * (ff.w / 2 - 34) - 20, ff.y, 20], [x * (ff.w / 2 - 34) + 20, wy, 48]));
      }
    }
    if (rf.u) K.add('Frame', paint.frame, K.pipe([[-rf.w / 2 + 21, rf.y + rf.u, 26], [-rf.w / 2 + 21, rf.y + 60, 26], [-rf.w / 2 + 81, rf.y, 26], [rf.w / 2 - 81, rf.y, 26], [rf.w / 2 - 21, rf.y + 60, 26], [rf.w / 2 - 21, rf.y + rf.u, 26]], 42, 18));
    else K.add('Frame', paint.frame, K.bar([-rf.w / 2 + 30, rf.y, 32], [rf.w / 2 - 30, rf.y, 32], rd, 48, 4, [0, 1, 0]));
    for (const x of [-1, 1]) {
      if (!rf.u) K.add('Foot caps', rubber, K.bar([x * (rf.w / 2 - 32), rf.y, 32], [x * rf.w / 2, rf.y, 32], rd, 52, 6, [0, 1, 0]));
      const ly = rf.u ? rf.y + 45 : rf.y;
      K.add('Levelling feet', rubber, K.disc([x * (rf.w / 2 - 45), ly, 5], 'z', 44, 10, 16));
      K.add('Levelling feet', hw, K.rod([x * (rf.w / 2 - 45), ly, 8], [x * (rf.w / 2 - 45), ly, 16], 14, 10));
    }
    // Drive: crank shroud disc on both sides of the bottom bracket, crank arms and platform pedals.
    const dr = s.drive;
    K.add('Drive shroud', F(dr.color, .6, .1), K.disc([0, dr.y, dr.z], 'x', dr.d, dr.t, 48));
    if (dr.shroud) K.add('Drive shroud', F(dr.color, .6, .1), K.plate(dr.shroud, -dr.t / 2 + 8, dr.t - 16, 55));
    const ca = (s.crankAngle ?? 20) * Math.PI / 180, cr = s.crank;
    for (const x of [-1, 1]) {
      const pin: Vec3 = [x * (dr.t / 2 + 22), dr.y + x * cr * Math.cos(ca), dr.z + x * cr * Math.sin(ca)];
      K.add('Crank arms', F('#1d1e20', .45, .5), K.bar([x * (dr.t / 2 + 14), dr.y, dr.z], [pin[0] - x * 8, pin[1], pin[2]], 16, 30, 6, [1, 0, 0]), K.disc([x * (dr.t / 2 + 10), dr.y, dr.z], 'x', 50, 16, 24));
      K.add('Pedals', F('#1a1b1c', .6, .3), K.span([pin[0] + x * 8, pin[1] - 50, pin[2] - 12], [pin[0] + x * 108, pin[1] + 50, pin[2] + 12]));
      K.add('Pedals', F('#1a1b1c', .6, .3), K.rod([pin[0] - x * 8, pin[1], pin[2]], [pin[0] + x * 12, pin[1], pin[2]], 18, 12));
    }
    // Seat post, fore-aft slider and saddle.
    const st = s.seat, ps = st.postSize ?? 50;
    K.add('Bright steel', paint.silver, K.bar(st.post[0], st.post[1], ps, ps, 3, [1, 0, 0]));
    if (st.slider) {
      K.add('Bright steel', paint.silver, K.span([-32, st.slider[0], st.slider[2] - 20], [32, st.slider[1], st.slider[2] + 20]));
      K.add('Adjust knobs', F('#151617', .7), K.disc([0, st.slider[0] + 60, st.slider[2] - 45], 'z', 36, 26, 16), K.rod([0, st.slider[0] + 60, st.slider[2] - 20], [0, st.slider[0] + 60, st.slider[2] - 35], 12, 10));
    }
    const [sy, sz] = st.saddle;
    const saddle = (k: number) => K.inter(K.union([K.hull([K.pad(270 * k, 150 * k, 40, 60 * k, [0, sy - 45, sz - 45]), K.pad(160 * k, 60 * k, 30, 26 * k, [0, sy + 95, sz - 35])]),
      K.hull([K.sphere([-65 * k, sy - 40, sz - 25], 110 * k, 18), K.sphere([65 * k, sy - 40, sz - 25], 110 * k, 18), K.sphere([0, sy + 100 * k, sz - 22], 70 * k, 16)])]), K.span([-200, sy - 200, sz - 60], [200, sy + 200, sz]));
    const pad = saddle(1);
    K.add('Saddle', F(st.saddleColor, .65), pad);
    if (st.stitch) {
      const c0 = K.move(pad, [0, -sy, 0]), shell = K.cut(K.scale(c0, [1.012, 1.01, 1]), [K.scale(c0, [.985, .99, 1])]);
      K.add('Saddle stitching', F(st.stitch, .6), K.move(K.inter(shell, K.span([-200, -200, sz - 24], [200, 200, sz - 20])), [0, sy, 0]));
    }
    K.add('Black frame parts', paint.black, K.span([-40, sy - 70, (st.slider?.[2] ?? st.post[1][2]) + 20], [40, sy + 40, sz - 45]));
    // Handle arms: mirrored tubes with rubber grips; link rods back to the cranks.
    const arm = s.arms;
    for (const x of [1, -1]) {
      const m = (p: Vec3): Vec3 => x > 0 ? p : mx(p);
      K.add('Handle arms', paint.frame, K.pipe(arm.path.map(m), arm.d, 18));
      // Rubber grip from the end of the tube; the rounded end cap sets the published width / height.
      const g = arm.grip.map(m);
      K.add('Handle grips', F('#141516', .85, 0, 'handle'), K.pipe(g, arm.gripD, 20), K.sphere(g[g.length - 1], arm.gripD, 20));
      if (arm.link) K.add('Link arms', F('#1d1e20', .5, .4), K.bar(m(arm.link[0]), m(arm.link[1]), 14, 30, 5));
      K.add('Fasteners', hw, K.disc(m(arm.path[1]), 'x', 36, arm.d + 26, 20));
    }
    // Console on its mast.
    const cn = s.console;
    K.add('Frame', paint.frame, K.pipe(cn.mast, 36, 16));
    const body = K.pad(cn.size[0], cn.size[2], cn.size[1], 16, [0, 0, -cn.size[1] / 2]), screen = K.box([cn.size[0] * .72, 4, cn.size[1] * .5], [0, -cn.size[2] / 2, cn.size[1] * .12]);
    const place = (m: Manifold) => K.move(K.rotate(m, [-cn.tilt, 0, 0]), cn.at);
    K.add('Console', F('#161718', .5, .1), place(body)); K.add('Console LCD', F(cn.screen, .3), place(screen));
    if (s.pegs) for (const x of [-1, 1]) K.add('Foot pegs', rubber, K.rod([x * s.pegs.x0, s.pegs.y, s.pegs.z], [x * s.pegs.x1, s.pegs.y, s.pegs.z], 34, 16));
    for (const p of s.plates) for (const pts of p.mirror ? [[p.a, p.b], [mx(p.a), mx(p.b)]] : [[p.a, p.b]]) K.add(`Badge · ${p.color}`, F(p.color, .45), p.round ? K.disc(pts[0], 'x', p.h, 1.2, 32) : K.bar(pts[0], pts[1], 1, p.h, 0, p.side ?? [1, 0, 0]));
  });
}
