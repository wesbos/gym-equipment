/** Onnit Primal Bells: primate heads sculpted as a signed-distance field of smoothly blended ellipsoids
 * (skull, muzzle, brow, cheeks or flanges, ears, nose) with carved eye sockets, nostrils and mouth, rendered with
 * Manifold.levelSet under a cast handle. Proportions follow the Onnit product photos; no scan or artwork is used. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { ONNIT_FACE_REACH, onnitLayout } from '../floor-parts/kettlebells.ts';
import { kettlebellKit } from './kettlebells-kit.ts';

export type Sdf = (x: number, y: number, z: number) => number;
/** Ellipsoid distance bound (negative inside). */
export const ellipsoid = (c: Vec3, r: Vec3): Sdf => (x, y, z) => {
  const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
  const k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / r[0], py / r[1], pz / r[2]);
  return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
};
export const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; };
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);
export const mirrorX = (f: Sdf): Sdf => (x, y, z) => f(Math.abs(x), y, z);

interface Face {
  ears: number; earZ: number; muzzle: number; muzzleY: number; brow: number; crest: number; flange: number; cheeks: number;
  mouth: 'O' | 'snarl' | 'grin' | 'frown'; fangs: boolean; fur: number; nose: number; eyes: number;
}
/** Per-animal sculpt recipe, read from the Onnit front photos. */
export const FACES: Record<string, Face> = {
  Howler: { ears: 1, earZ: .58, muzzle: .9, muzzleY: .95, brow: .7, crest: 0, flange: 0, cheeks: .7, mouth: 'O', fangs: true, fur: .45, nose: .8, eyes: 1 },
  Chimp: { ears: 1.15, earZ: .62, muzzle: 1.05, muzzleY: 1, brow: .9, crest: 0, flange: 0, cheeks: .8, mouth: 'snarl', fangs: false, fur: .15, nose: .8, eyes: 1 },
  Orangutan: { ears: 0, earZ: .5, muzzle: .85, muzzleY: .9, brow: .55, crest: 0, flange: 1, cheeks: .5, mouth: 'grin', fangs: false, fur: .2, nose: .7, eyes: .8 },
  Gorilla: { ears: .45, earZ: .6, muzzle: .95, muzzleY: .9, brow: 1.25, crest: 1, flange: 0, cheeks: .9, mouth: 'frown', fangs: false, fur: .25, nose: 1.25, eyes: .9 },
  Bigfoot: { ears: .3, earZ: .6, muzzle: .95, muzzleY: .95, brow: 1.1, crest: .4, flange: 0, cheeks: .9, mouth: 'snarl', fangs: true, fur: 1, nose: 1.05, eyes: 1 },
};

export function headField(hw: number, hd: number, hh: number, f: Face): Sdf {
  const W = hw / 2, D = hd / 2, k = hh * .07;
  // Feature sizes and heights are shares of the head read off the Chimp/Gorilla front photos: brow bar .69–.79 of the
  // head height spanning 0.7 W, eyes at .70, nose .58–.64, muzzle .30–.56 spanning 0.6 W, mouth .28–.44.
  const skullW = f.ears ? W * (1 - .14 * f.ears) : f.flange ? W * .72 : W * .97;
  const skull = ellipsoid([0, D * .08, hh * .57], [skullW, D * .9, hh * .43]);
  const jaw = ellipsoid([0, -D * .1, hh * .31], [skullW * .97, D * .82, hh * .31]);
  const muzzle = ellipsoid([0, -D * (.42 + .14 * f.muzzleY), hh * .43], [W * .6 * f.muzzle, D * .55, hh * .19 * f.muzzle]);
  const chin = ellipsoid([0, -D * .5, hh * .17], [W * .45, D * .45, hh * .16]);
  const brow = mirrorX(ellipsoid([W * .3, -D * .74, hh * .75], [W * .4, D * .22 * f.brow, hh * .1 * f.brow]));
  const cheeks = mirrorX(ellipsoid([W * .5, -D * .45, hh * .47], [W * .32 * f.cheeks, D * .4, hh * .2]));
  const flange = mirrorX(ellipsoid([W * .74, -D * .2, hh * .5], [W * .26, D * .5, hh * .45]));
  const ears = mirrorX(ellipsoid([W - W * .1 * f.ears, D * .12, hh * f.earZ], [W * .1 * f.ears, D * .13, hh * .18 * f.ears]));
  const earBowl = mirrorX(ellipsoid([W - W * .08 * f.ears, -D * .02, hh * f.earZ], [W * .065 * f.ears, D * .09, hh * .12 * f.ears]));
  const crest = ellipsoid([0, D * .1, hh * .97], [W * .16, D * .62, hh * .1]);
  const nose = ellipsoid([0, -D * .98, hh * .6], [W * .16 * f.nose, D * .14, hh * .065 * f.nose]);
  const nostrils = mirrorX(ellipsoid([W * .075 * f.nose, -D * 1.09, hh * .58], [W * .045 * f.nose, D * .09, hh * .025 * f.nose]));
  const eyes = mirrorX(ellipsoid([W * .3, -D * .96, hh * .67], [W * .16 * f.eyes, D * .3, hh * .065 * f.eyes]));
  const eyeballs = mirrorX(ellipsoid([W * .3, -D * .72, hh * .665], [W * .075 * f.eyes, D * .1, hh * .035 * f.eyes]));
  const mouth = f.mouth === 'O' ? ellipsoid([0, -D * 1.12, hh * .35], [W * .24, D * .6, hh * .13])
    : f.mouth === 'snarl' ? ellipsoid([0, -D * 1.12, hh * .36], [W * .5, D * .56, hh * .11])
    : f.mouth === 'grin' ? ellipsoid([0, -D * 1.08, hh * .36], [W * .54, D * .5, hh * .07])
    : ellipsoid([0, -D * 1.08, hh * .32], [W * .42, D * .2, hh * .014]);
  const span = f.mouth === 'grin' ? W * .5 : f.mouth === 'O' ? W * .2 : W * .4;
  const teethRow = (z: number, h: number): Sdf => (x, y, zz) => {
    const pitch = W * .1, cx = Math.round(x / pitch) * pitch;
    if (Math.abs(x) > span) return 1e3;
    return ellipsoid([cx, -D * .86 + cx * cx / (W * 1.4), z], [pitch * .4, D * .16, h])(x, y, zz);
  };
  const upper = teethRow(hh * .405, hh * .045), lower = teethRow(hh * .315, hh * .04);
  // Lips framing the mouth: upper lip under the nose, lower lip over the chin.
  const upperLip = ellipsoid([0, -D * .78, hh * .47], [W * .5, D * .3, hh * .07]), lowerLip = ellipsoid([0, -D * .76, hh * .25], [W * .44, D * .3, hh * .065]);
  const fangs = mirrorX(ellipsoid([span * .78, -D * .98, hh * .37], [W * .05, D * .09, hh * .08]));
  const openMouth = f.mouth !== 'frown';
  return (x, y, z) => {
    let d = smin(skull(x, y, z), jaw(x, y, z), k * 1.2);
    d = smin(d, chin(x, y, z), k);
    d = smin(d, muzzle(x, y, z), k);
    d = smin(d, cheeks(x, y, z), k);
    if (f.flange) d = smin(d, flange(x, y, z), k * .5);
    if (f.ears) d = smax(smin(d, ears(x, y, z), k * .3), -earBowl(x, y, z), k * .15);
    if (f.crest) d = smin(d, crest(x, y, z) / f.crest, k);
    d = smin(smin(d, upperLip(x, y, z), k * .5), lowerLip(x, y, z), k * .5);
    d = smin(d, brow(x, y, z), k * .9);
    d = smin(d, nose(x, y, z), k * .35);
    d = smax(d, -nostrils(x, y, z), k * .12);
    d = smax(d, -eyes(x, y, z), k * .3);
    d = smin(d, eyeballs(x, y, z), k * .15);
    d = smax(d, -mouth(x, y, z), k * (openMouth ? .25 : .08));
    if (openMouth) { d = Math.min(d, upper(x, y, z), lower(x, y, z)); if (f.fangs) d = Math.min(d, fangs(x, y, z)); }
    // Hair / wrinkle relief: low-amplitude ridges, strongest on Bigfoot and the Howler; brow wrinkles on all.
    if (f.fur) d += f.fur * 1.1 * Math.sin(z * .5 + Math.sin(x * .1) * 3 + y * .06) * Math.sin(x * .32 + z * .09);
    if (z > hh * .78) d += .45 * Math.sin(z * .6);
    // Flat cast base and the footprint limits.
    return Math.max(d, -z, Math.abs(x) - W, y - D, -y - D * ONNIT_FACE_REACH);
  };
}

export function buildOnnitPrimal(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const o = onnitLayout(p.animal), face = FACES[o.animal.name];
  const t = kettlebellKit(api);
  try {
    const field = headField(o.hw, o.hd, o.hh, face);
    const W = o.hw / 2, D = o.hd / 2;
    const head = t.k(t.M.levelSet(([x, y, z]) => -field(x, y, z), { min: [-W - 2, -D * ONNIT_FACE_REACH - 2, -2], max: [W + 2, D + 2, o.hh + 4] }, Math.max(2.8, o.hh / 66)));
    const handle = t.move(t.tube(o.layout.path, true, 32), [0, 0, o.shift]);
    t.add('Cast iron head and handle', t.union([head, handle]), 'source', '#3a3b3e', .25, .6);
    return t.finish(`Onnit ${o.animal.name} bell`);
  } catch (e) { t.release(); throw e; }
}
