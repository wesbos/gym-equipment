/** Design review screenshots: the same eight views for every design direction.
 *
 *   npx vite build && npx vite preview --port 5801 &
 *   npx tsx scripts/design-shots.ts --url http://127.0.0.1:5801 --out <dir> [--only 1,3]
 *
 * Writes 01-desktop-rack.png … 08-phone-gallery.png (convert to JPEG afterwards). Metal GPU, like scripts/perf.ts. */
import { mkdirSync } from 'node:fs';
import { chromium, devices, type Page, type BrowserContext } from '@playwright/test';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const base = flag('url', 'http://127.0.0.1:5801')!, out = flag('out', 'test-results/design')!;
const only = flag('only')?.split(',').map(Number);
const want = (n: number) => !only || only.includes(n);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ready = async (page: Page) => {
  await page.waitForSelector('#viewport canvas', { timeout: 90000 });
  await page.locator('#status').filter({ hasText: /\d+ parts/ }).waitFor({ timeout: 90000 });
  await page.waitForTimeout(2500);
};
async function desktop() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => { localStorage.clear(); });
  return context;
}
async function phone() {
  const { defaultBrowserType: _, ...options } = devices['iPhone 14'];
  const context = await browser.newContext({ ...options, hasTouch: true });
  await context.addInitScript(() => { localStorage.clear(); });
  return context;
}
const shot = (page: Page, name: string) => page.screenshot({ path: `${out}/${name}.png` });
async function selectFromOutliner(page: Page, text: RegExp) {
  await page.locator('#parts-toggle').click();
  const row = page.locator('#outliner .ol-row[data-instance-id]').filter({ hasText: text }).first();
  await row.click();
}
async function addFromGallery(page: Page, part: string, launcher: string) {
  await page.locator(launcher).click();
  await page.locator('#gallery-search').fill(part.replaceAll('-', ' '));
  await page.locator(`.part-gallery [data-part="${part}"]`).first().click();
  await page.waitForTimeout(600);
  const touch = page.locator('#touch-place');
  await (await touch.isVisible() ? touch : page.locator('#accept-placement')).click();
  await page.waitForTimeout(1500);
}

/** The visible "Add parts" launcher: the top bar button, or the sidebar launcher where the top bar hides it. */
async function openGalleryButton(page: Page) {
  const top = page.locator('.toolbar-add');
  await (await top.isVisible() ? top : page.locator('#open-gallery')).click();
}
let ctx: BrowserContext;
if (want(1) || want(3) || want(4)) {
  ctx = await desktop();
  const page = await ctx.newPage();
  await page.goto(base + '/'); await ready(page);
  if (want(1)) await shot(page, '01-desktop-rack');
  if (want(3)) {
    await selectFromOutliner(page, /J-hook/i);
    await page.locator('#parts-toggle').click();
    await page.mouse.move(720, 450);
    await page.waitForTimeout(800);
    await shot(page, '03-desktop-selected');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  if (want(4)) {
    await openGalleryButton(page);
    await page.waitForSelector('.part-gallery .pg-card');
    await page.waitForTimeout(2500);
    await shot(page, '04-desktop-gallery');
  }
  await ctx.close();
}
if (want(9)) {
  ctx = await desktop();
  const page = await ctx.newPage();
  await page.goto(base + '/'); await ready(page);
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.waitForTimeout(400);
  await shot(page, '09-desktop-menu');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Timeline panel' }).click();
  await page.waitForTimeout(400);
  await shot(page, '10-desktop-timeline');
  await ctx.close();
  const tablet = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1, hasTouch: true });
  await tablet.addInitScript(() => { localStorage.clear(); });
  const tp = await tablet.newPage();
  await tp.goto(base + '/'); await ready(tp);
  await shot(tp, '11-tablet');
  await tablet.close();
}
if (want(2)) {
  ctx = await desktop();
  const page = await ctx.newPage();
  await page.goto(base + '/?gym=coop-garage-gym-reviews'); await ready(page);
  await page.waitForTimeout(2500);
  await shot(page, '02-desktop-coop');
  await ctx.close();
}
if (want(5)) {
  ctx = await desktop();
  const page = await ctx.newPage();
  await page.goto(base + '/gyms');
  await page.waitForTimeout(3500);
  await shot(page, '05-desktop-gyms');
  await ctx.close();
}
if (want(6) || want(7) || want(8)) {
  ctx = await phone();
  const page = await ctx.newPage();
  await page.goto(base + '/'); await ready(page);
  if (want(6)) await shot(page, '06-phone-rack');
  if (want(7)) {
    await addFromGallery(page, 'rogue-adjustable-bench-3', '.toolbar-add');
    await selectFromOutliner(page, /bench/i);
    await page.getByRole('tab', { name: 'Inspector' }).click();
    const handle = page.getByRole('slider', { name: 'Panel size' });
    await handle.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowUp');
    await handle.blur();
    await page.waitForTimeout(900);
    await shot(page, '07-phone-inspector');
    await page.keyboard.press('Escape');
    await handle.focus(); await page.keyboard.press('Home');
    await page.waitForTimeout(500);
  }
  if (want(8)) {
    await page.locator('.toolbar-add').click();
    await page.waitForSelector('.part-gallery .pg-card');
    await page.waitForTimeout(2500);
    await shot(page, '08-phone-gallery');
  }
  await ctx.close();
}
await browser.close();
