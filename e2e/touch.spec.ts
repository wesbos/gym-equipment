import { test, expect, chromium, devices, type CDPSession, type Page } from '@playwright/test';

/**
 * Touch interaction in the 3D builder (#204), with real CDP touch sequences on an emulated iPhone 14:
 * orbit, pinch, two-finger pan, tap-select a J-hook, place a floor item with the on-canvas Place button,
 * drag it, long-press reposition, and undo. Serve this worktree's Vite dev server on an isolated port and
 * set GYM_TOUCH_BASE_URL (default http://127.0.0.1:5751).
 */
const base = process.env.GYM_TOUCH_BASE_URL ?? 'http://127.0.0.1:5751';
// Hardware WebGL: touch moves are frame-aligned, and software GL frames are slow enough to stall CDP input.
const gpuArgs = process.env.GYM_TOUCH_SWIFTSHADER ? [] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
type Point = { x: number; y: number };

async function touchDriver(page: Page, cdp: CDPSession) {
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Point[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id, radiusX: 4, radiusY: 4, force: 1 })) });
  const lerp = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  return {
    async tap(p: Point) { await send('touchStart', [p]); await page.waitForTimeout(40); await send('touchEnd', []); await page.waitForTimeout(60); },
    /** One or more fingers moving together from `from[i]` to `to[i]`; `hold` ms before moving (long-press). */
    async drag(from: Point[], to: Point[], { steps = 12, hold = 0 } = {}) {
      await send('touchStart', from);
      if (hold) await page.waitForTimeout(hold);
      for (let i = 1; i <= steps; i++) { await send('touchMove', from.map((p, f) => lerp(p, to[f], i / steps))); await page.waitForTimeout(16); }
      await send('touchEnd', []);
      await page.waitForTimeout(80);
    },
  };
}

test('touch: orbit, pinch, pan, tap-select, touch placement, drag, long-press reposition, undo', async () => {
  test.setTimeout(180_000);
  const browser = await chromium.launch({ args: gpuArgs });
  try {
    const context = await browser.newContext({ ...devices['iPhone 14'] });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    page.on('pageerror', error => console.log('pageerror', error.message));
    // A tall page: a finger on the canvas must never scroll it.
    await page.route('**/__touch-review', route => route.fulfill({ contentType: 'text/html', body:
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;height:300vh}#viewport{position:fixed;inset:0}</style><div id="viewport"></div>' }));
    await page.goto(new URL('/__touch-review', base).href);
    await page.evaluate(async () => {
      const { BuilderStore } = await import('/src/state/builder-store.ts');
      const { createBuilderScene } = await import('/src/scenes/builder-scene.ts');
      const store = new BuilderStore({ getItem: () => null, setItem: () => {} });
      await store.ready;
      (window as any).t = { store, scene: createBuilderScene(document.querySelector('#viewport')!, store) };
    });
    const snap = <T,>(fn: string) => page.evaluate(`(s => (${fn})(s))(window.t.store.getSnapshot())`) as Promise<T>;
    const point = (id: string) => page.evaluate(id => (window as any).t.scene.screenPoint(id), id) as Promise<Point & { visible: boolean } | null>;
    await expect.poll(() => snap<boolean>('s => !s.loading && s.builtDoc === s.doc'), { timeout: 60_000 }).toBe(true);
    await page.waitForTimeout(500);
    const touch = await touchDriver(page, cdp);
    const hook = 'jhooks-front:left', other = 'jhooks-front:right';
    const gap = async () => { const [a, b] = [await point(hook), await point(other)]; return Math.hypot(a!.x - b!.x, a!.y - b!.y); };

    // A tap a little off a J-hook still selects it; a tap on empty space clears the selection.
    const target = (await point(hook))!;
    await touch.tap({ x: target.x + 9, y: target.y + 6 });
    await expect.poll(() => snap<string[]>('s => [...s.selection]')).toEqual([hook]);
    await touch.tap({ x: 20, y: 90 });
    await expect.poll(() => snap<number>('s => s.selection.length')).toBe(0);

    // One finger orbits (and never selects or scrolls).
    const before = (await point(hook))!;
    await touch.drag([{ x: 120, y: 520 }], [{ x: 260, y: 540 }]);
    await page.waitForTimeout(800); // damping settles
    const orbited = (await point(hook))!;
    expect(Math.hypot(orbited.x - before.x, orbited.y - before.y)).toBeGreaterThan(20);
    expect(await snap<number>('s => s.selection.length')).toBe(0);
    expect(await page.evaluate(() => scrollY)).toBe(0);

    // Two fingers spreading zoom in; moving together they pan.
    const spread = await gap();
    await touch.drag([{ x: 160, y: 330 }, { x: 230, y: 330 }], [{ x: 90, y: 330 }, { x: 300, y: 330 }]);
    await page.waitForTimeout(800);
    expect(await gap()).toBeGreaterThan(spread * 1.2);
    const prePan = (await point(hook))!;
    await touch.drag([{ x: 150, y: 300 }, { x: 240, y: 300 }], [{ x: 150, y: 380 }, { x: 240, y: 380 }]);
    await page.waitForTimeout(800);
    const panned = (await point(hook))!;
    expect(panned.y - prePan.y).toBeGreaterThan(30);
    expect(await snap<number>('s => s.selection.length')).toBe(0);
    expect(await page.evaluate(() => [scrollY, visualViewport!.scale])).toEqual([0, 1]);
    // Fingers closing zoom back out; then reframe for the placement steps.
    const zoomed = await gap();
    await touch.drag([{ x: 90, y: 330 }, { x: 300, y: 330 }], [{ x: 170, y: 330 }, { x: 220, y: 330 }]);
    await page.waitForTimeout(800);
    expect(await gap()).toBeLessThan(zoomed * 0.8);
    await page.evaluate(() => (window as any).t.scene.fit('iso'));
    await page.waitForTimeout(300);

    // Placement: the ghost shows at once with on-canvas Place / Cancel; tap moves it, a finger drags it, Place commits.
    await page.evaluate(() => (window as any).t.store.startPlacement('rep-nighthawk'));
    await expect(page.locator('#touch-place')).toBeVisible();
    await expect(page.locator('#touch-cancel')).toBeVisible();
    await expect(page.locator('#touch-rotate-right')).toBeVisible();
    const ghostPosition = () => snap<[number, number]>('s => s.proposal.doc.floorItems.find(i => i.id === s.proposal.ownerId).position');
    const staged = await ghostPosition();
    await expect.poll(async () => !!(await point(await snap<string>('s => s.proposal.ownerId')))).toBe(true);
    await touch.tap({ x: 200, y: 560 });
    await expect.poll(ghostPosition).not.toEqual(staged);
    expect(await snap<number>('s => s.doc.floorItems?.length ?? 0')).toBe(0); // a tap chose the spot, it did not place
    const tapped = await ghostPosition(), ghostId = await snap<string>('s => s.proposal.ownerId');
    await expect.poll(async () => (await point(ghostId))?.visible).toBe(true);
    const ghost = (await point(ghostId))!;
    await touch.drag([ghost], [{ x: ghost.x - 70, y: ghost.y - 40 }]);
    await expect.poll(ghostPosition).not.toEqual(tapped);
    expect(await snap<number>('s => s.doc.floorItems?.length ?? 0')).toBe(0);
    await page.locator('#touch-rotate-right').tap();
    await page.locator('#touch-place').tap();
    await expect.poll(() => snap<number>('s => s.doc.floorItems?.length ?? 0')).toBe(1);
    await expect(page.locator('#touch-place')).toBeHidden();
    const placed = await snap<{ id: string; position: [number, number]; rotation: number }>('s => s.doc.floorItems[0]');
    expect(placed.rotation).toBeCloseTo(Math.PI / 12);
    expect(await snap<string>('s => s.selected')).toBe(placed.id);
    await expect.poll(() => snap<boolean>('s => !s.loading && s.builtDoc === s.doc')).toBe(true);

    // A finger on the selected item drags it (one undo step); off the selection it orbits instead.
    const item = (await point(placed.id))!;
    await touch.drag([item], [{ x: item.x + 60, y: item.y + 30 }]);
    await expect.poll(() => snap<[number, number]>('s => s.doc.floorItems[0].position')).not.toEqual(placed.position);
    const dragged = await snap<[number, number]>('s => s.doc.floorItems[0].position');
    await touch.drag([{ x: 40, y: 150 }], [{ x: 120, y: 160 }]);
    await page.waitForTimeout(800);
    expect(await snap<[number, number]>('s => s.doc.floorItems[0].position')).toEqual(dragged);
    await page.evaluate(() => (window as any).t.store.history('undo'));
    expect(await snap<[number, number]>('s => s.doc.floorItems[0].position')).toEqual(placed.position);
    await page.evaluate(() => (window as any).t.store.history('redo'));

    // Long-press picks the item up (the double-click reposition); the same finger carries the ghost; Place applies.
    await expect.poll(() => snap<boolean>('s => !s.loading && s.builtDoc === s.doc')).toBe(true);
    await page.waitForTimeout(300);
    const held = (await point(placed.id))!;
    await touch.drag([held], [{ x: held.x - 50, y: held.y + 50 }], { hold: 750 });
    expect(await snap<string | null>('s => s.placing?.movingId ?? null')).toBe(placed.id);
    expect(await snap<[number, number]>('s => s.doc.floorItems[0].position')).toEqual(dragged); // not yet applied
    await expect.poll(ghostPosition).not.toEqual(dragged);
    const moved = await ghostPosition();
    await page.locator('#touch-place').tap();
    await expect.poll(() => snap<[number, number]>('s => s.doc.floorItems[0].position')).toEqual(moved);
    await page.evaluate(() => (window as any).t.store.history('undo'));
    expect(await snap<[number, number]>('s => s.doc.floorItems[0].position')).toEqual(dragged);

    // Cancel leaves the document alone.
    await page.evaluate(() => (window as any).t.store.startPlacement('rep-nighthawk'));
    await page.locator('#touch-cancel').tap();
    await expect(page.locator('#touch-place')).toBeHidden();
    expect(await snap<number>('s => s.doc.floorItems.length')).toBe(1);
    expect(await page.evaluate(() => [scrollY, visualViewport!.scale])).toEqual([0, 1]);
    await page.evaluate(() => (window as any).t.scene.dispose());
  } finally { await browser.close(); }
});

test('touch: the Coop gym renders on a phone (not a fogged-out blank canvas)', async () => {
  test.setTimeout(180_000);
  const browser = await chromium.launch({ args: gpuArgs });
  try {
    const context = await browser.newContext({ ...devices['iPhone 14'] });
    const page = await context.newPage();
    await page.goto(new URL('/?gym=coop-garage-gym-reviews', base).href);
    const canvas = page.locator('#viewport canvas');
    await canvas.waitFor();
    // Wait for the gym itself (the default 14-part rack shows first) to build and fit.
    // The status reads "<n> parts · …" once a build has finished.
    await expect.poll(async () => Number((await page.locator('#status').textContent())?.match(/(\d+) parts\b/)?.[1] ?? 0), { timeout: 90_000 }).toBeGreaterThan(30);
    await page.waitForTimeout(1500);
    // Share of pixels that are not the fog/background colour (#343b38): the fogged-out canvas was nearly all fog.
    const shot = await canvas.screenshot();
    if (process.env.GYM_TOUCH_SHOTS) await page.screenshot({ path: `${process.env.GYM_TOUCH_SHOTS}/coop-iphone.png` });
    const drawn = await page.evaluate(async (png: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const c = new OffscreenCanvas(image.width, image.height), g = c.getContext('2d')!; g.drawImage(image, 0, 0);
      const { data } = g.getImageData(0, 0, image.width, image.height);
      let count = 0, total = 0;
      for (let i = 0; i < data.length; i += 4 * 7) { total++; if (Math.abs(data[i] - 0x34) + Math.abs(data[i + 1] - 0x3b) + Math.abs(data[i + 2] - 0x38) > 24) count++; }
      return count / total;
    }, shot.toString('base64'));
    expect(drawn).toBeGreaterThan(0.3);
  } finally { await browser.close(); }
});

test('fit view frames the Coop gym tightly on an iPhone, in every view, with and without a sheet inset (#215)', async () => {
  test.setTimeout(180_000);
  const browser = await chromium.launch({ args: gpuArgs });
  try {
    const context = await browser.newContext({ ...devices['iPhone 14'] });
    const page = await context.newPage();
    page.on('pageerror', error => console.log('pageerror', error.message));
    // The phone stage: the canvas between the 52 px top bar and a peeking sheet.
    await page.route('**/__fit-review', route => route.fulfill({ contentType: 'text/html', body:
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}#viewport{position:fixed;left:0;right:0;top:52px;bottom:112px}</style><div id="viewport"></div>' }));
    await page.goto(new URL('/__fit-review', base).href);
    await page.evaluate(async () => {
      const { BuilderStore } = await import('/src/state/builder-store.ts');
      const { createBuilderScene } = await import('/src/scenes/builder-scene.ts');
      const { loadGym } = await import('/src/gyms/gyms.ts');
      const store = new BuilderStore({ getItem: () => null, setItem: () => {} });
      await store.ready;
      const scene = createBuilderScene(document.querySelector('#viewport')!, store);
      (window as any).t = { store, scene };
      const gym = (await loadGym('coop-garage-gym-reviews'))!;
      scene.refitOnNextBuild();
      await store.openDesign(gym.doc, gym.title);
    });
    const built = () => page.evaluate(() => { const s = (window as any).t.store.getSnapshot(); return s.resolved.length > 30 && !s.loading && s.builtDoc === s.doc; });
    await expect.poll(built, { timeout: 90_000 }).toBe(true);
    await page.waitForTimeout(500);
    type Fill = { x: number; y: number };
    const fill = (view: string) => page.evaluate(v => { const s = (window as any).t.scene; s.fit(v); return s.contentFill(); }, view) as Promise<Fill>;
    for (const view of ['iso', 'front', 'side', 'top']) {
      const f = await fill(view);
      // The limiting axis spans at least 80 % of the canvas (the fit aims at 88 %), and nothing is cut off.
      expect(Math.max(f.x, f.y), `${view} ${JSON.stringify(f)}`).toBeGreaterThanOrEqual(0.8);
      expect(Math.max(f.x, f.y), view).toBeLessThanOrEqual(0.92);
    }
    // A half-open sheet over the lower part: the fit frames what is left, just as tightly.
    await page.evaluate(() => (window as any).t.scene.setViewInsets({ bottom: 250 }));
    for (const view of ['iso', 'top']) expect(Math.max(...Object.values(await fill(view)))).toBeGreaterThanOrEqual(0.8);
    await page.evaluate(() => (window as any).t.scene.setViewInsets({ bottom: 0 }));
    await fill('iso');
    await page.waitForTimeout(300);
    // Still not a fogged-out canvas at the closer framing (#211).
    const shot = await page.locator('#viewport canvas').screenshot();
    const drawn = await page.evaluate(async (png: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const c = new OffscreenCanvas(image.width, image.height), g = c.getContext('2d')!; g.drawImage(image, 0, 0);
      const { data } = g.getImageData(0, 0, image.width, image.height);
      let count = 0, total = 0;
      for (let i = 0; i < data.length; i += 4 * 7) { total++; if (Math.abs(data[i] - 0x34) + Math.abs(data[i + 1] - 0x3b) + Math.abs(data[i + 2] - 0x38) > 24) count++; }
      return count / total;
    }, shot.toString('base64'));
    expect(drawn).toBeGreaterThan(0.3);
    await page.evaluate(() => (window as any).t.scene.dispose());
  } finally { await browser.close(); }
});
