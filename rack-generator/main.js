import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { defaults } from './model.js';
import './style.css';
const $ = selector => document.querySelector(selector);
const viewport = $('#viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9eeea');
const camera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x839a89, 3));
for (const [position, intensity] of [[[1500, 2200, 1700], 3], [[-1800, 900, -1000], 2]]) {
  const light = new THREE.DirectionalLight(0xffffff, intensity); light.position.set(...position); scene.add(light);
}
const grid = new THREE.GridHelper(6000, 120, 0xaebdb1, 0xd3dcd3);
scene.add(grid);
const group = new THREE.Group(); scene.add(group);
const material = new THREE.MeshStandardMaterial({ color: 0x425f50, metalness: 0.45, roughness: 0.46 });
let model, geometry, requestId = 0, view = 'iso';
function fit(mode = view) {
  view = mode;
  if (!model) return;
  const h = model.height;
  const pair = $('#pair').checked;
  const width = pair ? 775 + model.params.width : model.params.width;
  const distance = Math.max(h, width / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.32;
  const target = new THREE.Vector3(0, h / 2, 0);
  let direction = new THREE.Vector3(.6, .22, 1).normalize();
  let zoomDistance = distance;
  if (mode === 'front') direction.set(0, 0, 1);
  if (mode === 'top') { target.set(0, h, 0); direction.set(0, 1, .0001); zoomDistance = Math.max(width / camera.aspect, model.params.width) * 2.2; }
  if (mode === 'detail') { target.set(pair ? -387.5 : 0, model.centers[Math.floor(model.centers.length / 2)], 0); zoomDistance = Math.max(330, 230 / camera.aspect); }
  controls.target.copy(target); camera.position.copy(target).addScaledVector(direction, zoomDistance); controls.update();
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('selected', button.dataset.view === mode));
}
function place() {
  group.clear();
  if (!geometry) return;
  const pair = $('#pair').checked;
  for (const x of pair ? [-387.5, 387.5] : [0]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = x; mesh.name = 'BOS STRENGTH upright (millimetres)'; group.add(mesh);
  }
  fit();
}
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
function setError(message) { $('#status').textContent = message; $('#status').classList.add('error'); $('#export').disabled = true; }
worker.onerror = event => setError(event.message || 'Could not initialize geometry engine.');
worker.onmessage = ({ data }) => {
  if (data.id !== requestId) return;
  if (data.error) { setError(data.error); return; }
  model = data.model;
  const positions = new Float32Array(model.positions.length / model.stride * 3);
  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3] = model.positions[i * model.stride];
    positions[i * 3 + 1] = model.positions[i * model.stride + 2];
    positions[i * 3 + 2] = -model.positions[i * model.stride + 1];
  }
  geometry?.dispose();
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.BufferAttribute(positions, 3)); indexed.setIndex(new THREE.BufferAttribute(model.indices, 1));
  geometry = indexed.toNonIndexed(); indexed.dispose(); geometry.computeVertexNormals(); place();
  $('#model-title').textContent = `${model.params.height}″ upright`;
  $('#model-description').textContent = `${model.params.width} × ${model.params.width} mm / ${model.params.wall} mm wall / ${model.params.spacing} mm pitch`;
  $('#height-mm').textContent = `${model.height.toLocaleString(undefined, { maximumFractionDigits: 2 })} mm`;
  $('#status').classList.remove('error');
  $('#status').textContent = `${model.centers.length} holes / face · ${(model.indices.length / 3).toLocaleString()} triangles / upright`;
  $('#export').disabled = false;
};
function update() {
  if (!$('#parameters').reportValidity()) { $('#export').disabled = true; return; }
  const params = Object.fromEntries(new FormData($('#parameters')).entries().map(([key, value]) => [key, Number(value)]));
  $('#status').classList.remove('error'); $('#status').textContent = 'Building solid…'; $('#export').disabled = true;
  worker.postMessage({ id: ++requestId, params });
}
$('#parameters').addEventListener('submit', event => { event.preventDefault(); update(); });
$('#parameters').addEventListener('input', () => { ++requestId; $('#export').disabled = true; $('#status').textContent = 'Dimensions changed · update model to apply'; });
$('#reset').onclick = () => { for (const [key, value] of Object.entries(defaults)) $(`#${key}`).value = value; update(); };
$('#pair').onchange = place;
$('#wireframe').onchange = () => { material.wireframe = $('#wireframe').checked; };
$('#fit').onclick = () => fit();
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => fit(button.dataset.view));
$('#export').onclick = async () => {
  // glTF uses metres, while the CAD geometry and UI use millimetres.
  try {
    const output = group.clone(); output.scale.setScalar(.001);
    const buffer = await new GLTFExporter().parseAsync(output, { binary: true });
    const url = URL.createObjectURL(new Blob([buffer], { type: 'model/gltf-binary' }));
    const link = document.createElement('a'); link.href = url; link.download = `bos-strength-upright-${model.params.height}in.glb`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { setError(`Export failed: ${error.message}`); }
};
new ResizeObserver(() => { const { width, height } = viewport.getBoundingClientRect(); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); fit(); }).observe(viewport);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
update();
