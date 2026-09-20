/** Builder rendering benchmark: idle cost, orbit/scroll frame times, click-to-paint, and a heavy gym scene.
 *
 *   npx vite build && npx tsx scripts/perf.ts [--port 5500] [--url http://…] [--out perf.json] [--trace trace.json]
 *     [--scenes default,heavy] [--swiftshader] [--headed]
 *
 * Without --url it serves ./dist with `vite preview` on --port (production build: measure that, not the dev server).
 * Numbers from one machine are comparable run-to-run; always compare against a baseline measured the same way. */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium, type Page, type CDPSession } from '@playwright/test';
import { createAssembly } from '../rack-generator/assembly.ts';
import { addFloorItem } from '../rack-generator/floor-items.ts';
import { addWallItem } from '../rack-generator/wall-items.ts';
import type { RackDoc } from '../rack-generator/types.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const has = (name: string) => args.includes(`--${name}`);
const port = Number(flag('port', '5500')), out = flag('out'), tracePath = flag('trace');
const scenes = (flag('scenes', 'default,heavy') ?? '').split(',').filter(Boolean);
let base = flag('url');
let server: ReturnType<typeof spawn> | undefined;
if (!base) {
  base = `http://127.0.0.1:${port}`;
  server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(Error('vite preview did not start')), 60000);
    server!.stdout!.on('data', (d: Buffer) => { if (d.toString().includes(String(port))) { clearTimeout(t); resolve(); } });
    server!.on('exit', c => reject(Error(`vite preview exited ${c}`)));
  });
}

/** A busy gym: the default rack plus a spread of heavy floor, wall and hang parts. */
function heavyDoc(): RackDoc {
  let doc = createAssembly();
  const floor = ['rep-nighthawk', 'rogue-echo-bike', 'concept2-rowerg', 'rogue-westside-scout-hyper', 'force-usa-compact-leg-press-hack-squat',
    'bells-of-steel-cable-tower', 'rogue-vertical-plate-tree-2', 'rep-dumbbell-rack', 'peloton-bike', 'sole-f63', 'rogue-ohio-power-bar',
    'titan-safety-squat-bar', 'rep-open-trap-bar', 'rogue-kettlebell', 'cap-rubber-hex-dumbbell', 'powerblock', 'rep-pepin-dumbbell',
    'tractor-supply-horse-stall-mat', 'rogue-monster-rhino-belt-squat', 'titan-leg-extension-curl', 'cerberus-dual-ply-sandbag', 'diy-atlas-stone'];
  for (const part of floor) { try { doc = addFloorItem(doc, part); } catch (e) { console.warn(`skip ${part}: ${(e as Error).message}`); } }
  for (const part of ['pegboard-panel', 'rogue-v2-gun-rack', 'wall-control-pegboard']) { try { doc = addWallItem(doc, part); } catch (e) { console.warn(`skip ${part}: ${(e as Error).message}`); } }
  return doc;
}

const pct = (xs: number[], p: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const round = (n: number) => Math.round(n * 10) / 10;

type GLCounts = { frames: number; draws: number; links: number };
async function metrics(cdp: CDPSession) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map(m => [m.name, m.value])) as Record<string, number>;
}
/** Runs `action` while recording rAF frame intervals, long tasks and main-thread busy time. */
async function measure(page: Page, cdp: CDPSession, action: () => Promise<void>) {
  await page.evaluate('window.__frames = []; window.__long = [];');
  const gl0 = await page.evaluate('({ ...window.__gl })') as GLCounts;
  const before = await metrics(cdp), t0 = Date.now();
  await action();
  const seconds = (Date.now() - t0) / 1000, after = await metrics(cdp);
  const { frames, long, gl } = await page.evaluate('({ frames: window.__frames, long: window.__long, gl: { ...window.__gl } })') as { frames: number[]; long: number[]; gl: GLCounts };
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  return {
    seconds: round(seconds), fps: round(frames.length / seconds), frameP50: round(pct(gaps, .5)), frameP95: round(pct(gaps, .95)), frameMax: round(Math.max(0, ...gaps)),
    jank: gaps.filter(g => g > 50).length, longTasks: long.length, longTaskMs: round(long.reduce((a, b) => a + b, 0)),
    busyPct: round(100 * (after.TaskDuration - before.TaskDuration) / seconds), scriptPct: round(100 * (after.ScriptDuration - before.ScriptDuration) / seconds),
    heapMB: round(after.JSHeapUsedSize / 1048576),
    // Builder canvas only (thumbnail contexts excluded): frames that issued draws, draw calls, shader programs linked.
    renderedFrames: gl.frames - gl0.frames, draws: gl.draws - gl0.draws, programLinks: gl.links - gl0.links,
  };
}

const browser = await chromium.launch({
  headless: !has('headed'),
  args: has('swiftshader') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'],
});
const results: Record<string, unknown> = {};
try {
  for (const sceneName of scenes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const doc = sceneName === 'heavy' ? heavyDoc() : null;
    // A string, not a function: tsx/esbuild injects `__name` helpers that don't exist in the page.
    await context.addInitScript(`
      localStorage.clear();
      const doc = ${JSON.stringify(doc)};
      if (doc) localStorage.setItem('bos-strength-configurations-v1', JSON.stringify({ configs: [], activeId: null, draft: doc }));
      window.__frames = []; window.__long = [];
      let tickNo = 0, drawnTick = -1;
      const tick = t => { tickNo++; window.__frames.push(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      // Count WebGL work on the builder's own canvas (#viewport), not the thumbnail renderers.
      window.__gl = { frames: 0, draws: 0, links: 0 };
      const isBuilder = new WeakMap();
      const builder = gl => { let v = isBuilder.get(gl); if (v === undefined) { if (!gl.canvas.isConnected) return false; v = !!gl.canvas.closest('#viewport'); isBuilder.set(gl, v); } return v; };
      const proto = WebGL2RenderingContext.prototype;
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
        const original = proto[name];
        proto[name] = function (...a) { if (builder(this)) { window.__gl.draws++; if (drawnTick !== tickNo) { drawnTick = tickNo; window.__gl.frames++; } } return original.apply(this, a); };
      }
      const link = proto.linkProgram;
      proto.linkProgram = function (p) { if (builder(this)) window.__gl.links++; return link.call(this, p); };
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.__long.push(e.duration); }).observe({ type: 'longtask', buffered: true });
    `);
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const t0 = Date.now();
    await page.goto(base + '/');
    await page.waitForSelector('.catalog-panel .part-card', { timeout: 120000 });
    await page.waitForSelector('#viewport canvas');
    const firstCards = Date.now() - t0;
    // The stored draft is only offered on load; --recover-heavy actually loads it (without it "heavy" is the default rack).
    if (doc && has('recover-heavy')) await page.evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Recover unsaved draft'))?.click()`);
    // Settle: definitions + scene geometry + first thumbnails.
        await page.waitForTimeout(6000);
    const gpu = await page.evaluate(`(() => { const c = document.createElement('canvas').getContext('webgl2'); const d = c && c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
    const canvas = (await page.locator('#viewport canvas').boundingBox())!;
    const cx = canvas.x + canvas.width / 2, cy = canvas.y + canvas.height / 2;
    if (tracePath && sceneName === scenes[0]) await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-v8.cpu_profiler,v8', transferMode: 'ReturnAsStream' });
    const r: Record<string, unknown> = { gpu, loadToCardsMs: firstCards };
    r.idle = await measure(page, cdp, () => page.waitForTimeout(5000));
    r.orbit = await measure(page, cdp, async () => {
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 0; i < 180; i++) { const a = i / 180 * Math.PI * 2; await page.mouse.move(cx + Math.cos(a) * 250, cy + Math.sin(a) * 120); await page.waitForTimeout(16); }
      await page.mouse.up(); await page.waitForTimeout(500);
    });
    const panel = (await page.locator('.catalog-panel').boundingBox())!;
    r.sidebarScroll = await measure(page, cdp, async () => {
      await page.mouse.move(panel.x + panel.width / 2, panel.y + panel.height / 2);
      for (let i = 0; i < 90; i++) { await page.mouse.wheel(0, i < 45 ? 400 : -400); await page.waitForTimeout(33); }
      await page.waitForTimeout(500);
    });
    r.search = await measure(page, cdp, async () => {
      await page.locator('#search').click();
      for (const ch of 'rogue') { await page.keyboard.type(ch); await page.waitForTimeout(120); }
      await page.locator('#search').fill(''); await page.waitForTimeout(500);
    });
    // Click-to-paint: pick a catalog card, time until two frames after the click handler ran.
    const clicks: number[] = [];
    for (const part of ['rep-nighthawk', 'rogue-echo-bike', 'j-hook-standard']) {
      const card = page.locator(`.catalog-panel [data-part="${part}"]`).first();
      if (!(await card.count())) continue;
      await card.scrollIntoViewIfNeeded();
      const handle = await card.elementHandle();
      const ms = await page.evaluate(`(el => new Promise(res => { const t = performance.now(); el.click(); requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t))); }))`, handle) as number;
      clicks.push(round(ms)); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    }
    r.clickToPaintMs = clicks;
    // History growth: place floor items through the UI (one commit each) and time click-to-paint per edit,
    // then drag the last one around (a continuous gesture) and record its frame times.
    if (!has('no-edits')) {
      const perEdit: number[] = [];
      const spots = Array.from({ length: 24 }, (_, i) => [cx - 330 + (i % 8) * 95, cy + 120 + Math.floor(i / 8) * 70] as const);
      const editPhase = await measure(page, cdp, async () => {
        for (const [x, y] of spots) {
          const card = page.locator('.catalog-panel [data-part="rogue-kettlebell"]').first();
          await card.scrollIntoViewIfNeeded(); await card.click(); await page.waitForTimeout(150);
          await page.mouse.move(x, y); await page.waitForTimeout(60);
          const ms = await page.evaluate(`new Promise(res => { const c = document.querySelector('#viewport canvas'); const t = performance.now();
            const o = { bubbles: true, clientX: ${x}, clientY: ${y}, pointerId: 1, button: 0, buttons: 1, isPrimary: true };
            c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 })); c.dispatchEvent(new MouseEvent('click', o));
            requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t))); })`) as number;
          perEdit.push(round(ms)); await page.keyboard.press('Escape'); await page.waitForTimeout(120);
        }
      });
      const [lx, ly] = spots.at(-1)!;
      const profilePath = flag('profile');
      if (profilePath) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
      const drag = await measure(page, cdp, async () => {
        await page.mouse.move(lx, ly); await page.mouse.down();
        for (let i = 0; i < 120; i++) { await page.mouse.move(lx - i * 2, ly - Math.sin(i / 10) * 40); await page.waitForTimeout(16); }
        await page.mouse.up(); await page.waitForTimeout(500);
      });
      if (profilePath && sceneName === scenes[0]) { const { profile } = await cdp.send('Profiler.stop'); writeFileSync(profilePath, JSON.stringify(profile)); r.profile = profilePath; }
      r.edits = { ...editPhase, perEditMs: perEdit, firstFive: round(perEdit.slice(0, 5).reduce((a, b) => a + b, 0) / 5), lastFive: round(perEdit.slice(-5).reduce((a, b) => a + b, 0) / 5),
        historyBytes: await page.evaluate(`(localStorage.getItem('bos-strength-configurations-v1') || '').length`) };
      r.dragAfterEdits = drag;
    }
    if (tracePath && sceneName === scenes[0]) {
      const done = new Promise<string>(res => cdp.once('Tracing.tracingComplete', e => res((e as { stream: string }).stream)));
      await cdp.send('Tracing.end');
      const stream = await done; let data = '', chunk;
      do { chunk = await cdp.send('IO.read', { handle: stream }); data += chunk.data; } while (!chunk.eof);
      writeFileSync(tracePath, data); r.trace = tracePath;
    }
    results[sceneName] = r;
    await context.close();
  }
} finally {
  await browser.close(); server?.kill();
}
console.log(JSON.stringify(results, null, 2));
if (out) writeFileSync(out, JSON.stringify(results, null, 2));
