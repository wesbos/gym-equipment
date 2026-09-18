import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuilderStore } from '../state/builder-store.ts';
import { resizeAssembly } from '../../rack-generator/assembly.ts';
import { DEFAULT_FRAME_COLOR } from '../../rack-generator/appearance.ts';
import { createGestureSession, GestureColorInput, GestureRange } from './GestureInputs.tsx';

const wired = (store: BuilderStore) => createGestureSession(() => ({ onGestureStart: store.beginGesture, onGestureEnd: store.endGesture, onGestureCancel: store.cancelGesture }));
const entries = (store: BuilderStore) => store.getSnapshot().timeline.entries.length;
const frameColor = (store: BuilderStore) => store.getSnapshot().doc.appearance?.frameColor ?? DEFAULT_FRAME_COLOR;
const paint = (store: BuilderStore, color: string) => store.edit(doc => ({ ...doc, appearance: { ...doc.appearance, frameColor: color, frameFinish: 'paint' } }));

test('a multi-tick color picker drag appends one live history entry and one undo restores the pre-drag color', () => {
  const store = new BuilderStore(), gesture = wired(store), before = entries(store);
  // Picker drag: an `input` per position (each begins, idempotently), then `change` and `blur` when it closes.
  for (const color of ['#110000', '#220000', '#330000', '#440000']) { gesture.begin(); paint(store, color); assert.equal(frameColor(store), color); }
  gesture.end(); gesture.end();
  assert.equal(entries(store), before + 1);
  store.history('undo');
  assert.equal(frameColor(store), DEFAULT_FRAME_COLOR);
  assert.equal(store.getSnapshot().canUndo, false);
  store.history('redo');
  assert.equal(frameColor(store), '#440000');
  paint(store, '#550000');
  assert.equal(entries(store), before + 2, 'later edits stay independent');
});

test('a paintSelection color drag collapses to one entry for the selected pieces', () => {
  const store = new BuilderStore(), gesture = wired(store), before = entries(store);
  store.selectMany(['front-left', 'front-right']);
  for (const color of ['#001100', '#002200', '#003300']) { gesture.begin(); store.paintSelection(color); }
  gesture.end();
  assert.equal(entries(store), before + 1);
  assert.equal(store.getSnapshot().doc.appearance?.overrides?.['front-right'], '#003300');
  store.history('undo');
  assert.equal(store.getSnapshot().doc.appearance?.overrides?.['front-right'], undefined);
});

test('a multi-tick range drag appends one entry; undo restores the pre-drag value', () => {
  const store = new BuilderStore(), gesture = wired(store), before = entries(store), width = store.getSnapshot().doc.rack.width;
  gesture.begin(); // pointerdown
  for (let next = 425; next <= 725; next += 50) { gesture.begin(); store.commit(resizeAssembly(store.getSnapshot().doc, { width: next })); }
  gesture.end(); gesture.end(); // pointerup, then native change
  assert.equal(entries(store), before + 1);
  assert.equal(store.getSnapshot().doc.rack.width, 725);
  store.history('undo');
  assert.equal(store.getSnapshot().doc.rack.width, width);
  gesture.begin(); store.commit(resizeAssembly(store.getSnapshot().doc, { width: 425 })); store.commit(resizeAssembly(store.getSnapshot().doc, { width }));
  gesture.end();
  assert.equal(entries(store), before + 1, 'dragging back to the start adds nothing');
});

test('ending a gesture without changes is a no-op, and Escape cancels a drag without an entry', () => {
  const store = new BuilderStore(), gesture = wired(store);
  paint(store, '#123456'); store.history('undo');
  const snapshot = store.getSnapshot();
  gesture.begin(); gesture.end(); // picker opened then closed untouched
  assert.equal(store.getSnapshot().doc, snapshot.doc);
  assert.deepEqual(store.getSnapshot().timeline, snapshot.timeline);
  assert.equal(store.getSnapshot().canRedo, true, 'no-op gesture keeps redo');
  gesture.begin(); paint(store, '#654321'); paint(store, '#abcdef'); gesture.cancel(); gesture.end();
  assert.equal(frameColor(store), DEFAULT_FRAME_COLOR);
  assert.equal(entries(store), snapshot.timeline.entries.length);
});

test('gesture sessions fire one start/end pair per burst and fall back to end without a cancel handler', () => {
  const calls: string[] = [];
  const session = createGestureSession(() => ({ onGestureStart: () => calls.push('start'), onGestureEnd: () => calls.push('end') }));
  session.end(); session.begin(); session.begin(); assert.equal(session.active, true);
  session.end(); session.end(); session.begin(); session.cancel(); session.cancel();
  assert.deepEqual(calls, ['start', 'end', 'start', 'end']);
  assert.equal(session.active, false);
});

test('gesture inputs render native color and range inputs with passthrough attributes', () => {
  const color = renderToStaticMarkup(createElement(GestureColorInput, { 'aria-label': 'Rack color', value: '#ff0000', onValue() {} }));
  assert.match(color, /aria-label="Rack color"/); assert.match(color, /type="color"/); assert.match(color, /value="#ff0000"/);
  const range = renderToStaticMarkup(createElement(GestureRange, { 'aria-label': 'Logo contrast', min: '0.5', max: '3', step: '0.1', value: 1.4, onValue() {} }));
  assert.match(range, /type="range"/); assert.match(range, /step="0.1"/); assert.match(range, /value="1.4"/);
});
