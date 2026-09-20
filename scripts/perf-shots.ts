/** Builder screenshots for before/after render comparisons: default, heavy, selected part, placing ghost.
 *
 *   npx tsx scripts/perf-shots.ts --dist dist --port 5622 --out shots/after [--headed]
 *
 * Pair with a second run against another build, then compare the PNGs pixel by pixel (see --compare). */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { createAssembly } from '../rack-generator/assembly.ts';
import { addFloorItem } from '../rack-generator/floor-items.ts';
import { addWallItem } from '../rack-generator/wall-items.ts';
import type { RackDoc } from '../rack-generator/types.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const compare = flag('compare');

async function diff(page: Page, a: string, b: string) {
  const [x, y] = [a, b].map(f => 'data:image/png;base64,' + readFileSync(f).toString('base64'));
  return page.evaluate(`(async () => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [a, b] = await Promise.all([load(${JSON.stringify(x)}), load(${JSON.stringify(y)})]);
    const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
    const p = px(a), q = px(b); let changed = 0, max = 0, sum = 0;
    for (let i = 0; i < p.length; i += 4) { const d = Math.max(Math.abs(p[i]-q[i]), Math.abs(p[i+1]-q[i+1]), Math.abs(p[i+2]-q[i+2])); if (d > 8) changed++; max = Math.max(max, d); sum += d; }
    return { size: a.width + 'x' + a.height, changedPct: Math.round(10000 * changed / (p.length / 4)) / 100, maxDelta: max, meanDelta: Math.round(100 * sum / (p.length / 4)) / 100 };
  })()`);
}

function heavyDoc(): RackDoc {
  let doc = createAssembly();
  for (const part of ['rep-nighthawk', 'rogue-echo-bike', 'concept2-rowerg', 'bells-of-steel-cable-tower', 'rogue-vertical-plate-tree-2', 'rep-dumbbell-rack', 'rogue-ohio-power-bar', 'rogue-kettlebell'])
    try { doc = addFloorItem(doc, part); } catch { /* skip */ }
  for (const part of ['pegboard-panel', 'rogue-v2-gun-rack']) try { doc = addWallItem(doc, part); } catch { /* skip */ }
  return doc;
}

const browser = await chromium.launch({ headless: !args.includes('--headed'), args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  if (compare) {
    const [a, b] = compare.split(',');
    const page = await browser.newPage();
    const out: Record<string, unknown> = {};
    for (const name of ['default', 'heavy', 'selected', 'ghost', 'orbited']) out[name] = await diff(page, `${a}/${name}.png`, `${b}/${name}.png`);
    console.log(JSON.stringify(out, null, 2));
  } else {
    const port = Number(flag('port', '5622')), dir = flag('out', 'shots')!, dist = flag('dist', 'dist')!;
    mkdirSync(dir, { recursive: true });
    const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', dist], { stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise<void>((resolve, reject) => {
      server.stdout!.on('data', (d: Buffer) => { if (d.toString().includes(String(port))) resolve(); });
      server.on('exit', c => reject(Error(`vite preview exited ${c}`)));
    });
    try {
      for (const scene of ['default', 'heavy']) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
        const doc = scene === 'heavy' ? heavyDoc() : null;
        await context.addInitScript(`localStorage.clear(); const doc = ${JSON.stringify(doc)};
          if (doc) localStorage.setItem('bos-strength-configurations-v1', JSON.stringify({ configs: [], activeId: null, draft: doc }));`);
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${port}/`);
        await page.waitForSelector('.catalog-panel .part-card', { timeout: 120000 });
        // A stored draft is only offered, not loaded: recover it so the heavy scene is really heavy.
        if (doc) await page.evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Recover unsaved draft'))?.click()`);
        await page.waitForTimeout(doc ? 12000 : 6000);
        // Whether the first fit sees the default rack or the draft is a load race; refit so shots are comparable.
        if (doc) { await page.locator('#fit').click(); await page.waitForTimeout(500); }
        const canvas = page.locator('#viewport canvas'), box = (await canvas.boundingBox())!;
        const shot = async (name: string) => { await page.mouse.move(box.x + 5, box.y + 5); await page.waitForTimeout(1500); await canvas.screenshot({ path: `${dir}/${name}.png` }); };
        await shot(scene);
        if (scene !== 'default') { await context.close(); continue; }
        // Select the first part under the centre-ish of the rack.
        for (const [fx, fy] of [[0.5, 0.45], [0.5, 0.55], [0.45, 0.5], [0.55, 0.4]]) {
          await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
          await page.waitForTimeout(300);
          if (await page.locator('.inspector, [data-inspector], .selection-panel').count()) break;
        }
        await canvas.screenshot({ path: `${dir}/selected.png` });
        await page.keyboard.press('Escape'); await page.mouse.click(box.x + 8, box.y + box.height - 8); await page.waitForTimeout(300);
        // Placing ghost: a kettlebell following the pointer on the floor.
        const card = page.locator('.catalog-panel [data-part="rogue-kettlebell"]').first();
        await card.scrollIntoViewIfNeeded(); await card.click(); await page.waitForTimeout(300);
        await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.75); await page.waitForTimeout(400);
        await page.mouse.move(box.x + box.width * 0.32, box.y + box.height * 0.76); await page.waitForTimeout(1500);
        await canvas.screenshot({ path: `${dir}/ghost.png` });
        await page.keyboard.press('Escape'); await page.waitForTimeout(300);
        // Orbit and let damping settle fully.
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
        for (let i = 0; i < 20; i++) { await page.mouse.move(box.x + box.width / 2 + i * 10, box.y + box.height / 2 + i * 3); await page.waitForTimeout(16); }
        await page.mouse.up(); await page.waitForTimeout(6000);
        await canvas.screenshot({ path: `${dir}/orbited.png` });
        await context.close();
      }
    } finally { server.kill(); }
    writeFileSync(`${dir}/done.txt`, new Date().toISOString());
  }
} finally { await browser.close(); }
