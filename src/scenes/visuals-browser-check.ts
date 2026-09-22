/** Manual browser integration checks: open /scripts/visuals-check.html on the dev server. */
import { boundedWait, boundedFrame } from './visual-check-timing.ts';
import * as THREE from 'three';
import { createBuilderScene } from './builder-scene.ts';
import { FrameFinishResources } from './frame-finishes.ts';
import { createGymFloor } from './gym-floor.ts';
import { BuilderStore } from '../state/builder-store.ts';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
export async function runVisualChecks(viewport: HTMLElement, onProgress: (stage: string) => void = () => {}) {
  const deadline = performance.now() + 45000;
  let stage = 'resource ownership';
  const progress = (value: string) => { stage = value; onProgress(stage); };
  const frames = async (count: number) => { for (let i = 0; i < count; i++) await boundedFrame(deadline, stage); };
  progress(stage);
  const pool = new FrameFinishResources(8);
  const first = pool.material({ role: 'frame' }, { frameFinish: 'clear-grind' });
  const second = pool.material({ role: 'frame' }, { frameFinish: 'stainless' });
  check(first.normalMap === second.normalMap && first.roughnessMap === second.roughnessMap, 'Brush textures must be shared');
  let brushDisposed = 0;
  first.normalMap!.addEventListener('dispose', () => brushDisposed++);
  first.roughnessMap!.addEventListener('dispose', () => brushDisposed++);
  first.dispose(); second.dispose();
  check(brushDisposed === 0, 'Instance disposal must not dispose borrowed textures');
  pool.dispose(); pool.dispose();
  check(Number(brushDisposed) === 2, 'Brush resources must each dispose exactly once');
  const floor = createGymFloor(16);
  check(floor.mesh.geometry.parameters.width === 40000, 'Floor should extend beyond the old grid');
  check(floor.mesh.material.map === null, 'The studio ground is a plain light plane');
  floor.update({ left: 2000, right: 2000, back: 2000, front: 2000, height: 3000 }, 'black-rubber');
  check(floor.room.material.map!.generateMipmaps && floor.room.material.map!.anisotropy === 8, 'Floor antialiasing missing');
  let floorDisposed = 0;
  for (const resource of [floor.mesh.geometry, floor.mesh.material, floor.room.material.map!]) resource.addEventListener('dispose', () => floorDisposed++);
  floor.dispose(); floor.dispose();
  check(floorDisposed === 3, 'Floor resources must each dispose exactly once');

  const gl = WebGL2RenderingContext.prototype;
  const create = gl.createTexture, remove = gl.deleteTexture, upload = gl.texImage2D;
  let created = 0, deleted = 0, uploads = 0;
  const live = new Map<WebGLTexture, { context: WebGL2RenderingContext; stack?: string }>();
  gl.createTexture = function () { created++; const texture = create.call(this); if (texture) live.set(texture, { context: this, stack: new Error().stack }); return texture; };
  gl.deleteTexture = function (texture) { if (texture) { deleted++; live.delete(texture); } return remove.call(this, texture); };
  gl.texImage2D = function (this: WebGL2RenderingContext, ...args: Parameters<typeof upload>) { uploads++; return upload.apply(this, args); } as typeof upload;
  const cycles: object[] = [];
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      const releasedBefore = live.size;
      const storage = { getItem: () => null, setItem: () => {} };
      progress(`cycle ${cycle + 1} / storage`);
      const store = new BuilderStore(storage); await boundedWait(store.ready, deadline, stage);
      store.commit({ ...store.getSnapshot().doc, appearance: { frameFinish: 'clear-grind', finishOverrides: { 'front-left': 'stainless' } } });
      const scene = createBuilderScene(viewport, store);
      try {
        const waitBuilt = async () => {
          const deadline = performance.now() + 30000;
          while (store.getSnapshot().builtDoc !== store.getSnapshot().doc) { check(performance.now() < deadline, 'Build timed out'); await frames(1); }
          check(!store.getSnapshot().error, store.getSnapshot().status);
          await frames(3);
        };
        progress(`cycle ${cycle + 1} / initial build`);
        await waitBuilt();
        const stableTextures = created - deleted - releasedBefore;
        for (let i = 0; i < 12; i++) {
          progress(`cycle ${cycle + 1} / finish edit ${i + 1}`);
          store.commit({ ...store.getSnapshot().doc, appearance: { frameFinish: i % 2 ? 'clear-grind' : 'stainless' } });
          await waitBuilt();
        }
        check(created - deleted - releasedBefore === stableTextures, 'Repeated finish edits leaked GPU textures');
        progress(`cycle ${cycle + 1} / 60 idle frames`);
        const beforeUploads = uploads, start = performance.now();
        await frames(60);
        const idleMs = performance.now() - start;
        check(uploads === beforeUploads, 'Idle render loop uploaded new textures');
        progress(`cycle ${cycle + 1} / GLB export`);
        const data = await boundedWait(scene.exportGLB(), deadline, stage, 15000);
        const view = new DataView(data);
        const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, view.getUint32(12, true))));
        check(json.images?.length >= 2, 'GLB lost procedural brush images');
        check(json.materials.some((m: { normalTexture?: unknown }) => m.normalTexture), 'GLB lost grind normal map');
        check(json.materials.some((m: { extensions?: Record<string, unknown> }) => m.extensions?.KHR_materials_clearcoat), 'GLB lost clear coat');
        check(!json.nodes.some((n: { name?: string }) => n.name === 'Gym floor scenery (not exported)'), 'Floor leaked into GLB');
        check(json.meshes.every((m: { primitives: { attributes: Record<string, unknown> }[] }) => m.primitives.every(p => p.attributes.TEXCOORD_0 !== undefined)), 'GLB lost UVs');
        cycles.push({ cycle, stableTextures, idleUploads: uploads - beforeUploads, idle60FramesMs: Math.round(idleMs), glbBytes: data.byteLength, brushImages: json.images.length, dimensions: store.getSnapshot().dimensions });
      } finally { scene.dispose(); }
      progress(`cycle ${cycle + 1} / teardown`);
      check(viewport.querySelectorAll('canvas').length === 0, 'Canvas survived scene teardown');
      await frames(2);
      check([...live.values()].every(({ context }) => context.isContextLost()), `GPU resources survived scene teardown: ${JSON.stringify([...live.values()].map(v => v.stack))}`);
      // Three owns fallback textures until forceContextLoss; app textures are explicitly disposed.

    }
  } catch (error) {
    throw Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally { gl.createTexture = create; gl.deleteTexture = remove; gl.texImage2D = upload; }
  return { passed: true, brushDisposed, floorDisposed, created, deleted, releasedByContextLoss: live.size, cycles };
}
