import { test, expect, chromium, type Page } from '@playwright/test';
import { addFromGallery, openGallery } from './part-gallery.ts';

/** Parts gallery (#183): open, browse, search, filter, keyboard, add floor / rack / hang parts, drag, recents and
 * favourites, narrow screens. Start `npx vite --port 5651` and set GYM_GALLERY_URL=http://127.0.0.1:5651. */
test('parts gallery: browse, search, filter, keyboard, add, drag, recents and favourites', async () => {
  test.setTimeout(240000);
  const base = process.env.GYM_GALLERY_URL;
  if (!base) throw Error('Start a Vite server (e.g. on port 5651) and set GYM_GALLERY_URL.');
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(30000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => { if (!sessionStorage.getItem('gallery-spec')) { localStorage.clear(); sessionStorage.setItem('gallery-spec', '1'); } });
    await page.goto(`${base}/builder`);
    const doc = (p: Page) => p.evaluate(() => { const c = JSON.parse(localStorage.getItem('bos-strength-configurations-v1') ?? '{}'); return c.draft ?? c.configs?.find((s: { id: string }) => s.id === c.activeId)?.doc ?? {}; });
    const gallery = page.locator('.part-gallery');

    // Compact sidebar: launcher, quick picks, starters, category shortcuts; no full catalog list.
    const sidebar = page.locator('.catalog-panel');
    await expect(sidebar.locator('#open-gallery')).toBeVisible();
    await expect(sidebar.locator('.compact-section h3').first()).toHaveText('Quick picks');
    expect(await sidebar.locator('[data-part]').count()).toBeLessThan(12);
    await expect(sidebar.locator('[data-preset]').first()).toBeVisible();

    // "/" opens the gallery with the search focused; Escape closes it and nothing in the builder changes.
    const initial = await doc(page);
    await page.locator('body').press('/');
    await expect(page.getByRole('dialog', { name: 'Add parts' })).toBeVisible();
    await expect(page.locator('#gallery-search')).toBeFocused();
    await expect(page.locator('.builder-shell')).toHaveAttribute('inert', '');
    const total = Number((await page.locator('.pg-nav-item', { hasText: 'All parts' }).locator('.pg-count').textContent()));
    expect(total).toBeGreaterThan(400);
    // Windowed: a few dozen cards mounted, not the whole catalog.
    expect(await gallery.locator('[data-part]').count()).toBeLessThan(80);
    await page.keyboard.press('Escape');
    await expect(gallery).toHaveCount(0);
    await expect(page.locator('.builder-shell')).not.toHaveAttribute('inert', '');
    expect(await doc(page)).toEqual(initial);

    // Category nav, section nav, brand chips, fit filter.
    await page.keyboard.press('a');
    await page.locator('.pg-nav-item', { hasText: 'Rack attachments' }).click();
    await page.locator('.pg-nav-item', { hasText: 'J-cups & safeties' }).click();
    await expect(page.locator('.pg-status')).toContainText('J-cups & safeties');
    await expect(page.locator('.pg-fit')).toContainText('Fits my rack');
    await page.locator('.pg-chip', { hasText: 'Rogue Fitness' }).click();
    for (const brand of await gallery.locator('.pg-card-brand').allTextContents()) expect(brand).toBe('Rogue Fitness');
    await page.locator('.pg-chip-clear').click();
    await page.locator('.pg-nav-item', { hasText: 'Cardio' }).click();
    await expect(gallery.locator('[data-part="concept2-rowerg"]')).toBeVisible();
    await expect(page.locator('.pg-fit')).toHaveCount(0); // only shown where rack attachments are in scope

    // Search is instant and ranks name matches; Enter adds the first result.
    await page.locator('.pg-nav-item', { hasText: 'All parts' }).click();
    await page.locator('#gallery-search').fill('olympic barbell');
    await expect(gallery.locator('[data-part]').first()).toHaveAttribute('data-part', 'olympic-barbell');
    await page.locator('#gallery-search').press('Enter');
    await expect(gallery).toHaveCount(0);
    await expect(page.locator('#placement-hint')).toBeVisible();
    await page.locator('#accept-placement').click();
    await expect.poll(async () => (await doc(page)).floorItems?.some((f: { part: string }) => f.part === 'olympic-barbell')).toBe(true);

    // Keyboard: arrow from the search into the grid; the detail pane follows focus; F favourites; Enter adds.
    await openGallery(page, 'j hook');
    await expect(page.locator('.pg-status')).toContainText('“j hook”');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.pg-card:focus')).toHaveCount(1);
    await page.keyboard.press('ArrowRight');
    const focused = await page.locator('.pg-card:focus').getAttribute('data-part');
    await expect(page.locator('.pg-detail h3')).toHaveText((await page.locator('.pg-card:focus').getAttribute('aria-label'))!);
    await page.keyboard.press('f');
    await expect(page.locator('.pg-cell[aria-selected="true"] .pg-card-fav')).toBeVisible();
    await page.keyboard.press('Escape');

    // Rack attachment pair from the detail pane.
    await openGallery(page, 'ghost roller');
    await gallery.locator('[data-part="ghost-strong-ghost-roller-j-cup"]').focus();
    await expect(page.locator('.pg-detail')).toContainText('Fits your rack');
    await expect(page.locator('.pg-dims')).toContainText('upright hole');
    await page.locator('#gallery-add-pair').click();
    await page.locator('#accept-placement').click();
    await expect.poll(async () => (await doc(page)).accessories?.some((a: { part: string; paired: boolean }) => a.part === 'ghost-strong-ghost-roller-j-cup' && a.paired)).toBe(true);

    // Wall panel, then a hang item on it.
    await addFromGallery(page, 'pegboard-panel', 'pegboard');
    await page.locator('#accept-placement').click();
    await expect.poll(async () => (await doc(page)).wallItems?.length ?? 0).toBeGreaterThan(0);
    await openGallery(page);
    await page.locator('.pg-nav-item', { hasText: 'Cable attachments' }).click();
    await gallery.locator('[data-part="rep-tricep-rope"]').click();
    await expect(page.locator('#placement-text')).toContainText('hook');
    await page.locator('#accept-placement').click();
    await expect.poll(async () => (await doc(page)).hangItems?.some((h: { part: string }) => h.part === 'rep-tricep-rope')).toBe(true);

    // Drag a card into the viewport: the gallery fades out of the way and the drop places the part there.
    await openGallery(page, 'rogue kettlebell');
    const card = (await gallery.locator('[data-part="rogue-kettlebell"]').boundingBox())!;
    await page.mouse.move(card.x + 60, card.y + 60); await page.mouse.down();
    for (let i = 1; i <= 5; i++) await page.mouse.move(card.x + 60 + i * 8, card.y + 60 + i * 8);
    await expect(gallery).toHaveClass(/pg-dragging/);
    for (let i = 1; i <= 10; i++) await page.mouse.move(card.x + (420 - card.x) * i / 10, card.y + (700 - card.y) * i / 10);
    await page.mouse.up();
    await expect(gallery).toHaveCount(0);
    await expect.poll(async () => (await doc(page)).floorItems?.some((f: { part: string }) => f.part === 'rogue-kettlebell')).toBe(true);

    // Recents and favourites persist, in the sidebar and the gallery.
    await page.reload();
    await expect(sidebar.locator('.compact-section h3')).toContainText(['Favourites', 'Recent']);
    await expect(sidebar.locator(`.compact-section [data-part="${focused}"]`)).toBeVisible();
    await expect(sidebar.locator('.compact-section [data-part="rep-tricep-rope"]')).toBeVisible();
    await openGallery(page);
    await page.locator('.pg-nav-item', { hasText: 'Recent' }).click();
    await expect(gallery.locator('[data-part]').first()).toHaveAttribute('data-part', 'rogue-kettlebell');
    await page.keyboard.press('Escape');

    // Narrow screens: a full-screen sheet with a category strip.
    await page.setViewportSize({ width: 390, height: 844 });
    await openGallery(page);
    const panel = (await page.locator('.pg-panel').boundingBox())!;
    expect(panel.width).toBeLessThanOrEqual(390);
    await page.locator('.pg-nav-item', { hasText: 'Benches' }).click();
    await expect(gallery.locator('.pg-row').first().locator('[data-part]')).toHaveCount(2);
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
