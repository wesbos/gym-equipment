import { ThumbnailQueue, type ThumbnailBackend } from './queue.ts';

const queue = new ThumbnailQueue(() => {
  let disposed = false;
  let backend: ThumbnailBackend | undefined;
  const ready = import('./backend.ts').then(({ createThumbnailBackend }) => {
    if (disposed) throw new Error('Thumbnail service released');
    backend = createThumbnailBackend();
    return backend;
  });
  return {
    async render(request) { return (await ready).render(request); },
    dispose() { disposed = true; backend?.dispose(); },
  };
});
let consumers = 0;
export function retainThumbnails() {
  ++consumers;
  return () => {
    --consumers;
    // StrictMode/remounts and route handoffs can reuse the same service.
    queueMicrotask(() => { if (!consumers) queue.release(); });
  };
}
export const requestThumbnail = queue.request.bind(queue);
