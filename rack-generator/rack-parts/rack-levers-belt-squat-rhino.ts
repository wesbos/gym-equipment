/** Rogue Monster Rhino Belt Squat Drop-In (#135). Metadata only (main bundle): never import Manifold builders here.
 * The drop-in fills the bottom of one Monster bay: pulley-deck platform between the uprights, a 78.5" trolley tower
 * outside the uprights nearest it, and two lever arms hinged on those uprights' outer faces at the floor. It is placed
 * on the lowest hole of one of those uprights (the lever hinge bolt) and spans the published 43" inside width to the
 * next upright. Research: research/rack-levers-belt-squat.md. Builder: parts/rack-levers-belt-squat-rhino.ts. */
import { defineRackPart, PIN_1IN } from '../rack-part.ts';
import { PLATE_SPECS, plateStackLength, type PlateId } from '../plates.ts';
import type { LocalBox, NumericParams, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
/** Published: 48.5" deep x 49" wide x 78.5" tall, 21.5" past the uprights, 26 x 48.5" platform 7" high, 3x6 tower,
 * 3x3 lever arms on 1" x 5.56" hinge shafts, 15.75" stainless weight posts, 6" deck pulley, 1/4" cable, 43" inside width.
 * Arm length, hinge height, horn post and trolley park height estimated from the spec drawings and manual. */
export const RHINO = {
  inside: inch(43), floor: inch(2.5), platform: [inch(48.5), inch(26)] as const, deckTop: inch(7), rail: [inch(1), inch(3)] as const, tread: inch(0.125),
  towerHeight: inch(78.5), tower: [inch(3), inch(6)] as const, reach: inch(21.5), towerAhead: 394, footPlate: [300, 258] as const,
  arm: inch(50), armTube: inch(3), hingeZ: inch(4), hingeAhead: 45, lean: 12, crossA: 305, crossN: 100, hornLean: 18, hornPost: 210, hornBlock: 22,
  handleA: [950, 1180] as const, handleReach: 300, handleOD: inch(1.25), post: inch(15.75), postDiameter: 50, trolley: [inch(10), inch(8)] as const, exitBack: 330,
} as const;
export const RHINO_POSES = [{ name: 'Engaged · horn under the trolley', lean: RHINO.lean }, { name: 'Released · arms back', lean: 0 }] as const;
export const RHINO_SIDES = ['Bay to the right', 'Bay to the left'] as const;
export const RHINO_LOADS: readonly { label: string; plates: readonly PlateId[] }[] = [
  { label: 'Empty', plates: [] },
  { label: '45 lb each side', plates: ['lb45'] },
  { label: '2 × 45 lb each side', plates: ['lb45', 'lb45'] },
  { label: '4 × 45 lb each side', plates: ['lb45', 'lb45', 'lb45', 'lb45'] },
  { label: '25 kg bumper each side', plates: ['kg25'] },
  { label: '3 × 25 kg bumpers each side', plates: ['kg25', 'kg25', 'kg25'] },
];
export const rhinoLoad = (i: number) => { const l = RHINO_LOADS[i]; if (!l) throw Error('Unsupported Rhino load.'); return l; };
export const rhinoLean = (p: NumericParams) => { const s = RHINO_POSES[p.pose ?? 0]; if (!s) throw Error('Unsupported Rhino pose.'); return s.lean; };
const rad = (d: number) => d * Math.PI / 180;
/** Frame: local x toward the bay is `dir` (side 0 → -X), floor at z0, tower centre, hinge, trolley park height. */
export function rhinoLayout(p: NumericParams) {
  const R = RHINO, f = face(p), T = p.upright ?? 75, dir = p.side ? 1 : -1, span = R.inside + T, xc = dir * span / 2, z0 = -R.floor;
  const yT = f + R.towerAhead, yH = f + R.hingeAhead, zH = z0 + R.hingeZ, deckTop = z0 + R.deckTop;
  /** Arm-frame point (a up the arm from the hinge, n toward the tower) at the engaged lean, to the part frame (y, z). */
  const arm = (a: number, n: number, lean = rhinoLean(p)): [number, number] => [yH + a * Math.sin(rad(lean)) + n * Math.cos(rad(lean)), zH + a * Math.cos(rad(lean)) - n * Math.sin(rad(lean))];
  const [cy, cz] = arm(R.crossA, R.crossN, R.lean), hl = rad(R.lean + R.hornLean);
  const hornTop: [number, number] = [cy + R.hornPost * Math.sin(hl), cz + R.hornPost * Math.cos(hl)];
  return { f, T, dir, span, xc, z0, yT, yH, zH, deckTop, arm, hornTop, zTrolley: hornTop[1] + R.hornBlock, top: z0 + R.towerHeight };
}
function rhinoBodies(p: NumericParams): LocalBox[] {
  const R = RHINO, L = rhinoLayout(p), [pw, pd] = R.platform, [tw, td] = R.tower, [tw2, th] = R.trolley, x = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];
  const box = ([x0, x1]: [number, number], y0: number, y1: number, z0: number, z1: number): LocalBox => ({ min: [x0, y0, z0], max: [x1, y1, z1] });
  const plates = rhinoLoad(p.load ?? 0).plates, reach = tw / 2 + 18 + R.post, R2 = plates.length ? Math.max(...plates.map(q => PLATE_SPECS[q].diameter / 2)) : R.postDiameter / 2;
  const clear = L.T / 2 + 2, t = R.armTube / 2;
  const boxes = [
    // Tread deck above the rack's low beams (the frame below interlocks with the rack), clear of both uprights.
    box(x(L.xc - pw / 2 + L.dir * 0, L.xc + pw / 2), L.f - pd, L.f - L.T - 4, L.deckTop - 25, L.deckTop),
    box(x(L.dir * clear, L.xc * 2 - L.dir * clear), L.f - L.T - 4, L.f, L.deckTop - 25, L.deckTop),
    box(x(L.xc - tw / 2, L.xc + tw / 2), L.yT - td / 2, L.yT + td / 2, L.z0, L.top),
    box(x(L.xc - reach, L.xc + reach), L.yT - th / 2 - 10, L.yT + th / 2 + 10, L.zTrolley - R2 + tw2 / 2, L.zTrolley + R2 + tw2 / 2),
  ];
  // Lever arms beside the two near uprights (outside their tubes), hanging handles and the crossmember.
  for (const xa of [0, L.xc * 2]) {
    const [y1, z1] = L.arm(R.arm - 30, t), [y0] = L.arm(0, -t);
    boxes.push(box(x(xa - t, xa + t), Math.min(y0, L.f + 1), Math.max(y1, L.arm(R.arm, t)[0]), L.zH, z1));
  }
  const [hy, hz] = L.arm(R.handleA[1], 0);
  boxes.push(box(x(L.dir * (t + 20), L.dir * (t + R.handleReach)), hy - 30, hy + 30, hz - (R.handleA[1] - R.handleA[0]) - 20, hz + 20));
  boxes.push(box(x(L.xc * 2 - L.dir * (t + 20), L.xc * 2 - L.dir * (t + R.handleReach)), hy - 30, hy + 30, hz - (R.handleA[1] - R.handleA[0]) - 20, hz + 20));
  return boxes;
}
export const ROGUE_RHINO_BELT_SQUAT_DROP_IN = defineRackPart({
  id: 'rogue-rhino-belt-squat-drop-in', name: 'Rogue Rhino Belt Squat Drop-In', title: 'Rogue Monster Rhino Belt Squat Drop-In', noun: 'belt squat', section: 'Levers & belt squat',
  description: 'Cable belt squat that drops into a Monster bay: diamond-plate pulley deck between the uprights, 78.5 in trolley tower with 15.75 in weight posts, lever arms with handles and the UHMW Rhino horn catch · 49 x 48.5 x 78.5 in. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'pose', label: 'Lever arms', default: 0, options: [0, 1], format: v => RHINO_POSES[v]?.name ?? String(v) },
    { key: 'side', label: 'Mounted upright', default: 0, options: [0, 1], format: v => RHINO_SIDES[v] ?? String(v) },
    { key: 'load', label: 'Plates on the trolley', default: 0, options: [0, 1, 2, 3, 4, 5].filter(i => plateStackLength(RHINO_LOADS[i].plates) <= RHINO.post - 10), format: v => RHINO_LOADS[v]?.label ?? String(v) },
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-rhino-belt-squat-drop-in',
    credit: 'Rogue Fitness — Monster Rhino Belt Squat Drop-In (RA1592) · Made in USA', trademark: 'Rogue, Monster and Rhino are trademarks of Rogue Fitness.',
    reconstruction: 'Published 48.5 x 49 x 78.5 in envelope, 21.5 in extension, 26 x 48.5 in platform 7 in high, 3x6 tower, 3x3 lever arms on 1 in hinge shafts, 15.75 in weight posts, 6 in deck pulley and the 43 in Monster inside width (assembly manual IS0431). Arm length, hinge height, horn post, trolley park height and cable routing estimated from the spec drawings, manual and photos; the platform is shown at its 26 in depth whatever the rack depth. Physical fit unverified.',
  },
  mount: {
    pin: PIN_1IN, faces: ['front', 'back'],
    extent: p => { const L = rhinoLayout(p); return { below: RHINO.floor, above: L.top + 2 }; },
    validate: rack => {
      if (rack.tube < 74 || rack.tube > 78) throw Error('The Rhino drop-in fits 3x3 Monster uprights.');
      if (Math.abs(rack.width - RHINO.inside) > 45) throw Error('The Rhino drop-in fits racks with a 43 in (Monster) inside width.');
      if (rack.firstHole > 70) throw Error('The Rhino drop-in hinge bolts through the lowest hole of a bolt-down Monster rack.');
    },
  },
  bodies: rhinoBodies,
  pair: { default: false },
  placement: { height: 0, face: 'front' },
});
export const rhinoPoint = (p: NumericParams, x: number, a: number, n: number): Vec3 => { const [y, z] = rhinoLayout(p).arm(a, n); return [x, y, z]; };
