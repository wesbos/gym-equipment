import { test, expect, chromium, type Page } from '@playwright/test';
import { createAssembly } from '../rack-generator/assembly.ts';

test('sidebar systems and curated starters: confirmation, valid bay, cancellation and undo', async () => {
  test.setTimeout(180000);
  if (!process.env.GYM_SIDEBAR_CDP_URL) throw Error('Start isolated gym-wave4-sidebar on port 5337 and set GYM_SIDEBAR_CDP_URL.');
  const browser = await chromium.connectOverCDP(process.env.GYM_SIDEBAR_CDP_URL);
  let testPage: Page | undefined;
  try {
    const page = testPage = await browser.contexts()[0].newPage();
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(() => localStorage.removeItem('bos-strength-configurations-v1'));
    await page.goto('http://127.0.0.1:5337/builder');
    const doc = async () => await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('bos-strength-configurations-v1') ?? '{}');
      return c.draft ?? c.configs?.find((s: {id:string}) => s.id === c.activeId)?.doc;
    }) ?? createAssembly();
    const ready = async () => {
      if (await page.locator('#export').getAttribute('aria-expanded') !== 'true') await page.locator('#export').click();
      await page.getByRole('menuitemradio', { name: /GLB/ }).click();
      await expect(page.getByRole('button', { name: 'Download GLB', exact: true })).toBeEnabled({ timeout: 60000 });
      await page.keyboard.press('Escape');
    };
    await ready();
    const sidebar = page.locator('.catalog-panel');
    await expect(sidebar.locator('[data-preset]')).toHaveCount(24);
    for (const part of ['voltra-sliding', 'voltra-adaptive', 'voltra-fixed']) await expect(sidebar.locator(`[data-part="${part}"]`)).toHaveCount(1);
    console.log('Catalog loaded');
    const initial = await doc();
    await sidebar.locator('[data-part="cable-ares2"]').click();
    await expect(page.locator('#placement-text')).toContainText("Doesn't fit:");
    await expect(page.locator('#accept-placement')).toBeDisabled();
    await page.locator('#cancel-placement').click();
    expect(await doc()).toEqual(initial);

    const starter = sidebar.locator('[data-preset="rep-pr-5000-six-2032-1041.4"]');
    await starter.click();
    await expect.poll(async () => (await doc()).profileId).toBe('rep-pr-5000');
    await ready();
    console.log('Six-post starter applied');
    const sixPost = await doc();
    await sidebar.locator('[data-part="cable-ares2"]').click();
    await expect(page.locator('#placement-text')).toContainText('6-post bay');
    await expect(page.locator('#accept-placement')).toBeEnabled();
    expect(await doc()).toEqual(sixPost);
    await page.locator('#cancel-placement').click();
    expect(await doc()).toEqual(sixPost);
    await sidebar.locator('[data-part="cable-ares2"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#placement-hint')).toHaveCount(0);
    expect(await doc()).toEqual(sixPost);
    await sidebar.locator('[data-part="cable-ares2"]').click();
    await page.locator('#accept-placement').click();
    await expect.poll(async () => (await doc()).systems?.[0]?.part).toBe('cable-ares2');
    await ready();
    await page.screenshot({ path: '/tmp/gym-wave4/sidebar-ares-installed.png' });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(doc).toEqual(sixPost);
    await ready();
    await sidebar.locator('[data-part="cable-ares2"]').click();
    await expect(sidebar.locator('[data-part="cable-ares2"] [data-thumbnail="ready"]')).toBeVisible({ timeout: 60000 });
    await page.screenshot({ path: '/tmp/gym-wave4/sidebar-ares-preview.png' });
    await page.locator('#cancel-placement').click();
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect.poll(async () => (await doc()).systems?.length).toBe(1);
    console.log('ARES applied and undo/redo verified');
    const withAres = await doc();

    page.once('dialog', async dialog => { expect(dialog.message()).toContain('unsaved'); await dialog.dismiss(); });
    await sidebar.locator('[data-preset="rep-pr-5000-four-2362.2-762"]').click();
    expect(await doc()).toEqual(withAres);
    page.once('dialog', async dialog => { await dialog.accept(); });
    await sidebar.locator('[data-preset="rep-pr-5000-four-2362.2-762"]').click();
    await expect.poll(async () => (await doc()).rack.height).toBe(2362.2);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(doc).toEqual(withAres);

    await sidebar.getByText('More configurations', { exact: true }).click();
    await sidebar.getByLabel('Rack profile', { exact: true }).selectOption('rep-pr-4000-four-2032-609.6');
    page.once('dialog', async dialog => { await dialog.dismiss(); });
    await sidebar.getByRole('button', { name: 'Apply rack profile', exact: true }).click();
    expect(await doc()).toEqual(withAres);
    page.once('dialog', async dialog => { await dialog.accept(); });
    await sidebar.getByRole('button', { name: 'Apply rack profile', exact: true }).click();
    await expect.poll(async () => (await doc()).profileId).toBe('rep-pr-4000');
    await expect.poll(async () => (await doc()).rack.depth).toBe(609.6);
    await sidebar.getByText('More configurations', { exact: true }).click();
    await sidebar.locator('[data-part="cable-athena"]').click();
    await expect(page.locator('#placement-text')).toContainText('six posts');
    await expect(page.locator('#accept-placement')).toBeDisabled();
    await page.locator('#cancel-placement').click();
    await ready();
    await sidebar.locator('#catalog').evaluate(el => el.scrollTop = 0);
    console.log('Dirty confirmation and long-tail presets verified');
    await page.screenshot({ path: '/tmp/gym-wave4/sidebar-starters.png' });
  } finally {
    try { await testPage?.close({ runBeforeUnload: false }); } finally { await browser.close(); }
  }
});
