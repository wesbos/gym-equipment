/** Brand J-cup builders (#133). Source frame (rack-part.ts): origin on the upright centreline at the pin axis, +Y out
 * of the mounting face (y = upright / 2), X across the face, Z up. Profiles come from rack-parts/rack-jcups-safeties-cups.ts. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildWith, FINISH, faceOf, widthOf, type Finish, type Kit } from './rack-jcups-safeties-kit.ts';
import {
  GHOST, GHOST_FINISHES, ghostLayout, REP_SANDWICH, repSandwichLayout, ROGUE_CUP, rogueCupLayout,
  BOS_CUP, BOS_ROLLER, IRWIN_CUP, IRWIN_COLORS, IRWIN_DIP, TITAN_CUP, TITAN_DIP, rollerLayout, type RollerCup,
  GHOST_ROLLER_J_CUP, REP_FLAT_SANDWICH_J_CUPS, ROGUE_MONSTER_LITE_J_CUPS, ROGUE_MONSTER_SANDWICH_J_CUP, BOS_ROLLER_J_CUPS, IRWIN_RETURN_ROLLER_J_CUPS, TITAN_ROLLER_J_HOOKS,
} from '../rack-parts/rack-jcups-safeties-cups.ts';

const shift = (pts: readonly (readonly [number, number])[], dy: number, dz: number): Vec2[] => pts.map(([y, z]) => [y + dy, z + dz]);
const colored = (hex: string, gloss = true): Finish => ({ color: hex, metalness: gloss ? .45 : .2, roughness: gloss ? .38 : .82 });
/** Mounting pin along -Y into the hole with a chamfered tip; `y1` is where it meets the part. */
function mountPin(k: Kit, f: number, r: number, behind: number, y1: number) {
  return k.revolve([[0, 0], [r - 1.5, 0], [r, 1.5], [r, behind + (y1 - f)], [0, behind + (y1 - f)]], [0, f - behind, 0], 'y', 32);
}
/** Flat socket-head screw on a face whose outward normal is `dir`. */
function socketScrew(k: Kit, at: Vec3, dir: 'x' | '-x' | 'y' | 'z', r = 5) {
  const head = k.revolve([[0, 0], [r, 0], [r, 1.2], [r - .8, 2], [0, 2]], [0, 0, 0], 'z', 20);
  const hex = k.k(k.k(k.M.cylinder(2.2, r * .45, r * .45, 6)).translate([0, 0, .5]));
  const s = k.minus(head, hex), rot: Record<string, Vec3> = { z: [0, 0, 0], y: [-90, 0, 0], x: [0, 90, 0], '-x': [0, -90, 0] };
  return k.k(k.k(s.rotate(rot[dir])).translate(at));
}

export function buildGhostRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...GHOST_ROLLER_J_CUP.defaults, ...params }, f = faceOf(p), wu = widthOf(p) / 2, g = GHOST, L = ghostLayout();
  const tone = GHOST_FINISHES[p.color]; if (!tone || ![0, 1].includes(p.pin) || ![0, 1].includes(p.roller)) throw Error('Unsupported Ghost Roller J-Cup option.');
  const z = (v: number) => v - L.pinZ, W = g.width / 2, t = g.plate;
  return buildWith(api, k => {
    const steel = p.color === 0 ? colored(tone[1], false) : colored(tone[1]);
    const back0 = f + g.backLiner, backFront = back0 + t, lipBack = f + L.lipY + g.lipLiner, reachY = f + L.reach, claspX = wu + .6;
    // One formed 3/8 in channel: back plate, floor and front lip, plus the branded clasp plate welded on the -X side.
    const back = k.rbox([-W, back0, z(g.floorDrop)], [W, backFront, z(L.height)], 10, 'y');
    const floor = k.box([-(claspX + t), back0, z(0)], [W, reachY, z(t)]);
    const lip = k.rbox([-W, lipBack, z(0)], [W, reachY, z(g.lipTop)], 6, 'y');
    const clasp = k.rbox([-(claspX + t), f - g.claspBack, z(0)], [-claspX, reachY, z(g.claspTop)], 8, 'x');
    k.put('Formed 3/8 in steel channel and clasp', k.union([back, floor, lip, clasp]), steel);
    // UHMW: back pad against the upright (pin passes through), face with the skull engraving, lip liner.
    const pinR = p.pin ? 12.4 : 7.9;
    k.put('UHMW back pad', k.minus(k.box([-W + 2, f, z(g.floorDrop + 12)], [W - 2, back0, z(L.height - 6)]), k.rod([0, f - 1, 0], [0, back0 + 1, 0], pinR + .4, 32)), FINISH.uhmw, 'liner');
    k.put('UHMW face liner', k.rbox([-W + 3, backFront, z(t + 2)], [W - 3, backFront + g.faceLiner, z(L.height - 4)], 6, 'y'), FINISH.uhmw, 'liner');
    k.put('Engraved skull mark', k.rbox([-15, backFront + g.faceLiner, z(L.height - 150)], [15, backFront + g.faceLiner + .5, z(L.height - 105)], 12, 'y'), { color: '#2d2e31', metalness: 0, roughness: .6 }, 'liner');
    k.put('UHMW lip liner', k.box([-W + 3, f + L.lipY, z(t + 1)], [W - 3, lipBack, z(g.lipTop - 3)]), FINISH.uhmw, 'liner');
    // Conical return roller on an axle between the back face liner and the lip liner.
    const rollerY = backFront + g.faceLiner + 1.5, rz = z(g.floorDrop + g.rollerZ);
    const rollerFinish = p.roller ? { color: '#8e9296', metalness: .8, roughness: .5 } : { color: '#141517', metalness: .05, roughness: .5 };
    k.put(p.roller ? 'Silicon carbide coated steel roller' : 'Composite roller', k.revolve(g.roller, [0, rollerY, rz], 'y', 48), rollerFinish, 'handle');
    k.put('Roller axle bolt', k.hexHead([0, reachY, rz], 'y', 16, 6), FINISH.stainless, 'fastener');
    // Flat white Ghost Strong print on the clasp's outer face (no artwork: a plain plate).
    k.put('Ghost Strong branding plate', k.box([-(claspX + t) - .4, f + 8, z(14)], [-(claspX + t), f + 68, z(36)]), { color: '#e8e8e6', metalness: 0, roughness: .6 });
    // Welded pin: texture black with the black finish, stainless with the colour finishes.
    k.put(p.pin ? '1 in welded pin' : '5/8 in welded pin', mountPin(k, f, pinR, g.pinBehind, back0), p.color === 0 ? FINISH.texBlack : FINISH.stainless, 'rod');
  });
}

export function buildRepSandwich(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_FLAT_SANDWICH_J_CUPS.defaults, ...params }, f = faceOf(p), wu = widthOf(p) / 2, r = REP_SANDWICH, L = repSandwichLayout(p);
  const prof = r.profiles[p.version]; if (!prof || ![0, 1].includes(p.series)) throw Error('Unsupported REP Flat Sandwich J-Cup option.');
  const pts = shift(prof, f, -L.pinZ), c = r.core / 2, o = c + r.liner, z = (v: number) => v - L.pinZ;
  return buildWith(api, k => {
    k.put('Laser-cut steel core', k.prism(pts, -c, c, 'x'), FINISH.gloss);
    k.put('Textured plastic liners', k.union([k.prism(pts, c, o, 'x', 1.5), k.prism(pts, -o, -c, 'x', 1.5)]), FINISH.texBlack, 'liner');
    // Recessed logo side plates: metallic black on the 2.0, brushed stainless on the 1.0; logo window in the other tone.
    const inset = k.k(k.k(new k.C([pts])).offset(-5, 'Round', 16));
    const insetPlate = (x0: number, x1: number) => k.k(k.k(k.k(inset.extrude(x1 - x0)).translate([0, 0, x0])).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]));
    const sideTone = p.version ? { color: '#b9bcbe', metalness: .85, roughness: .35 } : FINISH.gloss, logoTone = p.version ? FINISH.gloss : FINISH.stainless;
    k.put(p.version ? 'Brushed stainless logo plates' : 'Metallic black logo plates', k.union([insetPlate(o, o + r.inset), insetPlate(-o - r.inset, -o)]), sideTone);
    const win = (s: number) => k.rbox([s > 0 ? o + r.inset : -o - r.inset - .4, f + 62, z(10)], [s > 0 ? o + r.inset + .4 : -o - r.inset, f + 112, z(27)], 3, 'x');
    k.put('REP logo window', k.union([win(1), win(-1)]), logoTone);
    const screwAt: [number, number][] = [[24, 160], [58, 20], [132, 40]];
    k.put(p.version ? 'Hex socket screws' : 'Stainless hex bolts', k.union(screwAt.flatMap(([y, zz]) => [socketScrew(k, [o + r.inset, f + y, z(zz)], 'x', 5), socketScrew(k, [-o - r.inset, f + y, z(zz)], '-x', 5)])),
      p.version ? FINISH.gloss : FINISH.stainless, 'fastener');
    // U-wrap bracket hugging the front and both sides of the upright at the bottom of the cup.
    const t = r.wrapT, wx = wu + .6;
    k.put('Formed U-wrap', k.union([k.box([-(wx + t), f, z(0)], [wx + t, f + 5, z(r.wrapTop)]), k.rbox([wx, f - r.wrapBack, z(0)], [wx + t, f + 5, z(r.wrapTop)], 5, 'x'), k.rbox([-(wx + t), f - r.wrapBack, z(0)], [-wx, f + 5, z(r.wrapTop)], 5, 'x')]), FINISH.gloss);
    k.put(p.series ? '1 in mounting pin' : '5/8 in mounting pin', mountPin(k, f, p.series ? 12.4 : 7.9, r.pinBehind, f), FINISH.gloss, 'rod');
  });
}

/** Rogue bent standard cup outline: back plate, bend, floor and a 40° lip of 3/8 in plate. */
function bentOutline(h: number, floorEnd: number, lipY: number, lipZ: number, t: number): Vec2[] {
  const dy = lipY - floorEnd, dz = lipZ, l = Math.hypot(dy, dz), d = [dy / l, dz / l], n = [-d[1], d[0]];
  const tip2: Vec2 = [lipY + n[0] * t, lipZ + n[1] * t], s = (t - n[1] * t) / d[1], base2: Vec2 = [floorEnd + n[0] * t + s * d[0], t];
  return [[0, h], [0, 9], [9, 0], [floorEnd, 0], [lipY, lipZ], tip2, base2, [t + 6, t], [t, t + 6], [t, h]];
}
export function buildRogueCup(api: ManifoldAPI, params: NumericParams, line: 0 | 1): SolidPart[] {
  const def = line ? ROGUE_MONSTER_SANDWICH_J_CUP : ROGUE_MONSTER_LITE_J_CUPS, p = { ...def.defaults, ...params };
  if (![0, 1].includes(p.style)) throw Error('Unsupported Rogue J-Cup style.');
  const sandwich = line ? p.style !== 1 : p.style === 1, L = rogueCupLayout(line, sandwich), c = ROGUE_CUP, t = c.plate;
  const f = faceOf(p), wu = widthOf(p) / 2, z = (v: number) => v - L.pinZ, pinR = line ? 12.4 : 7.9, cx = wu + .6;
  return buildWith(api, k => {
    const steel = FINISH.black, parts: Manifold[] = [];
    if (sandwich) {
      const pts = shift(c.sandwich, f, -L.pinZ), inner = c.core / 2;
      parts.push(k.prism(pts, inner, inner + t, 'x', 1), k.prism(pts, -inner - t, -inner, 'x', 1));
      parts.push(k.box([-(inner + t), f + c.backPad, z(0)], [inner + t, f + 12.5, z(254)]));
      // Swing-in clasp: web from the cup edge to the upright corner, then back along the +X side face.
      parts.push(k.box([inner + t - .5, f + c.backPad, z(c.sandwichClasp[0])], [cx + t, f + 12.5, z(c.sandwichClasp[1])]));
      parts.push(k.rbox([cx, f - c.claspBack, z(c.sandwichClasp[0])], [cx + t, f + 12.5, z(c.sandwichClasp[1])], 6, 'x'));
      k.put('3/8 in laser-cut side plates, back plate and clasp', k.union(parts), steel);
      const core = k.k(k.k(new k.C([pts])).offset(2.5, 'Round', 16)), clip = k.k(k.k(k.C.square([400, 254 + 2])).translate([f + 12.6, z(0)]));
      const coreSec = k.k(core.intersect(clip)), coreSolid = k.k(k.k(k.k(coreSec.extrude(2 * inner)).translate([0, 0, -inner])).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]));
      k.put('UHMW sandwich core', coreSolid, FINISH.uhmw, 'liner');
      k.put('UHMW back pad', k.minus(k.box([-(inner + t), f, z(8)], [inner + t, f + c.backPad, z(246)]), k.rod([0, f - 1, 0], [0, f + c.backPad + 1, 0], pinR + .4)), FINISH.uhmw, 'liner');
      k.put('Clasp rubber strip', k.box([cx - .6, f - c.claspBack + 6, z(c.sandwichClasp[0] + 6)], [cx, f - 4, z(c.sandwichClasp[1] - 6)]), { color: '#0e0e0f', metalness: 0, roughness: .9 }, 'liner');
      const screws: [number, number][] = [[29, 210], [29, 110], [72, 40], [138, 68]];
      k.put('Button head screws', k.union(screws.flatMap(([y, zz]) => [socketScrew(k, [inner + t, f + y, z(zz)], 'x', 5.5), socketScrew(k, [-inner - t, f + y, z(zz)], '-x', 5.5)])), FINISH.black, 'fastener');
      k.put(line ? '1 in mounting pin' : '5/8 in mounting pin', mountPin(k, f, pinR, 80, f + c.backPad), FINISH.blackZinc, 'rod');
    } else {
      const s = c.standard[line], off = line ? c.backPad : 0, W = 38.1;
      const pts = shift(bentOutline(s.height, s.floorEnd, s.lipY - off, s.lipZ, t), f + off, -L.pinZ);
      const cup = k.k(k.prism(pts, -W, W, 'x').intersect(k.rbox([-W, f - 1, z(-1)], [W, f + s.lipY + 5, z(s.height)], 9, 'y')));
      parts.push(cup, k.rbox([cx, f - c.claspBack, z(s.clasp[0])], [cx + t, f + off + t, z(s.clasp[1])], 6, 'x'), k.box([W - .5, f + off, z(s.clasp[0])], [cx + t, f + off + t, z(s.clasp[1])]));
      k.put('Laser-cut, bent 3/8 in plate and clasp', k.union(parts), steel);
      const pad = 6.35, y0 = f + off + t;
      k.put('UHMW face insert', k.rbox([-32, y0, z(t + 20)], [32, y0 + pad, z(s.height - 12)], 5, 'y'), FINISH.uhmw, 'liner');
      k.put('UHMW floor pad', k.rbox([-32, y0 + pad + 2, z(t)], [32, f + s.floorEnd - 6, z(t + pad)], 5, 'z'), FINISH.uhmw, 'liner');
      if (off) k.put('UHMW back pad', k.minus(k.box([-W + 2, f, z(10)], [W - 2, f + off, z(s.height - 8)]), k.rod([0, f - 1, 0], [0, f + off + 1, 0], pinR + .4)), FINISH.uhmw, 'liner');
      k.put('Insert screws', k.union([[-24, s.height - 22], [24, s.height - 22], [-24, t + 32], [24, t + 32]].map(([x, zz]) => socketScrew(k, [x, y0 + pad, z(zz)], 'y', 4))), FINISH.black, 'fastener');
      k.put(line ? '1 in mounting pin' : '5/8 in mounting pin', mountPin(k, f, pinR, 80, f + off), FINISH.blackZinc, 'rod');
    }
  });
}

/** Revolved roller along +Y: flat (small end chamfers) or center-return (concave dip at mid length). */
function roller(k: Kit, y0: number, len: number, r: number, zc: number, dip: number) {
  const prof: Vec2[] = [[0, 0], [r - 2, 0], [r, 2]];
  if (dip) for (let i = 1; i < 12; i++) { const t = i / 12, d = dip * Math.sin(Math.PI * t) ** 2; prof.push([r - d, 2 + (len - 4) * t]); }
  prof.push([r, len - 2], [r - 2, len], [0, len]);
  return k.revolve(prof, [0, y0, zc], 'y', 48);
}
interface RollerStyle { steel: Finish; roller: Finish; dip: number; claspSides: (1 | -1)[]; band: boolean; lipPad: boolean; gusset: boolean; knobAt?: 'band' | 'side'; logo: string }
function buildRollerCup(api: ManifoldAPI, p: NumericParams, c: RollerCup, s: RollerStyle, pinR: number): SolidPart[] {
  const f = faceOf(p), wu = widthOf(p) / 2, L = rollerLayout(c, s.dip), z = (v: number) => v - L.pinZ, pitch = p.mountSpacing ?? 50;
  const W = c.backW / 2, CW = c.channelW / 2, floorY = f + L.floorY, lipY = f + L.lipY, cx = wu + .6, t = c.clasp.t;
  return buildWith(api, k => {
    const parts: Manifold[] = [];
    parts.push(k.rbox([-W, f, z(0)], [W, f + c.backT, z(c.backH)], 8, 'y'));
    const fz = c.floorZ, ft = fz + c.floorT;
    parts.push(k.box([-CW, f + c.backT - .5, z(fz)], [CW, lipY + c.lipT, z(ft)]));
    const lean = c.lipLean ?? 0;
    parts.push(lean ? k.prism([[lipY, z(fz)], [lipY + c.lipT, z(fz)], [lipY + c.lipT + lean, z(c.lipH)], [lipY + lean, z(c.lipH)]], -CW, CW, 'x') : k.rbox([-CW, lipY, z(fz)], [CW, lipY + c.lipT, z(c.lipH)], 5, 'y'));
    for (const side of s.claspSides) {
      const x0 = side > 0 ? cx : -cx - t, x1 = x0 + t;
      parts.push(k.rbox([x0, f - c.clasp.back, z(c.clasp.z0)], [x1, f + c.backT, z(c.clasp.z1)], 5, 'x'));
      // Web from the back plate to the clasp wall across the face.
      parts.push(k.box([side > 0 ? W - .5 : -cx - t, f, z(c.clasp.z0)], [side > 0 ? cx + t : -W + .5, f + c.backT, z(c.clasp.z1)]));
      if (!s.band && side > 0 && CW < cx) parts.push(k.box([CW - .5, f + c.backT - .5, z(fz)], [cx + t, lipY + c.lipT, z(ft)]));
    }
    if (s.band) parts.push(k.box([-cx - t, f - c.clasp.back, z(c.clasp.z0)], [cx + t, f - c.clasp.back + t, z(c.clasp.z1)]));
    if (s.gusset) for (const side of [1, -1]) {
      const x0 = side > 0 ? CW - 6 : -CW, g: Vec2[] = [[f + c.backT - .5, z(fz + .5)], [lipY + c.lipT, z(fz + .5)], [f + c.backT - .5, z(0)]];
      parts.push(k.prism(g, x0, x0 + 6, 'x'));
    }
    k.put('Steel back plate, channel and clasp', k.union(parts), s.steel);
    k.put('UHMW face liner', k.rbox([-W + 3, f + c.backT, z(ft + 1)], [W - 3, f + c.backT + c.faceLiner, z(c.backH - 5)], 6, 'y'), FINISH.uhmw, 'liner');
    k.put('Lip liner cap', k.box([-CW + 2, lipY - 5 + lean, z(c.lipH - 4)], [CW - 2, lipY + c.lipT + lean + (s.lipPad ? 6 : 1), z(c.lipH + 4)]), FINISH.uhmw, 'liner');
    if (s.lipPad) k.put('UHMW lip pad', k.rbox([-CW + 2, lipY + c.lipT, z(ft)], [CW - 2, lipY + c.lipT + 6, z(c.lipH - 4)], 5, 'y'), FINISH.uhmw, 'liner');
    k.put('Logo mark', k.rbox([-W + 10, f + c.backT + c.faceLiner, z(c.backH - 115)], [W - 10, f + c.backT + c.faceLiner + .5, z(c.backH - 45)], 4, 'y'), { color: s.logo, metalness: 0, roughness: .6 }, 'liner');
    const rz = z(c.rollerZ), ry = floorY + 1, len = lipY - 1 - ry;
    k.put(s.dip ? 'Center return roller' : 'Flat roller', roller(k, ry, len, c.rollerR, rz, s.dip), s.roller, 'handle');
    k.put('Roller axle bolt', k.hexHead([0, lipY + c.lipT + (s.lipPad ? 6 : 0), rz], 'y', 14, 5), FINISH.zinc, 'fastener');
    k.put(pinR > 10 ? '1 in mounting pin' : '5/8 in mounting pin', mountPin(k, f, pinR, 80, f), FINISH.blackZinc, 'rod');
    if (s.knobAt) {
      // Locking pop-pin: behind the upright through the back band (Titan), or through the side clasp (BoS mag pin).
      const kz = -3 * pitch;
      if (s.knobAt === 'band') {
        const yb = f - c.clasp.back;
        k.put('16 mm pop-pin', k.rod([0, yb + t + 12, kz], [0, yb - 10, kz], 8, 24), FINISH.zinc, 'rod');
        k.put('Locking pop-pin knob', k.revolve([[0, 0], [22, 0], [30, 5], [30, 30], [26, 36], [0, 36]], [0, yb - 46, kz], 'y', 36), { color: '#141416', metalness: .1, roughness: .55 }, 'handle');
      } else {
        const xs = cx + t;
        k.put('Magnetic lock pin', k.rod([xs - t - 12, f - 38, kz], [xs + 4, f - 38, kz], 8, 24), FINISH.zinc, 'rod');
        k.put('Knurled mag pin knob', k.revolve([[0, 0], [16, 0], [18, 2], [18, 20], [16, 22], [0, 22]], [xs + 4, f - 38, kz], 'x', 36), FINISH.zinc, 'handle');
      }
    }
  });
}
export function buildBosRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BOS_ROLLER_J_CUPS.defaults, ...params }, v = BOS_ROLLER[p.version]; if (!v) throw Error('Unsupported Bells of Steel roller J-cup version.');
  return buildRollerCup(api, p, BOS_CUP, { steel: FINISH.black, roller: { color: v.roller, metalness: 0, roughness: .45 }, dip: 0, claspSides: [1], band: false, lipPad: true, gusset: false, knobAt: v.magPin ? 'side' : undefined, logo: '#3a3b3e' }, v.pin > 20 ? 12.4 : 7.9);
}
export function buildIrwinRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...IRWIN_RETURN_ROLLER_J_CUPS.defaults, ...params }, tone = IRWIN_COLORS[p.color];
  if (!tone || ![0, 1, 2, 3].includes(p.roller) || ![0, 1].includes(p.pin)) throw Error('Unsupported Irwin roller J-cup option.');
  const steelRoller = p.roller >= 2, dip = p.roller % 2 === 0 ? IRWIN_DIP : 0;
  return buildRollerCup(api, p, IRWIN_CUP, { steel: colored(tone[1]), roller: steelRoller ? { color: '#c9ccce', metalness: .9, roughness: .25 } : { color: '#161618', metalness: 0, roughness: .45 }, dip, claspSides: [1, -1], band: true, lipPad: false, gusset: true, logo: '#2a2b2e' }, p.pin ? 12.4 : 7.9);
}
export function buildTitanRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...TITAN_ROLLER_J_HOOKS.defaults, ...params }; if (![0, 1].includes(p.series)) throw Error('Unsupported Titan roller J-hook series.');
  return buildRollerCup(api, p, TITAN_CUP, { steel: FINISH.texBlack, roller: { color: '#131315', metalness: 0, roughness: .5 }, dip: TITAN_DIP, claspSides: [1, -1], band: true, lipPad: false, gusset: true, knobAt: 'band', logo: '#2a2b2e' }, 7.9);
}
