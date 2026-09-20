/** Room decor (#201): Levrack storage pieces and the PLAE storage rack (entries in ../floor-parts/decor.ts).
 * Floor axes: Z up, origin on the floor at the footprint centre, X the length, the front (cabinet handles, drawers,
 * shelf lips) at −Y. */
import type { Manifold } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  LEVRACK_MOBILE_STORAGE, LEVRACK_WORKSTATION, LEVRACK_OVERHEAD, PLAE_STORAGE_RACK,
  LEVRACK, PLAE_RACK, WORKSTATION_LENGTHS, levrackLength, levrackDepth, levrackHeight, inch, ft,
} from '../floor-parts/decor.ts';
import { decorKit, finish, glow, lettering, torus, BLACK_STEEL, RUBBER, type Kit } from './decor-kit.ts';

const FRAME = finish('Levrack black powder-coated uprights', 'source', '#1a1b1d', .35, .6);
const CABINET = finish('Levrack Stealth Grey cabinets', 'source', LEVRACK.gray, .3, .5);
const RED = finish('Levrack red pull handles', 'handle', '#c3262c', .2, .45);
const HEADER_INK = finish('Levrack header lettering', 'source', '#e8e9e7', 0, .6);
const SLATWALL = finish('Black slatwall panels', 'source', '#1e2022', .2, .55);
const PULLS = finish('Brushed drawer pulls', 'fastener', '#c8ccce', .85, .3);
const UNDER_LIGHT = glow('Levrack under-shelf LED', '#ffffff', .9, .4);
const MAT = finish('Rubber shelf liners', 'liner', '#2a2c2e', 0, .9);
const BELL = finish('Black cast kettlebells', 'source', '#27292b', .35, .6);
const BAND_COLORS: Record<number, string> = { 8: '#e67fa6', 12: '#2f7fd0', 16: '#f1c40f', 20: '#8e44ad', 24: '#27ae60', 28: '#e67e22', 32: '#d0312d' };
const bands = new Map(Object.entries(BAND_COLORS).map(([kg, c]) => [Number(kg), finish(`Kettlebell ${kg} kg handle bands`, 'source', c, .1, .5)]));

const U = LEVRACK.upright;
/** A square upright of side `s` centred at (x, y) from z0 to z1. */
const post = (k: Kit, x: number, y: number, z0: number, z1: number, s = U) => k.span([x - s / 2, y - s / 2, z0], [x + s / 2, y + s / 2, z1]);
/** A black header plate across the front (y = −D/2) at the top, lettered in plain capitals. */
function header(k: Kit, L: number, D: number, H: number) {
  k.add(FRAME, k.span([-L / 2, -D / 2, H - 160], [L / 2, -D / 2 + 12, H]));
  k.add(HEADER_INK, k.front(lettering(k, 'LEVRACK', 62, [-L / 2 + 380, H - 80]), 1.5, -D / 2));
}

export const buildLevrackStorage = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const L = levrackLength(p), D = levrackDepth(p), H = levrackHeight(p);
  return decorKit(api, k => {
    for (const x of [-L / 2 + U / 2, L / 2 - U / 2]) for (const y of [-D / 2 + U / 2 + 12, D / 2 - U / 2]) k.add(FRAME, post(k, x, y, 0, H - 160));
    k.add(FRAME, k.span([-L / 2, D / 2 - U, H - 160], [L / 2, D / 2, H]), k.span([-L / 2, -D / 2 + 12, H - 240], [L / 2, D / 2 - U, H - 160]));
    header(k, L, D, H);
    // Mobile cabinets (18″ and 15″ alternating) hang from the overhead track and roll out along the depth.
    const inner = L - 2 * U - 20, widths: number[] = [];
    for (let used = 0, i = 0; ; i++) { const w = inch(i % 2 ? 15 : 18); if (used + w > inner) break; widths.push(w); used += w + 12; }
    const total = widths.reduce((a, b) => a + b, 0) + 12 * (widths.length - 1);
    let x = -total / 2;
    for (const w of widths) {
      const cx = x + w / 2, y0 = -D / 2 + 40, y1 = D / 2 - U - 20, z0 = 70, z1 = H - 260;
      k.add(CABINET, k.span([x, y0, z0], [x + w, y1, z1]));
      k.add(RED, k.span([cx - 13, y0 - 28, 950], [cx + 13, y0, 1350]));
      k.add(RUBBER, k.cyl(40, 35, 'x', [cx, y0 + 60, 35], 16), k.cyl(40, 35, 'x', [cx, y1 - 60, 35], 16));
      k.add(PULLS, k.span([cx - 20, y0, z1], [cx + 20, y1, H - 240]));
      x += w + 12;
    }
  });
};

export const buildLevrackWorkstation = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const len = WORKSTATION_LENGTHS[p.length]; if (!len) throw Error('Unsupported workstation length.');
  if (![0, 1, 2, 3].includes(p.drawers) || ![0, 1, 2].includes(p.slatwall)) throw Error('Unsupported workstation option.');
  const L = ft(len) + U, D = inch(30), top = inch(36), tall = p.slatwall ? 2000 : top;
  return decorKit(api, k => {
    const slats = (a: Manifold, along: 'x' | 'y', z0: number, z1: number, face: number) => {
      const cuts: Manifold[] = [];
      for (let z = z0 + 60; z < z1 - 20; z += inch(3)) cuts.push(along === 'x' ? k.span([-L / 2 + U, face - 8, z], [L / 2 - U, face + 8, z + 12]) : k.span([face - 8, -D / 2 + U, z], [face + 8, D / 2 - U, z + 12]));
      return k.cut(a, cuts);
    };
    for (const x of [-L / 2 + U / 2, L / 2 - U / 2]) {
      for (const y of [-D / 2 + U / 2, D / 2 - U / 2]) k.add(FRAME, post(k, x, y, 0, y > 0 ? tall : top - 6));
      for (const z of [120, top - 160]) k.add(FRAME, k.span([x - 20, -D / 2 + U, z], [x + 20, D / 2 - U, z + 40]));
    }
    for (const y of [-D / 2 + 25, D / 2 - 25]) k.add(FRAME, k.span([-L / 2 + U, y - 25, top - 50], [L / 2 - U, y + 25, top - 6]));
    k.add(BLACK_STEEL, k.span([-L / 2, -D / 2, top - 6], [L / 2, D / 2 - (p.slatwall ? 22 : 0), top]));
    for (let i = 0; i < p.drawers; i++) {
      const z1 = top - 60 - i * 165, z0 = z1 - 150;
      k.add(FRAME, k.span([-L / 2 + U + 4, -D / 2 + 30, z0], [L / 2 - U - 4, D / 2 - 120, z1]));
      k.add(PULLS, k.span([-L / 2 + U + 140, -D / 2 + 8, z1 - 50], [L / 2 - U - 140, -D / 2 + 30, z1 - 30]));
    }
    if (p.slatwall) k.add(SLATWALL, slats(k.span([-L / 2 + U, D / 2 - 22, top], [L / 2 - U, D / 2, tall - 40]), 'x', top, tall - 40, D / 2 - 22));
    if (p.slatwall === 2) k.add(SLATWALL, slats(k.span([L / 2 - 22, -D / 2 + U, 60], [L / 2, D / 2 - U, top + 420]), 'y', 60, top + 420, L / 2 - 22));
  });
};

export const buildLevrackOverhead = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const L = levrackLength(p), D = levrackDepth(p), H = levrackHeight(p);
  return decorKit(api, k => {
    for (const x of [-L / 2 + U / 2, L / 2 - U / 2]) for (const y of [-D / 2 + U / 2 + 12, D / 2 - U / 2]) k.add(FRAME, post(k, x, y, 0, H - 160));
    k.add(FRAME, k.span([-L / 2, D / 2 - U, H - 160], [L / 2, D / 2, H - 84]));
    for (const x of [-L / 2 + U / 2, L / 2 - U / 2]) k.add(FRAME, k.span([x - U / 2, -D / 2 + 12, H - 160], [x + U / 2, D / 2 - U, H - 110]));
    header(k, L, D, H - 84);
    // Wire deck on top: a light grid of rods.
    const deck: Manifold[] = [];
    for (let y = -D / 2 + 60; y < D / 2 - 40; y += 100) deck.push(k.span([-L / 2 + U, y - 3, H - 90], [L / 2 - U, y + 3, H - 84]));
    for (let x = -L / 2 + 200; x < L / 2 - 100; x += 300) deck.push(k.span([x - 12, -D / 2 + 12, H - 110], [x + 12, D / 2 - U, H - 90]));
    k.add(FRAME, ...deck);
    // Diagonal brace on the +X end frame, low front to high back.
    const xb = L / 2 - U / 2, a: [number, number] = [-D / 2 + U, 300], b: [number, number] = [D / 2 - U, H - 200];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    k.add(FRAME, k.k(k.k(k.span([-18, -len / 2, -18], [18, len / 2, 18]).rotate([ang, 0, 0])).translate([xb, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2])));
    if (p.light) k.add(UNDER_LIGHT, k.span([-L / 2 + U + 40, -D / 2 + 30, H - 180], [L / 2 - U - 40, -D / 2 + 90, H - 160]));
  });
};

// ── PLAE storage rack ─────────────────────────────────────────────────────────────────────────────────
/** A low-poly kettlebell of `kg` standing on z0 at (x, y), handle across X. */
function kettlebell(k: Kit, kg: number, x: number, y: number, z0: number) {
  const d = 150 + kg * 3.6, r = d / 2, cz = z0 + r * .92, R = r * .62, t = 15 + kg * .15;
  const body = k.k(k.k(k.api.Manifold.sphere(r, 20)).translate([x, y, cz]));
  const handleRing = k.k(k.k(torus(k, R, t, 24, 8).rotate([90, 0, 0])).translate([x, y, cz + r * .55]));
  const handle = k.k(handleRing.intersect(k.span([x - R - t - 1, y - t - 1, cz + r * .55], [x + R + t + 1, y + t + 1, cz + r * .55 + R + t + 1])));
  k.add(BELL, body, handle);
  const band = bands.get(kg);
  if (band) for (const s of [-1, 1]) k.add(band, k.cyl(18, t + 2, 'z', [x + s * R, y, cz + r * .55 + 9], 12));
}
export const buildPlaeRack = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const { width: W, depth: D, height: H, shelves, upright: S } = PLAE_RACK;
  return decorKit(api, k => {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx * (W / 2 - S / 2), y = sy * (D / 2 - S / 2);
      // Offset holes (2″ pitch, staggered) on the front faces of the front uprights.
      const holes = sy < 0 ? Array.from({ length: Math.floor((H - 150) / inch(2)) }, (_, i) => k.cyl(12, 9, 'y', [x + (i % 2 ? 12 : -12), y - S / 2, 100 + i * inch(2)], 10)) : [];
      k.add(FRAME, k.cut(post(k, x, y, 0, H, S), holes));
    }
    for (const z of shelves) {
      k.add(BLACK_STEEL, k.span([-W / 2 + S, -D / 2, z], [W / 2 - S, D / 2, z + 40]));
      k.add(MAT, k.span([-W / 2 + S + 10, -D / 2 + 20, z + 40], [W / 2 - S - 10, D / 2 - 20, z + 46]));
    }
    // Top shelf, and bar/plate pegs on the rear uprights above it.
    k.add(BLACK_STEEL, k.span([-W / 2 + S, -D / 2, H - 480], [W / 2 - S, D / 2, H - 440]));
    if (p.pegs) for (const sx of [-1, 1]) for (const z of [H - 380, H - 250, H - 120]) k.add(BLACK_STEEL, k.rod([sx * (W / 2 - S / 2), D / 2 - S, z], [0, -1, 0], 230, 25, 20));
    if (p.loaded) {
      const rows: [number, number[]][] = [[shelves[0] + 46, [32, 32, 28, 28, 24, 24, 20, 20]], [shelves[1] + 46, [8, 12, 12, 16, 16, 16, 20, 24, 24, 28]]];
      for (const [z, kgs] of rows) {
        const sizes = kgs.map(kg => 150 + kg * 3.6), gap = (W - 2 * S - 60 - sizes.reduce((a, b) => a + b, 0)) / (kgs.length - 1);
        let x = -W / 2 + S + 30;
        kgs.forEach((kg, i) => { kettlebell(k, kg, x + sizes[i] / 2, 0, z); x += sizes[i] + gap; });
      }
    }
  });
};

export const definitions: PartDefinition[] = [
  floorDefinition(LEVRACK_MOBILE_STORAGE, buildLevrackStorage),
  floorDefinition(LEVRACK_WORKSTATION, buildLevrackWorkstation),
  floorDefinition(LEVRACK_OVERHEAD, buildLevrackOverhead),
  floorDefinition(PLAE_STORAGE_RACK, buildPlaeRack),
];
