# Issue 44 — unified Export menu

The isolated `gym-wave2-export_menu` browser session used `http://127.0.0.1:5314/builder`.
`export-menu.png` and `export-menu-mobile.png` show the shared GLB/3MF menu, layout and
scale controls, independent resets, and retained print facts. JSON stays separate.

Checks:

- Keyboard opening, ArrowUp/Down, Home/End, format typeahead, Enter, Tab into settings,
  Escape and focus return; outside dismissal and reopening while busy.
- Layout and scale reset independently. Reset moves focus to its select before
  disabling the reset button; starting export moves focus before disabling Download.
- One busy job across formats. Browser-injected delayed GLB failure clears busy and
  allows a real GLB retry. The injection is test-only and restores the exporter.
- A real 3MF worker can be cancelled after closing/reopening the menu, then retried.
  Unit tests also deliver old progress/error/completion callbacks after cancellation
  to verify they cannot download or interrupt the next job.
- Last-used format survives page reload in sessionStorage. Blocked storage and
  invalid stored values are covered by unit tests.
- Real downloads for both layouts at both scales have the expected report options,
  scale status and `bos-strength-print-parts-1-10.3mf` / `-1-20.3mf` names. The scale
  suffix is the explicitly coordinated #46 change; GLB and JSON names are unchanged.
- Independent `scripts/verify-print-export.py` audits of all four browser downloads
  found 14 Parts + 10 Hardware objects, 83 volumes and 311,988 triangles, valid ZIP
  CRC/XML/mesh topology and correct two-plate membership. This default rack has five
  colors. Native slicer verification belongs to #46; see its evidence directory.
- Browser-only instrumentation compared SHA256 of actual worker response bytes and
  the download Blob for laid-out 1:20 and assembled 1:10/1:20; hashes matched. Unit
  tests assert exact Blob byte passthrough for both formats and both print scales.
- GLB retains its binary glTF header, 83 meshes and existing 0.001 scene scale.
  JSON before/after exporting is byte-identical in the browser regression.
- At 390 px viewport width the trigger remains within the viewport, including busy
  text, and the menu fits. No standalone GLB or PrintExport trigger remains.

## Repeatable browser regression

With the Vite server running on 5314 and the named browser open:

```sh
agent-browser --session gym-wave2-export_menu get cdp-url
GYM_EXPORT_CDP_URL='<returned endpoint>' npx playwright test e2e/export-menu.spec.ts --workers=1
```

The browser regression downloads actual files and checks their archive reports.
`src/exports/export-job.test.ts` covers cancellation/retry, concurrent requests,
worker startup/runtime errors, GLB failure, unmount, session storage and byte/name
parity without requiring CAD generation.

The existing logo browser regression now uses this menu and compares miniature
volume using the archive's reported denominator. It supports `GYM_LOGO_BASE_URL`
so it can be run on an isolated test server without touching another worktree.
