/** Screenshot parts from the /parts/:id viewer for visual review against product photos.
 *
 *   npx tsx scripts/shoot-part.ts [--port 5400] [--out /tmp/shots] [--views iso,front,side,top] <part>[@key=value,…] …
 *
 * Starts its own Vite dev server on --port (pick a free, unique one per worktree), opens each part, applies any
 * @key=value params through the viewer's fields, waits for the Manifold build, and writes <out>/<part>[-params]-<view>.png.
 * Read the PNGs back to compare silhouettes, proportions and colours with the reference photos. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
const args = process.argv.slice(2), flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`); if (i < 0) return fallback; const [value] = args.splice(i, 2).slice(1); return value;
};
const port = Number(flag('port', '5400')), out = flag('out', '/tmp/shots'), views = flag('views', 'iso,front,side,top').split(',');
if (!args.length) throw Error('Pass at least one part id.');
mkdirSync(out, { recursive: true });
const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] });
const base = `http://127.0.0.1:${port}`;
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(Error('Vite did not start within 60 s.')), 60000);
  server.stdout!.on('data', (chunk: Buffer) => { if (chunk.toString().includes(String(port))) { clearTimeout(timer); resolve(); } });
  server.on('exit', code => reject(Error(`Vite exited (${code}); is port ${port} taken?`)));
});
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.setDefaultTimeout(120000);
  for (const spec of args) {
    const [part, query = ''] = spec.split('@');
    await page.goto(`${base}/parts/${part}`);
    const built = async () => { await page.waitForFunction(() => /solids/.test(document.querySelector('#status')?.textContent ?? '') || document.querySelector('#status.error'), undefined, { timeout: 120000 }); };
    await built();
    for (const pair of query.split(',').filter(Boolean)) {
      const [key, value] = pair.split('=');
      let field = page.locator(`#fields [name="${key}"]`).first();
      // Preset-button params keep a hidden input; open "Custom" to get the numeric field.
      if (await field.getAttribute('type') === 'hidden') {
        await page.locator('#fields label', { has: page.locator(`[name="${key}"]`) }).locator('.custom-size').click();
        field = page.locator(`#fields input[name="${key}"]:not([type="hidden"])`).first();
      }
      if (await field.evaluate(el => el.tagName) === 'SELECT') await field.selectOption(value); else { await field.fill(value); await field.press('Enter'); }
      await page.waitForTimeout(300);
      await page.locator('form button.primary').click();
      await page.waitForTimeout(300);
      await built();
    }
    const status = await page.locator('#status').textContent();
    if (await page.locator('#status.error').count()) console.error(`${spec}: ${status}`);
    for (const view of views) {
      await page.locator(`[data-view="${view}"]`).click();
      await page.waitForTimeout(700);
      const file = `${out}/${part}${query ? '-' + query.replace(/[^a-z0-9.=-]+/gi, '_') : ''}-${view}.png`;
      await page.locator('#viewport').screenshot({ path: file });
      console.log(file);
    }
    console.log(`${spec}: ${status} · ${await page.locator('.part-description, #description').first().textContent().catch(() => '')}`);
  }
} finally { await browser.close(); server.kill(); }
