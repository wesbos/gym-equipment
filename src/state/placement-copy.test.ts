import test from 'node:test';
import assert from 'node:assert/strict';
import { placementCopy, touchPlacementText } from './placement-copy.ts';

test('touch wording for every placement hint the store and scene write', () => {
  const cases: [string, string][] = [
    ['J-hook pair · Click to place · ESC cancels', 'J-hook pair · Tap a spot, then Place · Cancel to stop'],
    ['Rotate 90° · Overlap warning · Click to apply · ESC cancels', 'Rotate 90° · Overlap warning · Tap to apply · Cancel to stop'],
    ['Choose a mount · Click to place · ESC cancels', 'Choose a mount · Tap a spot, then Place · Cancel to stop'],
    ['Suggested: Wall rack · Click a highlighted cradle or the floor · ESC cancels', 'Suggested: Wall rack · Tap a highlighted cradle or the floor · Cancel to stop'],
    ['Click floor to place · R rotates · Alt disables snap', 'Tap the floor, then Place'],
    ['Wall rack · Click to park · ESC cancels', 'Wall rack · Tap Place to park · Cancel to stop'],
    ['Overlap warning · Click to place anyway', 'Overlap warning · Tap Place to place anyway'],
    ['Click a wall to place · Alt disables snap · ESC cancels', 'Tap a wall, then Place · Cancel to stop'],
    ['Add a wall panel first · ESC cancels', 'Add a wall panel first · Cancel to stop'],
    ['Click a highlighted hook · ESC cancels', 'Tap a highlighted hook · Cancel to stop'],
    ['Add upright right · Click · ← → · ESC', 'Add upright right · Tap Place to add'],
    ['Hover a post or gap · ESC cancels', 'Tap a post or gap · Cancel to stop'],
    ['Won’t fit: no free mount', 'Won’t fit: no free mount'],
  ];
  for (const [desktop, touch] of cases) assert.equal(touchPlacementText(desktop), touch);
});

test('touch copy never mentions mouse or keyboard input', () => {
  for (const text of ['A · Click to place · ESC cancels', 'Click floor to place · R rotates · Alt disables snap', 'B · Click · ← → · ESC'])
    assert.doesNotMatch(touchPlacementText(text), /Click|ESC|Alt|R rotates|←/);
});

test('fine pointers keep the desktop copy untouched', () => {
  assert.equal(placementCopy('J-hook · Click to place · ESC cancels', false), 'J-hook · Click to place · ESC cancels');
  assert.equal(placementCopy('J-hook · Click to place · ESC cancels', true), 'J-hook · Tap a spot, then Place · Cancel to stop');
});
