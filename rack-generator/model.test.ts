import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { buildUpright } from './model.ts';
const api = await Module(); api.setup();
test('80 inch upright produces a closed, perforated solid with correct bounds', () => {
  const m = buildUpright(api, {});
  assert.equal(m.height, 2032);
  assert.equal(m.centers.length, 40);
  const bounds = [[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];
  for (let i=0;i<m.positions.length;i+=m.stride) for(let j=0;j<3;j++) { bounds[j][0]=Math.min(bounds[j][0],m.positions[i+j]);bounds[j][1]=Math.max(bounds[j][1],m.positions[i+j]); }
  assert.deepEqual(bounds, [[-37.5,37.5],[-37.5,37.5],[0,2032]]);
  const edges = new Map();
  for(let i=0;i<m.indices.length;i+=3) for(let j=0;j<3;j++) { const a=m.indices[i+j],b=m.indices[i+(j+1)%3]; const k=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(k,(edges.get(k)||0)+1); }
  assert.ok([...edges.values()].every(count => count === 2), 'each mesh edge belongs to exactly two triangles');
  assert.ok(m.volume > 1000000 && m.volume < (75**2-69**2)*2032);
});
test('height and hole pitch change geometry', () => {
  const m = buildUpright(api, {height: 93, spacing: 100});
  assert.equal(m.height, 2362.2);
  assert.equal(m.centers.length, 23);
});
test('invalid or intersecting hole dimensions are rejected', () => {
  assert.throws(() => buildUpright(api, {spacing: 20}), /spacing/);
  assert.throws(() => buildUpright(api, {wall: 40}), /Wall/);
  assert.throws(() => buildUpright(api, {height: NaN}), /number/);
});
