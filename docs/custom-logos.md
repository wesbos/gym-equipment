# Custom cut-out logos (#11)

Open **Custom logo** in the builder, type text or upload SVG/PNG/JPEG, then
**Validate & preview logo**. Dark regions in the preview become through-cuts.
Only **Apply logo to rack** changes the working document (undoable). Named
configurations still require **Save**. **Reset stock BOS lettering** removes the
optional logo; the original BOS STRENGTH stencil and bridges are used unchanged.
Vendor branding is not part of this system. Each source, text, font, upload,
threshold, contrast and island-bridge control uses the shared ResetButton.
These field resets change only the transient preview inputs; stock-lettering
reset changes the rack document and is undoable.

## Geometry and integration

`RackDoc.logo?: ValidatedLogo` stores the original text/SVG/raster data and its
validated, explicitly closed reference contours, structural minimum, bridge
count, and preprocessing warnings. No document version/storage key changes.
`validateAssembly` preserves v1 migration and optional appearance and validates
bounded logo metadata. Numerical parameters remain numerical.

`resolveAssembly` copies the logo onto the three actual user-branding parts only:
`nameplate`, `branded-crossmember`, `branded-crossmember-lite`. Their build contract
is `definition.build(api, numericParams, logo?)`; `LibraryWorkerRequest.logo`
carries the same typed data. Scene cache identities include the contours. The
existing bounded scene cache/rebuild policy and disposal remain in effect.

The stock `brandCutter` is replaced *before* the panel/beam boolean difference,
so this produces real Manifold solids. There are no textures, extra meshes or
paint/material overrides. Existing GLB exports consume those scene meshes. The 3MF exporter now uses `buildPrintInstance`, forwarding `instance.logo` as
the third CAD build argument. Actual 3MF XML volume/topology and two slicer
round trips are verified, as well as browser-worker downloads. No vendor
part should forward user branding into its own marks.

## Source processing and scope

- Text uses precomputed, bundled Helvetiker Bold and Regular glyph outlines
  (Magenta/MgOpen license retained in `rack-generator/logos/fonts/LICENSE` and
  in the typeface JSON). The files are copied from three.js r186 examples/fonts.
  Like `reference/derivation/bos-lettering.py`, glyph outlines are flattened,
  spaced, scaled, and supplied with vertical counter bridges. Supported glyphs
  are checked; missing glyphs do not silently become question marks. Maximum
  32 characters, one line. Needle-like glyph tips/notches are rounded to the
  structural radius, explicitly reported in the preview. If this would erase
  more than 10% of any glyph component, the text is rejected.
- SVG is parsed using inert xmldom nodes entirely inside the worker. Only plain
  paths, groups, rectangles, circles, ellipses, polygons, polylines and lines
  are accepted. Quadratic/cubic curves/arcs, multiple subpaths, evenodd/nonzero
  fills, inline presentation styles, stroke caps/joins, and nested affine
  transforms are supported. Strokes expand in source coordinates before their
  outline is transformed, including nonuniform scale/skew. SVG implicit fill
  closure is respected; final cut contours are always explicitly closed.
  CSS stylesheets, masks, clipping, gradients, SVG text, use/image references,
  animation, scripts, event attributes, entities, declarations and external
  resources are rejected with instructions to export plain paths. No uploaded
  SVG is inserted into the browser DOM and no URL is fetched. The preview is a
  new React SVG path built only from validated finite numerical coordinates.
- PNG/JPEG uses alpha-on-white luminance, adjustable contrast and threshold,
  then boundary-edge vector tracing and collinear simplification. This is
  bounded polygonal tracing, not a Potrace spline fit. Original source bytes
  and threshold/contrast are retained. A maximum 256 × 256 working bitmap
  intentionally trades fine raster detail for tractable steel geometry.
  Diagonally touching pixels, noise and excessive detail are rejected with
  threshold/simplification guidance. Raster dimensions are inspected before
  native decoding: maximum 4096 px/side and 8 MP, file size 250 KB.

## Validation and resource bounds

A disposable preprocessing worker handles each preview; a new request cancels
its predecessor. Workers terminate on completion, failure, unmount or a 10-second
deadline. No background queue accumulates. Source cap is 350,000 stored characters;
SVG has 256 elements, nesting depth 16 and a coordinate cap. Final cuts allow at
most 128 loops / 6,000 points, simplified at 0.03 mm in the reference area.

Cuts are fitted proportionally into 180 × 24 mm (the smallest logo site), then
scaled to each plate. They inherit the steel color. Smaller site parameters that
would reduce the validated minimum are rejected. The 0.8 mm policy checks each
cut component survives erosion, expanded components retain minimum separation,
and morphological opening detects thin cuts/steel necks. Polygon corners have
a 0.035 mm offset allowance and 0.4 mm² local corner-loss tolerance, so this is a
conservative modelling screen rather than a fabrication certificate. Curves are
polygonal approximations (eight samples per curve; round offsets 16/24 segments).

A bridge that would erase an entire small shape is rejected rather than silently dropping that detail.

Counter bridges generalize the stock vertical-strip method: each counter gets a
1.2 mm steel strip extending to the surrounding plate. Unbridged islands are
rejected. The remaining reference plate must decompose into exactly one connected
component. The geometry worker reruns feature/topology checks rather than trusting
an imported document's validation label. All temporary CrossSections/Manifolds
are disposed. A failed preview leaves the existing rack untouched.

## Verification

`rack-generator/logos.test.ts` covers fonts/counters, fill rules, transformed
filled and stroked paths, hostile SVG, threshold tracing, malformed/overbudget
metadata, small cuts and gaps, island rejection, persistence/site isolation,
and actual manifold builds for all three sites. The 3MF regression also exports
all three sites through the shared catalog/print adapter, reconstructs the
actual XML meshes, checks connected watertight topology, and compares volume
with custom CAD after the documented flange-overlap removal. Volume tolerance
is max(0.1 mm³, one part per million), accounting for Float32 print transforms. `logos/fixtures` contains small
SVG/PNG/JPEG uploads and a deliberately rejected script fixture for browser QA.

Repeat the browser test against a production build served at `127.0.0.1:5305`:
start the named `gym-wave2-logos` browser session and run
`GYM_LOGO_CDP_URL=http://127.0.0.1:<that-session-CDP-port> npm run test:logos:browser`.
The test uses only that isolated browser. It checks uploaded SVG/PNG/JPEG,
threshold/contrast, rejection, explicit save/JSON round-trip, reset/undo, and
matches the exported GLB nameplate triangle count and 3MF nameplate volume to its custom Manifold solid.

For native slicer verification, run `npx tsx scripts/generate-logo-print-fixture.ts`,
import/re-export `.verification/logo.3mf` using the installed Bambu Studio and
OrcaSlicer CLIs with `--info --arrange 0 --orient 0 --export-3mf`, then run
`scripts/verify-print-export.py` on the source and both output archives.
`docs/evidence/issue-11/slicer-audit.txt` records the passing independent audit.

For #46 scale integration, reuse `.verification/logo.json` from the generator:
export at denominator 10 and 20 and compare each reconstructed nameplate volume
with the unscaled custom CAD volume divided by the denominator cubed (1000 and
8000 respectively). Dimensions must halve between the two exports; source and
contours remain in full-size rack units. Continue forwarding `instance.logo` to
`buildPrintInstance` before scaling the resulting solid. The current tests verify
unscaled geometry; #46's scaled exporter is a separate integration check.
