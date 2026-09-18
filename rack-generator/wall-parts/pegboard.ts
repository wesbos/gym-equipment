import { defineWallPart } from '../wall-part.ts';
/** 48″ and 24″ widths, both 24″ tall; 1″ hole pitch; 3/4″ folded return standoff. */
export const PEGBOARD_WIDTHS = [1219, 610] as const;
export const PEGBOARD_HEIGHT = 610, PEGBOARD_DEPTH = 19, PEGBOARD_PITCH = 25.4;
export const PEGBOARD = defineWallPart({
  id: 'pegboard-panel', name: 'Pegboard wall panel', title: 'Black pegboard wall panel', noun: 'panel',
  description: 'Black powder-coated steel pegboard, 48″ × 24″ or 24″ × 24″, 1″ hole grid on 3/4″ returns. Mounts over the gym slat wall; scenery only, excluded from print export.',
  params: [{ key: 'width', label: 'Panel size', default: 1219, options: PEGBOARD_WIDTHS, format: v => `${Math.round(v / 25.4)}″ × 24″` }],
  face: p => ({ width: p.width, height: PEGBOARD_HEIGHT }), depth: PEGBOARD_DEPTH,
  slots: p => pegboardSlots(p.width),
});
/** Hook slots on hole centres: columns every 4″ through the centre, six rows every 4″ from 9.5″ above centre.
 * Row-major, top row first. Slots at the same physical spot exist on both sizes (resizes keep centred hooks). */
export function pegboardSlots(width: number): [number, number][] {
  const step = 4 * PEGBOARD_PITCH, half = Math.floor((width / 2 - step / 2) / step), slots: [number, number][] = [];
  for (let row = 0; row < 6; row++) for (let col = -half; col <= half; col++) slots.push([col * step, (9.5 - 4 * row) * PEGBOARD_PITCH]);
  return slots;
}
