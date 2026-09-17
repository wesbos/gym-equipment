import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PointerGesture } from './pointer-gesture.ts';

class CaptureElement extends EventTarget {
  captured = new Set<number>();
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) {
    this.captured.delete(id);
    this.dispatchEvent(Object.assign(new Event('lostpointercapture'), { pointerId: id }));
  }
}

test('exclusive placement captures outside releases and clears state without cancelling completion', () => {
  const element = new CaptureElement();
  let cancelled = 0;
  const gesture = new PointerGesture(element as unknown as HTMLElement, () => { cancelled++; });
  gesture.begin({ pointerId: 1, clientX: 20, clientY: 30 }); gesture.capture();
  assert.equal(element.hasPointerCapture(1), true, 'the browser delivers outside pointerup to this element');
  assert.deepEqual(gesture.finish(), [20, 30]);
  assert.equal(gesture.start, null);
  assert.equal(element.hasPointerCapture(1), false);
  assert.equal(cancelled, 0, 'intentional release must not cancel a committed drag');
  gesture.dispose();
});

test('unexpected lost capture cancels once; teardown releases capture and removes the listener', () => {
  const element = new CaptureElement();
  let cancelled = 0;
  const gesture = new PointerGesture(element as unknown as HTMLElement, () => { cancelled++; });
  gesture.begin({ pointerId: 1, clientX: 20, clientY: 30 }); gesture.capture();
  element.releasePointerCapture(1);
  assert.equal(gesture.start, null); assert.equal(cancelled, 1);
  gesture.begin({ pointerId: 2, clientX: 20, clientY: 30 }); gesture.capture();
  gesture.dispose(); element.releasePointerCapture(2);
  assert.equal(element.captured.size, 0); assert.equal(cancelled, 1);
});
