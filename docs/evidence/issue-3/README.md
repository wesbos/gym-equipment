# Issue 3 acceptance evidence — September 17, 2026

Branch `wave2/print_export`, implementation `42611d2`, with origin/main `201374f`
merged in `12f180a` for final integration. The additive BuilderPage import conflict
was resolved preserving export, editor reset/swap controls and standard-size controls. No deployment or issue closure.

- Isolated `npm ci`: passed, no shared node_modules.
- `npm test`: **171 passed, 0 failed/skipped**, 96.5 seconds after the reset follow-up.
- `npm run build`: typecheck and Vite production build passed. Vite reports its
  >500 kB bundle advisory (main bundle and CAD workers); no build errors.
- 34 print-specific tests include all 28 catalog builders, Float32/Manifold/XML
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

Coordinator follow-up: generic `buildPrintInstance` forwards resolved `logo` as
CAD argument 3. The optional `CADCatalog.attribution` contract preserves all five
vendor fields in model Copyright and report `vendorCredits`. Tests exercise both
contracts. The vendor stream must wire its helper as `catalog.attribution` when
registering definitions. Actual unmerged logo/vendor CAD end-to-end coverage is
pending those streams; their geometry/validation is not duplicated here. The
export options screenshot reflects #30 concise copy and main's #28 size controls.

Reset follow-up: fetched origin/main again (201374f; already integrated) before
final checks. The export arrangement uses the shared ResetButton and a named
`laid-out` default. Browser verification changed to assembly coordinates,
confirmed reset enabled, reset to laid-out and confirmed reset disabled. The
control is also disabled during export. No new numeric controls are introduced;
main's NumericControl defaultValue and viewport swap pipeline are untouched.


Post-merge reset PR: PR35 was squash-merged at 5bfdcaa as main 43ea341 before
0c1cad4's reset landed. The small follow-up branch `wave2/print_export-reset`
contains only the reset delta and merges main 11d8c57 (placement suggestions).
Final checks: npm test **182 passed, 0 failed/skipped**, 80.6 seconds;
production build/typecheck passed (Vite 1.82s), bundle-size advisory only.
Reset options remain present after the updated viewport pipeline reload.
