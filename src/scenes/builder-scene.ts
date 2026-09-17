import { structureCandidates, type StructureCandidate } from '../../rack-generator/structure-candidates.ts';
import { swapCandidate, swapCandidates, type SwapCandidate } from '../../rack-generator/swap.ts';
import { createSwapRegions } from './swap-regions.ts';
import { cloneInstanceMaterials } from './instance-materials.ts';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { resolveAssembly, getMounts } from "../../rack-generator/assembly.ts";
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
    selectionBox: THREE.Box3Helper | null = null,
    pointerDown: [number, number] | null = null;
  let mountPoints: Mount[] = [];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e9ede7");
  scene.add(new THREE.HemisphereLight(0xffffff, 0x899383, 2.6));
  for (const p of [
    [2500, 4500, 2200],
    [-2500, 1800, -2000],
  ]) {
    const l = new THREE.DirectionalLight(0xffffff, 3);
    l.position.set(p[0], p[1], p[2]);
    scene.add(l);
  }
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Rack assembly: drag to orbit, click a part to edit",
  );
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 40000),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const assemblyRoot = new THREE.Group(),
    ghostRoot = new THREE.Group(),
    mountsRoot = new THREE.Group();
  for (const root of [assemblyRoot, ghostRoot, mountsRoot]) {
    root.rotation.x = -Math.PI / 2;
    scene.add(root);
  }
  const grid = new THREE.GridHelper(10000, 200, "#b4c0b1", "#d6ded2");
  grid.position.y = -0.5;
  scene.add(grid);
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
    cache = new Map<string, Promise<THREE.Group>>();
  const geometryKey = (entry: ResolvedInstance) =>
    entry.part +
    ":" +
    JSON.stringify(
      Object.fromEntries(
        Object.entries(entry.params).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  const nameOf = (part: string) =>
    snapshot.definitions
      .find((d) => d.id === part)
      ?.name.replace(/^BOS STRENGTH\s*/, "") || part;
  function geometryFor(entry: ResolvedInstance): Promise<THREE.Group> {
    const key = geometryKey(entry);
    let promise = cache.get(key);
    if (!promise) {
      promise = new Promise<THREE.Group>((resolve, reject) => {
        const id = ++requestId;
        pending.set(id, { resolve, reject });
        const request: LibraryWorkerRequest = {
          id,
          part: entry.part,
          params: entry.params,
        };
        worker.postMessage(request);
      }).catch((error) => {
        cache.delete(key);
        throw error;
      });
    }
    cache.delete(key);
    cache.set(key, promise);
    return promise;
  }
  function trimCache() {
    const active = new Set(snapshot.resolved.map(geometryKey));
    for (const [key, promise] of cache) {
      if (cache.size <= 32) break;
      if (
        active.has(key) ||
        (snapshot.placing && key.startsWith(snapshot.placing.part + ":")) ||
        (snapshot.structureChoice && key.startsWith(snapshot.structureChoice + ":"))
      )
        continue;
      cache.delete(key);
      void promise.then(
        (model) => disposeMeshes(model),
        () => {},
      );
    }
  }
  function transformed(model: THREE.Group, entry: ResolvedInstance) {
    const g = cloneInstanceMaterials(model, snapshot.doc.appearance, entry.id);
    g.position.set(...entry.position);
    g.rotation.set(...entry.rotation);
    g.userData = { id: entry.id, ownerId: entry.ownerId || entry.id };
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
        const material = new THREE.MeshStandardMaterial({
          color: m.color || "#283e32",
          metalness: m.metalness ?? 0.55,
          roughness: m.roughness ?? 0.4,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = m.name;
        mesh.userData.materialSource = { role: m.role, color: m.color, metalness: m.metalness, roughness: m.roughness };
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
    if (selectionBox) {
      scene.remove(selectionBox);
      selectionBox.geometry.dispose();
      disposeMaterial(selectionBox.material);
      selectionBox = null;
    }
  }
  function refreshSelection() {
    clearSelection();
    const box = new THREE.Box3();
    for (const g of instances.values())
      if (
        g.userData.ownerId === snapshot.selected ||
        g.userData.id === snapshot.selected
      )
        box.union(new THREE.Box3().setFromObject(g));
    if (!box.isEmpty()) {
      selectionBox = new THREE.Box3Helper(
        box.expandByScalar(5),
        new THREE.Color("#c77c36"),
      );
      scene.add(selectionBox);
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
      instances.clear();
      for (const g of built) {
        assemblyRoot.add(g);
        instances.set(String(g.userData.id), g);
      }
      scene.updateMatrixWorld(true);
      refreshSelection();
      refreshPlacement();
      trimCache();
      const warnings = detectCollisions(entries);
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
      rebuilding = false;
      if (!disposed && serial !== generation) void rebuild();
    }
  }
  function clearGhost() {
    disposeMeshes(ghostRoot, false);
    ghostRoot.clear();
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
    const serial = ++previewSerial; clearGhost();
    store.patch({ placementText: candidate ? `${candidate.label} · Click · ← → · ESC` : 'Hover a post or gap · ESC cancels' });
    renderer.domElement.style.cursor = candidate ? 'copy' : 'crosshair';
    if (candidate) void renderPreview(candidate.entries, serial);
    positionHandles();
  }
  function commitStructure() {
    const candidate = structuralPreview;
    if (!candidate || snapshot.loading) return;
    store.act(() => { store.commit(candidate.doc); store.select(candidate.ownerId); });
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
    controls.enabled = true;
    renderer.domElement.style.cursor = "";
  }
  function showMounts() {
    clearMounts();
    mountPoints = getMounts(snapshot.doc, snapshot.placing?.part).filter(
      (mount) => {
        try {
          store.placementDoc(mount);
          return true;
        } catch {
          return false;
        }
      },
    );
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
      store.patch({ placementText: structuralCandidates.length ? 'Hover a post or gap · ESC cancels' : 'No valid adjacent positions · ESC cancels' });
      return;
    }
    if (part) {
      swapRegions = createSwapRegions(swapCandidates(snapshot.doc, part), instances, snapshot.doc);
      scene.add(swapRegions.root);
    }
    if (snapshot.structureChoice) {
      renderer.domElement.style.cursor = 'crosshair';
      store.patch({ placementText: 'Hover a highlighted frame region to preview · click to swap · ESC cancels' });
      return;
    }
    if (!placing) {
      store.patch({ placementText: "" });
      return;
    }
    showMounts();
    renderer.domElement.style.cursor = "crosshair";
    store.patch({
      placementText: `${placing.movingId ? "Move" : "Place"} ${nameOf(placing.part)} · choose a highlighted connection`,
    });
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
    try {
      const models = await Promise.all(entries.map(geometryFor));
      if (disposed || serial !== previewSerial) return;
      for (const [i, model] of models.entries()) {
        const g = transformed(model, entries[i]);
        g.traverse(o => { if (o instanceof THREE.Mesh) {
          disposeMaterial(o.material);
          o.material = new THREE.MeshStandardMaterial({ color: '#e2a248', transparent: true, opacity: 0.55, depthWrite: false, depthTest: false });
          o.renderOrder = 10;
        } });
        ghostRoot.add(g);
      }
    } catch (error) {
      if (!disposed && serial === previewSerial) store.patch({ placementText: message(error) });
    } finally {
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
    if (addingStructure()) { updateStructure(event); return; }
    const candidate = candidateAt(event);
    if (candidate) {
      if (hoveredSwap?.ownerId === candidate.ownerId) return;
      hoveredSwap = candidate; previewTarget = null; queuedPreview = null;
      const serial = ++previewSerial; clearGhost(); swapRegions?.hover(candidate.valid ? candidate.ownerId : null);
      renderer.domElement.style.cursor = candidate.valid ? 'copy' : 'not-allowed';
      store.patch({ placementText: candidate.valid ? 'Swap ' + candidate.ownerId + ' · Click to replace · Undo restores the previous part' : "Won’t fit: " + candidate.reason });
      if (candidate.valid) void renderPreview(candidate.entries, serial);
      return;
    }
    const hadSwap = !!hoveredSwap;
    hoveredSwap = null; swapRegions?.hover(null);
    const target = snapshot.placing ? nearestMount(event) : null;
    if (!hadSwap && JSON.stringify(target) === JSON.stringify(previewTarget)) return;
    previewTarget = target; queuedPreview = null;
    const serial = ++previewSerial; clearGhost();
    renderer.domElement.style.cursor = target ? 'crosshair' : 'not-allowed';
    if (!target) { store.patch({ placementText: 'Choose a highlighted compatible region or mounting hole · ESC cancels' }); return; }
    try {
      const next = store.placementDoc(target), nextId = snapshot.placing?.movingId || next.accessories[next.accessories.length - 1].id;
      store.patch({ placementText: target.uprightId + ' · ' + target.face + ' · Hole ' + (target.hole + 1) + ' · Click to place' });
      void renderPreview(resolveAssembly(next).filter(r => (r.ownerId || r.id) === nextId), serial);
    } catch (error) { previewTarget = null; store.patch({ placementText: message(error) }); }
  }
  function dropPlacement(event: { clientX: number; clientY: number }) {
    if (addingStructure()) { commitStructure(); return; }
    const candidate = candidateAt(event);
    if (candidate) {
      if (!candidate.valid) { store.status("Won’t fit: " + candidate.reason, true); return; }
      store.act(() => { store.commit(candidate.doc); store.select(candidate.ownerId); });
      return;
    }
    if (!snapshot.placing) { store.status('Choose a highlighted frame region. Escape cancels.'); return; }
    const target = nearestMount(event);
    if (!target) { store.status('Choose a highlighted mounting hole. Escape cancels placement.'); return; }
    store.act(() => {
      const next = store.placementDoc(target), selected = snapshot.placing?.movingId || next.accessories[next.accessories.length - 1].id;
      store.commit(next); store.select(selected);
    });
  }
  const onDown = (event: PointerEvent) => {
    pointerDown = [event.clientX, event.clientY];
    if (!addingStructure() && (snapshot.placing || snapshot.structureChoice) && event.button === 0) controls.enabled = false;
  };
  const onMove = (event: PointerEvent) => {
    if (!pointerDown) void updatePreview(event);
  };
  const onUp = (event: PointerEvent) => {
    controls.enabled = true;
    const down = pointerDown; pointerDown = null;
    if (
      event.button !== 0 ||
      !down ||
      Math.hypot(
        event.clientX - down[0],
        event.clientY - down[1],
      ) > 6
    )
      return;
    pointerDown = null;
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
    );
  };
  const onLeave = (event: PointerEvent) => {
    if (addingStructure() && !(event.relatedTarget instanceof Node && structureHandles.contains(event.relatedTarget))) {
      showStructureHandles([]); previewStructure(null);
    }
  };
  const onCancel = () => {
    pointerDown = null;
    controls.enabled = true;
  };
  const onDrag = (event: DragEvent) => {
    event.preventDefault();
    if (snapshot.placing || snapshot.structureChoice) void updatePreview(event);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dropPlacement(event);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onCancel);
  renderer.domElement.addEventListener("pointerleave", onLeave);
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
    if (snapshot.selected !== previous.selected) refreshSelection();
    if (
      snapshot.placing !== previous.placing ||
      snapshot.structureChoice !== previous.structureChoice ||
      snapshot.structureMode !== previous.structureMode ||
      snapshot.paired !== previous.paired ||
      snapshot.doc !== previous.doc
    )
      refreshPlacement();
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
      controls.dispose();
      window.removeEventListener("keydown", onStructureKey);
      structureHandles.remove();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onCancel);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
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
      for (const promise of cache.values())
        void promise.then(
          (model) => disposeMeshes(model),
          () => {},
        );
      cache.clear();
      grid.geometry.dispose();
      disposeMaterial(grid.material);
      environment.dispose();
      scene.environment = null;
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      scene.clear();
    },
  };
}
