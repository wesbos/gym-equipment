import { test, expect, chromium } from '@playwright/test';

// Run against an isolated Vite server and agent-browser session, not the shared builder.
const base = process.env.GYM_EXPORT_BASE_URL ?? 'http://127.0.0.1:5327';
const cdp = process.env.GYM_EXPORT_CDP_URL;
test.skip(!cdp, 'Set GYM_EXPORT_CDP_URL to an isolated agent-browser session.');

test('failed current CAD build cannot export stale GLB, even after status changes; retry succeeds', async () => {
  test.setTimeout(90000);
  const browser = await chromium.connectOverCDP(cdp!);
  const page = await browser.contexts()[0].newPage();
  await page.goto(base);
  try {
    const result = await page.evaluate(async () => {
      const load = (path: string) => import(path);
      const { BuilderStore } = await load('/src/state/builder-store.ts');
      const { createBuilderScene } = await load('/src/scenes/builder-scene.ts');
      const { createAssembly, replaceStructurePart } = await load('/rack-generator/assembly.ts');
      const store = new BuilderStore(); await store.ready;
      const good = replaceStructurePart(createAssembly({ emptyAccessories: true }), 'rear-crossmember', 'nameplate');
      store.importJSON(JSON.stringify(good));
      const viewport = document.createElement('div');
      viewport.style.cssText = 'position:fixed;inset:0;width:800px;height:600px'; document.body.append(viewport);
      const scene = createBuilderScene(viewport, store);
      const settled = async () => {
        const end = Date.now() + 45000;
        while (store.getSnapshot().loading && Date.now() < end) await new Promise(r => setTimeout(r, 25));
        if (store.getSnapshot().loading) throw Error('CAD build timed out');
      };
      const rejection = async () => { try { await scene.exportGLB(); return 'unexpected success'; } catch (e) { return String(e); } };
      try {
        await settled();
        const initial = await scene.exportGLB();
        const bad = structuredClone(good);
        bad.logo = { version: 1, source: { kind: 'text', text: 'X', font: 'helvetiker' }, minimum: .8, bridges: 0, warnings: [], loops: [[[0,0],[20,0],[20,.2],[0,.2],[0,0]]] };
        store.importJSON(JSON.stringify(bad)); await settled();
        const buildError = store.getSnapshot().status;
        // ExportJob writes Preparing GLB before calling the scene, clearing error.
        store.status('Preparing GLB…');
        const failed = await rejection();
        store.status('Print export cancelled.');
        const failedAgain = await rejection();
        store.importJSON(JSON.stringify(good)); await settled();
        const retry = await scene.exportGLB();
        const magic = (bytes: ArrayBuffer) => new TextDecoder().decode(new Uint8Array(bytes, 0, 4));
        return { buildError, failed, failedAgain, initial: magic(initial), retry: magic(retry) };
      } finally { scene.dispose(); viewport.remove(); }
    });
    expect(result.buildError).toMatch(/0.8 mm minimum/);
    expect(result.failed).toMatch(/current rack has not built successfully/);
    expect(result.failedAgain).toMatch(/current rack has not built successfully/);
    expect(result.initial).toBe('glTF'); expect(result.retry).toBe('glTF');
  } finally { await page.close(); }
});

test('builder and standalone GLB retain system product credits with identity and metre scale', async () => {
  const browser = await chromium.connectOverCDP(cdp!);
  const page = await browser.contexts()[0].newPage(); await page.goto(base);
  try {
    const result = await page.evaluate(async () => {
      const load = (path: string) => import(path);
      const { BuilderStore } = await load('/src/state/builder-store.ts');
      const { createBuilderScene } = await load('/src/scenes/builder-scene.ts');
      const { createPartScene } = await load('/src/scenes/part-scene.ts');
      const { SYSTEM_PARTS } = await load('/rack-generator/system-types.ts');
      const store = new BuilderStore(); await store.ready;
      const entry = store.getSnapshot().resolved[0];
      store.patch({ resolved: SYSTEM_PARTS.map((part: string, i: number) => ({ ...entry, part, id: part, ownerId: 'owner-' + part, position: [i * 100, 0, 0] })) });
      const mesh = { name: 'metadata fixture', positions: new Float32Array([0,0,0, 10,0,0, 0,10,0]), indices: new Uint32Array([0,1,2]), stride: 3, role: 'frame', color: '#123456' };
      // Geometry is deliberately cheap: this tests scene/export metadata, not system CAD.
      const NativeWorker = window.Worker;
      class FixtureWorker {
        onmessage: ((event: unknown) => void) | null = null;
        postMessage(request: { id: number }) { queueMicrotask(() => this.onmessage?.({ data: { type: 'model', id: request.id, meshes: [mesh] } })); }
        terminate() {}
      }
      const viewport = document.createElement('div'); viewport.style.cssText = 'width:800px;height:600px'; document.body.append(viewport);
      window.Worker = FixtureWorker as unknown as typeof Worker;
      let builder;
      try { builder = createBuilderScene(viewport, store); } finally { window.Worker = NativeWorker; }
      const json = (buffer: ArrayBuffer) => JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, new DataView(buffer).getUint32(12, true))));
      try {
        while (store.getSnapshot().loading) await new Promise(r => setTimeout(r, 10));
        const assembly = json(await builder.exportGLB());
        builder.dispose();
        const part = createPartScene(viewport, () => {}); part.setMeshes([mesh]);
        const standalone = [];
        const original = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
        let captured: Blob | undefined;
        URL.createObjectURL = blob => { captured = blob as Blob; return 'blob:metadata-fixture'; };
        HTMLAnchorElement.prototype.click = () => {};
        try {
          for (const id of SYSTEM_PARTS) {
            await part.exportGLB('bos-strength-' + id);
            standalone.push(json(await captured!.arrayBuffer()));
          }
        } finally { URL.createObjectURL = original; HTMLAnchorElement.prototype.click = click; part.dispose(); }
        return { assembly, standalone, ids: SYSTEM_PARTS };
      } finally { builder.dispose(); viewport.remove(); }
    });
    for (const [i, id] of result.ids.entries()) {
      const vendor = id === 'cable-kraken' ? 'Bells of Steel' : 'REP Fitness';
      const instance = result.assembly.nodes.find((n: any) => n.extras?.id === id);
      expect(instance.extras.ownerId).toBe('owner-' + id);
      expect(instance.extras.vendorAttribution.vendor).toBe(vendor);
      const standalone = result.standalone[i].nodes.find((n: any) => n.name === 'bos-strength-' + id);
      expect(standalone.extras.vendorAttribution).toEqual(instance.extras.vendorAttribution);
      expect([0, 5, 10].map(index => standalone.matrix[index])).toEqual([.001, .001, .001]);
    }
    const matrix = result.assembly.nodes.find((n: any) => n.name === 'BOS STRENGTH rack').matrix;
    for (const offset of [0, 4, 8]) expect(Math.hypot(...matrix.slice(offset, offset + 3))).toBeCloseTo(.001, 9);
  } finally { await page.close(); }
});

test('Parts parameter downloads and original-reference links use system attribution', async () => {
  const browser = await chromium.connectOverCDP(cdp!);
  const page = await browser.contexts()[0].newPage();
  const ids = ['cable-kraken', 'cable-athena', 'cable-ares1', 'cable-ares2', 'smith-rep'];
  await page.addInitScript(ids => {
    class FixtureWorker {
      onmessage: ((event: unknown) => void) | null = null;
      constructor() {
        setTimeout(() => this.onmessage?.({ data: { type: 'catalog', definitions: ids.map(id => ({ id, name: id, category: 'Systems', defaults: {} })) } }), 0);
      }
      postMessage(request: { id: number; params: unknown }) {
        queueMicrotask(() => this.onmessage?.({ data: { type: 'model', ...request, meshes: [{ name: 'fixture', positions: new Float32Array([0,0,0, 10,0,0, 0,10,0]), indices: new Uint32Array([0,1,2]), stride: 3 }] } }));
      }
      terminate() {}
    }
    window.Worker = FixtureWorker as unknown as typeof Worker;
  }, ids);
  try {
    await page.goto(base + '/parts');
    for (const id of ids) {
      await page.locator('#catalog').getByRole('button', { name: id, exact: true }).click();
      const link = page.getByRole('link', { name: 'Original reference' });
      await expect(link).toHaveAttribute('href', id === 'cable-kraken' ? /bellsofsteel.com/ : /repfitness.com/);
      const saved = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save parameters' }).click();
      const file = await saved;
      const { readFile } = await import('node:fs/promises');
      const json = JSON.parse(await readFile((await file.path())!, 'utf8'));
      expect(json.part).toBe(id);
      expect(json.brand).toBe(id === 'cable-kraken' ? 'Bells of Steel' : 'REP Fitness');
      expect(json.vendorAttribution.vendor).toBe(json.brand);
      expect(json.vendorAttribution.url).toBe(await link.getAttribute('href'));
      expect(json.vendorAttribution.reconstruction).toBeTruthy();
    }
  } finally { await page.close(); }
});
