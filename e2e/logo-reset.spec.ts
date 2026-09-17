import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('stock reset clears drafts, cancels async completions, and only records applied changes', async () => {
  test.setTimeout(90000);
  const browser = await chromium.connectOverCDP(process.env.GYM_LOGO_CDP_URL!, { timeout: 15000 });
  console.log('Connected to isolated reset browser');
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(15000);
  await page.addInitScript(() => {
    const state = window as typeof window & { holdLogo: boolean; releaseLogo: () => number };
    const pending: (() => void)[] = [];
    state.holdLogo = false; state.releaseLogo = () => { const jobs = pending.splice(0); jobs.forEach(f => f()); return jobs.length; };
    const text = File.prototype.text;
    File.prototype.text = function () {
      if (!state.holdLogo) return text.call(this);
      return new Promise(resolve => pending.push(() => resolve('<svg><rect width="40" height="20"/></svg>')));
    };
    const read = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (blob) {
      if (!state.holdLogo) return read.call(this, blob);
      const callback = this.onload;
      pending.push(() => { Object.defineProperty(this, 'result', { value: 'data:image/png;base64,AAAA' }); callback?.call(this, new ProgressEvent('load')); });
    };
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      private logo: boolean;
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); this.logo = String(url).includes('logo-worker'); }
      postMessage(message: unknown, options?: StructuredSerializeOptions | Transferable[]) {
        if (!this.logo || !state.holdLogo) return super.postMessage(message, options as StructuredSerializeOptions);
        // Capture the handler, simulating an already-queued reply after termination.
        const reply = this.onmessage, fail = this.onerror;
        pending.push(() => reply?.call(this, new MessageEvent('message', { data: { logo: { version: 1, source: {kind:'text',text:'LATE',font:'helvetiker'}, loops: [[[0,0],[10,0],[10,10],[0,0]]], minimum:.8, bridges:0, warnings:[] } } })));
        pending.push(() => fail?.call(this, new ErrorEvent('error', { message: 'Late worker error' })));
      }
    };
  });
  await page.goto('http://127.0.0.1:5305/builder');
  console.log('Reset fixture loaded');
  await page.locator('.logo-controls summary').click();
  const controls = page.locator('.logo-controls');
  const reset = controls.getByRole('button', { name: 'Reset stock BOS lettering', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeDisabled();
  await controls.getByLabel('Logo text', { exact: true }).fill('DRAFT');
  await controls.getByLabel('Logo font', { exact: true }).selectOption('helvetikerRegular');
  await controls.getByRole('checkbox', { name: 'Automatic island bridges', exact: true }).uncheck();
  await reset.click();
  const defaults = async () => {
    await expect(controls.getByLabel('Logo source', { exact: true })).toHaveValue('text');
    await expect(controls.getByLabel('Logo text', { exact: true })).toHaveValue('MY GYM');
    await expect(controls.getByLabel('Logo font', { exact: true })).toHaveValue('helvetiker');
    await expect(controls.getByRole('checkbox', { name: 'Automatic island bridges', exact: true })).toBeChecked();
    await expect(controls.getByRole('img')).toHaveCount(0);
    await expect(controls.getByRole('alert')).toHaveCount(0);
    await expect(reset).toBeDisabled();
  };
  await defaults(); await expect(undo).toBeDisabled();
  await page.evaluate(() => { (window as any).holdLogo = true; });
  for (const file of ['logo.svg', 'logo.png']) {
    await controls.getByLabel('Logo source', { exact: true }).selectOption('svg');
    await controls.getByLabel('Upload logo', { exact: true }).setInputFiles(path.resolve('rack-generator/logos/fixtures', file));
    await reset.click();
    expect(await page.evaluate(() => (window as any).releaseLogo())).toBe(1);
    await defaults(); await expect(undo).toBeDisabled();
  }
  await controls.getByRole('button', { name: 'Validate & preview logo', exact: true }).click();
  await reset.click();
  expect(await page.evaluate(() => (window as any).releaseLogo())).toBe(2);
  await defaults(); await expect(undo).toBeDisabled();
  console.log('Late file and worker completions ignored');
  await page.evaluate(() => { (window as any).holdLogo = false; });
  await controls.getByLabel('Logo text', { exact: true }).fill('BOS');
  await controls.getByRole('button', { name: 'Validate & preview logo', exact: true }).click();
  await expect(controls.getByRole('img')).toBeVisible({ timeout: 15000 });
  await reset.click(); await defaults(); await expect(undo).toBeDisabled();
  await controls.getByLabel('Logo text', { exact: true }).fill('BOS');
  await controls.getByRole('button', { name: 'Validate & preview logo', exact: true }).click();
  await controls.getByRole('button', { name: 'Apply logo to rack', exact: true }).click({ timeout: 15000 });
  await controls.getByLabel('Logo text', { exact: true }).fill('EDITED');
  await controls.getByRole('checkbox', { name: 'Automatic island bridges', exact: true }).uncheck();
  await reset.click(); await defaults(); await expect(undo).toBeEnabled();
  await undo.click();
  await expect(controls.getByLabel('Logo text', { exact: true })).toHaveValue('BOS');
  await undo.click(); // Undo the original Apply: draft reset added no extra history.
  await defaults(); await expect(undo).toBeDisabled();
  await controls.getByLabel('Logo text', { exact: true }).fill('ANOTHER DRAFT');
  await reset.click(); // Also preserve the existing redo chain.
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(controls.getByLabel('Logo text', { exact: true })).toHaveValue('BOS');
  console.log('Preview reset, applied undo and draft redo verified');
  await context.close(); await browser.close();
});
