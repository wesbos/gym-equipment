# #11 verification evidence

Verified 2026-09-17 in isolated `gym-wave2-logos` Chrome, production preview on
127.0.0.1:5305. Screenshot shows the persisted JPEG threshold/contrast settings,
bridged contour preview and the real through-cut on the mounted nameplate.

- Final main integration: 201374f (size controls, reset/swap and pull-up orientation retained).
- `npm test`: 148 passed, 0 failed/skipped (21.83 s).
- `npm run build`: strict TypeScript and production Vite build passed. Existing
  large-chunk and Manifold node:module browser-externalization advisories remain.
- `GYM_LOGO_CDP_URL=<isolated Chrome endpoint> npm run test:logos:browser -- --reporter=line`:
  1 passed on the final integrated production build. Covers text, SVG, PNG, JPEG, threshold/contrast, scripts rejected,
  explicit named save, source+contours JSON, stock reset/undo, source controls after
  undo/load, and GLB export. Exported nameplate triangle count exactly equals the
  rebuilt custom Manifold solid, not the stock lettering.
- The first browser session stalled; one final rerun timed out. Restarting only
  this isolated Chrome and bounding CDP connection time yielded the full passing
  run above. No stalled attempt counted as success.

3MF is a separate parallel PR (#35), absent from this merged main baseline.
Its `src/exports/print-3mf.ts` build call needs the new `entry.logo` third argument.
This branch supplies real CAD and a typed contract; it does not claim a custom-logo
3MF/slicer round-trip until the coordinator integrates that one-line change.
