/** Render the gym gallery previews (#184) from the real builder.
 *
 *   npx tsx scripts/render-gym-previews.ts [--port 5661] [--base http://127.0.0.1:5661] [--view iso] [--zoom 1.5] [slug[=zoom] …]
 *
 * With no slugs it renders every src/gyms/data/<slug>.json (at the zooms in ZOOMS below).
 * The builder's fit leaves a margin around the whole room, so the camera then dollies in by `zoom` (a per-gym
 * `slug=1.8` or ZOOMS entry overrides --zoom); closer is also clearer, since the scene fog starts at 18 m. Each gym opens through the builder's own
 * `/?gym=<slug>` entry point in a fresh browser context (so nothing is saved over), the panels are hidden so the
 * 3D stage fills a 3:2 frame, and the stage is saved as public/gyms/<slug>.webp, re-encoded until it's under
 * ~150 KB. Starts its own Vite dev server on --port unless --base points at one that is already running. */
import { spawn, type ChildProcess } from 'node:child_process';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const [value] = args.splice(i, 2).slice(1);
  return value;
};
const port = Number(flag('port', '5661')), view = flag('view', 'iso'), external = flag('base', ''), defaultZoom = Number(flag('zoom', '1.5'));
/** Per-gym dolly factors, tuned by eye so each gym fills its card. */
const ZOOMS: Record<string, number> = {
  'b3-brian-s-barbells-and-brewskis': 1.7,
  'cable-compound': 1.6,
  'erik-mains-s-gym': 1.9,
  'fe-strength-lab': 1.8,
};
const base = external || `http://127.0.0.1:${port}`;
const WIDTH = 1200, HEIGHT = 800, MAX_BYTES = 150 * 1024;
const root = fileURLToPath(new URL('../', import.meta.url));
const specs = args.length ? args : readdirSync(`${root}src/gyms/data`).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort();
const slugs = specs.map(spec => spec.split('=')[0]);
const zoomOf = (slug: string) => Number(specs.find(spec => spec.startsWith(`${slug}=`))?.split('=')[1] ?? ZOOMS[slug] ?? defaultZoom);
if (!slugs.length) throw Error('No gyms to render.');
mkdirSync(`${root}public/gyms`, { recursive: true });

let server: ChildProcess | undefined;
if (!external) {
  server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Vite did not start within 60 s.')), 60000);
    server!.stdout!.on('data', (chunk: Buffer) => { if (chunk.toString().includes(String(port))) { clearTimeout(timer); resolve(); } });
    server!.on('exit', code => reject(Error(`Vite exited (${code}); is port ${port} taken?`)));
  });
}

/** Only the 3D stage: panels, toolbars and overlays hide, and the stage fills the page. */
const STAGE_ONLY = `
  .builder-page .builder-shell { display: block !important; height: 100dvh !important; }
  .builder-page .builder-shell > :not(.stage) { display: none !important; }
  .builder-page .stage { position: fixed !important; inset: 0 !important; }
  .builder-page .stage > :not(#viewport) { display: none !important; }
  .builder-page #viewport { position: absolute !important; inset: 0 !important; }`;

async function settle(page: Page) {
  // The scene reports "<n> parts · …" once every piece is built; wait for it to stay put.
  await page.waitForFunction(() => {
    const text = document.querySelector('#status')?.textContent ?? '';
    return /\d+ parts/.test(text) || document.querySelector('#status.error');
  }, undefined, { timeout: 180000 });
  let last = '';
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const text = (await page.locator('#status').textContent()) ?? '';
    if (text === last && /\d+ parts/.test(text)) break;
    last = text;
  }
}

async function toWebp(page: Page, png: Buffer) {
  for (const quality of [0.86, 0.8, 0.74, 0.68, 0.6, 0.52, 0.45]) {
    const dataUrl = await page.evaluate(async ({ src, quality, width, height }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL('image/webp', quality);
    }, { src: `data:image/png;base64,${png.toString('base64')}`, quality, width: WIDTH, height: HEIGHT });
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    if (bytes.length <= MAX_BYTES || quality === 0.45) return { bytes, quality };
  }
  throw Error('unreachable');
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
try {
  // Warm Vite's module graph once; a cold dev server can take over a minute to serve the builder.
  const warm = await browser.newPage();
  await warm.goto(`${base}/`, { timeout: 300000 });
  await warm.waitForFunction(() => /\d+ parts/.test(document.querySelector('#status')?.textContent ?? ''), undefined, { timeout: 300000 }).catch(() => {});
  await warm.close();
  for (const slug of slugs) {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    try {
      await page.goto(`${base}/?gym=${encodeURIComponent(slug)}`);
      await page.waitForFunction(() => !new URLSearchParams(location.search).has('gym'), undefined, { timeout: 180000 });
      await settle(page);
      const status = (await page.locator('#status').textContent()) ?? '';
      if (await page.locator('#status.error').count()) throw Error(status);
      await page.addStyleTag({ content: STAGE_ONLY });
      await page.waitForTimeout(400);
      // Reframe for the full-page stage (the buttons still work while hidden).
      await page.locator(`[data-view="${view}"]`).evaluate((button: HTMLButtonElement) => button.click());
      await page.waitForTimeout(1200);
      // OrbitControls dollies by 0.95 per 100 px wheel notch, toward the fitted target at the frame centre.
      const zoom = zoomOf(slug), notches = Math.round(Math.log(1 / zoom) / Math.log(0.95));
      await page.mouse.move(WIDTH / 2, HEIGHT / 2);
      for (let i = 0; i < notches; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); }
      await page.waitForTimeout(1500);
      const png = await page.locator('#viewport').screenshot({ type: 'png' });
      const { bytes, quality } = await toWebp(page, png);
      writeFileSync(`${root}public/gyms/${slug}.webp`, bytes);
      console.log(`${slug}: ${status} → public/gyms/${slug}.webp (${Math.round(bytes.length / 1024)} KB, q${quality}, zoom ${zoom})`);
    } catch (error) {
      failed++;
      console.error(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  server?.kill();
}
if (failed) process.exit(1);
