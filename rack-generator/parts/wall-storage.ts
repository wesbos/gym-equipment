/** Wall-mounted barbell, plate and accessory storage: Manifold builders for the entries in ../wall-parts/wall-storage.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `wallDefinition(PART, build)` per entry.
 * Source axes: X along the wall, -Y out of the wall (d = -y), Z up; origin at the face centre on the wall surface. */
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec2, Vec3 } from '../types.ts';
import { wallDefinition } from '../wall-part.ts';
import { BAR } from '../floor-parts/barbell.ts';
import {
  IN, WC_SIZES, WC_COLORS, WC_DEPTH, WC_STEEL, WC_DOT, WC_SLOT, wallControlHoles, wallControlPanels, WALL_CONTROL,
  PRONG_PANEL, ROGUE_BELT_HANGER, ROGUE_MULTI_HANGER, type ProngSpec,
  gunRackRungs, gunRackLift, gunRackRest, ROGUE_V2_SPEC, ROGUE_3_SPEC, TITAN_6_SPEC, REP_GUN_SPECS, ROGUE_V2_GUN_RACK, ROGUE_3_GUN_RACK, TITAN_6_BAR_RACK, REP_GUN_RACK, type GunRackSpec,
  VBH, VBH_SIZES, vbhSeat, vbhShift, ROGUE_VERTICAL_BAR_HANGER,
  ROGUE_9_BAR_HOLDER, REP_9_BAR_STORAGE, nineBarFace, type NineBarSpec,
  REP_HORN, REP_HORN_LOADS, repHornPegs, REP_WALL_PLATE_STORAGE,
  TREE_LOADS, treePegs, treeStart, treeLayout, BOS_CHANGE_PLATE_PEGS, SDS_CHANGE_PLATE_STORAGE, type ChangeTreeSpec, type Peg,
  SWISS, swissBall, swissLayout, ROGUE_SWISS_BRACKETS, type StoredPlate,
} from '../wall-parts/wall-storage.ts';
import { kit, finish, olympicBar, plateStack, medBall, UHMW, type Kit, type Finish } from './wall-storage-kit.ts';
const steelFinish = (name: string, color: string, roughness: number, metalness = .3) => finish(name, 'source', color, metalness, roughness);
const ROGUE_BLACK = steelFinish('Rogue black matte textured steel', '#1c1d1f', .78);
const want = <T,>(v: T | undefined, what: string): T => { if (v === undefined) throw Error(`Unsupported ${what}.`); return v; };
/** Rounded rectangle section. */
const roundRect = (k: Kit, a: Vec2, b: Vec2, r: number) => k.offset(k.rect([a[0] + r, a[1] + r], [b[0] - r, b[1] - r]), r);

// ── Wall Control pegboard ────────────────────────────────────────────────────────────────────────────
export function buildWallControl(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const size = want(WC_SIZES[p.size], 'pegboard size'), color = want(WC_COLORS[p.color], 'pegboard colour');
  if (!(p.size === 2 ? [1, 2, 3] : [1, 2, 3, 4]).includes(p.panels)) throw Error('Unsupported pegboard panels side by side.');
  const steel = finish(`${color[0]} powder-coated 20 ga steel pegboard`, 'source', color[1], color[2], color[3]);
  return kit(api, k => {
    const W = size.w * IN, H = size.h * IN, d = WC_DEPTH, t = WC_STEEL, hem = IN / 2, { dots, slots, mounts } = wallControlHoles(size.w, size.h);
    const y = -d + t / 2;
    const dot = k.cyl(t + 2, WC_DOT / 2, 'y', [0, 0, 0], 6), slot = k.span([-WC_SLOT[0] / 2, -t, -WC_SLOT[1] / 2], [WC_SLOT[0] / 2, t, WC_SLOT[1] / 2]), mount = k.cyl(t + 2, 4.2, 'y', [0, 0, 0], 12);
    const holes = k.compose([...dots.map(([x, z]) => k.k(dot.translate([x, y, z]))), ...slots.map(([x, z]) => k.k(slot.translate([x, y, z]))), ...mounts.map(([x, z]) => k.k(mount.translate([x, y, z])))]);
    const face = k.cut(k.span([-W / 2, -d, -H / 2], [W / 2, -d + t, H / 2]), [holes]);
    // Formed 3/4″ returns on all four edges, each hemmed flat against the wall (the flush-with-wall mounting flange).
    const returns = [
      k.span([-W / 2, -d, -H / 2], [-W / 2 + t, 0, H / 2]), k.span([W / 2 - t, -d, -H / 2], [W / 2, 0, H / 2]),
      k.span([-W / 2, -d, H / 2 - t], [W / 2, 0, H / 2]), k.span([-W / 2, -d, -H / 2], [W / 2, 0, -H / 2 + t]),
      k.span([-W / 2 + t, -t, -H / 2 + t], [-W / 2 + hem, 0, H / 2 - t]), k.span([W / 2 - hem, -t, -H / 2 + t], [W / 2 - t, 0, H / 2 - t]),
      k.span([-W / 2 + hem, -t, H / 2 - hem], [W / 2 - hem, 0, H / 2 - t]), k.span([-W / 2 + hem, -t, -H / 2 + t], [W / 2 - hem, 0, -H / 2 + hem]),
    ];
    const panel = k.union([face, ...returns]), centres = wallControlPanels(p);
    k.add(steel, ...centres.map(cx => k.k(panel.translate([cx, 0, 0]))));
    // Pan-head mounting screws with washers through the corner and stud-line holes.
    for (const cx of centres) for (const [x, z] of mounts) k.add(ZINC_SCREW, k.cyl(1.2, 7.5, 'y', [cx + x, -d - .6, z], 20), k.cyl(2.6, 5.6, 'y', [cx + x, -d - 2.4, z], 16));
  });
}
const ZINC_SCREW = finish('Zinc mounting screws and washers', 'fastener', '#c3c6c8', .85, .3);

// ── Prong hangers (Rogue Belt & Band Hanger, Multi-Use Hanger) ─────────────────────────────────────────
const buildProngHanger = (spec: ProngSpec) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (![5, 8].includes(Math.round(p.depth / IN))) throw Error('Unsupported hanger prong depth.');
  return kit(api, k => {
    const { width: W, height: H, steel: t, holes, holeRise, hole } = PRONG_PANEL, L = p.depth, kick = 16, angle = 30 * Math.PI / 180;
    const bores = holes.flatMap(span => [-1, 1].flatMap(sx => [-1, 1].map(sz => k.circle([sx * span / 2, sz * holeRise / 2], hole / 2, 20))));
    k.add(ROGUE_BLACK, k.front(k.csCut(roundRect(k, [-W / 2, -H / 2], [W / 2, H / 2], 3), bores), t, 0));
    // Bottom edge folds out into the comb of flat prongs, each with a short upturned tip.
    const pitch = W / spec.prongs, straight = L - kick * Math.cos(angle);
    for (let i = 0; i < spec.prongs; i++) {
      const x = (i - (spec.prongs - 1) / 2) * pitch, a = x - spec.prongWidth / 2, b = x + spec.prongWidth / 2;
      const tip = k.k(k.k(k.span([a, -kick, 0], [b, 0, t]).rotate([-30, 0, 0])).translate([0, -straight, -H / 2]));
      k.add(ROGUE_BLACK, k.span([a, -straight, -H / 2], [b, 0, -H / 2 + t]), tip);
    }
    // Plain badge where the laser-cut ROGUE lettering is (no logo artwork).
    k.add(BADGE, k.span([-W * .27, -t - .6, -H * .16], [W * .27, -t, H * .3]));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.lag(sx * holes[0] / 2, sz * holeRise / 2, t, 7);
  });
};
const BADGE = finish('Logo cut-out badge', 'source', '#8d9093', .2, .55);

// ── Gun racks ─────────────────────────────────────────────────────────────────────────────────────────
/** Web profile (d, z): spine plus one cradle block per rung with its notch. */
function gunWeb(k: Kit, s: GunRackSpec) {
  const spine = k.rect([0, -s.height / 2], [s.spine, s.height / 2]), c = s.chamfer, D = s.depth;
  const rungs = gunRackRungs(s).map(nb => {
    const zb = nb - s.arm, top = nb + s.lip, R = s.notch;
    const block = k.poly([[0, zb - s.gusset], [D - c, zb], [D, zb + c], [D, top - c], [D - c, top], [0, top]]);
    return k.csCut(block, [k.circle([s.notchAt, nb + s.notch], R, 40), k.rect([s.notchAt - R, nb + s.notch], [s.notchAt + R, top + 5])]);
  });
  return { web: k.k(k.csUnion([spine, ...rungs]).intersect(k.rect([-1, -s.height / 2], [D + 1, s.height / 2]))), rungs: k.csUnion(rungs) };
}
const buildGunRack = (specOf: (p: NumericParams) => GunRackSpec, name: string) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const s = specOf(p), liners = s.liner !== 'insert' || p.liners === 1;
  if (!(p.loaded >= 0 && p.loaded <= s.rungs && Number.isInteger(p.loaded))) throw Error('Unsupported gun rack stored barbells.');
  const steel = steelFinish(`${name} black powder-coated brackets`, s.color, s.roughness);
  const liner = s.liner === 'lining' ? finish('Plastic cradle liners', 'liner', '#4a4d51', 0, .5) : UHMW;
  return kit(api, k => {
    const { web, rungs } = gunWeb(k, s), t = s.steel, F = s.flange, nbs = gunRackRungs(s);
    // Lag holes between cradles (clear of each arm's gusset) and near both ends.
    const holeZ = [s.height / 2 - 14, ...nbs.slice(0, -1).map((nb, i) => (nb - s.arm - s.gusset + nbs[i + 1] + s.lip) / 2), -s.height / 2 + 14];
    for (const cx of [-p.spacing / 2, p.spacing / 2]) {
      const webX = cx - F / 2;
      const bores = holeZ.map(z => k.circle([cx + t / 2, z], 4.8, 20));
      k.add(steel, k.front(k.csCut(k.rect([cx - F / 2, -s.height / 2], [cx + F / 2, s.height / 2]), bores), t, 0), k.side(web, t, webX));
      for (const z of holeZ) k.lag(cx + t / 2, z, t, 6);
      if (!liners) continue;
      const clear = k.rect([t + .5, -s.height / 2], [s.depth + 4, s.height / 2]);
      if (s.liner === 'insert') k.add(liner, k.side(k.k(k.offset(rungs, 2).intersect(clear)), s.linerThickness, webX + t));
      else if (s.liner === 'sandwich') { const plate = k.k(k.offset(web, 2).intersect(clear)); k.add(liner, k.side(plate, s.linerThickness, webX - s.linerThickness), k.side(plate, s.linerThickness, webX + t)); }
      else {
        const bands = nbs.map(nb => k.csCut(k.circle([s.notchAt, nb + s.notch], s.notch - .01, 40), [k.circle([s.notchAt, nb + s.notch], s.notch - 3, 40), k.rect([s.notchAt - s.notch - 4, nb + s.notch], [s.notchAt + s.notch + 4, nb + s.lip + 6])]));
        k.add(liner, k.side(k.csUnion(bands), t + 2, webX - 1));
      }
    }
    const rest = gunRackRest(p.spacing), lift = gunRackLift(s, liners);
    for (let i = 0; i < p.loaded; i++) olympicBar(k, [0, -s.notchAt, nbs[i] + lift + rest], [1, 0, 0], i % 2 === 1);
  });
};
export const buildRogueV2GunRack = buildGunRack(() => ROGUE_V2_SPEC, 'Rogue V2 Gun Rack');
export const buildRogue3GunRack = buildGunRack(() => ROGUE_3_SPEC, 'Rogue 3 Bar Gun Rack');
export const buildTitan6BarRack = buildGunRack(() => TITAN_6_SPEC, 'Titan 6 barbell rack');
export const buildRepGunRack = buildGunRack(p => want(REP_GUN_SPECS[p.size], 'gun rack size'), 'REP 6 ga gun rack');

// ── Rogue Vertical Bar Hanger ─────────────────────────────────────────────────────────────────────────
export function buildVerticalBarHanger(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const size = want(VBH_SIZES[p.size], 'bar hanger size');
  if (!(p.loaded >= 0 && p.loaded <= size.bars)) throw Error('Unsupported bar hanger hanging barbells.');
  return kit(api, k => {
    const L = size.length, D = VBH.depth, t = VBH.steel, w = VBH.slot, xs = Array.from({ length: size.bars }, (_, j) => (j - (size.bars - 1) / 2) * VBH.slotPitch), dz = vbhShift;
    const slotCuts = xs.flatMap(x => [k.rect([x - w / 2, -D - 1], [x + w / 2, -VBH.barAt]), k.circle([x, -VBH.barAt], w / 2, 32)]);
    const shelf = k.csCut(k.rect([-L / 2, -D], [L / 2, 0]), slotCuts);
    const bores = size.holes.flatMap(span => [-1, 1].flatMap(sx => (size.holeRise ? [-1, 1] : [0]).map(sz => k.circle([sx * span / 2, VBH.height * .62 + sz * size.holeRise / 2], 4.8, 20))));
    const flange = k.k(k.front(k.csCut(roundRect(k, [-L / 2, 0], [L / 2, VBH.height], 4), bores), t, 0).translate([0, 0, dz]));
    k.add(ROGUE_BLACK, flange, k.plan(shelf, t, dz));
    // UHMW layer the collar rests on (clear of the flange), and raised UHMW blocks on every prong tip.
    k.add(UHMW, k.plan(k.k(k.rect([-L / 2, -D], [L / 2, -t - .3]).subtract(k.csUnion(slotCuts))), VBH.uhmw, t + dz));
    const edges = [-L / 2, ...xs.flatMap(x => [x - w / 2, x + w / 2]), L / 2];
    for (let i = 0; i < edges.length; i += 2) k.add(UHMW, k.span([edges[i], -D, vbhSeat + dz], [edges[i + 1], -D + VBH.tip, vbhSeat + VBH.tip + dz]));
    for (const span of size.holes) for (const sx of [-1, 1]) for (const sz of size.holeRise ? [-1, 1] : [0]) k.lag(sx * span / 2, VBH.height * .62 + sz * size.holeRise / 2 + dz, t, 6);
    // Bars hang sleeve-up by the collar: collar underside on the UHMW seat.
    for (let i = 0; i < p.loaded; i++) olympicBar(k, [xs[i], -VBH.barAt, vbhSeat - BAR.shaftHalf + dz], [0, 0, 1], i % 2 === 1);
  });
}

// ── 9-bar vertical holders ────────────────────────────────────────────────────────────────────────────
const buildNineBar = (s: NineBarSpec, name: string) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (!(p.loaded >= 0 && p.loaded <= 9 && Number.isInteger(p.loaded))) throw Error('Unsupported bar holder stored barbells.');
  const steel = steelFinish(`${name} black 7 ga steel`, s.color, s.roughness), tube = steelFinish(`${name} DOM bar tubes`, s.color, s.roughness * .8, .4);
  return kit(api, k => {
    const S = s.size, t = s.steel, dz = -nineBarFace(s).height / 2;
    const centres: Vec2[] = [];
    for (const j of [-1, 0, 1]) for (const i of [-1, 0, 1]) centres.push([i * s.pitch, -S / 2 + j * s.pitch]);
    const top = k.plan(k.csCut(k.rect([-S / 2, -S], [S / 2, 0]), centres.map(c => k.circle(c, s.tubeOd / 2 - .2, 40))), t, s.top - t + dz);
    const wall = k.csCut(roundRect(k, [-S / 2, 0], [S / 2, s.top], 2), [k.rect([-S / 2 + 45, -1], [S / 2 - 45, 9])]);
    k.add(steel, top, k.k(k.front(wall, t, 0).translate([0, 0, dz])), k.k(k.front(wall, t, -S + t).translate([0, 0, dz])));
    k.add(steel, k.span([-S / 2, -S + t, s.base - t + dz], [S / 2, -t, s.base + dz]));
    for (const [x, y] of centres) {
      k.add(tube, k.cut(k.cyl(s.tubeTop - s.base, s.tubeOd / 2, 'z', [x, y, (s.tubeTop + s.base) / 2 + dz], 40), [k.cyl(s.tubeTop - s.base + 2, s.tubeId / 2, 'z', [x, y, (s.tubeTop + s.base) / 2 + dz], 40)]));
      if (s.liner) k.add(LINER_9, k.cut(k.cyl(s.tubeTop - s.base, s.tubeId / 2 - .05, 'z', [x, y, (s.tubeTop + s.base) / 2 + dz], 40), [k.cyl(s.tubeTop - s.base + 4, s.tubeId / 2 - 1.6, 'z', [x, y, (s.tubeTop + s.base) / 2 + dz], 40)]));
    }
    // Plain badge for the laser-cut logo on the room-facing wall.
    k.add(BADGE_DARK, k.span([-s.badge[0] / 2, -S - .8, s.top * .42 - s.badge[1] / 2 + dz], [s.badge[0] / 2, -S, s.top * .42 + s.badge[1] / 2 + dz]));
    // Bars stand sleeve-first on the lower sheet, front row first.
    for (let i = 0; i < p.loaded; i++) olympicBar(k, [centres[i][0], centres[i][1], s.base + BAR.length / 2 + dz], [0, 0, 1], i % 3 === 1);
  });
};
const LINER_9 = finish('Plastic tube liners', 'liner', '#3b3d40', 0, .5), BADGE_DARK = finish('Logo cut-out badge', 'source', '#0c0c0d', 0, .9);

// ── Plate horns and change-plate pegs ─────────────────────────────────────────────────────────────────
const PEG_BLACK = (name: string, color: string, roughness: number) => steelFinish(name, color, roughness, .35);
/** A welded peg along a tilted axis from the plate face at depth `face`, with an end cap. */
function peg(k: Kit, g: Peg, face: number, r: number, body: Finish, cap: Finish | null, capLength = 12) {
  const a = g.tilt * Math.PI / 180, axis: Vec3 = [0, -Math.cos(a), Math.sin(a)], at = (s: number): Vec3 => [g.x, -face + axis[1] * s, g.z + axis[2] * s];
  k.add(body, k.rod(at(-1), axis, g.length + 1 - (cap ? capLength : 0), r, 36), k.rod(at(-1), axis, 7, r + 3.5, 36));
  if (cap) k.add(cap, k.rod(at(g.length - capLength - .5), axis, capLength + .5, r + .8, 36));
  return { axis, at };
}
function loadPeg(k: Kit, g: Peg, face: number, start: number, plates: readonly StoredPlate[], name: string) {
  if (!plates.length) return;
  const a = g.tilt * Math.PI / 180, axis: Vec3 = [0, -Math.cos(a), Math.sin(a)];
  plateStack(k, plates, [g.x, -face + axis[1] * start, g.z + axis[2] * start], axis, name);
}
export function buildRepWallPlateStorage(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const pegs = repHornPegs(want([0, 1].includes(p.variant) ? p.variant : undefined, 'plate storage version')), load = want(REP_HORN_LOADS[p.loaded], 'plate storage stored plates');
  if (load.variant >= 0 && load.variant !== p.variant) throw Error('Unsupported plate storage stored plates.');
  const steel = PEG_BLACK('REP matte black powder-coated steel', '#232427', .7);
  return kit(api, k => {
    const [w, h] = REP_HORN.plate, t = REP_HORN.steel, r = REP_HORN.horn / 2;
    const bores = [-1, 1].flatMap(sz => [-1, 1].flatMap(sx => [0, 1].map(row => k.circle([sx * w * .22, sz * (h / 2 - 16 - row * 22)], 4.4, 20))));
    k.add(steel, k.front(k.csCut(roundRect(k, [-w / 2, -h / 2], [w / 2, h / 2], 5), bores), t, 0));
    for (const g of pegs) peg(k, g, t, r, steel, null);
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) k.lag(sx * w * .22, sz * (h / 2 - 16), t, 6);
    pegs.forEach((g, i) => loadPeg(k, g, t, REP_HORN.boss + .5, load.stacks[i] ?? [], `Stored plate ${i + 1}.`));
  });
}
const buildChangeTree = (s: ChangeTreeSpec, name: string) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  const load = want(TREE_LOADS[p.loaded], 'plate pegs stored plates'), manticore = p.version === 1, boltD = s.stopper ? (manticore ? IN : IN * .625) : (p.bolt === 1 ? IN * .625 : IN);
  if (s.stopper ? ![0, 1].includes(p.version) : ![0, 1].includes(p.bolt)) throw Error('Unsupported plate pegs rack version.');
  const steel = PEG_BLACK(`${name} black powder-coated steel`, s.color, s.roughness), caps = finish('Black peg end caps', 'liner', '#101112', 0, .6);
  return kit(api, k => {
    const { shift } = treeLayout(s), dz = shift, pad = manticore ? 3.2 : 0, t = s.steel, face = pad + t, pegs = treePegs(s).map(g => ({ ...g, z: g.z + dz }));
    const outline = k.csUnion([
      ...treePegs(s).map(g => k.circle([g.x, g.z], s.lobe, 40)),
      k.rect([-s.span / 2, -s.lobe * .6], [s.span / 2, s.top]),
      k.poly([[-s.span / 2, -s.lobe * .55], [s.span / 2, -s.lobe * .55], [s.stem / 2, -s.drop * .5], [-s.stem / 2, -s.drop * .5]]),
      k.rect([-s.stem / 2, -s.drop], [s.stem / 2, -s.lobe * .5]),
    ]);
    const bores = s.holes.map(z => k.circle([0, z], (s.stopper ? boltD : IN * .625) / 2 + .8, 24));
    k.add(steel, k.k(k.front(k.csCut(outline, bores), t, -pad).translate([0, 0, dz])));
    if (manticore) k.add(UHMW, k.k(k.front(k.rect([-IN * 1.5, -s.drop + s.lobe * .4], [IN * 1.5, s.top * .2]), pad, 0).translate([0, 0, dz])));
    // Storage tabs bent up and out along the top edge.
    for (const x of s.tabs) k.add(steel, k.k(k.k(k.span([x - 7.5, -2 * IN, -t], [x + 7.5, 0, 0]).rotate([-20, 0, 0])).translate([0, -face + t / 2, s.top + dz])));
    for (const g of pegs) peg(k, g, face, s.horn / 2, steel, caps);
    if (s.stopper && manticore) for (const g of pegs) k.add(RUBBER, k.cut(k.rod([g.x, -face, g.z], [0, -Math.cos(g.tilt * Math.PI / 180), Math.sin(g.tilt * Math.PI / 180)], 14, 36, 36), [k.rod([g.x, -face + 1, g.z], [0, -Math.cos(g.tilt * Math.PI / 180), Math.sin(g.tilt * Math.PI / 180)], 16, s.horn / 2 + .3, 36)]));
    for (const z of s.bolt) k.lag(0, z + dz, face, boltD * .62, 6);
    k.add(BADGE, k.span([-s.badge[0] / 2, -face - .6, s.badge[2] - s.badge[1] / 2 + dz], [s.badge[0] / 2, -face, s.badge[2] + s.badge[1] / 2 + dz]));
    pegs.forEach((g, i) => loadPeg(k, g, face, treeStart(s), load.stacks[i] ?? [], `Stored change plate ${i + 1}.`));
  });
};
const RUBBER = finish('Black rubber plate stoppers', 'liner', '#161718', 0, .9);

// ── Rogue Wall Mount Swiss Brackets ──────────────────────────────────────────────────────────────────
export function buildSwissBrackets(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(p.loaded >= 0 && p.loaded <= 4 && Number.isInteger(p.loaded))) throw Error('Unsupported ball shelf medicine balls.');
  const pipeFinish = steelFinish('Black shelving pipes', '#18191b', .55, .45), collar = finish('Zinc shaft collars', 'fastener', '#c2c5c7', .85, .28);
  return kit(api, k => {
    const t = SWISS.steel, F = SWISS.flange, dz = swissLayout().shift, axisZ = -SWISS.arm / 2 + dz;
    const web = k.csCut(k.csUnion([
      k.rect([0, -SWISS.arm], [SWISS.reach, 0]), k.rect([0, -SWISS.height], [42, 0]),
      k.poly([[0, -SWISS.height], [42, -SWISS.height], [160, -SWISS.arm], [0, -SWISS.arm]]),
    ]), [...SWISS.pipes.map(d => k.circle([d, -SWISS.arm / 2], SWISS.pipe / 2 + .8, 32)), k.circle([262, -SWISS.arm / 2], 11, 24), k.circle([62, -SWISS.arm * 1.2], 12, 24), k.circle([24, -SWISS.height + 58], 9, 20)]);
    for (const sx of [-1, 1]) {
      const cx = sx * p.spacing / 2, webX = sx > 0 ? cx + F / 2 - t : cx - F / 2;
      const bores = [-24, -SWISS.height + 24].map(z => k.circle([cx - sx * t / 2, z], 4.8, 20));
      k.add(ROGUE_BLACK, k.k(k.front(k.csCut(k.rect([cx - F / 2, -SWISS.height], [cx + F / 2, 0]), bores), t, 0).translate([0, 0, dz])), k.k(k.side(web, t, webX).translate([0, 0, dz])));
      for (const z of [-24, -SWISS.height + 24]) k.lag(cx - sx * t / 2, z + dz, t, 6);
      for (const d of SWISS.pipes) k.add(collar, k.cut(k.cyl(16, 22, 'x', [sx > 0 ? webX + t + 8.5 : webX - 8.5, -d, axisZ], 28), [k.cyl(18, SWISS.pipe / 2 + .2, 'x', [sx > 0 ? webX + t + 8.5 : webX - 8.5, -d, axisZ], 28)]));
    }
    for (const d of SWISS.pipes) k.add(pipeFinish, k.cyl(SWISS.pipeLength, SWISS.pipe / 2, 'x', [0, -d, axisZ], 28));
    const b = swissBall(), pitch = SWISS.ball + SWISS.gap;
    for (let i = 0; i < p.loaded; i++) medBall(k, [(i - (p.loaded - 1) / 2) * pitch, -b.d, b.z + dz], SWISS.ball);
  });
}

export const definitions: PartDefinition[] = [
  wallDefinition(WALL_CONTROL, buildWallControl),
  wallDefinition(ROGUE_BELT_HANGER, buildProngHanger(ROGUE_BELT_HANGER.spec)),
  wallDefinition(ROGUE_V2_GUN_RACK, buildRogueV2GunRack),
  wallDefinition(ROGUE_VERTICAL_BAR_HANGER, buildVerticalBarHanger),
  wallDefinition(ROGUE_9_BAR_HOLDER, buildNineBar(ROGUE_9_BAR_HOLDER.spec, 'Rogue 9 Bar Holder')),
  wallDefinition(ROGUE_3_GUN_RACK, buildRogue3GunRack),
  wallDefinition(REP_WALL_PLATE_STORAGE, buildRepWallPlateStorage),
  wallDefinition(TITAN_6_BAR_RACK, buildTitan6BarRack),
  wallDefinition(BOS_CHANGE_PLATE_PEGS, buildChangeTree(BOS_CHANGE_PLATE_PEGS.spec, 'Bells of Steel')),
  wallDefinition(REP_GUN_RACK, buildRepGunRack),
  wallDefinition(SDS_CHANGE_PLATE_STORAGE, buildChangeTree(SDS_CHANGE_PLATE_STORAGE.spec, 'Stray Dog Strength')),
  wallDefinition(ROGUE_MULTI_HANGER, buildProngHanger(ROGUE_MULTI_HANGER.spec)),
  wallDefinition(REP_9_BAR_STORAGE, buildNineBar(REP_9_BAR_STORAGE.spec, 'REP 9-Bar Storage')),
  wallDefinition(ROGUE_SWISS_BRACKETS, buildSwissBrackets),
];
