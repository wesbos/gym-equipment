import { defineWallPart } from '../wall-part.ts';
/** 48″ and 24″ widths, both 24″ tall; 1″ hole pitch; 3/4″ folded return standoff. */
export const PEGBOARD_WIDTHS = [1219, 610] as const;
export const PEGBOARD_HEIGHT = 610, PEGBOARD_DEPTH = 19, PEGBOARD_PITCH = 25.4;
export const PEGBOARD = defineWallPart({
  id: 'pegboard-panel', name: 'Pegboard wall panel', title: 'Black pegboard wall panel', noun: 'panel',
  description: 'Black powder-coated steel pegboard, 48″ × 24″ or 24″ × 24″, 1″ hole grid on 3/4″ returns. Mounts over the gym slat wall; scenery only, excluded from print export.',
  params: [{ key: 'width', label: 'Panel size', default: 1219, options: PEGBOARD_WIDTHS, format: v => `${Math.round(v / 25.4)}″ × 24″` }],
  face: p => ({ width: p.width, height: PEGBOARD_HEIGHT }), depth: PEGBOARD_DEPTH,
});
