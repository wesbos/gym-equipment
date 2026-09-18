# BOS STRENGTH

Run `npm run dev` from the project root and open the URL Vite prints. `/` is the rack builder (`/builder` redirects there). `/library` is the catalog gallery, and each part has its own shareable detail page at `/parts/<id>` (e.g. `/parts/j-hook-standard`); a bare `/parts` redirects to the library. `npm run build` typechecks and builds the React SPA, `npm run preview` serves it through Wrangler, and `npm test` checks geometry and state.

The library covers uprights; 425/725/1075 mm crossmembers; angled and offset members; a nameplate panel and full/lite branded members; short/long stabilizer feet; three pull-up bars; three safety styles; three J-hook styles; spotter arm; dip horn; adjustable dip bar; landmine; monolift; single bar holder; and short/long weight-storage pins. Repeated left/right instances and rack-height variants share builders. All parts are also available in the rack assembly editor.

## Geometry and controls

Manifold constructs the solids in a Web Worker. Structural and bar/safety families use recovered 2D plate outlines, cylinder sweeps, hollow sections, and boolean cuts with editable feature dimensions. Attachments use source-derived extrusion sections, revolved axial profiles, and cylinder centerlines; their Width / Depth / Height controls scale the complete part including hardware. They do not independently constrain pin diameter or plate thickness.

The fidelity revision replaces the previous generic forms with contoured mounting plates, actual hole and slot patterns, recessed numbering, nuts/washers/fasteners, liners, shaped monolift hooks, dip-arm hardware, hollow sleeves, a waisted roller, and lathed storage horns. Generated nameplates use BOS STRENGTH stencil lettering with bridges for enclosed counters. The original source branding is retained only in reference assets and provenance.

The standalone upright generator (`model.ts`) defaults to 80 inches (2032 mm), 75 mm square tubing, 3 mm wall, 6 mm outside corner radius, 25 mm holes, 50 mm pitch, and a 50 mm first-hole offset. The parts-library upright also defaults to 2032 mm, but follows the source's 25 mm hole family and bench-zone pattern; source-derived numbering extends through the 2300 mm reference range. Both are configurable. Source labels above the available reference range are not invented.

## Viewing and export

Orbit, pan, zoom, and front/top/side views are available. Compare source places the original component next to the rebuilt part at its original dimensions. Overlay displays it translucently in amber. Source parts are centered and horizontal orientation is normalized where needed. Changing rebuild dimensions does not resize the original.

The viewer uses creased normals, environment lighting, and adaptive camera depth planes to show curved metal surfaces and thin walls cleanly. Save parameters downloads a BOS STRENGTH JSON recipe. Export GLB exports only the generated part, with glTF's metre scale; the comparison mesh is excluded. Units for model construction are millimetres with Z up. Exported meshes retain separate named/material components, some of which intentionally overlap at assembly joints. GLB does not include EXT_mesh_manifold.

## Validation and limits

All 28 default entries have finite, positive-volume closed solids and pass the mesh-edge checks, alongside the original upright tests (32 tests total). Each family was visually compared with its source. `node --import tsx rack-generator/reference/fidelity-report.ts` records a dimensional comparison; the upright is built at the source's 1800 mm for that comparison. An envelope match measures overall size, not exact surface equivalence.

The rebuilt silhouettes and component layouts closely follow the reference. Some microbevels, bolt recesses, screw seating, local gusset curvature, grip textures, and powder-coat normal maps still differ. These are reconstructed CAD models, not original manufacturer design files. BOS STRENGTH lettering intentionally differs from the reference branding.

## Files and provenance

- `parts/structure.ts`, `parts/bars-safeties.ts`, `parts/attachments.ts`: Manifold builders and recovered fabrication profiles.
- `library-worker.ts`, `../src/scenes/part-scene.ts`: background construction, viewing, comparison, and export.
- `reference/front.glb`, `reference/storage.glb`: original assemblies from https://strengthshop.eu/products/3d-rack-builder-riot-mrr-75 .
- `reference/panel.glb`: the original nameplate panel isolated from its assembly for comparison.
- `reference/decode.ts`, `components.ts`, `extract-panel.ts`, `decoded/`: source measurement and geometry-analysis tools/data.
- `reference/derivation/`: profile-analysis scripts and BOS STRENGTH lettering contours.

The Manifold builders do not load the original triangle meshes at runtime. The reference GLBs are loaded only for comparison. Original source assets retain their ownership and attribution.

Manifold API: https://manifoldcad.org/docs/jsapi/

Rack mounting holes default to 25 mm throughout the library. Upright bench-zone spacing defaults to 50 mm to accommodate the larger holes.

## Rack assembly editor

Open `/` for the BOS STRENGTH rack builder. It starts with an 80-inch four-post frame, 1,075 mm clear width and 725 mm clear depth. Frame dimensions move the connected components together; the caption measures the overall assembled bounds, including feet and attachments.

Choose a J-hook, pull-up bar, or safety from the catalog, then click a highlighted mounting hole. Dragging a catalog card into the viewport also previews a snapped placement. Matching pairs are enabled initially. Select an installed part in the scene or parts list to change its variant, upright, mounting face, or hole number. Escape cancels placement; Command/Ctrl-Z undoes; Shift-Command/Ctrl-Z redoes; Delete removes the selection. Deleted frame slots can be restored from the frame catalog.

Designs autosave in this browser. Save design downloads an editable versioned JSON assembly, Open imports one, and Export GLB downloads the assembled geometry in metres. The export excludes the grid, mounting markers, selection outline, and placement previews. New rack is undoable.

The editor uses connection records and per-part mounting adapters rather than independent free-position coordinates. Repeated geometry is shared and generated through the existing Manifold worker; moving a component changes its transform without regenerating the solid. All 28 existing library parts are available in the rack builder: uprights and straight/angled/offset frame members, both branded crossmembers, the separate nameplate panel, two stabilizer feet, three pull-up bars, three J-hooks, three safeties, spotter arms, both dip attachments, a landmine, monolifts, a bar holder and both storage pins. Collision warnings use simplified working-body volumes, excluding intended mounting contact; they are placement aids and do not calculate load capacity.

### Additional part placement

Single-upright accessories snap to their retaining-pin or mounting-bolt locations. Matching pairs can be split for independent placement. Stabilizer feet attach at the base and stay seated on the floor. Select a frame catalog entry to choose a compatible frame slot; select an installed member to change its variant or supported dimensions. Straight-member names identify their library variants; their actual span follows the connected rack dimensions. The separate nameplate retains its supporting rail. Frame variants that cannot support an installed rail-mounted pull-up assembly are rejected.

Existing version-1 designs remain readable. Optional `structure` records store frame-member overrides; accessory records retain their existing connection format. Cable systems are a separate future assembly family; manufacturer manuals and implementation notes are collected in `research/cable-systems.md`.

## TypeScript SPA and Cloudflare

Use Node 22 or newer, then `npm ci`. `npm run dev` starts Vite. React renders the forms and panels, TanStack Router handles `/` (builder), `/library`, and `/parts/$partId` (read with `useParams`; catalog clicks push history entries so back/forward step between parts), plus redirects for `/builder`, `/parts`, and the legacy `.html` paths, and imperative Three controllers own their canvases. Every scene stops its animation loop and disposes listeners, observers, workers, geometry, materials, controls, and renderers when its route unmounts. The builder uses an external subscribing store (`src/state/builder-store.ts`); document validation, mounting, resolution, and collision logic stay framework independent.

`npm test` runs the TypeScript Node tests through tsx. `npm run typecheck` checks the domain, workers, React UI, scene controllers, tests, and reference tools under strict TypeScript. Vendor Draco JavaScript remains distributed vendor code. Run reference tools with `node --import tsx rack-generator/reference/<tool>.ts`.

`npm run build` creates `dist`. `npm run preview` starts Wrangler's local Workers static-assets server. `npm run deploy` builds and deploys the static-assets-only Worker configured in `wrangler.jsonc`; SPA fallback supports direct navigation and refresh at every route. No Pages project or application server is required. Named saved-design management remains tracked in issue #2; `/library` is a part gallery.

The GitHub Actions workflow verifies PRs and deploys pushes to `main`. Repository secrets `CLOUDFLARE_API_TOKEN` (Workers deployment permissions) and `CLOUDFLARE_ACCOUNT_ID` must be configured. Local deployment can use `npx wrangler login`. Never commit credentials.
