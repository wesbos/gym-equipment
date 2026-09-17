import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { buildUpright } from './model.js';
const ready = Module({ locateFile: () => wasmUrl }).then(api => { api.setup(); return api; });
self.onmessage = async ({ data }) => {
  try {
    const model = buildUpright(await ready, data.params);
    self.postMessage({ id: data.id, model }, [model.positions.buffer, model.indices.buffer]);
  } catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
