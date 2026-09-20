import { test, expect, chromium, devices, type Browser, type Page } from '@playwright/test';
import { addFromGallery } from './part-gallery.ts';

/** Mobile and tablet app shell (#203): iPhone portrait (bottom sheet), iPhone landscape (side sheet) and iPad
 * (collapsible panels) with touch emulation. Serve the builder (e.g. `npx vite --port 5742`) and set
 * GYM_MOBILE_BASE_URL (default http://127.0.0.1:5742). */
const base = process.env.GYM_MOBILE_BASE_URL ?? 'http://127.0.0.1:5742';
let browser: Browser;
test.beforeAll(async () => { browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); });
test.afterAll(async () => { await browser?.close(); });

async function open(device: (typeof devices)[string]) {
  const { defaultBrowserType: _, ...options } = device;
  const context = await browser.newContext({ ...options, hasTouch: true });
  const page = await context.newPage();
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
    await page.locator('#accept-placement').click();
    await expect.poll(() => partCount(page), { timeout: 60000 }).toBe(before + 1);

    // Select from the parts list: the sheet opens on the inspector.
    await page.locator('#parts-toggle').click();
    await page.locator('.bom-row').filter({ hasText: 'Olympic barbell' }).first().click();
    await page.locator('.parts-drawer .drawer-heading button').click();
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
    await page.locator('#accept-placement').click();
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
      await page.locator('#accept-placement').click();
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
