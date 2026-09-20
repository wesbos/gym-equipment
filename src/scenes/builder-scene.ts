import { rotationMode } from '../../rack-generator/assembly.ts';
import { pickupAppearance, cloneAppliedAssembly } from './pickup-materials.ts';
import { GeometryCache, geometryKey } from '../geometry/geometry-cache.ts';
import { createGymBackdrop } from './gym-backdrop.ts';
import { PointerGesture } from './pointer-gesture.ts';
import { floorWarnings } from '../../rack-generator/floor-items.ts';
import { isFloorPart } from '../../rack-generator/floor-registry.ts';
import { barSpec, freeCradles, parkedPose, parksInCradles, type BarCradle } from '../../rack-generator/barbell-cradles.ts';
import { isWallPart, wallPart } from '../../rack-generator/wall-registry.ts';
import { roomOf, wallOpenings, wallWarnings } from '../../rack-generator/wall-items.ts';
import { wallFrames, wallHit, wallPlaneHit, type WallId } from '../../rack-generator/walls.ts';
import { createGymWalls } from './gym-walls.ts';
import { RoomMaterials, createRoomScenery } from './room-scenery.ts';
import { resolveFinishes, roomLighting } from '../../rack-generator/room-finishes.ts';
import { isHangPart } from '../../rack-generator/hang-registry.ts';
import { freeSlots, hangWarnings, hookAnchor, type HangTarget } from '../../rack-generator/hang-items.ts';
import { createGymFloor, fitRackShadow } from './gym-floor.ts';
import { FrameFinishResources, addSteelUVs } from './frame-finishes.ts';
import { structureCandidates, type StructureCandidate } from '../../rack-generator/structure-candidates.ts';
import { partAttribution } from '../../rack-generator/attribution.ts';
import { placementMounts, proposalCollision, type PlacementProposal } from '../../rack-generator/placement-proposals.ts';
import { swapCandidate, swapCandidates, type SwapCandidate } from '../../rack-generator/swap.ts';
import { createSwapRegions } from './swap-regions.ts';
import { cloneInstanceMaterials } from './instance-materials.ts';
import { BuildAnimation, planBuild } from './build-animation.ts';
import { InstanceSync, placeInstance } from './instance-sync.ts';
import { isBuilt, whenBuilt } from '../state/build-status.ts';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { createStudioLighting } from './studio-lighting.ts';
import { createRenderLoop, pinPrograms } from './render-loop.ts';
import { prewarmPrograms } from './program-prewarm.ts';
import { detectCollisions } from "../../rack-generator/assembly-collisions.ts";
import type {
  Mount,
  PartId,
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
  /** Cinematic self-assembly of the rendered rack; presentation only. False when it cannot (or, reduced-motion, need not) run. */
  playBuild(onEnd?: () => void): boolean;
  stopBuild(): void;
  /** Request a frame. The builder renders on demand only; call after changing anything it draws. */
  invalidate(): void;
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
    renderedGeneration = -1,
    previewSerial = 0,
    requestId = 0,
    hasFit = false,
    view: BuilderView = "iso";
  let previewTarget: Mount | null = null,
    selectionBoxes: THREE.Box3Helper[] = [];
  let mountPoints: Mount[] = [];
  /** Free hooks for the attachment being placed: source-space marker and outward normal. */
  let hangTargets: (HangTarget & { position: Vec3; normal: Vec3 })[] = [];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#343b38");
  scene.fog = new THREE.Fog("#343b38", 18000, 42000);
  // Nothing reads the canvas back (thumbnails/export use their own paths), so let the browser swap buffers.
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const lighting = createStudioLighting(scene, renderer, true);
  // The shadow map is redrawn only when fitRackShadow (a rebuild) flags the key light, never on camera moves.
  renderer.shadowMap.autoUpdate = false;
  // Allocate the (empty) map up front so frames before the first build don't sample a missing shadow texture.
  lighting.key.shadow.needsUpdate = true;
  const finishes = new FrameFinishResources(renderer.capabilities.getMaxAnisotropy());
  viewport.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Rack assembly: drag to orbit, click a part to edit",
  );
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 40000),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  let updatingControls = false;
  // Pointer/wheel input moves the camera outside the frame; damping continues inside it.
  controls.addEventListener("change", () => { if (!updatingControls) invalidate(); });
  controls.addEventListener("end", () => invalidate());
  const assemblyRoot = new THREE.Group(),
    ghostRoot = new THREE.Group(),
    mountsRoot = new THREE.Group(),
    cradleRoot = new THREE.Group();
  const pinned = new WeakSet<object>();
  let prewarmed = false;
  const loop = createRenderLoop(renderFrame);
  const invalidate = () => loop.invalidate();
  for (const root of [assemblyRoot, ghostRoot, mountsRoot, cradleRoot]) {
    root.rotation.x = -Math.PI / 2;
    scene.add(root);
  }
  // Instances, ghosts, mount dots, cradles, selection boxes and swap regions all enter or leave through these.
  for (const root of [scene, assemblyRoot, ghostRoot, mountsRoot, cradleRoot]) {
    root.addEventListener("childadded", invalidate);
    root.addEventListener("childremoved", invalidate);
  }
  const floor = createGymFloor(renderer.capabilities.getMaxAnisotropy());
  scene.add(floor.mesh, floor.room);
  const backdrop = createGymBackdrop();
  scene.add(backdrop.group);
  // Room finishes (#200): walls, ceiling and turf share long-lived materials; the floor swaps its own map.
  const roomMaterials = new RoomMaterials(renderer.capabilities.getMaxAnisotropy());
  const walls = createGymWalls(roomMaterials), roomScenery = createRoomScenery(roomMaterials);
  scene.add(walls.group, roomScenery.group);
  for (const group of [walls.group, ...roomScenery.group.children]) {
    group.addEventListener("childadded", invalidate);
    group.addEventListener("childremoved", invalidate);
  }
  const placingWall = () => isWallPart(snapshot.placing?.part), placingHang = () => isHangPart(snapshot.placing?.part);
  let roomLights = '';
  /** Walls, floor, ceiling, turf and the light balance for the room's finishes. Uniform and visibility changes only. */
  const updateWalls = () => {
    const room = roomOf(snapshot.doc), finish = resolveFinishes(room, room.height);
    walls.update(room, finish.showWalls || !!snapshot.doc.wallItems?.length || placingWall() || placingHang(), wallOpenings(snapshot.doc));
    if (floor.update(room, finish.floor)) invalidate();
    roomScenery.update(room);
    const light = roomLighting(room), key = JSON.stringify(light);
    if (key === roomLights) return;
    roomLights = key;
    renderer.toneMappingExposure = light.exposure; scene.environmentIntensity = light.environment;
    lighting.hemisphere.intensity = light.hemisphere; lighting.key.intensity = light.key; lighting.fill.intensity = light.fill;
    invalidate();
  };
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
  // Placement overlays share long-lived materials and dot geometry: three.js destroys a shader program when its last
  // material is disposed, so per-placement materials recompiled the ghost/dot/selection shaders on every placement.
  const overlay = {
    ghost: new THREE.MeshStandardMaterial({ color: '#e2a248', transparent: true, opacity: 0.55, depthWrite: false, depthTest: false }),
    cradle: new THREE.MeshBasicMaterial({ color: '#e2a248', transparent: true, opacity: 0.24, depthWrite: false }),
    mountDot: new THREE.SphereGeometry(6, 8, 6),
    mount: new THREE.MeshBasicMaterial({ color: "#d28a40", depthTest: true, transparent: true, opacity: 0.65 }),
    hookDot: new THREE.SphereGeometry(9, 12, 8),
    hook: new THREE.MeshBasicMaterial({ color: '#d28a40', transparent: true, opacity: .75 }),
    selection: new THREE.LineBasicMaterial({ color: '#c77c36', toneMapped: false }),
  };
  /** Drop overlay objects without disposing the shared materials/geometry (instanced dots free their matrices). */
  const clearOverlay = (root: THREE.Object3D) => {
    root.traverse(o => { if (o instanceof THREE.InstancedMesh) o.dispose(); });
    root.clear();
  };
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
    placeInstance(g, entry, partAttribution(entry.part));
    return g;
  }
  const assembly = new InstanceSync(assemblyRoot, instances, transformed, g => disposeMeshes(g, false));
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
    for (const box of selectionBoxes) { scene.remove(box); box.geometry.dispose(); }
    selectionBoxes = [];
  }
  function refreshSelection() {
    // Reuse the helpers (a drag refreshes the selected box every move); only the count changes allocate.
    const boxes: THREE.Box3[] = [];
    for (const g of instances.values()) {
      if (!snapshot.selection.includes(g.userData.id as string)) continue;
      const box = new THREE.Box3().setFromObject(g);
      if (!box.isEmpty()) boxes.push(box.expandByScalar(5));
    }
    if (boxes.length !== selectionBoxes.length) clearSelection();
    boxes.forEach((box, i) => {
      if (selectionBoxes[i]) { selectionBoxes[i].box.copy(box); selectionBoxes[i].visible = true; return; }
      const helper = new THREE.Box3Helper(box, new THREE.Color('#c77c36'));
      disposeMaterial(helper.material); helper.material = overlay.selection;
      selectionBoxes.push(helper); scene.add(helper);
    });
    invalidate(); // Reused helpers only change their box.
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
  /** Every model of the batch is already built: the rebuild settles within microtasks, before the next paint. */
  const cached = (entries: readonly ResolvedInstance[]) => entries.every(entry => cache.isReady(geometryKey(entry)));
  function requestRebuild() {
    ++generation;
    // Moves and other edits of already-built parts skip the transient loading patches (one store update, not three).
    if (!cached(snapshot.resolved)) store.patch({ loading: true, dimensions: dimensions() });
    if (!rebuilding) void rebuild();
  }
  async function rebuild() {
    rebuilding = true;
    const serial = generation,
      entries = snapshot.resolved,
      builtDoc = snapshot.doc;
    let releaseBatch = cache.pin(entries.map(geometryKey));
    if (!cached(entries)) store.patch({
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
      // Allocate per-instance materials only after rejecting stale/failed batches; unchanged instances only move.
      assembly.sync(entries, models, snapshot.doc.appearance, partAttribution);
      invalidate(); // Kept instances only move: no child is added or removed to wake the renderer.
      releaseAssembly();
      releaseAssembly = releaseBatch;
      releaseBatch = () => {};
      scene.updateMatrixWorld(true);
      fitRackShadow(lighting.key, new THREE.Box3().setFromObject(assemblyRoot));
      refreshSelection();
      refreshPlacement();
      trimCache();
      const warnings = [...detectCollisions(entries), ...floorWarnings(snapshot.doc), ...wallWarnings(snapshot.doc), ...hangWarnings(snapshot.doc)];
      // Before the patch: listeners that see `builtDoc` settle may export immediately.
      renderedGeneration = serial;
      store.patch({
        builtDoc,
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
        store.patch({ builtDoc, loading: false, status: message(error), error: true });
    } finally {
      releaseBatch();
      if (!disposed) trimCache();
      rebuilding = false;
      if (!disposed && serial !== generation) void rebuild();
    }
  }
  /** Ids and models of the displayed ghost, in order; a proposal that only moves them re-places the same meshes. */
  let ghostKey = '';
  const ghostKeyOf = (entries: readonly ResolvedInstance[]) => entries.map(e => `${e.id}\u0000${geometryKey(e)}`).join('\n');
  function clearGhost() {
    ghostKey = '';
    clearOverlay(ghostRoot);
    releaseGhost();
    releaseGhost = () => {};
    if (!disposed) trimCache();
  }
  function clearMounts() {
    clearOverlay(mountsRoot);
    mountPoints = []; hangTargets = [];
  }
  // Barbell parking (#83): every free cradle shows a faint bar ghost; hover picks the nearest, else the floor.
  let cradles: BarCradle[] = [], cradleSerial = 0, releaseCradles = () => {};
  function clearCradles() {
    cradleSerial++; cradles = [];
    clearOverlay(cradleRoot);
    releaseCradles(); releaseCradles = () => {};
  }
  async function showCradles() {
    const base = snapshot.proposal?.entries[0], serial = ++cradleSerial, bar = barSpec(base?.part ?? snapshot.placing?.part, base?.params);
    cradles = freeCradles(snapshot.resolved, snapshot.doc.floorItems, snapshot.placing?.movingId, bar);
    if (!base || !cradles.length) return;
    const release = cache.pin([geometryKey(base)]);
    try {
      const model = await geometryFor(base);
      if (disposed || serial !== cradleSerial) return;
      releaseCradles = release;
      for (const cradle of cradles) {
        const g = transformed(model, { ...base, ...parkedPose(cradle, bar) });
        g.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = o.receiveShadow = false; disposeMaterial(o.material); o.material = overlay.cradle; o.renderOrder = 9; } });
        g.userData = {}; cradleRoot.add(g);
      }
    } catch { /* The proposal ghost reports geometry errors. */ }
    finally { if (releaseCradles !== release) release(); }
  }
  /** Nearest free cradle to the pointer, measured to the projected bar segment. */
  function cradleAt(event: { clientX: number; clientY: number }): BarCradle | null {
    const rect = renderer.domElement.getBoundingClientRect();
    let best: BarCradle | null = null, distance = 36;
    for (const cradle of cradles) {
      const axis = [Math.cos(cradle.yaw), Math.sin(cradle.yaw), 0], [a, b] = [-1, 1].map(side => screenPoint(cradle.center.map((v, i) => v + side * 1100 * axis[i]) as Vec3));
      if (!a.visible || !b.visible) continue;
      const px = event.clientX - rect.left, py = event.clientY - rect.top, dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(px - a.x - t * dx, py - a.y - t * dy);
      if (d < distance) { distance = d; best = cradle; }
    }
    return best;
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
    swapRegions?.dispose(); swapRegions = null; hoveredSwap = null; queuedPreview = null; hoveredHang = '';
    previewTarget = null;
    previewSerial++;
    clearGhost();
    clearMounts();
    clearCradles();
    controls.enabled = !floorDrag && !snapshot.selectionTool;
    renderer.domElement.style.cursor = "";
  }
  function showMounts() {
    clearMounts();
    mountPoints = snapshot.placing ? placementMounts(snapshot.doc, snapshot.placing.part, snapshot.placing.movingId) : [];
    const dots = new THREE.InstancedMesh(
        overlay.mountDot,
        overlay.mount,
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
    for (const g of instances.values()) {
      const moving = g.userData.ownerId === snapshot.placing?.movingId && (snapshot.paired || !snapshot.placing?.physicalId || g.userData.id === snapshot.placing.physicalId)
        || (!!snapshot.placing?.movingId && !!snapshot.resolved.find(r => r.id === g.userData.id && r.kind === 'wall-item')?.connectedTo.includes(snapshot.placing.movingId));
      pickupAppearance(g, moving);
    }
    const placing = snapshot.placing, part = swapPart();
    if (addingStructure()) {
      structuralCandidates = structureCandidates(snapshot.doc, snapshot.structureChoice!);
      renderer.domElement.style.cursor = 'crosshair';
      store.patch({ proposal: null, placementText: structuralCandidates.length ? 'Hover a post or gap · ESC cancels' : 'No valid adjacent positions · ESC cancels' });
      return;
    }
    if (part && !isFloorPart(part) && !isWallPart(part) && !isHangPart(part)) {
      swapRegions = createSwapRegions(swapCandidates(snapshot.doc, part), instances, snapshot.doc);
      scene.add(swapRegions.root);
    }
    if (!placing && !snapshot.structureChoice && !snapshot.systemChoice) return;
    if (placing && isHangPart(placing.part)) showHangTargets();
    else if (placing && !isFloorPart(placing.part) && !isWallPart(placing.part)) showMounts();
    if (placing && parksInCradles(placing.part)) void showCradles();
    renderer.domElement.style.cursor = "crosshair";
    if (snapshot.proposal) void renderProposal(snapshot.proposal);
  }
  /** Ghost-highlight every free hook (#18/#32 mount dots); hover snaps the ghost, click hangs it. */
  function showHangTargets() {
    clearMounts();
    const doc = snapshot.doc, panels = new Map(snapshot.resolved.filter(r => r.kind === 'wall-item').map(r => [r.id, r]));
    hangTargets = freeSlots(doc, snapshot.placing!.part, snapshot.placing!.movingId).map(target => {
      const panel = doc.wallItems!.find(p => p.id === target.panel)!, at = panels.get(target.panel)!, a = at.rotation[2], [x, , z] = hookAnchor(panel, target.slot);
      // Marker sits on the hook's hole, just proud of the face.
      const rotate = (u: number, v: number): [number, number] => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
      const [px, py] = rotate(x, -(wallPart(panel.part)!.depth + 6)), [nx, ny] = rotate(0, -1);
      return { ...target, position: [at.position[0] + px, at.position[1] + py, at.position[2] + z] as Vec3, normal: [nx, ny, 0] as Vec3 };
    });
    const dots = new THREE.InstancedMesh(overlay.hookDot, overlay.hook, hangTargets.length), matrix = new THREE.Matrix4();
    hangTargets.forEach((t, i) => dots.setMatrixAt(i, matrix.makeTranslation(...t.position)));
    dots.renderOrder = 5;
    mountsRoot.add(dots);
  }
  let hoveredHang = '';
  function nearestHang(event: { clientX: number; clientY: number }) {
    const rect = renderer.domElement.getBoundingClientRect();
    let best: HangTarget | null = null, distance = 28;
    scene.updateMatrixWorld(true);
    for (const target of hangTargets) {
      const world = mountsRoot.localToWorld(new THREE.Vector3(...target.position)), normal = new THREE.Vector3(...target.normal).transformDirection(mountsRoot.matrixWorld);
      if (normal.dot(camera.position.clone().sub(world)) <= 0) continue;
      const point = world.project(camera);
      if (point.z > 1 || point.z < -1) continue;
      const d = Math.hypot(rect.left + (point.x + 1) * rect.width / 2 - event.clientX, rect.top + (1 - point.y) * rect.height / 2 - event.clientY);
      if (d < distance) { distance = d; best = target; }
    }
    return best;
  }
  function renderProposal(proposal: PlacementProposal) {
    previewTarget = proposal.target ?? null;
    const serial = ++previewSerial;
    if (!previewBusy && ghostKey && ghostRoot.children.length === proposal.entries.length && ghostKeyOf(proposal.entries) === ghostKey) {
      // Hover moves of the same ghost (floor/wall drags, R rotation): transforms only, no material churn.
      proposal.entries.forEach((entry, i) => placeInstance(ghostRoot.children[i], entry, partAttribution(entry.part)));
      invalidate();
      return;
    }
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
          o.material = overlay.ghost;
          o.renderOrder = 10;
        } });
        ghostRoot.add(g);
      }
      ghostKey = ghostKeyOf(entries);
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
    if (!snapshot.placing && !snapshot.structureChoice || snapshot.placing?.rotationOnly) return;
    if (parksInCradles(snapshot.placing?.part)) { const cradle = cradleAt(event); if (cradle) { store.previewCradle(cradle.key); return; } }
    if(isFloorPart(snapshot.placing?.part)) { const point=floorPoint(event); if(point) store.previewFloor(point); return; }
    if(placingWall()) { const hit=wallRay(event); if(hit) store.previewWall(hit.wall,[hit.u,hit.h],!(event as {altKey?:boolean}).altKey); return; }
    if(placingHang()) { const target=nearestHang(event), key=target ? `${target.panel}:${target.slot}` : ''; if(target && key!==hoveredHang) store.previewHang(target.panel,target.slot); hoveredHang=key; return; }
    if (addingStructure()) { updateStructure(event); return; }
    const candidate = candidateAt(event);
    if (candidate) {
      if (hoveredSwap?.ownerId === candidate.ownerId) return;
      hoveredSwap = candidate; previewTarget = null;
      swapRegions?.hover(candidate.valid ? candidate.ownerId : null); invalidate();
      if (!candidate.valid) { store.patch({ proposal: null, placementText: "Won’t fit: " + candidate.reason }); return; }
      const proposal = { ...candidate, label: 'Swap ' + candidate.ownerId };
      const collision = proposalCollision(snapshot.resolved, proposal);
      store.patch({ proposal: collision ? null : proposal, placementText: collision || proposal.label });
      return;
    }
    const hadSwap = !!hoveredSwap;
    hoveredSwap = null; swapRegions?.hover(null); invalidate();
    const target = snapshot.placing ? nearestMount(event) : null;
    if (!target || (!hadSwap && JSON.stringify(target) === JSON.stringify(previewTarget))) return;
    try {
      store.previewMount(target);
    } catch(error) { store.patch({ proposal: null, placementText: message(error) }); }
  }
  function dropPlacement(event: { clientX: number; clientY: number }) {
    if (snapshot.placing?.rotationOnly) { store.acceptProposal(); return; }
    if(isFloorPart(snapshot.placing?.part) || placingWall()) { updatePreview(event); store.acceptProposal(); return; }
    if(placingHang()) { const target=nearestHang(event); if(target) { store.previewHang(target.panel,target.slot); store.acceptProposal(); } return; }
    if (addingStructure()) { commitStructure(); return; }
    if (!candidateAt(event) && !nearestMount(event)) return;
    updatePreview(event);
    store.acceptProposal();
  }
  const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  /** Floor drags move [x, z]; wall drags (`wall` set) move [u, height] on that wall's plane. */
  let floorDrag: {id:string;start:[number,number];position:[number,number];moved:boolean;wall?:WallId} | null=null;
  /** Hung attachment drag: past 6 px it becomes a move placement; release over a free hook hangs it there. */
  let hangDrag: {id:string;part:string;started:boolean} | null=null;
  function wallRay(event:{clientX:number;clientY:number}, wall?:WallId) {
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const {origin,direction}=raycaster.ray, room=roomOf(snapshot.doc);
    return wall ? wallPlaneHit(wallFrames(room)[wall],origin.toArray(),direction.toArray()) : wallHit(room,origin.toArray(),direction.toArray());
  }
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
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !(event.target instanceof HTMLElement && (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable))) {
      // BuilderPage invokes history next; leave store gesture finalization to history.
      floorDrag = null; hangDrag = null; pointerGesture.finish(); selecting = false; marquee.style.display = 'none';
      controls.enabled = !snapshot.selectionTool;
      return;
    }
    if(event.key==='Escape') { floorDrag=null; hangDrag=null; store.cancelGesture(); controls.enabled=true; pointerGesture.finish(); return; }
    if(event.key.toLowerCase()!=='r' || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable))) return;
    if (snapshot.systemChoice) return;
    const delta=(event.shiftKey?-1:1)*Math.PI/12;
    if(isFloorPart(snapshot.placing?.part)) {event.preventDefault();store.previewFloor(undefined,delta);return;}
    const mounted = rotationTarget();
    if (mounted && store.rotateMounted(mounted, event.shiftKey ? -1 : 1)) { event.preventDefault(); return; }
    const id=floorDrag?.id ?? (snapshot.selection.length===1?snapshot.selected:null);
    const item=store.getAppliedDoc().floorItems?.find(i=>i.id===id && !i.cradle);
    if(item) {event.preventDefault();if(floorDrag)floorDrag.moved=true;store.updateFloor(item.id,{rotation:item.rotation+delta});}
  };
  document.addEventListener('keydown',floorKey);
  const marquee = document.createElement('div');
  marquee.style.cssText = 'position:fixed;pointer-events:none;border:1px solid #c77c36;background:#c77c3622;z-index:100;display:none';
  viewport.append(marquee);
  let selecting = false;
  let draggedAt = -Infinity;
  let hoveredId: string | null = null;
  function rotationTarget() {
    if (snapshot.systemChoice) return null;
    if (snapshot.placing) return snapshot.placing.movingId && rotationMode(snapshot.doc, snapshot.placing.movingId).supported ? snapshot.placing.movingId : null;
    const candidates = [hoveredId, snapshot.selection.length === 1 ? snapshot.selected : null];
    return candidates.find(id => id && rotationMode(snapshot.doc, store.ownerOf(id)!).supported) ?? null;
  }
  const onWheel = (event: WheelEvent) => {
    if (snapshot.systemChoice) return;
    const floorId = floorDrag?.id ?? hoveredId ?? (snapshot.selection.length === 1 ? snapshot.selected : null);
    const floorItem = store.getAppliedDoc().floorItems?.find(i => i.id === floorId && !i.cradle);
    const mounted = rotationTarget();
    if (!isFloorPart(snapshot.placing?.part) && !floorItem && !mounted) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!event.deltaY) return;
    const direction = Math.sign(event.deltaY) * (event.shiftKey ? -1 : 1);
    if (isFloorPart(snapshot.placing?.part)) store.previewFloor(undefined, direction * Math.PI / 12);
    else if (mounted) store.rotateMounted(mounted, direction);
    else if (floorItem) { if (floorDrag) floorDrag.moved = true; store.updateFloor(floorItem.id, { rotation: floorItem.rotation + direction * Math.PI / 12 }); }
  };
  const onDoubleClick = (event: MouseEvent) => {
    if (snapshot.systemChoice) return;
    if (event.button !== 0 || snapshot.placing || snapshot.structureChoice || performance.now() - draggedAt < 600) return;
    const hit = pickOwner(event);
    if (hit) { event.preventDefault(); store.pickup(hit.id); }
  };
  const onDown = (event: PointerEvent) => {
    pointerGesture.begin(event);
    if(event.button===0 && !snapshot.systemChoice && !snapshot.placing && !snapshot.structureChoice && !snapshot.selectionTool && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const hit=pickOwner(event),applied=store.getAppliedDoc(),item=applied.floorItems?.find(i=>i.id===hit?.id && !i.cradle),point=floorPoint(event,false);
      const wallItem=applied.wallItems?.find(i=>i.id===hit?.id),wallPoint=wallItem && wallRay(event,wallItem.wall),hung=applied.hangItems?.find(i=>i.id===hit?.id);
      if(hung && snapshot.selection.length<=1) {
        if (snapshot.timeline.viewing) { store.latestHistory(); pointerGesture.begin(event); }
        store.select(hung.id);hangDrag={id:hung.id,part:hung.part,started:false};
        controls.enabled=false;pointerGesture.capture();event.stopImmediatePropagation();return;
      }
      if(wallItem && wallPoint && (snapshot.selection.length<=1 || !snapshot.selection.includes(wallItem.id))) {
        if (snapshot.timeline.viewing) { store.latestHistory(); pointerGesture.begin(event); }
        store.select(wallItem.id);store.beginGesture();floorDrag={id:wallItem.id,start:[wallPoint.u,wallPoint.h],position:[...wallItem.position],moved:false,wall:wallItem.wall};
        controls.enabled=false;pointerGesture.capture();event.stopImmediatePropagation();return;
      }
      if(item && point && (snapshot.selection.length<=1 || !snapshot.selection.includes(item.id))) {
        if (snapshot.timeline.viewing) { store.latestHistory(); pointerGesture.begin(event); }
        store.select(item.id);store.beginGesture();floorDrag={id:item.id,start:point,position:[...item.position],moved:false};
        controls.enabled=false;pointerGesture.capture();event.stopImmediatePropagation();return;
      }
    }
    selecting = snapshot.selectionTool && !snapshot.systemChoice && !snapshot.placing && !snapshot.structureChoice && event.button === 0;
    if ((!addingStructure() && (snapshot.placing || snapshot.structureChoice) || selecting) && event.button === 0) controls.enabled = false;
    if ((!addingStructure() && (snapshot.placing || snapshot.structureChoice) || selecting) && event.button === 0) pointerGesture.capture();
  };
  const onMove = (event: PointerEvent) => {
    if (pointerGesture.start && Math.hypot(event.clientX-pointerGesture.start[0], event.clientY-pointerGesture.start[1]) > 4) draggedAt = performance.now();
    if (!pointerGesture.start) hoveredId = pickOwner(event)?.id ?? null;
    if(hangDrag && pointerGesture.start) {
      if(!hangDrag.started && Math.hypot(event.clientX-pointerGesture.start[0],event.clientY-pointerGesture.start[1])>6) { hangDrag.started=true; store.startPlacement(hangDrag.part as PartId,hangDrag.id); }
      if(hangDrag.started) updatePreview(event);
      return;
    }
    if(floorDrag && pointerGesture.start) {
      if(Math.hypot(event.clientX-pointerGesture.start[0],event.clientY-pointerGesture.start[1])>4)floorDrag.moved=true;
      if(floorDrag.wall) { const hit=wallRay(event,floorDrag.wall); if(hit && floorDrag.moved) store.updateWall(floorDrag.id,{position:[floorDrag.position[0]+hit.u-floorDrag.start[0],floorDrag.position[1]+hit.h-floorDrag.start[1]]},!event.altKey); return; }
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
    if(hangDrag) {const drag=hangDrag;hangDrag=null;pointerGesture.finish();controls.enabled=true;
      if(drag.started && placingHang()) { if(nearestHang(event)) dropPlacement(event); else { store.cancelPlacement(); store.select(drag.id); } }
      return;}
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
    if (snapshot.systemChoice) return;
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
    // A bare wall or the ceiling selects the room (#200): its finishes open in the inspector.
    if (!object && !event.shiftKey && !event.metaKey && !event.ctrlKey && (walls.group.visible && wallHit(roomOf(snapshot.doc), raycaster.ray.origin.toArray(), raycaster.ray.direction.toArray()) || roomScenery.ceilingVisible && raycaster.ray.direction.y > 0)) {
      store.openRoom();
      return;
    }
    store.select(
      typeof object?.userData.id === "string"
        ? object.userData.id
        : null,
      event,
    );
  };
  const onLeave = (event: PointerEvent) => {
    hoveredId = null;
    if (snapshot.placing?.rotationOnly) store.acceptProposal();
    if (addingStructure() && !(event.relatedTarget instanceof Node && viewport.contains(event.relatedTarget))) {
      showStructureHandles([]); previewStructure(null);
    }
  };
  const onCancel = () => {
    if(floorDrag) {floorDrag=null;store.cancelGesture();}
    if(hangDrag) {if(hangDrag.started) store.cancelPlacement(); hangDrag=null;}
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
  renderer.domElement.addEventListener("wheel", onWheel, { capture: true, passive: false });
  renderer.domElement.addEventListener("dblclick", onDoubleClick);
  renderer.domElement.addEventListener("pointerdown", onDown, true);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onCancel);
  viewport.addEventListener("pointerleave", onLeave);
  viewport.addEventListener("dragover", onDrag);
  viewport.addEventListener("drop", onDrop);
  let build: { animation: BuildAnimation; start: number; onEnd?: () => void } | null = null;
  const buildToggle = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-build-toggle]');
  // Any click, drag, wheel or key (bar the toggle itself) snaps to the finished rack.
  const cancelBuildPointer = (event: Event) => {
    if (buildToggle(event.target)) return;
    // Swallow the cancelling press on the canvas so it neither selects nor starts a drag.
    if (event.target === renderer.domElement) { event.preventDefault(); event.stopImmediatePropagation(); }
    stopBuild();
  };
  const cancelBuildKey = (event: KeyboardEvent) => {
    if (['Shift', 'Control', 'Alt', 'Meta', 'Unidentified'].includes(event.key) || (buildToggle(event.target) && (event.key === 'Enter' || event.key === ' '))) return;
    stopBuild();
  };
  function playBuild(onEnd?: () => void) {
    if (build || disposed || snapshot.loading || renderedGeneration !== generation || !instances.size || snapshot.placing || snapshot.structureChoice || snapshot.systemChoice) return false;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderer.domElement.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
      return false;
    }
    scene.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(assemblyRoot).getCenter(new THREE.Vector3());
    build = { animation: new BuildAnimation(planBuild(snapshot.resolved), instances, camera, controls.target, center), start: performance.now(), onEnd };
    controls.enabled = false;
    for (const box of selectionBoxes) box.visible = false;
    window.addEventListener('pointerdown', cancelBuildPointer, true);
    window.addEventListener('wheel', cancelBuildPointer, { capture: true, passive: false });
    window.addEventListener('keydown', cancelBuildKey, true);
    invalidate();
    return true;
  }
  function stopBuild() {
    if (!build) return;
    const { animation, onEnd } = build;
    build = null;
    animation.finish();
    window.removeEventListener('pointerdown', cancelBuildPointer, true);
    window.removeEventListener('wheel', cancelBuildPointer, true);
    window.removeEventListener('keydown', cancelBuildKey, true);
    controls.enabled = !floorDrag && !snapshot.selectionTool;
    controls.update();
    refreshSelection();
    invalidate();
    onEnd?.();
  }
  function fit(mode: BuilderView = view) {
    stopBuild();
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
    invalidate();
  }
  const resize = () => {
    const rect = viewport.getBoundingClientRect(),
      width = Math.max(1, rect.width),
      height = Math.max(1, rect.height);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Resizing clears the canvas; repaint before the browser presents it.
    loop.renderNow();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();
  renderer.domElement.addEventListener("webglcontextrestored", invalidate);
  /** One frame; true while damping or the build animation needs another. */
  function renderFrame() {
    if (disposed) return false;
    let again = false;
    if (build) {
      if (build.animation.update((performance.now() - build.start) / 1000)) again = true;
      else stopBuild();
    }
    if (!build) {
      updatingControls = true;
      again = controls.update() || again;
      updatingControls = false;
    }
    const focus = build ? build.animation.focus : controls.target;
    backdrop.follow(camera, focus);
    walls.follow(camera);
    roomScenery.follow(camera);
    camera.far = Math.max(40000, camera.position.distanceTo(focus) * 4);
    camera.near = Math.max(
      0.5,
      camera.position.distanceTo(focus) / 200,
    );
    camera.updateProjectionMatrix();
    positionHandles();
    if (lighting.key.shadow.needsUpdate) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    pinPrograms(renderer, pinned);
    if (!prewarmed && instances.size) {
      // Once lights, fog and environment are final, link the variants the next interactions will need.
      prewarmed = true;
      const room = roomMaterials.standIns();
      prewarmPrograms(renderer, camera, scene, finishes, { meshes: [overlay.ghost, overlay.cradle], instanced: [overlay.mount, overlay.hook], lines: [overlay.selection], scenery: room.materials }).then(release => {
        if (!disposed) pinPrograms(renderer, pinned);
        release(); room.release();
      }, () => room.release());
    }
    return again;
  }
  const drawnKeys = ["doc", "resolved", "selection", "placing", "proposal", "structureChoice", "systemChoice", "structureMode", "paired"] as const;
  const unsubscribe = store.subscribe(() => {
    const previous = snapshot;
    snapshot = store.getSnapshot();
    if (disposed) return;
    // Only these reach the canvas; status, catalog, history and storage churn must not wake the renderer.
    if (drawnKeys.some(key => snapshot[key] !== previous[key])) invalidate();
    if (snapshot.doc !== previous.doc || snapshot.placing || snapshot.structureChoice || snapshot.systemChoice) stopBuild();
    // History navigation finalizes/cancels the store gesture; never let an old
    // pointer capture or floor origin apply a stale drag to the new document.
    if (snapshot.inputRevision !== previous.inputRevision) {
      floorDrag = null; hangDrag = null; hoveredId = null; selecting = false;
      pointerGesture.finish(); marquee.style.display = 'none';
    }
    if (snapshot.doc !== previous.doc) requestRebuild();
    if (snapshot.doc !== previous.doc || snapshot.placing !== previous.placing) updateWalls();
    if (snapshot.selection !== previous.selection) refreshSelection();
    controls.enabled = !floorDrag && !snapshot.selectionTool && !selecting && !(pointerGesture.start && !addingStructure() && (snapshot.placing || snapshot.structureChoice));
    if (previous.selectionTool && !snapshot.selectionTool) onCancel();
    if (
      snapshot.placing !== previous.placing ||
      snapshot.structureChoice !== previous.structureChoice ||
      snapshot.systemChoice !== previous.systemChoice ||
      snapshot.structureMode !== previous.structureMode ||
      snapshot.paired !== previous.paired ||
      snapshot.doc !== previous.doc
    )
      refreshPlacement();
    else if (snapshot.proposal !== previous.proposal) {
      if (snapshot.proposal && (snapshot.placing || snapshot.structureChoice || snapshot.systemChoice)) void renderProposal(snapshot.proposal);
      else { previewTarget = null; previewSerial++; clearGhost(); }
    }
  });
  requestRebuild();
  updateWalls();
  if (snapshot.placing || snapshot.structureChoice || snapshot.systemChoice) refreshPlacement();
  return {
    fit,
    refitOnNextBuild() {
      hasFit = false;
    },
    playBuild,
    stopBuild,
    invalidate,
    async exportGLB() {
      if (disposed) throw Error("Scene has been disposed.");
      stopBuild();
      if (snapshot.timeline.viewing) throw Error("Return to latest before exporting the applied rack.");
      // A rebuild from cached geometry never sets `loading` and settles within microtasks: wait for it.
      if (!snapshot.loading && !isBuilt(snapshot)) await whenBuilt(store, 5000).catch(() => {});
      if (disposed) throw Error("Scene has been disposed.");
      if (snapshot.loading || !isBuilt(snapshot))
        throw Error("Wait for the rack to finish building.");
      // Status messages can clear error flags; only a successful current build is exportable.
      if (renderedGeneration !== generation)
        throw Error("The current rack has not built successfully. Fix the build error before exporting.");
      const output = cloneAppliedAssembly(assemblyRoot);
      output.name = "BOS STRENGTH rack";
      output.scale.setScalar(0.001);
      try {
        const data = await new GLTFExporter().parseAsync(output, { binary: true });
        if (!(data instanceof ArrayBuffer)) throw Error("Unexpected GLB output.");
        return data;
      } finally { disposeMeshes(output, false); }
    },
    dispose() {
      if (disposed) return;
      stopBuild();
      disposed = true;
      generation++;
      previewSerial++;
      unsubscribe();
      loop.dispose();
      observer.disconnect();
      pointerGesture.dispose();
      controls.dispose();
      window.removeEventListener("keydown", onStructureKey);
      structureHandles.remove();
      marquee.remove();
      document.removeEventListener("keydown",floorKey);
      renderer.domElement.removeEventListener("webglcontextrestored", invalidate);
      renderer.domElement.removeEventListener("wheel", onWheel, true);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
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
      clearCradles();
      clearSelection();
      for (const resource of Object.values(overlay)) resource.dispose();
      assembly.clear();
      releaseAssembly();
      cache.dispose();
      floor.dispose();
      backdrop.dispose();
      walls.dispose();
      roomScenery.dispose();
      roomMaterials.dispose();

      finishes.dispose();
      lighting.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      scene.clear();
    },
  };
}
