import test from 'node:test';
import assert from 'node:assert/strict';
import { contentDragMode, defaultPanels, layoutFor, openSheet, resolvePanels, setSheetSnap, settleSnap, sheetSizes, sheetState, stepSnap, LAYOUT_QUERIES } from './MobileShell/shell-state.ts';

/** Evaluates the layout queries against a viewport (the subset of media query syntax they use). */
function matcher(width: number, height: number) {
  return (query: string) => query.split(' and ').every(part => {
    const m = part.match(/\((min|max)-(width|height): (\d+)px\)/);
    if (!m) return false;
    const dim = m[2] === 'width' ? width : height;
    return m[1] === 'min' ? dim >= Number(m[3]) : dim <= Number(m[3]);
  });
}

test('layout modes for phones, tablets and desktops in both orientations', () => {
  assert.equal(LAYOUT_QUERIES.length, 3);
  const cases: [number, number, string][] = [
    [375, 667, 'phone'], [390, 844, 'phone'], [430, 932, 'phone'], [760, 1000, 'phone'],
    [667, 375, 'phone-land'], [844, 390, 'phone-land'], [932, 430, 'phone-land'],
    [834, 1194, 'tablet'], [1194, 834, 'tablet'], [1024, 768, 'tablet'],
    [1440, 900, 'desktop'], [1400, 480, 'desktop'], [480, 400, 'phone'],
  ];
  for (const [w, h, mode] of cases) assert.equal(layoutFor(matcher(w, h)), mode, `${w}×${h}`);
});

test('sheet sizes: bottom sheet leaves canvas above full, side sheet stays within the width', () => {
  const bottom = sheetSizes(false, { width: 390, height: 844, top: 52 }, 90);
  assert.deepEqual(bottom, { peek: 90, half: 422, full: 736 });
  const side = sheetSizes(true, { width: 844, height: 390, top: 44 }, 76);
  assert.ok(side.peek < side.half && side.half < side.full && side.full <= 844 - 180);
  // A right notch inset widens the peek; the panel beyond it keeps its width.
  const notched = sheetSizes(true, { width: 750, height: 340, top: 44 }, 127), plain = sheetSizes(true, { width: 750, height: 340, top: 44 }, 80);
  assert.equal(notched.half - notched.peek, plain.half - plain.peek);
  assert.ok(notched.half - notched.peek >= 240);
  const se = sheetSizes(true, { width: 568, height: 320, top: 44 }, 80);
  assert.ok(se.full <= 568 - 180 && se.half - se.peek >= 240);
  // Tiny viewports never invert the order.
  const tiny = sheetSizes(false, { width: 320, height: 300, top: 52 }, 90);
  assert.ok(tiny.peek <= tiny.half && tiny.half <= tiny.full);
});

test('settling: slow releases go to the nearest snap, flicks go on to the next', () => {
  const sizes = { peek: 90, half: 420, full: 740 };
  assert.equal(settleSnap(sizes, 200, 0), 'peek');
  assert.equal(settleSnap(sizes, 300, 0), 'half');
  assert.equal(settleSnap(sizes, 650, 0.1), 'full');
  assert.equal(settleSnap(sizes, 120, 1.2), 'half');
  assert.equal(settleSnap(sizes, 430, 1.2), 'full');
  assert.equal(settleSnap(sizes, 700, -1.2), 'half');
  assert.equal(settleSnap(sizes, 400, -1.2), 'peek');
  assert.equal(settleSnap(sizes, 800, 2), 'full');
  assert.equal(stepSnap('peek', -1), 'peek');
  assert.equal(stepSnap('peek', 1), 'half');
  assert.equal(stepSnap('full', 1), 'full');
});

test('openSheet raises a peeking sheet to half and keeps a taller one', () => {
  sheetState.set({ tab: 'parts', snap: 'peek' });
  openSheet('inspector');
  assert.deepEqual(sheetState.get(), { tab: 'inspector', snap: 'half' });
  setSheetSnap('full');
  openSheet('timeline');
  assert.deepEqual(sheetState.get(), { tab: 'timeline', snap: 'full' });
  openSheet(undefined, 'peek');
  assert.deepEqual(sheetState.get(), { tab: 'timeline', snap: 'peek' });
});

test('content drags: the sheet moves below full and from a scrolled-to-top panel at full; the rest scrolls', () => {
  assert.equal(contentDragMode('half', 0, 0, 4), undefined); // within the slop
  assert.equal(contentDragMode('half', 0, 30, 10), 'native'); // horizontal
  assert.equal(contentDragMode('half', 0, 0, -20), 'sheet'); // up grows
  assert.equal(contentDragMode('half', 0, 0, 20), 'sheet'); // down lowers
  assert.equal(contentDragMode('half', 120, 0, 20), 'native'); // scrolled: scroll back first
  assert.equal(contentDragMode('half', 120, 0, -20), 'sheet');
  assert.equal(contentDragMode('full', 0, 0, 20), 'sheet');
  assert.equal(contentDragMode('full', 0, 0, -20), 'native');
  assert.equal(contentDragMode('full', 50, 0, 20), 'native');
});

test('panels: portrait tablets start with the parts panel collapsed; the timeline starts collapsed (Studio); explicit choices win', () => {
  assert.deepEqual(defaultPanels(false), { left: true, right: true, timeline: false });
  assert.deepEqual(defaultPanels(true), { left: false, right: true, timeline: false });
  assert.deepEqual(resolvePanels({}, true), { left: false, right: true, timeline: false });
  assert.deepEqual(resolvePanels({ left: true, timeline: true }, true), { left: true, right: true, timeline: true });
  assert.deepEqual(resolvePanels({ timeline: false }, false), { left: true, right: true, timeline: false });
  assert.deepEqual(resolvePanels({ timeline: false }, true), { left: false, right: true, timeline: false });
});
