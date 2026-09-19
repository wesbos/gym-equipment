/** Strongman stones, kegs, tyres and platforms: Manifold builders for floor-parts/strongman-stones.ts. */
import type { Manifold } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { floorDefinition, resolveBy } from '../floor-part.ts';
import {
  BARTOS_STONE_OF_STEEL, BOULDER, DIY_ATLAS_STONE, DIY_KEG, DIY_STONE_PLATFORM, DIY_TIRE, KEGS, NATURAL_STONE, PLATFORM, STONE_OF_STEEL, TIRES, TITAN_HUSAFELL,
  TITAN_HUSAFELL_STONE, boulderLength,
} from '../floor-parts/strongman-stones.ts';
import { inch, pick } from '../floor-parts/strongman-loads.ts';
import { PLATE_SPECS } from '../plates.ts';
import { FINISH, noise3, withKit, type Kit } from './strongman-kit.ts';
import { layer, rectOutline, sideRegion } from './strongman-soft.ts';

const CONCRETE = { color: '#a9a69f', metalness: 0, roughness: .97 }, RUBBER = { color: '#1d1d1e', metalness: 0, roughness: .93 };
const STAINLESS = { color: '#c9ccce', metalness: .92, roughness: .32 };

/** Concrete atlas stone: lightly pitted sphere, raised mould seam at the equator, pour flat on top. */
export function buildAtlasStone(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const D = inch(p.diameter), R = D / 2, n = noise3(7 + p.diameter), seg = D > 450 ? 96 : 72;
    const pit = (v: Vec3) => { const l = Math.hypot(v[0], v[1], v[2]) || 1, f = 1 + .0035 * n(v[0] / 40, v[1] / 40, v[2] / 40) - .0025; v[0] *= f; v[1] *= f; v[2] *= f; };
    let stone = K.k(K.k(K.sphere(R, [0, 0, 0], seg).refine(2)).warp(pit));
    const flat = R - Math.sqrt(R * R - (.11 * D) ** 2);
    stone = K.cut(stone, [K.box([-R, -R, R - flat], [R, R, R + 10])]);
    K.add('Concrete', K.move(stone, [0, 0, R]), CONCRETE);
    K.add('Mould seam', K.move(K.torus(R - 1.2, 2.6, seg, 10), [0, 0, R]), { ...CONCRETE, color: '#9d9a93' });
    return K.done({ ...resolveBy(DIY_ATLAS_STONE.footprint, p), fit: .012 });
  });
}
/** Natural stone: hull of jittered ellipsoid points, smoothed and refined, bumped with noise, flattened resting face. */
export function naturalStoneSolid(K: Kit, L: number, seed: number): Manifold {
  // Hull of a few jittered ellipsoids gives a smooth, water-rounded but lopsided boulder; low-frequency bumps break the symmetry.
  const n = noise3(seed), rnd = (i: number) => { const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return s - Math.floor(s); };
  const a = L / 2, b = a * BOULDER.wide, c = a * BOULDER.tall, blobs: Manifold[] = [];
  for (let i = 0; i < 7; i++) {
    const r = c * (.55 + .35 * rnd(i)), at: Vec3 = [(rnd(i + 10) - .5) * 2 * (b - r * .9), (rnd(i + 20) - .5) * 2 * (a - r * .9), (rnd(i + 30) - .5) * (c - r) * 1.2];
    blobs.push(K.k(K.sphere(r, [0, 0, 0], 40).scale([1 + .4 * rnd(i + 40), 1 + .5 * rnd(i + 50), .8 + .3 * rnd(i + 60)])));
    blobs[i] = K.move(blobs[i], at);
  }
  let m = K.k(K.hull(blobs).refine(2));
  m = K.k(m.warp(v => { const f = 1 + .045 * n(v[0] / L * 2.5, v[1] / L * 2.5, v[2] / L * 2.5) + .012 * n(v[0] / L * 9, v[1] / L * 9, v[2] / L * 9); v[0] *= f; v[1] *= f; v[2] *= f; }));
  const low = m.boundingBox().min[2], cutAt = low + c * .22;
  return K.k(m.warp(v => { if (v[2] < cutAt) v[2] = cutAt - (cutAt - v[2]) * .15; }));
}
export function buildNaturalStone(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const L = boulderLength(p.weight);
    K.add('Granite', naturalStoneSolid(K, L, 13 + p.weight), { color: '#8b8579', metalness: 0, roughness: .9 });
    return K.done({ ...resolveBy(NATURAL_STONE.footprint, p), fit: .2 });
  });
}
/** Stone of Steel: flat-black steel sphere, equator seam, bolt boss on top, white print band. */
export function buildStoneOfSteel(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const s = pick(STONE_OF_STEEL, p.size, 'stone size'), R = inch(s.d) / 2;
    const ball = (t: number) => K.sphere(R + t, [0, 0, R], 96);
    const bossH = R - Math.sqrt(R * R - 45 * 45);
    K.add('Steel shell', K.cut(ball(0), [K.move(K.torus(R + .6, 1.8, 96, 8), [0, 0, R]), K.bar('z', 2 * R - bossH - 1, 2 * R + 5, 90, 0, 0, 32)]), FINISH.texturedBlack);
    K.add('Bolt boss', K.bar('z', 2 * R - bossH - 1, 2 * R - 3, 92, 0, 0, 32), FINISH.texturedBlack);
    K.add('Bolt', K.bar('z', 2 * R - 4, 2 * R + 1, 36, 0, 0, 6), FINISH.fastener);
    K.add('Print band', layer(K, ball, .6, sideRegion(K, rectOutline(0, R * 1.1, R * 1.05, R * .17, 4), 2 * R, 0)), { color: '#eeeeea', metalness: 0, roughness: .7 });
    return K.done({ ...resolveBy(BARTOS_STONE_OF_STEEL.footprint, p), fit: .012 });
  });
}
/** Titan Husafell: open-top hexagonal steel vessel standing on its 8" edge, carry slots in the upper side walls. */
export function buildTitanHusafell(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const { h, w, top, bottom, t, shoulder } = TITAN_HUSAFELL, wall = 4.8, zs = h - shoulder;
    const face = (inset: number): Vec2[] => {
      // Hexagon in (x, z); the inset offsets each edge inward along its normal (approximately, via a scale about the centroid).
      const pts: Vec2[] = [[-bottom / 2, 0], [bottom / 2, 0], [w / 2, zs], [top / 2, h], [-top / 2, h], [-w / 2, zs]];
      if (!inset) return pts;
      return pts.map(([x, z]) => [x - Math.sign(x) * inset * 1.15, z === 0 ? inset : z === h ? h + 5 : z] as Vec2);
    };
    const prismY = (pts: Vec2[], y0: number, y1: number) => K.move(K.rot(K.prism(pts, y1 - y0), [90, 0, 0]), [0, y1, 0]);
    let shell = K.cut(prismY(face(0), -t / 2, t / 2), [prismY(face(wall), -t / 2 + wall, t / 2 - wall)]);
    // Carry slots through both upper side walls, and the scooped top edge of each face.
    for (const sx of [-1, 1]) {
      const cx = sx * (w / 2 + top / 2) / 2, cz = (zs + h) / 2, ang = Math.atan2(h - zs, (top - w) / 2 * sx) * 180 / Math.PI;
      shell = K.cut(shell, [K.move(K.rot(K.cbox([inch(5), 60, inch(1.6)], [0, 0, 0]), [0, -ang + (sx > 0 ? 180 : 0), 0]), [cx, 0, cz])]);
    }
    // Scooped top end of each upper side wall (the curved notch beside the opening).
    for (const sx of [-1, 1]) shell = K.cut(shell, [K.inter(K.bar('x', sx * (top / 2 - 60), sx * (top / 2 + 60), inch(4.4), 0, h, 40), K.box([-w, -t / 2 + wall + .5, 0], [w, t / 2 - wall - .5, h + 60]))]);
    K.add('Steel shell', shell, FINISH.black);
    // Plates stand on edge inside, nested between the sloped walls.
    const count = [0, 2, 3][p.load] ?? 0;
    if (count) {
      const r = PLATE_SPECS.lb45.diameter / 2, slope = (w / 2 - bottom / 2) / zs, zc = (r * Math.sqrt(1 + slope * slope) - bottom / 2 + wall) / slope;
      K.plates(Array(count).fill('lb45'), [0, -(count * PLATE_SPECS.lb45.width + (count - 1) * .5) / 2, zc], [0, 1, 0], 'plate');
    }
    return K.done({ width: w, depth: t });
  });
}
/** Stainless Sankey keg: domed barrel, two rolling bands, rolled chimes with hand-holds, spear valve. */
export function buildKeg(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const k = pick(KEGS, p.size, 'keg size'), R = k.d / 2, H = k.h, chB = Math.min(inch(3.6), H * .16), chT = Math.min(inch(4.2), H * .19), rb = R - 4;
    const zb = chB - 30, zt = Math.min(H - chT + 34, H - 70); // the spear valve stays below the top chime
    const body: Vec2[] = [[0, zb - 18], [rb * .5, zb - 14], [rb * .85, zb - 6], [rb, zb + 12], [rb, zt - 12], [rb * .85, zt + 6], [rb * .5, zt + 14], [0, zt + 18]];
    K.add('Stainless barrel', K.revolve(body, 96), STAINLESS);
    for (const f of [.3, .7]) K.add('Rolling bands', K.revolve([[rb - 1, H * f - 16], [R - 3, H * f - 8], [R, H * f], [R - 3, H * f + 8], [rb - 1, H * f + 16]], 96), STAINLESS);
    const chime = (z0: number, z1: number) => K.revolve([[R - 7, z0], [R - 3.5, z0], [R - 3.5, z1], [R - 7, z1]], 96);
    let top = K.union([chime(H - chT, H - 6), K.move(K.torus(R - 6, 6, 96, 12), [0, 0, H - 6])]), bottom = K.union([chime(6, chB), K.move(K.torus(R - 6, 6, 96, 12), [0, 0, 6])]);
    const hold = (a: number, z: number, w: number, hh: number) => K.rot(K.move(K.rot(K.slab(w, hh, 40, hh / 2, [0, 0, 0]), [90, 0, 90]), [R - 20, 0, z]), [0, 0, a]);
    top = K.cut(top, [hold(0, H - chT * .55, R * .55, chT * .3), hold(180, H - chT * .55, R * .55, chT * .3)]);
    bottom = K.cut(bottom, [0, 90, 180, 270].map(a => hold(a, chB * .5, 40, 22)));
    K.add('Chimes', top, STAINLESS); K.add('Chimes', bottom, STAINLESS);
    K.add('Spear valve', K.union([K.bar('z', zt + 10, zt + 40, 64, 0, 0, 32), K.bar('z', zt + 40, zt + 48, 58, 0, 0, 32)]), { ...STAINLESS, roughness: .25 });
    K.add('Valve cap', K.bar('z', zt + 48, zt + 58, 44, 0, 0, 24), { color: p.fill === 2 ? '#1b1c1e' : '#2a55b8', metalness: 0, roughness: .6 });
    return K.done({ width: k.d, depth: k.d });
  });
}
/** Tractor tyre: revolved carcass with sidewall bulge, R-1 chevron lugs on the tread; lying flat or standing. */
export function buildTire(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const t = pick(TIRES, p.size, 'tire size'), Ro = t.od / 2, W = t.width, lug = Math.min(38, W * .09), Rc = Ro - lug, Rb = t.rim / 2;
    // Carcass cross-section (r, z) with z across the section; bead lips at the rim, sidewalls bulging to full width.
    const prof: Vec2[] = [[Rb, -W * .32], [Rb + 30, -W * .38], [Rb + (Rc - Rb) * .45, -W * .5], [Rc - 50, -W * .47], [Rc - 8, -W * .4], [Rc, -W * .3], [Rc + 4, 0],
      [Rc, W * .3], [Rc - 8, W * .4], [Rc - 50, W * .47], [Rb + (Rc - Rb) * .45, W * .5], [Rb + 30, W * .38], [Rb, W * .32], [Rb - 12, W * .2], [Rb - 12, -W * .2]];
    const carcass = K.revolve(prof, 128);
    const n = Math.round(2 * Math.PI * Rc / (W * .62)), lugs: Manifold[] = [];
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < n; i++) {
      const a = (i + (side > 0 ? .5 : 0)) / n * 360, len = W * .52, bar = K.cbox([lug + 10, 62, len], [Rc + (lug + 10) / 2 - 10, 0, 0]);
      const tilted = K.rot(K.move(K.rot(bar, [side * 42, 0, 0]), [0, 0, side * W * .19]), [0, 0, a]);
      lugs.push(tilted);
    }
    const tread = K.inter(K.union(lugs), K.revolve([[Rc - 30, -W * .44], [Ro - 10, -W * .42], [Ro, -W * .32], [Ro, W * .32], [Ro - 10, W * .42], [Rc - 30, W * .44]], 128));
    let tire = K.union([carcass, tread]);
    tire = p.pose ? K.rot(tire, [0, 90, 0]) : K.move(tire, [0, 0, W / 2]);
    K.add('Rubber', tire, RUBBER);
    return K.done({ ...resolveBy(DIY_TIRE.footprint, p), fit: .03 });
  });
}
/** DIY 2x6 atlas-stone platform: four doubled 2x6 legs, 2x6 top aprons, 2x4 rails, plywood deck and rubber mat. */
export function buildStonePlatform(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const S = PLATFORM.top, [th, wd] = PLATFORM.lumber, H = inch(p.height), deckZ = H - PLATFORM.mat - PLATFORM.deck, apronZ = deckZ - wd, half = S / 2;
    const WOOD = { color: '#c8a473', metalness: 0, roughness: .82 }, PLY = { color: '#b99463', metalness: 0, roughness: .85 };
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      // Corner leg: two 2x6s in an L.
      K.add('Lumber', K.box([sx > 0 ? half - wd : -half, sy > 0 ? half - th : -half, 0], [sx > 0 ? half : -half + wd, sy > 0 ? half : -half + th, deckZ]), WOOD);
      K.add('Lumber', K.box([sx > 0 ? half - th : -half, sy > 0 ? half - wd : -half, 0], [sx > 0 ? half : -half + th, sy > 0 ? half - th : -half + th + wd - th, deckZ]), WOOD);
    }
    for (const s of [-1, 1]) {
      K.add('Lumber', K.box([-half + th, s > 0 ? half - th : -half, apronZ], [half - th, s > 0 ? half : -half + th, deckZ]), WOOD);
      K.add('Lumber', K.box([s > 0 ? half - th : -half, -half + th, apronZ], [s > 0 ? half : -half + th, half - th, deckZ]), WOOD);
      for (const z of [inch(3), H * .5]) {
        K.add('Lumber', K.box([-half + th, s > 0 ? half - th - th : -half + th, z], [half - th, s > 0 ? half - th : -half + 2 * th, z + inch(3.5)]), WOOD);
        K.add('Lumber', K.box([s > 0 ? half - 2 * th : -half + th, -half + th, z + inch(3.5) + 20], [s > 0 ? half - th : -half + 2 * th, half - th, z + inch(7) + 20]), WOOD);
      }
    }
    K.add('Plywood deck', K.box([-half, -half, deckZ], [half, half, deckZ + PLATFORM.deck]), PLY);
    K.add('Rubber mat', K.slab(S - 12, S - 12, PLATFORM.mat, 6, [0, 0, deckZ + PLATFORM.deck]), RUBBER);
    return K.done(resolveBy(DIY_STONE_PLATFORM.footprint, p));
  });
}
export const STONE_DEFINITIONS = [
  floorDefinition(DIY_KEG, buildKeg), floorDefinition(DIY_ATLAS_STONE, buildAtlasStone), floorDefinition(NATURAL_STONE, buildNaturalStone),
  floorDefinition(DIY_TIRE, buildTire), floorDefinition(TITAN_HUSAFELL_STONE, buildTitanHusafell), floorDefinition(BARTOS_STONE_OF_STEEL, buildStoneOfSteel),
  floorDefinition(DIY_STONE_PLATFORM, buildStonePlatform),
];
