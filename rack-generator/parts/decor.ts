/** Room decor (#201): Manifold builders for the floor and ceiling entries in ../floor-parts/decor.ts (Levrack and the
 * PLAE rack live in ./decor-levrack.ts). Floor axes: Z up, origin on the floor at the footprint centre, X the width,
 * the front at −Y. Ceiling parts build down from z = `ceiling`. */
import type { Manifold } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  LALLY_POST, BIRCH_BEAM, WALL_BLOCK, HE_WILLIAMS_LINEAR, BIG_ASS_FANS_I6, CEILING_RIG, BIRCH_DESK, STEP_STOOL, STEP_LADDER,
  LALLY, LINEAR_LED, FAN_BLADES, DOWNRODS, RIG, DESK_WIDTHS, LADDER_HEIGHTS, fanSpan, rigLength, inch, ft,
} from '../floor-parts/decor.ts';
import { decorKit, finish, glow, torus, WHITE_TRIM, DRYWALL, BIRCH, BLACK_STEEL, RUBBER, type Kit } from './decor-kit.ts';
import { definitions as levrack } from './decor-levrack.ts';

const Z: Vec3 = [0, 0, 1];
const STAINLESS = finish('Stainless screw heads', 'fastener', '#c9ccce', .9, .3);
const LALLY_PAINT = finish('Black-painted steel column', 'source', '#1c1d1f', .4, .55);
const BOLTS = finish('Column plate bolts', 'fastener', '#2b2c2e', .6, .45);
const LED_HOUSING = finish('White linear LED extrusion', 'source', '#eceeec', .2, .45);
const LED_LENS = glow('Linear LED lens (5000 K)', '#fbfdff', 1, .4);
const FAN_BLACK = finish('Big Ass Fans black aluminium', 'source', '#18191a', .45, .45);
const FAN_RING = finish('Fan motor trim ring', 'source', '#2a2b2d', .6, .35);
const RING_WOOD = finish('Birch gymnastic rings', 'source', '#d8b98a', 0, .55);
const STRAP_BLUE = finish('Blue ring straps', 'source', '#2c78b4', 0, .8);
const STRAP_GREEN = finish('Lime monkey-bar straps', 'source', '#b9d630', 0, .8);
const BAR_GREEN = finish('Green powder-coated monkey bars', 'source', '#3f8b3a', .3, .5);
const BUCKLES = finish('Strap cam buckles and eye bolts', 'fastener', '#bfc3c6', .85, .3);
const ROPE = finish('Black climbing rope', 'source', '#1b1b1b', 0, .95);
const BASEBOARD = finish('Painted baseboard', 'source', '#f0f1ef', 0, .5);
const TOP_CUT = finish('Wall section top (cut)', 'source', '#2c2f30', 0, .95);
const GREY_PAINT = finish('Grey-painted stool sides', 'source', '#8b9496', 0, .65);
const LADDER_WOOD = finish('Wooden ladder rails and steps', 'source', '#c9a26a', 0, .7);
const MONITOR = finish('Monitor', 'source', '#141517', .3, .35);
const MONITOR_SCREEN = glow('Monitor screen', '#dfe6ea', .35, .2);

// ── Structure ─────────────────────────────────────────────────────────────────────────────────────────
export const buildLallyPost = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const d = LALLY.diameters[p.diameter]; if (!d) throw Error('Unsupported column diameter.');
  const P = LALLY.plate, T = LALLY.plateT;
  return decorKit(api, k => {
    k.add(LALLY_PAINT, k.cyl(p.height - 2 * T, d / 2, 'z', [0, 0, p.height / 2], 32), k.span([-P / 2, -P / 2, 0], [P / 2, P / 2, T]), k.span([-P / 2, -P / 2, p.height - T], [P / 2, P / 2, p.height]));
    for (const z of [T, p.height - T]) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      k.add(BOLTS, k.cyl(8, 9, 'z', [sx * (P / 2 - 22), sy * (P / 2 - 22), z === T ? T + 4 : z - 4], 6));
  });
};
/** Beam along X, `length` × `width`, from z = ceiling − drop up to the ceiling; 8 ft panels with 1/8″ reveals. */
export const buildBirchBeam = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const L = p.length, W = p.width, z0 = p.ceiling - p.drop, z1 = p.ceiling;
  return decorKit(api, k => {
    const joints: Manifold[] = [];
    for (let x = -L / 2 + ft(8); x < L / 2 - 200; x += ft(8)) {
      joints.push(k.span([x - 1.6, -W / 2 - 1, z0 - 1], [x + 1.6, -W / 2 + 3, z1]), k.span([x - 1.6, W / 2 - 3, z0 - 1], [x + 1.6, W / 2 + 1, z1]), k.span([x - 1.6, -W / 2 - 1, z0 - 1], [x + 1.6, W / 2 + 1, z0 + 3]));
    }
    // The bottom board sits between the side boards: a reveal line along each lower edge.
    joints.push(k.span([-L / 2 - 1, -W / 2 + 18, z0 - 1], [L / 2 + 1, -W / 2 + 21, z0 + 3]), k.span([-L / 2 - 1, W / 2 - 21, z0 - 1], [L / 2 + 1, W / 2 - 18, z0 + 3]));
    k.add(BIRCH, k.cut(k.span([-L / 2, -W / 2, z0], [L / 2, W / 2, z1]), joints));
    const screws: Manifold[] = [];
    for (let x = -L / 2 + 150; x < L / 2 - 100; x += 600)
      for (const s of [-1, 1]) screws.push(k.cyl(2, 5, 'y', [x, s * (W / 2 + .5), z0 + 40], 8), k.cyl(2, 5, 'y', [x, s * (W / 2 + .5), z1 - 50], 8), k.cyl(2, 5, 'z', [x, s * (W / 2 - 45), z0 - .5], 8));
    k.add(STAINLESS, ...screws);
  });
};
export const buildWallSection = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (![0, 1, 2].includes(p.finish)) throw Error('Unsupported wall section finish.');
  const L = p.length, T = p.thickness, H = p.height, skin = 14, top = T > 400 ? 6 : 0;
  return decorKit(api, k => {
    const faces = p.finish === 2 ? [-1, 1] : p.finish === 1 ? [-1] : [];
    // Face layers are `skin` deep; `layer(s, a, b, …)` spans a..b mm in from the face on side s (−1 = front, −Y).
    const layer = (s: number, a: number, b: number, z0: number, z1: number) => { const y0 = s * (T / 2 - a), y1 = s * (T / 2 - b); return k.span([-L / 2, Math.min(y0, y1), z0], [L / 2, Math.max(y0, y1), z1]); };
    k.add(DRYWALL, k.span([-L / 2, -T / 2 + skin, 0], [L / 2, T / 2 - skin, H - top]));
    if (top) k.add(TOP_CUT, k.span([-L / 2, -T / 2 + skin, H - top], [L / 2, T / 2 - skin, H]));
    for (const s of [-1, 1]) {
      if (faces.includes(s)) {
        // Birch sheets (2 mm shy of the face) with 1/8″ reveals every 4 ft, a flat cap proud of them, drywall above.
        const seams: Manifold[] = [];
        for (let x = -L / 2 + ft(4); x < L / 2 - 100; x += ft(4)) seams.push(k.span([x - 1.6, -T / 2 - 1, -1], [x + 1.6, T / 2 + 1, p.wainscot]));
        k.add(BIRCH, k.cut(layer(s, 2, skin, 0, p.wainscot), seams));
        k.add(WHITE_TRIM, layer(s, 0, skin, p.wainscot, p.wainscot + 22));
        k.add(DRYWALL, layer(s, 0, skin, p.wainscot + 22, H - top));
      } else {
        k.add(BASEBOARD, layer(s, 0, skin, 0, 90));
        k.add(DRYWALL, layer(s, 2, skin, 90, H - top));
      }
    }
  });
};

// ── Lighting and air ─────────────────────────────────────────────────────────────────────────────────
export const buildLinearLed = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const L = p.sections * LINEAR_LED.section, W = LINEAR_LED.width, H = LINEAR_LED.height, c = p.ceiling;
  return decorKit(api, k => {
    const joints: Manifold[] = [];
    for (let i = 1; i < p.sections; i++) { const x = -L / 2 + i * LINEAR_LED.section; joints.push(k.span([x - 1, -W / 2 - 1, c - H - 1], [x + 1, W / 2 + 1, c - H + 8])); }
    k.add(LED_HOUSING, k.cut(k.span([-L / 2, -W / 2, c - H + 10], [L / 2, W / 2, c]), joints), k.span([-L / 2, -W / 2, c - H], [-L / 2 + 8, W / 2, c - H + 10]), k.span([L / 2 - 8, -W / 2, c - H], [L / 2, W / 2, c - H + 10]));
    k.add(LED_LENS, k.span([-L / 2 + 8, -W / 2 + 6, c - H], [L / 2 - 8, W / 2 - 6, c - H + 10]));
  });
};
export const buildFan = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const n = FAN_BLADES[p.blades], rod = DOWNRODS[p.downrod]; if (!n || rod === undefined) throw Error('Unsupported fan configuration.');
  const R = fanSpan(p) / 2, c = p.ceiling, canopy = 70, hubR = R > 1000 ? 190 : 160, hubH = 115;
  return decorKit(api, k => {
    const zTop = c - canopy - rod, zHub = zTop - hubH;
    k.add(FAN_BLACK, k.cyl(canopy, 75, 'z', [0, 0, c - canopy / 2], 32));
    if (rod) k.add(FAN_BLACK, k.cyl(rod, 16, 'z', [0, 0, c - canopy - rod / 2], 16));
    k.add(FAN_BLACK, k.cyl(hubH - 20, hubR, 'z', [0, 0, zHub + (hubH - 20) / 2 + 20], 40));
    k.add(FAN_RING, k.cyl(20, hubR - 10, 'z', [0, 0, zHub + 10], 40));
    // Airfoil blades: tapered planform from the hub to the tip, pitched 8°, on a short black arm.
    const root = 115, tip = 85, t = 7, blade = k.poly([[hubR - 30, -root / 2], [R, -tip / 2], [R, tip / 2 - 8], [hubR - 30, root / 2]]);
    for (let i = 0; i < n; i++) {
      const a = 360 * i / n, zb = zHub + 30;
      let b = k.k(k.k(blade.extrude(t)).translate([0, 0, -t / 2]));
      b = k.k(b.rotate([8, 0, 0]));
      k.add(FAN_BLACK, k.k(k.k(b.rotate([0, 0, a])).translate([0, 0, zb])));
    }
  });
};
/** Board along X at the ceiling; stations of paired straps across Y (±ringsGap/2). */
export const buildCeilingRig = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (![0, 1, 2].includes(p.layout)) throw Error('Unsupported rig layout.');
  const L = rigLength(p), c = p.ceiling, bt = RIG.boardT, g = RIG.ringsGap / 2, s = RIG.strap;
  return decorKit(api, k => {
    const underside = c - bt;
    k.add(BIRCH, k.span([-L / 2, -RIG.board / 2, underside], [L / 2, RIG.board / 2, c]));
    for (let i = 0; i < p.stations; i++) {
      const x = -(p.stations - 1) * p.spacing / 2 + i * p.spacing, rings = p.layout === 0 || (p.layout === 2 && i % 2 === 0);
      const grip = p.hang, strapColor = rings ? STRAP_BLUE : STRAP_GREEN;
      for (const sy of [-1, 1]) {
        const y = sy * g;
        // Eye bolt and a flat strap with a cam buckle down to the ring top or the bar end.
        k.add(BUCKLES, k.k(k.k(torus(k, 18, 4, 16, 8).rotate([0, 90, 0])).translate([x, y, underside - 20])), k.span([x - 22, y - 6, grip + 420], [x + 22, y + 6, grip + 470]));
        const bottom = rings ? grip + 170 : grip + 20;
        k.add(strapColor, k.span([x - s / 2, y - 1.5, bottom], [x + s / 2, y + 1.5, underside - 36]));
        if (rings) k.add(RING_WOOD, k.k(k.k(torus(k, 90, 14, 32, 10).rotate([90, 0, 0])).translate([x, y, grip + 90 - 14])));
      }
      if (!rings) k.add(BAR_GREEN, k.rod([x, -g - 22, grip], [0, 1, 0], 2 * g + 44, 16, 20));
    }
    if (p.rope) {
      const x = -L / 2 + 100;
      k.add(BUCKLES, k.k(k.k(torus(k, 22, 5, 16, 8).rotate([0, 90, 0])).translate([x, 0, underside - 24])));
      k.add(ROPE, k.rod([x, 0, 300], Z, underside - 346, 19, 16), k.k(k.k(api.Manifold.sphere(34, 16)).translate([x, 0, 300])));
    }
  });
};

// ── Furniture ─────────────────────────────────────────────────────────────────────────────────────────
export const buildDesk = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const W = inch(DESK_WIDTHS[p.width] ?? NaN), D = inch(30), top = inch(29); if (!W) throw Error('Unsupported desk width.');
  return decorKit(api, k => {
    k.add(BIRCH, k.span([-W / 2, -D / 2, top - 38], [W / 2, D / 2, top]));
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(BLACK_STEEL, k.span([sx * (W / 2 - 40) - 25, sy * (D / 2 - 40) - 25, 0], [sx * (W / 2 - 40) + 25, sy * (D / 2 - 40) + 25, top - 38]));
    k.add(BLACK_STEEL, k.span([-W / 2 + 40, D / 2 - 65, top - 120], [W / 2 - 40, D / 2 - 15, top - 38]));
    if (p.monitor) {
      const mw = 810, mh = 360, y = D / 2 - 160;
      k.add(MONITOR, k.span([-mw / 2, y, top + 110], [mw / 2, y + 40, top + 110 + mh]), k.span([-25, y + 40, top], [25, y + 70, top + 260]), k.span([-120, y - 60, top], [120, y + 110, top + 10]));
      k.add(MONITOR_SCREEN, k.span([-mw / 2 + 8, y - 1, top + 118], [mw / 2 - 8, y, top + 102 + mh]));
    }
  });
};
export const buildStepStool = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (p.steps !== 1 && p.steps !== 2) throw Error('Unsupported step count.');
  const W = 400, D = p.steps === 2 ? 380 : 240, t = 18;
  return decorKit(api, k => {
    // Side profile in (d, z), d = −y: the low step at the front (d > 0), the tall back at d < 0. Counter-clockwise.
    const pts: [number, number][] = p.steps === 2
      ? [[-D / 2, 0], [D / 2, 0], [D / 2, 230], [0, 230], [0, 460], [-D / 2, 460]]
      : [[-D / 2, 0], [D / 2, 0], [D / 2, 230], [-D / 2, 230]];
    const side = k.poly(pts), cut = k.poly(p.steps === 2 ? [[-D / 2 + 50, 0], [D / 2 - 50, 0], [D / 2 - 50, 120], [-D / 2 + 50, 120]] : [[-D / 2 + 40, 0], [D / 2 - 40, 0], [D / 2 - 40, 100], [-D / 2 + 40, 100]]);
    const profile = k.csCut(side, [cut]);
    for (const x of [-W / 2, W / 2 - t]) k.add(GREY_PAINT, k.side(profile, t, x));
    k.add(BIRCH, k.span([-W / 2 + t, -D / 2, 212], [W / 2 - t, p.steps === 2 ? 0 : D / 2, 230]));
    if (p.steps === 2) k.add(BIRCH, k.span([-W / 2 + t, 0, 442], [W / 2 - t, D / 2, 460]), k.span([-W / 2 + t, -8, 230], [W / 2 - t, 10, 442]));
  });
};
export const buildStepLadder = (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const H = ft(LADDER_HEIGHTS[p.height] ?? NaN); if (!H) throw Error('Unsupported ladder height.');
  const D = H * .56, Wb = 450 + H * .06, Wt = 340;
  return decorKit(api, k => {
    const topY = D * .12, frontFoot = -D / 2, backFoot = D / 2;
    // Front rails lean back to the top cap; back legs splay to the rear.
    for (const s of [-1, 1]) {
      k.add(LADDER_WOOD, k.rod([s * (Wb / 2 - 25), frontFoot + 30, 14], [s * (Wt - Wb) / 2 / H, (topY - frontFoot - 30) / H, 1], Math.hypot(H, topY - frontFoot - 30), 22, 8));
      k.add(LADDER_WOOD, k.rod([s * (Wb / 2 - 25), backFoot - 25, 14], [s * (Wt - Wb) / 2 / H, (topY + 60 - backFoot + 25) / H, 1], Math.hypot(H - 40, backFoot - topY), 18, 8));
    }
    const steps = Math.max(2, Math.floor((H - 250) / 300));
    for (let i = 1; i <= steps; i++) {
      const z = i * H / (steps + 1), f = z / H, y = frontFoot + 30 + (topY - frontFoot - 30) * f, w = Wb - 90 - (Wb - Wt) * f;
      k.add(LADDER_WOOD, k.span([-w / 2, y - 45, z - 10], [w / 2, y + 45, z + 10]));
    }
    k.add(LADDER_WOOD, k.span([-Wt / 2 - 20, topY - 70, H - 22], [Wt / 2 + 20, topY + 90, H]));
    // Paint shelf and spreader bars.
    k.add(LADDER_WOOD, k.span([-Wt / 2 + 20, topY + 90, H * .62], [Wt / 2 - 20, Math.min(D / 2 - 30, topY + 260), H * .62 + 16]));
    k.add(BUCKLES, k.span([-Wb / 2 + 50, 0, H * .45 - 3], [-Wb / 2 + 60, D * .38, H * .45 + 3]), k.span([Wb / 2 - 60, 0, H * .45 - 3], [Wb / 2 - 50, D * .38, H * .45 + 3]));
    for (const [x, y] of [[-Wb / 2 + 25, frontFoot + 25], [Wb / 2 - 25, frontFoot + 25], [-Wb / 2 + 25, backFoot - 25], [Wb / 2 - 25, backFoot - 25]]) k.add(RUBBER, k.span([x - 25, y - 25, 0], [x + 25, y + 25, 14]));
  });
};

export const definitions: PartDefinition[] = [
  floorDefinition(LALLY_POST, buildLallyPost),
  floorDefinition(BIRCH_BEAM, buildBirchBeam),
  floorDefinition(WALL_BLOCK, buildWallSection),
  floorDefinition(HE_WILLIAMS_LINEAR, buildLinearLed),
  floorDefinition(BIG_ASS_FANS_I6, buildFan),
  floorDefinition(CEILING_RIG, buildCeilingRig),
  ...levrack,
  floorDefinition(BIRCH_DESK, buildDesk),
  floorDefinition(STEP_STOOL, buildStepStool),
  floorDefinition(STEP_LADDER, buildStepLadder),
];
