import { chromium, expect, test } from '@playwright/test';

/** Run against an isolated worktree server and named browser; never reuse the live builder. */
test('placement outside release, capture loss, and keyboard history end scene gestures', async () => {
  test.setTimeout(90_000);
  const url = process.env.GYM_SCENE_URL, cdp = process.env.GYM_SCENE_CDP_URL;
  if (!url || !cdp) throw Error('Set GYM_SCENE_URL and GYM_SCENE_CDP_URL for an isolated scene review server/browser.');
  const browser = await chromium.connectOverCDP(cdp);
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.route('**/__scene-review', route => route.fulfill({ contentType: 'text/html', body: '<div id="viewport" style="position:absolute;left:100px;top:100px;width:800px;height:600px"></div>' }));
    await page.goto(new URL('/__scene-review', url).href);
    await page.evaluate(async () => {
      const { BuilderStore } = await import('/src/state/builder-store.ts');
      const { createBuilderScene } = await import('/src/scenes/builder-scene.ts');
      const store = new BuilderStore({ getItem: () => null, setItem: () => {} });
      await store.ready;
      const state = { store, scene: null as any, previews: 0 };
      const preview = store.previewFloor;
      store.previewFloor = (...args: Parameters<typeof preview>) => { state.previews++; preview(...args); };
      state.scene = createBuilderScene(document.querySelector('#viewport')!, store);
      (window as any).sceneReview = state;
      // Same event ordering as BuilderPage: scene keyboard cleanup, then store traversal.
      document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault(); store.history(event.shiftKey ? 'redo' : 'undo');
        }
      });
    });
    const ready = () => expect.poll(() => page.evaluate(() => { const s = (window as any).sceneReview.store.getSnapshot(); return s.builtDoc === s.doc; })).toBe(true);
    await ready();
    await page.evaluate(() => { const { store, scene } = (window as any).sceneReview; scene.fit('top'); store.startPlacement('rep-nighthawk'); });
    await page.mouse.move(450, 300);
    await expect.poll(() => page.evaluate(() => (window as any).sceneReview.previews)).toBeGreaterThan(0);
    await page.mouse.down();
    expect(await page.locator('canvas').evaluate(canvas => canvas.hasPointerCapture(1))).toBe(true);
    await page.mouse.move(970, 300); await page.mouse.up();
    const before = await page.evaluate(() => (window as any).sceneReview.previews);
    await page.mouse.move(500, 350);
    await expect.poll(() => page.evaluate(() => (window as any).sceneReview.previews)).toBeGreaterThan(before);
    expect(await page.evaluate(() => (window as any).sceneReview.store.getSnapshot().doc.floorItems ?? [])).toEqual([]);
    expect(await page.locator('canvas').evaluate(canvas => canvas.hasPointerCapture(1))).toBe(false);

    // Unexpected capture loss must also restore hover, without accepting a proposal.
    await page.mouse.down();
    await page.locator('canvas').evaluate(canvas => canvas.releasePointerCapture(1));
    await page.mouse.move(520, 360); await page.mouse.up();
    const lost = await page.evaluate(() => (window as any).sceneReview.previews);
    await page.mouse.move(540, 370);
    await expect.poll(() => page.evaluate(() => (window as any).sceneReview.previews)).toBeGreaterThan(lost);
    expect(await page.evaluate(() => (window as any).sceneReview.store.getSnapshot().doc.floorItems ?? [])).toEqual([]);

    // Keep the bench alone so its top-view center is a stable direct-drag target.
    await page.evaluate(() => {
      const { store } = (window as any).sceneReview;
      store.previewFloor([0, 0]); store.acceptProposal();
      const doc = store.getSnapshot().doc;
      store.commit({ ...doc, removed: Object.keys(doc.uprights), accessories: [] });
    });
    await ready();
    await page.evaluate(() => (window as any).sceneReview.scene.fit('top'));
    const position = () => page.evaluate(() => (window as any).sceneReview.store.getSnapshot().doc.floorItems[0].position);
    const original = await position();
    await page.mouse.move(500, 400); await page.mouse.down(); await page.mouse.move(540, 430);
    await expect.poll(position).not.toEqual(original);
    await page.keyboard.press('Control+z');
    await expect.poll(position).toEqual(original);
    await page.mouse.move(600, 460); await page.mouse.up();
    expect(await position()).toEqual(original);
    expect(await page.evaluate(() => (window as any).sceneReview.store.getSnapshot().canRedo)).toBe(true);
    await page.evaluate(() => (window as any).sceneReview.scene.dispose());
  } finally {
    await page.close();
    await browser.close(); // Disconnect only; the named agent-browser session owns Chrome.
  }
});
