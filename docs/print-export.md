# Printable 3MF export

The builder's **Export → 3MF** menu downloads a full-size millimetre model of the
current document snapshot. Existing JSON and GLB exports remain available.
Choose **Open project** in Bambu Studio / OrcaSlicer to keep the color slots.
Select your real printer and filament profiles before slicing. The package has
an explicitly disclosed placeholder 256 mm bed, 0.4 mm nozzle and Generic PLA
color slots. It contains no machine G-code, temperatures or support settings.
These are reconstructed equipment models, not certified load-bearing printed
hardware or a guarantee of physical fit.

## Objects, topology and color

- One build object per resolved physical instance: four uprights mean four
  independently selectable objects. Paired accessories retain `:left` / `:right`
  identity, independently of their shared editor owner ID.
- Each object contains named material volumes from its CAD builder. New entries
  in `rack-generator/catalog.ts` automatically use this path. It shares the
  registry with `library-worker.ts`; thumbnails use that library worker.
- Geometry is built directly with Manifold, never taken from Three's display
  scene. Grid, lighting, selection, reference assets and placement ghosts cannot
  enter the export. Real CSG lettering/cutouts carry through automatically.
- Within a physical part, later catalog components own overlapping space. Earlier
  solids are cut against the accumulated union of later solids. This preserves
  separate color volumes without double-filled material. Separate physical
  instances remain independent; assembled mode can contain rack-part contacts.
  Fully covered components are omitted and listed in the archive report and
  completion message. Disconnected shells within a named component remain
  together; slicers can split them into objects if separate printing is wanted.
- Every source and partition result must have successful Manifold status and
  positive volume (except intentionally covered components). The exact Float32
  coordinates from `getMesh()` are reconstructed through Manifold to eliminate
  triangles collapsed by double-to-float conversion. No blanket decimation or
  arbitrary positional welding is used. Explicit Manifold vertex merge vectors
  are honored; exported indices, finite positions, nonzero triangle area and
  closed, consistently directed edges are checked. Errors fail the whole export.
- Colors come exclusively from `resolveMaterial(source, appearance, physicalId)`.
  Hardware finish affects fasteners only. Rods, handles and liners retain their
  semantic material. Per-side paint uses physical IDs, never owner IDs. Texture
  patterns, metallic reflections and roughness export as dominant solid colors;
  this limitation is shown before download and included in metadata.

## Coordinates and resource lifetime

Flat mode chooses the smallest bounding-box axis as the new Z axis with a proper
right-angle rotation. It moves each whole part to Z=0 and lays objects in one row
with 20 mm gaps. This is a simple initial orientation, not support/bed optimization.
It preserves each part's internal assembly and never scales to fit a bed. Full-size
rack members usually exceed desktop printers; cut/scale explicitly in the slicer
if that is your intent. Assembled mode bakes document positions and XYZ Euler
rotations into Z-up millimetre vertices, without the viewer's Y-up conversion.

The UI starts one dedicated worker for one snapshot. There is no queued export,
CAD cache or scene dependency. Cancel, unmount, errors and success terminate it;
all owned export solids are deleted in `finally`. Downloads revoke their blob URL.
The exporter stops above two million triangles instead of producing an unbounded
archive. Source document/history/saves remain unchanged.

## 3MF compatibility contract

The package uses standard OPC content types and root model relationship, core
`unit="millimeter"`, base materials (`displaycolor="#RRGGBBAA"`), per-mesh `pid`
/ `pindex`, child-before-parent components and one build item per physical ID.
The archive also contains `Metadata/print-report.json` with counts, IDs, dimensions,
covered components and the overlap/texture policies.

Bambu 2.8's project reader ignores the palette for a generic Application value;
its CLI round trip replaced the palette with a default green. Therefore the file
uses the **BambuStudio-01.09.00.00 compatibility marker** to select that reader.
`Designer` and `Description` explicitly identify **BOS STRENGTH print exporter**
as the actual generator. This does not rename or replace source/vendor branding.
`Metadata/model_settings.config` maps each volume to a 1-based filament slot;
`Metadata/project_settings.config` contains matching colors and minimal placeholder
profile fields needed by the readers. Without the nullable per-filament fields,
the installed older Orca CLI crashed in its flush-volume code after geometry load.
No reference-project printer configuration or G-code is copied.

Implementation references inspected September 17, 2026:

- [Manifold Mesh API](https://manifoldcad.org/docs/jsapi/classes/manifold.Mesh.html)
  and installed manifold-3d 3.5.3 declarations/exporter (merge vectors, status,
  float conversion and child-before-parent resource ordering).
- [Bambu 3MF reader/writer](https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/Format/bbs_3mf.cpp)
  and [CLI](https://github.com/bambulab/BambuStudio/blob/master/src/BambuStudio.cpp).
- [Orca CLI](https://github.com/SoftFever/OrcaSlicer/blob/v1.9.1/src/OrcaSlicer.cpp).
- The repository's `Tricep Pulley v15.3mf` for OPC relationships and named volume
  / filament metadata structure. Its machine configuration is not reused.

## Reproducing acceptance checks

```sh
npm ci
npm test
npm run build
npx tsx scripts/generate-print-fixtures.ts
```

The fixture has 14 physical objects, 83 material volumes, 311,988 triangles and
six colors (including one differently painted upright and gold fasteners).
Tests round-trip the decimal XML meshes through Manifold for every catalog
builder, inspect materials/relationships/counts, check paired paint, verify
non-overlap and volume preservation, and check dimensions/arrangement/errors.

Run each installed slicer with **absolute** input and output paths (Bambu's CLI
failed to save when given a relative output directory):

```sh
/path/to/slicer --info --arrange 0 --orient 0 \
  --export-3mf roundtrip.3mf --outputdir /absolute/output \
  /absolute/output/rack-laid-out.3mf
python3 scripts/verify-print-export.py /absolute/output/rack-laid-out.3mf \
  /absolute/output/bambu-roundtrip.3mf /absolute/output/orca-roundtrip.3mf
```

The independent standard-library Python audit checks ZIP CRC, XML, model
relationships, triangle indices/area/directed edge closure, unique physical names,
material assignments, dimensions and repair counters. It compares the actual
re-exported geometry/metadata with the source, not just a successful process exit.

Verified locally with **Bambu Studio 02.08.01.55** and **OrcaSlicer 01.09.05.51**:
all 14 identities, 83 volumes, 311,988 triangles, six colors and millimetre sizes
survived both CLI imports/re-exports; all reported repair counters were zero.
Browser checks used session `gym-wave2-print_export`, port 5304. Native GUI
inspection was attempted twice but the computer-use service timed out. CLI
imports and archive round trips are verified; GUI dialogs/rendering, G-code
slicing and physical printing are not claimed. No full-size model was silently
scaled to enable slicing on a desktop printer.

## Wave 2 extension handoff

`buildPrintInstance` forwards the resolved instance's optional `logo` as the third
CAD build argument. Its generic payload type follows the builder; it does not
copy the logo schema or bypass document/site validation. The print worker has no
geometry cache, so changing contours cannot reuse stale solids. The logo stream
still owns `RackDoc.logo`, validation, `resolveAssembly` site selection and its
actual CSG builders; those are not duplicated in this branch.

The registry also exports `catalog: CADCatalog`. When the vendor stream lands,
wire its existing helper in the same registry alongside its definitions:

```ts
import { vendorAttribution } from './vendor-metadata.ts';
export const catalog: CADCatalog = { definitions, attribution: vendorAttribution };
```

The print worker and fixture generator already pass `catalog.attribution` to the
exporter. All five fields (`vendor`, `url`, `credit`, `trademark`, `reconstruction`)
are preserved in model Copyright metadata and structured `vendorCredits` in the
print report, with a part-ID association. Tests cover Unicode/XML escaping and
preservation of the actual generator identity. Current main has no vendor CAD
or attribution module; this hook is deliberately optional until that stream
registers it. Actual vendor/logo end-to-end acceptance still requires those
unmerged definitions; only their forward-compatible export contracts are tested
here.

The export panel follows #30's concise-copy contract: scale, color limitation and
placeholder-profile data remain visible; explanatory prose lives in this document.
The #28 standard size controls and existing reset/swap helpers are preserved from
main; print export neither replaces them nor adds independent dimension controls.

The export arrangement's shared `ResetButton` restores the `laid-out` default.
It is disabled at the default and while a print worker is active. This transient
export preference does not mutate the rack document, save state or edit history.
