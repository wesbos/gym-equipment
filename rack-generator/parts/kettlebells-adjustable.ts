/** Adjustable kettlebells: Ironmaster Quick-Lock handle, Freak Athlete, REP, Bells of Steel and Bowflex SelectTech 840. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import {
  BOS, BOS_COLORS, BOS_MM_PER_KG, BOS_MODELS, BOWFLEX_840, FREAK, IRONMASTER, REP_ADJ, REP_ADJ_MODELS, bellLayout, bosSpares, bosWeights, freakPinZ,
  ironmasterStack, compBodyShape, repAdjPlateT, repAdjSpares, repAdjWeights,
} from '../floor-parts/kettlebells.ts';
import { kettlebellKit, shade, type KettlebellKit } from './kettlebells-kit.ts';

const run = (label: string, api: ManifoldAPI, body: (t: KettlebellKit) => void): SolidPart[] => {
  const t = kettlebellKit(api);
  try { body(t); return t.finish(label); } catch (e) { t.release(); throw e; }
};
/** Handle loop whose horns meet a flat-topped body at rootZ, with its top exactly at `height`. */
const rootedLoop = (shape: Parameters<typeof bellLayout>[0], rootZ: number) => {
  const shift = rootZ - bellLayout(shape).surface.z;
  return { path: bellLayout({ ...shape, height: shape.height - shift }).path, shift };
};
/** Rounded-rectangle slab (plan w × d, corner r) from z0 to z1. */
const slab = (t: KettlebellKit, w: number, d: number, r: number, z0: number, z1: number) => t.move(t.k(t.roundRect(w, d, r).extrude(z1 - z0)), [0, 0, z0]);

export function buildIronmaster(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const st = ironmasterStack(p.handle, p.weight), light = p.handle === 0, I = IRONMASTER;
  return run('Ironmaster kettlebell', api, t => {
    const lift = st.stack, bodyH = 96, P = I.plate;
    // Handle base: a rounded-square frustum (hull of a wide foot and a narrower top) with slightly bowed faces.
    // Squat rounded-square dome: vertical skirt, then shoulders curving in to the label face.
    const rings = [[0, 1, 22], [18, .995, 24], [40, .95, 28], [60, .86, 30], [78, .74, 28], [bodyH - 3, .62, 22]].map(([z, f, r]) => slab(t, P * f, P * f, r, lift + z, lift + z + 3));
    let base = t.k(t.M.hull(rings));
    if (light) base = t.cut(base, [slab(t, P - 26, P - 26, 14, lift - 1, lift + 62)]);
    // Front arrow mark (debossed triangle) on the -Y face.
    const tri = t.k(t.C.ofPolygons([[[-7, 0], [0, -10], [7, 0]]]));
    base = t.cut(base, [t.faceSolid(tri, -1, P / 2 - 8, P / 2 + 4, lift + 20)]);
    const loop = bellLayout({ height: I.height, width: I.width, grip: I.grip, body: 120, base: 112, shoulder: 49, waist: .42, square: 2.25, flare: .35 });
    const handle = t.move(t.tube(loop.path, true, 32), [0, 0, lift]);
    t.add('Cast iron handle', t.union([base, handle]), 'source', '#1c1d20', .12, .62);
    // Top label: red (12.5) or black (22.5) plate with the locking-screw bore.
    const label = t.cut(slab(t, 58, 58, 4, lift + bodyH - .2, lift + bodyH + 1.2), [t.rod([0, 0, lift + bodyH - 2], [0, 0, lift + bodyH + 3], 9, 24)]);
    t.add('Weight label plate', label, 'source', light ? '#9d1f24' : '#141516', .3, .45);
    t.add('Label trim', t.cut(slab(t, 62, 62, 5, lift + bodyH - .4, lift + bodyH + .9), [slab(t, 57, 57, 4, lift + bodyH - 1, lift + bodyH + 2)]), 'fastener', '#c9ccd0', .9, .3);
    t.add('Threaded bore', t.rod([0, 0, lift + bodyH - 1], [0, 0, lift + bodyH + .4], 9, 24), 'fastener', '#0d0d0e', .6, .5);
    if (st.screw) {
      // Quick-Lock plates on the locking screw: 0.5" 5 lb plates, one 0.25" 2.5 lb plate, knurled screw head underneath.
      let z = I.screwHead; const plates: Manifold[] = [];
      for (let i = 0; i < st.plates5 + st.plates25; i++) {
        const th = i < st.plates25 ? I.plate25 : I.plate5;
        plates.push(t.cut(slab(t, P - 1, P - 1, I.plateCorner, z + .3, z + th - .3), [t.rod([0, 0, z - 1], [0, 0, z + th + 1], 14, 24)]));
        z += th;
      }
      t.add('Quick-Lock weight plates', t.union(plates), 'source', '#2a2b2e', .35, .5);
      const head = t.cut(t.rod([0, 0, 0], [0, 0, I.screwHead], I.screwDisc / 2, 64), Array.from({ length: 24 }, (_, i) => t.move(t.k(t.box([-1, -1.2, 0], [4, 1.2, I.screwHead + 1]).rotate([0, 0, i * 15])), [Math.cos(i * Math.PI / 12) * (I.screwDisc / 2 - 1.5), Math.sin(i * Math.PI / 12) * (I.screwDisc / 2 - 1.5), -.5])));
      t.add('Knurled locking screw', t.union([head, t.rod([0, 0, I.screwHead], [0, 0, lift + 40], 12.5, 24)]), 'fastener', '#b8bcc0', .9, .3);
    }
  });
}

export function buildFreakAthlete(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(p.weight >= 12 && p.weight <= 32 && p.weight % 2 === 0)) throw Error('Unsupported kettlebell weight.');
  const F = FREAK, bw = F.length - F.pin, bd = F.depth;
  return run('Freak Athlete kettlebell', api, t => {
    // Tombstone shell: straight rounded-rectangle walls under a domed shoulder that the horns grow out of.
    const walls = t.k(t.M.hull([slab(t, bw - 26, bd - 26, 54, 0, 3), slab(t, bw - 6, bd - 6, 63, 10, 13), slab(t, bw, bd, 66, 24, 150)]));
    const dome = t.move(t.k(t.k(t.M.sphere(1, 64)).scale([bw / 2, bd / 2, 62])), [0, 0, 150]);
    let shell = t.k(t.M.hull([walls, t.meet(dome, t.box([-bw, -bd, 150], [bw, bd, 250]))]));
    // Chevron facet between the horns on each face, and the round logo recess on the front.
    for (const side of [-1, 1] as const) {
      const v = t.k(t.C.ofPolygons([[[-bw * .3, 58], [0, 18], [bw * .3, 58], [bw * .3, 70], [-bw * .3, 70]]]));
      shell = t.cut(shell, [t.cut(t.faceSolid(v, side, bd / 2 - 30, bd / 2 + 10, 150), [t.move(t.k(t.k(t.M.sphere(1, 64)).scale([bw / 2 - 3, bd / 2 - 3, 59])), [0, 0, 150])])]);
    }
    shell = t.cut(shell, [t.cylY(-bd / 2 - 5, -bd / 2 + 3, 54, 0, 92, 72)]);
    const loop = rootedLoop({ height: F.height, width: F.width, grip: F.grip, body: 150, base: 10, shoulder: 60, waist: .15, square: 4.5, flare: .15 }, 196);
    const handle = t.move(t.tube(loop.path, true, 32), [0, 0, loop.shift]);
    // Pin scale: raised ticks up the +X wall at each 2 kg station.
    const ticks = Array.from({ length: 11 }, (_, i) => t.box([bw / 2 - 1.5, -18, freakPinZ(32 - 2 * i) - 1], [bw / 2 + .6, -8, freakPinZ(32 - 2 * i) + 1]));
    t.add('Powder-coated cast iron shell', t.union([shell, handle, ...ticks]), 'source', '#1e1f21', .05, .8);
    // Logo stand-in: a plain orange badge in the recess (no FA artwork).
    t.add('Orange logo badge', t.cut(t.cylY(-bd / 2 + 2, -bd / 2 + 3.4, 24, 0, 92, 48), [t.cylY(-bd / 2 + 1, -bd / 2 + 4, 17, 0, 92, 48)]), 'source', '#f26a21', 0, .5);
    const z = freakPinZ(p.weight);
    t.add('Magnetic selector pin', t.union([t.rod([bw / 2 - 20, 0, z], [bw / 2 + F.pin - 4, 0, z], 5, 24), t.rod([bw / 2 + F.pin - 5, 0, z], [bw / 2 + F.pin, 0, z], 7.5, 32)]), 'fastener', '#111213', .4, .45);
  });
}

/** Competition-size shell body (half-ellipsoids, flat base); zc is the widest circle, top the crown between the horns. */
const compShell = (t: KettlebellKit, D: number, base: number, height: number) => {
  const { eq, crown } = compBodyShape(height);
  return { zc: eq, R: D / 2, top: crown, solid: t.compBody(D, base, eq, crown) };
};
/** Stack of removed plates beside the bell (centre x), from thicknesses listed bottom-up. */
const plateStack = (t: KettlebellKit, x: number, dia: number, thick: number[], bore: number) => {
  let z = 0; const out: Manifold[] = [];
  for (const th of thick) { const hub = Math.min(5, th * .3); out.push(t.cut(t.union([t.rod([x, 0, z + hub], [x, 0, z + th], dia / 2, 64), t.rod([x, 0, z], [x, 0, z + hub + .5], bore + 14, 32)]), [t.rod([x, 0, z - 1], [x, 0, z + th + 1], bore, 24)])); z += th; }
  return { solid: out.length ? t.union(out) : undefined, top: z };
};

export function buildRepAdjustable(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const m = REP_ADJ_MODELS[p.model]; if (!m || !repAdjWeights(p.model).includes(p.weight)) throw Error('Unsupported kettlebell weight.');
  const A = REP_ADJ, spares = repAdjSpares(p.model, p.weight);
  return run('REP adjustable kettlebell', api, t => {
    const { R, top, solid } = compShell(t, A.body, A.base, A.height), capZ = top - 22;
    const shell = t.cut(solid, [t.box([-R - 2, -R - 2, capZ], [R + 2, R + 2, capZ + 40])]);
    const loop = bellLayout({ height: A.height, width: A.width, grip: A.grip, body: A.body, base: A.base, shoulder: 50, waist: .25, square: 4.2, flare: .35 });
    t.add('Powder-coated iron shell and handle', t.union([shell, t.tube(loop.path, true, 32)]), 'source', '#1c1d1f', .05, .78);
    // Coloured top cap under the handle.
    const cap = t.meet(t.move(t.k(t.k(t.M.sphere(1, 72)).scale([R * .8, R * .66, 9])), [0, 0, capZ - 3]), t.box([-R, -R, capZ - 1], [R, R, capZ + 8]));
    t.add('Coloured top cap', cap, 'source', m.cap, .05, .5);
    if (spares) {
      const x = A.body / 2 + A.plateGap + A.rim / 2, th = repAdjPlateT(p.model);
      const st = plateStack(t, x, A.plate, Array(spares).fill(th), 14);
      t.add('Removed weight plates', st.solid, 'source', '#202123', .2, .6);
      t.add('Plate base flange', t.cut(t.rod([x, 0, 0], [x, 0, 4], A.rim / 2, 72), [t.rod([x, 0, -1], [x, 0, 5], 14, 24)]), 'source', m.cap, .05, .5);
    }
  });
}

export function buildBosAdjustable(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const color = BOS_COLORS[p.color]; if (!color || !BOS_MODELS[p.model] || !bosWeights(p.model).includes(p.weight)) throw Error('Unsupported kettlebell weight.');
  const B = BOS, sp = bosSpares(p.model, p.weight);
  return run('Bells of Steel adjustable kettlebell', api, t => {
    const { zc, R, solid } = compShell(t, B.body, B.base, B.height);
    // Two-piece shell: seam groove near the equator, plate bay open underneath behind a plug.
    const shell = t.cut(solid, [t.cut(t.rod([0, 0, zc - 28], [0, 0, zc - 26], R + 2, 96), [t.rod([0, 0, zc - 30], [0, 0, zc - 24], R - .8, 96)]), t.rod([0, 0, -1], [0, 0, 3], B.base * .42, 64)]);
    const loop = bellLayout({ height: B.height, width: B.width, grip: B.grip, body: B.body, base: B.base, shoulder: 60, waist: .3, square: 4.2, flare: .3 });
    const [painted, steel] = t.splitAtZ(loop.path, loop.zt - 34);
    t.add('Painted steel shell', t.union([shell, t.tube(painted, true, 32)]), 'source', color[1], .1, .38);
    t.add('Bare steel handle', t.tube(steel, true, 32), 'handle', '#bcc0c4', .8, .32);
    const ring = (r: number, w: number) => t.k(t.C.difference([t.k(t.C.circle(r, 72)), t.k(t.C.circle(r - w, 72))]));
    const skin = t.cut(t.meet(t.faceSolid(t.k(t.C.union([ring(B.body * .2, 2.2), ring(B.body * .16, 1.2)])), -1, R - 4, R + 1, zc + 18), t.compBody(B.body + .7, B.base + .7, zc, compBodyShape(B.height).crown + .35)), [t.compBody(B.body - .6, B.base - .6, zc, compBodyShape(B.height).crown - .3)]);
    t.add('Embossed logo ring', skin, 'source', shade(color[1], p.color === 0 ? 1.8 : .72), .1, .5);
    t.add('Base plug', t.cut(t.rod([0, 0, .4], [0, 0, 3], B.base * .42 - .5, 64), [t.rod([0, 0, -1], [0, 0, 4], 14, 24)]), 'liner', '#151516', 0, .8);
    if (sp.plates.length) {
      const x = B.body / 2 + B.plateGap + B.plate / 2;
      const st = plateStack(t, x, B.plate, sp.plates.map(kg => kg * BOS_MM_PER_KG), 16);
      t.add('Removed iron plates', st.solid, 'source', '#1f2022', .25, .55);
    }
  });
}

export function buildBowflex840(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const i = BOWFLEX_840.weights.indexOf(p.weight as never); if (i < 0) throw Error('Unsupported kettlebell weight.');
  const L = BOWFLEX_840.length, W = BOWFLEX_840.depth, H = BOWFLEX_840.height;
  return run('Bowflex SelectTech 840', api, t => {
    // Base tray with four upturned corner tabs at the X ends.
    const tray = t.cut(slab(t, L - 14, W, 60, 0, 12), [slab(t, L - 26, W - 12, 54, 4, 14)]);
    const tabs = [-1, 1].flatMap(sx => [-1, 1].map(sy => t.box([sx > 0 ? L / 2 - 8 : -L / 2, sy > 0 ? W / 2 - 46 : -W / 2 + 26, 2], [sx > 0 ? L / 2 : -L / 2 + 8, sy > 0 ? W / 2 - 26 : -W / 2 + 46, 34])));
    const lips = [-1, 1].map(sx => t.k(t.M.hull([t.box([sx > 0 ? L / 2 - 16 : -L / 2 + 8, -W / 2 + 26, 0], [sx > 0 ? L / 2 - 8 : -L / 2 + 16, W / 2 - 26, 8]), t.box([sx > 0 ? L / 2 - 8 : -L / 2, -W / 2 + 26, 0], [sx > 0 ? L / 2 : -L / 2 + 8, W / 2 - 26, 4])])));
    t.add('Base tray', t.union([tray, ...tabs, ...lips]), 'liner', '#141416', 0, .75);
    // Shell: black skirt, grey body with a red band, rounded shoulder up to the dial.
    const bw = L - 34, bd = W - 20;
    t.add('Black shell skirt', slab(t, bw + 1, bd + 1, 66.5, 10, 58), 'source', '#1b1c1e', .05, .6);
    const shoulder = [[196, .96, .93], [210, .88, .84], [220, .76, .7], [226, .6, .52]].map(([z, fx, fy]) => slab(t, bw * fx, bd * fy, 60 * fy, z, z + 2));
    const upper = t.k(t.M.hull([slab(t, bw, bd, 66, 44, 186), ...shoulder]));
    t.add('Grey shell', upper, 'source', '#4b4e53', .1, .55);
    t.add('Red accent band', slab(t, bw + 2.4, bd + 2.4, 67, 116, 126), 'source', '#d0222b', .1, .45);
    // Dial with its pointer turned to the selected setting.
    t.add('Selection dial', t.union([t.rod([0, 0, 229], [0, 0, 244], 42, 64), t.rod([0, 0, 243], [0, 0, 247], 34, 64)]), 'source', '#141517', .1, .5);
    t.add('Dial badge', t.rod([0, 0, 246.5], [0, 0, 248], 13, 48), 'source', '#c9232b', .1, .45);
    t.add('Dial pointer', t.move(t.k(t.box([-2, 14, 246.5], [2, 32, 248.2]).rotate([0, 0, -i * 50 + 125])), [0, 0, 0]), 'source', '#f2f2ef', 0, .5);
    const loop = rootedLoop({ height: H, width: 172, grip: 32, body: 150, base: 10, shoulder: 60, waist: .2, square: 4.6, flare: .2 }, 214);
    t.add('Handle', t.move(t.tube(loop.path, true, 32), [0, 0, loop.shift]), 'handle', '#161718', .05, .6);
  });
}
