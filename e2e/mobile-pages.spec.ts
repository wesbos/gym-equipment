import { test, expect, chromium, devices, type Browser, type Page } from '@playwright/test';

/** Phone and tablet polish for every page but the builder (#207): the part viewer, the parts library, the gym gallery and
 * a gym, and the parts gallery overlay, at iPhone SE, iPhone 14, iPhone 14 Pro Max (portrait and landscape) and iPad
 * (both orientations), with touch. Each page must not scroll sideways, and every visible control must be a 44 px target.
 * Start `npx vite --port 5781` and set GYM_MOBILE_URL=http://127.0.0.1:5781. */
const DEVICES = {
  'iPhone SE': devices['iPhone SE (3rd gen)'],
  'iPhone 14': devices['iPhone 14'],
  'iPhone 14 Pro Max': devices['iPhone 14 Pro Max'],
  'iPhone 14 landscape': devices['iPhone 14 landscape'],
  'iPad': devices['iPad (gen 7)'],
  'iPad landscape': devices['iPad (gen 7) landscape'],
};
const PART = 'rogue-echo-bike', GYM = 'coop-garage-gym-reviews';

function base() {
  const url = process.env.GYM_MOBILE_URL;
  if (!url) throw Error('Start a Vite server (e.g. `npx vite --port 5781`) and set GYM_MOBILE_URL.');
  return url;
}

/** Page-level layout checks: no sideways scroll, and every visible control (inside `scope`) is at least 44 × 44 px.
 * Inline links inside running text are exempt (WCAG 2.5.8), as are checkboxes wrapped in their (checked) label. */
async function layout(page: Page, scope = 'body') {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector) ?? document.body;
    const small: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('a[href], button, input:not([type=hidden]), select, label:has(input[type=checkbox]), summary')) {
      const r = el.getBoundingClientRect(), style = getComputedStyle(el);
      if (!r.width || !r.height || style.visibility === 'hidden' || el.closest('[inert]')) continue;
      if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      if (el.tagName === 'A' && style.display === 'inline' && el.closest('p, li')) continue;
      if (el.matches('input[type=checkbox]') && el.closest('label')) continue;
      if (r.width < 43.5 || r.height < 43.5)
        small.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return { overflow: document.documentElement.scrollWidth - innerWidth, height: document.documentElement.scrollHeight, small };
  }, scope);
}

async function expectLayout(page: Page, scope?: string) {
  const result = await layout(page, scope);
  expect(result.overflow, 'no horizontal overflow').toBeLessThanOrEqual(0);
  expect(result.small, 'touch targets under 44 px').toEqual([]);
  return result;
}

/** Counts animation frames over `ms`: an idle page must not re-render continuously. */
async function framesDuring(page: Page, ms: number) {
  return page.evaluate(async (duration) => {
    const w = window as unknown as { __frames: number };
    const start = w.__frames;
    await new Promise(resolve => setTimeout(resolve, duration));
    return w.__frames - start;
  }, ms);
}

let browser: Browser;
test.beforeAll(async () => {
  browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
});
test.afterAll(async () => { await browser?.close(); });

for (const [name, { defaultBrowserType: _, ...device }] of Object.entries(DEVICES)) {
  test.describe(name, () => {
    const phone = device.viewport.width <= 760 || device.viewport.height <= 520;

    test('part viewer: full-screen viewer, drawer, parameters, on-demand rendering', async () => {
      test.setTimeout(120000);
      const context = await browser.newContext({ ...device, hasTouch: true });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(String(error)));
        // Count frames that actually run, so an idle viewer can be told apart from a render loop.
        await page.addInitScript(() => {
          const w = window as unknown as { __frames: number };
          w.__frames = 0;
          const raf = window.requestAnimationFrame.bind(window);
          window.requestAnimationFrame = callback => raf(time => { w.__frames++; callback(time); });
        });
        await page.goto(`${base()}/parts/${PART}`);
        await expect(page.locator('#status')).toContainText('triangles');
        await expect(page.locator('#model-title')).toHaveText(/Echo Bike/);
        await expect(page.locator('#viewport canvas')).toHaveCSS('touch-action', 'none');
        await page.waitForTimeout(800);
        expect(await framesDuring(page, 1000), 'idle viewer renders nothing').toBeLessThan(3);

        const result = await expectLayout(page);
        if (phone) {
          // The page is the viewer: no 26,000 px scroll, the canvas takes most of the screen.
          expect(result.height).toBeLessThanOrEqual(device.viewport.height + 1);
          const canvas = (await page.locator('#viewport canvas').boundingBox())!;
          expect(canvas.height * canvas.width).toBeGreaterThan(device.viewport.width * device.viewport.height * 0.4);
          // The title chip sits under the view tools instead of over the model.
          const tools = (await page.locator('.view-tools').boundingBox())!, chip = (await page.locator('.model-caption').boundingBox())!;
          expect(chip.y).toBeGreaterThanOrEqual(tools.y + tools.height);
          expect(chip.height).toBeLessThan(44);
        }

        // Orbit by touch: one-finger drag moves the camera, frames run while it settles, then stop again.
        const box = (await page.locator('#viewport canvas').boundingBox())!;
        const before = await framesDuring(page, 50);
        const cdp = await context.newCDPSession(page);
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 12, y: cy }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        expect(await framesDuring(page, 300)).toBeGreaterThan(before);
        await page.waitForTimeout(4000);
        expect(await framesDuring(page, 1000), 'damping settles, then rendering stops').toBeLessThan(3);

        // The part list: a drawer below 1050 px (and on landscape phones), with a working search.
        const toggle = page.locator('.drawer-toggle');
        if (await toggle.isVisible()) {
          await expect(page.locator('#parts-drawer')).toBeHidden();
          await toggle.tap();
          await expect(page.locator('#parts-drawer')).toBeVisible();
          await expectLayout(page, '#parts-drawer');
          await page.locator('#search').fill('425');
          await page.locator('#catalog').getByRole('button', { name: '425 mm crossmember' }).tap();
          await expect(page).not.toHaveURL(new RegExp(`/parts/${PART}$`));
          await expect(page.locator('#parts-drawer')).toBeHidden();
          await expect(page.locator('#model-title')).toHaveText('425 mm crossmember');
        } else {
          await page.locator('#catalog').getByRole('button', { name: '425 mm crossmember' }).tap();
          await expect(page).not.toHaveURL(new RegExp(`/parts/${PART}$`));
        }
        await expect(page.locator('#status')).toContainText('triangles');

        // Parameters: a bottom sheet on portrait phones, always shown elsewhere.
        const sheet = page.locator('#sheet-toggle');
        if (await sheet.isVisible()) {
          await expect(page.locator('#fields')).toBeHidden();
          await sheet.tap();
          await expect(sheet).toHaveAttribute('aria-expanded', 'true');
        }
        await expect(page.locator('#fields')).toBeVisible();
        await expect(page.locator('#reset')).toBeVisible();
        await expectLayout(page);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    });

    test('library, gyms and a gym: no overflow, 44 px targets, taps navigate', async () => {
      test.setTimeout(120000);
      const context = await browser.newContext({ ...device, hasTouch: true });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        await page.goto(`${base()}/library`);
        await expect(page.locator('.gallery-card').first()).toBeVisible();
        await expectLayout(page);
        // Thumbnails have a fixed box, so cards do not move as images arrive.
        const card = page.locator('.gallery-card').nth(1), top = (await card.boundingBox())!.y;
        await expect(page.locator('.gallery-card .part-thumbnail img').first()).toBeVisible();
        expect((await card.boundingBox())!.y).toBe(top);
        await page.locator('.library-gallery input[type=search]').fill('echo bike');
        await page.locator('.gallery-card', { hasText: 'Echo Bike V3.0' }).first().tap();
        await expect(page).toHaveURL(/\/parts\/rogue-echo-bike/);

        await page.goto(`${base()}/gyms`);
        await expect(page.locator('.gym-card').first()).toBeVisible();
        await expectLayout(page);
        const image = page.locator('.gym-card-image').first();
        const ratio = await image.evaluate(el => el.getBoundingClientRect().width / el.getBoundingClientRect().height);
        expect(ratio).toBeCloseTo(1.5, 1);
        await page.locator('.gym-card', { hasText: 'Coop' }).getByRole('link', { name: 'Equipment list' }).tap();
        await expect(page).toHaveURL(new RegExp(`/gyms/${GYM}$`));
        await expect(page.locator('.gym-equipment li').first()).toBeVisible();
        await expectLayout(page);
        await expect(page.locator('.gym-open')).toHaveAttribute('href', new RegExp(`gym=${GYM}`));
      } finally {
        await context.close();
      }
    });

    test('parts gallery overlay: fits the screen, 44 px targets, touch browsing', async () => {
      test.setTimeout(120000);
      const context = await browser.newContext({ ...device, hasTouch: true });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        await page.addInitScript(() => localStorage.removeItem('bos-strength-part-gallery-v1'));
        await page.goto(`${base()}/`);
        const launcher = page.locator('#open-gallery');
        await expect(page.locator('#root')).not.toBeEmpty();
        if (await launcher.isVisible().catch(() => false)) await launcher.tap();
        else await page.locator('body').press('/');
        const gallery = page.locator('.part-gallery');
        await expect(gallery.locator('.pg-card').first()).toBeVisible();
        // Let the open animation (a 10 px rise) finish before measuring.
        await gallery.locator('.pg-panel').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
        const panel = (await gallery.locator('.pg-panel').boundingBox())!;
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(device.viewport.width + 0.5);
        expect(panel.y + panel.height).toBeLessThanOrEqual(device.viewport.height + 0.5);
        // At least one full card row is on screen above the detail pane.
        const grid = (await gallery.locator('.pg-scroller').boundingBox())!;
        expect(grid.height).toBeGreaterThan(160);
        await expectLayout(page, '.part-gallery');

        await gallery.getByRole('button', { name: /^Benches/ }).tap();
        await expect(gallery.locator('.pg-status')).toContainText('Benches');
        await gallery.locator('.pg-card-info').first().tap();
        const name = await gallery.locator('.pg-card').first().getAttribute('aria-label');
        await expect(gallery.locator('#pg-detail-name')).toHaveText(name!);
        await gallery.getByRole('button', { name: /^All parts/ }).tap();
        await gallery.locator('#gallery-search').fill('echo bike');
        await expect(gallery.locator('[data-part="rogue-echo-bike"]')).toBeVisible();
        await gallery.getByRole('button', { name: 'Close parts gallery' }).tap();
        await expect(gallery).toHaveCount(0);
      } finally {
        await context.close();
      }
    });
  });
}
