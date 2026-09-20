import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { RoomMaterials, createRoomScenery, turfLineGeometry } from './room-scenery.ts';
import { createGymWalls, wallRects } from './gym-walls.ts';
import { defineWallPart, registerWallPart } from '../../rack-generator/wall-registry.ts';
import { wallOpenings } from '../../rack-generator/wall-items.ts';
import type { RackDoc } from '../../rack-generator/types.ts';
import { createGymFloor } from './gym-floor.ts';
import { ROOM_DEFAULTS, validateRoom, type Room } from '../../rack-generator/walls.ts';
import { FLOOR_FINISHES, WALL_FINISHES } from '../../rack-generator/room-finishes.ts';

/** Canvas stand-in: the procedural textures only need 2D calls to succeed. */
function withCanvas(run: () => void) {
  const context = new Proxy({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, { get: (t, k) => k in t ? t[k as 'createImageData'] : () => {}, set: () => true });
  const g = globalThis as { document?: unknown };
  g.document = { createElement: () => ({ getContext: () => context }) };
  try { run(); } finally { delete g.document; }
}
const coop = JSON.parse(fs.readFileSync(new URL('../gyms/data/coop-garage-gym-reviews.json', import.meta.url), 'utf8')).doc.room as Room;
const lit = (room: Partial<Room> = {}): Room => validateRoom({ ...ROOM_DEFAULTS, ceiling: { lights: { count: 3, along: 'x' } }, ...room })!;

test('the ceiling never blocks the default views: hidden from outside or above, never between camera and rack', () => withCanvas(() => {
  const views: Record<string, [number, number, number]> = { iso: [1, 0.65, 1.2], front: [0, 0, 1], side: [1, 0, 0], top: [0, 1, 0.0001] };
  for (const room of [lit(), lit({ height: 2100 }), coop]) {
    const scenery = createRoomScenery(new RoomMaterials()), camera = new THREE.PerspectiveCamera(35, 1.5, 1, 40000);
    scenery.update(room);
    const ceiling = scenery.group.getObjectByName('Ceiling') as THREE.Mesh;
    assert.ok(ceiling, 'the ceiling is built');
    // It faces down into the room, so from above it is back-face culled as well as hidden.
    assert.equal((ceiling.material as THREE.Material).side, THREE.FrontSide);
    assert.ok(ceiling.geometry.getAttribute('normal').array.every((v, i) => i % 3 !== 1 || v === -1));
    // Rack bounds (a rack as tall as the room allows, in the middle) and every fitted distance the builder's fit can produce.
    const top = Math.min(2300, room.height - 50), rack = [[-700, 0, -600], [700, top, 600]], centre = new THREE.Vector3(0, top / 2, 0);
    for (const [name, direction] of Object.entries(views)) for (let distance = 1500; distance <= 40000; distance *= 1.25) {
      camera.position.copy(centre).addScaledVector(new THREE.Vector3(...direction).normalize(), distance);
      scenery.follow(camera);
      if (!scenery.ceilingVisible) continue;
      // Visible only from inside and below it: then no sight line to the rack crosses the ceiling plane.
      assert.ok(camera.position.y < room.height, `${name} at ${Math.round(distance)} mm sees the ceiling only from below`);
      for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) {
        const corner = new THREE.Vector3(rack[x][0], rack[y][1], rack[z][2]);
        assert.ok(Math.max(camera.position.y, corner.y) < room.height, `${name}: sight line to the rack stays under the ceiling`);
      }
    }
    camera.position.set(3500, 2200, 3600); scenery.follow(camera);
    if (room === coop) assert.equal(scenery.ceilingVisible, true, 'inside Coop\'s long room the default iso camera looks up at his lights');
    camera.position.set(0, room.height + 500, 0); scenery.follow(camera);
    assert.equal(scenery.ceilingVisible, false, 'above the room it is hidden');
    camera.position.set(ROOM_DEFAULTS.right + room.right + 5000, 1500, 0); scenery.follow(camera);
    assert.equal(scenery.ceilingVisible, false, 'outside the room it is hidden');
    camera.position.set(0, 1500, 0); scenery.follow(camera);
    assert.equal(scenery.ceilingVisible, true, 'inside the room it shows');
    scenery.dispose();
  }
}));

/** Everything that decides a shader program for these surfaces. */
const signature = (mesh: THREE.Mesh) => {
  const m = mesh.material as THREE.MeshStandardMaterial;
  return [m.type, !!m.map, m.side, mesh instanceof THREE.InstancedMesh, m.transparent, m.vertexColors, !!m.emissiveMap, !!m.normalMap, !!m.roughnessMap, m.fog].join('|');
};
test('every room surface uses a prewarmed program variant, and finish changes rebuild only what changed', () => withCanvas(() => {
  const materials = new RoomMaterials(), walls = createGymWalls(materials), scenery = createRoomScenery(materials), floor = createGymFloor(8);
  const standIns = materials.standIns(), warmed = new Set(standIns.materials.map(([m, instanced]) => signature(instanced ? new THREE.InstancedMesh(new THREE.BoxGeometry(), m, 1) : new THREE.Mesh(new THREE.BoxGeometry(), m))));
  const seen = new Set<string>(), collect = (root: THREE.Object3D) => root.traverse(o => { if (o instanceof THREE.Mesh) seen.add(signature(o)); });
  for (const finish of WALL_FINISHES) { walls.update(validateRoom({ ...ROOM_DEFAULTS, walls: { finish } })!, true); collect(walls.group); }
  scenery.update(lit({ turf: [{ position: [0, 1000], size: [1800, 4000], lines: true, text: 'PLAE' }] })); collect(scenery.group);
  assert.ok(scenery.group.getObjectByName('Turf lane 1 PLAE'), 'the stencil is drawn');
  for (const finish of FLOOR_FINISHES) { floor.update(ROOM_DEFAULTS, finish); collect(floor.room); }
  collect(floor.mesh);
  for (const s of seen) assert.ok(warmed.has(s), `prewarm covers ${s}`);
  // Paint is a uniform: a colour change keeps the built walls; a finish or wainscot change rebuilds them.
  const painted = validateRoom({ ...ROOM_DEFAULTS, walls: { finish: 'wainscot', color: '#ffffff' } })!;
  walls.update(painted, true);
  const built = [...walls.group.children];
  assert.deepEqual(built.map(w => w.name), ['Back wall wainscot', 'Left wall wainscot', 'Right wall wainscot', 'Front wall wainscot']);
  walls.update({ ...painted, walls: { finish: 'wainscot', color: '#27354a' } }, true);
  assert.deepEqual(walls.group.children, built);
  assert.equal(materials.paint.back.color.getHexString(), new THREE.Color('#27354a').getHexString());
  walls.update({ ...painted, walls: { finish: 'wainscot', color: '#27354a', wainscot: 900 } }, true);
  assert.notEqual(walls.group.children[0], built[0]);
  // The same ceiling and turf are not rebuilt.
  const lanes = scenery.group.getObjectByName('Turf lanes')!, ceiling = scenery.group.getObjectByName('Room ceiling')!, before = [...lanes.children, ...ceiling.children];
  scenery.update(lit({ turf: [{ position: [0, 1000], size: [1800, 4000], lines: true, text: 'PLAE' }] }));
  assert.deepEqual([...lanes.children, ...ceiling.children], before);
  assert.equal(ceiling.children.filter(o => o.name.startsWith('Linear LED')).length, 6, 'a housing and a lens per row');
  // Floor: black rubber is the ground itself; other finishes cover just the room.
  floor.update(ROOM_DEFAULTS, 'grey-fleck');
  const box = new THREE.Box3().setFromObject(floor.room);
  assert.equal(floor.room.visible, true);
  assert.deepEqual([box.min.x, box.max.x, box.min.z, box.max.z], [-ROOM_DEFAULTS.left, ROOM_DEFAULTS.right, -ROOM_DEFAULTS.back, ROOM_DEFAULTS.front]);
  assert.equal(floor.update(ROOM_DEFAULTS, 'grey-fleck'), false, 'no change, no work');
  floor.update(ROOM_DEFAULTS, 'black-rubber'); assert.equal(floor.room.visible, false);
  standIns.release(); walls.dispose(); scenery.dispose(); floor.dispose(); materials.dispose();
}));

test('turf hash marks run across the lane every metre, inside both long edges', () => {
  for (const lane of [{ position: [0, 0], size: [1850, 10000] }, { position: [0, 0], size: [10000, 1850] }] as const) {
    const geometry = turfLineGeometry({ position: [...lane.position], size: [...lane.size] });
    assert.equal(geometry.getIndex()!.count / 6, 20, 'ten marks a side on a 10 m lane');
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox!, across = lane.size[0] < lane.size[1] ? [min.x, max.x] : [min.z, max.z];
    assert.ok(across[0] > -lane.size[0] / 2 - 1 && Math.abs(across[1]) < Math.min(...lane.size) / 2, 'inside the lane');
    geometry.dispose();
  }
});

test('per-wall finishes, and wall items that declare an opening cut a hole through every finish', () => withCanvas(() => {
  registerWallPart(defineWallPart({ id: 'test-window', name: 'Test window', title: 'Test window', noun: 'window', params: [], face: { width: 1000, height: 1200 }, depth: 60, opening: true }));
  const base = validateRoom({ ...ROOM_DEFAULTS, walls: { finish: 'drywall', overrides: { left: { finish: 'wainscot', color: '#27354a' }, right: { finish: 'slat' }, front: { finish: 'birch' } } } })!;
  const doc = { room: base, wallItems: [
    { id: 'wall-1', part: 'test-window', wall: 'back', position: [500, 1400], params: {} },
    { id: 'wall-2', part: 'test-window', wall: 'left', position: [0, 1400], params: {} },
    { id: 'wall-3', part: 'test-window', wall: 'right', position: [0, 1400], params: {} },
    { id: 'wall-4', part: 'test-window', wall: 'front', position: [0, 2600], params: {} },
    { id: 'wall-5', part: 'pegboard-panel', wall: 'front', position: [0, 1000], params: { width: 1219 } },
  ] } as unknown as Pick<RackDoc, 'room' | 'wallItems'>;
  const openings = wallOpenings(doc);
  assert.deepEqual(openings.map(o => [o.id, o.wall, o.min, o.max]), [
    ['wall-1', 'back', [0, 800], [1000, 2000]], ['wall-2', 'left', [-500, 800], [500, 2000]],
    ['wall-3', 'right', [-500, 800], [500, 2000]], ['wall-4', 'front', [-500, 2000], [500, 3000]],
  ], 'a pegboard cuts nothing; an opening is clipped to its wall');
  const materials = new RoomMaterials(), walls = createGymWalls(materials);
  walls.update(base, true, openings);
  assert.deepEqual(walls.group.children.map(w => w.name), ['Back wall drywall', 'Left wall wainscot', 'Right wall slats', 'Front wall birch']);
  assert.equal(materials.paint.left.color.getHexString(), new THREE.Color('#27354a').getHexString(), 'each wall has its own paint');
  assert.equal(materials.paint.back.color.getHexString(), new THREE.Color('#f2f1ec').getHexString());
  walls.group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), hit = (from: THREE.Vector3, to: THREE.Vector3) => { ray.set(from, to.clone().sub(from).normalize()); return ray.intersectObjects(walls.group.children, true).length > 0; };
  const inside = new THREE.Vector3(0, 1400, 750); // The side walls' centres sit at z = 750 (back 1500, front 3000).
  assert.equal(hit(inside, new THREE.Vector3(500, 1400, -1500)), false, 'drywall: through the window');
  assert.equal(hit(inside, new THREE.Vector3(-1500, 1400, -1500)), true, 'drywall: beside it');
  assert.equal(hit(inside, new THREE.Vector3(-3000, 1400, 750)), false, 'wainscot: through the window');
  assert.equal(hit(inside, new THREE.Vector3(-3000, 500, 750)), true, 'wainscot: below it');
  assert.equal(hit(inside, new THREE.Vector3(3000, 1400, 750)), false, 'slats stop at the window');
  assert.equal(hit(inside, new THREE.Vector3(3000, 2500, 750)), true, 'and carry on above it');
  assert.equal(hit(inside, new THREE.Vector3(0, 2500, 3000)), false, 'birch: an opening to the ceiling line');
  // Moving a window rebuilds its wall; the same openings do not.
  const built = walls.group.children[0];
  walls.update(base, true, openings); assert.equal(walls.group.children[0], built);
  walls.update(base, true, openings.slice(1)); assert.notEqual(walls.group.children[0], built);
  walls.dispose(); materials.dispose();
  assert.deepEqual(wallRects(3000, 0, 2000, []), [{ min: [-1500, 0], max: [1500, 2000] }], 'no openings: one panel, as before');
}));
