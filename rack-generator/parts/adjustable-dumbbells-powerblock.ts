/** PowerBlock Large Column Stand and Large Compact Stand builders. A loaded pair reuses buildPowerBlock at the model's
 * full weight (every plate on the pin), minus its floor cradle, with each selector-pin fork facing outboard. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { COLUMN_STAND as CS, COMPACT_STAND as KS, POWERBLOCK_COLUMN_STAND, POWERBLOCK_COMPACT_STAND } from '../floor-parts/adjustable-dumbbells-powerblock.ts';
import { POWERBLOCK_MODELS } from '../floor-parts/powerblock.ts';
import { buildPowerBlock } from './powerblock.ts';
import { builderParams, dumbbellKit, type DumbbellKit, type Mat } from './adjustable-dumbbells-kit.ts';
const SILVER: Mat = ['Brushed silver powder-coated steel', 'source', '#b8bbbe', .55, .38];
const MATS: Mat = ['Adhesive grip tray mats', 'liner', '#1f2021', 0, .95];
const INSERTS: Mat = ['Micro-weight holder inserts', 'liner', '#101112', 0, .8];
/** One PowerBlock at full weight, cradle removed, local frame: centred across X, front end at y = 0, plate bottoms at z = 0.
 * `outboard` −1 turns it half a turn so the pin fork faces −X. Parts are handed back as [material, solid] pairs. */
function powerBlockOnStand(api: ManifoldAPI, t: DumbbellKit, load: number, outboard: 1 | -1) {
  const model = load - 1, m = POWERBLOCK_MODELS[model];
  const parts = buildPowerBlock(api, { model, weight: m.max }).map(p => ({ ...p, solid: t.k(p.solid) }));
  const kept = parts.filter(p => p.name !== 'Floor cradle tray');
  const plates = kept.find(p => p.name.startsWith('Engaged plates'))!.solid.boundingBox();
  // The pin fork hangs below the plate bottoms at the lowest pin station; clip it where it would meet the tray.
  const clip = t.box([-1e4, -1e4, plates.min[2]], [1e4, 1e4, 1e4]);
  const solids = kept.map(p => ({ mat: [p.name, p.role, p.color ?? '#222', p.metalness ?? .3, p.roughness ?? .5] as Mat, solid: p.name === 'Magnetic selector pin' ? t.inter([p.solid, clip]) : p.solid }));
  const turned = solids.map(s => ({ ...s, solid: outboard > 0 ? s.solid : t.rot(s.solid, [0, 0, 180]) }));
  const all = turned.map(s => s.solid.boundingBox()), minY = Math.min(...all.map(b => b.min[1])), cx = (Math.min(...all.map(b => b.min[0])) + Math.max(...all.map(b => b.max[0]))) / 2;
  const width = Math.max(...all.map(b => b.max[0])) - Math.min(...all.map(b => b.min[0])), length = Math.max(...all.map(b => b.max[1])) - minY;
  return { width, length, parts: turned.map(s => ({ ...s, solid: t.move(s.solid, [-cx, -minY, -plates.min[2]]) })) };
}
/** Place a stand's pair beside the centre channel on a tray surface (local z = 0), `front` = local y of the front ends. */
function placePair(api: ManifoldAPI, t: DumbbellKit, load: number, channel: number, front: (length: number) => number, z: number, transform: (s: Manifold) => Manifold) {
  for (const side of [-1, 1] as const) {
    const unit = powerBlockOnStand(api, t, load, side);
    for (const p of unit.parts) t.add(p.mat, transform(t.move(p.solid, [side * (channel / 2 + 2 + unit.width / 2), front(unit.length), z])));
  }
}
/** Channel between the dumbbells: inverted U with four round holders for 2.5 lb micro weights. */
function channel(t: DumbbellKit, width: number, rise: number, depth: number, holes: number[], mat: Mat) {
  const body = t.cut(t.box([-width / 2, -depth / 2, 0], [width / 2, depth / 2, rise]), [t.box([-width / 2 + 2, -depth / 2 - 1, -1], [width / 2 - 2, depth / 2 + 1, rise - 2]), ...holes.map(y => t.cylZ(rise - 3, rise + 1, 0, y, width * .6, 32))]);
  const cups = holes.map(y => t.cut(t.cylZ(rise - 30, rise, 0, y, width * .6 + 1, 32), [t.cylZ(rise - 27, rise + 2, 0, y, width * .6 - 5, 32)]));
  return { body, cups, mat };
}
export function buildColumnStand(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  builderParams(POWERBLOCK_COLUMN_STAND, p);
  const t = dumbbellKit(api), D = CS.trayDepth, W = CS.trayWidth, tilt = CS.tilt, rad = tilt * Math.PI / 180;
  const column: Mat = p.finish ? ['Black powder-coated steel column', 'source', '#151618', .35, .3] : ['Brushed silver steel column', 'source', '#b8bbbe', .55, .38];
  // Tray plane through the centre at height zc, rising toward the back (+Y); the channel's back top edge sets the 28" height.
  const backTop = D / 2 * Math.sin(rad) + CS.channelRise * Math.cos(rad), zc = CS.height - backTop;
  const tray = (s: Manifold) => t.move(t.rot(s, [tilt, 0, 0]), [0, 0, zc]);
  return t.finish('PowerBlock column stand', () => {
    const r = 40;
    t.add(['Molded black base', 'liner', '#17181a', .05, .75], t.hull([t.extrudeZ(t.rrect(CS.width, CS.depth, r), 0, CS.base - 8), t.extrudeZ(t.rrect(CS.width - 14, CS.depth - 14, r - 7), 0, CS.base)]));
    const [cw, cd] = CS.column, above = tray(t.box([-1e3, -1e3, -2], [1e3, 1e3, 1e3]));
    t.add(column, t.cut(t.box([-cw / 2, -cd / 2, CS.base - 1], [cw / 2, cd / 2, zc + 60]), [above]));
    // Corner fold lines and base screws on the column.
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) t.add(['Stand hardware', 'fastener', '#2a2b2d', .7, .35], t.cylY(sy > 0 ? cd / 2 : -cd / 2 - 1.5, sy > 0 ? cd / 2 + 1.5 : -cd / 2, sx * (cw / 2 - 12), CS.base + 18, 8, 12));
    t.add(p.finish ? ['PowerBlock badge · red', 'source', '#b3262d', .1, .5] : ['PowerBlock badge · black', 'source', '#161718', .1, .5], t.box([-55, -cd / 2 - 1.5, zc - 170], [55, -cd / 2, zc - 138]));
    t.add(['PowerBlock badge lettering', 'source', '#e6e6e3', .1, .5], t.box([-40, -cd / 2 - 2, zc - 158], [40, -cd / 2 - 1.5, zc - 150]));
    // Tray: 2 mm plate, upturned front lip, short turned-down back and side edges, grip mats either side of the channel.
    const plate = t.union([t.box([-W / 2, -D / 2, -2], [W / 2, D / 2, 0]), t.box([-W / 2, -D / 2, 0], [W / 2, -D / 2 + 2, CS.lip]), t.box([-W / 2, D / 2 - 2, -14], [W / 2, D / 2, 0]),
      ...[-1, 1].map(s => t.box([s > 0 ? W / 2 - 2 : -W / 2, -D / 2, -10], [s > 0 ? W / 2 : -W / 2 + 2, D / 2, 0]))]);
    t.add(SILVER, tray(plate));
    for (const s of [-1, 1]) t.add(MATS, tray(t.box([s > 0 ? CS.channel / 2 + 4 : -W / 2 + 6, -D / 2 + 6, 0], [s > 0 ? W / 2 - 6 : -CS.channel / 2 - 4, D / 2 - 6, 1.5])));
    const ch = channel(t, CS.channel, CS.channelRise, D, [-150, -95, -40, 15], SILVER);
    t.add(SILVER, tray(ch.body)); t.add(INSERTS, ...ch.cups.map(tray));
    if (p.load) placePair(api, t, p.load, CS.channel, () => -D / 2 + 3, 1.5, tray);
  }, { turn: false });
}
/** Tube between two points (for the folding legs). */
const tube = (t: DumbbellKit, a: Vec3, b: Vec3, d: number) => {
  const v = b.map((x, i) => x - a[i]) as Vec3, len = Math.hypot(...v);
  const pitch = Math.acos(v[2] / len) * 180 / Math.PI, yaw = Math.atan2(v[1], v[0]) * 180 / Math.PI;
  return t.move(t.rot(t.cylZ(0, len, 0, 0, d, 20), [0, pitch, yaw]), a);
};
export function buildCompactStand(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  builderParams(POWERBLOCK_COMPACT_STAND, p);
  const t = dumbbellKit(api), W = KS.width, D = KS.trayDepth, top = KS.height - KS.channelRise, d = KS.tube;
  const BLACK: Mat = ['Black powder-coated steel', 'source', '#18191b', .35, .45], FEET: Mat = ['Rubber feet', 'liner', '#0f1011', 0, .85];
  const at = (s: Manifold) => t.move(s, [0, 0, top]);
  return t.finish('PowerBlock compact stand', () => {
    // Lipped tray (lips on the left/right edges), hinge rails underneath, grip mats and the centre channel.
    t.add(BLACK, at(t.union([t.box([-W / 2, -D / 2, -2], [W / 2, D / 2, 0]), ...[-1, 1].map(s => t.box([s > 0 ? W / 2 - 2 : -W / 2, -D / 2, 0], [s > 0 ? W / 2 : -W / 2 + 2, D / 2, KS.lip]))])));
    for (const s of [-1, 1]) t.add(MATS, at(t.box([s > 0 ? KS.channel / 2 + 4 : -W / 2 + 6, -D / 2 + 6, 0], [s > 0 ? W / 2 - 6 : -KS.channel / 2 - 4, D / 2 - 6, 1.5])));
    const ch = channel(t, KS.channel, KS.channelRise, D, [-150, -100, -50, 0], BLACK);
    t.add(BLACK, at(ch.body)); t.add(INSERTS, ...ch.cups.map(at));
    for (const y of [-1, 1]) t.add(BLACK, t.box([-W / 2 + 30, y * 150 - 12, top - 26], [W / 2 - 30, y * 150 + 12, top - 2]));
    // Two scissor frames (front and back): each leg drops nearly straight from the hinge rail, then kinks out to the far foot.
    const footX = W / 2 - 18, footY = KS.depth / 2 - (d + 8) / 2, legTop = top - 26 - d / 2 + 4, kneeX = 118, kneeZ = legTop - 110, footZ = 28;
    /** Point on leg `s` (the one landing at x = s·footX) at height z, below the knee. */
    const legX = (s: number, z: number) => { const u = (kneeZ - z) / (kneeZ - footZ); return -s * kneeX + u * s * (footX + kneeX); };
    const crossZ = kneeZ - (kneeZ - footZ) * kneeX / (footX + kneeX);
    for (const y of [-1, 1]) {
      for (const s of [-1, 1]) {
        const yy = y * 150 + s * 14, a: Vec3 = [-s * 150, yy, legTop], knee: Vec3 = [-s * kneeX, yy + y * 8, kneeZ], foot: Vec3 = [s * footX, y * footY, footZ];
        t.add(BLACK, tube(t, a, knee, d), tube(t, knee, foot, d), t.cylX(-s * 150 - 14, -s * 150 + 14, yy, legTop, d + 2, 20));
        t.add(FEET, t.cylZ(0, 36, s * footX, y * footY, d + 8, 20));
      }
      // Scissor pivot where the two legs of a frame cross.
      t.add(['Pivot bolts', 'fastener', '#9ea2a6', .85, .3], t.cylY(y * 150 - 34, y * 150 + 34, 0, crossZ, 12, 14));
    }
    // Low tie bars front-to-back between the scissor frames, near the feet.
    for (const s of [-1, 1]) t.add(BLACK, t.cylY(-footY + 20, footY - 20, legX(s, 118), 118, 19, 16));
    if (p.load) placePair(api, t, p.load, KS.channel, length => -length / 2, top + 1.5, s => s);
  }, { turn: false });
}
export const definitions: PartDefinition[] = [floorDefinition(POWERBLOCK_COLUMN_STAND, buildColumnStand), floorDefinition(POWERBLOCK_COMPACT_STAND, buildCompactStand)];
