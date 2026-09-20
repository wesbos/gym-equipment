/** Phone rendering benchmark (#204): an emulated iPhone 14 with CDP CPU throttling, real touch input via
 * Input.dispatchTouchEvent (one-finger orbit, two-finger pinch/pan), idle cost and settle after inertia.
 *
 *   npx vite build && npx tsx scripts/perf-mobile.ts [--port 5754] [--url https://…] [--cpu 4] [--device "iPhone 14"]
 *     [--scenes default,coop] [--out perf-mobile.json] [--swiftshader] [--headed]
 *
 * Without --url it serves ./dist with `vite preview` on --port. Compare runs from the same machine only. */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium, devices, type Page, type CDPSession } from '@playwright/test';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const has = (name: string) => args.includes(`--${name}`);
const port = Number(flag('port', '5754')), out = flag('out'), cpu = Number(flag('cpu', '4')), deviceName = flag('device', 'iPhone 14')!;
const scenes = (flag('scenes', 'default,coop') ?? '').split(',').filter(Boolean);
const paths: Record<string, string> = { default: '/', coop: '/?gym=coop-garage-gym-reviews' };
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

const pct = (xs: number[], p: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const round = (n: number) => Math.round(n * 10) / 10;
type GLCounts = { frames: number; draws: number; links: number };

async function metrics(cdp: CDPSession) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map(m => [m.name, m.value])) as Record<string, number>;
}
/** Runs `action` while recording rAF gaps, long tasks and builder-canvas GL work (frames that drew, program links). */
async function measure(page: Page, cdp: CDPSession, action: () => Promise<void>) {
  await page.evaluate('window.__frames = []; window.__long = [];');
  const gl0 = await page.evaluate('({ ...window.__gl })') as GLCounts, before = await metrics(cdp), t0 = Date.now();
  await action();
  const seconds = (Date.now() - t0) / 1000, after = await metrics(cdp);
  const { frames, long, gl } = await page.evaluate('({ frames: window.__frames, long: window.__long, gl: { ...window.__gl } })') as { frames: number[]; long: number[]; gl: GLCounts };
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  return {
    seconds: round(seconds), fps: round(frames.length / seconds), frameP50: round(pct(gaps, .5)), frameP95: round(pct(gaps, .95)), frameMax: round(Math.max(0, ...gaps)),
    jank: gaps.filter(g => g > 50).length, longTasks: long.length, longTaskMs: round(long.reduce((a, b) => a + b, 0)),
    // Main-thread share while measuring (inflated by the CPU throttle, comparable run-to-run).
    busyPct: round(100 * (after.TaskDuration - before.TaskDuration) / seconds), scriptPct: round(100 * (after.ScriptDuration - before.ScriptDuration) / seconds),
    renderedFrames: gl.frames - gl0.frames, draws: gl.draws - gl0.draws, programLinks: gl.links - gl0.links,
  };
}

const browser = await chromium.launch({
  headless: !has('headed'),
  args: has('swiftshader') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const results: Record<string, unknown> = { device: deviceName, cpuThrottle: cpu };
try {
  for (const sceneName of scenes) {
    const context = await browser.newContext({ ...devices[deviceName] });
    await context.addInitScript(`
      localStorage.clear();
      window.__frames = []; window.__long = [];
      let tickNo = 0, drawnTick = -1;
      const tick = t => { tickNo++; window.__frames.push(t); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
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
    const page = await context.newPage(), cdp: CDPSession = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    const t0 = Date.now();
    await page.goto(base + paths[sceneName]);
    await page.waitForSelector('#viewport canvas', { timeout: 120000 });
    // Settle: catalog, geometry, the gym load and its refit, first thumbnails.
    await page.waitForTimeout(sceneName === 'coop' ? 20000 : 12000);
    const canvas = (await page.locator('#viewport canvas').boundingBox())!;
    const gl = await page.evaluate(`(() => { const c = document.querySelector('#viewport canvas'); return { width: c.width, height: c.height, cssWidth: c.clientWidth, dpr: devicePixelRatio }; })()`);
    const cx = canvas.x + canvas.width / 2, cy = canvas.y + canvas.height / 2;
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: [number, number][]) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
    const r: Record<string, unknown> = { loadAndSettleMs: Date.now() - t0, canvas: gl };
    r.idle = await measure(page, cdp, () => page.waitForTimeout(4000));
    r.touchOrbit = await measure(page, cdp, async () => {
      await touch('touchStart', [[cx - 100, cy]]);
      for (let i = 0; i <= 90; i++) { const a = i / 90 * Math.PI * 2; await touch('touchMove', [[cx - 100 + Math.sin(a) * 90, cy + Math.sin(2 * a) * 50]]); await page.waitForTimeout(16); }
      await touch('touchEnd', []);
    });
    // Inertia (damping) must run out and render-on-demand go idle again.
    await page.waitForTimeout(1500);
    r.afterOrbitIdle = await measure(page, cdp, () => page.waitForTimeout(3000));
    r.pinchPan = await measure(page, cdp, async () => {
      await touch('touchStart', [[cx - 40, cy], [cx + 40, cy]]);
      for (let i = 1; i <= 60; i++) { const s = 40 + Math.sin(i / 60 * Math.PI) * 80, dy = Math.sin(i / 20) * 40; await touch('touchMove', [[cx - s, cy + dy], [cx + s, cy + dy]]); await page.waitForTimeout(16); }
      await touch('touchEnd', []);
    });
    await page.waitForTimeout(1500);
    r.afterPinchIdle = await measure(page, cdp, () => page.waitForTimeout(3000));
    results[sceneName] = r;
    await context.close();
  }
} finally {
  await browser.close(); server?.kill();
}
console.log(JSON.stringify(results, null, 2));
if (out) writeFileSync(out, JSON.stringify(results, null, 2));
