import { NodeIO } from '@gltf-transform/core';
import Module from 'manifold-3d';
import { definitions } from '../rack-generator/parts/structure.ts';
import { resolveAssembly, validateAssembly } from '../rack-generator/assembly.ts';
import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

test('gym-wave2-logos: text, uploads, rejection, saved source, reset and GLB', async () => {
  test.setTimeout(120000);
  if (!process.env.GYM_LOGO_CDP_URL) throw Error('Start isolated gym-wave2-logos Chrome and set GYM_LOGO_CDP_URL to its CDP endpoint. Serve the production build on port 5305.');
  const browser = await chromium.connectOverCDP(process.env.GYM_LOGO_CDP_URL);
  const page = browser.contexts()[0].pages().find(p => p.url().includes(':5305/builder'))!;
  await page.goto('http://127.0.0.1:5305/builder');
  await expect(page.getByRole('button', { name: 'Export GLB ↗' })).toBeEnabled({ timeout: 20000 });
  await page.locator('.logo-controls summary').click();
  const controls = page.locator('.logo-controls');
  await controls.getByLabel('Logo text').fill('BOS');
  await controls.getByRole('button', { name: 'Validate & preview logo' }).click();
  await expect(controls.getByRole('button', { name: 'Apply logo to rack' })).toBeVisible({ timeout: 15000 });
  await expect(controls).toContainText('bridge');
  await controls.getByRole('button', { name: 'Apply logo to rack' }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Nameplate panel +', exact: true }).click();
  await page.getByRole('button', { name: 'Replace rear crossmember' }).click();
  await expect(page.getByRole('button', { name: 'Export GLB ↗' })).toBeEnabled({ timeout: 20000 });
  for (const filename of ['logo.svg', 'logo.png', 'logo.jpg']) {
    await controls.getByLabel('Logo source').selectOption('svg');
    await controls.getByLabel('Upload logo', { exact: true }).setInputFiles(path.resolve('rack-generator/logos/fixtures', filename));
    await expect(controls.getByLabel('Logo source')).toHaveValue(filename.endsWith('svg') ? 'svg' : 'raster');
    if (!filename.endsWith('svg')) {
      await controls.getByLabel('Logo threshold').fill('140');
      await controls.getByLabel('Logo contrast').fill('1.2');
    }
    await controls.getByRole('button', { name: 'Validate & preview logo' }).click();
    await expect(controls.getByRole('button', { name: 'Apply logo to rack' })).toBeVisible({ timeout: 15000 });
    await expect(controls.getByRole('img', { name: 'Validated cut contour preview' })).toBeVisible();
    await controls.getByRole('button', { name: 'Apply logo to rack' }).click();
  }
  await page.locator('.config-manager summary').click();
  await page.getByLabel('Configuration name').fill('Logo browser fixture');
  await page.getByRole('button', { name: 'Save as new / duplicate' }).click();
  await expect(page.locator('.config-manager summary')).not.toContainText('Unsaved');
  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save JSON', exact: true }).click();
  const json = await jsonDownload; const doc = JSON.parse(await fs.readFile((await json.path())!, 'utf8'));
  expect(doc.logo.source.kind).toBe('raster'); expect(doc.logo.source.threshold).toBe(140); expect(doc.logo.loops.length).toBeGreaterThan(0);
  await controls.getByLabel('Upload logo', { exact: true }).setInputFiles(path.resolve('rack-generator/logos/fixtures/unsafe.svg'));
  await controls.getByRole('button', { name: 'Validate & preview logo' }).click();
  await expect(controls.getByRole('alert')).toContainText('Unsupported SVG <script>');
  await expect(controls.getByRole('button', { name: 'Apply logo to rack' })).toHaveCount(0);
  await controls.getByRole('button', { name: 'Reset stock BOS lettering' }).click();
  await expect(controls.getByRole('button', { name: 'Reset stock BOS lettering' })).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Reset stock BOS lettering' })).toBeEnabled();
  await expect(controls.getByLabel('Logo source')).toHaveValue('raster');
  await page.getByRole('button', { name: 'Load saved version' }).click();
  await expect(page.getByRole('button', { name: 'Export GLB ↗' })).toBeEnabled({ timeout: 20000 });
  const glbDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export GLB ↗' }).click();
  const glb = await glbDownload; const bytes = await fs.readFile((await glb.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe('glTF'); expect(bytes.length).toBeGreaterThan(10000);
  const exported = await new NodeIO().readBinary(bytes);
  const mesh = exported.getRoot().listNodes().find(n => n.getName().includes('stencil'))!.getMesh()!;
  const triangles = mesh.listPrimitives().reduce((n,p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3, 0);
  const instance = resolveAssembly(validateAssembly(doc)).find(r => r.part === 'nameplate')!;
  const api = await Module(); api.setup();
  const parts = definitions.find(d => d.id === 'nameplate')!.build(api, instance.params, instance.logo);
  try { expect(triangles).toBe(parts[0].solid.getMesh().triVerts.length / 3); } finally { parts.forEach(p=>p.solid.delete()); }
  await page.locator('.config-manager summary').click();
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await controls.getByRole('button', { name: 'Validate & preview logo' }).click();
  await expect(controls.getByRole('img', { name: 'Validated cut contour preview' })).toBeVisible();
  await page.screenshot({ path: '/tmp/gym-wave2-logos-browser.png' });
});
