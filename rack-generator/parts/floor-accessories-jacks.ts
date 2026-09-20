/** Deadlift jacks, Bench Blokz, squat wedges and the Calf Curve. Metadata and published sizes: ../floor-parts/floor-accessories.ts. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { BENCH_BLOKZ, BENCH_BLOKZ_MODELS, CALF_CURVE, GENESIS_COLORS, GENESIS_JACK, REP_WEDGE, RITFIT_JACK, TITAN_WEDGE, inch, repWedgePeak, titanWedgeLayout } from '../floor-parts/floor-accessories.ts';
import { accessoryKit, type AccessoryKit, type Pt } from './floor-accessories-kit.ts';

const ZINC = '#b9bcbf';
const inPts = (pts: Pt[]): Pt[] => pts.map(([x, z]) => [inch(x), inch(z)]);
const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n = 12): Pt[] => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });
/** Section (x, z) → solid of thickness t centred on y = yc. */
const plateOf = (K: AccessoryKit, cs: CrossSection, t: number, yc = 0) => K.sideProfile(cs, yc - t / 2, yc + t / 2);
/** Button-head bolt heads on both faces of a plate stack at (x, z) (inches), faces at ±y. */
const buttonHeads = (K: AccessoryKit, at: Pt[], y: number, d = inch(.34), h = 2.2) => K.union(at.flatMap(([x, z]) => [-1, 1].map(s =>
  K.meet(K.sphere([inch(x), s * (y - d * .35), inch(z)], d * .62, 16), s > 0 ? K.box([inch(x) - d, y, inch(z) - d], [inch(x) + d, y + h, inch(z) + d]) : K.box([inch(x) - d, -y - h, inch(z) - d], [inch(x) + d, -y, inch(z) + d])))));

// ── REP x Kleva Built Genesis Jack 2.0 ──────────────────────────────────────────────────────────
/** Profile (inches, x along the foot, toe/rocker at +x, foot centred) traced from the Snow studio photo (~78.6 px/in at the
 * published 18.25"): a J-hook curling round the bar from the left with the plate's lip on the right, mouth open up-right. */
export const GENESIS_PROFILE = {
  hook: { cx: -.7, cz: 10.05, rIn: .72, rLiner: .6, rOut: 1.15 },
  handle: { x0: -1.45, x1: .08, z0: 14.3, z1: 18.25, scallops: [15.2, 16.1, 17.0, 17.85] },
  spine: { x0: -1.0, x1: .4, z1: 9.6 }, lip: { x0: -.15, x1: .15, z1: 10.7 },
} as const;
export function buildGenesisJack(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), G = GENESIS_JACK, P = GENESIS_PROFILE, color = GENESIS_COLORS[p.color];
  if (!color) throw Error('Unsupported jack color.');
  const t = G.plate, footY = G.footWidth / 2, hk = P.hook, hd = P.handle, sp = P.spine, lp = P.lip;
  return K.run('Genesis Jack', () => {
    const C = K.C, sec = (pts: Pt[]) => K.poly(inPts(pts)), X = hk.cx;
    const disc = (cx: number, cz: number, r: number) => K.k(K.k(C.circle(inch(r), 48)).translate([inch(cx), inch(cz)]));
    // J-hook: the curl (left and bottom of the bar), a stem rising up-right to the handle, the mouth open up-right above the lip.
    const mouth = sec([[X, hk.cz], ...arc(X, hk.cz, hk.rOut + .8, -8, 84, 8)]);
    const curl = (rIn: number) => K.k(C.difference([disc(X, hk.cz, hk.rOut), disc(X, hk.cz, rIn), mouth]));
    const stem = sec([[X - hk.rOut, hk.cz], [X - .15, hk.cz + .55], [X + .55, 13.0], [X + .75, 14.45], [X - .75, 14.45], [X - .75, 13.0], [X - hk.rOut + .05, 11.2]]);
    const hookShape = K.k(C.difference([K.k(C.intersection([K.k(C.union([curl(hk.rLiner), stem])), sec([[-4, 0], [4, 0], [4, 13.1], [-4, 13.1]])])), disc(X, hk.cz, hk.rLiner)]));
    const scallops = hd.scallops.map(z => disc(hd.x1 + .06, z, .26));
    const handle = K.k(C.difference([K.k(C.union([sec([[hd.x0, hd.z0], [hd.x1, hd.z0], [hd.x1, hd.z1 - .12], [hd.x1 - .22, hd.z1], [hd.x0 + .3, hd.z1], [hd.x0, hd.z1 - .3]]), K.k(K.k(C.circle(inch(.3), 24)).translate([inch(hd.x0 + .3), inch(hd.z1 - .3)]))])), ...scallops]));
    const plate = K.k(C.difference([K.k(C.union([
      // Foot web, the heel-side flare, the leaning spine and the lip that closes the J.
      sec([[-3.2, .15], [3.0, .15], [3.0, 1.2], [sp.x1 + .9, 1.2], [sp.x1 + .25, 1.5], [sp.x1 + .05, 2.1], [sp.x1, 3.0], [sp.x1, sp.z1], [sp.x0, sp.z1], [sp.x0, 3.2], [sp.x0 - .15, 2.3], [sp.x0 - .6, 1.6], [-2.6, 1.2], [-3.2, 1.2]]),
      sec([[lp.x0 - .2, sp.z1 - .4], [lp.x1, sp.z1 - .4], [lp.x1, lp.z1 - .15], [lp.x1 - .1, lp.z1], [lp.x0, lp.z1], [lp.x0, sp.z1]]),
      curl(hk.rIn), stem, sec([[X - .75, 14.3], [X + .75, 14.3], [hd.x1, hd.z0 + .3], [hd.x0, hd.z0 + .3]]), handle,
    ])), disc(X, hk.cz, hk.rIn)]));
    K.add('Laser-cut aluminium frame', plateOf(K, plate, t), 'source', color.hex, .35, .5);
    // Black liners: the J-hook cheeks (they line the bore down to the bar radius) and the handle scales; ridged foot blocks.
    const liner = '#161618', cheekT = inch(.16), gripT = inch(.2), cheeks: Manifold[] = [];
    for (const s of [-1, 1]) cheeks.push(plateOf(K, hookShape, cheekT, s * (t / 2 + cheekT / 2)), plateOf(K, handle, gripT, s * (t / 2 + gripT / 2)));
    K.add('Acetal hook liners and handle scales', K.union([...cheeks, plateOf(K, K.k(C.difference([disc(X, hk.cz, hk.rIn), disc(X, hk.cz, hk.rLiner), mouth])), t)]), 'liner', liner, 0, .55);
    const foot = sec([[-3.3, 0], [2.95, 0], ...arc(3.13, .62, .62, -90, 0, 6), [3.45, 1.2], [-3.2, 1.2], [-3.75, .5]]);
    const ridges = [-70, -50, -30, -10].map(a => { const r = a * Math.PI / 180; return K.cyl('y', -footY - 1, footY + 1, inch(.06), inch(3.13 + .62 * Math.cos(r)), inch(.62 + .62 * Math.sin(r)), 10); });
    const feet = [-1, 1].map(s => plateOf(K, foot, footY - t / 2, s * (t / 2 + (footY - t / 2) / 2)));
    K.add('ABS foot blocks', K.cut(K.union(feet), ridges), 'liner', liner, 0, .6);
    K.add('Button-head bolts', K.union([
      buttonHeads(K, [[hd.x0 + .45, 15.1], [hd.x0 + .45, 17.4]], t / 2 + gripT), buttonHeads(K, [[X - .05, 12.55], [X - .8, 11.0], [X + .55, 9.25]], t / 2 + cheekT),
      // Foot-block bolts sit in counterbores, heads flush with the block faces.
      K.union([-2.4, 0, 2.4].flatMap(x => [-1, 1].map(s => K.cyl('y', s > 0 ? footY - 2 : -footY, s > 0 ? footY : -footY + 2, inch(.17), inch(x), inch(.6), 16)))),
    ]), 'fastener', ZINC, .85, .3);
    // REP black carries the [REP x KB] print up the spine; Kleva colourways the engraved KB monogram at the neck (plain plates).
    const ink = color.hex === '#e9e9e6' ? '#8a8b8d' : '#d8d8d6', mid = (sp.x0 + sp.x1) / 2;
    K.add(p.color ? 'KB monogram' : 'REP x KB print', p.color ? K.box([inch(mid - .38), -t / 2 - .25, inch(2.2)], [inch(mid + .38), -t / 2 + .01, inch(3.2)])
      : K.box([inch(mid - .2), -t / 2 - .25, inch(4.0)], [inch(mid + .2), -t / 2 + .01, inch(7.6)]), 'source', ink, 0, .6);
  });
}

// ── RitFit Deadlift Jack ────────────────────────────────────────────────────────────────────────
export const RITFIT_PROFILE = { spine: { x0: -1.75, x1: .67, z0: .3, z1: 7.4 }, hook: { cx: -.1, cz: 9.0, r: .59, mouth: [.95, 10.0] as const }, handle: { x0: -.95, x1: .62, z0: 12.23 } } as const;
export function buildRitfitJack(api: ManifoldAPI): SolidPart[] {
  const K = accessoryKit(api), J = RITFIT_JACK, P = RITFIT_PROFILE, t = 5, H = J.height / 25.4, bw = J.baseWidth;
  return K.run('RitFit jack', () => {
    const C = K.C, sec = (pts: Pt[]) => K.poly(inPts(pts)), hk = P.hook, hd = P.handle;
    const disc = (cx: number, cz: number, r: number) => K.k(K.k(C.circle(inch(r), 40)).translate([inch(cx), inch(cz)]));
    const slot = K.k(C.hull([disc(hk.cx, hk.cz, hk.r), disc(hk.mouth[0], hk.mouth[1], hk.r)]));
    // Cranked steel plate: hook head (bulging back), S-neck and handle tang, all one piece with the lower spine.
    const head = sec([[-1.9, 7.4], [.8, 7.4], [.8, 9.3], [.55, 10.35], [.66, hd.z0], [.64, H - .25], [.45, H], [-.75, H], [-.95, H - .2], [-.95, hd.z0], [-1.15, 11.1], [-1.8, 10.2], [-1.98, 9.2]]);
    const plate = K.k(C.difference([K.k(C.union([head, sec([[P.spine.x0, P.spine.z0], [P.spine.x1, P.spine.z0], [P.spine.x1, 7.6], [P.spine.x0, 7.6]])])), slot]));
    K.add('Black steel plate', plateOf(K, plate, t), 'source', '#18191a', .35, .5);
    // Diamond-textured hook guards (both faces) with the V notch at their lower edge, and the moulded handle scales.
    const guard = K.k(C.difference([K.k(C.intersection([head, sec([[-2.1, 7.4], [1, 7.4], [1, 11.9], [-2.1, 11.9]])])), slot, sec([[-.75, 7.35], [-.35, 7.6], [.05, 7.35]])]));
    const grip = K.k(C.intersection([head, sec([[-1.1, hd.z0], [1, hd.z0], [1, H + .1], [-1.1, H + .1]])]));
    const gT = 1.6, sT = 4.5, parts: Manifold[] = [], scales: Manifold[] = [];
    for (const s of [-1, 1]) { parts.push(plateOf(K, guard, gT, s * (t / 2 + gT / 2))); scales.push(plateOf(K, grip, sT, s * (t / 2 + sT / 2))); }
    K.add('Diamond-textured hook guards', K.union(parts), 'source', '#202123', .3, .78);
    K.add('Non-slip handle scales', K.union(scales), 'handle', '#141516', 0, .85);
    K.add('Guard and handle screws', K.union([buttonHeads(K, [[-1.35, 8.1], [.35, 8.1], [-.35, 8.55], [-1.4, 9.6], [-.9, 10.9], [.4, 8.9]], t / 2 + gT, inch(.2), 1.2), buttonHeads(K, [[-.2, 12.5], [-.2, 16.4]], t / 2 + sT, inch(.2), 1)]), 'fastener', ZINC, .85, .3);
    // PVC tray base: flat pan with a raised rim, toe sweeping up to 1.8" for rocking; the spine stands in its centre slot.
    // Toe arc: tangent to the floor at x = 1.2" and reaching the base end at 1.8" (R ≈ 2.98"); 0.35" thick.
    const hb = J.base / 50.8, Rt = ((hb - 1.2) ** 2 + 1.8 ** 2) / 3.6, end = Math.atan2(1.8 - Rt, hb - 1.2) * 180 / Math.PI;
    const baseSide = sec([[-hb, 0], ...arc(1.2, Rt, Rt, -90, end, 12), ...arc(1.2, Rt, Rt - .35, end, -90, 12), [-hb, .35]]);
    const plan = K.slab(J.base, bw, inch(.55), -1, inch(2));
    const pan = K.slab(J.base - inch(.5), bw - inch(.5), inch(.35), inch(.3), inch(1), -inch(.7));
    const base = K.cut(K.meet(plateOf(K, baseSide, bw + 2), plan), [K.meet(pan, K.box([-J.base / 2, -bw, inch(.3)], [inch(1.1), bw, inch(1)]))]);
    K.add('PVC non-slip base', base, 'liner', '#1b1c1d', 0, .8);
    K.add('RITFIT print', K.box([inch(-1.15), -t / 2 - .25, inch(1.6)], [inch(.05), -t / 2 + .01, inch(6.4)]), 'source', '#3a3a3c', 0, .7);
  });
}

// ── Bench Blokz Big Blok ────────────────────────────────────────────────────────────────────────
export function buildBenchBlokz(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), B = BENCH_BLOKZ, m = BENCH_BLOKZ_MODELS[p.model];
  if (!m) throw Error('Unsupported bench blok model.');
  const W = B.width, H = B.height, c = B.chamfer, s = m.slot / 2;
  return K.run('Bench Blokz', () => {
    const C = K.C;
    // Face outline in XY (lying flat): chamfered corners, U slots in the top (deep) and bottom (shallow) ends and the left side.
    const outline = K.poly([[-W / 2 + c, -H / 2], [W / 2 - c, -H / 2], [W / 2, -H / 2 + c], [W / 2, H / 2 - c], [W / 2 - c, H / 2], [-W / 2 + c, H / 2], [-W / 2, H / 2 - c], [-W / 2, -H / 2 + c]]);
    const u = (x0: number, y0: number, x1: number, y1: number) => K.k(C.hull([K.k(K.k(C.circle(s, 32)).translate([x0, y0])), K.k(K.k(C.circle(s, 32)).translate([x1, y1]))]));
    const slots = [u(0, H / 2 - B.topSlot + s, 0, H / 2 + s * 2), u(0, -H / 2 + B.bottomSlot - s, 0, -H / 2 - s * 2), u(-W / 2 + B.sideSlot - s, H / 2 - H * .666, -W / 2 - s * 2, H / 2 - H * .666)];
    const face = K.k(C.difference([outline, ...slots]));
    const body = K.k(face.extrude(B.thick));
    // Cross channel on the top face for the 2-board (3") position: a chamfered trough across X.
    const cy = H / 2 - B.channelY, cw = s * 2 + 3;
    const channel = K.endProfile(K.poly([[cy - cw / 2 - 3, B.thick + .01], [cy - cw / 2, B.thick - B.channel], [cy + cw / 2, B.thick - B.channel], [cy + cw / 2 + 3, B.thick + .01]]), -W, W);
    const stencil = K.move(K.turn(K.box([-56, -6.5, 0], [56, 6.5, .4]), [0, 0, 32]), [W * .06, -H * .22, B.thick]);
    K.add('Closed-cell foam block', K.cut(body, [channel]), 'liner', '#1c1c1e', 0, .9);
    K.add('BENCHBLOKZ.COM stencil', K.meet(K.cut(stencil, [channel]), K.move(K.k(face.extrude(1)), [0, 0, B.thick - .5])), 'source', '#bfc0c0', 0, .7);
  });
}

// ── REP Cork Squat Wedge ────────────────────────────────────────────────────────────────────────
export function buildRepWedge(api: ManifoldAPI): SolidPart[] {
  const K = accessoryKit(api), R = REP_WEDGE, L = R.length / 2, W = R.width / 2, pk = repWedgePeak(), py = L - pk.x, ch = 2.5;
  return K.run('REP wedge', () => {
    // Side profile (y, z): low 25° heel ramp toward -Y, steep 45° back face at +Y, short end lips, small chamfers.
    const prof: Pt[] = [[-L + ch, 0], [L - ch, 0], [L, ch], [L, R.lip], [py + 1.2, pk.z - 1.2], [py - 1.6, pk.z - .7], [-L, R.lip], [-L, ch]];
    const cork = K.endProfile(K.poly(prof), -W, W);
    // Grip tape on both slopes, inset 0.25" from every edge, 0.8 mm proud.
    const tape = (a: Pt, b: Pt) => { const [dy, dz] = [b[0] - a[0], b[1] - a[1]], len = Math.hypot(dy, dz), ny = -dz / len, nz = dy / len, e = inch(.25), ux = dy / len, uz = dz / len;
      const a2: Pt = [a[0] + ux * e, a[1] + uz * e], b2: Pt = [b[0] - ux * e, b[1] - uz * e];
      return K.endProfile(K.poly([a2, b2, [b2[0] + ny * .8, b2[1] + nz * .8], [a2[0] + ny * .8, a2[1] + nz * .8]]), -W + inch(.25), W - inch(.25)); };
    K.add('Black grip tape', K.union([tape([-L, R.lip], [py - 1.6, pk.z - .7]), tape([py + 1.2, pk.z - 1.2], [L, R.lip])]), 'liner', '#161617', 0, .98);
    // Printed logos, one per side face: the mountain mark on +X, the wordmark on -X (plain inlaid plates).
    const logoL = K.box([W - .3, -34, 14], [W + .01, 12, 38]), logoR = K.box([-W - .01, -44, 16], [-W + .3, 20, 34]);
    K.add('Solid cork block', K.cut(cork, [logoL, logoR]), 'source', '#c8955f', 0, .9);
    K.add('REP logo prints', K.union([logoL, logoR]), 'source', '#1b1b1b', 0, .7);
  });
}

// ── Titan Fitness Squat Wedge ───────────────────────────────────────────────────────────────────
export function buildTitanWedge(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), L = titanWedgeLayout(p), T = TITAN_WEDGE, W = L.width / 2, t = T.sheet;
  return K.run('Titan wedge', () => {
    const C = K.C, circ = (c: Pt, r: number) => K.k(K.k(C.circle(r, 24)).translate(c));
    // Folded sheet in the (y, z) plane: toe hem, ramp plate, rounded top bend, slanted back leg and forward foot flange.
    const sheet = K.k(C.union([circ(L.hem, T.hem / 2), K.poly(L.ramp), K.poly(L.leg), K.poly(L.foot), circ(L.bend, t / 2 + .01)]));
    const steel = K.endProfile(sheet, -W, W);
    // Handle slot through the leg near the top, and the TITAN plate on the leg's rear face (both tilted into the leg plane).
    const tilt = (m: Manifold, at: Pt) => K.move(K.turn(m, [L.legTilt, 0, 0]), [0, at[0], at[1]]);
    const slot = tilt(K.sideProfile(K.k(K.roundRect(Math.min(90, W * 1.1), 22, 10)), -10, 10), L.slotAt);
    K.add('Powder-coated steel', K.cut(steel, [slot]), 'source', '#1f1f20', .3, .7);
    K.add('TITAN logo plate', tilt(K.sideProfile(K.k(K.roundRect(Math.min(70, W * .9), 14, 1)), 0, .4), L.logoAt), 'source', '#121213', 0, .5);
    // Grip tape on the ramp, inset from every edge, with the angle window near the high end showing the marked steel.
    const e = 8, [a, b] = L.rampTop, len = Math.hypot(b[0] - a[0], b[1] - a[1]), u: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], n: Pt = [-u[1], u[0]];
    const at = (s: number, h: number): Pt => [a[0] + u[0] * s + n[0] * h, a[1] + u[1] * s + n[1] * h];
    const tapeSec = K.poly([at(e, 0), at(len - e, 0), at(len - e, .8), at(e, .8)]);
    const tape = K.endProfile(tapeSec, -W + e, W - e);
    // The window: a rounded slot in the tape, ~40 × 16 mm, centred across the ramp 45 mm below the top edge.
    const wc = at(len - 45, 0), ang = Math.atan2(u[1], u[0]) * 180 / Math.PI;
    const windowCut = K.move(K.turn(K.move(K.k(K.roundRect(40, 16, 7).extrude(4)), [0, 0, -2]), [ang, 0, 0]), [0, wc[0], wc[1]]);
    K.add('Black grip tape', K.cut(tape, [windowCut]), 'liner', '#141414', 0, .98);
    const label = K.move(K.turn(K.move(K.k(K.text(`${p.angle}°`, 9, 1.4).extrude(.3)), [0, 0, 0]), [ang, 0, 0]), [0, wc[0], wc[1]]);
    K.add('Angle marking', label, 'source', '#0d0d0e', 0, .6);
  });
}

// ── U4C Fitness The Calf Curve ──────────────────────────────────────────────────────────────────
export function buildCalfCurve(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), F = CALF_CURVE, L = F.length / 2, Ro = F.curve / 2, t = F.sheet, zc = F.height - Ro, fw = F.width / 2, lift = p.pads ? F.pad : 0;
  return K.run('Calf Curve', () => {
    const C = K.C;
    // Omega section (y, z): half-round top, straight walls, outward foot flanges.
    const top = K.k(C.intersection([K.k(C.difference([K.k(K.k(C.circle(Ro, 64)).translate([0, zc])), K.k(K.k(C.circle(Ro - t, 64)).translate([0, zc]))])), K.poly([[-Ro - 1, zc], [Ro + 1, zc], [Ro + 1, zc + Ro + 1], [-Ro - 1, zc + Ro + 1]])]));
    const walls = [-1, 1].map(s => K.poly(s > 0 ? [[Ro - t, 0], [Ro, 0], [Ro, zc + .01], [Ro - t, zc + .01]] : [[-Ro, 0], [-Ro + t, 0], [-Ro + t, zc + .01], [-Ro, zc + .01]]));
    const flanges = [-1, 1].map(s => K.poly(s > 0 ? [[Ro - .01, 0], [fw, 0], [fw, t], [Ro - .01, t]] : [[-fw, 0], [-Ro + .01, 0], [-Ro + .01, t], [-fw, t]]));
    const section = K.k(C.union([top, ...walls, ...flanges]));
    const body = K.endProfile(section, -L, L);
    // Two handle cut-outs per side (through walls and flanges), rounded top corners; leaves 2 end legs and a centre leg.
    const [e1, c1] = F.legs, cuts: Manifold[] = [];
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? L - e1 - c1 : -L + e1, x = x0 + c1 / 2;
      cuts.push(K.sideProfile(K.k(K.roundRect(c1, 2 * F.cutH, 12).translate([x, 0])), -fw - 1, fw + 1));
    }
    const steel = K.cut(body, cuts);
    K.add('Powder-coated 3/16" steel', lift ? K.move(steel, [0, 0, lift]) : steel, 'source', '#1e1e1f', .3, .65);
    // Grip tape over the curve, full length less 0.1" at each end.
    const tapeSec = K.k(C.intersection([K.k(C.difference([K.k(K.k(C.circle(Ro + .8, 64)).translate([0, zc])), K.k(K.k(C.circle(Ro - .01, 64)).translate([0, zc]))])), K.poly([[-Ro - 2, zc - 4], [Ro + 2, zc - 4], [Ro + 2, zc + Ro + 2], [-Ro - 2, zc + Ro + 2]])]));
    const tape = K.endProfile(tapeSec, -L + 2.5, L - 2.5);
    K.add('Grip tape', lift ? K.move(tape, [0, 0, lift]) : tape, 'liner', '#39393b', 0, .98);
    if (lift) {
      const pads: Manifold[] = [], spans: [number, number][] = [[-L, -L + e1], [-F.legs[2] / 2, F.legs[2] / 2], [L - e1, L]];
      for (const [x0, x1] of spans) for (const s of [-1, 1]) pads.push(K.box([x0 + 2, s > 0 ? Ro - t + 1 : -fw + 2, 0], [x1 - 2, s > 0 ? fw - 2 : -Ro + t - 1, lift]));
      K.add('Rubber foot pads', K.union(pads), 'liner', '#101011', 0, .9);
    }
  });
}
