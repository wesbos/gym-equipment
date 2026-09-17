/** At most one expensive worker job in flight and one replaceable pending value. */
export class LatestRequest<T> {
  private busy = false;
  private pending: T | undefined;
  constructor(private send: (value: T) => void) {}
  submit(value: T) {
    if (this.busy) this.pending = value;
    else {
      this.busy = true;
      this.send(value);
    }
  }
  complete() {
    this.busy = false;
    const pending = this.pending;
    this.pending = undefined;
    if (pending !== undefined) this.submit(pending);
  }
  clear() {
    this.pending = undefined;
    this.busy = false;
  }
}
