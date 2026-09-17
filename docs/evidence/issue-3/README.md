# Issue 3 acceptance evidence — September 17, 2026

Branch `wave2/print_export`, implementation `42611d2`, with origin/main `54e3183`
merged in `b3146f5` before final tests. No deployment or issue closure.

- Isolated `npm ci`: passed, no shared node_modules.
- `npm test`: **156 passed, 0 failed/skipped**, 81.9 seconds after merging main.
- `npm run build`: typecheck and Vite production build passed. Vite reports its
  >500 kB bundle advisory (main bundle and CAD workers); no build errors.
- 32 print-specific tests include all 28 catalog builders, Float32/Manifold/XML
  round trips, physical counts and paired paint, base materials, relationship
  target, triangle indices, overlap volume conservation and empty/error handling.
- Browser: session `gym-wave2-print_export`, `http://127.0.0.1:5304/builder`.
  Export options visually inspected; flat download, cancellation, retry and
  assembled-coordinate download exercised. GLB and JSON controls remain present.
  [Export options screenshot](export-options.png).
- Installed Bambu Studio **02.08.01.55** and OrcaSlicer **01.09.05.51** each imported
  and re-exported the six-color default-rack fixture using `--info --arrange 0
  --orient 0 --export-3mf ... --outputdir <absolute directory> <input>`.
  [Independent archive audit](slicer-audit.txt): 14 named physical objects,
  83 named material volumes, 311,988 triangles, all six colors and millimetre
  dimensions unchanged; every reported mesh repair counter is zero.

Reproduce with `scripts/generate-print-fixtures.ts` and
`scripts/verify-print-export.py`; commands and packaging details are in
[print-export.md](../../print-export.md). The bulky generated/source/round-trip
3MF files and logs stay in the worktree's ignored `.verification` directory.

Limits: the native computer-use service timed out twice, so GUI import dialogs
and slicer rendering were not visually checked. CLI imports plus the resulting
re-exported archives were checked in both slicers. G-code slicing and actual
prints are unverified. Full-size rack objects were never scaled to fit a printer.
The UI discloses dominant-color texture loss, basic orientation, support review
and placeholder printer/filament fields. No universal printability/physical-fit
claim is made.
