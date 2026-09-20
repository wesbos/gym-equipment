/** Floor-storage builders for the Yes4All vertical barbell holder and the CAP A-frame plate racks (RK-2A / RK-2BB).
 * Floor axes: X across, Y depth (-Y front), Z up; origin on the floor at the footprint centre. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import type { Manifold } from 'manifold-3d';
import { BAR } from '../floor-parts/barbell.ts';
import { PLATE_BORE, PLATE_GAP, PLATE_SPECS, type PlateId } from '../plates.ts';
import { YES4ALL_HOLDER, yes4allSleeves, capAFrame, aFrameLegX, aFramePegRoot, type AFrameSpec } from '../floor-parts/floor-storage.ts';
import { kit, finish, beam, fitText, onFace, standingBar, hornPlates, type Kit } from './floor-storage-kit.ts';
const want = (ok: boolean, what: string) => { if (!ok) throw Error(`Unsupported ${what}.`); };

// ── Yes4All Deluxe Vertical Barbell Holder ─────────────────────────────────────────────────────────────
export function buildYes4AllHolder(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const Y = YES4ALL_HOLDER, sleeves = yes4allSleeves();
  want(Number.isInteger(p.loaded) && p.loaded >= 0 && p.loaded <= sleeves.length, 'stored bar count');
  const steel = finish('Matte black powder-coated steel', 'source', '#1c1d1f', .25, .7), liner = finish('Black plastic bar liners', 'liner', '#111213', 0, .5);
  return kit(api, k => {
    const S = Y.side, B = Y.box, t = Y.sheet, b = Y.base, top = Y.top, [nw, nh] = Y.notch;
    // Base tray: 12″ plate with upturned lips along the two open ends.
    k.add(steel, k.span([-S / 2, -S / 2, 0], [S / 2, S / 2, b]));
    for (const s of [-1, 1]) k.add(steel, k.span([-B / 2 + t, s * S / 2 - (s > 0 ? t : 0), b], [B / 2 - t, s * S / 2 + (s > 0 ? 0 : t), b + Y.lip]));
    // Shell: top plate and two side walls (±X), each wall with a centred foot notch and the cut-through logo.
    k.add(steel, k.cut(k.span([-B / 2, -B / 2, top - t], [B / 2, B / 2, top]), sleeves.map(([x, y]) => k.cyl(t + 4, Y.tube / 2 + .5, 'z', [x, y, top - t / 2], 40))));
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? B / 2 - t : -B / 2, wall = k.span([x0, -B / 2, b], [x0 + t, B / 2, top - t + .01]);
      const notch = k.span([x0 - 1, -nw / 2, b - 1], [x0 + t + 1, nw / 2, b + nh]);
      const logo = onFace(k, fitText(k, 'Yes4All', B * .75, (top - b) * .42), t + 4, [s > 0 ? x0 - 2 : x0 + t + 2, s * B * .02, b + (top - b) * .52], [0, s, 0], [0, 0, 1]);
      k.add(steel, k.cut(wall, [notch, logo]));
    }
    // Welded tubes from the tray to the top plate, flanged liners standing proud to the published 7.5″.
    for (const [x, y] of sleeves) {
      k.add(steel, k.cut(k.cyl(top - t - b, Y.tube / 2, 'z', [x, y, b + (top - t - b) / 2], 40), [k.cyl(top, Y.tube / 2 - 3, 'z', [x, y, top / 2 + b], 40)]));
      const rise = Y.height - top, flange = k.cyl(rise, Y.flange / 2, 'z', [x, y, top + rise / 2 - .01], 40), sleeve = k.cyl(top * .7, Y.tube / 2 - 3, 'z', [x, y, top - top * .35], 40);
      k.add(liner, k.cut(k.union([flange, sleeve]), [k.cyl(Y.height * 2, Y.bore / 2, 'z', [x, y, top], 40)]));
    }
    for (let i = 0; i < p.loaded; i++) standingBar(k, sleeves[i][0], sleeves[i][1], b, BAR.length, i % 2 === 1);
  });
}

// ── CAP A-frame plate racks ─────────────────────────────────────────────────────────────────────────────
/** Plates on a peg of usable length `len`: half = one, full = as many as fit. */
function pegLoad(plate: PlateId, len: number, loaded: number): PlateId[] {
  if (!loaded) return [];
  const w = PLATE_SPECS[plate].width, n = Math.max(1, Math.floor((len + PLATE_GAP) / (w + PLATE_GAP)));
  return Array<PlateId>(loaded === 1 ? 1 : n).fill(plate);
}
const tierPlate = (s: AFrameSpec, z: number) => s.loads.find(l => z < l.z)!.plate;
function aFrame(k: Kit, s: AFrameSpec, loaded: number) {
  const paint = finish('Textured black powder-coated steel', 'source', '#1e1f21', .2, .78), cap = finish('Black plastic end caps', 'liner', '#121314', 0, .7);
  const hw = finish('Black M10 hardware', 'fastener', '#2a2b2d', .7, .4);
  const [fw, fh] = s.foot, D = s.depth, capT = s.ribbedCaps ? 14 : 6;
  // Feet along Y with plastic end caps (ribbed on the RK-2A).
  for (const side of [-1, 1]) {
    const x = side * s.footX;
    k.add(paint, k.span([x - fw / 2, -D / 2 + capT, 0], [x + fw / 2, D / 2 - capT, fh]));
    for (const e of [-1, 1]) {
      const y0 = e * (D / 2 - capT), y1 = e * D / 2;
      k.add(cap, k.span([x - fw / 2, Math.min(y0, y1), 0], [x + fw / 2, Math.max(y0, y1), fh + .5]));
      if (s.ribbedCaps) for (let i = 1; i < 4; i++) k.add(cap, k.span([x - fw / 2, y0 + e * i * capT / 4 - 1, 0], [x + fw / 2, y0 + e * i * capT / 4 + 1, fh + 1.5]));
    }
  }
  // Base crossmember between the feet (bolted through twin tabs on the RK-2BB).
  const [cd, ch] = s.cross, cz = s.crossZ, span = s.footX - (s.ribbedCaps ? fw / 2 : 0);
  k.add(paint, k.span([-span, -cd / 2, cz], [span, cd / 2, cz + ch]));
  if (!s.ribbedCaps) for (const side of [-1, 1]) for (const e of [-1, 1]) {
    const outer = s.footX + fw / 2;
    k.add(paint, k.span([side * outer, e * (cd / 2) - (e > 0 ? 0 : 3), fh], [side * (outer - 100), e * (cd / 2) + (e > 0 ? 3 : 0), fh + 40]));
    for (const dx of [30, 72]) k.add(hw, k.rod([side * (outer - dx), e * (cd / 2 + 3), fh + 20], [0, e, 0], 6, 8.5, 6));
  }
  // Legs: 25 × 50 mm tube raked in to the apex, joined under a top cap.
  const [lx, ly] = s.leg, top = s.height;
  for (const side of [-1, 1]) k.add(paint, beam(k, [side * s.legBottom[0], 0, s.legBottom[1] - (s.ribbedCaps ? 0 : 1)], [side * s.apex[0], 0, s.apex[1] - (s.ribbedCaps ? 14 : 0)], lx, ly));
  k.add(paint, k.span([-Math.max(28, s.apex[0] + lx), -ly / 2, s.apex[1] - (s.ribbedCaps ? 30 : 0)], [Math.max(28, s.apex[0] + lx), ly / 2, top]));
  if (s.mid) { const x = aFrameLegX(s, s.mid); k.add(paint, k.span([-x, -12.5, s.mid - 12.5], [x, 12.5, s.mid + 12.5])); }
  // Side pegs with a saddle on the leg and an end cap; plates hang on them with their faces across X.
  const r = s.pegD / 2;
  for (const peg of s.pegs) {
    const root = aFramePegRoot(s, peg), legX = aFrameLegX(s, peg.z), outer = legX + lx / 2, len = peg.tip - root;
    k.add(paint, k.cyl(peg.tip - 4 - outer + 2, r, 'x', [peg.x * (outer + (peg.tip - 4 - outer) / 2 - 1), 0, peg.z], 32));
    k.add(paint, k.span([peg.x * (outer - 2), -ly / 2 - 3, peg.z - 32], [peg.x * (outer + 4), ly / 2 + 3, peg.z + 32]));
    k.add(cap, k.cyl(4, r + .8, 'x', [peg.x * (peg.tip - 2), 0, peg.z], 32));
    // A stack may not run into the plates of a lower (wider-rooted) peg on the same side whose plates overlap it in height.
    const plate = tierPlate(s, peg.z), rad = PLATE_SPECS[plate].diameter / 2;
    const room = Math.min(len - 4, ...s.pegs.filter(o => o !== peg && o.x === peg.x && aFramePegRoot(s, o) > root
      && Math.abs(o.z - peg.z) < rad + PLATE_SPECS[tierPlate(s, o.z)].diameter / 2).map(o => aFramePegRoot(s, o) - root - 2));
    const plates = pegLoad(plate, room, loaded);
    hornPlates(k, plates, [peg.x * root, 0, peg.z], [peg.x, 0, 0], s.pegD, `Peg ${peg.z}${peg.x > 0 ? 'R' : 'L'}`);
  }
  // Vertical centre posts; the bottom one carries flat plates.
  for (const [i, post] of s.posts.entries()) {
    k.add(paint, k.cyl(post.h - 4, r, 'z', [0, 0, post.z + (post.h - 4) / 2], 32));
    k.add(cap, k.cyl(4, r + .8, 'z', [0, 0, post.z + post.h - 2], 32));
    if (i === 0 && s.postPlate && loaded) hornPlates(k, pegLoad(s.postPlate, post.h - 4, loaded), [0, 0, post.z], [0, 0, 1], PLATE_BORE, 'Centre post');
  }
}
export function buildCapAFrame(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const s = capAFrame(p); want([0, 1, 2].includes(p.loaded), 'plate rack load');
  return kit(api, k => aFrame(k, s, p.loaded));
}
export type { Manifold, Vec3 };
