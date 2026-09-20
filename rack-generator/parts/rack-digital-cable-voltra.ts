/** VOLTRA accessories (#136): Darko QuickMount, Beyond Power Strap Mount, Adaptive and Fixed Bar Mounts and the Rotator.
 * Frame (rack-part.ts): origin on the upright centreline at the hole axis, +Y out of the face, Z up.
 * The VOLTRA I dock and device are the built-in reconstruction from parts/voltra.ts, re-used unchanged: built there,
 * moved so the dock centre is the origin with the device along +Y, then placed by each mount. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2 } from '../types.ts';
import { vendorSolid } from './vendor-solid.ts';
import { definitions as voltraDefinitions } from './voltra.ts';
import {
  ADAPTIVE_BAR, BEYOND_POWER_ADAPTIVE_BAR_MOUNT, BEYOND_POWER_FIXED_BAR_MOUNT, BEYOND_POWER_ROTATOR, BEYOND_POWER_STRAP_MOUNT, DARKO_QUICKMOUNT,
  FIXED_BAR, QUICKMOUNT, RACK_PEG, ROTATOR, STRAP_MOUNT, barMountLayout, quickMountLayout, rotatorLayout, strapLayout,
} from '../rack-parts/rack-digital-cable.ts';
type Scope = Parameters<Parameters<typeof vendorSolid>[1]>[0];
const CHROME = ['#d3d7da', .95, .12] as const, BP_GREY = ['#6f7479', .8, .34] as const, BP_DARK = ['#3b3e42', .7, .38] as const;
const voltraBuild = (id: string) => voltraDefinitions.find(d => d.id === id)!;
/** Solid of revolution along +Y from y0 to y1 at (x, z). */
const alongY = (v: Scope, x: number, z: number, y0: number, y1: number, r: number, segments = 48) => v.cylinder(r, y1 - y0, [x, (y0 + y1) / 2, z], [90, 0, 0], segments);
const alongX = (v: Scope, y: number, z: number, x0: number, x1: number, r: number, segments = 48) => v.cylinder(r, x1 - x0, [(x0 + x1) / 2, y, z], [0, 90, 0], segments);
const alongZ = (v: Scope, x: number, y: number, z0: number, z1: number, r: number, segments = 48) => v.cylinder(r, z1 - z0, [x, y, (z0 + z1) / 2], [0, 0, 0], segments);
/** Polygon in the X–Z plane ([x, z] points), extruded along +Y from y0 by t. */
function plateXZ(v: Scope, points: Vec2[], y0: number, t: number): Manifold {
  const { keep: k, C } = v;
  return k(k(k(k(new C([points])).extrude(t)).rotate([90, 0, 0])).translate([0, y0 + t, 0]));
}
/** Rounded rectangle in the X–Z plane centred at (x, z), extruded along +Y from y0 by t. */
const roundXZ = (v: Scope, w: number, h: number, r: number, x: number, z: number, y0: number, t: number) =>
  v.keep(v.keep(v.round(w, h, t, r).rotate([90, 0, 0])).translate([x, y0 + t / 2, z]));
/** Adds the VOLTRA I dock and device from parts/voltra.ts: dock centre at the origin, device along +Y, then `place`. */
export function addVoltra(api: ManifoldAPI, v: Scope, orientation: number, place: (m: Manifold) => Manifold, from = 'Device docking receiver') {
  const face = 75 / 2, dockY = face + 32, built: SolidPart[] = voltraBuild('voltra-adaptive').build(api, { upright: 75, orientation, pinDiameter: 15.5 });
  let on = false;
  for (const part of built) {
    v.keep(part.solid);
    if (part.name === from) on = true;
    if (!on) continue;
    v.add(part.name, place(v.keep(part.solid.translate([0, -dockY, 0]))), part.role, part.color, part.metalness, part.roughness);
  }
}
/** Beyond Power AnyMount dock cup (chrome body the VOLTRA dock sits in) along +Y. */
const dockCup = (v: Scope, x: number, z: number, y0: number, depth: number, r: number) => v.add('VOLTRA I dock cup', alongY(v, x, z, y0, y0 + depth, r, 64), 'source', ...CHROME);

// ─── Darko QuickMount ────────────────────────────────────────────────────────────────────────────────────────────────
export function buildQuickMount(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...DARKO_QUICKMOUNT.defaults, ...params }, l = quickMountLayout(p), q = QUICKMOUNT;
  return vendorSolid(api, v => {
    const { M, C, keep: k, add, box } = v;
    const stainless = p.version === 2, steel: [string, number, number] = stainless ? ['#b7bbbe', .9, .32] : ['#101113', .45, .2];
    const depth = l.webY1 - l.flangeBack, cx = (l.webY1 + l.flangeBack) / 2;
    // U profile in X–Y: web across the face, flanges down both side faces; bent outer corners, sharp inner corners.
    const outer = k(k(C.square([2 * l.halfW - 16, depth - 16], true)).offset(8, 'Round', 24)), inner = k(C.square([2 * (l.face + q.liner), depth], true));
    const u = k(k(k(k(outer.translate([0, cx])).subtract(k(inner.translate([0, cx - q.steel])))).extrude(q.height)).translate([0, 0, l.bottom]));
    // Flange back corners chamfered 24 mm, as in Darko's photos.
    const chamfer = (z: number) => k(k(k(M.cube([2 * l.halfW + 4, 34, 34], true)).rotate([45, 0, 0])).translate([0, l.flangeBack, z]));
    let bracket = k(M.difference([u, chamfer(l.top), chamfer(l.bottom)]));
    // QuickMount PM: the pulley-point tab rises from the web's top edge (its own solid, flush on the edge, so the
    // print mesh keeps no coplanar seams).
    let tab: Manifold | undefined;
    if (p.version === 3) {
      const [tw, th] = q.pmTab, ring = l.pmTop - tw / 2;
      tab = k(k(M.union([box([tw, q.steel, ring - l.top], [0, (l.webY0 + l.webY1) / 2, (l.top + ring) / 2]), alongY(v, 0, ring, l.webY0, l.webY1, tw / 2)])).subtract(alongY(v, 0, ring, l.webY0 - 1, l.webY1 + 1, q.pmHole / 2, 32)));
    }
    // Pin hole through both flanges: 1 in + 5/8 in keyhole, or the single 1 in hole.
    const holeX = (z: number, r: number) => alongX(v, 0, z, -l.halfW - 2, l.halfW + 2, r, 32);
    const cuts = p.version === 0 || p.version === 3
      ? [holeX(l.zc + q.keyholeOffset, q.bigLobe / 2), holeX(l.zc - q.keyholeOffset, q.smallLobe / 2), box([2 * l.halfW + 4, q.smallLobe, 2 * q.keyholeOffset], [0, 0, l.zc])]
      : [holeX(l.zc, q.bigLobe / 2)];
    // Two exposed dock-bolt holes above and below the cup.
    for (const z of [l.zc - 58, l.zc + 58]) cuts.push(alongY(v, 0, z, l.webY0 - 1, l.webY1 + 1, 3, 16));
    bracket = k(M.difference([bracket, ...cuts]));
    add(stainless ? 'QuickMount stainless steel bracket' : 'QuickMount 1/4 in steel bracket', bracket, 'source', ...steel);
    if (tab) add('QuickMount PM pulley point', tab, 'source', ...steel);
    // 3D-printed liners on the three faces that touch the upright.
    const linerZ = q.height - 10;
    const liners = [box([2 * l.face, q.liner, linerZ], [0, l.face + q.liner / 2, l.zc])];
    const linerHoles = k(M.union(p.version === 0 || p.version === 3 ? [holeX(l.zc + q.keyholeOffset, q.bigLobe / 2 + 1), holeX(l.zc - q.keyholeOffset, q.smallLobe / 2 + 1), box([2 * l.halfW + 4, q.smallLobe + 2, 2 * q.keyholeOffset], [0, 0, l.zc])] : [holeX(l.zc, q.bigLobe / 2 + 1)]));
    for (const s of [-1, 1]) liners.push(k(box([q.liner, l.face - l.flangeBack - 4, linerZ], [s * (l.face + q.liner / 2), (l.face + l.flangeBack + 4) / 2, l.zc]).subtract(linerHoles)));
    add('Printed plastic liners', k(M.union(liners)), 'liner', '#202225', 0, .85);
    // Magpin through the side faces, knurled knob outside the +X flange.
    const pin = p.pin ? 15.9 : q.magpin, [knobD, knobL] = q.knob;
    add(p.pin ? '5/8 in pin' : '0.98 in Magpin', alongX(v, 0, 0, -l.halfW - 3, l.halfW + 1, pin / 2, 32), 'fastener', '#c6c9cc', .85, .3);
    add('Magpin knurled knob', k(M.union([alongX(v, 0, 0, l.halfW + 1, l.halfW + knobL - 3, knobD / 2, 32), alongX(v, 0, 0, l.halfW + knobL - 3.01, l.halfW + knobL, knobD / 2 - 3, 32)])), 'handle', '#b9bdc0', .8, .45);
    if (p.handle) {
      const w = 2 * l.halfW - 8, t = q.handlePlate, y = l.webY1, bend = q.handleBend, loopY = y + bend;
      const plate = box([w, t, l.top - l.bottom - 8], [0, y + t / 2, (l.top + l.bottom + 8) / 2]);
      const lean = k(k(k(M.cube([w, t, bend * Math.SQRT2 + t], true)).rotate([-45, 0, 0])).translate([0, y + t / 2 + bend / 2, l.top + bend / 2]));
      const loop = k(roundXZ(v, 104, q.handleLoop, 14, 0, l.top + bend + q.handleLoop / 2, loopY - t / 2, t).subtract(roundXZ(v, 80, 66, 10, 0, l.top + bend + q.handleLoop / 2 + 4, loopY - t, 2 * t)));
      add('QuickMount Handle bent steel', k(M.union([plate, lean, loop])), 'source', '#111214', .45, .25);
      const [gw, gd, gh] = q.grip, gz = l.top + bend + q.handleLoop;
      add('QuickMount Handle knurled grip', v.round(gw, gd, gh, 6, [0, loopY, gz + gh / 2]), 'handle', '#1c1d1f', .1, .9);
      for (const x of [-22, 0, 22]) add('Grip logo and bolts', alongZ(v, x, loopY, gz + gh, gz + gh + 1.2, x ? 3.5 : 5.5, 24), 'source', '#8b8f93', .7, .4);
    }
    dockCup(v, 0, l.zc, l.base, q.cupDepth, q.cupRadius);
    addVoltra(api, v, p.orientation, s => k(s.translate([0, l.dockY, l.zc])));
  });
}

// ─── Beyond Power Strap Mount ────────────────────────────────────────────────────────────────────────────────────────
export function buildStrapMount(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BEYOND_POWER_STRAP_MOUNT.defaults, ...params }, l = strapLayout(p), s = STRAP_MOUNT;
  return vendorSolid(api, v => {
    const { C, keep: k, add, box } = v, [w, h, t] = s.plate;
    add('Magnetic dock plate', roundXZ(v, w, h, 14, 0, 0, l.plateY0, t), 'source', ...BP_GREY);
    for (const x of [-38, 38]) add('Rubber post pad', box([16, s.pad, h - 30], [x, l.face + s.pad / 2, 0]), 'liner', '#17181a', 0, .9);
    const { x0, x1, z, inner, thick } = s.loop;
    const loop = k(roundXZ(v, x1 - x0 + 10, 2 * z, 22, (x0 + x1 - 10) / 2 + 5, 0, l.plateY0 + 6, thick).subtract(roundXZ(v, inner[0], inner[1], 12, (x0 + x1) / 2 - 4, 0, l.plateY0, thick + 12)));
    add('D-loop carry handle', loop, 'handle', ...BP_DARK);
    // Strap: from the plate's side slots, back around the post; the cam buckle closes it behind the post.
    const R = l.ring, front = l.plateY0 + 10, st = s.strapThick;
    const outer = k(k(k(C.square([2 * R - 10, front + R - 10], true)).offset(5, 'Round', 16)).translate([0, (front - R) / 2]));
    const ring = k(k(outer.subtract(k(outer.offset(-st, 'Round', 16)))).extrude(s.strapWidth));
    const strap = k(k(ring.translate([0, 0, -s.strapWidth / 2])).subtract(box([2 * (R - st) - .4, 30, s.strapWidth + 2], [0, front + 10, 0])));
    add('Polyester strap', strap, 'liner', '#1b1c1e', 0, .92);
    const [bw, bd, bh] = s.buckle;
    add('Cam buckle', v.round(bw, bd, bh, 4, [0, l.back - bd / 2, 0]), 'source', ...BP_DARK);
    add('Buckle release lever', box([bw - 14, 3, bh * .55], [0, l.back - bd - 1.5, 6]), 'handle', '#6f7479', .8, .35);
    add('Excess strap roll', alongZ(v, bw / 2 + l.roll + 2, l.back - l.roll, -s.strapWidth / 2, s.strapWidth / 2, l.roll, 32), 'liner', '#1b1c1e', 0, .92);
    dockCup(v, 0, 0, l.plateY1, s.cupDepth, s.cupRadius);
    addVoltra(api, v, p.orientation, m => k(m.translate([0, l.dockY, 0])));
  });
}

// ─── Beyond Power Adaptive / Fixed Bar Mounts ────────────────────────────────────────────────────────────────────────
function addPeg(v: Scope, face: number) {
  const { keep: k, M } = v, r = RACK_PEG.rod / 2, cap = RACK_PEG.capDiameter / 2;
  const rod = alongY(v, 0, 0, -face - .5, face + RACK_PEG.proud, r, 32);
  const head = k(M.union([alongY(v, 0, 0, -face - RACK_PEG.cap, -face - 3, cap, 32), alongY(v, 0, 0, -face - 3.01, -face, cap - 3, 32)]));
  v.add('1 in rack peg (sold separately)', k(M.union([rod, head])), 'source', '#1c1d1f', .5, .55);
}
/** Clamp frame: bar along Y, knob up, dock down. `sideways` turns it a quarter about the peg so the dock faces +X. */
const clampPlacer = (v: Scope, y: number, sideways: boolean) => (m: Manifold) => sideways ? v.keep(v.keep(m.rotate([0, -90, 0])).translate([0, y, 0])) : v.keep(m.translate([0, y, 0]));
export function buildAdaptiveBarMount(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BEYOND_POWER_ADAPTIVE_BAR_MOUNT.defaults, ...params }, l = barMountLayout(p, false), a = ADAPTIVE_BAR;
  return vendorSolid(api, v => {
    const { M, C, keep: k, add, box } = v, place = clampPlacer(v, l.y, !!p.dock);
    const [bw, bd] = a.body, hw = bw / 2, top = a.bodyTop, [jw, jz0, jz1] = a.jaw;
    const outline: Vec2[] = [[-hw, a.bodyBottom], [hw, a.bodyBottom], [hw, top - a.roof], [hw - a.roof, top], [-hw + a.roof, top], [-hw, top - a.roof]];
    const body = k(plateXZ(v, outline, -bd / 2, bd).subtract(box([jw, bd + 2, jz1 - jz0], [0, 0, (jz0 + jz1) / 2])));
    add('Adaptive clamp aluminium body', place(body), 'source', ...BP_GREY);
    add('Lower nylon jaw', place(box([jw - 2, bd - 6, -RACK_PEG.rod / 2 - jz0 - .5], [0, 0, (jz0 - RACK_PEG.rod / 2 - .5) / 2])), 'liner', '#161719', 0, .8);
    add('Upper nylon jaw', place(box([jw - 4, bd - 6, jz1 - RACK_PEG.rod / 2 - .5], [0, 0, (jz1 + RACK_PEG.rod / 2 + .5) / 2])), 'liner', '#161719', 0, .8);
    const [kr, kh] = a.knob;
    add('Tightening knob', place(k(M.union([alongZ(v, 0, 0, top, top + kh - 4, kr, 24), alongZ(v, 0, 0, top + kh - 4.01, top + kh, kr - 4, 24)]))), 'handle', '#141517', .1, .7);
    add('Knob lock tab', place(box([12, 16, 3], [0, 0, top + kh + 1.5])), 'handle', '#2a2c2f', .2, .6);
    add('Side lock knob', place(alongX(v, 0, 22, -hw - 12, -hw, 11, 24)), 'handle', '#141517', .1, .7);
    add('Beyond Power badge', place(box([1, 30, 12], [hw + .5, 0, 8])), 'source', '#c9ccce', .6, .4);
    const [fw, fd, ft] = a.flange, fz = a.bodyBottom - ft;
    add('Quick-release dock flange', place(v.round(fw, fd, ft, 8, [0, 0, fz + ft / 2])), 'source', ...BP_GREY);
    for (const s of [-1, 1]) add('Flange hex bolt', place(alongX(v, 0, fz + ft / 2, s > 0 ? fw / 2 : -fw / 2 - 5, s > 0 ? fw / 2 + 5 : -fw / 2, 5, 6)), 'fastener', '#b9bcbf', .85, .3);
    // Retractable quick-release loop along the -Y end of the flange.
    const loop = k(k(k(k(C.square([76, 24], true)).subtract(k(C.square([66, 14], true)))).extrude(5)).translate([0, -fd / 2 - 10, fz + 1]));
    add('Quick-release loop', place(loop), 'handle', ...CHROME);
    add('VOLTRA I dock cup', place(alongZ(v, 0, 0, fz - a.cupDepth, fz, a.cupRadius, 64)), 'source', ...CHROME);
    addPeg(v, l.face);
    addVoltra(api, v, p.orientation, m => place(k(k(m.rotate([-90, 0, 0])).translate([0, 0, -l.dockOffset]))));
  });
}
export function buildFixedBarMount(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BEYOND_POWER_FIXED_BAR_MOUNT.defaults, ...params }, l = barMountLayout(p, true), f = FIXED_BAR;
  return vendorSolid(api, v => {
    const { M, keep: k, add, box } = v, place = clampPlacer(v, l.y, !!p.dock), [bw, bd] = f.body, hw = bw / 2;
    const bore = (r: number) => alongY(v, 0, 0, -bd, bd, r, 48);
    add('Fixed mount lower block', place(k(v.round(bw, bd, f.split - f.bottom, 10, [0, 0, (f.split + f.bottom) / 2]).subtract(bore(f.bore / 2)))), 'source', '#5c6064', .75, .34);
    const cap: Vec2[] = [[-hw, f.split], [hw, f.split], [hw, f.top - f.chamfer], [hw - f.chamfer, f.top], [-hw + f.chamfer, f.top], [-hw, f.top - f.chamfer]];
    add('Fixed mount clamp cap', place(k(plateXZ(v, cap, -bd / 2 + 4, bd - 8).subtract(bore(f.bore / 2)))), 'source', '#2f3235', .7, .36);
    add('1 in spacer shells', place(k(alongY(v, 0, 0, -bd / 2 + 2, bd / 2 - 2, f.bore / 2 - .3, 48).subtract(bore(RACK_PEG.rod / 2 + .3)))), 'liner', '#151618', 0, .8);
    for (const x of [-28, 28]) for (const y of [-44, 44]) add('Cap screw', place(alongZ(v, x, y, f.top - 1, f.top + 2.5, 4.5, 16)), 'fastener', '#b9bcbf', .85, .3);
    add('Beyond Power badge', place(box([1, 34, 14], [hw + .5, -bd / 4, (f.bottom + f.split) / 2])), 'source', '#c9ccce', .6, .4);
    add('VOLTRA I dock cup', place(alongZ(v, 0, 0, f.bottom - f.cupDepth, f.bottom, f.cupRadius, 64)), 'source', ...CHROME);
    addPeg(v, l.face);
    addVoltra(api, v, p.orientation, m => place(k(k(m.rotate([-90, 0, 0])).translate([0, 0, -l.dockOffset]))));
  });
}

// ─── Beyond Power Rotator on the Sliding Rack Mount ─────────────────────────────────────────────────────────────────
export function buildRotator(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BEYOND_POWER_ROTATOR.defaults, ...params }, l = rotatorLayout(), r = ROTATOR;
  return vendorSolid(api, v => {
    const { M, keep: k, add, box } = v;
    // The built-in Sliding Rack Mount (collar, height pin, controls and its dock), without its own device.
    const base: SolidPart[] = voltraBuild('voltra-sliding').build(api, { upright: p.upright ?? 75, orientation: 1, pinDiameter: p.pin ? 24.8 : 15.5 });
    let device = false;
    for (const part of base) {
      v.keep(part.solid);
      if (part.name === 'VOLTRA rounded housing') device = true;
      if (!device) v.add(part.name, part.solid, part.role, part.color, part.metalness, part.roughness);
    }
    const [rw, rh, rt] = r.rear;
    add('Rotator AnyMount base plate', roundXZ(v, rw, rh, 14, 0, 0, l.y0, rt), 'source', ...BP_GREY);
    add('Dual-lock release latch', box([...r.latch], [0, l.y0 + rt / 2, rh / 2 + r.latch[2] / 2 - 1]), 'handle', '#b8743f', .6, .4);
    const [at, al, ah] = r.arm;
    for (const s of [-1, 1]) {
      const x0 = s * r.armX, x1 = s * (r.armX + at), [lo, hi] = x0 < x1 ? [x0, x1] : [x1, x0];
      add('Rotator yoke arm', k(M.union([box([at, l.pivot - l.y0 - 8, ah], [(lo + hi) / 2, (l.pivot + l.y0 + 8) / 2, 0]), alongX(v, l.pivot, 0, lo, hi, ah / 2, 40)])), 'source', '#1f2022', .5, .45);
      add('Pivot bolt cap', alongX(v, l.pivot, 0, s > 0 ? hi : lo - 3, s > 0 ? hi + 3 : lo, 13, 24), 'fastener', '#b9bcbf', .85, .3);
    }
    // Pitching head: everything from here turns about the X axis through the pivot.
    const a = p.angle ?? 0, pitch = (m: Manifold) => k(k(k(m.translate([0, -l.pivot, 0])).rotate([a, 0, 0])).translate([0, l.pivot, 0]));
    const [hw, hh] = r.head;
    add('Rotator head', pitch(k(M.union([alongX(v, l.pivot, 0, -hw / 2, hw / 2, hh / 2, 48), v.round(hw, l.front - l.pivot, hh, 12, [0, (l.front + l.pivot) / 2, 0])]))), 'source', ...BP_GREY);
    add('Beyond Power badge', pitch(box([1, 30, 12], [hw / 2 + .5, l.pivot + 18, -20])), 'source', '#c9ccce', .6, .4);
    add('VOLTRA I dock cup', pitch(alongY(v, 0, 0, l.front, l.front + r.cupDepth, r.cupRadius, 64)), 'source', ...CHROME);
    addVoltra(api, v, p.orientation, m => pitch(k(m.translate([0, l.dockY, 0]))));
  });
}
