# AGENTS.md

BOS STRENGTH — a Vite + React 19 + TypeScript parametric gym-rack and equipment
builder. 3D via three.js; CAD solids via `manifold-3d` (WASM). Ships as static
assets served by Cloudflare Workers (Wrangler).

## Everyday commands

- `npm ci` — install dependencies (fast, idempotent).
- `npm run dev` — Vite dev server at http://127.0.0.1:5173 (the builder lives at `/builder`).
- `npm test` — the full unit/integration suite (`tsx --test`, ~3.5 min, 400+ tests).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` — typecheck + Vite production build into `dist/`.
- `npm run preview` — serve the built assets via `wrangler dev`.

The Cloud Agent environment (`.cursor/environment.json`) runs `npm ci` on install
and starts `npm run dev` in the `dev` terminal on port 5173.

## Browser end-to-end tests (`e2e/`)

The specs under `e2e/` are a bespoke harness: each one expects (a) the app served
on a fixed port and (b) an isolated Chrome exposed over the Chrome DevTools
Protocol via a `*_CDP_URL` env var (some also expect a page already open at
`<base>/builder`). They are not part of `npm test` or CI.

Use the cross-platform runner, which wires all of that up automatically against
the preinstalled system Google Chrome (no Playwright browser download required):

```sh
npm run test:e2e -- sidebar          # run one spec
npm run test:e2e -- logos sidebar    # run several
npm run test:e2e -- --list           # list specs, ports, and env vars
node scripts/e2e-runner.mjs --all    # run everything runnable on Linux
```

The runner starts a Vite server on each spec's port, launches headless Chrome
with remote debugging (software WebGL via SwiftShader), pre-opens `/builder` when
the spec needs it, exports the right `*_CDP_URL`/base-URL env vars, and cleans up
the whole process group afterward. Override the browser with `E2E_CHROME_PATH`.

Notes:

- `cable-smith` is excluded: it launches its own browser from a hard-coded macOS
  Chrome path. `timeline` prefers headed Metal on macOS but runs headless here
  because the runner provides `GYM_TIMELINE_CDP_URL`.
- Because WebGL and the `manifold-3d` CAD build run in software here, heavy specs
  are slow. Some specs contain tight hard-coded per-step timeouts (e.g. 15 s on a
  logo preview) that a software renderer may occasionally miss; rerun if a step
  times out. `sidebar` (~2.5 min) and `logo-reset` (~25 s) pass reliably.

## Conventions

- Do not edit `e2e/*.spec.ts` just to make them pass in a given environment; the
  runner adapts the environment to the specs, not the other way around.
- Prefer the repo's pinned Node (22), package manager (npm), and lockfile.
