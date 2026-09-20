/** VOLTRA accessories and rack-mounted cable systems (#136). Metadata only (main bundle): never import Manifold builders here.
 * Builders: parts/rack-digital-cable.ts. Research, sources and every estimate: research/rack-digital-cable.md.
 *
 * Frame (rack-part.ts): origin on the upright centreline at the target hole, +Y out of the mounting face (face plane
 * y = upright / 2), X across the face, Z up. VOLTRA units reuse the built-in VOLTRA I device (parts/voltra.ts): a dock
 * centred on the mount, the device sticking out along the dock axis. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
const faceOf = (p: NumericParams) => (p.upright ?? 75) / 2;
const box = (min: Vec3, max: Vec3): LocalBox => ({ min, max });

// ─── VOLTRA I device (parts/voltra.ts geometry, measured from its build) ────────────────────────────────────────────
/** The built-in VOLTRA I device measured from its dock centre along the dock axis: back of the dock rim, reach to the
 * titanium connector eye, half length (long axis, incl. carry handle) and half height of the housing. */
export const VOLTRA = { dockBack: 8, reach: 183, screen: 96, halfLong: 161.5, halfShort: 69.5 } as const;
export const VOLTRA_ORIENTATIONS = ['Horizontal · screen left', 'Vertical · screen down', 'Horizontal · screen right', 'Vertical · screen up'] as const;
const orientationParam = { key: 'orientation', label: 'VOLTRA position', default: 1, options: [1, 2, 3, 4], format: (v: number) => VOLTRA_ORIENTATIONS[v - 1] ?? String(v) } as const;
/** Device half sizes across the dock axis after the quarter-turn: [along the long-axis direction X, along Z]. */
export const voltraHalf = (orientation: number) => orientation % 2 === 0 ? [VOLTRA.halfShort, VOLTRA.halfLong] as const : [VOLTRA.halfLong, VOLTRA.halfShort] as const;
/** Collision box of a VOLTRA docked at `dock` pointing +Y (the usual rack-face case). */
const voltraBoxY = (dock: Vec3, orientation: number): LocalBox => {
  const [hx, hz] = voltraHalf(orientation);
  return box([dock[0] - hx, dock[1] + VOLTRA.dockBack, dock[2] - hz], [dock[0] + hx, dock[1] + VOLTRA.reach, dock[2] + hz]);
};
const fitsThreeInch = (rack: RackDimensions, name: string) => {
  if (rack.tube < 74 || rack.tube > 77 || (rack.tubeDepth ?? rack.tube) !== rack.tube) throw Error(`${name} fits 3 x 3 in uprights only.`);
};
const beyondPower = (handle: string, product: string, reconstruction: string) => ({
  vendor: 'Beyond Power', url: `https://www.beyond-power.com/products/${handle}`, credit: `Beyond Power — ${product}`,
  trademark: 'VOLTRA and Beyond Power are trademarks of Beyond Power.', reconstruction,
});

// ─── Darko Lifting QuickMount Bracket for VOLTRA I ───────────────────────────────────────────────────────────────────
/** 1/4 in steel U-bracket lined with 3D-printed plastic that slips over a 3 x 3 upright; a Magpin passes side to side
 * through both flanges and the upright. The Beyond Power VOLTRA I dock bolts to the web. Sizes past the published
 * 1/4 in steel and 0.98 in Magpin are estimated from Darko's photos (research notes). */
export const QUICKMOUNT = { steel: inch(0.25), liner: 3, height: inch(5), keyholeOffset: 7, bigLobe: 26.5, smallLobe: 17, magpin: inch(0.98),
  knob: [38, 28] as const, cupRadius: 42, cupDepth: 26, handlePlate: 4.8, handleBend: 30, handleLoop: 96, grip: [112, 26, 22] as const,
  pmTab: [52, 58] as const, pmHole: 22 } as const;
export const QUICKMOUNT_VERSIONS = ['QuickMount · 1 in + 5/8 in keyhole · gloss black', 'QuickMount · 1 in hole only · gloss black', 'QuickMount · 1 in hole only · stainless steel', 'QuickMount PM · pulley point · gloss black'] as const;
export const QUICKMOUNT_PINS = ['0.98 in Magpin (1 in holes)', '5/8 in pin'] as const;
/** Keyhole versions sit the big lobe 7 mm above the bracket centre, the small lobe 7 mm below. */
const keyholeVersion = (p: NumericParams) => p.version === 0 || p.version === 3;
export function quickMountLayout(p: NumericParams) {
  const face = faceOf(p), q = QUICKMOUNT, webY0 = face + q.liner, webY1 = webY0 + q.steel, halfW = face + q.liner + q.steel;
  const zc = keyholeVersion(p) ? (p.pin === 1 ? q.keyholeOffset : -q.keyholeOffset) : 0;
  const base = webY1 + (p.handle ? q.handlePlate : 0), dockY = base + q.cupDepth + VOLTRA.dockBack;
  const top = zc + q.height / 2, bottom = zc - q.height / 2;
  const handleTop = top + q.handleBend + q.handleLoop + q.grip[2];
  return { face, webY0, webY1, halfW, zc, base, dockY, top, bottom, handleTop, flangeBack: -(face - 6), pmTop: top + q.pmTab[1] };
}
export const DARKO_QUICKMOUNT = defineRackPart({
  id: 'darko-quickmount-voltra', name: 'Darko QuickMount', title: 'Darko QuickMount Bracket for VOLTRA I', noun: 'quickmount bracket', section: 'Digital & cable',
  description: 'Magpin U-bracket that docks a Beyond Power VOLTRA I on a 3 x 3 upright · 1/4 in steel, printed liners · optional handle and PM pulley point. Independent reconstruction; Darko Lifting trademarks belong to Darko Lifting, VOLTRA to Beyond Power.',
  params: [
    { key: 'version', label: 'Version', default: 0, options: [0, 1, 2, 3], format: v => QUICKMOUNT_VERSIONS[v] ?? String(v) },
    // The 1 in hole only brackets have a single round hole for the 0.98 in Magpin.
    { key: 'pin', label: 'Pin', default: 0, options: p => keyholeVersion(p) ? [0, 1] : [0], format: v => QUICKMOUNT_PINS[v] ?? String(v) },
    { key: 'handle', label: 'QuickMount Handle', default: 0, options: [0, 1], format: v => v ? 'Bent steel handle' : 'None' },
    orientationParam,
  ],
  vendor: {
    vendor: 'Darko Lifting', url: 'https://darkolifting.com/products/quickmount-bracket-for-voltra',
    credit: 'Darko Lifting — QuickMount Bracket for VOLTRA I · designed by Dr_TattyWaffles', trademark: 'Darko Lifting products shown with credit; VOLTRA and Beyond Power are trademarks of Beyond Power.',
    reconstruction: 'Published 1/4 in steel, printed plastic liners, 0.98 in Magpin, 1 in and 5/8 in racks, black or stainless. Bracket outline, keyhole, liner, dock cup, handle and PM tab sizes estimated from Darko photos; physical fit unverified.',
  },
  mount: {
    pin: p => p.pin ? PIN_5_8IN : PIN_1IN, pinAxis: 'across', mainStations: true,
    extent: p => {
      const l = quickMountLayout(p), [, hz] = voltraHalf(p.orientation ?? 1);
      return { below: Math.max(hz, QUICKMOUNT.height / 2) - l.zc + 2, above: Math.max(hz + l.zc, l.top, p.handle ? l.handleTop : -Infinity, p.version === 3 ? l.pmTop : -Infinity) + 2 };
    },
    validate: rack => fitsThreeInch(rack, 'The QuickMount'),
  },
  bodies: p => {
    const l = quickMountLayout(p), q = QUICKMOUNT;
    const out = [
      box([-l.halfW, l.webY0, l.bottom], [l.halfW, l.webY1, l.top]),
      box([l.face + q.liner, l.flangeBack, l.bottom], [l.halfW, l.webY1, l.top]),
      box([-l.halfW, l.flangeBack, l.bottom], [-(l.face + q.liner), l.webY1, l.top]),
      box([-q.cupRadius, l.base, l.zc - q.cupRadius], [q.cupRadius, l.dockY - VOLTRA.dockBack, l.zc + q.cupRadius]),
      voltraBoxY([0, l.dockY, l.zc], p.orientation ?? 1),
    ];
    if (p.handle) out.push(box([-q.grip[0] / 2, l.webY1 + 20, l.top + q.handleBend], [q.grip[0] / 2, l.webY1 + 52, l.handleTop]));
    if (p.version === 3) out.push(box([-q.pmTab[0] / 2, l.webY0, l.top], [q.pmTab[0] / 2, l.webY1, l.pmTop]));
    return out;
  },
  pair: { default: false },
  placement: { height: 1115, face: 'front' },
  autoFit: rack => ({ pin: rack.holeDiameter < 20 ? 1 : 0 }),
  family: 'voltra',
});

// ─── Beyond Power VOLTRA Strap Mount ─────────────────────────────────────────────────────────────────────────────────
/** Magnetic backplate with a D-loop handle and a VOLTRA dock; a 50 mm polyester strap wraps the post and closes in a
 * cam buckle. Published: 0.5 m and 1 m straps, posts from 80 mm round or 70 x 70 mm square. Sizes estimated. */
export const STRAP_MOUNT = { plate: [120, 130, 22] as const, pad: 2, loop: { x0: -125, x1: -55, z: 60, inner: [46, 88] as const, thick: 14 },
  strapWidth: 50, strapThick: 2.5, gap: 1.5, cupRadius: 41, cupDepth: 6, buckle: [56, 14, 60] as const, minSquare: 70 } as const;
export const STRAP_LENGTHS = [500, 1000] as const;
export function strapLayout(p: NumericParams) {
  const face = faceOf(p), s = STRAP_MOUNT, plateY0 = face + s.pad, plateY1 = plateY0 + s.plate[2];
  const ring = face + s.gap + s.strapThick, back = -ring;
  // Strap path: from the plate's side slots back around the post (two sides and the rear face), then the cam buckle.
  const used = 2 * (plateY0 + ring) + 2 * ring + s.buckle[0];
  const tail = Math.max(0, (STRAP_LENGTHS[p.strap ?? 0] ?? 500) - used);
  const roll = Math.sqrt(36 + s.strapThick * tail / Math.PI);
  return { face, plateY0, plateY1, dockY: plateY1 + s.cupDepth + VOLTRA.dockBack, ring, back, tail, roll };
}
export const BEYOND_POWER_STRAP_MOUNT = defineRackPart({
  id: 'beyond-power-voltra-strap-mount', name: 'VOLTRA Strap Mount', title: 'Beyond Power VOLTRA Strap Mount', noun: 'strap mount', section: 'Digital & cable',
  description: 'Strap-on VOLTRA I dock for any post 70 x 70 mm and up · magnetic backplate, D-loop handle, 0.5 m or 1 m polyester strap with a dual-lock dock. Independent reconstruction; Beyond Power trademarks belong to Beyond Power.',
  params: [
    { key: 'strap', label: 'Strap', default: 0, options: [0, 1], format: v => v ? '1 m strap (excess rolled)' : '0.5 m strap' },
    orientationParam,
  ],
  vendor: beyondPower('strap-mount', 'VOLTRA Strap Mount', 'Published 0.5 m / 1 m polyester strap, aluminium and titanium, magnetic backplate and minimum 80 mm round / 70 x 70 mm square post. Plate, handle loop, buckle and dock sizes estimated from Beyond Power photos; physical fit unverified.'),
  // No rack pin: the strap wraps the post, so any hole height works.
  mount: {
    pin: 0,
    extent: p => { const [, hz] = voltraHalf(p.orientation ?? 1); return { below: Math.max(hz, STRAP_MOUNT.plate[1] / 2) + 2, above: Math.max(hz, STRAP_MOUNT.plate[1] / 2) + 2 }; },
    validate: rack => { if (rack.tube < STRAP_MOUNT.minSquare) throw Error('The Strap Mount needs a post at least 70 x 70 mm to fit.'); },
  },
  bodies: p => {
    const l = strapLayout(p), s = STRAP_MOUNT, [w, h] = s.plate;
    return [
      box([-w / 2, l.plateY0, -h / 2], [w / 2, l.plateY1, h / 2]),
      box([s.loop.x0, l.plateY0 + 6, -s.loop.z], [-w / 2, l.plateY0 + 6 + s.loop.thick, s.loop.z]),
      box([-s.cupRadius, l.plateY1, -s.cupRadius], [s.cupRadius, l.dockY - VOLTRA.dockBack, s.cupRadius]),
      voltraBoxY([0, l.dockY, 0], p.orientation ?? 1),
      box([-s.buckle[0] / 2, l.back - s.buckle[1], -s.buckle[2] / 2], [s.buckle[0] / 2, l.back, s.buckle[2] / 2]),
    ];
  },
  pair: { default: false },
  placement: { height: 1115, face: 'front' },
  family: 'voltra',
});

// ─── Beyond Power Adaptive and Fixed Bar Mounts (clamped on a 1 in rack peg) ────────────────────────────────────────
/** Both bar mounts clamp a round bar and dock the VOLTRA under or beside it. On a rack they clamp a 1 in band / storage
 * peg in an upright hole, as in Beyond Power's own gallery; the peg (Rogue Monster Band Peg 2.0 proportions: 1 in rod,
 * 7-3/8 in proud of the face, 5/8 in cap) is shown and sold separately. */
export const RACK_PEG = { rod: inch(1), proud: inch(7.375), cap: inch(0.625), capDiameter: inch(1.5), clampAt: 120 } as const;
/** Published 245 x 103 x 97 mm, 16–51 mm bars; body, jaw and knob proportions from the dimension drawing. */
export const ADAPTIVE_BAR = { body: [94, 70] as const, bodyBottom: -20, bodyTop: 63, roof: 25, jaw: [52, -18, 40] as const, knob: [31, 49] as const,
  flange: [105, 97, 12] as const, cupRadius: 40, cupDepth: 8 } as const;
/** Fixed Bar Mount: published 1–2 in bars; body proportions from the 1 in / 2 in drawing, the 1 in spacer shells fitted. */
export const FIXED_BAR = { body: [110, 125] as const, bottom: -29, split: 10, top: 52, chamfer: 18, bore: inch(2), cupRadius: 44, cupDepth: 19 } as const;
export const BAR_DOCKS = ['Dock down · VOLTRA hangs under the peg', 'Dock sideways · VOLTRA beside the peg'] as const;
/** Dock point and axis of a bar mount (clamp centred on the peg at `clampAt` from the face). */
export function barMountLayout(p: NumericParams, fixed: boolean) {
  const face = faceOf(p), y = face + RACK_PEG.clampAt;
  const drop = fixed ? -(FIXED_BAR.bottom - FIXED_BAR.cupDepth) : -(ADAPTIVE_BAR.bodyBottom - ADAPTIVE_BAR.flange[2] - ADAPTIVE_BAR.cupDepth);
  const dockOffset = drop + VOLTRA.dockBack;
  return { face, y, dockOffset, dock: (p.dock ? [dockOffset, y, 0] : [0, y, -dockOffset]) as Vec3 };
}
const barBodies = (p: NumericParams, fixed: boolean): LocalBox[] => {
  const l = barMountLayout(p, fixed), [hx, hz] = voltraHalf(p.orientation ?? 1), r = RACK_PEG.rod / 2, faceY = l.face;
  const halfW = fixed ? FIXED_BAR.body[0] / 2 : ADAPTIVE_BAR.flange[0] / 2, halfD = fixed ? FIXED_BAR.body[1] / 2 : ADAPTIVE_BAR.flange[1] / 2;
  const top = fixed ? FIXED_BAR.top : ADAPTIVE_BAR.bodyTop + ADAPTIVE_BAR.knob[1];
  const clamp: LocalBox = p.dock ? box([-top, l.y - halfD, -halfW], [l.dockOffset - VOLTRA.dockBack, l.y + halfD, halfW]) : box([-halfW, l.y - halfD, -(l.dockOffset - VOLTRA.dockBack)], [halfW, l.y + halfD, top]);
  // Hanging: dock axis -Z, the device's long axis along X (or Y), its height along the peg. Sideways: dock axis +X.
  const device: LocalBox = p.dock
    ? box([l.dockOffset + VOLTRA.dockBack, l.y - hz, -hx], [l.dockOffset + VOLTRA.reach, l.y + hz, hx])
    : box([-hx, l.y - hz, -(l.dockOffset + VOLTRA.reach)], [hx, l.y + hz, -(l.dockOffset + VOLTRA.dockBack)]);
  return [box([-r, faceY, -r], [r, faceY + RACK_PEG.proud, r]), box([-RACK_PEG.capDiameter / 2, -faceY - RACK_PEG.cap, -RACK_PEG.capDiameter / 2], [RACK_PEG.capDiameter / 2, -faceY, RACK_PEG.capDiameter / 2]), clamp, device];
};
/** Hanging: the device reaches down from the dock, the knob or cap up. Sideways: the clamp and device share the peg height. */
const barExtent = (p: NumericParams, fixed: boolean) => {
  const l = barMountLayout(p, fixed), [hx] = voltraHalf(p.orientation ?? 1), cap = RACK_PEG.capDiameter / 2;
  const top = fixed ? FIXED_BAR.top : ADAPTIVE_BAR.bodyTop + ADAPTIVE_BAR.knob[1], halfW = fixed ? FIXED_BAR.body[0] / 2 : ADAPTIVE_BAR.flange[0] / 2;
  if (p.dock) { const h = Math.max(hx, halfW, cap) + 2; return { below: h, above: h }; }
  return { below: l.dockOffset + VOLTRA.reach + 2, above: Math.max(top, cap) + 2 };
};
const barDockParams = [
  { key: 'dock', label: 'Dock', default: 0, options: [0, 1], format: (v: number) => BAR_DOCKS[v] ?? String(v) },
  // Hanging under the peg, a device turned along the peg would hit the upright; only the across-face turns fit.
  { key: 'orientation', label: 'VOLTRA position', default: 1, options: (p: NumericParams) => p.dock ? [1, 2, 3, 4] : [1, 3], format: (v: number) => VOLTRA_ORIENTATIONS[v - 1] ?? String(v) },
] as const;
export const BEYOND_POWER_ADAPTIVE_BAR_MOUNT = defineRackPart({
  id: 'beyond-power-adaptive-bar-mount', name: 'VOLTRA Adaptive Bar Mount', title: 'Beyond Power Adaptive VOLTRA Bar Mount', noun: 'bar mount', section: 'Digital & cable',
  description: 'Tool-free VOLTRA I bar clamp for 16–51 mm bars, shown on a 1 in rack peg (sold separately) · 245 × 103 × 97 mm, 1.88 kg, knob-driven jaws, quick-release dock. Independent reconstruction; Beyond Power trademarks belong to Beyond Power.',
  params: barDockParams,
  vendor: beyondPower('adaptive-bar-mount', 'Adaptive Bar Mount', 'Published 245 × 103 × 97 mm, 1.88 kg, 16–51 mm (0.6–2 in) clamp range, aluminium, stainless, nylon and rubber, 127 mm / 88 mm knob-to-jaw drawing. Jaw, knob, dock and quick-release loop sizes estimated; the 1 in peg it clamps is a separate rack peg. Physical fit unverified.'),
  mount: { pin: PIN_1IN, extent: p => barExtent(p, false) },
  bodies: p => barBodies(p, false),
  pair: { default: false },
  placement: { height: 1665, face: 'front' },
  family: 'voltra',
});
export const BEYOND_POWER_FIXED_BAR_MOUNT = defineRackPart({
  id: 'beyond-power-fixed-bar-mount', name: 'VOLTRA Fixed Bar Mount', title: 'Beyond Power Fixed VOLTRA Bar Mount', noun: 'bar mount', section: 'Digital & cable',
  description: 'Split aluminium VOLTRA I bar clamp for 1–2 in bars with the 1 in spacer shells, shown on a 1 in rack peg (sold separately) · four-screw cap, dock underneath. Independent reconstruction; Beyond Power trademarks belong to Beyond Power.',
  params: barDockParams,
  vendor: beyondPower('bar-mount', 'Fixed Bar Mount', 'Published 1–2 in (25.4–50.8 mm) bar range, aluminium alloy, 239 × 161 × 126 mm package and the 1 in / 2 in spacer drawing. Body, cap, screws and dock sizes estimated from Beyond Power photos; the 1 in peg it clamps is a separate rack peg. Physical fit unverified.'),
  mount: { pin: PIN_1IN, extent: p => barExtent(p, true) },
  bodies: p => barBodies(p, true),
  pair: { default: false },
  placement: { height: 1665, face: 'front' },
  family: 'voltra',
});

// ─── Beyond Power Rotator Add-on (on the Sliding Rack Mount) ────────────────────────────────────────────────────────
/** Docks into any AnyMount and carries its own dock on a pitching head (120° travel). Shown on Beyond Power's Sliding
 * Rack Mount, as in its gallery; the sliding collar, pin and dock are the built-in voltra-sliding geometry. */
export const ROTATOR = { baseDock: 94, rear: [112, 112, 16] as const, arm: [10, 92, 84] as const, armX: 50, pivotY: 72, head: [98, 96] as const, headFront: 116,
  cupDepth: 6, cupRadius: 41, latch: [22, 10, 8] as const, collar: [197, 157, 94] as const } as const;
export const ROTATOR_ANGLES = [-60, -30, 0, 30, 60] as const;
/** Rotator frame from the sliding dock face (y = baseDock + dockBack): pivot and front dock, before the head pitch. */
export function rotatorLayout() {
  const r = ROTATOR, y0 = r.baseDock + VOLTRA.dockBack, pivot = y0 + r.pivotY, front = y0 + r.headFront, dockY = front + r.cupDepth + VOLTRA.dockBack;
  return { y0, pivot, front, dockY };
}
/** Pitched device envelope (Y, Z) from the pivot, conservative box over the rotated half sizes. */
function rotatedDevice(p: NumericParams, inner = false): LocalBox {
  const l = rotatorLayout(), [hx, hz] = voltraHalf(p.orientation ?? 1), a = (p.angle ?? 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const ys: number[] = [], zs: number[] = [];
  // Housing (dock rim to screen) at full height, then the slim cable outlet and connector out to the reach.
  // `inner` keeps the collision body inside the rounded housing (bodies must sit inside the solids); the outer outline
  // bounds every solid for the hole limits.
  const d = l.dockY - l.pivot, zi = hz - 25;
  const outline: [number, number][] = inner ? [[d + 14, -zi], [d + 14, zi], [d + 90, -zi], [d + 90, zi]]
    : [[d - VOLTRA.dockBack - 4, -hz], [d - VOLTRA.dockBack - 4, hz], [d + VOLTRA.screen, -hz], [d + VOLTRA.screen, hz], [d + VOLTRA.reach, -16], [d + VOLTRA.reach, 16]];
  for (const [y, z] of outline) { ys.push(l.pivot + y * c - z * s); zs.push(y * s + z * c); }
  const w = inner ? hx - 25 : hx;
  return box([-w, Math.min(...ys), Math.min(...zs)], [w, Math.max(...ys), Math.max(...zs)]);
}
export const BEYOND_POWER_ROTATOR = defineRackPart({
  id: 'beyond-power-voltra-rotator', name: 'VOLTRA Rotator', title: 'Beyond Power Rotator VOLTRA Add-on', noun: 'rotator', section: 'Digital & cable',
  description: '120° pitching VOLTRA I adapter over any AnyMount, shown on the Sliding Rack Mount · aluminium and hardened steel, dual-lock, rated 20,000 rotations. Independent reconstruction; Beyond Power trademarks belong to Beyond Power.',
  params: [
    { key: 'angle', label: 'Head angle', default: 0, options: ROTATOR_ANGLES, format: v => v ? `${v > 0 ? 'Up' : 'Down'} ${Math.abs(v)}°` : 'Level' },
    orientationParam,
    { key: 'pin', label: 'Sliding mount pin', default: 1, options: [0, 1], format: v => v ? '1 in pin' : '5/8 in pin' },
  ],
  vendor: beyondPower('rotator-add-on', 'Rotator Add-on (on the Sliding Rack Mount)', 'Published 120° rotation, aerospace aluminium and hardened steel, 20,000-rotation test, 203 × 171 × 164 mm package. Yoke, head, latch and dock sizes estimated from Beyond Power renders; sliding mount is the built-in reconstruction. Physical fit unverified.'),
  mount: {
    pin: p => p.pin ? PIN_1IN : PIN_5_8IN, pinAxis: 'across', mainStations: true,
    extent: p => { const d = rotatedDevice(p); const h = Math.max(ROTATOR.collar[2] / 2, ROTATOR.rear[1] / 2 + ROTATOR.latch[2]); return { below: Math.max(-d.min[2], h) + 2, above: Math.max(d.max[2], h) + 2 }; },
    validate: rack => fitsThreeInch(rack, 'The Sliding Rack Mount'),
  },
  bodies: p => {
    const face = faceOf(p), [cx, cy, cz] = ROTATOR.collar, l = rotatorLayout(), wall = (cx - (p.upright ?? 75) - 4) / 2;
    return [
      box([-cx / 2, face + 2, -cz / 2], [cx / 2, cy / 2, cz / 2]),
      box([-cx / 2, -cy / 2, -cz / 2], [cx / 2, -face - 2, cz / 2]),
      box([-cx / 2, -face - 2, -cz / 2], [-cx / 2 + wall, face + 2, cz / 2]),
      box([cx / 2 - wall, -face - 2, -cz / 2], [cx / 2, face + 2, cz / 2]),
      box([-ROTATOR.rear[0] / 2, l.y0, -ROTATOR.rear[1] / 2], [ROTATOR.rear[0] / 2, l.front, ROTATOR.rear[1] / 2]),
      rotatedDevice(p, true),
    ];
  },
  pair: { default: false },
  placement: { height: 1115, face: 'front' },
  autoFit: rack => ({ pin: rack.holeDiameter < 20 ? 0 : 1 }),
  family: 'voltra',
});

// ─── Bullet Proof Fitness VTS (Versa Trolley System) ────────────────────────────────────────────────────────────────
/** Trolley that rolls on the upright on eight UHMW rollers and clamps your own barbell; an aluminium latch hook drops
 * into an upright hole to park it. Published: 6.7 in body, 8.78 in / 10.57 in (with the top eye) tall, 9.13 in and
 * 12.3 in overall depths, 15.25 in weight horn, 27 in with the horn. Frame: the mounting face is the side face the latch
 * hooks into (the outer side of the rack); the barbell runs along +Y past the front of the post (local -X). */
export const VTS = { height: inch(8.78), eye: inch(10.57) - inch(8.78), width: inch(6.7), depth: inch(12.3), portReach: inch(9.13) - inch(6.7),
  overall: inch(27), horn: inch(15.25), hornDiameter: 50, centreDrop: 132, bar: 28.5, clampX: 172, plate: 8, roller: [16, 50] as const, hex: 32 } as const;
/** Horn socket boss + collar between the +Y side plate and the sleeve: the published 27 in minus body, ports and horn. */
export const VTS_HORN_SOCKET = VTS.overall - VTS.width - VTS.portReach - VTS.horn;
export const VTS_POSTS = ['3 x 3 in posts', '2 x 2 in posts'] as const;
export const VTS_HORNS = ['No weight horn', 'VTS 12 in weight horn', 'VTS 9 in weight horn'] as const;
/** Trolley layout: post opening, body X range (front = -X), side plates on ±Y, clamp jaws ahead of the body. */
export function vtsLayout(p: NumericParams) {
  const face = faceOf(p), zc = -VTS.centreDrop, back = face + 47, front = -(face + 72), half = VTS.width / 2;
  return { face, zc, back, front, half, top: zc + VTS.height / 2, bottom: zc - VTS.height / 2, jawEnd: back - VTS.depth, barX: -VTS.clampX, barZ: zc + 22 };
}
/** Sleeve length from the collar: the drawing's 15.25 in for the 12 in horn, 3 in shorter for the 9 in horn. */
export const vtsHornLength = (p: NumericParams) => p.horn === 1 ? VTS.horn : p.horn === 2 ? VTS.horn - inch(3) : 0;
export const BULLETPROOF_VTS = defineRackPart({
  id: 'bulletproof-vts', name: 'Bulletproof VTS', title: 'Bullet Proof Fitness VTS Rack Attachment', noun: 'trolley', section: 'Digital & cable',
  description: 'Versa Trolley System: rack-riding trolleys on eight UHMW rollers that clamp your own barbell into a rack smith machine, with latch hooks and hex ports · 6.7 × 8.78 in body, 12.3 in deep, 27 in with the horn. Independent reconstruction; Bullet Proof Fitness trademarks belong to Bullet Proof Fitness Equipment.',
  params: [
    { key: 'post', label: 'Upright size', default: 0, options: [0, 1], format: v => VTS_POSTS[v] ?? String(v) },
    { key: 'horn', label: 'Hex-port attachment', default: 0, options: [0, 1, 2], format: v => VTS_HORNS[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'Bullet Proof Fitness Equipment', url: 'https://bulletprooffitnessequipment.com/products/vts-rack-attachment-pair-1',
    credit: 'Bullet Proof Fitness Equipment — VTS Rack Attachment (pair)', trademark: 'VTS, ISOLATOR and Bulletproof are trademarks of Bullet Proof Fitness Equipment.',
    reconstruction: 'Published 6.7 in (170.2 mm) body, 8.78 in (223 mm) / 10.57 in (268.5 mm) heights, 9.13 in / 12.3 in depths, 15.25 in horn and 27 in overall; eight UHMW rollers, two latch hooks per pair. Plate outlines, hex ports, clamp jaws and latch hook shape estimated from BPF renders; physical fit unverified.',
  },
  mount: {
    pin: PIN_5_8IN,
    extent: p => { const l = vtsLayout(p); return { below: -l.bottom + 2, above: Math.max(l.top + VTS.eye, 24) + 2 }; },
    validate: (rack, p) => {
      const want = p.post === 1 ? inch(2) : inch(3);
      if (Math.abs(rack.tube - want) > 1.5 || (rack.tubeDepth ?? rack.tube) !== rack.tube) throw Error(`This VTS pair fits ${VTS_POSTS[p.post ?? 0]}; choose the matching upright size.`);
    },
  },
  bodies: p => {
    const l = vtsLayout(p), hx = (lo: number, hi: number): [number, number] => p.mirror === 1 ? [-hi, -lo] : [lo, hi];
    const b = (x: [number, number], y0: number, y1: number, z0: number, z1: number) => box([x[0], y0, z0], [x[1], y1, z1]);
    const out = [
      b(hx(l.front, l.back), l.half - VTS.plate, l.half, l.bottom, l.top),
      b(hx(l.front, l.back), -l.half, -l.half + VTS.plate, l.bottom, l.top),
      b(hx(l.front, -l.face - 1), -l.half, l.half, l.bottom, l.top),
      b(hx(l.face + 1, l.back), -l.half + VTS.plate, l.half - VTS.plate, l.bottom + 20, l.top - 20),
      b(hx(l.jawEnd, l.front), -34, 34, l.barZ - 50, l.barZ + 36),
    ];
    const horn = vtsHornLength(p);
    if (horn) out.push(b(hx(-80 - VTS.hornDiameter / 2 + 2, -80 + VTS.hornDiameter / 2 - 2), l.half + VTS_HORN_SOCKET, l.half + VTS_HORN_SOCKET + horn, l.zc - VTS.hornDiameter / 2 + 2, l.zc + VTS.hornDiameter / 2 - 2));
    return out;
  },
  pair: { default: true },
  handed: true,
  placement: { height: 1115, face: 'outside' },
  autoFit: rack => ({ post: rack.tube < 60 ? 1 : 0 }),
});

// ─── Bullet Proof Fitness ISOLATOR 3x3 ───────────────────────────────────────────────────────────────────────────────
/** Pinned carriage on the upright carrying a rotating hex shaft: a 360° pull-pin dial and pad arm on one side (seat /
 * preacher pad, long leg pad, curl arm with eye loops) and a plate-loaded weight arm on the other. Published: base unit
 * with carriage, weight holder and two universal pins (1/2, 5/8, 3/4 or 1 in), black or white; seat/pad, long pad and
 * curl arm included. Sizes estimated from BPF renders against the 3 x 3 upright. */
export const ISOLATOR = { sleeve: [-130, 75] as const, wall: 7, block: [110, 78, -120, 70] as const, shaftY: 58, shaftZ: 45, shaft: 38, shaftSpan: [-250, 150] as const,
  dial: [62, 10] as const, dialX: -128, hubX: -150, padArm: 50.8, padArmLength: 360, padArmTilt: 18, seat: [400, 250, 62] as const, seatGap: 28,
  roller: [45, 260] as const, curlZ: -95, curlLength: 250, weightArmX: 70, weightArmLength: 330, horn: [25, 250] as const, hornZ: -235 } as const;
export const ISOLATOR_FRAMES = ['Black', 'White'] as const;
export const ISOLATOR_PADS = ['Black grip vinyl', 'Bright red grip vinyl'] as const;
export function isolatorLayout(p: NumericParams) {
  const face = faceOf(p), i = ISOLATOR, y = face + i.shaftY, s = p.side ? -1 : 1, tilt = i.padArmTilt * Math.PI / 180;
  const foot: [number, number] = [i.hubX - Math.sin(tilt) * i.padArmLength, i.shaftZ - Math.cos(tilt) * i.padArmLength];
  const seatZ = i.shaftZ + i.seatGap;
  return { face, y, s, tilt, foot, seatZ, seatX: i.hubX + 30 - i.seat[0] / 2 };
}
export const BULLETPROOF_ISOLATOR = defineRackPart({
  id: 'bulletproof-isolator-3x3', name: 'Bulletproof ISOLATOR', title: 'Bullet Proof Fitness ISOLATOR 3x3', noun: 'isolator', section: 'Digital & cable',
  description: 'Rack-pinned isolation lever for 3 x 3 posts: rotating shaft with a 360° pull-pin dial, seat/preacher pad, long leg pad, curl arm and a plate-loaded weight arm; VOLTRA ready with the ISOLATOR Cam. Independent reconstruction; Bullet Proof Fitness trademarks belong to Bullet Proof Fitness Equipment.',
  params: [
    { key: 'frame', label: 'Frame colour', default: 0, options: [0, 1], format: v => ISOLATOR_FRAMES[v] ?? String(v) },
    { key: 'pads', label: 'Pads', default: 0, options: [0, 1], format: v => ISOLATOR_PADS[v] ?? String(v) },
    { key: 'side', label: 'Pad side', default: 0, options: [0, 1], format: v => v ? 'Pads to the right' : 'Pads to the left' },
    { key: 'pin', label: 'Universal pins', default: 0, options: [0, 1], format: v => v ? '5/8 in pins + reducer plates' : '1 in pins' },
  ],
  vendor: {
    vendor: 'Bullet Proof Fitness Equipment', url: 'https://bulletprooffitnessequipment.com/products/isolator-3x3_',
    credit: 'Bullet Proof Fitness Equipment — ISOLATOR 3x3', trademark: 'VTS, ISOLATOR and Bulletproof are trademarks of Bullet Proof Fitness Equipment.',
    reconstruction: 'Published contents (carriage, weight holder, two universal pins, preacher pad/seat, long leg pad, curl arm), 3x3 fit, 1 in carriage bore with reducer plates, black or white frame and pad colours. All sizes estimated from BPF renders against the 3 in upright; physical fit unverified.',
  },
  mount: {
    pin: p => p.pin ? PIN_5_8IN : PIN_1IN, holes: [0, -2], mainStations: true,
    extent: p => { const l = isolatorLayout(p); return { below: -l.foot[1] + ISOLATOR.roller[0] + 4, above: l.seatZ + ISOLATOR.seat[2] + 4 }; },
    validate: rack => fitsThreeInch(rack, 'The ISOLATOR 3x3'),
  },
  bodies: p => {
    const l = isolatorLayout(p), i = ISOLATOR, x = (a: number, b: number): [number, number] => l.s > 0 ? [a, b] : [-b, -a];
    const b = (xs: [number, number], y0: number, y1: number, z0: number, z1: number) => box([xs[0], y0, z0], [xs[1], y1, z1]);
    const [sw, sd, sh] = i.seat, [rr, rl] = i.roller, [bw, bd, bz0, bz1] = i.block;
    return [
      b(x(-bw / 2, bw / 2), l.face + i.wall + 1, l.face + bd, bz0, bz1),
      b(x(l.seatX - sw / 2 + 5, l.seatX + sw / 2 - 5), l.y - sd / 2 + 5, l.y + sd / 2 - 5, l.seatZ + 4, l.seatZ + sh - 4),
      b(x(l.foot[0] - rl, l.foot[0] - 12), l.y - rr + 4, l.y + rr - 4, l.foot[1] - rr + 4, l.foot[1] + rr - 4),
      b(x(i.weightArmX - 24, i.weightArmX + 24), l.y - 24, l.y + 24, i.shaftZ - i.weightArmLength + 4, i.shaftZ),
      b(x(i.weightArmX + 30, i.weightArmX + 26 + i.horn[1]), l.y - i.horn[0] + 2, l.y + i.horn[0] - 2, i.hornZ - i.horn[0] + 2, i.hornZ + i.horn[0] - 2),
    ];
  },
  pair: { default: false },
  placement: { height: 915, face: 'front' },
  autoFit: rack => ({ pin: rack.holeDiameter < 20 ? 1 : 0 }),
});

export const PARTS = [DARKO_QUICKMOUNT, BEYOND_POWER_ADAPTIVE_BAR_MOUNT, BULLETPROOF_VTS, BEYOND_POWER_STRAP_MOUNT, BULLETPROOF_ISOLATOR, BEYOND_POWER_ROTATOR, BEYOND_POWER_FIXED_BAR_MOUNT] as const satisfies readonly RackPart[];
