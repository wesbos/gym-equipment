# Issue 83 — placeable Olympic barbell

Verified with headless Playwright Chromium (WebGL via ANGLE) against `http://127.0.0.1:5413/builder`, 1400 × 900. Documents were built with the real `addAccessory`/`addFloorItem` helpers and loaded through **Load JSON**; parking/hover/double-click flows were driven with real pointer events.

One bar per cradle type (the geometry of each rest point is checked against the generated solids in `rack-generator/barbell-cradles.test.ts`):

- `j-standard-3D.jpg` — standard J-cups (default rack), hard chrome.
- `j-roller-3D.jpg` — roller J-cups, black-oxide shaft.
- `j-sandwich-3D.jpg` — sandwich J-cups.
- `monolift-3D.jpg` — monolift swing-arm J cups.
- `darko-anchor-3D.jpg` — two bars across paired Darko Barbell Anchors on the upper side rails.
- `darko-double-decker-Front.jpg` — four bars, both Double Decker tiers.
- `darko-j-3D.jpg`, `darko-double-j-3D.jpg` — Dock J-Anchor / Double J-Anchor pairs on the inner side faces.
- `floor-3D.jpg` — floor fallback in front of the rack.

Interaction:

- `flow-1-suggested.jpg` — **Olympic barbell** clicked: every free cradle shows a faint ghost; the suggested (highest working) J-cups carry the strong ghost.
- Hovering the floor switches to a floor ghost; hovering the Darko anchors reads "Darko Barbell Anchors · 1818 mm · Click to park"; `flow-4-parked.jpg` is the click result (one history step).
- `flow2-2-reposition.jpg` — double-click on a parked bar re-enters parking with its own cradle free.
- `flow2-inspector.jpg` — inspector: finish, parked status, Move / park, Set on floor, Remove.
- Exported GLB contains the `floor-1` bar group and both sleeve meshes; 3MF excludes it (`src/exports/floor-export.test.ts`).
