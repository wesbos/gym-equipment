import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "./style.css";
import "./library.css";
const $ = (s) => document.querySelector(s),
  viewport = $("#viewport");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#e9eeea");
scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9280, 3));
for (const [x, y, z] of [
  [2000, 3000, 1800],
  [-2000, 1200, -1000],
]) {
  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(x, y, z);
  scene.add(light);
}
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50000),
  renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewport.append(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture;
room.dispose();
pmrem.dispose();
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const group = new THREE.Group(),
  comparison = new THREE.Group();
scene.add(group, comparison);
const grid = new THREE.GridHelper(10000, 200, 0xb2c0b4, 0xd6ded5);
scene.add(grid);
let definitions = [],
  selected,
  requestId = 0,
  view = "iso",
  currentParams,
  valid = false,
  referenceId = 0;
const values = new Map(),
  referenceCache = new Map();
const referenceUrls = {
  front: new URL("./reference/front.glb", import.meta.url).href,
  panel: new URL("./reference/panel.glb", import.meta.url).href,
  storage: new URL("./reference/storage.glb", import.meta.url).href,
};
const draco = new DRACOLoader();
draco.setDecoderPath("/draco/");
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
function clearGroup(target) {
  target.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
  target.clear();
}
function fit(mode = view) {
  view = mode;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (comparison.children.length)
    box.union(new THREE.Box3().setFromObject(comparison));
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  let direction = new THREE.Vector3(0.9, 0.6, 1).normalize();
  if (mode === "front") direction.set(0, 0, 1);
  if (mode === "side") direction.set(1, 0, 0);
  if (mode === "top") direction.set(0, 1, 0.0001);
  const right = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), direction)
    .normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let distance = 1;
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) {
        const corner = new THREE.Vector3(
          (x * size.x) / 2,
          (y * size.y) / 2,
          (z * size.z) / 2
        );
        const depth = corner.dot(direction);
        distance = Math.max(
          distance,
          depth + Math.abs(corner.dot(right)) / (tangent * camera.aspect),
          depth + Math.abs(corner.dot(up)) / tangent
        );
      }
  distance *= 1.35;
  camera.position.copy(center).addScaledVector(direction, distance);
  controls.target.copy(center);
  controls.maxDistance = Math.max(10000, distance * 4);
  controls.update();
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.view === mode));
}
function status(text, error = false) {
  $("#status").textContent = text;
  $("#status").classList.toggle("error", error);
}
function enable(value) {
  valid = value;
  $("#export").disabled = !value;
  $("#save").disabled = !value;
}
function renderCatalog() {
  const term = $("#search").value.toLowerCase();
  $("#catalog").replaceChildren();
  for (const category of [...new Set(definitions.map((d) => d.category))]) {
    const defs = definitions.filter(
      (d) => d.category === category && d.name.toLowerCase().includes(term)
    );
    if (!defs.length) continue;
    const title = document.createElement("h3");
    title.textContent = category;
    $("#catalog").append(title);
    for (const def of defs) {
      const b = document.createElement("button");
      b.textContent = def.name;
      b.classList.toggle("active", selected?.id === def.id);
      b.onclick = () => select(def);
      $("#catalog").append(b);
    }
  }
}
function select(def) {
  selected = def;
  location.hash = def.id;
  $("#fields").replaceChildren();
  const params = values.get(def.id) || def.defaults;
  for (const [key, value] of Object.entries(params)) {
    const label = document.createElement("label");
    label.textContent = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase());
    const wrap = document.createElement("div");
    wrap.className = "input-wrap";
    const input = document.createElement("input");
    input.name = key;
    input.type = "number";
    input.step = "any";
    input.required = true;
    input.value = Number(value.toFixed(3));
    input.setAttribute("aria-label", label.textContent);
    const unit = document.createElement("span");
    unit.textContent = /angle/i.test(key)
      ? "°"
      : /segments|count/i.test(key)
      ? ""
      : "mm";
    wrap.append(input, unit);
    label.append(wrap);
    $("#fields").append(label);
  }
  $("#part-note").textContent =
    def.description ||
    def.note ||
    "Rebuilt from reference components. Edit the dimensions to generate a new part.";
  $("#reference").disabled = !def.reference;
  renderCatalog();
  rebuild();
}
function rebuild() {
  if (!$("#parameters").reportValidity()) return;
  const params = Object.fromEntries(
    [...new FormData($("#parameters"))].map(([k, v]) => [k, Number(v)])
  );
  values.set(selected.id, params);
  enable(false);
  status("Building " + selected.name + "…");
  worker.postMessage({ id: ++requestId, brand: "BOS STRENGTH",
            part: selected.id, params });
}
async function compare() {
  const token = ++referenceId;
  comparison.traverse((obj) => {
    if (obj.userData.comparisonMaterial) obj.material.dispose();
  });
  comparison.clear();
  comparison.position.set(0, 0, 0);
  group.position.x = 0;
  $("#compare-label").hidden = true;
  if (!$("#reference").checked || !selected.reference) {
    fit();
    return;
  }
  const ref = selected.reference;
  try {
    if (!referenceCache.has(ref.file))
      referenceCache.set(ref.file, loader.loadAsync(referenceUrls[ref.file]));
    const gltf = await referenceCache.get(ref.file);
    if (token !== referenceId) return;
    gltf.scene.updateMatrixWorld(true);
    const source =
      gltf.scene.getObjectByName(ref.node) ||
      gltf.scene.getObjectByName(
        ref.node.replaceAll(" ", "_").replaceAll(".", "")
      );
    if (!source) {
      status("Source node unavailable: " + ref.node, true);
      return;
    }
    const clone = source.clone();
    if ($("#overlay").checked)
      clone.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.material = new THREE.MeshBasicMaterial({
          color: 0xe59c48,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        obj.userData.comparisonMaterial = true;
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
    const srcCenter = sourceBox.getCenter(new THREE.Vector3());
    holder.position.sub(
      new THREE.Vector3(srcCenter.x, sourceBox.min.y, srcCenter.z)
    );
    comparison.updateMatrixWorld(true);
    const ourBox = new THREE.Box3().setFromObject(group),
      ourSize = ourBox.getSize(new THREE.Vector3()),
      srcSize = sourceBox.getSize(new THREE.Vector3());
    const gap = Math.max(ourSize.x, srcSize.x) * 0.2 + 80;
    group.position.x = $("#overlay").checked ? 0 : -(srcSize.x + gap) / 2;
    comparison.position.x = $("#overlay").checked ? 0 : (ourSize.x + gap) / 2;
    $("#compare-label").textContent = $("#overlay").checked
      ? "AMBER OVERLAY / ORIGINAL SOURCE"
      : "MANIFOLD REBUILD ←    → SOURCE MESH";
    $("#compare-label").hidden = false;
    fit();
  } catch (error) {
    if (token === referenceId)
      status("Source comparison failed: " + error.message, true);
  }
}
const worker = new Worker(new URL("./library-worker.js", import.meta.url), {
  type: "module",
});
worker.onerror = (e) => status(e.message, true);
worker.onmessage = ({ data }) => {
  if (data.type === "catalog") {
    definitions = data.definitions;
    select(
      definitions.find((d) => d.id === location.hash.slice(1)) || definitions[0]
    );
    return;
  }
  if (data.id !== requestId) return;
  if (data.type === "error") {
    status(data.error, true);
    enable(false);
    return;
  }
  clearGroup(group);
  comparison.traverse((obj) => {
    if (obj.userData.comparisonMaterial) obj.material.dispose();
  });
  comparison.clear();
  comparison.position.set(0, 0, 0);
  group.position.set(0, 0, 0);
  let triangles = 0;
  for (const mesh of data.meshes) {
    const positions = new Float32Array(
      (mesh.positions.length / mesh.stride) * 3
    );
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] = mesh.positions[i * mesh.stride];
      positions[i * 3 + 1] = mesh.positions[i * mesh.stride + 2];
      positions[i * 3 + 2] = -mesh.positions[i * mesh.stride + 1];
    }
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    indexed.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    const geometry = toCreasedNormals(indexed, Math.PI / 5);
    indexed.dispose();
    const obj = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: mesh.color || "#425f50",
        metalness:
          mesh.metalness ??
          (/liner|plastic|UHMW|rubber|webbing|strap$|pad/i.test(mesh.name)
            ? 0
            : /bolt|washer|nut|axle|roller|pin/i.test(mesh.name)
            ? 0.85
            : 0.55),
        roughness:
          mesh.roughness ??
          (/liner|plastic|UHMW|rubber|webbing|pad/i.test(mesh.name)
            ? 0.65
            : /bolt|washer|nut|axle|roller|pin/i.test(mesh.name)
            ? 0.24
            : 0.42),
        wireframe: $("#wireframe").checked,
      })
    );
    obj.name = mesh.name;
    group.add(obj);
    triangles += mesh.indices.length / 3;
  }
  const box = new THREE.Box3().setFromObject(group),
    center = box.getCenter(new THREE.Vector3()),
    size = box.getSize(new THREE.Vector3());
  for (const child of group.children)
    child.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  currentParams = data.params;
  $("#model-title").textContent = selected.name;
  $("#model-description").textContent =
    size
      .toArray()
      .map((v) => Math.round(v))
      .join(" × ") + " mm · Manifold reconstruction";
  status(
    `${data.meshes.length} solids · ${triangles.toLocaleString()} triangles`
  );
  enable(true);
  compare();
};
$("#parameters").onsubmit = (e) => {
  e.preventDefault();
  rebuild();
};
$("#parameters").oninput = () => {
  ++requestId;
  enable(false);
  status("Parameters changed · rebuild to apply");
};
$("#reset").onclick = () => {
  values.delete(selected.id);
  select(selected);
};
$("#search").oninput = renderCatalog;
$("#reference").onchange = compare;
$("#overlay").onchange = () => {
  if ($("#overlay").checked) $("#reference").checked = true;
  compare();
};
$("#wireframe").onchange = () =>
  group.traverse((o) => {
    if (o.isMesh) o.material.wireframe = $("#wireframe").checked;
  });
$("#fit").onclick = () => fit();
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => fit(b.dataset.view)));
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
$("#save").onclick = () =>
  download(
    new Blob(
      [
        JSON.stringify(
          {
            brand: "BOS STRENGTH",
            part: selected.id,
            params: currentParams,
            units: "mm",
            approximate: true,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    ),
    "bos-strength-" + selected.id + ".json"
  );
$("#export").onclick = async () => {
  if (!valid) return;
  try {
    const output = group.clone();
    output.name = "BOS STRENGTH / " + selected.name;
    output.position.set(0, 0, 0);
    output.scale.setScalar(0.001);
    const data = await new GLTFExporter().parseAsync(output, { binary: true });
    download(
      new Blob([data], { type: "model/gltf-binary" }),
      "bos-strength-" + selected.id + ".glb"
    );
  } catch (e) {
    status(e.message, true);
  }
};
new ResizeObserver(() => {
  const { width, height } = viewport.getBoundingClientRect();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  fit();
}).observe(viewport);
renderer.setAnimationLoop(() => {
  controls.update();
  const depthDistance = camera.position.distanceTo(controls.target);
  camera.near = Math.max(0.5, depthDistance / 200);
  camera.far = Math.max(10000, depthDistance * 20);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
});
window.addEventListener("hashchange", () => {
  const definition = definitions.find((d) => d.id === location.hash.slice(1));
  if (definition && definition.id !== selected?.id) select(definition);
});
