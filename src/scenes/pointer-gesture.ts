/** Own pointer capture only while the scene handles a gesture instead of OrbitControls. */
export class PointerGesture {
  start: [number, number] | null = null;
  private pointerId: number | null = null;
  private captured = false;
  constructor(private element: HTMLElement, private onCancel: () => void) {
    element.addEventListener('lostpointercapture', this.lostCapture);
  }
  begin(event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) {
    this.finish();
    this.start = [event.clientX, event.clientY];
    this.pointerId = event.pointerId;
  }
  capture() {
    if (this.pointerId === null) return;
    this.element.setPointerCapture(this.pointerId);
    this.captured = true;
  }
  finish() {
    const start = this.start, id = this.pointerId, captured = this.captured;
    this.start = null;
    this.pointerId = null;
    this.captured = false;
    if (captured && id !== null && this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
    return start;
  }
  private lostCapture = (event: PointerEvent) => {
    if (!this.captured || event.pointerId !== this.pointerId) return;
    this.finish();
    this.onCancel();
  };
  dispose() {
    this.finish();
    this.element.removeEventListener('lostpointercapture', this.lostCapture);
  }
}
