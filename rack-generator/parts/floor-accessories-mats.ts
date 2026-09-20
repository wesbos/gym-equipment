/** Stall mats, the Massenomics gripper and lifting platforms. Metadata and published sizes: ../floor-parts/floor-accessories.ts. */
import type { ManifoldAPI, Manifold, NumericParams, SolidPart } from '../types.ts';
import { DIY_FINISHES, DIY_PLATFORM, GRIPPER, ROGUE_PLATFORM, STALL_MAT, inch, stallMatSize } from '../floor-parts/floor-accessories.ts';
import { accessoryKit, type AccessoryKit } from './floor-accessories-kit.ts';

const RUBBER = '#212223', RUBBER_ROUGH = .93, STEEL = '#c9c9c4', ZINC = '#a9acae';
/** A square-cut mat slab (0.8 mm eased top edge), x0..x1 × y0..y1 × z0..z1. */
const matSlab = (K: AccessoryKit, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, ease = .8) =>
  K.hull([K.box([x0, y0, z0], [x1, y1, z1 - ease]), K.box([x0 + ease, y0 + ease, z0], [x1 - ease, y1 - ease, z1])]);
/** Round flat-top studs on a pitch grid inside a rectangle (centred), z0..z1; `skip` drops studs under hardware. */
function studs(K: AccessoryKit, w: number, d: number, cx: number, cy: number, z0: number, z1: number, skip?: (x: number, y: number) => boolean) {
  const { studPitch: p, studD } = STALL_MAT, nx = Math.floor(w / p), ny = Math.floor(d / p), one = K.cyl('z', z0, z1, studD / 2, 0, 0, 10), out: Manifold[] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const x = cx + (i - (nx - 1) / 2) * p, y = cy + (j - (ny - 1) / 2) * p;
    if (!skip?.(x, y)) out.push(K.move(one, [x, y, 0]));
  }
  return K.k(K.M.compose(out));
}

export function buildStallMat(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), m = STALL_MAT, { width: W, depth: D } = stallMatSize(p);
  return K.run('stall mat', () => {
    for (let i = 0; i < p.across; i++) for (let j = 0; j < p.deep; j++) {
      const x0 = -W / 2 + i * (m.width + m.seam), y0 = -D / 2 + j * (m.length + m.seam);
      if (p.side === 1) {
        // Flipped: the studded underside faces up (studs 3/16" proud of a 9/16" slab).
        const slab = matSlab(K, x0, x0 + m.width, y0, y0 + m.length, 0, m.thick - m.studH, .5);
        K.add('Rubber stall mat', K.union([slab, studs(K, m.width, m.length, x0 + m.width / 2, y0 + m.length / 2, m.thick - m.studH - .5, m.thick)]), 'liner', RUBBER, 0, RUBBER_ROUGH);
      } else K.add('Rubber stall mats', matSlab(K, x0, x0 + m.width, y0, y0 + m.length, 0, m.thick), 'liner', RUBBER, 0, RUBBER_ROUGH);
    }
  });
}

/** Lying smooth side up: studs on the floor, bracket on the front (-Y) long edge with its tab past the rubber. */
export function buildMatGripper(api: ManifoldAPI): SolidPart[] {
  const K = accessoryKit(api), g = GRIPPER, P = g.plate, total = g.depth + P.tabOut, yb0 = -total / 2 + P.tabOut, yb1 = total / 2, T = g.thick, zb = g.studH;
  return K.run('mat gripper', () => {
    const plateY0 = yb0 - .01, plateY1 = yb0 + P.h, underPlate = (x: number, y: number) => Math.abs(x) < P.w / 2 + 12 && y < plateY1 + 12;
    const block = K.union([matSlab(K, -g.width / 2, g.width / 2, yb0, yb1, zb, T), studs(K, g.width, g.depth, 0, (yb0 + yb1) / 2, 0, zb + .5, underPlate)]);
    K.add('Stall mat block', block, 'liner', '#262728', 0, RUBBER_ROUGH);
    // Steel bracket: top plate with the D-slot tab, plain back plate under the block, two button-head screws and flange nuts.
    const tabHole = K.move(K.k(K.roundRect(20, 13, 5).extrude(10)), [0, -total / 2 + P.tabOut * .45, -5]);
    const outline = K.k(K.C.union([K.k(K.roundRect(P.w, P.h, 8).translate([0, yb0 + P.h / 2])), K.k(K.roundRect(P.tabW, P.tabOut + 12, 5).translate([0, -total / 2 + (P.tabOut + 12) / 2]))]));
    const top = K.cut(K.move(K.k(outline.extrude(P.t)), [0, 0, T]), [K.move(tabHole, [0, 0, T])]);
    const back = K.move(K.k(K.k(K.roundRect(P.w, P.h, 8).translate([0, yb0 + P.h / 2])).extrude(P.t)), [0, 0, zb - P.t]);
    K.add('Steel pin bracket', K.union([top, back]), 'source', STEEL, .75, .42);
    const heads: Manifold[] = [], nuts: Manifold[] = [];
    for (const sx of [-1, 1]) {
      const x = sx * (P.w / 2 - 15), y = yb0 + P.h * .55;
      heads.push(K.meet(K.sphere([x, y, T + P.t - 2], 6, 20), K.box([x - 7, y - 7, T + P.t], [x + 7, y + 7, T + P.t + 4])));
      nuts.push(K.cyl('z', .4, zb - P.t, 6.2, x, y, 6));
    }
    K.add('Button-head screws and flange nuts', K.union([...heads, ...nuts]), 'fastener', '#1e1f21', .5, .45);
    // Screen print: the three-line HORSE STALL MAT GRIPPER block (left) and the rearing-horse badge + wordmark (right), as plain plates.
    const ink = (x: number, y: number, w: number, h: number) => K.box([x - w / 2, y - h / 2, T], [x + w / 2, y + h / 2, T + .3]);
    const px = -g.width / 2 + 48, py = yb0 + 16;
    K.add('White print', K.union([ink(px, py + 26, 50, 8), ink(px, py + 14, 56, 8), ink(px, py + 2, 62, 8), ink(g.width / 2 - 36, yb0 + 34, 22, 26), ink(g.width / 2 - 36, yb0 + 16, 34, 4)]), 'source', '#e9e9e4', 0, .7);
  });
}

// ── DIY platform ────────────────────────────────────────────────────────────────────────────────
export function buildDiyPlatform(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), S = DIY_PLATFORM.size / 2, t = DIY_PLATFORM.ply, c = DIY_PLATFORM.center / 2, finish = DIY_FINISHES[p.finish];
  if (!finish) throw Error('Unsupported platform finish.');
  return K.run('DIY platform', () => {
    const g = 1, base1: Manifold[] = [], base2: Manifold[] = [];
    // Layer 1: two 4'×8' sheets along Y; layer 2 crosses them along X so the seams don't stack.
    for (const s of [-1, 1]) {
      base1.push(K.box(s < 0 ? [-S, -S, 0] : [g / 2, -S, 0], s < 0 ? [-g / 2, S, t] : [S, S, t]));
      base2.push(K.box(s < 0 ? [-S, -S, t] : [-S, g / 2, t], s < 0 ? [S, -g / 2, 2 * t] : [S, S, 2 * t]));
    }
    K.add('Plywood base · layer 1', K.union(base1), 'source', '#c9a978', 0, .85);
    K.add('Plywood base · layer 2 (crossed)', K.union(base2), 'source', '#d6b887', 0, .85);
    K.add('Plywood centre (4\'×8\', finished)', K.box([-c, -S, 2 * t], [c, S, 3 * t]), 'source', finish.hex, 0, p.finish ? .45 : .75);
    // Stall-mat strips: 2' wide, cut from 4'×6' mats, so each 8' strip is a 6' piece plus a 2' piece.
    const seamY = -S + inch(72), mats: Manifold[] = [];
    for (const s of [-1, 1]) {
      const [x0, x1] = s < 0 ? [-S, -c - g] : [c + g, S];
      mats.push(matSlab(K, x0, x1, -S, seamY - .75, 2 * t, 3 * t), matSlab(K, x0, x1, seamY + .75, S, 2 * t, 3 * t));
    }
    K.add('Stall-mat strips (2\'×8\')', K.union(mats), 'liner', RUBBER, 0, RUBBER_ROUGH);
    // Deck screws: rows 2" in from the centre sheet's long edges plus a middle row.
    const heads: Manifold[] = [], one = K.cyl('z', 3 * t - .4, 3 * t + .5, 4.2, 0, 0, 12);
    for (const x of [-c + inch(2), 0, c - inch(2)]) for (let i = 0; i <= (x ? 8 : 5); i++) heads.push(K.move(one, [x, -S + inch(2) + i * (2 * S - inch(4)) / (x ? 8 : 5), 0]));
    K.add('Deck screws', K.k(K.M.compose(heads)), 'fastener', ZINC, .8, .35);
    if (p.logo) K.add('Stencilled logo plate', K.move(K.k(K.roundRect(620, 300, 40).extrude(.4)), [0, 0, 3 * t]), 'source', '#1c1c1c', 0, .8);
  });
}

// ── Rogue 8'×8' Oly Platform ────────────────────────────────────────────────────────────────────
export function buildRoguePlatform(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const K = accessoryKit(api), R = ROGUE_PLATFORM, I = R.inner / 2, O = I + R.tube, H = R.tube, cr = R.corner, B = R.bolt;
  if (p.floor < 0 || p.floor > 2) throw Error('Unsupported platform flooring.');
  return K.run('Rogue platform', () => {
    // Frame: four rails between welded corner blocks (seam 2" in from each corner), each corner with a flush spandrel plate.
    const L = O - 2 * R.tube, rails: Manifold[] = [], corners: Manifold[] = [];
    for (const s of [-1, 1]) {
      rails.push(K.box([-L + .5, s * I - (s < 0 ? R.tube : 0), 0], [L - .5, s * I + (s > 0 ? R.tube : 0), H]));
      rails.push(K.box([s * I - (s < 0 ? R.tube : 0), -L + .5, 0], [s * I + (s > 0 ? R.tube : 0), L - .5, H]));
    }
    const spandrel = K.cut(K.box([0, 0, 0], [cr, cr, H]), [K.cyl('z', -1, H + 1, cr, cr, cr, 40)]);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const ring = K.union([K.box([Math.min(sx * O, sx * L), Math.min(sy * O, sy * I), 0], [Math.max(sx * O, sx * L), Math.max(sy * O, sy * I), H]),
        K.box([Math.min(sx * O, sx * I), Math.min(sy * O, sy * L), 0], [Math.max(sx * O, sx * I), Math.max(sy * O, sy * L), H])]);
      corners.push(ring, K.move(K.turn(spandrel, [0, 0, sx > 0 ? (sy > 0 ? 180 : 90) : (sy > 0 ? -90 : 0)]), [sx * I, sy * I, 0]));
    }
    // Wordmark recess on the front rail's outer face.
    const logo = K.box([-120, -O - .01, H * .3], [70, -O + .6, H * .7]), flag = K.box([80, -O - .01, H * .38], [104, -O + .6, H * .62]), tag = K.box([110, -O - .01, H * .44], [170, -O + .6, H * .56]);
    K.add('11-gauge steel frame', K.cut(K.union([...rails, ...corners]), [logo, flag, tag]), 'source', '#19191a', .25, .62);
    K.add('ROGUE wordmark plate', K.union([logo, tag]), 'source', '#eeeeea', 0, .5);
    K.add('Flag plate', flag, 'source', '#2d3e78', 0, .5);
    // Frame bolts: a zinc hex head and washer on each outer face at every corner seam.
    const bolts: Manifold[] = [];
    for (const s of [-1, 1]) for (const e of [-1, 1]) {
      bolts.push(K.cyl('y', s > 0 ? O : -O - B, s > 0 ? O + B : -O, 9.5, e * (L + 12), H / 2, 6), K.cyl('y', s > 0 ? O : -O - 1.5, s > 0 ? O + 1.5 : -O, 12, e * (L + 12), H / 2, 20));
      bolts.push(K.cyl('x', s > 0 ? O : -O - B, s > 0 ? O + B : -O, 9.5, e * (L + 12), H / 2, 6), K.cyl('x', s > 0 ? O : -O - 1.5, s > 0 ? O + 1.5 : -O, 12, e * (L + 12), H / 2, 20));
    }
    K.add('Frame bolts', K.union(bolts), 'fastener', ZINC, .85, .3);
    // Flooring: 24"×24"×1.5" tiles in a 4×4 bay (corner tiles notched round the spandrels), or a 4'×8' two-layer wood centre.
    const notches = [-1, 1].flatMap(sx => [-1, 1].map(sy => K.move(K.turn(spandrel, [0, 0, sx > 0 ? (sy > 0 ? 180 : 90) : (sy > 0 ? -90 : 0)]), [sx * I, sy * I, -1])));
    const tiles: Manifold[] = [], wood = p.floor === 2;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if (wood && (i === 1 || i === 2)) continue;
      const x0 = -I + i * R.tile, y0 = -I + j * R.tile;
      tiles.push(K.hull([K.box([x0 + .5, y0 + .5, 0], [x0 + R.tile - .5, y0 + R.tile - .5, R.tileH - 1]), K.box([x0 + 1.5, y0 + 1.5, 0], [x0 + R.tile - 1.5, y0 + R.tile - 1.5, R.tileH])]));
    }
    const tileSolid = K.cut(K.union(tiles), notches);
    K.add(p.floor === 1 ? 'Smooth rubber tiles' : 'Crumb rubber tiles', tileSolid, 'liner', p.floor === 1 ? '#1e1f20' : '#4b4c4a', 0, .95);
    if (wood) {
      const cx = R.tile - .5;
      K.add('Plywood centre (2 × 3/4")', K.cut(K.box([-cx, -I + .5, 0], [cx, I - .5, R.tileH]), notches), 'source', '#d8bf93', 0, .72);
      K.add('ROGUE stencil plate', K.box([-340, -I + 150, R.tileH], [340, -I + 260, R.tileH + .4]), 'source', '#1c1c1c', 0, .8);
    }
  });
}
