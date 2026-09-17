/** Manual browser integration checks: open /scripts/visuals-check.html on the dev server. */
import * as THREE from 'three';
import { createBuilderScene } from './builder-scene.ts';
import { FrameFinishResources } from './frame-finishes.ts';
import { createGymFloor } from './gym-floor.ts';
import { BuilderStore } from '../state/builder-store.ts';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
const frames = async (count: number) => { for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame); };
export async function runVisualChecks(viewport: HTMLElement) {
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
  check(floor.mesh.material.map!.repeat.x === 20, 'Atlas must produce metre seams');
  check(floor.mesh.material.map!.generateMipmaps && floor.mesh.material.map!.anisotropy === 8, 'Floor antialiasing missing');
  let floorDisposed = 0;
  for (const resource of [floor.mesh.geometry, floor.mesh.material, floor.mesh.material.map!]) resource.addEventListener('dispose', () => floorDisposed++);
  floor.dispose(); floor.dispose();
  check(floorDisposed === 3, 'Floor resources must each dispose exactly once');

  const gl = WebGL2RenderingContext.prototype;
  const create = gl.createTexture, remove = gl.deleteTexture, upload = gl.texImage2D;
  let created = 0, deleted = 0, uploads = 0;
  gl.createTexture = function () { created++; return create.call(this); };
  gl.deleteTexture = function (texture) { if (texture) deleted++; return remove.call(this, texture); };
  gl.texImage2D = function (this: WebGL2RenderingContext, ...args: Parameters<typeof upload>) { uploads++; return upload.apply(this, args); } as typeof upload;
  const cycles: object[] = [];
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      const storage = { getItem: () => null, setItem: () => {} };
      const store = new BuilderStore(storage); await store.ready;
      store.commit({ ...store.getSnapshot().doc, appearance: { frameFinish: 'clear-grind', finishOverrides: { 'front-left': 'stainless' } } });
      const scene = createBuilderScene(viewport, store);
      try {
        const waitBuilt = async () => {
          const deadline = performance.now() + 30000;
          while (store.getSnapshot().loading) { check(performance.now() < deadline, 'Build timed out'); await frames(1); }
          check(!store.getSnapshot().error, store.getSnapshot().status);
          await frames(3);
        };
        await waitBuilt();
        const stableTextures = created - deleted;
        for (let i = 0; i < 12; i++) {
          store.commit({ ...store.getSnapshot().doc, appearance: { frameFinish: i % 2 ? 'clear-grind' : 'stainless' } });
          await waitBuilt();
        }
        check(created - deleted === stableTextures, 'Repeated finish edits leaked GPU textures');
        const beforeUploads = uploads, start = performance.now();
        await frames(60);
        const idleMs = performance.now() - start;
        check(uploads === beforeUploads, 'Idle render loop uploaded new textures');
        const data = await scene.exportGLB();
        const view = new DataView(data);
        const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, view.getUint32(12, true))));
        check(json.images?.length >= 2, 'GLB lost procedural brush images');
        check(json.materials.some((m: { normalTexture?: unknown }) => m.normalTexture), 'GLB lost grind normal map');
        check(json.materials.some((m: { extensions?: Record<string, unknown> }) => m.extensions?.KHR_materials_clearcoat), 'GLB lost clear coat');
        check(!json.nodes.some((n: { name?: string }) => /floor|scenery/i.test(n.name ?? '')), 'Floor leaked into GLB');
        check(json.meshes.every((m: { primitives: { attributes: Record<string, unknown> }[] }) => m.primitives.every(p => p.attributes.TEXCOORD_0 !== undefined)), 'GLB lost UVs');
        cycles.push({ cycle, stableTextures, idleUploads: uploads - beforeUploads, idle60FramesMs: Math.round(idleMs), glbBytes: data.byteLength, brushImages: json.images.length, dimensions: store.getSnapshot().dimensions });
      } finally { scene.dispose(); }
      check(viewport.querySelectorAll('canvas').length === 0, 'Canvas survived scene teardown');
      check(created === deleted, `GPU texture leak after teardown: ${created} created / ${deleted} deleted`);
    }
  } finally { gl.createTexture = create; gl.deleteTexture = remove; gl.texImage2D = upload; }
  return { passed: true, brushDisposed, floorDisposed, created, deleted, cycles };
}
