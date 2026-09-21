/** Placement hints for touch screens (#215). The store writes mouse-and-keyboard copy ("Click to place · ESC cancels");
 * on a coarse pointer a tap only aims the ghost, the on-canvas Place button commits and Cancel leaves, and there is no
 * R, Alt, arrow keys or Escape. The rewrite happens at display time so the store, and every test of its strings, keep
 * the desktop copy. */
const PHRASES: [RegExp, string][] = [
  [/\bClick to place anyway\b/g, 'Tap Place to place anyway'],
  [/\bClick floor to place\b/g, 'Tap the floor, then Place'],
  [/\bClick a wall to place\b/g, 'Tap a wall, then Place'],
  [/\bClick to place\b/g, 'Tap a spot, then Place'],
  [/\bClick to park\b/g, 'Tap Place to park'],
  // Rotation-only placements apply on a tap.
  [/\bClick to apply\b/g, 'Tap to apply'],
  [/\bHover a post or gap\b/g, 'Tap a post or gap'],
  [/\bClick\b/g, 'Tap'],
  [/\bESC cancels\b/g, 'Cancel to stop'],
];
/** Segments that only make sense with a keyboard: rotate with R, Alt to skip snapping, ← → to cycle, bare ESC. */
const KEYBOARD_ONLY = /^(R rotates|Alt disables snap|← →|ESC)$/;

export function touchPlacementText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PHRASES) out = out.replace(pattern, replacement);
  const segments = out.split(' · ').filter(segment => !KEYBOARD_ONLY.test(segment.trim()));
  // The structure hint ("<candidate> · Click · ← → · ESC") ends up as "<candidate> · Tap": say what the tap is for.
  return segments.map(segment => (segment === 'Tap' ? 'Tap Place to add' : segment)).join(' · ');
}

/** The placement hint for the current pointer: touch wording on a coarse pointer, the store's copy otherwise. */
export const placementCopy = (text: string, coarse: boolean) => (coarse ? touchPlacementText(text) : text);
