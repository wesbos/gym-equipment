import { test, expect, chromium, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

async function choose(page: Page, format: 'GLB' | '3MF') {
  if (await page.locator('#export').getAttribute('aria-expanded') !== 'true') await page.locator('#export').click();
  await page.getByRole('menuitemradio', { name: new RegExp(format) }).click();
}
async function download(page: Page, name: string) {
  const pending = page.waitForEvent('download', { timeout: 60000 });
  await page.getByRole('button', { name, exact: true }).click();
  const file = await pending;
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

const base = process.env.GYM_EXPORT_MENU_BASE_URL ?? 'http://127.0.0.1:5314';

test('gym-wave2-export_menu: keyboard, memory, failures, cancellation and real downloads', async () => {
  test.setTimeout(180000);
  if (!process.env.GYM_EXPORT_CDP_URL) throw Error('Start agent-browser session gym-wave2-export_menu on :5314 and set GYM_EXPORT_CDP_URL to its CDP endpoint.');
  const browser = await chromium.connectOverCDP(process.env.GYM_EXPORT_CDP_URL);
  const page = browser.contexts()[0].pages().find(p => p.url().startsWith(base))!;
  page.setDefaultTimeout(20000);
  await page.goto(base + '/builder');
  await page.evaluate(() => sessionStorage.removeItem('bos-strength-export-format'));
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const trigger = page.locator('#export'), glb = page.getByRole('menuitemradio', { name: /GLB/ }), print = page.getByRole('menuitemradio', { name: /3MF/ });
  await trigger.focus(); await page.keyboard.press('ArrowDown');
  await expect(glb).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(print).toBeFocused();
  await page.keyboard.press('Home'); await expect(glb).toBeFocused();
  await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await expect(page.getByLabel('Print arrangement', { exact: true })).toBeFocused();
  await page.getByLabel('Print arrangement', { exact: true }).selectOption('assembled');
  await page.getByRole('button', { name: 'Reset print arrangement' }).click();
  await expect(page.getByLabel('Print arrangement', { exact: true })).toHaveValue('laid-out');
  await page.getByLabel('Print arrangement', { exact: true }).selectOption('assembled');
  await page.getByLabel('Print scale', { exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Reset print scale', exact: true }).click();
  await expect(page.getByLabel('Print scale', { exact: true })).toHaveValue('10');
  await expect(page.getByLabel('Print arrangement', { exact: true })).toHaveValue('assembled');
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); await expect(page.getByRole('menu')).toHaveCount(0);
  await trigger.press('ArrowUp'); await page.keyboard.press('g'); await expect(glb).toBeFocused();
  await page.keyboard.press('3'); await expect(print).toBeFocused();
  await page.keyboard.press('Escape');
  const jsonBefore = await download(page, 'Save JSON');

  // A delayed, failing real scene-exporter call exercises the UI's busy/error path.
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(name => name.includes('three_addons_exporters_GLTFExporter__js.js'))!;
    const { GLTFExporter } = await import(url);
    const original = GLTFExporter.prototype.parseAsync;
    GLTFExporter.prototype.parseAsync = () => new Promise((_, reject) => {
      window.addEventListener('reject-test-export', () => {
        GLTFExporter.prototype.parseAsync = original;
        reject(Error('Browser retry check'));
      }, { once: true });
    });
  });
  await choose(page, 'GLB');
  await expect(page.getByRole('button', { name: 'Download GLB', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Download GLB', exact: true }).click();
  await expect(trigger).toHaveText('Exporting GLB…');
  await expect(print).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: 'Preparing…', exact: true })).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event('reject-test-export')));
  await expect(page.locator('#status')).toHaveText('GLB export failed: Browser retry check');
  const scene = await download(page, 'Download GLB');
  expect(scene.name).toBe('bos-strength-rack.glb'); expect(scene.bytes.subarray(0, 4).toString()).toBe('glTF');
  await expect(trigger).toBeFocused();

  await choose(page, '3MF');
  await page.getByRole('button', { name: 'Download 3MF', exact: true }).click();
  await expect(page.getByLabel('Print scale', { exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await trigger.click();
  await page.getByRole('button', { name: 'Cancel export', exact: true }).click();
  await expect(page.locator('#status')).toHaveText('Print export cancelled.');
  await expect(print).toBeFocused();
  for (const layout of ['laid-out', 'assembled']) for (const scale of [10, 20]) {
    await choose(page, '3MF');
    await page.getByLabel('Print arrangement', { exact: true }).selectOption(layout);
    await page.getByLabel('Print scale', { exact: true }).selectOption(String(scale));
    const result = await download(page, 'Download 3MF');
    expect(result.name).toBe(`bos-strength-print-parts-1-${scale}.3mf`);
    const report = JSON.parse(strFromU8(unzipSync(result.bytes)['Metadata/print-report.json']));
    expect(report.layout).toBe(layout); expect(report.scale).toBe(scale);
    expect(report.plates.map((p: {name: string}) => p.name)).toEqual(['Parts', 'Hardware']);
    expect(report.instances).toBeGreaterThan(0);
    await expect(page.locator('#status')).toContainText(`1:${scale} scale`);
    await expect(trigger).toBeFocused();
  }
  await page.reload(); await trigger.click(); await expect(print).toHaveAttribute('aria-checked', 'true'); await expect(print).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await trigger.boundingBox())!.x + (await trigger.boundingBox())!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'docs/evidence/issue-44/export-menu-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/evidence/issue-44/export-menu.png' });
  await page.keyboard.press('Escape');
  const jsonAfter = await download(page, 'Save JSON');
  expect(jsonAfter.name).toBe('bos-strength-rack.json'); expect(jsonAfter.bytes).toEqual(jsonBefore.bytes);
  expect(await page.getByRole('button', { name: 'Export GLB ↗', exact: true }).count()).toBe(0);
  expect(await page.getByRole('button', { name: 'Export 3MF', exact: true }).count()).toBe(0);
});
