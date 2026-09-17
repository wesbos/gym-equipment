import type { NumericParams } from '../../rack-generator/types.ts';

export interface ThumbnailRequest { part: string; params: NumericParams }
export interface ThumbnailBackend {
  render(request: ThumbnailRequest): Promise<string>;
  dispose(): void;
}
export function thumbnailKey({ part, params }: ThumbnailRequest): string {
  return JSON.stringify([part, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
}
type Listener = (image: string | null) => void;
interface Job { key: string; request: ThumbnailRequest; listeners: Set<Listener> }

/** One in-flight build, bounded pending work and LRU (including failed builds). */
export class ThumbnailQueue {
  private cache = new Map<string, string | null>();
  private pending = new Map<string, Job>();
  private active?: Job;
  private backend?: ThumbnailBackend;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  constructor(private createBackend: () => ThumbnailBackend, private capacity = 96, private queueLimit = 32) {}

  request(request: ThumbnailRequest, listener: Listener): () => void {
    const key = thumbnailKey(request);
    if (this.cache.has(key)) {
      const image = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, image);
      listener(image);
      return () => {};
    }
    let job = this.active?.key === key ? this.active : this.pending.get(key);
    if (!job) {
      if (this.pending.size >= this.queueLimit) {
        listener(null);
        return () => {};
      }
      job = { key, request: { part: request.part, params: { ...request.params } }, listeners: new Set() };
      this.pending.set(key, job);
    }
    job.listeners.add(listener);
    this.schedule();
    return () => {
      job.listeners.delete(listener);
      if (!job.listeners.size) this.pending.delete(key);
    };
  }

  private schedule() {
    if (this.active || this.timer || !this.pending.size) return;
    // Yield between thumbnails so clicks/scroll/paint take precedence.
    this.timer = setTimeout(() => { this.timer = undefined; void this.run(); }, 32);
  }
  private async run() {
    const job = this.pending.values().next().value;
    if (!job) return;
    this.pending.delete(job.key);
    this.active = job;
    const generation = this.generation;
    let image: string | null = null;
    try {
      this.backend ??= this.createBackend();
      image = await this.backend.render(job.request);
    } catch { /* SVG remains available when WASM/WebGL/geometry fails. */ }
    if (generation !== this.generation) return;
    this.cache.set(job.key, image);
    while (this.cache.size > this.capacity) this.cache.delete(this.cache.keys().next().value!);
    this.active = undefined;
    for (const listener of job.listeners) listener(image);
    this.schedule();
  }
  /** Stop work and free GPU/WASM on route exit; retain only bounded encoded images. */
  release() {
    ++this.generation;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending.clear();
    this.active?.listeners.clear();
    this.active = undefined;
    this.backend?.dispose();
    this.backend = undefined;
  }
}
