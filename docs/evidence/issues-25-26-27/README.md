# Appearance, floor and lighting validation

Branch covers #25, #26 and #27. Screenshots use the actual Manifold builder geometry
at its default fit, 1600×1000, with the same shared studio lighting as the part viewer.

- `white.png`: white paint, visible hole rows, fasteners and boundaries.
- `yellow.png`: custom #ffff00 paint, preserved hue and surface detail.
- `stainless-black.png`: dark frame with an independently selected stainless upright.
- `clear-grind.png`: global brushed raw steel beneath clear coat; the stainless piece override survives.
- `floor-detail.png`: closer floor speckles, metre seams and contact shadows.
- `part-study.png`: neutral part-study background with balanced studio response.

The reproducible browser check is `/scripts/visuals-check.html` on the dev server.
It checks three create/dispose cycles, 12 finish edits per cycle, exact disposal of
borrowed brush resources and floor resources, stable texture allocations across edits,
60 idle frames per cycle without texture uploads, GLB texture/UV/clearcoat retention,
and exclusion of scenery from the rack export. Renderer fallback textures are released
by explicit context loss; the check verifies every retained context is lost.

Chrome's installed regular build stalled during teardown/re-entry. The installed
Chrome for Testing completed the repeated lifecycle checks. This is not a portable
GPU performance benchmark; 60 idle frames took approximately one second on this host.
The floor adds one draw call; shadow maps update on rebuild, not while orbiting.

3MF receives only the dominant flat color from `resolveMaterial(...).color`; brush
texture, reflection and clear-coat behavior are GLB/viewer features. Paint swatches
are approximate, not calibrated vendor samples. These notes intentionally stay in docs.
