import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGymWalls } from './gym-walls.ts';
import { ROOM_DEFAULTS } from '../../rack-generator/walls.ts';

test('walls appear only when needed, cut away toward the camera and rebuild only when the room moves', () => {
  const walls = createGymWalls(), camera = new THREE.PerspectiveCamera();
  walls.update(ROOM_DEFAULTS, false);
  assert.equal(walls.group.visible, false); assert.equal(walls.group.children.length, 0, 'nothing is built until shown');
  walls.update(ROOM_DEFAULTS, true);
  const built = [...walls.group.children];
  assert.deepEqual(built.map(g => g.name), ['Back wall slats', 'Left wall slats', 'Right wall slats', 'Front wall slats']);
  camera.position.set(3500, 2200, 3600); walls.follow(camera);
  assert.deepEqual(built.map(g => g.visible), [true, true, false, false], 'default iso view sees the back and left walls');
  walls.update(ROOM_DEFAULTS, true); assert.deepEqual(walls.group.children, built);
  // Slat faces sit on the mounting plane: the back wall's slats end at z = -1500.
  const box = new THREE.Box3().setFromObject(built[0]); assert.ok(Math.abs(box.max.z + 1500) < 1e-6 && Math.abs(box.max.y - 3000) < 1e-6);
  walls.update({ ...ROOM_DEFAULTS, back: 2000 }, true); assert.notEqual(walls.group.children[0], built[0]);
  walls.dispose(); walls.dispose(); assert.equal(walls.group.children.length, 0);
});
