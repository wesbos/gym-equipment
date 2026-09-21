import { test, expect, chromium, devices, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { addFromGallery } from './part-gallery.ts';

/** Mobile and tablet app shell (#203): iPhone portrait (bottom sheet), iPhone landscape (side sheet) and iPad
 * (collapsible panels) with touch emulation. Serve the builder (e.g. `npx vite --port 5742`) and set
 * GYM_MOBILE_BASE_URL (default http://127.0.0.1:5742). */
const base = process.env.GYM_MOBILE_BASE_URL ?? 'http://127.0.0.1:5742';
let browser: Browser;
test.beforeAll(async () => { browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); });
test.afterAll(async () => { await browser?.close(); });

type Insets = { top: number; right: number; bottom: number; left: number };
async function open(device: (typeof devices)[string], insets?: Insets) {
  const { defaultBrowserType: _, ...options } = device;
  const context: BrowserContext = await browser.newContext({ ...options, hasTouch: true });
  const page = await context.newPage();
  // A notch and home indicator: Chromium overrides env(safe-area-inset-*) for the page.
  if (insets) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride' as never, { insets } as never);
  page.setDefaultTimeout(20000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { if (!sessionStorage.getItem('mobile-shell-init')) { localStorage.clear(); sessionStorage.setItem('mobile-shell-init', '1'); } });
  await page.goto(`${base}/`);
  await expect(page.locator('#status')).toHaveText(/\d+ parts · All connections aligned/, { timeout: 90000 });
  return { page, errors, close: () => context.close() };
}
const partCount = async (page: Page) => Number((await page.locator('#status').textContent())?.match(/(\d+) parts/)?.[1]);
/** Nothing sticks out of the viewport and the page itself never scrolls. */
async function expectNoOverflow(page: Page) {
  const m = await page.evaluate(() => {
    window.scrollTo(0, 5000);
    const d = document.documentElement;
    return { sw: d.scrollWidth, sh: d.scrollHeight, w: innerWidth, h: innerHeight, y: scrollY,
      toolbar: [...document.querySelectorAll('.toolbar button, .toolbar a')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.toolbar-menu') && (r.right > innerWidth + 0.5 || r.left < -0.5);
      }).length };
  });
  expect(m.sw).toBeLessThanOrEqual(m.w);
  expect(m.sh).toBeLessThanOrEqual(m.h);
  expect(m.y).toBe(0);
  expect(m.toolbar).toBe(0);
}
const canvasBox = async (page: Page) => (await page.locator('#viewport canvas').boundingBox())!;
const rect = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** Places the part being placed: the touch bar's Place on touch screens, the hint's button otherwise. */
async function place(page: Page) {
  const touch = page.locator('#touch-place');
  await (await touch.isVisible() ? touch : page.locator('#accept-placement')).click();
}
/** Real touch sequences (CDP), so the sheet's content drag and native scrolling both see genuine touches. */
async function touchDrag(page: Page, from: { x: number; y: number }, dy: number, steps = 12) {
  const cdp = await page.context().newCDPSession(page);
  const point = (y: number) => [{ x: from.x, y, id: 0, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.y) });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from.y + dy * i / steps) }); await page.waitForTimeout(16); }
  await page.waitForTimeout(120);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(450);
}

test('iPhone portrait: bottom sheet snaps, drags and flicks; add, select, inspect, undo', async () => {
  test.setTimeout(180000);
  const { page, errors, close } = await open(devices['iPhone 14']);
  try {
    await expect(page.locator('.builder-page')).toHaveAttribute('data-layout', 'phone');
    await expectNoOverflow(page);
    const handle = page.getByRole('slider', { name: 'Panel size' }), dock = page.locator('.builder-dock');
    await expect(handle).toHaveAttribute('aria-valuetext', 'Collapsed');
    const viewport = page.viewportSize()!, peekCanvas = await canvasBox(page);
    // The canvas fills the space between the top bar and the peeking sheet.
    expect(peekCanvas.width).toBe(viewport.width);
    expect(peekCanvas.height).toBeGreaterThan(viewport.height * 0.7);

    // Keyboard: arrows step through the snap points; the canvas insets once the sheet settles.
    await handle.focus();
    await page.keyboard.press('ArrowUp');
    await expect(handle).toHaveAttribute('aria-valuetext', 'Half open');
    await expect.poll(async () => (await canvasBox(page)).height).toBeLessThan(peekCanvas.height - 100);
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuetext', 'Fully open');
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuetext', 'Collapsed');
    await expect.poll(async () => (await canvasBox(page)).height).toBe(peekCanvas.height);

    // Slow drag: settles on the nearest snap. Flick: moves on to the next one. (Let the snap animation finish first.)
    await page.waitForTimeout(400);
    const grip = (await handle.boundingBox())!, x = grip.x + grip.width / 2, y = grip.y + grip.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 20; i++) { await page.mouse.move(x, y - i * 14); await page.waitForTimeout(16); }
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-valuetext', 'Half open');
    await page.waitForTimeout(400);
    const half = (await dock.boundingBox())!;
    const g2 = (await handle.boundingBox())!;
    await page.mouse.move(x, g2.y + 10); await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(x, g2.y + 10 - i * 20);
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-valuetext', 'Fully open');
    await page.waitForTimeout(400);
    expect((await dock.boundingBox())!.y).toBeLessThan(half.y - 100);
    await expectNoOverflow(page);
    // Tapping the active tab drops the sheet back to peek.
    await page.getByRole('tab', { name: 'Parts' }).click();
    await expect(handle).toHaveAttribute('aria-valuetext', 'Collapsed');

    // Overflow menu holds the secondary actions; Export stays reachable.
    await page.getByRole('button', { name: 'More actions' }).click();
    for (const name of ['Load JSON', 'Save JSON', 'Export ⌄']) await expect(page.getByRole('button', { name, exact: true })).toBeInViewport();
    await expect(page.getByRole('link', { name: 'Gym gallery', exact: true })).toBeInViewport();
    await page.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('button', { name: 'Save JSON', exact: true })).toBeHidden();

    // Add a part from the gallery (top bar "Add parts"): the sheet stays out of the way while placing.
    const before = await partCount(page);
    await addFromGallery(page, 'olympic-barbell', 'olympic barbell');
    await expect(page.locator('#placement-hint')).toBeInViewport();
    await expect(handle).toHaveAttribute('aria-valuetext', 'Collapsed');
    // Touch placement bar (#204): it replaces the hint's buttons; the hint moves to the top, and neither covers the
    // stage buttons.
    await expect(page.locator('#touch-place')).toBeVisible();
    await expect(page.locator('#accept-placement')).toBeHidden();
    const bar = await rect(page, '.touch-placement'), hint = await rect(page, '#placement-hint'), actions = await rect(page, '.stage-actions');
    expect(overlaps(bar, hint)).toBe(false);
    expect(overlaps(bar, actions)).toBe(false);
    expect(bar.y + bar.height).toBeLessThanOrEqual((await rect(page, '.builder-dock')).y);
    await page.screenshot({ path: 'test-results/mobile-shell-iphone-placing.png' });
    await place(page);
    await expect.poll(() => partCount(page), { timeout: 60000 }).toBe(before + 1);

    // Select from the outliner (#206), the sheet's Outliner tab on phones: the list stays up, the Inspector tab edits it.
    await page.locator('#parts-toggle').click();
    await expect(page.getByRole('tab', { name: 'Outliner' })).toHaveAttribute('aria-selected', 'true');
    const row = page.locator('#outliner .ol-row[data-instance-id]').filter({ hasText: 'Olympic barbell' }).first();
    await row.click();
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Outliner' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Inspector' }).click();
    await expect(page.getByRole('tab', { name: 'Inspector' })).toHaveAttribute('aria-selected', 'true');
    await expect(handle).not.toHaveAttribute('aria-valuetext', 'Collapsed');
    await expect(page.locator('#selection-title')).toBeInViewport();
    await expect(page.locator('.catalog-panel')).toBeHidden();
    await page.screenshot({ path: 'test-results/mobile-shell-iphone-inspector.png' });

    // Timeline and Room tabs.
    await page.getByRole('tab', { name: 'Timeline' }).click();
    await expect(page.getByRole('slider', { name: 'History playhead' })).toBeInViewport();
    await page.getByRole('tab', { name: 'Room' }).click();
    await expect(page.locator('#room-button')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('tab', { name: 'Inspector' }).click();
    await expect(page.locator('#room-button')).toHaveAttribute('aria-pressed', 'false');

    // Undo from the top bar.
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(() => partCount(page), { timeout: 60000 }).toBe(before);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  } finally { await close(); }
});

test('iPhone landscape: slim top bar and side sheet', async () => {
  test.setTimeout(120000);
  const { page, errors, close } = await open(devices['iPhone 14 landscape']);
  try {
    await expect(page.locator('.builder-page')).toHaveAttribute('data-layout', 'phone-land');
    await expectNoOverflow(page);
    const viewport = page.viewportSize()!, bar = (await page.locator('.toolbar').boundingBox())!;
    expect(bar.height).toBeLessThanOrEqual(48);
    const collapsed = await canvasBox(page);
    expect(collapsed.height).toBeGreaterThan(viewport.height - 50);
    expect(collapsed.width).toBeGreaterThan(viewport.width * 0.8);
    await page.getByRole('tab', { name: 'Inspector' }).click();
    const handle = page.getByRole('slider', { name: 'Panel size' });
    await expect(handle).toHaveAttribute('aria-valuetext', 'Half open');
    await expect.poll(async () => (await canvasBox(page)).width).toBeLessThan(collapsed.width - 150);
    const dock = (await page.locator('.builder-dock').boundingBox())!;
    expect(dock.x).toBeGreaterThan(viewport.width * 0.4);
    // Drag the handle right to collapse the side sheet.
    const grip = (await handle.boundingBox())!;
    await page.waitForTimeout(400);
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2); await page.mouse.down();
    for (let i = 1; i <= 20; i++) { await page.mouse.move(grip.x + grip.width / 2 + i * 15, grip.y + grip.height / 2); await page.waitForTimeout(16); }
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-valuetext', 'Collapsed');
    // Add a part and undo it.
    const before = await partCount(page);
    await addFromGallery(page, 'olympic-barbell', 'olympic barbell');
    await place(page);
    await expect.poll(() => partCount(page), { timeout: 60000 }).toBe(before + 1);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(() => partCount(page), { timeout: 60000 }).toBe(before);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  } finally { await close(); }
});

test('iPad: collapsible panels give the canvas the room, in both orientations', async () => {
  test.setTimeout(120000);
  for (const device of [devices['iPad Pro 11'], devices['iPad Pro 11 landscape']]) {
    const { page, errors, close } = await open(device);
    try {
      await expect(page.locator('.builder-page')).toHaveAttribute('data-layout', 'tablet');
      await expectNoOverflow(page);
      await expect(page.locator('#export')).toBeInViewport();
      const full = await canvasBox(page);
      await page.getByRole('button', { name: 'Parts panel' }).click();
      await page.getByRole('button', { name: 'Inspector panel' }).click();
      await page.getByRole('button', { name: 'Timeline panel' }).click();
      await expect(page.locator('.catalog-panel')).toBeHidden();
      await expect(page.locator('.inspector-panel')).toBeHidden();
      await expect(page.locator('.history-timeline')).toBeHidden();
      await expect.poll(async () => (await canvasBox(page)).width).toBe(page.viewportSize()!.width);
      await expect.poll(async () => (await canvasBox(page)).height).toBeGreaterThan(full.height + 60);
      // With the sidebar hidden, "Add parts" moves to the toolbar.
      const before = await partCount(page);
      await page.locator('.toolbar-add').click();
      await page.locator('#gallery-search').fill('olympic barbell');
      await page.locator('.part-gallery [data-part="olympic-barbell"]').click();
      const bar = await rect(page, '.touch-placement[data-shown]'), hint = await rect(page, '#placement-hint');
      expect(overlaps(bar, hint)).toBe(false);
      await place(page);
      await expect.poll(() => partCount(page), { timeout: 60000 }).toBe(before + 1);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect.poll(() => partCount(page), { timeout: 60000 }).toBe(before);
      // Restore: the choice persists, so put the panels back for the next orientation.
      for (const name of ['Parts panel', 'Inspector panel', 'Timeline panel']) await page.getByRole('button', { name }).click();
      await expect(page.locator('.inspector-panel')).toBeVisible();
      await expectNoOverflow(page);
      expect(errors).toEqual([]);
    } finally { await close(); }
  }
});

test('iPhone portrait: drag the sheet from its content when scrolled to the top, scroll otherwise', async () => {
  test.setTimeout(120000);
  const { page, errors, close } = await open(devices['iPhone 14']);
  try {
    const handle = page.getByRole('slider', { name: 'Panel size' }), panel = page.locator('.catalog-panel');
    await page.getByRole('tab', { name: 'Parts' }).click();
    await expect(handle).toHaveAttribute('aria-valuetext', 'Half open');
    await page.waitForTimeout(400);
    const x = page.viewportSize()!.width / 2, dockTop = async () => (await rect(page, '.builder-dock')).y;
    // Half: dragging the content up grows the sheet; down lowers it.
    await touchDrag(page, { x, y: (await dockTop()) + 160 }, -220);
    await expect(handle).toHaveAttribute('aria-valuetext', 'Fully open');
    // Full: dragging up scrolls the panel; dragging down on a scrolled panel scrolls it back, the sheet stays.
    await touchDrag(page, { x, y: (await dockTop()) + 420 }, -260);
    await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(50);
    await expect(handle).toHaveAttribute('aria-valuetext', 'Fully open');
    await touchDrag(page, { x, y: (await dockTop()) + 200 }, 90);
    await expect(handle).toHaveAttribute('aria-valuetext', 'Fully open');
    // Scrolled to the top, a downward drag takes the sheet down.
    await panel.evaluate(el => { el.scrollTop = 0; });
    await touchDrag(page, { x, y: (await dockTop()) + 200 }, 260);
    await expect(handle).not.toHaveAttribute('aria-valuetext', 'Fully open');
    await touchDrag(page, { x, y: (await dockTop()) + 120 }, 300);
    await expect(handle).toHaveAttribute('aria-valuetext', 'Collapsed');
    // No drag ever left the sheet half-moved or scrolled the page.
    await expect(page.locator('.builder-dock')).not.toHaveClass(/dragging/);
    await expectNoOverflow(page);
    expect(errors).toEqual([]);
  } finally { await close(); }
});

test('phones: the overflow menu and export options stay inside the viewport', async () => {
  test.setTimeout(240000);
  for (const name of ['iPhone SE', 'iPhone 14', 'iPhone 14 Pro Max', 'iPhone SE landscape', 'iPhone 14 landscape', 'iPhone 14 Pro Max landscape']) {
    const { page, errors, close } = await open(devices[name]);
    try {
      await expect(page.locator('.builder-page')).toHaveAttribute('data-layout', /^phone/);
      const { width } = page.viewportSize()!, inside = async (selector: string) => {
        const b = await rect(page, selector);
        expect(b.x, `${name} ${selector} left`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${name} ${selector} right`).toBeLessThanOrEqual(width);
      };
      await page.getByRole('button', { name: 'More actions' }).click();
      await expect(page.locator('.toolbar-menu')).toBeVisible();
      await inside('.toolbar-menu'); await inside('#export');
      await page.locator('#export').click();
      await expect(page.locator('.export-menu-options')).toBeVisible();
      await inside('.export-menu-options');
      await expect(page.getByRole('menuitemradio', { name: /GLB/ })).toBeInViewport();
      await expect(page.locator('.export-menu-actions .primary')).toBeInViewport();
      await expectNoOverflow(page);
      expect(errors).toEqual([]);
    } finally { await close(); }
  }
});

test('safe areas: a notch and home indicator pad the top bar, sheet and stage', async () => {
  test.setTimeout(120000);
  const portrait = await open(devices['iPhone 14'], { top: 47, right: 0, bottom: 34, left: 0 });
  try {
    const { page } = portrait, { height } = page.viewportSize()!;
    // The top bar grows by the inset; its buttons sit below the notch.
    expect((await rect(page, '.toolbar')).height).toBe(52 + 47);
    expect((await rect(page, '.overflow-trigger')).y).toBeGreaterThanOrEqual(47);
    expect((await rect(page, '#viewport canvas')).y).toBe(52 + 47);
    // Collapsed, the tabs and status line sit above the home indicator, and nothing of the panel shows under it.
    const status = await rect(page, '.status-bar');
    expect(status.y + status.height).toBeLessThanOrEqual(height - 34);
    await expect(page.locator('.catalog-panel')).toBeHidden();
    // Open, the last panel content can scroll clear of the home indicator.
    await page.getByRole('tab', { name: 'Parts' }).click();
    await page.waitForTimeout(500);
    await page.locator('.catalog-panel').evaluate(el => { el.scrollTop = el.scrollHeight; });
    const f = await rect(page, '.catalog-footer');
    expect(f.y + f.height).toBeLessThanOrEqual(height - 34);
    await page.screenshot({ path: 'test-results/mobile-shell-iphone-notch.png' });
    await expectNoOverflow(page);
  } finally { await portrait.close(); }
  const landscape = await open(devices['iPhone 14 landscape'], { top: 0, right: 47, bottom: 21, left: 47 });
  try {
    const { page } = landscape, { width, height } = page.viewportSize()!;
    // Chrome on the left clears the notch; the stage buttons clear the home indicator.
    expect((await rect(page, '.brand')).x).toBeGreaterThanOrEqual(47);
    expect((await rect(page, '.view-menu-trigger')).x).toBeGreaterThanOrEqual(47);
    const actions = await rect(page, '.stage-actions');
    expect(actions.y + actions.height).toBeLessThanOrEqual(height - 21);
    // The side sheet's panel ends before the right inset and keeps a usable width.
    await page.getByRole('tab', { name: 'Inspector' }).click();
    await page.waitForTimeout(500);
    const inspector = await rect(page, '.inspector-panel');
    expect(inspector.x + inspector.width).toBeLessThanOrEqual(width - 47 + 1);
    expect(inspector.width).toBeGreaterThanOrEqual(240);
    await page.screenshot({ path: 'test-results/mobile-shell-iphone-land-notch.png' });
    await expectNoOverflow(page);
  } finally { await landscape.close(); }
});
