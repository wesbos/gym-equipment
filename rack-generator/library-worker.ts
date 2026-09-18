import { validateLogo } from './logos/types.ts';
/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope;
import type { LibraryWorkerRequest, SolidPart } from './types.ts';
import type { LibraryWorkerResponse } from './worker-types.ts';
const send = (message: LibraryWorkerResponse, transfer: Transferable[] = []): void => self.postMessage(message, transfer);
import Module from "manifold-3d";
import wasmUrl from "manifold-3d/manifold.wasm?url";
import { definitions } from './catalog.ts';
import { isSystemPart } from './system-types.ts';
import { floorPart, validateFloorParams } from './floor-registry.ts';
import { wallPart } from './wall-registry.ts';
const ready = Module({ locateFile: () => wasmUrl }).then((api) => {
  api.setup();
  return api;
});
send({
  type: "catalog",
  definitions: definitions.map(({ build, ...definition }) => definition),
});
self.onmessage = async ({ data }: MessageEvent<LibraryWorkerRequest>) => {
  let parts: SolidPart[] = [];
  try {
    const def = definitions.find((d) => d.id === data.part);
    if (!def) throw new Error("Unknown part");
    const params = { ...def.defaults, ...data.params }, floor = floorPart(data.part) ?? wallPart(data.part);
    // Floor and wall parts carry their own option lists (negative/zero values allowed where listed).
    if (floor) validateFloorParams(floor, data.params);
    else for (const [key, value] of Object.entries(params))
      if (
        !Number.isFinite(value) ||
        (value < 0 && !(isSystemPart(data.part) && key === "angle" && value === -5)) ||
        value > 4000 ||
        (value === 0 &&
          !isSystemPart(data.part) && !["cornerRadius", "benchStart", "rise", "offset", "sag"].includes(
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
    parts = def.build(await ready, params, validateLogo(data.logo));
    const meshes = parts.map(({ name, solid, role, color, metalness, roughness, authoredFastenerFinish }) => {
      if (solid.status() !== "NoError" || solid.isEmpty())
        throw new Error(`Invalid solid: ${name}`);
      const mesh = solid.getMesh();
      return {
        name,
        role,
        authoredFastenerFinish,
        color,
        metalness,
        roughness,
        positions: new Float32Array(mesh.vertProperties),
        indices: new Uint32Array(mesh.triVerts),
        stride: mesh.numProp,
      };
    });
    send(
      { type: "model", id: data.id, part: data.part, params, meshes },
      meshes.flatMap((m) => [m.positions.buffer, m.indices.buffer])
    );
  } catch (error) {
    send({ type: "error", id: data.id, error: error instanceof Error ? error.message : String(error) });
  } finally {
    for (const { solid } of parts) solid.delete();
  }
};
