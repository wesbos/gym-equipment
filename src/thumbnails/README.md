# Geometry thumbnails

## Prebuilt (catalog defaults)

Every catalog part's default-parameter thumbnail is rendered at build time by
`npm run thumbnails` (`scripts/generate-thumbnails.ts`): a Vite dev server +
headless Chromium (SwiftShader, GPU-independent) runs `scripts/thumbnails.html`,
which drives this exact backend/renderer and encodes lossless WebP (same pixels
and framing as the runtime PNG). Output: `public/thumbnails/<part>.<hash>.webp`
(content-hashed, served `immutable` via `public/_headers`) and
`manifest.json` here, mapping the canonical `thumbnailKey` to the file (or
`null` when the part's geometry can't build, which shows the SVG icon).

`PartThumbnail` looks the key up first (`prebuilt.ts`; empty params mean
defaults, so rows show images before definitions load). A hit renders a plain
`<img loading="lazy" decoding="async">`: no observer, queue, worker, Manifold
build or main-thread render. Only non-default params or keys missing from the
manifest use the live pipeline below. The generator is incremental (only new or
changed keys; `--force` re-renders all, naming parts re-renders those) and
deletes unreferenced images. `prebuilt.test.ts` fails when a catalog part has
no image for its current defaults: after adding a part or changing defaults,
run `npm run thumbnails` and commit the results.

## Live pipeline (other params)

`PartThumbnail` observes actual viewport intersection (including clipped scroll
containers). The original SVG is decorative loading/error fallback. Supply the
part ID and complete effective numeric parameters, usually catalog defaults;
parameter order does not affect the cache key. Builder waits for defaults before
requesting an icon. No part-specific paths or geometry builders are needed here.

The shared queue allows one in-flight request and 32 pending distinct requests.
Unobserved rows cancel pending work; an already-running synchronous Manifold
build may finish, but cannot update an unmounted row. Each result yields 32 ms
before the next request. The LRU retains at most 96 encoded 128px PNGs or failure
entries, not mesh buffers. Overflow requests use fallback until re-observed.

The backend is imported only for the first visible cache miss. It owns one
existing library worker and one detached Three renderer. All CAD reconstruction
(including source-derived profiles) stays in the library worker; no reference
GLB is loaded. On the main thread, a single render uses transferred interleaved
positions, flat shading (no CPU normal/edge reconstruction), transparent backing,
Z-up conversion and orthographic bounding-box framing. There is no thumbnail
animation loop. Mesh geometry/materials are disposed after every capture.

When the last component unmounts, pending work and timeouts are cleared, the
worker is terminated and renderer/context disposed; late promises are ignored.
Only the bounded encoded-image cache survives client-side navigation. Failed
builds are cached too, preventing retry loops; reload resets that cache. Worker
crash/timeout disables the current backend until route release. WebGL/WASM are
required for generated images; SVG fallback keeps controls usable on failure.

`npm test` covers laziness, canonical parameter keys, serialization/deduplication,
scroll cancellation, bounded queue/LRU, cached failures, and route release/re-entry.
Browser checks: open `/builder`, inspect visible ready thumbnails before scrolling,
filter `j-hook` to compare real roller/standard silhouettes, clear/filter/scroll
back to check cache reuse, then navigate `/library` → `/parts` → `/library` to
check card thumbnails and resource cleanup. Use a uniquely named browser and port
when other worktrees are running.
