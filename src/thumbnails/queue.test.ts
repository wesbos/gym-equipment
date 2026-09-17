import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ThumbnailQueue, thumbnailKey, type ThumbnailRequest } from './queue.ts';
const tick = () => new Promise((resolve) => setTimeout(resolve, 45));
const request = (part: string): ThumbnailRequest => ({ part, params: {} });
function harness(capacity = 96, limit = 32) {
  const builds: string[] = [];
  let finish: (url: string) => void = () => {};
  let reject: (error: Error) => void = () => {};
  let disposed = 0;
  const queue = new ThumbnailQueue(() => ({
    render: (r) => { builds.push(r.part); return new Promise<string>((yes, no) => { finish = yes; reject = no; }); },
    dispose: () => { disposed++; },
  }), capacity, limit);
  return { queue, builds, finish: (url: string) => finish(url), fail: () => reject(new Error('bad geometry')), disposed: () => disposed };
}
test('parameter keys are order independent and distinguish geometry variants', () => {
  assert.equal(thumbnailKey({ part: 'bar', params: { length: 100, diameter: 25 } }), thumbnailKey({ part: 'bar', params: { diameter: 25, length: 100 } }));
  assert.notEqual(thumbnailKey({ part: 'bar', params: { diameter: 25 } }), thumbnailKey({ part: 'bar', params: { diameter: 50 } }));
  assert.notEqual(thumbnailKey(request('j-hook-standard')), thumbnailKey(request('j-hook-roller')));
});
test('lazy serialized builds deduplicate listeners and reuse cached images', async () => {
  const h = harness(); const results: (string | null)[] = [];
  h.queue.request(request('a'), (v) => results.push(v));
  h.queue.request(request('a'), (v) => results.push(v));
  h.queue.request(request('b'), () => {});
  assert.deepEqual(h.builds, []);
  await tick(); assert.deepEqual(h.builds, ['a']);
  h.finish('image-a'); await tick();
  assert.equal(JSON.stringify(results), JSON.stringify(['image-a', 'image-a']));
  assert.deepEqual(h.builds, ['a', 'b']);
  h.queue.request(request('a'), (v) => results.push(v));
  assert.equal(results.at(-1), 'image-a'); h.queue.release();
});
test('scroll cancellation removes queued work and suppresses stale callbacks', async () => {
  const h = harness(); let calls = 0;
  const cancel = h.queue.request(request('a'), () => calls++);
  const cancelQueued = h.queue.request(request('b'), () => calls++);
  await tick(); cancel(); cancelQueued(); h.finish('a'); await tick();
  assert.deepEqual(h.builds, ['a']); assert.equal(calls, 0); h.queue.release();
});
test('queue and LRU stay bounded, cache hits update recency', async () => {
  const h = harness(2, 2); let overflow: string | null | undefined;
  h.queue.request(request('a'), () => {}); h.queue.request(request('b'), () => {});
  h.queue.request(request('overflow'), (v) => overflow = v);
  assert.equal(overflow, null);
  await tick(); h.finish('a'); await tick(); h.finish('b'); await tick();
  h.queue.request(request('a'), () => {});
  h.queue.request(request('c'), () => {}); await tick(); h.finish('c'); await tick();
  h.queue.request(request('a'), () => {}); h.queue.request(request('b'), () => {}); await tick();
  assert.deepEqual(h.builds, ['a', 'b', 'c', 'b']); h.queue.release();
});
test('failures retain fallback without repeated builds and queue continues', async () => {
  const h = harness(); const results: (string | null)[] = [];
  h.queue.request(request('bad'), (v) => results.push(v));
  h.queue.request(request('good'), () => {});
  await tick(); h.fail(); await tick();
  h.queue.request(request('bad'), (v) => results.push(v));
  assert.deepEqual(results, [null, null]); assert.deepEqual(h.builds, ['bad', 'good']); h.queue.release();
});
test('route release disposes resources, ignores late results and allows re-entry', async () => {
  const h = harness(); let calls = 0;
  h.queue.request(request('a'), () => calls++); await tick();
  h.queue.release(); h.finish('stale'); await tick();
  assert.equal(calls, 0); assert.equal(h.disposed(), 1);
  h.queue.request(request('a'), () => calls++); await tick(); h.finish('new'); await tick();
  assert.equal(calls, 1); assert.deepEqual(h.builds, ['a', 'a']);
  h.queue.release(); h.queue.request(request('a'), () => calls++);
  assert.equal(calls, 2); assert.equal(h.disposed(), 2);
});
