import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAssembly, resolveAssembly, addAccessory, moveAccessory, removeInstance, resizeAssembly, getMounts, validateAssembly, restoreInstance } from './assembly.js';
import { detectCollisions } from './assembly-collisions.js';

const $ = (s) => document.querySelector(s);
const viewport = $('#viewport');
const STORAGE = 'bos-strength-assembly-v1';
const CORE = ['upright', 'crossmember-725', 'pullup-straight', 'pullup-multigrip', 'pullup-sphere', 'j-hook-standard', 'j-hook-roller', 'j-hook-sandwich', 'safety-box', 'safety-pin-pipe', 'safety-webbing'];
let doc = createAssembly(), selected = null, definitions = [], resolved = [], generation = 0, loading = false;
let placing = null, previewTarget = null, previewSerial = 0, view = 'iso', hasFit = false;
const undo = [], redo = [], instances = new Map();
function status(message, error = false) { $('#status').textContent = message; $('#status').classList.toggle('error', error); }
function safeLoad() {
  try { const saved = localStorage.getItem(STORAGE); if (saved) { const parsed = JSON.parse(saved); validateAssembly(parsed); doc = parsed; } }
  catch { status('Saved design could not be opened. Started a new rack.', true); }
}
safeLoad();
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9ede7');
scene.add(new THREE.HemisphereLight(0xffffff, 0x899383, 2.6));
for (const p of [[2500, 4500, 2200], [-2500, 1800, -2000]]) { const l = new THREE.DirectionalLight(0xffffff, 3); l.position.set(...p); scene.add(l); }
const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.append(renderer.domElement); renderer.domElement.setAttribute('aria-label', 'Rack assembly: drag to orbit, click a part to edit');
const camera = new THREE.PerspectiveCamera(35, 1, 1, 40000);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, .04).texture; room.dispose(); pmrem.dispose();
const assemblyRoot = new THREE.Group(), ghostRoot = new THREE.Group(), mountsRoot = new THREE.Group();
for (const root of [assemblyRoot, ghostRoot, mountsRoot]) { root.rotation.x = -Math.PI / 2; scene.add(root); }
const grid = new THREE.GridHelper(10000, 200, '#b4c0b1', '#d6ded2'); grid.position.y = -.5; scene.add(grid);
let selectionBox;
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
let mountPoints = [];

// One request per unique geometry; movement only updates instance transforms.
const worker = new Worker(new URL('./library-worker.js', import.meta.url), {type: 'module'});
const pending = new Map(), cache = new Map(); let requestId = 0;
worker.onmessage = ({data}) => {
  if (data.type === 'catalog') { definitions = data.definitions; renderCatalog(); rebuild(); return; }
  const request = pending.get(data.id); if (!request) return; pending.delete(data.id);
  if (data.type === 'error') request.reject(new Error(data.error));
  else {
    const model = new THREE.Group();
    for (const m of data.meshes) {
      const positions = new Float32Array(m.positions.length / m.stride * 3);
      for (let i = 0; i < positions.length / 3; i++) for (let j = 0; j < 3; j++) positions[i * 3 + j] = m.positions[i * m.stride + j];
      const indexed = new THREE.BufferGeometry(); indexed.setAttribute('position', new THREE.BufferAttribute(positions, 3)); indexed.setIndex(new THREE.BufferAttribute(m.indices, 1));
      const geometry = toCreasedNormals(indexed, Math.PI / 5); indexed.dispose();
      const material = new THREE.MeshStandardMaterial({color: m.color || '#283e32', metalness: m.metalness ?? .55, roughness: m.roughness ?? .4});
      const mesh = new THREE.Mesh(geometry, material); mesh.name = m.name; model.add(mesh);
    }
    request.resolve(model);
  }
};
worker.onerror = (error) => { for (const p of pending.values()) p.reject(new Error(error.message)); pending.clear(); status('Geometry worker failed. Reload to retry.', true); };
function geometryFor(instance) {
  const key = instance.part + ':' + JSON.stringify(Object.fromEntries(Object.entries(instance.params).sort(([a],[b]) => a.localeCompare(b))));
  if (!cache.has(key)) {
    cache.set(key, new Promise((resolve, reject) => { const id = ++requestId; pending.set(id, {resolve, reject}); worker.postMessage({id, part: instance.part, params: instance.params}); }).catch(error => { cache.delete(key); throw error; }));
  }
  return cache.get(key);
}
const nameOf = (part) => definitions.find(d => d.id === part)?.name.replace(/^BOS STRENGTH\s*/, '') || part;
function transformed(model, entry) { const g = model.clone(); g.position.set(...entry.position); g.rotation.set(...entry.rotation); g.userData = {id: entry.id, ownerId: entry.ownerId || entry.id}; return g; }
function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(doc)); } catch { status('Browser storage is full. Save your design as JSON.', true); } }
function commit(next) {
  validateAssembly(next); undo.push(structuredClone(doc)); if (undo.length > 100) undo.shift(); redo.length = 0;
  doc = next; cancelPlacement(); persist(); rebuild();
}
function act(action) { try { action(); } catch (e) { status(e.message, true); } }
async function rebuild() {
  const serial = ++generation; loading = true; $('#export').disabled = true;
  try {
    resolved = resolveAssembly(doc); renderEditor(); renderList(); renderDimensions();
    $('#undo').disabled = !undo.length; $('#redo').disabled = !redo.length;
    status('Building your rack…');
    const built = await Promise.all(resolved.map(async r => transformed(await geometryFor(r), r)));
    if (serial !== generation) return;
    assemblyRoot.clear(); instances.clear();
    for (const g of built) { assemblyRoot.add(g); instances.set(g.userData.id, g); }
    scene.updateMatrixWorld(true); refreshSelection();
    loading = false; $('#export').disabled = !built.length;
    const warnings = detectCollisions(resolved); renderWarnings(warnings);
    status(warnings.length ? `${warnings.length} placement warning${warnings.length === 1 ? '' : 's'} · ${resolved.length} parts` : `${resolved.length} parts · All connections aligned · Saved locally`);
    if (!hasFit) { fit(); hasFit = true; }
  } catch (e) { if (serial !== generation) return; loading = false; status(e.message, true); }
}
function renderWarnings(warnings) {
  let panel = $('#warnings'); if (!panel) { panel = document.createElement('div'); panel.id = 'warnings'; $('#inspector').after(panel); }
  panel.replaceChildren();
  for (const w of warnings) { const b = document.createElement('button'); b.className = 'warning-item'; b.textContent = '△ ' + w.message; b.onclick = () => select(w.ids[0]); panel.append(b); }
}
function renderDimensions() { $('#dimensions').textContent = `${Math.round(doc.rack.width + 2 * doc.rack.tube)} W × ${Math.round(doc.rack.depth + 2 * doc.rack.tube)} D × ${Math.round(doc.rack.height)} H mm`; }
function select(id) { selected = id; cancelPlacement(); renderEditor(); refreshSelection(); }
function refreshSelection() {
  if (selectionBox) { scene.remove(selectionBox); selectionBox.geometry.dispose(); selectionBox.material.dispose(); selectionBox = null; }
  const box = new THREE.Box3();
  for (const g of instances.values()) if (g.userData.ownerId === selected || g.userData.id === selected) box.union(new THREE.Box3().setFromObject(g));
  if (!box.isEmpty()) { selectionBox = new THREE.Box3Helper(box.expandByScalar(5), '#c77c36'); scene.add(selectionBox); }
}
function makeField(label, input) { const el = document.createElement('label'); el.className = 'field'; const span = document.createElement('span'); span.textContent = label; el.append(span, input); return el; }
function numberInput(name, value, min, max, step = 1) { const i = document.createElement('input'); Object.assign(i, {type: 'number', name, value, min, max, step}); return i; }
function selectInput(name, options, value) { const s = document.createElement('select'); s.name = name; for (const [v, label] of options) { const o = document.createElement('option'); o.value = v; o.textContent = label; s.append(o); } s.value = value; return s; }
function renderEditor() {
  const frame = $('#frame-form'), inspector = $('#inspector'); inspector.replaceChildren();
  const entry = doc.accessories.find(a => a.id === selected);
  const physical = resolved.find(a => a.id === selected || a.ownerId === selected);
  if (!entry && !physical) selected = null;
  frame.hidden = !!selected; inspector.hidden = !selected;
  $('#selection-title').textContent = selected ? nameOf((entry || physical).part) : 'Rack settings';
  frame.elements.heightIn.value = Number((doc.rack.height / 25.4).toFixed(2)); frame.elements.width.value = doc.rack.width; frame.elements.depth.value = doc.rack.depth;
  if (!selected) return;
  const form = document.createElement('form'); form.className = 'selection-form';
  if (entry) {
    const category = entry.part.startsWith('j-hook') ? 'j-hook' : entry.part.startsWith('safety') ? 'safety' : 'pullup';
    const variant = selectInput('variant', CORE.filter(id => id.startsWith(category)).map(id => [id, nameOf(id)]), entry.part);
    const upright = selectInput('upright', ['front-left','front-right','rear-left','rear-right'].filter(id => resolved.some(r => r.id === id)).map(id => [id, id.replaceAll('-', ' ')]), entry.target.uprightId);
    const face = selectInput('face', ['front','back','left','right'].map(f => [f,f]), entry.target.face || 'front');
    const hole = numberInput('hole', entry.target.hole + 1, 1, Math.floor((doc.rack.height - doc.rack.firstHole) / doc.rack.pitch) + 1);
    const pair = document.createElement('input'); pair.type = 'checkbox'; pair.name = 'paired'; pair.checked = entry.paired;
    form.append(makeField('Variant', variant), makeField('Mounting upright', upright), makeField('Mounting face', face), makeField('Hole number', hole), makeField('Matching pair', pair));
    const height = document.createElement('p'); height.className = 'note'; height.textContent = `Mount height ${doc.rack.firstHole + entry.target.hole * doc.rack.pitch} mm`; form.append(height);
    const apply = document.createElement('button'); apply.className = 'primary'; apply.textContent = 'Apply placement'; form.append(apply);
    form.onsubmit = e => { e.preventDefault(); act(() => {
      let next = structuredClone(doc); const item = next.accessories.find(a => a.id === selected); item.part = variant.value; item.params = {};
      next = moveAccessory(next, selected, {uprightId: upright.value, face: face.value, hole: Number(hole.value) - 1}, pair.checked); commit(next);
    }); };
    const move = document.createElement('button'); move.type = 'button'; move.textContent = 'Move in 3D ↗'; move.onclick = () => startPlacement(entry.part, entry.id); form.append(move);
  } else {
    const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Connected frame member. Change rack dimensions to resize the frame. Removing an upright also removes accessories attached to it.'; form.append(p);
  }
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Remove part'; remove.onclick = () => act(() => { const next = removeInstance(doc, selected); selected = null; commit(next); }); form.append(remove); inspector.append(form);
}
function renderCatalog() {
  const catalog = $('#catalog'); catalog.replaceChildren(); const term = $('#search').value.toLowerCase();
  const families = [['Frame', ['upright','crossmember-725']], ['Pull-up bars', CORE.filter(id => id.startsWith('pullup'))], ['J-hooks', CORE.filter(id => id.startsWith('j-hook'))], ['Safeties', CORE.filter(id => id.startsWith('safety'))]];
  for (const [label, ids] of families) {
    const matches = ids.filter(id => nameOf(id).toLowerCase().includes(term)); if (!matches.length) continue;
    const h = document.createElement('h3'); h.textContent = label; catalog.append(h);
    for (const id of matches) {
      const b = document.createElement('button'); b.className = 'part-card'; b.draggable = !['upright','crossmember-725'].includes(id); b.dataset.part = id;
      const thumb = document.createElement('span'); thumb.className = 'thumb'; thumb.setAttribute('aria-hidden','true');
      thumb.innerHTML = partIcon(id);
      const text = document.createElement('span'); text.textContent = nameOf(id); const plus = document.createElement('span'); plus.className = 'part-plus'; plus.textContent = '+'; b.append(thumb, text, plus);
      b.onclick = () => startPlacement(id);
      b.ondragstart = e => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'copy'; startPlacement(id); };
      catalog.append(b);
    }
  }
}
function partIcon(id) {
  const path = id === 'upright' ? '<path d="M21 6h10v44H21z"/><path d="M26 12v2m0 6v2m0 6v2m0 6v2m0 6v2M15 50h22"/>' : id.startsWith('j-hook') ? '<path d="M17 9h10v28h16v-8h5v16H17z"/>' : id.includes('sphere') ? '<path d="M8 24h40M17 24v12m22-12v12"/><circle cx="17" cy="40" r="6"/><circle cx="39" cy="40" r="6"/>' : id.includes('multigrip') ? '<path d="M6 32h10l7-12h13l7 12h7M17 32h22M25 20v12m8-12v12"/>' : id.includes('webbing') ? '<path d="M8 18v20m40-20v20M9 26q20 24 38 0"/>' : '<path d="M8 18v24m40-24v24M9 27h38v7H9z"/>';
  return `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
function renderList() {
  const target = $('#parts-list'); target.replaceChildren(); const groups = new Map();
  for (const r of resolved) { const key = r.part + JSON.stringify(r.params); if (!groups.has(key)) groups.set(key, {r, count: 0}); groups.get(key).count++; }
  for (const {r, count} of groups.values()) {
    const row = document.createElement('button'); row.className = 'bom-row'; row.textContent = `${count} × ${nameOf(r.part)}${r.params.length ? ' · ' + Math.round(r.params.length) + ' mm' : r.part === 'upright' ? ' · ' + Math.round(doc.rack.height) + ' mm' : ''}`; row.onclick = () => select(r.ownerId || r.id); target.append(row);
  }
}
function showMounts() {
  mountsRoot.clear(); mountPoints = getMounts(doc);
  const geo = new THREE.SphereGeometry(6, 8, 6), material = new THREE.MeshBasicMaterial({color: '#d28a40', depthTest: false, transparent: true, opacity: .65});
  const dots = new THREE.InstancedMesh(geo, material, mountPoints.length), matrix = new THREE.Matrix4();
  mountPoints.forEach((m,i) => dots.setMatrixAt(i, matrix.makeTranslation(...m.position))); dots.renderOrder = 5; mountsRoot.add(dots);
}
function clearGhost() { ghostRoot.traverse(o => { if (o.isMesh) o.material.dispose(); }); ghostRoot.clear(); }
function cancelPlacement() {
  placing = null; previewTarget = null; previewSerial++; clearGhost();
  mountsRoot.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); mountsRoot.clear(); mountPoints = [];
  $('#placement-hint').hidden = true; controls.enabled = true; renderer.domElement.style.cursor = '';
}
function startPlacement(part, movingId = null) {
  if (part === 'upright' || part === 'crossmember-725') {
    const available = resolveAssembly(createAssembly({rack: doc.rack})).filter(r => part === 'upright' ? r.part === 'upright' : r.part.startsWith('crossmember'));
    const missing = available.filter(r => !resolved.some(x => x.id === r.id));
    if (!missing.length) { select(null); status('All frame slots are filled. Select a frame member to remove it, or edit the rack dimensions.'); return; }
    const menu = $('#inspector'); select(null); menu.hidden = false; $('#selection-title').textContent = 'Restore frame member';
    for (const r of missing) { const button = document.createElement('button'); button.textContent = 'Add ' + r.id.replaceAll('-', ' '); button.onclick = () => act(() => commit(restoreInstance(doc, r.id))); menu.append(button); }
    return;
  }
  cancelPlacement(); placing = {part, movingId}; showMounts(); $('#placement-hint').hidden = false;
  let text = $('#placement-text'); if (!text) { text = document.createElement('span'); text.id = 'placement-text'; $('#placement-hint').prepend(text); }
  text.textContent = `${movingId ? 'Move' : 'Place'} ${nameOf(part)} · choose a highlighted hole`;
  renderer.domElement.style.cursor = 'crosshair';
}
function nearestMount(event) {
  const rect = renderer.domElement.getBoundingClientRect(); let best = null, distance = 28;
  scene.updateMatrixWorld(true);
  for (const mount of mountPoints) {
    const point = mountsRoot.localToWorld(new THREE.Vector3(...mount.position)).project(camera); if (point.z > 1 || point.z < -1) continue;
    const d = Math.hypot(rect.left + (point.x + 1) * rect.width / 2 - event.clientX, rect.top + (1 - point.y) * rect.height / 2 - event.clientY);
    if (d < distance) { distance = d; best = mount; }
  }
  return best;
}
function placementDoc(target) {
  const mount = {uprightId: target.uprightId, face: target.face, hole: target.hole};
  return placing.movingId ? moveAccessory(doc, placing.movingId, mount, $('#paired').checked) : addAccessory(doc, placing.part, mount, $('#paired').checked);
}
async function updatePreview(event) {
  if (!placing) return;
  const target = nearestMount(event); if (JSON.stringify(target) === JSON.stringify(previewTarget)) return;
  previewTarget = target; const serial = ++previewSerial; clearGhost(); if (!target) return;
  try {
    const next = placementDoc(target); const all = resolveAssembly(next);
    const nextId = placing.movingId || next.accessories[next.accessories.length - 1].id;
    const entries = all.filter(r => (r.ownerId || r.id) === nextId);
    $('#placement-text').textContent = `${target.uprightId.replaceAll('-', ' ')} · ${target.face} · Hole ${target.hole + 1} · ${Math.round(target.position[2])} mm · Click to place`;
    const models = await Promise.all(entries.map(async r => transformed(await geometryFor(r), r)));
    if (serial !== previewSerial || !placing) return;
    for (const g of models) { g.traverse(o => { if (o.isMesh) o.material = new THREE.MeshStandardMaterial({color: '#c68b45', transparent: true, opacity: .48, depthWrite: false}); }); ghostRoot.add(g); }
  } catch(e) { if (serial === previewSerial) { previewTarget = null; $('#placement-text').textContent = e.message; } }
}
function dropPlacement(event) { if (!placing) return; const target = nearestMount(event); if (!target) { status('Choose a highlighted mounting hole. Escape cancels placement.'); return; } act(() => { const next = placementDoc(target); selected = placing.movingId || next.accessories[next.accessories.length - 1].id; commit(next); }); }
let pointerDown = null;
renderer.domElement.addEventListener('pointerdown', e => { pointerDown = [e.clientX, e.clientY]; if (placing && e.button === 0) controls.enabled = false; });
renderer.domElement.addEventListener('pointermove', updatePreview);
renderer.domElement.addEventListener('pointerup', e => {
  controls.enabled = true; if (e.button !== 0 || !pointerDown || Math.hypot(e.clientX-pointerDown[0], e.clientY-pointerDown[1]) > 6) return;
  if (placing) { dropPlacement(e); return; }
  const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX-r.left)/r.width*2-1, -(e.clientY-r.top)/r.height*2+1); raycaster.setFromCamera(pointer,camera);
  const hit = raycaster.intersectObject(assemblyRoot,true)[0]; let g = hit?.object; while (g && !g.userData.ownerId) g = g.parent; select(g?.userData.ownerId || null);
});
viewport.addEventListener('dragover', e => { e.preventDefault(); if (placing) updatePreview(e); });
viewport.addEventListener('drop', e => { e.preventDefault(); dropPlacement(e); });
function fit(mode = view) {
  view = mode; const box = new THREE.Box3().setFromObject(assemblyRoot); if (box.isEmpty()) box.set(new THREE.Vector3(-600,0,-500), new THREE.Vector3(600,doc.rack.height,500));
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const directions = {iso: [1,.65,1.2],front:[0,0,1],side:[1,0,0],top:[0,1,.0001]};
  const direction = new THREE.Vector3(...directions[mode]).normalize();
  const distance = Math.max(size.y, size.x / camera.aspect, size.z / camera.aspect) / (2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))) * 1.6;
  camera.position.copy(center).addScaledVector(direction,distance); controls.target.copy(center); controls.update();
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('selected', b.dataset.view === mode); b.classList.toggle('active', b.dataset.view === mode); });
}
new ResizeObserver(() => { const {width,height} = viewport.getBoundingClientRect(); renderer.setSize(width,height); camera.aspect = width/height; camera.updateProjectionMatrix(); }).observe(viewport);
function animate() { requestAnimationFrame(animate); controls.update(); camera.near = Math.max(.5,camera.position.distanceTo(controls.target)/200); camera.updateProjectionMatrix(); renderer.render(scene,camera); } animate();
$('#frame-form').onsubmit = e => { e.preventDefault(); const f=e.currentTarget; act(() => commit(resizeAssembly(doc,{height:Number(f.elements.heightIn.value)*25.4,width:Number(f.elements.width.value),depth:Number(f.elements.depth.value)}))); };
$('#search').oninput=renderCatalog; $('#deselect').onclick=()=>select(null); $('#cancel-placement').onclick=cancelPlacement;
$('#paired').onchange=()=>{ previewTarget=null; previewSerial++; clearGhost(); };
$('#fit').onclick=()=>fit(); document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit(b.dataset.view));
function history(direction) { const source=direction==='undo'?undo:redo,target=direction==='undo'?redo:undo; if (!source.length) return; target.push(structuredClone(doc)); doc=source.pop(); cancelPlacement(); persist(); rebuild(); }
$('#undo').onclick=()=>history('undo'); $('#redo').onclick=()=>history('redo');
document.addEventListener('keydown',e=>{ if(e.key==='Escape')cancelPlacement(); if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return; if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey?'redo':'undo');} if((e.key==='Delete'||e.key==='Backspace')&&selected){e.preventDefault();act(()=>{const next=removeInstance(doc,selected);selected=null;commit(next);});} });
function download(blob,filename){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#save').onclick=()=>download(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),'bos-strength-rack.json');
$('#load').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2_000_000)throw new Error('Design file is too large.');const next=JSON.parse(await file.text());validateAssembly(next);resolveAssembly(next);selected=null;commit(next);}catch(error){status('Could not load design: '+error.message,true);}finally{e.target.value='';}};
$('#export').onclick=async()=>{if(loading)return;try{const output=assemblyRoot.clone();output.name='BOS STRENGTH rack';output.scale.setScalar(.001);const data=await new GLTFExporter().parseAsync(output,{binary:true});download(new Blob([data],{type:'model/gltf-binary'}),'bos-strength-rack.glb');status('Rack exported as GLB.');}catch(error){status('Export failed: '+error.message,true);}};
$('#parts-toggle').onclick=()=>{$('#parts-drawer').hidden=!$('#parts-drawer').hidden;$('#parts-toggle').setAttribute('aria-expanded',String(!$('#parts-drawer').hidden));};
$('#reset-design').onclick=()=>{selected=null;commit(createAssembly());fit();};
