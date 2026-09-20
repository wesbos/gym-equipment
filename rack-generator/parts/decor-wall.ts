/** Room decor (#201): Manifold builders for the wall entries in ../wall-parts/decor.ts.
 * Wall axes: X along the wall, -Y out of it (into the room), Z up; origin at the face centre on the wall surface.
 * Openings (windows, doors, the bay) are cut from the wall finish by the scene, so their returns, sashes and glass sit
 * behind the wall plane (+Y) and show through the hole; on a `standoff` they are built proud of a wall section instead. */
import type { Manifold } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec2 } from '../types.ts';
import { wallDefinition } from '../wall-part.ts';
import {
  DECOR_WINDOW, DECOR_DOOR, BAY_WINDOW, BANNER_AMERICAN_MADE, BANNER_STAY_WEIRD, FABRIC_BANNER, SONOS_FIVE_WALL, WALL_TV,
  WINDOW, DOOR, SONOS_FIVE, windowSize, bayLayout, genericBanner, tvPanel, inch, type BannerSpec,
} from '../wall-parts/decor.ts';
import { decorKit, finish, lettering, WHITE_TRIM, DRYWALL, BIRCH, GLASS, BLACK_STEEL, type Finish, type Kit } from './decor-kit.ts';
import { roundRect } from './leftovers-kit.ts';

const VINYL = finish('White vinyl window frames', 'source', '#f4f5f3', 0, .4);
const LATCH = finish('Window latches and cranks', 'fastener', '#d9dbd8', .3, .4);
const DOOR_PAINT = finish('Painted door slab', 'source', '#f1f2f0', 0, .5);
const LEVER = finish('Matte black door lever and hinges', 'fastener', '#1a1a1b', .6, .45);
const BRASS = finish('Brass grommets', 'fastener', '#b8913d', .9, .35);
const BAY_FLOOR = finish('Grey-fleck rubber (bay floor)', 'source', '#8a8e90', 0, .9);

/** Rectangular frame (ring) in the face plane, outer w × h, `band` wide, occupying y ∈ [y0, y1]. */
function ring(k: Kit, cx: number, cz: number, w: number, h: number, band: number, y0: number, y1: number) {
  const outer = k.rect([cx - w / 2, cz - h / 2], [cx + w / 2, cz + h / 2]), inner = k.rect([cx - w / 2 + band, cz - h / 2 + band], [cx + w / 2 - band, cz + h / 2 - band]);
  return k.front(k.csCut(outer, [inner]), y1 - y0, y1);
}
/** A face-plane rectangle slab between y0 and y1 (y0 < y1). */
const slab = (k: Kit, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) => k.span([x0, y0, z0], [x1, y1, z1]);

/** Window sashes and glass for a w × h opening centred at (0, 0): glass plane at `gy`, frames toward the room (−Y).
 * `place` moves every solid (the bay stands units in its angled walls). */
function windowUnit(k: Kit, w: number, h: number, style: number, gy: number, place: (m: Manifold) => Manifold = m => m) {
  const f = WINDOW.sash, frameDepth = 55, y0 = gy - frameDepth / 2, y1 = gy + frameDepth / 2;
  const add = (fin: Finish, ...m: Manifold[]) => k.add(fin, ...m.map(place));
  add(VINYL, ring(k, 0, 0, w, h, f, y0, y1));
  const sash = (cx: number, sw: number, yA: number, yB: number) => add(VINYL, ring(k, cx, 0, sw, h - 2 * f + 8, 38, yA, yB));
  if (style === 0) { sash(0, w - 2 * f + 8, y0 - 6, gy + 4); add(LATCH, slab(k, -40, -h / 2 + f + 8, 40, -h / 2 + f + 26, y0 - 18, y0 - 6)); }
  else if (style === 1) {
    const half = (w - 2 * f) / 2 + 20;
    sash(-(w - 2 * f) / 4 - 10, half, gy - 2, gy + 16); sash((w - 2 * f) / 4 + 10, half, y0 - 4, gy - 2);
    add(LATCH, slab(k, -18, -30, -6, 30, y0 - 14, y0 - 4));
  } else if (style === 3) { sash(0, w - 2 * f + 8, y0 - 6, gy + 4); add(LATCH, slab(k, -35, -h / 2 + f - 6, 35, -h / 2 + f + 10, y0 - 30, y0 - 6), k.cyl(24, 9, 'y', [0, y0 - 38, -h / 2 + f + 2], 16)); }
  add(GLASS, slab(k, -w / 2 + f - 1, -h / 2 + f - 1, w / 2 - f + 1, h / 2 - f + 1, gy - 3, gy + 3));
}
/** A window in its rough opening: casing on the wall, drywall return, stool, sashes and glass (see file header). */
function windowInWall(k: Kit, w: number, h: number, style: number, standoff: number) {
  const c = WINDOW.casing, o = -standoff, recessed = !standoff;
  k.add(WHITE_TRIM, ring(k, 0, 0, w + 2 * c, h + 2 * c, c, o - 16, o));
  if (recessed) {
    const r = 130;
    k.add(DRYWALL, slab(k, -w / 2, -h / 2, -w / 2 + 12, h / 2, 0, r), slab(k, w / 2 - 12, -h / 2, w / 2, h / 2, 0, r), slab(k, -w / 2, h / 2 - 12, w / 2, h / 2, 0, r));
    k.add(WHITE_TRIM, slab(k, -w / 2 - 20, -h / 2 - 22, w / 2 + 20, -h / 2, -WINDOW.stool, r));
    windowUnit(k, w - 24, h - 12, style, 100);
  } else {
    k.add(WHITE_TRIM, slab(k, -w / 2 - 20, -h / 2 - 22, w / 2 + 20, -h / 2, o - WINDOW.stool - 16, o - 16));
    windowUnit(k, w, h, style, o - 30);
  }
}
export const buildWindow = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (![0, 1, 2, 3].includes(p.style)) throw Error('Unsupported window style.');
  const { w, h } = windowSize(p);
  return decorKit(api, k => windowInWall(k, w, h, p.style, p.standoff));
};

export const buildDoor = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (![0, 1, 2].includes(p.open)) throw Error('Unsupported door pose.');
  const w = inch(p.width), H = DOOR.height, c = DOOR.casing, o = -p.standoff, T = DOOR.leaf;
  return decorKit(api, k => {
    const floor = -(H + c) / 2, top = floor + H;
    // Casing: two legs and a head, 64 mm flat stock.
    k.add(WHITE_TRIM, slab(k, -w / 2 - c, floor, -w / 2, top + c, o - 18, o), slab(k, w / 2, floor, w / 2 + c, top + c, o - 18, o), slab(k, -w / 2, top, w / 2, top + c, o - 18, o));
    // Leaf in its local frame: x from the hinge (0) to the latch (w), z from the floor, room face at y = -T/2.
    const leaf: Manifold[] = [k.span([0, -T / 2, 12], [w - 6, T / 2, H - 3])];
    const stile = 115, cols: Vec2[] = [[stile, w / 2 - 50], [w / 2 + 50, w - 6 - stile]], rows: Vec2[] = [[140, 840], [1010, 1500], [1600, H - 3 - stile]];
    const panels: Manifold[] = [];
    // On a standoff only the room side shows (the back would sink into the wall section).
    const sides = p.standoff ? [-1] : [-1, 1];
    for (const [x0, x1] of cols) for (const [z0, z1] of rows) for (const s of sides) panels.push(k.span([x0, s * (T / 2 + 5), z0], [x1, s * T / 2, z1]), k.span([x0 + 22, s * (T / 2 + 8), z0 + 22], [x1 - 22, s * (T / 2 + 4), z1 - 22]));
    const hardware: Manifold[] = [];
    for (const s of sides) hardware.push(k.cyl(10, 30, 'y', [w - 70, s * (T / 2 + 5), 914], 24), k.span([w - 70 - 115, s * (T / 2 + 22) - 7, 900], [w - 70, s * (T / 2 + 22) + 7, 928]), k.cyl(22, 8, 'y', [w - 70, s * (T / 2 + 12), 914], 12));
    for (const z of [180, H / 2 + 80, H - 230]) hardware.push(k.span([-4, -T / 2 + 4, z], [6, T / 2 - 4, z + 100]));
    const hingeLeft = p.open !== 2, recessed = !p.standoff, depthY = recessed ? 60 : o - T / 2 - 10;
    // Closed: the leaf sits in the jamb. Open: it swings 90° into the room about the hinge-side edge.
    const hingeX = hingeLeft ? -w / 2 : w / 2;
    const pose = (m: Manifold) => {
      let s = hingeLeft ? m : k.k(m.mirror([1, 0, 0]));
      if (p.open) { s = k.k(s.translate([0, T / 2, 0])); s = k.k(s.rotate([0, 0, hingeLeft ? -90 : 90])); return k.k(s.translate([hingeX, depthY - T / 2, floor])); }
      return k.k(s.translate([hingeX, depthY, floor]));
    };
    k.add(DOOR_PAINT, ...leaf.map(pose)); k.add(WHITE_TRIM, ...panels.map(pose)); k.add(LEVER, ...hardware.map(pose));
    if (recessed) k.add(WHITE_TRIM, slab(k, -w / 2, floor, -w / 2 + 16, top, 0, 130), slab(k, w / 2 - 16, floor, w / 2, top, 0, 130), slab(k, -w / 2, top - 16, w / 2, top, 0, 130), slab(k, -w / 2 + 16, floor, w / 2 - 16, top - 16, 128, 132));
    else k.add(WHITE_TRIM, slab(k, -w / 2, floor, w / 2, top, o - 3, o));
  });
};

/** A wall slab from plan a → b (its room face, local −y, on the right of a → b), with an optional window hole, `t` thick outward. */
function bayWall(k: Kit, a: Vec2, b: Vec2, height: number, floor: number, t: number, hole: { w: number; sill: number; head: number } | null, sill: number) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  // Local: x along a → b from its midpoint, −y into the bay, z from the floor. Built then placed.
  let wall = k.span([-L / 2, 0, 0], [L / 2, t, height]);
  if (hole) wall = k.cut(wall, [k.span([-hole.w / 2, -1, hole.sill], [hole.w / 2, t + 1, hole.head])]);
  const place = (m: Manifold) => k.k(k.k(m.rotate([0, 0, ang * 180 / Math.PI])).translate([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, floor]));
  // Wainscot and stool stop at the wall plane where a side wall meets the mouth.
  const behind = (m: Manifold) => k.cut(place(m), [k.span([-1e5, -1e4, -1e4], [1e5, 0, 1e4])]);
  k.add(DRYWALL, place(wall));
  k.add(BIRCH, behind(k.span([-L / 2, -12, 0], [L / 2, 0, sill - 25])));
  k.add(WHITE_TRIM, behind(k.span([-L / 2, -140, sill - 25], [L / 2, 0, sill])));
  if (hole) windowUnit(k, hole.w, hole.head - hole.sill, 2, t / 2, m => place(k.k(m.translate([0, 0, (hole.sill + hole.head) / 2]))));
}
export const buildBay = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const { sideWindow, backWindow } = bayLayout(p), W = p.width / 2, D = p.depth, floor = -p.mouth / 2, t = 120;
  return decorKit(api, k => {
    // Plan (x along the wall, y behind it): mouth corners (±W, 0), back corners (±(W − D), D). Walking A → B → C → E,
    // each wall's local −y (its room face) points into the bay.
    const A: Vec2 = [-W, 0], B: Vec2 = [-(W - D), D], C: Vec2 = [W - D, D], E: Vec2 = [W, 0];
    const hole = (w: number) => ({ w, sill: p.sill, head: p.head });
    bayWall(k, A, B, p.mouth, floor, t, hole(sideWindow), p.sill);
    bayWall(k, B, C, p.mouth, floor, t, hole(backWindow), p.sill);
    bayWall(k, C, E, p.mouth, floor, t, hole(sideWindow), p.sill);
    // Floor and ceiling of the bay (the room's own floor and ceiling stop at the wall plane).
    const plan = k.poly([[-W, 0], [W, 0], [W - D, D + 1], [-(W - D), D + 1]]);
    k.add(BAY_FLOOR, k.plan(plan, 3, floor));
    k.add(DRYWALL, k.plan(plan, 20, floor + p.mouth - 20));
    // Corner beads where the bay meets the room wall.
    k.add(WHITE_TRIM, slab(k, -W - 40, floor, -W, floor + p.mouth, -14, 0), slab(k, W, floor, W + 40, floor + p.mouth, -14, 0), slab(k, -W - 40, floor + p.mouth - 40, W + 40, floor + p.mouth, -14, 0));
  });
};

// ── Banners ───────────────────────────────────────────────────────────────────────────────────────────
function banner(k: Kit, s: BannerSpec) {
  const field = finish(`Banner field ${s.field}`, 'source', s.field, 0, .95), ink = finish(`Banner lettering ${s.ink}`, 'source', s.ink, 0, .9);
  k.add(field, slab(k, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2, -5, -1));
  if (s.border) k.add(finish(`Banner border ${s.border}`, 'source', s.border, 0, .92), ring(k, 0, 0, s.w, s.h, s.bw, -6, -4.5));
  if (s.lines.length) {
    const inner = s.w - 2 * s.bw - 140, gap = s.weight ? .18 : .32, n = s.lines.length;
    const cap = Math.min(s.cap, (s.h - 2 * s.bw - 80) / (n + (n - 1) * gap));
    s.lines.forEach((line, i) => {
      const z = ((n - 1) / 2 - i) * cap * (1 + gap);
      let text = lettering(k, line, cap, [0, z], s.track, s.weight);
      const bounds = text.bounds(), width = bounds.max[0] - bounds.min[0];
      if (width > inner) text = k.k(text.scale([inner / width, 1]));
      k.add(ink, k.front(text, 1.2, -5.2));
    });
  }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const at = [sx * (s.w / 2 - 32), -3.5, sz * (s.h / 2 - 32)] as const;
    k.add(BRASS, k.cut(k.cyl(7, 11, 'y', [at[0], at[1], at[2]], 20), [k.cyl(9, 6, 'y', [at[0], at[1], at[2]], 12)]));
  }
}
const buildBanner = (spec: BannerSpec | ((p: NumericParams) => BannerSpec)) => (api: ManifoldAPI, p: NumericParams): SolidPart[] =>
  decorKit(api, k => banner(k, typeof spec === 'function' ? spec(p) : spec));

// ── Sonos Five, TV ────────────────────────────────────────────────────────────────────────────────────
export const buildSonosFive = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (p.orientation !== 0 && p.orientation !== 1) throw Error('Unsupported speaker orientation.');
  const white = p.color === 1, S = SONOS_FIVE;
  const body = finish(white ? 'Sonos Five white body' : 'Sonos Five matte black body', 'source', white ? '#ecedeb' : '#1d1f21', 0, .6);
  const grille = finish(white ? 'Sonos Five white grille' : 'Sonos Five black grille', 'source', white ? '#d6d8d6' : '#121314', .1, .75);
  const [w, h] = p.orientation ? [S.h, S.w] : [S.w, S.h];
  return decorKit(api, k => {
    const y1 = -S.bracket, y0 = y1 - S.d;
    k.add(body, k.front(roundRect(k, [0, 0], w, h, 34), S.d - 3, y1));
    k.add(grille, k.front(roundRect(k, [0, 0], w - 16, h - 16, 28), 3, y0 + 3));
    k.add(BLACK_STEEL, slab(k, -35, -h / 2 + 30, 35, h / 2 - 30, y1, 0), slab(k, -w / 2 + 20, -h / 2, w / 2 - 20, -h / 2 + 14, y1 - 60, y1));
  });
};
export const buildWallTv = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const { w, h } = tvPanel(p);
  const screen = finish('TV screen (off)', 'source', '#0c0d0f', .3, .12), bezel = finish('TV bezel and back', 'source', '#18191b', .2, .5);
  return decorKit(api, k => {
    k.add(bezel, slab(k, -w / 2, -h / 2, w / 2, h / 2, -75, -45));
    k.add(screen, slab(k, -w / 2 + 6, -h / 2 + 6, w / 2 - 6, h / 2 - 6, -76.5, -75));
    k.add(BLACK_STEEL, slab(k, -Math.min(300, w / 3), -Math.min(200, h / 3), Math.min(300, w / 3), Math.min(200, h / 3), -45, 0));
  });
};

export const definitions: PartDefinition[] = [
  wallDefinition(DECOR_WINDOW, buildWindow),
  wallDefinition(DECOR_DOOR, buildDoor),
  wallDefinition(BAY_WINDOW, buildBay),
  wallDefinition(BANNER_AMERICAN_MADE, buildBanner(BANNER_AMERICAN_MADE.spec)),
  wallDefinition(BANNER_STAY_WEIRD, buildBanner(BANNER_STAY_WEIRD.spec)),
  wallDefinition(FABRIC_BANNER, buildBanner(genericBanner)),
  wallDefinition(SONOS_FIVE_WALL, buildSonosFive),
  wallDefinition(WALL_TV, buildWallTv),
];
