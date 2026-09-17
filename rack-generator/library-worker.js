import Module from "manifold-3d";
import wasmUrl from "manifold-3d/manifold.wasm?url";
import { definitions as structure } from "./parts/structure.js";
import { definitions as attachments } from "./parts/attachments.js";
import { definitions as bars } from "./parts/bars-safeties.js";
const definitions = [...structure, ...bars, ...attachments];
const ready = Module({ locateFile: () => wasmUrl }).then((api) => {
  api.setup();
  return api;
});
self.postMessage({
  type: "catalog",
  definitions: definitions.map(({ build, ...definition }) => definition),
});
self.onmessage = async ({ data }) => {
  let parts = [];
  try {
    const def = definitions.find((d) => d.id === data.part);
    if (!def) throw new Error("Unknown part");
    const params = { ...def.defaults, ...data.params };
    for (const [key, value] of Object.entries(params))
      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > 4000 ||
        (value === 0 &&
          !["cornerRadius", "benchStart", "rise", "offset", "sag"].includes(
            key
          ))
      )
        throw new Error(`Invalid ${key}`);
    if (
      params.spacing &&
      Math.max(params.height || 0, params.length || 0) / params.spacing > 500
    )
      throw new Error("Too many holes: increase the spacing.");
    if (
      params.benchSpacing &&
      (params.benchEnd - params.benchStart) / params.benchSpacing > 500
    )
      throw new Error("Too many bench holes: increase spacing.");
    parts = def.build(await ready, params);
    const meshes = parts.map(({ name, solid, color, metalness, roughness }) => {
      if (solid.status() !== "NoError" || solid.isEmpty())
        throw new Error(`Invalid solid: ${name}`);
      const mesh = solid.getMesh();
      return {
        name,
        color,
        metalness,
        roughness,
        positions: new Float32Array(mesh.vertProperties),
        indices: new Uint32Array(mesh.triVerts),
        stride: mesh.numProp,
      };
    });
    self.postMessage(
      { type: "model", id: data.id, part: data.part, params, meshes },
      meshes.flatMap((m) => [m.positions.buffer, m.indices.buffer])
    );
  } catch (error) {
    self.postMessage({ type: "error", id: data.id, error: error.message });
  } finally {
    for (const { solid } of parts) solid.delete();
  }
};
