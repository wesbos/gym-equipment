/** Pre-render every catalog part's default-parameter thumbnail to public/thumbnails/*.webp + src/thumbnails/manifest.json.
 *
 *   npm run thumbnails [-- --port 5460] [--force] [--jobs 3] [--quality 1] [part …]
 *
 * Starts a Vite dev server, opens scripts/thumbnails.html in headless Chromium (SwiftShader, so output doesn't depend on
 * the GPU) and renders through the exact runtime pipeline (library worker → createThumbnailRenderer), encoded as
 * lossless WebP (quality 1; same pixels as the runtime PNG, about a third of the bytes).
 * The manifest maps the canonical `thumbnailKey` (part + sorted default params) to a content-hashed file, or null
 * when the part's geometry can't build (the SVG icon is shown then). Incremental by default: only parts whose key is
 * missing are rendered; `--force` (or naming parts) re-renders. Unreferenced images are deleted. */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { definitions } from '../rack-generator/catalog.ts';
import { thumbnailKey } from '../src/thumbnails/queue.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}public/thumbnails/`, manifestPath = `${root}src/thumbnails/manifest.json`;
const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => { const i = args.indexOf(`--${name}`); if (i < 0) return fallback; const [value] = args.splice(i, 2).slice(1); return value; };
const bool = (name: string) => { const i = args.indexOf(`--${name}`); if (i >= 0) args.splice(i, 1); return i >= 0; };
const port = Number(flag('port', '5460')), jobs = Number(flag('jobs', '3')), quality = Number(flag('quality', '1')), force = bool('force');
const only = new Set(args);
for (const part of only) if (!definitions.some((d) => d.id === part)) throw Error(`Unknown part: ${part}`);

/** Chromium tags canvas WebP with a ~460-byte sRGB ICC profile (VP8X+ICCP+VP8L); untagged images are already
 *  treated as sRGB, so keep just the lossless VP8L chunk (it carries alpha) as a simple-format file. */
function stripWebp(bytes: Buffer): Buffer {
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = bytes.toString('latin1', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (id === 'VP8L') {
      const chunk = bytes.subarray(offset, offset + 8 + size + (size & 1));
      const header = Buffer.from('RIFF\0\0\0\0WEBP', 'latin1');
      header.writeUInt32LE(4 + chunk.length, 4);
      return Buffer.concat([header, chunk]);
    }
    offset += 8 + size + (size & 1);
  }
  return bytes;
}

const previous: Record<string, string | null> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const entries = definitions.map((d) => ({ part: d.id, params: { ...d.defaults }, key: thumbnailKey({ part: d.id, params: d.defaults }) }));
const manifest: Record<string, string | null> = {};
const todo: typeof entries = [];
for (const entry of entries) {
  const file = previous[entry.key];
  const current = entry.key in previous && (file === null || existsSync(outDir + file));
  const requested = only.size ? only.has(entry.part) : force || !current;
  if (requested) todo.push(entry);
  else if (current) manifest[entry.key] = file;
}
mkdirSync(outDir, { recursive: true });
console.log(`${entries.length} catalog parts, ${todo.length} to render`);

const failures: string[] = [];
if (todo.length) {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  const base = `http://127.0.0.1:${port}`;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Vite did not start within 60 s.')), 60000);
    server.stdout!.on('data', (chunk: Buffer) => { if (chunk.toString().includes(String(port))) { clearTimeout(timer); resolve(); } });
    server.on('exit', (code) => reject(Error(`Vite exited (${code}); is port ${port} taken?`)));
  });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    let next = 0, done = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, todo.length) }, async () => {
      const page = await browser.newPage();
      page.setDefaultTimeout(120000);
      await page.goto(`${base}/scripts/thumbnails.html`);
      await page.waitForFunction('window.thumbnailHarnessReady === true');
      while (next < todo.length) {
        const { part, params, key } = todo[next++];
        try {
          const url = await page.evaluate(([p, v, q]) => (window as unknown as { renderThumbnail(p: unknown, v: unknown, q: unknown): Promise<string> }).renderThumbnail(p, v, q), [part, params, quality] as const);
          const [header, data] = url.split(',');
          if (header !== 'data:image/webp;base64') throw Error(`Unexpected encoding ${header}`);
          const bytes = stripWebp(Buffer.from(data, 'base64'));
          const file = `${part}.${createHash('sha256').update(bytes).digest('hex').slice(0, 10)}.webp`;
          writeFileSync(outDir + file, bytes);
          manifest[key] = file;
        } catch (error) {
          manifest[key] = null;
          failures.push(`${part}: ${(error as Error).message.split('\n')[0]}`);
        }
        if (++done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
      }
      await page.close();
    }));
  } finally {
    await browser.close();
    server.kill();
  }
}

// Stable order (catalog order), so regenerations diff cleanly.
const ordered = Object.fromEntries(entries.filter(({ key }) => key in manifest).map(({ key }) => [key, manifest[key]]));
writeFileSync(manifestPath, `${JSON.stringify(ordered, null, 1)}\n`);
const keep = new Set(Object.values(ordered));
let removed = 0, bytes = 0;
for (const file of readdirSync(outDir)) {
  if (!keep.has(file)) { unlinkSync(outDir + file); removed++; } else bytes += statSync(outDir + file).size;
}
const missing = entries.length - Object.keys(ordered).length;
console.log(`${keep.size - (keep.has(null) ? 1 : 0)} images${missing ? ` (${missing} parts not rendered yet)` : ''}, ${(bytes / 1048576).toFixed(2)} MiB; removed ${removed} stale`);
if (failures.length) console.warn(`${failures.length} parts failed to build (manifest null → SVG icon):\n  ${failures.join('\n  ')}`);
