import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export type View = "iso" | "front" | "top" | "side" | "detail";
export type { LibraryMesh as MeshData } from "../../rack-generator/worker-types.ts";
import type { LibraryMesh as MeshData } from "../../rack-generator/worker-types.ts";
export interface Reference {
  file: string;
  node: string;
}
const referenceUrls = {
  front: new URL("../../rack-generator/reference/front.glb", import.meta.url)
    .href,
  panel: new URL("../../rack-generator/reference/panel.glb", import.meta.url)
    .href,
  storage: new URL(
    "../../rack-generator/reference/storage.glb",
    import.meta.url
  ).href,
};
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  // Revocation does not depend on the page remaining mounted.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function materials(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}
function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    mats = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        mats.add(m);
        for (const v of Object.values(m))
          if (v instanceof THREE.Texture) textures.add(v);
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  root.clear();
}
/** Owns Three resources only. React owns all controls, status, and model state. */
export function createPartScene(
  viewport: HTMLDivElement,
  onCompareError: (message: string) => void
) {
  let disposed = false,
    view: View = "iso",
    wireframe = false,
    pair = false,
    refToken = 0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e9eeea");
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 50000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  viewport.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9280, 3));
  for (const pos of [
    [2000, 3000, 1800],
    [-2000, 1200, -1000],
  ]) {
    const l = new THREE.DirectionalLight(0xffffff, 2.5);
    l.position.set(pos[0], pos[1], pos[2]);
    scene.add(l);
  }
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const group = new THREE.Group(),
    comparison = new THREE.Group();
  scene.add(group, comparison);
  scene.add(new THREE.GridHelper(10000, 200, 0xb2c0b4, 0xd6ded5));
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco),
    cache = new Map<string, Promise<GLTF>>();
  const disposedSources = new WeakSet<THREE.Object3D>();
  function disposeSource(gltf: GLTF) {
    if (!disposedSources.has(gltf.scene)) {
      disposedSources.add(gltf.scene);
      disposeTree(gltf.scene);
    }
  }
  function clearComparison() {
    comparison.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.comparisonMaterial)
        materials(o).forEach((m) => m.dispose());
    });
    comparison.clear();
    comparison.position.set(0, 0, 0);
    group.position.x = 0;
  }
  function fit(mode: View = view) {
    view = mode;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    if (comparison.children.length)
      box.union(new THREE.Box3().setFromObject(comparison));
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3());
    const direction = new THREE.Vector3(0.9, 0.6, 1).normalize();
    if (mode === "front") direction.set(0, 0, 1);
    if (mode === "side") direction.set(1, 0, 0);
    if (mode === "top") direction.set(0, 1, 0.0001);
    const right = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), direction)
        .normalize(),
      up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 1;
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const c = new THREE.Vector3(
            (x * size.x) / 2,
            (y * size.y) / 2,
            (z * size.z) / 2
          );
          distance = Math.max(
            distance,
            c.dot(direction) +
              Math.abs(c.dot(right)) / (tangent * camera.aspect),
            c.dot(direction) + Math.abs(c.dot(up)) / tangent
          );
        }
    distance *= 1.35;
    if (mode === "detail") {
      center.x = pair ? -387.5 : 0;
      distance = Math.max(330, 230 / camera.aspect);
    }
    camera.position.copy(center).addScaledVector(direction, distance);
    controls.target.copy(center);
    controls.maxDistance = Math.max(10000, distance * 4);
    controls.update();
  }
  function setMeshes(meshes: MeshData[], paired = false) {
    ++refToken;
    clearComparison();
    disposeTree(group);
    pair = paired;
    for (const data of meshes) {
      const positions = new Float32Array(
        (data.positions.length / data.stride) * 3
      );
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] = data.positions[i * data.stride];
        positions[i * 3 + 1] = data.positions[i * data.stride + 2];
        positions[i * 3 + 2] = -data.positions[i * data.stride + 1];
      }
      const indexed = new THREE.BufferGeometry();
      indexed.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      indexed.setIndex(new THREE.BufferAttribute(data.indices, 1));
      const geometry = toCreasedNormals(indexed, Math.PI / 5);
      if (geometry !== indexed) indexed.dispose();
      const plastic = /liner|plastic|UHMW|rubber|webbing|strap$|pad/i.test(
          data.name
        ),
        hardware = /bolt|washer|nut|axle|roller|pin/i.test(data.name);
      const material = new THREE.MeshStandardMaterial({
        color: data.color || "#425f50",
        metalness: data.metalness ?? (plastic ? 0 : hardware ? 0.85 : 0.55),
        roughness: data.roughness ?? (plastic ? 0.65 : hardware ? 0.24 : 0.42),
        wireframe,
      });
      for (const x of paired ? [-387.5, 387.5] : [0]) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = data.name;
        mesh.position.x = x;
        group.add(mesh);
      }
    }
    const box = new THREE.Box3().setFromObject(group),
      center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3());
    for (const child of group.children)
      child.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    fit();
    return size.toArray();
  }
  async function compare(
    ref: Reference | undefined,
    enabled: boolean,
    overlay: boolean
  ) {
    const token = ++refToken;
    clearComparison();
    if (!enabled || !ref) {
      fit();
      return;
    }
    try {
      if (!(ref.file in referenceUrls))
        throw new Error("Unknown source file: " + ref.file);
      let pending = cache.get(ref.file);
      if (!pending) {
        pending = loader.loadAsync(
          referenceUrls[ref.file as keyof typeof referenceUrls]
        );
        cache.set(ref.file, pending);
        pending.then(
          (gltf) => {
            if (disposed) disposeSource(gltf);
          },
          () => {
            cache.delete(ref.file);
          }
        );
      }
      const gltf = await pending;
      if (disposed || token !== refToken) return;
      gltf.scene.updateMatrixWorld(true);
      const source =
        gltf.scene.getObjectByName(ref.node) ||
        gltf.scene.getObjectByName(
          ref.node.replaceAll(" ", "_").replaceAll(".", "")
        );
      if (!source) throw new Error("Source node unavailable: " + ref.node);
      const clone = source.clone();
      if (overlay)
        clone.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.material = new THREE.MeshBasicMaterial({
              color: 0xe59c48,
              transparent: true,
              opacity: 0.28,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
            o.userData.comparisonMaterial = true;
          }
        });
      clone.matrixAutoUpdate = false;
      clone.matrix.copy(source.matrixWorld);
      const holder = new THREE.Group();
      holder.add(clone);
      holder.scale.setScalar(1000);
      comparison.add(holder);
      comparison.updateMatrixWorld(true);
      let sourceBox = new THREE.Box3().setFromObject(comparison);
      const ours = new THREE.Box3()
          .setFromObject(group)
          .getSize(new THREE.Vector3()),
        theirs = sourceBox.getSize(new THREE.Vector3());
      if (
        Math.max(ours.x, ours.z) > ours.y * 1.4 &&
        Math.max(theirs.x, theirs.z) > theirs.y * 1.4 &&
        ours.x > ours.z !== theirs.x > theirs.z
      ) {
        holder.rotation.y = Math.PI / 2;
        comparison.updateMatrixWorld(true);
        sourceBox = new THREE.Box3().setFromObject(comparison);
      }
      const center = sourceBox.getCenter(new THREE.Vector3());
      holder.position.sub(
        new THREE.Vector3(center.x, sourceBox.min.y, center.z)
      );
      const srcSize = sourceBox.getSize(new THREE.Vector3()),
        gap = Math.max(ours.x, srcSize.x) * 0.2 + 80;
      group.position.x = overlay ? 0 : -(srcSize.x + gap) / 2;
      comparison.position.x = overlay ? 0 : (ours.x + gap) / 2;
      fit();
    } catch (error) {
      if (!disposed && token === refToken)
        onCompareError(error instanceof Error ? error.message : String(error));
    }
  }
  const observer = new ResizeObserver(() => {
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    fit();
  });
  observer.observe(viewport);
  renderer.setAnimationLoop(() => {
    controls.update();
    const distance = camera.position.distanceTo(controls.target);
    camera.near = Math.max(0.5, distance / 200);
    camera.far = Math.max(10000, distance * 20);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });
  return {
    fit,
    setMeshes,
    compare,
    setWireframe(value: boolean) {
      wireframe = value;
      group.traverse((o) => {
        if (o instanceof THREE.Mesh)
          for (const m of materials(o))
            if (m instanceof THREE.MeshStandardMaterial) m.wireframe = value;
      });
    },
    async exportGLB(name: string) {
      const output = group.clone();
      output.name = name;
      output.position.set(0, 0, 0);
      output.scale.setScalar(0.001);
      const result = await new GLTFExporter().parseAsync(output, {
        binary: true,
      });
      if (!disposed && result instanceof ArrayBuffer)
        download(
          new Blob([result], { type: "model/gltf-binary" }),
          name + ".glb"
        );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ++refToken;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      clearComparison();
      disposeTree(scene);
      cache.forEach((p) => {
        void p.then(disposeSource, () => {});
      });
      cache.clear();
      draco.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
export type PartScene = ReturnType<typeof createPartScene>;
