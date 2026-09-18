import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAssembly, resolveAssembly } from '../../rack-generator/assembly.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { BuildAnimation, SETTLE, planBuild, type BuildPiece } from './build-animation.ts';

const piece = (id: string, part: string, kind: string, position = [0, 0, 1000], ownerId = id): BuildPiece => ({ id, part, kind, ownerId, position, mount: null });
const order = (pieces: BuildPiece[]) => planBuild(pieces).cues.sort((a, b) => a.start - b.start).map(c => c.id);

test('posts land first, then frame bottom-up, pull-up bars, accessories, floor items and unknown dressing kinds', () => {
  const pieces = [
    piece('bench', 'rep-nighthawk', 'floor-item', [0, -900, 0]),
    piece('upper', 'crossmember-725', 'structure', [0, 0, 1840]),
    piece('jcup', 'j-hook-standard', 'accessory'),
    piece('bar', 'olympic-barbell', 'barbell', [0, -500, 1100]),
    piece('pullup', 'pullup-straight', 'accessory'),
    piece('lower', 'crossmember-725', 'structure', [0, 0, 40]),
    piece('post-a', 'upright', 'structure', [-500, 0, 0]),
    piece('plate', 'plate-20', 'plates'),
    piece('post-b', 'upright', 'structure', [500, 0, 0]),
  ];
  assert.deepEqual(order(pieces), ['post-a', 'post-b', 'lower', 'upper', 'pullup', 'jcup', 'bench', 'bar', 'plate']);
  const plan = planBuild(pieces), byId = new Map(plan.cues.map(c => [c.id, c]));
  assert.deepEqual(['post-a', 'pullup', 'jcup', 'bench', 'bar', 'plate'].map(id => byId.get(id)!.pass), ['structure', 'structure', 'accessory', 'dressing', 'dressing', 'dressing']);
  assert.equal(byId.get('post-a')!.heavy, true);
  assert.equal(byId.get('jcup')!.heavy, false);
  assert.ok(byId.get('post-a')!.from[2] > 1000, 'posts drop from well above');
  assert.equal(byId.get('bench')!.glide, true, 'floor items slide in');
  assert.ok(byId.get('bench')!.from[1] < 0 && byId.get('bench')!.from[2] === 0, 'floor items slide away from the rack centre');
  assert.equal(byId.get('bar')!.glide, false, 'unknown raised dressing drops into place');
  assert.deepEqual([...plan.impacts], plan.cues.filter(c => c.heavy).map(c => c.start + c.duration).sort((a, b) => a - b));
});

test('the stock rack builds in 8–15 s with a staccato accessory pass and paired pieces sharing a beat', () => {
  for (const doc of [createAssembly(), applyPreset('generic-six')]) {
    const resolved = resolveAssembly(doc), plan = planBuild(resolved);
    assert.equal(plan.cues.length, resolved.length);
    assert.ok(plan.duration >= 8 && plan.duration <= 15, `duration ${plan.duration}`);
    assert.ok(plan.buildEnd < plan.duration - 3, 'the hero orbit finale follows the build');
    const lastPost = Math.max(...plan.cues.filter(c => resolved.find(r => r.id === c.id)!.part === 'upright').map(c => c.start));
    for (const c of plan.cues) if (resolved.find(r => r.id === c.id)!.part !== 'upright') assert.ok(c.start > lastPost);
    const accessories = plan.cues.filter(c => c.pass === 'accessory'), owners = [...new Set(accessories.map(c => resolved.find(r => r.id === c.id)!.ownerId))];
    const beats = owners.map(o => Math.min(...accessories.filter(c => resolved.find(r => r.id === c.id)!.ownerId === o).map(c => c.start)));
    for (let i = 1; i < beats.length; i++) { const gap = beats[i] - beats[i - 1]; assert.ok(gap >= 0.1 && gap <= 0.35, `accessory beat ${gap}`); }
    for (const o of owners) {
      const starts = accessories.filter(c => resolved.find(r => r.id === c.id)!.ownerId === o).map(c => c.start);
      assert.ok(Math.max(...starts) - Math.min(...starts) < 0.1, 'a pair lands together');
    }
  }
});

test('huge racks compress to the showcase ceiling and tiny ones still get the full hero orbit', () => {
  const many = Array.from({ length: 400 }, (_, i) => piece(`a${i}`, 'j-hook-standard', 'accessory'));
  const big = planBuild([piece('p', 'upright', 'structure'), ...many]);
  assert.ok(big.duration <= 15 + 1e-9, `duration ${big.duration}`);
  assert.equal(order([piece('p', 'upright', 'structure'), ...many])[0], 'p');
  assert.equal(planBuild([piece('p', 'upright', 'structure')]).duration, 8);
  assert.equal(planBuild([]).cues.length, 0);
});

test('playback animates pieces and camera, then finish restores poses, materials and the camera exactly', () => {
  const pieces = [piece('p', 'upright', 'structure', [0, 0, 0]), piece('j', 'j-hook-standard', 'accessory', [0, -400, 1100])];
  const groups = new Map<string, THREE.Object3D>(), materials: THREE.MeshStandardMaterial[] = [];
  for (const p of pieces) {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ emissive: '#102030' });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(), m)); g.position.set(p.position[0], p.position[1], p.position[2]); g.scale.set(1, 2, 3);
    groups.set(p.id, g); materials.push(m);
  }
  const camera = new THREE.PerspectiveCamera(), target = new THREE.Vector3(0, 900, 0);
  camera.position.set(3000, 2500, 3500); camera.lookAt(target);
  const position = camera.position.clone(), quaternion = camera.quaternion.clone(), emissive = materials[0].emissive.clone();
  const plan = planBuild(pieces), animation = new BuildAnimation(plan, groups, camera, target, new THREE.Vector3(0, 1000, 0));
  const post = plan.cues.find(c => c.id === 'p')!, cup = plan.cues.find(c => c.id === 'j')!;
  assert.equal(animation.update(0), true);
  assert.equal(groups.get('p')!.visible, false, 'the gym starts empty');
  assert.ok(camera.position.distanceTo(target) < position.distanceTo(target), 'camera starts close');
  assert.ok(camera.position.y < position.y, 'camera starts low');
  animation.update(post.start + post.duration / 2);
  assert.equal(groups.get('p')!.visible, true);
  assert.ok(groups.get('p')!.position.z > 0, 'post is mid-drop');
  animation.update(post.start + post.duration + SETTLE * 0.05);
  assert.notEqual(groups.get('p')!.scale.z, 3, 'impact squash');
  assert.notDeepEqual(materials[0].emissive.toArray(), emissive.toArray(), 'impact flash');
  assert.equal(groups.get('j')!.visible, cup.start <= post.start + post.duration + SETTLE * 0.05);
  const mid = camera.position.clone();
  animation.update(plan.duration / 2);
  assert.ok(camera.position.distanceTo(mid) > 100, 'camera orbits');
  assert.equal(animation.update(plan.duration), false);
  assert.ok(camera.position.distanceTo(position) < 1e-6, 'orbit lands on the user view');
  animation.update(post.start + post.duration + SETTLE * 0.05);
  animation.finish();
  assert.deepEqual(camera.position.toArray(), position.toArray());
  assert.deepEqual(camera.quaternion.toArray(), quaternion.toArray());
  for (const p of pieces) {
    const g = groups.get(p.id)!;
    assert.equal(g.visible, true);
    assert.deepEqual(g.position.toArray(), p.position);
    assert.deepEqual(g.scale.toArray(), [1, 2, 3]);
  }
  assert.deepEqual(materials[0].emissive.toArray(), emissive.toArray());
  assert.deepEqual(target.toArray(), [0, 900, 0], 'the user orbit target is never mutated');
});
