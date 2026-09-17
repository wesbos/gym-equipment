/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope;
import type { UprightWorkerRequest } from './types.ts';
import type { UprightWorkerResponse } from './worker-types.ts';
const send = (message: UprightWorkerResponse, transfer: Transferable[] = []): void => self.postMessage(message, transfer);
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { buildUpright } from './model.ts';
const ready = Module({ locateFile: () => wasmUrl }).then(api => { api.setup(); return api; });
self.onmessage = async ({ data }: MessageEvent<UprightWorkerRequest>) => {
  try {
    const model = buildUpright(await ready, data.params);
    send({ id: data.id, model }, [model.positions.buffer, model.indices.buffer]);
  } catch (error) { send({ id: data.id, error: error instanceof Error ? error.message : String(error) }); }
};
