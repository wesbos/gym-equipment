import { GeometryCache, geometryKey } from '../geometry/geometry-cache.ts';
import { PointerGesture } from './pointer-gesture.ts';
import { floorWarnings } from '../../rack-generator/floor-items.ts';
import { createGymFloor, fitRackShadow } from './gym-floor.ts';
import { FrameFinishResources, addSteelUVs } from './frame-finishes.ts';
import { structureCandidates, type StructureCandidate } from '../../rack-generator/structure-candidates.ts';
import { vendorAttribution } from '../../rack-generator/vendor-metadata.ts';
import { placementMounts, proposalAt, proposalCollision, type PlacementProposal } from '../../rack-generator/placement-proposals.ts';
import { swapCandidate, swapCandidates, type SwapCandidate } from '../../rack-generator/swap.ts';
import { createSwapRegions } from './swap-regions.ts';
import { cloneInstanceMaterials } from './instance-materials.ts';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { createStudioLighting } from './studio-lighting.ts';
import { detectCollisions } from "../../rack-generator/assembly-collisions.ts";
import type {
  Mount,
  ResolvedInstance,
  Vec3,
} from "../../rack-generator/types.ts";
import type {
  LibraryWorkerRequest,
  LibraryWorkerResponse,
} from "../../rack-generator/worker-types.ts";
import type { BuilderStore } from "../state/builder-store.ts";
export type BuilderView = "iso" | "front" | "side" | "top";
export interface BuilderScene {
  fit(mode?: BuilderView): void;
  refitOnNextBuild(): void;
  exportGLB(): Promise<ArrayBuffer>;
  dispose(): void;
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  for (const m of Array.isArray(material) ? material : [material]) m.dispose();
}
function disposeMeshes(root: THREE.Object3D, geometry = true) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      if (geometry) o.geometry.dispose();
      disposeMaterial(o.material);
      if (o instanceof THREE.InstancedMesh) o.dispose();
    }
  });
}
export function createBuilderScene(
  viewport: HTMLElement,
  store: BuilderStore,
): BuilderScene {
  let snapshot = store.getSnapshot(),
    disposed = false,
    generation = 0,
    previewSerial = 0,
    requestId = 0,
    hasFit = false,
    view: BuilderView = "iso";
  let previewTarget: Mount | null = null,
    selectionBoxes: THREE.Box3Helper[] = [];
  let mountPoints: Mount[] = [];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e9ede7");
  scene.fog = new THREE.Fog("#e9ede7", 10000, 18000);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const lighting = createStudioLighting(scene, renderer, true);
  const finishes = new FrameFinishResources(renderer.capabilities.getMaxAnisotropy());
  viewport.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Rack assembly: drag to orbit, click a part to edit",
  );
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 40000),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const assemblyRoot = new THREE.Group(),
    ghostRoot = new THREE.Group(),
    mountsRoot = new THREE.Group();
  for (const root of [assemblyRoot, ghostRoot, mountsRoot]) {
    root.rotation.x = -Math.PI / 2;
    scene.add(root);
  }
  const floor = createGymFloor(renderer.capabilities.getMaxAnisotropy());
  scene.add(floor.mesh);
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    instances = new Map<string, THREE.Group>();
  const worker = new Worker(
    new URL("../../rack-generator/library-worker.ts", import.meta.url),
    { type: "module" },
  );
  const pending = new Map<
      string | number,
      { resolve: (model: THREE.Group) => void; reject: (error: Error) => void }
    >(),
    cache = new GeometryCache<THREE.Group>(model => disposeMeshes(model));
  let releaseAssembly = () => {}, releaseGhost = () => {};
  const nameOf = (part: string) =>
    snapshot.definitions
      .find((d) => d.id === part)
      ?.name.replace(/^BOS STRENGTH\s*/, "") || part;
  function geometryFor(entry: ResolvedInstance): Promise<THREE.Group> {
    const key = geometryKey(entry);
    return cache.get(key, () => new Promise<THREE.Group>((resolve, reject) => {
      const id = ++requestId;
      pending.set(id, { resolve, reject });
      const request: LibraryWorkerRequest = { id, part: entry.part, params: entry.params, logo: entry.logo };
      worker.postMessage(request);
    }));
  }
  function trimCache() {
    cache.trim([
      ...snapshot.resolved.map(geometryKey),
      ...(queuedPreview?.entries.map(geometryKey) ?? []),
    ]);
  }
  function transformed(model: THREE.Group, entry: ResolvedInstance) {
    const g = cloneInstanceMaterials(model, snapshot.doc.appearance, entry.id, finishes);
    g.traverse(object => {
      if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
    });
    g.position.set(...entry.position);
    g.rotation.set(...entry.rotation);
    g.userData = { id: entry.id, ownerId: entry.ownerId || entry.id, ...(vendorAttribution(entry.part) ? { vendorAttribution: vendorAttribution(entry.part) } : {}) };
    return g;
  }
  worker.onmessage = ({ data }: MessageEvent<LibraryWorkerResponse>) => {
    if (disposed) return;
    if (data.type === "catalog") {
      store.patch({ definitions: data.definitions });
      return;
    }
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.type === "error") {
      request.reject(new Error(data.error));
      return;
    }
    const model = new THREE.Group();
    try {
      for (const m of data.meshes) {
        const positions = new Float32Array((m.positions.length / m.stride) * 3);
        for (let i = 0; i < positions.length / 3; i++)
          for (let j = 0; j < 3; j++)
            positions[i * 3 + j] = m.positions[i * m.stride + j];
        const indexed = new THREE.BufferGeometry();
        indexed.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        indexed.setIndex(new THREE.BufferAttribute(m.indices, 1));
        const geometry = toCreasedNormals(indexed, Math.PI / 5);
        indexed.dispose();
        addSteelUVs(geometry);
        const material = new THREE.MeshStandardMaterial({
          color: m.color || "#283e32",
          metalness: m.metalness ?? 0.55,
          roughness: m.roughness ?? 0.4,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = m.name;
        mesh.userData.materialSource = { authoredFastenerFinish: m.authoredFastenerFinish, role: m.role, color: m.color, metalness: m.metalness, roughness: m.roughness };
        model.add(mesh);
      }
      request.resolve(model);
    } catch (error) {
      disposeMeshes(model);
      request.reject(new Error(message(error)));
    }
  };
  worker.onerror = (error) => {
    for (const p of pending.values()) p.reject(new Error(error.message));
    pending.clear();
    if (!disposed)
      store.status("Geometry worker failed. Reload to retry.", true);
  };
  function clearSelection() {
    for (const box of selectionBoxes) { scene.remove(box); box.geometry.dispose(); disposeMaterial(box.material); }
    selectionBoxes = [];
  }
  function refreshSelection() {
    clearSelection();
    for (const g of instances.values()) {
      if (!snapshot.selection.includes(g.userData.id as string)) continue;
      const box = new THREE.Box3().setFromObject(g);
      if (box.isEmpty()) continue;
      const helper = new THREE.Box3Helper(box.expandByScalar(5), new THREE.Color('#c77c36'));
      selectionBoxes.push(helper); scene.add(helper);
    }
  }
  function dimensions(measured = false) {
    const rack = snapshot.doc.rack,
      size = measured
        ? new THREE.Box3()
            .setFromObject(assemblyRoot)
            .getSize(new THREE.Vector3())
        : new THREE.Vector3(
            rack.width + 2 * rack.tube,
            rack.height,
            rack.depth + 2 * rack.tube,
          );
    return `${Math.ceil(size.x)} W × ${Math.ceil(size.z)} D × ${Math.ceil(size.y)} H mm`;
  }
  let rebuilding = false;
  function requestRebuild() {
    ++generation;
    store.patch({ loading: true, dimensions: dimensions() });
    if (!rebuilding) void rebuild();
  }
  async function rebuild() {
    rebuilding = true;
    const serial = generation,
      entries = snapshot.resolved;
    let releaseBatch = cache.pin(entries.map(geometryKey));
    store.patch({
      loading: true,
      status: "Building your rack…",
      error: false,
      dimensions: dimensions(),
    });
    try {
      // Wait for the whole batch, including errors, before starting the latest one.
      const results = await Promise.allSettled(entries.map(geometryFor));
      if (disposed || serial !== generation) return;
      const models = results.map(result => {
        if (result.status === 'rejected') throw result.reason;
        return result.value;
      });
      // Allocate per-instance materials only after rejecting stale/failed batches.
      const built = models.map((model, i) => transformed(model, entries[i]));
      disposeMeshes(assemblyRoot, false);
      assemblyRoot.clear();
      releaseAssembly();
      releaseAssembly = releaseBatch;
      releaseBatch = () => {};
      instances.clear();
      for (const g of built) {
        assemblyRoot.add(g);
        instances.set(String(g.userData.id), g);
      }
      scene.updateMatrixWorld(true);
      fitRackShadow(lighting.key, new THREE.Box3().setFromObject(assemblyRoot));
      refreshSelection();
      refreshPlacement();
      trimCache();
      const warnings = [...detectCollisions(entries), ...floorWarnings(snapshot.doc)];
      store.patch({
        loading: false,
        dimensions: dimensions(true),
        status: warnings.length
          ? `${warnings.length} placement warning${warnings.length === 1 ? "" : "s"} · ${entries.length} parts`
          : `${entries.length} parts · All connections aligned`,
        error: false,
      });
      if (!hasFit) {
        fit();
        hasFit = true;
      }
    } catch (error) {
      if (!disposed && serial === generation)
        store.patch({ loading: false, status: message(error), error: true });
    } finally {
      releaseBatch();
      if (!disposed) trimCache();
      rebuilding = false;
      if (!disposed && serial !== generation) void rebuild();
    }
  }
  function clearGhost() {
    disposeMeshes(ghostRoot, false);
    ghostRoot.clear();
    releaseGhost();
    releaseGhost = () => {};
    if (!disposed) trimCache();
  }
  function clearMounts() {
    disposeMeshes(mountsRoot);
    mountsRoot.clear();
    mountPoints = [];
  }
  let swapRegions: ReturnType<typeof createSwapRegions> | null = null;
  let hoveredSwap: SwapCandidate | null = null;
  let previewBusy = false;
  let queuedPreview: { entries: ResolvedInstance[]; serial: number } | null = null;
  const swapPart = () => snapshot.structureChoice ?? (!snapshot.placing?.movingId ? snapshot.placing?.part : null);
  const structureHandles = document.createElement('div');
  structureHandles.className = 'structure-handles';
  structureHandles.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  viewport.append(structureHandles);
  let structuralCandidates: StructureCandidate[] = [], visibleCandidates: StructureCandidate[] = [];
  let structuralPreview: StructureCandidate | null = null;
  const addingStructure = () => !!snapshot.structureChoice && snapshot.structureMode === 'add';
  function screenPoint(position: Vec3) {
    const p = assemblyRoot.localToWorld(new THREE.Vector3(...position)).project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    return { x: (p.x+1)*rect.width/2, y: (1-p.y)*rect.height/2, visible: p.z >= -1 && p.z <= 1 };
  }
  function positionHandles() {
    const placed: { x: number; y: number }[] = [];
    for (const [i, button] of [...structureHandles.children].entries()) {
      const point = screenPoint(visibleCandidates[i].position), el = button as HTMLButtonElement;
      while (placed.some(p => Math.abs(p.x-point.x)<110 && Math.abs(p.y-point.y)<30)) point.y += 30;
      placed.push(point);
      el.style.left = `${point.x}px`; el.style.top = `${point.y}px`;
      el.style.visibility = point.visible ? 'visible' : 'hidden';
      el.setAttribute('aria-pressed', String(visibleCandidates[i].key === structuralPreview?.key));
    }
  }
  function previewStructure(candidate: StructureCandidate | null) {
    if (candidate?.key === structuralPreview?.key) return;
    structuralPreview = candidate; queuedPreview = null;
    store.patch({ proposal: candidate, placementText: candidate ? `${candidate.label} · Click · ← → · ESC` : 'Hover a post or gap · ESC cancels' });
    renderer.domElement.style.cursor = candidate ? 'copy' : 'crosshair';
    positionHandles();
  }
  function commitStructure() {
    const candidate = structuralPreview;
    if (!candidate || snapshot.loading) return;
    store.acceptProposal();
  }
  function showStructureHandles(candidates: StructureCandidate[]) {
    if (visibleCandidates.map(c => c.key).join() === candidates.map(c => c.key).join()) return;
    visibleCandidates = candidates; structureHandles.replaceChildren();
    for (const candidate of candidates) {
      const button = document.createElement('button');
      button.textContent = candidate.label; button.title = candidate.label;
      button.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:auto;padding:5px 8px;border-radius:15px;border:1px solid #b9782a;background:#fff5dd;color:#492d09;font-size:11px;white-space:nowrap';
      button.addEventListener('pointerenter', () => previewStructure(candidate));
      button.addEventListener('focus', () => previewStructure(candidate));
      button.addEventListener('click', () => { previewStructure(candidate); commitStructure(); });
      structureHandles.append(button);
    }
    positionHandles();
  }
  function updateStructure(event: { clientX: number; clientY: number }) {
    if (snapshot.loading) return;
    const hit = pickOwner(event), edge = snapshot.doc.connections.find(e => e.id === hit?.ownerId);
    const anchorIds = edge ? [edge.from, edge.to] : [hit?.ownerId];
    let candidates = structuralCandidates.filter(c => anchorIds.includes(c.anchorId) || c.doc.connections.some(e => e.id === c.ownerId && anchorIds.includes(e.to)));
    const rect = renderer.domElement.getBoundingClientRect();
    const distance = (c: StructureCandidate) => { const p = screenPoint(c.position); return p.visible ? Math.hypot(p.x+rect.left-event.clientX,p.y+rect.top-event.clientY) : Infinity; };
    if (!candidates.length) {
      const nearby = structuralCandidates.filter(c => distance(c) < 65);
      if (nearby.length) candidates = nearby;
    }
    if (!candidates.length && structuralPreview) {
      // Keep the proposal reachable across the short path from its anchor to its ghost.
      const ghost = structuralPreview.entries.find(e => e.part === 'upright');
      if (ghost) { const p = screenPoint([ghost.position[0],ghost.position[1],snapshot.doc.rack.height*0.55]);
        if (Math.hypot(p.x+rect.left-event.clientX,p.y+rect.top-event.clientY)<65) return;
      }
    }
    showStructureHandles(candidates);
    if (!candidates.some(c => c.key === structuralPreview?.key)) previewStructure([...candidates].sort((a,b) => distance(a)-distance(b))[0] ?? null);
  }
  const onStructureKey = (event: KeyboardEvent) => {
    if (!addingStructure() || !visibleCandidates.length || (event.target instanceof HTMLElement && event.target.matches('input,select,textarea'))) return;
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Alt'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.shiftKey ? -1 : 1;
    const index = visibleCandidates.findIndex(c => c.key === structuralPreview?.key);
    previewStructure(visibleCandidates[(index+direction+visibleCandidates.length)%visibleCandidates.length]);
  };
  window.addEventListener('keydown', onStructureKey);
  function resetPlacement() {
    structuralCandidates = []; structuralPreview = null; showStructureHandles([]);
    swapRegions?.dispose(); swapRegions = null; hoveredSwap = null; queuedPreview = null;
    previewTarget = null;
    previewSerial++;
    clearGhost();
    clearMounts();
    controls.enabled = !floorDrag && !snapshot.selectionTool;
    renderer.domElement.style.cursor = "";
  }
  function showMounts() {
    clearMounts();
    mountPoints = snapshot.placing ? placementMounts(snapshot.doc, snapshot.placing.part, snapshot.placing.movingId) : [];
    const geometry = new THREE.SphereGeometry(6, 8, 6),
      material = new THREE.MeshBasicMaterial({
        color: "#d28a40",
        depthTest: true,
        transparent: true,
        opacity: 0.65,
      });
    const dots = new THREE.InstancedMesh(
        geometry,
        material,
        mountPoints.length,
      ),
      matrix = new THREE.Matrix4();
    mountPoints.forEach((m, i) =>
      dots.setMatrixAt(i, matrix.makeTranslation(...m.position)),
    );
    dots.renderOrder = 5;
    mountsRoot.add(dots);
  }
  function refreshPlacement() {
    resetPlacement();
    const placing = snapshot.placing, part = swapPart();
    if (addingStructure()) {
      structuralCandidates = structureCandidates(snapshot.doc, snapshot.structureChoice!);
      renderer.domElement.style.cursor = 'crosshair';
      store.patch({ proposal: null, placementText: structuralCandidates.length ? 'Hover a post or gap · ESC cancels' : 'No valid adjacent positions · ESC cancels' });
      return;
    }
    if (part && part !== 'rep-nighthawk') {
      swapRegions = createSwapRegions(swapCandidates(snapshot.doc, part), instances, snapshot.doc);
      scene.add(swapRegions.root);
    }
    if (!placing && !snapshot.structureChoice) return;
    if (placing && placing.part !== 'rep-nighthawk') showMounts();
    renderer.domElement.style.cursor = "crosshair";
    if (snapshot.proposal) void renderProposal(snapshot.proposal);
  }
  function renderProposal(proposal: PlacementProposal) {
    previewTarget = proposal.target ?? null;
    const serial = ++previewSerial;
    clearGhost();
    void renderPreview(proposal.entries, serial);
  }
  const normals: Record<Mount["face"], Vec3> = {
    front: [0, -1, 0],
    back: [0, 1, 0],
    left: [-1, 0, 0],
    right: [1, 0, 0],
  };
  function nearestMount(event: {
    clientX: number;
    clientY: number;
  }): Mount | null {
    const rect = renderer.domElement.getBoundingClientRect();
    let best: Mount | null = null,
      distance = 28;
    scene.updateMatrixWorld(true);
    for (const mount of mountPoints) {
      const world = mountsRoot.localToWorld(
          new THREE.Vector3(...mount.position),
        ),
        normal = new THREE.Vector3(...normals[mount.face]).transformDirection(
          mountsRoot.matrixWorld,
        );
      if (normal.dot(camera.position.clone().sub(world)) <= 0) continue;
      const point = world.project(camera);
      if (point.z > 1 || point.z < -1) continue;
      const d = Math.hypot(
        rect.left + ((point.x + 1) * rect.width) / 2 - event.clientX,
        rect.top + ((1 - point.y) * rect.height) / 2 - event.clientY,
      );
      if (d < distance) {
        distance = d;
        best = mount;
      }
    }
    return best;
  }
  function pickOwner(event: { clientX: number; clientY: number }): { id: string; ownerId: string } | null {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    scene.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([assemblyRoot, ...(swapRegions ? [swapRegions.root] : [])], true)
      .filter(hit => hit.object instanceof THREE.Mesh);
    let object: THREE.Object3D | null = hits[0]?.object ?? null;
    while (object && !object.userData.ownerId) object = object.parent;
    return object ? { id: object.userData.id ?? object.userData.ownerId, ownerId: object.userData.ownerId } : null;
  }
  /** One ghost batch in flight, one latest pending hover; rapid pointer movement cannot flood the worker. */
  async function renderPreview(entries: ResolvedInstance[], serial: number) {
    if (previewBusy) { queuedPreview = { entries, serial }; return; }
    previewBusy = true;
    let releaseBatch = cache.pin(entries.map(geometryKey));
    try {
      const results = await Promise.allSettled(entries.map(geometryFor));
      const models = results.map(result => {
        if (result.status === 'rejected') throw result.reason;
        return result.value;
      });
      if (disposed || serial !== previewSerial) return;
      clearGhost();
      releaseGhost = releaseBatch;
      releaseBatch = () => {};
      for (const [i, model] of models.entries()) {
        const g = transformed(model, entries[i]);
        g.traverse(o => { if (o instanceof THREE.Mesh) {
          o.castShadow = o.receiveShadow = false;
          disposeMaterial(o.material);
          o.material = new THREE.MeshStandardMaterial({ color: '#e2a248', transparent: true, opacity: 0.55, depthWrite: false, depthTest: false });
          o.renderOrder = 10;
        } });
        ghostRoot.add(g);
      }
    } catch (error) {
      if (!disposed && serial === previewSerial) store.patch({ proposal: null, placementText: message(error) });
    } finally {
      releaseBatch();
      previewBusy = false;
      if (!disposed) trimCache();
      const next = queuedPreview; queuedPreview = null;
      if (next && !disposed && next.serial === previewSerial) void renderPreview(next.entries, next.serial);
    }
  }
  function candidateAt(event: { clientX: number; clientY: number }): SwapCandidate | null {
    const part = swapPart(), hit = pickOwner(event);
    if (!part || !hit) return null;
    // A bare post is still a mounting surface when placing accessories.
    if (snapshot.placing && !snapshot.doc.accessories.some(a => a.id === hit.ownerId)) return null;
    return swapCandidate(snapshot.doc, hit.id, part);
  }
  function updatePreview(event: { clientX: number; clientY: number }) {
    if (!snapshot.placing && !snapshot.structureChoice) return;
    if(snapshot.placing?.part === 'rep-nighthawk') { const point=floorPoint(event); if(point) store.previewFloor(point); return; }
    if (addingStructure()) { updateStructure(event); return; }
    const candidate = candidateAt(event);
    if (candidate) {
      if (hoveredSwap?.ownerId === candidate.ownerId) return;
      hoveredSwap = candidate; previewTarget = null;
      swapRegions?.hover(candidate.valid ? candidate.ownerId : null);
      if (!candidate.valid) { store.patch({ proposal: null, placementText: "Won’t fit: " + candidate.reason }); return; }
      const proposal = { ...candidate, label: 'Swap ' + candidate.ownerId };
      const collision = proposalCollision(snapshot.resolved, proposal);
      store.patch({ proposal: collision ? null : proposal, placementText: collision || proposal.label });
      return;
    }
    const hadSwap = !!hoveredSwap;
    hoveredSwap = null; swapRegions?.hover(null);
    const target = snapshot.placing ? nearestMount(event) : null;
    if (!target || (!hadSwap && JSON.stringify(target) === JSON.stringify(previewTarget))) return;
    try {
      const proposal = proposalAt(snapshot.doc, snapshot.placing!.part, target, snapshot.paired, snapshot.placing!.movingId);
      const collision = proposalCollision(snapshot.resolved, proposal);
      store.patch({ proposal: collision ? null : proposal, placementText: collision || proposal.label });
    } catch(error) { store.patch({ proposal: null, placementText: message(error) }); }
  }
  function dropPlacement(event: { clientX: number; clientY: number }) {
    if(snapshot.placing?.part === 'rep-nighthawk') { updatePreview(event); store.acceptProposal(); return; }
    if (addingStructure()) { commitStructure(); return; }
    if (!candidateAt(event) && !nearestMount(event)) return;
    updatePreview(event);
    store.acceptProposal();
  }
  const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  let floorDrag: {id:string;start:[number,number];position:[number,number];moved:boolean} | null=null;
  function floorPoint(event:{clientX:number;clientY:number;altKey?:boolean}, snap=true):[number,number]|null {
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const point=raycaster.ray.intersectPlane(floorPlane,new THREE.Vector3());
    if(!point) return null;
    const grid=(v:number)=>snap && !event.altKey ? Math.round(v/25)*25 : v;
    return [grid(point.x),grid(point.z)];
  }
  const floorKey=(event:KeyboardEvent)=>{
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !(event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(event.target.tagName))) {
      // BuilderPage invokes history next; leave store gesture finalization to history.
      floorDrag = null; pointerGesture.finish(); selecting = false; marquee.style.display = 'none';
      controls.enabled = !snapshot.selectionTool;
      return;
    }
    if(event.key==='Escape') { floorDrag=null; store.cancelGesture(); controls.enabled=true; pointerGesture.finish(); return; }
    if(event.key.toLowerCase()!=='r' || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(event.target.tagName))) return;
    const delta=(event.shiftKey?-1:1)*Math.PI/12;
    if(snapshot.placing?.part==='rep-nighthawk') {event.preventDefault();store.previewFloor(undefined,delta);return;}
    const id=floorDrag?.id ?? (snapshot.selection.length===1?snapshot.selected:null);
    const item=snapshot.doc.floorItems?.find(i=>i.id===id);
    if(item) {event.preventDefault();if(floorDrag)floorDrag.moved=true;store.updateFloor(item.id,{rotation:item.rotation+delta});}
  };
  document.addEventListener('keydown',floorKey);
  const marquee = document.createElement('div');
  marquee.style.cssText = 'position:fixed;pointer-events:none;border:1px solid #c77c36;background:#c77c3622;z-index:100;display:none';
  viewport.append(marquee);
  let selecting = false;
  const onDown = (event: PointerEvent) => {
    pointerGesture.begin(event);
    if(event.button===0 && !snapshot.placing && !snapshot.structureChoice && !snapshot.selectionTool && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const hit=pickOwner(event),item=snapshot.doc.floorItems?.find(i=>i.id===hit?.id),point=floorPoint(event,false);
      if(item && point && (snapshot.selection.length<=1 || !snapshot.selection.includes(item.id))) {
        store.select(item.id);store.beginGesture();floorDrag={id:item.id,start:point,position:[...item.position],moved:false};
        controls.enabled=false;pointerGesture.capture();event.stopImmediatePropagation();return;
      }
    }
    selecting = snapshot.selectionTool && !snapshot.placing && !snapshot.structureChoice && event.button === 0;
    if ((!addingStructure() && (snapshot.placing || snapshot.structureChoice) || selecting) && event.button === 0) controls.enabled = false;
    if ((!addingStructure() && (snapshot.placing || snapshot.structureChoice) || selecting) && event.button === 0) pointerGesture.capture();
  };
  const onMove = (event: PointerEvent) => {
    if(floorDrag && pointerGesture.start) {
      if(Math.hypot(event.clientX-pointerGesture.start[0],event.clientY-pointerGesture.start[1])>4)floorDrag.moved=true;
      const point=floorPoint(event,false);
      if(point && floorDrag.moved) {const grid=(v:number)=>event.altKey?v:Math.round(v/25)*25;store.updateFloor(floorDrag.id,{position:[grid(floorDrag.position[0]+point[0]-floorDrag.start[0]),grid(floorDrag.position[1]+point[1]-floorDrag.start[1])]});}
      return;
    }
    if (selecting && pointerGesture.start) {
      Object.assign(marquee.style, { display: 'block', left: `${Math.min(pointerGesture.start[0], event.clientX)}px`, top: `${Math.min(pointerGesture.start[1], event.clientY)}px`, width: `${Math.abs(event.clientX - pointerGesture.start[0])}px`, height: `${Math.abs(event.clientY - pointerGesture.start[1])}px` });
    }
    if (!pointerGesture.start) void updatePreview(event);
  };
  const onUp = (event: PointerEvent) => {
    if(floorDrag) {floorDrag=null;pointerGesture.finish();store.endGesture();controls.enabled=true;return;}
    controls.enabled = !floorDrag && !snapshot.selectionTool;
    marquee.style.display = 'none';
    if (selecting && pointerGesture.start && Math.hypot(event.clientX - pointerGesture.start[0], event.clientY - pointerGesture.start[1]) > 6) {
      const rect = renderer.domElement.getBoundingClientRect();
      const left = Math.min(pointerGesture.start[0], event.clientX), right = Math.max(pointerGesture.start[0], event.clientX);
      const top = Math.min(pointerGesture.start[1], event.clientY), bottom = Math.max(pointerGesture.start[1], event.clientY);
      const ids: string[] = [];
      for (const g of instances.values()) {
        const center = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()).project(camera);
        const x = rect.left + (center.x + 1) * rect.width / 2, y = rect.top + (1 - center.y) * rect.height / 2;
        if (center.z >= -1 && center.z <= 1 && x >= left && x <= right && y >= top && y <= bottom) ids.push(g.userData.id as string);
      }
      store.selectMany(ids, event.metaKey || event.ctrlKey); pointerGesture.finish(); selecting = false; return;
    }
    selecting = false;
    const down = pointerGesture.finish();
    const bounds = renderer.domElement.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
    if (
      event.button !== 0 ||
      !down ||
      Math.hypot(
        event.clientX - down[0],
        event.clientY - down[1],
      ) > 6
    )
      return;
    if (snapshot.placing || snapshot.structureChoice) {
      dropPlacement(event);
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(assemblyRoot, true)[0];
    let object: THREE.Object3D | null = hit?.object ?? null;
    while (object && !object.userData.ownerId) object = object.parent;
    store.select(
      typeof object?.userData.id === "string"
        ? object.userData.id
        : null,
      event,
    );
  };
  const onLeave = (event: PointerEvent) => {
    if (addingStructure() && !(event.relatedTarget instanceof Node && viewport.contains(event.relatedTarget))) {
      showStructureHandles([]); previewStructure(null);
    }
  };
  const onCancel = () => {
    if(floorDrag) {floorDrag=null;store.cancelGesture();}
    pointerGesture.finish();
    selecting = false; marquee.style.display = 'none';
    controls.enabled = !floorDrag && !snapshot.selectionTool;
  };
  const pointerGesture = new PointerGesture(renderer.domElement, onCancel);
  const onDrag = (event: DragEvent) => {
    event.preventDefault();
    if (snapshot.placing || snapshot.structureChoice) void updatePreview(event);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dropPlacement(event);
  };
  renderer.domElement.addEventListener("pointerdown", onDown, true);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onCancel);
  viewport.addEventListener("pointerleave", onLeave);
  viewport.addEventListener("dragover", onDrag);
  viewport.addEventListener("drop", onDrop);
  function fit(mode: BuilderView = view) {
    view = mode;
    const box = new THREE.Box3().setFromObject(assemblyRoot);
    if (box.isEmpty())
      box.set(
        new THREE.Vector3(-600, 0, -500),
        new THREE.Vector3(600, snapshot.doc.rack.height, 500),
      );
    const center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3()),
      directions: Record<BuilderView, Vec3> = {
        iso: [1, 0.65, 1.2],
        front: [0, 0, 1],
        side: [1, 0, 0],
        top: [0, 1, 0.0001],
      };
    const direction = new THREE.Vector3(...directions[mode]).normalize(),
      right = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), direction)
        .normalize(),
      up = new THREE.Vector3().crossVectors(direction, right).normalize(),
      tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 1;
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const corner = new THREE.Vector3(
            (x * size.x) / 2,
            (y * size.y) / 2,
            (z * size.z) / 2,
          );
          distance = Math.max(
            distance,
            corner.dot(direction) +
              Math.abs(corner.dot(right)) / (tangent * camera.aspect),
            corner.dot(direction) + Math.abs(corner.dot(up)) / tangent,
          );
        }
    camera.position.copy(center).addScaledVector(direction, distance * 1.3);
    controls.target.copy(center);
    controls.update();
  }
  const resize = () => {
    const rect = viewport.getBoundingClientRect(),
      width = Math.max(1, rect.width),
      height = Math.max(1, rect.height);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();
  let frame = 0;
  function animate() {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    controls.update();
    camera.near = Math.max(
      0.5,
      camera.position.distanceTo(controls.target) / 200,
    );
    camera.updateProjectionMatrix();
    positionHandles();
    renderer.render(scene, camera);
  }
  animate();
  const unsubscribe = store.subscribe(() => {
    const previous = snapshot;
    snapshot = store.getSnapshot();
    if (disposed) return;
    if (snapshot.doc !== previous.doc) requestRebuild();
    if (snapshot.selection !== previous.selection) refreshSelection();
    controls.enabled = !floorDrag && !snapshot.selectionTool && !selecting && !(pointerGesture.start && !addingStructure() && (snapshot.placing || snapshot.structureChoice));
    if (previous.selectionTool && !snapshot.selectionTool) onCancel();
    if (
      snapshot.placing !== previous.placing ||
      snapshot.structureChoice !== previous.structureChoice ||
      snapshot.structureMode !== previous.structureMode ||
      snapshot.paired !== previous.paired ||
      snapshot.doc !== previous.doc
    )
      refreshPlacement();
    else if (snapshot.proposal !== previous.proposal) {
      if (snapshot.proposal && (snapshot.placing || snapshot.structureChoice)) void renderProposal(snapshot.proposal);
      else { previewTarget = null; previewSerial++; clearGhost(); }
    }
  });
  requestRebuild();
  if (snapshot.placing || snapshot.structureChoice) refreshPlacement();
  return {
    fit,
    refitOnNextBuild() {
      hasFit = false;
    },
    async exportGLB() {
      if (disposed) throw Error("Scene has been disposed.");
      if (snapshot.loading)
        throw Error("Wait for the rack to finish building.");
      const output = assemblyRoot.clone();
      output.name = "BOS STRENGTH rack";
      output.scale.setScalar(0.001);
      const data = await new GLTFExporter().parseAsync(output, {
        binary: true,
      });
      if (!(data instanceof ArrayBuffer)) throw Error("Unexpected GLB output.");
      return data;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      previewSerial++;
      unsubscribe();
      cancelAnimationFrame(frame);
      observer.disconnect();
      pointerGesture.dispose();
      controls.dispose();
      window.removeEventListener("keydown", onStructureKey);
      structureHandles.remove();
      marquee.remove();
      document.removeEventListener("keydown",floorKey);
      renderer.domElement.removeEventListener("pointerdown", onDown, true);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onCancel);
      viewport.removeEventListener("pointerleave", onLeave);
      viewport.removeEventListener("dragover", onDrag);
      viewport.removeEventListener("drop", onDrop);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      for (const request of pending.values())
        request.reject(new Error("Scene disposed"));
      pending.clear();
      swapRegions?.dispose(); queuedPreview = null;
      clearGhost();
      clearMounts();
      clearSelection();
      disposeMeshes(assemblyRoot, false);
      assemblyRoot.clear();
      instances.clear();
      releaseAssembly();
      cache.dispose();
      floor.dispose();

      finishes.dispose();
      lighting.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      scene.clear();
    },
  };
}
