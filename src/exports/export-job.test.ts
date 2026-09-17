import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly } from '../../rack-generator/assembly.ts';
import { ExportJob, FORMAT_KEY, readExportFormat, rememberExportFormat, type ExportFormat } from './export-job.ts';
import type { PrintRequest, PrintResponse } from './print-worker.ts';

class FakeWorker {
  onmessage: ((event: MessageEvent<PrintResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  requests: PrintRequest[] = [];
  postMessage(data: PrintRequest) { this.requests.push(data); }
  terminate() { this.terminated = true; }
  send(data: PrintResponse) { this.onmessage?.({ data } as MessageEvent<PrintResponse>); }
}
const doc = createAssembly();
function setup(exportGLB = async () => new Uint8Array([1, 2, 3]).buffer) {
  const workers: FakeWorker[] = [], downloads: { blob: Blob; filename: string }[] = [];
  const statuses: [string, boolean | undefined][] = [], busy: (ExportFormat | null)[] = [];
  let completed = 0;
  const job = new ExportJob({
    createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker as unknown as Worker; },
    exportGLB,
    download: (blob, filename) => downloads.push({ blob, filename }),
    status: (text, error) => statuses.push([text, error]),
    busy: value => busy.push(value), complete: () => completed++,
  });
  return { job, workers, downloads, statuses, busy, completed: () => completed };
}
const complete = (bytes = new Uint8Array([8, 4, 2])) => ({
  type: 'complete', bytes, report: { unit: 'millimeter', layout: 'laid-out', instances: 4, volumes: 8, triangles: 12, occludedComponents: [], overlapPolicy: '', textureLimitation: '', vendorCredits: [], parts: [] },
}) as Extract<PrintResponse, { type: 'complete' }>;

test('cancel terminates worker; queued callbacks cannot download or disrupt a retry', async () => {
  const s = setup();
  await s.job.start('3mf', doc, 'laid-out');
  const stale = s.workers[0];
  s.job.cancel();
  assert.equal(stale.terminated, true);
  await s.job.start('3mf', doc, 'assembled');
  stale.send(complete());
  stale.send({ type: 'progress', done: 1, total: 2 });
  stale.onerror?.({ message: 'late failure' } as ErrorEvent);
  assert.equal(s.downloads.length, 0);
  assert.equal(s.busy.at(-1), '3mf');
  s.workers[1].send(complete());
  assert.equal(s.downloads.length, 1);
  assert.equal(s.busy.at(-1), null);
  assert.equal(s.completed(), 1);
});

test('print snapshot, layout, MIME, filename and payload pass through unchanged for both layouts', async () => {
  for (const layout of ['laid-out', 'assembled'] as const) {
    const s = setup();
    await s.job.start('3mf', doc, layout);
    const worker = s.workers[0];
    assert.deepEqual(worker.requests[0], { doc, options: { layout } });
    assert.notEqual(worker.requests[0].doc, doc);
    const response = complete();
    worker.send(response);
    assert.equal(worker.terminated, true);
    assert.equal(s.downloads[0].filename, 'bos-strength-print-parts.3mf');
    assert.equal(s.downloads[0].blob.type, 'model/3mf');
    assert.deepEqual(new Uint8Array(await s.downloads[0].blob.arrayBuffer()), response.bytes);
  }
});

test('GLB blocks concurrent formats and retains original bytes and filename', async () => {
  let resolve!: (bytes: ArrayBuffer) => void;
  let calls = 0;
  const s = setup(() => { calls++; return new Promise<ArrayBuffer>(r => { resolve = r; }); });
  const pending = s.job.start('glb', doc, 'laid-out');
  await s.job.start('3mf', doc, 'laid-out');
  await s.job.start('glb', doc, 'laid-out');
  s.job.cancel(); // Only 3MF is cancellable.
  assert.equal(calls, 1);
  assert.equal(s.workers.length, 0);
  assert.deepEqual(s.busy, ['glb']);
  resolve(new Uint8Array([0, 255, 42]).buffer);
  await pending;
  assert.equal(s.downloads[0].filename, 'bos-strength-rack.glb');
  assert.equal(s.downloads[0].blob.type, 'model/gltf-binary');
  assert.deepEqual(new Uint8Array(await s.downloads[0].blob.arrayBuffer()), new Uint8Array([0, 255, 42]));
  assert.equal(s.busy.at(-1), null);
});

test('GLB failure clears busy and allows retry', async () => {
  let calls = 0;
  const s = setup(async () => { if (!calls++) throw Error('Scene unavailable'); return new ArrayBuffer(3); });
  await s.job.start('glb', doc, 'laid-out');
  assert.deepEqual(s.statuses.at(-1), ['GLB export failed: Scene unavailable', true]);
  assert.equal(s.busy.at(-1), null);
  await s.job.start('glb', doc, 'laid-out');
  assert.equal(s.downloads.length, 1);
});

test('worker message and runtime failures terminate and permit retry', async () => {
  const s = setup();
  await s.job.start('3mf', doc, 'laid-out');
  s.workers[0].send({ type: 'error', error: 'Invalid mesh' });
  assert.equal(s.workers[0].terminated, true);
  assert.deepEqual(s.statuses.at(-1), ['Print export failed: Invalid mesh', true]);
  await s.job.start('3mf', doc, 'laid-out');
  s.workers[1].onerror?.({ message: 'Worker crashed' } as ErrorEvent);
  assert.equal(s.workers[1].terminated, true);
  assert.deepEqual(s.statuses.at(-1), ['Print export failed: Worker crashed', true]);
  await s.job.start('3mf', doc, 'laid-out');
  s.workers[2].send(complete());
  assert.equal(s.downloads.length, 1);
});

test('unmount invalidates pending GLB and 3MF completion', async () => {
  let resolve!: (bytes: ArrayBuffer) => void;
  const glb = setup(() => new Promise<ArrayBuffer>(r => { resolve = r; }));
  const pending = glb.job.start('glb', doc, 'laid-out');
  glb.job.dispose(); resolve(new ArrayBuffer(3)); await pending;
  assert.equal(glb.downloads.length, 0);
  const print = setup();
  await print.job.start('3mf', doc, 'laid-out');
  print.job.dispose(); print.workers[0].send(complete());
  assert.equal(print.workers[0].terminated, true);
  assert.equal(print.downloads.length, 0);
});

test('session preference validates old values and tolerates denied storage', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(readExportFormat(storage), 'glb');
  rememberExportFormat(storage, '3mf'); assert.equal(readExportFormat(storage), '3mf');
  rememberExportFormat(storage, 'glb'); assert.equal(readExportFormat(storage), 'glb');
  values.set(FORMAT_KEY, 'stl'); assert.equal(readExportFormat(storage), 'glb');
  const blocked = { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } };
  assert.equal(readExportFormat(blocked), 'glb');
  assert.doesNotThrow(() => rememberExportFormat(blocked, '3mf'));
});

test('worker construction and postMessage failures clear busy for another attempt', async () => {
  let attempt = 0;
  const states: (ExportFormat | null)[] = [], errors: string[] = [];
  const worker = new FakeWorker();
  const job = new ExportJob({
    createWorker: () => {
      if (!attempt++) throw Error('Worker unavailable');
      worker.postMessage = () => { throw Error('Could not clone'); };
      return worker as unknown as Worker;
    },
    exportGLB: async () => new ArrayBuffer(0), download: () => {}, complete: () => {},
    busy: value => states.push(value), status: (text, error) => { if (error) errors.push(text); },
  });
  await job.start('3mf', doc, 'laid-out');
  await job.start('3mf', doc, 'laid-out');
  assert.equal(errors.length, 2);
  assert.deepEqual(states, ['3mf', null, '3mf', null]);
  assert.equal(worker.terminated, true);
});
