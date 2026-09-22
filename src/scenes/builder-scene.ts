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
import { facesInside, wallFrames, wallHit, wallPlaneHit, type WallId } from '../../rack-generator/walls.ts';
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
import { matches, snapOff, isTyping, wheelRotates } from '../state/shortcuts.ts';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { createStudioLighting } from './studio-lighting.ts';
import { createMotionCheck, createRenderLoop, pinPrograms } from './render-loop.ts';
import { prewarmPrograms } from './program-prewarm.ts';
import { currentRenderEnvironment, fogRange, renderBudget } from './render-budget.ts';
import { fitFrame, projectedFill } from './fit-frame.ts';
import { LONG_PRESS_MS, TOUCH_PICK_RADIUS, TOUCH_TARGET_RADIUS, TouchTracker, choosePick, pickOffsets, pickScore, SMALL_PART_PX } from './touch-input.ts';
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
/** Canvas edges covered by UI (CSS px): a phone's bottom sheet, a top bar. The view centres in what is left. */
export interface ViewInsets { top: number; right: number; bottom: number; left: number }
export interface BuilderScene {
  /** Frame the content (the equipment, plus the room while its walls show) tightly in the uncovered canvas (#215). */
  fit(mode?: BuilderView): void;
  /** Share of the uncovered canvas the framed content currently spans, per axis (1 = edge to edge). */
  contentFill(): { x: number; y: number };
  refitOnNextBuild(): void;
  exportGLB(): Promise<ArrayBuffer>;
  /** Cinematic self-assembly of the rendered rack; presentation only. False when it cannot (or, reduced-motion, need not) run. */
  playBuild(onEnd?: () => void): boolean;
  stopBuild(): void;
  /** Request a frame. The builder renders on demand only; call after changing anything it draws. */
  invalidate(): void;
  /** Keep the model centred in the canvas area not covered by overlaid UI (a bottom sheet, a top bar); `fit` frames
   * that area too. Cheap: a projection offset, no canvas resize. Pass zeros (or omit sides) to clear. */
  setViewInsets(insets: Partial<ViewInsets>): void;
  /** Client (CSS px) position of a part's bounds centre, e.g. to anchor an action bar to the selection. The
   * placement ghost wins while one shows that id. Null for unknown ids; `visible` is false behind the camera. */
  screenPoint(id: string): { x: number; y: number; visible: boolean } | null;
  /** Frame these physical instances (the outliner, warnings, F), keeping the current view direction. */
  focus(ids: readonly string[]): void;
  /** Selection action bar anchor (#205): client-pixel box around the selection outlines plus the canvas rect, or
   * null when nothing selected is drawn. Cheap (projects the outline boxes); call it from `onFrame`. */
  selectionScreenBounds(): SelectionScreenBounds | null;
  /** Runs after every rendered frame (orbit, damping, drags, rebuilds). Never requests frames: idle stays idle. */
  onFrame(listener: () => void): () => void;
  dispose(): void;
}
export interface SelectionScreenBounds { left: number; top: number; right: number; bottom: number; viewport: { left: number; top: number; right: number; bottom: number } }
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
  /** The last pointer down was a finger: picking and target radii widen, the touch placement bar shows. */
  let touchInput = false;
  let insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 }, canvasSize: [number, number] = [0, 0];
  let mountPoints: Mount[] = [];
  /** Free hooks for the attachment being placed: source-space marker and outward normal. */
  let hangTargets: (HangTarget & { position: Vec3; normal: Vec3 })[] = [];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#343b38");
  const fog = new THREE.Fog("#343b38", ...fogRange(0));
  scene.fog = fog;
  // Phones and tablets draw fewer pixels and a smaller shadow map (desktop: DPR 2, 2048², MSAA as before).
  const budget = renderBudget(currentRenderEnvironment());
  // Nothing reads the canvas back (thumbnails/export use their own paths), so let the browser swap buffers.
  const renderer = new THREE.WebGLRenderer({ antialias: budget.antialias });
  renderer.setPixelRatio(budget.pixelRatio);
  const lighting = createStudioLighting(scene, renderer, true);
  lighting.key.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
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
  // Fingers drive the scene only: no page scroll or pinch/double-tap zoom, no iOS callout or text selection on a long-press.
  for (const [property, value] of [["touch-action", "none"], ["user-select", "none"], ["-webkit-user-select", "none"], ["-webkit-touch-callout", "none"], ["-webkit-tap-highlight-color", "transparent"]])
    renderer.domElement.style.setProperty(property, value);
  // Older iOS Safari starts its page pinch-zoom from these even on a touch-action:none element.
  const preventGesture = (event: Event) => event.preventDefault();
  renderer.domElement.addEventListener("gesturestart", preventGesture);
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 40000),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // Fingers: one orbits, two pan and pinch-zoom together (explicit so a three.js default change cannot move them).
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
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
  const loop = createRenderLoop(renderFrame), cameraMoving = createMotionCheck();
  const invalidate = () => loop.invalidate();
  const frameListeners = new Set<() => void>();
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
          ...(m.emissive ? { emissive: m.color || "#ffffff", emissiveIntensity: m.emissive } : {}),
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = m.name;
        mesh.userData.materialSource = { authoredFastenerFinish: m.authoredFastenerFinish, role: m.role, color: m.color, metalness: m.metalness, roughness: m.roughness, ...(m.emissive ? { emissive: m.emissive } : {}) };
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
  /** Build progress for the loading overlay (#218): published at most once a frame, only for the latest batch. */
  let progress: { serial: number; done: number; total: number; parts: number } | null = null, progressFrame = 0;
  function publishProgress() {
    if (progressFrame) return;
    progressFrame = requestAnimationFrame(() => {
      progressFrame = 0;
      if (!disposed && progress?.serial === generation && snapshot.loading)
        store.patch({ buildProgress: { done: progress.done, total: progress.total, parts: progress.parts } });
    });
  }
  /** Count each missing model once as it arrives (instances share geometry: a pair of uprights is one model). */
  function trackProgress(serial: number, entries: readonly ResolvedInstance[]) {
    const missing = new Map<string, ResolvedInstance>();
    for (const entry of entries) { const key = geometryKey(entry); if (!cache.isReady(key) && !missing.has(key)) missing.set(key, entry); }
    const current = progress = { serial, done: 0, total: missing.size, parts: entries.length };
    store.patch({ buildProgress: { done: 0, total: current.total, parts: current.parts } });
    for (const entry of missing.values()) {
      const settle = () => { if (progress === current) { current.done++; publishProgress(); } };
      geometryFor(entry).then(settle, settle);
    }
  }
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
    if (!cached(entries)) {
      store.patch({
        loading: true,
        status: "Building your rack…",
        error: false,
        dimensions: dimensions(),
      });
      trackProgress(serial, entries);
    }
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
      if (snapshot.hidden.length) applyVisibility();
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
      progress = null;
      store.patch({
        builtDoc,
        loading: false,
        buildProgress: null,
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
        { progress = null; store.patch({ builtDoc, loading: false, buildProgress: null, status: message(error), error: true }); }
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
    let best: BarCradle | null = null, distance = targetRadius(36);
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
    if (!addingStructure() || !visibleCandidates.length || isTyping(event.target)) return;
    if (!matches('structure-cycle', event)) return;
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
    let best: HangTarget | null = null, distance = targetRadius(28);
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
      distance = targetRadius(28);
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
  const shown = (o: THREE.Object3D | null): boolean => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  /** Hidden and locked parts (outliner, #206) are click-through: hidden ones are invisible, locked ones are skipped. */
  let unpickable = new Set<string>();
  function applyVisibility() {
    const hidden = new Set(snapshot.hidden);
    unpickable = new Set([...snapshot.hidden, ...snapshot.locked]);
    for (const g of instances.values()) g.visible = !hidden.has(g.userData.id as string);
    invalidate();
  }
  /** The first visible, pickable object among `hits`, walked up to its part. */
  function pickableOwner(hits: readonly THREE.Intersection[]) {
    for (const hit of hits) {
      if (!(hit.object instanceof THREE.Mesh) || !shown(hit.object)) continue;
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.ownerId) object = object.parent;
      if (!object || !unpickable.has(object.userData.id ?? object.userData.ownerId)) return object;
    }
    return null;
  }
  /** The first visible `roots` object under a canvas point (cut-away wall items are hidden), walked up to its part. */
  function rayObject(roots: THREE.Object3D[], x: number, y: number, rect: DOMRect) {
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return pickableOwner(raycaster.intersectObjects(roots, true));
  }
  const corner = new THREE.Vector3(), bounds = new THREE.Box3();
  /** Client-space rectangle of an object's bounds and its larger side; null when any corner is behind the camera. */
  function screenRect(object: THREE.Object3D, rect: DOMRect) {
    bounds.setFromObject(object);
    if (bounds.isEmpty()) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z).project(camera);
      if (corner.z < -1 || corner.z > 1) return null;
      minX = Math.min(minX, corner.x); maxX = Math.max(maxX, corner.x); minY = Math.min(minY, corner.y); maxY = Math.max(maxY, corner.y);
    }
    const left = rect.left + (minX + 1) * rect.width / 2, right = rect.left + (maxX + 1) * rect.width / 2;
    const top = rect.top + (1 - maxY) * rect.height / 2, bottom = rect.top + (1 - minY) * rect.height / 2;
    return { left, right, top, bottom, size: Math.max(right - left, bottom - top) };
  }
  const outside = (r: { left: number; right: number; top: number; bottom: number }, x: number, y: number) =>
    Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
  /**
   * The part under the pointer. Fingers also consider parts whose on-screen bounds come within TOUCH_PICK_RADIUS,
   * favouring small ones (see choosePick). Rays are cast only at those parts, and only where they could still win:
   * a phone cannot afford dozens of full-assembly raycasts per tap.
   */
  function pickOwner(event: { clientX: number; clientY: number }, radius = touchInput ? TOUCH_PICK_RADIUS : 0): { id: string; ownerId: string } | null {
    const rect = renderer.domElement.getBoundingClientRect(), roots = [assemblyRoot, ...(swapRegions ? [swapRegions.root] : [])];
    const x = event.clientX, y = event.clientY;
    scene.updateMatrixWorld(true);
    let object = rayObject(roots, x, y, rect);
    // A finger on the selected part means that part (to drag or long-press it), whatever is beside it.
    if (radius && !(object && snapshot.selection.includes(object.userData.id))) {
      const centre = object && screenRect(object, rect), found = object ? [{ item: object, distance: 0, screenSize: centre?.size ?? Infinity }] : [];
      const toBeat = object ? pickScore(0, centre?.size ?? Infinity) : Infinity;
      const near = [...instances.values()].flatMap(group => {
        const r = group === object || !shown(group) || unpickable.has(group.userData.id) ? null : screenRect(group, rect), d = r ? outside(r, x, y) : Infinity;
        return r && d <= radius && (!object || r.size < SMALL_PART_PX) && pickScore(d, r.size) < toBeat ? [{ group, r, d }] : [];
      }).sort((a, b) => pickScore(a.d, a.r.size) - pickScore(b.d, b.r.size));
      for (const { group, r } of near.slice(0, 8)) {
        // Offsets come nearest first: the first ray that hits gives the part's distance from the finger.
        for (const [dx, dy, distance] of pickOffsets(radius)) {
          if (outside(r, x + dx, y + dy) > 0) continue;
          if (rayObject([group], x + dx, y + dy, rect)) { found.push({ item: group, distance, screenSize: r.size }); break; }
        }
      }
      object = choosePick(found);
    }
    return object ? { id: object.userData.id ?? object.userData.ownerId, ownerId: object.userData.ownerId } : null;
  }
  /** Is the finger on (or right beside) the placement ghost's on-screen bounds? */
  function onGhost(event: { clientX: number; clientY: number }) {
    if (!ghostRoot.children.length) return false;
    scene.updateMatrixWorld(true);
    const r = screenRect(ghostRoot, renderer.domElement.getBoundingClientRect());
    return !!r && outside(r, event.clientX, event.clientY) <= TOUCH_PICK_RADIUS;
  }
  /** Screen radius for choosing mount dots, hooks and cradles: a fingertip is much larger than a cursor. */
  const targetRadius = (mouse: number) => touchInput ? Math.max(mouse, TOUCH_TARGET_RADIUS) : mouse;
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
    if(placingWall()) { const hit=wallRay(event); if(hit) store.previewWall(hit.wall,[hit.u,hit.h],!snapOff(event as {altKey?:boolean})); return; }
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
    const grid=(v:number)=>snap && !snapOff(event) ? Math.round(v/25)*25 : v;
    return [grid(point.x),grid(point.z)];
  }
  const floorKey=(event:KeyboardEvent)=>{
    if ((matches('undo', event) || matches('redo', event)) && !isTyping(event.target)) {
      // BuilderPage invokes history next; leave store gesture finalization to history.
      floorDrag = null; hangDrag = null; pointerGesture.finish(); selecting = false; marquee.style.display = 'none';
      controls.enabled = !snapshot.selectionTool;
      return;
    }
    if(matches('escape', event)) { floorDrag=null; hangDrag=null; store.cancelGesture(); controls.enabled=true; pointerGesture.finish(); return; }
    const back=matches('rotate-back', event);
    if((!back && !matches('rotate', event)) || isTyping(event.target)) return;
    if (snapshot.systemChoice) return;
    const delta=(back?-1:1)*Math.PI/12;
    if(isFloorPart(snapshot.placing?.part)) {event.preventDefault();store.previewFloor(undefined,delta);return;}
    const mounted = rotationTarget();
    if (mounted && store.rotateMounted(mounted, back ? -1 : 1)) { event.preventDefault(); return; }
    const id=floorDrag?.id ?? (snapshot.selection.length===1?snapshot.selected:null);
    const item=store.getAppliedDoc().floorItems?.find(i=>i.id===id && !i.cradle && !unpickable.has(i.id));
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
    return candidates.find(id => id && !unpickable.has(id) && rotationMode(snapshot.doc, store.ownerOf(id)!).supported) ?? null;
  }
  /** Alt/⌥ + scroll rotates (#217); a plain scroll falls through to OrbitControls and zooms, even over a part. */
  const onWheel = (event: WheelEvent) => {
    if (snapshot.systemChoice || !wheelRotates(event)) return;
    const floorId = floorDrag?.id ?? hoveredId ?? (snapshot.selection.length === 1 ? snapshot.selected : null);
    const floorItem = store.getAppliedDoc().floorItems?.find(i => i.id === floorId && !i.cradle && !unpickable.has(i.id));
    const mounted = rotationTarget();
    if (!isFloorPart(snapshot.placing?.part) && !floorItem && !mounted) return;
    event.preventDefault(); event.stopImmediatePropagation();
    // Some platforms turn a modified scroll sideways (Shift on macOS), so either axis counts.
    const delta = event.deltaY || event.deltaX;
    if (!delta) return;
    const direction = Math.sign(delta) * (event.shiftKey ? -1 : 1);
    if (isFloorPart(snapshot.placing?.part)) store.previewFloor(undefined, direction * Math.PI / 12);
    else if (mounted) store.rotateMounted(mounted, direction);
    else if (floorItem) { if (floorDrag) floorDrag.moved = true; store.updateFloor(floorItem.id, { rotation: floorItem.rotation + direction * Math.PI / 12 }); }
  };
  const onDoubleClick = (event: MouseEvent) => {
    // A double-tap is not a reposition on touch: long-press is (a finger double-tap is too easy to hit mid-orbit).
    if (snapshot.systemChoice || touchInput) return;
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
      if(floorDrag.wall) { const hit=wallRay(event,floorDrag.wall); if(hit && floorDrag.moved) store.updateWall(floorDrag.id,{position:[floorDrag.position[0]+hit.u-floorDrag.start[0],floorDrag.position[1]+hit.h-floorDrag.start[1]]},!snapOff(event)); return; }
      const point=floorPoint(event,false);
      if(point && floorDrag.moved) {const grid=(v:number)=>snapOff(event)?v:Math.round(v/25)*25;store.updateFloor(floorDrag.id,{position:[grid(floorDrag.position[0]+point[0]-floorDrag.start[0]),grid(floorDrag.position[1]+point[1]-floorDrag.start[1])]});}
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
        if (unpickable.has(g.userData.id as string)) continue;
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
    const object = pickableOwner(raycaster.intersectObject(assemblyRoot, true));
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
    // Every lifted finger "leaves": touch keeps the rotation and structure handles for its Place/Apply tap.
    if (event.pointerType === "touch") return;
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
  // ---- Touch (#204). Mouse and pen keep the handlers above untouched; fingers route through these. ----
  const touches = new TouchTracker();
  /** The scene owns this touch gesture (OrbitControls never saw it); a second finger then ends it and is ignored. */
  let sceneTouch = false, swallowTouch = false;
  /** The ghost follows the primary finger; `ghostOffset` keeps a floor ghost's grab point under the finger. */
  let placementDrag = false, ghostOffset: [number, number] | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined, longPressed = false;
  /** The part under the finger at touch-down (undefined until picked); a tap or long-press reuses it. */
  let downHit: { id: string; ownerId: string } | null | undefined;
  const clearLongPress = () => { clearTimeout(longPressTimer); longPressTimer = undefined; };
  const placingAny = () => !!(snapshot.placing || snapshot.structureChoice || snapshot.systemChoice);
  const restoreControls = () => { controls.enabled = !floorDrag && !snapshot.selectionTool; };
  /** Take the finger from OrbitControls: capture it here and stop the controls seeing the press. */
  const ownTouch = (event: PointerEvent) => {
    controls.enabled = false; pointerGesture.capture(); event.stopImmediatePropagation(); sceneTouch = true;
  };
  function startGhostDrag(event: { clientX: number; clientY: number }) {
    placementDrag = true; ghostOffset = null;
    const proposal = snapshot.proposal, item = proposal?.doc.floorItems?.find(i => i.id === proposal.ownerId);
    const point = isFloorPart(snapshot.placing?.part) && item && !item.cradle ? floorPoint(event, false) : null;
    if (point && item) ghostOffset = [item.position[0] - point[0], item.position[1] - point[1]];
  }
  function dragGhost(event: PointerEvent) {
    const point = ghostOffset ? floorPoint(event, false) : null;
    if (!ghostOffset || !point) { updatePreview(event); return; }
    // A cradle under the finger still parks a bar; otherwise the ghost keeps its grab offset on the floor.
    if (parksInCradles(snapshot.placing?.part) && cradleAt(event)) { updatePreview(event); return; }
    const grid = (v: number) => Math.round(v / 25) * 25;
    store.previewFloor([grid(point[0] + ghostOffset[0]), grid(point[1] + ghostOffset[1])]);
  }
  /** End whatever the scene was doing with a finger, keeping a drag's progress (one history entry). */
  function finishSceneTouch() {
    if (floorDrag) { floorDrag = null; store.endGesture(); }
    if (hangDrag) { const drag = hangDrag; hangDrag = null; if (drag.started && placingHang()) { store.cancelPlacement(); store.select(drag.id); } }
    placementDrag = false; ghostOffset = null; sceneTouch = false; selecting = false; marquee.style.display = "none";
    pointerGesture.finish(); restoreControls();
  }
  function scheduleLongPress(event: PointerEvent) {
    clearLongPress();
    const { pointerId, clientX, clientY } = event;
    longPressTimer = setTimeout(() => {
      longPressTimer = undefined;
      if (disposed || touches.count !== 1 || touches.moved || touches.primary?.id !== pointerId) return;
      if (placingAny() || snapshot.selectionTool || build) return;
      const hit = downHit !== undefined ? downHit : pickOwner({ clientX, clientY });
      if (!hit) return;
      // The touch equivalent of double-click: pick the part up; the same finger then carries its ghost.
      if (floorDrag) { floorDrag = null; store.cancelGesture(); }
      hangDrag = null;
      controls.enabled = false; longPressed = true;
      navigator.vibrate?.(12);
      store.pickup(hit.id);
      if (!snapshot.placing) return;
      pointerGesture.begin({ pointerId, clientX, clientY }); pointerGesture.capture(); sceneTouch = true;
      startGhostDrag({ clientX, clientY });
      controls.enabled = false;
    }, LONG_PRESS_MS);
  }
  const touchDown = (event: PointerEvent) => {
    touchInput = true;
    updateTouchBar();
    if (touches.down(event, performance.now()) > 1) {
      // A second finger makes the gesture a camera pinch/pan. If the scene held the first finger, OrbitControls
      // never saw it: end the scene gesture and sit this one out rather than orbit from half a pinch.
      clearLongPress();
      if (sceneTouch || swallowTouch) { finishSceneTouch(); swallowTouch = true; event.stopImmediatePropagation(); }
      return;
    }
    longPressed = false; sceneTouch = false; swallowTouch = false; downHit = undefined;
    if (snapshot.systemChoice) return;
    // The marquee tool draws with a finger exactly as with a mouse.
    if (snapshot.selectionTool) { onDown(event); sceneTouch = true; return; }
    pointerGesture.begin(event);
    if (placingAny()) {
      // Touching the ghost drags it; elsewhere the finger orbits and a tap chooses the spot (see touchTap).
      if (!addingStructure() && !snapshot.placing?.rotationOnly && snapshot.placing && onGhost(event)) { startGhostDrag(event); ownTouch(event); }
      return;
    }
    scheduleLongPress(event);
    // Only a part that is already selected moves under a finger; anything else orbits (and a tap selects it).
    // Nothing selected: pick lazily on tap or long-press, so an orbit never pays for it.
    if (snapshot.selection.length !== 1) return;
    const hit = downHit = pickOwner(event);
    if (!hit || !snapshot.selection.includes(hit.id)) return;
    const applied = store.getAppliedDoc();
    if (!applied.floorItems?.some(i => i.id === hit.id && !i.cradle) && !applied.wallItems?.some(i => i.id === hit.id) && !applied.hangItems?.some(i => i.id === hit.id)) return;
    onDown(event);
    if (floorDrag || hangDrag) sceneTouch = true;
  };
  const touchMove = (event: PointerEvent) => {
    if (touches.move(event)) clearLongPress();
    if (swallowTouch || event.pointerId !== touches.primary?.id || touches.count > 1) return;
    if (placementDrag) { if (touches.moved || longPressed) dragGhost(event); return; }
    if (sceneTouch) onMove(event);
  };
  function touchTap(event: PointerEvent) {
    if (snapshot.systemChoice || build) return;
    if (snapshot.placing?.rotationOnly) { store.acceptProposal(); return; }
    if (placingAny()) {
      // Choose the spot or target; the Place button commits (no hover on touch, so a tap never places).
      if (addingStructure()) updateStructure(event); else updatePreview(event);
      return;
    }
    const hit = downHit !== undefined ? downHit : pickOwner(event);
    if (hit) { store.select(hit.id); return; }
    // Empty space clears the selection; with nothing selected a wall or the ceiling opens the room, like a click.
    if (snapshot.selection.length) { store.select(null); return; }
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (walls.group.visible && wallHit(roomOf(snapshot.doc), raycaster.ray.origin.toArray(), raycaster.ray.direction.toArray()) || roomScenery.ceilingVisible && raycaster.ray.direction.y > 0) store.openRoom();
  }
  const touchUp = (event: PointerEvent) => {
    const { tap, primary, remaining } = touches.up(event, performance.now());
    if (swallowTouch) { if (!remaining) { swallowTouch = false; restoreControls(); } return; }
    if (!primary) return; // A second finger lifting: OrbitControls carries on with the first.
    clearLongPress();
    if (longPressed || placementDrag) { longPressed = false; finishSceneTouch(); return; } // The ghost stays for Place.
    if (sceneTouch) { sceneTouch = false; onUp(event); restoreControls(); return; }
    pointerGesture.finish();
    if (tap) touchTap(event);
  };
  const touchCancel = () => {
    clearLongPress(); touches.reset();
    if (floorDrag && (sceneTouch || placementDrag)) { floorDrag = null; store.cancelGesture(); }
    placementDrag = false; ghostOffset = null; sceneTouch = false; swallowTouch = false; longPressed = false;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "touch") { touchDown(event); return; }
    if (touchInput) { touchInput = false; updateTouchBar(); }
    onDown(event);
  };
  const onPointerMove = (event: PointerEvent) => { if (event.pointerType === "touch") touchMove(event); else onMove(event); };
  const onPointerUp = (event: PointerEvent) => { if (event.pointerType === "touch") touchUp(event); else onUp(event); };
  const onPointerCancel = (event: PointerEvent) => { if (event.pointerType === "touch") touchCancel(); onCancel(); };
  // Touch placement bar: big thumb-reachable Place / Cancel (and rotate) over the canvas, since a tap never places.
  const touchBar = document.createElement("div");
  touchBar.className = "touch-placement";
  touchBar.setAttribute("role", "toolbar");
  touchBar.setAttribute("aria-label", "Placement");
  touchBar.style.cssText = "position:absolute;left:50%;transform:translateX(-50%);z-index:3;display:none;gap:10px;align-items:center;pointer-events:auto;touch-action:manipulation;max-width:calc(100% - 24px)";
  const barButton = (label: string, text: string, primary = false) => {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = text; button.setAttribute("aria-label", label);
    button.style.cssText = "display:grid;place-items:center;min-height:52px;min-width:52px;padding:0 24px;border-radius:26px;font-family:inherit;font-size:16px;font-weight:600;line-height:1;touch-action:manipulation;box-shadow:0 6px 20px #0003;" +
      (primary ? "background:#264d3a;color:#fff;border:1px solid #264d3a" : "background:#f8faf2;color:#264d3a;border:1px solid #cbd7c3");
    touchBar.append(button);
    return button;
  };
  /** Round icon button: a circular arrow, mirrored for the other direction. */
  const rotateButton = (label: string, mirror: boolean) => {
    const button = barButton(label, "");
    button.style.padding = "0";
    button.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${mirror ? ' style="transform:scaleX(-1)"' : ""}><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>`;
    return button;
  };
  const touchCancelButton = barButton("Cancel placement", "Cancel"), rotateLeft = rotateButton("Rotate left", false), rotateRight = rotateButton("Rotate right", true), touchPlace = barButton("Place", "Place", true);
  touchCancelButton.id = "touch-cancel"; touchPlace.id = "touch-place"; rotateLeft.id = "touch-rotate-left"; rotateRight.id = "touch-rotate-right";
  touchCancelButton.addEventListener("click", () => { store.cancelPlacement(); if (snapshot.systemChoice) store.patch({ systemChoice: null, proposal: null }); });
  touchPlace.addEventListener("click", () => { if (addingStructure()) commitStructure(); else store.acceptProposal(); });
  rotateLeft.addEventListener("click", () => store.rotateSelection(-1));
  rotateRight.addEventListener("click", () => store.rotateSelection(1));
  // The app shell's stage overlay (#203) floats over the canvas and, on phones, ends above the sheet; a bare
  // viewport (tests, other hosts) gets the bar itself.
  (viewport.closest(".stage")?.querySelector<HTMLElement>('.stage-overlay[data-slot="stage-overlay"]') ?? viewport).append(touchBar);
  const coarse = matchMedia("(pointer: coarse)");
  function positionTouchBar() {
    // The host's CSS may lift the bar clear of its own stage chrome with --touch-bar-offset.
    touchBar.style.bottom = `calc(var(--touch-bar-offset, 18px) + ${insets.bottom}px + env(safe-area-inset-bottom, 0px))`;
  }
  function updateTouchBar() {
    const show = (touchInput || coarse.matches) && placingAny();
    touchBar.style.display = show ? "flex" : "none";
    touchBar.toggleAttribute("data-shown", show);
    viewport.toggleAttribute("data-touch-placement", show);
    if (!show) return;
    touchPlace.disabled = !snapshot.proposal || snapshot.loading;
    touchPlace.style.opacity = touchPlace.disabled ? ".5" : "1";
    touchPlace.textContent = snapshot.placing?.rotationOnly ? "Apply" : "Place";
    const rotates = !!store.rotationSubject();
    rotateLeft.hidden = rotateRight.hidden = !rotates;
  }
  positionTouchBar();
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
  renderer.domElement.addEventListener("pointerdown", onPointerDown, true);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerCancel);
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
  /** What fit frames: the equipment, plus the room while its walls are drawn (the far backdrop never counts). */
  function contentBox() {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(assemblyRoot);
    if (walls.group.visible) {
      const { back, left, right, front, height } = roomOf(snapshot.doc);
      box.union(new THREE.Box3(new THREE.Vector3(-left, 0, -back), new THREE.Vector3(right, height, front)));
    }
    if (box.isEmpty())
      box.set(
        new THREE.Vector3(-600, 0, -500),
        new THREE.Vector3(600, snapshot.doc.rack.height, 500),
      );
    return box;
  }
  function fit(mode: BuilderView = view) {
    stopBuild();
    flight = null;
    view = mode;
    const directions: Record<BuilderView, Vec3> = {
        iso: [1, 0.65, 1.2],
        front: [0, 0, 1],
        side: [1, 0, 0],
        top: [0, 1, 0.0001],
      };
    const direction = new THREE.Vector3(...directions[mode]).normalize(),
      tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
      // Frame the uncovered part of the canvas (the view offset centres it there).
      [shownX, shownY] = shownFraction();
    // Tight (#215): the content spans FIT_FILL of the uncovered canvas along its limiting axis, centred on screen.
    const { target, distance } = fitFrame(contentBox(), direction, tangent * camera.aspect * shownX, tangent * shownY);
    camera.position.copy(target).addScaledVector(direction, distance);
    controls.target.copy(target);
    controls.update();
    invalidate();
  }
  /** Share of the uncovered canvas the framed content spans, per axis (1 = edge to edge). */
  function contentFill() {
    camera.updateMatrixWorld();
    const fill = projectedFill(contentBox(), camera), [shownX, shownY] = shownFraction();
    return { x: fill.x / shownX, y: fill.y / shownY };
  }
  /** Uncovered share of the canvas width and height. */
  function shownFraction(): [number, number] {
    const [width, height] = canvasSize.map(v => Math.max(1, v));
    return [Math.max(0.2, 1 - (insets.left + insets.right) / width), Math.max(0.2, 1 - (insets.top + insets.bottom) / height)];
  }
  /** Shift the projection so the orbit target sits at the centre of the uncovered area (picking stays exact:
   * rays and projections go through the same offset matrix). */
  function applyViewOffset() {
    const [width, height] = canvasSize, x = (insets.right - insets.left) / 2, y = (insets.bottom - insets.top) / 2;
    if (x || y) camera.setViewOffset(width, height, x, y, width, height);
    else camera.clearViewOffset();
  }
  /** Camera move in flight (focus): eased in renderFrame, cancelled by any orbit input. */
  let flight: { from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number } | null = null;
  controls.addEventListener("start", () => { flight = null; });
  function focus(ids: readonly string[]) {
    stopBuild();
    const box = new THREE.Box3(), wanted = new Set(ids);
    for (const g of instances.values()) if (wanted.has(g.userData.id as string)) box.expandByObject(g);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3()), radius = Math.max(150, box.getSize(new THREE.Vector3()).length() / 2);
    const direction = camera.position.clone().sub(controls.target).normalize();
    // Like fit: frame the canvas area not covered by overlaid UI (the phone sheet, the top bar).
    const [shownX, shownY] = shownFraction();
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect * shownX, shownY);
    const to = center.clone().addScaledVector(direction, (radius / tangent) * 1.25);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flight = null; camera.position.copy(to); controls.target.copy(center); controls.update(); invalidate(); return;
    }
    flight = { from: camera.position.clone(), to, fromTarget: controls.target.clone(), toTarget: center, start: performance.now() };
    invalidate();
  }
  /** Advances a focus flight; true while it needs another frame. */
  function fly() {
    if (!flight) return false;
    const t = Math.min(1, (performance.now() - flight.start) / 420), ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(flight.from, flight.to, ease);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease);
    if (t >= 1) flight = null;
    return !!flight;
  }
  const boundsCorner = new THREE.Vector3();
  function selectionScreenBounds(): SelectionScreenBounds | null {
    const rect = renderer.domElement.getBoundingClientRect();
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const helper of selectionBoxes) {
      if (!helper.visible) continue;
      const { min, max } = helper.box;
      for (let i = 0; i < 8; i++) {
        boundsCorner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).project(camera);
        if (boundsCorner.z < -1 || boundsCorner.z > 1) continue;
        const x = rect.left + (boundsCorner.x + 1) * rect.width / 2, y = rect.top + (1 - boundsCorner.y) * rect.height / 2;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    return left > right ? null : { left, top, right, bottom, viewport: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } };
  }
  const resize = () => {
    const rect = viewport.getBoundingClientRect(),
      width = Math.max(1, rect.width),
      height = Math.max(1, rect.height);
    // A resize that keeps the size (a bottom sheet moving over the canvas) costs nothing.
    if (width === canvasSize[0] && height === canvasSize[1]) return;
    canvasSize = [width, height];
    renderer.setSize(width, height);
    camera.aspect = width / height;
    applyViewOffset();
    camera.updateProjectionMatrix();
    positionTouchBar();
    // Resizing clears the canvas; repaint before the browser presents it.
    loop.renderNow();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();
  renderer.domElement.addEventListener("webglcontextrestored", invalidate);
  /** Dollhouse cut-away (#201): wall items (and anything hung on them) hide with the wall they are on whenever the camera
   * is outside it, so windows, doors and bays never show their backs from the default views. */
  function cutAwayWallItems() {
    const items = snapshot.doc.wallItems;
    if (!items?.length) return;
    const frames = wallFrames(roomOf(snapshot.doc)), eye = camera.position.toArray(), hidden = new Set<string>();
    for (const item of items) {
      const shown = facesInside(frames[item.wall], eye), group = instances.get(item.id);
      if (group) group.visible = shown;
      if (!shown) hidden.add(item.id);
    }
    for (const hung of snapshot.doc.hangItems ?? []) { const group = instances.get(hung.id); if (group) group.visible = !hidden.has(hung.panel); }
  }
  /** One frame; true while damping or the build animation needs another. */
  function renderFrame() {
    if (disposed) return false;
    let again = false;
    if (build) {
      if (build.animation.update((performance.now() - build.start) / 1000)) again = true;
      else stopBuild();
    }
    if (!build) {
      if (fly()) again = true;
      updatingControls = true;
      const damping = controls.update();
      updatingControls = false;
      // Inertia (a flick, a released drag) ends render-on-demand once the camera stops visibly moving.
      if (cameraMoving(camera, controls.target) && damping) again = true;
    }
    const focus = build ? build.animation.focus : controls.target;
    backdrop.follow(camera, focus);
    walls.follow(camera);
    cutAwayWallItems();
    roomScenery.follow(camera);
    camera.far = Math.max(40000, camera.position.distanceTo(focus) * 4);
    [fog.near, fog.far] = fogRange(camera.position.distanceTo(focus));
    camera.near = Math.max(
      0.5,
      camera.position.distanceTo(focus) / 200,
    );
    camera.updateProjectionMatrix();
    positionHandles();
    if (lighting.key.shadow.needsUpdate) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    for (const listener of frameListeners) listener();
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
  const drawnKeys = ["doc", "resolved", "selection", "placing", "proposal", "structureChoice", "systemChoice", "structureMode", "paired", "hidden"] as const;
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
    if (snapshot.hidden !== previous.hidden || snapshot.locked !== previous.locked) applyVisibility();
    // A finger orbiting during placement keeps the controls (a tap, not the press, chooses the spot on touch).
    controls.enabled = !floorDrag && !snapshot.selectionTool && !selecting && !(pointerGesture.start && !addingStructure() && (snapshot.placing || snapshot.structureChoice) && (!touchInput || sceneTouch || longPressed));
    updateTouchBar();
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
    contentFill,
    refitOnNextBuild() {
      hasFit = false;
    },
    playBuild,
    stopBuild,
    invalidate,
    screenPoint(id) {
      const object = ghostRoot.children.find(g => g.userData.id === id || g.userData.ownerId === id)
        ?? instances.get(id) ?? [...instances.values()].find(g => g.userData.ownerId === id);
      if (!object) return null;
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      if (box.isEmpty()) return null;
      const p = box.getCenter(new THREE.Vector3()).project(camera), rect = renderer.domElement.getBoundingClientRect();
      return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2, visible: p.z >= -1 && p.z <= 1 };
    },
    setViewInsets(next) {
      const merged = { ...insets, ...next };
      for (const side of ["top", "right", "bottom", "left"] as const) merged[side] = Math.max(0, Number(merged[side]) || 0);
      if ((["top", "right", "bottom", "left"] as const).every(side => merged[side] === insets[side])) return;
      insets = merged;
      applyViewOffset();
      positionTouchBar();
      invalidate();
    },
    focus,
    selectionScreenBounds,
    onFrame(listener) { frameListeners.add(listener); return () => { frameListeners.delete(listener); }; },
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
      for (const child of output.children) child.visible = true; // Hiding (outliner) is a view choice, not an edit.
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
      cancelAnimationFrame(progressFrame);
      frameListeners.clear();
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
      renderer.domElement.removeEventListener("gesturestart", preventGesture);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, true);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      clearLongPress();
      touchBar.remove(); viewport.removeAttribute("data-touch-placement");
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
