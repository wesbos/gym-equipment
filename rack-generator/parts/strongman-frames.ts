/** Strongman steel implements: Manifold builders for floor-parts/strongman-frames.ts. */
import type { Manifold } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { floorDefinition, resolveBy } from '../floor-part.ts';
import {
  ABMAT, ABMAT_LOG_CUSHIONS, BARTOS_CIRCUS, BARTOS_CIRCUS_DB, CERBERUS_DINNIE, DINNIE, LOG_COLLAR, LOG_HANDLE, LOG_SLEEVE, ROGUE_DINNIE_RINGS, ROGUE_FARMER, ROGUE_FARMERS,
  ROGUE_RINGS, ROGUE_Y1, ROGUE_Y1_YOKE, ROGUE_Y2, ROGUE_Y2_YOKE, TITAN_CIRCUS, TITAN_CIRCUS_DB, TITAN_FARMER, TITAN_FARMERS, TITAN_LOG, TITAN_LOGS, TITAN_T3_YOKE,
  TITAN_UPRIGHT, TITAN_UPRIGHT_FARMERS, TITAN_YOKE, titanUprightSleeveZ, yokeHornX, type CircusSpec, type FarmerSpec, type YokeSpec,
} from '../floor-parts/strongman-frames.ts';
import { inch, loadPlates, loadRadius, pick } from '../floor-parts/strongman-loads.ts';
import type { FloorPart } from '../floor-part.ts';
import { FINISH, noise3, withKit, type Finish, type Kit } from './strongman-kit.ts';
import { rectOutline } from './strongman-soft.ts';

const RED_PIN: Finish = { color: '#d42a27', metalness: .2, roughness: .45 };
const KNURL: Finish = { color: '#9ea2a6', metalness: .9, roughness: .42, role: 'handle' };
const CAP: Finish = { color: '#141415', metalness: 0, roughness: .7 };
const fp = (part: FloorPart, p: NumericParams) => resolveBy(part.footprint, p);

// ---- Titan Upright Farmers Walk Handles ---------------------------------------------------------------------------
function uprightHandle(K: Kit, x0: number, p: NumericParams) {
  const u = TITAN_UPRIGHT, T = u.tube, zc = u.foot + T / 2, top = u.foot + T, postY = u.length / 2 - u.postInset, sz = titanUprightSleeveZ();
  let base = K.tube([x0, -u.length / 2, zc], [x0, u.length / 2, zc], T, T, 3.05, 5);
  // Row of 1" holes along both sides of the base tube, 2" pitch between the handle and each post.
  const holes: Manifold[] = [];
  for (let y = u.postGap / 2 + T + inch(1.5); y < postY - inch(3); y += inch(2)) for (const s of [-1, 1]) holes.push(K.bar('x', x0 - T, x0 + T, inch(1), s * y, zc, 16));
  base = K.cut(base, holes);
  K.add('Steel frame', base, FINISH.black);
  for (const s of [-1, 1]) {
    K.add('End caps', K.cbox([T - 2, 8, T - 2], [x0, s * (u.length / 2 + 4 - 8), zc]), CAP);
    K.add('Steel frame', K.box([x0 - u.feet / 2, s * (u.length / 2) - (s > 0 ? T * 1.2 : 0), 0], [x0 + u.feet / 2, s * (u.length / 2) + (s > 0 ? 0 : T * 1.2), u.foot]), FINISH.black);
    // Plate post: collar from the tube to the loadable sleeve, 49 mm sleeve to the top.
    K.add('Steel frame', K.bar('z', top - 1, sz, 70, x0, s * postY, 40), FINISH.black);
    K.add('Plate posts', K.bar('z', sz, u.height - 3, u.sleeveD, x0, s * postY, 40), FINISH.black);
    K.add('Plate posts', K.bar('z', u.height - 3.5, u.height, u.sleeveD - 6, x0, s * postY, 40), FINISH.black);
    // Handle uprights: 3" posts either side of the 8" handle, holes at 8" and 16".
    const py = s * (u.postGap / 2 + u.post / 2);
    let post = K.tube([x0, py, top - 1], [x0, py, u.height + 6], u.post, u.post, 3.05, 5);
    post = K.cut(post, [8, 16].map(hh => K.bar('y', py - u.post, py + u.post, 33, x0, inch(hh), 24)));
    K.add('Steel frame', post, FINISH.black);
    K.add('End caps', K.cbox([u.post - 2, u.post - 2, 6], [x0, py, u.height + 9]), CAP);
  }
  const hz = inch(p.handle), hl = u.postGap / 2 + u.post + 22;
  K.add('Knurled handle', K.bar('y', -hl, hl, u.handleD, x0, hz, 32), KNURL);
  K.add('Handle ends', K.bar('y', hl, hl + 6, u.handleD + 8, x0, hz, 32), FINISH.chrome);
  K.add('Handle ends', K.bar('y', -hl - 6, -hl, u.handleD + 8, x0, hz, 32), FINISH.chrome);
  K.add('Lynch pins', K.bar('x', x0 - 26, x0 + 26, 6, hl - 10, hz, 12), FINISH.zinc);
  K.add('Lynch pins', K.move(K.rot(K.torus(14, 3, 20, 8), [0, 90, 0]), [x0 + 26, hl - 10, hz - 12]), RED_PIN);
  const plates = loadPlates(p.load);
  for (const s of [-1, 1]) K.plates(plates, [x0, s * postY, sz], [0, 0, 1], 'plate');
}
export function buildTitanUprightFarmers(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const u = TITAN_UPRIGHT;
    if (!p.mode) uprightHandle(K, 0, p);
    else {
      const pitch = u.platformWidth - u.tube, gap = pitch - u.tube, c = u.connector;
      for (const s of [-1, 1]) uprightHandle(K, s * pitch / 2, p);
      // Link Connectors: 3.375" tubes across the ends, saddled over each base tube, pinned with red lynch pins.
      for (const sy of [-1, 1]) {
        const y = sy * (u.length / 2 - inch(2.2)), zc = u.foot + u.tube / 2;
        K.add('Link connectors', K.tube([-gap / 2 - 1, y, zc], [gap / 2 + 1, y, zc], c.tube, c.tube, 3.05, 5), FINISH.black);
        for (const sx of [-1, 1]) {
          K.add('Link connectors', K.box([sx * pitch / 2 - u.tube / 2 - 6, y - c.tube / 2, zc + u.tube / 2], [sx * pitch / 2 + u.tube / 2 + 6, y + c.tube / 2, zc + u.tube / 2 + 6]), FINISH.black);
          K.add('Link connectors', K.box([sx > 0 ? sx * pitch / 2 - u.tube / 2 - 6 : sx * pitch / 2 + u.tube / 2, y - c.tube / 2, u.foot + 4], [sx > 0 ? sx * pitch / 2 - u.tube / 2 : sx * pitch / 2 + u.tube / 2 + 6, y + c.tube / 2, zc + u.tube / 2 + 6]), FINISH.black);
          K.add('Lynch pins', K.move(K.rot(K.torus(13, 3, 20, 8), [90, 0, 0]), [sx * (gap / 2 - 30), y - c.tube / 2 - 3, zc + c.tube / 2 + 10]), RED_PIN);
        }
      }
    }
    return K.done(fp(TITAN_UPRIGHT_FARMERS, p));
  });
}
// ---- Straight farmer's handles ---------------------------------------------------------------------------------
const farmerBuild = (f: FarmerSpec, part: FloorPart) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => withKit(api, K => {
  const plates = loadPlates(p.load), zc = Math.max(f.shaft / 2, loadRadius(p.load)), L = f.length, fin = { ...FINISH.texturedBlack, color: f.color };
  K.add('Steel shaft', K.bar('y', -L / 2 + 6, L / 2 - 6, f.shaft, 0, zc, 40), fin);
  for (const s of [-1, 1]) {
    K.add('End caps', K.bar('y', s > 0 ? L / 2 - 6 : -L / 2, s > 0 ? L / 2 : -L / 2 + 6, f.shaft - 2, 0, zc, 40), CAP);
    K.add('Steel shaft', K.bar('y', s * (L / 2 - f.sleeve) - 6, s * (L / 2 - f.sleeve) + 6, f.shaft + 22, 0, zc, 40), fin);
    // Raised handle frame: flat bars either side of the grip.
    const by = s * (f.gripL / 2 + f.bar[0] / 2);
    K.add('Handle frame', K.hull([K.cbox([f.bar[1], f.bar[0], 1], [0, by, zc]), K.cbox([f.bar[1] * .8, f.bar[0], 1], [0, by, zc + f.rise + f.grip * .45]), K.bar('y', by - f.bar[0] / 2, by + f.bar[0] / 2, f.grip + 14, 0, zc + f.rise, 24)]), fin);
  }
  K.add('Handle', K.bar('y', -f.gripL / 2 - 2, f.gripL / 2 + 2, f.grip, 0, zc + f.rise, 32), { ...fin, role: 'handle', roughness: .7 });
  for (const s of [-1, 1]) K.plates(plates, [0, s * (L / 2 - f.sleeve + 6), zc], [0, s, 0], 'plate');
  return K.done(fp(part, p));
});
export const buildTitanFarmers = farmerBuild(TITAN_FARMER, TITAN_FARMERS);
export const buildRogueFarmers = farmerBuild(ROGUE_FARMER, ROGUE_FARMERS);

// ---- Dinnie ---------------------------------------------------------------------------------------------------------
/** Elliptical ring of round stock in the XZ plane: outer width w, outer height h, stock d, centred at the origin. */
function ovalRing(K: Kit, w: number, h: number, d: number, seed = 0, forge = 0): Manifold {
  const R = (w - d) / 2, ring = K.k(K.torus(R, d / 2, 64, 16).scale([1, (h - d) / (w - d), 1]));
  const n = noise3(seed), warped = forge ? K.k(ring.warp(v => { const f = forge * n(v[0] / 20, v[1] / 20, v[2] / 20); v[0] += f; v[1] += f * .7; v[2] += f * .5; })) : ring;
  return K.rot(warped, [90, 0, 0]);
}
export function buildCerberusDinnie(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const plates = loadPlates(p.load), BLACK: Finish = { ...FINISH.texturedBlack, color: '#1d1e20' };
    DINNIE.rings.forEach((ring, i) => {
      const x = (i ? 1 : -1) * DINNIE.pitch / 2, top = ring.top, hole = top - ring.steel / 2, tabTop = hole + 18;
      K.add('Foot plates', K.bar('z', 0, DINNIE.baseT, DINNIE.base, x, 0, 48), BLACK);
      K.add('Loading pins', K.bar('z', DINNIE.baseT, DINNIE.pinTop, DINNIE.pin, x, 0, 40), BLACK);
      K.add('Loading pins', K.bar('z', DINNIE.pinTop - 1, DINNIE.pinTop + 6, DINNIE.pin + 4, x, 0, 40), BLACK);
      // Eye tab on the pin top (thin along X) carrying the ring; through-bolt with nuts below it.
      K.add('Loading pins', K.cut(K.hull([K.cbox([12, 44, 1], [x, 0, DINNIE.pinTop + 6]), K.bar('x', x - 6, x + 6, 40, 0, tabTop - 20, 24)]), [K.bar('x', x - 10, x + 10, ring.steel + 3, 0, hole, 20)]), BLACK);
      K.add('Bolt', K.bar('y', -DINNIE.pin / 2 - 14, DINNIE.pin / 2 + 14, 14, x, DINNIE.pinTop - 40, 12), FINISH.zinc);
      for (const s of [-1, 1]) K.add('Bolt', K.bar('y', s * (DINNIE.pin / 2 + 2), s * (DINNIE.pin / 2 + 12), 24, x, DINNIE.pinTop - 40, 6), FINISH.zinc);
      K.add('Replica rings', K.move(ovalRing(K, ring.od[0], ring.od[1], ring.steel, 3 + i, .8), [x, 0, top - ring.od[1] / 2]), { color: '#8e9194', metalness: .85, roughness: .45, role: 'handle' });
      // Red vertical print strip on the front of each pin.
      // Red vertical wordmark down the front of each pin: eight letter blocks (no artwork).
      for (let k = 0; k < 8; k++) { const z0 = DINNIE.baseT + 70 + k * 30; K.add('Print', K.cut(K.inter(K.bar('z', z0, z0 + 24, DINNIE.pin + 1.2, x, 0, 40), K.box([x - 10, -DINNIE.pin, 0], [x + 10, 0, 999])), [K.bar('z', 0, 999, DINNIE.pin - 1, x, 0, 40)]), { color: '#c8242d', metalness: 0, roughness: .6 }); }
      K.plates(plates, [x, 0, DINNIE.baseT], [0, 0, 1], 'plate');
    });
    return K.done(fp(CERBERUS_DINNIE, p));
  });
}
export function buildRogueRings(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const [[a, b], [c, d]] = ROGUE_RINGS.rings, st = ROGUE_RINGS.steel, xa = -(a + c + ROGUE_RINGS.gap) / 2 + a / 2, xc = xa + a / 2 + ROGUE_RINGS.gap + c / 2;
    for (const [x, w, h, seed] of [[xa, a, b, 5], [xc, c, d, 9]] as const) {
      let r = ovalRing(K, w, h, st, seed, 1.1);
      r = p.pose ? K.move(r, [x, 0, h / 2]) : K.move(K.rot(r, [-90, 0, 0]), [x, 0, st / 2]);
      K.add('Forged rings', r, { color: '#5d5f61', metalness: .8, roughness: .55, role: 'handle' });
    }
    return K.done({ ...fp(ROGUE_DINNIE_RINGS, p), fit: .08 });
  });
}

// ---- Yokes ------------------------------------------------------------------------------------------------------------
const yokeBuild = (y: YokeSpec, part: FloorPart) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => withKit(api, K => {
  const H = inch(p.height ?? y.heights[0]), ux = yokeHornX(y), [uw, ud] = y.upright, T = y.base, foot = 9.5, zb = foot, top = zb + T, barZ = inch(p.bar), D = y.depth;
  const plates = loadPlates(p.load), fin = FINISH.black;
  for (const sx of [-1, 1]) {
    const x = sx * ux;
    // Base tube on two skid feet with upturned toes.
    K.add('Steel frame', K.tube([x, -D / 2 + 70, zb + T / 2], [x, D / 2 - 70, zb + T / 2], T, T, 3.05, 5), fin);
    for (const sy of [-1, 1]) {
      K.add('End caps', K.cbox([T - 2, 6, T - 2], [x, sy * (D / 2 - 70 + 3), zb + T / 2]), CAP);
      K.add('Skid feet', K.box([x - 51, sy > 0 ? D / 2 - 330 : -D / 2 + 60, 0], [x + 51, sy > 0 ? D / 2 - 60 : -D / 2 + 330, foot]), fin);
      K.add('Skid feet', K.hull([K.cbox([102, 1, foot], [x, sy * (D / 2 - 60), foot / 2]), K.cbox([102, 1, foot], [x, sy * (D / 2 - 1), 45])]), fin);
      K.add('Skid feet', K.box([x - T / 2 - 6, sy > 0 ? D / 2 - 250 : -D / 2 + 110, foot], [x - T / 2, sy > 0 ? D / 2 - 110 : -D / 2 + 250, top]), fin);
      K.add('Skid feet', K.box([x + T / 2, sy > 0 ? D / 2 - 250 : -D / 2 + 110, foot], [x + T / 2 + 6, sy > 0 ? D / 2 - 110 : -D / 2 + 250, top]), fin);
      for (const bz of [.3, .7]) for (const by of [140, 220]) K.add('Bolts', K.bar('x', x - T / 2 - 12, x + T / 2 + 12, 16, sy * (D / 2 - by), zb + T * bz, 6), FINISH.fastener);
      // Plate horn.
      K.add('Plate horns', K.bar('z', top - 1, top + 22, y.horn + 16, x, sy * y.hornY, 32), fin);
      K.add('Plate horns', K.bar('z', top + 22, top + y.hornL, y.horn, x, sy * y.hornY, 32), fin);
      K.plates(plates, [x, sy * y.hornY, top + 22], [0, 0, 1], 'plate');
    }
    // Upright with its 5/8" hole column (2" pitch) and base gussets.
    let up = K.tube([x, 0, top - 1], [x, 0, H], uw, ud, 3.05, 4);
    const holes: Manifold[] = [];
    for (let z = inch(16); z < H - inch(2); z += inch(2)) holes.push(K.bar('y', -ud, ud, 16, x, z, 12));
    up = K.cut(up, holes);
    K.add('Steel frame', up, fin);
    K.add('End caps', K.cbox([uw - 2, ud - 2, 5], [x, 0, H + 2.5]), CAP);
    for (const s of [-1, 1]) K.add('Steel frame', K.move(K.rot(K.prism([[-150, 0], [150, 0], [ud / 2, 190], [-ud / 2, 190]], 6), [90, 0, 90]), [x + s * (uw / 2 + 3) - 3, 0, top]), fin);
    // Crossbar bracket: sleeve on the upright, triangular gusset under the bar, red pull pin through the upright.
    K.add('Crossbar', K.tube([x, 0, barZ - 80], [x, 0, barZ + 70], uw + 14, ud + 14, 5, 5), fin);
    const xi = x - sx * (uw / 2 + 7), zg = barZ - y.crossbar / 2;
    K.add('Crossbar', K.move(K.rot(K.prism([[xi, zg], [xi - sx * 150, zg], [xi, zg - 150]] as Vec2[], 8), [90, 0, 0]), [0, 4, 0]), fin);
    // Red pull pin through the bracket; its ring handle marks the published overall width.
    K.add('Pull pins', K.bar('x', x + sx * (uw / 2 + 7), sx * (y.width / 2 - 8), 20, 0, barZ - 50, 16), RED_PIN);
    K.add('Pull pins', K.move(K.rot(K.torus(16, 4, 20, 8), [0, 90, 0]), [sx * (y.width / 2 - 4), 0, barZ - 50 - 16]), RED_PIN);
    if (y.jcups) {
      const jz = barZ - inch(12), jy = -ud / 2 - 7;
      K.add('J-cups', K.box([x - uw / 2 - 7, jy - 6, jz - 90], [x + uw / 2 + 7, jy, jz + 40]), fin);
      K.add('J-cups', K.box([x - uw / 2 - 7, jy - 70, jz - 90], [x + uw / 2 + 7, jy - 6, jz - 70]), fin);
      K.add('J-cups', K.box([x - uw / 2 - 7, jy - 76, jz - 90], [x + uw / 2 + 7, jy - 64, jz - 35]), fin);
      K.add('J-cup liners', K.box([x - uw / 2 - 4, jy - 64, jz - 70], [x + uw / 2 + 4, jy - 6, jz - 64]), { color: '#1a1a1b', metalness: 0, roughness: .8, role: 'liner' });
    }
  }
  K.add('Crossbar', K.bar('x', -ux + uw / 2 + 7, ux - uw / 2 - 7, y.crossbar, 0, barZ, 48), { ...fin, role: 'handle' });
  return K.done(fp(part, p));
});
export const buildTitanYoke = yokeBuild(TITAN_T3_YOKE, TITAN_YOKE);
export const buildRogueY1 = yokeBuild(ROGUE_Y1_YOKE, ROGUE_Y1);
export const buildRogueY2 = yokeBuild(ROGUE_Y2_YOKE, ROGUE_Y2);

// ---- Log ------------------------------------------------------------------------------------------------------------
export function buildTitanLog(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const l = pick(TITAN_LOGS, p.size, 'log size'), R = l.d / 2, zc = Math.max(R, loadRadius(p.load)), Lb = l.length - 2 * (l.sleeve + LOG_COLLAR), wall = 4.8, ww = inch(6);
    let barrel = K.cut(K.bar('x', -Lb / 2, Lb / 2, l.d, 0, zc, 72), [K.bar('x', -Lb / 2 + 6, Lb / 2 - 6, l.d - 2 * wall, 0, zc, 72)]);
    // Hand cut-outs: open from just below the axis on the lifter's side, over the top.
    const windows = [-1, 1].map(s => K.inter(K.move(K.slab(ww, l.d + 40, R * 1.2 + 20, 34, [0, 0, 0]), [s * l.spacing / 2, 0, zc - R * .2]), K.box([s * l.spacing / 2 - ww, -R - 30, 0], [s * l.spacing / 2 + ww, R * .3, zc + R + 30])));
    barrel = K.cut(barrel, windows);
    K.add('Steel barrel', barrel, FINISH.black);
    for (const s of [-1, 1]) {
      K.add('Neutral handles', K.bar('y', -R + wall - 1, R - wall + 1, LOG_HANDLE, s * l.spacing / 2, zc, 32), KNURL);
      K.add('Sleeve collars', K.bar('x', s > 0 ? Lb / 2 : -Lb / 2 - LOG_COLLAR, s > 0 ? Lb / 2 + LOG_COLLAR : -Lb / 2, 72, 0, zc, 40), FINISH.black);
      K.add('Sleeves', K.bar('x', s > 0 ? Lb / 2 + LOG_COLLAR : -l.length / 2, s > 0 ? l.length / 2 : -Lb / 2 - LOG_COLLAR, LOG_SLEEVE, 0, zc, 40), FINISH.black);
      K.plates(loadPlates(p.load), [s * (Lb / 2 + LOG_COLLAR), 0, zc], [s, 0, 0], 'plate');
    }
    return K.done(fp(TITAN_LOG, p));
  });
}
// ---- AbMat Log Crash Cushions -------------------------------------------------------------------------------------------
export function buildAbmatCushions(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const { l, w, h } = ABMAT, r = 30, gap = inch(p.gap), VINYL: Finish = { color: '#1c1d1f', metalness: 0, roughness: .55 };
    for (const s of [-1, 1]) {
      const x = s * (gap / 2 + w / 2);
      const pad = K.hull([-1, 1].flatMap(a => [-1, 1].flatMap(b => [r, h - r].map(z => K.sphere(r, [x + a * (w / 2 - r), b * (l / 2 - r), z], 16)))));
      K.add('Vinyl cushions', pad, VINYL);
      K.add('Seam piping', K.cut(K.inter(K.k(pad.scale([1.004, 1.002, 1])), K.box([x - w, -l, h - r - 4], [x + w, l, h - r + 4])), [pad]), { ...VINYL, color: '#141516' });
      // White AbMat print across the top near the front, Crash Cushion print on the outer side.
      K.add('Prints', K.slab(w * .62, 90, 1.5, 6, [x, -l / 2 + 150, h - .5]), { color: '#efefec', metalness: 0, roughness: .6 });
      K.add('Prints', K.box([s > 0 ? x + w / 2 - .5 : x - w / 2 - 1, -l / 4 - 130, h * .55 - 17], [s > 0 ? x + w / 2 + 1 : x - w / 2 + .5, -l / 4 + 130, h * .55 + 17]), { color: '#efefec', metalness: 0, roughness: .6 });
      K.add('Carry strap', K.slab(50, 180, 4, 3, [x, l / 4, h - 1]), { color: '#0f1011', metalness: 0, roughness: .8 });
    }
    return K.done(fp(ABMAT_LOG_CUSHIONS, p));
  });
}
// ---- Circus dumbbells ------------------------------------------------------------------------------------------------------
function circus(K: Kit, c: CircusSpec, handle: number, pose: number, print?: string) {
  const R = c.bell / 2, L = c.bellL, e = 7, bellProfile: Vec2[] = [[0, 0], [R - e, 0], [R - e * .3, e * .3], [R, e], [R, L - e], [R - e * .3, L - e * .3], [R - e, L], [0, L]];
  const half = c.handleL / 2, parts: [Manifold, string, Finish][] = [];
  for (const s of [-1, 1]) {
    // Bell along Y: inner face at |y| = half, outer end cap with a centre bolt.
    const bell = K.rot(K.revolve(bellProfile, 72), [s > 0 ? -90 : 90, 0, 0]);
    parts.push([K.move(bell, [0, s * half, 0]), 'Steel bells', FINISH.black]);
    parts.push([K.bar('y', s * (half + L - 3), s * (half + L), c.bell - 30, 0, 0, 64), 'End caps', { ...FINISH.black, roughness: .45 }]);
    parts.push([K.bar('y', s * (half + L - 5), s * (half + L), 34, 0, 0, 6), 'Bolts', FINISH.fastener]);
    if (print) parts.push([K.cut(K.inter(K.bar('y', s * half + (s > 0 ? L * .36 : -L * .64), s * half + (s > 0 ? L * .64 : -L * .36), c.bell + 1.2, 0, 0, 72), K.box([-R * .5, -999, 0], [R * .5, 999, R])), [K.bar('y', -999, 999, c.bell - 1, 0, 0, 72)]), 'Print', { color: print, metalness: 0, roughness: .7 }]);
  }
  parts.push([K.bar('y', -half - 2, half + 2, inch(handle), 0, 0, 40), 'Handle', { ...FINISH.black, role: 'handle', roughness: .6 }]);
  for (const [m, name, f] of parts) K.add(name, pose ? K.move(K.rot(m, [90, 0, 0]), [0, 0, half + L]) : K.move(m, [0, 0, R]), f);
}
export function buildTitanCircus(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => { circus(K, pick(TITAN_CIRCUS, p.bell, 'bell size'), p.handle, p.pose); return K.done(fp(TITAN_CIRCUS_DB, p)); });
}
export function buildBartosCircus(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => { circus(K, BARTOS_CIRCUS, BARTOS_CIRCUS.handles[0], p.pose, '#eeeeea'); return K.done(fp(BARTOS_CIRCUS_DB, p)); });
}
export const FRAME_DEFINITIONS = [
  floorDefinition(TITAN_UPRIGHT_FARMERS, buildTitanUprightFarmers), floorDefinition(TITAN_YOKE, buildTitanYoke), floorDefinition(TITAN_LOG, buildTitanLog),
  floorDefinition(CERBERUS_DINNIE, buildCerberusDinnie), floorDefinition(TITAN_CIRCUS_DB, buildTitanCircus), floorDefinition(TITAN_FARMERS, buildTitanFarmers),
  floorDefinition(ROGUE_DINNIE_RINGS, buildRogueRings), floorDefinition(ROGUE_Y1, buildRogueY1), floorDefinition(BARTOS_CIRCUS_DB, buildBartosCircus),
  floorDefinition(ABMAT_LOG_CUSHIONS, buildAbmatCushions), floorDefinition(ROGUE_FARMERS, buildRogueFarmers), floorDefinition(ROGUE_Y2, buildRogueY2),
];
export type { Vec3 };
export { rectOutline };
