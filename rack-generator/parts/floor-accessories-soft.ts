/** AbMat pads, barbell pillows, medicine and slam balls, and foam rollers. Metadata and published sizes: ../floor-parts/floor-accessories.ts. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import {
  AMAZON_ROLLER, AMAZON_ROLLER_COLORS, DYNAMAX, DYNAMAX_COLORS, ECHO_SLAM, GRID, GRID_COLORS, HIP_THRUST_PAD, PILLOW, ROGUE_MED_BALL, abmatModel, echoSlamDiameter, inch, pillowGrid,
} from '../floor-parts/floor-accessories.ts';
import { accessoryKit, rng, shade, type AccessoryKit, type Pt } from './floor-accessories-kit.ts';

// ── AbMat ───────────────────────────────────────────────────────────────────────────────────────
/** Arch height along the pad (t = 0 at the thin tailbone lip, 1 at the back): a quarter-sine rise to the peak, then a
 * rounded roll-off to the back end. */
export function abmatHeight(m: ReturnType<typeof abmatModel>, t: number) {
  if (t <= m.peak) return m.lip + (m.height - m.lip) * Math.sin(Math.PI / 2 * t / m.peak);
  const u = (t - m.peak) / (1 - m.peak); return m.height - (m.height - m.back) * u * u;
}
export function buildAbmat(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), m = abmatModel(p), L = m.length, W = m.width;
  return K.run('AbMat', () => {
    // Side profile (y, z) with the lip at -Y; the back end rolls into a 10 mm radius at the floor edge.
    const n = 40, top: Pt[] = Array.from({ length: n + 1 }, (_, i) => [-L / 2 + L * i / n * (1 - 10 / L), abmatHeight(m, i / n * (1 - 10 / L))]);
    const zb = top[n][1], back: Pt[] = Array.from({ length: 7 }, (_, i) => { const a = Math.PI / 2 * (i + 1) / 7; return [L / 2 - 10 + 10 * Math.sin(a), zb - 10 + 10 * Math.cos(a)]; });
    const prof = (lift = 0): Pt[] => [[-L / 2, 0], [L / 2, 0], ...[...back].reverse().map(([y, z]) => [y, z + lift] as Pt), ...[...top].reverse().map(([y, z]) => [y, z + lift] as Pt)];
    const plan = K.slab(W, L, 28, -1, m.height + 5);
    const bodyOf = (lift: number) => K.meet(K.endProfile(K.poly(prof(lift)), -W / 2, W / 2), plan);
    const body = bodyOf(0);
    const region = (y0: number, y1: number, w: number) => K.box([-w / 2, -L / 2 + L * y0, 1], [w / 2, -L / 2 + L * y1, m.height + 5]);
    const skin = K.cut(bodyOf(.5), [body]);
    const color = m.vinyl ? '#141516' : '#1d1e20';
    K.add(m.vinyl ? 'Black vinyl cover' : 'Molded closed-cell foam', body, 'liner', color, 0, m.vinyl ? .42 : .72);
    // Printed wordmark across the arch and the debossed ABMAT / MADE IN USA mark near the lip (plain plates).
    K.add('White wordmark print', K.meet(skin, m.vinyl ? region(.22, .36, W * .62) : region(.5, .62, W * .62)), 'source', '#eeeeea', 0, .6);
    if (!m.vinyl) K.add('Debossed maker mark', K.meet(skin, region(.1, .2, W * .4)), 'liner', shade(color, .7), 0, .5);
  });
}

// ── AbMat Hip Thrust Pad ────────────────────────────────────────────────────────────────────────
export function buildHipThrustPad(api: ManifoldAPI): SolidPart[] {
  const K = accessoryKit(api), P = HIP_THRUST_PAD, L = P.length, W = P.width, T = P.thick, e = P.edge;
  return K.run('Hip Thrust Pad', () => {
    // Cordura pillow: piped seam at mid-edge, soft sides, the firm top layer domed to the published 1.75".
    const seam = e * .45, body = K.hull([K.slab(L - 14, W - 14, 22, 0, 1), K.slab(L - 3, W - 3, 18, seam - .5, seam + .5), K.slab(L - 12, W - 12, 22, T - 7, T - 6), K.slab(L - 30, W - 30, 26, T - 1, T)]);
    K.add('Black Cordura pad', body, 'liner', '#1b1b1c', 0, .92);
    const piping = K.cut(K.slab(L, W, 19.5, seam - 2, seam + 2), [K.slab(L - 4, W - 4, 17, seam - 3, seam + 3)]);
    K.add('Piped seam', piping, 'liner', '#151516', 0, .8);
    // HTP print across one end of the top, woven HIP THRUST PAD tag at a corner (plain plates).
    K.add('HTP print', K.move(K.turn(K.k(K.k(K.text('HTP', 46, 10)).extrude(.6)), [0, 0, 90]), [-L / 2 + 62, 0, T - .3]), 'source', '#eeeeea', 0, .6);
    K.add('Woven tag', K.box([L / 2 - 64, W / 2 - 50, T - .2], [L / 2 - 34, W / 2 - 30, T + .5]), 'source', '#2a2a2b', 0, .7);
  });
}

// ── AbMat Barbell Pillows ───────────────────────────────────────────────────────────────────────
export function buildBarbellPillows(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), [c, r] = pillowGrid(p.pack), d = PILLOW.diameter, g = PILLOW.gap;
  if (c * r !== p.pack) throw Error('Unsupported pillow pack.');
  return K.run('barbell pillows', () => {
    const R = d / 2, one = K.hull([K.cyl('z', 0, PILLOW.thick - 2.5, R, 0, 0, 32), K.cyl('z', 0, PILLOW.thick, R - 2.5, 0, 0, 32)]), discs: Manifold[] = [];
    for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) discs.push(K.move(one, [(i - (c - 1) / 2) * (d + g), (j - (r - 1) / 2) * (d + g), 0]));
    K.add('Closed-skin foam pillows', K.k(K.M.compose(discs)), 'liner', '#18191a', 0, .95);
  });
}

// ── Balls ───────────────────────────────────────────────────────────────────────────────────────
/** A resting soft ball: sphere of radius R cut flat by `flat` mm at the floor (its contact patch). */
const ballBody = (K: AccessoryKit, R: number, flat: number, seg = 72) => { const c: Vec3 = [0, 0, R - flat]; return { c, body: K.meet(K.sphere(c, R, seg), K.box([-R - 1, -R - 1, 0], [R + 1, R + 1, 2 * R])) }; };
/** Latitude band (degrees) of a sphere shell, depth `d` into the surface and `w` mm tall — for grooves and seams. */
const latBand = (K: AccessoryKit, c: Vec3, R: number, lat: number, w: number, d: number, seg = 72) => {
  const z = c[2] + R * Math.sin(lat * Math.PI / 180);
  return K.meet(K.cut(K.sphere(c, R + 1, seg), [K.sphere(c, R - d, seg)]), K.box([-R - 2, -R - 2, z - w / 2], [R + 2, R + 2, z + w / 2]));
};
/** Laced closing seam along latitude `lat` across the front (-Y), ±`span`° of longitude: a raised flap with cross stitches. */
function lacing(K: AccessoryKit, c: Vec3, R: number, lat: number, span: number, stitches: number) {
  const z = c[2] + R * Math.sin(lat * Math.PI / 180), rr = R * Math.cos(lat * Math.PI / 180), flapW = 17;
  const wedge = K.k(K.M.extrude(K.poly([[0, 0], ...Array.from({ length: 9 }, (_, i) => { const a = (-90 - span + 2 * span * i / 8) * Math.PI / 180; return [Math.cos(a) * R * 1.5, Math.sin(a) * R * 1.5] as Pt; })]), 4 * R));
  const flap = K.meet(K.meet(K.cut(K.sphere(c, R + 3.2, 72), [K.sphere(c, R - 1, 72)]), K.box([-R - 5, -R - 5, z - flapW / 2], [R + 5, R + 5, z + flapW / 2])), K.move(wedge, [0, 0, -R]));
  const loops: Manifold[] = [];
  for (let i = 0; i < stitches; i++) {
    const a = (-90 - span * .92 + 2 * span * .92 * i / (stitches - 1)) * Math.PI / 180, x = Math.cos(a) * (rr + 3.6), y = Math.sin(a) * (rr + 3.6), tx = -Math.sin(a) * 3, ty = Math.cos(a) * 3;
    loops.push(K.hull([K.sphere([x - tx, y - ty, z - flapW * .72], 2.1, 8), K.sphere([x + tx, y + ty, z + flapW * .72], 2.1, 8)]));
  }
  return { flap, loops: K.union(loops) };
}
/** Meridian seam grooves every `step`° below latitude `upTo`. */
const gores = (K: AccessoryKit, c: Vec3, R: number, step: number, upTo: number) => {
  const zTop = c[2] + R * Math.sin(upTo * Math.PI / 180), out: Manifold[] = [];
  for (let a = 0; a < 180; a += step) out.push(K.turn(K.box([-R - 2, -.9, -R], [R + 2, .9, 0]), [0, 0, a + step / 2]));
  const shell = K.cut(K.sphere(c, R + 1, 72), [K.sphere(c, R - 1.6, 72)]);
  return K.meet(K.meet(shell, K.union(out.map(o => K.move(o, [c[0], c[1], zTop])))), K.box([-R - 2, -R - 2, 0], [R + 2, R + 2, zTop]));
};

export function buildRogueMedBall(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), R = ROGUE_MED_BALL.diameter / 2;
  if (!(ROGUE_MED_BALL.weights as readonly number[]).includes(p.weight)) throw Error('Unsupported medicine ball weight.');
  return K.run('Rogue medicine ball', () => {
    const { c, body } = ballBody(K, R, 9), lat = 8, { flap, loops } = lacing(K, c, R, lat, 38, p.weight >= 14 ? 12 : 10);
    K.add('Black coated-vinyl shell', K.cut(body, [latBand(K, c, R, lat - 3, 2, 1.4), gores(K, c, R, 45, -6)]), 'liner', '#1a1b1c', 0, .5);
    K.add('Laced seam', K.union([flap, loops]), 'liner', '#111213', 0, .4);
    const C = K.C, word = K.k(C.union([K.k(K.roundRect(170, 30, 3).translate([0, R * .42])), K.k(K.roundRect(92, 7, 1).translate([-18, R * .42 - 25])), K.k(K.roundRect(16, 9, 1).translate([44, R * .42 - 25]))]));
    K.add('White ROGUE print', K.union([K.sphereDecal(word, c, R), K.sphereDecal(K.k(K.text(String(p.weight), 42).translate([0, -R * .38])), c, R)]), 'source', '#efefeb', 0, .6);
  });
}

export function buildEchoSlamBall(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), D = echoSlamDiameter(p.weight), R = D / 2;
  if (!(ECHO_SLAM.weights as readonly number[]).includes(p.weight)) throw Error('Unsupported slam ball weight.');
  return K.run('Echo slam ball', () => {
    const { c, body } = ballBody(K, R, 3, 64);
    K.add('Red pebbled PVC shell', K.cut(body, ECHO_SLAM.grooves.map(l => latBand(K, c, R, l, 2.2, 1.3, 64))), 'liner', '#cc2a25', 0, .72);
    // Front: white ESB-<lb> box (red letters cut through it) and the ROGUE plate, on the band just above the equator.
    const C = K.C, v = R * .05, bx = -R * .36, box = K.k(C.difference([K.k(K.roundRect(46, 17, 2).translate([bx, v])), K.k(K.text(`ESB-${p.weight}`, 8, 1.5).translate([bx, v]))]));
    const plate = K.k(K.roundRect(78, 15, 2).translate([R * .23, v]));
    // Top: the white weight ring with the numerals inside.
    const ring = K.k(C.difference([K.k(C.circle(33, 48)), K.k(C.circle(29, 48))])), num = K.k(K.text(String(p.weight), 22, 3.4));
    K.add('White markings', K.union([K.sphereDecal(box, c, R, .4, [0, 0, 0], 64), K.sphereDecal(plate, c, R, .4, [0, 0, 0], 64), K.sphereDecal(K.k(C.union([ring, num])), c, R, .6, [-90, 0, 0], 64)]), 'source', '#f2f2ee', 0, .55);
  });
}

export function buildDynamaxBall(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), R = DYNAMAX.diameter / 2, color = DYNAMAX_COLORS[p.color];
  if (!color) throw Error('Unsupported Dynamax colour.');
  if (!(DYNAMAX.weights as readonly number[]).includes(p.weight)) throw Error('Unsupported medicine ball weight.');
  return K.run('Dynamax ball', () => {
    const { c, body } = ballBody(K, R, 9), lat = 10, { flap, loops } = lacing(K, c, R, lat, 36, 11);
    // Label panels front and back: latitude -32°..+38°, ±50° of longitude about -Y and +Y (meridian and latitude seams).
    const z0 = c[2] + R * Math.sin(-32 * Math.PI / 180), z1 = c[2] + R * Math.sin(38 * Math.PI / 180), S = R * 1.6, tn = Math.tan(50 * Math.PI / 180);
    const bow = K.k(K.M.extrude(K.k(K.C.union([K.poly([[0, 0], [-S * tn, -S], [S * tn, -S]]), K.poly([[0, 0], [S * tn, S], [-S * tn, S]])])), z1 - z0));
    const panelZone = K.move(bow, [0, 0, z0]);
    const panels = K.meet(body, panelZone);
    K.add('Ball panels', K.cut(body, [panelZone]), 'liner', color.hex, 0, .55);
    K.add('Label panels', panels, 'liner', color.band, 0, .5);
    K.add('Laced seam', K.union([flap, loops]), 'liner', '#111213', 0, .4);
    const ink = color.band === '#2a2a2c' ? '#6a6a6c' : '#1b1b1c';
    K.add('DYNAMAX print and weight', K.union([K.sphereDecal(K.k(K.roundRect(196, 26, 2).translate([0, -R * .2])), c, R), K.sphereDecal(K.k(K.text(String(p.weight), 18, 3).translate([0, -R * .42])), c, R)]), 'source', ink, 0, .6);
  });
}

// ── Foam rollers ────────────────────────────────────────────────────────────────────────────────
/** GRID 1.0 axial zones (mm): two finger ribs, a flat palm band, four ribs, a palm band, two ribs. */
export const GRID_ZONES = (() => { const palm = 84.5, rib = (GRID.length - 2 * palm) / 8; return ['r', 'r', 'p', 'r', 'r', 'r', 'r', 'p', 'r', 'r'].map(k => ({ kind: k as 'r' | 'p', len: k === 'r' ? rib : palm })); })();
/** Longitudinal groove angles (deg around the revolve axis; the badge's wide column is centred at 270°, turned to face up-front): narrow fingertip columns plus wide palm columns, twice round. */
export const GRID_GROOVES = [0, 12, 24, 40, 95, 180, 192, 204, 220, 275].map(a => a + 202.5);
export function buildGridRoller(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), color = GRID_COLORS[p.color], R = GRID.diameter / 2, rc = GRID.core / 2, dg = 5;
  if (!color) throw Error('Unsupported GRID colour.');
  return K.run('GRID roller', () => {
    // Outer (r, z) profile: rounded rib crowns with V grooves between them; palm bands flat with rounded shoulders.
    const pts: Pt[] = [[rc, 0]]; let z = 0;
    for (const zone of GRID_ZONES) {
      const n = zone.kind === 'r' ? 10 : 14;
      for (let i = 0; i <= n; i++) {
        const u = i / n, e = zone.kind === 'r' ? 1 - Math.sqrt(Math.sin(Math.PI * u)) : Math.max(0, 1 - Math.min(u, 1 - u) * zone.len / 4) ** 2;
        pts.push([R - dg * e, z + zone.len * u]);
      }
      z += zone.len;
    }
    pts.push([rc, GRID.length]);
    const clean = pts.filter((q, i) => i === 0 || Math.abs(q[1] - pts[i - 1][1]) > 1e-6 || Math.abs(q[0] - pts[i - 1][0]) > 1e-6);
    let eva = K.revolve(K.poly(clean), 72);
    const groove = K.box([R - 4, -1.6, -1], [R + 2, 1.6, GRID.length + 1]);
    eva = K.cut(eva, GRID_GROOVES.map(a => K.turn(groove, [0, 0, a])));
    const core = K.cut(K.cyl('z', .5, GRID.length - .5, rc, 0, 0, 48), [K.cyl('z', -1, GRID.length + 1, GRID.bore / 2, 0, 0, 48)]);
    // Logo badge in the first palm band, facing up-front: a framed rounded square (plain plate).
    const palmZ = GRID_ZONES[0].len * 2 + GRID_ZONES[2].len / 2;
    const badge = (w: number, lift: number) => K.cut(K.meet(K.turn(K.k(K.k(K.roundRect(w, w, 6).translate([0, palmZ])).extrude(R + 10)), [90, 0, 0]), K.cyl('z', 0, GRID.length, R + lift, 0, 0, 72)), [K.cyl('z', -1, GRID.length + 1, R - .01, 0, 0, 72)]);
    const frame = K.cut(badge(38, .6), [badge(33, 1)]), fill = K.cut(badge(33, .5), [frame]);
    const place = (m: Manifold) => K.move(K.turn(K.turn(m, [0, 0, 225 - 270]), [0, 90, 0]), [0, 0, R]);
    // Revolve axis Z → lie along X, lifted onto the floor: rotate about Y by 90° maps +Z → +X.
    K.add('EVA foam', place(eva), 'liner', color.hex, 0, .62);
    K.add('Hollow core', place(core), 'source', color.core, 0, .5);
    K.add('Logo badge frame', place(frame), 'source', '#b5d334', 0, .5);
    K.add('Logo badge', place(fill), 'source', '#2b2d30', 0, .5);
    return [-GRID.length / 2, 0, 0];
  });
}

export function buildAmazonRoller(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), R = AMAZON_ROLLER.diameter / 2, L = inch(p.length), color = AMAZON_ROLLER_COLORS[p.color], er = 6;
  if (!color || !(AMAZON_ROLLER.lengths as readonly number[]).includes(p.length)) throw Error('Unsupported foam roller.');
  return K.run('foam roller', () => {
    const edge = (z0: number, s: number): Pt[] => Array.from({ length: 7 }, (_, i) => { const a = Math.PI / 2 * i / 6; return [R - er + er * Math.sin(a), z0 + s * er * (1 - Math.cos(a))]; });
    const prof: Pt[] = [[0, 0], ...edge(0, 1), ...edge(L, -1).reverse(), [0, L]];
    const place = (m: Manifold) => K.move(K.turn(m, [0, 90, 0]), [-L / 2, 0, R]);
    const body = K.revolve(K.poly(prof), 64);
    // Embossed end-face wordmark (plain plate, slightly darker) on the +X end.
    const mark = K.box([-8, -44, L - .3], [8, 44, L + .01]);
    let foam = K.cut(body, [mark]);
    K.add('End-face wordmark', place(mark), 'liner', shade(color.hex, .7), 0, .6);
    if (color.fleck) {
      // Coloured bead flecks, ~1 per 700 mm² of skin, as thin chips proud of the surface.
      const rand = rng(p.length * 131 + p.color), n = Math.round(2 * Math.PI * R * (L - 2 * er) / 700), chip = K.box([-1.8, -1.2, -.35], [1.8, 1.2, .35]), chips: Manifold[] = [];
      for (let i = 0; i < n; i++) {
        const a = rand() * 360, z = er + rand() * (L - 2 * er), s = .6 + rand() * .9;
        chips.push(K.move(K.turn(K.turn(K.turn(K.k(chip.scale([s, s * (.7 + rand() * .6), 1])), [0, 0, rand() * 180]), [0, 90, 0]), [0, 0, a]), [R * Math.cos(a * Math.PI / 180), R * Math.sin(a * Math.PI / 180), z]));
      }
      // Inlaid flush: the flecks are the chips' share of the skin, cut out of the foam.
      const flecks = K.meet(K.k(K.M.compose(chips)), body);
      K.add('Coloured bead flecks', place(flecks), 'liner', color.fleck, 0, .85);
      foam = K.cut(foam, [flecks]);
    }
    K.add('Moulded EPP bead foam', place(foam), 'liner', color.hex, 0, .9);
  });
}
