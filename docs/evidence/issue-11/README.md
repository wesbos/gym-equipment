# #11 verification evidence

Verified 2026-09-17 in isolated `gym-wave2-logos` Chrome, production preview on
127.0.0.1:5305. Screenshot shows the persisted JPEG threshold/contrast settings,
bridged contour preview and the real through-cut on the mounted nameplate.

- Final main integration: b10ec2a (structure placement, vendor attachments, multiselect, proposals, 3MF and prior integrations retained).
- `npm test`: 255 passed, 0 failed/skipped (89.22 s).
- `npm run build`: strict TypeScript and production Vite build passed. Existing
  large-chunk and Manifold node:module browser-externalization advisories remain.
- `GYM_LOGO_CDP_URL=<isolated Chrome endpoint> npm run test:logos:browser -- --reporter=line`:
  1 passed on the final integrated production build. Covers text, SVG, PNG, JPEG, threshold/contrast, scripts rejected,
  explicit named save, source+contours JSON, stock reset/undo, source controls after
  undo/load, and GLB/3MF export. Exported nameplate triangle count exactly equals the
  rebuilt custom Manifold solid, not the stock lettering. The browser 3MF is also
  reconstructed from its XML triangles and matches the custom CAD volume.
- The first browser session stalled; one final rerun timed out. Restarting only
  this isolated Chrome and bounding CDP connection time yielded the full passing
  run above. No stalled attempt counted as success.

Custom 3MF is now verified after merging #35. Its generic build adapter forwards
the typed logo without casts or numeric-parameter injection. The added export
regression reconstructs the actual XML mesh with Manifold and matches its volume
to custom CAD (and proves it differs from stock lettering).

Native Bambu Studio 02.08.01.55 and OrcaSlicer 01.09.05.51 CLI imports/re-exports
of the real custom nameplate fixture passed. See slicer-audit.txt: four objects,
12 volumes, 117,894 triangles, two colors and mm dimensions preserved in both;
all meshes pass directed-edge topology checks and report zero repairs. Orca's
headless thumbnail shader warning does not prevent archive export. GUI preview,
G-code slicing and physical fabrication are not claimed.

The final domain suite also resolves an actual paired Darko Anchor with a custom
BOS nameplate and proves vendor instances receive no user logo payload.

The latest browser rerun passed in 18.1 seconds after #48 and concise #30 logo controls. The screenshot above predates the prose removal; geometry and upload settings are unchanged. Scale denominators 10/20 await the separate #46 exporter integration; the fixture and expected volume checks are documented in custom-logos.md.
