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
        (snapshot.placing && key.startsWith(snapshot.placing.part + ":"))
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
  async function rebuild() {
    const serial = ++generation,
      entries = snapshot.resolved;
    store.patch({
      loading: true,
      status: "Building your rack…",
      error: false,
      dimensions: dimensions(),
    });
    try {
      const models = await Promise.all(entries.map(geometryFor));
      if (disposed || serial !== generation) return;
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
      trimCache();
      const warnings = detectCollisions(entries);
      store.patch({
        loading: false,
        dimensions: dimensions(true),
        status: warnings.length
          ? `${warnings.length} placement warning${warnings.length === 1 ? "" : "s"} · ${entries.length} parts`
          : `${entries.length} parts · All connections aligned · Saved locally`,
        error: false,
      });
      if (!hasFit) {
        fit();
        hasFit = true;
      }
    } catch (error) {
      if (!disposed && serial === generation)
        store.patch({ loading: false, status: message(error), error: true });
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
  function resetPlacement() {
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
    const placing = snapshot.placing;
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
  async function updatePreview(event: { clientX: number; clientY: number }) {
    if (!snapshot.placing) return;
    const target = nearestMount(event);
    if (JSON.stringify(target) === JSON.stringify(previewTarget)) return;
    previewTarget = target;
    const serial = ++previewSerial;
    clearGhost();
    if (!target) return;
    try {
      const next = store.placementDoc(target),
        all = resolveAssembly(next),
        nextId =
          snapshot.placing.movingId ||
          next.accessories[next.accessories.length - 1].id,
        entries = all.filter((r) => (r.ownerId || r.id) === nextId);
      store.patch({
        placementText: `${target.uprightId.replaceAll("-", " ")} · ${target.label || target.face + " · Hole " + (target.hole + 1)} · ${Math.round(target.position[2])} mm · Click to place`,
      });
      const models = await Promise.all(entries.map(geometryFor));
      if (disposed || serial !== previewSerial || !snapshot.placing) return;
      for (const [i, model] of models.entries()) {
        const g = transformed(model, entries[i]);
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            disposeMaterial(o.material);
            o.material = new THREE.MeshStandardMaterial({
              color: "#c68b45",
              transparent: true,
              opacity: 0.48,
              depthWrite: false,
            });
          }
        });
        ghostRoot.add(g);
      }
    } catch (error) {
      if (!disposed && serial === previewSerial) {
        previewTarget = null;
        store.patch({ placementText: message(error) });
      }
    }
  }
  function dropPlacement(event: { clientX: number; clientY: number }) {
    if (!snapshot.placing) return;
    const target = nearestMount(event);
    if (!target) {
      store.status(
        "Choose a highlighted mounting hole. Escape cancels placement.",
      );
      return;
    }
    store.act(() => {
      const next = store.placementDoc(target),
        selected =
          snapshot.placing?.movingId ||
          next.accessories[next.accessories.length - 1].id;
      store.commit(next);
      store.select(selected);
    });
  }
  const onDown = (event: PointerEvent) => {
    pointerDown = [event.clientX, event.clientY];
    if (snapshot.placing && event.button === 0) controls.enabled = false;
  };
  const onMove = (event: PointerEvent) => {
    void updatePreview(event);
  };
  const onUp = (event: PointerEvent) => {
    controls.enabled = true;
    if (
      event.button !== 0 ||
      !pointerDown ||
      Math.hypot(
        event.clientX - pointerDown[0],
        event.clientY - pointerDown[1],
      ) > 6
    )
      return;
    pointerDown = null;
    if (snapshot.placing) {
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
  const onCancel = () => {
    pointerDown = null;
    controls.enabled = true;
  };
  const onDrag = (event: DragEvent) => {
    event.preventDefault();
    if (snapshot.placing) void updatePreview(event);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dropPlacement(event);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onCancel);
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
    renderer.render(scene, camera);
  }
  animate();
  const unsubscribe = store.subscribe(() => {
    const previous = snapshot;
    snapshot = store.getSnapshot();
    if (disposed) return;
    if (snapshot.doc !== previous.doc) void rebuild();
    if (snapshot.selected !== previous.selected) refreshSelection();
    if (
      snapshot.placing !== previous.placing ||
      snapshot.paired !== previous.paired ||
      snapshot.doc !== previous.doc
    )
      refreshPlacement();
  });
  void rebuild();
  if (snapshot.placing) refreshPlacement();
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
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onCancel);
      viewport.removeEventListener("dragover", onDrag);
      viewport.removeEventListener("drop", onDrop);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      for (const request of pending.values())
        request.reject(new Error("Scene disposed"));
      pending.clear();
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
