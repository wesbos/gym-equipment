import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryHistory, createRouter, isRedirect } from '@tanstack/react-router';
import { routeTree } from './routes.tsx';

const router = createRouter({ routeTree, history: createMemoryHistory() });
const leaf = (path: string) => router.matchRoutes(path).at(-1)!;
/** Runs the matched route's beforeLoad and returns where its redirect points (Node routers skip client navigation). */
const redirectOf = (path: string, search: Record<string, unknown> = {}) => {
  const route = (router.routesById as Record<string, { options: { beforeLoad?: unknown } }>)[leaf(path).routeId];
  try { (route.options.beforeLoad as (ctx: unknown) => void)?.({ search }); } catch (error) {
    assert.ok(isRedirect(error), path);
    return error.options;
  }
};

test('the builder is home and legacy builder URLs land on it', () => {
  assert.equal(leaf('/').routeId, '/');
  assert.equal(redirectOf('/'), undefined);
  for (const path of ['/builder', '/builder.html', '/index.html']) assert.equal(redirectOf(path)?.to, '/', path);
  assert.deepEqual(redirectOf('/builder', { layout: 'six' })?.search, { layout: 'six' });
});

test('parts live at real /parts/<id> paths; a bare /parts goes to the library', () => {
  const part = leaf('/parts/j-hook-standard');
  assert.deepEqual([part.routeId, part.params.partId], ['/parts/$partId', 'j-hook-standard']);
  assert.equal(redirectOf('/parts/j-hook-standard'), undefined);
  assert.equal(leaf('/parts/not-a-part').params.partId, 'not-a-part');
  for (const path of ['/parts', '/parts/', '/parts.html']) assert.equal(redirectOf(path)?.to, '/library', path);
  assert.equal(leaf('/library').routeId, '/library');
});
