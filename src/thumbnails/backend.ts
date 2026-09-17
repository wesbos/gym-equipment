import type { LibraryWorkerResponse } from '../../rack-generator/worker-types.ts';
import type { ThumbnailBackend, ThumbnailRequest } from './queue.ts';
import { createThumbnailRenderer } from './renderer.ts';

/** Shared by the queue, never by individual catalog rows. */
export function createThumbnailBackend(): ThumbnailBackend {
  const worker = new Worker(new URL('../../rack-generator/library-worker.ts', import.meta.url), { type: 'module', name: 'part-thumbnails' });
  let renderer: ReturnType<typeof createThumbnailRenderer> | undefined;
  let disposed = false;
  let sequence = 0;
  let pending: { id: number; resolve: (url: string) => void; reject: (error: Error) => void } | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const fail = (message: string) => {
    clearTimeout(timeout);
    pending?.reject(new Error(message));
    pending = undefined;
  };
  worker.onerror = () => { fail('Thumbnail worker failed'); dispose(); };
  worker.onmessageerror = () => { fail('Thumbnail transfer failed'); dispose(); };
  worker.onmessage = ({ data }: MessageEvent<LibraryWorkerResponse>) => {
    if (disposed || data.type === 'catalog' || data.id !== pending?.id) return;
    clearTimeout(timeout);
    if (data.type === 'error') { fail(data.error); return; }
    try {
      renderer ??= createThumbnailRenderer();
      pending?.resolve(renderer.render(data.meshes));
      pending = undefined;
    } catch (error) { fail(String(error)); }
  };
  function dispose() {
    disposed = true;
    fail('Thumbnail service released');
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    renderer?.dispose();
    renderer = undefined;
  }
  return {
    render(request: ThumbnailRequest) {
      if (disposed) return Promise.reject(new Error('Thumbnail service unavailable'));
      return new Promise<string>((resolve, reject) => {
        const id = ++sequence;
        pending = { id, resolve, reject };
        timeout = setTimeout(() => { fail('Thumbnail build timed out'); dispose(); }, 30000);
        worker.postMessage({ id, ...request });
      });
    },
    dispose,
  };
}
