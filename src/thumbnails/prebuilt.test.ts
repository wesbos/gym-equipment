import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { definitions } from '../../rack-generator/catalog.ts';
import { prebuiltManifest, prebuiltThumbnail } from './prebuilt.ts';
import { thumbnailKey } from './queue.ts';

const dir = new URL('../../public/thumbnails/', import.meta.url);
const fix = 'run `npm run thumbnails` and commit public/thumbnails/ + src/thumbnails/manifest.json';

test('every catalog part has a prebuilt thumbnail for its default params', () => {
  const missing = definitions.filter((d) => !(thumbnailKey({ part: d.id, params: d.defaults }) in prebuiltManifest)).map((d) => d.id);
  assert.deepEqual(missing, [], `${missing.length} catalog part(s) have no prebuilt thumbnail for their current defaults (new part or changed defaults): ${missing.join(', ')}. The sidebar would build them with Manifold at runtime; ${fix}.`);
});

test('manifest files exist, and no stale images or entries ship', () => {
  const files = Object.values(prebuiltManifest).filter((f): f is string => !!f);
  const absent = files.filter((f) => !existsSync(new URL(f, dir)));
  assert.deepEqual(absent, [], `Manifest references missing images; ${fix}.`);
  const unreferenced = readdirSync(dir).filter((f) => !files.includes(f));
  assert.deepEqual(unreferenced, [], `Unreferenced files in public/thumbnails/; ${fix}.`);
  const catalogKeys = new Set(definitions.map((d) => thumbnailKey({ part: d.id, params: d.defaults })));
  const stale = Object.keys(prebuiltManifest).filter((key) => !catalogKeys.has(key));
  assert.deepEqual(stale, [], `Manifest entries for removed parts or old defaults; ${fix}.`);
});

test('lookups resolve defaults (in any order, or omitted) and leave custom params to the live pipeline', () => {
  const upright = definitions.find((d) => d.id === 'upright')!;
  const url = prebuiltThumbnail('upright', upright.defaults);
  assert.match(url ?? '', /^\/thumbnails\/upright\.[0-9a-f]{10}\.webp$/);
  assert.equal(prebuiltThumbnail('upright', Object.fromEntries(Object.entries(upright.defaults).reverse())), url);
  assert.equal(prebuiltThumbnail('upright'), url);
  assert.equal(prebuiltThumbnail('upright', { ...upright.defaults, height: upright.defaults.height + 100 }), undefined);
  assert.equal(prebuiltThumbnail('not-a-part'), undefined);
});
