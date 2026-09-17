# BOS STRENGTH

Run `npm run dev` from the project root and open the URL Vite prints. `/` is the original configurable upright builder; `/parts.html` is the detailed 28-entry parts library. `npm run build` builds both pages, `npm run preview` serves that build, and `npm test` checks geometry.

The library covers uprights; 425/725/1075 mm crossmembers; angled and offset members; a nameplate panel and full/lite branded members; short/long stabilizer feet; three pull-up bars; three safety styles; three J-hook styles; spotter arm; dip horn; adjustable dip bar; landmine; monolift; single bar holder; and short/long weight-storage pins. Repeated left/right instances and rack-height variants share builders. This is a parts library, not a complete rack assembly configurator.

## Geometry and controls

Manifold constructs the solids in a Web Worker. Structural and bar/safety families use recovered 2D plate outlines, cylinder sweeps, hollow sections, and boolean cuts with editable feature dimensions. Attachments use source-derived extrusion sections, revolved axial profiles, and cylinder centerlines; their Width / Depth / Height controls scale the complete part including hardware. They do not independently constrain pin diameter or plate thickness.

The fidelity revision replaces the previous generic forms with contoured mounting plates, actual hole and slot patterns, recessed numbering, nuts/washers/fasteners, liners, shaped monolift hooks, dip-arm hardware, hollow sleeves, a waisted roller, and lathed storage horns. Generated nameplates use BOS STRENGTH stencil lettering with bridges for enclosed counters. The original source branding is retained only in reference assets and provenance.

The original upright tool defaults to 80 inches (2032 mm), 75 mm square tubing, 3 mm wall, 6 mm outside corner radius, 25 mm holes, 50 mm pitch, and a 50 mm first-hole offset. The parts-library upright also defaults to 2032 mm, but follows the source's 25 mm hole family and bench-zone pattern; source-derived numbering extends through the 2300 mm reference range. Both are configurable. Source labels above the available reference range are not invented.

## Viewing and export

Orbit, pan, zoom, and front/top/side views are available. Compare source places the original component next to the rebuilt part at its original dimensions. Overlay displays it translucently in amber. Source parts are centered and horizontal orientation is normalized where needed. Changing rebuild dimensions does not resize the original.

The viewer uses creased normals, environment lighting, and adaptive camera depth planes to show curved metal surfaces and thin walls cleanly. Save parameters downloads a BOS STRENGTH JSON recipe. Export GLB exports only the generated part, with glTF's metre scale; the comparison mesh is excluded. Units for model construction are millimetres with Z up. Exported meshes retain separate named/material components, some of which intentionally overlap at assembly joints. GLB does not include EXT_mesh_manifold.

## Validation and limits

All 28 default entries have finite, positive-volume closed solids and pass the mesh-edge checks, alongside the original upright tests (32 tests total). Each family was visually compared with its source. `node rack-generator/reference/fidelity-report.mjs` records a dimensional comparison; the upright is built at the source's 1800 mm for that comparison. An envelope match measures overall size, not exact surface equivalence.

The rebuilt silhouettes and component layouts closely follow the reference. Some microbevels, bolt recesses, screw seating, local gusset curvature, grip textures, and powder-coat normal maps still differ. These are reconstructed CAD models, not original manufacturer design files. BOS STRENGTH lettering intentionally differs from the reference branding.

## Files and provenance

- `parts/structure.js`, `parts/bars-safeties.js`, `parts/attachments.js`: Manifold builders and recovered fabrication profiles.
- `library-worker.js`, `library.js`: background construction, viewing, comparison, and export.
- `reference/front.glb`, `reference/storage.glb`: original assemblies from https://strengthshop.eu/products/3d-rack-builder-riot-mrr-75 .
- `reference/panel.glb`: the original nameplate panel isolated from its assembly for comparison.
- `reference/decode.mjs`, `components.mjs`, `extract-panel.mjs`, `decoded/`: source measurement and geometry-analysis tools/data.
- `reference/derivation/`: profile-analysis scripts and BOS STRENGTH lettering contours.

The Manifold builders do not load the original triangle meshes at runtime. The reference GLBs are loaded only for comparison. Original source assets retain their ownership and attribution.

Manifold API: https://manifoldcad.org/docs/jsapi/

Rack mounting holes default to 25 mm throughout the library. Upright bench-zone spacing defaults to 50 mm to accommodate the larger holes.
