#!/usr/bin/env node
// Linux-friendly harness for the browser end-to-end specs in e2e/.
//
// Each spec expects (a) the app served on a fixed port and (b) an isolated
// Chrome exposed over the Chrome DevTools Protocol via a `*_CDP_URL` env var.
// Some specs also expect a page already open at `<base>/builder`. This runner
// starts a Vite server, launches a headless Chrome with remote debugging,
// pre-opens the builder page when required, wires up the env vars, and runs the
// requested spec with Playwright.
//
// Usage:
//   node scripts/e2e-runner.mjs <spec> [<spec> ...]
//   node scripts/e2e-runner.mjs --list
//   node scripts/e2e-runner.mjs --all
//
// `cable-smith` is intentionally excluded: it launches its own browser from a
// hard-coded macOS Chrome path and cannot run unmodified on Linux.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const SPECS = {
  logos: { port: 5305, cdpEnv: 'GYM_LOGO_CDP_URL', open: '/builder' },
  'logo-reset': { port: 5305, cdpEnv: 'GYM_LOGO_CDP_URL' },
  'export-menu': { port: 5314, cdpEnv: 'GYM_EXPORT_CDP_URL', open: '/builder' },
  'export-corrections': { port: 5327, cdpEnv: 'GYM_EXPORT_CDP_URL', baseEnv: 'GYM_EXPORT_BASE_URL' },
  'floor-items': { port: 5316, cdpEnv: 'GYM_FLOOR_CDP_URL', open: '/builder' },
  reposition: { port: 5333, cdpEnv: 'GYM_REPOSITION_CDP_URL' },
  sidebar: { port: 5337, cdpEnv: 'GYM_SIDEBAR_CDP_URL' },
  'scene-lifetimes': { port: 5350, cdpEnv: 'GYM_SCENE_CDP_URL', urlEnv: 'GYM_SCENE_URL' },
  timeline: { port: 5341, cdpEnv: 'GYM_TIMELINE_CDP_URL' },
};

const CHROME =
  process.env.E2E_CHROME_PATH ||
  ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(
    (p) => existsSync(p),
  ) ||
  'google-chrome';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function log(...args) {
  console.log('[e2e-runner]', ...args);
}

async function waitForPort(port, host, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const socket = net.connect({ port, host }, () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function waitForCdp(debugPort, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Chrome CDP endpoint on :${debugPort} did not come up`);
}

function startViteServer(port) {
  log(`starting Vite dev server on :${port}`);
  const child = spawn(
    process.execPath,
    [path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: repoRoot, stdio: ['ignore', 'inherit', 'inherit'], env: process.env, detached: true },
  );
  return child;
}

function launchChrome(debugPort, userDataDir) {
  log(`launching Chrome (${CHROME}) with CDP on :${debugPort}`);
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      '--remote-debugging-address=127.0.0.1',
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--disable-gpu-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=1600,1000',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'], env: process.env, detached: true },
  );
  return child;
}

function killTree(child) {
  if (!child || child.pid == null) return;
  try {
    process.kill(-child.pid, 'SIGKILL'); // kill the whole detached process group
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {}
  }
}

async function preopen(cdpUrl, url) {
  const { chromium } = await import('@playwright/test');
  log(`pre-opening ${url}`);
  const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 20000 });
  try {
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Give the SPA time to hydrate the /builder route before the spec attaches.
    await page.waitForSelector('#export', { timeout: 60000 }).catch(() => {});
  } finally {
    // Disconnecting the CDP transport leaves Chrome and its pages running.
    await browser.close();
  }
}

function runPlaywright(specFile, extraEnv) {
  return new Promise((resolve) => {
    log(`running Playwright: ${specFile}`);
    const child = spawn('npx', ['playwright', 'test', specFile, '--workers=1'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function runSpec(name) {
  const cfg = SPECS[name];
  if (!cfg) throw new Error(`Unknown spec "${name}". Use --list to see available specs.`);
  const base = `http://127.0.0.1:${cfg.port}`;
  const debugPort = cfg.port + 4000; // stable, non-colliding debug port
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), `e2e-chrome-${name}-`));

  const vite = startViteServer(cfg.port);
  const chrome = launchChrome(debugPort, userDataDir);
  const cleanup = () => {
    killTree(chrome);
    killTree(vite);
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  };

  try {
    if (!(await waitForPort(cfg.port, '127.0.0.1', 60000))) {
      throw new Error(`Vite server on :${cfg.port} did not start`);
    }
    const version = await waitForCdp(debugPort, 30000);
    const cdpUrl = version.webSocketDebuggerUrl
      ? `http://127.0.0.1:${debugPort}`
      : `http://127.0.0.1:${debugPort}`;
    log(`Chrome ready: ${version.Browser}`);

    if (cfg.open) await preopen(cdpUrl, base + cfg.open);

    const extraEnv = { [cfg.cdpEnv]: cdpUrl };
    if (cfg.baseEnv) extraEnv[cfg.baseEnv] = base;
    if (cfg.urlEnv) extraEnv[cfg.urlEnv] = base;

    const code = await runPlaywright(`e2e/${name}.spec.ts`, extraEnv);
    return code;
  } finally {
    cleanup();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/e2e-runner.mjs <spec> [<spec> ...] | --all | --list');
    console.log('Specs:', Object.keys(SPECS).join(', '));
    console.log('Excluded (macOS-only launch): cable-smith');
    process.exit(args.length === 0 ? 1 : 0);
  }
  if (args.includes('--list')) {
    for (const [name, cfg] of Object.entries(SPECS)) {
      console.log(`${name.padEnd(20)} port=${cfg.port} cdpEnv=${cfg.cdpEnv}${cfg.open ? ` open=${cfg.open}` : ''}`);
    }
    process.exit(0);
  }
  const names = args.includes('--all') ? Object.keys(SPECS) : args;
  const results = [];
  for (const name of names) {
    log(`=== ${name} ===`);
    let code;
    try {
      code = await runSpec(name);
    } catch (err) {
      console.error(`[e2e-runner] ${name} failed:`, err.message);
      code = 1;
    }
    results.push([name, code]);
  }
  console.log('\n[e2e-runner] Summary:');
  let failed = 0;
  for (const [name, code] of results) {
    console.log(`  ${code === 0 ? 'PASS' : 'FAIL'}  ${name}`);
    if (code !== 0) failed += 1;
  }
  process.exit(failed === 0 ? 0 : 1);
}

main();
