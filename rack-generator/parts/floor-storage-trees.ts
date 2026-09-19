/** Floor-storage builders: horn plate trees (Rogue / REP / Titan) and the Titan vertical barbell holder. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { Manifold } from 'manifold-3d';
import { BAR } from '../floor-parts/barbell.ts';
import {
  IN, PLATE_KINDS, hornLoad, rogueTreeSpec, REP_TREE, TITAN_TREE, treeBox, treeLift, type TreeSpec, type Paint,
  TITAN_HOLDER, TITAN_HOLDER_SIZES, titanHolderSleeves, PAINT,
} from '../floor-parts/floor-storage.ts';
import { kit, finish, beam, pipe, prism, bolt, caster, fitText, onFace, standingBar, hornPlates, type Kit, type Finish } from './floor-storage-kit.ts';
const coat = (p: Paint, what: string): Finish => finish(`${p.name} ${what}`, 'source', p.color, p.metalness, p.roughness);
const CAP = finish('Black plastic end caps', 'liner', '#121314', 0, .7);
const RUBBER = finish('Black rubber foot caps', 'liner', '#141516', 0, .85);
const CHROME_TIP = finish('Chrome horn sleeves', 'source', '#d9dde0', 1, .16);
const CASTER_STEEL = finish('Zinc-plated caster forks', 'fastener', '#b9bdc0', .85, .3), TYRE = finish('Black polyurethane caster wheels', 'liner', '#161718', 0, .6);
const want = (ok: boolean, what: string) => { if (!ok) throw Error(`Unsupported ${what}.`); };

// ── Horn trees ───────────────────────────────────────────────────────────────────────────────────────
export function buildTree(api: ManifoldAPI, s: TreeSpec, p: NumericParams, bars: boolean): SolidPart[] {
  want([0, 1, 2].includes(p.loaded) && p.plates in PLATE_KINDS && (!bars || [0, 1, 2].includes(p.bars)), 'plate tree setting');
  const frame = coat(s.paint, 'steel frame'), horns = coat(s.paint, 'plate horns');
  return kit(api, k => {
    const z0 = treeLift(s), [ux, uy] = s.upright, [fw, fh] = s.footSection, [sw, sh] = s.spineSection, box = treeBox(s);
    const alongX = s.feet === 'x', feetAt = s.spine / 2 - fw / 2, parts: Manifold[] = [];
    // H base: two feet with the spine between them, all on the frame datum.
    for (const side of [-1, 1]) {
      const c = side * feetAt, L = s.foot, capL = s.caster ? 0 : Math.min(32, L * .06);
      const foot = alongX ? k.span([-L / 2 + capL, c - fw / 2, z0], [L / 2 - capL, c + fw / 2, z0 + fh]) : k.span([c - fw / 2, -L / 2 + capL, z0], [c + fw / 2, L / 2 - capL, z0 + fh]);
      // Rogue feet carry a row of 1″ holes through their side faces; REP/Titan feet are plain.
      const holes = s.brand.text === 'ROGUE' ? [-4.5, -2.5, 2.5, 4.5, 6.5, -6.5, 8.5, -8.5].map(v => alongX ? k.cyl(fw + 2, IN / 2, 'y', [v * IN, c, z0 + fh / 2], 20) : k.cyl(fw + 2, IN / 2, 'x', [c, v * IN, z0 + fh / 2], 20)) : [];
      parts.push(k.cut(foot, holes));
      for (const end of [-1, 1]) {
        if (s.caster) caster(k, alongX ? end * (L / 2 - 38) : c, alongX ? c : end * (L / 2 - 38), z0, s.caster.wheel, { steel: CASTER_STEEL, tyre: TYRE }, alongX ? (end > 0 ? -1 : 1) : (c > 0 ? -1 : 1));
        else if (capL) {
          // Chamfered rubber end caps: full section at the tube, sloping down to the toe.
          const e = end * (L / 2 - capL), f = end * (L / 2 - .5), slab = (u: number, h: number) => alongX ? k.span([u - .5, c - fw / 2, z0], [u + .5, c + fw / 2, z0 + h]) : k.span([c - fw / 2, u - .5, z0], [c + fw / 2, u + .5, z0 + h]);
          k.add(RUBBER, k.k(k.api.Manifold.hull([slab(e + end * .5, fh + 1), slab(f, fh * .55)])));
        }
      }
    }
    const spine = alongX ? k.span([-sw / 2, -s.spine / 2 + fw, z0], [sw / 2, s.spine / 2 - fw, z0 + sh]) : k.span([-s.spine / 2 + fw, -sw / 2, z0], [s.spine / 2 - fw, sw / 2, z0 + sh]);
    parts.push(spine);
    // Upright with the Rogue hole column between the upper tiers (through its front/back faces).
    const top = z0 + s.height, base = z0 + sh, up = k.span([-ux / 2, -uy / 2, base], [ux / 2, uy / 2, top]);
    const holes = s.brand.text === 'ROGUE' ? Array.from({ length: 6 }, (_, i) => k.cyl(ux + 2, IN / 2, 'x', [0, 0, z0 + s.tiers[2] - (2.4 + 2 * i) * IN], 20)) : [];
    parts.push(k.cut(up, holes));
    k.add(frame, k.union(parts));
    // Triangle gusset plates on the two upright faces that sit over the spine, two bolts into the upright and two into the spine.
    const g = s.gusset, t = 6;
    for (const side of [-1, 1]) {
      if (alongX) {
        const x = side > 0 ? ux / 2 : -ux / 2 - t, tri: Vec2[] = [[-g.base / 2, base], [g.base / 2, base], [uy / 2, base + g.height], [-uy / 2, base + g.height]];
        k.add(frame, prism(k, tri, t, 'yz', x));
        const n: Vec3 = [side, 0, 0], fx = side * (ux / 2 + t);
        for (const [y, z] of [[0, base + g.height * .75], [0, base + g.height * .4], [-g.base * .32, base + 16], [g.base * .32, base + 16]]) bolt(k, [fx, y, z], n, 8);
      } else {
        const y = side > 0 ? uy / 2 + t : -uy / 2, tri: Vec2[] = [[-g.base / 2, base], [g.base / 2, base], [ux / 2, base + g.height], [-ux / 2, base + g.height]];
        k.add(frame, prism(k, tri, t, 'xz', y - t));
        const n: Vec3 = [0, side, 0], fy = side * (uy / 2 + t);
        for (const [x, z] of [[0, base + g.height * .8], [0, base + g.height * .45], [-g.base * .33, base + 16], [g.base * .33, base + 16]]) bolt(k, [x, fy, z], n, 8);
      }
    }
    // Bolts where the spine meets each foot.
    for (const side of [-1, 1]) for (const o of [-1, 1]) {
      const c = side * (feetAt - fw / 2);
      if (alongX) bolt(k, [o * (sw / 2 + 0), c, z0 + fh / 2], [o, 0, 0], 8); else bolt(k, [c, o * sw / 2, z0 + fh / 2], [0, o, 0], 8);
    }
    // Horns: one pipe through the upright per tier, collar at each face, end caps (chrome tips on REP).
    const r = s.hornD / 2, reach = ux / 2 + s.horn;
    for (const [tier, h] of s.tiers.entries()) {
      const z = z0 + h;
      k.add(horns, pipe(k, [-reach + 6, 0, z], [reach - 6, 0, z], r, 32));
      for (const side of [-1, 1]) {
        k.add(horns, k.cyl(8, r + 3, 'x', [side * (ux / 2 + 4), 0, z], 32));
        if (s.hornFinish === 'black-chrome-tip') k.add(CHROME_TIP, k.cyl(22, r + .4, 'x', [side * (reach - 17), 0, z], 32));
        k.add(CAP, k.cyl(6, r + .6, 'x', [side * (reach - 3), 0, z], 32));
        const plates = hornLoad(s.usable, tier, s.tiers.length, p.loaded, p.plates), root = ux / 2 + (s.horn - s.usable) - 4;
        hornPlates(k, plates, [side * root, 0, z], [side, 0, 0], s.hornD, `Horn ${tier + 1}${side > 0 ? 'R' : 'L'}`);
      }
    }
    // Vertical bar sleeves on the spine (front and back of the upright) with an optional standing bar in each.
    if (s.sleeves) for (const [i, side] of [-1, 1].entries()) {
      const y = side * s.sleeves.offset, zTop = base + s.sleeves.height;
      k.add(frame, k.cut(k.cyl(s.sleeves.height, s.sleeves.od / 2, 'z', [0, y, base + s.sleeves.height / 2], 40), [k.cyl(s.sleeves.height, s.sleeves.bore / 2, 'z', [0, y, base + s.sleeves.height / 2 + 4], 40)]));
      k.add(CAP, k.cut(k.cyl(3, s.sleeves.od / 2 + 1.5, 'z', [0, y, zTop - 1.5], 40), [k.cyl(5, s.sleeves.bore / 2, 'z', [0, y, zTop - 1.5], 40)]));
      if (bars && i < p.bars) standingBar(k, 0, y, base + 4, BAR.length, i === 1);
    }
    // Brand lettering: vertical on the upright's front face, or along the front foot.
    const ink = finish(`${s.brand.text} lettering`, 'source', s.brand.color, .1, .5);
    if (s.brand.on === 'upright') {
      const zc = z0 + (s.tiers[0] + s.tiers[1]) / 2;
      k.add(ink, onFace(k, fitText(k, s.brand.text, ux * .62, IN * 6.5, true), .6, [0, -uy / 2 + .55, zc], [1, 0, 0], [0, 0, 1]));
    } else {
      const c = -feetAt, h = fh * .5, len = Math.min(s.brand.text.length * h * .9, s.foot * .22);
      k.add(ink, onFace(k, fitText(k, s.brand.text, len, h), .6, [-s.foot * .28, c - fw / 2 + .55, z0 + fh / 2], [1, 0, 0], [0, 0, 1]));
    }
    // Sanity: stay inside the published envelope.
    void box;
  });
}
export const buildRogueTree = (api: ManifoldAPI, p: NumericParams) => { want([0, 1].includes(p.wheels), 'wheel option'); return buildTree(api, rogueTreeSpec(p), p, false); };
export const buildRepTree = (api: ManifoldAPI, p: NumericParams) => buildTree(api, REP_TREE, p, true);
export const buildTitanTree = (api: ManifoldAPI, p: NumericParams) => buildTree(api, TITAN_TREE, p, true);

// ── Titan Barbell Storage Holder ─────────────────────────────────────────────────────────────────────
export function buildTitanHolder(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const size = TITAN_HOLDER_SIZES[p.size]; want(!!size, 'barbell holder size');
  const sleeves = titanHolderSleeves(p); want(Number.isInteger(p.loaded) && p.loaded >= 0 && p.loaded <= sleeves.length, 'stored bar count');
  const steel = coat(PAINT.titanBlack, 'bent 9 ga cover'), plate = coat(PAINT.titanBlack, '3 ga base plate and tubes');
  const liner = finish('Black nylon sleeve inserts', 'liner', '#111213', 0, .5);
  return kit(api, k => {
    const S = size.side, H = TITAN_HOLDER.height, w = TITAN_HOLDER.wall, b = TITAN_HOLDER.base, [nw, nh] = TITAN_HOLDER.notch;
    k.add(plate, k.span([-S / 2 + w, -S / 2, 0], [S / 2 - w, S / 2, b]));
    // Cover: top sheet and two side walls (X faces), each wall with a foot notch and the cut TITAN lettering.
    const holes = sleeves.map(([x, y]) => k.cyl(w + 4, TITAN_HOLDER.tube / 2 + .5, 'z', [x, y, H - w / 2], 40));
    k.add(steel, k.cut(k.span([-S / 2, -S / 2, H - w], [S / 2, S / 2, H]), holes));
    for (const side of [-1, 1]) {
      const x0 = side > 0 ? S / 2 - w : -S / 2, wall = k.span([x0, -S / 2, 0], [x0 + w, S / 2, H - w + .01]);
      const notch = k.span([x0 - 1, -nw / 2, -1], [x0 + w + 1, nw / 2, nh]);
      // Lettering reads left to right seen from outside the wall: cut through it from 2 mm inside.
      const cut = onFace(k, fitText(k, 'TITAN', S * .5, H * .22), w + 4, [side > 0 ? x0 - 2 : x0 + w + 2, side * S * .06, H * .42], [0, side, 0], [0, 0, 1]);
      k.add(steel, k.cut(wall, [notch, cut]));
    }
    // Sleeve tubes from the base to the top, lined with flanged nylon inserts.
    for (const [x, y] of sleeves) {
      k.add(plate, k.cut(k.cyl(H - w - b, TITAN_HOLDER.tube / 2, 'z', [x, y, b + (H - w - b) / 2], 40), [k.cyl(H, TITAN_HOLDER.tube / 2 - 3.8, 'z', [x, y, H / 2 + b], 40)]));
      const rim = k.cyl(TITAN_HOLDER.rim, TITAN_HOLDER.rimD / 2, 'z', [x, y, H + TITAN_HOLDER.rim / 2 - .01], 40), sleeve = k.cyl(H * .6, TITAN_HOLDER.tube / 2 - 3.8, 'z', [x, y, H - H * .3], 40);
      k.add(liner, k.cut(k.union([rim, sleeve]), [k.cyl(H * 2, TITAN_HOLDER.bore / 2, 'z', [x, y, H], 40)]));
    }
    for (let i = 0; i < p.loaded; i++) standingBar(k, sleeves[i][0], sleeves[i][1], b, BAR.length, i % 2 === 1);
  });
}
