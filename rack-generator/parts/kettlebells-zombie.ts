/** Onnit Zombie Bells: undead human heads sculpted as a signed-distance field of smoothly blended ellipsoids (cranium, face,
 * jaw, neck, cheekbones, brow, ears) with carved eye sockets, nose, grimacing mouth and teeth, plus per-head details
 * (exposed brain folds, a stapled scar, cheek bolts and rivet straps), meshed with Manifold.levelSet under the enlarged
 * handle. Proportions follow the archived Onnit photos (research/kettlebells.md); no scan or artwork is used. */
import type { ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { ZOMBIE_FACE_REACH, ZOMBIE_HEADS, zombieLayout } from '../floor-parts/kettlebells.ts';
import { ellipsoid, mirrorX, smax, smin, type Sdf } from './kettlebells-onnit.ts';
import { kettlebellKit } from './kettlebells-kit.ts';

interface ZombieFace {
  /** 'skull': rotted-away nose, open nasal cavity; 'flesh': a lumpy nose with nostrils. */
  nose: 'skull' | 'flesh';
  /** Mouth width and height (1 = typical grimace), fangs, sunken cheeks. */
  mouthW: number; mouthH: number; fangs: boolean; hollow: number;
  brow: number; eyes: number; earZ: number; earH: number; rot: number;
  brain: boolean; staples: boolean; bolts: boolean;
}
/** Per-head recipe, read off the Onnit front lineup and side view. */
export const ZOMBIE_FACES: Record<(typeof ZOMBIE_HEADS)[number]['name'], ZombieFace> = {
  'Brain Goblin': { nose: 'flesh', mouthW: .95, mouthH: 1.25, fangs: true, hollow: .4, brow: 1.3, eyes: 1, earZ: .54, earH: 1.15, rot: 1, brain: true, staples: false, bolts: false },
  'Staple Head': { nose: 'skull', mouthW: 1, mouthH: 1.1, fangs: false, hollow: .7, brow: .9, eyes: .95, earZ: .5, earH: 1, rot: .9, brain: false, staples: true, bolts: false },
  'Ghostface Thrilla': { nose: 'skull', mouthW: 1.1, mouthH: 1, fangs: false, hollow: 1, brow: 1, eyes: 1.05, earZ: .5, earH: 1, rot: 1.2, brain: false, staples: false, bolts: false },
  'Mega Dead': { nose: 'flesh', mouthW: .9, mouthH: .85, fangs: false, hollow: .5, brow: 1.15, eyes: 1.1, earZ: .5, earH: 1, rot: 1.3, brain: false, staples: false, bolts: true },
};

export function zombieField(hw: number, hd: number, hh: number, f: ZombieFace): Sdf {
  const W = hw / 2, D = hd / 2, k = hh * .07;
  // Masses: cranium over a narrower face, jaw and chin, and a neck stump at the back that carries the flat base.
  const cranium = ellipsoid([0, D * .12, hh * .62], [W * .88, D * .86, hh * .39]);
  const face = ellipsoid([0, -D * .28, hh * .42], [W * .76, D * .68, hh * .32]);
  const jaw = ellipsoid([0, -D * .32, hh * .21], [W * .7, D * .6, hh * .21]);
  const chin = ellipsoid([0, -D * .72, hh * .13], [W * .32, D * .28, hh * .12]);
  const neck = ellipsoid([0, D * .22, hh * .18], [W * .62, D * .72, hh * .26]);
  const cheekbones = mirrorX(ellipsoid([W * .5, -D * .62, hh * .47], [W * .25, D * .26, hh * .09]));
  const hollows = mirrorX(ellipsoid([W * .56, -D * .9, hh * .33], [W * .16, D * .3, hh * .1]));
  const brow = mirrorX(ellipsoid([W * .26, -D * .86, hh * .635], [W * .3, D * .16, hh * .055 * f.brow]));
  const sockets = mirrorX(ellipsoid([W * .27, -D * 1.02, hh * .565], [W * .16, D * .34, hh * .085]));
  const eyeballs = mirrorX(ellipsoid([W * .27, -D * .8, hh * .565], [W * .105 * f.eyes, D * .12, hh * .06 * f.eyes]));
  const fleshNose = ellipsoid([0, -D * .98, hh * .46], [W * .14, D * .24, hh * .11]);
  const nostrils = mirrorX(ellipsoid([W * .05, -D * 1.1, hh * .41], [W * .035, D * .1, hh * .025]));
  const cavity = mirrorX(ellipsoid([W * .05, -D * 1.0, hh * .45], [W * .065, D * .34, hh * .075]));
  const bridge = ellipsoid([0, -D * .9, hh * .52], [W * .06, D * .12, hh * .05]);
  const mouth = ellipsoid([0, -D * 1.04, hh * .285], [W * .36 * f.mouthW, D * .34, hh * .075 * f.mouthH]);
  const upperLip = ellipsoid([0, -D * .8, hh * .365], [W * .34 * f.mouthW, D * .24, hh * .045]);
  const lowerLip = ellipsoid([0, -D * .78, hh * .205], [W * .3 * f.mouthW, D * .24, hh * .04]);
  const span = W * .3 * f.mouthW, pitch = W * .085;
  const teethRow = (z: number, h: number): Sdf => (x, y, zz) => {
    const cx = Math.round(x / pitch) * pitch;
    if (Math.abs(x) > span) return 1e3;
    return ellipsoid([cx, -D * .88 + cx * cx / (W * 1.2), z], [pitch * .42, D * .14, h])(x, y, zz);
  };
  const upper = teethRow(hh * .31, hh * .045 * f.mouthH), lower = teethRow(hh * .255, hh * .04 * f.mouthH);
  const fangs = mirrorX(ellipsoid([span * .8, -D * .9, hh * .3], [W * .045, D * .09, hh * .075]));
  const ears = mirrorX(ellipsoid([W * .84, D * .08, hh * f.earZ], [W * .16, D * .2, hh * .15 * f.earH]));
  const earBowls = mirrorX(ellipsoid([W * .97, D * .0, hh * f.earZ], [W * .07, D * .12, hh * .1 * f.earH]));
  // Staple Head: a stitched scar across the forehead, staples standing on it. Points on the cranium surface at z = .78 hh.
  const scarZ = hh * .78, craniumFront = (x: number) => {
    const u = 1 - (x / (W * .88)) ** 2 - ((scarZ - hh * .62) / (hh * .39)) ** 2;
    return u > 0 ? D * .12 - D * .86 * Math.sqrt(u) : D * .12;
  };
  const scar = (x: number, y: number, z: number) => Math.abs(x) > W * .6 ? 1e3 : Math.hypot(y - craniumFront(x), z - scarZ) - hh * .012;
  const staple = (x: number, y: number, z: number) => {
    const sp = W * .14, cx = Math.round(x / sp) * sp;
    if (Math.abs(cx) > W * .52) return 1e3;
    return ellipsoid([cx, craniumFront(cx) + 1, scarZ], [W * .018, D * .03, hh * .045])(x, y, z);
  };
  // Mega Dead: bolted cheek plates and riveted straps under the horn roots.
  const bolts = mirrorX(ellipsoid([W * .47, -D * .72, hh * .31], [W * .07, D * .05, hh * .045]));
  const boltSlots = mirrorX(ellipsoid([W * .47, -D * .79, hh * .31], [W * .055, D * .03, hh * .007]));
  const straps = mirrorX(ellipsoid([W * .52, -D * .05, hh * .84], [W * .09, D * .34, hh * .06]));
  const rivets = mirrorX((x, y, z) => Math.min(...[-.28, .2].map(v => ellipsoid([W * .6, D * v, hh * .87], [W * .035, W * .035, hh * .02])(x, y, z))));
  const clip = (d: number, x: number, y: number, z: number) => Math.max(d, -z, Math.abs(x) - W, y - D, -y - D * ZOMBIE_FACE_REACH);
  return (x, y, z) => {
    let d = smin(cranium(x, y, z), face(x, y, z), k * 1.2);
    // Cull: features reach at most ~25 mm outside and ~40 mm inside the main masses, so skip them away from the surface.
    const rough = Math.min(d, jaw(x, y, z), neck(x, y, z), ears(x, y, z));
    if (rough > 30 || rough < -45) return clip(rough, x, y, z);
    d = smin(d, jaw(x, y, z), k);
    d = smin(d, chin(x, y, z), k * .8);
    d = smin(d, neck(x, y, z), k * 1.2);
    d = smin(d, cheekbones(x, y, z), k * .7);
    if (f.hollow) d = smax(d, -hollows(x, y, z) / f.hollow, k * .6);
    d = smax(smin(d, ears(x, y, z), k * .3), -earBowls(x, y, z), k * .15);
    d = smin(smin(d, upperLip(x, y, z), k * .5), lowerLip(x, y, z), k * .5);
    d = smin(d, brow(x, y, z), k * .8);
    if (f.nose === 'flesh') { d = smin(d, fleshNose(x, y, z), k * .4); d = smax(d, -nostrils(x, y, z), k * .12); }
    else { d = smin(d, bridge(x, y, z), k * .3); d = smax(d, -cavity(x, y, z), k * .15); }
    d = smax(d, -sockets(x, y, z), k * .3);
    d = smin(d, eyeballs(x, y, z), k * .12);
    d = smax(d, -mouth(x, y, z), k * .2);
    d = Math.min(d, upper(x, y, z), lower(x, y, z));
    if (f.fangs) d = Math.min(d, fangs(x, y, z));
    if (f.staples) { d = smax(d, -scar(x, y, z), k * .08); d = Math.min(d, staple(x, y, z)); }
    if (f.bolts) { d = smin(d, bolts(x, y, z), k * .15); d = smax(d, -boltSlots(x, y, z), k * .05); d = smin(d, straps(x, y, z), k * .2); d = Math.min(d, rivets(x, y, z)); }
    // Exposed brain: deep meandering folds over the crown (Brain Goblin); rotting-skin wrinkles on every head.
    if (f.brain && z > hh * .74) d += 1.6 * Math.sin(x * .22 + Math.sin(y * .15) * 2.2) * Math.sin(y * .2 + Math.sin(x * .13) * 2);
    d += f.rot * .5 * Math.sin(z * .45 + Math.sin(x * .09) * 3 + y * .05) * Math.sin(x * .27 + z * .11 + Math.sin(y * .1));
    // Flat cast base and the footprint limits.
    return clip(d, x, y, z);
  };
}

export function buildOnnitZombie(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const o = zombieLayout(p.head), face = ZOMBIE_FACES[o.zombie.name];
  const t = kettlebellKit(api);
  try {
    const field = zombieField(o.hw, o.hd, o.hh, face);
    const W = o.hw / 2, D = o.hd / 2;
    // ~60 voxels over the head height keeps the biggest head under the 80k triangle budget.
    const head = t.k(t.M.levelSet(([x, y, z]) => -field(x, y, z), { min: [-W - 2, -D * ZOMBIE_FACE_REACH - 2, -2], max: [W + 2, D + 2, o.hh + 4] }, Math.max(2.8, o.hh / 60)));
    const handle = t.move(t.tube(o.layout.path, true, 32), [0, 0, o.shift]);
    t.add('Cast iron head and handle', t.union([head, handle]), 'source', '#2c2d30', .25, .62);
    return t.finish(`Onnit ${o.zombie.name} Zombie Bell`);
  } catch (e) { t.release(); throw e; }
}
