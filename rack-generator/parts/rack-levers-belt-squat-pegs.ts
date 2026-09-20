/** Builders for the #135 band pegs, plate storage pins, wrist roller and rack hoop (metadata in
 * ../rack-parts/rack-levers-belt-squat-pegs.ts). Source frame (rack-part.ts): origin on the upright centreline at the
 * target hole, +Y out of the mounting face (face at y = upright / 2), X across the face, Z up. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildPlateStack } from './plates.ts';
import { buildKit, CHROME, POWDER_BLACK, RUBBER, STAINLESS, UHMW, ZINC, type Finish, type Kit } from './rack-levers-belt-squat-kit.ts';
import {
  IRON3, iron3Colour, iron3Layout, JD_WRIST_ROLLER, ML_PEG, mlPegProud, MONSTER_PIN, monsterPinLoadable, monsterPinRoot, OAK_CLUB_IRON_3, REP_BAND_PEGS_2, REP_PEG,
  repPegSeries, ROGUE_MONSTER_LITE_BAND_PEG, ROGUE_MONSTER_PLATE_STORAGE_PIN, ROGUE_SP3358_PLATE_STORAGE, SP_POST, spPostZ, spRoot, spStations, spVersion, storageLoad,
  crankGripDiameter, WRIST_ROLLER, wristMount, wristRollerEnd,
} from '../rack-parts/rack-levers-belt-squat-pegs.ts';
const Y: Vec3 = [0, 1, 0], NY: Vec3 = [0, -1, 0];
const ACETAL: Finish = { color: '#141414', metalness: 0, roughness: .45, role: 'liner' };
const MATTE_BLACK: Finish = { color: '#1b1c1e', metalness: .35, roughness: .7 };
/** Cast/forged hex head along `axis` from `a`, flats top and bottom, with the washer-face chamfer on the corners. */
function hexHead(g: Kit, a: Vec3, axis: Vec3, length: number, acrossFlats: number) {
  const R = acrossFlats / Math.sqrt(3);
  const hex = g.prism(a, axis, length, R, 6, [1, 0, 0]);
  const crown = g.revolve([[0, 0], [R - .8, 0], [R, .8], [R, length - R * .18], [R - R * .18, length], [0, length]], a, axis, 48);
  return g.k(hex.intersect(crown));
}
/** Plate stack on a storage post; the solids join the build as returned parts. */
function storePlates(api: ManifoldAPI, g: Kit, load: number, origin: Vec3) {
  const plates = storageLoad(load).plates;
  if (plates.length) g.parts.push(...buildPlateStack(api, plates, { origin, axis: Y, name: 'Stored plate', segments: 72, detail: 'simple' }));
}

// ---------------------------------------------------------------- Rogue Monster Lite / Infinity band peg
export function buildMonsterLitePeg(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_LITE_BAND_PEG.defaults, ...params }, f = (p.upright ?? 75) / 2;
  if (![0, 1].includes(p.finish)) throw Error('Unsupported band peg finish.');
  const fin: Finish = p.finish ? { color: '#1d1e20', metalness: .45, roughness: .6 } : ZINC;
  return buildKit(api, g => {
    // 5/8-inch rod through the upright: rounded tip proud of the mounting face, hex head bearing on the far face.
    g.add('Band peg 5/8 in rod', g.rod([0, -f - .01, 0], [0, f + mlPegProud(p), 0], ML_PEG.rod / 2, 0, 1.4, 32), fin);
    const head = hexHead(g, [0, -f, 0], NY, ML_PEG.head, ML_PEG.hexAcrossFlats);
    // Stamped R badge: a shallow disc recess on the head face.
    g.add('Hex head (stamped R, USA)', g.cut(head, [g.rod([0, -f - ML_PEG.head - 1, 0], [0, -f - ML_PEG.head + .5, 0], 7, 0, 0, 24)]), fin);
  });
}

// ---------------------------------------------------------------- REP Band Pegs 2.0
export function buildRepPeg(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_BAND_PEGS_2.defaults, ...params }, s = repPegSeries(p), f = (p.upright ?? 75) / 2, r = s.rod / 2;
  return buildKit(api, g => {
    const bottom = f - REP_PEG.insert, y1 = f + REP_PEG.washer + REP_PEG.usable, pinY = bottom + 4.5;
    // Solid chrome rod from the cotter end, through the upright, to the flat head disc (with its turned flare).
    const rod = g.rod([0, bottom, 0], [0, y1, 0], r, 1.2, 0, 32);
    g.add('Chrome solid steel peg', g.cut(rod, [g.rod([-r - 2, pinY, 0], [r + 2, pinY, 0], 1.6, 0, 0, 12)]), CHROME);
    const h = s.headDiameter / 2, t = REP_PEG.head;
    g.add('Flat head disc', g.revolve([[0, 0], [r, 0], [r + 2.5, t * .15], [h - 1, t * .45], [h, t * .55], [h, t - .8], [h - .8, t], [0, t]], [0, y1 - .01, 0], Y, 48), CHROME);
    // Welded stop washer on the mounting face, with its weld bead.
    const w = s.washerDiameter / 2;
    g.add('Welded stop washer', g.revolve([[r - .1, 0], [w - .6, 0], [w, .6], [w, REP_PEG.washer - .6], [w - .6, REP_PEG.washer], [r - .1, REP_PEG.washer]], [0, f, 0], Y, 48), CHROME);
    g.add('Washer weld bead', g.ring([0, f + REP_PEG.washer + .4, 0], Y, r + .4, 1.6, 32), { color: '#9da1a4', metalness: .8, roughness: .45 });
    // R-clip (hairpin cotter): straight leg through the rod behind the far face and its bowed outer leg around it.
    const wire = 1.3, reach = r + 9;
    g.add('Hairpin cotter pin', g.union([
      g.rod([-reach, pinY, 0], [reach, pinY, 0], wire, 0, .6, 12),
      g.ring([0, pinY - 2.2, 0], Y, r + 2.4, wire, 32, 200),
      g.ring([reach + 2.5, pinY, 0], [0, 0, 1], 2.5, wire, 16, 180),
    ]), ZINC);
  });
}

// ---------------------------------------------------------------- Rogue Monster Plate Storage Pin
export function buildMonsterStoragePin(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_PLATE_STORAGE_PIN.defaults, ...params }, f = (p.upright ?? 75) / 2, P = MONSTER_PIN;
  if (![0, 1].includes(p.style) || ![0, 1].includes(p.rear)) throw Error('Unsupported storage pin option.');
  return buildKit(api, g => {
    const root = monsterPinRoot(p), end = root + monsterPinLoadable(p), rearFace = -f - P.washer, rearLen = p.rear ? P.knobThick : P.nut;
    // 1-inch threaded pin from behind the nut, through the upright, into the sheath.
    g.add('1 in threaded pin', g.rod([0, rearFace - rearLen - P.stub, 0], [0, root + 10, 0], P.rod / 2, 1.5, 0, 32), MATTE_BLACK);
    // Acetal washers sandwich the upright.
    for (const [y, dir] of [[f, Y], [-f, NY]] as const) g.add('Acetal washer', g.revolve([[P.rod / 2 + .3, 0], [P.washerDiameter / 2, 0], [P.washerDiameter / 2, P.washer], [P.rod / 2 + .3, P.washer]], [0, y, 0], dir, 48), ACETAL);
    // Machined shoulder collar (keyhole nub under it on the keyhole style), then the Acetal sheath with its end bolt.
    const collar = g.revolve([[0, 0], [P.collarDiameter / 2, 0], [P.collarDiameter / 2, P.collar - 1.2], [P.collarDiameter / 2 - 1.2, P.collar], [0, P.collar]], [0, f + P.washer, 0], Y, 64);
    g.add('Machined shoulder collar', p.style === 0 ? g.union([collar, g.box([-3.2, f - 4, -P.rod / 2 - 5], [3.2, f + P.washer + 1, -P.rod / 2 + 2])]) : collar, MATTE_BLACK);
    const sheath = g.revolve([[P.rod / 2 + .5, 0], [P.sheath / 2, 0], [P.sheath / 2, end - root - 3], [P.sheath / 2 - 3, end - root], [9, end - root], [9, end - root - 4], [P.rod / 2 + .5, end - root - 4]], [0, root, 0], Y, 64);
    g.add('Machined Acetal sheath', sheath, ACETAL);
    g.add('Sheath end bolt', g.rod([0, end - 5, 0], [0, end - 1.5, 0], 8.5, 0, .8, 24), MATTE_BLACK);
    if (p.rear) {
      // Monster Knurled Knob: 2.125 in machined knob with an Acetal insert against the upright.
      g.add('Knob Acetal insert', g.rod([0, rearFace - 3, 0], [0, rearFace, 0], P.knob / 2 - 4, 0, 0, 48), ACETAL);
      g.add('Monster Knurled Knob', g.rod([0, rearFace - P.knobThick, 0], [0, rearFace - 3, 0], P.knob / 2, 1.5, .8, 48), { color: '#2b2c2f', metalness: .65, roughness: .5 });
    } else g.add('Machined nut', hexHead(g, [0, rearFace, 0], NY, P.nut, P.nutAcrossFlats), MATTE_BLACK);
    storePlates(api, g, p.load, [0, root + 1, 0]);
  });
}

// ---------------------------------------------------------------- Rogue SP3358 / SP33100 / SP2358 plate storage
export function buildSpPlateStorage(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_SP3358_PLATE_STORAGE.defaults, ...params }, v = spVersion(p), f = (p.upright ?? 75) / 2, pitch = p.mountSpacing ?? 50;
  return buildKit(api, g => {
    const S = spStations(p), z = spPostZ(p), t = SP_POST.plateThick, m = SP_POST.plateMargin, root = spRoot(p), end = root + v.loadable;
    // Face plate spanning both bolts, rounded corners.
    g.add('Mounting plate', g.plateXZ(g.roundRect(SP_POST.plateWidth, S * pitch + 2 * m, 6, 0, z), f, t), POWDER_BLACK);
    // Through-bolts: zinc hex heads on the plate, washers and nuts on the far face.
    for (const bz of [0, -S * pitch]) {
      const b = v.bolt, af = b * 1.5;
      g.add('Through bolt', g.rod([0, -f - b * .9 - 6, bz], [0, f + t, bz], b / 2, 1, 0, 24), ZINC);
      g.add('Bolt head', hexHead(g, [0, f + t, bz], Y, b * .62, af), ZINC);
      g.add('Bolt washer', g.rod([0, -f - 2.5, bz], [0, -f, bz], b * .95, 0, 0, 32), ZINC);
      g.add('Nut', hexHead(g, [0, -f - 2.5, bz], NY, b * .85, af), ZINC);
    }
    // Zinc spacer washer, the black 1.9 in post and its flat rubber end cap.
    g.add('Spacer washer', g.rod([0, f + t, z], [0, root, z], SP_POST.washer / 2, 0, .8, 48), ZINC);
    g.add('Storage post', g.rod([0, root - .5, z], [0, end, z], SP_POST.post / 2, 0, 0, 48), { color: '#202123', metalness: .3, roughness: .6 });
    g.add('Rubber end cap', g.rod([0, end, z], [0, end + SP_POST.cap, z], SP_POST.post / 2 + .8, 0, 3, 48), RUBBER);
    storePlates(api, g, p.load, [0, root + 1, z]);
  });
}

// ---------------------------------------------------------------- JD Gym Equipped wrist roller
export function buildWristRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...JD_WRIST_ROLLER.defaults, ...params }, m = wristMount(p), f = (p.upright ?? 75) / 2, W = WRIST_ROLLER;
  if (![0, 1].includes(p.finish) || ![0, 1, 2].includes(p.crank)) throw Error('Unsupported wrist roller option.');
  const grip: Finish = p.finish ? { color: '#b4b8bb', metalness: .85, roughness: .55 } : { color: '#dfe2e4', metalness: .95, roughness: .12 };
  return buildKit(api, g => {
    const y0 = f + W.washer, y1 = wristRollerEnd(p), R = W.diameter / 2, s0 = y0 + W.spool[0], s1 = y0 + W.spool[1], sr = W.spoolDiameter / 2;
    // Stainless axle through the upright, a retaining collar behind the far face.
    g.add('Stainless axle', g.rod([0, -f - 16, 0], [0, y1 + W.endCap + (p.crank ? -2 : W.stub), 0], m.axle / 2, 1, 1, 32), STAINLESS);
    g.add('Rear retaining collar', g.rod([0, -f - 14, 0], [0, -f, 0], Math.max(m.axle / 2 + 7, 17), .8, .8, 32), STAINLESS);
    g.add('Delrin face washer', g.rod([0, f, 0], [0, y0, 0], R - 2, 0, 0, 48), UHMW);
    // 2-inch grip either side of the turned-down cord spool.
    g.add(p.finish ? 'Knurled stainless grip' : 'Polished stainless grip', g.union([g.rod([0, y0, 0], [0, s0, 0], R, 1, 1.2, 48), g.rod([0, s1, 0], [0, y1, 0], R, 1.2, 1, 48)]), grip);
    g.add('Cord spool', g.rod([0, s0 - .5, 0], [0, s1 + .5, 0], sr, 0, 0, 48), STAINLESS);
    // Paracord coils on the spool and the line dropping to the stainless carabiner.
    const cord: Finish = { color: '#2e3033', metalness: 0, roughness: .9 }, cr = 2.4, coils = Math.floor((s1 - s0) / (2 * cr + .2));
    g.add('Paracord line', g.union([
      ...Array.from({ length: coils }, (_, i) => g.ring([0, s0 + cr + .1 + i * (2 * cr + .2), 0], Y, sr + cr + .4, cr, 32)),
      g.rod([0, s0 + (s1 - s0) / 2, -sr - cr], [0, s0 + (s1 - s0) / 2, -sr - W.cordDrop], cr, 0, 0, 12),
    ]), cord);
    const cy = s0 + (s1 - s0) / 2, cz = -sr - W.cordDrop - 22;
    g.add('Stainless carabiner', g.move(g.k(g.ring([0, 0, 0], [1, 0, 0], 11, 2.4, 24).scale([1, 1, 1.8])), [0, cy, cz]), STAINLESS);
    // End: black Delrin ring and stainless end cap with the axle stub.
    g.add('Delrin end ring', g.rod([0, y1, 0], [0, y1 + 3, 0], R - 1, 0, 0, 48), UHMW);
    g.add('Stainless end cap', g.rod([0, y1 + 3, 0], [0, y1 + W.endCap, 0], R - 3, 0, 1, 48), STAINLESS);
    if (p.crank) {
      // Supination/pronation crank: flat bar down from the end cap, out along the roller axis, and an upright grip.
      const [bw, bt] = W.bar, yc = y1 + W.endCap, drop = W.crankDrop, gy = yc + bt + W.crankReach, gr = crankGripDiameter(p) / 2;
      g.add('Crank flat bar', g.union([
        g.box([-bw / 2, yc, -drop - bw / 2], [bw / 2, yc + bt, 14]),
        g.box([-bw / 2, yc, -drop - bw / 2], [bw / 2, gy, -drop + bw / 2]),
      ]), STAINLESS);
      g.add('Crank grip', g.rod([0, gy, -drop - 12.7], [0, gy, -drop - 12.7 + W.crankGrip], gr, 1.2, 1.2, 40), grip);
    }
  });
}

// ---------------------------------------------------------------- Oak Club Mfg The Iron 3 mini hoop
/** Slot as a thin rectangle polygon from (x0, z0) to (x1, z1) with width w (axis-aligned). */
const slot = (x0: number, z0: number, x1: number, z1: number, w = 5): Vec2[] => {
  const [a, b] = [Math.min(x0, x1) - (x0 === x1 ? w / 2 : 0), Math.max(x0, x1) + (x0 === x1 ? w / 2 : 0)], [c, d] = [Math.min(z0, z1) - (z0 === z1 ? w / 2 : 0), Math.max(z0, z1) + (z0 === z1 ? w / 2 : 0)];
  return [[a, c], [b, c], [b, d], [a, d]];
};
const circle = (cx: number, cz: number, r: number, n = 20): Vec2[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), cz + r * Math.sin(2 * Math.PI * i / n)] as Vec2);
export function buildIron3(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...OAK_CLUB_IRON_3.defaults, ...params }, c = iron3Colour(p), L = iron3Layout(p), f = L.f;
  if (![0, 1].includes(p.hardware)) throw Error('Unsupported hoop pin.');
  const paint: Finish = { color: c.color, metalness: .2, roughness: c.roughness };
  return buildKit(api, g => {
    const [W, H] = IRON3.board, b = L.bottom, x0 = -W / 2, x1 = W / 2, t = b + H, e = 21;
    // Backboard: rounded plate with the laser-cut playing-card border, shooter square, Q and club.
    const cuts: Vec2[][] = [
      slot(x0 + 62, t - e, x1 - 120, t - e), slot(x1 - 105, t - e, x1 - e - 8, t - e),
      slot(x1 - e, t - e - 10, x1 - e, b + 95), slot(x1 - e, b + 78, x1 - e, b + e + 12), slot(x1 - e - 12, b + e, x1 - 120, b + e),
      slot(x0 + e, t - 110, x0 + e, b + 60),
      // Shooter square: four straight slots with gaps at the corners.
      slot(-80, b + 185, 80, b + 185), slot(-80, b + 38, -30, b + 38), slot(30, b + 38, 80, b + 38), slot(-94, b + 52, -94, b + 171), slot(94, b + 52, 94, b + 171),
      // Q: stadium ring (outer and inner as separate even-odd loops) with its tail.
      g.roundRect(22, 34, 10.5, x0 + e + 3, t - 34), g.roundRect(11, 22, 5, x0 + e + 3, t - 34), slot(x0 + e + 3, t - 55, x0 + e + 3, t - 46, 4),
      // Club suit: three lobes and a stem.
      circle(x0 + e + 3, t - 64, 5.2), circle(x0 + e - 3.2, t - 72, 5.2), circle(x0 + e + 9.2, t - 72, 5.2), [[x0 + e + 1, t - 72], [x0 + e + 5, t - 72], [x0 + e + 8, t - 84], [x0 + e - 2, t - 84]],
    ];
    const outline = g.roundRect(W, H, IRON3.corner, 0, b + H / 2, 8);
    const cs = g.k(new g.C([outline, ...cuts], 'EvenOdd'));
    const board = g.k(g.k(cs.extrude(IRON3.thick)).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, L.front, 0, 1]));
    g.add('Laser-cut steel backboard', board, paint);
    // Wrap bracket: plate on the far face with the pin holes, a leg round the post side, welded to the board back.
    const k: Finish = { color: '#18191b', metalness: .25, roughness: .8 }, bt = 5, bz0 = -58, bz1 = 32;
    const rear = g.cut(g.box([-f - bt, -f - bt, bz0], [f * .55, -f, bz1]), [
      g.rod([0, -f - bt - 1, 0], [0, -f + 1, 0], 13, 0, 0, 24), g.rod([0, -f - bt - 1, -30], [0, -f + 1, -30], 8.5, 0, 0, 20), g.rod([0, -f - bt - 1, 22], [0, -f + 1, 22], 8.5, 0, 0, 20),
    ]);
    g.add('Wrap mounting bracket', g.union([rear, g.box([-f - bt, -f - bt, bz0], [-f, L.back, bz1]), g.box([-f - bt, L.back - bt, bz0], [-f + 30, L.back, bz1])]), k);
    // MagPin: chrome pin through the post (rounded end proud of the bracket) with its magnetic head behind the board.
    const pinR = p.hardware ? 7.8 : 12.4;
    g.add('MagPin', g.rod([0, -f - bt - 22, 0], [0, f + 2, 0], pinR, pinR * .8, 0, 32), CHROME);
    g.add('MagPin magnetic head', g.rod([0, f, 0], [0, L.back - 2, 0], 16, 0, 1.5, 32), { color: '#202124', metalness: .5, roughness: .5 });
    // Rim bracket under the board with the two breakaway springs, and the 9 in rim.
    const rz = L.rimZ;
    g.add('Rim bracket', g.union([g.box([-45, L.front, rz - 55], [45, L.front + 5, rz + 2]), g.box([-38, L.front, rz - 4], [38, L.front + IRON3.rimGap + 8, rz + 2])]), k);
    g.add('Breakaway springs', g.union([-18, 18].map(x => g.rod([x, L.front + 14, rz + 2], [x, L.front + 14, rz + 20], 4, 0, 0, 16))), ZINC);
    g.add('9 in mini rim', g.ring([0, L.rimY, rz], [0, 0, 1], L.rimR, IRON3.rimRod / 2, 64), { color: '#141416', metalness: .5, roughness: .4 });
    // Net: diamond-knotted cord from 12 rim hooks to a narrower bottom ring.
    const n = 16, rows = [[1, 0], [.84, .38], [.72, .72], [.64, 1]] as const, pt = (ring: number, i: number): Vec3 => {
      const [k, d] = rows[ring], rad = L.rimR * k, a = 2 * Math.PI * i / n;
      return [rad * Math.cos(a), L.rimY + rad * Math.sin(a), rz - d * IRON3.net];
    };
    const strands: Manifold[] = [];
    // Diamond mesh: each band zig-zags between hook positions and the half-steps of the band below.
    for (let r = 0; r < 3; r++) for (let i = 0; i < n; i++) {
      const o = r % 2 ? .5 : 0;
      strands.push(g.rod(pt(r, i + o), pt(r + 1, i + o + .5), 1.2, 0, 0, 6), g.rod(pt(r, i + o + 1), pt(r + 1, i + o + .5), 1.2, 0, 0, 6));
    }
    g.add('Mini hoop net', g.union(strands), { color: '#101012', metalness: 0, roughness: .9 });
  });
}

