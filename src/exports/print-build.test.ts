import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { buildPrintInstance } from './print-build.ts';
import type { NumericParams, ManifoldAPI } from '../../rack-generator/types.ts';
const api = await Module(); api.setup();
test('print build forwards each resolved logo as the third argument without a stale cache', () => {
  const calls: unknown[] = [];
  const definition = { defaults: { width: 10 }, build: (_api: ManifoldAPI, params: NumericParams, logo?: { loops: number[][][] }) => {
    assert.equal(params.width,20); calls.push(logo); return [];
  } };
  const first = { loops: [[[0,0],[1,0],[0,1],[0,0]]] }, second = { loops: [[[0,0],[2,0],[0,2],[0,0]]] };
  buildPrintInstance(api, definition, { params: {width:20}, logo:first });
  buildPrintInstance(api, definition, { params: {width:20}, logo:second });
  buildPrintInstance(api, definition, { params: {width:20} });
  assert.deepEqual(calls,[first,second,undefined]);
  assert.equal(calls[0],first);
});
